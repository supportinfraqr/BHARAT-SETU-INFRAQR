"""Form 16 — port of ``controller/payroll/form16.js``.

HR routes: form16/summary, form16/bulk, form16/:employeeId (JSON), form16/:employeeId/download.
The employee "my" variants (employee/form16*) live in views/employee_payroll.py and call
``services.form16_builder`` / ``services.form16_pdf`` (exported here as well:
``generate_form16_data``, ``download_my_form16_part_pdf``).
"""

import re

from ..context import PayrollError, file_response, payroll_view, send_response
from ..services.form16_builder import build_form16_data
from ..services.form16_pdf import (build_form16_part_a_pdf_buffer, build_form16_part_b_pdf_buffer,
                                   build_form16_pdf_buffer)
from ..services.financial_year import resolve_financial_year_input
from ..services.jsmath import js_or, js_out, js_str


def build_form16_filename(employee, fy, part=None):
    emp = employee.to_dict() if hasattr(employee, "to_dict") else (employee or {})
    code = re.sub(r"[^\w.-]+", "_", js_str(js_or((emp.get("payrollInfo") or {}).get("employeeCode"),
                                                  emp.get("uniqueId"), "employee")))
    fy_key = re.sub(r"[^\w.-]+", "_", js_str(js_or((fy or {}).get("keyShort"), "FY")))
    return f"Form16_Part{part}_{code}_{fy_key}.pdf" if part else f"Form16_{code}_{fy_key}.pdf"


def _require_fy(value, message="financialYear is required (e.g. 2025-26)"):
    if not value:
        raise PayrollError(message, 400)
    return value


def generate_form16_data(ctx, employee_id, financial_year):
    result = build_form16_data(ctx.require_org(), str(employee_id), financial_year)
    if result.get("error"):
        raise PayrollError(result["error"], result["status"])
    return result


def download_my_form16_part_pdf(ctx, part=None):
    """Legacy ``downloadMyForm16PartPdf`` for the logged-in employee (part None/'A'/'B')."""
    if ctx.org is None or ctx.employee is None:
        raise PayrollError("Missing required information", 400)
    result = generate_form16_data(ctx, ctx.employee.pk, _require_fy(ctx.query("financialYear")))
    builder = {None: build_form16_pdf_buffer, "A": build_form16_part_a_pdf_buffer,
               "B": build_form16_part_b_pdf_buffer}[part]
    return file_response(builder(result["data"]), build_form16_filename(result["employee"], result["fy"], part))


@payroll_view(["GET"])
def generate_form16(ctx, employeeId):
    ctx.require_org()
    result = generate_form16_data(ctx, employeeId, _require_fy(ctx.query("financialYear")))
    return send_response(200, True, "Form 16 generated successfully", result["data"])


@payroll_view(["GET"])
def download_form16_pdf(ctx, employeeId):
    ctx.require_org()
    result = generate_form16_data(ctx, employeeId, _require_fy(ctx.query("financialYear")))
    return file_response(build_form16_pdf_buffer(result["data"]),
                         build_form16_filename(result["employee"], result["fy"]))


def _fy_or_400(value):
    if not value:
        raise PayrollError("financialYear is required", 400)
    fy = resolve_financial_year_input(value)
    if not fy["ok"]:
        raise PayrollError(fy["error"], 400)
    return fy


@payroll_view(["POST"])
def bulk_generate_form16(ctx):
    from ..models import EmployeeTDS

    org = ctx.require_org()
    financial_year = ctx.body.get("financialYear")
    fy = _fy_or_400(financial_year)
    results = []
    for rec in (EmployeeTDS.objects.filter(org=org, financial_year__in=fy["aliases"])
                .select_related("employee").order_by("created_at")):
        emp = rec.employee
        if emp is None:
            continue
        name = f"{emp.first_name or ''} {emp.last_name or ''}".strip()
        code = (emp.payroll_info or {}).get("employeeCode") or emp.unique_id
        try:
            built = build_form16_data(org, str(emp.pk), financial_year)
            results.append({
                "employeeId": str(emp.pk), "name": name, "email": emp.email, "employeeCode": code,
                "status": "failed" if built.get("error") else "ready",
                "error": built.get("error") or None,
                "totalTDSDeducted": js_or((built.get("data") or {}).get("totalTDSDeducted"), 0),
            })
        except Exception as err:  # noqa: BLE001 — legacy recorded per-employee failures
            results.append({"employeeId": str(emp.pk), "name": name, "status": "failed", "error": str(err)})
    ready = sum(1 for r in results if r["status"] == "ready")
    return send_response(200, True, "Bulk Form 16 generation completed", js_out({
        "financialYear": fy["keyShort"], "total": len(results), "ready": ready,
        "failed": len(results) - ready, "results": results,
        "downloadHint": "Use GET /payRoll/form16/:employeeId/download?financialYear=... for each PDF",
    }))


@payroll_view(["GET"])
def get_form16_summary(ctx):
    from ..models import EmployeeTDS

    org = ctx.require_org()
    fy = _fy_or_400(ctx.query("financialYear"))
    summary = {"totalEmployees": 0, "totalIncome": 0, "totalTaxDeducted": 0,
               "regimeWise": {"new": 0, "old": 0}, "departmentWise": {}}
    records = list(EmployeeTDS.objects.filter(org=org, financial_year__in=fy["aliases"])
                   .select_related("employee").order_by("created_at"))
    summary["totalEmployees"] = len(records)
    for rec in records:
        income = js_or((rec.projected_annual_income or {}).get("total"), 0)
        tax = js_or(rec.total_tds_deducted, 0)
        summary["totalIncome"] += income
        summary["totalTaxDeducted"] += tax
        summary["regimeWise"]["old" if rec.tax_regime == "old" else "new"] += 1
        # Legacy populated payrollInfo.department; BSS keeps department on the employee row.
        dept = ((rec.employee.payroll_info or {}).get("department") or rec.employee.department
                if rec.employee else None) or "Unknown"
        bucket = summary["departmentWise"].setdefault(dept, {"count": 0, "totalIncome": 0, "totalTax": 0})
        bucket["count"] += 1
        bucket["totalIncome"] += income
        bucket["totalTax"] += tax
    return send_response(200, True, "Form 16 summary fetched successfully", js_out({
        "financialYear": fy["keyShort"], "financialYearLabel": fy["label"], "summary": summary}))


ROUTES = [
    ("form16/summary", get_form16_summary, "form16_summary"),
    ("form16/bulk", bulk_generate_form16, "form16_bulk"),
    ("form16/<str:employeeId>/download", download_form16_pdf, "form16_download"),
    ("form16/<str:employeeId>", generate_form16, "form16_generate"),
]
