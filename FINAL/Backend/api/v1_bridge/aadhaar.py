"""Aadhaar / DigiLocker verification and worker identity linking."""

import logging
import re
import time

from django.core.cache import cache as _cache

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Account-wide guardrails, shared by every gunicorn worker via the Redis cache
# (falls back to local memory when BSS_REDIS_URL is unset). These keep the whole
# install inside UIDAI's per-key limits and let bursts back-pressure gracefully
# instead of hammering the provider and locking everyone out.
# ---------------------------------------------------------------------------
def _provider_rate_ok() -> bool:
    """At most ``AADHAAR_PROVIDER_RPS`` OTP sends per second app-wide."""
    rps = max(1, settings.AADHAAR_PROVIDER_RPS)
    key = f"bss:aadhaar:rl:{int(time.time())}"
    try:
        if _cache.add(key, 1, timeout=2):
            return True
        return _cache.incr(key) <= rps
    except Exception:  # noqa: BLE001 — cache down: fail open (per-Aadhaar caps remain)
        return True


def _global_backoff_remaining() -> int:
    try:
        until = _cache.get("bss:aadhaar:backoff")
    except Exception:  # noqa: BLE001
        return 0
    return max(1, int(float(until) - time.time())) if until else 0


def _open_global_backoff(seconds=None):
    """Short, escalating account-wide backoff after a provider 429 (capped 5 min)."""
    base = int(seconds or settings.AADHAAR_GLOBAL_BACKOFF_SEC)
    try:
        n = int(_cache.get("bss:aadhaar:backoff_n") or 0) + 1
        _cache.set("bss:aadhaar:backoff_n", n, timeout=1800)
    except Exception:  # noqa: BLE001
        n = 1
    wait = min(base * (2 ** min(n - 1, 4)), 300)  # 20s → … → 5 min
    try:
        _cache.set("bss:aadhaar:backoff", time.time() + wait, timeout=wait + 5)
    except Exception:  # noqa: BLE001
        pass
    return wait


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


# ---------------------------------------------------------------------------
# Per-Aadhaar OTP policy — all enforced from persisted rows so a page refresh or
# a logout/login cannot reset the counters.
# ---------------------------------------------------------------------------
def _aadhaar_lock_remaining(aadhaar):
    """Seconds left on an active lockout for this Aadhaar (0 when none)."""
    now = timezone.now()
    row = (AadhaarChallenge.objects
           .filter(aadhaar_number=aadhaar, status="THROTTLED", expires_at__gt=now)
           .order_by("-expires_at").first())
    return max(1, int((row.expires_at - now).total_seconds())) if row else 0


def _lock_aadhaar(aadhaar, seconds):
    """Lock this Aadhaar's OTP flow for `seconds` (the 10-minute gap)."""
    AadhaarChallenge.objects.create(
        aadhaar_number=aadhaar, status="THROTTLED",
        expires_at=timezone.now() + timedelta(seconds=max(1, int(seconds))))


def _streak_start(aadhaar):
    """Start of the current attempt streak: just after the last lockout, else None."""
    last = (AadhaarChallenge.objects
            .filter(aadhaar_number=aadhaar, status="THROTTLED")
            .order_by("-created_at").first())
    return last.created_at if last else None


def _aadhaar_sends(aadhaar):
    """How many OTPs were sent in the current streak (1 initial + N resends)."""
    qs = AadhaarChallenge.objects.filter(aadhaar_number=aadhaar, status="OTP_SENT")
    start = _streak_start(aadhaar)
    if start is not None:
        qs = qs.filter(created_at__gt=start)
    return qs.count()


def _aadhaar_attempts(aadhaar):
    """Wrong-OTP verify attempts in the current streak (summed across OTPs)."""
    from django.db.models import Sum
    qs = (AadhaarChallenge.objects
          .filter(aadhaar_number=aadhaar)
          .exclude(status__in=["THROTTLED", "CALL"]))
    start = _streak_start(aadhaar)
    if start is not None:
        qs = qs.filter(created_at__gt=start)
    return int(qs.aggregate(n=Sum("otp_attempts"))["n"] or 0)


def _resolve_challenge(aadhaar, reference_id):
    """The challenge for this OTP, falling back to the latest live request when
    the client didn't hold the reference."""
    if not reference_id:
        latest = (AadhaarChallenge.objects
                  .filter(aadhaar_number=aadhaar, status="OTP_SENT")
                  .order_by("-created_at").first())
        reference_id = latest.reference_id if latest else ""
    if not reference_id:
        return None
    return (AadhaarChallenge.objects
            .filter(aadhaar_number=aadhaar, reference_id=reference_id)
            .order_by("-created_at").first())


