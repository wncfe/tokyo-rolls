import { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, KeyRound, Loader } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-scaleUp"
      >
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div className="flex items-center space-x-3 mb-2">
                <Smartphone className="h-5 w-5 text-[#E11D48]" />
                <h2 className="text-lg font-bold text-slate-900">Вход</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Введите номер телефона для входа.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Номер телефона
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E11D48]/20 focus:border-[#E11D48] transition-all"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isPhoneValid}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#E11D48] text-white hover:bg-[#be143b] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                <span>{loading ? 'Отправка...' : 'Получить код'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="flex items-center space-x-3 mb-2">
                <ShieldCheck className="h-5 w-5 text-[#E11D48]" />
                <h2 className="text-lg font-bold text-slate-900">Подтверждение</h2>
              </div>
              <p className="text-sm text-slate-500">
                Код отправлен на <span className="font-bold text-slate-700">{phone}</span>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Код из SMS
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xl font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#E11D48]/20 focus:border-[#E11D48] transition-all"
                  autoFocus
                  maxLength={4}
                  disabled={loading}
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center font-medium">
                  Тестовый код: <span className="font-mono font-bold text-slate-600">1234</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#E11D48] text-white hover:bg-[#be143b] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{loading ? 'Проверка...' : 'Войти'}</span>
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setError(null); setCode(''); }}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  ← Назад
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="text-sm text-slate-400 hover:text-[#E11D48] font-medium transition-colors disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Повторно через ${resendCooldown} с`
                    : 'Отправить код повторно'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-4 font-medium">
          Только для сотрудников Tokyo Rolls.
        </p>
      </div>
    </div>
  );
}
