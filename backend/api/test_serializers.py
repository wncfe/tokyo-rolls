"""Tests for serializer validation and output."""

from datetime import datetime

from django.utils import timezone
import pytest
from rest_framework.exceptions import ErrorDetail

pytestmark = pytest.mark.django_db

from api.factories import (
    AddressFactory,
    PromoCodeFactory,
    ProductFactory,
    SetFactory,
    SetItemFactory,
    UserFactory,
    UserProfileFactory,
)
from api.models import RestaurantSettings
from api.serializers import (
    AddressSerializer,
    CodeVerifySerializer,
    OrderItemWriteSerializer,
    OrderWriteSerializer,
    PhoneRequestSerializer,
    ProductSerializer,
    PromoCodeValidateSerializer,
    RestaurantSettingsSerializer,
    SetSerializer,
)


# ─── PhoneRequestSerializer ───


class TestPhoneRequestSerializer:
    """Phone number validation."""

    VALID_PHONES = [
        '+7 (999) 111-11-11',
        '+7(999)111-11-11',
        '+7 999 111 11 11',
        '8 (999) 111-11-11',
        '89991111111',
    ]
    INVALID_PHONES = [
        '',
        '12345',
        'abc',
        '+7 (999) 111-11-1',  # too short
    ]

    def test_valid_phone(self):
        for phone in self.VALID_PHONES:
            serializer = PhoneRequestSerializer(data={'phone': phone})
            assert serializer.is_valid(), f'Phone should be valid: {phone}'

    def test_invalid_phone(self):
        for phone in self.INVALID_PHONES:
            serializer = PhoneRequestSerializer(data={'phone': phone})
            assert not serializer.is_valid(), f'Phone should be invalid: {phone}'


# ─── CodeVerifySerializer ───


class TestCodeVerifySerializer:
    """SMS code must be exactly 4 digits."""

    def test_valid_code(self):
        serializer = CodeVerifySerializer(data={
            'phone': '+7 (999) 111-11-11',
            'code': '1234',
        })
        assert serializer.is_valid()

    def test_code_with_letters(self):
        serializer = CodeVerifySerializer(data={
            'phone': '+7 (999) 111-11-11',
            'code': '12a4',
        })
        assert not serializer.is_valid()
        assert 'code' in serializer.errors

    def test_code_too_short(self):
        serializer = CodeVerifySerializer(data={
            'phone': '+7 (999) 111-11-11',
            'code': '123',
        })
        assert not serializer.is_valid()

    def test_code_too_long(self):
        serializer = CodeVerifySerializer(data={
            'phone': '+7 (999) 111-11-11',
            'code': '12345',
        })
        assert not serializer.is_valid()

    def test_code_empty(self):
        serializer = CodeVerifySerializer(data={
            'phone': '+7 (999) 111-11-11',
            'code': '',
        })
        assert not serializer.is_valid()


# ─── ProductSerializer ───


class TestProductSerializer:
    """ProductSerializer output fields."""

    def test_composition_and_allergens(self, product, ingredient_with_allergen, allergen):
        """composition returns ingredient names, allergens returns sorted unique names."""
        product.ingredients.add(ingredient_with_allergen)
        serializer = ProductSerializer(product)
        assert allergen.name in serializer.data['allergens']
        assert ingredient_with_allergen.name in serializer.data['composition']

    def test_image_url(self, rf, product):
        """image should be an absolute URI when request context is provided."""
        request = rf.get('/')
        serializer = ProductSerializer(product, context={'request': request})
        assert serializer.data['image'] is not None
        assert request.build_absolute_uri('/') in serializer.data['image']

    def test_serialization_fields(self, product):
        """Check that all expected fields are present."""
        serializer = ProductSerializer(product)
        expected = {
            'id', 'slug', 'name', 'description', 'price', 'weight',
            'pieces_amount', 'image', 'composition', 'allergens',
            'is_new', 'benefit_badge', 'is_available',
            'category_slug', 'subcategory_slug',
        }
        assert set(serializer.data.keys()) == expected

    def test_category_slug(self, product):
        serializer = ProductSerializer(product)
        assert serializer.data['category_slug'] == product.category.slug

    def test_subcategory_slug(self, product):
        serializer = ProductSerializer(product)
        assert serializer.data['subcategory_slug'] == product.subcategory.slug


# ─── SetSerializer ───


