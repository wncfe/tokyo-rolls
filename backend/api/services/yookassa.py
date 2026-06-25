"""Сервисный слой для интеграции с ЮKassa (YooKassa)."""

import logging
import uuid

from django.conf import settings
from yookassa import Configuration, Payment as YooPayment

logger = logging.getLogger(__name__)

Configuration.account_id = settings.YOOKASSA_SHOP_ID
Configuration.secret_key = settings.YOOKASSA_SECRET_KEY


def create_payment(
    amount_rub: int,
    order_id: int,
    description: str = '',
    return_url: str | None = None,
) -> dict | None:
    """
    Создать платёж в ЮKassa (сценарий Smart Payment).

    Параметры:
    - amount_rub: сумма в рублях (целое число)
    - order_id: ID заказа в нашей системе
    - description: описание платежа (до 128 символов)
    - return_url: куда вернуть пользователя после оплаты

    Возвращает dict с {payment_id, payment_url, yookassa_status} или None при ошибке.
    """
    if not settings.YOOKASSA_SECRET_KEY:
        logger.warning('YOOKASSA_SECRET_KEY is not set — skipping payment creation')
        return None

    try:
        # Вставляем order_id в return_url, чтобы после редиректа с ЮKassa
        # фронтенд знал, какой заказ опрашивать
        base_return_url = (return_url or settings.YOOKASSA_RETURN_URL).rstrip('&')
        separator = '&' if '?' in base_return_url else '?'
        final_return_url = f'{base_return_url}{separator}order_id={order_id}'

        payment = YooPayment.create(
            {
                'amount': {
                    'value': f'{amount_rub}.00',
                    'currency': 'RUB',
                },
                'capture': True,
                'confirmation': {
                    'type': 'redirect',
                    'return_url': final_return_url,
                },
                'description': description[:128],
                'metadata': {
                    'order_id': str(order_id),
                },
            },
            uuid.uuid4(),
        )

        return {
            'payment_id': payment.id,
            'payment_url': payment.confirmation.confirmation_url,
            'yookassa_status': payment.status,
        }
    except Exception:
        logger.exception('YooKassa payment creation failed for order %s', order_id)
        return None


def get_payment_info(payment_id: str) -> dict | None:
    """
    Получить информацию о платеже по его ID в ЮKassa.

    Возвращает dict с {status, paid} или None при ошибке.
    """
    try:
        payment = YooPayment.find_one(payment_id)
        return {
            'status': payment.status,
            'paid': payment.paid,
        }
    except Exception:
        logger.exception('YooKassa payment lookup failed for %s', payment_id)
        return None
