"""Shared helpers, ORM imports, constants, auth backend and error types for the /v1/ bridge."""

# ruff: noqa: F401,F403
import json
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import Q
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
from .. import aadhaar_client, bss_ids, clra, compliance, ocr_client, v1_payloads as payloads


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
        "Date of Incorporation": "incorporation_date",
        "Authorised Person Name": "contact_person",
        "Mobile Number": "mobile",
        "Email ID": "email",
        "Age of Company": "company_age",
        "Activity": "activity",
        "NIC Code": "nic_code",
        "PAN": "pan_no",
        "PAN Document": "pan_no",
        "GSTIN": "gstin",
        "GST Certificate": "gstin",
        "Udyam Registration Number": "udyam_no",
        "Labour Department Registration Number": "labour_dept_reg_no",
        "Contract Labour Licence Number": "clra_licence_no",
        "Contract Labour Licence": "clra_licence_no",
        "BOCW / Other Labour Registration": "bocw_reg_no",
        "Licence Valid From": "licence_valid_from",
        "Licence Valid To": "licence_valid_to",
        "Primary Contact Name": "contact_person",
        "Primary Contact Mobile": "mobile",
        "Primary Contact Email": "email",
        "Registered Address": "address",
        "State / UT": "state",
        "Operating States": "operating_states",
        "Principal Employer Name": "employer_name",
        "Onboarding Method": "onboarding_method",
        "Attendance Method": "attendance_method",
        "Payroll Method": "payroll_method",
    },
}
PORTAL_ROLE = {
    "worker": "Worker",
    "contractor": "Contractor",
    "employer": "Employer",
    "government": "Government",
    "bss_staff": "BSS Staff",
    "bss_admin": "BSS Admin",
}
_MPIN_RE = re.compile(r"^\d{4,6}$")
_AADHAAR_RE = re.compile(r"^\d{12}$")
_REGISTRATION = {
    "worker": {"password": "Bss@Worker123"},
    "contractor": {"password": "Bss@Contractor123"},
    "employer": {"password": "Bss@Employer123"},
}
_PROFILE_DATE_FIELDS = {
    "incorporation_date", "agm_date", "balance_sheet_date",
    "licence_valid_from", "licence_valid_to", "consent_date", "verification_date",
}
_GRIEVANCE_ACTION_WORDS = {
    "submit": "raised", "reply": "replied to", "respond": "replied to",
    "resolve": "marked resolved", "reopen": "reopened",
    "confirm": "confirmed resolution of", "view": "viewed",
}
_SITE_EDITABLE_FIELDS = tuple(
    f.name for f in Site._meta.get_fields()
    if not getattr(f, "auto_created", False)
    and not getattr(f, "many_to_one", False)
    and not getattr(f, "many_to_many", False)
    and not getattr(f, "one_to_one", False)
    and f.name not in ("id", "site_qr_token", "created_at", "updated_at", "employer")
)
_TEXT_FIELD_TYPES = ("CharField", "TextField", "SlugField", "EmailField", "URLField")


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


def _create_notification(user, title, body, notif_type="APPROVAL", link=""):
    """Helper to persist a Notification record for a targeted user."""
    if not user:
        return None
    try:
        return Notification.objects.create(
            user=user,
            type=notif_type,
            title=str(title)[:120],
            body=str(body)[:500],
            link=str(link)[:255],
            is_read=False
        )
    except Exception as err:
        logger.warning(f"Failed to create notification for user {getattr(user, 'id', None)}: {err}")
        return None


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


def _normalize_mobile(value):
    """Canonical 10-digit mobile, or "" when not a 10-digit number.

    Collapses formatting variants so the same real phone cannot be registered
    twice under different roles: strips non-digits, drops a leading country code
    (91) or trunk 0, then requires 10 digits.
    """
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10:
        return digits
    return ""


def _requested_roles(role):
    """The user roles a requested portal role maps to ([] when none given)."""
    if not role:
        return []
    role_lower = str(role).lower()
    roles = [portal for portal, label in PORTAL_ROLE.items() if label.lower() == role_lower]
    if not roles and role in dict(User.ROLE_CHOICES):
        roles = [role]
    return roles


def _find_user(identifier):
    user = User.objects.filter(username=identifier).first()
    if user:
        return user
    cred = UserCredential.objects.filter(identity_value=identifier).first()
    if cred:
        return cred.user
    # A mobile entered with a country code / trunk prefix / spaces should still
    # resolve to the account that owns the canonical number.
    normalized = _normalize_mobile(identifier)
    if normalized and normalized != str(identifier or "").strip():
        cred = UserCredential.objects.filter(identity_value=normalized).first()
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
    # Demo accounts: a fixed OTP (no real delivery) for whitelisted mobiles, for
    # every in-app OTP purpose (login, binding, ...). Aadhaar OTP is issued by the
    # UIDAI flow and never goes through here, so it is unaffected. Enabled by
    # setting BSS_DEMO_OTP_MOBILES to the whitelist (empty = disabled).
    demo = purpose != "AADHAAR" and str(mobile) in _demo_otp_mobiles()
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
    from .. import whatsapp_client

    whatsapp_client.deliver_async(otp_pk, mobile, otp_value, ttl_minutes)


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


