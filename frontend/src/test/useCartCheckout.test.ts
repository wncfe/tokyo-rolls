import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCartCheckout } from '../hooks/useCartCheckout';
import type { CartItem, MenuItem } from '../types';

const mockValidatePromo = vi.fn();
const mockSubmitOrder = vi.fn();

vi.mock('../api', () => ({
  validatePromo: (...args: any[]) => mockValidatePromo(...args),
  submitOrder: (...args: any[]) => mockSubmitOrder(...args),
}));

const mockProduct: MenuItem = {
  id: 'california',
  name: 'Калифорния',
  category: 'rolls',
  subcategory: 'classic',
  price: 599,
  weight: 220,
  pieces: 8,
  image: '/img.jpg',
  composition: ['рис'],
  allergens: [],
  isNew: false,
  description: '',
};

const cartItem: CartItem = { product: mockProduct, quantity: 2 };

describe('useCartCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCartCheckout(true));
    expect(result.current.promoCode).toBe('');
    expect(result.current.promoData).toBeNull();
    expect(result.current.promoError).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.orderSuccess).toBe(false);
    expect(result.current.orderError).toBeNull();
    expect(result.current.paymentMethod).toBe('card_online');
  });

  it('resets state when drawer opens', () => {
    const { result, rerender } = renderHook(({ isOpen }) => useCartCheckout(isOpen), {
      initialProps: { isOpen: false },
    });

    // Set some state
    act(() => { result.current.setPromoCode('TEST'); });
    act(() => { result.current.setPaymentMethod('cash'); });

    // Re-render with isOpen=true
    rerender({ isOpen: true });

    expect(result.current.promoCode).toBe('');
    expect(result.current.promoData).toBeNull();
    expect(result.current.promoError).toBeNull();
    expect(result.current.orderSuccess).toBe(false);
    expect(result.current.orderError).toBeNull();
    // Note: paymentMethod is NOT reset by the isOpen effect (only initial state)
  });

  it('applies valid promo code', async () => {
    mockValidatePromo.mockResolvedValue({ code: 'DISCOUNT10', discount_percent: 10, description: '10% скидка' });

    const { result } = renderHook(() => useCartCheckout(true));
    act(() => { result.current.setPromoCode('DISCOUNT10'); });

    await act(async () => {
      await result.current.handlePromoApply();
    });

    expect(result.current.promoData).toEqual({ code: 'DISCOUNT10', discount_percent: 10, description: '10% скидка' });
    expect(result.current.promoError).toBeNull();
  });

  it('shows error for invalid promo code', async () => {
    mockValidatePromo.mockRejectedValue(new Error('Промокод не найден'));

    const { result } = renderHook(() => useCartCheckout(true));
    act(() => { result.current.setPromoCode('INVALID'); });

    await act(async () => {
      await result.current.handlePromoApply();
    });

    expect(result.current.promoData).toBeNull();
    expect(result.current.promoError).toBe('Промокод не найден');
  });

  it('clears promo when code is empty', async () => {
    const { result } = renderHook(() => useCartCheckout(true));

    // First set a promo
    mockValidatePromo.mockResolvedValue({ code: 'TEST', discount_percent: 5, description: '5%' });
    act(() => { result.current.setPromoCode('TEST'); });
    await act(async () => { await result.current.handlePromoApply(); });
    expect(result.current.promoData).toBeTruthy();

    // Then clear it
    act(() => { result.current.setPromoCode(''); });
    await act(async () => { await result.current.handlePromoApply(); });
    expect(result.current.promoData).toBeNull();
    expect(result.current.promoError).toBeNull();
  });

  it('submits delivery order with address_id', async () => {
    mockSubmitOrder.mockResolvedValue({ id: 1 });
    const onClearCart = vi.fn();

    const { result } = renderHook(() => useCartCheckout(true));

    await act(async () => {
      await result.current.handleCheckout({
        cart: [cartItem],
        orderType: 'delivery',
        selectedAddressId: 1,
        deliveryAddress: '',
        paymentMethod: 'card_online',
        onClearCart,
      });
    });

    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order_type: 'delivery',
        payment_method: 'card_online',
        address_id: 1,
        items: [{ product_slug: 'california', quantity: 2 }],
      }),
    );
    expect(result.current.orderSuccess).toBe(true);
    expect(onClearCart).toHaveBeenCalled();
  });

  it('submits pickup order', async () => {
    mockSubmitOrder.mockResolvedValue({ id: 1 });
    const onClearCart = vi.fn();

    const { result } = renderHook(() => useCartCheckout(true));

    await act(async () => {
      await result.current.handleCheckout({
        cart: [cartItem],
        orderType: 'pickup',
        selectedAddressId: null,
        deliveryAddress: '',
        paymentMethod: 'cash',
        onClearCart,
      });
    });

    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_slug: 'california', quantity: 2 }],
      }),
    );
    expect(result.current.orderSuccess).toBe(true);
  });

  it('submits order with set_slug for sets', async () => {
    mockSubmitOrder.mockResolvedValue({ id: 1 });
    const onClearCart = vi.fn();

    const mockSet: MenuItem = {
      id: 'set-party',
      name: 'Пати сет',
      price: 1599,
      weight: 800,
      pieces: 24,
      image: '/set.jpg',
      composition: [],
      allergens: [],
      includedProducts: [],
      isNew: false,
      description: '',
    };

    const { result } = renderHook(() => useCartCheckout(true));

    await act(async () => {
      await result.current.handleCheckout({
        cart: [{ product: mockSet, quantity: 1 }],
        orderType: 'delivery',
        selectedAddressId: 1,
        deliveryAddress: '',
        paymentMethod: 'card_online',
        onClearCart,
      });
    });

    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ set_slug: 'set-party', quantity: 1 }],
      }),
    );
  });

  it('handles checkout error', async () => {
    mockSubmitOrder.mockRejectedValue(new Error('Минимальная сумма заказа 700₽'));
    const onClearCart = vi.fn();

    const { result } = renderHook(() => useCartCheckout(true));

    await act(async () => {
      await result.current.handleCheckout({
        cart: [cartItem],
        orderType: 'delivery',
        selectedAddressId: 1,
        deliveryAddress: '',
        paymentMethod: 'card_online',
        onClearCart,
      });
    });

    expect(result.current.orderError).toBe('Минимальная сумма заказа 700₽');
    expect(result.current.orderSuccess).toBe(false);
    expect(onClearCart).not.toHaveBeenCalled();
  });

  it('submits order with promo code included', async () => {
    mockSubmitOrder.mockResolvedValue({ id: 1 });
    mockValidatePromo.mockResolvedValue({ code: 'PROMO10', discount_percent: 10, description: '10%' });
    const onClearCart = vi.fn();

    const { result } = renderHook(() => useCartCheckout(true));

    // Apply promo first
    act(() => { result.current.setPromoCode('PROMO10'); });
    await act(async () => { await result.current.handlePromoApply(); });

    await act(async () => {
      await result.current.handleCheckout({
        cart: [cartItem],
        orderType: 'pickup',
        selectedAddressId: null,
        deliveryAddress: '',
        paymentMethod: 'card_online',
        onClearCart,
      });
    });

    expect(mockSubmitOrder).toHaveBeenCalledWith(
      expect.objectContaining({ promo_code: 'PROMO10' }),
    );
  });
});
