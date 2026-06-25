import { ShoppingBag, Loader2 } from 'lucide-react';
import { CartItem, OrderDetail, RestaurantSettings } from '../types';
import { getStatusLabel, getStatusColor, getOrderProgress, getEstimatedMinutes } from '../hooks/useOrderTracking';

interface OrderTrackerButtonProps {
  activeOrder: OrderDetail | null;
  cart: CartItem[];
  orderType: 'delivery' | 'pickup';
  restaurantSettings: RestaurantSettings | undefined;
  onOpenCart: () => void;
  onOpenTracker: () => void;
}

export default function OrderTrackerButton({
  activeOrder,
  cart,
  orderType,
  restaurantSettings,
  onOpenCart,
  onOpenTracker,
}: OrderTrackerButtonProps) {
  // ── Когда есть активный заказ — показываем трекер-кнопку ──
  if (activeOrder) {
    const statusLabel = getStatusLabel(activeOrder.status, activeOrder.order_type);
    const statusColor = getStatusColor(activeOrder.status);
    const progress = getOrderProgress(activeOrder.status);
    const estimatedMin = getEstimatedMinutes(
      activeOrder,
      restaurantSettings?.delivery_time_min ?? 30,
      restaurantSettings?.delivery_time_max ?? 60,
    );

    // Не показываем примерное время для cancelled (будет 0)
    const showEstimate = activeOrder.status !== 'cancelled' && estimatedMin > 0;

    return (
      <div
        onClick={onOpenTracker}
        className="fixed bottom-4 right-4 z-40 animate-scaleUp cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 text-white rounded-2xl shadow-2xl px-4 py-3 hover:bg-slate-900 active:scale-[0.97] transition-all">
          {/* Spinning loader + order number */}
          <div className="relative shrink-0">
            <Loader2 className="w-5 h-5 text-[#E11D48] animate-spin" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor }}
              />
              <span className="text-sm font-bold tracking-tight text-white">
                Заказ №{activeOrder.id}
              </span>
            </div>
            <span
              className="text-xs font-bold mt-0.5"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </span>

            {/* Прогресс-бар */}
            <div className="mt-1.5 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  backgroundColor: statusColor,
                }}
              />
            </div>

            {/* Примерное время */}
            {showEstimate && (
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                ~{estimatedMin} мин
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Нет активного заказа — обычная кнопка корзины ──
  const hasItems = cart.length > 0;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      onClick={onOpenCart}
      className="fixed bottom-4 right-4 z-40 animate-scaleUp cursor-pointer select-none"
    >
      <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 text-white rounded-full shadow-2xl h-13 px-4 hover:bg-slate-900 active:scale-95 transition-all">
        <div className="relative">
          <ShoppingBag className="w-5 h-5 text-[#E11D48] stroke-[2.2]" />
          {hasItems && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950">
              {cartCount}
            </span>
          )}
        </div>
        {hasItems ? (() => {
          const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          const pickupPct = restaurantSettings?.pickup_discount_percent ?? 10;
          const discount = orderType === 'pickup' ? Math.round(subtotal * pickupPct / 100) : 0;
          const total = subtotal - discount;
          return (
            <span className="font-mono text-sm tracking-tight leading-none pt-0.5">
              {total.toLocaleString('ru-RU')} {'\u20BD'}
            </span>
          );
        })() : (
          <span className="text-xs font-medium tracking-tight">Корзина</span>
        )}
      </div>
    </div>
  );
}
