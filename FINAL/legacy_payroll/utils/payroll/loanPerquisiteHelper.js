const { isEmiDueForPayrollMonth, normalizePayrollMonth } = require('./loanHelper');

const SMALL_LOAN_EXEMPT_LIMIT = 20000;

function isLoanPerquisiteExempt(loan = {}, loanType = {}) {
  if (loan.exemptFromPerquisite) {
    return true;
  }

  if ((loan.loanAmount || 0) <= SMALL_LOAN_EXEMPT_LIMIT) {
    return true;
  }

  const loanName = String(loanType.loanName || '').trim().toLowerCase();
  if (loanName.includes('medical')) {
    return true;
  }

  return false;
}

function calculateMonthlyLoanPerquisiteForLoan(loan = {}, loanType = {}, interestRateCharged = 0) {
  if (isLoanPerquisiteExempt(loan, loanType)) {
    return 0;
  }

  const outstanding = loan.outstandingBalance || 0;
  if (outstanding <= 0) {
    return 0;
  }

  const prescribedRate = Number(loanType.perquisiteRate) || 0;
  const chargedRate = Number(interestRateCharged) || 0;
  const effectiveRate = Math.max(0, prescribedRate - chargedRate);
  if (effectiveRate <= 0) {
    return 0;
  }

  return Math.round((outstanding * effectiveRate) / 100 / 12);
}

function resolvePerquisiteMonthCount(months) {
  if (months === undefined || months === null || months === '') return 12;
  const count = Number(months);
  if (!Number.isFinite(count) || count < 0) return 12;
  return count;
}

function calculateAnnualLoanPerquisiteForLoan(loan = {}, loanType = {}, months = 12) {
  const monthly = calculateMonthlyLoanPerquisiteForLoan(loan, loanType);
  return monthly * resolvePerquisiteMonthCount(months);
}

async function fetchActiveLoansForPerquisite(organizationId, employeeId, EmployeeLoanModel) {
  if (!EmployeeLoanModel) {
    return [];
  }

  return EmployeeLoanModel.find({
    organizationId,
    employeeId,
    status: 'active',
    outstandingBalance: { $gt: 0 },
  })
    .populate('loanTypeId', 'loanName perquisiteRate status')
    .lean();
}

async function calculateEmployeeAnnualLoanPerquisite({
  organizationId,
  employeeId,
  EmployeeLoanModel,
  months = 12,
}) {
  const monthCount = resolvePerquisiteMonthCount(months);
  const loans = await fetchActiveLoansForPerquisite(
    organizationId,
    employeeId,
    EmployeeLoanModel
  );

  let annualTotal = 0;
  const breakdown = [];

  for (const loan of loans) {
    const loanType = loan.loanTypeId || {};
    const annualAmount = calculateAnnualLoanPerquisiteForLoan(loan, loanType, monthCount);
    if (annualAmount <= 0) continue;

    annualTotal += annualAmount;
    breakdown.push({
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      loanName: loanType.loanName || '',
      outstandingBalance: loan.outstandingBalance,
      perquisiteRate: loanType.perquisiteRate || 0,
      monthlyPerquisite: monthCount > 0 ? Math.round(annualAmount / monthCount) : 0,
      annualPerquisite: annualAmount,
      exemptFromPerquisite: isLoanPerquisiteExempt(loan, loanType),
    });
  }

  return {
    annualTotal: Math.round(annualTotal),
    monthlyTotal: monthCount > 0 ? Math.round(annualTotal / monthCount) : 0,
    breakdown,
  };
}

async function buildEmployeeLoanPerquisiteForPayroll({
  organizationId,
  employeeId,
  month,
  year,
  EmployeeLoanModel,
}) {
  const payrollMonth = normalizePayrollMonth(month);
  const payrollYear = Number(year);
  const loans = await fetchActiveLoansForPerquisite(
    organizationId,
    employeeId,
    EmployeeLoanModel
  );

  const lines = [];
  let totalMonthlyPerquisite = 0;

  for (const loan of loans) {
    if (!isEmiDueForPayrollMonth(loan.emiStartDate, payrollMonth, payrollYear)) {
      continue;
    }

    const loanType = loan.loanTypeId || {};
    const amount = calculateMonthlyLoanPerquisiteForLoan(loan, loanType);
    if (amount <= 0) continue;

    const loanLabel = loanType.loanName || loan.loanNumber || 'Loan';
    lines.push({
      componentName: `Loan Perquisite (${loanLabel})`,
      amount,
      calculationType: 'perquisite',
      loanId: loan._id,
      perquisiteRate: loanType.perquisiteRate || 0,
    });
    totalMonthlyPerquisite += amount;
  }

  return {
    lines,
    totalMonthlyPerquisite: Math.round(totalMonthlyPerquisite),
  };
}

function calculateAdditionalTdsForPerquisite(monthlyPerquisite, tdsRecord) {
  const record = tdsRecord || {};
  const perquisiteAmount = Number(monthlyPerquisite) || 0;
  if (perquisiteAmount <= 0) {
    return 0;
  }

  const taxableIncome = Number(record.taxableIncome) || 0;
  const totalTax = Number(record.taxPayable?.total) || 0;
  if (taxableIncome <= 0 || totalTax <= 0) {
    return 0;
  }

  const effectiveRate = totalTax / taxableIncome;
  return Math.round(perquisiteAmount * effectiveRate);
}

module.exports = {
  SMALL_LOAN_EXEMPT_LIMIT,
  isLoanPerquisiteExempt,
  calculateMonthlyLoanPerquisiteForLoan,
  calculateAnnualLoanPerquisiteForLoan,
  calculateEmployeeAnnualLoanPerquisite,
  buildEmployeeLoanPerquisiteForPayroll,
  calculateAdditionalTdsForPerquisite,
};
