"""Extra compliance form names that have no register template (submitted
directly). BSS Admin maintains a per-state **catalog** (always non-mandatory);
each employer **selects** which apply to its contractors (and may mark them
mandatory), and can also add its own forms.
"""

# ruff: noqa: F401,F403
from .common import *


def _clean_checkpoints(value):
    """Normalise an incoming OCR checkpoint list to {type,label,value,required}."""
    out = []
    if not isinstance(value, list):
        return out
    for entry in value:
        if not isinstance(entry, dict):
            continue
        ctype = str(entry.get("type") or "").strip().lower()
        if not ctype:
            continue
        item = {"type": ctype,
                "label": str(entry.get("label") or ctype)[:120],
                "required": bool(entry.get("required", True))}
        if entry.get("value") is not None:
            item["value"] = str(entry.get("value") or "")[:160]
        if entry.get("key"):
            item["key"] = str(entry.get("key"))[:60]
        out.append(item)
    return out


def _row(obj):
    return {
        "id": obj.id,
        "state": obj.state,
        "name": obj.name,
        "mandatory": obj.is_mandatory,
        "requiresDocument": obj.requires_document,
        "frequency": obj.frequency,
        "description": obj.description,
        "ocrCheckpoints": list(obj.ocr_checkpoints or []),
        "scope": "admin" if obj.employer_id is None else "employer",
        "siteId": obj.site_id,
        "active": obj.is_active,
    }


def _global_row(obj, selection):
    return {
        "id": obj.id,
        "state": obj.state,
        "name": obj.name,
        "scope": "admin",
        "selected": bool(selection and selection.is_active),
        "mandatory": bool(selection.is_mandatory) if selection else False,
        "requiresDocument": obj.requires_document,
        "frequency": obj.frequency,
        "description": obj.description,
    }


