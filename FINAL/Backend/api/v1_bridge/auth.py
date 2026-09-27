"""Login, OTP, MPIN and account registration endpoints."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    body = request.data or {}
    role = body.get("role")
    method = body.get("method") or "password"
    identifier = body.get("identifier")
    credential = body.get("credential") or ""

    requested_roles = _requested_roles(role)

    if not identifier:
        return Response({"error": "identifier is required"}, status=status.HTTP_401_UNAUTHORIZED)

    user = _find_user(identifier)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    if requested_roles and user.role not in requested_roles:
        label = PORTAL_ROLE.get(user.role, user.role)
        return Response({"error": f"This account is registered as a {label}. Please use the {label} portal."},
                        status=status.HTTP_401_UNAUTHORIZED)

    if not _verify_credential(user, method, credential):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({"error": "Account is disabled"}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(_make_session_payload(user), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def otp_challenge(request):
    body = request.data or {}
    identifier = body.get("identifier")
    mode = str(body.get("mode") or "login").strip().lower()
    role = body.get("role")
    if not identifier:
        return Response({"error": "identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
    user = _find_user(identifier)
    if mode == "register":
        if user is not None:
            label = PORTAL_ROLE.get(user.role, user.role)
            return Response(
                {"error": f"This mobile is already registered as a {label} account. Please log in instead."},
                status=status.HTTP_409_CONFLICT)
        mobile = _normalize_mobile(identifier)
        if not mobile:
            return Response({"error": "Enter a valid 10-digit mobile number to register."},
                            status=status.HTTP_400_BAD_REQUEST)
    else:
        if user is None:
            return Response(
                {"error": "No account found for this BSS ID / mobile number. Please register first."},
                status=status.HTTP_404_NOT_FOUND)
        # A phone belongs to exactly one account/role — never issue an OTP for a
        # different portal than the one the number is registered under.
        requested_roles = _requested_roles(role)
        if requested_roles and user.role not in requested_roles:
            label = PORTAL_ROLE.get(user.role, user.role)
            return Response(
                {"error": f"This mobile is registered as a {label} account. Please use the {label} portal."},
                status=status.HTTP_403_FORBIDDEN)
        mobile = _user_mobile(user)
    if not _otp_send_allowed("register" if mode == "register" else "login", mobile):
        return Response({"error": "Too many OTP requests. Please try again in a few minutes."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    otp = _issue_otp(mobile, purpose="LOGIN")
    return Response({
        "challengeId": f"login-otp-{otp.id}",
        "expiresIn": 300,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mpin_set(request):
    """Set/replace the caller's MPIN (hashed) on their mobile credential.

    OTP-gated: first call with {action:'request-otp'} to send an OTP to the
    account's mobile, then submit {mpin, otp} to save it.
    """
    body = request.data or {}
    action = str(body.get("action") or "set").lower()
    mobile = _user_mobile(request.user)
    if action in ("request-otp", "send-otp"):
        if not mobile:
            return Response({"error": "No mobile number on your account. Add one first."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _otp_send_allowed("credential", request.user.id):
            return Response({"error": "Too many OTP requests. Please try again in a few minutes."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        _issue_otp(mobile, purpose="LOGIN")
        return Response({"otpSent": True, "mobile": ("*" * 6) + mobile[-4:], "expiresIn": 300},
                        status=status.HTTP_200_OK)
    mpin = str(body.get("mpin") or "").strip()
    otp_value = str(body.get("otp") or "").strip()
    if not _MPIN_RE.fullmatch(mpin):
        return Response({"error": "MPIN must be 4-6 digits."}, status=status.HTTP_400_BAD_REQUEST)
    if not otp_value:
        return Response({"error": "Enter the OTP sent to your mobile."}, status=status.HTTP_400_BAD_REQUEST)
    if not _verify_login_otp(mobile, otp_value):
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
    cred = _mobile_credential_for(request.user)
    cred.mpin_hash = make_password(mpin)
    cred.save(update_fields=["mpin_hash"])
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def password_set(request):
    """Set/replace the caller's login password. OTP-gated (same flow as MPIN)."""
    body = request.data or {}
    action = str(body.get("action") or "set").lower()
    mobile = _user_mobile(request.user)
    if action in ("request-otp", "send-otp"):
        if not mobile:
            return Response({"error": "No mobile number on your account. Add one first."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _otp_send_allowed("credential", request.user.id):
            return Response({"error": "Too many OTP requests. Please try again in a few minutes."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        _issue_otp(mobile, purpose="LOGIN")
        return Response({"otpSent": True, "mobile": ("*" * 6) + mobile[-4:], "expiresIn": 300},
                        status=status.HTTP_200_OK)
    password = str(body.get("password") or "")
    otp_value = str(body.get("otp") or "").strip()
    if len(password) < 8:
        return Response({"error": "Password must be at least 8 characters."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not otp_value:
        return Response({"error": "Enter the OTP sent to your mobile."}, status=status.HTTP_400_BAD_REQUEST)
    if not _verify_login_otp(mobile, otp_value):
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(password)
    request.user.save(update_fields=["password"])
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([AllowAny])
def mpin_reset(request):
    """Reset an MPIN after verifying a LOGIN OTP (forgot-MPIN path)."""
    identifier = str(request.data.get("identifier") or "").strip()
    otp_value = str(request.data.get("otp") or "").strip()
    mpin = str(request.data.get("mpin") or "").strip()
    if not _MPIN_RE.fullmatch(mpin):
        return Response({"error": "MPIN must be 4-6 digits."}, status=status.HTTP_400_BAD_REQUEST)
    user = _find_user(identifier)
    if user is None:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    if not _verify_login_otp(_user_mobile(user), otp_value):
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
    cred = _mobile_credential_for(user)
    cred.mpin_hash = make_password(mpin)
    cred.save(update_fields=["mpin_hash"])
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_claim_mobile(request):
    """Aadhaar-onboarded workers have no mobile number (UIDAI never returns it).
    This lets the signed-in worker add their mobile via an SMS OTP; once verified
    it becomes their login/contact number.

    body: {action:'request-otp'|'verify', mobile, otp?}
    """
    if request.user.role != "worker":
        return Response({"error": "Workers only."}, status=status.HTTP_403_FORBIDDEN)
    body = request.data or {}
    action = str(body.get("action") or "request-otp").lower()
    mobile = _normalize_mobile(body.get("mobile"))
    if not mobile:
        return Response({"error": "Enter a valid 10-digit Indian mobile number."},
                        status=status.HTTP_400_BAD_REQUEST)
    taken = (UserCredential.objects.filter(identity_type="mobile", identity_value=mobile)
             .exclude(user=request.user).exists())
    if action == "request-otp":
        if taken:
            return Response({"error": "This mobile is already linked to another account."},
                            status=status.HTTP_409_CONFLICT)
        if not _otp_send_allowed("claim", request.user.id):
            return Response({"error": "Too many OTP requests. Please try again in a few minutes."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        _issue_otp(mobile, purpose="LOGIN")
        return Response({"sent": True, "mobile": ("*" * 6) + mobile[-4:], "expiresIn": 300},
                        status=status.HTTP_200_OK)
    if action == "verify":
        otp_value = str(body.get("otp") or "").strip()
        if not _verify_login_otp(mobile, otp_value):
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
        if taken:
            return Response({"error": "This mobile is already linked to another account."},
                            status=status.HTTP_409_CONFLICT)
        identity = WorkerIdentity.objects.filter(user=request.user).first()
        if identity is None:
            identity = WorkerIdentity.objects.create(user=request.user,
                                                     bss_worker_id=bss_ids.new_bss_worker_id())
        identity.mobile_number = mobile
        identity.save(update_fields=["mobile_number"])
        UserCredential.objects.filter(user=request.user, identity_type="mobile").delete()
        UserCredential.objects.create(user=request.user, identity_type="mobile",
                                      identity_value=mobile, is_primary=True, verified=True)
        return Response({"ok": True, "mobile": mobile}, status=status.HTTP_200_OK)
    return Response({"error": "Unsupported action."}, status=status.HTTP_400_BAD_REQUEST)


def _register_account(request, role):
    """Shared self-registration for worker / contractor / employer.

    Mirrors the worker flow for organisation roles: verified contact + OTP,
    creates the User + role profile with a random BSS ID, and returns the same
    session payload so the frontend can sign the account in immediately.
    """
    body = request.data or {}
    role = role.lower()
    if role not in _REGISTRATION:
        return Response({"error": "unsupported role"}, status=status.HTTP_400_BAD_REQUEST)
    contact = (body.get("contact") or "").strip()
    accepted = body.get("acceptedTerms", False)
    if not accepted:
        return Response({"error": "terms must be accepted"}, status=status.HTTP_400_BAD_REQUEST)
    if not contact:
        return Response({"error": "contact is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Canonical phone so formatting variants (+91…, 0…, spaces) cannot create a
    # second account for the same number.
    mobile = _normalize_mobile(contact) or contact

    otp_value = body.get("otp")
    if otp_value and not _verify_login_otp(mobile, otp_value):
        return Response({"error": "invalid or expired OTP"}, status=status.HTTP_401_UNAUTHORIZED)

    existing = _find_user(mobile)
    if existing is not None:
        label = PORTAL_ROLE.get(existing.role, existing.role)
        return Response(
            {"error": f"This mobile is already registered as a {label} account. Please log in instead."},
            status=status.HTTP_409_CONFLICT)

    identifier = f"{role}_{mobile[-10:]}" if len(mobile) > 10 else f"{role}_{mobile}"
    if User.objects.filter(username=identifier).exists():
        identifier = f"{role}_{mobile[-10:]}_{uuid.uuid4().hex[:4]}"

    with transaction.atomic():
        user = User.objects.create_user(
            username=identifier, password=_REGISTRATION[role]["password"],
            role=role, account_active=True, is_verified=True, is_active=True)
        if role == "worker":
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                name="", mobile_number=mobile)
            WorkerOther.objects.get_or_create(user=user)
            _record_registration_consent(user)
            _ensure_id_card_dates(user)
            bss_id = identity.bss_worker_id
        elif role == "contractor":
            profile = ContractorProfile.objects.create(
                user=user, contractor_name="", contractor_code=bss_ids.new_bss_contractor_code(),
                approval_status="PENDING", mobile=mobile)
            # acceptedTerms is already required above, so consent is genuinely
            # given here — stamp it so "Member of BSS since" has a real source.
            _record_contractor_membership(profile, user, consent_given=True)
            bss_id = profile.contractor_code
        else:  # employer
            profile = EmployerProfile.objects.create(
                user=user, employer_name="", employer_code=bss_ids.new_bss_employer_code(),
                approval_status="PENDING", mobile=mobile)
            bss_id = profile.employer_code
        UserCredential.objects.create(
            identity_type="mobile", identity_value=mobile,
            user=user, is_primary=True, verified=True)

    payload = _make_session_payload(user)
    payload["bssId"] = bss_id
    payload["subject"] = user.username
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_worker(request):
    return _register_account(request, "worker")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_contractor(request):
    return _register_account(request, "contractor")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_employer(request):
    return _register_account(request, "employer")


__all__ = [
    "_register_account",
    "login",
    "mpin_reset",
    "mpin_set",
    "password_set",
    "otp_challenge",
    "register_contractor",
    "register_employer",
    "register_worker",
    "worker_claim_mobile",
]
