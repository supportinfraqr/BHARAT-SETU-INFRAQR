"""Port of ``controller/payroll/payrollReports.js`` (summary, YTD, statutory, TDS, CTC,
variance reports).

BSS: legacy ``employee.departmentId`` (HRMS Department ref, populated ``name``) maps to the
BSS department string synced onto ``PayrollEmployee.department`` (``employee_doc``).
"""

import re

from django.core.exceptions import ValidationError

from ..context import PayrollError, payroll_view, send_response
from ..models import EmployeeTDS, PayrollEmployee, PayrollRun
from ..services.financial_year import resolve_financial_year_input
from ..services.jsmath import (UNDEFINED, is_finite, js_nc, js_or, js_round, js_str, js_truthy,
                               num0, parse_int, to_fixed_str, to_number)

MONTH_MAP = {
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr", "may": "May",
    "june": "Jun", "july": "Jul", "august": "Aug", "september": "Sep", "october": "Oct",
    "november": "Nov", "december": "Dec", "jan": "Jan", "feb": "Feb", "mar": "Mar",
    "apr": "Apr", "jun": "Jun", "jul": "Jul", "aug": "Aug", "sep": "Sep", "oct": "Oct",
    "nov": "Nov", "dec": "Dec",
}


# ----------------------------------------------------------------------------- helpers

def normalize_month_value(month=""):
    if month is UNDEFINED:
        month = ""
    return MONTH_MAP.get(js_str(month).strip().lower()) or month


def _n(value):
    """``value || 0`` for numeric document fields."""
    return value if js_truthy(value) else 0


def sum_named(lines, pattern):
    total = 0
    for row in lines or []:
        row = row or {}
        if not pattern.search(js_str(js_or(row.get("componentName", UNDEFINED), ""))):
            continue
        total += num0(row.get("amount", UNDEFINED))
    return total


def component_lines(lines):
    out = []
    for row in lines or []:
        row = row or {}
        name = js_str(js_or(row.get("componentName", UNDEFINED), "")).strip()
        if name:
            out.append({"name": name, "amount": num0(row.get("amount", UNDEFINED))})
    return out


def section10_amount(value):
    if not js_truthy(value) or not isinstance(value, (dict, list)):
        return num0(value)
    if isinstance(value, dict):
        if num0(value.get("total", UNDEFINED)):
            return num0(value.get("total"))
        return sum(num0(v) for v in value.values())
    return sum(num0(v) for v in value)


def employee_doc(emp):
    """Legacy populated Employee (``departmentId`` populated with ``name``)."""
    if emp is None:
        return None
    doc = emp.to_dict()
    doc["departmentId"] = {"_id": emp.department, "name": emp.department} if emp.department else None
    return doc


def _dept(emp, fallback="Unknown"):
    emp = emp or {}
    return js_or((emp.get("departmentId") or {}).get("name", UNDEFINED),
                 (emp.get("payrollInfo") or {}).get("department", UNDEFINED), fallback)


def _code(emp):
    emp = emp or {}
    return js_or((emp.get("payrollInfo") or {}).get("employeeCode", UNDEFINED),
                 emp.get("uniqueId", UNDEFINED), "")


def employee_identity(emp):
    emp = emp or {}
    return {
        "employeeId": emp.get("_id"),
        "name": f"{emp.get('firstName') or ''} {emp.get('lastName') or ''}".strip(),
        "employeeCode": _code(emp),
        "department": _dept(emp),
        "designation": emp.get("jobTitle") or "",
    }


def _full_name(emp):
    return f"{js_str(emp.get('firstName', UNDEFINED))} {js_str(emp.get('lastName', UNDEFINED))}"


def _year_int(year):
    y = parse_int(year)
    return y if isinstance(y, int) else None


def _runs(org, month, year):
    y = _year_int(year)
    if y is None:
        return []
    rows = (PayrollRun.objects.filter(org=org, month=month, year=y).select_related("employee")
            .order_by("created_at", "id"))
    return [run_doc(r) for r in rows]


def run_doc(run):
    doc = run.to_dict()
    doc["employeeId"] = employee_doc(run.employee)
    return doc


