/**
 * Employee ID shown on payslips/reports: custom ID first, then the
 * auto-generated unique ID, then the legacy payroll employee code.
 */
function resolveEmployeeDisplayCode(employee = {}, fallback = '') {
  const code =
    employee?.customId ||
    employee?.uniqueId ||
    employee?.payrollInfo?.employeeCode ||
    '';

  return String(code).trim() || fallback;
}

/** Projection fields required by resolveEmployeeDisplayCode(). */
const EMPLOYEE_DISPLAY_CODE_FIELDS =
  'customId uniqueId payrollInfo.employeeCode';

module.exports = {
  resolveEmployeeDisplayCode,
  EMPLOYEE_DISPLAY_CODE_FIELDS,
};
