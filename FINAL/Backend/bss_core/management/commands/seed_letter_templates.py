"""Thin wrapper — seeding logic lives in ``bss_core/seeders/letter_templates.py``."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed the all-India default Appointment / Experience letter templates."

    def handle(self, *args, **options):
        from bss_core.models import LetterTemplate
        from bss_core.seeders.letter_templates import seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Letter templates ready ({created} created, "
            f"{LetterTemplate.objects.count()} total)."))
