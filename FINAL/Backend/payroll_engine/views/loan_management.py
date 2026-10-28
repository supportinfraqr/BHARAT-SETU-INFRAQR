"""Loan types, employee loans and manual repayments.

Port of ``FINAL/legacy_payroll/controller/payroll/loanManagement.js`` (all handlers HR-only).
"""

import math
import re

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from ..context import PayrollError, get_employee, payroll_view, send_response
from ..services.audit_log import log_payroll_action
from ..services.jsmath import (UNDEFINED, clean, is_integer, is_nullish, js_or, js_str, js_trim,
                               js_truthy, to_number)
from ..services.loan_helper import (MONTH_NAMES, _pk, apply_schedule_after_repayment,
                                    compute_next_installment_period,
                                    compute_remaining_installments,
                                    count_payroll_repayments_by_loan_ids,
                                    count_payroll_repayments_for_loan, js_date, js_json,
                                    js_local_datetime, js_utc_date, loan_doc, local_parts,
                                    normalize_payroll_month, write_loan_doc)
from ..services.loan_perquisite_helper import (calculate_monthly_loan_perquisite_for_loan,
                                               is_loan_perquisite_exempt)

PAYMENT_MODES = ["cash", "bank_transfer", "cheque"]
LOAN_TYPE_POPULATE = ["loanName", "perquisiteRate", "status"]


# ------------------------------------------------------------------ pure helpers


def _blank(value):
    return is_nullish(value) or js_trim(js_str(value)) == ""


def parse_perquisite_rate(value=UNDEFINED, default_value=0):
    if _blank(value):
        return default_value
    rate = to_number(value)
    if not math.isfinite(rate) or rate < 0:
        return float("nan")
    return clean(rate)


def parse_positive_amount(value, field_name):
    amount = to_number(value)
    if not math.isfinite(amount) or amount <= 0:
        return {"error": f"{field_name} must be a number greater than 0"}
    return {"value": clean(amount)}


_DMY = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})$")


def parse_date_input(value, field_name):
    if _blank(value):
        return {"error": f"{field_name} is required"}
    text = js_trim(js_str(value))
    m = _DMY.match(text)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)) - 1, int(m.group(3))
        d = js_local_datetime(year, month, day)
        if local_parts(d) == (year, month, day):
            return {"value": d}
        return {"error": f"Invalid {field_name}"}
    d = js_date(text)
    if d is None:
        return {"error": f"Invalid {field_name}"}
    return {"value": d}


def format_display_date(value):
    if not js_truthy(value):
        return ""
    d = js_date(value)
    if d is None:
        return ""
    y, m, day = local_parts(d)
    return f"{day:02d}/{m + 1:02d}/{y}"


def build_emi_start_period(emi_start_date):
    d = js_date(emi_start_date)
    if d is None:
        return None
    month = MONTH_NAMES[d.month - 1]
    return {"emiStartMonth": month, "emiStartYear": d.year,
            "emiStartMonthLabel": f"{month} {d.year}" if month else ""}


def parse_emi_start_period_input(body=None):
    body = body or {}
    emi_start_month = body.get("emiStartMonth", UNDEFINED)
    emi_start_year = body.get("emiStartYear", UNDEFINED)
    emi_start_date = body.get("emiStartDate", UNDEFINED)
    if not _blank(emi_start_month):
        if _blank(emi_start_year):
            return {"error": "emiStartYear is required when emiStartMonth is provided"}
        year = to_number(emi_start_year)
        if not is_integer(year) or year < 1900 or year > 2100:
            return {"error": "emiStartYear must be a valid year"}
        year = int(year)
        label = normalize_payroll_month(emi_start_month)
        lower = js_str(js_or(label, "")).lower()
        idx = next((i for i, mm in enumerate(MONTH_NAMES) if mm.lower() == lower), -1)
        if idx == -1:
            return {"error": "emiStartMonth must be Jan-Dec, January-December, or 1-12"}
        return {"value": js_utc_date(year, idx, 1), "month": MONTH_NAMES[idx], "year": year,
                "label": f"{MONTH_NAMES[idx]} {year}"}
    if not _blank(emi_start_date):
        parsed = parse_date_input(emi_start_date, "emiStartDate")
        if "error" in parsed:
            return parsed
        year, idx, _ = local_parts(parsed["value"])
        month = MONTH_NAMES[idx]
        return {"value": js_utc_date(year, idx, 1), "month": month, "year": year,
                "label": f"{month} {year}"}
    return {"error": "emiStartMonth + emiStartYear (or emiStartDate) is required"}


