"""Salary-component maths: overrides, frequency gates, earnings breakdown, gross<->basic.

Port of ``FINAL/legacy_payroll/utils/salaryComponentHelper.js`` (1:1, same semantics).
Inputs/outputs are the legacy camelCase dict shapes (org salary-component documents
``{category, components: [...]}``, ``payrollInfo.componentOverrides`` rows, payroll-run
lines). Functions that took one destructured object take the same fields as snake_case
keyword arguments with the same defaults.

Exported (legacy name -> port):
    COMPONENT_CATEGORIES, PAYROLL_MONTHS_SHORT
    normalizeComponentKey, isBasicSalaryComponent, isDaComponent, isBasicPlusDaComponent,
    sumBasicPlusDA (-> sum_basic_plus_da), stripBasicFromOverrides, buildBasicSalaryOverride,
    withExplicitBasicOverride, getActiveEarningsComponents, normalizeComponentFrequency,
    normalizeComponentPaymentMonth, resolveComponentPaymentMonth, isComponentPaymentMonthDue,
    isYearlyComponentDue, sanitizeSalaryComponent, getComponentTrackingKey,
    hasComponentBeenPaid, shouldIncludeSalaryComponent, getFrequencyDisplayAmounts,
    shouldCountTowardMonthlyTotals, collectPaidComponentKeysFromPayrollRuns,
    loadPaidComponentKeysForEmployee, readOverrideAmountFromItem, hasExplicitOverrideAmount,
    shouldIncludeComponentInBreakdown, normalizeOverrides, mergeComponentOverrides,
    toStoredOverrides, resolveRevisionComponentOverrides, findComponentOverride,
    calculateComponentAmount, buildComponentLine, buildBasicEarningsLine,
    buildPayrollEarningsBreakdown, buildSalaryStructurePreview, resolvePayrollComponentAmount,
    computeMonthlyGrossFromBasic, deriveBasicFromTargetGross, resolveBasicAmountFromGross,
    resolveSalaryBasesFromInput, buildBalancingAllowanceLine, getComplianceFlags,
    addPayrollComponentLine
  (each as the snake_case name, e.g. ``build_payroll_earnings_breakdown``)

Signature change: ``loadPaidComponentKeysForEmployee(organizationId, employeeId,
PayrollRunModel, excludePayrollId)`` -> ``load_paid_component_keys_for_employee(
organization_id, employee_id, exclude_payroll_id=None)`` (queries the Django ``PayrollRun``).
Paid-component key collections are Python ``set``s (legacy ``Set``).
"""

import math
import re

from .jsmath import (
    JS_WS_CLASS,
    UNDEFINED,
    is_finite,
    is_nullish,
    js_get,
    js_max,
    js_min,
    js_mul,
    js_nc,
    js_opt,
    js_or,
    js_out,
    js_round,
    js_str,
    js_strict_eq,
    js_sub,
    js_trim,
    js_truthy,
    to_number,
)

COMPONENT_CATEGORIES = ["earnings", "deductions", "benefits", "reimbursements"]

PAYROLL_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct",
                        "Nov", "Dec"]

PAYMENT_MONTH_TO_SHORT = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec",
    "jan": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr", "jun": "Jun", "jul": "Jul",
    "aug": "Aug", "sep": "Sep", "oct": "Oct", "nov": "Nov", "dec": "Dec",
}

_WS_RUN = re.compile(JS_WS_CLASS + "+")

OVERRIDE_AMOUNT_KEYS = ["overrideAmount", "amount", "value", "input"]


def _n0(value):
    """``Number(value) || 0``."""
    n = to_number(value)
    return 0.0 if (math.isnan(n) or n == 0) else n


def _dflt(value, default):
    """Destructuring / parameter default: applies only to ``undefined``."""
    return default if value is UNDEFINED else value


def _find(items, pred):
    if not isinstance(items, list):
        raise TypeError("find is not a function")
    for item in items:
        if pred(item):
            return item
    return UNDEFINED


def _filter(items, pred):
    if not isinstance(items, list):
        raise TypeError("filter is not a function")
    return [item for item in items if pred(item)]


def normalize_component_key(value=""):
    value = _dflt(value, "")
    return _WS_RUN.sub(" ", js_trim(js_str(js_or(value, ""))).lower())


def is_basic_salary_component(component=UNDEFINED):
    component = _dflt(component, {})
    code = normalize_component_key(js_get(component, "code"))
    name = normalize_component_key(js_get(component, "name"))
    return (code in ("basic", "basesalary", "base salary", "bs")
            or name in ("basic", "basic salary", "base salary")
            or name.startswith("basic "))


def is_da_component(component=UNDEFINED):
    component = _dflt(component, {})
    code = normalize_component_key(js_get(component, "code"))
    name = normalize_component_key(js_get(component, "name"))
    return (code in ("da", "dearnessallowance", "dearness allowance")
            or name in ("da", "dearness allowance", "dearnessallowance"))


def is_basic_plus_da_component(component=UNDEFINED):
    component = _dflt(component, {})
    return is_basic_salary_component(component) or is_da_component(component)


def _amount_of(line):
    """``Number(line.calculatedAmount ?? line.amount ?? 0) || 0``."""
    return _n0(js_nc(js_nc(js_get(line, "calculatedAmount"), js_get(line, "amount")), 0))


def sum_basic_plus_da(earnings_breakdown=UNDEFINED):
    earnings_breakdown = _dflt(earnings_breakdown, [])
    if not isinstance(earnings_breakdown, list):
        return 0
    total = 0
    for line in earnings_breakdown:
        if is_basic_plus_da_component({"name": js_get(line, "name"), "code": js_get(line, "code")}):
            total = total + _amount_of(line)
    return js_out(total)


