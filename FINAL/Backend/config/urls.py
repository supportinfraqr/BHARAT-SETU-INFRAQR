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
    path("django-admin/", admin.site.urls),
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
    ("auth/mpin", v1_bridge.mpin_set, "v1_mpin_set"),
    ("auth/password", v1_bridge.password_set, "v1_password_set"),
    ("auth/mpin/reset", v1_bridge.mpin_reset, "v1_mpin_reset"),
    ("auth/register/worker", v1_bridge.register_worker, "v1_register_worker"),
    ("auth/register/contractor", v1_bridge.register_contractor, "v1_register_contractor"),
    ("auth/register/employer", v1_bridge.register_employer, "v1_register_employer"),
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
    ("worker/nominee-document", v1_bridge.worker_nominee_document, "v1_worker_nominee_document"),
    ("worker/documents/<int:document_id>", v1_bridge.worker_document_detail, "v1_worker_document_detail"),
    ("contractor/documents/<int:document_id>/file", v1_bridge.contractor_worker_document_download, "v1_contractor_worker_document_file"),
    ("contractor/documents/<int:document_id>/token", v1_bridge.contractor_document_view_token, "v1_contractor_document_token"),
    ("documents/file/<str:token>", v1_bridge.document_file_serve, "v1_document_file_serve"),
    ("worker/grievances", v1_bridge.worker_grievances, "v1_worker_grievances"),
    ("grievances/<int:grievance_id>/action", v1_bridge.grievance_action, "v1_grievance_action"),
    ("grievances/<int:grievance_id>/file-token", v1_bridge.grievance_file_token, "v1_grievance_file_token"),
    ("grievances/file/<str:token>", v1_bridge.grievance_file_serve, "v1_grievance_file_serve"),
    ("bindings", v1_bridge.worker_bindings, "v1_bindings"),
    ("bindings/<int:binding_id>/otp", v1_bridge.binding_otp, "v1_binding_otp"),
    ("bindings/<int:binding_id>/consent", v1_bridge.binding_consent, "v1_binding_consent"),
    ("bindings/scan", v1_bridge.binding_scan, "v1_binding_scan"),
    ("employer/binding-requests", v1_bridge.employer_bindings, "v1_employer_binding_requests"),
    ("employer/binding-requests/<int:binding_id>/action", v1_bridge.employer_binding_action, "v1_employer_binding_action"),
    ("contractor/binding-requests/<int:binding_id>/action", v1_bridge.employer_binding_action, "v1_contractor_binding_action"),
    ("worker/verify-document", v1_bridge.worker_verify_document, "v1_worker_verify_document"),
    ("worker/link-aadhaar", v1_bridge.worker_link_aadhaar, "v1_worker_link_aadhaar"),
    ("worker/claim-mobile", v1_bridge.worker_claim_mobile, "v1_worker_claim_mobile"),
    ("contractor/submissions", v1_bridge.contractor_submissions, "v1_contractor_submissions"),
    ("contractor/compliance-batches", v1_bridge.contractor_compliance_batches, "v1_contractor_compliance_batches"),
    ("contractor/compliance-batches/zip", v1_bridge.contractor_compliance_batches_zip, "v1_contractor_compliance_batches_zip"),
    ("document-templates", v1_bridge.document_templates, "v1_document_templates"),
    ("contractor/compliance-batches/<int:batch_id>/file", v1_bridge.compliance_batch_download, "v1_contractor_compliance_batch_file", {"role_path": "contractor"}),
    ("employer/compliance-batches/<int:batch_id>/file", v1_bridge.compliance_batch_download, "v1_employer_compliance_batch_file", {"role_path": "employer"}),
    ("admin/payroll", v1_bridge.admin_payroll, "v1_admin_payroll"),
    ("admin/masters", v1_bridge.admin_master_counts, "v1_admin_master_counts"),
    ("admin/masters/<str:key>", v1_bridge.admin_masters, "v1_admin_masters"),
    ("admin/masters/<str:key>/<int:pk>", v1_bridge.admin_master_detail, "v1_admin_master_detail"),
    ("admin/masters/<str:key>/<int:pk>/file", v1_bridge.admin_master_file, "v1_admin_master_file"),
    ("admin/register-templates", v1_bridge.register_templates, "v1_register_templates"),
    ("admin/register-templates/reset-defaults", v1_bridge.register_template_reset_defaults, "v1_register_template_reset_defaults"),
    ("admin/register-templates/<int:template_id>", v1_bridge.register_template_detail, "v1_register_template_detail"),
    ("admin/state-applicability", v1_bridge.state_applicability, "v1_state_applicability"),
    ("admin/activity", v1_bridge.admin_activity, "v1_admin_activity"),
    ("admin/permissions", v1_bridge.admin_permissions, "v1_admin_permissions"),
    ("admin/cost-sheets", v1_bridge.cost_sheets, "v1_cost_sheets"),
    ("admin/cost-sheets/<int:template_id>", v1_bridge.cost_sheet_detail, "v1_cost_sheet_detail"),
    ("admin/cost-sheets/<int:template_id>/preview", v1_bridge.cost_sheet_preview, "v1_cost_sheet_preview"),
    ("admin/cost-sheets/preview", v1_bridge.cost_sheet_preview_draft, "v1_cost_sheet_preview_draft"),
    ("admin/cost-sheets/<int:template_id>/transition", v1_bridge.cost_sheet_transition, "v1_cost_sheet_transition"),
    ("cost-sheets/available", v1_bridge.cost_sheets_available, "v1_cost_sheets_available"),
    ("cost-sheets/<int:template_id>/clone", v1_bridge.cost_sheet_clone, "v1_cost_sheet_clone"),
    ("admin/cost-sheets/statutory-master", v1_bridge.cost_sheet_statutory_master, "v1_cost_sheet_statutory_master"),
    ("admin/cost-sheets/min-wage", v1_bridge.cost_sheet_min_wage_lookup, "v1_cost_sheet_min_wage"),
    ("admin/cost-sheets/min-wage-zones", v1_bridge.cost_sheet_min_wage_zones, "v1_cost_sheet_min_wage_zones"),
    ("admin/cost-sheets/generate-code", v1_bridge.cost_sheet_generate_code, "v1_cost_sheet_generate_code"),
    ("admin/cost-sheets/sites", v1_bridge.cost_sheet_sites, "v1_cost_sheet_sites"),
    ("cost-sheets/<int:template_id>/update", v1_bridge.org_cost_sheet_update, "v1_org_cost_sheet_update"),
    ("cost-sheets/<int:template_id>/preview", v1_bridge.org_cost_sheet_preview, "v1_org_cost_sheet_preview"),
    ("cost-sheets/<int:template_id>/approve", v1_bridge.org_cost_sheet_approve, "v1_org_cost_sheet_approve"),
    ("cost-sheets/<int:template_id>/submit", v1_bridge.org_cost_sheet_submit, "v1_org_cost_sheet_submit"),
    ("cost-sheets/<int:template_id>/reject", v1_bridge.org_cost_sheet_reject, "v1_org_cost_sheet_reject"),
    ("admin/cost-sheets/<int:template_id>/new-version", v1_bridge.cost_sheet_new_version, "v1_cost_sheet_new_version"),
    ("admin/letter-templates", v1_bridge.admin_letter_templates, "v1_admin_letter_templates"),
    ("admin/letter-templates/<int:template_id>", v1_bridge.admin_letter_template_detail, "v1_admin_letter_template_detail"),
    ("admin/letter-templates/<int:template_id>/copy-all-states", v1_bridge.admin_copy_template_to_all_states, "v1_admin_copy_template_to_all_states"),
    ("admin/letter-templates/restore-defaults", v1_bridge.admin_restore_letter_defaults, "v1_admin_restore_letter_defaults"),
    ("letter-templates", v1_bridge.letter_templates_catalog, "v1_letter_templates_catalog"),
    ("payroll/workspace", v1_bridge.payroll_workspace, "v1_payroll_workspace"),
    ("payroll/setup", v1_bridge.payroll_setup, "v1_payroll_setup"),
    ("gate/scan", v1_bridge.gate_scan, "v1_gate_scan"),
    ("gate/scans", v1_bridge.gate_scans, "v1_gate_scans"),
    ("employer/compliance-templates", v1_bridge.compliance_templates, "v1_compliance_templates"),
    ("employer/compliance-checklists", v1_bridge.compliance_checklists, "v1_compliance_checklists"),
    ("employer/compliance-checklists/<int:checklist_id>/field", v1_bridge.compliance_checklist_field, "v1_compliance_checklist_field"),
    ("register-templates/<int:template_id>/file", v1_bridge.register_template_file, "v1_register_template_file"),
    ("employer/register-templates", v1_bridge.employer_register_templates, "v1_employer_register_templates"),
    ("employer/sap/config", v1_bridge.employer_sap_config, "v1_employer_sap_config"),
    ("admin/form-names", v1_bridge.admin_form_names, "v1_admin_form_names"),
    ("admin/form-names/copy-all-states", v1_bridge.admin_copy_all_states, "v1_admin_form_names_copy_all_states"),
    ("admin/form-names/<int:form_id>", v1_bridge.admin_form_name_detail, "v1_admin_form_name_detail"),
    ("employer/form-names", v1_bridge.employer_form_names, "v1_employer_form_names"),
    ("employer/form-names/<int:form_id>", v1_bridge.employer_form_name_detail, "v1_employer_form_name_detail"),
    ("employer/sap/settings", v1_bridge.employer_sap_settings, "v1_employer_sap_settings"),
    ("employer/sap/test", v1_bridge.employer_sap_test, "v1_employer_sap_test"),
    ("employer/sap/setup-document", v1_bridge.employer_sap_setup_document, "v1_employer_sap_setup_document"),
    ("employer/sap/bulk-template", v1_bridge.employer_sap_bulk_template, "v1_employer_sap_bulk_template"),
    ("employer/sap/bulk-status", v1_bridge.employer_sap_bulk_status, "v1_employer_sap_bulk_status"),
    ("employer/sap/bulk-sync", v1_bridge.employer_sap_bulk_sync, "v1_employer_sap_bulk_sync"),
    ("employer/sap/bulk-setup-document", v1_bridge.employer_sap_bulk_setup_document, "v1_employer_sap_bulk_setup_document"),
    ("employer/contractors/<int:contractor_id>/sap-sync", v1_bridge.employer_contractor_sap_sync, "v1_employer_contractor_sap_sync"),
    ("contractor/clra/templates", v1_bridge.contractor_register_templates, "v1_contractor_register_templates"),
    ("contractor/clra/master-template", v1_bridge.clra_master_template, "v1_clra_master_template"),
    ("contractor/clra/validate", v1_bridge.contractor_clra_validate, "v1_contractor_clra_validate"),
    ("contractor/clra/site-documents", v1_bridge.contractor_site_documents, "v1_contractor_site_documents"),
    ("entitylocker/start", v1_bridge.entitylocker_start, "v1_entitylocker_start"),
    ("entitylocker/callback", v1_bridge.entitylocker_callback, "v1_entitylocker_callback"),
    ("entitylocker/status", v1_bridge.entitylocker_status, "v1_entitylocker_status"),
    ("contractor/attendance/template", v1_bridge.attendance_template, "v1_attendance_template"),
    ("contractor/attendance/upload", v1_bridge.attendance_upload, "v1_attendance_upload"),
    ("contractor/attendance/camera-punch", v1_bridge.attendance_camera_punch, "v1_attendance_camera_punch"),
    ("contractor/attendance/camera", v1_bridge.attendance_camera_session, "v1_contractor_attendance_camera"),
    ("employer/attendance/camera", v1_bridge.attendance_camera_session, "v1_employer_attendance_camera"),
    ("employer/cctv/cameras", v1_bridge.employer_cctv_cameras, "v1_employer_cctv_cameras"),
    ("employer/cctv/cameras/<int:camera_id>", v1_bridge.employer_cctv_camera_detail, "v1_employer_cctv_camera_detail"),
    ("employer/cctv/test", v1_bridge.employer_cctv_test, "v1_employer_cctv_test"),
    ("employer/cctv/status", v1_bridge.cctv_status, "v1_employer_cctv_status"),
    ("contractor/cctv/cameras", v1_bridge.contractor_cctv_cameras, "v1_contractor_cctv_cameras"),
    ("contractor/cctv/status", v1_bridge.cctv_status, "v1_contractor_cctv_status"),
    ("admin/ai/catalog", v1_bridge.admin_ai_catalog, "v1_admin_ai_catalog"),
    ("admin/ai/providers", v1_bridge.admin_ai_providers, "v1_admin_ai_providers"),
    ("admin/ai/providers/<int:credential_id>", v1_bridge.admin_ai_provider_detail, "v1_admin_ai_provider_detail"),
    ("admin/ai/providers/<int:credential_id>/default", v1_bridge.admin_ai_provider_default, "v1_admin_ai_provider_default"),
    ("worker/face-enroll", v1_bridge.worker_face_enroll, "v1_worker_face_enroll"),
    ("contractor/gst/status", v1_bridge.gst_verification_status, "v1_contractor_gst_status"),
    ("contractor/gst/verify", v1_bridge.gst_verification_verify, "v1_contractor_gst_verify"),
    ("contractor/gst/initiate", v1_bridge.gst_verification_initiate, "v1_contractor_gst_initiate"),
    ("contractor/gst/validate", v1_bridge.gst_verification_validate, "v1_contractor_gst_validate"),
    ("contractor/gst/certificate", v1_bridge.gst_certificate, "v1_contractor_gst_certificate"),
    ("employer/gst/status", v1_bridge.gst_verification_status, "v1_employer_gst_status"),
    ("employer/gst/verify", v1_bridge.gst_verification_verify, "v1_employer_gst_verify"),
    ("employer/gst/initiate", v1_bridge.gst_verification_initiate, "v1_employer_gst_initiate"),
    ("employer/gst/validate", v1_bridge.gst_verification_validate, "v1_employer_gst_validate"),
    ("employer/gst/certificate", v1_bridge.gst_certificate, "v1_employer_gst_certificate"),
    ("contractor/verification/status", v1_bridge.verification_status, "v1_contractor_verification_status"),
    ("contractor/verification/decline-entitylocker", v1_bridge.verification_decline_entitylocker, "v1_contractor_verification_decline"),
    ("contractor/verification/manual", v1_bridge.verification_manual_submit, "v1_contractor_verification_manual"),
    ("contractor/verification/document/<int:document_id>", v1_bridge.verification_document, "v1_contractor_verification_document"),
    ("employer/verification/status", v1_bridge.verification_status, "v1_employer_verification_status"),
    ("employer/verification/decline-entitylocker", v1_bridge.verification_decline_entitylocker, "v1_employer_verification_decline"),
    ("employer/verification/manual", v1_bridge.verification_manual_submit, "v1_employer_verification_manual"),
    ("employer/verification/document/<int:document_id>", v1_bridge.verification_document, "v1_employer_verification_document"),
    ("admin/verification/queue", v1_bridge.admin_verification_queue, "v1_admin_verification_queue"),
    ("admin/verification/review", v1_bridge.admin_verification_review, "v1_admin_verification_review"),
    ("contractor/attendance", v1_bridge.attendance_uploaded, "v1_attendance_uploaded"),
    ("contractor/audit-document", v1_bridge.contractor_audit_document, "v1_contractor_audit_document"),
    ("audit-reports/filters", v1_bridge.audit_report_filters, "v1_audit_report_filters"),
    ("audit-reports/generate", v1_bridge.audit_report_generate, "v1_audit_report_generate"),
    ("audit-reports/<int:report_id>/file", v1_bridge.audit_report_download, "v1_audit_report_download"),
    ("audit-reports/<int:report_id>", v1_bridge.audit_report_preview, "v1_audit_report_preview"),
    ("audit-reports", v1_bridge.audit_report_list, "v1_audit_report_list"),
    ("admin/bulk-register/<str:entity>", v1_bridge.admin_bulk_register, "v1_admin_bulk_register"),
    ("contractor/compliance-batches/<int:batch_id>/summary", v1_bridge.compliance_batch_summary, "v1_compliance_batch_summary"),
    ("contractor/compliance-batches/<int:batch_id>/site-documents", v1_bridge.compliance_batch_site_documents, "v1_compliance_batch_site_documents"),
    ("contractor/compliance-batches/<int:batch_id>/register/<int:template_id>", v1_bridge.compliance_batch_register, "v1_compliance_batch_register"),
    ("contractor/compliance-batches/<int:batch_id>/register/<int:template_id>/xlsx", v1_bridge.compliance_batch_register_export, "v1_compliance_batch_register_xlsx"),
    ("employer/compliance-batches/<int:batch_id>/summary", v1_bridge.compliance_batch_summary, "v1_employer_compliance_batch_summary"),
    ("employer/compliance-batches/<int:batch_id>/site-documents", v1_bridge.compliance_batch_site_documents, "v1_employer_compliance_batch_site_documents"),
    ("employer/compliance-batches/<int:batch_id>/register/<int:template_id>", v1_bridge.compliance_batch_register, "v1_employer_compliance_batch_register"),
    ("employer/compliance-batches/<int:batch_id>/register/<int:template_id>/xlsx", v1_bridge.compliance_batch_register_export, "v1_employer_compliance_batch_register_xlsx"),
    ("worker/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_worker_submission_file", {"role_path": "worker"}),
    ("contractor/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_contractor_submission_file", {"role_path": "contractor"}),
    ("employer/submissions/<int:submission_id>/file", v1_bridge.submission_file_download, "v1_employer_submission_file", {"role_path": "employer"}),
    ("employer/submissions/<int:submission_id>/token", v1_bridge.submission_file_token, "v1_employer_submission_token", {"role_path": "employer"}),
    ("submissions/file/<str:token>", v1_bridge.submission_file_serve, "v1_submission_file_serve"),
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

