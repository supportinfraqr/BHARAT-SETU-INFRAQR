"""Idempotently ensure the leave-type master catalog exists.

The site Calendar & Leave Setup dropdown reads this catalog, so it must never be
empty. Nothing else seeds it, so this command is run on every backend start (see
entrypoint.sh). It only creates rows that are missing — later edits to a leave
type's entitlement are never clobbered on redeploy.
"""

from django.core.management.base import BaseCommand

# Standard leave categories. `code` is the stable key (unique).
LEAVE_TYPES = [
    ("CASUAL", "Casual Leave", 12, 0, True, 1),
    ("MEDICAL", "Medical Leave", 7, 0, True, 2),
    ("PERSONAL", "Personal Leave", 5, 0, True, 3),
]


class Command(BaseCommand):
    help = "Seed/repair the leave-type master catalog (idempotent, create-only)."

    def handle(self, *args, **options):
        from bss_core.models import LeaveType

        created = 0
        for code, name, entitlement, opening, is_paid, order in LEAVE_TYPES:
            _, was_created = LeaveType.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "annual_entitlement": entitlement,
                    "opening_balance": opening,
                    "is_paid": is_paid,
                    "is_active": True,
                    "sort_order": order,
                },
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(
            f"Leave type master ensured: {LeaveType.objects.count()} rows "
            f"({created} created)."
        ))
