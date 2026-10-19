"""Re-home legacy safety records that have no site and merge duplicates.

Before SafetyRecord became per (worker, site) some rows were stored with
``site = NULL``. The workspace only reads the record for the worker's current
site, so those legacy rows became invisible and a fresh (empty) record was
created — making a fully-issued kit appear as "0/12".

This command moves each site-less row onto the worker's active site. When a
record already exists for that site it merges the kit/training entries (union,
preferring an issued/completed value) and removes the orphan duplicate.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from bss_core.models import SafetyRecord, WorkerContractorBinding


def _merge_kit(target, source):
    kit = dict(target or {})
    for key, value in (source or {}).items():
        value = value or {}
        if key not in kit:
            kit[key] = value
            continue
        current = kit[key] or {}
        if value.get("issued") and not current.get("issued"):
            kit[key] = value
    return kit


def _merge_trainings(target, source):
    trn = dict(target or {})
    for key, value in (source or {}).items():
        value = value or {}
        current = trn.get(key) or {}
        if key not in trn or (value.get("completed") and not current.get("completed")):
            trn[key] = value
    return trn


class Command(BaseCommand):
    help = "Re-home site-less safety records and merge duplicates."

    def handle(self, *args, **options):
        from api.v1_bridge.medical import _mirror_safety

        moved = merged = 0
        with transaction.atomic():
            for rec in SafetyRecord.objects.filter(site__isnull=True):
                binding = (WorkerContractorBinding.objects
                           .filter(worker_id=rec.worker_id, binding_status="ACCEPTED")
                           .order_by("-id").first())
                if binding is None or binding.site_id is None:
                    continue
                existing = (SafetyRecord.objects
                            .filter(worker_id=rec.worker_id, site_id=binding.site_id)
                            .exclude(pk=rec.pk).first())
                if existing is None:
                    rec.site_id = binding.site_id
                    rec.save(update_fields=["site", "updated_at"])
                    _mirror_safety(rec)
                    moved += 1
                else:
                    existing.kit_items = _merge_kit(existing.kit_items, rec.kit_items)
                    existing.trainings = _merge_trainings(existing.trainings, rec.trainings)
                    existing.save(update_fields=["kit_items", "trainings", "updated_at"])
                    _mirror_safety(existing)
                    rec.delete()
                    merged += 1

        self.stdout.write(self.style.SUCCESS(
            f"Re-homed {moved} record(s); merged and removed {merged} duplicate(s)."))
