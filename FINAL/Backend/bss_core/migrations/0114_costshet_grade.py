# Adds the minimum-wage grade to cost sheet templates so the min-wage lookup
# can pair a template with the exact wage row, and makes grade part of the
# platform-master scope uniqueness.
#
# NOTE: deliberately numbered 0114 (not 0113) so another session's
# `0113_remove_statutorymaster_uq_statutory_label` migration stays on its
# number and we never collide on a migration name.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0112_costshet_period_uniqueness"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="costsheettemplate",
            name="uq_cost_sheet_scope",
        ),
        migrations.AddField(
            model_name="costsheettemplate",
            name="grade",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddConstraint(
            model_name="costsheettemplate",
            constraint=models.UniqueConstraint(
                condition=models.Q(("owner__isnull", True), models.Q(("template_type", "SITE"), _negated=True)),
                fields=(
                    "template_type",
                    "state",
                    "industry",
                    "worker_category",
                    "grade",
                    "designation",
                    "effective_date",
                    "effective_to",
                ),
                name="uq_cost_sheet_scope",
                nulls_distinct=False,
            ),
        ),
    ]