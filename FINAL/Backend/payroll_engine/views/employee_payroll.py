"""Port of ``controller/payroll/employeePayroll.js``.

Employee self-service ("My Payroll": dashboard, payslips, salary summary, annual
statement, Form 16, claims) plus the HR payroll-info endpoints (calculatePayrollInfo,
payrollInfo GET/PUT, salary-structure preview, component overrides, salaryComponents,
bulkUpdatePayrollInfo).

Pure helpers keep the legacy names (snake_case) and are differential-tested against the
JS. The logged-in employee (legacy ``req.empId``) is ``ctx.require_employee()``.
"""

import json
import math
import re
import uuid
from datetime import datetime, timezone

from django.db import transaction
from django.utils import timezone as dj_tz

from .. import bss_adapter
from ..context import PayrollError, by_method, file_response, get_employee, payroll_view, send_response
from ..models import (ClaimsDeclaration, PayrollEmployee, PayrollRun, SalaryCompensation,
                      StatutoryCompliance)
from ..models.base import new_subdoc_id
from ..services.audit_log import log_payroll_action
from ..services.financial_year import LOCAL_TZ, _to_instant
from ..services.jsmath import (UNDEFINED, is_nullish, js_add, js_div, js_max, js_mul, js_nc,
                               js_or, js_round, js_str, js_strict_eq, js_sub, js_trim,
                               js_truthy, parse_int, to_number)

MAX_CLAIM_ITEMS_PER_REQUEST = 50
PAYROLL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
# ``toLocaleString('en-IN', { month: 'short' })`` (ICU) — note "Sept".
EN_IN_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct",
                      "Nov", "Dec"]


# ====================================================================== JS helpers


def jsonable(value):
    """``JSON.parse(JSON.stringify(value))`` for computed results (NaN -> null)."""
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items() if v is not UNDEFINED}
    if isinstance(value, (list, tuple)):
        return [None if v is UNDEFINED else jsonable(v) for v in value]
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return int(value) if value.is_integer() else value
    if isinstance(value, datetime):
        return js_iso(value)
    return value


