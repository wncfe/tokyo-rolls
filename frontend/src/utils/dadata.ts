/** Интерфейс подсказки DaData. */
export interface DaDataSuggestion {
  value: string;
  unrestricted_value: string;
  data: {
    postal_code?: string;
    country?: string;
    region?: string;
    region_with_type?: string;
    city?: string;
    city_with_type?: string;
    street?: string;
    street_with_type?: string;
    house?: string;
    flat?: string;
    geo_lat?: string;
    geo_lon?: string;
    [key: string]: unknown;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Получить подсказки по адресу через наш backend-прокси.
 * Ключ DaData хранится только на сервере и никогда не попадает в браузер.
 */
export async function suggestAddress(
  query: string,
): Promise<DaDataSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/dadata/suggest/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    });

    if (!res.ok) {
      console.error('DaData proxy error', res.status);
      return [];
    }

    return res.json();
  } catch (err) {
    console.error('DaData proxy network error', err);
    return [];
  }
}
