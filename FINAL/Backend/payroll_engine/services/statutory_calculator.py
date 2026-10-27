"""Centralised statutory calculators: EPF / EDLI / admin charges / ABRY, ESI, Professional
Tax, Labour Welfare Fund, take-home schedule and Statutory Bonus.

Port of ``FINAL/legacy_payroll/utils/payroll/statutoryCalculator.js`` — pure functions,
no DB access. Every branch, constant and default is kept; inputs/outputs are the legacy
camelCase dict shapes (``statutoryCompliance.epf`` etc. and ``Employee.statutoryInfo``).

The legacy functions take one destructured object; the ports take the same fields as
keyword arguments in snake_case (``calculateEpf({ epfConfig, baseSalary })`` ->
``calculate_epf(epf_config=..., base_salary=...)``) with identical defaults (a JS default
applies only to ``undefined`` — passing ``None`` is JS ``null``).

Exported (legacy name -> port):
    calculateEpf                 -> calculate_epf
    resolveEpfApplicableWage     -> resolve_epf_applicable_wage
    sumConsiderForEpf            -> sum_consider_for_epf
    calculateEsi                 -> calculate_esi
    isEmployeeEsiOptedOut        -> is_employee_esi_opted_out
    sumConsiderForEsi            -> sum_consider_for_esi
    calculateProfessionalTax     -> calculate_professional_tax
    calculateLwf                 -> calculate_lwf
    resolveLwfDeductionMonths    -> resolve_lwf_deduction_months
    resolveLwfDeductionsPerYear  -> resolve_lwf_deductions_per_year
    buildNetPaySchedule          -> build_net_pay_schedule
    calculateStatutoryBonus      -> calculate_statutory_bonus
    normalizeEmploymentCategory  -> normalize_employment_category
    resolveBonusMinWage          -> resolve_bonus_min_wage
    BONUS_EMPLOYMENT_CATEGORIES, BONUS_MIN_WORKING_DAYS, EPF_DEFAULTS, ESI_DEFAULTS
"""

import math
import re

from .jsmath import (
    JS_WS_CLASS,
    UNDEFINED,
    is_integer,
    is_nullish,
    js_add,
    js_div,
    js_ge,
    js_get,
    js_gt,
    js_le,
    js_max,
    js_min,
    js_mul,
    js_opt,
    js_or,
    js_out,
    js_round,
    js_str,
    js_str_method_target,
    js_strict_eq,
    js_sub,
    js_trim,
    js_truthy,
    to_number,
)

DEFAULTS = {
    "EMPLOYEE_RATE": 12,
    "EMPLOYER_RATE": 12,
    "CEILING": 15000,
    "EDLI_RATE": 0.5,
    "EDLI_CEILING": 15000,
    "EDLI_MAX_PER_EMPLOYEE": 75,
    "ADMIN_RATE": 0.5,
    "ADMIN_MIN_PER_EMPLOYEE": 75,
}
EPF_DEFAULTS = DEFAULTS

ESI_DEFAULTS = {
    "EMPLOYEE_RATE": 0.75,
    "EMPLOYER_RATE": 3.25,
    "WAGE_LIMIT": 21000,
}

_WS_OR_UNDERSCORE = re.compile(r"(?:" + JS_WS_CLASS + r"|_)+")
_WS_US_HYPHEN = re.compile(r"(?:" + JS_WS_CLASS + r"|[_-])+")


def _round(n):
    """``Math.round(Number(n) || 0)``."""
    x = to_number(n)
    if math.isnan(x) or x == 0:
        x = 0.0
    return js_round(x)


def _safe_number(value, fallback):
    n = to_number(value)
    return n if math.isfinite(n) else fallback


def _lower(value):
    """``value.toLowerCase()`` (TypeError unless a string, like JS)."""
    return js_str_method_target(value).lower()


def _trim(value):
    return js_trim(js_str_method_target(value))


def _not_false(value):
    return value is not False


# =============================================================================== EPF


def _resolve_effective_pf_ceiling(ceiling, epf_config, epf_wage_resolution):
    base_ceiling = _safe_number(ceiling, DEFAULTS["CEILING"])
    pro_rate_enabled = _not_false(js_opt(epf_config, "proRateRestrictedPfWage"))
    if not pro_rate_enabled or not js_truthy(epf_wage_resolution):
        return base_ceiling
    working_days = js_max(0, _safe_number(js_get(epf_wage_resolution, "workingDays"), 0))
    paid_days = js_max(0, _safe_number(js_get(epf_wage_resolution, "paidDays"), working_days))
    if working_days <= 0 or paid_days >= working_days:
        return base_ceiling
    return _round((base_ceiling * paid_days) / working_days)