def js_iso(dt):
    """``Date.prototype.toISOString`` (UTC, millisecond precision)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _now():
    return dj_tz.now()


def _local_now():
    return _now().astimezone(LOCAL_TZ)


def _n(value):
    """``Number(value)``."""
    return to_number(value)


def _n0(value):
    """``Number(value) || 0``."""
    n = to_number(value)
    return 0 if (math.isnan(n) or n == 0) else n


def _or0(value):
    """``value || 0`` (no coercion)."""
    return value if js_truthy(value) else 0


def _g(obj, key):
    """``obj?.key`` on dict-shaped docs."""
    if isinstance(obj, dict):
        return obj.get(key, UNDEFINED)
    return UNDEFINED


def _mround(value):
    return js_round(to_number(value))


def _finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _str_or(value, fallback=""):
    """``value || fallback``."""
    return value if js_truthy(value) else fallback


def format_en_in_date(value):
    """``new Date(v).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})``."""
    inst = _to_instant(value)
    if inst is None:
        return "Invalid Date"
    local = inst.astimezone(LOCAL_TZ)
    return f"{local.day} {EN_IN_SHORT_MONTHS[local.month - 1]} {local.year}"


# ====================================================================== ported pure helpers


def get_month_index(month_name=UNDEFINED):
    return PAYROLL_MONTHS.index(month_name) if month_name in PAYROLL_MONTHS else -1


def get_financial_year_from_payroll(month_name=UNDEFINED, year=UNDEFINED):
    month_index = get_month_index(month_name)
    normalized_year = to_number(year)
    if month_index == -1 or math.isnan(normalized_year):
        return None
    fy_start = normalized_year if month_index >= 3 else normalized_year - 1
    s, e = js_str(fy_start), js_str(fy_start + 1)
    return jsonable({"key": f"{s}-{e[-2:]}", "label": f"FY {s}-{e}",
                     "startYear": fy_start, "endYear": fy_start + 1})


def parse_financial_year_input(input=UNDEFINED):  # noqa: A002 — legacy name
    if is_nullish(input) or input == "":
        return None
    raw = re.sub(r"^FY", "", js_trim(js_str(input)), count=1, flags=re.IGNORECASE)
    match = re.fullmatch(r"(\d{4})-(\d{2}|\d{4})", raw)
    if not match:
        return None
    start_year = int(match.group(1))
    end_token = match.group(2)
    end_year = int(f"{str(start_year)[:2]}{end_token}") if len(end_token) == 2 else int(end_token)
    if end_year != start_year + 1:
        return None
    return {"key": f"{start_year}-{str(end_year)[-2:]}", "label": f"FY {start_year}-{end_year}",
            "startYear": start_year, "endYear": end_year}


def map_payslip_with_financial_year(doc):
    plain = dict(doc)
    fy = get_financial_year_from_payroll(plain.get("month", UNDEFINED), plain.get("year", UNDEFINED))
    return {**plain, "financialYear": (fy or {}).get("key") or None,
            "financialYearLabel": (fy or {}).get("label") or None}


def compare_payroll_period(a, b):
    year_diff = js_sub(_or0(b.get("year")), _or0(a.get("year")))
    if year_diff != 0:
        return year_diff
    return get_month_index(b.get("month", UNDEFINED)) - get_month_index(a.get("month", UNDEFINED))


def _sort(items, cmp):
    import functools

    def key_cmp(a, b):
        r = cmp(a, b)
        if isinstance(r, float) and math.isnan(r):
            return 0
        return -1 if r < 0 else (1 if r > 0 else 0)
    return sorted(items, key=functools.cmp_to_key(key_cmp))


def build_deduction_breakdown(deductions=UNDEFINED, total_deductions=UNDEFINED):
    deductions = [] if deductions is UNDEFINED else deductions
    total_deductions = 0 if total_deductions is UNDEFINED else total_deductions
    if js_truthy(total_deductions) and to_number(total_deductions) > 0:
        total = total_deductions
    else:
        total = 0
        for d in deductions:
            total = js_add(total, _n0(_g(d, "amount")))
    if not (to_number(total) > 0):
        return jsonable([{"name": _str_or(_g(d, "componentName"), "Deduction"),
                          "amount": _n0(_g(d, "amount")), "percentage": 0} for d in deductions])
    out = []
    for d in deductions:
        amount = _n0(_g(d, "amount"))
        out.append({"name": _str_or(_g(d, "componentName"), "Deduction"), "amount": amount,
                    "percentage": js_round(js_mul(js_div(amount, total), 10000)) / 100})
    return jsonable(out)


def aggregate_payroll_components(rows=UNDEFINED, field="earnings"):
    rows = [] if rows is UNDEFINED else rows
    totals = {}
    for payroll in rows:
        for item in (payroll.get(field) or []):
            name = js_or(_g(item, "componentName"), _g(item, "name"), "Other")
            name = js_str(name) if not isinstance(name, str) else name
            totals[name] = js_add(totals.get(name, 0) or 0, _n0(_g(item, "amount")))
    return jsonable([{"componentName": k, "amount": v} for k, v in totals.items()])


def merge_payslip_earnings_column(earnings=UNDEFINED, benefits=UNDEFINED, reimbursements=UNDEFINED):
    """Shared builder (services/salary_slip_pdf.py); local port only if it is missing."""
    try:
        from ..services.salary_slip_pdf import merge_payslip_earnings_column as shared
    except ImportError:
        shared = None
    if shared is not None:
        return shared(earnings, benefits, reimbursements)

    def norm(item, default_name):
        amount = _n0(_g(item, "amount"))
        fixed = _n(_g(item, "fixedAmount"))
        return {"componentName": js_or(_g(item, "componentName"), _g(item, "name"), default_name),
                "fixedAmount": fixed if math.isfinite(fixed) else amount,
                "amount": amount,
                "calculationType": js_or(_g(item, "calculationType"), "")}

    rows = ([norm(e, "Earning") for e in (earnings or [] if earnings is not UNDEFINED else [])]
            + [norm(b, "Benefit") for b in (benefits or [] if benefits is not UNDEFINED else [])]
            + [norm(r, "Reimbursement")
               for r in (reimbursements or [] if reimbursements is not UNDEFINED else [])])
    return jsonable(rows)


def build_monthly_breakdown_row(payroll):
    basic_line = next((e for e in (payroll.get("earnings") or [])
                       if "basic" in js_str(js_or(_g(e, "componentName"), "")).lower()), None)
    basic_salary = _or0(_g(basic_line, "amount")) if basic_line is not None else 0
    stored_present = _n(payroll.get("presentDays", UNDEFINED))
    if math.isfinite(stored_present):
        paid_days = max(0, stored_present)
    else:
        paid_days = js_max(0, _n0(payroll.get("workingDays", UNDEFINED))
                           - _n0(payroll.get("lopDays", UNDEFINED)))
    return jsonable({
        "payrollId": payroll.get("_id"),
        "month": payroll.get("month", UNDEFINED),
        "year": payroll.get("year", UNDEFINED),
        "basicSalary": _n0(basic_salary),
        "grossEarnings": _or0(payroll.get("grossEarnings")),
        "totalDeductions": _or0(payroll.get("totalDeductions")),
        "netPay": _or0(payroll.get("netPay")),
        "payStatus": _str_or(payroll.get("payStatus"), "pending"),
        "processedDate": payroll.get("processedDate") or None,
        "workingDays": _n0(payroll.get("workingDays", UNDEFINED)),
        "presentDays": max(0, stored_present) if math.isfinite(stored_present) else paid_days,
        "paidDays": paid_days,
        "lopDays": _n0(payroll.get("lopDays", UNDEFINED)),
        "earnings": merge_payslip_earnings_column(payroll.get("earnings", UNDEFINED),
                                                  payroll.get("benefits", UNDEFINED),
                                                  payroll.get("reimbursements", UNDEFINED)),
        "deductions": [{"componentName": _str_or(_g(d, "componentName"), "Deduction"),
                        "amount": _n0(_g(d, "amount"))} for d in (payroll.get("deductions") or [])],
    })


def get_claim_calendar_month_key(claim_date_input=UNDEFINED):
    if js_truthy(claim_date_input):
        inst = _to_instant(claim_date_input)
    else:
        inst = _now()
    if inst is None:
        return None
    local = inst.astimezone(LOCAL_TZ)
    return f"{local.year}-{local.month:02d}"


def _lower_str(value):
    return js_str(value).lower()


def matches_reimbursement_head(claim, head):
    head_id = js_str(_g(head, "_id"))
    if js_str(_g(claim, "headId")) == head_id:
        return True
    if js_truthy(_g(claim, "headCode")) and js_truthy(_g(head, "code")) and \
            _lower_str(claim["headCode"]) == _lower_str(head["code"]):
        return True
    if js_truthy(_g(claim, "headName")) and js_truthy(_g(head, "name")) and \
            _lower_str(claim["headName"]) == _lower_str(head["name"]):
        return True
    return False


def get_monthly_utilized_for_head(existing_claims, head, month_key):
    if not month_key:
        return 0
    total = 0
    for claim in existing_claims or []:
        if _g(claim, "status") == "rejected":
            continue
        if not matches_reimbursement_head(claim, head):
            continue
        if get_claim_calendar_month_key(_g(claim, "claimDate")) != month_key:
            continue
        if _g(claim, "status") == "approved":
            amount = _n0(js_nc(_g(claim, "approvedAmount"), _g(claim, "claimedAmount")))
        else:
            amount = _n0(_g(claim, "claimedAmount"))
        total = js_add(total, amount)
    return total


def build_monthly_head_bucket_key(head_id, month_key):
    return f"{js_str(head_id)}|{js_str(month_key)}"


# ====================================================================== data access


def _org_doc(ctx):
    """Legacy ``OrganizationModel.findById(org_uuid)``."""
    if ctx.org is None:
        return None
    doc = dict(bss_adapter.org_profile(ctx.org))
    logo = doc.get("logo")
    if logo and not isinstance(logo, str):   # ImageFieldFile -> its URL / name
        doc["logo"] = getattr(logo, "url", None) or str(logo)
    return doc


def _runs(ctx, emp):
    return PayrollRun.objects.filter(org=ctx.org, employee=emp)


def _run_docs(qs):
    return [json.loads(json.dumps(r.to_dict(), default=str)) for r in qs]


def _components_docs(org):
    """``SalaryCompensationModel.find({organizationId})`` (natural order)."""
    return [json.loads(json.dumps(r.to_dict(), default=str))
            for r in SalaryCompensation.objects.filter(org=org).order_by("created_at", "id")]


def _compliance_doc(org):
    row = StatutoryCompliance.objects.filter(org=org).first()
    return json.loads(json.dumps(row.to_dict(), default=str)) if row else None


def _sec(doc, key):
    return doc.get(key, UNDEFINED) if doc else UNDEFINED


def _employee_ref(emp, extra=()):
    """Populated ``employeeId`` (``firstName lastName email <code fields> payrollInfo.*``)."""
    pinfo = emp.payroll_info or {}
    out = {"_id": str(emp.pk), "firstName": emp.first_name, "lastName": emp.last_name,
           "email": emp.email, "customId": emp.custom_id, "uniqueId": emp.unique_id}
    sub = {k: pinfo[k] for k in ("employeeCode", "department", "designation") if k in pinfo}
    if sub:
        out["payrollInfo"] = sub
    for key in extra:
        out[key] = emp.to_dict().get(key)
    return out


def _require_my_employee(ctx):
    if ctx.org is None or ctx.employee is None:
        raise PayrollError("Missing required information", 400)
    return ctx.employee


def _reimbursement_heads(org):
    rec = SalaryCompensation.objects.filter(org=org, category="reimbursements").order_by("created_at").first()
    return list(rec.components or []) if rec else []


def _claims_doc(org, emp, lock=False):
    qs = ClaimsDeclaration.objects.filter(org=org, employee=emp).order_by("created_at")
    if lock:
        qs = qs.select_for_update()
    return qs.first()


# ====================================================================== self-service views


@payroll_view(["GET"], access="employee")
def get_my_payroll_dashboard(ctx):
    emp = _require_my_employee(ctx)
    org = ctx.org
    employee = emp.to_dict()
    now_local = _local_now()
    calendar_year = now_local.year
    current_month_short = PAYROLL_MONTHS[now_local.month - 1]

    all_payrolls = _run_docs(_runs(ctx, emp).order_by("-year", "-month"))
    sort_payrolls = _sort(all_payrolls, compare_payroll_period)
    current = next((p for p in all_payrolls
                    if p.get("year") == calendar_year and p.get("month") == current_month_short), None)
    active = current or (sort_payrolls[0] if sort_payrolls else None)
    stub_index = (next((i for i, p in enumerate(sort_payrolls) if str(p["_id"]) == str(active["_id"])), -1)
                  if active else -1)

    ytd = [p for p in all_payrolls if p.get("year") == calendar_year]
    ytd_gross = ytd_ded = ytd_net = 0
    for p in ytd:
        ytd_gross = js_add(ytd_gross, _or0(p.get("grossEarnings")))
        ytd_ded = js_add(ytd_ded, _or0(p.get("totalDeductions")))
        ytd_net = js_add(ytd_net, _or0(p.get("netPay")))

    pinfo = employee.get("payrollInfo") or {}
    annual_ctc = _n0(_g(pinfo, "ctc"))
    monthly_ctc = js_round(annual_ctc / 12) if annual_ctc > 0 else _n0(_g(pinfo, "grossSalary"))

    a = active or {}
    earnings_rows = merge_payslip_earnings_column(_g(a, "earnings"), _g(a, "benefits"),
                                                  _g(a, "reimbursements"))
    gross_from_earnings = 0
    for e in earnings_rows:
        gross_from_earnings = js_add(gross_from_earnings, e["amount"])
    gross_pay = js_nc(_g(a, "grossEarnings"), gross_from_earnings)
    total_deductions = js_nc(_g(a, "totalDeductions"), 0)
    net_pay = js_nc(_g(a, "netPay"), 0)
    working_days = js_nc(_g(a, "workingDays"), 0)
    present_days = js_nc(_g(a, "presentDays"), working_days)
    hours_worked = _mround(js_mul(_or0(present_days), 8))
    pay_period_end = js_or(_g(a, "processedDate"), _g(a, "paidDate"), _g(a, "updatedAt"), None)
    deduction_breakdown = build_deduction_breakdown(js_or(_g(a, "deductions"), []), total_deductions)

    fy_map = {}
    for p in all_payrolls:
        fy = get_financial_year_from_payroll(p.get("month", UNDEFINED), p.get("year", UNDEFINED))
        if not fy:
            continue
        row = fy_map.setdefault(fy["key"], {"financialYear": fy["key"], "label": fy["label"],
                                            "payrollCount": 0, "totalGross": 0, "totalNet": 0})
        row["payrollCount"] += 1
        row["totalGross"] = js_add(row["totalGross"], _or0(p.get("grossEarnings")))
        row["totalNet"] = js_add(row["totalNet"], _or0(p.get("netPay")))
    annual_statements = [{**row, "viewType": "annualSalaryStatement"}
                         for row in sorted(fy_map.values(), key=lambda r: r["financialYear"],
                                           reverse=True)]

    heads = [c for c in _reimbursement_heads(org) if js_or(c.get("status"), "active") == "active"]
    claim_doc = _claims_doc(org, emp)
    reimbursements = list(claim_doc.reimbursements or []) if claim_doc else []
    month_key = get_claim_calendar_month_key(_now())
    balances = []
    for head in heads:
        max_limit = _n0(head.get("maxLimit", UNDEFINED))
        utilized = get_monthly_utilized_for_head(reimbursements, head, month_key)
        related = [r for r in reimbursements if matches_reimbursement_head(r, head)
                   and get_claim_calendar_month_key(_g(r, "claimDate")) == month_key]
        claimed = approved = 0
        for r in related:
            claimed = js_add(claimed, _n0(_g(r, "claimedAmount")))
            if _g(r, "status") == "approved":
                approved = js_add(approved, _n0(js_nc(_g(r, "approvedAmount"), _g(r, "claimedAmount"))))
        balance = js_max(0, max_limit - to_number(utilized)) if max_limit > 0 else 0
        balances.append({"headId": head.get("_id"), "headName": head.get("name", UNDEFINED),
                         "headCode": _str_or(head.get("code"), ""), "maxLimit": max_limit,
                         "claimed": claimed, "approved": approved, "utilized": utilized,
                         "balance": balance, "limitPeriod": "month", "monthKey": month_key})
    balance_available = total_claimed_fy = 0
    for h in balances:
        balance_available = js_add(balance_available, h["balance"])
        total_claimed_fy = js_add(total_claimed_fy, h["utilized"])
    claims_stats = {
        "total": len(reimbursements),
        "approved": sum(1 for r in reimbursements if _g(r, "status") == "approved"),
        "pending": sum(1 for r in reimbursements if _g(r, "status") == "pending"),
        "rejected": sum(1 for r in reimbursements if _g(r, "status") == "rejected"),
    }
    ctc_utilized = total_claimed_fy
    ctc_balance = js_max(0, annual_ctc - to_number(ctc_utilized)) if annual_ctc > 0 else 0

    stub = None
    if active:
        label = f"{js_str(active.get('month'))} {js_str(active.get('year'))}"
        has_prev = 0 <= stub_index < len(sort_payrolls) - 1
        stub = {
            "payrollId": active["_id"],
            "payPeriod": {
                "month": active.get("month"), "year": active.get("year"), "label": label,
                "endingLabel": (f"Pay period ending {format_en_in_date(pay_period_end)}"
                                if js_truthy(pay_period_end) else label),
            },
            "earnings": earnings_rows,
            "grossPay": gross_pay,
            "deductions": [{"componentName": _str_or(_g(d, "componentName"), "Deduction"),
                            "amount": _n0(_g(d, "amount"))} for d in (active.get("deductions") or [])],
            "totalDeductions": total_deductions,
            "netPay": net_pay,
            "payStatus": _str_or(active.get("payStatus"), "pending"),
            "navigation": {
                "hasPrevious": has_prev,
                "hasNext": stub_index > 0,
                "previousPayrollId": sort_payrolls[stub_index + 1]["_id"] if has_prev else None,
                "nextPayrollId": sort_payrolls[stub_index - 1]["_id"] if stub_index > 0 else None,
            },
        }

    from ..services.employee_display import resolve_employee_display_code

    fy_now = get_financial_year_from_payroll(current_month_short, calendar_year)
    dashboard = {
        "employee": {
            "_id": employee["_id"],
            "name": f"{employee.get('firstName') or ''} {employee.get('lastName') or ''}".strip(),
            "code": resolve_employee_display_code(employee),
            "email": employee.get("email") or "",
            "department": _str_or(_g(pinfo, "department"), ""),
            "designation": js_or(_g(pinfo, "designation"), employee.get("jobTitle"), ""),
        },
        "summaryCards": {
            "currentPeriodNetPay": js_nc(_g(a, "netPay"), 0),
            "ytdGrossPay": ytd_gross,
            "currentPeriodGrossPay": js_nc(_g(a, "grossEarnings"), 0),
            "hoursWorked": hours_worked,
            "hoursLabel": "this period",
        },
        "currentPeriod": {
            "month": js_or(_g(a, "month"), current_month_short),
            "year": js_or(_g(a, "year"), calendar_year),
            "netPay": net_pay,
            "grossEarnings": gross_pay,
            "totalDeductions": total_deductions,
            "payStatus": js_or(_g(a, "payStatus"), "pending"),
        },
        "yearToDate": {"year": calendar_year, "totalGross": ytd_gross, "totalDeductions": ytd_ded,
                       "totalNetPay": ytd_net, "monthsProcessed": len(ytd), "totalCTC": annual_ctc},
        "attendance": {
            "hoursWorked": hours_worked,
            "daysWorked": present_days,
            "workingDays": working_days,
            "attendancePercentage": (js_round(to_number(present_days) / to_number(working_days) * 10000) / 100
                                     if to_number(working_days) > 0 else 0),
        },
        "lastPayslipDate": pay_period_end,
        "currentPayStub": stub,
        "deductionBreakdown": deduction_breakdown,
        "annualSalaryStatements": annual_statements,
        "claimsAndReimbursements": {
            "balanceAvailable": balance_available,
            "reimbursementHeads": balances,
            "ctcBreakdown": {"monthlyCTC": monthly_ctc, "annualCTC": annual_ctc,
                             "ctcUtilized": ctc_utilized, "ctcBalance": ctc_balance},
            "claimsStats": claims_stats,
            "financialYear": (fy_now or {}).get("key") or None,
            "claimMonthKey": month_key,
        },
        "recentPayslips": [{"payrollId": p["_id"], "month": p.get("month"), "year": p.get("year"),
                            "grossEarnings": _or0(p.get("grossEarnings")),
                            "netPay": _or0(p.get("netPay")),
                            "payStatus": _str_or(p.get("payStatus"), "pending")}
                           for p in sort_payrolls[:6]],
    }
    return send_response(200, True, "Payroll dashboard fetched successfully", jsonable(dashboard))


def fetch_annual_salary_statement(ctx, employee_id, financial_year_input, emp=None):
    """Legacy ``fetchAnnualSalaryStatement`` -> ``{"data"}`` or ``{"error", "status"}``."""
    from ..services.employee_display import resolve_employee_display_code
    from ..services.financial_year import (build_financial_year_payroll_q,
                                           get_payroll_period_sort_key,
                                           resolve_financial_year_input)

    fy = resolve_financial_year_input(financial_year_input)
    if not fy.get("ok"):
        return {"error": fy.get("error"), "status": 400}
    if emp is None:
        try:
            emp = get_employee(ctx, employee_id)
        except PayrollError:
            return {"error": "Employee not found", "status": 404}
    employee = emp.to_dict()
    organization = _org_doc(ctx)
    payrolls = _run_docs(_runs(ctx, emp).filter(build_financial_year_payroll_q(fy)).order_by("created_at"))
    payrolls = sorted(payrolls, key=lambda p: get_payroll_period_sort_key(
        p.get("month"), p.get("year"), fy["startYear"], fy["endYear"]))
    total_gross = total_ded = total_net = 0
    for p in payrolls:
        total_gross = js_add(total_gross, _or0(p.get("grossEarnings")))
        total_ded = js_add(total_ded, _or0(p.get("totalDeductions")))
        total_net = js_add(total_net, _or0(p.get("netPay")))
    months = len(payrolls)
    pinfo = employee.get("payrollInfo") or {}
    return {"data": jsonable({
        "organization": {"name": _str_or(_g(organization, "name"), "Organization"),
                         "address": _str_or(_g(organization, "address"), ""),
                         "logo": _str_or(_g(organization, "logo"), "")},
        "employee": {
            "id": employee["_id"],
            "name": f"{employee.get('firstName') or ''} {employee.get('lastName') or ''}".strip(),
            "code": resolve_employee_display_code(employee),
            "email": employee.get("email") or "",
            "department": _str_or(_g(pinfo, "department"), ""),
            "designation": js_or(_g(pinfo, "designation"), employee.get("jobTitle"), ""),
        },
        "financialYear": fy["keyShort"],
        "financialYearCanonical": fy["canonical"],
        "financialYearLabel": fy["label"],
        "period": {"from": f"Apr {fy['startYear']}", "to": f"Mar {fy['endYear']}",
                   "description": f"April {fy['startYear']} to March {fy['endYear']}"},
        "monthlyBreakdown": [build_monthly_breakdown_row(p) for p in payrolls],
        "annualSummary": {
            "totalGross": total_gross, "totalDeductions": total_ded, "totalNetPay": total_net,
            "monthsProcessed": months, "expectedMonths": len(PAYROLL_MONTHS),
            "averageMonthlyGross": js_round(to_number(total_gross) / months) if months > 0 else 0,
            "averageMonthlyNetPay": js_round(to_number(total_net) / months) if months > 0 else 0,
        },
        "componentTotals": {"earnings": aggregate_payroll_components(payrolls, "earnings"),
                            "deductions": aggregate_payroll_components(payrolls, "deductions")},
    })}


@payroll_view(["GET"], access="employee")
def get_my_annual_salary_statement(ctx):
    emp = _require_my_employee(ctx)
    financial_year = ctx.query("financialYear")
    if not financial_year:
        raise PayrollError("financialYear is required (e.g. 2025-26)", 400)
    result = fetch_annual_salary_statement(ctx, emp.pk, financial_year, emp=emp)
    if result.get("error"):
        raise PayrollError(result["error"], result["status"])
    return send_response(200, True, "Annual salary statement fetched successfully", result["data"])


@payroll_view(["GET"])
def get_employee_annual_salary_statement(ctx, employeeId):
    ctx.require_org()
    financial_year = ctx.query("financialYear")
    if not financial_year:
        raise PayrollError("financialYear is required (e.g. 2025-26)", 400)
    result = fetch_annual_salary_statement(ctx, employeeId, financial_year)
    if result.get("error"):
        raise PayrollError(result["error"], result["status"])
    return send_response(200, True, "Annual salary statement fetched successfully", result["data"])



# ---------------------------------------------------------------------- Form 16


def _form16_result(ctx, emp, financial_year):
    """``buildForm16Data(org_uuid, employeeId, financialYear)`` (shared TDS builder)."""
    from ..services.form16_builder import build_form16_data

    return build_form16_data(ctx.org, str(emp.pk), financial_year)


def _form16_code(employee, fy, part=None):
    emp = employee.to_dict() if hasattr(employee, "to_dict") else (employee or {})
    code = js_or(_g(_g(emp, "payrollInfo"), "employeeCode"), _g(emp, "uniqueId"), "employee")
    code = re.sub(r"[^\w.-]+", "_", js_str(code))
    fy_key = re.sub(r"[^\w.-]+", "_", js_str(js_or(_g(fy, "keyShort"), "FY")))
    return f"Form16_Part{part}_{code}_{fy_key}.pdf" if part else f"Form16_{code}_{fy_key}.pdf"


@payroll_view(["GET"], access="employee")
def get_my_form16(ctx):
    if ctx.employee is None:
        raise PayrollError("Employee id missing from token", 401)
    ctx.require_org()
    financial_year = ctx.query("financialYear")
    if not financial_year:
        raise PayrollError("financialYear is required (e.g. 2025-26)", 400)
    result = _form16_result(ctx, ctx.employee, financial_year)
    if result.get("error"):
        raise PayrollError(result["error"], result.get("status", 400))
    return send_response(200, True, "Form 16 generated successfully", result["data"])


def _download_form16(ctx, part=None):
    emp = _require_my_employee(ctx)
    financial_year = ctx.query("financialYear")
    if not financial_year:
        raise PayrollError("financialYear is required (e.g. 2025-26)", 400)
    result = _form16_result(ctx, emp, financial_year)
    if result.get("error"):
        raise PayrollError(result["error"], result.get("status", 400))
    from ..services import form16_pdf

    builder = {None: form16_pdf.build_form16_pdf_buffer,
               "A": form16_pdf.build_form16_part_a_pdf_buffer,
               "B": form16_pdf.build_form16_part_b_pdf_buffer}[part]
    pdf = builder(result["data"])
    return file_response(pdf, _form16_code(result.get("employee") or emp, result.get("fy"), part))


@payroll_view(["GET"], access="employee")
def download_my_form16_pdf(ctx):
    return _download_form16(ctx)


@payroll_view(["GET"], access="employee")
def download_my_form16_part_a_pdf(ctx):
    return _download_form16(ctx, "A")


@payroll_view(["GET"], access="employee")
def download_my_form16_part_b_pdf(ctx):
    return _download_form16(ctx, "B")


# ---------------------------------------------------------------------- payslips


def _mongo_limit(qs, limit):
    n = parse_int(limit)
    if isinstance(n, float) or n == 0:   # NaN / 0 -> no limit
        return list(qs)
    return list(qs[:abs(n)])


@payroll_view(["GET"], access="employee")
def get_my_payslips(ctx):
    emp = _require_my_employee(ctx)
    qs = _runs(ctx, emp)
    year, month, limit = ctx.query("year"), ctx.query("month"), ctx.query("limit", 12)
    if year:
        y = parse_int(year)
        if isinstance(y, float):
            qs = qs.none()
        else:
            qs = qs.filter(year=y)
    if month:
        qs = qs.filter(month=month)
    # Legacy ``.sort({ year: -1, month: -1 })`` — month sorts alphabetically.
    runs = _mongo_limit(qs.order_by("-year", "-month"), limit)
    ref = _employee_ref(emp)
    docs = [{**d, "employeeId": ref} for d in _run_docs(runs)]
    return send_response(200, True, "Payslips fetched successfully",
                         jsonable({"total": len(docs), "data": docs}))


def _get_own_run(ctx, emp, payroll_id):
    try:
        uuid.UUID(str(payroll_id))
    except ValueError:
        return None
    return _runs(ctx, emp).filter(pk=payroll_id).first()


@payroll_view(["GET"], access="employee")
def get_my_payslip_detail(ctx, payrollId):
    from ..services.employee_display import resolve_employee_display_code

    emp = _require_my_employee(ctx)
    run = _get_own_run(ctx, emp, payrollId)
    if run is None:
        raise PayrollError("Payslip not found", 404)
    payroll = _run_docs([run])[0]
    ref = _employee_ref(emp)
    organization = _org_doc(ctx)
    present = _n(payroll.get("presentDays"))
    detail = {
        "organization": {"name": _str_or(_g(organization, "name"), "Organization"),
                         "address": _str_or(_g(organization, "address"), ""),
                         "logo": _str_or(_g(organization, "logo"), "")},
        "employee": {
            "name": f"{js_str(ref['firstName'])} {js_str(ref['lastName'])}",
            "code": resolve_employee_display_code(ref),
            "email": ref["email"],
            "department": _str_or(_g(_g(ref, "payrollInfo"), "department"), ""),
            "designation": js_or(_g(_g(ref, "payrollInfo"), "designation"), _g(ref, "jobTitle"), ""),
        },
        "payPeriod": {"month": payroll.get("month"), "year": payroll.get("year")},
        "earnings": merge_payslip_earnings_column(payroll.get("earnings"), payroll.get("benefits"),
                                                  payroll.get("reimbursements")),
        "deductions": payroll.get("deductions") or [],
        "benefits": payroll.get("benefits") or [],
        "reimbursements": payroll.get("reimbursements") or [],
        "summary": {"grossEarnings": _or0(payroll.get("grossEarnings")),
                    "totalDeductions": _or0(payroll.get("totalDeductions")),
                    "netPay": _or0(payroll.get("netPay"))},
        "attendance": {
            "workingDays": _n0(payroll.get("workingDays")),
            "paidDays": js_max(0, present if math.isfinite(present) else
                               _n0(payroll.get("workingDays")) - _n0(payroll.get("lopDays"))),
            "presentDays": _n0(payroll.get("presentDays")),
            "lopDays": _n0(payroll.get("lopDays")),
        },
        "payStatus": payroll.get("payStatus"),
        "processedDate": payroll.get("processedDate"),
    }
    return send_response(200, True, "Payslip detail fetched successfully", jsonable(detail))


@payroll_view(["GET"], access="employee")
def get_my_salary_summary(ctx):
    emp = _require_my_employee(ctx)
    now_local = _local_now()
    year = now_local.year
    # ``toLocaleString('en-IN', {month: 'short'})`` -> "Sept" in September (never matches).
    month = EN_IN_SHORT_MONTHS[now_local.month - 1]
    current = _runs(ctx, emp).filter(year=year, month=month).order_by("created_at").first()
    ytd = list(_runs(ctx, emp).filter(year=year))
    gross = ded = net = 0
    for p in ytd:
        gross = js_add(gross, _or0(p.gross_earnings))
        ded = js_add(ded, _or0(p.total_deductions))
        net = js_add(net, _or0(p.net_pay))
    return send_response(200, True, "Salary summary fetched successfully", jsonable({
        "currentMonth": {
            "month": month, "year": year,
            "grossEarnings": _or0(current.gross_earnings) if current else 0,
            "totalDeductions": _or0(current.total_deductions) if current else 0,
            "netPay": _or0(current.net_pay) if current else 0,
            "payStatus": _str_or(current.pay_status, "pending") if current else "pending",
        },
        "yearToDate": {"year": year, "totalGross": gross, "totalDeductions": ded,
                       "totalNetPay": net, "monthsProcessed": len(ytd)},
    }))


@payroll_view(["GET"], access="employee")
def get_my_salary_pdf_download(ctx, payrollId):
    from ..services.employee_display import resolve_employee_display_code
    from ..services.payslip_attendance import get_payslip_attendance_days

    emp = _require_my_employee(ctx)
    run = _get_own_run(ctx, emp, payrollId)
    if run is None:
        raise PayrollError("Payslip not found", 404)
    from ..services.salary_slip_pdf import build_salary_slip_pdf_buffer
    payroll = _run_docs([run])[0]
    e = emp.to_dict()
    organization = _org_doc(ctx) or {}
    pinfo = e.get("payrollInfo") or {}
    payslip = {
        # Legacy read organizationName / organizationAddress / logo (BSS org profile).
        "organization": {"name": _str_or(organization.get("name"), "Organization Name"),
                         "address": _str_or(organization.get("address"), ""),
                         "logo": _str_or(organization.get("logo"), "")},
        "employee": {
            "name": f"{e.get('firstName') or ''} {e.get('lastName') or ''}".strip(),
            "code": resolve_employee_display_code(e, "N/A"),
            "email": e.get("email") or "",
            # departmentId.name -> BSS binding department
            "department": js_or(e.get("department"), _g(pinfo, "department"), "N/A"),
            "designation": js_or(_g(pinfo, "designation"), e.get("jobTitle"), ""),
            "pan": _str_or(_g(e.get("nationalID"), "pan"), "N/A"),
            "bankName": _str_or(_g(e.get("bankInfo"), "bankName"), "N/A"),
            "bankAccountNumber": _str_or(_g(e.get("bankInfo"), "bankAccountNumber"), "N/A"),
        },
        "payPeriod": {"month": _str_or(payroll.get("month"), ""),
                      "year": _str_or(payroll.get("year"), "")},
    }
    attendance = get_payslip_attendance_days(str(ctx.org.pk), str(emp.pk), payroll.get("month"),
                                             payroll.get("year"), payroll)
    opts = {
        "organizationName": payslip["organization"]["name"],
        "organizationAddress": payslip["organization"]["address"],
        "organizationLogo": payslip["organization"]["logo"],
        "employeeName": payslip["employee"]["name"],
        "employeeCode": payslip["employee"]["code"],
        "department": payslip["employee"]["department"],
        "pan": payslip["employee"]["pan"],
        "bankName": payslip["employee"]["bankName"],
        "bankAccountNumber": payslip["employee"]["bankAccountNumber"],
        "payPeriodLabel": f"{js_str(payslip['payPeriod']['month'])} {js_str(payslip['payPeriod']['year'])}",
        "earnings": payroll.get("earnings") or [],
        "benefits": payroll.get("benefits") or [],
        "reimbursements": payroll.get("reimbursements") or [],
        "deductions": payroll.get("deductions") or [],
        "grossEarnings": js_nc(payroll.get("grossEarnings"), 0),
        "totalDeductions": js_nc(payroll.get("totalDeductions"), 0),
        "netPay": js_nc(payroll.get("netPay"), 0),
        "payStatus": _str_or(payroll.get("payStatus"), "pending"),
        "workingDays": attendance.get("workingDays"),
        "paidDays": attendance.get("paidDays"),
    }
    pdf = _call_with_opts(build_salary_slip_pdf_buffer, opts)
    safe_code = re.sub(r"[^\w.-]+", "_", js_str(payslip["employee"]["code"]))
    safe_month = re.sub(r"[^\w.-]+", "_", js_str(payslip["payPeriod"]["month"]))
    filename = f"Payslip_{safe_code}_{safe_month}_{js_str(payslip['payPeriod']['year'])}.pdf"
    return file_response(pdf, filename)


def _call_with_opts(fn, opts):
    """Call a ported builder that took one ``opts`` object: either ``fn(opts_dict)`` or
    ``fn(**snake_case_kwargs)`` depending on the port's signature."""
    import inspect

    params = list(inspect.signature(fn).parameters.values())
    if len(params) == 1 and params[0].kind in (params[0].POSITIONAL_ONLY,
                                               params[0].POSITIONAL_OR_KEYWORD):
        return fn(opts)

    def snake(name):
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name).lower()
    return fn(**{snake(k): v for k, v in opts.items()})



