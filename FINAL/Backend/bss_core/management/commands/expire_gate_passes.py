"""Auto-expire active gate passes whose validity has passed.

Gate Pass Management System §7 — a scheduled job flips Active → Expired once the
valid-to date has passed, invalidating the QR and notifying stakeholders.

Run from cron (prod) or manually:
    python manage.py expire_gate_passes
"""

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Expire active gate passes past their valid-to date and notify stakeholders."

    def handle(self, *args, **options):
        from bss_core.models import Notification, WorkerGatePass

        today = timezone.localdate()
        expiring = (WorkerGatePass.objects
                    .filter(status="ACTIVE", end_date__lt=today)
                    .select_related("worker", "site", "issued_by"))
        expired = 0
        for gp in expiring:
            gp.status = "EXPIRED"
            gp.save(update_fields=["status", "updated_at"])
            recipients = [gp.worker]
            if gp.issued_by_id:
                recipients.append(gp.issued_by)
            for party in recipients:
                Notification.objects.create(
                    user=party, type="WARNING", title="Gate pass expired",
                    body=f"Gate pass {gp.gate_pass_no} expired on "
                         f"{gp.end_date}. It can be renewed if the worker is eligible.",
                    link="/worker/gate-pass")
            expired += 1
        self.stdout.write(self.style.SUCCESS(f"Expired {expired} gate pass(es)."))
