"""Payroll imports: one-time earnings/deductions and bulk salary revisions.

Port of ``FINAL/legacy_payroll/controller/payroll/payrollImport.js`` (routes of
``router/payrollImportRouter.js`` under ``import/...``; HR only). Uploads arrive as
multipart field ``file`` (``request.FILES["file"]``) and are validated with
``services.files.validate_upload`` (legacy multer filter: same MIME list, 10 MB).
"""

import math
import uuid
from datetime import datetime, timezone

from django.db import transaction
from django.db.models import F

from ..context import PayrollError, payroll_view, send_response
from ..services.audit_log import log_payroll_action
from ..services.files import validate_upload
from ..services.jsmath import UNDEFINED, is_integer, is_nullish, js_trim, js_str, js_truthy, to_number
from ..services.loan_helper import js_date, js_iso, js_json
from ..services.one_time_import_helper import summarize_rows, validate_one_time_import_rows
from ..services.parse_payroll_import_file import (map_import_row, map_salary_revision_row,
                                                  parse_payroll_import_file)
from ..services.salary_revision_import_helper import (apply_salary_revision_import,
                                                      summarize_rows as summarize_revision_rows,
                                                      validate_salary_revision_rows)

PAYROLL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def get_month_index(month_name):
    return PAYROLL_MONTHS.index(month_name) if month_name in PAYROLL_MONTHS else -1


def normalize_month_input(month_value=UNDEFINED):
    if is_nullish(month_value):
        return None
    raw = js_trim(js_str(month_value))
    if not raw:
        return None
    for m in PAYROLL_MONTHS:
        if m.lower() == raw.lower():
            return m
    n = to_number(raw)
    if is_integer(n) and 1 <= n <= 12:
        return PAYROLL_MONTHS[int(n) - 1]
    return None


def normalize_year_input(year_value=UNDEFINED):
    year = to_number(year_value)
    if not is_integer(year) or year < 1900:
        return None
    return int(year)


# ------------------------------------------------------------------ Mongoose-like row casting


def _num_or_none(v):
    """Mongoose Number cast; values it could not cast (NaN / text) are stored as null
    (legacy threw a validation error and the whole preview failed with 500)."""
    if v is None or v is UNDEFINED:
        return v
    if isinstance(v, bool):
        return 1 if v else 0
    n = to_number(v)
    return n if math.isfinite(n) else None


def _date_or_none(v):
    if v is None or v is UNDEFINED:
        return v
    if isinstance(v, datetime):
        return js_iso(v)
    if isinstance(v, str) and js_trim(v) == "":
        return None
    d = js_date(v)
    return js_iso(d) if d is not None else None


def cast_one_time_row(row):
    from ..models.payroll_one_time_import import ROW, new_row

    values = {k: row[k] for k in ROW.fields if k in row}
    if "amount" in values:
        values["amount"] = _num_or_none(values["amount"])
    return js_json(new_row(**values))


_REV_NUMBER_FIELDS = ("rowNumber", "baseSalary", "grossSalary", "grossSalaryInput", "ctcInput",
                      "incrementAmount", "incrementPercentage", "arrearsAmount")


def cast_revision_row(row):
    from ..models.payroll_salary_revision_import import ROW, new_row

    values = {k: row[k] for k in ROW.fields if k in row and row[k] is not UNDEFINED}
    for key in _REV_NUMBER_FIELDS:
        if key in values:
            values[key] = _num_or_none(values[key])
    for key in ("effectiveFrom", "arrearsFromDate"):
        if key in values:
            values[key] = _date_or_none(values[key])
    flags = values.get("statutoryFlags")
    if isinstance(flags, dict) and not flags:
        values.pop("statutoryFlags")  # Mongoose minimize
    for sal in ("oldSalary", "newSalary"):
        if isinstance(values.get(sal), dict):
            values[sal] = {k: v for k, v in values[sal].items()
                           if k in ROW.fields[sal].fields}
    out = js_json(new_row(**values))
    if isinstance(out.get("statutoryFlags"), dict) and not out["statutoryFlags"]:
        out.pop("statutoryFlags")
    return out


def _employees(org):
    from ..models import PayrollEmployee

    active = [e.to_dict() for e in PayrollEmployee.objects.filter(org=org, status="Active")
              .order_by("created_at", "id")]
    inactive = [e.to_dict() for e in PayrollEmployee.objects.filter(
        org=org, status__in=["Inactive", "Probation"]).order_by("created_at", "id")]
    return active, inactive


