"""Tests for the checkout endpoint (POST /api/checkout/).

Requires JWT authentication. Covers happy path, variations,
and error conditions.
"""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

from api.factories import AddressFactory, ProductFactory, SetItemFactory
from api.models import Order, OrderItem


CHECKOUT_URL = reverse('checkout')


class TestCheckoutHappyPath:
    """Successful checkout scenarios."""

    def test_checkout_with_product(self, auth_client, user, product, settings_obj):
        """Basic checkout with one product item."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 2}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201
        order = response.json()
        assert order['status'] == 'pending'
        assert order['subtotal'] == product.price * 2
        assert order['total'] > 0
        assert len(order['items']) == 1

    def test_checkout_with_multiple_items(self, auth_client, user, product, product_sushi, settings_obj):
        """Checkout with multiple different items."""
        data = {
            'items': [
                {'product_slug': product.slug, 'quantity': 1},
                {'product_slug': product_sushi.slug, 'quantity': 3},
            ],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201
        order = response.json()
        expected_subtotal = product.price * 1 + product_sushi.price * 3
        assert order['subtotal'] == expected_subtotal
        assert len(order['items']) == 2

    def test_checkout_pickup(self, auth_client, user, product, settings_obj):
        """Pickup order should include pickup discount."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 2}],
            'order_type': 'pickup',
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201, f'Pickup failed: {response.json()}'
        order = response.json()
        assert order['order_type'] == 'pickup'
        assert order['discount_amount'] > 0

    def test_checkout_with_set(self, auth_client, user, set_menu, settings_obj):
        """Checkout with a set instead of a product."""
        data = {
            'items': [{'set_slug': set_menu.slug, 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201
        order = response.json()
        assert order['subtotal'] == set_menu.price

    def test_checkout_with_address_id(self, auth_client, user, product, address, settings_obj):
        """Checkout referencing a saved address."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 2}],
            'address_id': address.pk,
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201, f'Address checkout failed: {response.json()}'
        order = response.json()
        assert address.full_address in order['delivery_address']

    def test_checkout_with_promo(self, auth_client, user, product, promo_code, settings_obj):
        """Checkout with a valid promo code."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 2}],
            'promo_code': promo_code.code,
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201
        order = response.json()
        assert order['discount_amount'] > 0

    def test_checkout_all_payment_methods(self, auth_client, user, product, settings_obj):
        """Each payment method should be accepted."""
        for method in ['cash', 'card_delivery', 'card_online']:
            data = {
                'items': [{'product_slug': product.slug, 'quantity': 2}],
                'payment_method': method,
            }
            response = auth_client.post(CHECKOUT_URL, data, format='json')
            assert response.status_code == 201, f'Failed for {method}: {response.json()}'


class TestCheckoutErrors:
    """Checkout error conditions."""

    def test_unauthenticated_returns_401(self, api_client, product):
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 1}],
        }
        response = api_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 401

    def test_empty_cart(self, auth_client):
        data = {'items': []}
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_unavailable_product(self, auth_client, unavailable_product):
        data = {
            'items': [{'product_slug': unavailable_product.slug, 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_unavailable_set(self, auth_client, unavailable_set):
        data = {
            'items': [{'set_slug': unavailable_set.slug, 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_below_minimum_order(self, auth_client, product, settings_obj):
        """Order below minimum amount should be rejected."""
        product.price = 100
        product.save()
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_nonexistent_product_slug(self, auth_client):
        data = {
            'items': [{'product_slug': 'nonexistent', 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_nonexistent_address_id(self, auth_client, product):
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 1}],
            'address_id': 99999,
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 400


class TestCheckoutDataIntegrity:
    """Verify data integrity: prices are taken from DB, not from client."""

    def test_price_taken_from_db_not_client(self, auth_client, user, product, settings_obj):
        """Client cannot set prices — they're read from the database."""
        product.price = 2000
        product.save()
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 1}],
        }
        response = auth_client.post(CHECKOUT_URL, data, format='json')
        assert response.status_code == 201, f'Data integrity test failed: {response.json()}'
        order_data = response.json()
        # unit_price should match product.price from DB
        item = order_data['items'][0]
        assert item['unit_price'] == 2000
        # total should be 2000 (no discounts, free delivery >= 1500)
        assert order_data['total'] == 2000
