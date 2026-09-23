"""Render the audit report workbook from the specification data.

Phase 1 reproduces the sample workbook exactly (values + styling + merges +
column widths). Later phases override the data-bearing cells (Report Data and
the three audience reports) with results computed from live BSS data, while
keeping the same layout.
"""

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

from .spec_data import SHEETS

# Sheet names (as they appear in the sample workbook).
SHEETS_ALL = [
    "Verification Framework",
    "Classification",
    "Report Mappinhg",
    "Report Data",
    "Results Engine",
    "Sample Compliance Officer",
    "Sample Management Board",
    "Sample Auditor Report",
]

DEFAULT_FONT_SIZE = 11


def _apply_cell(cell, payload):
    if payload is None:
        return
    cell.value = payload[0]
    style = payload[1] if len(payload) > 1 else {}
    if not style:
        return
    if "fill" in style:
        cell.fill = PatternFill("solid", fgColor=style["fill"])
    cell.font = Font(
        bold=style.get("bold", False),
        color=style.get("color") or None,
        size=style.get("size", DEFAULT_FONT_SIZE),
    )
    if "align" in style:
        cell.alignment = Alignment(horizontal=style["align"], vertical="center")


def _sheet(name, overrides=None):
    payload = SHEETS.get(name)
    if payload is None:
        return None
    rows = payload["rows"]
    if overrides:
        # overrides: {row_index(1-based): {col_index(1-based): value}}
        rows = [[c for c in row] for row in rows]
        for r, cols in overrides.items():
            while len(rows) < r:
                rows.append([])
            row = rows[r - 1]
            for c, value in cols.items():
                while len(row) < c:
                    row.append(None)
                existing = row[c - 1]
                if isinstance(existing, list):
                    row[c - 1] = [value] + existing[1:]
                else:
                    row[c - 1] = [value]
    return {"rows": rows, "merges": payload["merges"], "widths": payload["widths"]}


def _write_row(ws, row_index, values, template_style=None):
    """Write a list of values into a row, preserving existing cell style when the
    cell already exists in the spec; merged (non-anchor) cells are skipped."""
    for col, value in enumerate(values, start=1):
        cell = ws.cell(row=row_index, column=col)
        try:
            cell.value = value
        except AttributeError:
            continue  # part of a merged range — only the anchor is writable
        if cell in ws.merged_cells.ranges or cell.__class__.__name__ == "MergedCell":
            continue
        # A fresh cell (beyond the spec table) inherits the template row style.
        if cell.font is None or cell.font.size is None:
            cell.font = template_style


def build_workbook(sheets=None, overrides=None, row_overrides=None):
    """Return workbook bytes.

    ``sheets`` restricts which sheets are written (default: all).
    ``overrides`` maps sheet name -> {row: {col: value}} to replace data cells
    while preserving their styling.
    ``row_overrides`` maps sheet name -> {start_row: [[values...], ...]} to write
    whole rows (used to regenerate the detailed report tables).
    """
    wb = Workbook()
    wb.remove(wb.active)
    overrides = overrides or {}
    row_overrides = row_overrides or {}
    wanted = sheets or SHEETS_ALL
    for name in wanted:
        payload = _sheet(name, overrides.get(name))
        if payload is None:
            continue
        ws = wb.create_sheet(title=name[:31])
        for r, row in enumerate(payload["rows"], start=1):
            for cidx, cell in enumerate(row, start=1):
                if cell is None:
                    continue
                _apply_cell(ws.cell(row=r, column=cidx), cell)
        for col, width in payload["widths"].items():
            ws.column_dimensions[col].width = width
        for merge in payload["merges"]:
            try:
                ws.merge_cells(merge)
            except Exception:  # a merge referencing an absent cell — skip
                pass
        for start_row, rows in (row_overrides.get(name) or {}).items():
            for offset, values in enumerate(rows):
                _write_row(ws, start_row + offset, values)
    out = BytesIO()
    wb.save(out)
    return out.getvalue()
