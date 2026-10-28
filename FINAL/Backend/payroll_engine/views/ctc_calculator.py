"""Port of ``controller/payroll/ctcCalculator.js`` (CTC / gross / take-home calculators).

The calculations live in pure functions (``ctc_from_gross``, ``gross_from_ctc``,
``build_structure``, ``take_home``) taking the request body plus the org's compliance /
TDS config dicts, so they are differential-tested against the legacy handlers.
JS coercion is kept (body values may be numeric strings); NaN/Infinity render as
``null`` like ``JSON.stringify``.
"""

import math

from ..context import PayrollError, payroll_view, send_response
from ..models import StatutoryCompliance, TDSConfig
from ..services.jsmath import (UNDEFINED, js_add, js_div, js_gt, js_le, js_min, js_mul, js_or,
                               js_round, js_strict_eq, js_sub, js_truthy, to_number)
from ..services.statutory_calculator import (calculate_epf, calculate_esi, calculate_lwf,
                                             calculate_professional_tax,
                                             calculate_statutory_bonus,
                                             resolve_lwf_deductions_per_year)


def jsonable(value):
    """``JSON.parse(JSON.stringify(value))`` for computed results."""
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items() if v is not UNDEFINED}
    if isinstance(value, (list, tuple)):
        return [None if v is UNDEFINED else jsonable(v) for v in value]
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return int(value) if value.is_integer() else value
    return value


def _mround(x):
    return js_round(to_number(x))


def _sec(compliance, key):
    """``compliance?.<key>``."""
    if not compliance:
        return UNDEFINED
    return compliance.get(key, UNDEFINED)


def _or0(x):
    """``x || 0``."""
    return x if js_truthy(x) else 0


def _invalid_amount(v):
    """``!v || v <= 0``."""
    return not js_truthy(v) or js_le(v, 0)


def ctc_from_gross(gross_salary, compliance):
    basic_salary = js_mul(gross_salary, 0.4)
    epf = calculate_epf(epf_config=_sec(compliance, "epf"), base_salary=basic_salary,
                        epf_applicable_wage=basic_salary)
    epf_employer, epf_edli, epf_admin = (epf["employerContribution"], epf["edliContribution"],
                                         epf["adminCharges"])
    esi = calculate_esi(esi_config=_sec(compliance, "esi"), gross_salary=gross_salary,
                        esi_applicable_wage=gross_salary)
    esi_employer = esi["employerContribution"] if js_truthy(esi["includeEmployerInCtc"]) else 0
    bonus = calculate_statutory_bonus(bonus_config=_sec(compliance, "statutoryBonus"),
                                      basic_plus_da=basic_salary, paid_days=None, total_days=None)
    details = bonus.get("details") or {}
    annual_bonus = _or0(details.get("annualEquivalent", UNDEFINED))
    monthly_bonus = _or0(details.get("monthlyEquivalent", UNDEFINED))
    lwf_config = _sec(compliance, "labourWelfareFund")
    lwf = calculate_lwf(lwf_config=lwf_config, gross_salary=gross_salary)
    lwf_cfg_arg = None if lwf_config is UNDEFINED else lwf_config
    annual_lwf_employer = js_mul(_or0(lwf["employerShare"]),
                                 resolve_lwf_deductions_per_year(lwf, lwf_cfg_arg))
    gratuity = js_div(js_mul(basic_salary, 4.81), 100)
    annual_gross = js_mul(gross_salary, 12)
    monthly_employer = js_add(js_add(js_add(js_add(epf_employer, epf_edli), epf_admin),
                                     esi_employer), gratuity)
    annual_employer = js_add(js_add(js_mul(monthly_employer, 12), annual_bonus),
                             annual_lwf_employer)
    ctc = js_add(annual_gross, annual_employer)
    return jsonable({
        "monthlyGross": gross_salary,
        "annualGross": annual_gross,
        "employerContributions": {
            "monthly": {
                "epf": _mround(epf_employer),
                "edli": _mround(epf_edli),
                "adminCharges": _mround(epf_admin),
                "esi": _mround(esi_employer),
                "gratuity": _mround(gratuity),
                "statutoryBonus": _mround(monthly_bonus),
                "lwf": _mround(_or0(lwf["employerShare"])),
                "total": _mround(monthly_employer),
            },
            "annual": _mround(annual_employer),
            "annualBonus": _mround(annual_bonus),
            "annualLwfEmployer": _mround(annual_lwf_employer),
        },
        "ctc": {"annual": _mround(ctc), "monthly": _mround(js_div(ctc, 12))},
    })


def gross_from_ctc(ctc):
    annual_gross = js_div(ctc, 1.25)
    monthly_gross = js_div(annual_gross, 12)
    return jsonable({
        "ctc": {"annual": _mround(ctc), "monthly": _mround(js_div(ctc, 12))},
        "gross": {"annual": _mround(annual_gross), "monthly": _mround(monthly_gross)},
        "components": {
            "basic": _mround(js_mul(monthly_gross, 0.4)),
            "hra": _mround(js_mul(monthly_gross, 0.4)),
            "otherAllowances": _mround(js_mul(monthly_gross, 0.2)),
        },
        "employerContributions": {
            "annual": _mround(js_sub(ctc, annual_gross)),
            "monthly": _mround(js_div(js_sub(ctc, annual_gross), 12)),
        },
    })