def strip_basic_from_overrides(overrides=UNDEFINED):
    """When gross is the input, Basic must come from org rule — drop stored Basic overrides."""
    overrides = _dflt(overrides, [])
    return [o for o in _normalize_overrides(overrides)
            if not (o["category"] == "earnings"
                    and is_basic_salary_component({"name": o["name"], "code": o["code"]}))]


def get_active_earnings_components(salary_components=UNDEFINED):
    salary_components = _dflt(salary_components, [])
    earnings_doc = _find(salary_components,
                         lambda c: js_strict_eq(js_get(c, "category"), "earnings"))
    active = _filter(js_or(js_opt(earnings_doc, "components"), []),
                     lambda c: js_strict_eq(js_get(c, "status"), "active"))
    basic = UNDEFINED
    for c in active:
        if is_basic_salary_component(c):
            basic = c
            break
    return {
        "basicComponent": basic if js_truthy(basic) else None,
        "otherComponents": [c for c in active if not is_basic_salary_component(c)],
        "allActive": active,
    }


def build_basic_salary_override(amount=UNDEFINED, salary_components=UNDEFINED):
    """Build a one-shot Basic override so calculator honors Excel / Create Revision Basic."""
    salary_components = _dflt(salary_components, [])
    num = to_number(amount)
    if not math.isfinite(num) or num <= 0:
        return None
    basic_component = get_active_earnings_components(salary_components)["basicComponent"]
    return js_out({
        "category": "earnings",
        "code": js_or(js_opt(basic_component, "code"), "BASIC"),
        "name": js_or(js_opt(basic_component, "name"), "Basic Salary"),
        "overrideAmount": js_round(num),
    })


def with_explicit_basic_override(overrides=UNDEFINED, basic_amount=UNDEFINED,
                                 salary_components=UNDEFINED):
    """For this calculation only: drop stale saved Basic, then apply the user's Basic."""
    overrides = _dflt(overrides, [])
    salary_components = _dflt(salary_components, [])
    without_basic = strip_basic_from_overrides(overrides)
    basic_override = build_basic_salary_override(basic_amount, salary_components)
    if not basic_override:
        return js_out(without_basic)
    return merge_component_overrides(without_basic, [basic_override])


def normalize_component_frequency(frequency=UNDEFINED):
    raw = js_trim(js_str(js_or(frequency, "monthly"))).lower()
    if raw in ("one-time", "onetime", "one_time"):
        return "one-time"
    if raw in ("yearly", "annual"):
        return "yearly"
    if raw in ("recurring", "monthly"):
        return "monthly"
    return raw


def normalize_component_payment_month(month_value=UNDEFINED):
    if not js_truthy(month_value):
        return None
    raw = js_trim(js_str(month_value)).lower()
    return PAYMENT_MONTH_TO_SHORT.get(raw) or None


def resolve_component_payment_month(component=UNDEFINED):
    component = _dflt(component, {})
    saved = normalize_component_payment_month(js_get(component, "paymentMonth"))
    if saved:
        return saved
    frequency = normalize_component_frequency(js_get(component, "frequency"))
    if frequency in ("yearly", "one-time"):
        return "Apr"
    return None


def is_component_payment_month_due(component=UNDEFINED, payroll_month=UNDEFINED):
    component = _dflt(component, {})
    frequency = normalize_component_frequency(js_get(component, "frequency"))
    if frequency == "monthly":
        return True
    payment_month = resolve_component_payment_month(component)
    current_month = js_or(normalize_component_payment_month(payroll_month), payroll_month)
    if not js_truthy(current_month) or not payment_month:
        return False
    return js_strict_eq(current_month, payment_month)


def is_yearly_component_due(component=UNDEFINED, payroll_month=UNDEFINED):
    return is_component_payment_month_due(_dflt(component, {}), payroll_month)


def get_component_tracking_key(category=UNDEFINED, component=UNDEFINED):
    component = _dflt(component, {})
    if js_truthy(js_get(component, "_id")):
        return f"{js_str(category)}:id:{js_str(js_get(component, '_id'))}"
    name_key = normalize_component_key(js_get(component, "name"))
    return f"{js_str(category)}:name:{name_key}" if name_key else ""


def _keys_empty(keys):
    if not js_truthy(keys):
        return True
    try:
        return len(keys) == 0
    except TypeError:
        return False


def has_component_been_paid(category=UNDEFINED, component=UNDEFINED, paid_component_keys=UNDEFINED):
    component = _dflt(component, {})
    paid_component_keys = _dflt(paid_component_keys, set())
    if _keys_empty(paid_component_keys):
        return False
    id_key = (f"{js_str(category)}:id:{js_str(js_get(component, '_id'))}"
              if js_truthy(js_get(component, "_id")) else "")
    if id_key and id_key in paid_component_keys:
        return True
    name_key = normalize_component_key(js_get(component, "name"))
    if name_key and f"{js_str(category)}:name:{name_key}" in paid_component_keys:
        return True
    legacy_key = get_component_tracking_key(category, component)
    return legacy_key in paid_component_keys if legacy_key else False


def should_include_salary_component(component=UNDEFINED, category=UNDEFINED,
                                    payroll_month=UNDEFINED, paid_component_keys=UNDEFINED):
    component = _dflt(component, {})
    paid_component_keys = _dflt(paid_component_keys, set())
    frequency = normalize_component_frequency(js_get(component, "frequency"))
    if frequency == "monthly":
        return True
    if frequency == "yearly":
        return is_yearly_component_due(component, payroll_month)
    if frequency == "one-time":
        if not is_component_payment_month_due(component, payroll_month):
            return False
        return not has_component_been_paid(category, component, paid_component_keys)
    return True


