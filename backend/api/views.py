import hashlib
import hmac
import json
import logging
import os
import re
from datetime import timedelta

from django.conf import settings
import requests
from django.http import JsonResponse
from django.db.models import Prefetch
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import viewsets, filters, generics, permissions, status
from django.views.decorators.cache import cache_control
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .throttles import AuthRequestCodeThrottle, AuthVerifyCodeThrottle
from .models import Address, Category, SubCategory, Product, Set, UserProfile, Order, RestaurantSettings
from .serializers import (
    AddressSerializer, CategorySerializer, SubCategorySerializer, ProductSerializer, SetSerializer,
    PhoneRequestSerializer, CodeVerifySerializer, UserProfileSerializer,
    OrderWriteSerializer, OrderReadSerializer,
    RestaurantSettingsSerializer, PromoCodeValidateSerializer,
)

logger = logging.getLogger(__name__)


def health(request):
    return JsonResponse({'status': 'ok'})


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API для категорий с подкатегориями."""
    queryset = Category.objects.filter(is_active=True).prefetch_related('subcategories')
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class SubCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API для подкатегорий."""
    queryset = SubCategory.objects.filter(is_active=True)
    serializer_class = SubCategorySerializer
    lookup_field = 'slug'


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """API для продуктов (блюд)."""
    serializer_class = ProductSerializer
    lookup_field = 'slug'
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['sort_order', 'name', 'price', 'created_at']
    ordering = ['-created_at', 'sort_order', 'name']

    def get_queryset(self):
        queryset = Product.objects.filter(is_available=True).select_related(
            'category', 'subcategory'
        ).prefetch_related(
            'ingredients__allergens'
        )

        # Фильтрация по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # Фильтрация по подкатегории
        subcategory = self.request.query_params.get('subcategory')
        if subcategory:
            queryset = queryset.filter(subcategory__slug=subcategory)

        return queryset


class SetViewSet(viewsets.ReadOnlyModelViewSet):
    """API для сетов (наборов)."""
    serializer_class = SetSerializer
    lookup_field = 'slug'
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['sort_order', 'name', 'price', 'created_at']
    ordering = ['-created_at', 'sort_order', 'name']

    def get_queryset(self):
        return Set.objects.filter(is_available=True).prefetch_related(
            'set_items__included_product', 'ingredients__allergens'
        )


@api_view(['GET'])
def get_categories_with_products(request):
    """
    Получить все категории с их продуктами + отдельно сеты.
    Оптимизированный эндпоинт для главной страницы фронтенда.
    """
    # Prefetch с фильтром — чтобы .filter() в цикле не делал новых запросов
    categories = Category.objects.filter(is_active=True).prefetch_related(
        Prefetch('products', queryset=Product.objects.filter(is_available=True)
                 .order_by('-created_at').prefetch_related('ingredients__allergens')),
        Prefetch('subcategories__products', queryset=Product.objects.filter(is_available=True)
                 .order_by('-created_at').prefetch_related('ingredients__allergens')),
        'subcategories',
    ).order_by('sort_order')

    data = []

    # Сеты идут первым блоком (отдельная сущность Set, не Product)
    sets = Set.objects.filter(is_available=True).prefetch_related(
        'set_items__included_product', 'ingredients__allergens'
    ).order_by('-created_at')
    if sets.exists():
        data.append({
            'slug': 'sets',
            'name': 'Сеты',
            'subtitle': 'ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ',
            'products': SetSerializer(sets, many=True, context={'request': request}).data,
        })

    for category in categories:
        # Пропускаем sets — они уже добавлены выше
        if category.slug == 'sets':
            continue

        cat_data = {
            'id': category.id,
            'slug': category.slug,
            'name': category.name,
            'subtitle': category.subtitle,
            'products': ProductSerializer(
                category.products.all(),  # Prefetch уже отфильтровал — .all() без запроса!
                many=True,
                context={'request': request}
            ).data,
        }

        # Для роллов добавляем подкатегории
        if category.slug == 'rolls':
            subcats = []
            for subcat in category.subcategories.filter(is_active=True).order_by('sort_order'):
                subcats.append({
                    'slug': subcat.slug,
                    'name': subcat.name,
                    'products': ProductSerializer(
                        subcat.products.all(),
                        many=True,
                        context={'request': request}
                    ).data,
                })
            cat_data['subcategories'] = subcats

        data.append(cat_data)

    return Response(data)


# ─── Passwordless Auth ───

