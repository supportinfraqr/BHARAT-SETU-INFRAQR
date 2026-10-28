"""API + differential tests for ctc_calculator, statutory_compliance, salary_compensation
and staff_portal views (ports of the matching legacy controllers)."""

import copy
import json
import math
import unittest

from django.test import TestCase

from payroll_engine.models import (EmployeePreferences, PayrollAuditLog, PayrollEmployee,
                                   SalaryCompensation, StatutoryCompliance, TDSConfig)
from payroll_engine.views import ctc_calculator, statutory_compliance as sc

from .fixtures import BASE, client_for, make_org_world
from .legacy_controller import handler_call, internal_call, run_batch
from .legacy_js import SKIP_REASON, node_available
from .test_calc_parity import BONUS_BASE, LWF_BASE, PT_BASE

EPF_CFG = {"isEnabled": True, "employeeContributionRate": 12, "employerContributionRate": 12,
           "restrictedPfWage": 15000,
           "contributionPreferences": {"employerPfContribution": True, "edliContribution": True,
                                       "adminCharges": True}}
ESI_CFG = {"isEnabled": True, "employeeContributionRate": 0.75, "employerContributionRate": 3.25,
           "wageLimit": 21000, "includeEmployerInSalaryStructure": True}
FULL_COMPLIANCE = {"epf": EPF_CFG, "esi": ESI_CFG, "professionalTax": PT_BASE,
                   "labourWelfareFund": LWF_BASE, "statutoryBonus": BONUS_BASE}
NEW_SLABS = [{"incomeFrom": 0, "incomeTo": 300000, "taxRate": 0},
             {"incomeFrom": 300000, "incomeTo": 700000, "taxRate": 5},
             {"incomeFrom": 700000, "incomeTo": 1000000, "taxRate": 10},
             {"incomeFrom": 1000000, "incomeTo": 99999999, "taxRate": 30}]
OLD_SLABS = [{"incomeFrom": 0, "incomeTo": 250000, "taxRate": 0},
             {"incomeFrom": 250000, "incomeTo": 500000, "taxRate": 5},
             {"incomeFrom": 500000, "incomeTo": 99999999, "taxRate": 20}]


def same(a, b, path="$"):
    """Deep equality with float tolerance; dict key sets must match."""
    if isinstance(a, dict) and isinstance(b, dict):
        assert set(a) == set(b), f"{path}: keys {sorted(a)} != {sorted(b)}"
        for k in a:
            same(a[k], b[k], f"{path}.{k}")
        return
    if isinstance(a, list) and isinstance(b, list):
        assert len(a) == len(b), f"{path}: len {len(a)} != {len(b)}"
        for i, (x, y) in enumerate(zip(a, b)):
            same(x, y, f"{path}[{i}]")
        return
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) \
            and not isinstance(a, bool) and not isinstance(b, bool):
        assert math.isclose(a, b, rel_tol=0, abs_tol=1e-9), f"{path}: {a} != {b}"
        return
    assert a == b, f"{path}: {a!r} != {b!r}"


def subset(js, py, path="$"):
    """Every key/value in ``js`` is present in ``py`` (py may add schema defaults)."""
    if isinstance(js, dict):
        assert isinstance(py, dict), path
        for k, v in js.items():
            assert k in py, f"{path}: missing {k}"
            subset(v, py[k], f"{path}.{k}")
    elif isinstance(js, list):
        assert isinstance(py, list) and len(js) == len(py), path
        for i, (x, y) in enumerate(zip(js, py)):
            subset(x, y, f"{path}[{i}]")
    else:
        same(js, py, path)


def strip_ids(value):
    """Drop Mongo/Django-specific keys before comparing documents."""
    if isinstance(value, dict):
        return {k: strip_ids(v) for k, v in value.items()
                if k not in ("_id", "id", "organizationId", "createdAt", "updatedAt", "__v")}
    if isinstance(value, list):
        return [strip_ids(v) for v in value]
    return value


