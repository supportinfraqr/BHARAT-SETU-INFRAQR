"""Port of ``controller/payroll/hrDashboard.js`` (``GET hrDashboard``).

BSS: ``employee.departmentId.name`` -> ``PayrollEmployee.department`` (see
``payroll_reports.employee_doc``); avatar ``profileImage``/``photo`` -> the worker's BSS
identity photo.
"""

import re
from datetime import datetime

from ..context import PayrollError, payroll_view, send_response
from ..models import Arrears, ClaimsDeclaration, FullAndFinal, PayrollEmployee, PayrollRun, SalaryRevision
from ..services.financial_year import LOCAL_TZ
from ..services.jsmath import (UNDEFINED, is_integer, js_or, js_round, js_str, js_truthy, num0,
                               parse_int, to_number)

MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]
TAX_NAME_RE = re.compile(r"tds|tax|pt\b|professional\s*tax|income\s*tax", re.I | re.A)
DONATION_NAME_RE = re.compile(r"donation|charity|csr", re.I)


def normalize_month_value(month=""):
    raw = js_str("" if month is UNDEFINED else month).strip()
    if not raw:
        return None
    for i, m in enumerate(MONTHS_SHORT):
        if m.lower() == raw.lower():
            return MONTHS_SHORT[i]
    for i, m in enumerate(MONTHS_FULL):
        if m.lower() == raw.lower():
            return MONTHS_SHORT[i]
    numeric = to_number(raw)
    if is_integer(numeric) and 1 <= numeric <= 12:
        return MONTHS_SHORT[int(numeric) - 1]
    return None


def round_currency(amount=UNDEFINED):
    return js_round(num0(amount) * 100) / 100


def resolve_period(query, now=None):
    now = (now or datetime.now(LOCAL_TZ)).astimezone(LOCAL_TZ)
    month = normalize_month_value(query.get("month", UNDEFINED)) or MONTHS_SHORT[now.month - 1]
    year = parse_int(query["year"]) if js_truthy(query.get("year")) else now.year
    if not isinstance(year, int):
        return {"error": "Invalid year"}
    return {"month": month, "year": year, "monthIndex": MONTHS_SHORT.index(month)}


def build_financial_year_periods(month, year):
    month_index = MONTHS_SHORT.index(month)
    fy_start = year if month_index >= 3 else year - 1
    periods = []
    for i in range(12):
        ab = 3 + i
        m_idx = ab % 12
        y = fy_start + ab // 12
        periods.append({"month": MONTHS_SHORT[m_idx], "year": y,
                        "label": f"{MONTHS_SHORT[m_idx]} {y}", "sortKey": y * 100 + (m_idx + 1)})
    return {"financialYear": f"{fy_start}-{str(fy_start + 1)[-2:]}", "periods": periods}


def classify_deduction_line(line=None):
    line = line or {}
    name = js_str(js_or(line.get("componentName", UNDEFINED), "")).strip() or "Other"
    amount = num0(line.get("amount", UNDEFINED))
    if DONATION_NAME_RE.search(name):
        return {"type": "donation", "name": name, "amount": amount}
    if TAX_NAME_RE.search(name):
        return {"type": "tax", "name": name, "amount": amount}
    return {"type": "deduction", "name": name, "amount": amount}


def _n(v):
    return v if js_truthy(v) else 0


def summarize_payroll_doc(payroll=None):
    payroll = payroll or {}
    taxes = donations = other = 0
    deduction_map = {}
    for line in payroll.get("deductions") or []:
        c = classify_deduction_line(line)
        if c["type"] == "tax":
            taxes += c["amount"]
        elif c["type"] == "donation":
            donations += c["amount"]
        else:
            other += c["amount"]
        deduction_map[c["name"]] = (deduction_map.get(c["name"]) or 0) + c["amount"]
    benefits = sum(num0((b or {}).get("amount", UNDEFINED)) for b in payroll.get("benefits") or [])
    reimbursements = sum(num0((r or {}).get("amount", UNDEFINED))
                         for r in payroll.get("reimbursements") or [])
    ec = payroll.get("employerContributions") or {}
    employer_taxes = round_currency(_n(ec.get("epf")) + _n(ec.get("edli")) + _n(ec.get("adminCharges"))
                                    + _n(ec.get("esi")) + _n(ec.get("lwf")))
    employer_total = round_currency(js_or(ec.get("total", UNDEFINED), employer_taxes))
    gross_pay = round_currency(_n(payroll.get("grossEarnings")))
    net_pay = round_currency(_n(payroll.get("netPay")))
    total_deductions = round_currency(js_or(payroll.get("totalDeductions", UNDEFINED),
                                            taxes + donations + other))
    return {
        "grossPay": gross_pay, "netPay": net_pay, "taxes": round_currency(taxes),
        "donations": round_currency(donations),
        "deductions": round_currency(js_or(other, max(0, total_deductions - taxes - donations))),
        "totalDeductions": total_deductions, "benefits": round_currency(benefits),
        "reimbursements": round_currency(reimbursements), "employerTaxes": employer_taxes,
        "employerBenefits": 0, "employerTotal": employer_total,
        "totalEmployerCost": round_currency(gross_pay + employer_total),
        "deductionMap": deduction_map, "payStatus": payroll.get("payStatus") or "pending",
        "employeeId": payroll.get("employeeId"),
    }


