/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DashboardStats } from '../types';
import { ShoppingBag, Flame, Truck, TrendingUp, HelpCircle } from 'lucide-react';

interface StatsGridProps {
  stats: DashboardStats | null;
  onAdjustPrepTime?: (newTime: number) => void;
  currentPrepTime: number;
}

export default function StatsGrid({ stats, onAdjustPrepTime, currentPrepTime }: StatsGridProps) {
  const activeOrdersCount = stats?.activeOrdersCount ?? 0;
  const totalRevenueToday = stats?.totalRevenueToday ?? 0;
  const activeDriversCount = stats?.activeDriversCount ?? 0;
  const newOrdersCount = stats?.newOrdersCount ?? 0;
  const preparingCount = stats?.preparingCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Active Orders */}
      <div 
        id="stat-active-orders"
        className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Активные Заказы</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{activeOrdersCount}</span>
            <span className="text-xs font-semibold text-[#E11D48] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              В работе
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Ожидают обработки, готовятся или едут</p>
        </div>
        <div className="bg-[#E11D48] text-white p-3.5 rounded-xl">
          <ShoppingBag className="h-6 w-6" />
        </div>
      </div>

      {/* Avg. Prep Time */}
      <div 
        id="stat-prep-time"
        className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="space-y-1 w-full mr-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Среднее Время Кухни</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentPrepTime}</span>
            <span className="text-xs font-bold text-slate-600">минут</span>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              id="btn-prep-dec"
              onClick={() => onAdjustPrepTime && onAdjustPrepTime(Math.max(10, currentPrepTime - 5))}
              className="text-xs px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-bold active:scale-95 transition-all"
              title="Уменьшить на 5 мин"
            >
              -5
            </button>
            <button 
              id="btn-prep-inc"
              onClick={() => onAdjustPrepTime && onAdjustPrepTime(Math.min(60, currentPrepTime + 5))}
              className="text-xs px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-bold active:scale-95 transition-all"
              title="Увеличить на 5 мин"
            >
              +5
            </button>
            <span className="text-[10px] text-slate-400 font-medium ml-1">Ручная регулировка</span>
          </div>
        </div>
        <div className="bg-orange-500 text-white p-3.5 rounded-xl flex-shrink-0">
          <Flame className="h-6 w-6" />
        </div>
      </div>

      {/* Active Drivers */}
      <div 
        id="stat-drivers"
        className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Курьеры на Линии</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{activeDriversCount} / 5</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Свободны
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Мониторинг доставки в реальном времени</p>
        </div>
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl">
          <Truck className="h-6 w-6" />
        </div>
      </div>

      {/* Revenue */}
      <div 
        id="stat-revenue"
        className="bg-slate-900 text-white border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Выручка за Сегодня</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {totalRevenueToday.toLocaleString('ru-RU')}
            </span>
            <span className="text-sm font-bold text-[#E11D48]">₽</span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+14.2% к вчерашнему дню</span>
          </div>
        </div>
        <div className="bg-[#E11D48] text-white p-3.5 rounded-xl">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
