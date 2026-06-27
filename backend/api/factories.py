"""Factory-boy factories for all Tokyo Rolls models."""

import io
import uuid
from datetime import datetime, timedelta
from django.utils import timezone

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from factory import LazyAttribute, post_generation, SubFactory, Sequence, Trait
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyInteger, FuzzyChoice, FuzzyText

from api.models import (
    Address,
    Allergen,
    Category,
    Ingredient,
    OperationLog,
    Order,
    OrderItem,
    Product,
    ProductIngredient,
    PromoCode,
    RestaurantSettings,
    Set,
    SetIngredient,
    SetItem,
    SubCategory,
    UserProfile,
)


# ─── Helper: generate a small test image bytes ───

def _test_image_bytes(name: str = 'test.png') -> SimpleUploadedFile:
    """Create a minimal valid PNG (1×1 pixel) for ImageField tests."""
    # Minimal 1×1 red PNG
    raw = (
        b'\x89PNG\r\n\x1a\n'                         # PNG signature
        b'\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        b'\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N'
        b'\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    return SimpleUploadedFile(name=name, content=raw, content_type='image/png')


# ─── User ───

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = Sequence(lambda n: f'user_{n:04d}')
    password = None  # unusable password

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override to use create_user (which hashes password) or set_unusable_password."""
        password = kwargs.pop('password', None)
        instance = super()._create(model_class, *args, **kwargs)
        if password:
            instance.set_password(password)
        else:
            instance.set_unusable_password()
        instance.save()
        return instance


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = SubFactory(UserFactory)
    phone = Sequence(lambda n: f'+7999{n:07d}')


# ─── Menu structure ───

class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = Category

    slug = Sequence(lambda n: f'cat_{n:04d}')
    name = Sequence(lambda n: f'Категория {n}')
    subtitle = ''
    sort_order = 0
    is_active = True


class SubCategoryFactory(DjangoModelFactory):
    class Meta:
        model = SubCategory

    slug = Sequence(lambda n: f'subcat_{n:04d}')
    category = SubFactory(CategoryFactory)
    name = Sequence(lambda n: f'Подкатегория {n}')
    sort_order = 0
    is_active = True


class AllergenFactory(DjangoModelFactory):
    class Meta:
        model = Allergen

    slug = Sequence(lambda n: f'allergen_{n:04d}')
    name = Sequence(lambda n: f'Аллерген {n}')


class IngredientFactory(DjangoModelFactory):
    class Meta:
        model = Ingredient

    slug = Sequence(lambda n: f'ingredient_{n:04d}')
    name = Sequence(lambda n: f'Ингредиент {n}')

    @post_generation
    def allergens(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            self.allergens.add(*extracted)


class ProductIngredientFactory(DjangoModelFactory):
    class Meta:
        model = ProductIngredient

    product = SubFactory('api.factories.ProductFactory')
    ingredient = SubFactory(IngredientFactory)
    sort_order = 0


# ─── Product ───

class ProductFactory(DjangoModelFactory):
    class Meta:
        model = Product

    slug = Sequence(lambda n: f'product_{n:04d}')
    name = Sequence(lambda n: f'Продукт {n}')
    description = 'Вкусное блюдо'
    price = FuzzyInteger(200, 1500)
    weight = FuzzyInteger(100, 500)
    pieces_amount = FuzzyInteger(4, 12)
    image = LazyAttribute(lambda _: _test_image_bytes('product.png'))
    is_new = False
    benefit_badge = ''
    is_available = True
    sort_order = 0

    @post_generation
    def ingredients(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            self.ingredients.add(*extracted)

    class Params:
        # Pre-built trait for rolls
        rolls = Trait(
            category=SubFactory(CategoryFactory, slug='rolls'),
            subcategory=SubFactory(SubCategoryFactory),
        )


# ─── Set ───

class SetFactory(DjangoModelFactory):
    class Meta:
        model = Set

    slug = Sequence(lambda n: f'set_{n:04d}')
    name = Sequence(lambda n: f'Сет {n}')
    description = 'Вкусный набор'
    price = FuzzyInteger(800, 4000)
    weight = FuzzyInteger(500, 2000)
    pieces_amount = FuzzyInteger(8, 30)
    image = LazyAttribute(lambda _: _test_image_bytes('set.png'))
    is_new = False
    benefit_badge = ''
    is_available = True
    sort_order = 0


class SetItemFactory(DjangoModelFactory):
    class Meta:
        model = SetItem

    set_menu = SubFactory(SetFactory)
    included_product = SubFactory(ProductFactory)
    quantity = 1


class SetIngredientFactory(DjangoModelFactory):
    class Meta:
        model = SetIngredient

    set_menu = SubFactory(SetFactory)
    ingredient = SubFactory(IngredientFactory)
    sort_order = 0


# ─── Address ───

class AddressFactory(DjangoModelFactory):
    class Meta:
        model = Address

    user = SubFactory(UserFactory)
    full_address = Sequence(lambda n: f'г Пермь, ул Тестовая, д {n}')
    latitude = 58.015000  # inside free_delivery zone (center of Perm)
    longitude = 56.290000
    flat = '1'
    entrance = '1'
    floor = '1'
    intercom = ''
    comment = ''
    is_default = False

    @post_generation
    def assign_zone(self, create, extracted, **kwargs):
        """Auto-assign delivery_zone based on coordinates."""
        if not create:
            return
        from api.services.delivery_zones import get_delivery_zone
        self.delivery_zone = get_delivery_zone(
            float(self.longitude), float(self.latitude)
        )
        self.save(update_fields=['delivery_zone'])


# ─── PromoCode ───

class PromoCodeFactory(DjangoModelFactory):
    class Meta:
        model = PromoCode

    code = Sequence(lambda n: f'PROMO{n:04d}')
    discount_percent = FuzzyInteger(5, 30)
    description = 'Тестовый промокод'
    is_active = True
    valid_from = None
    valid_until = None

    class Params:
        expired = Trait(
            valid_from=timezone.now() - timedelta(days=730),
            valid_until=timezone.now() - timedelta(days=365),
        )
        future = Trait(
            valid_from=timezone.now() + timedelta(days=365),
            valid_until=timezone.now() + timedelta(days=730),
        )


# ─── Order ───

class OrderFactory(DjangoModelFactory):
    class Meta:
        model = Order

    user = SubFactory(UserFactory)
    status = Order.Status.PENDING
    payment_method = Order.PaymentMethod.CARD_ONLINE
    order_type = 'delivery'
    customer_name = Sequence(lambda n: f'Клиент {n}')
    customer_phone = Sequence(lambda n: f'+7999{n:07d}')
    subtotal = 0
    discount_amount = 0
    delivery_fee = 0
    total = 0


class OrderItemFactory(DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = SubFactory(OrderFactory)
    product = SubFactory(ProductFactory)
    set_menu = None
    product_name = Sequence(lambda n: f'Блюдо {n}')
    unit_price = 500
    quantity = 1
    weight_grams = 200


# ─── RestaurantSettings ───

class RestaurantSettingsFactory(DjangoModelFactory):
    """Factory for RestaurantSettings. Uses get_or_create to respect singleton pattern."""

    class Meta:
        model = RestaurantSettings

    opening_hour = 11
    closing_hour = 23
    min_order_amount = 700
    free_delivery_from = 1500
    suburban_delivery_fee = 100
    delivery_time_min = 45
    delivery_time_max = 60
    restaurant_address = 'г Пермь, ул Ленина, д 88'
    pickup_discount_percent = 10


class OperationLogFactory(DjangoModelFactory):
    class Meta:
        model = 'api.OperationLog'

    user = SubFactory(UserFactory)
    user_role = 'manager'
    action = Sequence(lambda n: f'Действие {n}')
    type = 'system'
    target_id = ''
