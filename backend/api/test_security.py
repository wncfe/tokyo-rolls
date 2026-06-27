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

from api.factories import AddressFactory, ProductFactory, UserFactory, UserProfileFactory

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
    """

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
        Documented limitation: no rate limiting on verify-code.
        Multiple wrong attempts are currently allowed.
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
        No CAPTCHA, no rate limiting. An attacker could flood the database.
        Post-MVP: add CAPTCHA, rate limiting, and phone verification.
    """

    def test_no_rate_limit_on_request_code(self, api_client):
        """Multiple rapid request-code calls should all succeed."""
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
