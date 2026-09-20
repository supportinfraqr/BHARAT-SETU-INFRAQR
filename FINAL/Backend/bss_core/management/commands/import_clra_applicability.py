"""Import the PAN-India CLRA applicability matrix.

Reads ``State wise form of CLRA.xls`` from the template archive and populates:
  * ``StateCode``               — state / UT 2-letter codes + LWF / NH-FH flags
  * ``StateFormApplicability``  — state + purpose → applicable form (+ strength
                                  thresholds, PT frequency, LWF/HRA/NH-FH)
  * ``StateFeeMaster``          — security fee per employee / government fees
and marks ``RegisterTemplate.format_available`` for the states the matrix lists
as having no official register format.

Usage:
    python manage.py import_clra_applicability
    python manage.py import_clra_applicability --zip "/path/…(3).zip"
"""

import os
import re
import zipfile

from django.core.management.base import BaseCommand, CommandError

DEFAULT_ZIP = ("/home/yasser/BSS_Project/FINAL/Requirements/"
               "CLRA Registers PAN India (3).zip")
MATRIX_FILE = "State wise form of  CLRA.xls"

# Matrix spelling → the name used by RegisterTemplate / Site.state.
STATE_ALIASES = {
    "uttarakhand": "Uttrakhand",
    "chhattisgarh": "Chattisgarh",
    "dadra and nagar haveli": "Dadra & Nagar Haveli",
}
# Forms-sheet header cells that are not 2-letter codes.
HEADER_STATES = {
    "CENTRAL": "Central",
    "NEW FORMS CENTRAL": "Central (New Forms)",
    "TELENGANA": "Telengana",
    "GOA": "Goa",
    "J&K": "Jammu & Kashmir",
}
NO_FORMAT_STATES = ["Arunachal Pradesh", "Jammu & Kashmir", "Manipur", "Meghalaya",
                    "Mizoram", "Nagaland", "Rajasthan", "Sikkim", "Tripura"]
NOTE_MARKERS = ("format not available", "wage register-cum-musterroll",
                "maharastra-form 2")

_ROMAN = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
          (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]


def _clean(value):
    return re.sub(r"\s+", " ", str(value if value is not None else "").strip())


def _to_roman(number):
    out = ""
    for value, symbol in _ROMAN:
        while number >= value:
            out += symbol
            number -= value
    return out


def canonical_state(name):
    """Normalise a matrix state name to the RegisterTemplate/Site spelling."""
    text = _clean(name)
    return STATE_ALIASES.get(text.lower(), text)


def norm_form(label):
    """Normalise a form label so it matches RegisterTemplate.form_code.

    'Form 4' / 'Form IV' -> 'FORM IV'; 'Form 6A' / 'FORM VIA' -> 'FORM VI-A'."""
    text = _clean(label).upper()
    if not text or not text.startswith("FORM"):
        return text
    rest = text[4:].strip()
    match = re.match(r"^([IVXLCDM]+|[0-9]+)\s*[-–]?\s*([A-Z])?$", rest)
    if not match:
        return text
    number, suffix = match.group(1), match.group(2)
    roman = _to_roman(int(number)) if number.isdigit() else number
    return f"FORM {roman}" + (f"-{suffix}" if suffix else "")


def _sheet_rows(sheet):
    return [[sheet.cell_value(r, c) for c in range(sheet.ncols)]
            for r in range(sheet.nrows)]


