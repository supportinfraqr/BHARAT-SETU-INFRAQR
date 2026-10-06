# Rename legacy CLRA state spellings to the canonical Indian state names so the
# admin / applicability lookups match the state used by Sites (e.g. Orissa →
# Odisha, Telengana → Telangana, Uttrakhand → Uttarakhand). No schema change.

from django.db import migrations

RENAMES = {
    "Orissa": "Odisha",
    "Telengana": "Telangana",
    "Uttrakhand": "Uttarakhand",
    "Chattisgarh": "Chhattisgarh",
    "Pondicherry": "Puducherry",
    "Jammu & Kashmir": "Jammu and Kashmir",
}


def to_canonical(apps, schema_editor):
    for model_name, field in (("RegisterTemplate", "state"),
                              ("StateFormApplicability", "state"),
                              ("StateCode", "state"),
                              ("StateFeeMaster", "state")):
        model = apps.get_model("bss_core", model_name)
        for old, new in RENAMES.items():
            model.objects.filter(**{field: old}).update(**{field: new})


def to_legacy(apps, schema_editor):
    for model_name, field in (("RegisterTemplate", "state"),
                              ("StateFormApplicability", "state"),
                              ("StateCode", "state"),
                              ("StateFeeMaster", "state")):
        model = apps.get_model("bss_core", model_name)
        for old, new in RENAMES.items():
            model.objects.filter(**{field: new}).update(**{field: old})


class Migration(migrations.Migration):

    dependencies = [
        ('bss_core', '0142_jurisdiction_format'),
    ]

    operations = [
        migrations.RunPython(to_canonical, to_legacy),
    ]
