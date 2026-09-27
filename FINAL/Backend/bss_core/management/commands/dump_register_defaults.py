"""Dump the current register-template library into a Python snapshot module.

Writes ``bss_core/seeds/register_defaults.py`` — a code-level, deterministic
snapshot of every ``RegisterTemplate`` (state, purpose, form_code, title, act,
html, columns) together with its exact field mappings and calculation rules.

The snapshot is the canonical "default" the register engine is reset to; running
``python manage.py seed_register_config --reset`` anywhere (staging, prod, a
fresh clone) reproduces the identical library each time.
"""

import os

from django.core.management.base import BaseCommand, CommandError

from bss_core.models import (RegisterCalculationRule, RegisterFieldMapping,
                             RegisterTemplate)


def _render(value, indent):
    pad = " " * indent
    if isinstance(value, str):
        return repr(value)
    if isinstance(value, (list, tuple)):
        inner = " " * (indent + 4)
        items = [",\n".join(_render(v, indent + 4) for v in value)]
        if len(value) == 0:
            return "[]" if isinstance(value, list) else "()"
        body = (",\n".join(_render(v, indent + 4) for v in value))
        if isinstance(value, list):
            return "[\n" + inner + body + "\n" + pad + "]"
        return "(\n" + inner + body + "\n" + pad + ")"
    if isinstance(value, dict):
        inner = " " * (indent + 4)
        body = (",\n".join(f"{repr(k)}: {_render(v, indent + 4)}"
                           for k, v in value.items()))
        return "{\n" + inner + body + "\n" + pad + "}"
    return repr(value)


class Command(BaseCommand):
    help = ("Snapshot the current register library (templates + field mappings "
            "+ calculation rules) into bss_core/seeds/register_defaults.py so it "
            "can be replicated exactly anywhere.")

    def add_arguments(self, parser):
        parser.add_argument("--output", default="__default__",
                            help="Target file (default: bss_core/seeds/register_defaults.py)")

    def handle(self, *args, **options):
        if options["output"] == "__default__":
            out = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "seeds", "register_defaults.py")
        else:
            out = options["output"]

        entries = []
        qs = (RegisterTemplate.objects
              .select_related()
              .order_by("state", "purpose", "form_code"))
        for t in qs:
            columns = [str(c) for c in (t.columns or [])]
            mappings = {str(col): str(k)
                        for col, k in
                        RegisterFieldMapping.objects
                        .filter(template=t)
                        .values_list("column", "field_key")}
            rules = [{"target": r.target_field, "label": r.label, "formula": r.formula}
                     for r in RegisterCalculationRule.objects.filter(template=t)
                     .order_by("id")]
            entries.append({
                "state": t.state,
                "purpose": t.purpose,
                "form_code": t.form_code,
                "title": t.title,
                "act": t.act or "",
                "html": t.html or "",
                "columns": columns,
                "field_mappings": mappings,
                "calculation_rules": rules,
            })

        if not entries:
            raise CommandError("No RegisterTemplate rows found to dump.")

        body = _render(entries, 0)
        template_rows = len(entries)
        mapping_rows = sum(len(e["field_mappings"]) for e in entries)
        rule_rows = sum(len(e["calculation_rules"]) for e in entries)
        source = (
            "# -*- coding: utf-8 -*-\n"
            "# GENERATED CODE — do not edit by hand.\n"
            "#\n"
            "# Canonical default CLRA register library. Produced by\n"
            "# `python manage.py dump_register_defaults`; restored by\n"
            "# `python manage.py seed_register_config --reset`.\n"
            "# Every row is keyed by (state, purpose, form_code) and the restore\n"
            "# reproduces the identical library (templates + field mappings +\n"
            "# calculation rules) on any environment, every run.\n"
            "\n"
            "TEMPLATES = " + body + "\n"
        )
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(source)
        self.stdout.write(self.style.SUCCESS(
            f"Wrote {out}\n"
            f"  templates      : {template_rows}\n"
            f"  field mappings : {mapping_rows}\n"
            f"  calc rules     : {rule_rows}"))