# ----------------------------------------------------------------------------- pure builders
# (operate on legacy-shaped dicts so they mirror the JS handlers 1:1)

def build_payroll_summary(payrolls):
    summary = {
        "totalEmployees": len(payrolls), "totalGrossEarnings": 0, "totalDeductions": 0,
        "totalNetPay": 0, "departmentWise": {},
        "statusWise": {"pending": 0, "processed": 0, "approved": 0, "paid": 0},
        "employees": [],
    }
    for p in payrolls:
        emp = p.get("employeeId")
        if not emp:
            continue
        summary["totalGrossEarnings"] += _n(p.get("grossEarnings"))
        summary["totalDeductions"] += _n(p.get("totalDeductions"))
        summary["totalNetPay"] += _n(p.get("netPay"))
        status = p.get("payStatus")
        summary["statusWise"][status] = (summary["statusWise"].get(status) or 0) + 1
        dept = _dept(emp)
        if dept not in summary["departmentWise"]:
            summary["departmentWise"][dept] = {"count": 0, "totalGross": 0, "totalDeductions": 0,
                                               "totalNet": 0}
        d = summary["departmentWise"][dept]
        d["count"] += 1
        d["totalGross"] += _n(p.get("grossEarnings"))
        d["totalDeductions"] += _n(p.get("totalDeductions"))
        d["totalNet"] += _n(p.get("netPay"))
        ec = p.get("employerContributions") or {}
        summary["employees"].append({
            **employee_identity(emp),
            "paidDays": _n(p.get("presentDays")),
            "lopDays": _n(p.get("lopDays")),
            "earnings": component_lines(p.get("earnings")),
            "gross": _n(p.get("grossEarnings")),
            "deductions": component_lines(p.get("deductions")),
            "totalDeductions": _n(p.get("totalDeductions")),
            "netPay": _n(p.get("netPay")),
            "employerPF": _n(ec.get("epf")),
            "employerESI": _n(ec.get("esi")),
            "edli": _n(ec.get("edli")),
            "adminCharges": _n(ec.get("adminCharges")),
            "status": p.get("payStatus") or "",
        })
    return summary


RE_BASIC = re.compile(r"basic", re.I)
RE_HRA = re.compile(r"\bhra\b|house rent", re.I | re.A)
RE_EPF = re.compile(r"epf", re.I)
RE_ESI = re.compile(r"\besi\b", re.I | re.A)
RE_PT = re.compile(r"professional tax", re.I)
RE_TDS = re.compile(r"\btds\b|income tax", re.I | re.A)
RE_LWF = re.compile(r"labour welfare|\blwf\b", re.I | re.A)


def build_ytd(payrolls):
    employee_wise = {}
    for p in sorted(payrolls, key=lambda r: js_str(r.get("month", UNDEFINED))):
        emp = p["employeeId"]
        emp_id = str(emp["_id"])
        if emp_id not in employee_wise:
            employee_wise[emp_id] = {
                "employee": {**employee_identity(emp), "email": emp.get("email")},
                "months": [],
                "totals": {"grossEarnings": 0, "deductions": 0, "netPay": 0},
            }
        basic = sum_named(p.get("earnings"), RE_BASIC)
        hra = sum_named(p.get("earnings"), RE_HRA)
        epf = sum_named(p.get("deductions"), RE_EPF)
        esi = sum_named(p.get("deductions"), RE_ESI)
        pt = sum_named(p.get("deductions"), RE_PT)
        tds = sum_named(p.get("deductions"), RE_TDS)
        lwf = sum_named(p.get("deductions"), RE_LWF)
        gross = _n(p.get("grossEarnings"))
        total_ded = _n(p.get("totalDeductions"))
        employee_wise[emp_id]["months"].append({
            "month": p.get("month"),
            "paidDays": _n(p.get("presentDays")),
            "lopDays": _n(p.get("lopDays")),
            "basic": basic, "hra": hra,
            "otherEarnings": max(gross - basic - hra, 0),
            "grossEarnings": gross,
            "epf": epf, "esi": esi, "professionalTax": pt, "tds": tds, "lwf": lwf,
            "otherDeductions": max(total_ded - epf - esi - pt - tds - lwf, 0),
            "deductions": total_ded,
            "netPay": p.get("netPay"),
        })
        t = employee_wise[emp_id]["totals"]
        t["grossEarnings"] += _n(p.get("grossEarnings"))
        t["deductions"] += _n(p.get("totalDeductions"))
        t["netPay"] += _n(p.get("netPay"))
    return list(employee_wise.values())


