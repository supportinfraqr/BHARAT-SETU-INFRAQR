"""Thin wrapper — seeding logic lives in ``bss_core/seeders/compliance.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed/repair the statutory compliance catalog (idempotent)."

    def handle(self, *args, **options):
        from bss_core.models import ComplianceMaster, RegisterDocumentMaster
        from bss_core.seeders.compliance import seed

        c_created, r_created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Compliance master ensured: {ComplianceMaster.objects.count()} matrix rows "
            f"({c_created} created), {RegisterDocumentMaster.objects.count()} register docs "
            f"({r_created} created)."))
