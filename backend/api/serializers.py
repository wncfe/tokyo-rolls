import re

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from .models import (
    Address, Category, SubCategory, Product, Set, SetItem, UserProfile,
    Ingredient, Allergen, Order, OrderItem, OperationLog, RestaurantSettings, PromoCode,
)


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'slug', 'name']


class AllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ['id', 'slug', 'name']


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'slug', 'name', 'sort_order']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'slug', 'name', 'subtitle', 'sort_order', 'subcategories']


class ProductSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    subcategory_slug = serializers.CharField(source='subcategory.slug', read_only=True, allow_null=True)
    composition = serializers.SerializerMethodField()
    allergens = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'price',
            'weight',
            'pieces_amount',
            'image',
            'composition',
            'allergens',
            'is_new',
            'benefit_badge',
            'is_available',
            'category_slug',
            'subcategory_slug',
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        # Итерация по prefetch-кэшу без доп. запросов к БД
        names: set[str] = set()
        for ingredient in obj.ingredients.all():
            for allergen in ingredient.allergens.all():
                names.add(allergen.name)
        return sorted(names)


class SetItemSerializer(serializers.ModelSerializer):
    """Одна позиция в составе сета."""
    product_slug = serializers.CharField(source='included_product.slug', read_only=True)
    product_name = serializers.CharField(source='included_product.name', read_only=True)
    product_id = serializers.IntegerField(source='included_product.id', read_only=True)

    class Meta:
        model = SetItem
        fields = ['id', 'product_id', 'product_slug', 'product_name', 'quantity']


