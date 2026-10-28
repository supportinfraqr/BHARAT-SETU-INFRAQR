"""Salary revisions: create / approve / implement / list / delete.

Port of ``FINAL/legacy_payroll/controller/payroll/salaryRevision.js`` (HR only).
Implementing a revision updates ``PayrollEmployee.payroll_info`` exactly like legacy
updated ``employee.payrollInfo`` and creates the same ``Arrears`` document.
"""

import math
from datetime import datetime, timezone

from django.core.exceptions import ValidationError
from django.db import transaction

from ..context import PayrollError, by_method, get_employee, payroll_view, send_response
from ..services.audit_log import log_payroll_action
from ..services.jsmath import (UNDEFINED, is_nullish, js_or, js_round, js_str, js_truthy,
                               parse_int, to_fixed, to_number)
from ..services.loan_helper import js_date, js_iso, js_json, local_parts, populate_employee
from ..services.salary_component_helper import (normalize_overrides,
                                                resolve_revision_component_overrides,
                                                strip_basic_from_overrides, to_stored_overrides,
                                                with_explicit_basic_override)
from ..services.salary_revision_import_helper import (apply_state_to_employee,
                                                      apply_statutory_flags_to_employee,
                                                      build_revision_arrears)
from ..services.salary_structure_import_helper import compute_payroll_info_from_salary_input


def map_approval_for_response(approval=UNDEFINED):
    if approval is None:
        raise TypeError("Cannot read properties of null (reading 'employeeId')")
    a = {} if approval is UNDEFINED else approval
    return {
        "employeeId": js_or(a.get("employeeId"), None),
        "approverName": js_or(a.get("approverName"), ""),
        "approverRole": js_or(a.get("approverRole"), ""),
        "status": js_or(a.get("status"), ""),
        "comments": js_or(a.get("comments"), ""),
        "approvedDate": js_or(a.get("approvedDate"), None),
    }


def map_revision_for_response(data):
    approvals = data.get("approvals")
    return {**data, "approvals": [map_approval_for_response(a) for a in approvals]
            if isinstance(approvals, list) else []}


def extract_employee_overrides(employee_doc):
    raw = js_or((employee_doc.get("payrollInfo") or {}).get("componentOverrides"), [])
    return normalize_overrides(raw)


def _org_salary_inputs(org):
    from ..models import SalaryCompensation, StatutoryCompliance

    components = [c.to_dict() for c in SalaryCompensation.objects.filter(org=org)
                  .order_by("created_at", "id")]
    compliance = StatutoryCompliance.objects.filter(org=org).order_by("created_at").first()
    return components, (compliance.to_dict() if compliance is not None else None)


def build_revision_new_salary(org, employee_doc, new_salary=None, component_overrides=None,
                              effective_from=None, state=UNDEFINED):
    salary_components, compliance = _org_salary_inputs(org)
    new_salary = new_salary or {}
    gross_in = to_number(js_or(new_salary.get("grossSalary"), 0))
    basic_in = to_number(js_or(new_salary.get("basicSalary"), 0))
    ctc_in = to_number(js_or(new_salary.get("ctc"), 0))
    manual = gross_in > 0 and basic_in > 0 and ctc_in > 0
    normalized = normalize_overrides(component_overrides or [])
    calc_overrides = with_explicit_basic_override(normalized, basic_in, salary_components)
    st_info = employee_doc.get("statutoryInfo") or {}
    computed = compute_payroll_info_from_salary_input(
        base_salary=basic_in, gross_salary=gross_in,
        state=js_or(state, st_info.get("ptState", UNDEFINED)), employee=employee_doc,
        salary_components=salary_components, statutory_compliance=compliance,
        overrides=calc_overrides, salary_effective_from=effective_from,
        gross_salary_input=gross_in if manual else (gross_in if gross_in > 0 else None),
        ctc_input=ctc_in if manual else (ctc_in if ctc_in > 0 else None))
    if not computed.get("payrollInfo"):
        return {"error": js_or(computed.get("error"), "Unable to compute salary from gross")}
    info = computed["payrollInfo"]
    ctc, gross, basic = info["ctc"], info["grossSalary"], info["baseSalary"]
    if manual:
        ctc, gross = ctc_in, gross_in
        basic = js_round(basic_in) if basic_in > 0 else info["baseSalary"]
        if basic > gross or gross > ctc:
            return {"error": "Invalid salary structure. Please keep Basic ≤ Gross ≤ CTC"}
    return {
        "ctc": ctc, "grossSalary": gross, "basicSalary": basic,
        "components": computed["components"],
        "componentOverrides": to_stored_overrides(strip_basic_from_overrides(normalized)),
        "warnings": js_or(computed.get("warnings"), []),
        "inputMode": js_or(computed.get("inputMode"), "manual" if manual else "gross"),
    }


