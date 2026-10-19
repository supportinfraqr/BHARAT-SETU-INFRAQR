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
        # Health & Safety expiry — the mandatory trainings (fire/PPE) or the site
        # induction lapses. Once any is not valid for a worker's site, clear the
        # access flags and expire that site's ACTIVE gate passes.
        from bss_core.models import SafetyRecord, WorkerGatePass, WorkerWelfareSafety
        from api.v1_bridge.medical import MANDATORY_TRAINING_KEYS
        today_iso = today.isoformat()
        safety_expired = 0
        for rec in SafetyRecord.objects.select_related("worker"):
            tr = rec.trainings or {}
            all_valid = True
            for k in (*MANDATORY_TRAINING_KEYS, "induction"):
                t = tr.get(k) or {}
                if not (t.get("completed") and t.get("validUntil") and str(t["validUntil"]) >= today_iso):
                    all_valid = False
                    break
            if all_valid:
                continue
            wws, _ = WorkerWelfareSafety.objects.get_or_create(user=rec.worker)
            if wws.site_induction_status or wws.safety_training_completed:
                wws.site_induction_status = ""
                wws.safety_training_completed = False
                wws.save(update_fields=["site_induction_status", "safety_training_completed", "updated_at"])
            for gp in WorkerGatePass.objects.filter(worker=rec.worker, site_id=rec.site_id, status="ACTIVE"):
                gp.status = "EXPIRED"
                gp.save(update_fields=["status", "updated_at"])
                Notification.objects.create(
                    user=gp.worker, type="WARNING", title="Site access revoked — safety training/induction expired",
                    body="The site induction or a mandatory safety training (fire / PPE) is no longer valid for this site. Complete it to restore access.",
                    link="/worker/gate-pass")
                safety_expired += 1
        self.stdout.write(self.style.SUCCESS(
            f"Expired {expired} gate pass(es); revoked access for {safety_expired} safety-expired gate pass(es)."))
