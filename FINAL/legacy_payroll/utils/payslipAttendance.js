const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthIndex(monthName) {
  if (monthName === null || monthName === undefined) return -1;
  const raw = String(monthName).trim();
  if (!raw) return -1;

  const shortIdx = MONTHS.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return shortIdx;

  const monthMap = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const mapped = monthMap[raw.toLowerCase()];
  return mapped !== undefined ? mapped : -1;
}

function getMonthDateStrings(monthName, year) {
  const monthIdx = getMonthIndex(monthName);
  if (monthIdx === -1 || !year) return null;
  const y = Number(year);
  const mm = String(monthIdx + 1).padStart(2, '0');
  const lastDay = new Date(y, monthIdx + 1, 0).getDate();
  return {
    startDate: `${y}-${mm}-01`,
    endDate: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

function getCalendarDaysInMonth(monthName, year) {
  const monthIdx = getMonthIndex(monthName);
  const y = Number(year);
  if (monthIdx === -1 || !Number.isInteger(y)) return 0;
  return new Date(y, monthIdx + 1, 0).getDate();
}

/**
 * Salary-slip paid days must match payroll process (standard):
 * Paid Days = Calendar Days − LOP  (stored on payroll as presentDays)
 * Week offs + holidays are already included as paid via that formula.
 */
function resolvePayslipPaidDays(payroll = {}, month, year) {
  const payMonth = month || payroll.month;
  const payYear = year || payroll.year;
  const calendarDays = getCalendarDaysInMonth(payMonth, payYear);
  const workingDays = Math.max(0, Number(payroll.workingDays) || 0);
  const lopDays = Math.max(0, Number(payroll.lopDays) || 0);
  const storedPresent = Number(payroll.presentDays);

  // Process payroll stores payable paid days in presentDays
  if (Number.isFinite(storedPresent)) {
    return {
      workingDays: workingDays || calendarDays,
      paidDays: Math.max(0, storedPresent),
      presentDays: Math.max(0, storedPresent),
      lopDays,
      calendarDays,
      source: 'payroll',
    };
  }

  // Fallback: Calendar Days − LOP
  if (calendarDays > 0) {
    const paidDays = Math.max(0, calendarDays - lopDays);
    return {
      workingDays: workingDays || calendarDays,
      paidDays,
      presentDays: paidDays,
      lopDays,
      calendarDays,
      source: 'calendar-lop',
    };
  }

  const paidDays = Math.max(0, workingDays - lopDays);
  return {
    workingDays,
    paidDays,
    presentDays: paidDays,
    lopDays,
    calendarDays,
    source: 'working-lop',
  };
}

/**
 * Payslip Working/Paid days — always aligned with payroll-run values
 * used for salary calculation (standard paid days).
 */
async function getPayslipAttendanceDays(org_uuid, employeeId, month, year, fallbackPayroll = {}) {
  return resolvePayslipPaidDays(fallbackPayroll, month, year);
}

module.exports = {
  getMonthDateStrings,
  getCalendarDaysInMonth,
  resolvePayslipPaidDays,
  getPayslipAttendanceDays,
};
