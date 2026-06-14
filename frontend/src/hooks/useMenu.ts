import { useState, useEffect } from 'react';
import { MenuItem, RestaurantSettings } from '../types';
import { fetchMenu, transformMenuData, fetchSettings, MenuData } from '../api';

export function useMenu() {
  const [menuData, setMenuData] = useState<MenuData[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>({
    opening_hour: 11,
    closing_hour: 23,
    min_order_amount: 700,
    free_delivery_from: 700,
    suburban_delivery_fee: 100,
    delivery_time_min: 45,
    delivery_time_max: 60,
    restaurant_address: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingMenu(true);
        setMenuError(null);
        const [data, settings] = await Promise.all([fetchMenu(), fetchSettings()]);
        setMenuData(transformMenuData(data));
        setRestaurantSettings(settings);
      } catch (error) {
        console.error('Failed to load menu:', error);
        setMenuError('Не удалось загрузить меню. Проверьте подключение к серверу.');
      } finally {
        setIsLoadingMenu(false);
      }
    };
    load();
  }, []);

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
