"""Payroll run engine — internal helpers of ``controller/payroll/payrollRun.js``.

Port of every non-exported helper in the legacy pay-run controller (the salary
calculator, LOP / paid-days logic, pay-run summaries, TDS sync). The HTTP views live
in ``views/payroll_run.py``; this module holds the pure / DB logic so the views and the
auto-payroll runner share it.

Legacy -> port:
    getMonthIndex                        -> get_month_index
    normalizePayrollMonth                -> normalize_payroll_month
    getCalendarDaysInPayrollMonth        -> get_calendar_days_in_payroll_month
    roundCurrency                        -> round_currency
    resolveEmployeeStatutoryState        -> resolve_employee_statutory_state
    prorateSalaryLines                   -> prorate_salary_lines
    applyBenefitsProration               -> apply_benefits_proration
    sumLineItems                         -> sum_line_items
    getPayrollTdsAmount                  -> get_payroll_tds_amount
    clonePayrollLine / payrollLineKey / ensurePayrollLines
    preserveExistingPayrollExtras        -> preserve_existing_payroll_extras
    buildPayrollCalculatorPayload        -> build_payroll_calculator_payload
    syncTdsAfterPayrollRecalc            -> sync_tds_after_payroll_recalc
    sumTaxes / formatPayDay / formatPayDayFromDate
    mapPayrollRunToEmployeeSummary       -> map_payroll_run_to_employee_summary
    buildPayRunPeriodSummary             -> build_pay_run_period_summary
    getMonthDateRange                    -> get_month_date_range
    isDateInPayrollMonth                 -> is_date_in_payroll_month
    buildReimbursementsFromApprovedClaims-> build_reimbursements_from_approved_claims
    calculateLeaveOverlapDays            -> calculate_leave_overlap_days
    getEmployeePaidLeavesForMonth        -> get_employee_paid_leaves_for_month
    getEmployeePresentDaysForMonth       -> get_employee_present_days_for_month
    getBonusAccountingYearWorkedDays     -> get_bonus_accounting_year_worked_days
    calculateEmployeeSalaryImproved      -> calculate_employee_salary_improved
    isShiftWeeklyOff / rememberAttendanceStatus / addPaidLeaveDays
    buildPaidDaysBreakdown               -> build_paid_days_breakdown
    calculateEmployeeWorkingDays         -> calculate_employee_working_days
    calculateWorkingDaysInMonth          -> calculate_working_days_in_month
    calculateEmployeeSalary              -> calculate_employee_salary (legacy, unused path)

BSS data: attendance / approved leaves / holidays / shift come from ``bss_adapter``
(legacy-shaped rows), so the day-classification logic below is the legacy logic
unchanged. Mongoose model parameters are dropped (Django models are used directly).

Dates: legacy ``Date`` values are local (server TZ Asia/Kolkata). Here they are aware
``datetime``s in ``LOCAL_TZ`` (or ``date``s for calendar days).
"""

import copy
import logging
import math
import re
from datetime import date, datetime, timedelta

from .financial_year import (LOCAL_TZ, _to_instant, get_accounting_year_periods_up_to,
                             get_financial_year_aliases_from_payroll,
                             get_payroll_month_tds_factor, to_calendar_date)
from .jsmath import (UNDEFINED, clean, is_finite, is_nullish, js_max, js_min, js_mul, js_nc,
                     js_or, js_out, js_round, js_str, js_trim, js_truthy, num0, to_number)

logger = logging.getLogger("payroll_engine")

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_MAP = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec",
}
# ``toLocaleString('en-IN', { month: 'short' })`` (ICU) — September is "Sept".
EN_IN_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct",
                      "Nov", "Dec"]
PAID_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
PAID_DAY_WEEK_KEYS = ["firstWeek", "secondWeek", "thirdWeek", "fourthWeek", "fifthWeek"]

_LOP_RE = re.compile(r"^(loss\s*of\s*pay|lop)$", re.IGNORECASE)
_TDS_RE = re.compile(r"^tds$", re.IGNORECASE)
_TAX_RE = re.compile(r"tds|tax", re.IGNORECASE)
_ARREARS_RE = re.compile(r"^arrears$", re.IGNORECASE)
_LOAN_EMI_RE = re.compile(r"loan\s*emi", re.IGNORECASE)


# --------------------------------------------------------------------------- small helpers

