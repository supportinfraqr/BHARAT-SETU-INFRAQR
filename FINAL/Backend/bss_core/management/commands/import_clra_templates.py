"""Import the PAN-India CLRA register template library, state by state.

Reads the state-wise register files (``<State>/<FORM ...>.xlsx|xls|docx``) from a
ZIP or directory and creates/updates ``RegisterTemplate`` rows.

For each file the structure is classified (the "field vs header" decision):
  * xlsx/xls (tabular registers) -> the most header-like row becomes ``columns``
    and the rows above it become ``meta``.
  * docx narrative forms (application forms, e.g. FORM IV) -> paragraphs are
    classified into title / rule-citation / section / field label / signature,
    stored as field-dictionary ``fields`` and an authored HTML layout so the
    form renders end to end.
Updating is idempotent per (state, form_code); existing rows have their
columns/fields/meta/html backfilled and the version bumped. Source files are
stored under a sanitised short name (the raw filenames can exceed the storage
limit and previously crashed the import).

Usage:
    python manage.py import_clra_templates --zip "/path/CLRA Registers PAN India (3).zip"
    python manage.py import_clra_templates --zip "..." --state Maharashtra --dry-run
"""

import io
import os
import re
import zipfile
from html import unescape
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

BASE = Path(__file__).resolve().parents[4]
DEFAULT_ZIP = BASE / "Requirements" / "CLRA Registers PAN India (3).zip"

HEADER_HINTS = ("sl. no", "sl.no", "serial", "name", "wage", "amount", "date",
                "days", "hours", "employee", "workmen", "contractor", "remarks")

_SIGNATURE_HINTS = ("signature", "sig. of", "sig of")

# Dotted fill leaders used by the printed forms (e.g. "Name ……").
_FILL_RE = re.compile(r"[.\u2026]{3,}")


def _leader_only(text):
    """True for a line that is nothing but dotted fill leaders."""
    return not re.sub(r"[\s.\u2026]", "", text)


def _looks_like_column_header(text):
    """True for a flattened register header cell (a short label, no fill)."""
    if not text or len(text) > 90:
        return False
    if _FILL_RE.search(text):
        return False
    if text.startswith("[") or text.startswith("("):
        return False
    if text.endswith(":"):
        return False
    if text.endswith(".") and len(text) > 15:
        return False
    return "see rule" not in text.lower()


def _column_run(paragraphs, minimum=8):
    """Largest run of consecutive register-header lines, else ``(0, 0)``.

    Several source registers are tables flattened to one paragraph per cell, so
    the header row arrives as a long run of short labels (Form XIV, the
    Employment-cum-wage card). Returning that run as ``columns`` keeps the
    header cells out of the field dictionary."""
    best = (0, 0)
    start = 0
    total = len(paragraphs)
    while start < total:
        if _looks_like_column_header(paragraphs[start]):
            end = start
            while end < total and _looks_like_column_header(paragraphs[end]):
                end += 1
            if end - start > best[1] - best[0]:
                best = (start, end)
            start = end
        else:
            start += 1
    return best if best[1] - best[0] >= minimum else (0, 0)


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
        code = re.sub(r"^(FORM\s+[IVXLCDM]+)\s+([AB])$", r"\1-\2", code)
        return code
    return base[:60]


def _title(filename):
    base = os.path.splitext(filename)[0]
    cleaned = re.sub(r"(?i)^(form\s*[ivxlcdm]+(?:\s*[-–]?\s*[ab])?|form\s*[a-z])\s*[-–]?\s*", "", base)
    cleaned = _clean(cleaned)
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
    for row in ws.iter_rows(max_row=min(ws.max_row or 0, 40), values_only=True):
        rows.append(list(row))
    return rows


def _parse_xls(data):
    import xlrd
    book = xlrd.open_workbook(file_contents=data)
    sheet = book.sheet_by_index(0)
    rows = []
    for r in range(min(sheet.nrows, 40)):
        rows.append(sheet.row_values(r))
    return rows


