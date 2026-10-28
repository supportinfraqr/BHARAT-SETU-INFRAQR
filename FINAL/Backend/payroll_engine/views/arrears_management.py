"""Arrears CRUD / approval / payment.

Port of ``FINAL/legacy_payroll/controller/payroll/arrearsManagement.js`` (HR only).
"""

import math

from django.core.exceptions import ValidationError
from django.utils import timezone

from ..context import PayrollError, employee_queryset, payroll_view, send_response
from ..services.audit_log import log_payroll_action
from ..services.jsmath import (UNDEFINED, is_integer, is_nullish, js_or, js_str, js_trim,
                               js_truthy, num0, parse_int, to_number)
from ..services.loan_helper import js_json, populate_employee

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]
ARREARS_TYPES = ["salary_revision", "correction", "bonus", "incentive", "allowance", "other"]


def normalize_month_value(month_value=UNDEFINED):
    if is_nullish(month_value):
        return None
    s = js_trim(js_str(month_value))
    if not s:
        return None
    n = to_number(s)
    if is_integer(n) and 1 <= n <= 12:
        return MONTHS[int(n) - 1]
    for i, m in enumerate(MONTHS):
        if m.lower() == s.lower():
            return MONTHS[i]
    for i, m in enumerate(FULL_MONTHS):
        if m.lower() == s.lower():
            return MONTHS[i]
    return None


def _normalize_period(period):
    if not js_truthy(period):
        return None
    p = period if isinstance(period, dict) else {}
    month = p.get("month", UNDEFINED)
    year = p.get("year", UNDEFINED)
    out = {}
    m = js_or(normalize_month_value(month), month)
    if m is not UNDEFINED:
        out["month"] = m
    n = to_number(year)
    y = n if js_truthy(n) else year          # Number(year) || year
    if y is not UNDEFINED:
        out["year"] = y
    return out


def _arrears_qs(org):
    from ..models import Arrears

    return Arrears.objects.filter(org=org)


def _find(org, arrears_id):
    try:
        return _arrears_qs(org).filter(pk=arrears_id).first()
    except (ValidationError, ValueError):
        return None


def _cast_number(value, path):
    n = to_number(value)
    if isinstance(value, (dict, list)) or (isinstance(value, str) and math.isnan(n)) or \
            (isinstance(value, (int, float)) and math.isnan(n)):
        raise PayrollError(
            f'Arrears validation failed: {path}: Cast to Number failed for value '
            f'"{js_str(value)}" (type {type(value).__name__}) at path "{path}"', 500)
    return n


