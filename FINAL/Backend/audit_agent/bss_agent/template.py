"""BharatShramSetu (BSS) audit-report template — page chrome, cover and building blocks.

This replaces the earlier brochure renderer with the BSS standard report format, so every
audit report has the same look:

  * Cover page      — deep-blue BSS band, saffron→white→green tricolour rule, logo plate,
                      report meta grid, compliance-score gauge and overall-risk pill.
  * Body pages      — header (logo, BSS wordmark, current section, report no.), tricolour rule,
                      footer (confidentiality line, "Page x of N").
  * Continuation    — long sections flow onto as many pages as needed; the header marks them
                      "(continued)" (see template_page2.py for the flowing tables and cards).

Tokens (colours, fonts, logo) come from config/bss_theme.json via branding.py.
"""

from __future__ import annotations

import math
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

from . import branding

PAGE_W, PAGE_H = A4
LAND_W, LAND_H = landscape(A4)
MARGIN_X = 40
TOP = 74          # body frame starts below the header
BOTTOM = 52
CONTENT_W = PAGE_W - 2 * MARGIN_X
LAND_CONTENT_W = LAND_W - 2 * MARGIN_X

T = branding.theme()
COL = T["colors"]
FONTS = branding.register_fonts()
H, HS, HB, B, BB = (FONTS["heading"], FONTS["heading_semi"], FONTS["heading_bold"], FONTS["body"], FONTS["body_bold"])

BLUE = colors.HexColor(COL["primary"])
SAFFRON = colors.HexColor(COL["secondary"])
GREEN = colors.HexColor(COL["accent"])
INK = colors.HexColor(COL["text_dark"])
MUTED = colors.HexColor(COL["text_muted"])
BORDER = colors.HexColor(COL["border"])
PANEL = colors.HexColor(COL["panel"])
BLUE_SOFT = colors.HexColor(COL["primary_soft"])
SAFFRON_SOFT = colors.HexColor(COL["secondary_soft"])

STATUS_LABEL = {"Complied": "COMPLIED", "Partially Complied": "PARTIAL", "Non-Complied": "NON-COMPLIED",
                "Document Not Available": "DOC NOT AVAILABLE", "Not Verifiable": "NOT VERIFIABLE",
                "Not Applicable": "NOT APPLICABLE", "Not Auditable": "NOT AUDITABLE"}


def hexc(v: str):
    return colors.HexColor(v)


def status_c(s):
    return hexc(branding.status_color(s))


def status_soft(s):
    return hexc(branding.status_soft(s))


def risk_c(r):
    return hexc(branding.risk_color(r))


_SAFE = {"✕": "×", "◐": "½", "≈": "~", "↔": "–", "✗": "×"}


def safe(text) -> str:
    """Escape for Paragraph markup and swap glyphs the brand fonts lack."""
    s = str(text if text is not None else "")
    for a, b in _SAFE.items():
        s = s.replace(a, b)
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# --------------------------------------------------------------------------- styles
def _ps(name, font=B, size=8.6, leading=None, color=INK, align=TA_LEFT, **kw):
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading or size * 1.38, textColor=color,
                          alignment=align, **kw)


S = {
    "h1": _ps("h1", HB, 17, 21, BLUE, spaceAfter=4),
    "h2": _ps("h2", HS, 11.5, 15, BLUE, spaceBefore=8, spaceAfter=4),
    "h3": _ps("h3", HS, 9.6, 12.5, INK, spaceBefore=6, spaceAfter=3),
    "body": _ps("body", B, 8.8, 13, INK, spaceAfter=5),
    "body_j": _ps("body_j", B, 8.8, 13.2, INK, align=4, spaceAfter=5),
    "lead": _ps("lead", B, 10, 15, INK, align=4, spaceAfter=6),
    "small": _ps("small", B, 7.4, 9.8, MUTED),
    "tiny": _ps("tiny", B, 6.6, 8.4, MUTED),
    "cell": _ps("cell", B, 7.3, 9.4, INK),
    "cell_b": _ps("cell_b", BB, 7.3, 9.4, INK),
    "cell_head": _ps("cell_head", BB, 7.2, 9, colors.white),
    "cap": _ps("cap", B, 7.2, 9.5, MUTED, spaceBefore=2, spaceAfter=8),
    "kpi_v": _ps("kpi_v", HB, 19, 22, BLUE, align=TA_LEFT),
    "kpi_l": _ps("kpi_l", BB, 6.8, 8.6, MUTED),
    "kpi_s": _ps("kpi_s", B, 6.6, 8.4, MUTED),
    "toc0": _ps("toc0", HS, 9.4, 13.5, INK),
    "toc1": _ps("toc1", B, 8, 10.6, MUTED, leftIndent=14),
    "bullet": _ps("bullet", B, 8.8, 13, INK, leftIndent=12, bulletIndent=2, spaceAfter=2.5),
}


