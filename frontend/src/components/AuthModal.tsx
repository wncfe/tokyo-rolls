import { useState, useEffect } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { LoginData, RegisterData } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onLogin: (data: LoginData) => Promise<void>;
  onRegister: (data: RegisterData) => Promise<void>;
}

export default function AuthModal({ isOpen, initialTab = 'login', onClose, onLogin, onRegister }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const resetForms = () => {
    setLoginUsername('');
    setLoginPassword('');
    setRegUsername('');
    setRegPassword('');
    setRegPhone('');
    setError(null);
  };

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

  // Reset forms & tab every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      resetForms();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTabSwitch = (newTab: 'login' | 'register') => {
    setTab(newTab);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin({ username: loginUsername.trim(), password: loginPassword });
      resetForms();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regPassword.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }
    const PHONE_RE = /^\+7 \d{3} \d{3}-\d{2}-\d{2}$/;
    if (regPhone.trim() && !PHONE_RE.test(regPhone.trim())) {
      setError('Введите номер в формате +7 (XXX) XXX-XX-XX');
      return;
    }
    setLoading(true);
    try {
      await onRegister({ username: regUsername.trim(), password: regPassword, phone: regPhone.trim() });
      resetForms();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
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
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors cursor-pointer select-none ${
              tab === 'login'
                ? 'text-[#E11D48] border-b-2 border-[#E11D48] bg-rose-50/50'
                : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Вход
          </button>
          <button
            onClick={() => handleTabSwitch('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors cursor-pointer select-none ${
              tab === 'register'
                ? 'text-[#E11D48] border-b-2 border-[#E11D48] bg-rose-50/50'
                : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Регистрация
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Логин
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Введите логин"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#E11D48] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Логин
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Придумайте логин"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Телефон
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#E11D48] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
