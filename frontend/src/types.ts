export interface Product {
  id: string;
  name: string;
  category: 'sushi' | 'rolls' | 'hot' | 'desserts' | 'drinks' | 'sauces' | 'pokesalads' | 'dop';
  subcategory?: 'baked' | 'warm' | 'classic' | 'firm' | 'free';
  price: number;
  weight: number; // in grams
  pieces: number; // number of pieces
  image: string; // uploaded image URL (via /media/)
  composition: string[]; // Detailed ingredients
  allergens: string[]; // List of allergens
  isNew?: boolean;
  benefitBadge?: string; // e.g. "15% выгода"
  description: string;
}

export interface IncludedProduct {
  id: number;
  slug: string;
  name: string;
  quantity: number;
}

export interface Set {
  id: string;
  name: string;
  price: number;
  weight: number;
  pieces: number;
  image: string;
  composition: string[];
  allergens: string[];
  includedProducts: IncludedProduct[];
  isNew?: boolean;
  benefitBadge?: string;
  description: string;
}

export type MenuItem = Product | Set;

export interface CartItem {
  product: MenuItem;
  quantity: number;
}

// Auth types
export interface User {
  id: number;
  username: string;
  phone: string;
  address: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  phone: string;
}

// Restaurant settings from backend
export interface RestaurantSettings {
  opening_hour: number;
  closing_hour: number;
  min_order_amount: number;
  free_delivery_from: number;
  suburban_delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
}

// Checkout request
export interface CheckoutData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  comment: string;
  promo_code: string;
  items: CheckoutItem[];
}

export interface CheckoutItem {
  product_slug?: string;
  set_slug?: string;
  quantity: number;
}