def P(text, style="body", raw=False):
    return Paragraph(text if raw else safe(text), S[style] if isinstance(style, str) else style)


# --------------------------------------------------------------------------- document
class SectionMarker(Flowable):
    """Zero-size flowable: tells the page chrome which section is running (for headers, TOC)."""

    def __init__(self, title: str, toc_level: int | None = 0, key: str | None = None):
        super().__init__()
        import hashlib
        self.title, self.toc_level = title, toc_level
        self.key = "s" + hashlib.md5((key or title).encode()).hexdigest()[:12]
        self.width = self.height = 0

    def wrap(self, *a):
        return 0, 0

    def draw(self):
        doc = self.canv._doctemplate
        if not self.toc_level:  # running header shows the top-level section only
            doc.current_section = self.title
            doc.section_start.setdefault(self.title, self.canv.getPageNumber())
        if self.toc_level is not None:
            doc.notify("TOCEntry", (self.toc_level, self.title, self.canv.getPageNumber(), self.key))
            self.canv.bookmarkPage(self.key)
            self.canv.addOutlineEntry(self.title, self.key, level=self.toc_level, closed=True)


class NumberedCanvas(rl_canvas.Canvas):
    """Two-pass canvas so every footer can print 'Page x of N'."""

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        n = len(self._saved)
        for st in self._saved:
            self.__dict__.update(st)
            if self._pageNumber > 1:
                self.setFont(B, 7.2)
                self.setFillColor(MUTED)
                self.drawRightString(PAGE_W - MARGIN_X, 26, f"Page {self._pageNumber} of {n}")
            super().showPage()
        super().save()


class BSSReport(BaseDocTemplate):
    def __init__(self, path, meta: dict, **kw):
        super().__init__(str(path), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=TOP,
                         bottomMargin=BOTTOM, title=meta.get("title", "BSS Audit Report"),
                         author=branding.brand("name"), subject=meta.get("subject", ""),
                         creator=branding.brand("agent_name"), **kw)
        self.meta = meta
        self.current_section = ""
        self.section_start: dict[str, int] = {}
        self.total_pages = 0
        body = Frame(MARGIN_X, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id="body", leftPadding=0, rightPadding=0,
                     topPadding=0, bottomPadding=0)
        land = Frame(MARGIN_X, BOTTOM, LAND_CONTENT_W, LAND_H - TOP - BOTTOM, id="land", leftPadding=0, rightPadding=0,
                     topPadding=0, bottomPadding=0)
        cover = Frame(0, 0, PAGE_W, PAGE_H, id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate("cover", [cover], onPage=lambda c, d: draw_cover(c, d.meta)),
                               PageTemplate("body", [body], onPageEnd=self._chrome, pagesize=A4),
                               PageTemplate("land", [land], onPageEnd=self._chrome, pagesize=landscape(A4))])

    def beforeDocument(self):
        self.section_start = {}

    def afterDocument(self):
        self.total_pages = self.page  # used by the next multiBuild pass for "Page x of N"

    def afterFlowable(self, flowable):
        pass

    def _chrome(self, c, doc):
        draw_header(c, doc)
        draw_footer(c, doc)


