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
    # payment
    'payment_webhook',
    'payment_status',
    # misc
    'health',
    'restaurant_settings',
    'validate_promo',
    'dadata_suggest',
]
