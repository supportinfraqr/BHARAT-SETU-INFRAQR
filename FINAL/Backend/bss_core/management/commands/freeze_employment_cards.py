"""Freeze an Employment Card PDF for every ended engagement.

The card is normally frozen automatically when a binding is unbound; this
backfills engagements that ended before that behaviour existed so the worker's
Employment History shows the card snapshot from when that employment was active
(with its EXPIRED watermark) instead of the worker's current card.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Freeze an Employment Card PDF for every ended engagement."

    def handle(self, *args, **options):
        from api import letters
        from bss_core.models import WorkerContractorBinding

        qs = (WorkerContractorBinding.objects
              .filter(binding_status__in=("CANCELLED", "TRANSFERRED"))
              .select_related("worker", "contractor", "site", "site__employer"))
        issued = 0
        for binding in qs:
            try:
                doc = letters.issue_letter(binding, "card")
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"binding {binding.id}: {exc}")
                continue
            if doc is not None:
                issued += 1
        self.stdout.write(self.style.SUCCESS(f"Employment cards frozen: {issued}"))
