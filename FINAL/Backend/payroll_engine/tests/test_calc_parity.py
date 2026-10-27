"""Differential (parity) tests: legacy JS calculation libraries vs the Python ports.

Every case runs the same JSON input through the legacy JS export (one batched Node process,
see ``legacy_js``) and the Python port; the JSON outputs must be identical — same keys in
the same order, same types, numbers equal within 1e-9 (paisa rounding therefore exact),
and an exception in JS must be an exception in Python. Skipped when Node / the legacy copy
is unavailable. DB-backed helpers have ordinary Django tests at the bottom.
"""

import itertools
import json
import math
import re
import unittest
from datetime import date, datetime, timezone

from django.test import SimpleTestCase, TestCase

from payroll_engine.services import (
    employee_display,
    employee_implementation_date,
    financial_year,
    payslip_attendance,
    salary_component_helper,
    statutory_calculator,
)
from payroll_engine.services.financial_year import iso_local_midnight
from payroll_engine.services.jsmath import UNDEFINED

from .legacy_js import SKIP_REASON, node_available, run_js_batch

JS_MODULES = {
    financial_year: "utils/financialYear",
    statutory_calculator: "utils/payroll/statutoryCalculator",
    salary_component_helper: "utils/salaryComponentHelper",
    payslip_attendance: "utils/payslipAttendance",
    employee_display: "utils/payroll/employeeDisplay",
    employee_implementation_date: "utils/payroll/employeeImplementationDate",
}


def snake(name):
    if name.isupper():
        return name
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    return s.lower()


# ------------------------------------------------------------------ case registry


class Case:
    def __init__(self, module, fn, args, obj=False, mutated=None):
        self.module, self.fn, self.args, self.obj, self.mutated = module, fn, args, obj, mutated

    def js_call(self):
        call = {"module": JS_MODULES[self.module], "fn": self.fn, "args": self.args}
        if self.mutated:
            call["mutated"] = self.mutated
        return call

    def label(self):
        return f"{self.fn}({json.dumps(self.args)[:300]})"


CASES = {}


def P(group, module, fn, *args):
    CASES.setdefault(group, []).append(Case(module, fn, list(args)))


def O(group, module, fn, obj):
    CASES.setdefault(group, []).append(Case(module, fn, [obj], obj=True))


# ------------------------------------------------------------------ encode / decode


def py_decode(v):
    if isinstance(v, list):
        return [py_decode(x) for x in v]
    if isinstance(v, dict):
        if v == {"$undefined": True}:
            return UNDEFINED
        if list(v) == ["$set"]:
            return set(py_decode(v["$set"]))
        if list(v) == ["$date"]:
            return datetime.fromisoformat(v["$date"].replace("Z", "+00:00"))
        return {k: py_decode(x) for k, x in v.items()}
    return v


def py_encode(v, top=True):
    if v is UNDEFINED:
        return {"$undefined": True} if top else None
    if isinstance(v, datetime):
        u = v.astimezone(timezone.utc)
        return u.strftime("%Y-%m-%dT%H:%M:%S.") + f"{u.microsecond // 1000:03d}Z"
    if isinstance(v, date):
        return iso_local_midnight(v)
    if isinstance(v, (set, frozenset)):
        return {"$set": sorted(v, key=str)}
    if isinstance(v, dict):
        return {k: py_encode(x, False) for k, x in v.items() if x is not UNDEFINED}
    if isinstance(v, (list, tuple)):
        return [py_encode(x, False) for x in v]
    if isinstance(v, float) and not math.isfinite(v):
        return None
    return v


def run_py(case):
    fn = getattr(case.module, snake(case.fn))
    args = py_decode(case.args)
    try:
        if not callable(fn):
            return py_encode(fn)
        if case.obj:
            ret = fn(**{snake(k): v for k, v in args[0].items()})
        else:
            ret = fn(*args)
        if case.mutated:
            return {"ret": py_encode(ret), "args": {str(i): py_encode(args[i]) for i in case.mutated}}
        return py_encode(ret)
    except Exception as exc:  # noqa: BLE001 - mirrors a JS throw
        return {"$error": f"{type(exc).__name__}: {exc}"}


def diff(js, py, path="$"):
    """First difference between two decoded JSON values (None when equal)."""
    if isinstance(js, bool) or isinstance(py, bool):
        return None if (type(js) is type(py) and js == py) else f"{path}: {js!r} != {py!r}"
    if isinstance(js, (int, float)) and isinstance(py, (int, float)):
        return None if abs(js - py) <= 1e-9 else f"{path}: {js!r} != {py!r}"
    if isinstance(js, dict) and isinstance(py, dict):
        if list(js) != list(py):
            return f"{path}: keys {list(js)} != {list(py)}"
        for k in js:
            d = diff(js[k], py[k], f"{path}.{k}")
            if d:
                return d
        return None
    if isinstance(js, list) and isinstance(py, list):
        if len(js) != len(py):
            return f"{path}: len {len(js)} != {len(py)}"
        for i, (a, b) in enumerate(zip(js, py)):
            d = diff(a, b, f"{path}[{i}]")
            if d:
                return d
        return None
    return None if js == py else f"{path}: {js!r} != {py!r}"


def is_error(v):
    return isinstance(v, dict) and list(v) == ["$error"]


# ================================================================== financial_year
FY = financial_year
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

for m in MONTHS + ["jan", "January", "", None, 3, "Sept"]:
    P("fy", FY, "getMonthIndex", m)
for m, y in itertools.product(["Jan", "Mar", "Apr", "Dec", "Foo"], [2024, "2025", None, "abc", 2025.5]):
    P("fy", FY, "getFinancialYearStartFromPayroll", m, y)
FY_INPUTS = ["2025-26", "FY2025-26", "fy2025-2026", "2025-2026", " 2025-26 ", "2025-27", "2025-2027",
             "2099-00", "1999-00", "1999-2000", "2025/26", "", None, 202526, "FY 2025-26", "0123-24",
             "2025-26\n", "FY2025-26x", "２０２５-26"]
for v in FY_INPUTS:
    P("fy", FY, "parseFinancialYearInput", v)
    P("fy", FY, "normalizeFinancialYearStorage", v)
    P("fy", FY, "getFinancialYearAliasesFromInput", v)
    P("fy", FY, "resolveFinancialYearInput", v)
P("fy", FY, "getFinancialYearAliasesFromInput", 0)
P("fy", FY, "getFinancialYearAliasesFromInput", "garbage")
for v in [2025, 1999, "2025", 2099, 9]:
    P("fy", FY, "getFinancialYearAliasesFromStartYear", v)
for m, y in [("Mar", 2026), ("Apr", 2025), ("Foo", 2025), ("Dec", "2025"), ("Jan", None)]:
    P("fy", FY, "getFinancialYearAliasesFromPayroll", m, y)
P("fy", FY, "buildFinancialYearPayrollQuery", {"startYear": 2025, "endYear": 2026})
P("fy", FY, "buildFinancialYearPayrollQuery", {"startYear": 2025})
P("fy", FY, "buildFinancialYearPayrollQuery", None)
for m, y, s, e in [("Apr", 2025, 2025, 2026), ("Mar", 2026, 2025, 2026), ("Mar", 2025, 2025, 2026),
                   ("Dec", "2025", 2025, 2026), ("Jan", 2026, 2025, "2026"), ("Foo", 2025, 2025, 2026),
                   ("Jun", None, 0, 1), ("Feb", "x", 2025, 2026)]:
    P("fy", FY, "getPayrollPeriodSortKey", m, y, s, e)
