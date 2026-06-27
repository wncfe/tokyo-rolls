/**
 * API-клиент для дашборда Tokyo Rolls.
 * Все запросы — к Django REST API через JWT.
 * Трансформеры: snake_case (API) → camelCase (dashboard types).
 */

import type {
  Order, OrderItem, OrderStatus,
  MenuItem, MenuItemType, MenuCategory,
  OperationLog,
  DashboardStats, DashboardUser, UserRole,
  AuthTokens, AuthVerifyData,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'tokyo-rolls-dashboard-token';

// ─── Token helpers ───

export function getStoredToken(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredToken(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token?.access) {
    headers['Authorization'] = `Bearer ${token.access}`;
  }
  return headers;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.detail || Object.values(body).flat()[0] || res.statusText;
    // Если 401 — токен протух, чистим
    if (res.status === 401) clearStoredToken();
    throw new Error(String(msg));
  }

  // 204 No Content (DELETE)
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───

export async function requestCode(phone: string): Promise<{ success: boolean }> {
  return apiFetch('/auth/request-code/', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyCode(data: AuthVerifyData): Promise<{ access: string; refresh: string; user: { id: number; phone: string } }> {
  const result = await apiFetch<any>('/auth/verify-code/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setStoredToken({ access: result.access, refresh: result.refresh });
  return result;
}

// ─── Dashboard Profile ───

export interface AdminProfile {
  id: number;
  phone: string;
  role: UserRole;
}

export async function fetchDashboardProfile(): Promise<AdminProfile> {
  const raw = await apiFetch<any>('/admin/profile/');
  return {
    id: raw.id,
    phone: raw.phone || '',
    role: raw.role || 'manager',
  };
}

export async function updateDashboardRole(role: UserRole): Promise<AdminProfile> {
  const raw = await apiFetch<any>('/admin/profile/', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return { id: raw.id, phone: raw.phone || '', role: raw.role };
}

// ─── Orders ───

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  unpaid: 'unpaid',
  awaiting_payment: 'awaiting_payment',
  pending: 'pending',
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  delivering: 'delivering',
  delivered: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled',
};

function transformOrder(raw: any): Order {
  return {
    id: raw.id,
    orderNumber: `#${raw.id}`,
    customerName: raw.customer_name || '',
    customerPhone: raw.customer_phone || '',
    deliveryAddress: raw.delivery_address || '',
    orderType: raw.order_type || 'delivery',
    items: (raw.items || []).map(transformOrderItem),
    subtotal: raw.subtotal || 0,
    discountAmount: raw.discount_amount || 0,
    deliveryFee: raw.delivery_fee || 0,
    total: raw.total || 0,
    status: ORDER_STATUS_MAP[raw.status] || 'pending',
    createdAt: raw.created_at || new Date().toISOString(),
    cancelReason: raw.cancel_reason || undefined,
    paymentMethod: raw.payment_method || 'card_online',
    notes: raw.comment || undefined,
  };
}

function transformOrderItem(raw: any): OrderItem {
  return {
    id: raw.id,
    productName: raw.product_name || '',
    unitPrice: raw.unit_price || 0,
    quantity: raw.quantity || 0,
    weightGrams: raw.weight_grams || 0,
    lineTotal: raw.line_total || (raw.unit_price * raw.quantity) || 0,
  };
}

export interface OrderListParams {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export async function fetchOrders(params?: OrderListParams): Promise<Order[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  const q = qs.toString();
  const raw = await apiFetch<any[]>(`/admin/orders/${q ? '?' + q : ''}`);
  return raw.map(transformOrder);
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  const raw = await apiFetch<any>(`/admin/orders/${orderId}/`);
  return transformOrder(raw);
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  const raw = await apiFetch<any>(`/admin/orders/${orderId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return transformOrder(raw);
}

export async function cancelOrder(orderId: number, reason: string): Promise<Order> {
  const raw = await apiFetch<any>(`/admin/orders/${orderId}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return transformOrder(raw);
}

// ─── Stats ───

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const raw = await apiFetch<any>('/admin/stats/');
  return {
    activeOrdersCount: raw.active_orders_count || 0,
    avgPrepTimeMinutes: raw.avg_prep_time_minutes || 30,
    activeDriversCount: raw.active_drivers_count || 0,
    totalRevenueToday: raw.total_revenue_today || 0,
    newOrdersCount: raw.new_orders_count || 0,
    preparingCount: raw.preparing_count || 0,
    deliveringCount: raw.delivering_count || 0,
  };
}

// ─── Menu ───

function transformMenuItem(raw: any, type: MenuItemType): MenuItem {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    type,
    category: raw.category_slug || raw.category || 'rolls',
    price: raw.price || 0,
    description: raw.description || '',
    ingredients: raw.composition || raw.ingredients || [],
    subItems: (raw.included_products || []).map((ip: any) => ({
      name: ip.product_name || '',
      quantity: ip.quantity || 1,
    })),
    isAvailable: raw.is_available !== undefined ? raw.is_available : true,
    imageUrl: raw.image || undefined,
    imageColor: raw.image_color || undefined,
  };
}

export async function fetchAllMenuItems(): Promise<MenuItem[]> {
  const [products, sets] = await Promise.all([
    apiFetch<any[]>('/admin/products/'),
    apiFetch<any[]>('/admin/sets/'),
  ]);
  return [
    ...products.map((p: any) => transformMenuItem(p, 'product')),
    ...sets.map((s: any) => transformMenuItem(s, 'set')),
  ];
}

export async function createMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
  const type = data.type || 'product';
  const endpoint = type === 'set' ? '/admin/sets/' : '/admin/products/';
  const body: any = {
    name: data.name,
    slug: data.slug || data.name?.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-'),
    description: data.description || '',
    price: data.price || 0,
    is_available: data.isAvailable ?? true,
  };
  if (data.imageUrl) body.image = data.imageUrl;
  const raw = await apiFetch<any>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  return transformMenuItem(raw, type);
}

export async function updateMenuItem(item: MenuItem): Promise<MenuItem> {
  const type = item.type || 'product';
  const endpoint = type === 'set' ? `/admin/sets/${item.slug}/` : `/admin/products/${item.slug}/`;
  const body: any = {
    name: item.name,
    description: item.description,
    price: item.price,
    is_available: item.isAvailable,
  };
  const raw = await apiFetch<any>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  return transformMenuItem(raw, type);
}

export async function deleteMenuItem(item: MenuItem): Promise<void> {
  const endpoint = item.type === 'set' ? `/admin/sets/${item.slug}/` : `/admin/products/${item.slug}/`;
  await apiFetch(endpoint, { method: 'DELETE' });
}

export async function toggleMenuItemAvailability(itemType: 'product' | 'set', slug: string, isAvailable: boolean): Promise<void> {
  await apiFetch(`/admin/menu/${itemType}/${slug}/toggle/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_available: isAvailable }),
  });
}

// ─── Logs ───

function transformLog(raw: any): OperationLog {
  return {
    id: raw.id,
    timestamp: raw.created_at || new Date().toISOString(),
    userRole: raw.user_role || 'system',
    action: raw.action || '',
    type: raw.type || 'system',
    targetId: raw.target_id || undefined,
  };
}

export async function fetchLogs(): Promise<OperationLog[]> {
  const raw = await apiFetch<any[]>('/admin/logs/');
  return raw.map(transformLog);
}

export async function clearLogs(): Promise<number> {
  const result = await apiFetch<{ deleted: number }>('/admin/logs/clear/', { method: 'DELETE' });
  return result.deleted;
}
