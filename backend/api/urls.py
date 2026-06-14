from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router для viewsets
router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'subcategories', views.SubCategoryViewSet, basename='subcategory')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'sets', views.SetViewSet, basename='set')

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health, name='health'),
    path('menu/', views.get_categories_with_products, name='menu'),
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/profile/', views.ProfileView.as_view(), name='auth-profile'),
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('settings/', views.restaurant_settings, name='settings'),
    path('promo/validate/', views.validate_promo, name='promo-validate'),
]
