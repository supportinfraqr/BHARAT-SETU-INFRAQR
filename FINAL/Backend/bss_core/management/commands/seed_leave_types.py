"""Thin wrapper — seeding logic lives in ``bss_core/seeders/leave_types.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed/repair the leave-type master catalog (idempotent, create-only)."

    def handle(self, *args, **options):
        from bss_core.models import LeaveType
        from bss_core.seeders.leave_types import seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Leave type master ensured: {LeaveType.objects.count()} rows "
            f"({created} created)."))