def _get(obj, key, default=UNDEFINED):
    """``obj?.key`` on dict-shaped legacy docs (missing -> ``UNDEFINED``)."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default


def _js_weekday(d):
    """``Date.getDay()`` (0 = Sunday) for a ``date``."""
    return (d.weekday() + 1) % 7


def js_local_datetime(value):
    """``new Date(value)`` read with local getters -> aware LOCAL_TZ datetime or None."""
    if value is None or value is UNDEFINED or value == "":
        return None if value != "" else None
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime(value.year, value.month, value.day, tzinfo=LOCAL_TZ)
    instant = _to_instant(value)
    if instant is None:
        return None
    return instant.astimezone(LOCAL_TZ)


def _as_local(value):
    """Comparable local datetime for a ``date`` / ``datetime`` / string."""
    return js_local_datetime(value)


def get_month_index(month_name):
    try:
        return MONTHS.index(month_name)
    except ValueError:
        return -1


def normalize_payroll_month(month_value):
    if month_value is None or month_value is UNDEFINED:
        return None
    raw = js_trim(js_str(month_value))
    if not raw:
        return None
    for m in MONTHS:
        if m.lower() == raw.lower():
            return m
    mapped = MONTH_MAP.get(raw.lower())
    if mapped:
        return mapped
    numeric = to_number(raw)
    if math.isfinite(numeric) and float(numeric).is_integer() and 1 <= numeric <= 12:
        return MONTHS[int(numeric) - 1]
    return raw


def _days_in_month(year, month_index):
    y = int(year) + month_index // 12
    m = month_index % 12
    nxt = date(y + (1 if m == 11 else 0), 1 if m == 11 else m + 2, 1)
    return (nxt - timedelta(days=1)).day


def get_calendar_days_in_payroll_month(month, year):
    month_index = get_month_index(normalize_payroll_month(month))
    numeric_year = to_number(year)
    if month_index == -1 or not (math.isfinite(numeric_year) and float(numeric_year).is_integer()):
        return 0
    return _days_in_month(int(numeric_year), month_index)


def round_currency(amount):
    return js_round(num0(amount) * 100) / 100


def resolve_employee_statutory_state(employee=None):
    employee = employee or {}
    stat = _get(employee, "statutoryInfo")
    return js_or(
        _get(stat, "lwfState"),
        _get(stat, "ptState"),
        _get(employee, "state"),
        _get(_get(employee, "address"), "state"),
        _get(_get(employee, "workLocation"), "state"),
        None,
    )


def prorate_salary_lines(lines, calendar_days, paid_days):
    if not isinstance(lines, list) or calendar_days <= 0:
        return
    payable_days = js_max(0, js_min(num0(paid_days), calendar_days))
    for line in lines:
        if _get(line, "calculationType") == "statutory":
            fixed_amount = js_max(0, num0(_get(line, "amount")))
            line["fixedAmount"] = round_currency(fixed_amount)
            continue
        fixed_amount = js_max(0, num0(_get(line, "amount")))
        line["fixedAmount"] = round_currency(fixed_amount)
        line["amount"] = round_currency((fixed_amount / calendar_days) * payable_days)


def apply_benefits_proration(benefits, calendar_days, paid_days):
    """Benefits: only lines with calculateOnProRata are day-prorated; others keep full amount."""
    if not isinstance(benefits, list) or len(benefits) == 0:
        return
    to_prorate = []
    for line in benefits:
        if js_truthy(_get(line, "calculateOnProRata")):
            to_prorate.append(line)
        else:
            line["fixedAmount"] = round_currency(js_max(0, num0(_get(line, "amount"))))
        line.pop("calculateOnProRata", None)  # runtime-only flag
    prorate_salary_lines(to_prorate, calendar_days, paid_days)


def sum_line_items(items=None):
    total = 0
    for item in items or []:
        total += num0(_get(item, "amount"))
    return total


def get_payroll_tds_amount(payroll_like=None):
    payroll_like = payroll_like or {}
    line = None
    for item in _get(payroll_like, "deductions") or []:
        if _TDS_RE.search(js_trim(js_str(js_or(_get(item, "componentName"), "")))):
            line = item
            break
    return round_currency(abs(num0(_get(line, "amount"))))


def clone_payroll_line(line=None):
    plain = dict(line or {})
    return js_out({
        "componentName": plain.get("componentName", UNDEFINED),
        "amount": num0(plain.get("amount")),
        "fixedAmount": js_or(num0(plain.get("fixedAmount")), num0(plain.get("amount")), 0),
        "calculationType": js_or(plain.get("calculationType"), ""),
        "componentId": plain.get("componentId", UNDEFINED),
        "claimId": plain.get("claimId", UNDEFINED),
        "loanId": plain.get("loanId", UNDEFINED),
    })


def payroll_line_key(line=None):
    return js_trim(js_str(js_or(_get(line or {}, "componentName"), ""))).lower()


def ensure_payroll_lines(target=None, extras=None):
    target = target if target is not None else []
    have = {payroll_line_key(x) for x in target}
    for line in extras or []:
        key = payroll_line_key(line)
        if not key or key in have:
            continue
        target.append(clone_payroll_line(line))
        have.add(key)
    return target


def preserve_existing_payroll_extras(existing_payroll, salary_calculation):
    """Keep arrears / loan-EMI / reimbursement lines of a saved run on recalculation."""
    existing_earnings = _get(existing_payroll, "earnings") or []
    existing_deductions = _get(existing_payroll, "deductions") or []
    existing_reimbursements = _get(existing_payroll, "reimbursements") or []

    ensure_payroll_lines(salary_calculation["earnings"], [
        line for line in existing_earnings
        if _ARREARS_RE.search(js_str(js_or(_get(line, "componentName"), "")))
        or js_str(js_or(_get(line, "calculationType"), "")).lower() == "arrears"
    ])
    ensure_payroll_lines(salary_calculation["deductions"], [
        line for line in existing_deductions
        if _LOAN_EMI_RE.search(js_str(js_or(_get(line, "componentName"), "")))
    ])
    ensure_payroll_lines(salary_calculation["reimbursements"], existing_reimbursements)

    total_earnings = sum_line_items(salary_calculation["earnings"])
    total_benefits = sum_line_items(salary_calculation["benefits"])
    total_reimbursements = sum_line_items(salary_calculation["reimbursements"])
    salary_calculation["grossEarnings"] = round_currency(
        total_earnings + total_benefits + total_reimbursements)
    salary_calculation["totalDeductions"] = round_currency(
        sum_line_items(salary_calculation["deductions"]))
    salary_calculation["netPay"] = round_currency(
        salary_calculation["grossEarnings"] - salary_calculation["totalDeductions"])
    salary_calculation["tdsAmount"] = get_payroll_tds_amount(salary_calculation)
    return salary_calculation


def build_payroll_calculator_payload(payroll, salary_calculation, calendar_days):
    """``payroll`` is the run's legacy dict (``PayrollRun.to_dict()``)."""
    paid_days = to_number(js_nc(salary_calculation.get("presentDays"), UNDEFINED))
    return {
        "payrollId": _get(payroll, "_id"),
        "employeeId": _get(payroll, "employeeId"),
        "month": _get(payroll, "month"),
        "year": _get(payroll, "year"),
        "payStatus": _get(payroll, "payStatus"),
        "calendarDays": calendar_days,
        "workingDays": salary_calculation["workingDays"],
        "paidDays": paid_days if math.isfinite(paid_days) else calendar_days,
        "lopDays": salary_calculation["lopDays"],
        "earnings": salary_calculation["earnings"],
        "deductions": salary_calculation["deductions"],
        "benefits": salary_calculation["benefits"],
        "reimbursements": salary_calculation["reimbursements"],
        "grossEarnings": salary_calculation["grossEarnings"],
        "totalDeductions": salary_calculation["totalDeductions"],
        "netPay": salary_calculation["netPay"],
        "employerContributions": salary_calculation["employerContributions"],
        "epfDetails": salary_calculation["epfDetails"],
        "esiDetails": salary_calculation["esiDetails"],
        "ptDetails": salary_calculation["ptDetails"],
        "lwfDetails": salary_calculation["lwfDetails"],
        "bonusDetails": salary_calculation["bonusDetails"],
    }


def find_tds_record(org, employee_id, month, year, for_update=False):
    """``EmployeeTDSModel.findOne({organizationId, employeeId, financialYear: {$in: aliases}})``."""
    from ..models import EmployeeTDS

    aliases = get_financial_year_aliases_from_payroll(month, year)
    qs = EmployeeTDS.objects.filter(org=org, employee_id=employee_id, financial_year__in=aliases)
    if for_update:
        qs = qs.select_for_update()
    return qs.order_by("created_at").first()


def sync_tds_after_payroll_recalc(organization, employee_id, month, year, payroll_id, old_tds,
                                  new_tds):
    from django.db import transaction

    from ..models.employee_tds import new_monthly_deduction

    delta = round_currency(num0(new_tds) - num0(old_tds))
    if delta == 0:
        return
    with transaction.atomic():
        record = find_tds_record(organization, employee_id, month, year, for_update=True)
        if record is None:
            return
        deductions = list(record.monthly_deductions or [])
        entry = next((d for d in deductions if js_str(d.get("payrollId")) == str(payroll_id)), None)
        if entry is not None:
            entry["tdsDeducted"] = clean(round_currency(num0(new_tds)))
        elif to_number(new_tds) > 0:
            deductions.append(new_monthly_deduction(
                month=month, year=clean(to_number(year)),
                tdsDeducted=clean(round_currency(num0(new_tds))), payrollId=str(payroll_id)))
        record.monthly_deductions = deductions
        record.total_tds_deducted = js_max(0, round_currency(num0(record.total_tds_deducted) + delta))
        record.save()


def sum_taxes(deductions=None):
    total = 0
    for d in deductions or []:
        if _TAX_RE.search(js_str(js_or(_get(d, "componentName"), ""))):
            total += num0(_get(d, "amount"))
    return total


def format_pay_day_from_date(date_val):
    d = js_local_datetime(date_val)
    if d is None:
        return None
    return f"{d.day:02d} {EN_IN_SHORT_MONTHS[d.month - 1].upper()}, {d.year}"


def format_pay_day(month, year, pay_day_value):
    month_idx = get_month_index(month)
    if month_idx == -1:
        return None
    parsed = _parse_int(js_str(js_or(pay_day_value, "7")))
    day = min(max(parsed if parsed else 7, 1), 31)
    y = int(to_number(year))
    first = date(y, month_idx + 1, 1)
    return format_pay_day_from_date(first + timedelta(days=day - 1))


def _parse_int(text):
    m = re.match(r"^\s*[+-]?\d+", text or "")
    return int(m.group()) if m else None


