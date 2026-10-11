from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0166_attendance_event_and_punch_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendanceevent",
            name="remarks",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
