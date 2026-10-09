from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0159_contractor_profile_extra_fields"),
    ]

    operations = [
        migrations.AddField("contractorprofile", "bank_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "turnover_band", models.CharField(blank=True, max_length=60)),
        migrations.AddField("contractorprofile", "registration_date", models.DateField(blank=True, null=True)),
        migrations.AddField("contractorprofile", "principal_employer_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "principal_employer_id", models.CharField(blank=True, max_length=40)),
        migrations.AddField("contractorprofile", "site_establishment_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "site_ref_id", models.CharField(blank=True, max_length=40)),
        migrations.AddField("contractorprofile", "work_order_number", models.CharField(blank=True, max_length=80)),
        migrations.AddField("contractorprofile", "contract_start_date", models.DateField(blank=True, null=True)),
        migrations.AddField("contractorprofile", "contract_end_date", models.DateField(blank=True, null=True)),
    ]