def get_frequency_display_amounts(component=UNDEFINED, amount=0, payroll_month=None):
    component = _dflt(component, {})
    amount = _dflt(amount, 0)
    frequency = normalize_component_frequency(js_get(component, "frequency"))
    rounded = js_round(js_max(0, amount))
    if frequency == "monthly":
        return js_out({"monthlyAmount": rounded, "annualAmount": rounded * 12})
    if frequency == "yearly":
        if not js_truthy(payroll_month):
            return js_out({"monthlyAmount": rounded, "annualAmount": rounded})
        due = is_yearly_component_due(component, payroll_month)
        return js_out({"monthlyAmount": rounded if due else 0, "annualAmount": rounded})
    if frequency == "one-time":
        if not js_truthy(payroll_month):
            return js_out({"monthlyAmount": rounded, "annualAmount": rounded})
        due = is_component_payment_month_due(component, payroll_month)
        return js_out({"monthlyAmount": rounded if due else 0, "annualAmount": rounded})
    return js_out({"monthlyAmount": rounded, "annualAmount": rounded * 12})


def should_count_toward_monthly_totals(component=UNDEFINED):
    component = _dflt(component, {})
    return normalize_component_frequency(js_get(component, "frequency")) == "monthly"


def _iterate(value):
    """``for (const x of value)`` over a JSON value (strings iterate characters)."""
    if isinstance(value, (list, tuple, str)):
        return list(value)
    raise TypeError(f"{js_str(value)} is not iterable")


def collect_paid_component_keys_from_payroll_runs(payroll_runs=UNDEFINED):
    payroll_runs = _dflt(payroll_runs, [])
    keys = set()
    for run in _iterate(payroll_runs):
        for category in ("earnings", "deductions", "benefits"):
            for line in _iterate(js_or(js_opt(run, category), [])):
                if js_truthy(js_opt(line, "componentId")):
                    keys.add(f"{category}:id:{js_str(js_get(line, 'componentId'))}")
                name_key = normalize_component_key(js_opt(line, "componentName"))
                if name_key:
                    keys.add(f"{category}:name:{name_key}")
    return keys


def load_paid_component_keys_for_employee(organization_id=None, employee_id=None,
                                          exclude_payroll_id=None):
    """Paid component keys from this employee's existing payroll runs.

    Legacy signature ``(organizationId, employeeId, PayrollRunModel, excludePayrollId)``;
    the Mongoose model parameter is dropped — the Django ``PayrollRun`` model is used.
    ``organization_id`` / ``employee_id`` may be ids or model instances.
    """
    if not js_truthy(organization_id) or not js_truthy(employee_id):
        return set()
    from ..models import PayrollRun

    qs = PayrollRun.objects.filter(org=organization_id, employee=employee_id)
    if js_truthy(exclude_payroll_id):
        qs = qs.exclude(pk=exclude_payroll_id)
    runs = [{"earnings": e, "deductions": d, "benefits": b}
            for e, d, b in qs.values_list("earnings", "deductions", "benefits")]
    return collect_paid_component_keys_from_payroll_runs(runs)


def read_override_amount_from_item(item=UNDEFINED):
    item = _dflt(item, {})
    if isinstance(item, dict) and js_truthy(item.get("_doc", UNDEFINED)):
        doc = item["_doc"]
        plain = dict(doc) if isinstance(doc, dict) else {}
    else:
        plain = item if js_truthy(item) else {}
    if not isinstance(plain, dict):
        plain = {}
    for key in OVERRIDE_AMOUNT_KEYS:
        if key not in plain:
            continue
        raw = plain[key]
        if is_nullish(raw):
            continue
        if js_trim(js_str(raw)) == "":
            continue
        num = to_number(raw)
        return {"hasExplicitOverride": True,
                "overrideAmount": js_out(num) if math.isfinite(num) else None}
    return {"hasExplicitOverride": False, "overrideAmount": None}


def has_explicit_override_amount(override=UNDEFINED):
    if not js_truthy(override) or js_truthy(js_get(override, "disabled")):
        return False
    explicit = js_get(override, "hasExplicitOverride")
    if is_nullish(explicit):
        explicit = not is_nullish(js_get(override, "overrideAmount"))
    if not js_truthy(explicit):
        return False
    return is_finite(js_get(override, "overrideAmount"))


def should_include_component_in_breakdown(amount=UNDEFINED, override=UNDEFINED):
    if js_truthy(js_opt(override, "disabled")):
        return False
    return True


def _normalize_overrides(raw_overrides):
    if not isinstance(raw_overrides, list):
        return []
    out = []
    for item in raw_overrides:
        category = js_trim(js_str(js_or(js_opt(item, "category"), ""))).lower()
        if category not in COMPONENT_CATEGORIES:
            continue
        code = normalize_component_key(js_or(js_opt(item, "code"), js_opt(item, "componentCode"), ""))
        name = js_trim(js_str(js_or(js_opt(item, "name"), js_opt(item, "componentName"), "")))
        amount = read_override_amount_from_item(item)
        out.append({
            "category": category,
            "code": code or normalize_component_key(name),
            "name": name,
            "overrideAmount": amount["overrideAmount"],
            "hasExplicitOverride": amount["hasExplicitOverride"],
            "disabled": js_truthy(js_opt(item, "disabled")),
        })
    return [o for o in out
            if not (o["category"] == "earnings"
                    and (o["code"] in ("special", "special allowance")
                         or normalize_component_key(o["name"]) == "special allowance"))]


