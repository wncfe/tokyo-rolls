/**
 * App.tsx — главная точка входа дашборда.
 * Режимы:
 * 1. Not authenticated → показывает LoginPage
 * 2. Authenticated (is_staff) → дашборд с живыми API-данными
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Order, MenuItem, OperationLog, UserRole, OrderStatus, DashboardStats } from './types';
import { getStoredToken, clearStoredToken } from './api';
import * as api from './api';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import OrderList from './components/OrderList';
import OrderDetailModal from './components/OrderDetailModal';
import MenuManagement from './components/MenuManagement';
import OperationLogs from './components/OperationLogs';
import LoginPage from './components/LoginPage';
import { ShoppingBag, Layers, CheckCircle, Loader, AlertTriangle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Не оплачен',
  awaiting_payment: 'Ожидает оплаты',
  pending: 'Новый',
  confirmed: 'Подтвержден',
  preparing: 'Готовится',
  ready: 'Можно забирать',
  delivering: 'В доставке',
  delivered: 'Доставлен',
  completed: 'Выполнен',
  cancelled: 'Отменен',
};

export default function App() {
  // ─── Auth state ───
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!getStoredToken());
  const [currentRole, setCurrentRole] = useState<UserRole>('manager');

  // ─── UI state ───
  const [activeSection, setActiveSection] = useState<'orders' | 'menu'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Data state ───
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prepTime, setPrepTime] = useState(30);

  // ─── Toast ───
  const triggerToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ─── Load profile + role on login ───
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      try {
        const profile = await api.fetchDashboardProfile();
        setCurrentRole(profile.role || 'manager');
      } catch {
        // fallback
      }
    })();
  }, [isLoggedIn]);

  // ─── Load all dashboard data ───
  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const [ordersData, menuData, logsData, statsData] = await Promise.all([
        api.fetchOrders(),
        api.fetchAllMenuItems(),
        api.fetchLogs(),
        api.fetchDashboardStats(),
      ]);
      setOrders(ordersData);
      setMenuItems(menuData);
      setLogs(logsData);
      setStats(statsData);
      setPrepTime(statsData.avgPrepTimeMinutes || 30);
    } catch (err: any) {
      setGlobalError(err.message || 'Ошибка загрузки данных');
      // Если 401 — разлогиниваем
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Login / Logout ───
  const handleLogin = () => {
    setIsLoggedIn(true);
    setGlobalError(null);
  };

  const handleLogout = () => {
    clearStoredToken();
    setIsLoggedIn(false);
    setOrders([]);
    setMenuItems([]);
    setLogs([]);
    setStats(null);
  };

  const handleLoginError = (msg: string) => {
    setGlobalError(msg);
  };

  // ─── Order Operations ───
  const handleUpdateOrderStatus = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      triggerToast(`Заказ #${orderId}: ${STATUS_LABELS[nextStatus] || nextStatus}`, 'success');
      // Reload logs + stats
      api.fetchLogs().then(setLogs).catch(() => {});
      api.fetchDashboardStats().then(setStats).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка обновления статуса', 'info');
    }
  };

  const handleCancelOrder = async (orderId: number, reason: string) => {
    try {
      const updated = await api.cancelOrder(orderId, reason);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      triggerToast(`Заказ #${orderId} отменён`, 'info');
      api.fetchLogs().then(setLogs).catch(() => {});
      api.fetchDashboardStats().then(setStats).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка отмены заказа', 'info');
    }
  };

  // ─── Menu Operations ───
  const handleAddMenuItem = async (item: MenuItem) => {
    try {
      const created = await api.createMenuItem(item);
      setMenuItems(prev => [created, ...prev]);
      triggerToast(`"${created.name}" добавлено!`, 'success');
      api.fetchLogs().then(setLogs).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка добавления', 'info');
    }
  };

  const handleEditMenuItem = async (item: MenuItem) => {
    try {
      const updated = await api.updateMenuItem(item);
      setMenuItems(prev => prev.map(i => i.slug === item.slug ? updated : i));
      triggerToast(`"${updated.name}" обновлено!`, 'success');
      api.fetchLogs().then(setLogs).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка обновления', 'info');
    }
  };

  const handleDeleteMenuItem = async (item: MenuItem) => {
    try {
      await api.deleteMenuItem(item);
      setMenuItems(prev => prev.filter(i => i.slug !== item.slug));
      triggerToast(`"${item.name}" удалено!`, 'info');
      api.fetchLogs().then(setLogs).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка удаления', 'info');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const nextState = !item.isAvailable;
      await api.toggleMenuItemAvailability(item.type, item.slug, nextState);
      setMenuItems(prev => prev.map(i =>
        i.slug === item.slug ? { ...i, isAvailable: nextState } : i
      ));
      triggerToast(`"${item.name}" — ${nextState ? 'в продаже' : 'стоп-лист'}`, 'info');
      api.fetchLogs().then(setLogs).catch(() => {});
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка переключения', 'info');
    }
  };

  // ─── Logs ───
  const handleClearLogs = async () => {
    try {
      await api.clearLogs();
      setLogs([]);
      triggerToast('Логи очищены', 'info');
    } catch (err: any) {
      triggerToast(err.message || 'Ошибка очистки', 'info');
    }
  };

  // ─── Prep time ───
  const handleAdjustPrepTime = (newVal: number) => {
    setPrepTime(newVal);
    // Prep time живёт локально — на бэкенде нет отдельного эндпоинта для него
  };

  // ─── Role ───
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    api.updateDashboardRole(role).catch(() => {});
    if (role === 'cashier') setActiveSection('orders');
  };

  // ─── Render: Login screen ───
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} onError={handleLoginError} />;
  }

  // ─── Render: Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader className="h-8 w-8 text-[#E11D48] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error with retry ───
  if (globalError && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-sm space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Ошибка загрузки</h2>
          <p className="text-sm text-slate-500">{globalError}</p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={loadData}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#E11D48] text-white hover:bg-[#be143b] transition-all"
            >
              Повторить
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Dashboard ───
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 selection:bg-[#E11D48] selection:text-white">
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
      />

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <StatsGrid
          stats={stats}
          currentPrepTime={prepTime}
          onAdjustPrepTime={handleAdjustPrepTime}
        />
      </section>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs */}
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm flex space-x-1">
              {currentRole !== 'chef' && (
                <button
                  id="tab-section-orders"
                  onClick={() => setActiveSection('orders')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm tracking-tight transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                    activeSection === 'orders'
                      ? 'bg-[#E11D48] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="h-4.5 w-4.5" />
                  <span>Управление Заказами</span>
                </button>
              )}
              {currentRole === 'manager' && (
                <button
                  id="tab-section-menu"
                  onClick={() => setActiveSection('menu')}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm tracking-tight transition-all active:scale-95 flex items-center justify-center space-x-2 ${
                    activeSection === 'menu'
                      ? 'bg-[#E11D48] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="h-4.5 w-4.5" />
                  <span>Управление Меню</span>
                </button>
              )}
            </div>

            <div className="transition-all duration-300">
              {activeSection === 'orders' && currentRole !== 'chef' && (
                <OrderList
                  orders={orders}
                  onSelectOrder={setSelectedOrder}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onCancelOrder={handleCancelOrder}
                />
              )}
              {activeSection === 'menu' && currentRole === 'manager' && (
                <MenuManagement
                  menuItems={menuItems}
                  onAddItem={handleAddMenuItem}
                  onEditItem={handleEditMenuItem}
                  onDeleteItem={handleDeleteMenuItem}
                  onToggleAvailability={handleToggleAvailability}
                />
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 h-full">
            <OperationLogs logs={logs} onClearLogs={handleClearLogs} />
          </aside>
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onCancelOrder={handleCancelOrder}
        />
      )}

      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-950 text-white border border-slate-800 px-5 py-4 rounded-2xl shadow-lg animate-bounce font-medium text-sm">
          <div className="bg-[#E11D48] text-white p-1 rounded-full">
            <CheckCircle className="h-4 w-4" />
          </div>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
