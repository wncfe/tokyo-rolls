import { Product, Set, MenuItem, AuthTokens, PhoneAuthData, VerifyCodeData, User, Address, AddressFormData, RestaurantSettings, CheckoutData, PaymentStatusResult, DeliveryZoneInfo, OrderDetail } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface MenuData {
  id?: number;
  slug: string;
  name: string;
  subtitle: string;
  products: MenuItem[];
  subcategories?: {
    slug: string;
    name: string;
    products: Product[];
  }[];
}

/**
 * Получить полное меню с всеми категориями и продуктами
 */
export async function fetchMenu(): Promise<MenuData[]> {
  const response = await fetch(`${API_BASE_URL}/menu/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch menu: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получить продукты по категории
 */
export async function fetchProductsByCategory(categorySlug: string): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products/?category=${categorySlug}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }
  const data = await response.json();
  return data.results || data;
}

/**
 * Получить один продукт по slug
 */
export async function fetchProductBySlug(slug: string): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products/${slug}/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Трансформировать данные с бэкэнда на формат фронтенда
 */
export function transformProductFromApi(apiProduct: any): Product {
  return {
    id: apiProduct.slug,
    name: apiProduct.name,
    category: apiProduct.category_slug as any,
    subcategory: (apiProduct.subcategory_slug as any) || undefined,
    price: apiProduct.price,
    weight: apiProduct.weight,
    pieces: apiProduct.pieces_amount,
    image: apiProduct.image,
    composition: apiProduct.composition || [],
    allergens: apiProduct.allergens || [],
    isNew: apiProduct.is_new,
    benefitBadge: apiProduct.benefit_badge || undefined,
    description: apiProduct.description,
  };
}


export function transformSetFromApi(apiSet: any): Set {
  return {
    id: apiSet.slug,
    name: apiSet.name,
    price: apiSet.price,
    weight: apiSet.weight,
    pieces: apiSet.pieces_amount,
    image: apiSet.image,
    composition: apiSet.composition || [],
    allergens: apiSet.allergens || [],
    includedProducts: (apiSet.included_products || []).map((ip: any) => ({
      id: ip.product_id,
      slug: ip.product_slug,
      name: ip.product_name,
      quantity: ip.quantity,
    })),
    isNew: apiSet.is_new,
    benefitBadge: apiSet.benefit_badge || undefined,
    description: apiSet.description,
  };
}

/**
 * Трансформировать все продукты из меню на формат фронтенда
 */
export function transformMenuData(menuData: any[]): MenuData[] {
  return menuData.map(category => {
    const isSetsCategory = category.slug === 'sets';
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      subtitle: category.subtitle,
      products: isSetsCategory
        ? (category.products || []).map(transformSetFromApi)
        : (category.products || []).map(transformProductFromApi),
      subcategories: (category.subcategories || []).map(
        (subcat: { slug: string; name: string; products: any[] }) => ({
          slug: subcat.slug,
          name: subcat.name,
          products: (subcat.products || []).map(transformProductFromApi),
        })
      ),
    };
  });
}

// ─── Auth helpers ───

const TOKEN_KEY = 'tokyo-rolls-token';

export function getStoredToken(): { access: string; refresh: string } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredToken(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const tokens = getStoredToken();
  if (tokens?.access) {
    return { 'Authorization': `Bearer ${tokens.access}`, 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // DRF can return errors in two formats:
    // 1. Non-field: { detail: "message" }
    // 2. Field-level: { field_name: ["message1", "message2"] }
    if (body.detail) {
      throw new Error(String(body.detail));
    }
    // Extract first message from field-level errors
    const messages = Object.values(body).flat();
    if (messages.length > 0) {
      throw new Error(String(messages[0]));
    }
    throw new Error(response.statusText);
  }
  return response.json();
}

// ─── Auth API (Passwordless) ───

export async function requestCode(phone: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/request-code/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return handleResponse(response);
}

export async function verifyCode(data: VerifyCodeData): Promise<AuthTokens & { user: User }> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-code/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const tokens = await handleResponse<AuthTokens & { user: User }>(response);
  setStoredToken({ access: tokens.access, refresh: tokens.refresh });
  return tokens;
}

export async function fetchProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// ─── Address CRUD ───

export async function fetchAddresses(): Promise<Address[]> {
  const response = await fetch(`${API_BASE_URL}/addresses/`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function createAddress(data: AddressFormData): Promise<Address> {
  const response = await fetch(`${API_BASE_URL}/addresses/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateAddress(id: number, data: Partial<AddressFormData>): Promise<Address> {
  const response = await fetch(`${API_BASE_URL}/addresses/${id}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteAddress(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/addresses/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'Failed to delete address');
  }
}

export async function refreshToken(): Promise<{ access: string; refresh: string }> {
  const tokens = getStoredToken();
  if (!tokens?.refresh) throw new Error('No refresh token');
  const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  const data = await handleResponse<{ access: string; refresh: string }>(response);
  setStoredToken({ access: data.access, refresh: data.refresh });
  return data;
}

// ─── Restaurant Settings ───

export async function fetchSettings(): Promise<RestaurantSettings> {
  const response = await fetch(`${API_BASE_URL}/settings/`);
  return handleResponse(response);
}

// ─── Promo Code ───

export async function validatePromo(code: string): Promise<{ code: string; discount_percent: number; description: string }> {
  const response = await fetch(`${API_BASE_URL}/promo/validate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return handleResponse(response);
}

// ─── Checkout ───

export async function submitOrder(data: CheckoutData): Promise<{ payment_url?: string; id: number; status: string }> {
  const response = await fetch(`${API_BASE_URL}/checkout/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// ─── Delivery Zone ───

/** Проверить зону доставки для сохранённого адреса. */
export async function checkDeliveryZone(addressId: number): Promise<DeliveryZoneInfo> {
  const response = await fetch(`${API_BASE_URL}/delivery/check-zone/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ address_id: addressId }),
  });
  return handleResponse(response);
}

// ─── YooKassa Payment Status ───

/** Получить статус оплаты заказа (опрос после возврата с ЮKassa). */
export async function fetchPaymentStatus(orderId: number): Promise<PaymentStatusResult> {
  const response = await fetch(`${API_BASE_URL}/payment/status/${orderId}/`, {
    // bust browser cache — status changes between polls
    cache: 'no-store',
  });
  return handleResponse(response);
}

// ─── Order Tracking ───

/** Получить активный (последний незавершённый) заказ пользователя. */
export async function fetchActiveOrder(): Promise<OrderDetail | null> {
  const response = await fetch(`${API_BASE_URL}/orders/active/`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (response.status === 204) return null;
  return handleResponse(response);
}

/** Получить полную информацию о заказе (для трекера). */
export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
    cache: 'no-store',
  });
  return handleResponse(response);
}
