import { RestaurantSettings } from '../types';

/**
 * Текущее время в часовом поясе Перми (Asia/Yekaterinburg, UTC+5).
 */
function getPermHour(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yekaterinburg',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(now), 10);
}

/**
 * Статус ресторана — вычисляется на фронтенде по времени Asia/Yekaterinburg (Пермь).
 *
 * Почему не брать is_open с бэкенда?
 * - settings кешируются в localStorage и React Query (staleTime),
 *   поэтому is_open протухает и показывает неверный статус,
 *   пока не выполнится фоновый refetch.
 * - opening_hour / closing_hour почти не меняются, их можно кешировать
 *   без риска, а is_open вычислять локально — всегда актуально.
 */
export function useRestaurantStatus(settings: RestaurantSettings): boolean {
  const hour = getPermHour();
  return settings.opening_hour <= hour && hour < settings.closing_hour;
}
