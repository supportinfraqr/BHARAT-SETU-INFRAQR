"""Full & Final settlement: API tests + differential tests vs the legacy JS helpers."""

import json
import os
import unittest
from datetime import date

from django.test import SimpleTestCase, TestCase

from bss_core.models import LeaveRequest, LeaveType
from payroll_engine import bss_adapter
from payroll_engine.models import (FullAndFinal, PayrollAuditLog, PayrollEmployee, PayrollRun,
                                   StatutoryCompliance)
from payroll_engine.services import ff_leave_encashment_helper as leave_helper
from payroll_engine.services import ff_settlement_preview as preview

from .fixtures import BASE, client_for, make_org_world
from .legacy_js import LEGACY_DIR, SKIP_REASON, node_available, run_js_batch

HARNESS = os.path.relpath(os.path.join(os.path.dirname(__file__), "js", "ff_harness.js"), LEGACY_DIR)
PREVIEW_JS = "utils/payroll/ffSettlementPreview.js"
LEAVE_JS = "utils/payroll/ffLeaveEncashmentHelper.js"
EMP_OID = "6650f0c2a1b2c3d4e5f60718"


def _canon(value):
    return json.dumps(value, sort_keys=True)


@unittest.skipUnless(node_available(), SKIP_REASON)
class FullAndFinalHelperParityTests(SimpleTestCase):
    def assertSameJSON(self, js, py):
        self.assertEqual(_canon(js), _canon(py))

    def test_build_gratuity_and_leave_rate(self):
        cases = [
            ("2020-02-29", "2025-02-28", "Resigned"), ("2018-04-01", "2025-10-15", "Resigned"),
            ("2019-06-15T10:00:00Z", "2024-12-10", ""), ("2020-01-01", "2019-01-01", ""),
            ("2023-01-01", "2024-03-01", "Expired (Death)"), ("2001-01-01", "2026-01-01", ""),
            (None, "2025-01-01", ""), ("2020-07-31T23:00:00Z", "2025-01-31T18:00:00Z", ""),
        ]
        wages = [(20000, 1500.5), (900000, 0), (0, 0), ("15000", "abc")]
        calls, py = [], []
        for jd, lwd, status in cases:
            for basic, da in wages:
                calls.append({"module": PREVIEW_JS, "fn": "buildGratuity", "args": [
                    {"basic": basic, "da": da, "joiningDate": jd, "lastWorkingDate": lwd,
                     "exitStatus": status}]})
                py.append(preview.build_gratuity(basic=basic, da=da, joining_date=jd,
                                                 last_working_date=lwd, exit_status=status))
        for method in ["basic_26", "gross_30", "basic_30", "gross_26", None, "weird"]:
            for basic, gross in [(26000, 30000), (0, 12345.67), (-5, 0), (33333.33, 41234.5)]:
                calls.append({"module": PREVIEW_JS, "fn": "leaveRate", "args": [method, basic, gross]})
                py.append(preview.leave_rate(method, basic, gross))
        calls.append({"module": PREVIEW_JS, "fn": "GRATUITY_CAP", "args": []})
        py.append(preview.GRATUITY_CAP)
        for js, p in zip(run_js_batch(calls), py):
            self.assertSameJSON(js, p)

    def test_leave_helpers(self):
        lts = [
            {"_id": "a" * 24, "leaveNameId": {"name": "EL"}, "leaveType": "Paid",
             "typeOfLeave": "Yearly", "creditDays": 15, "encashed": True, "encashedDays": 10},
            {"_id": "b" * 24, "leaveNameId": "CL", "leaveType": "Paid", "typeOfLeave": "Monthly",
             "monthlyAllowed": 1.5, "carryForward": True, "carryForwardLimit": 5, "encashed": True,
             "validityStart": "2025-01-10T00:00:00.000Z"},
            {"_id": "c" * 24, "leaveNameId": {"code": "SL"}, "leaveType": "Unpaid", "isUnlimited": True},
            {"_id": "d" * 24, "leaveType": "Paid", "typeOfLeave": "Monthly", "monthlyAllowed": 2,
             "encashed": True},
            {"_id": "e" * 24, "leaveNameId": {"shortName": "ML"}, "leaveType": "Paid",
             "typeOfLeave": "Yearly", "creditDays": "4", "encashed": False},
        ]
        usage = [{"_id": "a" * 24, "usedDays": 3, "advanceDays": 1}, {"_id": "b" * 24, "usedDays": 2},
                 {"_id": "e" * 24, "usedDays": 9}]
        usage_map = {u["_id"]: u for u in usage}
        calls, py = [], []
        for as_of in ["2025-06-20", "2025-01-01T00:00:00Z", "2026-03-31"]:
            calls.append({"module": HARNESS, "fn": "leaveBalances", "args": [
                {"leaveTypes": lts, "usage": usage, "employee": {}, "employeeId": EMP_OID,
                 "asOfDate": as_of}]})
            leaves = leave_helper.compute_leave_balances(lts, usage_map, {},
                                                         leave_helper.js_new_date(as_of))
            py.append(leaves)
            for bases in [{"baseSalary": 30000, "grossSalary": 45000}, {"grossSalary": 31000},
                          {}]:
                calls.append({"module": LEAVE_JS, "fn": "buildLeaveEncashmentSummary",
                              "args": [{"$undefined": True}, bases]})
                py.append(leave_helper.build_leave_encashment_summary(UNDEF, bases))
        for lt in lts:
            for remaining in [0, 3, 12.5, -2, "7", None]:
                calls.append({"module": LEAVE_JS, "fn": "calculateEncashableLeaves",
                              "args": [lt, remaining]})
                py.append(leave_helper.calculate_encashable_leaves(lt, remaining))
        results = run_js_batch(calls)
        for js, p in zip(results, py):
            self.assertSameJSON(js, p)
        # summary over real balances
        js_leaves = results[0]
        calls = [{"module": LEAVE_JS, "fn": "buildLeaveEncashmentSummary",
                  "args": [js_leaves, {"baseSalary": 26000.7}]}]
        self.assertSameJSON(run_js_batch(calls)[0], leave_helper.build_leave_encashment_summary(
            js_leaves, {"baseSalary": 26000.7}))


