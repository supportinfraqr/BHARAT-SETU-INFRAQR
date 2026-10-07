# Edge-case letterhead fills: short dot runs, multiple labels per paragraph, a
# misspelled "establisment", plural "Principal Employers", and colon-only labels
# (Maharashtra FORM II). Idempotent.

import re

from django.db import migrations

_DOT = r"[.\u2026\u22ef\u2024\u00b7]"

_PAIRS = [
    (r"Name and address of [Cc]ontractor", "{{CONTRACTOR_NAME}}, {{CONTRACTOR_ADDRESS}}"),
    (r"Name and address of establis(?:h)?ment in/under which contract is carried on",
     "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    (r"Name and address of Principal Employe(?:r|rs)", "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    (r"Nature and location of work", "{{NATURE_OF_WORK}}, {{LOCATION}}"),
]

# label + optional colon + one or more dots  ->  value
_DOTTED = [(re.compile(r"(" + lbl + r")\s*:?\s*(?:" + _DOT + r"\s*){1,}", re.I),
            r"\1: " + toks + " ")
           for lbl, toks in _PAIRS]
# label + colon + (another label or a tag) with no dots  ->  value
_COLON_ONLY = [(re.compile(r"(" + lbl + r")\s*:\s*(?=(?:Name and address|<))", re.I),
                r"\1: " + toks + " ")
               for lbl, toks in _PAIRS]


def fill_edges(apps, schema_editor):
    RegisterTemplate = apps.get_model("bss_core", "RegisterTemplate")
    changed = 0
    for template in RegisterTemplate.objects.exclude(html="").iterator():
        original = template.html or ""
        html = original
        for group in (_DOTTED, _COLON_ONLY):
            for pattern, replacement in group:
                html = pattern.sub(replacement, html)
        if html != original:
            template.html = html
            template.save(update_fields=["html"])
            changed += 1
    if changed:
        print(f"[0146] letterhead edge cases filled on {changed} register template(s).")


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0145_register_letterhead_variants"),
    ]

    operations = [
        migrations.RunPython(fill_edges, migrations.RunPython.noop),
    ]
