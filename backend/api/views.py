from django.http import JsonResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Category, SubCategory, Product
from .serializers import CategorySerializer, SubCategorySerializer, ProductSerializer


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
    ordering_fields = ['sort_order', 'name', 'price']
    ordering = ['sort_order', 'name']

    def get_queryset(self):
        queryset = Product.objects.filter(is_available=True).select_related(
            'category', 'subcategory'
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


@api_view(['GET'])
def get_categories_with_products(request):
    """
    Получить все категории с их продуктами.
    Оптимизированный эндпоинт для главной страницы фронтенда.
    """
    categories = Category.objects.filter(is_active=True).prefetch_related(
        'products',
        'subcategories__products'
    ).order_by('sort_order')

    data = []
    for category in categories:
        cat_data = {
            'id': category.id,
            'slug': category.slug,
            'name': category.name,
            'subtitle': category.subtitle,
            'products': ProductSerializer(
                category.products.filter(is_available=True).order_by('sort_order'),
                many=True
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
                        subcat.products.filter(is_available=True).order_by('sort_order'),
                        many=True
                    ).data,
                })
            cat_data['subcategories'] = subcats

        data.append(cat_data)

    return Response(data)