def _verify_guard(aadhaar, reference_id):
    """Apply the lockout cap and resolve the challenge.

    Returns ``(challenge, error)`` — exactly one is set."""
    lock = _aadhaar_lock_remaining(aadhaar)
    if lock:
        return None, Response({
            "error": f"Too many attempts. Please try again in {_fmt_wait(lock)}.",
            "retryAfterSeconds": lock, "locked": True, "otpPending": True,
        }, status=status.HTTP_200_OK)
    challenge = _resolve_challenge(aadhaar, reference_id)
    if challenge is None:
        return None, Response({
            "error": "We couldn't match this OTP to a request. Request a new OTP.",
            "retryAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC, "otpPending": True,
        }, status=status.HTTP_400_BAD_REQUEST)
    if challenge.status == "VERIFIED":
        return None, Response({"error": "This Aadhaar has already been verified."},
                              status=status.HTTP_400_BAD_REQUEST)
    if challenge.status != "OTP_SENT":
        # The OTP was already used/expired — a new one is required.
        return None, Response({
            "error": "This OTP is no longer valid. Request a new OTP.",
            "retryAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC, "otpPending": True,
        }, status=status.HTTP_400_BAD_REQUEST)
    return challenge, None


def _verify_failure(aadhaar, challenge, raw_msg):
    """A wrong OTP: count it against the OTP. The user retries the SAME code until
    the attempts are used, then must request a new one (no auto-resend)."""
    if "expire" in (raw_msg or "").lower():
        challenge.status = "EXPIRED"
        challenge.expires_at = timezone.now()
        challenge.save(update_fields=["status", "expires_at", "updated_at"])
        return _expired_otp_response(aadhaar)
    challenge.otp_attempts += 1
    if challenge.otp_attempts >= challenge.max_attempts:
        challenge.status = "FAILED"
        challenge.save(update_fields=["otp_attempts", "status", "updated_at"])
        return Response({
            "error": "Too many incorrect attempts. Request a new OTP.",
            "wrong": True, "attemptsLeft": 0, "otpPending": True,
            "retryAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC,
        }, status=status.HTTP_400_BAD_REQUEST)
    challenge.save(update_fields=["otp_attempts", "updated_at"])
    left = max(0, challenge.max_attempts - challenge.otp_attempts)
    return Response({
        "error": f"Incorrect OTP — {left} attempt{'s' if left != 1 else ''} left.",
        "wrong": True, "attemptsLeft": left, "otpPending": True,
    }, status=status.HTTP_400_BAD_REQUEST)


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


def _expired_otp_response(aadhaar):
    """The OTP lapsed at UIDAI. Do NOT auto-resend (that would bypass the
    per-Aadhaar limits) — ask the user to request a new OTP via the resend control."""
    return Response({
        "error": "That OTP expired. Request a new OTP to continue.",
        "expired": True, "otpPending": True,
        "retryAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC,
    }, status=status.HTTP_200_OK)


