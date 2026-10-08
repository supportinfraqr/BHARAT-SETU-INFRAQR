from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0151_learning_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='workerbanking',
            name='bank_branch',
            field=models.CharField(blank=True, default='', max_length=120),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workerbanking',
            name='bank_holder_matches_aadhaar',
            field=models.BooleanField(blank=True, null=True),
        ),
    ]
