"""Pay runs — port of ``controller/payroll/payrollRun.js``.

Exported handlers (legacy -> port): processPayroll, getPayRunMonthlyData,
getMonthlyPayrollHistroy, getPayrollHistory, getPayrollById, recalculatePayroll,
updatePayrollStatus, bulkUpdatePayrollStatus, generatePayslip, downloadPayslipPdf,
deletePayrollRun. ``process_payroll_core`` is the request-independent core of
``processPayroll`` (used by the auto-payroll runner, which legacy drove through a mock
``req``/``res``). Calculation helpers live in ``services/payroll_calc.py``.
"""

import logging
import math
import re
import uuid

from django.db import transaction
from django.db.models import Count, Max, Sum
from django.utils import timezone

from .. import bss_adapter
from ..context import PayrollError, file_response, payroll_view, send_response
from ..models import (ClaimsDeclaration, PayrollEmployee, PayrollRun, PayrollSchedule,
                      SalaryCompensation, StatutoryCompliance)
from ..models.base import iso
from ..models.employee_tds import new_monthly_deduction
from ..services import payroll_calc as pc
from ..services.audit_log import log_payroll_action
from ..services.employee_display import resolve_employee_display_code
from ..services.financial_year import _to_instant
from ..services.jsmath import (UNDEFINED, clean, js_nc, js_or, js_out, js_str, js_trim,
                               js_truthy, parse_int, to_number)

logger = logging.getLogger("payroll_engine")

# Populate projections used by the legacy controller.
SUMMARY_FIELDS = ["firstName", "lastName", "uniqueId", "customId", "payrollInfo.employeeCode",
                  "payrollInfo.department", "payrollInfo.designation", "departmentId",
                  "bankInfo.bankAccountNumber", "bankInfo.bankName", "bankInfo.branchName",
                  "bankInfo.ifscCode"]
HISTORY_FIELDS = ["firstName", "lastName", "email", "customId", "uniqueId",
                  "payrollInfo.employeeCode", "payrollInfo.department",
                  "payrollInfo.designation", "departmentId"]
PDF_FIELDS = HISTORY_FIELDS + ["jobTitle", "nationalID.pan", "bankInfo.bankName",
                               "bankInfo.bankAccountNumber"]


# --------------------------------------------------------------------------- helpers

def _department_ref(emp):
    """Legacy populated ``departmentId`` ({_id, name}); BSS keeps a department name."""
    return {"_id": None, "name": emp.department} if emp.department else None


def employee_projection(emp, fields):
    """``populate({path: 'employeeId', select: fields})`` -> projected employee dict."""
    if emp is None:
        return None
    doc = emp.to_dict()
    out = {"_id": doc["_id"]}
    for path in fields:
        if path == "departmentId":
            out["departmentId"] = _department_ref(emp)
            continue
        parts = path.split(".")
        src, dst = doc, out
        for i, part in enumerate(parts):
            if not isinstance(src, dict) or part not in src:
                break
            if i == len(parts) - 1:
                dst[part] = src[part]
            else:
                src = src[part]
                dst = dst.setdefault(part, {})
    return out


def employee_full(emp):
    """``populate('employeeId')`` (whole document)."""
    if emp is None:
        return None
    doc = emp.to_dict()
    doc["departmentId"] = None  # not populated in the legacy generatePayslip
    return doc


