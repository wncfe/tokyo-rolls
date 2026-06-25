import { ArrowRight, AlertCircle, Loader2, ShieldAlert, ChevronDown, Banknote, CreditCard, Globe } from 'lucide-react';
import { CartItem, RestaurantSettings, User, Address, PaymentMethod, DeliveryZoneInfo } from '../types';
import { createAddress, updateAddress, deleteAddress, checkDeliveryZone } from '../api';
import AddressDropdown from './AddressDropdown';
import AddressFormModal from './AddressFormModal';
import { useState, useRef, useEffect } from 'react';

interface CheckoutHook {
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoData: { discount_percent: number; description: string } | null;
  promoError: string | null;
  setPromoError: (v: string | null) => void;
  isSubmitting: boolean;
  orderError: string | null;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  handlePromoApply: () => Promise<void>;
  handleCheckout: (params: {
    cart: CartItem[];
    orderType: 'delivery' | 'pickup';
    selectedAddressId: number | null;
    deliveryAddress: string;
    paymentMethod: PaymentMethod;
    onClearCart: () => void;
  }) => Promise<void>;
}

interface AddressHook {
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  selectedAddressId: number | null;
  setSelectedAddressId: (v: number | null) => void;
  isAddressModalOpen: boolean;
  setIsAddressModalOpen: (v: boolean) => void;
  editingAddress: Address | null;
  setEditingAddress: (v: Address | null) => void;
}

interface CheckoutFooterProps {
  cart: CartItem[];
  subtotal: number;
  totalItems: number;
  pickupDiscount: number;
  totalPrice: number;
  settings: RestaurantSettings;
  orderType: 'delivery' | 'pickup';
  isOpenStatus: boolean;
  user: User | null;
  addresses: Address[];
  onOpenAuth: () => void;
  onClearCart: () => void;
  onRefreshAddresses: () => Promise<void>;
  checkout: CheckoutHook;
  addr: AddressHook;
}

