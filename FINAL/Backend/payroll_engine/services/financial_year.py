"""Indian financial-year / TDS-period helpers.

Port of ``FINAL/legacy_payroll/utils/financialYear.js`` (1:1, same semantics).

Exported (legacy name -> port):
    PAYROLL_MONTHS
    getMonthIndex                        -> get_month_index
    getFinancialYearStartFromPayroll     -> get_financial_year_start_from_payroll
    parseFinancialYearInput              -> parse_financial_year_input
    normalizeFinancialYearStorage        -> normalize_financial_year_storage
    getFinancialYearAliasesFromStartYear -> get_financial_year_aliases_from_start_year
    getFinancialYearAliasesFromPayroll   -> get_financial_year_aliases_from_payroll
    getFinancialYearAliasesFromInput     -> get_financial_year_aliases_from_input
    resolveFinancialYearInput            -> resolve_financial_year_input
    buildFinancialYearPayrollQuery       -> build_financial_year_payroll_query
                                            (+ ``build_financial_year_payroll_q``: the same
                                            filter as a Django ``Q`` for ``PayrollRun``)
    getPayrollPeriodSortKey              -> get_payroll_period_sort_key
    getAccountingYearPeriodsUpTo         -> get_accounting_year_periods_up_to
    toCalendarDate                       -> to_calendar_date
    getFinancialYearBounds               -> get_financial_year_bounds
    getTdsCalculationPeriod              -> get_tds_calculation_period
    getRemainingPayrollMonthsInTdsPeriod -> get_remaining_payroll_months_in_tds_period
    isPayrollMonthBeforeImplementation   -> is_payroll_month_before_implementation
    getMonthDayFactor                    -> get_month_day_factor
    sumMonthDayFactors                   -> sum_month_day_factors
    getPayrollMonthTdsFactor             -> get_payroll_month_tds_factor
    getTdsOpeningMonth                   -> get_tds_opening_month
    buildTdsIncomeMonths                 -> build_tds_income_months

Dates: the legacy returned JS ``Date`` objects at *local* midnight (server TZ
Asia/Kolkata). The port returns ``datetime.date`` calendar dates (the same day);
``JSON.stringify`` of the legacy value equals ``iso_local_midnight(d)``. An
"Invalid Date" (only reachable from absurd numeric years) is represented by ``None``.
Inputs accept ``date``/``datetime`` objects, ``YYYY-MM-DD...`` strings, epoch-ms numbers
and the common ``Date.parse`` string forms.
"""

import math
import re
from datetime import date, datetime, timedelta, timezone

from .jsmath import (
    UNDEFINED,
    clean,
    is_nullish,
    js_add,
    js_get,
    js_opt,
    js_round,
    js_str,
    js_strict_eq,
    js_trim,
    js_truthy,
    to_number,
)

try:  # Asia/Kolkata with historical offsets (same tzdata V8/ICU uses)
    from zoneinfo import ZoneInfo

    LOCAL_TZ = ZoneInfo("Asia/Kolkata")
except Exception:  # pragma: no cover - zoneinfo always present on py>=3.9
    LOCAL_TZ = timezone(timedelta(hours=5, minutes=30))

PAYROLL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

FULL_MONTH_NAMES = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec",
}

_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
_MAX_MS = 8.64e15


# ------------------------------------------------------------------ JS Date emulation


def js_local_date(year, month_index, day=1):
    """``new Date(year, monthIndex, day)`` as a calendar ``date`` (``None`` = Invalid Date).

    Handles month/day overflow (``new Date(y, m + 1, 0)`` = last day of month ``m``) and
    the two-digit-year rule (0..99 -> 1900..1999)."""
    y, m, d = to_number(year), to_number(month_index), to_number(day)
    if not (math.isfinite(y) and math.isfinite(m) and math.isfinite(d)):
        return None
    y, m, d = int(y), int(m), int(d)
    if 0 <= y <= 99:
        y += 1900
    y += m // 12
    m = m % 12
    try:
        return date(y, m + 1, 1) + timedelta(days=d - 1)
    except (ValueError, OverflowError):
        return None


def iso_local_midnight(d):
    """``JSON.stringify`` of the legacy local-midnight ``Date`` for calendar date ``d``."""
    if d is None:
        return None
    local = datetime(d.year, d.month, d.day, tzinfo=LOCAL_TZ)
    utc = local.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def _instant_from_ms(ms):
    ms = to_number(ms)
    if not math.isfinite(ms) or abs(ms) > _MAX_MS:
        return None
    try:
        return _EPOCH + timedelta(milliseconds=math.trunc(ms))
    except OverflowError:
        return None


