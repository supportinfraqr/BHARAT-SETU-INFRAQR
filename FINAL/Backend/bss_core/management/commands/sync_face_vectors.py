"""Backfill worker self-enrolment vectors from the CCTV controller into BSS."""

from django.core.management.base import BaseCommand

from api import attendance_control as control
from api.face_vectors import sync_self_vectors
from bss_core.models import WorkerFacePhoto, WorkerIdentity


class Command(BaseCommand):
    help = "Sync worker self-enrolled face vectors from the attendance controller into BSS."

    def add_arguments(self, parser):
        parser.add_argument("bss_ids", nargs="*", help="Optional BSS worker IDs.")

    def handle(self, *args, **options):
        qs = WorkerIdentity.objects.all().select_related("user")
        if options["bss_ids"]:
            qs = qs.filter(bss_worker_id__in=[value.strip().upper() for value in options["bss_ids"]])
        else:
            worker_ids = (WorkerFacePhoto.objects.values_list("user_id", flat=True)
                          .distinct())
            qs = qs.filter(user_id__in=worker_ids)
        failed = 0
        for identity in qs.order_by("bss_worker_id"):
            person = str(identity.bss_worker_id or "").strip()
            if not person:
                continue
            try:
                count = sync_self_vectors(identity)
            except control.AttendanceControlError as exc:
                failed += 1
                self.stderr.write(f"{person}: controller error: {exc}")
                continue
            except Exception as exc:  # noqa: BLE001
                failed += 1
                self.stderr.write(f"{person}: sync failed: {exc}")
                continue
            self.stdout.write(f"{person}: stored {count} self vector(s)")
        if failed:
            self.stderr.write(f"{failed} worker(s) failed")