def _create(request, *, employer, site=None):
    from bss_core.models import CustomFormName
    body = request.data if isinstance(request.data, dict) else {}
    state = str(body.get("state") or "").strip()
    name = str(body.get("name") or "").strip()
    if not state or not name:
        return Response({"error": "State and form name are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    # Admin (global) forms are always non-mandatory — the employer decides
    # mandatory for its own contractors.
    mandatory = bool(body.get("mandatory", False)) if employer is not None else False
    defaults = {
        "is_mandatory": mandatory,
        "requires_document": bool(body.get("requiresDocument", True)),
        "frequency": str(body.get("frequency") or "")[:40],
        "description": str(body.get("description") or "")[:255],
        "ocr_checkpoints": _clean_checkpoints(body.get("ocrCheckpoints")),
        "sort_order": int(body.get("sortOrder") or 0),
        "created_by": str(body.get("createdBy") or "")[:120],
    }
    obj, created = CustomFormName.objects.get_or_create(
        employer=employer, site=site, state=state, name=name, defaults=defaults)
    if not created:
        obj.is_mandatory = mandatory
        if body.get("requiresDocument") is not None:
            obj.requires_document = bool(body.get("requiresDocument"))
        if body.get("ocrCheckpoints") is not None:
            obj.ocr_checkpoints = _clean_checkpoints(body.get("ocrCheckpoints"))
        if body.get("frequency") is not None:
            obj.frequency = str(body.get("frequency") or "")[:40]
        if body.get("description") is not None:
            obj.description = str(body.get("description") or "")[:255]
        obj.is_active = True
        obj.save()
    return Response({"data": _row(obj)}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_form_names(request):
    """BSS Admin: list/add the global catalog of additional forms for a state."""
    from bss_core.models import CustomFormName
    if request.user.role not in ("bss_admin", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "POST":
        return _create(request, employer=None)
    state = (request.query_params.get("state") or "").strip()
    qs = CustomFormName.objects.filter(is_active=True, employer__isnull=True)
    if state:
        qs = qs.filter(state__iexact=state)
    return Response({"data": [_row(o) for o in qs.order_by("sort_order", "name")],
                     "checkpoints": ocr_client.catalog()},
                    status=status.HTTP_200_OK)


@api_view(["DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_form_name_detail(request, form_id):
    from bss_core.models import CustomFormName
    if request.user.role not in ("bss_admin", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    obj = CustomFormName.objects.filter(pk=form_id, employer__isnull=True).first()
    if obj is None:
        return Response({"error": "Form not found."}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_copy_all_states(request):
    """BSS Admin: copy catalog forms from a source state to all other Indian states."""
    from bss_core.models import CustomFormName
    from bss_core.models.master import INDIA_STATES
    if request.user.role not in ("bss_admin", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    source_state = (request.data.get("sourceState") or "").strip()
    if not source_state:
        return Response({"error": "sourceState is required."}, status=status.HTTP_400_BAD_REQUEST)

    source_forms = list(CustomFormName.objects.filter(employer__isnull=True, is_active=True, state__iexact=source_state))
    if not source_forms:
        return Response({"error": f"No active catalog forms found for {source_state}."}, status=status.HTTP_404_NOT_FOUND)

    copied_count = 0
    target_states = [s for s in INDIA_STATES if s.lower() != source_state.lower()]
    for target in target_states:
        for sf in source_forms:
            _, created = CustomFormName.objects.get_or_create(
                employer=None, site=None, state=target, name=sf.name,
                defaults={
                    "is_mandatory": sf.is_mandatory,
                    "requires_document": sf.requires_document,
                    "frequency": sf.frequency,
                    "description": sf.description,
                    "ocr_checkpoints": list(sf.ocr_checkpoints or []),
                    "sort_order": sf.sort_order,
                    "created_by": sf.created_by,
                },
            )
            if created:
                copied_count += 1

    return Response({
        "ok": True,
        "copiedCount": copied_count,
        "targetStateCount": len(target_states),
        "sourceFormCount": len(source_forms),
        "message": f"Copied {len(source_forms)} form(s) from {source_state} to {len(target_states)} states ({copied_count} new entries created)."
    }, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_form_names(request):
    """Employer: the admin catalog for a state (with the employer's **per-site**
    selection) + the employer's own forms for that site. POST either selects a
    catalog form (``formNameId``) for the site or creates the employer's own form
    for the site. ``siteId`` scopes both to one of the employer's sites; without
    it, only legacy (site-less, "all sites") rows are returned/edited."""
    from bss_core.models import CustomFormName, EmployerFormSelection, Site
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)

    def _resolve_site():
        raw = (request.data.get("siteId") if request.method == "POST"
               else request.query_params.get("siteId")) or ""
        raw = str(raw).strip()
        if not raw.isdigit():
            return None
        return Site.objects.filter(id=int(raw), employer=user).first()

    site = _resolve_site()

    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        if body.get("formNameId") is not None:
            gid = int(body["formNameId"]) if str(body["formNameId"]).strip().isdigit() else 0
            catalog = CustomFormName.objects.filter(id=gid, employer__isnull=True).first()
            if catalog is None:
                return Response({"error": "Catalog form not found."}, status=status.HTTP_404_NOT_FOUND)
            selection, _ = EmployerFormSelection.objects.update_or_create(
                employer=user, form_name=catalog, site=site,
                defaults={"is_mandatory": bool(body.get("mandatory", False)),
                          "is_active": bool(body.get("selected", True))})
            return Response({"data": _global_row(catalog, selection)}, status=status.HTTP_200_OK)
        return _create(request, employer=user, site=site)

    state = (request.query_params.get("state") or "").strip()
    # A site sees the forms adopted for it plus the legacy site-less ones.
    site_q = (Q(site=site) | Q(site__isnull=True)) if site is not None else Q(site__isnull=True)
    own = CustomFormName.objects.filter(employer=user, is_active=True).filter(site_q)
    catalog = CustomFormName.objects.filter(employer__isnull=True, is_active=True)
    if state:
        own = own.filter(state__iexact=state)
        catalog = catalog.filter(state__iexact=state)
    # Site-specific selection wins over the legacy site-less one (its own
    # is_active decides whether the form is adopted at that site).
    selections = {}
    for s in EmployerFormSelection.objects.filter(
            employer=user, form_name__in=catalog, is_active=True, site__isnull=True):
        selections.setdefault(s.form_name_id, s)
    if site is not None:
        for s in EmployerFormSelection.objects.filter(employer=user, form_name__in=catalog, site=site):
            selections[s.form_name_id] = s
    data = [_row(o) for o in own.order_by("sort_order", "name")]
    data += [_global_row(o, selections.get(o.id)) for o in catalog.order_by("sort_order", "name")]
    return Response({"data": data, "checkpoints": ocr_client.catalog()}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_form_name_detail(request, form_id):
    from bss_core.models import CustomFormName
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    obj = CustomFormName.objects.filter(pk=form_id, employer=user).first()
    if obj is None:
        return Response({"error": "Form not found."}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response({"ok": True}, status=status.HTTP_200_OK)


__all__ = ["admin_form_names", "admin_form_name_detail", "admin_copy_all_states",
           "employer_form_names", "employer_form_name_detail"]
