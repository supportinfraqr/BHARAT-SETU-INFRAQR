"""Curated AI checkpoints for named registers — the single source of truth.

Keyed by register **purpose** (state-independent), so one entry covers every
state's realisation of that register (different form numbers, same purpose).

Used by:
- ``bss_core.seeders.ai_checks`` — fresh installs seed these (when empty); and
- the ``0177`` data migration — applies them once to existing rows (prod/staging).

Admin edits made afterwards are never overwritten (the seeder only fills empties).
"""

CURATED_REGISTER_CHECKS: dict[str, list[str]] = {
    "Register of Workmen": [
        "Verify Register Form Number.",
        "Check employee ID.",
        "Verify employee name with Aadhaar.",
        "Verify father's name with Aadhaar.",
        "Verify DOB/Age with Aadhaar.",
        "Verify permanent address.",
        "Verify local address.",
        "Check joining date with appointment letter.",
        "Verify resignation date (if applicable).",
        "Check photograph.",
        "Verify employee signature/thumb impression.",
        "Verify employer signature and stamp.",
    ],
}


def is_curated(purpose: str) -> bool:
    return (purpose or "").strip() in CURATED_REGISTER_CHECKS


def checks_for(purpose: str):
    """The curated checkpoints for a register purpose, in ``ai_checks`` shape."""
    steps = CURATED_REGISTER_CHECKS.get((purpose or "").strip())
    if not steps:
        return None
    return [{"type": "custom", "label": s, "required": True} for s in steps]
