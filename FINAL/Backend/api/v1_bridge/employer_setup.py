"""Employer post-signup adoption readiness (appointment, medical, CLRA)."""

# ruff: noqa: F401,F403
from .common import *


def _site_heads(user):
    from bss_core.models import Site
    rows = list(Site.objects.filter(employer=user).only("id", "state", "jurisdiction", "is_mine_site"))
    state_heads = sorted({
        (str(s.state or "").strip() if str(getattr(s, "jurisdiction", "state") or "state").lower() != "central"
         else "Central")
        for s in rows
        if (str(s.state or "").strip() or str(getattr(s, "jurisdiction", "state") or "state").lower() == "central")
    })
    medical_heads = sorted({
        (str(s.state or "").strip() or "Central")
        for s in rows
    })
    mine_medical_heads = sorted({
        (str(s.state or "").strip() or "Central")
        for s in rows if _site_is_mine(s)
    })
    return rows, state_heads, medical_heads, mine_medical_heads


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_adoption_status(request):
    from bss_core.models import EmployerLetterAdoption, EmployerMedicalFormAdoption, MedicalFormTemplate
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    if _staff_permissions(request) is not None:
        return Response({"data": {"staff": True, "required": False, "complete": True,
                                  "appointmentLetter": {"adopted": True},
                                  "medical": {"complete": True, "states": []},
                                  "registers": {"complete": True, "states": []}}},
                        status=status.HTTP_200_OK)

    sites, state_heads, medical_heads, mine_medical_heads = _site_heads(request.user)
    adoption = (EmployerLetterAdoption.objects
                .filter(employer=request.user, letter_type="APPOINTMENT", is_active=True,
                        base_template__isnull=False, base_template__is_active=True)
                .exclude(base_template__html="")
                .select_related("base_template").first())
    appointment = {
        "adopted": adoption is not None,
        "templateName": payloads._d(adoption.base_template.name) if adoption and adoption.base_template_id else "",
        "scope": "employer",
    }

    medical_states = []
    for state in medical_heads:
        forms = []
        form_types = ("VIII", "IX") if state in mine_medical_heads else ("VIII",)
        for form_type in form_types:
            tpl = (MedicalFormTemplate.objects.filter(state=state, form_type=form_type, status="frozen").first()
                   or MedicalFormTemplate.objects.filter(state="Central", form_type=form_type, status="frozen").first())
            adopted = bool(tpl and EmployerMedicalFormAdoption.objects.filter(
                employer=request.user, template=tpl, is_active=True).exists())
            forms.append({
                "formType": form_type, "required": tpl is not None, "adopted": adopted,
                "templateId": tpl.id if tpl else None,
                "templateName": payloads._d(tpl.name) if tpl else "",
            })
        required = any(row["required"] for row in forms)
        adopted = all(row["adopted"] for row in forms if row["required"])
        primary = next((row for row in forms if row["required"]), forms[0] if forms else {})
        medical_states.append({
            "state": state, "required": required, "adopted": adopted,
            "mineRequired": state in mine_medical_heads,
            "templateId": primary.get("templateId"),
            "templateName": primary.get("templateName", ""),
            "forms": forms,
        })
    medical_complete = all(row["adopted"] for row in medical_states if row["required"])

    from .register_templates import applicable_templates, employer_adopted_ids
    register_states = []
    central_sites = {str(s.state or "").strip() or "Central" for s in sites
                     if str(getattr(s, "jurisdiction", "state") or "state").lower() == "central"}
    for state in sorted(set(state_heads) | central_sites):
        jurisdiction = "central" if state == "Central" else "state"
        templates, _ = applicable_templates(state, jurisdiction)
        adopted_ids = employer_adopted_ids(request.user, state)
        mandatory = {t.id for t in templates if t.is_mandatory}
        effective = adopted_ids | mandatory
        register_states.append({
            "state": state,
            "required": bool(templates),
            "adopted": bool(adopted_ids),
            "adoptedCount": len([t for t in templates if t.id in effective]),
            "total": len(templates),
        })
    registers_complete = all(row["adopted"] for row in register_states if row["required"])

    required = bool(sites)
    complete = bool(required and appointment["adopted"] and medical_complete and registers_complete)
    return Response({"data": {
        "required": required,
        "complete": complete,
        "siteCount": len(sites),
        "appointmentLetter": appointment,
        "medical": {"complete": medical_complete, "states": medical_states},
        "registers": {"complete": registers_complete, "states": register_states},
        "costSheet": {"required": False, "scope": "site"},
    }}, status=status.HTTP_200_OK)


__all__ = ["employer_adoption_status"]
