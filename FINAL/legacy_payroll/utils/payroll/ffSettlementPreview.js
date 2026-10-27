const { calculateStatutoryBonus } = require('./statutoryCalculator');
const { getEmployeeLeaveEncashmentDetails } = require('./ffLeaveEncashmentHelper');

const GRATUITY_CAP = 2000000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EARLY_GRATUITY_EXITS = ['Expired (Death)', 'Permanent Disability'];

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function serviceBreakup(joiningDate, lastWorkingDate) {
  const empty = { completedYears: 0, extraDays: 0, gratuityYears: 0 };
  if (!joiningDate || !lastWorkingDate) return empty;
  const start = new Date(joiningDate);
  const end = new Date(lastWorkingDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return empty;

  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  if (anniversary > end) {
    years -= 1;
    anniversary.setFullYear(start.getFullYear() + years);
  }
  const extraDays = Math.max(0, Math.floor((end - anniversary) / 86400000));
  return {
    completedYears: Math.max(0, years),
    extraDays,
    gratuityYears: Math.max(0, years) + (extraDays >= 183 ? 1 : 0),
  };
}

function monthsInBonusYear(lastWorkingDate) {
  const end = new Date(lastWorkingDate);
  const month = end.getMonth();
  const bonusYearStartMonth = 3;
  if (month >= bonusYearStartMonth) return month - bonusYearStartMonth + 1;
  return month + 1 + (12 - bonusYearStartMonth);
}

function daAmount(payrollInfo = {}) {
  const rows = [...(payrollInfo.componentOverrides || []), ...(payrollInfo.defaultComponents || [])];
  return rows.reduce((sum, row) => {
    const name = String(row?.name || row?.componentName || '');
    if (!/dearness|\bda\b/i.test(name) || row?.disabled) return sum;
    return sum + (Number(row.overrideAmount ?? row.amount) || 0);
  }, 0);
}

function leaveRate(method, basic, gross) {
  const useGross = String(method).startsWith('gross');
  const divisor = String(method).endsWith('30') ? 30 : 26;
  const base = useGross ? gross : basic;
  const perDayRate = base > 0 ? roundMoney(base / divisor) : 0;
  const label = `${useGross ? 'Gross' : 'Basic'} / ${divisor}`;
  return { perDayRate, label, formula: `${label} = ${roundMoney(base)} / ${divisor}` };
}

function buildGratuity({ basic, da, joiningDate, lastWorkingDate, exitStatus }) {
  const wage = roundMoney((Number(basic) || 0) + (Number(da) || 0));
  const service = serviceBreakup(joiningDate, lastWorkingDate);
  const earlyExit = EARLY_GRATUITY_EXITS.includes(exitStatus);
  const isEligible = earlyExit || service.completedYears >= 5;
  let reason = `Completed service is ${service.completedYears} year(s) and ${service.extraDays} day(s).`;
  if (earlyExit) reason = 'Payable on death or permanent disability without the 5 year condition.';
  else if (service.completedYears >= 5) reason = 'Eligible under the Payment of Gratuity Act. A balance of 6 months or more counts as one more year.';
  else reason = `${reason} Minimum continuous service is 5 years.`;

  const raw = isEligible ? (wage * 15 * service.gratuityYears) / 26 : 0;
  const capped = raw > GRATUITY_CAP;
  const gratuityAmount = roundMoney(Math.min(GRATUITY_CAP, raw));
  const formula = isEligible
    ? `(Last drawn Basic + DA × 15 × ${service.gratuityYears}) / 26${capped ? '. Capped at 20,00,000.' : ''}`
    : 'Not eligible';

  return {
    isEligible,
    yearsOfService: service.gratuityYears,
    completedYears: service.completedYears,
    lastDrawnSalary: wage,
    gratuityAmount,
    formula,
    reason,
    capped,
  };
}

async function buildSettlementPreview({ org_uuid, employeeId, lastWorkingDate, initModels }) {
  const { EmployeeModel, PayrollRunModel, StatutoryComplianceModel } = await initModels(org_uuid);
  const employee = await EmployeeModel.findById(employeeId)
    .select('firstName lastName email uniqueId jobTitle dateOfJoining status exitData payrollInfo presentAddress permanentAddress')
    .lean();
  if (!employee) return { error: { status: 404, message: 'Employee not found' } };

  const lwd = lastWorkingDate ? new Date(lastWorkingDate) : new Date(employee.exitData?.lastWorkingDay || employee.exitData?.date || Date.now());
  if (Number.isNaN(lwd.getTime())) return { error: { status: 400, message: 'Invalid last working date' } };

  const basic = Number(employee.payrollInfo?.baseSalary) || 0;
  const gross = Number(employee.payrollInfo?.grossSalary) || 0;
  const da = daAmount(employee.payrollInfo);
  const allowances = Math.max(0, roundMoney(gross - basic));
  const monthDays = daysInMonth(lwd);
  const workedDays = Math.min(monthDays, lwd.getDate());

  const paidRun = await PayrollRunModel.findOne({
    organizationId: org_uuid,
    employeeId,
    month: MONTHS[lwd.getMonth()],
    year: lwd.getFullYear(),
    payStatus: { $in: ['processed', 'approved', 'paid'] },
  }).select('_id payStatus').lean();

  const proratedSalary = paidRun ? 0 : roundMoney((gross * workedDays) / monthDays);
  const salaryFormula = paidRun
    ? `Salary for ${MONTHS[lwd.getMonth()]} ${lwd.getFullYear()} is already processed, so prorated salary is 0.`
    : `Prorated salary = monthly gross ${roundMoney(gross)} × ${workedDays} / ${monthDays}. Basic and allowances are not added again.`;

  const leaveResult = await getEmployeeLeaveEncashmentDetails({
    org_uuid,
    employeeId,
    asOfDate: lwd,
    initModels,
  });
  const leave = leaveResult?.data?.leaveEncashment || {};
  const method = 'basic_26';
  const rate = leaveRate(method, basic, gross);
  const encashableLeaves = Number(leave.encashableLeaves) || 0;
  const leaveTotal = roundMoney(encashableLeaves * rate.perDayRate);

  const compliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid }).lean();
  const bonusConfig = compliance?.statutoryBonus;
  const months = monthsInBonusYear(lwd);
  const statutory = calculateStatutoryBonus({
    bonusConfig,
    basicPlusDA: basic + da,
    employeeState: employee.presentAddress?.state || employee.permanentAddress?.state || null,
    month: null,
    year: lwd.getFullYear(),
  });
  const monthlyBonus = Number(statutory.details?.monthlyEquivalent) || 0;
  const statutoryBonus = statutory.applicable || monthlyBonus > 0 ? roundMoney(monthlyBonus * months) : 0;
  const variablePay = Number(employee.payrollInfo?.variablePay) || 0;
  const incentiveAnnual = Number(employee.payrollInfo?.incentives) || 0;
  let bonusFormula = 'Statutory bonus is not enabled in payroll compliance.';
  if (bonusConfig?.isEnabled && statutory.details?.reason) bonusFormula = `Statutory bonus not applied: ${statutory.details.reason}.`;
  if (statutoryBonus > 0) {
    bonusFormula = `Bonus Act: wage base ${roundMoney(statutory.details?.calcBase)} × ${statutory.details?.percentage || bonusConfig?.percentage || 8.33}% × ${months} month(s) of the April–March year.`;
  }

  const gratuity = buildGratuity({
    basic,
    da,
    joiningDate: employee.dateOfJoining,
    lastWorkingDate: lwd,
    exitStatus: employee.exitData?.exitStatus || '',
  });

  return {
    data: {
      employee: {
        id: employee._id,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        employeeCode: employee.uniqueId || '',
        exitStatus: employee.exitData?.exitStatus || '',
        dateOfJoining: employee.dateOfJoining || null,
      },
      salaryDues: {
        unpaidSalary: 0,
        workingDaysInLastMonth: workedDays,
        proratedSalary,
        basicSalary: roundMoney(basic),
        allowances,
        formula: salaryFormula,
      },
      leaveEncashment: {
        availableLeaves: Number(leave.availableLeaves) || 0,
        encashableLeaves,
        perDayRate: rate.perDayRate,
        totalAmount: leaveTotal,
        method,
        basicSalary: roundMoney(basic),
        grossSalary: roundMoney(gross),
        formula: `Encashable leaves × (${rate.formula}). Only paid leave types marked encashable are counted.`,
      },
      bonusIncentives: {
        performanceBonus: roundMoney((variablePay * months) / 12),
        statutoryBonus,
        incentives: roundMoney((incentiveAnnual * months) / 12),
        commission: 0,
        method: bonusConfig?.isEnabled ? 'bonus_act' : 'not_enabled',
        formula: bonusFormula,
        monthsCounted: months,
        calcBase: roundMoney(statutory.details?.calcBase) || 0,
        percentage: Number(statutory.details?.percentage || bonusConfig?.percentage) || 0,
        eligible: statutoryBonus > 0,
      },
      gratuity,
    },
  };
}

module.exports = {
  buildSettlementPreview,
  leaveRate,
  buildGratuity,
  GRATUITY_CAP,
};
