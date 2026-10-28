"""Differential tests: GET handlers of F&F / arrears / salary revision / VPF vs the legacy
controllers, run against the in-memory mini-Mongo of ``tests/js/controller_harness.js``."""

import unittest
from datetime import datetime, timezone

from django.test import TestCase

from payroll_engine import bss_adapter
from payroll_engine.models import Arrears, FullAndFinal, PayrollEmployee, SalaryRevision

from .fixtures import BASE, client_for, make_org_world
from .legacy_js import SKIP_REASON, node_available, run_js_batch
from .report_parity import HARNESS, REFS, collections_for

PARITY_REFS = {**REFS,
               "FullAndFinalModel": {"employeeId": "EmployeeModel"},
               "ArrearsModel": {"employeeId": "EmployeeModel"},
               "SalaryRevisionModel": {"employeeId": "EmployeeModel"}}


def _strip_org(value, org_id):
    """Legacy docs carry the harness org id 'org'; ours carry the BSS user id."""
    if isinstance(value, dict):
        return {k: ("org" if k == "organizationId" and v == org_id else _strip_org(v, org_id))
                for k, v in value.items()}
    if isinstance(value, list):
        return [_strip_org(v, org_id) for v in value]
    return value


def _diff(a, b, path=""):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                yield f"{path}.{k}: legacy={a.get(k, '<missing>')!r} ours={b.get(k, '<missing>')!r}"
            else:
                yield from _diff(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            yield from _diff(x, y, f"{path}[{i}]")
    elif a != b or type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float))):
        yield f"{path}: legacy={a!r} ours={b!r}"


def _dt(y, m, d):
    return datetime(y, m, d, 6, 30, tzinfo=timezone.utc)


