"""Differential tests: legacy TDS JS (tdsManagement.js internals, tdsDeclarationHelper.js)
vs the Python ports (views/tds_management.py, services/tds_declaration_helper.py).

Hundreds of seeded random + boundary cases for both regimes and several financial years:
slab tax, 87A rebate, surcharge, cess, standard deduction, HRA exemption, Chapter VI-A caps
(80C/80CCD/80D/80DD/80DDB/80E/80G/80GG/80TTA/80TTB/24), section 10 exemptions, rent
pro-rating, monthly TDS spreading and the full employee projection (incl. loan perquisite).
Outputs must be identical JSON (numbers within 1e-6). Skipped when Node is unavailable.
"""

import json
import math
import random
import unittest

from django.test import SimpleTestCase

from payroll_engine.services import tds_declaration_helper as H
from payroll_engine.services.financial_year import resolve_financial_year_input
from payroll_engine.services.jsmath import UNDEFINED
from payroll_engine.views import tds_management as T

from .legacy_js import SKIP_REASON, node_available
from .tds_js import run_tds_js_batch

TDS_JS = "internal:controller/payroll/tdsManagement.js"
HELPER_JS = "utils/payroll/tdsDeclarationHelper"
U = {"$undefined": True}


def dec(v):
    """JSON test input -> Python JS-value model."""
    if isinstance(v, dict):
        if v == U:
            return UNDEFINED
        if set(v) == {"$findOneLean"}:
            return dec(v["$findOneLean"])
        if set(v) == {"$findPopulateLean"}:
            return dec(v["$findPopulateLean"])
        return {k: dec(x) for k, x in v.items() if x != U}
    if isinstance(v, list):
        return [dec(x) for x in v]
    return v


def norm(v):
    if v is UNDEFINED:
        return U
    return json.loads(json.dumps(T._jsonify(v)))


def same(a, b, path="$"):
    if isinstance(a, bool) or isinstance(b, bool):
        return None if a is b else f"{path}: {a!r} != {b!r}"
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6):
            return None
        return f"{path}: {a!r} != {b!r}"
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a) != set(b):
            return f"{path}: keys {sorted(set(a) ^ set(b))} differ"
        for k in a:
            r = same(a[k], b[k], f"{path}.{k}")
            if r:
                return r
        return None
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return f"{path}: len {len(a)} != {len(b)}"
        for i, (x, y) in enumerate(zip(a, b)):
            r = same(x, y, f"{path}[{i}]")
            if r:
                return r
        return None
    return None if a == b else f"{path}: {a!r} != {b!r}"


class Cases:
    def __init__(self):
        self.items = []

    def add(self, label, js_module, js_fn, js_args, py_call):
        self.items.append((label, {"module": js_module, "fn": js_fn, "args": js_args}, py_call))


FYS = ["2024-25", "2025-26", "2026-27", "2023-24"]


def fy_obj(key):
    return resolve_financial_year_input(key)


def default_config(**over):
    cfg = {
        "financialYear": "2025-2026", "taxRegime": "new",
        "newRegimeSlabs": T.get_default_new_regime_slabs(),
        "oldRegimeSlabs": T.get_default_old_regime_slabs(),
        "oldRegimeSlabsSenior": T.get_default_old_regime_slabs_senior(),
        "oldRegimeSlabsSuperSenior": T.get_default_old_regime_slabs_super_senior(),
        "standardDeduction": 75000, "standardDeductionOld": 50000, "section80CLimit": 150000,
        "surchargeSlabs": T.get_default_surcharge_slabs(),
        "surchargeSlabsOld": T.get_default_surcharge_slabs_old(),
        "healthEducationCess": 4, "rebateLimit": 1200000, "rebateAmount": 60000,
        "rebateLimitOld": 500000, "rebateAmountOld": 12500,
        "exemptionLimits": H.get_default_exemption_limits(),
    }
    cfg.update(over)
    return cfg


