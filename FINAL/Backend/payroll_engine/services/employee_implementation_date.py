"""Per-employee payroll implementation date.

Port of ``FINAL/legacy_payroll/utils/payroll/employeeImplementationDate.js``.

Exported (legacy name -> port):
    resolveEmployeeImplementationDate -> resolve_employee_implementation_date

Signature change: the legacy ``({ employee, organizationId, SalaryRevisionModel })`` is
``resolve_employee_implementation_date(employee=..., organization_id=...)`` — the Mongoose
model parameter is dropped and the Django ``SalaryRevision`` model
(``payroll_engine.models.salary_revision``) is queried instead. The legacy function was
async; this one is sync. Returns a ``datetime.date`` (legacy: local-midnight ``Date``)
or ``None``.
"""

from .financial_year import to_calendar_date
from .jsmath import UNDEFINED, js_opt, js_truthy


def _employee_pk(employee):
    if employee is None or employee is UNDEFINED:
        return UNDEFINED
    if isinstance(employee, dict):
        return js_opt(employee, "_id")
    return getattr(employee, "pk", UNDEFINED)


def _salary_effective_from(employee):
    if isinstance(employee, dict) or employee is None or employee is UNDEFINED:
        return js_opt(js_opt(employee, "payrollInfo"), "salaryEffectiveFrom")
    info = getattr(employee, "payroll_info", None) or {}
    return js_opt(info, "salaryEffectiveFrom")


def _salary_revision_model():
    try:
        from ..models import SalaryRevision
    except ImportError:
        try:
            from ..models.salary_revision import SalaryRevision
        except ImportError:
            return None
    return SalaryRevision


def resolve_employee_implementation_date(employee=UNDEFINED, organization_id=UNDEFINED):
    """Earliest of ``payrollInfo.salaryEffectiveFrom`` and the employee's first salary
    revision ``effectiveFrom`` (each employee's payroll start)."""
    from_employee = to_calendar_date(_salary_effective_from(employee))
    from_revision = None

    emp_pk = _employee_pk(employee)
    model = _salary_revision_model()
    if model is not None and js_truthy(organization_id) and js_truthy(emp_pk):
        first = (model.objects
                 .filter(org=organization_id, employee=emp_pk, effective_from__isnull=False)
                 .order_by("effective_from")
                 .values_list("effective_from", flat=True)
                 .first())
        from_revision = to_calendar_date(first)

    if from_employee and from_revision:
        return from_employee if from_employee < from_revision else from_revision
    return from_employee or from_revision or None
