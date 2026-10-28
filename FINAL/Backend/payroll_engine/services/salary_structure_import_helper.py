"""Compute ``payrollInfo`` from a basic / gross salary input (bulk import + revisions).

Port of ``FINAL/legacy_payroll/utils/payroll/salaryStructureImportHelper.js`` (pure).

Exported (legacy name -> port):
    computePayrollInfoFromSalaryInput -> compute_payroll_info_from_salary_input
    computePayrollInfoFromBaseSalary  -> compute_payroll_info_from_base_salary

The legacy functions take one destructured object; the ports take the same fields as
snake_case keyword arguments. ``employee`` / ``salary_components`` /
``statutory_compliance`` are legacy-shaped dicts (``emp.to_dict()``, ``[c.to_dict()]``,
``compliance.to_dict()``). ``salaryEffectiveFrom`` is returned as given (default: now,
an aware ``datetime``).
"""

from datetime import datetime, timezone

from .jsmath import (UNDEFINED, is_nullish, js_opt, js_or, js_out, js_round, js_str, js_truthy,
                     num0, to_number)
from .salary_component_helper import (build_payroll_earnings_breakdown,
                                      get_frequency_display_amounts, normalize_overrides,
                                      resolve_payroll_component_amount,
                                      resolve_salary_bases_from_input, sum_basic_plus_da)
from .statutory_calculator import (build_net_pay_schedule, calculate_epf, calculate_esi,
                                   calculate_lwf, calculate_professional_tax,
                                   calculate_statutory_bonus, resolve_lwf_deductions_per_year,
                                   sum_consider_for_epf, sum_consider_for_esi)

TAX_REGIMES = ["Old", "New"]
PAYMENT_FREQUENCIES = ["Monthly", "Bi-Weekly", "Weekly"]


def _o(obj, key):
    return js_opt(obj, key) if not is_nullish(obj) else UNDEFINED


def build_revision_salary_components(resolved_base, earnings_breakdown=UNDEFINED):
    if earnings_breakdown is UNDEFINED:
        earnings_breakdown = []
    components = []
    for line in earnings_breakdown:
        amount = js_round(to_number(js_or(line.get("calculatedAmount", UNDEFINED), 0)))
        if amount > 0 and not js_truthy(line.get("isBalancing", UNDEFINED)):
            components.append({"componentName": line.get("name"), "amount": amount})
    if not components and to_number(resolved_base) > 0:
        components.append({"componentName": "Basic Salary",
                           "amount": js_round(to_number(resolved_base))})
    return components


def _fmt(n):
    return js_str(n)


