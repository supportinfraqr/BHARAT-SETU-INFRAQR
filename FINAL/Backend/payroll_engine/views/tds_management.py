"""TDS management — port of ``controller/payroll/tdsManagement.js``.

Every exported legacy handler is a view below (see ``ROUTES``); every internal helper is a
module-level function with the snake_case legacy name, so the payroll run / employee
payroll ports can import e.g. ``compute_employee_tds_projection`` or ``calculate_tax``.

JS value model: employees, configs and TDS records are handled as their legacy JSON dicts
(``Model.to_dict()``); a missing key is JS ``undefined`` (``jsmath.UNDEFINED``). Date values
produced by the financial-year helpers are ``datetime.date`` (legacy local-midnight
``Date``) and are serialised with ``iso_local_midnight`` (``_jsonify``) exactly as
``JSON.stringify`` / Mongo did. The pure calculation helpers are differentially tested
against the legacy JS (``tests/test_tds.py``).
"""

import copy
import json
import math
import re
import uuid
from datetime import date, datetime, timezone

from django.db import transaction
from django.utils import timezone as dj_timezone

from ..context import PayrollError, by_method, get_employee, payroll_view, send_response
from ..services.financial_year import (
    LOCAL_TZ,
    _to_instant,
    build_tds_income_months,
    get_remaining_payroll_months_in_tds_period,
    get_tds_calculation_period,
    get_tds_opening_month,
    iso_local_midnight,
    is_payroll_month_before_implementation,
    js_local_date,
    resolve_financial_year_input,
    to_calendar_date,
)
from ..services.jsmath import (
    UNDEFINED,
    clean,
    is_nullish,
    js_max,
    js_min,
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
from ..services.tds_declaration_helper import (
    aggregate80_d_from_lines,
    apply_capped_deductions_for_tax,
    build_declared_deductions_from_declaration,
    cap_to_limit,
    completed_service_years,
    compute_annual_rent_from_entries,
    g,
    get_default_exemption_limits,
    get_exemption_limits,
    gratuity_exempt,
    leave_encashment_exempt,
    locale_en_in,
    retrenchment_exempt,
    vrs_exempt,
)

MAX_INVESTMENT_LINES = 100
MAX_RENT_ENTRIES = 20
MAX_OTHER_INVESTMENT_LINES = 50


# =====================================================================================
# JSON helpers
# =====================================================================================


def _jsonify(value):
    """JSON shape the legacy API emitted: dates -> ISO strings, integral floats -> ints,
    ``UNDEFINED`` properties dropped."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=LOCAL_TZ)
        utc = value.astimezone(timezone.utc)
        return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"
    if isinstance(value, date):
        return iso_local_midnight(value)
    if isinstance(value, dict):
        return {k: _jsonify(v) for k, v in value.items() if v is not UNDEFINED}
    if isinstance(value, (list, tuple)):
        return [None if v is UNDEFINED else _jsonify(v) for v in value]
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return clean(value)
    return value


def _plain(value):
    """``JSON.parse(JSON.stringify(value))``."""
    return json.loads(json.dumps(_jsonify(value)))


def _is_obj(value):
    """``value && typeof value === 'object'``."""
    return isinstance(value, (dict, list))


def _num(value):
    """``Number(value)``."""
    return to_number(value)


# =====================================================================================
# Default slabs / config helpers
# =====================================================================================


def get_default_new_regime_slabs():
    # FY 2025-26 / FY 2026-27 new tax regime (Budget 2025)
    return [
        {"incomeFrom": 0, "incomeTo": 400000, "taxRate": 0},
        {"incomeFrom": 400001, "incomeTo": 800000, "taxRate": 5},
        {"incomeFrom": 800001, "incomeTo": 1200000, "taxRate": 10},
        {"incomeFrom": 1200001, "incomeTo": 1600000, "taxRate": 15},
        {"incomeFrom": 1600001, "incomeTo": 2000000, "taxRate": 20},
        {"incomeFrom": 2000001, "incomeTo": 2400000, "taxRate": 25},
        {"incomeFrom": 2400001, "incomeTo": 9999999999, "taxRate": 30},
    ]


def get_default_old_regime_slabs():
    return [
        {"incomeFrom": 0, "incomeTo": 250000, "taxRate": 0},
        {"incomeFrom": 250001, "incomeTo": 500000, "taxRate": 5},
        {"incomeFrom": 500001, "incomeTo": 1000000, "taxRate": 20},
        {"incomeFrom": 1000001, "incomeTo": 9999999999, "taxRate": 30},
    ]


def get_default_old_regime_slabs_senior():
    # Old regime, age 60–79 as on 31 March
    return [
        {"incomeFrom": 0, "incomeTo": 300000, "taxRate": 0},
        {"incomeFrom": 300001, "incomeTo": 500000, "taxRate": 5},
        {"incomeFrom": 500001, "incomeTo": 1000000, "taxRate": 20},
        {"incomeFrom": 1000001, "incomeTo": 9999999999, "taxRate": 30},
    ]


def get_default_old_regime_slabs_super_senior():
    # Old regime, age 80+ as on 31 March
    return [
        {"incomeFrom": 0, "incomeTo": 500000, "taxRate": 0},
        {"incomeFrom": 500001, "incomeTo": 1000000, "taxRate": 20},
        {"incomeFrom": 1000001, "incomeTo": 9999999999, "taxRate": 30},
    ]


def age_on_date(dob, as_of):
    from ..services.tds_declaration_helper import js_date

    birth = js_date(dob)
    if birth is None or as_of is None:
        return None
    b = birth.astimezone(LOCAL_TZ)
    a = as_of.astimezone(LOCAL_TZ) if isinstance(as_of, datetime) else as_of
    age = a.year - b.year
    month_diff = a.month - b.month
    if month_diff < 0 or (month_diff == 0 and a.day < b.day):
        age -= 1
    return age


def get_employee_age_for_fy(employee, fy):
    """Age as on 31 March of the financial year. Missing DOB stays on the below-60 slabs."""
    dob = js_or(g(g(employee, "demographics"), "dob"), g(employee, "dob"))
    if not js_truthy(dob) or not js_truthy(g(fy, "endYear")):
        return None
    return age_on_date(dob, js_local_date(_num(g(fy, "endYear")), 2, 31))


def old_regime_age_category(age):
    if age is None or age is UNDEFINED or not (isinstance(age, (int, float)) and math.isfinite(age)):
        return "below60"
    if age >= 80:
        return "superSenior"
    if age >= 60:
        return "senior"
    return "below60"


def _has_length(value):
    return isinstance(value, list) and len(value) > 0


def get_old_regime_slabs_for_age(tds_config, age):
    category = old_regime_age_category(age)
    if category == "superSenior":
        slabs = g(tds_config, "oldRegimeSlabsSuperSenior")
        return slabs if _has_length(slabs) else get_default_old_regime_slabs_super_senior()
    if category == "senior":
        slabs = g(tds_config, "oldRegimeSlabsSenior")
        return slabs if _has_length(slabs) else get_default_old_regime_slabs_senior()
    slabs = g(tds_config, "oldRegimeSlabs")
    return slabs if _has_length(slabs) else get_default_old_regime_slabs()


def get_default_surcharge_slabs():
    # New regime: surcharge capped at 25% above ₹5 crore
    return [
        {"incomeFrom": 0, "incomeTo": 5000000, "surchargeRate": 0},
        {"incomeFrom": 5000001, "incomeTo": 10000000, "surchargeRate": 10},
        {"incomeFrom": 10000001, "incomeTo": 20000000, "surchargeRate": 15},
        {"incomeFrom": 20000001, "incomeTo": 50000000, "surchargeRate": 25},
        {"incomeFrom": 50000001, "incomeTo": 9999999999, "surchargeRate": 25},
    ]


def get_default_surcharge_slabs_old():
    # Old regime: 37% above ₹5 crore
    return [
        {"incomeFrom": 0, "incomeTo": 5000000, "surchargeRate": 0},
        {"incomeFrom": 5000001, "incomeTo": 10000000, "surchargeRate": 10},
        {"incomeFrom": 10000001, "incomeTo": 20000000, "surchargeRate": 15},
        {"incomeFrom": 20000001, "incomeTo": 50000000, "surchargeRate": 25},
        {"incomeFrom": 50000001, "incomeTo": 9999999999, "surchargeRate": 37},
    ]


LEGACY_NEW_SURCHARGE = [
    {"incomeFrom": 0, "incomeTo": 5000000, "surchargeRate": 0},
    {"incomeFrom": 5000001, "incomeTo": 10000000, "surchargeRate": 10},
    {"incomeFrom": 10000001, "incomeTo": 20000000, "surchargeRate": 15},
    {"incomeFrom": 20000001, "incomeTo": 9999999999, "surchargeRate": 25},
]


def slab_row(slab, rate_key):
    return {
        "incomeFrom": num0(g(slab, "incomeFrom")),
        "incomeTo": num0(g(slab, "incomeTo")),
        rate_key: num0(g(slab, rate_key)),
    }


def _rows_equal(saved, expected, rate_key):
    for index, row in enumerate(saved):
        left = slab_row(row, rate_key)
        right = expected[index]
        if not (left["incomeFrom"] == right["incomeFrom"] and left["incomeTo"] == right["incomeTo"]
                and left[rate_key] == right[rate_key]):
            return False
    return True


def same_slab_rows(saved, expected, rate_key):
    if not isinstance(saved, list) or len(saved) != len(expected):
        return False
    return _rows_equal(saved, expected, rate_key)


def is_exact_prefix(saved, defaults, rate_key):
    if not isinstance(saved, list) or not saved or len(saved) >= len(defaults):
        return False
    return _rows_equal(saved, defaults, rate_key)


def complete_new_regime_slabs(saved):
    """Saved 4-slab new-regime list (stops at ₹16 lakh) becomes the full FY 2026-27 table."""
    defaults = get_default_new_regime_slabs()
    if not isinstance(saved, list) or len(saved) == 0:
        return None
    if is_exact_prefix(saved, defaults, "taxRate"):
        return defaults
    return saved


def normalize_new_surcharge_slabs(saved):
    if not isinstance(saved, list) or len(saved) == 0:
        return None
    if same_slab_rows(saved, LEGACY_NEW_SURCHARGE, "surchargeRate"):
        return get_default_surcharge_slabs()
    return saved


def get_surcharge_slabs_for_regime(tds_config, regime):
    if regime == "old":
        old_slabs = g(tds_config, "surchargeSlabsOld")
        if _has_length(old_slabs):
            return old_slabs
        return get_default_surcharge_slabs_old()
    return normalize_new_surcharge_slabs(g(tds_config, "surchargeSlabs")) or get_default_surcharge_slabs()


def get_standard_deduction_for_regime(tds_config, tax_regime="new"):
    regime = resolve_tax_regime(tax_regime)
    if regime == "old":
        return js_or(num0(g(tds_config, "standardDeductionOld")), 50000)
    return js_or(num0(g(tds_config, "standardDeduction")),
                 num0(g(tds_config, "standardDeductionNew")), 75000)


def get_rebate_for_regime(tds_config, tax_regime="new"):
    regime = resolve_tax_regime(tax_regime)
    if regime == "old":
        return {
            "rebateLimit": js_or(num0(g(tds_config, "rebateLimitOld")), 500000),
            "rebateAmount": js_or(num0(g(tds_config, "rebateAmountOld")), 12500),
        }
    return {
        "rebateLimit": js_or(num0(g(tds_config, "rebateLimit")), 1200000),
        "rebateAmount": js_or(num0(g(tds_config, "rebateAmount")), 60000),
    }


def get_remaining_months_in_financial_year(fy, as_of_date=UNDEFINED, implementation_date=None):
    """Remaining payroll months in the TDS window (implementation date -> 31 March)."""
    return get_remaining_payroll_months_in_tds_period(fy, implementation_date, as_of_date)


def calculate_monthly_tds_amount(annual_tax, already_deducted=0, remaining_months=12):
    months = to_number(remaining_months)
    if not math.isfinite(months) or months <= 0:
        return 0
    remaining = max(0.0, num0(annual_tax) - num0(already_deducted))
    return js_round(remaining / months)


def load_payroll_implementation_date(org):
    from ..models import PayrollSchedule

    schedule = PayrollSchedule.objects.filter(org=org).order_by("created_at").first()
    return schedule.first_pay_period if schedule and schedule.first_pay_period else None


def sum_tds_already_deducted(existing_tds, implementation_date):
    entries = g(existing_tds, "monthlyDeductions")
    entries = entries if isinstance(entries, list) else []
    if js_truthy(implementation_date) and len(entries) > 0:
        total = 0.0
        for entry in entries:
            if is_payroll_month_before_implementation(g(entry, "month"), g(entry, "year"),
                                                      implementation_date):
                continue
            total += num0(g(entry, "tdsDeducted"))
        return total
    return num0(g(existing_tds, "totalTDSDeducted"))


def summarize_tds_view(projection, deductions_applied):
    return {
        "taxRegime": projection["effectiveRegime"],
        "annualIncome": projection["annualIncome"],
        "hraExemption": projection["hraExemption"],
        "deductionsApplied": deductions_applied,
        "taxableIncome": projection["taxableIncome"],
        "taxCalculation": projection["taxCalculation"],
        "monthlyTDS": projection["monthlyTDS"],
        "remainingMonths": projection["remainingMonths"],
        "payrollImplementationDate": projection["payrollImplementationDate"],
        "tdsPeriod": projection["tdsPeriod"],
    }


def clamp_payroll_months(months):
    count = to_number(months)
    if not math.isfinite(count):
        return 12
    return max(0, min(12, count))


# =====================================================================================
# Projection
# =====================================================================================


def _annual_loan_perquisite_from_loans(loans, months):
    """Local port of ``calculateEmployeeAnnualLoanPerquisite`` over pre-fetched loans
    (legacy ``EmployeeLoan.find(...).populate('loanTypeId')`` documents)."""
    if months is None or months is UNDEFINED or months == "":
        month_count = 12
    else:
        c = to_number(months)
        month_count = 12 if (not math.isfinite(c) or c < 0) else c
    annual_total = 0.0
    breakdown = []
    for loan in loans or []:
        loan_type = js_or(g(loan, "loanTypeId"), {})
        if js_truthy(g(loan, "exemptFromPerquisite")):
            exempt = True
        elif to_number(js_or(g(loan, "loanAmount"), 0)) <= 20000:
            exempt = True
        else:
            exempt = "medical" in js_trim(js_str(js_or(g(loan_type, "loanName"), ""))).lower()
        monthly = 0
        outstanding = to_number(js_or(g(loan, "outstandingBalance"), 0))
        if not exempt and outstanding > 0:
            rate = max(0.0, num0(g(loan_type, "perquisiteRate")) - 0)
            if rate > 0:
                monthly = js_round((outstanding * rate) / 100 / 12)
        annual = monthly * month_count
        if annual <= 0:
            continue
        annual_total += annual
        breakdown.append({
            "loanId": g(loan, "_id"),
            "loanNumber": g(loan, "loanNumber"),
            "loanName": js_or(g(loan_type, "loanName"), ""),
            "outstandingBalance": g(loan, "outstandingBalance"),
            "perquisiteRate": js_or(g(loan_type, "perquisiteRate"), 0),
            "monthlyPerquisite": js_round(annual / month_count) if month_count > 0 else 0,
            "annualPerquisite": annual,
            "exemptFromPerquisite": exempt,
        })
    return {
        "annualTotal": js_round(annual_total),
        "monthlyTotal": js_round(annual_total / month_count) if month_count > 0 else 0,
        "breakdown": breakdown,
    }


def _fetch_loans_for_perquisite(org, employee_id):
    from ..models import EmployeeLoan

    if org is None or not employee_id:
        return []
    rows = []
    qs = (EmployeeLoan.objects.filter(org=org, employee_id=employee_id, status="active",
                                      outstanding_balance__gt=0)
          .select_related("loan_type").order_by("created_at"))
    for loan in qs:
        doc = loan.to_dict()
        lt = loan.loan_type
        doc["loanTypeId"] = ({"_id": str(lt.pk), "loanName": lt.loan_name,
                              "perquisiteRate": lt.perquisite_rate, "status": getattr(lt, "status", "")}
                             if lt is not None else None)
        rows.append(doc)
    return rows


def calculate_employee_annual_loan_perquisite(org, employee_id, months=12, loans=UNDEFINED):
    """``calculateEmployeeAnnualLoanPerquisite`` (utils/payroll/loanPerquisiteHelper.js).

    Prefers the shared port (``services.loan_perquisite_helper``) when it exists; the local
    implementation is the same algorithm (used for injected ``loans`` in tests)."""
    if loans is UNDEFINED:
        try:
            from ..services import loan_perquisite_helper as lph  # noqa: WPS433
            fn = getattr(lph, "calculate_employee_annual_loan_perquisite", None)
        except ImportError:
            fn = None
        if fn is not None:
            try:
                return fn(organization_id=org, employee_id=employee_id, months=months)
            except TypeError:
                pass
        loans = _fetch_loans_for_perquisite(org, employee_id)
    return _annual_loan_perquisite_from_loans(loans, months)


def resolve_payroll_implementation_start(effective_from):
    schedule_date = to_calendar_date(effective_from)
    if schedule_date:
        return {"date": schedule_date, "source": "effective_from", "payrollScheduleDate": schedule_date}
    return {"date": None, "source": "financial_year_start", "payrollScheduleDate": None}


def _load_earnings_config(org):
    from ..models import SalaryCompensation

    row = (SalaryCompensation.objects.filter(org=org, category="earnings")
           .order_by("created_at").first())
    return row.to_dict() if row else None


def calculate_hra_received_from_salary_components(employee, org=None, payroll_months=12,
                                                  earnings_config=UNDEFINED):
    """``earnings_config``: the org's ``SalaryCompensation`` earnings document (dict) — read
    from the DB when omitted (legacy ``SalaryCompensationModel.findOne``)."""
    months = clamp_payroll_months(payroll_months)
    pi = g(employee, "payrollInfo")
    monthly_basic = to_number(js_or(g(pi, "baseSalary"), g(employee, "baseSalary"), 0))
    monthly_gross = to_number(js_or(g(pi, "grossSalary"), g(employee, "grossSalary"),
                                    monthly_basic * 1.3, 0))
    monthly_ctc = to_number(js_or(g(pi, "ctc"), g(employee, "ctc"), monthly_gross, 0))
    if earnings_config is UNDEFINED:
        earnings_config = _load_earnings_config(org)

    hra_component = None
    for component in js_or(g(earnings_config, "components"), []) or []:
        if js_or(g(component, "status"), "active") != "active":
            continue
        code = js_trim(js_str(js_or(g(component, "code"), ""))).lower()
        name = js_trim(js_str(js_or(g(component, "name"), ""))).lower()
        if code == "hra" or name == "hra" or "house rent" in name or "hra" in name:
            hra_component = component
            break

    if hra_component is not None:
        monthly_amount = calculate_salary_component_monthly_amount(
            hra_component, {"monthlyBasic": monthly_basic, "monthlyGross": monthly_gross,
                            "monthlyCTC": monthly_ctc})
    else:
        monthly_amount = monthly_gross * 0.4

    return {
        "monthlyAmount": js_round(monthly_amount),
        "annualAmount": js_round(monthly_amount * months),
        "payrollMonths": months,
        "source": "salary_component" if hra_component is not None else "fallback_gross_40_percent",
        "component": {
            "name": js_or(g(hra_component, "name"), ""),
            "code": js_or(g(hra_component, "code"), ""),
            "calculationType": js_or(g(hra_component, "calculationType"), ""),
            "value": num0(g(hra_component, "value")),
            "basedOn": js_or(g(hra_component, "basedOn"), ""),
        } if hra_component is not None else None,
    }


def calculate_salary_component_monthly_amount(component, salary_base):
    value = num0(g(component, "value"))
    ctype = g(component, "calculationType")
    if ctype in ("fixed", "variable"):
        return max(0.0, value)
    if ctype == "percentage":
        based_on = js_str(js_or(g(component, "basedOn"), "basic")).lower()
        if based_on == "gross":
            base = salary_base["monthlyGross"]
        elif based_on == "ctc":
            base = salary_base["monthlyCTC"]
        else:
            base = salary_base["monthlyBasic"]
        return js_max(0, (base * value) / 100)
    return 0


def get_rent_details_from_it_declaration(it_declaration=UNDEFINED, fy_start_year=None, period_start=None):
    if it_declaration is UNDEFINED:
        it_declaration = {}
    if not js_truthy(g(it_declaration, "stayingInRentedHouse")):
        return {"monthlyRent": 0, "annualRent": 0, "cityType": "Non-Metro", "isMetroCity": False,
                "entries": 0}
    rent_entries = g(it_declaration, "rentEntries")
    rent_entries = rent_entries if isinstance(rent_entries, list) else []
    res = compute_annual_rent_from_entries(rent_entries, fy_start_year, period_start)
    annual_rent = res["annualRent"]
    return {
        "monthlyRent": js_round(annual_rent / 12) if annual_rent > 0 else 0,
        "annualRent": js_round(annual_rent),
        "cityType": "Metro" if res["isMetroCity"] else "Non-Metro",
        "isMetroCity": res["isMetroCity"],
        "entries": len(rent_entries),
    }


def _object_keys_len(value):
    if isinstance(value, (dict, list, str)):
        return len(value)
    return 0


def build_hra_details_from_declaration(hra_details=UNDEFINED, it_declaration=UNDEFINED,
                                       fy_start_year=None, period_start=None):
    if hra_details is UNDEFINED:
        hra_details = {}
    if it_declaration is UNDEFINED:
        it_declaration = {}
    if js_truthy(hra_details) and _object_keys_len(hra_details) > 0:
        return hra_details
    rent = get_rent_details_from_it_declaration(it_declaration, fy_start_year, period_start)
    return {
        "rentPaid": rent["monthlyRent"],
        "isMetroCity": rent["isMetroCity"],
        "cityType": rent["cityType"],
        "annualRent": rent["annualRent"],
    }


def build_income_breakdown(employee, annual_income, tds_period):
    pi = g(employee, "payrollInfo")
    monthly_basic = to_number(js_or(g(pi, "baseSalary"), g(employee, "baseSalary"), 0))
    monthly_gross = to_number(js_or(g(pi, "grossSalary"), g(employee, "grossSalary"), monthly_basic * 1.3))
    salary_income = js_round(num0(g(annual_income, "gross")))
    other_income = js_round(num0(g(annual_income, "otherIncome")))
    loan_perquisite = js_round(num0(g(annual_income, "loanPerquisite")))
    return {
        "monthlyGross": js_round(monthly_gross),
        "equivalentMonths": num0(g(tds_period, "equivalentMonths")),
        "months": build_tds_income_months(g(tds_period, "periodStart"), g(tds_period, "periodEnd"),
                                          monthly_gross, salary_income),
        "salaryIncome": salary_income,
        "otherIncome": other_income,
        "loanPerquisite": loan_perquisite,
        "total": js_round(num0(g(annual_income, "total"))),
    }


def calculate_annual_income(employee, other_income=0, annual_hra_override=None, payroll_months=12):
    months = clamp_payroll_months(payroll_months)
    normalized_other = num0(other_income)
    pi = g(employee, "payrollInfo")
    monthly_basic = js_or(g(pi, "baseSalary"), g(employee, "baseSalary"), 0)
    basic = to_number(monthly_basic) * months
    gross_monthly = js_or(g(pi, "grossSalary"), g(employee, "grossSalary"), to_number(monthly_basic) * 1.3)
    gross = to_number(gross_monthly) * months
    hra = num0(annual_hra_override) if annual_hra_override is not None else gross * 0.4
    allowances = gross - basic - hra
    return {
        "basic": basic,
        "gross": gross,
        "hra": hra,
        "allowances": allowances,
        "otherIncome": normalized_other,
        "total": gross + normalized_other,
    }


def non_negative_money(value):
    return max(0.0, num0(value))


def exemption_child_count(employee, declared=UNDEFINED, max_children=2):
    if declared is UNDEFINED:
        declared = {}
    from_form = to_number(g(declared, "childrenCount"))
    from_profile = to_number(g(g(employee, "maritalInfo"), "numberOfChildren"))
    count = from_form if (math.isfinite(from_form) and from_form > 0) else num0(from_profile)
    cap = max(0, math.floor(num0(max_children)))
    return min(cap, max(0, math.floor(count)))


def is_specified_disabled_employee(employee):
    flag = js_trim(js_str(js_or(g(g(employee, "handicappedInfo"), "handicapped"), ""))).lower()
    return flag in ("yes", "true", "y", "1")


def calculate_section10_exemptions(employee, declaration, tax_regime, payroll_months=12,
                                   tds_config=UNDEFINED, service=UNDEFINED):
    """Section 10 salary exemptions. Caps come from TDS Other configuration."""
    if tds_config is UNDEFINED:
        tds_config = {}
    if service is UNDEFINED:
        service = {}
    plain = to_plain_it_declaration(declaration)
    src = js_or(g(plain, "salaryExemptions"), {})
    months = clamp_payroll_months(payroll_months)
    limits = get_exemption_limits(tds_config)
    children = exemption_child_count(employee, src, limits["childrenEducationMaxChildren"])
    hostel_children = exemption_child_count(employee, src, limits["hostelMaxChildren"])
    life_insurance = cap_to_limit(g(src, "lifeInsuranceExempt"), limits["lifeInsurance"])
    old = resolve_tax_regime(tax_regime) == "old"

    if not old:
        return {
            "total": life_insurance,
            "lifeInsurance": life_insurance,
            "lifeInsuranceReceived": non_negative_money(g(src, "lifeInsuranceExempt")),
            "children": children,
            "disabled": False,
            "limits": limits,
        }

    children_education = js_round(js_min(
        non_negative_money(g(src, "childrenEducationReceived")),
        limits["childrenEducationPerMonth"] * children * months,
        limits["childrenEducationAnnualCap"]))
    hostel = js_round(js_min(
        non_negative_money(g(src, "hostelAllowanceReceived")),
        limits["hostelPerMonth"] * hostel_children * months,
        limits["hostelAnnualCap"]))
    disabled = is_specified_disabled_employee(employee)
    disabled_transport = (js_min(non_negative_money(g(src, "disabledTransportReceived")),
                                 limits["disabledTransportPerMonth"] * months) if disabled else 0)
    lta = cap_to_limit(g(src, "ltaEligibleTravel"), limits["lta"])
    monthly_salary = num0(g(service, "monthlySalary"))
    years_act = None if is_nullish(g(service, "yearsAct")) else g(service, "yearsAct")
    years_plain = None if is_nullish(g(service, "yearsPlain")) else g(service, "yearsPlain")
    gratuity = gratuity_exempt(g(src, "gratuityReceived"), limits["gratuity"], monthly_salary, years_act,
                               g(service, "gratuityActCovered") is not False)
    leave_enc = leave_encashment_exempt(g(src, "leaveEncashmentReceived"), limits["leaveEncashment"],
                                        monthly_salary)
    retrenchment = retrenchment_exempt(g(src, "retrenchmentReceived"), limits["retrenchment"],
                                       monthly_salary, years_act)
    vrs = vrs_exempt(g(src, "vrsReceived"), limits["vrs"], monthly_salary, years_plain)
    official_duty = cap_to_limit(g(src, "officialDutySpent"), limits["officialDuty"])
    total = children_education
    for part in (hostel, disabled_transport, lta, gratuity, leave_enc, retrenchment, vrs,
                 official_duty, life_insurance):
        total += part

    def inr(key):
        return locale_en_in(num0(js_or(limits[key], 0)))

    return {
        "total": total,
        "children": children,
        "disabled": disabled,
        "limits": limits,
        "childrenEducation": children_education,
        "childrenEducationReceived": non_negative_money(g(src, "childrenEducationReceived")),
        "hostel": hostel,
        "hostelReceived": non_negative_money(g(src, "hostelAllowanceReceived")),
        "disabledTransport": disabled_transport,
        "disabledTransportReceived": non_negative_money(g(src, "disabledTransportReceived")),
        "lta": lta,
        "ltaReceived": non_negative_money(g(src, "ltaEligibleTravel")),
        "gratuity": gratuity,
        "gratuityReceived": non_negative_money(g(src, "gratuityReceived")),
        "leaveEncashment": leave_enc,
        "leaveEncashmentReceived": non_negative_money(g(src, "leaveEncashmentReceived")),
        "retrenchment": retrenchment,
        "retrenchmentReceived": non_negative_money(g(src, "retrenchmentReceived")),
        "vrs": vrs,
        "vrsReceived": non_negative_money(g(src, "vrsReceived")),
        "officialDuty": official_duty,
        "officialDutyReceived": non_negative_money(g(src, "officialDutySpent")),
        "lifeInsurance": life_insurance,
        "lifeInsuranceReceived": non_negative_money(g(src, "lifeInsuranceExempt")),
        "notes": {
            "gratuity": (f"Exempt up to ₹{inr('gratuity')}. Joining date was missing, so the 15-day "
                         "salary formula was not applied." if years_act is None
                         else f"Least of gratuity received, 15 days' salary × {js_str(years_act)} years, "
                              f"and ₹{inr('gratuity')}."),
            "leave": (f"Least of leave encashment received, 10 months' salary, and ₹{inr('leaveEncashment')}."
                      if monthly_salary > 0 else f"Exempt up to ₹{inr('leaveEncashment')}."),
            "retrenchment": (f"Exempt up to ₹{inr('retrenchment')}." if years_act is None
                             else f"Least of compensation received, 15 days' pay × {js_str(years_act)} "
                                  f"years, and ₹{inr('retrenchment')}."),
            "vrs": (f"Exempt up to ₹{inr('vrs')}." if years_plain is None
                    else f"Least of VRS received, 3 months' salary × {js_str(years_plain)} years, "
                         f"and ₹{inr('vrs')}."),
        },
    }


def calculate_hra_exemption(annual_basic, annual_hra, hra_details=UNDEFINED, rent_month_factor=12):
    if hra_details is UNDEFINED:
        hra_details = {}
    if hra_details is None:
        raise TypeError("Cannot read properties of null (reading 'annualRent')")
    override = to_number(g(hra_details, "annualRent"))
    override_ok = math.isfinite(override) and override > 0
    if not js_truthy(g(hra_details, "rentPaid")) and not override_ok:
        return {
            "actualHRA": annual_hra, "rentPaid": 0, "basic": annual_basic,
            "rentMinusTenPercent": 0, "percentOfBasic": 0, "isMetro": False, "exemptAmount": 0,
        }
    rent_paid = g(hra_details, "rentPaid")
    is_metro_city = g(hra_details, "isMetroCity")
    city = js_trim(js_str(js_or(g(hra_details, "cityType"), ""))).lower()
    metro = is_metro_city if isinstance(is_metro_city, bool) else city in ("metro", "metropolitan")
    rent_months = clamp_payroll_months(rent_month_factor)
    annual_rent = override if override_ok else num0(rent_paid) * rent_months
    calc1 = annual_hra
    calc2 = annual_rent - (to_number(annual_basic) * 0.1)
    calc3 = to_number(annual_basic) * 0.5 if metro else to_number(annual_basic) * 0.4
    exempt = js_min(calc1, calc2, calc3)
    return {
        "actualHRA": annual_hra,
        "rentPaid": annual_rent,
        "basic": annual_basic,
        "rentMinusTenPercent": js_max(0, calc2),
        "percentOfBasic": calc3,
        "isMetro": metro,
        "exemptAmount": js_max(0, exempt),
    }


_WS = re.compile(r"\s+")


def parse_tax_regime_input(value=UNDEFINED):
    """Returns 'old' | 'new' | None (empty). ``UNDEFINED`` = invalid input."""
    if value is UNDEFINED or value is None or js_trim(js_str(value)) == "":
        return None
    normalized = _WS.sub("_", js_trim(js_str(value)).lower())
    if normalized == "old" or normalized.startswith("old_") or normalized in ("oldregime", "old_regime"):
        return "old"
    if normalized == "new" or normalized.startswith("new_") or normalized in ("newregime", "new_regime"):
        return "new"
    return UNDEFINED


def resolve_tax_regime(*candidates):
    for value in candidates:
        parsed = parse_tax_regime_input(value)
        if parsed:
            return parsed
    return "new"


def calculate_taxable_income(annual_income, declared_deductions=UNDEFINED, hra_exemption=UNDEFINED,
                             tds_config=UNDEFINED, tax_regime="new", section10_exempt=0,
                             cap_options=UNDEFINED):
    if declared_deductions is UNDEFINED:
        declared_deductions = {}
    if cap_options is UNDEFINED:
        cap_options = {}
    total_income = g(annual_income, "total")
    opts = dict(cap_options)
    opts["annualTotal"] = total_income
    opts["annualBasic"] = js_nc(g(cap_options, "annualBasic"), g(annual_income, "basic"))
    opts["annualDa"] = js_nc(g(cap_options, "annualDa"), g(annual_income, "da"))
    opts["annualHra"] = js_nc(g(cap_options, "annualHra"), g(annual_income, "hra"))
    opts["annualRent"] = js_nc(g(cap_options, "annualRent"), g(hra_exemption, "rentPaid"))
    total_deductions = compute_effective_deductions_total(declared_deductions, hra_exemption, tds_config,
                                                          tax_regime, section10_exempt, opts)
    return js_max(0, to_number(total_income) - total_deductions)


def compute_effective_deductions_total(declared_deductions=UNDEFINED, hra_exemption=UNDEFINED,
                                       tds_config=UNDEFINED, tax_regime="new", section10_exempt=0,
                                       cap_options=UNDEFINED):
    """Old regime: 80C/80D, HRA, section 10. New regime: standard deduction + 10(10D) + 80CCD(2)."""
    if declared_deductions is UNDEFINED:
        declared_deductions = {}
    if hra_exemption is UNDEFINED:
        hra_exemption = {}
    if cap_options is UNDEFINED:
        cap_options = {}
    regime = resolve_tax_regime(tax_regime)
    standard = get_standard_deduction_for_regime(tds_config, regime)
    section10 = max(0.0, num0(section10_exempt))
    hra_exempt = to_number(js_or(g(hra_exemption, "exemptAmount"), 0)) if regime == "old" else 0
    professional_tax = num0(g(declared_deductions, "professionalTax")) if regime == "old" else 0
    income_before24 = to_number(g(cap_options, "incomeBeforeSection24"))
    if not math.isfinite(income_before24) and math.isfinite(to_number(g(cap_options, "annualTotal"))):
        income_before24 = (to_number(g(cap_options, "annualTotal")) - standard - professional_tax
                           - hra_exempt - section10)
    opts = dict(cap_options)
    opts["taxRegime"] = regime
    opts["incomeBeforeSection24"] = income_before24
    opts["annualHra"] = g(cap_options, "annualHra")
    opts["annualRent"] = js_nc(g(cap_options, "annualRent"), g(hra_exemption, "rentPaid"))
    capped = apply_capped_deductions_for_tax(declared_deductions,
                                             {} if tds_config is UNDEFINED else tds_config, opts)
    if regime != "old":
        return standard + section10 + capped["section80CCD2"]
    total = standard
    for key in ("section80C", "section80CCC", "section80CCD1", "section80CCD1B", "section80CCD2",
                "section80D", "section80DD", "section80U", "section80DDB", "section80E",
                "section80EE", "section80EEA", "section80G", "section80GG", "section80GGA",
                "section80GGC", "section80TTA", "section80TTB", "section24"):
        total += capped[key]
    total += professional_tax
    total += capped["otherDeductions"]
    total += hra_exempt
    total += section10
    return total


def calculate_tax(taxable_income, tax_regime, tds_config, options=UNDEFINED):
    if options is UNDEFINED:
        options = {}
    regime = resolve_tax_regime(tax_regime)
    age = g(options, "age")
    age_category = old_regime_age_category(age) if regime == "old" else None
    if regime == "new":
        slabs = complete_new_regime_slabs(g(tds_config, "newRegimeSlabs")) or get_default_new_regime_slabs()
    else:
        slabs = get_old_regime_slabs_for_age(tds_config, age)
    taxable = to_number(taxable_income)
    income_tax = 0.0
    slab_breakdown = []
    for slab in slabs:
        frm, to, rate = to_number(g(slab, "incomeFrom")), to_number(g(slab, "incomeTo")), to_number(g(slab, "taxRate"))
        if taxable > frm:
            taxable_amount = js_max(0, js_min(taxable, to) - frm)
            tax = (taxable_amount * rate) / 100
            income_tax += tax
            if taxable_amount > 0:
                slab_breakdown.append({
                    "incomeFrom": g(slab, "incomeFrom"),
                    "incomeTo": g(slab, "incomeTo"),
                    "rate": g(slab, "taxRate"),
                    "taxableAmount": js_round(taxable_amount),
                    "tax": js_round(tax),
                })

    surcharge = 0.0
    surcharge_rate = 0
    for slab in get_surcharge_slabs_for_regime(tds_config, regime):
        if taxable >= to_number(g(slab, "incomeFrom")) and taxable <= to_number(g(slab, "incomeTo")):
            surcharge_rate = g(slab, "surchargeRate")
            surcharge = (income_tax * to_number(surcharge_rate)) / 100
            break

    cess_rate = js_or(g(tds_config, "healthEducationCess"), 4)
    cess = ((income_tax + surcharge) * to_number(cess_rate)) / 100
    total = js_round(income_tax + surcharge + cess)

    rebate = get_rebate_for_regime(tds_config, regime)
    rebate_applicable = False
    rebate_amount = 0
    if taxable <= rebate["rebateLimit"]:
        rebate_applicable = True
        rebate_amount = min(total, rebate["rebateAmount"])
        total = max(0, total - rebate_amount)

    return js_out({
        "incomeTax": js_round(income_tax),
        "surcharge": js_round(surcharge),
        "surchargeRate": surcharge_rate,
        "cess": js_round(cess),
        "cessRate": cess_rate,
        "total": total,
        "rebateApplicable": rebate_applicable,
        "rebateAmount": rebate_amount,
        "slabBreakdown": slab_breakdown,
        "age": age if regime == "old" else None,
        "ageCategory": age_category,
        "dobMissing": regime == "old" and is_nullish(age),
    })


def money_amount(value):
    return max(0.0, num0(value))


def normalize_deductions(deductions=UNDEFINED):
    d = {} if deductions is UNDEFINED else deductions
    if d is None:
        raise TypeError("Cannot read properties of null (reading 'section80DDSevere')")
    sev = g(d, "section80DDSevere")
    severe = sev is True or sev == "true" or (isinstance(sev, (int, float)) and not isinstance(sev, bool) and sev == 1)
    m = money_amount
    return {
        "section80C": m(g(d, "section80C")),
        "section80CCC": m(g(d, "section80CCC")),
        "section80CCD1": m(g(d, "section80CCD1")),
        "section80CCD1B": m(g(d, "section80CCD1B")),
        "section80CCD2": m(g(d, "section80CCD2")),
        "section80D": m(g(d, "section80D")),
        "section80DD": m(g(d, "section80DD")),
        "section80DDSevere": severe,
        "section80DDB": m(g(d, "section80DDB")),
        "section80E": m(g(d, "section80E")),
        "section80EE": m(g(d, "section80EE")),
        "section80EEA": m(g(d, "section80EEA")),
        "section80G": m(g(d, "section80G")),
        "section80GG": m(g(d, "section80GG")),
        "section80GGA": m(g(d, "section80GGA")),
        "section80GGC": m(g(d, "section80GGC")),
        "section80TTA": m(g(d, "section80TTA")),
        "section24": m(g(d, "section24")),
        "professionalTax": m(g(d, "professionalTax")),
        "otherDeductions": m(g(d, "otherDeductions")),
        "section80DSelf": m(g(d, "section80DSelf")),
        "section80DParents": m(g(d, "section80DParents")),
        "section80DPreventive": m(g(d, "section80DPreventive")),
        "section80DPreventiveSelf": m(g(d, "section80DPreventiveSelf")),
        "section80DPreventiveParents": m(g(d, "section80DPreventiveParents")),
        "section80DMedicalSelf": m(g(d, "section80DMedicalSelf")),
        "section80DMedicalParents": m(g(d, "section80DMedicalParents")),
        "section80DSelfSenior": g(d, "section80DSelfSenior") is True or g(d, "section80DSelfSenior") == "true",
        "section80DParentsSenior": (g(d, "section80DParentsSenior") is True
                                    or g(d, "section80DParentsSenior") == "true"),
        "section80DDBReimbursed": m(g(d, "section80DDBReimbursed")),
        "section80G50": m(g(d, "section80G50")),
        "section80G100Limited": m(g(d, "section80G100Limited")),
        "section80G50Limited": m(g(d, "section80G50Limited")),
        "section80EStartYear": num0(g(d, "section80EStartYear")),
    }


_CHAPTER_MERGE_KEYS = [
    "section80CCC", "section80CCD1", "section80CCD1B", "section80CCD2", "section80DD",
    "section80DDB", "section80EE", "section80EEA", "section80GG", "section80GGA", "section80GGC",
    "section80TTA", "section80G50", "section80G100Limited", "section80G50Limited",
    "section80DSelf", "section80DParents", "section80DPreventive", "section80DPreventiveSelf",
    "section80DPreventiveParents", "section80DMedicalSelf", "section80DMedicalParents",
    "section80DDBReimbursed",
]


def merge_chapter_via_into_deductions(deductions=UNDEFINED, declaration=UNDEFINED):
    if deductions is UNDEFINED:
        deductions = {}
    chapter = js_or(g(declaration, "chapterVIA"), {})
    merged = dict(deductions) if isinstance(deductions, dict) else {}
    for key in _CHAPTER_MERGE_KEYS:
        if not (to_number(merged.get(key, UNDEFINED)) > 0) and to_number(g(chapter, key)) > 0:
            merged[key] = to_number(g(chapter, key))
    if is_nullish(merged.get("section80DDSevere", UNDEFINED)) and not is_nullish(g(chapter, "section80DDSevere")):
        merged["section80DDSevere"] = g(chapter, "section80DDSevere")
    if not is_nullish(g(chapter, "section80DSelfSenior")):
        merged["section80DSelfSenior"] = g(chapter, "section80DSelfSenior")
    if not is_nullish(g(chapter, "section80DParentsSenior")):
        merged["section80DParentsSenior"] = g(chapter, "section80DParentsSenior")
    if not (to_number(merged.get("section80EStartYear", UNDEFINED)) > 0) and to_number(g(chapter, "section80EStartYear")) > 0:
        merged["section80EStartYear"] = to_number(g(chapter, "section80EStartYear"))
    return merged


def compute_employee_tds_projection(org=None, employee=None, fy=None, tds_config=None,
                                    existing_tds=None, tax_regime=UNDEFINED,
                                    declared_deductions=UNDEFINED, hra_details=UNDEFINED,
                                    other_income=UNDEFINED, it_declaration_override=None,
                                    payroll_implementation_date=UNDEFINED, earnings_config=UNDEFINED,
                                    loans=UNDEFINED, as_of_date=UNDEFINED):
    """Full annual TDS projection for one employee (legacy ``computeEmployeeTdsProjection``).

    ``employee`` / ``tds_config`` / ``existing_tds`` are legacy JSON dicts. ``earnings_config``,
    ``loans`` and ``as_of_date`` are injection points for tests (DB / today otherwise)."""
    if existing_tds is UNDEFINED:
        existing_tds = None
    if it_declaration_override is UNDEFINED:
        it_declaration_override = None
    if payroll_implementation_date is not UNDEFINED:
        implementation_source = payroll_implementation_date or None
    else:
        from ..services.employee_implementation_date import resolve_employee_implementation_date

        implementation_source = resolve_employee_implementation_date(employee=employee, organization_id=org)
    resolved_start = resolve_payroll_implementation_start(implementation_source)
    implementation_date = resolved_start["date"]
    tds_period = get_tds_calculation_period(fy, implementation_date)
    opening_month = get_tds_opening_month(tds_period)
    payroll_months = clamp_payroll_months(tds_period["equivalentMonths"])
    effective_regime = resolve_tax_regime(js_nc(tax_regime, g(existing_tds, "taxRegime")),
                                          g(tds_config, "taxRegime"))
    declaration_source = js_or(it_declaration_override, g(existing_tds, "itDeclaration"))
    normalized = normalize_deductions(merge_chapter_via_into_deductions(
        js_or(declared_deductions, g(existing_tds, "declaredDeductions"), {}),
        declaration_source))
    standard_applied = get_standard_deduction_for_regime(tds_config, effective_regime)

    hra_from_salary = calculate_hra_received_from_salary_components(employee, org, payroll_months,
                                                                    earnings_config)
    manual_monthly_hra = to_number(g(hra_details, "hraReceived"))
    if math.isfinite(manual_monthly_hra) and manual_monthly_hra > 0:
        hra_received = {
            "monthlyAmount": js_round(manual_monthly_hra),
            "annualAmount": js_round(manual_monthly_hra * payroll_months),
            "payrollMonths": payroll_months,
            "source": "form_override",
            "component": hra_from_salary["component"],
        }
    else:
        hra_received = hra_from_salary

    effective_hra_details = build_hra_details_from_declaration(
        None if hra_details is UNDEFINED else hra_details,
        declaration_source if declaration_source is not None else UNDEFINED,
        g(fy, "startYear"), tds_period["periodStart"])

    from_declaration = get_other_income_from_it_declaration(g(existing_tds, "itDeclaration"))
    effective_other_income = (num0(other_income) if not is_nullish(other_income) else from_declaration)

    annual_income = calculate_annual_income(employee, effective_other_income,
                                            hra_received["annualAmount"], payroll_months)

    loan_summary = calculate_employee_annual_loan_perquisite(
        org, g(employee, "_id"), payroll_months, loans)
    annual_income["loanPerquisite"] = loan_summary["annualTotal"]
    annual_income["total"] += loan_summary["annualTotal"]

    income_breakdown = build_income_breakdown(employee, annual_income, tds_period)
    hra_exemption = calculate_hra_exemption(annual_income["basic"], annual_income["hra"],
                                            effective_hra_details, payroll_months)

    declaration_for_exemptions = declaration_source
    pi = g(employee, "payrollInfo")
    monthly_salary = to_number(js_or(g(pi, "baseSalary"), g(employee, "baseSalary"), 0))
    service_as_of = js_local_date(_num(g(fy, "endYear")), 2, 31) if js_truthy(g(fy, "endYear")) else None
    doj = g(employee, "dateOfJoining")
    section10 = calculate_section10_exemptions(
        employee, declaration_for_exemptions, effective_regime, payroll_months, tds_config,
        {
            "monthlySalary": monthly_salary,
            "yearsAct": completed_service_years(doj, service_as_of, True) if service_as_of else None,
            "yearsPlain": completed_service_years(doj, service_as_of, False) if service_as_of else None,
        })

    employee_age = get_employee_age_for_fy(employee, fy)
    other_breakdown = js_or(g(declaration_for_exemptions, "otherIncomeBreakdown"), {})
    disability_type = js_str(js_or(g(g(employee, "handicappedInfo"), "disabilityType"), "")).lower()
    cap_options = {
        "annualBasic": annual_income["basic"],
        "annualDa": js_or(annual_income.get("da", UNDEFINED), 0),
        "annualHra": annual_income["hra"],
        "annualRent": js_or(g(hra_exemption, "rentPaid"), 0),
        "annualTotal": annual_income["total"],
        "age": employee_age,
        "payrollMonths": payroll_months,
        "taxRegime": effective_regime,
        "fyStartYear": g(fy, "startYear"),
        "interestSavings": g(other_breakdown, "interestSavings"),
        "interestFD": g(other_breakdown, "interestFD"),
        "assesseeDisabled": is_specified_disabled_employee(employee),
        "assesseeSevere": "severe" in disability_type,
    }
    pt_for_income = num0(normalized["professionalTax"]) if effective_regime == "old" else 0
    hra_for_income = num0(g(hra_exemption, "exemptAmount")) if effective_regime == "old" else 0
    cap_options["incomeBeforeSection24"] = (annual_income["total"] - standard_applied - pt_for_income
                                            - hra_for_income - num0(g(section10, "total")))
    capped = apply_capped_deductions_for_tax(normalized, tds_config, cap_options)
    taxable_income = calculate_taxable_income(annual_income, normalized, hra_exemption, tds_config,
                                              effective_regime, section10["total"], cap_options)
    tax_calculation = calculate_tax(taxable_income, effective_regime, tds_config, {"age": employee_age})

    already_deducted = sum_tds_already_deducted(existing_tds, implementation_date)
    remaining_months = get_remaining_months_in_financial_year(fy, as_of_date, implementation_date)
    monthly_tds = calculate_monthly_tds_amount(tax_calculation["total"], already_deducted, remaining_months)

    return {
        "effectiveRegime": effective_regime,
        "normalizedDeductions": normalized,
        "cappedDeductions": capped,
        "standardDeductionApplied": standard_applied,
        "hraReceived": hra_received,
        "annualIncome": annual_income,
        "hraExemption": hra_exemption,
        "section10": section10,
        "taxableIncome": taxable_income,
        "taxCalculation": tax_calculation,
        "monthlyTDS": monthly_tds,
        "loanPerquisiteSummary": loan_summary,
        "remainingMonths": remaining_months,
        "alreadyDeducted": already_deducted,
        "payrollImplementationDate": implementation_date,
        "payrollScheduleDate": resolved_start["payrollScheduleDate"],
        "startDateSource": resolved_start["source"],
        "incomeBreakdown": income_breakdown,
        "capOptions": cap_options,
        "tdsPeriod": {
            "start": tds_period["periodStart"],
            "end": tds_period["periodEnd"],
            "applicableMonths": payroll_months,
            "implementationDateIncluded": True,
            "payrollImplementationDate": implementation_date,
            "payrollScheduleDate": resolved_start["payrollScheduleDate"],
            "startDateSource": resolved_start["source"],
            "openingMonth": opening_month,
        },
    }


def build_tds_projection_fields(org=None, employee=None, fy=None, tds_config=None, existing_tds=None,
                                declared_deductions=UNDEFINED, it_declaration=None, tax_regime=UNDEFINED,
                                **inject):
    projection = compute_employee_tds_projection(
        org=org, employee=employee, fy=fy, tds_config=tds_config, existing_tds=existing_tds,
        tax_regime=tax_regime, declared_deductions=declared_deductions, hra_details=None,
        other_income=None, it_declaration_override=it_declaration, **inject)
    deductions_applied = compute_effective_deductions_total(
        projection["normalizedDeductions"], projection["hraExemption"], tds_config,
        projection["effectiveRegime"], num0(g(projection["section10"], "total")),
        projection["capOptions"])
    return {
        "taxRegime": projection["effectiveRegime"],
        "projectedAnnualIncome": projection["annualIncome"],
        "declaredDeductions": {**projection["normalizedDeductions"],
                               "standardDeduction": projection["standardDeductionApplied"],
                               "total": deductions_applied},
        "hraExemption": projection["hraExemption"],
        "section10Exemptions": projection["section10"],
        "taxableIncome": projection["taxableIncome"],
        "taxPayable": projection["taxCalculation"],
        "rebateApplicable": projection["taxCalculation"]["rebateApplicable"],
        "rebateAmount": projection["taxCalculation"]["rebateAmount"],
        "monthlyTDS": projection["monthlyTDS"],
    }


# =====================================================================================
# Declaration parsing / sanitising
# =====================================================================================


def parse_investment_request_body(body=UNDEFINED):
    body = {} if body is UNDEFINED or body is None else body
    parsed = dict(body)
    for field_name in ("investments80C", "investments80D", "itDeclaration", "declaredDeductions"):
        if field_name in body:
            parsed[field_name] = parse_json_field(body[field_name], field_name)
    return parsed


def parse_json_field(value, field_name):
    if value is None or value is UNDEFINED or not isinstance(value, str):
        return value
    trimmed = js_trim(value)
    if not trimmed or (not trimmed.startswith("{") and not trimmed.startswith("[")):
        return value
    try:
        return json.loads(trimmed)
    except ValueError:
        raise PayrollError(f"{field_name} must be valid JSON", 400) from None


def upload_investment_declaration_files(org_id, files=None):
    """Store multipart attachments (legacy multer field names) -> legacy URL lists."""
    from ..services.files import save_upload

    def upload(field):
        if files is None:
            return []
        urls = []
        for f in files.getlist(field):
            uploaded = save_upload(org_id, f, "tds_proofs")
            if uploaded.get("url"):
                urls.append(uploaded["url"])
        return urls

    rent = upload("rentAttachments")
    home = upload("homeLoanAttachment")
    let_out = upload("letOutPropertyAttachment")
    inv80c = upload("investment80CAttachments")
    inv80d = upload("investment80DAttachments")
    other_inv = upload("otherInvestmentAttachments")
    other_income = upload("otherIncomeAttachment")
    return {
        "rentAttachments": rent,
        "homeLoanAttachment": home[0] if home else "",
        "letOutPropertyAttachment": let_out[0] if let_out else "",
        "investment80CAttachments": inv80c,
        "investment80DAttachments": inv80d,
        "otherInvestmentAttachments": other_inv,
        "otherIncomeAttachment": other_income[0] if other_income else "",
    }


def normalize_attachment(value=UNDEFINED):
    return js_trim(js_str(js_nc(value, "")))[:2048]


def pick_attachment(current_value=UNDEFINED, uploaded_value=UNDEFINED, fallback_value=""):
    if fallback_value is UNDEFINED:
        fallback_value = ""
    return normalize_attachment(js_or(uploaded_value, current_value, fallback_value))


def parse_boolean_value(value=UNDEFINED):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        normalized = js_trim(value).lower()
        if normalized in ("true", "1", "yes", "y", "on"):
            return True
        if normalized in ("false", "0", "no", "n", "off", ""):
            return False
    return js_truthy(value)


def normalize_proof_status(status=UNDEFINED):
    normalized = js_trim(js_str(js_or(status, ""))).lower()
    if normalized in ("approved", "approve", "verified", "verify"):
        return "approved"
    if normalized in ("rejected", "reject"):
        return "rejected"
    return None


def default_it_declaration():
    return {
        "stayingInRentedHouse": False,
        "rentEntries": [],
        "homeLoanSelfOccupied": {"enabled": False, "principalPaid": 0, "interestPaid": 0,
                                 "lenderName": "", "lenderPAN": "", "attachment": ""},
        "letOutPropertyEnabled": False,
        "letOutPropertyAttachment": "",
        "investmentsOther": [],
        "otherIncomeBreakdown": {"incomeFromOtherSources": 0, "interestSavings": 0, "interestFD": 0,
                                 "interestNSC": 0, "attachment": ""},
        "toggles": {"section80C": True, "section80D": True, "otherInvestments": False},
        "salaryExemptions": {
            "childrenCount": 0, "childrenEducationReceived": 0, "hostelAllowanceReceived": 0,
            "ltaEligibleTravel": 0, "disabledTransportReceived": 0, "gratuityReceived": 0,
            "leaveEncashmentReceived": 0, "retrenchmentReceived": 0, "vrsReceived": 0,
            "officialDutySpent": 0, "lifeInsuranceExempt": 0,
        },
        "chapterVIA": {
            "section80CCC": 0, "section80CCD1": 0, "section80CCD1B": 0, "section80CCD2": 0,
            "section80DD": 0, "section80DDSevere": False, "section80DDB": 0, "section80EE": 0,
            "section80EEA": 0, "section80GG": 0, "section80GGA": 0, "section80GGC": 0,
            "section80TTA": 0,
        },
    }


def to_plain_it_declaration(doc=UNDEFINED):
    if not js_truthy(doc):
        return {}
    return _plain(doc)


def merge_it_declaration(prev_raw=UNDEFINED, incoming=UNDEFINED, uploaded_attachments=UNDEFINED):
    up = {} if uploaded_attachments is UNDEFINED or uploaded_attachments is None else uploaded_attachments
    base = {**default_it_declaration(), **to_plain_it_declaration(prev_raw)}
    base["homeLoanSelfOccupied"] = {**default_it_declaration()["homeLoanSelfOccupied"],
                                    **_as_spread(to_plain_it_declaration(base["homeLoanSelfOccupied"]))}
    base["otherIncomeBreakdown"] = {**default_it_declaration()["otherIncomeBreakdown"],
                                    **_as_spread(to_plain_it_declaration(base["otherIncomeBreakdown"]))}
    base["toggles"] = {**default_it_declaration()["toggles"],
                       **_as_spread(to_plain_it_declaration(base["toggles"]))}
    base["rentEntries"] = (sanitize_rent_entries(base["rentEntries"], up.get("rentAttachments", UNDEFINED),
                                                 base["rentEntries"])
                           if isinstance(base["rentEntries"], list) else [])
    base["investmentsOther"] = (sanitize_other_investment_lines(
        base["investmentsOther"], up.get("otherInvestmentAttachments", UNDEFINED), base["investmentsOther"])
        if isinstance(base["investmentsOther"], list) else [])

    if js_truthy(up.get("homeLoanAttachment")):
        base["homeLoanSelfOccupied"]["attachment"] = up["homeLoanAttachment"]
    if js_truthy(up.get("letOutPropertyAttachment")):
        base["letOutPropertyAttachment"] = up["letOutPropertyAttachment"]
    if js_truthy(up.get("otherIncomeAttachment")):
        base["otherIncomeBreakdown"]["attachment"] = up["otherIncomeAttachment"]

    if not js_truthy(incoming) or not _is_obj(incoming):
        return base

    inc = incoming

    def has(key):
        return g(inc, key) is not UNDEFINED

    if has("stayingInRentedHouse"):
        base["stayingInRentedHouse"] = parse_boolean_value(g(inc, "stayingInRentedHouse"))
    if has("rentEntries"):
        base["rentEntries"] = sanitize_rent_entries(g(inc, "rentEntries"), up.get("rentAttachments", UNDEFINED),
                                                    base["rentEntries"])
    if has("letOutPropertyEnabled"):
        base["letOutPropertyEnabled"] = parse_boolean_value(g(inc, "letOutPropertyEnabled"))
    if has("letOutPropertyAttachment") or js_truthy(up.get("letOutPropertyAttachment")):
        base["letOutPropertyAttachment"] = pick_attachment(
            g(inc, "letOutPropertyAttachment"), up.get("letOutPropertyAttachment", UNDEFINED),
            base["letOutPropertyAttachment"])
    if has("investmentsOther"):
        base["investmentsOther"] = sanitize_other_investment_lines(
            g(inc, "investmentsOther"), up.get("otherInvestmentAttachments", UNDEFINED), base["investmentsOther"])

    h = g(inc, "homeLoanSelfOccupied")
    if not is_nullish(h):
        cur = dict(base["homeLoanSelfOccupied"])
        if g(h, "enabled") is not UNDEFINED:
            cur["enabled"] = parse_boolean_value(g(h, "enabled"))
        if g(h, "principalPaid") is not UNDEFINED:
            cur["principalPaid"] = max(0.0, num0(g(h, "principalPaid")))
        if g(h, "interestPaid") is not UNDEFINED:
            cur["interestPaid"] = max(0.0, num0(g(h, "interestPaid")))
        if g(h, "lenderName") is not UNDEFINED:
            cur["lenderName"] = js_trim(js_str(js_or(g(h, "lenderName"), "")))[:200]
        if g(h, "lenderPAN") is not UNDEFINED:
            cur["lenderPAN"] = js_trim(js_str(js_or(g(h, "lenderPAN"), "")))[:20].upper()
        if (g(h, "attachment") is not UNDEFINED or g(h, "attachmentUrl") is not UNDEFINED
                or js_truthy(up.get("homeLoanAttachment"))):
            cur["attachment"] = pick_attachment(js_nc(g(h, "attachment"), g(h, "attachmentUrl")),
                                                up.get("homeLoanAttachment", UNDEFINED), cur.get("attachment", UNDEFINED))
        base["homeLoanSelfOccupied"] = cur

    oib = g(inc, "otherIncomeBreakdown")
    if not is_nullish(oib):
        base["otherIncomeBreakdown"] = {
            **base["otherIncomeBreakdown"],
            **sanitize_other_income_breakdown(oib, up.get("otherIncomeAttachment", UNDEFINED),
                                              base["otherIncomeBreakdown"]),
        }

    t = g(inc, "toggles")
    if not is_nullish(t):
        for key in ("section80C", "section80D", "otherInvestments"):
            if g(t, key) is not UNDEFINED:
                base["toggles"][key] = parse_boolean_value(g(t, key))

    se = g(inc, "salaryExemptions")
    if not is_nullish(se):
        defaults = default_it_declaration()["salaryExemptions"]
        current = {**defaults, **_as_spread(to_plain_it_declaration(base.get("salaryExemptions", UNDEFINED)))}
        incoming_ex = to_plain_it_declaration(se)
        for key in defaults:
            if g(incoming_ex, key) is not UNDEFINED:
                current[key] = max(0.0, num0(g(incoming_ex, key)))
        base["salaryExemptions"] = current

    ch = g(inc, "chapterVIA")
    if not is_nullish(ch):
        defaults = default_it_declaration()["chapterVIA"]
        current = {**defaults, **_as_spread(to_plain_it_declaration(base.get("chapterVIA", UNDEFINED)))}
        incoming_ch = to_plain_it_declaration(ch)
        for key in defaults:
            if g(incoming_ch, key) is UNDEFINED:
                continue
            current[key] = (parse_boolean_value(g(incoming_ch, key)) if key == "section80DDSevere"
                            else max(0.0, num0(g(incoming_ch, key))))
        base["chapterVIA"] = current

    return base


def _as_spread(value):
    """Object spread source (``{...value}``): arrays spread their indices, strings chars."""
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return {str(i): v for i, v in enumerate(value)}
    if isinstance(value, str):
        return {str(i): c for i, c in enumerate(value)}
    return {}


def _clamp_money(value):
    return max(0.0, min(num0(value), 1e12))


def _list_at(lst, index):
    if isinstance(lst, list) and 0 <= index < len(lst):
        return lst[index]
    return UNDEFINED


def sanitize_rent_entries(raw, uploaded_attachments=UNDEFINED, fallback_lines=UNDEFINED):
    up = [] if is_nullish(uploaded_attachments) else uploaded_attachments
    fb = [] if is_nullish(fallback_lines) else fallback_lines
    if not isinstance(raw, list):
        return []
    out = []
    for index, r in enumerate(raw[:MAX_RENT_ENTRIES]):
        out.append({
            "fromDate": js_trim(js_str(js_nc(g(r, "fromDate"), "")))[:32],
            "toDate": js_trim(js_str(js_nc(g(r, "toDate"), "")))[:32],
            "rentMonthly": _clamp_money(g(r, "rentMonthly")),
            "rentAnnual": _clamp_money(g(r, "rentAnnual")),
            "address": js_trim(js_str(js_nc(g(r, "address"), "")))[:2000],
            "landlordName": js_trim(js_str(js_nc(g(r, "landlordName"), "")))[:200],
            "urbanizationType": js_trim(js_str(js_nc(g(r, "urbanizationType"), "")))[:128],
            "urbanizationType2": js_trim(js_str(js_nc(g(r, "urbanizationType2"), "")))[:128],
            "isMetroCity": parse_boolean_value(g(r, "isMetroCity")),
            "attachment": pick_attachment(
                js_nc(js_nc(g(r, "attachment"), g(r, "attachmentUrl")), g(r, "proofUrl")),
                _list_at(up, index), g(_list_at(fb, index), "attachment")),
        })
    return out


def sanitize_other_income_breakdown(raw, uploaded_attachment="", fallback=UNDEFINED):
    fb = {} if fallback is UNDEFINED else fallback
    d = default_it_declaration()["otherIncomeBreakdown"]
    if not js_truthy(raw) or not _is_obj(raw):
        return d
    return {
        "incomeFromOtherSources": _clamp_money(g(raw, "incomeFromOtherSources")),
        "interestSavings": _clamp_money(g(raw, "interestSavings")),
        "interestFD": _clamp_money(g(raw, "interestFD")),
        "interestNSC": _clamp_money(g(raw, "interestNSC")),
        "attachment": pick_attachment(js_nc(g(raw, "attachment"), g(raw, "attachmentUrl")),
                                      uploaded_attachment, g(fb, "attachment")),
    }


def _sanitize_lines(raw, uploaded_attachments, fallback_lines, limit):
    up = [] if is_nullish(uploaded_attachments) else uploaded_attachments
    fb = [] if is_nullish(fallback_lines) else fallback_lines
    if not isinstance(raw, list):
        return []
    out = []
    for index, item in enumerate(raw[:limit]):
        out.append({
            "investmentType": js_trim(js_str(js_nc(js_nc(g(item, "investmentType"), g(item, "type")), "")))[:128],
            "amount": _clamp_money(g(item, "amount")),
            "attachment": pick_attachment(
                js_nc(js_nc(g(item, "attachment"), g(item, "attachmentUrl")), g(item, "proofUrl")),
                _list_at(up, index), g(_list_at(fb, index), "attachment")),
        })
    return out


def sanitize_other_investment_lines(raw, uploaded_attachments=UNDEFINED, fallback_lines=UNDEFINED):
    return _sanitize_lines(raw, uploaded_attachments, fallback_lines, MAX_OTHER_INVESTMENT_LINES)


def sanitize_investment_lines(raw, uploaded_attachments=UNDEFINED, fallback_lines=UNDEFINED):
    return _sanitize_lines(raw, uploaded_attachments, fallback_lines, MAX_INVESTMENT_LINES)


def sanitize_proof_items(raw):
    if not isinstance(raw, list):
        return []
    allowed = {"pending", "approved", "rejected"}
    out = []
    for item in raw[:300]:
        status = g(item, "status")
        row = {
            "lineKey": js_trim(js_str(js_or(g(item, "lineKey"), "")))[:80],
            "sectionName": js_trim(js_str(js_or(g(item, "sectionName"), "")))[:120],
            "deductionHead": js_trim(js_str(js_or(g(item, "deductionHead"), "")))[:160],
            "requestedAmount": _clamp_money(g(item, "requestedAmount")),
            "acceptedAmount": _clamp_money(g(item, "acceptedAmount")),
            "status": status if isinstance(status, str) and status in allowed else "pending",
            "remark": js_trim(js_str(js_or(g(item, "remark"), "")))[:500],
        }
        if row["lineKey"]:
            out.append(row)
    return out


def sum_line_amounts(lines):
    total = 0.0
    for row in lines:
        total += num0(g(row, "amount")) if row is not None else _raise_null("amount")
    return total


def _raise_null(key):
    raise TypeError(f"Cannot read properties of null (reading '{key}')")


def map_doc_investment_lines(doc_lines):
    if not isinstance(doc_lines, list):
        return []
    return [{
        "investmentType": js_trim(js_str(js_nc(g(x, "investmentType"), "")))[:128],
        "amount": _clamp_money(g(x, "amount")),
        "attachment": normalize_attachment(g(x, "attachment")),
    } for x in doc_lines[:MAX_INVESTMENT_LINES]]


def compute_declared_deductions_total(d):
    total = 0.0
    for key in ("section80C", "section80D", "section80E", "section80G", "section24",
                "professionalTax", "otherDeductions", "standardDeduction"):
        total += num0(g(d, key))
    return total


def get_other_income_from_it_declaration(it_declaration=UNDEFINED):
    obd = js_or(g(it_declaration, "otherIncomeBreakdown"), {})
    return (num0(g(obd, "incomeFromOtherSources")) + num0(g(obd, "interestSavings"))
            + num0(g(obd, "interestFD")) + num0(g(obd, "interestNSC")))


def build_exemptions_based_on_declaration(declared_deductions=UNDEFINED, hra_exemption=UNDEFINED,
                                          tds_config=UNDEFINED, cap_options=UNDEFINED):
    """Old-regime exemption lines for the Save & Compare UI."""
    dd = {} if declared_deductions is UNDEFINED else declared_deductions
    cfg = {} if tds_config is UNDEFINED else tds_config
    co = {} if cap_options is UNDEFINED else cap_options
    raw80_c_limit = to_number(g(cfg, "section80CLimit"))
    section80_c_limit = raw80_c_limit if (math.isfinite(raw80_c_limit) and raw80_c_limit >= 0) else 150000
    standard = get_standard_deduction_for_regime(cfg, "old")
    professional_tax = num0(g(dd, "professionalTax"))
    capped = apply_capped_deductions_for_tax(dd, cfg, {**co, "taxRegime": "old"})
    allowance_exemptions = max(0.0, num0(g(hra_exemption, "exemptAmount")))
    under_section16 = standard + professional_tax
    investments80_c = capped["section80C"]
    investments80_d = capped["section80D"]
    other = capped["section80E"] + capped["section80G"] + capped["section24"] + capped["otherDeductions"]
    total = allowance_exemptions + under_section16 + investments80_c + investments80_d + other
    return {
        "allowanceExemptions": allowance_exemptions,
        "underSection16": under_section16,
        "investments80C": investments80_c,
        "investments80CMaxLimit": section80_c_limit,
        "investments80D": investments80_d,
        "otherInvestmentAndExemption": other,
        "totalExemptions": total,
    }


def build_save_and_compare_summary_from(employee, fy, tds_config, implementation_date,
                                        declared_deductions=UNDEFINED, it_declaration=UNDEFINED,
                                        earnings_config=UNDEFINED, org=None):
    """Pure core of ``buildSaveAndCompareSummary`` (employee / config already loaded)."""
    dd = {} if declared_deductions is UNDEFINED else declared_deductions
    itd = {} if it_declaration is UNDEFINED else it_declaration
    tds_period = get_tds_calculation_period(fy, implementation_date)
    payroll_months = tds_period["equivalentMonths"]
    hra_received = calculate_hra_received_from_salary_components(employee, org, payroll_months, earnings_config)
    hra_details = build_hra_details_from_declaration({}, itd, g(fy, "startYear"), tds_period["periodStart"])
    annual_income = calculate_annual_income(employee, get_other_income_from_it_declaration(itd),
                                            hra_received["annualAmount"], payroll_months)
    hra_exemption = calculate_hra_exemption(annual_income["basic"], annual_income["hra"], hra_details,
                                            payroll_months)
    compare_as_of = js_local_date(_num(g(fy, "endYear")), 2, 31) if js_truthy(g(fy, "endYear")) else None
    pi = g(employee, "payrollInfo")
    doj = g(employee, "dateOfJoining")
    compare_service = {
        "monthlySalary": to_number(js_or(g(pi, "baseSalary"), g(employee, "baseSalary"), 0)),
        "yearsAct": completed_service_years(doj, compare_as_of, True) if compare_as_of else None,
        "yearsPlain": completed_service_years(doj, compare_as_of, False) if compare_as_of else None,
    }
    section10_old = calculate_section10_exemptions(employee, itd, "old", payroll_months, tds_config, compare_service)
    section10_new = calculate_section10_exemptions(employee, itd, "new", payroll_months, tds_config, compare_service)
    compare_age = get_employee_age_for_fy(employee, fy)
    interest = js_or(g(itd, "otherIncomeBreakdown"), {})
    compare_cap = {
        "annualBasic": annual_income["basic"],
        "annualTotal": annual_income["total"],
        "annualHra": annual_income["hra"],
        "annualRent": js_or(hra_exemption["rentPaid"], 0),
        "age": compare_age,
        "payrollMonths": payroll_months,
        "fyStartYear": g(fy, "startYear"),
        "interestSavings": g(interest, "interestSavings"),
        "interestFD": g(interest, "interestFD"),
        "assesseeDisabled": is_specified_disabled_employee(employee),
        "assesseeSevere": "severe" in js_str(js_or(g(g(employee, "handicappedInfo"), "disabilityType"), "")).lower(),
    }
    new_cap = {**compare_cap, "annualHra": 0}
    old_deductions = compute_effective_deductions_total(dd, hra_exemption, tds_config, "old",
                                                        section10_old["total"], compare_cap)
    new_deductions = compute_effective_deductions_total(dd, {"exemptAmount": 0}, tds_config, "new",
                                                        section10_new["total"], new_cap)
    old_taxable = calculate_taxable_income(annual_income, dd, hra_exemption, tds_config, "old",
                                           section10_old["total"], compare_cap)
    new_taxable = calculate_taxable_income(annual_income, dd, {"exemptAmount": 0}, tds_config, "new",
                                           section10_new["total"], new_cap)
    employee_age = get_employee_age_for_fy(employee, fy)
    old_tax = calculate_tax(old_taxable, "old", tds_config, {"age": employee_age})
    new_tax = calculate_tax(new_taxable, "new", tds_config)
    recommended = "old" if old_tax["total"] <= new_tax["total"] else "new"
    exemptions = build_exemptions_based_on_declaration(dd, hra_exemption, tds_config, compare_cap)
    return {
        "financialYear": g(fy, "canonical"),
        "earnings": {
            "grossSalary": annual_income["gross"],
            "incomeFromOtherSources": annual_income["otherIncome"],
            "grossTotalIncome": annual_income["total"],
        },
        "oldRegime": {
            "exemptionsBasedOnDeclaration": exemptions,
            "totalExemptions": old_deductions,
            "totalTaxableIncome": old_taxable,
            "taxOnTotalTaxableIncome": old_tax["incomeTax"],
            "rebateUnderSection87A": old_tax["rebateAmount"],
            "educationCess4Percent": old_tax["cess"],
            "totalTaxPayable": old_tax["total"],
        },
        "newRegime": {
            "totalExemptions": new_deductions,
            "totalTaxableIncome": new_taxable,
            "taxOnTotalTaxableIncome": new_tax["incomeTax"],
            "rebateUnderSection87A": new_tax["rebateAmount"],
            "educationCess4Percent": new_tax["cess"],
            "totalTaxPayable": new_tax["total"],
        },
        "recommendedRegime": recommended,
        "taxSavingAmount": abs(old_tax["total"] - new_tax["total"]),
    }


# =====================================================================================
# ORM helpers
# =====================================================================================


def _valid_uuid(value):
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def parse_fy_request(financial_year):
    """Legacy ``parseFYRequest``: 400 'Financial year is required' / invalid-format error."""
    if not js_truthy(financial_year):
        raise PayrollError("Financial year is required", 400)
    fy = resolve_financial_year_input(financial_year)
    if not fy["ok"]:
        raise PayrollError(fy["error"], 400)
    return fy


def parse_employee_id_param(employee_id):
    if not employee_id or not _valid_uuid(employee_id):
        raise PayrollError("Invalid employee id", 400)
    return employee_id


def employee_doc(emp):
    """Legacy employee document for the calculation helpers (``emp.to_dict()``).

    A null ``dateOfJoining`` is treated as absent (legacy Mongo documents omitted the field;
    ``new Date(null)`` would otherwise count service from 1970)."""
    if emp is None:
        return None
    doc = emp.to_dict()
    if doc.get("dateOfJoining") is None:
        doc.pop("dateOfJoining", None)
    return doc


def _cast_number(value, path):
    n = to_number(value)
    if math.isnan(n):
        raise PayrollError(f'Cast to Number failed for value "{js_str(value)}" at path "{path}"', 500)
    return clean(n)


def _cast_slabs(slabs, rate_key):
    if not isinstance(slabs, list):
        return slabs
    out = []
    for slab in slabs:
        if not isinstance(slab, dict):
            out.append(slab)
            continue
        row = dict(slab)
        for key in ("incomeFrom", "incomeTo", rate_key):
            if key in row and row[key] is not None:
                row[key] = _cast_number(row[key], key)
        out.append(row)
    return out


def create_default_tds_config(org, financial_year):
    from ..models import TDSConfig

    config = TDSConfig(
        org=org, financial_year=financial_year, tax_regime="new",
        new_regime_slabs=get_default_new_regime_slabs(),
        old_regime_slabs=get_default_old_regime_slabs(),
        old_regime_slabs_senior=get_default_old_regime_slabs_senior(),
        old_regime_slabs_super_senior=get_default_old_regime_slabs_super_senior(),
        standard_deduction=75000, standard_deduction_old=50000, section80_c_limit=150000,
        surcharge_slabs=get_default_surcharge_slabs(),
        surcharge_slabs_old=get_default_surcharge_slabs_old(),
        health_education_cess=4, rebate_limit=1200000, rebate_amount=60000,
        rebate_limit_old=500000, rebate_amount_old=12500,
        exemption_limits=get_default_exemption_limits(),
    )
    config.save()
    return config


def find_tds_config_by_fy(org, fy, create_if_missing=False):
    from ..models import TDSConfig

    config = (TDSConfig.objects.filter(org=org, financial_year__in=fy["aliases"])
              .order_by("created_at").first())
    if config is None and create_if_missing:
        config = create_default_tds_config(org, fy["canonical"])
    return config


def upgrade_tds_config_to_fy202627(config):
    changed = False
    completed = complete_new_regime_slabs(config.new_regime_slabs)
    if completed and completed is not config.new_regime_slabs:
        config.new_regime_slabs = completed
        changed = True
    surcharge = normalize_new_surcharge_slabs(config.surcharge_slabs)
    if surcharge and surcharge is not config.surcharge_slabs:
        config.surcharge_slabs = surcharge
        changed = True
    if not config.surcharge_slabs_old:
        config.surcharge_slabs_old = get_default_surcharge_slabs_old()
        changed = True
    if config.health_education_cess is None:
        config.health_education_cess = 4
        changed = True
    if not config.old_regime_slabs_senior:
        config.old_regime_slabs_senior = get_default_old_regime_slabs_senior()
        changed = True
    if not config.old_regime_slabs_super_senior:
        config.old_regime_slabs_super_senior = get_default_old_regime_slabs_super_senior()
        changed = True
    if changed:
        config.save()
    return config


def _config_doc(config):
    return config.to_dict() if config is not None else None


def _find_tds(org, employee_id, fy, lock=False):
    from ..models import EmployeeTDS

    if not _valid_uuid(employee_id):
        return None
    qs = EmployeeTDS.objects.filter(org=org, employee_id=employee_id, financial_year__in=fy["aliases"])
    if lock:
        qs = qs.select_for_update()
    return qs.order_by("created_at").first()


def _strict(value, node):
    """Mongoose ``strict`` casting of a nested value: unknown keys of schema objects dropped."""
    from ..models.base import Arr, Obj

    if isinstance(node, Obj) and isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k in node.fields:
                out[k] = _strict(v, node.fields[k])
        return out
    if isinstance(node, Arr) and isinstance(value, list) and isinstance(node.item, Obj):
        out = []
        for item in value:
            if isinstance(item, dict):
                kept = _strict(item, node.item)
                if "_id" in item:
                    kept = {"_id": item["_id"], **kept}
                out.append(kept)
            else:
                out.append(item)
        return out
    return value


_TDS_ATTRS = {
    "taxRegime": "tax_regime", "projectedAnnualIncome": "projected_annual_income",
    "declaredDeductions": "declared_deductions", "investments80C": "investments80_c",
    "investments80D": "investments80_d", "itDeclaration": "it_declaration",
    "hraExemption": "hra_exemption", "section10Exemptions": "section10_exemptions",
    "taxableIncome": "taxable_income", "taxPayable": "tax_payable",
    "rebateApplicable": "rebate_applicable", "rebateAmount": "rebate_amount",
    "incomeBreakdown": "income_breakdown", "monthlyTDS": "monthly_tds", "tdsPeriod": "tds_period",
    "fullYearComparison": "full_year_comparison", "monthlyDeductions": "monthly_deductions",
    "totalTDSDeducted": "total_tds_deducted", "proofItems": "proof_items",
    "proofSubmitted": "proof_submitted", "proofVerified": "proof_verified",
    "proofStatus": "proof_status", "proofRemarks": "proof_remarks",
    "proofReviewedBy": "proof_reviewed_by", "proofReviewedAt": "proof_reviewed_at",
    "isLocked": "is_locked", "adminCalculated": "admin_calculated",
    "hasInvestmentDeclaration": "has_investment_declaration", "financialYear": "financial_year",
}


def _set_tds_fields(record, values):
    """Mongo ``$set`` of legacy keys onto an ``EmployeeTDS`` row (cast like Mongoose)."""
    for key, value in values.items():
        if key in ("organizationId", "employeeId"):
            continue
        if "." in key:  # dotted path inside a JSON column ('itDeclaration.salaryExemptions')
            from ..models.base import Obj

            head, sub = key.split(".", 1)
            attr = _TDS_ATTRS[head]
            current = dict(getattr(record, attr) or {})
            stored = _jsonify(value)
            node = record.JSON_SCHEMAS.get(attr)
            sub_node = node.fields.get(sub) if isinstance(node, Obj) else None
            if isinstance(sub_node, Obj) and isinstance(stored, dict):
                # Mongoose casts the $set value against the nested schema: unknown keys
                # dropped, Number leaves cast ("2" -> 2, "" -> null, "abc" -> CastError).
                stored = _strict(stored, sub_node)
                for k, spec in sub_node.fields.items():
                    if (k in stored and stored[k] is not None and isinstance(spec, (int, float))
                            and not isinstance(spec, bool)):
                        stored[k] = None if stored[k] == "" else _cast_number(stored[k], f"{key}.{k}")
            current[sub] = stored
            setattr(record, attr, current)
            continue
        attr = _TDS_ATTRS[key]
        field = record._meta.get_field(attr)
        if field.get_internal_type() == "JSONField":
            node = record.JSON_SCHEMAS.get(attr)
            stored = _jsonify(value)
            setattr(record, attr, _strict(stored, node) if node is not None else stored)
        elif field.get_internal_type() == "FloatField":
            setattr(record, attr, 0 if value is None else float(num0(value)))
        elif field.get_internal_type() == "BooleanField":
            setattr(record, attr, value if value is None and field.null else bool(js_truthy(value)))
        else:
            setattr(record, attr, value)
    record.apply_schema()


def _upsert_tds(org, employee_id, fy, values):
    """``findOneAndUpdate({org, employeeId, financialYear: {$in: aliases}}, {$set}, {upsert, new})``."""
    from ..models import EmployeeTDS

    with transaction.atomic():
        record = _find_tds(org, employee_id, fy, lock=True)
        if record is None:
            record = EmployeeTDS(org=org, employee_id=employee_id, financial_year=fy["canonical"])
        _set_tds_fields(record, values)
        record.save()
    return record


def _audit(ctx, record=None, employee=None, remarks="", action="tds_calculated", entity_type="tds",
           before=None, after=None):
    from ..services.audit_log import log_payroll_action

    log_payroll_action(ctx, action=action, entity_type=entity_type,
                       entity_id=str(record.pk) if record is not None else "",
                       affected_employee=employee, before_data=before, after_data=after, remarks=remarks)


def _employee_for_tds(ctx, employee_id):
    """PayrollEmployee row for ``employee_id`` in scope (None when absent)."""
    from ..models import PayrollEmployee

    if not _valid_uuid(employee_id):
        return None
    if ctx.is_employee:
        return ctx.employee if ctx.employee and str(ctx.employee.pk) == str(employee_id) else None
    return PayrollEmployee.objects.filter(org=ctx.require_org(), pk=employee_id).first()


def _require_self(ctx):
    if ctx.employee is None:
        raise PayrollError("Employee id missing from token", 401)
    return ctx.employee


def _populate_employee(emp, fields):
    if emp is None:
        return None
    full = emp.to_dict()
    out = {"_id": full["_id"]}
    for f in fields:
        if f.startswith("payrollInfo."):
            sub = f.split(".", 1)[1]
            pi = full.get("payrollInfo") or {}
            out.setdefault("payrollInfo", {})
            if sub in pi:
                out["payrollInfo"][sub] = pi[sub]
        elif f in full:
            out[f] = full[f]
    return out


def build_save_and_compare_summary(org, employee_id, fy, declared_deductions=UNDEFINED,
                                   it_declaration=UNDEFINED):
    from ..models import PayrollEmployee
    from ..services.employee_implementation_date import resolve_employee_implementation_date

    emp = PayrollEmployee.objects.filter(org=org, pk=employee_id).first() if _valid_uuid(employee_id) else None
    if emp is None:
        return None
    config = find_tds_config_by_fy(org, fy, create_if_missing=True)
    employee = employee_doc(emp)
    implementation = resolve_employee_implementation_date(employee=employee, organization_id=org)
    return build_save_and_compare_summary_from(employee, fy, _config_doc(config), implementation,
                                               declared_deductions, it_declaration, org=org)


def _projection_kwargs(ctx_org, emp, fy, config_doc, existing_doc, **extra):
    return dict(org=ctx_org, employee=employee_doc(emp), fy=fy, tds_config=config_doc,
                existing_tds=existing_doc, **extra)


# =====================================================================================
# TDS Configuration APIs
# =====================================================================================


@payroll_view(["POST"])
def create_or_update_tds_config(ctx):
    org = ctx.require_org()
    body = ctx.body
    fy = parse_fy_request(body.get("financialYear"))

    def b(key):
        return body.get(key, UNDEFINED)

    def nc_num(key, default):
        v = b(key)
        return default if is_nullish(v) else _cast_number(v, key)

    def length_or(value, default):
        return value if isinstance(value, list) and len(value) else default

    from ..models import TDSConfig

    values = dict(
        financial_year=fy["canonical"],
        tax_regime=js_or(b("taxRegime"), "new"),
        new_regime_slabs=_cast_slabs(complete_new_regime_slabs(b("newRegimeSlabs"))
                                     or get_default_new_regime_slabs(), "taxRate"),
        old_regime_slabs=_cast_slabs(js_or(b("oldRegimeSlabs"), get_default_old_regime_slabs()), "taxRate"),
        old_regime_slabs_senior=_cast_slabs(length_or(b("oldRegimeSlabsSenior"),
                                                      get_default_old_regime_slabs_senior()), "taxRate"),
        old_regime_slabs_super_senior=_cast_slabs(length_or(b("oldRegimeSlabsSuperSenior"),
                                                            get_default_old_regime_slabs_super_senior()), "taxRate"),
        standard_deduction=nc_num("standardDeduction", 75000),
        section80_c_limit=nc_num("section80CLimit", 150000),
        surcharge_slabs=_cast_slabs(normalize_new_surcharge_slabs(b("surchargeSlabs"))
                                    or get_default_surcharge_slabs(), "surchargeRate"),
        surcharge_slabs_old=_cast_slabs(length_or(b("surchargeSlabsOld"), get_default_surcharge_slabs_old()),
                                        "surchargeRate"),
        health_education_cess=nc_num("healthEducationCess", 4),
        rebate_limit=nc_num("rebateLimit", 1200000),
        rebate_amount=nc_num("rebateAmount", 60000),
        standard_deduction_old=nc_num("standardDeductionOld", 50000),
        rebate_limit_old=nc_num("rebateLimitOld", 500000),
        rebate_amount_old=nc_num("rebateAmountOld", 12500),
        exemption_limits=get_exemption_limits({"exemptionLimits": b("exemptionLimits")}),
    )
    with transaction.atomic():
        config = (TDSConfig.objects.select_for_update()
                  .filter(org=org, financial_year__in=fy["aliases"]).order_by("created_at").first())
        before = config.to_dict() if config else None
        if config is None:
            config = TDSConfig(org=org)
        for attr, value in values.items():
            setattr(config, attr, value)
        config.save()
    _audit(ctx, config, remarks=f"TDS configuration saved for FY {fy['canonical']}",
           action="compliance_updated", entity_type="tds", before=before, after=config.to_dict())
    return send_response(200, True, "TDS configuration saved successfully", config.to_dict())


@payroll_view(["GET"])
def get_tds_config(ctx):
    org = ctx.require_org()
    fy = parse_fy_request(ctx.query("financialYear"))
    config = find_tds_config_by_fy(org, fy)
    if config is None:
        config = create_default_tds_config(org, fy["canonical"])
    else:
        config = upgrade_tds_config_to_fy202627(config)
    return send_response(200, True, "TDS configuration fetched successfully", config.to_dict())


# =====================================================================================
# Employee TDS APIs
# =====================================================================================

_TYPED_80D = ["section80DSelf", "section80DParents", "section80DPreventive", "section80DPreventiveSelf",
              "section80DPreventiveParents", "section80DMedicalSelf", "section80DMedicalParents"]


@payroll_view(["POST"])
def calculate_employee_tds(ctx, employeeId):
    org = ctx.require_org()
    body = ctx.body
    fy = parse_fy_request(body.get("financialYear"))
    emp = _employee_for_tds(ctx, employeeId)
    if emp is None:
        raise PayrollError("Employee not found", 404)

    config = find_tds_config_by_fy(org, fy, create_if_missing=True)
    config_doc = _config_doc(config)
    existing = _find_tds(org, employeeId, fy)
    existing_doc = existing.to_dict() if existing else None

    salary_exemptions = body.get("salaryExemptions", UNDEFINED)
    declared = body.get("declaredDeductions", UNDEFINED)
    investments80_d = body.get("investments80D", UNDEFINED)
    other_breakdown = body.get("otherIncomeBreakdown", UNDEFINED)

    stored_declaration = to_plain_it_declaration(g(existing_doc, "itDeclaration"))
    incoming_exemptions = salary_exemptions if js_truthy(salary_exemptions) and _is_obj(salary_exemptions) else None
    incoming_has_amount = bool(incoming_exemptions) and any(
        to_number(v) > 0 for v in (incoming_exemptions.values() if isinstance(incoming_exemptions, dict)
                                   else incoming_exemptions))
    lined80_d = aggregate80_d_from_lines(investments80_d)
    deductions_for_tax = dict(_as_spread(js_or(declared, {})))
    typed80_d = 0.0
    for key in _TYPED_80D:
        typed80_d += num0(deductions_for_tax.get(key, UNDEFINED))
    if lined80_d["declared"] > 0 and typed80_d == 0:
        deductions_for_tax.update({
            "section80DSelf": lined80_d["selfPremium"],
            "section80DParents": lined80_d["parentsPremium"],
            "section80DPreventiveSelf": lined80_d["preventiveSelf"],
            "section80DPreventiveParents": lined80_d["preventiveParents"],
            "section80DMedicalSelf": lined80_d["medicalSelf"],
            "section80DMedicalParents": lined80_d["medicalParents"],
            "section80DSelfSenior": lined80_d["selfSenior"],
            "section80DParentsSenior": lined80_d["parentsSenior"],
        })
    incoming_breakdown = other_breakdown if js_truthy(other_breakdown) and _is_obj(other_breakdown) else None
    if incoming_has_amount or incoming_breakdown:
        it_override = {
            **stored_declaration,
            "salaryExemptions": {**_as_spread(js_or(stored_declaration.get("salaryExemptions"), {})),
                                 **_as_spread(incoming_exemptions or {})},
            "otherIncomeBreakdown": {**_as_spread(js_or(stored_declaration.get("otherIncomeBreakdown"), {})),
                                     **_as_spread(incoming_breakdown or {})},
        }
    else:
        it_override = g(existing_doc, "itDeclaration")
        it_override = None if it_override is UNDEFINED else it_override

    common = _projection_kwargs(
        org, emp, fy, config_doc, existing_doc, tax_regime=body.get("taxRegime", UNDEFINED),
        declared_deductions=deductions_for_tax, hra_details=body.get("hraDetails", UNDEFINED),
        other_income=body.get("otherIncome", UNDEFINED), it_declaration_override=it_override)
    projection = compute_employee_tds_projection(**common)
    full_year_projection = compute_employee_tds_projection(**common, payroll_implementation_date=None)

    regime = projection["effectiveRegime"]
    deductions_applied = compute_effective_deductions_total(
        projection["normalizedDeductions"], projection["hraExemption"], config_doc, regime,
        js_or(g(projection["section10"], "total"), 0), projection["capOptions"])
    full_year_deductions = compute_effective_deductions_total(
        full_year_projection["normalizedDeductions"], full_year_projection["hraExemption"], config_doc,
        full_year_projection["effectiveRegime"], js_or(g(full_year_projection["section10"], "total"), 0),
        full_year_projection["capOptions"])
    full_year = summarize_tds_view(full_year_projection, full_year_deductions)
    tds_period = projection["tdsPeriod"]

    values = {
        "financialYear": fy["canonical"],
        "taxRegime": regime,
        "projectedAnnualIncome": projection["annualIncome"],
        "declaredDeductions": {**projection["normalizedDeductions"],
                               "standardDeduction": projection["standardDeductionApplied"],
                               "total": deductions_applied},
        "hraExemption": projection["hraExemption"],
        "section10Exemptions": projection["section10"],
    }
    if incoming_has_amount:
        values["itDeclaration.salaryExemptions"] = it_override["salaryExemptions"]
    values.update({
        "taxableIncome": projection["taxableIncome"],
        "taxPayable": projection["taxCalculation"],
        "rebateApplicable": projection["taxCalculation"]["rebateApplicable"],
        "rebateAmount": projection["taxCalculation"]["rebateAmount"],
        "monthlyTDS": projection["monthlyTDS"],
        "incomeBreakdown": projection["incomeBreakdown"],
        "tdsPeriod": {
            "start": tds_period["start"] or None,
            "end": tds_period["end"] or None,
            "equivalentMonths": js_or(tds_period["applicableMonths"], 0),
            "payrollImplementationDate": projection["payrollImplementationDate"] or None,
            "payrollScheduleDate": projection["payrollScheduleDate"] or None,
            "startDateSource": js_or(projection["startDateSource"], ""),
            "openingMonth": tds_period["openingMonth"] or None,
        },
        "fullYearComparison": {
            "gross": js_or(g(full_year["annualIncome"], "gross"), 0),
            "totalIncome": js_or(g(full_year["annualIncome"], "total"), 0),
            "deductions": js_or(full_year["deductionsApplied"], 0),
            "hraExemption": js_or(g(full_year["hraExemption"], "exemptAmount"), 0),
            "taxableIncome": js_or(full_year["taxableIncome"], 0),
            "taxPayable": js_or(g(full_year["taxCalculation"], "total"), 0),
            "monthlyTDS": js_or(full_year["monthlyTDS"], 0),
            "periodStart": js_or(g(full_year["tdsPeriod"], "start"), None),
            "periodEnd": js_or(g(full_year["tdsPeriod"], "end"), None),
        },
        "adminCalculated": True,
    })
    record = _upsert_tds(org, employeeId, fy, values)
    _audit(ctx, record, emp, remarks=f"TDS calculated for FY {fy['canonical']} ({regime} regime); "
                                     f"monthly TDS {js_str(projection['monthlyTDS'])}")

    data = {
        "employeeTDS": record.to_dict(),
        "breakdown": {
            "taxRegime": regime,
            "chapterVIADeductionsApplied": regime == "old",
            "hraReceived": projection["hraReceived"],
            "annualIncome": projection["annualIncome"],
            "hraExemption": projection["hraExemption"],
            "section10": projection["section10"],
            "standardDeduction": projection["standardDeductionApplied"],
            "chapterVIA": js_or(projection["cappedDeductions"],
                                apply_capped_deductions_for_tax(projection["normalizedDeductions"], config_doc)),
            "section80CLimit": js_nc(g(config_doc, "section80CLimit"), 150000),
            "exemptionLimits": get_exemption_limits(config_doc),
            "deductionsApplied": deductions_applied,
            "taxableIncome": projection["taxableIncome"],
            "taxCalculation": projection["taxCalculation"],
            "monthlyTDS": projection["monthlyTDS"],
            "remainingMonths": projection["remainingMonths"],
            "alreadyDeducted": projection["alreadyDeducted"],
            "loanPerquisite": projection["loanPerquisiteSummary"],
            "payrollImplementationDate": projection["payrollImplementationDate"],
            "incomeBreakdown": projection["incomeBreakdown"],
            "tdsPeriod": projection["tdsPeriod"],
        },
        "fullYear": full_year,
    }
    return send_response(200, True, "TDS calculated successfully", _jsonify(data))


@payroll_view(["GET"], access="any")
def get_employee_tds(ctx, employeeId):
    org = ctx.require_org()
    if ctx.is_employee:
        get_employee(ctx, employeeId)  # a worker may only read their own record
    fy = parse_fy_request(ctx.query("financialYear"))
    record = _find_tds(org, employeeId, fy)
    if record is None:
        return send_response(200, True, "No TDS declaration yet for this financial year", {
            "employeeId": employeeId, "financialYear": fy["canonical"], "taxRegime": "new",
            "investments80C": [], "investments80D": [], "itDeclaration": None,
            "declaredDeductions": None, "monthlyTDS": 0, "isNew": True,
        })

    emp = _employee_for_tds(ctx, employeeId)
    payload = record.to_dict()
    payload["employeeId"] = _populate_employee(emp, ["firstName", "lastName", "email", "payrollInfo"])
    try:
        config = find_tds_config_by_fy(org, fy) if emp is not None else None
        if emp is not None and config is not None:
            config_doc = _config_doc(config)
            existing_doc = record.to_dict()
            projection = compute_employee_tds_projection(**_projection_kwargs(
                org, emp, fy, config_doc, existing_doc, tax_regime=existing_doc["taxRegime"],
                declared_deductions=existing_doc["declaredDeductions"], hra_details=None,
                other_income=UNDEFINED, it_declaration_override=existing_doc["itDeclaration"]))
            deductions_applied = compute_effective_deductions_total(
                projection["normalizedDeductions"], projection["hraExemption"], config_doc,
                projection["effectiveRegime"], js_or(g(projection["section10"], "total"), 0),
                projection["capOptions"])
            payload["taxRegime"] = projection["effectiveRegime"]
            payload["projectedAnnualIncome"] = projection["annualIncome"]
            payload["declaredDeductions"] = {
                **(payload.get("declaredDeductions") or {}),
                **projection["normalizedDeductions"],
                "standardDeduction": projection["standardDeductionApplied"],
                "total": deductions_applied,
            }
            payload["hraExemption"] = projection["hraExemption"]
            payload["section10Exemptions"] = projection["section10"]
            payload["taxableIncome"] = projection["taxableIncome"]
            payload["taxPayable"] = projection["taxCalculation"]
            payload["rebateApplicable"] = projection["taxCalculation"]["rebateApplicable"]
            payload["rebateAmount"] = projection["taxCalculation"]["rebateAmount"]
            payload["monthlyTDS"] = projection["monthlyTDS"]
            payload["incomeBreakdown"] = projection["incomeBreakdown"]
    except Exception:  # noqa: BLE001 — legacy logged and returned the stored record
        import logging

        logging.getLogger("payroll_engine").exception("getEmployeeTDS projection")
    return send_response(200, True, "Employee TDS fetched successfully", _jsonify(payload))


@payroll_view(["GET"], access="any")
def get_employee_hra_for_tds(ctx, employeeId):
    from ..services.employee_implementation_date import resolve_employee_implementation_date

    org = ctx.require_org()
    emp = get_employee(ctx, employeeId) if ctx.is_employee else _employee_for_tds(ctx, employeeId)
    if emp is None:
        raise PayrollError("Employee not found", 404)
    financial_year = ctx.query("financialYear")
    fy = None
    if js_truthy(financial_year):
        fy = parse_fy_request(financial_year)
    employee = employee_doc(emp)
    implementation = resolve_employee_implementation_date(employee=employee, organization_id=org)
    payroll_months = get_tds_calculation_period(fy, implementation)["equivalentMonths"] if fy else 12
    hra_received = calculate_hra_received_from_salary_components(employee, org, payroll_months)
    return send_response(200, True, "HRA details fetched successfully", _jsonify({
        "employeeId": employeeId,
        "financialYear": (fy or {}).get("canonical") or financial_year or "",
        "hraReceived": hra_received,
    }))


def _tax_report_result(ctx, employee_id):
    from ..services.tax_report_builder import build_tax_report_data

    fy = parse_fy_request(ctx.query("financialYear"))  # noqa: F841 — legacy validated first
    result = build_tax_report_data(ctx.require_org(), employee_id, ctx.query("financialYear"))
    if result.get("error"):
        raise PayrollError(result["error"], result.get("status") or 400)
    return result


def _send_tax_report_pdf(result):
    from ..context import file_response
    from ..services.tax_report_pdf import build_tax_report_filename, build_tax_report_pdf_buffer

    data = result["data"]
    return file_response(build_tax_report_pdf_buffer(data), build_tax_report_filename(data))


@payroll_view(["GET"], access="employee")
def get_my_tax_report(ctx):
    ctx.require_org()
    emp = _require_self(ctx)
    result = _tax_report_result(ctx, str(emp.pk))
    return send_response(200, True, "Tax report fetched successfully", _jsonify(result["data"]))


@payroll_view(["GET"], access="employee")
def download_my_tax_report_pdf(ctx):
    ctx.require_org()
    emp = _require_self(ctx)
    return _send_tax_report_pdf(_tax_report_result(ctx, str(emp.pk)))


@payroll_view(["GET"])
def get_employee_tax_report(ctx, employeeId):
    ctx.require_org()
    parse_employee_id_param(employeeId)
    result = _tax_report_result(ctx, employeeId)
    return send_response(200, True, "Tax report fetched successfully", _jsonify(result["data"]))


@payroll_view(["GET"])
def download_employee_tax_report_pdf(ctx, employeeId):
    ctx.require_org()
    parse_employee_id_param(employeeId)
    return _send_tax_report_pdf(_tax_report_result(ctx, employeeId))


@payroll_view(["GET"])
def get_employee_tds_list(ctx):
    from ..models import EmployeeTDS

    org = ctx.require_org()
    fy = parse_fy_request(ctx.query("financialYear"))
    tax_regime = ctx.query("taxRegime")
    search = ctx.query("search")
    declarations = ctx.query("declarations")
    employee_id = ctx.query("employeeId")
    show_declarations = declarations in ("true", "1")
    qs = EmployeeTDS.objects.filter(org=org, financial_year__in=fy["aliases"]).select_related("employee")
    if show_declarations:
        qs = qs.exclude(has_investment_declaration=False)
    else:
        qs = qs.filter(admin_calculated=True)
    if employee_id and _valid_uuid(employee_id):
        qs = qs.filter(employee_id=employee_id)
    if tax_regime in ("old", "new"):
        qs = qs.filter(tax_regime=tax_regime)
    records = []
    for rec in qs.order_by("-updated_at"):
        doc = rec.to_dict()
        doc["employeeId"] = _populate_employee(
            rec.employee, ["firstName", "lastName", "email", "payrollInfo.employeeCode", "uniqueId", "status"])
        records.append(doc)
    needle = js_trim(search or "").lower()
    if needle:
        def match(record):
            e = record["employeeId"] or {}
            full = f"{e.get('firstName') or ''} {e.get('lastName') or ''}".strip().lower()
            return (needle in full or needle in (e.get("email") or "").lower()
                    or needle in str((e.get("payrollInfo") or {}).get("employeeCode") or "").lower()
                    or needle in (e.get("uniqueId") or "").lower())
        records = [r for r in records if match(r)]
    return send_response(200, True, "Employee TDS list fetched successfully",
                         {"total": len(records), "records": records})


@payroll_view(["DELETE"])
def delete_employee_tds(ctx, tdsRecordId):
    from ..models import EmployeeTDS

    org = ctx.require_org()
    record = (EmployeeTDS.objects.filter(org=org, pk=tdsRecordId).select_related("employee").first()
              if _valid_uuid(tdsRecordId) else None)
    if record is None:
        raise PayrollError("TDS record not found", 404)
    before = record.to_dict()
    employee = record.employee
    record.delete()
    _audit(ctx, None, employee, remarks=f"TDS record {tdsRecordId} deleted ({before['financialYear']})",
           before=before)
    return send_response(200, True, "TDS record deleted successfully")


def _object_values_sum(d):
    total = 0.0
    for v in d.values():
        total += float(v) if not isinstance(v, bool) else (1.0 if v else 0.0)
    return total


@payroll_view(["PUT"])
def update_tds_declaration(ctx, employeeId):
    org = ctx.require_org()
    body = ctx.body
    fy = parse_fy_request(body.get("financialYear"))
    with transaction.atomic():
        record = _find_tds(org, employeeId, fy, lock=True)
        if record is None:
            raise PayrollError("TDS record not found", 404)
        if record.is_locked:
            raise PayrollError("Investment declaration is frozen. You cannot edit it.", 400)
        declared = body.get("declaredDeductions", UNDEFINED)
        has_lines = any(k in body for k in ("investments80C", "investments80D", "itDeclaration"))
        if has_lines:
            if "investments80C" in body:
                _set_tds_fields(record, {"investments80C": sanitize_investment_lines(body["investments80C"])})
            if "investments80D" in body:
                _set_tds_fields(record, {"investments80D": sanitize_investment_lines(body["investments80D"])})
            if "itDeclaration" in body:
                _set_tds_fields(record, {"itDeclaration": merge_it_declaration(record.it_declaration,
                                                                               body["itDeclaration"])})
            prev = to_plain_it_declaration(record.declared_deductions)
            _set_tds_fields(record, {"declaredDeductions": build_declared_deductions_from_declaration({
                "lines80C": record.investments80_c,
                "lines80D": record.investments80_d,
                "itDeclaration": to_plain_it_declaration(record.it_declaration),
                "prevDeductions": prev,
                "tdsConfig": {},
                "touchedHomeLoan": True,
                "touchedOtherInv": True,
                "declaredDeductionsOverride": js_or(declared, prev),
            })})
        elif js_truthy(declared):
            normalized = normalize_deductions(declared)
            current = dict(record.declared_deductions or {})
            _set_tds_fields(record, {"declaredDeductions": {
                **current, **normalized,
                "total": _object_values_sum(normalized) + js_or(current.get("standardDeduction"), 50000),
            }})
        proof_items = body.get("proofItems", UNDEFINED)
        if isinstance(proof_items, list):
            _set_tds_fields(record, {"proofItems": sanitize_proof_items(proof_items)})
            items = record.proof_items
            reviewed = [i for i in items if i.get("status") != "pending"]
            if reviewed and all(i.get("status") == "approved" for i in items):
                record.proof_status, record.proof_verified, record.proof_submitted = "approved", True, True
            elif reviewed and all(i.get("status") == "rejected" for i in items):
                record.proof_status, record.proof_verified, record.proof_submitted = "rejected", False, True
            elif reviewed:
                record.proof_status, record.proof_submitted, record.proof_verified = "submitted", True, False
            record.proof_reviewed_at = dj_timezone.now()
        record.save()
    _audit(ctx, record, record.employee, remarks=f"TDS declaration updated by HR ({fy['canonical']})")
    return send_response(200, True, "TDS declaration updated successfully", record.to_dict())


@payroll_view(["DELETE"], access="employee")
def delete_my_investment_declaration(ctx):
    from ..models import EmployeeTDS

    org = ctx.require_org()
    emp = _require_self(ctx)
    fy = parse_fy_request(ctx.query("financialYear"))
    with transaction.atomic():
        existing = _find_tds(org, emp.pk, fy, lock=True)
        if existing is None or existing.has_investment_declaration is False:
            raise PayrollError("Investment declaration not found", 404)
        if existing.is_locked:
            raise PayrollError("Investment declaration is frozen. You cannot delete it.", 400)
        has_history = isinstance(existing.monthly_deductions, list) and len(existing.monthly_deductions) > 0
        if not existing.admin_calculated and not has_history:
            EmployeeTDS.objects.filter(pk=existing.pk, org=org, employee=emp).delete()
            _audit(ctx, existing, emp, remarks=f"Investment declaration deleted ({fy['canonical']})")
            return send_response(200, True, "Investment declaration deleted")
        dd = dict(existing.declared_deductions or {})
        for key in ("section80C", "section80D", "section80E", "section80G", "section24", "otherDeductions"):
            dd[key] = 0
        _set_tds_fields(existing, {
            "hasInvestmentDeclaration": False, "investments80C": [], "investments80D": [],
            "itDeclaration": default_it_declaration(), "declaredDeductions": dd,
        })
        existing.save()
    _audit(ctx, existing, emp, remarks=f"Investment declaration cleared ({fy['canonical']})")
    return send_response(200, True, "Investment declaration deleted")


def _has_own(obj, key):
    return isinstance(obj, dict) and key in obj


@payroll_view(["PUT"], access="employee")
def save_investment_declaration_details(ctx):
    org = ctx.require_org()
    emp = _require_self(ctx)
    body = ctx.body
    fy = parse_fy_request(body.get("financialYear"))
    existing = _find_tds(org, emp.pk, fy)
    if existing is not None and existing.is_locked:
        raise PayrollError("Investment declaration is frozen. You cannot edit it.", 400)
    existing_doc = existing.to_dict() if existing else None

    lines80_c = (sanitize_investment_lines(body["investments80C"]) if "investments80C" in body
                 else map_doc_investment_lines(g(existing_doc, "investments80C")))
    lines80_d = (sanitize_investment_lines(body["investments80D"]) if "investments80D" in body
                 else map_doc_investment_lines(g(existing_doc, "investments80D")))
    config = find_tds_config_by_fy(org, fy, create_if_missing=True)
    config_doc = _config_doc(config)

    prev_it = to_plain_it_declaration(g(existing_doc, "itDeclaration"))
    has_it = "itDeclaration" in body
    incoming_it = body["itDeclaration"] if has_it else None
    merged_it = merge_it_declaration(prev_it, incoming_it)
    touched_home_loan = has_it and js_truthy(incoming_it) and _has_own(incoming_it, "homeLoanSelfOccupied")
    touched_other = has_it and js_truthy(incoming_it) and _has_own(incoming_it, "investmentsOther")
    other_lines = sanitize_other_investment_lines(merged_it["investmentsOther"])
    it_for_storage = {**merged_it, "investmentsOther": other_lines if touched_other else merged_it["investmentsOther"]}

    merged_deductions = build_declared_deductions_from_declaration({
        "lines80C": lines80_c, "lines80D": lines80_d, "itDeclaration": it_for_storage,
        "prevDeductions": js_or(g(existing_doc, "declaredDeductions"), {}),
        "tdsConfig": config_doc, "touchedHomeLoan": touched_home_loan, "touchedOtherInv": touched_other,
        "declaredDeductionsOverride": body.get("declaredDeductions", None),
    })
    update = {"investments80C": lines80_c, "investments80D": lines80_d, "itDeclaration": it_for_storage,
              "declaredDeductions": merged_deductions}
    if "taxRegime" in body:
        parsed = parse_tax_regime_input(body["taxRegime"])
        if parsed is UNDEFINED:
            raise PayrollError('taxRegime must be "old" or "new"', 400)
        if parsed:
            update["taxRegime"] = parsed

    projection_fields = build_tds_projection_fields(
        org=org, employee=employee_doc(emp), fy=fy, tds_config=config_doc, existing_tds=existing_doc,
        declared_deductions=merged_deductions, it_declaration=merged_it,
        tax_regime=update.get("taxRegime", UNDEFINED))
    update.update(projection_fields)
    record = _upsert_tds(org, emp.pk, fy, {"financialYear": fy["canonical"], "hasInvestmentDeclaration": True,
                                           **update})
    _audit(ctx, record, emp, remarks=f"Investment declaration saved by employee ({fy['canonical']})")
    save_and_compare = build_save_and_compare_summary(org, emp.pk, fy, merged_deductions, merged_it)
    limits = get_exemption_limits(config_doc)
    data = {
        "employeeTDS": record.to_dict(),
        "saveAndCompare": save_and_compare,
        "tdsPreview": {
            "taxRegime": projection_fields["taxRegime"],
            "taxableIncome": projection_fields["taxableIncome"],
            "monthlyTDS": projection_fields["monthlyTDS"],
            "annualTax": js_or(g(projection_fields["taxPayable"], "total"), 0),
        },
        "aggregates": {
            "section80C": merged_deductions["section80C"],
            "section80D": merged_deductions["section80D"],
            "section24": merged_deductions["section24"],
            "otherDeductions": merged_deductions["otherDeductions"],
            "section80DMaxLimit": limits["section80D"],
            "section24MaxLimit": limits["section24"],
            "lines80C": len(lines80_c),
            "lines80D": len(lines80_d),
            "rentEntries": len(merged_it.get("rentEntries") or []),
            "otherInvestmentLines": len(merged_it.get("investmentsOther") or []),
        },
    }
    return send_response(200, True, "Investment declaration saved", _jsonify(data))


@payroll_view(["PUT"], access="employee")
def submit_investmentproof(ctx):
    org = ctx.require_org()
    emp = _require_self(ctx)
    body = parse_investment_request_body(ctx.body)
    fy = parse_fy_request(body.get("financialYear"))
    existing = _find_tds(org, emp.pk, fy)
    if existing is not None and existing.is_locked:
        raise PayrollError("Investment declaration is frozen. You cannot edit it.", 400)
    existing_doc = existing.to_dict() if existing else None

    uploaded = upload_investment_declaration_files(org.pk, ctx.request.FILES)
    update80_c = "investments80C" in body or len(uploaded["investment80CAttachments"]) > 0
    update80_d = "investments80D" in body or len(uploaded["investment80DAttachments"]) > 0
    ex80_c = g(existing_doc, "investments80C")
    ex80_d = g(existing_doc, "investments80D")
    lines80_c = (sanitize_investment_lines(js_or(body.get("investments80C", UNDEFINED), ex80_c),
                                           uploaded["investment80CAttachments"], ex80_c)
                 if update80_c else map_doc_investment_lines(ex80_c))
    lines80_d = (sanitize_investment_lines(js_or(body.get("investments80D", UNDEFINED), ex80_d),
                                           uploaded["investment80DAttachments"], ex80_d)
                 if update80_d else map_doc_investment_lines(ex80_d))
    total80_c = sum_line_amounts(lines80_c)
    total80_d = sum_line_amounts(lines80_d)
    config = find_tds_config_by_fy(org, fy, create_if_missing=True)
    config_doc = _config_doc(config)

    prev_it = to_plain_it_declaration(g(existing_doc, "itDeclaration"))
    has_it = "itDeclaration" in body
    incoming_it = body["itDeclaration"] if has_it else None
    merged_it = merge_it_declaration(prev_it, incoming_it, uploaded)

    prev = js_or(g(existing_doc, "declaredDeductions"), {})
    standard = js_nc(js_nc(g(prev, "standardDeduction"), g(config_doc, "standardDeduction")), 50000)
    hl = js_or(merged_it.get("homeLoanSelfOccupied"), {})
    principal = max(0.0, num0(g(hl, "principalPaid"))) if js_truthy(g(hl, "enabled")) else 0
    touched_home_loan = has_it and js_truthy(incoming_it) and _has_own(incoming_it, "homeLoanSelfOccupied")
    section24 = num0(g(prev, "section24"))
    if touched_home_loan:
        section24 = max(0.0, num0(g(hl, "interestPaid"))) if js_truthy(g(hl, "enabled")) else 0
    touched_other = has_it and js_truthy(incoming_it) and _has_own(incoming_it, "investmentsOther")
    other_lines = sanitize_other_investment_lines(merged_it["investmentsOther"])
    other_deductions = num0(g(prev, "otherDeductions"))
    if touched_other:
        other_deductions = sum_line_amounts(other_lines)
    merged = {
        "section80C": total80_c + principal,
        "section80D": total80_d,
        "section80E": num0(g(prev, "section80E")),
        "section80G": num0(g(prev, "section80G")),
        "section24": section24,
        "professionalTax": num0(g(prev, "professionalTax")),
        "otherDeductions": other_deductions,
        "standardDeduction": standard,
        "total": 0,
    }
    declared = body.get("declaredDeductions", UNDEFINED)
    if js_truthy(declared) and _is_obj(declared):
        n = normalize_deductions(declared if isinstance(declared, dict) else {})
        if g(declared, "section80E") is not UNDEFINED:
            merged["section80E"] = n["section80E"]
        if g(declared, "section80G") is not UNDEFINED:
            merged["section80G"] = n["section80G"]
        if g(declared, "professionalTax") is not UNDEFINED:
            merged["professionalTax"] = n["professionalTax"]
        if g(declared, "section24") is not UNDEFINED and not touched_home_loan:
            merged["section24"] = n["section24"]
        if g(declared, "otherDeductions") is not UNDEFINED and not touched_other:
            merged["otherDeductions"] = n["otherDeductions"]
    merged["total"] = compute_declared_deductions_total(merged)

    update = {
        "financialYear": fy["canonical"],
        "investments80C": lines80_c, "investments80D": lines80_d,
        "itDeclaration": {**merged_it, "investmentsOther": other_lines if touched_other else merged_it["investmentsOther"]},
        "declaredDeductions": merged,
        "proofSubmitted": True, "proofVerified": False, "proofStatus": "submitted",
    }
    if "taxRegime" in body:
        parsed = parse_tax_regime_input(body["taxRegime"])
        if parsed is UNDEFINED:
            raise PayrollError('taxRegime must be "old" or "new"', 400)
        if parsed:
            update["taxRegime"] = parsed
    record = _upsert_tds(org, emp.pk, fy, update)
    _audit(ctx, record, emp, remarks=f"Investment proofs submitted by employee ({fy['canonical']})")
    save_and_compare = build_save_and_compare_summary(org, emp.pk, fy, merged, merged_it)
    data = {
        "employeeTDS": record.to_dict(),
        "saveAndCompare": save_and_compare,
        "aggregates": {
            "section80C": merged["section80C"], "section80D": merged["section80D"],
            "section24": merged["section24"], "otherDeductions": merged["otherDeductions"],
            "lines80C": len(lines80_c), "lines80D": len(lines80_d),
            "rentEntries": len(merged_it.get("rentEntries") or []),
            "otherInvestmentLines": len(merged_it.get("investmentsOther") or []),
        },
    }
    return send_response(200, True, "Investment proof updated successfully", _jsonify(data))


@payroll_view(["PUT"])
def update_investment_proof_status(ctx, employeeId):
    org = ctx.require_org()
    body = ctx.body
    if not employeeId:
        raise PayrollError("Employee ID is required", 400)
    fy = parse_fy_request(body.get("financialYear"))
    status = normalize_proof_status(body.get("status", UNDEFINED))
    if not status:
        raise PayrollError("Status must be approved or rejected", 400)
    with transaction.atomic():
        record = _find_tds(org, employeeId, fy, lock=True)
        if record is None:
            raise PayrollError("TDS record not found", 404)
        record.financial_year = fy["canonical"]
        record.proof_submitted = True
        record.proof_verified = status == "approved"
        record.proof_status = status
        record.proof_remarks = js_trim(js_str(js_or(body.get("remarks", UNDEFINED), "")))[:1000]
        record.proof_reviewed_by = js_trim(ctx.actor_id)
        record.proof_reviewed_at = dj_timezone.now()
        record.save()
    _audit(ctx, record, record.employee, remarks=f"Investment proof {status} ({fy['canonical']})")
    from .. import bss_adapter

    try:
        bss_adapter.notify(record.employee.worker, f"Investment proof {status}",
                           f"Your investment proofs for FY {fy['canonical']} were {status}.")
    except Exception:  # noqa: BLE001 — notifications never block the review
        pass
    return send_response(200, True, f"Investment proof {status} successfully", record.to_dict())


def _cast_boolean(value):
    """Mongoose Boolean cast."""
    if value is None or isinstance(value, bool):
        return value
    if value in (1, "1", "true", "yes", "on"):
        return True
    if value in (0, "0", "false", "no", "off", ""):
        return False
    raise PayrollError(f'Cast to Boolean failed for value "{js_str(value)}" at path "isLocked"', 500)


@payroll_view(["PUT"])
def lock_unlock_tds(ctx, employeeId):
    org = ctx.require_org()
    body = ctx.body
    fy = parse_fy_request(body.get("financialYear"))
    is_locked = body.get("isLocked", UNDEFINED)
    with transaction.atomic():
        record = _find_tds(org, employeeId, fy, lock=True)
        if record is None:
            raise PayrollError("TDS record not found", 404)
        if is_locked is not UNDEFINED:
            record.is_locked = bool(_cast_boolean(is_locked))
            record.save()
    _audit(ctx, record, record.employee, remarks=f"TDS {'locked' if js_truthy(is_locked) else 'unlocked'} "
                                                 f"({fy['canonical']})")
    return send_response(200, True, f"TDS {'locked' if js_truthy(is_locked) else 'unlocked'} successfully",
                         record.to_dict())


@payroll_view(["POST"])
def bulk_calculate_tds(ctx):
    from ..models import PayrollEmployee

    org = ctx.require_org()
    fy = parse_fy_request(ctx.body.get("financialYear"))
    employees = list(PayrollEmployee.objects.filter(org=org, status="Active").order_by("created_at"))
    config = find_tds_config_by_fy(org, fy, create_if_missing=True)
    config_doc = _config_doc(config)
    results = []
    for emp in employees:
        try:
            existing = _find_tds(org, emp.pk, fy)
            existing_doc = existing.to_dict() if existing else None
            projection = compute_employee_tds_projection(**_projection_kwargs(
                org, emp, fy, config_doc, existing_doc, tax_regime=g(existing_doc, "taxRegime"),
                declared_deductions=g(existing_doc, "declaredDeductions"), hra_details=None,
                other_income=UNDEFINED))
            deductions_applied = compute_effective_deductions_total(
                projection["normalizedDeductions"], projection["hraExemption"], config_doc,
                projection["effectiveRegime"], js_or(g(projection["section10"], "total"), 0),
                projection["capOptions"])
            _upsert_tds(org, emp.pk, fy, {
                "financialYear": fy["canonical"],
                "taxRegime": projection["effectiveRegime"],
                "projectedAnnualIncome": projection["annualIncome"],
                "declaredDeductions": {**projection["normalizedDeductions"],
                                       "standardDeduction": projection["standardDeductionApplied"],
                                       "total": deductions_applied},
                "hraExemption": projection["hraExemption"],
                "section10Exemptions": projection["section10"],
                "taxableIncome": projection["taxableIncome"],
                "taxPayable": projection["taxCalculation"],
                "rebateApplicable": projection["taxCalculation"]["rebateApplicable"],
                "rebateAmount": projection["taxCalculation"]["rebateAmount"],
                "monthlyTDS": projection["monthlyTDS"],
                "incomeBreakdown": projection["incomeBreakdown"],
                "adminCalculated": True,
            })
            results.append({"employeeId": str(emp.pk), "status": "success",
                            "monthlyTDS": projection["monthlyTDS"]})
        except Exception as err:  # noqa: BLE001 — legacy collected per-employee failures
            results.append({"employeeId": str(emp.pk), "status": "failed", "error": str(err)})
    _audit(ctx, None, None, remarks=f"Bulk TDS calculation for FY {fy['canonical']}: "
                                    f"{sum(1 for r in results if r['status'] == 'success')}/{len(employees)} succeeded")
    return send_response(200, True, "Bulk TDS calculation completed",
                         _jsonify({"total": len(employees), "results": results}))


ROUTES = [
    ("tds/config", by_method(POST=create_or_update_tds_config, GET=get_tds_config), "tds_config"),
    ("tds/calculate/<str:employeeId>", calculate_employee_tds, "tds_calculate"),
    ("tds/employee/<str:employeeId>", get_employee_tds, "tds_employee"),
    ("tds/hra-details/<str:employeeId>", get_employee_hra_for_tds, "tds_hra_details"),
    ("tds/tax-report/download", download_my_tax_report_pdf, "tds_my_tax_report_download"),
    ("tds/tax-report", get_my_tax_report, "tds_my_tax_report"),
    ("tds/tax-report/<str:employeeId>/download", download_employee_tax_report_pdf, "tds_tax_report_download"),
    ("tds/tax-report/<str:employeeId>", get_employee_tax_report, "tds_tax_report"),
    ("tds/list", get_employee_tds_list, "tds_list"),
    ("tds/record/<str:tdsRecordId>", delete_employee_tds, "tds_record_delete"),
    ("tds/declaration/<str:employeeId>", update_tds_declaration, "tds_declaration"),
    ("tds/investment-declaration", by_method(PUT=save_investment_declaration_details,
                                             DELETE=delete_my_investment_declaration),
     "tds_investment_declaration"),
    ("tds/submitInvestmentproof", submit_investmentproof, "tds_submit_investment_proof"),
    ("tds/proof-status/<str:employeeId>", update_investment_proof_status, "tds_proof_status"),
    ("tds/lock/<str:employeeId>", lock_unlock_tds, "tds_lock"),
    ("tds/bulkCalculate", bulk_calculate_tds, "tds_bulk_calculate"),
    ("employee/tax-report/download", download_my_tax_report_pdf, "employee_tax_report_download"),
    ("employee/tax-report", get_my_tax_report, "employee_tax_report"),
]
