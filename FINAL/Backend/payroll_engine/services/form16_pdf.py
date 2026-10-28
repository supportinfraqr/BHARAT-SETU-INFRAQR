"""Form 16 PDF (Part A + Part B) — port of ``utils/form16Pdf.js`` (pdfkit -> reportlab).

Exported (legacy -> port):
    buildForm16PdfBuffer      -> build_form16_pdf_buffer(form16)        -> bytes
    buildForm16PartAPdfBuffer -> build_form16_part_a_pdf_buffer(form16)
    buildForm16PartBPdfBuffer -> build_form16_part_b_pdf_buffer(form16)
    Form16Layout, formatInr (format_inr), safeStr (safe_str)

``Form16Layout`` keeps the legacy explicit-Y layout engine (top-left coordinates, same
margins / row heights / column widths); reportlab's bottom-left origin is translated in
``_ry``. Every section, label and amount of the legacy PDF is reproduced.
"""

import io
import math
import re
from datetime import datetime, timezone

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from .financial_year import LOCAL_TZ
from .jsmath import is_nullish, js_str, num0

BLACK = HexColor("#000000")
BORDER = HexColor("#000000")
HEADER_BG = HexColor("#eeeeee")
MARGIN = 32
ROW_H = 18
HDR_H = 20
CELL_PAD = 6
LABEL_W = 78
GAP_LINE = 6
GAP_SECTION = 6
GAP_BLOCK = 4
PART_BREAK = 10
PAGE_TOP = MARGIN
LINE_FACTOR = 1.16  # Helvetica line height / font size (pdfkit heightOfString)


def _group_indian(int_text):
    if len(int_text) <= 3:
        return int_text
    head, tail = int_text[:-3], int_text[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail])


def format_inr(amount=None):
    """``(Number(x) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})``."""
    n = num0(amount)
    if math.isinf(n):
        return "∞" if n > 0 else "-∞"
    rounded = math.floor(abs(n) + 0.5)  # Intl "halfExpand" (away from zero)
    text = _group_indian(str(int(rounded)))
    return ("-" if n < 0 or (n == 0 and math.copysign(1, n) < 0) else "") + text


_WS = re.compile(r"\s+")


def safe_str(v=None, fb="—"):
    if is_nullish(v) or js_str(v).strip() == "":
        return fb
    return _WS.sub(" ", js_str(v)).strip()


def locale_datetime_en_in(iso_text):
    """``new Date(x).toLocaleString('en-IN')`` in the legacy server zone (Asia/Kolkata)."""
    try:
        text = str(iso_text).replace("Z", "+00:00")
        d = datetime.fromisoformat(text)
    except (TypeError, ValueError):
        return "Invalid Date"
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    d = d.astimezone(LOCAL_TZ)
    hour = d.hour % 12 or 12
    return f"{d.day}/{d.month}/{d.year}, {hour}:{d.minute:02d}:{d.second:02d} {'am' if d.hour < 12 else 'pm'}"


def build_table_layout(content_w):
    sl, amt = 34, 112
    mid = content_w - sl - amt
    return {"widths": [sl, mid, amt], "sl": sl, "amt": amt, "tableW": content_w}


