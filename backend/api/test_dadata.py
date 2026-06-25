"""Tests for the DaData suggest proxy endpoint.

The endpoint proxies address suggestions to DaData API.
Without DADATA_API_KEY, it returns an empty list gracefully.
"""

import pytest
from django.urls import reverse

DADATA_URL = reverse('dadata-suggest')


class TestDaDataSuggest:
    """POST /api/dadata/suggest/"""

    def test_short_query_returns_empty(self, api_client):
        """Query with < 2 characters should return empty list."""
        response = api_client.post(DADATA_URL, {'query': 'a'}, format='json')
        assert response.status_code == 200
        assert response.json() == []

    def test_empty_query_returns_empty(self, api_client):
        response = api_client.post(DADATA_URL, {'query': ''}, format='json')
        assert response.status_code == 200
        assert response.json() == []

    def test_no_api_key_returns_empty(self, api_client):
        """Without DADATA_API_KEY env var, should return empty list gracefully."""
        response = api_client.post(DADATA_URL, {'query': 'Пермь Ленина'}, format='json')
        assert response.status_code == 200
        assert response.json() == []

    def test_no_auth_required(self, api_client):
        """DaData endpoint should work without authentication."""
        response = api_client.post(DADATA_URL, {'query': ''}, format='json')
        assert response.status_code == 200  # Not 401/403

    def test_missing_query_key(self, api_client):
        """Missing 'query' key should be treated as empty query."""
        response = api_client.post(DADATA_URL, {}, format='json')
        assert response.status_code == 200
        assert response.json() == []
