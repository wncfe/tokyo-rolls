"""Модели каталога: категории, продукты, сеты, ингредиенты, аллергены."""

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Category(models.Model):
    """Верхнеуровневые разделы меню (как в CategoryNav и App.tsx)."""

    slug = models.SlugField(
        max_length=32,
        unique=True,
        help_text='sets, rolls, sushi, hot, desserts, drinks, sauces',
    )
    name = models.CharField(max_length=100, verbose_name='Название')
    subtitle = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Подзаголовок секции',
        help_text='Например: «ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ»',
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Категория меню'
        verbose_name_plural = 'Категории меню'

    def __str__(self):
        return self.name


class SubCategory(models.Model):
    """Подкатегории роллов: запечённые, тёплые, классические."""

    slug = models.SlugField(
        max_length=32,
        unique=True,
        help_text='baked, warm, classic',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='subcategories',
        limit_choices_to={'slug': 'rolls'},
        verbose_name='Категория',
    )
    name = models.CharField(max_length=100, verbose_name='Название')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    is_active = models.BooleanField(default=True, verbose_name='Активна')

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = 'Подкатегория'
        verbose_name_plural = 'Подкатегории'

    def __str__(self):
        return f'{self.category.name} → {self.name}'


class Ingredient(models.Model):
    """Ингредиент блюда (состав)."""

    slug = models.SlugField(max_length=64, unique=True, verbose_name='Slug')
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')
    allergens = models.ManyToManyField(
        'Allergen',
        blank=True,
        related_name='ingredients',
        verbose_name='Аллергены',
        help_text='Аллергены, которые содержит этот ингредиент (глютен — в муке, моллюски — в мидиях и т.д.)',
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Ингредиент'
        verbose_name_plural = 'Ингредиенты'

    def __str__(self):
        return self.name


class Allergen(models.Model):
    """Аллерген (отображается в карточке продукта)."""

    slug = models.SlugField(max_length=64, unique=True, verbose_name='Slug')
    name = models.CharField(max_length=100, unique=True, verbose_name='Название')

    class Meta:
        ordering = ['name']
        verbose_name = 'Аллерген'
        verbose_name_plural = 'Аллергены'

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Позиция меню: ролл, суши, горячее, десерт, напиток, соус.
    Сеты вынесены в отдельную модель Set.
    """

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='Категория',
    )
    subcategory = models.ForeignKey(
        SubCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='products',
        verbose_name='Подкатегория',
        help_text='Только для роллов',
    )
    slug = models.SlugField(max_length=64, unique=True, verbose_name='Slug')
    name = models.CharField(max_length=200, verbose_name='Название')
    description = models.TextField(verbose_name='Описание')
    price = models.PositiveIntegerField(
        verbose_name='Цена, ₽',
        validators=[MinValueValidator(1)],
    )
    weight = models.PositiveSmallIntegerField(
        verbose_name='Вес, г',
        validators=[MinValueValidator(1)],
    )
    pieces_amount = models.PositiveSmallIntegerField(
        verbose_name='Количество штук',
        validators=[MinValueValidator(1)],
        help_text='Кусочков в порции или 1 для супа/напитка',
    )
    image = models.ImageField(upload_to='products/', verbose_name='Изображение')
    ingredients = models.ManyToManyField(
        'Ingredient',
        through='ProductIngredient',
        related_name='products',
        verbose_name='Ингредиенты',
    )
    is_new = models.BooleanField(default=False, verbose_name='Новинка')
    benefit_badge = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Бейдж',
        help_text='Например: «15% выгода», «Хит»',
    )
    is_available = models.BooleanField(default=True, verbose_name='Доступен для заказа')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        verbose_name = 'Продукт'
        verbose_name_plural = 'Продукты'

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.category_id:
            try:
                category_slug = Category.objects.only('slug').get(pk=self.category_id).slug
            except Category.DoesNotExist:
                raise ValidationError({'category': 'Категория не найдена.'})
            if category_slug == 'sets':
                raise ValidationError({'category': 'Сеты — отдельная сущность, используйте раздел "Сеты".'})
            if category_slug == 'rolls' and not self.subcategory_id:
                raise ValidationError({'subcategory': 'У роллов должна быть указана подкатегория.'})
            if category_slug != 'rolls' and self.subcategory_id:
                raise ValidationError({'subcategory': 'Подкатегория допустима только для роллов.'})


class Set(models.Model):
    """
    Самостоятельная модель сета — набора из других позиций меню (роллов, суши и т.д.).
    НЕ наследник Product; живёт в отдельной админке и отдельном API.
    """

    slug = models.SlugField(max_length=64, unique=True, verbose_name='Slug')
    name = models.CharField(max_length=200, verbose_name='Название')
    description = models.TextField(verbose_name='Описание')
    price = models.PositiveIntegerField(
        verbose_name='Цена, ₽',
        validators=[MinValueValidator(1)],
    )
    weight = models.PositiveSmallIntegerField(
        verbose_name='Вес, г',
        validators=[MinValueValidator(1)],
    )
    pieces_amount = models.PositiveSmallIntegerField(
        verbose_name='Количество штук',
        validators=[MinValueValidator(1)],
    )
    image = models.ImageField(upload_to='sets/', verbose_name='Изображение')
    ingredients = models.ManyToManyField(
        'Ingredient',
        through='SetIngredient',
        related_name='sets',
        verbose_name='Ингредиенты',
    )
    is_new = models.BooleanField(default=False, verbose_name='Новинка')
    benefit_badge = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Бейдж',
        help_text='Например: «15% выгода», «Хит»',
    )
    is_available = models.BooleanField(default=True, verbose_name='Доступен для заказа')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        verbose_name = 'Сет'
        verbose_name_plural = 'Сеты'

    def __str__(self):
        return self.name


class SetItem(models.Model):
    """Состав сета: ссылка на другие позиции меню (роллы, суши и т.д.)."""

    set_menu = models.ForeignKey(
        Set,
        on_delete=models.CASCADE,
        related_name='set_items',
        verbose_name='Сет',
    )
    included_product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='included_in_sets',
        verbose_name='Включённый продукт',
    )
    quantity = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name='Количество',
        help_text='Сколько порций этого продукта входит в сет',
    )

    class Meta:
        verbose_name = 'Позиция в сете'
        verbose_name_plural = 'Состав сетов'
        constraints = [
            models.UniqueConstraint(
                fields=['set_menu', 'included_product'],
                name='unique_set_item',
            ),
        ]

    def __str__(self):
        return f'{self.set_menu.name}: {self.included_product.name} × {self.quantity}'


class SetIngredient(models.Model):
    """Связь сет–ингредиент с сохранением порядка."""

    set_menu = models.ForeignKey(
        'Set',
        on_delete=models.CASCADE,
        related_name='set_ingredients',
        verbose_name='Сет',
    )
    ingredient = models.ForeignKey(
        'Ingredient',
        on_delete=models.PROTECT,
        related_name='set_ingredients',
        verbose_name='Ингредиент',
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        ordering = ['sort_order']
        verbose_name = 'Ингредиент в сете'
        verbose_name_plural = 'Ингредиенты в сетах'
        constraints = [
            models.UniqueConstraint(
                fields=['set_menu', 'ingredient'],
                name='unique_set_ingredient',
            ),
        ]

    def __str__(self):
        return f'{self.set_menu.name} ← {self.ingredient.name}'


class ProductIngredient(models.Model):
    """Связь продукт-ингредиент с сохранением порядка."""

    product = models.ForeignKey(
        'Product',
        on_delete=models.CASCADE,
        related_name='product_ingredients',
        verbose_name='Продукт',
    )
    ingredient = models.ForeignKey(
        'Ingredient',
        on_delete=models.PROTECT,
        related_name='product_ingredients',
        verbose_name='Ингредиент',
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        ordering = ['sort_order']
        verbose_name = 'Ингредиент в продукте'
        verbose_name_plural = 'Ингредиенты в продуктах'
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'ingredient'],
                name='unique_product_ingredient',
            ),
        ]

    def __str__(self):
        return f'{self.product.name} ← {self.ingredient.name}'
