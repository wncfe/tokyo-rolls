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
  // ── Когда есть активный заказ — glassmorphism bottom bar ──
  if (activeOrder) {
    const statusLabel = getStatusLabel(activeOrder.status, activeOrder.order_type);
    const statusColor = getStatusColor(activeOrder.status);
    const progress = getOrderProgress(activeOrder.status);
    const estimatedMin = getEstimatedMinutes(
      activeOrder,
      restaurantSettings?.delivery_time_min ?? 30,
      restaurantSettings?.delivery_time_max ?? 60,
    );

    const showEstimate = activeOrder.status !== 'cancelled' && estimatedMin > 0;

    return (
      <>
        {/* Mobile: rounded pill bar with breathing room */}
        <div className="fixed bottom-4 left-3 right-3 z-40 md:hidden animate-fadeIn">
          <div
            onClick={onOpenTracker}
            className="bg-white border border-slate-200/70 rounded-2xl shadow-2xl cursor-pointer select-none active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between px-5 py-3.5">
              {/* Left: spinner + order info */}
              <div className="flex items-center gap-3 min-w-0">
                <Loader2 className="w-5 h-5 text-[#E11D48] animate-spin shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                    Заказ №{activeOrder.id}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span
                      className="text-xs font-bold truncate leading-none"
                      style={{ color: statusColor }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: progress bar + time */}
              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
                {showEstimate && (
                  <span className="text-[11px] font-medium text-slate-400 leading-none">
                    ~{estimatedMin} мин
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: solid white floating card (no glass) */}
        <div className="hidden md:block fixed bottom-6 right-6 z-40 animate-scaleUp">
          <div
            onClick={onOpenTracker}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl px-4 py-3 cursor-pointer select-none hover:bg-slate-50 active:scale-[0.97] transition-all max-w-[280px]"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#E11D48] animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span className="text-sm font-bold text-slate-900 truncate leading-tight">
                    Заказ №{activeOrder.id}
                  </span>
                </div>
                <span className="text-xs font-bold leading-none" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
                <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
              </div>
              {showEstimate && (
                <span className="text-xs font-medium text-slate-400 shrink-0 leading-tight">
                  ~{estimatedMin} мин
                </span>
              )}
            </div>
          </div>
        </div>
      </>
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
