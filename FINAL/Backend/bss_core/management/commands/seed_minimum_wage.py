"""Seed a starter minimum-wage master (a few states × employment categories).

The cost sheet builder auto-fetches the applicable row by state + category +
effective date. Extend via BSS Admin → Minimum Wage.
"""

from django.core.management.base import BaseCommand

# state, industry, grade, category, zone, basic, vda
ROWS = [
    ("Maharashtra", "Construction", "Grade A", "Skilled", "Zone 1", 12000, 420),
    ("Maharashtra", "Construction", "Grade B", "Semi-skilled", "Zone 1", 10000, 350),
    ("Maharashtra", "Construction", "Grade C", "Unskilled", "Zone 1", 9000, 300),
    ("Gujarat", "Construction", "Grade A", "Skilled", "Zone 1", 11500, 400),
    ("Gujarat", "Construction", "Grade B", "Semi-skilled", "Zone 1", 9800, 340),
    ("Gujarat", "Construction", "Grade C", "Unskilled", "Zone 1", 8800, 290),
    ("Haryana", "Construction", "Grade A", "Skilled", "Zone 1", 11800, 410),
    ("Haryana", "Construction", "Grade B", "Semi-skilled", "Zone 1", 9900, 345),
    ("Uttar Pradesh", "Construction", "Grade A", "Skilled", "Zone 1", 11000, 380),
    ("Uttar Pradesh", "Construction", "Grade B", "Semi-skilled", "Zone 1", 9500, 320),
]


class Command(BaseCommand):
    help = "Seed a starter minimum-wage master (idempotent)."

    def handle(self, *args, **options):
        from datetime import date
        from bss_core.models import MinimumWage
        created = 0
        for state, industry, grade, category, zone, basic, vda in ROWS:
            _, was_created = MinimumWage.objects.update_or_create(
                state=state, industry=industry, grade=grade, employment_category=category,
                defaults={"wage_zone": zone, "basic_wage": basic, "vda": vda,
                          "total_wage": basic + vda, "effective_from": date(2026, 4, 1),
                          "effective_to": date(2027, 3, 31), "is_active": True})
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Minimum wage master: {MinimumWage.objects.count()} rows ({created} created)."))