class Form16Layout:
    """Explicit-Y layout over a reportlab canvas (top-left coordinates like pdfkit)."""

    def __init__(self, doc):
        self.doc = doc
        self.page_w, self.page_h = A4
        self.left = MARGIN
        self.w = self.page_w - MARGIN * 2
        self.y = MARGIN
        self.page_bottom = self.page_h - MARGIN
        tbl = build_table_layout(self.w)
        self.col_widths = tbl["widths"]
        self.table_w = tbl["tableW"]
        self.col_x = [self.left, self.left + tbl["sl"], self.left + tbl["sl"] + tbl["widths"][1],
                      self.left + self.table_w]

    # ----------------------------------------------------------------- primitives
    def _ry(self, y):
        return self.page_h - y

    def _font(self, bold):
        return "Helvetica-Bold" if bold else "Helvetica"

    def _lines(self, text, width, size, bold, line_break=True):
        text = safe_str(text, "")
        if not line_break:
            return [text]
        out = []
        for para in text.split("\n"):
            out.extend(simpleSplit(para, self._font(bold), size, max(width, 1)) or [""])
        return out or [""]

    def measure(self, s, width, size=8, bold=False, line_break=True):
        lines = self._lines(s, width, size, bold, line_break)
        return len(lines) * size * LINE_FACTOR

    def paint(self, y, s, size=8, bold=False, width=None, align="left", line_break=True, x=None):
        width = self.w if width is None else width
        x = self.left if x is None else x
        text = safe_str(s, "—")
        font = self._font(bold)
        self.doc.setFillColor(BLACK)
        self.doc.setFont(font, size)
        lines = self._lines(text, width, size, bold, line_break)
        leading = size * LINE_FACTOR
        for i, line in enumerate(lines):
            baseline = self._ry(y + i * leading + size * 0.93)
            if align == "right":
                self.doc.drawRightString(x + width, baseline, line)
            elif align == "center":
                self.doc.drawCentredString(x + width / 2, baseline, line)
            else:
                self.doc.drawString(x, baseline, line)
        return self.measure(text, width, size, bold)

    def add_page(self):
        self.doc.showPage()
        self.y = PAGE_TOP

    def space_left(self):
        return self.page_bottom - self.y

    def rows_fit_on_page(self, include_header=True):
        overhead = HDR_H if include_header else 0
        return max(0, math.floor((self.space_left() - overhead) / ROW_H))

    def _cell_text(self, cell, idx, row_len):
        is_amt = idx == row_len - 1
        if is_amt and isinstance(cell, (int, float)) and not isinstance(cell, bool):
            return format_inr(cell)
        return safe_str(cell)

    def row_height(self, row):
        heights = []
        for idx, cell in enumerate(row):
            is_amt = idx == len(row) - 1
            txt = self._cell_text(cell, idx, len(row))
            width = self.col_widths[idx] - CELL_PAD * 2
            heights.append(max(ROW_H, math.ceil(self.measure(txt, width, 8, is_amt, idx == 1)) + 8))
        return max(heights)

    def count_rows_that_fit(self, include_header, start_idx, rows):
        used = HDR_H if include_header else 0
        count = 0
        for i in range(start_idx, len(rows)):
            rh = self.row_height(rows[i])
            if used + rh > self.space_left():
                break
            used += rh
            count += 1
        return count

    def line(self, s, size=8, bold=False, width=None, align="left", line_break=True, gap_after=GAP_LINE):
        h = self.measure(s, self.w if width is None else width, size, bold)
        if self.y + h + gap_after > self.page_bottom:
            self.add_page()
        drawn = self.paint(self.y, s, size=size, bold=bold, width=width, align=align, line_break=line_break)
        self.y += drawn + gap_after
        return drawn

    def section_break(self, extra=GAP_SECTION):
        self.y += extra

    def start_part_b(self):
        if self.y + 80 > self.page_bottom:
            self.add_page()
        else:
            self.y += PART_BREAK

    def centered(self, lines, size=8, bold=False, gap=6):
        for t in lines:
            self.line(t, size=size, bold=bold, width=self.w, align="center", gap_after=gap)

    def part_header(self, title, subtitle=None):
        self.line(title, size=11, bold=True, align="center", line_break=False, gap_after=6)
        if subtitle:
            self.line(subtitle, size=8, align="center", gap_after=GAP_BLOCK)

    def _rect(self, x, y, w, h, fill=None, stroke=True, width=0.6):
        self.doc.setLineWidth(width)
        self.doc.setStrokeColor(BORDER)
        if fill is not None:
            self.doc.setFillColor(fill)
        self.doc.rect(x, self._ry(y + h), w, h, stroke=1 if stroke else 0, fill=1 if fill is not None else 0)

    def _hline(self, x0, x1, y, width):
        self.doc.setLineWidth(width)
        self.doc.setStrokeColor(BORDER)
        self.doc.line(x0, self._ry(y), x1, self._ry(y))

    def _vline(self, x, y0, y1, width):
        self.doc.setLineWidth(width)
        self.doc.setStrokeColor(BORDER)
        self.doc.line(x, self._ry(y0), x, self._ry(y1))

    def draw_detail_grid(self, rows):
        half = self.w / 2
        value_w = half - LABEL_W - CELL_PAD * 2
        heights = []
        for ll, lv, rl, rv in rows:
            h1 = max(self.measure(ll, LABEL_W - 2, 7), self.measure(lv, value_w, 8, True))
            h2 = max(self.measure(rl, LABEL_W - 2, 7), self.measure(rv, value_w, 8, True))
            heights.append(max(22, h1, h2) + CELL_PAD * 2)
        block_h = sum(heights)
        if self.y + block_h > self.page_bottom:
            self.add_page()
        x0, y0 = self.left, self.y
        self._rect(x0, y0, self.w, block_h, width=0.6)
        self._vline(x0 + half, y0, y0 + block_h, 0.5)
        ry = y0
        for i, (ll, lv, rl, rv) in enumerate(rows):
            if i > 0:
                self._hline(x0, x0 + self.w, ry, 0.4)
            ty = ry + CELL_PAD
            self.paint(ty, ll, x=x0 + CELL_PAD, size=7, width=LABEL_W - 2)
            self.paint(ty, lv, x=x0 + LABEL_W + CELL_PAD, size=8, bold=True, width=value_w)
            self.paint(ty, rl, x=x0 + half + CELL_PAD, size=7, width=LABEL_W - 2)
            self.paint(ty, rv, x=x0 + half + LABEL_W + CELL_PAD, size=8, bold=True, width=value_w)
            ry += heights[i]
        self.y = y0 + block_h + GAP_BLOCK

    def draw_table_header(self, y0):
        self._rect(self.col_x[0], y0, self.table_w, HDR_H, fill=HEADER_BG, stroke=False)
        for i, h in enumerate(["Sl.", "Particulars", "Amount (Rs.)"]):
            self.paint(y0 + 5, h, x=self.col_x[i] + CELL_PAD, size=8, bold=True,
                       width=self.col_widths[i] - CELL_PAD * 2,
                       align="right" if i == 2 else ("center" if i == 0 else "left"), line_break=False)

    def draw_table_row(self, cy, row, row_h=ROW_H):
        self._hline(self.col_x[0], self.col_x[0] + self.table_w, cy, 0.35)
        for idx, cell in enumerate(row):
            is_amt = idx == len(row) - 1
            txt = self._cell_text(cell, idx, len(row))
            wrap = idx == 1
            width = self.col_widths[idx] - CELL_PAD * 2
            text_h = self.measure(txt, width, 8, is_amt, wrap)
            ty = cy + max(4, (row_h - text_h) / 2)
            self.paint(ty, txt, x=self.col_x[idx] + CELL_PAD, size=8, bold=is_amt, width=width,
                       align="right" if is_amt else ("center" if idx == 0 else "left"), line_break=wrap)

    def stroke_table_frame(self, y0, block_h):
        self._rect(self.col_x[0], y0, self.table_w, block_h, width=0.6)
        for lx in self.col_x[1:-1]:
            self._vline(lx, y0, y0 + block_h, 0.35)

    def form_table(self, rows, continued=False):
        row_idx = 0
        while row_idx < len(rows):
            max_rows = self.count_rows_that_fit(True, row_idx, rows)
            if max_rows < 1:
                self.add_page()
                max_rows = self.count_rows_that_fit(True, row_idx, rows)
            if max_rows < 1:
                max_rows = 1
            rows_here = rows[row_idx:row_idx + max_rows]
            is_last = row_idx + len(rows_here) >= len(rows)
            y0 = self.y
            if row_idx > 0 or continued:
                self.paint(y0, "(continued)", size=7, width=self.w, align="right", line_break=False)
                self.y = y0 + 10
            header_y = self.y
            self.draw_table_header(header_y)
            cy = header_y + HDR_H
            body_h = 0
            for row in rows_here:
                rh = self.row_height(row)
                self.draw_table_row(cy, row, rh)
                cy += rh
                body_h += rh
            block_h = HDR_H + body_h
            self.stroke_table_frame(header_y, block_h)
            self.y = header_y + block_h + (GAP_BLOCK if is_last else 2)
            row_idx += len(rows_here)

    def section_table(self, num, title, rows):
        label = f"{num}. {title}" if num else title
        title_gap = 4
        title_h = self.measure(label, self.w, 9, True)
        first_h = self.row_height(rows[0]) if rows else ROW_H
        if self.space_left() < title_h + title_gap + HDR_H + first_h:
            self.add_page()
        title_y = self.y
        drawn = self.paint(title_y, label, size=9, bold=True)
        self.y = title_y + drawn + title_gap
        self.form_table(rows)
        tail_gap = GAP_BLOCK if len(rows) <= 2 else GAP_SECTION
        if self.space_left() > tail_gap + 8:
            self.section_break(tail_gap)
        else:
            self.y += 2


