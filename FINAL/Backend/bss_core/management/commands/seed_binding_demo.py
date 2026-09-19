"""Seed a local binding scenario so the contractor "Change Site" flow can be tested.

Creates, for one contractor:
  - an ACCEPTED contractor<->employer engagement,
  - APPROVED site allotments at every site of that employer,
  - ACCEPTED worker bindings for all workers, at the first site.

Then a contractor can move a bound worker to any other allotted site from
/contractor/workers -> row menu -> Change Site.

Usage:
    python manage.py seed_binding_demo
    python manage.py seed_binding_demo --contractor contractor_4444444444 \
        --employer employer_7777777777
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from bss_core.models import (
    ContractorEmployerBinding,
    ContractorSiteAllotment,
    Site,
    User,
    WorkerContractorBinding,
    WorkerIdentity,
)

TERMS = [
    ("Mason", "Civil", "Day", 780),
    ("Helper", "Civil", "Day", 620),
    ("Steel Fixer", "Structure", "General", 850),
]


class Command(BaseCommand):
    help = "Seed an accepted contractor<->employer engagement, site allotments and worker bindings."

    def add_arguments(self, parser):
        parser.add_argument("--contractor", default="contractor_4444444444")
        parser.add_argument("--employer", default="employer_7777777777")
        parser.add_argument("--successor", default="contractor_5555555555",
                            help="A second contractor engaged at the same employer "
                                 "(a candidate successor when the first unbinds).")
        parser.add_argument("--zero-worker", default="contractor_6666666666",
                            help="A contractor engaged with approved sites but NO "
                                 "workers, to test a pure site-level handover.")

    @transaction.atomic
    def handle(self, *args, **options):
        from api.v1_bridge.bindings import _sync_employment_from_binding

        contractor = User.objects.filter(username=options["contractor"], role="contractor").first()
        employer = User.objects.filter(username=options["employer"], role="employer").first()
        if contractor is None or employer is None:
            self.stderr.write("Contractor or employer not found.")
            return

        sites = list(Site.objects.filter(employer=employer).order_by("id"))
        if not sites:
            self.stderr.write("Employer has no sites.")
            return

        ceb, _ = ContractorEmployerBinding.objects.get_or_create(
            contractor=contractor, employer=employer,
            binding_status__in=("PENDING", "ACCEPTED"),
            defaults={"binding_status": "ACCEPTED", "consent_contractor": True,
                      "consent_employer": True, "consent_method": "app",
                      "source": "site_qr", "accepted_at": timezone.now()},
        )
        if ceb.binding_status != "ACCEPTED":
            ceb.binding_status = "ACCEPTED"
            ceb.consent_contractor = ceb.consent_employer = True
            ceb.accepted_at = ceb.accepted_at or timezone.now()
            ceb.save()
        self.stdout.write(f"Engagement: {contractor.username} <-> {employer.username} [{ceb.binding_status}]")

        for site in sites:
            alloc, _ = ContractorSiteAllotment.objects.get_or_create(
                binding=ceb, site=site,
                defaults={"status": "APPROVED", "source": "employer_allot",
                          "approved_at": timezone.now()},
            )
            if alloc.status != "APPROVED":
                alloc.status = "APPROVED"
                alloc.approved_at = alloc.approved_at or timezone.now()
                alloc.save()
            self.stdout.write(f"  allotted: {site.site_code} {site.site_name} [{alloc.status}]")

        demo = [s for s in sites if "demo" in s.site_name.lower()]
        # Spread workers over the first two demo sites so the contractor has
        # workers on more than one site and at least one empty site (abcd).
        home_sites = demo[:2] or sites[:1]
        identities = list(WorkerIdentity.objects.select_related("user").order_by("user_id"))
        for i, ident in enumerate(identities):
            title, dept, shift, wage = TERMS[i % len(TERMS)]
            site = home_sites[i % len(home_sites)]
            binding, created = WorkerContractorBinding.objects.get_or_create(
                worker=ident.user, contractor=contractor, site=site,
                binding_status__in=("PENDING", "ACCEPTED"),
                defaults={"binding_status": "ACCEPTED", "initiated_by": "contractor",
                          "consent_worker": True, "consent_contractor": True,
                          "consent_method": "app", "designation": title,
                          "department": dept, "shift": shift,
                          "offered_wage": wage, "accepted_at": timezone.now()},
            )
            if binding.binding_status != "ACCEPTED":
                binding.binding_status = "ACCEPTED"
                binding.consent_worker = binding.consent_contractor = True
                binding.accepted_at = binding.accepted_at or timezone.now()
                binding.save()
            _sync_employment_from_binding(binding)
            state = "created" if created else "existing"
            self.stdout.write(
                f"  bound {ident.name} ({ident.bss_worker_id}) @ {site.site_name} "
                f"as {title} [{binding.binding_status}] ({state})")

        successor = User.objects.filter(username=options["successor"], role="contractor").first()
        if successor is not None and successor.id != contractor.id:
            sceb, _ = ContractorEmployerBinding.objects.get_or_create(
                contractor=successor, employer=employer,
                binding_status__in=("PENDING", "ACCEPTED"),
                defaults={"binding_status": "ACCEPTED", "consent_contractor": True,
                          "consent_employer": True, "consent_method": "app",
                          "source": "site_qr", "accepted_at": timezone.now()},
            )
            if sceb.binding_status != "ACCEPTED":
                sceb.binding_status = "ACCEPTED"
                sceb.consent_contractor = sceb.consent_employer = True
                sceb.accepted_at = sceb.accepted_at or timezone.now()
                sceb.save()
            for site in sites:
                alloc, _ = ContractorSiteAllotment.objects.get_or_create(
                    binding=sceb, site=site,
                    defaults={"status": "APPROVED", "source": "employer_allot",
                              "approved_at": timezone.now()},
                )
                if alloc.status != "APPROVED":
                    alloc.status = "APPROVED"
                    alloc.approved_at = alloc.approved_at or timezone.now()
                    alloc.save()
            self.stdout.write(f"Successor: {successor.username} <-> {employer.username} "
                              f"[{sceb.binding_status}] · {len(sites)} approved site(s)")

        # A zero-worker contractor engaged at the same employer with approved
        # sites — lets the employer test a pure site-level handover on unbind.
        zero = User.objects.filter(username=options["zero_worker"], role="contractor").first()
        if zero is not None and zero.id not in (contractor.id, getattr(successor, "id", None)):
            zceb, _ = ContractorEmployerBinding.objects.get_or_create(
                contractor=zero, employer=employer,
                binding_status__in=("PENDING", "ACCEPTED"),
                defaults={"binding_status": "ACCEPTED", "consent_contractor": True,
                          "consent_employer": True, "consent_method": "app",
                          "source": "site_qr", "accepted_at": timezone.now()},
            )
            if zceb.binding_status != "ACCEPTED":
                zceb.binding_status = "ACCEPTED"
                zceb.consent_contractor = zceb.consent_employer = True
                zceb.accepted_at = zceb.accepted_at or timezone.now()
                zceb.save()
            zero_sites = sites[:2]
            for site in zero_sites:
                alloc, _ = ContractorSiteAllotment.objects.get_or_create(
                    binding=zceb, site=site,
                    defaults={"status": "APPROVED", "source": "employer_allot",
                              "approved_at": timezone.now()},
                )
                if alloc.status != "APPROVED":
                    alloc.status = "APPROVED"
                    alloc.approved_at = alloc.approved_at or timezone.now()
                    alloc.save()
            self.stdout.write(f"Zero-worker: {zero.username} <-> {employer.username} "
                              f"[{zceb.binding_status}] · {len(zero_sites)} site(s), 0 workers")

        self.stdout.write(self.style.SUCCESS(
            "\nScenarios ready:\n"
            f"  A) WITH workers : {contractor.username} — sites: "
            + ", ".join(s.site_name for s in sites)
            + " (workers spread over the first two; abcd is empty)\n"
            "     → Unbind/release: successor MANDATORY; all sites + workers shift to the successor.\n"
            f"  B) ZERO workers : {zero.username if zero else '—'} — 2 sites, 0 workers\n"
            "     → Unbind/release: successor OPTIONAL; hand over or release without one.\n"
            f"  Successors      : {successor.username if successor else '—'} (or any other contractor)"))
