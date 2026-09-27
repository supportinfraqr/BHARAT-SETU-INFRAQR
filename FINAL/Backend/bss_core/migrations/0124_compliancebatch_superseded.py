# Supersede CLRA register batches instead of stacking duplicates.
#
# Regenerating a site+period now keeps the previous batch for audit but marks
# it SUPERSEDED and points it at the batch that replaced it, so every list
# (contractor batches, the state-wise summary, the employer's grouped
# submissions) can show only the current register.
#
# NOTE: deliberately does NOT touch StatutoryMaster.uq_statutory_label. The
# model no longer declares it, so `makemigrations` wants to bundle that
# unrelated schema change in here; dropping a unique constraint in prod must be
# a deliberate, separate migration.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0123_backfill_contractor_consent_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="compliancebatch",
            name="superseded_by",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="supersedes", to="bss_core.compliancebatch"),
        ),
        migrations.AlterField(
            model_name="compliancebatch",
            name="status",
            field=models.CharField(
                choices=[("GENERATED", "Generated"), ("PENDING", "Pending"),
                         ("FAILED", "Failed"), ("SUBMITTED", "Submitted"),
                         ("VERIFIED", "Verified"), ("RETURNED", "Returned"),
                         ("SUPERSEDED", "Superseded")],
                default="GENERATED", max_length=20),
        ),
    ]
