"""BSS Admin — account status switches.

There are exactly two switches per user:

* ``account_active`` — the admin-approval switch. Default ON for workers;
  contractors & employers start OFF (Pending) until the admin turns it ON.
  Turning it ON approves the organisation AND clears its portal verification
  gate; turning it OFF returns it to Pending and re-blocks the portal. A GSTIN
  may be active on only one account (enforced here and in the GST flow).
* ``is_active`` — the "login allowed / disable account" switch. Changing it is a
  high-privilege action gated by a system password (env ``BSS_SYSTEM_PASSWORD``).

Route: GET /v1/admin/accounts, POST /v1/admin/accounts/status.
"""

# ruff: noqa: F401,F403
import os

from .common import *  # noqa: F401,F403


def _admin_only(request):
    return getattr(request.user, "role", "") in ("bss_admin", "bss_staff")


def _system_password():
    return os.environ.get("BSS_SYSTEM_PASSWORD") or "bss-system-2026"


def _profile(user):
    return (getattr(user, "contractor_profile", None)
            or getattr(user, "employer_profile", None))


def _account_row(user):
    prof = _profile(user)
    role = user.role
    if role == "contractor":
        name = getattr(prof, "contractor_name", "") or ""
    elif role == "employer":
        name = getattr(prof, "employer_name", "") or ""
    else:
        wi = getattr(user, "worker_identity", None)
        name = getattr(wi, "name", "") or ""
    return {
        "userId": user.id, "username": user.username, "role": role,
        "name": name or getattr(user, "full_name", "") or user.username,
        "gstin": (getattr(prof, "gstin", "") or "") if prof else "",
        "approval": (getattr(prof, "approval_status", "") or "") if prof else "",
        "accountActive": bool(user.account_active),
        "loginActive": bool(user.is_active),
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_accounts(request):
    """Every account with its two switch states."""
    from bss_core.models import User
    if not _admin_only(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    role = str(request.query_params.get("role") or "").strip()
    qs = User.objects.all().order_by("role", "username")
    if role:
        qs = qs.filter(role=role)
    return Response({"data": [_account_row(u) for u in qs]}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_account_status(request):
    """Flip one switch: {userId, field:'account'|'login', value:bool, password?}."""
    from bss_core.models import User
    from .gst import active_gstin_holder, gstin_conflict_message
    if not _admin_only(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    user = User.objects.filter(pk=body.get("userId")).first()
    if user is None:
        return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
    field = str(body.get("field") or "").strip()
    value = bool(body.get("value"))

    if field == "account":
        # The single admin-approval switch. Turning it ON approves the
        # employer/contractor account *and* clears the portal verification gate
        # (the org can use the portal); turning it OFF returns them to Pending
        # and re-blocks it. Turning it ON must not put a second active account
        # on the same GSTIN.
        prof = _profile(user)
        gstin = (getattr(prof, "gstin", "") or "") if prof else ""
        if value and gstin:
            clash = active_gstin_holder(gstin, exclude_user_id=user.id)
            if clash is not None:
                return Response({"error": gstin_conflict_message(clash)},
                                status=status.HTTP_409_CONFLICT)
        user.account_active = value
        fields = ["account_active"]
        if prof is not None:
            # Keep the profile approval + identity-verification state in step
            # with the switch, so this one control is the whole story.
            if value:
                prof.approval_status = "APPROVED"
                prof.manual_verification_status = "VERIFIED"
            else:
                if getattr(prof, "approval_status", "") == "APPROVED":
                    prof.approval_status = "PENDING"
                if getattr(prof, "manual_verification_status", "") == "VERIFIED":
                    prof.manual_verification_status = "PENDING"
            prof.save(update_fields=["approval_status", "manual_verification_status"])
        user.save(update_fields=fields)
        return Response({"data": {"userId": user.id, "accountActive": value}},
                        status=status.HTTP_200_OK)

    if field == "login":
        # High-privilege: requires the system password.
        if str(body.get("password") or "") != _system_password():
            return Response({"error": "Invalid system password."},
                            status=status.HTTP_403_FORBIDDEN)
        user.is_active = value
        fields = ["is_active"]
        if not value:
            # Kill the live session immediately.
            user.current_session_id = ""
            fields.append("current_session_id")
        user.save(update_fields=fields)
        return Response({"data": {"userId": user.id, "loginActive": value}},
                        status=status.HTTP_200_OK)

    return Response({"error": "field must be 'account' or 'login'."},
                    status=status.HTTP_400_BAD_REQUEST)


__all__ = ["admin_accounts", "admin_account_status"]
