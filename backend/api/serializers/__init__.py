"""Сериализаторы разбиты по доменным модулям.

Каждый модуль отвечает за свою предметную область:
- catalog:   категории, продукты, сеты, ингредиенты, аллергены
- auth:      аутентификация по телефону (passwordless)
- addresses: адреса доставки
- orders:    оформление заказа, трекер, промокоды
- dashboard: админ-дашборд (заказы, статистика, меню, логи, профиль)
- restaurant: настройки ресторана
"""

from .catalog import (
    CategorySerializer,
    SubCategorySerializer,
    ProductSerializer,
    SetSerializer,
    SetItemSerializer,
    IngredientSerializer,
    AllergenSerializer,
)
from .auth import (
    PhoneRequestSerializer,
    CodeVerifySerializer,
    UserProfileSerializer,
)
from .addresses import (
    AddressSerializer,
)
from .orders import (
    OrderItemWriteSerializer,
    OrderWriteSerializer,
    OrderItemReadSerializer,
    OrderReadSerializer,
    PromoCodeValidateSerializer,
)
from .dashboard import (
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
    AdminOrderStatusSerializer,
    AdminOrderCancelSerializer,
    AdminDashboardStatsSerializer,
    AdminOperationLogSerializer,
    AdminProductWriteSerializer,
    AdminSetWriteSerializer,
    AdminUserProfileSerializer,
)
from .restaurant import (
    RestaurantSettingsSerializer,
)

__all__ = [
    # catalog
    'CategorySerializer',
    'SubCategorySerializer',
    'ProductSerializer',
    'SetSerializer',
    'SetItemSerializer',
    'IngredientSerializer',
    'AllergenSerializer',
    # auth
    'PhoneRequestSerializer',
    'CodeVerifySerializer',
    'UserProfileSerializer',
    # addresses
    'AddressSerializer',
    # orders
    'OrderItemWriteSerializer',
    'OrderWriteSerializer',
    'OrderItemReadSerializer',
    'OrderReadSerializer',
    'PromoCodeValidateSerializer',
    # dashboard
    'AdminOrderListSerializer',
    'AdminOrderDetailSerializer',
    'AdminOrderStatusSerializer',
    'AdminOrderCancelSerializer',
    'AdminDashboardStatsSerializer',
    'AdminOperationLogSerializer',
    'AdminProductWriteSerializer',
    'AdminSetWriteSerializer',
    'AdminUserProfileSerializer',
    # restaurant
    'RestaurantSettingsSerializer',
]
