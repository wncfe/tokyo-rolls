"""Сериализаторы дашборда: админ-заказы, статистика, меню, логи, профиль."""

from rest_framework import serializers
from ..models import (
    OperationLog, Order, Product, Set, UserProfile,
)
from .orders import OrderItemReadSerializer


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка заказов в дашборде."""
    items_count = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'customer_name', 'customer_phone',
            'delivery_address', 'order_type', 'payment_method', 'payment_method_display',
            'subtotal', 'discount_amount', 'delivery_fee', 'total',
            'cancel_reason', 'created_at', 'items_count',
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_method_display(self, obj):
        return obj.get_payment_method_display()


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """Полный сериализатор заказа для дашборда."""
    items = OrderItemReadSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'customer_name', 'customer_phone',
            'delivery_address', 'comment', 'order_type', 'payment_method',
            'payment_method_display', 'subtotal', 'discount_amount', 'delivery_fee',
            'total', 'cancel_reason', 'created_at', 'items',
        ]

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_method_display(self, obj):
        return obj.get_payment_method_display()


class AdminOrderStatusSerializer(serializers.Serializer):
    """Смена статуса заказа."""
    status = serializers.ChoiceField(choices=Order.Status.choices)


class AdminOrderCancelSerializer(serializers.Serializer):
    """Отмена заказа с причиной."""
    reason = serializers.CharField(max_length=500, min_length=1)


class AdminDashboardStatsSerializer(serializers.Serializer):
    """Статистика для дашборда."""
    active_orders_count = serializers.IntegerField()
    avg_prep_time_minutes = serializers.IntegerField()
    active_drivers_count = serializers.IntegerField()
    total_revenue_today = serializers.IntegerField()
    new_orders_count = serializers.IntegerField()
    preparing_count = serializers.IntegerField()
    delivering_count = serializers.IntegerField()


class AdminOperationLogSerializer(serializers.ModelSerializer):
    user_role_display = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()

    class Meta:
        model = OperationLog
        fields = [
            'id', 'user_role', 'user_role_display', 'action',
            'type', 'type_display', 'target_id', 'created_at',
        ]

    def get_user_role_display(self, obj):
        return obj.get_user_role_display()

    def get_type_display(self, obj):
        return obj.get_type_display()


class AdminProductWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования продуктов."""
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Product
        fields = '__all__'


class AdminSetWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования сетов."""
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Set
        fields = '__all__'


class AdminUserProfileSerializer(serializers.ModelSerializer):
    """Профиль пользователя с ролью для дашборда."""
    class Meta:
        model = UserProfile
        fields = ['id', 'phone', 'role', 'created_at']
