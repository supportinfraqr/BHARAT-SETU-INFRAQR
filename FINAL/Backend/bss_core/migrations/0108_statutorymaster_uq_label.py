from django.db import migrations, models


def dedupe_statutory_labels(apps, schema_editor):
    """One row per statutory component label. Keeps the canonical seeded row
    (one that carries a component code, else the lowest id); drops stale
    duplicates that were previously allowed to be created via the admin API."""
    StatutoryMaster = apps.get_model("bss_core", "StatutoryMaster")
    groups = {}
    for row in StatutoryMaster.objects.order_by("id"):
        label = (row.label or "").strip()
        if not label:
            continue
        groups.setdefault(label, []).append(row)
    for rows in groups.values():
        if len(rows) < 2:
            continue
        rows.sort(key=lambda r: (0 if (r.component or "").strip() else 1, r.id))
        for duplicate in rows[1:]:
            duplicate.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0107_lettertemplate_logo_url"),
    ]

    operations = [
        migrations.RunPython(dedupe_statutory_labels, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="statutorymaster",
            constraint=models.UniqueConstraint(fields=["label"], name="uq_statutory_label"),
        ),
    ]