def map_payroll_run_to_employee_summary(payroll):
    """``payroll`` = run dict whose ``employeeId`` is the populated employee dict."""
    from .employee_display import resolve_employee_display_code

    employee = js_or(_get(payroll, "employeeId"), {})
    if not isinstance(employee, dict):
        employee = {}
    bank_info = js_or(_get(employee, "bankInfo"), {})
    earnings_total = sum_line_items(_get(payroll, "earnings") or [])
    benefits_total = sum_line_items(_get(payroll, "benefits") or [])
    reimbursement_total = sum_line_items(_get(payroll, "reimbursements") or [])
    taxes_total = sum_taxes(_get(payroll, "deductions") or [])
    deductions_total = js_max(0, num0(_get(payroll, "totalDeductions")) - taxes_total)
    stored_present = to_number(js_nc(_get(payroll, "presentDays"), UNDEFINED))
    if math.isfinite(stored_present):
        paid_days = js_max(0, stored_present)
    else:
        paid_days = js_max(0, num0(_get(payroll, "workingDays")) - num0(_get(payroll, "lopDays")))
    payroll_info = _get(employee, "payrollInfo")
    return js_out({
        "payrollId": _get(payroll, "_id"),
        "employeeId": js_or(_get(employee, "_id"), _get(payroll, "employeeId")),
        "employeeName": js_trim(f"{js_or(_get(employee, 'firstName'), '')} "
                                f"{js_or(_get(employee, 'lastName'), '')}"),
        "employeeCode": resolve_employee_display_code(employee),
        "department": js_or(_get(_get(employee, "departmentId"), "name"),
                            _get(payroll_info, "department"), ""),
        "designation": js_or(_get(payroll_info, "designation"), ""),
        "bankAccountNumber": js_or(_get(bank_info, "bankAccountNumber"), ""),
        "bankName": js_or(_get(bank_info, "bankName"), ""),
        "branchName": js_or(_get(bank_info, "branchName"), ""),
        "ifscCode": js_or(_get(bank_info, "ifscCode"), ""),
        "paidDays": paid_days,
        "workingDays": js_or(_get(payroll, "workingDays"), 0),
        "presentDays": js_or(_get(payroll, "presentDays"), 0),
        "lopDays": js_or(_get(payroll, "lopDays"), 0),
        "grossPay": js_or(earnings_total, js_max(0, num0(_get(payroll, "grossEarnings"))
                                                 - benefits_total - reimbursement_total)),
        "deductions": deductions_total,
        "taxes": taxes_total,
        "benefits": benefits_total,
        "reimbursement": reimbursement_total,
        "netPay": js_or(_get(payroll, "netPay"), 0),
        "payStatus": js_or(_get(payroll, "payStatus"), "pending"),
        "paymentMode": js_or(_get(payroll, "paymentMode"), None),
        "paidDate": js_or(_get(payroll, "paidDate"), None),
        "processedDate": js_or(_get(payroll, "processedDate"), _get(payroll, "createdAt"), None),
    })


def build_pay_run_period_summary(payrolls=None, active_employee_count=0, schedule=None, month=None,
                                 year=None):
    payrolls = payrolls or []
    total_gross_pay = total_deductions = total_taxes = total_benefits = 0
    total_reimbursements = total_net_pay = total_employer_cost = 0
    base_days = 0
    status_wise = {"pending": 0, "processed": 0, "approved": 0, "rejected": 0, "on_hold": 0,
                   "paid": 0}
    for payroll in payrolls:
        row = map_payroll_run_to_employee_summary(payroll)
        total_gross_pay += row["grossPay"]
        total_deductions += row["deductions"]
        total_taxes += row["taxes"]
        total_benefits += row["benefits"]
        total_reimbursements += row["reimbursement"]
        total_net_pay += row["netPay"]
        total_employer_cost += (num0(_get(payroll, "grossEarnings"))
                                + num0(_get(_get(payroll, "employerContributions"), "total")))
        base_days = js_max(base_days, num0(_get(payroll, "workingDays")))
        status = js_or(_get(payroll, "payStatus"), "pending")
        status_wise[status] = status_wise.get(status, 0) + 1

    paid_payroll = next((p for p in payrolls if js_truthy(_get(p, "paidDate"))), None)
    if paid_payroll is not None:
        pay_day = format_pay_day_from_date(_get(paid_payroll, "paidDate"))
    elif js_truthy(_get(schedule, "payDay")):
        pay_day = format_pay_day(month, year, _get(schedule, "payDay"))
    else:
        pay_day = None

    return js_out({
        "payrollCost": js_round(js_or(total_employer_cost, total_net_pay)),
        "totalNetPay": js_round(total_net_pay),
        "totalGrossPay": js_round(total_gross_pay),
        "totalDeductions": js_round(total_deductions),
        "taxes": js_round(total_taxes),
        "benefits": js_round(total_benefits),
        "reimbursements": js_round(total_reimbursements),
        "donations": 0,
        "employeeCount": len(payrolls),
        "skippedEmployees": js_max(0, active_employee_count - len(payrolls)),
        "baseDays": base_days,
        "payDay": pay_day,
        "statusWise": status_wise,
    })


def get_month_date_range(year, month_name):
    """Local month bounds: ``{startDate: 00:00:00.000, endDate: last day 23:59:59.999}``."""
    month_index = get_month_index(month_name)
    if month_index == -1:
        return None
    y = int(to_number(year))
    start = datetime(y, month_index + 1, 1, tzinfo=LOCAL_TZ)
    last = _days_in_month(y, month_index)
    end = datetime(y, month_index + 1, last, 23, 59, 59, 999000, tzinfo=LOCAL_TZ)
    return {"startDate": start, "endDate": end}


def is_date_in_payroll_month(date_val, month_name, year):
    if not js_truthy(date_val):
        return False
    d = js_local_datetime(date_val)
    if d is None:
        return False
    idx = get_month_index(month_name)
    if idx == -1:
        return False
    return d.year == to_number(year) and d.month - 1 == idx


# --------------------------------------------------------------------------- DB-backed helpers

def build_reimbursements_from_approved_claims(organization, employee_id, month_name, year):
    """Approved, not-yet-paid reimbursement claims dated in the payroll month."""
    from ..models import ClaimsDeclaration

    lst = []
    sub_ids = []
    claim_doc = ClaimsDeclaration.objects.filter(org=organization, employee_id=employee_id) \
        .order_by("created_at").first()
    if claim_doc is None or not claim_doc.reimbursements:
        return {"reimbursements": lst, "reimbursementClaimSubIds": sub_ids}
    for r in claim_doc.reimbursements:
        if r.get("status") != "approved":
            continue
        if js_truthy(r.get("includedInPayrollId")):
            continue
        ref_date = js_or(r.get("claimDate", UNDEFINED), r.get("submittedOn", UNDEFINED))
        if not is_date_in_payroll_month(ref_date, month_name, year):
            continue
        approved = r.get("approvedAmount")
        if approved is not None and to_number(approved) > 0:
            amount = approved
        else:
            amount = js_or(r.get("claimedAmount"), 0)
        if not (to_number(amount) > 0):
            continue
        title = js_or(r.get("headName"), r.get("name"), "Reimbursement")
        component_name = f"{title} ({r['claimNo']})" if js_truthy(r.get("claimNo")) else title
        lst.append({"componentName": component_name, "amount": amount,
                    "calculationType": "approved_claim", "claimId": r.get("_id")})
        sub_ids.append(r.get("_id"))
    return {"reimbursements": lst, "reimbursementClaimSubIds": sub_ids}


def calculate_leave_overlap_days(leave, month_start, month_end):
    leave_start = js_local_datetime(_get(leave, "startDate"))
    leave_end = js_local_datetime(_get(leave, "endDate"))
    if leave_start is None or leave_end is None:
        return 0
    overlap_start = leave_start if leave_start > month_start else month_start
    overlap_end = leave_end if leave_end < month_end else month_end
    if overlap_start > overlap_end:
        return 0
    if _get(leave, "leaveDurationType") == "Half-Day":
        return 0.5
    cluster = _get(leave, "clusterDates")
    if _get(leave, "leaveDurationType") == "Cluster" and isinstance(cluster, list) and cluster:
        count = 0
        n_start = month_start.date()
        n_end = month_end.date()
        for cd in cluster:
            d = js_local_datetime(cd)
            if d is None:
                continue
            if n_start <= d.date() <= n_end:
                count += 1
        return count
    return (overlap_end.date() - overlap_start.date()).days + 1


def get_employee_paid_leaves_for_month(employee, month, year):
    """Approved Paid / On-Duty leave days overlapping the month (BSS LeaveRequest)."""
    from .. import bss_adapter

    month_range = get_month_date_range(year, month)
    if not month_range:
        return 0
    approved = bss_adapter.approved_leaves(employee, month_range["startDate"].date(),
                                           month_range["endDate"].date())
    if not approved:
        return 0
    paid = [lv for lv in approved
            if _get(_get(lv, "leaveTypeId"), "leaveType") in ("Paid", "On Duty")]
    total = 0
    for lv in paid:
        total += calculate_leave_overlap_days(lv, month_range["startDate"], month_range["endDate"])
    return total


def get_employee_present_days_for_month(employee, month, year):
    """Present = 1, HalfDay = 0.5 over the month's attendance rows (BSS Attendance)."""
    from .. import bss_adapter

    month_range = get_month_date_range(year, month)
    if not month_range:
        return 0
    rows = bss_adapter.attendance_rows(employee, month_range["startDate"].date(),
                                       month_range["endDate"].date())
    total = 0
    for row in rows:
        if row.get("status") == "Present":
            total += 1
        elif row.get("status") == "HalfDay":
            total += 0.5
    return total


