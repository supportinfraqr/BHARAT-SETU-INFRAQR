"""State-wise CLRA register templates seeded by default.

The default set is defined here **in code** and derived from the
``State wise form of CLRA`` matrix (the state × purpose → form table), not from
a hard-coded per-state list. For every state we seed exactly the seven core
CLRA registers, each with the form number the matrix assigns to that state:

    Register of Workmen · MusterRoll · Wage Register ·
    Deductions for Damage or Loss · Register of Fines ·
    Register of Advances · Register of Overtime

All seven are **row-level registers** — one document that lists every
master-file worker as a row (the ``{{HEAD}}`` / ``{{ROWS}}`` grid).

``seed()`` only **creates missing** templates (never overwrites admin edits);
``reset_all()`` re-renders them back to their source default.
"""

from __future__ import annotations

import os
from pathlib import Path

# The seven core registers, keyed by the exact purpose label in the matrix.
CLRA_REGISTER_PURPOSES = [
    "Register of Workmen",
    "MusterRoll",
    "Wage Register",
    "Deductions for Damage or Loss",
    "Register of Fines",
    "Register of Advances",
    "Register of Overtime",
]

# Forms excluded from all seeding (never created, and removed if already present).
CLRA_EXCLUDE_FORMS = {"FORM XII"}

DEFAULT_ARCHIVE = "/app/data/clra-registers.zip"


def archive_path() -> str | None:
    """Locate the CLRA source archive (baked bundle in prod, repo copy locally)."""
    env = os.environ.get("CLRA_ZIP", DEFAULT_ARCHIVE)
    if env and os.path.exists(env):
        return env
    local = Path(__file__).resolve().parents[2] / "data" / "clra-registers.zip"
    return str(local) if local.exists() else None


def _ensure_matrix(archive: str) -> None:
    """Make sure the applicability matrix (state × purpose → form) is loaded."""
    from django.core.management import call_command
    try:
        call_command("import_clra_applicability", zip=archive, only_if_empty=True)
    except Exception:  # noqa: BLE001 — never block seeding on this
        pass


def _matrix_forms_by_state() -> dict[str, set[str]]:
    """``{state: {form tokens}}`` — the state's form for each of the 7 purposes.

    Reads the matrix rows imported into ``StateFormApplicability`` and maps every
    cell label (e.g. ``FORM XIII``) to its canonical token. Special markers such
    as ``NO CHANGE`` are ignored."""
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import StateFormApplicability

    out: dict[str, set[str]] = {}
    rows = (StateFormApplicability.objects
            .filter(purpose__in=CLRA_REGISTER_PURPOSES)
            .values_list("state", "form_label"))
    for state, label in rows:
        code = canon_form_code(label)
        if not code.startswith("FORM") or code in CLRA_EXCLUDE_FORMS:
            continue
        out.setdefault(state, set()).add(code.replace("FORM ", ""))
    return out


def _allowed_pairs(matrix: dict[str, set[str]]) -> set[tuple[str, str]]:
    from bss_core.management.commands.import_clra_templates import canon_form_code
    allowed = set()
    for state, forms in matrix.items():
        for form in forms:
            allowed.add((state, canon_form_code(form)))
    return allowed


def _prune(matrix: dict[str, set[str]]) -> None:
    """Delete any template that is not one of the state's seven default forms."""
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import RegisterTemplate

    allowed = _allowed_pairs(matrix)
    for template in RegisterTemplate.objects.all():
        canonical = canon_form_code(template.form_code)
        # Drop non-allowed forms and any non-canonical code left by an older import.
        if (template.state, canonical) not in allowed or template.form_code != canonical:
            template.delete()


def _set_row_model(matrix: dict[str, set[str]]) -> None:
    """All seven are row-level registers (one document, workers as rows)."""
    from bss_core.models import RegisterTemplate
    for template in RegisterTemplate.objects.all():
        template.per_row = False
        template.meta = {**(template.meta or {}), "scope": "whole"}
        template.save(update_fields=["per_row", "meta", "updated_at"])


def _seed_field_mappings() -> None:
    """Build the register field mappings + calculation rules after the templates
    exist (maps each column to a master-file field key)."""
    from django.core.management import call_command
    call_command("seed_register_config")


def seed() -> int:
    """Create the seven default registers for every state (missing only)."""
    from django.core.management import call_command
    from bss_core.models import RegisterTemplate

    archive = archive_path()
    if not archive:
        return 0
    _ensure_matrix(archive)
    matrix = _matrix_forms_by_state()
    _prune(matrix)
    before = RegisterTemplate.objects.count()
    for state, forms in matrix.items():
        if not forms:
            continue
        call_command("import_clra_templates", zip=archive, state=state,
                     forms=",".join(sorted(forms)), only_missing=True)
    _set_row_model(matrix)
    _seed_field_mappings()
    return RegisterTemplate.objects.count() - before


def reset_all() -> int:
    """Reset every template back to its source default (overwrite).

    Re-imports the seven registers per state from the archive, restoring the
    faithful default layout + columns/fields and discarding admin edits."""
    from django.core.management import call_command
    from bss_core.models import RegisterTemplate

    archive = archive_path()
    if not archive:
        return 0
    _ensure_matrix(archive)
    matrix = _matrix_forms_by_state()
    _prune(matrix)
    for state, forms in matrix.items():
        if not forms:
            continue
        call_command("import_clra_templates", zip=archive, state=state,
                     forms=",".join(sorted(forms)))
    _set_row_model(matrix)
    _seed_field_mappings()
    return RegisterTemplate.objects.count()
