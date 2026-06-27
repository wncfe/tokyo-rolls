"""Модели заказов: Order, OrderItem."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from .catalog import Product, Set
from .settings import PromoCode


class Order(models.Model):
    """Заказ из корзины (CartDrawer)."""

    class Status(models.TextChoices):
        UNPAID = 'unpaid', 'Не оплачен'
        AWAITING_PAYMENT = 'awaiting_payment', 'Ожидает оплаты'
        PENDING = 'pending', 'Новый'
        CONFIRMED = 'confirmed', 'Подтверждён'
        PREPARING = 'preparing', 'Готовится'
        READY = 'ready', 'Можно забирать'
        DELIVERING = 'delivering', 'В доставке'
        DELIVERED = 'delivered', 'Доставлен'
        COMPLETED = 'completed', 'Выполнен'
        CANCELLED = 'cancelled', 'Отменён'

    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Наличные'
        CARD_DELIVERY = 'card_delivery', 'Картой при получении'
        CARD_ONLINE = 'card_online', 'Картой онлайн'

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Статус',
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD_ONLINE,
        verbose_name='Способ оплаты',
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
    order_type = models.CharField(
        max_length=10,
        choices=[('delivery', 'Доставка'), ('pickup', 'Самовывоз')],
        default='delivery',
        verbose_name='Тип заказа',
    )
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
    payment_id = models.CharField(
        max_length=64, blank=True,
        verbose_name='ID платежа в ЮKassa',
    )
    payment_url = models.URLField(
        max_length=500, blank=True,
        verbose_name='Ссылка на оплату',
    )
    yookassa_status = models.CharField(
        max_length=20, blank=True,
        verbose_name='Статус платежа в ЮKassa',
    )
    dismissed = models.BooleanField(
        default=False,
        verbose_name='Скрыт пользователем',
        help_text='Пользователь подтвердил отмену/завершение — заказ не показывается в активных',
    )
    cancel_reason = models.TextField(
        blank=True,
        verbose_name='Причина отмены',
        help_text='Заполняется кассиром/менеджером при отмене заказа',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'

    def __str__(self):
        return f'Заказ #{self.pk} — {self.total} ₽'


class OrderItem(models.Model):
    """Позиция в заказе (снимок цены на момент оформления). Может быть продукт ИЛИ сет."""

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заказ',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name='Продукт',
    )
    set_menu = models.ForeignKey(
        Set,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name='Сет',
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
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(product__isnull=False, set_menu__isnull=True)
                    | models.Q(product__isnull=True, set_menu__isnull=False)
                ),
                name='orderitem_product_xor_set',
                violation_error_message='Должен быть заполнен ровно один: продукт ИЛИ сет.',
            ),
        ]

    def __str__(self):
        return f'{self.product_name} × {self.quantity}'

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def clean(self):
        super().clean()
        if self.product_id and self.set_menu_id:
            raise ValidationError('Нельзя указать одновременно и продукт, и сет.')
        if not self.product_id and not self.set_menu_id:
            raise ValidationError('Нужно указать продукт ИЛИ сет.')
