"""Port of ``models/payroll/tdsConfig.js`` (schema ``TDSConfig``). No hooks/methods.

Slab arrays are sub-document arrays (``"_id"`` via ``new_subdoc_id()`` on ``save()``).
``exemptionLimits`` defaults include explicit ``None`` ("no cap") exactly like legacy.
"""

from django.db import models

from .base import NO, Arr, DocModel, Obj, materialise, new_subdoc

# tdsConfig.js L22-50 (incomeFrom/incomeTo/taxRate required, no default)
TAX_SLAB = Obj(incomeFrom=NO, incomeTo=NO, taxRate=NO)
# L67-80
SURCHARGE_SLAB = Obj(incomeFrom=NO, incomeTo=NO, surchargeRate=NO)
# L103-143
EXEMPTION_LIMITS = Obj(
    section80D=100000, section80DSelf=25000, section80DSenior=50000, section80DPreventive=5000,
    section80E=None, section80G=None, section80CCD1Percent=10, section80CCD1B=50000,
    section80CCD2Percent=14, section80CCD2PercentOld=10, section80DD=75000,
    section80DDSevere=125000, section80DDB=40000, section80DDBSenior=100000,
    section80EE=50000, section80EEA=150000, section80GGMonthly=5000, section80GGA=None,
    section80GGC=None, section80TTA=10000, section80TTB=50000, section80U=75000,
    section80USevere=125000, section24=200000, otherDeductions=None,
    childrenEducationPerMonth=100, childrenEducationMaxChildren=2,
    childrenEducationAnnualCap=2400, hostelPerMonth=300, hostelMaxChildren=2,
    hostelAnnualCap=7200, lta=None, disabledTransportPerMonth=3200, gratuity=2000000,
    leaveEncashment=2500000, retrenchment=500000, vrs=500000, officialDuty=None,
    lifeInsurance=None,
)


def default_exemption_limits():
    return materialise(EXEMPTION_LIMITS)


def new_tax_slab(**values):
    return new_subdoc(TAX_SLAB, **values)


def new_surcharge_slab(**values):
    return new_subdoc(SURCHARGE_SLAB, **values)


class TDSConfig(DocModel):
    financial_year = models.CharField(max_length=16, blank=True, default="")   # required
    tax_regime = models.CharField(max_length=8, default="new",
                                  choices=[("old", "old"), ("new", "new")])
    new_regime_slabs = models.JSONField(default=list, blank=True)
    old_regime_slabs = models.JSONField(default=list, blank=True)
    old_regime_slabs_senior = models.JSONField(default=list, blank=True)
    old_regime_slabs_super_senior = models.JSONField(default=list, blank=True)
    standard_deduction = models.FloatField(default=75000)
    standard_deduction_old = models.FloatField(default=50000)
    section80_c_limit = models.FloatField(default=150000)
    surcharge_slabs = models.JSONField(default=list, blank=True)
    surcharge_slabs_old = models.JSONField(default=list, blank=True)
    health_education_cess = models.FloatField(default=4)
    rebate_limit = models.FloatField(default=1200000)
    rebate_amount = models.FloatField(default=60000)
    rebate_limit_old = models.FloatField(default=500000)
    rebate_amount_old = models.FloatField(default=12500)
    exemption_limits = models.JSONField(default=default_exemption_limits, blank=True)

    JSON_SCHEMAS = {
        "new_regime_slabs": Arr(TAX_SLAB), "old_regime_slabs": Arr(TAX_SLAB),
        "old_regime_slabs_senior": Arr(TAX_SLAB),
        "old_regime_slabs_super_senior": Arr(TAX_SLAB),
        "surcharge_slabs": Arr(SURCHARGE_SLAB), "surcharge_slabs_old": Arr(SURCHARGE_SLAB),
        "exemption_limits": EXEMPTION_LIMITS,
    }

    DOC_FIELDS = {
        "financialYear": "financial_year", "taxRegime": "tax_regime",
        "newRegimeSlabs": "new_regime_slabs", "oldRegimeSlabs": "old_regime_slabs",
        "oldRegimeSlabsSenior": "old_regime_slabs_senior",
        "oldRegimeSlabsSuperSenior": "old_regime_slabs_super_senior",
        "standardDeduction": "standard_deduction",
        "standardDeductionOld": "standard_deduction_old",
        "section80CLimit": "section80_c_limit", "surchargeSlabs": "surcharge_slabs",
        "surchargeSlabsOld": "surcharge_slabs_old",
        "healthEducationCess": "health_education_cess", "rebateLimit": "rebate_limit",
        "rebateAmount": "rebate_amount", "rebateLimitOld": "rebate_limit_old",
        "rebateAmountOld": "rebate_amount_old", "exemptionLimits": "exemption_limits",
    }

    class Meta:
        db_table = "pe_tds_config"
        indexes = [models.Index(fields=["org", "financial_year"], name="idx_pe_tdscfg_org_fy")]
