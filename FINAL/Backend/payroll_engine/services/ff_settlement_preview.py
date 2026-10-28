"""Port of ``utils/payroll/ffSettlementPreview.js`` (Full & Final suggested amounts).

Exported (legacy name -> port):
    buildSettlementPreview -> build_settlement_preview
    leaveRate              -> leave_rate
    buildGratuity          -> build_gratuity
    GRATUITY_CAP           -> GRATUITY_CAP

Internal helpers keep their legacy names in snake_case (``round_money``,
``service_breakup``, ``months_in_bonus_year``, ``da_amount``, ``days_in_month``).
``compute_settlement_preview`` is the pure part of ``buildSettlementPreview`` (after the
three queries) so the maths can be differential-tested against the JS.

Dates follow JS ``Date`` semantics with the server TZ Asia/Kolkata: inputs are parsed
like ``new Date(x)`` and calendar parts (``getFullYear``/``getMonth``/``getDate``) are
read in local time.
"""

import math
import re
from datetime import datetime, timezone

from .ff_leave_encashment_helper import js_new_date
from .financial_year import LOCAL_TZ
from .jsmath import (UNDEFINED, is_nullish, js_div, js_gt, js_min, js_nc, js_or, js_out, js_round, js_str,
                     js_truthy, num0)

GRATUITY_CAP = 2000000
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
EARLY_GRATUITY_EXITS = ["Expired (Death)", "Permanent Disability"]
_DA_RE = re.compile(r"dearness|\bda\b", re.IGNORECASE | re.ASCII)


def round_money(value=UNDEFINED):
    return js_round(num0(value) * 100) / 100


def _local(instant):
    return instant.astimezone(LOCAL_TZ)


def days_in_month(instant):
    loc = _local(instant)
    nxt = datetime(loc.year + (loc.month == 12), loc.month % 12 + 1, 1)
    return (nxt - datetime(loc.year, loc.month, 1)).days


def _set_full_year(loc, year):
    """``date.setFullYear(year)`` on a local datetime (Feb 29 overflows to Mar 1)."""
    try:
        return loc.replace(year=year)
    except ValueError:
        return loc.replace(year=year, month=3, day=1)


def service_breakup(joining_date=UNDEFINED, last_working_date=UNDEFINED):
    empty = {"completedYears": 0, "extraDays": 0, "gratuityYears": 0}
    if not js_truthy(joining_date) or not js_truthy(last_working_date):
        return empty
    start = js_new_date(joining_date)
    end = js_new_date(last_working_date)
    if start is None or end is None or end < start:
        return empty
    s_loc, e_loc = _local(start), _local(end)
    years = e_loc.year - s_loc.year
    anniversary = _set_full_year(s_loc, s_loc.year + years)
    if anniversary > e_loc:
        years -= 1
        anniversary = _set_full_year(anniversary, s_loc.year + years)  # mutates the overflowed date
    diff_ms = (end - anniversary.astimezone(timezone.utc)).total_seconds() * 1000
    extra_days = max(0, math.floor(diff_ms / 86400000))
    return {
        "completedYears": max(0, years),
        "extraDays": extra_days,
        "gratuityYears": max(0, years) + (1 if extra_days >= 183 else 0),
    }


def months_in_bonus_year(last_working_date=UNDEFINED):
    end = js_new_date(last_working_date)
    if end is None:
        return float("nan")
    month = _local(end).month - 1
    start_month = 3
    if month >= start_month:
        return month - start_month + 1
    return month + 1 + (12 - start_month)


def da_amount(payroll_info=UNDEFINED):
    payroll_info = {} if is_nullish(payroll_info) else payroll_info
    rows = list(payroll_info.get("componentOverrides") or []) + \
        list(payroll_info.get("defaultComponents") or [])
    total = 0
    for row in rows:
        row_d = row if isinstance(row, dict) else {}
        name = js_str(js_or(row_d.get("name", UNDEFINED), row_d.get("componentName", UNDEFINED), ""))
        if not _DA_RE.search(name) or js_truthy(row_d.get("disabled")):
            continue
        total += num0(js_nc(row_d.get("overrideAmount", UNDEFINED), row_d.get("amount", UNDEFINED)))
    return total


def leave_rate(method=UNDEFINED, basic=UNDEFINED, gross=UNDEFINED):
    text = js_str(method)
    use_gross = text.startswith("gross")
    divisor = 30 if text.endswith("30") else 26
    base = gross if use_gross else basic
    per_day_rate = round_money(js_div(base, divisor)) if js_gt(base, 0) else 0
    label = f"{'Gross' if use_gross else 'Basic'} / {divisor}"
    return js_out({"perDayRate": per_day_rate, "label": label,
                   "formula": f"{label} = {js_str(round_money(base))} / {divisor}"})


