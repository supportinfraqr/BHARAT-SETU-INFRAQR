"""Middleware that maps an authenticated context from the X-Legacy-Login-Id header.

For the QR-only deployment, the client's ASP.NET UI authenticates against this
backend and passes X-Legacy-Login-Id (= a Django user's legacy_login_id). We
resolve the Django user by that id and mark the request authenticated so the
QR endpoints can serve data scoped to that user.
"""
from django.contrib.auth import get_user_model


class LegacySessionAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        legacy_login_id = request.headers.get("X-Legacy-Login-Id")
        if legacy_login_id and legacy_login_id.isdigit():
            login_id = int(legacy_login_id)
            User = get_user_model()
            user = None
            try:
                user = User.objects.get(legacy_login_id=login_id)
            except User.DoesNotExist:
                user = None
            if user is not None:
                request.user = user
                request._cached_user = user
                request.legacy_login_id = login_id
        return self.get_response(request)
