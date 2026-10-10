"""GST identity verification for employers & contractors (API Setu GSTN RC).

Post-signup flow: initiate → OTP to the Primary Authorized Signatory of the
GSTIN → validate → store the Registration Certificate + verified status on the
user's profile. Employers and contractors verify their own entity.
"""
import base64
import re

from django.core.files.base import ContentFile
from django.http import FileResponse
from django.utils import timezone

from .common import *  # noqa: F401,F403

from .. import apisetu_client

_GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$")


def _profile_for(user):
    from bss_core.models import ContractorProfile, EmployerProfile

    if user.role == "contractor":
        return ContractorProfile.objects.filter(user=user).first()
    if user.role == "employer":
        return EmployerProfile.objects.filter(user=user).first()
    return None


def _legal_name_attr(profile):
    from bss_core.models import EmployerProfile

    if isinstance(profile, EmployerProfile):
        return profile.employer_name or profile.trade_name
    return getattr(profile, "contractor_name", "") or getattr(profile, "trade_name", "")


def approved_gstin_owner(gstin, exclude_user_id=None):
    """An **approved** contractor/employer profile already holding this GSTIN.

    A GSTIN can be valid on only one approved account (whether approved by admin
    or by EntityLocker). Unapproved accounts may still share a GSTIN; uniqueness
    is enforced only once an account is approved. Returns the clashing profile or
    None."""
    from bss_core.models import ContractorProfile, EmployerProfile
    value = str(gstin or "").strip().upper()
    if not value:
        return None
    for model in (ContractorProfile, EmployerProfile):
        qs = model.objects.filter(gstin__iexact=value, approval_status="APPROVED")
        if exclude_user_id:
            qs = qs.exclude(user_id=exclude_user_id)
        obj = qs.first()
        if obj is not None:
            return obj
    return None


def gstin_conflict_message(owner):
    from bss_core.models import ContractorProfile
    label = (owner.contractor_name if isinstance(owner, ContractorProfile) else owner.employer_name) \
        or getattr(owner, "employer_code", "") or getattr(owner, "contractor_code", "")
    return ("This GSTIN is already approved on another account"
            + (f" ({label})" if label else "") + ". Resolve the duplicate before approving.")


def _apply_gst_details(profile, result):
    """Fill blank canonical profile fields from GSTN details (never overwrite)."""
    from bss_core.models import EmployerProfile

    is_employer = isinstance(profile, EmployerProfile)
    filled = []

    def put(attr, value, limit):
        value = str(value or "").strip()
        if not value or not hasattr(profile, attr):
            return
        if str(getattr(profile, attr, "") or "").strip():
            return
        setattr(profile, attr, value[:limit])
        filled.append(attr)

    put("employer_name" if is_employer else "contractor_name", result.get("legal_name"), 120)
    put("trade_name", result.get("trade_name"), 120)
    put("state", result.get("state"), 60)
    put("district", result.get("district"), 60)
    put("address", result.get("address"), 255)
    put("entity_class", result.get("constitution"), 80)
    if is_employer:
        put("employer_category", result.get("taxpayer_type"), 80)
        put("industry", result.get("nature_of_business"), 80)
    else:
        put("constitution", result.get("constitution"), 80)
        put("activity", result.get("nature_of_business"), 160)
    gst_value = str(result.get("gstin") or "")
    if len(gst_value) == 15:
        put("pan_no", gst_value[2:12], 20)
    return filled


