import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem, MenuItem, RestaurantSettings } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (itemId: string) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
  isOpenStatus: boolean;
  settings: RestaurantSettings;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onClearItem,
  isOpenStatus,
  settings,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((count, item) => count + item.quantity, 0);

  const handleCheckout = () => {
    // Collect JSON schema of the active order for demonstrative integration
    const orderData = {
      orderTimestamp: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        totalItemPrice: item.product.price * item.quantity,
        weightGrams: item.product.weight * item.quantity,
      })),
      totalPrice: totalPrice,
      totalCount: totalItems,
    };

    alert(`🎉 Заказ отправлен в обработку!\n\nJSON-структура заказа:\n${JSON.stringify(orderData, null, 2)}`);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
    >
      {/* Sidebar box container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between animate-slideIn"
      >
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#E11D48]" />
            <h2 className="text-slate-900 text-lg font-black tracking-tight select-none">
              Твоя корзина
            </h2>
            {totalItems > 0 && (
              <span className="bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono px-2.5 py-0.5 rounded-full select-none">
                {totalItems} шт
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer select-none border border-slate-200/50"
            title="Закрыть"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* CART LIST OR EMPTY ELEMENT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 select-none animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-200">
                <ShoppingBag className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-bold text-lg mb-1 tracking-tight">Корзина пуста</h3>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                Добавь сочные сеты, свежие суши или запеченные роллы из нашего меню, чтобы оформить доставку!
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 uppercase tracking-wider cursor-pointer"
              >
                Вернуться в меню
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-4 bg-slate-50/50 border border-slate-200/60 p-3 rounded-2xl group transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                {/* Thumb */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 select-none border border-slate-100">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-900 text-xs font-bold truncate tracking-tight mb-0.5 group-hover:text-[#E11D48] transition-colors">
                    {item.product.name}
                  </h4>
                  <p className="text-slate-400 text-[10px] font-mono select-none">
                    {item.product.weight} г • {item.product.price} ₽
                  </p>

                  {/* Pricing and Counters inline row */}
                  <div className="flex items-center justify-between mt-2">
                    {/* Counter widget */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 select-none">
                      <button
                        onClick={() => onRemoveFromCart(item.product.id)}
                        className="w-6.5 h-6.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/40"
                        title="Уменьшить"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-slate-900 font-mono text-xs font-bold min-w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onAddToCart(item.product.id)}
                        className="w-6.5 h-6.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/40"
                        title="Добавить"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Total item amount */}
                    <span className="text-slate-900 font-mono text-xs font-bold">
                      {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>

                {/* Trash option */}
                <button
                  onClick={() => onClearItem(item.product.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-slate-100 transition-all cursor-pointer"
                  title="Удалить позицию"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        {cart.length > 0 && (() => {
          const minOrder = settings.min_order_amount;
          const isTooLow = totalPrice < minOrder;
          const canCheckout = isOpenStatus && !isTooLow;

          let btnText = "Оформить заказ";
          let btnClasses = "w-full py-4 font-bold text-xs md:text-sm uppercase rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 border border-transparent select-none";
          
          if (!isOpenStatus) {
            btnText = `Заказы принимаются с ${settings.opening_hour}:00`;
            btnClasses += " bg-orange-100 border border-orange-200 text-orange-600 cursor-not-allowed opacity-90";
          } else if (isTooLow) {
            btnText = `Минималка ${minOrder} ₽ • Ещё ${minOrder - totalPrice} ₽`;
            btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
          } else {
            btnClasses += " bg-slate-950 hover:bg-slate-800 text-white shadow-xl hover:shadow-slate-200 active:scale-98 cursor-pointer";
          }

          return (
            <div className="p-5 border-t border-slate-100 bg-white">
              {/* Conditional UX descriptive alerts */}
              {!isOpenStatus ? (
                <div className="mb-4 bg-orange-50 border border-orange-100/70 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-orange-800 select-none animate-fadeIn">
                  <span className="font-bold flex items-center gap-1.5">⏳ Ресторан закрыт</span>
                  <span>Принимаем онлайн-заказы ежедневно с {settings.opening_hour}:00 до {settings.closing_hour}:00. Оформление станет доступно в рабочие часы.</span>
                </div>
              ) : isTooLow ? (
                <div className="mb-4 bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-[#E11D48] select-none animate-fadeIn">
                  <span className="font-bold flex items-center gap-1.5">🍅 Минимальная сумма заказа</span>
                  <span>Добавь в корзину блюд еще на <strong className="font-black">{(minOrder - totalPrice).toLocaleString('ru-RU')} ₽</strong> для возможности доставки по городу.</span>
                </div>
              ) : (
                <div className="mb-4 bg-emerald-50 border border-emerald-100/70 p-3.5 rounded-2xl text-xs text-emerald-800 flex flex-col gap-0.5 animate-fadeIn">
                  <span className="font-bold text-emerald-900">✨ Доставка бесплатная!</span>
                  <p className="text-[11px] text-emerald-700 leading-tight">Для отдаленных и загородных районов стоимость курьера составит от {settings.suburban_delivery_fee} ₽.</p>
                </div>
              )}

              {/* Split Price summary */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                  <span>Итого товаров</span>
                  <span className="font-mono text-slate-600 font-medium">{totalItems} шт</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                  <span>Доставка по Перми</span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]">БЕСПЛАТНО</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-900 text-sm font-bold select-none">Общая сумма:</span>
                  <span className="text-[#E11D48] text-xl font-mono font-black tracking-tight">
                    {totalPrice.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                onClick={handleCheckout}
                disabled={!canCheckout}
                className={btnClasses}
              >
                {btnText}
                {canCheckout && <ArrowRight className="w-4 h-4 shrink-0" />}
              </button>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
