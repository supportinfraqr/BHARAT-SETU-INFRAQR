"""Form 16 JSON payload — port of ``utils/form16Builder.js``.

Exported (legacy -> port):
    buildForm16Data           -> build_form16_data(org, employee_id, financial_year_input)
    formatOrganizationAddress -> format_organization_address

``build_form16_from`` is the pure core (legacy JSON documents in, payload out).
BSS sources: employer name / address / PAN / TAN from ``bss_adapter.org_profile`` (TAN is
often blank in BSS and is then rendered blank instead of the legacy ``'N/A'``); the employee
PAN from ``nationalID.pan`` (legacy ``payrollInfo.pan`` / ``pan`` kept as earlier fallbacks).
"""

from .financial_year import get_payroll_period_sort_key, resolve_financial_year_input
from .jsmath import js_or, js_out, js_str, num0
from .tax_report_builder import _load, _now_iso, get_indian_fy_quarter

__all__ = ["build_form16_data", "format_organization_address", "build_form16_from"]


def format_organization_address(address=None):
    if not address:
        return ""
    if isinstance(address, str):
        return address.strip()
    if not isinstance(address, dict):
        return ""
    parts = [address.get(k) for k in ("address1", "address2", "city", "state", "country", "zip")]
    return ", ".join(js_str(p) for p in parts if p)


def format_employee_address(employee):
    raw = (employee or {}).get("address")
    if raw and js_str(raw).strip():
        return js_str(raw).strip()
    p = (employee or {}).get("presentAddress") or (employee or {}).get("permanentAddress")
    if isinstance(p, dict):
        parts = [p.get("address"), p.get("city"), p.get("state"), p.get("country"),
                 p.get("zip") or p.get("pin")]
        return ", ".join(js_str(x) for x in parts if x)
    return "N/A"


def build_quarterly_tds_summary(part_e, fy):
    s, e = fy["startYear"], fy["endYear"]
    template = {
        "Q1": {"quarter": "Q1", "period": f"April {s} to June {s}", "tdsDeducted": 0},
        "Q2": {"quarter": "Q2", "period": f"July {s} to September {s}", "tdsDeducted": 0},
        "Q3": {"quarter": "Q3", "period": f"October {s} to December {s}", "tdsDeducted": 0},
        "Q4": {"quarter": "Q4", "period": f"January {e} to March {e}", "tdsDeducted": 0},
    }
    for row in part_e:
        template[get_indian_fy_quarter(row.get("month"))]["tdsDeducted"] += num0(row.get("tdsDeducted"))
    return list(template.values())


def _sort_key(fy):
    return lambda r: get_payroll_period_sort_key(r.get("month"), r.get("year"), fy["startYear"], fy["endYear"])


def build_part_e_from_payrolls(payrolls, fy):
    rows = []
    for payroll in payrolls:
        line = next((d for d in (payroll.get("deductions") or [])
                     if "tds" in js_str(js_or(d.get("componentName"), "")).lower()), None)
        tds = num0(line.get("amount")) if line else 0
        if tds <= 0:
            continue
        rows.append({"month": payroll.get("month"), "year": payroll.get("year"), "tdsDeducted": tds,
                     "payrollId": payroll.get("_id")})
    return sorted(rows, key=_sort_key(fy))