class SetSerializer(serializers.ModelSerializer):
    composition = serializers.SerializerMethodField()
    allergens = serializers.SerializerMethodField()
    included_products = SetItemSerializer(source='set_items', many=True, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Set
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'price',
            'weight',
            'pieces_amount',
            'image',
            'composition',
            'allergens',
            'included_products',
            'is_new',
            'benefit_badge',
            'is_available',
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        # Итерация по prefetch-кэшу без доп. запросов к БД
        names: set[str] = set()
        for ingredient in obj.ingredients.all():
            for allergen in ingredient.allergens.all():
                names.add(allergen.name)
        return sorted(names)


class UserProfileSerializer(serializers.ModelSerializer):
    """Профиль пользователя (чтение и редактирование)."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'phone', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── Passwordless Auth ───

PHONE_REGEX = r'^(\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$'

def _normalize_phone_strict(value: str) -> str:
    """Strip non-digit chars from phone and convert 8→+7."""
    digits = re.sub(r'[^\d+]', '', value)
    if digits.startswith('8'):
        digits = '+7' + digits[1:]
    elif digits.startswith('7') and not digits.startswith('+'):
        digits = '+' + digits
    return digits


class PhoneRequestSerializer(serializers.Serializer):
    """Запрос кода подтверждения по номеру телефона."""
    phone = serializers.CharField(
        max_length=20,
        validators=[RegexValidator(PHONE_REGEX, message='Формат: +7 (XXX) XXX-XX-XX')],
    )

    def validate_phone(self, value):
        return _normalize_phone_strict(value)


class CodeVerifySerializer(serializers.Serializer):
    """Подтверждение кода и получение JWT-токенов."""
    phone = serializers.CharField(
        max_length=20,
        validators=[RegexValidator(PHONE_REGEX, message='Формат: +7 (XXX) XXX-XX-XX')],
    )
    code = serializers.CharField(max_length=4, min_length=4)

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('Код должен содержать только цифры.')
        return value

    def validate_phone(self, value):
        return _normalize_phone_strict(value)


# ─── Address ───

class AddressSerializer(serializers.ModelSerializer):
    """Сохранённый адрес доставки."""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    # FloatField — DaData присылает координаты строкой с 10+ знаками после запятой,
    # а стандартный DecimalField(max_digits=9, decimal_places=6) режет это ещё в to_internal_value.
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Address
        fields = [
            'id', 'user', 'full_address', 'flat', 'entrance',
            'floor', 'intercom', 'comment', 'is_default',
            'latitude', 'longitude', 'delivery_zone', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'delivery_zone']

    def validate_latitude(self, value):
        if value is not None:
            return round(value, 6)
        return value

    def validate_longitude(self, value):
        if value is not None:
            return round(value, 6)
        return value


# ─── Checkout / Order ───

from django.core.validators import MinValueValidator

class OrderItemWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для записи позиции заказа."""
    product_slug = serializers.SlugField(write_only=True, required=False)
    set_slug = serializers.SlugField(write_only=True, required=False)
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = OrderItem
        fields = ['product_slug', 'set_slug', 'quantity']

    def validate(self, attrs):
        if not attrs.get('product_slug') and not attrs.get('set_slug'):
            raise serializers.ValidationError('Укажите product_slug или set_slug.')
        if attrs.get('product_slug') and attrs.get('set_slug'):
            raise serializers.ValidationError('Нельзя указать одновременно product_slug и set_slug.')
        return attrs


class OrderWriteSerializer(serializers.ModelSerializer):
    """Создание заказа из корзины (только для авторизованных)."""
    items = OrderItemWriteSerializer(many=True)
    promo_code = serializers.CharField(max_length=32, required=False, allow_blank=True, write_only=True)
    order_type = serializers.ChoiceField(choices=[('delivery', 'Доставка'), ('pickup', 'Самовывоз')], default='delivery')
    payment_method = serializers.ChoiceField(
        choices=[('cash', 'Наличные'), ('card_delivery', 'Картой при получении'), ('card_online', 'Картой онлайн')],
        default='card_online',
    )
    address_id = serializers.IntegerField(required=False, write_only=True)
    customer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            'customer_name', 'customer_phone', 'delivery_address',
            'comment', 'promo_code', 'order_type', 'payment_method', 'address_id', 'items',
        ]

    def validate(self, attrs):
        items_data = attrs.get('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'Корзина пуста.'})

        # Разрешить address_id → delivery_address + кэшировать зону
        address_id = attrs.pop('address_id', None)
        if address_id:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError({'address_id': 'Требуется авторизация.'})
            try:
                addr = Address.objects.get(id=address_id, user=request.user)
            except Address.DoesNotExist:
                raise serializers.ValidationError({'address_id': 'Адрес не найден.'})
            # Кэшировать delivery_zone в attrs для использования в create()
            attrs['_delivery_zone'] = addr.delivery_zone
            # Собрать полную строку доставки
            parts = [addr.full_address]
            if addr.flat:
                parts.append(f'кв./офис {addr.flat}')
            if addr.entrance:
                parts.append(f'подъезд {addr.entrance}')
            if addr.floor:
                parts.append(f'этаж {addr.floor}')
            if addr.intercom:
                parts.append(f'домофон {addr.intercom}')
            if addr.comment:
                parts.append(f'({addr.comment})')
            attrs['delivery_address'] = ', '.join(parts)

        # Проверяем промокод сразу при валидации, чтобы вернуть понятную ошибку
        promo_code_str = attrs.get('promo_code', '')
        if promo_code_str and promo_code_str.strip():
            try:
                promo = PromoCode.objects.get(code__iexact=promo_code_str.strip(), is_active=True)
                from django.utils import timezone
                now = timezone.now()
                if promo.valid_from and now < promo.valid_from:
                    raise serializers.ValidationError({
                        'promo_code': f'Промокод «{promo_code_str}» ещё не действует.'
                    })
                if promo.valid_until and now > promo.valid_until:
                    raise serializers.ValidationError({
                        'promo_code': f'Промокод «{promo_code_str}» истёк.'
                    })
                # Сохраняем объект промокода в validated_data для create(),
                # чтобы избежать race condition при повторном SELECT
                attrs['_promo'] = promo
            except PromoCode.DoesNotExist:
                raise serializers.ValidationError({
                    'promo_code': f'Промокод «{promo_code_str}» не найден или неактивен.'
                })

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        promo_code_str = validated_data.pop('promo_code', '')
        delivery_zone = validated_data.pop('_delivery_zone', None)

        # Применить промокод (валидация уже прошла — передаём объект через validated_data)
        promo = validated_data.pop('_promo', None)
        discount_percent = promo.discount_percent if promo else 0

        # Привязать пользователя, если авторизован
        user = self.context['request'].user if self.context['request'].user.is_authenticated else None

        # Создать заказ атомарно: либо все позиции + финансы, либо ничего
        from django.db import transaction
        with transaction.atomic():
            order = Order.objects.create(user=user, **validated_data)

            subtotal = 0
            for item_data in items_data:
                product_slug = item_data.get('product_slug')
                set_slug = item_data.get('set_slug')
                quantity = item_data['quantity']

                if product_slug:
                    try:
                        product = Product.objects.get(slug=product_slug, is_available=True)
                    except Product.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': f'Продукт «{product_slug}» не найден или недоступен.'
                        })
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        unit_price=product.price,
                        quantity=quantity,
                        weight_grams=product.weight,
                    )
                    subtotal += product.price * quantity
                elif set_slug:
                    try:
                        menu_set = Set.objects.get(slug=set_slug, is_available=True)
                    except Set.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': f'Сет «{set_slug}» не найден или недоступен.'
                        })
                    OrderItem.objects.create(
                        order=order,
                        set_menu=menu_set,
                        product_name=menu_set.name,
                        unit_price=menu_set.price,
                        quantity=quantity,
                        weight_grams=menu_set.weight,
                    )
                    subtotal += menu_set.price * quantity

            # Расчёт скидки и доставки
            order_type = validated_data.get('order_type', 'delivery')
            settings_obj = RestaurantSettings.get_solo()
            pickup_discount = int(subtotal * settings_obj.pickup_discount_percent / 100) if order_type == 'pickup' else 0
            promo_discount = int(subtotal * discount_percent / 100) if discount_percent else 0
            discount_amount = pickup_discount + promo_discount

            # Сумма заказа после скидки — не может быть отрицательной
            subtotal_after_discount = max(0, subtotal - discount_amount)

            if order_type == 'pickup':
                delivery_fee = 0
                min_order = settings_obj.min_order_amount
            elif delivery_zone:
                from .services.delivery_zones import get_zone_rules
                rules = get_zone_rules(delivery_zone)
                delivery_fee = rules['delivery_fee']
                min_order = rules['min_order_amount']
            else:
                # Доставка выбрана, но зона неизвестна (адрес без координат) → ошибка
                if validated_data.get('delivery_address', ''):
                    raise serializers.ValidationError({
                        'delivery_address': (
                            'Адрес не привязан к зоне доставки. '
                            'Пожалуйста, сохраните адрес через «Мои адреса» и укажите его при заказе.'
                        )
                    })
                # fallback на старые правила (не должно происходить при нормальном flow)
                delivery_fee = 0 if subtotal_after_discount >= settings_obj.free_delivery_from else settings_obj.suburban_delivery_fee
                min_order = settings_obj.min_order_amount

            # Проверка минимальной суммы заказа (по еде, без учёта доставки)
            if subtotal_after_discount < min_order:
                raise serializers.ValidationError({
                    'items': f'Минимальная сумма заказа: {min_order} ₽. '
                             f'Сейчас: {subtotal_after_discount} ₽, добавьте ещё {min_order - subtotal_after_discount} ₽.'
                })

            # Итог с доставкой — для финальной суммы
            effective_total = subtotal_after_discount + delivery_fee

            order.subtotal = subtotal
            order.discount_amount = discount_amount
            order.delivery_fee = delivery_fee
            order.total = effective_total
            order.promo_code = promo
            order.save(update_fields=['subtotal', 'discount_amount', 'delivery_fee', 'total', 'promo_code'])

        return order

    @staticmethod
    def _validate_promo(code_str):
        pass  # deprecated — validation moved to validate() and create()


class OrderItemReadSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'unit_price', 'quantity', 'weight_grams', 'line_total', 'product_image']

    def get_product_image(self, obj):
        img = None
        if obj.product and obj.product.image:
            img = obj.product.image
        elif obj.set_menu and obj.set_menu.image:
            img = obj.set_menu.image
        if not img:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(img.url)
        return img.url


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name', 'customer_phone',
            'delivery_address', 'comment', 'order_type', 'payment_method',
            'subtotal', 'discount_amount', 'delivery_fee', 'total',
            'payment_id', 'payment_url', 'yookassa_status',
            'created_at', 'items',
        ]


# ─── Restaurant Settings ───

class RestaurantSettingsSerializer(serializers.ModelSerializer):
    is_open = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantSettings
        fields = [
            'opening_hour', 'closing_hour', 'min_order_amount',
            'free_delivery_from', 'suburban_delivery_fee',
            'delivery_time_min', 'delivery_time_max', 'restaurant_address',
            'pickup_discount_percent',
            'is_open',
        ]

    def get_is_open(self, obj):
        from django.utils import timezone
        now = timezone.localtime()  # Asia/Yekaterinburg (Пермь)
        return obj.opening_hour <= now.hour < obj.closing_hour


# ─── Promo Code ───

class PromoCodeValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)

    def validate_code(self, value):
        from django.utils import timezone
        try:
            promo = PromoCode.objects.get(code__iexact=value.strip(), is_active=True)
        except PromoCode.DoesNotExist:
            raise serializers.ValidationError('Промокод не найден или неактивен.')
        now = timezone.now()
        if promo.valid_from and now < promo.valid_from:
            raise serializers.ValidationError('Промокод ещё не действует.')
        if promo.valid_until and now > promo.valid_until:
            raise serializers.ValidationError('Срок действия промокода истёк.')
        self._promo = promo
        return value

    def get_promo(self):
        return getattr(self, '_promo', None)


