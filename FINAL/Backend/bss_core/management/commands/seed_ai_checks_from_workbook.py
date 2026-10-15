"""Append the workbook's per-document **AI checkpoints** onto the existing forms
and register templates.

Source: ``FINAL/Requirements/BSS_Sample_Reports_Audit Validation.xlsx`` →
"Verification Framework" sheet → each document's **Pointers to be Checked**
(rows 24-55). The pointers are embedded here so the command needs no xlsx.

It **never creates** forms/templates — it only **adds** the pointers to the
``ai_checks`` of rows we already have (de-duplicated, existing kept). Documents
with no matching form/template are reported and skipped.

    python manage.py seed_ai_checks_from_workbook --dry-run
    python manage.py seed_ai_checks_from_workbook            # append (keep existing)
    python manage.py seed_ai_checks_from_workbook --replace  # reset to just these
"""

from django.core.management.base import BaseCommand

# Workbook "Pointers to be Checked" per document (split on ';').
DOC_POINTERS = {
    "workmen": [
        "Form number", "Employee ID", "Employee name", "Aadhaar", "Father's name",
        "DOB/age", "Permanent address", "Local address", "Joining date", "Resignation date",
        "Photograph", "Employee signature/thumb impression", "Employer signature/stamp",
    ],
    "muster": [
        "Register number", "Employee names", "Designation", "Attendance", "Present/absent/leave",
        "Total days", "Verification signature",
    ],
    "wage_register": [
        "Employee details", "UAN", "ESIC", "Wage rate", "Attendance days", "Basic", "HRA",
        "Allowances", "Bonus", "Gross wages", "PF/ESI/PT/LWF/advance deductions", "Net pay", "Signatures",
    ],
    "deduction_damage": [
        "Employee details", "Deduction amount", "Supporting documents", "Explanation letter",
        "Approval/signature", "Wage Register match",
    ],
    "advances": [
        "Advance request", "Approval", "Amount", "Recovery schedule", "Wage deduction", "Employer signature",
    ],
    "overtime": [
        "OT hours", "Attendance", "OT approval", "Calculation", "Payment", "Acknowledgement",
    ],
    "fines": [
        "Employee details", "Fine amount", "Reason", "Approval", "Notice", "Wage deduction",
    ],
    "epf_challan": [
        "Month", "Wage period", "TRRN", "Total wages", "Employee/employer contribution",
        "Total deposit", "Payment date", "Delay", "ECR match",
    ],
    "ecr": [
        "Employee count", "UAN", "PF/EPS/EDLI wages", "Employee/employer contribution", "Totals",
        "Challan reconciliation",
    ],
    "esic_challan": [
        "Contribution month", "Employee count", "Wage amount", "Employee/employer contribution",
        "Total deposit", "Payment date", "ECR",
    ],
    "pt": [
        "PT registration", "Deduction calculation", "Challan", "Return filing",
    ],
    "bank_transfer": [
        "Bank name", "Transfer date", "Employee name", "Amount paid", "Successful payment status",
    ],
}

# Register template title (lower-case) -> DOC_POINTERS key.
REGISTER_TITLE_MAP = {
    "register of workmen": "workmen",
    "muster roll cum wage register": "muster",
    "muster roll": "muster",
    "wage register": "wage_register",
    "register of deductions for damage or loss": "deduction_damage",
    "register of fines": "fines",
    "register of advances": "advances",
    "register of overtime": "overtime",
}

# Additional-form name (lower-case) -> DOC_POINTERS key.
FORM_NAME_MAP = {
    "provident fund challan": "epf_challan",
    "provident fund payment confirmation": "epf_challan",
    "provident fund ecr": "ecr",
    "esic challan": "esic_challan",
    "esic ecr": "esic_challan",
    "esic payment confirmation": "esic_challan",
    "professional tax return": "pt",
    "professional tax payment challan": "pt",
    "salary payment proof": "bank_transfer",
}


def _pointers(key):
    return [{"type": "custom", "label": p, "required": True} for p in DOC_POINTERS.get(key, [])]


def _merge(existing, new):
    """Append `new` checkpoints to `existing`, de-duplicated by label (existing kept)."""
    seen = {str(c.get("label") or "").strip().lower() for c in (existing or []) if isinstance(c, dict)}
    out = list(existing or [])
    added = 0
    for c in new:
        if c["label"].strip().lower() in seen:
            continue
        out.append(c)
        seen.add(c["label"].strip().lower())
        added += 1
    return out, added


class Command(BaseCommand):
    help = "Append the workbook's per-document AI checkpoints onto existing register templates / additional forms."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report only; change nothing.")
        parser.add_argument("--replace", action="store_true",
                            help="Replace existing checkpoints instead of appending (keeps nothing).")

    def handle(self, *args, **options):
        from bss_core.models import CustomFormName, RegisterTemplate

        dry = options["dry_run"]
        replace = options["replace"]

        reg_rows = reg_added = 0
        seen_titles = set()
        unmatched_titles = set()
        from bss_core.seeders.curated_checks import is_curated
        for t in RegisterTemplate.objects.all():
            if is_curated(t.purpose):
                continue  # curated registers use their own authored set
            title = (t.title or "").strip()
            seen_titles.add(title.lower())
            key = REGISTER_TITLE_MAP.get(title.lower())
            if not key:
                if title:
                    unmatched_titles.add(title)
                continue
            new = _pointers(key)
            merged, added = (new, len(new)) if replace else _merge(t.ai_checks, new)
            if added:
                reg_rows += 1
                reg_added += added
                if not dry:
                    t.ai_checks = merged
                    t.save(update_fields=["ai_checks"])

        form_rows = form_added = 0
        seen_names = set()
        unmatched_names = set()
        for f in CustomFormName.objects.all():
            name = (f.name or "").strip()
            seen_names.add(name.lower())
            key = FORM_NAME_MAP.get(name.lower())
            if not key:
                if name:
                    unmatched_names.add(name)
                continue
            new = _pointers(key)
            merged, added = (new, len(new)) if replace else _merge(f.ai_checks, new)
            if added:
                form_rows += 1
                form_added += added
                if not dry:
                    f.ai_checks = merged
                    f.save(update_fields=["ai_checks"])

        mode = "REPLACE" if replace else "APPEND"
        tag = "[dry-run] " if dry else ""
        self.stdout.write(self.style.SUCCESS(
            f"{tag}{mode} — register templates: {reg_rows} row(s) +{reg_added} checkpoint(s); "
            f"additional forms: {form_rows} row(s) +{form_added} checkpoint(s)."))
        self.stdout.write("Register titles with no mapping (skipped): " +
                          (", ".join(sorted(unmatched_titles)) or "none"))
        self.stdout.write("Form names with no mapping (skipped): " +
                          (", ".join(sorted(unmatched_names)) or "none"))