class World(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2)
        self.org = self.world["contractor"]
        self.hr = client_for(self.org)
        self.worker = client_for(self.world["workers"][0])
        self.hr.get(BASE + "employees")  # sync employees


# =========================================================================== CTC calculator
CTC_BODIES = {
    "fromGross": [{"grossSalary": g} for g in (8000, 15000, 18000, 21000, 25000, 30000, 75000,
                                              "45000", 123456.78)],
    "fromCTC": [{"ctc": c} for c in (100000, 300000, 600000, 1200000, "900000", 777777.5)],
    "buildStructure": [
        {"ctc": 300000}, {"ctc": 600000, "state": "Maharashtra"},
        {"ctc": 900000, "basicPercentage": 50, "hraPercentage": 20, "state": "Karnataka",
         "customComponents": [{"name": "Conveyance", "amount": 1600},
                              {"name": "LTA", "percentage": 25}]},
        {"ctc": 240000, "state": "Haryana", "customComponents": [{"name": "Big", "amount": 999999}]},
        {"ctc": "500000", "basicPercentage": "45", "state": "Gujarat"},
    ],
    "takeHome": [
        {"ctc": 300000}, {"ctc": 600000, "state": "Maharashtra"},
        {"ctc": 1200000, "taxRegime": "old", "state": "Karnataka"},
        {"ctc": 2500000, "taxRegime": "new"}, {"ctc": 950000, "taxRegime": "old"},
    ],
}
CTC_FNS = {"fromGross": ("calculateCTCFromGross", "ctc/fromGross"),
           "fromCTC": ("calculateGrossFromCTC", "ctc/fromCTC"),
           "buildStructure": ("buildSalaryStructure", "ctc/buildStructure"),
           "takeHome": ("calculateTakeHome", "ctc/takeHome")}


class CtcCalculatorApiTests(World):
    def test_validation_and_access(self):
        for key, (_fn, route) in CTC_FNS.items():
            body = {"grossSalary": 0} if key == "fromGross" else {"ctc": -5}
            res = self.hr.post(BASE + route, body, format="json")
            self.assertEqual(res.status_code, 400, route)
            self.assertIn("required", res.json()["message"])
            self.assertEqual(self.worker.post(BASE + route, {"ctc": 1}, format="json").status_code, 403)

    def test_happy_paths_without_config(self):
        res = self.hr.post(BASE + "ctc/fromGross", {"grossSalary": 30000}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["message"], "CTC calculated successfully")
        self.assertEqual(res.json()["data"]["employerContributions"]["monthly"]["gratuity"], 577)
        res = self.hr.post(BASE + "ctc/takeHome", {"ctc": 600000}, format="json")
        self.assertEqual(res.json()["data"]["deductions"]["monthly"]["tds"], 0)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_differential_vs_legacy(self):
        configs = [None, FULL_COMPLIANCE,
                   {"epf": {"isEnabled": True}, "esi": {"isEnabled": True,
                                                       "includeEmployerInSalaryStructure": False}}]
        tds_options = [None, {"newRegimeSlabs": NEW_SLABS, "oldRegimeSlabs": OLD_SLABS}]
        calls, ours = [], []
        for cfg in configs:
            StatutoryCompliance.objects.filter(org=self.org).delete()
            doc = None
            if cfg is not None:
                row = StatutoryCompliance(org=self.org)
                for k, attr, _s in sc._SECTIONS:
                    if k in cfg:
                        setattr(row, attr, copy.deepcopy(cfg[k]))
                row.save()
                doc = json.loads(json.dumps(row.to_dict()))
            for tds in tds_options:
                TDSConfig.objects.filter(org=self.org).delete()
                if tds:
                    TDSConfig.objects.create(org=self.org, financial_year="2025-26",
                                             new_regime_slabs=tds["newRegimeSlabs"],
                                             old_regime_slabs=tds["oldRegimeSlabs"])
                models = {"StatutoryComplianceModel": {"findOne": doc},
                          "TDSConfigModel": {"findOne": tds}}
                for key, bodies in CTC_BODIES.items():
                    if tds and key != "takeHome":
                        continue
                    fn, route = CTC_FNS[key]
                    for body in bodies:
                        calls.append(handler_call("controller/payroll/ctcCalculator.js", fn,
                                                  {"body": body}, models))
                        res = self.hr.post(BASE + route, body, format="json")
                        ours.append({"status": res.status_code, "body": res.json()})
        legacy = run_batch(calls)
        self.assertEqual(len(legacy), len(ours))
        for js, py in zip(legacy, ours):
            same(js, py)


