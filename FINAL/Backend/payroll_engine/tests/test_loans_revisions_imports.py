"""API tests: loans, VPF, arrears, salary revisions and payroll imports (DRF client, real
BSS contractor/worker fixture). Pure-helper parity lives in
``test_loans_revisions_imports_parity``."""

import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from payroll_engine.models import (Arrears, EmployeeLoan, LoanRepayment, PayrollAuditLog,
                                   PayrollEmployee, PayrollOneTimeImport,
                                   PayrollSalaryRevisionImport, SalaryCompensation, SalaryRevision)
from payroll_engine.services import loan_helper, loan_perquisite_helper
from payroll_engine.services.one_time_import_helper import load_confirmed_one_time_import_rows

from .fixtures import BASE, client_for, make_org_world

CSV = "text/csv"


def seed_components(org):
    SalaryCompensation.objects.create(org=org, category="earnings", components=[
        {"name": "Basic Salary", "code": "BASIC", "calculationType": "percentage", "basedOn": "gross",
         "value": 50, "status": "active"},
        {"name": "HRA", "code": "HRA", "calculationType": "percentage", "basedOn": "basic",
         "value": 40, "status": "active"},
        {"name": "Diwali Bonus", "code": "DB", "calculationType": "fixed", "value": 0, "status": "active"},
    ])
    SalaryCompensation.objects.create(org=org, category="deductions", components=[
        {"name": "Canteen", "code": "CANTEEN", "calculationType": "fixed", "value": 300, "status": "active"},
    ])


class Base(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2)
        self.org = self.world["contractor"]
        self.hr = client_for(self.org)
        self.worker = client_for(self.world["workers"][0])
        self.hr.get(BASE + "employees")  # sync
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("unique_id"))
        self.emp = PayrollEmployee.objects.get(org=self.org, worker=self.world["workers"][0])
        seed_components(self.org)

    def post(self, path, data=None, client=None):
        return (client or self.hr).post(BASE + path, data or {}, format="json")

    def put(self, path, data=None, client=None):
        return (client or self.hr).put(BASE + path, data or {}, format="json")


