"""State-wise CLRA register templates seeded by default.

The default set is defined here **in code**, segregated by state — this is the
source of truth for which CLRA forms a fresh deployment comes up with.

Each entry names the form to seed for that state plus its row model:

* ``per_row=False`` — **row-level register**: one document listing every
  master-file worker as a row (the ``{{HEAD}}`` / ``{{ROWS}}`` grid).
* ``per_row=True``  — **per-worker document**: one copy per master-file row
  (e.g. Identity Card FORM X, Wage Slip FORM XIX).

``seed()`` only **creates missing** templates (it never overwrites admin edits);
``reset_all()`` re-renders every existing template back to its source default.
"""

from __future__ import annotations

import os
from pathlib import Path

# State → forms seeded by default.
CLRA_DEFAULT_FORMS: dict[str, list[dict]] = {
    "Andhra Pradesh": [
        {"form": "FORM XIII", "per_row": False},   # Register of Workmen Employed
        {"form": "FORM XVI", "per_row": False},    # Register of Wages
        {"form": "FORM XVII", "per_row": False},   # Register of Wages-cum-Muster Roll
        {"form": "FORM XX", "per_row": False},     # Register of Deductions
        {"form": "FORM XXI", "per_row": False},    # Register of Fines
        {"form": "FORM XXII", "per_row": False},   # Register of Advances
        {"form": "FORM XXIII", "per_row": False},  # Register of Overtime
    ],
}

# Seeded for every state that has them: the muster/wage registers are the core
# CLRA records and every state's master file feeds them row by row.
CLRA_ALWAYS_FORMS = ["FORM XIII", "FORM XVI", "FORM XVII"]

DEFAULT_ARCHIVE = "/app/data/clra-registers.zip"


def archive_path() -> str | None:
    """Locate the CLRA source archive (baked bundle in prod, repo copy locally)."""
    env = os.environ.get("CLRA_ZIP", DEFAULT_ARCHIVE)
    if env and os.path.exists(env):
        return env
    local = Path(__file__).resolve().parents[2] / "data" / "clra-registers.zip"
    return str(local) if local.exists() else None


def _manifest_forms(state: str) -> str:
    return ",".join(entry["form"].replace("FORM ", "") for entry in CLRA_DEFAULT_FORMS.get(state, []))


def _excel_forms_by_state(archive: str) -> dict[str, set[str]]:
    """Every Excel (``.xls``/``.xlsx``) register present per state, as canonical
    form tokens. Excel registers are the tabular records (muster/wage/deduction/
    fines/advances/overtime) that the master file feeds row by row."""
    import zipfile
    from bss_core.management.commands.import_clra_templates import canon_form_code

    found: dict[str, set[str]] = {}
    with zipfile.ZipFile(archive) as bundle:
        for name in bundle.namelist():
            parts = name.split("/")
            if len(parts) < 3:
                continue
            base = parts[-1]
            if base.startswith("~$") or not base.lower().endswith((".xls", ".xlsx")):
                continue
            found.setdefault(parts[-2], set()).add(canon_form_code(base).replace("FORM ", ""))
    return found


def _apply_row_model():
    """Set ``per_row`` / ``meta.scope`` from the manifest for the configured forms."""
    from bss_core.models import RegisterTemplate
    from bss_core.management.commands.import_clra_templates import canon_form_code

    for state, forms in CLRA_DEFAULT_FORMS.items():
        for entry in forms:
            code = canon_form_code(entry["form"])
            per_row = bool(entry.get("per_row"))
            for template in RegisterTemplate.objects.filter(state=state, form_code=code):
                template.per_row = per_row
                template.meta = {**(template.meta or {}), "scope": "per-worker" if per_row else "whole"}
                template.save(update_fields=["per_row", "meta", "updated_at"])


def seed() -> int:
    """Create the default templates that don't exist yet.

    For every state: the always-on muster/wage registers (XIII, XVI, XVII) that
    the state has, **plus every Excel register** in that state, plus any explicit
    manifest entries."""
    from django.core.management import call_command
    from bss_core.models import RegisterTemplate

    archive = archive_path()
    if not archive:
        return 0
    before = RegisterTemplate.objects.count()
    excel = _excel_forms_by_state(archive)
    always = [f.replace("FORM ", "") for f in CLRA_ALWAYS_FORMS]
    for state in sorted(set(CLRA_DEFAULT_FORMS) | set(excel)):
        tokens = set(always)
        tokens |= excel.get(state, set())
        tokens |= {entry["form"].replace("FORM ", "") for entry in CLRA_DEFAULT_FORMS.get(state, [])}
        if not tokens:
            continue
        call_command("import_clra_templates", zip=archive, state=state,
                     forms=",".join(sorted(tokens)), only_missing=True)
    _apply_row_model()
    return RegisterTemplate.objects.count() - before


def reset_all() -> int:
    """Re-render every existing template back to its source default (overwrite).

    Groups the existing (state, form) rows and re-imports them from the archive,
    restoring the faithful default layout + columns/fields. Admin HTML edits are
    discarded; the manifest row model is re-applied afterwards."""
    from django.core.management import call_command
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import RegisterTemplate

    archive = archive_path()
    if not archive:
        return 0
    by_state: dict[str, set[str]] = {}
    for state, form_code in RegisterTemplate.objects.values_list("state", "form_code"):
        by_state.setdefault(state, set()).add(canon_form_code(form_code).replace("FORM ", ""))
    for state, codes in by_state.items():
        if not codes:
            continue
        call_command("import_clra_templates", zip=archive, state=state, forms=",".join(sorted(codes)))
    _apply_row_model()
    return RegisterTemplate.objects.count()
