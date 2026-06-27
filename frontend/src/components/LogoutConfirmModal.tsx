import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-scaleUp"
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Выйти из аккаунта?
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
              Вы уверены, что хотите выйти? Все несохранённые данные в корзине сохранятся.
            </p>

            {/* Actions */}
            <div className="flex flex-col w-full gap-2.5">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Да, выйти
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                Остаться
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