def normalize_overrides(raw_overrides=UNDEFINED):
    return js_out(_normalize_overrides(_dflt(raw_overrides, [])))


def _find_component_override(overrides, category, component):
    lst = _normalize_overrides(overrides)
    code_key = normalize_component_key(js_get(component, "code"))
    name_key = normalize_component_key(js_get(component, "name"))
    for o in lst:
        if js_strict_eq(o["category"], category) and (
                (code_key and o["code"] == code_key)
                or (name_key and normalize_component_key(o["name"]) == name_key)
                or (name_key and o["code"] == name_key)
                or (code_key and normalize_component_key(o["name"]) == code_key)):
            return o
    return None


def find_component_override(overrides=UNDEFINED, category=UNDEFINED, component=UNDEFINED):
    return js_out(_find_component_override(_dflt(overrides, []), category, _dflt(component, {})))


def _calculate_component_amount(component, salary_bases, override):
    if js_truthy(js_opt(override, "disabled")):
        return 0
    base_salary = _n0(js_get(salary_bases, "baseSalary"))
    gross = _n0(js_get(salary_bases, "grossSalary"))
    ctc = _n0(js_get(salary_bases, "ctc"))
    if has_explicit_override_amount(override):
        return js_max(0, js_get(override, "overrideAmount"))
    amount = 0
    calculation_type = js_or(js_get(component, "calculationType"), "fixed")
    component_value = _n0(js_get(component, "value"))
    if js_strict_eq(calculation_type, "fixed") or js_strict_eq(calculation_type, "variable"):
        amount = component_value
    elif js_strict_eq(calculation_type, "percentage"):
        based_on = js_get(component, "basedOn")
        if js_strict_eq(based_on, "basic"):
            amount = (base_salary * component_value) / 100
        elif js_strict_eq(based_on, "gross"):
            amount = (gross * component_value) / 100
        elif js_strict_eq(based_on, "ctc"):
            amount = (ctc * component_value) / 100
    else:
        amount = 0
    max_limit = _n0(js_get(component, "maxLimit"))
    if max_limit > 0 and amount > max_limit:
        amount = max_limit
    return js_max(0, amount)


def calculate_component_amount(component=UNDEFINED, salary_bases=UNDEFINED, override=None):
    return js_out(_calculate_component_amount(_dflt(component, {}), _dflt(salary_bases, {}),
                                              override))


def build_component_line(category=UNDEFINED, component=UNDEFINED, salary_bases=UNDEFINED,
                         overrides=UNDEFINED, payroll_month=None):
    overrides = _dflt(overrides, [])
    override = _find_component_override(overrides, category, component)
    default_amount = _calculate_component_amount(component, salary_bases, None)
    final_amount = _calculate_component_amount(component, salary_bases, override)
    is_overridden = has_explicit_override_amount(override)
    amounts = get_frequency_display_amounts(component, final_amount, payroll_month)
    frequency = normalize_component_frequency(js_get(component, "frequency"))
    return js_out({
        "category": category,
        "name": js_or(js_get(component, "name"), ""),
        "code": js_or(js_get(component, "code"), ""),
        "calculationType": js_or(js_get(component, "calculationType"), "fixed"),
        "basedOn": js_or(js_get(component, "basedOn"), "none"),
        "orgValue": _n0(js_get(component, "value")),
        "frequency": frequency,
        "paymentMonth": js_or(js_get(component, "paymentMonth"), ""),
        "defaultMonthlyAmount": js_round(default_amount),
        "overrideAmount": js_round(final_amount) if is_overridden else None,
        "monthlyAmount": amounts["monthlyAmount"],
        "annualAmount": amounts["annualAmount"],
        "isOverridden": is_overridden,
        "disabled": js_truthy(js_opt(override, "disabled")),
        "taxable": js_get(component, "taxable") is not False,
        "considerForEPF": is_basic_salary_component(component)
        or js_truthy(js_get(component, "considerForEPF")),
        "considerForESI": is_basic_salary_component(component)
        or js_truthy(js_get(component, "considerForESI")),
        "status": js_or(js_get(component, "status"), "active"),
    })


def build_basic_earnings_line(basic_component=UNDEFINED, resolved_base=UNDEFINED,
                              salary_bases=UNDEFINED, overrides=UNDEFINED, payroll_month=None):
    salary_bases = _dflt(salary_bases, {})
    overrides = _dflt(overrides, [])
    base_salary = js_round(js_max(0, _n0(resolved_base)))
    override = (_find_component_override(overrides, "earnings", basic_component)
                if js_truthy(basic_component) else None)
    is_overridden = has_explicit_override_amount(override)
    gross_anchor = js_or(_n0(js_get(salary_bases, "grossSalary")), base_salary)
    bases = {"baseSalary": base_salary, "grossSalary": gross_anchor, "ctc": gross_anchor * 12}

    if js_truthy(basic_component):
        default_amount = _calculate_component_amount(basic_component, bases, None)
        final_amount = js_get(override, "overrideAmount") if is_overridden else base_salary
        amounts = get_frequency_display_amounts(basic_component, final_amount, payroll_month)
        return js_out({
            "category": "earnings",
            "name": js_or(js_get(basic_component, "name"), "Basic"),
            "code": js_or(js_get(basic_component, "code"), "basic"),
            "calculationType": js_or(js_get(basic_component, "calculationType"), "fixed"),
            "basedOn": js_or(js_get(basic_component, "basedOn"), "none"),
            "orgValue": _n0(js_get(basic_component, "value")),
            "frequency": normalize_component_frequency(js_get(basic_component, "frequency")),
            "paymentMonth": js_or(js_get(basic_component, "paymentMonth"), ""),
            "defaultMonthlyAmount": js_round(default_amount),
            "overrideAmount": js_round(to_number(final_amount)) if is_overridden else None,
            "monthlyAmount": amounts["monthlyAmount"],
            "annualAmount": amounts["annualAmount"],
            "isOverridden": is_overridden,
            "disabled": js_truthy(js_opt(override, "disabled")),
            "taxable": js_get(basic_component, "taxable") is not False,
            "considerForEPF": True,
            "considerForESI": True,
            "isBasic": True,
        })

    return js_out({
        "category": "earnings",
        "name": "Basic Salary",
        "code": "BASIC",
        "calculationType": "fixed",
        "basedOn": "none",
        "orgValue": base_salary,
        "defaultMonthlyAmount": base_salary,
        "overrideAmount": None,
        "monthlyAmount": base_salary,
        "annualAmount": base_salary * 12,
        "isOverridden": False,
        "disabled": False,
        "taxable": True,
        "considerForEPF": True,
        "considerForESI": True,
        "isBasic": True,
    })