def _salary_components(org):
    from ..models import SalaryCompensation

    return [c.to_dict() for c in SalaryCompensation.objects.filter(org=org).order_by("created_at", "id")]


def _uploaded(ctx):
    upload = ctx.request.FILES.get("file")
    if upload is None:
        raise PayrollError("CSV or Excel file is required", 400)
    validate_upload(upload)
    return upload


def _parse(upload):
    try:
        return parse_payroll_import_file(upload)
    except ValueError as err:
        raise PayrollError(str(err), 500)


# ------------------------------------------------------------------ one-time


@payroll_view(["POST"])
def preview_one_time_earnings_deductions(ctx):
    from ..models import PayrollOneTimeImport, PayrollRun

    org = ctx.require_org()
    upload = _uploaded(ctx)
    body = ctx.body
    month = normalize_month_input(body.get("month", UNDEFINED))
    year = normalize_year_input(body.get("year", UNDEFINED))
    if not month or get_month_index(month) == -1:
        raise PayrollError("Valid month is required (Jan, Feb, ... or 1-12)", 400)
    if not year:
        raise PayrollError("Valid year is required", 400)
    parsed = _parse(upload)
    if not parsed:
        raise PayrollError("No rows found in uploaded file", 400)
    mapped = [map_import_row(row, i + 1) for i, row in enumerate(parsed)]
    active, inactive = _employees(org)
    validated = validate_one_time_import_rows(mapped, active, _salary_components(org), inactive)
    summary = summarize_rows(validated)
    if not summary["validRows"]:
        raise PayrollError("No valid rows found in uploaded file", 400,
                           data=js_json({"summary": summary, "preview": validated}))
    draft = PayrollOneTimeImport.objects.create(
        org=org, month=month, year=year, import_batch_id=str(uuid.uuid4()),
        file_name=upload.name or "import.csv", status="draft", uploaded_by=ctx.actor_id,
        rows=[cast_one_time_row(r) for r in validated], summary=summary)
    valid_ids = [r["employeeId"] for r in validated if r["valid"]]
    paid_conflict = PayrollRun.objects.filter(org=org, month=month, year=year, pay_status="paid",
                                              employee_id__in=valid_ids).exists()
    if paid_conflict:
        warning = ("Some employees already have paid payroll for this period. Re-import may "
                   "require re-processing payroll.")
    elif summary["invalidRows"] > 0:
        warning = (f"{summary['validRows']} valid row(s) ready to confirm; {summary['invalidRows']} "
                   "row(s) have errors and will be skipped.")
    else:
        warning = None
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=draft.pk, payroll_details={"month": month, "year": year},
                       remarks=f"One-time import preview {draft.import_batch_id} "
                               f"({summary['validRows']}/{summary['totalRows']} valid)")
    return send_response(200, True, "One-time components import preview generated successfully",
                         js_json({"importBatchId": draft.import_batch_id, "month": month,
                                  "year": year, "fileName": draft.file_name, "summary": summary,
                                  "warning": warning, "preview": validated}))


@payroll_view(["POST"])
def confirm_one_time_earnings_deductions(ctx):
    from ..models import PayrollOneTimeImport

    org = ctx.require_org()
    batch_id = ctx.body.get("importBatchId")
    if not js_truthy(batch_id):
        raise PayrollError("importBatchId is required", 400)
    with transaction.atomic():
        draft = (PayrollOneTimeImport.objects.select_for_update()
                 .filter(org=org, import_batch_id=js_str(batch_id), status="draft").first())
        if draft is None:
            raise PayrollError("Draft import batch not found", 404)
        if not js_truthy((draft.summary or {}).get("validRows")):
            raise PayrollError("Cannot confirm import with zero valid rows", 400)
        PayrollOneTimeImport.objects.filter(org=org, month=draft.month, year=draft.year,
                                            status="confirmed").update(status="cancelled")
        draft.status = "confirmed"
        draft.confirmed_at = datetime.now(timezone.utc)
        draft.save()
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=draft.pk, payroll_details={"month": draft.month, "year": draft.year},
                       remarks=f"One-time import {draft.import_batch_id} confirmed")
    return send_response(200, True, "One-time components import confirmed successfully", js_json({
        "importBatchId": draft.import_batch_id, "month": draft.month, "year": draft.year,
        "summary": draft.summary, "rows": [r for r in draft.rows or [] if r.get("valid")]}))


