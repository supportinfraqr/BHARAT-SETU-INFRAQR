"""API tests for TDS management, Form 16, claims & declarations + builder / PDF checks.

Differential JS-vs-Python tests of the tax computation live in ``test_tds_parity.py``.
The JS builders (taxReportBuilder / form16Builder) query Mongo internally, so their Python
ports are checked against hand-verified expected payloads below.
"""

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from payroll_engine.models import ClaimsDeclaration, EmployeeTDS, PayrollEmployee, PayrollRun
from payroll_engine.services.financial_year import resolve_financial_year_input
from payroll_engine.services.form16_builder import build_form16_from
from payroll_engine.services.form16_pdf import (build_form16_part_a_pdf_buffer, build_form16_part_b_pdf_buffer,
                                                build_form16_pdf_buffer, format_inr, locale_datetime_en_in)
from payroll_engine.services.tax_report_builder import build_tax_report_from
from payroll_engine.services.tax_report_pdf import build_tax_report_filename, build_tax_report_pdf_buffer

from .fixtures import BASE, client_for, make_org_world

FY = "2025-26"


class TdsApiBase(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2)
        self.hr = client_for(self.world["contractor"])
        self.hr.get(BASE + "employees")  # sync employees
        self.emps = list(PayrollEmployee.objects.filter(org=self.world["contractor"]).order_by("unique_id"))
        for emp in self.emps:
            emp.payroll_info = {**emp.payroll_info, "baseSalary": 50000, "grossSalary": 80000, "ctc": 90000}
            emp.save()
        self.emp = self.emps[0]
        self.other = self.emps[1]
        self.worker = client_for(self.emp.worker)

    def calc(self, emp=None, **body):
        emp = emp or self.emp
        return self.hr.post(BASE + f"tds/calculate/{emp.pk}", {"financialYear": FY, **body}, format="json")


