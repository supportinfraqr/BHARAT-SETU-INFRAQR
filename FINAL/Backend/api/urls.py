"""API URL routing. All endpoints live under /api/ and require a JWT unless
otherwise noted (auth/register and auth/token* are public)."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"auth/register", views.RegisterViewSet, basename="register")
router.register(r"users", views.UserViewSet, basename="users")
router.register(r"sites", views.SiteViewSet, basename="sites")
router.register(r"bindings", views.BindingViewSet, basename="bindings")
router.register(r"consent", views.ConsentChallengeViewSet, basename="consent")
router.register(r"otp", views.SmsOtpViewSet, basename="otp")
router.register(r"jobs", views.ContractorJobViewSet, basename="jobs")
router.register(r"requests", views.RozgarRequestViewSet, basename="requests")

router.register(r"workers", views.WorkerProfileViewSet, basename="worker-profiles")
router.register(r"workers/identity", views.WorkerIdentityViewSet, basename="worker-identity")
router.register(r"workers/address", views.WorkerAddressMobilityViewSet, basename="worker-address")
router.register(r"workers/family", views.WorkerFamilyDependantViewSet, basename="worker-family")
router.register(r"workers/social-security", views.WorkerSocialSecurityViewSet, basename="worker-social")
router.register(r"workers/welfare-safety", views.WorkerWelfareSafetyViewSet, basename="worker-welfare")
router.register(r"workers/banking", views.WorkerBankingViewSet, basename="worker-banking")
router.register(r"workers/classification", views.WorkerClassificationViewSet, basename="worker-classification")
router.register(r"workers/employment", views.WorkerEmploymentViewSet, basename="worker-employment")
router.register(r"workers/skills", views.WorkerSkillsEmployabilityViewSet, basename="worker-skills")
router.register(r"workers/other", views.WorkerOtherViewSet, basename="worker-other")
router.register(r"workers/documents", views.WorkerDocumentViewSet, basename="worker-documents")
router.register(r"workers/documents-master", views.WorkerDocumentMasterViewSet, basename="worker-doc-master")

router.register(r"skills", views.SkillMasterViewSet, basename="skills")
router.register(r"rbac", views.RbacPermissionViewSet, basename="rbac")
router.register(r"qr-role-access", views.QrRoleAccessViewSet, basename="qr-role-access")
router.register(r"lookups", views.LookupValueViewSet, basename="lookups")
router.register(r"worker-categories", views.WorkerCategoryMasterViewSet, basename="worker-categories")

router.register(r"attendance/devices", views.AttendanceDeviceViewSet, basename="attendance-devices")
router.register(r"attendance", views.AttendanceViewSet, basename="attendance")
router.register(r"wages", views.WorkerWagesViewSet, basename="wages")
router.register(r"wage-payments", views.WagePaymentViewSet, basename="wage-payments")
router.register(r"gate-passes", views.WorkerGatePassViewSet, basename="gate-passes")
router.register(r"grievances", views.WorkerGrievanceViewSet, basename="grievances")
router.register(r"documents/tokens", views.DocumentAccessTokenViewSet, basename="document-tokens")

router.register(r"qr", views.QrAccessActionViewSet, basename="qr-scan")
router.register(r"digilocker", views.DigiLockerViewSet, basename="digilocker")
router.register(r"qr/worker", views.WorkerQrActionViewSet, basename="qr-worker")

urlpatterns = router.urls
