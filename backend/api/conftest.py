"""Pytest fixtures for Tokyo Rolls API tests."""

from collections.abc import Callable

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.factories import (
    AddressFactory,
    AllergenFactory,
    CategoryFactory,
    IngredientFactory,
    OrderFactory,
    OrderItemFactory,
    ProductFactory,
    PromoCodeFactory,
    RestaurantSettingsFactory,
    SetFactory,
    SetItemFactory,
    SubCategoryFactory,
    UserFactory,
    UserProfileFactory,
)
from api.models import (
    Address,
    Allergen,
    Category,
    Ingredient,
    Order,
    OrderItem,
    Product,
    PromoCode,
    RestaurantSettings,
    Set,
    SetItem,
    SubCategory,
    UserProfile,
)


# ─── API Client ───


@pytest.fixture
def api_client() -> APIClient:
    """DRF API client with JSON format."""
    return APIClient()


@pytest.fixture
def auth_client(api_client: APIClient, user: User) -> APIClient:
    """API client authenticated with JWT token for the given user."""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


# ─── User ───


@pytest.fixture
def user() -> User:
    """Create a regular user with unusable password."""
    return UserFactory()


@pytest.fixture
def user_with_profile(user: User) -> UserProfile:
    """Create a user with a phone profile."""
    return UserProfileFactory(user=user)


# ─── Menu structure ───


@pytest.fixture
def category_rolls() -> Category:
    return CategoryFactory(slug='rolls', name='Роллы')


@pytest.fixture
def category_sushi() -> Category:
    return CategoryFactory(slug='sushi', name='Суши')


@pytest.fixture
def category_sets() -> Category:
    return CategoryFactory(slug='sets', name='Сеты')


@pytest.fixture
def subcategory(category_rolls: Category) -> SubCategory:
    return SubCategoryFactory(category=category_rolls)


@pytest.fixture
def ingredient() -> Ingredient:
    return IngredientFactory()


@pytest.fixture
def allergen() -> Allergen:
    return AllergenFactory()


@pytest.fixture
def ingredient_with_allergen(allergen: Allergen) -> Ingredient:
    return IngredientFactory(allergens=[allergen])


# ─── Products ───


@pytest.fixture
def product(category_rolls: Category, subcategory: SubCategory) -> Product:
    return ProductFactory(
        category=category_rolls,
        subcategory=subcategory,
        price=500,
        weight=200,
        pieces_amount=8,
    )


@pytest.fixture
def product_sushi(category_sushi: Category) -> Product:
    return ProductFactory(category=category_sushi, price=300)


@pytest.fixture
def unavailable_product(category_rolls: Category) -> Product:
    """Product that is not available for ordering."""
    return ProductFactory(category=category_rolls, is_available=False)


# ─── Sets ───


@pytest.fixture
def set_menu(product: Product) -> Set:
    s = SetFactory(price=1500)
    SetItemFactory(set_menu=s, included_product=product, quantity=2)
    return s


@pytest.fixture
def unavailable_set(product: Product) -> Set:
    s = SetFactory(is_available=False)
    SetItemFactory(set_menu=s, included_product=product, quantity=1)
    return s


# ─── Address ───


@pytest.fixture
def address(user: User) -> Address:
    return AddressFactory(user=user, full_address='г Пермь, ул Ленина, д 88')


@pytest.fixture
def second_address(user: User) -> Address:
    return AddressFactory(user=user, full_address='г Пермь, ул Мира, д 15', flat='42')


# ─── PromoCode ───


@pytest.fixture
def promo_code() -> PromoCode:
    return PromoCodeFactory(code='TOKYO10', discount_percent=10)


@pytest.fixture
def promo_code_expired() -> PromoCode:
    return PromoCodeFactory(code='EXPIRED', expired=True)


@pytest.fixture
def promo_code_future() -> PromoCode:
    return PromoCodeFactory(code='FUTURE', future=True)


@pytest.fixture
def promo_code_inactive() -> PromoCode:
    return PromoCodeFactory(code='INACTIVE', is_active=False)


# ─── Order ───


@pytest.fixture
def order(user: User) -> Order:
    return OrderFactory(user=user)


@pytest.fixture
def order_with_items(order: Order, product: Product) -> Order:
    OrderItemFactory(order=order, product=product, product_name=product.name,
                     unit_price=product.price, quantity=2, weight_grams=product.weight)
    return order


# ─── Settings ───


@pytest.fixture
def settings_obj() -> RestaurantSettings:
    """Ensure RestaurantSettings singleton exists."""
    obj, _ = RestaurantSettings.objects.get_or_create(pk=1, defaults={
        'opening_hour': 11,
        'closing_hour': 23,
        'min_order_amount': 700,
        'free_delivery_from': 1500,
        'suburban_delivery_fee': 100,
        'delivery_time_min': 45,
        'delivery_time_max': 60,
        'restaurant_address': 'г Пермь, ул Ленина, д 88',
        'pickup_discount_percent': 10,
    })
    return obj


# ─── Phone helpers ───

@pytest.fixture
def phone_data() -> dict:
    return {'phone': '+7 (999) 111-11-11'}


@pytest.fixture
def code_data(phone_data: dict) -> dict:
    return {**phone_data, 'code': '1234'}
