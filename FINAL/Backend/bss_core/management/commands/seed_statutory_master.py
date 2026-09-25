"""Thin wrapper — seeding logic lives in ``bss_core/seeders/statutory.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed/repair the statutory component rate master (idempotent)."

    def handle(self, *args, **options):
        from bss_core.models import StatutoryMaster
        from bss_core.seeders.statutory import seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Statutory master ensured: {StatutoryMaster.objects.count()} components "
            f"({created} created)."))
