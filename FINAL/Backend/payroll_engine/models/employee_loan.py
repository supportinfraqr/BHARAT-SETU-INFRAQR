"""Port of ``models/payroll/employeeLoan.js`` (schema ``EmployeeLoan``). No hooks/methods.

* ``loanNumber`` has no default and a *sparse* unique index ``(organizationId,
  loanNumber)``: stored as NULL when absent so several loans without a number don't clash.
* ``loanTypeId`` -> ``loan_type`` uses ``PROTECT``: legacy ``deleteLoanType`` refuses to
  delete a type that still has loans (loanManagement.js ``countDocuments`` check).
* ``trim: true`` strings are trimmed on save; ``min`` validators run in ``full_clean()``.
"""

from django.core.validators import MinValueValidator
from django.db import models

from .base import DocModel

LOAN_STATUS = ["active", "closed", "cancelled"]


class EmployeeLoan(DocModel):
    loan_number = models.CharField(max_length=64, null=True, blank=True, default=None)
    loan_type = models.ForeignKey("payroll_engine.LoanType", on_delete=models.PROTECT,
                                  related_name="loans")
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    loan_amount = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    outstanding_balance = models.FloatField(null=True, blank=True,
                                            validators=[MinValueValidator(0)])
    disbursement_date = models.DateTimeField(null=True, blank=True)          # required
    paid_through_account = models.CharField(max_length=255, blank=True, default="")
    reference_number = models.CharField(max_length=255, blank=True, default="")
    reason = models.TextField(blank=True, default="")
    exempt_from_perquisite = models.BooleanField(default=False)
    emi_start_date = models.DateTimeField(null=True, blank=True)             # required
    installment_amount = models.FloatField(null=True, blank=True,
                                           validators=[MinValueValidator(0)])
    total_installments = models.FloatField(null=True, blank=True,
                                           validators=[MinValueValidator(1)])
    last_installment_amount = models.FloatField(null=True, blank=True,
                                                validators=[MinValueValidator(0)])
    paid_installments = models.FloatField(default=0, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=16, choices=[(c, c) for c in LOAN_STATUS],
                              default="active")
    closed_at = models.DateTimeField(null=True, blank=True, default=None)
    created_by = models.CharField(max_length=64, blank=True, default="")

    TRIM_FIELDS = ("loan_number", "paid_through_account", "reference_number", "reason")

    DOC_FIELDS = {
        "loanNumber": "loan_number", "loanTypeId": "loan_type", "employeeId": "employee",
        "loanAmount": "loan_amount", "outstandingBalance": "outstanding_balance",
        "disbursementDate": "disbursement_date", "paidThroughAccount": "paid_through_account",
        "referenceNumber": "reference_number", "reason": "reason",
        "exemptFromPerquisite": "exempt_from_perquisite", "emiStartDate": "emi_start_date",
        "installmentAmount": "installment_amount", "totalInstallments": "total_installments",
        "lastInstallmentAmount": "last_installment_amount",
        "paidInstallments": "paid_installments", "status": "status", "closedAt": "closed_at",
        "createdBy": "created_by",
    }

    class Meta:
        db_table = "pe_employee_loan"
        constraints = [models.UniqueConstraint(fields=["org", "loan_number"],
                                               name="uq_pe_employee_loan_org_number")]
        indexes = [
            models.Index(fields=["org", "employee"], name="idx_pe_loan_org_emp"),
            models.Index(fields=["org", "loan_type"], name="idx_pe_loan_org_type"),
            models.Index(fields=["org", "status"], name="idx_pe_loan_org_status"),
        ]
