"""Drop raw edge face embeddings after their retention window.

Attendance and event metadata are kept; only the biometric embedding is nulled.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from bss_core.models import EdgeEvent


class Command(BaseCommand):
    help = "Null raw edge-event face embeddings older than N days (default 7)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=7)

    def handle(self, *args, **options):
        days = max(1, int(options.get("days") or 7))
        cutoff = timezone.now() - timedelta(days=days)
        qs = (EdgeEvent.objects.filter(created_at__lt=cutoff)
              .exclude(embedding__isnull=True))
        count = qs.update(embedding=None)
        self.stdout.write(self.style.SUCCESS(
            f"Purged raw embeddings from {count} edge event(s) older than {days} day(s)."))
