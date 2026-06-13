from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, SubCategory, Product, UserProfile


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
            'image_url',
            'composition',
            'allergens',
            'is_new',
            'benefit_badge',
            'is_available',
            'category_slug',
            'subcategory_slug',
        ]


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
