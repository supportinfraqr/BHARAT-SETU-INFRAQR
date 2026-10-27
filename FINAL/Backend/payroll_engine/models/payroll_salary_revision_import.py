"""Port of ``models/payroll/payrollSalaryRevisionImport.js``
(schema ``PayrollSalaryRevisionImport``). No hooks/methods.

All nested schemas use ``{ _id: false }`` -> rows and their component arrays carry no
``"_id"``. Row defaults / ``trim`` are applied on ``save()`` (``new_row()`` builds one).
Row ``employeeId`` / ``revisionId`` are id strings (or None); dates inside rows are ISO
strings. Unique ``importBatchId`` (per-org DB in legacy) -> ``(org, import_batch_id)``.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, Trim, materialise, new_subdoc

# L3-15
COMPONENT_OVERRIDE = Obj(category=NO, code=Trim(""), name=Trim(""), overrideAmount=None,
                         disabled=False)
# L17-23
SALARY_COMPONENT_AMOUNT = Obj(componentName=Trim(""), amount=0)
# L25-37
DEFAULT_COMPONENT = Obj(category=NO, code=Trim(""), name=Trim(""), componentName=Trim(""),
                        amount=0)
# L39-98
ROW = Obj(
    rowNumber=0, employeeId=None, employeeCode=Trim(""), employeeName=Trim(""),
    revisionType=Trim(""), effectiveFrom=None, baseSalary=0, grossSalary=0,
    grossSalaryInput=None, ctcInput=None, state=Trim(""), taxRegime=Trim(""),
    paymentFrequency=Trim(""), arrearsApplicable=False, arrearsFromDate=None,
    autoApprove=False, autoImplement=False, remarks=Trim(""),
    employeeComponentOverrides=Arr(COMPONENT_OVERRIDE, _id=False),
    excelComponentOverrides=Arr(COMPONENT_OVERRIDE, _id=False),
    defaultComponents=Arr(DEFAULT_COMPONENT, _id=False),
    oldSalary=Obj(ctc=0, grossSalary=0, basicSalary=0,
                  components=Arr(SALARY_COMPONENT_AMOUNT, _id=False),
                  componentOverrides=Arr(COMPONENT_OVERRIDE, _id=False)),
    newSalary=Obj(ctc=0, grossSalary=0, basicSalary=0,
                  components=Arr(SALARY_COMPONENT_AMOUNT, _id=False),
                  componentOverrides=Arr(COMPONENT_OVERRIDE, _id=False),
                  defaultComponents=Arr(DEFAULT_COMPONENT, _id=False)),
    incrementAmount=0, incrementPercentage=0, arrearsAmount=0, plannedStatus=Trim("pending"),
    warnings=Arr(), valid=False, error="", revisionId=None, appliedStatus=Trim(""),
    statutoryFlags=Obj(epfApplicable=NO, pfOnActuals=NO, esiApplicable=NO,
                       lwfApplicable=NO, ptApplicable=NO),
    revisionTypeLabel=Trim(""),
)
# L117-125
SUMMARY = Obj(totalRows=0, validRows=0, invalidRows=0, revisionsCreated=0, approved=0,
              implemented=0, failed=0)
IMPORT_STATUS = ["draft", "confirmed", "cancelled"]


def default_summary():
    return materialise(SUMMARY)


def new_row(**values):
    return new_subdoc(ROW, _id=False, **values)


class PayrollSalaryRevisionImport(DocModel):
    import_batch_id = models.CharField(max_length=64)                       # required
    file_name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=[(c, c) for c in IMPORT_STATUS],
                              default="draft")
    uploaded_by = models.CharField(max_length=64, blank=True, default="")
    confirmed_at = models.DateTimeField(null=True, blank=True, default=None)
    rows = models.JSONField(default=list, blank=True)
    summary = models.JSONField(default=default_summary, blank=True)

    TRIM_FIELDS = ("import_batch_id", "file_name")
    JSON_SCHEMAS = {"rows": Arr(ROW, _id=False), "summary": SUMMARY}

    DOC_FIELDS = {
        "importBatchId": "import_batch_id", "fileName": "file_name", "status": "status",
        "uploadedBy": "uploaded_by", "confirmedAt": "confirmed_at", "rows": "rows",
        "summary": "summary",
    }

    class Meta:
        db_table = "pe_payroll_salary_revision_import"
        constraints = [models.UniqueConstraint(fields=["org", "import_batch_id"],
                                               name="uq_pe_rev_import_batch")]
        indexes = [models.Index(fields=["org", "status"], name="idx_pe_revimp_org_status")]
