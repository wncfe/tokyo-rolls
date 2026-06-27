"""Сериализаторы заказов: оформление, чтение, промокоды."""

from django.core.validators import MinValueValidator
from rest_framework import serializers
from ..models import (
    Address, Order, OrderItem, Product, Set,
    PromoCode, RestaurantSettings,
)


class OrderItemWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для записи позиции заказа."""
    product_slug = serializers.SlugField(write_only=True, required=False)
    set_slug = serializers.SlugField(write_only=True, required=False)
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = OrderItem
        fields = ['product_slug', 'set_slug', 'quantity']

    def validate(self, attrs):
        if not attrs.get('product_slug') and not attrs.get('set_slug'):
            raise serializers.ValidationError('Укажите product_slug или set_slug.')
        if attrs.get('product_slug') and attrs.get('set_slug'):
            raise serializers.ValidationError('Нельзя указать одновременно product_slug и set_slug.')
        return attrs


class OrderWriteSerializer(serializers.ModelSerializer):
    """Создание заказа из корзины (только для авторизованных)."""
    items = OrderItemWriteSerializer(many=True)
    promo_code = serializers.CharField(max_length=32, required=False, allow_blank=True, write_only=True)
    order_type = serializers.ChoiceField(choices=[('delivery', 'Доставка'), ('pickup', 'Самовывоз')], default='delivery')
    payment_method = serializers.ChoiceField(
        choices=[('cash', 'Наличные'), ('card_delivery', 'Картой при получении'), ('card_online', 'Картой онлайн')],
        default='card_online',
    )
    address_id = serializers.IntegerField(required=False, write_only=True)
    customer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            'customer_name', 'customer_phone', 'delivery_address',
            'comment', 'promo_code', 'order_type', 'payment_method', 'address_id', 'items',
        ]

    def validate(self, attrs):
        items_data = attrs.get('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'Корзина пуста.'})

        address_id = attrs.pop('address_id', None)
        if address_id:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError({'address_id': 'Требуется авторизация.'})
            try:
                addr = Address.objects.get(id=address_id, user=request.user)
            except Address.DoesNotExist:
                raise serializers.ValidationError({'address_id': 'Адрес не найден.'})
            attrs['_delivery_zone'] = addr.delivery_zone
            parts = [addr.full_address]
            if addr.flat:
                parts.append(f'кв./офис {addr.flat}')
            if addr.entrance:
                parts.append(f'подъезд {addr.entrance}')
            if addr.floor:
                parts.append(f'этаж {addr.floor}')
            if addr.intercom:
                parts.append(f'домофон {addr.intercom}')
            if addr.comment:
                parts.append(f'({addr.comment})')
            attrs['delivery_address'] = ', '.join(parts)

        promo_code_str = attrs.get('promo_code', '')
        if promo_code_str and promo_code_str.strip():
            try:
                promo = PromoCode.objects.get(code__iexact=promo_code_str.strip(), is_active=True)
                from django.utils import timezone
                now = timezone.now()
                if promo.valid_from and now < promo.valid_from:
                    raise serializers.ValidationError({
                        'promo_code': f'Промокод «{promo_code_str}» ещё не действует.'
                    })
                if promo.valid_until and now > promo.valid_until:
                    raise serializers.ValidationError({
                        'promo_code': f'Промокод «{promo_code_str}» истёк.'
                    })
                attrs['_promo'] = promo
            except PromoCode.DoesNotExist:
                raise serializers.ValidationError({
                    'promo_code': f'Промокод «{promo_code_str}» не найден или неактивен.'
                })

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        promo_code_str = validated_data.pop('promo_code', '')
        delivery_zone = validated_data.pop('_delivery_zone', None)
        promo = validated_data.pop('_promo', None)
        discount_percent = promo.discount_percent if promo else 0

        user = self.context['request'].user if self.context['request'].user.is_authenticated else None

        from django.db import transaction
        with transaction.atomic():
            order = Order.objects.create(user=user, **validated_data)

            subtotal = 0
            for item_data in items_data:
                product_slug = item_data.get('product_slug')
                set_slug = item_data.get('set_slug')
                quantity = item_data['quantity']

                if product_slug:
                    try:
                        product = Product.objects.get(slug=product_slug, is_available=True)
                    except Product.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': f'Продукт «{product_slug}» не найден или недоступен.'
                        })
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        unit_price=product.price,
                        quantity=quantity,
                        weight_grams=product.weight,
                    )
                    subtotal += product.price * quantity
                elif set_slug:
                    try:
                        menu_set = Set.objects.get(slug=set_slug, is_available=True)
                    except Set.DoesNotExist:
                        raise serializers.ValidationError({
                            'items': f'Сет «{set_slug}» не найден или недоступен.'
                        })
                    OrderItem.objects.create(
                        order=order,
                        set_menu=menu_set,
                        product_name=menu_set.name,
                        unit_price=menu_set.price,
                        quantity=quantity,
                        weight_grams=menu_set.weight,
                    )
                    subtotal += menu_set.price * quantity

            order_type = validated_data.get('order_type', 'delivery')
            settings_obj = RestaurantSettings.get_solo()
            pickup_discount = int(subtotal * settings_obj.pickup_discount_percent / 100) if order_type == 'pickup' else 0
            promo_discount = int(subtotal * discount_percent / 100) if discount_percent else 0
            discount_amount = pickup_discount + promo_discount

            subtotal_after_discount = max(0, subtotal - discount_amount)

            if order_type == 'pickup':
                delivery_fee = 0
                min_order = settings_obj.min_order_amount
            elif delivery_zone:
                from ..services.delivery_zones import get_zone_rules
                rules = get_zone_rules(delivery_zone)
                delivery_fee = rules['delivery_fee']
                min_order = rules['min_order_amount']
            else:
                if validated_data.get('delivery_address', ''):
                    raise serializers.ValidationError({
                        'delivery_address': (
                            'Адрес не привязан к зоне доставки. '
                            'Пожалуйста, сохраните адрес через «Мои адреса» и укажите его при заказе.'
                        )
                    })
                delivery_fee = 0 if subtotal_after_discount >= settings_obj.free_delivery_from else settings_obj.suburban_delivery_fee
                min_order = settings_obj.min_order_amount

            if subtotal_after_discount < min_order:
                raise serializers.ValidationError({
                    'items': f'Минимальная сумма заказа: {min_order} ₽. '
                             f'Сейчас: {subtotal_after_discount} ₽, добавьте ещё {min_order - subtotal_after_discount} ₽.'
                })

            effective_total = subtotal_after_discount + delivery_fee

            order.subtotal = subtotal
            order.discount_amount = discount_amount
            order.delivery_fee = delivery_fee
            order.total = effective_total
            order.promo_code = promo
            order.save(update_fields=['subtotal', 'discount_amount', 'delivery_fee', 'total', 'promo_code'])

        return order

    @staticmethod
    def _validate_promo(code_str):
        pass  # deprecated — validation moved to validate() and create()


class OrderItemReadSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'unit_price', 'quantity', 'weight_grams', 'line_total', 'product_image']

    def get_product_image(self, obj):
        img = None
        if obj.product and obj.product.image:
            img = obj.product.image
        elif obj.set_menu and obj.set_menu.image:
            img = obj.set_menu.image
        if not img:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(img.url)
        return img.url


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name', 'customer_phone',
            'delivery_address', 'comment', 'order_type', 'payment_method',
            'subtotal', 'discount_amount', 'delivery_fee', 'total',
            'payment_id', 'payment_url', 'yookassa_status',
            'created_at', 'items',
        ]


class PromoCodeValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)

    def validate_code(self, value):
        from django.utils import timezone
        try:
            promo = PromoCode.objects.get(code__iexact=value.strip(), is_active=True)
        except PromoCode.DoesNotExist:
            raise serializers.ValidationError('Промокод не найден или неактивен.')
        now = timezone.now()
        if promo.valid_from and now < promo.valid_from:
            raise serializers.ValidationError('Промокод ещё не действует.')
        if promo.valid_until and now > promo.valid_until:
            raise serializers.ValidationError('Срок действия промокода истёк.')
        self._promo = promo
        return value

    def get_promo(self):
        return getattr(self, '_promo', None)
