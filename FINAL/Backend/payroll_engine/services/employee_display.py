"""Employee code shown on payslips / reports.

Port of ``FINAL/legacy_payroll/utils/payroll/employeeDisplay.js``.

Exported (legacy name -> port):
    resolveEmployeeDisplayCode    -> resolve_employee_display_code
    EMPLOYEE_DISPLAY_CODE_FIELDS  (Mongo projection string, kept verbatim)
"""

from .jsmath import UNDEFINED, js_opt, js_or, js_str, js_trim

EMPLOYEE_DISPLAY_CODE_FIELDS = "customId uniqueId payrollInfo.employeeCode"


def resolve_employee_display_code(employee=UNDEFINED, fallback=""):
    """Custom ID first, then the auto-generated unique ID, then the legacy payroll
    employee code; ``fallback`` when all are blank."""
    if employee is UNDEFINED:
        employee = {}
    if fallback is UNDEFINED:
        fallback = ""
    code = js_or(
        js_opt(employee, "customId"),
        js_opt(employee, "uniqueId"),
        js_opt(js_opt(employee, "payrollInfo"), "employeeCode"),
        "",
    )
    return js_or(js_trim(js_str(code)), fallback)
