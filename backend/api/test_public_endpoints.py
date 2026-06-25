"""Tests for public (no auth required) API endpoints."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

from api.factories import (
    CategoryFactory,
    ProductFactory,
    PromoCodeFactory,
    RestaurantSettingsFactory,
    SetFactory,
    SetItemFactory,
    SubCategoryFactory,
)
from api.models import RestaurantSettings


# ─── Health ───


class TestHealthEndpoint:
    def test_health_returns_ok(self, api_client):
        url = reverse('health')
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json() == {'status': 'ok'}


# ─── Categories ───


class TestCategoriesEndpoint:
    def test_list_categories(self, api_client, category_rolls, category_sushi):
        url = reverse('category-list')
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [c['slug'] for c in response.json()]
        assert 'rolls' in slugs
        assert 'sushi' in slugs

    def test_inactive_categories_excluded(self, api_client, category_rolls):
        """Inactive categories should not appear in list."""
        CategoryFactory(slug='inactive-cat', is_active=False)
        url = reverse('category-list')
        response = api_client.get(url)
        slugs = [c['slug'] for c in response.json()]
        assert 'inactive-cat' not in slugs

    def test_retrieve_category_by_slug(self, api_client, category_rolls):
        url = reverse('category-detail', kwargs={'slug': category_rolls.slug})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json()['slug'] == 'rolls'

    def test_retrieve_nonexistent_category(self, api_client):
        url = reverse('category-detail', kwargs={'slug': 'nonexistent'})
        response = api_client.get(url)
        assert response.status_code == 404


# ─── Products ───


class TestProductsEndpoint:
    def test_list_products(self, api_client, product, product_sushi):
        url = reverse('product-list')
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [p['slug'] for p in response.json()]
        assert product.slug in slugs
        assert product_sushi.slug in slugs

    def test_unavailable_products_excluded(self, api_client, product, unavailable_product):
        """Only is_available=True products should appear."""
        url = reverse('product-list')
        response = api_client.get(url)
        slugs = [p['slug'] for p in response.json()]
        assert product.slug in slugs
        assert unavailable_product.slug not in slugs

    def test_filter_by_category(self, api_client, product, product_sushi):
        url = reverse('product-list') + f'?category={product_sushi.category.slug}'
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [p['slug'] for p in response.json()]
        assert product_sushi.slug in slugs
        assert product.slug not in slugs  # product is rolls, not sushi

    def test_filter_by_subcategory(self, api_client, product, subcategory):
        url = reverse('product-list') + f'?subcategory={subcategory.slug}'
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [p['slug'] for p in response.json()]
        assert product.slug in slugs

    def test_retrieve_product_by_slug(self, api_client, product):
        url = reverse('product-detail', kwargs={'slug': product.slug})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json()['slug'] == product.slug

    def test_retrieve_nonexistent_product(self, api_client):
        url = reverse('product-detail', kwargs={'slug': 'nonexistent'})
        response = api_client.get(url)
        assert response.status_code == 404


# ─── Sets ───


class TestSetsEndpoint:
    def test_list_sets(self, api_client, set_menu):
        url = reverse('set-list')
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [s['slug'] for s in response.json()]
        assert set_menu.slug in slugs

    def test_unavailable_sets_excluded(self, api_client, set_menu, unavailable_set):
        url = reverse('set-list')
        response = api_client.get(url)
        slugs = [s['slug'] for s in response.json()]
        assert set_menu.slug in slugs
        assert unavailable_set.slug not in slugs

    def test_retrieve_set_by_slug(self, api_client, set_menu):
        url = reverse('set-detail', kwargs={'slug': set_menu.slug})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json()['slug'] == set_menu.slug

    def test_empty_sets_list(self, api_client):
        """When no sets exist, return an empty list."""
        url = reverse('set-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json() == []


# ─── Menu ───


class TestMenuEndpoint:
    """GET /api/menu/ — combined menu endpoint."""

    def test_menu_returns_sets_first(self, api_client, category_sets, set_menu):
        """Sets should be the first block in menu data."""
        url = reverse('menu')
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]['slug'] == 'sets'

    def test_menu_includes_all_categories(self, api_client, category_rolls, category_sushi):
        url = reverse('menu')
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [block['slug'] for block in response.json()]
        assert 'rolls' in slugs
        assert 'sushi' in slugs

    def test_menu_without_sets(self, api_client, category_rolls):
        """Menu without sets should not have a 'sets' block."""
        url = reverse('menu')
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [block['slug'] for block in response.json()]
        assert 'sets' not in slugs

    def test_empty_menu(self, api_client):
        """When no active categories exist, menu should be mostly empty."""
        url = reverse('menu')
        response = api_client.get(url)
        assert response.status_code == 200


# ─── Settings ───


class TestSettingsEndpoint:
    def test_settings_returns_defaults(self, api_client, settings_obj):
        url = reverse('settings')
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert data['opening_hour'] == 11
        assert data['closing_hour'] == 23
        assert data['min_order_amount'] == 700
        assert data['free_delivery_from'] == 1500
        assert data['is_open'] in (True, False)  # depends on time
        assert 'pickup_discount_percent' in data

    def test_settings_singleton(self, api_client):
        """If no settings exist, they should be auto-created."""
        RestaurantSettings.objects.all().delete()
        url = reverse('settings')
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.json()['opening_hour'] == 11


# ─── Promo Validate ───


class TestPromoValidateEndpoint:
    def test_valid_promo(self, api_client, promo_code):
        url = reverse('promo-validate')
        response = api_client.post(url, {'code': promo_code.code}, format='json')
        assert response.status_code == 200
        data = response.json()
        assert data['code'] == promo_code.code
        assert data['discount_percent'] == promo_code.discount_percent

    def test_invalid_promo(self, api_client):
        url = reverse('promo-validate')
        response = api_client.post(url, {'code': 'INVALID'}, format='json')
        assert response.status_code == 400
        data = response.json()
        # DRF serializer validation error returns under the 'code' key
        assert 'code' in data or 'detail' in data

    def test_expired_promo(self, api_client, promo_code_expired):
        url = reverse('promo-validate')
        response = api_client.post(url, {'code': promo_code_expired.code}, format='json')
        assert response.status_code == 400
