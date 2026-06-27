/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OperationLog } from '../types';
import { Bell, Clock, ShieldAlert, Award, Coffee, RefreshCw, Terminal } from 'lucide-react';

interface OperationLogsProps {
  logs: OperationLog[];
  onClearLogs: () => void;
}

export default function OperationLogs({ logs, onClearLogs }: OperationLogsProps) {
  
  const getRoleBadgeStyles = (role: 'cashier' | 'chef' | 'manager' | 'system') => {
    switch (role) {
      case 'cashier': return 'bg-rose-50 text-[#E11D48] border-rose-200';
      case 'chef': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'manager': return 'bg-slate-900 text-slate-100 border-slate-800';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRoleLabelRu = (role: string) => {
    switch (role) {
      case 'cashier': return 'Кассир';
      case 'chef': return 'Шеф-Повар';
      case 'manager': return 'Управляющий';
      default: return 'Система';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'order': return <Coffee className="h-3.5 w-3.5 text-[#E11D48]" />;
      case 'menu': return <Award className="h-3.5 w-3.5 text-amber-600" />;
      default: return <Terminal className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="bg-slate-50 px-4.5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-[#E11D48] animate-bounce" />
          <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">История операций</span>
        </div>
        
        {logs.length > 0 && (
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="text-[10px] font-semibold text-slate-400 hover:text-[#E11D48] uppercase tracking-wider transition-colors"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Logs Feed */}
      <div className="p-4 overflow-y-auto max-h-[450px] space-y-3.5 divide-y divide-slate-100 divide-dashed">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium space-y-1">
            <RefreshCw className="h-6 w-6 text-slate-300 mx-auto animate-spin" />
            <p className="text-xs font-bold mt-2">Нет новых событий</p>
            <p className="text-[10px]">Все операции по заказам и меню будут появляться здесь.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={log.id} 
              className={`pt-3.5 first:pt-0 flex items-start space-x-3 text-xs`}
            >
              {/* Icon indicator */}
              <div className="mt-0.5 bg-slate-50 border border-slate-100 p-1.5 rounded-lg flex-shrink-0">
                {getLogIcon(log.type)}
              </div>

              {/* Log details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadgeStyles(log.userRole as any)} uppercase tracking-wider`}>
                    {getRoleLabelRu(log.userRole)}
                  </span>
                  
                  <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center space-x-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </span>
                </div>

                <p className="text-slate-800 font-semibold leading-normal truncate-2-lines text-[11px] sm:text-xs">
                  {log.action}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