@payroll_view(["GET"])
def get_one_time_earnings_deductions(ctx):
    from ..models import PayrollOneTimeImport

    org = ctx.require_org()
    month = normalize_month_input(ctx.query("month", UNDEFINED))
    year = normalize_year_input(ctx.query("year", UNDEFINED))
    if not month or not year:
        raise PayrollError("month and year query params are required", 400)
    batch = (PayrollOneTimeImport.objects.filter(org=org, month=month, year=year, status="confirmed")
             .order_by(F("confirmed_at").desc(nulls_last=True)).first())
    if batch is None:
        return send_response(200, True, "No confirmed import for this period",
                             {"month": month, "year": year, "import": None})
    d = batch.to_dict()
    return send_response(200, True, "Confirmed one-time components import fetched successfully",
                         js_json({"month": month, "year": year, "import": {
                             "importBatchId": d["importBatchId"], "fileName": d["fileName"],
                             "confirmedAt": d["confirmedAt"], "summary": d["summary"],
                             "rows": [r for r in d["rows"] or [] if r.get("valid")]}}))


@payroll_view(["DELETE"])
def cancel_one_time_earnings_deductions(ctx, importBatchId):
    from ..models import PayrollOneTimeImport

    org = ctx.require_org()
    with transaction.atomic():
        batch = (PayrollOneTimeImport.objects.select_for_update()
                 .filter(org=org, import_batch_id=importBatchId, status="draft").first())
        if batch is None:
            raise PayrollError("Draft import batch not found", 404)
        batch.status = "cancelled"
        batch.save()
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=batch.pk, remarks=f"One-time import {importBatchId} cancelled")
    return send_response(200, True, "Draft one-time components import cancelled successfully",
                         {"importBatchId": batch.import_batch_id})


# ------------------------------------------------------------------ salary revision


@payroll_view(["POST"])
def preview_salary_revision_import(ctx):
    from ..models import PayrollSalaryRevisionImport, StatutoryCompliance

    org = ctx.require_org()
    upload = _uploaded(ctx)
    parsed = _parse(upload)
    if not parsed:
        raise PayrollError("No rows found in uploaded file", 400)
    mapped = [map_salary_revision_row(row, i + 1) for i, row in enumerate(parsed)]
    active, inactive = _employees(org)
    compliance = StatutoryCompliance.objects.filter(org=org).order_by("created_at").first()
    validated = validate_salary_revision_rows(
        mapped, active, _salary_components(org),
        compliance.to_dict() if compliance is not None else None, inactive)
    summary = summarize_revision_rows(validated)
    draft = PayrollSalaryRevisionImport.objects.create(
        org=org, import_batch_id=str(uuid.uuid4()), file_name=upload.name or "import.csv",
        status="draft", uploaded_by=ctx.actor_id,
        rows=[cast_revision_row(r) for r in validated], summary=summary)
    warning = (f"{summary['validRows']} valid row(s) ready to confirm; {summary['invalidRows']} "
               "row(s) have errors and will be skipped." if summary["invalidRows"] > 0 else None)
    log_payroll_action(ctx, action="salary_revision_created", entity_type="salary_revision",
                       entity_id=draft.pk,
                       remarks=f"Salary revision import preview {draft.import_batch_id} "
                               f"({summary['validRows']}/{summary['totalRows']} valid)")
    return send_response(200, True, "Salary revision import preview generated successfully",
                         js_json({"importBatchId": draft.import_batch_id,
                                  "fileName": draft.file_name, "summary": summary,
                                  "warning": warning, "preview": validated}))