class TdsConfigTests(TdsApiBase):
    def test_get_creates_default_and_post_saves(self):
        res = self.hr.get(BASE + "tds/config", {"financialYear": FY})
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["financialYear"], "2025-2026")
        self.assertEqual(len(data["newRegimeSlabs"]), 7)
        self.assertEqual(data["exemptionLimits"]["section80D"], 100000)
        res = self.hr.post(BASE + "tds/config", {
            "financialYear": "2025-2026", "standardDeduction": "60000",
            "newRegimeSlabs": data["newRegimeSlabs"][:4], "exemptionLimits": {"section80TTA": 5000}},
            format="json")
        self.assertEqual(res.status_code, 200, res.content)
        saved = res.json()["data"]
        self.assertEqual(saved["standardDeduction"], 60000)
        self.assertEqual(len(saved["newRegimeSlabs"]), 7)  # 4-slab prefix completed
        self.assertEqual(saved["exemptionLimits"]["section80TTA"], 5000)
        self.assertEqual(saved["message"] if "message" in saved else "ok", "ok")

    def test_validation_and_access(self):
        self.assertEqual(self.hr.get(BASE + "tds/config").json()["message"], "Financial year is required")
        res = self.hr.get(BASE + "tds/config", {"financialYear": "2025"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid financial year", res.json()["message"])
        self.assertEqual(self.worker.get(BASE + "tds/config", {"financialYear": FY}).status_code, 403)
        self.assertEqual(self.worker.post(BASE + "tds/config", {"financialYear": FY}, format="json").status_code, 403)


class TdsCalculateTests(TdsApiBase):
    def test_new_regime_rebate(self):
        res = self.calc()
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        rec = data["employeeTDS"]
        # gross 80,000 x 12 = 9,60,000; new-regime standard deduction 75,000 -> 8,85,000 (<= 12L rebate)
        self.assertEqual(rec["taxableIncome"], 885000)
        self.assertEqual(rec["taxPayable"]["incomeTax"], 28500)
        self.assertEqual(rec["taxPayable"]["total"], 0)
        self.assertTrue(rec["rebateApplicable"])
        self.assertTrue(rec["adminCalculated"])
        self.assertNotIn("gross", rec["projectedAnnualIncome"])  # Mongoose strict schema
        self.assertEqual(data["breakdown"]["hraReceived"]["source"], "fallback_gross_40_percent")
        self.assertEqual(data["breakdown"]["hraReceived"]["monthlyAmount"], 32000)
        self.assertEqual(data["fullYear"]["taxableIncome"], 885000)
        self.assertEqual(rec["tdsPeriod"]["start"], "2025-03-31T18:30:00.000Z")

    def test_old_regime_with_80c(self):
        res = self.calc(taxRegime="old", declaredDeductions={"section80C": 200000})
        rec = res.json()["data"]["employeeTDS"]
        # 9,60,000 - 50,000 std - 1,50,000 (80C cap) = 7,60,000 -> 64,499.75 + 4% cess = 67,080
        self.assertEqual(rec["taxRegime"], "old")
        self.assertEqual(rec["taxableIncome"], 760000)
        self.assertEqual(rec["taxPayable"]["total"], 67080)
        self.assertEqual(rec["monthlyTDS"] > 0, True)

    def test_errors_and_access(self):
        res = self.hr.post(BASE + "tds/calculate/00000000-0000-0000-0000-000000000000",
                           {"financialYear": FY}, format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["message"], "Employee not found")
        self.assertEqual(self.hr.post(BASE + f"tds/calculate/{self.emp.pk}", {}, format="json").status_code, 400)
        self.assertEqual(self.worker.post(BASE + f"tds/calculate/{self.emp.pk}", {"financialYear": FY},
                                          format="json").status_code, 403)

    def test_bulk_calculate(self):
        res = self.hr.post(BASE + "tds/bulkCalculate", {"financialYear": FY}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["total"], 2)
        self.assertTrue(all(r["status"] == "success" for r in data["results"]), data)
        self.assertEqual(EmployeeTDS.objects.filter(admin_calculated=True).count(), 2)
        self.assertEqual(self.worker.post(BASE + "tds/bulkCalculate", {"financialYear": FY},
                                          format="json").status_code, 403)


class TdsReadTests(TdsApiBase):
    def test_employee_tds_and_scoping(self):
        res = self.hr.get(BASE + f"tds/employee/{self.emp.pk}", {"financialYear": FY})
        self.assertTrue(res.json()["data"]["isNew"])
        self.calc()
        res = self.hr.get(BASE + f"tds/employee/{self.emp.pk}", {"financialYear": FY})
        data = res.json()["data"]
        self.assertEqual(data["employeeId"]["_id"], str(self.emp.pk))
        self.assertEqual(data["taxableIncome"], 885000)
        self.assertIn("rebateApplicable", data["taxPayable"])  # live projection, not the stored doc
        mine = self.worker.get(BASE + f"tds/employee/{self.emp.pk}", {"financialYear": FY})
        self.assertEqual(mine.status_code, 200)
        self.assertEqual(self.worker.get(BASE + f"tds/employee/{self.other.pk}",
                                         {"financialYear": FY}).status_code, 404)

    def test_hra_details(self):
        res = self.hr.get(BASE + f"tds/hra-details/{self.emp.pk}", {"financialYear": FY})
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["financialYear"], "2025-2026")
        self.assertEqual(data["hraReceived"]["annualAmount"], 384000)
        self.assertEqual(self.worker.get(BASE + f"tds/hra-details/{self.emp.pk}").status_code, 200)
        self.assertEqual(self.worker.get(BASE + f"tds/hra-details/{self.other.pk}").status_code, 404)

    def test_list_search_and_delete(self):
        self.calc()
        res = self.hr.get(BASE + "tds/list", {"financialYear": FY})
        self.assertEqual(res.json()["data"]["total"], 1)
        record = res.json()["data"]["records"][0]
        self.assertEqual(record["employeeId"]["uniqueId"], self.emp.unique_id)
        self.assertEqual(self.hr.get(BASE + "tds/list", {"financialYear": FY, "search": "nobody"}).json()["data"]["total"], 0)
        self.assertEqual(self.hr.get(BASE + "tds/list", {"financialYear": FY, "taxRegime": "old"}).json()["data"]["total"], 0)
        self.assertEqual(self.worker.get(BASE + "tds/list", {"financialYear": FY}).status_code, 403)
        self.assertEqual(self.hr.delete(BASE + f"tds/record/{record['_id']}").status_code, 200)
        res = self.hr.delete(BASE + f"tds/record/{record['_id']}")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["message"], "TDS record not found")

    def test_tax_reports(self):
        res = self.hr.get(BASE + f"tds/tax-report/{self.emp.pk}", {"financialYear": FY})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertFalse(res.json()["data"]["tdsCalculated"])
        self.calc()
        data = self.hr.get(BASE + f"tds/tax-report/{self.emp.pk}", {"financialYear": FY}).json()["data"]
        self.assertTrue(data["tdsCalculated"])
        self.assertEqual(data["summary"]["taxableIncome"], 885000)
        self.assertEqual(data["employee"]["pan"], "ABCDE1234F")
        self.assertEqual(data["assessmentYear"], "AY 2026-27")
        pdf = self.hr.get(BASE + f"tds/tax-report/{self.emp.pk}/download", {"financialYear": FY})
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf["Content-Type"], "application/pdf")
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertIn("TaxReport_", pdf["Content-Disposition"])
        for path in ("tds/tax-report", "employee/tax-report"):
            mine = self.worker.get(BASE + path, {"financialYear": FY})
            self.assertEqual(mine.status_code, 200, mine.content)
            self.assertEqual(mine.json()["data"]["employee"]["employeeId"], str(self.emp.pk))
            dl = self.worker.get(BASE + path + "/download", {"financialYear": FY})
            self.assertTrue(dl.content.startswith(b"%PDF"))
            self.assertEqual(self.hr.get(BASE + path, {"financialYear": FY}).status_code, 403)
        self.assertEqual(self.hr.get(BASE + "tds/tax-report/not-an-id", {"financialYear": FY}).json()["message"],
                         "Invalid employee id")
        self.assertEqual(self.worker.get(BASE + f"tds/tax-report/{self.emp.pk}", {"financialYear": FY}).status_code, 403)
        self.assertEqual(self.worker.get(BASE + "tds/tax-report").status_code, 400)


