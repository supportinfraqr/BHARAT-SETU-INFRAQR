"""Statutory evidence validation & compliance audit scoring.

"Accuracy" is a real score: the file is OCR'd through the shared document-OCR
service and the recognised text is keyword-checked for the statutory document
type. When the OCR service is unreachable the score degrades gracefully to
file-integrity checks (magic-byte signature versus the declared type, extension
agreement and size bounds) rather than a fabricated random number. Findings are
returned so the contractor sees exactly why a document was accepted or flagged.
"""

from decimal import Decimal

from django.utils import timezone

from bss_core.models import (ComplianceMaster, ComplianceReport,
                             ComplianceReportItem)

SIGNATURES = [
    (b"%PDF", "application/pdf", ".pdf"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
]

MIN_BYTES = 8 * 1024
MAX_BYTES = 10 * 1024 * 1024

STATUTORY_KEYWORDS = (
    "pf", "epf", "provident", "esi", "esic", "wage", "salary", "attendance",
    "muster", "challan", "register", "form", "contract labour", "minimum wage",
    "gratuity", "bonus", "professional tax", "labour welfare", "employee",
)


def _read_head(file_obj, size=16):
    try:
        file_obj.seek(0)
    except (AttributeError, OSError):
        return b""
    head = file_obj.read(size) or b""
    try:
        file_obj.seek(0)
    except (AttributeError, OSError):
        pass
    return head


def validate_evidence(file_obj, doc_type="", ocr_text=None):
    """Return ``(accuracy_percent, findings)`` for an uploaded evidence file."""
    findings = []
    accuracy = 100.0
    name = (getattr(file_obj, "name", "") or "").lower()
    declared = (getattr(file_obj, "content_type", "") or "").lower()
    size = getattr(file_obj, "size", 0) or 0
    head = _read_head(file_obj)

    matched = None
    for magic, mime, ext in SIGNATURES:
        if head.startswith(magic):
            matched = (mime, ext)
            break

    if not matched:
        accuracy -= 45
        findings.append("File signature is not a recognised PDF/JPEG/PNG header.")
    else:
        mime, ext = matched
        if declared and declared != mime:
            accuracy -= 20
            findings.append(
                f"Declared type {declared} does not match file contents ({mime}).")
        else:
            findings.append(f"File signature verified as {mime}.")
        if not name.endswith(ext) and not (ext == ".jpg" and name.endswith(".jpeg")):
            accuracy -= 10
            findings.append(f"File extension does not match contents ({ext} expected).")

    if size < MIN_BYTES:
        accuracy -= 25
        findings.append(
            f"File is very small ({size} bytes); it may be incomplete or unreadable.")
    elif size > MAX_BYTES:
        accuracy -= 25
        findings.append("File exceeds the 10 MB submission limit.")
    else:
        findings.append(f"File size {round(size / 1024)} KB is within the accepted range.")

    if ocr_text is None:
        findings.append("OCR service unavailable; validated file integrity only.")
    else:
        text = (ocr_text or "").strip()
        if len(text) < 20:
            accuracy -= 30
            findings.append("OCR could not read meaningful text from the document.")
        else:
            findings.append(f"OCR recognised {len(text)} characters of text.")
            if any(keyword in text.lower() for keyword in STATUTORY_KEYWORDS):
                findings.append("Recognised text contains statutory compliance keywords.")
            else:
                accuracy -= 15
                findings.append("Recognised text has no statutory compliance keywords.")

    accuracy = max(0.0, min(100.0, accuracy))
    return round(accuracy, 2), findings


def build_audit_report(contractor, *, employer="", site="", period="",
                       financial_year="", state="", submissions=None,
                       generated_registers=0):
    """Create a persisted :class:`ComplianceReport` scored against the compliance
    matrix. A matrix line scores its full weight when the contractor has at least
    one fully-validated (100% accuracy) evidence upload for the package, or a
    system-generated CLRA register batch is included in the submission."""
    submissions = list(submissions or [])
    validated = [
        s for s in submissions
        if s.status != "RETURNED" and float(s.ocr_accuracy or 0) >= 100
    ]
    # System-generated CLRA registers count as compliant evidence for the package.
    if generated_registers:
        validated = validated or [None]

    report = ComplianceReport.objects.create(
        employer=contractor,
        financial_year=(financial_year or "")[:12],
        period=(period or "")[:40],
        state=(state or "")[:60],
        site_name=(site or "")[:200],
        client_name=(employer or "")[:200],
        auditor=contractor,
        report_date=timezone.localdate(),
    )
    report.unique_no = f"UN{report.id:06d}"

    total = Decimal("0")
    achieved = Decimal("0")
    masters = ComplianceMaster.objects.filter(is_active=True).order_by("act", "form_number")
    for master in masters:
        max_score = Decimal(str(master.max_score or 0))
        got = max_score if validated else Decimal("0")
        total += max_score
        achieved += got
        ComplianceReportItem.objects.create(
            report=report, master=master, act=master.act,
            form_number=master.form_number, nature=master.nature,
            max_score=max_score, achieved_score=got,
            status="Compliant" if got else "Not submitted",
            remarks=("Evidence validated." if got
                     else "No validated evidence submitted for this line."),
        )

    report.score = achieved
    report.score_pct = ((achieved / total * 100) if total else Decimal("0"))
    report.save(update_fields=["unique_no", "score", "score_pct"])
    return report
