"""Dashboard: профиль пользователя."""

from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from ...models import UserProfile
from ...serializers import AdminUserProfileSerializer
from .orders import IsStaffUser


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated, IsStaffUser])
def admin_profile(request):
    """Профиль пользователя дашборда (чтение + редактирование роли)."""
    try:
        profile = request.user.profile
    except (AttributeError, UserProfile.DoesNotExist):
        profile = UserProfile.objects.create(user=request.user)

    if request.method == 'GET':
        return Response(AdminUserProfileSerializer(profile).data)

    role = request.data.get('role')
    if role and role in dict(UserProfile._meta.get_field('role').choices):
        profile.role = role
        profile.save(update_fields=['role'])

    return Response(AdminUserProfileSerializer(profile).data)
