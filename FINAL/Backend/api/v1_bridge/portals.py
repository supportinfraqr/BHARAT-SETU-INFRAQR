"""Role portal payload endpoints, notifications, identity verify and admin views."""

# ruff: noqa: F401,F403
import os

from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403
from .auth import *  # noqa: F401,F403
from .benefits import *  # noqa: F401,F403
from .courses import *  # noqa: F401,F403
from .documents import *  # noqa: F401,F403
from .grievances import *  # noqa: F401,F403
from .misc import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .leave import *  # noqa: F401,F403
from .sites import *  # noqa: F401,F403
from .submissions import *  # noqa: F401,F403
from .register_templates import *  # noqa: F401,F403
from .payroll import *  # noqa: F401,F403
from .admin_console import *  # noqa: F401,F403
from .cost_sheets import *  # noqa: F401,F403
from .gate import *  # noqa: F401,F403
from .compliance_checklists import *  # noqa: F401,F403
from .mutations import *  # noqa: F401,F403


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_portal(request):
    return Response(payloads.build_worker_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_portal(request):
    return Response(payloads.build_contractor_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_portal(request):
    return Response(payloads.build_employer_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def government_portal(request):
    return Response(payloads.build_government_portal(), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_operations(request):
    return Response(payloads.build_operations("BSS Admin"), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_operations(request):
    return Response(payloads.build_operations("BSS Staff"), status=status.HTTP_200_OK)


def _operations_action(user, body):
    """Handle a BSS Staff / Admin operations action against real records."""
    from bss_core.models import SupportCaseState, SupportTicket

    action = str(body.get("action") or "run").lower()
    if action == "probe-service":
        service_id = str(body.get("id") or "")
        for service in payloads._service_catalog():
            if service["id"] == service_id:
                return {"message": f"{service['name']} · {service['status']} ({service['latencyMs']} ms)",
                        "output": [f"{service['host']} → {service['status']}"]}
        return {"message": "Unknown service.", "output": []}

    if action == "ticket":
        transition = str(body.get("transition") or "").lower()
        if transition == "create":
            ticket = SupportTicket.objects.create(
                title=str(body.get("title") or "Operational issue")[:200],
                service=str(body.get("service") or "")[:80],
                priority=str(body.get("priority") or "P3")[:4])
            log_audit(user, "CREATE", "support_ticket", ticket.id,
                      after={"summary": f"Ticket created: {ticket.title}"})
            return {"message": f"Ticket TCK-{ticket.id} created.", "output": []}
        ticket = SupportTicket.objects.filter(pk=str(body.get("id") or "").replace("TCK-", "")).first()
        if ticket is None:
            return {"message": "Ticket not found.", "output": []}
        mapping = {"claim": ("IN_PROGRESS", True), "monitor": ("MONITORING", False),
                   "resolve": ("RESOLVED", False), "escalate": ("ESCALATED", False)}
        new_status, take = mapping.get(transition, ("IN_PROGRESS", False))
        ticket.status = new_status
        if take and ticket.assignee_id is None:
            ticket.assignee = user
        ticket.save(update_fields=["status", "assignee", "updated_at"])
        log_audit(user, "UPDATE", "support_ticket", ticket.id,
                  after={"summary": f"Ticket {ticket.id} → {new_status}"})
        return {"message": f"Ticket TCK-{ticket.id} → {ticket.get_status_display()}.", "output": []}

    if action == "case":
        case_ref = str(body.get("id") or "")[:80]
        if not case_ref:
            return {"message": "Missing case reference.", "output": []}
        transition = str(body.get("transition") or "").lower()
        status_map = {"claim": "In progress", "wait": "Waiting for evidence",
                      "resolve": "Resolved", "escalate": "Escalated"}
        state, _ = SupportCaseState.objects.get_or_create(case_ref=case_ref)
        state.status = status_map.get(transition, "In progress")
        if transition == "claim" and state.assignee_id is None:
            state.assignee = user
        state.save()
        log_audit(user, "UPDATE", "support_case", case_ref,
                  after={"summary": f"Case {case_ref} → {state.status}"})
        return {"message": f"Case {case_ref} → {state.status}.", "output": []}

    if action == "command":
        return {"message": f"Command '{body.get('command')}' acknowledged.", "output": []}
    return {"message": "Action completed.", "output": []}


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_actions(request):
    result = _operations_action(request.user, request.data or {})
    return Response({"success": True, **result,
                     "completedAt": payloads._dts(timezone.now())},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_actions(request):
    result = _operations_action(request.user, request.data or {})
    return Response({"success": True, **result,
                     "completedAt": payloads._dts(timezone.now())},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def geography(request):
    pin = request.query_params.get("pin")
    if pin:
        loc = payloads.geography_lookup(pin)
        if not loc:
            return Response({"error": "PIN not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": loc}, status=status.HTTP_200_OK)
    return Response({"data": payloads.government_geography()}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([AllowAny])
def identity_verify(request, bss_id):
    # Optional session: when the caller is signed in and bound to the worker,
    # the payload includes the extensive post-binding record.
    viewer = request.user if getattr(request.user, "is_authenticated", False) else None
    data = payloads.build_identity_verify(bss_id, viewer)
    if data is None:
        return Response({"error": "Unknown identity"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"data": data, "verifiedAt": payloads._dts(
        timezone.now())},
        status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def notifications(request, role_path):
    user = request.user
    if request.method == "GET":
        return Response(payloads.build_notifications(user), status=status.HTTP_200_OK)

    body = request.data or {}
    notif_id = body.get("id")
    action = body.get("action")
    if not notif_id:
        return Response({"error": "id is required"}, status=status.HTTP_400_BAD_REQUEST)
    if action not in ("read", "unread", "resolve"):
        return Response({"error": "invalid action"}, status=status.HTTP_400_BAD_REQUEST)
    # The feed mixes persisted Notification rows (numeric id, optionally "db-<id>")
    # with derived live-feed items whose ids are synthetic strings such as
    # "wc-binding-12" or "rozgar-5". The shared mutation handler knows how to
    # persist read state for both (model rows; derived items in
    # UserPreference.notification_prefs) and never coerces a non-numeric id to the
    # PK — doing that here raised an uncaught ValueError -> HTTP 500.
    try:
        resolved_id = _persist_mutation(user, role_path, "notifications", "PATCH", body)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    return Response({"success": True, "data": {"id": resolved_id, "action": action}},
                    status=status.HTTP_200_OK)


@api_view(["POST", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mutate_portal(request, role_path, resource):
    user = request.user
    body = request.data or {}
    try:
        result = _persist_mutation(user, role_path, resource, request.method, body)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)

    # Append-only audit trail for every successful portal mutation.
    log_audit(user, {"POST": "CREATE", "PATCH": "UPDATE", "DELETE": "DELETE"}.get(
        request.method, "UPDATE"), resource,
        result if isinstance(result, (str, int)) else "",
        after={"summary": f"{request.method} {resource}"})

    if request.method == "DELETE":
        return Response({"success": True, "deleted": True, "id": result},
                        status=status.HTTP_200_OK)

    if isinstance(result, (dict, list)):
        # Handler returned fully-serialised record(s) (leave, gate passes) — pass through.
        return Response({"success": True, "data": result, "updatedAt": payloads._dts(timezone.now())},
                        status=status.HTTP_200_OK)

    out = dict(body or {})
    out["id"] = result
    updated_at = payloads._dts(timezone.now())
    return Response({"success": True, "data": out, "updatedAt": updated_at},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_payroll(request):
    if request.user.role not in ("bss_admin", "bss_staff", "government", "admin"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    return Response(payloads.build_admin_payroll(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_master_counts(request):
    """Record counts for every admin master (admin overview KPIs)."""
    from .admin_masters import _counts
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"counts": _counts()}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_masters(request, key):
    """List (GET) or create (POST) a BSS Admin master record."""
    from .admin_masters import _masters
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    try:
        result = _masters(request, key)
    except PortalMutationError as exc:
        # A duplicate is an expected user error, not a server failure: return it
        # with HTTP 200 so the browser console isn't polluted by a failed
        # request. The UI keys off the missing "row" and shows the message.
        code = 200 if exc.status_code == 409 else exc.status_code
        return Response({"error": exc.message}, status=code)
    if result is None:
        return Response({"error": "Unknown master."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "POST":
        log_audit(request.user, "CREATE", f"master:{key}",
                  (result.get("row") or {}).get("id", ""), after={"summary": f"Created {key} record"})
    return Response(result, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH", "POST", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_master_detail(request, key, pk):
    """Update (PATCH/POST) or delete (DELETE) a BSS Admin master record."""
    from .admin_masters import _master_detail
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    try:
        result = _master_detail(request, key, pk)
    except PortalMutationError as exc:
        # Duplicates return 200 (see admin_masters) so the console stays clean.
        code = 200 if exc.status_code == 409 else exc.status_code
        return Response({"error": exc.message}, status=code)
    if result is None:
        return Response({"error": "Unknown master."}, status=status.HTTP_404_NOT_FOUND)
    log_audit(request.user, "DELETE" if request.method == "DELETE" else "UPDATE",
              f"master:{key}", pk, after={"summary": f"{request.method} {key} #{pk}"})
    return Response(result, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_master_file(request, key, pk):
    """Upload (POST) or download (GET) the file attached to a master record.

    Only masters that declare a ``file_field`` (e.g. Minimum Wage's notification
    PDF) accept a file."""
    from .admin_masters import _queryset, _row, _specs
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    spec = _specs().get(key)
    if spec is None or not spec.get("file_field"):
        return Response({"error": "This master has no attached file."},
                        status=status.HTTP_404_NOT_FOUND)
    obj = _queryset(spec).filter(pk=pk).first()
    if obj is None:
        return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)
    field = spec["file_field"]
    if request.method == "GET":
        stored = getattr(obj, field, None)
        if not stored:
            return Response({"error": "No file attached."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(stored.open("rb"), as_attachment=True,
                            filename=os.path.basename(stored.name))
    upload = request.FILES.get("file")
    if upload is None:
        return Response({"error": "Choose a PDF to upload."}, status=status.HTTP_400_BAD_REQUEST)
    setattr(obj, field, upload)
    obj.save()
    log_audit(request.user, "UPDATE", f"master:{key}", pk,
              after={"summary": f"Updated {key} notification file"})
    return Response({"row": _row(spec, obj)}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def document_templates(request):
    """Durable storage for the document-engine template records of one owner.

    GET  ?ownerType=&ownerId=   -> {"data": {"records": [...]}}
    POST {ownerType, ownerId, records: [...]} -> replaces that owner's records.
    """
    from bss_core.models import DocumentTemplateStore
    if request.method == "GET":
        owner_type = (request.query_params.get("ownerType") or "").strip().lower()
        owner_id = (request.query_params.get("ownerId") or "").strip()
        if not owner_type or not owner_id:
            return Response({"error": "ownerType and ownerId are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        row = DocumentTemplateStore.objects.filter(
            owner_type=owner_type, owner_id=owner_id).first()
        return Response({"data": {"records": row.records if row else []}},
                        status=status.HTTP_200_OK)

    body = request.data or {}
    owner_type = str(body.get("ownerType") or "").strip().lower()
    owner_id = str(body.get("ownerId") or "").strip()
    records = body.get("records")
    if not owner_type or not owner_id or not isinstance(records, list):
        return Response({"error": "ownerType, ownerId and records[] are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    row, _ = DocumentTemplateStore.objects.update_or_create(
        owner_type=owner_type, owner_id=owner_id, defaults={"records": records})
    return Response({"data": {"records": row.records}}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def payroll_workspace(request):
    """Durable storage for the payroll workspace module state (runs, payments,
    approvals, loans, structures, revisions, Form-16, F&F, VPF) per owner.

    GET  -> {"data": {"records": {...}}}
    POST {"records": {...}} -> replaces that owner's records.
    """
    from bss_core.models import PayrollWorkspaceStore
    role = request.user.role
    owner_type = {"contractor": "contractor", "employer": "employer",
                  "bss_admin": "admin"}.get(role)
    if owner_type is None:
        return Response({"error": "Payroll is available to contractors, employers and admins."},
                        status=status.HTTP_403_FORBIDDEN)
    owner_id = str(request.user.id)
    if request.method == "GET":
        row = PayrollWorkspaceStore.objects.filter(
            owner_type=owner_type, owner_id=owner_id).first()
        return Response({"data": {"records": row.records if row else {}}},
                        status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    records = body.get("records")
    if not isinstance(records, dict):
        return Response({"error": "records must be a JSON object."},
                        status=status.HTTP_400_BAD_REQUEST)
    row, _ = PayrollWorkspaceStore.objects.update_or_create(
        owner_type=owner_type, owner_id=owner_id, defaults={"records": records})
    return Response({"data": {"records": row.records}}, status=status.HTTP_200_OK)


__all__ = [
    "admin_actions",
    "compliance_templates",
    "compliance_checklists",
    "compliance_checklist_field",
    "gate_scan",
    "gate_scans",
    "cost_sheets",
    "cost_sheet_detail",
    "cost_sheet_preview",
    "cost_sheet_transition",
    "cost_sheets_available",
    "cost_sheet_clone",
    "cost_sheet_statutory_master",
    "cost_sheet_min_wage_lookup",
    "org_cost_sheet_update",
    "org_cost_sheet_preview",
    "cost_sheet_new_version",
    "admin_activity",
    "admin_permissions",
    "admin_master_counts",
    "admin_master_detail",
    "admin_master_file",
    "admin_masters",
    "admin_operations",
    "admin_payroll",
    "bss_staff_actions",
    "bss_staff_operations",
    "contractor_portal",
    "document_templates",
    "employer_portal",
    "geography",
    "government_portal",
    "identity_verify",
    "mutate_portal",
    "notifications",
    "payroll_workspace",
    "payroll_setup",
    "clra_master_template",
    "compliance_batch_register",
    "compliance_batch_site_documents",
    "compliance_batch_summary",
    "contractor_clra_validate",
    "contractor_register_templates",
    "register_template_file",
    "register_templates",
    "state_applicability",
    "worker_portal",
]