def _mobile_credential_for(user):
    cred = user.credentials.filter(identity_type__in=("mobile", "phone")).first()
    if cred is None:
        cred = UserCredential.objects.create(
            user=user, identity_type="mobile", identity_value=_user_mobile(user),
            is_primary=True, verified=False)
    return cred


class PortalMutationError(Exception):
    """Raised by resource handlers to reject a mutation with a clear message."""

    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _nominee_doc_blob(docs):
    """Upper-cased text of a nominee's attached documents (handles both the
    legacy string list and the {type,name,fileName} object list)."""
    parts = []
    for d in (docs or []):
        if isinstance(d, dict):
            parts.extend(str(d.get(k) or "") for k in ("type", "name", "fileName"))
        else:
            parts.append(str(d))
    return " ".join(parts).upper()


def _coerce_int(value):
    """Best-effort int for optional numeric form fields ('' / None / bad -> None)."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return None


def _coerce_profile_date(value):
    """Parse a profile date field; blank/invalid -> None so a DateField never
    receives an empty string (which Django rejects)."""
    text = (value or "").strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _parse_iso_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _coerce_site_value(field, value):
    internal = field.get_internal_type()
    if value is None or value == "":
        # Text columns are NOT NULL with blank=True — an empty value is "" not
        # NULL. Everything else may use NULL when the column allows it.
        return "" if internal in _TEXT_FIELD_TYPES else None
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


def _rate_limit(key, limit, window_seconds):
    """Best-effort fixed-window rate limit backed by the cache (Redis in prod,
    local memory in dev). Returns True when the request is allowed, False when
    the limit is exceeded. Fails open so a cache outage never blocks scans."""
    try:
        full = f"rl:{key}"
        if cache.add(full, 1, window_seconds):
            return True
        try:
            count = cache.incr(full)
        except ValueError:
            cache.set(full, 1, window_seconds)
            return True
        return count <= limit
    except Exception:
        return True


def _otp_send_allowed(scope, key, limit=5, window_seconds=900):
    """Throttle OTP sends per scope+key (e.g. per mobile or per user): at most
    `limit` sends per `window_seconds`. The client offers one send plus three
    resends; the backend keeps a small buffer above that."""
    return _rate_limit(f"otp:{scope}:{key}", limit, window_seconds)


__all__ = [
    "AadhaarChallenge",
    "AllowAny",
    "ApprovalQueue",
    "BaseAuthentication",
    "BssSessionAuthentication",
    "ContractorEmployerBinding",
    "ContractorProfile",
    "ContractorSiteAllotment",
    "EmployerProfile",
    "FileResponse",
    "IsAuthenticated",
    "JWTAuthentication",
    "Notification",
    "PORTAL_ROLE",
    "PortalMutationError",
    "Q",
    "RefreshToken",
    "Response",
    "Site",
    "SmsOtp",
    "SubmissionEvidence",
    "User",
    "UserCredential",
    "UserPreference",
    "WorkerAddressMobility",
    "WorkerBanking",
    "WorkerClassification",
    "WorkerContractorBinding",
    "WorkerEducation",
    "WorkerEmployment",
    "WorkerFamilyDependant",
    "WorkerGatePass",
    "WorkerIdentity",
    "WorkerOther",
    "WorkerSkill",
    "WorkerSkillsEmployability",
    "WorkerSocialSecurity",
    "WorkerWelfareSafety",
    "_AADHAAR_RE",
    "_GRIEVANCE_ACTION_WORDS",
    "_MPIN_RE",
    "_PROFILE_DATE_FIELDS",
    "_PROFILE_LABEL_MAP",
    "_REGISTRATION",
    "_SITE_EDITABLE_FIELDS",
    "_TEXT_FIELD_TYPES",
    "_bss_worker_id",
    "_coerce_int",
    "_coerce_profile_date",
    "_coerce_site_value",
    "_create_notification",
    "_deliver_otp_async",
    "_demo_otp_mobiles",
    "_find_user",
    "_normalize_mobile",
    "_requested_roles",
    "_generate_otp_value",
    "_issue_otp",
    "_issue_tokens",
    "_make_session_payload",
    "_mobile_credential_for",
    "_nominee_doc_blob",
    "_parse_date",
    "_parse_iso_date",
    "_rate_limit",
    "_otp_send_allowed",
    "_record_registration_consent",
    "_user_mobile",
    "_verify_credential",
    "_verify_login_otp",
    "aadhaar_client",
    "api_view",
    "authentication_classes",
    "bss_ids",
    "cache",
    "check_password",
    "clra",
    "compliance",
    "datetime",
    "json",
    "logging",
    "make_password",
    "ocr_client",
    "os",
    "payloads",
    "permission_classes",
    "re",
    "secrets",
    "settings",
    "status",
    "timedelta",
    "timezone",
    "transaction",
    "uuid",
]
