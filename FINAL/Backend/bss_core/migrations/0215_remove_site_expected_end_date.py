from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0214_edge_camera_attendance_mode'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='site',
            name='expected_end_date',
        ),
    ]
