"""Automated end-to-end check of the BSS binding flows.

Sets up (idempotently) an employer site and a contractor-worker binding between
the demo accounts, then asserts every derived view resolves correctly:

    contractor  <-> worker   (WorkerContractorBinding)
    contractor  <-> employer (derived via the site)

Usage:
    python manage.py test_binding_flow
"""

import uuid

from django.core.management.base import BaseCommand

from bss_core.models import Site, User, WorkerContractorBinding, WorkerEmployment, WorkerIdentity
from api import v1_bridge as bridge
from api import v1_payloads as payloads

EMPLOYER_PHONE = "7777777777"
CONTRACTOR_PHONE = "4444444444"
WORKER_PHONE = "9999294962"
SITE_CODE = "TEST-SITE-001"


class Command(BaseCommand):
    help = "Create a demo binding scenario and verify the derived payloads."

    def _user(self, phone, role):
        user = User.objects.filter(username=f"{role}_{phone}").first()
        if not user:
            self.stderr.write(self.style.ERROR(
                f"Missing {role} {phone}. Run `manage.py seed_demo_accounts` first."))
        return user

    def handle(self, *args, **options):
        employer = self._user(EMPLOYER_PHONE, "employer")
        contractor = self._user(CONTRACTOR_PHONE, "contractor")
        worker = self._user(WORKER_PHONE, "worker")
        if not (employer and contractor and worker):
            return
        worker_identity = WorkerIdentity.objects.filter(user=worker).first()
        worker_bss_id = worker_identity.bss_worker_id if worker_identity else ""

        # ── Setup: employer site + contractor<->worker binding ──────────────
        site, _ = Site.objects.get_or_create(
            site_code=SITE_CODE,
            defaults={
                "employer": employer,
                "site_name": "Demo Metro Site",
                "location": "Sector 21, Navi Mumbai",
                "state": "Maharashtra",
                "site_qr_token": str(uuid.uuid4()),
            },
        )
        if site.employer_id != employer.id:
            site.employer = employer
            site.save(update_fields=["employer"])

        terms = {"designation": "Mason", "department": "Civil Works", "shift": "Day",
                 "offered_wage": 21000}
        binding, _ = WorkerContractorBinding.objects.get_or_create(
            worker=worker, contractor=contractor, site=site,
            defaults={"binding_status": "ACCEPTED", "consent_worker": True,
                      "consent_contractor": True, "consent_method": "app", **terms},
        )
        changed = []
        if binding.binding_status != "ACCEPTED":
            binding.binding_status = "ACCEPTED"
            changed.append("binding_status")
        for field, value in terms.items():
            if not getattr(binding, field):
                setattr(binding, field, value)
                changed.append(field)
        if changed:
            binding.save(update_fields=changed)

        # ── Auto-link: acceptance creates the worker's employment record ────
        bridge._sync_employment_from_binding(binding)

        # ── Assertions ──────────────────────────────────────────────────────
        results = []

        worker_bindings = payloads._worker_bindings(worker)
        match = next((b for b in worker_bindings if b["id"] == binding.id), None)
        results.append((
            "worker sees the contractor binding",
            bool(match and match["contractor"] == "BuildWell Contractors"
                 and match["employer"] == "Adani Infra Pvt Ltd"
                 and match["site"] == "Demo Metro Site"
                 and match["status"] == "Accepted"),
        ))

        results.append((
            "binding carries the offered terms",
            bool(match and match["designation"] == "Mason"
                 and match["department"] == "Civil Works"
                 and match["shift"] == "Day"
                 and match["wage"].startswith("₹21,000")),
        ))

        results.append((
            "acceptance auto-links WorkerEmployment",
            WorkerEmployment.objects.filter(
                user=worker, assignment=binding, status="Active").exists(),
        ))

        employment = payloads._worker_employment_section(worker, None)
        results.append((
            "dashboard employment reflects the binding",
            employment["status"] == "Active"
            and employment["contractor"] == "BuildWell Contractors"
            and employment["site"] == "Demo Metro Site"
            and employment["designation"] == "Mason",
        ))

        contractor_workers = payloads._contractor_workers(contractor)
        results.append((
            "contractor sees the bound worker",
            any(w["bssId"] == worker_bss_id and w["employer"] == "Adani Infra Pvt Ltd"
                and w["site"] == "Demo Metro Site" for w in contractor_workers),
        ))

        contractor_employers = payloads._contractor_employers(contractor)
        results.append((
            "contractor<->employer derived",
            any(e["name"] == "Adani Infra Pvt Ltd" for e in contractor_employers),
        ))

        principal = payloads._contractor_principal_employer(contractor)
        results.append((
            "contractor principal employer",
            principal.get("name") == "Adani Infra Pvt Ltd",
        ))

        contractor_sites = payloads._contractor_sites(contractor)
        results.append((
            "contractor site list",
            any(s["name"] == "Demo Metro Site" for s in contractor_sites),
        ))

        # ── Report ──────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(f"Binding #{binding.id}: worker {worker.username} "
                          f"<-> contractor {contractor.username} @ {site.site_code} "
                          f"(employer {employer.username})")
        self.stdout.write("")
        failed = 0
        for label, ok in results:
            if ok:
                self.stdout.write(self.style.SUCCESS(f"  PASS  {label}"))
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  FAIL  {label}"))
        self.stdout.write("")
        if failed:
            self.stderr.write(self.style.ERROR(f"{failed} binding check(s) failed."))
        else:
            self.stdout.write(self.style.SUCCESS("All binding checks passed."))
