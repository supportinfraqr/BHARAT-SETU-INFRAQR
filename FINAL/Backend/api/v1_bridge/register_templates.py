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
        "sourceFormat": t.source_format,
        "columns": list(t.columns or []),
        "meta": t.meta or {},
        "html": t.html or "",
        "active": t.is_active,
        "formatAvailable": t.format_available,
        "version": t.version,
        "fileName": os.path.basename(t.source_file.name) if t.source_file else "",
        "hasFile": bool(t.source_file),
    }


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


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def register_templates(request):
    """List the register template library (admin). Filters: ?state= &q= &active=."""
    from bss_core.models import RegisterTemplate
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

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


@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def register_template_detail(request, template_id):
    """Admin: read / update one register template's HTML layout and title."""
    from bss_core.models import RegisterTemplate
    from .admin_console import log_audit
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    template = RegisterTemplate.objects.filter(pk=template_id).first()
    if template is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response({"data": _template_row(template)}, status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("html") is not None:
        template.html = str(body.get("html") or "")
    if body.get("title") is not None:
        template.title = str(body.get("title") or "")[:200]
    if body.get("active") is not None:
        template.is_active = bool(body.get("active"))
    template.save()
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

    site_states = list(Site.objects.filter(id__in=_contractor_site_ids(request.user))
                       .exclude(state="").values_list("state", flat=True).distinct())
    state = (request.query_params.get("state") or "").strip()
    if state:
        rows = [_template_row(t) for t in applicable_templates(state)[0]]
    else:
        rows = []
        for site_state in site_states:
            rows.extend(_template_row(t) for t in applicable_templates(site_state)[0])
    return Response({"rows": rows, "states": site_states,
                     "strength": state_strength(state) if state else {}},
                    status=status.HTTP_200_OK)


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
    return Response({"rows": rows, "codes": codes, "fees": fees, "states": states},
                    status=status.HTTP_200_OK)


__all__ = ["register_templates", "register_template_detail", "register_template_file",
           "contractor_register_templates", "clra_master_template",
           "state_applicability",
           "applicable_form_codes", "applicable_templates", "state_strength"]
