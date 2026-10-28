"""Industry-standard caps and declaration helpers for Indian payroll TDS (FY Apr–Mar).

Port of ``FINAL/legacy_payroll/utils/payroll/tdsDeclarationHelper.js`` (1:1 semantics,
differentially tested against the JS in ``tests/test_tds.py``).

Exported (legacy name -> port):
    SECTION_80C_LIMIT / SECTION_80D_COMBINED_LIMIT / SECTION_24_SELF_OCCUPIED_LIMIT
    computeAnnualRentFromEntries          -> compute_annual_rent_from_entries
    buildDeclaredDeductionsFromDeclaration -> build_declared_deductions_from_declaration
    applyCappedDeductionsForTax           -> apply_capped_deductions_for_tax
    aggregate80DFromLines                 -> aggregate80_d_from_lines
    completedServiceYears                 -> completed_service_years
    gratuityExempt / leaveEncashmentExempt / retrenchmentExempt / vrsExempt
    getDefaultExemptionLimits / getExemptionLimits / capToLimit
    capSection80C / capSection80D / capSection24SelfOccupied
    isSectionEnabled / sumLineAmounts

Inputs are JSON-shaped dicts; a missing key is JS ``undefined``. Dates are handled as JS
instants (aware UTC datetimes) with the legacy server's local zone (Asia/Kolkata).
"""

import math
import re
from datetime import date, datetime, timezone

from .financial_year import (
    LOCAL_TZ,
    _to_instant,
    js_local_date,
    sum_month_day_factors,
    to_calendar_date,
)
from .jsmath import (
    UNDEFINED,
    is_nullish,
    js_nc,
    js_or,
    js_out,
    js_round,
    js_str,
    js_trim,
    js_truthy,
    num0,
    to_number,
)

SECTION_80C_LIMIT = 150000
SECTION_80D_COMBINED_LIMIT = 100000
SECTION_24_SELF_OCCUPIED_LIMIT = 200000

DEFAULT_EXEMPTION_LIMITS = {
    "section80D": SECTION_80D_COMBINED_LIMIT,
    "section80DSelf": 25000,
    "section80DSenior": 50000,
    "section80DPreventive": 5000,
    "section80E": None,
    "section80G": None,
    "section80CCD1Percent": 10,
    "section80CCD1B": 50000,
    "section80CCD2Percent": 14,
    "section80CCD2PercentOld": 10,
    "section80DD": 75000,
    "section80DDSevere": 125000,
    "section80DDB": 40000,
    "section80DDBSenior": 100000,
    "section80U": 75000,
    "section80USevere": 125000,
    "section80EE": 50000,
    "section80EEA": 150000,
    "section80GGMonthly": 5000,
    "section80GGA": None,
    "section80GGC": None,
    "section80TTA": 10000,
    "section80TTB": 50000,
    "section24": SECTION_24_SELF_OCCUPIED_LIMIT,
    "otherDeductions": None,
    "childrenEducationPerMonth": 100,
    "childrenEducationMaxChildren": 2,
    "childrenEducationAnnualCap": 2400,
    "hostelPerMonth": 300,
    "hostelMaxChildren": 2,
    "hostelAnnualCap": 7200,
    "lta": None,
    "disabledTransportPerMonth": 3200,
    "gratuity": 2000000,
    "leaveEncashment": 2500000,
    "retrenchment": 500000,
    "vrs": 500000,
    "officialDuty": None,
    "lifeInsurance": None,
}

INF = float("inf")


# ------------------------------------------------------------------ small JS helpers


def g(obj, key):
    """``obj?.[key]`` for JSON values (missing -> ``UNDEFINED``)."""
    if isinstance(obj, dict):
        return obj.get(key, UNDEFINED)
    if isinstance(obj, (list, tuple)) and isinstance(key, int):
        return obj[key] if 0 <= key < len(obj) else UNDEFINED
    return UNDEFINED


def money(value):
    """``Math.max(0, Number(value) || 0)``."""
    return max(0.0, num0(value))


def is_finite_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def locale_en_in(n):
    """``Number(n).toLocaleString('en-IN')``."""
    from .statutory_calculator import _to_locale_en_in

    return _to_locale_en_in(n)


def _local_parts(instant):
    local = instant.astimezone(LOCAL_TZ)
    return local.year, local.month - 1, local.day


def _local_midnight(d):
    return datetime(d.year, d.month, d.day, tzinfo=LOCAL_TZ).astimezone(timezone.utc)


def js_date(value):
    """``new Date(value)`` -> aware UTC instant or ``None`` (Invalid Date)."""
    if value is UNDEFINED:
        return None
    if value is None:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)  # new Date(null) -> epoch
    return _to_instant(value)


