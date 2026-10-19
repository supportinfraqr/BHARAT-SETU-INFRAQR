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
    "bank": [
        "PASSBOOK",
        "PASS BOOK",
        "BANK PASSBOOK",
        "CANCELLED CHEQUE",
        "CANCELED CHEQUE",
        "CANCELLED CHECK",
        "IFSC",
        "MICR",
        "SAVINGS BANK",
        "SAVINGS ACCOUNT",
        "A/C NO",
        "ACCOUNT NO",
        "ACCOUNT NUMBER",
        "STATE BANK OF INDIA",
        "PUNJAB NATIONAL BANK",
        "BANK OF BARODA",
        "CANARA BANK",
        "HDFC BANK",
        "ICICI BANK",
        "AXIS BANK",
        "KOTAK MAHINDRA",
        "UNION BANK",
        "BANK OF INDIA",
        "INDIAN BANK",
    ],
    "bocw": [
        "BOCW",
        "BUILDING AND OTHER CONSTRUCTION WORKERS",
        "CONSTRUCTION WORKERS",
        "WELFARE BOARD",
    ],
    "education": [
        "CERTIFICATE",
        "BOARD OF",
        "UNIVERSITY",
        "MARKSHEET",
        "MARKS STATEMENT",
        "SECONDARY",
        "HIGHER SECONDARY",
        "EXAMINATION",
        "ROLL NO",
    ],
    "skill": [
        "SKILL",
        "TRAINING",
        "NSDC",
        "NSQF",
        "COMPETENCY",
        "TRADE",
        "ITI",
    ],
    "medical": [
        "MEDICAL",
        "FITNESS",
        "MEDICALLY FIT",
        "DOCTOR",
        "PHYSICIAN",
        "MBBS",
        "REGISTERED MEDICAL PRACTITIONER",
    ],
    "address_proof": [
        "AADHAAR",
        "UIDAI",
        "UNIQUE IDENTIFICATION AUTHORITY",
        "PASSBOOK",
        "BANK PASSBOOK",
        "IFSC",
        "CANCELLED CHEQUE",
        "CANCELED CHEQUE",
        "ELECTION COMMISSION",
        "ELECTOR",
        "VOTER",
        "PASSPORT",
        "REPUBLIC OF INDIA",
        "DRIVING LICENCE",
        "DRIVING LICENSE",
        "TRANSPORT DEPARTMENT",
        "RTO",
        "ELECTRICITY",
        "WATER BILL",
        "GAS BILL",
        "TELEPHONE",
        "BROADBAND",
        "UTILITY BILL",
        "RENT AGREEMENT",
        "LEASE AGREEMENT",
        "TENANCY",
        "LANDLORD",
        "RATION CARD",
        "PUBLIC DISTRIBUTION",
        "FAIR PRICE SHOP",
    ],
}

_DOC_DISPLAY = {
    "aadhaar": "Aadhaar",
    "pan": "PAN",
    "uan": "UAN",
    "esic": "ESIC",
    "bank": "Bank Passbook / Cancelled Cheque",
    "bocw": "BOCW Card",
    "education": "Educational Certificate",
    "skill": "Skill Certificate",
    "medical": "Medical Fitness Certificate",
    "address_proof": "Address Proof",
}

# Most-specific first: an Aadhaar/passbook also carries an address, so identity
# document types must win over the generic "address_proof" bucket when we name
# the type a document looks like.
_DETECT_ORDER = ("aadhaar", "pan", "uan", "esic", "bank", "bocw", "medical",
                 "education", "skill", "address_proof")

# Distinctive identity/bank documents whose detection reliably identifies a
# *different* type than the slot the user picked. Certificate-like slots share
# generic words, so they are excluded from the hard cross-type block.
_STRONG_TYPES = frozenset({"aadhaar", "pan", "uan", "esic", "bank"})