def build(path, meta: dict, story):
    """story: a list of flowables, or a zero-argument callable returning one. A callable is preferred: each
    pass then gets fresh flowables (ReportLab marks moved flowables as postponed, which breaks a re-run)."""
    make = story if callable(story) else (lambda: story)
    doc = BSSReport(path, meta)
    doc.multiBuild(make(), maxPasses=12)
    total = doc.page
    doc = BSSReport(path, meta)
    doc.total_pages = total             # second build prints "Page x of N" with the final count
    doc.multiBuild(make(), maxPasses=12)
    return doc


def toc() -> TableOfContents:
    t = TableOfContents()
    t.levelStyles = [S["toc0"], S["toc1"]]
    t.dotsMinLevel = 0
    return t


# --------------------------------------------------------------------------- page chrome
def tricolour(c, x, y, w, h):
    c.saveState()
    p = c.beginPath()
    p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)
    c.linearGradient(x, y, x + w, y, (SAFFRON, colors.white, GREEN), (0, 0.5, 1), extend=False)
    c.restoreState()


def draw_header(c, doc):
    c.saveState()
    PAGE_W, PAGE_H = c._pagesize
    CONTENT_W = PAGE_W - 2 * MARGIN_X
    top = PAGE_H - 22
    logo = branding.logo_path()
    if logo.exists():
        c.drawImage(str(logo), MARGIN_X, top - 30, width=26, height=30, mask="auto", preserveAspectRatio=True)
    c.setFillColor(BLUE)
    c.setFont(HB, 11.5)
    c.drawString(MARGIN_X + 33, top - 12, branding.brand("name"))
    c.setFont(B, 7)
    c.setFillColor(MUTED)
    sub = "Labour & Contractor Compliance Audit  ·  " + doc.meta.get("contractor_short", "")
    right = f"Report {doc.meta.get('report_no', '')}  ·  Wage month {doc.meta.get('wage_month', '')}"
    room = CONTENT_W - 33 - c.stringWidth(right, B, 6.8) - 18
    while c.stringWidth(sub + "…", B, 7) > room and len(sub) > 20:
        sub = sub[:-2]
    c.drawString(MARGIN_X + 33, top - 23, sub if sub.endswith(doc.meta.get("contractor_short", "")) else sub.rstrip() + "…")
    sec = doc.current_section or ""
    if sec:
        cont = doc.section_start.get(sec, c.getPageNumber()) < c.getPageNumber()
        c.setFont(BB, 7.4)
        c.setFillColor(BLUE)
        c.drawRightString(PAGE_W - MARGIN_X, top - 12, (sec + ("  (continued)" if cont else "")).upper())
    c.setFont(B, 6.8)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - MARGIN_X, top - 23, f"Report {doc.meta.get('report_no', '')}  ·  Wage month {doc.meta.get('wage_month', '')}")
    tricolour(c, MARGIN_X, top - 37, CONTENT_W, 2.4)
    c.restoreState()


def draw_footer(c, doc):
    c.saveState()
    PAGE_W = c._pagesize[0]
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.6)
    c.line(MARGIN_X, 38, PAGE_W - MARGIN_X, 38)
    c.setFont(B, 6.8)
    c.setFillColor(MUTED)
    c.drawString(MARGIN_X, 26, branding.brand("footer"))
    c.setFont(BB, 6.8)
    c.setFillColor(hexc(COL["critical"]))
    c.drawCentredString(PAGE_W / 2 + 70, 26, "CONFIDENTIAL")
    c.setFont(B, 7.2)
    c.setFillColor(MUTED)
    n = doc.total_pages
    c.drawRightString(PAGE_W - MARGIN_X, 26, f"Page {c.getPageNumber()}" + (f" of {n}" if n else ""))
    c.restoreState()


def _pill(c, x, y, text, fill, fg=colors.white, size=8, pad=7, font=None):
    font = font or BB
    w = c.stringWidth(text, font, size) + 2 * pad
    c.setFillColor(fill)
    c.roundRect(x, y, w, size + 8, (size + 8) / 2, stroke=0, fill=1)
    c.setFillColor(fg)
    c.setFont(font, size)
    c.drawString(x + pad, y + 5, text)
    return w


