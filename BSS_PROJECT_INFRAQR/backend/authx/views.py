from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()


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
