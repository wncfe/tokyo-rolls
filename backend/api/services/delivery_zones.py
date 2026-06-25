"""
Сервис работы с зонами доставки из GeoJSON.

Алгоритм: pure-Python ray-casting (point-in-polygon) без внешних зависимостей.
Координаты в GeoJSON хранятся в формате [longitude, latitude] — стандарт RFC 7946.
"""

import json
import os
from typing import Optional


# Абсолютный путь к GeoJSON-файлу относительно этого модуля
_THIS_FILE = os.path.abspath(__file__)  # .../backend/api/services/delivery_zones.py
_GEOJSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_THIS_FILE)))),
    'delivery_zones.geojson',
)

# Кэш загруженных зон (lazy load при первом вызове)
_zones_cache: Optional[dict] = None


def _load_zones() -> dict:
    """Загрузить и распарсить delivery_zones.geojson.

    Returns:
        dict: {'free_delivery': [[(lon, lat), ...]], '800_delivery': [[(lon, lat), ...]]}
    """
    global _zones_cache
    if _zones_cache is not None:
        return _zones_cache

    zones: dict[str, list] = {}

    with open(_GEOJSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for feature in data.get('features', []):
        name = feature.get('properties', {}).get('Name', '')
        if not name:
            continue  # пропускаем мусорные полигоны без Name

        geometry = feature.get('geometry', {})
        if geometry.get('type') != 'Polygon':
            continue

        # GeoJSON Polygon: coordinates[0] — внешнее кольцо [[lon, lat], ...]
        rings = geometry.get('coordinates', [])
        if not rings:
            continue

        # Берём первое (внешнее) кольцо; игнорируем отверстия для простоты
        outer_ring = [(pt[0], pt[1]) for pt in rings[0]]
        zones[name] = outer_ring

    _zones_cache = zones
    return zones


def _point_in_polygon(lon: float, lat: float, polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting алгоритм: определяет, находится ли точка внутри полигона.

    Луч идёт горизонтально вправо от точки. Подсчитываем пересечения с рёбрами.
    Нечётное число пересечений → точка внутри.
    """
    n = len(polygon)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]

        # Проверяем, пересекает ли горизонтальный луч ребро (xi,yi)-(xj,yj)
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside


def get_delivery_zone(lon: float, lat: float) -> Optional[str]:
    """Определить зону доставки по координатам.

    Args:
        lon: долгота (из DaData geo_lon)
        lat: широта (из DaData geo_lat)

    Returns:
        'free_delivery' — бесплатная зона
        '800_delivery' — зона с доставкой 100₽
        None — адрес вне любой зоны доставки
    """
    zones = _load_zones()

    # Приоритет: сначала проверяем free_delivery (меньшая зона, внутри 800_delivery)
    if 'free_delivery' in zones:
        if _point_in_polygon(lon, lat, zones['free_delivery']):
            return 'free_delivery'

    if '800_delivery' in zones:
        if _point_in_polygon(lon, lat, zones['800_delivery']):
            return '800_delivery'

    return None


# Правила для каждой зоны доставки
ZONE_RULES = {
    'free_delivery': {
        'min_order_amount': 700,
        'delivery_fee': 0,
    },
    '800_delivery': {
        'min_order_amount': 800,
        'delivery_fee': 100,
    },
}


def get_zone_rules(zone: Optional[str]) -> dict:
    """Получить правила (мин. заказ, стоимость доставки) для зоны.

    Args:
        zone: имя зоны ('free_delivery', '800_delivery') или None

    Returns:
        dict с ключами min_order_amount, delivery_fee
        Для None возвращает min_order_amount=0, delivery_fee=0 (недоставляемая зона)
    """
    if zone and zone in ZONE_RULES:
        return ZONE_RULES[zone]
    return {'min_order_amount': 0, 'delivery_fee': 0}