def draw_gauge(c, cx, cy, r, score: float, label="Compliance score", thickness=13):
    """Semi-circular gauge: grey track, value arc coloured by band (red < 50 ≤ amber < 75 ≤ green)."""
    c.saveState()
    band = branding.status_color("Non-Complied") if score < 50 else branding.status_color(
        "Partially Complied") if score < 75 else branding.status_color("Complied")
    c.setLineCap(1)
    c.setLineWidth(thickness)
    c.setStrokeColor(hexc("#E6EBF0"))
    p = c.beginPath()
    p.arc(cx - r, cy - r, cx + r, cy + r, 0, 180)
    c.drawPath(p, stroke=1, fill=0)
    c.setStrokeColor(hexc(band))
    p = c.beginPath()
    ext = max(1.5, 180 * min(score, 100) / 100)
    p.arc(cx - r, cy - r, cx + r, cy + r, 180, -ext)
    c.drawPath(p, stroke=1, fill=0)
    for t in (0, 50, 75, 100):
        a = math.radians(180 - 180 * t / 100)
        c.setFont(B, 6)
        c.setFillColor(MUTED)
        c.drawCentredString(cx + (r + thickness + 3) * math.cos(a), cy + (r + thickness + 3) * math.sin(a) - 2, str(t))
    c.setFillColor(INK)
    c.setFont(HB, 24)
    c.drawCentredString(cx, cy + 4, f"{score:.0f}%")
    c.setFont(BB, 7)
    c.setFillColor(MUTED)
    c.drawCentredString(cx, cy - 9, label.upper())
    c.restoreState()


