"""2Factor.in SMS client (legacy-compatible) for OTP fallback delivery.

Ported from EesassinErp DAL/SendMessage.SendGeneralSMS which builds
a URL from USP_SendMessage and posts the OTP to 2Factor's REST API.

Configuration (environment):
    SMS_2FACTOR_API_KEY       2Factor API key (required)
    SMS_2FACTOR_ENABLED      "true"/"false" master switch (default true)
    SMS_2FACTOR_TEMPLATE     Delivery template / DL name (default "Login OTP")
"""

import json
import os

import requests

SMS_URL = (
    "https://2factor.in/API/V1/{api_key}/SMS/{mobile}/{message}/{template}"
)

# Transactional (non-OTP) SMS endpoint — used for the onboarding introductory
# message. Overridable in case 2Factor issues a template-specific URL.
SMS_TX_URL = os.environ.get(
    "SMS_2FACTOR_TX_URL",
    "https://2factor.in/API/V1/{api_key}/ADDON_SERVICES/SEND/TSMS",
)


def _config():
    return {
        "api_key": os.environ.get("SMS_2FACTOR_API_KEY", "").strip(),
        "enabled": os.environ.get("SMS_2FACTOR_ENABLED", "true").strip().lower()
        in ("1", "true", "yes"),
        "template": os.environ.get("SMS_2FACTOR_TEMPLATE", "Login OTP").strip(),
    }


def _normalize(mobile: str) -> str:
    digits = "".join(ch for ch in str(mobile) if ch.isdigit())
    if len(digits) == 10:
        return "91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    return digits


def send_sms(mobile: str, message: str, template: str = "") -> dict:
    """Send a plain SMS via 2Factor.in. Returns {"ok": bool, ...}."""
    cfg = _config()
    if not cfg["enabled"]:
        return {"ok": False, "error": "SMS delivery disabled"}
    if not cfg["api_key"]:
        return {"ok": False, "error": "SMS_2FACTOR_API_KEY not configured"}

    tpl = (template or cfg["template"]).replace(" ", "%20")
    url = SMS_URL.format(
        api_key=cfg["api_key"],
        mobile=_normalize(mobile),
        message=message,          # OTP digits are already URL-safe
        template=tpl,
    )

    try:
        resp = requests.post(url, timeout=10)
        body = resp.text.strip()
        try:
            payload = json.loads(body)
            status = str(payload.get("Status", "")).lower()
        except ValueError:
            payload, status = None, ""
        ok = (
            resp.status_code in (200, 201, 202)
            and (status == "success" or "MSGID" in body.upper())
            and "error" not in status
        )
        return {
            "ok": ok,
            "status_code": resp.status_code,
            "body": body,
            **({"error": body} if not ok else {}),
        }
    except requests.RequestException as exc:
        return {"ok": False, "error": f"2Factor request failed: {exc}"}


def _intro_config():
    return {
        "template": os.environ.get("SMS_INTRO_TEMPLATE", "").strip(),
        "dlt_template_id": os.environ.get("SMS_INTRO_DLT_TEMPLATE_ID", "").strip(),
        "sender": os.environ.get("SMS_2FACTOR_SENDER", "").strip(),
    }


def send_intro(mobile: str, name: str = "", template: str = "") -> dict:
    """Send the introductory SMS (transactional, one variable = name).

    Uses 2Factor's transactional endpoint with the DLT-approved template
    (``SMS_INTRO_TEMPLATE`` / ``SMS_INTRO_DLT_TEMPLATE_ID``), the SAME sender id
    as OTP (``SMS_2FACTOR_SENDER``) and ``VAR1`` = name. Returns {"ok": bool,...}.
    """
    cfg = _config()
    intro = _intro_config()
    if not cfg["enabled"]:
        return {"ok": False, "error": "SMS delivery disabled"}
    if not cfg["api_key"]:
        return {"ok": False, "error": "SMS_2FACTOR_API_KEY not configured"}
    tpl = (template or intro["template"]).strip()
    if not tpl:
        return {"ok": False, "error": "SMS_INTRO_TEMPLATE not configured (intro template pending approval)"}

    url = SMS_TX_URL.format(api_key=cfg["api_key"])
    payload = {
        "From": intro["sender"],
        "To": _normalize(mobile),
        "TemplateName": tpl,
        "VAR1": str(name or "").strip()[:60],
    }
    if intro["dlt_template_id"]:
        payload["TemplateId"] = intro["dlt_template_id"]
    try:
        resp = requests.post(url, data=payload, timeout=10)
        body = resp.text.strip()
        try:
            parsed = json.loads(body)
            status = str(parsed.get("Status", "")).lower()
        except ValueError:
            parsed, status = None, ""
        ok = (resp.status_code in (200, 201, 202)
              and (status == "success" or "MSGID" in body.upper())
              and "error" not in status)
        return {
            "ok": ok,
            "status_code": resp.status_code,
            "body": body,
            **({"error": body} if not ok else {}),
        }
    except requests.RequestException as exc:
        return {"ok": False, "error": f"2Factor intro request failed: {exc}"}
