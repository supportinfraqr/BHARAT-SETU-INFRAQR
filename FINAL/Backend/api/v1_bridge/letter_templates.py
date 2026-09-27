"""State-wise HTML letter templates (Appointment / Experience) — admin CRUD and
the employer catalog used to pick a template per site.

Rendering lives in ``api/letters.py``: the site's selected template is used, else
a state template, else the all-India default. Templates contain ``{{token}}``
placeholders (see ``_letter_tokens``).
"""

from django.db import IntegrityError
from .common import *
from .admin_console import log_audit
from bss_core import letter_brand


def _row(t):
    return {
        "id": t.id,
        "name": payloads._d(t.name),
        "state": payloads._d(t.state),
        "letterType": t.letter_type,
        "letterTypeLabel": t.get_letter_type_display(),
        # ensure_letter_html is non-persisting: the admin preview shows exactly
        # what the generated PDF gets, including the page-box fix. Branding is
        # omitted for statutory types (Form XV).
        "html": letter_brand.ensure_letter_html(t.html or "", t.letter_type),
        "logoUrl": letter_brand.ensure_logo_url(t.logo_url, t.letter_type),
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
    state = str(body.get("state") or "").strip()[:60]
    if not name:
        return Response({"error": "Template name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if letter_type not in ("APPOINTMENT", "EXPERIENCE"):
        return Response({"error": "Select Appointment or Experience."}, status=status.HTTP_400_BAD_REQUEST)

    _type_label = "Appointment Letter" if letter_type == "APPOINTMENT" else "Experience / Releasing Letter"

    try:
        with transaction.atomic():
            # State rule: Only 1 Appointment Letter and 1 Releasing Letter allowed per state.
            # (state="" covers the all-India default templates, which live at the same level.)
            existing = (LetterTemplate.objects
                        .filter(letter_type=letter_type, state__iexact=state)
                        .first())
            if existing:
                return Response({
                    "error": f"A template for {_type_label} in '{state}' already exists "
                             f"(\"{existing.name}\"). Edit or delete it before adding a new one."
                }, status=status.HTTP_400_BAD_REQUEST)
            t = LetterTemplate.objects.create(
                name=name[:120], letter_type=letter_type,
                state=state,
                html=str(body.get("html") or ""),
                logo_url=str(body.get("logoUrl") or body.get("logo_url") or ""),
                created_by=request.user)
    except IntegrityError:
        # Only reachable under a concurrent duplicate create — return a clean 400, never a 500.
        return Response({
            "error": f"A template for {_type_label} in '{state}' already exists. "
                     f"Edit or delete it before adding a new one."
        }, status=status.HTTP_400_BAD_REQUEST)

    log_audit(request.user, "CREATE", "letter_template", t.id,
              after={"summary": f"Created letter template {t.name}"})
    return Response({"data": _row(t)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
@transaction.atomic
def admin_copy_template_to_all_states(request, template_id):
    """Copy a template to all Indian states where that letter type is missing."""
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    from bss_core.models import LetterTemplate
    from bss_core.models.master import INDIA_STATES
    t = LetterTemplate.objects.filter(pk=template_id).first()
    if t is None:
        return Response({"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

    existing_states = set(
        LetterTemplate.objects.filter(letter_type=t.letter_type)
        .values_list("state", flat=True)
    )

    created_count = 0
    type_label = "Appointment Letter" if t.letter_type == "APPOINTMENT" else "Experience / Releasing Letter"

    for st in INDIA_STATES:
        if st in existing_states:
            continue
        try:
            LetterTemplate.objects.create(
                name=f"{st} — {type_label}",
                letter_type=t.letter_type,
                state=st,
                html=t.html,
                logo_url=t.logo_url,
                is_active=True,
                created_by=request.user
            )
            created_count += 1
        except IntegrityError:
            pass

    log_audit(request.user, "COPY_ALL_STATES", "letter_template", t.id,
              after={"summary": f"Copied template {t.name} to {created_count} states"})
    return Response({"success": True, "created_count": created_count}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_restore_letter_defaults(request):
    """Restore the canonical letter library from the code snapshot.

    The template HTML lives in exactly one place — ``bss_core/seeds/
    letter_defaults.py`` (regenerated by ``manage.py dump_letter_defaults``) —
    so "Seed defaults" in the admin UI calls this instead of carrying its own
    copy of the appointment letter and Form XV HTML.

    ``mode=ensure`` is the safe additive path (adds the all-India defaults if
    missing, never deletes). ``mode=reset`` reproduces the exact snapshot:
    create missing, update changed, prune extras.
    """
    if request.user.role != "bss_admin":
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    from bss_core.management.commands.seed_letter_templates import (
        Command as RestoreCommand)
    from bss_core.models import LetterTemplate

    body = request.data if isinstance(request.data, dict) else {}
    mode = str(body.get("mode") or "ensure").strip().lower()
    if mode not in ("ensure", "reset"):
        return Response({"error": "mode must be 'ensure' or 'reset'."},
                        status=status.HTTP_400_BAD_REQUEST)

    cmd = RestoreCommand()
    try:
        if mode == "reset":
            counters = cmd._restore_defaults()
        else:
            from bss_core.seeders.letter_templates import seed
            counters = {"created": seed(), "updated": 0, "pruned": 0}
    except Exception as exc:  # missing snapshot, etc.
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    log_audit(request.user, "RESTORE_DEFAULTS", "letter_template", None,
              after={"summary": f"Letter library {mode}: {counters}"})
    return Response({
        "success": True,
        "mode": mode,
        "created": counters["created"],
        "updated": counters["updated"],
        "pruned": counters["pruned"],
        "total": LetterTemplate.objects.count(),
    }, status=status.HTTP_200_OK)


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
    target_state = str(body.get("state") if body.get("state") is not None else t.state).strip()[:60]
    lt = str(body.get("letterType") or body.get("letter_type") or t.letter_type).strip().upper()
    is_active = bool(body.get("active")) if body.get("active") is not None else t.is_active

    _type_label = "Appointment Letter" if lt == "APPOINTMENT" else "Experience / Releasing Letter"

    try:
        with transaction.atomic():
            existing = (LetterTemplate.objects
                        .filter(letter_type=lt, state__iexact=target_state)
                        .exclude(pk=t.id)
                        .first())
            if existing:
                return Response({
                    "error": f"A template for {_type_label} in '{target_state}' already exists "
                             f"(\"{existing.name}\"). Edit or delete it before saving."
                }, status=status.HTTP_400_BAD_REQUEST)

            if body.get("name") is not None:
                t.name = (str(body.get("name") or "").strip()[:120]) or t.name
            t.state = target_state
            if lt in ("APPOINTMENT", "EXPERIENCE"):
                t.letter_type = lt
            if body.get("html") is not None:
                t.html = str(body.get("html") or "")
            if body.get("logoUrl") is not None or body.get("logo_url") is not None:
                t.logo_url = str(body.get("logoUrl") or body.get("logo_url") or "")
            t.is_active = is_active
            t.save()
    except IntegrityError:
        return Response({
            "error": f"A template for {_type_label} in '{target_state}' already exists."
        }, status=status.HTTP_400_BAD_REQUEST)
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
           "admin_copy_template_to_all_states", "admin_restore_letter_defaults",
           "letter_templates_catalog"]
