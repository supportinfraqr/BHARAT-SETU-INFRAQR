"""URL configuration for config project."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from api import v1_bridge
from api import views as api_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
]


# ---------------------------------------------------------------------------
# /v1/ compatibility bridge (register every route with & without trailing slash)
# ---------------------------------------------------------------------------
def _v1(*routes):
    """Duplicate each (route, view, name[, kwargs]) with and without a trailing
    slash and append the bridge patterns."""
    out = []
    for entry in routes:
        route, view, name = entry[0], entry[1], entry[2]
        kwargs = entry[3] if len(entry) > 3 else {}
        out.append(path(f"v1/{route}", view, kwargs=kwargs, name=name))
        out.append(path(f"v1/{route}/", view, kwargs=kwargs, name=f"{name}_slash"))
    return out


_v1_patterns = _v1(
    ("auth/login", v1_bridge.login, "v1_login"),
    ("auth/otp", v1_bridge.otp_challenge, "v1_otp"),
    ("auth/register/worker", v1_bridge.register_worker, "v1_register_worker"),
    ("auth/aadhaar/otp", v1_bridge.aadhaar_otp, "v1_aadhaar_otp"),
    ("auth/aadhaar/verify", v1_bridge.aadhaar_verify, "v1_aadhaar_verify"),
    ("reference/geography", v1_bridge.geography, "v1_geography"),
    ("identity/verify/<str:bss_id>", v1_bridge.identity_verify, "v1_identity_verify"),
    ("worker/portal", v1_bridge.worker_portal, "v1_worker_portal"),
    ("contractor/portal", v1_bridge.contractor_portal, "v1_contractor_portal"),
    ("employer/portal", v1_bridge.employer_portal, "v1_employer_portal"),
    ("government/portal", v1_bridge.government_portal, "v1_government_portal"),
    ("admin/operations", v1_bridge.admin_operations, "v1_admin_operations"),
    ("bss-staff/operations", v1_bridge.bss_staff_operations, "v1_bss_staff_operations"),
    ("admin/operations/actions", v1_bridge.admin_actions, "v1_admin_actions"),
    ("bss-staff/operations/actions", v1_bridge.bss_staff_actions, "v1_bss_staff_actions"),
    ("worker/submissions", v1_bridge.worker_submissions, "v1_worker_submissions"),
    ("worker/documents", v1_bridge.worker_documents, "v1_worker_documents"),
    ("worker/documents/<int:document_id>", v1_bridge.worker_document_detail, "v1_worker_document_detail"),
    ("worker/grievances", v1_bridge.worker_grievances, "v1_worker_grievances"),
    ("worker/grievances/<int:grievance_id>/audio", v1_bridge.worker_grievance_audio, "v1_worker_grievance_audio"),
    ("worker/verify-document", v1_bridge.worker_verify_document, "v1_worker_verify_document"),
    ("worker/link-aadhaar", v1_bridge.worker_link_aadhaar, "v1_worker_link_aadhaar"),
    ("contractor/submissions", v1_bridge.contractor_submissions, "v1_contractor_submissions"),
    ("admin/payroll", v1_bridge.admin_payroll, "v1_admin_payroll"),
    ("worker/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_worker_submission_file", {"role_path": "worker"}),
    ("contractor/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_contractor_submission_file", {"role_path": "contractor"}),
    ("employer/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_employer_submission_file", {"role_path": "employer"}),
    ("admin/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_admin_submission_file", {"role_path": "admin"}),
    ("admin/notifications", v1_bridge.notifications, "v1_admin_notifications", {"role_path": "admin"}),
    ("bss-staff/notifications", v1_bridge.notifications, "v1_bss_staff_notifications", {"role_path": "bss-staff"}),
    ("bss admin/notifications", v1_bridge.notifications, "v1_bss_space_admin_notifications", {"role_path": "bss admin"}),
    ("bss staff/notifications", v1_bridge.notifications, "v1_bss_space_staff_notifications", {"role_path": "bss staff"}),
    ("worker/notifications", v1_bridge.notifications, "v1_worker_notifications", {"role_path": "worker"}),
    ("contractor/notifications", v1_bridge.notifications, "v1_contractor_notifications", {"role_path": "contractor"}),
    ("employer/notifications", v1_bridge.notifications, "v1_employer_notifications", {"role_path": "employer"}),
    ("government/notifications", v1_bridge.notifications, "v1_government_notifications", {"role_path": "government"}),
)
_v1_mutations = _v1(
    ("worker/<str:resource>", v1_bridge.mutate_portal, "v1_worker_mutate", {"role_path": "worker"}),
    ("contractor/<str:resource>", v1_bridge.mutate_portal, "v1_contractor_mutate", {"role_path": "contractor"}),
    ("employer/<str:resource>", v1_bridge.mutate_portal, "v1_employer_mutate", {"role_path": "employer"}),
    ("admin/<str:resource>", v1_bridge.mutate_portal, "v1_admin_mutate", {"role_path": "admin"}),
    ("bss-staff/<str:resource>", v1_bridge.mutate_portal, "v1_bss_staff_mutate", {"role_path": "bss-staff"}),
    ("government/<str:resource>", v1_bridge.mutate_portal, "v1_government_mutate", {"role_path": "government"}),
)

urlpatterns += _v1_patterns
urlpatterns += _v1_mutations

# DigiLocker also under /v1/ so the Next.js server (which reaches Django via the
# public /v1/ proxy) can drive the OAuth + document-fetch flow with the worker's
# JWT. The browser-facing redirect_uri stays on the Next.js /api/digilocker route.
_v1_digilocker_router = DefaultRouter()
_v1_digilocker_router.register(r"digilocker", api_views.DigiLockerViewSet, basename="v1-digilocker")
urlpatterns += [path("v1/", include(_v1_digilocker_router.urls))]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

