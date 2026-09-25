"""Thin wrapper — seeding logic lives in ``bss_core/seeders/documents.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed/repair the worker document master catalog (idempotent, mandatory)."

    def handle(self, *args, **options):
        from bss_core.models import WorkerDocumentMaster
        from bss_core.seeders.documents import seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Document master ensured: {WorkerDocumentMaster.objects.count()} rows "
            f"({created} created)."))
