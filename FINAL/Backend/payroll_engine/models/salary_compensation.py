"""Port of ``models/payroll/salaryCompensation.js`` (schema ``SalaryCompensation``).

One document per ``category``; ``components`` elements (componentSchema, own ``_id`` —
controllers address components by id) carry ``"_id"`` (``new_subdoc_id()``). Component
defaults are applied on ``save()``; ``new_component()`` builds one. No hooks/methods.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, new_subdoc

CATEGORIES = ["earnings", "deductions", "benefits", "reimbursements"]

# salaryCompensation.js L3-42
COMPONENT = Obj(
    name=NO, code=NO, description=NO, type=NO, calculationType="fixed", value=0,
    basedOn="none", considerForEPF=False, considerForESI=False, calculateOnProRata=False,
    taxable=True, frequency="monthly", paymentMonth="", maxLimit=0, status="active",
)


def new_component(**values):
    return new_subdoc(COMPONENT, **values)


class SalaryCompensation(DocModel):
    category = models.CharField(max_length=20, choices=[(c, c) for c in CATEGORIES])
    components = models.JSONField(default=list, blank=True)

    JSON_SCHEMAS = {"components": Arr(COMPONENT)}

    DOC_FIELDS = {"category": "category", "components": "components"}

    class Meta:
        db_table = "pe_salary_compensation"
        indexes = [models.Index(fields=["org", "category"], name="idx_pe_comp_org_category")]
