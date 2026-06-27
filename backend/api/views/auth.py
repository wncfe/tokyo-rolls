import logging
import re
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import UserProfile
from ..serializers import (
    PhoneRequestSerializer, CodeVerifySerializer, UserProfileSerializer,
)
from ..throttles import AuthRequestCodeThrottle, AuthVerifyCodeThrottle

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str:
    """Нормализовать телефон: убрать всё кроме + и цифр → +79123456789."""
    digits = re.sub(r'[^\d+]', '', phone)
    if digits.startswith('8'):
        digits = '+7' + digits[1:]
    elif digits.startswith('7') and not digits.startswith('+'):
        digits = '+' + digits
    return digits


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthRequestCodeThrottle])
def request_code(request):
    """Запросить код подтверждения по номеру телефона. Код всегда 1234 (заглушка)."""
    serializer = PhoneRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = _normalize_phone(serializer.validated_data['phone'])

    # Найти или создать профиль по телефону
    profile = UserProfile.objects.filter(phone=phone).first()
    if not profile:
        # Новый пользователь — создаём Django User и профиль
        user = User.objects.create_user(
            username=phone,
            password=None,  # unusable password
        )
        user.set_unusable_password()
        user.save()
        profile = UserProfile.objects.create(user=user, phone=phone)

    # Установить код (хардкод 1234)
    profile.verification_code = '1234'
    profile.code_sent_at = timezone.now()
    profile.save(update_fields=['verification_code', 'code_sent_at'])

    return Response({'success': True, 'detail': 'Код отправлен'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthVerifyCodeThrottle])
def verify_code(request):
    """Подтвердить код и получить JWT-токены. Если пользователь новый — авто-создаётся."""
    serializer = CodeVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    phone = _normalize_phone(serializer.validated_data['phone'])
    code = serializer.validated_data['code']

    profile = UserProfile.objects.filter(phone=phone).first()
    if not profile:
        return Response({'detail': 'Пользователь с таким номером не найден. Сначала запросите код.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_code != code:
        return Response({'detail': 'Неверный код подтверждения.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Проверка срока действия кода (5 минут)
    if profile.code_sent_at and (timezone.now() - profile.code_sent_at) > timedelta(minutes=5):
        return Response({'detail': 'Код подтверждения истёк. Запросите новый код.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Код верный — очищаем и выдаём токены
    profile.verification_code = ''
    profile.save(update_fields=['verification_code'])

    user = profile.user
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'phone': profile.phone,
        },
    })


class ProfileView(generics.RetrieveUpdateAPIView):
    """Профиль текущего пользователя."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
