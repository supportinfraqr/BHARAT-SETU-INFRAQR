"""Multi-tenant isolation and access-control tests for the payroll engine.

The cross-tenant test walks EVERY registered payroll route and attacks a fully
seeded victim org (employees, runs, claims, loans, revisions, arrears, F&F, bank
files, TDS, audit log, imports, uploaded files) from:

* the contractor of a *different* BSS world (also sending ``X-Payroll-Org`` /
  ``?orgId=`` with the victim's id),
* the employer whose site the victim's worker is bound at (a separate payroll org
  that legitimately shares the worker, but not the contractor's payroll data),
* a worker of the attacker org (also sending ``?orgId=`` / the header).

Every victim id is substituted into path params, JSON bodies and query strings.
Each call is compared with the same call made with a random (non-existent) id: a
scoped view must answer both identically. Victim rows are snapshotted after each
call (inside a rolled-back savepoint) and must never change, and no row of
another org may end up pointing at a victim employee.
"""

import copy
import json
import re
import shutil
import tempfile
import uuid

from django.apps import apps
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from bss_core.models import EmployerStaffMember, User, WorkerIdentity

from payroll_engine import bss_adapter
from payroll_engine.models import (Arrears, BankFileRecord, ClaimsDeclaration, EmployeeLoan,
                                   EmployeePreferences, EmployeeTDS, FullAndFinal, LoanRepayment,
                                   LoanType, PayrollAuditLog, PayrollEmployee,
                                   PayrollOneTimeImport, PayrollRun, PayrollSalaryRevisionImport,
                                   PayrollSchedule, SalaryCompensation, SalaryRevision, StaffPortal,
                                   StatutoryCompliance, TDSConfig)
from payroll_engine.services import files as file_service

from .fixtures import BASE, client_for, make_org_world
from .test_calc_parity import COMPONENT_SETS

MEDIA = tempfile.mkdtemp(prefix="pe_sec_media_")
UUID_RE = re.compile(r"[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}"
                     r"|\b[0-9a-f]{24}\b")
TS_RE = re.compile(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?")
SECRET_NAME = "Zorrosecret"
ORG_WIDE_VALUES = {"earnings"}
# Org-wide settings that every member of the org (workers included) may read.
ORG_WIDE_PARAMS = ("tabId", "componentId", "category")
# Workers may only open attachments referenced by their own claims / TDS
# (views/core.py serve_file); WorkerFileAccessTests covers both sides directly.
WORKER_SKIP_PARAMS = ()
SECRET_ACCOUNT = "99988877766612"


def _routes():
    from payroll_engine import urls

    out = []
    for pattern in urls.urlpatterns:
        route = str(pattern.pattern)
        if route.endswith("/"):
            continue
        methods = [m.upper() for m in getattr(pattern.callback.cls, "http_method_names", [])
                   if m not in ("options", "head")]
        out.append((route, pattern.callback, methods))
    return out


def _payroll_month():
    from payroll_engine.services.financial_year import LOCAL_TZ
    now = timezone.now().astimezone(LOCAL_TZ)
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
            "Dec"][now.month - 1], now.year


