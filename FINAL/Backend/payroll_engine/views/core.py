"""BSS-integration endpoints that the legacy app got from its HRMS modules.

The legacy payroll leaned on the HRMS ``employee`` / ``organization`` routers
for the employee master and exit data. In BSS the person master is the worker
profile, so these endpoints expose the synced payroll employee list, let HR
correct payroll-relevant fields (bank / statutory / PAN) and record an exit
(the input to Full & Final settlement).
"""

from django.db.models import Q
from django.utils import timezone

from .. import bss_adapter
from ..context import PayrollError, employee_queryset, get_employee, payroll_view, send_response

EXIT_STATUSES = ["Absconding", "AWOL", "Contract Expiry", "Deported", "Expired (Death)",
                 "Resigned", "Retired", "Permanent Disability", "Termination",
                 "Superannuation", "Cessation", "Abandonment", "Misconduct",
                 "Poor Performance", "Others"]

# Editable groups -> allowed keys (anything else in the body is ignored).
EDITABLE = {
    "bankInfo": ("bank_info", {"bankName", "branchName", "ifscCode", "bankAccountNumber",
                               "confirmBankAccountNumber", "accountHolderName", "accountType",
                               "bankCode", "bankCountry", "swiftCode", "isVerified"}),
    "statutoryInfo": ("statutory_info", {"pfAccountNumber", "uan", "esiNumber", "esiApplicable",
                                         "esiOptedOut", "ptApplicable", "ptState",
                                         "gratuityApplicable", "lwfApplicable", "lwfState",
                                         "employmentCategory", "epfOverride", "epfApplicable"}),
    "nationalID": ("national_id", {"pan", "nameInPan"}),
}
SCALARS = {"customId": "custom_id", "jobTitle": "job_title", "department": "department",
           "employeeType": "employee_type", "categoryName": "category_name"}


@payroll_view(["GET"], access="any")
def payroll_context(ctx):
    data = {"role": ctx.role, "isAdmin": ctx.is_admin, "isEmployee": ctx.is_employee,
            "organization": bss_adapter.org_profile(ctx.org) if ctx.org else None}
    if ctx.is_admin:
        data["organizations"] = bss_adapter.list_orgs()
    if ctx.is_employee:
        data["employee"] = ctx.employee.to_dict() if ctx.employee else None
    return send_response(200, True, "Payroll context", data)


@payroll_view(["GET"])
def list_organizations(ctx):
    if not ctx.is_admin:
        raise PayrollError("Only BSS admins can list payroll organizations", 403)
    return send_response(200, True, "Organizations fetched", bss_adapter.list_orgs())


@payroll_view(["GET"])
def list_employees(ctx):
    qs = employee_queryset(ctx)
    status_filter = ctx.query("status")
    if status_filter:
        qs = qs.filter(status=status_filter)
    search = (ctx.query("search") or "").strip()
    if search:
        qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search)
                       | Q(unique_id__icontains=search) | Q(custom_id__icontains=search)
                       | Q(mobile__icontains=search))
    rows = [e.to_dict() for e in qs.order_by("first_name", "last_name")]
    return send_response(200, True, "Employees fetched", rows)


@payroll_view(["GET"])
def get_employee_detail(ctx, employeeId):
    return send_response(200, True, "Employee fetched", get_employee(ctx, employeeId).to_dict())


@payroll_view(["POST"])
def sync_now(ctx):
    count = bss_adapter.sync_employees(ctx.require_org(), force=True)
    return send_response(200, True, "Employees synced from BSS", {"updated": count})


@payroll_view(["PUT"])
def update_employee_profile(ctx, employeeId):
    emp = get_employee(ctx, employeeId)
    body = ctx.body
    locked = set(emp.locked_fields or [])
    for key, (attr, allowed) in EDITABLE.items():
        patch = body.get(key)
        if not isinstance(patch, dict):
            continue
        current = dict(getattr(emp, attr) or {})
        for sub, value in patch.items():
            if sub in allowed:
                current[sub] = value
                locked.add(f"{key}.{sub}" if key == "statutoryInfo" else attr)
        setattr(emp, attr, current)
    for key, attr in SCALARS.items():
        if key in body:
            setattr(emp, attr, str(body.get(key) or "")[:120])
            locked.add(attr)
    emp.locked_fields = sorted(locked)
    emp.save()
    return send_response(200, True, "Employee payroll profile updated", emp.to_dict())


@payroll_view(["PUT"])
def update_employee_exit(ctx, employeeId):
    """Record (or clear) an exit — the trigger for Full & Final settlement."""
    emp = get_employee(ctx, employeeId)
    body = ctx.body
    exit_status = str(body.get("exitStatus") or "")
    if exit_status and exit_status not in EXIT_STATUSES:
        raise PayrollError(f"exitStatus must be one of: {', '.join(EXIT_STATUSES)}")
    if not exit_status:
        emp.exit_data = {"exitStatus": "", "date": None, "reason": "", "authorizedBy": None,
                         "lastWorkingDay": None}
        emp.status = "Active"
    else:
        last_day = body.get("lastWorkingDay") or body.get("date")
        if not last_day:
            raise PayrollError("lastWorkingDay is required")
        emp.exit_data = {"exitStatus": exit_status, "date": body.get("date") or last_day,
                         "reason": str(body.get("reason") or ""), "authorizedBy": ctx.actor_id,
                         "lastWorkingDay": last_day, "recordedAt": timezone.now().isoformat()}
        emp.status = "Inactive"
    emp.save()
    return send_response(200, True, "Employee exit updated", emp.to_dict())


def _worker_owns_file(employee, key):
    """Workers may only open uploads referenced by their own claims or TDS declaration."""
    import json

    from ..models import ClaimsDeclaration, EmployeeTDS

    if employee is None:
        return False
    needle = f"/v1/payroll-engine/files/{key}"
    docs = [*ClaimsDeclaration.objects.filter(org=employee.org, employee=employee),
            *EmployeeTDS.objects.filter(org=employee.org, employee=employee)]
    return any(needle in json.dumps(doc.to_dict(), default=str) for doc in docs)


@payroll_view(["GET"], access="any")
def serve_file(ctx, key):
    """Authenticated download of a payroll attachment (scoped to the caller's org)."""
    import mimetypes

    from django.http import FileResponse

    from ..services.files import open_file

    org_id = str(key).split("/", 1)[0]
    if ctx.org is None or str(ctx.org.pk) != org_id:
        raise PayrollError("File not found", 404)
    if ctx.is_employee and not _worker_owns_file(ctx.employee, key):
        raise PayrollError("File not found", 404)
    handle, name = open_file(key)
    content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
    return FileResponse(handle, content_type=content_type, filename=name)


ROUTES = [
    ("context", payroll_context, "context"),
    ("organizations", list_organizations, "organizations"),
    ("employees", list_employees, "employees"),
    ("employees/sync", sync_now, "employees_sync"),
    ("employees/<str:employeeId>", get_employee_detail, "employee_detail"),
    ("employees/<str:employeeId>/profile", update_employee_profile, "employee_profile"),
    ("employees/<str:employeeId>/exit", update_employee_exit, "employee_exit"),
    ("files/<path:key>", serve_file, "files"),
]