class LoanApiTests(Base):
    def _type(self, name="Housing", rate=8):
        res = self.post("loan/create-loan-type", {"loanName": name, "perquisiteRate": rate})
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()["data"]

    def _loan(self, type_id, **extra):
        body = {"loanTypeId": type_id, "employeeId": str(self.emp.pk), "loanAmount": 100000,
                "installmentAmount": 30000, "disbursementDate": "15/03/2025",
                "emiStartMonth": "Apr", "emiStartYear": 2025, **extra}
        return self.post("loan/create-loan", body)

    def test_loan_type_crud_and_validation(self):
        lt = self._type()
        self.assertEqual(lt["loanName"], "Housing")
        self.assertEqual(self.post("loan/create-loan-type", {"loanName": "Housing"}).json()["message"],
                         "Loan name already exists")
        self.assertEqual(self.post("loan/create-loan-type", {}).json()["message"], "loanName is required")
        self.assertEqual(self.post("loan/create-loan-type", {"loanName": "X", "perquisiteRate": -1})
                         .json()["message"], "Perquisite rate must be a number >= 0")
        res = self.hr.get(BASE + "loan/get-loan-types?search=hous")
        self.assertEqual(res.json()["data"]["total"], 1)
        self.assertEqual(self.hr.get(BASE + f"loan/get-loan-typeById/{lt['_id']}").status_code, 200)
        self.assertEqual(self.hr.get(BASE + "loan/get-loan-typeById/nope").status_code, 404)
        res = self.put(f"loan/upadte-loan-type/{lt['_id']}", {"status": "inactive", "perquisiteRate": "9"})
        self.assertEqual(res.json()["data"]["status"], "inactive")
        self.assertEqual(self.put(f"loan/upadte-loan-type/{lt['_id']}", {"status": "x"}).status_code, 400)
        self.assertEqual(self.hr.get(BASE + "loan/get-loan-types").json()["data"]["total"], 0)
        self.assertEqual(self.hr.get(BASE + "loan/get-loan-types?includeInactive=true")
                         .json()["data"]["total"], 1)
        res = self.hr.delete(BASE + f"loan/delete-loan-type/{lt['_id']}")
        self.assertEqual(res.json()["data"], {"loanTypeId": lt["_id"]})

    def test_delete_type_with_loans_blocked(self):
        lt = self._type()
        self._loan(lt["_id"])
        res = self.hr.delete(BASE + f"loan/delete-loan-type/{lt['_id']}")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"], "Cannot delete loan type while employee loans are linked to it")

    def test_create_loan_schedule_and_repayment(self):
        lt = self._type()
        res = self._loan(lt["_id"])
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()["data"]
        rs = data["repaymentSummary"]
        self.assertEqual(rs["totalInstallments"], 4)
        self.assertEqual(rs["lastInstallmentAmount"], 10000)
        self.assertEqual(rs["emiStartMonthLabel"], "Apr 2025")
        self.assertEqual(rs["loanClosingDate"], "2025-07-01T00:00:00.000Z")
        self.assertEqual(rs["nextInstallmentLabel"], "Apr 2025")
        self.assertIn("4 installments", rs["message"])
        self.assertEqual(data["loan"]["loanNumber"], "LN-00001")
        loan_id = data["loan"]["_id"]
        self.assertEqual(self._loan(lt["_id"]).json()["data"]["loan"]["loanNumber"], "LN-00002")
        # validation
        self.assertEqual(self._loan(lt["_id"], installmentAmount=200000).json()["message"],
                         "installmentAmount cannot exceed loanAmount")
        self.assertEqual(self._loan(lt["_id"], disbursementDate="31/02/2025").json()["message"],
                         "Invalid disbursementDate")
        self.assertEqual(self._loan(lt["_id"], emiStartMonth="13").json()["message"],
                         "emiStartMonth must be Jan-Dec, January-December, or 1-12")
        self.assertEqual(self._loan("bad").status_code, 404)
        # repayment
        res = self.post(f"loan/record-repayment/{loan_id}",
                        {"repaymentAmount": 40000, "repaymentDate": "2025-05-10", "paymentMode": "Bank Transfer"})
        self.assertEqual(res.status_code, 201, res.content)
        d = res.json()["data"]
        self.assertEqual(d["remainingAmount"], 60000)
        self.assertEqual(d["loan"]["paidInstallments"], 1)
        self.assertEqual(d["repayment"]["paymentMode"], "bank_transfer")
        self.assertEqual(self.post(f"loan/record-repayment/{loan_id}",
                                   {"repaymentAmount": 70000, "repaymentDate": "2025-05-10",
                                    "paymentMode": "cash"}).json()["message"],
                         "Repayment amount cannot exceed outstanding balance of 60000")
        self.assertEqual(self.post(f"loan/record-repayment/{loan_id}",
                                   {"repaymentAmount": 1, "repaymentDate": "2025-05-10",
                                    "paymentMode": "upi"}).status_code, 400)
        res = self.post(f"loan/record-repayment/{loan_id}",
                        {"repaymentAmount": 60000, "repaymentDate": "2025-06-10", "paymentMode": "cash"})
        self.assertEqual(res.json()["data"]["loan"]["status"], "closed")
        res = self.hr.get(BASE + f"loan/get-loanById/{loan_id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["repaymentSummary"]["message"], "Loan is fully repaid.")
        self.assertEqual(len(res.json()["data"]["repayments"]), 2)
        res = self.hr.get(BASE + "loan/get-loans?status=active&search=ln-00002")
        self.assertEqual(res.json()["data"]["total"], 1)
        self.assertIn("firstName", res.json()["data"]["loans"][0]["employeeId"])
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org).exists())

    def test_payroll_emi_engine_helpers(self):
        lt = self._type(rate=10)
        loan_id = self._loan(lt["_id"]).json()["data"]["loan"]["_id"]
        out = loan_helper.build_loan_emi_deductions_for_employee(self.org, self.emp.pk, "Mar", 2025)
        self.assertEqual(out["deductions"], [])
        out = loan_helper.build_loan_emi_deductions_for_employee(self.org, self.emp.pk, "April", 2025)
        self.assertEqual(out["deductions"][0]["componentName"], "Loan EMI (Housing)")
        self.assertEqual(out["deductions"][0]["amount"], 30000)
        saved = loan_helper.apply_payroll_loan_repayments(self.org, self.emp.pk, "Apr", 2025, None,
                                                          out["loanRepaymentPlans"])
        self.assertEqual(len(saved), 1)
        loan = EmployeeLoan.objects.get(pk=loan_id)
        self.assertEqual(loan.outstanding_balance, 70000)
        # repayment without linked payroll run is re-planned (legacy PayrollRunModel check)
        again = loan_helper.build_loan_emi_deductions_for_employee(self.org, self.emp.pk, "Apr", 2025)
        self.assertEqual(len(again["deductions"]), 1)
        self.assertEqual(LoanRepayment.objects.filter(repayment_type="payroll").count(), 0)
        loan_helper.apply_payroll_loan_repayments(self.org, self.emp.pk, "Apr", 2025, None,
                                                  again["loanRepaymentPlans"])
        self.assertEqual(loan_helper.reverse_payroll_loan_repayments(self.org, self.emp.pk, "Apr", 2025), 1)
        loan.refresh_from_db()
        self.assertEqual(loan.outstanding_balance, 100000)
        perq = loan_perquisite_helper.build_employee_loan_perquisite_for_payroll(self.org, self.emp.pk, "Apr", 2025)
        self.assertEqual(perq["totalMonthlyPerquisite"], 833)
        annual = loan_perquisite_helper.calculate_employee_annual_loan_perquisite(self.org, self.emp.pk, 12)
        self.assertEqual(annual["annualTotal"], 9996)

    def test_worker_blocked(self):
        self.assertEqual(self.worker.get(BASE + "loan/get-loans").status_code, 403)
        self.assertEqual(self.post("loan/create-loan-type", {"loanName": "A"}, client=self.worker).status_code, 403)


