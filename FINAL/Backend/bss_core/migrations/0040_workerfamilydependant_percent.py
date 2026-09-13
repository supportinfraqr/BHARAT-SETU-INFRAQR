from django.db import migrations, models


def backfill_percent(apps, schema_editor):
    """Give existing nominees a share: a lone nominee gets 100%, several are
    split as evenly as possible with the remainder on the last one."""
    Family = apps.get_model("bss_core", "WorkerFamilyDependant")
    user_ids = (Family.objects.filter(nominee=True)
                .values_list("user_id", flat=True).distinct())
    for uid in user_ids:
        rows = list(Family.objects.filter(user_id=uid, nominee=True).order_by("id"))
        count = len(rows)
        if not count:
            continue
        base = 100 // count
        remainder = 100 - base * count
        for index, row in enumerate(rows):
            row.percent = base + (remainder if index == count - 1 else 0)
            row.save(update_fields=["percent"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0039_workeridentity_pan_verified"),
    ]

    operations = [
        migrations.AddField(
            model_name="workerfamilydependant",
            name="percent",
            field=models.SmallIntegerField(null=True, blank=True),
        ),
        migrations.RunPython(backfill_percent, noop),
    ]
