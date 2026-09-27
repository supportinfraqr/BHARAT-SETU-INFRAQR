"""Report the resolved state × purpose → form mapping for the seven CLRA registers.

The mapping is the "State wise form of CLRA" applicability matrix **overridden by
the archive's own register files** (their printed titles), which is what the
seeder actually uses. Prints the conflicts (matrix vs file) and gaps (no file),
so the mapping can be reviewed before re-seeding.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Show the resolved CLRA register mapping and flag matrix/file conflicts."

    def add_arguments(self, parser):
        parser.add_argument("--state", default=None, help="Limit to one state.")

    def handle(self, *args, **options):
        from bss_core.seeders import clra

        archive = clra.archive_path()
        if not archive:
            self.stderr.write("CLRA archive not found.")
            return

        matrix = clra._matrix_by_state(None)
        files = clra._archive_purpose_map(archive)
        resolved = clra._matrix_by_state(archive)
        only = (options["state"] or "").lower()

        conflicts, gaps = [], []
        for state in sorted(resolved):
            if only and only != state.lower():
                continue
            for purpose in clra.CLRA_REGISTER_PURPOSES:
                form = resolved.get(state, {}).get(purpose)
                finfo = files.get(state, {}).get(purpose)
                mform = matrix.get(state, {}).get(purpose)
                if finfo and mform and finfo["form"] != mform:
                    conflicts.append((state, purpose, mform, finfo["form"], finfo["file"]))
                if not finfo and form:
                    gaps.append((state, purpose, form))

        self.stdout.write("=== resolved mapping (state · purpose → form) ===")
        for state in sorted(resolved):
            if only and only != state.lower():
                continue
            pairs = [f"{p}={resolved[state].get(p) or 'none'}"
                     for p in clra.CLRA_REGISTER_PURPOSES if resolved[state].get(p)]
            self.stdout.write(f"  {state}: " + ", ".join(pairs))

        self.stdout.write("\n=== matrix vs file conflicts (file wins) ===")
        for state, purpose, mform, fform, fname in conflicts:
            self.stdout.write(f"  {state:<20} {purpose:<32} matrix={mform} file={fform} ({fname})")
        if not conflicts:
            self.stdout.write("  (none)")

        self.stdout.write("\n=== purposes with no archive file (matrix form used) ===")
        for state, purpose, form in gaps:
            self.stdout.write(f"  {state:<20} {purpose:<32} {form}")
        if not gaps:
            self.stdout.write("  (none)")