def build_structure(body, compliance):
    ctc = body.get("ctc", UNDEFINED)
    basic_pct = body.get("basicPercentage", UNDEFINED)
    basic_pct = 40 if basic_pct is UNDEFINED else basic_pct
    hra_pct = body.get("hraPercentage", UNDEFINED)
    hra_pct = 40 if hra_pct is UNDEFINED else hra_pct
    custom = body.get("customComponents", UNDEFINED)
    custom = [] if custom is UNDEFINED else custom
    state = js_or(body.get("state", UNDEFINED), None)

    annual_gross = js_div(ctc, 1.25)
    monthly_gross = js_div(annual_gross, 12)
    basic = js_div(js_mul(monthly_gross, basic_pct), 100)
    hra = js_div(js_mul(monthly_gross, hra_pct), 100)
    remaining = js_sub(js_sub(monthly_gross, basic), hra)

    earnings = [
        {"component": "Basic Salary", "amount": _mround(basic), "percentage": basic_pct},
        {"component": "HRA", "amount": _mround(hra), "percentage": hra_pct},
    ]
    if not isinstance(custom, list):
        raise PayrollError("customComponents.forEach is not a function", 500)
    custom_total = 0
    for comp in custom:
        if comp is None:
            raise PayrollError("Cannot read properties of null (reading 'amount')", 500)
        c = comp if isinstance(comp, dict) else {}
        amount = js_or(c.get("amount", UNDEFINED),
                       js_div(js_mul(remaining, c.get("percentage", UNDEFINED)), 100))
        earnings.append({"component": c.get("name", UNDEFINED), "amount": _mround(amount)})
        custom_total = js_add(custom_total, amount)
    if js_gt(js_sub(remaining, custom_total), 0):
        earnings.append({"component": "Other Extra Allowance",
                         "amount": _mround(js_sub(remaining, custom_total))})

    deductions = []
    epf = calculate_epf(epf_config=_sec(compliance, "epf"), base_salary=basic,
                        epf_applicable_wage=basic)
    if js_truthy(epf["applicable"]):
        deductions.append({"component": "EPF (Employee)", "amount": epf["employeeContribution"]})
        if js_gt(epf["employerContribution"], 0):
            deductions.append({"component": "EPF (Employer)",
                               "amount": epf["employerContribution"], "type": "employer"})
        if js_gt(epf["edliContribution"], 0):
            deductions.append({"component": "EDLI (Employer)",
                               "amount": epf["edliContribution"], "type": "employer"})
        if js_gt(epf["adminCharges"], 0):
            deductions.append({"component": "PF Admin Charges (Employer)",
                               "amount": epf["adminCharges"], "type": "employer"})
    esi = calculate_esi(esi_config=_sec(compliance, "esi"), gross_salary=monthly_gross,
                        esi_applicable_wage=monthly_gross)
    if js_truthy(esi["applicable"]):
        deductions.append({"component": "ESI (Employee)", "amount": esi["employeeContribution"]})
        if js_truthy(esi["includeEmployerInCtc"]) and js_gt(esi["employerContribution"], 0):
            deductions.append({"component": "ESI (Employer)",
                               "amount": esi["employerContribution"], "type": "employer"})
    pt = calculate_professional_tax(pt_config=_sec(compliance, "professionalTax"),
                                    gross_salary=monthly_gross, employee_state=state)
    if js_truthy(pt["applicable"]):
        deductions.append({"component": "Professional Tax", "amount": pt["amount"]})
    lwf = calculate_lwf(lwf_config=_sec(compliance, "labourWelfareFund"),
                        gross_salary=monthly_gross, employee_state=state)
    if js_truthy(lwf["applicable"]) and js_gt(lwf["employeeShare"], 0):
        deductions.append({"component": "Labour Welfare Fund", "amount": lwf["employeeShare"]})
        if js_gt(lwf["employerShare"], 0):
            deductions.append({"component": "Labour Welfare Fund (Employer)",
                               "amount": lwf["employerShare"], "type": "employer"})

    total_earnings = 0
    for e in earnings:
        total_earnings = js_add(total_earnings, e["amount"])
    total_emp = 0
    total_er = 0
    for d in deductions:
        if js_strict_eq(d.get("type", UNDEFINED), "employer"):
            total_er = js_add(total_er, d["amount"])
        else:
            total_emp = js_add(total_emp, d["amount"])
    net_pay = js_sub(total_earnings, total_emp)
    return jsonable({
        "ctc": _mround(ctc),
        "monthlyGross": _mround(monthly_gross),
        "earnings": earnings,
        "deductions": deductions,
        "summary": {
            "totalEarnings": _mround(total_earnings),
            "totalEmployeeDeductions": _mround(total_emp),
            "totalEmployerContributions": _mround(total_er),
            "netPay": _mround(net_pay),
        },
    })


