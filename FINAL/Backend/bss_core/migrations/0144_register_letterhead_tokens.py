# Inject letterhead data tokens into register templates that only have blank
# dotted lines ("Name and address of Contractor ………"). Idempotent: only rewrites
# lines that still carry a dotted blank and do not already hold the token.

import re

from django.db import migrations

_DOT = r"[.\u2026\u22ef\u2024\u00b7]"

# (label, replacement tokens). A state form can render both name and address from
# the letterhead context the backend supplies.
_REPLACEMENTS = [
    ("Name and address of Contractor",
     "{{CONTRACTOR_NAME}}, {{CONTRACTOR_ADDRESS}}"),
    ("Name and address of establishment in/under which contract is carried on",
     "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    ("Name and address of Principal Employer",
     "{{EMPLOYER_NAME}}, {{EMPLOYER_ADDRESS}}"),
    ("Nature and location of work",
     "{{NATURE_OF_WORK}}, {{LOCATION}}"),
]

_LABEL_PATTERNS = [
    (re.compile(r"(" + re.escape(label) + r")\s*(?:" + _DOT + r"\s*){4,}", re.I),
     r"\1: " + tokens + " ")
    for label, tokens in _REPLACEMENTS
]
# A paragraph can start with dotted blanks before the Principal-Employer label.
_LEAD_PRINCIPAL = re.compile(
    r"(?:" + _DOT + r"\s*){4,}(Name and address of Principal Employer)", re.I)
# Standalone dotted-only paragraphs become redundant once the label carries data.
_DOTS_ONLY_PARA = re.compile(
    r"<p[^>]*>\s*(?:" + _DOT + r"\s*){4,}</p>", re.I)


def add_letterhead_tokens(apps, schema_editor):
    RegisterTemplate = apps.get_model("bss_core", "RegisterTemplate")
    changed = 0
    for template in RegisterTemplate.objects.exclude(html="").iterator():
        original = template.html or ""
        html = original
        for pattern, replacement in _LABEL_PATTERNS:
            html = pattern.sub(replacement, html)
        html = _LEAD_PRINCIPAL.sub(r"\1", html)
        html = _DOTS_ONLY_PARA.sub("", html)
        if html != original:
            template.html = html
            template.save(update_fields=["html"])
            changed += 1
    if changed:
        print(f"[0144] letterhead tokens added to {changed} register template(s).")


class Migration(migrations.Migration):

    dependencies = [
        ("bss_core", "0143_canonical_state_names"),
    ]

    operations = [
        migrations.RunPython(add_letterhead_tokens, migrations.RunPython.noop),
    ]
