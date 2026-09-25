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


def canon_form_code(code):
    """Normalise a form code/label to its canonical ``FORM <roman>[-A|-B]`` form.

    Handles the messy source names (``FORM No. XXVI Register Of Employment`` →
    ``FORM XXVI``, ``Form XIII`` → ``FORM XIII``, ``FORM VI A`` → ``FORM VI-A``)
    and bare tokens (``XIII`` → ``FORM XIII``). Letter forms (``FORM A``…) kept."""
    text = str(code or "").upper().replace("–", "-").strip()
    match = re.search(r"FORM\s+(?:NO\.?\s*)?([IVXLCDM]+)\s*-?\s*([AB])?\b", text)
    if match:
        return f"FORM {match.group(1)}" + (f"-{match.group(2)}" if match.group(2) else "")
    match = re.match(r"^([IVXLCDM]+)\s*-?\s*([AB])?$", text)
    if match:
        return f"FORM {match.group(1)}" + (f"-{match.group(2)}" if match.group(2) else "")
    match = re.fullmatch(r"([A-Z])", text)
    return f"FORM {match.group(1)}" if match else text


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


def _faithful_form_html(blocks, title, form_code, state, template_type):
    """Reproduce a printed form as HTML, exactly as it reads in the source.

    Walks the docx blocks in order (paragraphs + tables) and re-renders them:
    centered bold headings, ``[See rule ...]`` citations, field labels (dotted
    fill when blank), value tokens where a label maps to a master-file field,
    and bordered tables. This mirrors the paper form rather than inventing a
    generic section/block layout."""
    from api import clra

    def esc(value):
        return (str(value or "").replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))

    def field_key(label):
        text = " ".join(str(label or "").lower().split()).rstrip(".: ")
        text = text.replace("\u2026", "")
        if not text:
            return ""
        # Worker master-file fields, matched more strictly than the generic
        # column heuristic (which would map "Name of the Establishment" too).
        worker = (
            (("name", "employee"), "name"), (("name", "workman"), "name"),
            (("name", "worker"), "name"), (("employee", "name"), "name"),
            (("father",), "fatherName"), (("husband",), "fatherName"),
            (("spouse",), "fatherName"), (("sex",), "gender"),
            (("age",), ""), (("date of entry",), "doj"), (("date of joining",), "doj"),
            (("joining",), "doj"), (("designation",), "designation"),
            (("department",), "department"), (("mobile",), "mobile"),
            (("mother tongue",), ""), (("permanent address",), "address"),
            (("residential address",), "address"), (("local address",), "address"),
            (("aadhaar",), "aadhaar"),
        )
        for needles, key in worker:
            if all(n in text for n in needles):
                return key
        general = clra.match_column(label)
        if general and "establishment" not in text and "contractor" not in text:
            return general
        return ""

    lines = []
    header_done = False

    def end_header():
        nonlocal header_done
        if not header_done:
            header_done = True

    def is_title(text):
        lowered = text.strip().lower()
        return bool(re.match(r"^(form\s+[ivxlcdm0-9]|\[see rule|\[form)", lowered)) or \
            (len(text.strip()) <= 60 and not text.rstrip().endswith(":") and not header_done)

    for block in blocks:
        if block["kind"] == "p":
            raw = block["text"]
            text = raw.strip()
            if not text:
                lines.append('<div class="gap"></div>')
                continue
            lower = text.lower()
            if not header_done and (re.match(r"^form\s+[ivxlcdm0-9]", lower)
                                    or lower.startswith("[see rule") or lower.startswith("[form")):
                lines.append(f'<p class="formtitle">{esc(text)}</p>')
                continue
            if not header_done and is_title(text):
                lines.append(f'<p class="title">{esc(text)}</p>')
                end_header()
                continue
            if lower.startswith("[see rule") or (text.startswith("[") and text.endswith("]") and len(text) < 90):
                lines.append(f'<p class="rule">{esc(text)}</p>')
                end_header()
                continue
            key = field_key(text.rstrip(" .:"))
            if key and (text.rstrip().endswith(":") or len(text.rstrip(" .:")) <= 70):
                lines.append(f'<div class="field"><span class="label">{esc(text.rstrip(" .:"))}:</span>'
                             f'<span class="fill value"><b>{{{{{key}}}}}</b></span></div>')
                end_header()
                continue
            if text.rstrip().endswith(":"):
                lines.append(f'<div class="field"><span class="label">{esc(text)}</span>'
                             f'<span class="fill"></span></div>')
                end_header()
                continue
            if any(w in lower for w in ("signature", "place:", "date:")):
                lines.append(f'<div class="sign">{esc(text)}</div>')
                end_header()
                continue
            if (len(text) <= 70 and not text.endswith(".")) or lower.startswith("to"):
                lines.append(f'<p class="lead">{esc(text)}</p>')
                end_header()
                continue
            lines.append(f'<p>{esc(text)}</p>')
        else:
            end_header()
            inner = []
            for row in block["rows"]:
                cells = "".join(
                    f'<td>{esc(c)}</td>' if (i == len(row) - 1) or not row[i]
                    else f'<td>{esc(c)}</td>'
                    for i, c in enumerate(row))
                inner.append(f'<tr>{cells}</tr>')
            lines.append(f'<table class="grid">{"" .join(inner)}</table>')
            lines.append('<div class="gap"></div>')

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Times New Roman', Times, serif; margin: 28px; color: #000; }}
  p {{ margin: 4px 0; font-size: 13px; }}
  p.formtitle {{ text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 2px; }}
  p.rule {{ text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }}
  p.title {{ text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 12px; }}
  p.lead {{ font-weight: 600; margin-top: 8px; }}
  .gap {{ height: 10px; }}
  .field {{ display: flex; gap: 8px; align-items: baseline; margin: 6px 0; font-size: 13px; }}
  .field .label {{ flex: none; }}
  .field .fill {{ flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; display: inline-block; }}
  .field .value b {{ font-weight: 600; }}
  .sign {{ margin-top: 18px; text-align: right; font-size: 13px; }}
  table.grid {{ border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }}
  table.grid td, table.grid th {{ border: 1px solid #000; padding: 4px 6px; }}
  @media print {{ body {{ margin: 8mm; }} }}
</style></head><body>
  {chr(10).join(lines)}
</body></html>"""


def _faithful_register_html(blocks, title, form_code):
    """Faithful default layout for a **register** stored as a docx.

    Keeps the printed preamble exactly as it reads (FORM code, ``[See rule …]``,
    title, contractor/establishment header lines) and turns the source data table
    into the live ``{{HEAD}}`` / ``{{ROWS}}`` grid the renderer fills with the
    master-file rows."""
    html = _faithful_form_html(blocks, title or form_code, form_code, "", "register")
    grid = ('<table class="grid"><thead><tr>{{HEAD}}</tr></thead>'
            '<tbody>{{ROWS}}</tbody></table>')
    # The register's bordered table is rendered with class "grid"; swap the first
    # one (the data table) for the live grid.
    return re.sub(r'<table class="grid">.*?</table>', grid, html, count=1, flags=re.S)


def _faithful_xlsx_form_html(rows, title, form_code):
    """Reproduce a printable form stored as a spreadsheet grid (e.g. FORM XIX
    wage slip) rendering texts in reading order, columns preserved roughly,
    tables as bordered grids. Mirrors the printed sheet rather than tabular data."""
    def esc(value):
        return (str(value or "").replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;"))

    lines = []
    header_done = False
    for row in rows:
        cells = [str(c).strip() if c is not None else "" for c in row]
        cells = [c for c in cells if c]
        if not cells:
            continue
        first = cells[0]
        lower = first.lower()
        if not header_done and re.match(r"^form\s+[ivxlcdm0-9]", lower):
            lines.append(f'<p class="formtitle">{esc(first)}</p>')
            continue
        if not header_done and (lower.lstrip("* \u00a0").startswith("[see rule")
                                or lower.lstrip("* \u00a0").startswith("[")):
            lines.append(f'<p class="rule">{esc(first)}</p>')
            continue
        if not header_done:
            lines.append(f'<p class="title">{esc(first)}</p>')
            header_done = True
            continue
        if len(cells) > 1:
            cells_html = "".join(f'<td>{esc(c)}</td>' for c in cells)
            lines.append(f'<table class="grid"><tr>{cells_html}</tr></table>')
        elif len(first) <= 90:
            lines.append(f'<div class="field"><span class="label">{esc(first)}:</span>'
                         f'<span class="fill"></span></div>')
        else:
            lines.append(f'<p>{esc(first)}</p>')

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Times New Roman', Times, serif; margin: 28px; color: #000; }}
  p {{ margin: 4px 0; font-size: 13px; }}
  p.formtitle {{ text-align: center; font-weight: bold; font-size: 15px; }}
  p.title {{ text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }}
  .field {{ display: flex; gap: 8px; margin: 6px 0; font-size: 13px; }}
  .field .label {{ flex: none; }}
  .field .fill {{ flex: 1; border-bottom: 1px solid #000; min-height: 1.2em; }}
  table.grid {{ border-collapse: collapse; width: 100%; font-size: 12px; margin: 4px 0; }}
  table.grid td, table.grid th {{ border: 1px solid #000; padding: 4px 6px; }}
  @media print {{ body {{ margin: 8mm; }} }}
</style></head><body>
  {chr(10).join(lines)}
</body></html>"""


_MONTH_YEAR_RE = re.compile(
    r"(?i)\b(january|february|march|april|may|june|july|august|september|"
    r"october|november|december)\b[\s,]*\d{2,4}")


def _tokenize_period(text):
    """Replace a baked-in month + year with the register-period tokens so the
    printed declaration follows the selected frequency (``{{MONTH}} {{YEAR}}``)."""
    out = _MONTH_YEAR_RE.sub("{{MONTH}} {{YEAR}}", str(text or ""))
    # A declaration that trails "during the month of" with no month value gets
    # the period tokens appended (source had the month in a merged cell).
    if re.search(r"(?i)month of\s*$", out) and "{{MONTH}}" not in out:
        out = out.rstrip() + " {{MONTH}} {{YEAR}}"
    return out


def _faithful_xlsx_register_html(rows, title, form_code, columns):
    """Faithful default for an ``.xls``/``.xlsx`` **register**.

    Renders the printed preamble (FORM code, ``[See rule …]``, title, numbered
    header lines), the live ``{{HEAD}}``/``{{ROWS}}`` grid where the source header
    row sits, and the trailing declaration footer — with its month/year
    tokenised (``{{MONTH}} {{YEAR}}``) so it tracks the register period."""
    def esc(value):
        return (str(value or "").replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;"))

    def norm(value):
        return re.sub(r"\s+", " ", str(value or "").strip())

    col_keys = {norm(c).lower() for c in (columns or []) if norm(c)}
    header_idx, best = None, 0
    for i, row in enumerate(rows[:40]):
        cells = [norm(c) for c in row if norm(c)]
        score = sum(1 for c in cells if c.lower() in col_keys)
        if score > best:
            best, header_idx = score, i
    grid = ('<table class="grid"><thead><tr>{{HEAD}}</tr></thead>'
            '<tbody>{{ROWS}}</tbody></table>')
    lines, header_done = [], False
    for i, row in enumerate(rows):
        cells = [norm(c) for c in row if norm(c)]
        if not cells:
            continue
        if header_idx is not None and i == header_idx:
            lines.append(grid)
            header_done = True
            continue
        text = " ".join(cells)
        if header_done:
            # numeric sub-header row ("1.0  2.0  …") — the column numbering.
            if all(re.fullmatch(r"\d+(\.\d+)?", c) for c in cells):
                continue
            lines.append(f"<p>{esc(_tokenize_period(text))}</p>")
            continue
        lower = text.lower()
        if re.match(r"^form\s+[ivxlcdm0-9]", lower):
            lines.append(f'<p class="formtitle">{esc(text)}</p>')
        elif lower.lstrip("* \u00a0").startswith("["):
            lines.append(f'<p class="rule">{esc(text)}</p>')
        elif not lines:
            lines.append(f'<p class="title">{esc(text)}</p>')
        else:
            lines.append(f"<p>{esc(text)}</p>")
    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Times New Roman', Times, serif; margin: 28px; color: #000; }}
  p {{ margin: 4px 0; font-size: 13px; }}
  p.formtitle {{ text-align: center; font-weight: bold; font-size: 15px; }}
  p.rule {{ text-align: center; font-size: 11px; color: #333; margin-bottom: 8px; }}
  p.title {{ text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 10px; }}
  table.grid {{ border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }}
  table.grid td, table.grid th {{ border: 1px solid #000; padding: 4px 6px; }}
  @media print {{ body {{ margin: 8mm; }} }}
</style></head><body>
  {chr(10).join(lines)}
</body></html>"""


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
        parser.add_argument("--forms", dest="forms",
                            help="Comma/space separated canonical form codes to import "
                                 "(e.g. \"XIII,XVI\" or \"FORM XIII, FORM XVI\").")
        parser.add_argument("--only-missing", dest="only_missing", action="store_true",
                            help="Create templates that don't exist yet; never overwrite existing rows.")
        parser.add_argument("--dry-run", dest="dry_run", action="store_true",
                            help="Classify and print, do not write to the database.")
        parser.add_argument("--only-if-empty", dest="only_if_empty", action="store_true",
                            help="Skip the import when RegisterTemplate rows already exist.")

    def handle(self, *args, **options):
        from bss_core.models import RegisterTemplate

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
        forms_arg = options.get("forms") or ""
        forms_filter = {canon_form_code(tok) for tok in re.split(r"[,\s]+", forms_arg) if tok.strip()}
        only_missing = bool(options.get("only_missing"))
        created = updated = skipped = 0
        by_state = {}
        for state, filename, data in entries:
            if only_state and state.lower() != only_state.lower():
                continue
            if filename.startswith("~$"):
                continue
            form_code = _form_code(filename)
            if forms_filter and canon_form_code(form_code) not in forms_filter:
                continue
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
            if form_code.upper() in ("FORM X", "FORM XIX") and classified["source_format"] == "docx":
                # Identity cards / wage slips stored as Word docs are per-worker
                # forms — never render them as tabular registers.
                template_type = "form"
                columns = []
                html = _faithful_form_html(_docx_blocks(data), title or form_code,
                                           form_code, state, template_type)
            elif fields and not columns:
                html = _faithful_form_html(_docx_blocks(data), title or form_code,
                                           form_code, state, template_type)
            elif columns and template_type == "register" and classified["source_format"] == "docx":
                # A register stored as a Word doc: keep its printed preamble and
                # turn its table into the live {{HEAD}}/{{ROWS}} grid.
                html = _faithful_register_html(_docx_blocks(data), title or form_code, form_code)
            elif columns and template_type == "register" and classified["source_format"] in ("xlsx", "xls"):
                # An Excel register: keep its printed preamble + declaration
                # (month/year tokenised) and the live {{HEAD}}/{{ROWS}} grid.
                rows = (_parse_xlsx(data) if classified["source_format"] == "xlsx"
                        else _parse_xls(data))
                html = _faithful_xlsx_register_html(rows, title or form_code, form_code, columns)
            elif not columns and not fields and classified["source_format"] in ("xlsx", "xls"):
                rows = (_parse_xlsx(data) if classified["source_format"] == "xlsx"
                        else _parse_xls(data))
                html = _faithful_xlsx_form_html(rows, title or form_code, form_code)

            defaults = {
                "title": title, "source_format": classified["source_format"],
                "output_format": "pdf" if classified["source_format"] == "docx" else "xlsx",
                "columns": columns, "fields": fields,
                "meta": {"lines": meta, "file": filename,
                         # Identity Cards (FORM X) and Wage Slips (FORM XIX)
                         # render once per worker; every other form/register
                         # renders once for the whole batch.
                         "scope": "per-worker" if form_code.upper() in ("FORM X", "FORM XIX") else "whole"},
                "is_active": True,
                # Identity Cards (FORM X) and Wage Slips (FORM XIX) are issued
                # once per worker — the authored layout repeats per master row.
                "per_row": form_code.upper() in ("FORM X", "FORM XIX"),
            }
            existing = RegisterTemplate.objects.filter(state=state, form_code=form_code).first()
            if only_missing and existing is not None:
                continue
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
                # Re-seeding always regenerates the faithful form layout so the
                # imported HTML matches the printed source exactly.
                obj.html = html
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