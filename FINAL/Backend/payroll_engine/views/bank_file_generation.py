"""Port of ``controller/payroll/bankFileGeneration.js`` (NEFT / RTGS / CSV salary files).

The file builders (``generate_csv_file``, ``generate_neft_file``, ``generate_rtgs_file``)
are pure and produce byte-identical content to the legacy JS for the same payroll rows,
clock and organisation (differential-tested). Organisation name comes from
``bss_adapter.org_profile``; employee bank details from ``PayrollEmployee.bank_info``
(legacy ``bankInfo``) with the legacy ``payrollInfo.bankDetails`` fallback.
"""

from datetime import datetime, timezone

from django.core.exceptions import ValidationError

from .. import bss_adapter
from ..context import PayrollError, file_response, payroll_view, send_response
from ..models import BankFileRecord, PayrollRun
from ..services.audit_log import log_payroll_action
from ..services.financial_year import LOCAL_TZ
from ..services.jsmath import UNDEFINED, js_or, js_str, js_truthy, parse_int, to_fixed_str
from .payroll_reports import normalize_month_value


# ----------------------------------------------------------------------------- helpers

def _path(doc, *keys):
    for k in keys:
        if not isinstance(doc, dict):
            return UNDEFINED
        doc = doc.get(k, UNDEFINED)
    return doc


def get_bank_account_number(employee=None):
    employee = employee or {}
    return js_or(_path(employee, "bankInfo", "bankAccountNumber"),
                 _path(employee, "payrollInfo", "bankInfo", "bankAccountNumber"),
                 _path(employee, "payrollInfo", "bankDetails", "accountNumber"), "")


def get_bank_ifsc(employee=None):
    employee = employee or {}
    return js_or(_path(employee, "bankInfo", "ifscCode"),
                 _path(employee, "payrollInfo", "bankInfo", "ifscCode"),
                 _path(employee, "payrollInfo", "bankDetails", "ifscCode"), "")


def bank_employee_doc(emp):
    """Legacy populate projection
    ``firstName lastName email payrollInfo.employeeCode payrollInfo.bankDetails bankInfo``
    (``payrollInfo.bankInfo`` is NOT selected, so that fallback never fires)."""
    info = emp.payroll_info or {}
    payroll_info = {k: info[k] for k in ("employeeCode", "bankDetails") if k in info}
    return {"_id": str(emp.pk), "firstName": emp.first_name, "lastName": emp.last_name,
            "email": emp.email, "payrollInfo": payroll_info, "bankInfo": emp.bank_info or {}}


def _n(v):
    return v if js_truthy(v) else 0


def _name(emp):
    return f"{js_str(emp.get('firstName', UNDEFINED))} {js_str(emp.get('lastName', UNDEFINED))}"


def _locale_date(now):
    """``new Date().toLocaleDateString()`` (en-US, server TZ Asia/Kolkata)."""
    loc = now.astimezone(LOCAL_TZ)
    return f"{loc.month}/{loc.day}/{loc.year}"


def _ms(now):
    return int(now.timestamp() * 1000)


def generate_csv_file(payrolls, month, year, now):
    file_name = f"Salary_{js_str(month)}_{js_str(year)}_{_ms(now)}.csv"
    csv = "Employee Name,Employee Code,Bank Account,IFSC Code,Net Pay,Email\n"
    for p in payrolls:
        emp = p["employeeId"]
        code = js_or(_path(emp, "payrollInfo", "employeeCode"), "")
        csv += (f'"{_name(emp)}","{js_str(code)}","{js_str(get_bank_account_number(emp))}",'
                f'"{js_str(get_bank_ifsc(emp))}",{js_str(_n(p.get("netPay")))},'
                f'"{js_str(emp.get("email") or "")}"\n')
    return {"fileContent": csv, "fileName": file_name}


