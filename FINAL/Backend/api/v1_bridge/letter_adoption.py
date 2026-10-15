"""Employer adoption + customisation of the Appointment letter template.

An employer (one active adoption per employer, employer-wide) picks a base
appointment-letter template from the admin catalog and may override the letter's
text colour, heading colour, logo, brand wordmark and footer. Every contractor —
and therefore every worker — engaged at the employer's sites then has their
appointment letters rendered from the adopted + customised template.
"""

import re

from .common import *
from .admin_console import log_audit

_HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _hex(value) -> str:
    s = str(value or "").strip()
    return s if _HEX_RE.match(s) else ""


def _catalog():
    from bss_core.models import LetterTemplate
    qs = (LetterTemplate.objects
          .filter(letter_type="APPOINTMENT", is_active=True)
          .exclude(html="")
          .order_by("state", "name"))
    return [{"id": t.id, "name": payloads._d(t.name), "state": payloads._d(t.state)}
            for t in qs]


def _template_html(template_id) -> str:
    from bss_core import letter_brand
    from bss_core.models import LetterTemplate
    raw = str(template_id or "").strip()
    if not raw.isdigit():
        return ""
    t = (LetterTemplate.objects
         .filter(id=int(raw), letter_type="APPOINTMENT", is_active=True)
         .exclude(html="").first())
    if t is None:
        return ""
    return letter_brand.ensure_letter_html(t.html, "APPOINTMENT", state=t.state or "")


def _adoption_payload(a):
    if a is None:
        return None
    t = a.base_template
    return {
        "letterType": a.letter_type,
        "baseTemplateId": a.base_template_id,
        "baseTemplateName": payloads._d(t.name) if t else "",
        "baseTemplateState": payloads._d(t.state) if t else "",
        "textColor": payloads._d(a.text_color),
        "headingColor": payloads._d(a.heading_color),
        "brandName": payloads._d(a.brand_name),
        "footerText": payloads._d(a.footer_text),
        "logoUrl": payloads._d(a.logo_url),
        "headerHtml": a.header_html or "",
        "footerHtml": a.footer_html or "",
        "clausesHtml": a.clauses_html or "",
        "active": a.is_active,
        "updatedAt": payloads._dts(a.updated_at),
    }


@api_view(["GET", "POST", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_letter_adoption(request):
    """Employer appointment-letter adoption + customisation. Employers only.

    GET    → ``{adoption, catalog, baseHtml}`` (the adopted base template's HTML
             for preview); ``?templateId=X`` → ``{html}`` for previewing a
             candidate catalog template.
    POST   → adopt/update ``{baseTemplateId, textColor, headingColor, logoUrl,
             brandName, footerText}``.
    DELETE → remove the adoption (a fresh adoption can then be made).
    """
    from bss_core.models import EmployerLetterAdoption, LetterTemplate
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE" or str(request.query_params.get("revoke") or "").lower() in ("1", "true", "yes"):
        EmployerLetterAdoption.objects.filter(
            employer=user, letter_type="APPOINTMENT").update(is_active=False)
        log_audit(user, "DELETE", "employer_letter_adoption", user.id,
                  after={"summary": "Appointment letter adoption removed"})
        return Response({"adoption": None, "catalog": _catalog()}, status=status.HTTP_200_OK)

    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        raw_id = str(body.get("baseTemplateId") or "").strip()
        if not raw_id.isdigit():
            return Response({"error": "Choose an appointment letter template."},
                            status=status.HTTP_400_BAD_REQUEST)
        template = (LetterTemplate.objects
                    .filter(id=int(raw_id), letter_type="APPOINTMENT", is_active=True)
                    .exclude(html="").first())
        if template is None:
            return Response({"error": "That appointment letter template is not available."},
                            status=status.HTTP_404_NOT_FOUND)
        EmployerLetterAdoption.objects.update_or_create(
            employer=user, letter_type="APPOINTMENT",
            defaults={
                "base_template": template,
                "text_color": _hex(body.get("textColor")),
                "heading_color": _hex(body.get("headingColor")),
                "brand_name": str(body.get("brandName") or "").strip()[:120],
                "footer_text": str(body.get("footerText") or "").strip()[:255],
                "logo_url": str(body.get("logoUrl") or "").strip(),
                "header_html": str(body.get("headerHtml") or "")[:20000],
                "footer_html": str(body.get("footerHtml") or "")[:20000],
                "clauses_html": str(body.get("clausesHtml") or "")[:40000],
                "is_active": True,
            })
        log_audit(user, "UPDATE", "employer_letter_adoption", user.id,
                  after={"summary": f"Adopted appointment letter: {template.name}"})

    preview_id = request.query_params.get("templateId")
    if preview_id is not None:
        return Response({"html": _template_html(preview_id)}, status=status.HTTP_200_OK)

    adoption = (EmployerLetterAdoption.objects
                .filter(employer=user, letter_type="APPOINTMENT", is_active=True)
                .select_related("base_template").first())
    base_html = ""
    if adoption is not None and adoption.base_template_id:
        base_html = _template_html(adoption.base_template_id)
    return Response({"adoption": _adoption_payload(adoption), "catalog": _catalog(),
                     "baseHtml": base_html}, status=status.HTTP_200_OK)


__all__ = ["employer_letter_adoption"]
