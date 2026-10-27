"""Port of ``models/payroll/arrears.js`` (schema ``Arrears``).

Nested JSON columns keep the legacy camelCase shape. ``components`` elements carry an
``"_id"`` (``new_subdoc_id()``), filled on ``save()`` like Mongoose. No hooks/methods in
the legacy schema.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, materialise

ARREARS_TYPES = ["salary_revision", "correction", "bonus", "incentive", "allowance", "other"]
ARREARS_STATUS = ["calculated", "approved", "paid", "rejected"]

# arrears.js L22-29
PERIOD = Obj(month=NO, year=NO)
# arrears.js L31-40
COMPONENTS = Arr(Obj(componentName=NO, oldAmount=NO, newAmount=NO, difference=NO,
                     months=NO, totalArrears=NO))


def default_period():
    return materialise(PERIOD)


class Arrears(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    arrears_type = models.CharField(max_length=32, choices=[(c, c) for c in ARREARS_TYPES])
    period_from = models.JSONField(default=default_period, blank=True)
    period_to = models.JSONField(default=default_period, blank=True)
    components = models.JSONField(default=list, blank=True)
    total_arrears_amount = models.FloatField(null=True, blank=True)       # required
    tds_on_arrears = models.FloatField(default=0)
    net_arrears_payable = models.FloatField(default=0)
    pay_in_month = models.CharField(max_length=32, blank=True, default="")
    pay_in_year = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[(c, c) for c in ARREARS_STATUS],
                              default="calculated")
    paid_in_month = models.CharField(max_length=32, blank=True, default="")
    paid_in_year = models.FloatField(null=True, blank=True)
    payroll = models.ForeignKey("payroll_engine.PayrollRun", on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="+")
    paid_date = models.DateTimeField(null=True, blank=True)
    salary_revision = models.ForeignKey("payroll_engine.SalaryRevision",
                                        on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name="+")
    remarks = models.TextField(blank=True, default="")

    JSON_SCHEMAS = {"period_from": PERIOD, "period_to": PERIOD, "components": COMPONENTS}

    DOC_FIELDS = {
        "employeeId": "employee", "arrearsType": "arrears_type", "periodFrom": "period_from",
        "periodTo": "period_to", "components": "components",
        "totalArrearsAmount": "total_arrears_amount", "tdsOnArrears": "tds_on_arrears",
        "netArrearsPayable": "net_arrears_payable", "payInMonth": "pay_in_month",
        "payInYear": "pay_in_year", "status": "status", "paidInMonth": "paid_in_month",
        "paidInYear": "paid_in_year", "payrollId": "payroll", "paidDate": "paid_date",
        "salaryRevisionId": "salary_revision", "remarks": "remarks",
    }

    class Meta:
        db_table = "pe_arrears"
        indexes = [
            models.Index(fields=["employee", "status"], name="idx_pe_arr_emp_status"),
            models.Index(fields=["org", "status"], name="idx_pe_arr_org_status"),
            models.Index(fields=["org", "status", "pay_in_month", "pay_in_year"],
                         name="idx_pe_arr_org_status_payin"),
        ]
