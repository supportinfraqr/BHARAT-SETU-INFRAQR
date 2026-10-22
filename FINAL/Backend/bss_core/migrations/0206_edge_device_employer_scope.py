from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0205_replace_site_code_tokens"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="edgedevice",
            name="uq_edge_device_site_fingerprint",
        ),
        migrations.RemoveIndex(
            model_name="edgedevice",
            name="idx_edge_device_site",
        ),
        migrations.RemoveField(
            model_name="edgedevice",
            name="site",
        ),
        migrations.AddConstraint(
            model_name="edgedevice",
            constraint=models.UniqueConstraint(
                fields=("employer", "device_fingerprint"),
                name="uq_edge_device_employer_fingerprint",
            ),
        ),
    ]
