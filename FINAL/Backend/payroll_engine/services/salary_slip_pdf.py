"""Salary slip PDF — port of ``utils/salarySlipPdf.js`` (pdfkit -> reportlab).

Exported (legacy -> port):
    buildSalarySlipPdfBuffer   -> build_salary_slip_pdf_buffer(opts) -> bytes
    formatInr                  -> format_inr
    mergePayslipEarningsColumn -> merge_payslip_earnings_column
(+ normalize_payslip_line, format_organization_address, safe_str)

Same A4 layout: header card (logo / org name / address), divider, employee info grid
(Period, Generated, Employee Name, PAN, Employee ID, Bank Name, Department, Bank A/C No.,
Paid Days), the Earning | Fixed Salary | Earned Salary | Deductions | Amount (INR) table,
Gross Total / Total Deductions row, Net Salary box and the footer line.
"""

import io
import logging
import math
import re
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from .financial_year import LOCAL_TZ
from .jsmath import UNDEFINED, is_nullish, js_str, js_trim, num0, to_number

logger = logging.getLogger("payroll_engine")

COLORS = {
    "title": "#0f172a", "muted": "#475569", "orgName": "#0b1324", "pageBg": "#ffffff",
    "tableHeaderBg": "#dbeafe", "borderStrong": "#2563eb", "rowLine": "#bfdbfe",
    "grossBg": "#eff6ff", "netBg": "#dbeafe",
}
_LOP_RE = re.compile(r"^(loss\s*of\s*pay|lop)$", re.IGNORECASE)


def _group_en_in(int_part):
    if len(int_part) <= 3:
        return int_part
    head, tail = int_part[:-3], int_part[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups + [tail])


