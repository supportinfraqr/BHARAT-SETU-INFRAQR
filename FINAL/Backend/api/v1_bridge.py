"""BSS /v1/ compatibility API bridge.

Implements the "BSS upstream service" contract expected by the external Next.js
frontend, on top of this Django/DRF backend. Public endpoints (auth, geography,
identity verify) use AllowAny; everything else relies on a session made up of a
simplejwt Bearer token plus X-BSS-* headers (with demo tolerance when only the
headers are supplied).
"""

import json
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import BaseAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from bss_core.models import (
    AadhaarChallenge,
    ApprovalQueue,
    ContractorProfile,
    EmployerProfile,
    Notification,
    Site,
    SmsOtp,
    SubmissionEvidence,
    User,
    UserCredential,
    WorkerAddressMobility,
    WorkerBanking,
    WorkerClassification,
    ContractorEmployerBinding,
    ContractorSiteAllotment,
    WorkerContractorBinding,
    WorkerEducation,
    WorkerEmployment,
    WorkerFamilyDependant,
    WorkerGatePass,
    WorkerIdentity,
    WorkerOther,
    UserPreference,
    WorkerSkill,
    WorkerSkillsEmployability,
    WorkerSocialSecurity,
    WorkerWelfareSafety,
)
from . import aadhaar_client, bss_ids, ocr_client, v1_payloads as payloads


def _bss_worker_id(user_id):
    """Collision-free 15-char worker ID: 'BSS-W' + the User primary key
    zero-padded to 10 digits. The PK is unique, so IDs never collide."""
    return f"BSS-W{user_id:010d}"


def _record_registration_consent(user, source="Self Registered via App",
                                 registered_by="Worker Self-Service (BSS App)"):
    """Stamp the registration + consent audit record on worker sign-up."""
    obj, created = WorkerOther.objects.get_or_create(user=user)
    today = timezone.now().date()
    if created or not obj.registration_date:
        obj.registration_date = today
    if obj.consent_date is None:
        obj.consent_date = today
    if obj.consent_registration is None:
        obj.consent_registration = True
    if obj.consent_verification is None:
        obj.consent_verification = True
    if not obj.registration_source:
        obj.registration_source = source
    if not obj.registered_by:
        obj.registered_by = registered_by
    obj.save()
    return obj


# Field-label -> model-attribute maps for the employer/contractor profile
# "profile" PATCH (the FE sends {section, fields:[{label,value}]}).
_PROFILE_LABEL_MAP = {
    "employer": {
        "Registration Status": "approval_status",
        "Employer Category": "employer_category",
        "Legal Entity Name": "employer_name",
        "Trade / Brand Name": "trade_name",
        "Ownership Type": "ownership",
        "CIN / LLPIN / Registration No.": "cin",
        "ROC": "roc",
        "Registration Number": "registration_number",
        "Class of Company": "entity_class",
        "NIC Code": "nic_code",
        "Number of Members": "members_count",
        "Authorised Share Capital": "authorized_capital",
        "Paid-up Share Capital": "paid_up_capital",
        "Date of Incorporation": "incorporation_date",
        "PAN": "pan_no",
        "GSTIN": "gstin",
        "Industry / Sector": "industry",
        "Corporate Website": "corporate_website",
        "Authorised Signatory Name": "contact_person",
        "Official Mobile": "mobile",
        "Official Email": "email",
        "Registered Address": "address",
        "State": "state",
        "District": "district",
        "Identity Verification Status": "verification_status",
        "Verification Date": "verification_date",
        "Verification Source": "verification_source",
        "PAN Verification Status": "pan_verification_status",
        "GST Verification Status": "gst_verification_status",
        "LIN": "lin",
        "Workforce Model": "workforce_model",
        "Total Workers - Current": "total_headcount",
        "Payroll Frequency": "payroll_frequency",
        "Wage Period": "wage_period",
        "Attendance Method": "attendance_method",
        "Worker Onboarding Method": "onboarding_method",
        "PF Coverage": "pf_coverage",
        "ESIC Coverage": "esic_coverage",
        "Gratuity Coverage": "gratuity_coverage",
        "LWF Coverage": "lwf_coverage",
        "Group Medical Insurance": "medical_insurance",
        "Accident Insurance": "accident_insurance",
        "Medical Examination Process": "medical_exam_enabled",
        "First Aid Facility": "first_aid_enabled",
        "PPE Management": "ppe_provision",
        "Safety Training": "safety_training_enabled",
        "Site Induction": "site_induction_enabled",
        "Emergency Response Plan": "emergency_plan_enabled",
        "Fire Safety Certificate": "fire_certificate",
        "Canteen Facility": "canteen_facility",
        "Creche Facility": "creche_facility",
        "Transport Facility": "transport_facility",
        "Accommodation / Camp Facility": "accommodation_facility",
        "Worker Grievance Mechanism": "grievance_mechanism",
        "Grievance Officer": "grievance_officer_name",
        "Internal Complaints Committee / POSH": "posh_icc",
        "Standing Orders / Service Rules": "standing_orders",
        "Worker Communication Channel": "communication_channel",
        "Default Approval SLA (days)": "default_approval_sla_days",
        "Compliance Reminder Window (days)": "compliance_reminder_window_days",
        "Preferred Reporting Period": "preferred_reporting_period",
        "Escalation Contact": "escalation_contact",
    },
    "contractor": {
        "Contractor Type": "entity_type",
        "Legal Name": "contractor_name",
        "Trade / Brand Name": "trade_name",
        "Entity Constitution": "constitution",
        "Authorised Person Name": "contact_person",
        "Mobile Number": "mobile",
        "Email ID": "email",
        "Activity": "activity",
        "NIC Code": "nic_code",
        "PAN": "pan_no",
        "GSTIN": "gstin",
        "Udyam Registration Number": "udyam_no",
        "Labour Department Registration Number": "labour_dept_reg_no",
        "Contract Labour Licence Number": "clra_licence_no",
        "BOCW / Other Labour Registration": "bocw_reg_no",
        "Licence Valid From": "licence_valid_from",
        "Licence Valid To": "licence_valid_to",
        "Registered Address": "address",
        "State / UT": "state",
        "Operating States": "operating_states",
        "Principal Employer Name": "employer_name",
        "Onboarding Method": "onboarding_method",
        "Attendance Method": "attendance_method",
        "Payroll Method": "payroll_method",
    },
}

# ---------------------------------------------------------------------------
# Role / portal mapping
# ---------------------------------------------------------------------------
PORTAL_ROLE = {
    "worker": "Worker",
    "contractor": "Contractor",
    "employer": "Employer",
    "government": "Government",
    "bss_staff": "BSS Staff",
    "bss_admin": "BSS Admin",
}