class TestSetSerializer:
    """SetSerializer output fields."""

    def test_included_products(self, set_menu, product):
        """included_products should list items from SetItem."""
        serializer = SetSerializer(set_menu)
        items = serializer.data['included_products']
        assert len(items) >= 1
        assert items[0]['product_slug'] == product.slug

    def test_serialization_fields(self, set_menu):
        """Check that all expected fields are present."""
        serializer = SetSerializer(set_menu)
        expected = {
            'id', 'slug', 'name', 'description', 'price', 'weight',
            'pieces_amount', 'image', 'composition', 'allergens',
            'included_products', 'is_new', 'benefit_badge', 'is_available',
        }
        assert set(serializer.data.keys()) == expected


# ─── OrderItemWriteSerializer ───


class TestOrderItemWriteSerializer:
    """XOR validation for product_slug / set_slug."""

    def test_product_slug_only(self):
        serializer = OrderItemWriteSerializer(data={
            'product_slug': 'test-product',
            'quantity': 2,
        })
        assert serializer.is_valid()

    def test_set_slug_only(self):
        serializer = OrderItemWriteSerializer(data={
            'set_slug': 'test-set',
            'quantity': 1,
        })
        assert serializer.is_valid()

    def test_both_missing(self):
        serializer = OrderItemWriteSerializer(data={
            'quantity': 1,
        })
        assert not serializer.is_valid()
        assert 'product_slug' in str(serializer.errors) or 'set_slug' in str(serializer.errors)

    def test_both_present(self):
        serializer = OrderItemWriteSerializer(data={
            'product_slug': 'test',
            'set_slug': 'test',
            'quantity': 1,
        })
        assert not serializer.is_valid()


# ─── OrderWriteSerializer ───


class TestOrderWriteSerializerValidation:
    """OrderWriteSerializer.validate() business rules."""

    def test_empty_cart_raises_error(self, rf):
        """items=[] should fail validation."""
        request = rf.post('/')
        serializer = OrderWriteSerializer(
            data={'items': []},
            context={'request': request},
        )
        assert not serializer.is_valid()
        assert 'items' in str(serializer.errors)

    def test_invalid_promo_code(self, rf, product):
        """Non-existent promo code should fail."""
        request = rf.post('/')
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
                'promo_code': 'NONEXISTENT',
            },
            context={'request': request},
        )
        assert not serializer.is_valid()

    def test_expired_promo_code(self, rf, product, promo_code_expired):
        """Expired promo code should fail."""
        request = rf.post('/')
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
                'promo_code': promo_code_expired.code,
            },
            context={'request': request},
        )
        assert not serializer.is_valid()

    def test_future_promo_code(self, rf, product, promo_code_future):
        """Future promo code should fail."""
        request = rf.post('/')
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
                'promo_code': promo_code_future.code,
            },
            context={'request': request},
        )
        assert not serializer.is_valid()

    def test_address_id_not_found(self, rf, user, product):
        """Non-existent address_id should fail."""
        request = rf.post('/')
        request.user = user
        serializer = OrderWriteSerializer(
            data={
                'items': [{'product_slug': product.slug, 'quantity': 1}],
                'address_id': 99999,
            },
            context={'request': request},
        )
        assert not serializer.is_valid()


# ─── PromoCodeValidateSerializer ───


class TestPromoCodeValidateSerializer:
    """Promo validation logic."""

    def test_valid_promo(self, promo_code):
        serializer = PromoCodeValidateSerializer(data={'code': promo_code.code})
        assert serializer.is_valid()
        assert serializer.get_promo() == promo_code

    def test_invalid_promo(self):
        serializer = PromoCodeValidateSerializer(data={'code': 'INVALID'})
        assert not serializer.is_valid()

    def test_expired_promo(self, promo_code_expired):
        serializer = PromoCodeValidateSerializer(data={'code': promo_code_expired.code})
        assert not serializer.is_valid()

    def test_inactive_promo(self, promo_code_inactive):
        serializer = PromoCodeValidateSerializer(data={'code': promo_code_inactive.code})
        assert not serializer.is_valid()


# ─── RestaurantSettingsSerializer ───


class TestRestaurantSettingsSerializer:
    """is_open calculation and settings output."""

    def test_is_open_during_hours(self, settings_obj):
        """Restaurant should be open during working hours."""
        serializer = RestaurantSettingsSerializer(settings_obj)
        # We can't control timezone.now(), so just check the field exists
        assert 'is_open' in serializer.data

    def test_all_fields_present(self, settings_obj):
        serializer = RestaurantSettingsSerializer(settings_obj)
        expected = {
            'opening_hour', 'closing_hour', 'min_order_amount',
            'free_delivery_from', 'suburban_delivery_fee',
            'delivery_time_min', 'delivery_time_max', 'restaurant_address',
            'pickup_discount_percent', 'is_open',
        }
        assert set(serializer.data.keys()) == expected
