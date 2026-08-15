"""Middleware that maps a legacy session LoginId (header) to an authenticated context.

For migration, the legacy frontend passes `X-Legacy-Login-Id`. We validate it against
the migrated production LoginTable and mark the request authenticated so legacy
endpoints can serve data scoped to that user.
"""
from django.contrib.auth import get_user_model

from legacy.models import LoginTable


class LegacySessionAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        legacy_login_id = request.headers.get("X-Legacy-Login-Id")
        if legacy_login_id and legacy_login_id.isdigit():
            login_id = int(legacy_login_id)
            # Try Django user mapping first
            User = get_user_model()
            user = None
            try:
                user = User.objects.get(legacy_login_id=login_id)
            except User.DoesNotExist:
                user = None
            if user is None:
                # Validate against migrated production LoginTable and synthesize a user
                if LoginTable.objects.filter(LoginId=login_id).exists():
                    try:
                        user = User.objects.get(username=f"legacy_{login_id}")
                    except User.DoesNotExist:
                        lt = LoginTable.objects.get(LoginId=login_id)
                        user = User(
                            username=f"legacy_{login_id}",
                            legacy_login_id=login_id,
                            first_name=(lt.Name or "")[:30],
                            email=(lt.EmailId or "")[:254],
                            is_active=True,
                        )
                        user.set_unusable_password()
                        user.save()
            if user is not None:
                request.user = user
                request._cached_user = user
                request.legacy_login_id = login_id
        return self.get_response(request)
