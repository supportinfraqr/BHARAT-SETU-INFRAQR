"""Port of ``models/payroll/payrollOneTimeImport.js`` (schema ``PayrollOneTimeImport``).

``rows`` elements use ``{ _id: false }`` in legacy -> no ``"_id"``; row defaults and
``trim`` are applied on ``save()`` (``new_row()`` builds one). Row ``employeeId`` is the
PayrollEmployee id string (or None). The legacy unique index on ``importBatchId`` lived in
a per-org database, so it is ``UniqueConstraint(org, import_batch_id)`` here.
"""

from django.db import models

from .base import Arr, DocModel, Obj, Trim, materialise, new_subdoc

# payrollOneTimeImport.js L3-24
ROW = Obj(
    rowNumber=0, employeeId=None, employeeCode=Trim(""), employeeName=Trim(""),
    category=Trim(""), componentCode=Trim(""), componentName=Trim(""), amount=0,
    remarks=Trim(""), valid=False, error="", isAdHoc=False, matchedOrgComponent=False,
)
# L45-49
SUMMARY = Obj(totalRows=0, validRows=0, invalidRows=0)
IMPORT_STATUS = ["draft", "confirmed", "cancelled"]


def default_summary():
    return materialise(SUMMARY)


def new_row(**values):
    return new_subdoc(ROW, _id=False, **values)


class PayrollOneTimeImport(DocModel):
    month = models.CharField(max_length=32, blank=True, default="")         # required
    year = models.FloatField(null=True, blank=True)                         # required
    import_batch_id = models.CharField(max_length=64)                       # required
    file_name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=16, choices=[(c, c) for c in IMPORT_STATUS],
                              default="draft")
    uploaded_by = models.CharField(max_length=64, blank=True, default="")
    confirmed_at = models.DateTimeField(null=True, blank=True, default=None)
    rows = models.JSONField(default=list, blank=True)
    summary = models.JSONField(default=default_summary, blank=True)

    TRIM_FIELDS = ("month", "import_batch_id", "file_name")
    JSON_SCHEMAS = {"rows": Arr(ROW, _id=False), "summary": SUMMARY}

    DOC_FIELDS = {
        "month": "month", "year": "year", "importBatchId": "import_batch_id",
        "fileName": "file_name", "status": "status", "uploadedBy": "uploaded_by",
        "confirmedAt": "confirmed_at", "rows": "rows", "summary": "summary",
    }

    class Meta:
        db_table = "pe_payroll_one_time_import"
        constraints = [models.UniqueConstraint(fields=["org", "import_batch_id"],
                                               name="uq_pe_onetime_import_batch")]
        indexes = [models.Index(fields=["org", "month", "year", "status"],
                                name="idx_pe_onetime_org_period")]  # legacy name org_period_status
