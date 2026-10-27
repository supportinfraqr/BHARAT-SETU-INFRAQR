"""Port of ``models/payroll/employeeTDS.js`` (schema ``EmployeeTDS``). No hooks/methods.

Nested objects are JSON columns whose defaults equal what Mongoose materialises (every
nested default filled, arrays ``[]``). Array elements (``investments80C``,
``itDeclaration.rentEntries``, ``taxPayable.slabBreakdown``, ``proofItems``...) carry an
``"_id"`` (``new_subdoc_id()``); ids, element defaults and ``trim: true`` are applied on
``save()``. Unique ``(employeeId, financialYear)``.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, Trim, materialise, new_subdoc

# employeeTDS.js L27-34
PROJECTED_ANNUAL_INCOME = Obj(basic=0, hra=0, allowances=0, otherIncome=0, loanPerquisite=0,
                              total=0)
# L36-75
DECLARED_DEDUCTIONS = Obj(
    section80C=0, section80CCC=0, section80CCD1=0, section80CCD1B=0, section80CCD2=0,
    section80D=0, section80DD=0, section80DDSevere=False, section80DDB=0, section80E=0,
    section80EE=0, section80EEA=0, section80G=0, section80GG=0, section80GGA=0,
    section80GGC=0, section80TTA=0, section80TTB=0, section80U=0, section80DSelf=0,
    section80DParents=0, section80DPreventive=0, section80DPreventiveSelf=0,
    section80DPreventiveParents=0, section80DMedicalSelf=0, section80DMedicalParents=0,
    section80DSelfSenior=False, section80DParentsSenior=False, section80DDBReimbursed=0,
    section80G50=0, section80G100Limited=0, section80G50Limited=0, section80EStartYear=0,
    section24=0, standardDeduction=50000, professionalTax=0, otherDeductions=0, total=0,
)
# L77-90, L118-124
INVESTMENT_LINE = Obj(investmentType=Trim(""), amount=0, attachment=Trim(""))
# L92-175
IT_DECLARATION = Obj(
    stayingInRentedHouse=False,
    rentEntries=Arr(Obj(
        fromDate=Trim(""), toDate=Trim(""), rentMonthly=0, rentAnnual=0, address=Trim(""),
        landlordName=Trim(""), urbanizationType=Trim(""), urbanizationType2=Trim(""),
        isMetroCity=False, attachment=Trim(""),
    )),
    homeLoanSelfOccupied=Obj(enabled=False, principalPaid=0, interestPaid=0,
                             lenderName=Trim(""), lenderPAN=Trim(""), attachment=Trim("")),
    letOutPropertyEnabled=False,
    letOutPropertyAttachment=Trim(""),
    investmentsOther=Arr(INVESTMENT_LINE),
    otherIncomeBreakdown=Obj(incomeFromOtherSources=0, interestSavings=0, interestFD=0,
                             interestNSC=0, attachment=Trim("")),
    toggles=Obj(section80C=True, section80D=True, otherInvestments=False),
    chapterVIA=Obj(
        section80CCC=0, section80CCD1=0, section80CCD1B=0, section80CCD2=0, section80DD=0,
        section80DDSevere=False, section80DDB=0, section80EE=0, section80EEA=0,
        section80GG=0, section80GGA=0, section80GGC=0, section80TTA=0, section80G50=0,
        section80G100Limited=0, section80G50Limited=0, section80EStartYear=0,
        section80DParents=0, section80DPreventive=0, section80DMedicalSelf=0,
        section80DMedicalParents=0, section80DSelfSenior=False, section80DParentsSenior=False,
    ),
    salaryExemptions=Obj(
        childrenCount=0, childrenEducationReceived=0, hostelAllowanceReceived=0,
        ltaEligibleTravel=0, disabledTransportReceived=0, gratuityReceived=0,
        leaveEncashmentReceived=0, retrenchmentReceived=0, vrsReceived=0,
        officialDutySpent=0, lifeInsuranceExempt=0,
    ),
)
# L177-185
HRA_EXEMPTION = Obj(actualHRA=0, rentPaid=0, basic=0, rentMinusTenPercent=0, percentOfBasic=0,
                    isMetro=False, exemptAmount=0)
# L189-205
TAX_PAYABLE = Obj(
    incomeTax=0, surcharge=0, surchargeRate=0, cess=0, cessRate=4, total=0,
    slabBreakdown=Arr(Obj(incomeFrom=0, incomeTo=0, rate=0, taxableAmount=0, tax=0)),
)
# L209-226
INCOME_BREAKDOWN = Obj(
    monthlyGross=0, equivalentMonths=0, salaryIncome=0, otherIncome=0, loanPerquisite=0,
    total=0,
    months=Arr(Obj(label="", daysInMonth=0, applicableDays=0, excludedBefore=0,
                   partial=False, amount=0)),
)
# L229-245
TDS_PERIOD = Obj(
    start=None, end=None, equivalentMonths=12, payrollImplementationDate=None,
    payrollScheduleDate=None, joiningDate=None, startDateSource="",
    openingMonth=Obj(label="", daysInMonth=0, applicableDays=0, excludedBefore=0,
                     countedFrom=0, countedTo=0),
)
# L247-257
FULL_YEAR_COMPARISON = Obj(gross=0, totalIncome=0, deductions=0, hraExemption=0,
                           taxableIncome=0, taxPayable=0, monthlyTDS=0, periodStart=None,
                           periodEnd=None)
# L259-266 (payrollId stored as the PayrollRun id string)
MONTHLY_DEDUCTION = Obj(month=NO, year=NO, tdsDeducted=NO, payrollId=NO)
# L271-285
PROOF_ITEM = Obj(lineKey=Trim(""), sectionName=Trim(""), deductionHead=Trim(""),
                 requestedAmount=0, acceptedAmount=0, status="pending", remark=Trim(""))


def default_projected_annual_income():
    return materialise(PROJECTED_ANNUAL_INCOME)


def default_declared_deductions():
    return materialise(DECLARED_DEDUCTIONS)


def default_it_declaration():
    return materialise(IT_DECLARATION)


def default_hra_exemption():
    return materialise(HRA_EXEMPTION)


def default_tax_payable():
    return materialise(TAX_PAYABLE)


def default_income_breakdown():
    return materialise(INCOME_BREAKDOWN)


def default_tds_period():
    return materialise(TDS_PERIOD)


def default_full_year_comparison():
    return materialise(FULL_YEAR_COMPARISON)


def new_investment_line(**values):
    return new_subdoc(INVESTMENT_LINE, **values)


def new_proof_item(**values):
    return new_subdoc(PROOF_ITEM, **values)


def new_monthly_deduction(**values):
    return new_subdoc(MONTHLY_DEDUCTION, **values)


class EmployeeTDS(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    financial_year = models.CharField(max_length=16, blank=True, default="")    # required
    tax_regime = models.CharField(max_length=8, default="new",
                                  choices=[("old", "old"), ("new", "new")])
    projected_annual_income = models.JSONField(default=default_projected_annual_income,
                                               blank=True)
    declared_deductions = models.JSONField(default=default_declared_deductions, blank=True)
    investments80_c = models.JSONField(default=list, blank=True)
    investments80_d = models.JSONField(default=list, blank=True)
    it_declaration = models.JSONField(default=default_it_declaration, blank=True)
    hra_exemption = models.JSONField(default=default_hra_exemption, blank=True)
    section10_exemptions = models.JSONField(default=dict, blank=True)          # Mixed, {}
    taxable_income = models.FloatField(default=0)
    tax_payable = models.JSONField(default=default_tax_payable, blank=True)
    rebate_applicable = models.BooleanField(default=False)
    rebate_amount = models.FloatField(default=0)
    income_breakdown = models.JSONField(default=default_income_breakdown, blank=True)
    monthly_tds = models.FloatField(default=0)
    tds_period = models.JSONField(default=default_tds_period, blank=True)
    full_year_comparison = models.JSONField(default=default_full_year_comparison, blank=True)
    monthly_deductions = models.JSONField(default=list, blank=True)
    total_tds_deducted = models.FloatField(default=0)
    proof_items = models.JSONField(default=list, blank=True)
    proof_submitted = models.BooleanField(default=False)
    proof_verified = models.BooleanField(default=False)
    proof_status = models.CharField(max_length=16, default="pending",
                                    choices=[(c, c) for c in ["pending", "submitted",
                                                              "approved", "rejected"]])
    proof_remarks = models.TextField(blank=True, default="")
    proof_reviewed_by = models.CharField(max_length=255, blank=True, default="")
    proof_reviewed_at = models.DateTimeField(null=True, blank=True, default=None)
    is_locked = models.BooleanField(default=False)
    admin_calculated = models.BooleanField(default=False)
    # No default in legacy: None means "older saved declaration" (L301-302).
    has_investment_declaration = models.BooleanField(null=True, blank=True, default=None)

    TRIM_FIELDS = ("proof_remarks", "proof_reviewed_by")
    JSON_SCHEMAS = {
        "projected_annual_income": PROJECTED_ANNUAL_INCOME,
        "declared_deductions": DECLARED_DEDUCTIONS,
        "investments80_c": Arr(INVESTMENT_LINE),
        "investments80_d": Arr(INVESTMENT_LINE),
        "it_declaration": IT_DECLARATION,
        "hra_exemption": HRA_EXEMPTION,
        "tax_payable": TAX_PAYABLE,
        "income_breakdown": INCOME_BREAKDOWN,
        "tds_period": TDS_PERIOD,
        "full_year_comparison": FULL_YEAR_COMPARISON,
        "monthly_deductions": Arr(MONTHLY_DEDUCTION),
        "proof_items": Arr(PROOF_ITEM),
    }

    DOC_FIELDS = {
        "employeeId": "employee", "financialYear": "financial_year", "taxRegime": "tax_regime",
        "projectedAnnualIncome": "projected_annual_income",
        "declaredDeductions": "declared_deductions", "investments80C": "investments80_c",
        "investments80D": "investments80_d", "itDeclaration": "it_declaration",
        "hraExemption": "hra_exemption", "section10Exemptions": "section10_exemptions",
        "taxableIncome": "taxable_income", "taxPayable": "tax_payable",
        "rebateApplicable": "rebate_applicable", "rebateAmount": "rebate_amount",
        "incomeBreakdown": "income_breakdown", "monthlyTDS": "monthly_tds",
        "tdsPeriod": "tds_period", "fullYearComparison": "full_year_comparison",
        "monthlyDeductions": "monthly_deductions", "totalTDSDeducted": "total_tds_deducted",
        "proofItems": "proof_items", "proofSubmitted": "proof_submitted",
        "proofVerified": "proof_verified", "proofStatus": "proof_status",
        "proofRemarks": "proof_remarks", "proofReviewedBy": "proof_reviewed_by",
        "proofReviewedAt": "proof_reviewed_at", "isLocked": "is_locked",
        "adminCalculated": "admin_calculated",
        "hasInvestmentDeclaration": "has_investment_declaration",
    }

    class Meta:
        db_table = "pe_employee_tds"
        constraints = [models.UniqueConstraint(fields=["employee", "financial_year"],
                                               name="uq_pe_employee_tds_emp_fy")]
        indexes = [models.Index(fields=["org", "financial_year"], name="idx_pe_tds_org_fy")]
