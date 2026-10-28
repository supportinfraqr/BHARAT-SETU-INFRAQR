"""Port of ``controller/payroll/auditLog.js`` (audit log readers).

The writer ``logPayrollAction`` lives in ``services/audit_log.py`` (``log_payroll_action``)
and is re-exported here under the deterministic name.

Legacy populated ``performedBy`` (User ref) with ``firstName lastName email``. In BSS
``performed_by`` is a BSS user id string; ``performer_ref`` builds the same
``{_id, firstName, lastName, email}`` shape from that user (``full_name`` split on the
first space). Unknown / empty ids populate to ``null`` like a dangling Mongo ref.
"""

import math

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from .. import bss_adapter
from ..context import PayrollError, payroll_view, send_response
from ..models import PayrollAuditLog
from ..services.audit_log import log_payroll_action  # noqa: F401 — legacy export logPayrollAction
from ..services.ff_leave_encashment_helper import js_new_date
from ..services.jsmath import js_str, parse_int, to_number


def _users_by_id(ids):
    pks = []
    for raw in set(ids):
        try:
            pks.append(int(raw))
        except (TypeError, ValueError):
            continue
    return {str(u.pk): u for u in get_user_model().objects.filter(pk__in=pks)}


def _user_email(user):
    """BSS users have no email column; contractors / employers keep it on their profile."""
    email = getattr(user, "email", "") or ""
    if not email and getattr(user, "role", "") in bss_adapter.ORG_ROLES:
        email = bss_adapter.org_profile(user).get("email") or ""
    return email


def performer_ref(user):
    if user is None:
        return None
    parts = ((getattr(user, "full_name", "") or user.get_username() or "").strip()).split()
    return {"_id": str(user.pk), "firstName": parts[0] if parts else "",
            "lastName": " ".join(parts[1:]), "email": _user_email(user)}


def employee_ref(emp):
    if emp is None:
        return None
    return {"_id": str(emp.pk), "firstName": emp.first_name, "lastName": emp.last_name,
            "email": emp.email}


def serialize_logs(logs, populate_employee=True):
    users = _users_by_id([log.performed_by for log in logs if log.performed_by])
    out = []
    for log in logs:
        doc = log.to_dict()
        doc["performedBy"] = performer_ref(users.get(str(log.performed_by)))
        if populate_employee:
            doc["affectedEmployee"] = employee_ref(log.affected_employee)
        out.append(doc)
    return out


def _date_or_error(value, name):
    parsed = js_new_date(value)
    if parsed is None:
        raise ValueError(f'Cast to date failed for value "{js_str(value)}" (type string) at path '
                         f'"createdAt" for model "PayrollAuditLog"')
    return parsed


@payroll_view(["GET"])
def get_audit_logs(ctx):
    org = ctx.require_org()
    q = ctx.request.query_params
    action, entity_type, employee_id = q.get("action"), q.get("entityType"), q.get("employeeId")
    start_date, end_date = q.get("startDate"), q.get("endDate")
    page = q.get("page", 1)
    limit = q.get("limit", 50)

    qs = PayrollAuditLog.objects.filter(org=org)
    if action:
        qs = qs.filter(action=action)
    if entity_type:
        qs = qs.filter(entity_type=entity_type)
    if employee_id:
        try:
            qs = qs.filter(affected_employee_id=employee_id)
            qs.exists()
        except (ValidationError, ValueError):
            raise ValueError(f'Cast to ObjectId failed for value "{employee_id}" (type string) at '
                             'path "affectedEmployee" for model "PayrollAuditLog"')
    if start_date:
        qs = qs.filter(created_at__gte=_date_or_error(start_date, "startDate"))
    if end_date:
        qs = qs.filter(created_at__lte=_date_or_error(end_date, "endDate"))

    total = qs.count()
    limit_i = parse_int(limit)
    skip = (to_number(page) - 1) * to_number(limit)
    rows = qs.select_related("affected_employee").order_by("-created_at")
    if isinstance(skip, float) and math.isfinite(skip) and skip > 0:
        rows = rows[int(skip):]
    if isinstance(limit_i, int) and limit_i > 0:
        rows = rows[:limit_i]
    page_i = parse_int(page)
    limit_n = to_number(limit)
    total_pages = math.ceil(total / limit_n) if limit_n and math.isfinite(limit_n) else None
    return send_response(200, True, "Audit logs fetched successfully", {
        "total": total,
        "page": page_i if isinstance(page_i, int) else None,
        "limit": limit_i if isinstance(limit_i, int) else None,
        "totalPages": total_pages,
        "data": serialize_logs(list(rows)),
    })


@payroll_view(["GET"])
def get_audit_log_by_id(ctx, logId):
    try:
        log = (PayrollAuditLog.objects.filter(org=ctx.require_org(), pk=logId)
               .select_related("affected_employee").first())
    except (ValidationError, ValueError):
        log = None
    if log is None:
        raise PayrollError("Audit log not found", 404)
    return send_response(200, True, "Audit log fetched successfully", serialize_logs([log])[0])


@payroll_view(["GET"])
def get_employee_audit_history(ctx, employeeId):
    try:
        logs = list(PayrollAuditLog.objects.filter(org=ctx.require_org(), affected_employee_id=employeeId)
                    .order_by("-created_at")[:100])
    except (ValidationError, ValueError):
        raise ValueError(f'Cast to ObjectId failed for value "{employeeId}" (type string) at path '
                         '"affectedEmployee" for model "PayrollAuditLog"')
    return send_response(200, True, "Employee audit history fetched successfully",
                         serialize_logs(logs, populate_employee=False))


ROUTES = [
    ("audit/logs", get_audit_logs, "audit_logs"),
    ("audit/log/<str:logId>", get_audit_log_by_id, "audit_log_by_id"),
    ("audit/employee/<str:employeeId>", get_employee_audit_history, "audit_employee_history"),
]
