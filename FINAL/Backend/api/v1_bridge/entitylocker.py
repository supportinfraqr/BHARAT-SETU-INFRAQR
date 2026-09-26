"""DigiLocker **EntityLocker** business/entity verification.

Start an OAuth2 (PKCE) authorization for a business (contractor/employer) and
complete it on the public callback. The verified organisation details are stored
on :class:`bss_core.models.EntityLockerAuth`. Both endpoints are unauthenticated
because they are part of the *registration* flow (the account does not exist
yet); the pending request is keyed by the OAuth ``state``.

Reference: *Requester – Entity Locker API Specification* v1.0 (Oct 2024).
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .. import entitylocker_client


def _expiry():
    return timezone.now() + timedelta(minutes=settings.ENTITYLOCKER_SESSION_TTL_MIN)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def entitylocker_start(request):
    """Create a pending EntityLocker authorization and return the consent URL.

    Body: ``{"role": "contractor|employer", "idType": "GSTIN|MCA21|PAN",
    "idValue": "…"}``. Each role uses its own registered EntityLocker app."""
    from bss_core.models import EntityLockerAuth
    body = request.data if isinstance(request.data, dict) else {}
    role = str(body.get("role") or "contractor").strip().lower()
    if role not in settings.ENTITYLOCKER_APPS:
        role = "contractor"
    app = settings.ENTITYLOCKER_APPS[role]
    if not app.get("client_id") or not app.get("client_secret"):
        return Response({"error": f"EntityLocker verification is not configured for {role}."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    id_type = str(body.get("idType") or "GSTIN").strip()[:20]
    id_value = str(body.get("idValue") or "").strip()[:60]
    state = secrets.token_urlsafe(24)
    verifier = entitylocker_client.generate_code_verifier()
    EntityLockerAuth.objects.create(
        state=state, code_verifier=verifier, role=role, id_type=id_type,
        id_value=id_value, expires_at=_expiry())
    url = entitylocker_client.build_authorize_url(app, state, verifier, id_type=id_type)
    return Response({"data": {"url": url, "state": state, "role": role}}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def entitylocker_callback(request):
    """Complete the EntityLocker flow: exchange the code and read the entity.

    Accepts ``code`` + ``state`` (query string on the GET redirect, or JSON body).
    Returns the verified entity name and method, or ``verified: false`` + reason."""
    from bss_core.models import EntityLockerAuth
    params = request.data if (request.method == "POST" and isinstance(request.data, dict)) else request.query_params
    code = str(params.get("code") or "").strip()
    state = str(params.get("state") or "").strip()
    error = str(params.get("error") or "").strip()

    auth = EntityLockerAuth.objects.filter(state=state).first()
    if auth is None:
        return Response({"verified": False, "error": "Unknown or expired authorization."},
                        status=status.HTTP_404_NOT_FOUND)
    if error:
        auth.status, auth.error = "FAILED", error[:1000]
        auth.save(update_fields=["status", "error", "updated_at"])
        return Response({"verified": False, "error": error}, status=status.HTTP_200_OK)
    if auth.is_expired:
        auth.status = "EXPIRED"
        auth.save(update_fields=["status", "updated_at"])
        return Response({"verified": False, "error": "Authorization expired."},
                        status=status.HTTP_200_OK)
    if not code:
        return Response({"verified": False, "error": "Missing authorization code."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        app = settings.ENTITYLOCKER_APPS.get(auth.role or "contractor", {})
        token = entitylocker_client.exchange_code(app, code, auth.code_verifier)
        entity = entitylocker_client.get_entity(token["access_token"])
    except entitylocker_client.EntityLockerError as exc:
        auth.status, auth.error = "FAILED", str(exc)[:1000]
        auth.save(update_fields=["status", "error", "updated_at"])
        return Response({"verified": False, "error": str(exc)}, status=status.HTTP_200_OK)

    auth.status = "VERIFIED"
    auth.entity_name = str(entity.get("name") or "")[:200]
    auth.entity_locker_id = str(entity.get("entitylockerid") or "")[:120]
    auth.verified_by = str(entity.get("verified_by") or "")[:40]
    auth.doi = str(entity.get("doi") or "")[:40]
    auth.email = str(entity.get("email") or "")[:160]
    auth.mobile = str(entity.get("mobile") or "")[:40]
    auth.save(update_fields=["status", "entity_name", "entity_locker_id", "verified_by",
                             "doi", "email", "mobile", "updated_at"])
    return Response({"verified": True, "data": {
        "entityName": auth.entity_name, "verifiedBy": auth.verified_by,
        "entityLockerId": auth.entity_locker_id, "role": auth.role,
        "idType": auth.id_type, "idValue": auth.id_value,
        "doi": auth.doi, "email": auth.email, "mobile": auth.mobile,
    }}, status=status.HTTP_200_OK)


__all__ = ["entitylocker_start", "entitylocker_callback"]