class TdsDeclarationTests(TdsApiBase):
    def test_hr_declaration_update_lock_and_proof_status(self):
        res = self.hr.put(BASE + f"tds/declaration/{self.emp.pk}", {"financialYear": FY}, format="json")
        self.assertEqual(res.status_code, 404)
        self.calc()
        res = self.hr.put(BASE + f"tds/declaration/{self.emp.pk}", {
            "financialYear": FY, "investments80C": [{"investmentType": "PPF", "amount": 90000}],
            "proofItems": [{"lineKey": "80C-1", "status": "approved", "acceptedAmount": 90000}]}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["declaredDeductions"]["section80C"], 90000)
        self.assertEqual(data["proofStatus"], "approved")
        self.assertEqual(self.worker.put(BASE + f"tds/declaration/{self.emp.pk}", {"financialYear": FY},
                                         format="json").status_code, 403)

        res = self.hr.put(BASE + f"tds/proof-status/{self.emp.pk}", {"financialYear": FY, "status": "maybe"},
                          format="json")
        self.assertEqual(res.json()["message"], "Status must be approved or rejected")
        res = self.hr.put(BASE + f"tds/proof-status/{self.emp.pk}",
                          {"financialYear": FY, "status": "reject", "remarks": "  missing receipt "}, format="json")
        self.assertEqual(res.json()["message"], "Investment proof rejected successfully")
        self.assertEqual(res.json()["data"]["proofRemarks"], "missing receipt")
        self.assertEqual(self.hr.put(BASE + f"tds/proof-status/{self.other.pk}",
                                     {"financialYear": FY, "status": "approved"}, format="json").status_code, 404)

        res = self.hr.put(BASE + f"tds/lock/{self.emp.pk}", {"financialYear": FY, "isLocked": True}, format="json")
        self.assertEqual(res.json()["message"], "TDS locked successfully")
        res = self.hr.put(BASE + f"tds/declaration/{self.emp.pk}", {"financialYear": FY, "declaredDeductions": {}},
                          format="json")
        self.assertEqual(res.json()["message"], "Investment declaration is frozen. You cannot edit it.")
        res = self.worker.put(BASE + "tds/investment-declaration", {"financialYear": FY}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.hr.put(BASE + f"tds/lock/{self.emp.pk}", {"financialYear": FY, "isLocked": False}, format="json")
        self.assertEqual(res.json()["message"], "TDS unlocked successfully")
        self.assertEqual(self.hr.put(BASE + f"tds/lock/{self.other.pk}", {"financialYear": FY},
                                     format="json").status_code, 404)

    def test_employee_save_and_delete_declaration(self):
        body = {"financialYear": FY, "taxRegime": "old",
                "investments80C": [{"investmentType": "ELSS", "amount": 120000}],
                "investments80D": [{"investmentType": "Self premium", "amount": 20000}],
                "itDeclaration": {"stayingInRentedHouse": True,
                                  "rentEntries": [{"fromDate": "2025-04-01", "toDate": "2026-03-31",
                                                   "rentMonthly": 20000, "isMetroCity": True}]}}
        res = self.worker.put(BASE + "tds/investment-declaration", body, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["employeeTDS"]["taxRegime"], "old")
        self.assertTrue(data["employeeTDS"]["hasInvestmentDeclaration"])
        self.assertEqual(data["aggregates"]["section80C"], 120000)
        self.assertEqual(data["aggregates"]["rentEntries"], 1)
        self.assertIn(data["saveAndCompare"]["recommendedRegime"], ("old", "new"))
        self.assertEqual(data["saveAndCompare"]["oldRegime"]["exemptionsBasedOnDeclaration"]["investments80C"], 120000)
        self.assertIsNotNone(data["tdsPreview"])
        bad = self.worker.put(BASE + "tds/investment-declaration", {"financialYear": FY, "taxRegime": "mid"},
                              format="json")
        self.assertEqual(bad.json()["message"], 'taxRegime must be "old" or "new"')
        self.assertEqual(self.hr.put(BASE + "tds/investment-declaration", body, format="json").status_code, 403)
        # declaration-only row is deleted outright
        res = self.worker.delete(BASE + f"tds/investment-declaration?financialYear={FY}")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertFalse(EmployeeTDS.objects.filter(employee=self.emp).exists())
        res = self.worker.delete(BASE + f"tds/investment-declaration?financialYear={FY}")
        self.assertEqual(res.json()["message"], "Investment declaration not found")

    def test_delete_keeps_calculated_row(self):
        self.calc()
        self.worker.put(BASE + "tds/investment-declaration",
                        {"financialYear": FY, "investments80C": [{"investmentType": "PPF", "amount": 5000}]},
                        format="json")
        res = self.worker.delete(BASE + f"tds/investment-declaration?financialYear={FY}")
        self.assertEqual(res.status_code, 200)
        rec = EmployeeTDS.objects.get(employee=self.emp)
        self.assertFalse(rec.has_investment_declaration)
        self.assertEqual(rec.investments80_c, [])
        self.assertEqual(rec.declared_deductions["section80C"], 0)

    def test_submit_investment_proof_multipart(self):
        upload = SimpleUploadedFile("ppf.pdf", b"%PDF-1.4 proof", content_type="application/pdf")
        res = self.worker.put(BASE + "tds/submitInvestmentproof", {
            "financialYear": FY,
            "investments80C": '[{"investmentType":"PPF","amount":"40000"}]',
            "itDeclaration": '{"homeLoanSelfOccupied":{"enabled":true,"principalPaid":10000,"interestPaid":50000}}',
            "investment80CAttachments": upload,
        }, format="multipart")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        rec = data["employeeTDS"]
        self.assertEqual(rec["proofStatus"], "submitted")
        self.assertTrue(rec["investments80C"][0]["attachment"].startswith("/v1/payroll-engine/files/"))
        self.assertEqual(data["aggregates"]["section80C"], 50000)
        self.assertEqual(data["aggregates"]["section24"], 50000)
        bad = self.worker.put(BASE + "tds/submitInvestmentproof",
                              {"financialYear": FY, "itDeclaration": "{broken"}, format="multipart")
        self.assertEqual(bad.json()["message"], "itDeclaration must be valid JSON")
        self.assertEqual(self.hr.put(BASE + "tds/submitInvestmentproof", {"financialYear": FY},
                                     format="multipart").status_code, 403)


class Form16ApiTests(TdsApiBase):
    def test_form16_routes(self):
        res = self.hr.get(BASE + f"form16/{self.emp.pk}", {"financialYear": FY})
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["message"],
                         "TDS record not found for this financial year. Calculate employee TDS first.")
        self.assertEqual(self.hr.get(BASE + f"form16/{self.emp.pk}").json()["message"],
                         "financialYear is required (e.g. 2025-26)")
        self.calc()
        EmployeeTDS.objects.filter(employee=self.emp).update(monthly_deductions=[
            {"_id": "a", "month": "Apr", "year": 2025, "tdsDeducted": 1200},
            {"_id": "b", "month": "Jan", "year": 2026, "tdsDeducted": 800}])
        data = self.hr.get(BASE + f"form16/{self.emp.pk}", {"financialYear": FY}).json()["data"]
        self.assertEqual(data["employerDetails"]["pan"], "AABCB1234B")
        self.assertEqual(data["employerDetails"]["tan"], "")
        self.assertEqual(data["employerDetails"]["name"], "BuildWell Contractors")
        self.assertEqual(data["employeeDetails"]["pan"], "ABCDE1234F")
        self.assertEqual(data["totalTDSDeducted"], 2000)
        self.assertEqual([q["tdsDeducted"] for q in data["partA"]["quarterlyTds"]], [1200, 0, 0, 800])
        self.assertEqual(data["partB"]["incomeChargeableUnderSalaryHead"], 885000)
        pdf = self.hr.get(BASE + f"form16/{self.emp.pk}/download", {"financialYear": FY})
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertIn("Form16_", pdf["Content-Disposition"])

        summary = self.hr.get(BASE + "form16/summary", {"financialYear": FY}).json()["data"]
        self.assertEqual(summary["financialYear"], "2025-26")
        self.assertEqual(summary["summary"]["totalEmployees"], 1)
        self.assertEqual(summary["summary"]["regimeWise"], {"new": 1, "old": 0})
        bulk = self.hr.post(BASE + "form16/bulk", {"financialYear": FY}, format="json").json()["data"]
        self.assertEqual((bulk["total"], bulk["ready"], bulk["failed"]), (1, 1, 0))
        self.assertEqual(self.hr.post(BASE + "form16/bulk", {}, format="json").json()["message"],
                         "financialYear is required")
        self.assertEqual(self.worker.get(BASE + "form16/summary", {"financialYear": FY}).status_code, 403)
        self.assertEqual(self.worker.get(BASE + f"form16/{self.emp.pk}", {"financialYear": FY}).status_code, 403)
        mine = self.worker.get(BASE + "employee/form16", {"financialYear": FY})
        self.assertEqual(mine.status_code, 200, mine.content)
        for part in ("employee/form16/download", "employee/form16/part-a/download", "employee/form16/part-b/download"):
            self.assertTrue(self.worker.get(BASE + part, {"financialYear": FY}).content.startswith(b"%PDF"))