def calculate_epf(epf_config=UNDEFINED, base_salary=0, epf_applicable_wage=UNDEFINED,
                  employee_statutory_info=None, epf_wage_resolution=None):
    """EPF / EDLI / admin-charge breakdown (legacy ``calculateEpf``)."""
    empty = {
        "applicable": False,
        "epfWage": 0,
        "employeeContribution": 0,
        "employerContribution": 0,
        "edliContribution": 0,
        "adminCharges": 0,
        "totalEmployerCost": 0,
        "abryApplied": False,
        "details": {},
    }
    if not js_truthy(epf_config) or not js_truthy(js_get(epf_config, "isEnabled")):
        return empty
    if js_truthy(employee_statutory_info) and \
            js_get(employee_statutory_info, "epfApplicable") is False:
        return empty

    employee_rate = _safe_number(js_get(epf_config, "employeeContributionRate"),
                                 DEFAULTS["EMPLOYEE_RATE"])
    employer_rate = _safe_number(js_get(epf_config, "employerContributionRate"),
                                 DEFAULTS["EMPLOYER_RATE"])
    ceiling = _safe_number(js_get(epf_config, "restrictedPfWage"), DEFAULTS["CEILING"])
    apply_ceiling = True
    override_used = False

    override = js_opt(employee_statutory_info, "epfOverride")
    if js_truthy(override) and (js_get(override, "enabled") is True
                                or js_get(override, "applyCeiling") is False):
        if isinstance(js_get(override, "applyCeiling"), bool):
            apply_ceiling = js_get(override, "applyCeiling")
        override_used = True

    wage = _safe_number(epf_applicable_wage, _safe_number(base_salary, 0))

    effective_ceiling = _resolve_effective_pf_ceiling(ceiling, epf_config, epf_wage_resolution)
    epf_wage = js_min(wage, effective_ceiling) if apply_ceiling else wage

    employee_contribution = (epf_wage * employee_rate) / 100

    prefs = js_or(js_get(epf_config, "contributionPreferences"), {})
    employer_enabled = _not_false(js_get(prefs, "employerPfContribution"))
    abry_applied = js_truthy(js_get(epf_config, "eligibleForAbryScheme"))
    employer_contribution = 0 if (not employer_enabled or abry_applied) \
        else (epf_wage * employer_rate) / 100

    edli_contribution = 0
    if js_truthy(js_get(prefs, "edliContribution")) and not abry_applied:
        edli_base = js_min(epf_wage, DEFAULTS["EDLI_CEILING"])
        edli_contribution = js_min((edli_base * DEFAULTS["EDLI_RATE"]) / 100,
                                   DEFAULTS["EDLI_MAX_PER_EMPLOYEE"])

    admin_charges = 0
    if js_truthy(js_get(prefs, "adminCharges")) and not abry_applied:
        calc = (epf_wage * DEFAULTS["ADMIN_RATE"]) / 100
        admin_charges = js_max(calc, DEFAULTS["ADMIN_MIN_PER_EMPLOYEE"]) if epf_wage > 0 else 0

    details = {
        "employeeRate": employee_rate,
        "employerRate": employer_rate,
        "ceilingApplied": apply_ceiling,
        "effectiveCeiling": _round(effective_ceiling),
        "configuredCeiling": _round(ceiling),
        "proRateRestrictedPfWage": _not_false(js_opt(epf_config, "proRateRestrictedPfWage")),
        "wageBeforeCeiling": _round(wage),
        "overrideUsed": override_used,
        "employerEnabled": employer_enabled,
        "edliEnabled": js_truthy(js_get(prefs, "edliContribution")),
        "adminEnabled": js_truthy(js_get(prefs, "adminCharges")),
    }
    if js_truthy(epf_wage_resolution):
        details.update({
            "fullMonthPfWage": js_get(epf_wage_resolution, "fullMonthPfWage"),
            "lopAdjustedPfWage": js_get(epf_wage_resolution, "lopAdjustedPfWage"),
            "usedFullMonthPfComponents": js_get(epf_wage_resolution, "usedFullMonthPfComponents"),
            "paidDays": js_get(epf_wage_resolution, "paidDays"),
            "workingDays": js_get(epf_wage_resolution, "workingDays"),
        })
    return js_out({
        "applicable": True,
        "epfWage": _round(epf_wage),
        "employeeContribution": _round(employee_contribution),
        "employerContribution": _round(employer_contribution),
        "edliContribution": _round(edli_contribution),
        "adminCharges": _round(admin_charges),
        "totalEmployerCost": _round(employer_contribution + edli_contribution + admin_charges),
        "abryApplied": abry_applied,
        "details": details,
    })


def resolve_epf_applicable_wage(epf_config=UNDEFINED, full_month_epf_wage=0, working_days=0,
                                paid_days=0):
    full_wage = _safe_number(full_month_epf_wage, 0)
    ceiling = _safe_number(js_opt(epf_config, "restrictedPfWage"), DEFAULTS["CEILING"])
    wd = js_max(0, _safe_number(working_days, 0))
    pd = js_max(0, _safe_number(paid_days, wd))
    consider_all = _not_false(js_opt(epf_config, "considerAllPfComponentsAfterLopBelowCeiling"))

    base_result = {
        "wage": full_wage,
        "fullMonthPfWage": full_wage,
        "lopAdjustedPfWage": full_wage,
        "usedFullMonthPfComponents": True,
        "paidDays": pd,
        "workingDays": wd,
    }
    if wd <= 0 or pd >= wd:
        return js_out(base_result)

    lop_adjusted_wage = _round((full_wage * pd) / wd)
    if consider_all and lop_adjusted_wage < ceiling:
        return js_out({
            **base_result,
            "wage": full_wage,
            "lopAdjustedPfWage": lop_adjusted_wage,
            "usedFullMonthPfComponents": True,
        })
    return js_out({
        "wage": lop_adjusted_wage,
        "fullMonthPfWage": full_wage,
        "lopAdjustedPfWage": lop_adjusted_wage,
        "usedFullMonthPfComponents": False,
        "paidDays": pd,
        "workingDays": wd,
    })


