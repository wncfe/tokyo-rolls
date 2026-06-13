from rest_framework import serializers
from .models import Category, SubCategory, Product


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
