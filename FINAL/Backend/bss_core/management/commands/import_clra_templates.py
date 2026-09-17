"""Import the PAN-India CLRA register template library.

Reads the state-wise register files (``<State>/<FORM ...>.xlsx|xls|docx``) from a
ZIP or directory and creates/updates ``RegisterTemplate`` rows: the ordered
column headers parsed from each register, its metadata and the source file.

Usage:
    python manage.py import_clra_templates --zip "/path/CLRA Registers PAN India (3).zip"
    python manage.py import_clra_templates --dir "/path/CLRA Registers PAN India"
"""

import io
import os
import re
import zipfile
from html import unescape

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

DEFAULT_ZIP = ("/home/yasser/BSS_Project/FINAL/Requirements/"
               "CLRA Registers PAN India (3).zip")

HEADER_HINTS = ("sl. no", "sl.no", "serial", "name", "wage", "amount", "date",
                "days", "hours", "employee", "workmen", "contractor", "remarks")


def _clean(value):
    if value is None:
        return ""
    text = str(value).replace("\n", " ").strip()
    return re.sub(r"\s+", " ", text)


def _form_code(filename):
    base = os.path.splitext(filename)[0]
    match = re.search(r"(form\s*[ivxlcdm]+(?:\s*[-–]?\s*[ab])?\b|form\s*[a-z]\b)", base, re.I)
    if match:
        code = _clean(match.group(1)).upper()
        code = re.sub(r"^FORM\s*", "FORM ", code)
        # "FORM VI A" -> "FORM VI-A" (keep a single space before the suffix letter)
        code = re.sub(r"^(FORM\s+[IVXLCDM]+)\s+([AB])$", r"\1-\2", code)
        return code
    return base[:60]


def _title(filename):
    base = os.path.splitext(filename)[0]
    cleaned = re.sub(r"(?i)^(form\s*[ivxlcdm]+(?:\s*[-–]?\s*[ab])?|form\s*[a-z])\s*[-–]?\s*", "", base)
    cleaned = _clean(cleaned)
    # A leftover single-letter suffix ("FORM VI A") is not a real title.
    return cleaned[:200] if len(cleaned) > 3 else ""


def _header_score(values):
    joined = " ".join(values).lower()
    score = len(values)
    if "sl" in joined and "no" in joined:
        score += 6
    score += sum(3 for hint in HEADER_HINTS if hint in joined)
    return score


def _pick_header(rows):
    """Return (index, columns, meta) for the most header-like row."""
    best = (0, -1, [], [])
    for index, values in enumerate(rows[:35]):
        cleaned = [_clean(v) for v in values]
        nonempty = [v for v in cleaned if v]
        if len(nonempty) < 2:
            continue
        score = _header_score(nonempty)
        if score > best[1]:
            best = (index, score, cleaned, rows[:index])
    index, _score, columns, meta_rows = best
    columns = [c for c in columns if c]
    meta = [c for row in meta_rows for c in row if c][:20]
    return index, columns, meta


def _parse_xlsx(data):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True)
    ws = wb.worksheets[0]
    rows = []
    for r in range(1, min(ws.max_row or 0, 40) + 1):
        rows.append([ws.cell(r, c).value for c in range(1, (ws.max_column or 0) + 1)])
    return rows


def _parse_xls(data):
    import xlrd
    book = xlrd.open_workbook(file_contents=data)
    sheet = book.sheet_by_index(0)
    rows = []
    for r in range(min(sheet.nrows, 40)):
        rows.append(sheet.row_values(r))
    return rows


def _parse_docx(data):
    """Extract the first table's header row (if any) and the leading text lines."""
    z = zipfile.ZipFile(io.BytesIO(data))
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    # Table rows -> cells.
    tables = re.findall(r"<w:tbl>(.*?)</w:tbl>", xml, re.S)
    header = []
    for table in tables:
        for row in re.findall(r"<w:tr[ >].*?</w:tr>", table, re.S):
            cells = [_clean(unescape(re.sub(r"<[^>]+>", "", cell)))
                     for cell in re.findall(r"<w:tc[ >].*?</w:tc>", row, re.S)]
            cells = [c for c in cells if c]
            if len(cells) >= 2 and _header_score(cells) > _header_score(header):
                header = cells
        if header:
            break
    # Leading paragraph text as metadata.
    text = unescape(re.sub(r"<[^>]+>", "\n", xml.replace("</w:p>", "\n")))
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    return header, lines[:25]


def _rows_from_file(name, data):
    ext = os.path.splitext(name)[1].lower()
    if ext == ".xlsx":
        return _parse_xlsx(data), "xlsx"
    if ext == ".xls":
        return _parse_xls(data), "xls"
    return None, ext.lstrip(".")


class Command(BaseCommand):
    help = "Import the PAN-India CLRA register templates into RegisterTemplate."

    def add_arguments(self, parser):
        parser.add_argument("--zip", dest="zip_path", default=DEFAULT_ZIP)
        parser.add_argument("--dir", dest="dir_path")
        parser.add_argument("--state", dest="only_state", help="Import a single state only.")

    def handle(self, *args, **options):
        from bss_core.models import RegisterTemplate

        entries = []
        if options.get("dir_path"):
            root = options["dir_path"]
            for state in sorted(os.listdir(root)):
                state_dir = os.path.join(root, state)
                if not os.path.isdir(state_dir):
                    continue
                for filename in sorted(os.listdir(state_dir)):
                    path = os.path.join(state_dir, filename)
                    if os.path.isfile(path):
                        with open(path, "rb") as handle:
                            entries.append((state, filename, handle.read()))
        else:
            zip_path = options.get("zip_path")
            if not os.path.exists(zip_path):
                raise CommandError(f"Template archive not found: {zip_path}")
            with zipfile.ZipFile(zip_path) as archive:
                for name in archive.namelist():
                    if name.endswith("/"):
                        continue
                    parts = name.split("/")
                    if len(parts) < 3:
                        continue
                    entries.append((parts[-2], parts[-1], archive.read(name)))

        only_state = options.get("only_state")
        created = updated = skipped = 0
        for state, filename, data in entries:
            if only_state and state.lower() != only_state.lower():
                continue
            if filename.startswith("~$"):
                continue
            form_code = _form_code(filename)
            title = _title(filename)
            rows, source_format = _rows_from_file(filename, data)
            columns, meta = [], []
            if rows is not None:
                _idx, columns, meta = _pick_header(rows)
            else:
                columns, meta = _parse_docx(data)

            defaults = {
                "title": title, "source_format": source_format,
                "columns": columns, "meta": {"lines": meta, "file": filename},
                "is_active": True,
            }
            existing = RegisterTemplate.objects.filter(state=state, form_code=form_code).first()
            if existing is None:
                obj = RegisterTemplate(state=state, form_code=form_code, **defaults)
                created += 1
            else:
                obj = existing
                defaults["version"] = obj.version + 1
                for key, value in defaults.items():
                    setattr(obj, key, value)
                updated += 1
            obj.source_file.save(filename, ContentFile(data), save=False)
            obj.save()
            if not columns:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"CLRA templates: {created} created, {updated} updated, "
            f"{skipped} without parsed columns. Total {RegisterTemplate.objects.count()}."))
