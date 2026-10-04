"""Symmetric encryption for stored secrets (camera passwords, AI API keys).

Key is derived from the project SECRET_KEY, so no extra env is required and
values cannot be read without the server's secret.
"""

import base64
import hashlib

from django.conf import settings


def _fernet():
    from cryptography.fernet import Fernet

    key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_secret(raw: str) -> str:
    raw = str(raw or "")
    if not raw:
        return ""
    return _fernet().encrypt(raw.encode()).decode()


def decrypt_secret(token: str) -> str:
    token = str(token or "")
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:
        return ""


def mask_secret(raw: str) -> str:
    raw = str(raw or "")
    if not raw:
        return ""
    if len(raw) <= 8:
        return "•" * len(raw)
    return f"{raw[:4]}{'•' * 6}{raw[-4:]}"
