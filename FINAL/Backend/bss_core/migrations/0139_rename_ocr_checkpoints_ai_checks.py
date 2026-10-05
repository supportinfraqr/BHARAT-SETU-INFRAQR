from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0138_worker_face_photo'),
    ]

    operations = [
        migrations.RenameField(
            model_name='registertemplate',
            old_name='ocr_checkpoints',
            new_name='ai_checks',
        ),
        migrations.RenameField(
            model_name='customformname',
            old_name='ocr_checkpoints',
            new_name='ai_checks',
        ),
        migrations.AddField(
            model_name='submissionevidence',
            name='ai_status',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
