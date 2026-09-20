"""Seed admin-side CLRA register configuration from code.

Populates the two admin-editable layers of the CLRA register engine so the
Registers admin UI is pre-configured instead of empty:

* **Field mappings** — pins common statutory register columns (Sl. No., name,
  date of joining, address, …) to the master-file field keys, filling the gaps
  the built-in ``match_column`` heuristic leaves.
* **Calculation rules** — for wage registers, wires the standard arithmetic
  (wages earned = days worked × daily rate, net paid = wages earned − deductions,
  overtime wages = overtime hours × daily rate ÷ 8).

Both layers stay fully editable in ``/admin/masters/register-template``; the
command is idempotent and safe to re-run on every deploy (it never duplicates a
mapping or a rule, and leaves admin edits alone unless ``--reset`` is given).
"""

from django.core.management.base import BaseCommand

from bss_core.models import (RegisterCalculationRule, RegisterFieldMapping,
                             RegisterTemplate)


def _norm(label):
    """Normalise a column label for matching: lowercase, unify quotes/dashes,
    collapse whitespace and drop trailing punctuation."""
    text = str(label or "").lower().replace("’", "'").replace("`", "'")
    text = text.replace("–", "-").replace("—", "-")
    text = " ".join(text.split())
    return text.strip(" .:")


# Register-template column label → master-file field key. Applied to every
# template; a column the auto-match already resolves is left untouched.
COLUMN_FIELDS = {
    "si.no.": "sl",
    "si no": "sl",
    "sl no": "sl",
    "sl. no": "sl",
    "serial no": "sl",
    "serial number": "sl",
    "name of workmen": "name",
    "name of workman": "name",
    "name and surname of workmen": "name",
    "name and surname of workman": "name",
    "name of the workman": "name",
    "workman name": "name",
    "bss id": "bssId",
    "bss worker id": "bssId",
    "bss id no": "bssId",
    "designation/ nature of employment": "designation",
    "nature of employment/designation": "designation",
    "designation / nature of employment": "designation",
    "nature of work": "designation",
    "nature of employment": "designation",
    "department": "department",
    "department/ section": "department",
    "site": "site",
    "site name": "site",
    "name of site": "site",
    "site address": "location",
    "location": "location",
    "local address": "location",
    "place of work": "location",
    "mobile": "mobile",
    "mobile no.": "mobile",
    "mobile number": "mobile",
    "contact no.": "mobile",
    "dates": "doj",
    "date": "doj",
    "date of joining": "doj",
    "date of appointment": "doj",
    "date of commencement of employment": "doj",
    "date of commencement": "doj",
}

# Wage-register columns → their own canonical field key so calculation rules
# can reference them (values come from the master file when present).
WAGE_FIELDS = {
    "no. of days worked": "daysWorked",
    "number of days worked": "daysWorked",
    "days worked": "daysWorked",
    "no of days worked": "daysWorked",
    "daily-rate of wages/piece-rate": "dailyRate",
    "daily rate of wages": "dailyRate",
    "daily rate": "dailyRate",
    "rate of wages": "dailyRate",
    "rate of daily wages": "dailyRate",
    "amount of wages earned": "wagesEarned",
    "wages earned": "wagesEarned",
    "amount of wages": "wagesEarned",
    "deductions if any (indicate nature)": "deductions",
    "deductions if any": "deductions",
    "deductions": "deductions",
    "net amount paid": "netPaid",
    "net wages paid": "netPaid",
    "overtime hours": "otHours",
    "overtime wages": "otWages",
}


def _calculation_rules(fields):
    """Standard wage-register arithmetic, enabled only for the fields present."""
    rules = []
    if {"daysWorked", "dailyRate", "wagesEarned"} <= fields:
        rules.append(("wagesEarned", "Wages earned", "daysWorked * dailyRate"))
    if {"wagesEarned", "deductions", "netPaid"} <= fields:
        rules.append(("netPaid", "Net amount paid", "wagesEarned - deductions"))
    if {"otHours", "dailyRate", "otWages"} <= fields:
        rules.append(("otWages", "Overtime wages", "otHours * dailyRate / 8"))
    return rules


class Command(BaseCommand):
    help = "Seed admin register field mappings + calculation rules (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Overwrite existing mappings/rules for the seeded columns.")

    def handle(self, *args, **options):
        reset = options["reset"]
        mappings_created = mappings_updated = rules_created = rules_updated = 0

        for template in RegisterTemplate.objects.all().iterator():
            columns = [str(c) for c in (template.columns or [])]
            existing = {m.column: m for m in template.field_mappings.all()}
            mapped = {}

            for column in columns:
                key = COLUMN_FIELDS.get(_norm(column)) or WAGE_FIELDS.get(_norm(column))
                if not key:
                    continue
                row = existing.get(column)
                if row is None:
                    RegisterFieldMapping.objects.create(
                        template=template, column=column, field_key=key)
                    mapped[column] = key
                    mappings_created += 1
                elif reset and row.field_key != key:
                    row.field_key = key
                    row.save(update_fields=["field_key"])
                    mapped[column] = key
                    mappings_updated += 1
                else:
                    mapped[column] = row.field_key

            for row in template.field_mappings.all():
                mapped[row.column] = row.field_key

            existing_rules = {r.target_field: r for r in template.calculation_rules.all()}
            for target, label, formula in _calculation_rules(set(mapped.values())):
                rule = existing_rules.get(target)
                if rule is None:
                    RegisterCalculationRule.objects.create(
                        template=template, target_field=target, label=label, formula=formula)
                    rules_created += 1
                elif reset and (rule.formula != formula or rule.label != label):
                    rule.formula, rule.label = formula, label
                    rule.save(update_fields=["formula", "label"])
                    rules_updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Register config seeded — mappings: {mappings_created} new / "
            f"{mappings_updated} updated · rules: {rules_created} new / "
            f"{rules_updated} updated."))
