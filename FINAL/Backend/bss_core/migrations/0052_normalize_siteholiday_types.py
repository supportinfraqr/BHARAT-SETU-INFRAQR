"""Normalise existing SiteHoliday rows to the reduced type set.

The calendar now only uses WEEKLY_OFF / PUBLIC / RESTRICTED. Map the retired
values so no row keeps a code that is no longer a valid choice.
"""
from django.db import migrations

_MAP = {
    "ANNUAL": "PUBLIC",
    "SICK": "PUBLIC",
    "OTHER": "PUBLIC",
    "OPTIONAL": "RESTRICTED",
}


def normalise(apps, schema_editor):
    SiteHoliday = apps.get_model("bss_core", "SiteHoliday")
    for old, new in _MAP.items():
        SiteHoliday.objects.filter(holiday_type=old).update(holiday_type=new)


def reverse(apps, schema_editor):
    # Not reversible: the original per-row codes are not recoverable.
    pass


class Migration(migrations.Migration):

    dependencies = [("bss_core", "0051_site_restricted_holiday_allotment_and_more")]

    operations = [migrations.RunPython(normalise, reverse)]