class VpfApiTests(Base):
    def test_start_stop_and_admin_list(self):
        self.emp.payroll_info = {**self.emp.payroll_info, "baseSalary": 20000}
        self.emp.save()
        res = self.worker.get(BASE + "employee/vpf")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["data"]["vpf"]["status"], "none")
        self.assertEqual(self.post("employee/vpf/start", {"contributionType": "percentage",
                                                          "contributionValue": 10}, client=self.worker)
                         .json()["message"],
                         "You must acknowledge that this will be processed in the next processing cycle")
        self.assertEqual(self.post("employee/vpf/start", {"contributionType": "percentage",
                                                          "contributionValue": 101, "acknowledged": True},
                                   client=self.worker).json()["message"],
                         "VPF percentage must be between 1 and 100")
        res = self.post("employee/vpf/start", {"contributionType": "percentage", "contributionValue": 10,
                                               "acknowledged": True}, client=self.worker)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["data"]["vpf"]["status"], "active")
        self.assertEqual(self.worker.get(BASE + "employee/vpf").json()["data"]["estimatedMonthlyVpf"], 2000)
        self.assertEqual(self.post("employee/vpf/start", {"contributionType": "fixed", "contributionValue": 5,
                                                          "acknowledged": True}, client=self.worker)
                         .json()["message"], "VPF contribution is already active")
        lst = self.hr.get(BASE + "vpf/all").json()["data"]["list"]
        self.assertEqual(len(lst), 1)
        self.assertEqual(lst[0]["monthlyDeduction"], 2000)
        self.assertEqual(self.post("employee/vpf/stop", client=self.worker).status_code, 200)
        self.assertEqual(self.post("employee/vpf/stop", client=self.worker).status_code, 400)
        self.assertEqual(self.hr.get(BASE + "vpf/all").json()["data"]["list"], [])

    def test_access(self):
        self.assertEqual(self.hr.get(BASE + "employee/vpf").status_code, 403)
        self.assertEqual(self.worker.get(BASE + "vpf/all").status_code, 403)


