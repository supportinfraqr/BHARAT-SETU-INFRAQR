"""Seed admin-side CLRA register configuration from code.

Populates the two admin-editable layers of the CLRA register engine so the
Registers admin UI is pre-configured instead of empty:

* **Field mappings** — pins common statutory register columns (Sl. No., name,
  date of joining, address, …) to the matching **master-sheet column** from
  ``Requirements/ContractorMasterSheet_Audit (28).xlsx`` (their exact header
  names, e.g. ``Employee_Code`` → ``Employee_Code``), filling the gaps the
  built-in ``match_column`` heuristic leaves. The renderer resolves a master
  header to its canonical row key via ``api.clra.HEADER_ALIASES``, so a
  mapping to ``Employee_Code`` reads the ``bssId`` field of each master row.
* **Calculation rules** — for wage registers, wires the standard arithmetic
  (wages earned = days worked × daily rate, net paid = wages earned − deductions,
  overtime wages = overtime hours × daily rate ÷ 8).

Both layers stay fully editable in ``/admin/masters/register-template``; the
command is idempotent and safe to re-run on every deploy (it never duplicates a
mapping or a rule, and leaves admin edits alone unless ``--reset`` is given).
"""

import re

from django.core.management.base import BaseCommand

from api.clra import HEADER_ALIASES
from bss_core.models import (RegisterCalculationRule, RegisterFieldMapping,
                             RegisterTemplate)

# The standard CLRA statutory registers — marked Mandatory so they are always
# adopted for any state where the employer has a site (admin can still edit the
# flag in /admin/masters/register-template).
MANDATORY_FORMS = {"XIII", "XVI", "XVII", "XIX", "XX", "XXI", "XXII", "XXIII"}

_ROMAN_RE = re.compile(r"\b([IVXLCDM]+)\b")


def _form_roman(form_code):
    """Extract the Roman-numeral form number from a form code/label."""
    match = _ROMAN_RE.search(str(form_code or "").upper())
    return match.group(1) if match else ""


def _norm(label):
    """Normalise a column label for matching: lowercase, unify quotes/dashes,
    collapse whitespace and drop trailing punctuation."""
    text = str(label or "").lower().replace("’", "'").replace("`", "'")
    text = text.replace("–", "-").replace("—", "-")
    text = " ".join(text.split())
    return text.strip(" .:")


