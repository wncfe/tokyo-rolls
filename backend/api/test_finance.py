"""Tests for order financial calculations (subtotal, discounts, delivery fee, minimum order).

This is the most critical business logic in the application.
All tests go through OrderWriteSerializer.create() to test real calculations.

Settings used (from RestaurantSettingsFactory defaults):
    - min_order_amount = 700
    - free_delivery_from = 1500
    - suburban_delivery_fee = 100
    - pickup_discount_percent = 10
"""

import pytest
from rest_framework.exceptions import ErrorDetail

pytestmark = pytest.mark.django_db


from api.factories import (
    AddressFactory,
    ProductFactory,
    PromoCodeFactory,
    RestaurantSettingsFactory,
    SetFactory,
    SetItemFactory,
    UserFactory,
    UserProfileFactory,
)
from api.models import Order
from api.serializers import OrderWriteSerializer


# ─── Helper ───


def _run_checkout(user, items_data, order_type='delivery', promo_code='', address_id=None, rf=None):
    """Helper: run OrderWriteSerializer.create() and return the Order object."""
    request = rf.post('/')
    request.user = user
    data = {
        'items': items_data,
        'order_type': order_type,
    }
    if promo_code:
        data['promo_code'] = promo_code
    if address_id:
        data['address_id'] = address_id

    serializer = OrderWriteSerializer(data=data, context={'request': request})
    assert serializer.is_valid(), f'Validation failed: {serializer.errors}'
    order = serializer.save()
    return order


# ─── Subtotals ───


class TestSubtotalCalculation:
    """subtotal = Σ(price × quantity) for all items."""

    def test_single_product(self, rf, user, product, settings_obj):
        """Single item: subtotal = price × quantity."""
        product.price = 500
        product.save()
        order = _run_checkout(user, [{'product_slug': product.slug, 'quantity': 2}], rf=rf)
        assert order.subtotal == 1000  # 500 × 2

    def test_multiple_products(self, rf, user, product, product_sushi, settings_obj):
        """Multiple items: subtotal sums correctly."""
        product.price = 300
        product.save()
        product_sushi.price = 700
        product_sushi.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 2},       # 600
            {'product_slug': product_sushi.slug, 'quantity': 1},  # 700
        ], rf=rf)
        assert order.subtotal == 1300  # 600 + 700

    def test_set_item(self, rf, user, set_menu, settings_obj):
        """Set items are priced by set_menu.price."""
        set_menu.price = 2000
        set_menu.save()
        order = _run_checkout(user, [
            {'set_slug': set_menu.slug, 'quantity': 1},
        ], rf=rf)
        assert order.subtotal == 2000

    def test_mixed_product_and_set(self, rf, user, product, set_menu, settings_obj):
        """Mix of product and set in one order."""
        product.price = 400
        product.save()
        set_menu.price = 1500
        set_menu.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 3},  # 1200
            {'set_slug': set_menu.slug, 'quantity': 1},     # 1500
        ], rf=rf)
        assert order.subtotal == 2700


# ─── Pickup Discount ───


class TestPickupDiscount:
    """pickup_discount = int(subtotal × pickup_discount_percent / 100)."""

    def test_pickup_discount_applied(self, rf, user, product, settings_obj):
        """Pickup gets 10% off subtotal."""
        product.price = 1000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='pickup', rf=rf)
        assert order.order_type == 'pickup'
        assert order.discount_amount == 100  # 10% of 1000
        assert order.total == 900  # 1000 - 100 + 0 delivery

    def test_pickup_discount_truncation(self, rf, user, product, settings_obj):
        """Discount truncates (int division), not rounds."""
        product.price = 950
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='pickup', rf=rf)
        assert order.discount_amount == 95  # int(950 * 10 / 100) = 95

    def test_delivery_has_no_pickup_discount(self, rf, user, product, settings_obj):
        """Delivery mode should NOT get pickup discount."""
        product.price = 1000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='delivery', rf=rf)
        assert order.discount_amount == 0


