"""Aadhaar / DigiLocker verification and worker identity linking."""

import re

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _sanitize_aadhaar(value):
    if value is None:
        return None
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return digits if _AADHAAR_RE.match(digits) else None


def _parse_dob(value):
    if not value:
        return None
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def _id_card_validity(issue):
    """A worker ID card is valid for five years from its issue date (29 Feb is
    clamped to 28 Feb in non-leap years)."""
    try:
        return issue.replace(year=issue.year + 5)
    except ValueError:
        return issue.replace(year=issue.year + 5, day=28)


def _ensure_id_card_dates(user, issue=None):
    """Create/refresh the worker's ID-card issue and validity dates on their
    WorkerEmployment row, without clobbering an existing issue date."""
    issue = issue or timezone.now().date()
    emp, _ = WorkerEmployment.objects.get_or_create(user=user)
    if not emp.id_card_issue_date:
        emp.id_card_issue_date = issue
    if not emp.id_card_validity_till:
        emp.id_card_validity_till = _id_card_validity(emp.id_card_issue_date)
    emp.save(update_fields=["id_card_issue_date", "id_card_validity_till", "updated_at"])
    return emp


def _save_aadhaar_photo(aadhaar, photo):
    """Decode the base64 oKYC photo into AADHAAR_PHOTO_DIR; returns the
    media URL for the worker identity photo field (or "" on failure)."""
    if not photo:
        return ""
    import base64
    raw = str(photo)
    if "," in raw:
        raw = raw.split(",", 1)[1]
    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        return ""
    folder = settings.AADHAAR_PHOTO_DIR
    os.makedirs(folder, exist_ok=True)
    rel_name = f"{aadhaar}.jpg"
    try:
        with open(os.path.join(folder, rel_name), "wb") as fh:
            fh.write(image_bytes)
    except OSError:
        return ""
    return f"/media/aadhaar/{rel_name}"


def _aadhaar_address_parts(data):
    """Normalise a UIDAI oKYC address into BSS address parts.

    UIDAI has no explicit "city" field: ``vtc`` (village/town/city) is the
    locality/area in urban addresses (e.g. "Jamia Nagar"), so it is stored as the
    LOCALITY. The district (the next administrative level) is used as the CITY so
    a residential area is never mistaken for the city.
    """
    addr = data.get("address") or {}
    state = str(addr.get("state") or "").strip()
    district = str(addr.get("district") or "").strip()
    locality = str(addr.get("vtc") or addr.get("loc") or "").strip()
    city = str(addr.get("city") or "").strip() or district or state
    return {
        "full": str(data.get("full_address") or "").strip(),
        "state": state,
        "district": district,
        "locality": locality,
        "city": city,
        "pincode": str(addr.get("pincode") or "").strip(),
    }


_CARE_OF_RE = re.compile(
    r"^\s*(S/O|D/O|F/O|SO|DO|FO|W/O|H/O|WO|HO|C/O|CO|CARE\s*OF)\b[\s:.\-]*(.+)$",
    re.IGNORECASE,
)