_ISO_FULL = re.compile(
    r"([+-][0-9]{6}|[0-9]{4})(?:-([0-9]{2})(?:-([0-9]{2}))?)?"
    r"(?:T([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]{1,9}))?)?(Z|[+-][0-9]{2}:[0-9]{2})?)?"
)
_LEGACY_FORMATS = (
    "%Y/%m/%d", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M", "%m/%d/%Y", "%m/%d/%Y %H:%M:%S",
    "%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y", "%d %B %Y", "%d %b %Y",
    "%a %b %d %Y", "%a %b %d %Y %H:%M:%S",
)


def _parse_date_string(text):
    """``Date.parse`` subset -> aware UTC ``datetime`` instant or ``None``."""
    text = js_trim(text)
    m = _ISO_FULL.fullmatch(text)
    if m:
        y = int(m.group(1))
        mo = int(m.group(2) or 1)
        d = int(m.group(3) or 1)
        hh, mi, ss = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
        frac = (m.group(7) or "0")[:3].ljust(3, "0")
        tz = m.group(8)
        try:
            naive = datetime(y, mo, d, hh, mi, ss, int(frac) * 1000)
        except ValueError:
            return None
        if tz is None:
            # Date-only ISO forms are UTC; date-time forms without offset are local.
            if m.group(4) is None:
                return naive.replace(tzinfo=timezone.utc)
            return naive.replace(tzinfo=LOCAL_TZ).astimezone(timezone.utc)
        if tz == "Z":
            return naive.replace(tzinfo=timezone.utc)
        sign = 1 if tz[0] == "+" else -1
        off = timedelta(hours=int(tz[1:3]), minutes=int(tz[4:6])) * sign
        return (naive - off).replace(tzinfo=timezone.utc)
    for fmt in _LEGACY_FORMATS:
        try:
            naive = datetime.strptime(text, fmt)
        except ValueError:
            continue
        return naive.replace(tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    return None


def _to_instant(value):
    """``new Date(value)`` -> aware UTC datetime (``None`` = Invalid Date)."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=LOCAL_TZ)
        return value.astimezone(timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    if isinstance(value, (int, float, bool)):
        return _instant_from_ms(value)
    if isinstance(value, str):
        return _parse_date_string(value)
    if isinstance(value, (list, tuple)):
        return _parse_date_string(js_str(value))
    return None


def _is_valid(d):
    return d is not None


def _dlt(a, b):
    return a is not None and b is not None and a < b


def _dgt(a, b):
    return a is not None and b is not None and a > b


# ------------------------------------------------------------------ ported functions


def get_month_index(month_name=UNDEFINED):
    for i, m in enumerate(PAYROLL_MONTHS):
        if js_strict_eq(m, month_name):
            return i
    return -1


def get_financial_year_start_from_payroll(month_name=UNDEFINED, year=UNDEFINED):
    month_index = get_month_index(month_name)
    normalized_year = to_number(year)
    if month_index == -1 or math.isnan(normalized_year):
        return None
    return clean(normalized_year if month_index >= 3 else normalized_year - 1)


_FY_RE = re.compile(r"([0-9]{4})-([0-9]{2}|[0-9]{4})")
_FY_PREFIX = re.compile(r"^FY", re.IGNORECASE)


def parse_financial_year_input(input=UNDEFINED):  # noqa: A002 - legacy parameter name
    """Accepts 2025-26, FY2025-26, 2025-2026, FY2025-2026."""
    if is_nullish(input) or js_strict_eq(input, ""):
        return None
    raw = _FY_PREFIX.sub("", js_trim(js_str(input)), count=1)
    match = _FY_RE.fullmatch(raw)
    if not match:
        return None
    start_year = int(match.group(1))
    end_token = match.group(2)
    if len(end_token) == 2:
        end_year = int(f"{js_str(start_year)[:2]}{end_token}")
    else:
        end_year = int(end_token)
    if end_year != start_year + 1:
        return None
    end_short = str(end_year)[-2:]
    return {
        "startYear": start_year,
        "endYear": end_year,
        "keyShort": f"{start_year}-{end_short}",
        "keyLong": f"{start_year}-{end_year}",
        "label": f"FY {start_year}-{end_year}",
    }


def normalize_financial_year_storage(input=UNDEFINED):  # noqa: A002
    """Canonical storage key: 2026-2027."""
    parsed = parse_financial_year_input(input)
    return parsed["keyLong"] if parsed else None


def get_financial_year_aliases_from_start_year(fy_start=UNDEFINED):
    fy_end = js_add(fy_start, 1)
    end_short = js_str(fy_end)[-2:]
    s, e = js_str(fy_start), js_str(fy_end)
    out = []
    for alias in (f"{s}-{e}", f"FY{s}-{e}", f"{s}-{end_short}", f"FY{s}-{end_short}"):
        if alias not in out:
            out.append(alias)
    return out


def get_financial_year_aliases_from_payroll(month_name=UNDEFINED, year=UNDEFINED):
    fy_start = get_financial_year_start_from_payroll(month_name, year)
    if fy_start is None:
        return []
    return get_financial_year_aliases_from_start_year(fy_start)


def get_financial_year_aliases_from_input(input=UNDEFINED):  # noqa: A002
    parsed = parse_financial_year_input(input)
    if not parsed:
        trimmed = js_trim(js_str(input if js_truthy(input) else ""))
        return [trimmed] if trimmed else []
    return get_financial_year_aliases_from_start_year(parsed["startYear"])


def resolve_financial_year_input(input=UNDEFINED):  # noqa: A002
    canonical = normalize_financial_year_storage(input)
    if not canonical:
        return {
            "ok": False,
            "error": "Invalid financial year. Use formats like 2025-26 or 2025-2026",
        }
    parsed = parse_financial_year_input(input)
    return {
        "ok": True,
        "canonical": canonical,
        "aliases": get_financial_year_aliases_from_start_year(parsed["startYear"]),
        "keyShort": parsed["keyShort"],
        "label": parsed["label"],
        "startYear": parsed["startYear"],
        "endYear": parsed["endYear"],
    }


def build_financial_year_payroll_query(fy=UNDEFINED):
    """Apr–Mar payroll periods for Indian financial year (legacy Mongo filter shape)."""
    first_half = PAYROLL_MONTHS[3:]
    second_half = PAYROLL_MONTHS[:3]
    out = {
        "$or": [
            {"year": js_get(fy, "startYear"), "month": {"$in": first_half}},
            {"year": js_get(fy, "endYear"), "month": {"$in": second_half}},
        ],
    }
    return _out(out)


def build_financial_year_payroll_q(fy):
    """Django ``Q`` equivalent of :func:`build_financial_year_payroll_query` (PayrollRun)."""
    from django.db.models import Q

    return (Q(year=js_get(fy, "startYear"), month__in=PAYROLL_MONTHS[3:])
            | Q(year=js_get(fy, "endYear"), month__in=PAYROLL_MONTHS[:3]))


def get_payroll_period_sort_key(month_name=UNDEFINED, year=UNDEFINED, fy_start=UNDEFINED,
                                fy_end=UNDEFINED):
    month_index = get_month_index(month_name)
    normalized_year = to_number(year)
    if month_index == -1 or math.isnan(normalized_year):
        return 999
    if js_strict_eq(normalized_year, fy_start) and month_index >= 3:
        return month_index - 3
    if js_strict_eq(normalized_year, fy_end) and month_index < 3:
        return month_index + 9
    return 999


def normalize_payroll_month_name(month_name=UNDEFINED):
    raw = js_trim(js_str(month_name if js_truthy(month_name) else ""))
    if not raw:
        return None
    for m in PAYROLL_MONTHS:
        if m.lower() == raw.lower():
            return m
    mapped = FULL_MONTH_NAMES.get(raw.lower())
    if mapped:
        return mapped
    numeric = to_number(raw)
    if math.isfinite(numeric) and numeric.is_integer() and 1 <= numeric <= 12:
        return PAYROLL_MONTHS[int(numeric) - 1]
    return None


_YMD_PREFIX = re.compile(r"^([0-9]{4})-([0-9]{2})-([0-9]{2})")


def to_calendar_date(value=UNDEFINED):
    """Calendar date for a stored date or YYYY-MM-DD value, without UTC day-shift.

    Returns ``datetime.date`` (legacy: local-midnight ``Date``) or ``None``."""
    if is_nullish(value) or js_strict_eq(value, ""):
        return None
    if isinstance(value, str):
        match = _YMD_PREFIX.match(js_trim(value))
        if match:
            return js_local_date(int(match.group(1)), int(match.group(2)) - 1, int(match.group(3)))
    if isinstance(value, date) and not isinstance(value, datetime):
        return value  # already a calendar date (legacy local-midnight Date)
    instant = _to_instant(value)
    if instant is None:
        return None
    is_utc_midnight = (instant.hour == 0 and instant.minute == 0 and instant.second == 0
                       and instant.microsecond // 1000 == 0)
    if is_utc_midnight:
        return js_local_date(instant.year, instant.month - 1, instant.day)
    local = instant.astimezone(LOCAL_TZ)
    return js_local_date(local.year, local.month - 1, local.day)


def get_financial_year_bounds(start_year=UNDEFINED):
    year = to_number(start_year)
    if not math.isfinite(year):
        return None
    return {
        "start": js_local_date(year, 3, 1),
        "end": js_local_date(year + 1, 2, 31),
    }


def _fy_month_index_from_date(d):
    """April = 0 … March = 11."""
    if d is None:
        return float("nan")
    month = d.month - 1
    return month - 3 if month >= 3 else month + 9


def _inclusive_calendar_days(start, end):
    return (end - start).days + 1


def _days_in_month(year, month_index):
    last = js_local_date(year, month_index + 1, 0)
    return last.day if last is not None else float("nan")


def get_month_day_factor(year=UNDEFINED, month_index=UNDEFINED, range_start=UNDEFINED,
                         range_end=UNDEFINED):
    """Share of a calendar month that falls inside [rangeStart, rangeEnd], both inclusive."""
    start = to_calendar_date(range_start)
    end = to_calendar_date(range_end)
    if not start or not end or start > end:
        return 0
    month_start = js_local_date(year, month_index, 1)
    month_end = js_local_date(year, js_add(month_index, 1), 0)
    if month_start is None or month_end is None:
        return float("nan")
    overlap_start = start if start > month_start else month_start
    overlap_end = end if end < month_end else month_end
    if overlap_start > overlap_end:
        return 0
    return clean(_inclusive_calendar_days(overlap_start, overlap_end) / month_end.day)


def sum_month_day_factors(range_start=UNDEFINED, range_end=UNDEFINED):
    """Sum of month-day factors from rangeStart through rangeEnd, both inclusive."""
    start = to_calendar_date(range_start)
    end = to_calendar_date(range_end)
    if not start or not end or start > end:
        return 0
    factor = 0
    year = start.year
    month = start.month - 1
    while year < end.year or (year == end.year and month <= end.month - 1):
        factor += get_month_day_factor(year, month, start, end)
        month += 1
        if month > 11:
            month = 0
            year += 1
    return clean(factor)


def get_tds_calculation_period(fy=UNDEFINED, implementation_date=None):
    """TDS window inside one financial year (see legacy doc comment)."""
    if not js_truthy(js_opt(fy, "startYear")):
        return {
            "periodStart": None,
            "periodEnd": None,
            "applicableMonths": 12,
            "equivalentMonths": 12,
            "startMonthIndex": 0,
        }
    bounds = get_financial_year_bounds(js_get(fy, "startYear"))
    implementation = to_calendar_date(implementation_date)
    if implementation and _dgt(implementation, js_get(bounds, "end")):
        return {
            "periodStart": None,
            "periodEnd": bounds["end"],
            "applicableMonths": 0,
            "equivalentMonths": 0,
            "startMonthIndex": 12,
        }
    if implementation and _dgt(implementation, js_get(bounds, "start")):
        period_start = implementation
    else:
        period_start = js_get(bounds, "start")
    start_month_index = _fy_month_index_from_date(period_start)
    equivalent_months = sum_month_day_factors(period_start, bounds["end"])
    return _out({
        "periodStart": period_start,
        "periodEnd": bounds["end"],
        "applicableMonths": equivalent_months,
        "equivalentMonths": equivalent_months,
        "startMonthIndex": start_month_index,
    })


def _today():
    return datetime.now(LOCAL_TZ).date()


def get_remaining_payroll_months_in_tds_period(fy=UNDEFINED, implementation_date=None,
                                               as_of_date=UNDEFINED):
    """Remaining salary-month factor used to spread TDS, including the current month.

    ``as_of_date`` defaults to today (Asia/Kolkata), like the legacy ``new Date()``."""
    if as_of_date is UNDEFINED:
        as_of_date = _today()
    period = get_tds_calculation_period(fy, implementation_date)
    if not js_truthy(js_opt(fy, "startYear")):
        return 12
    if not period["periodStart"] or period["equivalentMonths"] <= 0:
        return 0
    as_of = to_calendar_date(as_of_date) or _today()
    if _dlt(as_of, period["periodStart"]):
        return period["equivalentMonths"]
    if _dgt(as_of, period["periodEnd"]):
        return 1
    month_start = js_local_date(as_of.year, as_of.month - 1, 1)
    remaining_start = month_start if month_start > period["periodStart"] else period["periodStart"]
    return sum_month_day_factors(remaining_start, period["periodEnd"])


def get_payroll_month_tds_factor(month_name=UNDEFINED, year=UNDEFINED, implementation_date=None):
    """Fraction of this payroll month's TDS that falls on or after the implementation date."""
    implementation = to_calendar_date(implementation_date)
    if not implementation:
        return 1
    normalized_month = normalize_payroll_month_name(month_name)
    month_index = get_month_index(normalized_month)
    normalized_year = to_number(year)
    if month_index == -1 or math.isnan(normalized_year):
        return 1
    fy_start = get_financial_year_start_from_payroll(normalized_month, normalized_year)
    if fy_start is None:
        return 1
    period = get_tds_calculation_period({"startYear": fy_start, "endYear": fy_start + 1},
                                        implementation)
    if not period["periodStart"]:
        return 0
    return get_month_day_factor(normalized_year, month_index, period["periodStart"],
                                period["periodEnd"])


def build_tds_income_months(period_start=UNDEFINED, period_end=UNDEFINED, monthly_gross=UNDEFINED,
                            salary_income_target=None):
    """Month rows for salary counted from the implementation date through 31 March."""
    start = to_calendar_date(period_start)
    end = to_calendar_date(period_end)
    gross = to_number(monthly_gross)
    if math.isnan(gross) or gross == 0:
        gross = 0
    if not start or not end or start > end:
        return []
    months = []
    year = start.year
    month = start.month - 1
    while year < end.year or (year == end.year and month <= end.month - 1):
        factor = get_month_day_factor(year, month, start, end)
        if factor > 0:
            days_in_month = _days_in_month(year, month)
            applicable_days = js_round(factor * days_in_month)
            is_opening = year == start.year and month == start.month - 1
            months.append({
                "label": f"{PAYROLL_MONTHS[month]} {year}",
                "daysInMonth": days_in_month,
                "applicableDays": applicable_days,
                "excludedBefore": start.day - 1 if is_opening else 0,
                "partial": factor < 0.999999,
                "amount": js_round(gross * factor),
            })
        month += 1
        if month > 11:
            month = 0
            year += 1
    target_num = to_number(salary_income_target)
    if math.isfinite(target_num):
        target = js_round(target_num)
    else:
        target = js_round(gross * sum_month_day_factors(start, end))
    rounded_sum = 0
    for row in months:
        rounded_sum += row["amount"]
    if months and rounded_sum != target:
        months[-1]["amount"] += target - rounded_sum
    return _out(months)


def get_tds_opening_month(period=UNDEFINED):
    """First month of the TDS window, including how many days are excluded before the start."""
    if not js_truthy(js_opt(period, "periodStart")) or not js_truthy(js_opt(period, "periodEnd")):
        return None
    start = to_calendar_date(js_get(period, "periodStart"))
    period_end = to_calendar_date(js_get(period, "periodEnd"))
    if not start or not period_end or start > period_end:
        return None
    month_end = js_local_date(start.year, start.month, 0)
    counted_to_date = period_end if period_end < month_end else month_end
    counted_from = start.day
    counted_to = counted_to_date.day
    days_in_month = month_end.day
    return {
        "label": f"{PAYROLL_MONTHS[start.month - 1]} {start.year}",
        "daysInMonth": days_in_month,
        "applicableDays": counted_to - counted_from + 1,
        "excludedBefore": counted_from - 1,
        "countedFrom": counted_from,
        "countedTo": counted_to,
    }


def is_payroll_month_before_implementation(month_name=UNDEFINED, year=UNDEFINED,
                                           implementation_date=None):
    """True when the payroll month finishes before payroll was implemented."""
    implementation = to_calendar_date(implementation_date)
    if not implementation:
        return False
    normalized_month = normalize_payroll_month_name(month_name)
    month_index = get_month_index(normalized_month)
    normalized_year = to_number(year)
    if month_index == -1 or math.isnan(normalized_year):
        return False
    payroll_month_end = js_local_date(normalized_year, month_index + 1, 0)
    return _dlt(payroll_month_end, implementation)


def get_accounting_year_periods_up_to(month_name=UNDEFINED, year=UNDEFINED):
    """Apr–Mar accounting-year periods from FY start through the given payroll month."""
    fy_start = get_financial_year_start_from_payroll(month_name, year)
    if fy_start is None:
        return []
    fy_end = fy_start + 1
    all_periods = ([{"month": m, "year": fy_start} for m in PAYROLL_MONTHS[3:]]
                   + [{"month": m, "year": fy_end} for m in PAYROLL_MONTHS[:3]])
    current = get_payroll_period_sort_key(month_name, year, fy_start, fy_end)
    if current == 999:
        return []
    return _out([p for p in all_periods
                 if get_payroll_period_sort_key(p["month"], p["year"], fy_start, fy_end) <= current])


def _out(value):
    from .jsmath import js_out

    return js_out(value)