def _parse_gst_date(value):
    """Parse a GSTN date string (dd/mm/yyyy or yyyy-mm-dd) to a date, else None."""
    from datetime import datetime

    text = str(value or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _member_since(profile):
    """When the account was created on BSS (contractor/employer registered_at)."""
    ts = getattr(profile, "registered_at", None)
    return payloads._dts(ts) if ts else ""


def _serialize(profile):
    return {
        "gstin": profile.gstin or "",
        "status": (profile.gst_verification_status or "PENDING"),
        "verifiedAt": payloads._dts(profile.gst_verified_at) if profile.gst_verified_at else None,
        "legalName": profile.gst_legal_name or "",
        "tradeName": profile.gst_trade_name or "",
        "constitution": profile.gst_constitution or "",
        "registrationDate": profile.gst_registration_date or "",
        "incorporationDate": payloads._dts(profile.incorporation_date) if profile.incorporation_date else "",
        "memberSince": _member_since(profile),
        "hasCertificate": bool(profile.gst_certificate),
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_verification_status(request):
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors can verify GST."},
                        status=status.HTTP_403_FORBIDDEN)
    return Response({"data": _serialize(profile)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_not_applicable(request):
    """The firm is not GST-registered. GST is optional for contractors —
    the contractor supplies the incorporation date and the GST fields stay
    NA at approval."""
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors can do this."},
                        status=status.HTTP_403_FORBIDDEN)
    # Contractors declaring "no GST" supply the incorporation date here —
    # the admin no longer asks anything at approval (all GST fields are NA).
    body = request.data if isinstance(request.data, dict) else {}
    incorporation = _parse_gst_date(body.get("incorporationDate"))
    profile.gst_verification_status = "NOT_APPLICABLE"
    fields = ["gst_verification_status"]
    if incorporation is not None:
        profile.incorporation_date = incorporation
        fields.append("incorporation_date")
    if hasattr(profile, "updated_at"):
        fields.append("updated_at")
    profile.save(update_fields=sorted(set(fields)))
    return Response({"data": _serialize(profile)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_verification_initiate(request):
    """Send an OTP to the GSTIN's primary authorized signatory."""
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors can verify GST."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    gstin = str(body.get("gstin") or profile.gstin or "").strip().upper()
    legal_name = str(body.get("legalName") or _legal_name_attr(profile) or "").strip()
    email = str(body.get("email") or profile.email or "").strip()
    if not _GSTIN_RE.match(gstin):
        return Response({"error": "Enter a valid 15-character GSTIN."}, status=status.HTTP_400_BAD_REQUEST)
    # An already-approved account may not take a GSTIN approved elsewhere.
    if (getattr(profile, "approval_status", "") or "").upper() == "APPROVED":
        owner = approved_gstin_owner(gstin, exclude_user_id=profile.user_id)
        if owner is not None:
            return Response({"error": gstin_conflict_message(owner)}, status=status.HTTP_409_CONFLICT)
    if not legal_name:
        return Response({"error": "Legal name (as per GST records) is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not email:
        return Response({"error": "Primary authorized signatory email is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        result = apisetu_client.gst_initiate(gstin, legal_name, email)
    except apisetu_client.ApiSetuError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)
    profile.gstin = gstin
    profile.gst_legal_name = legal_name
    profile.gst_verification_status = "PENDING"
    fields = ["gstin", "gst_legal_name", "gst_verification_status"]
    if hasattr(profile, "updated_at"):
        fields.append("updated_at")
    profile.save(update_fields=fields)
    return Response({"data": {"gstin": gstin, "txnId": result.get("txn_id"),
                              "message": result.get("message", "")}}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_verification_validate(request):
    """Validate the OTP and store the GST Registration Certificate."""
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors can verify GST."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    gstin = str(body.get("gstin") or profile.gstin or "").strip().upper()
    otp = str(body.get("otp") or "").strip()
    txn_id = str(body.get("txnId") or "").strip()
    if not gstin or not otp or not txn_id:
        return Response({"error": "gstin, otp and txnId are required."}, status=status.HTTP_400_BAD_REQUEST)
    if (getattr(profile, "approval_status", "") or "").upper() == "APPROVED":
        owner = approved_gstin_owner(gstin, exclude_user_id=profile.user_id)
        if owner is not None:
            return Response({"error": gstin_conflict_message(owner)}, status=status.HTTP_409_CONFLICT)
    try:
        result = apisetu_client.gst_validate(gstin, otp, txn_id)
    except apisetu_client.ApiSetuError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)

    profile.gstin = result.get("gstin") or gstin
    profile.gst_legal_name = (result.get("legal_name") or profile.gst_legal_name or "")[:200]
    profile.gst_trade_name = (result.get("trade_name") or "")[:200]
    profile.gst_constitution = (result.get("constitution") or "")[:120]
    profile.gst_verification_status = "VERIFIED"
    profile.gst_verified_at = timezone.now()
    update_fields = ["gstin", "gst_legal_name", "gst_trade_name", "gst_constitution",
                     "gst_verification_status", "gst_verified_at"]
    pdf_base64 = result.get("rc_pdf_base64")
    if pdf_base64:
        try:
            raw = base64.b64decode(pdf_base64.split(",", 1)[-1])
            profile.gst_certificate.save(f"gst_{profile.gstin}.pdf", ContentFile(raw), save=False)
            update_fields.append("gst_certificate")
        except Exception:  # noqa: BLE001 — certificate is best-effort
            pass
    if hasattr(profile, "updated_at"):
        update_fields.append("updated_at")
    profile.save(update_fields=update_fields)
    return Response({"data": _serialize(profile)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_verification_verify(request):
    """Fetch GST tax-payer details by GSTIN (no OTP) and record verification."""
    profile = _profile_for(request.user)
    if profile is None:
        return Response({"error": "Only employers and contractors can verify GST."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    gstin = str(body.get("gstin") or profile.gstin or "").strip().upper()
    if not _GSTIN_RE.match(gstin):
        return Response({"error": "Enter a valid 15-character GSTIN."}, status=status.HTTP_400_BAD_REQUEST)
    if (getattr(profile, "approval_status", "") or "").upper() == "APPROVED":
        owner = approved_gstin_owner(gstin, exclude_user_id=profile.user_id)
        if owner is not None:
            return Response({"error": gstin_conflict_message(owner)}, status=status.HTTP_409_CONFLICT)
    try:
        result = apisetu_client.gstn_taxpayer(gstin)
    except apisetu_client.ApiSetuError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)

    active = str(result.get("status") or "").strip().lower() == "active"
    profile.gstin = result.get("gstin") or gstin
    profile.gst_legal_name = (result.get("legal_name") or "")[:200]
    profile.gst_trade_name = (result.get("trade_name") or "")[:200]
    profile.gst_constitution = (result.get("constitution") or "")[:120]
    profile.gst_verification_status = "VERIFIED" if active else "FAILED"
    profile.gst_verified_at = timezone.now() if active else None
    profile.gst_registration_date = str(result.get("registration_date") or "")[:20]
    fields = ["gstin", "gst_legal_name", "gst_trade_name", "gst_constitution",
              "gst_verification_status", "gst_verified_at", "gst_registration_date"]
    # Date of Incorporation follows the GST registration date (GST is the source).
    incorporation = _parse_gst_date(result.get("registration_date"))
    if incorporation is not None:
        profile.incorporation_date = incorporation
        fields.append("incorporation_date")
    fields += _apply_gst_details(profile, result)
    if hasattr(profile, "updated_at"):
        fields.append("updated_at")
    profile.save(update_fields=sorted(set(fields)))

    data = _serialize(profile)
    data.update({
        "gstnStatus": result.get("status") or "",
        "registrationDate": result.get("registration_date") or "",
        "taxpayerType": result.get("taxpayer_type") or "",
    })
    return Response({"data": data}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gst_certificate(request):
    """Download the stored GST Registration Certificate (owner only)."""
    profile = _profile_for(request.user)
    if profile is None or not profile.gst_certificate:
        return Response({"error": "No GST certificate on file."}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(profile.gst_certificate.open("rb"), as_attachment=True,
                        filename=f"GST-{profile.gstin}.pdf")