class ClaimsApiTests(TdsApiBase):
    def test_flow_and_access(self):
        me, other = self.emp.pk, self.other.pk
        self.assertEqual(self.worker.get(BASE + f"allClaims/{me}").json()["data"], {})
        res = self.worker.post(BASE + f"flexiblePlan/{me}", {"componentName": "Fuel"}, format="json")
        self.assertEqual(res.json()["message"], "Component name and amount are required")
        res = self.worker.post(BASE + f"flexiblePlan/{me}", {"componentName": "Fuel", "amount": 2000, "month": "Apr"},
                               format="json")
        self.assertEqual(res.status_code, 200, res.content)
        plan = res.json()["data"]["flexibleBenefitPlan"][0]
        self.assertEqual(plan["status"], "pending")
        self.assertEqual(self.worker.post(BASE + f"flexiblePlan/{other}", {"componentName": "x", "amount": 1},
                                          format="json").status_code, 404)
        self.assertEqual(self.worker.put(BASE + f"flexiblePlan/{me}/{plan['_id']}/status", {"status": "approved"},
                                         format="json").status_code, 403)
        self.assertEqual(self.hr.put(BASE + f"flexiblePlan/{me}/{plan['_id']}/status", {"status": "ok"},
                                     format="json").status_code, 400)
        res = self.hr.put(BASE + f"flexiblePlan/{me}/{plan['_id']}/status", {"status": "approved", "amount": 1500},
                          format="json")
        self.assertEqual(res.json()["data"]["flexibleBenefitPlan"][0]["amount"], 1500)
        self.assertEqual(self.hr.put(BASE + f"flexiblePlan/{me}/nope/status", {"status": "approved"},
                                     format="json").json()["message"], "Flexible plan not found")
        self.assertEqual(len(self.hr.get(BASE + f"flexiblePlan/{me}").json()["data"]), 1)

        res = self.worker.post(BASE + f"reimbursement/{me}", {"name": "Taxi", "type": "travel", "claimedAmount": 500},
                               format="json")
        claim = res.json()["data"]["reimbursements"][0]
        self.assertEqual(claim["approvedAmount"], 0)
        res = self.hr.put(BASE + f"reimbursement/{me}/{claim['_id']}/status",
                          {"status": "approved", "approvedAmount": 450}, format="json")
        self.assertEqual(res.json()["message"], "Reimbursement status updated successfully")
        self.assertEqual(self.worker.get(BASE + f"reimbursement/{me}").json()["data"][0]["approvedAmount"], 450)
        self.assertEqual(self.hr.put(BASE + f"reimbursement/{other}/x/status", {"status": "approved"},
                                     format="json").json()["message"], "No claims found for this employee")

        res = self.worker.post(BASE + f"taxDeclaration/{me}", {"section": "80C", "amountDeclared": 10000}, format="json")
        decl = res.json()["data"]["incomeTaxDeclarations"][0]
        self.assertEqual(self.worker.put(BASE + f"taxDeclaration/{me}/{decl['_id']}", {"amountApproved": 1},
                                         format="json").status_code, 403)
        res = self.hr.put(BASE + f"taxDeclaration/{me}/{decl['_id']}", {"amountApproved": 9000}, format="json")
        self.assertEqual(res.json()["data"]["incomeTaxDeclarations"][0]["amountApproved"], 9000)
        self.assertEqual(self.worker.get(BASE + f"taxDeclaration/{me}").json()["data"][0]["section"], "80C")

        self.assertEqual(self.worker.post(BASE + f"investmentProof/{me}", {"declarationId": decl["_id"]},
                                          format="json").status_code, 400)
        res = self.worker.post(BASE + f"investmentProof/{me}", {"declarationId": decl["_id"], "fileUrl": "/f.pdf"},
                               format="json")
        proof = res.json()["data"]["investmentProofs"][0]
        self.assertEqual(self.hr.put(BASE + f"investmentProof/{me}/{proof['_id']}/verify", {"status": "approved"},
                                     format="json").json()["message"], "Invalid status")
        res = self.hr.put(BASE + f"investmentProof/{me}/{proof['_id']}/verify",
                          {"status": "verified", "verifiedBy": "HR"}, format="json")
        self.assertEqual(res.json()["data"]["investmentProofs"][0]["verifiedBy"], "HR")
        self.assertEqual(len(self.hr.get(BASE + f"investmentProof/{me}").json()["data"]), 1)
        doc = self.hr.get(BASE + f"allClaims/{me}").json()["data"]
        self.assertEqual(doc["employeeId"], str(me))
        self.assertEqual(ClaimsDeclaration.objects.count(), 1)
        self.assertEqual(self.worker.get(BASE + f"allClaims/{other}").status_code, 404)
        self.assertEqual(self.hr.get(BASE + f"reimbursement/{other}").json()["data"], [])


