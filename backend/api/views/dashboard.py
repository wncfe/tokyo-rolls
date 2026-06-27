"""
Dashboard Admin Views — для дашборда кассира/менеджера.

Все эндпоинты требуют is_staff=True (или is_superuser).
Содержит:
- Список заказов, смена статуса, отмена
- Статистика (активные заказы, выручка и т.д.)
- CRUD для продуктов и сетов
- Логи операций
"""

import logging
from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import (
    OperationLog, Order, Product, Set, UserProfile,
)
from ..serializers import (
    AdminOrderListSerializer,
    AdminOrderCancelSerializer,
    AdminOperationLogSerializer,
    AdminProductWriteSerializer,
    AdminSetWriteSerializer,
    AdminUserProfileSerializer,
)

logger = logging.getLogger(__name__)


# ─── Permissions ───

class IsStaffUser(permissions.BasePermission):
    """Доступ только для staff-пользователей."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ─── Orders ───

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

    # Фильтр по статусу
    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    # Поиск
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(id__icontains=search) |
            Q(customer_name__icontains=search) |
            Q(customer_phone__icontains=search)
        )

    # Фильтр по дате
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

    # Ограничиваем количество (последние 100)
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

    from ..serializers import AdminOrderDetailSerializer
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

    from ..serializers import AdminOrderStatusSerializer
    serializer = AdminOrderStatusSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    new_status = serializer.validated_data['status']
    order.status = new_status
    order.save(update_fields=['status'])

    # Логируем
    role = _get_dashboard_role(request.user)
    OperationLog.objects.create(
        user=request.user,
        user_role=role,
        action=f'Заказ #{order.pk} → статус "{order.get_status_display()}"',
        type=OperationLog.LogType.ORDER,
        target_id=str(order.pk),
    )

    from ..serializers import AdminOrderDetailSerializer
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

    # Логируем
    role = _get_dashboard_role(request.user)
    OperationLog.objects.create(
        user=request.user,
        user_role=role,
        action=f'Заказ #{order.pk} отменён. Причина: {order.cancel_reason}',
        type=OperationLog.LogType.ORDER,
        target_id=str(order.pk),
    )

    from ..serializers import AdminOrderDetailSerializer
    return Response(AdminOrderDetailSerializer(order).data)


def _get_dashboard_role(user: User) -> str:
    """Определить роль пользователя в дашборде."""
    if user.is_superuser:
        return OperationLog.Role.MANAGER
    try:
        return user.profile.role  # type: ignore[union-attr]
    except (AttributeError, UserProfile.DoesNotExist):
        return OperationLog.Role.SYSTEM


# ─── Stats ───

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_dashboard_stats(request):
    """Статистика для главной дашборда."""
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    all_orders = Order.objects.all()
    today_orders = all_orders.filter(created_at__gte=today_start)

    # Активные заказы (не completed и не cancelled)
    active_orders_count = all_orders.exclude(
        status__in=[Order.Status.COMPLETED, Order.Status.CANCELLED]
    ).count()

    # Выручка сегодня (выполненные заказы)
    total_revenue_today = (
        today_orders
        .filter(status=Order.Status.COMPLETED)
        .aggregate(total=Sum('total'))['total'] or 0
    )

    # Количество новых заказов сегодня
    new_orders_count = today_orders.filter(status=Order.Status.PENDING).count()

    # В готовке
    preparing_count = all_orders.filter(status=Order.Status.PREPARING).count()

    # В доставке
    delivering_count = all_orders.filter(status=Order.Status.DELIVERING).count()

    # Курьеры — пока заглушка, потом можно вынести в отдельную модель
    active_drivers_count = 3

    # Среднее время готовки — из настроек или расчётное
    from ..models import RestaurantSettings
    settings = RestaurantSettings.get_solo()
    avg_prep_time = (settings.delivery_time_min + settings.delivery_time_max) // 2

    return Response({
        'active_orders_count': active_orders_count,
        'avg_prep_time_minutes': avg_prep_time,
        'active_drivers_count': active_drivers_count,
        'total_revenue_today': total_revenue_today,
        'new_orders_count': new_orders_count,
        'preparing_count': preparing_count,
        'delivering_count': delivering_count,
    })


# ─── Menu CRUD ───

class AdminProductViewSet(viewsets.ModelViewSet):
    """CRUD для продуктов в дашборде."""
    queryset = Product.objects.all()
    serializer_class = AdminProductWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]
    lookup_field = 'slug'

    def perform_create(self, serializer):
        instance = serializer.save()
        _log_menu_action(self.request.user, f'Создан продукт "{instance.name}"', instance.slug)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_menu_action(self.request.user, f'Обновлён продукт "{instance.name}"', instance.slug)

    def perform_destroy(self, instance):
        _log_menu_action(self.request.user, f'Удалён продукт "{instance.name}"', instance.slug)
        instance.delete()


class AdminSetViewSet(viewsets.ModelViewSet):
    """CRUD для сетов в дашборде."""
    queryset = Set.objects.all()
    serializer_class = AdminSetWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]
    lookup_field = 'slug'

    def perform_create(self, serializer):
        instance = serializer.save()
        _log_menu_action(self.request.user, f'Создан сет "{instance.name}"', instance.slug)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_menu_action(self.request.user, f'Обновлён сет "{instance.name}"', instance.slug)

    def perform_destroy(self, instance):
        _log_menu_action(self.request.user, f'Удалён сет "{instance.name}"', instance.slug)
        instance.delete()


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_toggle_availability(request, item_type, slug):
    """Переключить is_available у продукта или сета.

    Тело: { "is_available": true }
    """
    if item_type not in ('product', 'set'):
        return Response(
            {'detail': 'item_type должен быть "product" или "set".'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    model_cls = Product if item_type == 'product' else Set
    try:
        instance = model_cls.objects.get(slug=slug)
    except model_cls.DoesNotExist:
        return Response({'detail': f'{item_type} с slug={slug} не найден.'},
                        status=status.HTTP_404_NOT_FOUND)

    is_available = request.data.get('is_available')
    if is_available is None:
        return Response({'detail': 'Укажите is_available: true/false.'},
                        status=status.HTTP_400_BAD_REQUEST)

    instance.is_available = bool(is_available)
    instance.save(update_fields=['is_available'])

    status_text = 'доступен' if instance.is_available else 'в стоп-листе'
    _log_menu_action(
        request.user,
        f'{model_cls.__name__} "{instance.name}" → {status_text}',
        instance.slug,
    )

    return Response({'slug': instance.slug, 'is_available': instance.is_available})


def _log_menu_action(user: User, action: str, target_id: str):
    """Создать запись в логе для действия с меню."""
    role = _get_dashboard_role(user)
    OperationLog.objects.create(
        user=user,
        user_role=role,
        action=action,
        type=OperationLog.LogType.MENU,
        target_id=target_id,
    )


# ─── Operation Logs ───

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_log_list(request):
    """Список логов операций (последние 200)."""
    logs = OperationLog.objects.select_related('user').all()[:200]
    serializer = AdminOperationLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_log_clear(request):
    """Очистить все логи."""
    count, _ = OperationLog.objects.all().delete()
    return Response({'deleted': count})


# ─── Profile ───

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_profile(request):
    """Профиль пользователя дашборда (чтение + редактирование роли)."""
    try:
        profile = request.user.profile  # type: ignore[union-attr]
    except (AttributeError, UserProfile.DoesNotExist):
        profile = UserProfile.objects.create(user=request.user)

    if request.method == 'GET':
        return Response(AdminUserProfileSerializer(profile).data)

    # PATCH — обновление
    role = request.data.get('role')
    if role and role in dict(UserProfile._meta.get_field('role').choices):
        profile.role = role
        profile.save(update_fields=['role'])

    return Response(AdminUserProfileSerializer(profile).data)