class ArrearsApiTests(Base):
    def _create(self, **kw):
        body = {"employeeId": str(self.emp.pk), "arrearsType": "bonus", "totalArrearsAmount": 5000,
                "tdsOnArrears": 500, "payInMonth": "4", "payInYear": 2025,
                "periodFrom": {"month": "january", "year": "2025"}, **kw}
        return self.post("arrears/create", body)

    def test_lifecycle(self):
        res = self._create()
        self.assertEqual(res.status_code, 201, res.content)
        a = res.json()["data"]
        self.assertEqual(a["netArrearsPayable"], 4500)
        self.assertEqual(a["payInMonth"], "Apr")
        self.assertEqual(a["periodFrom"], {"month": "Jan", "year": 2025})
        self.assertEqual(self._create(payInMonth="x").status_code, 400)
        self.assertEqual(self._create(totalArrearsAmount=0).json()["message"],
                         "Employee ID, arrears type, and amount are required")
        self.assertEqual(self.put(f"arrears/{a['_id']}/pay", {"paidInMonth": "Apr", "paidInYear": 2025})
                         .json()["message"], "Only approved arrears can be paid")
        self.assertEqual(self.put(f"arrears/{a['_id']}/approve").status_code, 200)
        self.assertEqual(self.put(f"arrears/{a['_id']}/pay", {"paidInMonth": "x"}).status_code, 400)
        res = self.put(f"arrears/{a['_id']}/pay", {"paidInMonth": "April", "paidInYear": "2025", "payrollId": ""})
        self.assertEqual(res.json()["data"]["status"], "paid")
        lst = self.hr.get(BASE + "arrears?page=1&limit=10").json()["data"]
        self.assertEqual((lst["total"], lst["totalPages"], lst["page"]), (1, 1, 1))
        self.assertIn("firstName", lst["data"][0]["employeeId"])
        self.assertEqual(len(self.hr.get(BASE + f"arrears/employee/{self.emp.pk}").json()["data"]), 1)
        b = self._create().json()["data"]
        pend = self.hr.get(BASE + f"arrears/pending/{self.emp.pk}").json()["data"]
        self.assertEqual((pend["count"], pend["totalAmount"]), (1, 4500))
        self.assertEqual(self.hr.delete(BASE + f"arrears/{b['_id']}").status_code, 200)
        self.assertEqual(self.hr.delete(BASE + f"arrears/{b['_id']}").status_code, 404)

    def test_worker_blocked(self):
        self.assertEqual(self.worker.get(BASE + "arrears").status_code, 403)


