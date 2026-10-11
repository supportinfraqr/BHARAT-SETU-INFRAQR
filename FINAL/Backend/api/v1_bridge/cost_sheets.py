"""Universal worker cost sheet templates — admin CRUD, approval workflow,
org customisation and the rule/cost engine.

Reference: ``Requirements/BSS_Cost sheet template_flows.docx``.
"""

# ruff: noqa: F401,F403
from .common import *
from .admin_console import log_audit


def _date(value):
    text = str(value or "").strip()[:10]
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _num(value):
    return payloads._num(value)


# ── serialisation ────────────────────────────────────────────────────────────
def _template_row(t, full=False):
    row = {
        "id": t.id, "name": payloads._d(t.name), "code": payloads._d(t.code),
        "templateType": t.template_type, "appliesTo": t.applies_to,
        "industry": payloads._d(t.industry), "state": payloads._d(t.state),
        "states": list(t.states or []),
        "stateZones": dict((t.details or {}).get("stateZones") or {}),
        "siteId": t.site_id,
        "siteName": payloads._d(t.site.site_name) if t.site_id else "",
        "effectiveDate": payloads._dts(t.effective_date) if t.effective_date else "",
        "effectiveTo": payloads._dts(t.effective_to) if t.effective_to else "",
        "workerCategory": payloads._d(t.worker_category), "designation": payloads._d(t.designation),
        "grade": payloads._d(t.grade),
        "currency": payloads._d(t.currency), "calculationFrequency": t.calculation_frequency,
        "status": t.status, "version": t.version, "ownerId": t.owner_id,
        "inheritsParentRules": t.inherits_parent_rules, "notes": payloads._d(t.notes),
        "updatedAt": payloads._dts(t.updated_at),
    }
    if full:
        row["designations"] = [{
            "id": d.id, "workerCategory": payloads._d(d.worker_category),
            "subCategory": payloads._d(d.sub_category), "designation": payloads._d(d.designation),
            "inheritsParentRules": d.inherits_parent_rules,
        } for d in t.designations.all()]
        mw = t.minimum_wages.first()
        row["minimumWage"] = ({
            "id": mw.id, "state": payloads._d(mw.state), "zone": payloads._d(mw.zone),
            "district": payloads._d(mw.district),
            "scheduledEmployment": payloads._d(mw.scheduled_employment),
            "workerCategory": payloads._d(mw.worker_category),
            "basicWage": _num(mw.basic_wage), "vda": _num(mw.vda),
            "minimumMonthlyWage": _num(mw.minimum_monthly_wage),
            "minimumDailyWage": _num(mw.minimum_daily_wage),
            "notificationNumber": payloads._d(mw.notification_number),
            "effectiveDate": payloads._dts(mw.effective_date) if mw.effective_date else "",
            "effectiveTo": payloads._dts(mw.effective_to) if mw.effective_to else "",
        } if mw else None)
        row["minimumWages"] = [{
            "id": mw.id, "state": payloads._d(mw.state), "zone": payloads._d(mw.zone),
            "district": payloads._d(mw.district),
            "scheduledEmployment": payloads._d(mw.scheduled_employment),
            "workerCategory": payloads._d(mw.worker_category),
            "basicWage": _num(mw.basic_wage), "vda": _num(mw.vda),
            "minimumMonthlyWage": _num(mw.minimum_monthly_wage),
            "minimumDailyWage": _num(mw.minimum_daily_wage),
            "notificationNumber": payloads._d(mw.notification_number),
            "effectiveDate": payloads._dts(mw.effective_date) if mw.effective_date else "",
            "effectiveTo": payloads._dts(mw.effective_to) if mw.effective_to else "",
        } for mw in t.minimum_wages.all()]
        row["statutory"] = [{
            "id": s.id, "component": s.component, "rate": _num(s.rate),
            "rateType": s.rate_type, "applicable": s.applicable,
            "condition": payloads._d(s.condition), "mandatory": s.mandatory,
        } for s in t.statutory_lines.all()]
        row["custom"] = [{
            "id": c.id, "name": payloads._d(c.name), "amount": _num(c.amount),
            "rateType": c.rate_type, "frequency": c.frequency, "appliesTo": c.applies_to,
            "editableByOrg": c.editable_by_org,
        } for c in t.custom_lines.all()]
    return row


# ── create / update ──────────────────────────────────────────────────────────
_TEMPLATE_FIELDS = {
    "name": "name", "code": "code", "templateType": "template_type",
    "appliesTo": "applies_to", "industry": "industry", "state": "state",
    "workerCategory": "worker_category", "grade": "grade", "designation": "designation",
    "currency": "currency", "calculationFrequency": "calculation_frequency",
    "notes": "notes",
}
_TEMPLATE_BOOLS = {"inheritsParentRules": "inherits_parent_rules"}
_TEMPLATE_DATES = {"effectiveDate": "effective_date", "effectiveTo": "effective_to"}


