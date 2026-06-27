"""Сериализаторы аутентификации: запрос/подтверждение кода, профиль."""

import re

from rest_framework import serializers
from django.core.validators import RegexValidator
from ..models import UserProfile


PHONE_REGEX = r'^(\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$'


def _normalize_phone_strict(value: str) -> str:
    """Strip non-digit chars from phone and convert 8→+7."""
    digits = re.sub(r'[^\d+]', '', value)
    if digits.startswith('8'):
        digits = '+7' + digits[1:]
    elif digits.startswith('7') and not digits.startswith('+'):
        digits = '+' + digits
    return digits


class UserProfileSerializer(serializers.ModelSerializer):
    """Профиль пользователя (чтение и редактирование)."""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'phone', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


class PhoneRequestSerializer(serializers.Serializer):
    """Запрос кода подтверждения по номеру телефона."""
    phone = serializers.CharField(
        max_length=20,
        validators=[RegexValidator(PHONE_REGEX, message='Формат: +7 (XXX) XXX-XX-XX')],
    )

    def validate_phone(self, value):
        return _normalize_phone_strict(value)


class CodeVerifySerializer(serializers.Serializer):
    """Подтверждение кода и получение JWT-токенов."""
    phone = serializers.CharField(
        max_length=20,
        validators=[RegexValidator(PHONE_REGEX, message='Формат: +7 (XXX) XXX-XX-XX')],
    )
    code = serializers.CharField(max_length=4, min_length=4)

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('Код должен содержать только цифры.')
        return value

    def validate_phone(self, value):
        return _normalize_phone_strict(value)
