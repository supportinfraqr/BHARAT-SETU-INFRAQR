"""AI-checkpoint seeders.

Ensures every register template / additional form carries AI checkpoints on a
fresh deployment (local, staging, prod):

1. ``seed_ai_checkpoints``            — default baseline checkpoints (only fills empties).
2. ``seed_ai_checks_from_workbook``   — appends the per-document "Pointers to be
   Checked" from ``BSS_Sample_Reports_Audit Validation.xlsx`` (embedded in the
   command) onto the existing templates/forms.

Both are idempotent. Runs AFTER ``bss_core.seeders.clra`` (which creates the
register templates).
"""


def seed():
    from django.core.management import call_command

    call_command("seed_ai_checkpoints")
    call_command("seed_ai_checks_from_workbook")