# ---------------------------------------------------------------------- claims

_CLAIM_SUMMARY_KEYS = ("claimNo", "claimGroupId", "headId", "headName", "headCode", "name",
                       "type", "claimDate", "billNo", "particulars", "claimedAmount",
                       "approvedAmount", "status", "proofUrl", "description", "employeeComments")


@payroll_view(["GET"], access="employee")
def get_my_claims_summary(ctx):
    emp = _require_my_employee(ctx)
    doc = _claims_doc(ctx.org, emp)
    if doc is None:
        return send_response(200, True, "No claims found", {
            "reimbursements": [], "stats": {"total": 0, "approved": 0, "pending": 0, "rejected": 0}})
    rows = list(doc.reimbursements or [])
    total_claimed = total_approved = 0
    for r in rows:
        total_claimed = js_add(total_claimed, _or0(_g(r, "claimedAmount")))
        if _g(r, "status") == "approved":
            total_approved = js_add(total_approved, _or0(_g(r, "approvedAmount")))
    stats = {
        "total": len(rows),
        "approved": sum(1 for r in rows if _g(r, "status") == "approved"),
        "pending": sum(1 for r in rows if _g(r, "status") == "pending"),
        "rejected": sum(1 for r in rows if _g(r, "status") == "rejected"),
        "totalClaimed": total_claimed,
        "totalApproved": total_approved,
    }
    out = []
    for r in rows:
        item = {"_id": r.get("_id")}
        for key in _CLAIM_SUMMARY_KEYS:
            item[key] = r.get(key, UNDEFINED)
        item["attachmentUrls"] = js_or(r.get("attachmentUrls", UNDEFINED), [])
        item["submittedOn"] = r.get("submittedOn", UNDEFINED)
        out.append(item)
    return send_response(200, True, "Claims summary fetched successfully",
                         jsonable({"reimbursements": out, "stats": stats}))