# ------------------------------------------------------------------ limits


def read_money_limit(value, fallback):
    if value is None or value is UNDEFINED or value == "":
        return fallback
    amount = to_number(value)
    return amount if (math.isfinite(amount) and amount >= 0) else fallback


def get_default_exemption_limits():
    return dict(DEFAULT_EXEMPTION_LIMITS)


def get_exemption_limits(tds_config=UNDEFINED):
    if tds_config is UNDEFINED:
        tds_config = {}
    saved = js_or(g(tds_config, "exemptionLimits"), {})
    defaults = get_default_exemption_limits()
    return {key: read_money_limit(g(saved, key), defaults[key]) for key in defaults}


def cap_to_limit(amount=UNDEFINED, limit=UNDEFINED):
    """limit null or undefined = no cap."""
    value = money(amount)
    if limit is None or limit is UNDEFINED or limit == "":
        return value
    cap = to_number(limit)
    if not math.isfinite(cap):
        return value
    return min(value, max(0.0, cap))


# ------------------------------------------------------------------ rent

_DDMMYYYY = re.compile(r"^([0-9]{1,2})[-/]([0-9]{1,2})[-/]([0-9]{4})$")


def parse_rent_date(value):
    if not js_truthy(value):
        return None
    raw = js_trim(js_str(value))
    m = _DDMMYYYY.match(raw)
    if m:
        d = js_local_date(int(m.group(3)), int(m.group(2)) - 1, int(m.group(1)))
        return _local_midnight(d) if d is not None else None
    return _to_instant(raw)


def months_inclusive(start_date, end_date):
    if not start_date or not end_date or start_date > end_date:
        return 0
    sy, sm, _ = _local_parts(start_date)
    ey, em, _ = _local_parts(end_date)
    return (ey - sy) * 12 + (em - sm) + 1


def _helper_fy_bounds(fy_start_year):
    start_year = to_number(fy_start_year)
    if not math.isfinite(start_year):
        return None
    start = js_local_date(start_year, 3, 1)
    end = js_local_date(start_year + 1, 2, 31)
    if start is None or end is None:
        return None
    end_instant = datetime(end.year, end.month, end.day, 23, 59, 59, 999000,
                           tzinfo=LOCAL_TZ).astimezone(timezone.utc)
    return {"start": _local_midnight(start), "end": end_instant}


def compute_annual_rent_from_entries(rent_entries=UNDEFINED, fy_start_year=None, period_start=None):
    """Pro-rate rent entries by rental period within the financial year."""
    if rent_entries is UNDEFINED:
        rent_entries = []
    if fy_start_year is UNDEFINED:
        fy_start_year = None
    if period_start is UNDEFINED:
        period_start = None
    if not isinstance(rent_entries, list) or len(rent_entries) == 0:
        return {"annualRent": 0, "isMetroCity": False, "dominantEntry": None}

    bounds = _helper_fy_bounds(fy_start_year)
    implementation_start = to_calendar_date(period_start)
    if (bounds and implementation_start
            and implementation_start > to_calendar_date(bounds["start"])
            and implementation_start <= to_calendar_date(bounds["end"])):
        bounds["start"] = _local_midnight(implementation_start)
    use_day_factor = bool(implementation_start and bounds)
    period_factor = sum_month_day_factors(bounds["start"], bounds["end"]) if use_day_factor else 12

    annual_rent = 0.0
    dominant_entry = None
    dominant_rent = 0.0

    for entry in rent_entries:
        monthly = money(g(entry, "rentMonthly"))
        declared_annual = money(g(entry, "rentAnnual"))
        entry_annual = declared_annual if declared_annual else monthly * 12

        if bounds and monthly > 0:
            frm = parse_rent_date(g(entry, "fromDate"))
            to = parse_rent_date(g(entry, "toDate"))
            if frm and to:
                overlap_start = frm if frm > bounds["start"] else bounds["start"]
                overlap_end = to if to < bounds["end"] else bounds["end"]
                if overlap_start <= overlap_end:
                    entry_annual = (monthly * sum_month_day_factors(overlap_start, overlap_end)
                                    if use_day_factor
                                    else monthly * months_inclusive(overlap_start, overlap_end))
                else:
                    entry_annual = 0
            elif use_day_factor:
                entry_annual = (declared_annual * (period_factor / 12) if declared_annual > 0
                                else monthly * period_factor)
        elif bounds and use_day_factor and declared_annual > 0:
            entry_annual = declared_annual * (period_factor / 12)

        annual_rent += entry_annual
        if entry_annual > dominant_rent:
            dominant_rent = entry_annual
            dominant_entry = entry

    first = rent_entries[0] if rent_entries else UNDEFINED
    is_metro = js_truthy(js_nc(g(dominant_entry, "isMetroCity"), g(first, "isMetroCity")))
    return js_out({
        "annualRent": js_round(annual_rent),
        "isMetroCity": is_metro,
        "dominantEntry": dominant_entry,
    })


