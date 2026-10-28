"""API + differential tests for views/employee_payroll.py (legacy employeePayroll.js)."""

import copy
import importlib.util
import json
import unittest
from datetime import datetime, timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from payroll_engine.models import (ClaimsDeclaration, PayrollAuditLog, PayrollEmployee, PayrollRun,
                                   SalaryCompensation, StatutoryCompliance)
from payroll_engine.services.financial_year import LOCAL_TZ
from payroll_engine.views import employee_payroll as ep

from .fixtures import BASE, client_for, make_org_world
from .legacy_controller import handler_call, internal_call, run_batch
from .legacy_js import SKIP_REASON, node_available
from .test_calc_parity import COMPONENT_SETS
from .test_setup_views import FULL_COMPLIANCE, same, strip_ids

F = "controller/payroll/employeePayroll.js"
HAS_SLIP_PDF = importlib.util.find_spec("payroll_engine.services.salary_slip_pdf") is not None
HAS_FORM16 = (importlib.util.find_spec("payroll_engine.services.form16_builder") is not None
              and importlib.util.find_spec("payroll_engine.services.form16_pdf") is not None)

REIMB_HEADS = [
    {"name": "Fuel", "code": "FUEL", "type": "reimbursement", "maxLimit": 3000, "status": "active"},
    {"name": "Internet", "code": "NET", "type": "reimbursement", "maxLimit": 0, "status": "active"},
    {"name": "Old Head", "code": "OLD", "type": "reimbursement", "maxLimit": 100, "status": "inactive"},
]


def run_lines(gross):
    basic = round(gross * 0.5)
    return {
        "earnings": [{"componentName": "Basic Salary", "amount": basic, "fixedAmount": basic},
                     {"componentName": "HRA", "amount": gross - basic, "fixedAmount": gross - basic}],
        "benefits": [{"componentName": "Medical Insurance", "amount": 800}],
        "reimbursements": [{"componentName": "Fuel", "amount": 1200}],
        "deductions": [{"componentName": "EPF (Employee)", "amount": 1800},
                       {"componentName": "Professional Tax", "amount": 200}],
    }


class EmployeePayrollBase(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2)
        self.org = self.world["contractor"]
        self.hr = client_for(self.org)
        self.worker_user = self.world["workers"][0]
        self.worker = client_for(self.worker_user)
        self.hr.get(BASE + "employees")
        self.emp = PayrollEmployee.objects.get(org=self.org, worker=self.worker_user)
        self.other = PayrollEmployee.objects.filter(org=self.org).exclude(pk=self.emp.pk).first()
        self.emp.payroll_info = {**self.emp.payroll_info, "baseSalary": 15000, "grossSalary": 30000,
                                 "ctc": 400000}
        self.emp.custom_id = "EMP-001"
        self.emp.save()

    def seed_components(self, key="pct_gross", reimb=True):
        for rec in copy.deepcopy(COMPONENT_SETS[key]):
            if rec["category"] == "reimbursements" and reimb:
                rec["components"] = copy.deepcopy(REIMB_HEADS)
            SalaryCompensation.objects.create(org=self.org, category=rec["category"],
                                              components=rec["components"])

    def seed_compliance(self):
        row = StatutoryCompliance(org=self.org)
        row.epf, row.esi = copy.deepcopy(FULL_COMPLIANCE["epf"]), copy.deepcopy(FULL_COMPLIANCE["esi"])
        row.professional_tax = copy.deepcopy(FULL_COMPLIANCE["professionalTax"])
        row.labour_welfare_fund = copy.deepcopy(FULL_COMPLIANCE["labourWelfareFund"])
        row.statutory_bonus = copy.deepcopy(FULL_COMPLIANCE["statutoryBonus"])
        row.save()
        return row

    def seed_runs(self, emp=None, periods=None):
        emp = emp or self.emp
        now = timezone.now().astimezone(LOCAL_TZ)
        periods = periods or [(ep.PAYROLL_MONTHS[now.month - 1], now.year), ("Apr", 2025),
                              ("Mar", 2025), ("Dec", 2024)]
        runs = []
        for i, (month, year) in enumerate(periods):
            gross = 30000 + i * 1000
            runs.append(PayrollRun.objects.create(
                org=self.org, employee=emp, month=month, year=year, gross_earnings=gross + 2000,
                total_deductions=2000, net_pay=gross, working_days=30, present_days=28 - i,
                lop_days=i, pay_status="paid" if i else "processed",
                processed_date=timezone.make_aware(datetime(2025, 4, 30, 12)), **run_lines(gross)))
        return runs

    def seed_claims(self, emp=None):
        emp = emp or self.emp
        heads = SalaryCompensation.objects.get(org=self.org, category="reimbursements").components
        now = timezone.now()
        return ClaimsDeclaration.objects.create(org=self.org, employee=emp, reimbursements=[
            {"_id": "c1", "claimNo": "CLM0001", "headId": heads[0]["_id"], "headName": "Fuel",
             "headCode": "FUEL", "claimDate": ep.js_iso(now), "claimedAmount": 1000,
             "approvedAmount": 800, "status": "approved", "billNo": "B-1",
             "submittedOn": ep.js_iso(now - timedelta(days=2)), "attachmentUrls": []},
            {"_id": "c2", "claimNo": "CLM0002", "headId": heads[0]["_id"], "headName": "Fuel",
             "claimDate": ep.js_iso(now), "claimedAmount": 500, "status": "pending",
             "submittedOn": ep.js_iso(now - timedelta(days=1))},
            {"_id": "c3", "claimNo": "CLM0003", "headName": "fuel", "claimDate": "2024-01-15T00:00:00.000Z",
             "claimedAmount": 700, "status": "rejected", "submittedOn": "2024-01-16T00:00:00.000Z"},
        ])


