"""Repair CLRA register-template headings where the "See Rule …" citation was
merged with the form code.

The importer treated the first non-bracket preamble row as the register title,
so a register whose source reads

    See Rule 78(1)(a)(i
    FORM XVI
    Muster Roll

ended up with ``<h1>See Rule 78(1)(a)(i FORM XVI</h1>`` — the rule glued to the
form code, with no clean heading. This rewrites such headings to

    <h1>FORM XVI</h1>
    <h2>See Rule 78(1)(a)(i</h2>

leaving the rest of the template (the register title line, the grid, the
columns) untouched. Idempotent: also strips a form code left glued to an
already-separated citation <h2>.

Safe by default: reports only. Pass ``--apply`` to write.
"""

import re

from django.core.management.base import BaseCommand
from django.utils.html import escape

H1_RE = re.compile(r"<h1([^>]*)>(.*?)</h1>", re.S)
H2_RE = re.compile(r"<h2([^>]*)>(.*?)</h2>", re.S)
FORM_RE = re.compile(r"FORM\s+[IVXLCDM0-9][A-Z0-9\-]*", re.I)
H2_STYLE = ("text-align:center;font-size:14px;font-weight:600;"
            "margin:2px 0 8px;color:#475569;")


def _text(html_fragment):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html_fragment)).strip()


class Command(BaseCommand):
    help = "Fix register-template headings where 'See Rule …' was merged with the form code."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true",
                            help="Actually write the fixed headings (default: dry run).")

    def handle(self, *args, **options):
        from bss_core.models import RegisterTemplate

        apply = options["apply"]
        rows = []
        for t in RegisterTemplate.objects.all():
            html = t.html or ""
            new_html, note = _fix(html, t.form_code or "")
            if note:
                rows.append((t, note, new_html))

        if not rows:
            self.stdout.write(self.style.SUCCESS("No merged 'See Rule' headings found."))
            return

        self.stdout.write(self.style.WARNING(f"{len(rows)} heading(s) to fix:"))
        for t, note, _ in rows:
            self.stdout.write(f"  {t.state:<20} {note}")

        if not apply:
            self.stdout.write(self.style.WARNING("Dry run — re-run with --apply to fix."))
            return

        for t, _note, new_html in rows:
            t.html = new_html
            t.save(update_fields=["html"])
        self.stdout.write(self.style.SUCCESS(f"Fixed {len(rows)} heading(s)."))


def _fix(html, form_code):
    """Return (new_html, note). ``note`` is empty when nothing needed changing."""
    # 1) The citation is sitting in the <h1> with the form code glued on.
    m1 = H1_RE.search(html)
    if m1 and "see rule" in _text(m1.group(2)).lower():
        text = _text(m1.group(2))
        code = (FORM_RE.search(text).group(0).upper() if FORM_RE.search(text) else form_code)
        rule = FORM_RE.sub("", text).strip()
        replacement = f"<h1{m1.group(1)}>{escape(code)}</h1>"
        if rule:
            replacement += f'\n<h2 style="{H2_STYLE}">{escape(rule)}</h2>'
        return html[:m1.start()] + replacement + html[m1.end():], f"{text!r} -> {code!r}"

    # 2) Already split, but the form code is still glued to the citation <h2>.
    m2 = H2_RE.search(html)
    if m2:
        text = _text(m2.group(2))
        if "see rule" in text.lower() and FORM_RE.search(text):
            rule = FORM_RE.sub("", text).strip()
            replacement = f"<h2{m2.group(1)}>{escape(rule)}</h2>"
            return html[:m2.start()] + replacement + html[m2.end():], f"cleaned h2 {text!r}"

    return html, ""
