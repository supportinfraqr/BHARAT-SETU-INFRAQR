"""Normalise letter templates: safe A4 page box, BSS branding where allowed.

Existing templates hardcode ``.page { width:794px }``, which overflows the PDF
page box and clips the right-hand edge. Appointment templates also used a
flexbox brand row around an unsized logo, and the statutory Form XV experience
templates must stay free of any BSS logo or wordmark.

This command rewrites stored HTML through ``letter_brand.ensure_letter_html``,
drops the logo URL for unbranded types, and fills a missing ``logo_url`` with the
hosted default for branded types. Idempotent.
"""

from django.core.management.base import BaseCommand

from bss_core import letter_brand
from bss_core.models import LetterTemplate


class Command(BaseCommand):
    help = "Fix the page box and logo header on all letter templates (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Report what would change without saving.")

    def handle(self, *args, **opts):
        dry = bool(opts.get("dry_run"))
        scanned = changed = logo_fixed = unbranded = 0

        for t in LetterTemplate.objects.all().order_by("id"):
            scanned += 1
            original_html = t.html or ""
            branded = letter_brand.wants_logo(t.letter_type)

            new_html = letter_brand.ensure_letter_html(original_html, t.letter_type)
            new_logo = letter_brand.ensure_logo_url(t.logo_url, t.letter_type)

            html_changed = new_html != original_html
            logo_changed = new_logo != (t.logo_url or "").strip()

            if not html_changed and not logo_changed:
                continue

            changed += 1
            if logo_changed:
                logo_fixed += 1
            if not branded:
                unbranded += 1
            self.stdout.write(
                f"  #{t.id} {t.letter_type} [{t.state or 'All-India'}] {t.name}"
                f"{'  +logo_url' if logo_changed else ''}"
                f"{'  -logo_url' if logo_changed and not branded else ''}"
                f"{'  pagebox/brand' if html_changed else ''}")

            if not dry:
                t.html = new_html
                t.logo_url = new_logo
                t.save(update_fields=["html", "logo_url", "updated_at"])

        verb = "would update" if dry else "updated"
        self.stdout.write(self.style.SUCCESS(
            f"{verb} {changed} of {scanned} letter templates "
            f"({logo_fixed} logo_url changed, {unbranded} unbranded statutory)."))
