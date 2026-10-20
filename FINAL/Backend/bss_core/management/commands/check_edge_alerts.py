from django.core.management.base import BaseCommand

from bss_core.edge_alerts import check_no_data_alerts


class Command(BaseCommand):
    help = "Open no-data alerts for cameras that are in Send Data mode and overdue."

    def handle(self, *args, **options):
        opened = check_no_data_alerts()
        self.stdout.write(self.style.SUCCESS(f"Edge alerts checked; opened={opened}"))
