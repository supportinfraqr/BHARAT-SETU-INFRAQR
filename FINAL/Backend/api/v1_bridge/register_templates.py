"""Register template library (State + Form) — the PAN-India CLRA templates."""

# ruff: noqa: F401,F403
import io
import os

from .common import *


def _template_row(t):
    return {
        "id": t.id,
        "state": t.state,
        "formCode": t.form_code,
        "title": t.title,
        "templateType": t.template_type,
        "status": t.status,
        "act": t.act,
        "frequency": t.frequency,
        "sourceFormat": t.source_format,
        "columns": list(t.columns or []),
        "fields": list(t.fields or []),
        "meta": t.meta or {},
        "html": t.html or "",
        "fieldMappings": [{"column": m.column, "fieldKey": m.field_key}
                          for m in t.field_mappings.all()],
        "calculationRules": [{"targetField": r.target_field, "label": r.label, "formula": r.formula}
                             for r in t.calculation_rules.all()],
        "active": t.is_active,
        "formatAvailable": t.format_available,
        "criticality": t.criticality,
        "isMandatory": t.is_mandatory,
        "version": t.version,
        "fileName": os.path.basename(t.source_file.name) if t.source_file else "",
        "hasFile": bool(t.source_file),
        "authored": not t.source_file,
    }


def _clean_columns(value):
    """Normalise an incoming columns list to non-empty unique strings."""
    if not isinstance(value, list):
        return []
    out = []
    for col in value:
        col = str(col).strip() if col else ""
        if col and col not in out:
            out.append(col)
    return out


def _clean_fields(value):
    """Normalise the field-dictionary ``fields`` list into safe dicts.

    Each entry keeps: section, label, dataType, dataSource, sourceField,
    mandatory, readOnly, signature, approval, sort (sort is auto-reassigned)."""
    if not isinstance(value, list):
        return []
    DATA_TYPES = {"text", "number", "date", "currency", "boolean", "select", "textarea"}
    DATA_SOURCES = {"", "worker", "attendance", "payroll", "payment", "site",
                    "contractor", "employer", "manual"}
    out = []
    for i, f in enumerate(value):
        if not isinstance(f, dict) or not str(f.get("label") or "").strip():
            continue
        data_type = str(f.get("dataType") or "text").strip().lower()
        out.append({
            "section": str(f.get("section") or "")[:160],
            "label": str(f["label"])[:200],
            "dataType": data_type if data_type in DATA_TYPES else "text",
            "dataSource": str(f.get("dataSource") or "manual").strip().lower()
                          if str(f.get("dataSource") or "") in DATA_SOURCES else "manual",
            "sourceField": str(f.get("sourceField") or "")[:80],
            "mandatory": bool(f.get("mandatory")),
            "readOnly": bool(f.get("readOnly")),
            "signature": bool(f.get("signature")),
            "approval": bool(f.get("approval")),
            "sort": i + 1,
        })
    return out