for m in MONTHS + ["Foo"]:
    P("fy", FY, "getAccountingYearPeriodsUpTo", m, 2025)
P("fy", FY, "getAccountingYearPeriodsUpTo", "Apr", "2025")
DATE_INPUTS = ["2025-04-01", "2025-04-01T00:00:00.000Z", "2025-03-31T18:30:00.000Z",
               "2025-03-31T18:29:59.000Z", "2025-02-30", "2024-02-29", " 2025-04-01 ", "2025-04",
               "2025", "garbage", "", None, 1743465600000, 1743445800000, 1743500000000, True,
               {"$date": "2025-04-01T10:00:00+05:30"}, {"$date": "2025-04-01T00:00:00Z"},
               "0050-03-01", "2025-04-01T23:59:59+05:30", "2025/04/01", "April 1, 2025", 0,
               "2025-13-01", {"a": 1}]
for v in DATE_INPUTS:
    P("fy", FY, "toCalendarDate", v)
for v in [2025, "2024", 2023.7, None, "abc", 0]:
    P("fy", FY, "getFinancialYearBounds", v)
for args in [(2025, 3, "2025-04-15", "2025-06-30"), (2024, 1, "2024-02-01", "2024-02-29"),
             (2024, 1, "2024-02-10", "2024-02-10"), (2023, 1, "2023-02-01", "2023-03-31"),
             (2025, 3, "2025-06-30", "2025-04-15"), (2025, 12, "2026-01-01", "2026-01-31"),
             (2025, "3", "2025-04-15", "2025-06-30"), (2025, 5, "2025-04-15", "2025-06-30"),
             (2025, 6, "2025-04-15", "2025-06-30"), (2025, -1, "2024-12-15", "2025-01-10"),
             (2025, 3, None, "2025-06-30")]:
    P("fy", FY, "getMonthDayFactor", *args)
for a, b in [("2025-04-01", "2026-03-31"), ("2025-06-15", "2026-03-31"), ("2024-01-31", "2024-03-01"),
             ("2024-02-29", "2024-02-29"), ("2025-03-31", "2025-03-30"), (None, "2025-01-01"),
             ("2023-12-25", "2024-01-05"), ("2025-04-17", "2025-05-16")]:
    P("fy", FY, "sumMonthDayFactors", a, b)
FYS = [{"startYear": 2025, "endYear": 2026}, {"startYear": 2023}, {"startYear": "2024"}, None, {},
       {"startYear": 0}]
IMPLS = [None, "2025-04-01", "2025-04-02", "2025-06-15", "2026-03-31", "2026-04-01", "2024-01-01",
         "2023-11-20", "2024-02-29"]
for fy, impl in itertools.product(FYS, IMPLS):
    P("fy", FY, "getTdsCalculationPeriod", fy, impl)
P("fy", FY, "getTdsCalculationPeriod", {"startYear": "abc"}, None)
P("fy", FY, "getTdsCalculationPeriod", {"startYear": "abc"}, "2025-01-01")
for fy, impl, asof in itertools.product(FYS[:3], [None, "2025-06-15", "2026-04-01", "2023-08-10"],
                                        ["2025-04-10", "2025-09-01", "2026-03-31", "2026-05-01",
                                         "2023-06-30", "2024-01-15"]):
    P("fy", FY, "getRemainingPayrollMonthsInTdsPeriod", fy, impl, asof)
P("fy", FY, "getRemainingPayrollMonthsInTdsPeriod", None, None, "2025-06-01")
for m, y, impl in itertools.product(["Apr", "Jun", "Mar", "Jan", "June", "6", "Foo", None],
                                    [2025, 2026], [None, "2025-06-15", "2025-04-01", "2026-03-31"]):
    P("fy", FY, "getPayrollMonthTdsFactor", m, y, impl)
    P("fy", FY, "isPayrollMonthBeforeImplementation", m, y, impl)
for s, e, g, t in [("2025-06-15", "2026-03-31", 30000, None), ("2025-06-15", "2026-03-31", 30000, 286000),
                   ("2025-04-01", "2026-03-31", 25000.5, "300006"), ("2025-04-01", "2026-03-31", "abc", None),
                   ("2024-02-10", "2024-03-31", 31000, "x"), ("2025-07-01", "2025-06-01", 1000, None),
                   ("2025-12-31", "2026-01-01", 45000, 3000)]:
    P("fy", FY, "buildTdsIncomeMonths", s, e, g, t)
P("fy", FY, "buildTdsIncomeMonths", "2025-06-15", "2026-03-31", 30000)
for period in [{"periodStart": "2025-06-15", "periodEnd": "2026-03-31"},
               {"periodStart": "2025-04-01", "periodEnd": "2026-03-31"},
               {"periodStart": "2026-03-20", "periodEnd": "2026-03-25"},
               {"periodStart": "2026-03-26", "periodEnd": "2026-03-25"},
               {"periodStart": None, "periodEnd": "2026-03-31"}, None, {}]:
    P("fy", FY, "getTdsOpeningMonth", period)
P("fy", FY, "PAYROLL_MONTHS")

# ================================================================== statutory: EPF
SC = statutory_calculator
EPF_CONFIGS = [
    None,
    {"isEnabled": False},
    {"isEnabled": True},
    {"isEnabled": True, "contributionPreferences": {"edliContribution": True, "adminCharges": True}},
    {"isEnabled": True, "eligibleForAbryScheme": True,
     "contributionPreferences": {"edliContribution": True, "adminCharges": True}},
    {"isEnabled": True, "contributionPreferences": {"employerPfContribution": False}},
    {"isEnabled": True, "employeeContributionRate": 10, "employerContributionRate": "10",
     "restrictedPfWage": 12000, "proRateRestrictedPfWage": False,
     "contributionPreferences": {"adminCharges": 1}},
    {"isEnabled": True, "restrictedPfWage": None, "employeeContributionRate": "", "employerContributionRate": "abc"},
    {"isEnabled": "yes", "contributionPreferences": "x"},
]
EPF_WAGES = [0, 5000, 14999, 15000, 15001, 25000, "15000", None, -100, 14999.5]
EPF_INFOS = [None, {"epfApplicable": False}, {"epfOverride": {"enabled": True, "applyCeiling": False}},
             {"epfOverride": {"applyCeiling": False}}, {"epfOverride": {"enabled": True}},
             {"epfOverride": {"enabled": True, "applyCeiling": "false"}}]
EPF_RES = [None, {"workingDays": 30, "paidDays": 20, "fullMonthPfWage": 25000,
                  "lopAdjustedPfWage": 16667, "usedFullMonthPfComponents": False},
           {"workingDays": 26, "paidDays": 26}, {"workingDays": 0, "paidDays": 5},
           {"workingDays": "30", "paidDays": None}]
for cfg, wage in itertools.product(EPF_CONFIGS, EPF_WAGES):
    O("epf", SC, "calculateEpf", {"epfConfig": cfg, "baseSalary": wage})
for cfg, info, res in itertools.product(EPF_CONFIGS[2:7], EPF_INFOS, EPF_RES):
    O("epf", SC, "calculateEpf", {"epfConfig": cfg, "baseSalary": 30000, "epfApplicableWage": 18000,
                                  "employeeStatutoryInfo": info, "epfWageResolution": res})
