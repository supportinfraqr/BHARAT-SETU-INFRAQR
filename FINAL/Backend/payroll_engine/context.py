"""Request context, auth and the legacy response envelope for payroll endpoints.

Every legacy controller did::

    const org_uuid = req.headers.org_uuid;      // tenant
    const userId   = req.userId;                // logged-in system user
    ... return sendResponse(res, 200, true, 'msg', data)

Here ``@payroll_view`` gives each view a ``PayrollContext`` with the same pieces:

* ``ctx.org``       — owning BSS user (contractor / employer). Admins pick an org
                      via the ``X-Payroll-Org`` header or ``?orgId=`` query param.
* ``ctx.user``      — acting user (employer-staff already resolved to employer by
                      BSS auth; the real actor is ``ctx.actor``).
* ``ctx.employee``  — for worker (self-service) requests, their PayrollEmployee.
* ``ctx.is_hr`` / ``ctx.is_employee`` — role gates.
"""

import functools
import logging
from dataclasses import dataclass, field

from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.v1_bridge.common import BssSessionAuthentication

from . import bss_adapter

logger = logging.getLogger("payroll_engine")


class PayrollError(Exception):
    """Raise inside a view to return ``{status:false, success:false, message}``."""

    def __init__(self, message, status=400, data=None):
        super().__init__(message)
        self.status = status
        self.data = data


def send_response(status, success, message, data=None):
    """Legacy ``sendResponse`` envelope."""
    return Response({"status": status < 400, "success": success, "message": message,
                     "data": {} if data is None else data}, status=status)


def handle_error(err, status=500):
    """Legacy ``handleError`` envelope."""
    message = str(err) or "Internal server error"
    return Response({"status": status, "success": False, "message": message}, status=status)


def file_response(content, filename, content_type="application/pdf", inline=False):
    resp = HttpResponse(content, content_type=content_type)
    disposition = "inline" if inline else "attachment"
    resp["Content-Disposition"] = f'{disposition}; filename="{filename}"'
    resp["Cache-Control"] = "no-store"
    return resp


@dataclass
class PayrollContext:
    request: object
    user: object
    actor: object
    org: object = None
    employee: object = None
    role: str = ""
    extras: dict = field(default_factory=dict)

    @property
    def is_admin(self):
        return self.role in bss_adapter.ADMIN_ROLES

    @property
    def is_hr(self):
        return self.role in bss_adapter.HR_ROLES

    @property
    def is_employee(self):
        return self.role == "worker"

    @property
    def org_id(self):
        return self.org.pk if self.org is not None else None

    @property
    def actor_id(self):
        return str(getattr(self.actor, "pk", "") or "")

    @property
    def actor_name(self):
        return (getattr(self.actor, "full_name", "") or getattr(self.actor, "username", "")
                or "System")

    def query(self, key, default=None):
        return self.request.query_params.get(key, default)

    @property
    def body(self):
        data = self.request.data
        if hasattr(data, "dict") and not isinstance(data, dict):
            # QueryDict (multipart) -> plain dict, keeping lists for repeated keys.
            return {k: (v if len(v) > 1 else v[0]) for k, v in data.lists()}
        return data if isinstance(data, dict) else {}

    def require_org(self):
        if self.org is None:
            raise PayrollError("Organization UUID missing", 400)
        return self.org

    def require_employee(self):
        if self.employee is None:
            raise PayrollError("Employee not found", 404)
        return self.employee


def _resolve_org(request, user, role):
    if role in bss_adapter.ORG_ROLES:
        return user
    if role in bss_adapter.ADMIN_ROLES:
        org_id = request.headers.get("X-Payroll-Org") or request.query_params.get("orgId")
        return bss_adapter.get_org_user(org_id) if org_id else None
    return None


def payroll_view(methods, access="hr"):
    """Decorate a payroll endpoint.

    ``access``:
      * ``"hr"``       — contractor / employer / BSS admin (org-scoped)
      * ``"employee"`` — worker self-service only
      * ``"any"``      — both (view checks ``ctx.is_employee`` itself)
    """
    def decorator(fn):
        @api_view(methods)
        @authentication_classes([BssSessionAuthentication])
        @permission_classes([IsAuthenticated])
        @functools.wraps(fn)
        def wrapper(request, *args, **kwargs):
            user = request.user
            role = getattr(user, "role", "")
            if access == "hr" and role not in bss_adapter.HR_ROLES:
                return send_response(403, False, "Payroll administration is not available for this role")
            if access == "employee" and role != "worker":
                return send_response(403, False, "This payroll endpoint is for employees only")
            if access == "any" and role not in bss_adapter.HR_ROLES and role != "worker":
                return send_response(403, False, "Payroll is not available for this role")
            actor = getattr(request._request, "actor", None) or user
            ctx = PayrollContext(request=request, user=user, actor=actor, role=role)
            try:
                if role == "worker":
                    ctx.employee = bss_adapter.employee_for_worker(user, request.query_params.get("orgId"))
                    ctx.org = ctx.employee.org if ctx.employee else None
                else:
                    ctx.org = _resolve_org(request, user, role)
                    if ctx.org is not None:
                        bss_adapter.sync_employees(ctx.org)
                return fn(ctx, *args, **kwargs)
            except PayrollError as err:
                body = {"status": False, "success": False, "message": str(err)}
                if err.data is not None:
                    body["data"] = err.data
                return Response(body, status=err.status)
            except Exception as err:  # noqa: BLE001 — legacy handleError semantics
                logger.exception("payroll_engine %s failed", fn.__name__)
                return handle_error(err, 500)
        return wrapper
    return decorator


def employee_queryset(ctx, include_inactive=True):
    """PayrollEmployee rows visible to the request (org scope / own row)."""
    from .models import PayrollEmployee

    if ctx.is_employee:
        return PayrollEmployee.objects.filter(pk=ctx.employee.pk) if ctx.employee \
            else PayrollEmployee.objects.none()
    qs = PayrollEmployee.objects.filter(org=ctx.require_org())
    if not include_inactive:
        qs = qs.exclude(status="Inactive")
    return qs


def get_employee(ctx, employee_id):
    """Fetch an employee by id within scope, or raise 404 ``Employee not found``."""
    from django.core.exceptions import ValidationError

    try:
        emp = employee_queryset(ctx).filter(pk=employee_id).first()
    except (ValidationError, ValueError):
        emp = None
    if emp is None:
        raise PayrollError("Employee not found", 404)
    return emp
