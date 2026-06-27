"""Dashboard admin views — разбиты по доменным модулям.

Все эндпоинты требуют is_staff=True (или is_superuser).
"""

from .orders import (
    admin_order_list,
    admin_order_detail,
    admin_order_update_status,
    admin_order_cancel,
)
from .stats import (
    admin_dashboard_stats,
)
from .menu import (
    AdminProductViewSet,
    AdminSetViewSet,
    admin_toggle_availability,
)
from .logs import (
    admin_log_list,
    admin_log_clear,
)
from .profile import (
    admin_profile,
)
from .orders import IsStaffUser

__all__ = [
    'admin_order_list',
    'admin_order_detail',
    'admin_order_update_status',
    'admin_order_cancel',
    'admin_dashboard_stats',
    'admin_log_list',
    'admin_log_clear',
    'admin_toggle_availability',
    'admin_profile',
    'AdminProductViewSet',
    'AdminSetViewSet',
    'IsStaffUser',
]
