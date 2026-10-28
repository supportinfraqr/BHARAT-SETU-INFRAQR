"""Pay schedule — port of ``controller/payroll/payrollSchedule.js``.

Handlers: createOrUpdateSchedule, getPayrollSchedule, getUpcomingPayrollDates,
calculatePayPeriod. Exported helper: ``generate_upcoming_payrolls`` (legacy
``generateUpcomingPayrolls``, used by the auto-payroll runner).

JS ``Date`` arithmetic (``setMonth`` / ``setDate`` overflow, local time-of-day kept) is
reproduced on aware datetimes in the server zone (Asia/Kolkata).
"""

import logging
import math
from datetime import date, datetime, timedelta, timezone

from django.db import transaction

from ..context import payroll_view, send_response
from ..models import PayrollSchedule
from ..services.financial_year import LOCAL_TZ, _to_instant
from ..services.jsmath import js_or, js_str, js_trim, js_truthy, parse_int

logger = logging.getLogger("payroll_engine")

FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]


# --------------------------------------------------------------------------- JS Date helpers

def js_date(value):
    """``new Date(value)`` -> aware LOCAL_TZ datetime (None = Invalid Date)."""
    instant = _to_instant(value)
    return instant.astimezone(LOCAL_TZ) if instant is not None else None


def iso_ms(dt):
    """``Date.prototype.toJSON``."""
    if dt is None:
        return None
    utc = dt.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def _rebuild(dt, y, m0, day):
    """Local date (y, m0 + overflow, day + overflow) keeping ``dt``'s wall-clock time."""
    y += m0 // 12
    m0 %= 12
    d = date(y, m0 + 1, 1) + timedelta(days=day - 1)
    return datetime(d.year, d.month, d.day, dt.hour, dt.minute, dt.second, dt.microsecond,
                    tzinfo=LOCAL_TZ)


def js_set_month(dt, month_index):
    return _rebuild(dt, dt.year, month_index, dt.day)


def js_set_date(dt, day):
    return _rebuild(dt, dt.year, dt.month - 1, day)


def _last_day(year, month_index):
    return _rebuild(datetime(2000, 1, 1, tzinfo=LOCAL_TZ), year, month_index + 1, 0).day


def _js_weekday(dt):
    return (dt.weekday() + 1) % 7


# --------------------------------------------------------------------------- helpers

