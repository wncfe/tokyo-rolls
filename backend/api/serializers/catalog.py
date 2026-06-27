"""Сериализаторы каталога: категории, продукты, сеты, ингредиенты, аллергены."""

from rest_framework import serializers
from ..models import (
    Category, SubCategory, Product, Set, SetItem,
    Ingredient, Allergen,
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
        names: set[str] = set()
        for ingredient in obj.ingredients.all():
            for allergen in ingredient.allergens.all():
                names.add(allergen.name)
        return sorted(names)


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
        names: set[str] = set()
        for ingredient in obj.ingredients.all():
            for allergen in ingredient.allergens.all():
                names.add(allergen.name)
        return sorted(names)
