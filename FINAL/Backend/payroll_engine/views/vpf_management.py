"""Voluntary PF (VPF) self-service + admin list.

Port of ``FINAL/legacy_payroll/controller/payroll/vpfManagement.js``. VPF lives on
``PayrollEmployee.payroll_preferences["vpf"]`` (legacy ``employee.payrollPreferences.vpf``);
dates inside it are stored as JS ISO strings.

Exported helpers (used by the payroll run engine / employee views):
    normalizeVpf             -> normalize_vpf
    sanitizeVpfForStatus     -> sanitize_vpf_for_status
    calculateMonthlyVpfAmount -> calculate_monthly_vpf_amount
    isVpfEffectiveForPayroll -> is_vpf_effective_for_payroll (``get_month_date_range`` is
                                optional here; defaults to the payrollRun.js
                                ``getMonthDateRange`` semantics, ``default_month_date_range``)
    formatVpfResponse        -> format_vpf_response
"""

from datetime import datetime, timezone

from ..context import payroll_view, send_response
from ..services.audit_log import log_payroll_action
from ..services.jsmath import UNDEFINED, js_or, js_round, js_str, js_truthy, to_number
from ..services.loan_helper import js_date, js_iso, js_json, js_local_datetime, local_parts

DEFAULT_VPF = {
    "enabled": False, "contributionType": "percentage", "percentage": 0, "fixedAmount": 0,
    "status": "none", "acknowledged": False, "requestedAt": None, "effectiveFrom": None,
}
PAYROLL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
                  "Dec"]


def get_first_day_of_next_month(now=None):
    y, m, _ = local_parts(now or datetime.now(timezone.utc))
    return js_local_datetime(y, m + 1, 1)


def normalize_vpf(payroll_preferences=UNDEFINED):
    prefs = {} if payroll_preferences is UNDEFINED or payroll_preferences is None \
        else payroll_preferences
    vpf = prefs.get("vpf")
    if isinstance(vpf, dict):
        return {**DEFAULT_VPF, **vpf}
    if js_truthy(prefs.get("vpfStatus", UNDEFINED)) or "vpfEnabled" in prefs:
        return {
            **DEFAULT_VPF,
            "enabled": js_or(prefs.get("vpfEnabled", UNDEFINED), False),
            "contributionType": js_or(prefs.get("vpfContributionType", UNDEFINED), "percentage"),
            "percentage": js_or(prefs.get("vpfPercentage", UNDEFINED), 0),
            "fixedAmount": js_or(prefs.get("vpfFixedAmount", UNDEFINED), 0),
            "status": js_or(prefs.get("vpfStatus", UNDEFINED), "none"),
            "acknowledged": js_or(prefs.get("vpfAcknowledged", UNDEFINED), False),
            "requestedAt": js_or(prefs.get("vpfRequestedAt", UNDEFINED), None),
            "effectiveFrom": js_or(prefs.get("vpfEffectiveFrom", UNDEFINED), None),
        }
    return dict(DEFAULT_VPF)


def sanitize_vpf_for_status(vpf=UNDEFINED):
    data = {**DEFAULT_VPF, **({} if vpf is UNDEFINED or vpf is None else vpf)}
    if data.get("status") == "pending":
        return {**data, "enabled": False, "effectiveFrom": None}
    if data.get("status") == "active":
        return {**data, "enabled": True}
    return data


def format_vpf_response(vpf=UNDEFINED):
    data = sanitize_vpf_for_status(vpf)
    return {k: data.get(k) for k in ("enabled", "contributionType", "percentage", "fixedAmount",
                                     "status", "acknowledged", "requestedAt", "effectiveFrom")}


def merge_payroll_preferences_with_vpf(payroll_preferences, vpf):
    prefs = dict(payroll_preferences or {})
    prefs["vpf"] = format_vpf_response(vpf)
    return prefs


def validate_start_payload(contribution_type=UNDEFINED, contribution_value=UNDEFINED,
                           acknowledged=UNDEFINED):
    import math

    if not js_truthy(acknowledged):
        return "You must acknowledge that this will be processed in the next processing cycle"
    if contribution_type not in ("percentage", "fixed"):
        return "Contribution type must be percentage or fixed"
    value = to_number(contribution_value)
    if not math.isfinite(value) or value <= 0:
        return "Valid contribution value is required"
    if contribution_type == "percentage" and (value < 1 or value > 100):
        return "VPF percentage must be between 1 and 100"
    return None