def _normalize_phone(phone: str) -> str:
    """Нормализовать телефон: убрать всё кроме + и цифр → +79123456789."""
    digits = re.sub(r'[^\d+]', '', phone)
    if digits.startswith('8'):
        digits = '+7' + digits[1:]
    elif digits.startswith('7') and not digits.startswith('+'):
        digits = '+' + digits
    return digits

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRequestCodeThrottle])
def request_code(request):
    """Запросить код подтверждения по номеру телефона. Код всегда 1234 (заглушка)."""
    serializer = PhoneRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = _normalize_phone(serializer.validated_data['phone'])

    # Найти или создать профиль по телефону
    profile = UserProfile.objects.filter(phone=phone).first()
    if not profile:
        # Новый пользователь — создаём Django User и профиль
        user = User.objects.create_user(
            username=phone,
            password=None,  # unusable password
        )
        user.set_unusable_password()
        user.save()
        profile = UserProfile.objects.create(user=user, phone=phone)

    # Установить код (хардкод 1234)
    profile.verification_code = '1234'
    profile.code_sent_at = timezone.now()
    profile.save(update_fields=['verification_code', 'code_sent_at'])

    return Response({'success': True, 'detail': 'Код отправлен'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthVerifyCodeThrottle])
def verify_code(request):
    """Подтвердить код и получить JWT-токены. Если пользователь новый — авто-создаётся."""
    serializer = CodeVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = _normalize_phone(serializer.validated_data['phone'])
    code = serializer.validated_data['code']

    profile = UserProfile.objects.filter(phone=phone).first()
    if not profile:
        return Response({'detail': 'Пользователь с таким номером не найден. Сначала запросите код.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_code != code:
        return Response({'detail': 'Неверный код подтверждения.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Проверка срока действия кода (5 минут)
    if profile.code_sent_at and (timezone.now() - profile.code_sent_at) > timedelta(minutes=5):
        return Response({'detail': 'Код подтверждения истёк. Запросите новый код.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Код верный — очищаем и выдаём токены
    profile.verification_code = ''
    profile.save(update_fields=['verification_code'])

    user = profile.user
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'phone': profile.phone,
        },
    })


class ProfileView(generics.RetrieveUpdateAPIView):
    """Профиль текущего пользователя."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


# ─── Address CRUD ───

class AddressViewSet(viewsets.ModelViewSet):
    """CRUD сохранённых адресов текущего пользователя."""
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        self._assign_delivery_zone(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._assign_delivery_zone(instance)

    @staticmethod
    def _assign_delivery_zone(address):
        """Определить и закэшировать зону доставки по координатам."""
        if address.latitude is not None and address.longitude is not None:
            from .services.delivery_zones import get_delivery_zone
            zone = get_delivery_zone(
                float(address.longitude),
                float(address.latitude),
            )
            if zone != address.delivery_zone:
                address.delivery_zone = zone
                address.save(update_fields=['delivery_zone'])


class CheckoutView(generics.CreateAPIView):
    """Оформление заказа из корзины (только для авторизованных)."""
    serializer_class = OrderWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Автозаполнение данных из профиля
        extra = {}
        if not serializer.validated_data.get('customer_name'):
            extra['customer_name'] = request.user.username
        if not serializer.validated_data.get('customer_phone'):
            profile = UserProfile.objects.filter(user=request.user).first()
            if profile and profile.phone:
                extra['customer_phone'] = profile.phone

        order = serializer.save(**extra)

        # Если выбран онлайн-платёж — создаём платёж в ЮKassa
        if order.payment_method == Order.PaymentMethod.CARD_ONLINE:
            from .services.yookassa import create_payment
            description = f'Заказ №{order.pk} — Tokyo Rolls'
            result = create_payment(
                amount_rub=order.total,
                order_id=order.pk,
                description=description,
            )
            if result:
                order.payment_id = result['payment_id']
                order.payment_url = result['payment_url']
                order.yookassa_status = result['yookassa_status']
                order.status = Order.Status.AWAITING_PAYMENT
                order.save(update_fields=[
                    'payment_id', 'payment_url',
                    'yookassa_status', 'status',
                ])
            else:
                logger.warning(
                    'YooKassa payment creation failed for order %s',
                    order.pk,
                )

        return Response(
            OrderReadSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def check_delivery_zone(request):
    """Проверить зону доставки для сохранённого адреса.

    Принимает: { address_id: int }
    Возвращает: { zone, min_order_amount, delivery_fee, is_deliverable }
    """
    from .services.delivery_zones import get_zone_rules

    address_id = request.data.get('address_id')
    if not address_id:
        return Response(
            {'detail': 'address_id обязателен.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        addr = Address.objects.get(id=address_id, user=request.user)
    except Address.DoesNotExist:
        return Response(
            {'detail': 'Адрес не найден.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    zone = addr.delivery_zone
    is_deliverable = zone is not None
    rules = get_zone_rules(zone)

    return Response({
        'zone': zone,
        'min_order_amount': rules['min_order_amount'],
        'delivery_fee': rules['delivery_fee'],
        'is_deliverable': is_deliverable,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@cache_control(max_age=60, public=True)
def restaurant_settings(request):
    """Публичные настройки ресторана: часы работы, мин. заказ, доставка."""
    settings = RestaurantSettings.get_solo()
    return Response(RestaurantSettingsSerializer(settings).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def validate_promo(request):
    """Проверить промокод и вернуть скидку."""
    serializer = PromoCodeValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    promo = serializer.get_promo()
    if promo is None:
        return Response(
            {'detail': 'Промокод не найден, истёк или неактивен.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response({
        'code': promo.code,
        'discount_percent': promo.discount_percent,
        'description': promo.description,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def dadata_suggest(request):
    """Прокси для DaData Suggest API — ключ хранится только на сервере."""
    query = request.data.get('query', '')
    if not query or len(query.strip()) < 2:
        return Response([], status=status.HTTP_200_OK)

    api_key = os.environ.get('DADATA_API_KEY', '')
    if not api_key:
        # Возвращаем пустой список без ошибки — поле остаётся ручным вводом
        return Response([], status=status.HTTP_200_OK)

    try:
        resp = requests.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            json={
                'query': query.strip(),
                'count': 10,
                'locations': [{'city': 'Пермь'}],
                'to_bound': {'value': 'house'},
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Token {api_key}',
            },
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()

        suggestions = data.get('suggestions', [])

        # Отфильтровываем подсказки с низким качеством координат
        # qc_geo: 0=точные, 1=ближайший дом, 2=улица, 3=нп, 4=город, 5=не определены
        # Отбрасываем только 4 (центр города) и 5 (не определены) — fallback'и
        def is_quality_suggestion(suggestion):
            qc = suggestion.get('data', {}).get('qc_geo')
            if qc is None or qc == '':
                return True  # нет данных — доверяем
            try:
                return int(qc) not in (4, 5)
            except (ValueError, TypeError):
                return True

        suggestions = [s for s in suggestions if is_quality_suggestion(s)]

        return Response(suggestions, status=status.HTTP_200_OK)
    except requests.RequestException as e:
        logger.warning('DaData request failed: %s', e)
        return Response(
            {'detail': 'Сервис подсказок временно недоступен.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ─── YooKassa Payment Webhook ───

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    """
    Webhook от ЮKassa — уведомление о смене статуса платежа.
    ЮKassa присылает POST с JSON-телом.
    """
    # Проверка IP-адреса отправителя (whitelist ЮKassa)
    _YK_IPS = ['84.201.147.0/24', '185.71.76.0/27', '77.75.157.0/27', '77.75.156.0/27']
    _remote_ip = request.META.get('REMOTE_ADDR', '')
    if _remote_ip and not settings.DEBUG:
        import ipaddress
        if not any(ipaddress.ip_address(_remote_ip) in ipaddress.ip_network(n) for n in _YK_IPS):
            logger.warning('Webhook: IP %s not in YooKassa whitelist', _remote_ip)
            return Response(
                {'detail': 'Forbidden'},
                status=status.HTTP_403_FORBIDDEN,
            )

    # Проверка HMAC-подписи (если задан YOOKASSA_SECRET_KEY)
    raw_body = request.body
    if settings.YOOKASSA_SECRET_KEY:
        signature = request.headers.get('Signature', '')
        if not signature:
            logger.warning('Webhook: missing HMAC signature header')
            return Response(
                {'detail': 'Missing signature'},
                status=status.HTTP_403_FORBIDDEN,
            )
        expected = hmac.new(
            settings.YOOKASSA_SECRET_KEY.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning('Webhook: invalid HMAC signature')
            return Response(
                {'detail': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return Response(
            {'detail': 'Invalid JSON'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    event = body.get('event', '')
    event_object = body.get('object', {})

    if event in ('payment.waiting_for_capture', 'payment.succeeded', 'payment.canceled'):
        payment_id = event_object.get('id', '')
        if not payment_id:
            return Response(
                {'detail': 'No payment id'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.select_for_update().get(payment_id=payment_id)
        except Order.DoesNotExist:
            logger.warning(
                'Webhook: order not found for payment %s',
                payment_id,
            )
            return Response(
                {'detail': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = event_object.get('status', '')
        if event == 'payment.succeeded' or new_status == 'succeeded':
            order.status = Order.Status.CONFIRMED
            order.yookassa_status = 'succeeded'
        elif event == 'payment.canceled' or new_status == 'canceled':
            order.status = Order.Status.CANCELLED
            order.yookassa_status = 'canceled'
        else:
            order.yookassa_status = new_status

        order.save(update_fields=['status', 'yookassa_status'])

        logger.info(
            'Webhook processed: payment=%s, event=%s, new_order_status=%s',
            payment_id, event, order.status,
        )

    return Response({'detail': 'OK'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, order_id):
    """Проверить статус оплаты заказа (опрос после возврата с ЮKassa).

    Сначала смотрит локальный статус. Если локально заказ ещё не подтверждён,
    но у него есть payment_id — запрашивает ЮKassa API напрямую и обновляет
    статус заказа (актуально при разработке без вебхуков / падении вебхука).

    Также авто-отменяет заказ, если он провисел в awaiting_payment > 10 минут.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Проверка владельца: нельзя смотреть чужие заказы
    if order.user_id is not None and order.user_id != request.user.id:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Авто-отмена: если awaiting_payment дольше 10 минут
    if order.status == Order.Status.AWAITING_PAYMENT:
        elapsed = timezone.now() - order.created_at
        if elapsed > timedelta(minutes=10):
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])
            return Response({
                'order_id': order.pk,
                'status': order.status,
                'yookassa_status': order.yookassa_status,
                'paid': False,
            })

    # Если локально заказ ещё не прошёл оплату — проверяем ЮKassa напрямую.
    # Только для пред-платёжных статусов! Не трогаем delivering/delivered/completed.
    if order.status in (
        Order.Status.AWAITING_PAYMENT,
        Order.Status.UNPAID,
        Order.Status.PENDING,
    ) and order.payment_id:
        from .services.yookassa import get_payment_info

        info = get_payment_info(order.payment_id)
        if info is not None:
            order.yookassa_status = info['status']

            if info['status'] == 'succeeded':
                order.status = Order.Status.CONFIRMED
            elif info['status'] == 'canceled':
                order.status = Order.Status.CANCELLED

            order.save(update_fields=['status', 'yookassa_status'])

    return Response({
        'order_id': order.pk,
        'status': order.status,
        'yookassa_status': order.yookassa_status,
        'paid': order.status in (
            Order.Status.CONFIRMED,
            Order.Status.PREPARING,
            Order.Status.READY,
        ),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_order(request):
    """Вернуть последний активный заказ пользователя (status != completed/cancelled).

    Используется фронтендом для определения, показывать ли трекер заказа.
    Возвращает полные данные заказа (OrderReadSerializer) или null.
    """
    order = (
        Order.objects
        .filter(user=request.user)
        .exclude(status__in=[Order.Status.COMPLETED, Order.Status.CANCELLED])
        .order_by('-created_at')
        .first()
    )
    if order is None:
        return Response(None)
    return Response(OrderReadSerializer(order).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    """Получить полную информацию о заказе (для трекера).

    В отличие от payment_status, возвращает полный OrderReadSerializer
    с составом заказа (items), ценами, адресом и таймстемпом.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Проверка владельца: нельзя смотреть чужие заказы
    if order.user_id is not None and order.user_id != request.user.id:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Заказ не оплачен дольше 10 мин — не меняем статус (это делает
    # management command cancel_expired_orders), только сообщаем.
    # GET-эндпоинт не должен иметь деструктивных сайд-эффектов.

    # Fallback: если вебхук ещё не пришёл — проверяем ЮKassa напрямую.
    # Только для пред-платёжных статусов! Не трогаем delivering/delivered/completed.
    if order.status in (
        Order.Status.AWAITING_PAYMENT,
        Order.Status.UNPAID,
        Order.Status.PENDING,
    ) and order.payment_id:
        from .services.yookassa import get_payment_info

        info = get_payment_info(order.payment_id)
        if info is not None:
            order.yookassa_status = info['status']

            if info['status'] == 'succeeded':
                order.status = Order.Status.CONFIRMED
            elif info['status'] == 'canceled':
                order.status = Order.Status.CANCELLED

            order.save(update_fields=['status', 'yookassa_status'])

    return Response(OrderReadSerializer(order).data)
