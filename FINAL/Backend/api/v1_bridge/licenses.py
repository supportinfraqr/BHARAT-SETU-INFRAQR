"""Party licence self-service — the applicable contractor/employer is prompted to
upload the licence copies defined in the License master (``applies_to``)."""

# ruff: noqa: F401,F403
from .common import *

_LIC_ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png"}
_LIC_MAX_BYTES = 10 * 1024 * 1024
_LIC_ROLES = {"contractor", "employer"}


def _license_applies_to(license_obj, role):
    applies = str(license_obj.applies_to or "Both").strip().lower()
    return applies in ("both", role)


def _license_record_payload(rec):
    if rec is None:
        return None
    return {
        "id": rec.id,
        "licenseNumber": rec.license_number or "",
        "validFrom": rec.valid_from.isoformat() if rec.valid_from else "",
        "validTo": rec.valid_to.isoformat() if rec.valid_to else "",
        "fileName": rec.file_name or "",
        "status": rec.status,
        "note": rec.note or "",
        "uploadedAt": rec.uploaded_at.date().isoformat() if rec.uploaded_at else "",
        "url": f"/api/party-licenses/{rec.id}/file" if rec.file else "",
    }


def _licenses_payload(user):
    from bss_core.models import LicenseMaster, PartyLicense

    records = {r.license_id: r for r in PartyLicense.objects.filter(user=user)}
    items = []
    for lic in LicenseMaster.objects.filter(is_active=True).order_by("license_name", "state"):
        if not _license_applies_to(lic, user.role):
            continue
        details = lic.details or {}
        items.append({
            "id": lic.id,
            "name": lic.license_name,
            "state": lic.state,
            "appliesTo": lic.applies_to or "Both",
            "govtFee": str(lic.government_fee) if lic.government_fee is not None else "",
            "securityDeposit": str(lic.security_deposit) if lic.security_deposit is not None else "",
            "minWageApplicability": details.get("minWageApplicability", ""),
            "bonusPayoutMonth": details.get("bonusPayoutMonth", ""),
            "effectiveFrom": details.get("effectiveFrom", ""),
            "effectiveTo": details.get("effectiveTo", ""),
            "record": _license_record_payload(records.get(lic.id)),
        })
    return items


def _licenses_response(user):
    items = _licenses_payload(user)
    pending = sum(1 for it in items if not (it["record"] and it["record"]["fileName"]))
    return {"licenses": items, "total": len(items), "pending": pending, "role": user.role}


def _store_party_license(user, body, upload):
    from bss_core.models import LicenseMaster, PartyLicense

    license_id = str(body.get("licenseId") or "").strip()
    lic = (LicenseMaster.objects.filter(pk=license_id, is_active=True).first()
           if license_id.isdigit() else None)
    if lic is None or not _license_applies_to(lic, user.role):
        raise PortalMutationError("This licence is not applicable to you.", 404)

    rec, _created = PartyLicense.objects.get_or_create(user=user, license=lic)
    if body.get("licenseNumber") is not None:
        rec.license_number = str(body.get("licenseNumber") or "")[:120]
    if body.get("validFrom"):
        rec.valid_from = _parse_iso_date(body.get("validFrom"))
    if body.get("validTo"):
        rec.valid_to = _parse_iso_date(body.get("validTo"))

    if upload is not None:
        if getattr(upload, "size", 0) > _LIC_MAX_BYTES:
            raise PortalMutationError("The licence must be 10 MB or smaller.", 413)
        head = upload.read(8)
        upload.seek(0)
        mime = (getattr(upload, "content_type", "") or "").lower()
        ok = (head[:5] == b"%PDF-" or head[:3] == b"\xff\xd8\xff"
              or head[:8] == b"\x89PNG\r\n\x1a\n")
        if not ok or mime not in _LIC_ALLOWED_MIME:
            raise PortalMutationError("Only PDF, JPEG or PNG files are accepted.", 415)
        rec.file = upload
        rec.file_name = (getattr(upload, "name", "") or "licence")[:255]
        rec.status = "UPLOADED"
        rec.note = ""
    if not rec.file:
        raise PortalMutationError("Attach the licence document.", 400)
    rec.save()
    return rec


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_licenses(request):
    if request.user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"data": _licenses_response(request.user)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_licenses(request):
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"data": _licenses_response(request.user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def party_license_upload(request):
    user = request.user
    if user.role not in _LIC_ROLES:
        return Response({"error": "Only contractors and employers can upload licences."},
                        status=status.HTTP_403_FORBIDDEN)
    _store_party_license(user, request.data, request.FILES.get("file"))
    return Response({"data": _licenses_response(user)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def party_license_file(request, license_record_id):
    from bss_core.models import PartyLicense

    rec = PartyLicense.objects.filter(pk=license_record_id).select_related("user").first()
    if rec is None or not rec.file:
        return Response({"error": "Licence not found."}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if user.id != rec.user_id and user.role not in ("bss_admin", "bss_staff", "government", "admin"):
        return Response({"error": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
    return FileResponse(rec.file.open("rb"), as_attachment=False,
                        filename=rec.file_name or "licence")


__all__ = [
    "contractor_licenses", "employer_licenses", "party_license_upload", "party_license_file",
]
