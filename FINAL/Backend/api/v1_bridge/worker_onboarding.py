"""Contractor-assisted worker onboarding ("Verification Desk").

Many workers do not own a smartphone, so they cannot self-register. This module
lets an authenticated contractor create a worker account on the worker's behalf
and then capture / verify the worker's details (Aadhaar eKYC, PAN, UAN, ESIC,
salary bank account) using the SAME server flows and the SAME models the worker's
own self-service profile uses.

Every write is scoped to a worker the contractor is actually associated with
(a live binding), and all verification reuses the existing bridges:

  * Aadhaar oKYC        -> link_aadhaar_for_worker() (api/v1_bridge/aadhaar.py)
  * Bank penny drop     -> _handle_bank_verify()      (api/v1_bridge/misc.py)
  * PAN / UAN / ESIC    -> WorkerIdentity / WorkerSocialSecurity (validated)
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import (_ensure_id_card_dates, _parse_dob, _sanitize_aadhaar,
                      _send_otp, link_aadhaar_for_worker)
from .bindings import _contractor_default_site
from .misc import _handle_bank_verify

_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

# Verhoeff checksum used by UIDAI Aadhaar numbers.
_VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6), (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8), (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2), (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4), (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
_VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9), (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2), (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0), (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5), (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)


def _aadhaar_checksum_ok(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) != 12:
        return False
    check = 0
    for index, ch in enumerate(reversed(digits)):
        check = _VERHOEFF_D[check][_VERHOEFF_P[index % 8][int(ch)]]
    return check == 0


def _require_contractor(user):
    if getattr(user, "role", "") != "contractor":
        raise PortalMutationError("Only contractors can onboard workers.", 403)


def _contractor_worker(user, bss_id):
    """Resolve the target worker (WorkerIdentity) the contractor may act on.

    The contractor must hold a live (PENDING or ACCEPTED) binding to the worker;
    otherwise the request is rejected. Raises PortalMutationError.
    """
    bss_id = str(bss_id or "").strip().upper()
    ident = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if ident is None:
        raise PortalMutationError("No worker found for that BSS ID.", 404)
    binding = (WorkerContractorBinding.objects
               .filter(worker=ident.user, contractor=user,
                       binding_status__in=("PENDING", "ACCEPTED"))
               .first())
    if binding is None:
        raise PortalMutationError("This worker is not associated with your account.", 403)
    return ident


def _gender_full(value):
    v = str(value or "").strip().upper()
    return {"M": "MALE", "F": "FEMALE", "T": "TRANSGENDER"}.get(v, v)


def _worker_payload(ident):
    """Compact worker summary for the desk (identity + social + banking + DL)."""
    from bss_core.models import WorkerDocument
    w = ident.user
    social = WorkerSocialSecurity.objects.filter(user=w).first()
    bank = WorkerBanking.objects.filter(user=w).first()
    addr = WorkerAddressMobility.objects.filter(user=w).first()
    dl_number, dl_valid, dl_verified = "", "", False
    dl_doc = WorkerDocument.objects.filter(user=w, document__code="DL").first()
    if dl_doc is not None:
        dl_verified = dl_doc.status == "VERIFIED"
        try:
            det = json.loads(dl_doc.ocr_findings or "{}")
        except Exception:  # noqa: BLE001
            det = {}
        dl_number = det.get("number") or dl_doc.file_name or ""
        dl_valid = det.get("validTill", "")
    else:
        cl = WorkerClassification.objects.filter(user=w).first()
        if cl is not None and cl.gig_dl_number:
            dl_number = cl.gig_dl_number
            dl_valid = cl.gig_dl_expiry.isoformat() if cl.gig_dl_expiry else ""
    return {
        "bssId": ident.bss_worker_id,
        "name": ident.name or "",
        "gender": ident.gender or "",
        "dateOfBirth": ident.date_of_birth.isoformat() if ident.date_of_birth else "",
        "age": ident.age,
        "mobile": ident.mobile_number or "",
        "alternateMobile": ident.alternate_mobile or "",
        "email": ident.email or "",
        "aadhaar": ident.aadhaar or "",
        "pan": ident.pan or "",
        "panVerified": bool(ident.pan_verified),
        "panHolderName": ident.pan_holder_name or "",
        "photo": ident.photo or "",
        "fatherName": ident.father_name or "",
        "placeOfBirth": ident.place_of_birth or "",
        "address": {
            "current": addr.current_address if addr else "",
            "currentState": addr.current_state if addr else "",
            "currentDistrict": addr.current_district if addr else "",
            "currentCity": addr.current_city if addr else "",
            "currentLocality": addr.current_locality if addr else "",
            "currentPin": addr.current_pincode if addr else "",
            "permanent": addr.permanent_address if addr else "",
            "permanentState": addr.permanent_state if addr else "",
            "permanentDistrict": addr.permanent_district if addr else "",
            "permanentCity": addr.permanent_city if addr else "",
            "permanentPin": addr.permanent_pincode if addr else "",
        },
        "socialSecurity": {
            "epfoUan": social.epfo_uan if social else "",
            "uanVerified": bool(social and social.uan_verified),
            "esicIp": social.esic_ip_number if social else "",
            "esicVerified": bool(social and social.esic_verified),
        },
        "banking": {
            "bankName": bank.bank_name if bank else "",
            "holderName": bank.bank_account_holder_name if bank else "",
            "accountNumber": bank.bank_account_number if bank else "",
            "ifsc": bank.ifsc_code if bank else "",
            "branch": bank.bank_branch if bank else "",
            "status": bank.bank_verification_status if bank else "",
            "holderMatchesAadhaar": bank.bank_holder_matches_aadhaar if bank else None,
        },
        "dl": {"number": dl_number, "validTill": dl_valid, "verified": dl_verified},
    }


def _capture_dl_number(worker):
    """Read the DL number + validity off the stored DL document (e.g. DigiLocker)."""
    from bss_core.models import WorkerDocument
    doc = WorkerDocument.objects.filter(user=worker, document__code="DL").first()
    if doc is None or not doc.file:
        return
    try:
        det = json.loads(doc.ocr_findings or "{}")
    except Exception:  # noqa: BLE001
        det = {}
    if det.get("number"):
        return
    try:
        doc.file.open("rb")
        data = doc.file.read()
        doc.file.close()
        from .. import ocr_client
        fields = ocr_client.extract_fields("dl", ocr_client.extract_text(data, doc.file_name or "dl.pdf"))
    except Exception:  # noqa: BLE001
        return
    if fields:
        det.update(fields)
        doc.ocr_findings = json.dumps(det)
        if fields.get("dl"):
            doc.file_name = fields["dl"]
        doc.save(update_fields=["ocr_findings", "file_name", "updated_at"])


def _apply_digilocker_identity(worker):
    """Fill name / DOB / gender from the linked DigiLocker profile when empty."""
    from bss_core.models import DigiLockerProfile
    profile = DigiLockerProfile.objects.filter(user=worker).first()
    if profile is None:
        return
    ident = WorkerIdentity.objects.filter(user=worker).first()
    if ident is None:
        return
    changed = []
    if not (ident.name or "").strip() and (profile.name or "").strip():
        ident.name = profile.name.strip()[:120]
        changed.append("name")
    if not (ident.gender or "").strip() and (profile.gender or "").strip():
        ident.gender = profile.gender.strip().upper()[:10]
        changed.append("gender")
    if ident.date_of_birth is None and (profile.dob or "").strip():
        dob = _parse_dob(profile.dob)
        if dob:
            ident.date_of_birth = dob
            changed.append("date_of_birth")
    if changed:
        changed.append("updated_at")
        ident.save(update_fields=changed)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_create_worker(request):
    """Create a worker account on the worker's behalf and bind them.

    Body: {name?, mobile?, aadhaar?, gender?, dob?, siteId?}. No worker OTP is
    required — the contractor attests. The worker is bound to the contractor in
    ACCEPTED state so the desk can immediately capture their details.
    """
    user = request.user
    try:
        _require_contractor(user)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)

    body = request.data or {}
    name = str(body.get("name") or "").strip()[:120]
    mobile = _normalize_mobile(body.get("mobile"))
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    gender = _gender_full(body.get("gender"))
    dob_raw = body.get("dob") or ""

    if not (name or mobile or aadhaar):
        return Response({"error": "Enter at least the worker's name, mobile or Aadhaar number."},
                        status=status.HTTP_400_BAD_REQUEST)
    if body.get("consent") is not None and not body.get("consent"):
        return Response({"error": "Record the worker's consent before creating the account."},
                        status=status.HTTP_400_BAD_REQUEST)

    site = Site.objects.filter(pk=body.get("siteId")).first() if body.get("siteId") else None
    if site is None:
        site = _contractor_default_site(user)
    if site is None:
        return Response({"error": "You have no allotted site yet. Ask the employer to allot a site first."},
                        status=status.HTTP_400_BAD_REQUEST)

    # Duplicate guards — one account per mobile / Aadhaar.
    if mobile and UserCredential.objects.filter(identity_type="mobile", identity_value=mobile).exists():
        return Response({"error": "This mobile is already registered to another account."},
                        status=status.HTTP_409_CONFLICT)
    if aadhaar and WorkerIdentity.objects.filter(aadhaar=aadhaar).exists():
        return Response({"error": "This Aadhaar is already registered to another worker."},
                        status=status.HTTP_409_CONFLICT)

    contractor_name = getattr(getattr(user, "contractor_profile", None), "contractor_name", "") or user.username
    with transaction.atomic():
        username = f"worker_assisted_{mobile or aadhaar or uuid.uuid4().hex[:8]}"
        if User.objects.filter(username=username).exists():
            username = f"{username}_{uuid.uuid4().hex[:4]}"
        worker = User.objects.create_user(username=username, password="Bss@Worker123",
                                          role="worker", account_active=True,
                                          is_verified=True, is_active=True)
        ident = WorkerIdentity.objects.create(
            user=worker, bss_worker_id=bss_ids.new_bss_worker_id(),
            name=name, mobile_number=mobile or "", aadhaar=aadhaar or "", gender=gender)
        dob = _parse_dob(dob_raw) if dob_raw else None
        if dob:
            ident.date_of_birth = dob
            ident.save(update_fields=["date_of_birth"])
        _record_registration_consent(
            worker, source="Contractor-Assisted Onboarding",
            registered_by=f"{contractor_name} (contractor)")
        _ensure_id_card_dates(worker)
        # Note: a mobile is stored as the worker's contact but NOT as a verified
        # login credential — the worker (or contractor) claims it via OTP later
        # (worker_claim_mobile), so one phone still maps to exactly one account.
        WorkerContractorBinding.objects.create(
            worker=worker, contractor=user, site=site,
            binding_status="ACCEPTED", initiated_by="contractor",
            consent_worker=True, consent_contractor=True,
            designation=str(body.get("designation") or "")[:80])

    return Response({"data": _worker_payload(ident)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_detail(request, bss_id):
    """Current captured details for a bound worker (drives the desk view)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_profile(request, bss_id):
    """Persist the worker's declared/contact + address fields (contractor entry)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)

    body = request.data or {}
    idn = body.get("identity") or {}
    if idn.get("alternateMobile") is not None:
        ident.alternate_mobile = str(idn.get("alternateMobile") or "")[:20]
    if idn.get("email") is not None:
        ident.email = str(idn.get("email") or "").strip()[:120]
    if idn.get("placeOfBirth") is not None:
        ident.place_of_birth = str(idn.get("placeOfBirth") or "")[:255]
    ident.save()

    addr = body.get("address") or {}
    if addr:
        a, _ = WorkerAddressMobility.objects.get_or_create(user=ident.user)
        addr_map = {
            "current": "current_address", "currentState": "current_state",
            "currentDistrict": "current_district", "currentCity": "current_city",
            "currentLocality": "current_locality", "currentPin": "current_pincode",
            "migrationType": "migration_type",
        }
        for key, field in addr_map.items():
            if addr.get(key) is not None:
                setattr(a, field, addr.get(key))
        if addr.get("migrant") is not None:
            a.migrant_worker = bool(addr.get("migrant"))
        a.save()

    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_aadhaar_otp(request, bss_id):
    """Send an Aadhaar oKYC OTP for the bound worker (same flow as the worker's)."""
    try:
        _require_contractor(request.user)
        _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    body, upload = _request_body_upload(request)
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    if not aadhaar:
        return Response({"error": "Enter a valid 12-digit Aadhaar number"},
                        status=status.HTTP_400_BAD_REQUEST)
    return _send_otp(aadhaar, consent=bool(body.get("consent", True)))


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_aadhaar_verify(request, bss_id):
    """Verify the worker's Aadhaar OTP and fill their identity/address (oKYC)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    err = link_aadhaar_for_worker(ident.user, request.data or {})
    if err is not None:
        return err
    ident.refresh_from_db()
    return Response({"data": _worker_payload(ident), "aadhaarVerified": True},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_pan(request, bss_id):
    """Save the worker's PAN (validated) — the OCR/upload fallback. PAN normally
    comes from the DigiLocker link; this is the manual path."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    body, upload = _request_body_upload(request)
    pan = str(body.get("pan") or "").strip().upper()
    name = str(body.get("name") or body.get("holderName") or "").strip()[:120]
    if not _PAN_RE.match(pan):
        return Response({"error": "Enter a valid PAN (AAAAA9999A)."},
                        status=status.HTTP_400_BAD_REQUEST)
    ident.pan = pan
    ident.pan_verified = True
    if name:
        ident.pan_holder_name = name
        if not ident.name:
            ident.name = name
    ident.save(update_fields=["pan", "pan_verified", "pan_holder_name", "name", "updated_at"])
    if upload is not None:
        try:
            _store_worker_document(ident, upload, "PAN", {"pan": pan, "name": name})
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_uan(request, bss_id):
    """Set the worker's EPFO UAN and mark it contractor-verified."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    body, upload = _request_body_upload(request)
    uan = re.sub(r"\D", "", str(body.get("uan") or ""))
    if len(uan) != 12:
        return Response({"error": "A UAN is 12 digits."}, status=status.HTTP_400_BAD_REQUEST)
    social, _ = WorkerSocialSecurity.objects.get_or_create(user=ident.user)
    social.epfo_uan = uan
    social.uan_verified = True
    social.save(update_fields=["epfo_uan", "uan_verified", "updated_at"])
    if upload is not None:
        try:
            _store_worker_document(ident, upload, "UAN", {"uan": uan})
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_esic(request, bss_id):
    """Set the worker's ESIC IP number and mark it contractor-verified."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    body, upload = _request_body_upload(request)
    esic = re.sub(r"\D", "", str(body.get("esic") or ""))
    if not (10 <= len(esic) <= 17):
        return Response({"error": "Enter a valid ESIC IP number."},
                        status=status.HTTP_400_BAD_REQUEST)
    social, _ = WorkerSocialSecurity.objects.get_or_create(user=ident.user)
    social.esic_ip_number = esic
    social.esic_verified = True
    social.save(update_fields=["esic_ip_number", "esic_verified", "updated_at"])
    if upload is not None:
        try:
            _store_worker_document(ident, upload, "ESIC", {"esic": esic})
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


def _aadhaar_address_parts_from_text(text):
    """Split an OCR'd Aadhaar address line into state / district / city /
    locality / PIN using the bundled state→district reference."""
    import re as _re
    raw = _re.sub(r"\s+", " ", str(text or "")).strip()
    if not raw:
        return {}
    pin_m = _re.search(r"\b([1-9]\d{5})\b", raw)
    pin = pin_m.group(1) if pin_m else ""
    lower = raw.lower()
    geo = payloads.GEOGRAPHY
    state, best = "", -1
    for name in geo.keys():
        for m in _re.finditer(r"\b" + _re.escape(name.lower()) + r"\b", lower):
            if m.start() > best:
                best, state = m.start(), name
    district, dpos = "", -1
    if state:
        for name in (geo.get(state) or {}).keys():
            for m in _re.finditer(r"\b" + _re.escape(name.lower()) + r"\b", lower):
                if m.start() > dpos:
                    dpos, district = m.start(), name
    cut = len(raw)
    match_name = district or state
    if match_name:
        found = list(_re.finditer(r"\b" + _re.escape(match_name.lower()) + r"\b", lower))
        if found:
            cut = found[-1].start()
    locality = raw[:cut]
    if pin:
        locality = locality.replace(pin, " ")
    locality = _re.sub(r"^[\s,\-–—/]+|[\s,\-–—/]+$", "", locality).strip()
    return {
        "full": raw,
        "state": state,
        "district": district,
        "city": district or state,
        "locality": locality,
        "pincode": pin,
    }


_DOC_NAMES = {"AADHAR": "Aadhaar Card", "PAN": "PAN Card", "UAN": "UAN Card",
              "ESIC": "ESIC Card", "DL": "Driving Licence"}


def _request_body_upload(request):
    """Body (JSON or multipart `payload`) + the uploaded document file."""
    body = request.data or {}
    payload = body.get("payload")
    if isinstance(payload, str) and payload.strip():
        try:
            body = json.loads(payload)
        except Exception:  # noqa: BLE001
            body = {}
    elif isinstance(payload, dict):
        body = payload
    upload = request.FILES.get("document") or request.FILES.get("file")
    return body, upload


def _store_worker_document(ident, upload, code, fields):
    """Store a contractor-uploaded document exactly like a worker upload: the
    same WorkerDocument fields and the same MEDIA `file` location (served via
    the authenticated document endpoint, never a bare /media URL)."""
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    if upload is None:
        return ""
    raw = upload.read()
    if not raw:
        return ""
    upload.seek(0)
    master, _ = WorkerDocumentMaster.objects.get_or_create(
        code=code, defaults={"document_name": _DOC_NAMES.get(code, code),
                             "is_mandatory": code == "AADHAR", "uploaded_by": "system"})
    doc = WorkerDocument.objects.filter(user=ident.user, document=master).first()
    if doc is None:
        doc = WorkerDocument(user=ident.user, document=master)
    elif doc.file:
        try:
            doc.file.delete(save=False)
        except Exception:  # noqa: BLE001
            pass
    doc.file_name = os.path.basename(upload.name or f"{code.lower()}.pdf")
    doc.file_size = len(raw)
    doc.mime_type = upload.content_type or "application/pdf"
    doc.status = "VERIFIED"
    doc.owner_role = "contractor"
    doc.is_mandatory = bool(master.is_mandatory)
    doc.ocr_failed = False
    doc.ocr_findings = json.dumps(fields or {})
    doc.file.save(doc.file_name, upload, save=False)
    doc.file_path = doc.file.name
    doc.save()
    return doc.file_path


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_aadhaar_apply(request, bss_id):
    """Persist Aadhaar identity the contractor already captured/verified off a
    UIDAI e-Aadhaar PDF or signed Offline e-KYC file (no second OTP)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    body = request.data or {}
    upload = request.FILES.get("document") or request.FILES.get("file")
    payload = body.get("payload")
    if isinstance(payload, str) and payload.strip():
        try:
            body = json.loads(payload)
        except Exception:  # noqa: BLE001
            body = {}
    elif isinstance(payload, dict):
        body = payload
    if upload is None:
        return Response({"error": "Upload the Aadhaar document (image or PDF)."},
                        status=status.HTTP_400_BAD_REQUEST)
    from .. import ocr_client
    try:
        upload.seek(0)
        raw = upload.read()
        upload.seek(0)
        text = ocr_client.extract_text(raw, upload.name or "aadhaar")
    except Exception as exc:  # noqa: BLE001
        return Response({"error": f"Could not read the Aadhaar document: {exc}"},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    ok, message, points = ocr_client.check_worker_document("AADHAR", text)
    if not ok:
        return Response({"error": message, "points": points},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    if not aadhaar:
        return Response({"error": "Enter a valid 12-digit Aadhaar number."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _aadhaar_checksum_ok(aadhaar):
        return Response({"error": "The Aadhaar number checksum is invalid. Check the number and upload again."},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    ok, message = ocr_client.verify_document_text("aadhaar", text, expected_number=aadhaar)
    if not ok:
        return Response({"error": message}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    upload.seek(0)
    name = str(body.get("name") or "").strip()[:120]
    gender = _gender_full(body.get("gender"))
    dob = _parse_dob(body.get("dob") or "")
    address = str(body.get("address") or "").strip()[:255]
    father = str(body.get("father") or "").strip()[:120]
    if aadhaar:
        ident.aadhaar = aadhaar
    if name:
        ident.name = name
    if gender:
        ident.gender = gender
    if dob:
        ident.date_of_birth = dob
    if father:
        ident.father_name = father
    ident.save()
    if address:
        a, _ = WorkerAddressMobility.objects.get_or_create(user=ident.user)
        parts = _aadhaar_address_parts_from_text(address)
        a.permanent_address = parts.get("full") or address
        if parts.get("state"):
            a.permanent_state = parts["state"]
        if parts.get("district"):
            a.permanent_district = parts["district"]
        if parts.get("city"):
            a.permanent_city = parts["city"]
        if parts.get("locality"):
            a.permanent_locality = parts["locality"]
        if parts.get("pincode"):
            a.permanent_pincode = parts["pincode"]
        a.save()
    photo = str(body.get("photo") or "")
    if photo:
        import base64
        raw = photo.split(",", 1)[-1] if photo.startswith("data:") else photo
        try:
            _save_worker_photo(ident, base64.b64decode(raw), ident.aadhaar or ident.bss_worker_id)
        except Exception:  # noqa: BLE001
            pass
    if upload is not None:
        try:
            _store_worker_document(ident, upload, "AADHAR", {
                "aadhaar": aadhaar, "name": name, "gender": gender,
                "dob": dob.isoformat() if dob else "", "address": address, "father": father})
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_aadhaar_document(request, bss_id):
    """Authenticated download of the stored Aadhaar document (private root)."""
    from django.conf import settings
    from django.http import FileResponse
    from bss_core.models import WorkerDocument, WorkerIdentity
    role = getattr(request.user, "role", "")
    ident = None
    if role == "contractor":
        try:
            ident = _contractor_worker(request.user, bss_id)
        except PortalMutationError as exc:
            return Response({"error": exc.message}, status=exc.status_code)
    else:
        ident = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
        if ident is None:
            return Response({"error": "Worker not found."}, status=status.HTTP_404_NOT_FOUND)
        if role not in ("bss_admin", "admin") and ident.user_id != request.user.id:
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
    doc = (WorkerDocument.objects.filter(user=ident.user, document__code="AADHAR")
           .order_by("-id").first())
    if doc is None:
        return Response({"error": "No Aadhaar document stored."}, status=status.HTTP_404_NOT_FOUND)
    if doc.file:
        return FileResponse(doc.file.open("rb"), content_type=doc.mime_type or "application/pdf",
                            filename=doc.file_name or os.path.basename(doc.file.name))
    root = os.path.abspath(getattr(settings, "BSS_PRIVATE_MEDIA_DIR", ""))
    path = os.path.abspath(os.path.join(root, doc.file_path or ""))
    if not root or not doc.file_path or not path.startswith(root + os.sep) or not os.path.exists(path):
        return Response({"error": "Document missing."}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(open(path, "rb"), content_type=doc.mime_type or "application/pdf",
                        filename=doc.file_name or "aadhaar.pdf")


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_dl(request, bss_id):
    """Record the worker's Driving Licence (number / validity / status) captured
    from the Sarathi portal or a Print-DL PDF."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    from bss_core.models import WorkerDocument, WorkerDocumentMaster

    body, upload = _request_body_upload(request)
    number = str(body.get("number") or "").strip().upper()[:40]
    if not number:
        return Response({"error": "Enter the driving licence number."},
                        status=status.HTTP_400_BAD_REQUEST)
    details = json.dumps({"number": number, "validTill": str(body.get("validTill") or ""),
                          "status": str(body.get("status") or "")})
    master = WorkerDocumentMaster.objects.filter(code="DL").first()
    if master is not None:
        doc = WorkerDocument.objects.filter(user=ident.user, document=master).first()
        if doc is None:
            doc = WorkerDocument(user=ident.user, document=master)
        doc.file_name = number
        doc.owner_role = "contractor"
        doc.status = "VERIFIED"
        doc.ocr_findings = details
        doc.save()
    else:
        wc, _ = WorkerClassification.objects.get_or_create(user=ident.user)
        wc.gig_dl_number = number
        expiry = _coerce_profile_date(body.get("validTill"))
        if expiry:
            wc.gig_dl_expiry = expiry
        wc.save()
    if upload is not None:
        try:
            _store_worker_document(ident, upload, "DL", {"number": number, "validTill": str(body.get("validTill") or "")})
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_bank_verify(request, bss_id):
    """Verify the worker's salary account via penny drop (Sandbox/NPCI)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
        result = _handle_bank_verify(ident.user, request.data or {})
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    return Response({"data": _worker_payload(ident), "verification": result},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_extract(request, bss_id):
    """OCR an uploaded document and return the auto-read fields for the
    contractor to confirm (then saved via the matching tile endpoint)."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    upload = request.FILES.get("file") or request.FILES.get("document")
    if upload is None:
        return Response({"error": "Choose a document image or PDF."},
                        status=status.HTTP_400_BAD_REQUEST)
    raw = upload.read()
    if not raw:
        return Response({"error": "The uploaded file is empty."},
                        status=status.HTTP_400_BAD_REQUEST)
    if len(raw) > 12 * 1024 * 1024:
        return Response({"error": "The document must be under 12 MB."},
                        status=status.HTTP_400_BAD_REQUEST)
    from .. import ocr_client

    try:
        text = ocr_client.extract_text(raw, upload.name or "document")
    except ocr_client.OcrError as exc:
        return Response({"error": f"Could not read the document: {exc}"},
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    kind = str((request.data or {}).get("kind") or "").strip().lower()
    if not kind:
        kind = ocr_client.detect_document_type(text) or ""
    if kind == "aadhaar":
        ok, message, points = ocr_client.check_worker_document("AADHAR", text)
        if not ok:
            return Response({"error": message, "points": points},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    fields = ocr_client.extract_fields(kind or "aadhaar", text) if kind else {}
    # Digitally generated PDFs can merge name words in their text layer (e.g.
    # "SyedYasserali"). Refine the name from a forced OCR pass when it yields
    # more words, and fill any missing fields from it.
    if kind in ("aadhaar", "pan"):
        try:
            from .. import ocr_engine as _ocr_refine
            if _ocr_refine._pdf_native_text(raw):
                alt_text = _ocr_refine.extract_text_ocr(raw, upload.name or "")
                alt = ocr_client.extract_fields(kind, alt_text)
                alt_name = str(alt.get("name") or "").strip()
                cur_name = str(fields.get("name") or "").strip()
                if alt_name and len(alt_name.split()) > len(cur_name.split()):
                    fields["name"] = alt_name
                for key in ("father", "dob", "gender", "address", "pan", "aadhaar"):
                    if not fields.get(key) and alt.get(key):
                        fields[key] = alt[key]
        except Exception:  # noqa: BLE001
            pass
    # Passport photo: pull it out of the uploaded PDF (best-effort) and store it
    # on the worker so the tile shows it.
    photo_data = ""
    card_data = ""
    if kind in ("aadhaar", ""):
        try:
            from .. import ocr_engine as _ocr
            # Prefer a real face (YuNet) over the legacy embedded-image crop.
            pbytes = _ocr.extract_face(raw, upload.name or "")
            card_bytes = _ocr.render_page_image(raw, upload.name or "", max_side=1400)
        except Exception:  # noqa: BLE001
            pbytes = None
            card_bytes = None
        if pbytes:
            # Do NOT persist yet — everything is saved only on Finalise.
            import base64
            photo_data = "data:image/jpeg;base64," + base64.b64encode(pbytes).decode()
        if card_bytes:
            import base64
            card_data = "data:image/jpeg;base64," + base64.b64encode(card_bytes).decode()
    return Response({"kind": kind, "fields": fields, "text": (text or "")[:4000],
                     "photo": photo_data, "card": card_data}, status=status.HTTP_200_OK)


def _save_worker_photo(ident, image_bytes, key=""):
    """Write the worker's photo (JPEG bytes) under media/aadhaar and set the field."""
    from django.conf import settings
    if not image_bytes:
        return ""
    folder = settings.AADHAAR_PHOTO_DIR
    os.makedirs(folder, exist_ok=True)
    name = f"{key or ident.bss_worker_id or 'worker'}.jpg"
    try:
        with open(os.path.join(folder, name), "wb") as fh:
            fh.write(image_bytes)
    except OSError:
        return ""
    ident.photo = f"/media/aadhaar/{name}"
    ident.save(update_fields=["photo", "updated_at"])
    return ident.photo


def _pick(obj, *keys):
    """First non-empty value for any key, searching nested dicts/lists."""
    if isinstance(obj, dict):
        for k in keys:
            v = obj.get(k)
            if v not in (None, "", [], {}):
                return v
        for v in obj.values():
            r = _pick(v, *keys)
            if r not in (None, ""):
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _pick(v, *keys)
            if r not in (None, ""):
                return r
    return None


def _apply_sandbox_digilocker(ident, profile, aadhaar_doc, pan_doc):
    changed = []
    aadhaar_no = re.sub(r"\D", "", str(
        _pick(aadhaar_doc, "aadhaar_number", "aadhaar", "uid", "number")
        or _pick(profile, "aadhaar_number", "aadhaar", "uid") or ""))
    name = _pick(aadhaar_doc, "name", "full_name", "holder_name") or _pick(profile, "name", "full_name")
    dob = _pick(aadhaar_doc, "dob", "date_of_birth", "birth_date") or _pick(profile, "dob", "date_of_birth")
    gender = _pick(aadhaar_doc, "gender", "sex") or _pick(profile, "gender", "sex")
    if len(aadhaar_no) == 12:
        ident.aadhaar = aadhaar_no
        changed.append("aadhaar")
    if name and str(name).strip():
        ident.name = str(name).strip()[:120]
        changed.append("name")
    if gender:
        ident.gender = _gender_full(str(gender))
        changed.append("gender")
    if dob:
        parsed = _parse_dob(str(dob))
        if parsed:
            ident.date_of_birth = parsed
            changed.append("date_of_birth")
    pan_no = str(_pick(pan_doc, "pan_number", "pan", "number") or "").strip().upper()
    if _PAN_RE.match(pan_no):
        ident.pan = pan_no
        ident.pan_verified = True
        changed += ["pan", "pan_verified"]
    if changed:
        changed.append("updated_at")
        ident.save(update_fields=list(dict.fromkeys(changed)))


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_digilocker_start(request, bss_id):
    """Start a Sandbox DigiLocker session for the bound worker (Aadhaar + PAN)."""
    try:
        _require_contractor(request.user)
        _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    from django.conf import settings
    from .. import sandbox_digilocker as sd
    doc_types = (request.data or {}).get("doc_types") or ["aadhaar", "pan"]
    redirect_url = (getattr(settings, "DIGILOCKER_REDIRECT_URI", "")
                    or "https://login.bharatshramsetu.com/api/digilocker/callback")
    try:
        data = sd.init_session(doc_types, redirect_url)
    except sd.SandboxDigiLockerError as exc:
        return Response({"error": str(exc)}, status=exc.status)
    return Response({"authorize_url": data.get("authorization_url") or data.get("authorize_url"),
                     "session_id": data.get("session_id") or data.get("id")}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_digilocker_status(request, bss_id):
    try:
        _require_contractor(request.user)
        _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    session_id = request.query_params.get("session_id", "")
    if not session_id:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    from .. import sandbox_digilocker as sd
    try:
        data = sd.session_status(session_id)
    except sd.SandboxDigiLockerError as exc:
        return Response({"error": str(exc)}, status=exc.status)
    return Response({"status": data.get("status") or data.get("session_status") or "",
                     "raw": data}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_worker_digilocker_sync(request, bss_id):
    """Fetch the Sandbox DigiLocker documents and fill the worker's fields."""
    try:
        _require_contractor(request.user)
        ident = _contractor_worker(request.user, bss_id)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)
    from .. import sandbox_digilocker as sd
    session_id = str((request.data or {}).get("session_id") or "").strip()
    if not session_id:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    def _try(fn):
        try:
            return fn()
        except Exception:  # noqa: BLE001
            return {}

    profile = _try(lambda: sd.user_profile(session_id))
    aadhaar_doc = _try(lambda: sd.fetch_document(session_id, "aadhaar"))
    pan_doc = _try(lambda: sd.fetch_document(session_id, "pan"))
    _apply_sandbox_digilocker(ident, profile, aadhaar_doc, pan_doc)
    # DigiLocker profile picture → worker photo.
    pic = _pick(profile, "picture", "photo", "profile_picture", "image")
    if pic:
        try:
            import base64
            raw_pic = str(pic)
            if raw_pic.strip().startswith("data:") and "," in raw_pic:
                raw_pic = raw_pic.split(",", 1)[1]
            _save_worker_photo(ident, base64.b64decode(raw_pic), ident.aadhaar or ident.bss_worker_id)
        except Exception:  # noqa: BLE001
            pass
    ident.refresh_from_db()
    return Response({"data": _worker_payload(ident)}, status=status.HTTP_200_OK)


__all__ = [
    "contractor_create_worker",
    "contractor_worker_detail",
    "contractor_worker_profile",
    "contractor_worker_aadhaar_otp",
    "contractor_worker_aadhaar_verify",
    "contractor_worker_aadhaar_apply",
    "contractor_worker_aadhaar_document",
    "contractor_worker_pan",
    "contractor_worker_uan",
    "contractor_worker_esic",
    "contractor_worker_dl",
    "contractor_worker_bank_verify",
    "contractor_worker_extract",
    "contractor_worker_digilocker_start",
    "contractor_worker_digilocker_status",
    "contractor_worker_digilocker_sync",
]