# ------------------------------------------------------------------ toggles / caps


def is_section_enabled(toggles=UNDEFINED, key=UNDEFINED, default_enabled=True):
    if toggles is UNDEFINED:
        toggles = {}
    if not js_truthy(toggles) or not isinstance(toggles, (dict, list)):
        return default_enabled
    value = g(toggles, key)
    if is_nullish(value):
        return default_enabled
    is_zero = isinstance(value, (int, float)) and not isinstance(value, bool) and value == 0
    return value is not False and value != "false" and not is_zero


def cap_section80_c(amount=UNDEFINED):
    return min(money(amount), SECTION_80C_LIMIT)


def cap_section80_d(amount=UNDEFINED):
    return min(money(amount), SECTION_80D_COMBINED_LIMIT)


def cap_section24_self_occupied(amount=UNDEFINED):
    return min(money(amount), SECTION_24_SELF_OCCUPIED_LIMIT)


def sum_line_amounts(lines=UNDEFINED):
    if lines is UNDEFINED:
        lines = []
    if not isinstance(lines, list):
        return 0
    total = 0.0
    for line in lines:
        total += money(g(line, "amount"))
    return total


CHAPTER_KEYS = [
    "section80CCC", "section80CCD1", "section80CCD1B", "section80CCD2", "section80DD",
    "section80DDB", "section80EE", "section80EEA", "section80GG", "section80GGA",
    "section80GGC", "section80TTA",
]


