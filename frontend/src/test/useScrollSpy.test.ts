import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { useRestaurantStatus } from '../hooks/useRestaurantStatus';
import type { RestaurantSettings } from '../types';

// ─── useScrollSpy ───

describe('useScrollSpy', () => {
  beforeEach(() => {
    // Clean up any elements added to the DOM
    document.body.innerHTML = '';
    window.scrollY = 0;
    // Mock scrollTo
    window.scrollTo = vi.fn();
  });

  it('starts with default category and subcategory', () => {
    const { result } = renderHook(() => useScrollSpy());
    expect(result.current.activeCategory).toBe('sets');
    expect(result.current.activeSubcategory).toBe('firm');
  });

  it('navigateTo scrolls to a section and sets active category', () => {
    // Create a mock element at a known position
    const el = document.createElement('div');
    el.id = 'category-sushi';
    el.getBoundingClientRect = vi.fn(() => ({
      top: 500,
      bottom: 1000,
      left: 0,
      right: 0,
      width: 0,
      height: 500,
      x: 0,
      y: 500,
      toJSON: () => ({}),
    }));
    document.body.appendChild(el);
    // Set scrollY so the element is considered "above fold" relatively
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true });

    const { result } = renderHook(() => useScrollSpy());
    act(() => {
      result.current.navigateTo('sushi');
    });

    expect(result.current.activeCategory).toBe('sushi');
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    );
  });

  it('navigateTo handles rolls with subcategory', () => {
    const el = document.createElement('div');
    el.id = 'category-rolls-classic';
    el.getBoundingClientRect = vi.fn(() => ({
      top: 400, bottom: 800, left: 0, right: 0, width: 0, height: 400, x: 0, y: 400,
      toJSON: () => ({}),
    }));
    document.body.appendChild(el);

    const { result } = renderHook(() => useScrollSpy());
    act(() => {
      result.current.navigateTo('rolls', 'classic');
    });

    expect(result.current.activeCategory).toBe('rolls');
    expect(result.current.activeSubcategory).toBe('classic');
  });

  it('scroll detection updates active category', () => {
    // Create section elements with mocked offsetTop via getter
    const setsEl = document.createElement('div');
    setsEl.id = 'category-sets';
    document.body.appendChild(setsEl);

    const sushiEl = document.createElement('div');
    sushiEl.id = 'category-sushi';
    document.body.appendChild(sushiEl);

    // offsetTop is a read-only layout property, mock via getter
    Object.defineProperty(setsEl, 'offsetTop', { get: () => 0 });
    Object.defineProperty(sushiEl, 'offsetTop', { get: () => 500 });

    Object.defineProperty(window, 'scrollY', { value: 600, writable: true });

    const { result } = renderHook(() => useScrollSpy());

    // Trigger scroll event
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    // Should detect sushi when scrolled past 500 + 180 offset
    expect(result.current.activeCategory).toBe('sushi');
  });
});

// ─── useRestaurantStatus ───

describe('useRestaurantStatus', () => {
  it('returns is_open from settings', () => {
    const settings: RestaurantSettings = {
      opening_hour: 10,
      closing_hour: 22,
      min_order_amount: 700,
      free_delivery_from: 1500,
      suburban_delivery_fee: 200,
      delivery_time_min: 45,
      delivery_time_max: 60,
      restaurant_address: 'г Пермь, ул Ленина, д 1',
      pickup_discount_percent: 10,
      is_open: true,
    };
    const { result } = renderHook(() => useRestaurantStatus(settings));
    expect(result.current).toBe(true);
  });

  it('returns false when restaurant is closed', () => {
    const settings: RestaurantSettings = {
      opening_hour: 10,
      closing_hour: 22,
      min_order_amount: 700,
      free_delivery_from: 1500,
      suburban_delivery_fee: 200,
      delivery_time_min: 45,
      delivery_time_max: 60,
      restaurant_address: 'г Пермь, ул Ленина, д 1',
      pickup_discount_percent: 10,
      is_open: false,
    };
    const { result } = renderHook(() => useRestaurantStatus(settings));
    expect(result.current).toBe(false);
  });
});
