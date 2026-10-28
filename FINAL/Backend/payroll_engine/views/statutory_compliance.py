"""Port of ``controller/payroll/statutoryCompliance.js``.

``createOrUpdateCompliance`` merges each section the client sent (after the legacy
sanitisers) shallowly over the stored section; ``getCompliance`` returns the org doc.
The sanitisers are module-level helpers (differential-tested against the JS).
"""

import copy
import math

from django.db import transaction

from ..context import PayrollError, payroll_view, send_response
from ..models import StatutoryCompliance
from ..services.audit_log import log_payroll_action
from ..services.jsmath import UNDEFINED, js_or, js_str, js_trim, js_truthy, to_number

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_ALIASES = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec", "jan": "Jan", "feb": "Feb", "mar": "Mar",
    "apr": "Apr", "jun": "Jun", "jul": "Jul", "aug": "Aug", "sep": "Sep", "oct": "Oct",
    "nov": "Nov", "dec": "Dec",
}


def _num_or(value, default):
    """``Number(value) || default``."""
    n = to_number(value)
    return default if (math.isnan(n) or n == 0) else n


def _get(obj, key):
    return obj.get(key, UNDEFINED) if isinstance(obj, dict) else UNDEFINED


def _hyphenate(text):
    import re
    return re.sub(r"[\s_]+", "-", text)


def normalize_lwf_calculation_type(value=UNDEFINED):
    raw = js_trim(js_str(js_or(value, "fixed"))).lower()
    return "percentage" if raw in ("percentage", "percent", "%") else "fixed"


def normalize_lwf_state_status(state=None):
    state = state if isinstance(state, dict) else {}
    if state.get("status") in ("inactive", "active"):
        return state["status"]
    if state.get("isApplicable", UNDEFINED) is False:
        return "inactive"
    return "active"


def normalize_lwf_months_list(months=UNDEFINED):
    if not isinstance(months, list):
        return []
    unique = []
    for m in months:
        if m is None or m is UNDEFINED or m == "":
            continue
        raw = js_trim(js_str(m))
        short = _ALIASES.get(raw.lower()) or (raw[:1].upper() + raw[1:3].lower())
        if short in MONTHS and short not in unique:
            unique.append(short)
    return unique


def normalize_pt_deduction_cycle(value=UNDEFINED):
    raw = _hyphenate(js_trim(js_str(js_or(value, "monthly"))).lower())
    if raw in ("half-yearly", "halfyearly", "semi-annual", "semiannual"):
        return "half-yearly"
    return "monthly"


def sanitize_professional_tax(pt=UNDEFINED):
    if not isinstance(pt, dict):
        return pt
    return {**pt, "deductionCycle": normalize_pt_deduction_cycle(_get(pt, "deductionCycle"))}


def sanitize_epf(epf=UNDEFINED):
    if not isinstance(epf, dict):
        return epf
    return {
        **epf,
        "restrictedPfWage": _num_or(_get(epf, "restrictedPfWage"), 15000),
        "employeeContributionRate": _num_or(_get(epf, "employeeContributionRate"), 12),
        "employerContributionRate": _num_or(_get(epf, "employerContributionRate"), 12),
        "proRateRestrictedPfWage": epf.get("proRateRestrictedPfWage", UNDEFINED) is not False,
        "considerSalaryBasedOnLOP": epf.get("considerSalaryBasedOnLOP", UNDEFINED) is not False,
        "considerAllPfComponentsAfterLopBelowCeiling":
            epf.get("considerAllPfComponentsAfterLopBelowCeiling", UNDEFINED) is not False,
    }


def normalize_bonus_payment_cycle(value=UNDEFINED):
    raw = _hyphenate(js_trim(js_str(js_or(value, "yearly"))).lower())
    return "monthly" if raw == "monthly" else "yearly"


def sanitize_bonus_wage_category(category=None):
    category = category if isinstance(category, dict) else {}
    raw_category = js_trim(js_str(js_or(_get(category, "employmentCategory"), "")))
    out = {}
    if raw_category in ("skilled", "semiSkilled", "unskilled"):
        out["employmentCategory"] = raw_category
    out["minWage"] = _num_or(_get(category, "minWage"), 0)
    out["effectiveFrom"] = js_trim(js_str(js_or(_get(category, "effectiveFrom"), "")))
    return out


def sanitize_statutory_bonus(bonus=UNDEFINED):
    if not isinstance(bonus, dict):
        return bonus
    sanitized = {
        **bonus,
        "paymentCycle": normalize_bonus_payment_cycle(_get(bonus, "paymentCycle")),
        "percentage": _num_or(_get(bonus, "percentage"), 0),
        "minimumBonusWage": _num_or(_get(bonus, "minimumBonusWage"), 7000),
        "eligibilityCeiling": _num_or(_get(bonus, "eligibilityCeiling"), 21000),
    }
    if not isinstance(bonus.get("states"), list):
        return sanitized
    states = []
    for state in bonus["states"]:
        state = state if isinstance(state, dict) else {}
        wc = state.get("wageCategories")
        if isinstance(wc, list) and len(wc):
            raw_categories = wc
        else:
            ec = state.get("employmentCategories")
            raw_categories = ec if isinstance(ec, list) else []
        wage_categories = [c for c in (sanitize_bonus_wage_category(x) for x in raw_categories)
                           if c.get("employmentCategory")]
        states.append({
            "stateName": js_or(_get(state, "stateName"), ""),
            "minWage": _num_or(_get(state, "minWage"), 0),
            "formulaBase": ("basicAndDA"
                            if js_trim(js_str(js_or(_get(state, "formulaBase"), "minimumWage"))) == "basicAndDA"
                            else "minimumWage"),
            "wageCategories": wage_categories,
        })
    sanitized["states"] = states
    return sanitized