def _apply_template(t, body):
    """Scalar fields only — the row must be saved before children are applied."""
    for key, attr in _TEMPLATE_FIELDS.items():
        if body.get(key) is not None:
            setattr(t, attr, str(body[key])[:160])
    for key, attr in _TEMPLATE_BOOLS.items():
        if body.get(key) is not None:
            setattr(t, attr, bool(body[key]))
    for key, attr in _TEMPLATE_DATES.items():
        if body.get(key) is not None:
            setattr(t, attr, _date(body[key]))
    if isinstance(body.get("states"), list):
        t.states = [str(s)[:60] for s in body["states"] if str(s).strip()]
    if isinstance(body.get("stateZones"), dict):
        d = dict(t.details or {})
        d["stateZones"] = {str(s)[:60]: [str(z)[:40] for z in zones if str(z).strip()]
                           for s, zones in body["stateZones"].items() if zones}
        t.details = d
    if body.get("siteId") is not None:
        from bss_core.models import Site
        t.site = Site.objects.filter(pk=body["siteId"]).first() if body["siteId"] else None


def _apply_children(t, body):
    """Nested child rows (designations, minimum wage, statutory, custom)."""
    if isinstance(body.get("designations"), list):
        t.designations.all().delete()
        for order, row in enumerate(body["designations"]):
            if not isinstance(row, dict) or not row.get("designation"):
                continue
            from bss_core.models import CostSheetDesignation
            CostSheetDesignation.objects.create(
                template=t, worker_category=str(row.get("workerCategory") or "")[:60],
                sub_category=str(row.get("subCategory") or "")[:80],
                designation=str(row["designation"])[:80],
                inherits_parent_rules=bool(row.get("inheritsParentRules", True)),
                sort_order=order)

    mw_rows = body.get("minimumWages")
    mw = body.get("minimumWage")
    if isinstance(mw_rows, list) or isinstance(mw, dict):
        from bss_core.models import CostSheetMinimumWage
        t.minimum_wages.all().delete()
        rows = mw_rows if isinstance(mw_rows, list) and mw_rows else ([mw] if isinstance(mw, dict) and mw else [])
        for entry in rows:
            if not isinstance(entry, dict) or not (entry.get("state") or entry.get("zone")):
                continue
            row = CostSheetMinimumWage(template=t)
            row.state = str(entry.get("state") or "")[:60]
            row.zone = str(entry.get("zone") or "")[:40]
            row.district = str(entry.get("district") or "")[:60]
            row.scheduled_employment = str(entry.get("scheduledEmployment") or "")[:120]
            row.worker_category = str(entry.get("workerCategory") or "")[:60]
            row.basic_wage = _num(entry.get("basicWage"))
            row.vda = _num(entry.get("vda"))
            row.minimum_monthly_wage = _num(entry.get("minimumMonthlyWage"))
            row.minimum_daily_wage = _num(entry.get("minimumDailyWage"))
            row.notification_number = str(entry.get("notificationNumber") or "")[:80]
            row.effective_date = _date(entry.get("effectiveDate"))
            row.effective_to = _date(entry.get("effectiveTo"))
            row.save()

    if isinstance(body.get("statutory"), list):
        from bss_core.models import CostSheetStatutoryLine
        t.statutory_lines.all().delete()
        for order, row in enumerate(body["statutory"]):
            if not isinstance(row, dict) or not row.get("component"):
                continue
            CostSheetStatutoryLine.objects.create(
                template=t, component=str(row["component"])[:30],
                rate=_num(row.get("rate")) or 0,
                rate_type=str(row.get("rateType") or "PERCENT")[:10],
                applicable=bool(row.get("applicable", True)),
                condition=str(row.get("condition") or "")[:160],
                mandatory=bool(row.get("mandatory", True)), sort_order=order)

    if isinstance(body.get("custom"), list):
        from bss_core.models import CostSheetCustomLine
        t.custom_lines.all().delete()
        for order, row in enumerate(body["custom"]):
            if not isinstance(row, dict) or not row.get("name"):
                continue
            CostSheetCustomLine.objects.create(
                template=t, name=str(row["name"])[:80],
                amount=_num(row.get("amount")) or 0,
                rate_type=str(row.get("rateType") or "FIXED")[:10],
                frequency=str(row.get("frequency") or "MONTHLY")[:12],
                applies_to=str(row.get("appliesTo") or "both")[:20],
                editable_by_org=bool(row.get("editableByOrg", True)), sort_order=order)


