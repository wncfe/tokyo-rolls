import logging
import os

import requests
from django.http import JsonResponse
from django.views.decorators.cache import cache_control
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ..models import RestaurantSettings
from ..serializers import RestaurantSettingsSerializer, PromoCodeValidateSerializer

logger = logging.getLogger(__name__)


def health(request):
    return JsonResponse({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@cache_control(max_age=60, public=True)
def restaurant_settings(request):
    """Публичные настройки ресторана: часы работы, мин. заказ, доставка."""
    settings = RestaurantSettings.get_solo()
    return Response(RestaurantSettingsSerializer(settings).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def validate_promo(request):
    """Проверить промокод и вернуть скидку."""
    serializer = PromoCodeValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    promo = serializer.get_promo()
    if promo is None:
        return Response(
            {'detail': 'Промокод не найден, истёк или неактивен.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response({
        'code': promo.code,
        'discount_percent': promo.discount_percent,
        'description': promo.description,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def dadata_suggest(request):
    """Прокси для DaData Suggest API — ключ хранится только на сервере."""
    query = request.data.get('query', '')
    if not query or len(query.strip()) < 2:
        return Response([], status=status.HTTP_200_OK)

    api_key = os.environ.get('DADATA_API_KEY', '')
    if not api_key:
        # Возвращаем пустой список без ошибки — поле остаётся ручным вводом
        return Response([], status=status.HTTP_200_OK)

    try:
        resp = requests.post(
            'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
            json={
                'query': query.strip(),
                'count': 10,
                'locations': [{'city': 'Пермь'}],
                'to_bound': {'value': 'house'},
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Token {api_key}',
            },
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()

        suggestions = data.get('suggestions', [])

        # Отфильтровываем подсказки с низким качеством координат
        # qc_geo: 0=точные, 1=ближайший дом, 2=улица, 3=нп, 4=город, 5=не определены
        # Отбрасываем только 4 (центр города) и 5 (не определены) — fallback'и
        def is_quality_suggestion(suggestion):
            qc = suggestion.get('data', {}).get('qc_geo')
            if qc is None or qc == '':
                return True  # нет данных — доверяем
            try:
                return int(qc) not in (4, 5)
            except (ValueError, TypeError):
                return True

        suggestions = [s for s in suggestions if is_quality_suggestion(s)]

        return Response(suggestions, status=status.HTTP_200_OK)
    except requests.RequestException as e:
        logger.warning('DaData request failed: %s', e)
        return Response(
            {'detail': 'Сервис подсказок временно недоступен.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
