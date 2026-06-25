import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../hooks/useCart';
import type { MenuItem } from '../types';

const mockProduct: MenuItem = {
  id: 'california',
  name: 'Калифорния',
  category: 'rolls',
  subcategory: 'classic',
  price: 599,
  weight: 220,
  pieces: 8,
  image: '/img.jpg',
  composition: ['рис', 'лосось'],
  allergens: ['рыба'],
  isNew: false,
  description: 'Описание',
};

const mockSet: MenuItem = {
  id: 'set-party',
  name: 'Пати сет',
  price: 1599,
  weight: 800,
  pieces: 24,
  image: '/set.jpg',
  composition: ['роллы'],
  allergens: ['рыба'],
  includedProducts: [],
  isNew: false,
  description: 'Сет',
};

describe('useCart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
  });

  it('addToCart adds a new item', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0]).toEqual({ product: mockProduct, quantity: 1 });
  });

  it('addToCart increments quantity for existing item', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockProduct));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it('addToCart adds multiple different items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockSet));
    expect(result.current.cart).toHaveLength(2);
  });

  it('removeFromCart decrements quantity', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.removeFromCart(mockProduct.id));
    expect(result.current.cart[0].quantity).toBe(1);
  });

  it('removeFromCart removes item when quantity reaches 1', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.removeFromCart(mockProduct.id));
    expect(result.current.cart).toHaveLength(0);
  });

  it('removeFromCart does nothing for unknown item', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.removeFromCart('nonexistent'));
    expect(result.current.cart).toHaveLength(1);
  });

  it('clearItem removes item entirely regardless of quantity', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.clearItem(mockProduct.id));
    expect(result.current.cart).toHaveLength(0);
  });

  it('clearCart removes all items', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.addToCart(mockSet));
    act(() => result.current.clearCart());
    expect(result.current.cart).toEqual([]);
  });

  it('getQuantity returns correct counts', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.getQuantity(mockProduct.id)).toBe(0);
    act(() => result.current.addToCart(mockProduct));
    expect(result.current.getQuantity(mockProduct.id)).toBe(1);
    act(() => result.current.addToCart(mockProduct));
    expect(result.current.getQuantity(mockProduct.id)).toBe(2);
  });

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart(mockProduct));
    const saved = JSON.parse(localStorage.getItem('tokyo-rolls-cart')!);
    expect(saved).toHaveLength(1);
    expect(saved[0].product.id).toBe('california');
  });

  it('restores cart from localStorage on mount', () => {
    localStorage.setItem(
      'tokyo-rolls-cart',
      JSON.stringify([{ product: mockProduct, quantity: 3 }]),
    );
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('tokyo-rolls-cart', 'not-json');
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
  });
});
