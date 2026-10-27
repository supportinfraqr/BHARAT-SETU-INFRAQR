"""Upload storage for payroll attachments (claims, investment proofs, imports).

Replaces the legacy multer + cloud upload (``service/cloudUploade``). Files are
written to Django ``default_storage`` (BSS MEDIA_ROOT, never web-served) under
``payroll_engine/<org_id>/<folder>/`` and served back through the authenticated
``/v1/payroll-engine/files/<key>`` endpoint (views/core.py).
"""

import os
import uuid

from django.core.files.storage import default_storage

from ..context import PayrollError

ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
}
MAX_BYTES = 10 * 1024 * 1024
ROOT = "payroll_engine"


def validate_upload(uploaded):
    if uploaded is None:
        raise PayrollError("No file uploaded")
    if getattr(uploaded, "content_type", "") not in ALLOWED_MIME_TYPES:
        raise PayrollError("Invalid file type. Only .xlsx, .csv, .pdf, .jpg, .png, .gif files are allowed")
    if uploaded.size > MAX_BYTES:
        raise PayrollError("File too large (max 10MB)")


def save_upload(org_id, uploaded, folder="uploads"):
    """Persist one uploaded file; returns the legacy attachment dict."""
    validate_upload(uploaded)
    _, ext = os.path.splitext(uploaded.name or "")
    safe_folder = "".join(c for c in str(folder) if c.isalnum() or c in "-_") or "uploads"
    key = f"{ROOT}/{org_id}/{safe_folder}/{uuid.uuid4().hex}{ext.lower()[:10]}"
    stored = default_storage.save(key, uploaded)
    return {
        "url": f"/v1/payroll-engine/files/{stored[len(ROOT) + 1:]}",
        "fileName": uploaded.name,
        "mimeType": uploaded.content_type,
        "size": uploaded.size,
        "key": stored,
    }


def save_uploads(org_id, files, field, folder=None):
    """All files posted under multipart ``field`` (legacy ``req.files[field]``)."""
    return [save_upload(org_id, f, folder or field) for f in files.getlist(field)]


def open_file(key):
    """Return (file handle, filename) for a ``<org_id>/<folder>/<name>`` key."""
    full = f"{ROOT}/{key}"
    if ".." in key or not default_storage.exists(full):
        raise PayrollError("File not found", 404)
    return default_storage.open(full, "rb"), os.path.basename(full)
