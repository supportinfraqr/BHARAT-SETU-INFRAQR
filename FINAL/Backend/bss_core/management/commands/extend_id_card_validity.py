"""Recompute worker ID-card validity to the current rule (5 years from issue).

Cards issued under the previous 1-year rule are extended. Idempotent — safe to
run repeatedly. Run locally / on a server when ready:

    python manage.py extend_id_card_validity
"""

from django.core.management.base import BaseCommand

from bss_core.models import WorkerEmployment
from api.v1_bridge.aadhaar import _id_card_validity


class Command(BaseCommand):
    help = "Recompute worker ID-card validity to 5 years from the issue date."

    def handle(self, *args, **options):
        updated = 0
        for emp in WorkerEmployment.objects.exclude(id_card_issue_date=None):
            new_till = _id_card_validity(emp.id_card_issue_date)
            if emp.id_card_validity_till != new_till:
                emp.id_card_validity_till = new_till
                emp.save(update_fields=["id_card_validity_till", "updated_at"])
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f"Worker ID-card validity updated for {updated} record(s)."))