def generate_upcoming_payrolls(frequency, pay_day, first_pay_period):
    """Next 12 pay cycles: ``[{period, payDate}]`` (``payDate`` as a JSON date string)."""
    payrolls = []
    start = js_date(first_pay_period)
    if start is None:
        raise ValueError(f'Cast to date failed for value "{first_pay_period}" at path '
                         f'"firstPayPeriod"')
    pd = parse_int(pay_day)
    pay_day_num = pd if isinstance(pd, int) and pd else 7
    for i in range(12):
        if frequency == "monthly":
            pay_date = js_set_date(js_set_month(start, start.month - 1 + i), pay_day_num)
            payrolls.append({"period": f"{FULL_MONTHS[pay_date.month - 1]} {pay_date.year}",
                             "payDate": iso_ms(pay_date)})
        elif frequency == "semi-monthly":
            d1 = js_set_month(start, start.month - 1 + i // 2)
            d1 = js_set_date(d1, 15 if i % 2 == 0 else _last_day(d1.year, d1.month - 1))
            half = "1st Half" if i % 2 == 0 else "2nd Half"
            payrolls.append({"period": f"{FULL_MONTHS[d1.month - 1]} {d1.year} - {half}",
                             "payDate": iso_ms(d1)})
        elif frequency == "bi-weekly":
            pay_date = js_set_date(start, start.day + i * 14)
            payrolls.append({"period": f"Week {i * 2 + 1} - {pay_date.year}",
                             "payDate": iso_ms(pay_date)})
        elif frequency == "weekly":
            pay_date = js_set_date(start, start.day + i * 7)
            payrolls.append({"period": f"Week {i + 1} - {pay_date.year}",
                             "payDate": iso_ms(pay_date)})
        if len(payrolls) >= 12:
            break
    return payrolls


def calculate_working_days(start, end):
    """Mon–Fri days between two local datetimes (inclusive)."""
    if start is None or end is None:
        return 0
    count = 0
    current = start
    while current <= end:
        if _js_weekday(current) not in (0, 6):
            count += 1
        current = js_set_date(current, current.day + 1)
    return count


def calculate_pay_period_for_date(input_date, frequency, first_pay_period):
    start = js_date(first_pay_period)
    d = input_date
    period_start = period_end = None
    if d is not None:
        midnight = datetime(d.year, d.month, d.day, tzinfo=LOCAL_TZ)
        if frequency == "semi-monthly":
            if d.day <= 15:
                period_start = _rebuild(midnight, d.year, d.month - 1, 1)
                period_end = _rebuild(midnight, d.year, d.month - 1, 15)
            else:
                period_start = _rebuild(midnight, d.year, d.month - 1, 16)
                period_end = _rebuild(midnight, d.year, d.month, 0)
        elif frequency in ("bi-weekly", "weekly"):
            if start is not None:
                span = 14 if frequency == "bi-weekly" else 7
                days_diff = math.floor((d - start).total_seconds() * 1000 / 86400000)
                n = math.floor(days_diff / span)
                period_start = js_set_date(start, start.day + n * span)
                period_end = js_set_date(period_start, period_start.day + span - 1)
        else:  # monthly + default
            period_start = _rebuild(midnight, d.year, d.month - 1, 1)
            period_end = _rebuild(midnight, d.year, d.month, 0)
    return {
        "periodStart": iso_ms(period_start),
        "periodEnd": iso_ms(period_end),
        "frequency": frequency,
        "workingDays": calculate_working_days(period_start, period_end),
    }


def _normalize_auto_process_time(value):
    from ..services.auto_payroll_runner import normalize_auto_process_time

    return normalize_auto_process_time(value)


# --------------------------------------------------------------------------- views

@payroll_view(["POST"])
def create_or_update_schedule(ctx):
    from ..services.audit_log import log_payroll_action
    from ..services.auto_payroll_runner import sync_auto_payroll_registry

    org = ctx.org
    if org is None:
        return send_response(400, False, "org uuid not found")
    body = ctx.body
    pay_frequency = body.get("payFrequency")
    working_days = body.get("workingDays")
    pay_day = body.get("payDay")
    first_pay_period = body.get("firstPayPeriod")
    status = body.get("status")
    auto_enabled = body.get("autoProcessEnabled")
    auto_time = body.get("autoProcessTime")

    if not js_truthy(pay_frequency) or not js_truthy(pay_day) or not js_truthy(first_pay_period):
        return send_response(400, False,
                             "Pay frequency, pay day, and first pay period are required")

    upcoming = generate_upcoming_payrolls(pay_frequency, pay_day, first_pay_period)
    first_instant = _to_instant(first_pay_period)
    if first_instant is None:
        raise ValueError(f'Cast to date failed for value "{first_pay_period}" at path '
                         f'"firstPayPeriod"')

    with transaction.atomic():
        schedule = PayrollSchedule.objects.select_for_update().filter(org=org) \
            .order_by("created_at").first() or PayrollSchedule(org=org)
        schedule.pay_frequency = js_str(pay_frequency)
        schedule.working_days = js_or(working_days, [])
        schedule.pay_day = js_str(pay_day)
        schedule.first_pay_period = first_instant
        schedule.upcoming_payrolls = upcoming
        schedule.status = "inactive" if status == "inactive" else "active"
        if isinstance(auto_enabled, bool):
            schedule.auto_process_enabled = auto_enabled
        if auto_time is not None and js_trim(js_str(auto_time)) != "":
            schedule.auto_process_time = _normalize_auto_process_time(auto_time)
        schedule.save()

    try:
        sync_auto_payroll_registry(str(org.pk), schedule.to_dict())
    except Exception as err:  # noqa: BLE001
        logger.error("[AutoPayroll] Registry sync failed: %s", err)

    log_payroll_action(ctx, action="payroll_processed", entity_type="payroll",
                       entity_id=schedule.pk, after_data={"payFrequency": schedule.pay_frequency,
                                                          "payDay": schedule.pay_day},
                       remarks="Payroll schedule saved")
    return send_response(200, True, "Payroll schedule saved successfully", schedule.to_dict())


@payroll_view(["GET"])
def get_payroll_schedule(ctx):
    org = ctx.require_org()
    schedule = PayrollSchedule.objects.filter(org=org).order_by("created_at").first()
    return send_response(200, True, "Schedule fetched successfully",
                         schedule.to_dict() if schedule else {})


@payroll_view(["GET"])
def get_upcoming_payroll_dates(ctx):
    org = ctx.require_org()
    schedule = PayrollSchedule.objects.filter(org=org).order_by("created_at").first()
    if schedule is None:
        return send_response(404, False, "Payroll schedule not found")
    return send_response(200, True, "Upcoming payroll dates fetched successfully",
                         schedule.upcoming_payrolls or [])


@payroll_view(["GET"])
def calculate_pay_period(ctx):
    org = ctx.require_org()
    date_q = ctx.query("date")
    if not date_q:
        return send_response(400, False, "Date is required")
    schedule = PayrollSchedule.objects.filter(org=org).order_by("created_at").first()
    if schedule is None:
        return send_response(404, False, "Payroll schedule not found")
    period = calculate_pay_period_for_date(js_date(date_q), schedule.pay_frequency,
                                           schedule.first_pay_period)
    return send_response(200, True, "Pay period calculated successfully", period)


ROUTES = [
    ("createOrUpdateSchedule", create_or_update_schedule, "create_or_update_schedule"),
    ("getPayrollSchedule", get_payroll_schedule, "get_payroll_schedule"),
    ("getUpcomingPayrollDates", get_upcoming_payroll_dates, "get_upcoming_payroll_dates"),
    ("calculatePayPeriod", calculate_pay_period, "calculate_pay_period"),
]
