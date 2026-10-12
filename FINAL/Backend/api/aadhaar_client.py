"""Sandbox.co.in Aadhaar oKYC client (backend-only), ported from the
EesassinErp integration. Basic flow: POST /authenticate -> access_token,
POST /kyc/aadhaar/okyc/otp (generate), POST /kyc/aadhaar/okyc/otp/verify.
Kept as plain functions so views stay thin and testable."""

import time

import requests
from django.conf import settings

import logging

logger = logging.getLogger(__name__)


class SandboxError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


# Sandbox returns 503 ("Source system unavailable") / 5xx for transient upstream
# (UIDAI) outages. These are retryable, so we retry a few times before failing.
# 429 is deliberately NOT retried — retrying a rate-limit only extends it.
_RETRY_STATUS = {500, 502, 503, 504}


def _post_with_retry(url, *, json=None, headers=None, timeout=20, attempts=3):
    resp = None
    for attempt in range(attempts):
        try:
            resp = requests.post(url, json=json, headers=headers, timeout=timeout)
        except requests.RequestException as exc:
            if attempt == attempts - 1:
                raise SandboxError(f"request failed: {exc}") from exc
            time.sleep(1.2 * (attempt + 1))
            continue
        if resp.status_code in _RETRY_STATUS and attempt < attempts - 1:
            time.sleep(1.2 * (attempt + 1))
            continue
        return resp
    return resp


def _error_message(resp) -> str:
    """Best-effort human message from a Sandbox error response."""
    try:
        data = resp.json()
    except Exception:
        return (resp.text or "").strip()[:200] or f"HTTP {resp.status_code}"
    if isinstance(data, dict):
        msg = data.get("message")
        if not msg and isinstance(data.get("data"), dict):
            msg = data["data"].get("message")
        if msg:
            return str(msg)
    return (resp.text or "").strip()[:200] or f"HTTP {resp.status_code}"


# Cache the Sandbox access token so we don't re-authenticate on every call
# (auth + OTP used to add ~3-4s each request and push past the proxy timeout).
_TOKEN_CACHE = {"token": "", "expires_at": 0.0}
_TOKEN_TTL_SECONDS = 30 * 60


def get_access_token() -> str:
    """POST /authenticate with the API key pair -> data.access_token."""
    now = time.time()
    if _TOKEN_CACHE["token"] and now < _TOKEN_CACHE["expires_at"]:
        return _TOKEN_CACHE["token"]
    resp = _post_with_retry(
        f"{settings.AADHAAR_BASE_URL}/authenticate",
        headers={
            "x-api-key": settings.AADHAAR_API_KEY,
            "x-api-secret": settings.AADHAAR_API_SECRET,
        },
        timeout=12,
        attempts=2,
    )
    if resp.status_code != 200:
        raise SandboxError(f"authenticate failed: {resp.status_code} {resp.text[:300]}")
    data = resp.json()
    token = (data.get("data") or {}).get("access_token")
    if not token:
        raise SandboxError(f"authenticate response missing access_token: {resp.text[:300]}")
    _TOKEN_CACHE["token"] = token
    _TOKEN_CACHE["expires_at"] = now + _TOKEN_TTL_SECONDS
    return token


def _authed_headers(token: str, include_version: bool = False) -> dict:
    headers = {
        "x-api-key": settings.AADHAAR_API_KEY,
        "Authorization": token,
    }
    if include_version:
        headers["x-api-version"] = settings.AADHAAR_API_VERSION
    return headers


def generate_otp(aadhaar_number: str) -> dict:
    """POST /kyc/aadhaar/okyc/otp -> { code, data: { reference_id, ... } }"""
    token = get_access_token()
    resp = _post_with_retry(
        f"{settings.AADHAAR_BASE_URL}/kyc/aadhaar/okyc/otp",
        json={
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
            "aadhaar_number": aadhaar_number,
            "consent": "y",
            "reason": "For KYC",
        },
        headers=_authed_headers(token),
        timeout=12,
        attempts=2,
    )
    if resp.status_code != 200:
        logger.warning("sandbox aadhaar generate FAILED %s: %s",
                       resp.status_code, _error_message(resp))
        raise SandboxError(_error_message(resp), resp.status_code)
    body = resp.json()
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    logger.info("sandbox aadhaar generate ok: code=%s ref=%s",
                body.get("code"), str(data.get("reference_id") or "")[:8])
    return body


def verify_otp(reference_id: str, otp: str) -> dict:
    """POST /kyc/aadhaar/okyc/otp/verify -> { code, data: { message, name,
    gender, date_of_birth, care_of, full_address, photo, address... } }"""
    token = get_access_token()
    resp = _post_with_retry(
        f"{settings.AADHAAR_BASE_URL}/kyc/aadhaar/okyc/otp/verify",
        json={
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
            "reference_id": reference_id,
            "otp": otp,
        },
        headers=_authed_headers(token, include_version=True),
        timeout=15,
        attempts=2,
    )
    if resp.status_code != 200:
        logger.warning("sandbox aadhaar verify FAILED %s (ref=%s): %s",
                       resp.status_code, str(reference_id)[:8], _error_message(resp))
        raise SandboxError(_error_message(resp), resp.status_code)
    body = resp.json()
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    logger.info("sandbox aadhaar verify: code=%s ref=%s message=%s",
                body.get("code"), str(reference_id)[:8], str(data.get("message"))[:80])
    return body


def verify_bank_account(ifsc: str, account_number: str) -> dict:
    """GET /bank/{ifsc}/accounts/{account_number}/verify (Penny Drop).

    Returns the Sandbox response: { code, transaction_id,
    data: { message, account_exists, name_at_bank, utr, amount_deposited } }.
    """
    token = get_access_token()
    resp = requests.get(
        f"{settings.AADHAAR_BASE_URL}/bank/{ifsc}/accounts/{account_number}/verify",
        headers=_authed_headers(token, include_version=True),
        timeout=45,
    )
    if resp.status_code != 200:
        raise SandboxError(_error_message(resp), resp.status_code)
    return resp.json()


def verify_ifsc(ifsc: str) -> dict:
    """GET /bank/{ifsc} (IFSC verification) — bank branch details.

    Returns Sandbox branch data such as BANK, BANKCODE, BRANCH, ADDRESS, CITY,
    STATE, DISTRICT, CENTRE, MICR, CONTACT, SWIFT, ISO3166 and the rail flags
    (UPI, NEFT, IMPS, RTGS). The payload may be wrapped in ``data`` — callers
    should handle both shapes.
    """
    token = get_access_token()
    resp = requests.get(
        f"{settings.AADHAAR_BASE_URL}/bank/{ifsc}",
        headers=_authed_headers(token, include_version=True),
        timeout=20,
    )
    if resp.status_code != 200:
        raise SandboxError(_error_message(resp), resp.status_code)
    return resp.json()