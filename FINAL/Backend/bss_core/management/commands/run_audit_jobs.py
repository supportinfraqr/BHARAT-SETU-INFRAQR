"""Run queued monthly contractor audit jobs.

Production should run this from the isolated audit worker (cron/systemd) so the
agent process never shares the web process. The agent itself only receives the
job folder and the active AI key — no database credentials.
"""

from django.core.management.base import BaseCommand

from bss_core.models import AuditJob


class Command(BaseCommand):
    help = "Process queued monthly contractor audit jobs."

    def add_arguments(self, parser):
        parser.add_argument("--id", dest="job_id", help="Run one audit job by UUID.")
        parser.add_argument("--limit", type=int, default=5, help="Maximum jobs to process (default 5).")

    def handle(self, *args, **options):
        from api.v1_bridge.audit_jobs import _execute_job

        qs = AuditJob.objects.filter(status__in=("PENDING", "BUILDING")).order_by("created_at")
        if options.get("job_id"):
            qs = qs.filter(pk=options["job_id"])
        else:
            qs = qs[:max(1, options.get("limit") or 5)]
        jobs = list(qs)
        if not jobs:
            self.stdout.write("No queued audit jobs.")
            return
        for job in jobs:
            self.stdout.write(f"Running audit {job.id} · {job.month} {job.year} · {job.site_id}")
            _execute_job(str(job.id))
        self.stdout.write(self.style.SUCCESS(f"Processed {len(jobs)} audit job(s)."))
