"""Port of ``models/payroll/claimsDeclaration.js`` (schema ``ClaimsDeclaration``).

All four arrays are sub-document arrays with their own ``_id`` (controllers address
reimbursement claims by id, e.g. ``reimbursements.id(claimId)``). Every element carries
``"_id"`` (``new_subdoc_id()``); missing ids and sub-document defaults (``status:
'pending'``, ``attachmentUrls: []``) are filled on ``save()``. Use ``new_reimbursement()``
etc. to build an element up-front. Object-id refs inside elements (``headId``,
``componentId``, ``includedInPayrollId``) are stored as id strings.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, new_subdoc

# claimsDeclaration.js L3-34 (reimbursementClaimSchema, _id: true)
REIMBURSEMENT = Obj(
    headId=NO, headName=NO, headCode=NO, claimNo=NO, claimGroupId=NO, name=NO, type=NO,
    claimDate=NO, billNo=NO, particulars=NO, claimedAmount=NO, approvedAmount=NO,
    proofUrl=NO, description=NO, employeeComments=NO, attachmentUrls=Arr(),
    submittedOn=NO, status="pending", includedInPayrollId=NO,
)
# L49-57
FLEXIBLE_BENEFIT = Obj(componentId=NO, componentName=NO, amount=NO, month=NO, status="pending")
# L64-71
INCOME_TAX_DECLARATION = Obj(section=NO, subSection=NO, amountDeclared=NO, amountApproved=NO)
# L73-80
INVESTMENT_PROOF = Obj(declarationId=NO, fileUrl=NO, verifiedBy=NO, status="pending")


def new_reimbursement(**values):
    return new_subdoc(REIMBURSEMENT, **values)


def new_flexible_benefit(**values):
    return new_subdoc(FLEXIBLE_BENEFIT, **values)


def new_income_tax_declaration(**values):
    return new_subdoc(INCOME_TAX_DECLARATION, **values)


def new_investment_proof(**values):
    return new_subdoc(INVESTMENT_PROOF, **values)


class ClaimsDeclaration(DocModel):
    employee = models.ForeignKey("payroll_engine.PayrollEmployee", on_delete=models.CASCADE,
                                 related_name="+")
    flexible_benefit_plan = models.JSONField(default=list, blank=True)
    reimbursements = models.JSONField(default=list, blank=True)
    income_tax_declarations = models.JSONField(default=list, blank=True)
    investment_proofs = models.JSONField(default=list, blank=True)

    JSON_SCHEMAS = {
        "flexible_benefit_plan": Arr(FLEXIBLE_BENEFIT),
        "reimbursements": Arr(REIMBURSEMENT),
        "income_tax_declarations": Arr(INCOME_TAX_DECLARATION),
        "investment_proofs": Arr(INVESTMENT_PROOF),
    }

    DOC_FIELDS = {
        "employeeId": "employee", "flexibleBenefitPlan": "flexible_benefit_plan",
        "reimbursements": "reimbursements", "incomeTaxDeclarations": "income_tax_declarations",
        "investmentProofs": "investment_proofs",
    }

    class Meta:
        db_table = "pe_claims_declaration"
        indexes = [models.Index(fields=["org", "employee"], name="idx_pe_claims_org_emp")]
