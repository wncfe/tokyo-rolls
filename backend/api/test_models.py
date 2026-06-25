"""Model validation and constraint tests."""

import pytest
import re
from datetime import date

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from api.factories import (
    AddressFactory,
    CategoryFactory,
    OrderFactory,
    OrderItemFactory,
    ProductFactory,
    UserFactory,
)
from api.models import (
    Address,
    Category,
    Order,
    OrderItem,
    Product,
    RestaurantSettings,
    Set,
    SubCategory,
    UserProfile,
)

pytestmark = pytest.mark.django_db


# ─── Product.clean() ───


class TestProductValidation:
    """Product.clean() custom validation rules."""

    def test_sets_cannot_be_created_as_product(self, category_sets):
        """Product with category.slug='sets' must raise ValidationError."""
        p = ProductFactory.build(
            category=category_sets,
            subcategory=None,
            price=100,
            weight=100,
            pieces_amount=1,
        )
        with pytest.raises(ValidationError, match='Сеты — отдельная сущность'):
            p.clean()

    def test_rolls_must_have_subcategory(self, category_rolls):
        """Product with category.slug='rolls' without subcategory raises error."""
        p = ProductFactory.build(
            category=category_rolls,
            subcategory=None,
            price=100,
            weight=100,
            pieces_amount=1,
        )
        with pytest.raises(ValidationError, match='подкатегория'):
            p.clean()

    def test_non_rolls_cannot_have_subcategory(self, category_sushi, subcategory):
        """Non-rolls product with a subcategory must raise error."""
        p = ProductFactory.build(
            category=category_sushi,
            subcategory=subcategory,
            price=100,
            weight=100,
            pieces_amount=1,
        )
        with pytest.raises(ValidationError, match='Подкатегория допустима только для роллов'):
            p.clean()

    def test_valid_rolls_product_passes_clean(self, category_rolls, subcategory):
        """A correctly configured rolls product should pass validation."""
        p = ProductFactory.build(
            category=category_rolls,
            subcategory=subcategory,
            price=100,
            weight=100,
            pieces_amount=1,
        )
        # Should not raise
        p.clean()

    def test_valid_sushi_product_passes_clean(self, category_sushi):
        """A correctly configured sushi product should pass validation."""
        p = ProductFactory.build(
            category=category_sushi,
            subcategory=None,
            price=100,
            weight=100,
            pieces_amount=1,
        )
        # Should not raise
        p.clean()


# ─── OrderItem XOR constraint ───


class TestOrderItemXorConstraint:
    """OrderItem must have exactly one of product or set_menu (XOR)."""

    def test_product_only_is_valid(self, order, product):
        """OrderItem with product and no set_menu is valid."""
        item = OrderItemFactory.build(
            order=order,
            product=product,
            set_menu=None,
            product_name=product.name,
            unit_price=product.price,
            weight_grams=product.weight,
        )
        item.clean()

    def test_set_menu_only_is_valid(self, order, set_menu):
        """OrderItem with set_menu and no product is valid."""
        item = OrderItemFactory.build(
            order=order,
            product=None,
            set_menu=set_menu,
            product_name=set_menu.name,
            unit_price=set_menu.price,
            weight_grams=set_menu.weight,
        )
        item.clean()

    def test_both_null_raises_error(self, order):
        """OrderItem with both null must raise IntegrityError on save."""
        item = OrderItem(
            order=order,
            product=None,
            set_menu=None,
            product_name='Test',
            unit_price=100,
            quantity=1,
            weight_grams=200,
        )
        with pytest.raises(IntegrityError):
            item.save()

    # Note: We cannot easily test "both set" because the CheckConstraint
    # is at DB level — Django model validation doesn't catch it.
    # But if we try to save with both set, it should also fail.
    def test_both_set_raises_error(self, order, product, set_menu):
        """OrderItem with both product and set_menu must raise IntegrityError."""
        item = OrderItem(
            order=order,
            product=product,
            set_menu=set_menu,
            product_name='Test',
            unit_price=100,
            quantity=1,
            weight_grams=200,
        )
        with pytest.raises(IntegrityError):
            item.save()


# ─── Address ───


class TestAddressSave:
    """Address.save() business logic."""

    def test_first_address_auto_default(self, user):
        """First address for a user should auto-set is_default=True."""
        addr = AddressFactory(user=user)
        assert addr.is_default is True

    def test_second_address_not_default(self, user):
        """Second address should not be default by default."""
        addr1 = AddressFactory(user=user)
        addr2 = AddressFactory(user=user, full_address='г Пермь, ул Другая, д 5')
        # addr1 was auto-default, but addr2's save() unset addr1
        addr1.refresh_from_db()
        assert addr1.is_default is True
        assert addr2.is_default is False

    def test_switching_default(self, user):
        """Setting is_default on a new address unsets the old default."""
        addr1 = AddressFactory(user=user)
        addr2 = AddressFactory(
            user=user,
            full_address='г Пермь, ул Другая, д 5',
            is_default=True,
        )
        addr1.refresh_from_db()
        assert addr1.is_default is False
        assert addr2.is_default is True

    def test_other_users_addresses_unaffected(self):
        """Changing default on one user's address shouldn't affect another user."""
        user1 = UserFactory()
        user2 = UserFactory()
        addr1 = AddressFactory(user=user1)
        addr2 = AddressFactory(user=user2)
        assert addr1.is_default is True
        assert addr2.is_default is True


# ─── RestaurantSettings ───


class TestRestaurantSettingsSingleton:
    """RestaurantSettings.get_solo() should always return one record."""

    def test_singleton_creates_on_demand(self):
        """get_solo() should create a record if none exists."""
        RestaurantSettings.objects.all().delete()
        obj = RestaurantSettings.get_solo()
        assert obj.pk is not None
        assert obj.opening_hour == 11

    def test_singleton_returns_same_record(self, settings_obj):
        """get_solo() should return the existing record."""
        obj2 = RestaurantSettings.get_solo()
        assert obj2.pk == settings_obj.pk

    def test_singleton_always_one_record(self, settings_obj):
        """Calling get_solo() should not create duplicate records."""
        obj = RestaurantSettings.get_solo()
        obj2 = RestaurantSettings.get_solo()
        count = RestaurantSettings.objects.count()
        assert count == 1
        assert obj.pk == obj2.pk


# ─── Product field validators ───


class TestProductFieldValidators:
    """Product price, weight, pieces_amount must be >= 1."""

    def test_price_zero_raises(self):
        with pytest.raises(IntegrityError):
            ProductFactory(price=0)

    def test_weight_zero_raises(self):
        with pytest.raises(IntegrityError):
            ProductFactory(weight=0)

    def test_pieces_zero_raises(self):
        with pytest.raises(IntegrityError):
            ProductFactory(pieces_amount=0)


# ─── Order status defaults ───


class TestOrderDefaults:
    """Order should have sensible defaults."""

    def test_default_status(self, order):
        assert order.status == Order.Status.PENDING

    def test_default_payment_method(self, order):
        assert order.payment_method == Order.PaymentMethod.CARD_ONLINE

    def test_default_order_type(self, user):
        o = OrderFactory(user=user)
        assert o.order_type == 'delivery'
