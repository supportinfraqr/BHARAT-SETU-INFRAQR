"""Document OCR + keyword verification (backend-only), ported from the
EesassinErp OCRAPIController + WorkerController verification rules.

The legacy app has no live PAN/EPFO/ESIC verify API — it verifies by OCR-ing
the uploaded document image and keyword-matching the recognized text against
the typed number + name. This module reproduces that behaviour so the worker
"Verify" buttons perform a real document check instead of a fake delay.

Since the rewrite the OCR is handled *in-process* by api.ocr_engine (RapidOCR +
pypdfium2). The old external service (http://13.202.27.216:8080/ocr) is kept
only as an optional fallback when BSS_OCR_URL is configured and the local
engine cannot run.
"""

import logging
import re

logger = logging.getLogger(__name__)

try:
    from django.conf import settings
except Exception:  # local/standalone use — no Django environment
    settings = None


class OcrError(Exception):
    pass


def _configured_url():
    if settings is not None:
        try:
            return getattr(settings, "BSS_OCR_URL", None) or getattr(settings, "OCR_URL", None)
        except Exception:
            return None
    return None


def ocr_url():
    """Effective remote OCR URL (empty = no remote fallback)."""
    import os

    return (os.environ.get("BSS_OCR_URL", "").strip()
            or _configured_url() or "")


def extract_text(file_bytes: bytes, filename: str, timeout: float | int = 60) -> str:
    """Recognize text with the in-process engine; fall back to the remote
    service (if one is configured) only when the engine cannot run."""
    from . import ocr_engine

    try:
        return ocr_engine.extract_text(file_bytes, filename, timeout=timeout)
    except ocr_engine.OcrError as exc:
        if not ocr_url():
            raise OcrError(str(exc)) from exc
        logger.warning("local OCR engine unavailable (%s) — using remote fallback", exc)
    except Exception as exc:  # pragma: no cover - unexpected engine failure
        logger.warning("local OCR failed: %s", exc)
        if not ocr_url():
            raise OcrError(f"OCR engine unavailable: {exc}") from exc
    return _extract_text_remote(file_bytes, filename, timeout=timeout)


def _extract_text_remote(file_bytes: bytes, filename: str, timeout: float | int = 60) -> str:
    """POST a document to the configured external OCR service (legacy path)."""
    import json as _json

    import requests

    url = ocr_url()
    try:
        resp = requests.post(
            url, files={"file": (filename, file_bytes)}, timeout=timeout,
        )
    except requests.RequestException as exc:
        raise OcrError(f"OCR service unreachable: {exc}") from exc
    if resp.status_code != 200:
        raise OcrError(f"OCR service returned HTTP {resp.status_code}")
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


def _squash(value: str) -> str:
    """Normalize for matching: uppercase + drop every non-alphanumeric char.

    RapidOCR output frequently drops spaces ("INCOME TAX DEPARTMENT" reads as
    "INCOMETAXDEPARTMENT") and OCR vendors split words inconsistently, so both
    sides are collapsed before comparing.
    """
    return re.sub(r"[^A-Z0-9]+", "", (value or "").upper())


