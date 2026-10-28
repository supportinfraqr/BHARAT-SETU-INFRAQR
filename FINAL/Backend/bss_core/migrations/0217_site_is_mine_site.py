from django.db import migrations, models


def backfill_mine_sites(apps, schema_editor):
    Site = apps.get_model("bss_core", "Site")
    for site in Site.objects.all().only("id", "site_type", "site_category", "site_nature",
                                       "mine_type", "mineral", "mine_lease_number"):
        text = " ".join(str(getattr(site, field, "") or "") for field in
                        ("site_type", "site_category", "site_nature")).lower()
        is_mine = bool(site.mine_type or site.mineral or site.mine_lease_number or "mine" in text)
        if is_mine:
            Site.objects.filter(pk=site.pk).update(is_mine_site=True)


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0216_edge_camera_active_label_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="site",
            name="is_mine_site",
            field=models.BooleanField(
                default=False,
                help_text="Mine site: Form-IX mine medical certificate applies",
            ),
        ),
        migrations.RunPython(backfill_mine_sites, migrations.RunPython.noop),
    ]
