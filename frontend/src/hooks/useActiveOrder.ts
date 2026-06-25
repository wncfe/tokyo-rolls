import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderDetail } from '../types';
import { fetchActiveOrder } from '../api';

export function useActiveOrder() {
  const [activeOrder, setActiveOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshActiveOrder = useCallback(async () => {
    try {
      const order = await fetchActiveOrder();
      setActiveOrder(order);
    } catch {
      // Если не авторизован или ошибка — сбрасываем в null
      setActiveOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActiveOrder();
  }, [refreshActiveOrder]);

  // Poll while there's an active order so the button stays in sync
  useEffect(() => {
    const isFinished = !activeOrder
      || activeOrder.status === 'completed'
      || activeOrder.status === 'cancelled';

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isFinished) return;

    intervalRef.current = setInterval(refreshActiveOrder, 5000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeOrder?.id, activeOrder?.status, refreshActiveOrder]);

  return { activeOrder, isLoading, refreshActiveOrder, setActiveOrder };
}
