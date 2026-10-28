"""Employee Tax Report PDF — port of ``utils/taxReportPdf.js`` (pdfkit -> reportlab).

Exported: ``build_tax_report_pdf_buffer(report) -> bytes``,
``build_tax_report_filename(report) -> str``. Uses the shared ``Form16Layout``.
"""

import re

from .form16_pdf import Form16Layout, build_form16_pdf_promise, format_inr, locale_datetime_en_in, safe_str
from .jsmath import js_str, num0

GAP_BLOCK = 4
GAP_LINE = 6


def build_tax_report_filename(report):
    code = re.sub(r"[^\w.-]+", "_", js_str(((report or {}).get("employee") or {}).get("employeeCode") or "employee"))
    fy = re.sub(r"[^\w.-]+", "_", js_str((report or {}).get("financialYear") or "FY"))
    return f"TaxReport_{code}_{fy}.pdf"


def _z(v):
    return v if v not in (None, "", 0, False) else 0


def _render(L, report):
    emp = report.get("employee") or {}
    fy = safe_str(report.get("financialYearLabel") or report.get("financialYear"))
    ay = safe_str(report.get("assessmentYear"))
    L.centered(["TAX REPORT"], size=14, bold=True, gap=4)
    L.centered(["Employee taxation summary"], size=8, gap=4)
    L.centered([f"{fy}  |  {ay}"], size=9, bold=True, gap=6)
    L.line(f"Period: {safe_str(report.get('periodDescription'))}", size=8, gap_after=GAP_BLOCK)
    L.draw_detail_grid([
        ["Employee", emp.get("employeeName"), "Code", emp.get("employeeCode")],
        ["PAN", emp.get("pan"), "Designation", emp.get("designation")],
        ["Proof", safe_str((report.get("proofStatus") or {}).get("proofStatus"), "pending"),
         "TDS calculated", "Yes" if report.get("tdsCalculated") else "No"],
    ])
    generated = f"Generated: {locale_datetime_en_in(report.get('generatedOn'))}"
    if not report.get("tdsCalculated"):
        L.section_break(8)
        L.line(safe_str(report.get("message"), "TDS not calculated for this financial year."),
               size=9, bold=True, gap_after=GAP_LINE)
        L.line(generated, size=7, align="right", line_break=False)
        return

    s = report.get("summary") or {}
    inc = report.get("income") or {}
    tax = report.get("taxComputation") or {}
    ch6 = report.get("chapter6A")
    is_old = js_str(s.get("taxRegime") or "").lower() == "old"
    L.section_table("", "Summary", [
        ["1", "Tax regime", s.get("taxRegimeLabel") or s.get("taxRegime")],
        ["2", "Gross income (projected)", _z(s.get("grossIncome"))],
        ["3", "Taxable income", _z(s.get("taxableIncome"))],
        ["4", "Total tax payable", _z(s.get("totalTax"))],
        ["5", "Monthly TDS", _z(s.get("monthlyTDS"))],
        ["6", "TDS deducted (FY)", _z(s.get("totalTDSDeducted"))],
        ["7", "Pending TDS", _z(s.get("pendingTDS"))],
    ])
    L.section_table("1", "Income (projected)", [
        ["1", "Basic salary", _z(inc.get("basic"))],
        ["2", "HRA", _z(inc.get("hra"))],
        ["3", "Other allowances", abs(num0(inc.get("allowances")))],
        ["4", "Other income", _z(inc.get("otherIncome"))],
        ["5", "Gross salary", _z(inc.get("grossSalary"))],
        ["6", "Standard deduction", _z(inc.get("standardDeduction"))],
        ["7", "Professional tax", _z(inc.get("professionalTax"))],
        ["8", "HRA exemption (old regime)", _z(inc.get("hraExemption")) if is_old else 0],
        ["9", "Income from salary", _z(inc.get("incomeFromSalary"))],
    ])
    if is_old and ch6:
        L.section_table("2", "Chapter VI-A (declared)", [
            ["1", "Section 80C", _z(ch6.get("section80C"))],
            ["2", "Section 80D", _z(ch6.get("section80D"))],
            ["3", "Section 80E", _z(ch6.get("section80E"))],
            ["4", "Section 80G", _z(ch6.get("section80G"))],
            ["5", "Section 24(b)", _z(ch6.get("section24"))],
            ["6", "Other deductions", _z(ch6.get("otherDeductions"))],
            ["7", "Total Chapter VI-A", _z(ch6.get("totalChapter6A"))],
        ])
    else:
        L.section_table("2", "Chapter VI-A", [["1", "Not applicable", "New tax regime selected"]])
    L.section_table("3", "Tax computation", [
        ["1", "Taxable income", _z(tax.get("taxableIncome"))],
        ["2", "Income tax", _z(tax.get("incomeTax"))],
        ["3", "Surcharge", _z(tax.get("surcharge"))],
        ["4", "Health & education cess", _z(tax.get("cess"))],
        ["5", "Rebate u/s 87A", _z(tax.get("rebateAmount"))],
        ["6", "Net tax liability", _z(tax.get("netTaxLiability"))],
        ["7", "Monthly TDS", _z(tax.get("monthlyTDS"))],
    ])
    tds = report.get("tdsDeductions") or {}
    rows = [[str(i + 1), f"{js_str(r.get('month'))} {js_str(r.get('year'))}", _z(r.get("tdsDeducted"))]
            for i, r in enumerate(tds.get("monthWise") or [])]
    if not rows:
        rows.append(["1", "No TDS deducted in payroll yet", 0])
    L.section_table("4", "TDS deducted (month-wise)", rows)
    quarterly = tds.get("quarterly") or []
    if quarterly:
        L.section_table("5", "TDS deducted (quarter-wise)",
                        [[str(i + 1), f"{js_str(q.get('quarter'))} — {js_str(q.get('period'))}", _z(q.get("tdsDeducted"))]
                         for i, q in enumerate(quarterly)])
    decl = report.get("declarations") or {}
    for num, key, title in (("6", "investments80C", "Investments — Section 80C"),
                            ("7", "investments80D", "Investments — Section 80D")):
        lines = decl.get(key) or []
        if lines:
            L.section_table(num, title, [[str(i + 1), safe_str(x.get("investmentType"), "Investment"),
                                          _z(x.get("amount"))] for i, x in enumerate(lines)])
    L.section_break(6)
    L.line(f"Total TDS deducted: Rs. {format_inr(tds.get('totalTDSDeducted'))}", size=9, bold=True,
           gap_after=GAP_BLOCK)
    L.line("For official certificate use Form 16 download.", size=7, gap_after=GAP_LINE)
    L.line(generated, size=7, align="right", line_break=False)


def build_tax_report_pdf_buffer(report):
    return build_form16_pdf_promise(f"Tax Report - {js_str(report.get('financialYear') or '')}", "HRMS",
                                    lambda L, doc: _render(L, report))


_ = Form16Layout