def seed_org_data(org, emp, tag):
    """One of everything for ``org`` / ``emp``. Returns {param name: [ids]}."""
    month, year = _payroll_month()
    for rec in copy.deepcopy(COMPONENT_SETS["pct_gross"]):
        for comp in rec["components"]:
            comp["_id"] = f"{comp.get('_id', 'c')}{tag}"
        SalaryCompensation.objects.create(org=org, category=rec["category"],
                                          components=rec["components"])
    StatutoryCompliance.objects.create(org=org)
    emp.payroll_info = {**emp.payroll_info, "baseSalary": 15000, "grossSalary": 30000,
                        "ctc": 400000}
    emp.custom_id = f"SEC-{tag}"
    emp.save()
    run = PayrollRun.objects.create(org=org, employee=emp, month=month, year=year,
                                    gross_earnings=31111, total_deductions=1111, net_pay=30000,
                                    pay_status="processed", working_days=30, present_days=30,
                                    earnings=[{"componentName": "Basic Salary", "amount": 15000}],
                                    deductions=[{"componentName": "TDS", "amount": 1111}])
    arrears = Arrears.objects.create(org=org, employee=emp, arrears_type="correction",
                                     total_arrears_amount=500, net_arrears_payable=500,
                                     status="calculated")
    bank = BankFileRecord.objects.create(org=org, file_name=f"bank-{tag}.csv", format="CSV",
                                         month=month, year=year, content=b"a,b\n1,2\n",
                                         mime_type="text/csv", size=8)
    claim = ClaimsDeclaration.objects.create(
        org=org, employee=emp,
        reimbursements=[{"_id": f"rb{tag}", "name": "Fuel", "type": "fuel", "claimedAmount": 100,
                         "status": "pending"}],
        flexible_benefit_plan=[{"_id": f"fp{tag}", "componentName": "Food", "amount": 10,
                                "status": "pending"}],
        income_tax_declarations=[{"_id": f"itd{tag}", "section": "80C", "amountDeclared": 10}],
        investment_proofs=[{"_id": f"ip{tag}", "declarationId": f"itd{tag}", "fileUrl": "x",
                            "status": "pending"}])
    loan_type = LoanType.objects.create(org=org, loan_name=f"Advance {tag}")
    loan = EmployeeLoan.objects.create(org=org, employee=emp, loan_type=loan_type,
                                       loan_number=f"LN-{tag}", loan_amount=12000,
                                       installment_amount=1000, total_installments=12,
                                       outstanding_balance=12000, status="active",
                                       disbursement_date=timezone.now())
    LoanRepayment.objects.create(org=org, loan=loan, employee=emp)
    tds = EmployeeTDS.objects.create(org=org, employee=emp, financial_year="2026-27")
    ff = FullAndFinal.objects.create(org=org, employee=emp, status="initiated",
                                     last_working_date=timezone.now())
    audit = PayrollAuditLog.objects.create(org=org, action="payroll_processed",
                                           entity_type="payroll", affected_employee=emp)
    one_time = PayrollOneTimeImport.objects.create(org=org, import_batch_id=f"OT-{tag}",
                                                   status="draft", month=month, year=year,
                                                   summary={"validRows": 1}, rows=[])
    rev_import = PayrollSalaryRevisionImport.objects.create(org=org, import_batch_id=f"SR-{tag}",
                                                            status="draft",
                                                            summary={"validRows": 1}, rows=[])
    revision = SalaryRevision.objects.create(org=org, employee=emp, revision_type="increment",
                                             status="pending", effective_from=timezone.now())
    tab_id = f"tab{tag}"
    StaffPortal.objects.create(org=org, web_tabs=[{"_id": tab_id, "name": "T", "url": "https://x"}])
    EmployeePreferences.objects.create(org=org, employee=emp)
    TDSConfig.objects.create(org=org, financial_year="2026-27")
    PayrollSchedule.objects.create(org=org)
    comp = SalaryCompensation.objects.filter(org=org, category="earnings").first()
    comp_id = str((comp.components or [{}])[0].get("_id", "")) if comp else ""
    stored = default_storage.save(f"payroll_engine/{org.pk}/claims/{tag}.pdf",
                                  ContentFile(b"%PDF-1.4 secret " + tag.encode()))
    file_key = stored[len("payroll_engine/"):]
    ids = {
        "employeeId": [str(emp.pk)], "payrollId": [str(run.pk)], "arrearsId": [str(arrears.pk)],
        "fileId": [str(bank.pk)], "logId": [str(audit.pk)], "revisionId": [str(revision.pk)],
        "importBatchId": [one_time.import_batch_id, rev_import.import_batch_id],
        "settlementId": [str(ff.pk)], "loanTypeId": [str(loan_type.pk)], "loanId": [str(loan.pk)],
        "tdsRecordId": [str(tds.pk)], "planId": [f"fp{tag}"], "claimId": [f"rb{tag}"],
        "proofId": [f"ip{tag}"], "declarationId": [f"itd{tag}"], "tabId": [tab_id],
        "componentId": [comp_id], "category": ["earnings"],
        "key": [file_key, f"{org.pk}/claims/../claims/{tag}.pdf"],
    }
    return ids