# Master document code -> expected OCR type (None/unlisted = no OCR check: the
# photo/signature slots and system-issued letters carry no readable text).
_WORKER_DOC_TYPE = {
    "WM01": "aadhaar", "AADHAR": "aadhaar",
    "WM02": "pan", "PAN": "pan",
    "WM03": "address_proof",
    "WM04": "education", "EDU": "education",
    "WM05": "skill",
    "BANK": "bank",
    "UAN": "uan",
    "ESIC": "esic",
    "BOCW": "bocw",
    "MED": "medical",
}

_AADHAAR_NUM_RE = re.compile(r"(?<!\d)\d{4}\s?\d{4}\s?\d{4}(?!\d)")
_PIN_RE = re.compile(r"\b[1-9]\d{5}\b")

_ADDRESS_KEYWORDS = (
    "ADDRESS", "S/O", "D/O", "W/O", "C/O", "VILLAGE", "POST", "DISTRICT",
    "STATE", "PIN", "PINCODE", "PIN CODE", "HOUSE", "H.NO", "H NO", "ROAD",
    "STREET", "NAGAR", "COLONY", "BLOCK", "TEHSIL", "TALUK", "TALUKA",
    "MANDAL", "DOOR NO", "FLAT", "APARTMENT", "SECTOR",
)


def _present(marker: str, upper: str, squashed: str) -> bool:
    """True when ``marker`` appears verbatim (case-insensitive) or squashed."""
    m = (marker or "").upper()
    if not m:
        return False
    if m in upper:
        return True
    sq = _squash(marker)
    return bool(sq) and sq in squashed


def detect_document_type(text: str):
    """Name the document type the OCR text most specifically looks like.

    Returns one of ``_DETECT_ORDER`` or ``None`` when nothing is confidently
    recognised. Used to reject an upload that is clearly a *different* document
    type than the slot the user selected.
    """
    upper = (text or "").upper()
    squashed = _squash(text)
    if not squashed:
        return None
    markers_by_type = dict(_DOC_MARKERS)
    for doc_type in _DETECT_ORDER:
        if doc_type == "aadhaar" and _AADHAAR_NUM_RE.search(text or ""):
            return "aadhaar"
        if any(_present(marker, upper, squashed) for marker in markers_by_type.get(doc_type, ())):
            return doc_type
    return None


def address_proof_check(text: str):
    """Score an upload against address-proof criteria.

    Returns ``(ok, message, points)``. A document qualifies as an address proof
    when it is a recognised address-bearing document AND it shows a PIN code AND
    it has an address block.
    """
    value = text or ""
    upper = value.upper()
    squashed = _squash(value)
    has_doc = any(_present(m, upper, squashed) for m in _DOC_MARKERS["address_proof"])
    has_pin = bool(_PIN_RE.search(value))
    has_address = any(_present(k, upper, squashed) for k in _ADDRESS_KEYWORDS)
    points = [
        {"key": "doctype", "label": "Recognised address document (Aadhaar / passbook / voter ID / passport / DL / utility bill / rent / ration)",
         "passed": has_doc, "detail": "" if has_doc else "not a recognised address document"},
        {"key": "pincode", "label": "PIN code present",
         "passed": has_pin, "detail": "" if has_pin else "no 6-digit PIN code found"},
        {"key": "address", "label": "Address block present",
         "passed": has_address, "detail": "" if has_address else "no address lines found"},
    ]
    if has_doc and has_pin and has_address:
        return True, "", points
    missing = [p["label"] for p in points if not p["passed"]]
    return False, "This does not look like a valid address proof (" + "; ".join(missing) + ").", points


