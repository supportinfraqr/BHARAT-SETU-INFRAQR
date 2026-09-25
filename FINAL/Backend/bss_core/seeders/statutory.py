"""Statutory component rate master (mandatory, idempotent)."""

# component, label, rate, rate_type, condition, mandatory
STATUTORY_COMPONENTS = [
    ("EPF", "EPF (Employer PF)", 12, "PERCENT", "Establishments with 20+ employees", True),
    ("EPS", "EPS", 8.33, "PERCENT", "Part of employer EPF contribution", True),
    ("EDLI", "EDLI", 0.5, "PERCENT", "Employer-only contribution", True),
    ("ESIC", "ESIC (Employer)", 3.25, "PERCENT", "Conditional (wage ≤ ESIC threshold)", False),
    ("BONUS", "Bonus", 8.33, "PERCENT", "Annual provision under Payment of Bonus Act", True),
    ("GRATUITY", "Gratuity", 4.81, "PERCENT", "Monthly provision under Payment of Gratuity Act", True),
    ("LWF", "Labour Welfare Fund", 0, "FIXED", "State-specific; varies by state notification", False),
    ("LEAVE_RESERVE", "Leave Reserve", 0, "PERCENT", "Earned Leave provision per Shops & Factories Act", True),
    ("WEEKLY_OFF", "Weekly Off", 0, "DAYS", "Mandatory paid weekly off – included in cost", True),
    ("NATIONAL_HOLIDAYS", "National Holidays", 0, "DAYS", "Mandatory paid national holidays provision", True),
]


def seed():
    from bss_core.models import StatutoryMaster
    created = 0
    for component, label, rate, rate_type, condition, mandatory in STATUTORY_COMPONENTS:
        _, was_created = StatutoryMaster.objects.update_or_create(
            component=component,
            defaults={"label": label, "rate": rate, "rate_type": rate_type,
                      "condition": condition, "mandatory": mandatory, "is_active": True})
        created += int(was_created)
    return created
