import hashlib
import hmac
import json
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Order
from ..services.yookassa import get_payment_info

logger = logging.getLogger(__name__)


# IP-адреса ЮKassa (whitelist для вебхука)
_YK_IPS = ['84.201.147.0/24', '185.71.76.0/27', '77.75.157.0/27', '77.75.156.0/27']


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def payment_webhook(request):
    """
    Webhook от ЮKassa — уведомление о смене статуса платежа.
    ЮKassa присылает POST с JSON-телом.
    """
    # Проверка IP-адреса отправителя (whitelist ЮKassa)
    _remote_ip = request.META.get('REMOTE_ADDR', '')
    if _remote_ip and not settings.DEBUG:
        import ipaddress
        if not any(ipaddress.ip_address(_remote_ip) in ipaddress.ip_network(n) for n in _YK_IPS):
            logger.warning('Webhook: IP %s not in YooKassa whitelist', _remote_ip)
            return Response(
                {'detail': 'Forbidden'},
                status=status.HTTP_403_FORBIDDEN,
            )

    # Проверка HMAC-подписи (если задан YOOKASSA_SECRET_KEY)
    raw_body = request.body
    if settings.YOOKASSA_SECRET_KEY:
        signature = request.headers.get('Signature', '')
        if not signature:
            logger.warning('Webhook: missing HMAC signature header')
            return Response(
                {'detail': 'Missing signature'},
                status=status.HTTP_403_FORBIDDEN,
            )
        expected = hmac.new(
            settings.YOOKASSA_SECRET_KEY.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning('Webhook: invalid HMAC signature')
            return Response(
                {'detail': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return Response(
            {'detail': 'Invalid JSON'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    event = body.get('event', '')
    event_object = body.get('object', {})

    if event in ('payment.waiting_for_capture', 'payment.succeeded', 'payment.canceled'):
        payment_id = event_object.get('id', '')
        if not payment_id:
            return Response(
                {'detail': 'No payment id'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.select_for_update().get(payment_id=payment_id)
        except Order.DoesNotExist:
            logger.warning(
                'Webhook: order not found for payment %s',
                payment_id,
            )
            return Response(
                {'detail': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = event_object.get('status', '')
        if event == 'payment.succeeded' or new_status == 'succeeded':
            order.status = Order.Status.CONFIRMED
            order.yookassa_status = 'succeeded'
        elif event == 'payment.canceled' or new_status == 'canceled':
            order.status = Order.Status.CANCELLED
            order.yookassa_status = 'canceled'
        else:
            order.yookassa_status = new_status

        order.save(update_fields=['status', 'yookassa_status'])

        logger.info(
            'Webhook processed: payment=%s, event=%s, new_order_status=%s',
            payment_id, event, order.status,
        )

    return Response({'detail': 'OK'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, order_id):
    """Проверить статус оплаты заказа (опрос после возврата с ЮKassa).

    Сначала смотрит локальный статус. Если локально заказ ещё не подтверждён,
    но у него есть payment_id — запрашивает ЮKassa API напрямую и обновляет
    статус заказа (актуально при разработке без вебхуков / падении вебхука).

    Также авто-отменяет заказ, если он провисел в awaiting_payment > 10 минут.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Проверка владельца: нельзя смотреть чужие заказы
    if order.user_id is not None and order.user_id != request.user.id:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Авто-отмена: если awaiting_payment дольше 10 минут
    if order.status == Order.Status.AWAITING_PAYMENT:
        elapsed = timezone.now() - order.created_at
        if elapsed > timedelta(minutes=10):
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])
            return Response({
                'order_id': order.pk,
                'status': order.status,
                'yookassa_status': order.yookassa_status,
                'paid': False,
            })

    # Если локально заказ ещё не прошёл оплату — проверяем ЮKassa напрямую.
    # Только для пред-платёжных статусов! Не трогаем delivering/delivered/completed.
    if order.status in (
        Order.Status.AWAITING_PAYMENT,
        Order.Status.UNPAID,
        Order.Status.PENDING,
    ) and order.payment_id:
        info = get_payment_info(order.payment_id)
        if info is not None:
            order.yookassa_status = info['status']

            if info['status'] == 'succeeded':
                order.status = Order.Status.CONFIRMED
            elif info['status'] == 'canceled':
                order.status = Order.Status.CANCELLED

            order.save(update_fields=['status', 'yookassa_status'])

    return Response({
        'order_id': order.pk,
        'status': order.status,
        'yookassa_status': order.yookassa_status,
        'paid': order.status in (
            Order.Status.CONFIRMED,
            Order.Status.PREPARING,
            Order.Status.READY,
        ),
    })