def _uuid_or_none(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


def get_run(org, payroll_id):
    pk = _uuid_or_none(payroll_id)
    if pk is None:
        return None
    return PayrollRun.objects.filter(org=org, pk=pk).select_related("employee").first()


def run_dict(run, fields=None, full=False):
    doc = run.to_dict()
    if full:
        doc["employeeId"] = employee_full(run.employee)
    elif fields is not None:
        doc["employeeId"] = employee_projection(run.employee, fields)
    return doc


def _schedule_dict(org, active_only=False):
    qs = PayrollSchedule.objects.filter(org=org)
    if active_only:
        qs = qs.filter(status="active")
    sched = qs.order_by("created_at").first()
    return sched.to_dict() if sched else None


def _components(org):
    return [c.to_dict() for c in SalaryCompensation.objects.filter(org=org).order_by("created_at")]


def _compliance(org):
    c = StatutoryCompliance.objects.filter(org=org).order_by("created_at").first()
    return c.to_dict() if c else None


def _name(emp):
    return f"{emp.first_name} {emp.last_name}"


def _year_out(value):
    return clean(float(value)) if isinstance(value, (int, float)) else value


def parse_js_date(value):
    """``new Date(value)`` for a Mongoose Date cast (raises on Invalid Date)."""
    instant = _to_instant(value)
    if instant is None:
        raise ValueError(f'Cast to date failed for value "{value}" (type '
                         f'{type(value).__name__}) at path "paidDate"')
    return instant


_TDS_ERR = "TDS deduction was calculated but matching TDS record was not found for payroll period"
_ARREARS_ERR = ("Included arrears could not be marked as paid (already paid/rejected or not "
                "found)")


# --------------------------------------------------------------------------- processPayroll

def process_payroll_core(org, body, ctx=None):
    """Returns ``(status, success, message, data)`` exactly like legacy ``processPayroll``."""
    from ..models import Arrears

    month = body.get("month", UNDEFINED)
    year = body.get("year", UNDEFINED)
    employee_ids = body.get("employeeIds", [])
    exclude_ids = body.get("excludeEmployeeIds", [])

    if not js_truthy(month) or not js_truthy(year):
        return 400, False, "Month and year are required", None
    if not isinstance(employee_ids, list):
        return 400, False, "employeeIds must be an array", None
    if not isinstance(exclude_ids, list):
        return 400, False, "excludeEmployeeIds must be an array", None

    normalized_exclude = []
    for x in exclude_ids:
        s = js_str(x)
        if s and s not in normalized_exclude:
            normalized_exclude.append(s)
    if employee_ids and normalized_exclude:
        include = {js_str(x) for x in employee_ids}
        if any(x in include for x in normalized_exclude):
            return (400, False, "employeeIds and excludeEmployeeIds cannot contain the same IDs",
                    None)

    normalized_month = pc.normalize_payroll_month(month)
    normalized_year = to_number(year)
    if not normalized_month or pc.get_month_index(normalized_month) == -1:
        return 400, False, "Invalid month. Use Jan/Jul or July format", None
    if not (math.isfinite(normalized_year) and float(normalized_year).is_integer()) \
            or normalized_year < 1900:
        return 400, False, "Invalid year", None
    normalized_year = int(normalized_year)

    schedule = _schedule_dict(org)
    qs = PayrollEmployee.objects.filter(org=org, status="Active")
    if employee_ids:
        qs = qs.filter(pk__in=[u for u in (_uuid_or_none(x) for x in employee_ids) if u])
    if normalized_exclude:
        qs = qs.exclude(pk__in=[u for u in (_uuid_or_none(x) for x in normalized_exclude) if u])
    employees = list(qs.order_by("created_at"))
    if not employees:
        return 404, False, "No active employees found", None

    compliance = _compliance(org)
    salary_components = _components(org)
    one_time_by_employee = pc.load_one_time_rows_by_employee(org, normalized_month,
                                                             normalized_year)

    excluded_employees = []
    if normalized_exclude:
        valid = [u for u in (_uuid_or_none(x) for x in normalized_exclude) if u]
        by_id = {str(e.pk): js_trim(f"{e.first_name or ''} {e.last_name or ''}")
                 for e in PayrollEmployee.objects.filter(org=org, pk__in=valid)}
        excluded_employees = [{"employeeId": i, "name": by_id.get(i) or None}
                              for i in normalized_exclude]

    results, errors = [], []
    for emp in employees:
        info = emp.payroll_info or {}
        if not js_truthy(info.get("baseSalary")):
            errors.append({"employeeId": str(emp.pk), "name": _name(emp),
                           "error": "No salary structure defined"})
            continue
        if PayrollRun.objects.filter(org=org, employee=emp, month=normalized_month,
                                     year=normalized_year).exists():
            errors.append({"employeeId": str(emp.pk), "name": _name(emp),
                           "error": "Payroll already processed"})
            continue
        try:
            calc = pc.calculate_employee_salary_improved(
                emp, salary_components, compliance, normalized_month, normalized_year, org,
                schedule, one_time_by_employee.get(str(emp.pk)) or [])
            run = PayrollRun(org=org, employee=emp, month=normalized_month,
                             year=normalized_year, pay_status="processed",
                             processed_date=timezone.now())
            pc.apply_calculation_to_run(run, calc)
            # Legacy relied on the unique {employeeId, month, year} index: a concurrent run
            # (HR click + auto-payroll cron, double submit) failed on save. Lock the employee
            # row and re-check so a second request cannot create a duplicate run (and push a
            # second TDS ledger entry / loan repayment).
            with transaction.atomic():
                PayrollEmployee.objects.select_for_update().filter(pk=emp.pk).first()
                duplicate = PayrollRun.objects.filter(
                    org=org, employee=emp, month=normalized_month, year=normalized_year).exists()
                if not duplicate:
                    run.save()
            if duplicate:
                errors.append({"employeeId": str(emp.pk), "name": _name(emp),
                               "error": "Payroll already processed"})
                continue

            if calc["tdsAmount"] > 0:
                with transaction.atomic():
                    record = pc.find_tds_record(org, emp.pk, normalized_month, normalized_year,
                                                for_update=True)
                    if record is None:
                        raise RuntimeError(_TDS_ERR)
                    record.monthly_deductions = list(record.monthly_deductions or []) + [
                        new_monthly_deduction(month=normalized_month, year=normalized_year,
                                              tdsDeducted=calc["tdsAmount"],
                                              payrollId=str(run.pk))]
                    record.total_tds_deducted = (record.total_tds_deducted or 0) + calc["tdsAmount"]
                    record.save()

            if calc["arrearsId"]:
                with transaction.atomic():
                    arrears = Arrears.objects.select_for_update().filter(
                        pk=calc["arrearsId"], org=org, employee=emp, status="approved").first()
                    if arrears is None:
                        raise RuntimeError(_ARREARS_ERR)
                    arrears.status = "paid"
                    arrears.paid_in_month = normalized_month
                    arrears.paid_in_year = normalized_year
                    arrears.payroll = run
                    arrears.paid_date = timezone.now()
                    arrears.save()

            if calc["reimbursementClaimSubIds"]:
                with transaction.atomic():
                    claim_doc = ClaimsDeclaration.objects.select_for_update().filter(
                        org=org, employee=emp).order_by("created_at").first()
                    if claim_doc is not None:
                        modified = False
                        subs = list(claim_doc.reimbursements or [])
                        wanted = {str(s) for s in calc["reimbursementClaimSubIds"]}
                        for sub in subs:
                            if str(sub.get("_id")) in wanted and not sub.get("includedInPayrollId"):
                                sub["includedInPayrollId"] = str(run.pk)
                                modified = True
                        if modified:
                            claim_doc.reimbursements = subs
                            claim_doc.save()

            if calc["loanRepaymentPlans"]:
                pc.apply_loan_repayments(org, emp.pk, normalized_month, normalized_year, run.pk,
                                         calc["loanRepaymentPlans"])

            log_payroll_action(ctx, org=org, action="payroll_processed", entity_type="payroll",
                               entity_id=run.pk, affected_employee=emp,
                               payroll_details={"month": normalized_month,
                                                "year": normalized_year,
                                                "grossEarnings": run.gross_earnings,
                                                "totalDeductions": run.total_deductions,
                                                "netPay": run.net_pay},
                               remarks="Payroll processed" if ctx else "Auto payroll processed")
            results.append({"employeeId": str(emp.pk), "name": _name(emp),
                            "netPay": clean(run.net_pay), "status": "success"})
        except Exception as err:  # noqa: BLE001 — legacy per-employee error collection
            message = str(err)
            if message in (_ARREARS_ERR, _TDS_ERR):
                created = PayrollRun.objects.filter(
                    org=org, employee=emp, month=normalized_month, year=normalized_year
                ).order_by("-created_at").first()
                if created is not None:
                    tds_line = next((d for d in created.deductions or []
                                     if d.get("componentName") == "TDS"), None)
                    created_id = str(created.pk)
                    created.delete()
                    with transaction.atomic():
                        record = pc.find_tds_record(org, emp.pk, normalized_month,
                                                    normalized_year, for_update=True)
                        if record is not None:
                            record.monthly_deductions = [
                                d for d in (record.monthly_deductions or [])
                                if str(d.get("payrollId")) != created_id]
                            record.total_tds_deducted = (record.total_tds_deducted or 0) - abs(
                                to_number(js_or((tds_line or {}).get("amount"), 0)))
                            record.save()
            else:
                logger.exception("Payroll Error for %s", emp.pk)
            errors.append({"employeeId": str(emp.pk), "name": _name(emp), "error": message})

    return 200, True, "Payroll processing completed", {
        "successful": len(results),
        "failed": len(errors),
        "excluded": len(normalized_exclude),
        "excludeEmployeeIds": normalized_exclude,
        "excludedEmployees": excluded_employees,
        "results": results,
        "errors": errors,
    }


@payroll_view(["POST"])
def process_payroll(ctx):
    org = ctx.require_org()
    status, ok, message, data = process_payroll_core(org, ctx.body, ctx)
    return send_response(status, ok, message, data)


# --------------------------------------------------------------------------- history views

def _populated_runs(qs, fields):
    return [run_dict(r, fields) for r in qs.select_related("employee").order_by("created_at")]


def _sort_by_name(rows):
    return sorted(rows, key=lambda r: (r["employeeName"].lower(), r["employeeName"]))


@payroll_view(["GET"])
def get_pay_run_monthly_data(ctx):
    org = ctx.require_org()
    month = ctx.query("month")
    year = ctx.query("year")
    search = ctx.query("search")
    pay_status = ctx.query("payStatus")
    page = ctx.query("page", 1)
    limit = ctx.query("limit", 50)

    if not month and not year:
        groups = (PayrollRun.objects.filter(org=org).values("month", "year")
                  .annotate(employeeCount=Count("id"), totalNetPay=Sum("net_pay"),
                            totalGrossPay=Sum("gross_earnings"),
                            lastProcessedAt=Max("processed_date")))
        periods = [{
            "month": g["month"], "year": _year_out(g["year"]),
            "employeeCount": g["employeeCount"],
            "totalNetPay": clean(pc.js_round(g["totalNetPay"] or 0)),
            "totalGrossPay": clean(pc.js_round(g["totalGrossPay"] or 0)),
            "lastProcessedAt": iso(g["lastProcessedAt"]),
        } for g in groups]
        periods.sort(key=lambda p: (-(p["year"] or 0), -pc.get_month_index(p["month"])))
        return send_response(200, True, "Pay run periods fetched successfully",
                             {"periods": periods, "totalPeriods": len(periods)})

    normalized_month = pc.normalize_payroll_month(month)
    normalized_year = to_number(year if year is not None else UNDEFINED)
    if not normalized_month or pc.get_month_index(normalized_month) == -1:
        return send_response(400, False, "Valid month is required (Jan, Feb, ... or 1-12)")
    if not (math.isfinite(normalized_year) and float(normalized_year).is_integer()) \
            or normalized_year < 1900:
        return send_response(400, False, "Valid year is required")
    normalized_year = int(normalized_year)

    qs = PayrollRun.objects.filter(org=org, month=normalized_month, year=normalized_year)
    if pay_status:
        qs = qs.filter(pay_status=str(pay_status).lower())
    payrolls = _populated_runs(qs, SUMMARY_FIELDS)
    active_count = PayrollEmployee.objects.filter(org=org, status="Active").count()
    schedule = _schedule_dict(org, active_only=True)

    employees = _sort_by_name([pc.map_payroll_run_to_employee_summary(p) for p in payrolls])
    if search:
        term = str(search).strip().lower()
        employees = [r for r in employees if term in r["employeeName"].lower()
                     or term in js_str(r["employeeCode"]).lower()]

    page_num = parse_int(page)
    page_num = max(1, page_num if isinstance(page_num, int) and page_num else 1)
    page_size = parse_int(limit)
    page_size = min(200, max(1, page_size if isinstance(page_size, int) and page_size else 50))
    total = len(employees)
    paginated = employees[(page_num - 1) * page_size: page_num * page_size]
    summary = pc.build_pay_run_period_summary(payrolls, active_count, schedule,
                                              normalized_month, normalized_year)
    return send_response(200, True, "Pay run history fetched successfully", {
        "period": {
            "month": normalized_month, "year": normalized_year,
            "label": f"{normalized_month} {normalized_year}",
            "baseDays": summary["baseDays"] or len((schedule or {}).get("workingDays") or []),
            "payDay": summary["payDay"],
        },
        "summary": summary,
        "employees": paginated,
        "pagination": {"page": page_num, "limit": page_size, "total": total,
                       "totalPages": math.ceil(total / page_size) or 1},
    })


@payroll_view(["GET"])
def get_monthly_payroll_histroy(ctx):
    org = ctx.require_org()
    year = ctx.query("year")
    include_employees = ctx.query("includeEmployees")
    with_employees = str(include_employees if include_employees is not None else "true") \
        .lower() != "false"

    qs = PayrollRun.objects.filter(org=org)
    if year:
        numeric_year = to_number(year)
        if not (math.isfinite(numeric_year) and float(numeric_year).is_integer()) \
                or numeric_year < 1900:
            return send_response(400, False, "Valid year is required")
        qs = qs.filter(year=numeric_year)

    payrolls = _populated_runs(qs, SUMMARY_FIELDS)
    active_count = PayrollEmployee.objects.filter(org=org, status="Active").count()
    schedule = _schedule_dict(org, active_only=True)

    period_map = {}
    for p in payrolls:
        key = f"{p['month']}-{js_str(p['year'])}"
        period_map.setdefault(key, {"month": p["month"], "year": p["year"], "payrolls": []})
        period_map[key]["payrolls"].append(p)

    periods = sorted(period_map.values(),
                     key=lambda x: (-(x["year"] or 0), -pc.get_month_index(x["month"])))
    history = []
    for period in periods:
        summary = pc.build_pay_run_period_summary(period["payrolls"], active_count, schedule,
                                                  period["month"], period["year"])
        year_out = _year_out(period["year"])
        block = {
            "period": {
                "month": period["month"], "year": year_out,
                "label": f"{period['month']} {js_str(year_out)}",
                "baseDays": summary["baseDays"] or len((schedule or {}).get("workingDays") or []),
                "payDay": summary["payDay"],
            },
            "summary": summary,
        }
        if with_employees:
            block["employees"] = _sort_by_name(
                [pc.map_payroll_run_to_employee_summary(p) for p in period["payrolls"]])
        history.append(block)

    keys = ["payrollCost", "totalNetPay", "totalGrossPay", "totalDeductions", "taxes",
            "benefits", "reimbursements"]
    grand = {k: 0 for k in keys}
    for block in history:
        for k in keys:
            grand[k] += block["summary"].get(k) or 0
    return send_response(200, True, "Payroll full history fetched successfully",
                         {"totalPeriods": len(history), "grandTotals": grand,
                          "history": history})


@payroll_view(["GET"])
def get_payroll_history(ctx):
    org = ctx.require_org()
    month = ctx.query("month")
    year = ctx.query("year")
    employee_id = ctx.query("employeeId")
    qs = PayrollRun.objects.filter(org=org)
    if month:
        qs = qs.filter(month=month)
    if year:
        y = parse_int(year)
        qs = qs.filter(year=y) if isinstance(y, int) else qs.none()
    if employee_id:
        pk = _uuid_or_none(employee_id)
        qs = qs.filter(employee_id=pk) if pk else qs.none()
    runs = _populated_runs(qs, HISTORY_FIELDS)
    return send_response(200, True, "Payroll history fetched", {"total": len(runs),
                                                                "data": runs})


@payroll_view(["GET"])
def get_payroll_by_id(ctx, payrollId):
    org = ctx.require_org()
    run = get_run(org, payrollId)
    if run is None:
        return send_response(404, False, "Payroll record not found")
    breakdown = None
    try:
        breakdown = pc.build_paid_days_breakdown(run.employee, run.month, run.year)
    except Exception:  # noqa: BLE001 — legacy logged and continued
        logger.exception("Paid days breakdown failed")
    payload = run_dict(run, HISTORY_FIELDS)
    payload["paidDaysBreakdown"] = breakdown
    return send_response(200, True, "Payroll record fetched", payload)


# --------------------------------------------------------------------------- recalculation

@payroll_view(["PUT"])
def recalculate_payroll(ctx, payrollId):
    org = ctx.require_org()
    body = ctx.body
    preview_only = body.get("preview") is True or body.get("preview") == "true"
    paid_days_input = to_number(body.get("paidDays", UNDEFINED))
    if not math.isfinite(paid_days_input) or paid_days_input < 0:
        return send_response(400, False, "paidDays must be a number greater than or equal to 0")

    run = get_run(org, payrollId)
    if run is None:
        return send_response(404, False, "Payroll record not found")
    status = str(run.pay_status or "").lower()
    if status == "paid":
        return send_response(400, False, "Paid payroll cannot be edited. Reverse payment first.")

    calendar_days = pc.get_calendar_days_in_payroll_month(run.month, run.year)
    max_days = calendar_days if calendar_days > 0 else (to_number(run.working_days) or 0)
    if max_days > 0 and paid_days_input > max_days:
        return send_response(400, False, f"paidDays cannot be more than {js_str(max_days)} for "
                                         f"{run.month} {js_str(_year_out(run.year))}")
    employee = run.employee
    if employee is None:
        return send_response(404, False, "Employee not found")

    schedule = _schedule_dict(org)
    compliance = _compliance(org)
    components = _components(org)
    one_time = pc.load_one_time_rows_by_employee(org, run.month, run.year)
    calc = pc.calculate_employee_salary_improved(
        employee, components, compliance, run.month, clean(run.year), org, schedule,
        one_time.get(str(employee.pk)) or [],
        {"paidDays": paid_days_input, "excludePayrollId": run.pk})

    existing = run.to_dict()
    pc.preserve_existing_payroll_extras(existing, calc)
    payload = pc.build_payroll_calculator_payload(existing, calc, calendar_days)

    if preview_only:
        return send_response(200, True, "Payroll recalculation preview",
                             js_out({"preview": True, **payload}))

    old_tds = pc.get_payroll_tds_amount(existing)
    new_tds = pc.get_payroll_tds_amount(calc)
    before = {"grossEarnings": run.gross_earnings, "netPay": run.net_pay,
              "presentDays": run.present_days}
    pc.apply_calculation_to_run(run, calc)
    run.processed_date = timezone.now()
    run.remarks = f"Recalculated with paid days {js_str(payload['paidDays'])}"
    if status == "approved":
        run.pay_status = "processed"
        run.approved_date = None
    run.save()

    pc.sync_tds_after_payroll_recalc(org, employee.pk, run.month, clean(run.year), run.pk,
                                     old_tds, new_tds)
    log_payroll_action(ctx, action="payroll_processed", entity_type="payroll", entity_id=run.pk,
                       affected_employee=employee, before_data=before,
                       after_data={"grossEarnings": run.gross_earnings, "netPay": run.net_pay,
                                   "presentDays": run.present_days},
                       payroll_details={"month": run.month, "year": run.year,
                                        "grossEarnings": run.gross_earnings,
                                        "totalDeductions": run.total_deductions,
                                        "netPay": run.net_pay},
                       remarks=run.remarks)
    return send_response(200, True, "Payroll recalculated successfully",
                         js_out({"preview": False, **payload, "payStatus": run.pay_status}))


# --------------------------------------------------------------------------- status

VALID_STATUSES = ["processed", "approved", "rejected", "on_hold", "paid"]
_STATUS_AUDIT = {"approved": "payroll_approved", "rejected": "payroll_rejected",
                 "paid": "payroll_paid"}


def _status_update(body):
    pay_status = body.get("payStatus")
    status = body.get("status")
    normalized = js_str(js_or(pay_status, status, "")).lower()
    if normalized not in VALID_STATUSES:
        return normalized, None
    update = {"pay_status": normalized}
    remarks = body.get("remarks")
    if normalized == "approved":
        update["approved_date"] = timezone.now()
    if normalized == "paid":
        paid_on = body.get("paidOn")
        update["paid_date"] = parse_js_date(paid_on) if js_truthy(paid_on) else timezone.now()
    if normalized == "rejected":
        update["remarks"] = js_or(body.get("rejectionReason"), remarks, "Rejected")
    if normalized == "on_hold" and js_truthy(remarks):
        update["remarks"] = remarks
    return normalized, update


@payroll_view(["PUT"])
def update_payroll_status(ctx, payrollId):
    org = ctx.require_org()
    normalized, update = _status_update(ctx.body)
    if update is None:
        return send_response(400, False, "Invalid pay status")
    run = get_run(org, payrollId)
    if run is None:
        return send_response(404, False, "Payroll record not found")
    before = run.pay_status
    for attr, value in update.items():
        setattr(run, attr, value)
    run.save()
    log_payroll_action(ctx, action=_STATUS_AUDIT.get(normalized, "payroll_processed"),
                       entity_type="payroll", entity_id=run.pk, affected_employee=run.employee,
                       before_data={"payStatus": before}, after_data={"payStatus": normalized},
                       remarks=f"Status changed to {normalized}")
    return send_response(200, True, "Payroll status updated successfully", run.to_dict())


@payroll_view(["PUT"])
def bulk_update_payroll_status(ctx):
    org = ctx.require_org()
    body = ctx.body
    payroll_ids = body.get("payrollIds", [])
    if not isinstance(payroll_ids, list) or len(payroll_ids) == 0:
        return send_response(400, False, "Payroll IDs are required")
    normalized, update = _status_update(body)
    if update is None:
        return send_response(400, False, "Invalid pay status")

    pks = [u for u in (_uuid_or_none(x) for x in payroll_ids) if u]
    matched = modified = 0
    with transaction.atomic():
        for run in PayrollRun.objects.select_for_update().filter(org=org, pk__in=pks):
            matched += 1
            changed = any(getattr(run, a) != v for a, v in update.items())
            if changed:
                for attr, value in update.items():
                    setattr(run, attr, value)
                run.save()
                modified += 1
    log_payroll_action(ctx, action=_STATUS_AUDIT.get(normalized, "payroll_processed"),
                       entity_type="payroll", entity_id="bulk",
                       after_data={"payStatus": normalized, "payrollIds": [str(p) for p in pks]},
                       remarks=f"Bulk status {normalized}: {modified}/{len(payroll_ids)}")
    return send_response(200, True, "Bulk payroll status updated successfully", {
        "requestedCount": len(payroll_ids), "matchedCount": matched,
        "modifiedCount": modified, "payStatus": normalized})


# --------------------------------------------------------------------------- payslips

def _logo(profile):
    logo = profile.get("logo") or ""
    if not logo:
        return ""
    url = getattr(logo, "url", None)
    try:
        return str(url) if url else str(logo)
    except Exception:  # noqa: BLE001
        return ""


def _payslip_attendance(run):
    paid = to_number(js_nc(run.present_days, UNDEFINED))
    return {
        "workingDays": to_number(run.working_days) or 0,
        "paidDays": max(0, paid if math.isfinite(paid)
                        else (to_number(run.working_days) or 0) - (to_number(run.lop_days) or 0)),
        "presentDays": to_number(run.present_days) or 0,
    }


@payroll_view(["GET"])
def generate_payslip(ctx, payrollId):
    from ..services.salary_slip_pdf import merge_payslip_earnings_column

    org = ctx.require_org()
    run = get_run(org, payrollId)
    profile = bss_adapter.org_profile(org)
    if run is None:
        return send_response(404, False, "Payroll record not found")
    emp = employee_full(run.employee)
    payroll_info = emp.get("payrollInfo") or {}
    payslip = {
        "organization": {"name": profile.get("name") or "Organization Name",
                         "address": profile.get("address") or "", "logo": _logo(profile)},
        "employee": {
            "name": f"{emp.get('firstName')} {emp.get('lastName')}",
            "code": resolve_employee_display_code(emp),
            "email": emp.get("email"),
            "department": js_or((emp.get("departmentId") or {}).get("name"),
                                payroll_info.get("department"), ""),
            "designation": js_or(payroll_info.get("designation"), emp.get("jobTitle"), ""),
        },
        "payPeriod": {"month": run.month, "year": _year_out(run.year)},
        "earnings": merge_payslip_earnings_column(run.earnings, run.benefits, run.reimbursements),
        "deductions": run.deductions or [],
        "benefits": run.benefits or [],
        "reimbursements": run.reimbursements or [],
        "summary": {"grossEarnings": run.gross_earnings, "totalDeductions": run.total_deductions,
                    "netPay": run.net_pay},
        "attendance": _payslip_attendance(run),
    }
    return send_response(200, True, "Payslip generated successfully", js_out(payslip))


@payroll_view(["GET"])
def download_payslip_pdf(ctx, payrollId):
    from ..services.payslip_attendance import get_payslip_attendance_days
    from ..services.salary_slip_pdf import (build_salary_slip_pdf_buffer,
                                            merge_payslip_earnings_column)

    org = ctx.org
    if org is None or not payrollId:
        return send_response(400, False, "Missing required information")
    run = get_run(org, payrollId)
    if run is None or run.employee is None:
        return send_response(404, False, "Payslip not found")
    profile = bss_adapter.org_profile(org)
    emp = employee_projection(run.employee, PDF_FIELDS)
    payroll_info = emp.get("payrollInfo") or {}
    code = resolve_employee_display_code(emp, "N/A")
    month = run.month or ""
    year = _year_out(run.year) if run.year is not None else ""
    payslip_earnings = merge_payslip_earnings_column(run.earnings, run.benefits,
                                                     run.reimbursements)
    del payslip_earnings  # legacy built it for the JSON shape only
    attendance = get_payslip_attendance_days(str(org.pk), str(run.employee_id), run.month,
                                             run.year, run.to_dict())
    pdf = build_salary_slip_pdf_buffer({
        "organizationName": profile.get("name") or "Organization Name",
        "organizationAddress": profile.get("address") or "",
        "organizationLogo": _logo(profile),
        "employeeName": js_trim(f"{emp.get('firstName') or ''} {emp.get('lastName') or ''}"),
        "employeeCode": code,
        "department": js_or((emp.get("departmentId") or {}).get("name"),
                            payroll_info.get("department"), "N/A"),
        "pan": js_or((emp.get("nationalID") or {}).get("pan"), "N/A"),
        "bankName": js_or((emp.get("bankInfo") or {}).get("bankName"), "N/A"),
        "bankAccountNumber": js_or((emp.get("bankInfo") or {}).get("bankAccountNumber"), "N/A"),
        "payPeriodLabel": f"{month} {js_str(year)}",
        "earnings": run.earnings or [],
        "benefits": run.benefits or [],
        "reimbursements": run.reimbursements or [],
        "deductions": run.deductions or [],
        "grossEarnings": js_nc(run.gross_earnings, 0),
        "totalDeductions": js_nc(run.total_deductions, 0),
        "netPay": js_nc(run.net_pay, 0),
        "payStatus": run.pay_status or "pending",
        "workingDays": attendance.get("workingDays"),
        "paidDays": attendance.get("paidDays"),
    })
    safe_code = re.sub(r"[^\w.-]+", "_", js_str(code), flags=re.ASCII)
    safe_month = re.sub(r"[^\w.-]+", "_", js_str(month), flags=re.ASCII)
    return file_response(pdf, f"Payslip_{safe_code}_{safe_month}_{js_str(year)}.pdf",
                         "application/pdf")


@payroll_view(["DELETE"])
def delete_payroll_run(ctx, payrollId):
    org = ctx.require_org()
    run = get_run(org, payrollId)
    if run is None:
        return send_response(404, False, "Payroll record not found")
    pc.reverse_loan_repayments(org, run.employee_id, run.month, clean(run.year))
    details = {"month": run.month, "year": run.year, "grossEarnings": run.gross_earnings,
               "totalDeductions": run.total_deductions, "netPay": run.net_pay}
    emp = run.employee
    run_id = run.pk
    run.delete()
    log_payroll_action(ctx, action="payroll_deleted", entity_type="payroll", entity_id=run_id,
                       affected_employee=emp, payroll_details=details,
                       remarks="Payroll run deleted")
    return send_response(200, True, "Payroll run deleted successfully")


ROUTES = [
    ("processPayroll", process_payroll, "process_payroll"),
    ("getPayRunMonthlyData", get_pay_run_monthly_data, "get_pay_run_monthly_data"),
    ("getPayrollHistory", get_payroll_history, "get_payroll_history"),
    ("getMonthlyPayrollHistroy", get_monthly_payroll_histroy, "get_monthly_payroll_histroy"),
    ("getPayroll/<str:payrollId>", get_payroll_by_id, "get_payroll_by_id"),
    ("recalculatePayroll/<str:payrollId>", recalculate_payroll, "recalculate_payroll"),
    ("updatePayrollStatus/<str:payrollId>", update_payroll_status, "update_payroll_status"),
    ("updatePayrollStatusBulk", bulk_update_payroll_status, "bulk_update_payroll_status"),
    ("generatePayslip/<str:payrollId>", generate_payslip, "generate_payslip"),
    ("downloadPayslipPdf/<str:payrollId>", download_payslip_pdf, "download_payslip_pdf"),
    ("deletePayrollRun/<str:payrollId>", delete_payroll_run, "delete_payroll_run"),
]
