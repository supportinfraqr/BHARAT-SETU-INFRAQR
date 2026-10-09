"""Shared helpers, ORM imports, constants, auth backend and error types for the /v1/ bridge."""

# ruff: noqa: F401,F403
import json
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
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
from rest_framework.exceptions import AuthenticationFailed
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
        "Principal Employer Name": "principal_employer_name",
        "Principal Employer ID": "principal_employer_id",
        "Site / Establishment Name": "site_establishment_name",
        "Site ID": "site_ref_id",
        "Contract / Work Order Number": "work_order_number",
        "Contract Start Date": "contract_start_date",
        "Contract End Date": "contract_end_date",
        "Bank Name": "bank_name",
        "Annual Turnover Band": "turnover_band",
        "Registration Date": "registration_date",
        "Onboarding Method": "onboarding_method",
        "Attendance Method": "attendance_method",
        "Payroll Method": "payroll_method",
        "QR Scanner / Device ID": "qr_device_id",
        "Company Name": "company_name",
        "CIN": "cin",
        "ROC": "roc",
        "Registration Number": "registration_number",
        "Company Category": "category_name",
        "Company Sub Category": "sub_category",
        "Class of Company": "entity_class",
        "Listed on Stock Exchange": "listed_on_stock_exchange",
        "Company Status": "company_status",
        "NIC Description": "nic_description",
        "Number of Members": "members_count",
        "Date of Last Annual General Meeting": "agm_date",
        "Date of Last Filed Balance Sheet": "balance_sheet_date",
        "Authorised Share Capital": "authorized_capital",
        "Paid-up Share Capital": "paid_up_capital",
        "Designation": "auth_designation",
        "Director Name": "director_name",
        "Director Designation": "director_designation",
        "Appointment Date": "director_appointment_date",
        "DIN": "din",
        "Cessation": "director_cessation",
        "Cessation Date": "director_cessation_date",
        "City": "city",
        "District": "district",
        "PIN Code": "pincode",
        "Compliance Contact Name": "compliance_contact_name",
        "Compliance Contact Mobile": "compliance_contact_mobile",
        "Compliance Contact Email": "compliance_contact_email",
        "Bank Account Name": "bank_account_name",
        "Account Number": "bank_account_number",
        "IFSC Code": "bank_ifsc",
        "PF Registration Certificate": "pf_reg_cert",
        "ESIC Registration Proof": "esic_reg_proof",
        "Insurance / Workmen Compensation Proof": "insurance_proof",
        "Bank Proof / Cancelled Cheque": "bank_proof",
        "Other Certificates": "other_certs",
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
    "director_appointment_date", "director_cessation_date",
    "registration_date", "contract_start_date", "contract_end_date",
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
    """Collision-free 15-char worker ID: 'BSSW' + the User primary key
    zero-padded to 11 digits. The PK is unique, so IDs never collide."""
    return f"BSSW{user_id:011d}"


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


def _record_contractor_membership(profile, user, source="Self Registered via App",
                                  registered_by="Contractor Self-Service (BSS App)",
                                  ip_address=""):
    """Stamp the BSS membership record when a contractor profile is created.

    ``registered_at`` and ``consent_date`` are both written from a single
    ``now``, so a contractor who is given a BSS profile has the two agree
    exactly — creating the profile is the point at which consent is recorded,
    whether the profile came from self-service, an admin bulk import, a site
    default or SAP.

    Only runs on creation (``registered_at`` unset) and never overwrites an
    existing value, so a real consent date supplied by SAP — applied after this
    call — or entered by an admin still wins, and re-saving an old profile does
    not rewrite its history.

    Also writes a PartyConsentDeclaration so the acceptance is auditable
    (declaration type, channel and timestamp) rather than being a bare date.
    """
    now = timezone.now()
    changed = []
    creating = profile.registered_at is None
    if creating:
        profile.registered_at = now
        changed.append("registered_at")
        if profile.consent_date is None:
            profile.consent_date = now.date()
            changed.append("consent_date")
    if not profile.registration_source:
        profile.registration_source = source
        changed.append("registration_source")
    if not profile.registered_by:
        profile.registered_by = registered_by
        changed.append("registered_by")
    if changed:
        profile.save(update_fields=changed)

    if creating:
        try:
            from bss_core.models import PartyConsentDeclaration
            PartyConsentDeclaration.objects.get_or_create(
                party_type="contractor", party_user=user, declaration="TERMS",
                defaults={"accepted": True, "ip_address": ip_address or ""})
        except Exception:  # audit aid only — never block sign-up
            logger.exception("contractor consent declaration not recorded for user %s", user.pk)
    return profile


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


SESSION_CACHE_TTL = 60 * 60 * 24
STALE_SESSION_MESSAGE = "Session is no longer active."


def _session_cache_key(user_id):
    return f"u:{user_id}:sid"


def _set_current_session(user, sid):
    """Persist the single active session id (DB + write-through Redis)."""
    user.current_session_id = sid
    user.current_session_at = timezone.now()
    try:
        user.save(update_fields=["current_session_id", "current_session_at"])
    except Exception:  # noqa: BLE001
        pass
    try:
        cache.set(_session_cache_key(user.id), sid, SESSION_CACHE_TTL)
    except Exception:  # noqa: BLE001
        pass


def _current_session_id(user):
    """The user's active session id (Redis first, DB fallback)."""
    key = _session_cache_key(user.id)
    try:
        cached = cache.get(key)
        if cached is not None:
            return cached
    except Exception:  # noqa: BLE001
        pass
    sid = getattr(user, "current_session_id", "") or ""
    try:
        cache.set(key, sid, SESSION_CACHE_TTL)
    except Exception:  # noqa: BLE001
        pass
    return sid


