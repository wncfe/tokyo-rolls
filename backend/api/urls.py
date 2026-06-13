from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router для viewsets
router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'subcategories', views.SubCategoryViewSet, basename='subcategory')
router.register(r'products', views.ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health, name='health'),
    path('menu/', views.get_categories_with_products, name='menu'),
]