# ------------------------------------------------------------------------- Form 16


def _get(d, *path):
    for p in path:
        if not isinstance(d, dict):
            return None
        d = d.get(p)
    return d


def _or0(v):
    return v if (v not in (None, "", 0, False) and not (isinstance(v, float) and math.isnan(v))) else 0


def build_form16_pdf_context(form16):
    b = form16.get("partB") or {}
    c = form16.get("partC") or b.get("chapter6A") or {}
    d = form16.get("partD") or b.get("taxComputation") or {}
    part_a = form16.get("partA") or {}
    emp = form16.get("employeeDetails") or part_a.get("employee") or part_a
    regime = js_str(d.get("taxRegime") or "new")
    is_new = regime.lower() == "new"
    fy = safe_str(form16.get("financialYear"))
    ay = re.sub(r"^AY\s*", "", safe_str(form16.get("assessmentYear")), flags=re.IGNORECASE)
    less = b.get("lessAllowances") or {}

    salary_rows = [
        ["1", "Salary as per section 17(1) (Gross)", _or0(b.get("grossSalary"))],
        ["2", "Basic", _or0(b.get("basic"))],
        ["3", "House Rent Allowance (HRA)", _or0(b.get("hra"))],
        ["4", "Other Allowances", abs(num0(b.get("allowances")))],
        ["5", "Other Income reported", _or0(b.get("otherIncome"))],
        ["6", "Less: Exempt allowance u/s 10 (HRA etc.)", _or0(less.get("hraExemption"))],
        ["7", "Less: Standard deduction u/s 16(ia)", _or0(less.get("standardDeduction"))],
        ["8", "Less: Professional tax u/s 16(iii)", _or0(less.get("professionalTax"))],
        ["9", "Income chargeable under the head Salaries", _or0(b.get("incomeChargeableUnderSalaryHead"))],
    ]
    via_rows = [
        ["1", "Deduction u/s 80C", _or0(c.get("section80C"))],
        ["2", "Deduction u/s 80D", _or0(c.get("section80D"))],
        ["3", "Deduction u/s 80E", _or0(c.get("section80E"))],
        ["4", "Deduction u/s 80G", _or0(c.get("section80G"))],
        ["5", "Deduction u/s 24(b) (Home loan interest)", _or0(c.get("section24"))],
        ["6", "Total Chapter VI-A (declared)", _or0(c.get("total"))],
    ]
    tax_rows = [["1", f"Tax regime ({regime.upper()})", "—"]]
    if is_new:
        tax_rows.append(["", "Note: New regime — Chapter VI-A not reduced from taxable income", "—"])
    tax_rows += [
        ["2", "Taxable income", _or0(d.get("taxableIncome"))],
        ["3", "Tax on total income", _or0(d.get("incomeTax"))],
        ["4", "Surcharge", _or0(d.get("surcharge"))],
        ["5", "Health & education cess", _or0(d.get("cess"))],
        ["6", "Rebate u/s 87A", _or0(d.get("rebate"))],
        ["7", "Net tax payable", _or0(d.get("netTax"))],
        ["8", "Monthly TDS (calculated)", _or0(d.get("monthlyTDS"))],
    ]
    part_e_list = form16.get("partE") or b.get("tdsMonthWise") or []
    part_e_rows = [[str(i + 1), f"{js_str(r.get('month'))} {js_str(r.get('year'))}", r.get("tdsDeducted")]
                   for i, r in enumerate(part_e_list)]
    if not part_e_rows:
        part_e_rows.append(["1", "No TDS deducted in payroll", 0])
    quarter_rows = [[str(i + 1), f"{js_str(q.get('quarter'))} ({js_str(q.get('period'))})", _or0(q.get("tdsDeducted"))]
                    for i, q in enumerate(part_a.get("quarterlyTds") or [])]
    quarter_rows.append(["", "Total tax deducted (Financial Year)", _or0(form16.get("totalTDSDeducted"))])
    desc = form16.get("periodDescription")
    period_from = part_a.get("periodFrom") or (desc.split(" to ")[0] if desc else "—")
    period_to = part_a.get("periodTo") or ((desc.split(" to ") + [None])[1] if desc else "—")
    return {"partA": part_a, "emp": emp, "fy": fy, "ay": ay, "salaryRows": salary_rows,
            "viaRows": via_rows, "taxRows": tax_rows, "partERows": part_e_rows,
            "quarterRows": quarter_rows, "periodFrom": period_from, "periodTo": period_to}