# Register-template column label → matching master-sheet column (the exact
# header from ``Requirements/ContractorMasterSheet_Audit (28).xlsx``, e.g.
# ``Employee_Code``). The renderer resolves a header to its canonical row key via
# ``api.clra.HEADER_ALIASES``, so ``Employee_Code`` reads the master row's bssId.
# Applied to every template; a column with no master counterpart is left unmapped
# rather than assigned a wrong field.
COLUMN_FIELDS = {
    "si.no.": "sl",
    "si no": "sl",
    "sl no": "sl",
    "sl. no": "sl",
    "sl.no": "sl",
    "si. no.": "sl",
    "si.no": "sl",
    "si. no": "sl",
    "serial no": "sl",
    "serial number": "sl",
    "sl. no. in the register of workmen": "sl",
    "sl. no. in the register of workmen employed": "sl",
    "employee code": "Employee_Code",
    "employee id": "Employee_Code",
    "employee number": "Employee_Code",
    "bss id": "Employee_Code",
    "bss worker id": "Employee_Code",
    "bss id no": "Employee_Code",
    "name of workmen": "Employee_Name",
    "name of workman": "Employee_Name",
    "name of the workmen": "Employee_Name",
    "name of the workmen and address": "Employee_Name",
    "name and surname of workmen": "Employee_Name",
    "name and surname of workman": "Employee_Name",
    "name of the workman": "Employee_Name",
    "workman name": "Employee_Name",
    "father's/husband's name": "Father_Name",
    "father's/ husband's name": "Father_Name",
    "father's / husband's name": "Father_Name",
    "sex": "Gender",
    "sex / gender": "Gender",
    "age and sex": "Gender",
    "designation/ nature of employment": "Designation",
    "designation/nature of employment": "Designation",
    "nature of employment/designation": "Designation",
    "designation / nature of employment": "Designation",
    "designation / department": "Designation",
    "nature of work": "Designation",
    "nature of employment": "Designation",
    "designation": "Designation",
    "department": "Department",
    "department/ section": "Department",
    "site": "SiteCode",
    "site name": "SiteCode",
    "name of site": "SiteCode",
    "site address": "Location",
    "location": "Location",
    "place of work": "Location",
    "local address": "Address",
    "present address": "Address",
    "permanent home address of workman (village and tehsil/taluka and district)": "Address",
    "permanent house a ddress of workman (village and t e hsil/ t aluk and d istrict)": "Address",
    "mobile": "mobile",
    "mobile no.": "mobile",
    "mobile number": "mobile",
    "contact no.": "mobile",
    "dates": "Date_Of_Joining",
    "date": "Date_Of_Joining",
    "date of joining": "Date_Of_Joining",
    "date of appointment": "Date_Of_Joining",
    "date of commencement of employment": "Date_Of_Joining",
    "date of commencement": "Date_Of_Joining",
    "date of entry into service": "Date_Of_Joining",
    "date of termination of employment": "Date_Of_Leaving",
    "esi no.": "ESIC_No",
    "esi no": "ESIC_No",
    "esic no": "ESIC_No",
    "esic no.": "ESIC_No",
    "esic": "ESIC_Deductions",
    "p.f no.": "UAN_No",
    "p.f no": "UAN_No",
    "pf no": "UAN_No",
    "pf no.": "UAN_No",
    "pf": "PF_Deductions",
    "uan no": "UAN_No",
    "uan no.": "UAN_No",
    "name and address of the contractor": "Name_of_contractor",
    "name and address of contractor": "Name_of_contractor",
    "nature of work on contract": "Nature_ofWork_contractor",
    "location of contract work": "Location",
    "tenure of employment": "Tenure_of_Employement",
}

