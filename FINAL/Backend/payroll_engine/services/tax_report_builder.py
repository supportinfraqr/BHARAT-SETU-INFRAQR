"""Employee Tax Report payload — port of ``utils/taxReportBuilder.js``.

Exported: ``build_tax_report_data(org, employee_id, financial_year_input)`` (legacy
``buildTaxReportData(org_uuid, employeeId, financialYearInput)``) returning
``{"data", "employee", "fy", "tdsRecord"}`` or ``{"error", "status"}``.

The pure part (``build_tax_report_from``) takes the employee / TDS record / payroll run
documents as legacy JSON dicts so it can be compared with the JS output for the same data.
BSS: the employee PAN lives in ``nationalID.pan`` (legacy read ``payrollInfo.pan`` / ``pan``);
it is used as the last fallback.
"""

import uuid
from datetime import datetime, timezone

from .financial_year import build_financial_year_payroll_q, get_payroll_period_sort_key, resolve_financial_year_input
from .jsmath import clean, js_or, js_out, js_str, js_trim, num0


def get_indian_fy_quarter(month):
    m = js_trim(js_str(js_or(month, ""))).lower().replace(".", "")[:3]
    if m in ("apr", "may", "jun"):
        return "Q1"
    if m in ("jul", "aug", "sep"):
        return "Q2"
    if m in ("oct", "nov", "dec"):
        return "Q3"
    return "Q4"


def build_quarterly_tds_summary(month_wise, fy, sep="–"):
    s, e = fy["startYear"], fy["endYear"]
    template = {
        "Q1": {"quarter": "Q1", "period": f"April {s} {sep} June {s}", "tdsDeducted": 0},
        "Q2": {"quarter": "Q2", "period": f"July {s} {sep} September {s}", "tdsDeducted": 0},
        "Q3": {"quarter": "Q3", "period": f"October {s} {sep} December {s}", "tdsDeducted": 0},
        "Q4": {"quarter": "Q4", "period": f"January {e} {sep} March {e}", "tdsDeducted": 0},
    }
    for row in month_wise:
        template[get_indian_fy_quarter(row.get("month"))]["tdsDeducted"] += num0(row.get("tdsDeducted"))
    return list(template.values())


def _sort_key(fy):
    return lambda r: get_payroll_period_sort_key(r.get("month"), r.get("year"), fy["startYear"], fy["endYear"])


def build_month_wise_tds_from_payrolls(payrolls, fy):
    rows = []
    for payroll in payrolls:
        tds_line = next((d for d in (payroll.get("deductions") or [])
                         if "tds" in js_str(js_or(d.get("componentName"), "")).lower()), None)
        tds = num0(tds_line.get("amount")) if tds_line else 0
        if tds <= 0:
            continue
        rows.append({"month": payroll.get("month"), "year": payroll.get("year"), "tdsDeducted": tds,
                     "payrollId": payroll.get("_id")})
    return sorted(rows, key=_sort_key(fy))


def map_investment_lines(lines):
    return [{"investmentType": js_or(r.get("investmentType"), ""), "amount": num0(r.get("amount")),
             "attachment": js_or(r.get("attachment"), "")} for r in (lines or [])]


def build_declaration_summary(rec):
    d = rec.get("declaredDeductions") or {}
    it = rec.get("itDeclaration") or {}
    return {
        "declaredDeductions": {k: num0(d.get(k)) for k in (
            "section80C", "section80D", "section80E", "section80G", "section24", "professionalTax",
            "otherDeductions", "standardDeduction", "total")},
        "investments80C": map_investment_lines(rec.get("investments80C")),
        "investments80D": map_investment_lines(rec.get("investments80D")),
        "itDeclaration": {
            "stayingInRentedHouse": bool(it.get("stayingInRentedHouse")),
            "rentEntries": it.get("rentEntries") or [],
            "homeLoanSelfOccupied": it.get("homeLoanSelfOccupied") or {},
            "investmentsOther": it.get("investmentsOther") or [],
            "otherIncomeBreakdown": it.get("otherIncomeBreakdown") or {},
            "toggles": it.get("toggles") or {},
        },
    }


