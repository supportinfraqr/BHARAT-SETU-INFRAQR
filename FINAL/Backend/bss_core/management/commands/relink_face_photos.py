"""Backfill ``WorkerFacePhoto`` rows from files already present on disk.

Some enrollments persisted the raw photos under ``worker_face_photos/<bss_id>/``
but their database rows are missing (older code wrote the file before the row, or
a table was recreated). This command re-links the on-disk photos so the worker
profile can show them again. Idempotent: a person is skipped once they have rows.
"""

import os

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from bss_core.models import WorkerFacePhoto, WorkerIdentity

BASE = "worker_face_photos"
IMAGE_EXTS = (".jpg", ".jpeg", ".png")


class Command(BaseCommand):
    help = "Backfill WorkerFacePhoto rows from files already on disk."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report only, do not write.")

    def handle(self, *args, **options):
        dry = options["dry_run"]
        try:
            # listdir returns (dirs, files) — the person folders are the dirs.
            persons, _files = default_storage.listdir(BASE)
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f"Could not list {BASE}: {exc}")
            return

        created = skipped = unresolved = 0
        for person in sorted(persons):
            try:
                _d, files = default_storage.listdir(f"{BASE}/{person}")
            except Exception:  # noqa: BLE001
                continue
            files = [f for f in files if os.path.splitext(f)[1].lower() in IMAGE_EXTS]
            if not files:
                continue
            user_id = (WorkerIdentity.objects.filter(bss_worker_id=person)
                       .values_list("user_id", flat=True).first())
            if not user_id:
                unresolved += 1
                self.stdout.write(f"  ! {person}: no worker account — skipped ({len(files)} file(s))")
                continue
            if WorkerFacePhoto.objects.filter(user_id=user_id).exists():
                skipped += 1
                continue
            # Filenames are timestamp-prefixed; the newest 5 are the latest set.
            chosen = sorted(files)[-5:]
            self.stdout.write(f"  + {person} (user {user_id}): linking {len(chosen)} of {len(files)} file(s)")
            if dry:
                created += len(chosen)
                continue
            for slot, fname in enumerate(chosen, start=1):
                WorkerFacePhoto.objects.create(
                    user_id=user_id, person=person, slot=slot,
                    path=f"{BASE}/{person}/{fname}",
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done — created {created} photo row(s); skipped {skipped} (already linked); "
            f"{unresolved} person dir(s) without an account."))
