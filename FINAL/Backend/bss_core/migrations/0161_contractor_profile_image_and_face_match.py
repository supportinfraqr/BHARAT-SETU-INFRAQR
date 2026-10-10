from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0160_contractor_profile_financial_principal"),
    ]

    operations = [
        migrations.AddField(
            model_name="contractorprofile",
            name="profile_image",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="workerfacephoto",
            name="aadhaar_match_pct",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="workerfacephoto",
            name="aadhaar_matched",
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="workerfacephoto",
            name="aadhaar_checked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
