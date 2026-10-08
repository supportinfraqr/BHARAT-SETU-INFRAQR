from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0152_workerbanking_branch_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='workeridentity',
            name='pan_holder_name',
            field=models.CharField(blank=True, default='', max_length=120),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workeridentity',
            name='pan_name_matches_aadhaar',
            field=models.BooleanField(blank=True, null=True),
        ),
    ]