def compute_repayment_summary(loan_amount, installment_amount):
    total = math.ceil(loan_amount / installment_amount)
    last = loan_amount - installment_amount * (total - 1)
    return {"totalInstallments": total,
            "lastInstallmentAmount": clean(last if last > 0 else installment_amount)}


def compute_loan_closing_date(emi_start_date, total_installments):
    if not js_truthy(emi_start_date) or not js_truthy(total_installments) or total_installments < 1:
        return None
    start = js_date(emi_start_date)
    if start is None:
        return None
    return js_utc_date(start.year, start.month - 1 + int(total_installments) - 1, 1)


def enrich_loan_record(loan, payroll_repayment_count=0):
    if not js_truthy(loan):
        return loan
    remaining = compute_remaining_installments(loan.get("outstandingBalance", UNDEFINED),
                                               loan.get("installmentAmount", UNDEFINED))
    closing = (compute_loan_closing_date(loan.get("emiStartDate"), remaining) if remaining > 0
               else js_or(loan.get("closedAt", UNDEFINED), None))
    out = dict(loan)
    out.update(build_emi_start_period(loan.get("emiStartDate", UNDEFINED)) or {})
    out.update(compute_next_installment_period(loan, payroll_repayment_count))
    out["remainingInstallments"] = remaining
    out["loanClosingDate"] = closing
    return out


def build_repayment_message(total_installments, emi_start_period=UNDEFINED):
    if emi_start_period is None:
        raise TypeError("Cannot read properties of null (reading 'label')")
    p = {} if emi_start_period is UNDEFINED else emi_start_period
    label = js_or(p.get("label", UNDEFINED), p.get("emiStartMonthLabel", UNDEFINED), "")
    return (f"This loan will be fully paid off in {total_installments} installments. "
            f"The first EMI will be deducted from {label} salary payroll.")


def resolve_employee_display_name(employee=None):
    employee = employee or {}
    name = f"{js_or(employee.get('firstName'), '')} {js_or(employee.get('lastName'), '')}".strip()
    info = employee.get("payrollInfo") if isinstance(employee.get("payrollInfo"), dict) else {}
    return js_or(name, info.get("employeeCode"), employee.get("uniqueId"), "")


def normalize_payment_mode(value):
    raw = re.sub(r"[\s-]+", "_", js_trim(js_str(js_or(value, ""))).lower())
    if raw in ("bank", "banktransfer", "bank_transfer"):
        return "bank_transfer"
    if raw in PAYMENT_MODES:
        return raw
    return None


# ------------------------------------------------------------------ db helpers


def _models():
    from ..models import EmployeeLoan, LoanRepayment, LoanType

    return LoanType, EmployeeLoan, LoanRepayment


def _first(qs, **filters):
    """``findOne`` that treats a malformed id as "not found"."""
    try:
        return qs.filter(**filters).first()
    except (ValidationError, ValueError):
        return None


def generate_loan_number(org):
    _, EmployeeLoan, _ = _models()
    latest = (EmployeeLoan.objects.filter(org=org).order_by("-created_at")
              .values_list("loan_number", flat=True).first())
    nxt = 1
    if latest:
        m = re.search(r"(\d+)$", str(latest))
        if m:
            nxt = int(m.group(1)) + 1
    return f"LN-{str(nxt).zfill(5)}"


def _respond(status, message, data):
    return send_response(status, True, message, js_json(data))


# ------------------------------------------------------------------ loan types


