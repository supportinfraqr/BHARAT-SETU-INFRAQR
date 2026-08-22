"""QR technology layer.

Concepts from the BSS spec:
- The printed QR encodes only an opaque secure reference (not personal data).
- Lookup always goes QR reference -> backend -> entity record.
- Every scan is logged with date/time/user/location.
- Scan counts are maintained automatically.
"""
import base64
import hashlib
import hmac
import os
import secrets
import string

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from .models import (
    Attendance,
    AuditLog,
    Binding,
    Contractor,
    Employer,
    Notification,
    QRCode,
    ScanLog,
    Site,
    Worker,
)

QR_ALPHABET = string.ascii_letters + string.digits + "-_"


def _hmac(data: bytes) -> bytes:
    return hmac.new(settings.QR_ENCRYPTION_KEY.encode(), data, hashlib.sha256).digest()


def generate_qr_reference(entity_type: str, entity_id: int) -> str:
    """Opaque, collision-resistant, not reversible to entity data without the key."""
    raw = f"{settings.QR_REFERENCE_PREFIX}|{entity_type}|{entity_id}|{secrets.token_urlsafe(8)}"
    tag = _hmac(raw.encode())[:8]
    opaque = base64.urlsafe_b64encode((raw + "|" + tag.hex()).encode()).decode()
    return opaque[:64]


def create_qr_for_entity(entity_type: str, entity_id: int) -> QRCode:
    qr, created = QRCode.objects.get_or_create(
        entity_type=entity_type,
        entity_id=entity_id,
        defaults={"qr_reference": generate_qr_reference(entity_type, entity_id), "status": "UNBOUND"},
    )
    if not created and not qr.qr_reference:
        qr.qr_reference = generate_qr_reference(entity_type, entity_id)
        qr.save(update_fields=["qr_reference"])
    return qr


def verify_qr_reference(qr_reference: str) -> QRCode | None:
    """Decode and validate an opaque reference. Returns the QRCode or None."""
    try:
        decoded = base64.urlsafe_b64decode(qr_reference.encode()).decode()
    except Exception:
        return None
    if "|" not in decoded:
        return None
    parts = decoded.split("|")
    if len(parts) != 5:
        return None
    prefix, entity_type, entity_id, nonce, tag = parts
    raw = f"{prefix}|{entity_type}|{entity_id}|{nonce}"
    expected = _hmac(raw.encode())[:8].hex()
    if not hmac.compare_digest(expected, tag):
        return None
    try:
        return QRCode.objects.get(entity_type=entity_type, entity_id=int(entity_id))
    except QRCode.DoesNotExist:
        return None


def resolve_entity(qr: QRCode):
    """Resolve a QRCode to its entity (Employer/Contractor/Worker/Site)."""
    if qr.entity_type == "EMPLOYER":
        return Employer.objects.filter(pk=qr.entity_id).first()
    if qr.entity_type == "CONTRACTOR":
        return Contractor.objects.filter(pk=qr.entity_id).first()
    if qr.entity_type == "WORKER":
        return Worker.objects.filter(pk=qr.entity_id).first()
    if qr.entity_type == "SITE":
        return Site.objects.filter(pk=qr.entity_id).first()
    return None


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    from math import asin, cos, radians, sin, sqrt

    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def geo_within(lat, lng, center_lat, center_lng, radius_km: float = 0.2) -> bool:
    if center_lat is None or center_lng is None:
        return False
    return haversine_km(lat, lng, center_lat, center_lng) <= radius_km


def log_scan(request, qr, worker=None, employer=None, contractor=None, location_status="", scan_result="", lat=None, lng=None):
    user = request.user if hasattr(request, "user") and request.user.is_authenticated else None
    qr_reference = qr.qr_reference if qr else ""
    ScanLog.objects.create(
        qr=qr,
        qr_reference=qr_reference,
        worker=worker,
        scanning_user=user,
        user_role=getattr(user, "role", "") if user else "",
        employer=employer,
        contractor=contractor,
        latitude=lat,
        longitude=lng,
        location_status=location_status,
        scan_result=scan_result,
        ip_address=_client_ip(request),
        device_info=request.headers.get("User-Agent", "")[:250],
    )
    if qr:
        QRCode.objects.filter(pk=qr.pk).update(scan_count=F("scan_count") + 1)


def _client_ip(request):
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit(request, action, entity_type="", entity_id=None, previous="", new=""):
    user = request.user if hasattr(request, "user") and request.user.is_authenticated else None
    AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_value=previous[:4000],
        new_value=new[:4000],
        ip_address=_client_ip(request),
    )


def notify(recipient_role, notification_type, message, recipient_user=None):
    Notification.objects.create(
        recipient_role=recipient_role, notification_type=notification_type,
        message=message, recipient_user=recipient_user,
    )