def _docx_blocks(data):
    """Split a docx into ordered text blocks: paragraphs and table cell-grids."""
    z = zipfile.ZipFile(io.BytesIO(data))
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    blocks = []
    for chunk in re.split(r"(<w:tbl>.*?</w:tbl>)", xml, flags=re.S):
        if not chunk:
            continue
        if chunk.startswith("<w:tbl>"):
            table = []
            for row in re.findall(r"<w:tr[ >].*?</w:tr>", chunk, re.S):
                cells = [_clean(unescape(re.sub(r"<[^>]+>", " ", cell)))
                         for cell in re.findall(r"<w:tc[ >].*?</w:tc>", row, re.S)]
                cells = [c for c in cells if c]
                if cells:
                    table.append(cells)
            if table:
                blocks.append({"kind": "table", "rows": table})
        else:
            for para in re.findall(r"<w:p[ >].*?</w:p>", chunk, re.S):
                text = _clean(unescape(re.sub(r"<[^>]+>", " ", para)))
                if text:
                    blocks.append({"kind": "p", "text": text})
    return blocks


def _classify_docx(blocks):
    """LLM-style classification of a narrative/form docx.

    Returns (columns, fields, meta_lines, template_type, signature_any)."""
    paras = [b["text"] for b in blocks if b["kind"] == "p"]
    tables = [b["rows"] for b in blocks if b["kind"] == "table"]

    # Tabular register stored inside a docx (header row detectable) -> columns.
    best_header = None
    for table in tables:
        for row in table:
            if len(row) >= 3 and _header_score(row) > _header_score(best_header or []):
                best_header = row
    if best_header and _header_score(best_header) >= 6:
        return best_header, [], paras[:20], "register", False

    # Register stored as one paragraph per table cell -> the header row is a run
    # of short labels. Use it as columns; the preamble stays as header/meta.
    run_start, run_end = _column_run(paras)
    if run_start:
        columns = paras[run_start:run_end]
        preamble = [p for i, p in enumerate(paras) if not run_start <= i < run_end][:25]
        return columns, [], preamble, "register", False

    # Narrative application form -> classify paragraphs.
    fields = []
    meta_lines = []
    section = "Form"
    for raw in paras:
        text = _clean(raw)
        if not text:
            continue
        lower = text.lower()
        # Code / rule citations, bracketed notes and place/date lines are meta.
        if (re.match(r"^form\s+[ivxlcdm0-9]", lower) or "see rule" in lower
                or (text.startswith("(") and text.endswith(")"))):
            meta_lines.append(text)
            continue
        if lower.startswith(("place", "date")):
            meta_lines.append(text)
            continue
        if _leader_only(text):
            meta_lines.append(text)
            continue
        if any(keyword in lower for keyword in ("particulars of", "details of",
                                                "declaration", "to be filled in the office",
                                                "application for", "form of", "certificate by",
                                                "register of", "office of the licencing")):
            section = text
            continue
        fields.append({
            "section": section,
            "label": text,
            "dataType": "text",
            "dataSource": "manual",
            "mandatory": bool(re.search(r"\b(whether|please certify|is enclosed)\b", text, re.I)),
            "readOnly": False,
            "signature": any(h in lower for h in _SIGNATURE_HINTS),
            "approval": False,
        })
    return [], fields, paras[:25], "form", any(f.get("signature") for f in fields)


def _classify(name, data):
    """Return the structured template draft for one register file."""
    ext = os.path.splitext(name)[1].lower()
    if ext == ".xlsx":
        rows = _parse_xlsx(data)
        _idx, columns, meta = _pick_header(rows)
        return {"columns": columns, "fields": [], "meta": meta,
                "type": "register" if columns else "form", "source_format": "xlsx"}
    if ext == ".xls":
        rows = _parse_xls(data)
        _idx, columns, meta = _pick_header(rows)
        return {"columns": columns, "fields": [], "meta": meta,
                "type": "register" if columns else "form", "source_format": "xls"}
    if ext == ".docx":
        columns, fields, meta, template_type, _sig = _classify_docx(_docx_blocks(data))
        return {"columns": columns, "fields": fields, "meta": meta,
                "type": template_type, "source_format": "docx"}
    return None


