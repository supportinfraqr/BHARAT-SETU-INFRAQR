"""Ingest: turn the two input folders into pages DeepSeek can read. No local OCR.

For every file under the ground-truth folder and the contractor-query folder:
  * PDF   -> per-page digital text layer (pdftotext; exact, free) + per-page PNG render (pdftoppm)
  * image -> the image itself (normalised to PNG, long side capped)
  * other -> inventoried as unsupported (reported, never silently dropped)

A page "needs vision" when it has no usable text layer (scan, photo, handwriting). Those pages are
read by the DeepSeek vision model from the image; pages with a text layer are sent as text (plus the
image for document types where signatures / stamps / handwriting matter — see doctypes.visual).
"""

from __future__ import annotations

import hashlib
import io
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path

from PIL import Image, ImageOps

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif"}
SHEET_EXT = {".xlsx", ".xlsm", ".csv"}
SHEET_ROWS_PER_PAGE = 300        # big sheets are read as several 'pages' of rows (header repeated) — never truncated
MIN_TEXT_CHARS = 120          # below this a page is treated as image-only


@dataclass
class Page:
    no: int
    text: str
    image: str | None          # path to PNG render
    needs_vision: bool


@dataclass
class SourceDoc:
    root: str                  # "gt" | "cq"
    rel: str                   # path relative to its input folder
    path: str
    kind: str                  # pdf | image | other
    sha: str
    pages: list[Page] = field(default_factory=list)
    error: str = ""

    @property
    def id(self) -> str:
        return f"{self.root}:{self.rel}"

    @property
    def text_chars(self) -> int:
        return sum(len(p.text.strip()) for p in self.pages)

    @property
    def readable(self) -> bool:
        """Has a usable digital text layer on every page (the catalogue's 'non-scanned copy' test)."""
        return self.kind in ("pdf", "sheet") and bool(self.pages) and not any(p.needs_vision for p in self.pages)

    @property
    def name(self) -> str:
        return Path(self.rel).name

    def summary(self) -> dict:
        d = asdict(self)
        d["pages"] = [{"no": p.no, "chars": len(p.text.strip()), "needs_vision": p.needs_vision} for p in self.pages]
        return d


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _run(cmd: list[str], timeout=300) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, timeout=timeout)


def pdf_page_count(p: Path) -> int:
    out = _run(["pdfinfo", str(p)]).stdout.decode("utf-8", "replace")
    m = re.search(r"Pages:\s+(\d+)", out)
    return int(m.group(1)) if m else 0


def pdf_page_text(p: Path, page: int) -> str:
    r = _run(["pdftotext", "-layout", "-f", str(page), "-l", str(page), str(p), "-"])
    return r.stdout.decode("utf-8", "replace")


def render_pdf(p: Path, out_dir: Path, dpi: int, max_side: int, pages: int = 0) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    prefix = out_dir / "p"
    _run(["pdftoppm", "-r", str(dpi), "-png", str(p), str(prefix)], timeout=max(600, 30 * pages))   # no fixed ceiling
    pages = sorted(out_dir.glob("p-*.png"), key=lambda q: int(re.search(r"-(\d+)\.png$", q.name).group(1)))
    for q in pages:
        _cap(q, q, max_side)
    return pages


def _cap(src: Path, dst: Path, max_side: int):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        if max(im.size) > max_side:
            im.thumbnail((max_side, max_side))
        im.save(dst, "PNG", optimize=True)


def check_tools() -> list[str]:
    return [t for t in ("pdftotext", "pdftoppm", "pdfinfo") if not shutil.which(t)]


def ingest_folder(folder: Path, root: str, work: Path, dpi=150, max_side=2000) -> list[SourceDoc]:
    docs: list[SourceDoc] = []
    for p in sorted(folder.rglob("*")):
        if not p.is_file() or p.name.startswith("."):
            continue
        rel = str(p.relative_to(folder))
        ext = p.suffix.lower()
        kind = "pdf" if ext == ".pdf" else "image" if ext in IMAGE_EXT else "sheet" if ext in SHEET_EXT else "other"
        d = SourceDoc(root, rel, str(p), kind, sha256(p))
        img_dir = work / "pages" / root / d.sha[:16]
        try:
            if kind == "pdf":
                n = pdf_page_count(p)
                renders = render_pdf(p, img_dir, dpi, max_side, n)
                for i in range(1, n + 1):
                    text = pdf_page_text(p, i)
                    img = str(renders[i - 1]) if i - 1 < len(renders) else None
                    d.pages.append(Page(i, text, img, len(re.sub(r"\s", "", text)) < MIN_TEXT_CHARS))
                if not n:
                    d.error = "PDF could not be opened (encrypted or corrupt)"
            elif kind == "image":
                img_dir.mkdir(parents=True, exist_ok=True)
                out = img_dir / "p-1.png"
                _cap(p, out, max_side)
                d.pages.append(Page(1, "", str(out), True))
            elif kind == "sheet":
                for i, (name, text) in enumerate(sheet_texts(p), start=1):
                    d.pages.append(Page(i, f"[sheet: {name}]\n{text}", None, False))
                if not d.pages:
                    d.error = "Spreadsheet has no data"
            else:
                d.error = f"Unsupported file type '{ext}' — convert to PDF (accepted: PDF, images, XLSX, CSV)"
        except Exception as exc:  # a broken file must be reported, not crash the run
            d.error = f"Could not read file: {exc}"
        docs.append(d)
    return docs


def sheet_texts(p: Path) -> list[tuple[str, str]]:
    """Each worksheet (or the CSV) as tab-separated text, split into pages of SHEET_ROWS_PER_PAGE rows with the
    header row repeated on every page. Registers are often submitted in Excel; nothing is cut off."""
    import csv
    sheets: list[tuple[str, list[str]]] = []
    if p.suffix.lower() == ".csv":
        with open(p, newline="", encoding="utf-8-sig", errors="replace") as f:
            sheets.append((p.stem, ["\t".join(r) for r in csv.reader(f) if any(c.strip() for c in r)]))
    else:
        from openpyxl import load_workbook
        wb = load_workbook(p, read_only=True, data_only=True)
        for ws in wb.worksheets:
            rows = ["\t".join("" if v is None else str(v) for v in r) for r in ws.iter_rows(values_only=True)
                    if any(v not in (None, "") for v in r)]
            if rows:
                sheets.append((ws.title, rows))
    out = []
    for name, rows in sheets:
        head, body = rows[0], rows[1:]
        if len(body) <= SHEET_ROWS_PER_PAGE:
            out.append((name, "\n".join(rows)))
            continue
        for i in range(0, len(body), SHEET_ROWS_PER_PAGE):
            chunk = body[i:i + SHEET_ROWS_PER_PAGE]
            out.append((f"{name} rows {i + 1}-{i + len(chunk)}", "\n".join([head] + chunk)))
    return out


def image_bytes(path: str, max_side: int | None = None) -> bytes:
    with Image.open(path) as im:
        im = im.convert("RGB")
        if max_side and max(im.size) > max_side:
            im.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=88)
        return buf.getvalue()
