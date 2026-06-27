"""Dashboard: статистика."""

from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ...models import Order, RestaurantSettings
from .orders import IsStaffUser


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_dashboard_stats(request):
    """Статистика для главной дашборда."""
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    all_orders = Order.objects.all()
    today_orders = all_orders.filter(created_at__gte=today_start)

    active_orders_count = all_orders.exclude(
        status__in=[Order.Status.COMPLETED, Order.Status.CANCELLED]
    ).count()

    total_revenue_today = (
        today_orders
        .filter(status=Order.Status.COMPLETED)
        .aggregate(total=Sum('total'))['total'] or 0
    )

    new_orders_count = today_orders.filter(status=Order.Status.PENDING).count()
    preparing_count = all_orders.filter(status=Order.Status.PREPARING).count()
    delivering_count = all_orders.filter(status=Order.Status.DELIVERING).count()

    active_drivers_count = 3

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