def build_form16_from(employee, organization, tds_record, payrolls, fy, generated_on=None):
    """Pure core of ``buildForm16Data``. ``organization`` is the legacy Organization shape
    (``organizationName``, ``organizationAddress``, ``tan``, ``pan``) or None."""
    generated_on = generated_on or _now_iso()
    payrolls = sorted(payrolls, key=_sort_key(fy))
    rec = tds_record
    pai = rec.get("projectedAnnualIncome") or {}
    dd = rec.get("declaredDeductions") or {}
    tp = rec.get("taxPayable") or {}
    gross = js_or(pai.get("total"), 0)
    standard = js_or(dd.get("standardDeduction"), 50000)
    professional_tax = js_or(dd.get("professionalTax"), 0)
    hra_exemption = js_or((rec.get("hraExemption") or {}).get("exemptAmount"), 0)

    salary_breakup = {
        "grossSalary": gross,
        "basic": js_or(pai.get("basic"), 0),
        "hra": js_or(pai.get("hra"), 0),
        "allowances": js_or(pai.get("allowances"), 0),
        "otherIncome": js_or(pai.get("otherIncome"), 0),
        "lessAllowances": {"standardDeduction": standard, "professionalTax": professional_tax,
                           "hraExemption": hra_exemption},
        "incomeChargeableUnderSalaryHead": max(0, gross - standard - professional_tax - hra_exemption),
    }
    part_c = {k: js_or(dd.get(k), 0) for k in ("section80C", "section80D", "section80E", "section80G",
                                                 "section24")}
    part_c["total"] = (part_c["section80C"] + part_c["section80D"] + part_c["section80E"]
                       + part_c["section80G"] + part_c["section24"])
    total_tax = js_or(tp.get("total"), 0)
    part_d = {
        "taxableIncome": js_or(rec.get("taxableIncome"), 0),
        "taxRegime": js_or(rec.get("taxRegime"), "new"),
        "incomeTax": js_or(tp.get("incomeTax"), 0),
        "surcharge": js_or(tp.get("surcharge"), 0),
        "cess": js_or(tp.get("cess"), 0),
        "totalTax": total_tax,
        "rebate": js_or(rec.get("rebateAmount"), 0),
        "netTax": max(0, total_tax),
        "monthlyTDS": js_or(rec.get("monthlyTDS"), 0),
    }

    part_e = [{"month": r.get("month"), "year": r.get("year"), "tdsDeducted": num0(r.get("tdsDeducted")),
               "payrollId": r.get("payrollId")} for r in (rec.get("monthlyDeductions") or [])]
    part_e = [r for r in part_e if r["tdsDeducted"] > 0]
    if not part_e:
        part_e = build_part_e_from_payrolls(payrolls, fy)
    else:
        part_e.sort(key=_sort_key(fy))
    seen = set()
    deduped = []
    for row in part_e:
        key = f"{js_str(js_or(row.get('month'), '')).lower()}-{js_str(row.get('year'))}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    part_e = deduped

    if part_e:
        total_tds = 0.0
        for r in part_e:
            total_tds += r["tdsDeducted"]
    else:
        total_tds = js_or(rec.get("totalTDSDeducted"), 0)
    assessment_year = f"{fy['startYear'] + 1}-{fy['endYear'] + 1}"

    pi = employee.get("payrollInfo") or {}
    employee_details = {
        "employeeName": f"{employee.get('firstName') or ''} {employee.get('lastName') or ''}".strip().upper(),
        "pan": pi.get("pan") or employee.get("pan") or (employee.get("nationalID") or {}).get("pan") or "N/A",
        "employeeCode": pi.get("employeeCode") or employee.get("uniqueId") or "N/A",
        "designation": pi.get("designation") or employee.get("jobTitle") or "N/A",
        "address": format_employee_address(employee),
        "period": fy["label"],
    }
    part_a = {
        **employee_details,
        "employee": employee_details,
        "periodFrom": f"01-Apr-{fy['startYear']}",
        "periodTo": f"31-Mar-{fy['endYear']}",
        "quarterlyTds": build_quarterly_tds_summary(part_e, fy),
        "totalTaxDeducted": total_tds,
        "tracesNote": ("Challan-wise Part A with BSR code and book entry must be downloaded from TRACES "
                       "(www.tdscpc.gov.in) by the employer."),
    }
    org = organization or {}
    form16 = {
        "viewType": "form16",
        "documentParts": ["PART_A", "PART_B"],
        "employerDetails": {
            "name": org.get("organizationName") or "Organization",
            "address": format_organization_address(org.get("organizationAddress")),
            "tan": org.get("tan") or "",
            "pan": org.get("pan") or "N/A",
        },
        "employeeDetails": employee_details,
        "partA": part_a,
        "partB": salary_breakup,
        "partC": part_c,
        "partD": part_d,
        "partE": part_e,
        "totalTDSDeducted": total_tds,
        "financialYear": fy["keyShort"],
        "financialYearCanonical": fy["canonical"],
        "assessmentYear": f"AY {assessment_year}",
        "periodDescription": f"April {fy['startYear']} to March {fy['endYear']}",
        "generatedOn": generated_on,
        "payrollMonthsProcessed": len(payrolls),
    }
    return js_out(form16)


def organization_doc(org):
    """BSS org profile in the legacy Organization shape used by the builder."""
    from .. import bss_adapter

    profile = bss_adapter.org_profile(org)
    return {"organizationName": profile.get("name"), "organizationAddress": profile.get("address"),
            "tan": profile.get("tan") or "", "pan": profile.get("pan") or "", "gst": profile.get("gstin")}


def build_form16_data(org, employee_id, financial_year_input):
    fy = resolve_financial_year_input(financial_year_input)
    if not fy["ok"]:
        return {"error": fy["error"], "status": 400}
    emp, rec, payrolls = _load(org, employee_id, fy)
    if emp is None:
        return {"error": "Employee not found", "status": 404}
    if rec is None:
        return {"error": "TDS record not found for this financial year. Calculate employee TDS first.",
                "status": 404}
    data = build_form16_from(emp.to_dict(), organization_doc(org), rec.to_dict(), payrolls, fy)
    return {"data": data, "employee": emp, "fy": fy}
