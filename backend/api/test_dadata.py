"""Tests for the DaData suggest proxy endpoint.

The endpoint proxies address suggestions to DaData API.
Without DADATA_API_KEY, it returns an empty list gracefully.
"""

import os
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

DADATA_URL = reverse('dadata-suggest')

# Test API key — set so the view proceeds to call DaData
FAKE_KEY = 'test-key-123'


def _mock_dadata_response(suggestions: list[dict]) -> dict:
    """Build a mock DaData API response body."""
    return {'suggestions': suggestions}


# ─── Basic behaviour (no API key) ───


class TestDaDataSuggestBasic:
    """POST /api/dadata/suggest/ — without API key."""

    def test_short_query_returns_empty(self, api_client):
        """Query with < 2 characters should return empty list."""
        response = api_client.post(DADATA_URL, {'query': 'a'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_empty_query_returns_empty(self, api_client):
        response = api_client.post(DADATA_URL, {'query': ''}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_no_api_key_returns_empty(self, api_client):
        """Without DADATA_API_KEY env var, should return empty list gracefully."""
        response = api_client.post(DADATA_URL, {'query': 'Пермь Ленина'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_no_auth_required(self, api_client):
        """DaData endpoint should work without authentication."""
        response = api_client.post(DADATA_URL, {'query': ''}, format='json')
        assert response.status_code == status.HTTP_200_OK  # Not 401/403

    def test_missing_query_key(self, api_client):
        """Missing 'query' key should be treated as empty query."""
        response = api_client.post(DADATA_URL, {}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []


# ─── qc_geo filtering ───


@patch.dict(os.environ, {'DADATA_API_KEY': FAKE_KEY}, clear=False)
class TestDaDataQcGeoFilter:
    """Suggestions with low-quality coordinates should be filtered out."""

    QC_FIXTURES = [
        # (qc_geo, label, should_pass)
        ('0', 'exact house', True),
        ('1', 'nearest house', True),
        ('2', 'street level', True),
        ('3', 'settlement level', True),
        ('4', 'city level', False),
        ('5', 'undefined', False),
        ('', 'empty string', True),
        (None, 'null', True),
    ]

    def _make_suggestion(self, qc_geo, house='1') -> dict:
        data = {'geo_lat': '58.0', 'geo_lon': '56.0', 'house': house}
        if qc_geo is not None:
            data['qc_geo'] = qc_geo
        return {
            'value': 'г Пермь, ул Ленина, д 1',
            'unrestricted_value': '614000, г Пермь, ул Ленина, д 1',
            'data': data,
        }

    @pytest.mark.parametrize('qc_geo,label,should_pass', QC_FIXTURES)
    @patch('api.views.misc.requests.post')
    def test_qc_geo_filtering(self, mock_post, api_client, qc_geo, label, should_pass):
        """Suggestions with qc_geo={qc_geo} ({label}) should {'pass' if should_pass else 'be filtered'}."""
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = _mock_dadata_response(
            [self._make_suggestion(qc_geo)],
        )

        response = api_client.post(DADATA_URL, {'query': 'Пермь Ленина'}, format='json')
        assert response.status_code == status.HTTP_200_OK

        if should_pass:
            assert len(response.json()) == 1, f'qc_geo={qc_geo} should PASS'
        else:
            assert len(response.json()) == 0, f'qc_geo={qc_geo} should be FILTERED'

    @patch('api.views.misc.requests.post')
    def test_mixed_qc_geo(self, mock_post, api_client):
        """Only good-quality suggestions survive when mixed."""
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = _mock_dadata_response([
            self._make_suggestion('0'),  # exact → pass
            self._make_suggestion('2'),  # street → pass (qc_geo=2 now allowed)
            self._make_suggestion('1'),  # nearest → pass
            self._make_suggestion('4'),  # city → filtered
            self._make_suggestion('5'),  # undefined → filtered
        ])

        response = api_client.post(DADATA_URL, {'query': 'Пермь Ленина'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 3

    @patch('api.views.misc.requests.post')
    def test_to_bound_house_in_request_body(self, mock_post, api_client):
        """Verify to_bound = house is sent to DaData (from_bound is not set)."""
        mock_post.return_value.status_code = status.HTTP_200_OK
        mock_post.return_value.json.return_value = _mock_dadata_response([])

        api_client.post(DADATA_URL, {'query': 'Пермь Ленина'}, format='json')

        call_kwargs = mock_post.call_args[1]
        body = call_kwargs.get('json', {})
        assert 'from_bound' not in body, 'from_bound should NOT be sent'
        assert body.get('to_bound') == {'value': 'house'}, 'to_bound must be house'
