"""Symmetric encryption for stored integration secrets (SAP password/token).

Uses **Fernet** (``cryptography``). The key comes from ``BSS_FERNET_KEY`` — a
urlsafe base64 32-byte key (generate once with ``python -c
"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"``).
If absent, it is derived from ``BSS_SECRET_KEY`` so existing deployments keep
working; rotating the key requires re-entering the secrets.

Encrypted values are stored as ``enc:v1:<token>``. ``decrypt`` also returns a
legacy plaintext value unchanged, so pre-existing rows keep working.
"""

from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

_PREFIX = "enc:v1:"


def _key() -> bytes:
    raw = (os.environ.get("BSS_FERNET_KEY") or "").strip()
    if raw:
        try:
            decoded = base64.urlsafe_b64decode(raw.encode())
            if len(decoded) == 32:
                return raw.encode()
        except Exception:  # noqa: BLE001 — not a valid key; derive instead
            pass
        return base64.urlsafe_b64encode(hashlib.sha256(raw.encode()).digest())
    secret = (os.environ.get("BSS_SECRET_KEY") or "bss-dev-insecure").encode()
    return base64.urlsafe_b64encode(hashlib.sha256(b"bss-fernet:" + secret).digest())


def _fernet() -> Fernet:
    return Fernet(_key())


def encrypt(value: str) -> str:
    if not value:
        return ""
    token = _fernet().encrypt(str(value).encode()).decode()
    return _PREFIX + token


def decrypt(value: str) -> str:
    if not value:
        return ""
    if not str(value).startswith(_PREFIX):
        return str(value)  # legacy plaintext
    try:
        return _fernet().decrypt(str(value)[len(_PREFIX):].encode()).decode()
    except InvalidToken:
        return ""


def is_encrypted(value: str) -> bool:
    return bool(value) and str(value).startswith(_PREFIX)


def generate_key() -> str:
    return Fernet.generate_key().decode()
