"""Payroll reports + HR dashboard: API tests and differential tests vs the legacy controllers."""

import unittest

from django.test import TestCase

from payroll_engine import bss_adapter
from payroll_engine.models import (Arrears, ClaimsDeclaration, EmployeeTDS, FullAndFinal,
                                   PayrollEmployee, PayrollRun, SalaryRevision)
from payroll_engine.models.payroll_run import new_line

from .fixtures import BASE, client_for, make_org_world
from .legacy_js import SKIP_REASON, node_available
from .report_parity import run_legacy


def seed_runs(org, emps):
    """Realistic PayrollRun rows for Feb + Mar 2026 (and Apr 2025 for the FY charts)."""
    a, b, c = emps
    a.department, b.department, c.department = "Civil", "Civil", ""
    a.payroll_info = {**a.payroll_info, "baseSalary": 20000, "grossSalary": 32000, "ctc": 420000,
                      "employeeCode": "EMP-A", "variablePay": 12000,
                      "componentOverrides": [{"name": "HRA", "overrideAmount": 8000, "category": "Allowance"},
                                             {"name": "Special", "amount": 4000, "disabled": True}],
                      "defaultComponents": [{"name": "Basic", "amount": 20000},
                                            {"componentName": "Conveyance", "amount": "1600"},
                                            {"name": "hra", "amount": 1}]}
    b.payroll_info = {**b.payroll_info, "baseSalary": 15000, "grossSalary": 21000, "ctc": 0}
    c.payroll_info = {**c.payroll_info, "baseSalary": 9000, "grossSalary": 12000, "ctc": 150001,
                      "department": "Loading"}
    c.status = "Inactive"
    for e in emps:
        e.save()

    def run(emp, month, year, gross, ded_lines, earn_lines, status="approved", **extra):
        total_ded = round(sum(x[1] for x in ded_lines), 2)
        return PayrollRun.objects.create(
            org=org, employee=emp, month=month, year=year, gross_earnings=gross,
            total_deductions=total_ded, net_pay=round(gross - total_ded, 2), pay_status=status,
            earnings=[new_line(componentName=n, amount=v) for n, v in earn_lines],
            deductions=[new_line(componentName=n, amount=v) for n, v in ded_lines],
            present_days=extra.pop("present_days", 28), lop_days=extra.pop("lop_days", 0), **extra)

    std_earn = [("Basic Salary", 20000), ("HRA", 8000), ("Conveyance", 1600), ("Special Allowance", 2400)]
    run(a, "Feb", 2026, 32000, [("EPF Employee Contribution", 1800), ("Professional Tax", 200),
                                ("TDS", 1250.5)], std_earn,
        employer_contributions={"epf": 1800, "edli": 75, "adminCharges": 75, "esi": 0, "lwf": 0, "total": 1950},
        epf_details={"epfWage": 15000, "abryApplied": False},
        pt_details={"stateUsed": "Gujarat", "ptNumber": "PT-1", "cycle": "monthly", "amount": 200})
    run(a, "Mar", 2026, 33500.75, [("EPF Employee Contribution", 1800), ("Professional Tax", 200),
                                   ("TDS", 1400), ("CSR Donation", 100), ("Loan Recovery", 500)],
        std_earn + [("Bonus", 1500.75)], status="paid",
        employer_contributions={"epf": 1800, "edli": 75, "adminCharges": 75, "esi": 0, "lwf": 12, "total": 0},
        epf_details={"epfWage": 15000, "abryApplied": True},
        lwf_details={"stateUsed": "Gujarat", "cycle": "half-yearly", "employeeShare": 6, "employerShare": 12},
        bonus_details={"amount": 1500.75, "cycle": "yearly", "calcBase": 7000, "percentage": 8.33})
    run(b, "Feb", 2026, 21000, [("ESI Employee", 157.5), ("Labour Welfare Fund", 6)],
        [("Basic", 15000), ("House Rent Allowance", 6000)], status="processed",
        employer_contributions={"esi": 682.5, "total": 682.5},
        esi_details={"wageUsed": 21000})
    run(b, "Mar", 2026, 19500, [("ESI Employee", 146.25)], [("Basic", 15000), ("HRA", 4500)],
        status="on_hold", lop_days=2, employer_contributions={"esi": 633.75})
    run(c, "Mar", 2026, 12000, [], [("Basic", 9000), ("Other", 3000)], status="pending")
    run(c, "Apr", 2025, 11000, [("Income Tax", 50)], [("Basic", 9000)], status="paid")


