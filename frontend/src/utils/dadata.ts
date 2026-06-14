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

interface DaDataResponse {
  suggestions: DaDataSuggestion[];
}

const DADATA_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';

const API_KEY = import.meta.env.VITE_DADATA_API_KEY as string | undefined;

/**
 * Получить подсказки по адресу через DaData Suggest API.
 * ВАЖНО: ключ передаётся с заголовком Authorization: Token {key}.
 * Приоритет подсказок — город Пермь.
 */
export async function suggestAddress(
  query: string,
): Promise<DaDataSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  if (!API_KEY) {
    console.warn('VITE_DADATA_API_KEY не задан — подсказки DaData недоступны.');
    return [];
  }

  try {
    const res = await fetch(DADATA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${API_KEY}`,
      },
      body: JSON.stringify({
        query: query.trim(),
        count: 10,
        locations: [{ city: 'Пермь' }],
      }),
    });

    if (!res.ok) {
      console.error('DaData error', res.status);
      return [];
    }

    const data: DaDataResponse = await res.json();
    return data.suggestions ?? [];
  } catch (err) {
    console.error('DaData network error', err);
    return [];
  }
}
