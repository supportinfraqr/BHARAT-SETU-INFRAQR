"""Plan A "secure channel" onboarding — quarantine pipeline.

An authenticated employer submits historical worker/site/contractor data (XLSX,
same schema as admin bulk). The submission is held in quarantine and moves
through: SUBMITTED → admin review → QUARANTINED → automated CLEANED → staff
STRUCTURED → employer APPROVED → MIGRATED (live accounts + intro SMS).

Nothing is written to live tables (User/profiles/identities/bindings) until the
final MIGRATED step.
"""

# ruff: noqa: F401,F403
import hashlib
import io
import os
import re

from .common import *  # noqa: F401,F403
from .admin_bulk import (ENTITIES, _already_registered_message, _as_date, _conflict,
                         _digits, _find_user_by_mobile,
                         _mobile, _process_contractors, _process_employers,
                         _process_relations, _process_workers)

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$")
PAN_RE = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")

# entity_type → admin_bulk ENTITIES key + the migration processor
ENTITY_MAP = {
    "EMPLOYER": ("employers", _process_employers),
    "CONTRACTOR": ("contractors", _process_contractors),
    "WORKER": ("workers", _process_workers),
    "RELATION": ("relations", _process_relations),
}
MIGRATION_ORDER = ["EMPLOYER", "CONTRACTOR", "WORKER", "RELATION"]

# Employer onboarding asks for the phone number only — every other field is
# completed by the user after they sign in.
ONBOARDING_ENTITIES = {
    "employers": ("Employers", [("Mobile", "mobile")]),
    "workers": ("Workers", [("Mobile", "mobile")]),
    "contractors": ("Contractors", [("Mobile", "mobile")]),
}
_ONBOARDING_SHEET = {  # entity_type → (sheet title, columns)
    "EMPLOYER": ONBOARDING_ENTITIES["employers"],
    "WORKER": ONBOARDING_ENTITIES["workers"],
    "CONTRACTOR": ONBOARDING_ENTITIES["contractors"],
}


def _onboarding_password():
    return os.environ.get("BSS_ONBOARDING_PASSWORD") or "123456"


# ── serialization ────────────────────────────────────────────────────────────
def _batch_row(b):
    return {
        "id": b.id, "source": b.source, "state": b.state,
        "employer": payloads._org_name(b.employer) if b.employer_id else "",
        "employerId": b.employer_id,
        "submittedBy": payloads._party_name(b.submitted_by) if b.submitted_by_id else "",
        "fileName": b.file_name, "consentGiven": b.consent_given,
        "declaration": b.declaration or "",
        "counts": b.counts or {},
        "reviewNote": b.review_note, "employerReviewNote": b.employer_review_note,
        "reviewedAt": payloads._dts(b.reviewed_at), "employerReviewedAt": payloads._dts(b.employer_reviewed_at),
        "createdAt": payloads._dts(b.created_at),
    }


def _record_row(r):
    return {
        "id": r.id, "entityType": r.entity_type, "rowIndex": r.row_index,
        "data": r.clean_data or r.raw_data, "issues": r.issues or [],
        "status": r.status, "matchedType": r.matched_type, "matchedId": r.matched_id,
        "result": r.result or {},
    }


def _batch_detail(batch, include_records=True):
    data = _batch_row(batch)
    if include_records:
        data["records"] = [_record_row(r) for r in batch.records.all()[:2000]]
    return data


def _issue(field, level, message):
    return {"field": field, "level": level, "message": message}


def _has_error(issues):
    return any(i.get("level") == "error" for i in issues)


# ── parsing ──────────────────────────────────────────────────────────────────
def _sheet_rows(ws, columns):
    data = list(ws.iter_rows(values_only=True))
    if not data:
        return []
    file_header = [str(c or "").strip().lower().replace(" ", "") for c in data[0]]
    keys = [k for _, k in columns]
    index = {}
    for pos, (label, _key) in enumerate(columns):
        norm = label.lower().replace(" ", "")
        index[pos] = file_header.index(norm) if norm in file_header else pos
    out = []
    for values in data[1:]:
        if not values or not any(str(v or "").strip() for v in values):
            continue
        row = {}
        for pos, key in enumerate(keys):
            i = index.get(pos, pos)
            row[key] = values[i] if i < len(values) else None
        out.append(row)
    return out