@payroll_view(["POST"])
def create_arrears(ctx):
    from ..models import Arrears

    org = ctx.require_org()
    body = ctx.body
    employee_id = body.get("employeeId")
    arrears_type = body.get("arrearsType")
    total = body.get("totalArrearsAmount", UNDEFINED)
    tds = body.get("tdsOnArrears", UNDEFINED)
    if not js_truthy(employee_id) or not js_truthy(arrears_type) or not js_truthy(total):
        raise PayrollError("Employee ID, arrears type, and amount are required", 400)
    pay_in_month = normalize_month_value(body.get("payInMonth", UNDEFINED))
    pay_in_year = to_number(body.get("payInYear", UNDEFINED))
    if not pay_in_month or not is_integer(pay_in_year) or pay_in_year < 1900:
        raise PayrollError("payInMonth and payInYear are required (payroll month when arrears "
                           "should appear on salary slip)", 400)
    employee = employee_queryset(ctx)
    try:
        employee = employee.filter(pk=employee_id).first()
    except (ValidationError, ValueError):
        employee = None
    if employee is None:
        raise PayrollError(f'Arrears validation failed: employeeId: Cast to ObjectId failed for '
                           f'value "{js_str(employee_id)}" at path "employeeId"', 500)
    if arrears_type not in ARREARS_TYPES:
        raise PayrollError(f"Arrears validation failed: arrearsType: `{js_str(arrears_type)}` is "
                           f"not a valid enum value for path `arrearsType`.", 500)
    total_n = _cast_number(total, "totalArrearsAmount")
    tds_val = tds if js_truthy(tds) else 0
    tds_n = _cast_number(tds_val, "tdsOnArrears")
    period_from = _normalize_period(body.get("periodFrom", UNDEFINED))
    period_to = _normalize_period(body.get("periodTo", UNDEFINED))
    components = body.get("components")
    arrears = Arrears(
        org=org, employee=employee, arrears_type=arrears_type,
        components=list(components) if js_truthy(components) and isinstance(components, list) else [],
        total_arrears_amount=total_n, tds_on_arrears=tds_n,
        net_arrears_payable=total_n - tds_n, pay_in_month=pay_in_month, pay_in_year=pay_in_year,
        status="calculated", remarks=js_str(body["remarks"]) if body.get("remarks") is not None
        and "remarks" in body else "")
    if period_from is not None:
        arrears.period_from = period_from
    if period_to is not None:
        arrears.period_to = period_to
    arrears.save()
    log_payroll_action(ctx, action="payroll_processed", entity_type="payroll",
                       entity_id=arrears.pk, affected_employee=employee,
                       after_data=js_json(arrears.to_dict()),
                       remarks=f"Arrears created ({arrears_type}) for {pay_in_month} {int(pay_in_year)}")
    return send_response(201, True, "Arrears created successfully", js_json(arrears.to_dict()))


@payroll_view(["PUT"])
def approve_arrears(ctx, arrearsId):
    org = ctx.require_org()
    arrears = _find(org, arrearsId)
    if arrears is None:
        raise PayrollError("Arrears not found", 404)
    before = arrears.status
    arrears.status = "approved"
    arrears.save()
    log_payroll_action(ctx, action="payroll_approved", entity_type="payroll", entity_id=arrears.pk,
                       affected_employee=arrears.employee, before_data={"status": before},
                       after_data={"status": "approved"}, remarks="Arrears approved")
    return send_response(200, True, "Arrears approved successfully", js_json(arrears.to_dict()))


@payroll_view(["PUT"])
def pay_arrears(ctx, arrearsId):
    from ..models import PayrollRun

    org = ctx.require_org()
    body = ctx.body
    month = normalize_month_value(body.get("paidInMonth", UNDEFINED))
    year = to_number(body.get("paidInYear", UNDEFINED))
    if not month or not is_integer(year) or year < 1900:
        raise PayrollError("Valid paidInMonth and paidInYear are required", 400)
    arrears = _find(org, arrearsId)
    if arrears is None:
        raise PayrollError("Arrears not found", 404)
    if arrears.status != "approved":
        raise PayrollError("Only approved arrears can be paid", 400)
    arrears.status = "paid"
    arrears.paid_in_month = month
    arrears.paid_in_year = year
    payroll_id = body.get("payrollId")
    if payroll_id is not None and js_trim(js_str(payroll_id)) != "":
        pid = js_trim(js_str(payroll_id))
        try:
            run = PayrollRun.objects.filter(pk=pid, org=org).first()
        except (ValidationError, ValueError):
            run = None
        if run is None:
            # Mongoose would store any ObjectId-shaped value; a non-ObjectId failed the cast.
            raise PayrollError(f'Cast to ObjectId failed for value "{pid}" (type string) at '
                               f'path "payrollId"', 500)
        arrears.payroll = run
    else:
        arrears.payroll = None
    arrears.paid_date = timezone.now()
    arrears.save()
    log_payroll_action(ctx, action="payroll_paid", entity_type="payroll", entity_id=arrears.pk,
                       affected_employee=arrears.employee, after_data=js_json(arrears.to_dict()),
                       remarks=f"Arrears marked paid in {month} {int(year)}")
    return send_response(200, True, "Arrears marked as paid successfully", js_json(arrears.to_dict()))