def _blacklist_user_tokens(user):
    """Revoke the user's outstanding refresh tokens (old sessions can't refresh)."""
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:  # noqa: BLE001 — best effort (never block login)
        pass


class BssSessionAuthentication(BaseAuthentication):
    """Validate a simplejwt Bearer token, enforcing the user's single active
    session. When the Bearer is absent/expired, the X-BSS-Subject fallback only
    succeeds if it also carries the matching X-BSS-Session id."""

    def authenticate_header(self, request):
        # Return a header so an unauthenticated/invalid request yields HTTP 401
        # (not the DRF 403 fallback) — the frontends treat 401 as a stale
        # session and redirect to login.
        return "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            try:
                result = JWTAuthentication().authenticate(request)
            except Exception:
                result = None
            if result is not None:
                user, validated = result
                if not _session_ok(user, validated.get("sid") if hasattr(validated, "get") else None):
                    raise AuthenticationFailed(STALE_SESSION_MESSAGE)
                return (user, validated)
            # Invalid/expired Bearer: fall through to the header path below,
            # which requires the active session id.
        subject = request.META.get("HTTP_X_BSS_SUBJECT", "")
        if subject:
            try:
                user = User.objects.get(username=subject)
            except User.DoesNotExist:
                return None
            if not _session_ok(user, request.META.get("HTTP_X_BSS_SESSION", "")):
                raise AuthenticationFailed(STALE_SESSION_MESSAGE)
            return (user, None)
        return None


def _session_ok(user, sid):
    """True when the supplied session id is the user's current one.

    A user with no recorded session (never logged in since this feature) is
    allowed — this lets a still-valid token minted before the change keep
    working until the next login."""
    current = _current_session_id(user)
    if not current:
        return True
    return str(sid or "") == current


def _issue_tokens(user, sid=""):
    refresh = RefreshToken.for_user(user)
    if sid:
        refresh["sid"] = sid
        refresh.access_token["sid"] = sid
    return str(refresh.access_token), str(refresh)


def _make_session_payload(user):
    sid = str(uuid.uuid4())
    # Replacing the active session revokes every previously issued token.
    _blacklist_user_tokens(user)
    _set_current_session(user, sid)
    access, refresh = _issue_tokens(user, sid)
    role = user.role
    return {
        "subject": user.username,
        "role": PORTAL_ROLE.get(role, role),
        "sessionId": sid,
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


# Apr–Mar order so a month's position (and calendar year) can be derived.
_FY_MONTH_ORDER = ["April", "May", "June", "July", "August", "September",
                   "October", "November", "December", "January", "February", "March"]


def _month_name(value):
    """Resolve a month (name, abbreviation or 'Month YYYY') to its full name."""
    text = str(value or "").strip().lower()
    if not text:
        return ""
    for name in _FY_MONTH_ORDER:
        if text.startswith(name[:3].lower()):
            return name
    return ""


def period_in_future(month, year="", financial_year=""):
    """True when the given compliance period has not arrived yet.

    Accepts a month name/abbreviation, with either a calendar ``year`` (the
    generation endpoint sends the month's calendar year) or a ``financial_year``
    such as ``FY 2026-27``. Future periods must not be generated or submitted.
    """
    name = _month_name(month)
    if not name:
        return False
    idx = _FY_MONTH_ORDER.index(name)          # 0=Apr … 8=Dec, 9=Jan … 11=Mar
    digits = "".join(ch for ch in str(financial_year or "") if ch.isdigit())
    if len(digits) >= 4:
        start_year = int(digits[:4])
    elif str(year).strip().isdigit():
        cal = int(str(year).strip()[:4])
        start_year = cal - 1 if idx >= 9 else cal
    else:
        return False
    cal_year = start_year + 1 if idx >= 9 else start_year
    cal_month = ((idx + 3) % 12) + 1
    today = timezone.localdate()
    return cal_year * 12 + cal_month > today.year * 12 + today.month


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
        # Single OTP verifier so the universal OTP (default 123456) applies here
        # too, not just on the mpin/password/binding flows.
        return _verify_login_otp(_user_mobile(user), credential)
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


def _universal_otp():
    """A fixed OTP accepted in *addition* to the real delivered OTP, on any
    server. Defaults to ``123456`` (demo convenience); set ``BSS_UNIVERSAL_OTP``
    to another value, or to an empty string to disable."""
    if "BSS_UNIVERSAL_OTP" in os.environ:
        return os.environ["BSS_UNIVERSAL_OTP"].strip()
    return "123456"


def _verify_login_otp(contact, credential):
    value = str(credential or "").strip()
    # Universal OTP: always accepted, even if no OTP row exists yet (the real
    # OTP path below still works unchanged).
    universal = _universal_otp()
    if universal and value == universal:
        latest = SmsOtp.objects.filter(mobile=contact, purpose="LOGIN").order_by("-created_at").first()
        if latest is not None and not latest.verified:
            latest.verified = True
            latest.save(update_fields=["verified"])
        return True
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

    def __init__(self, message, status_code=400, extra=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}


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
    "period_in_future",
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
    "_set_current_session",
    "_blacklist_user_tokens",
    "_current_session_id",
    "_session_ok",
    "STALE_SESSION_MESSAGE",
    "_mobile_credential_for",
    "_nominee_doc_blob",
    "_parse_date",
    "_parse_iso_date",
    "_rate_limit",
    "_otp_send_allowed",
    "_record_registration_consent",
    "_record_contractor_membership",
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
