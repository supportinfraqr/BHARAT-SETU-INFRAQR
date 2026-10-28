"""Pay-run engine tests: API tests for every payrollRun / payrollSchedule route, the
auto-payroll command, and differential tests against the legacy JS engine.

The golden test configures compliance (EPF/ESI/PT Gujarat/LWF/bonus) and salary
components, seeds a month of BSS attendance / leave / holidays with LOP, processes payroll
through the API and checks every stored amount against the *legacy*
``calculateEmployeeSalaryImproved`` run in Node (``tests/js/payroll_run_harness.js`` loads
payrollRun.js with mock Mongoose models fed with the same BSS rows).
"""

import importlib.util
import io
import json
import os
import subprocess
import unittest
from datetime import date, datetime, timedelta

from django.core.management import call_command
from django.test import TestCase

from bss_core.models import Attendance, LeaveRequest, LeaveType, SiteHoliday
from payroll_engine import bss_adapter
from payroll_engine.models import (Arrears, AutoPayrollRegistry, ClaimsDeclaration, EmployeeTDS,
                                   PayrollAuditLog, PayrollEmployee, PayrollRun, PayrollSchedule,
                                   SalaryCompensation, StatutoryCompliance)
from payroll_engine.models.salary_compensation import new_component
from payroll_engine.services import auto_payroll_runner as apr
from payroll_engine.services import payroll_calc as pc
from payroll_engine.services import salary_slip_pdf as slip
from payroll_engine.services.financial_year import LOCAL_TZ
from payroll_engine.views import payroll_schedule as ps

from .fixtures import BASE, client_for, make_org_world
from .legacy_js import LEGACY_DIR, SKIP_REASON, _node_path, node_available

HARNESS = os.path.join(os.path.dirname(__file__), "js", "payroll_run_harness.js")


def run_harness(calls):
    env = dict(os.environ, TZ="Asia/Kolkata")
    proc = subprocess.run([_node_path(), HARNESS, LEGACY_DIR], input=json.dumps(calls, default=str),
                          capture_output=True, text=True, env=env, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-3000:])
    out = json.loads(proc.stdout)
    for r in out:
        if isinstance(r, dict) and "$error" in r:
            raise RuntimeError(r["$error"])
    return out


def js(fn, *args, mutated=None):
    call = {"fn": fn, "args": list(args)}
    if mutated:
        call["mutated"] = mutated
    return run_harness([call])[0]


def norm(value):
    """JSON round-trip (ints/floats compare equal; drops Python-only types)."""
    return json.loads(json.dumps(value, default=str))


def assert_same(tc, a, b, path="$"):
    if isinstance(a, dict) and isinstance(b, dict):
        tc.assertEqual(sorted(a), sorted(b), f"{path}: keys differ")
        for k in a:
            assert_same(tc, a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list) and isinstance(b, list):
        tc.assertEqual(len(a), len(b), f"{path}: length {a} vs {b}")
        for i, (x, y) in enumerate(zip(a, b)):
            assert_same(tc, x, y, f"{path}[{i}]")
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) \
            and not isinstance(a, bool) and not isinstance(b, bool):
        tc.assertAlmostEqual(a, b, places=6, msg=path)
    else:
        tc.assertEqual(a, b, path)


GUJARAT_COMPLIANCE = {
    "epf": {"isEnabled": True, "employeeContributionRate": 12, "employerContributionRate": 12,
            "restrictedPfWage": 15000,
            "contributionPreferences": {"employerPfContribution": True, "edliContribution": True,
                                        "adminCharges": True}},
    "esi": {"isEnabled": True, "employeeContributionRate": 0.75, "employerContributionRate": 3.25,
            "wageLimit": 21000, "includeEmployerInSalaryStructure": True},
    "professionalTax": {"isEnabled": True, "deductionCycle": "monthly", "states": [
        {"stateName": "Gujarat", "ptNumber": "PTGJ001", "isApplicable": True, "ptSlabs": [
            {"salaryRangeFrom": 0, "salaryRangeTo": 11999, "taxAmount": 0},
            {"salaryRangeFrom": 12000, "salaryRangeTo": 99999999, "taxAmount": 200}]}]},
    "labourWelfareFund": {"isEnabled": True, "deductionCycle": "half-yearly", "states": [
        {"stateName": "Gujarat", "deductionCycle": "half-yearly", "months": ["Jun", "Dec"],
         "calculationType": "fixed", "employeeShare": 6, "employerShare": 12,
         "isApplicable": True, "status": "active"}]},
    "statutoryBonus": {"isEnabled": True, "paymentCycle": "monthly", "paymentMonth": "October",
                       "percentage": 8.33, "minimumBonusWage": 7000, "eligibilityCeiling": 21000,
                       "states": []},
}