@payroll_view(["POST"])
def create_loan_type(ctx):
    org = ctx.require_org()
    body = ctx.body
    loan_name = js_trim(js_str(js_or(body.get("loanName", UNDEFINED), "")))
    if not loan_name:
        raise PayrollError("loanName is required", 400)
    rate = parse_perquisite_rate(body.get("perquisiteRate", UNDEFINED), 0)
    if isinstance(rate, float) and math.isnan(rate):
        raise PayrollError("Perquisite rate must be a number >= 0", 400)
    LoanType, _, _ = _models()
    if LoanType.objects.filter(org=org, loan_name=loan_name).exists():
        raise PayrollError("Loan name already exists", 400)
    try:
        loan_type = LoanType.objects.create(org=org, loan_name=loan_name, perquisite_rate=rate,
                                            status="active", created_by=ctx.actor_id)
    except IntegrityError:
        raise PayrollError("Loan name already exists", 400)
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=loan_type.pk, after_data=loan_type.to_dict(),
                       remarks=f"Loan type created: {loan_name}")
    return _respond(201, "Loan type created successfully", loan_type.to_dict())


@payroll_view(["GET"])
def get_loan_types(ctx):
    org = ctx.require_org()
    LoanType, _, _ = _models()
    include_inactive = js_str(js_or(ctx.query("includeInactive"), "")).lower() == "true"
    search, status = ctx.query("search"), ctx.query("status")
    qs = LoanType.objects.filter(org=org)
    if status:
        qs = qs.filter(status=str(status).lower())
    elif not include_inactive:
        qs = qs.filter(status="active")
    # sort({loanName: 1}): Mongo compares strings by code point (case-sensitive); a SQL
    # ORDER BY would use the database collation, so sort in Python.
    rows = sorted((x.to_dict() for x in qs.order_by("created_at", "id")),
                  key=lambda r: r.get("loanName") or "")
    if search:
        term = str(search).strip().lower()
        rows = [r for r in rows if term in str(r.get("loanName") or "").lower()]
    return _respond(200, "Loan types fetched successfully", {"loanTypes": rows, "total": len(rows)})


@payroll_view(["GET"])
def get_loan_type_by_id(ctx, loanTypeId):
    org = ctx.require_org()
    LoanType, _, _ = _models()
    loan_type = _first(LoanType.objects, pk=loanTypeId, org=org)
    if loan_type is None:
        raise PayrollError("Loan type not found", 404)
    return _respond(200, "Loan type fetched successfully", loan_type.to_dict())


@payroll_view(["PUT"])
def update_loan_type(ctx, loanTypeId):
    org = ctx.require_org()
    body = ctx.body
    LoanType, _, _ = _models()
    loan_type = _first(LoanType.objects, pk=loanTypeId, org=org)
    if loan_type is None:
        raise PayrollError("Loan type not found", 404)
    before = loan_type.to_dict()
    if "loanName" in body:
        loan_name = js_trim(js_str(body["loanName"]))
        if not loan_name:
            raise PayrollError("loanName cannot be empty", 400)
        if LoanType.objects.filter(org=org, loan_name=loan_name).exclude(pk=loan_type.pk).exists():
            raise PayrollError("Loan name already exists", 400)
        loan_type.loan_name = loan_name
    if "perquisiteRate" in body:
        rate = parse_perquisite_rate(body["perquisiteRate"])
        if isinstance(rate, float) and math.isnan(rate):
            raise PayrollError("Perquisite rate must be a number >= 0", 400)
        loan_type.perquisite_rate = rate
    if "status" in body:
        nxt = js_str(body["status"]).lower()
        if nxt not in ("active", "inactive"):
            raise PayrollError("Status must be active or inactive", 400)
        loan_type.status = nxt
    loan_type.save()
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=loan_type.pk, before_data=before, after_data=loan_type.to_dict(),
                       remarks=f"Loan type updated: {loan_type.loan_name}")
    return _respond(200, "Loan type updated successfully", loan_type.to_dict())


@payroll_view(["DELETE"])
def delete_loan_type(ctx, loanTypeId):
    org = ctx.require_org()
    LoanType, EmployeeLoan, _ = _models()
    loan_type = _first(LoanType.objects, pk=loanTypeId, org=org)
    if loan_type is None:
        raise PayrollError("Loan type not found", 404)
    linked = EmployeeLoan.objects.filter(org=org, loan_type=loan_type).exclude(
        status="cancelled").count()
    if linked > 0:
        raise PayrollError("Cannot delete loan type while employee loans are linked to it", 400)
    before = loan_type.to_dict()
    # Cancelled loans keep a PROTECT FK in the port; legacy left them dangling.
    EmployeeLoan.objects.filter(org=org, loan_type=loan_type).delete()
    loan_type.delete()
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=loanTypeId, before_data=before,
                       remarks=f"Loan type deleted: {before.get('loanName')}")
    return _respond(200, "Loan type deleted successfully", {"loanTypeId": loanTypeId})