def _revision_qs(org):
    from ..models import SalaryRevision

    return SalaryRevision.objects.filter(org=org)


def _find_revision(org, revision_id, for_update=False):
    qs = _revision_qs(org)
    if for_update:
        qs = qs.select_for_update()
    try:
        return qs.filter(pk=revision_id).first()
    except (ValidationError, ValueError):
        return None


def _approver(ctx):
    """Legacy: ``User <userId>`` / 'Approver', or the HR employee's name + job title.
    BSS HR users are not payroll employees -> the acting user's name."""
    name = ctx.actor_name if ctx.actor_name and ctx.actor_name != "System" else \
        js_str(f"User {ctx.actor_id or ''}").strip()
    return name, "Approver"


@payroll_view(["POST"])
def create_salary_revision(ctx):
    from ..models import SalaryRevision

    org = ctx.require_org()
    body = ctx.body
    employee_id = body.get("employeeId")
    revision_type = body.get("revisionType")
    effective_from = body.get("effectiveFrom")
    new_salary = body.get("newSalary", UNDEFINED)
    if new_salary is UNDEFINED:
        new_salary = {}
    if (not js_truthy(employee_id) or not js_truthy(revision_type) or not js_truthy(effective_from)
            or not js_truthy(new_salary)):
        raise PayrollError("Employee ID, revision type, effective date, and new salary are required", 400)
    ns = new_salary if isinstance(new_salary, dict) else {}
    gross_in = to_number(js_or(ns.get("grossSalary"), 0))
    basic_in = to_number(js_or(ns.get("basicSalary"), 0))
    ctc_in = to_number(js_or(ns.get("ctc"), 0))
    manual = gross_in > 0 and basic_in > 0 and ctc_in > 0
    gross_mode = gross_in > 0 and not manual
    if not manual and not gross_mode:
        raise PayrollError("newSalary.grossSalary is required (or provide ctc, grossSalary, and "
                           "basicSalary manually)", 400)
    effective = js_date(effective_from)
    if effective is None:
        raise PayrollError("Effective date is invalid", 400)
    arrears_applicable = body.get("arrearsApplicable", UNDEFINED)
    arrears_start = None
    if js_truthy(arrears_applicable):
        if not js_truthy(body.get("arrearsFromDate")):
            raise PayrollError("Arrears from date is required when arrears is applicable", 400)
        arrears_start = js_date(body.get("arrearsFromDate"))
        if arrears_start is None:
            raise PayrollError("Arrears from date is invalid", 400)
        if arrears_start > effective:
            raise PayrollError("Arrears from date cannot be after effective date", 400)

    employee = get_employee(ctx, employee_id)
    emp_doc = employee.to_dict()
    employee_overrides = extract_employee_overrides(emp_doc)
    overrides = resolve_revision_component_overrides(
        body_overrides=body.get("componentOverrides", UNDEFINED),
        new_salary_overrides=ns.get("componentOverrides", UNDEFINED),
        employee_overrides=employee_overrides)
    synced = build_revision_new_salary(org, emp_doc, ns, overrides, effective,
                                       body.get("state", UNDEFINED))
    if "error" in synced:
        raise PayrollError(synced["error"], 400)

    pinfo = emp_doc.get("payrollInfo") or {}
    old_ctc = js_or(pinfo.get("ctc"), emp_doc.get("ctc", UNDEFINED), 0)
    old_gross = js_or(pinfo.get("grossSalary"), emp_doc.get("grossSalary", UNDEFINED), 0)
    old_basic = js_or(pinfo.get("baseSalary"), emp_doc.get("baseSalary", UNDEFINED), 0)
    increment = synced["ctc"] - to_number(old_ctc)
    pct = to_fixed((increment / to_number(old_ctc)) * 100, 2) if to_number(old_ctc) > 0 else 0
    arrears_amount, arrears_to = 0, None
    if js_truthy(arrears_applicable) and arrears_start is not None:
        ty, tm, _ = local_parts(effective)
        fy, fm, _ = local_parts(arrears_start)
        months = max(0, (ty - fy) * 12 + (tm - fm))
        arrears_amount = js_round((increment / 12) * months)
        arrears_to = effective

    if body.get("revisionType") not in ("increment", "promotion", "adjustment", "new_joiner",
                                        "annual_hike"):
        raise PayrollError(f"SalaryRevision validation failed: revisionType: `{js_str(revision_type)}`"
                           " is not a valid enum value for path `revisionType`.", 500)
    revision = SalaryRevision(
        org=org, employee=employee, revision_type=revision_type, effective_from=effective,
        old_salary={"ctc": old_ctc, "grossSalary": old_gross, "basicSalary": old_basic,
                    "components": [], "componentOverrides": to_stored_overrides(employee_overrides)},
        new_salary={"ctc": synced["ctc"], "grossSalary": synced["grossSalary"],
                    "basicSalary": synced["basicSalary"], "components": synced["components"],
                    "componentOverrides": synced["componentOverrides"]},
        increment_amount=increment, increment_percentage=pct,
        arrears_applicable=js_truthy(arrears_applicable),
        arrears_from_date=arrears_start if js_truthy(arrears_applicable) else None,
        arrears_to_date=arrears_to, arrears_amount=arrears_amount, arrears_paid=False,
        status="pending", requested_by=ctx.actor_id,
        remarks=js_str(body["remarks"]) if body.get("remarks") is not None else "")
    revision.new_salary = js_json(revision.new_salary)
    revision.old_salary = js_json(revision.old_salary)
    revision.save()
    log_payroll_action(ctx, action="salary_revision_created", entity_type="salary_revision",
                       entity_id=revision.pk, affected_employee=employee,
                       before_data={"ctc": js_json(old_ctc)},
                       after_data={"ctc": js_json(synced["ctc"])}, remarks="Salary revision created")
    data = {**map_revision_for_response(revision.to_dict()), "inputMode": synced["inputMode"],
            "warnings": synced["warnings"]}
    return send_response(201, True, "Salary revision created successfully", js_json(data))