def _transfer_file(kind, rule, payrolls, organization, month, year, now, extra_line=""):
    file_name = f"{kind}_{js_str(month)}_{js_str(year)}_{_ms(now)}.txt"
    content = f"====== {kind} SALARY PAYMENT FILE ======\n"
    content += f"Organization: {js_str(js_or(_path(organization, 'name'), 'N/A'))}\n"
    content += f"Period: {js_str(month)} {js_str(year)}\n"
    content += f"Generated: {_locale_date(now)}\n"
    content += rule + "\n\n"
    total, count = 0, 0
    for p in payrolls:
        emp = p["employeeId"]
        beneficiary = _name(emp).upper()
        account = get_bank_account_number(emp)
        ifsc = get_bank_ifsc(emp)
        amount = _n(p.get("netPay"))
        if js_truthy(account) and js_truthy(ifsc) and amount > 0:
            count += 1
            total += amount
            content += f"Record {count}:\n"
            content += f"  Beneficiary Name: {beneficiary}\n"
            content += f"  Account Number: {js_str(account)}\n"
            content += f"  IFSC Code: {js_str(ifsc)}\n"
            content += f"  Amount: {to_fixed_str(amount, 2)}\n"
            content += extra_line
            content += f"  Remarks: Salary for {js_str(month)} {js_str(year)}\n"
            content += "  ---\n"
    content += "\n" + rule + "\n"
    content += f"Total Records: {count}\n"
    content += f"Total Amount: {to_fixed_str(total, 2)}\n"
    content += rule + "\n"
    return {"fileContent": content, "fileName": file_name}


def generate_neft_file(payrolls, organization, month, year, now):
    return _transfer_file("NEFT", "=" * 37, payrolls, organization, month, year, now)


def generate_rtgs_file(payrolls, organization, month, year, now):
    # RTGS is for amounts >= 2 lakhs
    rtgs = [p for p in payrolls if _n(p.get("netPay")) >= 200000]
    return _transfer_file("RTGS", "=" * 38, rtgs, organization, month, year, now,
                          extra_line="  Payment Mode: RTGS\n")


def _approved_runs(org, month, year):
    y = parse_int(year)
    if not isinstance(y, int):
        return []
    rows = (PayrollRun.objects.filter(org=org, month=month, year=y,
                                      pay_status__in=["approved", "paid"])
            .select_related("employee").order_by("created_at", "id"))
    out = []
    for r in rows:
        doc = r.to_dict()
        doc["employeeId"] = bank_employee_doc(r.employee)
        out.append(doc)
    return out


def _year_out(year):
    y = parse_int(year)
    return y if isinstance(y, int) else None


# ----------------------------------------------------------------------------- handlers

@payroll_view(["POST"])
def generate_bank_file(ctx):
    org = ctx.require_org()
    body = ctx.body
    month, year = body.get("month"), body.get("year")
    selected = js_str(js_or(body.get("bankFormat", UNDEFINED), body.get("format", UNDEFINED),
                            "NEFT")).upper()
    normalized = normalize_month_value(month if month is not None else UNDEFINED)
    if not js_truthy(month) or not js_truthy(year):
        raise PayrollError("Month and year are required", 400)

    payrolls = _approved_runs(org, normalized, year)
    if not payrolls:
        raise PayrollError("No approved payroll records found for this period", 404)
    organization = bss_adapter.org_profile(org)
    now = datetime.now(timezone.utc)
    if selected == "NEFT":
        built = generate_neft_file(payrolls, organization, normalized, year, now)
    elif selected == "RTGS":
        built = generate_rtgs_file(payrolls, organization, normalized, year, now)
    elif selected == "CSV":
        built = generate_csv_file(payrolls, normalized, year, now)
    else:
        raise PayrollError("Unsupported bank format", 400)

    file_name = built["fileName"]
    buffer = built["fileContent"].encode("utf-8")
    total_amount = 0
    for p in payrolls:
        total_amount += _n(p.get("netPay"))
    record = BankFileRecord.objects.create(
        org=org, file_name=file_name, format=selected, month=js_str(normalized),
        year=_year_out(year), total_amount=total_amount, employee_count=len(payrolls),
        status="generated", mime_type="text/csv" if file_name.endswith(".csv") else "text/plain",
        size=len(buffer), content=buffer)
    log_payroll_action(ctx, action="payroll_processed", entity_type="payroll",
                       entity_id=record.pk,
                       payroll_details={"month": js_str(normalized), "year": _year_out(year),
                                        "netPay": total_amount},
                       remarks=f"Bank file generated ({selected}): {file_name}, "
                               f"{len(payrolls)} employee(s)")
    return send_response(200, True, "Bank file generated successfully", {
        "fileId": str(record.pk),
        "fileName": file_name,
        "format": selected,
        "month": normalized,
        "year": _year_out(year),
        "totalRecords": len(payrolls),
        "employeeCount": len(payrolls),
        "totalAmount": record.total_amount,
        "status": "generated",
    })


