import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  transformProductFromApi,
  transformSetFromApi,
  transformMenuData,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '../api';

// ─── Token helpers (localStorage) ───

describe('token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getStoredToken returns null when no token', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('setStoredToken stores and getStoredToken retrieves', () => {
    setStoredToken({ access: 'abc', refresh: 'def' });
    expect(getStoredToken()).toEqual({ access: 'abc', refresh: 'def' });
  });

  it('clearStoredToken removes the token', () => {
    setStoredToken({ access: 'abc', refresh: 'def' });
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });

  it('getStoredToken returns null on corrupt JSON', () => {
    localStorage.setItem('tokyo-rolls-token', 'not-json');
    expect(getStoredToken()).toBeNull();
  });
});

// ─── Transform helpers ───

describe('transformProductFromApi', () => {
  const apiProduct = {
    slug: 'california-roll',
    name: 'Калифорния',
    category_slug: 'rolls',
    subcategory_slug: 'classic',
    price: 599,
    weight: 220,
    pieces_amount: 8,
    image: '/media/products/california.jpg',
    composition: ['рис', 'лосось', 'авокадо'],
    allergens: ['рыба'],
    is_new: true,
    benefit_badge: 'Хит',
    description: 'Классический ролл',
  };

  it('transforms all fields correctly', () => {
    const result = transformProductFromApi(apiProduct);
    expect(result).toEqual({
      id: 'california-roll',
      name: 'Калифорния',
      category: 'rolls',
      subcategory: 'classic',
      price: 599,
      weight: 220,
      pieces: 8,
      image: '/media/products/california.jpg',
      composition: ['рис', 'лосось', 'авокадо'],
      allergens: ['рыба'],
      isNew: true,
      benefitBadge: 'Хит',
      description: 'Классический ролл',
    });
  });

  it('handles missing optional fields', () => {
    const minimal = { ...apiProduct, subcategory_slug: undefined, is_new: false, benefit_badge: null };
    const result = transformProductFromApi(minimal);
    expect(result.subcategory).toBeUndefined();
    expect(result.isNew).toBe(false);
    expect(result.benefitBadge).toBeUndefined();
  });

  it('handles empty composition and allergens', () => {
    const empty = { ...apiProduct, composition: [], allergens: [] };
    const result = transformProductFromApi(empty);
    expect(result.composition).toEqual([]);
    expect(result.allergens).toEqual([]);
  });
});

describe('transformSetFromApi', () => {
  const apiSet = {
    slug: 'set-party',
    name: 'Пати сет',
    price: 1599,
    weight: 800,
    pieces_amount: 24,
    image: '/media/sets/party.jpg',
    composition: ['роллы', 'нигири'],
    allergens: ['рыба', 'соя'],
    included_products: [
      { product_id: 1, product_slug: 'california', product_name: 'Калифорния', quantity: 8 },
    ],
    is_new: true,
    benefit_badge: '20% выгода',
    description: 'Большой сет',
  };

  it('transforms all fields correctly', () => {
    const result = transformSetFromApi(apiSet);
    expect(result).toEqual({
      id: 'set-party',
      name: 'Пати сет',
      price: 1599,
      weight: 800,
      pieces: 24,
      image: '/media/sets/party.jpg',
      composition: ['роллы', 'нигири'],
      allergens: ['рыба', 'соя'],
      includedProducts: [
        { id: 1, slug: 'california', name: 'Калифорния', quantity: 8 },
      ],
      isNew: true,
      benefitBadge: '20% выгода',
      description: 'Большой сет',
    });
  });

  it('handles empty included_products', () => {
    const empty = { ...apiSet, included_products: [] };
    const result = transformSetFromApi(empty);
    expect(result.includedProducts).toEqual([]);
  });
});

describe('transformMenuData', () => {
  const apiMenu = [
    {
      id: 1,
      slug: 'rolls',
      name: 'Роллы',
      subtitle: 'Классические роллы',
      products: [
        {
          slug: 'california',
          name: 'Калифорния',
          category_slug: 'rolls',
          subcategory_slug: 'classic',
          price: 599,
          weight: 220,
          pieces_amount: 8,
          image: '/img.jpg',
          composition: [],
          allergens: [],
          is_new: false,
          benefit_badge: null,
          description: 'Описание',
        },
      ],
      subcategories: [
        {
          slug: 'classic',
          name: 'Классические',
          products: [
            {
              slug: 'philadelphia',
              name: 'Филадельфия',
              category_slug: 'rolls',
              subcategory_slug: 'classic',
              price: 699,
              weight: 240,
              pieces_amount: 8,
              image: '/img2.jpg',
              composition: [],
              allergens: [],
              is_new: false,
              benefit_badge: null,
              description: 'Описание',
            },
          ],
        },
      ],
    },
    {
      id: 2,
      slug: 'sets',
      name: 'Сеты',
      subtitle: 'Наборы',
      products: [
        {
          slug: 'set-party',
          name: 'Пати сет',
          price: 1599,
          weight: 800,
          pieces_amount: 24,
          image: '/set.jpg',
          composition: [],
          allergens: [],
          included_products: [],
          is_new: false,
          benefit_badge: null,
          description: 'Сет',
        },
      ],
      subcategories: [],
    },
  ];

  it('transforms menu data with products and subcategories', () => {
    const result = transformMenuData(apiMenu);
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe('rolls');
    expect(result[0].products).toHaveLength(1);
    expect(result[0].subcategories).toHaveLength(1);
    expect(result[0].subcategories![0].products).toHaveLength(1);

    // sets category uses transformSetFromApi
    expect(result[1].slug).toBe('sets');
    expect(result[1].products[0]).toHaveProperty('includedProducts');
  });

  it('handles empty menu data', () => {
    expect(transformMenuData([])).toEqual([]);
  });
});
