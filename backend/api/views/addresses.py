import logging

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Address
from ..serializers import AddressSerializer
from ..services.delivery_zones import get_delivery_zone, get_zone_rules

logger = logging.getLogger(__name__)


class AddressViewSet(viewsets.ModelViewSet):
    """CRUD сохранённых адресов текущего пользователя."""
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        self._assign_delivery_zone(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._assign_delivery_zone(instance)

    @staticmethod
    def _assign_delivery_zone(address):
        """Определить и закэшировать зону доставки по координатам."""
        if address.latitude is not None and address.longitude is not None:
            zone = get_delivery_zone(
                float(address.longitude),
                float(address.latitude),
            )
            if zone != address.delivery_zone:
                address.delivery_zone = zone
                address.save(update_fields=['delivery_zone'])


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def check_delivery_zone(request):
    """Проверить зону доставки для сохранённого адреса.

    Принимает: { address_id: int }
    Возвращает: { zone, min_order_amount, delivery_fee, is_deliverable }
    """
    address_id = request.data.get('address_id')
    if not address_id:
        return Response(
            {'detail': 'address_id обязателен.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        addr = Address.objects.get(id=address_id, user=request.user)
    except Address.DoesNotExist:
        return Response(
            {'detail': 'Адрес не найден.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    zone = addr.delivery_zone
    is_deliverable = zone is not None
    rules = get_zone_rules(zone)

    return Response({
        'zone': zone,
        'min_order_amount': rules['min_order_amount'],
        'delivery_fee': rules['delivery_fee'],
        'is_deliverable': is_deliverable,
    })