# =========================================================================== compliance
LWF_INPUT = {"isEnabled": True, "deductionCycle": "Half Yearly", "months": ["june", "DEC", "x", "Jun"],
             "states": [
                 {"stateName": "Maharashtra", "deductionCycle": "half_yearly", "periodFrom": "june",
                  "periodTo": "december", "employeeShare": "12", "employerShare": 36, "maxAmount": None},
                 {"stateName": "Haryana", "deductionCycle": "Monthly", "calculationType": "Percent",
                  "employeeShare": 150, "employerShare": -5, "isApplicable": False},
                 {"stateName": "Karnataka", "deductionCycle": "annual", "months": ["jan"],
                  "employeeShare": 20, "maxAmount": 5000, "minAmount": "x"},
                 {"stateName": "Punjab", "status": "inactive", "months": ["Mar", "sep"]},
                 {}]}
BONUS_INPUT = {"isEnabled": True, "paymentCycle": "Monthly", "percentage": "8.33",
               "minimumBonusWage": 0, "states": [
                   {"stateName": "Maharashtra", "minWage": "12000", "formulaBase": " basicAndDA ",
                    "employmentCategories": [{"employmentCategory": "skilled", "minWage": 15000,
                                              "effectiveFrom": " 2025-04 "},
                                             {"employmentCategory": "manager", "minWage": 1}]},
                   {"stateName": "Gujarat", "wageCategories": [{"employmentCategory": "unskilled"}],
                    "employmentCategories": [{"employmentCategory": "skilled"}]},
                   {}]}
EPF_INPUT = {"isEnabled": True, "restrictedPfWage": "", "employeeContributionRate": "10",
             "proRateRestrictedPfWage": False, "considerSalaryBasedOnLOP": None}
PT_INPUT = {"isEnabled": True, "deductionCycle": "Semi Annual", "states": PT_BASE["states"]}


