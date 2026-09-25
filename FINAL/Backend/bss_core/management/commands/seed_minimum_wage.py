"""Thin wrapper — seeding logic lives in ``bss_core/seeders/minimum_wage.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed a minimum-wage master for all states/UTs (idempotent)."

    def handle(self, *args, **options):
        from bss_core.models import MinimumWage
        from bss_core.seeders.minimum_wage import SKILLED_BASIC, seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Minimum wage master: {MinimumWage.objects.count()} rows "
            f"({created} created, {len(SKILLED_BASIC)} states/UTs × 3 grades)."))