# =============================================================================== self-service
class SelfServiceTests(EmployeePayrollBase):
    def test_dashboard(self):
        self.seed_components()
        runs = self.seed_runs()
        self.seed_claims()
        res = self.worker.get(BASE + "employee/dashboard")
        self.assertEqual(res.status_code, 200, res.content)
        d = res.json()["data"]
        self.assertEqual(d["employee"]["code"], "EMP-001")
        self.assertEqual(d["currentPayStub"]["payrollId"], str(runs[0].pk))
        self.assertFalse(d["currentPayStub"]["navigation"]["hasNext"])
        self.assertTrue(d["currentPayStub"]["navigation"]["hasPrevious"])
        self.assertEqual(len(d["currentPayStub"]["earnings"]), 4)
        self.assertEqual(d["deductionBreakdown"][0]["percentage"], 90)
        self.assertEqual(d["yearToDate"]["monthsProcessed"],
                         sum(1 for r in runs if r.year == timezone.now().astimezone(LOCAL_TZ).year))
        fuel = next(h for h in d["claimsAndReimbursements"]["reimbursementHeads"] if h["headName"] == "Fuel")
        self.assertEqual((fuel["utilized"], fuel["claimed"], fuel["approved"], fuel["balance"]),
                         (1300, 1500, 800, 1700))
        self.assertEqual(d["claimsAndReimbursements"]["claimsStats"],
                         {"total": 3, "approved": 1, "pending": 1, "rejected": 1})
        self.assertEqual(len(d["recentPayslips"]), 4)
        self.assertEqual(self.hr.get(BASE + "employee/dashboard").status_code, 403)

    def test_dashboard_empty(self):
        d = self.worker.get(BASE + "employee/dashboard").json()["data"]
        self.assertIsNone(d["currentPayStub"])
        self.assertEqual(d["currentPeriod"]["payStatus"], "pending")
        self.assertEqual(d["claimsAndReimbursements"]["reimbursementHeads"], [])

    def test_payslips_list_detail_summary(self):
        runs = self.seed_runs()
        self.seed_runs(emp=self.other, periods=[("Jan", 2025)])
        body = self.worker.get(BASE + "employee/myPayslips").json()["data"]
        self.assertEqual(body["total"], 4)
        self.assertEqual(body["data"][0]["employeeId"]["customId"], "EMP-001")
        self.assertEqual(self.worker.get(BASE + "employee/myPayslips", {"year": 2025}).json()["data"]["total"],
                         sum(1 for r in runs if r.year == 2025))
        self.assertEqual(self.worker.get(BASE + "employee/myPayslips", {"limit": 2}).json()["data"]["total"], 2)
        self.assertEqual(self.worker.get(BASE + "employee/myPayslips", {"month": "Dec"}).json()["data"]["total"], 1)
        res = self.worker.get(BASE + f"employee/myPayslips/{runs[1].pk}")
        self.assertEqual(res.status_code, 200, res.content)
        detail = res.json()["data"]
        self.assertEqual(detail["organization"]["name"], "BuildWell Contractors")
        self.assertEqual(detail["attendance"]["paidDays"], 27)
        self.assertEqual(detail["summary"]["netPay"], 31000)
        other_run = PayrollRun.objects.get(employee=self.other)
        self.assertEqual(self.worker.get(BASE + f"employee/myPayslips/{other_run.pk}").status_code, 404)
        self.assertEqual(self.worker.get(BASE + "employee/myPayslips/not-a-uuid").status_code, 404)
        summary = self.worker.get(BASE + "employee/salarySummary").json()["data"]
        self.assertIn(summary["currentMonth"]["month"], ep.EN_IN_SHORT_MONTHS)
        self.assertEqual(self.hr.get(BASE + "employee/myPayslips").status_code, 403)

    def test_annual_salary_statement(self):
        self.seed_runs(periods=[("Apr", 2025), ("Mar", 2026), ("May", 2025), ("Mar", 2025)])
        url = BASE + "employee/annualSalaryStatement"
        self.assertEqual(self.worker.get(url).json()["message"], "financialYear is required (e.g. 2025-26)")
        self.assertEqual(self.worker.get(url, {"financialYear": "2025"}).status_code, 400)
        d = self.worker.get(url, {"financialYear": "FY2025-26"}).json()["data"]
        self.assertEqual([r["month"] for r in d["monthlyBreakdown"]], ["Apr", "May", "Mar"])
        self.assertEqual(d["annualSummary"]["monthsProcessed"], 3)
        self.assertEqual(d["financialYear"], "2025-26")
        hr_url = BASE + f"employee/{self.emp.pk}/annualSalaryStatement"
        self.assertEqual(self.hr.get(hr_url, {"financialYear": "2025-26"}).json()["data"], d)
        self.assertEqual(self.hr.get(BASE + f"employee/{self.other.pk}x/annualSalaryStatement",
                                     {"financialYear": "2025-26"}).status_code, 404)
        self.assertEqual(self.worker.get(hr_url, {"financialYear": "2025-26"}).status_code, 403)

    def test_form16_validation(self):
        for path in ("employee/form16", "employee/form16/download", "employee/form16/part-a/download",
                     "employee/form16/part-b/download"):
            res = self.worker.get(BASE + path)
            self.assertEqual(res.status_code, 400, path)
            self.assertEqual(self.hr.get(BASE + path, {"financialYear": "2025-26"}).status_code, 403)

    @unittest.skipUnless(HAS_FORM16, "services.form16_builder / form16_pdf not available yet")
    def test_form16_without_tds_record(self):
        res = self.worker.get(BASE + "employee/form16", {"financialYear": "2025-26"})
        self.assertEqual(res.status_code, 404, res.content)
        self.assertIn("TDS record not found", res.json()["message"])

    def test_salary_pdf_download_404(self):
        self.assertEqual(self.worker.get(BASE + "employee/getMySalaryPdfdownload/abc").status_code, 404)

    @unittest.skipUnless(HAS_SLIP_PDF, "services.salary_slip_pdf not available yet")
    def test_salary_pdf_download(self):
        run = self.seed_runs(periods=[("Apr", 2025)])[0]
        res = self.worker.get(BASE + f"employee/getMySalaryPdfdownload/{run.pk}")
        self.assertEqual(res.status_code, 200, res.content[:300])
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertIn('filename="Payslip_EMP-001_Apr_2025.pdf"', res["Content-Disposition"])
        self.assertTrue(res.content.startswith(b"%PDF"))


