"""Tests for address CRUD endpoints.

All address endpoints require JWT authentication.
"""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

from api.factories import AddressFactory, UserFactory, UserProfileFactory
from api.models import Address


# ─── Helpers ───


ADDRESSES_URL = reverse('address-list')


def _detail_url(pk: int) -> str:
    return reverse('address-detail', kwargs={'pk': pk})


# ─── List ───


class TestListAddresses:
    def test_list_own_addresses(self, auth_client, user, address, second_address):
        """User should see only their own addresses."""
        response = auth_client.get(ADDRESSES_URL)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(addr['full_address'] in [address.full_address, second_address.full_address]
                   for addr in data)

    def test_other_users_addresses_invisible(self, auth_client):
        """User should NOT see other users' addresses (IDOR protection)."""
        other_user = UserFactory()
        AddressFactory(user=other_user, full_address='г Пермь, ул Скрытая, д 1')
        response = auth_client.get(ADDRESSES_URL)
        assert response.status_code == 200
        assert len(response.json()) == 0  # our user has no addresses

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(ADDRESSES_URL)
        assert response.status_code == 401


# ─── Create ───


class TestCreateAddress:
    def test_create_address(self, auth_client):
        """Create a new address successfully."""
        data = {
            'full_address': 'г Пермь, ул Новая, д 10',
            'flat': '5',
            'entrance': '2',
        }
        response = auth_client.post(ADDRESSES_URL, data, format='json')
        assert response.status_code == 201
        assert response.json()['full_address'] == data['full_address']

    def test_first_address_auto_default(self, auth_client):
        """First address should auto-set is_default=True."""
        data = {'full_address': 'г Пермь, ул Первая, д 1'}
        response = auth_client.post(ADDRESSES_URL, data, format='json')
        assert response.status_code == 201
        assert response.json()['is_default'] is True

    def test_create_unauthenticated(self, api_client):
        response = api_client.post(ADDRESSES_URL, {'full_address': 'test'}, format='json')
        assert response.status_code == 401


# ─── Update ───


class TestUpdateAddress:
    def test_update_address(self, auth_client, address):
        url = _detail_url(address.pk)
        response = auth_client.patch(url, {'flat': '42'}, format='json')
        assert response.status_code == 200
        address.refresh_from_db()
        assert address.flat == '42'

    def test_cannot_update_other_users_address(self, auth_client):
        """IDOR: Trying to update another user's address should 404."""
        other_user = UserFactory()
        other_addr = AddressFactory(user=other_user)
        url = _detail_url(other_addr.pk)
        response = auth_client.patch(url, {'flat': '99'}, format='json')
        assert response.status_code == 404


# ─── Delete ───


class TestDeleteAddress:
    def test_delete_address(self, auth_client, address):
        url = _detail_url(address.pk)
        response = auth_client.delete(url)
        assert response.status_code == 204
        assert not Address.objects.filter(pk=address.pk).exists()

    def test_cannot_delete_other_users_address(self, auth_client):
        """IDOR: Trying to delete another user's address should 404."""
        other_user = UserFactory()
        other_addr = AddressFactory(user=other_user)
        url = _detail_url(other_addr.pk)
        response = auth_client.delete(url)
        assert response.status_code == 404
        assert Address.objects.filter(pk=other_addr.pk).exists()
