from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0139_rename_ocr_checkpoints_ai_checks'),
    ]

    operations = [
        migrations.CreateModel(
            name='AiReportPrompt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('system_prompt', models.TextField(blank=True, default='')),
                ('user_prompt', models.TextField(blank=True, default='')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'ai_report_prompt',
                'ordering': ['id'],
            },
        ),
    ]