def sanitize_labour_welfare_fund(lwf=UNDEFINED):
    if not isinstance(lwf, dict):
        return lwf
    sanitized = dict(lwf)
    sanitized["months"] = normalize_lwf_months_list(sanitized.get("months", UNDEFINED))
    if not isinstance(sanitized.get("states"), list):
        return sanitized
    out_states = []
    for state in sanitized["states"]:
        state = state if isinstance(state, dict) else {}
        status = normalize_lwf_state_status(state)
        cycle_raw = _hyphenate(js_str(js_or(_get(state, "deductionCycle"),
                                            _get(sanitized, "deductionCycle"),
                                            "half-yearly")).lower())
        if cycle_raw == "monthly":
            deduction_cycle = "monthly"
        elif cycle_raw in ("yearly", "annual"):
            deduction_cycle = "yearly"
        else:
            deduction_cycle = "half-yearly"
        saved_months = normalize_lwf_months_list(state.get("months", UNDEFINED))

        def normalize_month(value, fallback):
            lst = normalize_lwf_months_list([value])
            return lst[0] if lst else fallback

        def saved(i):
            return saved_months[i] if len(saved_months) > i else UNDEFINED

        if deduction_cycle == "monthly":
            period_from, period_to, months = "Jan", "Dec", list(MONTHS)
        elif deduction_cycle == "yearly":
            period_from = normalize_month(js_or(_get(state, "periodFrom"), saved(0)), "Dec")
            period_to = period_from
            months = [period_from]
        else:
            period_from = normalize_month(js_or(_get(state, "periodFrom"), saved(0)), "Jun")
            period_to = normalize_month(js_or(_get(state, "periodTo"), saved(1)), "Dec")
            months = [m for m in MONTHS if m in (period_from, period_to)]

        calculation_type = normalize_lwf_calculation_type(_get(state, "calculationType"))

        def normalize_share(value):
            n = to_number(value)
            amount = max(0.0, 0.0 if (math.isnan(n) or n == 0) else n)
            return min(amount, 100) if calculation_type == "percentage" else amount

        max_amount = state.get("maxAmount", UNDEFINED)
        out_states.append({
            **state,
            "deductionCycle": deduction_cycle,
            "periodFrom": period_from,
            "periodTo": period_to,
            "calculationType": calculation_type,
            "status": status,
            "isApplicable": status == "active",
            "months": months,
            "minAmount": _num_or(_get(state, "minAmount"), 0),
            "maxAmount": "" if max_amount in ("", None, UNDEFINED) else max_amount,
            "employeeShare": normalize_share(_get(state, "employeeShare")),
            "employerShare": normalize_share(_get(state, "employerShare")),
        })
    sanitized["states"] = out_states
    return sanitized


_SECTIONS = (
    ("epf", "epf", sanitize_epf),
    ("esi", "esi", None),
    ("professionalTax", "professional_tax", sanitize_professional_tax),
    ("labourWelfareFund", "labour_welfare_fund", sanitize_labour_welfare_fund),
    ("statutoryBonus", "statutory_bonus", sanitize_statutory_bonus),
)


@payroll_view(["POST"])
def create_or_update_compliance(ctx):
    if ctx.org is None:
        raise PayrollError("org_uuid not found in headers", 400)
    org = ctx.org
    body = ctx.body
    with transaction.atomic():
        compliance = StatutoryCompliance.objects.select_for_update().filter(org=org).first()
        before = compliance.to_dict() if compliance else None
        if compliance is None:
            compliance = StatutoryCompliance(org=org)
        for key, attr, sanitizer in _SECTIONS:
            data = body.get(key)
            if js_truthy(data) and sanitizer:
                data = sanitizer(copy.deepcopy(data))
            if isinstance(data, dict):
                existing = dict(getattr(compliance, attr) or {})
                merged = {**existing, **data}
                if isinstance(data.get("states"), list):
                    merged["states"] = data["states"]
                setattr(compliance, attr, merged)
        compliance.save()
    log_payroll_action(ctx, action="compliance_updated", entity_type="compliance",
                       entity_id=str(compliance.pk), before_data=before,
                       after_data=compliance.to_dict(),
                       remarks="Statutory compliance saved: " + ", ".join(
                           k for k, _a, _s in _SECTIONS if isinstance(body.get(k), dict)))
    return send_response(200, True, "Statutory compliance saved successfully", compliance.to_dict())


@payroll_view(["GET"])
def get_compliance(ctx):
    if ctx.org is None:
        raise PayrollError("org_uuid not found in headers", 400)
    compliance = StatutoryCompliance.objects.filter(org=ctx.org).first()
    if compliance is None:
        raise PayrollError("No statutory compliance found for this organization", 404)
    return send_response(200, True, "Statutory compliance fetched successfully", compliance.to_dict())


ROUTES = [
    ("createOrUpdateCompliance", create_or_update_compliance, "create_or_update_compliance"),
    ("getCompliance", get_compliance, "get_compliance"),
]
