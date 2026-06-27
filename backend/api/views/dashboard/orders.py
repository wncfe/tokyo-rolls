"""Dashboard: управление заказами."""

import logging
from datetime import datetime

from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ...models import OperationLog, Order, UserProfile
from ...serializers import (
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminOrderStatusSerializer,
    AdminOrderCancelSerializer,
)

logger = logging.getLogger(__name__)


class IsStaffUser(permissions.BasePermission):
    """Доступ только для staff-пользователей."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _get_dashboard_role(user: User) -> str:
    """Определить роль пользователя в дашборде."""
    if user.is_superuser:
        return OperationLog.Role.MANAGER
    try:
        return user.profile.role
    except (AttributeError, UserProfile.DoesNotExist):
        return OperationLog.Role.SYSTEM


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_order_list(request):
    """Список всех заказов для дашборда с фильтрацией.

    Query params:
        status — фильтр по статусу (опционально)
        search — поиск по номеру, имени, телефону (опционально)
        date_from / date_to — фильтр по дате (опционально, ISO)
    """
    queryset = Order.objects.select_related('user').prefetch_related('items').all()

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(id__icontains=search) |
            Q(customer_name__icontains=search) |
            Q(customer_phone__icontains=search)
        )

    date_from = request.query_params.get('date_from')
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            queryset = queryset.filter(created_at__gte=dt)
        except (ValueError, TypeError):
            pass

    date_to = request.query_params.get('date_to')
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            queryset = queryset.filter(created_at__lte=dt)
        except (ValueError, TypeError):
            pass

    queryset = queryset[:100]

    serializer = AdminOrderListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_order_detail(request, order_id):
    """Полная информация о заказе для дашборда."""
    try:
        order = Order.objects.prefetch_related('items').get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Заказ не найден.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(AdminOrderDetailSerializer(order).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_order_update_status(request, order_id):
    """Обновить статус заказа.

    Тело: { "status": "confirmed" }
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Заказ не найден.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdminOrderStatusSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    new_status = serializer.validated_data['status']
    order.status = new_status
    order.save(update_fields=['status'])

    role = _get_dashboard_role(request.user)
    OperationLog.objects.create(
        user=request.user,
        user_role=role,
        action=f'Заказ #{order.pk} → статус "{order.get_status_display()}"',
        type=OperationLog.LogType.ORDER,
        target_id=str(order.pk),
    )

    return Response(AdminOrderDetailSerializer(order).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_order_cancel(request, order_id):
    """Отменить заказ с указанием причины.

    Тело: { "reason": "Клиент передумал" }
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Заказ не найден.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdminOrderCancelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    order.status = Order.Status.CANCELLED
    order.cancel_reason = serializer.validated_data['reason']
    order.save(update_fields=['status', 'cancel_reason'])

    role = _get_dashboard_role(request.user)
    OperationLog.objects.create(
        user=request.user,
        user_role=role,
        action=f'Заказ #{order.pk} отменён. Причина: {order.cancel_reason}',
        type=OperationLog.LogType.ORDER,
        target_id=str(order.pk),
    )

    return Response(AdminOrderDetailSerializer(order).data)