def build_summary(payrolls, active_employees):
    gross = net = taxes = 0
    for p in payrolls:
        row = summarize_payroll_doc(p)
        gross += row["grossPay"]
        net += row["netPay"]
        taxes += row["taxes"]
    return {"totalGrossPay": round_currency(gross), "totalNetPay": round_currency(net),
            "taxesWithheld": round_currency(taxes), "activeEmployees": active_employees}


def _by_period(payrolls, periods, fields, accumulate):
    by_key = {f"{p['month']}-{p['year']}": {"month": p["month"], "year": p["year"],
                                           "label": p["label"], **{f: 0 for f in fields}}
              for p in periods}
    for p in payrolls:
        key = f"{p.get('month')}-{js_str(p.get('year', UNDEFINED))}"
        if key not in by_key:
            continue
        accumulate(by_key[key], summarize_payroll_doc(p))
    return [by_key[f"{p['month']}-{p['year']}"] for p in periods]


def build_cost_summary(payrolls, periods):
    fields = ["netPay", "taxes", "benefits", "donations", "deductions"]

    def acc(row, s):
        for f in fields:
            row[f] += s[f]
    out = []
    for row in _by_period(payrolls, periods, fields, acc):
        out.append({"month": row["month"], "year": row["year"], "label": row["label"],
                    **{f: round_currency(row[f]) for f in fields},
                    "total": round_currency(row["netPay"] + row["taxes"] + row["benefits"]
                                            + row["donations"] + row["deductions"])})
    return out


def build_deduction_breakdown(payrolls):
    amounts, total = {}, 0
    for p in payrolls:
        for line in p.get("deductions") or []:
            line = line or {}
            name = js_str(js_or(line.get("componentName", UNDEFINED), "")).strip() or "Other"
            amount = num0(line.get("amount", UNDEFINED))
            amounts[name] = (amounts.get(name) or 0) + amount
            total += amount
    items = [{"name": n, "amount": round_currency(a),
              "percentage": round_currency((a / total) * 100) if total > 0 else 0}
             for n, a in amounts.items()]
    items.sort(key=lambda x: -x["amount"])
    return {"total": round_currency(total), "items": items}


def build_department_payroll(payrolls):
    depts = {}
    for p in payrolls:
        emp = p.get("employeeId") or {}
        dept = js_or((emp.get("departmentId") or {}).get("name", UNDEFINED),
                     (emp.get("payrollInfo") or {}).get("department", UNDEFINED), "Others")
        if dept not in depts:
            depts[dept] = {"department": dept, "grossPay": 0, "netPay": 0, "employeeCount": 0}
        row = summarize_payroll_doc(p)
        depts[dept]["grossPay"] += row["grossPay"]
        depts[dept]["netPay"] += row["netPay"]
        depts[dept]["employeeCount"] += 1
    out = [{"department": d["department"], "grossPay": round_currency(d["grossPay"]),
            "netPay": round_currency(d["netPay"]), "employeeCount": d["employeeCount"]}
           for d in depts.values()]
    out.sort(key=lambda x: -x["netPay"])
    return out


def build_employer_cost(payrolls):
    gross = taxes = benefits = total = 0
    for p in payrolls:
        row = summarize_payroll_doc(p)
        gross += row["grossPay"]
        taxes += row["employerTaxes"]
        benefits += row["benefits"]
        total += row["totalEmployerCost"]
    return [{"label": "Gross Pay", "amount": round_currency(gross)},
            {"label": "Employer Taxes", "amount": round_currency(taxes)},
            {"label": "Benefits", "amount": round_currency(benefits)},
            {"label": "Total Cost", "amount": round_currency(total)}]


