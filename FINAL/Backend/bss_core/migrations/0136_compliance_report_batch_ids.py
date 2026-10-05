from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0135_compliance_batch_register_audits'),
    ]

    operations = [
        migrations.AddField(
            model_name='compliancereport',
            name='batch_ids',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