@payroll_view(["PUT"])
def approve_salary_revision(ctx, revisionId):
    from ..models.salary_revision import new_approval

    org = ctx.require_org()
    body = ctx.body
    status = body.get("status")
    if status not in ("approved", "rejected"):
        raise PayrollError("Invalid status. Must be approved or rejected", 400)
    with transaction.atomic():
        revision = _find_revision(org, revisionId, for_update=True)
        if revision is None:
            raise PayrollError("Salary revision not found", 404)
        if revision.status != "pending":
            raise PayrollError(f"Only pending revisions can be {status}", 400)
        name, role = _approver(ctx)
        approvals = list(revision.approvals or [])
        approvals.append(new_approval(employeeId=None, approverName=name, approverRole=role,
                                      approvedDate=js_iso(datetime.now(timezone.utc)),
                                      status=status, comments=js_or(body.get("comments"), "")))
        revision.approvals = approvals
        revision.status = status
        revision.save()
    log_payroll_action(ctx, action="payroll_approved" if status == "approved" else "payroll_rejected",
                       entity_type="salary_revision", entity_id=revision.pk,
                       affected_employee=revision.employee, after_data={"status": status},
                       remarks=f"Salary revision {status}")
    return send_response(200, True, f"Salary revision {status} successfully",
                         js_json(map_revision_for_response(revision.to_dict())))


@payroll_view(["POST"])
def implement_salary_revision(ctx, revisionId):
    from ..models import PayrollEmployee

    org = ctx.require_org()
    with transaction.atomic():
        revision = _find_revision(org, revisionId, for_update=True)
        if revision is None:
            raise PayrollError("Salary revision not found", 404)
        if revision.status == "implemented":
            raise PayrollError("Salary revision is already implemented", 400)
        if revision.status != "approved":
            raise PayrollError("Only approved revisions can be implemented", 400)
        employee = PayrollEmployee.objects.select_for_update().filter(
            pk=revision.employee_id, org=org).first()
        if employee is None:
            raise PayrollError("Employee not found", 404)

        apply_statutory_flags_to_employee(employee, revision.statutory_applicability or {})
        apply_state_to_employee(employee, revision.state)
        emp_doc = employee.to_dict()
        new_salary = dict(revision.new_salary or {})
        merged = resolve_revision_component_overrides(
            body_overrides=None, new_salary_overrides=new_salary.get("componentOverrides", UNDEFINED),
            employee_overrides=extract_employee_overrides(emp_doc))
        synced = build_revision_new_salary(org, emp_doc, new_salary, merged, revision.effective_from)
        if "error" in synced:
            raise PayrollError(synced["error"], 400)

        new_salary.update({"ctc": synced["ctc"], "grossSalary": synced["grossSalary"],
                           "basicSalary": synced["basicSalary"], "components": synced["components"],
                           "componentOverrides": synced["componentOverrides"]})
        revision.new_salary = js_json(new_salary)

        info = dict(employee.payroll_info or {})
        info["ctc"] = js_json(synced["ctc"])
        info["grossSalary"] = js_json(synced["grossSalary"])
        info["baseSalary"] = js_json(synced["basicSalary"])
        info["salaryEffectiveFrom"] = js_iso(revision.effective_from)
        info["componentOverrides"] = synced["componentOverrides"]
        employee.payroll_info = info
        employee.save()

        arrears_record = None
        if revision.arrears_applicable and (revision.arrears_amount or 0) > 0:
            arrears_record = build_revision_arrears(revision, org, "Auto-created from salary revision")
            arrears_record.save()

        revision.status = "implemented"
        revision.implemented_date = datetime.now(timezone.utc)
        revision.save()
    log_payroll_action(ctx, action="salary_component_updated", entity_type="salary_revision",
                       entity_id=revision.pk, affected_employee=employee,
                       after_data={"ctc": info["ctc"], "grossSalary": info["grossSalary"],
                                   "baseSalary": info["baseSalary"]},
                       remarks="Salary revision implemented"
                       + (f"; arrears {arrears_record.pk} created" if arrears_record else ""))
    return send_response(200, True, "Salary revision implemented successfully", js_json({
        "revision": revision.to_dict(),
        "arrearsRecord": arrears_record.to_dict() if arrears_record is not None else None}))