# =============================================================================== claims
class ClaimsTests(EmployeePayrollBase):
    def setUp(self):
        super().setUp()
        self.seed_components()
        self.heads = SalaryCompensation.objects.get(org=self.org, category="reimbursements").components

    def test_heads_and_empty_summary(self):
        heads = self.worker.get(BASE + "employee/reimbursementHeads").json()["data"]
        self.assertEqual([h["name"] for h in heads], ["Fuel", "Internet"])
        self.assertTrue(heads[0]["taxable"])
        self.assertEqual(self.hr.get(BASE + "employee/reimbursementHeads").status_code, 200)
        res = self.worker.get(BASE + "employee/myClaimsSummary").json()
        self.assertEqual(res["message"], "No claims found")

    def test_submit_json_and_limits(self):
        url = BASE + "employee/submitClaim"
        fuel, net, old = (h["_id"] for h in self.heads)
        today = timezone.now().astimezone(LOCAL_TZ).strftime("%Y-%m-%d")
        cases = [
            ({}, "items must be a non-empty array"),
            ({"items": "[oops"}, "Invalid items JSON format"),
            ({"items": [{"headId": fuel}]}, "items[0]: headId and claimedAmount are required"),
            ({"items": [{"headId": fuel, "claimedAmount": "0"}]}, "items[0]: claimedAmount must be greater than 0"),
            ({"items": [{"headId": "nope", "claimedAmount": 5}]}, "items[0]: invalid reimbursement headId"),
            ({"items": [{"headId": old, "claimedAmount": 5}]}, "items[0]: reimbursement head is inactive"),
            ({"items": [{"headId": fuel, "claimedAmount": 5, "claimDate": "garbage"}]}, "items[0]: invalid claimDate"),
            ({"items": [{"headId": fuel, "claimedAmount": 2000, "claimDate": today},
                        {"headId": fuel, "claimedAmount": 1500, "claimDate": today}]},
             f'items[1]: monthly limit exceeded for "Fuel". Max 3000 per month ({today[:7]}), '
             "already used 2000, remaining 1000"),
            ({"items": [{"headId": fuel, "claimedAmount": 1}] * 51},
             "At most 50 line items allowed per request"),
        ]
        for body, msg in cases:
            res = self.worker.post(url, body, format="json")
            self.assertEqual(res.status_code, 400, body)
            self.assertEqual(res.json()["message"], msg)
        res = self.worker.post(url, {"comments": "April bills", "items": [
            {"headId": fuel, "claimedAmount": "1200.5", "claimDate": today, "billNo": 77},
            {"headId": net, "claimedAmount": 999, "particulars": "Broadband"}]}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual((data["count"], data["status"]), (2, "pending"))
        self.assertEqual([i["claimNo"] for i in data["items"]], ["CLM0001", "CLM0002"])
        doc = ClaimsDeclaration.objects.get(org=self.org, employee=self.emp)
        r0 = doc.reimbursements[0]
        self.assertEqual((r0["billNo"], r0["type"], r0["employeeComments"], r0["claimedAmount"]),
                         ("77", "FUEL", "April bills", 1200.5))
        self.assertEqual(doc.reimbursements[1]["name"], "Internet")
        # used 1200.5 this month -> 1800 more exceeds the 3000 limit
        res = self.worker.post(url, {"items": [{"headId": fuel, "claimedAmount": 1800, "claimDate": today}]},
                               format="json")
        self.assertIn("remaining 1799.5", res.json()["message"])
        self.assertEqual(self.hr.post(url, {}, format="json").status_code, 403)
        summary = self.worker.get(BASE + "employee/myClaimsSummary").json()["data"]
        self.assertEqual(summary["stats"]["pending"], 2)
        self.assertEqual(summary["stats"]["totalClaimed"], 2199.5)
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org, entity_type="claim").exists())

    def test_submit_multipart_with_files(self):
        fuel = self.heads[0]["_id"]
        items = json.dumps([{"headId": fuel, "claimedAmount": 100}, {"headId": fuel, "claimedAmount": 200}])
        res = self.worker.post(BASE + "employee/submitClaim", {
            "items": items, "comments": "with files",
            "proofFile": [SimpleUploadedFile("bill1.pdf", b"%PDF-1.4 x", content_type="application/pdf")],
            "attachments": [SimpleUploadedFile("a.png", b"\x89PNG", content_type="image/png"),
                            SimpleUploadedFile("b.jpg", b"\xff\xd8", content_type="image/jpeg")],
        }, format="multipart")
        self.assertEqual(res.status_code, 200, res.content)
        items_out = res.json()["data"]["items"]
        self.assertTrue(items_out[0]["proofUrl"].startswith("/v1/payroll-engine/files/"))
        self.assertEqual(items_out[1]["proofUrl"], "")
        self.assertEqual(len(items_out[0]["attachmentUrls"]), 2)
        self.assertEqual(items_out[0]["attachmentUrls"], items_out[1]["attachmentUrls"])
        bad = self.worker.post(BASE + "employee/submitClaim", {
            "items": items, "attachments": [SimpleUploadedFile("x.exe", b"MZ", content_type="application/x-msdownload")]},
            format="multipart")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("Invalid file type", bad.json()["message"])

    def test_all_claims_summary(self):
        self.seed_claims()
        self.seed_claims(emp=self.other)
        url = BASE + "employee/getAllClaimsSummary"
        d = self.hr.get(url).json()["data"]
        self.assertEqual(d["pagination"], {"total": 6, "totalPages": 1, "currentPage": 1, "limit": 10})
        self.assertEqual(d["stats"]["approved"], 2)
        self.assertEqual(d["reimbursements"][0]["claimNo"], "CLM0002")   # latest submittedOn first
        self.assertEqual(self.hr.get(url, {"status": "APPROVED"}).json()["data"]["stats"]["total"], 2)
        self.assertEqual(self.hr.get(url, {"employeeId": str(self.other.pk)}).json()["data"]["stats"]["total"], 3)
        self.assertEqual(self.hr.get(url, {"search": "b-1"}).json()["data"]["stats"]["total"], 2)
        self.assertEqual(self.hr.get(url, {"fromDate": "2025-01-01"}).json()["data"]["stats"]["total"], 4)
        self.assertEqual(self.hr.get(url, {"page": 2, "limit": 4}).json()["data"]["reimbursements"].__len__(), 2)
        self.assertEqual(self.worker.get(url).status_code, 403)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_all_claims_summary_differential(self):
        self.seed_claims()
        self.seed_claims(emp=self.other)
        docs = []
        for doc in ClaimsDeclaration.objects.filter(org=self.org).order_by("created_at"):
            d = json.loads(json.dumps(doc.to_dict()))
            e = doc.employee
            d["employeeId"] = {"_id": str(e.pk), "firstName": e.first_name, "lastName": e.last_name,
                               "email": e.email}
            docs.append(d)
        queries = [{}, {"status": "pending"}, {"search": "fuel"}, {"search": "ramesh"},
                   {"fromDate": "2025-01-01", "toDate": "2099-01-01"}, {"page": "2", "limit": "2"},
                   {"page": "x", "limit": "-3"}]
        calls, ours = [], []
        for q in queries:
            calls.append(handler_call(F, "getAllClaimsSummary", {"query": q},
                                      {"ClaimsDeclarationModel": {"find": docs}}))
            ours.append(self.hr.get(BASE + "employee/getAllClaimsSummary", q).json())
        for js, py in zip(run_batch(calls), ours):
            same(js["body"], py)