# ------------------------------------------------------------------ loans


@payroll_view(["POST"])
def create_loan(ctx):
    org = ctx.require_org()
    body = ctx.body
    loan_type_id = body.get("loanTypeId")
    employee_id = body.get("employeeId")
    if not js_truthy(loan_type_id):
        raise PayrollError("loanTypeId is required", 400)
    if not js_truthy(employee_id):
        raise PayrollError("employeeId is required", 400)
    amount = parse_positive_amount(body.get("loanAmount", UNDEFINED), "loanAmount")
    if "error" in amount:
        raise PayrollError(amount["error"], 400)
    inst = parse_positive_amount(body.get("installmentAmount", UNDEFINED), "installmentAmount")
    if "error" in inst:
        raise PayrollError(inst["error"], 400)
    if inst["value"] > amount["value"]:
        raise PayrollError("installmentAmount cannot exceed loanAmount", 400)
    disb = parse_date_input(body.get("disbursementDate", UNDEFINED), "disbursementDate")
    if "error" in disb:
        raise PayrollError(disb["error"], 400)
    emi = parse_emi_start_period_input({k: body.get(k, UNDEFINED) for k in
                                        ("emiStartMonth", "emiStartYear", "emiStartDate")})
    if "error" in emi:
        raise PayrollError(emi["error"], 400)

    LoanType, EmployeeLoan, _ = _models()
    loan_type = _first(LoanType.objects, pk=loan_type_id, org=org, status="active")
    if loan_type is None:
        raise PayrollError("Active loan type not found", 404)
    employee = get_employee(ctx, employee_id)
    emp_doc = employee.to_dict()

    summary = compute_repayment_summary(amount["value"], inst["value"])
    total, last = summary["totalInstallments"], summary["lastInstallmentAmount"]

    loan = None
    for _attempt in range(5):
        try:
            with transaction.atomic():
                loan = EmployeeLoan.objects.create(
                    org=org, loan_number=generate_loan_number(org), loan_type=loan_type,
                    employee=employee, loan_amount=amount["value"],
                    outstanding_balance=amount["value"], disbursement_date=disb["value"],
                    paid_through_account=js_trim(js_str(js_or(body.get("paidThroughAccount"), ""))),
                    reference_number=js_trim(js_str(js_or(body.get("referenceNumber"), ""))),
                    reason=js_trim(js_str(js_or(body.get("reason"), ""))),
                    exempt_from_perquisite=js_truthy(body.get("exemptFromPerquisite", UNDEFINED)),
                    emi_start_date=emi["value"], installment_amount=inst["value"],
                    total_installments=total, last_installment_amount=last,
                    paid_installments=0, status="active", created_by=ctx.actor_id)
            break
        except IntegrityError:
            loan = None
    if loan is None:
        raise PayrollError("Could not allocate a loan number, please retry", 500)

    closing = compute_loan_closing_date(emi["value"], total)
    message = build_repayment_message(total, emi)
    nxt = compute_next_installment_period(
        {"emiStartDate": emi["value"], "outstandingBalance": amount["value"], "status": "active"}, 0)
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=loan.pk, affected_employee=employee,
                       after_data=js_json(loan.to_dict()),
                       remarks=f"Loan {loan.loan_number} created ({loan_type.loan_name})")
    data = {
        "loan": enrich_loan_record(loan.to_dict(), 0),
        "loanType": {"_id": str(loan_type.pk), "loanName": loan_type.loan_name,
                     "perquisiteRate": loan_type.perquisite_rate},
        "employee": {
            "_id": str(employee.pk),
            "employeeName": resolve_employee_display_name(emp_doc),
            "employeeCode": js_or((emp_doc.get("payrollInfo") or {}).get("employeeCode"),
                                  emp_doc.get("uniqueId"), ""),
        },
        "repaymentSummary": {
            "totalInstallments": total, "installmentAmount": inst["value"],
            "lastInstallmentAmount": last, "emiStartDate": emi["value"],
            "emiStartMonth": emi["month"], "emiStartYear": emi["year"],
            "emiStartMonthLabel": emi["label"], **nxt, "loanClosingDate": closing,
            "message": message,
        },
        "repayments": [],
    }
    return _respond(201, "Loan created successfully", data)


