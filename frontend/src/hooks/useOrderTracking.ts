import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderDetail, TimelineStep } from '../types';
import { fetchOrderDetail } from '../api';

// 10 минут на оплату
const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────

/** Человеческий лейбл статуса для кнопки трекера. */
export function getStatusLabel(status: string, orderType: 'delivery' | 'pickup'): string {
  switch (status) {
    case 'unpaid':
    case 'awaiting_payment':
      return 'Не оплачен';
    case 'pending':
    case 'confirmed':
      return 'Принят';
    case 'preparing':
      return 'Готовим';
    case 'delivering':
      return 'В пути';
    case 'ready':
      return orderType === 'pickup' ? 'Готов' : 'В пути';
    case 'delivered':
      return 'Доставлен';
    case 'completed':
      return 'Выполнен';
    case 'cancelled':
      return 'Отменён';
    default:
      return status;
  }
}

/** Цветовой код статуса для индикатора. */
export function getStatusColor(status: string): string {
  if (status === 'awaiting_payment' || status === 'unpaid') return '#EF4444';   // red
  if (status === 'cancelled') return '#6B7280';                                 // gray
  if (status === 'preparing' || status === 'pending' || status === 'confirmed') return '#F59E0B'; // amber
  if (status === 'delivering' || status === 'ready') return '#3B82F6';          // blue
  if (status === 'delivered' || status === 'completed') return '#10B981';       // green
  return '#6B7280';
}

/** Примерное время до завершения (в минутах). */
export function getEstimatedMinutes(order: OrderDetail, deliveryTimeMin: number, deliveryTimeMax: number): number {
  if (order.status === 'completed' || order.status === 'cancelled') return 0;
  // Если готовится или в доставке — используем deliveryTimeMax
  const base = order.order_type === 'delivery' ? deliveryTimeMax : deliveryTimeMin;
  // Чем дальше по статусу, тем меньше оставшееся время
  const progressMap: Record<string, number> = {
    'unpaid': 1.0,
    'awaiting_payment': 1.0,
    'pending': 1.0,
    'confirmed': 0.75,
    'preparing': 0.5,
    'delivering': 0.25,
    'ready': 0.1,
  };
  const factor = progressMap[order.status] ?? 0.5;
  return Math.round(base * factor);
}

/** Прогресс заказа от 0 до 100 процентов. */
export function getOrderProgress(status: string): number {
  const map: Record<string, number> = {
    'unpaid': 0,
    'awaiting_payment': 5,
    'pending': 10,
    'confirmed': 25,
    'preparing': 50,
    'ready': 75,
    'delivering': 75,
    'delivered': 100,
    'completed': 100,
    'cancelled': 0,
  };
  return map[status] ?? 0;
}

/** Построить цепочку таймлайна на основе статуса и типа заказа. */
function buildTimeline(order: OrderDetail): TimelineStep[] {
  const isDelivery = order.order_type === 'delivery';
  const statuses = isDelivery
    ? ['pending', 'confirmed', 'preparing', 'delivering', 'delivered']
    : ['pending', 'confirmed', 'preparing', 'ready'];

  const labels: Record<string, string> = {
    pending: 'Принят',
    confirmed: 'Оплачен',
    preparing: 'Готовится',
    delivering: 'В доставке',
    delivered: 'Доставлен',
    ready: 'Можно забирать',
  };

  const icons: Record<string, string> = {
    pending: '📋',
    confirmed: '💳',
    preparing: '👨‍🍳',
    delivering: '🚗',
    delivered: '✅',
    ready: '🥡',
  };

  const currentIdx = statuses.indexOf(order.status);

  // Если заказ отменён — все шаги будущие кроме первого
  if (order.status === 'cancelled') {
    return statuses.map((key, idx) => ({
      key,
      label: labels[key] || key,
      icon: icons[key] || '○',
      isCompleted: false,
      isCurrent: false,
    }));
  }

  return statuses.map((key, idx) => ({
    key,
    label: labels[key] || key,
    icon: icons[key] || '○',
    isCompleted: idx < currentIdx,
    isCurrent: idx === currentIdx,
  }));
}

// ─── Hook ───────────────────────────────────────────────────

export function useOrderTracking(orderId: number | null) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await fetchOrderDetail(orderId);
      setOrder(data);
      setPollError(null);

      if (data.status === 'cancelled' || data.status === 'completed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (err: any) {
      setPollError(err.message || 'Ошибка загрузки статуса');
    }
  }, [orderId]);

  // Polling
  useEffect(() => {
    if (!orderId) return;
    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, poll]);

  // Update timeline when order changes
  useEffect(() => {
    if (order) setTimelineSteps(buildTimeline(order));
    else setTimelineSteps([]);
  }, [order?.id, order?.status, order?.order_type]);

  // Payment countdown timer
  useEffect(() => {
    if (!order) return;
    if (order.status !== 'awaiting_payment' && order.status !== 'unpaid') {
      setTimeRemaining(0);
      setIsPaymentExpired(false);
      return;
    }

    const createdAt = new Date(order.created_at).getTime();
    const update = () => {
      const elapsed = Date.now() - createdAt;
      const remaining = Math.max(0, PAYMENT_TIMEOUT_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        setIsPaymentExpired(true);
        poll();
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [order?.created_at, order?.status, order?.id, poll]);

  return { order, timelineSteps, timeRemaining, isPaymentExpired, pollError };
}