@payroll_view(["DELETE"])
def delete_arrears(ctx, arrearsId):
    org = ctx.require_org()
    arrears = _find(org, arrearsId)
    if arrears is None:
        raise PayrollError("Arrears not found", 404)
    if arrears.status == "paid" and arrears.payroll_id:
        raise PayrollError("Paid arrears linked with payroll cannot be deleted", 400)
    before = js_json(arrears.to_dict())
    employee = arrears.employee
    arrears.delete()
    log_payroll_action(ctx, action="payroll_deleted", entity_type="payroll", entity_id=arrearsId,
                       affected_employee=employee, before_data=before, remarks="Arrears deleted")
    return send_response(200, True, "Arrears deleted successfully")


EMP_POPULATE = ["firstName", "lastName", "email", "payrollInfo.employeeCode"]


def _with_employee(arr):
    d = arr.to_dict()
    d["employeeId"] = populate_employee(arr.employee, EMP_POPULATE) if arr.employee_id else None
    return d


@payroll_view(["GET"])
def get_all_arrears(ctx):
    org = ctx.require_org()
    status = ctx.query("status")
    employee_id = ctx.query("employeeId")
    page_raw = ctx.query("page", 1)
    limit_raw = ctx.query("limit", 20)
    qs = _arrears_qs(org)
    if status:
        qs = qs.filter(status=status)
    try:
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        total = qs.count()
    except (ValidationError, ValueError):
        qs, total = qs.none(), 0
    page_n = to_number(page_raw)
    limit_n = to_number(limit_raw)
    skip = (page_n - 1) * limit_n
    lim = parse_int(limit_raw)
    rows = qs.select_related("employee").order_by("-created_at")
    start = int(skip) if isinstance(skip, float) and math.isfinite(skip) and skip > 0 else 0
    if isinstance(lim, int) and lim > 0:
        rows = rows[start:start + lim]
    else:
        rows = rows[start:]
    page_i = parse_int(page_raw)
    total_pages = math.ceil(total / limit_n) if limit_n and math.isfinite(total / limit_n) else None
    return send_response(200, True, "Arrears fetched successfully", js_json({
        "total": total,
        "page": page_i if isinstance(page_i, int) else None,
        "limit": lim if isinstance(lim, int) else None,
        "totalPages": total_pages,
        "data": [_with_employee(a) for a in rows],
    }))


@payroll_view(["GET"])
def get_employee_arrears(ctx, employeeId):
    org = ctx.require_org()
    try:
        rows = list(_arrears_qs(org).filter(employee_id=employeeId).order_by("-created_at"))
    except (ValidationError, ValueError):
        rows = []
    return send_response(200, True, "Employee arrears fetched successfully",
                         js_json([a.to_dict() for a in rows]))


@payroll_view(["GET"])
def calculate_pending_arrears(ctx, employeeId):
    org = ctx.require_org()
    try:
        rows = list(_arrears_qs(org).filter(employee_id=employeeId,
                                            status__in=["calculated", "approved"])
                    .order_by("created_at", "id"))
    except (ValidationError, ValueError):
        rows = []
    total = 0
    for a in rows:
        total += a.net_arrears_payable if a.net_arrears_payable is not None else 0
    return send_response(200, True, "Pending arrears calculated successfully", js_json({
        "count": len(rows), "totalAmount": total, "arrears": [a.to_dict() for a in rows]}))


ROUTES = [
    ("arrears/create", create_arrears, "arrears_create"),
    ("arrears/<str:arrearsId>/approve", approve_arrears, "arrears_approve"),
    ("arrears/<str:arrearsId>/pay", pay_arrears, "arrears_pay"),
    ("arrears/<str:arrearsId>", delete_arrears, "arrears_delete"),
    ("arrears", get_all_arrears, "arrears_list"),
    ("arrears/employee/<str:employeeId>", get_employee_arrears, "arrears_employee"),
    ("arrears/pending/<str:employeeId>", calculate_pending_arrears, "arrears_pending"),
]