# ─── Dashboard (Admin) Serializers ───

class AdminOrderListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка заказов в дашборде."""
    items_count = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'customer_name', 'customer_phone',
            'delivery_address', 'order_type', 'payment_method', 'payment_method_display',
            'subtotal', 'discount_amount', 'delivery_fee', 'total',
            'cancel_reason', 'created_at', 'items_count',
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_method_display(self, obj):
        return obj.get_payment_method_display()


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор заказа для дашборда."""
    items = OrderItemReadSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'customer_name', 'customer_phone',
            'delivery_address', 'comment', 'order_type', 'payment_method',
            'payment_method_display', 'subtotal', 'discount_amount', 'delivery_fee',
            'total', 'cancel_reason', 'created_at', 'items',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_method_display(self, obj):
        return obj.get_payment_method_display()


class AdminOrderStatusSerializer(serializers.Serializer):
    """Смена статуса заказа."""
    status = serializers.ChoiceField(choices=Order.Status.choices)


class AdminOrderCancelSerializer(serializers.Serializer):
    """Отмена заказа с причиной."""
    reason = serializers.CharField(max_length=500, min_length=1)


class AdminDashboardStatsSerializer(serializers.Serializer):
    """Статистика для дашборда."""
    active_orders_count = serializers.IntegerField()
    avg_prep_time_minutes = serializers.IntegerField()
    active_drivers_count = serializers.IntegerField()
    total_revenue_today = serializers.IntegerField()
    new_orders_count = serializers.IntegerField()
    preparing_count = serializers.IntegerField()
    delivering_count = serializers.IntegerField()


class AdminOperationLogSerializer(serializers.ModelSerializer):
    user_role_display = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()

    class Meta:
        model = OperationLog
        fields = [
            'id', 'user_role', 'user_role_display', 'action',
            'type', 'type_display', 'target_id', 'created_at',
        ]

    def get_user_role_display(self, obj):
        return obj.get_user_role_display()

    def get_type_display(self, obj):
        return obj.get_type_display()


class AdminProductWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования продуктов."""
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = '__all__'


class AdminSetWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования сетов."""
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Set
        fields = '__all__'


class AdminUserProfileSerializer(serializers.ModelSerializer):
    """Профиль пользователя с ролью для дашборда."""
    class Meta:
        model = UserProfile
        fields = ['id', 'phone', 'role', 'created_at']