for w in [None, "", "abc", 0, 8000]:
    O("epf", SC, "calculateEpf", {"epfConfig": EPF_CONFIGS[3], "baseSalary": 9000, "epfApplicableWage": w})
O("epf", SC, "calculateEpf", {})
for cfg, full, wd, pd in itertools.product(
        [None, {}, {"restrictedPfWage": 15000}, {"considerAllPfComponentsAfterLopBelowCeiling": False},
         {"restrictedPfWage": 10000, "considerAllPfComponentsAfterLopBelowCeiling": True}],
        [12000, 25000, "20000"], [30, 0, 31], [30, 15, 0, None, 40]):
    O("epf", SC, "resolveEpfApplicableWage", {"epfConfig": cfg, "fullMonthEpfWage": full,
                                              "workingDays": wd, "paidDays": pd})
O("epf", SC, "resolveEpfApplicableWage", {"epfConfig": {}, "fullMonthEpfWage": 25000, "workingDays": 30})
EARN_LISTS = [
    [], None, "x",
    [{"name": "Basic Salary", "amount": 10000}, {"name": "HRA", "amount": 4000, "considerForEPF": True,
                                                  "considerForESI": True},
     {"componentName": "Special", "calculatedAmount": "2000", "considerForEPF": True}],
    [{"name": "HRA", "amount": 4000}, None, {"name": "Conveyance", "amount": 1600, "considerForESI": True}],
    [{"name": "BASIC pay", "calculatedAmount": None, "amount": 7000}],
    [{"name": 5, "amount": 1}],
    [{"componentName": "basic", "amount": -500}],
]
for e, base in itertools.product(EARN_LISTS, [0, 12000, None, "9000"]):
    P("epf", SC, "sumConsiderForEpf", e, base)
    P("epf", SC, "sumConsiderForEsi", e, base)
P("epf", SC, "sumConsiderForEpf", [])
P("epf", SC, "EPF_DEFAULTS")
P("epf", SC, "ESI_DEFAULTS")
P("epf", SC, "BONUS_EMPLOYMENT_CATEGORIES")
P("epf", SC, "BONUS_MIN_WORKING_DAYS")

# ================================================================== statutory: ESI
ESI_CONFIGS = [None, {"isEnabled": False}, {"isEnabled": True},
               {"isEnabled": True, "employeeContributionRate": 1, "employerContributionRate": "4",
                "wageLimit": 25000, "includeEmployerInSalaryStructure": False},
               {"isEnabled": True, "wageLimit": None}, {"isEnabled": True, "wageLimit": "abc"}]
ESI_INFOS = [None, {"esiOptedOut": True}, {"esiApplicable": False},
             {"esiApplicable": False, "uan": ""}, {"esiApplicable": False, "esiNumber": "1"},
             {"esiApplicable": True, "esiOptedOut": False}, "str", []]
for cfg, gross in itertools.product(ESI_CONFIGS, [0, 15000, 20999, 21000, 21001, 21000.01, "21000",
                                                  "21001", None, -5, 25000]):
    O("esi", SC, "calculateEsi", {"esiConfig": cfg, "grossSalary": gross})
for info, w in itertools.product(ESI_INFOS, [None, 12000, "abc", ""]):
    O("esi", SC, "calculateEsi", {"esiConfig": {"isEnabled": True}, "grossSalary": 18000,
                                  "esiApplicableWage": w, "employeeStatutoryInfo": info})
for info in ESI_INFOS + [{}, {"esiApplicable": False, "pfAccountNumber": None},
                         {"esiApplicable": False, "epfOverride": None}]:
    P("esi", SC, "isEmployeeEsiOptedOut", info)
O("esi", SC, "calculateEsi", {"esiConfig": {"isEnabled": True}})

# ================================================================== statutory: PT
MH_SLABS = [{"salaryRangeFrom": 0, "salaryRangeTo": 7500, "taxAmount": 0},
            {"salaryRangeFrom": 7501, "salaryRangeTo": 10000, "taxAmount": 175},
            {"salaryRangeFrom": 10001, "salaryRangeTo": 999999999, "taxAmount": 200}]
KA_SLABS = [{"salaryRangeFrom": 0, "salaryRangeTo": 24999, "taxAmount": 0},
            {"salaryRangeFrom": 25000, "salaryRangeTo": None, "taxAmount": 200},
            {"salaryRangeFrom": 25000, "taxAmount": "300"}]
PT_BASE = {"isEnabled": True, "states": [
    {"stateName": "Maharashtra", "ptNumber": "PT-MH-1", "isApplicable": True, "ptSlabs": MH_SLABS},
    {"stateName": " karnataka ", "ptSlabs": KA_SLABS},
    {"stateName": "Tamil Nadu", "isApplicable": False, "ptSlabs": MH_SLABS},
]}
PT_CYCLES = [None, "monthly", "half-yearly", "Half Yearly", "half_yearly", "semi-annual", "quarterly",
             "Quarter Yearly", "yearly", "annual", "weird"]
for cycle, month in itertools.product(PT_CYCLES, ["Jan", "Mar", "Apr", "Sep", "Dec", None]):
    O("pt", SC, "calculateProfessionalTax", {"ptConfig": {**PT_BASE, "deductionCycle": cycle},
                                             "grossSalary": 12000, "month": month,
                                             "employeeState": "Maharashtra"})
for gross, state in itertools.product([0, 7500, 7500.5, 7501, 10000, 10001, 24999, 25000, 30000,
                                       "9000", None], ["Maharashtra", "KARNATAKA", "Tamil Nadu", None, "Goa"]):
    O("pt", SC, "calculateProfessionalTax", {"ptConfig": PT_BASE, "grossSalary": gross,
                                             "employeeState": state})
for info in [None, {"ptApplicable": False}, {"ptState": "Karnataka"}, {"ptState": ""},
             {"ptApplicable": True, "ptState": "Maharashtra"}]:
    O("pt", SC, "calculateProfessionalTax", {"ptConfig": PT_BASE, "grossSalary": 30000,
                                             "employeeState": "Maharashtra", "employeeStatutoryInfo": info})
for cfg in [None, {"isEnabled": False}, {"isEnabled": True}, {"isEnabled": True, "states": []},
            {"isEnabled": True, "states": [{"ptSlabs": "x"}]}, {"isEnabled": True, "states": [None]},
            {"isEnabled": True, "states": [{"stateName": 7, "ptSlabs": MH_SLABS}]}]:
    O("pt", SC, "calculateProfessionalTax", {"ptConfig": cfg, "grossSalary": 15000})
O("pt", SC, "calculateProfessionalTax", {"ptConfig": PT_BASE, "grossSalary": 15000, "employeeState": 5})

