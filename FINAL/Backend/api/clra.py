"""CLRA statutory-register generation.

Parses the contractor's uploaded master file (CSV/XLSX) and builds a statutory
register workbook — a cover sheet plus one sheet per applicable register form
(Form XVI Muster Roll, Form XVII Wages Register, …) filled from the master rows.
The workbook is stored on the ``ComplianceBatch`` and downloadable.

The runtime image has ``openpyxl`` (XLSX); legacy ``.xls`` needs ``xlrd`` and is
reported as unsupported if it is not installed.
"""

import csv
import io
import re
from html import unescape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

from .master_sheet import MASTER_COLUMNS, MASTER_FIELD_KEYS, MASTER_HEADER_KEYS

# Master-file header → canonical key. Extra human aliases plus every audited
# master-sheet column (ContractorMasterSheet_Audit (28).xlsx → master_sheet.py).
HEADER_ALIASES = {
    "bssid": "bssId", "bss id": "bssId", "bss worker id": "bssId",
    "worker id": "bssId",
    "name": "name", "worker name": "name", "name as per aadhaar": "name",
    "site": "site", "site name": "site",
    "location": "location", "site location": "location",
    "designation": "designation", "job role / designation": "designation",
    "department": "department",
    "mobile": "mobile", "mobile number": "mobile",
    "doj": "doj", "date of joining": "doj",
}
HEADER_ALIASES.update({header.lower(): key for header, key in MASTER_HEADER_KEYS.items()})

# Columns written for every register sheet (a generic statutory register layout).
REGISTER_COLUMNS = [
    ("Sl No.", "sl"),
    ("Name of Workman", "name"),
    ("BSS ID", "bssId"),
    ("Designation", "designation"),
    ("Department", "department"),
    ("Site", "site"),
    ("Location", "location"),
    ("Mobile", "mobile"),
    ("Remarks", ""),
]


class MasterFileError(Exception):
    pass


def _norm(value):
    return str(value or "").strip()


def _key(header):
    h = _norm(header).lower()
    return HEADER_ALIASES.get(h, h)


def parse_master(file_obj):
    """Return a list of dict rows from a CSV/XLSX master file."""
    name = (getattr(file_obj, "name", "") or "").lower()
    raw = file_obj.read()
    if name.endswith((".xlsx", ".xlsm")):
        return _parse_xlsx(raw)
    if name.endswith(".xls"):
        raise MasterFileError(
            "Legacy .xls files are not supported — save the master file as .xlsx or .csv.")
    return _parse_csv(raw)


def _parse_xlsx(raw):
    from openpyxl import load_workbook
    try:
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise MasterFileError(f"Could not read the master workbook: {exc}") from exc
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    header = [_norm(c) for c in rows[0]]
    out = []
    for values in rows[1:]:
        row = {_key(h): _norm(v) for h, v in zip(header, values) if h}
        if any(row.values()):
            out.append(row)
    return out


def _parse_csv(raw):
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    header = None
    out = []
    for line in reader:
        if header is None:
            header = [_norm(c) for c in line]
            continue
        row = {_key(h): _norm(v) for h, v in zip(header, line) if h}
        if any(row.values()):
            out.append(row)
    return out


def _bold(ws, cell, size=11):
    ws[cell].font = Font(bold=True, size=size)


# Template column label → canonical master-file key (best-effort fuzzy match).
_COLUMN_RULES = (
    (("sl", "no"), "sl"),
    (("serial",), "sl"),
    (("father",), "fatherName"),
    (("husband",), "fatherName"),
    (("spouse",), "fatherName"),
    (("sex",), "gender"),
    (("gender",), "gender"),
    (("name",), "name"),
    (("designation",), "designation"),
    (("nature of employment",), "designation"),
    (("nature of work",), "designation"),
    (("department",), "department"),
    (("date of joining",), "doj"),
    (("joining",), "doj"),
    (("mobile",), "mobile"),
    (("contact",), "mobile"),
    (("site",), "site"),
    (("location",), "location"),
    (("bss",), "bssId"),
    (("employee", "code"), "bssId"),
    (("employee", "id"), "bssId"),
    # Attendance / wage / overtime / deduction columns → master-file keys.
    (("overtime", "hour"), "otHours"),
    (("overtime", "rate"), "otRate"),
    (("overtime", "wage"), "otEarnings"),
    (("overtime", "amount"), "otEarnings"),
    (("overtime", "earning"), "otEarnings"),
    (("days", "worked"), "daysWorked"),
    (("days", "present"), "daysWorked"),
    (("daily", "rate"), "dailyRate"),
    (("rate", "wage"), "dailyRate"),
    (("basic", "wage"), "basicWages"),
    (("basic",), "basicWages"),
    (("gross", "wage"), "grossWages"),
    (("wages earned",), "grossWages"),
    (("amount of wages",), "grossWages"),
    (("deduction",), "totalDeductions"),
    (("net",), "netSalary"),
)