def _sum_consider_for(earnings, fallback, flag_key):
    if not isinstance(earnings, list) or len(earnings) == 0:
        return fallback
    total = 0
    for e in earnings:
        if not js_truthy(e):
            continue
        name = js_or(js_get(e, "name"), js_get(e, "componentName"), "")
        is_basic = "basic" in _lower(name)
        flag = js_get(e, flag_key) is True or is_basic
        raw = js_get(e, "calculatedAmount")
        if is_nullish(raw):
            raw = js_get(e, "amount")
            if is_nullish(raw):
                raw = 0
        amt = to_number(raw)
        if math.isnan(amt) or amt == 0:
            amt = 0
        total = js_add(total, amt) if flag else total
    return total if total > 0 else fallback


def sum_consider_for_epf(earnings=UNDEFINED, base_salary=0):
    """Sum of ``considerForEPF`` (or Basic) earnings; ``base_salary`` when nothing matched."""
    return js_out(_sum_consider_for(earnings, base_salary, "considerForEPF"))


# =============================================================================== ESI


def calculate_esi(esi_config=UNDEFINED, gross_salary=0, esi_applicable_wage=UNDEFINED,
                  employee_statutory_info=None):
    empty = {
        "applicable": False,
        "wageUsed": 0,
        "employeeContribution": 0,
        "employerContribution": 0,
        "includeEmployerInCtc": True,
        "details": {},
    }
    if not js_truthy(esi_config) or not js_truthy(js_get(esi_config, "isEnabled")):
        return empty
    if is_employee_esi_opted_out(employee_statutory_info):
        return empty

    employee_rate = _safe_number(js_get(esi_config, "employeeContributionRate"),
                                 ESI_DEFAULTS["EMPLOYEE_RATE"])
    employer_rate = _safe_number(js_get(esi_config, "employerContributionRate"),
                                 ESI_DEFAULTS["EMPLOYER_RATE"])
    wage_limit = _safe_number(js_get(esi_config, "wageLimit"), ESI_DEFAULTS["WAGE_LIMIT"])

    if js_gt(gross_salary, wage_limit):
        return js_out({**empty, "details": {"reason": "gross exceeds wage limit",
                                            "wageLimit": wage_limit,
                                            "grossSalary": gross_salary}})

    wage_for_contribution = _safe_number(esi_applicable_wage, gross_salary)
    employee_contribution = js_div(js_mul(wage_for_contribution, employee_rate), 100)
    employer_contribution = js_div(js_mul(wage_for_contribution, employer_rate), 100)
    include_employer_in_ctc = _not_false(js_get(esi_config, "includeEmployerInSalaryStructure"))

    return js_out({
        "applicable": True,
        "wageUsed": _round(wage_for_contribution),
        "employeeContribution": _round(employee_contribution),
        "employerContribution": _round(employer_contribution),
        "includeEmployerInCtc": include_employer_in_ctc,
        "details": {
            "employeeRate": employee_rate,
            "employerRate": employer_rate,
            "wageLimit": wage_limit,
            "grossSalary": gross_salary,
        },
    })


def is_employee_esi_opted_out(employee_statutory_info=UNDEFINED):
    """Opt-out is esiOptedOut=true, or esiApplicable=false on a compact calculator payload
    (a legacy ``esiApplicable: false`` on a full employee doc is ignored)."""
    info = employee_statutory_info
    if not js_truthy(info):
        return False
    if js_get(info, "esiOptedOut") is True:
        return True
    if js_get(info, "esiApplicable") is not False:
        return False
    if isinstance(info, dict):
        looks_like_employee_doc = ("esiNumber" in info or "uan" in info
                                   or "pfAccountNumber" in info or "epfOverride" in info)
    elif isinstance(info, (list, tuple)):
        looks_like_employee_doc = False
    else:
        raise TypeError("Cannot use 'in' operator to search for 'esiNumber'")
    if looks_like_employee_doc:
        return False
    return True


def sum_consider_for_esi(earnings=UNDEFINED, gross_salary=0):
    """Sum of ``considerForESI`` (or Basic) earnings; ``gross_salary`` when nothing matched."""
    return js_out(_sum_consider_for(earnings, gross_salary, "considerForESI"))


# =============================================================================== PT

QUARTERLY_MONTHS = ("Jan", "Apr", "Jul", "Oct")
HALF_YEARLY_MONTHS = ("Sep", "Mar")
YEARLY_MONTHS = ("Mar",)


def _set_has(members, value):
    return isinstance(value, str) and value in members


def _pick_pt_slab(slabs, gross_salary):
    if not isinstance(slabs, list):
        return None
    for slab in slabs:
        frm = _safe_number(js_get(slab, "salaryRangeFrom"), 0)
        to = _safe_number(js_get(slab, "salaryRangeTo"), math.inf)
        if js_ge(gross_salary, frm) and js_le(gross_salary, to):
            return slab
    return None


def _pick_pt_state_config(pt_config, employee_state):
    states = js_get(pt_config, "states") if js_truthy(pt_config) else UNDEFINED
    if not js_truthy(pt_config) or not isinstance(states, list) or len(states) == 0:
        return None
    wanted = _trim(js_or(employee_state, "")).lower()
    if wanted:
        for s in states:
            if _trim(js_or(js_get(s, "stateName"), "")).lower() == wanted and \
                    _not_false(js_get(s, "isApplicable")):
                return s
        return None
    for s in states:
        if _not_false(js_get(s, "isApplicable")):
            return s
    return None


