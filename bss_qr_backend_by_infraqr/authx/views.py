from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()


def _employer_approval_block(user):
    """Return an error message if an EMPLOYER account's employer isn't approved, else None."""
    if getattr(user, "role", "") != "EMPLOYER":
        return None
    from qr.models import Employer
    emp = None
    if user.employer_id:
        emp = Employer.objects.filter(pk=user.employer_id).first()
    if emp is None and user.email:
        emp = Employer.objects.filter(email__iexact=user.email).first()
    if emp is None:
        return "Employer account not linked yet. Contact admin."
    if emp.approval_status != "APPROVED":
        return "Your employer account is pending approval. Please wait for the admin to approve it."
    return None


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "mobile", "first_name", "last_name", "employer_id", "contractor_id"]
        read_only_fields = ["id"]


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        email = request.data.get("email", "")
        role = request.data.get("role", "BSS_STAFF")
        if not username or not password:
            return Response({"Result": "Error", "Message": "username and password required"}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"Result": "Error", "Message": "Username already exists"}, status=409)
        user = User.objects.create_user(username=username, password=password, email=email, role=role)
        refresh = RefreshToken.for_user(user)
        return Response({
            "Result": "Success",
            "Data": {"user": UserSerializer(user).data,
                     "access": str(refresh.access_token), "refresh": str(refresh)},
        }, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = User.objects.filter(username=username).first()
        if not user or not user.check_password(password):
            return Response({"Result": "Error", "Message": "-1"}, status=401)
        if not user.is_active:
            return Response({"Result": "Error", "Message": "-1"}, status=401)
        blocked = _employer_approval_block(user)
        if blocked:
            return Response({"Result": "Error", "Message": blocked}, status=403)
        refresh = RefreshToken.for_user(user)
        return Response({
            "Result": "Success",
            "Data": {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blocked = _employer_approval_block(request.user)
        if blocked:
            return Response({"Result": "Error", "Message": blocked}, status=403)
        return Response({"Result": "Success", "Data": UserSerializer(request.user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh = request.data.get("refresh")
            if refresh:
                RefreshToken(refresh).blacklist()
        except Exception:
            pass
        return Response({"Result": "Success", "Message": "Logged out"})


class DigiLockerStartView(APIView):
    """Begin DigiLocker OAuth: return the authorize URL for the frontend to open."""

    permission_classes = [AllowAny]

    def get(self, request):
        from .digilocker import build_authorize_url, digilocker_configured, new_code_verifier, new_state

        if not digilocker_configured():
            return Response({
                "Result": "Error",
                "Message": "DigiLocker is not configured. Set BSS_DIGILOCKER_CLIENT_ID, "
                           "CLIENT_SECRET and REDIRECT_URI after registering with DigiLocker.",
            }, status=503)
        state = new_state()
        code_verifier = new_code_verifier()
        request.session["digilocker_state"] = state
        request.session["digilocker_code_verifier"] = code_verifier
        return Response({
            "Result": "Success",
            "Data": {"authorize_url": build_authorize_url(state, code_verifier)},
        })


class DigiLockerCallbackView(APIView):
    """Handle DigiLocker redirect: exchange code, fetch profile, create/link user."""

    permission_classes = [AllowAny]

    def get(self, request):
        from .digilocker import exchange_code_for_token, fetch_profile

        code = request.query_params.get("code")
        state = request.query_params.get("state")
        expected = request.session.get("digilocker_state")
        if not code:
            return Response({"Result": "Error", "Message": "DigiLocker authorization failed or was cancelled"}, status=400)
        if expected and state and state != expected:
            return Response({"Result": "Error", "Message": "Invalid state (CSRF)"}, status=400)

        code_verifier = request.session.get("digilocker_code_verifier", "")
        token_data = exchange_code_for_token(code, code_verifier)
        if not token_data or not token_data.get("access_token"):
            return Response({"Result": "Error", "Message": "Could not obtain DigiLocker token. Check client credentials."}, status=502)

        profile = fetch_profile(token_data["access_token"]) or {}
        user = self._get_or_create_user(profile)
        if user is None:
            return Response({"Result": "Error", "Message": "DigiLocker profile incomplete (name/email missing)"}, status=400)

        refresh = RefreshToken.for_user(user)
        payload = {
            "Result": "Success",
            "Data": {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "digilocker": profile,
            },
        }
        # Allow a web redirect target so the SPA can store the session then continue.
        redirect = request.query_params.get("redirect") or "/dashboard"
        html = self._session_bridge_html(redirect, payload)
        return Response(html, content_type="text/html")

    def _get_or_create_user(self, profile: dict):
        name = profile.get("name") or profile.get("fullName") or ""
        email = profile.get("email") or ""
        mobile = profile.get("mobile") or profile.get("phone") or ""
        if not (name or email or mobile):
            return None
        User = get_user_model()
        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()
        if user is None and mobile:
            user = User.objects.filter(mobile=mobile).first()
        if user is None:
            base = (email or mobile or name).strip() or "digiuser"
            username = base
            i = 1
            while User.objects.filter(username=username).exists():
                i += 1
                username = f"{base}_{i}"
            user = User(
                username=username,
                email=email or "",
                mobile=mobile or "",
                first_name=(name or "")[:30],
                role="WORKER",
                is_active=True,
            )
            user.set_unusable_password()
            user.save()
        return user

    def _session_bridge_html(self, redirect: str, payload: dict):
        import json
        data = json.dumps(payload["Data"])
        return (
            "<html><head><meta charset='utf-8'><title>Redirecting...</title></head>"
            "<body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>"
            "<p>Verified via DigiLocker. Redirecting...</p>"
            "<script>"
            f"const d={data};"
            "localStorage.setItem('bss_token', d.access);"
            "localStorage.setItem('bss_user', JSON.stringify(d.user));"
            f"window.location.href={json.dumps(redirect)};"
            "</script></body></html>"
        )
