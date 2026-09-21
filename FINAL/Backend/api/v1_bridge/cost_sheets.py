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
        "siteId": t.site_id,
        "siteName": payloads._d(t.site.site_name) if t.site_id else "",
        "effectiveDate": payloads._dts(t.effective_date) if t.effective_date else "",
        "effectiveTo": payloads._dts(t.effective_to) if t.effective_to else "",
        "workerCategory": payloads._d(t.worker_category), "designation": payloads._d(t.designation),
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
        } if mw else None)
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
    "workerCategory": "worker_category", "designation": "designation",
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

    mw = body.get("minimumWage")
    if isinstance(mw, dict):
        from bss_core.models import CostSheetMinimumWage
        row, _ = CostSheetMinimumWage.objects.get_or_create(template=t)
        row.state = str(mw.get("state") or "")[:60]
        row.zone = str(mw.get("zone") or "")[:40]
        row.district = str(mw.get("district") or "")[:60]
        row.scheduled_employment = str(mw.get("scheduledEmployment") or "")[:120]
        row.worker_category = str(mw.get("workerCategory") or "")[:60]
        row.basic_wage = _num(mw.get("basicWage"))
        row.vda = _num(mw.get("vda"))
        row.minimum_monthly_wage = _num(mw.get("minimumMonthlyWage"))
        row.minimum_daily_wage = _num(mw.get("minimumDailyWage"))
        row.notification_number = str(mw.get("notificationNumber") or "")[:80]
        row.effective_date = _date(mw.get("effectiveDate"))
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
    (type, state, industry, worker category, designation); site templates clash
    only on (site). A state/industry override on top of a universal base is valid."""
    from bss_core.models import CostSheetTemplate
    template_type = str(body.get("templateType") or "UNIVERSAL").upper()[:20]
    if template_type == "SITE":
        qs = CostSheetTemplate.objects.filter(template_type="SITE", site_id=body.get("siteId"))
    else:
        qs = CostSheetTemplate.objects.filter(
            template_type=template_type,
            state=str(body.get("state") or ""), industry=str(body.get("industry") or ""),
            worker_category=str(body.get("workerCategory") or ""),
            designation=str(body.get("designation") or ""))
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
                                  "designation already exists."}, status=status.HTTP_409_CONFLICT)
    code = str(body.get("code") or "").strip() or f"BSS-CS-{uuid.uuid4().hex[:6].upper()}"
    t = CostSheetTemplate(code=code[:60], status="DRAFT", owner=None)
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
        effective_date=source.effective_date, effective_to=source.effective_to,
        worker_category=source.worker_category, designation=source.designation,
        currency=source.currency, calculation_frequency=source.calculation_frequency,
        inherits_parent_rules=True, parent=source, owner=owner, status="PUBLISHED")
    for d in source.designations.all():
        CostSheetDesignation.objects.create(
            template=clone, worker_category=d.worker_category, sub_category=d.sub_category,
            designation=d.designation, inherits_parent_rules=d.inherits_parent_rules,
            sort_order=d.sort_order)
    mw = source.minimum_wages.first()
    if mw:
        CostSheetMinimumWage.objects.create(
            template=clone, minimum_wage=mw.minimum_wage, state=mw.state, zone=mw.zone,
            district=mw.district, scheduled_employment=mw.scheduled_employment,
            worker_category=mw.worker_category, basic_wage=mw.basic_wage, vda=mw.vda,
            minimum_monthly_wage=mw.minimum_monthly_wage,
            minimum_daily_wage=mw.minimum_daily_wage,
            notification_number=mw.notification_number, effective_date=mw.effective_date)
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
        site_states = set(Site.objects.filter(id__in=site_ids).exclude(state="")
                          .values_list("state", flat=True))
        industries = set()
        profile = getattr(request.user, "employer_profile", None)
        if profile and (profile.industry or "").strip():
            industries.add(profile.industry)
    elif role == "contractor":
        site_ids = _contractor_site_ids(request.user)
        site_states = set(Site.objects.filter(id__in=site_ids).exclude(state="")
                          .values_list("state", flat=True))
        employer_ids = set(Site.objects.filter(id__in=site_ids)
                           .values_list("employer_id", flat=True))
        industries = set(EmployerProfile.objects.filter(user_id__in=employer_ids)
                         .exclude(industry="").values_list("industry", flat=True))
    else:
        site_ids, site_states, industries = set(), set(), set()

    if role in ("employer", "contractor"):
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
    rows = [_template_row(t, full=True) for t in (published | mine)
            .distinct().order_by("name")[:300]]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def cost_sheet_clone(request, template_id):
    """Employer clones a published template into their own cost sheet.

    Contractors only *see* the published library at binding/selection time —
    customisation is employer-only."""
    from bss_core.models import CostSheetTemplate
    if request.user.role != "employer":
        return Response({"error": "Only employers can customise a cost template "
                                  "(contractors select from the published library)."},
                        status=status.HTTP_403_FORBIDDEN)
    source = CostSheetTemplate.objects.filter(pk=template_id).first()
    if source is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if source.owner_id not in (None, request.user.id) or source.status != "PUBLISHED":
        return Response({"error": "This template is not available to customise."},
                        status=status.HTTP_409_CONFLICT)
    body = request.data if isinstance(request.data, dict) else {}
    clone = _clone_template(source, request.user, name=body.get("name"))
    log_audit(request.user, "CREATE", "cost_sheet_template", clone.id,
              after={"summary": f"Cloned cost sheet {source.code} → {clone.code}"})
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
def cost_sheet_min_wage_lookup(request):
    """Auto-fetch the minimum wage for state + category + effective date."""
    from bss_core.models import MinimumWage
    if not _require_admin(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    state = (request.query_params.get("state") or "").strip()
    category = (request.query_params.get("category") or "").strip()
    on_date = _date(request.query_params.get("date"))
    qs = MinimumWage.objects.filter(is_active=True)
    if state:
        qs = qs.filter(state__iexact=state)
    if category:
        qs = qs.filter(employment_category__iexact=category)
    if on_date:
        qs = qs.filter(effective_from__lte=on_date)
    row = qs.order_by("-effective_from", "-id").first()
    if row is None:
        return Response({"data": None}, status=status.HTTP_200_OK)
    total = _num(row.total_wage)
    return Response({"data": {
        "id": row.id, "state": payloads._d(row.state), "zone": payloads._d(row.wage_zone),
        "district": "", "scheduledEmployment": payloads._d(row.industry),
        "workerCategory": payloads._d(row.employment_category),
        "basicWage": _num(row.basic_wage), "vda": _num(row.vda),
        "minimumMonthlyWage": total, "minimumDailyWage": round(total / 26, 2) if total else 0,
        "notificationNumber": "", "effectiveDate": payloads._dts(row.effective_from) if row.effective_from else "",
    }}, status=status.HTTP_200_OK)


@api_view(["PATCH", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def org_cost_sheet_update(request, template_id):
    """An org edits its own customised template — name + the custom cost lines
    flagged 'editable by org'. Statutory and minimum-wage values stay locked."""
    from bss_core.models import CostSheetTemplate
    if request.user.role not in ("contractor", "employer"):
        return Response({"error": "Only employers and contractors can edit their cost sheets."},
                        status=status.HTTP_403_FORBIDDEN)
    t = CostSheetTemplate.objects.filter(pk=template_id, owner=request.user).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("name"):
        t.name = str(body["name"])[:160]
        t.save(update_fields=["name", "updated_at"])
    custom = body.get("custom")
    if isinstance(custom, list):
        for row in custom:
            if not isinstance(row, dict) or row.get("amount") is None:
                continue
            line = t.custom_lines.filter(name=str(row.get("name") or "")).first()
            if line is not None and line.editable_by_org:
                line.amount = _num(row["amount"])
                line.save(update_fields=["amount", "updated_at"])
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
    if t is None or t.owner_id not in (None, request.user.id):
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


__all__ = ["cost_sheets", "cost_sheet_detail", "cost_sheet_preview",
           "cost_sheet_preview_draft",
           "cost_sheet_transition", "cost_sheets_available", "cost_sheet_clone",
           "cost_sheet_statutory_master", "cost_sheet_min_wage_lookup", "cost_sheet_sites",
           "org_cost_sheet_update", "org_cost_sheet_preview",
           "cost_sheet_new_version",
           "_template_row", "_apply_template", "_clone_template"]
