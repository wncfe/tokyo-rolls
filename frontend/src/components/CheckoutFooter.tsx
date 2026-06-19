import { ArrowRight, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { CartItem, RestaurantSettings, User, Address } from '../types';
import { createAddress, updateAddress, deleteAddress } from '../api';
import AddressDropdown from './AddressDropdown';
import AddressFormModal from './AddressFormModal';

interface CheckoutHook {
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoData: { discount_percent: number; description: string } | null;
  promoError: string | null;
  setPromoError: (v: string | null) => void;
  isSubmitting: boolean;
  orderError: string | null;
  handlePromoApply: () => Promise<void>;
  handleCheckout: (params: {
    cart: CartItem[];
    orderType: 'delivery' | 'pickup';
    selectedAddressId: number | null;
    deliveryAddress: string;
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
    handlePromoApply, handleCheckout,
  } = checkout;

  const {
    deliveryAddress, setDeliveryAddress,
    selectedAddressId, setSelectedAddressId,
    isAddressModalOpen, setIsAddressModalOpen,
    editingAddress, setEditingAddress,
  } = addr;

  // ── Derived values ──────────────────────────────────
  const minOrder = settings.min_order_amount;
  const promoDiscountAmount = promoData ? Math.round(subtotal * promoData.discount_percent / 100) : 0;
  const effectiveTotal = totalPrice - promoDiscountAmount;
  const isTooLow = effectiveTotal < minOrder;
  const isAddressEmpty = orderType === 'delivery' && !selectedAddressId && deliveryAddress.trim().length === 0;
  const isAuthenticated = !!user;
  const canCheckout = isOpenStatus && !isTooLow && !isAddressEmpty && !isSubmitting && isAuthenticated;

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
        onClick={!isAuthenticated ? onOpenAuth : () => handleCheckout({ cart, orderType, selectedAddressId, deliveryAddress, onClearCart })}
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