def _js_slice(items, start, end):
    n = len(items)

    def norm(i):
        if isinstance(i, float):
            if math.isnan(i):
                return 0
            if math.isinf(i):
                return n if i > 0 else 0
            i = int(i)   # ToIntegerOrInfinity truncates
        return max(n + i, 0) if i < 0 else min(i, n)
    a, b = norm(start), norm(end)
    return items[a:b] if b > a else []


def _ms(value):
    inst = _to_instant(value) if js_truthy(value) else _to_instant(0)
    return (inst - datetime(1970, 1, 1, tzinfo=timezone.utc)).total_seconds() * 1000 if inst else float("nan")


@payroll_view(["GET"])
def get_all_claims_summary(ctx):
    org = ctx.require_org()
    q = ctx.query
    page, limit = q("page", 1), q("limit", 10)
    status, employee_id, search = q("status"), q("employeeId"), q("search")
    from_date, to_date = q("fromDate"), q("toDate")
    current_page = js_max(_n0(page) or 1, 1)
    per_page = js_max(_n0(limit) or 10, 1)
    skip = (current_page - 1) * per_page

    docs = ClaimsDeclaration.objects.filter(org=org).select_related("employee").order_by("created_at")
    if employee_id:
        try:
            uuid.UUID(str(employee_id))
            docs = docs.filter(employee_id=employee_id)
        except ValueError:
            docs = docs.none()
    rows = []
    for doc in docs:
        e = doc.employee
        employee = {"_id": str(e.pk), "employeeCode": "", "firstName": e.first_name or "",
                    "lastName": e.last_name or "",
                    "fullName": f"{e.first_name or ''} {e.last_name or ''}".strip(),
                    "email": e.email or ""} if e else {
                        "_id": None, "employeeCode": "", "firstName": "", "lastName": "",
                        "fullName": "", "email": ""}
        for r in doc.reimbursements or []:
            rows.append({
                "_id": r.get("_id"),
                "employee": employee,
                "claimNo": _str_or(r.get("claimNo"), ""),
                "claimGroupId": _str_or(r.get("claimGroupId"), ""),
                "headId": r.get("headId") or None,
                "headName": _str_or(r.get("headName"), ""),
                "headCode": _str_or(r.get("headCode"), ""),
                "name": _str_or(r.get("name"), ""),
                "type": _str_or(r.get("type"), ""),
                "claimDate": r.get("claimDate") or None,
                "billNo": _str_or(r.get("billNo"), ""),
                "particulars": _str_or(r.get("particulars"), ""),
                "claimedAmount": _n0(r.get("claimedAmount", UNDEFINED)),
                "approvedAmount": _n0(r.get("approvedAmount", UNDEFINED)),
                "status": _str_or(r.get("status"), "pending"),
                "proofUrl": _str_or(r.get("proofUrl"), ""),
                "description": _str_or(r.get("description"), ""),
                "employeeComments": _str_or(r.get("employeeComments"), ""),
                "attachmentUrls": r["attachmentUrls"] if isinstance(r.get("attachmentUrls"), list) else [],
                "submittedOn": r.get("submittedOn") or None,
                "approvedBy": r.get("approvedBy") or None,
                "approvedOn": r.get("approvedOn") or None,
                "rejectionReason": _str_or(r.get("rejectionReason"), ""),
            })
    if status:
        rows = [r for r in rows if js_str(r["status"]).lower() == js_str(status).lower()]
    if search:
        kw = js_trim(js_str(search)).lower()

        def hit(v):
            return isinstance(v, str) and kw in v.lower()
        rows = [r for r in rows if hit(r["claimNo"]) or hit(r["billNo"]) or hit(r["headName"])
                or hit(r["type"]) or hit(r["employee"]["fullName"]) or hit(r["employee"]["employeeCode"])]
    if from_date or to_date:
        start = _to_instant(from_date) if from_date else None
        end = _to_instant(to_date) if to_date else None

        def keep(r):
            if not r["claimDate"]:
                return False
            cd = _to_instant(r["claimDate"])
            if from_date and cd is not None and start is not None and cd < start:
                return False
            if to_date and cd is not None and end is not None and cd > end:
                return False
            return True
        rows = [r for r in rows if keep(r)]
    rows = _sort(rows, lambda a, b: _ms(b["submittedOn"]) - _ms(a["submittedOn"]))
    total_claimed = total_approved = 0
    for r in rows:
        total_claimed = js_add(total_claimed, _or0(r["claimedAmount"]))
        if r["status"] == "approved":
            total_approved = js_add(total_approved, _or0(r["approvedAmount"]))
    stats = {
        "total": len(rows),
        "approved": sum(1 for r in rows if r["status"] == "approved"),
        "pending": sum(1 for r in rows if r["status"] == "pending"),
        "rejected": sum(1 for r in rows if r["status"] == "rejected"),
        "totalClaimed": total_claimed,
        "totalApproved": total_approved,
    }
    total = len(rows)
    total_pages = math.ceil(total / per_page) or 1
    return send_response(200, True, "All claims fetched successfully", jsonable({
        "reimbursements": _js_slice(rows, skip, skip + per_page),
        "pagination": {"total": total, "totalPages": total_pages, "currentPage": current_page,
                       "limit": per_page},
        "stats": stats,
    }))


