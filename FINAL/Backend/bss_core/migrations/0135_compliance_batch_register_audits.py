from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0134_ai_provider_deepseek'),
    ]

    operations = [
        migrations.AddField(
            model_name='compliancebatch',
            name='register_audits',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
