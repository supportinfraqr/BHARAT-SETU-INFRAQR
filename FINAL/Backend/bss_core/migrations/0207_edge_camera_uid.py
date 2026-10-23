import uuid

from django.db import migrations, models


def assign_uids(apps, schema_editor):
    EdgeCamera = apps.get_model("bss_core", "EdgeCamera")
    for camera in EdgeCamera.objects.filter(uid__isnull=True).iterator():
        camera.uid = uuid.uuid4()
        camera.save(update_fields=["uid"])


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0206_edge_device_employer_scope"),
    ]

    operations = [
        migrations.AddField(
            model_name="edgecamera",
            name="uid",
            field=models.UUIDField(null=True, blank=True),
        ),
        migrations.RunPython(assign_uids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="edgecamera",
            name="uid",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
