"""Модели настроек: ресторан и промокоды."""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


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
    restaurant_address = models.TextField(
        blank=True,
        verbose_name='Адрес ресторана',
        help_text='Отображается при выборе самовывоза',
    )
    pickup_discount_percent = models.PositiveSmallIntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Скидка за самовывоз, %',
    )

    class Meta:
        verbose_name = 'Настройки ресторана'
        verbose_name_plural = 'Настройки ресторана'

    def __str__(self):
        return f'Ресторан {self.opening_hour}:00–{self.closing_hour}:00'

    @classmethod
    def get_solo(cls):
        """Singleton-паттерн: всегда одна запись настроек, без привязки к pk."""
        obj, _ = cls.objects.get_or_create(defaults={})
        return obj


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
