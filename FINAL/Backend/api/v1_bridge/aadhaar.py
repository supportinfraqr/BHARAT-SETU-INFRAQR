"""Aadhaar / DigiLocker verification and worker identity linking."""

import re

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _sanitize_aadhaar(value):
    if value is None:
        return None
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return digits if _AADHAAR_RE.match(digits) else None


def _aadhaar_throttle_remaining(aadhaar):
    """Seconds left on the per-Aadhaar OTP cooldown (0 when none)."""
    now = timezone.now()
    row = (AadhaarChallenge.objects
           .filter(aadhaar_number=aadhaar, status="THROTTLED", expires_at__gt=now)
           .order_by("-expires_at").first())
    return max(1, int((row.expires_at - now).total_seconds())) if row else 0


def _throttle_aadhaar(aadhaar, seconds=60):
    """Block further Sandbox OTP calls for this Aadhaar so a burst of retries
    cannot keep resetting UIDAI's cooldown. Backs off progressively (60s, 2m,
    4m, … up to 30 min) so the upstream lock has time to clear."""
    now = timezone.now()
    recent = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, status="THROTTLED",
        created_at__gte=now - timedelta(hours=6)).count()
    wait = min(seconds * (2 ** min(recent, 5)), 30 * 60)
    AadhaarChallenge.objects.create(
        aadhaar_number=aadhaar, status="THROTTLED",
        expires_at=now + timedelta(seconds=wait))


# ---------------------------------------------------------------------------
# Account-wide circuit breaker. Sandbox rate-limits our whole API key (not just
# one Aadhaar), so a per-Aadhaar cooldown lets a *new* number straight through
# and keeps the account throttle alive. These sentinel rows gate every Aadhaar
# OTP request app-wide: "THROTTLED" = account cooling down; "CALL" = time of the
# last Sandbox OTP call (for a global minimum interval between calls).
# ---------------------------------------------------------------------------

_GLOBAL_OTP_KEY = "__global_otp__"


def _fmt_wait(seconds):
    seconds = max(1, int(seconds))
    if seconds >= 60:
        mins, secs = divmod(seconds, 60)
        return f"{mins} min" if secs == 0 else f"{mins} min {secs:02d}s"
    return f"{seconds}s"