# ================================================================== statutory: LWF
LWF_STATES = [
    {"stateName": "Haryana", "deductionCycle": "monthly", "status": "active"},
    {"stateName": "Maharashtra", "employeeShare": 12, "employerShare": 36, "months": ["June", "dec"],
     "minAmount": 0, "maxAmount": 3000},
    {"stateName": "Maharashtra", "employeeShare": 25, "employerShare": 75, "months": ["Jun", "Dec"],
     "minAmount": 3000.01, "maxAmount": ""},
    {"stateName": "Karnataka", "employeeShare": 20, "employerShare": 40, "deductionCycle": "Yearly"},
    {"stateName": "Punjab", "calculationType": "Percentage", "employeeShare": 0.2, "employerShare": 0.4,
     "deductionCycle": "half_yearly", "periodFrom": "april", "periodTo": "October"},
    {"stateName": "Kerala", "employeeShare": 50, "employerShare": 50, "status": "inactive"},
    {"stateName": "Goa", "employeeShare": 60, "employerShare": 180, "isApplicable": False},
    {"stateName": "Delhi", "employeeShare": "0.75", "employerShare": "2.25", "deductionCycle": "half yearly"},
    {"stateName": "Gujarat", "employeeShare": 6, "employerShare": 12, "deductionCycle": "quarterly",
     "minAmount": 100, "maxAmount": None},
]
LWF_BASE = {"isEnabled": True, "deductionCycle": "half-yearly", "states": LWF_STATES}
for state, gross, month in itertools.product(
        ["Haryana", "Maharashtra", "Karnataka", "Punjab", "Kerala", "Goa", "Delhi", "Gujarat", "Bihar"],
        [0, 2000, 3000, 3000.01, 10000, 17500, 17501, 25000, 50000, "20000"],
        ["Jun", "Dec", "Apr", "Oct", None, "september"]):
    O("lwf", SC, "calculateLwf", {"lwfConfig": LWF_BASE, "grossSalary": gross, "month": month,
                                  "employeeState": state})
for info in [None, {"lwfApplicable": False}, {"lwfState": "Haryana"}, {"ptState": "Punjab"},
             {"lwfState": "", "ptState": "Karnataka"}]:
    O("lwf", SC, "calculateLwf", {"lwfConfig": LWF_BASE, "grossSalary": 20000, "month": "Dec",
                                  "employeeState": "Maharashtra", "employeeStatutoryInfo": info})
for cfg in [None, {"isEnabled": False}, {"isEnabled": True, "states": []},
            {"isEnabled": True, "months": ["Mar"], "states": [{"stateName": "X", "employeeShare": 5}]},
            {"isEnabled": True, "deductionCycle": "yearly", "states": [{"employeeShare": 5, "employerShare": 10}]},
            {"isEnabled": True, "deductionCycle": "monthly", "states": [{"employeeShare": 5, "maxAmount": 100}]},
            {"isEnabled": True, "states": [{"stateName": "X", "employeeShare": 5, "deductionCycle": 12}]}]:
    for month in ["Mar", "Dec", "Jan", None]:
        O("lwf", SC, "calculateLwf", {"lwfConfig": cfg, "grossSalary": 15000, "month": month})
for lwf_cfg, state_cfg in itertools.product(
        [None, {}, {"months": ["jan", "July", "xx", "Jan"]}, {"deductionCycle": "yearly"},
         {"deductionCycle": "Monthly"}, {"deductionCycle": "half_yearly"}],
        [None, {}, {"months": []}, {"months": ["Sept", "march"]}, {"deductionCycle": "annual", "periodFrom": "may"},
         {"deductionCycle": "Half Yearly", "periodFrom": "jan"}, {"deductionCycle": "half-yearly"},
         {"deductionCycle": "monthly"}, {"deductionCycle": "yearly"}]):
    P("lwf", SC, "resolveLwfDeductionMonths", lwf_cfg, state_cfg)
P("lwf", SC, "resolveLwfDeductionMonths")
for br, cfg in itertools.product(
        [None, {}, {"details": {"months": ["Jun", "Dec"]}}, {"details": {"months": [], "cycle": "yearly"}},
         {"details": {"cycle": "Half Yearly"}}, {"details": {"cycle": "monthly"}}],
        [None, {"deductionCycle": "annual"}, {"deductionCycle": "quarterly"}]):
    P("lwf", SC, "resolveLwfDeductionsPerYear", br, cfg)

# ================================================================== statutory: net-pay schedule
for gross, base, pt_cycle, state in itertools.product(
        [12000, 30000, "25000", 2500000], [0, 1800, "500"], ["monthly", "half-yearly", "yearly"],
        ["Maharashtra", "Haryana", "Punjab"]):
    O("netpay", SC, "buildNetPaySchedule", {
        "grossSalary": gross, "baseDeductions": base,
        "ptConfig": {**PT_BASE, "deductionCycle": pt_cycle}, "lwfConfig": LWF_BASE,
        "employeeState": state})
O("netpay", SC, "buildNetPaySchedule", {})
O("netpay", SC, "buildNetPaySchedule", {"grossSalary": 1000000, "baseDeductions": 0,
                                        "ptConfig": {"isEnabled": True, "deductionCycle": "yearly",
                                                     "states": [{"stateName": "X", "ptSlabs": [
                                                         {"salaryRangeFrom": 0, "salaryRangeTo": 1e12,
                                                          "taxAmount": 125000}]}]},
                                        "employeeState": "X"})

# ================================================================== statutory: bonus
BONUS_STATES = [
    {"stateName": "Maharashtra", "formulaBase": "minimumWage", "minWage": 9000,
     "wageCategories": [
         {"employmentCategory": "Skilled", "minWage": 12000, "effectiveFrom": "2024-04"},
         {"employmentCategory": "skilled", "minWage": 13000, "effectiveFrom": "2025-10-01"},
         {"employmentCategory": "semi skilled", "minWage": 10000, "effectiveFrom": "2025/4"},
         {"employmentCategory": "unskilled", "minWage": 0},
     ]},
    {"stateName": "Gujarat", "formulaBase": "basicAndDA"},
    {"stateName": "Delhi", "formulaBase": "BasicAndDAStorage", "minWage": 18000},
    {"stateName": "Goa", "formulaBase": "other"},
    {"stateName": "Kerala", "minWage": 0, "employmentCategories": [{"employmentCategory": "unskilled",
                                                                     "minWage": 6500}]},
]
BONUS_BASE = {"isEnabled": True, "paymentCycle": "yearly", "paymentMonth": "October",
              "percentage": 8.33, "states": BONUS_STATES}
for state, cat, month, year in itertools.product(
        ["Maharashtra", "Gujarat", "Delhi", "Goa", "Kerala", "Bihar", None],
        ["skilled", "Semi-Skilled", "unskilled", None, "manager"],
        ["Oct", "Nov", None], [2025, None]):
    O("bonus", SC, "calculateStatutoryBonus", {"bonusConfig": BONUS_BASE, "basicPlusDA": 15000,
                                               "employeeState": state, "employeeEmploymentCategory": cat,
                                               "month": month, "year": year})
for cfg_extra, basic, worked in itertools.product(
        [{}, {"paymentCycle": "monthly"}, {"paymentCycle": "Half Yearly", "paymentMonth": "mar"},
         {"eligibilityCeiling": 25000, "percentage": "20", "minimumBonusWage": 8000},
         {"paymentMonth": "Foo"}, {"minWorkingDays": 60}],
        [0, 6999, 7000, 21000, 21001, "21000", None, 30000],
        [None, 29, 30, "45", "abc"]):
    O("bonus", SC, "calculateStatutoryBonus", {"bonusConfig": {**BONUS_BASE, **cfg_extra, "states": []},
                                               "basicPlusDA": basic, "month": "Oct", "year": 2025,
                                               "accountingYearWorkedDays": worked})
