"""Port of ``models/payroll/loanRepayment.js`` (schema ``LoanRepayment``). No hooks.

* ``loanId`` -> ``loan`` (CASCADE; legacy never deletes loans, so this never fires).
* ``payrollId`` -> ``payroll`` (FK PayrollRun, SET_NULL).
* ``payrollMonth`` defaults to ``null`` in legacy, kept as NULL here; the partial unique
  index (``repaymentType: 'payroll'``) is a conditional ``UniqueConstraint``.
"""

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from .base import DocModel

PAYMENT_MODES = ["cash", "bank_transfer", "cheque"]
REPAYMENT_TYPES = ["manual", "payroll"]


class LoanRepayment(DocModel):
    loan = models.ForeignKey("payroll_engine.EmployeeLoan", on_delete=models.CASCADE,
                             related_name="repayments")
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    repayment_amount = models.FloatField(null=True, blank=True,
                                         validators=[MinValueValidator(0)])
    repayment_date = models.DateTimeField(null=True, blank=True)             # required
    payment_mode = models.CharField(max_length=20, blank=True, default="",
                                    choices=[(c, c) for c in PAYMENT_MODES])  # required
    deposit_to_account = models.CharField(max_length=255, blank=True, default="")
    reference_number = models.CharField(max_length=255, blank=True, default="")
    balance_before = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    balance_after = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    repayment_type = models.CharField(max_length=16, choices=[(c, c) for c in REPAYMENT_TYPES],
                                      default="manual")
    payroll_month = models.CharField(max_length=32, null=True, blank=True, default=None)
    payroll_year = models.FloatField(null=True, blank=True, default=None)
    payroll = models.ForeignKey("payroll_engine.PayrollRun", on_delete=models.SET_NULL,
                                null=True, blank=True, default=None, related_name="+")
    created_by = models.CharField(max_length=64, blank=True, default="")

    TRIM_FIELDS = ("deposit_to_account", "reference_number", "payroll_month")

    DOC_FIELDS = {
        "loanId": "loan", "employeeId": "employee", "repaymentAmount": "repayment_amount",
        "repaymentDate": "repayment_date", "paymentMode": "payment_mode",
        "depositToAccount": "deposit_to_account", "referenceNumber": "reference_number",
        "balanceBefore": "balance_before", "balanceAfter": "balance_after",
        "repaymentType": "repayment_type", "payrollMonth": "payroll_month",
        "payrollYear": "payroll_year", "payrollId": "payroll", "createdBy": "created_by",
    }

    class Meta:
        db_table = "pe_loan_repayment"
        constraints = [models.UniqueConstraint(
            fields=["org", "loan", "repayment_type", "payroll_month", "payroll_year"],
            condition=Q(repayment_type="payroll"), name="uq_pe_loan_repay_payroll_period")]
        indexes = [
            models.Index(fields=["org", "loan", "-repayment_date"], name="idx_pe_repay_org_loan_dt"),
            models.Index(fields=["org", "employee"], name="idx_pe_repay_org_emp"),
        ]
