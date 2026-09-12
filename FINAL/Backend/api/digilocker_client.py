"""DigiLocker OAuth2 client (backend-only), ported from the EesassinErp
integration. Provides PKCE, token/user/doc-fetch primitives used by the REST
views. Kept as plain functions so views stay thin and testable."""

import base64
import hashlib
import os
import re
import secrets
import uuid

import requests
from django.conf import settings

PAN_RE = re.compile(r"[A-Z]{5}[0-9]{4}[A-Z]{1}")


class DigiLockerError(Exception):
    pass


# ---------------------------------------------------------------------------
# PKCE
# ---------------------------------------------------------------------------
def base64_url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def generate_code_verifier() -> str:
    return base64_url_encode(secrets.token_bytes(32))


def generate_code_challenge(verifier: str) -> str:
    return base64_url_encode(hashlib.sha256(verifier.encode("ascii")).digest())


# ---------------------------------------------------------------------------
# Authorize
# ---------------------------------------------------------------------------
def build_authorize_url(state: str, code_verifier: str) -> str:
    challenge = generate_code_challenge(code_verifier)
    params = {
        "response_type": "code",
        "client_id": settings.DIGILOCKER_CLIENT_ID,
        "state": state,
        "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "dl_flow": "signin",
        "acr": settings.DIGILOCKER_ACR,
        "amr": settings.DIGILOCKER_AMR,
        "scope": settings.DIGILOCKER_SCOPE,
    }
    qs = "&".join(f"{k}={_url_quote(str(v))}" for k, v in params.items())
    return f"{settings.DIGILOCKER_AUTHORIZE_URL}?{qs}"


def _url_quote(value: str) -> str:
    from urllib.parse import quote
    return quote(value, safe="+-" + " ").replace(" ", "+")


# ---------------------------------------------------------------------------
# Token + user + documents
# ---------------------------------------------------------------------------
def exchange_code(code: str, code_verifier: str) -> dict:
    """POST /oauth2/2/token → { 'access_token': ..., 'token_type': ... }"""
    resp = requests.post(
        settings.DIGILOCKER_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.DIGILOCKER_CLIENT_ID,
            "client_secret": settings.DIGILOCKER_CLIENT_SECRET,
            "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
            "code_verifier": code_verifier,
        },
        timeout=20,
    )
    if resp.status_code != 200:
        raise DigiLockerError(f"token request failed: {resp.status_code} {resp.text[:300]}")
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise DigiLockerError("token response missing access_token")
    return data


def get_user(access_token: str) -> dict:
    resp = requests.get(
        settings.DIGILOCKER_USER_URL,
        headers={"Authorization": f"Bearer {access_token}",
                 "Accept": "application/json"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise DigiLockerError(f"user request failed: {resp.status_code} {resp.text[:300]}")
    return resp.json()


def list_issued_documents(access_token: str) -> list:
    resp = requests.get(
        settings.DIGILOCKER_ISSUED_DOCS_URL,
        headers={"Authorization": f"Bearer {access_token}",
                 "Accept": "application/json"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise DigiLockerError(f"issued documents failed: {resp.status_code} {resp.text[:300]}")
    return resp.json().get("items") or []


def list_uploaded_documents(access_token: str) -> list:
    """Uploaded files (DigiLocker Drive) — separate scope/endpoint from issued
    documents. Failures here must not break the issued-doc fetch."""
    resp = requests.get(
        settings.DIGILOCKER_UPLOADED_DOCS_URL,
        headers={"Authorization": f"Bearer {access_token}",
                 "Accept": "application/json"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise DigiLockerError(f"uploaded documents failed: {resp.status_code} {resp.text[:300]}")
    return resp.json().get("items") or []


def fetch_eaadhaar(access_token: str) -> str:
    """GET /public/oauth2/3/xml/eaadhaar → signed e-Aadhaar XML text. Only
    meaningful when the user profile reports eaadhaar = Y."""
    resp = requests.get(
        settings.DIGILOCKER_EAADHAAR_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    if resp.status_code != 200:
        raise DigiLockerError(f"e-Aadhaar fetch failed: {resp.status_code} {resp.text[:200]}")
    return resp.text


def download_document(access_token: str, uri: str) -> bytes:
    url = settings.DIGILOCKER_FILE_URL + _url_quote(uri)
    resp = requests.get(
        url, headers={"Authorization": f"Bearer {access_token}"}, timeout=30)
    if resp.status_code != 200:
        raise DigiLockerError(f"file download failed: {resp.status_code}")
    return resp.content


def extract_pan(uri_or_name: str) -> str:
    m = PAN_RE.search(uri_or_name or "")
    return m.group(0) if m else ""


def safe_filename(uri: str) -> str:
    return uri.replace("/", "_").replace("\\", "_").replace(":", "_").strip("_") or str(uuid.uuid4())


def ensure_doc_dir() -> str:
    d = settings.DIGILOCKER_DOC_DIR
    os.makedirs(d, exist_ok=True)
    return d