class PayrollWorld(TestCase):
    MONTH, YEAR = "Dec", 2025

    def setUp(self):
        self.w = make_org_world(n_workers=2, suffix="7")
        self.org = self.w["contractor"]
        self.hr = client_for(self.org)
        self.worker_client = client_for(self.w["workers"][0])
        bss_adapter.sync_employees(self.org, force=True)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("unique_id"))

    # ---- seeding helpers
    def configure(self, gross=(18000, 30000)):
        StatutoryCompliance.objects.create(org=self.org, **{
            "epf": GUJARAT_COMPLIANCE["epf"], "esi": GUJARAT_COMPLIANCE["esi"],
            "professional_tax": GUJARAT_COMPLIANCE["professionalTax"],
            "labour_welfare_fund": GUJARAT_COMPLIANCE["labourWelfareFund"],
            "statutory_bonus": GUJARAT_COMPLIANCE["statutoryBonus"]})
        SalaryCompensation.objects.create(org=self.org, category="earnings", components=[
            new_component(name="Basic Salary", code="BASIC", calculationType="percentage",
                          value=50, basedOn="gross", considerForEPF=True, considerForESI=True),
            new_component(name="HRA", code="HRA", calculationType="percentage", value=40,
                          basedOn="basic", considerForESI=True),
            new_component(name="Conveyance", code="CONV", calculationType="fixed", value=1600,
                          considerForESI=True),
        ])
        SalaryCompensation.objects.create(org=self.org, category="deductions", components=[
            new_component(name="Canteen", code="CANTEEN", calculationType="fixed", value=150)])
        SalaryCompensation.objects.create(org=self.org, category="benefits", components=[
            new_component(name="Medical Insurance", code="MED", calculationType="fixed",
                          value=500, calculateOnProRata=True),
            new_component(name="Uniform", code="UNI", calculationType="fixed", value=300)])
        for emp, g in zip(self.emps, gross):
            emp.payroll_info = {**emp.payroll_info, "baseSalary": g / 2, "grossSalary": g,
                                "ctc": g * 12}
            emp.statutory_info = {**emp.statutory_info, "ptApplicable": True}
            emp.save()

    def seed_month(self, emp, year, month, absent=(), half=(), skip_sunday=True, leave_days=()):
        worker = emp.worker
        first = date(year, month, 1)
        d = first
        while d.month == month:
            if not (skip_sunday and d.weekday() == 6) and d.day not in leave_days:
                status = "ABSENT" if d.day in absent else "HALF_DAY" if d.day in half else "PRESENT"
                Attendance.objects.create(worker=worker, site=self.w["site"], contractor=self.org,
                                          attendance_date=d, status=status,
                                          capture_method="SHEET")
            d += timedelta(days=1)

    def seed_golden(self):
        self.configure()
        SiteHoliday.objects.create(site=self.w["site"], date=date(2025, 12, 25), name="Christmas",
                                   holiday_type="PUBLIC")
        paid = LeaveType.objects.create(code="CL7", name="Casual Leave", is_paid=True)
        unpaid = LeaveType.objects.create(code="LWP7", name="Leave Without Pay", is_paid=False)
        e0, e1 = self.emps
        # worker 0: 2 absent, 1 half day, 1 paid leave, 1 unpaid leave, Christmas holiday
        self.seed_month(e0, 2025, 12, absent=(3, 4), half=(5,), leave_days=(10, 11, 25))
        LeaveRequest.objects.create(worker=e0.worker, leave_type=paid, from_date=date(2025, 12, 10),
                                    to_date=date(2025, 12, 10), days=1, status="APPROVED")
        LeaveRequest.objects.create(worker=e0.worker, leave_type=unpaid,
                                    from_date=date(2025, 12, 11), to_date=date(2025, 12, 11),
                                    days=1, status="APPROVED")
        # worker 1: full month (+ November, so the bonus accounting-year rule passes)
        self.seed_month(e1, 2025, 12, leave_days=(25,))
        self.seed_month(e1, 2025, 11)
        EmployeeTDS.objects.create(org=self.org, employee=e1, financial_year="2025-26",
                                   monthly_tds=1000, taxable_income=600000,
                                   tax_payable={"total": 12000})
        Arrears.objects.create(org=self.org, employee=e0, arrears_type="correction",
                               total_arrears_amount=2500, net_arrears_payable=2500,
                               status="approved", pay_in_month="Dec", pay_in_year=2025)
        ClaimsDeclaration.objects.create(org=self.org, employee=e1, reimbursements=[
            {"_id": "c1", "headName": "Travel", "claimNo": "CLM-1", "claimDate": "2025-12-12",
             "claimedAmount": 900, "approvedAmount": 750, "status": "approved"},
            {"_id": "c2", "headName": "Food", "claimDate": "2025-11-12", "claimedAmount": 100,
             "status": "approved"}])

    def world_for(self, emp, month="Dec", year=2025, options=None, payroll_runs=None):
        """Legacy-engine input (mock collections) built from the same BSS data."""
        def rows(fn, start, end):
            return fn(emp, start, end)
        fy_start, end = date(2025, 4, 1), date(2026, 3, 31)
        att = [{"date": r["date"].isoformat(), "status": r["status"]}
               for r in rows(bss_adapter.attendance_rows, fy_start, end)]
        leaves = [{**lv, "startDate": lv["startDate"].isoformat(),
                   "endDate": lv["endDate"].isoformat()}
                  for lv in rows(bss_adapter.approved_leaves, fy_start, end)]
        hols = [{**h, "date": h["date"].isoformat()}
                for h in rows(bss_adapter.holidays, fy_start, end)]
        shift = bss_adapter.employee_shift(emp)
        doc = emp.to_dict()
        if shift:
            doc["shiftId"] = shift["_id"]
        tds = pc.find_tds_record(self.org, emp.pk, month, year)
        arrears = Arrears.objects.filter(org=self.org, employee=emp, status="approved").first()
        claims = ClaimsDeclaration.objects.filter(org=self.org, employee=emp).first()
        sched = PayrollSchedule.objects.filter(org=self.org).first()
        comp = StatutoryCompliance.objects.filter(org=self.org).first()
        return norm({
            "orgId": str(self.org.pk), "employee": doc, "month": month, "year": year,
            "salaryComponents": [c.to_dict() for c in
                                 SalaryCompensation.objects.filter(org=self.org)
                                 .order_by("created_at")],
            "compliance": comp.to_dict() if comp else None,
            "schedule": sched.to_dict() if sched else None,
            "attendance": att, "leaves": leaves, "holidays": hols, "shift": shift,
            "tdsRecord": tds.to_dict() if tds else None,
            "arrears": {"_id": str(arrears.pk), "netArrearsPayable": arrears.net_arrears_payable}
            if arrears else None,
            "claimDoc": claims.to_dict() if claims else None,
            "payrollRuns": payroll_runs or [], "options": options or {},
        })

    def process(self, **body):
        body.setdefault("month", self.MONTH)
        body.setdefault("year", self.YEAR)
        return self.hr.post(BASE + "processPayroll", body, format="json")


# =========================================================================== golden

