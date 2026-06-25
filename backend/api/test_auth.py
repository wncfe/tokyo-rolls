"""Tests for passwordless authentication endpoints.

MVP NOTE:
    SMS verification code is currently hardcoded to '1234'.
    These tests are written to work with this stub — when a real SMS provider
    is integrated, the test expectations will need to change.
"""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

from api.factories import UserFactory, UserProfileFactory


# ─── Request Code ───


class TestRequestCode:
    """POST /api/auth/request-code/"""

    REQUEST_URL = reverse('auth-request-code')

    def test_new_user_created(self, api_client, phone_data):
        """A new phone number should create User + UserProfile."""
        response = api_client.post(self.REQUEST_URL, phone_data, format='json')
        assert response.status_code == 200
        assert response.json()['success'] is True

        from django.contrib.auth.models import User
        from api.models import UserProfile
        assert User.objects.filter(username='+79991111111').exists()
        profile = UserProfile.objects.get(phone='+79991111111')
        assert profile.verification_code == '1234'
        assert profile.code_sent_at is not None

    def test_existing_user_returns_ok(self, api_client, phone_data, user_with_profile):
        """An existing user should get a new code without duplication."""
        response = api_client.post(self.REQUEST_URL, phone_data, format='json')
        assert response.status_code == 200
        from api.models import UserProfile
        # Only one profile with this phone
        assert UserProfile.objects.filter(phone='+79991111111').count() == 1

    def test_invalid_phone_format(self, api_client):
        """Invalid phone numbers should return 400."""
        response = api_client.post(self.REQUEST_URL, {'phone': 'invalid'}, format='json')
        assert response.status_code == 400

    def test_phone_normalization(self, api_client):
        """Phone starting with 8 should be normalized to +7."""
        response = api_client.post(self.REQUEST_URL, {
            'phone': '8 (999) 111-11-11',
        }, format='json')
        assert response.status_code == 200

        from api.models import UserProfile
        profile = UserProfile.objects.filter(phone='+79991111111').first()
        assert profile is not None


# ─── Verify Code ───


class TestVerifyCode:
    """POST /api/auth/verify-code/"""

    VERIFY_URL = reverse('auth-verify-code')

    def test_valid_code_returns_tokens(self, api_client, code_data):
        """With correct code, should return JWT tokens and user info."""
        # First request code
        api_client.post(reverse('auth-request-code'), code_data, format='json')
        # Then verify
        response = api_client.post(self.VERIFY_URL, code_data, format='json')
        assert response.status_code == 200
        data = response.json()
        assert 'access' in data
        assert 'refresh' in data
        assert 'user' in data
        assert data['user']['phone'] == '+79991111111'

    def test_wrong_code_returns_400(self, api_client, phone_data):
        """Wrong code should return 400."""
        api_client.post(reverse('auth-request-code'), phone_data, format='json')
        response = api_client.post(self.VERIFY_URL, {
            **phone_data,
            'code': '0000',
        }, format='json')
        assert response.status_code == 400
        assert 'detail' in response.json()

    def test_code_cleared_after_verify(self, api_client, code_data):
        """Verification code should be cleared after successful verify."""
        api_client.post(reverse('auth-request-code'), code_data, format='json')
        api_client.post(self.VERIFY_URL, code_data, format='json')

        from api.models import UserProfile
        profile = UserProfile.objects.get(phone='+79991111111')
        assert profile.verification_code == ''

    def test_no_request_before_verify(self, api_client, code_data):
        """Verifying without prior request-code should fail."""
        response = api_client.post(self.VERIFY_URL, code_data, format='json')
        assert response.status_code == 400

    def test_code_cannot_be_reused(self, api_client, code_data):
        """Same code should not work after it's been consumed."""
        api_client.post(reverse('auth-request-code'), code_data, format='json')
        # First verify works
        api_client.post(self.VERIFY_URL, code_data, format='json')
        # Second verify should fail (code cleared)
        response = api_client.post(self.VERIFY_URL, code_data, format='json')
        assert response.status_code == 400


# ─── Profile ───


class TestProfileEndpoint:
    """GET/PATCH /api/auth/profile/"""

    PROFILE_URL = reverse('auth-profile')

    def test_unauthenticated_returns_401(self, api_client):
        """Without JWT token, should return 401."""
        response = api_client.get(self.PROFILE_URL)
        assert response.status_code == 401

    def test_get_profile(self, auth_client, user_with_profile):
        """Authenticated user should get their profile."""
        response = auth_client.get(self.PROFILE_URL)
        assert response.status_code == 200
        data = response.json()
        assert data['phone'] == user_with_profile.phone
        assert data['id'] == user_with_profile.id

    def test_patch_phone(self, auth_client):
        """User should be able to update their phone."""
        response = auth_client.patch(self.PROFILE_URL, {'phone': '+79990000000'}, format='json')
        assert response.status_code == 200
        assert response.json()['phone'] == '+79990000000'

    def test_profile_auto_created(self, auth_client, user):
        """If user has no profile, get_or_create should create one."""
        response = auth_client.get(self.PROFILE_URL)
        assert response.status_code == 200
        from api.models import UserProfile
        assert UserProfile.objects.filter(user=user).exists()
