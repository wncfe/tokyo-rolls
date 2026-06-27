"""Custom DRF throttle rates for auth endpoints."""

import os
from rest_framework.throttling import AnonRateThrottle


class _BaseAuthThrottle(AnonRateThrottle):
    """Base throttle that can be disabled via env var for testing."""

    def allow_request(self, request, view):
        if os.environ.get('DISABLE_THROTTLING') == 'True':
            return True
        return super().allow_request(request, view)


class AuthRequestCodeThrottle(_BaseAuthThrottle):
    """3 requests per minute per IP for request-code."""
    rate = '3/minute'


class AuthVerifyCodeThrottle(_BaseAuthThrottle):
    """10 requests per minute per IP for verify-code."""
    rate = '10/minute'