for cfg in [None, {"isEnabled": False}, {"isEnabled": True}]:
    O("bonus", SC, "calculateStatutoryBonus", {"bonusConfig": cfg, "basicPlusDA": 10000})
for v in ["skilled", "Semi Skilled", "semi_skilled", "SEMI-SKILLED", " unskilled ", "", None, 0, "high"]:
    P("bonus", SC, "normalizeEmploymentCategory", v)
for st, cat, y, m in itertools.product(BONUS_STATES[:1] + BONUS_STATES[4:] + [None, {"minWage": "8000"}],
                                       ["skilled", "semiSkilled", "unskilled"],
                                       [2025, 2024, None, "2025"], ["Sep", "Oct", "Apr", None]):
    P("bonus", SC, "resolveBonusMinWage", st, cat, y, m)

# ================================================================== salary component helper
SH = salary_component_helper


def org_components(basic):
    return [
        {"category": "earnings", "components": [
            basic,
            {"_id": "h1", "name": "HRA", "code": "HRA", "calculationType": "percentage",
             "basedOn": "basic", "value": 40, "status": "active", "considerForEPF": False},
            {"_id": "c1", "name": "Conveyance", "code": "CONV", "calculationType": "fixed",
             "value": 1800, "maxLimit": 1600, "status": "active", "considerForESI": True},
            {"_id": "s1", "name": "Statutory Bonus", "calculationType": "percentage", "basedOn": "gross",
             "value": 8.33, "status": "active", "taxable": False},
            {"_id": "y1", "name": "Annual Bonus", "calculationType": "fixed", "value": 12000,
             "frequency": "yearly", "paymentMonth": "October", "status": "active"},
            {"_id": "o1", "name": "Joining Bonus", "calculationType": "fixed", "value": 5000,
             "frequency": "one-time", "status": "active"},
            {"name": "Old Allowance", "calculationType": "fixed", "value": 999, "status": "inactive"},
            {"name": "CTC Share", "calculationType": "percentage", "basedOn": "ctc", "value": 1,
             "status": "active"},
        ]},
        {"category": "deductions", "components": [
            {"_id": "d1", "name": "Canteen", "calculationType": "fixed", "value": 500, "status": "active"},
            {"name": "Club", "calculationType": "percentage", "basedOn": "gross", "value": 1,
             "status": "active", "frequency": "Annual"},
        ]},
        {"category": "benefits", "components": [
            {"_id": "bn1", "name": "Medical Insurance", "calculationType": "fixed", "value": 800,
             "status": "active", "calculateOnProRata": True},
        ]},
        {"category": "reimbursements", "components": [
            {"name": "Fuel", "calculationType": "variable", "value": 2000, "status": "active"},
        ]},
    ]


BASICS = {
    "pct_gross": {"_id": "b1", "name": "Basic Salary", "code": "BASIC", "calculationType": "percentage",
                  "basedOn": "gross", "value": 50, "status": "active"},
    "fixed": {"_id": "b2", "name": "Basic", "calculationType": "fixed", "value": 15000, "status": "active"},
    "pct_ctc": {"_id": "b3", "name": "basic pay", "code": "bs", "calculationType": "percentage",
                "basedOn": "ctc", "value": 40, "status": "active"},
    "pct_basic": {"_id": "b4", "name": "Base Salary", "calculationType": "percentage", "basedOn": "basic",
                  "value": 100, "status": "active"},
    "inactive": {"_id": "b5", "name": "Basic Salary", "calculationType": "fixed", "value": 1,
                 "status": "inactive"},
}
COMPONENT_SETS = {k: org_components(v) for k, v in BASICS.items()}
COMPONENT_SETS["empty"] = []
COMPONENT_SETS["only_basic"] = [{"category": "earnings", "components": [BASICS["pct_gross"]]}]

OVERRIDE_SETS = [
    [],
    [{"category": "earnings", "name": "HRA", "overrideAmount": 5000}],
    [{"category": "Earnings", "componentName": "Conveyance", "amount": ""},
     {"category": "deductions", "code": "Canteen", "disabled": True}],
    [{"category": "earnings", "name": "Special Allowance", "overrideAmount": 100},
     {"category": "earnings", "code": "BASIC", "overrideAmount": "12000"}],
    [{"category": "foo", "name": "HRA", "overrideAmount": 1},
     {"category": "earnings", "name": "HRA", "value": "abc"}],
    [{"category": "earnings", "name": "Basic Salary", "overrideAmount": 9000},
     {"category": "earnings", "name": "Statutory Bonus", "disabled": True},
     {"category": "benefits", "name": "Medical Insurance", "input": -50}],
    [{"category": "earnings", "code": "hra", "overrideAmount": None, "amount": 0},
     {"category": "earnings", "name": "CTC Share", "_doc": {"overrideAmount": 77}}],
    None,
]

for key in ["", None, "  Basic   Salary ", "HRA", 5, "\tDA\n"]:
    P("sch", SH, "normalizeComponentKey", key)
COMP_SAMPLES = [{"name": "Basic"}, {"code": "BS"}, {"name": "basic  pay"}, {"name": "Basic-pay"},
                {"code": "baseSalary"}, {"name": "DA"}, {"code": "Dearness Allowance"}, {"name": "HRA"}, {},
                {"name": "Base Salary", "code": "x"}, {"name": None, "code": "da"}]
for c in COMP_SAMPLES:
    P("sch", SH, "isBasicSalaryComponent", c)
    P("sch", SH, "isDaComponent", c)
    P("sch", SH, "isBasicPlusDaComponent", c)
P("sch", SH, "isBasicSalaryComponent")
P("sch", SH, "isBasicSalaryComponent", None)
for lines in [[{"name": "Basic", "amount": 10000}, {"name": "DA", "calculatedAmount": "2000"},
               {"name": "HRA", "amount": 4000}, {"code": "da", "amount": None, "calculatedAmount": 50}],
              [], None, "x", [None]]:
    P("sch", SH, "sumBasicPlusDA", lines)
for ov in OVERRIDE_SETS:
    P("sch", SH, "stripBasicFromOverrides", ov)
    P("sch", SH, "normalizeOverrides", ov)
    P("sch", SH, "toStoredOverrides", ov)
for amt, comps in itertools.product([12000.6, "15000", 0, -5, None, "abc"], ["pct_gross", "empty"]):
    P("sch", SH, "buildBasicSalaryOverride", amt, COMPONENT_SETS[comps])
for ov, amt in itertools.product(OVERRIDE_SETS[:6], [None, 14000, "abc"]):
    P("sch", SH, "withExplicitBasicOverride", ov, amt, COMPONENT_SETS["pct_ctc"])
for name, comps in COMPONENT_SETS.items():
    P("sch", SH, "getActiveEarningsComponents", comps)
P("sch", SH, "getActiveEarningsComponents", [None])
P("sch", SH, "getActiveEarningsComponents", [{"category": "earnings", "components": "x"}])
for f in [None, "Monthly", "recurring", "ONE_TIME", "onetime", "Annual", "yearly", " weekly ", 0]:
    P("sch", SH, "normalizeComponentFrequency", f)
for m in ["October", "oct", " Sep ", "Sept", "may", None, "", 10]:
    P("sch", SH, "normalizeComponentPaymentMonth", m)
