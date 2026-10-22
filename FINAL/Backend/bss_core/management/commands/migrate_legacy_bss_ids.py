"""Re-issue canonical masked BSS identifiers for rows holding legacy codes.

Early accounts were created with sequential internal codes (``V-100234``,
``W-100234`` …) that predate the masked-ID allocator in ``api.bss_ids``. Those
values still work as database keys, but they are *not* BSS IDs: they have the
wrong shape, and they are printed on statutory letters as if they were. This
command allocates a proper ``BSS-<ROLE>…`` identifier for every non-canonical
code so printed documents carry a genuine BSS ID.

Safe by default: it only reports. Pass ``--apply`` to write. The old value is
echoed to stdout and written to a mapping file so the substitution is
reversible, because ``contractor_code`` / ``employer_code`` are used as lookup
keys by the admin UI and API.

By default it re-issues only values that are not BSS identifiers at all
(``V-100234``). Codes that merely carry an older suffix length are valid BSS
IDs and are listed but left alone. Pass ``--reissue-drifted`` to also convert
those to the canonical ``BSS-<ROLE>`` + 11-character form.

Any printed QR follows the ID automatically (the QR payload is just the BSS
ID), whereas letters already issued keep the old value.
"""

import csv
import os

from django.core.management.base import BaseCommand
from django.db import transaction

from api import bss_ids

# (role, model, field, allocator) for every code space the allocator owns.
TARGETS = [
    ("contractor", "ContractorProfile", "contractor_code", "new_bss_contractor_code"),
    ("employer", "EmployerProfile", "employer_code", "new_bss_employer_code"),
    ("worker", "WorkerIdentity", "bss_worker_id", "new_bss_worker_id"),
    ("site", "Site", "bss_site_id", "new_bss_site_id"),
]


class Command(BaseCommand):
    help = "Report (and with --apply, fix) BSS IDs still using a legacy format."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply", action="store_true",
            help="Actually write the new identifiers (default: dry run).")
        parser.add_argument(
            "--role", choices=[t[0] for t in TARGETS], default=None,
            help="Limit to one role (default: all roles).")
        parser.add_argument(
            "--reissue-drifted", action="store_true",
            help="Also re-issue BSS-style IDs whose suffix is the wrong length "
                 "(legacy 10-char suffixes), so every ID matches the canonical "
                 "BSS-<ROLE>+11 form. Off by default because those IDs still work.")
        parser.add_argument(
            "--map-out", default=None,
            help="CSV path for the old->new mapping (default: stdout only).")

    def handle(self, *args, **options):
        from bss_core import models as bss_models

        apply = options["apply"]
        reissue_drifted = options["reissue_drifted"]
        rows = []
        for role, model_name, field, allocator_name in TARGETS:
            if options["role"] and options["role"] != role:
                continue
            model = getattr(bss_models, model_name)
            for obj in model.objects.all():
                current = (getattr(obj, field) or "").strip()
                if not current:
                    continue
                # A value that is not a BSS identifier at all always needs a new
                # one. A BSS-style value with the wrong suffix length still works,
                # so it is only re-issued when --reissue-drifted is passed.
                style = bss_ids.is_bss_style_id(current)
                canonical = bss_ids.is_canonical_id(current, role)
                if style and (canonical or not reissue_drifted):
                    continue
                rows.append((role, model_name, field, allocator_name, obj, current))

        # Advisory only: report format drift that is being left alone.
        drifted = 0
        for role, model_name, field, _allocator_name in TARGETS:
            if options["role"] and options["role"] != role:
                continue
            if reissue_drifted:
                continue  # these are in `rows` now, not advisory
            model = getattr(bss_models, model_name)
            for obj in model.objects.all():
                current = (getattr(obj, field) or "").strip()
                if (current and bss_ids.is_bss_style_id(current)
                        and not bss_ids.is_canonical_id(current, role)):
                    drifted += 1

        if drifted:
            self.stdout.write(f"  note: {drifted} code(s) use an older suffix length "
                              f"but are valid BSS IDs — left untouched "
                              f"(pass --reissue-drifted to convert them).")

        if not rows:
            self.stdout.write(self.style.SUCCESS(
                "No legacy BSS IDs found — nothing to do."))
            return

        self.stdout.write(self.style.WARNING(
            f"{len(rows)} row(s) are not BSS identifiers at all:"))
        for role, _model, _field, _alloc, obj, current in rows:
            label = getattr(obj, "contractor_name", None) or getattr(obj, "user", None)
            self.stdout.write(f"  {role:<11} {current:<14} -> {role}  {label}")

        if not apply:
            self.stdout.write(self.style.WARNING(
                "Dry run — no changes written. Re-run with --apply to migrate."))
            self._write_map(rows, options["map_out"], "planned")
            return

        migrated = []
        with transaction.atomic():
            for role, model_name, field, allocator_name, obj, current in rows:
                new_value = getattr(bss_ids, allocator_name)()
                # Re-check uniqueness inside the transaction.
                if (bss_models.__dict__ and
                        obj.__class__.objects.filter(**{field: new_value}).exists()):
                    raise RuntimeError(f"Collision allocating {new_value} for {model_name}")
                setattr(obj, field, new_value)
                obj.save(update_fields=[field])
                migrated.append((role, model_name, field, allocator_name, current, new_value))

        self.stdout.write(self.style.SUCCESS(f"\nMigrated {len(migrated)} code(s)."))
        for role, _m, _f, _a, old, new in migrated:
            self.stdout.write(f"  {role:<11} {old:<14} -> {new}")
        self._write_map(migrated, options["map_out"], "applied")

    def _write_map(self, rows, path, state):
        """Record old->new so the substitution can be reversed if needed."""
        lines = [("role", "model", "field", "old_code", "new_code", "state")]
        for row in rows:
            if len(row) == 5:  # dry run: new code not allocated yet
                role, model, field, _alloc, old = row
                lines.append((role, model, field, old, "", state))
            else:
                role, model, field, _alloc, old, new = row
                lines.append((role, model, field, old, new, state))
        target = path or os.path.join(
            os.path.expanduser("~"), "bss_legacy_id_map.csv")
        try:
            with open(target, "w", newline="") as fh:
                csv.writer(fh).writerows(lines)
            self.stdout.write(f"Mapping written to {target}")
        except OSError as exc:
            self.stderr.write(f"Could not write mapping to {target}: {exc}")