class StatutoryComplianceTests(World):
    def test_get_404_then_create_merge_and_get(self):
        self.assertEqual(self.hr.get(BASE + "getCompliance").status_code, 404)
        res = self.hr.post(BASE + "createOrUpdateCompliance",
                           {"epf": EPF_INPUT, "labourWelfareFund": LWF_INPUT}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["epf"]["restrictedPfWage"], 15000)
        self.assertEqual(data["epf"]["employeeContributionRate"], 10)
        self.assertIs(data["epf"]["considerSalaryBasedOnLOP"], True)
        self.assertEqual(data["esi"]["wageLimit"], 21000)  # untouched section default
        self.assertEqual(data["labourWelfareFund"]["months"], ["Jun", "Dec"])
        self.assertEqual(len(data["labourWelfareFund"]["states"]), 5)
        # partial update keeps epf, replaces states
        res = self.hr.post(BASE + "createOrUpdateCompliance",
                           {"esi": {"isEnabled": True}, "labourWelfareFund": {"states": []}},
                           format="json")
        data = res.json()["data"]
        self.assertEqual(data["epf"]["employeeContributionRate"], 10)
        self.assertTrue(data["esi"]["isEnabled"])
        self.assertEqual(data["labourWelfareFund"]["states"], [])
        self.assertEqual(data["labourWelfareFund"]["deductionCycle"], "Half Yearly")
        got = self.hr.get(BASE + "getCompliance")
        self.assertEqual(got.json()["message"], "Statutory compliance fetched successfully")
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org, action="compliance_updated").exists())

    def test_worker_forbidden(self):
        self.assertEqual(self.worker.post(BASE + "createOrUpdateCompliance", {}, format="json").status_code, 403)
        self.assertEqual(self.worker.get(BASE + "getCompliance").status_code, 403)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_sanitizers_differential(self):
        F = "controller/payroll/statutoryCompliance.js"
        cases = [
            ("normalizeLwfMonthsList", sc.normalize_lwf_months_list,
             [[["january", "Feb", "SEPT", "sep", "x", None, "", 3, "dEcEmBeR"]], [None], ["Jan"]]),
            ("normalizeLwfCalculationType", sc.normalize_lwf_calculation_type,
             [["%"], [" Percent "], [None], ["fixed"], [5]]),
            ("normalizePtDeductionCycle", sc.normalize_pt_deduction_cycle,
             [["Half Yearly"], ["semi_annual"], ["quarterly"], [None], ["halfyearly"]]),
            ("normalizeBonusPaymentCycle", sc.normalize_bonus_payment_cycle,
             [["Monthly"], [" monthly "], [None], ["yearly"]]),
            ("normalizeLwfStateStatus", sc.normalize_lwf_state_status,
             [[{"status": "inactive"}], [{"isApplicable": False}], [{}], [{"status": "x"}]]),
            ("sanitizeEpf", sc.sanitize_epf, [[EPF_INPUT], [{}], [EPF_CFG]]),
            ("sanitizeProfessionalTax", sc.sanitize_professional_tax, [[PT_INPUT], [{}]]),
            ("sanitizeLabourWelfareFund", sc.sanitize_labour_welfare_fund,
             [[LWF_INPUT], [{"months": "Jan"}], [LWF_BASE]]),
            ("sanitizeStatutoryBonus", sc.sanitize_statutory_bonus, [[BONUS_INPUT], [BONUS_BASE], [{}]]),
            ("sanitizeBonusWageCategory", sc.sanitize_bonus_wage_category,
             [[{"employmentCategory": " semiSkilled ", "minWage": "7"}], [{}]]),
        ]
        calls, pys = [], []
        for js_name, py_fn, arg_sets in cases:
            for args in arg_sets:
                calls.append(internal_call(F, js_name, *copy.deepcopy(args)))
                pys.append(ctc_calculator.jsonable(py_fn(*copy.deepcopy(args))))
        for js, py in zip(run_batch(calls), pys):
            same(js, py)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_save_differential(self):
        body = {"epf": EPF_INPUT, "esi": ESI_CFG, "professionalTax": PT_INPUT,
                "labourWelfareFund": LWF_INPUT, "statutoryBonus": BONUS_INPUT}
        res = self.hr.post(BASE + "createOrUpdateCompliance", body, format="json").json()
        # Legacy handler with a stub model: compare the merged sections it would save.
        harness_body = copy.deepcopy(body)
        py = {k: res["data"][k] for k in body}
        expected = {}
        for key, _attr, sanitizer in sc._SECTIONS:
            expected[key] = sanitizer(copy.deepcopy(harness_body[key])) if sanitizer else harness_body[key]
        js_calls = [internal_call("controller/payroll/statutoryCompliance.js",
                                  {"epf": "sanitizeEpf", "professionalTax": "sanitizeProfessionalTax",
                                   "labourWelfareFund": "sanitizeLabourWelfareFund",
                                   "statutoryBonus": "sanitizeStatutoryBonus"}[k], copy.deepcopy(body[k]))
                    for k in ("epf", "professionalTax", "labourWelfareFund", "statutoryBonus")]
        js = dict(zip(("epf", "professionalTax", "labourWelfareFund", "statutoryBonus"), run_batch(js_calls)))
        for k, v in js.items():
            # stored section = schema defaults + sanitised input; every sanitised key must match
            for sub, val in v.items():
                subset(strip_ids(val), strip_ids(py[k][sub]), f"{k}.{sub}")