@payroll_view(["GET"], access="any")
def get_my_reimbursement_heads(ctx):
    org = ctx.require_org()
    heads = [{"_id": c.get("_id"), "name": c.get("name", UNDEFINED), "code": c.get("code", UNDEFINED),
              "maxLimit": _or0(c.get("maxLimit")), "frequency": c.get("frequency", UNDEFINED),
              "taxable": c.get("taxable", UNDEFINED) is not False}
             for c in _reimbursement_heads(org) if js_or(c.get("status"), "active") == "active"]
    return send_response(200, True, "Reimbursement heads fetched successfully", jsonable(heads))


_CLAIM_FILE_FIELDS = {"proofFile": 20, "attachments": 10}


@payroll_view(["POST"], access="employee")
def submit_my_claim(ctx):
    from ..models.claims_declaration import new_reimbursement
    from ..services.files import save_upload, validate_upload

    emp = _require_my_employee(ctx)
    org = ctx.org
    # multer runs before the handler: reject bad / surplus files first.
    files = ctx.request.FILES
    for field, max_count in _CLAIM_FILE_FIELDS.items():
        lst = files.getlist(field)
        if len(lst) > max_count:
            raise PayrollError("Unexpected field", 500)
        for f in lst:
            validate_upload(f)
    body = ctx.body or {}
    comments = body.get("comments", UNDEFINED)
    batch_comments = js_str(comments) if not is_nullish(comments) else ""
    items = body.get("items", UNDEFINED)
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except ValueError:
            raise PayrollError("Invalid items JSON format", 400) from None
    if not isinstance(items, list) or len(items) == 0:
        raise PayrollError("items must be a non-empty array", 400)
    rows = items
    if len(rows) > MAX_CLAIM_ITEMS_PER_REQUEST:
        raise PayrollError(f"At most {MAX_CLAIM_ITEMS_PER_REQUEST} line items allowed per request", 400)

    head_by_id = {js_str(c.get("_id")): c for c in _reimbursement_heads(org)}
    claim_group_id = str(uuid.uuid4())
    proof_files = files.getlist("proofFile")
    attachment_files = files.getlist("attachments")

    with transaction.atomic():
        doc = _claims_doc(org, emp, lock=True)
        if doc is None:
            doc = ClaimsDeclaration(org=org, employee=emp, reimbursements=[])
        reimbursements = list(doc.reimbursements or []) if isinstance(doc.reimbursements, list) else []
        pending_in_request = {}
        planned = []
        for i, row in enumerate(rows):
            row = row if isinstance(row, dict) else {}
            head_id = row.get("headId", UNDEFINED)
            claimed_amount = row.get("claimedAmount", UNDEFINED)
            if not js_truthy(head_id) or is_nullish(claimed_amount):
                raise PayrollError(f"items[{i}]: headId and claimedAmount are required", 400)
            claimed = to_number(claimed_amount)
            if not math.isfinite(claimed) or claimed <= 0:
                raise PayrollError(f"items[{i}]: claimedAmount must be greater than 0", 400)
            head = head_by_id.get(js_str(head_id))
            if head is None:
                raise PayrollError(f"items[{i}]: invalid reimbursement headId", 400)
            if js_or(head.get("status"), "active") != "active":
                raise PayrollError(f"items[{i}]: reimbursement head is inactive", 400)
            claim_date = row.get("claimDate", UNDEFINED)
            month_key = get_claim_calendar_month_key(claim_date)
            max_limit = _n0(head.get("maxLimit", UNDEFINED))
            if max_limit > 0:
                if not month_key:
                    raise PayrollError(f"items[{i}]: invalid claimDate", 400)
                bucket = build_monthly_head_bucket_key(head_id, month_key)
                used_db = get_monthly_utilized_for_head(reimbursements, head, month_key)
                used_req = pending_in_request.get(bucket, 0)
                if js_add(js_add(used_db, used_req), claimed) > max_limit:
                    remaining = js_max(0, max_limit - to_number(used_db) - used_req)
                    raise PayrollError(
                        f'items[{i}]: monthly limit exceeded for "{js_str(head.get("name", UNDEFINED))}". '
                        f"Max {js_str(max_limit)} per month ({month_key}), already used "
                        f"{js_str(js_add(used_db, used_req))}, remaining {js_str(remaining)}", 400)
                pending_in_request[bucket] = used_req + claimed
            if js_truthy(claim_date):
                inst = _to_instant(claim_date)
                if inst is None:
                    raise PayrollError(
                        "ClaimsDeclaration validation failed: reimbursements."
                        f'{len(reimbursements) + len(planned)}.claimDate: Cast to date failed for '
                        f'value "Invalid Date" (type Date) at path "claimDate"', 500)
            else:
                inst = _now()
            planned.append((i, row, head, claimed, inst))

        uploaded_attachments = [save_upload(org.pk, f, "claims")["url"] for f in attachment_files]
        base_count = len(reimbursements)
        created = []
        for i, row, head, claimed, inst in planned:
            proof_url = save_upload(org.pk, proof_files[i], "claims")["url"] if i < len(proof_files) else ""
            base_count += 1

            def opt_str(v):
                return js_str(v) if not is_nullish(v) else ""
            values = {
                "claimNo": f"CLM{base_count:04d}" if base_count >= 0 else f"CLM{base_count}",
                "claimGroupId": claim_group_id,
                "headId": head.get("_id"),
                "headName": head.get("name", UNDEFINED),
                "headCode": head.get("code", UNDEFINED),
                "name": js_or(row.get("name", UNDEFINED), head.get("name", UNDEFINED)),
                "type": js_or(row.get("type", UNDEFINED), head.get("code", UNDEFINED), "reimbursement"),
                "claimDate": js_iso(inst),
                "billNo": opt_str(row.get("billNo", UNDEFINED)),
                "particulars": opt_str(row.get("particulars", UNDEFINED)),
                "claimedAmount": claimed,
                "approvedAmount": 0,
                "proofUrl": proof_url,
                "attachmentUrls": list(uploaded_attachments),
                "description": opt_str(row.get("description", UNDEFINED)),
                "employeeComments": batch_comments,
                "submittedOn": js_iso(_now()),
                "status": "pending",
            }
            sub = new_reimbursement(**jsonable({k: v for k, v in values.items() if v is not UNDEFINED}))
            reimbursements.append(sub)
            created.append({"_id": sub["_id"], "claimNo": sub["claimNo"], "headId": sub["headId"],
                            "headName": sub.get("headName", UNDEFINED),
                            "claimedAmount": sub["claimedAmount"], "proofUrl": sub["proofUrl"],
                            "attachmentUrls": sub["attachmentUrls"], "status": sub["status"]})
        doc.reimbursements = reimbursements
        doc.save()
    log_payroll_action(ctx, action="claim_approved", entity_type="claim", entity_id=str(doc.pk),
                       affected_employee=emp, after_data=jsonable(created),
                       remarks=f"Claim submitted by employee (pending approval): {len(created)} item(s), "
                               f"group {claim_group_id}")
    return send_response(200, True, "Claim submitted successfully", jsonable({
        "claimGroupId": claim_group_id, "status": "pending", "count": len(created), "items": created}))



# ====================================================================== payroll info (HR)
#
# Mongoose casting of the Employee nested paths (strict mode drops unknown keys; Number /
# Boolean / Date / String casts; array sub-documents get ``_id`` + defaults).

N, S, ST, B, D = "number", "string", "trim", "boolean", "date"
OVERRIDE_SCHEMA = {"category": (S, UNDEFINED), "code": (ST, ""), "name": (ST, ""),
                   "overrideAmount": (N, None), "disabled": (B, False)}
DEFAULT_COMPONENT_SCHEMA = {"category": (S, UNDEFINED), "code": (ST, ""), "name": (ST, ""),
                            "componentName": (ST, ""), "amount": (N, 0)}
EMPLOYEE_SCHEMAS = {
    "payrollInfo": {
        "baseSalary": N, "grossSalary": N, "ctc": N, "paymentFrequency": S, "currency": S,
        "taxRegime": S, "variablePay": N, "incentives": N, "salaryEffectiveFrom": D,
        "componentOverrides": ("array", OVERRIDE_SCHEMA),
        "defaultComponents": ("array", DEFAULT_COMPONENT_SCHEMA),
    },
    "payrollPreferences": {
        "holdSalary": B, "holdReason": S, "loanDeduction": N, "advanceDeduction": N,
        "vpf": {"enabled": B, "contributionType": S, "percentage": N, "fixedAmount": N,
                "status": S, "acknowledged": B, "requestedAt": D, "effectiveFrom": D},
        "paymentMode": S,
    },
    "taxInfo": {"taxDeclarationSubmitted": B, "taxDeclarationYear": S,
                "investmentProofSubmitted": B, "investmentProofYear": S,
                "estimatedTaxLiability": N, "tdsDeducted": N},
    "bankInfo": {"bankCountry": S, "bankCode": S, "bankName": S, "branchName": S, "ifscCode": S,
                 "swiftCode": S, "bankAccountNumber": S, "confirmBankAccountNumber": S,
                 "accountHolderName": S, "accountType": S, "isVerified": B, "verifiedOn": D},
    "statutoryInfo": {
        "pfAccountNumber": S, "uan": S, "esiNumber": S, "esiApplicable": B, "esiOptedOut": B,
        "ptApplicable": B, "ptState": S, "gratuityApplicable": B, "lwfApplicable": B,
        "lwfState": S, "employmentCategory": S,
        "epfOverride": {"enabled": B, "employeeContributionRate": N,
                        "employerContributionRate": N, "restrictedPfWage": N, "applyCeiling": B},
        "epfApplicable": B,
    },
}
SECTION_ATTRS = {"payrollInfo": "payroll_info", "payrollPreferences": "payroll_preferences",
                 "taxInfo": "tax_info", "bankInfo": "bank_info", "statutoryInfo": "statutory_info"}