def draw_cover(c, meta: dict):
    c.saveState()
    band_h = PAGE_H * 0.56
    y0 = PAGE_H - band_h
    c.setFillColor(BLUE)
    c.rect(0, y0, PAGE_W, band_h, stroke=0, fill=1)
    # decorative concentric arcs (the logo's bridge-and-circle motif)
    c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.06))
    for i, rr in enumerate(range(140, 520, 46)):
        c.setLineWidth(10 - i)
        c.circle(PAGE_W - 40, y0 + 40, rr, stroke=1, fill=0)
    tricolour(c, 0, y0 - 6, PAGE_W, 6)
    # logo plate
    c.setFillColor(colors.white)
    c.roundRect(MARGIN_X, PAGE_H - 118, 74, 82, 10, stroke=0, fill=1)
    logo = branding.logo_path()
    if logo.exists():
        c.drawImage(str(logo), MARGIN_X + 7, PAGE_H - 112, width=60, height=70, mask="auto", preserveAspectRatio=True)
    c.setFillColor(colors.white)
    c.setFont(HB, 22)
    c.drawString(MARGIN_X + 92, PAGE_H - 70, branding.brand("name"))
    c.setFont(B, 9)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.82))
    c.drawString(MARGIN_X + 92, PAGE_H - 86, branding.brand("tagline"))
    c.setFont(BB, 7.5)
    c.setFillColor(SAFFRON)
    c.drawString(MARGIN_X + 92, PAGE_H - 104, "COMPLIANCE INTELLIGENCE  ·  AI-ASSISTED DOCUMENT AUDIT")
    # title block
    c.setFillColor(colors.white)
    c.setFont(HB, 30)
    c.drawString(MARGIN_X, PAGE_H - 200, "Labour & Contractor")
    c.drawString(MARGIN_X, PAGE_H - 236, "Compliance Audit Report")
    c.setFont(B, 11)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.86))
    c.drawString(MARGIN_X, PAGE_H - 262, meta.get("subtitle", ""))
    w1 = _pill(c, MARGIN_X, PAGE_H - 300, f"WAGE MONTH  {meta.get('wage_month_long', '')}", SAFFRON, INK, 8.5)
    w2 = _pill(c, MARGIN_X + w1 + 8, PAGE_H - 300, f"{meta.get('checkpoints', '')} CHECKPOINTS AUDITED", colors.white, BLUE, 8.5)
    if meta.get("engine_pill"):
        _pill(c, MARGIN_X + w1 + w2 + 16, PAGE_H - 300, meta["engine_pill"], GREEN, colors.white, 8.5)
    # contractor headline
    c.setFont(HS, 15)
    c.setFillColor(colors.white)
    c.drawString(MARGIN_X, y0 + 52, meta.get("contractor", ""))
    c.setFont(B, 9)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.8))
    c.drawString(MARGIN_X, y0 + 34, f"Principal employer: {meta.get('principal_employer', '')}   ·   Site: {meta.get('site_short', '')}")
    # meta grid
    rows = meta.get("cover_rows", [])
    top = y0 - 40
    colw = 300
    for i, (k, v) in enumerate(rows):
        yy = top - i * 31
        c.setFont(BB, 6.8)
        c.setFillColor(MUTED)
        c.drawString(MARGIN_X, yy, k.upper())
        c.setFont(B, 9.2)
        c.setFillColor(INK)
        text = str(v)
        while c.stringWidth(text, B, 9.2) > colw and len(text) > 10:
            text = text[:-2]
        if text != str(v):
            text = text.rstrip() + "…"
        c.drawString(MARGIN_X, yy - 12, text)
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
        c.line(MARGIN_X, yy - 18, MARGIN_X + colw, yy - 18)
    # gauge panel
    gx, gw = MARGIN_X + colw + 30, PAGE_W - MARGIN_X - (MARGIN_X + colw + 30)
    c.setFillColor(PANEL)
    c.roundRect(gx, top - 228, gw, 248, 10, stroke=0, fill=1)
    draw_gauge(c, gx + gw / 2, top - 90, 62, meta.get("score", 0))
    risk = meta.get("overall_risk", "")
    c.setFont(BB, 6.8)
    c.setFillColor(MUTED)
    c.drawCentredString(gx + gw / 2, top - 130, "OVERALL RISK RATING")
    rw = c.stringWidth(risk.upper(), BB, 10) + 28
    _pill(c, gx + gw / 2 - rw / 2, top - 156, risk.upper(), risk_c(risk), colors.white, 10, 14)
    c.setFont(B, 7.2)
    c.setFillColor(INK)
    for i, line in enumerate(meta.get("cover_stats", [])):
        c.drawCentredString(gx + gw / 2, top - 180 - i * 11, line)
    # bottom strip
    c.setFillColor(BLUE)
    c.rect(0, 0, PAGE_W, 34, stroke=0, fill=1)
    tricolour(c, 0, 34, PAGE_W, 2.5)
    c.setFont(B, 7)
    c.setFillColor(colors.white)
    c.drawString(MARGIN_X, 14, meta.get("classification", "Confidential"))
    c.drawRightString(PAGE_W - MARGIN_X, 14, f"Report No. {meta.get('report_no', '')}  ·  Generated {meta.get('generated', '')}")
    c.restoreState()