@unittest.skipUnless(node_available(), SKIP_REASON)
class RestGetParityTests(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=4, suffix="pr")
        self.org = self.world["contractor"]
        bss_adapter.sync_employees(self.org, force=True)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("first_name"))
        a, b, c, d = self.emps
        a.first_name, a.last_name = "zara", "Khan"
        b.first_name, b.last_name = "Amit", "Shah"
        c.first_name = "Bina"
        a.status = "Inactive"
        a.exit_data = {**(a.exit_data or {}), "exitStatus": "Resigned",
                       "lastWorkingDay": "2026-01-31T00:00:00.000Z"}
        b.exit_data = {**(b.exit_data or {}), "lastWorkingDay": "2026-03-15T00:00:00.000Z"}
        c.status = "Inactive"
        for e in (a, b, c):
            e.save()
        a.payroll_preferences = {"vpf": {"status": "active", "contributionType": "fixed",
                                         "fixedAmount": 500,
                                         "requestedAt": "2026-02-01T00:00:00.000Z"}}
        b.payroll_preferences = {"vpfStatus": "pending", "vpfPercentage": 12,
                                 "vpfRequestedAt": "2026-03-01T00:00:00.000Z"}
        c.payroll_preferences = {"vpf": {"status": "active", "percentage": 10,
                                         "requestedAt": "2026-03-05T00:00:00.000Z"}}
        for e in (a, b, c):
            e.payroll_info = {**(e.payroll_info or {}), "baseSalary": 15000.5,
                              "employeeCode": f"E-{e.first_name}"}
            e.save()
        FullAndFinal.objects.create(org=self.org, employee=a, status="initiated",
                                    last_working_date=_dt(2026, 1, 31),
                                    salary_dues={"unpaidSalary": 100, "proratedSalary": 5.5})
        FullAndFinal.objects.create(org=self.org, employee=b, status="finalized",
                                    total_payables=10, net_payable=10)
        for i, (emp, st, amt) in enumerate([(a, "calculated", 100), (a, "approved", 250.5),
                                            (b, "paid", 70), (c, "calculated", 0)]):
            Arrears.objects.create(org=self.org, employee=emp, arrears_type="correction",
                                   total_arrears_amount=amt, net_arrears_payable=amt, status=st,
                                   pay_in_month="Mar", pay_in_year=2026,
                                   period_from={"month": "Jan", "year": 2026})
        for emp, st, eff in [(a, "pending", _dt(2026, 4, 1)), (a, "approved", _dt(2026, 5, 1)),
                             (b, "rejected", _dt(2026, 4, 1))]:
            SalaryRevision.objects.create(
                org=self.org, employee=emp, revision_type="increment", status=st,
                effective_from=eff, old_salary={"ctc": 100}, new_salary={"ctc": 120},
                increment_amount=20, increment_percentage=20,
                approvals=[{"employeeId": None, "approverName": "X", "status": st}]
                if st != "pending" else [])
        # Distinct whole-second createdAt values (the mini-Mongo compares at ms precision).
        for model in (FullAndFinal, Arrears, SalaryRevision):
            for i, row in enumerate(model.objects.filter(org=self.org).order_by("created_at")):
                model.objects.filter(pk=row.pk).update(created_at=_dt(2026, 1, 1 + i))
        self.client = client_for(self.org)

    def _legacy(self, controller, handler, req):
        (res,) = run_js_batch([{"module": HARNESS, "fn": "run", "args": [{
            "controller": controller, "handler": handler, "collections": collections_for(self.org),
            "refs": PARITY_REFS, "req": req}]}])
        if isinstance(res, dict) and "$error" in res:
            raise RuntimeError(res["$error"])
        return res

    def assertParity(self, path, controller, handler, req):
        res = self.client.get(BASE + path)
        legacy = self._legacy(controller, handler, req)
        ours = _strip_org(res.json(), str(self.org.pk))
        diffs = list(_diff(legacy["body"], ours))
        self.assertEqual(legacy["status"], res.status_code, path)
        self.assertEqual(diffs, [], path)

    def test_full_and_final(self):
        ctrl = "controller/payroll/fullAndFinal.js"
        a = str(self.emps[0].pk)
        cases = [
            ("fullAndFinal/exitedEmployees", "getExitedEmployees", {"query": {}}),
            ("fullAndFinal/exitedEmployees?search=AM", "getExitedEmployees", {"query": {"search": "AM"}}),
            ("fullAndFinal/exitedEmployees?page=2&limit=1", "getExitedEmployees",
             {"query": {"page": "2", "limit": "1"}}),
            ("fullAndFinal", "getAllSettlements", {}),
            (f"fullAndFinal/employee/{a}", "getSettlementByEmployee", {"params": {"employeeId": a}}),
        ]
        for path, handler, req in cases:
            with self.subTest(path=path):
                self.assertParity(path, ctrl, handler, req)

    def test_arrears(self):
        ctrl = "controller/payroll/arrearsManagement.js"
        a = str(self.emps[0].pk)
        cases = [
            ("arrears", "getAllArrears", {"query": {}}),
            ("arrears?page=2&limit=2", "getAllArrears", {"query": {"page": "2", "limit": "2"}}),
            ("arrears?status=calculated", "getAllArrears", {"query": {"status": "calculated"}}),
            (f"arrears/employee/{a}", "getEmployeeArrears", {"params": {"employeeId": a}}),
            (f"arrears/pending/{a}", "calculatePendingArrears", {"params": {"employeeId": a}}),
        ]
        for path, handler, req in cases:
            with self.subTest(path=path):
                self.assertParity(path, ctrl, handler, req)

    def test_salary_revisions(self):
        ctrl = "controller/payroll/salaryRevision.js"
        a = str(self.emps[0].pk)
        rid = str(SalaryRevision.objects.filter(status="approved").first().pk)
        cases = [
            ("revision", "getAllSalaryRevisions", {"query": {}}),
            ("revision?limit=1&page=2", "getAllSalaryRevisions", {"query": {"limit": "1", "page": "2"}}),
            (f"revision/employee/{a}", "getEmployeeRevisionHistory", {"params": {"employeeId": a}}),
            (f"revision/{rid}", "getSalaryRevisionById", {"params": {"revisionId": rid}}),
        ]
        for path, handler, req in cases:
            with self.subTest(path=path):
                self.assertParity(path, ctrl, handler, req)

    def test_vpf_admin_list(self):
        ctrl = "controller/payroll/vpfManagement.js"
        # requestedAt must sort as dates (legacy stored Date objects; the harness keeps strings).
        for status in ["pending"]:
            with self.subTest(status=status):
                self.assertParity(f"vpf/all?status={status}", ctrl, "getAllVpfRequests",
                                  {"query": {"status": status}})


