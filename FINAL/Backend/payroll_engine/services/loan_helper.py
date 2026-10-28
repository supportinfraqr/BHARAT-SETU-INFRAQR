"""Loan EMI schedule + payroll repayment helpers.

Port of ``FINAL/legacy_payroll/utils/payroll/loanHelper.js``.

Exported (legacy name -> port):
    MONTH_NAMES
    normalizePayrollMonth            -> normalize_payroll_month
    computeRemainingInstallments     -> compute_remaining_installments
    computeNextInstallmentPeriod     -> compute_next_installment_period
    countPayrollRepaymentsForLoan    -> count_payroll_repayments_for_loan
    countPayrollRepaymentsByLoanIds  -> count_payroll_repayments_by_loan_ids
    applyScheduleAfterRepayment      -> apply_schedule_after_repayment
    isEmiDueForPayrollMonth          -> is_emi_due_for_payroll_month
    computePayrollEmiAmount          -> compute_payroll_emi_amount
    buildLoanEmiDeductionsForEmployee -> build_loan_emi_deductions_for_employee
    applyPayrollLoanRepayments       -> apply_payroll_loan_repayments
    reversePayrollLoanRepayments     -> reverse_payroll_loan_repayments

Signature changes: the legacy functions took ``{ ..., EmployeeLoanModel,
LoanRepaymentModel, PayrollRunModel }``; the Mongoose model parameters are dropped and the
Django models are used. ``organization_id`` / ``employee_id`` / ``payroll_id`` accept a
model instance or a primary key. ``build_loan_emi_deductions_for_employee`` keeps the
legacy ``PayrollRunModel`` switch as ``check_payroll_run`` (default ``True`` — the payroll
run engine always passed ``PayrollRunModel``). All functions are synchronous.

Pure helpers operate on legacy-shaped loan dicts (camelCase keys, dates as ISO strings or
``datetime``); ``compute_next_installment_period`` returns ``nextInstallmentDate`` as an
aware UTC ``datetime`` (use ``js_json`` to get the legacy JSON string).
"""

import math
from datetime import datetime, timedelta, timezone

from django.db import transaction

from .financial_year import LOCAL_TZ, _to_instant
from .jsmath import (UNDEFINED, clean, is_integer, is_nullish, js_or, js_str, js_trim,
                     js_truthy, num0, to_number)

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
               "Dec"]

_MONTH_MAP = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec",
}


# ------------------------------------------------------------------ JS Date helpers
# (shared by the other loan / revision / import ports)


def js_date(value):
    """``new Date(value)`` -> aware UTC ``datetime`` or ``None`` (Invalid Date).

    ``new Date(null)`` is the epoch; ``new Date(undefined)`` is Invalid Date."""
    if value is None:
        return datetime(1970, 1, 1, tzinfo=timezone.utc)
    if value is UNDEFINED:
        return None
    return _to_instant(value)


def js_utc_date(year, month_index, day=1):
    """``new Date(Date.UTC(year, monthIndex, day))`` (month / day overflow handled)."""
    y, m, d = int(year), int(month_index), int(day)
    y += m // 12
    m = m % 12
    return datetime(y, m + 1, 1, tzinfo=timezone.utc) + timedelta(days=d - 1)


def js_local_datetime(year, month_index, day=1):
    """``new Date(year, monthIndex, day)`` (server-local midnight, Asia/Kolkata)."""
    y, m, d = int(year), int(month_index), int(day)
    y += m // 12
    m = m % 12
    base = datetime(y, m + 1, 1) + timedelta(days=d - 1)
    return base.replace(tzinfo=LOCAL_TZ).astimezone(timezone.utc)


def local_parts(dt):
    """(year, monthIndex, day) of a ``Date`` in server-local time (``getFullYear`` ...)."""
    loc = dt.astimezone(LOCAL_TZ)
    return loc.year, loc.month - 1, loc.day