export default function CheckoutFooter({
  cart,
  subtotal,
  totalItems,
  pickupDiscount,
  totalPrice,
  settings,
  orderType,
  isOpenStatus,
  user,
  addresses,
  onOpenAuth,
  onClearCart,
  onRefreshAddresses,
  checkout,
  addr,
}: CheckoutFooterProps) {
  const {
    promoCode, setPromoCode,
    promoData, promoError, setPromoError,
    isSubmitting, orderError,
    paymentMethod, setPaymentMethod,
    handlePromoApply, handleCheckout,
  } = checkout;

  const {
    deliveryAddress, setDeliveryAddress,
    selectedAddressId, setSelectedAddressId,
    isAddressModalOpen, setIsAddressModalOpen,
    editingAddress, setEditingAddress,
  } = addr;

  // ── Zone info ──────────────────────────────────────
  const [zoneInfo, setZoneInfo] = useState<DeliveryZoneInfo | null>(null);
  const [isCheckingZone, setIsCheckingZone] = useState(false);

  useEffect(() => {
    if (!selectedAddressId || orderType !== 'delivery') {
      setZoneInfo(null);
      return;
    }
    let cancelled = false;
    setIsCheckingZone(true);
    checkDeliveryZone(selectedAddressId)
      .then((info) => { if (!cancelled) setZoneInfo(info); })
      .catch(() => { if (!cancelled) setZoneInfo(null); })
      .finally(() => { if (!cancelled) setIsCheckingZone(false); });
    return () => { cancelled = true; };
  }, [selectedAddressId, orderType]);

  // ── Derived values ──────────────────────────────────
  const minOrder = orderType === 'delivery' && zoneInfo
    ? zoneInfo.min_order_amount
    : settings.min_order_amount;
  const promoDiscountAmount = promoData ? Math.round(subtotal * promoData.discount_percent / 100) : 0;
  const effectiveTotal = totalPrice - promoDiscountAmount;
  const isTooLow = effectiveTotal < minOrder;
  const isAddressEmpty = orderType === 'delivery' && !selectedAddressId && deliveryAddress.trim().length === 0;
  const isAuthenticated = !!user;
  const isUndeliverable = orderType === 'delivery' && zoneInfo !== null && !zoneInfo.is_deliverable;
  const canCheckout = isOpenStatus && !isTooLow && !isAddressEmpty && !isSubmitting && isAuthenticated && !isUndeliverable;

  // ── Button text & style ──────────────────────────────
  let btnText = "Оформить заказ";
  let btnClasses = "w-full py-4 font-bold text-xs md:text-sm uppercase rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 border border-transparent select-none";

  if (isSubmitting) {
    btnText = "Оформляем...";
    btnClasses += " bg-slate-700 text-white cursor-wait";
  } else if (!isAuthenticated) {
    btnText = "Авторизоваться";
    btnClasses += " bg-[#E11D48] hover:bg-rose-600 text-white shadow-xl hover:shadow-rose-200 active:scale-98 cursor-pointer";
  } else if (!isOpenStatus) {
    btnText = `Заказы принимаются с ${settings.opening_hour}:00`;
    btnClasses += " bg-orange-100 border border-orange-200 text-orange-600 cursor-not-allowed opacity-90";
  } else if (isUndeliverable) {
    btnText = "Адрес вне зоны доставки";
    btnClasses += " bg-red-100 border border-red-200 text-red-500 cursor-not-allowed";
  } else if (isTooLow) {
    btnText = `Минималка ${minOrder} ₽ • Ещё ${minOrder - effectiveTotal} ₽`;
    btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
  } else if (isAddressEmpty) {
    btnText = "Добавьте адрес доставки";
    btnClasses += " bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed";
  } else {
    btnClasses += " bg-slate-950 hover:bg-slate-800 text-white shadow-xl hover:shadow-slate-200 active:scale-98 cursor-pointer";
  }

  // ── Footer form ──────────────────────────────────────
  return (
    <div className="p-5 bg-white">
      {/* Order error */}
      {orderError && (
        <div className="mb-4 bg-red-50 border border-red-200 p-3.5 rounded-2xl text-xs flex items-start gap-2 text-red-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{orderError}</span>
        </div>
      )}

      {/* Conditional alerts */}
      {!isAuthenticated ? (
        <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold">Авторизуйтесь, чтобы оформить заказ</span>
          </div>
          <p className="text-[10px] text-amber-600 leading-relaxed">
            Войдите по номеру телефона — это займёт меньше минуты. Ваша корзина сохранится.
          </p>
        </div>
      ) : !isOpenStatus ? (
        <div className="mb-4 bg-orange-50 border border-orange-100/70 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-orange-800 select-none animate-fadeIn">
          <span className="font-bold flex items-center gap-1.5">⏳ Ресторан закрыт</span>
          <span>Принимаем онлайн-заказы ежедневно с {settings.opening_hour}:00 до {settings.closing_hour}:00.</span>
        </div>
      ) : isTooLow ? (
        <div className="mb-4 bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-xs flex flex-col gap-1 text-[#E11D48] select-none animate-fadeIn">
          <span className="font-bold flex items-center gap-1.5">🍅 Минимальная сумма заказа</span>
          <span>Добавь в корзину блюд еще на <strong className="font-black">{(minOrder - effectiveTotal).toLocaleString('ru-RU')} ₽</strong> для оформления заказа.</span>
        </div>
      ) : isUndeliverable ? (
        <div className="mb-4 bg-red-50 border border-red-200 p-3.5 rounded-2xl text-xs flex flex-col gap-0.5 text-red-800 animate-fadeIn">
          <span className="font-bold text-red-900">⛔ Адрес вне зоны доставки</span>
          <p className="text-[11px] text-red-700 leading-tight">К сожалению, по этому адресу доставка не осуществляется. Выберите другой адрес.</p>
        </div>
      ) : orderType === 'pickup' ? (
        <div className="mb-4 bg-violet-50 border border-violet-100/70 p-3.5 rounded-2xl text-xs text-violet-800 flex flex-col gap-0.5 animate-fadeIn">
          <span className="font-bold text-violet-900">🥡 Самовывоз из ресторана</span>
          <p className="text-[11px] text-violet-700 leading-tight">Забери заказ сам — скидка {settings.pickup_discount_percent ?? 10}% на всё меню уже учтена в итоговой сумме.</p>
        </div>
      ) : orderType === 'delivery' && zoneInfo ? (
        zoneInfo.zone === 'free_delivery' ? (
          <div className="mb-4 bg-emerald-50 border border-emerald-100/70 p-3.5 rounded-2xl text-xs text-emerald-800 flex flex-col gap-0.5 animate-fadeIn">
            <span className="font-bold text-emerald-900">✨ Доставка бесплатная!</span>
            <p className="text-[11px] text-emerald-700 leading-tight">Вы в зоне бесплатной доставки. Минимальная сумма заказа {zoneInfo.min_order_amount} ₽.</p>
          </div>
        ) : (
          <div className="mb-4 bg-amber-50 border border-amber-100/70 p-3.5 rounded-2xl text-xs text-amber-800 flex flex-col gap-0.5 animate-fadeIn">
            <span className="font-bold text-amber-900">🚚 Доставка: {zoneInfo.delivery_fee} ₽</span>
            <p className="text-[11px] text-amber-700 leading-tight">Вы в зоне платной доставки. Минимальная сумма заказа {zoneInfo.min_order_amount} ₽.</p>
          </div>
        )
      ) : orderType === 'delivery' && isCheckingZone ? (
        <div className="mb-4 bg-slate-50 border border-slate-100/70 p-3.5 rounded-2xl text-xs text-slate-500 flex items-center gap-2 animate-fadeIn">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Проверяем зону доставки...</span>
        </div>
      ) : orderType === 'delivery' && !selectedAddressId ? (
        <div className="mb-4 bg-slate-50 border border-slate-100/70 p-3.5 rounded-2xl text-xs text-slate-500 flex flex-col gap-0.5 animate-fadeIn">
          <span className="font-bold text-slate-600">📍 Выберите адрес доставки</span>
          <p className="text-[11px] leading-tight">Добавьте или выберите сохранённый адрес, чтобы увидеть стоимость доставки.</p>
        </div>
      ) : null}

      {/* Address selection (only for authenticated users + delivery) */}
      {isAuthenticated && orderType === 'delivery' && (
        <AddressDropdown
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onAddNew={() => {
            setEditingAddress(null);
            setIsAddressModalOpen(true);
          }}
          onEdit={(addr) => {
            setEditingAddress(addr);
            setIsAddressModalOpen(true);
          }}
        />
      )}

      {/* Promo Code */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setPromoError(null); }}
            placeholder="Промокод"
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
            ✅ Промокод применён!
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 select-none">
          Способ оплаты
        </label>
        <PaymentMethodDropdown
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      </div>

      {/* Split Price summary */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between text-xs text-slate-400 select-none">
          <span>Итого товаров</span>
          <span className="font-mono text-slate-600 font-medium">{totalItems} шт</span>
        </div>
        {orderType === 'delivery' && (() => {
          const fee = zoneInfo?.delivery_fee;
          if (fee === undefined || fee === null) return null;
          return (
            <div className="flex items-center justify-between text-xs text-slate-400 select-none">
              <span>Доставка</span>
              <span className={fee === 0
                ? "text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px]"
                : "text-amber-700 bg-amber-50 border border-amber-100/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10px]"
              }>
                {fee === 0 ? 'БЕСПЛАТНО' : `${fee} ₽`}
              </span>
            </div>
          );
        })()}
        {orderType === 'pickup' && pickupDiscount > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-400 select-none">
            <span>Скидка за самовывоз ({settings.pickup_discount_percent ?? 10}%)</span>
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
        onClick={!isAuthenticated ? onOpenAuth : () => handleCheckout({ cart, orderType, selectedAddressId, deliveryAddress, paymentMethod, onClearCart })}
        disabled={!canCheckout && isAuthenticated}
        className={btnClasses}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          btnText
        )}
        {canCheckout && !isSubmitting && <ArrowRight className="w-4 h-4 shrink-0" />}
      </button>

      {/* Address Form Modal */}
      <AddressFormModal
        isOpen={isAddressModalOpen}
        address={editingAddress}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={async (data) => {
          if (editingAddress) {
            await updateAddress(editingAddress.id, data);
          } else {
            const addr = await createAddress(data);
            setSelectedAddressId(addr.id);
          }
          await onRefreshAddresses();
        }}
        onDelete={async (id) => {
          await deleteAddress(id);
          if (selectedAddressId === id) setSelectedAddressId(null);
          await onRefreshAddresses();
        }}
      />
    </div>
  );
}

// ── Payment Method Dropdown ──

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'card_online', label: 'Онлайн (карта / СБП)', icon: Globe },
  { value: 'card_delivery', label: 'Картой при получении', icon: CreditCard },
  { value: 'cash', label: 'Наличные', icon: Banknote },
];

function PaymentMethodDropdown({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = PAYMENT_OPTIONS.find(o => o.value === value);
  const Icon = selected?.icon ?? CreditCard;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:border-slate-300 transition-all cursor-pointer"
      >
        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="flex-1 text-left truncate font-medium">
          {selected?.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden animate-fadeIn">
          {PAYMENT_OPTIONS.map(option => {
            const isSelected = option.value === value;
            const IconOpt = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <IconOpt className="w-3.5 h-3.5 shrink-0" />
                <span>{option.label}</span>
                {isSelected && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