@payroll_view(["GET"])
def get_loans(ctx):
    org = ctx.require_org()
    _, EmployeeLoan, _ = _models()
    qs = EmployeeLoan.objects.filter(org=org)
    try:
        if ctx.query("employeeId"):
            qs = qs.filter(employee_id=ctx.query("employeeId"))
        if ctx.query("loanTypeId"):
            qs = qs.filter(loan_type_id=ctx.query("loanTypeId"))
        if ctx.query("status"):
            qs = qs.filter(status=str(ctx.query("status")).lower())
        objs = list(qs.select_related("loan_type", "employee").order_by("-created_at"))
    except (ValidationError, ValueError):
        objs = []
    loans = [loan_doc(x, loan_type_fields=LOAN_TYPE_POPULATE,
                      employee_fields=["firstName", "lastName", "customId", "uniqueId",
                                       "payrollInfo.employeeCode"]) for x in objs]
    search = ctx.query("search")
    if search:
        term = str(search).strip().lower()

        def match(row):
            emp_name = resolve_employee_display_name(row.get("employeeId") or {}).lower()
            loan_name = str((row.get("loanTypeId") or {}).get("loanName") or "").lower()
            loan_number = str(row.get("loanNumber") or "").lower()
            ref = str(row.get("referenceNumber") or "").lower()
            return term in emp_name or term in loan_name or term in loan_number or term in ref

        loans = [r for r in loans if match(r)]
    counts = count_payroll_repayments_by_loan_ids(org, [r["_id"] for r in loans])
    return _respond(200, "Loans fetched successfully", {
        "loans": [enrich_loan_record(r, counts.get(str(r["_id"]), 0)) for r in loans],
        "total": len(loans),
    })


@payroll_view(["GET"])
def get_loan_by_id(ctx, loanId):
    org = ctx.require_org()
    _, EmployeeLoan, LoanRepayment = _models()
    obj = _first(EmployeeLoan.objects.select_related("loan_type", "employee"), pk=loanId, org=org)
    if obj is None:
        raise PayrollError("Loan not found", 404)
    loan = loan_doc(obj, loan_type_fields=LOAN_TYPE_POPULATE,
                    employee_fields=["firstName", "lastName", "uniqueId",
                                     "payrollInfo.employeeCode", "email"])
    repayments = [r.to_dict() for r in LoanRepayment.objects.filter(org=org, loan=obj)
                  .order_by("-repayment_date", "-created_at")]
    remaining = compute_remaining_installments(loan.get("outstandingBalance"),
                                               loan.get("installmentAmount"))
    closing = (compute_loan_closing_date(loan.get("emiStartDate"), remaining) if remaining > 0
               else js_or(loan.get("closedAt"), None))
    loan_type = js_or(loan.get("loanTypeId"), {})
    monthly = calculate_monthly_loan_perquisite_for_loan(loan, loan_type)
    period = build_emi_start_period(loan.get("emiStartDate")) or {}
    payroll_count = sum(1 for r in repayments if r.get("repaymentType") == "payroll")
    nxt = compute_next_installment_period(loan, payroll_count)
    if remaining:
        message = (f"Remaining {remaining} installment(s). Next installment: "
                   f"{nxt['nextInstallmentLabel']}." if nxt["nextInstallmentLabel"]
                   else f"Remaining {remaining} installment(s).")
    else:
        message = "Loan is fully repaid."
    summary = {
        "totalInstallments": loan.get("totalInstallments"),
        "paidInstallments": loan.get("paidInstallments"),
        "remainingInstallments": remaining,
        "installmentAmount": loan.get("installmentAmount"),
        "lastInstallmentAmount": loan.get("lastInstallmentAmount"),
        "emiStartDate": loan.get("emiStartDate"),
        "emiStartMonth": js_or(period.get("emiStartMonth"), None),
        "emiStartYear": js_or(period.get("emiStartYear"), None),
        "emiStartMonthLabel": js_or(period.get("emiStartMonthLabel"), ""),
        **nxt,
        "loanClosingDate": closing,
        "outstandingBalance": loan.get("outstandingBalance"),
        "remainingAmount": loan.get("outstandingBalance"),
        "perquisiteRate": js_or(loan_type.get("perquisiteRate"), 0),
        "monthlyPerquisite": monthly,
        "isPerquisiteExempt": is_loan_perquisite_exempt(loan, loan_type),
        "message": message,
    }
    return _respond(200, "Loan fetched successfully", {
        "loan": enrich_loan_record(loan, payroll_count), "repaymentSummary": summary,
        "repayments": repayments})