def _resolve_payroll_component_amount(category, component, salary_bases, overrides):
    override = _find_component_override(overrides, category, component)
    if js_truthy(js_opt(override, "disabled")):
        return 0
    return _calculate_component_amount(component, salary_bases, override)


def resolve_payroll_component_amount(category=UNDEFINED, component=UNDEFINED,
                                     salary_bases=UNDEFINED, overrides=UNDEFINED):
    return js_out(_resolve_payroll_component_amount(category, component, salary_bases,
                                                    _dflt(overrides, [])))


def build_payroll_earnings_breakdown(salary_components=UNDEFINED, resolved_base=UNDEFINED,
                                     overrides=UNDEFINED, payroll_month=None, input_mode="basic",
                                     target_gross=None):
    salary_components = _dflt(salary_components, [])
    overrides = _dflt(overrides, [])
    effective_overrides = _normalize_overrides(overrides)

    active = get_active_earnings_components(salary_components)
    basic_component, other_components = active["basicComponent"], active["otherComponents"]
    gross_anchor = js_nc(target_gross, resolved_base)
    basic_line = build_basic_earnings_line(
        basic_component, resolved_base,
        {"baseSalary": resolved_base, "grossSalary": gross_anchor, "ctc": js_mul(gross_anchor, 12)},
        effective_overrides, payroll_month)

    earnings_breakdown = []
    if not basic_line["disabled"]:
        earnings_breakdown.append({
            "name": basic_line["name"],
            "code": js_or(basic_line.get("code", UNDEFINED), ""),
            "type": basic_line["calculationType"],
            "value": basic_line["orgValue"],
            "basedOn": js_or(basic_line.get("basedOn", UNDEFINED), "none"),
            "frequency": js_or(basic_line.get("frequency", UNDEFINED), "monthly"),
            "paymentMonth": js_or(basic_line.get("paymentMonth", UNDEFINED), ""),
            "defaultAmount": basic_line["defaultMonthlyAmount"],
            "calculatedAmount": basic_line["monthlyAmount"],
            "annualAmount": basic_line["annualAmount"],
            "isOverridden": basic_line["isOverridden"],
            "disabled": basic_line["disabled"],
            "taxable": basic_line["taxable"] is not False,
            "considerForEPF": js_truthy(basic_line["considerForEPF"]) or js_truthy(basic_line["isBasic"]),
            "considerForESI": js_truthy(basic_line["considerForESI"]) or js_truthy(basic_line["isBasic"]),
            "isBasic": True,
        })

    running_gross = 0 if basic_line["disabled"] else basic_line["monthlyAmount"]
    total_earnings = running_gross

    for component in other_components:
        salary_bases = {
            "baseSalary": resolved_base,
            "grossSalary": target_gross if (js_strict_eq(input_mode, "gross")
                                            and js_truthy(target_gross)) else running_gross,
            "ctc": js_mul(js_or(target_gross, running_gross), 12),
        }
        override = _find_component_override(effective_overrides, "earnings", component)
        default_amount = _calculate_component_amount(component, salary_bases, None)
        amount = _resolve_payroll_component_amount("earnings", component, salary_bases,
                                                   effective_overrides)
        amounts = get_frequency_display_amounts(component, amount, payroll_month)
        monthly_amount, annual_amount = amounts["monthlyAmount"], amounts["annualAmount"]
        is_overridden = has_explicit_override_amount(override)
        if should_include_component_in_breakdown(amount, override):
            if amount > 0:
                running_gross += monthly_amount
                total_earnings += monthly_amount
            earnings_breakdown.append({
                "name": js_get(component, "name"),
                "code": js_or(js_get(component, "code"), ""),
                "type": js_get(component, "calculationType"),
                "value": js_get(component, "value"),
                "basedOn": js_or(js_get(component, "basedOn"), "none"),
                "frequency": normalize_component_frequency(js_get(component, "frequency")),
                "paymentMonth": js_or(js_get(component, "paymentMonth"), ""),
                "defaultAmount": js_round(default_amount),
                "calculatedAmount": js_round(monthly_amount),
                "annualAmount": js_round(annual_amount),
                "isOverridden": is_overridden,
                "disabled": js_truthy(js_opt(override, "disabled")),
                "taxable": js_get(component, "taxable") is not False,
                "considerForEPF": js_truthy(js_get(component, "considerForEPF")),
                "considerForESI": js_truthy(js_get(component, "considerForESI")),
            })

    gross_salary = running_gross
    if js_strict_eq(input_mode, "gross") and target_gross is not None:
        balancing_line = build_balancing_allowance_line(js_sub(target_gross, gross_salary))
        if balancing_line:
            earnings_breakdown.append(balancing_line)
            total_earnings = total_earnings + balancing_line["calculatedAmount"]
        gross_salary = target_gross

    return js_out({
        "earningsBreakdown": earnings_breakdown,
        "basicLine": basic_line,
        "grossSalary": gross_salary,
        "totalEarnings": total_earnings,
        "resolvedBase": 0 if basic_line["disabled"] else basic_line["monthlyAmount"],
    })