@unittest.skipUnless(node_available(), SKIP_REASON)
class GoldenPayrollTests(PayrollWorld):
    def test_process_payroll_matches_legacy_engine(self):
        self.seed_golden()
        worlds = [self.world_for(e) for e in self.emps]
        expected = run_harness([{"fn": "calcImproved", "args": [w]} for w in worlds])

        # Python calculator == legacy calculator (full result dict)
        for emp, exp in zip(self.emps, expected):
            got = pc.calculate_employee_salary_improved(
                emp, worlds[0]["salaryComponents"], worlds[0]["compliance"], "Dec", 2025,
                self.org, None, [])
            got, exp = norm(got), dict(exp)
            exp["arrearsId"] = exp["arrearsId"] and str(exp["arrearsId"])
            assert_same(self, got, exp)

        res = self.process()
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual((data["successful"], data["failed"]), (2, 0), data)

        for emp, exp in zip(self.emps, expected):
            run = PayrollRun.objects.get(org=self.org, employee=emp, month="Dec", year=2025)
            self.assertEqual(run.pay_status, "processed")
            for cat in ("earnings", "deductions", "benefits", "reimbursements"):
                self.assertEqual(
                    [(x["componentName"], x["amount"], x.get("fixedAmount")) for x in getattr(run, cat)],
                    [(x["componentName"], x["amount"], x.get("fixedAmount") if cat != "reimbursements"
                      else None) for x in exp[cat]], cat)
            for attr, key in (("gross_earnings", "grossEarnings"),
                              ("total_deductions", "totalDeductions"), ("net_pay", "netPay"),
                              ("working_days", "workingDays"), ("present_days", "presentDays"),
                              ("lop_days", "lopDays"), ("absent_days", "absentDays")):
                self.assertAlmostEqual(getattr(run, attr), exp[key], 6, attr)
            assert_same(self, norm(run.employer_contributions), exp["employerContributions"])
            for attr, key in (("epf_details", "epfDetails"), ("esi_details", "esiDetails"),
                              ("pt_details", "ptDetails"), ("lwf_details", "lwfDetails")):
                assert_same(self, norm(getattr(run, attr)), exp[key])
            bonus = dict(exp["bonusDetails"])
            bonus.pop("accountingYearWorkedDays")
            bonus.pop("minWorkingDaysRequired")
            assert_same(self, norm(run.bonus_details), bonus)

        e0, e1 = self.emps
        r0 = PayrollRun.objects.get(employee=e0)
        r1 = PayrollRun.objects.get(employee=e1)
        # sanity on the scenario itself: LOP for worker 0 only, PT/LWF/TDS present
        self.assertGreater(r0.lop_days, 0)
        self.assertEqual(r1.lop_days, 0)
        names1 = [d["componentName"] for d in r1.deductions]
        self.assertIn("TDS", names1)
        self.assertIn("Professional Tax", names1)
        self.assertIn("Labour Welfare Fund", names1)
        self.assertIn("Arrears", [e["componentName"] for e in r0.earnings])
        # side effects: TDS ledger, arrears paid, claim marked
        tds = EmployeeTDS.objects.get(employee=e1)
        self.assertEqual(tds.total_tds_deducted, 1000)
        self.assertEqual(tds.monthly_deductions[0]["payrollId"], str(r1.pk))
        arr = Arrears.objects.get(employee=e0)
        self.assertEqual((arr.status, arr.paid_in_month, arr.payroll_id), ("paid", "Dec", r0.pk))
        claim = ClaimsDeclaration.objects.get(employee=e1)
        self.assertEqual(claim.reimbursements[0]["includedInPayrollId"], str(r1.pk))
        self.assertNotIn("includedInPayrollId", claim.reimbursements[1])
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org,
                                                       action="payroll_processed").exists())

        # paid-days breakdown == legacy buildPaidDaysBreakdown
        exp_bd = js("breakdown", worlds[0])
        assert_same(self, norm(pc.build_paid_days_breakdown(e0, "Dec", 2025)), exp_bd)
        res = self.hr.get(BASE + f"getPayroll/{r0.pk}")
        self.assertEqual(res.status_code, 200)
        assert_same(self, res.json()["data"]["paidDaysBreakdown"], exp_bd)
        self.assertEqual(res.json()["data"]["employeeId"]["firstName"], e0.first_name)

        # second run: already processed
        data = self.process().json()["data"]
        self.assertEqual(data["successful"], 0)
        self.assertEqual({e["error"] for e in data["errors"]}, {"Payroll already processed"})

    def test_recalculate_matches_legacy_with_paid_days(self):
        self.seed_golden()
        self.process()
        e0 = self.emps[0]
        run = PayrollRun.objects.get(employee=e0)
        world = self.world_for(e0, options={"paidDays": 20, "excludePayrollId": str(run.pk)})
        exp = js("calcImproved", world)
        res = self.hr.put(BASE + f"recalculatePayroll/{run.pk}", {"paidDays": 20, "preview": True},
                          format="json")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()["data"]
        self.assertTrue(body["preview"])
        self.assertEqual(body["paidDays"], 20)
        # arrears line already marked paid -> preserved from the saved run
        exp_preserved = js("preserveExistingPayrollExtras", norm(run.to_dict()), exp)
        for key in ("grossEarnings", "totalDeductions", "netPay", "lopDays"):
            self.assertAlmostEqual(body[key], exp_preserved[key], 6, key)
        self.assertEqual([e["componentName"] for e in body["earnings"]],
                         [e["componentName"] for e in exp_preserved["earnings"]])
        run.refresh_from_db()
        self.assertNotEqual(run.present_days, 20)  # preview does not save

        run.pay_status = "approved"
        run.save()
        res = self.hr.put(BASE + f"recalculatePayroll/{run.pk}", {"paidDays": 20}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["payStatus"], "processed")
        run.refresh_from_db()
        self.assertEqual((run.present_days, run.pay_status, run.approved_date),
                         (20, "processed", None))
        self.assertEqual(run.remarks, "Recalculated with paid days 20")
        self.assertAlmostEqual(run.net_pay, exp_preserved["netPay"], 6)


# =========================================================================== API

