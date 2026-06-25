from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# DRF Router для viewsets
router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'subcategories', views.SubCategoryViewSet, basename='subcategory')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'sets', views.SetViewSet, basename='set')
router.register(r'addresses', views.AddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health, name='health'),
    path('menu/', views.get_categories_with_products, name='menu'),
    path('auth/request-code/', views.request_code, name='auth-request-code'),
    path('auth/verify-code/', views.verify_code, name='auth-verify-code'),
    path('auth/profile/', views.ProfileView.as_view(), name='auth-profile'),
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('settings/', views.restaurant_settings, name='settings'),
    path('promo/validate/', views.validate_promo, name='promo-validate'),
    path('dadata/suggest/', views.dadata_suggest, name='dadata-suggest'),
    path('delivery/check-zone/', views.check_delivery_zone, name='delivery-check-zone'),
    path('payment/webhook/', views.payment_webhook, name='payment-webhook'),
    path('payment/status/<int:order_id>/', views.payment_status, name='payment-status'),
    path('orders/active/', views.active_order, name='order-active'),
    path('orders/<int:order_id>/', views.order_detail, name='order-detail'),
]
