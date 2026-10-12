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


def _bss_id(user):
    """The entity's BSS ID: worker id, contractor code or employer code."""
    role = getattr(user, "role", "")
    if role == "worker":
        wi = getattr(user, "worker_identity", None)
        return getattr(wi, "bss_worker_id", "") or ""
    prof = _profile_for(user)
    if role == "contractor":
        return (getattr(prof, "contractor_code", "") or "") if prof else ""
    if role == "employer":
        return (getattr(prof, "employer_code", "") or "") if prof else ""
    return ""


def _entitylocker_verified(user):
    from bss_core.models import EntityLockerAuth

    return EntityLockerAuth.objects.filter(user=user, status="VERIFIED").exists()


def _entity_has_gst(profile) -> bool:
    """True once the entity has a GSTIN — set when GST is entered/verified.

    A GSTIN carries the entity's PAN (characters 3–12), so a GST-registered
    entity no longer needs to submit Aadhaar."""
    gstin = str(getattr(profile, "gstin", "") or "").strip()
    status = str(getattr(profile, "gst_verification_status", "") or "").upper()
    return bool(gstin) or status == "VERIFIED"


def _entity_expected_pan(profile) -> str:
    """The PAN a PAN-card OCR must match: the GSTIN's embedded PAN when known,
    else the profile's recorded PAN."""
    gstin = str(getattr(profile, "gstin", "") or "").strip().upper()
    if len(gstin) == 15 and gstin[2:12].isalnum():
        return gstin[2:12]
    return str(getattr(profile, "pan_no", "") or "").strip().upper()


def _entity_docs_missing(profile, user) -> list:
    """Documents still required before a manual submission is allowed.

    Rules: a **PAN card or an incorporation certificate** is always required;
    **Aadhaar** is required only when the entity has no GST (a GSTIN already
    carries the PAN). At least 2 documents in total."""
    from bss_core.models import EntityVerificationDocument

    docs = list(EntityVerificationDocument.objects.filter(user=user))
    types = {d.doc_type for d in docs}
    missing = []
    if not (("PAN" in types) or ("INCORPORATION" in types)):
        missing.append("a PAN card or incorporation certificate")
    if not _entity_has_gst(profile) and "AADHAAR" not in types:
        missing.append("Aadhaar")
    if len(docs) < 2:
        missing.append("at least 2 documents")
    return missing