def _should_deduct_pt_this_month(cycle, month):
    raw = _WS_OR_UNDERSCORE.sub("-", js_trim(js_str(js_or(cycle, "monthly"))).lower())
    normalized = "half-yearly" if raw in ("halfyearly", "semi-annual", "semiannual") else raw
    if normalized in ("quarterly", "quarter-yearly"):
        return _set_has(QUARTERLY_MONTHS, month) if js_truthy(month) else True
    if normalized == "half-yearly":
        return _set_has(HALF_YEARLY_MONTHS, month) if js_truthy(month) else True
    if normalized in ("yearly", "annual"):
        return _set_has(YEARLY_MONTHS, month) if js_truthy(month) else True
    return True


def calculate_professional_tax(pt_config=UNDEFINED, gross_salary=0, employee_state=None,
                               month=None, employee_statutory_info=None):
    empty = {"applicable": False, "amount": 0, "details": {}}
    if not js_truthy(pt_config) or not js_truthy(js_get(pt_config, "isEnabled")):
        return empty
    if js_truthy(employee_statutory_info) and \
            js_get(employee_statutory_info, "ptApplicable") is False:
        return {**empty, "details": {"reason": "employee ptApplicable=false"}}

    resolved_state = js_or(
        js_get(employee_statutory_info, "ptState") if js_truthy(employee_statutory_info)
        else employee_statutory_info,
        employee_state, None)

    state_config = _pick_pt_state_config(pt_config, resolved_state)
    if not js_truthy(state_config):
        return js_out({**empty, "details": {"reason": "no applicable state config",
                                            "employeeState": resolved_state}})

    if not _should_deduct_pt_this_month(js_get(pt_config, "deductionCycle"), month):
        return js_out({**empty, "details": {
            "reason": "not a deduction month for cycle",
            "cycle": js_get(pt_config, "deductionCycle"),
            "month": month,
        }})

    slab = _pick_pt_slab(js_get(state_config, "ptSlabs"), gross_salary)
    amount = _safe_number(js_get(slab, "taxAmount"), 0) if js_truthy(slab) else 0

    return js_out({
        "applicable": amount > 0,
        "amount": _round(amount),
        "details": {
            "stateUsed": js_or(js_get(state_config, "stateName"), resolved_state, ""),
            "ptNumber": js_or(js_get(state_config, "ptNumber"), ""),
            "cycle": js_or(js_get(pt_config, "deductionCycle"), "monthly"),
            "slabMatched": {"from": js_get(slab, "salaryRangeFrom"),
                            "to": js_get(slab, "salaryRangeTo"),
                            "tax": js_get(slab, "taxAmount")} if js_truthy(slab) else None,
        },
    })


# =============================================================================== LWF

LWF_MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
                   "Dec"]
LWF_HALF_YEARLY_MONTHS = ["Jun", "Dec"]
LWF_YEARLY_MONTHS = ["Dec"]

LWF_MONTH_ALIASES = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr",
    "may": "May", "june": "Jun", "july": "Jul", "august": "Aug",
    "september": "Sep", "october": "Oct", "november": "Nov", "december": "Dec",
    "jan": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr",
    "jun": "Jun", "jul": "Jul", "aug": "Aug", "sep": "Sep",
    "oct": "Oct", "nov": "Nov", "dec": "Dec",
}


def _normalize_lwf_month(value):
    if is_nullish(value) or js_strict_eq(value, ""):
        return None
    raw = js_trim(js_str(value))
    if not raw:
        return None
    alias = LWF_MONTH_ALIASES.get(raw.lower())
    if alias:
        return alias
    titled = raw[:1].upper() + raw[1:3].lower()
    return titled if titled in LWF_MONTH_SHORT else None


def _normalize_lwf_months(months):
    if not isinstance(months, list):
        return []
    unique = []
    for m in months:
        short = _normalize_lwf_month(m)
        if short and short not in unique:
            unique.append(short)
    return unique


def _get_default_lwf_months_for_cycle(cycle):
    normalized = _lower(js_or(cycle, "half-yearly"))
    if normalized in ("half-yearly", "half_yearly", "halfyearly"):
        return list(LWF_HALF_YEARLY_MONTHS)
    if normalized in ("yearly", "annual"):
        return list(LWF_YEARLY_MONTHS)
    return list(LWF_MONTH_SHORT)


def resolve_lwf_deduction_months(lwf_config=UNDEFINED, state_cfg=None):
    """Deduction months: state months -> state cycle/period -> org months -> cycle default."""
    if lwf_config is UNDEFINED:
        lwf_config = {}
    state_months = _normalize_lwf_months(js_opt(state_cfg, "months"))
    if len(state_months) > 0:
        return state_months
    if js_truthy(js_opt(state_cfg, "deductionCycle")):
        cycle = _WS_OR_UNDERSCORE.sub("-", js_str(js_get(state_cfg, "deductionCycle")).lower())
        period_from = _normalize_lwf_month(js_get(state_cfg, "periodFrom"))
        period_to = _normalize_lwf_month(js_get(state_cfg, "periodTo"))
        if cycle in ("yearly", "annual"):
            return [period_from] if period_from else list(LWF_YEARLY_MONTHS)
        if cycle in ("half-yearly", "halfyearly"):
            selected = _normalize_lwf_months([period_from, period_to])
            return selected if len(selected) > 0 else list(LWF_HALF_YEARLY_MONTHS)
        return _get_default_lwf_months_for_cycle(js_get(state_cfg, "deductionCycle"))
    org_months = _normalize_lwf_months(js_opt(lwf_config, "months"))
    if len(org_months) > 0:
        return org_months
    return _get_default_lwf_months_for_cycle(js_opt(lwf_config, "deductionCycle"))


