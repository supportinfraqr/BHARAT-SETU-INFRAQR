from django.test import TestCase

from payroll_engine.models import PayrollEmployee

from .fixtures import BASE, client_for, make_org_world


class CoreApiTests(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=2)

    def test_contractor_sees_synced_employees(self):
        res = client_for(self.world["contractor"]).get(BASE + "employees")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(len(body["data"]), 2)
        emp = body["data"][0]
        self.assertEqual(emp["bankInfo"]["ifscCode"], "SBIN0001234")
        self.assertEqual(emp["statutoryInfo"]["ptState"], "Gujarat")
        self.assertEqual(emp["dateOfJoining"], "2024-04-01T00:00:00Z")

    def test_employer_sees_site_workers(self):
        res = client_for(self.world["employer"]).get(BASE + "employees")
        self.assertEqual(len(res.json()["data"]), 2)

    def test_worker_context_and_hr_block(self):
        worker = self.world["workers"][0]
        ctx = client_for(worker).get(BASE + "context").json()
        self.assertTrue(ctx["data"]["isEmployee"])
        self.assertEqual(ctx["data"]["employee"]["workerId"], str(worker.pk))
        self.assertEqual(client_for(worker).get(BASE + "employees").status_code, 403)

    def test_exit_marks_inactive(self):
        client = client_for(self.world["contractor"])
        client.get(BASE + "employees")
        emp = PayrollEmployee.objects.filter(org=self.world["contractor"]).first()
        res = client.put(BASE + f"employees/{emp.pk}/exit",
                         {"exitStatus": "Resigned", "lastWorkingDay": "2025-03-15"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        emp.refresh_from_db()
        self.assertEqual(emp.status, "Inactive")
