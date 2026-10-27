"""Port of ``models/payroll/loanType.js`` (schema ``LoanType``). No hooks/methods.

``loanName`` has ``trim: true`` (applied on save). Unique ``(organizationId, loanName)``.
"""

from django.core.validators import MinValueValidator
from django.db import models

from .base import DocModel


class LoanType(DocModel):
    loan_name = models.CharField(max_length=255, blank=True, default="")      # required
    perquisite_rate = models.FloatField(default=0, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=16, choices=[("active", "active"),
                                                      ("inactive", "inactive")],
                              default="active")
    created_by = models.CharField(max_length=64, blank=True, default="")

    TRIM_FIELDS = ("loan_name",)

    DOC_FIELDS = {
        "loanName": "loan_name", "perquisiteRate": "perquisite_rate", "status": "status",
        "createdBy": "created_by",
    }

    class Meta:
        db_table = "pe_loan_type"
        constraints = [models.UniqueConstraint(fields=["org", "loan_name"],
                                               name="uq_pe_loan_type_org_name")]
