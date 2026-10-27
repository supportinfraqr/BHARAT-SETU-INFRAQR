"""Port of ``models/payroll/statutoryCompliance.js`` (schema ``StatutoryCompliance``).

Each section is a JSON column with the Mongoose-materialised defaults. State rows
(``professionalTax.states``, ``labourWelfareFund.states``, ``statutoryBonus.states``) and
their nested arrays (``ptSlabs``, ``wageCategories``) carry ``"_id"``
(``new_subdoc_id()``); element defaults are applied on ``save()``. ``maxAmount`` is Mixed
(Number or ""). No hooks/methods.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, materialise, new_subdoc

# statutoryCompliance.js L13-30
EPF = Obj(
    isEnabled=False, epfNumber=NO, deductionCycle="monthly", employeeContributionRate=12,
    employerContributionRate=12, restrictedPfWage=15000,
    contributionPreferences=Obj(employerPfContribution=True, edliContribution=False,
                                adminCharges=False),
    allowEmployeeLevelOverride=False, eligibleForAbryScheme=False,
    proRateRestrictedPfWage=True, considerSalaryBasedOnLOP=True,
    considerAllPfComponentsAfterLopBelowCeiling=True,
)
# L33-41
ESI = Obj(isEnabled=False, esiNumber=NO, deductionCycle="monthly",
          employeeContributionRate=0.75, employerContributionRate=3.25, wageLimit=21000,
          includeEmployerInSalaryStructure=True)
# L44-65
PT_STATE = Obj(stateName=NO, ptNumber=NO, isApplicable=True,
               ptSlabs=Arr(Obj(salaryRangeFrom=NO, salaryRangeTo=NO, taxAmount=NO)))
PROFESSIONAL_TAX = Obj(isEnabled=False, deductionCycle="monthly", states=Arr(PT_STATE))
# L68-105
LWF_STATE = Obj(stateName=NO, deductionCycle="half-yearly", periodFrom="Jun", periodTo="Dec",
                minAmount=NO, maxAmount=NO, calculationType="fixed", employeeShare=NO,
                employerShare=NO, months=Arr(), isApplicable=True, status="active")
LABOUR_WELFARE_FUND = Obj(isEnabled=False, deductionCycle="half-yearly", months=Arr(),
                          states=Arr(LWF_STATE))
# L108-140
BONUS_STATE = Obj(stateName=NO, minWage=NO, formulaBase="minimumWage",
                  wageCategories=Arr(Obj(employmentCategory=NO, minWage=NO,
                                         effectiveFrom="")))
STATUTORY_BONUS = Obj(isEnabled=False, paymentCycle="yearly", paymentMonth="October",
                      percentage=8.33, minimumBonusWage=7000, eligibilityCeiling=21000,
                      states=Arr(BONUS_STATE))


def default_epf():
    return materialise(EPF)


def default_esi():
    return materialise(ESI)


def default_professional_tax():
    return materialise(PROFESSIONAL_TAX)


def default_labour_welfare_fund():
    return materialise(LABOUR_WELFARE_FUND)


def default_statutory_bonus():
    return materialise(STATUTORY_BONUS)


def new_pt_state(**values):
    return new_subdoc(PT_STATE, **values)


def new_lwf_state(**values):
    return new_subdoc(LWF_STATE, **values)


def new_bonus_state(**values):
    return new_subdoc(BONUS_STATE, **values)


class StatutoryCompliance(DocModel):
    epf = models.JSONField(default=default_epf, blank=True)
    esi = models.JSONField(default=default_esi, blank=True)
    professional_tax = models.JSONField(default=default_professional_tax, blank=True)
    labour_welfare_fund = models.JSONField(default=default_labour_welfare_fund, blank=True)
    statutory_bonus = models.JSONField(default=default_statutory_bonus, blank=True)

    JSON_SCHEMAS = {"epf": EPF, "esi": ESI, "professional_tax": PROFESSIONAL_TAX,
                    "labour_welfare_fund": LABOUR_WELFARE_FUND,
                    "statutory_bonus": STATUTORY_BONUS}

    DOC_FIELDS = {
        "epf": "epf", "esi": "esi", "professionalTax": "professional_tax",
        "labourWelfareFund": "labour_welfare_fund", "statutoryBonus": "statutory_bonus",
    }

    class Meta:
        db_table = "pe_statutory_compliance"