CONFIGS = [
    default_config(),
    default_config(newRegimeSlabs=T.get_default_new_regime_slabs()[:4]),     # legacy 4-slab prefix
    default_config(surchargeSlabs=T.LEGACY_NEW_SURCHARGE, surchargeSlabsOld=[]),
    default_config(healthEducationCess=0, rebateLimit=700000, rebateAmount=25000,
                   standardDeduction=50000, oldRegimeSlabsSenior=[], oldRegimeSlabsSuperSenior=[]),
    default_config(newRegimeSlabs=[{"incomeFrom": 0, "incomeTo": 300000, "taxRate": 0},
                                   {"incomeFrom": 300001, "incomeTo": 700000, "taxRate": 5},
                                   {"incomeFrom": 700001, "incomeTo": 1000000, "taxRate": 10},
                                   {"incomeFrom": 1000001, "incomeTo": 1200000, "taxRate": 15},
                                   {"incomeFrom": 1200001, "incomeTo": 1500000, "taxRate": 20},
                                   {"incomeFrom": 1500001, "incomeTo": 9999999999, "taxRate": 30}],
                   exemptionLimits={"section80D": 75000, "section80TTA": 5000, "section80E": 40000,
                                    "section24": 150000, "section80CCD2Percent": 10, "lta": 30000,
                                    "otherDeductions": 20000, "section80G": 10000}),
    {"newRegimeSlabs": [], "taxRegime": "old"},                                 # sparse config
]

INCOMES = [0, 1, 250000, 250001, 300000, 400000, 400001, 500000, 500001, 700000, 750000, 800000,
           1000000, 1200000, 1200001, 1250000, 1275000, 1300000, 1600000, 2000000, 2400000,
           2400001, 3500000, 5000000, 5000001, 5100000, 10000000, 10000001, 20000000, 20000001,
           50000000, 50000001, 60000000]


def rand_deductions(rng):
    keys = ["section80C", "section80CCC", "section80CCD1", "section80CCD1B", "section80CCD2",
            "section80D", "section80DSelf", "section80DParents", "section80DPreventive",
            "section80DPreventiveSelf", "section80DPreventiveParents", "section80DMedicalSelf",
            "section80DMedicalParents", "section80DD", "section80DDB", "section80DDBReimbursed",
            "section80E", "section80EE", "section80EEA", "section80G", "section80G50",
            "section80G100Limited", "section80G50Limited", "section80GG", "section80GGA",
            "section80GGC", "section80TTA", "section24", "professionalTax", "otherDeductions"]
    d = {}
    for k in rng.sample(keys, rng.randint(0, len(keys))):
        d[k] = rng.choice([0, 1500, 5000, 12000, 25000, 30000, 50000, 75000, 100000, 160000,
                           250000, rng.randint(0, 300000), rng.randint(0, 300000) + 0.5,
                           str(rng.randint(0, 90000)), "abc", None, -5000])
    if rng.random() < 0.3:
        d["section80DDSevere"] = rng.choice([True, False, "true", 1, 0])
    if rng.random() < 0.3:
        d["section80DSelfSenior"] = rng.choice([True, "true", False])
    if rng.random() < 0.3:
        d["section80DParentsSenior"] = rng.choice([True, "true", False])
    if rng.random() < 0.3:
        d["section80EStartYear"] = rng.choice([2015, 2018, 2020, 2024, 0, "2019"])
    return d


def rand_cap_options(rng):
    o = {}
    for k, choices in [
        ("annualBasic", [0, 240000, 600000, 1200000, rng.randint(0, 3000000)]),
        ("annualDa", [0, 50000, U]),
        ("annualHra", [0, 120000, 300000, U]),
        ("annualRent", [0, 96000, 240000, 600000, U]),
        ("age", [None, 25, 45, 59, 60, 61, 75, 80, 90, U]),
        ("payrollMonths", [12, 6.5, 3, 0, U]),
        ("taxRegime", ["old", "new", "NEW", U]),
        ("fyStartYear", [2025, 2026, 2019, U]),
        ("interestSavings", [0, 8000, 20000, U]),
        ("interestFD", [0, 30000, U]),
        ("assesseeDisabled", [True, False, "yes", U]),
        ("assesseeSevere", [True, False, U]),
        ("incomeBeforeSection24", [U, 0, 500000, 1500000, rng.randint(0, 5000000), float("nan")]),
    ]:
        v = rng.choice(choices)
        if isinstance(v, float) and math.isnan(v):
            continue
        if v != U:
            o[k] = v
    return o


