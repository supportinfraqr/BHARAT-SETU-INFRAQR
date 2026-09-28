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


def _serialize(profile):
    return {
        "gstin": profile.gstin or "",
        "status": (profile.gst_verification_status or "PENDING"),
        "verifiedAt": payloads._dts(profile.gst_verified_at) if profile.gst_verified_at else None,
        "legalName": profile.gst_legal_name or "",
        "tradeName": profile.gst_trade_name or "",
        "constitution": profile.gst_constitution or "",
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
