"""Модель журнала операций."""

from django.conf import settings
from django.db import models


class OperationLog(models.Model):
    """Журнал операций для дашборда (кто, что, когда сделал)."""

    class Role(models.TextChoices):
        CASHIER = 'cashier', 'Кассир'
        CHEF = 'chef', 'Шеф-повар'
        MANAGER = 'manager', 'Управляющий'
        SYSTEM = 'system', 'Система'

    class LogType(models.TextChoices):
        ORDER = 'order', 'Заказ'
        MENU = 'menu', 'Меню'
        SYSTEM = 'system', 'Система'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operation_logs',
        verbose_name='Пользователь',
    )
    user_role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.SYSTEM,
        verbose_name='Роль',
    )
    action = models.TextField(verbose_name='Действие')
    type = models.CharField(
        max_length=10,
        choices=LogType.choices,
        default=LogType.SYSTEM,
        verbose_name='Тип',
    )
    target_id = models.CharField(
        max_length=64, blank=True,
        verbose_name='ID цели',
        help_text='ID заказа или позиции меню, к которой относится действие',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Лог операции'
        verbose_name_plural = 'Логи операций'

    def __str__(self):
        return f'[{self.get_user_role_display()}] {self.action[:60]}'
