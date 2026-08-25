"""Pluggable channel providers for consent delivery (SMS OTP / IVR / voice).

GUIDE.MD: consent fallbacks (Case I: worker physical card -> IVR;
Case II: app-to-app network delay -> SMS OTP -> voice prompt).

Providers are selected via Django settings:
    BSS_SMS_PROVIDER   = "stub" | "console" | "msg91"   (default "stub")
    BSS_IVR_PROVIDER   = "stub" | "console" | <vendor>  (default "stub")
    BSS_VOICE_PROVIDER = "stub" | "console" | <vendor>  (default "stub")
    BSS_SMS_API_KEY / BSS_SMS_SENDER                     (for real gateways)

- "stub":   no external side effect; the OTP/prompt is returned to the caller
            (dev convenience, matches previous behaviour).
- "console": logs the message to the server log (visible when debugging).
- "msg91":  real SMS gateway via MSG91 REST API (needs BSS_SMS_API_KEY).

Real telephony vendors (Twilio etc.) can be added by implementing the
`_send_msg91`-style functions below and mapping them in the dispatch dicts.
"""
import logging

from django.conf import settings

logger = logging.getLogger("bss.channels")

_SMS_PROVIDERS = {"stub", "console", "msg91"}
_IVR_PROVIDERS = {"stub", "console"}
_VOICE_PROVIDERS = {"stub", "console"}


def _cfg(name, default=""):
    return getattr(settings, name, default)


def _provider(kind):
    key = f"BSS_{kind}_PROVIDER"
    value = (_cfg(key, "stub") or "stub").lower()
    valid = _SMS_PROVIDERS if kind == "SMS" else _IVR_PROVIDERS if kind == "IVR" else _VOICE_PROVIDERS
    return value if value in valid else "stub"


def _log(kind, phone, text):
    logger.info("[%s] -> %s :: %s", kind, phone, text)


def _send_msg91(phone, text):
    """Real MSG91 gateway (transactional SMS). Needs BSS_SMS_API_KEY."""
    import requests

    api_key = _cfg("BSS_SMS_API_KEY")
    sender = _cfg("BSS_SMS_SENDER", "BSSIND")
    if not api_key:
        raise RuntimeError("BSS_SMS_API_KEY is not configured for provider 'msg91'")
    resp = requests.post(
        "https://api.msg91.com/api/sendhttp.php",
        data={
            "authkey": api_key,
            "mobiles": phone,
            "message": text,
            "sender": sender,
            "route": "4",
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.text


def send_sms(phone: str, text: str) -> dict:
    """Deliver a plain SMS via the configured provider."""
    provider = _provider("SMS")
    if provider == "stub":
        _log("SMS-STUB", phone, text)
        return {"provider": "stub", "sent": True, "phone": phone, "message": text}
    if provider == "console":
        _log("SMS", phone, text)
        return {"provider": "console", "sent": True, "phone": phone, "message": text}
    if provider == "msg91":
        receipt = _send_msg91(phone, text)
        return {"provider": "msg91", "sent": True, "phone": phone, "receipt": receipt}
    return {"provider": "stub", "sent": True, "phone": phone, "message": text}


def place_ivr(phone: str, prompt: str) -> dict:
    """Initiate an IVR 'Press 1 / Press 0' call (Case I fallback)."""
    provider = _provider("IVR")
    if provider == "console":
        _log("IVR", phone, prompt)
    else:
        _log("IVR-STUB", phone, prompt)
    return {"provider": provider, "ivr_sent": True, "phone": phone, "prompt": prompt}


def place_voice(phone: str, prompt: str) -> dict:
    """Initiate a voice prompt call as the final fallback (Case II)."""
    provider = _provider("VOICE")
    if provider == "console":
        _log("VOICE", phone, prompt)
    else:
        _log("VOICE-STUB", phone, prompt)
    return {"provider": provider, "voice_sent": True, "phone": phone, "prompt": prompt}