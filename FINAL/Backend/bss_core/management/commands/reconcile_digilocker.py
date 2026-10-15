"""Re-verify fetched DigiLocker documents and fix mis-slotted PAN/DL records.

For every user with a DigiLocker profile (or a single ``--username``), each
fetched file is re-processed through the content-verified pipeline: a genuine
PAN lands in the PAN slot, a driving licence in the DL slot, and any PAN that
isn't backed by a real PAN document is removed (so it can't read as verified).
Idempotent — safe to run repeatedly."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = ("Fix fetched DigiLocker documents: store each in the slot its content "
            "says it is (PAN/DL/…), and clear any PAN not backed by a genuine PAN.")

    def add_arguments(self, parser):
        parser.add_argument("--username", default="",
                            help="Process only this user (default: all DigiLocker users).")

    def handle(self, *args, **options):
        from api.views import _reconcile_user_digilocker
        from bss_core.models import DigiLockerProfile

        User = get_user_model()
        username = (options.get("username") or "").strip()
        if username:
            users = list(User.objects.filter(username=username))
        else:
            ids = set(DigiLockerProfile.objects.values_list("user_id", flat=True))
            users = list(User.objects.filter(id__in=ids))

        for user in users:
            _reconcile_user_digilocker(user)
            self.stdout.write(f"reconciled {user.username}")
        self.stdout.write(self.style.SUCCESS(f"Done — {len(users)} user(s)."))
