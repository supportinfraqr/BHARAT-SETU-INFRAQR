"""Re-issue stored worker letters as fixed PDFs.

Appointment / experience letters used to be stored as HTML snapshots. This
command re-renders every stored auto-issued letter (APPT / EXPL) as a real PDF
via WeasyPrint, replacing only the SAME binding's generation so the letter's
content (site, wage, cost sheet) is unchanged — it stays a fixed snapshot of
that engagement. Idempotent and safe to run repeatedly.

    python manage.py issue_letters_as_pdf
    python manage.py issue_letters_as_pdf --dry-run
"""

import re

from django.core.management.base import BaseCommand

from api import letters
from bss_core.models import (
    WorkerContractorBinding,
    WorkerDocument,
    WorkerDocumentMaster,
)


class Command(BaseCommand):
    help = "Re-issue stored appointment/experience letters as fixed PDF files."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would change without writing.")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run")
        masters = {m.code: m.id for m in WorkerDocumentMaster.objects.all()
                   if m.code in letters.LETTER_CODES.values()}
        if not masters:
            self.stdout.write(self.style.WARNING("No letter document masters found."))
            return

        docs = (WorkerDocument.objects
                .filter(auto_generated=True, owner_role="system",
                        document_id__in=list(masters.values()))
                .order_by("id"))
        reissued = skipped = failed = 0
        for doc in docs:
            match = re.match(r"^(APPT|EXPL)-(\d+)-", doc.file_name or "")
            letter_type = "appointment" if (match and match.group(1) == "APPT") else "experience"
            binding = (WorkerContractorBinding.objects
                       .filter(pk=int(match.group(2))).first() if match else None)
            if binding is None:
                skipped += 1
                continue
            if dry_run:
                self.stdout.write(f"would re-issue {doc.file_name} (binding {binding.id}) as PDF")
                reissued += 1
                continue
            try:
                new = letters.issue_letter(binding, letter_type)
            except Exception as exc:
                failed += 1
                self.stderr.write(f"FAILED {doc.file_name}: {exc}")
                continue
            if new is None:
                failed += 1
            else:
                reissued += 1
                self.stdout.write(f"re-issued {doc.file_name} -> {new.file_name} ({new.mime_type})")

        verb = "would re-issue" if dry_run else "re-issued"
        self.stdout.write(self.style.SUCCESS(
            f"Letters {verb}: {reissued} · skipped: {skipped} · failed: {failed}"))
