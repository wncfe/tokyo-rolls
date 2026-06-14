import { RestaurantSettings } from '../types';

/**
 * Статус ресторана — определяется сервером по времени Asia/Yekaterinburg (Пермь).
 * Хук просто возвращает is_open из настроек, полученных с бэкенда.
 */
export function useRestaurantStatus(settings: RestaurantSettings): boolean {
  return settings.is_open;
}
