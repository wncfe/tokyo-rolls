import { X, ShoppingBag, Truck, Store, ClipboardCheck } from 'lucide-react';
import { CartItem, RestaurantSettings, User, Address, OrderDetail } from '../types';
import { useCartCheckout } from '../hooks/useCartCheckout';
import { useCartAddress } from '../hooks/useCartAddress';
import { getStatusLabel } from '../hooks/useOrderTracking';
import CheckoutFooter from './CheckoutFooter';
import CartItemRow from './CartItemRow';
import CartEmptyState from './CartEmptyState';
import OrderSuccess from './OrderSuccess';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onAddToCart: (itemId: string) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
  onClearCart: () => void;
  isOpenStatus: boolean;
  settings: RestaurantSettings;
  orderType: 'delivery' | 'pickup';
  onOrderTypeChange: (type: 'delivery' | 'pickup') => void;
  user: User | null;
  addresses: Address[];
  onOpenAuth: () => void;
  onRefreshAddresses: () => Promise<void>;
  activeOrder: OrderDetail | null;
  onOpenTracker: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onClearItem,
  onClearCart,
  isOpenStatus,
  settings,
  orderType,
  onOrderTypeChange,
  user,
  addresses,
  onOpenAuth,
  onRefreshAddresses,
  activeOrder,
  onOpenTracker,
}: CartDrawerProps) {
  const checkout = useCartCheckout(isOpen);
  const addr = useCartAddress(addresses);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((count, item) => count + item.quantity, 0);
  const pickupDiscount = orderType === 'pickup' ? Math.floor(subtotal * (settings.pickup_discount_percent ?? 10) / 100) : 0;
  const totalPrice = subtotal - pickupDiscount;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slideIn"
      >
        {/* HEADER — stays fixed at top for close button access */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#E11D48]" />
            <h2 className="text-slate-900 text-xl font-black tracking-tight select-none">
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

        {/* SCROLLABLE BODY — everything scrolls as one unit */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {/* ORDER TYPE TOGGLE */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 select-none">
              <button
                onClick={() => onOrderTypeChange('delivery')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer focus:outline-none ${
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
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer focus:outline-none ${
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
              <p className="mt-2 text-xs text-slate-500 text-center font-medium">
                🥡 Самовывоз: {settings.restaurant_address}
              </p>
            )}
          </div>

          {/* CART LIST OR EMPTY STATE — hidden on order success */}
          {!checkout.orderSuccess && (
            <div className="p-5 space-y-4">
              {cart.length === 0 ? (
                <CartEmptyState onClose={onClose} />
              ) : (
                cart.map((item) => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    onAddToCart={onAddToCart}
                    onRemoveFromCart={onRemoveFromCart}
                    onClearItem={onClearItem}
                  />
                ))
              )}
            </div>
          )}

          {/* FOOTER / ORDER SUCCESS — part of the scroll flow */}
          {checkout.orderSuccess ? (
            <OrderSuccess onClose={onClose} />
          ) : activeOrder && cart.length > 0 ? (
            /* Active order banner — блокирует checkout */
            <div className="p-5 border-t border-slate-100 bg-amber-50">
              <div className="bg-white border border-amber-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ClipboardCheck className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800 font-bold text-sm">
                    Активный заказ №{activeOrder.id}
                  </span>
                </div>
                <p className="text-amber-600 text-xs leading-relaxed mb-3">
                  У вас уже есть заказ в статусе «{getStatusLabel(activeOrder.status, activeOrder.order_type)}».
                  Оформить новый заказ можно после его завершения.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenTracker();
                  }}
                  className="px-5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm rounded-xl transition-all cursor-pointer select-none border border-amber-300"
                >
                  Отслеживать заказ
                </button>
              </div>
            </div>
          ) : cart.length > 0 && (
            <CheckoutFooter
              cart={cart}
              subtotal={subtotal}
              totalItems={totalItems}
              pickupDiscount={pickupDiscount}
              totalPrice={totalPrice}
              settings={settings}
              orderType={orderType}
              isOpenStatus={isOpenStatus}
              user={user}
              addresses={addresses}
              onOpenAuth={onOpenAuth}
              onClearCart={onClearCart}
              onRefreshAddresses={onRefreshAddresses}
              checkout={checkout}
              addr={addr}
            />
          )}
        </div>
      </div>
    </div>
  );
}