class PayrollRunApiTests(PayrollWorld):
    def test_process_validation(self):
        self.assertEqual(self.hr.post(BASE + "processPayroll", {}, format="json").json()["message"],
                         "Month and year are required")
        self.assertEqual(self.process(employeeIds="x").json()["message"],
                         "employeeIds must be an array")
        self.assertEqual(self.process(excludeEmployeeIds="x").json()["message"],
                         "excludeEmployeeIds must be an array")
        eid = str(self.emps[0].pk)
        r = self.process(employeeIds=[eid], excludeEmployeeIds=[eid])
        self.assertEqual(r.json()["message"],
                         "employeeIds and excludeEmployeeIds cannot contain the same IDs")
        self.assertEqual(self.process(month="Foo").json()["message"],
                         "Invalid month. Use Jan/Jul or July format")
        self.assertEqual(self.process(year=1800).json()["message"], "Invalid year")
        PayrollEmployee.objects.filter(org=self.org).update(status="Inactive")
        r = self.process()
        self.assertEqual((r.status_code, r.json()["message"]), (404, "No active employees found"))

    def test_process_no_salary_and_exclude_and_access(self):
        self.configure()
        e0, e1 = self.emps
        e1.payroll_info = {**e1.payroll_info, "baseSalary": 0}
        e1.save()
        r = self.process(month="december", excludeEmployeeIds=[])
        data = r.json()["data"]
        self.assertEqual(data["successful"], 1)
        self.assertEqual(data["errors"][0]["error"], "No salary structure defined")
        r = self.process(month="1", year="2026", excludeEmployeeIds=[str(e1.pk)])
        data = r.json()["data"]
        self.assertEqual(data["excluded"], 1)
        self.assertEqual(data["excludedEmployees"][0]["name"], e1.full_name)
        self.assertEqual(data["results"][0]["employeeId"], str(e0.pk))
        self.assertEqual(self.worker_client.post(BASE + "processPayroll",
                                                 {"month": "Dec", "year": 2025},
                                                 format="json").status_code, 403)

    def test_full_month_no_attendance_lop(self):
        """No attendance at all -> every working day is LOP (legacy rule)."""
        self.configure()
        self.process()
        run = PayrollRun.objects.get(employee=self.emps[0])
        self.assertEqual(run.working_days, 27)  # Dec 2025: 31 days - 4 Sundays
        self.assertEqual((run.lop_days, run.present_days), (27, 4))

    def _two_runs(self):
        self.configure()
        self.seed_month(self.emps[0], 2025, 12)
        self.seed_month(self.emps[1], 2025, 12)
        self.process()
        return list(PayrollRun.objects.filter(org=self.org).order_by("created_at"))

    def test_status_transitions_and_bulk(self):
        r0, r1 = self._two_runs()
        url = BASE + f"updatePayrollStatus/{r0.pk}"
        self.assertEqual(self.hr.put(url, {"payStatus": "bogus"}, format="json").status_code, 400)
        res = self.hr.put(url, {"payStatus": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["payStatus"], "approved")
        self.assertIsNotNone(res.json()["data"]["approvedDate"])
        res = self.hr.put(url, {"status": "rejected"}, format="json")
        self.assertEqual(res.json()["data"]["remarks"], "Rejected")
        res = self.hr.put(url, {"status": "on_hold", "remarks": "check bank"}, format="json")
        self.assertEqual(res.json()["data"]["remarks"], "check bank")
        res = self.hr.put(url, {"payStatus": "paid", "paidOn": "2026-01-07"}, format="json")
        self.assertEqual(res.json()["data"]["paidDate"], "2026-01-07T00:00:00Z")
        self.assertEqual(self.hr.put(BASE + f"updatePayrollStatus/{r0.pk}x",
                                     {"payStatus": "paid"}, format="json").status_code, 404)
        self.assertEqual(self.worker_client.put(url, {"payStatus": "paid"},
                                                format="json").status_code, 403)
        # paid run cannot be recalculated
        res = self.hr.put(BASE + f"recalculatePayroll/{r0.pk}", {"paidDays": 3}, format="json")
        self.assertEqual(res.json()["message"],
                         "Paid payroll cannot be edited. Reverse payment first.")

        bulk = BASE + "updatePayrollStatusBulk"
        self.assertEqual(self.hr.put(bulk, {"payrollIds": [], "payStatus": "paid"},
                                     format="json").json()["message"], "Payroll IDs are required")
        self.assertEqual(self.hr.put(bulk, {"payrollIds": [str(r1.pk)], "payStatus": "x"},
                                     format="json").json()["message"], "Invalid pay status")
        res = self.hr.put(bulk, {"payrollIds": [str(r0.pk), str(r1.pk)], "payStatus": "processed"},
                          format="json")
        self.assertEqual(res.json()["data"], {"requestedCount": 2, "matchedCount": 2,
                                              "modifiedCount": 1, "payStatus": "processed"})
        res = self.hr.put(bulk, {"payrollIds": [str(r0.pk), str(r1.pk)], "status": "approved"},
                          format="json")
        self.assertEqual(res.json()["data"]["modifiedCount"], 2)
        self.assertEqual(PayrollRun.objects.filter(pay_status="approved").count(), 2)
        self.assertTrue(PayrollAuditLog.objects.filter(action="payroll_approved").exists())

    def test_recalculate_validation(self):
        r0, _ = self._two_runs()
        url = BASE + f"recalculatePayroll/{r0.pk}"
        self.assertEqual(self.hr.put(url, {}, format="json").json()["message"],
                         "paidDays must be a number greater than or equal to 0")
        self.assertEqual(self.hr.put(url, {"paidDays": 40}, format="json").json()["message"],
                         "paidDays cannot be more than 31 for Dec 2025")
        self.assertEqual(self.hr.put(BASE + "recalculatePayroll/nope", {"paidDays": 1},
                                     format="json").status_code, 404)

    def test_history_endpoints(self):
        r0, r1 = self._two_runs()
        r1.pay_status = "paid"
        r1.paid_date = datetime(2026, 1, 7, 6, 0, tzinfo=LOCAL_TZ)
        r1.save()
        res = self.hr.get(BASE + "getPayRunMonthlyData")
        periods = res.json()["data"]
        self.assertEqual(periods["totalPeriods"], 1)
        self.assertEqual(periods["periods"][0]["employeeCount"], 2)
        res = self.hr.get(BASE + "getPayRunMonthlyData?month=12&year=2025&limit=1")
        data = res.json()["data"]
        self.assertEqual(data["period"]["label"], "Dec 2025")
        self.assertEqual(data["summary"]["payDay"], "07 JAN, 2026")
        self.assertEqual(data["summary"]["statusWise"]["paid"], 1)
        self.assertEqual(data["pagination"], {"page": 1, "limit": 1, "total": 2, "totalPages": 2})
        self.assertEqual(self.hr.get(BASE + "getPayRunMonthlyData?month=Foo&year=2025")
                         .json()["message"], "Valid month is required (Jan, Feb, ... or 1-12)")
        self.assertEqual(self.hr.get(BASE + "getPayRunMonthlyData?month=Dec&year=x")
                         .json()["message"], "Valid year is required")
        res = self.hr.get(BASE + "getPayRunMonthlyData?month=Dec&year=2025&search=ramesh kumar0"
                                 "&payStatus=PROCESSED")
        self.assertEqual(len(res.json()["data"]["employees"]), 1)

        res = self.hr.get(BASE + "getMonthlyPayrollHistroy?year=2025")
        hist = res.json()["data"]
        self.assertEqual(hist["totalPeriods"], 1)
        self.assertEqual(len(hist["history"][0]["employees"]), 2)
        self.assertEqual(hist["grandTotals"]["totalNetPay"], hist["history"][0]["summary"]["totalNetPay"])
        res = self.hr.get(BASE + "getMonthlyPayrollHistroy?includeEmployees=false")
        self.assertNotIn("employees", res.json()["data"]["history"][0])
        self.assertEqual(self.hr.get(BASE + "getMonthlyPayrollHistroy?year=abc").status_code, 400)

        res = self.hr.get(BASE + f"getPayrollHistory?month=Dec&year=2025&employeeId={r0.employee_id}")
        self.assertEqual(res.json()["data"]["total"], 1)
        self.assertEqual(res.json()["data"]["data"][0]["employeeId"]["_id"], str(r0.employee_id))
        self.assertEqual(self.hr.get(BASE + "getPayroll/00000000-0000-0000-0000-000000000000")
                         .status_code, 404)
        self.assertEqual(self.worker_client.get(BASE + "getPayRunMonthlyData").status_code, 403)

    def test_payslip_json_and_pdf(self):
        r0, _ = self._two_runs()
        res = self.hr.get(BASE + f"generatePayslip/{r0.pk}")
        self.assertEqual(res.status_code, 200)
        slip_json = res.json()["data"]
        self.assertEqual(slip_json["organization"]["name"], "BuildWell Contractors")
        self.assertEqual(slip_json["payPeriod"], {"month": "Dec", "year": 2025})
        self.assertEqual(len(slip_json["earnings"]),
                         len(r0.earnings) + len(r0.benefits) + len(r0.reimbursements))
        self.assertEqual(slip_json["attendance"]["paidDays"], 31)
        res = self.hr.get(BASE + f"downloadPayslipPdf/{r0.pk}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.content.startswith(b"%PDF"))
        self.assertIn(f"Payslip_{r0.employee.unique_id}_Dec_2025.pdf", res["Content-Disposition"])
        self.assertEqual(self.hr.get(BASE + "generatePayslip/nope").status_code, 404)
        self.assertEqual(self.hr.get(BASE + "downloadPayslipPdf/nope").json()["message"],
                         "Payslip not found")

    def test_delete_run(self):
        r0, _ = self._two_runs()
        self.assertEqual(self.worker_client.delete(BASE + f"deletePayrollRun/{r0.pk}").status_code,
                         403)
        res = self.hr.delete(BASE + f"deletePayrollRun/{r0.pk}")
        self.assertEqual(res.json()["message"], "Payroll run deleted successfully")
        self.assertFalse(PayrollRun.objects.filter(pk=r0.pk).exists())
        self.assertEqual(self.hr.delete(BASE + f"deletePayrollRun/{r0.pk}").status_code, 404)
        self.assertTrue(PayrollAuditLog.objects.filter(action="payroll_deleted").exists())

    def test_concurrent_process_does_not_duplicate_run_or_tds(self):
        """Legacy's unique {employeeId, month, year} index rejected a concurrent second run;
        a run committed by another request while this one calculates must not be duplicated
        (nor its TDS ledger entry pushed twice)."""
        from unittest import mock

        self.configure()
        e0 = self.emps[0]
        EmployeeTDS.objects.create(org=self.org, employee=e0, financial_year="2025-26",
                                   monthly_tds=1000)
        real = pc.calculate_employee_salary_improved

        def racing(emp, *args, **kwargs):
            calc = real(emp, *args, **kwargs)
            # the concurrent request finishes first
            PayrollRun.objects.create(org=self.org, employee=emp, month="Dec", year=2025,
                                      pay_status="processed")
            return calc

        with mock.patch.object(pc, "calculate_employee_salary_improved", side_effect=racing):
            data = self.process(employeeIds=[str(e0.pk)]).json()["data"]
        self.assertEqual((data["successful"], data["failed"]), (0, 1), data)
        self.assertEqual(data["errors"][0]["error"], "Payroll already processed")
        self.assertEqual(PayrollRun.objects.filter(employee=e0, month="Dec", year=2025).count(), 1)
        tds = EmployeeTDS.objects.get(employee=e0)
        self.assertEqual((tds.total_tds_deducted, tds.monthly_deductions), (0, []))


# =========================================================================== dependencies

def _importable(name):
    try:
        return importlib.util.find_spec(name) is not None
    except ModuleNotFoundError:
        return False


class CrossModuleTests(PayrollWorld):
    @unittest.skipUnless(_importable("payroll_engine.services.loan_helper"), "loan_helper missing")
    def test_loan_emi_deducted_and_reversed_on_delete(self):
        from payroll_engine.models import EmployeeLoan, LoanRepayment, LoanType

        self.configure()
        e0 = self.emps[0]
        lt = LoanType.objects.create(org=self.org, loan_name="Salary Advance")
        loan = EmployeeLoan.objects.create(
            org=self.org, employee=e0, loan_type=lt, loan_number="LN-1", loan_amount=12000,
            installment_amount=1000, total_installments=12, outstanding_balance=12000,
            status="active", disbursement_date=datetime(2025, 11, 1, tzinfo=LOCAL_TZ),
            emi_start_date=datetime(2025, 12, 1, tzinfo=LOCAL_TZ), exempt_from_perquisite=True)
        self.seed_month(e0, 2025, 12)
        self.process(employeeIds=[str(e0.pk)])
        run = PayrollRun.objects.get(employee=e0)
        emi = [d for d in run.deductions if "loan" in d["componentName"].lower()]
        self.assertEqual(len(emi), 1, run.deductions)
        self.assertEqual(LoanRepayment.objects.filter(loan=loan).count(), 1)
        loan.refresh_from_db()
        self.assertEqual(loan.outstanding_balance, 11000)
        self.hr.delete(BASE + f"deletePayrollRun/{run.pk}")
        loan.refresh_from_db()
        self.assertEqual(loan.outstanding_balance, 12000)

    @unittest.skipUnless(_importable("payroll_engine.views.vpf_management"), "vpf missing")
    def test_vpf_deduction(self):
        self.configure()
        e0 = self.emps[0]
        prefs = dict(e0.payroll_preferences)
        prefs["vpf"] = {"enabled": True, "contributionType": "fixed", "fixedAmount": 500,
                        "status": "active", "effectiveFrom": "2025-11-01"}
        e0.payroll_preferences = prefs
        e0.save()
        self.seed_month(e0, 2025, 12)
        self.process(employeeIds=[str(e0.pk)])
        run = PayrollRun.objects.get(employee=e0)
        vpf = [d for d in run.deductions if d["componentName"] == "VPF (Voluntary PF)"]
        self.assertEqual(vpf[0]["amount"], 500)

    @unittest.skipUnless(_importable("payroll_engine.services.one_time_import_helper"),
                         "one_time_import_helper missing")
    def test_one_time_import_rows(self):
        from payroll_engine.models import PayrollOneTimeImport

        self.configure()
        e0 = self.emps[0]
        PayrollOneTimeImport.objects.create(org=self.org, month="Dec", year=2025,
                                            import_batch_id="B1", status="confirmed", rows=[
            {"valid": True, "employeeId": str(e0.pk), "category": "earnings",
             "componentCode": "DIWALI", "componentName": "Festival Bonus", "amount": 999,
             "isAdHoc": True}])
        self.process(employeeIds=[str(e0.pk)])
        run = PayrollRun.objects.get(employee=e0)
        self.assertIn(("Festival Bonus", 999),
                      [(e["componentName"], e["amount"]) for e in run.earnings])


# =========================================================================== schedule

class PayrollScheduleApiTests(PayrollWorld):
    def test_schedule_crud_and_upcoming(self):
        url = BASE + "createOrUpdateSchedule"
        self.assertEqual(self.hr.get(BASE + "getUpcomingPayrollDates").status_code, 404)
        self.assertEqual(self.hr.get(BASE + "getPayrollSchedule").json()["data"], {})
        self.assertEqual(self.hr.post(url, {"payFrequency": "monthly"}, format="json")
                         .json()["message"],
                         "Pay frequency, pay day, and first pay period are required")
        res = self.hr.post(url, {"payFrequency": "monthly", "payDay": 7,
                                 "firstPayPeriod": "2025-07-01", "workingDays": ["Monday"],
                                 "autoProcessEnabled": False, "autoProcessTime": "9:5"},
                           format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual((data["payDay"], data["autoProcessEnabled"], data["autoProcessTime"]),
                         ("7", False, "13:00"))
        self.assertEqual(data["upcomingPayrolls"][0]["period"], "July 2025")
        self.assertEqual(data["upcomingPayrolls"][0]["payDate"], "2025-07-07T00:00:00.000Z")
        self.assertEqual(AutoPayrollRegistry.objects.get(org_uuid=str(self.org.pk))
                         .auto_process_enabled, False)
        res = self.hr.post(url, {"payFrequency": "weekly", "payDay": "1",
                                 "firstPayPeriod": "2025-07-01", "autoProcessTime": "14:30"},
                           format="json")
        self.assertEqual(PayrollSchedule.objects.filter(org=self.org).count(), 1)
        self.assertEqual(res.json()["data"]["autoProcessTime"], "14:30")
        up = self.hr.get(BASE + "getUpcomingPayrollDates").json()["data"]
        self.assertEqual(len(up), 12)
        self.assertEqual(up[1]["period"], "Week 2 - 2025")
        res = self.hr.get(BASE + "calculatePayPeriod?date=2025-07-10")
        self.assertEqual(res.json()["data"]["periodStart"], "2025-07-08T00:00:00.000Z")
        self.assertEqual(self.hr.get(BASE + "calculatePayPeriod").json()["message"],
                         "Date is required")
        self.assertEqual(self.worker_client.get(BASE + "getPayrollSchedule").status_code, 403)


@unittest.skipUnless(node_available(), SKIP_REASON)
class ScheduleDifferentialTests(TestCase):
    def test_generate_upcoming_payrolls(self):
        cases = [("monthly", "7", "2025-07-01"), ("monthly", "31", "2025-01-31"),
                 ("monthly", "x", "2025-03-15T10:00:00Z"), ("semi-monthly", "7", "2025-01-30"),
                 ("bi-weekly", "7", "2025-12-25"), ("weekly", "3", "2024-02-26"),
                 ("annual", "7", "2025-01-01")]
        exp = run_harness([{"fn": "generateUpcomingPayrolls", "args": list(c)} for c in cases])
        for c, e in zip(cases, exp):
            self.assertEqual(ps.generate_upcoming_payrolls(*c), e, c)

    def test_calculate_pay_period(self):
        cases = [("2025-07-10", "monthly", "2025-07-01"), ("2025-07-20", "semi-monthly", "2025-07-01"),
                 ("2025-07-10", "semi-monthly", "2025-07-01"), ("2025-08-10", "bi-weekly", "2025-07-01"),
                 ("2025-08-10", "weekly", "2025-07-03"), ("2025-02-10", "other", "2025-07-01")]
        exp = run_harness([{"fn": "calculatePayPeriodForDate",
                            "args": [{"$date": d}, f, {"$date": s}]} for d, f, s in cases])
        for (d, f, s), e in zip(cases, exp):
            self.assertEqual(ps.calculate_pay_period_for_date(ps.js_date(d), f, ps.js_date(s)), e)


# =========================================================================== auto payroll

class AutoPayrollTests(PayrollWorld):
    def _schedule(self, **kw):
        sched = PayrollSchedule.objects.create(
            org=self.org, pay_frequency="monthly", pay_day="7",
            first_pay_period=datetime(2025, 7, 1, tzinfo=LOCAL_TZ), auto_process_time="13:00",
            upcoming_payrolls=ps.generate_upcoming_payrolls("monthly", "7", "2025-07-01"), **kw)
        return sched

    def _run(self, now, window=15):
        out = io.StringIO()
        call_command("run_auto_payroll", "--now", now, "--window", str(window), "--json",
                     stdout=out)
        return json.loads(out.getvalue())

    def test_time_and_day_gating_and_idempotency(self):
        self.configure()
        sched = self._schedule()
        res = self._run("2025-12-06T13:00:00+05:30")
        self.assertEqual((res["registered"], res["summary"][0]["reason"]), (1, "not_pay_day"))
        res = self._run("2025-12-07T12:50:00+05:30")
        self.assertEqual(res["registered"], 0)
        self.assertEqual(res["summary"][0]["reason"], "not_auto_time")
        self.assertFalse(PayrollRun.objects.exists())
        res = self._run("2025-12-07T13:10:00+05:30")
        self.assertFalse(res["summary"][0]["skipped"], res)
        self.assertTrue(res["summary"][0]["success"])
        self.assertEqual(PayrollRun.objects.filter(org=self.org, month="Dec").count(), 2)
        sched.refresh_from_db()
        self.assertEqual((sched.last_auto_run_key, sched.last_auto_run_status),
                         ("2025-Dec", "success"))
        self.assertEqual(sched.last_auto_run_message, "Payroll processing completed")
        res = self._run("2025-12-07T13:12:00+05:30")
        self.assertEqual(res["summary"][0]["reason"], "already_auto_run")
        self.assertEqual(PayrollRun.objects.count(), 2)
        # outside the window -> exact legacy minute rule with --window 1
        self.assertEqual(self._run("2026-01-07T13:01:00+05:30", window=1)["summary"][0]["reason"],
                         "not_auto_time")

    def test_disabled_inactive_and_before_first_period(self):
        self.configure()
        sched = self._schedule(auto_process_enabled=False)
        self.assertEqual(self._run("2025-12-07T13:00:00+05:30")["summary"][0]["reason"],
                         "auto_disabled")
        sched.auto_process_enabled = True
        sched.status = "inactive"
        sched.save()
        apr.sync_auto_payroll_registry(str(self.org.pk), sched.to_dict())
        self.assertEqual(self._run("2025-12-07T13:00:00+05:30")["summary"][0]["reason"],
                         "inactive")
        sched.status = "active"
        sched.save()
        apr.sync_auto_payroll_registry(str(self.org.pk), sched.to_dict())
        self.assertEqual(self._run("2025-06-07T13:00:00+05:30")["summary"][0]["reason"],
                         "before_first_period")
        self.assertFalse(PayrollRun.objects.exists())


@unittest.skipUnless(node_available(), SKIP_REASON)
class AutoRunnerDifferentialTests(TestCase):
    def test_evaluate_row_matches_legacy_logic(self):
        upcoming = ps.generate_upcoming_payrolls("monthly", "7", "2025-07-01")
        base = {"status": "active", "autoProcessEnabled": True, "autoProcessTime": "13:00",
                "payFrequency": "monthly", "payDay": "7", "firstPayPeriod": "2025-07-01T00:00:00Z",
                "upcomingPayrolls": upcoming, "lastAutoRunKey": ""}
        rows = [base, {**base, "lastAutoRunKey": "2025-Dec"}, {**base, "status": "inactive"},
                {**base, "autoProcessEnabled": False}, {**base, "upcomingPayrolls": [],
                                                         "payDay": "7"},
                {**base, "payFrequency": "weekly", "upcomingPayrolls": []}]
        todays = [apr.get_today_parts("Asia/Kolkata", datetime(2025, 12, 7, 13, 0, tzinfo=LOCAL_TZ)),
                  apr.get_today_parts("Asia/Kolkata", datetime(2025, 12, 7, 13, 1, tzinfo=LOCAL_TZ)),
                  apr.get_today_parts("Asia/Kolkata", datetime(2025, 6, 7, 13, 0, tzinfo=LOCAL_TZ)),
                  apr.get_today_parts("Asia/Kolkata", datetime(2025, 12, 8, 13, 0, tzinfo=LOCAL_TZ))]
        calls = [{"fn": "evaluateRow", "args": [r, t]} for r in rows for t in todays]
        exp = run_harness(calls)
        for call, e in zip(calls, exp):
            self.assertEqual(norm(apr.evaluate_row(*call["args"])), e, call["args"][1])
        for v in ["", None, "9:5", "25:70", "07:30:15", "abc", "13:00"]:
            self.assertEqual(apr.normalize_auto_process_time(v),
                             js("normalizeAutoProcessTime", v))


# =========================================================================== pure helpers

@unittest.skipUnless(node_available(), SKIP_REASON)
class HelperDifferentialTests(TestCase):
    def test_month_and_misc_helpers(self):
        months = ["jan", "July", "7", "13", " Sep ", "", "Foo", 12]
        calls = [{"fn": "normalizePayrollMonth", "args": [m]} for m in months]
        calls += [{"fn": "getCalendarDaysInPayrollMonth", "args": [m, y]}
                  for m, y in [("Feb", 2024), ("Feb", 2025), ("june", "2025"), ("x", 2025),
                               ("Jan", 2025.5)]]
        calls += [{"fn": "calculateWorkingDaysInMonth", "args": [2025, m, d]}
                  for m, d in [("Dec", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
                               ("Feb", []), ("Foo", ["Monday"])]]
        calls += [{"fn": "getPayrollTdsAmount", "args": [p]} for p in
                  [{"deductions": [{"componentName": " tds ", "amount": -10.555}]}, {}]]
        calls += [{"fn": "sumTaxes", "args": [[{"componentName": "TDS", "amount": 5},
                                               {"componentName": "Prof Tax", "amount": "7"},
                                               {"componentName": "EPF", "amount": 9}]]}]
        calls += [{"fn": "formatPayDay", "args": a} for a in
                  [("Sep", 2025, "7"), ("Feb", 2025, "31"), ("Foo", 2025, 1), ("Jan", 2026, "")]]
        calls += [{"fn": "formatPayDayFromDate", "args": [d]} for d in
                  ["2025-09-07T00:00:00Z", "garbage"]]
        calls += [{"fn": "resolveEmployeeStatutoryState", "args": [e]} for e in
                  [{"statutoryInfo": {"ptState": "Gujarat"}}, {"address": {"state": "MH"}}, {}]]
        exp = run_harness(calls)
        py = {"normalizePayrollMonth": pc.normalize_payroll_month,
              "getCalendarDaysInPayrollMonth": pc.get_calendar_days_in_payroll_month,
              "calculateWorkingDaysInMonth": pc.calculate_working_days_in_month,
              "getPayrollTdsAmount": pc.get_payroll_tds_amount, "sumTaxes": pc.sum_taxes,
              "formatPayDay": pc.format_pay_day,
              "formatPayDayFromDate": pc.format_pay_day_from_date,
              "resolveEmployeeStatutoryState": pc.resolve_employee_statutory_state}
        for c, e in zip(calls, exp):
            got = py[c["fn"]](*c["args"])
            if c["fn"] == "normalizePayrollMonth" and c["args"][0] == "":
                self.assertIsNone(got)
                continue
            self.assertEqual(norm(got), e, c)

    def test_proration_and_preserve(self):
        lines = [{"componentName": "Basic", "amount": 10001}, {"componentName": "Bonus",
                                                                "amount": 583.1,
                                                                "calculationType": "statutory"},
                 {"componentName": "HRA", "amount": "4000.5"}]
        exp = js("prorateSalaryLines", lines, 31, 27.5, mutated=[0])
        got = [dict(x) for x in lines]
        pc.prorate_salary_lines(got, 31, 27.5)
        self.assertEqual(norm(got), exp["args"]["0"])
        benefits = [{"componentName": "Med", "amount": 500, "calculateOnProRata": True},
                    {"componentName": "Uni", "amount": 300, "calculateOnProRata": False}]
        exp = js("applyBenefitsProration", benefits, 30, 12, mutated=[0])
        got = [dict(x) for x in benefits]
        pc.apply_benefits_proration(got, 30, 12)
        self.assertEqual(norm(got), exp["args"]["0"])

        existing = {"earnings": [{"componentName": "Arrears", "amount": 2500},
                                 {"componentName": "Basic", "amount": 1}],
                    "deductions": [{"componentName": "Loan EMI - LN1", "amount": 1000,
                                    "fixedAmount": 0}],
                    "reimbursements": [{"componentName": "Travel", "amount": 750,
                                        "claimId": "c1"}]}
        calc = {"earnings": [{"componentName": "Basic", "amount": 9000}], "benefits": [],
                "deductions": [{"componentName": "TDS", "amount": 300}], "reimbursements": []}
        exp = js("preserveExistingPayrollExtras", existing, calc)
        assert_same(self, norm(pc.preserve_existing_payroll_extras(existing, json.loads(
            json.dumps(calc)))), exp)

    def test_summaries(self):
        payrolls = [
            {"_id": "p1", "employeeId": {"_id": "e1", "firstName": "A", "lastName": "B",
                                         "uniqueId": "U1", "payrollInfo": {"designation": "X"},
                                         "departmentId": {"name": "Civil"},
                                         "bankInfo": {"bankName": "SBI"}},
             "earnings": [{"amount": 1000}], "benefits": [{"amount": 50}],
             "reimbursements": [{"amount": 25}], "deductions": [{"componentName": "TDS",
                                                                 "amount": 100}],
             "totalDeductions": 300, "grossEarnings": 1075, "netPay": 775.5,
             "employerContributions": {"total": 120}, "workingDays": 26, "presentDays": 30,
             "payStatus": "approved", "processedDate": "2025-12-07T00:00:00.000Z"},
            {"_id": "p2", "employeeId": None, "earnings": [], "benefits": [], "reimbursements": [],
             "deductions": [], "grossEarnings": 0, "netPay": 0, "workingDays": 27,
             "paidDate": "2026-01-07T00:00:00.000Z", "payStatus": "paid"}]
        exp = run_harness([{"fn": "mapPayrollRunToEmployeeSummary", "args": [p]} for p in payrolls]
                          + [{"fn": "buildPayRunPeriodSummary",
                              "args": [payrolls, 5, {"payDay": "7"}, "Dec", 2025]},
                             {"fn": "buildPayRunPeriodSummary",
                              "args": [payrolls[:1], 1, {"payDay": "9"}, "Sep", 2025]}])
        for p, e in zip(payrolls, exp):
            self.assertEqual(norm(pc.map_payroll_run_to_employee_summary(p)), e)
        self.assertEqual(norm(pc.build_pay_run_period_summary(payrolls, 5, {"payDay": "7"}, "Dec",
                                                              2025)), exp[2])
        self.assertEqual(norm(pc.build_pay_run_period_summary(payrolls[:1], 1, {"payDay": "9"},
                                                              "Sep", 2025)), exp[3])

    def test_leave_overlap(self):
        rng = pc.get_month_date_range(2025, "Dec")
        leaves = [{"startDate": "2025-11-28", "endDate": "2025-12-03"},
                  {"startDate": "2025-12-30", "endDate": "2026-01-02"},
                  {"startDate": "2025-12-05", "endDate": "2025-12-05", "leaveDurationType": "Half-Day"},
                  {"startDate": "2025-12-01", "endDate": "2025-12-31", "leaveDurationType": "Cluster",
                   "clusterDates": ["2025-12-02", "2025-12-09", "2026-01-01"]},
                  {"startDate": "2025-10-01", "endDate": "2025-10-02"}]
        start = {"$date": "2025-11-30T18:30:00.000Z"}
        end = {"$date": "2025-12-31T18:29:59.999Z"}
        exp = run_harness([{"fn": "calculateLeaveOverlapDays", "args": [lv, start, end]}
                           for lv in leaves])
        for lv, e in zip(leaves, exp):
            got = pc.calculate_leave_overlap_days(lv, rng["startDate"], rng["endDate"])
            self.assertEqual(got, e, lv)

    def test_payslip_pdf_helpers(self):
        amounts = [0, 1234567.891, 1.005, 2.675, -1234.5, "12", None, 99999.999, 0.004]
        exp = run_harness([{"fn": "formatInr", "args": [a]} for a in amounts])
        for a, e in zip(amounts, exp):
            self.assertEqual(slip.format_inr(a), e, a)
        args = [[{"componentName": "Basic", "amount": 9000, "fixedAmount": 10000}],
                [{"name": "Med", "amount": "500"}], [{"amount": 75, "fixedAmount": "x"}]]
        assert_same(self, norm(slip.merge_payslip_earnings_column(*args)),
                    js("mergePayslipEarningsColumn", *args))
        pdf = slip.build_salary_slip_pdf_buffer({"organizationName": "X", "earnings": [],
                                                 "deductions": [], "paidDays": 30})
        self.assertTrue(pdf.startswith(b"%PDF"))


@unittest.skipUnless(node_available(), SKIP_REASON)
class LegacyCalculatorDifferentialTests(PayrollWorld):
    def test_unused_legacy_calculate_employee_salary(self):
        self.configure()
        e1 = self.emps[1]
        world = self.world_for(e1)
        exp = js("calcLegacy", world)
        got = pc.calculate_employee_salary(e1, world["salaryComponents"], world["compliance"],
                                           "Dec", 2025, self.org)
        assert_same(self, norm(got), exp)
