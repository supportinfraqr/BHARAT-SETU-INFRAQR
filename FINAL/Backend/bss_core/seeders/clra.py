"""State-wise CLRA register templates seeded by default.

The default set is defined here **in code** and derived from the
``State wise form of CLRA`` matrix (the state × purpose → form table), not from
a hard-coded per-state list. For every state we seed exactly the seven core
CLRA registers — one template **per purpose/register** — even when several
purposes map to the same form number (Maharashtra maps every register to
``FORM II``): each keeps its own register-wise template:

    Register of Workmen · Muster Roll cum Wage Register · Wage Register ·
    Register of Deductions for Damage or Loss · Register of Fines ·
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

# Display title per purpose (a register-wise name, even for shared form codes).
CLRA_REGISTER_TITLES = {
    "Register of Workmen": "Register of Workmen",
    "MusterRoll": "Muster Roll cum Wage Register",
    "Wage Register": "Wage Register",
    "Deductions for Damage or Loss": "Register of Deductions for Damage or Loss",
    "Register of Fines": "Register of Fines",
    "Register of Advances": "Register of Advances",
    "Register of Overtime": "Register of Overtime",
}

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


def _matrix_by_state() -> dict[str, dict[str, str]]:
    """``{state: {purpose: form_code}}`` for the 7 core purposes.

    Reads the matrix rows imported into ``StateFormApplicability`` and maps every
    cell label (e.g. ``FORM XIII``) to its canonical token. Special markers such
    as ``N/A`` and excluded forms are skipped. Several purposes may map to the
    same form (Maharashtra → FORM II) — each still yields its own template."""
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import StateFormApplicability

    out: dict[str, dict[str, str]] = {}
    rows = (StateFormApplicability.objects
            .filter(purpose__in=CLRA_REGISTER_PURPOSES)
            .values_list("state", "purpose", "form_label"))
    for state, purpose, label in rows:
        code = canon_form_code(label)
        if not code.startswith("FORM") or code in CLRA_EXCLUDE_FORMS:
            continue
        out.setdefault(state, {})[purpose] = code
    return out


def _prune(matrix: dict[str, dict[str, str]]) -> int:
    """Delete any template that is not one of the state's purpose-keyed registers.

    Legacy rows without a purpose are superseded by the purpose-keyed set (a
    lone ``FORM II`` for Maharashtra becomes the six purpose-keyed registers).
    Returns the number of templates deleted."""
    from bss_core.models import RegisterTemplate

    keep = {(state, purpose) for state, purposes in matrix.items()
            for purpose in purposes}
    deleted = 0
    for template in RegisterTemplate.objects.all():
        if (template.state, template.purpose) not in keep:
            template.delete()
            deleted += 1
    return deleted


def _set_row_model() -> None:
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


def _seed_from_matrix(archive: str, only_missing: bool) -> int:
    from bss_core.management.commands.import_clra_templates import create_for_purpose
    from bss_core.models import RegisterTemplate

    matrix = _matrix_by_state()
    _prune(matrix)
    before = RegisterTemplate.objects.count()
    for state, purposes in matrix.items():
        for purpose, form in purposes.items():
            try:
                create_for_purpose(archive, state, purpose, form,
                                   title=CLRA_REGISTER_TITLES.get(purpose, ""),
                                   only_missing=only_missing)
            except Exception:  # noqa: BLE001 — one bad file must not stop the run
                pass
    _set_row_model()
    _seed_field_mappings()
    return RegisterTemplate.objects.count() - before


def seed() -> int:
    """Create the seven default registers per state (missing only)."""
    archive = archive_path()
    if not archive:
        return 0
    _ensure_matrix(archive)
    return _seed_from_matrix(archive, only_missing=True)


def reset_all() -> int:
    """Reset every template back to its source default (overwrite).

    Re-imports the seven registers per state (one template per purpose/register,
    even for shared form codes) restoring the faithful default layout + columns/
    fields and discarding admin edits."""
    archive = archive_path()
    if not archive:
        return 0
    _ensure_matrix(archive)
    return _seed_from_matrix(archive, only_missing=False)