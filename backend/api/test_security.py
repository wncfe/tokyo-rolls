"""Security and penetration tests.

MVP NOTE:
    These tests identify known security limitations of the current MVP.
    They document the risks rather than asserting perfect security.
    Some tests are marked as expected failures (xfail) or use warnings
    to indicate known issues that should be addressed post-MVP.
"""

import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.django_db

from api.factories import AddressFactory, OrderFactory, ProductFactory, UserFactory, UserProfileFactory
from api.models import Order

CHECKOUT_URL = reverse('checkout')
REQUEST_CODE_URL = reverse('auth-request-code')
VERIFY_CODE_URL = reverse('auth-verify-code')


# ─── IDOR ───


class TestIDOR:
    """
    Insecure Direct Object Reference tests.
    All user-scoped endpoints should filter by the authenticated user.
    """

    ADDRESSES_URL = reverse('address-list')

    def test_cannot_access_other_users_addresses_in_list(self, auth_client, user):
        """Address list should only show user's own addresses."""
        other_user = UserFactory()
        AddressFactory.create_batch(3, user=other_user)
        response = auth_client.get(self.ADDRESSES_URL)
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_cannot_access_other_users_address_detail(self, auth_client):
        """Address detail should 404 for another user's address."""
        other_user = UserFactory()
        addr = AddressFactory(user=other_user)
        url = reverse('address-detail', kwargs={'pk': addr.pk})
        response = auth_client.get(url)
        assert response.status_code == 404


# ─── Auth bypass ───