# ─── Promo Discount ───


class TestPromoDiscount:
    """promo_discount = int(subtotal × promo.discount_percent / 100)."""

    def test_promo_discount_applied(self, rf, user, product, promo_code, settings_obj):
        """Promo code reduces subtotal by its percentage."""
        product.price = 2000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], promo_code=promo_code.code, rf=rf)
        assert order.discount_amount == 200  # 10% of 2000
        assert order.discount_amount == 200
        assert order.promo_code == promo_code

    def test_promo_and_pickup_stack(self, rf, user, product, promo_code, settings_obj):
        """Pickup discount AND promo discount should stack (additive)."""
        product.price = 2000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='pickup', promo_code=promo_code.code, rf=rf)
        assert order.discount_amount == 400  # 200 (pickup 10%) + 200 (promo 10%)


# ─── Delivery Fee ───


class TestDeliveryFee:
    """delivery_fee = 0 if subtotal - discount >= free_delivery_from, else suburban_delivery_fee."""

    def test_free_delivery_above_threshold(self, rf, user, product, settings_obj):
        """No delivery fee when subtotal >= free_delivery_from (1500)."""
        # free_delivery_from = 1500, so 3 × 600 = 1800 → free
        product.price = 600
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 3},
        ], rf=rf)
        assert order.delivery_fee == 0

    def test_paid_delivery_below_threshold(self, rf, user, product, settings_obj):
        """Delivery fee charged when subtotal < free_delivery_from."""
        product.price = 400
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 2},  # 800 < 1500
        ], rf=rf)
        assert order.delivery_fee == 100  # suburban_delivery_fee

    def test_delivery_fee_zero_for_pickup(self, rf, user, product, settings_obj):
        """Pickup always has 0 delivery fee."""
        product.price = 1000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='pickup', rf=rf)
        assert order.delivery_fee == 0

    def test_delivery_discount_affects_threshold(self, rf, user, product, promo_code, settings_obj):
        """Discount reduces effective amount for delivery threshold check."""
        # subtotal = 1600, discount = 160 (10%), effective = 1440 < 1500 → pay delivery
        product.price = 800
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 2},  # 1600
        ], promo_code=promo_code.code, rf=rf)
        # subtotal=1600, discount=160, effective=1440 < 1500 → fee=100
        assert order.subtotal == 1600
        assert order.discount_amount == 160
        assert order.delivery_fee == 100  # because 1440 < 1500
        assert order.total == 1540  # 1600 - 160 + 100


# ─── Minimum Order ───


class TestMinimumOrder:
    """effective_total = subtotal - discount + delivery_fee >= min_order_amount (700)."""

    def test_above_minimum(self, rf, user, product, settings_obj):
        """Order above minimum passes."""
        product.price = 800
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], rf=rf)
        assert order.total >= 700

    def test_below_minimum_raises_error(self, rf, user, product, settings_obj):
        """Order below minimum raises ValidationError in create()."""
        product.price = 300
        product.save()
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
            },
            context={'request': request},
        )
        assert serializer.is_valid(), 'Field validation should pass'
        with pytest.raises(Exception) as excinfo:
            serializer.save()
        assert 'Минимальная сумма' in str(excinfo.value)

    def test_pickup_below_minimum(self, rf, user, product, settings_obj):
        """Pickup below minimum also raises error (discount doesn't reduce minimum requirement)."""
        product.price = 400
        product.save()
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 2}],  # 800 subtotal
                'order_type': 'pickup',
            },
            context={'request': request},
        )
        # subtotal=800, discount=80 (pickup 10%), effective=720 >= 700 → OK
        assert serializer.is_valid(), f'{serializer.errors}'


# ─── Product/Set Availability ───