def _parse_workbook(raw):
    """Return {entity_type: [row, ...]} for whichever onboarding sheets are present.

    Only Workers and Contractors — each sheet carries just the phone number."""
    from openpyxl import load_workbook
    try:
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Could not read the workbook: {exc}") from exc
    grouped = {}
    for etype, (title, columns) in _ONBOARDING_SHEET.items():
        if title in wb.sheetnames:
            rows = _sheet_rows(wb[title], columns)
            if rows:
                grouped[etype] = rows
    return grouped


# ── cleaning ─────────────────────────────────────────────────────────────────
def _clean_employer(r):
    clean = {k: (str(v).strip() if v is not None else "") for k, v in r.items()}
    clean["mobile"] = _mobile(r.get("mobile"))
    clean["cin"] = clean.get("cin", "").upper()
    clean["gstin"] = clean.get("gstin", "").upper()
    clean["pan"] = clean.get("pan", "").upper()
    issues = []
    if not clean["mobile"]:
        issues.append(_issue("mobile", "error", "Mobile is required."))
    elif len(_digits(clean["mobile"])) not in (10, 12):
        issues.append(_issue("mobile", "error", "Mobile must be 10 digits."))
    if clean["gstin"] and not GSTIN_RE.match(clean["gstin"]):
        issues.append(_issue("gstin", "error", "GSTIN format is invalid."))
    if clean["pan"] and not PAN_RE.match(clean["pan"]):
        issues.append(_issue("pan", "error", "PAN format is invalid (AAAAA9999A)."))
    return clean, issues


def _clean_contractor(r):
    clean, issues = _clean_employer(r)
    clean["clra_licence_no"] = clean.get("clra_licence_no", "").upper()
    return clean, issues


def _clean_worker(r):
    clean = {k: (str(v).strip() if v is not None else "") for k, v in r.items()}
    clean["mobile"] = _mobile(r.get("mobile"))
    clean["aadhaar"] = _digits(r.get("aadhaar"))
    clean["pan"] = clean.get("pan", "").upper()
    clean["uan"] = _digits(r.get("uan"))
    clean["esic"] = clean.get("esic", "").upper()
    issues = []
    if not clean["mobile"]:
        issues.append(_issue("mobile", "error", "Mobile is required."))
    elif len(_digits(clean["mobile"])) not in (10, 12):
        issues.append(_issue("mobile", "error", "Mobile must be 10 digits."))
    if clean["aadhaar"] and len(clean["aadhaar"]) != 12:
        issues.append(_issue("aadhaar", "error", "Aadhaar must be 12 digits."))
    if clean["pan"] and not PAN_RE.match(clean["pan"]):
        issues.append(_issue("pan", "error", "PAN format is invalid (AAAAA9999A)."))
    return clean, issues


def _clean_relation(r):
    clean = {k: (str(v).strip() if v is not None else "") for k, v in r.items()}
    clean["employer_mobile"] = _mobile(r.get("employer_mobile"))
    clean["contractor_mobile"] = _mobile(r.get("contractor_mobile"))
    clean["worker_mobile"] = _mobile(r.get("worker_mobile"))
    issues = []
    if not clean["employer_mobile"]:
        issues.append(_issue("employer_mobile", "error", "Employer mobile is required."))
    if not clean["contractor_mobile"]:
        issues.append(_issue("contractor_mobile", "error", "Contractor mobile is required."))
    return clean, issues


_CLEANERS = {
    "EMPLOYER": _clean_employer, "CONTRACTOR": _clean_contractor,
    "WORKER": _clean_worker, "RELATION": _clean_relation,
}


