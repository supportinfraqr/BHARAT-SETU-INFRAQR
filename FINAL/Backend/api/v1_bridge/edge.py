"""Client-side attendance edge API.

The camera/face pipeline runs on the client. BSS receives only heartbeats,
face embeddings and QR events. No video, images or media are accepted here.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

import hashlib
import ipaddress
import json
import os
import re
import secrets
import uuid
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import numpy as np
from django.core import signing
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from bss_core.edge_alerts import record_ip_mismatch, resolve_camera_alerts
from bss_core.models import (
    Attendance,
    AttendanceEvent,
    ContractorEmployerBinding,
    EdgeCamera,
    EdgeDevice,
    EdgeEvent,
    EmployerStaffMember,
    Site,
    SmsOtp,
    User,
    UserCredential,
    WorkerContractorBinding,
    WorkerFaceEmbedding,
    WorkerIdentity,
)

EDGE_FACE_MODEL_NAME = "ArcFace"
EDGE_FACE_MODEL_VERSION = "deepface-0.0.101-tf-2.21.0"
EDGE_FACE_DETECTOR = "retinaface"
EDGE_FACE_WEIGHTS_SHA = "6336979c0c602cae08d1122a66f4dfb862d059bbcd8ef80306aef2b2249b0c93"
EDGE_FACE_THRESHOLD = 0.6
EDGE_FACE_MARGIN = 0.08
EDGE_FACE_TOPK = 3
EDGE_FACE_VOTES = 2
EDGE_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
EDGE_DEVICE_ONLINE_WINDOW = timedelta(seconds=90)


class EdgeTokenAuthentication(BaseAuthentication):
    """Authenticate a client installation using its X-Edge-Token credential."""

    def authenticate_header(self, request):
        return "EdgeToken"

    def authenticate(self, request):
        raw = str(request.META.get("HTTP_X_EDGE_TOKEN") or "").strip()
        if not raw:
            return None
        digest = hashlib.sha256(raw.encode()).hexdigest()
        device = (EdgeDevice.objects.filter(token_hash=digest, is_active=True)
                  .select_related("employer").first())
        if device is None:
            raise AuthenticationFailed("Invalid or revoked edge token.")
        request._request.edge_device = device
        request._request.edge_ip = _source_ip(request)
        return (device.employer, None)


class EdgeCameraAuthentication(BaseAuthentication):
    """Authenticate one camera worker using its independent X-Camera-Token."""

    def authenticate_header(self, request):
        return "CameraToken"

    def authenticate(self, request):
        raw = str(request.META.get("HTTP_X_CAMERA_TOKEN") or "").strip()
        if not raw:
            return None
        digest = hashlib.sha256(raw.encode()).hexdigest()
        camera = (EdgeCamera.objects.filter(token_hash=digest, is_claimed=True,
                                            device__is_active=True)
                  .select_related("device", "device__employer", "site").first())
        if camera is None or camera.device is None:
            raise AuthenticationFailed("Invalid or revoked camera token.")
        request._request.edge_camera = camera
        request._request.edge_device = camera.device
        request._request.edge_ip = _source_ip(request)
        return (camera.device.employer, None)


def _edge_device(request):
    return getattr(request._request, "edge_device", None)


def _edge_camera(request):
    return getattr(request._request, "edge_camera", None)


def _new_camera_token():
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode()).hexdigest(), raw[:10]


def _source_ip(request):
    meta = request.META
    for header in ("HTTP_X_REAL_IP", "HTTP_X_FORWARDED_FOR"):
        raw = str(meta.get(header) or "").strip()
        if not raw:
            continue
        candidate = raw.split(",")[0].strip()
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            continue
    try:
        return str(ipaddress.ip_address(str(meta.get("REMOTE_ADDR") or "")))
    except ValueError:
        return ""


def _otp_universal():
    if "BSS_UNIVERSAL_OTP" in os.environ:
        return os.environ["BSS_UNIVERSAL_OTP"].strip()
    return "123456"


def _owner_for_phone(phone):
    cred = (UserCredential.objects.filter(identity_type__in=("mobile", "phone"),
                                          identity_value=phone)
            .select_related("user").first())
    if cred is None or cred.user.role != "employer" or not cred.user.is_active:
        return None
    if EmployerStaffMember.objects.filter(user=cred.user).exists():
        return None
    return cred.user


def _verify_edge_otp(phone, value, purpose="EDGE_ACTIVATION"):
    value = str(value or "").strip()
    universal = _otp_universal()
    otp = (SmsOtp.objects.filter(mobile=phone, purpose=purpose)
           .order_by("-created_at").first())
    if universal and value == universal:
        if otp is not None and not otp.verified:
            otp.verified = True
            otp.save(update_fields=["verified"])
        return True
    if otp is None or otp.is_expired or otp.attempts >= otp.max_attempts:
        return False
    if not check_password(value, otp.otp_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False
    otp.verified = True
    otp.save(update_fields=["verified"])
    return True


def _camera_online(camera):
    return bool(camera.approval_status == "APPROVED"
                and camera.device_id
                and camera.device.is_active
                and camera.last_seen_at
                and timezone.now() - camera.last_seen_at <= EDGE_DEVICE_ONLINE_WINDOW)


def _camera_payload(camera, device=None):
    claimed_by_this = bool(device and camera.device_id == device.id)
    claimed_by_other = bool(camera.device_id and not claimed_by_this)
    status = ("CLAIMED_BY_DEVICE" if claimed_by_this
              else "CLAIMED_BY_OTHER" if claimed_by_other
              else "UNCLAIMED")
    return {
        "id": camera.id,
        "uid": str(camera.uid),
        "siteId": camera.site_id,
        "label": camera.label,
        "employerLabel": camera.employer_label or "",
        "channel": camera.channel,
        "allowedIp": camera.allowed_ip or "",
        "timezone": "Asia/Kolkata",
        "timezoneLabel": "IST (UTC+05:30)",
        "scheduleEnabled": bool(camera.schedule_enabled),
        "windows": camera.capture_windows or [],
        "mode": camera.last_mode,
        "status": camera.last_status,
        "approvalStatus": camera.approval_status,
        "online": _camera_online(camera),
        "lastSeenAt": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
        "lastSeenIp": camera.last_seen_ip or "",
        "lastEventAt": camera.last_event_at.isoformat() if camera.last_event_at else None,
        "createdByDeviceId": str(camera.created_by_device_id or ""),
        "isClaimed": bool(camera.is_claimed),
        "claimStatus": status,
        "claimedByThisDevice": claimed_by_this,
        "claimedByOtherDevice": claimed_by_other,
        "claimedAt": camera.claimed_at.isoformat() if camera.claimed_at else None,
        "hasToken": bool(camera.token_hash),
    }


def _device_payload(device):
    sites = []
    camera_count = 0
    for site in (Site.objects.filter(employer_id=device.employer_id)
                 .prefetch_related("attendance_cameras").order_by("site_name")):
        cameras = list(site.attendance_cameras.exclude(
            approval_status__in=("REMOVED", "REJECTED")).order_by("id"))
        camera_count += len(cameras)
        sites.append({
            "id": site.id,
            "bssId": site.bss_site_id,
            "name": site.site_name,
            "cameraLimit": int(getattr(site, "max_cctv_cameras", 5) or 5),
            "cameras": [_camera_payload(c, device) for c in cameras],
        })
    return {
        "deviceId": str(device.id),
        "name": device.name,
        "employerName": _employer_name(device.employer) if device.employer_id else "",
        "version": device.version,
        "active": device.is_active,
        "online": _device_online(device),
        "lastSeenAt": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "lastSeenIp": device.last_seen_ip or "",
        "cameraCount": camera_count,
        "sites": sites,
    }


def _camera_limit(site):
    try:
        return max(1, min(int(getattr(site, "max_cctv_cameras", 5) or 5), 50))
    except (TypeError, ValueError):
        return 5


def _create_camera(site, label, channel=None, device=None):
    existing = EdgeCamera.objects.filter(site=site, label__iexact=label).first()
    if existing is not None:
        if existing.device_id is None and device is not None:
            existing.device = device
            existing.save(update_fields=["device", "updated_at"])
        return existing
    if EdgeCamera.objects.filter(site=site).exclude(
            approval_status__in=("REMOVED", "REJECTED")).count() >= _camera_limit(site):
        return None
    return EdgeCamera.objects.create(
        site=site, device=device, label=label,
        channel=int(channel) if str(channel or "").isdigit() else None,
    )


def _parse_dt(value):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.utc)
    return parsed


def _time_value(value):
    match = re.fullmatch(r"(\d{1,2}):(\d{2})", str(value or "").strip())
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 23 or minute > 59:
        return None
    return time(hour, minute)


def _day_index(value):
    text = str(value or "").strip().lower()[:3]
    return EDGE_DAY_NAMES.index(text) if text in EDGE_DAY_NAMES else None


def _schedule_active(camera, when):
    if not camera.schedule_enabled or not camera.capture_windows:
        return True
    try:
        tz = ZoneInfo(camera.timezone or "Asia/Kolkata")
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("Asia/Kolkata")
    local = when.astimezone(tz)
    current = local.time()
    weekday = local.weekday()
    for window in camera.capture_windows or []:
        if not isinstance(window, dict):
            continue
        days = {_day_index(d) for d in (window.get("days") or [])}
        days.discard(None)
        if days and weekday not in days:
            continue
        start = _time_value(window.get("start"))
        end = _time_value(window.get("end"))
        if start is None or end is None:
            continue
        if start <= end:
            if start <= current <= end:
                return True
        else:
            if current >= start or current <= end:
                return True
    return False


def _match_worker(embedding, site, model_version):
    if model_version != EDGE_FACE_MODEL_VERSION:
        return None, None, "model_mismatch"
    worker_ids = list(WorkerContractorBinding.objects
                      .filter(site=site, binding_status="ACCEPTED")
                      .values_list("worker_id", flat=True))
    if not worker_ids:
        return None, None, "no_workers"
    rows = (WorkerFaceEmbedding.objects
            .filter(worker_id__in=worker_ids)
            .values_list("worker_id", "embedding"))
    by_worker = {}
    for worker_id, blob in rows:
        try:
            vector = np.frombuffer(bytes(blob), dtype=np.float32)
        except Exception:
            continue
        if vector.size != embedding.size:
            continue
        denom = float(np.linalg.norm(vector) * np.linalg.norm(embedding))
        if denom <= 0:
            continue
        distance = 1.0 - float(np.dot(vector, embedding) / denom)
        by_worker.setdefault(worker_id, []).append(distance)
    if not by_worker:
        return None, None, "no_gallery"
    ranked = []
    best_but_short = None
    for worker_id, distances in by_worker.items():
        distances.sort()
        votes = sum(1 for distance in distances[:EDGE_FACE_TOPK]
                    if distance <= EDGE_FACE_THRESHOLD)
        if votes >= EDGE_FACE_VOTES:
            ranked.append((worker_id, distances[0]))
        elif distances[0] <= EDGE_FACE_THRESHOLD and best_but_short is None:
            best_but_short = distances[0]
    if not ranked:
        if best_but_short is not None:
            return None, best_but_short, "insufficient_votes"
        return None, None, "below_threshold"
    ranked.sort(key=lambda item: item[1])
    best_id, best_distance = ranked[0]
    runner = ranked[1][1] if len(ranked) > 1 else None
    if best_distance > EDGE_FACE_THRESHOLD:
        return None, best_distance, "below_threshold"
    if runner is not None and runner - best_distance < EDGE_FACE_MARGIN:
        return None, best_distance, "ambiguous"
    return best_id, best_distance, ""


def _mark_edge_attendance(worker, site, camera, occurred_at, distance, event_id):
    confidence = round(max(0.0, min(1.0, 1.0 - float(distance))) * 100, 2)
    local_date = occurred_at.astimezone(ZoneInfo(camera.timezone or "Asia/Kolkata")).date()
    binding = (WorkerContractorBinding.objects
               .filter(worker=worker, site=site, binding_status="ACCEPTED")
               .order_by("-id").first())
    is_verified = confidence >= 50.0
    remarks = "CCTV edge attendance"
    if confidence < 50.0:
        remarks = f"CCTV edge attendance — manual review (confidence {confidence:g}%)"
    attendance, _created = Attendance.objects.update_or_create(
        worker=worker, attendance_date=local_date,
        defaults={
            "site": site,
            "contractor": binding.contractor if binding else None,
            "status": "PRESENT",
            "capture_method": "CAMERA",
            "verification_type": "face_image",
            "is_verified": is_verified,
            "confidence_pct": confidence,
            "camera_label": camera.label,
            "camera_area": camera.label,
            "remarks": remarks,
        },
    )
    AttendanceEvent.objects.create(
        attendance=attendance, worker=worker, site=site,
        attendance_date=local_date, source="CAMERA", method="face_image",
        event_type="SIGHTING", at=occurred_at, camera_label=camera.label,
        confidence=confidence, external_id=str(event_id)[:60],
        remarks=remarks,
    )
    return attendance


def _device_online(device):
    return bool(device.is_active and device.last_seen_at
                and timezone.now() - device.last_seen_at <= EDGE_DEVICE_ONLINE_WINDOW)


def _employer_name(user):
    profile = getattr(user, "employer_profile", None)
    return str(getattr(profile, "employer_name", "") or getattr(user, "username", "") or "")


def _employer_sites(owner):
    return [
        {"id": site.id, "bssId": site.bss_site_id, "name": site.site_name}
        for site in Site.objects.filter(employer=owner).order_by("site_name")
    ]


def _create_edge_device(owner, phone, fingerprint, name, version, ip):
    existing = EdgeDevice.objects.filter(device_fingerprint=fingerprint).first()
    if existing is not None and existing.employer_id != owner.id:
        raise ValueError("This device is already activated for another employer.")
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    with transaction.atomic():
        device, _ = EdgeDevice.objects.update_or_create(
            employer=owner, device_fingerprint=fingerprint,
            defaults={
                "employer": owner,
                "name": name[:120],
                "activation_phone": phone,
                "token_hash": token_hash,
                "version": version[:40],
                "is_active": True,
                "last_seen_at": timezone.now(),
                "last_seen_ip": ip or None,
            },
        )
    return device, raw_token


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def edge_activate_request_otp(request):
    body = request.data if isinstance(request.data, dict) else {}
    phone = _normalize_mobile(body.get("phone") or body.get("mobile"))
    if not phone:
        return Response({"error": "Enter a valid 10-digit employer mobile number."},
                        status=status.HTTP_400_BAD_REQUEST)
    owner = _owner_for_phone(phone)
    if owner is None:
        return Response({"error": "No active employer-owner account is registered with this mobile."},
                        status=status.HTTP_404_NOT_FOUND)
    if not _otp_send_allowed("edge_activation", phone):
        return Response({"error": "Too many OTP requests. Please try again later."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    _issue_otp(phone, purpose="EDGE_ACTIVATION", ttl_minutes=10)
    return Response({"otpSent": True, "expiresIn": 600}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def edge_activate_verify_otp(request):
    """Verify the owner OTP and return a short-lived token plus the site list."""
    body = request.data if isinstance(request.data, dict) else {}
    phone = _normalize_mobile(body.get("phone") or body.get("mobile"))
    otp = str(body.get("otp") or "").strip()
    if not phone or not otp:
        return Response({"error": "Phone and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
    owner = _owner_for_phone(phone)
    if owner is None:
        return Response({"error": "No active employer-owner account is registered with this mobile."},
                        status=status.HTTP_404_NOT_FOUND)
    if not _verify_edge_otp(phone, otp):
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_401_UNAUTHORIZED)
    sites = _employer_sites(owner)
    activation_token = signing.dumps({"phone": phone, "owner": owner.id},
                                     salt="bss-edge-activation", compress=True)
    return Response({"data": {"activationToken": activation_token, "sites": sites}},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def edge_activate_complete(request):
    """Complete activation with the OTP token, device fingerprint and device name."""
    body = request.data if isinstance(request.data, dict) else {}
    activation_token = str(body.get("activationToken") or "").strip()
    fingerprint = str(body.get("deviceFingerprint") or body.get("fingerprint") or "").strip()[:128]
    if not activation_token or not fingerprint:
        return Response({"error": "activationToken and device fingerprint are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        payload = signing.loads(activation_token, salt="bss-edge-activation", max_age=900)
    except signing.BadSignature:
        return Response({"error": "Activation expired. Request a new OTP."},
                        status=status.HTTP_401_UNAUTHORIZED)
    phone = _normalize_mobile(payload.get("phone"))
    owner = _owner_for_phone(phone)
    if owner is None or owner.id != payload.get("owner"):
        return Response({"error": "Employer account is no longer active."},
                        status=status.HTTP_401_UNAUTHORIZED)
    try:
        device, raw_token = _create_edge_device(
            owner, phone, fingerprint,
            str(body.get("deviceName") or body.get("name") or "")[:120],
            str(body.get("version") or "")[:40], _source_ip(request),
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
    return Response({"data": {
        "deviceId": str(device.id),
        "token": raw_token,
        "deviceName": device.name,
        "employerName": _employer_name(owner),
    }}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def edge_activate_verify(request):
    """Legacy site-bound activation is retired; 1.2.0+ uses /activate/complete."""
    return Response(
        {"error": "This activation flow is retired. Please install the latest BSS Attendance client."},
        status=status.HTTP_410_GONE,
    )


def _config_for(device):
    return {
        "device": _device_payload(device),
        "face": {
            "model": EDGE_FACE_MODEL_NAME,
            "version": EDGE_FACE_MODEL_VERSION,
            "detector": EDGE_FACE_DETECTOR,
            "threshold": EDGE_FACE_THRESHOLD,
            "margin": EDGE_FACE_MARGIN,
            "weightsSha": EDGE_FACE_WEIGHTS_SHA,
        },
    }


@api_view(["GET"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_config(request):
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"data": _config_for(device)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_device_heartbeat(request):
    """Device-level heartbeat, independent of any claimed camera."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    body = request.data if isinstance(request.data, dict) else {}
    now = timezone.now()
    ip = _source_ip(request)
    device.last_seen_at = now
    device.last_seen_ip = ip or None
    device.version = str(body.get("version") or device.version or "")[:40]
    device.save(update_fields=["last_seen_at", "last_seen_ip", "version", "updated_at"])
    return Response({"data": {"ok": True, "deviceId": str(device.id), "serverTime": now.isoformat()}},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([EdgeCameraAuthentication])
@permission_classes([IsAuthenticated])
def edge_heartbeat(request):
    camera = _edge_camera(request)
    if camera is None or camera.device is None:
        return Response({"error": "Invalid camera."}, status=status.HTTP_401_UNAUTHORIZED)
    device = camera.device
    body = request.data if isinstance(request.data, dict) else {}
    ip = _source_ip(request)
    now = timezone.now()
    device.last_seen_at = now
    device.last_seen_ip = ip or None
    device.version = str(body.get("version") or device.version or "")[:40]
    device.save(update_fields=["last_seen_at", "last_seen_ip", "version", "updated_at"])
    mode = str(body.get("mode") or "").upper()
    if mode in dict(EdgeCamera.MODE):
        camera.last_mode = mode
    camera.last_status = str(body.get("status") or body.get("health") or "")[:40]
    camera.last_seen_at = now
    camera.last_seen_ip = ip or None
    camera.save(update_fields=["last_mode", "last_status", "last_seen_at", "last_seen_ip", "updated_at"])
    if camera.last_mode == "SENDING" and _schedule_active(camera, now):
        if camera.allowed_ip and ip and ip != str(camera.allowed_ip):
            record_ip_mismatch(camera, ip, now)
        elif camera.allowed_ip:
            resolve_camera_alerts(camera, ["IP_MISMATCH", "NO_DATA"])
    else:
        resolve_camera_alerts(camera, ["IP_MISMATCH", "NO_DATA"])
    return Response({"data": {"ok": True, "cameraId": camera.id, "serverTime": now.isoformat()}},
                    status=status.HTTP_200_OK)


def _event_error(event_id, code, message):
    return {"eventId": event_id, "status": "REJECTED", "code": code, "error": message}


@api_view(["POST"])
@authentication_classes([EdgeCameraAuthentication])
@permission_classes([IsAuthenticated])
def edge_events(request):
    camera = _edge_camera(request)
    if camera is None or camera.device is None:
        return Response({"error": "Invalid camera."}, status=status.HTTP_401_UNAUTHORIZED)
    device = camera.device
    body = request.data if isinstance(request.data, dict) else {}
    events = body.get("events")
    if not isinstance(events, list) or not events:
        return Response({"error": "At least one event is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(events) > 100:
        return Response({"error": "Send at most 100 events per batch."}, status=status.HTTP_400_BAD_REQUEST)
    ip = _source_ip(request)
    if not camera.allowed_ip:
        return Response({"error": "Set the allowed IP for this camera in BSS."},
                        status=status.HTTP_400_BAD_REQUEST)
    results = []
    for raw in events:
        if not isinstance(raw, dict):
            continue
        event_id = str(raw.get("eventId") or raw.get("event_id") or "").strip()[:80]
        if not event_id:
            results.append(_event_error("", "invalid_event", "eventId is required."))
            continue
        supplied_camera = raw.get("cameraId") or raw.get("camera_id")
        if supplied_camera not in (None, "") and str(supplied_camera) != str(camera.id):
            results.append(_event_error(event_id, "camera_mismatch", "Event camera does not match the camera token."))
            continue
        occurred_at = _parse_dt(raw.get("occurredAt") or raw.get("occurred_at"))
        if occurred_at is None:
            results.append(_event_error(event_id, "invalid_time", "occurredAt is invalid."))
            continue
        if not _schedule_active(camera, occurred_at):
            results.append(_event_error(event_id, "outside_schedule", "This camera is outside its capture window."))
            continue
        if not ip or ip != str(camera.allowed_ip):
            record_ip_mismatch(camera, ip, occurred_at)
            results.append({**_event_error(event_id, "ip_not_allowed", "Data is arriving from a different IP."),
                            "observedIp": ip, "allowedIp": str(camera.allowed_ip)})
            continue
        resolve_camera_alerts(camera, ["IP_MISMATCH", "NO_DATA"])
        if EdgeEvent.objects.filter(device=device, event_id=event_id).exists():
            results.append({"eventId": event_id, "status": "DUPLICATE", "code": "duplicate"})
            continue
        method = str(raw.get("type") or raw.get("captureMethod") or "FACE").upper()
        model_version = str(raw.get("modelVersion") or raw.get("embeddingModelVersion") or "").strip()
        embedding = raw.get("embedding")
        worker = None
        distance = None
        reason = ""
        if method == "FACE":
            if not isinstance(embedding, list) or not embedding:
                results.append(_event_error(event_id, "invalid_embedding", "Face embedding is required."))
                continue
            try:
                vector = np.asarray(embedding, dtype=np.float32)
            except Exception:
                results.append(_event_error(event_id, "invalid_embedding", "Face embedding is invalid."))
                continue
            if vector.size != 512:
                results.append(_event_error(event_id, "invalid_embedding", "Face embedding must be 512 values."))
                continue
            norm = float(np.linalg.norm(vector))
            if norm <= 0:
                results.append(_event_error(event_id, "invalid_embedding", "Face embedding is invalid."))
                continue
            vector = vector / norm
            worker_id, distance, reason = _match_worker(vector, camera.site, model_version)
            if worker_id is not None:
                worker = User.objects.filter(pk=worker_id, role="worker").first()
        elif method == "QR":
            token = str(raw.get("bssWorkerId") or raw.get("payload") or "").strip().upper()
            identity = WorkerIdentity.objects.filter(bss_worker_id=token).select_related("user").first()
            if identity is not None:
                worker = identity.user
        else:
            results.append(_event_error(event_id, "unsupported_method", "Only FACE and QR events are supported."))
            continue
        attendance = None
        status_value = "UNKNOWN"
        confidence = None
        if worker is not None and WorkerContractorBinding.objects.filter(
                worker=worker, site=camera.site, binding_status="ACCEPTED").exists():
            if method == "QR":
                distance = 0.0
            if distance is not None:
                confidence = round(max(0.0, min(1.0, 1.0 - float(distance))) * 100, 2)
                attendance = _mark_edge_attendance(worker, camera.site, camera, occurred_at,
                                                   distance, event_id)
                status_value = "ACCEPTED"
        blob = None
        if method == "FACE":
            blob = vector.astype(np.float32).tobytes()
        try:
            EdgeEvent.objects.create(
                device=device, camera=camera, event_id=event_id, worker=worker,
                site=camera.site, occurred_at=occurred_at, capture_method=method,
                status=status_value, confidence=confidence, match_distance=distance,
                model_name=EDGE_FACE_MODEL_NAME if method == "FACE" else "QR",
                model_version=model_version, embedding=blob,
                details={"reason": reason, "ip": ip, "cameraToken": camera.token_prefix},
                attendance=attendance,
            )
        except Exception:
            results.append({"eventId": event_id, "status": "DUPLICATE", "code": "duplicate"})
            continue
        camera.last_event_at = occurred_at
        camera.last_seen_at = timezone.now()
        camera.last_seen_ip = ip or None
        camera.save(update_fields=["last_event_at", "last_seen_at", "last_seen_ip", "updated_at"])
        results.append({"eventId": event_id, "status": status_value,
                        "matched": worker is not None, "confidence": confidence,
                        "reason": reason})
    return Response({"data": {"results": results}}, status=status.HTTP_200_OK)



@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_camera_create(request):
    """Client creates a pending camera for its activated site."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    body = request.data if isinstance(request.data, dict) else {}
    label = str(body.get("label") or body.get("name") or "").strip()[:120]
    if not label:
        return Response({"error": "Camera label is required."}, status=status.HTTP_400_BAD_REQUEST)
    site_ref = str(body.get("siteBssId") or body.get("siteId") or "").strip()
    if not site_ref:
        return Response({"error": "Select a site for this camera."}, status=status.HTTP_400_BAD_REQUEST)
    site = (Site.objects.filter(pk=site_ref, employer_id=device.employer_id).first()
            if site_ref.isdigit() else None)
    if site is None:
        site = Site.objects.filter(bss_site_id__iexact=site_ref, employer_id=device.employer_id).first()
    if site is None:
        return Response({"error": "That site does not belong to this employer."},
                        status=status.HTTP_404_NOT_FOUND)
    if (EdgeCamera.objects.filter(site=site, label__iexact=label)
            .exclude(approval_status__in=("REMOVED", "REJECTED")).exists()):
        return Response({"error": "A camera with this label already exists."}, status=status.HTTP_409_CONFLICT)
    limit = _camera_limit(site)
    if EdgeCamera.objects.filter(site=site).exclude(
            approval_status__in=("REMOVED", "REJECTED")).count() >= limit:
        return Response({"error": f"Camera limit reached for this site ({limit})."},
                        status=status.HTTP_400_BAD_REQUEST)
    channel = body.get("channel")
    camera = EdgeCamera.objects.create(
        site=site, device=None, created_by_device=device, label=label,
        approval_status="PENDING", timezone="Asia/Kolkata",
        channel=int(channel) if str(channel or "").isdigit() else None,
    )
    return Response({"data": _camera_payload(camera, device)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_camera_setup(request, camera_id):
    """Update the BSS-side channel for a camera owned by this device."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    camera = EdgeCamera.objects.filter(pk=camera_id, site__employer_id=device.employer_id).first()
    if camera is None or camera.approval_status in ("REMOVED", "REJECTED"):
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    if camera.device_id and camera.device_id != device.id:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    if camera.created_by_device_id and camera.created_by_device_id != device.id:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    if "channel" in body:
        raw = str(body.get("channel") or "").strip()
        camera.channel = int(raw) if raw.isdigit() else None
    camera.save(update_fields=["channel", "updated_at"])
    return Response({"data": _camera_payload(camera, device)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_camera_claim(request, camera_id):
    """Claim a camera token. A camera already owned by another device needs OTP."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    camera = (EdgeCamera.objects.filter(pk=camera_id, site__employer_id=device.employer_id)
              .select_related("device", "site").first())
    if camera is None:
        return Response({"error": "Camera not found for this employer."}, status=status.HTTP_404_NOT_FOUND)
    if camera.approval_status != "APPROVED":
        return Response({"error": "This camera is still waiting for employer approval."},
                        status=status.HTTP_409_CONFLICT)
    if camera.created_by_device_id and camera.created_by_device_id != device.id:
        return Response({"error": "Camera not found for this device."}, status=status.HTTP_404_NOT_FOUND)
    if not camera.allowed_ip:
        return Response({"error": "The employer must set the allowed IP before this camera can be claimed."},
                        status=status.HTTP_400_BAD_REQUEST)
    body = request.data if isinstance(request.data, dict) else {}
    old_device_id = camera.device_id
    if old_device_id and old_device_id != device.id:
        otp = str(body.get("otp") or "").strip()
        if not otp:
            return Response({"error": "This camera is claimed by another device. Verify OTP to take it over.",
                             "takeoverRequired": True}, status=status.HTTP_409_CONFLICT)
        phone = device.activation_phone or ""
        if not phone or not _verify_edge_otp(phone, otp, purpose="EDGE_TAKEOVER"):
            return Response({"error": "Invalid or expired takeover OTP."},
                            status=status.HTTP_401_UNAUTHORIZED)
    raw_token, token_hash, token_prefix = _new_camera_token()
    now = timezone.now()
    with transaction.atomic():
        camera.device = device
        camera.is_claimed = True
        camera.claimed_at = now
        camera.token_hash = token_hash
        camera.token_prefix = token_prefix
        camera.last_mode = "OFFLINE"
        camera.last_status = "Claimed"
        camera.save(update_fields=["device", "is_claimed", "claimed_at", "token_hash",
                                   "token_prefix", "last_mode", "last_status", "updated_at"])
    return Response({"data": {
        "cameraId": camera.id,
        "cameraToken": raw_token,
        "camera": _camera_payload(camera, device),
        "takeover": bool(old_device_id and old_device_id != device.id),
    }}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_camera_takeover_otp(request, camera_id):
    """Send the employer-owner OTP required to take over a claimed camera."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    camera = EdgeCamera.objects.filter(pk=camera_id, site__employer_id=device.employer_id).first()
    if camera is None:
        return Response({"error": "Camera not found for this employer."}, status=status.HTTP_404_NOT_FOUND)
    if not camera.device_id or camera.device_id == device.id:
        return Response({"error": "This camera is not claimed by another device."},
                        status=status.HTTP_400_BAD_REQUEST)
    phone = device.activation_phone or ""
    if not phone:
        return Response({"error": "No employer-owner phone is linked to this device."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _otp_send_allowed("edge_takeover", phone):
        return Response({"error": "Too many OTP requests. Please try again later."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    _issue_otp(phone, purpose="EDGE_TAKEOVER", ttl_minutes=10)
    return Response({"otpSent": True, "expiresIn": 600}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_camera_rotate(request, camera_id):
    """Rotate the token for a camera owned by this device."""
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    camera = EdgeCamera.objects.filter(pk=camera_id, site__employer_id=device.employer_id, device=device).first()
    if camera is None or not camera.is_claimed:
        return Response({"error": "Camera is not claimed by this device."}, status=status.HTTP_404_NOT_FOUND)
    raw_token, token_hash, token_prefix = _new_camera_token()
    camera.token_hash = token_hash
    camera.token_prefix = token_prefix
    camera.claimed_at = timezone.now()
    camera.save(update_fields=["token_hash", "token_prefix", "claimed_at", "updated_at"])
    return Response({"data": {"cameraId": camera.id, "cameraToken": raw_token}},
                    status=status.HTTP_200_OK)


def _require_owner(request):
    if request.user.role != "employer" or _staff_permissions(request) is not None:
        raise PermissionDenied("Only the employer can manage edge devices.")


def _public_ipv4(raw):
    raw = str(raw or "").strip()
    if not raw:
        return None, ""
    try:
        parsed = ipaddress.ip_address(raw)
    except ValueError:
        return None, "Enter a valid IP address."
    if parsed.version != 4:
        return None, "Only IPv4 addresses are supported."
    if not parsed.is_global:
        return None, "Use the camera network's public static IPv4 address, not a LAN address."
    return str(parsed), ""


def _validate_windows(value):
    if value is None:
        return [], ""
    if not isinstance(value, list):
        return None, "Windows must be a list."
    out = []
    for window in value:
        if not isinstance(window, dict):
            return None, "Each window must be an object."
        days = window.get("days") or []
        if not isinstance(days, list):
            return None, "Window days must be a list."
        start = _time_value(window.get("start"))
        end = _time_value(window.get("end"))
        if start is None or end is None:
            return None, "Each window needs a valid start and end time."
        out.append({"days": [str(d) for d in days],
                    "start": start.strftime("%H:%M"), "end": end.strftime("%H:%M")})
    return out, ""


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_edge_devices(request):
    _require_owner(request)
    devices = (EdgeDevice.objects.filter(employer=request.user)
               .prefetch_related("cameras").order_by("-created_at"))
    return Response({"data": [_device_payload(d) for d in devices]}, status=status.HTTP_200_OK)


def _employer_camera_payload(camera):
    payload = _camera_payload(camera, None)
    device = camera.device
    creator = camera.created_by_device
    payload["claimStatus"] = "CLAIMED" if camera.is_claimed else "UNCLAIMED"
    payload["claimedByThisDevice"] = False
    payload["claimedByOtherDevice"] = False
    payload["claimedByDeviceId"] = str(device.id) if device else ""
    payload["claimedByDeviceName"] = device.name if device else ""
    payload["createdByDeviceName"] = creator.name if creator else ""
    payload["createdByDeviceVersion"] = creator.version if creator else ""
    return payload


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_attendance_cameras(request):
    """Employer site-wise attendance cameras, including sites with no device."""
    _require_owner(request)
    sites = (Site.objects.filter(employer=request.user)
             .prefetch_related("attendance_cameras").order_by("site_name"))
    rows = []
    for site in sites:
        cameras = list(site.attendance_cameras.exclude(
            approval_status__in=("REMOVED", "REJECTED"))
            .select_related("device", "created_by_device").order_by("id"))
        device_map = {}
        for camera in cameras:
            if camera.device_id and camera.device and camera.device_id not in device_map:
                device_map[camera.device_id] = camera.device
        devices = sorted(device_map.values(), key=lambda d: d.created_at, reverse=True)
        rows.append({
            "siteId": site.id,
            "siteName": site.site_name,
            "bssId": site.bss_site_id,
            "cameraLimit": int(getattr(site, "max_cctv_cameras", 5) or 5),
            "cameraCount": len(cameras),
            "cameras": [_employer_camera_payload(c) for c in cameras],
            "devices": [{
                "deviceId": str(d.id), "name": d.name, "active": d.is_active,
                "online": _device_online(d),
                "lastSeenAt": d.last_seen_at.isoformat() if d.last_seen_at else None,
                "lastSeenIp": d.last_seen_ip or "",
                "version": d.version,
            } for d in devices],
        })
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_attendance_camera_approve(request, camera_id):
    """Employer accepts a client-created camera and optionally white-labels it."""
    _require_owner(request)
    camera = (EdgeCamera.objects.filter(pk=camera_id, site__employer=request.user)
              .select_related("site", "device", "created_by_device").first())
    if camera is None or camera.approval_status == "REMOVED":
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    label = str(body.get("employerLabel") or body.get("employer_label") or "").strip()[:120]
    with transaction.atomic():
        if label:
            camera.employer_label = label
        elif not camera.employer_label:
            camera.employer_label = camera.label
        if camera.device_id is None and camera.created_by_device_id:
            camera.device = camera.created_by_device
        camera.approval_status = "APPROVED"
        camera.approved_at = timezone.now()
        camera.approved_by = request.user
        camera.timezone = "Asia/Kolkata"
        camera.save(update_fields=["employer_label", "device", "approval_status", "approved_at",
                                   "approved_by", "timezone", "updated_at"])
    return Response({"data": _employer_camera_payload(camera)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_attendance_camera_remove(request, camera_id):
    """Soft-remove a camera; historical attendance is retained."""
    _require_owner(request)
    camera = (EdgeCamera.objects.filter(pk=camera_id, site__employer=request.user)
              .select_related("site", "device").first())
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    with transaction.atomic():
        camera.approval_status = "REMOVED"
        camera.removed_at = timezone.now()
        camera.removed_by = request.user
        camera.device = None
        camera.is_claimed = False
        camera.token_hash = ""
        camera.token_prefix = ""
        camera.claimed_at = None
        camera.last_mode = "OFFLINE"
        camera.last_status = "Removed"
        camera.save(update_fields=["approval_status", "removed_at", "removed_by", "device",
                                   "is_claimed", "token_hash", "token_prefix", "claimed_at",
                                   "last_mode", "last_status", "updated_at"])
    return Response({"data": {"cameraId": camera.id, "removed": True}}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_attendance_camera_detail(request, camera_id):
    _require_owner(request)
    camera = (EdgeCamera.objects.filter(pk=camera_id, site__employer=request.user)
              .select_related("site", "device").first())
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("allowedIp") is not None or body.get("allowed_ip") is not None:
        raw = str(body.get("allowedIp") or body.get("allowed_ip") or "").strip()
        if not raw:
            camera.allowed_ip = None
        else:
            parsed, error = _public_ipv4(raw)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
            camera.allowed_ip = parsed
    if body.get("employerLabel") is not None or body.get("employer_label") is not None:
        camera.employer_label = str(body.get("employerLabel", body.get("employer_label")) or "").strip()[:120]
    camera.timezone = "Asia/Kolkata"
    if body.get("scheduleEnabled") is not None or body.get("schedule_enabled") is not None:
        camera.schedule_enabled = bool(body.get("scheduleEnabled", body.get("schedule_enabled")))
    if body.get("windows") is not None or body.get("capture_windows") is not None:
        windows, error = _validate_windows(body.get("windows", body.get("capture_windows")))
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
        camera.capture_windows = windows
    camera.save()
    return Response({"data": _employer_camera_payload(camera)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_edge_device_revoke(request, device_id):
    _require_owner(request)
    device = EdgeDevice.objects.filter(pk=device_id, employer=request.user).first()
    if device is None:
        return Response({"error": "Device not found."}, status=status.HTTP_404_NOT_FOUND)
    device.is_active = False
    device.token_hash = ""
    device.save(update_fields=["is_active", "token_hash", "updated_at"])
    device.cameras.update(token_hash="", token_prefix="", is_claimed=False,
                          claimed_at=None, device=None, last_mode="OFFLINE",
                          last_status="Device revoked")
    return Response({"data": {"deviceId": str(device.id), "active": False}}, status=status.HTTP_200_OK)


__all__ = [
    "EdgeTokenAuthentication",
    "EdgeCameraAuthentication",
    "edge_activate_request_otp",
    "edge_activate_verify_otp",
    "edge_activate_complete",
    "edge_activate_verify",
    "edge_config",
    "edge_camera_create",
    "edge_camera_claim",
    "edge_camera_setup",
    "edge_camera_takeover_otp",
    "edge_camera_rotate",
    "edge_device_heartbeat",
    "edge_heartbeat",
    "edge_events",
    "employer_edge_devices",
    "employer_attendance_cameras",
    "employer_attendance_camera_approve",
    "employer_attendance_camera_remove",
    "employer_attendance_camera_detail",
    "employer_edge_device_revoke",
]