def build_salary_structure_preview(salary_components=UNDEFINED, salary_bases=UNDEFINED,
                                   overrides=UNDEFINED, payroll_month=None):
    salary_components = _dflt(salary_components, [])
    salary_bases = _dflt(salary_bases, {})
    overrides = _dflt(overrides, [])
    result = {
        "earnings": [],
        "deductions": [],
        "benefits": [],
        "reimbursements": [],
        "totals": {
            "earningsMonthly": 0,
            "earningsAnnual": 0,
            "deductionsMonthly": 0,
            "benefitsMonthly": 0,
            "benefitsAnnual": 0,
        },
    }
    totals = result["totals"]
    base_salary = _n0(js_get(salary_bases, "baseSalary"))
    input_gross = _n0(js_get(salary_bases, "grossSalary"))
    active = get_active_earnings_components(salary_components)
    basic_component, other_components = active["basicComponent"], active["otherComponents"]
    basic_line = build_basic_earnings_line(
        basic_component, base_salary,
        {"baseSalary": base_salary, "grossSalary": js_or(input_gross, base_salary),
         "ctc": js_get(salary_bases, "ctc")},
        overrides, payroll_month)

    if not basic_line["disabled"]:
        result["earnings"].append(basic_line)
        if should_count_toward_monthly_totals(js_or(basic_component, {"frequency": "monthly"})):
            totals["earningsMonthly"] += basic_line["monthlyAmount"]

    running_gross = 0 if basic_line["disabled"] else basic_line["monthlyAmount"]

    for component in other_components:
        bases = {**salary_bases, "baseSalary": base_salary,
                 "grossSalary": js_or(input_gross, running_gross)} \
            if isinstance(salary_bases, dict) else \
            {"baseSalary": base_salary, "grossSalary": js_or(input_gross, running_gross)}
        line = build_component_line("earnings", component, bases, overrides, payroll_month)
        if not line["disabled"]:
            if should_count_toward_monthly_totals(component):
                running_gross += line["monthlyAmount"]
                totals["earningsMonthly"] += line["monthlyAmount"]
            result["earnings"].append(line)

    resolved_gross = js_or(input_gross, running_gross)
    bases_with_gross = ({**salary_bases} if isinstance(salary_bases, dict) else {})
    bases_with_gross.update({"baseSalary": base_salary, "grossSalary": resolved_gross})

    for category in ("deductions", "benefits", "reimbursements"):
        doc = _find(salary_components, lambda c, cat=category: js_strict_eq(js_get(c, "category"), cat))
        if not js_truthy(js_opt(doc, "components")):
            continue
        for component in _filter(js_get(doc, "components"),
                                 lambda c: js_strict_eq(js_get(c, "status"), "active")):
            line = build_component_line(category, component, bases_with_gross, overrides,
                                        payroll_month)
            if not line["disabled"]:
                result[category].append(line)
                if should_count_toward_monthly_totals(component):
                    if category == "deductions":
                        totals["deductionsMonthly"] += line["monthlyAmount"]
                    if category == "benefits":
                        totals["benefitsMonthly"] += line["monthlyAmount"]

    earnings_annual = 0
    for line in result["earnings"]:
        earnings_annual = earnings_annual + _n0(line.get("annualAmount", UNDEFINED))
    totals["earningsAnnual"] = earnings_annual
    benefits_annual = 0
    for line in result["benefits"]:
        benefits_annual = benefits_annual + _n0(line.get("annualAmount", UNDEFINED))
    totals["benefitsAnnual"] = benefits_annual
    totals["grossSalaryMonthly"] = js_round(to_number(resolved_gross))
    totals["ctcAnnual"] = js_round(to_number(js_or(_n0(js_get(salary_bases, "ctc")),
                                                   totals["earningsAnnual"])))
    return js_out(result)


def compute_monthly_gross_from_basic(base_salary=UNDEFINED, salary_components=UNDEFINED,
                                     overrides=UNDEFINED, payroll_month=None):
    """Forward monthly gross from basic — mirrors calculatePayrollInfo earnings loop."""
    salary_components = _dflt(salary_components, [])
    overrides = _dflt(overrides, [])
    basic = js_max(0, _n0(base_salary))
    running_gross = basic
    other_components = get_active_earnings_components(salary_components)["otherComponents"]
    if len(other_components) == 0:
        return js_out({"grossSalary": basic, "additionalMonthly": 0})
    for component in other_components:
        salary_bases = {"baseSalary": basic, "grossSalary": running_gross,
                        "ctc": running_gross * 12}
        override = _find_component_override(overrides, "earnings", component)
        amount = _resolve_payroll_component_amount("earnings", component, salary_bases, overrides)
        monthly_amount = get_frequency_display_amounts(component, amount,
                                                       payroll_month)["monthlyAmount"]
        if should_include_component_in_breakdown(amount, override) and amount > 0:
            running_gross += monthly_amount
    return js_out({"grossSalary": running_gross, "additionalMonthly": running_gross - basic})


