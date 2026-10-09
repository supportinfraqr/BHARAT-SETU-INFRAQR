from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0158_course_audience"),
    ]

    operations = [
        migrations.AddField("contractorprofile", "company_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "listed_on_stock_exchange", models.CharField(blank=True, max_length=20)),
        migrations.AddField("contractorprofile", "company_status", models.CharField(blank=True, max_length=60)),
        migrations.AddField("contractorprofile", "nic_description", models.TextField(blank=True)),
        migrations.AddField("contractorprofile", "auth_designation", models.CharField(blank=True, max_length=80)),
        migrations.AddField("contractorprofile", "din", models.CharField(blank=True, max_length=30)),
        migrations.AddField("contractorprofile", "director_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "director_designation", models.CharField(blank=True, max_length=80)),
        migrations.AddField("contractorprofile", "director_appointment_date", models.DateField(blank=True, null=True)),
        migrations.AddField("contractorprofile", "director_cessation", models.CharField(blank=True, max_length=40)),
        migrations.AddField("contractorprofile", "director_cessation_date", models.DateField(blank=True, null=True)),
        migrations.AddField("contractorprofile", "city", models.CharField(blank=True, max_length=60)),
        migrations.AddField("contractorprofile", "pincode", models.CharField(blank=True, max_length=10)),
        migrations.AddField("contractorprofile", "compliance_contact_name", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "compliance_contact_mobile", models.CharField(blank=True, max_length=20)),
        migrations.AddField("contractorprofile", "compliance_contact_email", models.EmailField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "bank_account_name", models.CharField(blank=True, max_length=160)),
        migrations.AddField("contractorprofile", "bank_account_number", models.CharField(blank=True, max_length=40)),
        migrations.AddField("contractorprofile", "bank_ifsc", models.CharField(blank=True, max_length=20)),
        migrations.AddField("contractorprofile", "qr_device_id", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "pf_reg_cert", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "esic_reg_proof", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "insurance_proof", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "bank_proof", models.CharField(blank=True, max_length=120)),
        migrations.AddField("contractorprofile", "other_certs", models.CharField(blank=True, max_length=255)),
    ]
