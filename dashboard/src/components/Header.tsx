/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentRole: string;
  onRoleChange?: (role: any) => void;
  onLogout?: () => void;
}

export default function Header({ currentRole, onRoleChange, onLogout }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white text-slate-900 shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-12 h-12 bg-[#E11D48] rounded-full shadow-lg shadow-rose-200/50">
              <span className="text-white font-extrabold text-[10px] tracking-[0.25em] pl-[0.25em]">
                ТОКИО
              </span>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block text-slate-900">
                TOKYO <span className="text-[#E11D48]">ROLLS</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                Админ-Панель
              </span>
            </div>
          </div>

          {/* Center Info - Live status & Clock */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Ресторан Открыт
              </span>
            </div>

            <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 font-mono text-sm">
              <Clock className="h-4 w-4 text-[#E11D48]" />
              <span className="font-semibold text-slate-700">{time || '12:00:00'}</span>
            </div>
          </div>

          {/* Right Side - Role + Logout */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 items-center space-x-2">
              <User className="h-4 w-4 text-[#E11D48]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {currentRole === 'manager' ? 'Управляющий' : currentRole === 'cashier' ? 'Кассир' : 'Шеф-повар'}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 items-center space-x-1.5 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95"
                title="Выйти"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