def build_declared_deductions_from_declaration(options=UNDEFINED):
    """Declared deduction totals from declaration lines (with statutory caps + toggles)."""
    o = options if isinstance(options, dict) else {}

    def opt(key, default):
        v = o.get(key, UNDEFINED)
        return default if v is UNDEFINED else v

    lines80_c = opt("lines80C", [])
    lines80_d = opt("lines80D", [])
    it_declaration = opt("itDeclaration", {})
    prev = opt("prevDeductions", {})
    tds_config = opt("tdsConfig", {})
    touched_home_loan = opt("touchedHomeLoan", False)
    touched_other_inv = opt("touchedOtherInv", False)
    override = opt("declaredDeductionsOverride", None)

    if prev is None:
        raise TypeError("Cannot read properties of null (reading 'standardDeduction')")
    if tds_config is None:
        raise TypeError("Cannot read properties of null (reading 'standardDeduction')")

    toggles = js_or(g(it_declaration, "toggles"), {})
    standard_deduction = js_or(num0(g(prev, "standardDeduction")),
                               num0(g(tds_config, "standardDeduction")), 50000)

    section80_c_enabled = is_section_enabled(toggles, "section80C", True)
    section80_d_enabled = is_section_enabled(toggles, "section80D", True)
    other_enabled = is_section_enabled(toggles, "otherInvestments", True)

    limits = get_exemption_limits(tds_config)
    section80_c_limit = read_money_limit(g(tds_config, "section80CLimit"), SECTION_80C_LIMIT)
    hl = js_or(g(it_declaration, "homeLoanSelfOccupied"), {})
    home_loan_enabled = section80_c_enabled and js_truthy(g(hl, "enabled"))
    home_loan_principal = money(g(hl, "principalPaid")) if home_loan_enabled else 0

    section24 = num0(g(prev, "section24"))
    if js_truthy(touched_home_loan):
        section24 = money(g(hl, "interestPaid")) if js_truthy(g(hl, "enabled")) else 0

    raw80_c = sum_line_amounts(lines80_c) + home_loan_principal if section80_c_enabled else 0
    buckets = aggregate80_d_from_lines(lines80_d) if section80_d_enabled else empty80_d_buckets()
    raw80_d = buckets["declared"]

    other_lines = g(it_declaration, "investmentsOther")
    other_lines = other_lines if isinstance(other_lines, list) else []
    other_deductions = num0(g(prev, "otherDeductions"))
    if js_truthy(touched_other_inv):
        other_deductions = sum_line_amounts(other_lines) if other_enabled else 0
    elif not other_enabled:
        other_deductions = 0

    merged = {
        "section80C": max(0, raw80_c),
        "section80D": max(0, raw80_d),
        "section80DSelf": buckets["selfPremium"],
        "section80DParents": buckets["parentsPremium"],
        "section80DPreventiveSelf": buckets["preventiveSelf"],
        "section80DPreventiveParents": buckets["preventiveParents"],
        "section80DMedicalSelf": buckets["medicalSelf"],
        "section80DMedicalParents": buckets["medicalParents"],
        "section80DSelfSenior": buckets["selfSenior"],
        "section80DParentsSenior": buckets["parentsSenior"],
        "section80E": num0(g(prev, "section80E")),
        "section80G": num0(g(prev, "section80G")),
        "section24": section24,
        "professionalTax": num0(g(prev, "professionalTax")),
        "otherDeductions": other_deductions,
        "standardDeduction": standard_deduction,
        "total": 0,
    }

    if js_truthy(override) and isinstance(override, (dict, list)):
        n = override
        if g(n, "section80E") is not UNDEFINED:
            merged["section80E"] = money(g(n, "section80E"))
        if g(n, "section80G") is not UNDEFINED:
            merged["section80G"] = money(g(n, "section80G"))
        if g(n, "professionalTax") is not UNDEFINED:
            merged["professionalTax"] = money(g(n, "professionalTax"))
        if g(n, "section24") is not UNDEFINED and not js_truthy(touched_home_loan):
            merged["section24"] = money(g(n, "section24"))
        if g(n, "otherDeductions") is not UNDEFINED and not js_truthy(touched_other_inv):
            merged["otherDeductions"] = money(g(n, "otherDeductions")) if other_enabled else 0

    chapter = js_or(g(it_declaration, "chapterVIA"), {})
    for key in CHAPTER_KEYS:
        v = g(chapter, key)
        if v is not UNDEFINED and v is not None and v != "":
            merged[key] = money(v)
    severe_raw = g(chapter, "section80DDSevere")
    if severe_raw is not UNDEFINED:
        merged["section80DDSevere"] = (severe_raw is True or severe_raw == "true"
                                       or (_is_plain_num(severe_raw) and severe_raw == 1))

    merged["section80C"] = cap_to_limit(merged["section80C"], section80_c_limit)
    merged["section80D"] = cap_to_limit(merged["section80D"], limits["section80D"])
    merged["section80E"] = cap_to_limit(merged["section80E"], limits["section80E"])
    merged["section80G"] = cap_to_limit(merged["section80G"], limits["section80G"])
    merged["section24"] = cap_to_limit(merged["section24"], limits["section24"])
    merged["otherDeductions"] = cap_to_limit(merged["otherDeductions"], limits["otherDeductions"])

    m = merged
    total = m["section80C"]
    for key in ("section80CCC", "section80CCD1", "section80CCD1B", "section80CCD2"):
        total += num0(m.get(key, UNDEFINED))
    total += m["section80D"]
    for key in ("section80DD", "section80DDB"):
        total += num0(m.get(key, UNDEFINED))
    total += m["section80E"]
    for key in ("section80EE", "section80EEA"):
        total += num0(m.get(key, UNDEFINED))
    total += m["section80G"]
    for key in ("section80GG", "section80GGA", "section80GGC", "section80TTA"):
        total += num0(m.get(key, UNDEFINED))
    total += m["section24"]
    total += m["professionalTax"]
    total += m["otherDeductions"]
    total += m["standardDeduction"]
    merged["total"] = total
    return js_out(merged)


def _is_plain_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


# ------------------------------------------------------------------ 80D


def empty80_d_buckets():
    return {
        "declared": 0, "selfPremium": 0, "parentsPremium": 0, "preventiveSelf": 0,
        "preventiveParents": 0, "medicalSelf": 0, "medicalParents": 0,
        "selfSenior": False, "parentsSenior": False,
    }


def classify80_d_type(investment_type=UNDEFINED):
    t = js_str(js_or(investment_type, "")).lower()
    return {
        "parents": "parent" in t,
        "senior": "senior" in t,
        "preventive": ("prevent" in t or "check-up" in t or "checkup" in t or "check up" in t),
        "medical": ("medical exp" in t or "expenditure" in t or "medical bill" in t),
    }


def aggregate80_d_from_lines(lines=UNDEFINED):
    if lines is UNDEFINED:
        lines = []
    b = empty80_d_buckets()
    if not isinstance(lines, list):
        return b
    for line in lines:
        amount = money(g(line, "amount"))
        if not amount:
            continue
        kind = classify80_d_type(g(line, "investmentType"))
        if kind["parents"]:
            b["parentsSenior"] = b["parentsSenior"] or kind["senior"] or kind["medical"]
            if kind["preventive"]:
                b["preventiveParents"] += amount
            elif kind["medical"]:
                b["medicalParents"] += amount
            else:
                b["parentsPremium"] += amount
        else:
            b["selfSenior"] = b["selfSenior"] or kind["senior"] or kind["medical"]
            if kind["preventive"]:
                b["preventiveSelf"] += amount
            elif kind["medical"]:
                b["medicalSelf"] += amount
            else:
                b["selfPremium"] += amount
        b["declared"] += amount
    return js_out(b)


