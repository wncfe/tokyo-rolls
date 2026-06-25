import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchPaymentStatus } from '../api';
import { PaymentStatusResult } from '../types';

interface PaymentResultPageProps {
  orderId: number;
  onClose: () => void;
}

export default function PaymentResultPage({ orderId, onClose }: PaymentResultPageProps) {
  const [result, setResult] = useState<PaymentStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // ~30 seconds at 2s interval

    const poll = async () => {
      try {
        const data = await fetchPaymentStatus(orderId);
        if (cancelled) return;
        setResult(data);

        // Stop polling on success, failure, or max attempts
        if (data.paid) return;
        if (data.status === 'cancelled') return;
        if (++attempts >= MAX_ATTEMPTS) return;

        setTimeout(poll, 2000);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Ошибка проверки статуса');
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center animate-fadeIn">
        {/* Loading state */}
        {!result && !error && (
          <>
            <Loader2 className="w-14 h-14 text-slate-400 mx-auto mb-4 animate-spin" />
            <h2 className="font-black text-lg text-slate-900 mb-1">
              Проверяем статус оплаты…
            </h2>
            <p className="text-slate-500 text-sm">
              Пожалуйста, подождите. Это займёт пару секунд.
            </p>
          </>
        )}

        {/* Paid successfully */}
        {result?.paid && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="font-black text-xl text-emerald-700 mb-1">
              Оплата прошла! ✅
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Заказ <strong className="text-slate-900">№{orderId}</strong> подтверждён и передан в работу. Скоро с вами свяжется оператор.
            </p>
            <button
              onClick={() => {
                // Clean query params from URL without reload
                window.history.replaceState({}, '', '/');
                onClose();
              }}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Вернуться в меню
            </button>
          </>
        )}

        {/* Payment failed / cancelled */}
        {((result && !result.paid) || error) && (
          <>
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="font-black text-xl text-rose-700 mb-1">
              Платёж не прошёл
            </h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {error
                ? 'Не удалось проверить статус оплаты.'
                : result?.status === 'cancelled'
                  ? 'Заказ отменён. Средства не списаны.'
                  : 'Попробуйте оформить заказ заново — выберите другой способ оплаты.'}
            </p>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/');
                onClose();
              }}
              className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Вернуться в меню
            </button>
          </>
        )}
      </div>
    </div>
  );
}
