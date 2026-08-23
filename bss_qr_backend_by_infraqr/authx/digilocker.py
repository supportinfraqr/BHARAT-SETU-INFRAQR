"""DigiLocker OAuth 2.0 (Aadhaar/OTP based identity verification) for signup/login.

Mirrors the working legacy integration found in EesassinErp
(LoginController.DigiLockerLogin + ReturnController). Uses PKCE (S256).

Flow:
  /api/auth/digilocker/start  -> builds authorize URL (PKCE) -> frontend redirects
  DigiLocker redirects back    -> /api/auth/digilocker/callback -> exchange code for
                                 token, fetch user details, create/link a User, JWT.
"""
import base64
import hashlib
import json
import secrets
import urllib.parse
import urllib.request

from django.conf import settings


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def digilocker_configured() -> bool:
    return bool(
        settings.DIGILOCKER_CLIENT_ID
        and settings.DIGILOCKER_CLIENT_SECRET
        and settings.DIGILOCKER_REDIRECT_URI
    )


def new_code_verifier() -> str:
    return _b64url(secrets.token_bytes(32))


def code_challenge(verifier: str) -> str:
    return _b64url(hashlib.sha256(verifier.encode()).digest())


def new_state() -> str:
    return secrets.token_urlsafe(24)


def build_authorize_url(state: str, code_verifier: str) -> str:
    """Construct the DigiLocker OAuth authorize URL (with PKCE) for the current client."""
    params = {
        "response_type": "code",
        "client_id": settings.DIGILOCKER_CLIENT_ID,
        "state": state,
        "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
        "code_challenge": code_challenge(code_verifier),
        "code_challenge_method": "S256",
        "dl_flow": "signin",
        "acr": "pan+aadhaar+mobile+user_alias",
        "amr": "aadhaar+pan",
        "scope": settings.DIGILOCKER_SCOPE,
    }
    return f"{settings.DIGILOCKER_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_token(code: str, code_verifier: str) -> dict | None:
    """Exchange the authorization code for an access token via DigiLocker."""
    payload = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.DIGILOCKER_CLIENT_ID,
        "client_secret": settings.DIGILOCKER_CLIENT_SECRET,
        "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
        "code_verifier": code_verifier,
    }).encode()
    req = urllib.request.Request(
        settings.DIGILOCKER_TOKEN_URL, data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
    except Exception:
        return None
    try:
        return json.loads(body)
    except ValueError:
        return None


def fetch_profile(access_token: str) -> dict | None:
    """Fetch the verified user details (digilockerid, name, dob, gender, mobile,
    email, eaadhaar, picture) from DigiLocker's /1/user endpoint."""
    req = urllib.request.Request(
        settings.DIGILOCKER_DETAILS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
    except Exception:
        return None
    try:
        return json.loads(body)
    except ValueError:
        return None
