from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("bss_core", "0209_auto_approve_edge_cameras")]

    operations = [
        migrations.AddField(
            model_name="gatepassscan",
            name="pass_type",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="gatepassscan",
            name="card_valid",
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gatepassscan",
            name="valid_from",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gatepassscan",
            name="valid_to",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gatepassscan",
            name="snapshot",
            field=models.FileField(blank=True, null=True, upload_to="gate_scans/%Y/%m/"),
        ),
    ]
