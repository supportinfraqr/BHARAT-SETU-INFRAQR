from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0156_attendance_self_gps"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="current_session_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="current_session_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
