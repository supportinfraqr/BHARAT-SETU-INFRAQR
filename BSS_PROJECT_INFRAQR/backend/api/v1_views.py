import os
import uuid

import bcrypt
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from legacy.models import GrievanceMaster, GrivanceTracking, LoginTable


User = get_user_model()
AUDIO_EXTENSIONS = {".webm", ".mp3", ".wav"}
DOCUMENT_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_AUDIO_BYTES = int(getattr(settings, "BSS_GRIEVANCE_AUDIO_MAX_BYTES", 10 * 1024 * 1024))
MAX_DOCUMENT_BYTES = int(getattr(settings, "BSS_GRIEVANCE_DOCUMENT_MAX_BYTES", 5 * 1024 * 1024))
MAX_DOCUMENTS = int(getattr(settings, "BSS_GRIEVANCE_MAX_DOCUMENTS", 5))


def _request_id(request):
    return request.headers.get("X-Request-ID") or uuid.uuid4().hex


def _error(request, http_status, code, message, field_errors=None):
    error = {"code": code, "message": message, "requestId": _request_id(request)}
    if field_errors:
        error["fieldErrors"] = field_errors
    return Response({"error": error}, status=http_status)


def _session_data(user):
    name = user.get_full_name().strip() or user.username
    return {
        "user": {
            "id": str(user.legacy_login_id or user.pk),
            "name": name,
            "role": user.role,
            "email": user.email or None,
            "branchId": None,
            "branchName": None,
            "designation": None,
            "contactNumber": user.mobile or None,
            "photo": None,
            "username": user.username,
            "mapId": None,
            "mapUser": None,
        },
        "permissions": sorted(user.get_all_permissions()),
        "redirectPath": None,
    }


def _legacy_login(username):
    return LoginTable.objects.filter(
        Q(UserName__iexact=username) | Q(ContactNo__iexact=username) | Q(EmailId__iexact=username)
    ).first()


def _legacy_secret_matches(row, method, secret):
    stored = {"password": row.Password, "mpin": row.MPIN, "otp": row.Otp}[method] or ""
    if method == "password" and stored.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(secret.encode(), stored.encode())
        except (TypeError, ValueError):
            return False
    return constant_time_compare(str(stored), str(secret))


def _provision_legacy_user(row):
    user = User.objects.filter(legacy_login_id=row.LoginId).first()
    if user is None:
        username = row.UserName or f"legacy_{row.LoginId}"
        user = User.objects.filter(username=username).first()
    if user is None:
        user = User(username=row.UserName or f"legacy_{row.LoginId}")
        user.set_unusable_password()
    user.legacy_login_id = row.LoginId
    user.first_name = (row.Name or "")[:150]
    user.email = (row.EmailId or "")[:254]
    user.mobile = (row.ContactNo or "")[:20]
    user.role = (row.LoginType or "BSS_STAFF")[:32]
    user.is_active = str(row.IsActive or "1").lower() not in {"0", "false", "inactive"}
    user.save()
    return user


