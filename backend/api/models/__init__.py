"""Модели разбиты по доменным модулям.

Каждый модуль отвечает за свою предметную область:
- catalog:   категории, подкатегории, продукты, сеты, ингредиенты, аллергены
- orders:    заказы и позиции заказов
- auth:      профили пользователей и адреса доставки
- settings:  настройки ресторана и промокоды
- log:       журнал операций
"""

from .catalog import (
    Category,
    SubCategory,
    Product,
    Set,
    SetItem,
    ProductIngredient,
    SetIngredient,
    Ingredient,
    Allergen,
)
from .orders import (
    Order,
    OrderItem,
)
from .auth import (
    UserProfile,
    Address,
)
from .settings import (
    RestaurantSettings,
    PromoCode,
)
from .log import (
    OperationLog,
)

__all__ = [
    'Category',
    'SubCategory',
    'Product',
    'Set',
    'SetItem',
    'ProductIngredient',
    'SetIngredient',
    'Ingredient',
    'Allergen',
    'Order',
    'OrderItem',
    'UserProfile',
    'Address',
    'RestaurantSettings',
    'PromoCode',
    'OperationLog',
]
