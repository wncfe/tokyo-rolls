export interface Product {
  id: string;
  name: string;
  category: 'sets' | 'sushi' | 'rolls' | 'hot' | 'desserts' | 'drinks' | 'sauces';
  subcategory?: 'baked' | 'warm' | 'classic';
  price: number;
  weight: number; // in grams
  pieces: number; // number of pieces
  image: string; // Unsplash URL or high-quality illustration
  composition: string[]; // Detailed ingredients
  allergens: string[]; // List of allergens
  isNew?: boolean;
  benefitBadge?: string; // e.g. "15% выгода"
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
