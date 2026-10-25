from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("bss_core", "0210_gatepassscan_snapshot_validity")]

    operations = [
        migrations.AddIndex(
            model_name="edgeevent",
            index=models.Index(fields=["created_at"], name="idx_edge_event_created"),
        ),
    ]
