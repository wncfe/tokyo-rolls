from django.contrib import admin
from django.db import models
from unfold.admin import ModelAdmin, TabularInline
from unfold.widgets import (
    UnfoldAdminCheckboxSelectMultipleWidget,
    UnfoldAdminTextInputWidget,
    UnfoldAdminTextareaWidget,
)

from .models import (
    Allergen,
    Category,
    Ingredient,
    Order,
    OrderItem,
    Product,
    ProductIngredient,
    PromoCode,
    RestaurantSettings,
    Set,
    SetIngredient,
    SetItem,
    SubCategory,
    UserProfile,
)

# Переводим инлайны на рельсы Unfold
class SubCategoryInline(TabularInline):
    model = SubCategory
    extra = 0


class SetItemInline(TabularInline):
    model = SetItem
    fk_name = 'set_menu'
    extra = 1
    autocomplete_fields = ['included_product']


class SetIngredientInline(TabularInline):
    model = SetIngredient
    extra = 1
    autocomplete_fields = ['ingredient']


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'set_menu', 'product_name', 'unit_price', 'quantity', 'weight_grams')


class ProductIngredientInline(TabularInline):
    model = ProductIngredient
    extra = 1
    autocomplete_fields = ['ingredient']


# Переводим основные классы на Unfold (ModelAdmin)
@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ('name', 'slug', 'sort_order', 'is_active')
    list_editable = ('sort_order', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SubCategoryInline]


@admin.register(SubCategory)
class SubCategoryAdmin(ModelAdmin):
    list_display = ('name', 'slug', 'category', 'sort_order', 'is_active')
    list_filter = ('category',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = (
        'name',
        'category',
        'subcategory',
        'price',
        'weight',
        'pieces_amount',
        'image',
        'is_available',
        'is_new',
    )
    list_filter = ('category', 'subcategory', 'is_available', 'is_new')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ['subcategory']
    inlines = [ProductIngredientInline]

    formfield_overrides = {
        models.CharField: {'widget': UnfoldAdminTextInputWidget},
        models.TextField: {'widget': UnfoldAdminTextareaWidget},
    }

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'category':
            kwargs['queryset'] = Category.objects.exclude(slug='sets')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Set)
class SetAdmin(ModelAdmin):
    list_display = (
        'name',
        'price',
        'weight',
        'pieces_amount',
        'image',
        'is_available',
        'is_new',
    )
    list_filter = ('is_available', 'is_new')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [SetItemInline, SetIngredientInline]

    formfield_overrides = {
        models.CharField: {'widget': UnfoldAdminTextInputWidget},
        models.TextField: {'widget': UnfoldAdminTextareaWidget},
    }



@admin.register(SetItem)
class SetItemAdmin(ModelAdmin):
    list_display = ('set_menu', 'included_product', 'quantity')
    autocomplete_fields = ['set_menu', 'included_product']


@admin.register(RestaurantSettings)
class RestaurantSettingsAdmin(ModelAdmin):
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
class PromoCodeAdmin(ModelAdmin):
    list_display = ('code', 'discount_percent', 'is_active', 'valid_until')
    search_fields = ('code',)


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ('id', 'status', 'customer_phone', 'total', 'created_at')
    list_filter = ('status', 'created_at')
    readonly_fields = ('subtotal', 'discount_amount', 'delivery_fee', 'total', 'created_at')
    inlines = [OrderItemInline]


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ('user', 'phone', 'created_at')
    search_fields = ('user__username', 'phone')


@admin.register(Ingredient)
class IngredientAdmin(ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    formfield_overrides = {
        models.ManyToManyField: {
            'widget': UnfoldAdminCheckboxSelectMultipleWidget(attrs={'class': 'admin-checkbox-grid'}),
        },
    }

    class Media:
        css = {
            'all': ['api/css/admin_checkbox_grid.css'],
        }


@admin.register(Allergen)
class AllergenAdmin(ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

