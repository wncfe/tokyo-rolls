/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Search, MapPin, Phone, Clock, AlertCircle, Check, Play, ChevronRight, Ban, Eye } from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onUpdateStatus: (orderId: number, nextStatus: OrderStatus) => void;
  onCancelOrder: (orderId: number, reason: string) => void;
}

export default function OrderList({ orders, onSelectOrder, onUpdateStatus, onCancelOrder }: OrderListProps) {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Friendly time elapsed formatter
  const getTimeElapsed = (isoString: string) => {
    const elapsedMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(elapsedMs / (1000 * 60));
    
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин. назад`;
    
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs} ч. ${remainingMins} мин. назад`;
  };

  // Re-render elapsed times every minute
  const [, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter & Search & Sort orders
  const filteredOrders = orders
    .filter(order => {
      // Status filter
      if (activeTab !== 'all' && order.status !== activeTab) return false;
      
      // Text search
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      
      return (
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerPhone.includes(term) ||
        order.deliveryAddress.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // Count items per tab
  const getCount = (status: OrderStatus | 'all') => {
    if (status === 'all') return orders.length;
    return orders.filter(o => o.status === status).length;
  };

  const getStatusBadgeStyles = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'awaiting_payment': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'pending': return 'bg-rose-100 text-[#E11D48] border-rose-200';
      case 'confirmed': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'preparing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'delivering': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cancelled': return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  const getStatusLabelRu = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'Не оплачен';
      case 'awaiting_payment': return 'Ожидает оплаты';
      case 'pending': return 'Новый';
      case 'confirmed': return 'Подтвержден';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Можно забирать';
      case 'delivering': return 'В доставке';
      case 'delivered': return 'Доставлен';
      case 'completed': return 'Выполнен';
      case 'cancelled': return 'Отменен';
    }
  };

  const getCardLeftBorder = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'border-l-4 border-l-amber-500';
      case 'awaiting_payment': return 'border-l-4 border-l-yellow-400';
      case 'pending': return 'border-l-4 border-l-[#E11D48]';
      case 'confirmed': return 'border-l-4 border-l-teal-500';
      case 'preparing': return 'border-l-4 border-l-blue-500';
      case 'ready': return 'border-l-4 border-l-emerald-500';
      case 'delivering': return 'border-l-4 border-l-indigo-500';
      case 'delivered': return 'border-l-4 border-l-violet-500';
      case 'completed': return 'border-l-4 border-l-emerald-600';
      case 'cancelled': return 'border-l-4 border-l-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Sort Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            id="inp-search-orders"
            type="text"
            placeholder="Поиск по номеру заказа, имени клиента или телефону..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48] text-slate-900 font-medium placeholder-slate-400 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Sorting option */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 uppercase">Сортировка:</span>
          <select
            id="select-sort-orders"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-[#E11D48] text-sm"
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>
      </div>

      {/* Tabs Menu - Highly high-contrast, clickable */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 min-w-max">
          {(['all', 'unpaid', 'awaiting_payment', 'pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'completed', 'cancelled'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = getCount(tab);
            return (
              <button
                key={tab}
                id={`tab-order-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border font-semibold text-xs tracking-tight transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-sm'
                }`}
              >
                <span>
                  {tab === 'all' ? 'Все заказы' : getStatusLabelRu(tab)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 p-12 text-center rounded-2xl">
          <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-900">Заказы не найдены</p>
          <p className="text-xs text-slate-500 mt-1">Попробуйте изменить поисковый запрос или выбрать другую вкладку.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const elapsed = getTimeElapsed(order.createdAt);
            const itemsSummary = order.items.map(i => `${i.productName} (${i.quantity} шт)`).join(', ');

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                className={`bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-all duration-200 ${getCardLeftBorder(order.status)}`}
              >
                {/* Card Header */}
                <div className="bg-slate-50/50 px-5 py-3.5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyles(order.status)} uppercase tracking-wide`}>
                      {getStatusLabelRu(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 font-semibold font-mono">
                    <Clock className="h-3.5 w-3.5 text-[#E11D48]" />
                    <span>{elapsed}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col space-y-3.5">
                  {/* Customer Info */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {order.customerName}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{order.customerPhone}</span>
                    </div>

                    <div className="flex items-start space-x-2 text-xs font-semibold text-slate-600 leading-normal">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Order items snapshot */}
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Состав заказа</span>
                    <p className="text-xs text-slate-700 font-semibold mt-1 line-clamp-2 leading-relaxed">
                      {itemsSummary}
                    </p>
                  </div>

                  {/* Notes Alert if any */}
                  {order.notes && (
                    <div className="bg-rose-50/50 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E11D48] flex items-center space-x-1.5">
                      <span className="font-bold">Коммент:</span>
                      <span className="truncate">{order.notes}</span>
                    </div>
                  )}

                  {/* Subtotal & Action buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">К оплате</span>
                      <span className="text-base font-extrabold text-[#E11D48] font-mono">{order.total} ₽</span>
                    </div>

                    {/* Quick Operations Button */}
                    <div className="flex items-center space-x-2">
                      <button
                        id={`btn-view-${order.id}`}
                        onClick={() => onSelectOrder(order)}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all font-semibold text-xs flex items-center space-x-1"
                        title="Подробнее / Детали"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Детали</span>
                      </button>

                      {order.status === 'unpaid' && (
                        <button
                          id={`btn-await-pay-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'awaiting_payment');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <span>Ждать оплату</span>
                        </button>
                      )}

                      {order.status === 'awaiting_payment' && (
                        <button
                          id={`btn-mark-paid-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'pending');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <span>Оплачен</span>
                        </button>
                      )}

                      {order.status === 'pending' && (
                        <button
                          id={`btn-confirm-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'confirmed');
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <Check className="h-3 w-3" />
                          <span>Подтвердить</span>
                        </button>
                      )}

                      {order.status === 'confirmed' && (
                        <button
                          id={`btn-prep-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'preparing');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Готовить</span>
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          id={`btn-ready-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'ready');
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Готов</span>
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          id={`btn-deliver-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'delivering');
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span>В путь</span>
                        </button>
                      )}

                      {order.status === 'delivering' && (
                        <button
                          id={`btn-delivered-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'delivered');
                          }}
                          className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Доставлен</span>
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <button
                          id={`btn-complete-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order.id, 'completed');
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center space-x-1 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Выполнить</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