def build_gratuity(basic=UNDEFINED, da=UNDEFINED, joining_date=UNDEFINED,
                   last_working_date=UNDEFINED, exit_status=UNDEFINED):
    wage = round_money(num0(basic) + num0(da))
    service = service_breakup(joining_date, last_working_date)
    early_exit = exit_status in EARLY_GRATUITY_EXITS
    is_eligible = early_exit or service["completedYears"] >= 5
    reason = (f"Completed service is {service['completedYears']} year(s) and "
              f"{service['extraDays']} day(s).")
    if early_exit:
        reason = "Payable on death or permanent disability without the 5 year condition."
    elif service["completedYears"] >= 5:
        reason = ("Eligible under the Payment of Gratuity Act. A balance of 6 months or more "
                  "counts as one more year.")
    else:
        reason = f"{reason} Minimum continuous service is 5 years."
    raw = (wage * 15 * service["gratuityYears"]) / 26 if is_eligible else 0
    capped = raw > GRATUITY_CAP
    gratuity_amount = round_money(js_min(GRATUITY_CAP, raw))
    formula = (f"(Last drawn Basic + DA × 15 × {service['gratuityYears']}) / 26"
               f"{'. Capped at 20,00,000.' if capped else ''}") if is_eligible else "Not eligible"
    return js_out({
        "isEligible": is_eligible,
        "yearsOfService": service["gratuityYears"],
        "completedYears": service["completedYears"],
        "lastDrawnSalary": wage,
        "gratuityAmount": gratuity_amount,
        "formula": formula,
        "reason": reason,
        "capped": capped,
    })


def resolve_last_working_date(last_working_date, employee_doc, now=None):
    """``lwd`` of the legacy preview: query value, else exit data, else now."""
    if js_truthy(last_working_date):
        return js_new_date(last_working_date)
    exit_data = employee_doc.get("exitData") or {}
    value = js_or(exit_data.get("lastWorkingDay", UNDEFINED), exit_data.get("date", UNDEFINED), None)
    if value is None:
        return now or datetime.now(timezone.utc)
    return js_new_date(value)


