"""Edge camera alert evaluation and employer notifications."""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from .edge_schedule import schedule_active
from .models import EdgeAlert, EdgeCamera, Notification

logger = logging.getLogger(__name__)

NO_DATA_AFTER = timedelta(minutes=10)
START_GRACE = timedelta(minutes=5)
ALERT_LINK = "/employer/edge-devices"


def _employer_email(device):
    employer = device.employer
    profile = getattr(employer, "employer_profile", None)
    return (str(getattr(profile, "email", "") or "").strip()
            or str(getattr(employer, "email", "") or "").strip())


def _title_body(alert):
    site = alert.device.site.site_name if alert.device.site_id else ""
    prefix = f"{site} · {alert.camera.label}" if site else alert.camera.label
    if alert.kind == "NO_DATA":
        last = alert.last_seen_at.isoformat() if alert.last_seen_at else "never"
        return (f"Camera not sending data — {prefix}",
                f"Camera {alert.camera.label} has not sent data for more than 15 minutes. "
                f"Last seen: {last}. Mode: {alert.camera.last_mode}.")
    return (f"Camera IP mismatch — {prefix}",
            f"Camera {alert.camera.label} is sending data from {alert.last_observed_ip or 'an unknown IP'} "
            f"but its allowed IP is {alert.allowed_ip or 'not configured'}. "
            f"Rejected attempts: {alert.count}.")


def notify_alert(alert):
    """In-app + email notification, once per open alert."""
    if alert.notified_at:
        return
    employer = alert.device.employer
    title, body = _title_body(alert)
    try:
        Notification.objects.create(
            user=employer, type="WARNING", title=title[:120],
            body=body[:500], link=ALERT_LINK, is_read=False,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Edge alert notification failed for camera %s", alert.camera_id)
    email = _employer_email(alert.device)
    if email:
        base = str(getattr(settings, "BSS_PUBLIC_BASE_URL", "")).rstrip("/")
        url = f"{base}{ALERT_LINK}" if base else ALERT_LINK
        text = f"Bharat Shram Setu — camera alert\n\n{title}\n\n{body}\n\nOpen: {url}\n"
        html = (
            f"<div style=\"font-family:Arial,sans-serif;color:#0f172a\">"
            f"<h2 style=\"color:#01183A\">{title}</h2><p>{body}</p>"
            f"<p><a href=\"{url}\" style=\"background:#01183A;color:#fff;padding:10px 16px;"
            f"border-radius:8px;text-decoration:none\">Open camera settings</a></p></div>"
        )
        try:
            msg = EmailMultiAlternatives(
                subject=f"[BSS Camera] {title}", body=text,
                from_email=settings.DEFAULT_FROM_EMAIL, to=[email],
            )
            msg.attach_alternative(html, "text/html")
            msg.send(fail_silently=True)
        except Exception:  # noqa: BLE001
            logger.exception("Edge alert email failed for camera %s", alert.camera_id)
    alert.notified_at = timezone.now()
    alert.save(update_fields=["notified_at", "updated_at"])


def resolve_camera_alerts(camera, kinds=None):
    qs = EdgeAlert.objects.filter(camera=camera, status="OPEN")
    if kinds:
        qs = qs.filter(kind__in=kinds)
    now = timezone.now()
    for alert in qs:
        alert.status = "RESOLVED"
        alert.resolved_at = now
        alert.save(update_fields=["status", "resolved_at", "updated_at"])


def record_ip_mismatch(camera, observed_ip, when=None):
    when = when or timezone.now()
    if not schedule_active(camera, when):
        return None
    existing = EdgeAlert.objects.filter(camera=camera, status="OPEN").first()
    if existing is not None and existing.kind != "IP_MISMATCH":
        return existing
    alert, created = EdgeAlert.objects.get_or_create(
        camera=camera, status="OPEN",
        defaults={
            "device": camera.device, "kind": "IP_MISMATCH",
            "allowed_ip": camera.allowed_ip, "last_observed_ip": observed_ip,
            "count": 0, "first_seen_at": when, "last_seen_at": when,
        },
    )
    if alert.kind != "IP_MISMATCH":
        return alert
    alert.count = 1 if created else alert.count + 1
    alert.last_observed_ip = observed_ip or None
    alert.allowed_ip = camera.allowed_ip
    alert.last_seen_at = when
    alert.save(update_fields=["count", "last_observed_ip", "allowed_ip", "last_seen_at", "updated_at"])
    if alert.count >= 2:
        notify_alert(alert)
    return alert


def check_no_data_alerts(now=None):
    now = now or timezone.now()
    opened = 0
    for camera in (EdgeCamera.objects.select_related("device", "device__employer", "site")
                   .filter(last_mode="SENDING")):
        if not schedule_active(camera, now):
            resolve_camera_alerts(camera, ["NO_DATA", "IP_MISMATCH"])
            continue
        last = camera.last_seen_at or camera.created_at
        deadline = max(last + NO_DATA_AFTER, camera.created_at + NO_DATA_AFTER + START_GRACE)
        if now < deadline:
            resolve_camera_alerts(camera, ["NO_DATA"])
            continue
        existing = EdgeAlert.objects.filter(camera=camera, status="OPEN").first()
        if existing is not None and existing.kind != "NO_DATA":
            continue
        alert, created = EdgeAlert.objects.get_or_create(
            camera=camera, status="OPEN",
            defaults={
                "device": camera.device, "kind": "NO_DATA",
                "first_seen_at": last, "last_seen_at": last, "count": 1,
            },
        )
        if alert.kind != "NO_DATA":
            continue
        if created:
            opened += 1
        if not alert.notified_at:
            alert.last_seen_at = last
            alert.save(update_fields=["last_seen_at", "updated_at"])
            notify_alert(alert)
    # Live / offline cameras must not keep no-data alerts open.
    for camera in (EdgeCamera.objects.select_related("device")
                   .exclude(last_mode="SENDING")):
        resolve_camera_alerts(camera, ["NO_DATA", "IP_MISMATCH"])
    return opened