def _includes(name, *parts):
    return isinstance(name, str) and all(x in name for x in parts)


def build_statutory_report(payrolls):
    report = {
        "epf": {"employees": [], "totalEmployeeContribution": 0, "totalEmployerContribution": 0,
                "totalEdliContribution": 0, "totalAdminCharges": 0, "totalEmployerCost": 0},
        "esi": {"employees": [], "totalEmployeeContribution": 0, "totalEmployerContribution": 0},
        "pt": {"employees": [], "totalAmount": 0},
        "lwf": {"employees": [], "totalEmployeeShare": 0, "totalEmployerShare": 0},
        "bonus": {"employees": [], "totalAmount": 0},
    }
    for p in payrolls:
        emp = p["employeeId"]
        stat = emp.get("statutoryInfo") or {}
        deductions = p.get("deductions") or []
        ec = p.get("employerContributions") or {}
        name = _full_name(emp)
        code = _code(emp)

        epf_employee = next((d for d in deductions if _includes(d.get("componentName"), "EPF", "Employee")), None)
        epf_er, edli, admin = _n(ec.get("epf")), _n(ec.get("edli")), _n(ec.get("adminCharges"))
        if epf_employee or epf_er or edli or admin:
            emp_amt = _n((epf_employee or {}).get("amount"))
            report["epf"]["employees"].append({
                "employeeId": emp["_id"], "name": name, "employeeCode": code,
                "uan": stat.get("uan") or "", "pfAccountNumber": stat.get("pfAccountNumber") or "",
                "epfWage": _n((p.get("epfDetails") or {}).get("epfWage")),
                "employeeContribution": emp_amt, "employerContribution": epf_er,
                "edliContribution": edli, "adminCharges": admin,
                "abryApplied": js_or((p.get("epfDetails") or {}).get("abryApplied", UNDEFINED), False),
            })
            e = report["epf"]
            e["totalEmployeeContribution"] += emp_amt
            e["totalEmployerContribution"] += epf_er
            e["totalEdliContribution"] += edli
            e["totalAdminCharges"] += admin
            e["totalEmployerCost"] += epf_er + edli + admin

        esi_employee = next((d for d in deductions if _includes(d.get("componentName"), "ESI", "Employee")), None)
        esi_er = _n(ec.get("esi"))
        if esi_employee or esi_er:
            emp_amt = _n((esi_employee or {}).get("amount"))
            report["esi"]["employees"].append({
                "employeeId": emp["_id"], "name": name, "employeeCode": code,
                "esiNumber": stat.get("esiNumber") or "",
                "wageUsed": _n((p.get("esiDetails") or {}).get("wageUsed")),
                "employeeContribution": emp_amt, "employerContribution": esi_er,
            })
            report["esi"]["totalEmployeeContribution"] += emp_amt
            report["esi"]["totalEmployerContribution"] += esi_er

        pt = next((d for d in deductions if _includes(d.get("componentName"), "Professional Tax")), None)
        if pt:
            ptd = p.get("ptDetails") or {}
            report["pt"]["employees"].append({
                "employeeId": emp["_id"], "name": name, "employeeCode": code,
                "state": js_or(ptd.get("stateUsed", UNDEFINED), stat.get("ptState", UNDEFINED), ""),
                "ptNumber": ptd.get("ptNumber") or "",
                "cycle": ptd.get("cycle") or "monthly",
                "amount": _n(pt.get("amount")),
            })
            report["pt"]["totalAmount"] += _n(pt.get("amount"))

        lwfd = p.get("lwfDetails") or {}
        lwf_emp, lwf_er = _n(lwfd.get("employeeShare")), _n(lwfd.get("employerShare"))
        if lwf_emp or lwf_er:
            report["lwf"]["employees"].append({
                "employeeId": emp["_id"], "name": name, "employeeCode": code,
                "state": lwfd.get("stateUsed") or "", "cycle": lwfd.get("cycle") or "half-yearly",
                "employeeShare": lwf_emp, "employerShare": lwf_er,
            })
            report["lwf"]["totalEmployeeShare"] += lwf_emp
            report["lwf"]["totalEmployerShare"] += lwf_er

        bd = p.get("bonusDetails") or {}
        bonus = _n(bd.get("amount"))
        if bonus > 0:
            report["bonus"]["employees"].append({
                "employeeId": emp["_id"], "name": name, "employeeCode": code,
                "cycle": bd.get("cycle") or "yearly", "calcBase": _n(bd.get("calcBase")),
                "percentage": _n(bd.get("percentage")), "amount": bonus,
            })
            report["bonus"]["totalAmount"] += bonus
    return report


