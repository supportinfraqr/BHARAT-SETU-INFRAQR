from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0040_workerfamilydependant_percent"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="unbind_requested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="unbind_consent_contractor",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="unbind_consent_employer",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="contractoremployerbinding",
            name="unbound_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