def match_column(label):
    """Map a register-template column label to a master-file key ('' if none)."""
    text = " ".join(str(label or "").lower().split())
    if not text:
        return ""
    for needles, key in _COLUMN_RULES:
        if all(n in text for n in needles):
            return key
    return ""


MASTER_TEMPLATE_COLUMNS = MASTER_COLUMNS


# ── admin-configured field mapping + calculation rules ──────────────────────
_FORMULA_RE = re.compile(r"^[A-Za-z0-9_+\-*/(). ]+$")


def _to_num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def eval_formula(formula, values):
    """Evaluate a simple arithmetic formula against a row's field values.

    Only digits, operators, parentheses and field identifiers are permitted, so
    an admin-authored formula cannot execute anything but arithmetic."""
    if not formula or not _FORMULA_RE.match(str(formula)):
        return None
    try:
        return eval(str(formula), {"__builtins__": {}},
                    {k: _to_num(v) for k, v in (values or {}).items()})
    except Exception:  # noqa: BLE001 — a bad formula just yields no value
        return None


def apply_calculation_rules(rows, rules):
    """Apply admin calculation rules to each row, adding the computed values
    under the rule's ``targetField`` so columns/placeholders can reference them."""
    rules = [r for r in (rules or []) if r.get("formula") and r.get("targetField")]
    if not rules:
        return rows
    out = []
    for row in rows:
        enriched = dict(row)
        values = dict(row)
        for rule in rules:
            result = eval_formula(rule["formula"], values)
            if result is not None:
                enriched[rule["targetField"]] = round(result, 2)
                values[rule["targetField"]] = result
        out.append(enriched)
    return out


# ── cell resolution (master-file field vs backend context) ───────────────────
# A mapping key is either a master-file field key (read from the parsed row),
# "sl" (row serial), or "backend:<key>" (a value from the render context).
_BACKEND_CONTEXT_KEYS = {
    "contractor": "contractor", "employer": "employer",
    "site": "site", "siteCode": "site_code", "state": "state",
    "month": "month", "year": "year", "financialYear": "financial_year",
    "recordCount": "record_count", "generatedOn": "generated_on",
}


def backend_context(**kwargs):
    """Normalise the render context used to resolve ``backend:`` mapping keys."""
    return {key: kwargs.get(source, "") for key, source in _BACKEND_CONTEXT_KEYS.items()}


def resolve_cell(key, row, context=None, index=None):
    """Resolve one mapped column/field to a value.

    ``sl`` -> row serial; ``backend:<key>`` -> backend context value; otherwise
    the master-file field value from the row. Returns ``None`` only for blanks."""
    if key == "sl":
        return index
    if key and key.startswith("backend:"):
        return (context or {}).get(key.split(":", 1)[1], "")
    if key:
        # Accept both the canonical row key (bssId) and the master-sheet column
        # header (Employee_Code): HEADER_ALIASES maps header -> canonical key.
        return row.get(key, row.get(HEADER_ALIASES.get(str(key).lower(), ""), ""))
    return ""


# ── frequency / reporting period ─────────────────────────────────────────────
# Indian financial year runs April → March.
MONTHS_FY = ["April", "May", "June", "July", "August", "September",
             "October", "November", "December", "January", "February", "March"]
_CAL_MONTH = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
              "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}


def _fy_label(month, year):
    try:
        y = int(str(year).strip())
    except (TypeError, ValueError):
        return f"{year}-?"
    start = y - 1 if month in ("January", "February", "March") else y
    return f"{start}-{str(start + 1)[-2:]}"