def get_bonus_accounting_year_worked_days(employee, month, year, current_month_worked_days=None):
    """Sum present + paid-leave days from Apr through the payroll month (Bonus Act year)."""
    periods = get_accounting_year_periods_up_to(month, year)
    if not periods:
        return None
    total = 0
    for period in periods:
        is_current = period["month"] == month and to_number(period["year"]) == to_number(year)
        if is_current and current_month_worked_days is not None:
            total += js_max(0, num0(current_month_worked_days))
            continue
        present = get_employee_present_days_for_month(employee, period["month"], period["year"])
        paid_leaves = get_employee_paid_leaves_for_month(employee, period["month"], period["year"])
        total += present + paid_leaves
    return total


def calculate_employee_working_days(employee, year, month_name):
    """Working days for the employee's shift (site weekly offs) minus site holidays."""
    from .. import bss_adapter

    try:
        if month_name not in MONTHS:
            return 26
        month_index = MONTHS.index(month_name)
        shift = bss_adapter.employee_shift(employee)
        if not shift:
            return 26
        y = int(to_number(year))
        start = date(y, month_index + 1, 1)
        last_day = _days_in_month(y, month_index)
        end = date(y, month_index + 1, last_day)
        holidays = bss_adapter.holidays(employee, start, end)
        holiday_dates = set()
        for h in holidays:
            d = js_local_datetime(h.get("date"))
            if d is not None:
                holiday_dates.add(d.day)
        working = 0
        weekly_off = shift.get("weeklyOff")
        for day in range(1, last_day + 1):
            current = date(y, month_index + 1, day)
            day_name = PAID_DAY_NAMES[_js_weekday(current)]
            if day in holiday_dates:
                continue
            week_number = math.ceil(day / 7)
            is_weekly_off = False
            if weekly_off:
                week_key = PAID_DAY_WEEK_KEYS[min(week_number - 1, 4)]
                wk = weekly_off.get(week_key)
                if wk and wk.get("days"):
                    if day_name in wk["days"]:
                        is_weekly_off = True
            if not is_weekly_off:
                working += 1
        return working or 26
    except Exception:  # noqa: BLE001 — legacy: default on error
        logger.exception("Error calculating employee working days")
        return 26


def calculate_working_days_in_month(year, month_name, working_days_array):
    if month_name not in MONTHS:
        return 26
    month_index = MONTHS.index(month_name)
    y = int(to_number(year))
    last_day = _days_in_month(y, month_index)
    day_map = {"Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4,
               "Friday": 5, "Saturday": 6}
    numbers = [day_map.get(d) for d in working_days_array]
    working = 0
    for day in range(1, last_day + 1):
        if _js_weekday(date(y, month_index + 1, day)) in numbers:
            working += 1
    return working or 26


# --------------------------------------------------------------------------- paid-days picture

def is_shift_weekly_off(shift, day, day_name):
    if not js_truthy(_get(shift, "weeklyOff")) or not day_name:
        return False
    week_number = math.ceil(day / 7)
    week_key = PAID_DAY_WEEK_KEYS[min(week_number - 1, 4)]
    days = _get(_get(shift["weeklyOff"], week_key), "days")
    days = days if isinstance(days, list) else []
    return day_name in days


_ATT_RANK = {"Present": 5, "HalfDay": 4, "On Duty": 3, "Leave": 2, "Absent": 1, "Lwp": 1}


def remember_attendance_status(current, nxt):
    if not current:
        return nxt
    return nxt if _ATT_RANK.get(nxt, 0) >= _ATT_RANK.get(current, 0) else current


def add_paid_leave_days(leave, year, month_index, leave_by_day):
    lt = _get(leave, "leaveTypeId")
    category = _get(lt, "leaveType")
    paid = category in ("Paid", "On Duty")
    named = _get(_get(lt, "leaveNameId"), "name")
    type_name = js_or(named, "On Duty" if category == "On Duty" else ("Paid leave" if paid
                                                                      else "Unpaid leave"))
    month_start = date(year, month_index + 1, 1)
    month_end = date(year, month_index + 1, _days_in_month(year, month_index))

    def put(d, half):
        if not d or d.year != year or d.month - 1 != month_index:
            return
        existing = leave_by_day.get(d.day)
        if not existing or (existing["half"] and not half) or (not existing["paid"] and paid):
            leave_by_day[d.day] = {"name": type_name, "half": bool(half), "paid": paid}

    cluster = _get(leave, "clusterDates")
    if _get(leave, "leaveDurationType") == "Cluster" and isinstance(cluster, list):
        for cd in cluster:
            put(to_calendar_date(cd), False)
        return
    start = to_calendar_date(_get(leave, "startDate"))
    end = to_calendar_date(_get(leave, "endDate"))
    if not start or not end:
        return
    frm = start if start > month_start else month_start
    to = end if end < month_end else month_end
    if frm > to:
        return
    if _get(leave, "leaveDurationType") == "Half-Day":
        put(frm, True)
        return
    cursor = frm
    while cursor <= to:
        put(cursor, False)
        cursor += timedelta(days=1)


def build_paid_days_breakdown(employee, month, year):
    """Day picture behind paid days (present / absent / week off / holiday / unmarked).

    ``employee`` is a PayrollEmployee. Same counting rules as the salary calculation."""
    from .. import bss_adapter

    month_name = normalize_payroll_month(month)
    month_index = get_month_index(month_name)
    numeric_year = to_number(year)
    if employee is None or month_index == -1 or not (
            math.isfinite(numeric_year) and float(numeric_year).is_integer()):
        return None
    y = int(numeric_year)
    calendar_days = _days_in_month(y, month_index)
    start = date(y, month_index + 1, 1)
    end = date(y, month_index + 1, calendar_days)

    shift = bss_adapter.employee_shift(employee)

    holiday_by_day = {}
    for h in bss_adapter.holidays(employee, start, end):
        d = to_calendar_date(h.get("date"))
        if not d or d.year != y or d.month - 1 != month_index:
            continue
        if d.day not in holiday_by_day:
            holiday_by_day[d.day] = {"name": js_or(h.get("holidayName"), "Holiday"),
                                     "type": js_or(h.get("type"), "Company")}

    attendance_by_day = {}
    for row in bss_adapter.attendance_rows(employee, start, end):
        d = to_calendar_date(row.get("date"))
        if not d or d.year != y or d.month - 1 != month_index:
            continue
        attendance_by_day[d.day] = remember_attendance_status(attendance_by_day.get(d.day),
                                                              js_or(row.get("status"), "Present"))

    leave_by_day = {}
    for leave in bss_adapter.approved_leaves(employee, start, end) or []:
        add_paid_leave_days(leave, y, month_index, leave_by_day)

    days = []
    holiday_list = []
    week_off_days = holiday_days = present_full = half_days = absent_days = 0
    paid_leave_days = unpaid_leave_days = unmarked_days = working_days = 0

    for day in range(1, calendar_days + 1):
        d = date(y, month_index + 1, day)
        day_name = PAID_DAY_NAMES[_js_weekday(d)]
        holiday = holiday_by_day.get(day)
        week_off = not holiday and is_shift_weekly_off(shift, day, day_name)
        is_working = not holiday and not week_off
        if is_working:
            working_days += 1
        status = attendance_by_day.get(day)
        leave_info = leave_by_day.get(day) if is_working else None
        kind, title = "unmarked", "No attendance"
        if holiday:
            kind, title = "holiday", holiday["name"]
            holiday_days += 1
            holiday_list.append({"day": day, "name": holiday["name"], "type": holiday["type"]})
        elif week_off:
            kind, title = "weekoff", "Week off"
            week_off_days += 1
        elif status == "Present":
            kind, title = "present", "Present"
            present_full += 1
        elif status == "HalfDay":
            kind, title = "half", "Half day"
            half_days += 1
        elif leave_info and leave_info["paid"]:
            kind = "leave"
            title = f"{leave_info['name']} (half)" if leave_info["half"] else leave_info["name"]
            paid_leave_days += 0.5 if leave_info["half"] else 1
        elif leave_info:
            kind = "unpaidLeave"
            title = f"{leave_info['name']} (half)" if leave_info["half"] else leave_info["name"]
            unpaid_leave_days += 0.5 if leave_info["half"] else 1
        elif status in ("Leave", "On Duty"):
            kind = "unpaidLeave"
            title = "On Duty" if status == "On Duty" else "Leave"
            unpaid_leave_days += 1
        elif status in ("Absent", "Lwp"):
            kind = "absent"
            title = "LWP" if status == "Lwp" else "Absent"
            absent_days += 1
        else:
            unmarked_days += 1
        days.append({"day": day, "weekday": day_name[:3], "kind": kind, "title": title})

    present_days = present_full + half_days * 0.5
    earned = min(present_days + paid_leave_days, working_days)
    lop_days = max(0, working_days - earned)
    paid_days = max(0, calendar_days - lop_days)
    return js_out({
        "calendarDays": calendar_days,
        "workingDays": working_days,
        "paidDays": paid_days,
        "lopDays": lop_days,
        "presentDays": present_full,
        "halfDays": half_days,
        "absentDays": absent_days,
        "weekOffDays": week_off_days,
        "holidayDays": holiday_days,
        "paidLeaveDays": paid_leave_days,
        "unpaidLeaveDays": unpaid_leave_days,
        "unmarkedDays": unmarked_days,
        "startWeekday": _js_weekday(start),
        "shiftName": js_or(_get(shift, "name"), ""),
        "holidays": holiday_list,
        "days": days,
    })