def _all_ids(ids):
    return {v for vs in ids.values() for v in vs if v and v != "earnings"}


@override_settings(MEDIA_ROOT=MEDIA)
class CrossTenantIsolationTests(TestCase):
    """Fuzz every route with the victim's ids from three different attackers."""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.a = make_org_world(n_workers=2, suffix="A")
        from django.core.cache import cache
        self.b = make_org_world(n_workers=1, suffix="B")
        cache.clear()
        WorkerIdentity.objects.filter(user=self.b["workers"][0]).update(name=f"{SECRET_NAME} Victim")
        self.b["workers"][0].banking.bank_account_number = SECRET_ACCOUNT
        self.b["workers"][0].banking.save()
        for org in (self.a["contractor"], self.a["employer"], self.b["contractor"], self.b["employer"]):
            bss_adapter.sync_employees(org, force=True)
        self.victim_org = self.b["contractor"]
        self.victim_emp = PayrollEmployee.objects.get(org=self.victim_org,
                                                      worker=self.b["workers"][0])
        self.victim_ids = seed_org_data(self.victim_org, self.victim_emp, "VB")
        # Attacker org has its own data too, so list endpoints are non-trivial.
        self.own_emp = PayrollEmployee.objects.get(org=self.a["contractor"],
                                                   worker=self.a["workers"][0])
        self.peer_emp = PayrollEmployee.objects.get(org=self.a["contractor"],
                                                    worker=self.a["workers"][1])
        self.peer_ids = seed_org_data(self.a["contractor"], self.peer_emp, "PA")

    # ------------------------------------------------------------------ helpers

    def _snapshot(self, org, emp_ids):
        out = {}
        for model in apps.get_app_config("payroll_engine").get_models():
            if not any(f.name == "org" for f in model._meta.fields):
                continue
            rows = list(model.objects.filter(org=org).order_by("pk").values())
            if emp_ids is not None and any(f.name == "employee" for f in model._meta.fields):
                rows = [r for r in rows if str(r.get("employee_id")) in emp_ids]
            out[model.__name__] = json.dumps(rows, default=str, sort_keys=True)
            if any(f.name == "employee" for f in model._meta.fields):
                foreign = model.objects.filter(employee_id__in=list(emp_ids or [])).exclude(org=org)
                out[model.__name__ + ":cross"] = foreign.count()
        return out

    def _call(self, client, method, url, body, headers):
        if method == "GET":
            return client.get(url, body, **headers)
        return client.generic(method, url, json.dumps(body), content_type="application/json",
                              **headers)

    @staticmethod
    def _norm(resp, sub_ids):
        status = resp.status_code
        if getattr(resp, "streaming", False):
            content = b"".join(resp.streaming_content)
        else:
            content = resp.content
        ctype = resp.get("Content-Type", "")
        if "json" not in ctype:
            return status, ctype, len(content) > 0, content.decode("latin-1")
        text = content.decode("utf-8", "replace")
        for s in sorted((x for x in sub_ids if x not in ORG_WIDE_VALUES), key=len, reverse=True):
            text = text.replace(s, "<X>")
        text = TS_RE.sub("<T>", UUID_RE.sub("<U>", text))
        return status, ctype, text, text

    def _fuzz(self, client, victim_ids, snapshot_args, forbidden, headers=None, query=None):
        headers = headers or {}
        problems = []
        before = self._snapshot(*snapshot_args)
        all_victim = _all_ids(victim_ids)
        month, year = _payroll_month()
        for route, _view, methods in _routes():
            params = re.findall(r"<(?:\w+:)?(\w+)>", route)
            # Candidate substitutions: every victim id for the route's own params,
            # or (no params) one bulk call with all body / query id keys.
            subs = []
            if params:
                primary = params[-1]
                for vid in victim_ids.get(primary, []):
                    subs.append({p: (vid if p == primary else victim_ids.get(p, ["x"])[0])
                                 for p in params})
            else:
                subs.append({})
            for method in methods:
                for sub in subs:
                    results = []
                    for kind in ("random", "victim"):
                        if kind == "random":
                            ids = {k: str(uuid.uuid4()) for k in victim_ids}
                            path_ids = {p: ("earnings" if p == "category" else
                                            f"{self.victim_org.pk}/claims/{uuid.uuid4().hex}.pdf"
                                            if p == "key" else str(uuid.uuid4())) for p in sub}
                        else:
                            ids = {k: v[0] for k, v in victim_ids.items()}
                            path_ids = dict(sub)
                        url = BASE + route
                        for p, v in path_ids.items():
                            url = re.sub(r"<(?:\w+:)?%s>" % p, v, url)
                        body = {**ids, "month": month, "year": year,
                                "employeeIds": [ids["employeeId"]], "payrollIds": [ids["payrollId"]],
                                "ids": [ids["payrollId"]], "employees": [ids["employeeId"]],
                                "status": "approved", **(query or {})}
                        used = set(ids.values()) | set(path_ids.values())
                        sid = transaction.savepoint()
                        try:
                            resp = self._call(client, method, url, body, headers)
                            norm = self._norm(resp, used)
                            after = self._snapshot(*snapshot_args)
                        finally:
                            transaction.savepoint_rollback(sid)
                        results.append(norm)
                        label = f"{method} {url} [{kind}]"
                        if after != before:
                            changed = [k for k in after if after[k] != before.get(k)]
                            problems.append(f"{label}: victim data changed {changed}")
                        leaked = [x for x in (all_victim - used) | set(forbidden)
                                  if x and x in norm[3]]
                        if leaked:
                            problems.append(f"{label}: response leaks {leaked}")
                    if results[0][:3] != results[1][:3]:
                        problems.append(f"{method} {route} {sub}: victim id answered differently "
                                        f"than a random id: {results[0][0]} vs {results[1][0]} "
                                        f"\n   random: {str(results[0][2])[:400]}"
                                        f"\n   victim: {str(results[1][2])[:400]}")
        return problems

    # ------------------------------------------------------------------ tests

    def test_other_world_contractor_cannot_touch_victim_org(self):
        org_hdr = {"HTTP_X_PAYROLL_ORG": str(self.victim_org.pk)}
        problems = self._fuzz(client_for(self.a["contractor"]), self.victim_ids,
                              (self.victim_org, None),
                              forbidden=[SECRET_NAME, SECRET_ACCOUNT, "SEC-VB"],
                              headers=org_hdr, query={"orgId": str(self.victim_org.pk)})
        self.assertEqual(problems, [], "\n".join(problems))

    def test_site_employer_cannot_touch_contractor_payroll(self):
        """The employer shares the worker but owns a separate payroll org."""
        problems = self._fuzz(client_for(self.b["employer"]), self.victim_ids,
                              (self.victim_org, None), forbidden=["SEC-VB"],
                              headers={"HTTP_X_PAYROLL_ORG": str(self.victim_org.pk)},
                              query={"orgId": str(self.victim_org.pk)})
        self.assertEqual(problems, [], "\n".join(problems))

    def test_worker_cannot_touch_peer_or_other_org(self):
        worker = client_for(self.a["workers"][0])
        peer = {k: v for k, v in self.peer_ids.items()
                if k not in ORG_WIDE_PARAMS + WORKER_SKIP_PARAMS}
        problems = self._fuzz(worker, peer,
                              (self.a["contractor"], {str(self.peer_emp.pk)}),
                              forbidden=["SEC-PA"])
        problems += self._fuzz(worker, self.victim_ids, (self.victim_org, None),
                               forbidden=[SECRET_NAME, SECRET_ACCOUNT, "SEC-VB"],
                               headers={"HTTP_X_PAYROLL_ORG": str(self.victim_org.pk)},
                               query={"orgId": str(self.victim_org.pk)})
        self.assertEqual(problems, [], "\n".join(problems))


