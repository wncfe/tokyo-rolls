import { CheckCircle } from 'lucide-react';

interface OrderSuccessProps {
  onClose: () => void;
}

export default function OrderSuccess({ onClose }: OrderSuccessProps) {
  return (
    <div className="p-5 border-t border-slate-100 bg-white">
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
    </div>
  );
}
