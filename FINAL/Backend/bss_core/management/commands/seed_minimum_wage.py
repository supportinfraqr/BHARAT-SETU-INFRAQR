"""Seed a starter minimum-wage master for ALL Indian states & UTs.

Construction scheduled employment — Grade A (Skilled), Grade B (Semi-skilled),
Grade C (Unskilled) — with a VDA provision per month. Values are indicative
monthly figures; admin can refine per state via BSS Admin → Minimum Wage.

Idempotent (update_or_create on state + industry + grade + category).
"""

from django.core.management.base import BaseCommand

# state, Grade A skilled basic wage/month (indicative ₹)
SKILLED_BASIC = {
    "Andhra Pradesh": 10800, "Arunachal Pradesh": 9000, "Assam": 10000,
    "Bihar": 10000, "Chhattisgarh": 9800, "Goa": 13000, "Gujarat": 11500,
    "Haryana": 11800, "Himachal Pradesh": 11000, "Jammu and Kashmir": 11000,
    "Jharkhand": 10300, "Karnataka": 12800, "Kerala": 13500, "Ladakh": 10500,
    "Madhya Pradesh": 9600, "Maharashtra": 12000, "Manipur": 9500,
    "Meghalaya": 9600, "Mizoram": 9700, "Nagaland": 9500, "Odisha": 10000,
    "Punjab": 11600, "Rajasthan": 10100, "Sikkim": 10500, "Tamil Nadu": 12400,
    "Telangana": 12500, "Tripura": 9800, "Uttar Pradesh": 11000,
    "Uttarakhand": 11200, "West Bengal": 10800,
    # Union Territories
    "Andaman and Nicobar Islands": 11000, "Chandigarh": 13000,
    "Dadra and Nagar Haveli and Daman and Diu": 10500, "Delhi": 14800,
    "Lakshadweep": 10800, "Puducherry": 11500,
}


def _round10(value):
    return int(round(value / 10.0) * 10)


class Command(BaseCommand):
    help = "Seed a minimum-wage master for all states/UTs (idempotent)."

    def handle(self, *args, **options):
        from datetime import date
        from bss_core.models import MinimumWage
        created = 0
        for state, skilled in SKILLED_BASIC.items():
            for grade, factor in (("Grade A", 1.0), ("Grade B", 0.85), ("Grade C", 0.72)):
                category = {"Grade A": "Skilled", "Grade B": "Semi-skilled",
                            "Grade C": "Unskilled"}[grade]
                basic = _round10(skilled * factor)
                vda = _round10(basic * 0.04)
                total = basic + vda
                _, was_created = MinimumWage.objects.update_or_create(
                    state=state, industry="Construction", grade=grade,
                    employment_category=category,
                    defaults={
                        "wage_zone": "Zone 1", "basic_wage": basic, "vda": vda,
                        "total_wage": total,
                        "details": {"minimumWage": total, "floorWage": basic},
                        "effective_from": date(2026, 4, 1),
                        "effective_to": date(2027, 3, 31), "is_active": True,
                    })
                created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Minimum wage master: {MinimumWage.objects.count()} rows "
            f"({created} created, {len(SKILLED_BASIC)} states/UTs × 3 grades)."))