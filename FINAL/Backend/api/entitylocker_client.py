"""DigiLocker EntityLocker OAuth2 client (backend-only).

Business/entity verification via the Meri Pehchaan **Entity Locker**
(`entity.digilocker.gov.in`). Mirrors ``api/digilocker_client.py``: PKCE (S256)
authorization-code flow, token exchange and the entity/user detail APIs.
Credentials come from settings (env ``BSS_ENTITYLOCKER_*``); never hard-coded.

Reference: *Requester – Entity Locker API Specification* v1.0 (Oct 2024).
"""

import base64
import hashlib
import secrets

import requests
from django.conf import settings

# EntityLocker `acr` values for the entity's authentic content recognition.
ACR_BY_ID_TYPE = {
    "gstin": "pan",   # EntityLocker verifies the entity's PAN for GSTIN/CIN flows
    "pan": "pan",
    "mca21": "cin",
    "cin": "cin",
    "udyam": "udyam",
}


class EntityLockerError(Exception):
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


def acr_for(id_type: str) -> str:
    return ACR_BY_ID_TYPE.get((id_type or "").strip().lower(), "pan")


# ---------------------------------------------------------------------------
# Authorize
# ---------------------------------------------------------------------------
def _url_quote(value: str) -> str:
    from urllib.parse import quote
    return quote(value, safe="+-" + " ").replace(" ", "+")


def build_authorize_url(app: dict, state: str, code_verifier: str, *, id_type: str = "") -> str:
    params = {
        "response_type": "code",
        "client_id": app.get("client_id", ""),
        "state": state,
        "redirect_uri": app.get("redirect_uri", ""),
        "code_challenge": generate_code_challenge(code_verifier),
        "code_challenge_method": "S256",
        "scope": settings.ENTITYLOCKER_SCOPE,
        "purpose": settings.ENTITYLOCKER_PURPOSE,
        "acr": acr_for(id_type),
    }
    qs = "&".join(f"{k}={_url_quote(str(v))}" for k, v in params.items() if v)
    return f"{settings.ENTITYLOCKER_AUTHORIZE_URL}?{qs}"


# ---------------------------------------------------------------------------
# Token + entity/user details
# ---------------------------------------------------------------------------
def exchange_code(app: dict, code: str, code_verifier: str) -> dict:
    """POST /public/oauth2/1/token → {access_token, refresh_token, id_token, ...}."""
    resp = requests.post(
        settings.ENTITYLOCKER_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": app.get("client_id", ""),
            "client_secret": app.get("client_secret", ""),
            "redirect_uri": app.get("redirect_uri", ""),
            "code_verifier": code_verifier,
        },
        timeout=20,
    )
    if resp.status_code != 200:
        raise EntityLockerError(f"token request failed: {resp.status_code} {resp.text[:300]}")
    data = resp.json()
    if not data.get("access_token"):
        raise EntityLockerError("token response missing access_token")
    return data


def get_entity(access_token: str) -> dict:
    """GET /public/oauth2/1/entity → {entitylockerid, name, doi, email, mobile, verified_by}."""
    resp = requests.get(
        settings.ENTITYLOCKER_ENTITY_URL,
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise EntityLockerError(f"entity request failed: {resp.status_code} {resp.text[:300]}")
    return resp.json()


def get_user(access_token: str) -> dict:
    """GET /public/oauth2/1/user → the DigiLocker user behind the entity."""
    resp = requests.get(
        settings.ENTITYLOCKER_USER_URL,
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise EntityLockerError(f"user request failed: {resp.status_code} {resp.text[:300]}")
    return resp.json()