def _send_otp(aadhaar, consent=True):
    """Send/resend a NEW Aadhaar oKYC OTP, enforcing all per-Aadhaar limits.

    Returns a Response. Success: ``{ referenceId, expiresIn, resendAfterSeconds,
    resendsLeft, attemptsAllowed }``. Throttled: ``{ error, retryAfterSeconds,
    otpPending, locked? }`` with HTTP 200 so the client can show a countdown.
    """
    now = timezone.now()

    # 1) Active lockout (resend cap hit, or a UIDAI 429 backoff).
    lock = _aadhaar_lock_remaining(aadhaar)
    if lock:
        return Response({
            "error": f"Too many OTP requests. Please try again in {_fmt_wait(lock)}.",
            "retryAfterSeconds": lock, "locked": True, "otpPending": True,
        }, status=status.HTTP_200_OK)

    # 2) One request per AADHAAR_RESEND_GAP_SEC (60s), persisted per Aadhaar.
    #    Only a *successful* send (OTP_SENT) starts the gap — a failed provider
    #    call (e.g. an expired subscription or an outage) must not leave the user
    #    stuck waiting 60s on a code that was never sent.
    last = (AadhaarChallenge.objects
            .filter(aadhaar_number=aadhaar, status="OTP_SENT")
            .order_by("-created_at").first())
    if last is not None:
        elapsed = (now - last.created_at).total_seconds()
        if elapsed < settings.AADHAAR_RESEND_GAP_SEC:
            wait = max(1, int(settings.AADHAAR_RESEND_GAP_SEC - elapsed))
            return Response({
                "error": f"Please wait {_fmt_wait(wait)} before requesting another OTP.",
                "retryAfterSeconds": wait, "otpPending": True,
            }, status=status.HTTP_200_OK)

    # 3) Resend cap: 1 initial + AADHAAR_MAX_RESENDS sends, then a 10-minute gap.
    if _aadhaar_sends(aadhaar) >= 1 + settings.AADHAAR_MAX_RESENDS:
        _lock_aadhaar(aadhaar, settings.AADHAAR_LOCK_SEC)
        return Response({
            "error": "You have reached the OTP request limit. Please try again after "
                     f"{_fmt_wait(settings.AADHAAR_LOCK_SEC)}.",
            "retryAfterSeconds": settings.AADHAAR_LOCK_SEC, "locked": True, "otpPending": True,
        }, status=status.HTTP_200_OK)

    # 4) Account-wide guardrails (Redis): after a provider 429 wait it out with a
    #    short backoff, and cap app-wide sends per second so a burst back-pressures
    #    instead of hammering UIDAI and locking everyone out.
    backoff = _global_backoff_remaining()
    if backoff:
        return Response({
            "error": f"Aadhaar service is busy — please try again in {_fmt_wait(backoff)}.",
            "retryAfterSeconds": backoff, "otpPending": True,
        }, status=status.HTTP_200_OK)
    if not _provider_rate_ok():
        return Response({
            "error": "Aadhaar service is busy — please try again in a moment.",
            "retryAfterSeconds": 2, "otpPending": True,
        }, status=status.HTTP_200_OK)

    AadhaarChallenge.objects.create(aadhaar_number=aadhaar, status="CALL")

    # Ask Sandbox to send a NEW OTP now.
    try:
        result = aadhaar_client.generate_otp(aadhaar)
    except aadhaar_client.SandboxError as exc:
        sb_status = getattr(exc, "status", 502)
        if sb_status == 429:
            # UIDAI rate-limits our whole key — brief account-wide backoff (short,
            # escalating) + a short per-Aadhaar wait, never a long global lock.
            _open_global_backoff()
            _lock_aadhaar(aadhaar, 60)
        if 400 <= sb_status < 500:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ref_id = (result.get("data") or {}).get("reference_id")
    if result.get("code") != 200 or not ref_id:
        msg = str((result.get("data") or {}).get("message") or "").strip() or \
            "Aadhaar verification service is currently experiencing delays."
        return Response({
            "error": msg, "retryAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC, "otpPending": True,
        }, status=status.HTTP_200_OK)

    challenge = AadhaarChallenge.objects.create(
        aadhaar_number=aadhaar,
        consent=consent,
        reference_id=str(ref_id),
        status="OTP_SENT",
        max_attempts=settings.AADHAAR_MAX_ATTEMPTS,
        expires_at=now + timedelta(minutes=settings.AADHAAR_OTP_TTL_MIN),
        response_json=json.dumps(result, default=str))

    sends = _aadhaar_sends(aadhaar)
    return Response({
        "referenceId": challenge.reference_id,
        "expiresIn": settings.AADHAAR_OTP_TTL_MIN * 60,
        "resendAfterSeconds": settings.AADHAAR_RESEND_GAP_SEC,
        "resendsLeft": max(0, settings.AADHAAR_MAX_RESENDS - max(0, sends - 1)),
        "attemptsAllowed": settings.AADHAAR_MAX_ATTEMPTS,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def aadhaar_otp(request):
    """Generate (or resend) a NEW Aadhaar oKYC OTP.

    Per-Aadhaar limits (persisted, so refresh/logout cannot bypass them): one
    request per ``AADHAAR_RESEND_GAP_SEC`` (60s); at most ``AADHAAR_MAX_RESENDS``
    (5) after the first, then a ``AADHAAR_LOCK_SEC`` (10 min) gap.
    """
    aadhaar = _sanitize_aadhaar((request.data or {}).get("aadhaar"))
    if not aadhaar:
        return Response({"error": "Enter a valid 12-digit Aadhaar number"},
                        status=status.HTTP_400_BAD_REQUEST)
    return _send_otp(aadhaar, consent=bool((request.data or {}).get("consent", True)))



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

    # Per-Aadhaar lockout/attempt caps + resolve the challenge (1 try per OTP).
    challenge, guard_error = _verify_guard(aadhaar, reference_id)
    if guard_error is not None:
        return guard_error
    reference_id = challenge.reference_id

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
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            # A provider 4xx (bad/reused session) — do not count it as a wrong try.
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    challenge.response_json = json.dumps(result, default=str)
    challenge.save(update_fields=["response_json", "updated_at"])

    data = result.get("data") or {}
    if result.get("code") != 200 or data.get("message") != "Aadhaar Card Exists":
        # Wrong OTP or a lapsed session — consume the OTP (1 try per OTP) and
        # enforce the attempt caps; the user must request a fresh code.
        return _verify_failure(aadhaar, challenge, str(data.get("message") or "").strip())

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

    # Per-Aadhaar lockout/attempt caps + resolve the challenge (1 try per OTP).
    challenge, guard_error = _verify_guard(aadhaar, reference_id)
    if guard_error is not None:
        return guard_error
    reference_id = challenge.reference_id

    try:
        result = aadhaar_client.verify_otp(reference_id, otp)
    except aadhaar_client.SandboxError as exc:
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    challenge.response_json = json.dumps(result, default=str)
    challenge.save(update_fields=["response_json", "updated_at"])

    data = result.get("data") or {}
    if result.get("code") != 200 or data.get("message") != "Aadhaar Card Exists":
        return _verify_failure(aadhaar, challenge, str(data.get("message") or "").strip())

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
