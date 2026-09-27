# OCR checklist for register forms + a record of forced ("hard") submits.
#
# - RegisterTemplate.ocr_checkpoints: the same shape as
#   CustomFormName.ocr_checkpoints, so a manually-uploaded CLRA register can be
#   verified against a configured checklist too.
# - SubmissionEvidence.forced_submit: set when the contractor submits despite
#   failed OCR checkpoints, so the override is on record.
#
# NOTE: deliberately does NOT touch StatutoryMaster.uq_statutory_label (the
# model no longer declares it, so `makemigrations` wants to bundle that
# unrelated constraint drop in here).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0124_compliancebatch_superseded"),
    ]

    operations = [
        migrations.AddField(
            model_name="registertemplate",
            name="ocr_checkpoints",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="submissionevidence",
            name="forced_submit",
            field=models.BooleanField(default=False),
        ),
    ]