def _documents(user):
    from bss_core.models import EntityVerificationDocument

    return [
        {"id": d.id, "docType": d.doc_type, "note": d.note,
         "uploadedAt": payloads._dts(d.uploaded_at),
         "fileName": (d.file.name or "").split("/")[-1],
         "ocrVerified": bool(d.ocr_verified), "ocrNote": d.ocr_note,
         "detectedType": d.detected_type,
         "ocrText": (d.ocr_text or "")[:1500]}
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


_ENTITY_OCR_MAP = {"PAN": "pan", "AADHAAR": "aadhaar"}


def _ocr_entity_document(doc_type, raw, filename, expected_pan=""):
    """OCR a registration document and type-verify it against the chosen slot.

    Returns ``(ocr_text, detected_type, verified, note)``. Never raises — OCR
    must not block a registration upload. For a PAN card the OCR'd PAN is also
    matched against ``expected_pan`` (the GSTIN's embedded PAN when known)."""
    from .. import ocr_client
    try:
        text = ocr_client.extract_text(raw, filename) or ""
    except Exception:  # noqa: BLE001
        return "", "", False, "OCR unavailable"
    try:
        detected = ocr_client.detect_document_type(text) or ""
    except Exception:  # noqa: BLE001
        detected = ""
    key = _ENTITY_OCR_MAP.get(doc_type)
    if not key:
        return text, detected, False, "OCR text captured"
    try:
        expected = expected_pan if key == "pan" else ""
        ok, message = ocr_client.verify_document_text(key, text, expected_number=expected)
    except Exception:  # noqa: BLE001
        return text, detected, False, "OCR text captured"
    return text, detected, ok, message


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_check_document(request):
    """OCR a single registration document at upload time and verify it against the
    chosen slot. Returns ``verified`` (true / false / null=advisory)."""
    from .. import ocr_client

    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors."}, status=status.HTTP_403_FORBIDDEN)
    upload = request.FILES.get("file")
    if upload is None:
        return Response({"error": "Choose a file."}, status=status.HTTP_400_BAD_REQUEST)
    doc_type = str(request.data.get("docType") or "OTHER").strip().upper()
    if doc_type not in _DOC_TYPES:
        doc_type = "OTHER"
    raw = upload.read()
    try:
        text = ocr_client.extract_text(raw, upload.name) or ""
    except Exception:  # noqa: BLE001 — never block on OCR being unavailable
        return Response({"data": {"docType": doc_type, "verified": None, "detectedType": "",
                                  "note": "OCR unavailable", "text": ""}}, status=status.HTTP_200_OK)
    try:
        detected = ocr_client.detect_document_type(text) or ""
    except Exception:  # noqa: BLE001
        detected = ""
    key = _ENTITY_OCR_MAP.get(doc_type)
    if not key:
        # Incorporation / Other: no marker set — just require it to be readable.
        readable = bool(text.strip())
        return Response({"data": {"docType": doc_type, "verified": None, "detectedType": detected,
                                  "note": "Document captured" if readable else "Could not read the document",
                                  "text": text[:600]}}, status=status.HTTP_200_OK)
    # A PAN card must match the GSTIN's embedded PAN (both hold the same PAN).
    expected = _entity_expected_pan(profile) if key == "pan" else ""
    try:
        ok, note = ocr_client.verify_document_text(key, text, expected_number=expected)
    except Exception:  # noqa: BLE001
        ok, note = None, "OCR check unavailable"
    return Response({"data": {"docType": doc_type, "verified": ok, "detectedType": detected,
                              "note": note, "text": text[:600]}}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def verification_manual_submit(request):
    """Upload manual identity documents (PAN, Aadhaar, …) for admin review."""
    from bss_core.models import EntityVerificationDocument

    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors."}, status=status.HTTP_403_FORBIDDEN)

    import re as _re

    expected_pan = _entity_expected_pan(profile)
    saved = 0
    for key, uploaded in request.FILES.items():
        doc_type = key.split("_", 1)[1].upper() if key.startswith("file_") else "OTHER"
        if doc_type not in _DOC_TYPES:
            doc_type = "OTHER"
        # OCR the uploaded document (extract text + verify it matches the slot).
        raw = uploaded.read()
        uploaded.seek(0)
        text, detected, ok, note = _ocr_entity_document(doc_type, raw, uploaded.name, expected_pan)
        EntityVerificationDocument.objects.create(
            user=request.user, doc_type=doc_type, file=uploaded,
            ocr_text=text[:20000], detected_type=detected[:20], ocr_verified=ok, ocr_note=note[:255])
        # Register the PAN number on the profile when OCR reads one and the
        # profile has none yet.
        if doc_type == "PAN" and not (getattr(profile, "pan_no", "") or ""):
            found = _re.search(r"[A-Z]{5}\d{4}[A-Z]", (text or "").upper())
            if found:
                profile.pan_no = found.group(0)
                profile.save(update_fields=["pan_no"])
        saved += 1
    missing = _entity_docs_missing(profile, request.user)
    if missing:
        return Response({"error": f"Upload {', '.join(missing)} before submitting for verification."},
                        status=status.HTTP_400_BAD_REQUEST)

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
    """Every employer/contractor awaiting Admin Approval (the single channel).

    Lists all accounts whose Admin Approval switch is off, regardless of their
    verification progress. The stage is informational so the admin knows what
    the entity still has to do before approval."""
    from bss_core.models import ContractorProfile, EmployerProfile

    if not _admin_only(request):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    rows = []
    for model, role in ((EmployerProfile, "employer"), (ContractorProfile, "contractor")):
        # Admin Approval off == pending admin approval. No other filtering.
        for profile in model.objects.filter(user__account_active=False).select_related("user"):
            user = profile.user
            manual = profile.manual_verification_status or "NOT_SUBMITTED"
            gst_status = str(
                getattr(profile, "gst_verification_status", "") or "PENDING").upper()
            gst_not_applicable = gst_status == "NOT_APPLICABLE"
            if manual in ("PENDING", "VERIFIED"):
                stage = "PENDING"           # ready to review — only Admin Approval left
            elif gst_status not in ("VERIFIED", "NOT_APPLICABLE"):
                stage = "AWAITING_GST"
            else:
                # EntityLocker is disabled — every GST-cleared entity submits
                # documents next.
                stage = "AWAITING_DOCUMENTS"
            rows.append({
                "userId": profile.user_id, "role": role,
                "name": (profile.employer_name if role == "employer" else profile.contractor_name) or user.username,
                "username": user.username,
                "bssId": _bss_id(user),
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
        # Admin Approval on. A GSTIN may be held by only one account — conflict
        # if another account already holds it (either switch on).
        from .gst import active_gstin_holder, gstin_conflict_message
        clash = active_gstin_holder(profile.gstin, exclude_user_id=profile.user_id)
        if clash is not None:
            return Response({"error": gstin_conflict_message(clash)},
                            status=status.HTTP_409_CONFLICT)
        profile.approval_status = "APPROVED"
        fields.append("approval_status")
        user = profile.user
        if not user.account_active:
            # Only the Admin Approval switch — never touch is_Active here.
            user.account_active = True
            user.save(update_fields=["account_active"])
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
    "verification_check_document",
]
