"""Attendance sheet (uploaded) support: build a date-range CSV template and
parse a filled sheet back into ``Attendance`` rows.

The template is keyed by **BSS ID** with one column per date in the selected
range (``YYYY-MM-DD``). Cells hold short codes:

    P  = Present      A = Absent       L = Leave
    H  = Holiday      (blank = no record for that day)

Uploaded rows are stored with ``capture_method="SHEET"`` so they are visibly
"from uploaded sheet" in the existing attendance system.
"""

import csv
import io
import re
from datetime import date, datetime, timedelta

STATUS_MAP = {
    "p": "PRESENT", "present": "PRESENT",
    "a": "ABSENT", "absent": "ABSENT",
    "l": "LEAVE", "leave": "LEAVE",
    "h": "HOLIDAY", "holiday": "HOLIDAY",
}

_DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%m-%d-%Y",
                 "%Y/%m/%d", "%d.%m.%Y", "%Y.%m.%d")
_ISO_IN_TEXT = re.compile(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})")
_DMY_IN_TEXT = re.compile(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})")


class AttendanceSheetError(Exception):
    pass


def normalize_status(value):
    """Map a cell value to an Attendance status, or ``None`` for a blank cell."""
    text = " ".join(str(value or "").split()).strip().lower()
    if not text:
        return None
    return STATUS_MAP.get(text)


def parse_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    # Extract a date embedded in a label, e.g. "Mon 2026-10-02 (Gandhi Jayanti)".
    match = _ISO_IN_TEXT.search(text)
    if match:
        try:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            return None
    match = _DMY_IN_TEXT.search(text)
    if match:
        a, b, c = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return date(c, b, a) if a <= 31 and b <= 12 else date(c, a, b)
        except ValueError:
            return None
    return None


def date_range(start, end):
    start = parse_date(start)
    end = parse_date(end)
    if start is None or end is None:
        raise AttendanceSheetError("A valid start and end date are required.")
    if end < start:
        raise AttendanceSheetError("The end date must be on or after the start date.")
    if (end - start).days > 62:
        raise AttendanceSheetError("The date range can be at most 62 days.")
    days = []
    current = start
    while current <= end:
        days.append(current)
        current += timedelta(days=1)
    return days


def build_attendance_csv(rows, start, end, holiday_names=None, weekly_off_dates=None):
    """Return CSV bytes: BSS ID | Worker Name | Site | <date columns>.

    ``holiday_names`` maps an ISO date to its holiday name; ``weekly_off_dates``
    is a set of ISO dates that are weekly offs for the site. Those columns are
    labelled (``2026-10-02 (Gandhi Jayanti)`` / ``2026-10-04 (Weekly Off)``) and
    pre-filled with ``H`` so the sheet already reflects the site calendar."""
    days = date_range(start, end)
    holiday_names = holiday_names or {}
    weekly_off_dates = weekly_off_dates or set()

    def label(d):
        # Prefix with the weekday so spreadsheets keep the header as text
        # (a bare "YYYY-MM-DD" gets reformatted and shows as ######).
        base = f"{d.strftime('%a')} {d.isoformat()}"
        iso = d.isoformat()
        if iso in holiday_names:
            return f"{base} ({holiday_names[iso]})"
        if iso in weekly_off_dates:
            return f"{base} (Weekly Off)"
        return base

    def cell_value(d):
        iso = d.isoformat()
        return "H" if (iso in holiday_names or iso in weekly_off_dates) else ""

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["BSS ID", "Worker Name", "Site"] + [label(d) for d in days])
    for row in rows or []:
        writer.writerow([str(row.get("bssId") or ""), str(row.get("name") or ""), str(row.get("site") or "")]
                        + [cell_value(d) for d in days])
    writer.writerow([])
    writer.writerow(["P=Present  A=Absent  L=Leave  H=Holiday  (blank = no record)"])
    return out.getvalue().encode("utf-8-sig")


def _parse_xlsx_rows(file_obj):
    from openpyxl import load_workbook
    raw = file_obj.read()
    try:
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    except Exception as exc:  # noqa: BLE001
        raise AttendanceSheetError(f"Could not read the attendance workbook: {exc}") from exc
    ws = wb.active
    return [list(row) for row in ws.iter_rows(values_only=True)]


