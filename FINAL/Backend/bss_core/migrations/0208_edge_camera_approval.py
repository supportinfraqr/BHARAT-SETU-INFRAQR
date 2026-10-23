from django.db import migrations, models
import django.db.models.deletion


def mark_existing_approved(apps, schema_editor):
    EdgeCamera = apps.get_model("bss_core", "EdgeCamera")
    for camera in EdgeCamera.objects.all().iterator():
        camera.approval_status = "APPROVED"
        camera.created_by_device_id = camera.device_id
        camera.employer_label = camera.label or ""
        camera.approved_at = camera.created_at
        camera.timezone = "Asia/Kolkata"
        camera.save(update_fields=["approval_status", "created_by_device", "employer_label", "approved_at", "timezone"])


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0207_edge_camera_uid"),
    ]

    operations = [
        migrations.AddField(
            model_name="edgecamera",
            name="approval_status",
            field=models.CharField(choices=[("PENDING", "Pending approval"), ("APPROVED", "Approved"), ("REJECTED", "Rejected"), ("REMOVED", "Removed")], default="PENDING", max_length=12, db_index=True),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="employer_label",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="created_by_device",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_cameras", to="bss_core.edgedevice"),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="approved_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_edge_cameras", to="bss_core.user"),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="removed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="removed_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="removed_edge_cameras", to="bss_core.user"),
        ),
        migrations.RunPython(mark_existing_approved, migrations.RunPython.noop),
    ]