class _SeededReports(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=3, suffix="rp")
        self.org = self.world["contractor"]
        bss_adapter.sync_employees(self.org, force=True)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("first_name"))
        seed_runs(self.org, self.emps)
        self.client = client_for(self.org)

    def get(self, path):
        res = self.client.get(BASE + path)
        return res.status_code, res.json()

    def _seed_dashboard_extras(self):
        FullAndFinal.objects.create(org=self.org, employee=self.emps[2], status="initiated")
        ClaimsDeclaration.objects.create(org=self.org, employee=self.emps[0], reimbursements=[
            {"status": "pending", "amount": 100}, {"status": "approved"}, {"status": "pending"}])
        SalaryRevision.objects.create(org=self.org, employee=self.emps[0], revision_type="increment",
                                      status="pending")
        Arrears.objects.create(org=self.org, employee=self.emps[1], arrears_type="salary_revision",
                               total_arrears_amount=100, status="calculated")


class ReportsApiTests(_SeededReports):
    def test_validation_and_access(self):
        self.assertEqual(self.get("reports/summary?month=Mar")[1]["message"], "Month and year are required")
        self.assertEqual(self.get("reports/ytd")[1]["message"], "Year is required")
        self.assertEqual(self.get("reports/statutory?year=2026")[0], 400)
        self.assertEqual(self.get("reports/tds")[1]["message"], "Financial year is required")
        status, body = self.get("reports/tds?financialYear=abc")
        self.assertEqual((status, body["message"]),
                         (400, "Invalid financial year. Use formats like 2025-26 or 2025-2026"))
        self.assertEqual(self.get("reports/variance?month1=Feb&year1=2026")[1]["message"],
                         "Both periods (month and year) are required")
        self.assertEqual(self.get("hrDashboard?year=abc")[1]["message"], "Invalid year")
        worker = client_for(self.world["workers"][0])
        for path in ["reports/summary?month=Mar&year=2026", "reports/ctc", "hrDashboard"]:
            self.assertEqual(worker.get(BASE + path).status_code, 403)

    def test_summary_numbers(self):
        status, body = self.get("reports/summary?month=march&year=2026")
        self.assertEqual(status, 200)
        s = body["data"]["summary"]
        self.assertEqual(body["data"]["month"], "Mar")
        self.assertEqual(s["totalEmployees"], 3)
        self.assertAlmostEqual(s["totalGrossEarnings"], 33500.75 + 19500 + 12000)
        self.assertEqual(s["statusWise"], {"pending": 1, "processed": 0, "approved": 0, "paid": 1,
                                           "on_hold": 1})
        self.assertEqual(s["departmentWise"]["Civil"]["count"], 2)
        self.assertEqual(s["departmentWise"]["Loading"]["count"], 1)
        a = next(e for e in s["employees"] if e["employeeCode"] == "EMP-A")
        self.assertEqual((a["employerPF"], a["edli"], a["status"]), (1800, 75, "paid"))

    def test_ytd_statutory_variance_ctc(self):
        a = self.emps[0]
        data = self.get(f"reports/ytd?year=2026&employeeId={a.pk}")[1]["data"]["data"]
        self.assertEqual(len(data), 1)
        months = data[0]["months"]
        self.assertEqual([m["month"] for m in months], ["Feb", "Mar"])
        self.assertEqual((months[0]["basic"], months[0]["hra"], months[0]["epf"], months[0]["tds"]),
                         (20000, 8000, 1800, 1250.5))
        self.assertAlmostEqual(data[0]["totals"]["netPay"], (32000 - 3250.5) + (33500.75 - 4000))
        rep = self.get("reports/statutory?month=Mar&year=2026")[1]["data"]["report"]
        self.assertEqual(len(rep["epf"]["employees"]), 1)
        self.assertEqual(rep["epf"]["totalEmployerCost"], 1950)
        self.assertEqual(rep["lwf"]["totalEmployerShare"], 12)
        self.assertEqual(rep["bonus"]["totalAmount"], 1500.75)
        self.assertAlmostEqual(rep["esi"]["totalEmployerContribution"], 633.75)
        var = self.get("reports/variance?month1=Feb&year1=2026&month2=Mar&year2=2026")[1]["data"]
        va = next(v for v in var["variances"] if v["employeeCode"] == "EMP-A")
        self.assertEqual(va["variance"]["grossPercentage"], "4.69")
        self.assertEqual(len(var["variances"]), 2)
        ctc = self.get("reports/ctc")[1]["data"]
        self.assertEqual(ctc["totalEmployees"], 2)
        ea = next(e for e in ctc["employees"] if e["employeeCode"] == "EMP-A")
        self.assertEqual(ea["monthlyCTC"], 35000)
        self.assertEqual([c["name"] for c in ea["components"]], ["HRA", "Conveyance"])

    def test_tds_report(self):
        EmployeeTDS.objects.create(
            org=self.org, employee=self.emps[0], financial_year="2025-26", tax_regime="old",
            projected_annual_income={"basic": 240000, "hra": 96000, "allowances": 48000, "total": 0},
            declared_deductions={"standardDeduction": 50000, "section80C": 150000, "section80E": 1000,
                                 "section80U": 500},
            hra_exemption={"exemptAmount": 12000}, section10_exemptions={"lta": 1000, "x": "2"},
            taxable_income=150000, tax_payable={"incomeTax": 5000, "cess": 200, "total": 5200},
            monthly_tds=433, total_tds_deducted=1300,
            monthly_deductions=[{"month": "April", "tdsDeducted": 433}, {"month": "Apr", "tdsDeducted": 1},
                                {"month": "may", "tdsDeducted": 433}, {"month": "Foo", "tdsDeducted": 9}])
        body = self.get("reports/tds?financialYear=2025-2026")[1]["data"]
        self.assertEqual(body["financialYear"], "2025-2026")
        e = body["report"]["employees"][0]
        self.assertEqual((e["grossTotalIncome"], e["section10"], e["otherChapterVIA"], e["balance"]),
                         (384000, 1002, 1500, 3900))
        self.assertEqual(e["months"]["Apr"], 434)
        self.assertEqual(e["months"]["May"], 433)

    def test_hr_dashboard(self):
        self._seed_dashboard_extras()
        status, body = self.get("hrDashboard?month=3&year=2026")
        self.assertEqual(status, 200, body)
        d = body["data"]
        self.assertEqual(d["period"], {"month": "Mar", "monthFull": "March", "year": 2026,
                                       "financialYear": "2025-26"})
        self.assertEqual(d["summary"]["activeEmployees"], 2)
        self.assertEqual(d["summary"]["taxesWithheld"], 1600)
        self.assertEqual(d["requests"]["pendingForFnf"], 1)
        self.assertEqual(d["requests"]["salaryOnHold"], 1)
        self.assertEqual(d["approvals"]["approvalsPendingOnMe"], 4)
        self.assertEqual(len(d["costSummary"]), 12)
        self.assertEqual(d["costSummary"][0]["label"], "Apr 2025")
        self.assertEqual(d["costSummary"][0]["taxes"], 50)