def build_cases():
    rng = random.Random(20261028)
    c = Cases()

    # ---- calculateTax: every income boundary x regime x config x age
    for cfg_i, cfg in enumerate(CONFIGS):
        for income in INCOMES:
            for regime in ("new", "old"):
                age = rng.choice([None, 35, 60, 79, 80, 92, U])
                opts = {} if age == U else {"age": age}
                c.add(f"calculateTax cfg{cfg_i} {income} {regime} {age}", TDS_JS, "calculateTax",
                      [income, regime, cfg, opts],
                      lambda a: T.calculate_tax(*[dec(x) for x in a]))
    for _ in range(60):
        cfg = rng.choice(CONFIGS)
        income = rng.choice([rng.randint(0, 3000000), rng.randint(0, 80000000), rng.random() * 2e6])
        regime = rng.choice(["new", "old", "Old Regime", "", None, "bogus"])
        c.add(f"calculateTax rnd {income} {regime}", TDS_JS, "calculateTax",
              [income, regime, cfg, {"age": rng.choice([None, 30, 65, 85])}],
              lambda a: T.calculate_tax(*[dec(x) for x in a]))

    # ---- regime parsing / standard deduction / rebate
    for v in ["old", "new", "OLD", " new ", "old regime", "New_Regime", "oldregime", "x", "", None, 5, U]:
        c.add(f"parseTaxRegimeInput {v}", TDS_JS, "parseTaxRegimeInput", [v],
              lambda a: T.parse_tax_regime_input(dec(a[0])))
        for cfg in CONFIGS[:4] + [{}]:
            c.add(f"getStandardDeductionForRegime {v}", TDS_JS, "getStandardDeductionForRegime", [cfg, v],
                  lambda a: T.get_standard_deduction_for_regime(dec(a[0]), dec(a[1])))
            c.add(f"getRebateForRegime {v}", TDS_JS, "getRebateForRegime", [cfg, v],
                  lambda a: T.get_rebate_for_regime(dec(a[0]), dec(a[1])))

    # ---- monthly TDS spreading
    for tax in [0, 1, 55000, 109200, 1234567, "5000", None]:
        for ded in [0, 20000, 2000000, None, U]:
            for months in [12, 11.5, 7, 1, 0, -1, "6", None, U]:
                args = [tax, ded, months]
                while args and args[-1] == U:
                    args.pop()
                c.add(f"calculateMonthlyTdsAmount {args}", TDS_JS, "calculateMonthlyTdsAmount", args,
                      lambda a: T.calculate_monthly_tds_amount(*[dec(x) for x in a]))

    # ---- applyCappedDeductionsForTax (exported helper)
    for i in range(140):
        dd = rand_deductions(rng)
        cfg = rng.choice(CONFIGS[:5] + [{}])
        opts = rand_cap_options(rng)
        c.add(f"applyCappedDeductionsForTax #{i}", HELPER_JS, "applyCappedDeductionsForTax", [dd, cfg, opts],
              lambda a: H.apply_capped_deductions_for_tax(*[dec(x) for x in a]))

    # ---- computeEffectiveDeductionsTotal / calculateTaxableIncome
    for i in range(120):
        dd = T.normalize_deductions(dec(rand_deductions(rng)))
        cfg = rng.choice(CONFIGS[:5])
        regime = rng.choice(["old", "new"])
        hra = rng.choice([{"exemptAmount": 0}, {"exemptAmount": 84000, "rentPaid": 240000},
                          {"exemptAmount": 150000.5, "rentPaid": 360000}, {}])
        sec10 = rng.choice([0, 2400, 50000, -100, "300"])
        opts = rand_cap_options(rng)
        c.add(f"computeEffectiveDeductionsTotal #{i}", TDS_JS, "computeEffectiveDeductionsTotal",
              [dd, hra, cfg, regime, sec10, opts],
              lambda a: T.compute_effective_deductions_total(*[dec(x) for x in a]))
        income = {"basic": rng.randint(0, 2000000), "hra": rng.randint(0, 600000),
                  "total": rng.randint(0, 6000000)}
        c.add(f"calculateTaxableIncome #{i}", TDS_JS, "calculateTaxableIncome",
              [income, dd, hra, cfg, regime, sec10, opts],
              lambda a: T.calculate_taxable_income(*[dec(x) for x in a]))

    # ---- HRA exemption
    for i in range(50):
        basic = rng.choice([0, 300000, 480000, 960000, rng.randint(0, 2400000)])
        hra = rng.choice([0, 120000, 192000, 384000, rng.randint(0, 900000)])
        details = rng.choice([
            {}, {"rentPaid": 15000}, {"rentPaid": "20000", "isMetroCity": True},
            {"rentPaid": 25000, "cityType": "Metro"}, {"rentPaid": 9000, "cityType": " metropolitan "},
            {"annualRent": 240000, "isMetroCity": False}, {"annualRent": "0", "rentPaid": 0},
            {"rentPaid": 12000, "isMetroCity": "true"}, {"annualRent": 180000.75, "rentPaid": 5000},
        ])
        factor = rng.choice([12, 7.5, 0, 15, "6", U])
        args = [basic, hra, details] + ([] if factor == U else [factor])
        c.add(f"calculateHRAExemption #{i}", TDS_JS, "calculateHRAExemption", args,
              lambda a: T.calculate_hra_exemption(*[dec(x) for x in a]))

    # ---- rent from entries (helper export) and rent details
    rent_dates = ["2025-04-01", "01-04-2025", "1/6/2025", "2025-09-30", "31-03-2026", "2026-03-31",
                  "2024-10-01", "15-08-2025", "2026-06-30", "", "bad-date", "2025-12-31T18:30:00.000Z"]
    for i in range(70):
        entries = []
        for _ in range(rng.randint(0, 3)):
            entries.append({
                "fromDate": rng.choice(rent_dates), "toDate": rng.choice(rent_dates),
                "rentMonthly": rng.choice([0, 8000, 15000, 22500, "12000", None]),
                "rentAnnual": rng.choice([0, 0, 120000, 300000, None]),
                "isMetroCity": rng.choice([True, False, None, U]),
            })
        entries = dec(entries) if rng.random() < 0.5 else entries
        fy_start = rng.choice([2025, 2024, 2026, None])
        period = rng.choice([None, "2025-04-01", "2025-07-15", "2025-11-01", "2026-05-01",
                             "2024-12-10", "2025-10-01T00:00:00.000Z"])
        c.add(f"computeAnnualRentFromEntries #{i}", HELPER_JS, "computeAnnualRentFromEntries",
              [entries, fy_start, period],
              lambda a: H.compute_annual_rent_from_entries(*[dec(x) for x in a]))
        decl = {"stayingInRentedHouse": rng.choice([True, False, "yes"]), "rentEntries": entries}
        c.add(f"buildHraDetailsFromDeclaration #{i}", TDS_JS, "buildHraDetailsFromDeclaration",
              [rng.choice([None, {}, {"rentPaid": 9000}]), decl, fy_start, period],
              lambda a: T.build_hra_details_from_declaration(*[dec(x) for x in a]))

    # ---- deduction normalisation / chapter VI-A merge / declared-deduction builder
    for i in range(50):
        dd = rand_deductions(rng)
        chapter = {k: rng.choice([0, 5000, 60000, None, "7000"]) for k in rng.sample(
            T._CHAPTER_MERGE_KEYS + ["section80DDSevere", "section80DSelfSenior", "section80EStartYear"],
            rng.randint(0, 10))}
        decl = rng.choice([{"chapterVIA": chapter}, {}, None])
        c.add(f"mergeChapterViaIntoDeductions #{i}", TDS_JS, "mergeChapterViaIntoDeductions", [dd, decl],
              lambda a: T.merge_chapter_via_into_deductions(*[dec(x) for x in a]))
        c.add(f"normalizeDeductions #{i}", TDS_JS, "normalizeDeductions", [dd],
              lambda a: T.normalize_deductions(dec(a[0])))
        lines80c = [{"investmentType": rng.choice(["PPF", "ELSS", "LIC"]), "amount": rng.choice([0, 50000, 120000, "9000"])}
                    for _ in range(rng.randint(0, 3))]
        lines80d = [{"investmentType": rng.choice(["Self Premium", "Parents (Senior) Premium",
                                                   "Preventive check-up", "Parents medical bill",
                                                   "Medical expenditure senior", "Parent checkup"]),
                     "amount": rng.choice([0, 3000, 25000, 60000])} for _ in range(rng.randint(0, 4))]
        it = {
            "toggles": rng.choice([{}, {"section80C": False}, {"section80D": "false"},
                                   {"otherInvestments": 0}, None]),
            "homeLoanSelfOccupied": rng.choice([{}, {"enabled": True, "principalPaid": 90000, "interestPaid": 250000},
                                                {"enabled": False, "interestPaid": 50000}]),
            "investmentsOther": rng.choice([[], [{"amount": 10000}, {"amount": "2500"}], None]),
            "chapterVIA": chapter,
        }
        opts = {
            "lines80C": lines80c, "lines80D": lines80d, "itDeclaration": it,
            "prevDeductions": rng.choice([{}, {"standardDeduction": 50000, "section24": 30000,
                                               "otherDeductions": 4000, "section80E": 20000}]),
            "tdsConfig": rng.choice([{}, CONFIGS[0], CONFIGS[4]]),
            "touchedHomeLoan": rng.choice([True, False]),
            "touchedOtherInv": rng.choice([True, False]),
            "declaredDeductionsOverride": rng.choice([None, {}, {"section80E": 15000, "section24": 100000,
                                                                 "otherDeductions": 900, "professionalTax": 2400}]),
        }
        c.add(f"buildDeclaredDeductionsFromDeclaration #{i}", HELPER_JS,
              "buildDeclaredDeductionsFromDeclaration", [opts],
              lambda a: H.build_declared_deductions_from_declaration(dec(a[0])))
        c.add(f"aggregate80DFromLines #{i}", HELPER_JS, "aggregate80DFromLines", [lines80d],
              lambda a: H.aggregate80_d_from_lines(dec(a[0])))

    # ---- service-based exemptions (helper exports)
    for i in range(40):
        doj = rng.choice(["2010-06-15", "2019-10-01", "2025-09-30", "2026-04-01", None, U, "garbage"])
        as_of = rng.choice(["2026-03-31", "2027-03-31", "2025-03-31T00:00:00+05:30"])
        for six in (True, False):
            args = [doj, as_of, six]
            c.add(f"completedServiceYears {args}", HELPER_JS, "completedServiceYears", args,
                  lambda a: H.completed_service_years(*[dec(x) for x in a]))
        received = rng.choice([0, 100000, 2500000, "300000"])
        cap = rng.choice([None, 2000000, 0, 500000])
        sal = rng.choice([0, 30000, 75000.5])
        years = rng.choice([None, 0, 5, 12])
        c.add(f"gratuityExempt #{i}", HELPER_JS, "gratuityExempt", [received, cap, sal, years, rng.choice([True, False])],
              lambda a: H.gratuity_exempt(*[dec(x) for x in a]))
        c.add(f"leaveEncashmentExempt #{i}", HELPER_JS, "leaveEncashmentExempt", [received, cap, sal],
              lambda a: H.leave_encashment_exempt(*[dec(x) for x in a]))
        c.add(f"retrenchmentExempt #{i}", HELPER_JS, "retrenchmentExempt", [received, cap, sal, years],
              lambda a: H.retrenchment_exempt(*[dec(x) for x in a]))
        c.add(f"vrsExempt #{i}", HELPER_JS, "vrsExempt", [received, cap, sal, years],
              lambda a: H.vrs_exempt(*[dec(x) for x in a]))
        c.add(f"capToLimit #{i}", HELPER_JS, "capToLimit", [received, rng.choice([None, "", 5000, "abc", -1])],
              lambda a: H.cap_to_limit(*[dec(x) for x in a]))

    # ---- section 10 exemptions
    for i in range(50):
        emp = {"handicappedInfo": rng.choice([{}, {"handicapped": "Yes", "disabilityType": "Severe"},
                                              {"handicapped": "no"}]),
               "maritalInfo": rng.choice([{}, {"numberOfChildren": 3}, {"numberOfChildren": "1"}])}
        se = {k: rng.choice([0, 1200, 5000, 30000, 300000, 3000000, "4000"]) for k in rng.sample(
            list(T.default_it_declaration()["salaryExemptions"]), rng.randint(0, 11))}
        decl = {"salaryExemptions": se}
        service = rng.choice([{}, {"monthlySalary": 40000, "yearsAct": 6, "yearsPlain": 5},
                              {"monthlySalary": 0, "yearsAct": None}, {"monthlySalary": 90000, "yearsAct": 0,
                                                                        "yearsPlain": 0, "gratuityActCovered": False}])
        c.add(f"calculateSection10Exemptions #{i}", TDS_JS, "calculateSection10Exemptions",
              [emp, decl, rng.choice(["old", "new"]), rng.choice([12, 6.3, 0]), rng.choice(CONFIGS[:5]), service],
              lambda a: T.calculate_section10_exemptions(*[dec(x) for x in a]))

    # ---- declaration merge / sanitise
    for i in range(40):
        prev = rng.choice([None, {}, T.default_it_declaration(),
                           {"stayingInRentedHouse": True, "rentEntries": [{"rentMonthly": 9000, "attachment": "a.pdf"}],
                            "homeLoanSelfOccupied": None, "toggles": {"section80C": False},
                            "investmentsOther": [{"type": "NPS", "amount": "100"}]}])
        incoming = rng.choice([None, "x", {}, {
            "stayingInRentedHouse": rng.choice(["yes", "off", 1, True]),
            "rentEntries": [{"fromDate": " 2025-04-01 ", "toDate": "31-03-2026", "rentMonthly": "15000",
                             "address": " Flat 1 ", "isMetroCity": "true", "proofUrl": "p.pdf"}],
            "homeLoanSelfOccupied": {"enabled": "1", "principalPaid": "-5", "interestPaid": 99000,
                                     "lenderName": "  HDFC  ", "lenderPAN": "abcde1234f", "attachmentUrl": "h.pdf"},
            "otherIncomeBreakdown": {"interestSavings": 12000, "interestFD": "3000"},
            "toggles": {"otherInvestments": "on"},
            "salaryExemptions": {"childrenCount": 2, "ltaEligibleTravel": "25000", "bogus": 5},
            "chapterVIA": {"section80DDSevere": "yes", "section80CCD1B": 50000},
            "letOutPropertyEnabled": "n",
        }])
        uploads = rng.choice([{}, {"rentAttachments": ["r1.pdf"], "homeLoanAttachment": "hl.pdf",
                                   "otherIncomeAttachment": "oi.pdf", "otherInvestmentAttachments": ["o1"]}])
        c.add(f"mergeItDeclaration #{i}", TDS_JS, "mergeItDeclaration", [prev, incoming, uploads],
              lambda a: T.merge_it_declaration(*[dec(x) for x in a]))
        lines = [{"investmentType": " PPF ", "amount": "1e13"}, {"type": "ELSS", "amount": -4, "proofUrl": "x"},
                 None, {"amount": 50000.5}]
        c.add(f"sanitizeInvestmentLines #{i}", TDS_JS, "sanitizeInvestmentLines",
              [rng.choice([lines, None, "x"]), ["u1"], [{"attachment": "old"}]],
              lambda a: T.sanitize_investment_lines(*[dec(x) for x in a]))
    c.add("sanitizeProofItems", TDS_JS, "sanitizeProofItems",
          [[{"lineKey": " 80C-1 ", "status": "approved", "requestedAmount": "9000", "acceptedAmount": 5000},
            {"lineKey": "", "status": "approved"}, {"lineKey": "x", "status": "weird", "remark": " ok "}]],
          lambda a: T.sanitize_proof_items(dec(a[0])))

    # ---- HRA from salary components (mocked SalaryCompensationModel)
    comp_sets = [None, {"components": []},
                 {"components": [{"name": "Basic", "code": "BASIC", "calculationType": "fixed", "value": 20000},
                                 {"name": "House Rent Allowance", "code": "HRA", "calculationType": "percentage",
                                  "value": 40, "basedOn": "basic"}]},
                 {"components": [{"name": "HRA", "calculationType": "percentage", "value": 30, "basedOn": "Gross"}]},
                 {"components": [{"name": "hra old", "status": "inactive", "calculationType": "fixed", "value": 9},
                                 {"name": "Special", "code": "hra", "calculationType": "fixed", "value": "8500"}]},
                 {"components": [{"name": "HRA", "calculationType": "percentage", "value": 10, "basedOn": "ctc"}]},
                 {"components": [{"name": "HRA", "calculationType": "slab", "value": 10}]}]
    emps = [{"payrollInfo": {"baseSalary": 30000, "grossSalary": 52000, "ctc": 60000}},
            {"payrollInfo": {"baseSalary": 0}}, {"payrollInfo": {"baseSalary": "25000"}},
            {"baseSalary": 18000, "grossSalary": 0}]
    for comps in comp_sets:
        for emp in emps:
            months = rng.choice([12, 7.3, 0, 15])
            c.add(f"calculateHRAReceivedFromSalaryComponents", TDS_JS, "calculateHRAReceivedFromSalaryComponents",
                  [emp, {"$findOneLean": comps}, "org", months],
                  lambda a: T.calculate_hra_received_from_salary_components(
                      dec(a[0]), None, dec(a[3]), dec(a[1])))

    # ---- full employee projection (both regimes, several FYs, implementation dates, loans)
    for i in range(110):
        fy_key = rng.choice(FYS)
        fy = fy_obj(fy_key)
        base = rng.choice([0, 12000, 25000, 40000, 65000, 120000, 250000, 900000])
        emp = {
            "_id": f"emp{i}",
            "payrollInfo": {"baseSalary": base,
                            "grossSalary": rng.choice([0, round(base * 1.6), base * 2 + 0.5]),
                            "ctc": rng.choice([0, base * 3])},
            "demographics": {"dob": rng.choice(["1990-01-01T00:00:00Z", "1962-03-31T00:00:00Z",
                                                 "1940-05-05T00:00:00Z", None])},
            "dateOfJoining": rng.choice(["2015-07-01T00:00:00Z", "2025-08-20T00:00:00Z", None, U]),
            "handicappedInfo": rng.choice([{}, {"handicapped": "yes", "disabilityType": "severe"}]),
        }
        cfg = rng.choice(CONFIGS[:5])
        existing = rng.choice([None, {
            "taxRegime": rng.choice(["old", "new"]),
            "declaredDeductions": rand_deductions(rng),
            "itDeclaration": {
                "stayingInRentedHouse": True,
                "rentEntries": [{"fromDate": "2025-04-01", "toDate": "2026-03-31",
                                 "rentMonthly": rng.choice([8000, 20000, 45000]), "isMetroCity": rng.choice([True, False])}],
                "otherIncomeBreakdown": {"interestSavings": rng.choice([0, 9000, 15000]), "interestFD": 20000},
                "salaryExemptions": {"ltaEligibleTravel": 30000, "childrenCount": 1,
                                     "childrenEducationReceived": 3000, "gratuityReceived": 400000},
                "chapterVIA": {"section80CCD1B": 50000, "section80TTA": 10000},
            },
            "monthlyDeductions": [{"month": "Apr", "year": fy["startYear"], "tdsDeducted": 5000},
                                  {"month": "May", "year": fy["startYear"], "tdsDeducted": "4500"},
                                  {"month": "Jan", "year": fy["endYear"], "tdsDeducted": 0}],
            "totalTDSDeducted": 9500,
        }])
        impl = rng.choice([None, f"{fy['startYear']}-04-01", f"{fy['startYear']}-09-16",
                           f"{fy['endYear']}-02-10", f"{fy['endYear']}-05-01", f"{fy['startYear'] - 1}-11-01"])
        earnings = rng.choice(comp_sets[:5])
        loans = rng.choice([[], [{"_id": "l1", "loanNumber": "LN1", "loanAmount": 500000, "outstandingBalance": 350000,
                                  "loanTypeId": {"loanName": "Home", "perquisiteRate": 9}},
                                 {"_id": "l2", "loanAmount": 15000, "outstandingBalance": 10000,
                                  "loanTypeId": {"loanName": "Small", "perquisiteRate": 9}},
                                 {"_id": "l3", "loanAmount": 90000, "outstandingBalance": 60000,
                                  "loanTypeId": {"loanName": "Medical", "perquisiteRate": 9}}]])
        js_input = {
            "org_uuid": "org", "employee": emp, "fy": fy, "tdsConfig": cfg, "existingTDS": existing,
            "taxRegime": rng.choice([U, None, "old", "new", "", "Old_Regime"]),
            "declaredDeductions": rng.choice([U, None, rand_deductions(rng)]),
            "hraDetails": rng.choice([None, U, {}, {"hraReceived": 15000, "rentPaid": 18000, "isMetroCity": True}]),
            "otherIncome": rng.choice([U, None, 0, 45000, "1200"]),
            "SalaryCompensationModel": {"$findOneLean": earnings},
            "EmployeeLoanModel": {"$findPopulateLean": loans},
            "itDeclarationOverride": rng.choice([U, None, {"stayingInRentedHouse": True, "rentEntries": [
                {"rentMonthly": 25000, "fromDate": "01-07-2025", "toDate": "31-03-2026", "isMetroCity": False}],
                "otherIncomeBreakdown": {"interestSavings": 30000}}]),
            "payrollImplementationDate": impl,
        }

        def py_proj(a):
            o = dec(a[0])
            return T.compute_employee_tds_projection(
                org="org", employee=o["employee"], fy=o["fy"], tds_config=o["tdsConfig"],
                existing_tds=o.get("existingTDS"), tax_regime=o.get("taxRegime", UNDEFINED),
                declared_deductions=o.get("declaredDeductions", UNDEFINED),
                hra_details=o.get("hraDetails", UNDEFINED), other_income=o.get("otherIncome", UNDEFINED),
                it_declaration_override=o.get("itDeclarationOverride", None),
                payroll_implementation_date=o.get("payrollImplementationDate"),
                earnings_config=o["SalaryCompensationModel"], loans=o["EmployeeLoanModel"])

        c.add(f"computeEmployeeTdsProjection #{i} {fy_key} impl={impl}", TDS_JS,
              "computeEmployeeTdsProjection", [js_input], py_proj)

    # ---- Save & Compare old-vs-new pure core + exemptions breakdown
    for i in range(30):
        fy = fy_obj(rng.choice(FYS))
        emp = {"_id": "e", "payrollInfo": {"baseSalary": rng.choice([20000, 50000, 150000]),
                                           "grossSalary": rng.choice([0, 90000, 260000])},
               "demographics": {"dob": "1988-02-29T00:00:00Z"}}
        dd = T.normalize_deductions(dec(rand_deductions(rng)))
        dd["standardDeduction"] = 50000
        cap = rand_cap_options(rng)
        hra = {"exemptAmount": rng.choice([0, 60000]), "rentPaid": 120000}
        cfg = rng.choice(CONFIGS[:5])
        c.add(f"buildExemptionsBasedOnDeclaration #{i}", TDS_JS, "buildExemptionsBasedOnDeclaration",
              [dd, hra, cfg, cap], lambda a: T.build_exemptions_based_on_declaration(*[dec(x) for x in a]))
    return c


@unittest.skipUnless(node_available(), SKIP_REASON)
class TdsParityTests(SimpleTestCase):
    def test_tds_parity(self):
        cases = build_cases().items
        results = run_tds_js_batch([js for _, js, _ in cases])
        failures = []
        js_errors = sum(1 for r in results if isinstance(r, dict) and set(r) == {"$error"})
        self.assertLess(js_errors, len(cases) // 20, "too many JS-side errors: the harness is broken")
        for (label, js, py_call), expected in zip(cases, results):
            js_error = isinstance(expected, dict) and set(expected) == {"$error"}
            try:
                got = norm(py_call(js["args"]))
                py_error = None
            except Exception as err:  # noqa: BLE001
                got, py_error = None, err
            if js_error or py_error:
                if not (js_error and py_error):
                    failures.append(f"{label}: js={expected} py_error={py_error!r}")
                continue
            diff = same(got, expected)
            if diff:
                failures.append(f"{label}: {diff}")
        self.assertGreaterEqual(len(cases), 1000)
        self.assertFalse(failures, "\n".join(failures[:25]) + f"\n... {len(failures)} of {len(cases)} failed")
