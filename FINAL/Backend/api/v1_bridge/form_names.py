"""Extra compliance form names that have no register template (submitted
directly). BSS Admin maintains a per-state **catalog** (always non-mandatory);
each employer **selects** which apply to its contractors (and may mark them
mandatory), and can also add its own forms.
"""

# ruff: noqa: F401,F403
from .common import *


def _row(obj):
    return {
        "id": obj.id,
        "state": obj.state,
        "name": obj.name,
        "mandatory": obj.is_mandatory,
        "requiresDocument": obj.requires_document,
        "frequency": obj.frequency,
        "description": obj.description,
        "scope": "admin" if obj.employer_id is None else "employer",
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


def _create(request, *, employer):
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
        "sort_order": int(body.get("sortOrder") or 0),
        "created_by": str(body.get("createdBy") or "")[:120],
    }
    obj, created = CustomFormName.objects.get_or_create(
        employer=employer, state=state, name=name, defaults=defaults)
    if not created:
        obj.is_mandatory = mandatory
        if body.get("requiresDocument") is not None:
            obj.requires_document = bool(body.get("requiresDocument"))
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
    return Response({"data": [_row(o) for o in qs.order_by("sort_order", "name")]},
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


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_form_names(request):
    """Employer: the admin catalog for a state (with the employer's selection) +
    the employer's own forms. POST either selects a catalog form (``formNameId``)
    or creates the employer's own form."""
    from bss_core.models import CustomFormName, EmployerFormSelection
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        if body.get("formNameId") is not None:
            gid = int(body["formNameId"]) if str(body["formNameId"]).strip().isdigit() else 0
            catalog = CustomFormName.objects.filter(id=gid, employer__isnull=True).first()
            if catalog is None:
                return Response({"error": "Catalog form not found."}, status=status.HTTP_404_NOT_FOUND)
            selection, _ = EmployerFormSelection.objects.update_or_create(
                employer=user, form_name=catalog,
                defaults={"is_mandatory": bool(body.get("mandatory", False)),
                          "is_active": bool(body.get("selected", True))})
            return Response({"data": _global_row(catalog, selection)}, status=status.HTTP_200_OK)
        return _create(request, employer=user)

    state = (request.query_params.get("state") or "").strip()
    own = CustomFormName.objects.filter(employer=user, is_active=True)
    catalog = CustomFormName.objects.filter(employer__isnull=True, is_active=True)
    if state:
        own = own.filter(state__iexact=state)
        catalog = catalog.filter(state__iexact=state)
    selections = {s.form_name_id: s for s in
                  EmployerFormSelection.objects.filter(employer=user, form_name__in=catalog)}
    data = [_row(o) for o in own.order_by("sort_order", "name")]
    data += [_global_row(o, selections.get(o.id)) for o in catalog.order_by("sort_order", "name")]
    return Response({"data": data}, status=status.HTTP_200_OK)


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


__all__ = ["admin_form_names", "admin_form_name_detail",
           "employer_form_names", "employer_form_name_detail"]
