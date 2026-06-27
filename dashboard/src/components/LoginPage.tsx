/**
 * LoginPage — вход в дашборд по номеру телефона (passwordless) + проверка is_staff.
 * Использует те же эндпоинты (/auth/request-code/, /auth/verify-code/),
 * но после verify-code проверяет, что пользователь имеет is_staff=True.
 */

import React, { useState } from 'react';
import { requestCode, verifyCode, getStoredToken } from '../api';
import { Smartphone, KeyRound, ShieldCheck, Loader } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onError: (msg: string) => void;
}

export default function LoginPage({ onLogin, onError }: LoginPageProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    let formatted = '+7';
    if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
    if (digits.length >= 5) formatted += `) ${digits.slice(4, 7)}`;
    if (digits.length >= 8) formatted += `-${digits.slice(7, 9)}`;
    if (digits.length >= 10) formatted += `-${digits.slice(9, 11)}`;
    return formatted;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 11) return;
    setLoading(true);
    try {
      await requestCode(phone);
      setSent(true);
      setStep('code');
    } catch (err: any) {
      onError(err.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) return;
    setLoading(true);
    try {
      const result = await verifyCode({ phone, code });

      // Проверяем is_staff — ходим в admin/profile, он режектнет если не staff
      const profileResp = await fetch('/api/admin/profile/', {
        headers: {
          'Authorization': `Bearer ${result.access}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResp.ok) {
        // Не staff — очищаем токен и отказываем
        localStorage.removeItem('tokyo-rolls-dashboard-token');
        onError('Доступ запрещён. Этот аккаунт не имеет прав администратора.');
        return;
      }

      onLogin();
    } catch (err: any) {
      onError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('phone');
    setCode('');
    setSent(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-[#E11D48] text-white p-4 rounded-2xl mb-4">
            <span className="font-black text-2xl tracking-wider">S!</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            СУШИ<span className="text-[#E11D48]">BEAST</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Админ-панель доставки
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {step === 'phone' ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div className="flex items-center space-x-3 mb-2">
                <Smartphone className="h-5 w-5 text-[#E11D48]" />
                <h2 className="text-lg font-bold text-slate-900">Вход в дашборд</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Введите номер телефона, привязанный к аккаунту администратора.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Номер телефона
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#E11D48]/20 focus:border-[#E11D48] transition-all"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length < 11}
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
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
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

              <button
                type="button"
                onClick={handleReset}
                className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                ← Назад
              </button>
            </form>
          )}
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-6 font-medium">
          Только для сотрудников Tokyo Rolls. Доступ строго по ролям.
        </p>
      </div>
    </div>
  );
}