def check_worker_document(code: str, ocr_text: str):
    """Verify a worker document upload against its catalogue slot.

    Returns ``(ok, message, points)``. Blocks (``ok=False``) when the document
    cannot be read, is clearly a different document type, or fails the
    address-proof checks for the Address Proof slot. Slots without a text-based
    check (photo/signature/system letters) always pass.
    """
    expected = _WORKER_DOC_TYPE.get((code or "").strip().upper())
    if not expected:
        return True, "", []

    text = ocr_text or ""
    squashed = _squash(text)
    if len(squashed) < 15:
        return False, ("We couldn't read any text from this document. Please upload a clear, "
                       "well-lit scan or photo of the correct document."), [
            {"key": "readable", "label": "Readable document", "passed": False,
             "detail": "no readable text found"},
        ]

    if expected == "address_proof":
        return address_proof_check(text)

    label = _DOC_DISPLAY.get(expected, expected)
    upper = text.upper()
    detected = detect_document_type(text)

    # A clearly identified *different* identity/bank document always blocks,
    # even when a generic shared word (e.g. "GOVERNMENT OF INDIA" on an Aadhaar)
    # happens to match the expected slot's markers.
    if detected and detected in _STRONG_TYPES and detected != expected:
        return False, (f"This looks like a different document ({_DOC_DISPLAY.get(detected, detected)}), "
                       f"not {label}. Please upload the correct document."), []

    markers = _DOC_MARKERS.get(expected, ())
    own = any(_present(m, upper, squashed) for m in markers)
    if expected == "aadhaar" and not own:
        own = bool(_AADHAAR_NUM_RE.search(text))
    if own:
        return True, "", []

    if detected and detected != expected:
        return False, (f"This looks like a different document ({_DOC_DISPLAY.get(detected, detected)}), "
                       f"not {label}. Please upload the correct document."), []
    return False, (f"We couldn't confirm this is a valid {label}. "
                   f"Please upload a clear {label} document."), []


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
            fields["name"] = _normalise_name(name)
        if address:
            fields["address"] = address
        # Care of (S/O, D/O, W/O, C/O) → also the father's name for S/O / D/O.
        care = re.search(r"(?im)\b([SDWC])\s*/\s*O\s*[:\-]?\s*([A-Za-z][A-Za-z .']{2,60})", raw)
        if care:
            rel = care.group(1).upper()
            who = re.sub(r"\s+", " ", care.group(2)).strip().title()
            fields["care_of"] = f"{rel}/O {who}"
            if rel in ("S", "D"):
                fields["father"] = who
        # Labelled "Address:" fallback (when no PIN-anchored block was found).
        if not fields.get("address"):
            al = re.search(r"(?im)^\s*address\s*[:\-]\s*(.+?)(?:\n\s*\n|$)", raw, re.S)
            if al:
                addr = re.sub(r"\s+", " ", al.group(1)).strip()
                if len(addr) >= 6:
                    fields["address"] = addr

    elif key == "pan":
        m = re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", raw.upper())
        if m:
            fields["pan"] = m.group(0)
        name = _extract_near_label(raw, "NAME")
        if not name:
            # e-PAN: the holder name is the first person-name line after the
            # headers (Income Tax / Govt of India), before the father/DOB/PAN.
            for ln in raw.splitlines():
                t = ln.strip()
                if not t:
                    continue
                if re.search(r"(?i)(income\s*tax|department|govt|government|permanent\s*account|account\s*number|signature|date\s*of\s*birth|father|dob|\bcard\b)", t):
                    continue
                if _looks_like_person_name(t):
                    name = _normalise_name(t)
                    break
        if name:
            fields["name"] = _normalise_name(name)

    elif key == "uan":
        m = re.search(r"(?<!\d)\d{12}(?!\d)", raw)
        if m:
            fields["uan"] = m.group(0)

    elif key == "esic":
        m = re.search(r"(?<!\d)\d{10,17}(?!\d)", raw)
        if m:
            fields["esic"] = m.group(0)

    elif key == "dl":
        m = re.search(r"\b([A-Z]{2}[\s-]?\d{2}[\s-]?\d{4}[\s-]?\d{7})\b", raw.upper())
        if m:
            fields["dl"] = re.sub(r"[\s-]+", "", m.group(1))
        vt = re.search(r"(?:VALID\s*(?:TILL|UPTO|UP TO|TO))\D{0,20}(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})", raw.upper())
        if vt:
            fields["validTill"] = vt.group(1).replace("/", "-")

    return fields


