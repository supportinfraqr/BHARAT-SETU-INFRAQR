"""Gupshup WhatsApp delivery client.

Ported from EesassinErp RetailSectionApiController.SendWhatsAppMessage /
SendTextMessage. Sends OTP messages to mobiles over WhatsApp using the
Gupshup BSP gateway.

Configuration (environment):
    GUPSHUP_API_KEY            BSP API key (required; missing => delivery skipped)
    GUPSHUP_SOURCE             Source WhatsApp number, e.g. 919650887008
    GUPSHUP_SRC_NAME           Display name, e.g. "Bharat Shram Setu"
    GUPSHUP_OTP_TEMPLATE_ID    Approved template id; when set, OTPs are sent via
                               the template API, otherwise as free text (/msg).
    GUPSHUP_ENABLED            "true"/"false" master switch (default true)
"""

import json
import os
import threading

import requests

GUPSHUP_MSG_URL = "https://api.gupshup.io/wa/api/v1/msg"
GUPSHUP_TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg"


def _config():
    return {
        "api_key": os.environ.get("GUPSHUP_API_KEY", "").strip(),
        "source": os.environ.get("GUPSHUP_SOURCE", "919650887008").strip(),
        "src_name": os.environ.get("GUPSHUP_SRC_NAME", "Bharat Shram Setu").strip(),
        "template_id": os.environ.get("GUPSHUP_OTP_TEMPLATE_ID", "").strip(),
        "enabled": os.environ.get("GUPSHUP_ENABLED", "true").strip().lower() in ("1", "true", "yes"),
    }


def normalize_mobile(mobile):
    digits = "".join(ch for ch in str(mobile) if ch.isdigit())
    if len(digits) == 10:
        return "91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return digits


def _form(mobile, template=None, message=None):
    cfg = _config()
    data = {
        "channel": "whatsapp",
        "source": cfg["source"],
        "destination": normalize_mobile(mobile),
        "src.name": cfg["src_name"],
    }
    if template is not None:
        data["template"] = json.dumps(template)
    if message is not None:
        data["message"] = message
    return cfg, data


def _dispatch(url, cfg, data):
    headers = {"apikey": cfg["api_key"]}
    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        body = response.text.strip()
        ok = response.status_code in (200, 201, 202)
        if ok:
            return {"ok": True, "status_code": response.status_code, "body": body}
        return {"ok": False, "status_code": response.status_code, "error": f"Gupshup {response.status_code}: {body[:300]}"}
    except requests.RequestException as exc:
        return {"ok": False, "error": f"Gupshup request failed: {exc}"}


def send_text(mobile, message):
    cfg = _config()
    if not cfg["enabled"]:
        return {"ok": False, "error": "WhatsApp delivery disabled"}
    if not cfg["api_key"]:
        return {"ok": False, "error": "GUPSHUP_API_KEY not configured"}
    _, data = _form(mobile, message=message)
    return _dispatch(GUPSHUP_MSG_URL, cfg, data)


def send_template(mobile, template_id, params):
    cfg = _config()
    if not cfg["enabled"]:
        return {"ok": False, "error": "WhatsApp delivery disabled"}
    if not cfg["api_key"]:
        return {"ok": False, "error": "GUPSHUP_API_KEY not configured"}
    _, data = _form(mobile, template={"id": template_id, "params": list(params)})
    return _dispatch(GUPSHUP_TEMPLATE_URL, cfg, data)


def send_otp(mobile, otp, ttl_minutes=5):
    """Send an OTP over WhatsApp. Uses the configured template when available,
    otherwise falls back to a free-text message (/msg)."""
    cfg = _config()
    if cfg["template_id"]:
        return send_template(mobile, cfg["template_id"], [str(otp), str(ttl_minutes)])
    message = (
        f"Your Bharat Shram Setu OTP is {otp} and is valid for "
        f"{ttl_minutes} minutes. Please do not share this code with anyone."
    )
    return send_text(mobile, message)


def _channel():
    """Explicitly selected OTP delivery channel: 'whatsapp' or 'sms' (default sms)."""
    return os.environ.get("BSS_OTP_CHANNEL", "sms").strip().lower()


def deliver_async(otp_pk, mobile, otp_value, ttl_minutes=5):
    """Send an OTP over the explicitly selected channel only ('whatsapp'
    or 'sms') in the background and record the gateway result on the
    SmsOtp row (delivery_channel/status/error/delivered_at)."""

    def deliver():
        from django.utils import timezone

        from bss_core.models import SmsOtp

        try:
            channel = _channel()
            if channel == "whatsapp":
                result = send_otp(mobile, otp_value, ttl_minutes)
            else:
                from . import sms_client

                result = sms_client.send_sms(mobile, otp_value)

            sent = result["ok"]
            SmsOtp.objects.filter(pk=otp_pk).update(
                delivery_channel=channel if sent else "none",
                delivery_status="sent" if sent else "failed",
                delivery_error=(result.get("error") or result.get("body") or "")[:1000],
                delivered_at=timezone.now() if sent else None,
            )
        except Exception as exc:  # pragma: no cover - defensive
            SmsOtp.objects.filter(pk=otp_pk).update(
                delivery_channel="none",
                delivery_status="failed",
                delivery_error=str(exc)[:1000],
            )

    threading.Thread(target=deliver, daemon=True).start()