class LoginV1View(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        username = str(request.data.get("username") or "").strip()
        password = str(request.data.get("password") or "")
        method = str(request.data.get("method") or "").lower()
        field_errors = {}
        if not username:
            field_errors["username"] = ["This field is required."]
        if not password:
            field_errors["password"] = ["This field is required."]
        if method not in {"password", "mpin", "otp"}:
            field_errors["method"] = ["Use password, mpin, or otp."]
        if field_errors:
            return _error(request, status.HTTP_400_BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed.", field_errors)

        user = authenticate(request=request, username=username, password=password) if method == "password" else None
        if user is None:
            row = _legacy_login(username)
            if row is None or not _legacy_secret_matches(row, method, password):
                return _error(request, status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS", "The supplied credentials are not valid.")
            user = _provision_legacy_user(row)
            if method == "otp":
                LoginTable.objects.filter(pk=row.pk).update(Otp=None)
        if not user.is_active:
            return _error(request, status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS", "The supplied credentials are not valid.")

        refresh = RefreshToken.for_user(user)
        return Response({
            "data": _session_data(user),
            "meta": {
                "accessToken": str(refresh.access_token),
                "refreshToken": str(refresh),
                "legacyLoginId": str(user.legacy_login_id) if user.legacy_login_id else None,
            },
        })


class SessionV1View(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"data": _session_data(request.user)})


class LogoutV1View(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refreshToken") if isinstance(request.data, dict) else None
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


def _validate_upload(upload, allowed_extensions, max_bytes, field):
    extension = os.path.splitext(upload.name or "")[1].lower()
    errors = []
    if extension not in allowed_extensions:
        errors.append(f"Unsupported file type: {extension or 'unknown'}.")
    if upload.size > max_bytes:
        errors.append(f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
    return {field: errors} if errors else {}


def _save_upload(upload, folder):
    extension = os.path.splitext(upload.name or "")[1].lower()
    return default_storage.save(f"{folder}/{uuid.uuid4().hex}{extension}", upload)


class GrievanceV1View(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "grievance"

    def post(self, request):
        legacy_login_id = getattr(request.user, "legacy_login_id", None)
        if not legacy_login_id:
            return _error(request, status.HTTP_403_FORBIDDEN, "LEGACY_IDENTITY_REQUIRED", "Your account is not linked to a grievance identity.")

        subject = str(request.data.get("subject") or "").strip()
        details = str(request.data.get("details") or "").strip()
        audio = request.FILES.get("audio")
        documents = request.FILES.getlist("documents")
        field_errors = {}
        if not subject:
            field_errors["subject"] = ["This field is required."]
        elif len(subject) > 150:
            field_errors["subject"] = ["Must be 150 characters or fewer."]
        if len(details) > 5000:
            field_errors["details"] = ["Must be 5000 characters or fewer."]
        if not details and audio is None:
            field_errors["details"] = ["Provide grievance details or an audio recording."]
        if len(documents) > MAX_DOCUMENTS:
            field_errors["documents"] = [f"Upload at most {MAX_DOCUMENTS} documents."]
        if audio is not None:
            field_errors.update(_validate_upload(audio, AUDIO_EXTENSIONS, MAX_AUDIO_BYTES, "audio"))
        document_errors = []
        for document in documents:
            document_errors.extend(_validate_upload(document, DOCUMENT_EXTENSIONS, MAX_DOCUMENT_BYTES, "documents").get("documents", []))
        if document_errors:
            field_errors["documents"] = document_errors
        if field_errors:
            too_large = any("exceeds" in message for messages in field_errors.values() for message in messages)
            error_status = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE if too_large else status.HTTP_400_BAD_REQUEST
            error_code = "PAYLOAD_TOO_LARGE" if too_large else "VALIDATION_ERROR"
            return _error(request, error_status, error_code, "Request validation failed.", field_errors)

        saved_files = []
        try:
            audio_path = _save_upload(audio, "GrievancesDocuments") if audio else None
            if audio_path:
                saved_files.append(audio_path)
            document_paths = []
            for document in documents:
                path = _save_upload(document, "GrievancesDocuments")
                document_paths.append(path)
                saved_files.append(path)
            with transaction.atomic():
                grievance = GrievanceMaster.objects.create(
                    LoginId=legacy_login_id,
                    Subject=subject,
                    AiText=details or None,
                    AudioFileName=audio_path,
                    Documents=",".join(document_paths) or None,
                    CreatedOn=timezone.now(),
                    Status="Process Start",
                )
                GrivanceTracking.objects.create(GId=grievance.Id, CreatedOn=timezone.now(), CStatus="Process Start")
        except Exception:
            for path in saved_files:
                default_storage.delete(path)
            return _error(request, status.HTTP_500_INTERNAL_SERVER_ERROR, "SERVER_ERROR", "The grievance could not be submitted.")

        return Response({"data": {"id": str(grievance.Id), "status": "submitted"}}, status=status.HTTP_201_CREATED)