FREQ_COMPS = [{"frequency": "yearly", "paymentMonth": "October"}, {"frequency": "yearly"},
              {"frequency": "one-time", "paymentMonth": "mar"}, {"frequency": "one-time"},
              {}, {"frequency": "weekly"}, {"frequency": "yearly", "paymentMonth": "Foo"},
              {"_id": "o1", "name": "Joining Bonus", "frequency": "one_time"}]
for c, pm in itertools.product(FREQ_COMPS, ["Oct", "october", "Apr", "Mar", None, "Foo"]):
    P("sch", SH, "resolveComponentPaymentMonth", c)
    P("sch", SH, "isComponentPaymentMonthDue", c, pm)
    P("sch", SH, "isYearlyComponentDue", c, pm)
    P("sch", SH, "getFrequencyDisplayAmounts", c, 1234.5, pm)
    P("sch", SH, "shouldIncludeSalaryComponent", c, "earnings", pm,
      {"$set": ["earnings:id:o1", "earnings:name:old"]})
    P("sch", SH, "shouldIncludeSalaryComponent", c, "earnings", pm, {"$set": []})
for c in FREQ_COMPS:
    P("sch", SH, "shouldCountTowardMonthlyTotals", c)
    P("sch", SH, "sanitizeSalaryComponent", {**c, "name": "Basic", "considerForEPF": False})
    P("sch", SH, "sanitizeSalaryComponent", c)
    P("sch", SH, "getFrequencyDisplayAmounts", c, -10)
    P("sch", SH, "getFrequencyDisplayAmounts", c, "99.5")
for cat, comp, keys in itertools.product(["earnings", "deductions"],
                                         [{"_id": "o1"}, {"name": " Joining  Bonus"}, {"_id": "zz", "name": "x"},
                                          {}, {"_id": 0, "name": "Joining Bonus"}],
                                         [{"$set": ["earnings:id:o1", "earnings:name:joining bonus"]},
                                          {"$set": []}, None]):
    P("sch", SH, "getComponentTrackingKey", cat, comp)
    P("sch", SH, "hasComponentBeenPaid", cat, comp, keys)
RUNS = [[{"earnings": [{"componentId": "o1", "componentName": "Joining Bonus"},
                       {"componentName": "  HRA "}, None],
          "deductions": [{"componentId": 5}], "benefits": "abc", "reimbursements": [{"componentId": "r"}]},
         None, {}],
        [], "xy", [{"earnings": {"a": 1}}], [{"earnings": 5}]]
for runs in RUNS:
    P("sch", SH, "collectPaidComponentKeysFromPayrollRuns", runs)
for item in [{"overrideAmount": 5}, {"amount": "  "}, {"amount": " 12 ", "value": 3}, {"value": "abc"},
             {"input": None, "value": 0}, {}, None, "abc", {"_doc": {"amount": 9}}, {"overrideAmount": []},
             {"overrideAmount": [7]}, {"overrideAmount": True}, {"overrideAmount": "1e3"},
             {"_doc": "zz", "amount": 4}]:
    P("sch", SH, "readOverrideAmountFromItem", item)
for ov in [None, {}, {"disabled": True, "overrideAmount": 5}, {"overrideAmount": 5},
           {"overrideAmount": "5"}, {"hasExplicitOverride": False, "overrideAmount": 5},
           {"hasExplicitOverride": True, "overrideAmount": None}, {"overrideAmount": 0}, "x"]:
    P("sch", SH, "hasExplicitOverrideAmount", ov)
    P("sch", SH, "shouldIncludeComponentInBreakdown", 0, ov)
for ov, comp in itertools.product(OVERRIDE_SETS, [{"name": "HRA", "code": "HRA"}, {"code": "basic"},
                                                  {"name": "Canteen"}, {"name": "hra"}, {}]):
    P("sch", SH, "findComponentOverride", ov, "earnings", comp)
    P("sch", SH, "findComponentOverride", ov, "deductions", comp)
CALC_COMPS = [{"calculationType": "fixed", "value": 1500}, {"calculationType": "variable", "value": "800"},
              {"calculationType": "percentage", "basedOn": "basic", "value": 40},
              {"calculationType": "percentage", "basedOn": "gross", "value": 8.33, "maxLimit": 1000},
              {"calculationType": "percentage", "basedOn": "ctc", "value": 2.5},
              {"calculationType": "percentage", "basedOn": "none", "value": 5},
              {"calculationType": "formula", "value": 5}, {"value": -300}, {}]
CALC_BASES = [{"baseSalary": 15000, "grossSalary": 30000, "ctc": 400000},
              {"baseSalary": "abc", "grossSalary": None}, {}]
CALC_OVERRIDES = [None, {"disabled": True}, {"overrideAmount": 2500, "hasExplicitOverride": True},
                  {"overrideAmount": -40}, {"overrideAmount": None, "hasExplicitOverride": True}]
for comp, bases, ov in itertools.product(CALC_COMPS, CALC_BASES, CALC_OVERRIDES):
    P("sch", SH, "calculateComponentAmount", comp, bases, ov)
for comp, ovs, pm in itertools.product(COMPONENT_SETS["pct_gross"][0]["components"][1:] + CALC_COMPS[:3],
                                       OVERRIDE_SETS[:4], [None, "Oct", "Apr"]):
    P("sch", SH, "buildComponentLine", "earnings", comp, CALC_BASES[0], ovs, pm)
for bc, rb, bases, ovs, pm in itertools.product(
        [None, BASICS["pct_gross"], BASICS["fixed"], {"name": "Basic", "frequency": "yearly"}],
        [15000, 15000.5, "abc", -5], [{"grossSalary": 30000}, {}], OVERRIDE_SETS[:4] + OVERRIDE_SETS[5:6],
        [None, "Apr"]):
    P("sch", SH, "buildBasicEarningsLine", bc, rb, bases, ovs, pm)
for comps, ovs, pm, mode in itertools.product(["pct_gross", "fixed", "pct_ctc", "pct_basic", "inactive",
                                               "empty", "only_basic"],
                                              OVERRIDE_SETS, [None, "Oct", "Apr"],
                                              [("basic", None, 15000), ("gross", 40000, 20000),
                                               ("gross", 25000, 25000), ("gross", 10000, 12000.4)]):
    O("sch", SH, "buildPayrollEarningsBreakdown", {
        "salaryComponents": COMPONENT_SETS[comps], "resolvedBase": mode[2], "overrides": ovs,
        "payrollMonth": pm, "inputMode": mode[0], "targetGross": mode[1]})
O("sch", SH, "buildPayrollEarningsBreakdown", {"salaryComponents": COMPONENT_SETS["fixed"],
                                               "resolvedBase": 15000, "inputMode": "gross"})
O("sch", SH, "buildPayrollEarningsBreakdown", {"salaryComponents": COMPONENT_SETS["fixed"],
                                               "resolvedBase": "15000", "inputMode": "gross",
                                               "targetGross": "30000"})
for comps, bases, ovs, pm in itertools.product(
        ["pct_gross", "fixed", "pct_ctc", "inactive", "empty"],
        [{"baseSalary": 15000, "grossSalary": 30000, "ctc": 420000}, {"baseSalary": 15000},
         {"baseSalary": 0, "grossSalary": 25000}, {}],
        OVERRIDE_SETS[:3] + OVERRIDE_SETS[5:6], [None, "Oct"]):
    P("sch", SH, "buildSalaryStructurePreview", COMPONENT_SETS[comps], bases, ovs, pm)