def write_form16_cover_header(L, ctx):
    L.centered(["FORM NO. 16"], size=14, bold=True, gap=6)
    L.centered(["[See rule 31(1)(a) of the Income-tax Rules, 1962]"], size=7.5, gap=6)
    L.centered([f"Financial Year: {ctx['fy']}    |    Assessment Year: {ctx['ay']}"], size=9, bold=True, gap=8)
    L.section_break(6)


def write_form16_part_a(L, form16, ctx):
    er = form16.get("employerDetails") or {}
    emp = ctx["emp"]
    L.part_header("PART A", "TDS Certificate — tax deducted at source (Section 203)")
    L.line('Certificate for tax deducted at source from income chargeable under the head "Salaries"',
           size=8, gap_after=GAP_BLOCK)
    L.draw_detail_grid([
        ["Name of Employer", er.get("name"), "Name of Employee", emp.get("employeeName")],
        ["Address", er.get("address"), "PAN of Employee", emp.get("pan")],
        ["TAN of Employer", er.get("tan"), "Employee Code", emp.get("employeeCode")],
        ["PAN of Employer", er.get("pan"), "Designation", emp.get("designation")],
        ["Period (with employer)", f"{js_str(ctx['periodFrom'])} to {js_str(ctx['periodTo'])}",
         "Assessment Year", ctx["ay"]],
    ])
    L.section_table("", "Summary of tax deducted (quarter-wise from payroll)", ctx["quarterRows"])
    L.line(ctx["partA"].get("tracesNote")
           or "For challan-wise Part A (BSR code, date of deposit), download from TRACES portal by the employer.",
           size=7, gap_after=GAP_BLOCK)