def take_home(body, compliance, tds_config):
    ctc = body.get("ctc", UNDEFINED)
    tax_regime = body.get("taxRegime", UNDEFINED)
    tax_regime = "new" if tax_regime is UNDEFINED else tax_regime
    state = js_or(body.get("state", UNDEFINED), None)

    annual_gross = js_div(ctc, 1.25)
    monthly_gross = js_div(annual_gross, 12)
    basic = js_mul(monthly_gross, 0.4)
    monthly_deductions = 0
    epf = calculate_epf(epf_config=_sec(compliance, "epf"), base_salary=basic,
                        epf_applicable_wage=basic)
    if js_truthy(epf["applicable"]):
        monthly_deductions = js_add(monthly_deductions, epf["employeeContribution"])
    esi = calculate_esi(esi_config=_sec(compliance, "esi"), gross_salary=monthly_gross,
                        esi_applicable_wage=monthly_gross)
    if js_truthy(esi["applicable"]):
        monthly_deductions = js_add(monthly_deductions, esi["employeeContribution"])
    pt = calculate_professional_tax(pt_config=_sec(compliance, "professionalTax"),
                                    gross_salary=monthly_gross, employee_state=state)
    if js_truthy(pt["applicable"]):
        monthly_deductions = js_add(monthly_deductions, pt["amount"])

    monthly_tds = 0
    if tds_config:
        taxable_income = js_sub(annual_gross, 50000)
        slabs = (tds_config.get("newRegimeSlabs") if js_strict_eq(tax_regime, "new")
                 else tds_config.get("oldRegimeSlabs")) or []
        tax = 0
        for slab in slabs:
            if js_gt(taxable_income, slab.get("incomeFrom", UNDEFINED)):
                taxable = js_sub(js_min(taxable_income, slab.get("incomeTo", UNDEFINED)),
                                 slab.get("incomeFrom", UNDEFINED))
                tax = js_add(tax, js_div(js_mul(taxable, slab.get("taxRate", UNDEFINED)), 100))
        tax = js_mul(tax, 1.04)
        if js_le(taxable_income, 700000):
            t = to_number(tax) - 25000
            tax = float("nan") if math.isnan(t) else max(0.0, t)
        monthly_tds = js_div(tax, 12)

    monthly_take_home = js_sub(js_sub(monthly_gross, monthly_deductions), monthly_tds)
    annual_take_home = js_mul(monthly_take_home, 12)
    return jsonable({
        "ctc": _mround(ctc),
        "monthlyGross": _mround(monthly_gross),
        "annualGross": _mround(annual_gross),
        "deductions": {
            "monthly": {
                "epf": epf["employeeContribution"],
                "esi": esi["employeeContribution"],
                "professionalTax": pt["amount"],
                "tds": _mround(monthly_tds),
                "total": _mround(js_add(monthly_deductions, monthly_tds)),
            },
            "annual": _mround(js_mul(js_add(monthly_deductions, monthly_tds), 12)),
        },
        "takeHome": {"monthly": _mround(monthly_take_home), "annual": _mround(annual_take_home)},
    })


def _compliance(org):
    row = StatutoryCompliance.objects.filter(org=org).first()
    return row.to_dict() if row else None


@payroll_view(["POST"])
def calculate_ctc_from_gross(ctx):
    org = ctx.require_org()
    gross = ctx.body.get("grossSalary", UNDEFINED)
    if _invalid_amount(gross):
        raise PayrollError("Valid gross salary is required", 400)
    return send_response(200, True, "CTC calculated successfully",
                         ctc_from_gross(gross, _compliance(org)))


@payroll_view(["POST"])
def calculate_gross_from_ctc(ctx):
    ctx.require_org()
    ctc = ctx.body.get("ctc", UNDEFINED)
    if _invalid_amount(ctc):
        raise PayrollError("Valid CTC is required", 400)
    return send_response(200, True, "Gross calculated from CTC successfully", gross_from_ctc(ctc))


@payroll_view(["POST"])
def build_salary_structure(ctx):
    org = ctx.require_org()
    body = ctx.body
    if _invalid_amount(body.get("ctc", UNDEFINED)):
        raise PayrollError("Valid CTC is required", 400)
    return send_response(200, True, "Salary structure built successfully",
                         build_structure(body, _compliance(org)))


@payroll_view(["POST"])
def calculate_take_home(ctx):
    org = ctx.require_org()
    body = ctx.body
    if _invalid_amount(body.get("ctc", UNDEFINED)):
        raise PayrollError("Valid CTC is required", 400)
    tds = TDSConfig.objects.filter(org=org).order_by("created_at").first()
    return send_response(200, True, "Take-home calculated successfully",
                         take_home(body, _compliance(org), tds.to_dict() if tds else None))


ROUTES = [
    ("ctc/fromGross", calculate_ctc_from_gross, "ctc_from_gross"),
    ("ctc/fromCTC", calculate_gross_from_ctc, "ctc_from_ctc"),
    ("ctc/buildStructure", build_salary_structure, "ctc_build_structure"),
    ("ctc/takeHome", calculate_take_home, "ctc_take_home"),
]
