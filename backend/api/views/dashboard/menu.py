"""Dashboard: управление меню (продукты и сеты)."""

from django.contrib.auth.models import User
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ...models import OperationLog, Product, Set
from ...serializers import AdminProductWriteSerializer, AdminSetWriteSerializer
from .orders import IsStaffUser, _get_dashboard_role


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