# --------------------------------------------------------------------------- cross-module calls

def _optional(module_path):
    """Lazy import of a module owned by another port (None when not available yet)."""
    import importlib

    try:
        return importlib.import_module(module_path)
    except ModuleNotFoundError as exc:
        if module_path.rsplit(".", 1)[-1] in str(exc):
            logger.warning("payroll_engine: %s not available — feature skipped", module_path)
            return None
        raise


def _vpf_module():
    return _optional("payroll_engine.views.vpf_management")


def _one_time_module():
    return _optional("payroll_engine.services.one_time_import_helper")


def _loan_module():
    return _optional("payroll_engine.services.loan_helper")


def _loan_perq_module():
    return _optional("payroll_engine.services.loan_perquisite_helper")


def load_one_time_rows_by_employee(organization, month, year):
    """``groupOneTimeRowsByEmployee(await loadConfirmedOneTimeImportRows(...))`` -> dict."""
    mod = _one_time_module()
    if mod is None:
        return {}
    rows = mod.load_confirmed_one_time_import_rows(organization, month, year)
    grouped = mod.group_one_time_rows_by_employee(rows or [])
    return {str(k): v for k, v in dict(grouped or {}).items()}


def _merge_one_time_into_overrides(overrides, one_time_rows):
    mod = _one_time_module()
    if mod is None or not one_time_rows:
        return overrides
    return mod.merge_one_time_into_overrides(overrides, one_time_rows)


def _apply_ad_hoc_one_time_lines(one_time_rows, earnings, deductions, benefits):
    mod = _one_time_module()
    if mod is None or not one_time_rows:
        return
    mod.apply_ad_hoc_one_time_lines(one_time_rows, earnings, deductions, benefits)


def build_loan_emi_deductions(organization, employee_id, month, year):
    mod = _loan_module()
    if mod is None:
        return {"deductions": [], "loanRepaymentPlans": []}
    res = mod.build_loan_emi_deductions_for_employee(
        organization_id=organization, employee_id=employee_id, month=month, year=year)
    return res or {"deductions": [], "loanRepaymentPlans": []}


def apply_loan_repayments(organization, employee_id, month, year, payroll_id, plans):
    mod = _loan_module()
    if mod is None or not plans:
        return []
    return mod.apply_payroll_loan_repayments(
        organization_id=organization, employee_id=employee_id, month=month, year=year,
        payroll_id=payroll_id, plans=plans)


def reverse_loan_repayments(organization, employee_id, month, year):
    mod = _loan_module()
    if mod is None:
        return 0
    return mod.reverse_payroll_loan_repayments(
        organization_id=organization, employee_id=employee_id, month=month, year=year)


def build_loan_perquisite(organization, employee_id, month, year):
    mod = _loan_perq_module()
    if mod is None:
        return {"lines": [], "totalMonthlyPerquisite": 0}
    res = mod.build_employee_loan_perquisite_for_payroll(
        organization_id=organization, employee_id=employee_id, month=month, year=year)
    return res or {"lines": [], "totalMonthlyPerquisite": 0}


def additional_tds_for_perquisite(monthly_perquisite, tds_record):
    mod = _loan_perq_module()
    if mod is None:
        return 0
    return mod.calculate_additional_tds_for_perquisite(monthly_perquisite, tds_record)


def _vpf_deduction(employee_doc, month, year, basic):
    """EPF-side VPF line (``normalizeVpf`` / ``isVpfEffectiveForPayroll`` / amount)."""
    mod = _vpf_module()
    if mod is None:
        return None
    vpf = mod.normalize_vpf(js_or(_get(employee_doc, "payrollPreferences"), {}))
    if not mod.is_vpf_effective_for_payroll(vpf, month, year, get_month_date_range):
        return None
    amount = mod.calculate_monthly_vpf_amount(vpf, basic)
    if not (to_number(amount) > 0):
        return None
    return {"componentName": "VPF (Voluntary PF)", "amount": amount,
            "calculationType": "fixed" if vpf.get("contributionType") == "fixed"
            else "percentage"}


# --------------------------------------------------------------------------- the calculator

def _find_basic_line_amount(earnings, basic_component):
    from .salary_component_helper import is_basic_salary_component

    for line in earnings:
        if (basic_component and js_truthy(basic_component.get("_id"))
                and js_str(js_or(line.get("componentId"), "")) == js_str(basic_component["_id"])):
            return line.get("amount")
        if is_basic_salary_component({"name": line.get("componentName")}):
            return line.get("amount")
    return 0


def _add_balancing_line(earnings, employee_doc, gross, component_overrides, include_other_allowance):
    from .salary_component_helper import (build_balancing_allowance_line, find_component_override,
                                          get_compliance_flags, has_explicit_override_amount,
                                          normalize_component_key)

    payroll_info = _get(employee_doc, "payrollInfo")
    target_gross = js_round(num0(js_or(_get(payroll_info, "grossSalary"), gross)))
    current = sum(num0(row.get("amount")) for row in earnings)
    special = (find_component_override(component_overrides, "earnings",
                                       {"code": "SPECIAL", "name": "Special Allowance"})
               or find_component_override(component_overrides, "earnings",
                                          {"code": "other allowance", "name": "Other Allowance"})
               or find_component_override(component_overrides, "earnings",
                                          {"code": "OTHER_EXTRA", "name": "Other Extra Allowance"}))
    balancing = 0
    if special and special.get("disabled"):
        balancing = 0
    elif has_explicit_override_amount(special):
        balancing = js_round(special["overrideAmount"])
    elif target_gross > 0:
        balancing = js_round(target_gross - current)

    def is_balancing(row):
        name = normalize_component_key(row.get("componentName"))
        return (name in ("special allowance", "other allowance", "other extra allowance")
                or name.startswith("special ")
                or (include_other_allowance and name.startswith("other allowance"))
                or name.startswith("other extra"))

    already = any(is_balancing(row) for row in earnings)
    if not already and balancing > 0:
        line = build_balancing_allowance_line(balancing)
        if line:
            earnings.append(js_out({"componentName": line["name"],
                                    "amount": line["calculatedAmount"],
                                    "calculationType": "fixed", "isBalancing": True,
                                    **get_compliance_flags(line)}))


