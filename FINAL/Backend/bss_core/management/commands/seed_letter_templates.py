"""Restore the canonical default letter-template library from code.

Default mode seeds the two all-India defaults (appointment letter + statutory
Form XV service certificate) additively — it never deletes and never overwrites
an admin's edits, so it is safe on every deploy.

With ``--reset`` it reproduces the **exact** library recorded in
``bss_core/seeds/letter_defaults.py`` (produced by
``python manage.py dump_letter_defaults``): create missing templates, update
changed ones, prune extras, and re-apply the derived print stylesheet. Every
environment therefore ends up with the same letter library on every run.

Keys are ``(state, letter_type, name)`` — the model's own unique constraint —
so ``state == ""`` rows are the all-India defaults used when no state template
matches.
"""

from django.core.management.base import BaseCommand, CommandError

from bss_core.letter_brand import ensure_letter_html, wants_logo


class Command(BaseCommand):
    help = ("Restore the canonical letter-template library. Default: add the "
            "all-India defaults if missing (idempotent, never deletes). With "
            "--reset: reproduce the EXACT default library from the code "
            "snapshot bss_core/seeds/letter_defaults.py — create missing, "
            "update changed, prune extras.")

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Reproduce the exact default library from the code snapshot "
                 "(prunes templates not present in the defaults).")

    def handle(self, *args, **options):
        from bss_core.models import LetterTemplate

        if options["reset"]:
            c = self._restore_defaults()
            self.stdout.write(self.style.SUCCESS(
                f"Letter library restored to defaults — {c['created']} new / "
                f"{c['updated']} updated / {c['pruned']} pruned · "
                f"{LetterTemplate.objects.count()} total"))
            return

        from bss_core.seeders.letter_templates import seed

        created = seed()
        self.stdout.write(self.style.SUCCESS(
            f"Letter templates ready ({created} created, "
            f"{LetterTemplate.objects.count()} total)."))

    def _restore_defaults(self):
        try:
            from bss_core.seeds import letter_defaults as DEFAULTS
        except ImportError:
            raise CommandError(
                "bss_core/seeds/letter_defaults.py not found; run "
                "`python manage.py dump_letter_defaults` first.")

        from bss_core.models import LetterTemplate

        entries = DEFAULTS.TEMPLATES
        if not entries:
            raise CommandError("letter_defaults.py snapshot is empty.")

        keys = [(e["state"], e["letter_type"], e["name"]) for e in entries]
        if len(set(keys)) != len(keys):
            dupes = [k for k in set(keys) if keys.count(k) > 1]
            raise CommandError(f"Snapshot has duplicate keys: {dupes}")

        by_key = {k: e for k, e in zip(keys, entries)}
        existing = {(t.state, t.letter_type, t.name): t
                    for t in LetterTemplate.objects.all()}
        c = {"created": 0, "updated": 0, "pruned": 0}

        for key, e in by_key.items():
            state, kind, name = key
            # The snapshot stores the *authored* HTML; the print stylesheet is
            # derived code and is re-applied here (and at render time).
            # A statutory type can never carry a logo, whatever the snapshot
            # says, so a stale snapshot cannot reintroduce one.
            logo = (e.get("logo_url") or "") if wants_logo(kind) else ""
            updates = {
                "html": ensure_letter_html(e["html"], kind),
                "logo_url": logo,
                "is_active": bool(e.get("is_active", True)),
            }
            t = existing.get(key)
            if t is None:
                LetterTemplate.objects.create(
                    state=state, letter_type=kind, name=name, **updates)
                c["created"] += 1
                continue
            changed = [f for f, val in updates.items() if getattr(t, f) != val]
            if changed:
                for f in changed:
                    setattr(t, f, updates[f])
                t.save(update_fields=changed)
                c["updated"] += 1

        for key, t in existing.items():
            if key not in by_key:
                t.delete()
                c["pruned"] += 1

        return c