def _last_day(year, cal_month):
    from datetime import date, timedelta
    if cal_month == 12:
        return date(year, 12, 31)
    return date(year, cal_month + 1, 1) - timedelta(days=1)


def reporting_period(month, year, frequency, today=None):
    """Return ``{label, due, periodEnd}`` for a frequency, decided by the
    **current date** (``today``).

    - **Monthly** (and blank/unknown): due every time; period = the month.
    - **Quarterly / Half-Yearly / Yearly**: due only once the period has ended
      on or before today (so a Yearly form auto-generates once, after the FY
      closes — March year-end)."""
    from datetime import date
    today = today or date.today()
    month = str(month or "").strip()
    try:
        y = int(str(year).strip())
    except (TypeError, ValueError):
        y = None
    if month not in MONTHS_FY or y is None:
        return {"label": f"{month} {year}".strip(), "due": True, "periodEnd": ""}

    fy = _fy_label(month, year)
    idx = MONTHS_FY.index(month)          # 0 = April … 11 = March
    fy_start = y - 1 if idx >= 9 else y   # calendar year the FY starts
    freq = str(frequency or "").strip().lower()

    if freq.startswith("quarter"):
        end_idx = ((idx // 3) + 1) * 3 - 1
        label = f"Q{idx // 3 + 1} {fy}"
    elif freq.startswith("half"):
        end_idx = 5 if idx < 6 else 11
        label = f"H{1 if idx < 6 else 2} {fy}"
    elif freq.startswith(("year", "annual")):
        end_idx = 11
        label = f"FY {fy}"
    else:
        return {"label": f"{month} {y}", "due": True, "periodEnd": ""}

    end_year = fy_start + (1 if end_idx >= 9 else 0)
    end_date = _last_day(end_year, _CAL_MONTH[MONTHS_FY[end_idx]])
    return {"label": label, "due": today >= end_date, "periodEnd": end_date.isoformat()}


# ── master-file validation ───────────────────────────────────────────────────
REQUIRED_KEYS = ("name", "site")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$|^\d{2}[/-]\d{2}[/-]\d{4}$")
_BSS_RE = re.compile(r"^BSS[-A-Za-z0-9]{6,}$")
_NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")
_NUMERIC_KEYS = ("daysWorked", "grossWages", "totalDeductions", "netSalary",
                 "otHours", "otRate", "otEarnings", "basicWages")


def validate_master(rows, *, state="", month="", year=""):
    """Validate parsed master-file rows. Returns a structured report.

    ``errors`` block generation; ``warnings`` are advisory."""
    errors = []
    warnings = []
    if not rows:
        errors.append({"row": 0, "field": "", "message": "The file has no data rows."})
        return {"errors": errors, "warnings": warnings, "rowCount": 0, "validRows": 0,
                "siteCount": 0, "locationCount": 0, "sites": []}

    present = set()
    for row in rows:
        present.update(k for k, v in row.items() if v)
    for key in REQUIRED_KEYS:
        if key not in present:
            errors.append({"row": 0, "field": key,
                           "message": f"Required column '{key}' is missing or blank in every row."})

    seen_codes = {}
    seen_names = {}
    valid_rows = 0
    for index, row in enumerate(rows, start=1):
        name = (row.get("name") or "").strip()
        site = (row.get("site") or "").strip()
        if not name:
            errors.append({"row": index, "field": "name", "message": "Name is blank."})
        if not site:
            errors.append({"row": index, "field": "site", "message": "Site is blank."})
        code = (row.get("bssId") or "").strip()
        if not code:
            warnings.append({"row": index, "field": "bssId", "message": "BSS ID is blank."})
        elif not _BSS_RE.match(code):
            errors.append({"row": index, "field": "bssId",
                           "message": f"'{code}' is not a valid BSS ID."})
        doj = (row.get("doj") or "").strip()
        if doj and not _DATE_RE.match(doj):
            warnings.append({"row": index, "field": "doj",
                             "message": f"Date '{doj}' is not YYYY-MM-DD or DD/MM/YYYY."})
        for nkey in _NUMERIC_KEYS:
            val = str(row.get(nkey) or "").strip()
            if val and not _NUM_RE.match(val):
                warnings.append({"row": index, "field": nkey,
                                 "message": f"'{val}' is not a valid number."})
        if code:
            if code in seen_codes:
                errors.append({"row": index, "field": "bssId",
                               "message": f"Duplicate BSS ID '{code}' (also row {seen_codes[code]})."})
            else:
                seen_codes[code] = index
        name_key = f"{name}|{site}".lower()
        if name and site:
            if name_key in seen_names:
                warnings.append({"row": index, "field": "name",
                                 "message": f"Possible duplicate of '{name}' at {site} (row {seen_names[name_key]})."})
            else:
                seen_names[name_key] = index
            valid_rows += 1

    if not state:
        warnings.append({"row": 0, "field": "state", "message": "No state selected — templates cannot be matched."})
    if not year:
        warnings.append({"row": 0, "field": "year", "message": "No year selected."})
    if not month:
        warnings.append({"row": 0, "field": "month", "message": "No month selected."})

    sites = sorted({(r.get("site") or "").strip() for r in rows if (r.get("site") or "").strip()})
    locations = sorted({(r.get("location") or "").strip() for r in rows if (r.get("location") or "").strip()})
    # One master file = one site. CLRA registers are generated per site, so a
    # file mixing sites is rejected.
    if len(sites) > 1:
        shown = ", ".join(sites[:6]) + ("…" if len(sites) > 6 else "")
        errors.append({"row": 0, "field": "site",
                       "message": f"The master file contains {len(sites)} sites ({shown}). "
                                  "Upload one site per file — CLRA registers are generated per site."})
    return {
        "errors": errors, "warnings": warnings,
        "rowCount": len(rows), "validRows": valid_rows,
        "siteCount": len(sites), "locationCount": len(locations) or 1,
        "sites": sites[:200],
    }


def build_master_template():
    """Return the bytes of the standard CLRA master-file upload template."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Master"
    for col, label in enumerate(MASTER_TEMPLATE_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col, value=label)
        cell.font = Font(bold=True)
        ws.column_dimensions[cell.column_letter].width = max(14, len(label) + 4)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


_DOC_P_RE = re.compile(r"<p\b[^>]*>(.*?)</p>", re.S | re.I)
# Any header line (title/secondary/paragraph) — h1/h2/p in document order.
_DOC_LINE_RE = re.compile(r"<(h1|h2|p)\b[^>]*>(.*?)</\1>", re.S | re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_META_TOKEN_SOURCES = {
    "CONTRACTOR_NAME": "contractor", "EMPLOYER_NAME": "employer",
    "SITE_NAME": "site", "SITE_CODE": "siteCode", "STATE": "state",
    "MONTH": "month", "YEAR": "year", "FINANCIAL_YEAR": "financialYear",
    "GENERATED_ON": "generatedOn", "RECORD_COUNT": "recordCount",
}


def _header_lines_from_html(html_text, template, rows, context):
    """Header lines (``<h1>``/``<h2>``/``<p>`` before the first table) as plain
    text, with data placeholders resolved — so the register's printed preamble
    (title, ``[See rule …]``, Key:value header lines) appears in the generated
    Excel register exactly as in the source, with nothing extra added."""
    if not html_text:
        return []
    text = str(html_text)
    table_idx = text.lower().find("<table")
    head = text[:table_idx] if table_idx != -1 else text
    lines = []
    for match in _DOC_LINE_RE.finditer(head):
        inner = render_doc_body(match.group(2), rows, context)
        for token, source in _META_TOKEN_SOURCES.items():
            inner = inner.replace("{{" + token + "}}", str((context or {}).get(source, "")))
        inner = inner.replace("{{ACT}}", str(template.get("act", "")))
        inner = inner.replace("{{TITLE}}", str(template.get("title", "")))
        inner = inner.replace("{{FORM_CODE}}", str(template.get("formCode", "")))
        plain = _TAG_RE.sub("", inner)
        plain = re.sub(r"\s+", " ", unescape(plain).replace("\xa0", " ")).strip()
        if plain and re.search(r"[A-Za-z0-9]", plain):
            lines.append(plain)
    return lines


def _footer_lines_from_html(html_text, template, rows, context):
    """Authored footer ``<p>`` lines (after the last table) as plain text, with
    data placeholders resolved — so a register's declaration (e.g. "There is no
    deduction for damage or Loss during the month of …") appears at the bottom of
    the generated Excel register, with the period tokens filled in."""
    if not html_text:
        return []
    text = str(html_text)
    idx = text.lower().rfind("</table>")
    tail = text[idx + len("</table>"):] if idx != -1 else ""
    lines = []
    for match in _DOC_P_RE.finditer(tail):
        inner = render_doc_body(match.group(1), rows, context)
        for token, source in _META_TOKEN_SOURCES.items():
            inner = inner.replace("{{" + token + "}}", str((context or {}).get(source, "")))
        inner = inner.replace("{{ACT}}", str(template.get("act", "")))
        inner = inner.replace("{{TITLE}}", str(template.get("title", "")))
        inner = inner.replace("{{FORM_CODE}}", str(template.get("formCode", "")))
        plain = _TAG_RE.sub("", inner)
        plain = re.sub(r"\s+", " ", unescape(plain).replace("\xa0", " ")).strip()
        if plain and re.search(r"[A-Za-z0-9]", plain):
            lines.append(plain)
    return lines


def _write_template_sheet(wb, template, rows, context=None):
    columns = [str(c) for c in (template.get("columns") or [])]
    if not columns:
        columns = [label for label, _ in REGISTER_COLUMNS]
    title = (template.get("title") or template.get("formCode") or "Register")[:31]
    ws = wb.create_sheet(title=title)
    field_mappings = template.get("fieldMappings") or {}
    mapping = [(field_mappings.get(col) or match_column(col)) for col in columns]
    rows = apply_calculation_rules(rows, template.get("calculationRules"))

    # Faithful source layout: the register's own printed preamble (title, [See
    # rule …], Key:value header lines) then the data grid. No added title/form/
    # state rows, no branding, no dates — nothing the source doesn't have.
    header_lines = _header_lines_from_html(template.get("html"), template, rows, context)
    row_cursor = 1
    for line in header_lines:
        ws.cell(row=row_cursor, column=1, value=line).font = Font(size=10)
        if len(columns) > 1:
            ws.merge_cells(start_row=row_cursor, start_column=1,
                           end_row=row_cursor, end_column=len(columns))
        row_cursor += 1
    table_row = row_cursor

    for col, label in enumerate(columns, start=1):
        cell = ws.cell(row=table_row, column=col, value=label)
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
    for i, row in enumerate(rows, start=1):
        for col, key in enumerate(mapping, start=1):
            value = resolve_cell(key, row, context, index=i)
            if value is not None:
                ws.cell(row=table_row + i, column=col, value=value)
    # Declaration / footer lines (e.g. "No fine imposed during the month of …")
    # rendered below the table with the period tokens resolved.
    footer_cursor = table_row + len(rows) + 1
    for line in _footer_lines_from_html(template.get("html"), template, rows, context):
        cell = ws.cell(row=footer_cursor, column=1, value=line)
        cell.font = Font(size=10, italic=True)
        if len(columns) > 1:
            ws.merge_cells(start_row=footer_cursor, start_column=1,
                           end_row=footer_cursor, end_column=len(columns))
        footer_cursor += 1
    return ws


def build_register_workbook(template, rows, context=None):
    """Return the bytes of a single-register XLSX (honours admin field mapping
    and calculation rules)."""
    wb = Workbook()
    wb.remove(wb.active)
    _write_template_sheet(wb, template, rows, context)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def build_workbook(rows, *, contractor="", employer="", site="", site_code="", state="",
                   financial_year="", month="", year="", registers=None,
                   generated_on="", templates=None):
    """Return the bytes of an XLSX workbook: cover sheet + one sheet per register.

    When ``templates`` (the State+Form register templates) are supplied, each
    sheet uses that template's parsed column schema and the master rows are
    mapped onto it; otherwise the generic ``REGISTER_COLUMNS`` layout is used."""
    registers = list(registers or [])
    templates = list(templates or [])
    wb = Workbook()

    if templates:
        # CLRA registers render exactly like the source: one sheet per register
        # with its printed preamble + data grid only — no cover sheet, no added
        # title/form/state rows, no branding or dates.
        wb.remove(wb.active)
        context = backend_context(
            contractor=contractor, employer=employer, site=site, site_code=site_code, state=state,
            month=month, year=year, financial_year=financial_year,
            record_count=len(rows), generated_on=generated_on)
        for template in templates:
            # Register-style templates (with parsed columns) become sheets;
            # form-style templates (no columns) render to PDF, not Excel.
            if not template.get("columns"):
                continue
            _write_template_sheet(wb, template, rows, context)
        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    cover = wb.active
    cover.title = "Cover"
    cover.column_dimensions["A"].width = 28
    cover.column_dimensions["B"].width = 46
    cover["A1"] = "Contract Labour (Regulation & Abolition) — Statutory Registers"
    _bold(cover, "A1", 14)
    meta = [
        ("Contractor", contractor),
        ("Principal Employer / Site", site),
        ("Site Code", site_code),
        ("State", state),
        ("Financial Year", financial_year),
        ("Wage Period", f"{month} {year}".strip()),
        ("Workers", str(len(rows))),
        ("Registers generated", str(len(templates) or len(registers))),
        ("Generated on", generated_on),
    ]
    for i, (label, value) in enumerate(meta, start=3):
        cover.cell(row=i, column=1, value=label).font = Font(bold=True)
        cover.cell(row=i, column=2, value=value)

    for reg in registers:
        title = reg.get("formNo") or reg.get("name") or "Register"
        ws = wb.create_sheet(title=str(title)[:31])
        ws["A1"] = reg.get("name") or title
        _bold(ws, "A1", 12)
        ws["A2"] = f"Form: {reg.get('formNo', '')}    Frequency: {reg.get('frequency', '')}"
        for col, (label, _) in enumerate(REGISTER_COLUMNS, start=1):
            cell = ws.cell(row=4, column=col, value=label)
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center")
        for i, row in enumerate(rows, start=1):
            ws.cell(row=4 + i, column=1, value=i)
            for col, (_, key) in enumerate(REGISTER_COLUMNS, start=1):
                if key:
                    ws.cell(row=4 + i, column=col, value=row.get(key, ""))

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _esc(value):
    return (str(value if value is not None else "")
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


_DOC_BLOCK_RE = re.compile(r"\{\{#\s*rows\s*\}\}(.*?)\{\{\s*/\s*rows\s*\}\}", re.S | re.I)
_DOC_FIELD_RE = re.compile(r"\{\{\s*(sys\.[A-Za-z0-9_]+|[A-Za-z_][A-Za-z0-9_]*)\s*\}\}")


def render_doc_body(body, rows, context):
    """Resolve a free-form Doc / Google-Docs layout.

    * ``{{#rows}} … {{/rows}}`` repeats the block once per master-file row; inside
      it ``{{fieldKey}}`` reads that row (master-file parser data).
    * ``{{sys.key}}`` reads the system/backend context (contractor, site, month…).
    * a bare ``{{fieldKey}}`` outside a block reads the first row.
    * UPPERCASE ``{{TOKENS}}`` are left untouched for the header-token pass."""
    rows = list(rows or [])

    def resolve(key, row):
        if key.startswith("sys."):
            return _esc(str((context or {}).get(key[4:], "")))
        # Master-sheet header (Employee_Code) and canonical key (bssId) both work.
        return _esc(str((row or {}).get(
            key, (row or {}).get(HEADER_ALIASES.get(str(key).lower(), ""), ""))))

    def block(match):
        inner = match.group(1)
        if not rows:
            return _DOC_FIELD_RE.sub("", inner)
        return "".join(
            _DOC_FIELD_RE.sub(lambda f: resolve(f.group(1), row), inner)
            for row in rows)

    out = _DOC_BLOCK_RE.sub(block, body)
    first = rows[0] if rows else {}

    def field(match):
        key = match.group(1)
        if key.isupper():
            return match.group(0)
        return resolve(key, first)

    return _DOC_FIELD_RE.sub(field, out)


def render_register_html(template, rows, *, contractor="", employer="", site="", site_code="",
                         state="", month="", year="", financial_year="", generated_on=""):
    """Render one State+Form register.

    If the admin authored an HTML layout (`template['html']`) it is used, with
    ``{{TOKENS}}`` for the header/meta and ``{{HEAD}}`` / ``{{ROWS}}`` for the
    data table. Otherwise a plain columns-based table is generated.

    Per-row documents (`template['perRow']`, e.g. Identity Cards / Wage Slips)
    repeat their layout once per master-file row with a page break between
    copies, so every worker gets their own document."""
    columns = [str(c) for c in (template.get("columns") or [])]
    field_mappings = template.get("fieldMappings") or {}
    mapping = [(field_mappings.get(col) or match_column(col)) for col in columns]
    rows = apply_calculation_rules(rows, template.get("calculationRules"))
    title = template.get("title") or template.get("formCode") or "Register"
    head = "".join(f"<th>{_esc(col)}</th>" for col in columns)
    context = backend_context(
        contractor=contractor, employer=employer, site=site, site_code=site_code,
        state=state, month=month, year=year, financial_year=financial_year,
        record_count=len(rows), generated_on=generated_on)
    body = []
    for index, row in enumerate(rows, start=1):
        cells = []
        for key in mapping:
            value = resolve_cell(key, row, context, index=index)
            cells.append(f"<td>{_esc('' if value is None else value)}</td>")
        body.append("<tr>" + "".join(cells) + "</tr>")

    admin_html = (template.get("html") or "").strip()
    if admin_html:
        tokens = {
            "TITLE": _esc(title), "FORM_CODE": _esc(template.get("formCode", "")),
            "STATE": _esc(template.get("state", "")), "CONTRACTOR_NAME": _esc(contractor),
            "EMPLOYER_NAME": _esc(employer), "SITE_NAME": _esc(site), "SITE_CODE": _esc(site_code),
            "MONTH": _esc(month), "YEAR": _esc(year), "FINANCIAL_YEAR": _esc(financial_year),
            "GENERATED_ON": _esc(generated_on), "RECORD_COUNT": str(len(rows)),
            "ACT": _esc(template.get("act", "")),
            "HEAD": head, "ROWS": "".join(body),
        }
        if template.get("perRow") and not _DOC_BLOCK_RE.search(admin_html):
            inner = _DOC_BLOCK_RE.sub("", admin_html)
            admin_html = (f"{{{{#rows}}}}\n{inner}\n"
                          f'<div style="page-break-after:always" aria-hidden="true"></div>\n{{{{/rows}}}}')
        out = render_doc_body(admin_html, rows, context)
        for key, value in tokens.items():
            out = out.replace("{{" + key + "}}", value).replace("{{ " + key + " }}", value)
        return out

    meta = [
        ("Contractor", contractor), ("Site", site), ("Site Code", site_code),
        ("State", state), ("Financial Year", financial_year),
        ("Wage Period", f"{month} {year}".strip()),
    ]
    meta_html = "".join(f"<div><span>{_esc(k)}</span><strong>{_esc(v)}</strong></div>"
                        for k, v in meta if v)
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{_esc(title)}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }}
  h1 {{ font-size: 16px; margin: 0 0 2px; }}
  .sub {{ font-size: 11px; color: #555; margin-bottom: 12px; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 6px 24px; font-size: 11px; margin-bottom: 12px; }}
  .meta span {{ color: #666; margin-right: 4px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 10px; }}
  th, td {{ border: 1px solid #999; padding: 4px 5px; text-align: left; vertical-align: top; }}
  th {{ background: #0A192F; color: #fff; }}
  tbody tr:nth-child(even) {{ background: #f5f7fa; }}
  .foot {{ margin-top: 18px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }}
  @media print {{ body {{ margin: 8mm; }} }}
</style></head><body>
  <h1>{_esc(title)}</h1>
  <div class="sub">{_esc(template.get('formCode',''))} · {_esc(template.get('state',''))} · {len(rows)} record(s)</div>
  <div class="meta">{meta_html}</div>
  <table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>
  <div class="foot"><span>Generated on {_esc(generated_on)}</span><span>Signature: ____________________</span></div>
</body></html>"""