def calculate_employee_salary_improved(employee, salary_components, compliance, month, year,
                                       organization, schedule=None, one_time_rows=None,
                                       options=None):
    """Port of ``calculateEmployeeSalaryImproved``.

    ``employee``: PayrollEmployee; ``salary_components``: list of SalaryCompensation dicts;
    ``compliance``: StatutoryCompliance dict (or None); ``schedule``: PayrollSchedule dict
    (or None); ``options``: ``{"paidDays": n, "excludePayrollId": id}``.
    """
    from ..models import Arrears
    from .employee_implementation_date import resolve_employee_implementation_date
    from .salary_component_helper import (add_payroll_component_line, find_component_override,
                                          get_active_earnings_components, get_compliance_flags,
                                          has_explicit_override_amount,
                                          load_paid_component_keys_for_employee,
                                          normalize_overrides, sum_basic_plus_da)
    from .statutory_calculator import (calculate_epf, calculate_esi, calculate_lwf,
                                       calculate_professional_tax, calculate_statutory_bonus,
                                       resolve_epf_applicable_wage, sum_consider_for_epf,
                                       sum_consider_for_esi)

    one_time_rows = one_time_rows or []
    options = options or {}
    salary_components = copy.deepcopy(salary_components or [])
    emp = employee.to_dict()
    payroll_info = _get(emp, "payrollInfo")
    statutory_info = js_nc(_get(emp, "statutoryInfo"), UNDEFINED)
    if statutory_info is UNDEFINED:
        statutory_info = None
    compliance = compliance or {}

    earnings, deductions, benefits, reimbursements = [], [], [], []

    base_salary = js_or(_get(payroll_info, "baseSalary"), _get(emp, "baseSalary"), 0)
    gross = js_or(_get(payroll_info, "grossSalary"), _get(emp, "grossSalary"),
                  js_mul(base_salary, 1.3))

    calendar_days = get_calendar_days_in_payroll_month(month, year)

    working_days = 26
    if employee.site_id_ref:
        working_days = calculate_employee_working_days(employee, year, month)
    elif schedule and schedule.get("workingDays"):
        working_days = calculate_working_days_in_month(year, month, schedule["workingDays"])

    lop_days = 0
    attendance = calendar_days if calendar_days > 0 else working_days
    earned_for_bonus = None
    if calendar_days > 0:
        present = get_employee_present_days_for_month(employee, month, year)
        paid_leaves = get_employee_paid_leaves_for_month(employee, month, year)
        earned = min(present + paid_leaves, working_days)
        earned_for_bonus = earned
        lop_days = max(0, working_days - earned)
        attendance = max(0, calendar_days - lop_days)

    paid_override = to_number(options.get("paidDays", UNDEFINED))
    if math.isfinite(paid_override):
        divisor = calendar_days if calendar_days > 0 else working_days
        attendance = max(0, min(paid_override, divisor))
        lop_days = max(0, divisor - attendance)

    component_overrides = _merge_one_time_into_overrides(
        normalize_overrides(js_or(_get(payroll_info, "componentOverrides"), [])), one_time_rows)
    active = get_active_earnings_components(salary_components)
    basic_component = active["basicComponent"]
    other_components = active["otherComponents"]

    if basic_component:
        basic_override = find_component_override(component_overrides, "earnings", basic_component)
        if has_explicit_override_amount(basic_override):
            base_salary = js_round(basic_override["overrideAmount"])

    salary_bases = {"baseSalary": base_salary, "grossSalary": gross,
                    "ctc": js_or(_get(payroll_info, "ctc"), js_mul(gross, 12))}
    paid_keys = load_paid_component_keys_for_employee(
        organization, employee.pk, options.get("excludePayrollId") or None)

    # ===== EARNINGS =====
    if basic_component:
        ov = find_component_override(component_overrides, "earnings", basic_component)
        if not (ov and ov.get("disabled")):
            earnings.append(js_out({
                "componentName": js_or(basic_component.get("name"), "Basic Salary"),
                "amount": base_salary,
                "calculationType": js_or(basic_component.get("calculationType"), "fixed"),
                "componentId": basic_component.get("_id", UNDEFINED),
                **get_compliance_flags(basic_component),
            }))
    elif to_number(base_salary) > 0:
        earnings.append(js_out({"componentName": "Basic Salary", "amount": base_salary,
                                "calculationType": "fixed",
                                **get_compliance_flags({"considerForEPF": True,
                                                        "considerForESI": True})}))
    for component in other_components:
        add_payroll_component_line(earnings, "earnings", component, salary_bases,
                                   component_overrides, month, paid_keys)
    _add_balancing_line(earnings, emp, gross, component_overrides, True)

    worked_days = get_bonus_accounting_year_worked_days(employee, month, year, earned_for_bonus)
    state = resolve_employee_statutory_state(emp)
    bonus = calculate_statutory_bonus(
        bonus_config=compliance.get("statutoryBonus", UNDEFINED),
        basic_plus_da=sum_basic_plus_da(earnings), employee_state=state,
        employee_employment_category=_get(statutory_info, "employmentCategory"),
        month=month, year=year, accounting_year_worked_days=worked_days)

    full_month_epf_wage = sum_consider_for_epf(earnings, base_salary)
    prorate_salary_lines(earnings, calendar_days, attendance)

    if bonus["applicable"] and bonus["amount"] > 0:
        earnings.append({"componentName": "Statutory Bonus", "amount": bonus["amount"],
                         "fixedAmount": bonus["amount"], "calculationType": "statutory"})
    earned_basic = js_or(_find_basic_line_amount(earnings, basic_component), 0)
    earned_gross = sum_line_items(earnings)

    # ===== DEDUCTIONS =====
    deductions_doc = next((c for c in salary_components if c.get("category") == "deductions"),
                          None)
    epf_res = resolve_epf_applicable_wage(epf_config=compliance.get("epf", UNDEFINED),
                                          full_month_epf_wage=full_month_epf_wage,
                                          working_days=calendar_days, paid_days=attendance)
    epf = calculate_epf(epf_config=compliance.get("epf", UNDEFINED), base_salary=earned_basic,
                        epf_applicable_wage=epf_res["wage"],
                        employee_statutory_info=statutory_info, epf_wage_resolution=epf_res)
    if epf["applicable"] and epf["employeeContribution"] > 0:
        deductions.append({"componentName": "EPF (Employee)",
                           "amount": epf["employeeContribution"],
                           "calculationType": "percentage"})

    vpf_line = _vpf_deduction(emp, month, year, earned_basic)
    if vpf_line:
        deductions.append(vpf_line)

    esi = calculate_esi(esi_config=compliance.get("esi", UNDEFINED), gross_salary=earned_gross,
                        esi_applicable_wage=sum_consider_for_esi(earnings, earned_gross),
                        employee_statutory_info=statutory_info)
    if esi["applicable"] and esi["employeeContribution"] > 0:
        deductions.append({"componentName": "ESI (Employee)",
                           "amount": esi["employeeContribution"],
                           "calculationType": "percentage"})

    pt = calculate_professional_tax(pt_config=compliance.get("professionalTax", UNDEFINED),
                                    gross_salary=earned_gross, month=month, employee_state=state,
                                    employee_statutory_info=statutory_info)
    if pt["applicable"]:
        deductions.append({"componentName": "Professional Tax", "amount": pt["amount"],
                           "calculationType": "slab"})

    lwf = calculate_lwf(lwf_config=compliance.get("labourWelfareFund", UNDEFINED),
                        gross_salary=earned_gross, month=month, employee_state=state,
                        employee_statutory_info=statutory_info)
    if lwf["applicable"] and lwf["employeeShare"] > 0:
        deductions.append({"componentName": "Labour Welfare Fund",
                           "amount": lwf["employeeShare"], "calculationType": "statutory"})

    # TDS — implementation date (inclusive) through 31 March
    implementation_date = resolve_employee_implementation_date(employee=employee,
                                                               organization_id=organization)
    tds_factor = get_payroll_month_tds_factor(month, year, implementation_date)
    include_tds = tds_factor > 0
    tds_amount = 0
    tds_record = None
    if include_tds:
        tds_record = find_tds_record(organization, employee.pk, month, year)
        if tds_record is not None and num0(tds_record.monthly_tds) > 0:
            tds_amount = js_round(tds_record.monthly_tds * tds_factor)
            if tds_amount > 0:
                deductions.append({"componentName": "TDS", "amount": tds_amount,
                                   "calculationType": "calculated"})

    if deductions_doc:
        for component in deductions_doc.get("components") or []:
            add_payroll_component_line(deductions, "deductions", component, salary_bases,
                                       component_overrides, month, paid_keys)

    # ===== BENEFITS =====
    benefits_doc = next((c for c in salary_components if c.get("category") == "benefits"), None)
    if benefits_doc:
        for component in benefits_doc.get("components") or []:
            add_payroll_component_line(benefits, "benefits", component, salary_bases,
                                       component_overrides, month, paid_keys)
    apply_benefits_proration(benefits, calendar_days, attendance)

    _apply_ad_hoc_one_time_lines(one_time_rows, earnings, deductions, benefits)

    # ===== REIMBURSEMENTS (approved claims only) =====
    claims = build_reimbursements_from_approved_claims(organization, employee.pk, month, year)
    reimbursements.extend(claims["reimbursements"])

    # ===== ARREARS =====
    from django.db.models import Q

    arrears_id = None
    pending = (Arrears.objects.filter(org=organization, employee_id=employee.pk,
                                      status="approved")
               .filter(Q(pay_in_month=month, pay_in_year=to_number(year))
                       | (Q(pay_in_month__isnull=True) | Q(pay_in_month=""))
                       & Q(pay_in_year__isnull=True))
               .order_by("created_at").first())
    if pending is not None:
        arrears_id = pending.pk
        earnings.append({"componentName": "Arrears",
                         "amount": js_or(pending.net_arrears_payable, 0),
                         "calculationType": "arrears"})

    # ===== LOAN EMI =====
    loan = build_loan_emi_deductions(organization, employee.pk, month, year)
    deductions.extend(loan.get("deductions") or [])
    loan_plans = loan.get("loanRepaymentPlans") or []

    # ===== LOAN PERQUISITE (TDS only) =====
    perq = build_loan_perquisite(organization, employee.pk, month, year)
    total_perq = num0(perq.get("totalMonthlyPerquisite"))
    if include_tds and total_perq > 0:
        extra = additional_tds_for_perquisite(total_perq * tds_factor,
                                              tds_record.to_dict() if tds_record else {})
        if num0(extra) > 0:
            tds_line = next((r for r in deductions if r.get("componentName") == "TDS"), None)
            if tds_line:
                tds_line["amount"] += extra
            else:
                deductions.append({"componentName": "TDS", "amount": extra,
                                   "calculationType": "calculated"})
            tds_amount += extra

    for index in range(len(deductions) - 1, -1, -1):
        name = js_trim(js_str(js_or(deductions[index].get("componentName"), "")))
        if _LOP_RE.search(name):
            deductions.pop(index)

    total_earnings = sum(to_number(e.get("amount")) for e in earnings)
    total_benefits = sum(to_number(b.get("amount")) for b in benefits)
    total_reimb = sum(to_number(r.get("amount")) for r in reimbursements)
    gross_earnings = total_earnings + total_benefits + total_reimb
    total_deductions = sum(to_number(d.get("amount")) for d in deductions)
    net_pay = gross_earnings - total_deductions

    esi_employer = esi.get("employerContribution", 0) if esi.get("includeEmployerInCtc") else 0
    employer = {
        "epf": js_or(epf.get("employerContribution"), 0),
        "edli": js_or(epf.get("edliContribution"), 0),
        "adminCharges": js_or(epf.get("adminCharges"), 0),
        "esi": js_or(esi_employer, 0),
        "lwf": js_or(lwf.get("employerShare"), 0),
        "total": 0,
    }
    employer["total"] = (employer["epf"] + employer["edli"] + employer["adminCharges"]
                         + employer["esi"] + employer["lwf"])
    epf_d = epf.get("details") or {}
    esi_d = esi.get("details") or {}
    pt_d = pt.get("details") or {}
    lwf_d = lwf.get("details") or {}
    bonus_d = bonus.get("details") or {}

    return js_out({
        "earnings": earnings,
        "deductions": deductions,
        "benefits": benefits,
        "reimbursements": reimbursements,
        "grossEarnings": round_currency(gross_earnings),
        "totalDeductions": round_currency(total_deductions),
        "netPay": round_currency(net_pay),
        "loanPerquisiteTotal": js_round(total_perq),
        "workingDays": working_days,
        "presentDays": attendance,
        "absentDays": lop_days,
        "lopDays": lop_days,
        "tdsAmount": tds_amount,
        "arrearsId": str(arrears_id) if arrears_id else None,
        "reimbursementClaimSubIds": claims["reimbursementClaimSubIds"],
        "loanRepaymentPlans": loan_plans,
        "employerContributions": employer,
        "epfDetails": {
            "applicable": epf["applicable"], "epfWage": epf.get("epfWage", UNDEFINED),
            "employeeRate": js_or(epf_d.get("employeeRate"), 0),
            "employerRate": js_or(epf_d.get("employerRate"), 0),
            "ceilingApplied": epf_d.get("ceilingApplied") is not False,
            "effectiveCeiling": js_or(epf_d.get("effectiveCeiling"), 0),
            "abryApplied": js_truthy(epf.get("abryApplied")),
            "overrideUsed": js_truthy(epf_d.get("overrideUsed")),
        },
        "esiDetails": {
            "applicable": esi["applicable"], "wageUsed": js_or(esi.get("wageUsed"), 0),
            "employeeRate": js_or(esi_d.get("employeeRate"), 0),
            "employerRate": js_or(esi_d.get("employerRate"), 0),
            "wageLimit": js_or(esi_d.get("wageLimit"), 0),
            "includeEmployerInCtc": esi.get("includeEmployerInCtc") is not False,
        },
        "ptDetails": {
            "applicable": pt["applicable"], "stateUsed": js_or(pt_d.get("stateUsed"), ""),
            "ptNumber": js_or(pt_d.get("ptNumber"), ""),
            "cycle": js_or(pt_d.get("cycle"), "monthly"), "amount": js_or(pt.get("amount"), 0),
        },
        "lwfDetails": {
            "applicable": lwf["applicable"], "stateUsed": js_or(lwf_d.get("stateUsed"), ""),
            "cycle": js_or(lwf_d.get("cycle"), "half-yearly"),
            "employeeShare": js_or(lwf.get("employeeShare"), 0),
            "employerShare": js_or(lwf.get("employerShare"), 0),
        },
        "bonusDetails": {
            "applicable": bonus["applicable"], "amount": js_or(bonus.get("amount"), 0),
            "cycle": js_or(bonus.get("cycle"), "yearly"),
            "paymentMonth": js_or(bonus_d.get("paymentMonth"), ""),
            "calcBase": js_or(bonus_d.get("calcBase"), 0),
            "percentage": js_or(bonus_d.get("percentage"), 0),
            "accountingYearWorkedDays": js_nc(bonus_d.get("accountingYearWorkedDays"), None),
            "minWorkingDaysRequired": js_nc(bonus_d.get("minWorkingDaysRequired"), None),
        },
    })


