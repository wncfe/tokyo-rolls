from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from .models import (
    Category, SubCategory, Product, Set, SetItem, UserProfile,
    Ingredient, Allergen, Order, OrderItem, RestaurantSettings, PromoCode,
)


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'slug', 'name']


class AllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ['id', 'slug', 'name']


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = ['id', 'slug', 'name', 'sort_order']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'slug', 'name', 'subtitle', 'sort_order', 'subcategories']


class ProductSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    subcategory_slug = serializers.CharField(source='subcategory.slug', read_only=True, allow_null=True)
    composition = serializers.SerializerMethodField()
    allergens = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'price',
            'weight',
            'pieces_amount',
            'image',
            'composition',
            'allergens',
            'is_new',
            'benefit_badge',
            'is_available',
            'category_slug',
            'subcategory_slug',
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        # Автоматически собирает аллергены из ингредиентов продукта, исключая дубликаты
        return sorted(set(
            obj.ingredients.exclude(allergens__isnull=True).values_list('allergens__name', flat=True)
        ))


class SetItemSerializer(serializers.ModelSerializer):
    """Одна позиция в составе сета."""
    product_slug = serializers.CharField(source='included_product.slug', read_only=True)
    product_name = serializers.CharField(source='included_product.name', read_only=True)
    product_id = serializers.IntegerField(source='included_product.id', read_only=True)

    class Meta:
        model = SetItem
        fields = ['id', 'product_id', 'product_slug', 'product_name', 'quantity']


class SetSerializer(serializers.ModelSerializer):
    composition = serializers.SerializerMethodField()
    allergens = serializers.SerializerMethodField()
    included_products = SetItemSerializer(source='set_items', many=True, read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Set
        fields = [
            'id',
            'slug',
            'name',
            'description',
            'price',
            'weight',
            'pieces_amount',
            'image',
            'composition',
            'allergens',
            'included_products',
            'is_new',
            'benefit_badge',
            'is_available',
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        # Автоматически собирает аллергены из ингредиентов сета, исключая дубликаты
        return sorted(set(
            obj.ingredients.exclude(allergens__isnull=True).values_list('allergens__name', flat=True)
        ))


class RegisterSerializer(serializers.ModelSerializer):
    """Регистрация нового пользователя + создание профиля."""
    phone = serializers.CharField(
        max_length=20, required=False, write_only=True,
        validators=[RegexValidator(r'^\+7\s?\(?\d{3}\)?\s?\d{3}-?\d{2}-?\d{2}$',
                                   message='Формат: +7 (XXX) XXX-XX-XX')],
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'phone']
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8},
        }

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, phone=phone)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Профиль пользователя (чтение и редактирование)."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'phone', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── Checkout / Order ───

class OrderItemWriteSerializer(serializers.ModelSerializer):
    """Сериализатор для записи позиции заказа."""
    product_slug = serializers.SlugField(write_only=True, required=False)
    set_slug = serializers.SlugField(write_only=True, required=False)

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
    """Создание заказа из корзины."""
    items = OrderItemWriteSerializer(many=True)
    promo_code = serializers.CharField(max_length=32, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            'customer_name', 'customer_phone', 'delivery_address',
            'comment', 'promo_code', 'items',
        ]

    def validate(self, attrs):
        items_data = attrs.get('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'Корзина пуста.'})
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        promo_code_str = validated_data.pop('promo_code', '')

        # Применить промокод
        promo = None
        discount_percent = 0
        if promo_code_str:
            promo = self._validate_promo(promo_code_str)
            if promo:
                discount_percent = promo.discount_percent

        # Привязать пользователя, если авторизован
        user = self.context['request'].user if self.context['request'].user.is_authenticated else None

        # Создать заказ
        order = Order.objects.create(user=user, **validated_data)

        subtotal = 0
        for item_data in items_data:
            product_slug = item_data.get('product_slug')
            set_slug = item_data.get('set_slug')
            quantity = item_data['quantity']

            if product_slug:
                product = Product.objects.get(slug=product_slug)
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
                menu_set = Set.objects.get(slug=set_slug)
                OrderItem.objects.create(
                    order=order,
                    set_menu=menu_set,
                    product_name=menu_set.name,
                    unit_price=menu_set.price,
                    quantity=quantity,
                    weight_grams=menu_set.weight,
                )
                subtotal += menu_set.price * quantity

        # Расчёт скидки и доставки
        discount_amount = int(subtotal * discount_percent / 100) if discount_percent else 0
        settings = RestaurantSettings.get_solo()
        delivery_fee = 0 if subtotal - discount_amount >= settings.free_delivery_from else settings.suburban_delivery_fee

        order.subtotal = subtotal
        order.discount_amount = discount_amount
        order.delivery_fee = delivery_fee
        order.total = subtotal - discount_amount + delivery_fee
        order.promo_code = promo
        order.save(update_fields=['subtotal', 'discount_amount', 'delivery_fee', 'total', 'promo_code'])

        return order

    @staticmethod
    def _validate_promo(code_str):
        from django.utils import timezone
        try:
            promo = PromoCode.objects.get(code__iexact=code_str.strip(), is_active=True)
            now = timezone.now()
            if promo.valid_from and now < promo.valid_from:
                return None
            if promo.valid_until and now > promo.valid_until:
                return None
            return promo
        except PromoCode.DoesNotExist:
            return None


class OrderItemReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'unit_price', 'quantity', 'weight_grams', 'line_total']


class OrderReadSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'customer_name', 'customer_phone',
            'delivery_address', 'comment', 'subtotal', 'discount_amount',
            'delivery_fee', 'total', 'created_at', 'items',
        ]


# ─── Restaurant Settings ───

class RestaurantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantSettings
        fields = [
            'opening_hour', 'closing_hour', 'min_order_amount',
            'free_delivery_from', 'suburban_delivery_fee',
            'delivery_time_min', 'delivery_time_max',
        ]


# ─── Promo Code ───

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