class BuilderAndPdfTests(TestCase):
    """Hand-verified expected payloads (the legacy builders read Mongo directly)."""

    fy = resolve_financial_year_input("2025-26")
    employee = {"firstName": "Ramesh", "lastName": "Kumar", "uniqueId": "BSSW1", "jobTitle": "Mason",
                "payrollInfo": {}, "nationalID": {"pan": "ABCDE1234F"},
                "presentAddress": {"address": "Plot 4", "city": "Mundra", "state": "Gujarat", "pin": "370421"}}
    record = {
        "_id": "rec1", "taxRegime": "old", "updatedAt": "2025-10-01T00:00:00Z",
        "projectedAnnualIncome": {"basic": 600000, "hra": 240000, "allowances": 120000, "otherIncome": 10000,
                                  "total": 970000},
        "declaredDeductions": {"section80C": 150000, "section80D": 25000, "section24": 0, "professionalTax": 2400,
                               "standardDeduction": 50000, "total": 227400},
        "hraExemption": {"actualHRA": 240000, "rentPaid": 240000, "exemptAmount": 180000},
        "taxableIncome": 562600, "taxPayable": {"incomeTax": 25020, "surcharge": 0, "cess": 1001, "total": 26021},
        "rebateApplicable": False, "rebateAmount": 0, "monthlyTDS": 2168,
        "monthlyDeductions": [{"month": "May", "year": 2025, "tdsDeducted": 2168},
                              {"month": "Apr", "year": 2025, "tdsDeducted": 2168},
                              {"month": "Apr", "year": 2025, "tdsDeducted": 100},
                              {"month": "Feb", "year": 2026, "tdsDeducted": 0}],
        "investments80C": [{"investmentType": "PPF", "amount": 150000}], "investments80D": [],
        "proofStatus": "submitted", "proofSubmitted": True,
    }

    def test_tax_report_builder(self):
        data = build_tax_report_from("e1", self.employee, self.record, [], self.fy, generated_on="G")
        self.assertEqual(data["employee"], {"employeeId": "e1", "employeeName": "Ramesh Kumar", "employeeCode": "BSSW1",
                                            "pan": "ABCDE1234F", "designation": "Mason"})
        self.assertEqual(data["summary"]["totalTDSDeducted"], 4436)
        self.assertEqual(data["summary"]["pendingTDS"], 26021 - 4436)
        self.assertEqual([r["month"] for r in data["tdsDeductions"]["monthWise"]], ["Apr", "Apr", "May"])
        self.assertEqual(data["tdsDeductions"]["quarterly"][0],
                         {"quarter": "Q1", "period": "April 2025 – June 2025", "tdsDeducted": 4436})
        self.assertEqual(data["income"]["incomeFromSalary"], 970000 - 50000 - 2400 - 180000)
        self.assertEqual(data["chapter6A"]["totalChapter6A"], 175000)
        self.assertEqual(data["taxComputation"]["netTaxLiability"], 26021)
        self.assertEqual(data["assessmentYear"], "AY 2026-27")
        empty = build_tax_report_from("e1", self.employee, None, [{"month": "Apr", "year": 2025}], self.fy, "G")
        self.assertEqual(empty["payrollMonthsProcessed"], 1)
        self.assertFalse(empty["tdsCalculated"])
        self.assertEqual(build_tax_report_filename(data), "TaxReport_BSSW1_2025-2026.pdf")

    def test_form16_builder_dedupes_and_falls_back_to_payroll(self):
        org = {"organizationName": "BuildWell", "organizationAddress": " Mundra ", "tan": "", "pan": "AABCB1234B"}
        data = build_form16_from(self.employee, org, self.record, [], self.fy, "G")
        self.assertEqual(data["totalTDSDeducted"], 4336)  # duplicate Apr row dropped
        self.assertEqual(data["employeeDetails"]["employeeName"], "RAMESH KUMAR")
        self.assertEqual(data["employeeDetails"]["address"], "Plot 4, Mundra, Gujarat, 370421")
        self.assertEqual(data["employerDetails"], {"name": "BuildWell", "address": "Mundra", "tan": "",
                                                   "pan": "AABCB1234B"})
        self.assertEqual(data["partC"]["total"], 175000)
        self.assertEqual(data["partB"]["incomeChargeableUnderSalaryHead"], 970000 - 50000 - 2400 - 180000)
        self.assertEqual(data["assessmentYear"], "AY 2026-2027")
        rec = {**self.record, "monthlyDeductions": []}
        payrolls = [{"_id": "p2", "month": "Jun", "year": 2025, "deductions": [{"componentName": "TDS", "amount": 700}]},
                    {"_id": "p1", "month": "Apr", "year": 2025, "deductions": [{"componentName": "Income Tax (TDS)",
                                                                                   "amount": 300}]},
                    {"_id": "p3", "month": "May", "year": 2025, "deductions": [{"componentName": "PF", "amount": 9}]}]
        data = build_form16_from(self.employee, None, rec, payrolls, self.fy, "G")
        self.assertEqual([r["payrollId"] for r in data["partE"]], ["p1", "p2"])
        self.assertEqual(data["employerDetails"]["name"], "Organization")
        self.assertEqual(data["payrollMonthsProcessed"], 3)

    def test_pdfs_and_formatting(self):
        org = {"organizationName": "BuildWell", "organizationAddress": "Mundra", "pan": "AABCB1234B"}
        rec = {**self.record, "monthlyDeductions": [{"month": m, "year": 2025, "tdsDeducted": 1000 + i}
                                                    for i, m in enumerate(["Apr", "May", "Jun", "Jul", "Aug", "Sep",
                                                                           "Oct", "Nov", "Dec"])]}
        data = build_form16_from(self.employee, org, rec, [], self.fy, "2026-10-28T03:04:05.000Z")
        for builder in (build_form16_pdf_buffer, build_form16_part_a_pdf_buffer, build_form16_part_b_pdf_buffer):
            self.assertTrue(builder(data).startswith(b"%PDF"))
        report = build_tax_report_from("e1", self.employee, rec, [], self.fy, "2026-10-28T03:04:05.000Z")
        self.assertTrue(build_tax_report_pdf_buffer(report).startswith(b"%PDF"))
        self.assertEqual(format_inr(1234.5), "1,235")
        self.assertEqual(format_inr(12345678.49), "1,23,45,678")
        self.assertEqual(format_inr(-0.4), "-0")
        self.assertEqual(locale_datetime_en_in("2026-10-28T03:04:05.000Z"), "28/10/2026, 8:34:05 am")
        self.assertEqual(locale_datetime_en_in("2026-01-02T15:04:05.000Z"), "2/1/2026, 8:34:05 pm")

    def test_payroll_run_fallback_via_api_models(self):
        world = make_org_world(n_workers=1, suffix="9")
        hr = client_for(world["contractor"])
        hr.get(BASE + "employees")
        emp = PayrollEmployee.objects.get(org=world["contractor"])
        PayrollRun.objects.create(org=world["contractor"], employee=emp, month="Apr", year=2025,
                                  deductions=[{"componentName": "TDS", "amount": 1500}])
        hr.post(BASE + f"tds/calculate/{emp.pk}", {"financialYear": FY}, format="json")
        data = hr.get(BASE + f"tds/tax-report/{emp.pk}", {"financialYear": FY}).json()["data"]
        self.assertEqual(data["payrollMonthsProcessed"], 1)
        self.assertEqual(data["tdsDeductions"]["monthWise"][0]["tdsDeducted"], 1500)
        self.assertEqual(data["tdsDeductions"]["monthWise"][0]["year"], 2025)