def _cast_error(kind, value, path):
    label = {N: "Number", B: "Boolean", D: "date", S: "string", ST: "string"}[kind]
    return PayrollError(f'Cast to {label} failed for value "{js_str(value)}" '
                        f'(type {type(value).__name__}) at path "{path}"', 500)


def _cast_scalar(kind, value, path):
    if value is None or value is UNDEFINED:
        return None
    if kind == N:
        if isinstance(value, str) and js_trim(value) == "":
            return None
        if isinstance(value, (dict, list)):
            raise _cast_error(kind, value, path)
        n = to_number(value)
        if math.isnan(n):
            raise _cast_error(kind, value, path)
        return int(n) if n.is_integer() and abs(n) < 2 ** 53 else n
    if kind == B:
        if value in (True, 1, "1", "true", "yes") and not isinstance(value, float):
            return True
        if value in (False, 0, "0", "false", "no") and not isinstance(value, float):
            return False
        if isinstance(value, float) and value in (0.0, 1.0):
            return value == 1.0
        raise _cast_error(kind, value, path)
    if kind == D:
        if value == "":
            return None
        inst = _to_instant(value)
        if inst is None:
            raise _cast_error(kind, value, path)
        return js_iso(inst)
    if isinstance(value, (dict, list)):
        raise _cast_error(kind, value, path)
    text = js_str(value)
    return js_trim(text) if kind == ST else text


def _cast_obj(value, schema, path):
    if not isinstance(value, dict):
        return {} if value is None else value
    out = {}
    for key, spec in schema.items():
        if key not in value:
            continue
        sub = f"{path}.{key}"
        v = value[key]
        if isinstance(spec, dict):
            out[key] = _cast_obj(v, spec, sub) if isinstance(v, dict) else (None if v is None else
                                                                             _raise_obj(v, sub))
        elif isinstance(spec, tuple) and spec[0] == "array":
            out[key] = _cast_subdocs(v, spec[1], sub)
        else:
            out[key] = _cast_scalar(spec, v, sub)
    return out


def _raise_obj(v, path):
    raise PayrollError(f'Cast to Object failed for value "{js_str(v)}" at path "{path}"', 500)


def _cast_subdocs(items, schema, path):
    if items is None:
        return []
    if not isinstance(items, list):
        items = [items]
    out = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            raise PayrollError(f'Cast to Embedded failed for value "{js_str(item)}" at path "{path}"', 500)
        doc = {"_id": js_str(item.get("_id")) if item.get("_id") else new_subdoc_id()}
        for key, (kind, default) in schema.items():
            if key in item and item[key] is not UNDEFINED:
                doc[key] = _cast_scalar(kind, item[key], f"{path}.{i}.{key}")
            elif default is not UNDEFINED:
                doc[key] = default
        out.append(doc)
    return out


def cast_employee_section(section, value):
    return _cast_obj(value, EMPLOYEE_SCHEMAS[section], section)


def _employee_sections(emp):
    d = emp.to_dict()
    return {k: d.get(k) or {} for k in SECTION_ATTRS}


def _payroll_info_payload(emp):
    sections = _employee_sections(emp)
    return {
        "employee": {"id": str(emp.pk), "name": f"{js_str(emp.first_name)} {js_str(emp.last_name)}",
                     "email": emp.email},
        **{k: sections[k] or {} for k in SECTION_ATTRS},
    }


def _nn(value):
    """JS destructuring default ``= null`` for an argument that may be undefined."""
    return None if value is UNDEFINED else value


def calculate_payroll_info_data(body, salary_components, compliance, employee_doc=None):
    """Pure core of ``calculatePayrollInfo`` (``employee_doc``: the legacy employee or None).
    Returns ``(status, message, data)``."""
    from ..services import salary_component_helper as sch
    from ..services import statutory_calculator as scalc

    base_input = _n0(body.get("baseSalary", UNDEFINED))
    gross_input = _n0(body.get("grossSalary", UNDEFINED))
    state = body.get("state", UNDEFINED)
    component_overrides = body.get("componentOverrides", UNDEFINED)
    statutory_info = body.get("statutoryInfo", UNDEFINED)
    pd = to_number(body.get("presentDays", UNDEFINED))
    wd = to_number(body.get("workingDays", UNDEFINED))
    present_days = pd if math.isfinite(pd) else None
    working_days = wd if math.isfinite(wd) else None
    if base_input <= 0 and gross_input <= 0:
        return 400, "baseSalary or grossSalary is required and must be greater than 0", None

    overrides = []
    emp_stat = None
    if employee_doc is not None:
        overrides = sch.strip_basic_from_overrides(
            js_or(_g(employee_doc.get("payrollInfo"), "componentOverrides"), []))
        stat = employee_doc.get("statutoryInfo")
        emp_stat = dict(stat) if stat else None
    if isinstance(statutory_info, dict) and js_truthy(statutory_info):
        emp_stat = {**(emp_stat or {}), **statutory_info}
    if isinstance(component_overrides, list) and len(component_overrides) > 0:
        overrides = sch.merge_component_overrides(overrides, component_overrides)
    if gross_input > 0 and base_input > 0:
        overrides = sch.with_explicit_basic_override(overrides, base_input, salary_components)
    resolved = sch.resolve_salary_bases_from_input(base_salary=base_input, gross_salary=gross_input,
                                                   salary_components=salary_components,
                                                   overrides=overrides)
    if not resolved:
        return 400, "Unable to resolve salary input", None
    input_mode = resolved["inputMode"]
    calc_overrides = js_or(resolved.get("overridesForCalc", UNDEFINED), overrides)
    earnings_result = sch.build_payroll_earnings_breakdown(
        salary_components=salary_components, resolved_base=resolved["baseSalary"],
        overrides=calc_overrides, input_mode=input_mode, target_gross=resolved["targetGross"])
    earnings = earnings_result["earningsBreakdown"]
    gross = earnings_result["grossSalary"]
    total_earnings = earnings_result["totalEarnings"]
    base_final = earnings_result["resolvedBase"]

    epf_cfg, esi_cfg = _sec(compliance, "epf"), _sec(compliance, "esi")
    pt_cfg, lwf_cfg = _sec(compliance, "professionalTax"), _sec(compliance, "labourWelfareFund")
    bonus_cfg = _sec(compliance, "statutoryBonus")
    deductions = []
    total_ded = 0
    epf = scalc.calculate_epf(epf_config=epf_cfg, base_salary=base_final,
                              epf_applicable_wage=scalc.sum_consider_for_epf(earnings, base_final),
                              employee_statutory_info=emp_stat)
    epf_ee, epf_er = epf["employeeContribution"], epf["employerContribution"]
    epf_edli, epf_admin = epf["edliContribution"], epf["adminCharges"]
    if js_truthy(epf["applicable"]) and to_number(epf_ee) > 0:
        total_ded = js_add(total_ded, epf_ee)
        deductions.append({"name": "EPF (Employee)", "amount": epf_ee, "type": "statutory",
                           "rate": js_str(js_or(_g(epf_cfg, "employeeContributionRate"), 12)) + "%"})
    esi = scalc.calculate_esi(esi_config=esi_cfg, gross_salary=gross,
                              esi_applicable_wage=scalc.sum_consider_for_esi(earnings, gross),
                              employee_statutory_info=emp_stat)
    esi_ee, esi_er = esi["employeeContribution"], esi["employerContribution"]
    if js_truthy(esi["applicable"]) and to_number(esi_ee) > 0:
        total_ded = js_add(total_ded, esi_ee)
        deductions.append({"name": "ESI (Employee)", "amount": esi_ee, "type": "statutory",
                           "rate": js_str(js_or(_g(esi_cfg, "employeeContributionRate"), 0.75)) + "%"})
    pt = scalc.calculate_professional_tax(pt_config=pt_cfg, gross_salary=gross,
                                          employee_state=_nn(state), employee_statutory_info=emp_stat)
    professional_tax = pt["amount"]
    cyclical = 0
    if js_truthy(pt["applicable"]):
        total_ded = js_add(total_ded, professional_tax)
        cyclical = js_add(cyclical, professional_tax)
        deductions.append({"name": "Professional Tax", "amount": professional_tax, "type": "statutory",
                           "rate": "Slab-based",
                           "state": js_or(_g(pt.get("details"), "stateUsed"), state)})
    lwf = scalc.calculate_lwf(lwf_config=lwf_cfg, gross_salary=gross, employee_state=_nn(state),
                              employee_statutory_info=emp_stat)
    if js_truthy(lwf["applicable"]) and to_number(lwf["employeeShare"]) > 0:
        total_ded = js_add(total_ded, lwf["employeeShare"])
        cyclical = js_add(cyclical, lwf["employeeShare"])
        deductions.append({"name": "Labour Welfare Fund", "amount": lwf["employeeShare"],
                           "type": "statutory", "rate": "Fixed",
                           "state": js_or(_g(lwf.get("details"), "stateUsed"), state)})
    bonus = scalc.calculate_statutory_bonus(
        bonus_config=bonus_cfg, basic_plus_da=sch.sum_basic_plus_da(earnings),
        employee_state=_nn(state),
        employee_employment_category=_nn(_g(emp_stat, "employmentCategory")) if emp_stat else None,
        paid_days=present_days, total_days=working_days)

    bases = {"baseSalary": base_final, "grossSalary": gross, "ctc": js_mul(gross, 12)}
    by_cat = {c.get("category"): c for c in reversed(salary_components)}
    ded_comp = by_cat.get("deductions")
    for component in (ded_comp or {}).get("components") or []:
        if component.get("status", UNDEFINED) != "active":
            continue
        override = sch.find_component_override(overrides, "deductions", component)
        default_amount = sch.calculate_component_amount(component, bases, None)
        amount = sch.resolve_payroll_component_amount("deductions", component, bases, overrides)
        monthly = sch.get_frequency_display_amounts(component, amount, None)["monthlyAmount"]
        if sch.should_include_component_in_breakdown(amount, override):
            if to_number(amount) > 0:
                total_ded = js_add(total_ded, monthly)
            deductions.append({
                "name": component.get("name", UNDEFINED), "code": _str_or(component.get("code"), ""),
                "amount": _mround(monthly), "defaultAmount": _mround(default_amount),
                "type": "custom", "rate": component.get("value", UNDEFINED),
                "frequency": sch.normalize_component_frequency(component.get("frequency", UNDEFINED)),
                "isOverridden": sch.has_explicit_override_amount(override),
                "disabled": js_truthy(_g(override, "disabled")),
            })
    benefits = []
    total_benefits = 0
    ben_comp = by_cat.get("benefits")
    for component in (ben_comp or {}).get("components") or []:
        if component.get("status", UNDEFINED) != "active":
            continue
        override = sch.find_component_override(overrides, "benefits", component)
        default_amount = sch.calculate_component_amount(component, bases, None)
        amount = sch.resolve_payroll_component_amount("benefits", component, bases, overrides)
        disp = sch.get_frequency_display_amounts(component, amount, None)
        if sch.should_include_component_in_breakdown(amount, override):
            if to_number(amount) > 0:
                total_benefits = js_add(total_benefits, disp["monthlyAmount"])
            benefits.append({
                "name": component.get("name", UNDEFINED), "code": _str_or(component.get("code"), ""),
                "type": component.get("calculationType", UNDEFINED),
                "value": component.get("value", UNDEFINED),
                "basedOn": _str_or(component.get("basedOn"), "none"),
                "frequency": sch.normalize_component_frequency(component.get("frequency", UNDEFINED)),
                "paymentMonth": _str_or(component.get("paymentMonth"), ""),
                "defaultAmount": _mround(default_amount),
                "calculatedAmount": _mround(disp["monthlyAmount"]),
                "annualAmount": _mround(disp["annualAmount"]),
                "isOverridden": sch.has_explicit_override_amount(override),
                "disabled": js_truthy(_g(override, "disabled")),
                "taxable": component.get("taxable", UNDEFINED) is not False,
            })

    schedule = scalc.build_net_pay_schedule(gross_salary=gross,
                                            base_deductions=js_sub(total_ded, cyclical),
                                            pt_config=_nn(pt_cfg), lwf_config=_nn(lwf_cfg),
                                            employee_state=_nn(state),
                                            employee_statutory_info=emp_stat)
    net_pay = schedule["regular"]
    regular_ded = schedule["regularDeductions"]
    for name, months in (("Professional Tax", schedule["ptMonths"]),
                         ("Labour Welfare Fund", schedule["lwfMonths"])):
        row = next((r for r in deductions if r["name"] == name), None)
        if row is not None:
            row["months"] = months
            row["recurring"] = len(months) == len(PAYROLL_MONTHS)
    esi_er_in_ctc = esi_er if js_truthy(esi["includeEmployerInCtc"]) else 0
    employer_contrib = js_add(js_add(js_add(epf_er, epf_edli), epf_admin), esi_er_in_ctc)
    lwf_per_year = scalc.resolve_lwf_deductions_per_year(lwf, _nn(lwf_cfg))
    annual_lwf_er = js_mul(_or0(lwf["employerShare"]), lwf_per_year)
    bonus_details = bonus.get("details") or {}
    annual_bonus = _or0(bonus_details.get("annualEquivalent", UNDEFINED))

    def sum_of(rows, key, mul=1):
        t = 0
        for r in rows:
            t = js_add(t, js_mul(_n0(r.get(key, UNDEFINED)), mul) if mul != 1 else _n0(r.get(key, UNDEFINED)))
        return t
    non_monthly = js_add(js_sub(js_add(js_sub(sum_of(earnings, "annualAmount"),
                                              sum_of(earnings, "calculatedAmount", 12)),
                                       sum_of(benefits, "annualAmount")),
                                sum_of(benefits, "calculatedAmount", 12)), 0)
    monthly_ctc = js_add(js_add(gross, total_benefits), employer_contrib)
    annual_ctc = js_add(js_add(js_add(js_mul(monthly_ctc, 12), annual_lwf_er), annual_bonus),
                        js_max(0, non_monthly))
    calculated = {
        "baseSalary": base_final, "grossSalary": _mround(gross), "totalDeductions": regular_ded,
        "netPay": _mround(net_pay), "ctc": _mround(annual_ctc), "paymentFrequency": "Monthly",
        "currency": "INR", "taxRegime": "New", "variablePay": 0, "incentives": 0,
        "salaryEffectiveFrom": js_iso(_now()),
    }
    lwf_details = lwf.get("details") or {}
    data = {
        "inputMode": input_mode,
        "componentOverrides": sch.strip_basic_from_overrides(overrides),
        "payrollInfo": calculated,
        "breakdown": {
            "earnings": {"baseSalary": base_final, "components": earnings,
                         "totalAdditional": _mround(js_sub(total_earnings, base_final)),
                         "grossSalary": _mround(gross)},
            "deductions": {
                "statutory": {
                    "epf": {"employee": epf_ee, "employer": epf_er, "edli": epf_edli,
                            "adminCharges": epf_admin, "wage": epf["epfWage"],
                            "abryApplied": epf["abryApplied"]},
                    "esi": {"employee": esi_ee, "employer": esi_er},
                    "professionalTax": professional_tax,
                    "lwf": {"employee": lwf["employeeShare"], "employer": lwf["employerShare"],
                            "state": _str_or(lwf_details.get("stateUsed"), ""),
                            "cycle": _str_or(lwf_details.get("cycle"), ""),
                            "months": js_or(lwf_details.get("months", UNDEFINED), []),
                            "deductionsPerYear": lwf_per_year,
                            "annualEmployer": _mround(annual_lwf_er)},
                },
                "components": deductions,
                "totalDeductions": regular_ded,
                "totalDeductionsPeakMonth": _mround(total_ded),
            },
            "benefits": {"components": benefits, "totalBenefits": _mround(total_benefits),
                         "totalBenefitsAnnual": _mround(sum_of(benefits, "annualAmount"))},
            "statutoryBonus": {
                "applicable": bonus["applicable"],
                "monthlyEquivalent": _or0(bonus_details.get("monthlyEquivalent", UNDEFINED)),
                "annualEquivalent": annual_bonus,
                "paidInMonth": _str_or(bonus_details.get("paymentMonth"), ""),
                "calcBase": _or0(bonus_details.get("calcBase", UNDEFINED)),
                "percentage": _or0(bonus_details.get("percentage", UNDEFINED)),
            },
            "summary": {
                "grossSalary": _mround(gross), "totalBenefits": _mround(total_benefits),
                "totalDeductions": regular_ded, "netPay": _mround(net_pay),
                "netPaySchedule": schedule, "monthlyCTC": _mround(monthly_ctc),
                "annualCTC": _mround(annual_ctc), "employerContributions": _mround(employer_contrib),
                "annualLwfEmployer": _mround(annual_lwf_er),
                "takeHomePercentage": _mround(js_mul(js_div(net_pay, gross), 100)),
            },
        },
    }
    return 200, "Payroll info calculated successfully", jsonable(data)


