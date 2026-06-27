import { X, Loader2, ImageIcon } from 'lucide-react';
import { OrderDetail, RestaurantSettings } from '../types';
import { useOrderTracking, getStatusLabel, getStatusColor, getOrderProgress, getEstimatedMinutes } from '../hooks/useOrderTracking';
import PaymentTimer from './PaymentTimer';
import OrderTimeline from './OrderTimeline';

interface OrderTrackerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onReorder?: () => void;
  order: OrderDetail;
  settings: RestaurantSettings;
}

export default function OrderTrackerDrawer({
  isOpen,
  onClose,
  onReorder,
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
  const progress = getOrderProgress(currentOrder.status);
  const estimatedMin = getEstimatedMinutes(
    currentOrder,
    settings.delivery_time_min ?? 30,
    settings.delivery_time_max ?? 60,
  );

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

          {/* Order Progress — бар с шариками + SVG иконками */}
          <div className="border-b border-slate-100">
            <OrderTimeline
              steps={timelineSteps}
              statusLabel={statusLabel}
              status={currentOrder.status}
              estimatedMinutes={estimatedMin}
            />
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

          {/* Order Items — карточки с изображениями */}
          {currentOrder.items && currentOrder.items.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 select-none">
                Состав заказа
              </h3>
              <div className="space-y-3">
                {currentOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 select-none"
                  >
                    {/* Картинка товара */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>
                    {/* Инфо */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate leading-tight">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500 font-medium">×{item.quantity}</span>
                      </div>
                    </div>
                    {/* Цена */}
                    <span className="text-sm font-mono font-bold text-slate-700 shrink-0">
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
                if (onReorder) {
                  onReorder();
                } else {
                  onClose();
                }
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
