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

        from api.v1_bridge.audit_jobs import _reap_stale_jobs, _sync_job_from_status

        while True:
            qs = (AuditJob.objects.filter(status__in=("PENDING", "RUNNING"))
                  .exclude(job_dir="").order_by("created_at"))
            if options.get("job_id"):
                qs = qs.filter(pk=options["job_id"])
            synced = 0
            for job in qs:
                if _sync_job_from_status(job):
                    synced += 1
            _reap_stale_jobs()
            self._disk_warning()
            if synced:
                self.stdout.write(self.style.SUCCESS(f"Synced {synced} audit job(s)."))
            if not options.get("loop"):
                if not synced:
                    self.stdout.write("No audit status changes.")
                return
            time.sleep(max(5, options.get("sleep") or 30))

    def _disk_warning(self):
        import shutil

        from django.conf import settings
        from django.core.cache import cache

        from bss_core.models import User

        try:
            usage = shutil.disk_usage(settings.BSS_AUDIT_JOBS_DIR)
        except OSError:
            return
        free_pct = usage.free / usage.total if usage.total else 1
        if free_pct >= 0.2 and usage.free >= 5 * 1024 ** 3:
            return
        if cache.get("bss:audit:disk-warning"):
            return
        admin = User.objects.filter(role="bss_admin", is_active=True).first()
        body = (f"Audit volume free space is {free_pct * 100:.1f}% "
                f"({usage.free // (1024 ** 3)} GB free). Reports and raw job data are retained; "
                "plan the larger volume/S3 replacement.")
        if admin is not None:
            from api.v1_bridge.common import _create_notification
            _create_notification(admin, "Audit storage running low", body, "WARNING", "/admin/audit-reports")
        self.stdout.write(self.style.WARNING(body))
        cache.set("bss:audit:disk-warning", True, 24 * 3600)
