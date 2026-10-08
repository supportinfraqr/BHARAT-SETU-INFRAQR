"""Backfill the PAN holder name (and Aadhaar-name match) from stored PAN PDFs.

DigiLocker fetches the PAN as a signed PDF; we OCR it to read the holder name so
the worker's PAN card can show the name with a "matched with Aadhaar" tick.
Fresh fetches do this automatically — this command fixes PANs already on record.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "OCR stored DigiLocker PAN PDFs to fill pan_holder_name + Aadhaar match."

    def handle(self, *args, **options):
        from api import ocr_client
        from api.identity_utils import names_match
        from bss_core.models import DigiLockerDocument, WorkerIdentity

        updated = 0
        for doc in DigiLockerDocument.objects.exclude(user__isnull=True):
            is_pan = bool(doc.pan_number) or (doc.doctype or "").upper() == "PANCR"
            if not is_pan or not doc.file_path:
                continue
            identity = WorkerIdentity.objects.filter(user=doc.user).first()
            if identity is None or identity.pan_holder_name:
                continue
            try:
                with open(doc.file_path, "rb") as fh:
                    data = fh.read()
                text = ocr_client.extract_text(data, doc.file_name or "pan.pdf")
                name = str(ocr_client.extract_fields("pan", text).get("name") or "").strip()
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"{doc.id}: {exc}")
                continue
            if not name:
                continue
            identity.pan_holder_name = name[:120]
            identity.pan_name_matches_aadhaar = names_match(name, identity.name)
            identity.save(update_fields=["pan_holder_name", "pan_name_matches_aadhaar", "updated_at"])
            updated += 1
            self.stdout.write(f"{identity.user_id}: {name} (match={identity.pan_name_matches_aadhaar})")
        self.stdout.write(self.style.SUCCESS(f"PAN names captured: {updated}"))
