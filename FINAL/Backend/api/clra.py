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

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

# Master-file header → canonical key.
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


MASTER_TEMPLATE_COLUMNS = ["BSS ID", "Name", "Site", "Location", "Designation",
                           "Department", "Mobile", "Date of Joining"]


# ── master-file validation ───────────────────────────────────────────────────
REQUIRED_KEYS = ("name", "site")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$|^\d{2}[/-]\d{2}[/-]\d{4}$")
_BSS_RE = re.compile(r"^(BSS-W[A-Za-z0-9]{10,11}|BSS[A-Za-z0-9]{8,})$")


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
        if code and not _BSS_RE.match(code):
            warnings.append({"row": index, "field": "bssId",
                             "message": f"'{code}' does not look like a BSS ID."})
        doj = (row.get("doj") or "").strip()
        if doj and not _DATE_RE.match(doj):
            warnings.append({"row": index, "field": "doj",
                             "message": f"Date '{doj}' is not YYYY-MM-DD or DD/MM/YYYY."})
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
    header_fill = PatternFill("solid", fgColor="0A192F")
    header_font = Font(bold=True, color="FFFFFF")
    for col, label in enumerate(MASTER_TEMPLATE_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col, value=label)
        cell.fill = header_fill
        cell.font = header_font
        ws.column_dimensions[cell.column_letter].width = max(14, len(label) + 4)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _write_template_sheet(wb, template, rows, header_fill, header_font):
    columns = [str(c) for c in (template.get("columns") or [])]
    if not columns:
        columns = [label for label, _ in REGISTER_COLUMNS]
    title = (template.get("formCode") or template.get("title") or "Register")[:31]
    ws = wb.create_sheet(title=title)
    ws["A1"] = template.get("title") or template.get("formCode") or "Register"
    _bold(ws, "A1", 12)
    ws["A2"] = (f"Form: {template.get('formCode', '')}    "
                f"State: {template.get('state', '')}")
    mapping = [match_column(col) for col in columns]
    for col, label in enumerate(columns, start=1):
        cell = ws.cell(row=4, column=col, value=label)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
    for i, row in enumerate(rows, start=1):
        for col, key in enumerate(mapping, start=1):
            if key == "sl":
                ws.cell(row=4 + i, column=col, value=i)
            elif key:
                ws.cell(row=4 + i, column=col, value=row.get(key, ""))
    return ws


def build_workbook(rows, *, contractor="", site="", site_code="", state="",
                   financial_year="", month="", year="", registers=None,
                   generated_on="", templates=None):
    """Return the bytes of an XLSX workbook: cover sheet + one sheet per register.

    When ``templates`` (the State+Form register templates) are supplied, each
    sheet uses that template's parsed column schema and the master rows are
    mapped onto it; otherwise the generic ``REGISTER_COLUMNS`` layout is used."""
    registers = list(registers or [])
    templates = list(templates or [])
    wb = Workbook()
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

    header_fill = PatternFill("solid", fgColor="0A192F")
    header_font = Font(bold=True, color="FFFFFF")
    if templates:
        for template in templates:
            _write_template_sheet(wb, template, rows, header_fill, header_font)
        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    for reg in registers:
        title = reg.get("formNo") or reg.get("name") or "Register"
        ws = wb.create_sheet(title=str(title)[:31])
        ws["A1"] = reg.get("name") or title
        _bold(ws, "A1", 12)
        ws["A2"] = f"Form: {reg.get('formNo', '')}    Frequency: {reg.get('frequency', '')}"
        for col, (label, _) in enumerate(REGISTER_COLUMNS, start=1):
            cell = ws.cell(row=4, column=col, value=label)
            cell.fill = header_fill
            cell.font = header_font
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


def render_register_html(template, rows, *, contractor="", employer="", site="", site_code="",
                         state="", month="", year="", financial_year="", generated_on=""):
    """Render one State+Form register.

    If the admin authored an HTML layout (`template['html']`) it is used, with
    ``{{TOKENS}}`` for the header/meta and ``{{HEAD}}`` / ``{{ROWS}}`` for the
    data table. Otherwise a plain columns-based table is generated."""
    columns = [str(c) for c in (template.get("columns") or [])]
    mapping = [match_column(col) for col in columns]
    title = template.get("title") or template.get("formCode") or "Register"
    head = "".join(f"<th>{_esc(col)}</th>" for col in columns)
    body = []
    for index, row in enumerate(rows, start=1):
        cells = []
        for key in mapping:
            if key == "sl":
                value = index
            elif key:
                value = row.get(key, "")
            else:
                value = ""
            cells.append(f"<td>{_esc(value)}</td>")
        body.append("<tr>" + "".join(cells) + "</tr>")

    admin_html = (template.get("html") or "").strip()
    if admin_html:
        tokens = {
            "TITLE": _esc(title), "FORM_CODE": _esc(template.get("formCode", "")),
            "STATE": _esc(template.get("state", "")), "CONTRACTOR_NAME": _esc(contractor),
            "EMPLOYER_NAME": _esc(employer), "SITE_NAME": _esc(site), "SITE_CODE": _esc(site_code),
            "MONTH": _esc(month), "YEAR": _esc(year), "FINANCIAL_YEAR": _esc(financial_year),
            "GENERATED_ON": _esc(generated_on), "RECORD_COUNT": str(len(rows)),
            "HEAD": head, "ROWS": "".join(body),
        }
        out = admin_html
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
