"""Sync isolated audit-runner status files into AuditJob rows.

The runner has no DB access. It writes status.json inside each job folder; this
BSS-side command reads it and updates the database.
"""

from django.core.management.base import BaseCommand

from bss_core.models import AuditJob


class Command(BaseCommand):
    help = "Sync audit-runner status.json files into AuditJob records."

    def add_arguments(self, parser):
        parser.add_argument("--id", dest="job_id", help="Sync one audit job by UUID.")
        parser.add_argument("--loop", action="store_true", help="Keep running.")
        parser.add_argument("--sleep", type=int, default=30, help="Seconds between loop passes.")

    def handle(self, *args, **options):
        import time

        from api.v1_bridge.audit_jobs import _sync_job_from_status

        while True:
            qs = (AuditJob.objects.filter(status__in=("PENDING", "RUNNING"))
                  .exclude(job_dir="").order_by("created_at"))
            if options.get("job_id"):
                qs = qs.filter(pk=options["job_id"])
            synced = 0
            for job in qs:
                if _sync_job_from_status(job):
                    synced += 1
            if synced:
                self.stdout.write(self.style.SUCCESS(f"Synced {synced} audit job(s)."))
            if not options.get("loop"):
                if not synced:
                    self.stdout.write("No audit status changes.")
                return
            time.sleep(max(5, options.get("sleep") or 30))
