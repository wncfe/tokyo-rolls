"""Tests for the Dashboard Admin API endpoints.

Covers: orders list, status update, cancel, stats, menu CRUD,
toggle availability, logs, and auth/role checks.
"""

import pytest
from django.urls import reverse
from rest_framework import status

pytestmark = pytest.mark.django_db

from api.factories import (
    OperationLogFactory,
    OrderFactory,
    OrderItemFactory,
    ProductFactory,
    SetFactory,
    SetItemFactory,
)
from api.models import OperationLog, Order


# ─── Helpers ───

STAFF_ORDER_LIST_URL = reverse('admin-order-list')
STAFF_STATS_URL = reverse('admin-stats')
STAFF_LOG_LIST_URL = reverse('admin-log-list')
STAFF_LOG_CLEAR_URL = reverse('admin-log-clear')
STAFF_PROFILE_URL = reverse('admin-profile')


def _order_status_url(order_id: int) -> str:
    return reverse('admin-order-status', args=[order_id])


def _order_cancel_url(order_id: int) -> str:
    return reverse('admin-order-cancel', args=[order_id])


def _order_detail_url(order_id: int) -> str:
    return reverse('admin-order-detail', args=[order_id])


def _toggle_url(item_type: str, slug: str) -> str:
    return reverse('admin-menu-toggle', args=[item_type, slug])


# ═══════════════════════════════════════════
#  Auth / Permission tests
# ═══════════════════════════════════════════