@payroll_view(["POST"])
def calculate_payroll_info(ctx):
    org = ctx.require_org()
    body = ctx.body
    base_input = _n0(body.get("baseSalary", UNDEFINED))
    gross_input = _n0(body.get("grossSalary", UNDEFINED))
    if base_input <= 0 and gross_input <= 0:
        raise PayrollError("baseSalary or grossSalary is required and must be greater than 0", 400)
    employee_doc = None
    if js_truthy(body.get("employeeId", UNDEFINED)):
        employee_doc = get_employee(ctx, body["employeeId"]).to_dict()
    status, message, data = calculate_payroll_info_data(body, _components_docs(org),
                                                        _compliance_doc(org), employee_doc)
    if status != 200:
        raise PayrollError(message, status)
    return send_response(200, True, message, data)


def salary_structure_preview_data(employee_doc, salary_components, query):
    from ..services import salary_component_helper as sch

    pinfo = employee_doc.get("payrollInfo") or {}
    overrides = js_or(_g(pinfo, "componentOverrides"), [])
    base_input = js_or(_n0(query.get("baseSalary", UNDEFINED)), _n0(_g(pinfo, "baseSalary")),
                       _n0(_g(employee_doc, "baseSalary")), 0)
    gross_input = js_or(_n0(query.get("grossSalary", UNDEFINED)), _n0(_g(pinfo, "grossSalary")),
                        _n0(_g(employee_doc, "grossSalary")), 0)
    resolved = sch.resolve_salary_bases_from_input(base_salary=base_input, gross_salary=gross_input,
                                                   salary_components=salary_components,
                                                   overrides=overrides)
    if not resolved:
        return None
    resolved_base = resolved["baseSalary"]
    resolved_ctc = js_or(_n0(query.get("ctc", UNDEFINED)), _n0(_g(pinfo, "ctc")),
                         _n0(_g(employee_doc, "ctc")), js_mul(gross_input, 12),
                         js_mul(resolved_base, 12))
    bases = {"baseSalary": resolved_base, "ctc": resolved_ctc}
    if js_truthy(gross_input):
        bases = {"baseSalary": resolved_base, "grossSalary": gross_input, "ctc": resolved_ctc}
    structure = sch.build_salary_structure_preview(salary_components, bases, overrides)
    earnings = list(structure["earnings"])
    gross_mode = resolved["inputMode"] == "gross" and resolved.get("targetGross") is not None
    if gross_mode:
        line = sch.build_balancing_allowance_line(
            js_sub(resolved["targetGross"], structure["totals"]["grossSalaryMonthly"]))
        if line:
            earnings.append({
                "category": "earnings", "name": line["name"], "code": line["code"],
                "calculationType": line["type"], "basedOn": line["basedOn"],
                "orgValue": line["value"], "defaultMonthlyAmount": line["defaultAmount"],
                "overrideAmount": None, "monthlyAmount": line["calculatedAmount"],
                "annualAmount": line["annualAmount"], "isOverridden": False, "disabled": False,
                "isBalancing": True,
            })
    gross_monthly = resolved["targetGross"] if gross_mode else structure["totals"]["grossSalaryMonthly"]
    return jsonable({
        "inputMode": resolved["inputMode"],
        "employee": {"id": employee_doc["_id"],
                     "name": f"{employee_doc.get('firstName') or ''} {employee_doc.get('lastName') or ''}".strip(),
                     "email": employee_doc.get("email", UNDEFINED)},
        "salaryBases": {"baseSalary": resolved_base, "grossSalary": gross_monthly, "ctc": resolved_ctc},
        "componentOverrides": overrides,
        "earnings": earnings,
        "deductions": structure["deductions"],
        "benefits": structure["benefits"],
        "reimbursements": structure["reimbursements"],
        "totals": {**structure["totals"], "grossSalaryMonthly": gross_monthly},
    })


@payroll_view(["GET"])
def get_salary_structure_preview(ctx, employeeId):
    org = ctx.require_org()
    emp = get_employee(ctx, employeeId)
    query = {k: ctx.query(k) for k in ("baseSalary", "grossSalary", "ctc") if ctx.query(k) is not None}
    data = salary_structure_preview_data(emp.to_dict(), _components_docs(org), query)
    if data is None:
        raise PayrollError("baseSalary or grossSalary is required (query or employee payrollInfo)", 400)
    return send_response(200, True, "Salary structure preview fetched successfully", data)


def _audit_payroll_info(ctx, emp, before, remarks):
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=str(emp.pk), affected_employee=emp, before_data=before,
                       after_data=jsonable(_employee_sections(emp)), remarks=remarks)


