const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function normalizePayrollMonth(monthValue) {
  if (monthValue === null || monthValue === undefined) return null;
  const raw = String(monthValue).trim();
  if (!raw) return null;

  const shortIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return MONTH_NAMES[shortIdx];

  const monthMap = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };
  const mapped = monthMap[raw.toLowerCase()];
  if (mapped) return mapped;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return MONTH_NAMES[numeric - 1];
  }

  return raw;
}

function getPayrollPeriodIndex(month, year) {
  const normalizedMonth = normalizePayrollMonth(month);
  const monthString = String(normalizedMonth || '').trim();
  let monthIndex = MONTH_NAMES.findIndex(
    (m) => m.toLowerCase() === monthString.toLowerCase()
  );

  if (monthIndex === -1) {
    const numericMonth = Number(monthString);
    if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      monthIndex = numericMonth - 1;
    }
  }

  if (monthIndex === -1) return -1;
  return Number(year) * 12 + monthIndex;
}

function getDatePeriodIndex(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function computeRemainingInstallments(outstandingBalance, installmentAmount) {
  if (!outstandingBalance || outstandingBalance <= 0) return 0;
  if (!installmentAmount || installmentAmount <= 0) return 0;
  return Math.ceil(outstandingBalance / installmentAmount);
}

function emptyNextInstallmentPeriod() {
  return {
    nextInstallmentMonth: null,
    nextInstallmentYear: null,
    nextInstallmentLabel: null,
    nextInstallmentDate: null,
  };
}

function computeNextInstallmentPeriod(loan, payrollRepaymentCount = 0) {
  if (!loan || loan.status === 'closed' || (loan.outstandingBalance || 0) <= 0) {
    return emptyNextInstallmentPeriod();
  }

  const emiStart = new Date(loan.emiStartDate);
  if (Number.isNaN(emiStart.getTime())) {
    return emptyNextInstallmentPeriod();
  }

  const completedPayrollEmis = Math.max(0, Number(payrollRepaymentCount) || 0);
  const nextDate = new Date(
    Date.UTC(
      emiStart.getUTCFullYear(),
      emiStart.getUTCMonth() + completedPayrollEmis,
      1
    )
  );
  const month = MONTH_NAMES[nextDate.getUTCMonth()];

  return {
    nextInstallmentMonth: month,
    nextInstallmentYear: nextDate.getUTCFullYear(),
    nextInstallmentLabel: `${month} ${nextDate.getUTCFullYear()}`,
    nextInstallmentDate: nextDate,
  };
}

async function countPayrollRepaymentsForLoan(LoanRepaymentModel, organizationId, loanId) {
  if (!LoanRepaymentModel || !loanId) {
    return 0;
  }

  return LoanRepaymentModel.countDocuments({
    organizationId,
    loanId,
    repaymentType: 'payroll',
  });
}

async function countPayrollRepaymentsByLoanIds(LoanRepaymentModel, organizationId, loanIds = []) {
  if (!LoanRepaymentModel || !loanIds.length) {
    return {};
  }

  const rows = await LoanRepaymentModel.aggregate([
    {
      $match: {
        organizationId,
        loanId: { $in: loanIds },
        repaymentType: 'payroll',
      },
    },
    {
      $group: {
        _id: '$loanId',
        count: { $sum: 1 },
      },
    },
  ]);

  return rows.reduce((acc, row) => {
    acc[String(row._id)] = row.count;
    return acc;
  }, {});
}

function applyScheduleAfterRepayment(loan) {
  const outstanding = loan.outstandingBalance || 0;
  const emi = loan.installmentAmount || 0;

  if (outstanding <= 0 || emi <= 0) {
    loan.lastInstallmentAmount = 0;
    return;
  }

  const totalRepaid = (loan.loanAmount || 0) - outstanding;
  loan.paidInstallments = Math.floor(totalRepaid / emi);

  const remainingInstallments = computeRemainingInstallments(outstanding, emi);
  loan.totalInstallments = loan.paidInstallments + remainingInstallments;

  const lastInstallmentAmount = outstanding - emi * (remainingInstallments - 1);
  loan.lastInstallmentAmount =
    lastInstallmentAmount > 0 ? lastInstallmentAmount : emi;
}

function isEmiDueForPayrollMonth(emiStartDate, month, year) {
  if (!emiStartDate) return false;

  const startIndex = getDatePeriodIndex(emiStartDate);
  const payrollIndex = getPayrollPeriodIndex(month, year);
  if (startIndex === -1 || payrollIndex === -1) return false;

  return payrollIndex >= startIndex;
}

function computePayrollEmiAmount(loan) {
  const outstanding = loan.outstandingBalance || 0;
  const emi = loan.installmentAmount || 0;
  if (outstanding <= 0 || emi <= 0) return 0;

  const remainingInstallments = computeRemainingInstallments(outstanding, emi);
  if (remainingInstallments === 1) {
    return outstanding;
  }

  return Math.min(emi, outstanding);
}

function getPayrollRepaymentDate(month, year) {
  const monthIndex = getPayrollPeriodIndex(month, year);
  if (monthIndex === -1) return new Date();

  const zeroBasedMonth = monthIndex % 12;
  const payrollYear = Math.floor(monthIndex / 12);
  return new Date(payrollYear, zeroBasedMonth, 1);
}

async function buildLoanEmiDeductionsForEmployee({
  organizationId,
  employeeId,
  month,
  year,
  EmployeeLoanModel,
  LoanRepaymentModel,
  PayrollRunModel = null,
}) {
  const deductions = [];
  const loanRepaymentPlans = [];
  const payrollMonth = normalizePayrollMonth(month);
  const payrollYear = Number(year);

  if (!EmployeeLoanModel || !payrollMonth) {
    return { deductions, loanRepaymentPlans };
  }

  const activeLoans = await EmployeeLoanModel.find({
    organizationId,
    employeeId,
    status: 'active',
    outstandingBalance: { $gt: 0 },
  })
    .populate('loanTypeId', 'loanName')
    .lean();

  for (const loan of activeLoans) {
    if (!isEmiDueForPayrollMonth(loan.emiStartDate, payrollMonth, payrollYear)) {
      continue;
    }

    if (LoanRepaymentModel) {
      const existingRepayment = await LoanRepaymentModel.findOne({
        organizationId,
        loanId: loan._id,
        repaymentType: 'payroll',
        payrollMonth,
        payrollYear,
      }).select('_id payrollId balanceBefore');

      if (existingRepayment) {
        let payrollExists = true;
        if (PayrollRunModel && existingRepayment.payrollId) {
          const linkedPayroll = await PayrollRunModel.findById(existingRepayment.payrollId)
            .select('_id')
            .lean();
          payrollExists = !!linkedPayroll;
        } else if (PayrollRunModel && !existingRepayment.payrollId) {
          payrollExists = false;
        }

        if (payrollExists) {
          continue;
        }

        const loanDoc = await EmployeeLoanModel.findOne({
          _id: loan._id,
          organizationId,
        });
        if (loanDoc) {
          loanDoc.outstandingBalance = existingRepayment.balanceBefore;
          if (loanDoc.outstandingBalance > 0 && loanDoc.status === 'closed') {
            loanDoc.status = 'active';
            loanDoc.closedAt = null;
          }
          applyScheduleAfterRepayment(loanDoc);
          await loanDoc.save();
        }
        await LoanRepaymentModel.findByIdAndDelete(existingRepayment._id);
      }
    }

    const emiAmount = computePayrollEmiAmount(loan);
    if (emiAmount <= 0) continue;

    const loanLabel = loan.loanTypeId?.loanName || loan.loanNumber || 'Loan';

    deductions.push({
      componentName: `Loan EMI (${loanLabel})`,
      amount: emiAmount,
      calculationType: 'loan_emi',
      loanId: loan._id,
    });

    loanRepaymentPlans.push({
      loanId: loan._id,
      repaymentAmount: emiAmount,
      loanNumber: loan.loanNumber,
      balanceBefore: loan.outstandingBalance,
    });
  }

  return { deductions, loanRepaymentPlans };
}

async function applyPayrollLoanRepayments({
  organizationId,
  employeeId,
  month,
  year,
  payrollId,
  plans = [],
  EmployeeLoanModel,
  LoanRepaymentModel,
}) {
  if (!plans.length || !EmployeeLoanModel || !LoanRepaymentModel) {
    return [];
  }

  const payrollMonth = normalizePayrollMonth(month);
  const payrollYear = Number(year);
  const repaymentDate = getPayrollRepaymentDate(payrollMonth, payrollYear);
  const savedRepayments = [];

  for (const plan of plans) {
    const loan = await EmployeeLoanModel.findOne({
      _id: plan.loanId,
      organizationId,
      employeeId,
      status: 'active',
    });

    if (!loan || loan.outstandingBalance <= 0) {
      throw new Error(`Active loan not found for payroll EMI deduction (${plan.loanNumber || plan.loanId})`);
    }

    const duplicate = await LoanRepaymentModel.findOne({
      organizationId,
      loanId: loan._id,
      repaymentType: 'payroll',
      payrollMonth,
      payrollYear,
    }).select('_id');

    if (duplicate) {
      continue;
    }

    const repaymentAmount = Math.min(plan.repaymentAmount, loan.outstandingBalance);
    if (repaymentAmount <= 0) continue;

    const balanceBefore = loan.outstandingBalance;
    const balanceAfter = Math.max(0, balanceBefore - repaymentAmount);

    const repayment = await LoanRepaymentModel.create({
      organizationId,
      loanId: loan._id,
      employeeId,
      repaymentAmount,
      repaymentDate,
      paymentMode: 'bank_transfer',
      depositToAccount: '',
      referenceNumber: String(payrollId || ''),
      balanceBefore,
      balanceAfter,
      repaymentType: 'payroll',
      payrollMonth,
      payrollYear,
      payrollId,
    });

    loan.outstandingBalance = balanceAfter;
    applyScheduleAfterRepayment(loan);

    if (balanceAfter === 0) {
      loan.status = 'closed';
      loan.closedAt = repaymentDate;
      loan.paidInstallments = Math.ceil(loan.loanAmount / loan.installmentAmount);
      loan.totalInstallments = loan.paidInstallments;
      loan.lastInstallmentAmount = 0;
    }

    await loan.save();
    savedRepayments.push(repayment);
  }

  return savedRepayments;
}

async function reversePayrollLoanRepayments({
  organizationId,
  employeeId,
  month,
  year,
  EmployeeLoanModel,
  LoanRepaymentModel,
}) {
  if (!EmployeeLoanModel || !LoanRepaymentModel) {
    return 0;
  }

  const payrollMonth = normalizePayrollMonth(month);
  const payrollYear = Number(year);
  if (!payrollMonth || !payrollYear) {
    return 0;
  }

  const repayments = await LoanRepaymentModel.find({
    organizationId,
    employeeId,
    repaymentType: 'payroll',
    payrollMonth,
    payrollYear,
  });

  for (const repayment of repayments) {
    const loan = await EmployeeLoanModel.findOne({
      _id: repayment.loanId,
      organizationId,
    });

    if (loan) {
      loan.outstandingBalance = repayment.balanceBefore;
      if (loan.outstandingBalance > 0 && loan.status === 'closed') {
        loan.status = 'active';
        loan.closedAt = null;
      }
      applyScheduleAfterRepayment(loan);
      await loan.save();
    }

    await LoanRepaymentModel.findByIdAndDelete(repayment._id);
  }

  return repayments.length;
}

module.exports = {
  MONTH_NAMES,
  normalizePayrollMonth,
  computeRemainingInstallments,
  computeNextInstallmentPeriod,
  countPayrollRepaymentsForLoan,
  countPayrollRepaymentsByLoanIds,
  applyScheduleAfterRepayment,
  isEmiDueForPayrollMonth,
  computePayrollEmiAmount,
  buildLoanEmiDeductionsForEmployee,
  applyPayrollLoanRepayments,
  reversePayrollLoanRepayments,
};
