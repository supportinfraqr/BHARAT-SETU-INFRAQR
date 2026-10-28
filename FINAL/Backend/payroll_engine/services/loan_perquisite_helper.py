"""Loan perquisite (Rule 3(7)(i)) helpers.

Port of ``FINAL/legacy_payroll/utils/payroll/loanPerquisiteHelper.js``.

Exported (legacy name -> port):
    SMALL_LOAN_EXEMPT_LIMIT
    isLoanPerquisiteExempt                 -> is_loan_perquisite_exempt
    calculateMonthlyLoanPerquisiteForLoan  -> calculate_monthly_loan_perquisite_for_loan
    calculateAnnualLoanPerquisiteForLoan   -> calculate_annual_loan_perquisite_for_loan
    calculateEmployeeAnnualLoanPerquisite  -> calculate_employee_annual_loan_perquisite
    buildEmployeeLoanPerquisiteForPayroll  -> build_employee_loan_perquisite_for_payroll
    calculateAdditionalTdsForPerquisite    -> calculate_additional_tds_for_perquisite

Signature change: ``EmployeeLoanModel`` is dropped (Django ``EmployeeLoan`` is queried);
``organization_id`` / ``employee_id`` accept a model instance or pk. Sync, not async.
Loan ids in results are strings.
"""

import math

from .jsmath import UNDEFINED, clean, is_nullish, js_or, js_round, js_str, js_trim, js_truthy, \
    num0, to_number
from .loan_helper import _pk, is_emi_due_for_payroll_month, loan_doc, normalize_payroll_month

SMALL_LOAN_EXEMPT_LIMIT = 20000


def _g(obj, key):
    return obj.get(key, UNDEFINED) if isinstance(obj, dict) else UNDEFINED


def is_loan_perquisite_exempt(loan=UNDEFINED, loan_type=UNDEFINED):
    loan = {} if loan is UNDEFINED else loan
    loan_type = {} if loan_type is UNDEFINED else loan_type
    if js_truthy(_g(loan, "exemptFromPerquisite")):
        return True
    amount = _g(loan, "loanAmount")
    if to_number(amount if js_truthy(amount) else 0) <= SMALL_LOAN_EXEMPT_LIMIT:
        return True
    name = _g(loan_type, "loanName")
    loan_name = js_trim(js_str(name if js_truthy(name) else "")).lower()
    return "medical" in loan_name


def calculate_monthly_loan_perquisite_for_loan(loan=UNDEFINED, loan_type=UNDEFINED,
                                               interest_rate_charged=0):
    loan = {} if loan is UNDEFINED else loan
    loan_type = {} if loan_type is UNDEFINED else loan_type
    if interest_rate_charged is UNDEFINED:
        interest_rate_charged = 0
    if is_loan_perquisite_exempt(loan, loan_type):
        return 0
    out = _g(loan, "outstandingBalance")
    outstanding = to_number(out if js_truthy(out) else 0)
    if outstanding <= 0:
        return 0
    prescribed = num0(_g(loan_type, "perquisiteRate"))
    charged = num0(interest_rate_charged)
    effective = max(0.0, prescribed - charged)
    if effective <= 0:
        return 0
    return clean(js_round((outstanding * effective) / 100 / 12))


def resolve_perquisite_month_count(months=UNDEFINED):
    if is_nullish(months) or months == "":
        return 12
    count = to_number(months)
    if not math.isfinite(count) or count < 0:
        return 12
    return clean(count)


def calculate_annual_loan_perquisite_for_loan(loan=UNDEFINED, loan_type=UNDEFINED, months=12):
    if months is UNDEFINED:
        months = 12
    monthly = calculate_monthly_loan_perquisite_for_loan(loan, loan_type)
    return clean(monthly * resolve_perquisite_month_count(months))


def fetch_active_loans_for_perquisite(organization_id, employee_id):
    from ..models import EmployeeLoan

    qs = (EmployeeLoan.objects
          .filter(org_id=_pk(organization_id), employee_id=_pk(employee_id), status="active",
                  outstanding_balance__gt=0)
          .select_related("loan_type").order_by("created_at", "id"))
    return [loan_doc(x, loan_type_fields=["loanName", "perquisiteRate", "status"]) for x in qs]


def _annual_from_loans(loans, months):
    month_count = resolve_perquisite_month_count(months)
    annual_total = 0
    breakdown = []
    for loan in loans:
        loan_type = js_or(loan.get("loanTypeId"), {})
        annual = calculate_annual_loan_perquisite_for_loan(loan, loan_type, month_count)
        if annual <= 0:
            continue
        annual_total += annual
        breakdown.append({
            "loanId": loan.get("_id"),
            "loanNumber": loan.get("loanNumber"),
            "loanName": js_or(loan_type.get("loanName"), ""),
            "outstandingBalance": loan.get("outstandingBalance"),
            "perquisiteRate": js_or(loan_type.get("perquisiteRate"), 0),
            "monthlyPerquisite": clean(js_round(annual / month_count)) if month_count > 0 else 0,
            "annualPerquisite": annual,
            "exemptFromPerquisite": is_loan_perquisite_exempt(loan, loan_type),
        })
    return {
        "annualTotal": clean(js_round(annual_total)),
        "monthlyTotal": clean(js_round(annual_total / month_count)) if month_count > 0 else 0,
        "breakdown": breakdown,
    }


def calculate_employee_annual_loan_perquisite(organization_id=None, employee_id=None, months=12):
    loans = fetch_active_loans_for_perquisite(organization_id, employee_id)
    return _annual_from_loans(loans, months)


def _monthly_from_loans(loans, month, year):
    payroll_month = normalize_payroll_month(month)
    payroll_year = to_number(year)
    lines = []
    total = 0
    for loan in loans:
        if not is_emi_due_for_payroll_month(loan.get("emiStartDate", UNDEFINED), payroll_month,
                                            payroll_year):
            continue
        loan_type = js_or(loan.get("loanTypeId"), {})
        amount = calculate_monthly_loan_perquisite_for_loan(loan, loan_type)
        if amount <= 0:
            continue
        label = js_or(loan_type.get("loanName", UNDEFINED), loan.get("loanNumber", UNDEFINED),
                      "Loan")
        lines.append({
            "componentName": f"Loan Perquisite ({js_str(label)})",
            "amount": amount,
            "calculationType": "perquisite",
            "loanId": loan.get("_id"),
            "perquisiteRate": js_or(loan_type.get("perquisiteRate"), 0),
        })
        total += amount
    return {"lines": lines, "totalMonthlyPerquisite": clean(js_round(total))}


def build_employee_loan_perquisite_for_payroll(organization_id=None, employee_id=None, month=None,
                                               year=None):
    loans = fetch_active_loans_for_perquisite(organization_id, employee_id)
    return _monthly_from_loans(loans, month, year)


def calculate_additional_tds_for_perquisite(monthly_perquisite=UNDEFINED, tds_record=UNDEFINED):
    record = tds_record if js_truthy(tds_record) else {}
    amount = num0(monthly_perquisite)
    if amount <= 0:
        return 0
    taxable = num0(_g(record, "taxableIncome"))
    tax_payable = _g(record, "taxPayable")
    total_tax = num0(_g(tax_payable, "total") if not is_nullish(tax_payable) else UNDEFINED)
    if taxable <= 0 or total_tax <= 0:
        return 0
    rate = total_tax / taxable
    return clean(js_round(amount * rate))
