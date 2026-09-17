"""Gate-pass compliance templates, onboarding checklists and officer filling.

Gate Pass Management System §1–§3: the employer defines a compliance template;
on onboarding a checklist is auto-created; each officer completes their fields,
and the category aggregation feeds gate-pass eligibility.
"""

# ruff: noqa: F401,F403
from .common import *
from .admin_console import log_audit

# field key, label, category, sort
DEFAULT_FIELDS = [
    ("medical", "Medical Examination", "MEDICAL", 0),
    ("safety_kit", "Safety Kit", "HEALTH_SAFETY", 1),
    ("safety_training", "Safety Training", "HEALTH_SAFETY", 2),
    ("site_induction", "Site Induction", "HEALTH_SAFETY", 3),
    ("aadhaar", "Aadhaar", "COMPLIANCE", 4),
    ("bank", "Bank Account", "COMPLIANCE", 5),
    ("uan", "UAN", "COMPLIANCE", 6),
    ("esi", "ESI", "COMPLIANCE", 7),
]

# Officer-filled fields mirror onto the worker's welfare record so the existing
# eligibility aggregation reflects them.
_MIRROR = {
    "medical": lambda ws, done: setattr(ws, "medical_examination_status", "Done" if done else ""),
    "safety_kit": lambda ws, done: setattr(ws, "ppe_required", bool(done)),
    "safety_training": lambda ws, done: setattr(ws, "safety_training_completed", bool(done)),
    "site_induction": lambda ws, done: setattr(ws, "site_induction_status", "Done" if done else ""),
}


def _default_template(employer):
    from bss_core.models import GatePassComplianceTemplate
    template, _ = GatePassComplianceTemplate.objects.get_or_create(
        owner=employer, name="Default gate-pass compliance",
        defaults={"required_fields": {k: True for k, *_ in DEFAULT_FIELDS},
                  "validity": {"temporaryDays": 7, "permanentDays": 365}})
    return template


def _ensure_checklist(binding):
    """Get or create the checklist for a binding, seeded from the employer's
    active compliance template (falling back to the default fields)."""
    from bss_core.models import (ComplianceChecklistField, WorkerComplianceChecklist,
                                 GatePassComplianceTemplate)
    checklist, created = WorkerComplianceChecklist.objects.get_or_create(
        worker=binding.worker, binding=binding)
    if created or not checklist.fields.exists():
        employer = binding.site.employer if binding.site else None
        template = (GatePassComplianceTemplate.objects.filter(owner=employer, is_active=True).first()
                    if employer else None)
        checklist.template = template
        checklist.save(update_fields=["template", "updated_at"])
        required = (template.required_fields if template and template.required_fields
                    else {k: True for k, *_ in DEFAULT_FIELDS})
        for key, label, category, order in DEFAULT_FIELDS:
            if required.get(key, True) is False:
                continue
            ComplianceChecklistField.objects.get_or_create(
                checklist=checklist, key=key,
                defaults={"label": label, "category": category, "sort_order": order})
    return checklist


def _set_field(checklist, key, done, officer=None):
    from bss_core.models import ComplianceChecklistField, WorkerWelfareSafety
    field = checklist.fields.filter(key=key).first()
    if field is None:
        raise PortalMutationError("Unknown checklist field.", 404)
    field.status = "DONE" if done else "PENDING"
    field.completed_at = timezone.now() if done else None
    if officer is not None:
        field.officer = officer
    field.save(update_fields=["status", "completed_at", "officer"])
    mirror = _MIRROR.get(key)
    if mirror is not None:
        ws, _ = WorkerWelfareSafety.objects.get_or_create(user=checklist.worker)
        mirror(ws, done)
        ws.save()
    return field


def _checklist_row(checklist):
    fields = [{
        "id": f.id, "key": f.key, "label": payloads._d(f.label), "category": f.category,
        "status": f.status,
        "officer": payloads._d(f.officer.username if f.officer_id else ""),
        "officerId": f.officer_id,
        "completedAt": payloads._dts(f.completed_at) if f.completed_at else "",
    } for f in checklist.fields.select_related("officer")]
    wi = getattr(checklist.worker, "worker_identity", None)
    return {
        "id": checklist.id,
        "worker": payloads._d(wi.name if wi and wi.name else checklist.worker.username),
        "workerId": payloads._d(wi.bss_worker_id if wi else ""),
        "template": payloads._d(checklist.template.name if checklist.template_id else ""),
        "fields": fields,
        "done": sum(1 for f in fields if f["status"] == "DONE"),
        "total": len(fields),
    }


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_templates(request):
    """Employer compliance templates for gate passes."""
    from bss_core.models import GatePassComplianceTemplate
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "GET":
        qs = GatePassComplianceTemplate.objects.filter(owner=request.user).order_by("name")
        if not qs.exists():
            _default_template(request.user)
            qs = GatePassComplianceTemplate.objects.filter(owner=request.user).order_by("name")
        rows = [{
            "id": t.id, "name": payloads._d(t.name),
            "requiredFields": t.required_fields or {},
            "branding": t.branding or {}, "validity": t.validity or {},
            "active": t.is_active,
        } for t in qs]
        return Response({"rows": rows}, status=status.HTTP_200_OK)

    body = request.data if isinstance(request.data, dict) else {}
    if not str(body.get("name") or "").strip():
        return Response({"error": "Template name is required."}, status=status.HTTP_400_BAD_REQUEST)
    t = GatePassComplianceTemplate.objects.create(
        owner=request.user, name=str(body["name"])[:120],
        required_fields=body.get("requiredFields") if isinstance(body.get("requiredFields"), dict) else {},
        branding=body.get("branding") if isinstance(body.get("branding"), dict) else {},
        validity=body.get("validity") if isinstance(body.get("validity"), dict) else {})
    log_audit(request.user, "CREATE", "compliance_template", t.id,
              after={"summary": f"Created compliance template {t.name}"})
    return Response({"data": {"id": t.id, "name": t.name}}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_checklists(request):
    """The employer's worker compliance checklists (auto-created on onboarding)."""
    from bss_core.models import WorkerComplianceChecklist
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    qs = (WorkerComplianceChecklist.objects
          .filter(binding__site__employer=request.user)
          .select_related("worker", "template")[:200])
    return Response({"rows": [_checklist_row(c) for c in qs]}, status=status.HTTP_200_OK)


@api_view(["PATCH", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def compliance_checklist_field(request, checklist_id):
    """An officer completes a checklist field (mirrors onto the worker record)."""
    from bss_core.models import WorkerComplianceChecklist
    checklist = (WorkerComplianceChecklist.objects
                 .filter(pk=checklist_id, binding__site__employer=request.user)
                 .select_related("worker", "template").first())
    if checklist is None:
        return Response({"error": "Checklist not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    key = str(body.get("key") or "").strip()
    if not key:
        return Response({"error": "A field key is required."}, status=status.HTTP_400_BAD_REQUEST)
    done = bool(body.get("done", body.get("status") == "Done"))
    officer = request.user
    if body.get("officerId"):
        from bss_core.models import User
        officer = User.objects.filter(pk=body["officerId"]).first() or request.user
    field = _set_field(checklist, key, done, officer=officer)
    log_audit(request.user, "UPDATE", "compliance_checklist_field", field.id,
              after={"summary": f"{key} → {field.status}"})
    return Response({"data": _checklist_row(checklist)}, status=status.HTTP_200_OK)


__all__ = ["compliance_templates", "compliance_checklists", "compliance_checklist_field",
           "_ensure_checklist", "_set_field", "DEFAULT_FIELDS"]
