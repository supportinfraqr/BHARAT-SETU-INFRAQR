"""Post-GST identity verification: EntityLocker, or manual documents.

After GST is verified, an employer/contractor must answer whether it is on
EntityLocker (Meri Pehchaan):

* **Yes** -> the EntityLocker OAuth flow (``entitylocker.py``) verifies it.
* **No**  -> the entity confirms, then uploads manual documents (PAN, Aadhaar,
  incorporation certificate, …) which a BSS Admin reviews.
"""
from django.http import FileResponse

from .common import *  # noqa: F401,F403

_DOC_TYPES = {"PAN", "AADHAAR", "INCORPORATION", "OTHER"}

_MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def _profile_for(user):
    from bss_core.models import ContractorProfile, EmployerProfile

    if user.role == "contractor":
        return ContractorProfile.objects.filter(user=user).first()
    if user.role == "employer":
        return EmployerProfile.objects.filter(user=user).first()
    return None


def _entitylocker_verified(user):
    from bss_core.models import EntityLockerAuth

    return EntityLockerAuth.objects.filter(user=user, status="VERIFIED").exists()


def _documents(user):
    from bss_core.models import EntityVerificationDocument

    return [
        {"id": d.id, "docType": d.doc_type, "note": d.note,
         "uploadedAt": payloads._dts(d.uploaded_at),
         "fileName": (d.file.name or "").split("/")[-1]}
        for d in EntityVerificationDocument.objects.filter(user=user).order_by("id")
    ]


