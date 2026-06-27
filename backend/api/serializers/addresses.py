"""Сериализаторы адресов доставки."""

from rest_framework import serializers
from ..models import Address


class AddressSerializer(serializers.ModelSerializer):
    """Сохранённый адрес доставки."""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Address
        fields = [
            'id', 'user', 'full_address', 'flat', 'entrance',
            'floor', 'intercom', 'comment', 'is_default',
            'latitude', 'longitude', 'delivery_zone', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'delivery_zone']

    def validate_latitude(self, value):
        if value is not None:
            return round(value, 6)
        return value

    def validate_longitude(self, value):
        if value is not None:
            return round(value, 6)
        return value