class ClaimsCastingTests(TestCase):
    """Legacy Mongoose cast sub-document Numbers / Dates on save; the payroll engine sums
    ``approvedAmount`` / ``claimedAmount`` straight from the stored claim."""

    def setUp(self):
        self.world = make_org_world(n_workers=1, suffix="cc")
        self.org = self.world["contractor"]
        bss_adapter.sync_employees(self.org, force=True)
        self.emp = PayrollEmployee.objects.get(org=self.org)
        self.hr = client_for(self.org)

    def test_numeric_strings_and_dates_are_cast(self):
        me = self.emp.pk
        res = self.hr.post(BASE + f"reimbursement/{me}", {"name": "Taxi", "type": "travel",
                                                          "claimedAmount": "500.50",
                                                          "claimDate": "2026-03-10"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        claim = res.json()["data"]["reimbursements"][0]
        self.assertEqual((claim["claimedAmount"], claim["claimDate"]),
                         (500.5, "2026-03-10T00:00:00.000Z"))
        res = self.hr.put(BASE + f"reimbursement/{me}/{claim['_id']}/status",
                          {"status": "approved", "approvedAmount": "450"}, format="json")
        self.assertEqual(res.json()["data"]["reimbursements"][0]["approvedAmount"], 450)
        res = self.hr.post(BASE + f"flexiblePlan/{me}", {"componentName": "Meal", "amount": "1200"},
                           format="json")
        plan = res.json()["data"]["flexibleBenefitPlan"][0]
        self.assertEqual(plan["amount"], 1200)
        res = self.hr.put(BASE + f"flexiblePlan/{me}/{plan['_id']}/status",
                          {"status": "approved", "amount": "1100.25"}, format="json")
        self.assertEqual(res.json()["data"]["flexibleBenefitPlan"][0]["amount"], 1100.25)
        res = self.hr.post(BASE + f"taxDeclaration/{me}", {"section": "80C", "amountDeclared": "150000"},
                           format="json")
        decl = res.json()["data"]["incomeTaxDeclarations"][0]
        self.assertEqual(decl["amountDeclared"], 150000)
        res = self.hr.put(BASE + f"taxDeclaration/{me}/{decl['_id']}", {"amountApproved": "100000"},
                          format="json")
        self.assertEqual(res.json()["data"]["incomeTaxDeclarations"][0]["amountApproved"], 100000)

    def test_uncastable_values_fail_like_mongoose(self):
        me = self.emp.pk
        res = self.hr.post(BASE + f"reimbursement/{me}", {"name": "Taxi", "type": "travel",
                                                          "claimedAmount": "abc"}, format="json")
        self.assertEqual(res.status_code, 500)
        self.assertIn("Cast to Number failed", res.json()["message"])
        res = self.hr.post(BASE + f"reimbursement/{me}", {"name": "Taxi", "type": "travel",
                                                          "claimedAmount": 10, "claimDate": "nope"},
                           format="json")
        self.assertEqual(res.status_code, 500)
        self.assertIn("Cast to date failed", res.json()["message"])
        self.assertFalse(self.hr.get(BASE + f"reimbursement/{me}").json()["data"])


class LoanTypeOrderTests(TestCase):
    def test_loan_types_sorted_by_code_point_like_mongo(self):
        world = make_org_world(n_workers=1, suffix="lo")
        hr = client_for(world["contractor"])
        for name in ["apple", "Zeta", "éclair", "Banana"]:
            self.assertEqual(hr.post(BASE + "loan/create-loan-type", {"loanName": name},
                                     format="json").status_code, 201)
        names = [r["loanName"] for r in hr.get(BASE + "loan/get-loan-types").json()["data"]["loanTypes"]]
        # Mongo sort({loanName: 1}) is case-sensitive binary order, not the SQL collation.
        self.assertEqual(names, ["Banana", "Zeta", "apple", "éclair"])