# Mongoose ``strict`` keeps only schema paths on save — mirror that for stored lines.
_LINE_KEYS = ("_id", "componentName", "fixedAmount", "amount", "calculationType", "componentId")
_REIMB_KEYS = ("_id", "componentName", "amount", "calculationType", "claimId")
_DETAIL_KEYS = {
    "employerContributions": ("epf", "edli", "adminCharges", "esi", "lwf", "total"),
    "epfDetails": ("applicable", "epfWage", "employeeRate", "employerRate", "ceilingApplied",
                   "effectiveCeiling", "abryApplied", "overrideUsed"),
    "esiDetails": ("applicable", "wageUsed", "employeeRate", "employerRate", "wageLimit",
                   "includeEmployerInCtc"),
    "ptDetails": ("applicable", "stateUsed", "ptNumber", "cycle", "amount"),
    "lwfDetails": ("applicable", "stateUsed", "cycle", "employeeShare", "employerShare"),
    "bonusDetails": ("applicable", "amount", "cycle", "paymentMonth", "calcBase", "percentage"),
}


def schema_lines(lines, reimbursement=False):
    keys = _REIMB_KEYS if reimbursement else _LINE_KEYS
    out = []
    for line in lines or []:
        row = {k: line[k] for k in keys if k in line and line[k] is not None
               and line[k] is not UNDEFINED}
        if "componentId" in row:
            row["componentId"] = str(row["componentId"])
        if "claimId" in row:
            row["claimId"] = str(row["claimId"])
        out.append(js_out(row))
    return out