def _normalise_name(value: str) -> str:
    """Insert word gaps into camel-cased OCR names and title-case them.

    "SyedYasserAli" -> "Syed Yasser Ali" (preserves the gaps the text layer or
    OCR did provide)."""
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    text = re.sub(r"(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])", " ", text)
    words = []
    for word in text.split():
        if word.isupper() and len(word) > 1:
            words.append(word.title())
        else:
            words.append(word[:1].upper() + word[1:] if word else word)
    return " ".join(words).strip()


def _extract_dob(raw: str):
    # Prefer the date labelled DOB / Date of Birth — never the issue date.
    m = re.search(r"(?is)(?:date\s*of\s*birth|dob|जन्म)[^\d]{0,25}?(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})", raw)
    if not m:
        for cand in re.finditer(r"\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b", raw):
            prefix = raw[max(0, cand.start() - 24):cand.start()].lower()
            if "issue" in prefix:
                continue
            m = cand
            break
    if not m:
        return None
    value = m.group(1) if m.lastindex else m.group(0)
    value = value.replace(".", "/").replace("-", "/")
    parts = value.split("/")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        return f"{int(parts[0]):02d}/{int(parts[1]):02d}/{parts[2]}"
    return None


_LABELS = ("ADDRESS", "GENDER", "DOB", "YEAR OF BIRTH", "AADHAAR", "UIDAI",
           "GOVERNMENT", "UNIQUE", "MERI", "HINDI", "हिन्दी", "PHOTO", "SIGN",
           "NAME", "DATE", "FATHER", "MOTHER", "SPOUSE", "INFORMATION", "ISSUE")

_HEADER_WORDS = re.compile(
    r"(UNIQUE|IDENTIFICATION|AUTHORITY|GOVERNMENT|AADHAAR|UIDAI|INDIA|MERA|"
    r"PEHCHAN|ENROL|INFORMATION|PHOTO|SIGNATURE|SIGN|\bVID\b|MALE|FEMALE|"
    r"TRANSGENDER|ISSUE|CITIZENSHIP|AUTHENTICATION|VERIFY|SECURE|QRCODE)",
    re.I,
)


def _looks_like_name(line: str) -> bool:
    t = line.strip()
    if not t:
        return False
    if len(t) < 4 or len(t) > 60:
        return False
    if re.search(r"\d", t):
        return False
    if re.search(r"[\u0900-\u097F]", t):  # Devanagari slogan, not a name
        return False
    letters = sum(c.isalpha() for c in t)
    if letters < max(4, int(len(t) * 0.6)) or letters < 4:
        return False
    if _HEADER_WORDS.search(t):
        return False
    if re.search(r"\b[SDWC]\s*/\s*O\b", t, re.I):
        return False
    if ":" in t or re.match(r"(?i)^(name|father|mother|spouse|dob|gender|address|care of|s/o|d/o|w/o|to\b|this\b|verify\b)", t):
        return False
    up = t.upper()
    core = re.sub(r"^[^A-Z]+", "", up)
    words = [w for w in re.split(r"\s+", core) if w]
    if words and words[0] in _LABELS and len(words) == 1:
        return False
    return True


def _looks_like_person_name(line: str) -> bool:
    """Title-case 1–5 word personal name (rejects sentence-like OCR lines)."""
    if not _looks_like_name(line):
        return False
    words = re.split(r"\s+", line.strip())
    if not (1 <= len(words) <= 5):
        return False
    return all(re.match(r"^[A-Z][A-Za-z.'-]*$", w) for w in words)


_ADDRESS_HINTS = re.compile(
    r"(?i)(floor|house|nagar|delhi|road|street|colony|village|post|district|"
    r"state|block|sector|apartment|flat|marg|chowk|manzil|jamia|batla|near|"
    r"area|city|pin|tehsil|taluk|mandal)",
)


