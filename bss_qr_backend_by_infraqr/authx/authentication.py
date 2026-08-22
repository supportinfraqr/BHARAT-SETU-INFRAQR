"""DRF authentication that trusts the legacy X-Legacy-Login-Id header.

Looks up a Django user by legacy_login_id so DRF's IsAuthenticated works for
QR endpoints called by the legacy-style frontend (which only sends the header).
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class LegacyHeaderAuthentication(BaseAuthentication):
    def authenticate(self, request):
        login_id = request.headers.get("X-Legacy-Login-Id")
        if not login_id or not login_id.isdigit():
            return None
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(legacy_login_id=int(login_id))
            return (user, None)
        except User.DoesNotExist:
            return None

    def authenticate_header(self, request):
        return None
