import { useState, useEffect } from 'react';
import { Phone, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCode: (phone: string) => Promise<void>;
  onVerifyCode: (phone: string, code: string) => Promise<void>;
}

export default function AuthModal({ isOpen, onClose, onRequestCode, onVerifyCode }: AuthModalProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const resetForms = () => {
    setPhone('');
    setCode('');
    setError(null);
    setStep('phone');
  };

  useEffect(() => {
    if (isOpen) resetForms();
  }, [isOpen]);

  if (!isOpen) return null;

  // Phone mask: raw input → +7 (XXX) XXX-XX-XX
  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    let out = '+7';
    if (digits.length > 1) out += ' (' + digits.slice(1, 4);
    if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
    if (digits.length >= 8) out += '-' + digits.slice(7, 9);
    if (digits.length >= 10) out += '-' + digits.slice(9, 11);
    return out;
  };

  const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
  const isPhoneValid = PHONE_RE.test(phone.trim());
  const isCodeValid = code.trim().length === 4 && /^\d{4}$/.test(code.trim());

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid) return;
    setError(null);
    setLoading(true);
    try {
      await onRequestCode(phone.trim());
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValid) return;
    setError(null);
    setLoading(true);
    try {
      await onVerifyCode(phone.trim(), code.trim());
      resetForms();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setCode('');
    setLoading(true);
    try {
      await onRequestCode(phone.trim());
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'14\' fill=\'black\'/%3E%3Cpath d=\'M11 11 L21 21 M21 11 L11 21\' stroke=\'white\' stroke-width=\'3\' stroke-linecap=\'round\'/%3E%3C/svg%3E"), auto' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: 'default' }}
        className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4 border-b border-slate-100">
          {step === 'code' && (
            <button
              onClick={() => { setStep('phone'); setError(null); setCode(''); }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-slate-900 text-lg font-black tracking-tight">
              {step === 'phone' ? 'Вход по номеру' : 'Код подтверждения'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {step === 'phone'
                ? 'Введите номер телефона для входа'
                : `Код отправлен на ${phone}`}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Phone input */}
        {step === 'phone' && (
          <form onSubmit={handleRequestCode} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Телефон
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !isPhoneValid}
              className="w-full mt-2 py-3 bg-[#E11D48] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Отправляем...</>
              ) : (
                'Получить код'
              )}
            </button>
          </form>
        )}

        {/* Step 2: Code input */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Код из SMS
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 tracking-[0.5em] text-center font-mono text-lg focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !isCodeValid}
              className="w-full mt-2 py-3 bg-[#E11D48] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Проверяем...</>
              ) : (
                'Подтвердить'
              )}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="text-center text-xs text-slate-400 hover:text-[#E11D48] transition-colors cursor-pointer disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Повторно через ${resendCooldown} с`
                : 'Отправить код повторно'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
