"""Seed the standard custom cost heads onto cost-sheet templates that have none.

Some published masters (and the org-owned DRAFTs adopted from them) ended up
with zero custom lines, so the contractor's "Part C" custom section was empty and
nothing could be edited. This adds the platform's standard custom heads to:
  - published platform masters (owner is null), and
  - org-owned DRAFTs (contractor proposals not yet submitted).

Idempotent: templates that already have custom lines are left untouched.
"""

from django.core.management.base import BaseCommand


STANDARD_HEADS = [
    ("Uniform", "FIXED", "MONTHLY", "both", True),
    ("PPE / Safety Equipment", "FIXED", "MONTHLY", "both", True),
    ("Medical Examination", "FIXED", "ANNUAL", "both", True),
    ("Insurance", "FIXED", "MONTHLY", "both", True),
    ("Training", "FIXED", "MONTHLY", "both", True),
    ("Food", "FIXED", "MONTHLY", "both", True),
    ("Accommodation", "FIXED", "MONTHLY", "both", True),
    ("Transport", "FIXED", "MONTHLY", "both", True),
    ("Administrative Cost", "FIXED", "MONTHLY", "contractor", True),
    ("Reliever Cost", "FIXED", "MONTHLY", "contractor", True),
    ("Site Allowance", "FIXED", "MONTHLY", "both", True),
    ("Shift Allowance", "FIXED", "MONTHLY", "both", True),
    ("Risk Allowance", "FIXED", "MONTHLY", "both", True),
    ("Profit Margin", "PERCENT", "MONTHLY", "contractor", True),
    ("Service Charges", "PERCENT", "MONTHLY", "contractor", True),
    ("Applicable Taxes (GST)", "PERCENT", "MONTHLY", "contractor", True),
    ("BSS Platform Cost", "FIXED", "MONTHLY", "both", False),
]


class Command(BaseCommand):
    help = "Seed standard custom cost heads onto cost-sheet templates that have none."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        from django.db.models import Q

        from bss_core.models import CostSheetCustomLine, CostSheetTemplate

        dry = options["dry_run"]
        targets = CostSheetTemplate.objects.filter(
            Q(owner__isnull=True, status="PUBLISHED") | Q(owner__isnull=False, status="DRAFT"))
        seeded = 0
        for t in targets:
            if t.custom_lines.exists():
                continue
            self.stdout.write(f"  + {t.code} ({t.name}) — {len(STANDARD_HEADS)} custom heads")
            if dry:
                seeded += 1
                continue
            for order, (name, rate_type, frequency, applies_to, editable) in enumerate(STANDARD_HEADS):
                CostSheetCustomLine.objects.create(
                    template=t, name=name, amount=0, rate_type=rate_type,
                    frequency=frequency, applies_to=applies_to,
                    editable_by_org=editable, sort_order=order)
            seeded += 1
        verb = "would be" if dry else "were"
        self.stdout.write(self.style.SUCCESS(f"{seeded} template(s) {verb} seeded."))
