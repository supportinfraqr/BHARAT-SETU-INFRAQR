"""Role portal payload endpoints, notifications, identity verify and admin views."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403
from .auth import *  # noqa: F401,F403
from .benefits import *  # noqa: F401,F403
from .courses import *  # noqa: F401,F403
from .documents import *  # noqa: F401,F403
from .grievances import *  # noqa: F401,F403
from .misc import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .leave import *  # noqa: F401,F403
from .sites import *  # noqa: F401,F403
from .submissions import *  # noqa: F401,F403
from .mutations import *  # noqa: F401,F403


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_portal(request):
    return Response(payloads.build_worker_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_portal(request):
    return Response(payloads.build_contractor_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_portal(request):
    return Response(payloads.build_employer_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def government_portal(request):
    return Response(payloads.build_government_portal(), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_operations(request):
    return Response(payloads.build_operations("BSS Admin"), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_operations(request):
    return Response(payloads.build_operations("BSS Staff"), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_actions(request):
    body = request.data or {}
    action = body.get("action") or "run"
    return Response({
        "success": True,
        "message": "Action completed",
        "output": [],
        "completedAt": payloads._dts(timezone.now()),
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_actions(request):
    body = request.data or {}
    action = body.get("action") or "run"
    return Response({
        "success": True,
        "message": "Action completed",
        "output": [],
        "completedAt": payloads._dts(timezone.now()),
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def geography(request):
    pin = request.query_params.get("pin")
    if pin:
        loc = payloads.geography_lookup(pin)
        if not loc:
            return Response({"error": "PIN not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": loc}, status=status.HTTP_200_OK)
    return Response({"data": payloads.government_geography()}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([AllowAny])
def identity_verify(request, bss_id):
    # Optional session: when the caller is signed in and bound to the worker,
    # the payload includes the extensive post-binding record.
    viewer = request.user if getattr(request.user, "is_authenticated", False) else None
    data = payloads.build_identity_verify(bss_id, viewer)
    if data is None:
        return Response({"error": "Unknown identity"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"data": data, "verifiedAt": payloads._dts(
        timezone.now())},
        status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def notifications(request, role_path):
    user = request.user
    if request.method == "GET":
        return Response(payloads.build_notifications(user), status=status.HTTP_200_OK)

    body = request.data or {}
    notif_id = body.get("id")
    action = body.get("action")
    if not notif_id:
        return Response({"error": "id is required"}, status=status.HTTP_400_BAD_REQUEST)
    if action not in ("read", "unread", "resolve"):
        return Response({"error": "invalid action"}, status=status.HTTP_400_BAD_REQUEST)
    # The feed mixes persisted Notification rows (numeric id, optionally "db-<id>")
    # with derived live-feed items whose ids are synthetic strings such as
    # "wc-binding-12" or "rozgar-5". The shared mutation handler knows how to
    # persist read state for both (model rows; derived items in
    # UserPreference.notification_prefs) and never coerces a non-numeric id to the
    # PK — doing that here raised an uncaught ValueError -> HTTP 500.
    try:
        resolved_id = _persist_mutation(user, role_path, "notifications", "PATCH", body)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    return Response({"success": True, "data": {"id": resolved_id, "action": action}},
                    status=status.HTTP_200_OK)


@api_view(["POST", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mutate_portal(request, role_path, resource):
    user = request.user
    body = request.data or {}
    try:
        result = _persist_mutation(user, role_path, resource, request.method, body)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)

    if request.method == "DELETE":
        return Response({"success": True, "deleted": True, "id": result},
                        status=status.HTTP_200_OK)

    if isinstance(result, (dict, list)):
        # Handler returned fully-serialised record(s) (leave, gate passes) — pass through.
        return Response({"success": True, "data": result, "updatedAt": payloads._dts(timezone.now())},
                        status=status.HTTP_200_OK)

    out = dict(body or {})
    out["id"] = result
    updated_at = payloads._dts(timezone.now())
    return Response({"success": True, "data": out, "updatedAt": updated_at},
                    status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_payroll(request):
    if request.user.role not in ("bss_admin", "bss_staff", "government", "admin"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    return Response(payloads.build_admin_payroll(request.user), status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def document_templates(request):
    """Durable storage for the document-engine template records of one owner.

    GET  ?ownerType=&ownerId=   -> {"data": {"records": [...]}}
    POST {ownerType, ownerId, records: [...]} -> replaces that owner's records.
    """
    from bss_core.models import DocumentTemplateStore
    if request.method == "GET":
        owner_type = (request.query_params.get("ownerType") or "").strip().lower()
        owner_id = (request.query_params.get("ownerId") or "").strip()
        if not owner_type or not owner_id:
            return Response({"error": "ownerType and ownerId are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        row = DocumentTemplateStore.objects.filter(
            owner_type=owner_type, owner_id=owner_id).first()
        return Response({"data": {"records": row.records if row else []}},
                        status=status.HTTP_200_OK)

    body = request.data or {}
    owner_type = str(body.get("ownerType") or "").strip().lower()
    owner_id = str(body.get("ownerId") or "").strip()
    records = body.get("records")
    if not owner_type or not owner_id or not isinstance(records, list):
        return Response({"error": "ownerType, ownerId and records[] are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    row, _ = DocumentTemplateStore.objects.update_or_create(
        owner_type=owner_type, owner_id=owner_id, defaults={"records": records})
    return Response({"data": {"records": row.records}}, status=status.HTTP_200_OK)


__all__ = [
    "admin_actions",
    "admin_operations",
    "admin_payroll",
    "bss_staff_actions",
    "bss_staff_operations",
    "contractor_portal",
    "document_templates",
    "employer_portal",
    "geography",
    "government_portal",
    "identity_verify",
    "mutate_portal",
    "notifications",
    "worker_portal",
]
