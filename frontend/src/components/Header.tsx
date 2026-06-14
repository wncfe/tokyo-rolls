import { User, LogOut, Truck, Store } from 'lucide-react';

interface HeaderProps {
  user: { username: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  orderType: 'delivery' | 'pickup';
  onOrderTypeChange: (type: 'delivery' | 'pickup') => void;
}

export default function Header({ user, onOpenAuth, onLogout, orderType, onOrderTypeChange }: HeaderProps) {

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

          {/* ORDER TYPE TOGGLE */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 select-none">
            <button
              onClick={() => onOrderTypeChange('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                orderType === 'delivery'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Доставка</span>
            </button>
            <button
              onClick={() => onOrderTypeChange('pickup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none ${
                orderType === 'pickup'
                  ? 'bg-white text-[#E11D48] shadow-sm border border-rose-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Самовывоз</span>
            </button>
          </div>
          
          {/* AUTH SECTION */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-medium text-slate-700">
                {user.username}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer select-none"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl text-sm font-medium transition-all select-none cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Войти</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
