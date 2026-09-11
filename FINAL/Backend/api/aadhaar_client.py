"""Sandbox.co.in Aadhaar oKYC client (backend-only), ported from the
EesassinErp integration. Basic flow: POST /authenticate -> access_token,
POST /kyc/aadhaar/okyc/otp (generate), POST /kyc/aadhaar/okyc/otp/verify.
Kept as plain functions so views stay thin and testable."""

import requests
from django.conf import settings


class SandboxError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


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


def get_access_token() -> str:
    """POST /authenticate with the API key pair -> data.access_token."""
    resp = requests.post(
        f"{settings.AADHAAR_BASE_URL}/authenticate",
        headers={
            "x-api-key": settings.AADHAAR_API_KEY,
            "x-api-secret": settings.AADHAAR_API_SECRET,
        },
        timeout=20,
    )
    if resp.status_code != 200:
        raise SandboxError(f"authenticate failed: {resp.status_code} {resp.text[:300]}")
    data = resp.json()
    token = (data.get("data") or {}).get("access_token")
    if not token:
        raise SandboxError(f"authenticate response missing access_token: {resp.text[:300]}")
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
    resp = requests.post(
        f"{settings.AADHAAR_BASE_URL}/kyc/aadhaar/okyc/otp",
        json={
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
            "aadhaar_number": aadhaar_number,
            "consent": "y",
            "reason": "For KYC",
        },
        headers=_authed_headers(token),
        timeout=20,
    )
    if resp.status_code != 200:
        raise SandboxError(_error_message(resp), resp.status_code)
    return resp.json()


def verify_otp(reference_id: str, otp: str) -> dict:
    """POST /kyc/aadhaar/okyc/otp/verify -> { code, data: { message, name,
    gender, date_of_birth, care_of, full_address, photo, address... } }"""
    token = get_access_token()
    resp = requests.post(
        f"{settings.AADHAAR_BASE_URL}/kyc/aadhaar/okyc/otp/verify",
        json={
            "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
            "reference_id": reference_id,
            "otp": otp,
        },
        headers=_authed_headers(token, include_version=True),
        timeout=30,
    )
    if resp.status_code != 200:
        raise SandboxError(_error_message(resp), resp.status_code)
    return resp.json()