OTHER_VIA_KEYS = ["section80CCC", "section80CCD1", "section80DD", "section80DDB", "section80E",
                  "section80EE", "section80EEA", "section80G", "section80GG", "section80GGA",
                  "section80GGC", "section80TTA", "section80TTB", "section80U", "otherDeductions"]
FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]


def build_tds_report(records):
    report = {"totalEmployees": len(records), "totalAnnualIncome": 0, "totalTaxDeducted": 0,
              "employees": []}
    for rec in records:
        emp = rec.get("employeeId")
        if not emp:
            continue
        income = rec.get("projectedAnnualIncome") or {}
        ded = rec.get("declaredDeductions") or {}
        g = lambda d, k: num0(d.get(k, UNDEFINED))  # noqa: E731
        basic, hra, allowances = g(income, "basic"), g(income, "hra"), g(income, "allowances")
        perquisites, other_income = g(income, "loanPerquisite"), g(income, "otherIncome")
        gross_total = js_or(num0(income.get("total", UNDEFINED)),
                            basic + hra + allowances + perquisites + other_income)
        tax = rec.get("taxPayable") or {}
        total_tax = g(tax, "total")
        total_deducted = num0(rec.get("totalTDSDeducted", UNDEFINED))
        months = {m: 0 for m in FY_MONTHS}
        for row in rec.get("monthlyDeductions") or []:
            row = row or {}
            key = normalize_month_value(row.get("month", UNDEFINED))
            if isinstance(key, str) and key in months:
                months[key] += num0(row.get("tdsDeducted", UNDEFINED))
        report["totalAnnualIncome"] += gross_total
        report["totalTaxDeducted"] += total_deducted
        report["employees"].append({
            **employee_identity(emp),
            "email": emp.get("email") or "",
            "pan": (emp.get("nationalID") or {}).get("pan") or "",
            "taxRegime": rec.get("taxRegime"),
            "basic": basic, "hra": hra, "allowances": allowances, "perquisites": perquisites,
            "otherIncome": other_income, "grossTotalIncome": gross_total,
            "hraExemption": num0((rec.get("hraExemption") or {}).get("exemptAmount", UNDEFINED)),
            "section10": section10_amount(rec.get("section10Exemptions")),
            "standardDeduction": g(ded, "standardDeduction"),
            "professionalTax": g(ded, "professionalTax"),
            "section24": g(ded, "section24"),
            "section80C": g(ded, "section80C"),
            "section80CCD1B": g(ded, "section80CCD1B"),
            "section80CCD2": g(ded, "section80CCD2"),
            "section80D": g(ded, "section80D"),
            "otherChapterVIA": sum(g(ded, k) for k in OTHER_VIA_KEYS),
            "taxableIncome": num0(rec.get("taxableIncome", UNDEFINED)),
            "incomeTax": g(tax, "incomeTax"),
            "rebate": num0(rec.get("rebateAmount", UNDEFINED)),
            "surcharge": g(tax, "surcharge"),
            "cess": g(tax, "cess"),
            "totalTax": total_tax,
            "monthlyTDS": num0(rec.get("monthlyTDS", UNDEFINED)),
            "totalDeducted": total_deducted,
            "balance": total_tax - total_deducted,
            "months": months,
        })
    report["totalEmployees"] = len(report["employees"])
    return report