def derive_basic_from_target_gross(target_gross=UNDEFINED, salary_components=UNDEFINED,
                                   overrides=UNDEFINED, payroll_month=None):
    """Fallback: derive basic when admin rule is % of basic (binary search)."""
    salary_components = _dflt(salary_components, [])
    overrides = _dflt(overrides, [])
    target = js_round(js_max(0, _n0(target_gross)))
    if target <= 0:
        return {"baseSalary": 0, "computedGross": 0}

    def forward(basic):
        return compute_monthly_gross_from_basic(basic, salary_components, overrides,
                                                payroll_month)["grossSalary"]

    other_components = get_active_earnings_components(salary_components)["otherComponents"]
    if len(other_components) == 0:
        return js_out({"baseSalary": target, "computedGross": target})

    low = 0
    high = target
    while forward(high) < target and high < target * 20:
        high = js_min(target * 20, js_max(high + 1, high * 2))

    best_basic = target
    best_gross = forward(target)
    best_diff = abs(best_gross - target)

    for _ in range(64):
        mid = js_round((low + high) / 2)
        gross = forward(mid)
        diff = abs(gross - target)
        if diff < best_diff:
            best_diff = diff
            best_basic = mid
            best_gross = gross
        if gross < target:
            low = mid + 1
        elif gross > target:
            high = mid - 1
        else:
            return js_out({"baseSalary": mid, "computedGross": gross})
        if low > high:
            break
    return js_out({"baseSalary": best_basic, "computedGross": best_gross})


def resolve_basic_amount_from_gross(target_gross=UNDEFINED, basic_component=UNDEFINED,
                                    salary_components=UNDEFINED, overrides=UNDEFINED,
                                    payroll_month=None):
    """Resolve Basic from gross using admin Basic component rule."""
    salary_components = _dflt(salary_components, [])
    overrides = _dflt(overrides, [])
    target = js_round(js_max(0, _n0(target_gross)))
    if target <= 0:
        return {"baseSalary": 0, "computedGross": 0}

    def with_amount(amount):
        basic = js_round(js_max(0, _n0(amount)))
        return js_out({
            "baseSalary": basic,
            "computedGross": compute_monthly_gross_from_basic(
                basic, salary_components, overrides, payroll_month)["grossSalary"],
        })

    if js_truthy(basic_component):
        calc_type = js_or(js_get(basic_component, "calculationType"), "fixed")
        based_on = js_or(js_get(basic_component, "basedOn"), "none")
        value = _n0(js_get(basic_component, "value"))
        if js_strict_eq(calc_type, "percentage") and js_strict_eq(based_on, "gross"):
            return with_amount((target * value) / 100)
        if js_strict_eq(calc_type, "fixed") or js_strict_eq(calc_type, "variable"):
            return with_amount(value)
        if js_strict_eq(calc_type, "percentage") and js_strict_eq(based_on, "ctc"):
            return with_amount((target * 12 * value) / 100 / 12)

    return derive_basic_from_target_gross(target, salary_components, overrides, payroll_month)


def resolve_salary_bases_from_input(base_salary=UNDEFINED, gross_salary=UNDEFINED,
                                    salary_components=UNDEFINED, overrides=UNDEFINED,
                                    payroll_month=None):
    salary_components = _dflt(salary_components, [])
    overrides = _dflt(overrides, [])
    base_input = js_round(js_max(0, _n0(base_salary)))
    gross_input = js_round(js_max(0, _n0(gross_salary)))

    if gross_input > 0:
        basic_component = get_active_earnings_components(salary_components)["basicComponent"]
        normalized = _normalize_overrides(overrides)
        if js_truthy(basic_component):
            basic_override = _find_component_override(normalized, "earnings", basic_component)
        else:
            basic_override = _find_component_override(normalized, "earnings",
                                                       {"name": "Basic Salary", "code": "BASIC"})
        has_explicit_basic = (has_explicit_override_amount(basic_override)
                              and not js_truthy(js_opt(basic_override, "disabled")))
        if has_explicit_basic:
            base = js_round(js_max(0, _n0(basic_override["overrideAmount"])))
            return js_out({
                "inputMode": "gross",
                "baseSalary": base,
                "targetGross": gross_input,
                "computedGrossBeforeBalancing": compute_monthly_gross_from_basic(
                    base, salary_components, normalized, payroll_month)["grossSalary"],
                "overridesForCalc": normalized,
            })
        overrides_for_gross = strip_basic_from_overrides(normalized)
        derived = resolve_basic_amount_from_gross(
            target_gross=gross_input, basic_component=basic_component,
            salary_components=salary_components, overrides=overrides_for_gross,
            payroll_month=payroll_month)
        return js_out({
            "inputMode": "gross",
            "baseSalary": derived["baseSalary"],
            "targetGross": gross_input,
            "computedGrossBeforeBalancing": derived["computedGross"],
            "overridesForCalc": overrides_for_gross,
        })

    if base_input > 0:
        return js_out({
            "inputMode": "basic",
            "baseSalary": base_input,
            "targetGross": None,
            "computedGrossBeforeBalancing": None,
            "overridesForCalc": _normalize_overrides(overrides),
        })
    return None