@payroll_view(["POST"])
def record_repayment(ctx, loanId):
    org = ctx.require_org()
    body = ctx.body
    amount = parse_positive_amount(body.get("repaymentAmount", UNDEFINED), "repaymentAmount")
    if "error" in amount:
        raise PayrollError(amount["error"], 400)
    date_res = parse_date_input(body.get("repaymentDate", UNDEFINED), "repaymentDate")
    if "error" in date_res:
        raise PayrollError(date_res["error"], 400)
    mode = normalize_payment_mode(body.get("paymentMode"))
    if not mode:
        raise PayrollError("paymentMode must be cash, bank_transfer, or cheque", 400)

    _, EmployeeLoan, LoanRepayment = _models()
    with transaction.atomic():
        loan = _first(EmployeeLoan.objects.select_for_update(), pk=loanId, org=org)
        if loan is None:
            raise PayrollError("Loan not found", 404)
        if loan.status != "active":
            raise PayrollError("Repayment can only be recorded for active loans", 400)
        if amount["value"] > (loan.outstanding_balance or 0):
            raise PayrollError("Repayment amount cannot exceed outstanding balance of "
                               f"{js_str(loan.outstanding_balance)}", 400)
        before = loan.outstanding_balance
        after = max(0, before - amount["value"])
        repayment = LoanRepayment.objects.create(
            org=org, loan=loan, employee_id=loan.employee_id, repayment_amount=amount["value"],
            repayment_date=date_res["value"], payment_mode=mode,
            deposit_to_account=js_trim(js_str(js_or(body.get("depositToAccount"), ""))),
            reference_number=js_trim(js_str(js_or(body.get("referenceNumber"), ""))),
            balance_before=before, balance_after=after, repayment_type="manual",
            created_by=ctx.actor_id)
        d = loan.to_dict()
        d["outstandingBalance"] = after
        apply_schedule_after_repayment(d)
        if after == 0:
            d["status"] = "closed"
            d["closedAt"] = date_res["value"]
            d["paidInstallments"] = math.ceil((d.get("loanAmount") or 0) / d["installmentAmount"])
            d["totalInstallments"] = d["paidInstallments"]
            d["lastInstallmentAmount"] = 0
        write_loan_doc(loan, d)
        loan.save()
    count = count_payroll_repayments_for_loan(org, loan.pk)
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=loan.pk, affected_employee=loan.employee,
                       after_data=js_json(repayment.to_dict()),
                       remarks=f"Loan {loan.loan_number} manual repayment {clean(amount['value'])}")
    return _respond(201, "Repayment recorded successfully", {
        "repayment": repayment.to_dict(), "loan": enrich_loan_record(loan.to_dict(), count),
        "remainingAmount": clean(after)})


ROUTES = [
    ("loan/create-loan-type", create_loan_type, "loan_create_type"),
    ("loan/get-loan-types", get_loan_types, "loan_get_types"),
    ("loan/get-loan-typeById/<str:loanTypeId>", get_loan_type_by_id, "loan_get_type_by_id"),
    ("loan/upadte-loan-type/<str:loanTypeId>", update_loan_type, "loan_update_type"),
    ("loan/delete-loan-type/<str:loanTypeId>", delete_loan_type, "loan_delete_type"),
    ("loan/create-loan", create_loan, "loan_create"),
    ("loan/get-loans", get_loans, "loan_get_loans"),
    ("loan/get-loanById/<str:loanId>", get_loan_by_id, "loan_get_by_id"),
    ("loan/record-repayment/<str:loanId>", record_repayment, "loan_record_repayment"),
]