def _state(profile, user):
    return {
        # The portal gate follows the single Admin Approval switch
        # (``account_active``), not the verification snapshot.
        "approved": bool(getattr(user, "account_active", False)),
        "gstVerified": str(getattr(profile, "gst_verification_status", "") or "").upper() == "VERIFIED",
        "gstStatus": str(getattr(profile, "gst_verification_status", "") or "PENDING").upper(),
        "entityLocker": {
            "verified": _entitylocker_verified(user),
            "declined": bool(getattr(profile, "entity_locker_declined", False)),
        },
        "manual": {
            "status": (getattr(profile, "manual_verification_status", "") or "NOT_SUBMITTED"),
            "note": (getattr(profile, "manual_verification_note", "") or ""),
            "documents": _documents(user),
        },
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_status(request):
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"data": {"applicable": False}}, status=status.HTTP_200_OK)
    return Response({"data": {"applicable": True, **_state(profile, request.user)}},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_decline_entitylocker(request):
    """The entity confirms it is NOT on EntityLocker -> manual verification."""
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    if str(body.get("confirm") or "").strip().lower() not in ("1", "true", "yes", "on"):
        return Response({"error": "Please confirm you are not on EntityLocker."},
                        status=status.HTTP_400_BAD_REQUEST)
    profile.entity_locker_declined = True
    fields = ["entity_locker_declined"]
    if (getattr(profile, "manual_verification_status", "") or "") == "REJECTED":
        # Fresh start after a rejection.
        profile.manual_verification_status = "NOT_SUBMITTED"
        profile.manual_verification_note = ""
        fields += ["manual_verification_status", "manual_verification_note"]
    profile.save(update_fields=fields)
    return Response({"data": _state(profile, request.user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_manual_submit(request):
    """Upload manual identity documents (PAN, Aadhaar, …) for admin review."""
    from bss_core.models import EntityVerificationDocument

    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors."}, status=status.HTTP_403_FORBIDDEN)
    # Contractors who declared "no GST" go straight to document submission
    # (GST is optional for them) so they never answer the EntityLocker question.
    gst_not_applicable = str(
        getattr(profile, "gst_verification_status", "") or "").upper() == "NOT_APPLICABLE"
    if not getattr(profile, "entity_locker_declined", False) and not gst_not_applicable:
        return Response({"error": "Answer the EntityLocker question first."},
                        status=status.HTTP_400_BAD_REQUEST)

    saved = 0
    for key, uploaded in request.FILES.items():
        doc_type = key.split("_", 1)[1].upper() if key.startswith("file_") else "OTHER"
        if doc_type not in _DOC_TYPES:
            doc_type = "OTHER"
        EntityVerificationDocument.objects.create(user=request.user, doc_type=doc_type, file=uploaded)
        saved += 1
    if saved == 0 and not EntityVerificationDocument.objects.filter(user=request.user).exists():
        return Response({"error": "Upload at least one document."}, status=status.HTTP_400_BAD_REQUEST)

    profile.manual_verification_status = "PENDING"
    profile.manual_verification_note = ""
    profile.save(update_fields=["manual_verification_status", "manual_verification_note"])
    return Response({"data": _state(profile, request.user)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_document(request, document_id):
    """Download a manual verification document (owner or BSS admin/staff)."""
    from bss_core.models import EntityVerificationDocument

    doc = EntityVerificationDocument.objects.filter(id=document_id).first()
    if doc is None or not doc.file:
        return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
    if doc.user_id != request.user.id and request.user.role not in ("bss_admin", "bss_staff"):
        return Response({"error": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
    # Preserve the stored file's real name/extension so the browser previews or
    # saves it as the actual document (PDF/JPEG/PNG) instead of a nameless blob.
    stored = os.path.basename(doc.file.name or "")
    ext = os.path.splitext(stored)[1].lower()
    filename = stored or f"{doc.doc_type}-{document_id}{ext}"
    response = FileResponse(doc.file.open("rb"), as_attachment=False, filename=filename)
    response["Content-Type"] = _MIME_BY_EXT.get(ext, "application/octet-stream")
    response["X-Content-Type-Options"] = "nosniff"
    return response


# --------------------------------------------------------------------------- admin
def _admin_only(request):
    return request.user.role in ("bss_admin", "bss_staff")


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_verification_queue(request):
    """GST-verified employers/contractors that are not yet identity-verified.

    Each row carries its stage so the admin knows whether it is awaiting the
    EntityLocker answer, awaiting documents, or ready to review."""
    from bss_core.models import ContractorProfile, EmployerProfile

    if not _admin_only(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    rows = []
    for model, role in ((EmployerProfile, "employer"), (ContractorProfile, "contractor")):
        # Include contractors who declared "no GST" — their GST fields are NA
        # and require no admin input at approval.
        for profile in model.objects.filter(
                gst_verification_status__in=("VERIFIED", "NOT_APPLICABLE")).select_related("user"):
            user = profile.user
            el_verified = _entitylocker_verified(user)
            manual = profile.manual_verification_status or "NOT_SUBMITTED"
            if el_verified or manual == "VERIFIED":
                continue  # already verified
            gst_not_applicable = str(
                getattr(profile, "gst_verification_status", "") or "").upper() == "NOT_APPLICABLE"
            if manual == "PENDING":
                stage = "PENDING"           # documents submitted, admin review due
            elif profile.entity_locker_declined or gst_not_applicable:
                stage = "AWAITING_DOCUMENTS"
            else:
                stage = "AWAITING_ENTITYLOCKER"
            rows.append({
                "userId": profile.user_id, "role": role,
                "name": (profile.employer_name if role == "employer" else profile.contractor_name) or user.username,
                "username": user.username,
                "gstin": profile.gstin or "", "legalName": profile.gst_legal_name or "",
                "gstNotApplicable": gst_not_applicable,
                "stage": stage, "manualStatus": manual,
                "declined": bool(profile.entity_locker_declined),
                "documents": _documents(user),
            })
    rows.sort(key=lambda r: (r["stage"] != "PENDING", r["name"] or ""))
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_verification_review(request):
    """Approve or reject a manual verification."""
    from bss_core.models import ContractorProfile, EmployerProfile

    if not _admin_only(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    role = str(body.get("role") or "").strip().lower()
    decision = str(body.get("status") or "").strip().upper()
    if decision not in ("VERIFIED", "REJECTED"):
        return Response({"error": "status must be VERIFIED or REJECTED."}, status=status.HTTP_400_BAD_REQUEST)
    model = EmployerProfile if role == "employer" else ContractorProfile if role == "contractor" else None
    if model is None:
        return Response({"error": "role must be employer or contractor."}, status=status.HTTP_400_BAD_REQUEST)
    profile = model.objects.filter(user_id=body.get("userId")).first()
    if profile is None:
        return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)
    profile.manual_verification_status = decision
    profile.manual_verification_note = str(body.get("note") or "")[:255]
    fields = ["manual_verification_status", "manual_verification_note"]
    # Optional GST / registration details for GST-verified profiles only.
    # No-GST firms are left as Not applicable — the frontend never sends these.
    for field, key, limit in (("gstin", "gstin", 20), ("gst_legal_name", "gstLegalName", 200),
                              ("gst_trade_name", "gstTradeName", 200),
                              ("gst_constitution", "gstConstitution", 120),
                              ("gst_registration_date", "gstRegistrationDate", 20)):
        if body.get(key) is not None:
            setattr(profile, field, str(body.get(key) or "")[:limit])
            fields.append(field)
    if decision == "VERIFIED":
        # Approving the account makes its GSTIN valid — a GSTIN may be held by
        # only one *active* account (contractor or employer).
        from .gst import active_gstin_holder, gstin_conflict_message
        clash = active_gstin_holder(profile.gstin, exclude_user_id=profile.user_id)
        if clash is not None:
            return Response({"error": gstin_conflict_message(clash)},
                            status=status.HTTP_409_CONFLICT)
        # Completing identity verification IS the account approval — no separate
        # admin approval step exists, so reflect it on the profile and activate
        # the account (uniqueness applies to active accounts only).
        profile.approval_status = "APPROVED"
        fields.append("approval_status")
        user = profile.user
        if not user.account_active:
            user.account_active = True
            user.is_active = True
            user.save(update_fields=["account_active", "is_active"])
    if decision == "REJECTED":
        # Send the entity back to the "EntityLocker or manual documents?" choice
        # so they can redo it (they are asked again on their next visit).
        profile.entity_locker_declined = False
        fields.append("entity_locker_declined")
    profile.save(update_fields=fields)
    return Response({"data": {"userId": profile.user_id, "role": role, "status": decision}},
                    status=status.HTTP_200_OK)


__all__ = [
    "verification_status", "verification_decline_entitylocker", "verification_manual_submit",
    "verification_document", "admin_verification_queue", "admin_verification_review",
]
