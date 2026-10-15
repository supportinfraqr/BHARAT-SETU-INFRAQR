"""AI-checkpoint seeders.

Ensures every register template / additional form carries AI checkpoints on a
fresh deployment (local, staging, prod):

1. ``seed_ai_checkpoints``            — default baseline checkpoints (only fills empties).
2. ``seed_ai_checks_from_workbook``   — appends the per-document "Pointers to be
   Checked" from ``BSS_Sample_Reports_Audit Validation.xlsx`` (embedded in the
   command) onto the existing templates/forms.
3. Curated register checkpoints       — the hand-authored sets in
   ``bss_core.seeders.curated_checks`` (e.g. Register of Workmen). Applied to
   registers that are still empty, so admins can edit them afterwards.

All idempotent. Runs AFTER ``bss_core.seeders.clra`` (which creates the
register templates).
"""


def _apply_curated_checks() -> int:
    """Seed the curated register checkpoints onto registers whose checklist is
    still empty (never clobbers admin edits)."""
    from bss_core.models import RegisterTemplate

    from .curated_checks import CURATED_REGISTER_CHECKS, checks_for

    applied = 0
    for template in RegisterTemplate.objects.filter(purpose__in=list(CURATED_REGISTER_CHECKS)):
        if template.ai_checks:
            continue
        checks = checks_for(template.purpose)
        if checks:
            template.ai_checks = checks
            template.save(update_fields=["ai_checks"])
            applied += 1
    return applied


def seed():
    from django.core.management import call_command

    call_command("seed_ai_checkpoints")
    call_command("seed_ai_checks_from_workbook")
    _apply_curated_checks()
