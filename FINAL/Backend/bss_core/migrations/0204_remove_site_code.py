from django.db import migrations, models


def backfill_bss_site_ids(apps, schema_editor):
    Site = apps.get_model("bss_core", "Site")
    from api import bss_ids

    for site in Site.objects.filter(bss_site_id__isnull=True).iterator():
        site.bss_site_id = bss_ids.new_bss_site_id()
        site.save(update_fields=["bss_site_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0203_binding_worker_live"),
    ]

    operations = [
        migrations.RunPython(backfill_bss_site_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="site",
            name="bss_site_id",
            field=models.CharField(max_length=20, unique=True),
        ),
        migrations.RemoveField(
            model_name="site",
            name="site_code",
        ),
    ]
