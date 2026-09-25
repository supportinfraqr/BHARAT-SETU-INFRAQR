"""Seed every mandatory BSS catalog (idempotent).

Single entrypoint for all seeders — run on container start (entrypoint.sh) and
manually anywhere: ``python manage.py seed_all``.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed/repair every mandatory catalog (idempotent)."

    def handle(self, *args, **options):
        from bss_core.seeders import run_all

        self.stdout.write("== Seeding mandatory catalogs ==")
        for label, status in run_all():
            marker = "OK" if status == "ok" else status.upper()
            self.stdout.write(f"  {label}: {marker}")
        self.stdout.write(self.style.SUCCESS("All seeders completed."))