# ------------------------------------------------------------------ service-based exemptions


def completed_service_years(doj=UNDEFINED, as_of=UNDEFINED, round_six_months=False):
    """Completed years up to asOf (months >= 6 round up when ``round_six_months``)."""
    start = js_date(doj)
    end = js_date(as_of)
    if start is None or end is None or end < start:
        return None
    sy, sm, sd = _local_parts(start)
    ey, em, ed = _local_parts(end)
    years = ey - sy
    months = em - sm
    if ed < sd:
        months -= 1
    if months < 0:
        years -= 1
        months += 12
    if round_six_months and months >= 6:
        years += 1
    return max(0, years)


def least_positive(values):
    nums = [max(0, v) for v in values if is_finite_num(v)]
    if not nums:
        return 0
    return js_round(min(nums))


def gratuity_exempt(actual=UNDEFINED, cap=UNDEFINED, monthly_salary=UNDEFINED, years=UNDEFINED,
                    covered_under_act=True):
    received = money(actual)
    if not received:
        return 0
    ceiling = received if is_nullish(cap) else min(received, money(cap))
    if not (_is_plain_num(monthly_salary) and monthly_salary > 0) or is_nullish(years):
        return js_round(ceiling)
    if covered_under_act:
        formula = (monthly_salary * 15 / 26) * years
    else:
        formula = (monthly_salary / 2) * years
    return least_positive([received, received if is_nullish(cap) else money(cap), formula])


def leave_encashment_exempt(actual=UNDEFINED, cap=UNDEFINED, monthly_salary=UNDEFINED):
    received = money(actual)
    if not received:
        return 0
    capv = received if is_nullish(cap) else money(cap)
    if not (_is_plain_num(monthly_salary) and monthly_salary > 0):
        return least_positive([received, capv])
    return least_positive([received, capv, monthly_salary * 10])


def retrenchment_exempt(actual=UNDEFINED, cap=UNDEFINED, monthly_salary=UNDEFINED, years=UNDEFINED):
    received = money(actual)
    if not received:
        return 0
    capv = received if is_nullish(cap) else money(cap)
    if not (_is_plain_num(monthly_salary) and monthly_salary > 0) or is_nullish(years):
        return least_positive([received, capv])
    return least_positive([received, capv, (monthly_salary * 15 / 26) * years])


def vrs_exempt(actual=UNDEFINED, cap=UNDEFINED, monthly_salary=UNDEFINED, years=UNDEFINED):
    received = money(actual)
    if not received:
        return 0
    capv = received if is_nullish(cap) else money(cap)
    if not (_is_plain_num(monthly_salary) and monthly_salary > 0) or is_nullish(years):
        return least_positive([received, capv])
    return least_positive([received, capv, monthly_salary * 3 * years])


# ------------------------------------------------------------------ capped deductions


def _allow80_d_bucket(premium, medical, preventive_requested, senior, limits, pool):
    if senior:
        limit = money(js_or(g(limits, "section80DSenior"), 50000))
    else:
        limit = money(js_or(g(limits, "section80DSelf"), 25000))
    premium_amt = money(premium)
    medical_amt = 0 if premium_amt > 0 else money(medical)
    base = min(premium_amt if premium_amt > 0 else medical_amt, limit)
    room = max(0, limit - base)
    checkup = min(money(preventive_requested), room, pool["left"])
    pool["left"] -= checkup
    return base + checkup


def _truthy_true(v):
    return v is True or v == "true"


