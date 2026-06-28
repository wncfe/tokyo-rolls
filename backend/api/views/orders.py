import logging

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import Order, UserProfile
from ..serializers import OrderWriteSerializer, OrderReadSerializer
from ..services.yookassa import create_payment

logger = logging.getLogger(__name__)


class CheckoutView(generics.CreateAPIView):
    """Оформление заказа из корзины (только для авторизованных)."""
    serializer_class = OrderWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Автозаполнение данных из профиля
        extra = {}
        if not serializer.validated_data.get('customer_name'):
            extra['customer_name'] = request.user.username
        if not serializer.validated_data.get('customer_phone'):
            profile = UserProfile.objects.filter(user=request.user).first()
            if profile and profile.phone:
                extra['customer_phone'] = profile.phone

        order = serializer.save(**extra)

        # Если выбран онлайн-платёж — создаём платёж в ЮKassa
        if order.payment_method == Order.PaymentMethod.CARD_ONLINE:
            description = f'Заказ №{order.pk} — Tokyo Rolls'
            result = create_payment(
                amount_rub=order.total,
                order_id=order.pk,
                description=description,
            )
            if result:
                order.payment_id = result['payment_id']
                order.payment_url = result['payment_url']
                order.yookassa_status = result['yookassa_status']
                order.status = Order.Status.AWAITING_PAYMENT
                order.save(update_fields=[
                    'payment_id', 'payment_url',
                    'yookassa_status', 'status',
                ])
            else:
                logger.warning(
                    'YooKassa payment creation failed for order %s',
                    order.pk,
                )

        return Response(
            OrderReadSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def active_order(request):
    """Вернуть последний заказ пользователя (исключая completed и dismissed).

    Cancelled-заказы возвращаются (пока не dismissed) — фронтенд показывает
    их в трекере с серым статусом, чтобы пользователь видел отмену и мог
    перезаказать. После dismiss заказ скрывается, статус сохраняется для
    аналитики.
    """
    order = (
        Order.objects
        .filter(user=request.user)
        .exclude(status=Order.Status.COMPLETED)
        .exclude(dismissed=True)
        .order_by('-created_at')
        .first()
    )
    if order is None:
        return Response(None)
    return Response(OrderReadSerializer(order).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, order_id):
    """Получить полную информацию о заказе (для трекера).

    В отличие от payment_status, возвращает полный OrderReadSerializer
    с составом заказа (items), ценами, адресом и таймстемпом.
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

    # Fallback: если вебхук ещё не пришёл — проверяем ЮKassa напрямую.
    # Только для пред-платёжных статусов! Не трогаем delivering/delivered/completed.
    if order.status in (
        Order.Status.AWAITING_PAYMENT,
        Order.Status.UNPAID,
        Order.Status.PENDING,
    ) and order.payment_id:
        from ..services.yookassa import get_payment_info

        info = get_payment_info(order.payment_id)
        if info is not None:
            order.yookassa_status = info['status']

            if info['status'] == 'succeeded':
                order.status = Order.Status.CONFIRMED
            elif info['status'] == 'canceled':
                order.status = Order.Status.CANCELLED

            order.save(update_fields=['status', 'yookassa_status'])

    return Response(OrderReadSerializer(order).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def dismiss_order(request, order_id):
    """Скрыть отменённый заказ из активных (dismiss), не меняя статус.

    Вызывается фронтендом, когда пользователь нажал «Заказать снова»
    в трекере отменённого заказа — подтвердил, что увидел отмену,
    и хочет начать новый заказ. После этого /orders/active/ больше
    не вернёт этот заказ, но оригинальный статус (cancelled)
    сохраняется для аналитики.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if order.user_id is not None and order.user_id != request.user.id:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if order.status != Order.Status.CANCELLED:
        return Response(
            {'detail': 'Only cancelled orders can be dismissed'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    order.dismissed = True
    order.save(update_fields=['dismissed'])

    return Response({'success': True})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, order_id):
    """Отменить заказ пользователем.

    Доступно только для заказов в статусах awaiting_payment / unpaid / pending.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if order.user_id is not None and order.user_id != request.user.id:
        return Response(
            {'detail': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    cancellable_statuses = [
        Order.Status.AWAITING_PAYMENT,
        Order.Status.UNPAID,
        Order.Status.PENDING,
    ]
    if order.status not in cancellable_statuses:
        return Response(
            {'detail': 'Заказ уже нельзя отменить'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    order.status = Order.Status.CANCELLED
    order.cancel_reason = 'Отменён пользователем'
    order.save(update_fields=['status', 'cancel_reason'])

    return Response({'success': True})
