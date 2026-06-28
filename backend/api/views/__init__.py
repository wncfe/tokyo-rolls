"""Views разбиты по доменным модулям для читаемости.

Каждый модуль отвечает за свою предметную область:
- catalog:  категории, продукты, сеты, меню
- auth:     аутентификация по телефону (passwordless)
- addresses: CRUD адресов + зоны доставки
- orders:   оформление заказа, трекер, dismiss
- payment:  вебхук и статус ЮKassa
- misc:     health, настройки ресторана, промокоды, DaData
"""

from .catalog import (
    CategoryViewSet,
    SubCategoryViewSet,
    ProductViewSet,
    SetViewSet,
    get_categories_with_products,
)
from .auth import (
    request_code,
    verify_code,
    ProfileView,
)
from .addresses import (
    AddressViewSet,
    check_delivery_zone,
)
from .orders import (
    CheckoutView,
    active_order,
    order_detail,
    dismiss_order,
    cancel_order,
)
from .payment import (
    payment_webhook,
    payment_status,
)
from .misc import (
    health,
    restaurant_settings,
    validate_promo,
    dadata_suggest,
)
from .dashboard import (
    admin_order_list,
    admin_order_detail,
    admin_order_update_status,
    admin_order_cancel,
    admin_dashboard_stats,
    admin_log_list,
    admin_log_clear,
    admin_toggle_availability,
    admin_profile,
    AdminProductViewSet,
    AdminSetViewSet,
)

__all__ = [
    # catalog
    'CategoryViewSet',
    'SubCategoryViewSet',
    'ProductViewSet',
    'SetViewSet',
    'get_categories_with_products',
    # auth
    'request_code',
    'verify_code',
    'ProfileView',
    # addresses
    'AddressViewSet',
    'check_delivery_zone',
    # orders
    'CheckoutView',
    'active_order',
    'order_detail',
    'dismiss_order',
    'cancel_order',
    # payment
    'payment_webhook',
    'payment_status',
    # misc
    'health',
    'restaurant_settings',
    'validate_promo',
    'dadata_suggest',
    # dashboard
    'admin_order_list',
    'admin_order_detail',
    'admin_order_update_status',
    'admin_order_cancel',
    'admin_dashboard_stats',
    'admin_log_list',
    'admin_log_clear',
    'admin_toggle_availability',
    'admin_profile',
    'AdminProductViewSet',
    'AdminSetViewSet',
]