def js_iso(dt):
    """``Date.prototype.toJSON``."""
    if dt is None:
        return None
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def js_json(value):
    """Deep copy rendering ``datetime`` like ``JSON.stringify`` and integral floats as ints."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return js_iso(value)
    if isinstance(value, dict):
        return {k: js_json(v) for k, v in value.items() if v is not UNDEFINED}
    if isinstance(value, (list, tuple)):
        return [None if v is UNDEFINED else js_json(v) for v in value]
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return clean(value)
    return value


def _pk(value):
    if value is None or value is UNDEFINED:
        return None
    return getattr(value, "pk", value)


def _get(obj, key, default=UNDEFINED):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default


# ------------------------------------------------------------------ pure helpers


def normalize_payroll_month(month_value=UNDEFINED):
    if is_nullish(month_value):
        return None
    raw = js_trim(js_str(month_value))
    if not raw:
        return None
    for m in MONTH_NAMES:
        if m.lower() == raw.lower():
            return m
    mapped = _MONTH_MAP.get(raw.lower())
    if mapped:
        return mapped
    numeric = to_number(raw)
    if is_integer(numeric) and 1 <= numeric <= 12:
        return MONTH_NAMES[int(numeric) - 1]
    return raw


def get_payroll_period_index(month, year):
    normalized = normalize_payroll_month(month)
    month_string = js_trim(js_str(js_or(normalized, "")))
    month_index = -1
    for i, m in enumerate(MONTH_NAMES):
        if m.lower() == month_string.lower():
            month_index = i
            break
    if month_index == -1:
        numeric = to_number(month_string)
        if is_integer(numeric) and 1 <= numeric <= 12:
            month_index = int(numeric) - 1
    if month_index == -1:
        return -1
    return to_number(year) * 12 + month_index


def get_date_period_index(date_value):
    d = js_date(date_value)
    if d is None:
        return -1
    return d.year * 12 + (d.month - 1)


def _n_or0(value):
    """``value || 0`` for a numeric field."""
    return value if js_truthy(value) else 0


def compute_remaining_installments(outstanding_balance=UNDEFINED, installment_amount=UNDEFINED):
    if not js_truthy(outstanding_balance) or to_number(outstanding_balance) <= 0:
        return 0
    if not js_truthy(installment_amount) or to_number(installment_amount) <= 0:
        return 0
    return math.ceil(to_number(outstanding_balance) / to_number(installment_amount))


def empty_next_installment_period():
    return {"nextInstallmentMonth": None, "nextInstallmentYear": None,
            "nextInstallmentLabel": None, "nextInstallmentDate": None}


def compute_next_installment_period(loan=UNDEFINED, payroll_repayment_count=0):
    if (not js_truthy(loan) or _get(loan, "status") == "closed"
            or to_number(_n_or0(_get(loan, "outstandingBalance"))) <= 0):
        return empty_next_installment_period()
    emi_start = js_date(_get(loan, "emiStartDate"))
    if emi_start is None:
        return empty_next_installment_period()
    if payroll_repayment_count is UNDEFINED:
        payroll_repayment_count = 0
    completed = max(0.0, num0(payroll_repayment_count))
    next_date = js_utc_date(emi_start.year, emi_start.month - 1 + int(completed), 1)
    month = MONTH_NAMES[next_date.month - 1]
    return {
        "nextInstallmentMonth": month,
        "nextInstallmentYear": next_date.year,
        "nextInstallmentLabel": f"{month} {next_date.year}",
        "nextInstallmentDate": next_date,
    }


def apply_schedule_after_repayment(loan):
    """Mutates the loan dict (legacy mutated the Mongoose document)."""
    outstanding = to_number(_n_or0(loan.get("outstandingBalance")))
    emi = to_number(_n_or0(loan.get("installmentAmount")))
    if outstanding <= 0 or emi <= 0:
        loan["lastInstallmentAmount"] = 0
        return UNDEFINED
    total_repaid = to_number(_n_or0(loan.get("loanAmount"))) - outstanding
    loan["paidInstallments"] = math.floor(total_repaid / emi)
    remaining = compute_remaining_installments(outstanding, emi)
    loan["totalInstallments"] = loan["paidInstallments"] + remaining
    last = outstanding - emi * (remaining - 1)
    loan["lastInstallmentAmount"] = clean(last) if last > 0 else clean(emi)
    return UNDEFINED


def is_emi_due_for_payroll_month(emi_start_date=UNDEFINED, month=UNDEFINED, year=UNDEFINED):
    if not js_truthy(emi_start_date):
        return False
    start_index = get_date_period_index(emi_start_date)
    payroll_index = get_payroll_period_index(month, year)
    if start_index == -1 or payroll_index == -1:
        return False
    if isinstance(payroll_index, float) and math.isnan(payroll_index):
        return False
    return payroll_index >= start_index


def compute_payroll_emi_amount(loan):
    outstanding = to_number(_n_or0(loan.get("outstandingBalance")))
    emi = to_number(_n_or0(loan.get("installmentAmount")))
    if outstanding <= 0 or emi <= 0:
        return 0
    remaining = compute_remaining_installments(outstanding, emi)
    if remaining == 1:
        return clean(outstanding)
    return clean(min(emi, outstanding))


def get_payroll_repayment_date(month, year):
    index = get_payroll_period_index(month, year)
    if index == -1:
        return datetime.now(timezone.utc)
    if isinstance(index, float) and (math.isnan(index) or math.isinf(index)):
        raise ValueError("Invalid Date")
    index = int(index)
    return js_local_datetime(index // 12, index % 12, 1)


# ------------------------------------------------------------------ model helpers


def _loan_models():
    from ..models import EmployeeLoan, LoanRepayment

    return EmployeeLoan, LoanRepayment


def loan_doc(loan, loan_type_fields=None, employee_fields=None):
    """``EmployeeLoan`` -> legacy lean dict; optional ``.populate`` of loanTypeId /
    employeeId with the given legacy field list."""
    d = loan.to_dict()
    if loan_type_fields is not None:
        lt = loan.loan_type if loan.loan_type_id else None
        if lt is None:
            d["loanTypeId"] = None
        else:
            full = lt.to_dict()
            d["loanTypeId"] = {"_id": full["_id"], **{k: full.get(k) for k in loan_type_fields}}
    if employee_fields is not None:
        emp = loan.employee if loan.employee_id else None
        d["employeeId"] = populate_employee(emp, employee_fields) if emp else None
    return d


def populate_employee(emp, fields):
    """Mongoose ``populate('employeeId', '<fields>')`` -> dict with ``_id`` + those paths."""
    full = emp.to_dict()
    out = {"_id": full["_id"]}
    for path in fields:
        if "." in path:
            head, tail = path.split(".", 1)
            src = full.get(head)
            if isinstance(src, dict) and tail in src:
                out.setdefault(head, {})[tail] = src[tail]
        elif path in full:
            out[path] = full[path]
    return out


def write_loan_doc(loan, d):
    """Copy the mutable schedule fields of a legacy loan dict back onto the model."""
    loan.outstanding_balance = d.get("outstandingBalance")
    loan.paid_installments = d.get("paidInstallments") or 0
    loan.total_installments = d.get("totalInstallments")
    loan.last_installment_amount = d.get("lastInstallmentAmount")
    loan.status = d.get("status")
    closed = d.get("closedAt")
    loan.closed_at = js_date(closed) if closed is not None else None


def count_payroll_repayments_for_loan(organization_id, loan_id):
    if not _pk(loan_id):
        return 0
    _, LoanRepayment = _loan_models()
    return LoanRepayment.objects.filter(org_id=_pk(organization_id), loan_id=_pk(loan_id),
                                        repayment_type="payroll").count()


def count_payroll_repayments_by_loan_ids(organization_id, loan_ids=()):
    if not loan_ids:
        return {}
    from django.db.models import Count

    _, LoanRepayment = _loan_models()
    rows = (LoanRepayment.objects
            .filter(org_id=_pk(organization_id), loan_id__in=[_pk(x) for x in loan_ids],
                    repayment_type="payroll")
            .values("loan_id").annotate(count=Count("id")))
    return {str(r["loan_id"]): r["count"] for r in rows}


def _restore_loan_from_repayment(loan, balance_before):
    d = loan.to_dict()
    d["outstandingBalance"] = balance_before
    if to_number(balance_before) > 0 and d.get("status") == "closed":
        d["status"] = "active"
        d["closedAt"] = None
    apply_schedule_after_repayment(d)
    write_loan_doc(loan, d)
    loan.save()


def build_loan_emi_deductions_for_employee(organization_id=None, employee_id=None, month=None,
                                           year=None, check_payroll_run=True):
    """Returns ``{"deductions": [...], "loanRepaymentPlans": [...]}`` (ids as strings)."""
    EmployeeLoan, LoanRepayment = _loan_models()
    deductions, plans = [], []
    payroll_month = normalize_payroll_month(month)
    payroll_year = to_number(year)
    if not payroll_month:
        return {"deductions": deductions, "loanRepaymentPlans": plans}

    org_id = _pk(organization_id)
    active = (EmployeeLoan.objects
              .filter(org_id=org_id, employee_id=_pk(employee_id), status="active",
                      outstanding_balance__gt=0)
              .select_related("loan_type").order_by("created_at", "id"))
    for loan_obj in active:
        loan = loan_doc(loan_obj, loan_type_fields=["loanName"])
        if not is_emi_due_for_payroll_month(loan.get("emiStartDate"), payroll_month, payroll_year):
            continue

        existing = (LoanRepayment.objects
                    .filter(org_id=org_id, loan_id=loan_obj.pk, repayment_type="payroll",
                            payroll_month=payroll_month, payroll_year=payroll_year)
                    .order_by("created_at").first())
        if existing is not None:
            payroll_exists = True
            if check_payroll_run and existing.payroll_id:
                from ..models import PayrollRun

                payroll_exists = PayrollRun.objects.filter(pk=existing.payroll_id).exists()
            elif check_payroll_run and not existing.payroll_id:
                payroll_exists = False
            if payroll_exists:
                continue
            with transaction.atomic():
                doc = EmployeeLoan.objects.select_for_update().filter(
                    pk=loan_obj.pk, org_id=org_id).first()
                if doc is not None:
                    _restore_loan_from_repayment(doc, existing.balance_before)
                LoanRepayment.objects.filter(pk=existing.pk).delete()

        emi_amount = compute_payroll_emi_amount(loan)
        if emi_amount <= 0:
            continue
        lt = loan.get("loanTypeId") or {}
        label = js_or(lt.get("loanName") if isinstance(lt, dict) else UNDEFINED,
                      loan.get("loanNumber"), "Loan")
        deductions.append({"componentName": f"Loan EMI ({label})", "amount": emi_amount,
                           "calculationType": "loan_emi", "loanId": loan["_id"]})
        plans.append({"loanId": loan["_id"], "repaymentAmount": emi_amount,
                      "loanNumber": loan.get("loanNumber"),
                      "balanceBefore": clean(loan.get("outstandingBalance"))})
    return {"deductions": deductions, "loanRepaymentPlans": plans}


def apply_payroll_loan_repayments(organization_id=None, employee_id=None, month=None, year=None,
                                  payroll_id=None, plans=None):
    """Creates ``LoanRepayment`` rows (type ``payroll``) and updates the loans.

    Returns the created ``LoanRepayment`` instances. Raises ``Exception`` (legacy
    ``Error``) when a planned loan is no longer active."""
    plans = plans or []
    if not plans:
        return []
    EmployeeLoan, LoanRepayment = _loan_models()
    org_id = _pk(organization_id)
    emp_id = _pk(employee_id)
    payroll_pk = _pk(payroll_id)
    payroll_month = normalize_payroll_month(month)
    payroll_year = to_number(year)
    repayment_date = get_payroll_repayment_date(payroll_month, payroll_year)
    saved = []
    for plan in plans:
        with transaction.atomic():
            loan = (EmployeeLoan.objects.select_for_update()
                    .filter(pk=plan.get("loanId"), org_id=org_id, employee_id=emp_id,
                            status="active").first())
            if loan is None or (loan.outstanding_balance or 0) <= 0:
                ident = js_or(plan.get("loanNumber"), plan.get("loanId"))
                raise Exception(  # noqa: TRY002 — legacy plain Error
                    f"Active loan not found for payroll EMI deduction ({js_str(ident)})")
            duplicate = LoanRepayment.objects.filter(
                org_id=org_id, loan_id=loan.pk, repayment_type="payroll",
                payroll_month=payroll_month, payroll_year=payroll_year).exists()
            if duplicate:
                continue
            amount = min(to_number(plan.get("repaymentAmount")), loan.outstanding_balance)
            if math.isnan(amount) or amount <= 0:
                continue
            before = loan.outstanding_balance
            after = max(0, before - amount)
            repayment = LoanRepayment.objects.create(
                org_id=org_id, loan=loan, employee_id=emp_id, repayment_amount=amount,
                repayment_date=repayment_date, payment_mode="bank_transfer",
                deposit_to_account="", reference_number=js_str(payroll_pk or ""),
                balance_before=before, balance_after=after, repayment_type="payroll",
                payroll_month=payroll_month, payroll_year=payroll_year, payroll_id=payroll_pk)
            d = loan.to_dict()
            d["outstandingBalance"] = after
            apply_schedule_after_repayment(d)
            if after == 0:
                d["status"] = "closed"
                d["closedAt"] = repayment_date
                d["paidInstallments"] = math.ceil(
                    (d.get("loanAmount") or 0) / d["installmentAmount"])
                d["totalInstallments"] = d["paidInstallments"]
                d["lastInstallmentAmount"] = 0
            write_loan_doc(loan, d)
            loan.save()
            saved.append(repayment)
    return saved


def reverse_payroll_loan_repayments(organization_id=None, employee_id=None, month=None,
                                    year=None):
    """Undo the payroll EMI repayments of one employee/period; returns how many."""
    EmployeeLoan, LoanRepayment = _loan_models()
    payroll_month = normalize_payroll_month(month)
    payroll_year = to_number(year)
    if not payroll_month or math.isnan(payroll_year) or payroll_year == 0:
        return 0
    org_id = _pk(organization_id)
    repayments = list(LoanRepayment.objects.filter(
        org_id=org_id, employee_id=_pk(employee_id), repayment_type="payroll",
        payroll_month=payroll_month, payroll_year=payroll_year).order_by("created_at"))
    for repayment in repayments:
        with transaction.atomic():
            loan = EmployeeLoan.objects.select_for_update().filter(
                pk=repayment.loan_id, org_id=org_id).first()
            if loan is not None:
                _restore_loan_from_repayment(loan, repayment.balance_before)
            LoanRepayment.objects.filter(pk=repayment.pk).delete()
    return len(repayments)