def ctc_component_lines(payroll_info=UNDEFINED):
    payroll_info = {} if payroll_info in (UNDEFINED, None) else payroll_info
    lines, seen = [], set()

    def push(row, category):
        row = row or {}
        name = js_str(js_or(row.get("name", UNDEFINED), row.get("componentName", UNDEFINED),
                            row.get("code", UNDEFINED), "")).strip()
        if not name or RE_BASIC.search(name):
            return
        key = name.lower()
        if key in seen:
            return
        monthly = to_number(js_nc(row.get("overrideAmount", UNDEFINED), row.get("amount", UNDEFINED)))
        if not is_finite(monthly):
            return
        seen.add(key)
        lines.append({"name": name,
                      "category": js_or(category, row.get("category", UNDEFINED), ""),
                      "monthly": max(0, monthly)})

    for row in payroll_info.get("componentOverrides") or []:
        if js_truthy((row or {}).get("disabled")):
            continue
        push(row, (row or {}).get("category", UNDEFINED))
    for row in payroll_info.get("defaultComponents") or []:
        push(row, (row or {}).get("category", UNDEFINED))
    return lines


def build_ctc_report(employees):
    report = {"totalEmployees": len(employees), "totalCTC": 0, "totalGross": 0, "employees": [],
              "departmentWise": {}}
    for emp in employees:
        info = emp.get("payrollInfo") or {}
        ctc = _n(info.get("ctc"))
        gross = _n(info.get("grossSalary"))
        dept = _dept(emp)
        report["totalCTC"] += ctc
        report["totalGross"] += gross
        basic = _n(info.get("baseSalary"))
        report["employees"].append({
            "employeeId": emp["_id"], "name": _full_name(emp), "email": emp.get("email"),
            "employeeCode": _code(emp), "department": dept,
            "designation": emp.get("jobTitle") or "",
            "ctc": ctc, "monthlyCTC": js_round(ctc / 12) if js_truthy(ctc) else gross,
            "grossSalary": gross, "basicSalary": basic, "annualBasic": basic * 12,
            "annualGross": gross * 12, "variablePay": _n(info.get("variablePay")),
            "incentives": _n(info.get("incentives")),
            "components": ctc_component_lines(info),
        })
        if dept not in report["departmentWise"]:
            report["departmentWise"][dept] = {"count": 0, "totalCTC": 0}
        report["departmentWise"][dept]["count"] += 1
        report["departmentWise"][dept]["totalCTC"] += ctc
    return report


def _pct(diff, base):
    return to_fixed_str((diff / base) * 100, 2) if js_truthy(base) else 0


def build_variances(period1, period2):
    p1_map = {str(p["employeeId"]["_id"]): p for p in period1}
    variances = []
    for p2 in period2:
        p1 = p1_map.get(str(p2["employeeId"]["_id"]))
        if not p1:
            continue
        gv = _n(p2.get("grossEarnings")) - _n(p1.get("grossEarnings"))
        dv = _n(p2.get("totalDeductions")) - _n(p1.get("totalDeductions"))
        nv = _n(p2.get("netPay")) - _n(p1.get("netPay"))
        variances.append({
            **employee_identity(p2["employeeId"]),
            "period1": {"gross": _n(p1.get("grossEarnings")), "deductions": _n(p1.get("totalDeductions")),
                        "net": _n(p1.get("netPay"))},
            "period2": {"gross": _n(p2.get("grossEarnings")), "deductions": _n(p2.get("totalDeductions")),
                        "net": _n(p2.get("netPay"))},
            "variance": {
                "gross": gv, "deductions": dv, "net": nv,
                "grossPercentage": _pct(gv, p1.get("grossEarnings")),
                "deductionPercentage": _pct(dv, p1.get("totalDeductions")),
                "netPercentage": _pct(nv, p1.get("netPay")),
            },
        })
    return variances