def compute_payroll_info_from_salary_input(base_salary=UNDEFINED, gross_salary=UNDEFINED,
                                           state=UNDEFINED, employee=UNDEFINED,
                                           salary_components=UNDEFINED,
                                           statutory_compliance=UNDEFINED, tax_regime=UNDEFINED,
                                           payment_frequency=UNDEFINED,
                                           salary_effective_from=UNDEFINED, overrides=UNDEFINED,
                                           gross_salary_input=None, ctc_input=None):
    if gross_salary_input is UNDEFINED:
        gross_salary_input = None
    if ctc_input is UNDEFINED:
        ctc_input = None
    salary_components = salary_components if isinstance(salary_components, list) else []
    warnings = []
    payroll_info_e = _o(employee, "payrollInfo")
    statutory_info = _o(employee, "statutoryInfo")
    norm_overrides = normalize_overrides(
        js_or(overrides, _o(payroll_info_e, "componentOverrides"), []))
    resolved_state = js_or(state, _o(statutory_info, "lwfState"), _o(statutory_info, "ptState"), "")

    resolved_salary = resolve_salary_bases_from_input(
        base_salary=num0(base_salary), gross_salary=num0(gross_salary),
        salary_components=salary_components, overrides=norm_overrides)
    if not resolved_salary:
        return {"payrollInfo": None, "warnings": warnings, "components": [], "inputMode": None,
                "error": "baseSalary or grossSalary is required"}

    resolved_base = resolved_salary["baseSalary"]
    input_mode = resolved_salary["inputMode"]
    target_gross = resolved_salary.get("targetGross")
    calc_overrides = js_or(resolved_salary.get("overridesForCalc", UNDEFINED), norm_overrides)

    earnings_result = build_payroll_earnings_breakdown(
        salary_components=salary_components, resolved_base=resolved_base,
        overrides=calc_overrides, input_mode=input_mode, target_gross=target_gross)
    earnings = earnings_result["earningsBreakdown"]
    resolved_gross = earnings_result["grossSalary"]
    base_final = earnings_result["resolvedBase"]

    sc = statutory_compliance if js_truthy(statutory_compliance) else UNDEFINED
    total_deductions = 0

    epf = calculate_epf(epf_config=_o(sc, "epf"), base_salary=base_final,
                        epf_applicable_wage=sum_consider_for_epf(earnings, base_final),
                        employee_statutory_info=statutory_info)
    if js_truthy(epf.get("applicable")) and to_number(epf.get("employeeContribution")) > 0:
        total_deductions += epf["employeeContribution"]

    esi = calculate_esi(esi_config=_o(sc, "esi"), gross_salary=resolved_gross,
                        esi_applicable_wage=sum_consider_for_esi(earnings, resolved_gross),
                        employee_statutory_info=statutory_info)
    if js_truthy(esi.get("applicable")) and to_number(esi.get("employeeContribution")) > 0:
        total_deductions += esi["employeeContribution"]

    pt = calculate_professional_tax(pt_config=_o(sc, "professionalTax"), gross_salary=resolved_gross,
                                    employee_state=resolved_state,
                                    employee_statutory_info=statutory_info)
    cyclical = 0
    if js_truthy(pt.get("applicable")):
        total_deductions += pt["amount"]
        cyclical += pt["amount"]

    lwf = calculate_lwf(lwf_config=_o(sc, "labourWelfareFund"), gross_salary=resolved_gross,
                        employee_state=resolved_state, employee_statutory_info=statutory_info)
    if js_truthy(lwf.get("applicable")) and to_number(lwf.get("employeeShare")) > 0:
        total_deductions += lwf["employeeShare"]
        cyclical += lwf["employeeShare"]

    bonus = calculate_statutory_bonus(
        bonus_config=_o(sc, "statutoryBonus"), basic_plus_da=sum_basic_plus_da(earnings),
        employee_state=resolved_state,
        employee_employment_category=_o(statutory_info, "employmentCategory"),
        paid_days=None, total_days=None)

    bases = {"baseSalary": base_final, "grossSalary": resolved_gross, "ctc": resolved_gross * 12}
    deductions_component = next((c for c in salary_components
                                  if isinstance(c, dict) and c.get("category") == "deductions"), None)
    if deductions_component is not None and js_truthy(deductions_component.get("components")):
        for component in deductions_component["components"]:
            if component.get("status") != "active":
                continue
            amount = resolve_payroll_component_amount("deductions", component, bases, norm_overrides)
            monthly = get_frequency_display_amounts(component, amount, None)["monthlyAmount"]
            if to_number(amount) > 0:
                total_deductions += monthly

    total_benefits = 0
    benefits_component = next((c for c in salary_components
                               if isinstance(c, dict) and c.get("category") == "benefits"), None)
    if benefits_component is not None and js_truthy(benefits_component.get("components")):
        for component in benefits_component["components"]:
            if component.get("status") != "active":
                continue
            amount = resolve_payroll_component_amount("benefits", component, bases, norm_overrides)
            monthly = get_frequency_display_amounts(component, amount, None)["monthlyAmount"]
            if to_number(amount) > 0:
                total_benefits += monthly

    schedule = build_net_pay_schedule(
        gross_salary=resolved_gross, base_deductions=total_deductions - cyclical,
        pt_config=_o(sc, "professionalTax"), lwf_config=_o(sc, "labourWelfareFund"),
        employee_state=resolved_state, employee_statutory_info=statutory_info)
    net_pay = schedule["regular"]
    esi_employer = esi.get("employerContribution") if js_truthy(esi.get("includeEmployerInCtc")) else 0
    monthly_employer = (epf["employerContribution"] + epf["edliContribution"]
                        + epf["adminCharges"] + esi_employer)
    annual_lwf_employer = (to_number(js_or(lwf.get("employerShare"), 0))
                           * resolve_lwf_deductions_per_year(lwf, _o(sc, "labourWelfareFund")))
    annual_bonus = js_or(_o(_o(bonus, "details"), "annualEquivalent"), 0)
    monthly_ctc = resolved_gross + total_benefits + monthly_employer
    annual_ctc = monthly_ctc * 12 + annual_lwf_employer + to_number(annual_bonus)

    computed_gross = js_round(resolved_gross)
    computed_ctc = js_round(annual_ctc)
    if gross_salary_input is not None and abs(to_number(gross_salary_input) - computed_gross) > 1:
        warnings.append(f"Excel grossSalary ({_fmt(gross_salary_input)}) differs from calculated "
                        f"({_fmt(computed_gross)}); calculated value will be used")
    if ctc_input is not None and abs(to_number(ctc_input) - computed_ctc) > 1:
        warnings.append(f"Excel ctc ({_fmt(ctc_input)}) differs from calculated "
                        f"({_fmt(computed_ctc)}); calculated value will be used")

    resolved_regime = tax_regime if tax_regime in TAX_REGIMES else \
        js_or(_o(payroll_info_e, "taxRegime"), "New")
    resolved_freq = payment_frequency if payment_frequency in PAYMENT_FREQUENCIES else \
        js_or(_o(payroll_info_e, "paymentFrequency"), "Monthly")

    payroll_info = {
        "baseSalary": js_round(base_final),
        "grossSalary": computed_gross,
        "totalDeductions": schedule["regularDeductions"],
        "netPay": js_round(net_pay),
        "ctc": computed_ctc,
        "paymentFrequency": resolved_freq,
        "currency": js_or(_o(payroll_info_e, "currency"), "INR"),
        "taxRegime": resolved_regime,
        "variablePay": js_or(_o(payroll_info_e, "variablePay"), 0),
        "incentives": js_or(_o(payroll_info_e, "incentives"), 0),
        "salaryEffectiveFrom": js_or(salary_effective_from, datetime.now(timezone.utc)),
    }
    eff = payroll_info["salaryEffectiveFrom"]
    out = js_out({
        "payrollInfo": {k: v for k, v in payroll_info.items() if k != "salaryEffectiveFrom"},
        "netPaySchedule": schedule,
        "warnings": warnings,
        "components": build_revision_salary_components(base_final, earnings),
        "inputMode": input_mode,
    })
    out["payrollInfo"]["salaryEffectiveFrom"] = eff
    return out


def compute_payroll_info_from_base_salary(**params):
    params = dict(params)
    params["gross_salary"] = 0
    params.setdefault("gross_salary_input", UNDEFINED)
    params.setdefault("ctc_input", UNDEFINED)
    if params["gross_salary_input"] is UNDEFINED:
        params["gross_salary_input"] = None
    if params["ctc_input"] is UNDEFINED:
        params["ctc_input"] = None
    return compute_payroll_info_from_salary_input(**params)