def _now_iso():
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def _employee_block(employee_id, employee):
    pi = employee.get("payrollInfo") or {}
    return {
        "employeeId": employee_id,
        "employeeName": f"{employee.get('firstName') or ''} {employee.get('lastName') or ''}".strip(),
        "employeeCode": pi.get("employeeCode") or employee.get("uniqueId") or "",
        "pan": pi.get("pan") or employee.get("pan") or (employee.get("nationalID") or {}).get("pan") or "",
        "designation": pi.get("designation") or employee.get("jobTitle") or "",
    }


def build_tax_report_from(employee_id, employee, tds_record, payrolls, fy, generated_on=None):
    """Pure core of ``buildTaxReportData`` (legacy JSON documents in, report ``data`` out)."""
    generated_on = generated_on or _now_iso()
    payrolls = sorted(payrolls, key=_sort_key(fy))
    assessment_year = f"{fy['startYear'] + 1}-{str(fy['endYear'] + 1)[-2:]}"
    emp_block = _employee_block(employee_id, employee)

    if not tds_record:
        return js_out({
            "viewType": "tax_report",
            "financialYear": fy["canonical"],
            "financialYearLabel": fy["label"],
            "assessmentYear": f"AY {assessment_year}",
            "periodDescription": f"April {fy['startYear']} to March {fy['endYear']}",
            "employee": emp_block,
            "tdsCalculated": False,
            "message": ("TDS not calculated for this financial year. Save investment declaration and "
                        "ask HR to run TDS calculation."),
            "proofStatus": {"proofSubmitted": False, "proofVerified": False, "proofStatus": "pending"},
            "payrollMonthsProcessed": len(payrolls),
            "generatedOn": generated_on,
        })

    rec = tds_record
    regime = js_str(js_or(rec.get("taxRegime"), "new")).lower()
    projected = rec.get("projectedAnnualIncome") or {}
    hra_exempt = rec.get("hraExemption") or {}
    tax_payable = rec.get("taxPayable") or {}
    dd = rec.get("declaredDeductions") or {}

    month_wise = [{"month": r.get("month"), "year": r.get("year"), "tdsDeducted": num0(r.get("tdsDeducted")),
                   "payrollId": r.get("payrollId")} for r in (rec.get("monthlyDeductions") or [])]
    month_wise = [r for r in month_wise if r["tdsDeducted"] > 0]
    if not month_wise:
        month_wise = build_month_wise_tds_from_payrolls(payrolls, fy)
    else:
        month_wise.sort(key=_sort_key(fy))

    if month_wise:
        total_tds = 0.0
        for r in month_wise:
            total_tds += r["tdsDeducted"]
    else:
        total_tds = num0(rec.get("totalTDSDeducted"))
    pending = max(0.0, num0(tax_payable.get("total")) - total_tds)
    standard = js_or(num0(dd.get("standardDeduction")), 50000)
    professional_tax = num0(dd.get("professionalTax"))
    hra_amount = num0(hra_exempt.get("exemptAmount"))
    gross = num0(projected.get("total"))

    chapter6a = None
    if regime == "old":
        parts = {k: num0(dd.get(k)) for k in ("section80C", "section80D", "section80E", "section80G",
                                                "section24", "otherDeductions")}
        total = 0.0
        for v in parts.values():
            total += v
        chapter6a = {**parts, "totalChapter6A": total}

    report = {
        "viewType": "tax_report",
        "financialYear": fy["canonical"],
        "financialYearLabel": fy["label"],
        "assessmentYear": f"AY {assessment_year}",
        "periodDescription": f"April {fy['startYear']} to March {fy['endYear']}",
        "generatedOn": generated_on,
        "tdsCalculated": True,
        "employee": emp_block,
        "summary": {
            "taxRegime": regime,
            "taxRegimeLabel": "Old Regime" if regime == "old" else "New Regime",
            "grossIncome": gross,
            "taxableIncome": num0(rec.get("taxableIncome")),
            "totalTax": num0(tax_payable.get("total")),
            "monthlyTDS": num0(rec.get("monthlyTDS")),
            "totalTDSDeducted": total_tds,
            "pendingTDS": pending,
            "rebateApplicable": bool(rec.get("rebateApplicable")),
            "rebateAmount": num0(rec.get("rebateAmount")),
            "isLocked": bool(rec.get("isLocked")),
        },
        "proofStatus": {
            "proofSubmitted": bool(rec.get("proofSubmitted")),
            "proofVerified": bool(rec.get("proofVerified")),
            "proofStatus": rec.get("proofStatus") or "pending",
            "proofRemarks": rec.get("proofRemarks") or "",
            "proofReviewedAt": rec.get("proofReviewedAt") or None,
        },
        "income": {
            "basic": num0(projected.get("basic")),
            "hra": num0(projected.get("hra")),
            "allowances": num0(projected.get("allowances")),
            "otherIncome": num0(projected.get("otherIncome")),
            "grossSalary": gross,
            "hraReceived": js_or(num0(hra_exempt.get("actualHRA")), num0(projected.get("hra")), 0),
            "hraExemption": hra_amount,
            "rentPaid": num0(hra_exempt.get("rentPaid")),
            "standardDeduction": standard,
            "professionalTax": professional_tax,
            "incomeFromSalary": max(0.0, gross - standard - professional_tax
                                    - (hra_amount if regime == "old" else 0)),
        },
        "declarations": build_declaration_summary(rec),
        "chapter6A": chapter6a,
        "taxComputation": {
            "taxableIncome": num0(rec.get("taxableIncome")),
            "incomeTax": num0(tax_payable.get("incomeTax")),
            "surcharge": num0(tax_payable.get("surcharge")),
            "cess": num0(tax_payable.get("cess")),
            "totalTax": num0(tax_payable.get("total")),
            "rebateApplicable": bool(rec.get("rebateApplicable")),
            "rebateAmount": num0(rec.get("rebateAmount")),
            "netTaxLiability": max(0.0, num0(tax_payable.get("total"))),
            "monthlyTDS": num0(rec.get("monthlyTDS")),
        },
        "tdsDeductions": {
            "monthWise": month_wise,
            "quarterly": build_quarterly_tds_summary(month_wise, fy),
            "totalTDSDeducted": total_tds,
            "pendingTDS": pending,
        },
        "payrollMonthsProcessed": len(payrolls),
        "tdsRecordId": rec.get("_id"),
        "updatedAt": rec.get("updatedAt"),
    }
    return js_out(report)


