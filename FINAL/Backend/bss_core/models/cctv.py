"""Site CCTV camera configuration.

One row per physical camera the employer has set up for a site. The CCTV
attendance engine (running on the dedicated attendance host) pulls the feed
described here, recognises enrolled workers and marks attendance; BSS records
which camera/area produced each mark.

The camera password is stored encrypted (Fernet, key derived from
``settings.SECRET_KEY``) and is never returned to the browser.
"""

import base64
import hashlib
from urllib.parse import quote

from django.conf import settings
from django.db import models

from .relationship import Site


def _fernet():
    from cryptography.fernet import Fernet

    key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_cctv_password(raw: str) -> str:
    raw = str(raw or "")
    if not raw:
        return ""
    return _fernet().encrypt(raw.encode()).decode()


def decrypt_cctv_password(token: str) -> str:
    token = str(token or "")
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:
        return ""


class SiteCctvCamera(models.Model):
    """A single CCTV camera / feed configured by the employer for a site."""

    SOURCE_TYPES = [
        ("RTSP", "RTSP (IP camera / NVR)"),
        ("HTTP", "HTTP / MJPEG stream"),
        ("FILE", "Test file / simulated feed"),
        ("OTHER", "Other / direct URL"),
    ]

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="cctv_cameras")
    label = models.CharField(max_length=120)
    area = models.CharField(max_length=120, blank=True)
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES, default="RTSP")
    host = models.CharField(max_length=190, blank=True)
    port = models.PositiveIntegerField(null=True, blank=True)
    channel = models.CharField(max_length=190, blank=True)
    username = models.CharField(max_length=120, blank=True)
    password_enc = models.CharField(max_length=500, blank=True, default="")
    url = models.CharField(max_length=500, blank=True)
    enabled = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_cctv_camera"
        ordering = ["sort_order", "id"]
        indexes = [models.Index(fields=["site"], name="idx_cctv_camera_site")]

    def __str__(self):
        return f"{self.site_id}:{self.label}"

    # --- password helpers -------------------------------------------------
    def set_password(self, raw: str) -> None:
        self.password_enc = encrypt_cctv_password(raw)

    def get_password(self) -> str:
        return decrypt_cctv_password(self.password_enc)

    @property
    def has_password(self) -> bool:
        return bool(self.password_enc)

    # --- source resolution ------------------------------------------------
    def build_source(self) -> str:
        """Return the feed URL the engine should open, or '' when incomplete."""
        if self.source_type in ("FILE", "OTHER") or self.url.strip():
            return self.url.strip()
        host = (self.host or "").strip()
        if not host:
            return ""
        scheme = "http" if self.source_type == "HTTP" else "rtsp"
        port = self.port or (80 if scheme == "http" else 554)
        path = (self.channel or "").strip() or "/"
        if not path.startswith("/"):
            path = "/" + path
        creds = ""
        user = (self.username or "").strip()
        if user:
            creds = quote(user, safe="")
            pwd = self.get_password()
            if pwd:
                creds += ":" + quote(pwd, safe="")
            creds += "@"
        return f"{scheme}://{creds}{host}:{port}{path}"
