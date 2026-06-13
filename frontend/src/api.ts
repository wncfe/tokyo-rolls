import { Product } from './types';

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
    subcategories: (category.subcategories || []).map(subcat => ({
      slug: subcat.slug,
      name: subcat.name,
      products: (subcat.products || []).map(transformProductFromApi),
    })),
  }));
}
