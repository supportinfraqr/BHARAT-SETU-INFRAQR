"""Employer-created staff sub-accounts (Medical / H&S / Security / Compliance officers).

The employer creates a staff account with a phone number + MPIN (no OTP). The
staff logs in through the Employer portal on that phone/MPIN and is scoped to the
employer; permissions decide which workspaces/endpoints are allowed. Only the
employer can set/reset the MPIN or change permissions.
"""

import re
import uuid

from django.contrib.auth.hashers import make_password
from django.db import transaction

from bss_core.models import EmployerStaffMember, User, UserCredential

from .admin_console import log_audit
from .common import *

PERMISSIONS = [
    {"key": "medical", "label": "Medical Officer"},
    {"key": "safety", "label": "Health & Safety Officer"},
    {"key": "gate_pass", "label": "Security Officer"},
    {"key": "compliance", "label": "Compliance Officer"},
]
_PERM_KEYS = {p["key"] for p in PERMISSIONS}


def _require_owner(request):
    if request.user.role != "employer" or _staff_permissions(request) is not None:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Only the employer can manage staff accounts.")


def _staff_row(m):
    user = m.user
    cred = (UserCredential.objects.filter(user=user, identity_type="mobile")
            .order_by("-is_primary", "id").first())
    return {
        "id": m.id,
        "userId": user.id,
        "name": payloads._d(user.full_name or user.username),
        "phone": payloads._d(cred.identity_value if cred else ""),
        "title": payloads._d(m.title),
        "permissions": list(m.permissions or []),
        "active": bool(m.is_active and user.is_active),
        "createdAt": payloads._dts(m.created_at),
    }


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_staff(request):
    _require_owner(request)
    if request.method == "GET":
        rows = [_staff_row(m) for m in
                EmployerStaffMember.objects.filter(employer=request.user)
                .select_related("user").order_by("id")]
        return Response({"rows": rows, "permissions": PERMISSIONS}, status=status.HTTP_200_OK)

    body = request.data or {}
    name = str(body.get("name") or "").strip()[:120]
    phone = _normalize_mobile(body.get("phone") or body.get("mobile"))
    mpin = str(body.get("mpin") or "").strip()
    title = str(body.get("title") or "").strip()[:120]
    perms = [p for p in (body.get("permissions") or []) if p in _PERM_KEYS]
    if not name:
        return Response({"error": "Enter the staff member's name."}, status=status.HTTP_400_BAD_REQUEST)
    if not phone:
        return Response({"error": "Enter a valid 10-digit mobile number."}, status=status.HTTP_400_BAD_REQUEST)
    if not re.fullmatch(r"\d{4,6}", mpin):
        return Response({"error": "MPIN must be 4-6 digits."}, status=status.HTTP_400_BAD_REQUEST)
    if not perms:
        return Response({"error": "Select at least one permission."}, status=status.HTTP_400_BAD_REQUEST)

    existing = (UserCredential.objects.filter(identity_type="mobile", identity_value=phone)
                .select_related("user").first())
    if existing is not None:
        if existing.user.role != "employer_staff":
            return Response({"error": "This mobile is already registered to another account."},
                            status=status.HTTP_409_CONFLICT)
        if EmployerStaffMember.objects.filter(user=existing.user).exists():
            return Response({"error": "This mobile is already registered as staff for an employer."},
                            status=status.HTTP_409_CONFLICT)

    username = f"staff_{phone}"
    if User.objects.filter(username=username).exists():
        username = f"{username}_{uuid.uuid4().hex[:4]}"
    with transaction.atomic():
        user = User.objects.create_user(username=username, password=None,
                                        role="employer_staff", full_name=name,
                                        account_active=True, is_verified=True, is_active=True)
        user.set_unusable_password()
        user.save(update_fields=["password"])
        if existing is not None:
            cred = existing
            cred.user = user
        else:
            cred = UserCredential(user=user, identity_type="mobile", identity_value=phone)
        cred.is_primary = True
        cred.verified = True
        cred.mpin_hash = make_password(mpin)
        cred.save()
        member = EmployerStaffMember.objects.create(
            user=user, employer=request.user, permissions=perms, title=title,
            created_by=request.user)
        log_audit(request.user, "CREATE", "employer_staff", member.id,
                  after={"summary": f"Created staff {name} ({', '.join(perms)})"})
    return Response({"data": _staff_row(member)}, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_staff_detail(request, staff_id):
    _require_owner(request)
    member = (EmployerStaffMember.objects.filter(pk=staff_id, employer=request.user)
              .select_related("user").first())
    if member is None:
        return Response({"error": "Staff account not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        member.is_active = False
        member.save(update_fields=["is_active", "updated_at"])
        member.user.is_active = False
        member.user.save(update_fields=["is_active"])
        log_audit(request.user, "UPDATE", "employer_staff", member.id,
                  after={"summary": "Deactivated staff account"})
        return Response({"success": True, "id": member.id}, status=status.HTTP_200_OK)

    body = request.data or {}
    if "permissions" in body:
        perms = [p for p in (body.get("permissions") or []) if p in _PERM_KEYS]
        if not perms:
            return Response({"error": "Select at least one permission."}, status=status.HTTP_400_BAD_REQUEST)
        member.permissions = perms
    if body.get("title") is not None:
        member.title = str(body.get("title") or "").strip()[:120]
    if body.get("name"):
        member.user.full_name = str(body.get("name")).strip()[:120]
        member.user.save(update_fields=["full_name"])
    if body.get("active") is not None:
        member.is_active = bool(body.get("active"))
        member.user.is_active = member.is_active
        member.user.save(update_fields=["is_active"])
    member.save()
    log_audit(request.user, "UPDATE", "employer_staff", member.id,
              after={"summary": "Updated staff account"})
    return Response({"data": _staff_row(member)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_staff_mpin(request, staff_id):
    """Employer-only: set/reset a staff member's MPIN."""
    _require_owner(request)
    member = (EmployerStaffMember.objects.filter(pk=staff_id, employer=request.user)
              .select_related("user").first())
    if member is None:
        return Response({"error": "Staff account not found."}, status=status.HTTP_404_NOT_FOUND)
    mpin = str((request.data or {}).get("mpin") or "").strip()
    if not re.fullmatch(r"\d{4,6}", mpin):
        return Response({"error": "MPIN must be 4-6 digits."}, status=status.HTTP_400_BAD_REQUEST)
    cred = (UserCredential.objects.filter(user=member.user, identity_type="mobile")
            .order_by("-is_primary", "id").first())
    if cred is None:
        return Response({"error": "This staff account has no mobile credential."},
                        status=status.HTTP_400_BAD_REQUEST)
    cred.mpin_hash = make_password(mpin)
    cred.verified = True
    cred.save(update_fields=["mpin_hash", "verified"])
    log_audit(request.user, "UPDATE", "employer_staff", member.id,
              after={"summary": "Reset staff MPIN"})
    return Response({"success": True, "id": member.id}, status=status.HTTP_200_OK)


__all__ = ["employer_staff", "employer_staff_detail", "employer_staff_mpin", "PERMISSIONS"]