class TestAuthBypass:
    """Endpoints requiring authentication should reject unauthenticated requests."""

    CHECKOUT_URL = reverse('checkout')

    def test_checkout_without_token(self, api_client, product):
        """POST /api/checkout/ without JWT should return 401."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 1}],
        }
        response = api_client.post(self.CHECKOUT_URL, data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_address_list_without_token(self, api_client):
        """GET /api/addresses/ without JWT should return 401."""
        response = api_client.get(reverse('address-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_profile_without_token(self, api_client):
        """GET /api/auth/profile/ without JWT should return 401."""
        response = api_client.get(reverse('auth-profile'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ─── Code brute force ───


class TestCodeBruteForce:
    """
    SMS verification code brute force protection.

    KNOWN ISSUE (MVP):
        The code is hardcoded '1234' with no rate limiting.
        An attacker can try all 10000 combinations (0000-9999).
        Post-MVP: add django-ratelimit + SMS provider + exponential backoff.
    NOTE:
        Rate limiting on verify-code is now implemented, but disabled in tests
        via the DISABLE_THROTTLING environment variable (see conftest.py).    """

    def test_wrong_code_returns_error(self, api_client, phone_data):
        """Wrong code gives a generic error message (no hint of correct code)."""
        api_client.post(REQUEST_CODE_URL, phone_data, format='json')
        response = api_client.post(VERIFY_CODE_URL, {
            **phone_data,
            'code': '9999',
        }, format='json')
        assert response.status_code == 400
        # Error should not reveal what the correct code is
        error_detail = response.json().get('detail', '')
        assert '1234' not in error_detail

    def test_multiple_wrong_attempts_allowed(self, api_client, phone_data):
        """
        Rate limiting on verify-code exists but is disabled in tests
        (DISABLE_THROTTLING=True in conftest.py).
        Multiple wrong attempts are allowed under test conditions.
        """
        api_client.post(REQUEST_CODE_URL, phone_data, format='json')
        for _ in range(10):
            response = api_client.post(VERIFY_CODE_URL, {
                **phone_data,
                'code': str(1000 + _),
            }, format='json')
            # All attempts should get 400, not 429 (no rate limit)
            assert response.status_code == 400

    def test_code_has_expiry(self, api_client, phone_data):
        """
        Code expires after 5 minutes — sent_at must be checked during verification.
        """
        import time
        from datetime import timedelta
        from unittest.mock import patch
        from django.utils import timezone
        from api.models import UserProfile

        api_client.post(REQUEST_CODE_URL, phone_data, format='json')
        # Manually set code_sent_at to 10 minutes ago (beyond 5 min limit)
        profile = UserProfile.objects.get(phone='+79991111111')
        profile.code_sent_at = timezone.now() - timedelta(minutes=10)
        profile.save()

        # Code should fail — expired
        response = api_client.post(VERIFY_CODE_URL, {
            **phone_data,
            'code': '1234',
        }, format='json')
        assert response.status_code == 400
        assert 'истёк' in response.data['detail']


# ─── Registration flood ───


class TestRegistrationFlood:
    """
    Mass registration via request-code endpoint.

    KNOWN ISSUE (MVP):
        request-code creates a User + UserProfile for any phone number.
        No CAPTCHA. An attacker could flood the database.
        Post-MVP: add CAPTCHA and phone verification.

    NOTE:
        Rate limiting on request-code is now implemented, but disabled in tests
        via the DISABLE_THROTTLING environment variable (see conftest.py).
    """

    def test_no_rate_limit_on_request_code(self, api_client):
        """Multiple rapid request-code calls — succeeds because throttling is disabled in tests."""
        for i in range(5):
            response = api_client.post(REQUEST_CODE_URL, {
                'phone': f'+7 (999) {i:03d}-11-11',
            }, format='json')
            assert response.status_code == 200


# ─── Promo brute force ───


class TestPromoBruteForce:
    """
    Promo code enumeration.

    KNOWN ISSUE (MVP):
        Promo validation endpoint publicly accessible — attacker can
        enumerate valid promo codes. Post-MVP: add rate limiting
        and/or require authentication for promo validation.
    """

    PROMO_URL = reverse('promo-validate')

    def test_promo_validation_without_auth(self, api_client):
        """Promo validation requires no auth — documented."""
        response = api_client.post(self.PROMO_URL, {'code': 'TEST'}, format='json')
        assert response.status_code == 400  # Not 401

    def test_promo_error_does_not_leak_info(self, api_client, promo_code):
        """Error should not hint at valid codes."""
        response = api_client.post(self.PROMO_URL, {'code': 'TOKYO10'}, format='json')
        assert response.status_code == 200  # Real promo works

        response = api_client.post(self.PROMO_URL, {'code': 'TOKYO11'}, format='json')
        assert response.status_code == 400
        # The error should not list valid codes
        assert 'TOKYO10' not in response.json().get('detail', '')


# ─── Input validation ───


class TestInputValidation:
    """Malicious input handling."""

    CHECKOUT_URL = reverse('checkout')

    def test_negative_quantity(self, auth_client, product):
        """Negative quantity should be rejected."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': -1}],
        }
        response = auth_client.post(self.CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_zero_quantity(self, auth_client, product):
        """Zero quantity should be rejected."""
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 0}],
        }
        response = auth_client.post(self.CHECKOUT_URL, data, format='json')
        assert response.status_code == 400

    def test_extremely_large_quantity(self, auth_client, product, settings_obj):
        """Very large quantity should NOT cause issues (price stays in DB)."""
        # PositiveSmallIntegerField max = 32767, but serializer doesn't have max_value
        # Test a reasonable large number
        data = {
            'items': [{'product_slug': product.slug, 'quantity': 999}],
        }
        response = auth_client.post(self.CHECKOUT_URL, data, format='json')
        # May pass or fail based on subtotal — just check no crash
        assert response.status_code in (201, 400)

    def test_sql_injection_in_product_slug(self, auth_client):
        """SQL injection attempt in slug should be safely rejected."""
        data = {
            'items': [{'product_slug': "'; DROP TABLE api_product; --", 'quantity': 1}],
        }
        response = auth_client.post(self.CHECKOUT_URL, data, format='json')
        # Should return 400, not crash
        assert response.status_code == 400

    def test_xss_in_address(self, auth_client):
        """XSS attempt in address fields should be stored safely (escaped on output)."""
        data = {
            'full_address': '<script>alert("xss")</script>',
            'flat': '"><img src=x>',  # fits within max_length=20
        }
        response = auth_client.post(reverse('address-list'), data, format='json')
        assert response.status_code == 201
        # Data should be stored as-is (rendering layer escapes)
        assert '<script>' in response.json()['full_address']


# ─── YooKassa Payment Webhook ───


class TestPaymentWebhook:
    """
    Payment webhook HMAC signature verification.

    YooKassa sends POST with JSON body and HMAC-SHA256 signature header.
    The view validates signature when YOOKASSA_SECRET_KEY is configured.
    """

    WEBHOOK_URL = reverse('payment-webhook')

    def test_missing_signature_when_key_set(self, api_client):
        """When YOOKASSA_SECRET_KEY is set, missing Signature header → 403."""
        from django.test import override_settings

        with override_settings(DEBUG=True, YOOKASSA_SECRET_KEY='test-secret-key'):
            response = api_client.post(
                self.WEBHOOK_URL,
                {'event': 'payment.succeeded', 'object': {'id': 'test-pay-1'}},
                format='json',
            )
        assert response.status_code == 403
        assert 'Missing signature' in response.json()['detail']

    def test_invalid_signature_when_key_set(self, api_client):
        """When YOOKASSA_SECRET_KEY is set, bad Signature header → 403."""
        from django.test import override_settings

        with override_settings(DEBUG=True, YOOKASSA_SECRET_KEY='test-secret-key'):
            response = api_client.post(
                self.WEBHOOK_URL,
                {'event': 'payment.succeeded', 'object': {'id': 'test-pay-2'}},
                format='json',
                HTTP_SIGNATURE='this-is-not-a-valid-hmac',
            )
        assert response.status_code == 403
        assert 'Invalid signature' in response.json()['detail']