# =============================================================================== payroll info (HR)
CALC_BODIES = [
    {"baseSalary": 15000},
    {"grossSalary": 30000, "state": "Maharashtra"},
    {"grossSalary": "45000", "baseSalary": 20000, "state": "Karnataka",
     "componentOverrides": [{"category": "earnings", "name": "HRA", "overrideAmount": 5000},
                            {"category": "deductions", "name": "Canteen", "disabled": True}]},
    {"grossSalary": 18000, "state": "Haryana", "presentDays": 20, "workingDays": 30,
     "statutoryInfo": {"esiOptedOut": True, "employmentCategory": "skilled"}},
    {"baseSalary": 9000, "state": "Gujarat", "useEmployee": True},
    {"grossSalary": 75000, "componentOverrides": [{"category": "benefits", "name": "Medical Insurance",
                                                   "overrideAmount": 1500}], "useEmployee": True},
]


class PayrollInfoTests(EmployeePayrollBase):
    def emp_doc(self, emp=None):
        return json.loads(json.dumps((emp or self.emp).to_dict()))

    def test_calculate_validation(self):
        url = BASE + "calculatePayrollInfo"
        res = self.hr.post(url, {"baseSalary": "abc"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"], "baseSalary or grossSalary is required and must be greater than 0")
        res = self.hr.post(url, {"baseSalary": 1000, "employeeId": "00000000-0000-0000-0000-000000000000"},
                           format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(self.worker.post(url, {"baseSalary": 1}, format="json").status_code, 403)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_calculate_differential(self):
        self.seed_components()
        self.seed_compliance()
        self.emp.payroll_info = {**self.emp.payroll_info, "componentOverrides": [
            {"_id": "o1", "category": "earnings", "name": "Conveyance", "overrideAmount": 1000,
             "disabled": False},
            {"_id": "o2", "category": "earnings", "name": "Basic Salary", "overrideAmount": 99999}]}
        self.emp.statutory_info = {**self.emp.statutory_info, "ptState": "Maharashtra", "lwfState": "Haryana"}
        self.emp.save()
        comps = [json.loads(json.dumps(r.to_dict()))
                 for r in SalaryCompensation.objects.filter(org=self.org).order_by("created_at")]
        compliance = json.loads(json.dumps(StatutoryCompliance.objects.get(org=self.org).to_dict()))
        calls, ours = [], []
        for body in CALC_BODIES:
            body = dict(body)
            if body.pop("useEmployee", False):
                body["employeeId"] = str(self.emp.pk)
            models = {"SalaryCompensationModel": {"find": comps},
                      "StatutoryComplianceModel": {"findOne": compliance},
                      "EmployeeModel": {"findById": self.emp_doc()}}
            calls.append(handler_call(F, "calculatePayrollInfo", {"body": body}, models))
            ours.append(self.hr.post(BASE + "calculatePayrollInfo", body, format="json").json())
        for js, py in zip(run_batch(calls), ours):
            for out in (js["body"], py):
                out["data"]["payrollInfo"].pop("salaryEffectiveFrom")
            same(js["body"], py)

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_preview_components_bulk_annual_differential(self):
        self.seed_components()
        self.seed_compliance()
        self.seed_runs(periods=[("Apr", 2025), ("Mar", 2026), ("May", 2025), ("Mar", 2025)])
        comps = [json.loads(json.dumps(r.to_dict()))
                 for r in SalaryCompensation.objects.filter(org=self.org).order_by("created_at")]
        compliance = json.loads(json.dumps(StatutoryCompliance.objects.get(org=self.org).to_dict()))
        doc = self.emp_doc()
        calls, ours = [], []
        for q in [{}, {"grossSalary": "40000"}, {"baseSalary": "20000", "ctc": "600000"}]:
            calls.append(handler_call(F, "getSalaryStructurePreview",
                                      {"params": {"employeeId": str(self.emp.pk)}, "query": q},
                                      {"EmployeeModel": {"findById": doc},
                                       "SalaryCompensationModel": {"find": comps}}))
            ours.append(self.hr.get(BASE + f"employee/{self.emp.pk}/salary-structure-preview", q).json())
        calls.append(handler_call(F, "getSalaryComponents", {},
                                  {"SalaryCompensationModel": {"find": comps}}))
        ours.append(self.hr.get(BASE + "salaryComponents").json())
        bulk_body = {"employees": [{"employeeId": str(self.emp.pk), "baseSalary": 20000, "state": "Maharashtra"},
                                   {"employeeId": str(self.emp.pk), "baseSalary": "15000"},
                                   {"baseSalary": 100}]}
        calls.append(handler_call(F, "bulkUpdatePayrollInfo", {"body": bulk_body},
                                  {"EmployeeModel": {"findById": doc},
                                   "SalaryCompensationModel": {"find": comps},
                                   "StatutoryComplianceModel": {"findOne": compliance}}))
        ours.append(self.hr.post(BASE + "bulkUpdatePayrollInfo", bulk_body, format="json").json())
        runs = json.loads(json.dumps([r.to_dict() for r in
                                      PayrollRun.objects.filter(employee=self.emp).order_by("created_at")]))
        org = {"name": "BuildWell Contractors", "address": "Mundra", "logo": ""}
        calls.append(handler_call(F, "getEmployeeAnnualSalaryStatement",
                                  {"params": {"employeeId": str(self.emp.pk)},
                                   "query": {"financialYear": "2025-26"}},
                                  {"EmployeeModel": {"findById": doc},
                                   "PayrollRunModel": {"find": [r for r in runs if (r["year"], r["month"]) != (2025, "Mar")]},
                                   "OrganizationModel": {"findById": org}}))
        ours.append(self.hr.get(BASE + f"employee/{self.emp.pk}/annualSalaryStatement",
                                {"financialYear": "2025-26"}).json())
        legacy = run_batch(calls)
        for item in (legacy[4]["body"], ours[4]):
            for r in item["data"]["results"]:
                r["payrollInfo"].pop("salaryEffectiveFrom")
        for js, py in zip(legacy, ours):
            same(strip_ids(js["body"]), strip_ids(py))

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_pure_helpers_differential(self):
        now = ep.js_iso(timezone.now())
        payrolls = [
            {"_id": "p1", "month": "Apr", "year": 2025, "grossEarnings": 30000, "netPay": 25000,
             "earnings": [{"componentName": "Basic Salary", "amount": "15000"}, {"name": "HRA", "amount": 5000},
                          {"amount": 3}],
             "deductions": [{"componentName": "PF", "amount": 1800}, {"amount": "x"}],
             "presentDays": 26, "workingDays": 30, "lopDays": 4, "benefits": [{"componentName": "Med", "amount": 1,
                                                                              "fixedAmount": "5"}]},
            {"_id": "p2", "month": "Jan", "year": 2026, "earnings": [{"componentName": "basic pay", "amount": 0}],
             "workingDays": "31", "lopDays": 2, "presentDays": None, "payStatus": "paid"},
            {"_id": "p3", "month": "Sept", "year": "2025"},
        ]
        heads = [{"_id": "h1", "name": "Fuel", "code": "FUEL"}, {"_id": "h2", "name": "Net"}]
        claims = [{"headId": "h1", "claimDate": now, "claimedAmount": 100, "status": "approved",
                   "approvedAmount": 60},
                  {"headCode": "fuel", "claimDate": now, "claimedAmount": "40", "status": "pending"},
                  {"headName": "FUEL", "claimDate": now, "claimedAmount": 1000, "status": "rejected"},
                  {"headId": "h2", "claimDate": "2024-01-31T20:00:00.000Z", "claimedAmount": 5,
                   "status": "approved", "approvedAmount": None},
                  {"headName": "Net", "claimDate": "bad", "claimedAmount": 5}]
        cases = [
            ("getFinancialYearFromPayroll", ep.get_financial_year_from_payroll,
             [["Apr", 2025], ["Mar", "2026"], ["Jan", None], ["xx", 2025], ["Dec", "abc"]]),
            ("parseFinancialYearInput", ep.parse_financial_year_input,
             [["2025-26"], ["fy2025-2026"], [" FY2025-26 "], ["2025-27"], [None], [""], ["2025"]]),
            ("comparePayrollPeriod", ep.compare_payroll_period,
             [[payrolls[0], payrolls[1]], [payrolls[1], payrolls[0]], [payrolls[0], payrolls[2]]]),
            ("buildDeductionBreakdown", ep.build_deduction_breakdown,
             [[payrolls[0]["deductions"], 0], [payrolls[0]["deductions"], 2000], [[], 0],
              [[{"amount": 0}], 0], [[{"componentName": "A", "amount": 1}, {"amount": 2}], "3"]]),
            ("aggregatePayrollComponents", ep.aggregate_payroll_components,
             [[payrolls, "earnings"], [payrolls, "deductions"], [[], "earnings"]]),
            ("buildMonthlyBreakdownRow", ep.build_monthly_breakdown_row, [[p] for p in payrolls]),
            ("matchesReimbursementHead", ep.matches_reimbursement_head,
             [[c, h] for c in claims for h in heads]),
            ("getMonthlyUtilizedForHead", ep.get_monthly_utilized_for_head,
             [[claims, h, k] for h in heads for k in (ep.get_claim_calendar_month_key(now), "2024-02", None)]),
            ("getClaimCalendarMonthKey", ep.get_claim_calendar_month_key,
             [["2024-01-31T20:00:00.000Z"], ["2025-06-15"], ["bad"], [1700000000000]]),
            ("buildMonthlyHeadBucketKey", ep.build_monthly_head_bucket_key, [["h1", "2025-01"], [5, None]]),
            ("mapPayslipWithFinancialYear", ep.map_payslip_with_financial_year, [[p] for p in payrolls]),
        ]
        calls, pys, names = [], [], []
        for js_name, fn, arg_sets in cases:
            for args in arg_sets:
                calls.append(internal_call(F, js_name, *copy.deepcopy(args)))
                pys.append(ep.jsonable(fn(*copy.deepcopy(args))))
                names.append(js_name)
        for i, (js, py) in enumerate(zip(run_batch(calls), pys)):
            if names[i] == "matchesReimbursementHead":
                # legacy returns the falsy operand of an && chain (undefined / ""); only its
                # truthiness is ever used
                js = bool(js) and js != {"$undefined": True}
            same(js, py, f"case{i} {names[i]}")

    def test_payroll_info_get_put_and_access(self):
        url = BASE + f"employee/{self.emp.pk}/payrollInfo"
        res = self.worker.get(url)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["data"]["payrollInfo"]["baseSalary"], 15000)
        self.assertEqual(self.worker.get(BASE + f"employee/{self.other.pk}/payrollInfo").status_code, 404)
        self.assertEqual(self.worker.put(url, {"payrollInfo": {"baseSalary": 1}}, format="json").status_code, 403)
        body = {"payrollInfo": {"baseSalary": "18000", "junk": 1,
                                "componentOverrides": [{"category": "earnings", "name": " HRA ",
                                                        "overrideAmount": "4000"}]},
                "payrollPreferences": {"holdSalary": "true", "holdReason": "audit"},
                "taxInfo": {"tdsDeducted": "1200"},
                "bankInfo": {"ifscCode": "HDFC0000001", "bankName": "HDFC"},
                "statutoryInfo": {"uan": "999999999999", "ptState": "Maharashtra"}}
        res = self.hr.put(url, body, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        d = res.json()["data"]
        self.assertEqual(d["payrollInfo"]["baseSalary"], 18000)
        self.assertNotIn("junk", d["payrollInfo"])
        self.assertEqual(d["payrollInfo"]["componentOverrides"][0]["overrideAmount"], 4000)
        self.assertEqual(d["payrollInfo"]["grossSalary"], 30000)
        self.assertIs(d["payrollPreferences"]["holdSalary"], True)
        self.assertEqual(d["bankInfo"]["accountType"], "Savings")   # merged, not replaced
        self.emp.refresh_from_db()
        self.assertIn("bank_info", self.emp.locked_fields)
        self.assertIn("statutoryInfo.uan", self.emp.locked_fields)
        # BSS sync must not overwrite the hand-edited bank / statutory data
        from payroll_engine import bss_adapter
        bss_adapter.sync_employees(self.org, force=True)
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.bank_info["ifscCode"], "HDFC0000001")
        self.assertEqual(self.emp.statutory_info["uan"], "999999999999")
        res = self.hr.put(url, {"payrollInfo": {"baseSalary": "abc"}}, format="json")
        self.assertEqual(res.status_code, 500)
        self.assertIn("Cast to Number failed", res.json()["message"])
        self.assertEqual(self.hr.put(BASE + "employee/nope/payrollInfo", {}, format="json").status_code, 404)

    def test_component_overrides_and_preview(self):
        self.seed_components()
        url = BASE + f"employee/{self.emp.pk}/component-overrides"
        self.assertEqual(self.hr.put(url, {"componentOverrides": "x"}, format="json").status_code, 400)
        self.assertEqual(self.hr.put(BASE + "employee/nope/component-overrides", {"componentOverrides": []},
                                     format="json").status_code, 404)
        res = self.hr.put(url, {"componentOverrides": [
            {"category": "earnings", "name": "HRA", "overrideAmount": 3000},
            {"category": "earnings", "name": "Basic Salary", "overrideAmount": 1}],
            "payrollInfo": {"grossSalary": 40000}}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        d = res.json()["data"]
        self.assertEqual([o["name"] for o in d["componentOverrides"]], ["HRA"])
        self.assertEqual(d["payrollInfo"]["grossSalary"], 40000)
        self.assertIn("totals", d["preview"])
        prev = self.hr.get(BASE + f"employee/{self.emp.pk}/salary-structure-preview").json()["data"]
        self.assertEqual(prev["inputMode"], "gross")
        self.assertEqual(prev["salaryBases"]["grossSalary"], 40000)
        self.assertEqual(self.worker.put(url, {"componentOverrides": []}, format="json").status_code, 403)
        self.other.payroll_info = {**self.other.payroll_info, "baseSalary": 0, "grossSalary": 0}
        self.other.save()
        res = self.hr.get(BASE + f"employee/{self.other.pk}/salary-structure-preview")
        self.assertEqual(res.status_code, 400)

    def test_salary_components_and_bulk(self):
        self.seed_components()
        d = self.worker.get(BASE + "salaryComponents").json()["data"]
        self.assertEqual(d["summary"]["totalReimbursements"], 2)
        res = self.hr.post(BASE + "bulkUpdatePayrollInfo", {"employees": []}, format="json")
        self.assertEqual(res.json()["message"], "Employees array is required")
        res = self.hr.post(BASE + "bulkUpdatePayrollInfo", {"employees": [
            {"employeeId": str(self.emp.pk), "baseSalary": 20000}, {"employeeId": "nope", "baseSalary": 1},
            {"employeeId": str(self.emp.pk)}]}, format="json")
        d = res.json()["data"]
        self.assertEqual((d["total"], d["successful"], d["failed"]), (3, 1, 2))
        self.assertEqual(d["errors"][0]["error"], "Employee not found")
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.payroll_info["baseSalary"], 20000)
        self.assertNotIn("netPay", self.emp.payroll_info)
        self.assertEqual(self.worker.post(BASE + "bulkUpdatePayrollInfo", {}, format="json").status_code, 403)
