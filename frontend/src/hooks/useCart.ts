import { useState, useEffect, useCallback } from 'react';
import { CartItem, MenuItem } from '../types';

const CART_STORAGE_KEY = 'tokyo-rolls-cart';

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  }, [cart]);

  const addToCart = useCallback((product: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === productId);
      if (idx > -1) {
        const item = prev[idx];
        if (item.quantity > 1) {
          return prev.map((item, i) =>
            i === idx ? { ...item, quantity: item.quantity - 1 } : item
          );
        }
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev;
    });
  }, []);

  const clearItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getQuantity = useCallback(
    (productId: string) => cart.find((i) => i.product.id === productId)?.quantity ?? 0,
    [cart],
  );

  return { cart, addToCart, removeFromCart, clearItem, clearCart, getQuantity };
}
