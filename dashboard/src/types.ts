/**
 * Types for Dashboard — синхронизированы с бэкендом Tokyo Rolls.
 * Dashboard использует camelCase внутри себя, трансформеры в api.ts.
 */

// ─── Order Status (бэкенд: Order.Status) ───
export type OrderStatus =
  | 'unpaid'
  | 'awaiting_payment'
  | 'pending'       // бэкенд — 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'completed'
  | 'cancelled';

// ─── Menu ───
export type MenuItemType = 'set' | 'product';

export type MenuCategory = 'sets' | 'rolls' | 'sushi' | 'drinks' | 'desserts';

export interface SetSubItem {
  name: string;
  quantity: number;
}

export interface MenuItem {
  id: number;           // PK бэкенда (int)
  slug: string;         // slug из бэкенда
  name: string;
  type: MenuItemType;
  category: MenuCategory;
  price: number;
  description: string;
  ingredients?: string[];
  subItems?: SetSubItem[];
  isAvailable: boolean;
  imageColor?: string;
  imageUrl?: string;
}

// ─── Order Item (из OrderItemReadSerializer) ───
export interface OrderItem {
  id: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  weightGrams: number;
  lineTotal: number;
}

// ─── Order (из AdminOrderListSerializer / AdminOrderDetailSerializer) ───
export interface Order {
  id: number;
  orderNumber: string;       // вычисляется как `#${id}`
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderType: 'delivery' | 'pickup';
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  cancelReason?: string;
  paymentMethod: 'card_online' | 'cash' | 'card_delivery';
  notes?: string;             // маппинг с comment
}

// ─── Operation Log (из AdminOperationLogSerializer) ───
export interface OperationLog {
  id: number;
  timestamp: string;
  userRole: 'cashier' | 'chef' | 'manager' | 'system';
  action: string;
  type: 'order' | 'menu' | 'system';
  targetId?: string;
}

// ─── User ───
export type UserRole = 'cashier' | 'chef' | 'manager';

export interface DashboardUser {
  id: number;
  phone: string;
  role: UserRole;
  isStaff: boolean;
}

// ─── Dashboard Stats (из AdminDashboardStatsSerializer) ───
export interface DashboardStats {
  activeOrdersCount: number;
  avgPrepTimeMinutes: number;
  activeDriversCount: number;
  totalRevenueToday: number;
  newOrdersCount: number;
  preparingCount: number;
  deliveringCount: number;
}

// ─── Auth ───
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthVerifyData {
  phone: string;
  code: string;
}
