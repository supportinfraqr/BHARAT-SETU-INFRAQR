# Fill the remaining blank letterhead variants:
#   * <p>Name and address of Contractor</p>            (label only, no value)
#   * <span class="label">Name and Address of Contractor:</span><span class="fill"></span>
#   * append the address token where the name token already sits after the label.
# Idempotent.

import re

from django.db import migrations

_LABELS = [
    ("Name and address of Contractor", "{{CONTRACTOR_NAME}}, {{CONTRACTOR_ADDRESS}}"),
    ("Name and address of establishment in/under which contract is carried on",
     "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    ("Name and address of Principal Employer", "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    ("Nature and location of work", "{{NATURE_OF_WORK}}, {{LOCATION}}"),
]

# <p>Label</p>  ->  <p>Label: tokens</p>
_PARA_BLANK = [
    (re.compile(r"(>\s*)" + re.escape(label) + r"(\s*</p>)", re.I),
     r"\1" + label + ": " + tokens + r"\2")
    for label, tokens in _LABELS
]

# <span class="label">Label:</span><span class="fill"></span>  ->  filled span
_SPAN_FILL = [
    (re.compile(r'(<span class="label">\s*)' + re.escape(label) + r'\s*:?\s*(</span>\s*<span class="fill">)\s*(</span>)', re.I),
     r"\1" + label + r":\2" + tokens + r"\3")
    for label, tokens in _LABELS
]

# Name already tokenised after a "Name and address of Contractor" label — add the address.
_ADDRESS_AFTER_NAME = [
    (re.compile(r"(Name and [Aa]ddress of Contractor:?\s*(?:</b>|</strong>|</span>)?\s*)"
                r"\{\{CONTRACTOR_NAME\}\}(?!, \{\{CONTRACTOR_ADDRESS\}\})", re.I),
     r"\1{{CONTRACTOR_NAME}}, {{CONTRACTOR_ADDRESS}}"),
    (re.compile(r"(Name and [Aa]ddress of (?:establishment[^<]*|Principal Employer):?\s*"
                r"(?:</b>|</strong>|</span>)?\s*)\{\{EMPLOYER_NAME\}\}(?!, \{\{EMPLOYER_ADDRESS\}\})", re.I),
     r"\1{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
]


def fill_letterhead(apps, schema_editor):
    RegisterTemplate = apps.get_model("bss_core", "RegisterTemplate")
    changed = 0
    for template in RegisterTemplate.objects.exclude(html="").iterator():
        original = template.html or ""
        html = original
        for group in (_PARA_BLANK, _SPAN_FILL, _ADDRESS_AFTER_NAME):
            for pattern, replacement in group:
                html = pattern.sub(replacement, html)
        if html != original:
            template.html = html
            template.save(update_fields=["html"])
            changed += 1
    if changed:
        print(f"[0145] letterhead filled on {changed} register template(s).")


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0144_register_letterhead_tokens"),
    ]

    operations = [
        migrations.RunPython(fill_letterhead, migrations.RunPython.noop),
    ]