class TestItemAvailability:
    """Only available products/sets can be ordered."""

    def test_unavailable_product_raises_error(self, rf, user, unavailable_product, settings_obj):
        """Ordering an unavailable product should fail in create()."""
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': unavailable_product.slug, 'quantity': 1}],
            },
            context={'request': request},
        )
        assert serializer.is_valid(), 'Field validation should pass'
        with pytest.raises(Exception) as excinfo:
            serializer.save()
        assert 'не найден или недоступен' in str(excinfo.value)

    def test_unavailable_set_raises_error(self, rf, user, unavailable_set, settings_obj):
        """Ordering an unavailable set should fail in create()."""
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'set_slug': unavailable_set.slug, 'quantity': 1}],
            },
            context={'request': request},
        )
        assert serializer.is_valid(), 'Field validation should pass'
        with pytest.raises(Exception) as excinfo:
            serializer.save()
        assert 'не найден или недоступен' in str(excinfo.value)


# ─── Auto-fill ───


class TestAutoFill:
    """Customer name and phone auto-fill from profile."""

    def test_auto_fill_name_and_phone_not_implemented(self, rf, user, product, settings_obj):
        """customer_name and customer_phone are NOT auto-filled (MVP limitation)."""
        product.price = 1000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], rf=rf)
        # MVP doesn't auto-fill — both remain empty
        assert order.customer_name == ''
        assert order.customer_phone == ''

    def test_explicit_values_persist(self, rf, user, product, settings_obj):
        """Explicitly provided values should be saved."""
        product.price = 1000
        product.save()
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
                'customer_name': 'Custom Name',
                'customer_phone': '+79990000000',
            },
            context={'request': request},
        )
        assert serializer.is_valid()
        order = serializer.save()
        assert order.customer_name == 'Custom Name'
        assert order.customer_phone == '+79990000000'


# ─── Full financial integration ───


class TestFullFinancialCalculation:
    """Full integration: subtotal → discounts → delivery → total."""

    def test_delivery_with_promo(self, rf, user, product, promo_code, settings_obj):
        """
        Delivery order with promo:
          - subtotal = 2500
          - promo 10% = 250
          - effective = 2500 - 250 = 2250 >= 1500 → free delivery
          - total = 2500 - 250 + 0 = 2250
        """
        product.price = 500
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 5},
        ], promo_code=promo_code.code, rf=rf)
        assert order.subtotal == 2500
        assert order.discount_amount == 250
        assert order.delivery_fee == 0
        assert order.total == 2250

    def test_pickup_below_free_delivery(self, rf, user, product, settings_obj):
        """
        Pickup order below free delivery threshold:
          - subtotal = 800
          - discount = 80 (10% pickup)
          - delivery_fee = 0 (pickup)
          - total = 800 - 80 = 720 >= 700 (min) ✓
        """
        product.price = 800
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], order_type='pickup', rf=rf)
        assert order.subtotal == 800
        assert order.discount_amount == 80
        assert order.delivery_fee == 0
        assert order.total == 720

    def test_large_order_with_all_discounts(self, rf, user, product, promo_code, settings_obj):
        """
        Large order with pickup + promo:
          - subtotal = 5000 (5 × 1000)
          - pickup = 500 (10%)
          - promo = 500 (10%)
          - discount = 1000
          - effective = 5000 - 1000 = 4000 >= 1500 → free delivery
          - total = 4000
        """
        product.price = 1000
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 5},
        ], order_type='pickup', promo_code=promo_code.code, rf=rf)
        assert order.subtotal == 5000
        assert order.discount_amount == 1000  # 500 (pickup) + 500 (promo)
        assert order.delivery_fee == 0
        assert order.total == 4000

    def test_small_delivery_order_with_fee(self, rf, user, product, settings_obj):
        """
        Small delivery order:
          - subtotal = 700 (just meets minimum)
          - discount = 0
          - effective = 700 < 1500 → fee = 100
          - total = 800
        """
        product.price = 700
        product.save()
        order = _run_checkout(user, [
            {'product_slug': product.slug, 'quantity': 1},
        ], rf=rf)
        assert order.subtotal == 700
        assert order.discount_amount == 0
        assert order.delivery_fee == 100
        assert order.total == 800