def compute_settlement_preview(employee_doc, lwd, paid_run, leave_encashment, bonus_config):
    """Pure body of ``buildSettlementPreview``; ``lwd`` is a valid aware datetime,
    ``paid_run`` truthy when a processed/approved/paid run exists for the LWD month,
    ``leave_encashment`` the helper's ``data.leaveEncashment`` (or {}),
    ``bonus_config`` the compliance ``statutoryBonus`` (UNDEFINED when absent)."""
    from .statutory_calculator import calculate_statutory_bonus

    payroll_info = employee_doc.get("payrollInfo") or {}
    basic = num0(payroll_info.get("baseSalary"))
    gross = num0(payroll_info.get("grossSalary"))
    da = da_amount(employee_doc.get("payrollInfo", UNDEFINED))
    allowances = max(0, round_money(gross - basic))
    loc = _local(lwd)
    month_days = days_in_month(lwd)
    worked_days = min(month_days, loc.day)
    month_label = MONTHS[loc.month - 1]

    prorated_salary = 0 if paid_run else round_money((gross * worked_days) / month_days)
    if paid_run:
        salary_formula = (f"Salary for {month_label} {loc.year} is already processed, "
                          "so prorated salary is 0.")
    else:
        salary_formula = (f"Prorated salary = monthly gross {js_str(round_money(gross))} × "
                          f"{worked_days} / {month_days}. Basic and allowances are not added again.")

    leave = leave_encashment or {}
    method = "basic_26"
    rate = leave_rate(method, basic, gross)
    encashable_leaves = num0(leave.get("encashableLeaves"))
    leave_total = round_money(encashable_leaves * rate["perDayRate"])

    bonus_cfg = bonus_config if not is_nullish(bonus_config) else UNDEFINED
    months = months_in_bonus_year(lwd)
    present = employee_doc.get("presentAddress") or {}
    permanent = employee_doc.get("permanentAddress") or {}
    statutory = calculate_statutory_bonus(
        bonus_config=bonus_cfg, basic_plus_da=basic + da,
        employee_state=js_or(present.get("state", UNDEFINED), permanent.get("state", UNDEFINED), None),
        month=None, year=loc.year)
    details = statutory.get("details") or {}
    cfg = bonus_cfg if isinstance(bonus_cfg, dict) else {}
    monthly_bonus = num0(details.get("monthlyEquivalent"))
    statutory_bonus = round_money(monthly_bonus * months) \
        if (js_truthy(statutory.get("applicable")) or monthly_bonus > 0) else 0
    variable_pay = num0(payroll_info.get("variablePay"))
    incentive_annual = num0(payroll_info.get("incentives"))
    bonus_formula = "Statutory bonus is not enabled in payroll compliance."
    if js_truthy(cfg.get("isEnabled")) and js_truthy(details.get("reason")):
        bonus_formula = f"Statutory bonus not applied: {js_str(details.get('reason'))}."
    if statutory_bonus > 0:
        pct = js_or(details.get("percentage", UNDEFINED), cfg.get("percentage", UNDEFINED), 8.33)
        bonus_formula = (f"Bonus Act: wage base {js_str(round_money(details.get('calcBase', UNDEFINED)))}"
                         f" × {js_str(pct)}% × {months} month(s) of the April–March year.")

    exit_data = employee_doc.get("exitData") or {}
    gratuity = build_gratuity(basic=basic, da=da,
                              joining_date=employee_doc.get("dateOfJoining", UNDEFINED),
                              last_working_date=lwd,
                              exit_status=js_or(exit_data.get("exitStatus", UNDEFINED), ""))

    return js_out({
        "employee": {
            "id": employee_doc.get("_id"),
            "name": f"{employee_doc.get('firstName') or ''} {employee_doc.get('lastName') or ''}".strip(),
            "employeeCode": employee_doc.get("uniqueId") or "",
            "exitStatus": exit_data.get("exitStatus") or "",
            "dateOfJoining": employee_doc.get("dateOfJoining") or None,
        },
        "salaryDues": {
            "unpaidSalary": 0,
            "workingDaysInLastMonth": worked_days,
            "proratedSalary": prorated_salary,
            "basicSalary": round_money(basic),
            "allowances": allowances,
            "formula": salary_formula,
        },
        "leaveEncashment": {
            "availableLeaves": num0(leave.get("availableLeaves")),
            "encashableLeaves": encashable_leaves,
            "perDayRate": rate["perDayRate"],
            "totalAmount": leave_total,
            "method": method,
            "basicSalary": round_money(basic),
            "grossSalary": round_money(gross),
            "formula": (f"Encashable leaves × ({rate['formula']}). Only paid leave types "
                        "marked encashable are counted."),
        },
        "bonusIncentives": {
            "performanceBonus": round_money((variable_pay * months) / 12),
            "statutoryBonus": statutory_bonus,
            "incentives": round_money((incentive_annual * months) / 12),
            "commission": 0,
            "method": "bonus_act" if js_truthy(cfg.get("isEnabled")) else "not_enabled",
            "formula": bonus_formula,
            "monthsCounted": months,
            "calcBase": js_or(round_money(details.get("calcBase", UNDEFINED)), 0),
            "percentage": num0(js_or(details.get("percentage", UNDEFINED), cfg.get("percentage", UNDEFINED))),
            "eligible": statutory_bonus > 0,
        },
        "gratuity": gratuity,
    })


def build_settlement_preview(org, employee_id, last_working_date=None):
    """Returns ``{"error": {...}}`` or ``{"data": {...}}`` like the legacy helper."""
    from ..models import PayrollEmployee, PayrollRun, StatutoryCompliance
    from .ff_leave_encashment_helper import get_employee_leave_encashment_details

    try:
        employee = PayrollEmployee.objects.filter(org=org, pk=employee_id).first()
    except Exception:  # noqa: BLE001 — malformed id
        employee = None
    if employee is None:
        return {"error": {"status": 404, "message": "Employee not found"}}
    doc = employee.to_dict()

    lwd = resolve_last_working_date(last_working_date, doc)
    if lwd is None:
        return {"error": {"status": 400, "message": "Invalid last working date"}}

    loc = _local(lwd)
    paid_run = PayrollRun.objects.filter(
        org=org, employee=employee, month=MONTHS[loc.month - 1], year=loc.year,
        pay_status__in=["processed", "approved", "paid"]).only("id", "pay_status").first()

    leave_result = get_employee_leave_encashment_details(org, employee_id, as_of_date=lwd,
                                                         employee=employee)
    leave = (leave_result.get("data") or {}).get("leaveEncashment") or {}

    compliance = StatutoryCompliance.objects.filter(org=org).first()
    bonus_config = compliance.statutory_bonus if compliance is not None else UNDEFINED

    return {"data": compute_settlement_preview(doc, lwd, paid_run is not None, leave, bonus_config)}
