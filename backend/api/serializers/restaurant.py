"""Сериализаторы настроек ресторана."""

from rest_framework import serializers
from ..models import RestaurantSettings


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    is_open = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantSettings
        fields = [
            'opening_hour', 'closing_hour', 'min_order_amount',
            'free_delivery_from', 'suburban_delivery_fee',
            'delivery_time_min', 'delivery_time_max', 'restaurant_address',
            'pickup_discount_percent',
            'is_open',
        ]

    def get_is_open(self, obj):
        from django.utils import timezone
        now = timezone.localtime()
        return obj.opening_hour <= now.hour < obj.closing_hour