def _auto_form_html(title, form_code, state, template_type, fields, columns):
    """Generate an authored-form HTML layout from the field dictionary structure.

    Form-style templates (no tabular columns) render as a printable form: each
    defined section becomes a bordered block with label:value rows plus optional
    signature/authority lines. Register-style templates keep the tabular
    ``{{HEAD}}``/``{{ROWS}}`` sections so the contractor's master data renders."""
    def esc(value):
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    sections = []
    for f in fields:
        section = f.get("section") or "General"
        if not sections or sections[-1][0] != section:
            sections.append([section, []])
        sections[-1][1].append(f)

    blocks = []
    for section, items in sections:
        rows = "".join(
            f'<tr><td class="label">{esc(f.get("label",""))}'
            f'{"&nbsp;<span class=req>*</span>" if f.get("mandatory") else ""}</td>'
            f'<td class="value">{_value_input_hint(f)}</td></tr>'
            for f in items)
        blocks.append(
            f'<div class="block"><h3>{esc(section)}</h3>'
            f'<table class="form">{rows}</table></div>')

    sig = ""
    if any(f.get("signature") for f in fields):
        sig = ('<div class="sign-row"><span>Authorised Signatory: ____________________</span>'
               '<span>Date: ____________________</span></div>')
    table = ("<div class=block><h3>{title}</h3><table><thead><tr>{{{{HEAD}}}}</tr></thead>"
             "<tbody>{{{{ROWS}}}}</tbody></table></div>").format(title="Data") if columns else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{esc(title)}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }}
  h1 {{ font-size: 16px; margin: 0 0 2px; }}
  .sub {{ font-size: 11px; color: #555; margin-bottom: 12px; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 6px 24px; font-size: 11px; margin-bottom: 14px; }}
  .meta span {{ color: #666; margin-right: 4px; }}
  .block {{ border: 1px solid #999; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }}
  .block h3 {{ font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }}
  table.form {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
  table.form td {{ border: 1px solid #ccc; padding: 6px 8px; }}
  td.label {{ width: 38%; font-weight: 600; background: #f5f7fa; }}
  td.value {{ color: #333; }}
  .req {{ color: #b91c1c; }}
  table.data, table.data th, table.data td {{ border: 1px solid #999; }}
  table.data {{ border-collapse: collapse; width: 100%; font-size: 10px; }}
  table.data th {{ background: #0A192F; color: #fff; padding: 4px 5px; }}
  table.data td {{ padding: 4px 5px; vertical-align: top; }}
  .sign-row {{ display: flex; justify-content: space-between; margin-top: 22px; font-size: 11px; }}
  .foot {{ margin-top: 18px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }}
  @media print {{ body {{ margin: 8mm; }} }}
</style></head><body>
  <h1>{esc(title)}</h1>
  <div class="sub">{esc(form_code or "")} · {esc(state or "")} · {esc(template_type or "")}</div>
  <div class="meta">
    <div><span>Act / Rules:</span><strong>{{{{ACT}}}}</strong></div>
    <div><span>Contractor:</span><strong>{{{{CONTRACTOR_NAME}}}}</strong></div>
    <div><span>Employer:</span><strong>{{{{EMPLOYER_NAME}}}}</strong></div>
    <div><span>Site:</span><strong>{{{{SITE_NAME}}}} ({{{{SITE_CODE}}}})</strong></div>
    <div><span>Wage period:</span><strong>{{{{MONTH}}}} {{{{YEAR}}}}</strong></div>
    <div><span>Records:</span><strong>{{{{RECORD_COUNT}}}}</strong></div>
  </div>
  {''.join(blocks)}
  {table}
  {sig}
  <div class="foot"><span>Generated on {{{{GENERATED_ON}}}}</span><span>Form: {esc(form_code or "")} / {{{{FINANCIAL_YEAR}}}}</span></div>
</body></html>"""


def _value_input_hint(field):
    data_type = field.get("dataType", "text")
    hint = {"text": "____________________", "number": "______________",
            "date": "dd / mm / yyyy", "currency": "₹ ____________",
            "boolean": "Yes / No", "select": "____________________",
            "textarea": ""}
    return hint.get(data_type, "____________________")


def _create_template(request, body):
    """Create an admin-authored State + Form template (field dictionary shape)."""
    from bss_core.models import RegisterTemplate
    from .admin_console import log_audit

    state = str(body.get("state") or "").strip()
    form_code = str(body.get("formCode") or "").strip().upper()
    if not state or not form_code:
        return Response({"error": "State and form code are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    if RegisterTemplate.objects.filter(state__iexact=state, form_code=form_code).exists():
        return Response({"error": f"A template already exists for {state} · {form_code}. "
                                  "Edit it instead."}, status=status.HTTP_409_CONFLICT)

    title = str(body.get("title") or f"{form_code} — {state}")[:200]
    template_type = str(body.get("templateType") or "register")[:20]
    status_value = str(body.get("status") or "draft")[:20]
    act = str(body.get("act") or "")[:160]
    frequency = str(body.get("frequency") or "")[:60]
    criticality = str(body.get("criticality") or "")[:20]
    is_mandatory = bool(body.get("isMandatory", False))
    columns = _clean_columns(body.get("columns"))
    fields = _clean_fields(body.get("fields"))
    html = str(body.get("html") or "")
    if not html.strip() and fields:
        html = _auto_form_html(title, form_code, state, template_type, fields, columns)

    template = RegisterTemplate.objects.create(
        state=state, form_code=form_code, title=title,
        template_type=template_type, status=status_value,
        act=act, frequency=frequency, criticality=criticality, is_mandatory=is_mandatory,
        source_format="html", columns=columns, fields=fields, html=html,
        is_active=body.get("active", True), format_available=True,
        meta={"authored": True, "author": str(request.user)},
    )
    log_audit(request.user, "CREATE", "register_template", template.id,
              after={"summary": f"Created register template {state} {form_code}"})
    return Response({"data": _template_row(template)}, status=status.HTTP_201_CREATED)


def applicable_form_codes(state):
    """The normalised form labels the CLRA applicability matrix maps for a state.

    Empty set → the matrix has no rows for this state (caller falls back to every
    template in the state's folder)."""
    from bss_core.models import StateFormApplicability
    if not state:
        return set()
    return {a.form_label.strip().upper()
            for a in StateFormApplicability.objects.filter(state__iexact=state)
            if (a.form_label or "").strip().upper().startswith("FORM")}


def applicable_templates(state):
    """Register templates for a state, filtered by the applicability matrix.

    Returns ``(templates, forms)`` — ``forms`` is the mapped set (empty when the
    state has no matrix rows, in which case every folder template is returned)."""
    from bss_core.models import RegisterTemplate
    qs = (RegisterTemplate.objects
          .filter(state__iexact=state, is_active=True)
          .exclude(columns=[]).order_by("form_code"))
    forms = applicable_form_codes(state)
    if not forms:
        return list(qs), forms
    return [t for t in qs if t.form_code.strip().upper() in forms], forms


def state_strength(state):
    """CLRA RC/PE + labour-licence worker-strength thresholds for a state."""
    from bss_core.models import StateFormApplicability
    row = StateFormApplicability.objects.filter(state__iexact=state).first()
    return {
        "rcPe": (row.strength_rc_pe if row else ""),
        "licence": (row.strength_licence if row else ""),
        "lwf": (row.lwf if row else ""),
        "hra": (row.hra if row else ""),
        "nhFh": (row.nh_fh if row else ""),
        "ptFrequency": (row.pt_frequency if row else ""),
    }


def employer_adopted_ids(employer, state):
    """Template ids the employer has adopted for a state (CLRA register adoption).

    Empty set means the employer has not configured CLRA for that state, so
    callers keep the full applicable library (backward compatible)."""
    from bss_core.models import EmployerRegisterTemplateAdoption
    if employer is None or not state:
        return set()
    return set(EmployerRegisterTemplateAdoption.objects
               .filter(employer=employer, state__iexact=state, is_active=True)
               .values_list("template_id", flat=True))


def gate_templates_by_adoption(templates, employer, state):
    """Hard-gate templates to the employer's adopted forms for a state.

    Once the employer has adopted at least one form for the state, only those
    forms are available; with no adoption rows the full list is returned."""
    adopted = employer_adopted_ids(employer, state)
    if not adopted:
        return templates
    return [t for t in templates if t.id in adopted]


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def register_templates(request):
    """Admin: list (GET) or author a new State + Form template (POST).

    Filters: ?state= &q= &active=. POST body: state (required), formCode
    (required), title, templateType, status, act, frequency, columns[], fields[]
    (field-dictionary sections), html (optional — auto-generated from fields when
    blank). BSS Admin only."""
    from bss_core.models import RegisterTemplate
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "POST":
        return _create_template(request, request.data if isinstance(request.data, dict) else {})

    qs = RegisterTemplate.objects.all()
    state_filter = (request.query_params.get("state") or "").strip()
    if state_filter:
        qs = qs.filter(state__iexact=state_filter)
    active_filter = (request.query_params.get("active") or "").strip().lower()
    if active_filter in ("true", "false"):
        qs = qs.filter(is_active=active_filter == "true")
    term = (request.query_params.get("q") or "").strip()
    if term:
        qs = qs.filter(Q(form_code__icontains=term) | Q(title__icontains=term)
                       | Q(state__icontains=term))
    rows = [_template_row(t) for t in qs.order_by("state", "form_code")[:2000]]
    states = list(RegisterTemplate.objects.values_list("state", flat=True)
                  .distinct().order_by("state"))
    return Response({"rows": rows, "states": states}, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def register_template_detail(request, template_id):
    """Admin: read / update / delete one register template."""
    from bss_core.models import RegisterTemplate
    from .admin_console import log_audit
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        label = f"{template.state} {template.form_code}"
        template.delete()
        log_audit(request.user, "DELETE", "register_template", template_id,
                  after={"summary": f"Deleted register template {label}"})
        return Response({"ok": True, "summary": f"Deleted {label}"}, status=status.HTTP_200_OK)
    if request.method == "GET":
        return Response({"data": _template_row(template)}, status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("html") is not None:
        template.html = str(body.get("html") or "")
    if body.get("title") is not None:
        template.title = str(body.get("title") or "")[:200]
    if body.get("templateType") is not None:
        template.template_type = str(body.get("templateType") or "register")[:20]
    if body.get("status") is not None:
        template.status = str(body.get("status") or "draft")[:20]
    if body.get("act") is not None:
        template.act = str(body.get("act") or "")[:160]
    if body.get("frequency") is not None:
        template.frequency = str(body.get("frequency") or "")[:60]
    if body.get("criticality") is not None:
        template.criticality = str(body.get("criticality") or "")[:20]
    if body.get("isMandatory") is not None:
        template.is_mandatory = bool(body.get("isMandatory"))
    if body.get("active") is not None:
        template.is_active = bool(body.get("active"))
    if "columns" in body:
        template.columns = _clean_columns(body.get("columns"))
    if "fields" in body:
        template.fields = _clean_fields(body.get("fields"))
        if not template.html and template.fields:
            template.html = _auto_form_html(
                template.title, template.form_code, template.state,
                template.template_type, template.fields, template.columns)
    template.save()
    if isinstance(body.get("fieldMappings"), list):
        from bss_core.models import RegisterFieldMapping
        template.field_mappings.all().delete()
        for order, m in enumerate(body["fieldMappings"]):
            if not isinstance(m, dict) or not str(m.get("column") or "").strip():
                continue
            RegisterFieldMapping.objects.create(
                template=template, column=str(m["column"])[:200],
                field_key=str(m.get("fieldKey") or "")[:60], sort_order=order)
    if isinstance(body.get("calculationRules"), list):
        from bss_core.models import RegisterCalculationRule
        template.calculation_rules.all().delete()
        for order, r in enumerate(body["calculationRules"]):
            if not isinstance(r, dict) or not str(r.get("formula") or "").strip():
                continue
            RegisterCalculationRule.objects.create(
                template=template, target_field=str(r.get("targetField") or "")[:80],
                label=str(r.get("label") or "")[:120], formula=str(r["formula"])[:255],
                sort_order=order)
    log_audit(request.user, "UPDATE", "register_template", template.id,
              after={"summary": f"Updated register template {template.state} {template.form_code}"})
    return Response({"data": _template_row(template)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def register_template_file(request, template_id):
    """Download the original source register template."""
    from bss_core.models import RegisterTemplate
    if request.user.role not in ("bss_admin", "contractor", "employer"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None or not template.source_file:
        return Response({"error": "Template file not found."}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(template.source_file.open("rb"), as_attachment=True,
                        filename=os.path.basename(template.source_file.name))


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_register_templates(request):
    """The active State+Form register templates applicable to a contractor.

    ?state=  filters to one state; otherwise the states of the contractor's
    allotted sites are used."""
    from .bindings import _contractor_site_ids
    if request.user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)

    # Templates are gated per site: a site sees only the forms its own employer
    # adopted for that site's state (site-wise). Sites whose employer has not
    # configured CLRA keep the full applicable library.
    sites = list(Site.objects.filter(id__in=_contractor_site_ids(request.user))
                 .exclude(state="").select_related("employer"))
    state = (request.query_params.get("state") or "").strip()
    if state:
        states = [state]
        site_rows = [s for s in sites if s.state.lower() == state.lower()]
    else:
        states = []
        for site in sites:
            if site.state not in states:
                states.append(site.state)
        site_rows = sites

    rows = []
    seen = set()
    for site_state in states:
        base = applicable_templates(site_state)[0]
        allowed, gated = set(), False
        for site in (s for s in site_rows if s.state.lower() == site_state.lower()):
            adopted = employer_adopted_ids(site.employer, site_state)
            if adopted:
                gated = True
                allowed |= adopted
        for template in (base if not gated else [t for t in base if t.id in allowed]):
            if template.id not in seen:
                seen.add(template.id)
                rows.append(_template_row(template))
    return Response({"rows": rows, "states": states,
                     "strength": state_strength(state) if state else {}},
                    status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_register_templates(request):
    """Employer CLRA register adoption, per state.

    GET  → the states where the employer has a registered site, each with the
           state's applicable State+Form templates and an ``adopted`` flag.
    POST → adopt/revoke. ``{"state","templateIds":[…]}`` replaces the adopted
           set for that state; ``{"state","templateId","adopted":bool}`` toggles
           one form. Employers only; only states with a registered site qualify."""
    from bss_core.models import EmployerRegisterTemplateAdoption, RegisterTemplate
    from .admin_console import log_audit
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)

    site_states = list(Site.objects.filter(employer=user).exclude(state="")
                       .values_list("state", flat=True).distinct().order_by("state"))
    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        state = str(body.get("state") or "").strip()
        if not state:
            return Response({"error": "State is required."}, status=status.HTTP_400_BAD_REQUEST)
        if state.lower() not in {s.lower() for s in site_states}:
            return Response({"error": f"No registered site in {state}."},
                            status=status.HTTP_400_BAD_REQUEST)
        if "templateIds" in body:
            wanted = {int(i) for i in (body.get("templateIds") or []) if str(i).strip().isdigit()}
            valid = set(RegisterTemplate.objects.filter(id__in=wanted, state__iexact=state)
                        .values_list("id", flat=True))
            existing = set(EmployerRegisterTemplateAdoption.objects
                           .filter(employer=user, state__iexact=state)
                           .values_list("template_id", flat=True))
            for template_id in valid - existing:
                EmployerRegisterTemplateAdoption.objects.create(
                    employer=user, template_id=template_id, state=state)
            EmployerRegisterTemplateAdoption.objects.filter(
                employer=user, state__iexact=state).exclude(template_id__in=valid).update(is_active=False)
            EmployerRegisterTemplateAdoption.objects.filter(
                employer=user, state__iexact=state, template_id__in=valid).update(is_active=True)
        elif body.get("templateId") is not None:
            template = RegisterTemplate.objects.filter(
                id=int(body["templateId"]), state__iexact=state).first()
            if template is None:
                return Response({"error": "Template not found for that state."},
                                status=status.HTTP_404_NOT_FOUND)
            EmployerRegisterTemplateAdoption.objects.update_or_create(
                employer=user, template=template,
                defaults={"state": state, "is_active": bool(body.get("adopted", True))})
        else:
            return Response({"error": "Provide templateIds or templateId."},
                            status=status.HTTP_400_BAD_REQUEST)
        log_audit(user, "UPDATE", "employer_register_adoption", user.id,
                  after={"summary": f"CLRA register adoption updated for {state}"})

    states_payload = []
    for site_state in site_states:
        templates_list = applicable_templates(site_state)[0]
        adopted = employer_adopted_ids(user, site_state)
        states_payload.append({
            "state": site_state,
            "siteCount": Site.objects.filter(employer=user, state__iexact=site_state).count(),
            "adoptedCount": len([t for t in templates_list if t.id in adopted]),
            "total": len(templates_list),
            "gated": bool(adopted),
            "forms": [{**_template_row(t), "adopted": t.id in adopted} for t in templates_list],
        })
    return Response({"states": states_payload}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def clra_master_template(request):
    """Download the standard CLRA master-file upload template (XLSX)."""
    from api import clra
    if request.user.role not in ("contractor", "employer", "bss_admin"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    data = clra.build_master_template()
    return FileResponse(io.BytesIO(data), as_attachment=True,
                        filename="clra-master-template.xlsx")


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def state_applicability(request):
    """The CLRA applicability matrix (admin): state × purpose → form, codes, fees."""
    from bss_core.models import StateCode, StateFeeMaster, StateFormApplicability
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    state = (request.query_params.get("state") or "").strip()
    qs = StateFormApplicability.objects.all()
    if state:
        qs = qs.filter(state__iexact=state)
    rows = [{
        "state": a.state, "purpose": a.purpose, "form": a.form_label,
        "strengthRcPe": a.strength_rc_pe, "strengthLicence": a.strength_licence,
        "lwf": a.lwf, "hra": a.hra, "nhFh": a.nh_fh, "ptFrequency": a.pt_frequency,
    } for a in qs.order_by("state", "purpose")[:4000]]
    codes = [{
        "state": c.state, "code": c.code, "isUnionTerritory": c.is_union_territory,
        "lwf": c.lwf, "nhFh": c.nh_fh,
    } for c in StateCode.objects.order_by("state")]
    fees = [{
        "state": f.state, "securityFee": f.security_fee_per_employee, "govtFees": f.govt_fees,
    } for f in StateFeeMaster.objects.order_by("state")]
    states = list(StateFormApplicability.objects.values_list("state", flat=True)
                  .distinct().order_by("state"))
    purposes = list(StateFormApplicability.objects.values_list("purpose", flat=True)
                    .distinct().order_by("purpose"))
    return Response({"rows": rows, "codes": codes, "fees": fees, "states": states,
                     "purposes": purposes},
                    status=status.HTTP_200_OK)


__all__ = ["register_templates", "register_template_detail", "register_template_file",
           "contractor_register_templates", "employer_register_templates",
           "clra_master_template", "state_applicability",
           "applicable_form_codes", "applicable_templates", "state_strength",
           "employer_adopted_ids", "gate_templates_by_adoption"]