UNDEF = leave_helper.UNDEFINED


class FullAndFinalApiTests(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2, suffix="ff")
        self.org = self.world["contractor"]
        bss_adapter.sync_employees(self.org, force=True)
        self.client = client_for(self.org)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("first_name"))
        self.emp = self.emps[0]
        self.emp.payroll_info = {**self.emp.payroll_info, "baseSalary": 26000, "grossSalary": 39000,
                                 "variablePay": 24000, "incentives": 12000,
                                 "defaultComponents": [{"name": "Dearness Allowance", "amount": 2600}]}
        self.emp.save()

    def _initiate(self, emp=None, **extra):
        body = {"employeeId": str((emp or self.emp).pk), "lastWorkingDate": "2026-03-15", **extra}
        return self.client.post(BASE + "fullAndFinal/initiate", body, format="json")

    def test_initiate_validation_and_duplicate(self):
        res = self.client.post(BASE + "fullAndFinal/initiate", {"employeeId": str(self.emp.pk)},
                               format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"], "Employee ID and last working date are required")
        res = self._initiate(resignationId="not-an-id")
        self.assertEqual(res.json()["message"], "Invalid resignation ID")
        res = self._initiate(resignationId='"6650f0c2a1b2c3d4e5f60718"')
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()["data"]
        self.assertEqual(data["status"], "initiated")
        self.assertEqual(data["resignationId"], EMP_OID)
        self.assertEqual(data["employeeId"], str(self.emp.pk))
        self.assertEqual(data["salaryDues"]["formula"], "")
        res = self._initiate()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"],
                         "Full & Final settlement already initiated for this employee")
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org, action="settlement_initiated").exists())

    def test_full_workflow_numbers(self):
        sid = self._initiate().json()["data"]["_id"]
        url = BASE + f"fullAndFinal/{sid}/"
        res = self.client.put(url + "salaryDues", {"unpaidSalary": 5000, "proratedSalary": "18870.97",
                                                   "workingDaysInLastMonth": 15}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["data"]["salaryDues"]["proratedSalary"], 18870.97)
        res = self.client.put(url + "leaveEncashment", {"availableLeaves": 13, "encashableLeaves": 13,
                                                        "basicSalary": 26000, "grossSalary": 39000},
                              format="json")
        le = res.json()["data"]["leaveEncashment"]
        self.assertEqual((le["perDayRate"], le["totalAmount"], le["method"]), (1000, 13000, "basic_26"))
        self.assertEqual(le["formula"], "Encashable leaves × (Basic / 26 = 26000 / 26)")
        res = self.client.put(url + "leaveEncashment", {"encashableLeaves": 2, "method": "gross_30"},
                              format="json")
        self.assertEqual(res.json()["data"]["leaveEncashment"]["totalAmount"], 2600)
        res = self.client.put(url + "bonusIncentives", {"performanceBonus": 1000, "statutoryBonus": 500,
                                                        "eligible": 1}, format="json")
        self.assertTrue(res.json()["data"]["bonusIncentives"]["eligible"])
        res = self.client.put(url + "deductions", {"noticePeriodShortfall": 2000, "loansAdvances": 500},
                              format="json")
        self.assertEqual(res.json()["data"]["deductions"]["totalDeductions"], 2500)
        res = self.client.put(url + "gratuity", {"isEligible": True, "yearsOfService": 6,
                                                 "lastDrawnSalary": 28600}, format="json")
        gr = res.json()["data"]["gratuity"]
        self.assertEqual(gr["gratuityAmount"], 99000)
        self.assertEqual(gr["formula"], "(Last drawn Basic + DA × 15 × 6) / 26")
        res = self.client.post(url + "calculate", {}, format="json")
        data = res.json()["data"]
        # 5000 + 18870.97 + 2600 + 1500 + 99000 = 126970.97 ; deductions 2500
        self.assertAlmostEqual(data["totalPayables"], 126970.97, places=6)
        self.assertEqual(data["totalDeductions"], 2500)
        self.assertAlmostEqual(data["netPayable"], 124470.97, places=6)
        res = self.client.post(url + "approval", {"approverName": "HR", "status": "bogus"}, format="json")
        self.assertEqual(res.status_code, 500)
        res = self.client.post(url + "approval", {"approverName": "HR", "approverRole": "Manager",
                                                  "status": "approved"}, format="json")
        self.assertEqual(res.json()["data"]["status"], "approved")
        self.assertEqual(len(res.json()["data"]["approvals"]), 1)
        res = self.client.post(url + "finalize", {}, format="json")
        self.assertEqual(res.json()["data"]["status"], "finalized")
        self.assertIsNotNone(res.json()["data"]["finalizedAt"])
        res = self.client.put(url + "deductions", {"otherDeductions": 1}, format="json")
        self.assertEqual((res.status_code, res.json()["message"]),
                         (400, "Finalized settlement cannot be changed"))
        res = self.client.put(url + "payment", {"paymentMode": "bank_transfer", "transactionId": "UTR1"},
                              format="json")
        data = res.json()["data"]
        self.assertEqual((data["status"], data["paymentDetails"]["transactionId"]), ("paid", "UTR1"))
        self.assertEqual(self.client.post(url + "finalize", {}, format="json").json()["message"],
                         "Paid settlement is already closed")

    def test_rejected_cannot_finalize_and_404s(self):
        sid = self._initiate().json()["data"]["_id"]
        self.client.post(BASE + f"fullAndFinal/{sid}/approval", {"status": "rejected"}, format="json")
        res = self.client.post(BASE + f"fullAndFinal/{sid}/finalize", {}, format="json")
        self.assertEqual(res.json()["message"], "Rejected settlement cannot be finalized")
        for path in ["fullAndFinal/00000000-0000-0000-0000-000000000000",
                     "fullAndFinal/employee/00000000-0000-0000-0000-000000000000"]:
            res = self.client.get(BASE + path)
            self.assertEqual((res.status_code, res.json()["message"]), (404, "Settlement not found"))
        res = self.client.put(BASE + "fullAndFinal/bad/payment", {}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_reads_populate_employee(self):
        sid = self._initiate().json()["data"]["_id"]
        for path in [f"fullAndFinal/{sid}", f"fullAndFinal/employee/{self.emp.pk}"]:
            data = self.client.get(BASE + path).json()["data"]
            self.assertEqual(data["employeeId"]["_id"], str(self.emp.pk))
            self.assertEqual(data["employeeId"]["firstName"], self.emp.first_name)
            self.assertIn("exitData", data["employeeId"])
        rows = self.client.get(BASE + "fullAndFinal").json()["data"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["employeeId"]["uniqueId"], self.emp.unique_id)

    def test_exited_employees(self):
        other = self.emps[1]
        other.exit_data = {**other.exit_data, "exitStatus": "Resigned", "lastWorkingDay": "2026-02-10"}
        other.status = "Inactive"
        other.save()
        self.emp.exit_data = {**self.emp.exit_data, "exitStatus": "Termination",
                              "lastWorkingDay": "2026-03-01"}
        self.emp.save()
        data = self.client.get(BASE + "fullAndFinal/exitedEmployees").json()["data"]
        self.assertEqual(data["totalEmployees"], 2)
        self.assertEqual([e["_id"] for e in data["employees"]], [str(self.emp.pk), str(other.pk)])
        self.assertEqual(set(data["employees"][0]),
                         {"_id", "firstName", "lastName", "email", "uniqueId", "jobTitle", "status",
                          "exitData", "dateOfJoining"})
        data = self.client.get(BASE + "fullAndFinal/exitedEmployees?limit=1&page=2").json()["data"]
        self.assertEqual((data["totalPages"], data["currentPage"], len(data["employees"])), (2, 2, 1))
        data = self.client.get(BASE + f"fullAndFinal/exitedEmployees?search={other.unique_id}").json()["data"]
        self.assertEqual(data["totalEmployees"], 1)

    def test_worker_forbidden(self):
        worker = client_for(self.world["workers"][0])
        self.assertEqual(worker.get(BASE + "fullAndFinal").status_code, 403)
        self.assertEqual(worker.post(BASE + "fullAndFinal/initiate", {}, format="json").status_code, 403)

    def _seed_leave_and_compliance(self):
        el = LeaveType.objects.create(code="EL", name="Earned Leave", annual_entitlement=12,
                                      opening_balance=3, is_paid=True)
        lop = LeaveType.objects.create(code="LOP", name="Loss of Pay", annual_entitlement=0,
                                       is_paid=False)
        w = self.emp.worker
        LeaveRequest.objects.create(worker=w, leave_type=el, from_date=date(2025, 5, 1),
                                    to_date=date(2025, 5, 2), days=2, status="APPROVED")
        LeaveRequest.objects.create(worker=w, leave_type=el, from_date=date(2025, 6, 1),
                                    to_date=date(2025, 6, 1), days=1, status="PENDING")
        LeaveRequest.objects.create(worker=w, leave_type=lop, from_date=date(2025, 7, 1),
                                    to_date=date(2025, 7, 1), days=1, status="APPROVED")
        comp = StatutoryCompliance(org=self.org)
        comp.statutory_bonus = {**comp.statutory_bonus, "isEnabled": True}
        comp.save()

    def test_leave_encashment_details(self):
        self._seed_leave_and_compliance()
        res = self.client.get(BASE + f"fullAndFinal/employee/{self.emp.pk}/leaveEncashmentDetails"
                                     "?asOfDate=2026-03-15")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["leaveEncashment"], {"availableLeaves": 13, "encashableLeaves": 13,
                                                   "perDayRate": 866.67, "totalAmount": 11266.71})
        self.assertEqual(data["asOfDate"], "2026-03-15T00:00:00.000Z")
        self.assertEqual(len(data["encashableLeaveTypes"]), 1)
        res = self.client.get(BASE + f"fullAndFinal/employee/{self.emp.pk}/leaveEncashmentDetails"
                                     "?asOfDate=garbage")
        self.assertEqual((res.status_code, res.json()["message"]), (400, "Invalid asOfDate"))
        res = self.client.get(BASE + "fullAndFinal/employee/nope/leaveEncashmentDetails")
        self.assertEqual((res.status_code, res.json()["message"]), (404, "Employee not found"))

    def test_preview_and_paid_run(self):
        self._seed_leave_and_compliance()
        res = self.client.get(BASE + f"fullAndFinal/preview/{self.emp.pk}?lastWorkingDate=2026-03-15")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual(data["salaryDues"]["proratedSalary"], 18870.97)
        self.assertEqual(data["leaveEncashment"]["totalAmount"], 13000)
        self.assertEqual(data["bonusIncentives"]["monthsCounted"], 12)
        self.assertEqual(data["gratuity"]["completedYears"], 1)
        PayrollRun.objects.create(org=self.org, employee=self.emp, month="Mar", year=2026,
                                  pay_status="processed")
        data = self.client.get(BASE + f"fullAndFinal/preview/{self.emp.pk}?lastWorkingDate=2026-03-15").json()["data"]
        self.assertEqual(data["salaryDues"]["proratedSalary"], 0)
        res = self.client.get(BASE + f"fullAndFinal/preview/{self.emp.pk}?lastWorkingDate=xx")
        self.assertEqual(res.json()["message"], "Invalid last working date")

    @unittest.skipUnless(node_available(), SKIP_REASON)
    def test_preview_parity_with_legacy(self):
        self._seed_leave_and_compliance()
        comp = StatutoryCompliance.objects.get(org=self.org)
        doc = self.emp.to_dict()
        lts = leave_helper.bss_leave_type_docs()
        usage = [{"_id": k, "usedDays": v} for k, v in bss_adapter.leave_usage(self.emp).items()]
        for lwd, joining, exit_status in [("2026-03-15", "2024-04-01T00:00:00Z", ""),
                                          ("2025-11-30", "2019-05-20T00:00:00Z", "Resigned"),
                                          ("2026-01-31", "2025-01-01T00:00:00Z", "Expired (Death)")]:
            self.emp.date_of_joining = date.fromisoformat(joining[:10])
            self.emp.exit_data = {**self.emp.exit_data, "exitStatus": exit_status}
            self.emp.save()
            doc = self.emp.to_dict()
            py = preview.build_settlement_preview(self.org, str(self.emp.pk), lwd)["data"]
            js_emp = {**doc, "_id": EMP_OID}
            js = run_js_batch([{"module": HARNESS, "fn": "settlementPreview", "args": [{
                "employee": js_emp, "employeeId": EMP_OID, "lastWorkingDate": lwd,
                "leaveTypes": lts, "usage": usage, "paidRun": None,
                "compliance": {"statutoryBonus": comp.statutory_bonus}}]}])[0]["data"]
            js["employee"]["id"] = py["employee"]["id"]
            js["employee"]["dateOfJoining"] = py["employee"]["dateOfJoining"]
            self.assertEqual(_canon(js), _canon(py))
