from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
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


class Product(models.Model):
    """
    Универсальная позиция меню: сет, ролл, суши, горячее, десерт, напиток, соус.
    Тип определяется категорией (как на фронте в types.ts).
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
    image_url = models.URLField(max_length=500, verbose_name='URL изображения')
    composition = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Состав',
        help_text='Список ингредиентов, например ["Лосось", "Сыр"]',
    )
    allergens = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Аллергены',
        help_text='Список аллергенов, например ["Рыба", "Глютен"]',
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
        ordering = ['category__sort_order', 'subcategory__sort_order', 'sort_order', 'name']
        verbose_name = 'Продукт'
        verbose_name_plural = 'Продукты'

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.category_id:
            category_slug = self.category.slug
            if category_slug == 'rolls' and not self.subcategory_id:
                raise ValidationError({'subcategory': 'У роллов должна быть указана подкатегория.'})
            if category_slug != 'rolls' and self.subcategory_id:
                raise ValidationError({'subcategory': 'Подкатегория допустима только для роллов.'})

    @property
    def is_set(self):
        return self.category.slug == 'sets'


class SetItem(models.Model):
    """Состав сета: ссылка на другие позиции меню (роллы, суши и т.д.)."""

    set_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='set_items',
        limit_choices_to={'category__slug': 'sets'},
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
                fields=['set_product', 'included_product'],
                name='unique_set_item',
            ),
            models.CheckConstraint(
                condition=~models.Q(set_product=models.F('included_product')),
                name='set_cannot_include_itself',
                violation_error_message='Сет не может включать сам себя.',
            ),
        ]

    def __str__(self):
        return f'{self.set_product.name}: {self.included_product.name} × {self.quantity}'


class RestaurantSettings(models.Model):
    """Настройки ресторана: часы работы, минимальный заказ, доставка."""

    opening_hour = models.PositiveSmallIntegerField(
        default=11,
        validators=[MinValueValidator(0), MaxValueValidator(23)],
        verbose_name='Час открытия',
    )
    closing_hour = models.PositiveSmallIntegerField(
        default=23,
        validators=[MinValueValidator(1), MaxValueValidator(24)],
        verbose_name='Час закрытия',
    )
    min_order_amount = models.PositiveIntegerField(
        default=700,
        verbose_name='Минимальная сумма заказа, ₽',
    )
    free_delivery_from = models.PositiveIntegerField(
        default=700,
        verbose_name='Бесплатная доставка от, ₽',
    )
    suburban_delivery_fee = models.PositiveIntegerField(
        default=100,
        verbose_name='Доставка на окраины, от ₽',
    )
    delivery_time_min = models.PositiveSmallIntegerField(
        default=45,
        verbose_name='Мин. время доставки, мин',
    )
    delivery_time_max = models.PositiveSmallIntegerField(
        default=60,
        verbose_name='Макс. время доставки, мин',
    )

    class Meta:
        verbose_name = 'Настройки ресторана'
        verbose_name_plural = 'Настройки ресторана'

    def __str__(self):
        return f'Ресторан {self.opening_hour}:00–{self.closing_hour}:00'

    @classmethod
    def get_solo(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class PromoCode(models.Model):
    """Промокоды (например TOKYO10 на фронте)."""

    code = models.CharField(max_length=32, unique=True, verbose_name='Код')
    discount_percent = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        verbose_name='Скидка, %',
    )
    description = models.CharField(max_length=200, blank=True, verbose_name='Описание')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    valid_from = models.DateTimeField(null=True, blank=True, verbose_name='Действует с')
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name='Действует до')

    class Meta:
        verbose_name = 'Промокод'
        verbose_name_plural = 'Промокоды'

    def __str__(self):
        return self.code


class UserProfile(models.Model):
    """Расширенный профиль пользователя (телефон, адрес)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь',
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    address = models.TextField(blank=True, verbose_name='Адрес доставки')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Профиль'
        verbose_name_plural = 'Профили'

    def __str__(self):
        return f'Профиль: {self.user.username}'


class Order(models.Model):
    """Заказ из корзины (CartDrawer)."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Новый'
        CONFIRMED = 'confirmed', 'Подтверждён'
        PREPARING = 'preparing', 'Готовится'
        DELIVERING = 'delivering', 'В доставке'
        COMPLETED = 'completed', 'Выполнен'
        CANCELLED = 'cancelled', 'Отменён'

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Статус',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name='Пользователь',
    )
    customer_name = models.CharField(max_length=100, blank=True, verbose_name='Имя')
    customer_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    delivery_address = models.TextField(blank=True, verbose_name='Адрес доставки')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    promo_code = models.ForeignKey(
        PromoCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name='Промокод',
    )
    subtotal = models.PositiveIntegerField(default=0, verbose_name='Сумма без скидки, ₽')
    discount_amount = models.PositiveIntegerField(default=0, verbose_name='Скидка, ₽')
    delivery_fee = models.PositiveIntegerField(default=0, verbose_name='Доставка, ₽')
    total = models.PositiveIntegerField(default=0, verbose_name='Итого, ₽')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'

    def __str__(self):
        return f'Заказ #{self.pk} — {self.total} ₽'


class OrderItem(models.Model):
    """Позиция в заказе (снимок цены на момент оформления)."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заказ',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='order_items',
        verbose_name='Продукт',
    )
    product_name = models.CharField(max_length=200, verbose_name='Название (снимок)')
    unit_price = models.PositiveIntegerField(verbose_name='Цена за единицу, ₽')
    quantity = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Количество',
    )
    weight_grams = models.PositiveSmallIntegerField(verbose_name='Вес порции, г')

    class Meta:
        verbose_name = 'Позиция заказа'
        verbose_name_plural = 'Позиции заказа'

    def __str__(self):
        return f'{self.product_name} × {self.quantity}'

    @property
    def line_total(self):
        return self.unit_price * self.quantity
