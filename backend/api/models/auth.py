"""Модели пользователей: профиль и адреса доставки."""

from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """Расширенный профиль пользователя (телефон, код подтверждения)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь',
    )
    phone = models.CharField(max_length=20, unique=True, blank=True, verbose_name='Телефон')
    role = models.CharField(
        max_length=10,
        choices=[('cashier', 'Кассир'), ('chef', 'Шеф-повар'), ('manager', 'Управляющий')],
        default='cashier',
        verbose_name='Роль в дашборде',
    )
    verification_code = models.CharField(max_length=4, blank=True, verbose_name='Код подтверждения')
    code_sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Код отправлен')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        verbose_name = 'Профиль'
        verbose_name_plural = 'Профили'

    def __str__(self):
        return f'Профиль: {self.user.username}'


class Address(models.Model):
    """Сохранённый адрес доставки пользователя."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name='Пользователь',
    )
    full_address = models.CharField(
        max_length=500,
        verbose_name='Адрес (улица, дом)',
        help_text='Корневой адрес из DaData: «г Пермь, ул Ленина, д 1»',
    )
    flat = models.CharField(max_length=20, blank=True, verbose_name='Квартира / офис')
    entrance = models.CharField(max_length=20, blank=True, verbose_name='Подъезд')
    floor = models.CharField(max_length=20, blank=True, verbose_name='Этаж')
    intercom = models.CharField(max_length=50, blank=True, verbose_name='Домофон')
    comment = models.TextField(blank=True, verbose_name='Комментарий курьеру')
    is_default = models.BooleanField(default=False, verbose_name='Основной адрес')
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name='Широта', help_text='Из DaData geo_lat',
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        verbose_name='Долгота', help_text='Из DaData geo_lon',
    )
    delivery_zone = models.CharField(
        max_length=20, null=True, blank=True,
        choices=[('free_delivery', 'Бесплатная'), ('800_delivery', '800 зона')],
        verbose_name='Зона доставки',
        help_text='Кэшируется при сохранении адреса по координатам',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name = 'Адрес доставки'
        verbose_name_plural = 'Адреса доставки'

    def __str__(self):
        return f'{self.full_address}{" (основной)" if self.is_default else ""}'

    def save(self, *args, **kwargs):
        from django.db import transaction
        with transaction.atomic():
            if self.is_default:
                Address.objects.select_for_update().filter(
                    user=self.user, is_default=True
                ).order_by('id').update(is_default=False)
            if not self.pk and not Address.objects.filter(user=self.user).exists():
                self.is_default = True
            super().save(*args, **kwargs)