def build_balancing_allowance_line(balancing_amount=UNDEFINED):
    amount = js_round(to_number(balancing_amount))
    if amount == 0:
        return None
    return js_out({
        "name": "Other Extra Allowance",
        "code": "OTHER_EXTRA",
        "type": "fixed",
        "value": amount,
        "basedOn": "none",
        "frequency": "monthly",
        "paymentMonth": "",
        "defaultAmount": amount,
        "calculatedAmount": amount,
        "annualAmount": amount * 12,
        "isOverridden": False,
        "disabled": False,
        "taxable": True,
        "considerForEPF": False,
        "considerForESI": False,
        "isBalancing": True,
    })


def _find_override_index(lst, item):
    code_key = normalize_component_key(js_get(item, "code"))
    name_key = normalize_component_key(js_get(item, "name"))
    for i, o in enumerate(lst):
        if js_strict_eq(o["category"], js_get(item, "category")) and (
                (code_key and o["code"] == code_key)
                or (name_key and normalize_component_key(o["name"]) == name_key)
                or (code_key and normalize_component_key(o["name"]) == code_key)):
            return i
    return -1


def _merge_component_overrides(saved, incoming):
    merged = list(_normalize_overrides(saved))
    for item in _normalize_overrides(incoming):
        idx = _find_override_index(merged, item)
        if idx >= 0:
            if item["hasExplicitOverride"]:
                merged[idx]["overrideAmount"] = item["overrideAmount"]
                merged[idx]["hasExplicitOverride"] = True
            merged[idx]["disabled"] = item["disabled"]
            if item["name"]:
                merged[idx]["name"] = item["name"]
            if item["code"]:
                merged[idx]["code"] = item["code"]
        elif item["hasExplicitOverride"] or item["disabled"]:
            merged.append(item)
    return merged


def merge_component_overrides(saved=UNDEFINED, incoming=UNDEFINED):
    return js_out(_merge_component_overrides(_dflt(saved, []), _dflt(incoming, [])))


def resolve_revision_component_overrides(body_overrides=UNDEFINED, new_salary_overrides=UNDEFINED,
                                         employee_overrides=UNDEFINED):
    employee = _normalize_overrides(js_or(employee_overrides, []))
    incoming_raw = []
    if isinstance(body_overrides, list) and len(body_overrides) > 0:
        incoming_raw.extend(body_overrides)
    elif isinstance(new_salary_overrides, list) and len(new_salary_overrides) > 0:
        incoming_raw.extend(new_salary_overrides)
    if not incoming_raw:
        return js_out(employee)

    incoming = _normalize_overrides(incoming_raw)
    incoming_earnings_explicit = any(o["category"] == "earnings" and o["hasExplicitOverride"]
                                     for o in incoming)
    employee_earnings_explicit = any(o["category"] == "earnings" and o["hasExplicitOverride"]
                                     for o in employee)
    if not incoming_earnings_explicit and employee_earnings_explicit:
        incoming_non_earnings = [o for o in incoming if o["category"] != "earnings"]
        return js_out(_merge_component_overrides(employee, incoming_non_earnings))
    if not any(o["hasExplicitOverride"] for o in incoming):
        return js_out(employee)
    return js_out(_merge_component_overrides(employee, incoming))


def to_stored_overrides(overrides=UNDEFINED):
    return js_out([
        {"category": o["category"], "code": o["code"], "name": o["name"],
         "overrideAmount": o["overrideAmount"], "disabled": o["disabled"]}
        for o in _normalize_overrides(_dflt(overrides, []))
    ])


def sanitize_salary_component(component=UNDEFINED):
    component = _dflt(component, {})
    sanitized = dict(component) if isinstance(component, dict) else {}
    frequency = normalize_component_frequency(sanitized.get("frequency", UNDEFINED))
    if frequency == "monthly":
        sanitized["paymentMonth"] = ""
    elif not js_truthy(sanitized.get("paymentMonth", UNDEFINED)):
        sanitized["paymentMonth"] = ""
    if is_basic_salary_component(sanitized):
        sanitized["considerForEPF"] = True
        sanitized["considerForESI"] = True
    return js_out(sanitized)


def get_compliance_flags(component=UNDEFINED):
    """Copy Taxable / EPF / ESI ticks onto payroll earning lines."""
    component = _dflt(component, {})
    is_basic = is_basic_salary_component({
        "name": js_or(js_get(component, "name"), js_get(component, "componentName")),
        "code": js_get(component, "code"),
    })
    return {
        "taxable": js_get(component, "taxable") is not False,
        "considerForEPF": is_basic or js_truthy(js_get(component, "considerForEPF")),
        "considerForESI": is_basic or js_truthy(js_get(component, "considerForESI")),
    }


def add_payroll_component_line(target_array=UNDEFINED, category=UNDEFINED, component=UNDEFINED,
                               salary_bases=UNDEFINED, overrides=UNDEFINED,
                               payroll_month=UNDEFINED, paid_component_keys=UNDEFINED):
    """Append the payroll line for an active, due, positive component to ``target_array``
    (mutated in place, like the legacy) and return its amount (0 when skipped)."""
    if not js_strict_eq(js_get(component, "status"), "active"):
        return 0
    if not should_include_salary_component(component, category, payroll_month,
                                           paid_component_keys):
        return 0
    amount = _resolve_payroll_component_amount(category, component, salary_bases,
                                               _dflt(overrides, []))
    if amount <= 0:
        return 0
    line = {
        "componentName": js_get(component, "name"),
        "amount": amount,
        "calculationType": js_get(component, "calculationType"),
        "componentId": js_get(component, "_id"),
        **get_compliance_flags(component),
    }
    if js_strict_eq(category, "benefits"):
        line["calculateOnProRata"] = js_truthy(js_get(component, "calculateOnProRata"))
    target_array.append(js_out(line))
    return js_out(amount)