def resolve_lwf_deductions_per_year(lwf_breakdown=None, lwf_config=None):
    """How many times LWF is deducted in a year: 12 | 2 | 1 | configured months count."""
    months = js_opt(js_opt(lwf_breakdown, "details"), "months")
    months_from_breakdown = len(months) if isinstance(months, list) else 0
    if months_from_breakdown > 0:
        return months_from_breakdown
    cycle = _WS_OR_UNDERSCORE.sub("-", js_str(js_or(
        js_opt(js_opt(lwf_breakdown, "details"), "cycle"),
        js_opt(lwf_config, "deductionCycle"),
        "half-yearly")).lower())
    if cycle.startswith("half"):
        return 2
    if cycle in ("yearly", "annual"):
        return 1
    return 12


def _is_lwf_state_active(state_cfg=UNDEFINED):
    if state_cfg is UNDEFINED:
        state_cfg = {}
    if js_strict_eq(js_get(state_cfg, "status"), "inactive"):
        return False
    if js_get(state_cfg, "isApplicable") is False:
        return False
    return True


def _pick_lwf_state_config(lwf_config, employee_state, gross_salary):
    states = js_get(lwf_config, "states") if js_truthy(lwf_config) else UNDEFINED
    if not js_truthy(lwf_config) or not isinstance(states, list) or len(states) == 0:
        return None
    wanted = _trim(js_or(employee_state, "")).lower()
    if wanted:
        state_slabs = [s for s in states
                       if _trim(js_or(js_get(s, "stateName"), "")).lower() == wanted
                       and _is_lwf_state_active(s)]
        if len(state_slabs) == 0:
            return None
        for s in state_slabs:
            if _is_within_lwf_wage_range(s, gross_salary):
                return s
        return state_slabs[0]
    for s in states:
        if _is_lwf_state_active(s) and _is_within_lwf_wage_range(s, gross_salary):
            return s
    for s in states:
        if _is_lwf_state_active(s):
            return s
    return None


def _resolve_lwf_share_amount(share_value, calculation_type, gross_salary):
    value = _safe_number(share_value, 0)
    if value <= 0:
        return 0
    if _lower(js_or(calculation_type, "fixed")) == "percentage":
        return (_safe_number(gross_salary, 0) * value) / 100
    return value


HARYANA_LWF_EMPLOYEE_RATE = 0.2
HARYANA_LWF_EMPLOYER_RATE = 0.4
HARYANA_LWF_EMPLOYEE_MAX = 35
HARYANA_LWF_EMPLOYER_MAX = 70


def _is_haryana_lwf_state(state_name):
    return js_trim(js_str(js_or(state_name, ""))).lower() == "haryana"


def _resolve_haryana_lwf_shares(gross_salary):
    gross = _safe_number(gross_salary, 0)
    employee_raw = (gross * HARYANA_LWF_EMPLOYEE_RATE) / 100
    employer_raw = (gross * HARYANA_LWF_EMPLOYER_RATE) / 100
    if employee_raw > HARYANA_LWF_EMPLOYEE_MAX:
        return {"employeeShare": HARYANA_LWF_EMPLOYEE_MAX,
                "employerShare": HARYANA_LWF_EMPLOYER_MAX, "capped": True}
    return {
        "employeeShare": employee_raw,
        "employerShare": HARYANA_LWF_EMPLOYER_MAX if employer_raw > HARYANA_LWF_EMPLOYER_MAX
        else employer_raw,
        "capped": employer_raw > HARYANA_LWF_EMPLOYER_MAX,
    }


def _should_deduct_lwf_this_month(deduction_months, month):
    if not js_truthy(month):
        return True
    short = _normalize_lwf_month(month)
    if not short:
        return True
    allowed = _normalize_lwf_months(deduction_months)
    if len(allowed) == 0:
        return True
    return short in allowed


def _is_within_lwf_wage_range(state_cfg, wage):
    mn = _safe_number(js_get(state_cfg, "minAmount"), 0)
    max_raw = js_get(state_cfg, "maxAmount")
    if is_nullish(max_raw) or js_strict_eq(max_raw, ""):
        mx = math.inf
    else:
        mx = _safe_number(max_raw, math.inf)
    if mn == 0 and not math.isfinite(mx):
        return True
    return js_ge(wage, mn) and js_le(wage, mx)


