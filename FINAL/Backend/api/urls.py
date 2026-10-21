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

# Engagement & governance
router.register(r"preferences", views.UserPreferenceViewSet, basename="preferences")
router.register(r"notifications", views.NotificationViewSet, basename="notifications")
router.register(r"audit-logs", views.AuditLogViewSet, basename="audit-logs")
router.register(r"approvals", views.ApprovalQueueViewSet, basename="approvals")
router.register(r"grievance-responses", views.GrievanceResponseViewSet, basename="grievance-responses")

# Employer / Contractor registry
router.register(r"parties/directors", views.PartyDirectorViewSet, basename="party-directors")
router.register(r"parties/statutory", views.PartyStatutoryRegistrationViewSet, basename="party-statutory")
router.register(r"parties/contacts", views.PartyContactViewSet, basename="party-contacts")
router.register(r"parties/banks", views.PartyBankViewSet, basename="party-banks")
router.register(r"parties/contracts", views.PartyContractViewSet, basename="party-contracts")
router.register(r"parties/documents", views.PartyDocumentViewSet, basename="party-documents")
router.register(r"parties/consents", views.PartyConsentDeclarationViewSet, basename="party-consents")
router.register(r"parties/master", views.PartyMasterViewSet, basename="party-master")

# Compliance & statutory masters
router.register(r"register-docs-master", views.RegisterDocumentMasterViewSet, basename="register-docs-master")
router.register(r"compliance-master", views.ComplianceMasterViewSet, basename="compliance-master")
router.register(r"compliance-docs", views.ComplianceDocumentViewSet, basename="compliance-docs")
router.register(r"compliance-reports", views.ComplianceReportViewSet, basename="compliance-reports")
router.register(r"compliance-report-items", views.ComplianceReportItemViewSet, basename="compliance-report-items")
router.register(r"employer-doc-mappings", views.EmployerDocumentMappingViewSet, basename="employer-doc-mappings")
router.register(r"employer-register-mappings", views.EmployerRegisterMappingViewSet, basename="employer-register-mappings")
router.register(r"employer-act-mappings", views.EmployerActMappingViewSet, basename="employer-act-mappings")
router.register(r"pt-masters", views.PtMasterViewSet, basename="pt-masters")
router.register(r"pt-slabs", views.PtSlabViewSet, basename="pt-slabs")
router.register(r"lwf-masters", views.LwfMasterViewSet, basename="lwf-masters")
router.register(r"license-masters", views.LicenseMasterViewSet, basename="license-masters")
router.register(r"minimum-wages", views.MinimumWageViewSet, basename="minimum-wages")
router.register(r"menu-permissions", views.MenuPermissionViewSet, basename="menu-permissions")

# Payroll configuration cluster
router.register(r"payroll/config", views.PayrollConfigViewSet, basename="payroll-config")
router.register(r"payroll/epf", views.EpfConfigViewSet, basename="payroll-epf")
router.register(r"payroll/esi", views.EsiConfigViewSet, basename="payroll-esi")
router.register(r"payroll/pt", views.PtConfigViewSet, basename="payroll-pt")
router.register(r"payroll/lwf", views.LwfConfigViewSet, basename="payroll-lwf")
router.register(r"payroll/bonus", views.BonusConfigViewSet, basename="payroll-bonus")
router.register(r"payroll/components", views.SalaryComponentViewSet, basename="payroll-components")
router.register(r"payroll/deductions", views.SalaryDeductionViewSet, basename="payroll-deductions")
router.register(r"payroll/benefits", views.SalaryBenefitViewSet, basename="payroll-benefits")
router.register(r"payroll/reimbursements", views.SalaryReimbursementViewSet, basename="payroll-reimbursements")
router.register(r"payroll/ffs", views.FfsConfigViewSet, basename="payroll-ffs")
router.register(r"payroll/portal", views.StaffPortalConfigViewSet, basename="payroll-portal")
router.register(r"payroll/periods", views.PayrollPeriodViewSet, basename="payroll-periods")

urlpatterns = []  # Legacy /api surface retired; use /v1/.
