import { ShoppingBag } from 'lucide-react';

interface CartEmptyStateProps {
  onClose: () => void;
}

export default function CartEmptyState({ onClose }: CartEmptyStateProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-10 select-none animate-fadeIn">
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
  );
}
