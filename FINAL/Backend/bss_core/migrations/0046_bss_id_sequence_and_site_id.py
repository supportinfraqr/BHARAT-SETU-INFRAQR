from django.db import migrations, models


def backfill_site_ids(apps, schema_editor):
    """Give every existing site a unique masked BSS-S identifier."""
    from api import bss_ids

    Site = apps.get_model("bss_core", "Site")
    for site in Site.objects.filter(bss_site_id__isnull=True):
        site.bss_site_id = bss_ids.new_bss_site_id()
        site.save(update_fields=["bss_site_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0045_binding_rejected_and_unbind_actor"),
    ]

    operations = [
        migrations.CreateModel(
            name="BssIdSequence",
            fields=[
                ("id", models.PositiveSmallIntegerField(primary_key=True, serialize=False)),
                ("value", models.BigIntegerField(default=0)),
            ],
            options={
                "db_table": "bss_id_sequence",
            },
        ),
        migrations.AddField(
            model_name="site",
            name="bss_site_id",
            field=models.CharField(blank=True, max_length=20, null=True, unique=True),
        ),
        migrations.RunPython(backfill_site_ids, migrations.RunPython.noop),
    ]
