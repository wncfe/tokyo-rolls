import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import CategoryNav from "./components/CategoryNav";
import ProductModal from "./components/ProductModal";
import CartDrawer from "./components/CartDrawer";
import AuthModal from "./components/AuthModal";
import HeroBanner from "./components/HeroBanner";
import MenuSections from "./components/MenuSections";
import OrderTrackerDrawer from "./components/OrderTrackerDrawer";
import OrderTrackerButton from "./components/OrderTrackerButton";
import ErrorBoundary from "./components/ErrorBoundary";
import LogoutConfirmModal from "./components/LogoutConfirmModal";
import { MenuItem } from "./types";
import { useCart } from "./hooks/useCart";
import { useAuth } from "./hooks/useAuth";
import { useMenu } from "./hooks/useMenu";
import { useScrollSpy } from "./hooks/useScrollSpy";
import { useRestaurantStatus } from "./hooks/useRestaurantStatus";
import { useActiveOrder } from "./hooks/useActiveOrder";
import { fetchOrderDetail, dismissOrder } from "./api";

export default function App() {
  // Hooks
  const { cart, addToCart, removeFromCart, clearItem, clearCart, getQuantity } = useCart();
  const { user, addresses, loginWithPhone, verifyPhoneCode, logout, refreshAddresses } = useAuth();
  const {
    menuData,
    isLoadingMenu,
    menuError,
    restaurantSettings,
    getProductsByCategory,
    findProductById,
  } = useMenu();
  const isRestaurantOpen = useRestaurantStatus(restaurantSettings);
  const { activeCategory, activeSubcategory, navigateTo } = useScrollSpy();
  const { activeOrder, isLoading: isActiveOrderLoading, refreshActiveOrder, setActiveOrder } = useActiveOrder();

  // UI state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");

  // YooKassa payment return: detect ?order_id=N in URL → auto-open tracker
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('order_id');
    const pendingId = localStorage.getItem('tokyo-rolls-pending-order-id');

    const orderIdToCheck = oid || pendingId;

    if (orderIdToCheck && !isNaN(Number(orderIdToCheck))) {
      // Clean URL
      window.history.replaceState({}, '', '/');
      // Fetch order and open tracker
      fetchOrderDetail(Number(orderIdToCheck)).then((order) => {
        refreshActiveOrder();
        setIsTrackerOpen(true);
        // Clear cart only if payment already confirmed
        const paidStatuses = ['confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'completed'];
        if (paidStatuses.includes(order.status)) {
          localStorage.removeItem('tokyo-rolls-cart');
          localStorage.removeItem('tokyo-rolls-pending-order-id');
        }
      }).catch(() => {
        // silently ignore — order may not exist yet, or user not authenticated
      });
    } else if (activeOrder) {
      // Auto-open tracker on page load if active order exists
      setIsTrackerOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Handle bfcache restoration (user presses Back after YooKassa redirect)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page restored from back-forward cache — check for pending order
        const pendingId = localStorage.getItem('tokyo-rolls-pending-order-id');
        if (pendingId && !isNaN(Number(pendingId))) {
          refreshActiveOrder();
          setIsTrackerOpen(true);
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [refreshActiveOrder]);

  // ── Scroll lock for modals ──
  useEffect(() => {
    if (isCartOpen || isTrackerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen, isTrackerOpen]);

  // ── Order success: refresh active order and open tracker ──
  const handleOrderSuccess = useCallback(async () => {
    setIsCartOpen(false);
    await refreshActiveOrder();
    setIsTrackerOpen(true);
  }, [refreshActiveOrder]);

  // ── Reorder after cancellation: dismiss → close tracker → open cart ──
  const handleReorder = useCallback(() => {
    const orderId = activeOrder?.id;
    if (orderId) {
      dismissOrder(orderId).catch(() => {});
    }
    setIsTrackerOpen(false);
    setActiveOrder(null);
    setIsCartOpen(true);
  }, [activeOrder?.id]);

  // Auth handlers (passwordless)
  // Logout confirmation
  const handleLogoutClick = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutConfirmOpen(false);
  };

  const handleRequestCode = async (phone: string) => {
    await loginWithPhone(phone);
  };

  const handleVerifyCode = async (phone: string, code: string) => {
    await verifyPhoneCode(phone, code);
    setIsAuthModalOpen(false);
    // After login — reload active order (could be a different user session)
    refreshActiveOrder();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white pb-32">
      <Header
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogoutClick}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
      />
      <CategoryNav
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        onSelectCategory={navigateTo}
      />
      <ErrorBoundary>
        <HeroBanner isOpen={isRestaurantOpen} settings={restaurantSettings} />
      </ErrorBoundary>
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {isLoadingMenu && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#E11D48] animate-spin mb-5" />
            <p className="text-slate-500 text-sm font-medium">Загружаем меню...</p>
          </div>
        )}
        {!isLoadingMenu && menuError && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <span className="text-2xl">😕</span>
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-1">Не удалось загрузить меню</h3>
            <p className="text-slate-500 text-sm max-w-md mb-4">{menuError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              Попробовать снова
            </button>
          </div>
        )}
        {!isLoadingMenu && !menuError && (
          <ErrorBoundary>
            <MenuSections
              menuData={menuData}
              getProductsByCategory={getProductsByCategory}
              getQuantity={getQuantity}
              onAddToCart={addToCart}
              onRemoveFromCart={removeFromCart}
              onClickCard={setSelectedProduct}
            />
          </ErrorBoundary>
        )}
      </main>
      {/* Unified button: cart or tracker — hidden while loading to avoid flicker */}
      {!isActiveOrderLoading && !isCartOpen && !isTrackerOpen && (
        <OrderTrackerButton
          activeOrder={activeOrder}
          cart={cart}
          orderType={orderType}
          restaurantSettings={restaurantSettings}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenTracker={() => setIsTrackerOpen(true)}
        />
      )}

      {/* Order Tracker Drawer */}
      {activeOrder && restaurantSettings && (
        <OrderTrackerDrawer
          isOpen={isTrackerOpen}
          onClose={() => {
            setIsTrackerOpen(false);
            // Для cancelled/completed не сбрасываем activeOrder —
            // статус-бар остаётся, пока пользователь не нажмёт
            // «Заказать снова». Для остальных статусов обновляем.
            const isFinished = activeOrder.status === 'cancelled' || activeOrder.status === 'completed';
            if (!isFinished) {
              refreshActiveOrder();
            }
          }}
          onReorder={handleReorder}
          order={activeOrder}
          settings={restaurantSettings}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        isOpenStatus={isRestaurantOpen}
        settings={restaurantSettings}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
        user={user}
        addresses={addresses}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onRefreshAddresses={refreshAddresses}
        onAddToCart={(id) => {
          const prod = findProductById(id);
          if (prod) addToCart(prod);
        }}
        onRemoveFromCart={removeFromCart}
        onClearItem={clearItem}
        onClearCart={clearCart}
        activeOrder={activeOrder}
        onOrderSuccess={handleOrderSuccess}
        onOpenTracker={() => {
          setIsCartOpen(false);
          setIsTrackerOpen(true);
        }}
      />
      <ProductModal
        isOpen={selectedProduct !== null}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        cartQuantity={selectedProduct ? getQuantity(selectedProduct.id) : 0}
        onAddToCart={() => selectedProduct && addToCart(selectedProduct)}
        onRemoveFromCart={() => selectedProduct && removeFromCart(selectedProduct.id)}
      />
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onRequestCode={handleRequestCode}
        onVerifyCode={handleVerifyCode}
      />
    </div>
  );
}
