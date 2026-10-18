"""BSS-branded Excel workbook — the item-level audit (Section 05 onwards of the report).

Built from the same view model as the HTML and PDF (report_model.build), so the three never disagree.

Sheets
  Cover             brand, report control, KPIs, status counts, contents with links
  05 Audit Areas    every line item under its audit area (navy band + objective per area), every Remarks
                    sub-check as a collapsible row under its item, status / risk colour-coded
  Area Scorecard    every audit area: counts, score (data bar), risk — linked to its band in 05
  Worker Register   Annexure A: every flagged finding per worker, grouped under a band per worker
  Evidence          every finding of every row: expected (ground truth) vs found (contractor), source › page/row
  Sub-checks        verdict for every Remarks sub-check
  All Checkpoints   flat, filterable list of all catalogue rows with final verdict and rule-check verdict
  Worker Matrix     worker-wise parameter matrix (as in the PDF's compliance view)
  Exposure          indicative financial exposure with workings per worker
  Documents         Annexure B: every file, document type, how it was read
  Assurance         Annexure C: coverage, DeepSeek vs rule check, processing notes
  Legend            status and risk definitions

Every sheet: branded title band, frozen header, filters where useful, A4 landscape print set-up
(fit to width, header row repeated, branded footer with page x of y).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.formatting.rule import DataBarRule
from openpyxl.styles import Alignment, Border, Font, NamedStyle, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.page import PageMargins

from . import branding
from .checks import name_list

T = branding.theme()
C = T["colors"]
HEAD_FONT, BODY_FONT = "Poppins", "Inter"
NAVY, SAFFRON, GREEN = C["primary"].lstrip("#"), C["secondary"].lstrip("#"), C["accent"].lstrip("#")
MUTED, BORDER_C, PANEL, SOFT = C["text_muted"].lstrip("#"), "D6DEE8", "F3F6F9", C["primary_soft"].lstrip("#")
THIN = Side(style="thin", color=BORDER_C)
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
WRAPC = Alignment(wrap_text=True, vertical="top", horizontal="center")
MID = Alignment(vertical="center", wrap_text=True)
RISK_FILL = {"Critical": ("7F0000", "FFFFFF"), "High": ("FBE9E9", "C62828"), "Medium": ("FDF1D8", "B5651D"), "Low": ("F7ECEB", "9A4B47")}
MONEY = '"₹"#,##0'


def _by(origin: str) -> str:
    return "DeepSeek (rule flag overridden)" if "overridden" in str(origin) else "DeepSeek" if str(origin).startswith("deepseek") else "Rules"


@lru_cache(maxsize=None)
def fill(hex_):
    return PatternFill("solid", fgColor=hex_.lstrip("#"))


@lru_cache(maxsize=None)
def font(size=9, bold=False, color="1A1A1A", head=False, italic=False):
    return Font(name=HEAD_FONT if head else BODY_FONT, size=size, bold=bold, color=color.lstrip("#"), italic=italic)


class Book:
    def __init__(self, model: dict):
        self.m = model
        self.wb = Workbook()
        self.first = True
        self.sc = model["status_colors"]
        self.ss = model["status_soft"]
        self._styles: dict[tuple, str] = {}

    # ------------------------------------------------------------------ sheet scaffolding
    def sheet(self, title: str, subtitle: str, widths: list[float], landscape=True):
        ws = self.wb.active if self.first else self.wb.create_sheet()
        self.first = False
        ws.title = title[:31]
        ws.sheet_view.showGridLines = False
        n = len(widths)
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w
        meta = self.m["meta"]
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n)
        c = ws.cell(1, 1, f"{meta['brand']['name']}  ·  {title}")
        c.font, c.fill, c.alignment = font(14, True, "FFFFFF", head=True), fill(NAVY), Alignment(vertical="center", indent=1)
        ws.row_dimensions[1].height = 30
        for i in range(1, n + 1):
            ws.cell(1, i).fill = fill(NAVY)
            ws.cell(2, i).fill = fill(SAFFRON)
        ws.row_dimensions[2].height = 4
        ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=n)
        c = ws.cell(3, 1, f"{subtitle}   |   Report {meta['report_no']}  ·  {meta['contractor']}  ·  {meta['site_short']}  ·  Wage month {meta['wage_month']}")
        c.font, c.alignment = font(9, color=MUTED), Alignment(vertical="center", indent=1)
        ws.row_dimensions[3].height = 20
        ws.page_setup.orientation = "landscape" if landscape else "portrait"
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_margins = PageMargins(left=0.35, right=0.35, top=0.5, bottom=0.55)
        ws.oddFooter.left.text = f"{meta['brand']['name']} | Confidential Audit Report | {meta['report_no']}"
        ws.oddFooter.left.size = 8
        ws.oddFooter.right.text = "Page &P of &N"
        ws.oddFooter.right.size = 8
        ws.oddHeader.right.text = f"&\"{BODY_FONT},Bold\"{title}"
        ws.oddHeader.right.size = 8
        return ws

    def header(self, ws, row: int, labels: list[str], freeze=True, filt=True):
        for i, h in enumerate(labels, start=1):
            c = ws.cell(row, i, h)
            c.font, c.fill, c.alignment, c.border = font(8.5, True, "FFFFFF"), fill("11496F"), MID, BOX
        ws.row_dimensions[row].height = 30
        if freeze:
            ws.freeze_panes = ws.cell(row + 1, 1)
        ws.print_title_rows = f"{row}:{row}"
        self._filter_row = row if filt else None
        return row + 1

    def finish_filter(self, ws, ncols: int):
        if getattr(self, "_filter_row", None):
            ws.auto_filter.ref = f"A{self._filter_row}:{get_column_letter(ncols)}{max(ws.max_row, self._filter_row + 1)}"

    def _named(self, size, bold, color, bg, center, money) -> str:
        """One registered NamedStyle per distinct look. Assigning a style by name is far cheaper than building
        Font/Fill objects per cell, which keeps very large workbooks fast."""
        key = (size, bold, color, bg, center, money)
        name = self._styles.get(key)
        if name is None:
            name = f"bss{len(self._styles)}"
            st = NamedStyle(name=name, font=font(size, bold, color), alignment=WRAPC if center else WRAP, border=BOX,
                            number_format=MONEY if money else "General")
            if bg:
                st.fill = fill(bg)
            self.wb.add_named_style(st)
            self._styles[key] = name
        return name

    def row(self, ws, r: int, values: list, zebra=False, status_cols=(), risk_cols=(), money_cols=(), center_cols=(), bold_cols=(), size=9):
        values = [v[:32000] + " …" if isinstance(v, str) and len(v) > 32000 else v for v in values]   # Excel cell limit 32,767
        for i, v in enumerate(values):
            bold, color, bg, center = i in bold_cols, "1A1A1A", "FAFBFD" if zebra else None, i in center_cols
            if i in status_cols and v in self.sc:
                bold, color, bg, center = True, self.sc[v].lstrip("#"), self.ss[v].lstrip("#"), True
            elif i in risk_cols:
                if v in RISK_FILL:
                    bg, color = RISK_FILL[v]
                    bold, center = True, True
                elif v in ("None", None, ""):
                    v, color, center = "—", MUTED, True
            c = ws.cell(r + 0, i + 1, v)
            c.style = self._named(size, bold, color, bg, center, i in money_cols)

    def status_cell(self, c):
        v = c.value
        if v in self.sc:
            c.style = self._named(9, True, self.sc[v].lstrip("#"), self.ss[v].lstrip("#"), True, False)

    def risk_cell(self, c):
        v = c.value
        if v in RISK_FILL:
            bg, fg = RISK_FILL[v]
            c.style = self._named(9, True, fg, bg, True, False)
        elif v in ("None", None, ""):
            c.value = "—"
            c.style = self._named(9, False, MUTED, None, True, False)

    def band(self, ws, r: int, ncols: int, text: str, bg=NAVY, fg="FFFFFF", size=10.5, height=22, head=True):
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=ncols)
        c = ws.cell(r, 1, text)
        c.font, c.alignment = font(size, True, fg, head=head), Alignment(vertical="center", indent=1, wrap_text=True)
        for i in range(1, ncols + 1):
            ws.cell(r, i).fill = fill(bg)
        ws.row_dimensions[r].height = height


# ====================================================================== sheets
def cover(b: Book):
    m, k = b.m, b.m["kpi"]
    meta = m["meta"]
    ws = b.sheet("Cover", "Item-level audit workbook", [3, 30, 22, 22, 22, 22, 22, 3], landscape=False)
    logo = branding.logo_path()
    r = 5
    if logo.exists():
        img = XLImage(str(logo))
        img.height, img.width = 74, 65
        ws.add_image(img, f"B{r}")
    ws.merge_cells(f"C{r}:G{r}")
    ws[f"C{r}"] = meta["brand"]["name"]
    ws[f"C{r}"].font = font(22, True, NAVY, head=True)
    ws.merge_cells(f"C{r + 1}:G{r + 1}")
    ws[f"C{r + 1}"] = meta["brand"]["tagline"]
    ws[f"C{r + 1}"].font = font(10, color=MUTED)
    ws.merge_cells(f"C{r + 2}:G{r + 2}")
    ws[f"C{r + 2}"] = "COMPLIANCE INTELLIGENCE  ·  AI-ASSISTED DOCUMENT AUDIT"
    ws[f"C{r + 2}"].font = font(9, True, SAFFRON)
    for rr in range(r, r + 3):
        ws.row_dimensions[rr].height = 22
    r += 4
    b.band(ws, r, 8, "Labour & Contractor Compliance Audit — Detailed Audit Workbook", size=15, height=34)
    r += 1
    b.band(ws, r, 8, "Section 05 onwards of the audit report: every line item, every Remarks sub-check, every worker finding", bg=SOFT, fg=NAVY,
           size=9.5, height=20, head=False)
    r += 2
    pairs = [("Report number", meta["report_no"]), ("Contractor", meta["contractor"]), ("Principal employer", meta["principal_employer"]),
             ("Site / location", meta["site"]), ("Wage month / period", f"{meta['wage_month']}  ({meta['period']})"),
             ("Audit date", meta["audit_date"]), ("Registrations", meta["registrations"]), ("Verdict engine", meta["engine"]),
             ("Catalogue", meta["catalogue"]), ("Documents examined", meta["documents"]), ("Classification", meta["classification"])]
    for kname, v in pairs:
        ws.cell(r, 2, kname).font = font(9, True, MUTED)
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
        c = ws.cell(r, 3, v)
        c.font, c.alignment = font(10, color="1A1A1A"), Alignment(wrap_text=True, vertical="top")
        for col in range(2, 8):
            ws.cell(r, col).border = Border(bottom=THIN)
        ws.row_dimensions[r].height = 30 if len(str(v)) > 70 else 18
        r += 1
    r += 1
    tiles = [("Compliance score", f"{k['score']:.1f}%", b.sc["Non-Complied"] if k["score"] < 50 else b.sc["Partially Complied"] if k["score"] < 75 else b.sc["Complied"]),
             ("Overall risk", k["overall_risk"].upper(), RISK_FILL.get(k["overall_risk"], ("", "C62828"))[1]),
             ("Checkpoints", f"{k['total']}", NAVY), ("Sub-checks", f"{k['subchecks']}", NAVY),
             ("Flags", f"{k['flags']}", "C62828")]
    for i, (lab, val, col) in enumerate(tiles):
        cl = 2 + i if i else 2
        c = ws.cell(r, cl, lab.upper())
        c.font, c.fill = font(8, True, MUTED), fill(PANEL)
        c2 = ws.cell(r + 1, cl, val)
        c2.font, c2.fill, c2.alignment = font(18, True, col, head=True), fill(PANEL), Alignment(horizontal="left", vertical="center", indent=1)
        c.alignment = Alignment(indent=1)
        c.border = Border(left=Side(style="thick", color=col.lstrip("#")))
        c2.border = Border(left=Side(style="thick", color=col.lstrip("#")))
    ws.row_dimensions[r + 1].height = 32
    r += 3
    ws.cell(r, 2, "STATUS").font = font(8, True, MUTED)
    ws.cell(r, 3, "CHECKPOINTS").font = font(8, True, MUTED)
    r += 1
    for s, n in k["counts"].items():
        ws.cell(r, 2, s)
        ws.cell(r, 3, n).alignment = Alignment(horizontal="center")
        b.status_cell(ws.cell(r, 2))
        ws.cell(r, 2).alignment = Alignment(horizontal="left", indent=1)
        r += 1
    r += 1
    ws.cell(r, 2, "CONTENTS").font = font(9, True, NAVY, head=True)
    r += 1
    for name, desc in CONTENTS:
        c = ws.cell(r, 2, name)
        c.hyperlink = f"#'{name}'!A1"
        c.font = Font(name=BODY_FONT, size=9.5, bold=True, color="1D6FB8", underline="single")
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
        ws.cell(r, 3, desc).font = font(9, color=MUTED)
        r += 1
    ws.print_area = f"A1:H{r}"


CONTENTS = [("05 Audit Areas", "Every line item under its audit area, with Remarks sub-checks (click ▸/▾ in the margin to fold sub-checks)"),
            ("Area Scorecard", "Every audit area with counts, score and risk — click an area to jump to it"),
            ("Worker Register", "Annexure A — every flagged finding for every worker"),
            ("Evidence", "Every finding: expected (ground truth) vs found (contractor documents), with source › page / row"),
            ("Sub-checks", "Verdict for every Remarks sub-check"),
            ("All Checkpoints", "Flat, filterable list of every catalogue row"),
            ("Worker Matrix", "Worker-wise compliance by parameter"),
            ("Exposure", "Indicative financial exposure and workings"),
            ("Documents", "Annexure B — every file examined and how it was read"),
            ("Assurance", "Annexure C — coverage, DeepSeek vs rule check, processing notes"),
            ("Legend", "Status and risk definitions")]


def audit_areas(b: Book) -> dict:
    cols = ["#", "ID", "Audit step / point", "Parameter verified", "Verification point", "Act", "AI action", "Risk",
            "Compliance status", "Observation", "Verdict by", "Rule check", "Workers flagged"]
    widths = [6, 8, 44, 20, 30, 18, 11, 9, 16, 60, 10, 15, 30]
    ws = b.sheet("05 Audit Areas", "Section 05 — line-item results by audit area", widths)
    ws.sheet_properties.outlinePr.summaryBelow = False
    r = b.header(ws, 5, cols, filt=False)
    anchors = {}
    n = len(cols)
    for a in b.m["areas"]:
        k = a["counts"]
        sc = f"{a['score']}%" if a["score"] is not None else "n/a"
        anchors[a["no"]] = r
        b.band(ws, r, n, f"{a['no']:02d}   {a['name'].upper()}        score {sc}  ·  {a['n']} line items  ·  risk {a['risk'].upper() if a['risk'] != 'None' else 'NONE'}"
               f"  ·  C {k['Complied']}  PC {k['Partially Complied']}  NC {k['Non-Complied']}  DNA {k['Document Not Available']}", height=24)
        r += 1
        b.band(ws, r, n, f"Objective: {a['objective']}", bg=SOFT, fg=NAVY, size=9.5, height=20, head=False)
        r += 1
        for ln in a["lines"]:
            fw = sorted({f["worker"] for f in ln["flagged"] if f["entity"] == "worker"})
            flagged = (f"{len(fw)}: " if len(fw) > 12 else "") + name_list(fw, 12)
            obs = ln["observation"] + (f"\n⚑ {ln['cross_check']}" if ln["cross_check"].startswith("Rule check") else "") + \
                (f"\nScoping note: {ln['reason']}" if ln["reason"] else "")
            b.row(ws, r, [ln["no"], ln["id"], ln["step"], ln["parameter"], ln["verification"], ln["act"], ln["action"], ln["risk"], ln["status"],
                          obs, "DeepSeek" if ln["verdict_by"] == "deepseek" else "Rules", ln["rule_status"], flagged],
                  status_cols=(8, 11), risk_cols=(7,), center_cols=(0, 1, 6, 10), bold_cols=(0, 1, 2))
            if ln["sheet"] == "Not Possible":
                ws.cell(r, 2).font = font(9, True, "7B3F99")
            ws.row_dimensions[r].height = max(30, min(150, 12 * (1 + max(len(ln["step"]) // 48, len(obs) // 70, len(flagged) // 32))))
            r += 1
            for s in ln["subchecks"]:
                b.row(ws, r, ["", "", f"↳ Remark: {s['text']}", "", "", "", "Sub-check", s["risk"], s["status"], s["observation"],
                              "DeepSeek" if s.get("by") == "deepseek" else "Rules", s.get("rule_status", ""), ""],
                      status_cols=(8, 11), risk_cols=(7,), center_cols=(6, 10), size=8.5)
                for col in range(1, n + 1):
                    cell = ws.cell(r, col)
                    if col not in (8, 9, 12):
                        cell.fill = fill("F7F9FB")
                ws.cell(r, 3).font = font(8.5, italic=True, color=MUTED)
                ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=6)
                ws.row_dimensions[r].outlineLevel = 1
                ws.row_dimensions[r].height = max(24, min(90, 12 * (1 + max(len(s["text"]) // 90, len(s["observation"]) // 70))))
                r += 1
        r += 1
    return anchors


def area_scorecard(b: Book, anchors: dict):
    cols = ["#", "Audit area", "Objective", "Line items", "Complied", "Partial", "Non-Complied", "DNA", "Other", "Flags", "Score %", "Risk"]
    ws = b.sheet("Area Scorecard", f"{len(b.m['areas'])} audit areas — click an area to open its line items", [6, 38, 60, 10, 10, 10, 12, 8, 8, 8, 12, 10])
    r = b.header(ws, 5, cols)
    first = r
    for i, a in enumerate(b.m["areas"]):
        k = a["counts"]
        b.row(ws, r, [a["no"], a["name"], a["objective"], a["n"], k["Complied"], k["Partially Complied"], k["Non-Complied"],
                      k["Document Not Available"], k["Not Verifiable"] + k["Not Applicable"] + k["Not Auditable"], a["flags"],
                      a["score"] if a["score"] is not None else None, a["risk"]], zebra=i % 2 == 1, risk_cols=(11,), center_cols=range(3, 11),
              bold_cols=(1,))
        c = ws.cell(r, 2)
        c.hyperlink = f"#'05 Audit Areas'!A{anchors[a['no']]}"
        c.font = Font(name=BODY_FONT, size=9, bold=True, color="1D6FB8", underline="single")
        ws.cell(r, 11).number_format = '0"%"'
        for j, s in ((5, "Complied"), (6, "Partially Complied"), (7, "Non-Complied"), (8, "Document Not Available")):
            ws.cell(r, j).font = font(9, True, b.sc[s])
        r += 1
    ws.conditional_formatting.add(f"K{first}:K{r - 1}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=100,
                                                                       color=GREEN, showValue=True))
    t = b.m["category_totals"]
    b.row(ws, r, ["", "TOTAL", "", t["total"], t["c"], t["pc"], t["nc"], t["dna"], t["other"], t["flags"], t["score"], b.m["kpi"]["overall_risk"]],
          center_cols=range(3, 11), risk_cols=(11,))
    for col in range(1, 12):
        ws.cell(r, col).fill, ws.cell(r, col).font = fill(NAVY), font(9.5, True, "FFFFFF")
    ws.cell(r, 11).number_format = '0"%"'
    b.finish_filter(ws, len(cols))


def worker_register(b: Book):
    cols = ["ID", "Check", "Expected / ground truth", "Found in contractor documents", "Source › location", "Status", "Risk", "What is wrong", "By"]
    ws = b.sheet("Worker Register", "Annexure A — every flagged finding, worker by worker", [8, 36, 32, 36, 34, 16, 9, 50, 9])
    r = b.header(ws, 5, cols, filt=False)
    for w in b.m["workers"]:
        if not w["items"]:
            continue
        b.band(ws, r, len(cols), f"{w['worker']}   ·   {w['code']}   ·   {w['designation'] or '—'}" + (f"   ·   ground truth: {w['gt']}" if w["gt"] else "")
               + f"        {w['flags']} flags  ·  risk score {w['score']}" + ("" if w["on_rolls"] else "  ·  NOT ON CONTRACTOR ROLLS"), height=22)
        ws.cell(r, 1).border = Border(left=Side(style="thick", color=SAFFRON))
        r += 1
        for i, it in enumerate(w["items"]):
            b.row(ws, r, [it["id"], it["item"], it["expected"], it["found"], it["source"], it["status"], it["risk"], it["observation"],
                          _by(it["origin"])], zebra=i % 2 == 1, status_cols=(5,), risk_cols=(6,),
                  center_cols=(0, 8), bold_cols=(0,))
            ws.row_dimensions[r].outlineLevel = 1
            r += 1
        r += 1


def evidence(b: Book):
    cols = ["ID", "Audit area", "Item", "Sub-check", "Entity", "Worker", "Emp code", "Expected / ground truth", "Found", "Source › location",
            "Status", "Risk", "Observation", "By"]
    ws = b.sheet("Evidence", "Every finding of every checkpoint, with its source", [8, 22, 34, 24, 8, 22, 10, 30, 32, 32, 16, 9, 46, 9])
    r = b.header(ws, 5, cols)
    i = 0
    for a in b.m["areas"]:
        for ln in a["lines"]:
            for f in ln["findings"]:
                b.row(ws, r, [ln["id"], a["name"], ln["step"], f["subcheck"], f["entity"], f["worker"], f["code"], f["expected"], f["found"], f["source"],
                              f["status"], f["risk"], f["observation"], _by(f["origin"])],
                      zebra=i % 2 == 1, status_cols=(10,), risk_cols=(11,), center_cols=(0, 4, 6, 13), size=8.5)
                r += 1
                i += 1
    b.finish_filter(ws, len(cols))


def subchecks(b: Book):
    cols = ["ID", "Audit area", "Item", "Sub-check (catalogue Remarks)", "Status", "Risk", "Observation", "By"]
    ws = b.sheet("Sub-checks", "Verdict for every Remarks sub-check", [8, 22, 40, 50, 16, 9, 60, 9])
    r = b.header(ws, 5, cols)
    i = 0
    for a in b.m["areas"]:
        for ln in a["lines"]:
            for s in ln["subchecks"]:
                b.row(ws, r, [ln["id"], a["name"], ln["step"], s["text"], s["status"], s["risk"], s["observation"],
                              "DeepSeek" if s.get("by") == "deepseek" else "Rules"], zebra=i % 2 == 1, status_cols=(4,), risk_cols=(5,), center_cols=(0, 7))
                r += 1
                i += 1
    b.finish_filter(ws, len(cols))


def all_checkpoints(b: Book):
    cols = ["ID", "Sheet", "Audit area", "Check area", "Item", "Rulebook ref", "Act", "Remarks / reason", "Status", "Risk", "Result",
            "Verdict by", "Rule check", "DeepSeek vs rule note"]
    ws = b.sheet("All Checkpoints", "Flat list of every catalogue row", [8, 11, 22, 20, 40, 34, 20, 30, 16, 9, 50, 10, 15, 34])
    r = b.header(ws, 5, cols)
    i = 0
    for a in b.m["areas"]:
        for ln in a["lines"]:
            b.row(ws, r, [ln["id"], ln["sheet"], a["name"], ln["check_area"], ln["step"], ln["ref"], ln["act"], ln["remarks"] or ln["reason"],
                          ln["status"], ln["risk"], ln["observation"], "DeepSeek" if ln["verdict_by"] == "deepseek" else "Rules", ln["rule_status"],
                          ln["cross_check"]], zebra=i % 2 == 1, status_cols=(8, 12), risk_cols=(9,), center_cols=(0, 1, 11), size=8.5)
            r += 1
            i += 1
    b.finish_filter(ws, len(cols))


def worker_matrix(b: Book):
    params = b.m["worker_params"]
    cols = ["Worker", "Code", "On rolls", "Designation", "DOJ", "Wage", "UAN", "ESIC IP"] + [p["label"] for p in params] + ["Score %", "Flags", "Observation"]
    ws = b.sheet("Worker Matrix", "Worker-wise compliance by parameter", [24, 10, 8, 18, 11, 11, 14, 13] + [12] * len(params) + [9, 7, 60])
    r = b.header(ws, 5, cols)
    for i, w in enumerate(b.m["workers"]):
        b.row(ws, r, [w["worker"], w["code"], "Yes" if w["on_rolls"] else "NO", w["designation"], w["doj"], w["wage"], w["uan"], w["esic"]]
              + [w["params"][p["key"]] for p in params] + [w["pct"], w["flags"], w["obs"]], zebra=i % 2 == 1,
              status_cols=range(8, 8 + len(params)), center_cols=[1, 2] + list(range(8, 10 + len(params))), bold_cols=(0,), size=8.5)
        if not w["on_rolls"]:
            ws.cell(r, 3).font = font(8.5, True, "C62828")
        r += 1
    b.finish_filter(ws, len(cols))
    b._filter_row = None
    r += 1
    for p in params:
        ws.cell(r, 1, p["label"]).font = font(8.5, True, NAVY)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
        ws.cell(r, 2, p["desc"]).font = font(8.5, color=MUTED)
        r += 1
    b.finish_filter(ws, len(cols))


def exposure(b: Book):
    cols = ["Exposure head", "Nature", "Indicative ₹", "Workers", "Consequence if unresolved"]
    ws = b.sheet("Exposure", "Indicative financial exposure for the wage month (not a legal demand)", [40, 28, 14, 50, 50])
    r = b.header(ws, 5, cols, filt=False)
    for i, e in enumerate(b.m["exposure"]):
        b.row(ws, r, [e["head"], e["nature"], e["amount"], e["workers"], e["consequence"]], zebra=i % 2 == 1, money_cols=(2,), bold_cols=(0,))
        ws.cell(r, 3).font = font(9, True, "C62828")
        r += 1
        for w in e.get("rows", []):                 # workings: one row per worker, folded under the head
            b.row(ws, r, ["", f"↳ {w['worker']}", w["amount"], "", ""], money_cols=(2,), size=8.5)
            ws.row_dimensions[r].outlineLevel = 1
            r += 1
    b.row(ws, r, ["TOTAL INDICATIVE EXPOSURE", "", b.m["exposure_total"], "", "Excludes interest u/s 7Q, damages u/s 14B and penalties"], money_cols=(2,))
    for col in range(1, 6):
        ws.cell(r, col).fill, ws.cell(r, col).font = fill(NAVY), font(9.5, True, "FFFFFF")


def documents(b: Book):
    cols = ["Folder", "File", "Document type", "Pages", "Read from", "Error"]
    ws = b.sheet("Documents", "Annexure B — every file examined", [14, 70, 16, 8, 26, 30])
    r = b.header(ws, 5, cols)
    for i, d in enumerate(b.m["documents"]):
        b.row(ws, r, [d["root"], d["rel"], d["type"], d["pages"], d["read"], d["error"]], zebra=i % 2 == 1, center_cols=(2, 3))
        r += 1
    b.finish_filter(ws, len(cols))


def assurance(b: Book):
    k, m = b.m["kpi"], b.m
    ws = b.sheet("Assurance", "Annexure C — how completeness and accuracy are assured", [38, 30, 18, 18, 60])
    r = 5
    rows = [("Catalogue", m["meta"]["catalogue"]), ("Rows audited", f"{k['total']} of {k['total']} ({k['possible']} Possible + {k['not_possible']} Not Possible)"),
            ("Remarks sub-checks with a verdict", f"{k['subchecks']} of {k['subchecks']}"), ("Verdict engine", m["meta"]["engine"]),
            ("Narrative", m["narrative"]["source"]), ("Rows with a DeepSeek verdict", str(k["ai_rows"])),
            ("Rows where DeepSeek differs from the rule check", str(k["differs"])),
            ("DeepSeek usage", ", ".join(f"{a}: {v}" for a, v in (m["usage"] or {}).items() if a != "models") or "not used")]
    for kname, v in rows:
        ws.cell(r, 1, kname).font = font(9.5, True, NAVY)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
        ws.cell(r, 2, v).font = font(9.5)
        for col in range(1, 6):
            ws.cell(r, col).border = Border(bottom=THIN)
        r += 1
    r += 1
    b.band(ws, r, 5, "Rows where DeepSeek differs from the rule check — reviewer attention", size=10)
    r += 1
    r = b.header(ws, r, ["ID", "Item", "Rule check", "Final", "Note"], freeze=False, filt=False)
    for d in m["differs"] or [{"id": "—", "item": "No disagreement", "rule": "", "final": "", "note": ""}]:
        b.row(ws, r, [d["id"], d["item"], d["rule"], d["final"], d["note"]], status_cols=(2, 3))
        r += 1
    r += 1
    b.band(ws, r, 5, "Processing notes", size=10)
    r += 1
    for note in m["issues"] or ["None"]:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
        ws.cell(r, 1, f"• {note}").font = font(9, color=MUTED)
        ws.cell(r, 1).alignment = WRAP
        r += 1


def legend(b: Book):
    ws = b.sheet("Legend", "Status and risk codes", [28, 90], landscape=False)
    r = b.header(ws, 5, ["Compliance status", "Meaning"], freeze=False, filt=False)
    for s in b.m["status_legend"]:
        b.row(ws, r, [s["status"], s["def"]], status_cols=(0,))
        r += 1
    r += 1
    r = b.header(ws, r, ["Risk level", "Typical cases"], freeze=False, filt=False)
    for x in b.m["risk_legend"]:
        b.row(ws, r, [x["risk"], x["def"]], risk_cols=(0,))
        r += 1
    r += 1
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    ws.cell(r, 1, "Compliance score = (Complied + ½ × Partially Complied) ÷ (Complied + Partially Complied + Non-Complied + Document Not Available). "
                  "Not Verifiable, Not Applicable and Not Auditable rows are excluded. Overall risk = the highest risk among failing checkpoints.").alignment = WRAP
    ws.row_dimensions[r].height = 42


def build_workbook(model: dict, path: Path) -> Path:
    b = Book(model)
    cover(b)
    anchors = audit_areas(b)
    area_scorecard(b, anchors)
    worker_register(b)
    evidence(b)
    subchecks(b)
    all_checkpoints(b)
    worker_matrix(b)
    exposure(b)
    documents(b)
    assurance(b)
    legend(b)
    for ws in b.wb.worksheets:
        ws.sheet_properties.tabColor = NAVY if ws.title in ("Cover", "05 Audit Areas") else SAFFRON if ws.title in ("Area Scorecard", "Worker Register") else "8A94A0"
    for ws in b.wb.worksheets:                 # extracted text / file names can start with "=": never a formula
        for row in ws.iter_rows():
            for cell in row:
                if cell.data_type == "f":
                    cell.data_type = "s"
    b.wb.active = 0
    b.wb.properties.title = f"BSS Audit Workbook — {model['meta']['report_no']}"
    b.wb.properties.creator = model["meta"]["auditor"]
    b.wb.properties.company = model["meta"]["brand"]["name"]
    b.wb.save(path)
    return path