def _fmt_mins(seconds):
    """Whole minutes, rounded up (never '0 mins')."""
    return max(1, (int(seconds) + 59) // 60)


def _global_cooldown_remaining():
    now = timezone.now()
    row = (AadhaarChallenge.objects
           .filter(aadhaar_number=_GLOBAL_OTP_KEY, status="THROTTLED", expires_at__gt=now)
           .order_by("-expires_at").first())
    return max(1, int((row.expires_at - now).total_seconds())) if row else 0


def _open_global_cooldown(seconds=None):
    now = timezone.now()
    base = seconds or settings.AADHAAR_GLOBAL_COOLDOWN_SEC
    recent = AadhaarChallenge.objects.filter(
        aadhaar_number=_GLOBAL_OTP_KEY, status="THROTTLED",
        created_at__gte=now - timedelta(hours=6)).count()
    wait = min(base * (2 ** min(recent, 2)), 60 * 60)  # 15m → 30m → 60m
    AadhaarChallenge.objects.create(aadhaar_number=_GLOBAL_OTP_KEY, status="THROTTLED",
                                    expires_at=now + timedelta(seconds=wait))


def _global_min_interval_remaining():
    last = (AadhaarChallenge.objects
            .filter(aadhaar_number=_GLOBAL_OTP_KEY, status="CALL")
            .order_by("-created_at").first())
    if not last:
        return 0
    interval = settings.AADHAAR_MIN_INTERVAL_SEC
    elapsed = (timezone.now() - last.created_at).total_seconds()
    return max(0, int(interval - elapsed)) if elapsed < interval else 0


def _mark_global_call():
    AadhaarChallenge.objects.create(aadhaar_number=_GLOBAL_OTP_KEY, status="CALL")


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
    """A worker ID card is valid for three years from its issue date (29 Feb is
    clamped to 28 Feb in non-leap years)."""
    try:
        return issue.replace(year=issue.year + 3)
    except ValueError:
        return issue.replace(year=issue.year + 3, day=28)


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
                  .exclude(status__in=["VERIFIED", "FAILED", "EXPIRED"])
                  .order_by("-expires_at", "-created_at").first())
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

    now = timezone.now()

    # 1) If we already hold a still-valid OTP reference, reuse it and do NOT
    #    call Sandbox — repeated clicks must not reset its resend cooldown.
    valid = (AadhaarChallenge.objects
             .filter(aadhaar_number=aadhaar, status__in=["INITIATED", "OTP_SENT"],
                     expires_at__gt=now)
             .exclude(reference_id__isnull=True).exclude(reference_id="")
             .order_by("-expires_at").first())
    if valid is not None:
        return Response({
            "referenceId": valid.reference_id,
            "expiresIn": max(0, int((valid.expires_at - now).total_seconds())),
            "reused": True,
        }, status=status.HTTP_200_OK)

    # 2) Debounce Sandbox: at most one OTP request per ~45s per Aadhaar, so a
    #    burst of clicks cannot keep resetting the upstream cooldown (which is
    #    what stopped any OTP from actually being sent).
    last_call = (AadhaarChallenge.objects
                 .filter(aadhaar_number=aadhaar, status="CALL",
                         created_at__gte=now - timedelta(seconds=45))
                 .order_by("-created_at").first())
    if last_call is not None:
        fallback = _reuse_recent(24 * 60)
        if fallback is not None:
            return fallback
        wait = max(1, 45 - int((now - last_call.created_at).total_seconds()))
        return Response({
            "error": "An OTP was requested for this Aadhaar a moment ago. Enter the OTP you received below, or wait a few seconds and resend.",
            "retryAfterSeconds": wait,
            "otpPending": True,
        }, status=status.HTTP_200_OK)

    AadhaarChallenge.objects.create(aadhaar_number=aadhaar, status="CALL")

    # Ask Sandbox to send the OTP now.
    try:
        result = aadhaar_client.generate_otp(aadhaar)
    except aadhaar_client.SandboxError as exc:
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            # Already-generated / rate-limited: reuse the last delivered
            # reference so the user still reaches the OTP screen with the OTP
            # they received, instead of being blocked.
            msg = str(exc)
            fallback = _reuse_recent(24 * 60, msg)
            if fallback is not None:
                return fallback
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ref_id = (result.get("data") or {}).get("reference_id")
    if result.get("code") != 200 or not ref_id:
        msg = str((result.get("data") or {}).get("message") or "").strip() or \
            "Aadhaar verification service is currently experiencing delays."
        fallback = _reuse_recent(24 * 60, msg)
        if fallback is not None:
            return fallback
        return Response(
            {"error": "An OTP was sent to this Aadhaar recently. Enter it below — if it doesn't work, tap 'Resend OTP' to get a new code.",
             "retryAfterSeconds": 45, "otpPending": True},
            status=status.HTTP_200_OK)

    challenge = AadhaarChallenge.objects.create(
        aadhaar_number=aadhaar,
        consent=bool(body.get("consent", True)),
        reference_id=str(ref_id),
        status="OTP_SENT",
        expires_at=timezone.now() + timedelta(minutes=settings.AADHAAR_OTP_TTL_MIN),
        response_json=json.dumps(result, default=str))

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
    if not aadhaar or not otp:
        return Response({"error": "Aadhaar number and OTP are required"},
                        status=status.HTTP_400_BAD_REQUEST)
    # The client may not hold the reference (e.g. the send was rate-limited and
    # it still advanced to the OTP screen) — fall back to the latest request.
    if not reference_id:
        latest = (AadhaarChallenge.objects
                  .filter(aadhaar_number=aadhaar)
                  .exclude(reference_id__isnull=True).exclude(reference_id="")
                  .exclude(status__in=["VERIFIED", "FAILED", "EXPIRED"])
                  .order_by("-expires_at", "-created_at").first())
        reference_id = latest.reference_id if latest else ""

    challenge = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, reference_id=reference_id).order_by("-created_at").first()
    if challenge is None:
        return Response({"error": "We couldn't match this OTP to a request. Tap 'Resend OTP' to get a new code."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.status == "VERIFIED":
        return Response({"error": "This Aadhaar has already been verified."},
                        status=status.HTTP_400_BAD_REQUEST)
    if challenge.otp_attempts >= challenge.max_attempts:
        challenge.status = "FAILED"
        challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": "Too many attempts. Request a new OTP."},
                        status=status.HTTP_400_BAD_REQUEST)

    # The worker's mobile number is captured at Aadhaar signup and becomes a
    # second login identifier for this SAME account (the Aadhaar number stays
    # usable too). Validate it before spending a Sandbox verification, and make
    # sure it is not already attached to a different account — a phone belongs
    # to exactly one account, so it can never be used to open a new one.
    # The Aadhaar signup step asks only for the 12-digit Aadhaar (the OTP goes to
    # the Aadhaar-linked mobile), so `contact` is OPTIONAL here. When supplied it
    # is linked as a login id; otherwise the worker adds & verifies their mobile
    # afterwards (MobileClaimModal), which upserts the same credential.
    contact = _normalize_mobile(body.get("contact"))
    if contact and contact[0] not in "6789":
        return Response({"error": "Enter the 10-digit mobile number you want to use for this account."},
                        status=status.HTTP_400_BAD_REQUEST)
    aadhaar_cred = UserCredential.objects.filter(identity_type="aadhaar",
                                                 identity_value=aadhaar).first()
    if contact:
        mobile_owner = UserCredential.objects.filter(identity_type="mobile",
                                                     identity_value=contact).first()
        if mobile_owner is not None and (aadhaar_cred is None or mobile_owner.user_id != aadhaar_cred.user_id):
            return Response({"error": "This mobile number is already registered. Log in with it, or use a different number."},
                            status=status.HTTP_409_CONFLICT)

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
        raw_msg = str(data.get("message") or "").strip()
        # UIDAI/Sandbox reports the OTP lapsed. Mark our challenge expired (and
        # clear its local validity) so neither the reuse nor the reference
        # fallback can ever hand this dead reference back again; ask the user to
        # request a fresh code.
        if "expire" in raw_msg.lower():
            challenge.status = "EXPIRED"
            challenge.expires_at = timezone.now()
            challenge.save(update_fields=["status", "expires_at", "updated_at"])
            return Response({"error": "Your Aadhaar OTP has expired. Tap 'Resend OTP' to get a new code.",
                             "expired": True}, status=status.HTTP_400_BAD_REQUEST)
        msg = raw_msg or "Aadhaar verification failed. Check the OTP and try again."
        # A wrong OTP must NOT permanently kill the challenge: the user may have
        # mistyped, and marking it failed also blocks the reuse path, so the
        # Sandbox rate-limit then leaves them stuck. Only fail it once the
        # attempt budget is exhausted.
        if challenge.otp_attempts >= challenge.max_attempts:
            challenge.status = "FAILED"
            challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

    photo_url = ""
    user = None
    cred = aadhaar_cred
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
            # The mobile number is linked to the account after the create /
            # existing branches below, so it becomes a login identifier too.
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

    # Link the signup mobile to the account for BOTH first-time and returning
    # Aadhaar users. This makes the phone a login identifier on the SAME account
    # as the Aadhaar number, and (via the uniqueness check above) stops the phone
    # from ever opening a separate account.
    identity = WorkerIdentity.objects.filter(user=user).first()
    if identity is None:
        identity = WorkerIdentity.objects.create(
            user=user, bss_worker_id=bss_ids.new_bss_worker_id())
    if contact:
        identity.mobile_number = contact
        identity.save(update_fields=["mobile_number"])
        UserCredential.objects.filter(user=user, identity_type="mobile").exclude(
            identity_value=contact).delete()
        UserCredential.objects.update_or_create(
            user=user, identity_type="mobile", identity_value=contact,
            defaults={"is_primary": True, "verified": True})

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
    if not aadhaar or not otp:
        return Response({"error": "Aadhaar number and OTP are required"},
                        status=status.HTTP_400_BAD_REQUEST)
    # The client may not hold the reference (e.g. the send was rate-limited and
    # it still advanced to the OTP screen) — fall back to the latest request.
    if not reference_id:
        latest = (AadhaarChallenge.objects
                  .filter(aadhaar_number=aadhaar)
                  .exclude(reference_id__isnull=True).exclude(reference_id="")
                  .exclude(status__in=["VERIFIED", "FAILED", "EXPIRED"])
                  .order_by("-expires_at", "-created_at").first())
        reference_id = latest.reference_id if latest else ""

    challenge = AadhaarChallenge.objects.filter(
        aadhaar_number=aadhaar, reference_id=reference_id).order_by("-created_at").first()
    if challenge is None:
        return Response({"error": "We couldn't match this OTP to a request. Tap 'Resend OTP' to get a new code."},
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
        raw_msg = str(data.get("message") or "").strip()
        if "expire" in raw_msg.lower():
            challenge.status = "EXPIRED"
            challenge.expires_at = timezone.now()
            challenge.save(update_fields=["status", "expires_at", "updated_at"])
            return Response({"error": "Your Aadhaar OTP has expired. Tap 'Resend OTP' to get a new code.",
                             "expired": True}, status=status.HTTP_400_BAD_REQUEST)
        msg = raw_msg or "Aadhaar verification failed. Check the OTP and try again."
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
