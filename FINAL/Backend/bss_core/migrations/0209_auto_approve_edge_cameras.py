from django.db import migrations


def auto_approve(apps, schema_editor):
    EdgeCamera = apps.get_model("bss_core", "EdgeCamera")
    for camera in EdgeCamera.objects.filter(approval_status="PENDING").iterator():
        camera.approval_status = "APPROVED"
        camera.approved_at = camera.created_at
        camera.employer_label = camera.employer_label or camera.label or ""
        if camera.device_id is None and camera.created_by_device_id:
            camera.device_id = camera.created_by_device_id
        camera.timezone = "Asia/Kolkata"
        camera.save(update_fields=["approval_status", "approved_at", "employer_label",
                                   "device", "timezone"])


class Migration(migrations.Migration):
    dependencies = [("bss_core", "0208_edge_camera_approval")]
    operations = [migrations.RunPython(auto_approve, migrations.RunPython.noop)]
