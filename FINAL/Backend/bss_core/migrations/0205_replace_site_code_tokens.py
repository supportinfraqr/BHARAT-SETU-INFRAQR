import re

from django.db import migrations

_REPLACEMENTS = (
    ("SITE_CODE", "SITE_BSS_ID"),
    ("site.code", "site.bssId"),
    ("siteCode", "siteBssId"),
    ("Site Code", "BSS Site ID"),
    ("Site code", "BSS Site ID"),
)


def _replace_text(value):
    if not isinstance(value, str):
        return value
    for old, new in _REPLACEMENTS:
        value = value.replace(old, new)
    value = re.sub(r"(?<!erp_)site_code", "bss_site_id", value)
    return value


def _replace_json(value):
    if isinstance(value, str):
        return _replace_text(value)
    if isinstance(value, list):
        return [_replace_json(item) for item in value]
    if isinstance(value, dict):
        return {_replace_text(str(key)): _replace_json(item) for key, item in value.items()}
    return value


def replace_tokens(apps, schema_editor):
    LetterTemplate = apps.get_model("bss_core", "LetterTemplate")
    RegisterTemplate = apps.get_model("bss_core", "RegisterTemplate")

    for template in LetterTemplate.objects.all().iterator():
        if template.html and _replace_text(template.html) != template.html:
            template.html = _replace_text(template.html)
            template.save(update_fields=["html"])

    text_fields = ("document", "html")
    json_fields = ("columns", "meta", "fields", "ai_checks")
    fields = {field.name for field in RegisterTemplate._meta.fields}
    for template in RegisterTemplate.objects.all().iterator():
        changed = []
        for field in text_fields:
            if field in fields:
                value = getattr(template, field)
                replaced = _replace_text(value)
                if replaced != value:
                    setattr(template, field, replaced)
                    changed.append(field)
        for field in json_fields:
            if field in fields:
                value = getattr(template, field)
                replaced = _replace_json(value)
                if replaced != value:
                    setattr(template, field, replaced)
                    changed.append(field)
        if changed:
            template.save(update_fields=changed)


class Migration(migrations.Migration):
    dependencies = [
        ("bss_core", "0204_remove_site_code"),
    ]

    operations = [
        migrations.RunPython(replace_tokens, migrations.RunPython.noop),
    ]