def _resolve80_d(declared, limits, age):
    self_field = money(g(declared, "section80DSelf"))
    parents = money(g(declared, "section80DParents"))
    preventive_self = money(g(declared, "section80DPreventiveSelf")) + money(g(declared, "section80DPreventive"))
    preventive_parents = money(g(declared, "section80DPreventiveParents"))
    medical_self = money(g(declared, "section80DMedicalSelf"))
    medical_parents = money(g(declared, "section80DMedicalParents"))
    split = self_field + parents + preventive_self + preventive_parents + medical_self + medical_parents
    self_premium = self_field if split > 0 else money(g(declared, "section80D"))
    self_senior = (_truthy_true(g(declared, "section80DSelfSenior"))
                   or (is_finite_num(age) and age >= 60))
    parents_senior = _truthy_true(g(declared, "section80DParentsSenior"))
    pool = {"left": money(js_nc(g(limits, "section80DPreventive"), 5000))}
    self_allowed = _allow80_d_bucket(self_premium, medical_self, preventive_self, self_senior, limits, pool)
    parents_allowed = _allow80_d_bucket(parents, medical_parents, preventive_parents, parents_senior,
                                        limits, pool)
    combined = money(js_nc(g(limits, "section80D"), SECTION_80D_COMBINED_LIMIT))
    total = min(self_allowed + parents_allowed, combined)
    senior_limit = money(js_or(g(limits, "section80DSenior"), 50000))
    self_limit_plain = money(js_or(g(limits, "section80DSelf"), 25000))
    self_limit = senior_limit if self_senior else self_limit_plain
    parents_limit = senior_limit if parents_senior else self_limit_plain
    parts = [f"Self, spouse and children ₹{locale_en_in(self_allowed)} of ₹{locale_en_in(self_limit)}"]
    if parents > 0 or medical_parents > 0 or preventive_parents > 0:
        parts.append(f"Parents ₹{locale_en_in(max(0, total - self_allowed))} of ₹{locale_en_in(parents_limit)}")
    elif money(g(declared, "section80D")) + self_premium > self_limit and parents == 0:
        parts.append("Parents were not declared, so only the self limit applies")
    parts.append("Preventive checkup of ₹5,000 sits inside these limits")
    if (medical_self > 0 and self_premium > 0) or (medical_parents > 0 and parents > 0):
        parts.append("Medical bills are ignored where insurance premium is paid")
    return {"amount": total, "note": ". ".join(parts) + "."}


def _cap_combined80_c(declared, limit):
    room = [max(0.0, num0(limit))]

    def take(key):
        allowed = min(money(g(declared, key)), room[0])
        room[0] -= allowed
        return allowed

    return {
        "section80C": take("section80C"),
        "section80CCC": take("section80CCC"),
        "section80CCD1": take("section80CCD1"),
    }


