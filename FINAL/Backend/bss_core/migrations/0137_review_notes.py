from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0136_compliance_report_batch_ids'),
    ]

    operations = [
        migrations.AddField(
            model_name='compliancebatch',
            name='review_note',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='submissionevidence',
            name='review_note',
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