def format_inr(amount):
    """``Rs. ${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}``."""
    n = num0(amount)
    if math.isinf(n):
        return "Rs. ∞" if n > 0 else "Rs. -∞"
    d = Decimal(repr(abs(n))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    int_part, frac = f"{d:f}".split(".")
    frac = frac.rstrip("0")
    text = _group_en_in(int_part) + ("." + frac if frac else "")
    negative = n < 0 and d != 0
    return f"Rs. {'-' if negative else ''}{text}"


def safe_str(v, fallback="N/A"):
    if is_nullish(v) or v == "":
        return fallback
    return js_str(v)


def normalize_payslip_line(item, default_name="Component"):
    item = item or {}
    amount = num0(item.get("amount"))
    fixed = to_number(item.get("fixedAmount", UNDEFINED))
    return {
        "componentName": item.get("componentName") or item.get("name") or default_name,
        "fixedAmount": fixed if math.isfinite(fixed) else amount,
        "amount": amount,
        "calculationType": item.get("calculationType") or "",
    }


def merge_payslip_earnings_column(earnings=None, benefits=None, reimbursements=None):
    """Earnings column: basic earnings + benefits + reimbursements (display order)."""
    return ([normalize_payslip_line(e, "Earning") for e in (earnings or [])]
            + [normalize_payslip_line(b, "Benefit") for b in (benefits or [])]
            + [normalize_payslip_line(r, "Reimbursement") for r in (reimbursements or [])])


def format_organization_address(address):
    if not address:
        return ""
    if isinstance(address, str):
        return js_trim(address)
    if isinstance(address, dict):
        parts = [js_trim(js_str(address.get(k))) for k in
                 ("address1", "address2", "city", "state", "country", "zip")
                 if not is_nullish(address.get(k)) and js_trim(js_str(address.get(k))) != ""]
        seen, out = set(), []
        for p in parts:
            if p.lower() in seen:
                continue
            seen.add(p.lower())
            out.append(p)
        return ", ".join(out)
    return ""


def _image_reader(url):
    """Legacy fetched the logo over HTTP; here: local media path or http(s) URL."""
    from reportlab.lib.utils import ImageReader

    if not url:
        return None
    try:
        if str(url).startswith(("http://", "https://")):
            import urllib.request

            with urllib.request.urlopen(str(url), timeout=5) as resp:  # noqa: S310
                return ImageReader(io.BytesIO(resp.read()))
        from django.conf import settings
        import os

        path = str(url)
        media_url = getattr(settings, "MEDIA_URL", "/media/") or "/media/"
        if path.startswith(media_url):
            path = os.path.join(settings.MEDIA_ROOT, path[len(media_url):])
        if os.path.isfile(path):
            return ImageReader(path)
    except Exception as err:  # noqa: BLE001
        logger.info("IMAGE ERROR => %s", err)
    return None


def build_salary_slip_pdf_buffer(opts):
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import simpleSplit
    from reportlab.pdfbase.pdfmetrics import stringWidth
    from reportlab.pdfgen import canvas

    opts = opts or {}
    buf = io.BytesIO()
    page_w, page_h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("Salary Slip")
    c.setAuthor(opts.get("organizationName") or "HRMS")
    margin = 40
    page_left, page_right = margin, page_w - margin
    content_w = page_right - page_left

    # pdfkit uses a top-left origin; draw with Y converted.
    def Y(y):
        return page_h - y

    def text(s, x, y, size, font="Helvetica", color=COLORS["title"], width=None, align="left"):
        c.setFont(font, size)
        c.setFillColor(HexColor(color))
        s = js_str(s)
        baseline = Y(y + size * 0.8)
        if width is not None and stringWidth(s, font, size) > width:
            while s and stringWidth(s + "…", font, size) > width:
                s = s[:-1]
            s = s + "…"
        if align == "right" and width is not None:
            c.drawRightString(x + width, baseline, s)
        elif align == "center" and width is not None:
            c.drawCentredString(x + width / 2, baseline, s)
        else:
            c.drawString(x, baseline, s)

    def rect(x, y, w, h, fill=None, stroke=None, lw=1, radius=0):
        if fill:
            c.setFillColor(HexColor(fill))
        if stroke:
            c.setStrokeColor(HexColor(stroke))
        c.setLineWidth(lw)
        if radius:
            c.roundRect(x, Y(y + h), w, h, radius, fill=1 if fill else 0, stroke=1 if stroke else 0)
        else:
            c.rect(x, Y(y + h), w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)

    def line(x1, y1, x2, y2, color, lw=1):
        c.setStrokeColor(HexColor(color))
        c.setLineWidth(lw)
        c.line(x1, Y(y1), x2, Y(y2))

    rect(0, 0, page_w, page_h, fill=COLORS["pageBg"])
    y = margin

    logo = _image_reader(opts.get("organizationLogo"))
    logo_size = 50
    header_text_x = page_left + 90 if logo else page_left + 20
    header_text_w = content_w - (header_text_x - page_left) - 20
    org_name = safe_str(opts.get("organizationName"))
    org_address = format_organization_address(opts.get("organizationAddress"))

    name_lines = simpleSplit(org_name, "Helvetica-Bold", 18, header_text_w)[:2] or [""]
    org_name_h = len(name_lines) * 18 * 1.16
    addr_lines = simpleSplit(org_address, "Helvetica", 9.5, header_text_w)[:8] if org_address else []
    org_address_h = len(addr_lines) * 9.5 * 1.16
    pad, gap = 14, 6
    header_h = max(80, pad * 2 + logo_size,
                   pad * 2 + org_name_h + (gap + org_address_h if org_address_h else 0))
    rect(page_left, y, content_w, header_h, fill="#f8fafc", stroke="#d1d5db", radius=10)
    if logo:
        try:
            c.drawImage(logo, page_left + 15, Y(y + (header_h - logo_size) / 2 + logo_size),
                        logo_size, logo_size, preserveAspectRatio=True, mask="auto")
        except Exception as err:  # noqa: BLE001
            logger.info("Logo render failed: %s", err)
    text_y = y + (header_h - (org_name_h + (gap + org_address_h if org_address_h else 0))) / 2
    for i, ln in enumerate(name_lines):
        text(ln, header_text_x, text_y + i * 18 * 1.16, 18, "Helvetica-Bold", COLORS["orgName"])
    for i, ln in enumerate(addr_lines):
        text(ln, header_text_x, text_y + org_name_h + gap + i * 9.5 * 1.16, 9.5, "Helvetica",
             COLORS["muted"])
    line(page_left, y + header_h + 15, page_right, y + header_h + 15, "#cbd5e1", 1)
    y += header_h + 35

    label_w, info_gap = 105, 24
    val_w = (content_w - info_gap - label_w * 2) / 2
    left_x = page_left
    right_x = page_left + label_w + val_w + info_gap
    paid_days = to_number(opts.get("paidDays"))
    has_days = math.isfinite(paid_days)
    generated = datetime.now(LOCAL_TZ).strftime("%d/%m/%Y")
    rows = [
        (("Period", opts.get("payPeriodLabel")), ("Generated", generated)),
        (("Employee Name", opts.get("employeeName")), ("PAN", opts.get("pan"))),
        (("Employee ID", opts.get("employeeCode")), ("Bank Name", opts.get("bankName"))),
        (("Department", opts.get("department")), None),
        (("Bank A/C No.", opts.get("bankAccountNumber")), None),
    ]
    if has_days:
        rows.append((("Paid Days", js_str(clean_num(paid_days))), None))
    for idx, (left, right) in enumerate(rows):
        ry = y + idx * 18
        if left:
            text(f"{left[0]} :", left_x, ry, 10, "Helvetica", COLORS["muted"], label_w)
            text(safe_str(left[1]), left_x + label_w, ry, 10, "Helvetica-Bold", COLORS["title"],
                 val_w - 6)
        if right:
            text(f"{right[0]} :", right_x, ry, 10, "Helvetica", COLORS["muted"], label_w - 8)
            text(safe_str(right[1]), right_x + label_w, ry, 10, "Helvetica-Bold",
                 COLORS["title"], val_w - 6)
    y += len(rows) * 18 + 20

    earnings = merge_payslip_earnings_column(opts.get("earnings"), opts.get("benefits"),
                                             opts.get("reimbursements"))
    deductions = [d for d in (normalize_payslip_line(i, "Deduction")
                              for i in (opts.get("deductions") or []))
                  if not _LOP_RE.search(js_trim(js_str(d["componentName"])))]
    fixed_total = sum(num0(i["fixedAmount"]) for i in earnings)
    display_deductions = sum(num0(i["amount"]) for i in deductions)
    display_net = num0(opts.get("grossEarnings")) - display_deductions

    tx, ty, tw = page_left, y, content_w
    earn_w = tw * 0.58
    ded_w = tw - earn_w
    earn_name_w = earn_w * 0.46
    fixed_w = earn_w * 0.27
    earned_w = earn_w - earn_name_w - fixed_w
    ded_name_w = ded_w * 0.62
    ded_amt_w = ded_w - ded_name_w
    row_h, head_h, total_h = 28, 34, 30
    data_rows = max(len(earnings), len(deductions), 4)
    table_h = head_h + data_rows * row_h + total_h

    rect(tx, ty, tw, table_h, stroke=COLORS["borderStrong"], lw=1.2)
    rect(tx, ty, tw, head_h, fill=COLORS["tableHeaderBg"])
    v1 = tx + earn_name_w
    v2 = v1 + fixed_w
    v3 = tx + earn_w
    v4 = v3 + ded_name_w
    for xp in (v1, v2, v3, v4):
        line(xp, ty, xp, ty + table_h, COLORS["borderStrong"], 1)
    for i in range(data_rows + 1):
        ry = ty + head_h + i * row_h
        line(tx, ry, tx + tw, ry, COLORS["rowLine"], 0.8)
    for label, x, w in (("Earning", tx, earn_name_w), ("Fixed Salary", v1, fixed_w),
                        ("Earned Salary", v2, earned_w), ("Deductions", v3, ded_name_w),
                        ("Amount (INR)", v4, ded_amt_w)):
        text(label, x, ty + 10, 9, "Helvetica-Bold", COLORS["title"], w, "center")
    for i in range(data_rows):
        ry = ty + head_h + i * row_h + 9
        e = earnings[i] if i < len(earnings) else None
        d = deductions[i] if i < len(deductions) else None
        if e:
            text(e["componentName"] or "Component", tx + 6, ry, 9.5, width=earn_name_w - 12)
            text(format_inr(e["fixedAmount"]), v1 + 6, ry, 9.5, width=fixed_w - 12, align="right")
            text(format_inr(e["amount"]), v2 + 6, ry, 9.5, width=earned_w - 12, align="right")
        if d:
            text(d["componentName"] or "Component", v3 + 6, ry, 9.5, width=ded_name_w - 12)
            text(format_inr(d["amount"]), v4 + 6, ry, 9.5, width=ded_amt_w - 12, align="right")

    total_y = ty + head_h + data_rows * row_h
    rect(tx, total_y, earn_w, total_h, fill=COLORS["grossBg"])
    rect(v3, total_y, ded_w, total_h, fill=COLORS["grossBg"])
    rect(tx, total_y, tw, total_h, stroke=COLORS["borderStrong"], lw=1)
    for xp in (v1, v2, v3, v4):
        line(xp, total_y, xp, total_y + total_h, COLORS["borderStrong"], 1)
    text("Gross Total", tx + 6, total_y + 10, 10.5, "Helvetica-Bold", width=earn_name_w - 12)
    text(format_inr(fixed_total), v1 + 6, total_y + 10, 10.5, "Helvetica-Bold",
         width=fixed_w - 12, align="right")
    text(format_inr(opts.get("grossEarnings")), v2 + 6, total_y + 10, 10.5, "Helvetica-Bold",
         width=earned_w - 12, align="right")
    text("Total Deductions", v3 + 6, total_y + 10, 10.5, "Helvetica-Bold", width=ded_name_w - 12)
    text(format_inr(display_deductions), v4 + 6, total_y + 10, 10.5, "Helvetica-Bold",
         width=ded_amt_w - 12, align="right")
    y = total_y + total_h + 12

    net_x, net_h = page_left + earn_w, 34
    rect(net_x, y, ded_w, net_h, fill=COLORS["netBg"], stroke=COLORS["borderStrong"], lw=1)
    line(net_x + ded_name_w, y, net_x + ded_name_w, y + net_h, COLORS["borderStrong"], 1)
    text("Net Salary", net_x + 6, y + 10, 11, "Helvetica-Bold", width=ded_name_w - 12)
    text(format_inr(display_net), net_x + ded_name_w + 6, y + 10, 11, "Helvetica-Bold",
         width=ded_amt_w - 12, align="right")
    y += net_h + 14
    text("Computer generated salary slip", page_left, y, 8, "Helvetica", COLORS["muted"],
         content_w, "right")
    c.showPage()
    c.save()
    return buf.getvalue()


def clean_num(n):
    return int(n) if float(n).is_integer() else n