def schema_detail(name, value):
    keys = _DETAIL_KEYS[name]
    value = value or {}
    return js_out({k: value[k] for k in keys if k in value and value[k] is not None})


def apply_calculation_to_run(run, calc):
    """Copy a salary calculation onto a PayrollRun instance (schema-stripped)."""
    run.earnings = schema_lines(calc["earnings"])
    run.deductions = schema_lines(calc["deductions"])
    run.benefits = schema_lines(calc["benefits"])
    run.reimbursements = schema_lines(calc["reimbursements"], reimbursement=True)
    run.gross_earnings = calc["grossEarnings"]
    run.total_deductions = calc["totalDeductions"]
    run.net_pay = calc["netPay"]
    run.working_days = calc["workingDays"]
    run.present_days = calc["presentDays"]
    run.absent_days = calc["absentDays"]
    run.lop_days = calc["lopDays"]
    run.employer_contributions = schema_detail("employerContributions",
                                               calc["employerContributions"])
    run.epf_details = schema_detail("epfDetails", calc["epfDetails"])
    run.esi_details = schema_detail("esiDetails", calc["esiDetails"])
    run.pt_details = schema_detail("ptDetails", calc["ptDetails"])
    run.lwf_details = schema_detail("lwfDetails", calc["lwfDetails"])
    run.bonus_details = schema_detail("bonusDetails", calc["bonusDetails"])
    return run


def calculate_employee_salary(employee, salary_components, compliance, month, year, organization):
    """Port of the legacy (unused) ``calculateEmployeeSalary`` path.

    Legacy counted ``AttendanceModel.countDocuments({employeeId, month, year, status:
    'present'})`` — fields the attendance schema never had, so the count was always 0 and
    ``attendance`` fell back to 26; the port keeps that (no attendance lookup)."""
    from .salary_component_helper import (add_payroll_component_line, find_component_override,
                                          get_active_earnings_components, get_compliance_flags,
                                          has_explicit_override_amount, normalize_overrides,
                                          sum_basic_plus_da)
    from .statutory_calculator import (calculate_epf, calculate_esi, calculate_lwf,
                                       calculate_professional_tax, calculate_statutory_bonus,
                                       resolve_epf_applicable_wage, sum_consider_for_epf,
                                       sum_consider_for_esi)

    salary_components = copy.deepcopy(salary_components or [])
    compliance = compliance or {}
    emp = employee.to_dict()
    payroll_info = _get(emp, "payrollInfo")
    statutory_info = _get(emp, "statutoryInfo", None)
    earnings, deductions, benefits, reimbursements = [], [], [], []
    base_salary = js_or(_get(payroll_info, "baseSalary"), _get(emp, "baseSalary"), 50000)
    gross = js_or(_get(payroll_info, "grossSalary"), _get(emp, "grossSalary"),
                  js_mul(base_salary, 1.3))
    working_days = 26
    attendance = working_days

    overrides = normalize_overrides(js_or(_get(payroll_info, "componentOverrides"), []))
    active = get_active_earnings_components(salary_components)
    basic_component = active["basicComponent"]
    if basic_component:
        bo = find_component_override(overrides, "earnings", basic_component)
        if has_explicit_override_amount(bo):
            base_salary = js_round(bo["overrideAmount"])
    bases = {"baseSalary": base_salary, "grossSalary": gross,
             "ctc": js_or(_get(payroll_info, "ctc"), js_mul(gross, 12))}
    paid_keys = set()
    if basic_component:
        ov = find_component_override(overrides, "earnings", basic_component)
        if not (ov and ov.get("disabled")):
            earnings.append(js_out({
                "componentName": js_or(basic_component.get("name"), "Basic Salary"),
                "amount": base_salary,
                "calculationType": js_or(basic_component.get("calculationType"), "fixed"),
                "componentId": basic_component.get("_id", UNDEFINED),
                **get_compliance_flags(basic_component)}))
    elif to_number(base_salary) > 0:
        earnings.append(js_out({"componentName": "Basic Salary", "amount": base_salary,
                                "calculationType": "fixed",
                                **get_compliance_flags({"considerForEPF": True,
                                                        "considerForESI": True})}))
    for component in active["otherComponents"]:
        add_payroll_component_line(earnings, "earnings", component, bases, overrides, month,
                                   paid_keys)
    _add_balancing_line(earnings, emp, gross, overrides, False)

    state = resolve_employee_statutory_state(emp)
    worked = get_bonus_accounting_year_worked_days(employee, month, year, attendance)
    bonus = calculate_statutory_bonus(
        bonus_config=compliance.get("statutoryBonus", UNDEFINED),
        basic_plus_da=sum_basic_plus_da(earnings), employee_state=state,
        employee_employment_category=_get(statutory_info, "employmentCategory"), month=month,
        year=year, accounting_year_worked_days=worked)
    if bonus["applicable"] and bonus["amount"] > 0:
        earnings.append({"componentName": "Statutory Bonus", "amount": bonus["amount"],
                         "fixedAmount": bonus["amount"], "calculationType": "statutory"})

    res = resolve_epf_applicable_wage(epf_config=compliance.get("epf", UNDEFINED),
                                      full_month_epf_wage=sum_consider_for_epf(earnings,
                                                                               base_salary),
                                      working_days=working_days, paid_days=attendance)
    epf = calculate_epf(epf_config=compliance.get("epf", UNDEFINED), base_salary=base_salary,
                        epf_applicable_wage=res["wage"], employee_statutory_info=statutory_info,
                        epf_wage_resolution=res)
    if epf["applicable"] and epf["employeeContribution"] > 0:
        deductions.append({"componentName": "EPF (Employee)",
                           "amount": epf["employeeContribution"], "calculationType": "percentage"})
    vpf_line = _vpf_deduction(emp, month, year, base_salary)
    if vpf_line:
        deductions.append(vpf_line)
    esi = calculate_esi(esi_config=compliance.get("esi", UNDEFINED), gross_salary=gross,
                        esi_applicable_wage=sum_consider_for_esi(earnings, gross),
                        employee_statutory_info=statutory_info)
    if esi["applicable"] and esi["employeeContribution"] > 0:
        deductions.append({"componentName": "ESI (Employee)",
                           "amount": esi["employeeContribution"], "calculationType": "percentage"})
    pt = calculate_professional_tax(pt_config=compliance.get("professionalTax", UNDEFINED),
                                    gross_salary=gross, month=month, employee_state=state,
                                    employee_statutory_info=statutory_info)
    if pt["applicable"]:
        deductions.append({"componentName": "Professional Tax", "amount": pt["amount"],
                           "calculationType": "slab"})
    lwf = calculate_lwf(lwf_config=compliance.get("labourWelfareFund", UNDEFINED),
                        gross_salary=gross, month=month, employee_state=state,
                        employee_statutory_info=statutory_info)
    if lwf["applicable"] and lwf["employeeShare"] > 0:
        deductions.append({"componentName": "Labour Welfare Fund",
                           "amount": lwf["employeeShare"], "calculationType": "statutory"})
    for cat, target in (("deductions", deductions), ("benefits", benefits)):
        doc = next((c for c in salary_components if c.get("category") == cat), None)
        for component in (doc or {}).get("components") or []:
            add_payroll_component_line(target, cat, component, bases, overrides, month, paid_keys)
    doc = next((c for c in salary_components if c.get("category") == "reimbursements"), None)
    for component in (doc or {}).get("components") or []:
        if component.get("status") == "active":
            reimbursements.append({"componentName": component.get("name"),
                                   "amount": js_or(component.get("value"), 0),
                                   "calculationType": component.get("calculationType")})
    total_e = sum(to_number(x.get("amount")) for x in earnings)
    total_b = sum(to_number(x.get("amount")) for x in benefits)
    total_r = sum(to_number(x.get("amount")) for x in reimbursements)
    gross_earnings = total_e + total_b + total_r
    total_d = sum(to_number(x.get("amount")) for x in deductions)
    return js_out({"earnings": earnings, "deductions": deductions, "benefits": benefits,
                   "reimbursements": reimbursements, "grossEarnings": gross_earnings,
                   "totalDeductions": total_d, "netPay": gross_earnings - total_d})