def write_form16_part_b(L, form16, ctx):
    L.part_header("PART B", "Annexure — details of salary paid and tax computation")
    L.line("To be furnished to the employee by the employer under section 203 of the Income-tax Act, 1961",
           size=8, gap_after=GAP_BLOCK)
    L.section_table("1", "Details of salary paid and any other income", ctx["salaryRows"])
    L.section_table("2", "Deductions under Chapter VI-A (as declared by employee)", ctx["viaRows"])
    L.section_table("3", "Computation of tax on income", ctx["taxRows"])
    L.section_table("4", "Details of tax deducted during the year (month-wise)", ctx["partERows"])
    L.section_break(6)
    L.line(f"Total TDS deducted (must match Part A): Rs. {format_inr(form16.get('totalTDSDeducted'))}",
           size=9, bold=True, gap_after=GAP_BLOCK)


def write_form16_generated_footer(L, form16):
    L.line(f"Generated: {locale_datetime_en_in(form16.get('generatedOn'))}", size=7, align="right",
           line_break=False, gap_after=0)


def build_form16_pdf_promise(title, author, render):
    buf = io.BytesIO()
    doc = canvas.Canvas(buf, pagesize=A4)
    doc.setTitle(title)
    doc.setAuthor(author)
    L = Form16Layout(doc)
    render(L, doc)
    doc.showPage()
    doc.save()
    return buf.getvalue()


def _author(form16):
    return (form16.get("employerDetails") or {}).get("name") or "HRMS"


def build_form16_pdf_buffer(form16):
    def render(L, doc):
        ctx = build_form16_pdf_context(form16)
        write_form16_cover_header(L, ctx)
        write_form16_part_a(L, form16, ctx)
        L.start_part_b()
        write_form16_part_b(L, form16, ctx)
        L.line("Part A (TRACES challan certificate) + Part B (this annexure) together form Form 16 for "
               "employee records.", size=7, gap_after=GAP_LINE)
        write_form16_generated_footer(L, form16)

    return build_form16_pdf_promise(f"Form 16 - {js_str(form16.get('financialYear'))}", _author(form16), render)


def build_form16_part_a_pdf_buffer(form16):
    def render(L, doc):
        ctx = build_form16_pdf_context(form16)
        write_form16_cover_header(L, ctx)
        write_form16_part_a(L, form16, ctx)
        write_form16_generated_footer(L, form16)

    return build_form16_pdf_promise(f"Form 16 Part A - {js_str(form16.get('financialYear'))}",
                                    _author(form16), render)


def build_form16_part_b_pdf_buffer(form16):
    def render(L, doc):
        ctx = build_form16_pdf_context(form16)
        L.centered(["FORM NO. 16 — PART B"], size=14, bold=True, gap=6)
        L.centered([f"Financial Year: {ctx['fy']}    |    Assessment Year: {ctx['ay']}"], size=9, bold=True, gap=8)
        L.section_break(6)
        write_form16_part_b(L, form16, ctx)
        L.line("This annexure is Part B of Form 16. Download Part A separately for the TDS certificate.",
               size=7, gap_after=GAP_LINE)
        write_form16_generated_footer(L, form16)

    return build_form16_pdf_promise(f"Form 16 Part B - {js_str(form16.get('financialYear'))}",
                                    _author(form16), render)


_ = stringWidth