class TestAuth:
    """Ensure non-staff users are denied access."""

    def test_orders_list_requires_staff(self, api_client, user):
        """Regular user gets 403 on admin endpoints."""
        api_client.force_authenticate(user)
        resp = api_client.get(STAFF_ORDER_LIST_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_orders_list_requires_auth(self, api_client):
        """Anonymous user gets 401."""
        resp = api_client.get(STAFF_ORDER_LIST_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_staff_user_allowed(self, staff_client):
        """Staff user gets 200."""
        resp = staff_client.get(STAFF_ORDER_LIST_URL)
        assert resp.status_code == status.HTTP_200_OK


# ═══════════════════════════════════════════
#  Order management
# ═══════════════════════════════════════════


class TestOrderList:
    """GET /api/admin/orders/"""

    def test_empty_list(self, staff_client):
        resp = staff_client.get(STAFF_ORDER_LIST_URL)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_orders(self, staff_client, user):
        OrderFactory(user=user, customer_name='Тестовый', total=500)
        resp = staff_client.get(STAFF_ORDER_LIST_URL)
        data = resp.json()
        assert len(data) == 1
        assert data[0]['customer_name'] == 'Тестовый'
        assert data[0]['total'] == 500

    def test_filter_by_status(self, staff_client, user):
        OrderFactory(user=user, status=Order.Status.CONFIRMED, total=300)
        OrderFactory(user=user, status=Order.Status.PREPARING, total=400)
        resp = staff_client.get(STAFF_ORDER_LIST_URL, {'status': 'confirmed'})
        data = resp.json()
        assert len(data) == 1
        assert data[0]['status'] == 'confirmed'

    def test_search(self, staff_client, user):
        OrderFactory(user=user, customer_name='Анна Каренина', total=1000)
        OrderFactory(user=user, customer_name='Петр Первый', total=2000)
        resp = staff_client.get(STAFF_ORDER_LIST_URL, {'search': 'Анна'})
        data = resp.json()
        assert len(data) == 1
        assert data[0]['customer_name'] == 'Анна Каренина'


class TestOrderDetail:
    """GET /api/admin/orders/{id}/"""

    def test_detail_ok(self, staff_client, user, category_rolls):
        product = ProductFactory(category=category_rolls, price=300)
        order = OrderFactory(user=user, total=999)
        OrderItemFactory(order=order, product=product)
        resp = staff_client.get(_order_detail_url(order.pk))
        assert resp.status_code == 200
        data = resp.json()
        assert data['id'] == order.pk
        assert data['total'] == 999
        assert 'items' in data
        assert len(data['items']) == 1

    def test_detail_not_found(self, staff_client):
        resp = staff_client.get(_order_detail_url(99999))
        assert resp.status_code == 404


class TestOrderStatusUpdate:
    """PATCH /api/admin/orders/{id}/status/"""

    def test_update_status(self, staff_client, user):
        order = OrderFactory(user=user, status=Order.Status.PENDING)
        resp = staff_client.patch(
            _order_status_url(order.pk),
            {'status': 'confirmed'},
            format='json',
        )
        assert resp.status_code == 200
        assert resp.json()['status'] == 'confirmed'
        order.refresh_from_db()
        assert order.status == Order.Status.CONFIRMED

    def test_update_triggers_log(self, staff_client, user):
        order = OrderFactory(user=user)
        staff_client.patch(
            _order_status_url(order.pk),
            {'status': 'confirmed'},
            format='json',
        )
        log = OperationLog.objects.filter(target_id=str(order.pk)).first()
        assert log is not None
        assert log.type == OperationLog.LogType.ORDER

    def test_update_invalid_status(self, staff_client, user):
        order = OrderFactory(user=user)
        resp = staff_client.patch(
            _order_status_url(order.pk),
            {'status': 'nonexistent'},
            format='json',
        )
        assert resp.status_code == 400

    def test_update_not_found(self, staff_client):
        resp = staff_client.patch(
            _order_status_url(99999),
            {'status': 'confirmed'},
            format='json',
        )
        assert resp.status_code == 404


class TestOrderCancel:
    """POST /api/admin/orders/{id}/cancel/"""

    def test_cancel_ok(self, staff_client, user):
        order = OrderFactory(user=user, status=Order.Status.CONFIRMED)
        resp = staff_client.post(
            _order_cancel_url(order.pk),
            {'reason': 'Клиент передумал'},
            format='json',
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data['status'] == 'cancelled'
        assert data['cancel_reason'] == 'Клиент передумал'
        order.refresh_from_db()
        assert order.status == Order.Status.CANCELLED
        assert order.cancel_reason == 'Клиент передумал'

    def test_cancel_triggers_log(self, staff_client, user):
        order = OrderFactory(user=user)
        staff_client.post(
            _order_cancel_url(order.pk),
            {'reason': 'Тест'},
            format='json',
        )
        log = OperationLog.objects.filter(
            target_id=str(order.pk),
            action__contains='отменён',
        ).first()
        assert log is not None

    def test_cancel_no_reason(self, staff_client, user):
        order = OrderFactory(user=user)
        resp = staff_client.post(
            _order_cancel_url(order.pk),
            {'reason': ''},
            format='json',
        )
        # Пустая строка не проходит min_length=1
        assert resp.status_code == 400

    def test_cancel_missing_reason(self, staff_client, user):
        order = OrderFactory(user=user)
        resp = staff_client.post(
            _order_cancel_url(order.pk),
            {},
            format='json',
        )
        assert resp.status_code == 400


# ═══════════════════════════════════════════
#  Stats
# ═══════════════════════════════════════════


class TestStats:
    """GET /api/admin/stats/"""

    def test_stats_fields(self, staff_client):
        resp = staff_client.get(STAFF_STATS_URL)
        assert resp.status_code == 200
        data = resp.json()
        expected_keys = {
            'active_orders_count', 'avg_prep_time_minutes',
            'active_drivers_count', 'total_revenue_today',
            'new_orders_count', 'preparing_count', 'delivering_count',
        }
        assert expected_keys.issubset(data.keys())


# ═══════════════════════════════════════════
#  Menu CRUD
# ═══════════════════════════════════════════


class TestProductCRUD:
    """AdminProductViewSet (/api/admin/products/)"""

    def test_list_products(self, staff_client, category_rolls):
        ProductFactory(category=category_rolls)
        resp = staff_client.get(reverse('admin-product-list'))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_create_product(self, staff_client, category_rolls):
        data = {
            'slug': 'test-roll',
            'name': 'Тестовый ролл',
            'description': 'Описание',
            'price': 500,
            'weight': 200,
            'pieces_amount': 8,
            'category': category_rolls.pk,
        }
        resp = staff_client.post(reverse('admin-product-list'), data, format='json')
        assert resp.status_code == 201, resp.json()
        assert resp.json()['slug'] == 'test-roll'


class TestSetCRUD:
    """AdminSetViewSet (/api/admin/sets/)"""

    def test_list_sets(self, staff_client):
        SetFactory()
        resp = staff_client.get(reverse('admin-set-list'))
        assert resp.status_code == 200

    def test_create_set(self, staff_client):
        data = {
            'slug': 'test-set',
            'name': 'Тестовый сет',
            'description': 'Описание сета',
            'price': 1500,
            'weight': 1000,
            'pieces_amount': 20,
            'is_available': True,
        }
        resp = staff_client.post(reverse('admin-set-list'), data, format='json')
        assert resp.status_code == 201, resp.json()
        assert resp.json()['slug'] == 'test-set'


class TestToggleAvailability:
    """PATCH /api/admin/menu/{type}/{slug}/toggle/"""

    def test_toggle_product(self, staff_client, category_rolls):
        product = ProductFactory(category=category_rolls, is_available=True)
        resp = staff_client.patch(
            _toggle_url('product', product.slug),
            {'is_available': False},
            format='json',
        )
        assert resp.status_code == 200
        assert resp.json()['is_available'] is False
        product.refresh_from_db()
        assert product.is_available is False

    def test_toggle_set(self, staff_client):
        menu_set = SetFactory(is_available=False)
        resp = staff_client.patch(
            _toggle_url('set', menu_set.slug),
            {'is_available': True},
            format='json',
        )
        assert resp.status_code == 200
        assert resp.json()['is_available'] is True

    def test_toggle_invalid_type(self, staff_client):
        resp = staff_client.patch(
            _toggle_url('invalid', 'whatever'),
            {'is_available': True},
            format='json',
        )
        assert resp.status_code == 400

    def test_toggle_not_found(self, staff_client):
        resp = staff_client.patch(
            _toggle_url('product', 'non-existent-slug'),
            {'is_available': False},
            format='json',
        )
        assert resp.status_code == 404


# ═══════════════════════════════════════════
#  Operation Logs
# ═══════════════════════════════════════════


class TestLogs:
    """GET + DELETE /api/admin/logs/"""

    def test_list_logs(self, staff_client):
        OperationLogFactory(action='Тест лога')
        resp = staff_client.get(STAFF_LOG_LIST_URL)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_clear_logs(self, staff_client):
        OperationLogFactory(action='Будет удалён')
        resp = staff_client.delete(STAFF_LOG_CLEAR_URL)
        assert resp.status_code == 200
        assert resp.json()['deleted'] >= 1
        assert OperationLog.objects.count() == 0


# ═══════════════════════════════════════════
#  Profile
# ═══════════════════════════════════════════


class TestProfile:
    """GET /api/admin/profile/"""

    def test_profile_returns_role(self, staff_client, staff_user):
        resp = staff_client.get(STAFF_PROFILE_URL)
        assert resp.status_code == 200
        data = resp.json()
        assert 'role' in data
