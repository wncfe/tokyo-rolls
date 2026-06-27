/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { X, Phone, MapPin, ClipboardList, CheckSquare, Square, CreditCard, Receipt, MessageSquare, AlertTriangle } from 'lucide-react';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (orderId: number, nextStatus: OrderStatus) => void;
  onCancelOrder: (orderId: number, reason: string) => void;
}

export default function OrderDetailModal({ order, onClose, onUpdateStatus, onCancelOrder }: OrderDetailModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const toggleItemCheck = (itemId: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'awaiting_payment': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'pending': return 'bg-rose-100 text-[#E11D48] border-rose-300';
      case 'confirmed': return 'bg-teal-100 text-teal-700 border-teal-300';
      case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ready': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'delivering': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'delivered': return 'bg-violet-100 text-violet-700 border-violet-300';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'cancelled': return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'Не оплачен';
      case 'awaiting_payment': return 'Ожидает оплаты';
      case 'pending': return 'Новый заказ';
      case 'confirmed': return 'Подтвержден';
      case 'preparing': return 'Готовится';
      case 'ready': return 'Можно забирать';
      case 'delivering': return 'В доставке';
      case 'delivered': return 'Доставлен';
      case 'completed': return 'Выполнен';
      case 'cancelled': return 'Отменен';
    }
  };

  const handleStatusTransition = () => {
    if (order.status === 'unpaid') onUpdateStatus(order.id, 'awaiting_payment');
    else if (order.status === 'awaiting_payment') onUpdateStatus(order.id, 'pending');
    else if (order.status === 'pending') onUpdateStatus(order.id, 'confirmed');
    else if (order.status === 'confirmed') onUpdateStatus(order.id, 'preparing');
    else if (order.status === 'preparing') onUpdateStatus(order.id, 'ready');
    else if (order.status === 'ready') onUpdateStatus(order.id, 'delivering');
    else if (order.status === 'delivering') onUpdateStatus(order.id, 'delivered');
    else if (order.status === 'delivered') onUpdateStatus(order.id, 'completed');
  };

  const getCancelReasonLabel = () => {
    return order.cancelReason ? `Отменен по причине: ${order.cancelReason}` : '';
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelReason.trim()) {
      onCancelOrder(order.id, cancelReason);
      setShowCancelDialog(false);
    }
  };

  const getActionButtonLabel = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'Ожидать оплату';
      case 'awaiting_payment': return 'Отметить оплаченным';
      case 'pending': return 'Подтвердить заказ';
      case 'confirmed': return 'Начать приготовление';
      case 'preparing': return 'Отметить готовым';
      case 'ready': return 'Передать в доставку';
      case 'delivering': return 'Отметить доставленным';
      case 'delivered': return 'Завершить (Выполнен)';
      default: return '';
    }
  };

  return (
    <div 
      id="order-detail-backdrop"
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm"
    >
      <div 
        id="order-detail-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden relative my-8"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xl font-black tracking-tight">{order.orderNumber}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusColor(order.status)} uppercase tracking-wider`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Создан: {new Date(order.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ({new Date(order.createdAt).toLocaleDateString('ru-RU')})
            </p>
          </div>
          <button 
            id="btn-close-modal"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-transparent"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          
          {/* Main sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-2 text-xs">
                <ClipboardList className="h-4 w-4 text-[#E11D48]" />
                <span>Информация о клиенте</span>
              </h3>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ФИО Клиента</span>
                  <p className="text-base font-bold text-slate-900">{order.customerName}</p>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Контактный телефон</span>
                  <a href={`tel:${order.customerPhone}`} className="flex items-center space-x-2 text-[#E11D48] font-bold text-base hover:underline mt-0.5">
                    <Phone className="h-4 w-4" />
                    <span>{order.customerPhone}</span>
                  </a>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Адрес доставки</span>
                  <p className="text-sm font-semibold text-slate-800 flex items-start space-x-1.5 mt-0.5 leading-snug">
                    <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Status Tracking */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-2 text-xs">
                <Receipt className="h-4 w-4 text-[#E11D48]" />
                <span>Детали оплаты & Опции</span>
              </h3>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Способ оплаты</span>
                  <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm mt-0.5">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <span>
                      {order.paymentMethod === 'card_online' && 'Картой на сайте'}
                      {order.paymentMethod === 'card_delivery' && 'Картой курьеру через терминал'}
                      {order.paymentMethod === 'cash' && 'Наличными при получении'}
                    </span>
                  </div>
                </div>

                {order.notes && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Комментарий к заказу</span>
                    <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg text-xs font-semibold text-slate-800 flex items-start space-x-1.5 mt-0.5">
                      <MessageSquare className="h-3.5 w-3.5 text-[#E11D48] flex-shrink-0 mt-0.5" />
                      <span>{order.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Checklist - Extremely cool visual feature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-xs">
                Состав заказа (Чек-лист сборки)
              </h3>
              <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-600">
                Кликните для отметки сборки
              </span>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {order.items.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div 
                    key={item.id}
                    onClick={() => toggleItemCheck(item.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer select-none transition-all ${
                      isChecked ? 'bg-emerald-50/50 text-slate-400 line-through' : 'bg-white hover:bg-slate-50/50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {isChecked ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm sm:text-base leading-tight">
                          {item.productName}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                          /* type badge — removed, OrderItem no longer has type */ 'bg-slate-100 text-slate-600'
                        }`}>
                          Товар
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <span className="text-xs text-slate-400 block">Кол-во</span>
                        <span className="font-bold text-sm sm:text-base">{item.quantity} шт</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Цена</span>
                        <span className="font-bold text-sm sm:text-base text-slate-900">{item.lineTotal} ₽</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col space-y-2">
            <div className="flex justify-between text-slate-500 font-semibold text-[11px] font-mono">
              <span>СУММА ПОЗИЦИЙ</span>
              <span>{order.subtotal} ₽</span>
            </div>
            <div className="flex justify-between text-slate-500 font-semibold text-[11px] font-mono">
              <span>ДОСТАВКА</span>
              <span>{order.deliveryFee === 0 ? 'БЕСПЛАТНО' : `${order.deliveryFee} ₽`}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1"></div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">ИТОГО К ОПЛАТЕ</span>
              <span className="text-2xl font-black text-[#E11D48]">{order.total} ₽</span>
            </div>
          </div>

          {/* Cancel Dialog Form */}
          {showCancelDialog && (
            <div className="bg-rose-50/40 border border-rose-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-[#E11D48]">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold text-sm">Отмена заказа: укажите причину</span>
              </div>
              <form onSubmit={handleCancelSubmit} className="space-y-3">
                <input 
                  id="inp-cancel-reason"
                  type="text"
                  placeholder="Например: Не удалось дозвониться до клиента / Отмена по просьбе гостя"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48] text-slate-900"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
                <div className="flex justify-end space-x-2">
                  <button 
                    id="btn-cancel-abort"
                    type="button"
                    onClick={() => setShowCancelDialog(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Назад
                  </button>
                  <button 
                    id="btn-cancel-confirm-submit"
                    type="submit"
                    className="px-4 py-1.5 bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Подтвердить отмену
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {order.status === 'cancelled' && order.cancelReason && (
              <p className="text-xs text-rose-600 font-semibold italic">
                Отменен по причине: {order.cancelReason}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {/* Cancel Trigger */}
            {!['completed', 'cancelled'].includes(order.status) && !showCancelDialog && (
              <button 
                id="btn-action-cancel"
                onClick={() => setShowCancelDialog(true)}
                className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-2xl font-semibold text-sm transition-all shadow-sm"
              >
                Отменить заказ
              </button>
            )}

            {/* Advance Status Trigger */}
            {!['completed', 'cancelled'].includes(order.status) && (
              <button 
                id="btn-action-advance"
                onClick={handleStatusTransition}
                className="w-full sm:w-auto px-6 py-3 bg-[#E11D48] text-white hover:bg-rose-700 rounded-2xl font-bold text-sm transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <span>{getActionButtonLabel(order.status)}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