class Command(BaseCommand):
    help = "Import the CLRA state-wise applicability matrix."

    def add_arguments(self, parser):
        parser.add_argument("--zip", dest="zip_path", default=DEFAULT_ZIP)
        parser.add_argument("--only-if-empty", dest="only_if_empty", action="store_true",
                            help="Skip the import when the applicability matrix already exists.")

    def handle(self, *args, **options):
        import xlrd
        from bss_core.models import (RegisterTemplate, StateCode,
                                     StateFormApplicability, StateFeeMaster)

        if options.get("only_if_empty") and StateFormApplicability.objects.exists():
            self.stdout.write("CLRA applicability already present — import skipped.")
            return

        zip_path = options["zip_path"]
        if not os.path.exists(zip_path):
            raise CommandError(f"Template archive not found: {zip_path}")
        with zipfile.ZipFile(zip_path) as archive:
            matches = [n for n in archive.namelist() if n.endswith(MATRIX_FILE)]
            if not matches:
                raise CommandError(f"{MATRIX_FILE} not found in {zip_path}")
            book = xlrd.open_workbook(file_contents=archive.read(matches[0]))

        # ── State & State code ────────────────────────────────────────────
        code_to_state = {}
        state_codes = 0
        if "State & State code" in book.sheet_names():
            sheet = book.sheet_by_name("State & State code")
            for row in _sheet_rows(sheet):
                cells = [_clean(c) for c in row]
                name = next((c for c in cells if c and not c.replace(".", "").isdigit()
                             and c not in ("State", "LWF", "NH/FH")), "")
                if not name or name in ("Union Territory",):
                    continue
                code = next((c for c in cells if re.fullmatch(r"[A-Za-z]{2}", c)), "")
                if not code:
                    continue
                canonical = canonical_state(name)
                is_ut = canonical in ("Chandigarh", "Delhi", "Pondicherry", "Daman & Diu",
                                      "Dadra & Nagar Haveli", "Andaman & Nicobar",
                                      "Lakshadweep")
                lwf = "Yes" if any(c.upper() == "YES" for c in cells) else (
                    "No" if any(c.upper() == "N" for c in cells) else "")
                StateCode.objects.update_or_create(
                    state=canonical,
                    defaults={"code": code.upper(), "is_union_territory": is_ut,
                              "lwf": lwf, "nh_fh": ""})
                code_to_state[code.upper()] = canonical
                state_codes += 1

        # ── Forms matrix ──────────────────────────────────────────────────
        def resolve_header(cell):
            text = _clean(cell)
            upper = text.upper()
            if upper in HEADER_STATES:
                return canonical_state(HEADER_STATES[upper])
            if upper in code_to_state:
                return code_to_state[upper]
            return canonical_state(text) if text and text.lower() != "formats" else ""

        purposes = 0
        StateFormApplicability.objects.all().delete()
        sheet = book.sheet_by_name("Forms")
        rows = _sheet_rows(sheet)
        header = [resolve_header(c) for c in rows[1]] if len(rows) > 1 else []
        strength_rc = [_clean(c) for c in rows[2]] if len(rows) > 2 else []
        strength_lic = [_clean(c) for c in rows[3]] if len(rows) > 3 else []
        for row in rows[4:]:
            purpose = _clean(row[0]) if row else ""
            # The purposes end where the footnote block begins.
            if any(m in purpose.lower() for m in NOTE_MARKERS):
                break
            if not purpose or purpose.lower() == "formats":
                continue
            for col, state in enumerate(header):
                if not state:
                    continue
                label = norm_form(row[col]) if col < len(row) else ""
                StateFormApplicability.objects.update_or_create(
                    state=state, purpose=purpose[:160],
                    defaults={
                        "form_label": label[:80],
                        "strength_rc_pe": (strength_rc[col] if col < len(strength_rc) else "")[:40],
                        "strength_licence": (strength_lic[col] if col < len(strength_lic) else "")[:40],
                    })
                purposes += 1

        # ── Fees ──────────────────────────────────────────────────────────
        fee_rows = 0
        for sheet_name in ("Forms (2)", "Forms"):
            if sheet_name not in book.sheet_names():
                continue
            frows = _sheet_rows(book.sheet_by_name(sheet_name))
            fheader = [resolve_header(c) for c in frows[1]] if len(frows) > 1 else []
            for row in frows:
                label = _clean(row[0]).lower() if row else ""
                if label not in ("security fees per employee", "govt fees"):
                    continue
                field = ("security_fee_per_employee" if "security" in label else "govt_fees")
                for col, state in enumerate(fheader):
                    if not state or col >= len(row):
                        continue
                    value = _clean(row[col])
                    if not value:
                        continue
                    StateFeeMaster.objects.update_or_create(
                        state=state, defaults={field: value[:80]})
                    fee_rows += 1

        # ── Flag the states with no official format ───────────────────────
        flagged = RegisterTemplate.objects.filter(
            state__in=[canonical_state(s) for s in NO_FORMAT_STATES]
        ).update(format_available=False)
        RegisterTemplate.objects.exclude(
            state__in=[canonical_state(s) for s in NO_FORMAT_STATES]
        ).update(format_available=True)

        self.stdout.write(self.style.SUCCESS(
            f"Applicability: {state_codes} state codes, {purposes} matrix rows, "
            f"{fee_rows} fee rows; {flagged} template(s) flagged 'no format'. "
            f"Totals — codes {StateCode.objects.count()}, "
            f"applicability {StateFormApplicability.objects.count()}, "
            f"fees {StateFeeMaster.objects.count()}."))