def _address_line(line: str, name: str | None = None) -> bool:
    t = line.strip()
    if not t:
        return False
    if re.match(r"(?i)^(address|issue date|date of birth|dob|vid|enrolment|government|unique|aadhaar|uidai|india|to\b|this\b)", t):
        return False
    if re.search(r"(?i)\b(male|female|transgender)\b", t):
        return False
    if re.search(r"\b[SDWC]\s*/\s*O\b", t, re.I):
        return False
    if name and t.lower() == name.lower():
        return False
    if re.fullmatch(r"\d{10}", t) or re.fullmatch(r"\d{4}\s?\d{4}\s?\d{4}", t):
        return False
    if re.search(r"[\u0900-\u097F]", t):
        return False
    return bool(_ADDRESS_HINTS.search(t) or re.search(r"\d", t))


def _clean_address(text: str) -> str:
    text = re.sub(r"(?i)\b(address|hindi|हिन्दी|पता|meri pehchan|मेरी पहचान)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" ,-")
    return text


def _extract_aadhaar_name_address(raw: str):
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    name = None
    # An explicitly labelled "Name: …" line wins.
    lab = re.search(r"(?im)^\s*name\s*[:\-]\s*(.+?)\s*$", raw)
    if lab:
        cand = re.sub(r"\s+", " ", lab.group(1)).strip()
        if _looks_like_person_name(cand):
            name = _normalise_name(cand)

    care_idx = next(
        (i for i, ln in enumerate(lines) if re.search(r"\b[SDWC]\s*/\s*O\b", ln, re.I)),
        None,
    )
    # Usually the name sits directly above the S/O line.
    if not name and care_idx is not None:
        for i in range(care_idx - 1, max(-1, care_idx - 4), -1):
            if _looks_like_person_name(lines[i]):
                name = _normalise_name(lines[i])
                break
    # Otherwise the first person-name line near the top (after the headers).
    if not name:
        for ln in lines[:18]:
            if _looks_like_person_name(ln):
                name = _normalise_name(ln)
                break
    # Final fallback: near the DOB line.
    if not name:
        dob_idx = next(
            (i for i, ln in enumerate(lines)
             if re.search(r"DOB|DATE\s*OF\s*BIRTH|JANM|जन्म", ln, re.I)),
            None,
        )
        if dob_idx is not None:
            for i in range(max(0, dob_idx - 3), dob_idx):
                if _looks_like_person_name(lines[i]):
                    name = _normalise_name(lines[i])
                    break

    # Address: the block ending at the first PIN code, starting after S/O.
    address = None
    pin_idx = next(
        (i for i, ln in enumerate(lines) if re.search(r"\b[1-9]\d{5}(?!\d)", ln)),
        None,
    )
    if pin_idx is not None:
        start = care_idx + 1 if care_idx is not None and care_idx < pin_idx else max(0, pin_idx - 7)
        block = [ln for ln in lines[start:pin_idx + 1] if _address_line(ln, name)]
        if block:
            address = _clean_address(" ".join(block))
    # Labelled "Address:" fallback.
    if not address:
        al = re.search(r"(?im)^\s*address\s*[:\-]\s*(.+?)(?:\n\s*\n|$)", raw, re.S)
        if al:
            addr = _clean_address(re.sub(r"\s+", " ", al.group(1)).strip())
            if len(addr) >= 6:
                address = addr
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
    {"key": "columns", "type": "columns", "label": "Register matches the template columns"},
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
        # Findings carry only the reasons a check failed — passed checks are in
        # `results`, so the UI shows exactly why an upload was rejected.
        if not passed:
            findings.append(f"{label}: {detail}" if detail else label)
    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    accuracy = round((passed_count / total) * 100, 2) if total else 100.0
    return accuracy, results, findings
