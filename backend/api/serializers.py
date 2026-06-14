from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, SubCategory, Product, Set, SetItem, UserProfile, Ingredient, Allergen


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

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        return list(obj.allergens.values_list('name', flat=True))


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

    def get_composition(self, obj):
        return list(obj.ingredients.values_list('name', flat=True))

    def get_allergens(self, obj):
        return list(obj.allergens.values_list('name', flat=True))


class RegisterSerializer(serializers.ModelSerializer):
    """Регистрация нового пользователя + создание профиля."""
    phone = serializers.CharField(max_length=20, required=False, write_only=True)

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
