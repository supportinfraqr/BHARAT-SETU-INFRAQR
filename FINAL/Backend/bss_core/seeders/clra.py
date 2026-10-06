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

# The matrix's Central columns — dropped from seeding: Central templates are
# admin-managed (created/authored in the console), never auto-seeded or pruned.
CENTRAL_MATRIX_STATES = {"Central", "Central (New Forms)"}

# States whose matrix entry stays authoritative even where the archive holds a
# file: Maharashtra's matrix notes "Form 2 as per MW act is enough", so every
# register there is FORM II and the folder's files must not override it.
MATRIX_WINS_STATES = {"Maharashtra"}

# Matrix spellings that differ from the archive folder / canonical state name.
_STATE_FIX = {"DNH": "Dadra & Nagar Haveli"}

# A register's printed name → its core purpose. Order matters: "Muster Roll cum
# Wage Register" must read as MusterRoll, not Wage Register; "Wage Slip" must not
# read as Wage Register.
_PURPOSE_TITLE_MATCHERS = [
    ("MusterRoll", ("muster roll", "musterroll", "muster-roll")),
    ("Register of Overtime", ("overtime",)),
    ("Register of Fines", ("register of fines", "register of fine", "fines")),
    ("Register of Advances", ("register of advances", "register of advance", "advances")),
    ("Deductions for Damage or Loss", ("damage", "deduction")),
    ("Wage Register", ("register of wages", "wage register", "wages register",
                       "register of wage", "wage book")),
    ("Register of Workmen", ("register of workmen", "workmen employed")),
]

DEFAULT_ARCHIVE = "/app/data/clra-registers.zip"


def _purpose_from_title(text) -> str:
    """Map a register's printed name (or filename) to one of the core purposes."""
    import re
    t = re.sub(r"\s+", " ", str(text or "")).strip().lower()
    if not t:
        return ""
    for purpose, keys in _PURPOSE_TITLE_MATCHERS:
        if any(k in t for k in keys):
            return purpose
    return ""


def _archive_purpose_map(archive: str) -> dict[str, dict[str, dict]]:
    """``{state: {purpose: {"form": …, "file": …}}}`` read from the register files.

    The archive file **is** the register that gets printed, so its printed title
    decides which purpose it serves — this overrides the applicability matrix,
    which names the wrong form for several states (Daman & Diu calls FORM XVI the
    deductions register, but that file is a Muster Roll)."""
    import zipfile

    from bss_core.management.commands.import_clra_applicability import canonical_state
    from bss_core.management.commands.import_clra_templates import (
        _form_code, canon_form_code, register_title_for_file)

    out: dict[str, dict[str, dict]] = {}
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if name.endswith("/") or name.lower().endswith("state wise form of  clra.xls"):
                continue
            parts = name.split("/")
            if len(parts) < 3:
                continue
            state, filename = canonical_state(parts[-2]), parts[-1]
            if filename.startswith("~$"):
                continue
            form = canon_form_code(_form_code(filename))
            if not form.startswith("FORM") or form in CLRA_EXCLUDE_FORMS:
                continue
            title = register_title_for_file(filename, z.read(name))
            purpose = _purpose_from_title(title) or _purpose_from_title(filename)
            if purpose:
                out.setdefault(state, {}).setdefault(
                    purpose, {"form": form, "file": filename})
    return out



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


def _matrix_by_state(archive: str | None = None) -> dict[str, dict[str, str]]:
    """``{state: {purpose: form_code}}`` for the 7 core purposes.

    The applicability matrix gives the state's purposes → forms, but it is wrong
    for several states; the archive's own register files (their printed titles)
    therefore **override** it. States whose folders lack a file keep the matrix's
    form. Several purposes may map to the same form (Maharashtra → FORM II)."""
    from bss_core.management.commands.import_clra_applicability import canonical_state
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import StateFormApplicability

    out: dict[str, dict[str, str]] = {}
    rows = (StateFormApplicability.objects
            .filter(purpose__in=CLRA_REGISTER_PURPOSES)
            .values_list("state", "purpose", "form_label"))
    for state, purpose, label in rows:
        state = canonical_state(_STATE_FIX.get(state, state))
        code = canon_form_code(label)
        if not code.startswith("FORM") or code in CLRA_EXCLUDE_FORMS:
            continue
        out.setdefault(state, {})[purpose] = code

    if archive:
        for state, purposes in _archive_purpose_map(archive).items():
            if state in MATRIX_WINS_STATES:
                continue
            target = out.setdefault(state, {})
            for purpose, info in purposes.items():
                target[purpose] = info["form"]

    # Drop the matrix's Central columns — Central templates are admin-managed
    # (created/authored in the console) and are never auto-seeded or pruned here.
    for state in list(out):
        if state in CENTRAL_MATRIX_STATES:
            out.pop(state)
    return out


def _prune(matrix: dict[str, dict[str, str]]) -> int:
    """Delete any template that is not one of the state's purpose-keyed registers,
    or that holds the wrong form for its purpose (a stale Daman & Diu FORM XVI
    mapped to "Deductions for Damage or Loss", whose file is a Muster Roll).

    Central-jurisdiction templates are admin-managed and are never pruned."""
    from bss_core.management.commands.import_clra_templates import canon_form_code
    from bss_core.models import RegisterTemplate

    deleted = 0
    for template in RegisterTemplate.objects.all():
        if getattr(template, "jurisdiction", "state") == "central":
            continue
        want = matrix.get(template.state, {}).get(template.purpose)
        if want is None or canon_form_code(template.form_code or "") != want:
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

    matrix = _matrix_by_state(archive)
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