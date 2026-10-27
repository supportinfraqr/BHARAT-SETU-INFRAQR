"""Payslip working / paid days.

Port of ``FINAL/legacy_payroll/utils/payslipAttendance.js`` (1:1, same semantics).

Exported (legacy name -> port):
    getMonthDateStrings        -> get_month_date_strings
    getCalendarDaysInMonth     -> get_calendar_days_in_month
    resolvePayslipPaidDays     -> resolve_payslip_paid_days
    getPayslipAttendanceDays   -> get_payslip_attendance_days (legacy was async; sync here)
"""

import math

from .financial_year import js_local_date
from .jsmath import UNDEFINED, is_integer, is_nullish, js_get, js_max, js_or, js_out, js_str, js_trim, js_truthy, to_number

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

_MONTH_MAP = {
    "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5, "july": 6,
    "august": 7, "september": 8, "october": 9, "november": 10, "december": 11,
}


def _get_month_index(month_name):
    if is_nullish(month_name):
        return -1
    raw = js_trim(js_str(month_name))
    if not raw:
        return -1
    for i, m in enumerate(MONTHS):
        if m.lower() == raw.lower():
            return i
    mapped = _MONTH_MAP.get(raw.lower())
    return mapped if mapped is not None else -1


def _last_day(year, month_idx):
    d = js_local_date(year, month_idx + 1, 0)
    return d.day if d is not None else float("nan")


def get_month_date_strings(month_name=UNDEFINED, year=UNDEFINED):
    month_idx = _get_month_index(month_name)
    if month_idx == -1 or not js_truthy(year):
        return None
    y = to_number(year)
    mm = str(month_idx + 1).rjust(2, "0")
    last_day = _last_day(y, month_idx)
    return {
        "startDate": f"{js_str(y)}-{mm}-01",
        "endDate": f"{js_str(y)}-{mm}-{js_str(last_day).rjust(2, '0')}",
    }


def get_calendar_days_in_month(month_name=UNDEFINED, year=UNDEFINED):
    month_idx = _get_month_index(month_name)
    y = to_number(year)
    if month_idx == -1 or not is_integer(y):
        return 0
    return js_out(_last_day(y, month_idx))


def resolve_payslip_paid_days(payroll=UNDEFINED, month=UNDEFINED, year=UNDEFINED):
    """Paid Days = Calendar Days − LOP (stored on payroll as presentDays)."""
    if payroll is UNDEFINED:
        payroll = {}
    pay_month = js_or(month, js_get(payroll, "month"))
    pay_year = js_or(year, js_get(payroll, "year"))
    calendar_days = get_calendar_days_in_month(pay_month, pay_year)

    def n0(v):
        n = to_number(v)
        return 0.0 if (math.isnan(n) or n == 0) else n

    working_days = js_max(0, n0(js_get(payroll, "workingDays")))
    lop_days = js_max(0, n0(js_get(payroll, "lopDays")))
    stored_present = to_number(js_get(payroll, "presentDays"))

    if math.isfinite(stored_present):
        return js_out({
            "workingDays": js_or(working_days, calendar_days),
            "paidDays": js_max(0, stored_present),
            "presentDays": js_max(0, stored_present),
            "lopDays": lop_days,
            "calendarDays": calendar_days,
            "source": "payroll",
        })
    if calendar_days > 0:
        paid_days = js_max(0, calendar_days - lop_days)
        return js_out({
            "workingDays": js_or(working_days, calendar_days),
            "paidDays": paid_days,
            "presentDays": paid_days,
            "lopDays": lop_days,
            "calendarDays": calendar_days,
            "source": "calendar-lop",
        })
    paid_days = js_max(0, working_days - lop_days)
    return js_out({
        "workingDays": working_days,
        "paidDays": paid_days,
        "presentDays": paid_days,
        "lopDays": lop_days,
        "calendarDays": calendar_days,
        "source": "working-lop",
    })


def get_payslip_attendance_days(org_uuid=UNDEFINED, employee_id=UNDEFINED, month=UNDEFINED,
                                year=UNDEFINED, fallback_payroll=UNDEFINED):
    """Payslip Working/Paid days — always aligned with payroll-run values."""
    if fallback_payroll is UNDEFINED:
        fallback_payroll = {}
    return resolve_payslip_paid_days(fallback_payroll, month, year)