class SalaryRevisionApiTests(Base):
    def test_create_approve_implement(self):
        self.emp.payroll_info = {**self.emp.payroll_info, "ctc": 240000, "grossSalary": 20000,
                                 "baseSalary": 10000}
        self.emp.save()
        body = {"employeeId": str(self.emp.pk), "revisionType": "increment", "effectiveFrom": "2025-04-01",
                "newSalary": {"grossSalary": 30000}, "arrearsApplicable": True,
                "arrearsFromDate": "2025-01-01", "state": "Gujarat"}
        self.assertEqual(self.post("revision/create", {**body, "newSalary": {}}).status_code, 400)
        self.assertEqual(self.post("revision/create", {**body, "arrearsFromDate": "2025-06-01"})
                         .json()["message"], "Arrears from date cannot be after effective date")
        res = self.post("revision/create", body)
        self.assertEqual(res.status_code, 201, res.content)
        rev = res.json()["data"]
        self.assertEqual(rev["newSalary"]["grossSalary"], 30000)
        self.assertEqual(rev["newSalary"]["basicSalary"], 15000)
        self.assertEqual(rev["newSalary"]["ctc"], 360000)
        self.assertEqual(rev["incrementAmount"], 120000)
        self.assertEqual(rev["incrementPercentage"], 50)
        self.assertEqual(rev["arrearsAmount"], 30000)
        self.assertEqual(rev["inputMode"], "gross")
        rid = rev["_id"]
        self.assertEqual(self.post(f"revision/{rid}/implement").json()["message"],
                         "Only approved revisions can be implemented")
        self.assertEqual(self.put(f"revision/{rid}/approve", {"status": "x"}).status_code, 400)
        res = self.put(f"revision/{rid}/approve", {"status": "approved", "comments": "ok"})
        self.assertEqual(res.json()["data"]["approvals"][0]["status"], "approved")
        self.assertEqual(set(res.json()["data"]["approvals"][0]),
                         {"employeeId", "approverName", "approverRole", "status", "comments", "approvedDate"})
        res = self.post(f"revision/{rid}/implement")
        self.assertEqual(res.status_code, 200, res.content)
        arr = res.json()["data"]["arrearsRecord"]
        self.assertEqual(arr["periodFrom"], {"month": "Jan", "year": 2025})
        self.assertEqual(arr["components"][0]["months"], 3)
        self.emp.refresh_from_db()
        info = self.emp.payroll_info
        self.assertEqual((info["ctc"], info["grossSalary"], info["baseSalary"]), (360000, 30000, 15000))
        self.assertEqual(info["salaryEffectiveFrom"], "2025-04-01T00:00:00.000Z")
        self.assertEqual(Arrears.objects.filter(salary_revision_id=rid).count(), 1)
        self.assertEqual(self.post(f"revision/{rid}/implement").json()["message"],
                         "Salary revision is already implemented")
        self.assertEqual(self.hr.delete(BASE + f"revision/{rid}").status_code, 400)
        lst = self.hr.get(BASE + "revision?limit=5").json()["data"]
        self.assertEqual((lst["total"], lst["limit"]), (1, 5))
        self.assertEqual(self.hr.get(BASE + f"revision/{rid}").json()["data"]["employeeId"]["payrollInfo"]["ctc"],
                         360000)
        self.assertEqual(len(self.hr.get(BASE + f"revision/employee/{self.emp.pk}").json()["data"]), 1)

    def test_delete_pending_and_access(self):
        res = self.post("revision/create", {"employeeId": str(self.emp.pk), "revisionType": "promotion",
                                            "effectiveFrom": "2025-04-01", "newSalary": {"grossSalary": 20000}})
        rid = res.json()["data"]["_id"]
        self.assertEqual(self.worker.get(BASE + f"revision/{rid}").status_code, 403)
        self.assertEqual(self.hr.delete(BASE + f"revision/{rid}").status_code, 200)
        self.assertEqual(self.hr.get(BASE + f"revision/{rid}").status_code, 404)