@payroll_view(["POST"])
def confirm_salary_revision_import(ctx):
    from ..models import PayrollSalaryRevisionImport

    org = ctx.require_org()
    batch_id = ctx.body.get("importBatchId")
    if not js_truthy(batch_id):
        raise PayrollError("importBatchId is required", 400)
    with transaction.atomic():
        draft = (PayrollSalaryRevisionImport.objects.select_for_update()
                 .filter(org=org, import_batch_id=js_str(batch_id), status="draft").first())
        if draft is None:
            raise PayrollError("Draft import batch not found", 404)
        if not js_truthy((draft.summary or {}).get("validRows")):
            raise PayrollError("Cannot confirm import with zero valid rows", 400)
        valid_rows = [r for r in draft.rows or [] if r.get("valid")]
        approver = ctx.actor_name if ctx.actor_name and ctx.actor_name != "System" else None
        outcome = apply_salary_revision_import(valid_rows=valid_rows, org_uuid=org,
                                               requested_by=ctx.actor_id, emp_id=None,
                                               approver_name=approver)
        results, errors = outcome["results"], outcome["errors"]
        approved = sum(1 for r in results if r["status"] in ("approved", "implemented"))
        implemented = sum(1 for r in results if r["status"] == "implemented")
        draft.status = "confirmed"
        draft.confirmed_at = datetime.now(timezone.utc)
        draft.summary = {**(draft.summary or {}), "revisionsCreated": len(results),
                         "approved": approved, "implemented": implemented, "failed": len(errors)}
        new_rows = []
        for row in draft.rows or []:
            applied = next((r for r in results if r["rowNumber"] == row.get("rowNumber")), None)
            failed = next((e for e in errors if e["rowNumber"] == row.get("rowNumber")), None)
            if applied is None:
                new_rows.append(row)
                continue
            new_rows.append({**row, "revisionId": applied["revisionId"],
                             "appliedStatus": applied["status"],
                             "error": js_truthy(failed and failed.get("error")) and failed["error"]
                             or row.get("error")})
        draft.rows = new_rows
        draft.save()
    log_payroll_action(ctx, action="salary_revision_created", entity_type="salary_revision",
                       entity_id=draft.pk,
                       remarks=f"Salary revision import {draft.import_batch_id} confirmed: "
                               f"{len(results)} created, {approved} approved, "
                               f"{implemented} implemented, {len(errors)} failed")
    return send_response(200, True, "Salary revision import confirmed successfully", js_json({
        "importBatchId": draft.import_batch_id, "summary": draft.summary, "applied": results,
        "errors": errors, "note": "Revisions are visible in GET /payRoll/revision"}))


@payroll_view(["GET"])
def get_salary_revision_import(ctx):
    from ..models import PayrollSalaryRevisionImport

    org = ctx.require_org()
    qs = PayrollSalaryRevisionImport.objects.filter(org=org, status="confirmed")
    if ctx.query("importBatchId"):
        qs = qs.filter(import_batch_id=ctx.query("importBatchId"))
    batch = qs.order_by(F("confirmed_at").desc(nulls_last=True)).first()
    if batch is None:
        return send_response(200, True, "No confirmed salary revision import found", {"import": None})
    d = batch.to_dict()
    return send_response(200, True, "Salary revision import fetched successfully", js_json({
        "import": {"importBatchId": d["importBatchId"], "fileName": d["fileName"],
                   "confirmedAt": d["confirmedAt"], "summary": d["summary"],
                   "rows": [r for r in d["rows"] or [] if r.get("valid")]}}))


@payroll_view(["DELETE"])
def cancel_salary_revision_import(ctx, importBatchId):
    from ..models import PayrollSalaryRevisionImport

    org = ctx.require_org()
    with transaction.atomic():
        batch = (PayrollSalaryRevisionImport.objects.select_for_update()
                 .filter(org=org, import_batch_id=importBatchId, status="draft").first())
        if batch is None:
            raise PayrollError("Draft import batch not found", 404)
        batch.status = "cancelled"
        batch.save()
    log_payroll_action(ctx, action="salary_revision_deleted", entity_type="salary_revision",
                       entity_id=batch.pk, remarks=f"Salary revision import {importBatchId} cancelled")
    return send_response(200, True, "Draft salary revision import cancelled successfully",
                         {"importBatchId": batch.import_batch_id})


ROUTES = [
    ("import/one-time-earnings-deductions/preview", preview_one_time_earnings_deductions,
     "import_onetime_preview"),
    ("import/one-time-earnings-deductions/confirm", confirm_one_time_earnings_deductions,
     "import_onetime_confirm"),
    ("import/one-time-earnings-deductions", get_one_time_earnings_deductions, "import_onetime_get"),
    ("import/one-time-earnings-deductions/<str:importBatchId>", cancel_one_time_earnings_deductions,
     "import_onetime_cancel"),
    ("import/salary-revision/preview", preview_salary_revision_import, "import_revision_preview"),
    ("import/salary-revision/confirm", confirm_salary_revision_import, "import_revision_confirm"),
    ("import/salary-revision", get_salary_revision_import, "import_revision_get"),
    ("import/salary-revision/<str:importBatchId>", cancel_salary_revision_import,
     "import_revision_cancel"),
]