# Wage-register columns → matching master-sheet column header.
WAGE_FIELDS = {
    "no. of days worked": "Total_Days_Worked",
    "no. of days worked in a month": "Total_Days_Worked",
    "number of days worked": "Total_Days_Worked",
    "days worked": "Total_Days_Worked",
    "no of days worked": "Total_Days_Worked",
    "unit of work done": "NO_ofunit_Per_Piece",
    "daily rate": "Normal_Rate",
    "daily rate of wages": "Normal_Rate",
    "daily-rate of wages/piece-rate": "Normal_Rate",
    "rate of wages": "Normal_Rate",
    "rate of daily wages": "Normal_Rate",
    "rate of daily wages/piece rate": "Normal_Rate",
    "normal rate of wages": "Normal_Rate",
    "normal rates of wages": "Normal_Rate",
    "minimum rate of wages payable basic": "Fixed_Basic_Wages",
    "wages rate (with particular of unit in case of piece work)": "Fixed_Basic_Wages",
    "rate of wages (with particulars of unit in case of piece-work)": "Fixed_Basic_Wages",
    "actual rate of wages payable hra": "House_rent_Allowance",
    "amount of wages earned": "Gross_Wages",
    "wages earned": "Gross_Wages",
    "amount of wages": "Gross_Wages",
    "gross wages": "Gross_Wages",
    "gross wages payable": "Gross_Wages",
    "normal earnings": "Normal_Earnings",
    "amount of overtime wages": "Overtime_Earnings",
    "overtime wages": "Overtime_Earnings",
    "overtime earnings": "Overtime_Earnings",
    "overtime hours": "Overtime_Extent",
    "total overtime worked": "Overtime_Extent",
    "total overtime worked or production in case of piece rate": "Overtime_Extent",
    "overtime rate": "Overtime_Rate",
    "overtime rate of wages": "Overtime_Rate",
    "date on which overtime worked": "Overtime_Date",
    "dates on which overtime worked": "Overtime_Date",
    "date on which overtime wages paid": "Overtime_Payment_Date",
    "deductions if any (indicate nature)": "Total_Deductions",
    "deductions if any": "Total_Deductions",
    "deductions, if any,": "Total_Deductions",
    "deductions": "Total_Deductions",
    "total deductions": "Total_Deductions",
    "total deduction": "Total_Deductions",
    "net amount paid": "Net_Salary",
    "net wages paid": "Net_Salary",
    "net salary": "Net_Salary",
    "net amount of wages paid": "Net_Salary",
    "income tax": "TDS_Deductions",
    "other deduction": "Other_Deduction",
    "other deductions": "Other_Deduction",
    "proff / income tax": "PT_Deductions",
    "date payment of wages": "Payment_Date",
    "date and amount of advance given": "Advance_Amount",
    "advance paid": "Advance_Amount",
    "purpose(s) for which advance made": "Advance_Purpose",
    "no. of instalments by which advance to be repaid": "Advance_Installments",
    "date and amount of each instalments repaid": "Advance_Repaid_Amount",
    "date and amount of each instalment repaid": "Advance_Repaid_Amount",
    "date on which last instalments was repaid": "Advance_Repaid_Date",
    "date on which last instalment was repaid": "Advance_Repaid_Date",
    "particulars of damage or loss": "Loss_Caused",
    "date of damage or loss": "Date_of_Damage",
    "amount of deduction imposed": "Deduction_Amount",
    "no. of instalments": "Deduction_Installments",
    "act/ommission for which imposed": "Fine_Offence_Nature",
    "act or omission for which fine imposed": "Fine_Offence_Nature",
    "date of offence": "Fine_Offence_Date",
    "amount of fine imposed": "Fine_Amount",
    "date on which fine realised": "Fine_Realised_Date",
    "date on which fine realized": "Fine_Realised_Date",
}


def _calculation_rules(fields):
    """Standard wage-register arithmetic, enabled only for the fields present."""
    rules = []
    if {"daysWorked", "dailyRate", "grossWages"} <= fields:
        rules.append(("grossWages", "Gross wages", "daysWorked * dailyRate"))
    if {"grossWages", "totalDeductions", "netSalary"} <= fields:
        rules.append(("netSalary", "Net amount paid", "grossWages - totalDeductions"))
    if {"otHours", "otRate", "otEarnings"} <= fields:
        rules.append(("otEarnings", "Overtime wages", "otHours * otRate"))
    return rules


class Command(BaseCommand):
    help = "Seed admin register field mappings + calculation rules (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Overwrite existing mappings/rules for the seeded columns.")

    def handle(self, *args, **options):
        reset = options["reset"]
        mappings_created = mappings_updated = rules_created = rules_updated = 0
        mandatory_marked = 0

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
            canonical = {HEADER_ALIASES.get(str(v).lower(), v) for v in mapped.values()}
            for target, label, formula in _calculation_rules(canonical):
                rule = existing_rules.get(target)
                if rule is None:
                    RegisterCalculationRule.objects.create(
                        template=template, target_field=target, label=label, formula=formula)
                    rules_created += 1
                elif reset and (rule.formula != formula or rule.label != label):
                    rule.formula, rule.label = formula, label
                    rule.save(update_fields=["formula", "label"])
                    rules_updated += 1

            # Mark the standard statutory registers as Mandatory (admin-editable).
            if not template.is_mandatory and _form_roman(template.form_code) in MANDATORY_FORMS:
                template.is_mandatory = True
                template.save(update_fields=["is_mandatory"])
                mandatory_marked += 1

        self.stdout.write(self.style.SUCCESS(
            f"Register config seeded — mappings: {mappings_created} new / "
            f"{mappings_updated} updated · rules: {rules_created} new / "
            f"{rules_updated} updated · mandatory marked: {mandatory_marked}"))