def _parse_csv_rows(file_obj):
    text = file_obj.read().decode("utf-8-sig", errors="replace")
    return [row for row in csv.reader(io.StringIO(text))]


def _cell(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _header_day(value):
    """Day-of-month from a bare number header like ``1`` or ``1.0`` or ``Day 1``."""
    text = _cell(value)
    if text.isdigit():
        return int(text)
    for token in text.replace("day", " ").split():
        if token.isdigit():
            return int(token)
    return None


def parse_attendance_sheet(file_obj, start=None, end=None):
    """Parse a filled attendance sheet into rows:
    ``[{"bssId": ..., "name": ..., "days": {"2026-10-01": "PRESENT", ...}}]``.

    Column headers may be full dates (``YYYY-MM-DD`` / ``DD-MM-YYYY`` / ``DD/MM/YYYY``)
    or bare day numbers resolved against ``start``'s month."""
    name = (getattr(file_obj, "name", "") or "").lower()
    if name.endswith((".xlsx", ".xlsm")):
        raw_rows = _parse_xlsx_rows(file_obj)
    elif name.endswith(".xls"):
        raise AttendanceSheetError("Legacy .xls files are not supported — save the sheet as .csv or .xlsx.")
    else:
        raw_rows = _parse_csv_rows(file_obj)
    if not raw_rows:
        raise AttendanceSheetError("The sheet is empty.")

    start_date = parse_date(start)
    header = raw_rows[0]
    bss_col = name_col = None
    date_cols = {}       # idx -> date
    day_cols = {}        # idx -> day number (resolved against start_date)
    for idx, cell in enumerate(header):
        text = _cell(cell).lower()
        if text in ("bss id", "bssid", "bss_id") or (bss_col is None and text.startswith("bss")):
            bss_col = idx
            continue
        if "name" in text and name_col is None:
            name_col = idx
            continue
        parsed = parse_date(cell)
        if parsed is None:
            # Header may carry a label, e.g. "2026-10-02 (Gandhi Jayanti)".
            first = _cell(cell).split()[0] if _cell(cell) else ""
            parsed = parse_date(first)
        if parsed is not None:
            date_cols[idx] = parsed
            continue
        day = _header_day(cell)
        if day is not None:
            day_cols[idx] = day
    if bss_col is None:
        raise AttendanceSheetError("The sheet needs a 'BSS ID' column.")
    if not date_cols and not day_cols:
        raise AttendanceSheetError("The sheet has no date columns.")
    if day_cols and start_date is None:
        raise AttendanceSheetError("The sheet uses day-number columns — provide a start date.")

    # Map each data column to a date. When the column count matches the requested
    # range exactly, map positionally — this is immune to spreadsheets (Excel)
    # rewriting the date headers into a different locale format.
    end_date = parse_date(end)
    range_dates = None
    if start_date and end_date and end_date >= start_date:
        try:
            range_dates = date_range(start_date, end_date)
        except AttendanceSheetError:
            range_dates = None
    candidates = sorted(set(date_cols) | set(day_cols))
    col_to_date = {}
    if range_dates and len(candidates) == len(range_dates):
        for i, idx in enumerate(candidates):
            col_to_date[idx] = range_dates[i]
    else:
        col_to_date.update(date_cols)
        for idx, day in day_cols.items():
            if start_date:
                try:
                    col_to_date[idx] = date(start_date.year, start_date.month, day)
                except ValueError:
                    continue

    out = []
    for row in raw_rows[1:]:
        if not any(_cell(c) for c in row):
            continue
        bss = _cell(row[bss_col]) if bss_col < len(row) else ""
        if not bss or bss.lower().startswith("p=present"):
            continue
        worker_name = _cell(row[name_col]) if (name_col is not None and name_col < len(row)) else ""
        days = {}
        for idx, day in col_to_date.items():
            status = normalize_status(row[idx] if idx < len(row) else "")
            if status:
                days[day.isoformat()] = status
        if days:
            out.append({"bssId": bss, "name": worker_name, "days": days})
    if not out:
        raise AttendanceSheetError("No attendance values (P/A/L) found in the sheet.")
    return out
