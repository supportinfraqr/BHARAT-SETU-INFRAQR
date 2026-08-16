from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from api.v1_views import GrievanceV1View, LoginV1View, SessionV1View
from authx.middleware import LegacySessionAuthMiddleware


def authenticated_user(legacy_login_id=42):
    return SimpleNamespace(
        pk=7,
        id=7,
        legacy_login_id=legacy_login_id,
        username="worker",
        first_name="Test",
        last_name="Worker",
        email="worker@example.test",
        mobile="9999999999",
        role="WORKER",
        is_active=True,
        is_authenticated=True,
        get_full_name=lambda: "Test Worker",
        get_all_permissions=lambda: {"grievances.add"},
    )


class V1ContractTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_login_rejects_incomplete_request_with_contract_error(self):
        request = self.factory.post("/api/v1/auth/login", {}, format="json")
        response = LoginV1View.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("username", response.data["error"]["fieldErrors"])

    @patch("authx.middleware.LoginTable.objects.filter")
    def test_versioned_paths_never_use_legacy_identity_header(self, legacy_filter):
        response = Mock()
        middleware = LegacySessionAuthMiddleware(lambda _request: response)
        request = self.factory.get("/api/v1/session", HTTP_X_LEGACY_LOGIN_ID="42")
        self.assertIs(middleware(request), response)
        legacy_filter.assert_not_called()

    @patch("api.v1_views._legacy_login", return_value=None)
    @patch("api.v1_views.authenticate", return_value=None)
    def test_login_rejects_invalid_credentials(self, _authenticate, _legacy_login):
        request = self.factory.post(
            "/api/v1/auth/login",
            {"username": "missing", "password": "wrong", "method": "password"},
            format="json",
        )
        response = LoginV1View.as_view()(request)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"]["code"], "INVALID_CREDENTIALS")

    @patch("api.v1_views.LoginTable.objects.filter")
    @patch("api.v1_views._provision_legacy_user")
    @patch("api.v1_views._legacy_secret_matches", return_value=True)
    @patch("api.v1_views._legacy_login")
    def test_otp_login_issues_tokens_and_invalidates_otp(self, legacy_login, _matches, provision, login_rows):
        row = SimpleNamespace(pk=42)
        legacy_login.return_value = row
        provision.return_value = authenticated_user()
        request = self.factory.post(
            "/api/v1/auth/login",
            {"username": "9999999999", "password": "123456", "method": "otp"},
            format="json",
        )
        response = LoginV1View.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("accessToken", response.data["meta"])
        login_rows.assert_called_once_with(pk=42)
        login_rows.return_value.update.assert_called_once_with(Otp=None)

    def test_session_returns_normalized_identity(self):
        request = self.factory.get("/api/v1/session")
        force_authenticate(request, user=authenticated_user())
        response = SessionV1View.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["user"]["id"], "42")
        self.assertEqual(response.data["data"]["permissions"], ["grievances.add"])

    def test_versioned_session_route_returns_contract_auth_error(self):
        response = self.client.get("/api/v1/session")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "AUTH_REQUIRED")

    def test_grievance_requires_linked_server_identity(self):
        request = self.factory.post(
            "/api/v1/grievances",
            {"subject": "Safety", "details": "Unsafe access"},
            format="multipart",
        )
        force_authenticate(request, user=authenticated_user(legacy_login_id=None))
        response = GrievanceV1View.as_view()(request)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "LEGACY_IDENTITY_REQUIRED")

    def test_grievance_rejects_unsupported_evidence(self):
        document = SimpleUploadedFile("payload.exe", b"not an image")
        request = self.factory.post(
            "/api/v1/grievances",
            {"subject": "Safety", "details": "Unsafe access", "documents": document},
            format="multipart",
        )
        force_authenticate(request, user=authenticated_user())
        response = GrievanceV1View.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("documents", response.data["error"]["fieldErrors"])

    @patch("api.v1_views._save_upload", return_value="GrievancesDocuments/evidence.png")
    @patch("api.v1_views.GrivanceTracking.objects.create")
    @patch("api.v1_views.GrievanceMaster.objects.create")
    @patch("api.v1_views.transaction.atomic")
    def test_grievance_ignores_client_login_id(self, atomic, create_grievance, _create_tracking, _save):
        atomic.return_value.__enter__ = Mock(return_value=None)
        atomic.return_value.__exit__ = Mock(return_value=False)
        create_grievance.return_value = Mock(Id=123)
        document = SimpleUploadedFile("evidence.png", b"image")
        request = self.factory.post(
            "/api/v1/grievances",
            {
                "subject": "Safety",
                "details": "Unsafe access",
                "LoginId": "999",
                "documents": document,
            },
            format="multipart",
        )
        force_authenticate(request, user=authenticated_user(legacy_login_id=42))
        response = GrievanceV1View.as_view()(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data, {"data": {"id": "123", "status": "submitted"}})
        self.assertEqual(create_grievance.call_args.kwargs["LoginId"], 42)
