const { toCalendarDate } = require('../financialYear');

/**
 * Each employee has their own payroll implementation date:
 * the Effective From date on their salary revision.
 * The earliest effective date is when that employee's payroll started.
 */
async function resolveEmployeeImplementationDate({
  employee,
  organizationId,
  SalaryRevisionModel,
}) {
  const fromEmployee = toCalendarDate(employee?.payrollInfo?.salaryEffectiveFrom);
  let fromRevision = null;

  if (SalaryRevisionModel && organizationId && employee?._id) {
    const firstRevision = await SalaryRevisionModel.findOne({
      organizationId,
      employeeId: employee._id,
      effectiveFrom: { $ne: null },
    })
      .sort({ effectiveFrom: 1 })
      .select('effectiveFrom')
      .lean();
    fromRevision = toCalendarDate(firstRevision?.effectiveFrom);
  }

  if (fromEmployee && fromRevision) {
    return fromEmployee < fromRevision ? fromEmployee : fromRevision;
  }
  return fromEmployee || fromRevision || null;
}

module.exports = {
  resolveEmployeeImplementationDate,
};
