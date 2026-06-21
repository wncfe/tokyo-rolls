import { useQuery } from '@tanstack/react-query';
import { fetchMenu, transformMenuData, fetchSettings } from '../api';
import type { RestaurantSettings } from '../types';

// ── localStorage persistence ──

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function loadCached<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return (JSON.parse(raw) as CacheEntry<T>).data;
  } catch {
    return undefined;
  }
}

function loadCachedTimestamp(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    return (JSON.parse(raw) as CacheEntry<unknown>).timestamp;
  } catch {
    return 0;
  }
}

function saveCached(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded – silent */ }
}

// ── query keys ──

const MENU_CACHE_KEY = 'tr-menu-v1';
const SETTINGS_CACHE_KEY = 'tr-settings-v1';
const STALE_TIME = 5 * 60 * 1000; // 5 min

// ── hooks ──

export function useMenuQuery() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const data = await fetchMenu();
      saveCached(MENU_CACHE_KEY, data);
      return data;
    },
    initialData: () => loadCached(MENU_CACHE_KEY),
    initialDataUpdatedAt: () => loadCachedTimestamp(MENU_CACHE_KEY),
    select: transformMenuData,
    staleTime: STALE_TIME,
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await fetchSettings();
      saveCached(SETTINGS_CACHE_KEY, data);
      return data;
    },
    initialData: () => loadCached<RestaurantSettings>(SETTINGS_CACHE_KEY),
    initialDataUpdatedAt: () => loadCachedTimestamp(SETTINGS_CACHE_KEY),
    staleTime: STALE_TIME,
  });
}