for comps, basic, ovs, pm in itertools.product(["pct_gross", "pct_basic", "fixed", "empty"],
                                               [0, 15000, "12000", -1], OVERRIDE_SETS[:4], [None, "Oct"]):
    P("sch", SH, "computeMonthlyGrossFromBasic", basic, COMPONENT_SETS[comps], ovs, pm)
    P("sch", SH, "resolvePayrollComponentAmount", "earnings",
      COMPONENT_SETS["pct_gross"][0]["components"][1], {"baseSalary": basic, "grossSalary": 30000}, ovs)
for comps, target, ovs in itertools.product(["pct_gross", "pct_basic", "fixed", "pct_ctc", "empty",
                                             "only_basic"],
                                            [0, 1, 21000, 33333, "45000", 100000.5], OVERRIDE_SETS[:4]):
    P("sch", SH, "deriveBasicFromTargetGross", target, COMPONENT_SETS[comps], ovs, None)
    active_basic = next((c for c in (COMPONENT_SETS[comps][0]["components"] if COMPONENT_SETS[comps] else [])
                         if c.get("status") == "active" and "as" in c.get("name", "").lower()), None)
    O("sch", SH, "resolveBasicAmountFromGross", {"targetGross": target, "basicComponent": active_basic,
                                                 "salaryComponents": COMPONENT_SETS[comps],
                                                 "overrides": ovs})
for comps, base, gross, ovs, pm in itertools.product(
        ["pct_gross", "pct_basic", "fixed", "pct_ctc", "empty"], [0, 15000, "abc"],
        [0, 30000, "45000.6", None], OVERRIDE_SETS, [None, "Oct"]):
    O("sch", SH, "resolveSalaryBasesFromInput", {"baseSalary": base, "grossSalary": gross,
                                                 "salaryComponents": COMPONENT_SETS[comps],
                                                 "overrides": ovs, "payrollMonth": pm})
for amt in [0, 0.4, -0.4, 1234.5, -1234.5, "77", None, "abc"]:
    P("sch", SH, "buildBalancingAllowanceLine", amt)
for saved, incoming in itertools.product(OVERRIDE_SETS, OVERRIDE_SETS):
    P("sch", SH, "mergeComponentOverrides", saved, incoming)
REV_EMP = [None, [{"category": "earnings", "name": "HRA", "overrideAmount": 5000}],
           [{"category": "deductions", "name": "Canteen", "overrideAmount": 100}]]
REV_IN = [None, [], [{"category": "earnings", "name": "HRA", "overrideAmount": None},
                     {"category": "deductions", "name": "Canteen", "overrideAmount": 0}],
          [{"category": "earnings", "name": "HRA", "overrideAmount": 6000}],
          [{"category": "earnings", "name": "HRA"}], "x"]
for emp, body, new in itertools.product(REV_EMP, REV_IN, REV_IN[:4]):
    O("sch", SH, "resolveRevisionComponentOverrides", {"bodyOverrides": body, "newSalaryOverrides": new,
                                                       "employeeOverrides": emp})
O("sch", SH, "resolveRevisionComponentOverrides", {})
for c in [{"name": "Basic", "considerForEPF": False}, {"componentName": "basic salary"},
          {"name": "HRA", "taxable": False, "considerForESI": 1}, {}, {"name": "", "componentName": "BS"}]:
    P("sch", SH, "getComplianceFlags", c)
APC_COMPS = COMPONENT_SETS["pct_gross"][0]["components"] + COMPONENT_SETS["pct_gross"][2]["components"] + [
    {"name": "Zero", "calculationType": "fixed", "value": 0, "status": "active"},
    {"name": "Bonus2", "calculationType": "fixed", "value": 100, "status": "active", "frequency": "one-time",
     "paymentMonth": "Apr"}]
for cat, comp, ovs, pm, keys in itertools.product(
        ["earnings", "benefits"], APC_COMPS, OVERRIDE_SETS[:2] + OVERRIDE_SETS[5:6], ["Oct", "Apr"],
        [{"$set": ["earnings:name:bonus2"]}, {"$undefined": True}]):
    CASES.setdefault("sch", []).append(Case(SH, "addPayrollComponentLine",
                                            [[], cat, comp, {"baseSalary": 15000, "grossSalary": 30000,
                                                             "ctc": 360000}, ovs, pm, keys],
                                            mutated=[0]))
for c in ["COMPONENT_CATEGORIES", "PAYROLL_MONTHS_SHORT"]:
    P("sch", SH, c)

# ================================================================== payslip attendance / display
PA = payslip_attendance
for m, y in itertools.product(["Feb", "february", " DEC ", "Sept", "", None, 2], [2024, 2023, "2025", 0, None,
                                                                                   "abc", 2024.5]):
    P("pa", PA, "getMonthDateStrings", m, y)
    P("pa", PA, "getCalendarDaysInMonth", m, y)
PAYROLLS = [{}, {"presentDays": 28, "workingDays": 26, "lopDays": 2}, {"presentDays": None, "lopDays": 3},
            {"presentDays": "abc", "lopDays": 3, "workingDays": 30}, {"presentDays": -2, "lopDays": -1},
            {"month": "Feb", "year": 2024, "lopDays": "1.5"}, {"workingDays": 22, "lopDays": 2},
            {"presentDays": "", "workingDays": "26"}]
for pr, m, y in itertools.product(PAYROLLS, ["Feb", None, "Foo"], [2024, None]):
    P("pa", PA, "resolvePayslipPaidDays", pr, m, y)
    P("pa", PA, "getPayslipAttendanceDays", "org", "emp", m, y, pr)
P("pa", PA, "resolvePayslipPaidDays")
ED = employee_display
for emp, fb in itertools.product(
        [{"customId": " C-1 ", "uniqueId": "U1", "payrollInfo": {"employeeCode": "E1"}},
         {"customId": "", "uniqueId": "U1"}, {"payrollInfo": {"employeeCode": 1001}}, {"customId": "   "},
         {}, None, {"customId": 0, "uniqueId": 0}],
        ["", "N/A"]):
    P("pa", ED, "resolveEmployeeDisplayCode", emp, fb)
P("pa", ED, "resolveEmployeeDisplayCode")
P("pa", ED, "EMPLOYEE_DISPLAY_CODE_FIELDS")
EI = employee_implementation_date
for sef in ["2025-06-15", "2025-06-15T00:00:00.000Z", "2025-06-14T18:30:00.000Z", None, "", "bad"]:
    O("pa", EI, "resolveEmployeeImplementationDate", {"employee": {"payrollInfo": {"salaryEffectiveFrom": sef}}})
O("pa", EI, "resolveEmployeeImplementationDate", {})


# ------------------------------------------------------------------ test classes