def clean_batch(batch):
    """Normalize + format-validate every record (no live writes) → CLEANED."""
    seen = {"EMPLOYER": set(), "CONTRACTOR": set(), "WORKER": set()}
    for rec in batch.records.all().order_by("entity_type", "row_index"):
        cleaner = _CLEANERS.get(rec.entity_type)
        if cleaner is None:
            continue
        clean, issues = cleaner(rec.raw_data or {})
        if rec.entity_type in seen:
            key_mobile = clean.get("mobile", "")
            if key_mobile and key_mobile in seen[rec.entity_type]:
                issues.append(_issue("mobile", "error", "Duplicate mobile within the submission."))
            elif key_mobile:
                seen[rec.entity_type].add(key_mobile)
        rec.clean_data = clean
        rec.issues = issues
        rec.status = "FLAGGED" if _has_error(issues) else "OK"
        rec.save(update_fields=["clean_data", "issues", "status", "updated_at"])
    _refresh_counts(batch, state="CLEANED")
    return batch


def _refresh_counts(batch, state=None):
    rows = list(batch.records.all())
    counts = {
        "total": len(rows),
        "ok": sum(1 for r in rows if r.status in ("OK", "MIGRATED")),
        "failed": sum(1 for r in rows if r.status in ("FLAGGED", "REJECTED")),
        "flagged": sum(1 for r in rows if r.status == "FLAGGED"),
        "rejected": sum(1 for r in rows if r.status == "REJECTED"),
        "migrated": sum(1 for r in rows if r.status == "MIGRATED"),
        "byEntity": {},
    }
    for r in rows:
        counts["byEntity"][r.entity_type] = counts["byEntity"].get(r.entity_type, 0) + 1
    batch.counts = counts
    fields = ["counts", "updated_at"]
    if state:
        batch.state = state
        fields.append("state")
    batch.save(update_fields=fields)
    return counts


# ── structuring ──────────────────────────────────────────────────────────────
def structure_batch(batch):
    """Resolve relations/sites against the batch itself + live data (plan only)."""
    records = list(batch.records.all())
    by_mobile = {}
    for rec in records:
        if rec.entity_type in ("EMPLOYER", "CONTRACTOR", "WORKER"):
            mobile = (rec.clean_data or {}).get("mobile")
            if mobile:
                by_mobile[mobile] = rec
    for rec in records:
        if rec.entity_type != "RELATION":
            # Block a phone that already has a live account of the same role.
            mobile = (rec.clean_data or {}).get("mobile")
            live = _find_user_by_mobile(mobile) if mobile else None
            if live is not None:
                rec.matched_type = "USER"
                rec.matched_id = live.id
                fields = ["matched_type", "matched_id", "updated_at"]
                if live.role == rec.entity_type.lower():
                    note = _already_registered_message(live)
                    issues = [i for i in (rec.issues or [])
                              if not str(i.get("message", "")).startswith("Account already exists")]
                    issues.append(_issue("mobile", "error", note))
                    rec.issues = issues
                    rec.status = "FLAGGED"
                    fields += ["issues", "status"]
                rec.save(update_fields=fields)
            continue
        data = rec.clean_data or {}
        issues = list(rec.issues or [])
        plan = {}
        for role, etype in (("employer", "EMPLOYER"), ("contractor", "CONTRACTOR"), ("worker", "WORKER")):
            mobile = data.get(f"{role}_mobile")
            if not mobile:
                continue
            if mobile in by_mobile and by_mobile[mobile].entity_type == etype:
                plan[role] = {"source": "batch", "rowIndex": by_mobile[mobile].row_index}
            else:
                live = _find_user_by_mobile(mobile)
                if live is not None and live.role == etype.lower():
                    plan[role] = {"source": "live", "userId": live.id}
                elif live is not None:
                    issues.append(_issue(f"{role}_mobile", "error", f"{mobile} is a {live.role}, not a {etype.lower()}."))
                else:
                    issues.append(_issue(f"{role}_mobile", "error", f"No {etype.lower()} found for mobile {mobile} (in this submission or BSS)."))
        plan["site"] = {"name": data.get("site_name", ""), "bssId": data.get("bss_site_id", "")}
        plan["designation"] = data.get("designation", "")
        rec.clean_data = {**data, "plan": plan}
        rec.issues = issues
        rec.status = "FLAGGED" if _has_error(issues) else "OK"
        rec.save(update_fields=["clean_data", "issues", "status", "updated_at"])
    _refresh_counts(batch, state="STRUCTURED")
    return batch


