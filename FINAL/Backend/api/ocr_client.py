"""Document OCR + keyword verification client (backend-only), ported from the
EesassinErp OCRAPIController + WorkerController verification rules.

The legacy app has no live PAN/EPFO/ESIC verify API — it verifies by OCR-ing
the uploaded document image and keyword-matching the recognized text against
the typed number + name. This module reproduces that behaviour so the worker
"Verify" buttons perform a real document check instead of a fake delay.
"""

import requests
from django.conf import settings


class OcrError(Exception):
    pass


OCR_URL = getattr(settings, "OCR_URL", None) or getattr(settings, "BSS_OCR_URL", None)


def _ocr_url():
    return OCR_URL or "http://13.202.27.216:8080/ocr"


def extract_text(file_bytes: bytes, filename: str, timeout: int = 60) -> str:
    """POST a document image to the OCR service and return the recognized text."""
    url = _ocr_url()
    try:
        resp = requests.post(
            url, files={"file": (filename, file_bytes)}, timeout=timeout,
        )
    except requests.RequestException as exc:
        raise OcrError(f"OCR service unreachable: {exc}") from exc
    if resp.status_code != 200:
        raise OcrError(f"OCR service returned HTTP {resp.status_code}")
    # The legacy OCR service returns JSON wrapping the text; an explicit failure
    # (success=false / error) means nothing could be read, so return "" rather
    # than the raw error envelope.
    import json as _json
    text = resp.text
    try:
        data = _json.loads(text)
        if isinstance(data, dict):
            if data.get("success") is False or data.get("error"):
                return ""
            text = data.get("text") or data.get("data") or ""
    except ValueError:
        pass
    return text if isinstance(text, str) else str(text)


# Keyword markers per document type (ported from WorkerController.cs).
_DOC_MARKERS = {
    "aadhaar": [
        "GOVERNMENT OF INDIA",
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
        "AADHAAR",
        "MERI PEHCHAN",
        "मेरी पहचान",
    ],
    "pan": [
        "INCOME TAX DEPARTMENT",
        "PERMANENT ACCOUNT NUMBER",
    ],
    "uan": [
        "UNIVERSAL ACCOUNT NUMBER",
        "EMPLOYEES PROVIDENT FUND",
        "EPFO",
    ],
    "esic": [
        "EMPLOYEES STATE INSURANCE CORPORATION",
        "EMPLOYEES STATE INSURANCE",
        "ESIC",
    ],
}

_DOC_DISPLAY = {
    "aadhaar": "Aadhaar",
    "pan": "PAN",
    "uan": "UAN",
    "esic": "ESIC",
}


def verify_document_text(doc_type, ocr_text, expected_number="", expected_name=""):
    """Return (ok, message) after keyword + number + name matching.

    Ported from EesassinErp WorkerController.cs VerifyDoc logic:
      - validate the document is the claimed type via OCR markers
      - verify the typed number appears in the OCR text
      - verify the typed name appears in the OCR text
    """
    key = (doc_type or "").strip().lower()
    markers = _DOC_MARKERS.get(key)
    if markers is None:
        return False, "Invalid document type."
    display = _DOC_DISPLAY[key]

    upper = (ocr_text or "").upper()
    if not any(marker.upper() in upper for marker in markers):
        return False, f"Uploaded document is not a valid {display} card/document."

    if expected_number:
        num = "".join(ch for ch in expected_number.upper() if ch.isalnum())
        ocr_num = "".join(ch for ch in upper if ch.isalnum())
        if num and num not in ocr_num:
            return False, f"{display} number does not match the uploaded document."

    if expected_name:
        name = (expected_name or "").upper().strip()
        if name and name not in upper:
            return False, f"Name does not match the uploaded {display} document."

    return True, "SUCCESS"