def _payroll_docs(org, employee_id, fy):
    from ..models import PayrollRun

    docs = []
    qs = PayrollRun.objects.filter(org=org, employee_id=employee_id).filter(
        build_financial_year_payroll_q({"startYear": fy["startYear"], "endYear": fy["endYear"]}))
    for run in qs.order_by("created_at"):
        doc = run.to_dict()
        doc["year"] = clean(doc.get("year")) if isinstance(doc.get("year"), float) else doc.get("year")
        docs.append(doc)
    return docs


def _load(org, employee_id, fy):
    from ..models import EmployeeTDS, PayrollEmployee

    try:
        uuid.UUID(str(employee_id))
    except (ValueError, TypeError):
        return None, None, []
    emp = PayrollEmployee.objects.filter(org=org, pk=employee_id).first()
    if emp is None:
        return None, None, []
    rec = (EmployeeTDS.objects.filter(org=org, employee_id=employee_id, financial_year__in=fy["aliases"])
           .order_by("created_at").first())
    return emp, rec, _payroll_docs(org, employee_id, fy)


def build_tax_report_data(org, employee_id, financial_year_input):
    fy = resolve_financial_year_input(financial_year_input)
    if not fy["ok"]:
        return {"error": fy["error"], "status": 400}
    emp, rec, payrolls = _load(org, employee_id, fy)
    if emp is None:
        return {"error": "Employee not found", "status": 404}
    rec_doc = rec.to_dict() if rec else None
    data = build_tax_report_from(str(employee_id), emp.to_dict(), rec_doc, payrolls, fy)
    return {"data": data, "employee": emp, "fy": fy, "tdsRecord": rec_doc}
