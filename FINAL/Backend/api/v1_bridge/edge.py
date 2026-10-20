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
                  .select_related("employer", "site").first())
        if device is None:
            raise AuthenticationFailed("Invalid or revoked edge token.")
        request._request.edge_device = device
        request._request.edge_ip = _source_ip(request)
        return (device.employer, None)


def _edge_device(request):
    return getattr(request._request, "edge_device", None)


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


def _verify_edge_otp(phone, value):
    value = str(value or "").strip()
    universal = _otp_universal()
    otp = (SmsOtp.objects.filter(mobile=phone, purpose="EDGE_ACTIVATION")
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


def _camera_payload(camera):
    return {
        "id": camera.id,
        "label": camera.label,
        "channel": camera.channel,
        "allowedIp": camera.allowed_ip or "",
        "timezone": camera.timezone,
        "scheduleEnabled": bool(camera.schedule_enabled),
        "windows": camera.capture_windows or [],
        "mode": camera.last_mode,
        "status": camera.last_status,
        "lastSeenAt": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
        "lastSeenIp": camera.last_seen_ip or "",
        "lastEventAt": camera.last_event_at.isoformat() if camera.last_event_at else None,
    }


def _device_payload(device):
    cameras = list(device.cameras.order_by("id"))
    return {
        "deviceId": str(device.id),
        "name": device.name,
        "siteId": device.site_id,
        "siteCode": getattr(device.site, "site_code", ""),
        "siteName": device.site.site_name if device.site else "",
        "version": device.version,
        "active": device.is_active,
        "lastSeenAt": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "lastSeenIp": device.last_seen_ip or "",
        "cameraLimit": int(getattr(device.site, "max_cctv_cameras", 5) or 5),
        "cameras": [_camera_payload(c) for c in cameras],
    }


def _camera_limit(site):
    try:
        return max(1, min(int(getattr(site, "max_cctv_cameras", 5) or 5), 50))
    except (TypeError, ValueError):
        return 5


def _create_camera(device, label, channel=None):
    existing = EdgeCamera.objects.filter(device=device, label=label).first()
    if existing is not None:
        return existing
    if EdgeCamera.objects.filter(device=device).count() >= _camera_limit(device.site):
        return None
    return EdgeCamera.objects.create(
        device=device, label=label,
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
def edge_activate_verify(request):
    body = request.data if isinstance(request.data, dict) else {}
    phone = _normalize_mobile(body.get("phone") or body.get("mobile"))
    otp = str(body.get("otp") or "").strip()
    fingerprint = str(body.get("deviceFingerprint") or body.get("fingerprint") or "").strip()[:128]
    site_ref = str(body.get("siteCode") or body.get("siteId") or body.get("site") or "").strip()
    if not phone or not otp or not fingerprint or not site_ref:
        return Response({"error": "Phone, OTP, device fingerprint and site are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    owner = _owner_for_phone(phone)
    if owner is None:
        return Response({"error": "No active employer-owner account is registered with this mobile."},
                        status=status.HTTP_404_NOT_FOUND)
    if not _verify_edge_otp(phone, otp):
        return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_401_UNAUTHORIZED)
    site_q = Q(site_code__iexact=site_ref) | Q(site_name__iexact=site_ref)
    if site_ref.isdigit():
        site_q |= Q(pk=int(site_ref))
    site = Site.objects.filter(site_q, employer=owner).first()
    if site is None:
        return Response({"error": "That site does not belong to this employer."},
                        status=status.HTTP_404_NOT_FOUND)
    if (EdgeDevice.objects.filter(device_fingerprint=fingerprint)
            .exclude(site=site).exists()):
        return Response({"error": "This device is already activated for another site."},
                        status=status.HTTP_409_CONFLICT)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    with transaction.atomic():
        device, _ = EdgeDevice.objects.update_or_create(
            site=site, device_fingerprint=fingerprint,
            defaults={
                "employer": owner,
                "name": str(body.get("deviceName") or body.get("name") or "")[:120],
                "activation_phone": phone,
                "token_hash": token_hash,
                "version": str(body.get("version") or "")[:40],
                "is_active": True,
                "last_seen_at": timezone.now(),
                "last_seen_ip": _source_ip(request),
            },
        )
        cameras = body.get("cameras")
        if isinstance(cameras, list):
            for entry in cameras:
                if isinstance(entry, str):
                    label, channel = entry.strip(), None
                elif isinstance(entry, dict):
                    label = str(entry.get("label") or entry.get("name") or "").strip()
                    channel = entry.get("channel")
                else:
                    continue
                if not label:
                    continue
                camera = _create_camera(device, label[:120], channel)
                if camera is not None and camera.channel is None and str(channel or "").isdigit():
                    camera.channel = int(channel)
                    camera.save(update_fields=["channel", "updated_at"])
    return Response({"data": {
        "deviceId": str(device.id),
        "token": raw_token,
        "site": {"id": site.id, "code": getattr(site, "site_code", ""), "name": site.site_name},
        "cameras": [_camera_payload(c) for c in device.cameras.order_by("id")],
    }}, status=status.HTTP_200_OK)


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
def edge_heartbeat(request):
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    body = request.data if isinstance(request.data, dict) else {}
    ip = _source_ip(request)
    now = timezone.now()
    device.last_seen_at = now
    device.last_seen_ip = ip or None
    device.version = str(body.get("version") or device.version or "")[:40]
    device.save(update_fields=["last_seen_at", "last_seen_ip", "version", "updated_at"])
    cameras = body.get("cameras")
    if isinstance(cameras, list):
        for entry in cameras:
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("label") or entry.get("name") or "").strip()
            if not label:
                continue
            camera = _create_camera(device, label[:120], entry.get("channel"))
            if camera is None:
                continue
            mode = str(entry.get("mode") or "").upper()
            if mode in dict(EdgeCamera.MODE):
                camera.last_mode = mode
            camera.last_status = str(entry.get("status") or entry.get("health") or "")[:40]
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
    return Response({"data": {"ok": True, "serverTime": now.isoformat()}}, status=status.HTTP_200_OK)


def _event_error(event_id, code, message):
    return {"eventId": event_id, "status": "REJECTED", "code": code, "error": message}


@api_view(["POST"])
@authentication_classes([EdgeTokenAuthentication])
@permission_classes([IsAuthenticated])
def edge_events(request):
    device = _edge_device(request)
    if device is None:
        return Response({"error": "Invalid edge device."}, status=status.HTTP_401_UNAUTHORIZED)
    body = request.data if isinstance(request.data, dict) else {}
    events = body.get("events")
    if not isinstance(events, list) or not events:
        return Response({"error": "At least one event is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(events) > 100:
        return Response({"error": "Send at most 100 events per batch."}, status=status.HTTP_400_BAD_REQUEST)
    ip = _source_ip(request)
    results = []
    for raw in events:
        if not isinstance(raw, dict):
            continue
        event_id = str(raw.get("eventId") or raw.get("event_id") or "").strip()[:80]
        if not event_id:
            results.append(_event_error("", "invalid_event", "eventId is required."))
            continue
        camera_label = str(raw.get("cameraLabel") or raw.get("camera") or "").strip()
        camera = EdgeCamera.objects.filter(device=device, label__iexact=camera_label).first()
        if camera is None:
            results.append(_event_error(event_id, "unknown_camera", "Camera is not registered on this device."))
            continue
        occurred_at = _parse_dt(raw.get("occurredAt") or raw.get("occurred_at"))
        if occurred_at is None:
            results.append(_event_error(event_id, "invalid_time", "occurredAt is invalid."))
            continue
        if not camera.allowed_ip:
            results.append(_event_error(event_id, "ip_not_configured", "Set the allowed IP for this camera in BSS."))
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
            worker_id, distance, reason = _match_worker(vector, device.site, model_version)
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
                worker=worker, site=device.site, binding_status="ACCEPTED").exists():
            if method == "QR":
                distance = 0.0
            if distance is not None:
                confidence = round(max(0.0, min(1.0, 1.0 - float(distance))) * 100, 2)
                attendance = _mark_edge_attendance(worker, device.site, camera, occurred_at,
                                                   distance, event_id)
                status_value = "ACCEPTED"
        blob = None
        if method == "FACE":
            blob = vector.astype(np.float32).tobytes()
        try:
            EdgeEvent.objects.create(
                device=device, camera=camera, event_id=event_id, worker=worker,
                site=device.site, occurred_at=occurred_at, capture_method=method,
                status=status_value, confidence=confidence, match_distance=distance,
                model_name=EDGE_FACE_MODEL_NAME if method == "FACE" else "QR",
                model_version=model_version, embedding=blob,
                details={"reason": reason, "ip": ip}, attendance=attendance,
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


def _require_owner(request):
    if request.user.role != "employer" or _staff_permissions(request) is not None:
        raise PermissionDenied("Only the employer can manage edge devices.")


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
               .select_related("site").prefetch_related("cameras").order_by("-created_at"))
    return Response({"data": [_device_payload(d) for d in devices]}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_edge_camera_detail(request, device_id, camera_id):
    _require_owner(request)
    camera = (EdgeCamera.objects.filter(pk=camera_id, device_id=device_id,
                                        device__employer=request.user)
              .select_related("device", "device__site").first())
    if camera is None:
        return Response({"error": "Camera not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    if body.get("allowedIp") is not None or body.get("allowed_ip") is not None:
        raw = str(body.get("allowedIp") or body.get("allowed_ip") or "").strip()
        if not raw:
            camera.allowed_ip = None
        else:
            try:
                parsed_ip = ipaddress.ip_address(raw)
            except ValueError:
                return Response({"error": "Enter a valid IP address."}, status=status.HTTP_400_BAD_REQUEST)
            if parsed_ip.version != 4:
                return Response({"error": "Only IPv4 addresses are supported."}, status=status.HTTP_400_BAD_REQUEST)
            if not parsed_ip.is_global:
                return Response({"error": "Use the camera network's public static IPv4 address, not a LAN address."},
                                status=status.HTTP_400_BAD_REQUEST)
            camera.allowed_ip = str(parsed_ip)
    if body.get("timezone") is not None:
        zone = str(body.get("timezone") or "").strip()[:64] or "Asia/Kolkata"
        try:
            ZoneInfo(zone)
        except ZoneInfoNotFoundError:
            return Response({"error": "Invalid timezone."}, status=status.HTTP_400_BAD_REQUEST)
        camera.timezone = zone
    if body.get("scheduleEnabled") is not None or body.get("schedule_enabled") is not None:
        camera.schedule_enabled = bool(body.get("scheduleEnabled", body.get("schedule_enabled")))
    if body.get("windows") is not None or body.get("capture_windows") is not None:
        windows, error = _validate_windows(body.get("windows", body.get("capture_windows")))
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
        camera.capture_windows = windows
    camera.save()
    return Response({"data": _camera_payload(camera)}, status=status.HTTP_200_OK)


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
    device.cameras.update(last_mode="OFFLINE")
    return Response({"data": {"deviceId": str(device.id), "active": False}}, status=status.HTTP_200_OK)


__all__ = [
    "EdgeTokenAuthentication",
    "edge_activate_request_otp",
    "edge_activate_verify",
    "edge_config",
    "edge_heartbeat",
    "edge_events",
    "employer_edge_devices",
    "employer_edge_camera_detail",
    "employer_edge_device_revoke",
]
