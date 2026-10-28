"""Audit log readers (getAuditLogs / getAuditLogById / getEmployeeAuditHistory)."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from payroll_engine import bss_adapter
from payroll_engine.models import PayrollAuditLog, PayrollEmployee

from .fixtures import BASE, client_for, make_org_world


class AuditLogApiTests(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2, suffix="al")
        self.org = self.world["contractor"]
        self.org.contractor_profile.email = "hr@buildwell.in"
        self.org.contractor_profile.save()
        self.org.full_name = "Suresh Mehta Rao"
        self.org.save()
        bss_adapter.sync_employees(self.org, force=True)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("first_name"))
        now = timezone.now()
        self.logs = []
        for i in range(5):
            log = PayrollAuditLog.objects.create(
                org=self.org, action="payroll_processed" if i % 2 == 0 else "claim_approved",
                entity_type="payroll" if i % 2 == 0 else "claim",
                performed_by=str(self.org.pk) if i < 4 else "",
                performed_by_name="Suresh", affected_employee=self.emps[i % 2],
                remarks=f"log {i}")
            PayrollAuditLog.objects.filter(pk=log.pk).update(created_at=now - timedelta(days=10 - i))
            self.logs.append(log)
        other = make_org_world(n_workers=1, suffix="al2")["contractor"]
        PayrollAuditLog.objects.create(org=other, action="payroll_paid", entity_type="payroll")
        self.client = client_for(self.org)

    def test_list_filters_pagination_and_populate(self):
        body = self.client.get(BASE + "audit/logs").json()
        self.assertEqual(body["message"], "Audit logs fetched successfully")
        d = body["data"]
        self.assertEqual((d["total"], d["page"], d["limit"], d["totalPages"]), (5, 1, 50, 1))
        self.assertEqual([x["remarks"] for x in d["data"]], ["log 4", "log 3", "log 2", "log 1", "log 0"])
        self.assertIsNone(d["data"][0]["performedBy"])
        self.assertEqual(d["data"][1]["performedBy"], {"_id": str(self.org.pk), "firstName": "Suresh",
                                                       "lastName": "Mehta Rao", "email": "hr@buildwell.in"})
        emp = self.emps[1]
        self.assertEqual(d["data"][1]["affectedEmployee"], {"_id": str(emp.pk), "firstName": emp.first_name,
                                                            "lastName": emp.last_name, "email": emp.email})
        d = self.client.get(BASE + "audit/logs?action=claim_approved").json()["data"]
        self.assertEqual(d["total"], 2)
        d = self.client.get(BASE + f"audit/logs?employeeId={self.emps[0].pk}&entityType=payroll").json()["data"]
        self.assertEqual(d["total"], 3)
        d = self.client.get(BASE + "audit/logs?page=2&limit=2").json()["data"]
        self.assertEqual((d["page"], d["limit"], d["totalPages"]), (2, 2, 3))
        self.assertEqual([x["remarks"] for x in d["data"]], ["log 2", "log 1"])
        start = (timezone.now() - timedelta(days=7, hours=12)).isoformat()
        d = self.client.get(BASE + "audit/logs", {"startDate": start}).json()["data"]
        self.assertEqual(d["total"], 2)
        self.assertEqual(self.client.get(BASE + "audit/logs?startDate=garbage").status_code, 500)

    def test_by_id_and_employee_history(self):
        log = self.logs[1]
        body = self.client.get(BASE + f"audit/log/{log.pk}").json()
        self.assertEqual(body["message"], "Audit log fetched successfully")
        self.assertEqual(body["data"]["performedBy"]["firstName"], "Suresh")
        res = self.client.get(BASE + "audit/log/00000000-0000-0000-0000-000000000000")
        self.assertEqual((res.status_code, res.json()["message"]), (404, "Audit log not found"))
        body = self.client.get(BASE + f"audit/employee/{self.emps[0].pk}").json()
        self.assertEqual(body["message"], "Employee audit history fetched successfully")
        self.assertEqual([x["remarks"] for x in body["data"]], ["log 4", "log 2", "log 0"])
        self.assertEqual(body["data"][0]["affectedEmployee"], str(self.emps[0].pk))  # not populated

    def test_worker_forbidden(self):
        worker = client_for(self.world["workers"][0])
        self.assertEqual(worker.get(BASE + "audit/logs").status_code, 403)
        self.assertEqual(worker.get(BASE + f"audit/employee/{self.emps[0].pk}").status_code, 403)
