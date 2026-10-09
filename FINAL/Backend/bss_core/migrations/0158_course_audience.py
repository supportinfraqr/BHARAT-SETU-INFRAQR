from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0157_user_active_session"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="audience",
            field=models.CharField(
                choices=[
                    ("all", "All workers"),
                    ("contractors", "All contractors"),
                    ("employers", "All employers"),
                    ("selected", "Selected"),
                ],
                default="all",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="course",
            name="audience_contractor_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="course",
            name="audience_employer_ids",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
