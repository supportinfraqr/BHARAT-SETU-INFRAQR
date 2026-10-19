"""Split a combined Form-VIII/IX medical template into two independent rows.

The studio now stores Form-VIII and Form-IX separately (each with its own
draft/published status and version). Legacy rows held both sections in one HTML;
this moves each section into its own row.
"""

import re

from django.core.management.base import BaseCommand

from bss_core.models import MedicalFormTemplate


def _doc_for(html, form_type):
    first = re.search(r"<section\s+data-form=", html, re.I)
    last = html.lower().rfind("</section>")
    if not first or last == -1:
        return html
    before = html[:first.start()]
    after = html[last + len("</section>"):]
    match = re.search(r'<section\s+data-form="%s"[^>]*>[\s\S]*?</section>' % form_type, html, re.I)
    return before + (match.group(0) if match else "") + after


class Command(BaseCommand):
    help = "Split legacy combined Form-VIII/IX medical templates into separate rows."

    def handle(self, *args, **options):
        split = 0
        for row in MedicalFormTemplate.objects.all():
            html = row.html or ""
            has_viii = 'data-form="VIII"' in html
            has_ix = 'data-form="IX"' in html
            if not (has_viii and has_ix):
                continue
            viii, ix = _doc_for(html, "VIII"), _doc_for(html, "IX")
            row.form_type = "VIII"
            row.html = viii
            row.save(update_fields=["form_type", "html", "updated_at"])
            MedicalFormTemplate.objects.update_or_create(
                state=row.state, jurisdiction=row.jurisdiction, form_type="IX",
                defaults={
                    "template_id": row.template_id, "name": row.name, "html": ix,
                    "status": row.status, "version": row.version, "is_active": row.is_active,
                    "created_by_id": row.created_by_id,
                },
            )
            split += 1
        self.stdout.write(self.style.SUCCESS(f"Split {split} combined medical form(s)."))
