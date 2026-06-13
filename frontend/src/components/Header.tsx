import { ShoppingBag, User } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
}

export default function Header({ cart, onOpenCart }: HeaderProps) {
  const totalItems = cart.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleLoginClick = () => {
    alert("Окно авторизации по СМС");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO SECTION */}
        <div className="flex items-center gap-3 select-none">
          {/* Custom red circle TOKIO logo based on the reference */}
          <div className="relative group flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-[#E11D48] rounded-full shadow-lg shadow-rose-200/50 transition-transform duration-300 hover:scale-105 active:scale-95">
            <span className="text-white font-extrabold text-[9px] md:text-[10px] tracking-[0.25em] pl-[0.25em] font-sans">
              ТОКИО
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black font-sans text-lg md:text-xl tracking-tight leading-none">
              TOKYO <span className="text-[#E11D48]">ROLLS</span>
            </span>
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono mt-0.5">
              Premium Delivery
            </span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* AUTHENTICATION BUTTON */}
          <button
            id="auth-button"
            onClick={handleLoginClick}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 select-none cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Войти</span>
          </button>

          {/* CART TRIGGER BUTTON */}
          <button
            id="cart-trigger-button"
            onClick={onOpenCart}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer select-none ${
              totalItems > 0
                ? 'bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-lg shadow-rose-200/50 scale-102 hover:scale-105'
                : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="relative mr-0.5">
              <ShoppingBag className="w-5 h-5 text-current stroke-[2.2]" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-white text-[#E11D48] text-[9px] font-black min-w-[17px] h-[17px] px-1.5 rounded-full flex items-center justify-center shadow-md border border-rose-100 select-none leading-none">
                  {totalItems}
                </span>
              )}
            </div>
            
            {totalItems > 0 ? (
              <span className="font-mono text-xs md:text-sm tracking-tight">
                {totalPrice.toLocaleString('ru-RU')} ₽
              </span>
            ) : (
              <span className="text-xs md:text-sm">Корзина</span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
}