def _aadhaar_care_of_parts(care_of):
    """Map UIDAI ``care_of`` (e.g. "S/O: Talat Parvez", "C/O: ...") to
    (father_name, spouse_name). UIDAI exposes no separate parent/spouse fields
    and never returns the mother's name, so only these two can be derived.

    "C/O" (care of) omits the relationship — common for female workers — so it
    is kept as the father/guardian name instead of being dropped. Any value with
    no recognisable prefix is also kept as the father/guardian so the name is
    never lost."""
    raw = str(care_of or "").strip()
    if not raw:
        return "", ""
    match = _CARE_OF_RE.match(raw)
    if not match:
        # No recognisable relationship prefix — keep the whole value as the father.
        return raw, ""
    relation = re.sub(r"[^A-Z]", "", match.group(1).upper())
    name = match.group(2).strip().strip(":.-").strip()
    if not name:
        return "", ""
    if relation in ("WO", "HO"):
        return "", name
    # S/O, D/O, F/O and the ambiguous C/O -> father / guardian.
    return name, ""


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def aadhaar_otp(request):
    """Generate (or resend) an Aadhaar oKYC OTP -> { referenceId, expiresIn }."""
    body = request.data or {}
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    if not aadhaar:
        return Response({"error": "Enter a valid 12-digit Aadhaar number"},
                        status=status.HTTP_400_BAD_REQUEST)

    def _reuse_recent(window_minutes, message=""):
        """Return a recent OTP reference so a repeated request reuses the OTP
        already delivered instead of tripping Sandbox's rate limit.

        Sandbox is the source of truth for OTP validity: when it reports an OTP
        was already generated for this Aadhaar we must hand back the last
        reference we saw — even if our local TTL says it lapsed — otherwise the
        user is stuck (Sandbox won't issue a new OTP, and we refuse the old one).
        """
        now = timezone.now()
        recent = (AadhaarChallenge.objects
                  .filter(aadhaar_number=aadhaar,
                          created_at__gte=now - timedelta(minutes=window_minutes))
                  .exclude(reference_id__isnull=True).exclude(reference_id="")
                  .exclude(status__in=["VERIFIED", "FAILED"])
                  .order_by("-created_at").first())
        if recent is None:
            return None
        expires = recent.expires_at or (recent.created_at + timedelta(minutes=settings.AADHAAR_OTP_TTL_MIN))
        payload = {
            "referenceId": recent.reference_id,
            "expiresIn": max(0, int((expires - now).total_seconds())),
            "reused": True,
        }
        if message:
            payload["message"] = message
        return Response(payload, status=status.HTTP_200_OK)

    # Reuse an OTP generated within the last minute (Sandbox blocks regeneration
    # for ~45s) rather than calling Sandbox and getting rate-limited.
    live = _reuse_recent(1)
    if live is not None:
        return live

    try:
        result = aadhaar_client.generate_otp(aadhaar)
    except aadhaar_client.SandboxError as exc:
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            # Already-generated / rate-limited: reuse a recent reference if we
            # have one (the OTP was already delivered), else ask them to wait.
            msg = str(exc)
            fallback = _reuse_recent(24 * 60, msg)
            if fallback is not None:
                return fallback
            rate_limited = (sb_status == 429 or "try after" in msg.lower()
                            or "already" in msg.lower())
            return Response({"error": msg},
                            status=status.HTTP_429_TOO_MANY_REQUESTS if rate_limited
                            else status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ref_id = (result.get("data") or {}).get("reference_id")
    if result.get("code") != 200 or not ref_id:
        msg = str((result.get("data") or {}).get("message") or "").strip() or \
            "Aadhaar verification service is currently experiencing delays."
        fallback = _reuse_recent(24 * 60, msg)
        if fallback is not None:
            return fallback
        return Response({"error": msg}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    challenge = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, status__in=["INITIATED", "OTP_SENT"]).first()
    if challenge is None:
        challenge = AadhaarChallenge.objects.create(
            aadhaar_number=aadhaar, consent=bool(body.get("consent", True)))
    challenge.reference_id = str(ref_id)
    challenge.status = "OTP_SENT"
    challenge.expires_at = timezone.now() + timedelta(minutes=settings.AADHAAR_OTP_TTL_MIN)
    challenge.response_json = json.dumps(result, default=str)
    challenge.save(update_fields=["reference_id", "status", "expires_at",
                                  "response_json", "updated_at"])

    return Response({
        "referenceId": challenge.reference_id,
        "expiresIn": settings.AADHAAR_OTP_TTL_MIN * 60,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def aadhaar_verify(request):
    """Verify the Aadhaar OTP and auto-create the worker (signup scope).
    Returns the same session payload as register_worker on success."""
    body = request.data or {}
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    reference_id = str(body.get("referenceId") or "").strip()
    otp = str(body.get("otp") or "").strip()
    if not aadhaar or not reference_id or not otp:
        return Response({"error": "aadhaar, referenceId and otp are required"},
                        status=status.HTTP_400_BAD_REQUEST)

    challenge = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, reference_id=reference_id).order_by("-created_at").first()
    if challenge is None:
        return Response({"error": "Unknown Aadhaar OTP request. Send a new OTP first."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.status == "VERIFIED":
        return Response({"error": "This Aadhaar has already been verified."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.otp_attempts >= challenge.max_attempts:
        challenge.status = "FAILED"
        challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": "Too many attempts. Request a new OTP."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        result = aadhaar_client.verify_otp(reference_id, otp)
    except aadhaar_client.SandboxError as exc:
        challenge.otp_attempts += 1
        challenge.save(update_fields=["otp_attempts", "updated_at"])
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    challenge.otp_attempts += 1
    challenge.response_json = json.dumps(result, default=str)
    challenge.save(update_fields=["otp_attempts", "response_json", "updated_at"])

    data = result.get("data") or {}
    if result.get("code") != 200 or data.get("message") != "Aadhaar Card Exists":
        msg = str(data.get("message") or "").strip() or "Aadhaar verification failed. Check the OTP and try again."
        # A wrong OTP must NOT permanently kill the challenge: the user may have
        # mistyped, and marking it expired also blocks the reuse path, so the
        # Sandbox rate-limit then leaves them stuck on "OTP expired". Only fail
        # it once the attempt budget is exhausted — genuinely expired OTPs are
        # already handled by the local expiry check above.
        if challenge.otp_attempts >= challenge.max_attempts:
            challenge.status = "FAILED"
            challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

    photo_url = ""
    user = None
    cred = UserCredential.objects.filter(identity_type="aadhaar",
                                         identity_value=aadhaar).first()
    if cred is None:
        username = f"worker_aadhaar_{aadhaar}"
        with transaction.atomic():
            user = User.objects.create_user(username=username, password="Bss@Worker123",
                                            role="worker", account_active=True,
                                            is_verified=True, is_active=True)
            photo_url = _save_aadhaar_photo(aadhaar, data.get("photo"))
            care_father, care_spouse = _aadhaar_care_of_parts(data.get("care_of"))
            parts = _aadhaar_address_parts(data)
            identity = WorkerIdentity.objects.create(
                user=user,
                bss_worker_id=bss_ids.new_bss_worker_id(),
                name=data.get("name") or "",
                gender=(data.get("gender") or "").upper() or "",
                date_of_birth=_parse_dob(data.get("date_of_birth")),
                aadhaar=aadhaar,
                photo=photo_url,
                father_name=care_father,
                spouse_name=care_spouse,
                # Place of Birth is seeded from the Aadhaar state so it is never
                # empty; the worker can change it later from their profile.
                place_of_birth=parts["state"] or "",
            )
            WorkerOther.objects.get_or_create(user=user)
            _record_registration_consent(user)
            _ensure_id_card_dates(user)
            UserCredential.objects.create(user=user, identity_type="aadhaar",
                                          identity_value=aadhaar,
                                          is_primary=False, verified=True)
            # UIDAI oKYC never returns the real mobile number, so capture the one
            # the worker typed at signup — otherwise the profile has no contact
            # and would wrongly fall back to the Aadhaar-based username.
            contact = "".join(ch for ch in str(body.get("contact") or "") if ch.isdigit())
            if len(contact) == 10 and contact[0] in "6789":
                identity.mobile_number = contact
                identity.save(update_fields=["mobile_number"])
                UserCredential.objects.get_or_create(
                    user=user, identity_type="mobile", identity_value=contact,
                    defaults={"is_primary": True, "verified": True})
            challenge.user = user
            challenge.name = data.get("name") or ""
            challenge.gender = data.get("gender") or ""
            challenge.date_of_birth = data.get("date_of_birth") or ""
            challenge.care_of = data.get("care_of") or ""
            challenge.full_address = data.get("full_address") or ""
            addr = data.get("address") or {}
            challenge.state = addr.get("state") or ""
            challenge.district = addr.get("district") or ""
            challenge.pincode = addr.get("pincode") or ""
            challenge.photo_path = photo_url
            challenge.save(update_fields=["user", "name", "gender", "date_of_birth",
                                          "care_of", "full_address", "state", "district",
                                          "pincode", "photo_path", "updated_at"])
            # The Aadhaar (UIDAI) address is the worker's PERMANENT, Aadhaar-owned
            # address (frozen). The current address is entered/changed by the
            # worker themselves and is never overwritten by Aadhaar.
            WorkerAddressMobility.objects.get_or_create(
                user=user,
                defaults={
                    "permanent_address": parts["full"],
                    "permanent_state": parts["state"],
                    "permanent_district": parts["district"],
                    "permanent_city": parts["city"],
                    "permanent_locality": parts["locality"],
                    "permanent_pincode": parts["pincode"],
                },
            )
    else:
        user = cred.user

    if user is None or not user.is_active:
        return Response({"error": "Account is disabled"}, status=status.HTTP_401_UNAUTHORIZED)

    challenge.status = "VERIFIED"
    challenge.save(update_fields=["status", "updated_at"])

    payload = _make_session_payload(user)
    identity = WorkerIdentity.objects.filter(user=user).first()
    payload["bssId"] = identity.bss_worker_id if identity else None
    payload["subject"] = user.username
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_link_aadhaar(request):
    """Link/verify Aadhaar for the currently authenticated worker and fill
    identity (name/gender/dob/aadhaar/photo) + current address from oKYC."""
    body = request.data or {}
    aadhaar = _sanitize_aadhaar(body.get("aadhaar"))
    reference_id = str(body.get("referenceId") or "").strip()
    otp = str(body.get("otp") or "").strip()
    if not aadhaar or not reference_id or not otp:
        return Response({"error": "aadhaar, referenceId and otp are required"},
                        status=status.HTTP_400_BAD_REQUEST)

    challenge = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, reference_id=reference_id).order_by("-created_at").first()
    if challenge is None:
        return Response({"error": "Unknown Aadhaar OTP request. Send a new OTP first."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.status == "VERIFIED":
        return Response({"error": "This Aadhaar has already been verified."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.otp_attempts >= challenge.max_attempts:
        challenge.status = "FAILED"
        challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": "Too many attempts. Request a new OTP."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        result = aadhaar_client.verify_otp(reference_id, otp)
    except aadhaar_client.SandboxError as exc:
        challenge.otp_attempts += 1
        challenge.save(update_fields=["otp_attempts", "updated_at"])
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    challenge.otp_attempts += 1
    challenge.response_json = json.dumps(result, default=str)
    challenge.save(update_fields=["otp_attempts", "response_json", "updated_at"])

    data = result.get("data") or {}
    if result.get("code") != 200 or data.get("message") != "Aadhaar Card Exists":
        msg = data.get("message") or "Aadhaar verification failed. Check the OTP and try again."
        if challenge.otp_attempts >= challenge.max_attempts:
            challenge.status = "FAILED"
            challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if UserCredential.objects.filter(identity_type="aadhaar", identity_value=aadhaar).exclude(user=user).exists():
        return Response({"error": "This Aadhaar is already linked to another account."},
                        status=status.HTTP_400_BAD_REQUEST)

    identity = WorkerIdentity.objects.filter(user=user).first()
    if not identity:
        identity = WorkerIdentity.objects.create(user=user, bss_worker_id=bss_ids.new_bss_worker_id())

    addr = data.get("address") or {}
    identity.name = data.get("name") or identity.name
    identity.gender = (data.get("gender") or "").upper() or identity.gender
    dob = _parse_dob(data.get("date_of_birth"))
    if dob:
        identity.date_of_birth = dob
    identity.aadhaar = aadhaar
    photo = _save_aadhaar_photo(aadhaar, data.get("photo"))
    if photo:
        identity.photo = photo
    care_father, care_spouse = _aadhaar_care_of_parts(data.get("care_of"))
    if care_father:
        identity.father_name = care_father
    if care_spouse:
        identity.spouse_name = care_spouse
    parts = _aadhaar_address_parts(data)
    # Place of Birth is seeded from the Aadhaar state and must never be empty;
    # the worker can still edit it later.
    if not (identity.place_of_birth or "").strip():
        identity.place_of_birth = parts["state"] or ""
    identity.save()

    a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
    a.permanent_address = parts["full"] or a.permanent_address
    a.permanent_state = parts["state"] or a.permanent_state
    a.permanent_district = parts["district"] or a.permanent_district
    a.permanent_city = parts["city"] or a.permanent_city
    a.permanent_locality = parts["locality"] or a.permanent_locality
    if parts["pincode"]:
        a.permanent_pincode = parts["pincode"]
    a.save()

    UserCredential.objects.get_or_create(
        user=user, identity_type="aadhaar", identity_value=aadhaar,
        defaults={"verified": True})

    challenge.user = user
    challenge.name = data.get("name") or ""
    challenge.gender = data.get("gender") or ""
    challenge.date_of_birth = data.get("date_of_birth") or ""
    challenge.care_of = data.get("care_of") or ""
    challenge.full_address = data.get("full_address") or ""
    challenge.state = addr.get("state") or ""
    challenge.district = addr.get("district") or ""
    challenge.pincode = addr.get("pincode") or ""
    challenge.photo_path = identity.photo
    challenge.status = "VERIFIED"
    challenge.save(update_fields=["user", "name", "gender", "date_of_birth", "care_of",
                                  "full_address", "state", "district", "pincode",
                                  "photo_path", "status", "updated_at"])

    return Response({"success": True, "aadhaarVerified": True}, status=status.HTTP_200_OK)


__all__ = [
    "_aadhaar_address_parts",
    "_aadhaar_care_of_parts",
    "_ensure_id_card_dates",
    "_id_card_validity",
    "_parse_dob",
    "_sanitize_aadhaar",
    "_save_aadhaar_photo",
    "aadhaar_otp",
    "aadhaar_verify",
    "worker_link_aadhaar",
]
