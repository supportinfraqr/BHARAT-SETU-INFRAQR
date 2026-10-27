"""Port of ``models/payroll/fullAndFinal.js`` (schema ``FullAndFinal``). No hooks/methods.

* ``resignationId`` refs the HR ``Resignation`` collection (not a payroll document, no BSS
  equivalent) -> plain id string column ``resignation_id``.
* ``approvals`` / ``documents`` elements carry ``"_id"`` (``new_subdoc_id()``); element
  defaults (``status: 'pending'``, ``uploadedAt: Date.now``) are applied on ``save()``.
* ``paymentDetails`` has no defaults -> ``{}`` (Mongoose minimises the empty object).
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, materialise, new_subdoc, now_iso

FNF_STATUS = ["initiated", "pending", "approved", "finalized", "paid", "rejected"]

# fullAndFinal.js L33-40
SALARY_DUES = Obj(unpaidSalary=0, workingDaysInLastMonth=0, proratedSalary=0, basicSalary=0,
                  allowances=0, formula="")
# L43-52
LEAVE_ENCASHMENT = Obj(availableLeaves=0, encashableLeaves=0, perDayRate=0, totalAmount=0,
                       method="basic_26", basicSalary=0, grossSalary=0, formula="")
# L55-66
BONUS_INCENTIVES = Obj(performanceBonus=0, statutoryBonus=0, incentives=0, commission=0,
                       method="", formula="", monthsCounted=0, calcBase=0, percentage=0,
                       eligible=False)
# L69-74
PENDING_REIMBURSEMENTS = Obj(travel=0, medical=0, other=0, totalAmount=0)
# L77-85
DEDUCTIONS = Obj(noticePeriodShortfall=0, loansAdvances=0, companyAssetRecovery=0,
                 damageLoss=0, overtimeTaken=0, otherDeductions=0, totalDeductions=0)
# L88-97
GRATUITY = Obj(isEligible=False, yearsOfService=0, completedYears=0, lastDrawnSalary=0,
               gratuityAmount=0, formula="", reason="", capped=False)
# L100-104
TAX_DEDUCTIONS = Obj(tds=0, professionalTax=0, totalTax=0)
# L112-121
PAYMENT_DETAILS = Obj(paymentMode=NO, paymentDate=NO, transactionId=NO, bankAccountNumber=NO,
                      ifscCode=NO)
# L124-136
APPROVAL = Obj(approverName=NO, approverRole=NO, approvedDate=NO, status="pending",
               comments=NO)
# L139-145
DOCUMENT = Obj(documentType=NO, documentUrl=NO, uploadedAt=now_iso)


def default_salary_dues():
    return materialise(SALARY_DUES)


def default_leave_encashment():
    return materialise(LEAVE_ENCASHMENT)


def default_bonus_incentives():
    return materialise(BONUS_INCENTIVES)


def default_pending_reimbursements():
    return materialise(PENDING_REIMBURSEMENTS)


def default_deductions():
    return materialise(DEDUCTIONS)


def default_gratuity():
    return materialise(GRATUITY)


def default_tax_deductions():
    return materialise(TAX_DEDUCTIONS)


def default_payment_details():
    return materialise(PAYMENT_DETAILS)


def new_approval(**values):
    return new_subdoc(APPROVAL, **values)


def new_document(**values):
    return new_subdoc(DOCUMENT, **values)


class FullAndFinal(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    resignation_id = models.CharField(max_length=64, blank=True, default="")
    last_working_date = models.DateTimeField(null=True, blank=True)          # required
    settlement_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=[(c, c) for c in FNF_STATUS],
                              default="initiated")
    salary_dues = models.JSONField(default=default_salary_dues, blank=True)
    leave_encashment = models.JSONField(default=default_leave_encashment, blank=True)
    bonus_incentives = models.JSONField(default=default_bonus_incentives, blank=True)
    pending_reimbursements = models.JSONField(default=default_pending_reimbursements,
                                              blank=True)
    deductions = models.JSONField(default=default_deductions, blank=True)
    gratuity = models.JSONField(default=default_gratuity, blank=True)
    tax_deductions = models.JSONField(default=default_tax_deductions, blank=True)
    total_payables = models.FloatField(default=0)
    total_deductions = models.FloatField(default=0)
    net_payable = models.FloatField(default=0)
    payment_details = models.JSONField(default=default_payment_details, blank=True)
    approvals = models.JSONField(default=list, blank=True)
    documents = models.JSONField(default=list, blank=True)
    remarks = models.TextField(blank=True, default="")
    finalized_at = models.DateTimeField(null=True, blank=True)

    JSON_SCHEMAS = {
        "salary_dues": SALARY_DUES, "leave_encashment": LEAVE_ENCASHMENT,
        "bonus_incentives": BONUS_INCENTIVES, "pending_reimbursements": PENDING_REIMBURSEMENTS,
        "deductions": DEDUCTIONS, "gratuity": GRATUITY, "tax_deductions": TAX_DEDUCTIONS,
        "payment_details": PAYMENT_DETAILS, "approvals": Arr(APPROVAL),
        "documents": Arr(DOCUMENT),
    }

    DOC_FIELDS = {
        "employeeId": "employee", "resignationId": "resignation_id",
        "lastWorkingDate": "last_working_date", "settlementDate": "settlement_date",
        "status": "status", "salaryDues": "salary_dues", "leaveEncashment": "leave_encashment",
        "bonusIncentives": "bonus_incentives",
        "pendingReimbursements": "pending_reimbursements", "deductions": "deductions",
        "gratuity": "gratuity", "taxDeductions": "tax_deductions",
        "totalPayables": "total_payables", "totalDeductions": "total_deductions",
        "netPayable": "net_payable", "paymentDetails": "payment_details",
        "approvals": "approvals", "documents": "documents", "remarks": "remarks",
        "finalizedAt": "finalized_at",
    }

    class Meta:
        db_table = "pe_full_and_final"
        indexes = [models.Index(fields=["org", "status"], name="idx_pe_fnf_org_status"),
                   models.Index(fields=["org", "employee"], name="idx_pe_fnf_org_emp")]