def _safe_storage_name(state, filename, form_code):
    """Sanitise the stored source filename (raw names crash the storage layer)."""
    ext = os.path.splitext(filename)[1].lower()
    slug = re.sub(r"[^A-Za-z0-9]+", "-", state)[:24].strip("-")
    code = re.sub(r"[^A-Za-z0-9]+", "-", form_code or os.path.splitext(filename)[0])[:34].strip("-")
    return f"{slug}-{code}{ext}"[:100]


class Command(BaseCommand):
    help = "Import the PAN-India CLRA register templates (LLM-style classification, idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--zip", dest="zip_path", default=str(DEFAULT_ZIP))
        parser.add_argument("--dir", dest="dir_path")
        parser.add_argument("--state", dest="only_state", help="Import a single state only.")
        parser.add_argument("--dry-run", dest="dry_run", action="store_true",
                            help="Classify and print, do not write to the database.")
        parser.add_argument("--only-if-empty", dest="only_if_empty", action="store_true",
                            help="Skip the import when RegisterTemplate rows already exist.")

    def handle(self, *args, **options):
        from bss_core.models import RegisterTemplate
        from api.v1_bridge.register_templates import _auto_form_html

        if options.get("only_if_empty") and RegisterTemplate.objects.exists():
            self.stdout.write("CLRA templates already present — import skipped.")
            return

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
                    if parts[-1].lower() == "state wise form of  clra.xls":
                        continue
                    entries.append((parts[-2], parts[-1], archive.read(name)))

        only_state = options.get("only_state")
        created = updated = skipped = 0
        by_state = {}
        for state, filename, data in entries:
            if only_state and state.lower() != only_state.lower():
                continue
            if filename.startswith("~$"):
                continue
            form_code = _form_code(filename)
            title = _title(filename)
            classified = _classify(filename, data)
            if classified is None:
                skipped += 1
                continue
            summary = f"{classified['source_format'].upper():4} {classified['type']:8} " \
                      f"cols={len(classified['columns'])} fields={len(classified['fields'])}"
            by_state.setdefault(state, []).append((form_code, title, summary, filename))

            if options.get("dry_run"):
                self.stdout.write(f"  {state:22} {form_code:12} {summary:30} {filename[:48]}")
                continue

            columns = classified["columns"]
            fields = classified["fields"]
            meta = classified["meta"]
            template_type = classified["type"]
            html = ""
            if fields and not columns:
                html = _auto_form_html(title or form_code, form_code, state, template_type,
                                       fields, columns)

            defaults = {
                "title": title, "source_format": classified["source_format"],
                "output_format": "pdf" if classified["source_format"] == "docx" else "xlsx",
                "columns": columns, "fields": fields,
                "meta": {"lines": meta, "file": filename},
                "is_active": True,
                # Identity Cards (FORM X) and Wage Slips (FORM XIX) are issued
                # once per worker — the authored layout repeats per master row.
                "per_row": form_code.upper() in ("FORM X", "FORM XIX"),
            }
            existing = RegisterTemplate.objects.filter(state=state, form_code=form_code).first()
            if existing is None:
                obj = RegisterTemplate(state=state, form_code=form_code, template_type=template_type,
                                       html=html, **defaults)
                created += 1
            else:
                obj = existing
                defaults["version"] = obj.version + 1
                for key, value in defaults.items():
                    setattr(obj, key, value)
                obj.template_type = template_type
                if html:
                    if not obj.html:
                        obj.html = html
                elif columns and not fields:
                    # Register now renders from its columns — drop the stale
                    # form layout an earlier import generated from header cells.
                    obj.html = ""
                updated += 1
            obj.source_file.save(_safe_storage_name(state, filename, form_code),
                                ContentFile(data), save=False)
            obj.save()
            if not columns and not fields:
                skipped += 1

        if options.get("dry_run"):
            total = sum(len(v) for v in by_state.values())
            self.stdout.write(self.style.SUCCESS(
                f"DRY RUN — {len(by_state)} states, {total} files classified (nothing written)."))
            return

        self.stdout.write(self.style.SUCCESS(
            f"CLRA templates: {created} created, {updated} updated, "
            f"{skipped} skipped/unclassified. Total {RegisterTemplate.objects.count()}."))