# --------------------------------------------------------------------------- building blocks
def section_header(number: str, title: str, intro: str | None = None, toc_level=0) -> list:
    badge = Table([[P(f"<font color='white'>{number}</font>", _ps('n', HB, 13, 15, colors.white, TA_CENTER), raw=True)]],
                  colWidths=[30], rowHeights=[30])
    badge.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                               ("ROUNDEDCORNERS", [6, 6, 6, 6])]))
    head = Table([[badge, P(title, "h1")]], colWidths=[40, CONTENT_W - 40])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    rule = Table([[""]], colWidths=[CONTENT_W], rowHeights=[2.2])
    rule.setStyle(TableStyle([("LINEABOVE", (0, 0), (0, 0), 2.2, SAFFRON), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    out = [SectionMarker(f"{number}  {title}", toc_level), head, Spacer(1, 6), rule, Spacer(1, 4)]
    if intro:
        out.append(P(intro, "lead"))
    return out


def subsection(title: str, toc=True, visible=True) -> list:
    return ([SectionMarker(title, 1, key=f"sub-{title}")] if toc else []) + ([P(title, "h2")] if visible else [Spacer(1, 6)])


def kpi_row(items: list[tuple], height=62) -> Table:
    """items: (value, label, accent_hex, sub)"""
    n = len(items)
    w = (CONTENT_W - (n - 1) * 6) / n
    cells = []
    for value, label, accent, sub in items:
        inner = [P(str(value), _ps("kv", HB, 18 if len(str(value)) < 7 else 14, 21, hexc(accent))),
                 P(label.upper(), "kpi_l"), P(sub or "", "kpi_s")]
        cells.append(inner)
    data, widths = [], []
    for i, cell in enumerate(cells):
        data.append(cell)
        widths.append(w)
        if i < n - 1:
            data.append("")
            widths.append(6)
    t = Table([data], colWidths=widths, rowHeights=[height])
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 7), ("LEFTPADDING", (0, 0), (-1, -1), 9)]
    for i, (_, _, accent, _) in enumerate(items):
        col = i * 2
        st += [("BACKGROUND", (col, 0), (col, 0), PANEL), ("LINEBEFORE", (col, 0), (col, 0), 3, hexc(accent))]
    t.setStyle(TableStyle(st))
    return t


def chip(status: str, size=6.0) -> Paragraph:
    st = _ps("chip", BB, size, size + 2, status_c(status), TA_CENTER)
    return Paragraph(STATUS_LABEL.get(status, status.upper()), st)


def risk_chip(risk: str, size=6.0) -> Paragraph:
    col = {"Low": hexc("#9A4B47")}.get(risk, risk_c(risk) if risk not in ("None", "") else MUTED)
    return Paragraph(risk.upper() if risk and risk != "None" else "—", _ps("rchip", BB, size, size + 2, col, TA_CENTER))


def callout(text: str, accent="#F4A300", title: str | None = None, bg=None) -> Table:
    body = ([P(title, _ps("ct", BB, 8.6, 11, INK))] if title else []) + [P(text, "body_j", raw=True)]
    t = Table([[body]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg or SAFFRON_SOFT),
                           ("LINEBEFORE", (0, 0), (0, -1), 3.5, hexc(accent)),
                           ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    return t


def figure(path, width=CONTENT_W, caption: str | None = None, title: str | None = None, keep=True):
    from PIL import Image as PILImage
    with PILImage.open(path) as im:
        w, h = im.size
    img = Image(str(path), width=width, height=width * h / w)
    img.hAlign = "LEFT"
    parts = ([P(title, "h3")] if title else []) + [img]
    if caption:
        parts.append(P(caption, "cap"))
    return KeepTogether(parts) if keep else parts


def bullets(items: list[str], color="#F4A300") -> list:
    return [Paragraph(safe(t), S["bullet"], bulletText="■") for t in items]


class Gauge(Flowable):
    def __init__(self, score, size=150, label="Compliance score"):
        super().__init__()
        self.score, self.size, self.label = score, size, label
        self.width, self.height = size, size * 0.62

    def draw(self):
        draw_gauge(self.canv, self.size / 2, 18, self.size * 0.36, self.score, self.label, thickness=11)


class Bar(Flowable):
    """Thin horizontal proportion bar: list of (value, hex)."""

    def __init__(self, parts, width=CONTENT_W, height=9):
        super().__init__()
        self.parts, self.width, self.height = parts, width, height

    def draw(self):
        tot = sum(v for v, _ in self.parts) or 1
        x = 0
        for v, col in self.parts:
            w = self.width * v / tot
            if w <= 0:
                continue
            self.canv.setFillColor(hexc(col))
            self.canv.rect(x, 0, max(w - 1.5, 0.5), self.height, stroke=0, fill=1)
            x += w


__all__ = ["build", "toc", "section_header", "subsection", "kpi_row", "chip", "risk_chip", "callout", "figure",
           "bullets", "Gauge", "Bar", "P", "S", "safe", "CONTENT_W", "NextPageTemplate", "PageBreak", "Spacer",
           "KeepTogether", "Table", "TableStyle", "status_c", "status_soft", "risk_c", "hexc", "STATUS_LABEL"]
