"""Apply the curated AI checkpoints (points) to existing register templates.

One-time: sets the **Register of Workmen** templates (every state) to the curated
steps from ``bss_core.seeders.curated_checks``. Fresh installs get the same set
from the seeder (``bss_core.seeders.ai_checks``); admin edits made afterwards are
preserved (the seeder only fills empty checklists, and this runs once).
"""

from django.db import migrations

from bss_core.seeders.curated_checks import CURATED_REGISTER_CHECKS, checks_for


def forwards(apps, schema_editor):
    RegisterTemplate = apps.get_model("bss_core", "RegisterTemplate")
    for purpose in CURATED_REGISTER_CHECKS:
        checks = checks_for(purpose)
        if not checks:
            continue
        for template in RegisterTemplate.objects.filter(purpose=purpose):
            template.ai_checks = checks
            template.save(update_fields=["ai_checks"])


def backwards(apps, schema_editor):
    # Not reversible — leave the checkpoints in place.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0176_compliancereport_ai_html_compliancereport_ai_report_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
