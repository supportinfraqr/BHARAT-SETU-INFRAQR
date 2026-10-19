"""Sandbox.co.in DigiLocker flow (session-based).

Sandbox brokers the DigiLocker (meripehchaan) consent and returns the issued
documents to us. Flow:

    POST /kyc/digilocker/sessions/init            -> { authorization_url, session_id }
    GET  /kyc/digilocker/sessions/{id}/status     -> { status }
    GET  /kyc/digilocker/sessions/{id}/user/profile
    GET  /kyc/digilocker/sessions/{id}/documents/{aadhaar|pan|...}

Uses the same Sandbox auth as Aadhaar (api/aadhaar_client.get_access_token),
with x-api-version 1.0.0.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

VERSION = "1.0.0"


class SandboxDigiLockerError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def _base() -> str:
    return settings.AADHAAR_BASE_URL.rstrip("/")


def _headers() -> dict:
    from . import aadhaar_client
    return {
        "x-api-key": settings.AADHAAR_API_KEY,
        "Authorization": aadhaar_client.get_access_token(),
        "x-api-version": VERSION,
        "Content-Type": "application/json",
    }


def _fail(resp, action):
    try:
        j = resp.json()
        msg = j.get("message") or j.get("error") or j.get("detail") or resp.text[:220]
    except Exception:  # noqa: BLE001
        msg = resp.text[:220]
    raise SandboxDigiLockerError(f"DigiLocker {action} failed: {msg}",
                                 resp.status_code if resp.status_code >= 400 else 502)


def init_session(doc_types, redirect_url, flow="signin") -> dict:
    """Start a DigiLocker session; returns {authorization_url, session_id}."""
    body = {
        "@entity": "in.co.sandbox.kyc.digilocker.session.request",
        "flow": flow,
        "doc_types": list(doc_types),
        "redirect_url": redirect_url,
        "options": {"verification_method": ["aadhaar"], "pinless": True, "usernameless": True},
    }
    r = requests.post(f"{_base()}/kyc/digilocker/sessions/init", headers=_headers(),
                      json=body, timeout=30)
    if r.status_code != 200:
        _fail(r, "init")
    return r.json().get("data") or {}


def session_status(session_id: str) -> dict:
    r = requests.get(f"{_base()}/kyc/digilocker/sessions/{session_id}/status",
                     headers=_headers(), timeout=20)
    if r.status_code != 200:
        _fail(r, "status")
    return r.json().get("data") or {}


def user_profile(session_id: str) -> dict:
    r = requests.get(f"{_base()}/kyc/digilocker/sessions/{session_id}/user/profile",
                     headers=_headers(), timeout=20)
    if r.status_code != 200:
        _fail(r, "profile")
    return r.json().get("data") or {}


def fetch_document(session_id: str, doc_type: str) -> dict:
    r = requests.get(f"{_base()}/kyc/digilocker/sessions/{session_id}/documents/{doc_type}",
                     headers=_headers(), timeout=30)
    if r.status_code != 200:
        _fail(r, f"documents/{doc_type}")
    return r.json().get("data") or {}
