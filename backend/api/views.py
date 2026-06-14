import os
import requests
from django.http import JsonResponse
from django.db.models import Prefetch
from rest_framework import viewsets, filters, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Category, SubCategory, Product, Set, UserProfile, Order, RestaurantSettings
from .serializers import (
    CategorySerializer, SubCategorySerializer, ProductSerializer, SetSerializer,
    RegisterSerializer, UserProfileSerializer,
    OrderWriteSerializer, OrderReadSerializer,
    RestaurantSettingsSerializer, PromoCodeValidateSerializer,
)


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
        Prefetch('products', queryset=Product.objects.filter(is_available=True).order_by('-created_at')),
        Prefetch('subcategories__products', queryset=Product.objects.filter(is_available=True).order_by('-created_at')),
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


class RegisterView(generics.CreateAPIView):
    """Регистрация нового пользователя."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'id': user.id,
            'username': user.username,
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """Профиль текущего пользователя."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class CheckoutView(generics.CreateAPIView):
    """Оформление заказа из корзины."""
    serializer_class = OrderWriteSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OrderReadSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


@api_view(['GET'])
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
        return Response(
            {'detail': 'DADATA_API_KEY not configured on server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        resp = requests.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            json={
                'query': query.strip(),
                'count': 10,
                'locations': [{'city': 'Пермь'}],
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
        return Response(data.get('suggestions', []), status=status.HTTP_200_OK)
    except requests.RequestException as e:
        return Response(
            {'detail': f'DaData request failed: {str(e)}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
