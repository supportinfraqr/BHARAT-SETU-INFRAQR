"""Bank file generation: API tests + byte-for-byte parity of the file builders vs legacy JS."""

import os
import unittest
from datetime import datetime, timezone
from unittest import mock

from django.test import TestCase

from payroll_engine import bss_adapter
from payroll_engine.models import BankFileRecord, PayrollAuditLog, PayrollEmployee, PayrollRun
from payroll_engine.views import bank_file_generation as bank

from .fixtures import BASE, client_for, make_org_world
from .legacy_js import SKIP_REASON, node_available
from .report_parity import run_legacy

NOW = "2026-03-31T20:15:00.000Z"   # 1 Apr 2026 01:45 IST -> "4/1/2026"


class _BankSeed(TestCase):
    def setUp(self):
        self.world = make_org_world(n_workers=4, suffix="bk")
        self.org = self.world["contractor"]
        bss_adapter.sync_employees(self.org, force=True)
        self.emps = list(PayrollEmployee.objects.filter(org=self.org).order_by("first_name"))
        e0, e1, e2, e3 = self.emps
        e0.payroll_info = {**e0.payroll_info, "employeeCode": "E-0"}
        e0.save()
        e1.bank_info = {**e1.bank_info, "bankAccountNumber": "", "ifscCode": ""}
        e1.payroll_info = {**e1.payroll_info, "bankDetails": {"accountNumber": "999", "ifscCode": "HDFC0000001"}}
        e1.save()
        e2.bank_info = {**e2.bank_info, "ifscCode": ""}
        e2.payroll_info = {**e2.payroll_info, "bankInfo": {"ifscCode": "NOTSELECTED"}}
        e2.save()
        nets = [250000.5, 18234.255, 15000, 0]
        for emp, net, status in zip(self.emps, nets, ["approved", "paid", "approved", "approved"]):
            PayrollRun.objects.create(org=self.org, employee=emp, month="Mar", year=2026,
                                      gross_earnings=net + 1000, net_pay=net, pay_status=status)
        PayrollRun.objects.create(org=self.org, employee=e0, month="Feb", year=2026, net_pay=5,
                                  pay_status="pending")
        self.client = client_for(self.org)


class BankFileApiTests(_BankSeed):
    def test_validate(self):
        res = self.client.get(BASE + "bank/validate?month=march&year=2026")
        d = res.json()["data"]
        self.assertEqual((d["total"], d["valid"], d["invalid"], d["month"], d["year"]),
                         (4, 3, 1, "Mar", 2026))
        self.assertEqual(d["issues"][0]["message"], "Missing or incomplete bank details")
        self.assertEqual(self.client.get(BASE + "bank/validate?month=Mar").json()["message"],
                         "Month and year are required")

    def test_generate_history_download_delete(self):
        res = self.client.post(BASE + "bank/generateFile", {"month": "Mar"}, format="json")
        self.assertEqual(res.json()["message"], "Month and year are required")
        res = self.client.post(BASE + "bank/generateFile", {"month": "Jan", "year": 2026}, format="json")
        self.assertEqual((res.status_code, res.json()["message"]),
                         (404, "No approved payroll records found for this period"))
        res = self.client.post(BASE + "bank/generateFile", {"month": "Mar", "year": 2026,
                                                            "bankFormat": "imps"}, format="json")
        self.assertEqual(res.json()["message"], "Unsupported bank format")
        res = self.client.post(BASE + "bank/generateFile", {"month": "Mar", "year": "2026",
                                                            "format": "csv"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()["data"]
        self.assertEqual((data["format"], data["employeeCount"], data["year"]), ("CSV", 4, 2026))
        self.assertAlmostEqual(data["totalAmount"], 250000.5 + 18234.255 + 15000)
        self.assertTrue(data["fileName"].startswith("Salary_Mar_2026_"))
        self.assertTrue(PayrollAuditLog.objects.filter(org=self.org, remarks__startswith="Bank file generated").exists())
        neft = self.client.post(BASE + "bank/generateFile", {"month": "Mar", "year": 2026},
                                format="json").json()["data"]
        hist = self.client.get(BASE + "bank/history").json()
        self.assertEqual(hist["message"], "Bank files fetched successfully")
        self.assertEqual([h["format"] for h in hist["data"]], ["NEFT", "CSV"])
        self.assertNotIn("content", hist["data"][0])
        res = self.client.get(BASE + f"bank/download/{neft['fileId']}")
        self.assertEqual(res["Content-Type"], "text/plain")
        self.assertIn(f'filename="{neft["fileName"]}"', res["Content-Disposition"])
        body = res.content.decode()
        self.assertIn("Organization: BuildWell Contractors\n", body)
        self.assertIn("Total Records: 2\n", body)       # e2 has no IFSC, e3 nets 0
        self.assertIn("Total Amount: 268234.76\n", body)
        res = self.client.delete(BASE + f"bank/{neft['fileId']}")
        self.assertEqual(res.json()["message"], "Bank file deleted successfully")
        self.assertEqual(self.client.delete(BASE + f"bank/{neft['fileId']}").status_code, 404)
        self.assertEqual(self.client.get(BASE + f"bank/download/{neft['fileId']}").json()["message"],
                         "File not found")
        BankFileRecord.objects.filter(org=self.org).delete()
        self.assertEqual(self.client.get(BASE + "bank/history").json(),
                         {"status": True, "success": True, "message": "No bank files found", "data": []})

    def test_worker_forbidden(self):
        worker = client_for(self.world["workers"][0])
        self.assertEqual(worker.get(BASE + "bank/history").status_code, 403)
        self.assertEqual(worker.post(BASE + "bank/generateFile", {}, format="json").status_code, 403)


@unittest.skipUnless(node_available(), SKIP_REASON)
class BankFileLegacyParityTests(_BankSeed):
    @mock.patch.dict(os.environ, {"LANG": "en_US.UTF-8", "LC_ALL": "en_US.UTF-8"})
    def test_file_content_byte_identical(self):
        now = datetime(2026, 3, 31, 20, 15, tzinfo=timezone.utc)
        payrolls = bank._approved_runs(self.org, "Mar", 2026)
        org = bss_adapter.org_profile(self.org)
        for fmt, year in [("NEFT", 2026), ("RTGS", "2026"), ("CSV", 2026), ("neft", "2026")]:
            with self.subTest(fmt=fmt, year=year):
                legacy = run_legacy("controller/payroll/bankFileGeneration.js", "generateBankFile",
                                    self.org, {"body": {"month": "march", "year": year, "bankFormat": fmt}},
                                    now=NOW)
                rec = legacy["created"]["BankFileRecordModel"][0]
                builder = {"NEFT": lambda: bank.generate_neft_file(payrolls, org, "Mar", year, now),
                           "RTGS": lambda: bank.generate_rtgs_file(payrolls, org, "Mar", year, now),
                           "CSV": lambda: bank.generate_csv_file(payrolls, "Mar", year, now)}[fmt.upper()]
                built = builder()
                self.assertEqual(built["fileContent"], rec["content"]["$buffer"])
                self.assertEqual(built["fileName"], rec["fileName"])
                self.assertEqual(len(built["fileContent"].encode()), rec["size"])

    def test_validate_parity(self):
        res = self.client.get(BASE + "bank/validate?month=Mar&year=2026")
        legacy = run_legacy("controller/payroll/bankFileGeneration.js", "validateBankDetails",
                            self.org, {"query": {"month": "Mar", "year": "2026"}})
        self.assertEqual(legacy["body"], res.json())