def _pct_amount(basic_salary, percentage):
    pct = percentage if js_truthy(percentage) else 0
    return js_round(((to_number(basic_salary) * to_number(pct)) / 100) * 100) / 100


def calculate_monthly_vpf_amount(vpf=UNDEFINED, basic_salary=0):
    if basic_salary is UNDEFINED:
        basic_salary = 0
    data = sanitize_vpf_for_status(vpf)
    if data.get("status") != "active":
        if data.get("status") == "pending":
            if data.get("contributionType") == "fixed":
                return js_or(data.get("fixedAmount"), 0)
            return _pct_amount(basic_salary, data.get("percentage"))
        return 0
    if not js_truthy(data.get("enabled")):
        return 0
    if data.get("contributionType") == "fixed":
        return js_or(data.get("fixedAmount"), 0)
    return _pct_amount(basic_salary, data.get("percentage"))


def default_month_date_range(year, month_name):
    """payrollRun.js ``getMonthDateRange`` -> ``{"startDate", "endDate"}`` aware datetimes."""
    from datetime import timedelta

    if month_name not in PAYROLL_MONTHS:
        return None
    idx = PAYROLL_MONTHS.index(month_name)
    y = to_number(year)
    if y != y:  # NaN year -> Invalid Date (comparisons false)
        return {"startDate": None, "endDate": None}
    start = js_local_datetime(int(y), idx, 1)
    end = js_local_datetime(int(y), idx + 1, 1) - timedelta(milliseconds=1)
    return {"startDate": start, "endDate": end}


def is_vpf_effective_for_payroll(vpf, month, year, get_month_date_range=None):
    data = sanitize_vpf_for_status(vpf)
    if data.get("status") != "active" or not js_truthy(data.get("enabled")):
        return False
    if not js_truthy(data.get("effectiveFrom")):
        return True
    rng = (get_month_date_range or default_month_date_range)(year, month)
    if not rng:
        return True
    eff = js_date(data.get("effectiveFrom"))
    end = rng.get("endDate")
    if isinstance(end, str):
        end = js_date(end)
    return eff is not None and end is not None and eff <= end


# ------------------------------------------------------------------ views


def _employee_for_request(ctx):
    return ctx.require_employee()


@payroll_view(["GET"], access="employee")
def get_my_vpf(ctx):
    employee = _employee_for_request(ctx)
    vpf = normalize_vpf(employee.payroll_preferences or {})
    basic = js_or((employee.payroll_info or {}).get("baseSalary", UNDEFINED), 0)
    return send_response(200, True, "VPF details fetched successfully", js_json({
        "vpf": format_vpf_response(vpf), "basicSalary": basic,
        "estimatedMonthlyVpf": calculate_monthly_vpf_amount(vpf, basic)}))


@payroll_view(["POST"], access="employee")
def start_vpf(ctx):
    body = ctx.body
    contribution_type = body.get("contributionType", UNDEFINED)
    err = validate_start_payload(contribution_type, body.get("contributionValue", UNDEFINED),
                                 body.get("acknowledged", UNDEFINED))
    if err:
        return send_response(400, False, err)
    employee = _employee_for_request(ctx)
    vpf = normalize_vpf(employee.payroll_preferences or {})
    if vpf.get("status") == "active":
        return send_response(400, False, "VPF contribution is already active")
    value = to_number(body.get("contributionValue"))
    updated = {
        **vpf, "enabled": True, "contributionType": contribution_type,
        "percentage": value if contribution_type == "percentage" else 0,
        "fixedAmount": value if contribution_type == "fixed" else 0,
        "status": "active", "acknowledged": True,
        "requestedAt": js_iso(datetime.now(timezone.utc)),
        "effectiveFrom": js_iso(get_first_day_of_next_month()),
    }
    updated = js_json(updated)
    before = (employee.payroll_preferences or {}).get("vpf")
    employee.payroll_preferences = merge_payroll_preferences_with_vpf(
        employee.payroll_preferences, updated)
    employee.save(update_fields=["payroll_preferences", "updated_at"])
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=employee.pk, affected_employee=employee, before_data=before,
                       after_data=employee.payroll_preferences["vpf"], remarks="VPF started")
    return send_response(201, True, "VPF activated. Deduction will start from next month payroll.",
                         {"vpf": format_vpf_response(updated)})


