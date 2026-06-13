import { Product, AuthTokens, LoginData, RegisterData, User } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface MenuData {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  products: Product[];
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
    image: apiProduct.image_url,
    composition: apiProduct.composition || [],
    allergens: apiProduct.allergens || [],
    isNew: apiProduct.is_new,
    benefitBadge: apiProduct.benefit_badge || undefined,
    description: apiProduct.description,
  };
}

/**
 * Трансформировать все продукты из меню на формат фронтенда
 */
export function transformMenuData(menuData: any[]): MenuData[] {
  return menuData.map(category => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    subtitle: category.subtitle,
    products: (category.products || []).map(transformProductFromApi),
    subcategories: (category.subcategories || []).map((subcat: { slug: string; name: string; products: any[] }) => ({
      slug: subcat.slug,
      name: subcat.name,
      products: (subcat.products || []).map(transformProductFromApi),
    })),
  }));
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
    throw new Error(body.detail || response.statusText);
  }
  return response.json();
}

// ─── Auth API ───

export async function loginUser(data: LoginData): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const tokens = await handleResponse<AuthTokens>(response);
  setStoredToken(tokens);
  return tokens;
}

export async function registerUser(data: RegisterData): Promise<{ id: number; username: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function fetchProfile(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function refreshToken(): Promise<{ access: string }> {
  const tokens = getStoredToken();
  if (!tokens?.refresh) throw new Error('No refresh token');
  const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  const data = await handleResponse<{ access: string }>(response);
  setStoredToken({ ...tokens, access: data.access });
  return data;
}