# ---------------------------------------------------------------------------
# Demo-tolerant session authentication
# ---------------------------------------------------------------------------
class BssSessionAuthentication(BaseAuthentication):
    """Validate a simplejwt Bearer token if supplied; otherwise trust the
    X-BSS-Subject header (demo tolerance for headers-only callers)."""

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            try:
                return JWTAuthentication().authenticate(request)
            except Exception:
                pass
        subject = request.META.get("HTTP_X_BSS_SUBJECT", "")
        if subject:
            try:
                user = User.objects.get(username=subject)
            except User.DoesNotExist:
                return None
            return (user, None)
        return None


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def _make_session_payload(user):
    access, refresh = _issue_tokens(user)
    role = user.role
    return {
        "subject": user.username,
        "role": PORTAL_ROLE.get(role, role),
        "sessionId": str(uuid.uuid4()),
        "accessToken": access,
        "refreshToken": refresh,
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    body = request.data or {}
    role = body.get("role")
    method = body.get("method") or "password"
    identifier = body.get("identifier")
    credential = body.get("credential") or ""

    requested_roles = None
    if role:
        role_lower = role.lower()
        requested_roles = [portal for portal, label in PORTAL_ROLE.items() if label.lower() == role_lower]
    if not requested_roles:
        requested_roles = [role] if role in dict(User.ROLE_CHOICES) else None

    if not identifier:
        return Response({"error": "identifier is required"}, status=status.HTTP_401_UNAUTHORIZED)

    user = _find_user(identifier)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    if requested_roles and user.role not in requested_roles:
        return Response({"error": "Role mismatch for this account"},
                        status=status.HTTP_401_UNAUTHORIZED)

    if not _verify_credential(user, method, credential):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({"error": "Account is disabled"}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(_make_session_payload(user), status=status.HTTP_200_OK)


def _find_user(identifier):
    user = User.objects.filter(username=identifier).first()
    if user:
        return user
    cred = UserCredential.objects.filter(identity_value=identifier).first()
    if cred:
        return cred.user
    # BSS ID lookup (worker / contractor / employer). Codes are stored
    # uppercase (random alphanumeric); tolerate lowercase / surrounding
    # whitespace from manual entry and legacy numeric IDs.
    bss_id = identifier.strip().upper()
    wi = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if wi:
        return wi.user
    cp = ContractorProfile.objects.filter(contractor_code=bss_id).first()
    if cp:
        return cp.user
    ep = EmployerProfile.objects.filter(employer_code=bss_id).first()
    if ep:
        return ep.user
    return None


def _user_mobile(user):
    for cred in user.credentials.all():
        if cred.identity_type in ("mobile", "phone"):
            return cred.identity_value
    identity = WorkerIdentity.objects.filter(user=user).first()
    if identity and identity.mobile_number:
        return identity.mobile_number
    return user.username


def _generate_otp_value():
    return "{:06d}".format(secrets.randbelow(1_000_000))


def _verify_credential(user, method, credential):
    if method == "password":
        return user.check_password(credential)
    if method == "otp":
        mobile = _user_mobile(user)
        otp = SmsOtp.objects.filter(mobile=mobile, purpose="LOGIN").order_by("-created_at").first()
        if otp is None:
            return False
        if otp.is_expired:
            return False
        if otp.attempts >= otp.max_attempts:
            return False
        if not check_password(str(credential), otp.otp_hash):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            return False
        otp.verified = True
        otp.save(update_fields=["verified"])
        return True
    if method == "mpin":
        for cred in user.credentials.all():
            if cred.mpin_hash and check_password(str(credential), cred.mpin_hash):
                return True
        return False
    return False


def _demo_otp_mobiles():
    raw = os.environ.get("BSS_DEMO_OTP_MOBILES", "")
    return {m.strip() for m in raw.split(",") if m.strip()}


def _issue_otp(mobile, purpose="LOGIN", ttl_minutes=5):
    # Demo accounts: a fixed OTP (no real delivery) for LOGIN only. Enabled by
    # setting BSS_DEMO_OTP_MOBILES to the whitelist (empty = disabled).
    demo = purpose == "LOGIN" and str(mobile) in _demo_otp_mobiles()
    value = os.environ.get("BSS_DEMO_OTP", "123456") if demo else _generate_otp_value()
    otp = SmsOtp.objects.create(
        mobile=mobile,
        purpose=purpose,
        otp_hash=make_password(value),
        expires_at=timezone.now() + timedelta(minutes=ttl_minutes),
        max_attempts=int(os.environ.get("BSS_OTP_MAX_ATTEMPTS") or 5),
    )
    if demo:
        logging.getLogger(__name__).info("Demo login OTP for %s: %s", mobile, value)
    else:
        _deliver_otp_async(otp.pk, mobile, value, ttl_minutes)
    return otp


def _deliver_otp_async(otp_pk, mobile, otp_value, ttl_minutes):
    """Send the OTP over WhatsApp in the background and record the gateway result
    on the SmsOtp row for observability."""
    from . import whatsapp_client

    whatsapp_client.deliver_async(otp_pk, mobile, otp_value, ttl_minutes)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def otp_challenge(request):
    body = request.data or {}
    identifier = body.get("identifier")
    if not identifier:
        return Response({"error": "identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
    user = _find_user(identifier)
    if user is not None:
        mobile = _user_mobile(user)
    else:
        digits = "".join(ch for ch in str(identifier) if ch.isdigit())
        if len(digits) < 10:
            return Response({"error": "unrecognized identifier"}, status=status.HTTP_404_NOT_FOUND)
        mobile = str(identifier)
    otp = _issue_otp(mobile, purpose="LOGIN")
    return Response({
        "challengeId": f"login-otp-{otp.id}",
        "expiresIn": 300,
    }, status=status.HTTP_200_OK)


def _verify_login_otp(contact, credential):
    otp = SmsOtp.objects.filter(mobile=contact, purpose="LOGIN").order_by("-created_at").first()
    if otp is None:
        return False
    if otp.is_expired or otp.attempts >= otp.max_attempts:
        return False
    if not check_password(str(credential), otp.otp_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False
    otp.verified = True
    otp.save(update_fields=["verified"])
    return True


_MPIN_RE = re.compile(r"^\d{4,6}$")


def _mobile_credential_for(user):
    cred = user.credentials.filter(identity_type__in=("mobile", "phone")).first()
    if cred is None:
        cred = UserCredential.objects.create(
            user=user, identity_type="mobile", identity_value=_user_mobile(user),
            is_primary=True, verified=False)
    return cred


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mpin_set(request):
    """Set/replace the caller's MPIN (hashed) on their mobile credential."""
    mpin = str(request.data.get("mpin") or "").strip()
    if not _MPIN_RE.fullmatch(mpin):
        return Response({"error": "MPIN must be 4-6 digits."}, status=status.HTTP_400_BAD_REQUEST)
    cred = _mobile_credential_for(request.user)
    cred.mpin_hash = make_password(mpin)
    cred.save(update_fields=["mpin_hash"])
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
    mobile = "".join(ch for ch in str(body.get("mobile") or "") if ch.isdigit())
    if len(mobile) != 10 or mobile[0] not in "6789":
        return Response({"error": "Enter a valid 10-digit Indian mobile number."},
                        status=status.HTTP_400_BAD_REQUEST)
    taken = (UserCredential.objects.filter(identity_type="mobile", identity_value=mobile)
             .exclude(user=request.user).exists())
    if action == "request-otp":
        if taken:
            return Response({"error": "This mobile is already linked to another account."},
                            status=status.HTTP_409_CONFLICT)
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


# ---------------------------------------------------------------------------
# Aadhaar oKYC signup (Sandbox.co.in)
# ---------------------------------------------------------------------------
_AADHAAR_RE = re.compile(r"^\d{12}$")


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
    """A worker ID card is valid for one year from its issue date (29 Feb is
    clamped to 28 Feb in non-leap years)."""
    try:
        return issue.replace(year=issue.year + 1)
    except ValueError:
        return issue.replace(year=issue.year + 1, day=28)


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


def _aadhaar_care_of_parts(care_of):
    """Map UIDAI ``care_of`` (e.g. "S/O: Talat Parvez", "W/O: ...") to
    (father_name, spouse_name). UIDAI exposes no separate parent/spouse fields
    and never returns the mother's name, so only these two can be derived.
    ``C/O`` (care of) is an ambiguous guardian and is left unfilled."""
    raw = str(care_of or "").strip()
    if not raw:
        return "", ""
    relation, _, name = raw.replace(":", " ").partition(" ")
    relation = relation.upper().replace(".", "")
    name = name.strip()
    if not name:
        return "", ""
    if relation in ("S/O", "SO", "D/O", "DO"):
        return name, ""
    if relation in ("W/O", "WO", "H/O", "HO"):
        return "", name
    return "", ""


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

    try:
        result = aadhaar_client.generate_otp(aadhaar)
    except aadhaar_client.SandboxError as exc:
        sb_status = getattr(exc, "status", 502)
        if 400 <= sb_status < 500:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": f"Aadhaar (UIDAI) service is temporarily unavailable — {str(exc)}. Please try again later."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ref_id = (result.get("data") or {}).get("reference_id")
    if result.get("code") != 200 or not ref_id:
        msg = str((result.get("data") or {}).get("message") or "").strip() or \
            "Aadhaar verification service is currently experiencing delays."
        # Sandbox rate-limits OTP generation ("...please try after 45 seconds").
        # If an OTP was already sent for this Aadhaar and its reference is still
        # live, reuse it so the worker can enter the OTP they already received
        # instead of hitting a dead end.
        recent = (AadhaarChallenge.objects
                  .filter(aadhaar_number=aadhaar, expires_at__gt=timezone.now())
                  .exclude(reference_id__isnull=True).exclude(reference_id="")
                  .order_by("-created_at").first())
        if recent is not None:
            remaining = max(0, int((recent.expires_at - timezone.now()).total_seconds()))
            return Response({
                "referenceId": recent.reference_id,
                "expiresIn": remaining,
                "message": msg,
                "reused": True,
            }, status=status.HTTP_200_OK)
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
    if challenge.is_expired:
        challenge.status = "EXPIRED"
        challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": "OTP expired. Request a new OTP."},
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
            parts = _aadhaar_address_parts(data)
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
    if challenge.is_expired:
        challenge.status = "EXPIRED"
        challenge.save(update_fields=["status", "updated_at"])
        return Response({"error": "OTP expired. Request a new OTP."},
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
    identity.save()

    a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
    parts = _aadhaar_address_parts(data)
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


_REGISTRATION = {
    "worker": {"password": "Bss@Worker123"},
    "contractor": {"password": "Bss@Contractor123"},
    "employer": {"password": "Bss@Employer123"},
}


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

    otp_value = body.get("otp")
    if otp_value and not _verify_login_otp(contact, otp_value):
        return Response({"error": "invalid or expired OTP"}, status=status.HTTP_401_UNAUTHORIZED)

    identifier = f"{role}_{contact[-10:]}" if len(contact) > 10 else f"{role}_{contact}"
    if User.objects.filter(username=identifier).exists():
        identifier = f"{role}_{contact[-10:]}_{uuid.uuid4().hex[:4]}"

    with transaction.atomic():
        user = User.objects.create_user(
            username=identifier, password=_REGISTRATION[role]["password"],
            role=role, account_active=True, is_verified=True, is_active=True)
        if role == "worker":
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                name="", mobile_number=contact)
            WorkerOther.objects.get_or_create(user=user)
            _record_registration_consent(user)
            _ensure_id_card_dates(user)
            bss_id = identity.bss_worker_id
        elif role == "contractor":
            profile = ContractorProfile.objects.create(
                user=user, contractor_name="", contractor_code=bss_ids.new_bss_contractor_code(),
                approval_status="PENDING", mobile=contact)
            bss_id = profile.contractor_code
        else:  # employer
            profile = EmployerProfile.objects.create(
                user=user, employer_name="", employer_code=bss_ids.new_bss_employer_code(),
                approval_status="PENDING", mobile=contact)
            bss_id = profile.employer_code
        UserCredential.objects.get_or_create(
            identity_type="mobile", identity_value=contact,
            defaults={"user": user, "is_primary": True, "verified": True})

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


# ---------------------------------------------------------------------------
# Portals
# ---------------------------------------------------------------------------
@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_portal(request):
    return Response(payloads.build_worker_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_portal(request):
    return Response(payloads.build_contractor_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_portal(request):
    return Response(payloads.build_employer_portal(request.user), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def government_portal(request):
    return Response(payloads.build_government_portal(), status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Operations (admin / staff)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_operations(request):
    return Response(payloads.build_operations("BSS Admin"), status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_operations(request):
    return Response(payloads.build_operations("BSS Staff"), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_actions(request):
    body = request.data or {}
    action = body.get("action") or "run"
    return Response({
        "success": True,
        "message": "Action completed",
        "output": [],
        "completedAt": payloads._dts(timezone.now()),
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def bss_staff_actions(request):
    body = request.data or {}
    action = body.get("action") or "run"
    return Response({
        "success": True,
        "message": "Action completed",
        "output": [],
        "completedAt": payloads._dts(timezone.now()),
    }, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Geography / identity (public)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def geography(request):
    pin = request.query_params.get("pin")
    if pin:
        loc = payloads.geography_lookup(pin)
        if not loc:
            return Response({"error": "PIN not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": loc}, status=status.HTTP_200_OK)
    return Response({"data": payloads.government_geography()}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def identity_verify(request, bss_id):
    data = payloads.build_identity_verify(bss_id)
    if data is None:
        return Response({"error": "Unknown identity"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"data": data, "verifiedAt": payloads._dts(
        timezone.now())},
        status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Notifications (session)
# ---------------------------------------------------------------------------
@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def notifications(request, role_path):
    user = request.user
    if request.method == "GET":
        return Response(payloads.build_notifications(user), status=status.HTTP_200_OK)

    body = request.data or {}
    notif_id = body.get("id")
    action = body.get("action")
    if not notif_id:
        return Response({"error": "id is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        notif = Notification.objects.get(id=notif_id, user=user)
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
    if action == "read":
        notif.is_read = True
        notif.save(update_fields=["is_read"])
    elif action == "unread":
        notif.is_read = False
        notif.save(update_fields=["is_read"])
    elif action == "resolve":
        notif.is_read = True
        notif.save(update_fields=["is_read"])
    else:
        return Response({"error": "invalid action"}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"success": True, "data": {"id": notif.id, "action": action}},
                    status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Resource mutations (POST/PATCH/DELETE /v1/<rolePath>/<resource>)
# ---------------------------------------------------------------------------
class PortalMutationError(Exception):
    """Raised by resource handlers to reject a mutation with a clear message."""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@api_view(["POST", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mutate_portal(request, role_path, resource):
    user = request.user
    body = request.data or {}
    try:
        result = _persist_mutation(user, role_path, resource, request.method, body)
    except PortalMutationError as exc:
        return Response({"error": exc.message}, status=exc.status_code)

    if request.method == "DELETE":
        return Response({"success": True, "deleted": True, "id": result},
                        status=status.HTTP_200_OK)

    if isinstance(result, (dict, list)):
        # Handler returned fully-serialised record(s) (leave, gate passes) — pass through.
        return Response({"success": True, "data": result, "updatedAt": payloads._dts(timezone.now())},
                        status=status.HTTP_200_OK)

    out = dict(body or {})
    out["id"] = result
    updated_at = payloads._dts(timezone.now())
    return Response({"success": True, "data": out, "updatedAt": updated_at},
                    status=status.HTTP_200_OK)


def _persist_mutation(user, role_path, resource, method, body):
    """Best-effort persistence for the handful of resources backed by real
    models; returns an id for the generic/unmapped case."""
    if resource == "profile" and user.role in ("employer", "contractor") and method in ("PATCH", "POST"):
        # Employer/Contractor profile "profile" PATCH — persist the section
        # fields ({section, fields:[{label,value}]}) into the profile model.
        section = body.get("section")
        fields = body.get("fields") or []
        if section and fields:
            profile_model = (EmployerProfile if user.role == "employer" else ContractorProfile)
            label_map = _PROFILE_LABEL_MAP[user.role]
            prof, _ = profile_model.objects.get_or_create(user=user)
            for field in fields:
                label = (field.get("label") or "").strip()
                attr = label_map.get(label)
                if not attr or not hasattr(prof, attr):
                    continue
                if attr == "mobile":
                    # The registered mobile is the login identity — immutable for
                    # every role. Ignore any attempt to change it.
                    continue
                setattr(prof, attr, (field.get("value") or "").strip())
            prof.save()
            return prof.id
        return int(uuid.uuid4().int % 10**10)
    if resource == "profile" and user.role == "worker" and method in ("PATCH", "POST"):
        # Worker portal "profile" PATCH — persist editable identity sub-fields.
        identity = WorkerIdentity.objects.filter(user=user).first()
        if not identity:
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                qr_token=uuid.uuid4().hex + uuid.uuid4().hex[:8],
                name=user.get_full_name() or "")
        if body.get("section") == "mobility":
            values = body.get("values") or {}
            if values.get("email") is not None:
                identity.email = str(values.get("email")).strip()
            if values.get("alternateMobile") is not None:
                identity.alternate_mobile = str(values.get("alternateMobile"))
            identity.save()
            a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
            ca = values.get("currentAddress") or {}
            if ca:
                a.current_address = ca.get("line", a.current_address)
                a.current_state = ca.get("state", a.current_state)
                a.current_district = ca.get("district", a.current_district)
                a.current_city = ca.get("city", a.current_city)
                a.current_locality = ca.get("locality", a.current_locality)
                a.current_pincode = ca.get("pin", a.current_pincode)
            if values.get("migrationType") is not None:
                a.migration_type = values.get("migrationType")
            if values.get("migrant") is not None:
                a.migrant_worker = bool(values.get("migrant"))
            a.save()
            return identity.id
        place = body.get("placeOfBirth") or body.get("place_of_birth")
        if place is None:
            # FE gate posts value nested: saveWorker({identity:{...worker.identity, placeOfBirth}})
            idn = body.get("identity") or {}
            place = idn.get("placeOfBirth") or idn.get("place_of_birth")
        if place is not None:
            identity.place_of_birth = str(place).strip()
        idn = body.get("identity") or {}
        personal = body.get("personal") or {}
        # Manual-entry identity fields (Aadhaar-owned: name/gender/dob/aadhaar/photo NOT here).
        idn_map = {
            "alternateMobile": "alternate_mobile",
            "email": "email",
            "emergencyContactName": "emergency_contact_name",
            "emergencyContactNumber": "emergency_contact_number",
            "emergencyContactRelation": "emergency_contact_relation",
            "disabilityTypePct": "disability_type_pct",
            "pan": "pan",
        }
        for fe_key, fld in idn_map.items():
            v = idn.get(fe_key) if fe_key in idn else body.get(fe_key)
            if v is not None:
                setattr(identity, fld, v)
        # personal section fields live on the same WorkerIdentity row.
        # Aadhaar-owned (Freeze): maritalStatus, fatherName are NOT writable.
        personal_map = {
            "motherName": "mother_name",
            "spouseName": "spouse_name",
            "disabilityStatus": "disability_status",
            "bloodGroup": "blood_group",
            "religion": "religion",
            "caste": "caste",
        }
        for fe_key, fld in personal_map.items():
            v = personal.get(fe_key) if fe_key in personal else body.get(fe_key)
            if v is not None:
                setattr(identity, fld, v)
        identity.save()

        # Address & mobility — current side + migrant are manual entry (permanent is Aadhaar-seeded).
        addr_patch = body.get("address") or {}
        if addr_patch:
            a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
            addr_map = {
                "current": "current_address",
                "currentState": "current_state",
                "currentDistrict": "current_district",
                "currentCity": "current_city",
                "currentLocality": "current_locality",
                "currentPin": "current_pincode",
                "migrationType": "migration_type",
            }
            for fe_key, fld in addr_map.items():
                if addr_patch.get(fe_key) is not None:
                    setattr(a, fld, addr_patch.get(fe_key))
            if addr_patch.get("migrant") is not None:
                a.migrant_worker = bool(addr_patch.get("migrant"))
            a.save()

        # Social security — manual entry numbers.
        ss_patch = body.get("socialSecurity") or {}
        if ss_patch:
            ss, _ = WorkerSocialSecurity.objects.get_or_create(user=user)
            ss_map = {
                "epfoUan": "epfo_uan",
                "esicIp": "esic_ip_number",
                "lwfNo": "lwf_no",
                "wcPolicyNo": "wc_policy_no",
                "eShramNo": "e_shram_no",
                "bocwRegNumber": "bocw_reg_number",
                "stateWorkerId": "state_worker_id",
            }
            for fe_key, fld in ss_map.items():
                if ss_patch.get(fe_key) is not None:
                    setattr(ss, fld, ss_patch.get(fe_key))
            ss.save()

        # Banking — only UPI is manual entry (bank details are auto-verified).
        bnk_patch = body.get("banking") or {}
        if bnk_patch.get("upiEnabled") is not None:
            bk, _ = WorkerBanking.objects.get_or_create(user=user)
            bk.upi_enabled = bool(bnk_patch.get("upiEnabled"))
            bk.save(update_fields=["upi_enabled"])

        # Welfare & safety — worker self-edit is limited to the fields the sheet
        # marks "Worker Manual Entry". Gate-pass fields (Auto after Binding) are
        # NOT writable here.
        wel_patch = body.get("welfare") or {}
        if wel_patch:
            ws, _ = WorkerWelfareSafety.objects.get_or_create(user=user)
            wel_map = {
                "ppeRequired": "ppe_required",
                "typesOfPpeGiven": "types_of_ppe_given",
                "safetyTrainingCompleted": "safety_training_completed",
                "siteInductionStatus": "site_induction_status",
                "insuranceStatus": "insurance_status",
                "accommodationProvided": "accomodation_provided",
                "policeVerification": "police_verification",
                "trainerName": "trainer_name",
                "medicalExaminationStatus": "medical_examination_status",
                "medicalFitnessStatus": "medical_fitness_status",
            }
            for fe_key, fld in wel_map.items():
                if wel_patch.get(fe_key) is not None:
                    setattr(ws, fld, wel_patch.get(fe_key))
            for fe_key, fld in {"trainingDate": "training_date", "lastMedicalExamination": "last_medical_examination", "nextMedicalDue": "next_medical_due"}.items():
                if wel_patch.get(fe_key) is not None:
                    setattr(ws, fld, wel_patch.get(fe_key) or None)
            ws.save()

        # Classification — full manual-entry row.
        cls_patch = body.get("classification") or {}
        if cls_patch:
            wc, _ = WorkerClassification.objects.get_or_create(user=user)
            cls_map = {
                "workerCategory": "worker_category",
                "sector": "sector",
                "industry": "industry",
                "occupation": "occupation",
                "skill": "skill",
                "currentEmploymentStatus": "current_employment_status",
                "totalWorkerExperience": "total_worker_experience",
                "gigPlatformWorkerId": "gig_platform_worker_id",
                "gigPlatformName": "gig_platform_name",
                "gigPlatformType": "gig_platform_type",
                "gigDateJoined": "gig_date_joined_platform",
                "gigAvgHoursPerDay": "gig_avg_hours_per_day",
                "gigAvgDaysPerWeek": "gig_avg_days_per_week",
                "gigServiceArea": "gig_service_area",
                "gigVehicleType": "gig_vehicle_type",
                "gigVehicleOwnership": "gig_vehicle_ownership",
                "gigDlNumber": "gig_dl_number",
                "gigDlExpiry": "gig_dl_expiry",
                "seBusinessName": "se_business_name",
                "seBusinessType": "se_business_type",
                "seRegistrationStatus": "se_registration_status",
                "seStartDate": "se_start_date",
                "seBusinessLocation": "se_business_location",
                "seAvgHoursPerDay": "se_avg_hours_per_day",
                "seAvgDaysPerWeek": "se_avg_days_per_week",
                "seNumEmployees": "se_num_employees",
                "seEmployerOrBusinessName": "se_employer_or_business_name",
                "seasonJobWorkType": "season_job_work_type",
                "seasonStartDate": "season_start_date",
                "seasonEndDate": "season_end_date",
                "seasonAvgHoursPerDay": "season_avg_hours_per_day",
                "seasonAvgDaysPerWeek": "season_avg_days_per_week",
                "seasonWorkLocation": "season_work_location",
                "seasonExpectedIncome": "season_expected_income",
                "seasonPaymentFrequency": "season_payment_frequency",
                "paymentMode": "payment_mode",
            }
            for fe_key, fld in cls_map.items():
                if cls_patch.get(fe_key) is not None:
                    setattr(wc, fld, cls_patch.get(fe_key))
            wc.save()

        # Skills & education — self-declared manual entry. Certification (name/
        # number/authority/expiry/verified) is set only by the course-completion
        # system and is NOT writable from the worker profile.
        sk_patch = body.get("skills") or {}
        if sk_patch:
            sk, _ = WorkerSkillsEmployability.objects.get_or_create(user=user)
            educations = sk_patch.get("educations")
            if educations is not None:
                WorkerEducation.objects.filter(user=user).delete()
                for edu in educations:
                    WorkerEducation.objects.create(
                        user=user,
                        qualification_course=(edu.get("qualificationCourse") or "").strip(),
                        board_university=(edu.get("boardUniversity") or "").strip(),
                        passing_year=(edu.get("passingYear") or "").strip(),
                    )
            if sk_patch.get("languages") is not None:
                sk.languages_known = ", ".join(str(l).strip() for l in sk_patch.get("languages") if str(l).strip())
            items = sk_patch.get("items")
            if items is not None:
                # Replace the worker's self-declared skills; keep system-verified
                # certifications intact (they are issued by course completion).
                WorkerSkill.objects.filter(user=user, verified=False).delete()
                for it in items:
                    WorkerSkill.objects.create(
                        user=user,
                        name=(it.get("name") or "").strip(),
                        experience_years=(it.get("experienceYears") or "").strip(),
                        verified=False,
                    )
            sk.save()

        # Family & dependants — manual entry (nominees).
        fam_patch = body.get("family") or {}
        if fam_patch.get("familyMembersCount") is not None or fam_patch.get("dependantsCount") is not None:
            fam_head = WorkerFamilyDependant.objects.filter(user=user).first()
            if not fam_head:
                fam_head = WorkerFamilyDependant.objects.create(user=user)
            if fam_patch.get("familyMembersCount") is not None:
                fam_head.family_members_count = fam_patch["familyMembersCount"]
            if fam_patch.get("dependantsCount") is not None:
                fam_head.dependants_count = fam_patch["dependantsCount"]
            fam_head.save(update_fields=["family_members_count", "dependants_count"])
        nominees = fam_patch.get("nominees")
        if nominees is not None:
            WorkerFamilyDependant.objects.filter(user=user, nominee=True).delete()
            for nm in nominees:
                WorkerFamilyDependant.objects.create(
                    user=user, nominee=True,
                    name=nm.get("name", ""), dependant=nm.get("dependant", ""),
                    relation=nm.get("relation", ""), nominee_type=nm.get("nomineeType", ""),
                    nominee_dob=nm.get("dob") or None, nominee_age=nm.get("age"),
                    contact=nm.get("contact", ""), address=nm.get("address", ""),
                    pan_copy_nominee=bool(nm.get("documents") and "PAN" in nm.get("documents", [])),
                    aadhaar_copy_nominee=bool(nm.get("documents") and "Aadhaar" in nm.get("documents", [])),
                )

        # Settings screen also persists privacy/QR consent + preferred channel
        # through the profile PATCH (FE: persistProfile -> saveWorker). Fold
        # those into the same UserPreference row the "settings" resource uses.
        p, _ = UserPreference.objects.get_or_create(user=user)
        prefs = body.get("preferences") or {}
        contact = body.get("contact") or {}
        privacy = dict(p.privacy_prefs or {})
        if prefs.get("consentToPublicPhoto") is not None:
            privacy["consentToPublicPhoto"] = bool(prefs.get("consentToPublicPhoto"))
        if prefs.get("consentToDataSharing") is not None:
            privacy["consentToDataSharing"] = bool(prefs.get("consentToDataSharing"))
        p.privacy_prefs = privacy
        comm = dict(p.communication_prefs or {})
        if contact.get("preferredChannel") is not None:
            comm["preferredChannel"] = str(contact.get("preferredChannel")).strip()
        p.communication_prefs = comm
        p.save()
        return identity.id
    if resource in ("notifications",) and method in ("PATCH",):
        notif_id = body.get("id")
        action = body.get("action")
        if notif_id:
            n = Notification.objects.filter(id=notif_id, user=user).first()
            if n:
                if action in ("read", "resolve"):
                    n.is_read = True
                    n.save(update_fields=["is_read"])
                elif action == "unread":
                    n.is_read = False
                    n.save(update_fields=["is_read"])
                return n.id
    if resource == "settings" and user.role == "worker" and method in ("PATCH", "POST"):
        # Worker Portal Settings — persist every toggle/select into the real
        # UserPreference row (was silently dropped -> page reload reverted to
        # hardcoded FE defaults).
        p, _ = UserPreference.objects.get_or_create(user=user)
        if body.get("interfaceLanguage") is not None:
            p.interface_language = str(body.get("interfaceLanguage"))[:10]
        notif = dict(p.notification_prefs or {})
        for k in ("jobAlerts", "complianceAlerts", "grievanceUpdates"):
            if body.get(k) is not None:
                notif[k] = bool(body.get(k))
        p.notification_prefs = notif
        a11y = dict(p.accessibility_prefs or {})
        for k in ("largeText", "highContrast", "reduceMotion"):
            if body.get(k) is not None:
                a11y[k] = bool(body.get(k))
        p.accessibility_prefs = a11y
        privacy = dict(p.privacy_prefs or {})
        for k in ("consentToPublicPhoto", "consentToDataSharing"):
            if body.get(k) is not None:
                privacy[k] = bool(body.get(k))
        p.privacy_prefs = privacy
        if body.get("bindingEnabled") is not None:
            p.binding_enabled = bool(body.get("bindingEnabled"))
        comm = dict(p.communication_prefs or {})
        if body.get("preferredChannel") is not None:
            comm["preferredChannel"] = str(body.get("preferredChannel"))
        p.communication_prefs = comm
        p.save()
        return p.id
    if resource == "availability" and user.role == "worker":
        obj, _ = WorkerOther.objects.get_or_create(user=user)
        available = body.get("available")
        if available is not None:
            obj.available_for_work = bool(available)
            obj.save(update_fields=["available_for_work"])
        return obj.id
    if resource == "workers" and role_path == "contractor" and method == "POST":
        from rest_framework.exceptions import ValidationError
        rows = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
        created = []
        for row in rows:
            row = row if isinstance(row, dict) else {}
            bss_id = str(row.get("bssId") or "").strip().upper()
            site_id = row.get("siteId")
            site = Site.objects.filter(pk=site_id).first() if site_id else None
            if site is None and row.get("site"):
                site_label = str(row.get("site")).strip()
                site = (Site.objects.filter(site_name=site_label).first()
                        or Site.objects.filter(site_code=site_label).first())
            # Bind an existing worker by BSS ID when provided; otherwise create one.
            w = None
            if bss_id:
                ident = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
                if ident:
                    w = ident.user
            if w is None:
                name = row.get("name") or "Worker"
                mobile = row.get("mobile") or row.get("contact") or ""
                username = f"worker_{uuid.uuid4().hex[:8]}"
                w = User.objects.create_user(username=username, password="Bss@Worker123",
                                             role="worker", account_active=True, is_active=True)
                WorkerIdentity.objects.create(user=w, bss_worker_id=bss_id or bss_ids.new_bss_worker_id(),
                                              name=name, mobile_number=mobile)
            if user.role == "contractor" and site:
                if not _contractor_engaged_at_site(user, site.id):
                    raise ValidationError(
                        "You are not engaged at this site. Ask the employer to allot this site to you first.")
                binding = _request_worker_binding(w, user, site)
                if binding.binding_status != "ACCEPTED":
                    # Two-sided: the contractor consents now, the worker accepts (app/OTP).
                    binding.binding_status = "PENDING"
                    binding.consent_contractor = True
                    binding.consent_worker = False
                _apply_binding_terms(binding, row)
                binding.save()
            created.append(w.id)
        if isinstance(body.get("bulk"), list):
            return created
        return created[0] if created else None
    if resource == "approvals" and role_path == "employer" and method == "PATCH":
        ids = body.get("ids") or []
        new_status = body.get("status") or "APPROVED"
        for pk in ids:
            ApprovalQueue.objects.filter(id=pk).update(status=new_status)
        return ids[0] if ids else None
    if resource == "gate-passes" and method in ("POST", "PATCH"):
        return _handle_gate_pass(user, body)
    if resource == "documents" and method == "POST":
        return _handle_document_upload(user, body)
    if resource == "sites" and user.role == "employer" and method in ("POST", "PATCH"):
        return _handle_site(user, body, method)
    if resource == "sites" and user.role == "employer" and method == "DELETE":
        site_id = body.get("id")
        if site_id:
            Site.objects.filter(pk=site_id, employer=user).delete()
            return site_id
        return None
    if resource == "job-postings" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_job_posting(user, body, method)
    if resource == "applications" and role_path == "worker" and method == "POST":
        return _handle_rozgar_apply(user, body)
    if resource == "applications" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_rozgar_respond(user, body)
    if resource == "attendance" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_mark_attendance(user, body)
    if resource == "leave" and role_path == "worker" and method == "POST":
        return _handle_leave_apply(user, body)
    if resource == "leave" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_leave_decide(user, body)
    if resource == "site-calendar" and role_path == "contractor" and method in ("POST", "PATCH", "DELETE"):
        return _handle_site_calendar(user, body, method)
    if resource == "worker-compliance" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_worker_compliance(user, body)
    if resource == "advances" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_advance_worker(user, body)
    if resource == "advances" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_advance_contractor(user, body)
    if resource == "benefits" and role_path == "contractor" and method in ("POST", "PATCH"):
        return _handle_benefits(user, body)
    if resource == "grievances" and role_path in ("contractor", "employer") and method in ("POST", "PATCH"):
        return _handle_grievance(user, body)
    if resource == "gratuity" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_gratuity_apply(user, body)
    if resource == "bank-verify" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_bank_verify(user, body)
    if resource == "courses" and role_path == "worker" and method in ("POST", "PATCH"):
        return _handle_course_action(user, body)
    return int(uuid.uuid4().int % 10**10)


def _handle_bank_verify(user, body):
    """Verify the worker's salary account via Sandbox.co.in Penny Drop (NPCI)."""
    from bss_core.models import WorkerBanking

    bank = WorkerBanking.objects.filter(user=user).first()
    if bank is None or not (bank.bank_account_number or "").strip() or not (bank.ifsc_code or "").strip():
        raise PortalMutationError("Add your bank account number and IFSC in the Banking tab first.", 400)
    ifsc = bank.ifsc_code.strip().upper()
    account = bank.bank_account_number.strip()
    try:
        result = aadhaar_client.verify_bank_account(ifsc, account)
    except aadhaar_client.SandboxError as exc:
        raise PortalMutationError(f"Bank verification could not be completed: {exc}", 502)

    data = result.get("data") or {}
    exists = bool(data.get("account_exists"))
    bank.bank_verification_status = "Verified" if exists else "Failed"
    if exists and data.get("name_at_bank"):
        bank.bank_account_holder_name = str(data.get("name_at_bank"))[:120]
    bank.save(update_fields=["bank_verification_status", "bank_account_holder_name", "updated_at"])
    return {
        "verified": exists,
        "nameAtBank": data.get("name_at_bank") or "",
        "utr": data.get("utr") or "",
        "amountDeposited": data.get("amount_deposited") or "",
        "message": data.get("message") or ("Account verified" if exists else "Account not found"),
    }


def _handle_grievance(user, body):
    """Contractor / employer replies to, resolves or reopens a worker grievance.

    The contractor must be bound to the worker; the employer must own the
    worker's site. Both share the same conversation thread (GrievanceResponse).
    """
    from bss_core.models import GrievanceResponse, WorkerContractorBinding, WorkerGrievance

    grievance = WorkerGrievance.objects.filter(pk=body.get("id")).first()
    if grievance is None:
        raise PortalMutationError("Grievance not found.", 404)
    if user.role == "contractor":
        binding = (WorkerContractorBinding.objects
                   .filter(worker=grievance.worker, contractor=user, binding_status="ACCEPTED")
                   .select_related("contractor", "site", "site__employer").first())
    else:
        binding = (WorkerContractorBinding.objects
                   .filter(worker=grievance.worker, site__employer=user, binding_status="ACCEPTED")
                   .select_related("contractor", "site", "site__employer").first())
    if binding is None:
        raise PortalMutationError("This grievance is not linked to your account.", 403)

    action = str(body.get("action") or "").strip().lower()
    if action in ("reply", "respond") or (not action and body.get("body")):
        text = str(body.get("body") or "").strip()[:2000]
        if not text:
            raise PortalMutationError("Write a reply before sending.", 400)
        GrievanceResponse.objects.create(grievance=grievance, actor=user,
                                         actor_role=user.role, body=text)
        if grievance.status != "RESOLVED":
            grievance.status = "IN_PROGRESS"
            grievance.save(update_fields=["status", "updated_at"])
    elif action == "resolve":
        grievance.status = "RESOLVED"
        grievance.resolved_at = timezone.now()
        grievance.save(update_fields=["status", "resolved_at", "updated_at"])
    elif action == "reopen":
        grievance.status = "REOPENED"
        grievance.reopened_at = timezone.now()
        grievance.save(update_fields=["status", "reopened_at", "updated_at"])
    elif action == "view":
        if grievance.status in ("RECORDED", "SUBMITTED"):
            grievance.status = "VIEWED_ON_DASHBOARD"
            grievance.save(update_fields=["status", "updated_at"])
    else:
        raise PortalMutationError("Unknown grievance action.", 400)
    return payloads._grievance_row(grievance, binding)


def _handle_benefits(user, body):
    """Contractor uploads Bonus / Leave Encashment records for bound workers."""
    from bss_core.models import WorkerBenefitRecord, WorkerContractorBinding, WorkerIdentity

    kind = str(body.get("kind") or "BONUS").strip().upper().replace("-", "_")
    kind = {"LEAVEENCASHMENT": "LEAVE_ENCASHMENT", "LEAVE_ENCASHMENT": "LEAVE_ENCASHMENT",
            "BONUS": "BONUS", "PF": "PF"}.get(kind, "BONUS")
    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        bss_id = str(row.get("workerId") or "").strip().upper()
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
        if identity is None:
            raise PortalMutationError("Worker not found for that BSS ID.", 404)
        worker = identity.user
        binding = (WorkerContractorBinding.objects
                   .filter(worker=worker, contractor=user, binding_status="ACCEPTED")
                   .select_related("site").first())
        if binding is None:
            raise PortalMutationError("This worker is not bound to you.", 403)
        try:
            amount = float(row.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0:
            raise PortalMutationError("Enter a valid benefit amount.", 400)
        rec = WorkerBenefitRecord.objects.create(
            worker=worker, contractor=user, site=binding.site, kind=kind,
            period=str(row.get("period") or "")[:40], amount=amount,
            days=row.get("days") or None, rate=row.get("rate") or None,
            reason=str(row.get("reason") or "")[:120], status="RECORDED",
            paid_on=_parse_iso_date(row.get("paidOn")), created_by=user)
        created.append(rec)
    return [payloads._benefit_row(r) for r in created]


def _handle_gratuity_apply(user, body):
    """Worker applies for gratuity; routed to the bound contractor/employer."""
    from bss_core.models import GratuityApplication, WorkerContractorBinding

    binding = (WorkerContractorBinding.objects
               .filter(worker=user, binding_status="ACCEPTED")
               .select_related("site", "site__employer", "contractor").first())
    if binding is None:
        raise PortalMutationError("Gratuity is available once you are bound to a contractor and site.", 403)
    existing = GratuityApplication.objects.filter(worker=user).exclude(status__in=("REJECTED", "DISBURSED")).first()
    if existing:
        return payloads._worker_gratuity(user)
    application = GratuityApplication.objects.create(
        worker=user, contractor=binding.contractor, site=binding.site,
        reference=f"GRT-{uuid.uuid4().hex[:8].upper()}",
        reason=str(body.get("reason") or "")[:500], status="SUBMITTED")
    return {
        "reference": application.reference,
        "submittedOn": payloads._dts(application.submitted_on),
        "status": "Submitted",
        "gratuity": payloads._worker_gratuity(user),
    }


def _handle_advance_worker(user, body):
    """Worker requests a salary advance, or accepts a disbursement."""
    from bss_core.models import SalaryAdvance, WorkerContractorBinding

    action = str(body.get("action") or "").strip().lower().replace("_", "-")
    if action in ("request", "apply"):
        try:
            amount = float(body.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0:
            raise PortalMutationError("Enter a valid advance amount.", 400)
        binding = (WorkerContractorBinding.objects
                   .filter(worker=user, binding_status="ACCEPTED")
                   .select_related("site", "contractor").first())
        advance = SalaryAdvance.objects.create(
            worker=user, contractor=binding.contractor if binding else None,
            site=binding.site if binding else None, amount=amount,
            reason=str(body.get("reason") or "")[:255], status="REQUESTED")
        return payloads._advance_row(advance)
    if action in ("accept", "confirm"):
        advance = SalaryAdvance.objects.filter(pk=body.get("id"), worker=user).first()
        if advance is None:
            raise PortalMutationError("Advance not found.", 404)
        advance.status = "ACCEPTED"
        advance.accepted_at = timezone.now()
        advance.save(update_fields=["status", "accepted_at", "updated_at"])
        return payloads._advance_row(advance)
    raise PortalMutationError("Unknown advance action.", 400)


def _handle_advance_contractor(user, body):
    """Contractor approves / rejects / disburses / adjusts an advance request."""
    from bss_core.models import SalaryAdvance

    advance = SalaryAdvance.objects.filter(pk=body.get("id"), contractor=user).first()
    if advance is None:
        raise PortalMutationError("Advance request not found for your account.", 404)
    action = str(body.get("action") or "").strip().lower().replace("_", "-")
    if action in ("approve", "approved"):
        advance.status = "APPROVED"
        advance.approved_at = timezone.now()
        advance.approved_by = user
    elif action in ("reject", "rejected"):
        advance.status = "REJECTED"
        advance.approved_at = timezone.now()
        advance.approved_by = user
    elif action in ("disburse", "disbursed"):
        advance.status = "DISBURSED"
        advance.disbursed_at = timezone.now()
        advance.mode = "CASH" if str(body.get("mode") or "ONLINE").upper() == "CASH" else "ONLINE"
        advance.reference = str(body.get("reference") or "")[:80]
    elif action in ("adjust", "adjusted"):
        advance.status = "ADJUSTED"
        advance.adjusted_at = timezone.now()
        advance.payroll_period = str(body.get("payrollPeriod") or "")[:40]
    else:
        raise PortalMutationError("Unknown advance action.", 400)
    advance.save()
    return payloads._advance_row(advance)


def _handle_worker_compliance(user, body):
    """Contractor records a bound worker's compliance / welfare details
    (Medical, Safety Kit/PPE, Safety Training, Site Induction, Insurance,
    Accommodation, Police Verification)."""
    from bss_core.models import WorkerContractorBinding, WorkerIdentity, WorkerWelfareSafety

    bss_id = str(body.get("workerId") or "").strip().upper()
    identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if identity is None:
        raise PortalMutationError("Worker not found for that BSS ID.", 404)
    worker = identity.user
    binding = (WorkerContractorBinding.objects
               .filter(worker=worker, contractor=user, binding_status="ACCEPTED")
               .select_related("site").first())
    if binding is None:
        raise PortalMutationError("This worker is not bound to you.", 403)

    ws, _ = WorkerWelfareSafety.objects.get_or_create(user=worker)
    text_fields = {
        "medicalExaminationStatus": ("medical_examination_status", 40),
        "medicalFitnessStatus": ("medical_fitness_status", 40),
        "typesOfPpeGiven": ("types_of_ppe_given", 120),
        "siteInductionStatus": ("site_induction_status", 40),
        "insuranceStatus": ("insurance_status", 40),
        "accommodationProvided": ("accomodation_provided", 120),
        "policeVerification": ("police_verification", 80),
        "trainerName": ("trainer_name", 120),
    }
    for key, (attr, length) in text_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, str(body.get(key) or "")[:length])
    bool_fields = {"ppeRequired": "ppe_required", "safetyTrainingCompleted": "safety_training_completed"}
    for key, attr in bool_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, bool(body.get(key)))
    date_fields = {"lastMedicalExamination": "last_medical_examination",
                   "nextMedicalDue": "next_medical_due", "trainingDate": "training_date"}
    for key, attr in date_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, _parse_iso_date(body.get(key)))
    ws.save()
    return payloads._contractor_compliance_row(binding)


def _award_course_skill(user, course, certificate_no):
    """Add / verify a WorkerSkill (the certificate) when a course is completed."""
    from bss_core.models import WorkerSkill

    skill_name = (course.skill_name or course.title).strip()[:80]
    certification = (course.certification or course.title).strip()
    authority = (course.provider or "Bharat Shram Setu").strip()

    existing = WorkerSkill.objects.filter(user=user, name=skill_name).first()
    if existing is None:
        WorkerSkill.objects.create(
            user=user, name=skill_name, verified=True,
            certification_name=certification, certification_number=certificate_no,
            certification_authority=authority)
    else:
        existing.verified = True
        existing.certification_name = certification
        existing.certification_number = certificate_no
        existing.certification_authority = authority
        existing.save(update_fields=["verified", "certification_name",
                                     "certification_number", "certification_authority"])


def _course_state(course, enrollment):
    """Per-module and overall completion for a course enrollment."""
    completed_ids = {str(x) for x in (enrollment.completed_lesson_ids or [])}
    scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()}
    total_items = done_items = 0
    modules = []
    for m in course.modules.all():
        lessons = list(m.lessons.all())
        assignments = list(m.assignments.all())
        lessons_done = all(str(l.id) in completed_ids for l in lessons) if lessons else True
        assignments_passed = all(
            scores.get(str(a.id)) is not None and scores[str(a.id)] >= a.pass_score
            for a in assignments) if assignments else True
        module_complete = bool(lessons or assignments) and lessons_done and assignments_passed
        total_items += len(lessons) + len(assignments)
        done_items += (sum(1 for l in lessons if str(l.id) in completed_ids)
                       + sum(1 for a in assignments if scores.get(str(a.id)) is not None
                             and scores[str(a.id)] >= a.pass_score))
        modules.append({
            "moduleId": str(m.id), "completed": module_complete,
            "lessonsDone": lessons_done, "assignmentsPassed": assignments_passed,
        })
    all_complete = bool(modules) and all(m["completed"] for m in modules)
    progress = 100 if enrollment.status == "COMPLETED" else (
        round(done_items / total_items * 100) if total_items else 0)
    return {
        "completedLessonIds": sorted(completed_ids, key=lambda x: int(x) if str(x).isdigit() else 0),
        "assignmentScores": scores,
        "modules": modules,
        "progress": progress,
        "allComplete": all_complete,
    }


def _course_summary(user, course, enrollment):
    state = _course_state(course, enrollment)
    return {
        "courseId": str(course.id),
        "completedLessonIds": state["completedLessonIds"],
        "assignmentScores": state["assignmentScores"],
        "assignmentFailedAt": enrollment.assignment_failed_at or {},
        "progress": state["progress"],
        "status": ("Completed" if enrollment.status == "COMPLETED"
                   else ("In progress" if state["progress"] > 0 else "Not started")),
        "certificateReady": enrollment.status == "COMPLETED",
        "certificateNo": enrollment.certificate_no,
        "skillAwarded": (course.skill_name or course.title) if enrollment.status == "COMPLETED" else "",
        "modules": state["modules"],
    }


def _handle_course_action(user, body):
    """Worker course progress: mark a lesson complete or submit an assignment.

    A module is complete when all its lessons are watched and all its
    assignments are passed; the course (and certificate) completes when every
    module is complete. The certificate is added to the worker's verified skills.
    """
    from bss_core.models import Course, CourseAssignment, CourseEnrollment

    raw_id = str(body.get("courseId") or "").replace("course-", "").strip()
    course = Course.objects.filter(pk=raw_id, is_active=True).first() if raw_id.isdigit() else None
    if course is None:
        raise PortalMutationError("Course not found.", 404)

    enrollment, _ = CourseEnrollment.objects.get_or_create(worker=user, course=course)
    action = str(body.get("action") or "").strip().lower().replace("_", "-")

    if action in ("complete-lesson", "lesson"):
        lesson_id = str(body.get("lessonId") or "")
        completed = {str(x) for x in (enrollment.completed_lesson_ids or [])}
        completed.add(lesson_id)
        enrollment.completed_lesson_ids = sorted(
            completed, key=lambda x: int(x) if str(x).isdigit() else 0)
        enrollment.save(update_fields=["completed_lesson_ids", "updated_at"])
    elif action in ("submit-assignment", "assignment", "submit-quiz", "quiz"):
        from bss_core.models import CourseSubmission

        assignment_id = str(body.get("assignmentId") or body.get("quizId") or "")
        assignment = (CourseAssignment.objects
                      .filter(pk=assignment_id, module__course=course).first()
                      if assignment_id.isdigit() else None)
        if assignment is None:
            raise PortalMutationError("Assignment not found.", 404)
        scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()}

        if assignment.assignment_type == "QUIZ":
            from datetime import timedelta
            from django.utils import timezone

            failed_map = dict(enrollment.assignment_failed_at or {})
            last_failed_str = failed_map.get(str(assignment.id))
            if last_failed_str:
                try:
                    last_failed_time = timezone.datetime.fromisoformat(last_failed_str)
                    if timezone.is_naive(last_failed_time):
                        last_failed_time = timezone.make_aware(last_failed_time)
                    time_passed = timezone.now() - last_failed_time
                    if time_passed < timedelta(hours=8):
                        remaining_seconds = int((timedelta(hours=8) - time_passed).total_seconds())
                        hours_left = remaining_seconds // 3600
                        mins_left = (remaining_seconds % 3600) // 60
                        raise PortalMutationError(
                            f"Quiz cooldown active. You can retry this quiz in {hours_left}h {mins_left}m.", 429
                        )
                except PortalMutationError:
                    raise
                except Exception:
                    pass

            answers = body.get("answers") or {}
            questions = list(assignment.questions.all())
            correct = 0
            for question in questions:
                given = answers.get(str(question.id), answers.get(question.id))
                try:
                    if given is not None and int(given) == question.correct_index:
                        correct += 1
                except (TypeError, ValueError):
                    pass
            score = round(correct / len(questions) * 100) if questions else 100
            previous = scores.get(str(assignment.id))
            if previous is None or score > previous:
                scores[str(assignment.id)] = score
            enrollment.assignment_scores = scores
            enrollment.quiz_score = score
            
            # If worker failed to reach pass score, record failed timestamp for 8-hour cooldown
            if score < assignment.pass_score:
                failed_map[str(assignment.id)] = timezone.now().isoformat()
                enrollment.assignment_failed_at = failed_map
                enrollment.save(update_fields=["assignment_scores", "assignment_failed_at", "quiz_score", "updated_at"])
            else:
                # Passed! Remove any active cooldown entry for this quiz
                if str(assignment.id) in failed_map:
                    del failed_map[str(assignment.id)]
                    enrollment.assignment_failed_at = failed_map
                    enrollment.save(update_fields=["assignment_scores", "assignment_failed_at", "quiz_score", "updated_at"])
                else:
                    enrollment.save(update_fields=["assignment_scores", "quiz_score", "updated_at"])
        else:
            # Written / upload assignment — store the response. A reviewer can
            # grade it; until then it is accepted at the pass mark so the module
            # can complete.
            content = str(body.get("content") or "")[:5000]
            file_url = str(body.get("fileUrl") or "")[:255]
            if not content and not file_url:
                raise PortalMutationError("Add your response before submitting.", 400)
            submission, _ = CourseSubmission.objects.update_or_create(
                worker=user, assignment=assignment,
                defaults={"content": content, "file_url": file_url, "status": "SUBMITTED"})
            score = submission.score if submission.score is not None else assignment.pass_score
            previous = scores.get(str(assignment.id))
            if previous is None or score > previous:
                scores[str(assignment.id)] = score
            enrollment.assignment_scores = scores
            enrollment.save(update_fields=["assignment_scores", "updated_at"])
    elif action in ("grade-submission", "grade"):
        from bss_core.models import CourseSubmission

        if user.role not in ("contractor", "bss_staff", "bss_admin"):
            raise PortalMutationError("Only a reviewer can grade submissions.", 403)
        submission = CourseSubmission.objects.filter(pk=body.get("submissionId")).first()
        if submission is None:
            raise PortalMutationError("Submission not found.", 404)
        submission.score = max(0, min(100, int(body.get("score") or 0)))
        submission.feedback = str(body.get("feedback") or "")[:500]
        submission.status = "GRADED"
        submission.reviewer = user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=["score", "feedback", "status", "reviewer", "reviewed_at"])
        worker_enrollment, _ = CourseEnrollment.objects.get_or_create(
            worker=submission.worker, course=course)
        sc = {str(k): v for k, v in (worker_enrollment.assignment_scores or {}).items()}
        sc[str(submission.assignment_id)] = submission.score
        worker_enrollment.assignment_scores = sc
        worker_enrollment.save(update_fields=["assignment_scores", "updated_at"])
        state = _course_state(course, worker_enrollment)
        if state["allComplete"] and worker_enrollment.status != "COMPLETED":
            worker_enrollment.status = "COMPLETED"
            worker_enrollment.certificate_issued = True
            if not worker_enrollment.certificate_no:
                worker_enrollment.certificate_no = f"BSS-CERT-{course.id}-{submission.worker_id}"
            worker_enrollment.completed_at = timezone.now()
            worker_enrollment.save(update_fields=["status", "certificate_issued", "certificate_no",
                                                  "completed_at", "updated_at"])
            _award_course_skill(submission.worker, course, worker_enrollment.certificate_no)
        return {"submissionId": str(submission.id), "score": submission.score,
                "workerComplete": worker_enrollment.status == "COMPLETED"}
    else:
        raise PortalMutationError("Unknown course action.", 400)

    # Completion gate across all modules → issue the certificate.
    state = _course_state(course, enrollment)
    if state["allComplete"] and enrollment.status != "COMPLETED":
        enrollment.status = "COMPLETED"
        enrollment.certificate_issued = True
        if not enrollment.certificate_no:
            enrollment.certificate_no = f"BSS-CERT-{course.id}-{user.id}"
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "certificate_issued", "certificate_no",
                                       "completed_at", "updated_at"])
        _award_course_skill(user, course, enrollment.certificate_no)

    return _course_summary(user, course, enrollment)


def _contractor_site_ids(user):
    ids = set(WorkerContractorBinding.objects.filter(contractor=user)
              .values_list("site_id", flat=True))
    ids.update(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, status="APPROVED").values_list("site_id", flat=True))
    return ids


def _handle_site_calendar(user, body, method):
    """Contractor manages a site's holiday calendar + leave policy.

    Workers bound to the site inherit both. ``kind`` selects what is edited:
    ``holiday`` (default) or ``leavePolicy``.
    """
    from bss_core.models import LeaveType, SiteHoliday, SiteLeavePolicy

    site_id = body.get("siteId")
    if site_id not in _contractor_site_ids(user):
        raise PortalMutationError("This site is not allotted to you.", 403)
    site = Site.objects.filter(pk=site_id).first()
    if site is None:
        raise PortalMutationError("Site not found.", 404)

    kind = str(body.get("kind") or "holiday").strip().lower()
    record_id = body.get("id")

    if method == "DELETE":
        if kind in ("leavepolicy", "leave-policy", "policy"):
            SiteLeavePolicy.objects.filter(pk=record_id, site=site).delete()
        else:
            SiteHoliday.objects.filter(pk=record_id, site=site).delete()
        return record_id

    if kind in ("leavepolicy", "leave-policy", "policy"):
        leave_type = None
        if body.get("leaveTypeId"):
            leave_type = LeaveType.objects.filter(pk=body.get("leaveTypeId")).first()
        if leave_type is None and body.get("leaveType"):
            leave_type = LeaveType.objects.filter(name__iexact=str(body.get("leaveType")).strip()).first()
        if leave_type is None:
            raise PortalMutationError("Select a valid leave type.", 400)
        policy, _ = SiteLeavePolicy.objects.update_or_create(
            site=site, leave_type=leave_type,
            defaults={
                "annual_entitlement": int(body.get("annualEntitlement") or 12),
                "opening_balance": int(body.get("openingBalance") or 0),
                "is_active": bool(body.get("isActive", True)),
            },
        )
        return policy.id

    # Holiday entry
    holiday = SiteHoliday.objects.filter(pk=record_id, site=site).first() if record_id else None
    if holiday is None:
        holiday = SiteHoliday(site=site)
    new_date = _parse_iso_date(body.get("date"))
    if new_date:
        holiday.date = new_date
    if body.get("name") is not None:
        holiday.name = str(body.get("name") or "").strip()[:120]
    holiday_type = str(body.get("holidayType") or "").strip().upper()
    if holiday_type in dict(SiteHoliday.TYPES):
        holiday.holiday_type = holiday_type
    if body.get("isPaid") is not None:
        holiday.is_paid = bool(body.get("isPaid"))
    if body.get("note") is not None:
        holiday.note = str(body.get("note") or "")[:255]
    if not holiday.date or not holiday.name:
        raise PortalMutationError("A holiday needs a date and a name.", 400)
    holiday.save()
    return holiday.id


def _handle_leave_apply(user, body):
    """Worker leave application -> LeaveRequest (PENDING, approved by bound contractor)."""
    from bss_core.models import LeaveRequest, LeaveType

    type_name = str(body.get("type") or "").strip()
    leave_type = LeaveType.objects.filter(name__iexact=type_name, is_active=True).first()
    if leave_type is None:
        leave_type = LeaveType.objects.filter(is_active=True).first()
    if leave_type is None:
        raise PortalMutationError("No leave types are configured.", 400)

    from_date = _parse_iso_date(body.get("from"))
    to_date = _parse_iso_date(body.get("to"))
    if not from_date or not to_date or to_date < from_date:
        raise PortalMutationError("Enter a valid leave date range.", 400)
    days = (to_date - from_date).days + 1

    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site").first())
    if binding is None or binding.site is None:
        raise PortalMutationError(
            "Leave is available once you are bound to a contractor and site.", 403)
    request_obj = LeaveRequest.objects.create(
        worker=user,
        leave_type=leave_type,
        site=binding.site,
        contractor=binding.contractor,
        from_date=from_date,
        to_date=to_date,
        days=days,
        reason=str(body.get("reason") or "")[:2000],
        attachment_id=str(body.get("attachmentId") or "")[:80],
        status="PENDING",
    )
    return payloads._leave_row(request_obj)


def _handle_leave_decide(user, body):
    """Bound contractor approves / rejects a worker's LeaveRequest."""
    from bss_core.models import LeaveRequest

    request_obj = LeaveRequest.objects.filter(pk=body.get("id"), contractor=user).first()
    if request_obj is None:
        raise PortalMutationError("Leave request not found for your account.", 404)
    decision = str(body.get("status") or "").strip().upper()
    mapping = {"APPROVED": "APPROVED", "APPROVE": "APPROVED", "ACCEPTED": "APPROVED",
               "REJECTED": "REJECTED", "REJECT": "REJECTED", "CANCELLED": "CANCELLED"}
    if decision in mapping:
        request_obj.status = mapping[decision]
        request_obj.approver = user
        request_obj.decided_at = timezone.now()
        if body.get("comment") is not None:
            request_obj.comment = str(body.get("comment") or "")[:500]
        request_obj.save(update_fields=["status", "approver", "decided_at", "comment", "updated_at"])
    return payloads._leave_row(request_obj)


def _handle_mark_attendance(user, body):
    """Contractor marks attendance for a worker after scanning their QR.

    Only allowed when the worker has an ACCEPTED binding with this contractor;
    writes to the shared Attendance table that drives /worker/Attendance.
    """
    from bss_core.models import Attendance, WorkerIdentity, WorkerContractorBinding

    bss_id = str(body.get("bssId") or "").strip().upper()
    worker_identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if worker_identity is None:
        raise PortalMutationError("No worker found for that BSS ID.", 404)
    worker = worker_identity.user

    binding = (
        WorkerContractorBinding.objects.filter(
            worker=worker, contractor=user, binding_status="ACCEPTED"
        )
        .select_related("site")
        .first()
    )
    if binding is None or binding.site is None:
        raise PortalMutationError(
            "This worker is not bound to you, so attendance cannot be marked.", 403)

    site = binding.site
    today = timezone.localdate()
    now = timezone.now()
    status = str(body.get("status") or "PRESENT").strip().upper()
    if status not in dict(Attendance.STATUS):
        status = "PRESENT"

    attendance, created = Attendance.objects.get_or_create(
        worker=worker, site=site, attendance_date=today,
        defaults={
            "contractor": user,
            "capture_method": "QR",
            "verification_type": "qr_worker",
            "status": status,
            "check_in_time": now,
            "is_verified": True,
            "verified_by": user,
            "verified_at": now,
            "remarks": str(body.get("remarks") or "Marked via contractor QR scan")[:255],
        },
    )
    if not created:
        attendance.status = status
        attendance.check_out_time = now
        attendance.save(update_fields=["status", "check_out_time", "updated_at"])
    return attendance.id


def _parse_iso_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _handle_job_posting(user, body, method):
    """Contractor job posting -> ContractorJob (Rozgar Setu job management)."""
    from bss_core.models import ContractorJob

    job = None
    job_id = body.get("id")
    if job_id and str(job_id).isdigit():
        job = ContractorJob.objects.filter(pk=job_id, contractor=user).first()
    if job is None:
        job = ContractorJob(contractor=user)

    def text(key, current=""):
        value = body.get(key)
        return str(value).strip() if value is not None else (current or "")

    job.job_title = text("title", job.job_title) or job.job_title
    job.job_description = text("description", job.job_description)
    job.wage_offered = text("monthlyWage", job.wage_offered)
    job.designation = text("designation", job.designation) or job.job_title
    job.trade = text("trade", job.trade)
    job.category = text("category", job.category)
    job.workplace_type = text("workplaceType", job.workplace_type) or "On-site"
    job.state = text("state", job.state)
    job.city = text("city", job.city)
    job.experience = text("experience", job.experience)
    job.dob_limit = text("dobLimit", job.dob_limit)
    job.salary_visibility = text("salaryVisibility", job.salary_visibility) or "Visible to all"
    job.visibility = text("visibility", job.visibility) or "Public"
    job.duration = text("duration", job.duration)
    if isinstance(body.get("skills"), list):
        job.skills = [str(s) for s in body.get("skills")]
    if body.get("vacancies") is not None:
        try:
            job.vacancies = max(1, int(body.get("vacancies")))
        except (TypeError, ValueError):
            pass
    for src, field in (("minSalary", "min_salary"), ("maxSalary", "max_salary")):
        if body.get(src) not in (None, ""):
            try:
                setattr(job, field, body.get(src))
            except (TypeError, ValueError):
                pass
    if body.get("closingDate") is not None:
        job.validity_until = _parse_iso_date(body.get("closingDate"))
    site_name = text("site", "")
    if site_name:
        site = Site.objects.filter(site_name__iexact=site_name).first()
        if site:
            job.site = site
    status = str(body.get("status") or "").strip().upper()
    job.status = {"DRAFT": "DRAFT", "CLOSED": "CLOSED"}.get(status, "SUBMITTED")
    job.is_active = job.status != "DRAFT"
    job.save()
    return job.id


def _handle_rozgar_apply(user, body):
    """Worker applies to a job -> RozgarRequest (pending)."""
    from bss_core.models import ContractorJob, RozgarRequest

    # A worker can only be bound to one contractor at a time — if already bound
    # they must unbind before applying to another contractor's job.
    active = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
              .select_related("contractor", "site").first())
    if active is not None:
        cp = getattr(active.contractor, "contractor_profile", None)
        contractor_name = (cp.contractor_name if cp and cp.contractor_name else active.contractor.username)
        site_name = active.site.site_name if active.site else ""
        raise PortalMutationError(
            f"You are already bound to {contractor_name}"
            f"{f' at {site_name}' if site_name else ''}. "
            "Unbind first before applying to another contractor.", 409)

    raw_id = body.get("jobId") or body.get("id") or body.get("job")
    job = None
    if raw_id is not None:
        jid = str(raw_id).replace("JOB-", "").strip()
        if jid.isdigit():
            job = ContractorJob.objects.filter(pk=jid, is_active=True).first()
    if job is None:
        return None
    req, _created = RozgarRequest.objects.get_or_create(
        job=job, worker=user,
        defaults={"contractor": job.contractor, "status": "PENDING",
                  "notes": str(body.get("notes") or "")[:500]},
    )
    # Applying also raises a site-specific binding request to the job's
    # contractor (worker-initiated consent). The contractor accepts it in
    # Binding Requests; the binding completes only after both sides consent.
    if job.site_id and job.contractor_id:
        binding = _request_worker_binding(user, job.contractor, job.site)
        if binding.binding_status != "ACCEPTED":
            binding.binding_status = "PENDING"
            binding.consent_worker = True
            binding.save(update_fields=["binding_status", "consent_worker"])
    return req.id


def _handle_rozgar_respond(user, body):
    """Contractor responds to a RozgarRequest (Hired/Accepted/Rejected)."""
    from bss_core.models import RozgarRequest

    req_id = body.get("id")
    req = RozgarRequest.objects.filter(pk=req_id, contractor=user).first()
    if req is None:
        return None
    status = str(body.get("status") or "").strip().upper()
    mapping = {"HIRED": "ACCEPTED", "ACCEPTED": "ACCEPTED", "REJECTED": "REJECTED",
               "CANCELLED": "CANCELLED", "PENDING": "PENDING"}
    if status in mapping:
        req.status = mapping[status]
        req.responded_at = timezone.now()
        req.save(update_fields=["status", "responded_at", "updated_at"])
    return req.id


# Editable scalar columns of the Site model (everything except the employer FK,
# the auto QR token, timestamps and id). Introspected so new Site Detail fields
# are persisted without a hand-maintained mapping.
_SITE_EDITABLE_FIELDS = tuple(
    f.name for f in Site._meta.get_fields()
    if not getattr(f, "auto_created", False)
    and not getattr(f, "many_to_one", False)
    and not getattr(f, "many_to_many", False)
    and not getattr(f, "one_to_one", False)
    and f.name not in ("id", "site_qr_token", "created_at", "updated_at", "employer")
)


def _handle_site(user, body, method):
    site = None
    site_id = body.get("id")
    if site_id:
        site = Site.objects.filter(pk=site_id, employer=user).first()

    if site is None:
        code = str(body.get("site_code") or body.get("code") or "").strip().upper()
        if not code:
            code = f"ST-{uuid.uuid4().hex[:8].upper()}"
        base = code
        suffix = 0
        while Site.objects.filter(site_code=code).exists():
            suffix += 1
            code = f"{base}-{suffix}"
        site = Site(employer=user, site_code=code)

    # camelCase aliases the current form uses.
    if body.get("name") is not None:
        site.site_name = str(body.get("name") or "").strip()
    if body.get("location") is not None:
        site.location = str(body.get("location") or "").strip()
    if body.get("state") is not None:
        site.state = str(body.get("state") or "").strip()
    if body.get("status") is not None:
        site.site_status = str(body.get("status") or "").strip()
    if body.get("startDate") is not None:
        site.site_start_date = _parse_date(body.get("startDate"))
    if body.get("endDate") is not None:
        site.expected_end_date = _parse_date(body.get("endDate"))

    for field in _SITE_EDITABLE_FIELDS:
        if field in body and body.get(field) is not None:
            setattr(site, field, _coerce_site_value(Site._meta.get_field(field), body.get(field)))

    site.save()
    return site.id


def _coerce_site_value(field, value):
    if value is None or value == "":
        return None
    internal = field.get_internal_type()
    if internal == "DecimalField":
        from decimal import Decimal, InvalidOperation
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None
    if internal in ("IntegerField", "SmallIntegerField", "PositiveIntegerField", "BigIntegerField"):
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    if internal == "DateField":
        return _parse_date(value)
    if internal == "BooleanField":
        if isinstance(value, bool):
            return value
        return str(value).lower() in ("true", "1", "yes", "on")
    return value


def _parse_date(value):
    if value in (None, ""):
        return None
    if hasattr(value, "isoformat"):
        return value
    import datetime as _dt
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return _dt.datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _handle_gate_pass(user, body):
    """Gate pass workflow.

    * Contractor: request single / bulk temporary or permanent passes for their
      bound workers (created PENDING, awaiting the principal employer).
    * Employer: approve / reject requests for sites they own; approval sets the
      validity window (TGP 30 days, PGP 365 days) and activates the pass.
    """
    from bss_core.models import WorkerGatePass, WorkerIdentity, WorkerContractorBinding

    if user.role == "employer":
        ids = body.get("ids") or ([body.get("id")] if body.get("id") else [])
        decision = str(body.get("status") or "").strip().lower()
        today = timezone.localdate()
        updated = []
        for gp in WorkerGatePass.objects.filter(pk__in=ids, site__employer=user):
            if decision in ("approved", "approve"):
                gp.status = "ACTIVE"
                gp.start_date = today
                gp.end_date = today + timedelta(days=365 if gp.gate_pass_type == "PGP" else 30)
                gp.approved_by = user
                gp.approved_at = timezone.now()
            elif decision in ("rejected", "reject"):
                gp.status = "REJECTED"
                gp.approved_by = user
                gp.approved_at = timezone.now()
                gp.remarks = str(body.get("remarks") or "")[:255]
            else:
                raise PortalMutationError("Select approve or reject.", 400)
            gp.save()
            updated.append(gp.id)
        if not updated:
            raise PortalMutationError("No gate pass requests matched.", 404)
        rows = [payloads._employer_gate_pass_row(g)
                for g in WorkerGatePass.objects.filter(pk__in=updated)]
        return rows[0] if len(rows) == 1 else rows

    # Contractor: request single / bulk
    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        bss_id = str(row.get("workerId") or row.get("bssId") or "").strip().upper()
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
        if identity is None:
            raise PortalMutationError("Worker not found for that BSS ID.", 404)
        worker = identity.user
        binding = (WorkerContractorBinding.objects.filter(
            worker=worker, contractor=user, binding_status="ACCEPTED")
            .select_related("site").first())
        if binding is None:
            raise PortalMutationError("This worker is not bound to you.", 403)
        gp_type = "PGP" if str(row.get("type") or "").lower().startswith("perm") else "TGP"
        eligibility = payloads._gate_pass_eligibility(worker)
        if gp_type == "PGP" and not (eligibility["medical"] == "Done"
                                     and eligibility["healthSafety"] == "Done"
                                     and eligibility["compliance"] == "Done"):
            raise PortalMutationError(
                "This worker is not eligible for a Permanent Gate Pass — Medical, "
                "Health & Safety and Compliance must all be Done.", 400)
        if gp_type == "TGP" and not (eligibility["medical"] == "Done"
                                     and eligibility["healthSafety"] == "Done"):
            raise PortalMutationError(
                "This worker is not eligible for a Temporary Gate Pass — Medical and "
                "Health & Safety must be Done.", 400)
        existing = WorkerGatePass.objects.filter(
            worker=worker, gate_pass_type=gp_type, status__in=("PENDING", "ACTIVE")).first()
        if existing:
            created.append(existing)
            continue
        gp = WorkerGatePass.objects.create(
            worker=worker, site=binding.site, gate_pass_type=gp_type,
            gate_pass_no=f"{gp_type}-{uuid.uuid4().hex[:8].upper()}",
            status="PENDING", issued_by=user, source="CONTRACTOR_GATE_PASS")
        created.append(gp)
    out = [payloads._contractor_gate_pass_row(g) for g in created]
    return out[0] if len(out) == 1 else out


def _handle_document_upload(user, body):
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    master = WorkerDocumentMaster.objects.first()
    if not master:
        return int(uuid.uuid4().int % 10**10)
    try:
        from bss_core.models import WorkerDocument
        WorkerDocument.objects.create(
            user=user,
            document=master,
            file_name=body.get("fileName") or "document",
            status="UPLOADED",
            is_mandatory=master.is_mandatory,
            owner_role="worker",
        )
    except Exception:
        return int(uuid.uuid4().int % 10**10)
    return int(uuid.uuid4().int % 10**10)



# ---------------------------------------------------------------------------
# Submissions (multipart uploads)
# ---------------------------------------------------------------------------
@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_documents(request):
    """Worker document register — GET lists the catalog merged with uploads;
    POST (multipart: file, code, expiry) uploads/replaces a document."""
    from bss_core.models import WorkerDocument, WorkerDocumentMaster
    user = request.user
    if user.role != "worker":
        return Response({"error": "Only workers can manage their documents."},
                        status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response({"data": payloads._worker_documents_display(user)},
                        status=status.HTTP_200_OK)

    file_obj = request.FILES.get("file")
    code = (request.data.get("code") or "").strip().upper()
    name = (request.data.get("name") or "").strip()
    expiry = (request.data.get("expiry") or "").strip()
    if not file_obj:
        return Response({"error": "Choose a document to upload."},
                        status=status.HTTP_400_BAD_REQUEST)

    master = WorkerDocumentMaster.objects.filter(code=code).first() if code else None
    if master is None and name:
        master = WorkerDocumentMaster.objects.filter(document_name__iexact=name).first()
    if master is None:
        return Response({"error": "Unknown document type."},
                        status=status.HTTP_400_BAD_REQUEST)

    WorkerDocument.objects.filter(user=user, document=master).delete()
    doc = WorkerDocument(
        user=user, document=master,
        file_name=os.path.basename(file_obj.name or "document"),
        file_size=file_obj.size, mime_type=file_obj.content_type or "",
        status="UNDER_VERIFICATION", is_mandatory=master.is_mandatory,
        owner_role="worker",
    )
    if expiry:
        try:
            doc.expiry_date = datetime.date.fromisoformat(expiry)
        except ValueError:
            pass
    doc.file.save(doc.file_name, file_obj, save=False)
    doc.file_path = doc.file.name
    doc.save()
    return Response({"data": {
        "id": doc.id, "name": master.document_name, "code": master.code,
        "status": doc.status, "date": payloads._dts(doc.uploaded_at),
        "downloadUrl": f"/api/worker/documents/{doc.id}/file",
    }}, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_document_detail(request, document_id):
    """Download (GET) or delete (DELETE) a single worker document."""
    from bss_core.models import WorkerDocument
    doc = WorkerDocument.objects.filter(pk=document_id, user=request.user).first()
    if doc is None:
        return Response({"error": "Document not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        if doc.file:
            doc.file.delete(save=False)
        doc.delete()
        return Response({"success": True, "deleted": True}, status=status.HTTP_200_OK)
    if not doc.file:
        return Response({"error": "No file stored for this document."},
                        status=status.HTTP_404_NOT_FOUND)
    try:
        response = FileResponse(doc.file.open("rb"), as_attachment=False,
                                filename=doc.file_name or os.path.basename(doc.file.name))
    except Exception:
        return Response({"error": "Stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = doc.mime_type or "application/octet-stream"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def _grievance_status_label(status):
    return {
        "RECORDED": "Submitted", "SUBMITTED": "Submitted",
        "VIEWED_ON_DASHBOARD": "Under Review", "OPEN": "Under Review",
        "IN_PROGRESS": "In Progress", "REOPENED": "In Progress",
        "RESOLVED": "Resolved",
    }.get(str(status).upper(), "Submitted")


def _grievance_category_label(category):
    return {
        "WAGES": "Wages", "SAFETY": "Safety", "HARASSMENT": "Harassment",
        "ACCOMMODATION": "Accommodation", "BENEFITS": "Benefits", "OTHER": "Other",
    }.get(str(category).upper(), "Other")


def _grievance_payload(g):
    latest = g.responses.order_by("-created_at").first() if hasattr(g, "responses") else None
    assigned = payloads._party_name(g.assigned_to) if g.assigned_to else ""
    return {
        "id": g.id,
        "ref": payloads._d(g.ticket_no),
        "category": _grievance_category_label(g.category),
        "status": _grievance_status_label(g.status),
        "body": payloads._d(g.body),
        "language": payloads._d(g.language),
        "attachment": payloads._d(g.attachment_file),
        "audioUrl": f"/api/worker/grievances/{g.id}/audio" if g.audio else "",
        "duration": g.recording_duration_secs or 0,
        "raisedBy": "You (Self)",
        "assignedTo": payloads._d(assigned, "Awaiting assignment"),
        "raisedAt": payloads._dts(g.created_at),
        "updatedAt": payloads._dts(g.updated_at),
        "resolvedAt": payloads._dts(g.resolved_at) if g.resolved_at else "",
        "response": payloads._d(latest.body) if latest else "",
    }


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_grievances(request):
    """Worker grievance register — GET lists tickets; POST files a new one
    (multipart: body/category/language + optional audio recording)."""
    from bss_core.models import WorkerGrievance
    user = request.user
    if user.role != "worker":
        return Response({"error": "Only workers can manage grievances."},
                        status=status.HTTP_403_FORBIDDEN)
    if request.method == "GET":
        gs = WorkerGrievance.objects.filter(worker=user).order_by("-created_at")
        return Response({"data": [_grievance_payload(g) for g in gs]}, status=status.HTTP_200_OK)

    body = request.data or {}
    category = str(body.get("category") or "OTHER").strip().upper()
    if category not in dict(WorkerGrievance.CATEGORY):
        category = "OTHER"
    text = str(body.get("body") or "").strip()[:1000]
    language = str(body.get("language") or "").strip()[:40]
    attachment = str(body.get("attachment") or "").strip()[:255]
    audio = request.FILES.get("audio")
    if not text and not audio:
        return Response({"error": "Describe your concern or record audio."},
                        status=status.HTTP_400_BAD_REQUEST)
    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("contractor").first())
    g = WorkerGrievance(
        worker=user, category=category, language=language, body=text,
        attachment_file=attachment, status="SUBMITTED", submitted_at=timezone.now(),
        assigned_to=binding.contractor if binding else None,
    )
    try:
        if body.get("duration") is not None:
            g.recording_duration_secs = int(body.get("duration"))
    except (TypeError, ValueError):
        pass
    if audio:
        g.audio.save(os.path.basename(audio.name or "recording.webm"), audio, save=False)
        g.recording_file = g.audio.name
    g.save()
    return Response({"data": _grievance_payload(g)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_grievance_audio(request, grievance_id):
    from bss_core.models import WorkerGrievance
    g = WorkerGrievance.objects.filter(pk=grievance_id, worker=request.user).first()
    if g is None or not g.audio:
        return Response({"error": "Recording not found."}, status=status.HTTP_404_NOT_FOUND)
    try:
        response = FileResponse(g.audio.open("rb"), as_attachment=False,
                                filename=os.path.basename(g.audio.name))
    except Exception:
        return Response({"error": "Recording is unavailable."}, status=status.HTTP_404_NOT_FOUND)
    response["Content-Type"] = "audio/webm"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def _binding_enabled(user):
    p = UserPreference.objects.filter(user=user).first()
    return bool(p.binding_enabled) if p else True


def _active_worker_binding(worker, contractor, site):
    """The single live binding (PENDING/ACCEPTED) for a
    worker<->contractor<->site tuple, or None when prior rows are all terminal
    (rejected/cancelled/expired)."""
    from bss_core.models import WorkerContractorBinding
    return (WorkerContractorBinding.objects
            .filter(worker=worker, contractor=contractor, site=site,
                    binding_status__in=("PENDING", "ACCEPTED"))
            .order_by("-created_at").first())


def _request_worker_binding(worker, contractor, site, **defaults):
    """Reuse the live binding for the tuple, or create a fresh PENDING row when
    the previous request was declined/cancelled/expired. This keeps the declined
    request as history instead of overwriting it."""
    from bss_core.models import WorkerContractorBinding
    # A worker binding must always connect a worker and a contractor — never two
    # accounts of the same role, and never an account to itself.
    if (worker is None or contractor is None
            or worker.role != "worker" or contractor.role != "contractor"
            or worker.id == contractor.id):
        raise PortalMutationError("A binding must connect a worker and a contractor.", 400)
    binding = _active_worker_binding(worker, contractor, site)
    if binding is None:
        binding = WorkerContractorBinding.objects.create(
            worker=worker, contractor=contractor, site=site,
            binding_status="PENDING", **defaults)
    return binding


def _apply_binding_terms(binding, data):
    """Capture the offered terms (designation/department/shift/offered wage) at
    bind time. These drive the worker's Current Employment Details."""
    from decimal import Decimal, InvalidOperation
    for field in ("designation", "department", "shift"):
        value = data.get(field)
        if value not in (None, ""):
            setattr(binding, field, str(value).strip()[:80])
    wage = data.get("offeredWage", data.get("offered_wage"))
    if wage not in (None, ""):
        try:
            binding.offered_wage = Decimal(str(wage))
        except (InvalidOperation, ValueError):
            pass
    return binding


def _sync_employment_from_binding(binding):
    """Auto-link connected records when a binding becomes ACCEPTED. Creates or
    refreshes the worker's WorkerEmployment row (drives the dashboard, gate
    passes and payroll views) from the binding's offered terms."""
    if binding is None or binding.binding_status != "ACCEPTED":
        return
    emp, _ = WorkerEmployment.objects.get_or_create(user=binding.worker)
    emp.assignment = binding
    if binding.designation:
        emp.designation = binding.designation
    if binding.department:
        emp.department = binding.department
    if binding.shift:
        emp.shift = binding.shift
    if binding.accepted_at and not emp.doj:
        emp.doj = binding.accepted_at.date()
    emp.status = "Active"
    if not emp.id_card_issue_date:
        emp.id_card_issue_date = (binding.accepted_at.date() if binding.accepted_at
                                  else timezone.now().date())
    if not emp.id_card_validity_till:
        emp.id_card_validity_till = _id_card_validity(emp.id_card_issue_date)
    emp.save()


def _unlink_employment_from_binding(binding):
    """Reverse the auto-link when a binding is cancelled (unbound)."""
    if binding is None:
        return
    WorkerEmployment.objects.filter(user=binding.worker, assignment=binding).update(
        assignment=None, status="Inactive")


def _verify_binding_otp(mobile, credential):
    otp = SmsOtp.objects.filter(mobile=mobile, purpose="BINDING").order_by("-created_at").first()
    if otp is None or otp.is_expired or otp.attempts >= otp.max_attempts:
        return False
    if not check_password(str(credential), otp.otp_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False
    otp.verified = True
    otp.save(update_fields=["verified"])
    return True


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_bindings(request):
    """Binding register (E·C·S·W). GET: the caller's bindings, role-scoped.
    POST: a contractor initiates a binding to a worker at a site (PENDING)."""
    from bss_core.models import WorkerContractorBinding
    user = request.user
    if request.method == "GET":
        if user.role == "contractor":
            qs = WorkerContractorBinding.objects.filter(contractor=user)
        elif user.role == "employer":
            qs = WorkerContractorBinding.objects.filter(site__employer=user)
        else:
            qs = WorkerContractorBinding.objects.filter(worker=user)
        return Response({"data": [payloads._binding_row(b) for b in qs.order_by("-created_at")[:50]]},
                        status=status.HTTP_200_OK)

    if user.role != "contractor":
        return Response({"error": "Only contractors can initiate bindings."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(user):
        return Response({"error": "Enable binding in your settings before sending binding requests."},
                        status=status.HTTP_403_FORBIDDEN)
    worker = User.objects.filter(pk=request.data.get("worker")).first()
    site = Site.objects.filter(pk=request.data.get("site")).first()
    if not worker or worker.role != "worker" or not site:
        return Response({"error": "A valid worker and site are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    if site.employer_id and not _binding_enabled(site.employer):
        return Response({"error": "The principal employer has disabled binding."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(worker):
        return Response({"error": "This worker has disabled binding requests in their settings."},
                        status=status.HTTP_403_FORBIDDEN)
    b = _active_worker_binding(worker, user, site)
    if b is not None and b.binding_status == "ACCEPTED":
        return Response({"error": "Already bound to this worker at this site."},
                        status=status.HTTP_400_BAD_REQUEST)
    b = _request_worker_binding(worker, user, site)
    b.binding_status = "PENDING"
    b.consent_worker = False
    b.consent_contractor = False
    _apply_binding_terms(b, request.data)
    b.save()
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_otp(request, binding_id):
    """Send a binding OTP to the WORKER's mobile. Only the contractor may trigger
    this: the OTP goes to the worker's phone and the worker reads it back to the
    contractor, who enters it to record the worker's consent. This lets a
    non-smartphone worker approve a binding without operating the app."""
    from bss_core.models import WorkerContractorBinding
    b = WorkerContractorBinding.objects.filter(pk=binding_id).first()
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.user != b.contractor:
        return Response({"error": "Only the contractor can send a binding OTP to the worker."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(b.worker):
        return Response({"error": "Binding is disabled in the worker's settings."},
                        status=status.HTTP_403_FORBIDDEN)
    mobile = _user_mobile(b.worker)
    _issue_otp(mobile, purpose="BINDING", ttl_minutes=5)
    masked = ("*" * max(0, len(mobile) - 4)) + mobile[-4:]
    return Response({"sent": True, "expiresIn": 300, "target": "worker", "mobile": masked},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_consent(request, binding_id):
    """Two-sided consent for binding or unbinding.

    body: {action:'bind'|'unbind', side:'worker'|'contractor', stage:'APP'|'OTP', otp?}
    - APP stage: only the party themselves may consent (side must be the caller).
    - OTP stage: the OTP is verified against `side`'s mobile; either party may
      enter it (a non-smartphone party dictates it to the other).
    A binding becomes ACCEPTED only when both sides consent; it becomes CANCELLED
    (unbound) only when both sides consent to unbinding. Both parties must have
    binding enabled in their settings.
    """
    from bss_core.models import WorkerContractorBinding
    b = WorkerContractorBinding.objects.filter(pk=binding_id).first()
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if user not in (b.worker, b.contractor):
        return Response({"error": "Not your binding."}, status=status.HTTP_403_FORBIDDEN)
    side = str(request.data.get("side") or ("worker" if user == b.worker else "contractor")).lower()
    if side not in ("worker", "contractor"):
        return Response({"error": "side must be worker or contractor."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _binding_enabled(b.worker) or not _binding_enabled(b.contractor):
        return Response({"error": "Binding is disabled in one party's settings."},
                        status=status.HTTP_403_FORBIDDEN)

    action = str(request.data.get("action") or "bind").lower()
    stage = str(request.data.get("stage") or "APP").upper()
    method = "app"
    if stage == "OTP":
        if side != "worker":
            return Response({"error": "Only the worker can consent by OTP."},
                            status=status.HTTP_400_BAD_REQUEST)
        otp_value = str(request.data.get("otp") or "").strip()
        if not otp_value or not _verify_binding_otp(_user_mobile(b.worker), otp_value):
            return Response({"error": "Invalid or expired OTP."},
                            status=status.HTTP_400_BAD_REQUEST)
        method = "sms_otp"
    elif side != ("worker" if user == b.worker else "contractor"):
        return Response({"error": "Only a party can consent for themselves in-app."},
                        status=status.HTTP_403_FORBIDDEN)

    if action == "decline":
        b.binding_status = "REJECTED"
        b.save(update_fields=["binding_status"])
        return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)
    if action == "unbind":
        if side == "worker":
            b.unbind_consent_worker = True
        else:
            b.unbind_consent_contractor = True
        if not b.unbind_requested_at:
            b.unbind_requested_at = timezone.now()
        if b.unbind_consent_worker and b.unbind_consent_contractor:
            b.binding_status = "CANCELLED"
            b.unbound_at = timezone.now()
        b.save()
        if b.binding_status == "CANCELLED":
            _unlink_employment_from_binding(b)
    else:
        if side == "worker":
            b.consent_worker = True
        else:
            b.consent_contractor = True
        b.consent_method = method
        if b.consent_worker and b.consent_contractor:
            b.binding_status = "ACCEPTED"
            b.accepted_at = timezone.now()
        b.save()
        if b.binding_status == "ACCEPTED":
            _sync_employment_from_binding(b)
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)


def _contractor_engaged_at_site(contractor, site_id):
    return ContractorSiteAllotment.objects.filter(
        binding__contractor=contractor, binding__binding_status="ACCEPTED",
        site_id=site_id, status="APPROVED").exists()


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_scan(request):
    """Create/append a contractor<->employer binding from a scanned QR.

    body: {type:'BSS_EMPLOYER'|'BSS_CONTRACTOR'|'BSS_SITE', bssId?, siteToken?}
    - employer/contractor QR -> binding request (PENDING), source *_qr.
    - site QR -> binding request (PENDING) + a PENDING site allotment (appended).
    """
    user = request.user
    body = request.data or {}
    qr_type = str(body.get("type") or "").upper()
    site = None
    contractor = None
    employer = None
    source = "site_qr"

    if qr_type == "BSS_SITE":
        site = Site.objects.filter(site_qr_token=str(body.get("siteToken") or "")).first()
        if site is None:
            return Response({"error": "Unknown site QR."}, status=status.HTTP_404_NOT_FOUND)
        if user.role != "contractor":
            return Response({"error": "Only contractors can scan a site QR."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = user, site.employer, "site_qr"
    elif qr_type == "BSS_EMPLOYER":
        ep = EmployerProfile.objects.filter(employer_code=str(body.get("bssId") or "")).first()
        if ep is None:
            return Response({"error": "Unknown employer."}, status=status.HTTP_404_NOT_FOUND)
        if user.role != "contractor":
            return Response({"error": "Only contractors can request an employer binding."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = user, ep.user, "employer_qr"
    elif qr_type == "BSS_CONTRACTOR":
        cp = ContractorProfile.objects.filter(contractor_code=str(body.get("bssId") or "")).first()
        if cp is None:
            return Response({"error": "Unknown contractor."}, status=status.HTTP_404_NOT_FOUND)
        if user.role != "employer":
            return Response({"error": "Only employers can scan a contractor QR."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = cp.user, user, "contractor_qr"
    elif qr_type == "BSS_WORKER":
        # Contractor scans a worker's ID-card QR -> worker binding request (PENDING).
        if user.role != "contractor":
            return Response({"error": "Only contractors can bind workers."},
                            status=status.HTTP_403_FORBIDDEN)
        wi = WorkerIdentity.objects.filter(bss_worker_id=str(body.get("bssId") or "")).first()
        if wi is None:
            return Response({"error": "Unknown worker."}, status=status.HTTP_404_NOT_FOUND)
        worker_user = wi.user
        # A binding must connect two different roles.
        if worker_user.role != "worker":
            return Response({"error": "The scanned QR is not a worker credential."},
                            status=status.HTTP_400_BAD_REQUEST)
        if worker_user.id == user.id:
            return Response({"error": "You cannot bind your own account."},
                            status=status.HTTP_400_BAD_REQUEST)
        # Resolve the site: explicit name, else a site the contractor is bound to,
        # else an approved allotment.
        site = Site.objects.filter(site_name__iexact=str(body.get("site") or "")).first() if body.get("site") else None
        if site is None:
            site = Site.objects.filter(bindings__contractor=user).first()
        if site is None:
            site = Site.objects.filter(contractor_allotments__binding__contractor=user,
                                       contractor_allotments__status="APPROVED").first()
        if site is None:
            return Response({"error": "No site available for this binding. Ask the employer to allot a site first."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not _binding_enabled(worker_user) or not _binding_enabled(user):
            return Response({"error": "Binding is disabled in one party's settings."},
                            status=status.HTTP_403_FORBIDDEN)
        if WorkerContractorBinding.objects.filter(worker=worker_user, binding_status="ACCEPTED").exists():
            return Response({"error": "This worker is already bound to a contractor."},
                            status=status.HTTP_409_CONFLICT)
        binding = _request_worker_binding(worker_user, user, site)
        binding.binding_status = "PENDING"
        binding.consent_contractor = True
        binding.consent_worker = False
        binding.consent_method = "app"
        binding.save()
        return Response({"data": payloads._binding_row(binding)}, status=status.HTTP_201_CREATED)
    else:
        return Response({"error": "Unsupported QR."}, status=status.HTTP_400_BAD_REQUEST)

    if employer is None:
        return Response({"error": "This site has no principal employer."}, status=status.HTTP_400_BAD_REQUEST)
    # Contractor <-> employer bindings must connect two different roles.
    if contractor.role != "contractor" or employer.role != "employer":
        return Response({"error": "A binding must connect a contractor and a principal employer."},
                        status=status.HTTP_400_BAD_REQUEST)
    if contractor.id == employer.id:
        return Response({"error": "An account cannot bind to itself."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _binding_enabled(contractor) or not _binding_enabled(employer):
        return Response({"error": "Binding is disabled in one party's settings."},
                        status=status.HTTP_403_FORBIDDEN)

    binding = (ContractorEmployerBinding.objects
               .filter(contractor=contractor, employer=employer,
                       binding_status__in=("PENDING", "ACCEPTED"))
               .order_by("-created_at").first())
    if binding is None:
        # Previous request(s) were rejected/cancelled — keep them as history and
        # open a fresh PENDING request rather than overwriting the decline.
        binding = ContractorEmployerBinding.objects.create(
            contractor=contractor, employer=employer, binding_status="PENDING")
    binding.source = source
    if user == contractor:
        binding.consent_contractor = True
    else:
        binding.consent_employer = True
    if binding.consent_contractor and binding.consent_employer:
        binding.binding_status = "ACCEPTED"
        binding.accepted_at = timezone.now()
    binding.save()

    if site is not None:
        ContractorSiteAllotment.objects.get_or_create(
            binding=binding, site=site, defaults={"status": "PENDING", "source": "site_qr"})

    return Response({"data": payloads._ce_binding_row(binding)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_bindings(request):
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"data": payloads._employer_bindings(request.user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_binding_action(request, binding_id):
    """Actions on a contractor<->employer binding.

    body: {action:'approve-binding'|'approve-site'|'allot'|'reject', siteId?, siteIds?}
    Both parties may approve the binding (two-sided consent). Only the employer
    may approve a site or allot sites. Binding has no OTP — accept in-app.
    """
    user = request.user
    if user.role == "employer":
        b = ContractorEmployerBinding.objects.filter(pk=binding_id, employer=user).first()
    elif user.role == "contractor":
        b = ContractorEmployerBinding.objects.filter(pk=binding_id, contractor=user).first()
    else:
        return Response({"error": "Not your binding."}, status=status.HTTP_403_FORBIDDEN)
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    action = str(request.data.get("action") or "").lower()

    if action == "approve-binding":
        if user.role == "employer":
            b.consent_employer = True
        else:
            b.consent_contractor = True
        b.consent_method = "app"
        if b.consent_contractor and b.consent_employer:
            b.binding_status = "ACCEPTED"
            b.accepted_at = timezone.now()
        b.save()
    elif action == "reject":
        b.binding_status = "REJECTED"
        b.save(update_fields=["binding_status"])
    elif action == "approve-site":
        if user.role != "employer":
            return Response({"error": "Only the employer can approve a site."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."}, status=status.HTTP_404_NOT_FOUND)
        a.status = "APPROVED"
        a.approved_at = timezone.now()
        a.save()
    elif action == "allot":
        if user.role != "employer":
            return Response({"error": "Only the employer can allot sites."},
                            status=status.HTTP_403_FORBIDDEN)
        site_ids = request.data.get("siteIds") or []
        for sid in site_ids:
            site = Site.objects.filter(pk=sid, employer=request.user).first()
            if site is None:
                continue
            ContractorSiteAllotment.objects.update_or_create(
                binding=b, site=site,
                defaults={"status": "APPROVED", "source": "employer_allot",
                          "approved_at": timezone.now()})
    else:
        return Response({"error": "Unsupported action."}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": payloads._ce_binding_row(b)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_submissions(request):
    return _submissions(request)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_submissions(request):
    return _submissions(request)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_verify_document(request):
    """Verify an uploaded PAN/UAN/ESIC/Aadhaar document via OCR + keyword match.

    Multipart fields: file, docType (aadhaar|pan|uan|esic), number, name.
    Ported from the EesassinErp WorkerController.cs VerifyDoc logic. On success
    the matched number is persisted to the worker's record, which the payload
    surfaces as the "verified" flag (e.g. panVerified derives from identity.pan).
    """
    user = request.user
    file_obj = request.FILES.get("file")
    doc_type = (request.data.get("docType") or "").strip().lower()
    number = (request.data.get("number") or "").strip()
    name = (request.data.get("name") or "").strip()

    if not file_obj:
        return Response({"error": "Choose a document to verify."}, status=status.HTTP_400_BAD_REQUEST)
    if doc_type not in ("aadhaar", "pan", "uan", "esic"):
        return Response({"error": "Unsupported document type."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        text = ocr_client.extract_text(file_obj.read(), file_obj.name)
    except ocr_client.OcrError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    ok, message = ocr_client.verify_document_text(doc_type, text, expected_number=number, expected_name=name)
    if not ok:
        return Response({"verified": False, "docType": doc_type, "message": message},
                        status=status.HTTP_200_OK)

    # Persist the verified number.
    if doc_type in ("aadhaar", "pan"):
        identity = WorkerIdentity.objects.filter(user=user).first()
        if identity is None:
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=bss_ids.new_bss_worker_id(),
                qr_token=uuid.uuid4().hex + uuid.uuid4().hex[:8],
                name=user.get_full_name() or "")
        if number:
            setattr(identity, "aadhaar" if doc_type == "aadhaar" else "pan", number)
        identity.save()
    else:  # uan / esic
        ss, _ = WorkerSocialSecurity.objects.get_or_create(user=user)
        if number:
            setattr(ss, "epfo_uan" if doc_type == "uan" else "esic_ip_number", number)
        ss.save()

    return Response({"verified": True, "docType": doc_type, "message": message},
                    status=status.HTTP_200_OK)


def _submissions(request):
    file_obj = request.FILES.get("file")
    ftype = (request.data.get("type") or "").strip()
    site = (request.data.get("site") or "").strip()
    period = (request.data.get("period") or "").strip()
    employer = (request.data.get("employer") or "").strip()
    user = request.user

    checksum = ""
    if file_obj:
        checksum = payloads.sha256_checksum(file_obj)

    submission = SubmissionEvidence(
        user=user,
        role="worker" if user.role == "worker" else "contractor",
        doc_type=ftype,
        site=site,
        period=period,
        employer=employer,
        original_name=file_obj.name if file_obj else "",
        file_size=file_obj.size if file_obj else 0,
        mime_type=file_obj.content_type if file_obj else "",
        checksum_sha256=checksum,
    )
    if file_obj:
        safe_name = os.path.basename(file_obj.name or "evidence")
        submission.file.save(safe_name, file_obj, save=False)
    submission.save()

    return Response({
        "data": {
            "id": submission.id, "type": ftype, "employer": employer,
            "site": site, "period": period, "status": "PENDING",
            "submittedAt": payloads._dts(timezone.now()),
            "fileName": submission.original_name, "checksum": checksum,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def submission_file_download(request, role_path, submission_id):
    submission = SubmissionEvidence.objects.filter(pk=submission_id).first()
    if submission is None:
        return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    allowed = False
    if user.is_superuser or user.role in ("government", "bss_staff", "admin"):
        allowed = True
    elif submission.user_id == user.id:
        allowed = True
    elif user.role == "employer":
        allowed = SubmissionEvidence.objects.filter(
            pk=submission.id, user__worker_bindings__site__employer=user).exists()
    if not allowed:
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)

    if not submission.file:
        return Response({"error": "file missing"}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(
        submission.file.open("rb"),
        as_attachment=True,
        filename=submission.original_name or f"evidence-{submission.id}",
    )


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_payroll(request):
    if request.user.role not in ("bss_admin", "bss_staff", "government", "admin"):
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    return Response(payloads.build_admin_payroll(request.user), status=status.HTTP_200_OK)