@override_settings(MEDIA_ROOT=MEDIA)
class WorkerFileAccessTests(TestCase):
    def test_worker_cannot_download_another_workers_attachment(self):
        world = make_org_world(n_workers=2, suffix="W")
        org = world["contractor"]
        saved = file_service.save_upload(org.pk, SimpleUploadedFile(
            "bill.pdf", b"%PDF-1.4 peer", content_type="application/pdf"), "claims")
        bss_adapter.sync_employees(org, force=True)
        ClaimsDeclaration.objects.create(
            org=org, employee=PayrollEmployee.objects.get(org=org, worker=world["workers"][1]),
            reimbursements=[{"_id": "r1", "proofUrl": saved["url"], "status": "pending"}])
        url = saved["url"].replace("/v1/payroll-engine/", BASE)
        self.assertEqual(client_for(org).get(url).status_code, 200)  # HR may open it
        resp = client_for(world["workers"][0]).get(url)
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(client_for(world["workers"][1]).get(url).status_code, 200)  # owner may


@override_settings(MEDIA_ROOT=MEDIA)
class OrgResolutionTests(TestCase):
    def setUp(self):
        self.a = make_org_world(n_workers=1, suffix="A")
        self.b = make_org_world(n_workers=1, suffix="B")

    def _org_of(self, client, **kw):
        resp = client.get(BASE + "context", **kw)
        org = resp.json()["data"].get("organization") if resp.status_code == 200 else None
        return resp.status_code, (org or {}).get("_id")

    def test_org_roles_ignore_admin_org_selectors(self):
        target = str(self.b["contractor"].pk)
        for owner in (self.a["contractor"], self.a["employer"]):
            client = client_for(owner)
            self.assertEqual(self._org_of(client, HTTP_X_PAYROLL_ORG=target), (200, str(owner.pk)))
            resp = client.get(BASE + "context", {"orgId": target})
            self.assertEqual(resp.json()["data"]["organization"]["_id"], str(owner.pk))

    def test_admin_picks_org_only_among_contractors_and_employers(self):
        admin = User.objects.create_user(username="adm", password="x", role="bss_admin")
        client = client_for(admin)
        target = str(self.b["contractor"].pk)
        self.assertEqual(self._org_of(client, HTTP_X_PAYROLL_ORG=target), (200, target))
        # A worker / admin id is not an org.
        self.assertEqual(self._org_of(client, HTTP_X_PAYROLL_ORG=str(self.a["workers"][0].pk)),
                         (200, None))
        self.assertEqual(self._org_of(client, HTTP_X_PAYROLL_ORG=str(admin.pk)), (200, None))
        resp = client.get(BASE + "employees", HTTP_X_PAYROLL_ORG="not-a-number")
        self.assertEqual(resp.status_code, 400)

    def test_worker_org_id_only_selects_own_rows(self):
        worker = self.a["workers"][0]
        client = client_for(worker)
        status, org = self._org_of(client)
        self.assertEqual((status, org), (200, str(self.a["contractor"].pk)))
        # Employer row of the same worker is selectable; another world's org is not.
        self.assertEqual(self._org_of(client, QUERY_STRING=f"orgId={self.a['employer'].pk}"),
                         (200, str(self.a["employer"].pk)))
        resp = client.get(BASE + "context", {"orgId": str(self.b["contractor"].pk)})
        self.assertIsNone(resp.json()["data"]["organization"])
        self.assertIsNone(resp.json()["data"]["employee"])

    def test_non_payroll_roles_are_rejected(self):
        for role in ("government", "admin", "employer_staff_like"):
            user = User.objects.create_user(username=f"u-{role}", password="x", role=role)
            resp = client_for(user).get(BASE + "context")
            self.assertEqual(resp.status_code, 403, role)

    def test_employer_staff_without_payroll_permission_is_rejected(self):
        """Medical / safety / gate-pass officers authenticate *as* their employer
        (``BssSessionAuthentication._principal``); they must not get payroll admin."""
        staff = User.objects.create_user(username="staff1", password="x", role="employer_staff")
        EmployerStaffMember.objects.create(user=staff, employer=self.a["employer"],
                                           permissions=["medical", "safety", "gate_pass"])
        from rest_framework_simplejwt.tokens import AccessToken

        token = str(AccessToken.for_user(staff))
        client = APIClient()
        for path in ("employees", "context", "getPayRunMonthlyData"):
            resp = client.get(BASE + path, HTTP_AUTHORIZATION=f"Bearer {token}")
            self.assertEqual(resp.status_code, 403, (path, resp.content[:200]))
        # The owner still works.
        self.assertEqual(client_for(self.a["employer"]).get(BASE + "employees").status_code, 200)
        # A staff account explicitly granted "payroll" is allowed (forward compatible).
        EmployerStaffMember.objects.filter(user=staff).update(permissions=["payroll"])
        resp = client.get(BASE + "employees", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(resp.status_code, 200)


@override_settings(MEDIA_ROOT=MEDIA)
class UploadedFileTests(TestCase):
    def setUp(self):
        self.a = make_org_world(n_workers=1, suffix="A")
        self.org = self.a["contractor"]

    def test_extension_follows_validated_mime_not_client_filename(self):
        """``evil.html`` posted as image/png must not be stored (and served) as HTML."""
        org = self.org
        for name, ctype, ext in (("receipt.html", "image/png", ".png"),
                                 ("x.svg", "image/gif", ".gif"),
                                 ("x.pdf.htm", "application/pdf", ".pdf"),
                                 ("Receipt.JPEG", "image/jpeg", ".jpg"),
                                 ("data.csv", "application/vnd.ms-excel", ".csv"),
                                 ("data.xls", "application/vnd.ms-excel", ".xls")):
            saved = file_service.save_upload(org.pk, SimpleUploadedFile(name, b"x", content_type=ctype),
                                             "claims")
            self.assertTrue(saved["key"].endswith(ext), (name, saved["key"]))
            self.assertEqual(saved["fileName"], name)
        saved = file_service.save_upload(org.pk, SimpleUploadedFile(
            "receipt.html", b"<script>alert(1)</script>", content_type="image/png"), "claims")
        resp = client_for(org).get(saved["url"].replace("/v1/payroll-engine/", BASE))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "image/png")

    def test_rejects_disallowed_type_and_oversize(self):
        with self.assertRaises(Exception):
            file_service.save_upload(self.org.pk, SimpleUploadedFile(
                "a.exe", b"MZ", content_type="application/octet-stream"))
        big = SimpleUploadedFile("a.pdf", b"0" * (file_service.MAX_BYTES + 1),
                                 content_type="application/pdf")
        with self.assertRaises(Exception):
            file_service.save_upload(self.org.pk, big)

    def test_folder_and_key_traversal(self):
        saved = file_service.save_upload(self.org.pk, SimpleUploadedFile(
            "a.pdf", b"%PDF-1.4", content_type="application/pdf"), "../../etc")
        self.assertTrue(saved["key"].startswith(f"payroll_engine/{self.org.pk}/etc/"), saved)
        for key in ("../secret", f"{self.org.pk}/../../x", f"{self.org.pk}/%2e%2e/x"):
            with self.assertRaises(Exception):
                file_service.open_file(key)

    def test_served_files_are_attachment_and_org_scoped(self):
        saved = file_service.save_upload(self.org.pk, SimpleUploadedFile(
            "a.pdf", b"%PDF-1.4", content_type="application/pdf"), "claims")
        url = saved["url"].replace("/v1/payroll-engine/", BASE)
        resp = client_for(self.org).get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")
        other = make_org_world(n_workers=1, suffix="Z")["contractor"]
        self.assertEqual(client_for(other).get(url).status_code, 404)
        self.assertIn(APIClient().get(url).status_code, (401, 403))
