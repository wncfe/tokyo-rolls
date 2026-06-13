from django.contrib import admin

from .models import (
    Category,
    Order,
    OrderItem,
    Product,
    PromoCode,
    RestaurantSettings,
    SetItem,
    SubCategory,
)


class SubCategoryInline(admin.TabularInline):
    model = SubCategory
    extra = 0


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'sort_order', 'is_active')
    list_editable = ('sort_order', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SubCategoryInline]


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'category', 'sort_order', 'is_active')
    list_filter = ('category',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


class SetItemInline(admin.TabularInline):
    model = SetItem
    fk_name = 'set_product'
    extra = 1
    autocomplete_fields = ['included_product']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category',
        'subcategory',
        'price',
        'weight',
        'pieces_amount',
        'is_available',
        'is_new',
    )
    list_filter = ('category', 'subcategory', 'is_available', 'is_new')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ['category', 'subcategory']
    inlines = [SetItemInline]


@admin.register(SetItem)
class SetItemAdmin(admin.ModelAdmin):
    list_display = ('set_product', 'included_product', 'quantity')
    autocomplete_fields = ['set_product', 'included_product']


@admin.register(RestaurantSettings)
class RestaurantSettingsAdmin(admin.ModelAdmin):
    list_display = (
        'opening_hour',
        'closing_hour',
        'min_order_amount',
        'free_delivery_from',
    )

    def has_add_permission(self, request):
        return not RestaurantSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'is_active', 'valid_until')
    search_fields = ('code',)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'product_name', 'unit_price', 'quantity', 'weight_grams')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'customer_phone', 'total', 'created_at')
    list_filter = ('status', 'created_at')
    readonly_fields = ('subtotal', 'discount_amount', 'delivery_fee', 'total', 'created_at')
    inlines = [OrderItemInline]
