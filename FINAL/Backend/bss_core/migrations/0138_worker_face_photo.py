from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0137_review_notes'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkerFacePhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('person', models.CharField(blank=True, db_index=True, max_length=64)),
                ('slot', models.PositiveSmallIntegerField(default=0)),
                ('path', models.CharField(blank=True, max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='face_photos', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'worker_face_photo',
                'ordering': ['slot', 'id'],
                'indexes': [models.Index(fields=['user', 'slot'], name='idx_worker_face_user')],
            },
        ),
    ]
