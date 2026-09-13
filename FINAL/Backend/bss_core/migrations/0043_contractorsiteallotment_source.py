from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0042_default_site"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contractorsiteallotment",
            name="source",
            field=models.CharField(
                choices=[("site_qr", "Site QR"), ("employer_allot", "Employer Allotment"),
                         ("contractor_request", "Contractor Request")],
                default="site_qr", max_length=20),
        ),
    ]
