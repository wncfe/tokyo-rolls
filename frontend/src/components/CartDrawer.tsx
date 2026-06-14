import { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Store, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CartItem, MenuItem, RestaurantSettings, CheckoutData } from '../types';
import { submitOrder, validatePromo } from '../api';
import DadataAddressInput from './DadataAddressInput';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (itemId: string) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
  isOpenStatus: boolean;
  settings: RestaurantSettings;
  orderType: 'delivery' | 'pickup';
  onOrderTypeChange: (type: 'delivery' | 'pickup') => void;
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
  orderType,
  onOrderTypeChange,
}: CartDrawerProps) {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState<{ discount_percent: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((count, item) => count + item.quantity, 0);
  const pickupDiscount = orderType === 'pickup' ? Math.round(subtotal * 0.1) : 0;
  const totalPrice = subtotal - pickupDiscount;

  const handlePromoApply = async () => {
    setPromoError(null);
    const code = promoCode.trim();
    if (!code) {
      setPromoData(null);
      return;
    }
    try {
      const result = await validatePromo(code);
      setPromoData(result);
    } catch (err: any) {
      setPromoError(err.message || 'Неверный промокод');
      setPromoData(null);
    }
  };

  const handleCheckout = async () => {
    setOrderError(null);
    setIsSubmitting(true);
    try {
      const items: CheckoutData['items'] = cart.map(item => {
        const product = item.product;
        // Distinguish Product from Set: Product has 'category', Set has 'includedProducts'
        if ('category' in product) {
          return { product_slug: product.id, quantity: item.quantity };
        } else {
          return { set_slug: product.id, quantity: item.quantity };
        }
      });

      const orderData: CheckoutData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: orderType === 'delivery' ? deliveryAddress : undefined,
        comment: '',
        promo_code: promoData ? promoCode.trim() : '',
        order_type: orderType,
        items,
      };

      await submitOrder(orderData);
      setOrderSuccess(true);
    } catch (err: any) {
      setOrderError(err.message || 'Ошибка при оформлении заказа');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* ORDER TYPE TOGGLE */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 select-none">
            <button
              onClick={() => onOrderTypeChange('delivery')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                orderType === 'delivery'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span>Доставка</span>
            </button>
            <button
              onClick={() => onOrderTypeChange('pickup')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                orderType === 'pickup'
                  ? 'bg-[#E11D48] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Store className="w-4 h-4 shrink-0" />
              <span>Самовывоз –10%</span>
            </button>
          </div>
          {orderType === 'pickup' && settings.restaurant_address && (
            <p className="mt-2 text-[10px] text-slate-500 text-center font-medium">
              🥡 Самовывоз: {settings.restaurant_address}
            </p>
          )}
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
          const promoDiscountAmount = promoData ? Math.round(subtotal * promoData.discount_percent / 100) : 0;
          const effectiveTotal = totalPrice - promoDiscountAmount;
          const isTooLow = effectiveTotal < minOrder;
          const isAddressEmpty = orderType === 'delivery' && deliveryAddress.trim().length === 0;
          const isNameEmpty = customerName.trim().length === 0;
          const isPhoneEmpty = customerPhone.trim().length < 7;
          const canCheckout = isOpenStatus && !isTooLow && !isAddressEmpty && !isNameEmpty && !isPhoneEmpty && !isSubmitting;

          let btnText = "Оформить заказ";
          let btnClasses = "w-full py-4 font-bold text-xs md:text-sm uppercase rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 border border-transparent select-none";

          if (isSubmitting) {
            btnText = "Оформляем...";
            btnClasses += " bg-slate-700 text-white cursor-wait";
          } else if (!isOpenStatus) {
            btnText = `Заказы принимаются с ${settings.opening_hour}:00`;
            btnClasses += " bg-orange-100 border border-orange-200 text-orange-600 cursor-not-allowed opacity-90";
          } else if (isTooLow) {
            btnText = `Минималка ${minOrder} ₽ • Ещё ${minOrder - effectiveTotal} ₽`;
            btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
          } else if (isNameEmpty) {
            btnText = "Укажите имя";
            btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
          } else if (isPhoneEmpty) {
            btnText = "Укажите телефон";
            btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
          } else if (isAddressEmpty) {
            btnText = "Укажите адрес доставки";
            btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
          } else {
            btnClasses += " bg-slate-950 hover:bg-slate-800 text-white shadow-xl hover:shadow-slate-200 active:scale-98 cursor-pointer";
          }

          return (
            <div className="p-5 border-t border-slate-100 bg-white">
              {/* Success state */}
              {orderSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-fadeIn">
                  <CheckCircle className="w-14 h-14 text-emerald-500 mb-4" />
                  <h3 className="text-slate-900 font-black text-xl mb-1">Заказ оформлен! 🎉</h3>
                  <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-4">
                    Мы уже начали готовить ваш заказ. Скоро с вами свяжется оператор.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              ) : (
                <>
                  {/* Order error */}
                  {orderError && (
                    <div className="mb-4 bg-red-50 border border-red-200 p-3.5 rounded-2xl text-xs flex items-start gap-2 text-red-800 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Customer name / phone inputs */}
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ваше имя"
                      className="w-full px-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Телефон (например +7 999 123-45-67)"
                      className="w-full px-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Conditional alerts */}
                  {!isOpenStatus ? (
                    <div className="mb-4 bg-orange-50 border border-orange-100/70 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-orange-800 select-none animate-fadeIn">
                      <span className="font-bold flex items-center gap-1.5">⏳ Ресторан закрыт</span>
                      <span>Принимаем онлайн-заказы ежедневно с {settings.opening_hour}:00 до {settings.closing_hour}:00.</span>
                    </div>
                  ) : isTooLow ? (
                    <div className="mb-4 bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-[#E11D48] select-none animate-fadeIn">
                      <span className="font-bold flex items-center gap-1.5">🍅 Минимальная сумма заказа</span>
                      <span>Добавь в корзину блюд еще на <strong className="font-black">{(minOrder - effectiveTotal).toLocaleString('ru-RU')} ₽</strong> для оформления заказа.</span>
                    </div>
                  ) : isAddressEmpty ? (
                    <div className="mb-4 bg-amber-50 border border-amber-100/70 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-amber-800 select-none animate-fadeIn">
                      <span className="font-bold flex items-center gap-1.5">📍 Укажите адрес доставки</span>
                      <span>Начните вводить улицу и дом — мы подскажем точный адрес для курьера.</span>
                    </div>
                  ) : orderType === 'pickup' ? (
                    <div className="mb-4 bg-violet-50 border border-violet-100/70 p-3.5 rounded-2xl text-xs text-violet-800 flex flex-col gap-0.5 animate-fadeIn">
                      <span className="font-bold text-violet-900">🥡 Самовывоз из ресторана</span>
                      <p className="text-[11px] text-violet-700 leading-tight">Забери заказ сам — скидка 10% на всё меню уже учтена в итоговой сумме.</p>
                    </div>
                  ) : (
                    <div className="mb-4 bg-emerald-50 border border-emerald-100/70 p-3.5 rounded-2xl text-xs text-emerald-800 flex flex-col gap-0.5 animate-fadeIn">
                      <span className="font-bold text-emerald-900">✨ Доставка бесплатная!</span>
                      <p className="text-[11px] text-emerald-700 leading-tight">Для отдаленных и загородных районов стоимость курьера составит от {settings.suburban_delivery_fee} ₽.</p>
                    </div>
                  )}

                  {/* Delivery Address Input (only for delivery) */}
                  {orderType === 'delivery' && (
                    <div className="mb-4">
                      <DadataAddressInput
                        value={deliveryAddress}
                        onChange={setDeliveryAddress}
                      />
                    </div>
                  )}

                  {/* Promo Code */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoError(null); }}
                        placeholder="Промокод (например TOKYO10)"
                        className="flex-1 px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all uppercase"
                      />
                      <button
                        type="button"
                        onClick={handlePromoApply}
                        disabled={!promoCode.trim()}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Применить
                      </button>
                    </div>
                    {promoError && (
                      <p className="mt-1.5 text-[10px] text-red-500 font-medium">{promoError}</p>
                    )}
                    {promoData && (
                      <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">
                        ✅ {promoData.description || `Промокод на ${promoData.discount_percent}%`} применён!
                      </p>
                    )}
                  </div>

                  {/* Split Price summary */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                      <span>Итого товаров</span>
                      <span className="font-mono text-slate-600 font-medium">{totalItems} шт</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                        <span>Доставка по Перми</span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]">БЕСПЛАТНО</span>
                      </div>
                    )}
                    {orderType === 'pickup' && pickupDiscount > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                        <span>Скидка за самовывоз (10%)</span>
                        <span className="text-violet-700 bg-violet-50 border border-violet-100/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10px]">−{pickupDiscount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    {promoData && promoDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-xs text-slate-400 select-none">
                        <span>Промокод ({promoData.discount_percent}%)</span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10px]">−{promoDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-900 text-sm font-bold select-none">Общая сумма:</span>
                      <span className="text-[#E11D48] text-xl font-mono font-black tracking-tight">
                        {effectiveTotal.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>

                  {/* Checkout Action Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={!canCheckout}
                    className={btnClasses}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      btnText
                    )}
                    {canCheckout && !isSubmitting && <ArrowRight className="w-4 h-4 shrink-0" />}
                  </button>
                </>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
