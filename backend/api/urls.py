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

# Dashboard admin viewsets
router.register(r'admin/products', views.AdminProductViewSet, basename='admin-product')
router.register(r'admin/sets', views.AdminSetViewSet, basename='admin-set')

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
    path('orders/<int:order_id>/dismiss/', views.dismiss_order, name='order-dismiss'),
    path('orders/<int:order_id>/cancel/', views.cancel_order, name='order-cancel'),
    # ─── Dashboard (Admin) endpoints ───
    path('admin/orders/', views.admin_order_list, name='admin-order-list'),
    path('admin/orders/<int:order_id>/', views.admin_order_detail, name='admin-order-detail'),
    path('admin/orders/<int:order_id>/status/', views.admin_order_update_status, name='admin-order-status'),
    path('admin/orders/<int:order_id>/cancel/', views.admin_order_cancel, name='admin-order-cancel'),
    path('admin/stats/', views.admin_dashboard_stats, name='admin-stats'),
    path('admin/logs/', views.admin_log_list, name='admin-log-list'),
    path('admin/logs/clear/', views.admin_log_clear, name='admin-log-clear'),
    path('admin/menu/<str:item_type>/<slug:slug>/toggle/', views.admin_toggle_availability, name='admin-menu-toggle'),
    path('admin/profile/', views.admin_profile, name='admin-profile'),
]