@payroll_view(["POST"], access="employee")
def stop_vpf(ctx):
    employee = _employee_for_request(ctx)
    vpf = normalize_vpf(employee.payroll_preferences or {})
    if vpf.get("status") not in ("pending", "active"):
        return send_response(400, False, "No active or pending VPF contribution to stop")
    updated = {**vpf, "enabled": False, "status": "stopped",
               "effectiveFrom": js_iso(get_first_day_of_next_month())}
    before = (employee.payroll_preferences or {}).get("vpf")
    employee.payroll_preferences = merge_payroll_preferences_with_vpf(
        employee.payroll_preferences, updated)
    employee.save(update_fields=["payroll_preferences", "updated_at"])
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_component",
                       entity_id=employee.pk, affected_employee=employee, before_data=before,
                       after_data=employee.payroll_preferences["vpf"], remarks="VPF stopped")
    return send_response(200, True, "VPF stop request submitted successfully",
                         {"vpf": format_vpf_response(updated)})


def to_vpf_admin_list_item(emp):
    vpf = sanitize_vpf_for_status(normalize_vpf(emp.get("payrollPreferences") or {}))
    basic = js_or((emp.get("payrollInfo") or {}).get("baseSalary", UNDEFINED), 0)
    return {
        "employeeId": emp.get("_id"),
        "employeeName": f"{js_or(emp.get('firstName'), '')} {js_or(emp.get('lastName'), '')}".strip(),
        "email": emp.get("email"),
        "employeeCode": emp.get("uniqueId"),
        "basicSalary": basic,
        "status": vpf.get("status"),
        "contributionType": vpf.get("contributionType"),
        "percentage": vpf.get("percentage") if vpf.get("contributionType") == "percentage" else None,
        "fixedAmount": vpf.get("fixedAmount") if vpf.get("contributionType") == "fixed" else None,
        "requestedAt": vpf.get("requestedAt"),
        "effectiveFrom": vpf.get("effectiveFrom"),
        "monthlyDeduction": calculate_monthly_vpf_amount(vpf, basic),
    }


def _ms(value):
    if not js_truthy(value):
        return 0
    d = js_date(value)
    return d.timestamp() * 1000 if d is not None else float("nan")


@payroll_view(["GET"])
def get_all_vpf_requests(ctx):
    from functools import cmp_to_key

    from ..models import PayrollEmployee

    org = ctx.require_org()
    status_filter = ctx.query("status")
    flt = status_filter if status_filter in ("pending", "active", "all") else "all"
    employees = []
    for emp in PayrollEmployee.objects.filter(org=org).order_by("created_at", "id"):
        prefs = emp.payroll_preferences or {}
        nested = prefs.get("vpf") if isinstance(prefs.get("vpf"), dict) else {}
        if nested.get("status") in ("pending", "active") or prefs.get("vpfStatus") in ("pending", "active"):
            employees.append(emp.to_dict())
    items = [to_vpf_admin_list_item(e) for e in employees]
    if flt == "all":
        items = [i for i in items if i["status"] in ("pending", "active")]
    else:
        items = [i for i in items if i["status"] == flt]

    def cmp(a, b):
        if a["status"] == b["status"]:
            diff = _ms(b["requestedAt"]) - _ms(a["requestedAt"])
            return 0 if diff != diff else (diff > 0) - (diff < 0)
        return -1 if a["status"] == "pending" else 1

    items.sort(key=cmp_to_key(cmp))
    return send_response(200, True, "VPF list fetched successfully", js_json({"list": items}))


ROUTES = [
    ("employee/vpf", get_my_vpf, "vpf_my"),
    ("employee/vpf/start", start_vpf, "vpf_start"),
    ("employee/vpf/stop", stop_vpf, "vpf_stop"),
    ("vpf/all", get_all_vpf_requests, "vpf_all"),
]
