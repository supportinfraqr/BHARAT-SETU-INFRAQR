"""Automated end-to-end check of the contractor <-> employer binding flow.

Sets up (idempotently) an accepted binding between the demo contractor and
employer with one approved site allotment, then asserts every derived view and
the site-gating rule resolve correctly:

    contractor  <-> employer          (ContractorEmployerBinding)
    contractor  -> allotted site      (ContractorSiteAllotment, APPROVED)
    gating: a contractor may only bind workers at an allotted site

Usage:
    python manage.py test_contractor_binding
"""

import uuid

from django.core.management.base import BaseCommand

from bss_core.models import (
    ContractorEmployerBinding,
    ContractorSiteAllotment,
    Site,
    User,
)
from api import v1_bridge as bridge
from api import v1_payloads as payloads

EMPLOYER_PHONE = "7777777777"
CONTRACTOR_PHONE = "4444444444"
SITE_BSS_ID = "BSS-STEST000001"


class Command(BaseCommand):
    help = "Create a demo contractor binding and verify the derived payloads."

    def _user(self, phone, role):
        user = User.objects.filter(username=f"{role}_{phone}").first()
        if not user:
            self.stderr.write(self.style.ERROR(
                f"Missing {role} {phone}. Run `manage.py seed_demo_accounts` first."))
        return user

    def handle(self, *args, **options):
        employer = self._user(EMPLOYER_PHONE, "employer")
        contractor = self._user(CONTRACTOR_PHONE, "contractor")
        if not (employer and contractor):
            return

        site, _ = Site.objects.get_or_create(
            bss_site_id=SITE_BSS_ID,
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

        # ── Setup: accepted binding + approved site allotment ────────────
        binding, _ = ContractorEmployerBinding.objects.get_or_create(
            contractor=contractor, employer=employer,
            defaults={"binding_status": "ACCEPTED", "consent_contractor": True,
                      "consent_employer": True, "consent_method": "app",
                      "source": "site_qr"},
        )
        changed = []
        if binding.binding_status != "ACCEPTED":
            binding.binding_status = "ACCEPTED"
            changed += ["binding_status"]
        if not binding.consent_contractor:
            binding.consent_contractor = True
            changed += ["consent_contractor"]
        if not binding.consent_employer:
            binding.consent_employer = True
            changed += ["consent_employer"]
        if changed:
            binding.save(update_fields=changed)

        allotment, _ = ContractorSiteAllotment.objects.get_or_create(
            binding=binding, site=site,
            defaults={"status": "APPROVED", "source": "employer_allot"},
        )
        if allotment.status != "APPROVED":
            allotment.status = "APPROVED"
            allotment.save(update_fields=["status"])

        # ── Assertions ──────────────────────────────────────────────────────
        results = []

        employer_view = payloads._employer_bindings(employer)
        row = next((e for e in employer_view if e["id"] == binding.id), None)
        results.append((
            "employer sees the binding",
            bool(row and row["contractor"] == "BuildWell Contractors"
                 and row["status"] == "Accepted"),
        ))
        results.append((
            "binding carries the approved allotment",
            bool(row and any(a["site"] == "Demo Metro Site" and a["status"] == "Approved"
                             for a in row["allotments"])),
        ))

        contractor_view = payloads._contractor_bindings(contractor)
        results.append((
            "contractor sees the binding",
            any(e["id"] == binding.id and e["employer"] == "Adani Infra Pvt Ltd"
                for e in contractor_view),
        ))

        results.append((
            "contractor site list includes the allotted site",
            any(s["name"] == "Demo Metro Site" for s in payloads._contractor_sites(contractor)),
        ))

        results.append((
            "gating allows binding at the allotted site",
            bridge._contractor_engaged_at_site(contractor, site.id) is True,
        ))

        # A dedicated site for the same employer that is NOT allotted to this
        # contractor — binding workers here must be blocked by the gating rule.
        other_site, _ = Site.objects.get_or_create(
            bss_site_id="BSS-STEST000002",
            defaults={"employer": employer, "site_name": "Non-allotted Test Site",
                      "state": "Maharashtra", "site_qr_token": str(uuid.uuid4())},
        )
        if other_site.employer_id != employer.id:
            other_site.employer = employer
            other_site.save(update_fields=["employer"])
        ContractorSiteAllotment.objects.filter(binding__contractor=contractor, site=other_site).delete()
        results.append((
            "gating blocks binding at a non-allotted site",
            bridge._contractor_engaged_at_site(contractor, other_site.id) is False,
        ))

        # ── Report ──────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(f"Binding #{binding.id}: contractor {contractor.username} "
                          f"<-> employer {employer.username} @ {site.bss_site_id}")
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