# Keyword markers per document type (ported from WorkerController.cs). Each
# entry is matched both verbatim and squashed, so "GOVT. OF INDIA",
# "GOVERNMENTOFINDIA" etc. all satisfy the GOVT marker.
#
# NOTE: "GOVERNMENT OF INDIA" is deliberately NOT an Aadhaar marker — it also
# appears on PAN/EPFO cards, so it can't distinguish an Aadhaar.
_DOC_MARKERS = {
    "aadhaar": [
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
        "AADHAAR",
        "MERI PEHCHAN",
        "मेरी पहचान",
    ],
    "pan": [
        "INCOME TAX DEPARTMENT",
        "INCOME TAX DEPT",
        "PERMANENT ACCOUNT NUMBER",
        "PERMANENT ACCOUNT NO",
        "GOVERNMENT OF INDIA",
        "GOVT OF INDIA",
    ],
    "uan": [
        "UNIVERSAL ACCOUNT NUMBER",
        "EMPLOYEES PROVIDENT FUND ORGANISATION",
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

    Matching is whitespace/punctuation-insensitive to tolerate OCR output, then
    falls back to per-keyword comparison for the name.
    """
    key = (doc_type or "").strip().lower()
    markers = _DOC_MARKERS.get(key)
    if markers is None:
        return False, "Invalid document type."
    display = _DOC_DISPLAY[key]

    raw_upper = (ocr_text or "").upper()
    squashed = _squash(ocr_text)

    def present(marker: str) -> bool:
        m = marker.upper()
        if m in raw_upper:
            return True
        sq = _squash(marker)
        return bool(sq) and sq in squashed

    if not any(present(marker) for marker in markers):
        # An Aadhaar scan sometimes captures only the 12-digit UID block (no
        # matching header text); accept it, the number check still applies.
        if key != "aadhaar" or not re.search(r"(?:(?<!\d)\d{4}\s?\d{4}\s?\d{4}(?!\d))|\d{12}", raw_upper):
            return False, f"Uploaded document is not a valid {display} card/document."

    if expected_number:
        num = _squash(expected_number)
        if num and num not in squashed:
            return False, f"{display} number does not match the uploaded document."

    if expected_name:
        name = _squash(expected_name)
        if name and name not in squashed:
            words = [w for w in re.split(r"\s+", (expected_name or "").upper()) if len(w) >= 3]
            missing = [w for w in words if not present(w.strip("."))]
            if missing:
                return False, f"Name does not match the uploaded {display} document."

    return True, "SUCCESS"


# --- Field extraction (ported from EesassinErp myJs.js validateText) ---------


def extract_fields(doc_type, ocr_text):
    """Return a dict of fields auto-read from the document text, mirroring the
    ERP's getdetail/validateText regexes. Used to pre-fill the worker profile
    ("autofill from Aadhaar/DigiLocker"). Never authoritative — the worker can
    accept or override the suggested values."""
    key = (doc_type or "").strip().lower()
    raw = (ocr_text or "")
    fields: dict = {}

    if key == "aadhaar":
        m = re.search(r"(?<!\d)\d{4}\s?\d{4}\s?\d{4}(?!\d)", raw)
        if m:
            fields["aadhaar"] = re.sub(r"\s+", "", m.group(0))
        dob = _extract_dob(raw)
        if dob:
            fields["dob"] = dob
        gender = re.search(r"\b(MALE|FEMALE|TRANSGENDER)\b", raw.upper())
        if gender:
            fields["gender"] = gender.group(1).title()
        name, address = _extract_aadhaar_name_address(raw)
        if name:
            fields["name"] = name
        if address:
            fields["address"] = address

    elif key == "pan":
        m = re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", raw.upper())
        if m:
            fields["pan"] = m.group(0)
        name = _extract_near_label(raw, "NAME")
        if name:
            fields["name"] = name

    elif key == "uan":
        m = re.search(r"(?<!\d)\d{12}(?!\d)", raw)
        if m:
            fields["uan"] = m.group(0)

    elif key == "esic":
        m = re.search(r"(?<!\d)\d{10,17}(?!\d)", raw)
        if m:
            fields["esic"] = m.group(0)

    return fields


def _extract_dob(raw: str):
    m = re.search(r"\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b", raw)
    if not m:
        return None
    value = m.group(0).replace(".", "/").replace("-", "/")
    parts = value.split("/")
    if parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
        return f"{int(parts[0]):02d}/{int(parts[1]):02d}/{parts[2]}"
    return None


_LABELS = ("ADDRESS", "GENDER", "DOB", "YEAR OF BIRTH", "AADHAAR", "UIDAI",
           "GOVERNMENT", "UNIQUE", "MERI", "HINDI", "हिन्दी", "PHOTO", "SIGN",
           "NAME", "DATE", "FATHER", "MOTHER", "SPOUSE")


def _looks_like_name(line: str) -> bool:
    t = line.strip()
    if not t:
        return False
    if len(t) < 4 or len(t) > 60:
        return False
    if re.search(r"\d", t):
        return False
    if re.search(r"[\u0900-\u097F]", t):  # Devanagari = "मेरी पहचान" slogan, not a name
        return False
    letters = sum(c.isalpha() for c in t)
    if letters < max(4, int(len(t) * 0.6)) or letters < 4:
        return False
    up = t.upper()
    core = re.sub(r"^[^A-Z]+", "", up)
    words = [w for w in re.split(r"\s+", core) if w]
    if words and words[0] in _LABELS and len(words) == 1:
        return False
    return True


_ADDRESS_HINTS = ("VILLAGE", "POST", "MANDAL", "TEHSIL", "TALUK", "TALUKA",
                  "DISTRICT", "STATE", "ROAD", "STREET", "NAGAR", "NAGAR "
                  "HNO", "HOUSE", "NEAR", "LAXMI", "GOVIND", "RAM", "SHIVA")


def _extract_aadhaar_name_address(raw: str):
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    name = None
    dob_idx = next(
        (i for i, ln in enumerate(lines)
         if re.search(r"DOB|YEAR\s*OF\s*BIRTH|JANM", ln, re.IGNORECASE)),
        None,
    )
    if dob_idx is None:
        date_idx = next(
            (i for i, ln in enumerate(lines) if re.search(r"\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b", ln)),
            None,
        )
    else:
        date_idx = None
    window = dob_idx if dob_idx is not None else date_idx
    if window is not None:
        for i in range(max(0, window - 2), window):
            if _looks_like_name(lines[i]):
                name = re.sub(r"\s+", " ", lines[i]).title()
                break
        if name is None:
            for i in range(window + 1, min(len(lines), window + 4)):
                if _looks_like_name(lines[i]):
                    name = re.sub(r"\s+", " ", lines[i]).title()
                    break

    address = None
    pin = None
    pin_idx = None
    for i, ln in enumerate(lines):
        m = re.search(r"\b([1-9]\d{5})(?!\d)", ln)
        if m:
            pin = m.group(1)
            pin_idx = i
            break
    if pin_idx is not None:
        gender_idx = next(
            (i for i, ln in enumerate(lines) if re.match(r"^(MALE|FEMALE|TRANSGENDER)$", ln.upper())),
            window if window is not None else -1,
        )
        start = gender_idx + 1 if gender_idx is not None and gender_idx >= 0 else (window + 2 if window is not None else 0)
        if start < 0:
            start = 0
        if start < pin_idx:
            chunk = " ".join(lines[start:pin_idx + 1])
        else:
            chunk = lines[pin_idx]
        chunk = re.sub(r"(?i)(address|hindi|हिन्दी|पता|meri pehchan|मेरी पहचान)", " ", chunk)
        chunk = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", " ", chunk)
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if len(chunk) >= 6:
            address = chunk
    return name, address


def _extract_near_label(raw: str, label: str):
    """Best-effort: value on the line containing/right after the label."""
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    for i, ln in enumerate(lines):
        if label.upper() in ln.upper():
            cand = re.sub(r"(?i)^\s*" + label + r"\s*[:\-]?\s*", "", ln).strip()
            if cand and _looks_like_name(cand):
                return re.sub(r"\s+", " ", cand).title()
            for j in range(i + 1, min(i + 3, len(lines))):
                if _looks_like_name(lines[j]):
                    return re.sub(r"\s+", " ", lines[j]).title()
    return None


# ── Additional-form OCR checklist verification ───────────────────────────────
# A premade catalog of checkpoints the admin can tick when creating an
# additional form. On upload, the recognised text is checked against each
# ticked pointer and the results are shown to the uploader.
CHECKPOINT_CATALOG = [
    {"key": "signature", "type": "signature", "label": "Signature / Authorised signatory"},
    {"key": "name", "type": "name", "label": "Party name (contractor / employer / site / worker)"},
    {"key": "date", "type": "date", "label": "Date present"},
    {"key": "period", "type": "period", "label": "Reporting period (month / year) present"},
    {"key": "seal", "type": "seal", "label": "Seal / Company stamp"},
    {"key": "title", "type": "title", "label": "Form title / heading"},
    {"key": "licence", "type": "keyword", "label": "Licence / registration number"},
    {"key": "amount", "type": "amount", "label": "Amount / figures"},
    {"key": "readable", "type": "readable", "label": "Readable / not blank"},
]

_SIGNATURE_WORDS = ("SIGNATURE", "SIGNATORY", "SIGNED BY", "AUTHORISED SIGNATORY",
                    "AUTHORIZED SIGNATORY", "FOR AND ON BEHALF")
_SEAL_WORDS = ("SEAL", "STAMP", "COMMON SEAL", "COMPANY SEAL")
_DATE_RE = re.compile(r"\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b")
_AMOUNT_RE = re.compile(r"(?:₹|RS\.?|INR)\s?[\d,]+(?:\.\d{1,2})?")
_MONTHS = ("JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
           "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER")


def catalog():
    """The premade checkpoint catalog the admin picks from."""
    return [dict(entry) for entry in CHECKPOINT_CATALOG]


def _contains(value: str, upper: str, squashed: str) -> bool:
    if not value:
        return False
    if value.upper() in upper:
        return True
    sq = _squash(value)
    return bool(sq) and sq in squashed


def _evaluate_checkpoint(ctype, value, upper, squashed, context):
    """Return (passed, detail) for one checkpoint against the OCR text."""
    if ctype == "signature":
        return (any(w in upper for w in _SIGNATURE_WORDS),
                "no signature / signatory text found")
    if ctype == "seal":
        return (any(w in upper for w in _SEAL_WORDS), "no seal / stamp text found")
    if ctype == "date":
        return (bool(_DATE_RE.search(upper)), "no date found")
    if ctype == "amount":
        return (bool(_AMOUNT_RE.search(upper)), "no amount found")
    if ctype == "readable":
        return (len((upper or "").strip()) >= 20, "little or no readable text")
    if ctype == "period":
        month = str((context or {}).get("month") or "").upper()
        year = str((context or {}).get("year") or "")
        period = str((context or {}).get("period") or "").upper()
        hit = (month and month in upper) or (year and year in upper) \
            or (period and _contains(period, upper, squashed))
        return (bool(hit), f"period {month} {year}".strip() + " not found")
    if ctype == "name":
        target = str((context or {}).get(value or "contractor") or "").strip()
        if not target:
            return True, "no name configured"
        return (_contains(target, upper, squashed), f"{value or 'contractor'} name not found")
    if ctype == "title":
        target = value or str((context or {}).get("form_name") or "")
        if not target:
            return True, "no title configured"
        return (_contains(target, upper, squashed), "form title not found")
    if ctype == "regex":
        try:
            return (bool(re.search(value, upper, re.I)), "pattern not found")
        except re.error:
            return False, "invalid pattern"
    # default: keyword / custom marker
    if not value:
        return True, ""
    return (_contains(value, upper, squashed), f"'{value}' not found")


def verify_checkpoints(checkpoints, ocr_text, context=None):
    """Verify recognised text against an additional form's checklist.

    ``checkpoints`` = ``[{"type","label","value"?,"required"?}, …]``.
    ``context`` = contractor/employer/site/worker names + month/year/period and
    the form name. Returns ``(accuracy, results, findings)`` where each result is
    ``{"key","label","type","required","passed","detail"}``."""
    text = ocr_text or ""
    upper = text.upper()
    squashed = _squash(text)
    results, findings = [], []
    for cp in checkpoints or []:
        if not isinstance(cp, dict):
            continue
        ctype = str(cp.get("type") or "keyword").lower()
        label = str(cp.get("label") or ctype)
        value = str(cp.get("value") or "").strip()
        required = bool(cp.get("required"))
        passed, detail = _evaluate_checkpoint(ctype, value, upper, squashed, context or {})
        results.append({"key": str(cp.get("key") or ctype), "label": label, "type": ctype,
                        "required": required, "passed": passed, "detail": detail})
        findings.append(("Verified: " if passed else "Missing: ") + label
                        + (": " + detail if not passed else ""))
    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    accuracy = round((passed_count / total) * 100, 2) if total else 100.0
    return accuracy, results, findings
