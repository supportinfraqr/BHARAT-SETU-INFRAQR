"""Seed the default (Central) occupational health-examination forms.

Idempotent: creates the Central Form-VIII and Form-IX rows from the Gazette
replica on a fresh database, and fills an empty html on an existing row. Admin
edits (a non-empty html) are never overwritten — restore a form in the studio.
"""

import re

from bss_core.models import MedicalFormTemplate
from bss_core.seeds.medical_form_default import MEDICAL_FORM_HTML

TEMPLATE_ID = "osh-form-viii-ix-2026"
TEMPLATE_NAME = "Form-VIII / Form-IX — Health Examination (OSH Code)"
FORM_TYPES = ("VIII", "IX")


def _doc_for(html, form_type):
    first = re.search(r"<section\s+data-form=", html, re.I)
    last = html.lower().rfind("</section>")
    if not first or last == -1:
        return html
    before = html[:first.start()]
    after = html[last + len("</section>"):]
    match = re.search(r'<section\s+data-form="%s"[^>]*>[\s\S]*?</section>' % form_type, html, re.I)
    return before + (match.group(0) if match else "") + after


def seed():
    created = 0
    for form_type in FORM_TYPES:
        row, is_new = MedicalFormTemplate.objects.get_or_create(
            state="Central", jurisdiction="central", form_type=form_type,
            defaults={
                "template_id": TEMPLATE_ID,
                "name": TEMPLATE_NAME,
                "html": _doc_for(MEDICAL_FORM_HTML, form_type),
                "status": "draft",
                "version": 1,
            },
        )
        if is_new:
            created += 1
        elif not row.html:
            row.html = _doc_for(MEDICAL_FORM_HTML, form_type)
            row.save(update_fields=["html", "updated_at"])
    return {"created": created}
