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


def build_workbook(rows, *, contractor="", site="", site_code="", state="",
                   financial_year="", month="", year="", registers=None,
                   generated_on=""):
    """Return the bytes of an XLSX workbook: cover sheet + one sheet per register."""
    registers = list(registers or [])
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
        ("Registers generated", str(len(registers))),
        ("Generated on", generated_on),
    ]
    for i, (label, value) in enumerate(meta, start=3):
        cover.cell(row=i, column=1, value=label).font = Font(bold=True)
        cover.cell(row=i, column=2, value=value)

    header_fill = PatternFill("solid", fgColor="0A192F")
    header_font = Font(bold=True, color="FFFFFF")
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