def _duplicate_exists(body, exclude_pk=None):
    """Duplicate guard is type-aware: universal/state/industry templates clash on
    (type, state, industry, worker category, grade, designation) within the same
    effective period (effective_from→effective_to); site templates clash only on
    (site). A state/industry override on top of a universal base, or the same
    scope in a different validity window, is valid.
    A different minimum-wage grade keeps a template distinct — the same worker
    category as "Grade A" and "Grade C" are separate template lines."""
    from bss_core.models import CostSheetTemplate
    template_type = str(body.get("templateType") or "UNIVERSAL").upper()[:20]
    if template_type == "SITE":
        qs = CostSheetTemplate.objects.filter(template_type="SITE", site_id=body.get("siteId"))
    else:
        qs = CostSheetTemplate.objects.filter(
            template_type=template_type,
            state=str(body.get("state") or ""), industry=str(body.get("industry") or ""),
            worker_category=str(body.get("workerCategory") or ""),
            grade=str(body.get("grade") or ""),
            designation=str(body.get("designation") or ""))
        # Same scope, overlapping periods = duplicate. A blank date behaves as an
        # open-ended period, so it collides with any other period (and blank-blank).
        from django.db.models import Q as _Q
        ed, et = _date(body.get("effectiveDate")), _date(body.get("effectiveTo"))
        period_matches = (_Q(effective_date__isnull=True) | _Q(effective_date=ed)) if ed else _Q(effective_date__isnull=True)
        period_matches &= (_Q(effective_to__isnull=True) | _Q(effective_to=et)) if et else _Q(effective_to__isnull=True)
        qs = qs.filter(period_matches)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.exists()