@payroll_view(["GET"])
def get_bank_file_history(ctx):
    files = BankFileRecord.objects.filter(org=ctx.require_org()).defer("content").order_by("-created_at")
    rows = []
    for f in files:
        doc = f.to_dict(content=None)
        rows.append({
            "fileId": doc["_id"], "fileName": doc["fileName"], "createdAt": doc["createdAt"],
            "size": _n(doc["size"]), "month": doc["month"] or "", "year": doc["year"] or "",
            "format": doc["format"] or "UNKNOWN", "totalAmount": _n(doc["totalAmount"]),
            "employeeCount": _n(doc["employeeCount"]), "status": doc["status"] or "generated",
        })
    if not rows:
        return send_response(200, True, "No bank files found", [])
    return send_response(200, True, "Bank files fetched successfully", rows)


def _get_file(ctx, file_id):
    try:
        return BankFileRecord.objects.filter(org=ctx.require_org(), pk=file_id).first()
    except (ValidationError, ValueError):
        return None


@payroll_view(["GET"])
def download_bank_file(ctx, fileId):
    record = _get_file(ctx, fileId)
    if record is None:
        raise PayrollError("File not found", 404)
    resp = file_response(record.content_bytes, record.file_name,
                         record.mime_type or "application/octet-stream")
    del resp["Cache-Control"]
    return resp


@payroll_view(["DELETE"])
def delete_bank_file(ctx, fileId):
    record = _get_file(ctx, fileId)
    if record is None:
        raise PayrollError("File not found", 404)
    record_id, name = record.pk, record.file_name
    record.delete()
    log_payroll_action(ctx, action="payroll_deleted", entity_type="payroll", entity_id=record_id,
                       remarks=f"Bank file deleted: {name}")
    return send_response(200, True, "Bank file deleted successfully")


@payroll_view(["GET"])
def validate_bank_details(ctx):
    org = ctx.require_org()
    month, year = ctx.query("month"), ctx.query("year")
    if not month or not year:
        raise PayrollError("Month and year are required", 400)
    normalized = normalize_month_value(month)
    payrolls = _approved_runs(org, normalized, year)
    validation = {"total": len(payrolls), "valid": 0, "invalid": 0, "issues": []}
    for p in payrolls:
        emp = p["employeeId"]
        if not js_truthy(get_bank_account_number(emp)) or not js_truthy(get_bank_ifsc(emp)):
            validation["invalid"] += 1
            validation["issues"].append({
                "employeeId": emp["_id"], "name": _name(emp), "employeeName": _name(emp),
                "email": emp.get("email"), "type": "bank_details",
                "message": "Missing or incomplete bank details",
                "issue": "Missing or incomplete bank details",
            })
        else:
            validation["valid"] += 1
    return send_response(200, True, "Bank details validation completed", {
        **validation,
        "totalEmployees": validation["total"],
        "validRecords": validation["valid"],
        "invalidRecords": validation["invalid"],
        "month": normalized,
        "year": _year_out(year),
    })


ROUTES = [
    ("bank/generateFile", generate_bank_file, "bank_generate_file"),
    ("bank/history", get_bank_file_history, "bank_history"),
    ("bank/validate", validate_bank_details, "bank_validate"),
    ("bank/download/<str:fileId>", download_bank_file, "bank_download"),
    ("bank/<str:fileId>", delete_bank_file, "bank_delete"),
]
