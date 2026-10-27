"""Port of ``models/payroll/payrollRun.js`` (schema ``PayrollRun``). No hooks/methods.

``earnings`` / ``deductions`` / ``benefits`` / ``reimbursements`` elements carry an
``"_id"`` (``new_subdoc_id()``, filled on ``save()``); ``componentId`` / ``claimId`` are
id strings. Unique ``(employeeId, month, year)``.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, materialise, new_subdoc

PAY_STATUS = ["pending", "processed", "approved", "rejected", "on_hold", "paid"]
PAYMENT_MODES = ["bank_transfer", "cash", "cheque"]

# payrollRun.js L25-55
LINE = Obj(componentName=NO, fixedAmount=NO, amount=NO, calculationType=NO, componentId=NO)
# L58-65
REIMBURSEMENT_LINE = Obj(componentName=NO, amount=NO, calculationType=NO, claimId=NO)
# L82-89
EMPLOYER_CONTRIBUTIONS = Obj(epf=0, edli=0, adminCharges=0, esi=0, lwf=0, total=0)
# L92-101
EPF_DETAILS = Obj(applicable=False, epfWage=0, employeeRate=0, employerRate=0,
                  ceilingApplied=True, effectiveCeiling=0, abryApplied=False,
                  overrideUsed=False)
# L104-111
ESI_DETAILS = Obj(applicable=False, wageUsed=0, employeeRate=0, employerRate=0, wageLimit=0,
                  includeEmployerInCtc=True)
# L114-120
PT_DETAILS = Obj(applicable=False, stateUsed="", ptNumber="", cycle="monthly", amount=0)
# L123-129
LWF_DETAILS = Obj(applicable=False, stateUsed="", cycle="half-yearly", employeeShare=0,
                  employerShare=0)
# L132-139
BONUS_DETAILS = Obj(applicable=False, amount=0, cycle="yearly", paymentMonth="", calcBase=0,
                    percentage=0)


def default_employer_contributions():
    return materialise(EMPLOYER_CONTRIBUTIONS)


def default_epf_details():
    return materialise(EPF_DETAILS)


def default_esi_details():
    return materialise(ESI_DETAILS)


def default_pt_details():
    return materialise(PT_DETAILS)


def default_lwf_details():
    return materialise(LWF_DETAILS)


def default_bonus_details():
    return materialise(BONUS_DETAILS)


def new_line(**values):
    """Element of ``earnings`` / ``deductions`` / ``benefits``."""
    return new_subdoc(LINE, **values)


def new_reimbursement_line(**values):
    return new_subdoc(REIMBURSEMENT_LINE, **values)


class PayrollRun(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    month = models.CharField(max_length=32, blank=True, default="")         # required
    year = models.FloatField(null=True, blank=True)                         # required
    earnings = models.JSONField(default=list, blank=True)
    deductions = models.JSONField(default=list, blank=True)
    benefits = models.JSONField(default=list, blank=True)
    reimbursements = models.JSONField(default=list, blank=True)
    gross_earnings = models.FloatField(default=0)
    total_deductions = models.FloatField(default=0)
    net_pay = models.FloatField(default=0)
    employer_contributions = models.JSONField(default=default_employer_contributions,
                                              blank=True)
    epf_details = models.JSONField(default=default_epf_details, blank=True)
    esi_details = models.JSONField(default=default_esi_details, blank=True)
    pt_details = models.JSONField(default=default_pt_details, blank=True)
    lwf_details = models.JSONField(default=default_lwf_details, blank=True)
    bonus_details = models.JSONField(default=default_bonus_details, blank=True)
    working_days = models.FloatField(default=26)
    present_days = models.FloatField(default=26)
    absent_days = models.FloatField(default=0)
    lop_days = models.FloatField(default=0)
    pay_status = models.CharField(max_length=16, choices=[(c, c) for c in PAY_STATUS],
                                  default="pending", db_index=True)
    processed_date = models.DateTimeField(null=True, blank=True)
    approved_date = models.DateTimeField(null=True, blank=True)
    paid_date = models.DateTimeField(null=True, blank=True)
    payment_mode = models.CharField(max_length=20, blank=True, default="",
                                    choices=[(c, c) for c in PAYMENT_MODES])
    transaction_id = models.CharField(max_length=255, blank=True, default="")
    remarks = models.TextField(blank=True, default="")

    JSON_SCHEMAS = {
        "earnings": Arr(LINE), "deductions": Arr(LINE), "benefits": Arr(LINE),
        "reimbursements": Arr(REIMBURSEMENT_LINE),
        "employer_contributions": EMPLOYER_CONTRIBUTIONS, "epf_details": EPF_DETAILS,
        "esi_details": ESI_DETAILS, "pt_details": PT_DETAILS, "lwf_details": LWF_DETAILS,
        "bonus_details": BONUS_DETAILS,
    }

    DOC_FIELDS = {
        "employeeId": "employee", "month": "month", "year": "year", "earnings": "earnings",
        "deductions": "deductions", "benefits": "benefits", "reimbursements": "reimbursements",
        "grossEarnings": "gross_earnings", "totalDeductions": "total_deductions",
        "netPay": "net_pay", "employerContributions": "employer_contributions",
        "epfDetails": "epf_details", "esiDetails": "esi_details", "ptDetails": "pt_details",
        "lwfDetails": "lwf_details", "bonusDetails": "bonus_details",
        "workingDays": "working_days", "presentDays": "present_days",
        "absentDays": "absent_days", "lopDays": "lop_days", "payStatus": "pay_status",
        "processedDate": "processed_date", "approvedDate": "approved_date",
        "paidDate": "paid_date", "paymentMode": "payment_mode",
        "transactionId": "transaction_id", "remarks": "remarks",
    }

    class Meta:
        db_table = "pe_payroll_run"
        constraints = [models.UniqueConstraint(fields=["employee", "month", "year"],
                                               name="uq_pe_payroll_run_emp_period")]
        indexes = [models.Index(fields=["org", "month", "year"], name="idx_pe_run_org_period")]