# =========================================================================== salary compensation
class SalaryCompensationTests(World):
    def _create(self, category="earnings", **component):
        comp = {"name": "HRA", "type": "earning", "calculationType": "percentage", "value": 40,
                "basedOn": "basic", **component}
        return self.hr.post(BASE + "createSalaryCompensation",
                            {"category": category, "component": comp}, format="json")

    def test_crud_flow(self):
        res = self._create()
        self.assertEqual(res.status_code, 201, res.content)
        comp = res.json()["data"]
        self.assertEqual(comp["frequency"], "monthly")
        self.assertEqual(comp["paymentMonth"], "")
        self.assertIn("_id", comp)
        basic = self._create(name="Basic Salary", code="BASIC", value=50, label="dropped").json()["data"]
        self.assertTrue(basic["considerForEPF"])
        self.assertNotIn("label", basic)  # Mongoose strict mode
        self._create(category="deductions", name="Canteen", type="deduction", calculationType="fixed")
        cid = comp["_id"]
        res = self.hr.put(BASE + f"updateSalaryCompensation/earnings/{cid}",
                          {"frequency": "yearly", "paymentMonth": "March", "value": "45"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["data"]["value"], 45)
        self.assertEqual(res.json()["data"]["paymentMonth"], "March")
        res = self.hr.put(BASE + f"updateSalaryCompensation/earnings/{cid}", {"frequency": "monthly"},
                          format="json")
        self.assertEqual(res.json()["data"]["paymentMonth"], "")
        self.assertEqual(self.hr.get(BASE + f"getSalaryCompensation/earnings/{cid}").json()["data"]["_id"], cid)
        self.assertEqual(self.hr.get(BASE + "getSalaryCompensation/earnings/nope").status_code, 404)
        self.assertEqual(self.hr.get(BASE + f"getSalaryCompensation/benefits/{cid}").status_code, 404)
        page = self.hr.get(BASE + "getSalaryCompenBYCategory/earnings", {"limit": 1, "page": 2}).json()["data"]
        self.assertEqual(page["pagination"], {"total": 2, "page": 2, "limit": 1, "totalPages": 2})
        self.assertEqual(page["data"][0]["name"], "Basic Salary")
        empty = self.hr.get(BASE + "getSalaryCompenBYCategory/benefits").json()
        self.assertEqual(empty["message"], "No components found for category benefits")
        allc = self.hr.get(BASE + "getAllSalaryCompensations", {"search": "can"}).json()["data"]
        self.assertEqual([c["category"] for c in allc["data"]], ["deductions"])
        allc = self.hr.get(BASE + "getAllSalaryCompensations").json()["data"]
        self.assertEqual(allc["pagination"]["total"], 3)
        res = self.hr.delete(BASE + f"deleteSalaryCompensation/earnings/{cid}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["data"]["components"]), 1)
        self.assertEqual(self.hr.delete(BASE + f"deleteSalaryCompensation/benefits/{cid}").status_code, 404)
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org, entity_type="salary_component").exists())

    def test_validation(self):
        res = self.hr.post(BASE + "createSalaryCompensation", {"category": "earnings"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"], "category and component are required")
        res = self._create(category="bogus")
        self.assertEqual(res.status_code, 500)
        self.assertIn("is not a valid enum value for path `category`", res.json()["message"])
        res = self._create(type="salary")
        self.assertEqual(res.status_code, 500)
        self.assertIn("`salary` is not a valid enum value for path `type`", res.json()["message"])
        res = self._create(name="")
        self.assertIn("Path `name` is required", res.json()["message"])
        self.assertFalse(SalaryCompensation.objects.filter(org=self.org, category="bogus").exists())
        self.assertEqual(self.hr.put(BASE + "updateSalaryCompensation/earnings/x", {}, format="json").status_code, 404)

    def test_worker_forbidden(self):
        self.assertEqual(self.worker.get(BASE + "getAllSalaryCompensations").status_code, 403)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_listing_differential(self):
        for comp in ({"name": "Basic Salary", "code": "BASIC"}, {"name": "HRA"}, {"name": "Conveyance"},
                     {"name": "Special Allowance"}):
            self._create(**comp)
        self._create(category="deductions", name="Canteen", type="deduction")
        recs = {r.category: json.loads(json.dumps(r.to_dict()))
                for r in SalaryCompensation.objects.filter(org=self.org)}
        queries = [{}, {"search": "an"}, {"search": "undefined"}, {"page": "2", "limit": "2"},
                   {"page": "x"}, {"limit": "0"}, {"page": "3", "limit": "3"}]
        calls, ours = [], []
        for q in queries:
            calls.append(handler_call("controller/payroll/salaryCompensation.js", "getSalaryCompenBYCategory",
                                      {"params": {"category": "earnings"}, "query": q},
                                      {"SalaryCompensationModel": {"findOne": recs["earnings"]}}))
            ours.append(self.hr.get(BASE + "getSalaryCompenBYCategory/earnings", q).json())
        for js, py in zip(run_batch(calls), ours):
            same(strip_ids(js["body"]), strip_ids(py))


# =========================================================================== staff portal
class StaffPortalTests(World):
    def test_settings_and_tabs(self):
        self.assertEqual(self.hr.get(BASE + "staffPortal/settings").json()["data"], {})
        self.assertEqual(self.worker.get(BASE + "staffPortal/webTabs").json()["data"], [])
        res = self.hr.post(BASE + "staffPortal/settings",
                           {"enablePortalAccess": True, "bannerMessage": "Payday on 1st",
                            "bannerEndDate": "2026-12-31", "portalContactEmail": "hr@x.in"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["data"]["bannerEndDate"], "2026-12-31T00:00:00Z")
        # partial update keeps other keys
        res = self.hr.post(BASE + "staffPortal/settings", {"bannerMessage": "New"}, format="json")
        self.assertEqual(res.json()["data"]["portalContactEmail"], "hr@x.in")
        self.assertEqual(self.hr.post(BASE + "staffPortal/webTab", {"title": "x"}, format="json").status_code, 400)
        tab = self.hr.post(BASE + "staffPortal/webTab", {"title": "HR Policy", "url": "https://x"},
                           format="json").json()["data"]["webTabs"][0]
        self.assertTrue(tab["isVisible"])
        res = self.hr.put(BASE + f"staffPortal/webTab/{tab['_id']}", {"isVisible": False}, format="json")
        self.assertFalse(res.json()["data"]["webTabs"][0]["isVisible"])
        self.assertEqual(self.hr.put(BASE + "staffPortal/webTab/nope", {}, format="json").status_code, 404)
        worker_view = self.worker.get(BASE + "staffPortal/settings").json()["data"]
        self.assertEqual(worker_view["bannerMessage"], "New")
        self.assertEqual(self.worker.post(BASE + "staffPortal/settings", {}, format="json").status_code, 403)
        res = self.hr.delete(BASE + f"staffPortal/webTab/{tab['_id']}")
        self.assertEqual(res.json()["data"]["webTabs"], [])
        self.assertEqual(self.hr.get(BASE + "staffPortal/webTabs").json()["data"], [])

    def test_tab_404_without_portal(self):
        self.assertEqual(self.hr.delete(BASE + "staffPortal/webTab/abc").json()["message"], "Staff portal not found")

    def test_preferences(self):
        emp = PayrollEmployee.objects.filter(org=self.org, worker_id=self.world["workers"][0].pk).first()
        other = PayrollEmployee.objects.filter(org=self.org).exclude(pk=emp.pk).first()
        url = BASE + f"staffPortal/preferences/{emp.pk}"
        self.assertEqual(self.worker.get(url).json()["data"], {})
        res = self.worker.put(url, {"language": "hi", "emailNotifications": False}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual((data["language"], data["dateFormat"], data["theme"], data["emailNotifications"],
                          data["smsNotifications"]), ("hi", "DD/MM/YYYY", "light", False, False))
        self.assertEqual(self.hr.get(url).json()["data"]["language"], "hi")
        self.assertEqual(self.worker.get(BASE + f"staffPortal/preferences/{other.pk}").status_code, 404)
        self.hr.put(url, {"theme": "dark"}, format="json")
        self.assertEqual(EmployeePreferences.objects.filter(employee=emp).count(), 1)
        self.assertEqual(EmployeePreferences.objects.get(employee=emp).language, "en")
