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
    WorkerContractorBinding,
    WorkerEducation,
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
from . import aadhaar_client, ocr_client, v1_payloads as payloads


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
    # BSS ID lookup (worker / contractor / employer)
    wi = WorkerIdentity.objects.filter(bss_worker_id=identifier).first()
    if wi:
        return wi.user
    cp = ContractorProfile.objects.filter(contractor_code=identifier).first()
    if cp:
        return cp.user
    ep = EmployerProfile.objects.filter(employer_code=identifier).first()
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
        msg = (result.get("data") or {}).get("message") or \
            "Aadhaar verification service is currently experiencing delays."
        return Response({"error": str(msg)}, status=status.HTTP_502_BAD_GATEWAY)

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
            identity = WorkerIdentity.objects.create(
                user=user,
                bss_worker_id=_bss_worker_id(user.id),
                name=data.get("name") or "",
                gender=(data.get("gender") or "").upper() or "",
                date_of_birth=_parse_dob(data.get("date_of_birth")),
                aadhaar=aadhaar,
                photo=photo_url,
            )
            WorkerOther.objects.get_or_create(user=user)
            _record_registration_consent(user)
            UserCredential.objects.create(user=user, identity_type="aadhaar",
                                          identity_value=aadhaar,
                                          is_primary=False, verified=True)
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
            # Populate the Aadhaar-owned (frozen) current-address block.
            WorkerAddressMobility.objects.get_or_create(
                user=user,
                defaults={
                    "current_address": data.get("full_address") or "",
                    "current_state": addr.get("state") or "",
                    "current_district": addr.get("district") or "",
                    "current_city": addr.get("vtc") or addr.get("city") or "",
                    "current_pincode": str(addr.get("pincode") or ""),
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
        identity = WorkerIdentity.objects.create(user=user, bss_worker_id=_bss_worker_id(user.id))

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
    identity.save()

    a, _ = WorkerAddressMobility.objects.get_or_create(user=user)
    a.permanent_address = data.get("full_address") or a.permanent_address
    a.permanent_state = addr.get("state") or a.permanent_state
    a.permanent_district = addr.get("district") or a.permanent_district
    a.permanent_city = addr.get("vtc") or addr.get("city") or a.permanent_city
    if addr.get("pincode"):
        a.permanent_pincode = str(addr.get("pincode"))
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


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register_worker(request):
    body = request.data or {}
    contact = (body.get("contact") or "").strip()
    role = body.get("role")
    accepted = body.get("acceptedTerms", False)
    if (role or "").lower() != "worker":
        return Response({"error": "role must be Worker"}, status=status.HTTP_400_BAD_REQUEST)
    if not accepted:
        return Response({"error": "terms must be accepted"}, status=status.HTTP_400_BAD_REQUEST)
    if not contact:
        return Response({"error": "contact is required"}, status=status.HTTP_400_BAD_REQUEST)

    otp_value = body.get("otp")
    if otp_value and not _verify_login_otp(contact, otp_value):
        return Response({"error": "invalid or expired OTP"}, status=status.HTTP_401_UNAUTHORIZED)

    identifier = f"worker_{contact[-10:]}" if len(contact) > 10 else f"worker_{contact}"
    if User.objects.filter(username=identifier).exists():
        identifier = f"worker_{contact[-10:]}_{uuid.uuid4().hex[:4]}"

    with transaction.atomic():
        user = User.objects.create_user(username=identifier, password="Bss@Worker123",
                                        role="worker", account_active=True,
                                        is_verified=True, is_active=True)
        identity = WorkerIdentity.objects.create(
            user=user,
            bss_worker_id=_bss_worker_id(user.id),
                name="",
                mobile_number=contact,
        )
        WorkerOther.objects.get_or_create(user=user)
        _record_registration_consent(user)
        cred, _ = UserCredential.objects.get_or_create(
            identity_type="mobile", identity_value=contact,
            defaults={"user": user, "is_primary": True, "verified": True})

    payload = _make_session_payload(user)
    payload["bssId"] = identity.bss_worker_id
    payload["subject"] = user.username
    return Response(payload, status=status.HTTP_201_CREATED)


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
@api_view(["POST", "PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def mutate_portal(request, role_path, resource):
    user = request.user
    body = request.data or {}
    generated_id = _persist_mutation(user, role_path, resource, request.method, body)

    if request.method == "DELETE":
        return Response({"success": True, "deleted": True, "id": generated_id},
                        status=status.HTTP_200_OK)

    out = dict(body or {})
    out["id"] = generated_id
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
                setattr(prof, attr, (field.get("value") or "").strip())
            prof.save()
            return prof.id
        return int(uuid.uuid4().int % 10**10)
    if resource == "profile" and user.role == "worker" and method in ("PATCH", "POST"):
        # Worker portal "profile" PATCH — persist editable identity sub-fields.
        identity = WorkerIdentity.objects.filter(user=user).first()
        if not identity:
            identity = WorkerIdentity.objects.create(
                user=user, bss_worker_id=_bss_worker_id(user.id),
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
        name = body.get("name") or "Worker"
        mobile = body.get("mobile") or body.get("contact") or ""
        username = f"worker_{uuid.uuid4().hex[:8]}"
        w = User.objects.create_user(username=username, password="Bss@Worker123",
                                     role="worker", account_active=True, is_active=True)
        WorkerIdentity.objects.create(user=w, bss_worker_id=_bss_worker_id(w.id),
                                      name=name, mobile_number=mobile)
        site_id = body.get("siteId")
        site = Site.objects.filter(pk=site_id).first() if site_id else None
        if user.role == "contractor" and site:
            WorkerContractorBinding.objects.create(worker=w, contractor=user, site=site,
                                                   binding_status="ACCEPTED")
        return w.id
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
    return int(uuid.uuid4().int % 10**10)


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
    worker_id = body.get("workerId")
    site_id = body.get("siteId")
    worker = User.objects.filter(pk=worker_id).first() if worker_id else user
    site = Site.objects.filter(pk=site_id).first() if site_id else None
    gp = WorkerGatePass.objects.create(
        worker=worker, site=site, gate_pass_type=body.get("type") or "TGP",
        gate_pass_no=body.get("gatePassNo") or f"GP-{uuid.uuid4().hex[:8].upper()}",
        status=body.get("status") or "PENDING", issued_by=user,
    )
    return gp.id


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
    assigned = g.assigned_to.get_full_name() if g.assigned_to else ""
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
    g = WorkerGrievance(
        worker=user, category=category, language=language, body=text,
        attachment_file=attachment, status="SUBMITTED", submitted_at=timezone.now(),
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
    b, _ = WorkerContractorBinding.objects.get_or_create(worker=worker, contractor=user, site=site)
    if b.binding_status == "ACCEPTED":
        return Response({"error": "Already bound to this worker at this site."},
                        status=status.HTTP_400_BAD_REQUEST)
    b.binding_status = "PENDING"
    b.consent_worker = False
    b.consent_contractor = False
    b.save(update_fields=["binding_status", "consent_worker", "consent_contractor"])
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_otp(request, binding_id):
    """Send a binding OTP to a party's mobile (default: the worker) so a
    non-smartphone party can dictate it to the other to complete the binding."""
    from bss_core.models import WorkerContractorBinding
    b = WorkerContractorBinding.objects.filter(pk=binding_id).first()
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.user not in (b.worker, b.contractor):
        return Response({"error": "Not your binding."}, status=status.HTTP_403_FORBIDDEN)
    target = str(request.data.get("target") or "worker").lower()
    person = b.contractor if target == "contractor" else b.worker
    if not _binding_enabled(person):
        return Response({"error": "Binding is disabled in that party's settings."},
                        status=status.HTTP_403_FORBIDDEN)
    mobile = _user_mobile(person)
    _issue_otp(mobile, purpose="BINDING", ttl_minutes=5)
    masked = ("*" * max(0, len(mobile) - 4)) + mobile[-4:]
    return Response({"sent": True, "expiresIn": 300, "target": target, "mobile": masked},
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
        person = b.worker if side == "worker" else b.contractor
        otp_value = str(request.data.get("otp") or "").strip()
        if not otp_value or not _verify_binding_otp(_user_mobile(person), otp_value):
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
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)


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
                user=user, bss_worker_id=_bss_worker_id(user.id),
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
