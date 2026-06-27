"""Dashboard: логи операций."""

from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ...models import OperationLog
from ...serializers import AdminOperationLogSerializer
from .orders import IsStaffUser


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
