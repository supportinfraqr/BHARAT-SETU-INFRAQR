"""Port of ``models/payroll/salaryRevision.js`` (schema ``SalaryRevision``). No hooks.

``oldSalary`` / ``newSalary`` keep the legacy shape (their arrays' elements, like
``approvals``, carry ``"_id"`` via ``new_subdoc_id()`` on ``save()``). ``newSalary.ctc``
etc. are ``required`` without default -> absent until set. ``statutoryApplicability`` has
no defaults -> ``{}``. ``requestedBy`` refs User -> BSS user id string.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, Trim, materialise, new_subdoc

REVISION_TYPES = ["increment", "promotion", "adjustment", "new_joiner", "annual_hike"]
REVISION_STATUS = ["pending", "approved", "rejected", "implemented"]

COMPONENT_AMOUNT = Obj(componentName=NO, amount=NO)
COMPONENT_OVERRIDE = Obj(category=NO, code=NO, name=NO, overrideAmount=NO, disabled=False)
DEFAULT_COMPONENT = Obj(category=NO, code=NO, name=NO, componentName=NO, amount=NO)
# salaryRevision.js L26-48
OLD_SALARY = Obj(ctc=0, grossSalary=0, basicSalary=0, components=Arr(COMPONENT_AMOUNT),
                 componentOverrides=Arr(COMPONENT_OVERRIDE))
# L50-84
NEW_SALARY = Obj(ctc=NO, grossSalary=NO, basicSalary=NO, components=Arr(COMPONENT_AMOUNT),
                 componentOverrides=Arr(COMPONENT_OVERRIDE),
                 defaultComponents=Arr(DEFAULT_COMPONENT))
# L95-101
STATUTORY_APPLICABILITY = Obj(epfApplicable=NO, pfOnActuals=NO, esiApplicable=NO,
                              lwfApplicable=NO, ptApplicable=NO)
# L112-129 (employeeId stored as id string / None)
APPROVAL = Obj(employeeId=None, approverName=NO, approverRole=NO, approvedDate=NO,
               status="pending", comments=NO)


def default_old_salary():
    return materialise(OLD_SALARY)


def default_new_salary():
    return materialise(NEW_SALARY)


def default_statutory_applicability():
    return materialise(STATUTORY_APPLICABILITY)


def new_approval(**values):
    return new_subdoc(APPROVAL, **values)


class SalaryRevision(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    revision_type = models.CharField(max_length=20, choices=[(c, c) for c in REVISION_TYPES])
    effective_from = models.DateTimeField(null=True, blank=True)             # required
    old_salary = models.JSONField(default=default_old_salary, blank=True)
    new_salary = models.JSONField(default=default_new_salary, blank=True)
    increment_amount = models.FloatField(default=0)
    increment_percentage = models.FloatField(default=0)
    arrears_applicable = models.BooleanField(default=False)
    arrears_from_date = models.DateTimeField(null=True, blank=True)
    arrears_to_date = models.DateTimeField(null=True, blank=True)
    arrears_amount = models.FloatField(default=0)
    arrears_paid = models.BooleanField(default=False)
    statutory_applicability = models.JSONField(default=default_statutory_applicability,
                                               blank=True)
    status = models.CharField(max_length=16, choices=[(c, c) for c in REVISION_STATUS],
                              default="pending")
    requested_by = models.CharField(max_length=64, blank=True, default="")
    approvals = models.JSONField(default=list, blank=True)
    implemented_date = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")
    state = models.CharField(max_length=64, blank=True, default="")

    TRIM_FIELDS = ("state",)
    JSON_SCHEMAS = {"old_salary": OLD_SALARY, "new_salary": NEW_SALARY,
                    "statutory_applicability": STATUTORY_APPLICABILITY,
                    "approvals": Arr(APPROVAL)}

    DOC_FIELDS = {
        "employeeId": "employee", "revisionType": "revision_type",
        "effectiveFrom": "effective_from", "oldSalary": "old_salary",
        "newSalary": "new_salary", "incrementAmount": "increment_amount",
        "incrementPercentage": "increment_percentage",
        "arrearsApplicable": "arrears_applicable", "arrearsFromDate": "arrears_from_date",
        "arrearsToDate": "arrears_to_date", "arrearsAmount": "arrears_amount",
        "arrearsPaid": "arrears_paid", "statutoryApplicability": "statutory_applicability",
        "status": "status", "requestedBy": "requested_by", "approvals": "approvals",
        "implementedDate": "implemented_date", "remarks": "remarks", "state": "state",
    }

    class Meta:
        db_table = "pe_salary_revision"
        indexes = [
            models.Index(fields=["employee", "-effective_from"], name="idx_pe_rev_emp_eff"),
            models.Index(fields=["org", "status"], name="idx_pe_rev_org_status"),
        ]