# ── migration (live writes) ──────────────────────────────────────────────────
def _send_intro_sms(mobile, name):
    from .. import sms_client
    from bss_core.models import SmsOtp
    otp = SmsOtp.objects.create(mobile=mobile, purpose="INTRO", otp_hash=make_password(""),
                                expires_at=timezone.now())
    try:
        result = sms_client.send_intro(mobile, name=name)
    except Exception as exc:  # noqa: BLE001 — intro SMS must never block migration
        result = {"ok": False, "error": str(exc)}
    otp.delivery_channel = "sms" if result.get("ok") else "none"
    otp.delivery_status = "sent" if result.get("ok") else "failed"
    otp.delivery_error = (result.get("error") or result.get("body") or "")[:1000]
    otp.delivered_at = timezone.now() if result.get("ok") else None
    otp.save(update_fields=["delivery_channel", "delivery_status", "delivery_error", "delivered_at"])
    return result


def _send_account_created(mobile, name):
    """Send the WhatsApp 'bharat_shram_setu_account_created' template (no vars)."""
    from .. import whatsapp_client
    from bss_core.models import SmsOtp
    otp = SmsOtp.objects.create(mobile=mobile, purpose="INTRO", otp_hash=make_password(""),
                                expires_at=timezone.now())
    try:
        result = whatsapp_client.send_account_created(mobile)
    except Exception as exc:  # noqa: BLE001 — messaging must never block migration
        result = {"ok": False, "error": str(exc)}
    otp.delivery_channel = "whatsapp" if result.get("ok") else "none"
    otp.delivery_status = "sent" if result.get("ok") else "failed"
    otp.delivery_error = (result.get("error") or result.get("body") or "")[:1000]
    otp.delivered_at = timezone.now() if result.get("ok") else None
    otp.save(update_fields=["delivery_channel", "delivery_status", "delivery_error", "delivered_at"])
    return result


def _bss_id_of(user):
    """The created entity's BSS ID: worker id, contractor code or employer code."""
    role = getattr(user, "role", "")
    if role == "worker":
        wi = getattr(user, "worker_identity", None)
        return getattr(wi, "bss_worker_id", "") or ""
    prof = getattr(user, "contractor_profile", None) or getattr(user, "employer_profile", None)
    if role == "contractor":
        return getattr(prof, "contractor_code", "") or ""
    if role == "employer":
        return getattr(prof, "employer_code", "") or ""
    return ""


def migrate_batch(batch):
    """Create live accounts + bindings from the structured batch, then intro SMS."""
    if batch.state != "APPROVED":
        raise ValueError(f"Batch must be APPROVED before migration (currently {batch.state}).")
    migrated = 0
    for etype in MIGRATION_ORDER:
        records = list(batch.records.filter(entity_type=etype, status="OK").order_by("row_index"))
        if not records:
            continue
        rows = [rec.clean_data or {} for rec in records]
        processor = ENTITY_MAP[etype][1]
        results = processor(rows)
        for rec, res in zip(records, results):
            rec.result = res
            if res.get("status") == "ok":
                rec.status = "MIGRATED"
                migrated += 1
                # Capture the created account's BSS ID for the submission view.
                mobile = (rec.clean_data or {}).get("mobile")
                created = _find_user_by_mobile(mobile) if mobile else None
                if created is not None:
                    rec.result = {**res, "bssId": _bss_id_of(created)}
            else:
                rec.status = "REJECTED"
                rec.issues = list(rec.issues or []) + [_issue("migrate", "error", res.get("detail", "migration failed"))]
            rec.save(update_fields=["result", "status", "issues", "updated_at"])
    # WhatsApp "account created" template to every newly created account.
    for rec in batch.records.filter(
            entity_type__in=["EMPLOYER", "CONTRACTOR", "WORKER"], status="MIGRATED"):
        data = rec.clean_data or {}
        mobile = data.get("mobile")
        if mobile:
            _send_account_created(mobile, data.get("name", ""))
    _refresh_counts(batch, state="MIGRATED")
    from .admin_console import log_audit
    if batch.submitted_by_id:
        log_audit(batch.submitted_by, "UPDATE", "onboarding_batch", batch.id,
                  after={"summary": f"Onboarding batch #{batch.id} migrated ({migrated} record(s))"})
    return batch


