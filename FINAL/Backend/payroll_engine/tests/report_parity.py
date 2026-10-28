"""Helpers to run legacy controller handlers on the same data as the Django port.

``run_legacy(controller, handler, org, req, now=None)`` snapshots the org's payroll rows
into the in-memory mini-Mongo of ``tests/js/controller_harness.js`` (legacy-shaped docs:
``to_dict()``; Employee ``departmentId`` -> a Department doc named after the BSS
department string) and returns the captured legacy response.
"""

import json
import os

from payroll_engine.models import (Arrears, ClaimsDeclaration, EmployeeTDS,
                                   FullAndFinal, PayrollEmployee, PayrollRun, SalaryRevision)

from .legacy_js import LEGACY_DIR, run_js_batch

HARNESS = os.path.relpath(os.path.join(os.path.dirname(__file__), "js", "controller_harness.js"),
                          LEGACY_DIR)


def _json(value):
    return json.loads(json.dumps(value, default=str))


def collections_for(org):
    from payroll_engine import bss_adapter

    employees, departments = [], {}
    for emp in PayrollEmployee.objects.filter(org=org).order_by("created_at", "id"):
        doc = emp.to_dict()
        doc["departmentId"] = emp.department or None
        if emp.department:
            departments[emp.department] = {"_id": emp.department, "name": emp.department}
        employees.append(doc)

    def docs(model):
        return [d.to_dict() for d in model.objects.filter(org=org).order_by("created_at", "id")]

    profile = bss_adapter.org_profile(org)
    collections = {
        "EmployeeModel": employees,
        "DepartmentModel": list(departments.values()),
        "PayrollRunModel": docs(PayrollRun),
        "EmployeeTDSModel": docs(EmployeeTDS),
        "FullAndFinalModel": docs(FullAndFinal),
        "ClaimsDeclarationModel": docs(ClaimsDeclaration),
        "SalaryRevisionModel": docs(SalaryRevision),
        "ArrearsModel": docs(Arrears),
        "BankFileRecordModel": [],
        "OrganizationModel": [{**profile, "_id": "org"}],
    }
    for coll in collections.values():
        for d in coll:
            d["organizationId"] = "org"
    return _json(collections)


REFS = {
    "PayrollRunModel": {"employeeId": "EmployeeModel"},
    "EmployeeTDSModel": {"employeeId": "EmployeeModel"},
    "EmployeeModel": {"departmentId": "DepartmentModel"},
}


def run_legacy(controller, handler, org, req, now=None):
    (res,) = run_js_batch([{"module": HARNESS, "fn": "run", "args": [{
        "controller": controller, "handler": handler, "collections": collections_for(org),
        "refs": REFS, "req": req, **({"now": now} if now else {})}]}])
    if isinstance(res, dict) and "$error" in res:
        raise RuntimeError(res["$error"])
    return res