class ImportApiTests(Base):
    def _file(self, text, name="import.csv", ctype=CSV):
        return SimpleUploadedFile(name, text.encode(), content_type=ctype)

    def test_one_time_flow(self):
        code = self.emp.unique_id
        csv = ("employee_code,category,component_name,amount\n"
               f"{code},earning,HRA,1500\n{code},earnings,Night Shift,700\nnobody,earnings,HRA,1\n")
        self.assertEqual(self.hr.post(BASE + "import/one-time-earnings-deductions/preview",
                                      {"month": "Jun", "year": 2025}).json()["message"],
                         "CSV or Excel file is required")
        self.assertEqual(self.hr.post(BASE + "import/one-time-earnings-deductions/preview",
                                      {"month": "x", "year": 2025, "file": self._file(csv)}).status_code, 400)
        res = self.hr.post(BASE + "import/one-time-earnings-deductions/preview",
                           {"month": "6", "year": "2025", "file": self._file(csv)})
        self.assertEqual(res.status_code, 200, res.content)
        d = res.json()["data"]
        self.assertEqual(d["summary"], {"totalRows": 3, "validRows": 2, "invalidRows": 1})
        self.assertEqual(d["preview"][1]["isAdHoc"], True)
        self.assertEqual(d["preview"][2]["error"], "Employee not found.")
        bid = d["importBatchId"]
        self.assertEqual(self.post("import/one-time-earnings-deductions/confirm", {}).status_code, 400)
        res = self.post("import/one-time-earnings-deductions/confirm", {"importBatchId": bid})
        self.assertEqual(len(res.json()["data"]["rows"]), 2)
        got = self.hr.get(BASE + "import/one-time-earnings-deductions?month=Jun&year=2025").json()["data"]
        self.assertEqual(got["import"]["importBatchId"], bid)
        self.assertEqual(len(load_confirmed_one_time_import_rows(self.org, "Jun", 2025)), 2)
        self.assertIsNone(self.hr.get(BASE + "import/one-time-earnings-deductions?month=Jul&year=2025")
                          .json()["data"]["import"])
        self.assertEqual(self.hr.delete(BASE + f"import/one-time-earnings-deductions/{bid}").status_code, 404)
        res = self.hr.post(BASE + "import/one-time-earnings-deductions/preview",
                           {"month": "Jun", "year": 2025, "file": self._file(csv)})
        bid2 = res.json()["data"]["importBatchId"]
        self.assertEqual(self.hr.delete(BASE + f"import/one-time-earnings-deductions/{bid2}").status_code, 200)
        self.assertEqual(PayrollOneTimeImport.objects.get(import_batch_id=bid2).status, "cancelled")

    def test_one_time_no_valid_rows(self):
        res = self.hr.post(BASE + "import/one-time-earnings-deductions/preview",
                           {"month": "Jun", "year": 2025,
                            "file": self._file("employee_code,category,amount\nx,earnings,abc\n")})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["data"]["summary"]["validRows"], 0)

    def test_salary_revision_import_xlsx(self):
        import openpyxl

        self.emp.payroll_info = {**self.emp.payroll_info, "ctc": 240000, "grossSalary": 20000,
                                 "baseSalary": 10000}
        self.emp.save()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["employee_code", "revision_type", "effective_from", "gross_salary", "HRA",
                   "auto_approve", "auto_implement", "esic"])
        ws.append([self.emp.unique_id, "hike", "2025-04-01", 30000, 5000, "yes", "yes", "no"])
        ws.append(["nobody", "hike", "2025-04-01", 30000, None, None, None, None])
        ws.append([self.emps[1].unique_id if self.emps[1] != self.emp else self.emps[0].unique_id,
                   "promotion", "bad-date", "abc", None, None, None, None])
        buf = io.BytesIO()
        wb.save(buf)
        upload = SimpleUploadedFile("rev.xlsx", buf.getvalue(), content_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        res = self.hr.post(BASE + "import/salary-revision/preview", {"file": upload})
        self.assertEqual(res.status_code, 200, res.content)
        d = res.json()["data"]
        self.assertEqual(d["summary"]["validRows"], 1)
        self.assertEqual(d["preview"][0]["plannedStatus"], "implemented")
        self.assertEqual(d["preview"][2]["error"], "effectiveFrom is required and must be a valid date")
        res = self.post("import/salary-revision/confirm", {"importBatchId": d["importBatchId"]})
        self.assertEqual(res.status_code, 200, res.content)
        out = res.json()["data"]
        self.assertEqual(out["summary"]["implemented"], 1)
        self.assertEqual(out["errors"], [])
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.payroll_info["grossSalary"], 30000)
        self.assertEqual(self.emp.statutory_info["esiApplicable"], False)
        self.assertTrue(any(o["code"] == "hra" and o["overrideAmount"] == 5000
                            for o in self.emp.payroll_info["componentOverrides"]))
        self.assertEqual(SalaryRevision.objects.get(employee=self.emp).status, "implemented")
        got = self.hr.get(BASE + "import/salary-revision").json()["data"]["import"]
        self.assertEqual(got["rows"][0]["appliedStatus"], "implemented")
        res = self.hr.post(BASE + "import/salary-revision/preview",
                           {"file": self._file("employee_code\nx\n")})
        bid = res.json()["data"]["importBatchId"]
        self.assertEqual(self.post("import/salary-revision/confirm", {"importBatchId": bid}).json()["message"],
                         "Cannot confirm import with zero valid rows")
        self.assertEqual(self.hr.delete(BASE + f"import/salary-revision/{bid}").status_code, 200)
        self.assertEqual(PayrollSalaryRevisionImport.objects.get(import_batch_id=bid).status, "cancelled")

    def test_bad_upload_and_access(self):
        res = self.hr.post(BASE + "import/salary-revision/preview",
                           {"file": self._file("x", name="a.txt", ctype="text/plain")})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.worker.get(BASE + "import/salary-revision").status_code, 403)
