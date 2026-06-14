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
  phone: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface PhoneAuthData {
  phone: string;
}

export interface VerifyCodeData {
  phone: string;
  code: string;
}

// Saved address
export interface Address {
  id: number;
  full_address: string;
  flat: string;
  entrance: string;
  floor: string;
  intercom: string;
  comment: string;
  is_default: boolean;
  created_at: string;
}

export interface AddressFormData {
  full_address: string;
  flat: string;
  entrance: string;
  floor: string;
  intercom: string;
  comment: string;
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
  restaurant_address: string;
  pickup_discount_percent: number;
  is_open: boolean;  // вычисляется сервером по Asia/Yekaterinburg (Пермь)
}

// Checkout request
export interface CheckoutData {
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  address_id?: number;
  comment: string;
  promo_code: string;
  order_type: 'delivery' | 'pickup';
  items: CheckoutItem[];
}

export interface CheckoutItem {
  product_slug?: string;
  set_slug?: string;
  quantity: number;
}