@unittest.skipUnless(node_available(), SKIP_REASON)
class LegacyParityTests(SimpleTestCase):
    """Each test runs one group of cases (all JS calls of the group in one Node run)."""

    def _check_group(self, group):
        cases = CASES[group]
        js_results = run_js_batch([c.js_call() for c in cases])
        self.assertEqual(len(js_results), len(cases))
        failures = []
        for case, js in zip(cases, js_results):
            py = run_py(case)
            if is_error(js) or is_error(py):
                if not (is_error(js) and is_error(py)):
                    failures.append(f"{case.label()}\n    JS: {js}\n    PY: {py}")
                continue
            d = diff(js, py)
            if not d:
                # Byte-level check: same JSON text (int vs float rendering, key order).
                a_txt = json.dumps(js, ensure_ascii=False, separators=(",", ":"))
                b_txt = json.dumps(py, ensure_ascii=False, separators=(",", ":"))
                if a_txt != b_txt:
                    d = f"JSON text differs:\n    JS: {a_txt[:300]}\n    PY: {b_txt[:300]}"
            if d:
                failures.append(f"{case.label()}\n    {d}")
        LegacyParityTests.total_cases += len(cases)
        self.assertFalse(failures, f"{len(failures)}/{len(cases)} parity failures in {group}:\n"
                         + "\n".join(failures[:25]))

    total_cases = 0

    def test_financial_year(self):
        self._check_group("fy")

    def test_epf(self):
        self._check_group("epf")

    def test_esi(self):
        self._check_group("esi")

    def test_professional_tax(self):
        self._check_group("pt")

    def test_lwf(self):
        self._check_group("lwf")

    def test_net_pay_schedule(self):
        self._check_group("netpay")

    def test_statutory_bonus(self):
        self._check_group("bonus")

    def test_salary_component_helper(self):
        self._check_group("sch")

    def test_payslip_attendance_display_implementation(self):
        self._check_group("pa")


class KnownValueTests(SimpleTestCase):
    """Hand-checked anchors that run without Node (statutory rules of thumb)."""

    def test_epf_ceiling_and_charges(self):
        cfg = {"isEnabled": True, "contributionPreferences": {"edliContribution": True, "adminCharges": True}}
        r = statutory_calculator.calculate_epf(epf_config=cfg, base_salary=15000)
        self.assertEqual((r["epfWage"], r["employeeContribution"], r["employerContribution"],
                          r["edliContribution"], r["adminCharges"], r["totalEmployerCost"]),
                         (15000, 1800, 1800, 75, 75, 1950))
        r = statutory_calculator.calculate_epf(epf_config={**cfg, "eligibleForAbryScheme": True},
                                               base_salary=40000)
        self.assertEqual((r["epfWage"], r["employerContribution"], r["totalEmployerCost"]), (15000, 0, 0))
        r = statutory_calculator.calculate_epf(
            epf_config=cfg, base_salary=40000,
            employee_statutory_info={"epfOverride": {"enabled": True, "applyCeiling": False}})
        self.assertEqual(r["epfWage"], 40000)

    def test_esi_wage_limit(self):
        cfg = {"isEnabled": True}
        self.assertTrue(statutory_calculator.calculate_esi(esi_config=cfg, gross_salary=21000)["applicable"])
        self.assertFalse(statutory_calculator.calculate_esi(esi_config=cfg, gross_salary=21001)["applicable"])
        r = statutory_calculator.calculate_esi(esi_config=cfg, gross_salary=20000)
        self.assertEqual((r["employeeContribution"], r["employerContribution"]), (150, 650))

    def test_financial_year_parsing(self):
        self.assertEqual(financial_year.normalize_financial_year_storage("FY2025-26"), "2025-2026")
        self.assertEqual(financial_year.get_financial_year_start_from_payroll("Mar", 2026), 2025)
        self.assertEqual(financial_year.to_calendar_date("2025-03-31T18:30:00.000Z"), date(2025, 3, 31))
        self.assertEqual(financial_year.to_calendar_date(1743445800000), date(2025, 4, 1))
        self.assertEqual(iso_local_midnight(date(2025, 4, 1)), "2025-03-31T18:30:00.000Z")


# ------------------------------------------------------------------ DB-backed helpers


class LoadPaidComponentKeysTests(TestCase):
    def setUp(self):
        from payroll_engine.models import PayrollEmployee, PayrollRun

        from .fixtures import make_org_world

        world = make_org_world()
        self.org = world["contractor"]
        self.emp = PayrollEmployee.objects.create(org=self.org, worker=world["workers"][0])
        self.run1 = PayrollRun.objects.create(
            org=self.org, employee=self.emp, month="Apr", year=2025,
            earnings=[{"componentId": "o1", "componentName": "Joining Bonus", "amount": 5000}],
            deductions=[{"componentName": " Canteen  Fee "}], benefits=[])
        self.run2 = PayrollRun.objects.create(
            org=self.org, employee=self.emp, month="May", year=2025,
            earnings=[{"componentName": "HRA"}], benefits=[{"componentId": "bn1"}])

    def test_collects_keys_from_runs(self):
        keys = salary_component_helper.load_paid_component_keys_for_employee(self.org, self.emp.id)
        self.assertEqual(keys, {"earnings:id:o1", "earnings:name:joining bonus",
                                "deductions:name:canteen fee", "earnings:name:hra", "benefits:id:bn1"})

    def test_excludes_payroll_and_guards(self):
        keys = salary_component_helper.load_paid_component_keys_for_employee(
            self.org.id, self.emp, exclude_payroll_id=self.run1.id)
        self.assertEqual(keys, {"earnings:name:hra", "benefits:id:bn1"})
        self.assertEqual(salary_component_helper.load_paid_component_keys_for_employee(None, self.emp.id),
                         set())
        self.assertEqual(salary_component_helper.load_paid_component_keys_for_employee(self.org.id, ""),
                         set())

    def test_one_time_component_skipped_after_payment(self):
        keys = salary_component_helper.load_paid_component_keys_for_employee(self.org.id, self.emp.id)
        comp = {"_id": "o1", "name": "Joining Bonus", "frequency": "one-time", "paymentMonth": "Apr",
                "status": "active", "calculationType": "fixed", "value": 5000}
        lines = []
        amount = salary_component_helper.add_payroll_component_line(
            lines, "earnings", comp, {"baseSalary": 1}, [], "Apr", keys)
        self.assertEqual((amount, lines), (0, []))


class ResolveEmployeeImplementationDateTests(TestCase):
    def setUp(self):
        from payroll_engine.models import PayrollEmployee

        from .fixtures import make_org_world

        world = make_org_world()
        self.org = world["contractor"]
        self.emp = PayrollEmployee.objects.create(org=self.org, worker=world["workers"][0])

    def _revision(self, when):
        from payroll_engine.models import SalaryRevision

        SalaryRevision.objects.create(org=self.org, employee=self.emp, revision_type="Increment",
                                      effective_from=when)

    def test_earliest_of_employee_and_revisions(self):
        resolve = employee_implementation_date.resolve_employee_implementation_date
        emp = self.emp.to_dict()
        self.assertIsNone(resolve(employee=emp, organization_id=self.org.id))
        self._revision(datetime(2025, 7, 1, tzinfo=timezone.utc))
        self._revision(datetime(2025, 5, 31, 18, 30, tzinfo=timezone.utc))  # IST midnight 1 Jun
        self._revision(None)
        self.assertEqual(resolve(employee=emp, organization_id=self.org.id), date(2025, 6, 1))
        emp["payrollInfo"]["salaryEffectiveFrom"] = "2025-04-15"
        self.assertEqual(resolve(employee=emp, organization_id=self.org.id), date(2025, 4, 15))
        emp["payrollInfo"]["salaryEffectiveFrom"] = "2025-09-01"
        self.assertEqual(resolve(employee=emp, organization_id=self.org.id), date(2025, 6, 1))
        # No org -> revisions are not consulted (legacy guard).
        self.assertEqual(resolve(employee=emp), date(2025, 9, 1))