# ----------------------------------------------------------------------------- handlers

@payroll_view(["GET"])
def get_payroll_summary(ctx):
    org = ctx.require_org()
    month, year = ctx.query("month"), ctx.query("year")
    if not month or not year:
        raise PayrollError("Month and year are required", 400)
    normalized = normalize_month_value(month)
    summary = build_payroll_summary(_runs(org, normalized, year))
    return send_response(200, True, "Payroll summary fetched successfully",
                         {"month": normalized, "year": year, "summary": summary})


@payroll_view(["GET"])
def get_ytd_report(ctx):
    org = ctx.require_org()
    year, employee_id = ctx.query("year"), ctx.query("employeeId")
    if not year:
        raise PayrollError("Year is required", 400)
    y = _year_int(year)
    payrolls = []
    if y is not None:
        qs = PayrollRun.objects.filter(org=org, year=y).select_related("employee")
        if employee_id:
            try:
                qs = qs.filter(employee_id=employee_id)
                list(qs[:1])
            except (ValidationError, ValueError):
                raise ValueError(f'Cast to ObjectId failed for value "{employee_id}" (type string) '
                                 'at path "employeeId" for model "PayrollRun"')
        payrolls = [run_doc(r) for r in qs.order_by("created_at", "id")]
    return send_response(200, True, "YTD report fetched successfully",
                         {"year": year, "data": build_ytd(payrolls)})


@payroll_view(["GET"])
def get_statutory_report(ctx):
    org = ctx.require_org()
    month, year = ctx.query("month"), ctx.query("year")
    if not month or not year:
        raise PayrollError("Month and year are required", 400)
    normalized = normalize_month_value(month)
    report = build_statutory_report(_runs(org, normalized, year))
    return send_response(200, True, "Statutory report fetched successfully",
                         {"month": normalized, "year": year, "report": report})


@payroll_view(["GET"])
def get_tds_report(ctx):
    org = ctx.require_org()
    financial_year = ctx.query("financialYear")
    if not financial_year:
        raise PayrollError("Financial year is required", 400)
    fy = resolve_financial_year_input(financial_year)
    if not fy["ok"]:
        raise PayrollError(fy["error"], 400)
    rows = (EmployeeTDS.objects.filter(org=org, financial_year__in=fy["aliases"])
            .select_related("employee").order_by("created_at", "id"))
    records = []
    for r in rows:
        doc = r.to_dict()
        doc["employeeId"] = employee_doc(r.employee)
        records.append(doc)
    return send_response(200, True, "TDS report fetched successfully",
                         {"financialYear": fy["canonical"], "report": build_tds_report(records)})


@payroll_view(["GET"])
def get_ctc_report(ctx):
    org = ctx.require_org()
    employees = [employee_doc(e) for e in
                 PayrollEmployee.objects.filter(org=org, status="Active").order_by("created_at", "id")]
    return send_response(200, True, "CTC report fetched successfully", build_ctc_report(employees))


@payroll_view(["GET"])
def get_variance_report(ctx):
    org = ctx.require_org()
    month1, year1 = ctx.query("month1"), ctx.query("year1")
    month2, year2 = ctx.query("month2"), ctx.query("year2")
    if not month1 or not year1 or not month2 or not year2:
        raise PayrollError("Both periods (month and year) are required", 400)
    period1 = _runs(org, normalize_month_value(month1), year1)
    period2 = _runs(org, normalize_month_value(month2), year2)
    return send_response(200, True, "Variance report fetched successfully", {
        "period1": {"month": month1, "year": year1},
        "period2": {"month": month2, "year": year2},
        "variances": build_variances(period1, period2),
    })


ROUTES = [
    ("reports/summary", get_payroll_summary, "reports_summary"),
    ("reports/ytd", get_ytd_report, "reports_ytd"),
    ("reports/statutory", get_statutory_report, "reports_statutory"),
    ("reports/tds", get_tds_report, "reports_tds"),
    ("reports/ctc", get_ctc_report, "reports_ctc"),
    ("reports/variance", get_variance_report, "reports_variance"),
]