@unittest.skipUnless(node_available(), SKIP_REASON)
class ReportsLegacyParityTests(_SeededReports):
    """Same seeded data through the legacy controllers (mini-Mongo) and the port."""

    def assertParity(self, path, controller, handler, query):
        status, body = self.get(path)
        legacy = run_legacy(controller, handler, self.org, {"query": query})
        self.assertEqual(legacy["status"], status)
        self.assertEqual(legacy["body"], body)

    def test_parity_reports(self):
        ctrl = "controller/payroll/payrollReports.js"
        EmployeeTDS.objects.create(
            org=self.org, employee=self.emps[1], financial_year="2025-2026",
            projected_annual_income={"basic": 180000, "hra": 72000, "otherIncome": 1234.5},
            declared_deductions={"section80C": 50000, "section80D": 2500, "section80CCD2": 10},
            section10_exemptions={"total": 777}, taxable_income=99999.5,
            tax_payable={"incomeTax": 1000.25, "surcharge": 0, "total": 1040.26}, rebate_amount=1000,
            monthly_tds=0, total_tds_deducted=0,
            monthly_deductions=[{"month": "June", "tdsDeducted": "12.5"}])
        cases = [
            ("reports/summary?month=Mar&year=2026", "getPayrollSummary", {"month": "Mar", "year": "2026"}),
            ("reports/summary?month=february&year=2026", "getPayrollSummary", {"month": "february", "year": "2026"}),
            ("reports/ytd?year=2026", "getYTDReport", {"year": "2026"}),
            ("reports/statutory?month=Feb&year=2026", "getStatutoryReport", {"month": "Feb", "year": "2026"}),
            ("reports/statutory?month=Mar&year=2026", "getStatutoryReport", {"month": "Mar", "year": "2026"}),
            ("reports/tds?financialYear=2025-26", "getTDSReport", {"financialYear": "2025-26"}),
            ("reports/ctc", "getCTCReport", {}),
            ("reports/variance?month1=Feb&year1=2026&month2=Mar&year2=2026", "getVarianceReport",
             {"month1": "Feb", "year1": "2026", "month2": "Mar", "year2": "2026"}),
        ]
        for path, handler, query in cases:
            with self.subTest(handler=handler, path=path):
                self.assertParity(path, ctrl, handler, query)

    def test_parity_dashboard(self):
        self._seed_dashboard_extras()
        for query in [{"month": "March", "year": "2026"}, {"month": "feb", "year": "2026"},
                      {"month": "4", "year": "2025"}]:
            path = f"hrDashboard?month={query['month']}&year={query['year']}"
            with self.subTest(query=query):
                self.assertParity(path, "controller/payroll/hrDashboard.js", "getHrDashboard", query)
