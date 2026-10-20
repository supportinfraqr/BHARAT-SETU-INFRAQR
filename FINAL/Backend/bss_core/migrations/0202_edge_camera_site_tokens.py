from django.db import migrations, models
import django.db.models.deletion


def backfill_site(apps, schema_editor):
    EdgeCamera = apps.get_model("bss_core", "EdgeCamera")
    seen = set()
    for camera in EdgeCamera.objects.select_related("device").order_by("id"):
        if not camera.device_id:
            camera.delete()
            continue
        camera.site_id = camera.device.site_id
        label = camera.label or f"Camera {camera.id}"
        key = (camera.site_id, label)
        counter = 2
        while key in seen:
            label = f"{camera.label or 'Camera'} ({counter})"
            key = (camera.site_id, label)
            counter += 1
        seen.add(key)
        camera.label = label
        camera.token_hash = ""
        camera.token_prefix = ""
        camera.is_claimed = False
        camera.claimed_at = None
        camera.save(update_fields=["site", "label", "token_hash", "token_prefix",
                                   "is_claimed", "claimed_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0201_remove_legacy_cctv"),
    ]

    operations = [
        migrations.AddField(
            model_name="edgecamera",
            name="site",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.CASCADE,
                                    related_name="attendance_cameras", to="bss_core.site"),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="token_hash",
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="token_prefix",
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="is_claimed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="edgecamera",
            name="claimed_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name="edgecamera",
            name="device",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="cameras", to="bss_core.edgedevice"),
        ),
        migrations.RunPython(backfill_site, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="edgecamera",
            name="site",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                    related_name="attendance_cameras", to="bss_core.site"),
        ),
        migrations.RemoveConstraint(
            model_name="edgecamera",
            name="uq_edge_camera_device_label",
        ),
        migrations.AddConstraint(
            model_name="edgecamera",
            constraint=models.UniqueConstraint(fields=("site", "label"),
                                               name="uq_edge_camera_site_label"),
        ),
        migrations.AddIndex(
            model_name="edgecamera",
            index=models.Index(fields=["site"], name="idx_edge_camera_site"),
        ),
        migrations.AddIndex(
            model_name="edgecamera",
            index=models.Index(fields=["token_hash"], name="idx_edge_camera_token"),
        ),
    ]
