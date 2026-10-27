"""Port of ``models/payroll/payrollAuditLog.js`` (schema ``PayrollAuditLog``). No hooks.

* ``entityId`` is a polymorphic ObjectId (payroll run, claim, revision...) -> id string.
* ``performedBy`` refs User -> BSS user id string.
* ``affectedEmployee`` refs Employee -> FK ``affected_employee`` (SET_NULL: the audit
  trail outlives the employee row, like the dangling legacy ref).
* ``beforeData`` / ``afterData`` are Mixed without default -> nullable JSON (None).
"""

from django.db import models

from .base import NO, DocModel, Obj, materialise

AUDIT_ACTIONS = [
    "payroll_processed", "payroll_approved", "payroll_rejected", "payroll_paid",
    "payroll_deleted", "salary_component_updated", "compliance_updated", "tds_calculated",
    "claim_approved", "claim_rejected", "settlement_initiated", "settlement_approved",
    "settlement_paid", "salary_revision_created", "salary_revision_deleted",
]
AUDIT_ENTITY_TYPES = ["payroll", "salary_component", "compliance", "tds", "claim",
                      "settlement", "salary_revision"]

# payrollAuditLog.js L60-66
PAYROLL_DETAILS = Obj(month=NO, year=NO, grossEarnings=NO, totalDeductions=NO, netPay=NO)


def default_payroll_details():
    return materialise(PAYROLL_DETAILS)


class PayrollAuditLog(DocModel):
    action = models.CharField(max_length=48, choices=[(c, c) for c in AUDIT_ACTIONS])
    entity_type = models.CharField(max_length=32, choices=[(c, c) for c in AUDIT_ENTITY_TYPES])
    entity_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    performed_by = models.CharField(max_length=64, blank=True, default="", db_index=True)
    performed_by_name = models.CharField(max_length=255, blank=True, default="")
    affected_employee = models.ForeignKey("payroll_engine.PayrollEmployee",
                                          on_delete=models.SET_NULL, null=True, blank=True,
                                          related_name="+")
    affected_employee_name = models.CharField(max_length=255, blank=True, default="")
    before_data = models.JSONField(null=True, blank=True, default=None)
    after_data = models.JSONField(null=True, blank=True, default=None)
    payroll_details = models.JSONField(default=default_payroll_details, blank=True)
    ip_address = models.CharField(max_length=64, blank=True, default="")
    user_agent = models.TextField(blank=True, default="")
    remarks = models.TextField(blank=True, default="")

    JSON_SCHEMAS = {"payroll_details": PAYROLL_DETAILS}

    DOC_FIELDS = {
        "action": "action", "entityType": "entity_type", "entityId": "entity_id",
        "performedBy": "performed_by", "performedByName": "performed_by_name",
        "affectedEmployee": "affected_employee",
        "affectedEmployeeName": "affected_employee_name", "beforeData": "before_data",
        "afterData": "after_data", "payrollDetails": "payroll_details",
        "ipAddress": "ip_address", "userAgent": "user_agent", "remarks": "remarks",
    }

    class Meta:
        db_table = "pe_payroll_audit_log"
        indexes = [models.Index(fields=["org", "-created_at"], name="idx_pe_audit_org_created")]