# ── endpoints ────────────────────────────────────────────────────────────────
def _require_admin(request):
    return request.user.role == "bss_admin"


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheets(request):
    """List (GET) or create (POST) cost sheet templates."""
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        qs = CostSheetTemplate.objects.all()
        state = (request.query_params.get("state") or "").strip()
        sheet_status = (request.query_params.get("status") or "").strip()
        if state:
            qs = qs.filter(state__iexact=state)
        if sheet_status:
            qs = qs.filter(status=sheet_status.upper())
        rows = [_template_row(t, full=True) for t in qs.order_by("-updated_at")[:300]]
        return Response({"rows": rows}, status=status.HTTP_200_OK)

    body = request.data if isinstance(request.data, dict) else {}
    if not str(body.get("name") or "").strip():
        return Response({"error": "Template name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if _duplicate_exists(body):
        return Response({"error": "A template for this state + industry + worker category + "
                                  "grade + designation already exists."}, status=status.HTTP_409_CONFLICT)
    code = str(body.get("code") or "").strip() or f"BSS-CS-{uuid.uuid4().hex[:6].upper()}"
    # Admin-authored templates are live the moment they are saved — no separate
    # Draft → Review → Publish approval cycle.
    t = CostSheetTemplate(code=code[:60], status="PUBLISHED", owner=None)
    _apply_template(t, body)
    t.save()
    _apply_children(t, body)
    t.save()
    log_audit(request.user, "CREATE", "cost_sheet_template", t.id,
              after={"summary": f"Created cost sheet {t.code}"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "POST", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_detail(request, template_id):
    """Read / update / delete one cost sheet template."""
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)
    if request.method == "DELETE":
        t.delete()
        log_audit(request.user, "DELETE", "cost_sheet_template", template_id,
                  after={"summary": "Deleted cost sheet template"})
        return Response({"success": True, "id": template_id}, status=status.HTTP_200_OK)

    body = request.data if isinstance(request.data, dict) else {}
    if _duplicate_exists(body, exclude_pk=t.pk):
        return Response({"error": "A template for this state + industry + worker category + "
                                  "designation already exists."}, status=status.HTTP_409_CONFLICT)
    _apply_template(t, body)
    t.save()
    _apply_children(t, body)
    t.save()
    log_audit(request.user, "UPDATE", "cost_sheet_template", t.id,
              after={"summary": f"Updated cost sheet {t.code}"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_preview(request, template_id):
    """Compute the layered cost breakdown for a template (rule + cost engine)."""
    from api import costsheet
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    overrides = body.get("overrides") if isinstance(body.get("overrides"), dict) else None
    result = costsheet.compute_worker_cost(
        t, basic_wage=body.get("basicWage"), vda=body.get("vda"),
        include_contractor=bool(body.get("includeContractor")), overrides=overrides)
    return Response({"data": result}, status=status.HTTP_200_OK)


class _DraftQS(list):
    def all(self):
        return self

    def first(self):
        return self[0] if self else None


def _draft_template(body):
    """A lightweight template-like object so an unsaved builder draft can be run
    through the same rule + cost engine as a saved template."""
    mw = body.get("minimumWage") if isinstance(body.get("minimumWage"), dict) else {}
    obj = type("DraftTemplate", (), {})()
    obj.id = 0
    obj.parent_id = None
    obj.parent = None
    obj.inherits_parent_rules = True
    obj.code = str(body.get("code") or "DRAFT")
    obj.name = str(body.get("name") or "Draft")
    obj.currency = str(body.get("currency") or "INR")
    mw_obj = type("MW", (), {})()
    mw_obj.basic_wage = mw.get("basicWage")
    mw_obj.vda = mw.get("vda")
    obj.minimum_wages = _DraftQS([mw_obj])
    statutory = []
    for s in (body.get("statutory") or []):
        o = type("SL", (), {})()
        o.component = s.get("component")
        o.rate = s.get("rate")
        o.rate_type = s.get("rateType")
        o.applicable = s.get("applicable", True)
        o.mandatory = s.get("mandatory", False)
        o.condition = s.get("condition", "")
        statutory.append(o)
    obj.statutory_lines = _DraftQS(statutory)
    custom = []
    for c in (body.get("custom") or []):
        o = type("CL", (), {})()
        o.name = c.get("name")
        o.amount = c.get("amount")
        o.rate_type = c.get("rateType", "FIXED")
        o.frequency = c.get("frequency", "MONTHLY")
        o.applies_to = c.get("appliesTo", "both")
        o.editable_by_org = c.get("editableByOrg", True)
        custom.append(o)
    obj.custom_lines = _DraftQS(custom)
    return obj


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_preview_draft(request):
    """Live preview of an unsaved cost-sheet draft (same rule + cost engine)."""
    from api import costsheet
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    result = costsheet.compute_worker_cost(
        _draft_template(body), basic_wage=body.get("basicWage"), vda=body.get("vda"),
        include_contractor=bool(body.get("includeContractor")),
        overrides=body.get("overrides") if isinstance(body.get("overrides"), dict) else None)
    return Response({"data": result}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_sites(request):
    """Sites the admin can pin a site-specific cost sheet to."""
    from bss_core.models import Site
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    rows = [{
        "id": s.id, "name": payloads._d(s.site_name), "code": payloads._d(s.site_code),
        "state": payloads._d(s.state),
        "employer": payloads._d(s.employer.username if s.employer else ""),
    } for s in Site.objects.select_related("employer").order_by("site_name")[:1000]]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


_TRANSITIONS = {
    # Doc flow: Draft → Employer Review → Published (reject → back to Draft).
    "submit": ("REVIEW", {"DRAFT"}),
    "employer-approve": ("PUBLISHED", {"REVIEW"}),
    "employer-reject": ("DRAFT", {"REVIEW"}),
    "approve": ("PUBLISHED", {"REVIEW"}),
    "reject": ("DRAFT", {"REVIEW"}),
    # Back-compat aliases for the earlier Compliance/Finance chain.
    "compliance-pass": ("REVIEW", {"DRAFT", "COMPLIANCE"}),
    "compliance-fail": ("DRAFT", {"REVIEW", "COMPLIANCE"}),
    "finance-approve": ("PUBLISHED", {"REVIEW", "FINANCE"}),
    "finance-reject": ("DRAFT", {"REVIEW", "FINANCE"}),
    "publish": ("PUBLISHED", {"DRAFT", "REVIEW", "COMPLIANCE", "FINANCE"}),
    "archive": ("ARCHIVED", {"PUBLISHED"}),
    "restore": ("PUBLISHED", {"ARCHIVED"}),
    "unarchive": ("DRAFT", {"ARCHIVED"}),
}


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_transition(request, template_id):
    """Advance a template through the approval workflow (Draft → Employer Review
    → Published)."""
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    action = str(body.get("action") or "").lower()
    target, allowed = _TRANSITIONS.get(action, (None, None))
    if target is None:
        return Response({"error": "Unknown workflow action."}, status=status.HTTP_400_BAD_REQUEST)
    if t.status not in allowed:
        return Response({"error": f"'{action}' is not valid from {t.status}."},
                        status=status.HTTP_409_CONFLICT)
    t.status = target
    t.save(update_fields=["status", "updated_at"])
    log_audit(request.user, "APPROVE" if target == "PUBLISHED" else "UPDATE",
              "cost_sheet_template", t.id,
              after={"summary": f"{t.code}: {action} → {target}"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


def _clone_template(source, owner, name=None):
    """Copy a template into an org-owned customised copy (statutory locked)."""
    from bss_core.models import (CostSheetCustomLine, CostSheetDesignation,
                                 CostSheetMinimumWage, CostSheetStatutoryLine,
                                 CostSheetTemplate)
    clone = CostSheetTemplate.objects.create(
        name=str(name or f"{source.name} · {owner.username}")[:160],
        code=f"{source.code}-{uuid.uuid4().hex[:4].upper()}"[:60],
        template_type=source.template_type, applies_to=source.applies_to,
        industry=source.industry, state=source.state,
        states=list(source.states or []), details=dict(source.details or {}),
        effective_date=source.effective_date, effective_to=source.effective_to,
        worker_category=source.worker_category, grade=source.grade,
        designation=source.designation,
        currency=source.currency, calculation_frequency=source.calculation_frequency,
        inherits_parent_rules=True, parent=source, owner=owner, status="PUBLISHED")
    for d in source.designations.all():
        CostSheetDesignation.objects.create(
            template=clone, worker_category=d.worker_category, sub_category=d.sub_category,
            designation=d.designation, inherits_parent_rules=d.inherits_parent_rules,
            sort_order=d.sort_order)
    for mw in source.minimum_wages.all():
        CostSheetMinimumWage.objects.create(
            template=clone, minimum_wage=mw.minimum_wage, state=mw.state, zone=mw.zone,
            district=mw.district, scheduled_employment=mw.scheduled_employment,
            worker_category=mw.worker_category, basic_wage=mw.basic_wage, vda=mw.vda,
            minimum_monthly_wage=mw.minimum_monthly_wage,
            minimum_daily_wage=mw.minimum_daily_wage,
            notification_number=mw.notification_number, effective_date=mw.effective_date,
            effective_to=mw.effective_to)
    for s in source.statutory_lines.all():
        CostSheetStatutoryLine.objects.create(
            template=clone, component=s.component, rate=s.rate, rate_type=s.rate_type,
            applicable=s.applicable, condition=s.condition, mandatory=s.mandatory,
            sort_order=s.sort_order)
    for c in source.custom_lines.all():
        CostSheetCustomLine.objects.create(
            template=clone, name=c.name, amount=c.amount, rate_type=c.rate_type,
            frequency=c.frequency, applies_to=c.applies_to,
            editable_by_org=c.editable_by_org, sort_order=c.sort_order)
    return clone


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheets_available(request):
    """Published, platform templates an org can use, scoped to its geography,
    industry and sites. Access model:
      - Universal            → everyone sees it
      - State-specific       → orgs whose site state matches one of the states
      - Industry-specific    → orgs whose industry matches
      - Site-specific        → only orgs bound/allotted to that site
    Contractors get the same published library (read-only) — customisation
    (clone) is employer-only."""
    from bss_core.models import CostSheetTemplate, Site
    from .bindings import _contractor_site_ids
    role = request.user.role
    if role not in ("contractor", "employer", "bss_admin"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    applies = {"contractor": ("contractor", "both"), "employer": ("employer", "both"),
               "bss_admin": ("contractor", "employer", "both")}[role]

    published = CostSheetTemplate.objects.filter(
        status="PUBLISHED", applies_to__in=applies, owner__isnull=True)

    if role == "employer":
        site_ids = set(Site.objects.filter(employer=request.user).values_list("id", flat=True))
        # Employers ONLY see cost sheet proposals adopted/submitted by contractors engaged at their sites (or their own)
        from bss_core.models import ContractorEmployerBinding, ContractorSiteAllotment
        contractor_user_ids = set(ContractorEmployerBinding.objects.filter(employer=request.user, binding_status="ACCEPTED")
                                 .values_list("contractor_id", flat=True)) | set(
                                     ContractorSiteAllotment.objects.filter(site_id__in=site_ids, status="APPROVED")
                                     .values_list("binding__contractor_id", flat=True))
        adopted_by_contractors = CostSheetTemplate.objects.filter(
            owner_id__in=contractor_user_ids, status__in=["REVIEW", "PUBLISHED"])
        mine = CostSheetTemplate.objects.filter(owner=request.user)
        rows = [_template_row(t, full=True) for t in (adopted_by_contractors | mine).distinct().order_by("-updated_at")[:300]]
        return Response({"rows": rows, "role": "employer"}, status=status.HTTP_200_OK)

    if role == "contractor":
        site_ids = _contractor_site_ids(request.user)
        site_states = set(Site.objects.filter(id__in=site_ids).exclude(state="")
                          .values_list("state", flat=True))
        employer_ids = set(Site.objects.filter(id__in=site_ids)
                           .values_list("employer_id", flat=True))
        industries = set(EmployerProfile.objects.filter(user_id__in=employer_ids)
                         .exclude(industry="").values_list("industry", flat=True))
        
        scope = Q(template_type="UNIVERSAL") | Q(state__in=["", ])
        if site_states:
            states = list(site_states)
            scope |= Q(template_type="STATE", state__in=states) \
                | Q(template_type="STATE", states__has_any=states)
        if industries:
            scope |= Q(template_type="INDUSTRY", industry__in=industries)
        if site_ids:
            scope |= Q(template_type="SITE", site_id__in=site_ids)
        published = published.filter(scope)
        mine = CostSheetTemplate.objects.filter(owner=request.user)
        rows = [_template_row(t, full=True) for t in (published | mine).distinct().order_by("-updated_at")[:300]]
        return Response({"rows": rows, "role": "contractor"}, status=status.HTTP_200_OK)

    mine = CostSheetTemplate.objects.filter(owner=request.user)
    rows = [_template_row(t, full=True) for t in (published | mine).distinct().order_by("-updated_at")[:300]]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_clone(request, template_id):
    """Contractor adopts a published BSS template for one of its allotted sites.

    The adopted copy starts as a DRAFT: the contractor customises its cost heads
    and then explicitly submits it, which moves it to REVIEW for the Principal
    Employer's acceptance. Employers cannot adopt — they only accept/reject
    contractor proposals. Adoption is per-site: the contractor must hold an
    approved allotment for the chosen site, and only one live proposal per
    (template, site) is allowed."""
    from bss_core.models import CostSheetTemplate, Site
    from .bindings import _contractor_site_ids
    if request.user.role != "contractor":
        return Response({"error": "Only contractors can adopt cost sheet templates for a site proposal. Employers review and accept contractor proposals."},
                        status=status.HTTP_403_FORBIDDEN)
    source = CostSheetTemplate.objects.filter(pk=template_id).first()
    if source is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if source.owner_id not in (None, request.user.id) or source.status != "PUBLISHED":
        return Response({"error": "This template is not available to adopt."},
                        status=status.HTTP_409_CONFLICT)
    body = request.data if isinstance(request.data, dict) else {}
    # Adoption is per-site — the chosen site must be one the contractor is
    # actually allotted (approved allotment on an accepted employer binding).
    raw_site = body.get("siteId", body.get("site_id"))
    site = Site.objects.filter(pk=raw_site).first() if raw_site not in (None, "") else None
    if site is None:
        return Response({"error": "Choose the allotted site this cost sheet is for."},
                        status=status.HTTP_400_BAD_REQUEST)
    if site.id not in _contractor_site_ids(request.user):
        return Response({"error": "That site is not allotted to you."},
                        status=status.HTTP_403_FORBIDDEN)
    existing = CostSheetTemplate.objects.filter(
        owner=request.user, parent=source, site=site).exclude(status="ARCHIVED")
    if existing.exists():
        return Response({"error": f"You already have a cost sheet for {site.site_name} from this template."},
                        status=status.HTTP_409_CONFLICT)
    clone = _clone_template(source, request.user, name=body.get("name"))
    clone.site = site
    # Adopted copies begin as an editable DRAFT; submission is a separate action.
    clone.status = "DRAFT"
    clone.save(update_fields=["site", "status", "updated_at"])

    log_audit(request.user, "CREATE", "cost_sheet_template", clone.id,
              after={"summary": f"Adopted cost sheet {source.code} for site {site.site_name} → {clone.code} (Draft)"})
    return Response({"data": _template_row(clone, full=True)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_statutory_master(request):
    """The statutory component rate master (defaults for a template's lines)."""
    from bss_core.models import StatutoryMaster
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    rows = [{
        "component": m.component, "label": payloads._d(m.label), "rate": _num(m.rate),
        "rateType": m.rate_type, "condition": payloads._d(m.condition),
        "mandatory": m.mandatory,
    } for m in StatutoryMaster.objects.filter(is_active=True).order_by("component")]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_generate_code(request):
    """Generate a random cost-sheet template code that is not already in use."""
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    existing = set(CostSheetTemplate.objects.values_list("code", flat=True))
    for _ in range(50):
        code = f"BSS-CS-{uuid.uuid4().hex[:6].upper()}"
        if code not in existing:
            return Response({"code": code}, status=status.HTTP_200_OK)
    code = f"BSS-CS-{uuid.uuid4().hex[:10].upper()}"
    return Response({"code": code}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_min_wage_zones(request):
    """Zones available per state in the wage master — the zone list Step 2 may
    offer per state is exactly this (multi-zone per state is allowed)."""
    from bss_core.models import MinimumWage
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    zones_by_state = {}
    for state, zone in (MinimumWage.objects.filter(is_active=True)
                        .values_list("state", "wage_zone").distinct().order_by("state", "wage_zone")):
        if not zone:
            continue
        zones_by_state.setdefault(str(state), [])
        if zone not in zones_by_state[str(state)]:
            zones_by_state[str(state)].append(str(zone))
    return Response({"zonesByState": zones_by_state}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_min_wage_lookup(request):
    """Auto-fetch the minimum wage for state + zone + category + date. Passing
    zone narrows to that zone's rate; omitting it returns the latest row."""
    from bss_core.models import MinimumWage
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    state = (request.query_params.get("state") or "").strip()
    zone = (request.query_params.get("zone") or "").strip()
    category = (request.query_params.get("category") or "").strip()
    grade = (request.query_params.get("grade") or "").strip()
    industry = (request.query_params.get("industry") or "").strip()
    on_date = _date(request.query_params.get("date"))
    qs = MinimumWage.objects.filter(is_active=True)
    if state:
        qs = qs.filter(state__iexact=state)
    if zone:
        qs = qs.filter(wage_zone__iexact=zone)
    if category:
        qs = qs.filter(employment_category__iexact=category)
    if grade:
        qs = qs.filter(grade__iexact=grade)
    if industry:
        # "All Industries" rows apply to every industry; otherwise the row's
        # industry must match the template's industry exactly.
        qs = qs.filter(Q(industry__iexact=industry) | Q(industry__iexact="All Industries"))
    if on_date:
        # Only periods active on the effective date count (effective_from <= d
        # <= effective_to; effective_to may be null = open-ended notification).
        qs = qs.filter(effective_from__lte=on_date).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=on_date))
    row = qs.order_by("-effective_from", "-id").first()
    if row is None:
        return Response({"data": None, "reason": "no-wage",
                         "message": (f"No wage master row for {state or 'any state'} · "
                                     f"{zone or 'any zone'} · "
                                     f"{grade or 'any grade'} · "
                                     f"{category or 'any category'} · "
                                     f"{industry or 'any industry'} · "
                                     f"{on_date or 'any date'}.")},
                        status=status.HTTP_200_OK)
    total = _num(row.total_wage)
    return Response({"data": {
        "id": row.id, "state": payloads._d(row.state), "zone": payloads._d(row.wage_zone),
        "district": "", "grade": payloads._d(row.grade),
        "scheduledEmployment": payloads._d(row.industry),
        "workerCategory": payloads._d(row.employment_category),
        "basicWage": _num(row.basic_wage), "vda": _num(row.vda),
        "minimumMonthlyWage": total, "minimumDailyWage": round(total / 26, 2) if total else 0,
        "notificationNumber": payloads._d(row.notification_number),
        "effectiveDate": payloads._dts(row.effective_from) if row.effective_from else "",
        "effectiveTo": payloads._dts(row.effective_to) if row.effective_to else "",
    }}, status=status.HTTP_200_OK)


@api_view(["PATCH", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_update(request, template_id):
    """A contractor edits its own DRAFT cost sheet — name + the custom cost lines
    flagged 'editable by org'. Statutory and minimum-wage values stay locked.

    Once submitted for employer acceptance (REVIEW) or accepted (PUBLISHED) the
    sheet is locked; an employer rejection returns it to DRAFT, where it can be
    edited and resubmitted."""
    from bss_core.models import CostSheetTemplate
    if request.user.role != "contractor":
        return Response({"error": "Only contractors edit their own cost sheet drafts; employers accept or reject proposals."},
                        status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id, owner=request.user).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if t.status != "DRAFT":
        return Response({"error": "This cost sheet has been submitted and is locked. "
                                  "If the employer rejects it, it returns to Draft and can be edited again."},
                        status=status.HTTP_409_CONFLICT)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("name"):
        t.name = str(body["name"])[:160]
        t.save(update_fields=["name", "updated_at"])
    custom = body.get("custom")
    if isinstance(custom, list):
        from bss_core.models import CostSheetCustomLine

        existing = {c.name: c for c in t.custom_lines.all()}
        keep = set()
        for order, row in enumerate(custom):
            if not isinstance(row, dict):
                continue
            name = str(row.get("name") or "").strip()[:80]
            if not name:
                continue
            keep.add(name)
            amount = _num(row.get("amount") or 0)
            line = existing.get(name)
            if line is not None:
                # The contractor may adjust its own cost heads (Part C): any
                # custom line that applies to the contractor (or both), plus
                # platform heads flagged editable by the org. Employer-only heads
                # stay locked (the principal employer's cost).
                if line.editable_by_org or line.applies_to in ("contractor", "both"):
                    line.amount = amount
                    fields = ["amount", "updated_at"]
                    freq = str(row.get("frequency") or "").upper()
                    if freq in ("ONE_TIME", "MONTHLY", "ANNUAL") and freq != line.frequency:
                        line.frequency = freq
                        fields.append("frequency")
                    line.save(update_fields=fields)
            else:
                # The contractor adds its own cost head (Part C).
                applies = str(row.get("appliesTo") or "contractor").lower()
                if applies not in ("contractor", "both"):
                    applies = "contractor"
                freq = str(row.get("frequency") or "MONTHLY").upper()
                if freq not in ("ONE_TIME", "MONTHLY", "ANNUAL"):
                    freq = "MONTHLY"
                rate = str(row.get("rateType") or "FIXED").upper()
                if rate not in ("FIXED", "PERCENT"):
                    rate = "FIXED"
                CostSheetCustomLine.objects.create(
                    template=t, name=name, amount=amount, rate_type=rate,
                    frequency=freq, applies_to=applies, editable_by_org=True,
                    sort_order=100 + order)
        # Drop contractor-added heads (sort_order >= 100) no longer in the list.
        for name, line in existing.items():
            if name not in keep and line.sort_order >= 100:
                line.delete()
    log_audit(request.user, "UPDATE", "cost_sheet_template", t.id,
              after={"summary": f"Org updated cost sheet {t.code}"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_preview(request, template_id):
    """An org previews the computed cost for a published or own template."""
    from api import costsheet
    from bss_core.models import CostSheetTemplate
    if request.user.role not in ("contractor", "employer"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    # Published templates (owner None) and the org's own templates are always
    # viewable; an employer may also preview its engaged contractors' templates.
    owner_ok = t.owner_id in (None, request.user.id)
    if not owner_ok and request.user.role == "employer":
        owner_ok = t.owner_id in _employer_engaged_contractor_ids(request.user)
    if not owner_ok:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    overrides = body.get("overrides") if isinstance(body.get("overrides"), dict) else None
    result = costsheet.compute_worker_cost(
        t, include_contractor=request.user.role == "contractor", overrides=overrides)
    return Response({"data": result}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_new_version(request, template_id):
    """Create the next version of a template and supersede the current one."""
    from bss_core.models import CostSheetTemplate
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    source = CostSheetTemplate.objects.filter(pk=template_id).first()
    if source is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    clone = _clone_template(source, None, name=source.name)
    clone.parent = source.parent or source
    clone.superseded_by = None
    clone.status = "DRAFT"
    clone.version = source.version + 1
    clone.owner = source.owner
    clone.save(update_fields=["parent", "status", "version", "owner", "updated_at"])
    source.status = "ARCHIVED"
    source.superseded_by = clone
    source.save(update_fields=["status", "superseded_by", "updated_at"])
    log_audit(request.user, "CREATE", "cost_sheet_template", clone.id,
              after={"summary": f"New version v{clone.version} of {source.code}"})
    return Response({"data": _template_row(clone, full=True)}, status=status.HTTP_201_CREATED)


def _employer_engaged_contractor_ids(employer):
    """Contractor user ids engaged with this employer (accepted binding OR an
    approved site allotment at one of the employer's sites)."""
    from bss_core.models import ContractorEmployerBinding, ContractorSiteAllotment, Site
    site_ids = set(Site.objects.filter(employer=employer).values_list("id", flat=True))
    return set(ContractorEmployerBinding.objects.filter(
        employer=employer, binding_status="ACCEPTED").values_list("contractor_id", flat=True)) | set(
        ContractorSiteAllotment.objects.filter(site_id__in=site_ids, status="APPROVED")
        .values_list("binding__contractor_id", flat=True))


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_approve(request, template_id):
    """Employer accepts a contractor's submitted cost sheet (REVIEW → PUBLISHED)."""
    from bss_core.models import CostSheetTemplate
    if request.user.role != "employer":
        return Response({"error": "Only principal employers can accept contractor cost sheets."}, status=status.HTTP_403_FORBIDDEN)
    
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Cost sheet not found."}, status=status.HTTP_404_NOT_FOUND)
    if t.status != "REVIEW":
        return Response({"error": "Only a cost sheet submitted for acceptance can be approved."},
                        status=status.HTTP_409_CONFLICT)
    
    if t.owner_id not in _employer_engaged_contractor_ids(request.user):
        return Response({"error": "This cost sheet does not belong to an engaged contractor at your sites."}, status=status.HTTP_403_FORBIDDEN)
    
    t.status = "PUBLISHED"
    t.save(update_fields=["status", "updated_at"])
    log_audit(request.user, "APPROVE", "cost_sheet_template", t.id, after={"summary": f"Employer approved contractor cost sheet {t.code}"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_submit(request, template_id):
    """Contractor submits their DRAFT cost sheet to the employer (DRAFT → REVIEW).
    After this the sheet is locked until the employer accepts or rejects it."""
    from bss_core.models import CostSheetTemplate
    if request.user.role != "contractor":
        return Response({"error": "Only the contractor that owns the draft can submit it."},
                        status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id, owner=request.user).first()
    if t is None:
        return Response({"error": "Cost sheet not found."}, status=status.HTTP_404_NOT_FOUND)
    if t.status != "DRAFT":
        return Response({"error": "Only a Draft cost sheet can be submitted."},
                        status=status.HTTP_409_CONFLICT)
    t.status = "REVIEW"
    t.save(update_fields=["status", "updated_at"])
    log_audit(request.user, "UPDATE", "cost_sheet_template", t.id,
              after={"summary": f"Contractor submitted cost sheet {t.code} for employer acceptance"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_reject(request, template_id):
    """Employer rejects a submitted cost sheet (REVIEW → DRAFT) so the contractor
    can revise and resubmit."""
    from bss_core.models import CostSheetTemplate
    if request.user.role != "employer":
        return Response({"error": "Only principal employers can reject contractor cost sheets."},
                        status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Cost sheet not found."}, status=status.HTTP_404_NOT_FOUND)
    if t.status != "REVIEW":
        return Response({"error": "Only a cost sheet submitted for acceptance can be rejected."},
                        status=status.HTTP_409_CONFLICT)
    if t.owner_id not in _employer_engaged_contractor_ids(request.user):
        return Response({"error": "This cost sheet does not belong to an engaged contractor at your sites."}, status=status.HTTP_403_FORBIDDEN)
    t.status = "DRAFT"
    t.save(update_fields=["status", "updated_at"])
    log_audit(request.user, "UPDATE", "cost_sheet_template", t.id,
              after={"summary": f"Employer rejected contractor cost sheet {t.code} → Draft"})
    return Response({"data": _template_row(t, full=True)}, status=status.HTTP_200_OK)


__all__ = ["cost_sheets", "cost_sheet_detail", "cost_sheet_preview",
           "cost_sheet_preview_draft",
           "cost_sheet_transition", "cost_sheets_available", "cost_sheet_clone",
           "cost_sheet_statutory_master", "cost_sheet_min_wage_lookup", "cost_sheet_sites",
           "cost_sheet_min_wage_zones",
           "cost_sheet_generate_code",
           "org_cost_sheet_update", "org_cost_sheet_preview", "org_cost_sheet_approve",
           "org_cost_sheet_submit", "org_cost_sheet_reject",
           "cost_sheet_new_version",
           "_template_row", "_apply_template", "_clone_template"]