def apply_capped_deductions_for_tax(declared_deductions=UNDEFINED, tds_config=UNDEFINED,
                                    options=UNDEFINED):
    d = {} if declared_deductions is UNDEFINED else declared_deductions
    cfg = {} if tds_config is UNDEFINED else tds_config
    opts = {} if options is UNDEFINED else options
    if not isinstance(cfg, dict):
        raise TypeError("Cannot read properties of null (reading 'section80CLimit')")
    if not isinstance(d, dict):
        raise TypeError("Cannot read properties of null (reading 'section80DDSevere')")
    if not isinstance(opts, dict):
        raise TypeError("Cannot read properties of null (reading 'age')")

    limits = get_exemption_limits(cfg)
    notes = {}
    section80_c_limit = read_money_limit(g(cfg, "section80CLimit"), SECTION_80C_LIMIT)
    sev = g(d, "section80DDSevere")
    severe = sev is True or sev == "true" or (_is_plain_num(sev) and sev == 1)
    age = to_number(g(opts, "age"))
    known_age = math.isfinite(age)
    senior = known_age and age >= 60
    if senior:
        ddb_limit = limits["section80DDBSenior"]
    elif not known_age:
        ddb_limit = max(num0(limits["section80DDB"]), num0(limits["section80DDBSenior"]))
    else:
        ddb_limit = limits["section80DDB"]
    months = to_number(g(opts, "payrollMonths"))
    gg_months = months if (math.isfinite(months) and months > 0) else 12
    salary = money(g(opts, "annualBasic")) + money(g(opts, "annualDa"))
    regime = "new" if js_str(js_or(g(opts, "taxRegime"), "old")).lower() == "new" else "old"
    ccd1_percent = money(js_nc(limits["section80CCD1Percent"], 10))
    if regime == "new":
        ccd2_percent = money(js_nc(limits["section80CCD2Percent"], 14))
    else:
        ccd2_percent = money(js_nc(limits["section80CCD2PercentOld"], 10))

    section80_ccd1 = money(g(d, "section80CCD1"))
    if salary > 0:
        salary_cap = js_round((salary * ccd1_percent) / 100)
        section80_ccd1 = min(section80_ccd1, salary_cap)
        notes["section80CCD1"] = (f"{js_str(ccd1_percent)}% of salary ₹{locale_en_in(salary)}, "
                                  "then the combined 80C room.")
    combined = _cap_combined80_c({**d, "section80CCD1": section80_ccd1}, section80_c_limit)

    section80_ccd2 = money(g(d, "section80CCD2"))
    if salary > 0:
        salary_cap = js_round((salary * ccd2_percent) / 100)
        section80_ccd2 = min(section80_ccd2, salary_cap)
    if regime == "new":
        notes["section80CCD2"] = (f"New regime: {js_str(ccd2_percent)}% of salary "
                                  f"₹{locale_en_in(js_round(salary))}.")
    else:
        notes["section80CCD2"] = (f"Old regime: {js_str(ccd2_percent)}% of salary "
                                  f"₹{locale_en_in(js_round(salary))}. Central Government employers use 14%.")

    r80d = _resolve80_d(d, limits, age if known_age else None)
    notes["section80D"] = r80d["note"]

    dd_claimed = money(g(d, "section80DD")) > 0 or severe
    section80_dd = money(limits["section80DDSevere"] if severe else limits["section80DD"]) if dd_claimed else 0
    notes["section80DD"] = (f"Fixed deduction ₹{locale_en_in(section80_dd)}. 80DD is not limited to the amount typed."
                            if dd_claimed else "Not claimed.")

    assessee_disabled = g(opts, "assesseeDisabled") is True
    if assessee_disabled:
        section80_u = money(limits["section80USevere"] if js_truthy(g(opts, "assesseeSevere"))
                            else limits["section80U"])
    else:
        section80_u = 0
    notes["section80U"] = ("Fixed deduction because disability is marked on the employee."
                           if assessee_disabled
                           else "Not claimed. Mark disability on the employee to allow 80U.")

    ddb_net = max(0, money(g(d, "section80DDB")) - money(g(d, "section80DDBReimbursed")))
    section80_ddb = cap_to_limit(ddb_net, ddb_limit)
    if senior:
        notes["section80DDB"] = (f"Senior citizen ceiling ₹{locale_en_in(money(ddb_limit))}, "
                                 "after insurance reimbursement.")
    else:
        notes["section80DDB"] = (f"Ceiling ₹{locale_en_in(money(ddb_limit))} below age 60, "
                                 "after insurance reimbursement.")

    section80_e = cap_to_limit(g(d, "section80E"), limits["section80E"])
    start_year = to_number(g(d, "section80EStartYear"))
    fy_start = to_number(g(opts, "fyStartYear"))
    if section80_e > 0 and math.isfinite(start_year) and start_year > 0 and math.isfinite(fy_start):
        claim_year = fy_start - start_year + 1
        if claim_year < 1 or claim_year > 8:
            section80_e = 0
            notes["section80E"] = "Interest is outside the 8-year deduction window."
        else:
            notes["section80E"] = f"Year {js_str(claim_year)} of 8. No rupee ceiling."
    else:
        notes["section80E"] = ("No rupee ceiling. The 8-year window applies when the starting "
                               "financial year is entered.")

    section80_ee = cap_to_limit(g(d, "section80EE"), limits["section80EE"])
    section80_eea = cap_to_limit(g(d, "section80EEA"), limits["section80EEA"])
    if section80_ee > 0 and section80_eea > 0:
        section80_eea = 0
        notes["section80EEA"] = "Not allowed in a year when Section 80EE is claimed. Clear 80EE to use 80EEA."
    else:
        notes["section80EEA"] = (f"Ceiling ₹{locale_en_in(money(limits['section80EEA']))}. "
                                 "Loan must be sanctioned from 1 Apr 2019 to 31 Mar 2022.")
    notes["section80EE"] = (f"Ceiling ₹{locale_en_in(money(limits['section80EE']))}. "
                            "Loan must be sanctioned in FY 2016-17.")

    section24 = cap_to_limit(g(d, "section24"), limits["section24"])
    notes["section24"] = (f"Self-occupied ceiling ₹{locale_en_in(money(limits['section24']))}. "
                          "A let-out loss can also be set off only up to this amount.")

    income_before24 = to_number(g(opts, "incomeBeforeSection24"))
    gti = max(0, income_before24 - section24) if math.isfinite(income_before24) else None

    section80_ccd1_b = cap_to_limit(g(d, "section80CCD1B"), limits["section80CCD1B"])
    section80_gga = cap_to_limit(g(d, "section80GGA"), limits["section80GGA"])
    section80_ggc = cap_to_limit(g(d, "section80GGC"), limits["section80GGC"])
    other_deductions = cap_to_limit(g(d, "otherDeductions"), limits["otherDeductions"])

    section80_tta = 0
    section80_ttb = 0
    interest_claim = money(g(d, "section80TTA"))
    if senior:
        base = interest_claim
        reported = money(g(opts, "interestSavings")) + money(g(opts, "interestFD"))
        if reported > 0:
            base = min(base, reported)
        section80_ttb = min(base, money(js_nc(limits["section80TTB"], 50000)))
        notes["section80TTA"] = "80TTA does not apply from age 60. Section 80TTB is used."
        notes["section80TTB"] = (f"Senior-citizen interest ceiling "
                                 f"₹{locale_en_in(money(js_nc(limits['section80TTB'], 50000)))}.")
    else:
        base = interest_claim
        if money(g(opts, "interestSavings")) > 0:
            base = min(base, money(g(opts, "interestSavings")))
        section80_tta = min(base, money(js_nc(limits["section80TTA"], 10000)))
        notes["section80TTA"] = (f"Savings interest only, ceiling "
                                 f"₹{locale_en_in(money(js_nc(limits['section80TTA'], 10000)))}. "
                                 "Fixed-deposit interest is not eligible.")

    via = combined["section80C"]
    for part in (combined["section80CCC"], combined["section80CCD1"], section80_ccd1_b,
                 section80_ccd2, r80d["amount"], section80_dd, section80_u, section80_ddb,
                 section80_e, section80_ee, section80_eea, section80_gga, section80_ggc,
                 section80_tta, section80_ttb, other_deductions):
        via += part

    adjusted_for_rent = None if gti is None else max(0, gti - via)
    section80_gg = 0
    annual_hra = money(g(opts, "annualHra"))
    if money(g(d, "section80GG")) > 0 and annual_hra > 0:
        notes["section80GG"] = "Not available when HRA is received."
    elif money(g(d, "section80GG")) > 0:
        gg_monthly = money(js_nc(limits["section80GGMonthly"], 5000))
        monthly_cap = gg_monthly * gg_months
        rent = money(g(opts, "annualRent"))
        adjusted = money(g(d, "section80GG")) if adjusted_for_rent is None else adjusted_for_rent
        rent_minus_ten = max(0, rent - (adjusted * 0.1))
        quarter = adjusted * 0.25
        statutory = min(monthly_cap, rent_minus_ten, quarter)
        section80_gg = min(money(g(d, "section80GG")), max(0, statutory))
        notes["section80GG"] = (
            f"Least of ₹{locale_en_in(gg_monthly)} × {js_str(gg_months)} months, 25% of adjusted "
            "income, and rent minus 10% of adjusted income." if rent > 0
            else "Rent is zero, so 80GG is zero.")

    adjusted_for_donation = None if gti is None else max(0, gti - via - section80_gg)
    qualifying_room = INF if adjusted_for_donation is None else adjusted_for_donation * 0.1
    limited100 = min(money(g(d, "section80G100Limited")), qualifying_room)
    limited50_base = min(money(g(d, "section80G50Limited")), max(0, qualifying_room - limited100))
    section80_g = (money(g(d, "section80G")) + (money(g(d, "section80G50")) * 0.5)
                   + limited100 + (limited50_base * 0.5))
    section80_g = cap_to_limit(section80_g, limits["section80G"])
    section80_g = js_round(section80_g)
    notes["section80G"] = ("100% donations are allowed in full. 50% donations are halved. Donations "
                           "marked as subject to the qualifying limit stay within 10% of adjusted "
                           "total income.")

    out = dict(d)
    out.update(combined)
    out.update({
        "section80CCD1B": section80_ccd1_b,
        "section80CCD2": section80_ccd2,
        "section80D": r80d["amount"],
        "section80DD": section80_dd,
        "section80DDSevere": severe,
        "section80U": section80_u,
        "section80DDB": section80_ddb,
        "section80E": section80_e,
        "section80EE": section80_ee,
        "section80EEA": section80_eea,
        "section80G": section80_g,
        "section80GG": js_round(section80_gg),
        "section80GGA": section80_gga,
        "section80GGC": section80_ggc,
        "section80TTA": section80_tta,
        "section80TTB": section80_ttb,
        "section24": section24,
        "otherDeductions": other_deductions,
        "statutoryNotes": notes,
    })
    return js_out(out)


__all__ = [
    "SECTION_80C_LIMIT", "SECTION_80D_COMBINED_LIMIT", "SECTION_24_SELF_OCCUPIED_LIMIT",
    "compute_annual_rent_from_entries", "build_declared_deductions_from_declaration",
    "apply_capped_deductions_for_tax", "aggregate80_d_from_lines", "completed_service_years",
    "gratuity_exempt", "leave_encashment_exempt", "retrenchment_exempt", "vrs_exempt",
    "get_default_exemption_limits", "get_exemption_limits", "cap_to_limit",
    "cap_section80_c", "cap_section80_d", "cap_section24_self_occupied", "is_section_enabled",
    "sum_line_amounts",
]

_ = date  # date objects are accepted wherever the legacy took a Date