def calculate_lwf(lwf_config=UNDEFINED, gross_salary=0, employee_state=None, month=None,
                  employee_statutory_info=None):
    empty = {
        "applicable": False,
        "employeeShare": 0,
        "employerShare": 0,
        "totalEmployerCost": 0,
        "details": {},
    }
    if not js_truthy(lwf_config) or not js_truthy(js_get(lwf_config, "isEnabled")):
        return empty
    info = employee_statutory_info
    if js_truthy(info) and js_get(info, "lwfApplicable") is False:
        return {**empty, "details": {"reason": "employee lwfApplicable=false"}}

    resolved_state = js_or(
        js_get(info, "lwfState") if js_truthy(info) else info,
        js_get(info, "ptState") if js_truthy(info) else info,
        employee_state,
        None,
    )

    state_cfg = _pick_lwf_state_config(lwf_config, resolved_state, gross_salary)
    if not js_truthy(state_cfg):
        return js_out({**empty, "details": {"reason": "no applicable state config",
                                            "employeeState": resolved_state}})

    deduction_months = resolve_lwf_deduction_months(lwf_config, state_cfg)
    if not _should_deduct_lwf_this_month(deduction_months, month):
        return js_out({**empty, "details": {
            "reason": "not a deduction month",
            "cycle": js_or(js_get(state_cfg, "deductionCycle"), js_get(lwf_config, "deductionCycle")),
            "month": month,
            "months": deduction_months,
            "stateUsed": js_or(js_get(state_cfg, "stateName"), resolved_state, ""),
        }})

    if not _is_within_lwf_wage_range(state_cfg, gross_salary):
        return js_out({**empty, "details": {
            "reason": "gross outside wage range",
            "gross": gross_salary,
            "min": js_get(state_cfg, "minAmount"),
            "max": js_get(state_cfg, "maxAmount"),
        }})

    haryana = _is_haryana_lwf_state(js_or(js_get(state_cfg, "stateName"), resolved_state))
    configured_percentage = _lower(js_or(js_get(state_cfg, "calculationType"), "fixed")) == "percentage"
    calculation_type = "percentage" if (haryana or configured_percentage) else "fixed"
    haryana_shares = _resolve_haryana_lwf_shares(gross_salary) if haryana else None
    if haryana_shares:
        employee_share = haryana_shares["employeeShare"]
        employer_share = haryana_shares["employerShare"]
    else:
        employee_share = _resolve_lwf_share_amount(js_get(state_cfg, "employeeShare"),
                                                   calculation_type, gross_salary)
        employer_share = _resolve_lwf_share_amount(js_get(state_cfg, "employerShare"),
                                                   calculation_type, gross_salary)

    details = {
        "stateUsed": js_or(js_get(state_cfg, "stateName"), resolved_state, ""),
        "cycle": js_or(js_get(state_cfg, "deductionCycle"), js_get(lwf_config, "deductionCycle"),
                       "half-yearly"),
        "months": deduction_months,
        "calculationType": calculation_type,
        "calculationBasis": "grossSalary" if calculation_type == "percentage" else "fixed",
        "grossSalary": _safe_number(gross_salary, 0),
        "configuredEmployeeShare": HARYANA_LWF_EMPLOYEE_RATE if haryana
        else _safe_number(js_get(state_cfg, "employeeShare"), 0),
        "configuredEmployerShare": HARYANA_LWF_EMPLOYER_RATE if haryana
        else _safe_number(js_get(state_cfg, "employerShare"), 0),
    }
    if haryana:
        details.update({
            "employeeMax": HARYANA_LWF_EMPLOYEE_MAX,
            "employerMax": HARYANA_LWF_EMPLOYER_MAX,
            "capped": haryana_shares["capped"],
        })
    details["status"] = js_or(js_get(state_cfg, "status"),
                              "inactive" if js_get(state_cfg, "isApplicable") is False else "active")
    return js_out({
        "applicable": employee_share > 0 or employer_share > 0,
        "employeeShare": _round(employee_share),
        "employerShare": _round(employer_share),
        "totalEmployerCost": _round(employer_share),
        "details": details,
    })


# =============================================================================== take-home