# ── endpoints ────────────────────────────────────────────────────────────────
def _visible_batch(user, batch_id):
    from bss_core.models import OnboardingBatch
    batch = OnboardingBatch.objects.filter(pk=batch_id).first()
    if batch is None:
        return None
    if user.role in ("bss_admin", "admin", "bss_staff", "government"):
        return batch
    if user.role == "employer" and batch.employer_id == user.id:
        return batch
    return None


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_onboarding_submit(request):
    """Employer uploads historical data (secure, consent-backed) → quarantine batch."""
    from django.core.files.base import ContentFile
    from bss_core.models import OnboardingBatch, OnboardingRecord

    from .admin_console import log_audit

    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    upload = request.FILES.get("file") or request.FILES.get("master")
    if upload is None:
        return Response({"error": "Choose the data file (.xlsx)."}, status=status.HTTP_400_BAD_REQUEST)
    if str(request.data.get("consent") or "").strip().lower() not in ("1", "true", "yes", "on"):
        return Response({"error": "The data-sharing consent must be accepted before submitting."},
                        status=status.HTTP_400_BAD_REQUEST)
    raw = upload.read()
    try:
        grouped = _parse_workbook(raw)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    # Employer onboarding carries exactly two entities: workers + contractors
    # (onboarding employer accounts is a BSS-admin function).
    grouped = {k: v for k, v in grouped.items() if k in ("WORKER", "CONTRACTOR")}
    if not grouped:
        return Response({"error": "No Workers or Contractors sheet found in the file."},
                        status=status.HTTP_400_BAD_REQUEST)

    batch = OnboardingBatch(
        source="EMPLOYER_UPLOAD", employer=user, submitted_by=user, state="SUBMITTED",
        file_name=os.path.basename(upload.name or "onboarding.xlsx"),
        file_checksum=hashlib.sha256(raw).hexdigest(),
        consent_given=True, consent_at=timezone.now(), consent_version="v1",
        declaration=str(request.data.get("declaration") or "")[:2000])
    batch.original_file.save(batch.file_name or "onboarding.xlsx", ContentFile(raw), save=False)
    batch.save()

    order = ["EMPLOYER", "WORKER", "CONTRACTOR"]
    for etype in order:
        for idx, row in enumerate(grouped.get(etype, [])):
            OnboardingRecord.objects.create(batch=batch, entity_type=etype, row_index=idx, raw_data=row)
    _refresh_counts(batch)
    log_audit(user, "CREATE", "onboarding_batch", batch.id,
              after={"summary": f"Onboarding submission from {payloads._org_name(user)} ({batch.counts.get('total', 0)} rows)"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_201_CREATED)


def _build_onboarding_workbook(entities):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    wb = Workbook()
    wb.remove(wb.active)
    fill = PatternFill("solid", fgColor="0A192F")
    for ent in entities:
        title, columns = ONBOARDING_ENTITIES[ent]
        ws = wb.create_sheet(title)
        for col, (label, _key) in enumerate(columns, start=1):
            cell = ws.cell(row=1, column=col, value=label)
            cell.fill = fill
            cell.font = Font(bold=True, color="FFFFFF")
            ws.column_dimensions[cell.column_letter].width = max(14, len(label) + 4)
    return wb


def _workbook_response(entities, requested=""):
    from django.http import HttpResponse
    wb = _build_onboarding_workbook(entities)
    out = io.BytesIO()
    wb.save(out)
    resp = HttpResponse(out.getvalue(),
                        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    name = f"bss-onboarding-{requested}.xlsx" if requested else "bss-onboarding-template.xlsx"
    resp["Content-Disposition"] = f'attachment; filename="{name}"'
    return resp


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_onboarding_template(request):
    """Download the onboarding workbook template.

    An employer uploads historical **Workers** and **Contractors** only
    (onboarding employer accounts is a BSS-admin function).
    ``?entity=workers|contractors`` returns a single-sheet workbook.
    """
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    allowed = ("workers", "contractors")
    requested = str(request.query_params.get("entity") or "").strip().lower()
    if requested:
        if requested not in allowed:
            return Response({"error": "entity must be workers or contractors."},
                            status=status.HTTP_400_BAD_REQUEST)
        entities = [requested]
    else:
        entities = list(allowed)
    return _workbook_response(entities, requested)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_template(request):
    """Admin downloads an onboarding template (Employers / Workers / Contractors)."""
    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    allowed = ("employers", "workers", "contractors")
    requested = str(request.query_params.get("entity") or "").strip().lower()
    if requested:
        if requested not in allowed:
            return Response({"error": "entity must be employers, workers or contractors."},
                            status=status.HTTP_400_BAD_REQUEST)
        entities = [requested]
    else:
        entities = list(allowed)
    return _workbook_response(entities, requested)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_onboarding_batches(request):
    from bss_core.models import OnboardingBatch
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    qs = OnboardingBatch.objects.filter(employer=request.user).order_by("-id")[:100]
    return Response({"data": [_batch_row(b) for b in qs]}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_onboarding_review(request, batch_id):
    """Employer restricted-view approval/rejection of a STRUCTURED batch."""
    from .admin_console import log_audit
    batch = _visible_batch(request.user, batch_id)
    if batch is None or batch.employer_id != request.user.id:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    decision = str((request.data or {}).get("decision") or "").strip().lower()
    note = str((request.data or {}).get("note") or "")[:2000]
    if batch.state != "STRUCTURED":
        return Response({"error": f"Batch is {batch.state}; employer approval needs STRUCTURED."},
                        status=status.HTTP_400_BAD_REQUEST)
    batch.employer_reviewed_by = request.user
    batch.employer_reviewed_at = timezone.now()
    batch.employer_review_note = note
    if decision == "approve":
        batch.state = "APPROVED"
    elif decision == "reject":
        batch.state = "REJECTED"
    else:
        return Response({"error": "decision must be approve or reject."}, status=status.HTTP_400_BAD_REQUEST)
    batch.save(update_fields=["state", "employer_reviewed_by", "employer_reviewed_at", "employer_review_note", "updated_at"])
    if decision == "approve":
        try:
            migrate_batch(batch)
        except Exception as exc:  # noqa: BLE001
            batch.state = "FAILED"
            batch.save(update_fields=["state", "updated_at"])
            return Response({"error": f"Employer approved, but migration failed: {exc}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    log_audit(request.user, "UPDATE", "onboarding_batch", batch.id,
              after={"summary": f"Employer {decision}d onboarding batch #{batch.id}"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_batches(request):
    from bss_core.models import OnboardingBatch
    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    qs = OnboardingBatch.objects.all()
    state_filter = (request.query_params.get("state") or "").strip().upper()
    if state_filter:
        qs = qs.filter(state=state_filter)
    return Response({"data": [_batch_row(b) for b in qs.order_by("-id")[:200]]}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def onboarding_batch_detail(request, batch_id):
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_review(request, batch_id):
    """Admin review (step 2): approve → quarantine (auto-clean), or reject."""
    from .admin_console import log_audit
    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    decision = str((request.data or {}).get("decision") or "").strip().lower()
    batch.reviewed_by = request.user
    batch.reviewed_at = timezone.now()
    batch.review_note = str((request.data or {}).get("note") or "")[:2000]
    if decision == "approve":
        batch.state = "QUARANTINED"
        batch.save(update_fields=["state", "reviewed_by", "reviewed_at", "review_note", "updated_at"])
        clean_batch(batch)  # automated cleaning immediately after entering quarantine
    elif decision == "reject":
        batch.state = "REJECTED"
        batch.save(update_fields=["state", "reviewed_by", "reviewed_at", "review_note", "updated_at"])
    else:
        return Response({"error": "decision must be approve or reject."}, status=status.HTTP_400_BAD_REQUEST)
    log_audit(request.user, "UPDATE", "onboarding_batch", batch.id,
              after={"summary": f"Admin {decision}d onboarding batch #{batch.id}"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_import(request):
    """Admin imports a workbook directly → a new, unique quarantine batch.

    Each upload is its own submission with its own records, so successes and
    failures are reported per submission."""
    from django.core.files.base import ContentFile
    from bss_core.models import OnboardingBatch, OnboardingRecord

    from .admin_console import log_audit

    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    upload = request.FILES.get("file") or request.FILES.get("master")
    if upload is None:
        return Response({"error": "Choose the data file (.xlsx)."}, status=status.HTTP_400_BAD_REQUEST)
    raw = upload.read()
    try:
        grouped = _parse_workbook(raw)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    grouped = {k: v for k, v in grouped.items() if k in ("EMPLOYER", "WORKER", "CONTRACTOR")}
    if not grouped:
        return Response({"error": "No Employers, Workers or Contractors sheet found in the file."},
                        status=status.HTTP_400_BAD_REQUEST)
    batch = OnboardingBatch(
        source="ADMIN_UPLOAD", employer=None, submitted_by=request.user, state="SUBMITTED",
        file_name=os.path.basename(upload.name or "onboarding.xlsx"),
        file_checksum=hashlib.sha256(raw).hexdigest(),
        consent_given=True, consent_at=timezone.now(), consent_version="admin",
        declaration=str(request.data.get("declaration") or "")[:2000])
    batch.original_file.save(batch.file_name or "onboarding.xlsx", ContentFile(raw), save=False)
    batch.save()
    for etype in ("EMPLOYER", "WORKER", "CONTRACTOR"):
        for idx, row in enumerate(grouped.get(etype, [])):
            OnboardingRecord.objects.create(batch=batch, entity_type=etype, row_index=idx, raw_data=row)
    _refresh_counts(batch)
    log_audit(request.user, "CREATE", "onboarding_batch", batch.id,
              after={"summary": f"Admin onboarding import #{batch.id} ({batch.counts.get('total', 0)} rows)"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_approve(request, batch_id):
    """Admin approval — for admin-imported batches (there is no employer).

    Marks the structured batch APPROVED so the pipeline can migrate it."""
    from .admin_console import log_audit

    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    if batch.state not in ("STRUCTURED", "CLEANED"):
        return Response({"error": f"Batch is {batch.state}; approval needs STRUCTURED."},
                        status=status.HTTP_400_BAD_REQUEST)
    batch.employer_reviewed_by = request.user
    batch.employer_reviewed_at = timezone.now()
    batch.employer_review_note = str((request.data or {}).get("note") or "")[:2000]
    batch.state = "APPROVED"
    batch.save(update_fields=["state", "employer_reviewed_by", "employer_reviewed_at",
                              "employer_review_note", "updated_at"])
    log_audit(request.user, "UPDATE", "onboarding_batch", batch.id,
              after={"summary": f"Admin approved onboarding batch #{batch.id}"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_clean(request, batch_id):
    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    clean_batch(batch)
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_structure(request, batch_id):
    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    if batch.state not in ("CLEANED", "STRUCTURED"):
        return Response({"error": f"Batch is {batch.state}; structure needs CLEANED."},
                        status=status.HTTP_400_BAD_REQUEST)
    structure_batch(batch)
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_migrate(request, batch_id):
    if request.user.role not in ("bss_admin", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    supplied = str(request.data.get("password") or request.query_params.get("password") or "")
    if supplied != _onboarding_password():
        return Response({"error": "Invalid onboarding password."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    # Final step: run the onboarding straight from a structured batch.
    if batch.state in ("CLEANED", "STRUCTURED"):
        batch.state = "APPROVED"
        batch.save(update_fields=["state", "updated_at"])
    try:
        migrate_batch(batch)
    except Exception as exc:  # noqa: BLE001
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_onboarding_edit_record(request, batch_id, record_id):
    """Let the admin correct a cleaned record (e.g. a phone number) before the run.

    Editing is allowed while the batch is SUBMITTED / CLEANED / STRUCTURED —
    not once it has been migrated."""
    from bss_core.models import OnboardingRecord

    from .admin_console import log_audit

    if request.user.role not in ("bss_admin", "admin", "bss_staff"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    batch = _visible_batch(request.user, batch_id)
    if batch is None:
        return Response({"error": "Batch not found."}, status=status.HTTP_404_NOT_FOUND)
    if batch.state not in ("SUBMITTED", "CLEANED", "STRUCTURED"):
        return Response({"error": f"Batch is {batch.state}; editing is not allowed."},
                        status=status.HTTP_400_BAD_REQUEST)
    rec = OnboardingRecord.objects.filter(batch=batch, id=record_id).first()
    if rec is None:
        return Response({"error": "Record not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    incoming = body.get("data") if isinstance(body.get("data"), dict) else {}
    data = dict(rec.clean_data or rec.raw_data or {})
    for key, value in incoming.items():
        if key == "plan":
            continue
        data[key] = "" if value is None else str(value).strip()
    cleaner = _CLEANERS.get(rec.entity_type)
    if cleaner is not None:
        clean, issues = cleaner(data)
    else:
        clean, issues = data, []
    rec.clean_data = clean
    rec.issues = issues
    rec.status = "FLAGGED" if _has_error(issues) else "OK"
    rec.save(update_fields=["clean_data", "issues", "status", "updated_at"])
    # Keep the structure plan in step with the corrected data.
    if batch.state == "STRUCTURED":
        structure_batch(batch)
    else:
        _refresh_counts(batch)
    log_audit(request.user, "UPDATE", "onboarding_record", rec.id,
              after={"summary": f"Edited onboarding batch #{batch.id} record {rec.id}"})
    return Response({"data": _batch_detail(batch)}, status=status.HTTP_200_OK)


# ── worker onboarding wizard (OTP → Consent → MPIN → Integrations) ───────────
def _worker_onboarding_payload(user):
    from bss_core.models import (WorkerBanking, WorkerIdentity, WorkerOther,
                                 WorkerSocialSecurity)
    other = WorkerOther.objects.filter(user=user).first()
    cred = _mobile_credential_for(user)
    ident = WorkerIdentity.objects.filter(user=user).first()
    ss = WorkerSocialSecurity.objects.filter(user=user).first()
    bank = WorkerBanking.objects.filter(user=user).first()
    integrations = {
        "aadhaar": bool(ident and ident.aadhaar),
        "pan": bool(ident and ident.pan),
        "uan": bool(ss and ss.epfo_uan),
        "esic": bool(ss and ss.esic_ip_number),
        "bank": bool(bank and getattr(bank, "bank_verification_status", "")),
    }
    consent = bool(other and (other.consent_registration or other.consent_date))
    mpin = bool(cred and cred.mpin_hash)
    any_integration = any(integrations.values())
    return {
        "steps": {"consent": consent, "mpin": mpin, "integrations": any_integration},
        "integrations": integrations,
        # The gateway steps are consent + MPIN; integrations are a nudge.
        "complete": consent and mpin,
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_onboarding_status(request):
    user = request.user
    if user.role != "worker":
        return Response({"error": "Workers only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"data": _worker_onboarding_payload(user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_onboarding_consent(request):
    user = request.user
    if user.role != "worker":
        return Response({"error": "Workers only."}, status=status.HTTP_403_FORBIDDEN)
    _record_registration_consent(user, source="Onboarding Consent (BSS App)",
                                 registered_by="Worker Onboarding Wizard")
    return Response({"data": _worker_onboarding_payload(user)}, status=status.HTTP_200_OK)


__all__ = [
    "employer_onboarding_submit", "employer_onboarding_batches", "employer_onboarding_review",
    "employer_onboarding_template",
    "admin_onboarding_batches", "admin_onboarding_review", "admin_onboarding_clean",
    "admin_onboarding_structure", "admin_onboarding_migrate", "onboarding_batch_detail",
    "admin_onboarding_import", "admin_onboarding_approve", "admin_onboarding_edit_record",
    "admin_onboarding_template",
    "worker_onboarding_status", "worker_onboarding_consent",
    "clean_batch", "structure_batch", "migrate_batch",
]
