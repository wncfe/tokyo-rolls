import { X, Loader2 } from 'lucide-react';
import { OrderDetail } from '../types';
import { useOrderTracking, getStatusLabel, getStatusColor } from '../hooks/useOrderTracking';
import { RestaurantSettings } from '../types';
import PaymentTimer from './PaymentTimer';
import OrderTimeline from './OrderTimeline';

interface OrderTrackerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail;
  settings: RestaurantSettings;
}

export default function OrderTrackerDrawer({
  isOpen,
  onClose,
  order: initialOrder,
  settings,
}: OrderTrackerDrawerProps) {
  const {
    order,
    timelineSteps,
    timeRemaining,
    isPaymentExpired,
    pollError,
  } = useOrderTracking(initialOrder.id);

  const currentOrder = order ?? initialOrder;
  const isAwaitingPayment = currentOrder.status === 'awaiting_payment' || currentOrder.status === 'unpaid';
  const isCancelled = currentOrder.status === 'cancelled';
  const isCompleted = currentOrder.status === 'completed';
  const statusLabel = getStatusLabel(currentOrder.status, currentOrder.order_type);
  const statusColor = getStatusColor(currentOrder.status);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slideIn"
      >
        {/* HEADER */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 select-none">
            <div className="relative">
              <Loader2 className="w-5 h-5 text-[#E11D48] animate-spin" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-slate-900 text-lg font-black tracking-tight leading-none">
                Заказ №{currentOrder.id}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusColor }}
                />
                <span className="text-xs font-bold text-slate-500" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer select-none border border-slate-200/50"
            title="Закрыть"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {/* Payment Timer — только когда awaiting_payment */}
          {isAwaitingPayment && (
            <div className="border-b border-slate-100 bg-slate-50/50">
              <PaymentTimer timeRemaining={timeRemaining} isExpired={isPaymentExpired} />
            </div>
          )}

          {/* Order Timeline — after payment or for non-online */}
          <div className="border-b border-slate-100">
            <OrderTimeline steps={timelineSteps} />
          </div>

          {/* Poll error */}
          {pollError && (
            <div className="px-5 py-2">
              <p className="text-xs text-rose-500 bg-rose-50 rounded-lg px-3 py-2">
                ⚠ {pollError}
              </p>
            </div>
          )}

          {/* Cancelled notice */}
          {isCancelled && (
            <div className="px-5 py-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
                <p className="text-rose-700 font-bold text-sm mb-1">Заказ отменён</p>
                <p className="text-rose-500 text-xs leading-relaxed">
                  Средства не списаны. Попробуйте оформить заказ заново.
                </p>
              </div>
            </div>
          )}

          {/* Completed notice */}
          {isCompleted && (
            <div className="px-5 py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-emerald-700 font-bold text-sm mb-1">Заказ выполнен ✅</p>
                <p className="text-emerald-500 text-xs leading-relaxed">Спасибо за заказ!</p>
              </div>
            </div>
          )}

          {/* Order Items — компактный read-only список */}
          {currentOrder.items && currentOrder.items.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">
                Состав заказа
              </h3>
              <div className="space-y-2">
                {currentOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-slate-100 text-slate-500 text-xs font-mono px-1.5 py-0.5 rounded">
                        {item.quantity}
                      </span>
                      <span className="text-slate-700 truncate font-medium">{item.product_name}</span>
                    </div>
                    <span className="text-slate-500 text-xs font-mono ml-3 shrink-0">
                      {item.line_total.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price summary */}
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="space-y-1.5 text-sm">
              {currentOrder.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Скидка</span>
                  <span className="font-mono">
                    −{currentOrder.discount_amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              {currentOrder.order_type === 'delivery' && currentOrder.delivery_fee > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Доставка</span>
                  <span className="font-mono">
                    {currentOrder.delivery_fee.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              {currentOrder.order_type === 'delivery' && currentOrder.delivery_fee === 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Доставка</span>
                  <span className="font-mono font-bold">Бесплатно</span>
                </div>
              )}
              <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-150">
                <span>Итого</span>
                <span className="font-mono text-base">
                  {currentOrder.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>

          {/* Delivery address (if present) */}
          {currentOrder.order_type === 'delivery' && currentOrder.delivery_address && (
            <div className="px-5 pb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 select-none">
                Адрес доставки
              </h3>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
                {currentOrder.delivery_address}
              </p>
            </div>
          )}
        </div>

        {/* FOOTER — buttons */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          {isCancelled || isCompleted ? (
            <button
              onClick={() => {
                onClose();
                // После закрытия — можно открыть корзину для нового заказа
              }}
              className="w-full px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer select-none"
            >
              Заказать снова
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer select-none border border-slate-200"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
