"""Dump the current letter-template library into a Python snapshot module.

Writes ``bss_core/seeds/letter_defaults.py`` — a code-level, deterministic
snapshot of every ``LetterTemplate`` (letter_type, state, name, html, logo_url,
is_active), keyed by the model's own unique constraint
``(state, letter_type, name)``.

The snapshot is the canonical "default" library that
``python manage.py seed_letter_templates --reset`` reproduces on any
environment (staging, prod, a fresh clone), so the appointment letter and the
statutory Form XV certificate no longer live in several hand-maintained HTML
copies that drift apart.

One deliberate difference from ``dump_register_defaults``: the injected
stylesheet is **stripped** before it is written. ``bss_core.letter_brand``
appends a versioned ``<style>bss-letter-css-vN</style>`` block to every
template, and that block is derived code — snapshotting it verbatim would make
the file stale the moment ``PRINT_CSS`` changes. The restore re-applies it via
``ensure_letter_html()`` instead, so a print-CSS fix needs no re-dump.
"""

import os

from django.core.management.base import BaseCommand, CommandError

from bss_core.letter_brand import strip_injected_css


def _render(value, indent):
    pad = " " * indent
    if isinstance(value, str):
        return repr(value)
    if isinstance(value, (list, tuple)):
        if len(value) == 0:
            return "[]" if isinstance(value, list) else "()"
        inner = " " * (indent + 4)
        body = ",\n".join(_render(v, indent + 4) for v in value)
        if isinstance(value, list):
            return "[\n" + inner + body + "\n" + pad + "]"
        return "(\n" + inner + body + "\n" + pad + ")"
    if isinstance(value, dict):
        if len(value) == 0:
            return "{}"
        inner = " " * (indent + 4)
        body = ",\n".join(f"{repr(k)}: {_render(v, indent + 4)}"
                          for k, v in value.items())
        return "{\n" + inner + body + "\n" + pad + "}"
    return repr(value)


class Command(BaseCommand):
    help = ("Snapshot the current letter-template library into "
            "bss_core/seeds/letter_defaults.py so it can be replicated exactly "
            "anywhere. The injected print stylesheet is stripped (re-applied on "
            "restore), so print-CSS changes never need a re-dump.")

    def add_arguments(self, parser):
        parser.add_argument("--output", default="__default__",
                            help="Target file (default: bss_core/seeds/letter_defaults.py)")

    def handle(self, *args, **options):
        from bss_core.models import LetterTemplate

        if options["output"] == "__default__":
            out = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "seeds", "letter_defaults.py")
        else:
            out = options["output"]

        entries = []
        qs = LetterTemplate.objects.all().order_by("state", "letter_type", "name")
        for t in qs:
            entries.append({
                "letter_type": t.letter_type,
                "state": t.state or "",
                "name": t.name,
                "html": strip_injected_css(t.html or ""),
                "logo_url": t.logo_url or "",
                "is_active": bool(t.is_active),
            })

        if not entries:
            raise CommandError("No LetterTemplate rows found to dump.")

        by_type = {}
        for e in entries:
            by_type[e["letter_type"]] = by_type.get(e["letter_type"], 0) + 1

        source = (
            "# -*- coding: utf-8 -*-\n"
            "# GENERATED CODE — do not edit by hand.\n"
            "#\n"
            "# Canonical default letter-template library (appointment letter +\n"
            "# statutory Form XV service certificate). Produced by\n"
            "# `python manage.py dump_letter_defaults`; restored by\n"
            "# `python manage.py seed_letter_templates --reset`.\n"
            "#\n"
            "# Every row is keyed by (state, letter_type, name) — the model's own\n"
            "# unique constraint — and the restore reproduces the identical\n"
            "# library on any environment, every run. Rows with state == \"\" are\n"
            "# the all-India defaults used when no state template matches.\n"
            "#\n"
            "# The injected print stylesheet is intentionally NOT stored here; it is\n"
            "# re-applied by bss_core.letter_brand.ensure_letter_html() on restore\n"
            "# and at render time, so print-CSS changes do not require a re-dump.\n"
            "\n"
            "TEMPLATES = " + _render(entries, 0) + "\n"
        )
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(source)

        detail = " · ".join(f"{k}: {v}" for k, v in sorted(by_type.items()))
        self.stdout.write(self.style.SUCCESS(
            f"Wrote {out}\n  templates : {len(entries)} ({detail})"))