def _to_locale_en_in(n):
    """``Number.prototype.toLocaleString('en-IN')`` (Indian digit grouping, ≤3 decimals)."""
    x = float(n)
    if math.isnan(x):
        return "NaN"
    if math.isinf(x):
        return "∞" if x > 0 else "-∞"
    from .jsmath import to_fixed_str

    text = to_fixed_str(abs(x), 3)
    int_part, frac = text.split(".")
    frac = frac.rstrip("0")
    if len(int_part) > 3:
        head, tail = int_part[:-3], int_part[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        int_part = ",".join(groups + [tail])
    out = int_part + ("." + frac if frac else "")
    return ("-" if x < 0 and out.strip("0.,") else "") + out


def build_net_pay_schedule(gross_salary=0, base_deductions=0, pt_config=None, lwf_config=None,
                           employee_state=None, employee_statutory_info=None):
    """Take-home for every month of the year (PT / LWF may run on non-monthly cycles)."""
    by_month = []
    for month in LWF_MONTH_SHORT:
        pt = calculate_professional_tax(pt_config=pt_config, gross_salary=gross_salary,
                                        month=month, employee_state=employee_state,
                                        employee_statutory_info=employee_statutory_info)
        lwf = calculate_lwf(lwf_config=lwf_config, gross_salary=gross_salary, month=month,
                            employee_state=employee_state,
                            employee_statutory_info=employee_statutory_info)
        pt_amount = _round(js_or(pt.get("amount", UNDEFINED), 0)) if pt["applicable"] else 0
        lwf_amount = _round(js_or(lwf.get("employeeShare", UNDEFINED), 0)) if lwf["applicable"] else 0
        extras = []
        if pt_amount > 0:
            extras.append({"name": "Professional Tax", "amount": pt_amount})
        if lwf_amount > 0:
            extras.append({"name": "Labour Welfare Fund", "amount": lwf_amount})
        by_month.append({
            "month": month,
            "professionalTax": pt_amount,
            "lwf": lwf_amount,
            "totalDeductions": _round(js_add(js_add(base_deductions, pt_amount), lwf_amount)),
            "netPay": _round(js_sub(js_sub(js_sub(gross_salary, base_deductions), pt_amount),
                                    lwf_amount)),
            "extras": extras,
        })

    occurrences = {}
    for entry in by_month:
        occurrences[entry["netPay"]] = occurrences.get(entry["netPay"], 0) + 1

    regular = by_month[0]["netPay"]
    regular_month_count = 0
    for net_pay, count in occurrences.items():
        if count > regular_month_count or (count == regular_month_count and net_pay > regular):
            regular = net_pay
            regular_month_count = count

    exceptions = [
        {
            "month": e["month"],
            "netPay": e["netPay"],
            "extras": e["extras"],
            "reason": " + ".join(f"{x['name']} ₹{_to_locale_en_in(x['amount'])}"
                                 for x in e["extras"]),
        }
        for e in by_month if e["netPay"] != regular
    ]
    return js_out({
        "regular": regular,
        "regularDeductions": _round(js_sub(gross_salary, regular)),
        "regularMonthCount": regular_month_count,
        "varies": len(exceptions) > 0,
        "exceptions": exceptions,
        "byMonth": by_month,
        "ptMonths": [m["month"] for m in by_month if m["professionalTax"] > 0],
        "lwfMonths": [m["month"] for m in by_month if m["lwf"] > 0],
    })


# =============================================================================== bonus

PAYMENT_MONTH_TO_SHORT = dict(LWF_MONTH_ALIASES)

BONUS_ELIGIBILITY_CEILING = 21000
DEFAULT_BONUS_MINIMUM_WAGE = 7000
BONUS_MIN_WORKING_DAYS = 30
BONUS_MONTHS_SHORT = list(LWF_MONTH_SHORT)
BONUS_EMPLOYMENT_CATEGORIES = ["skilled", "semiSkilled", "unskilled"]


def _normalize_bonus_payment_cycle(cycle_value):
    raw = _WS_OR_UNDERSCORE.sub("-", js_trim(js_str(js_or(cycle_value, "yearly"))).lower())
    if raw == "monthly":
        return "monthly"
    return "yearly"


def _index_of(items, value):
    for i, item in enumerate(items):
        if js_strict_eq(item, value):
            return i
    return -1


def _is_bonus_payment_month(month, payment_month_short, cycle):
    if not js_truthy(month) or not js_truthy(payment_month_short):
        return True
    current_idx = _index_of(BONUS_MONTHS_SHORT, month)
    payment_idx = _index_of(BONUS_MONTHS_SHORT, payment_month_short)
    if current_idx == -1 or payment_idx == -1:
        return False
    if cycle == "half-yearly":
        second_idx = (payment_idx + 6) % 12
        return current_idx == payment_idx or current_idx == second_idx
    return current_idx == payment_idx


def _pick_bonus_state_config(bonus_config, employee_state):
    states = js_get(bonus_config, "states") if js_truthy(bonus_config) else UNDEFINED
    if not js_truthy(bonus_config) or not isinstance(states, list) or len(states) == 0:
        return None
    wanted = _trim(js_or(employee_state, "")).lower()
    if wanted:
        for s in states:
            if _trim(js_or(js_get(s, "stateName"), "")).lower() == wanted:
                return s
    return states[0]


def normalize_employment_category(value=UNDEFINED):
    raw = _WS_US_HYPHEN.sub("", js_trim(js_str(js_or(value, ""))).lower())
    if raw == "skilled":
        return "skilled"
    if raw == "semiskilled":
        return "semiSkilled"
    if raw == "unskilled":
        return "unskilled"
    return None


_YM_RE = re.compile(r"([0-9]{4})-([0-9]{1,2})(?:-[0-9]{1,2})?")
_YM_SLASH_RE = re.compile(r"([0-9]{4})[-/]([0-9]{1,2})")


def _parse_effective_from_key(value):
    if not js_truthy(value):
        return None
    raw = js_trim(js_str(value))
    m = _YM_RE.fullmatch(raw)
    if m:
        return f"{m.group(1)}-{m.group(2).rjust(2, '0')}"
    m = _YM_SLASH_RE.fullmatch(raw)
    if m:
        return f"{m.group(1)}-{m.group(2).rjust(2, '0')}"
    return None


def _to_payroll_year_month_key(year, month):
    month_idx = _index_of(BONUS_MONTHS_SHORT, month)
    y = to_number(year)
    if not is_integer(y) or month_idx == -1:
        return None
    return f"{js_str(y)}-{str(month_idx + 1).rjust(2, '0')}"


def resolve_bonus_min_wage(state_cfg=UNDEFINED, employment_category=UNDEFINED, year=None,
                           month=None):
    """Minimum wage for the bonus base: newest applicable skill-category wage, else
    ``stateCfg.minWage``."""
    if not js_truthy(state_cfg):
        return 0
    wage_categories = js_get(state_cfg, "wageCategories")
    if isinstance(wage_categories, list) and len(wage_categories):
        categories = wage_categories
    else:
        emp_cats = js_get(state_cfg, "employmentCategories")
        categories = emp_cats if isinstance(emp_cats, list) else []
    normalized_category = normalize_employment_category(employment_category)
    payroll_key = _to_payroll_year_month_key(year, month)

    if len(categories) > 0 and normalized_category:
        matching = [item for item in categories
                    if normalize_employment_category(js_opt(item, "employmentCategory"))
                    == normalized_category]
        if len(matching) > 0:
            entries = [{"item": item,
                        "effectiveKey": _parse_effective_from_key(js_opt(item, "effectiveFrom"))}
                       for item in matching]
            applicable = [e for e in entries
                          if not payroll_key or not e["effectiveKey"]
                          or e["effectiveKey"] <= payroll_key]
            applicable.sort(key=lambda e: e["effectiveKey"] or "", reverse=True)
            selected = applicable[0]["item"] if applicable else UNDEFINED
            if not js_truthy(selected):
                selected = matching[-1]
            category_wage = _safe_number(js_opt(selected, "minWage"), 0)
            if category_wage > 0:
                return js_out(category_wage)
    return js_out(_safe_number(js_get(state_cfg, "minWage"), 0))


def _normalize_payment_month(name):
    if not js_truthy(name):
        return None
    return PAYMENT_MONTH_TO_SHORT.get(js_trim(js_str(name)).lower()) or None


def calculate_statutory_bonus(bonus_config=UNDEFINED, basic_plus_da=0, employee_state=None,
                              employee_employment_category=None, month=None, year=None,
                              paid_days=None, total_days=None, accounting_year_worked_days=None):
    """Statutory bonus (Payment of Bonus Act) — an EARNING; never LOP-prorated."""
    empty = {"applicable": False, "amount": 0, "cycle": "yearly", "details": {}}
    if not js_truthy(bonus_config) or not js_truthy(js_get(bonus_config, "isEnabled")):
        return empty

    eligibility_ceiling = _safe_number(js_get(bonus_config, "eligibilityCeiling"),
                                       BONUS_ELIGIBILITY_CEILING)
    if js_gt(basic_plus_da, eligibility_ceiling):
        return js_out({**empty, "details": {"reason": "over eligibility ceiling",
                                            "basicPlusDA": basic_plus_da,
                                            "eligibilityCeiling": eligibility_ceiling}})

    min_working_days_required = _safe_number(js_get(bonus_config, "minWorkingDays"),
                                             BONUS_MIN_WORKING_DAYS)
    has_worked_days = not is_nullish(accounting_year_worked_days)
    if has_worked_days:
        worked_days = _safe_number(accounting_year_worked_days, 0)
        if worked_days < min_working_days_required:
            return js_out({**empty, "details": {
                "reason": "under minimum working days in accounting year",
                "accountingYearWorkedDays": _round(worked_days),
                "minWorkingDaysRequired": _round(min_working_days_required),
            }})

    cycle = _normalize_bonus_payment_cycle(js_get(bonus_config, "paymentCycle"))
    payment_month_short = _normalize_payment_month(js_get(bonus_config, "paymentMonth"))

    if cycle == "yearly":
        if js_truthy(month) and payment_month_short and \
                not _is_bonus_payment_month(month, payment_month_short, cycle):
            return js_out({**empty, "cycle": cycle, "details": {
                "reason": "not payment month",
                "paymentMonth": payment_month_short,
                "currentMonth": month,
                "paymentCycle": cycle,
            }})

    percentage = _safe_number(js_get(bonus_config, "percentage"), 8.33)
    minimum_bonus_wage = _safe_number(js_get(bonus_config, "minimumBonusWage"),
                                      DEFAULT_BONUS_MINIMUM_WAGE)
    state_cfg = _pick_bonus_state_config(bonus_config, employee_state)
    resolved_min_wage = resolve_bonus_min_wage(state_cfg, employee_employment_category, year, month)
    normalized_employment_category = normalize_employment_category(employee_employment_category)

    calc_base = 0
    zero_reason = ""
    if js_truthy(state_cfg):
        formula = _lower(js_or(js_get(state_cfg, "formulaBase"), "minimumWage"))
        if formula == "minimumwage":
            if not normalized_employment_category:
                calc_base = 0
                zero_reason = "employment category missing"
            elif resolved_min_wage > 0:
                calc_base = js_max(resolved_min_wage, minimum_bonus_wage)
            else:
                calc_base = 0
                zero_reason = "min wage zero for category"
        elif formula in ("basicanddastorage", "basicandda"):
            calc_base = js_max(basic_plus_da, minimum_bonus_wage)
    else:
        calc_base = js_max(basic_plus_da, minimum_bonus_wage)

    if calc_base <= 0:
        return js_out({**empty, "cycle": cycle, "details": {
            "reason": zero_reason or "calc base zero",
            "employmentCategory": normalized_employment_category or "",
            "minWageUsed": _round(resolved_min_wage),
            "paymentMonth": payment_month_short,
            "paymentCycle": cycle,
        }})

    monthly_amount = (calc_base * percentage) / 100
    annual_amount = monthly_amount * 12
    amount = monthly_amount if cycle == "monthly" else annual_amount

    details = {
        "stateUsed": js_get(state_cfg, "stateName") if js_truthy(state_cfg) else "",
        "employmentCategory": normalized_employment_category or "",
        "minWageUsed": _round(resolved_min_wage),
        "calcBase": _round(calc_base),
        "percentage": percentage,
        "paymentMonth": payment_month_short,
        "monthlyEquivalent": _round(monthly_amount),
        "annualEquivalent": _round(annual_amount),
    }
    if has_worked_days:
        details["accountingYearWorkedDays"] = _round(_safe_number(accounting_year_worked_days, 0))
        details["minWorkingDaysRequired"] = _round(min_working_days_required)
    return js_out({
        "applicable": amount > 0,
        "amount": _round(amount),
        "cycle": cycle,
        "details": details,
    })
