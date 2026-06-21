import { MenuItem, RestaurantSettings } from '../types';
import { useMenuQuery, useSettingsQuery } from './useMenuQuery';

const DEFAULT_SETTINGS: RestaurantSettings = {
  opening_hour: 11,
  closing_hour: 23,
  min_order_amount: 700,
  free_delivery_from: 700,
  suburban_delivery_fee: 100,
  delivery_time_min: 45,
  delivery_time_max: 60,
  restaurant_address: '',
  pickup_discount_percent: 10,
  is_open: true,
};

export function useMenu() {
  const menuQuery = useMenuQuery();
  const settingsQuery = useSettingsQuery();

  const menuData = menuQuery.data ?? [];
  const restaurantSettings = settingsQuery.data ?? DEFAULT_SETTINGS;

  // Show loader ONLY on very first mount when there is no cache at all.
  // With initialData from localStorage, isLoading stays false after F5.
  const isLoadingMenu = menuQuery.isLoading || settingsQuery.isLoading;

  // Show error ONLY when there is NO data to render (no cache + fetch failed).
  // If we have cached data, silently keep showing it while retrying in background.
  const menuError =
    menuQuery.data === undefined && settingsQuery.data === undefined
      ? ((menuQuery.error as Error)?.message ??
         (settingsQuery.error as Error)?.message ??
         null)
      : null;

  const getProductsByCategory = (categorySlug: string, subcategorySlug?: string): MenuItem[] => {
    if (!menuData || menuData.length === 0) return [];
    const category = menuData.find((cat) => cat.slug === categorySlug);
    if (!category) return [];
    if (categorySlug === 'rolls' && subcategorySlug) {
      const subcat = category.subcategories?.find((sub) => sub.slug === subcategorySlug);
      return subcat?.products || [];
    }
    return category.products || [];
  };

  const findProductById = (productId: string): MenuItem | undefined => {
    for (const category of menuData) {
      const found = category.products?.find((p) => p.id === productId);
      if (found) return found;
      if (category.subcategories) {
        for (const subcat of category.subcategories) {
          const found = subcat.products?.find((p) => p.id === productId);
          if (found) return found;
        }
      }
    }
    return undefined;
  };

  return {
    menuData,
    isLoadingMenu,
    menuError,
    restaurantSettings,
    getProductsByCategory,
    findProductById,
  };
}