# ─── Order Ownership ───


class TestOrderOwnership:
    """
    Order ownership — users cannot access each other's orders.
    Both order-detail and payment-status endpoints should 404 for foreign orders.
    """

    def test_order_detail_other_user_returns_404(self, auth_client):
        """Accessing another user's order detail should 404."""
        other_user = UserFactory()
        other_order = OrderFactory(user=other_user)
        url = reverse('order-detail', kwargs={'order_id': other_order.pk})
        response = auth_client.get(url)
        assert response.status_code == 404

    def test_payment_status_other_user_returns_404(self, auth_client):
        """Accessing another user's payment status should 404."""
        other_user = UserFactory()
        other_order = OrderFactory(user=other_user, payment_id='test-pay-123')
        url = reverse('payment-status', kwargs={'order_id': other_order.pk})
        response = auth_client.get(url)
        assert response.status_code == 404


# ─── Phone Uniqueness ───


class TestPhoneUniqueConstraint:
    """UserProfile.phone must be unique at the database level."""

    def test_duplicate_phone_raises_integrity_error(self):
        """Creating two profiles with the same phone should raise IntegrityError."""
        from django.db import IntegrityError

        phone = '+79990000000'
        UserProfileFactory(phone=phone)
        with pytest.raises(IntegrityError):
            UserProfileFactory(phone=phone)


# ─── Cancel Expired Orders Command ───


class TestCancelExpiredOrdersCommand:
    """
    Management command cancel_expired_orders:
    cancels orders stuck in awaiting_payment that exceeded 10-minute timeout.
    """

    def test_cancels_expired_awaiting_payment_orders(self):
        """Old awaiting_payment orders should be cancelled by the command."""
        from io import StringIO
        from datetime import timedelta
        from django.core.management import call_command
        from django.utils import timezone

        old = timezone.now() - timedelta(minutes=15)
        order = OrderFactory(status=Order.Status.AWAITING_PAYMENT)
        # auto_now_add prevents setting created_at on create, so update it directly
        Order.objects.filter(pk=order.pk).update(created_at=old)
        order.refresh_from_db()
        assert order.created_at < timezone.now() - timedelta(minutes=10)

        out = StringIO()
        call_command('cancel_expired_orders', stdout=out)
        order.refresh_from_db()
        assert order.status == Order.Status.CANCELLED
        assert 'Cancelled' in out.getvalue()

    def test_does_not_cancel_recent_awaiting_payment_orders(self):
        """Recent awaiting_payment orders should NOT be cancelled."""
        from io import StringIO
        from django.core.management import call_command

        order = OrderFactory(status=Order.Status.AWAITING_PAYMENT)
        call_command('cancel_expired_orders', stdout=StringIO())
        order.refresh_from_db()
        assert order.status == Order.Status.AWAITING_PAYMENT

    def test_does_not_cancel_old_orders_in_other_statuses(self):
        """Old orders that are not awaiting_payment should NOT be cancelled."""
        from io import StringIO
        from datetime import timedelta
        from django.core.management import call_command
        from django.utils import timezone

        old = timezone.now() - timedelta(minutes=15)
        order = OrderFactory(status=Order.Status.PENDING)
        Order.objects.filter(pk=order.pk).update(created_at=old)
        order.refresh_from_db()
        call_command('cancel_expired_orders', stdout=StringIO())
        order.refresh_from_db()
        assert order.status == Order.Status.PENDING  # unchanged


# ─── Delivery Zones Assertion ───


class TestDeliveryZonesAssert:
    """
    _load_zones() asserts that no GeoJSON polygon has holes (inner rings).
    The delivery_zones.py code currently only handles single-ring polygons.
    """

    def test_polygon_with_holes_raises_assertion_error(self):
        """GeoJSON with inner rings should trigger AssertionError about rings."""
        from unittest.mock import mock_open, patch
        import json
        from api.services.delivery_zones import _load_zones

        bad_geojson = {
            'type': 'FeatureCollection',
            'features': [{
                'type': 'Feature',
                'properties': {'Name': 'test_zone_with_holes'},
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [
                        [(30, 10), (40, 40), (20, 40), (10, 20), (30, 10)],  # outer ring
                        [(20, 20), (30, 20), (30, 30), (20, 30), (20, 20)],  # inner ring (hole)
                    ],
                },
            }],
        }

        with patch('api.services.delivery_zones._zones_cache', None):
            with patch('builtins.open', mock_open(read_data=json.dumps(bad_geojson))):
                with pytest.raises(AssertionError) as excinfo:
                    _load_zones()
        assert 'rings' in str(excinfo.value)
        assert 'test_zone_with_holes' in str(excinfo.value)