EMP_FIELDS = ["firstName", "lastName", "email", "payrollInfo.employeeCode"]


def _populated(revision, employee_fields):
    from ..models import PayrollEmployee

    d = revision.to_dict()
    d["employeeId"] = (populate_employee(revision.employee, employee_fields)
                       if revision.employee_id else None)
    approvals = []
    for a in d.get("approvals") or []:
        a = dict(a)
        eid = a.get("employeeId")
        if eid:
            try:
                emp = PayrollEmployee.objects.filter(pk=eid).first()
            except (ValidationError, ValueError):
                emp = None
            a["employeeId"] = populate_employee(emp, EMP_FIELDS) if emp else None
        approvals.append(a)
    d["approvals"] = approvals
    return map_revision_for_response(d)


def _int_or(value, default):
    n = parse_int(value)
    return n if isinstance(n, int) and n != 0 else default


@payroll_view(["GET"])
def get_all_salary_revisions(ctx):
    org = ctx.require_org()
    page = max(1, _int_or(ctx.query("page", 1), 1))
    limit = max(1, _int_or(ctx.query("limit", 20), 20))
    qs = _revision_qs(org)
    if ctx.query("status"):
        qs = qs.filter(status=ctx.query("status"))
    try:
        if ctx.query("employeeId"):
            qs = qs.filter(employee_id=ctx.query("employeeId"))
        total = qs.count()
    except (ValidationError, ValueError):
        qs, total = qs.none(), 0
    rows = qs.select_related("employee").order_by("-created_at")[(page - 1) * limit:page * limit]
    return send_response(200, True, "Salary revisions fetched successfully", js_json({
        "total": total, "page": page, "limit": limit, "totalPages": math.ceil(total / limit),
        "data": [_populated(r, EMP_FIELDS) for r in rows]}))


@payroll_view(["GET"])
def get_salary_revision_by_id(ctx, revisionId):
    org = ctx.require_org()
    revision = _find_revision(org, revisionId)
    if revision is None:
        raise PayrollError("Salary revision not found", 404)
    return send_response(200, True, "Salary revision fetched successfully",
                         js_json(_populated(revision, ["firstName", "lastName", "email", "payrollInfo"])))


@payroll_view(["GET"])
def get_employee_revision_history(ctx, employeeId):
    org = ctx.require_org()
    try:
        rows = list(_revision_qs(org).filter(employee_id=employeeId).select_related("employee")
                    .order_by("-effective_from", "created_at"))
    except (ValidationError, ValueError):
        rows = []
    return send_response(200, True, "Employee revision history fetched successfully",
                         js_json([_populated(r, EMP_FIELDS) for r in rows]))


@payroll_view(["DELETE"])
def delete_salary_revision(ctx, revisionId):
    org = ctx.require_org()
    revision = _find_revision(org, revisionId)
    if revision is None:
        raise PayrollError("Salary revision not found", 404)
    if revision.status not in ("pending", "rejected"):
        raise PayrollError("Only pending or rejected revisions can be deleted", 400)
    employee = revision.employee
    rid = revision.pk
    revision.delete()
    log_payroll_action(ctx, action="salary_revision_deleted", entity_type="salary_revision",
                       entity_id=rid, affected_employee=employee, remarks="Salary revision deleted")
    return send_response(200, True, "Salary revision deleted successfully")


revision_by_id = by_method(GET=get_salary_revision_by_id, DELETE=delete_salary_revision)

ROUTES = [
    ("revision/create", create_salary_revision, "revision_create"),
    ("revision/<str:revisionId>/approve", approve_salary_revision, "revision_approve"),
    ("revision/<str:revisionId>/implement", implement_salary_revision, "revision_implement"),
    ("revision", get_all_salary_revisions, "revision_list"),
    ("revision/employee/<str:employeeId>", get_employee_revision_history, "revision_employee"),
    ("revision/<str:revisionId>", revision_by_id, "revision_by_id"),
]