def build_ctc_analysis(payrolls, periods):
    fields = ["grossPay", "employerCost", "netPay", "totalCtc"]

    def acc(row, s):
        row["grossPay"] += s["grossPay"]
        row["employerCost"] += s["employerTotal"]
        row["netPay"] += s["netPay"]
        row["totalCtc"] += s["totalEmployerCost"]
    return [{"month": r["month"], "year": r["year"], "label": r["label"],
             **{f: round_currency(r[f]) for f in fields}}
            for r in _by_period(payrolls, periods, fields, acc)]


def _avatar(emp):
    ident = getattr(emp.worker, "worker_identity", None) if emp.worker_id else None
    return (getattr(ident, "photo", "") or None) if ident is not None else None


def build_requests_for_period(org, month, year):
    runs = PayrollRun.objects.filter(org=org, month=month, year=year)
    active = PayrollEmployee.objects.filter(org=org, status="Active")
    active_employees = active.count()
    payroll_employee_ids = runs.values("employee_id").distinct().count()
    pending_runs = runs.filter(pay_status="pending").count()
    pending_for_fnf = FullAndFinal.objects.filter(org=org, status__in=["initiated", "pending"]).count()
    salary_on_hold = runs.filter(pay_status="on_hold").count()
    pending_for_payment = runs.filter(pay_status__in=["processed", "approved"]).count()
    avatars = list(active.select_related("worker").order_by("created_at", "id")[:8])
    return {
        "pendingForPayroll": max(pending_runs, max(0, active_employees - payroll_employee_ids)),
        "pendingForFnf": pending_for_fnf,
        "salaryOnHold": salary_on_hold,
        "pendingForPayment": pending_for_payment,
        "avatars": [{"employeeId": str(e.pk),
                     "name": f"{e.first_name or ''} {e.last_name or ''}".strip(),
                     "avatar": _avatar(e)} for e in avatars],
    }


def build_approvals(org):
    reimbursement = 0
    for claim in ClaimsDeclaration.objects.filter(org=org).only("reimbursements"):
        for item in claim.reimbursements or []:
            if isinstance(item, dict) and item.get("status") == "pending":
                reimbursement += 1
    pending_revisions = SalaryRevision.objects.filter(org=org, status="pending").count()
    pending_arrears = Arrears.objects.filter(org=org, status__in=["calculated", "approved"]).count()
    return {
        "approvalsPendingOnMe": pending_revisions + pending_arrears + reimbursement,
        "reimbursement": reimbursement,
        "pendingRevisions": pending_revisions,
        "pendingArrears": pending_arrears,
    }


def get_dashboard_bundle(org, month, year):
    from .payroll_reports import run_doc

    fy = build_financial_year_periods(month, year)
    periods = fy["periods"]
    active_employees = PayrollEmployee.objects.filter(org=org, status="Active").count()
    period_payrolls = [run_doc(r) for r in PayrollRun.objects.filter(org=org, month=month, year=year)
                       .select_related("employee").order_by("created_at", "id")]
    from django.db.models import Q
    q = Q(pk__in=[])
    for p in periods:
        q |= Q(month=p["month"], year=p["year"])
    fy_payrolls = [r.to_dict() for r in PayrollRun.objects.filter(q, org=org).order_by("created_at", "id")]
    return {
        "period": {"month": month, "monthFull": MONTHS_FULL[MONTHS_SHORT.index(month)],
                   "year": year, "financialYear": fy["financialYear"]},
        "summary": build_summary(period_payrolls, active_employees),
        "costSummary": build_cost_summary(fy_payrolls, periods),
        "deductionBreakdown": build_deduction_breakdown(period_payrolls),
        "departmentPayroll": build_department_payroll(period_payrolls),
        "employerCost": build_employer_cost(period_payrolls),
        "ctcAnalysis": build_ctc_analysis(fy_payrolls, periods),
        "requests": build_requests_for_period(org, month, year),
        "approvals": build_approvals(org),
    }


@payroll_view(["GET"])
def get_hr_dashboard(ctx):
    org = ctx.require_org()
    period = resolve_period(ctx.request.query_params)
    if period.get("error"):
        raise PayrollError(period["error"], 400)
    data = get_dashboard_bundle(org, period["month"], period["year"])
    return send_response(200, True, "HR dashboard fetched successfully", data)


ROUTES = [("hrDashboard", get_hr_dashboard, "hr_dashboard")]