@payroll_view(["PUT"])
def save_employee_component_overrides(ctx, employeeId):
    from ..services import salary_component_helper as sch

    org = ctx.require_org()
    body = ctx.body
    component_overrides = body.get("componentOverrides", UNDEFINED)
    payroll_info = body.get("payrollInfo", UNDEFINED)
    if not isinstance(component_overrides, list):
        raise PayrollError("componentOverrides array is required", 400)
    emp = get_employee(ctx, employeeId)
    normalized = sch.strip_basic_from_overrides(component_overrides)
    with transaction.atomic():
        emp = PayrollEmployee.objects.select_for_update().get(pk=emp.pk)
        before = jsonable(_employee_sections(emp))
        current = dict(emp.payroll_info or {})
        merged = {**current, **(payroll_info if isinstance(payroll_info, dict) else {}),
                  "componentOverrides": normalized}
        emp.payroll_info = cast_employee_section("payrollInfo", merged)
        emp.save()
    pinfo = emp.payroll_info
    structure = sch.build_salary_structure_preview(
        _components_docs(org),
        {"baseSalary": _or0(pinfo.get("baseSalary")), "grossSalary": _or0(pinfo.get("grossSalary")),
         "ctc": _or0(pinfo.get("ctc"))},
        normalized)
    _audit_payroll_info(ctx, emp, before, "Employee component overrides saved")
    return send_response(200, True, "Employee component overrides saved successfully", jsonable({
        "employeeId": str(emp.pk), "componentOverrides": normalized,
        "payrollInfo": emp.payroll_info, "preview": structure}))


@payroll_view(["GET"], access="any")
def get_employee_payroll_info(ctx, employeeId):
    ctx.require_org()
    emp = get_employee(ctx, employeeId)
    return send_response(200, True, "Payroll information fetched successfully",
                         jsonable(_payroll_info_payload(emp)))


@payroll_view(["PUT"])
def update_employee_payroll_info(ctx, employeeId):
    from ..services import salary_component_helper as sch

    ctx.require_org()
    body = ctx.body
    emp = get_employee(ctx, employeeId)
    with transaction.atomic():
        emp = PayrollEmployee.objects.select_for_update().get(pk=emp.pk)
        before = jsonable(_employee_sections(emp))
        locked = set(emp.locked_fields or [])
        for key, attr in SECTION_ATTRS.items():
            patch = body.get(key, UNDEFINED)
            if not js_truthy(patch):
                continue
            patch_dict = patch if isinstance(patch, dict) else {}
            merged = {**dict(getattr(emp, attr) or {}), **patch_dict}
            if key == "payrollInfo" and js_truthy(patch_dict.get("componentOverrides", UNDEFINED)):
                merged["componentOverrides"] = sch.normalize_overrides(patch_dict["componentOverrides"])
            setattr(emp, attr, cast_employee_section(key, merged))
            # Keep the BSS sync from overwriting hand-edited bank / statutory data.
            if key == "bankInfo":
                locked.add("bank_info")
            elif key == "statutoryInfo":
                locked.update(f"statutoryInfo.{sub}" for sub in patch_dict
                              if sub in EMPLOYEE_SCHEMAS["statutoryInfo"])
        emp.locked_fields = sorted(locked)
        emp.save()
    _audit_payroll_info(ctx, emp, before, "Employee payroll information updated: " + ", ".join(
        k for k in SECTION_ATTRS if js_truthy(body.get(k, UNDEFINED))))
    return send_response(200, True, "Payroll information updated successfully",
                         jsonable(_payroll_info_payload(emp)))


def salary_components_data(records):
    categorized = {"earnings": [], "deductions": [], "benefits": [], "reimbursements": []}
    for comp in sorted(records, key=lambda r: js_str(r.get("category"))):
        if comp.get("category") in categorized:
            categorized[comp["category"]] = comp.get("components") or []

    def active(lst):
        return sum(1 for c in lst if c.get("status") == "active")
    return jsonable({
        "components": categorized,
        "summary": {"totalEarnings": active(categorized["earnings"]),
                    "totalDeductions": active(categorized["deductions"]),
                    "totalBenefits": active(categorized["benefits"]),
                    "totalReimbursements": active(categorized["reimbursements"])},
    })


@payroll_view(["GET"], access="any")
def get_salary_components(ctx):
    org = ctx.require_org()
    return send_response(200, True, "Salary components fetched successfully",
                         salary_components_data(_components_docs(org)))


def bulk_payroll_info_for(emp_entry, employee_doc, salary_components, compliance):
    """Per-employee calculation of ``bulkUpdatePayrollInfo`` -> legacy ``payrollInfo``."""
    from ..services import statutory_calculator as scalc

    base_salary = emp_entry.get("baseSalary", UNDEFINED)
    state = emp_entry.get("state", UNDEFINED)
    stat = employee_doc.get("statutoryInfo", UNDEFINED)
    total_earnings = base_salary
    by_cat = {c.get("category"): c for c in reversed(salary_components)}
    for component in (by_cat.get("earnings") or {}).get("components") or []:
        if component.get("status") != "active":
            continue
        amount = 0
        ctype, based = component.get("calculationType"), component.get("basedOn")
        if ctype == "percentage" and based == "basic":
            amount = js_div(js_mul(base_salary, component.get("value", UNDEFINED)), 100)
        elif ctype == "fixed":
            amount = _or0(component.get("value"))
        max_limit = component.get("maxLimit", UNDEFINED)
        if to_number(max_limit) > 0 and to_number(amount) > to_number(max_limit):
            amount = max_limit
        total_earnings = js_add(total_earnings, amount)
    gross = total_earnings
    total_ded = 0
    epf = scalc.calculate_epf(epf_config=_sec(compliance, "epf"), base_salary=base_salary,
                              epf_applicable_wage=base_salary, employee_statutory_info=_nn(stat))
    if js_truthy(epf["applicable"]):
        total_ded = js_add(total_ded, epf["employeeContribution"])
    esi = scalc.calculate_esi(esi_config=_sec(compliance, "esi"), gross_salary=gross,
                              esi_applicable_wage=gross, employee_statutory_info=_nn(stat))
    if js_truthy(esi["applicable"]):
        total_ded = js_add(total_ded, esi["employeeContribution"])
    pt = scalc.calculate_professional_tax(pt_config=_sec(compliance, "professionalTax"),
                                          gross_salary=gross, employee_state=_nn(state),
                                          employee_statutory_info=_nn(stat))
    if js_truthy(pt["applicable"]):
        total_ded = js_add(total_ded, pt["amount"])
    for component in (by_cat.get("deductions") or {}).get("components") or []:
        if component.get("status") != "active":
            continue
        amount = 0
        ctype, based = component.get("calculationType"), component.get("basedOn")
        if ctype == "percentage":
            if based == "gross":
                amount = js_div(js_mul(gross, component.get("value", UNDEFINED)), 100)
            elif based == "basic":
                amount = js_div(js_mul(base_salary, component.get("value", UNDEFINED)), 100)
        elif ctype == "fixed":
            amount = _or0(component.get("value"))
        total_ded = js_add(total_ded, amount)
    net = js_sub(gross, total_ded)
    ctc = js_mul(gross, 12)
    return {"baseSalary": base_salary, "grossSalary": _mround(gross),
            "totalDeductions": _mround(total_ded), "netPay": _mround(net), "ctc": _mround(ctc),
            "salaryEffectiveFrom": js_iso(_now())}


@payroll_view(["POST"])
def bulk_update_payroll_info(ctx):
    org = ctx.require_org()
    employees = ctx.body.get("employees", UNDEFINED)
    if not isinstance(employees, list) or len(employees) == 0:
        raise PayrollError("Employees array is required", 400)
    components = _components_docs(org)
    compliance = _compliance_doc(org)
    results, errors = [], []
    for entry in employees:
        entry_d = entry if isinstance(entry, dict) else {}
        employee_id = entry_d.get("employeeId", UNDEFINED)
        try:
            if not js_truthy(employee_id) or not js_truthy(entry_d.get("baseSalary", UNDEFINED)):
                errors.append({"employeeId": employee_id, "error": "employeeId and baseSalary are required"})
                continue
            try:
                emp = get_employee(ctx, employee_id)
            except PayrollError:
                errors.append({"employeeId": employee_id, "error": "Employee not found"})
                continue
            payroll_info = bulk_payroll_info_for(entry_d, emp.to_dict(), components, compliance)
            with transaction.atomic():
                locked = PayrollEmployee.objects.select_for_update().get(pk=emp.pk)
                before = jsonable(_employee_sections(locked))
                locked.payroll_info = cast_employee_section(
                    "payrollInfo", {**dict(locked.payroll_info or {}), **payroll_info})
                locked.save()
            _audit_payroll_info(ctx, locked, before, "Bulk payroll info update")
            results.append({"employeeId": employee_id,
                            "name": f"{js_str(emp.first_name)} {js_str(emp.last_name)}",
                            "status": "success", "payrollInfo": payroll_info})
        except PayrollError as err:
            errors.append({"employeeId": employee_id, "error": str(err)})
    return send_response(200, True, "Bulk update completed", jsonable({
        "total": len(employees), "successful": len(results), "failed": len(errors),
        "results": results, "errors": errors}))


ROUTES = [
    # literal "employee/..." routes first (Express registration order)
    ("employee/dashboard", get_my_payroll_dashboard, "employee_dashboard"),
    ("employee/form16", get_my_form16, "employee_form16"),
    ("employee/form16/part-a/download", download_my_form16_part_a_pdf, "employee_form16_part_a"),
    ("employee/form16/part-b/download", download_my_form16_part_b_pdf, "employee_form16_part_b"),
    ("employee/form16/download", download_my_form16_pdf, "employee_form16_download"),
    ("employee/myPayslips", get_my_payslips, "employee_my_payslips"),
    ("employee/myPayslips/<str:payrollId>", get_my_payslip_detail, "employee_my_payslip_detail"),
    ("employee/salarySummary", get_my_salary_summary, "employee_salary_summary"),
    ("employee/annualSalaryStatement", get_my_annual_salary_statement,
     "employee_my_annual_salary_statement"),
    ("employee/getMySalaryPdfdownload/<str:payrollId>", get_my_salary_pdf_download,
     "employee_my_salary_pdf"),
    ("employee/myClaimsSummary", get_my_claims_summary, "employee_my_claims_summary"),
    ("employee/reimbursementHeads", get_my_reimbursement_heads, "employee_reimbursement_heads"),
    ("employee/submitClaim", submit_my_claim, "employee_submit_claim"),
    ("employee/getAllClaimsSummary", get_all_claims_summary, "employee_all_claims_summary"),
    # parameterised
    ("employee/<str:employeeId>/annualSalaryStatement", get_employee_annual_salary_statement,
     "employee_annual_salary_statement"),
    ("calculatePayrollInfo", calculate_payroll_info, "calculate_payroll_info"),
    ("employee/<str:employeeId>/payrollInfo",
     by_method(get=get_employee_payroll_info, put=update_employee_payroll_info),
     "employee_payroll_info"),
    ("employee/<str:employeeId>/salary-structure-preview", get_salary_structure_preview,
     "employee_salary_structure_preview"),
    ("employee/<str:employeeId>/component-overrides", save_employee_component_overrides,
     "employee_component_overrides"),
    ("salaryComponents", get_salary_components, "salary_components"),
    ("bulkUpdatePayrollInfo", bulk_update_payroll_info, "bulk_update_payroll_info"),
]
