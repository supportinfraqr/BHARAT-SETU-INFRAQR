"""State-wise HTML letter templates (Appointment / Experience) — admin CRUD and
the employer catalog used to pick a template per site.

Rendering lives in ``api/letters.py``: the site's selected template is used, else
a state template, else the all-India default. Templates contain ``{{token}}``
placeholders (see ``_letter_tokens``).
"""

# ruff: noqa: F401,F403
from .common import *
from .admin_console import log_audit


def _row(t):
    return {
        "id": t.id,
        "name": payloads._d(t.name),
        "state": payloads._d(t.state),
        "letterType": t.letter_type,
        "letterTypeLabel": t.get_letter_type_display(),
        "html": t.html or "",
        "active": t.is_active,
        "updatedAt": payloads._dts(t.updated_at),
    }


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_letter_templates(request):
    """List / create state-wise letter templates (BSS Admin only)."""
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    from bss_core.models import LetterTemplate
    if request.method == "GET":
        qs = LetterTemplate.objects.order_by("letter_type", "state", "name")
        return Response({"rows": [_row(t) for t in qs]}, status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    name = str(body.get("name") or "").strip()
    letter_type = str(body.get("letterType") or body.get("letter_type") or "").strip().upper()
    if not name:
        return Response({"error": "Template name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if letter_type not in ("APPOINTMENT", "EXPERIENCE"):
        return Response({"error": "Select Appointment or Experience."}, status=status.HTTP_400_BAD_REQUEST)
    t = LetterTemplate.objects.create(
        name=name[:120], letter_type=letter_type,
        state=str(body.get("state") or "").strip()[:60],
        html=str(body.get("html") or ""),
        created_by=request.user)
    log_audit(request.user, "CREATE", "letter_template", t.id,
              after={"summary": f"Created letter template {t.name}"})
    return Response({"data": _row(t)}, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_letter_template_detail(request, template_id):
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    from bss_core.models import LetterTemplate
    t = LetterTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response({"data": _row(t)}, status=status.HTTP_200_OK)
    if request.method == "DELETE":
        t.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("name") is not None:
        t.name = (str(body.get("name") or "").strip()[:120]) or t.name
    if body.get("state") is not None:
        t.state = str(body.get("state") or "").strip()[:60]
    lt = str(body.get("letterType") or body.get("letter_type") or "").strip().upper()
    if lt in ("APPOINTMENT", "EXPERIENCE"):
        t.letter_type = lt
    if body.get("html") is not None:
        t.html = str(body.get("html") or "")
    if body.get("active") is not None:
        t.is_active = bool(body.get("active"))
    t.save()
    log_audit(request.user, "UPDATE", "letter_template", t.id,
              after={"summary": f"Updated letter template {t.name}"})
    return Response({"data": _row(t)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def letter_templates_catalog(request):
    """Active templates an employer can assign to a site."""
    from bss_core.models import LetterTemplate
    if request.user.role not in ("employer", "contractor", "bss_admin"):
        return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)
    qs = LetterTemplate.objects.filter(is_active=True).order_by("letter_type", "state", "name")
    rows = [{"id": t.id, "name": payloads._d(t.name), "state": payloads._d(t.state),
             "letterType": t.letter_type, "letterTypeLabel": t.get_letter_type_display()}
            for t in qs]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


__all__ = ["admin_letter_templates", "admin_letter_template_detail",
           "letter_templates_catalog"]
