const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  computeRemainingInstallments,
  applyScheduleAfterRepayment,
  normalizePayrollMonth,
  MONTH_NAMES,
  computeNextInstallmentPeriod,
  countPayrollRepaymentsForLoan,
  countPayrollRepaymentsByLoanIds,
} = require('../../utils/payroll/loanHelper');
const {
  calculateMonthlyLoanPerquisiteForLoan,
  isLoanPerquisiteExempt,
} = require('../../utils/payroll/loanPerquisiteHelper');

function parsePerquisiteRate(value, defaultValue = 0) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0) {
    return NaN;
  }
  return rate;
}

function parsePositiveAmount(value, fieldName) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: `${fieldName} must be a number greater than 0` };
  }
  return { value: amount };
}

function parseDateInput(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { error: `${fieldName} is required` };
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? { error: `Invalid ${fieldName}` } : { value };
  }

  const str = String(value).trim();
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    const date = new Date(year, month, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return { value: date };
    }
    return { error: `Invalid ${fieldName}` };
  }

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    return { error: `Invalid ${fieldName}` };
  }
  return { value: date };
}

function formatDisplayDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildEmiStartPeriod(emiStartDate) {
  const d = new Date(emiStartDate);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const monthIndex = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const month = MONTH_NAMES[monthIndex] || '';

  return {
    emiStartMonth: month,
    emiStartYear: year,
    emiStartMonthLabel: month ? `${month} ${year}` : '',
  };
}

function toEmiStartDateUtc(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1));
}

function parseEmiStartPeriodInput(body = {}) {
  const { emiStartMonth, emiStartYear, emiStartDate } = body;
  const hasMonth =
    emiStartMonth !== undefined &&
    emiStartMonth !== null &&
    String(emiStartMonth).trim() !== '';

  if (hasMonth) {
    if (
      emiStartYear === undefined ||
      emiStartYear === null ||
      String(emiStartYear).trim() === ''
    ) {
      return { error: 'emiStartYear is required when emiStartMonth is provided' };
    }

    const year = Number(emiStartYear);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return { error: 'emiStartYear must be a valid year' };
    }

    const monthLabel = normalizePayrollMonth(emiStartMonth);
    const monthIndex = MONTH_NAMES.findIndex(
      (m) => m.toLowerCase() === String(monthLabel || '').toLowerCase()
    );
    if (monthIndex === -1) {
      return {
        error: 'emiStartMonth must be Jan-Dec, January-December, or 1-12',
      };
    }

    return {
      value: toEmiStartDateUtc(year, monthIndex),
      month: MONTH_NAMES[monthIndex],
      year,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
    };
  }

  if (
    emiStartDate !== undefined &&
    emiStartDate !== null &&
    String(emiStartDate).trim() !== ''
  ) {
    const parsed = parseDateInput(emiStartDate, 'emiStartDate');
    if (parsed.error) {
      return parsed;
    }

    const d = parsed.value;
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const month = MONTH_NAMES[monthIndex];

    return {
      value: toEmiStartDateUtc(year, monthIndex),
      month,
      year,
      label: `${month} ${year}`,
    };
  }

  return { error: 'emiStartMonth + emiStartYear (or emiStartDate) is required' };
}

function computeRepaymentSummary(loanAmount, installmentAmount) {
  const totalInstallments = Math.ceil(loanAmount / installmentAmount);
  const lastInstallmentAmount =
    loanAmount - installmentAmount * (totalInstallments - 1);

  return {
    totalInstallments,
    lastInstallmentAmount: lastInstallmentAmount > 0 ? lastInstallmentAmount : installmentAmount,
  };
}

function computeLoanClosingDate(emiStartDate, totalInstallments) {
  if (!emiStartDate || !totalInstallments || totalInstallments < 1) {
    return null;
  }

  const startDate = new Date(emiStartDate);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return toEmiStartDateUtc(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + totalInstallments - 1
  );
}

function enrichLoanRecord(loan, payrollRepaymentCount = 0) {
  if (!loan) return loan;

  const remainingInstallments = computeRemainingInstallments(
    loan.outstandingBalance,
    loan.installmentAmount
  );
  const loanClosingDate =
    remainingInstallments > 0
      ? computeLoanClosingDate(loan.emiStartDate, remainingInstallments)
      : loan.closedAt || null;

  const emiStartPeriod = buildEmiStartPeriod(loan.emiStartDate);
  const nextInstallment = computeNextInstallmentPeriod(loan, payrollRepaymentCount);

  return {
    ...loan,
    ...emiStartPeriod,
    ...nextInstallment,
    remainingInstallments,
    loanClosingDate,
  };
}

function buildRepaymentMessage(totalInstallments, emiStartPeriod = {}) {
  const label = emiStartPeriod.label || emiStartPeriod.emiStartMonthLabel || '';
  return `This loan will be fully paid off in ${totalInstallments} installments. The first EMI will be deducted from ${label} salary payroll.`;
}

async function generateLoanNumber(EmployeeLoanModel, org_uuid) {
  const prefix = 'LN';
  const latest = await EmployeeLoanModel.findOne({ organizationId: org_uuid })
    .sort({ createdAt: -1 })
    .select('loanNumber')
    .lean();

  let next = 1;
  if (latest?.loanNumber) {
    const match = String(latest.loanNumber).match(/(\d+)$/);
    if (match) {
      next = Number(match[1]) + 1;
    }
  }

  return `${prefix}-${String(next).padStart(5, '0')}`;
}

function resolveEmployeeDisplayName(employee = {}) {
  const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  return (
    name ||
    employee.payrollInfo?.employeeCode ||
    employee.uniqueId ||
    ''
  );
}

const PAYMENT_MODES = ['cash', 'bank_transfer', 'cheque'];

function normalizePaymentMode(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['bank', 'banktransfer', 'bank_transfer'].includes(raw)) {
    return 'bank_transfer';
  }
  if (PAYMENT_MODES.includes(raw)) {
    return raw;
  }
  return null;
}

/**
 * POST /payRoll/loan-types
 */
exports.createLoanType = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const loanName = String(req.body.loanName || '').trim();
    if (!loanName) {
      return sendResponse(res, 400, false, 'loanName is required');
    }

    const perquisiteRate = parsePerquisiteRate(req.body.perquisiteRate, 0);
    if (Number.isNaN(perquisiteRate)) {
      return sendResponse(res, 400, false, 'Perquisite rate must be a number >= 0');
    }

    const { LoanTypeModel } = await initModels(org_uuid);

    const existing = await LoanTypeModel.findOne({
      organizationId: org_uuid,
      loanName,
    });
    if (existing) {
      return sendResponse(res, 400, false, 'Loan name already exists');
    }

    const loanType = await LoanTypeModel.create({
      organizationId: org_uuid,
      loanName,
      perquisiteRate,
      status: 'active',
      createdBy: req.userId || null,
    });

    return sendResponse(res, 201, true, 'Loan type created successfully', loanType);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/loan-types
 */
exports.getLoanTypes = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { LoanTypeModel } = await initModels(org_uuid);
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const { search, status } = req.query;

    const filter = { organizationId: org_uuid };
    if (status) {
      filter.status = String(status).toLowerCase();
    } else if (!includeInactive) {
      filter.status = 'active';
    }

    let loanTypes = await LoanTypeModel.find(filter).sort({ loanName: 1 }).lean();

    if (search) {
      const term = String(search).trim().toLowerCase();
      loanTypes = loanTypes.filter((row) =>
        String(row.loanName || '').toLowerCase().includes(term)
      );
    }

    return sendResponse(res, 200, true, 'Loan types fetched successfully', {
      loanTypes,
      total: loanTypes.length,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/loan-types/:loanTypeId
 */
exports.getLoanTypeById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { loanTypeId } = req.params;
    const { LoanTypeModel } = await initModels(org_uuid);

    const loanType = await LoanTypeModel.findOne({
      _id: loanTypeId,
      organizationId: org_uuid,
    }).lean();

    if (!loanType) {
      return sendResponse(res, 404, false, 'Loan type not found');
    }

    return sendResponse(res, 200, true, 'Loan type fetched successfully', loanType);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * PUT /payRoll/loan-types/:loanTypeId
 */
exports.updateLoanType = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { loanTypeId } = req.params;
    const { LoanTypeModel } = await initModels(org_uuid);

    const loanType = await LoanTypeModel.findOne({
      _id: loanTypeId,
      organizationId: org_uuid,
    });

    if (!loanType) {
      return sendResponse(res, 404, false, 'Loan type not found');
    }

    if (req.body.loanName !== undefined) {
      const loanName = String(req.body.loanName).trim();
      if (!loanName) {
        return sendResponse(res, 400, false, 'loanName cannot be empty');
      }

      const duplicate = await LoanTypeModel.findOne({
        organizationId: org_uuid,
        loanName,
        _id: { $ne: loanTypeId },
      });
      if (duplicate) {
        return sendResponse(res, 400, false, 'Loan name already exists');
      }

      loanType.loanName = loanName;
    }

    if (req.body.perquisiteRate !== undefined) {
      const perquisiteRate = parsePerquisiteRate(req.body.perquisiteRate);
      if (Number.isNaN(perquisiteRate)) {
        return sendResponse(res, 400, false, 'Perquisite rate must be a number >= 0');
      }
      loanType.perquisiteRate = perquisiteRate;
    }

    if (req.body.status !== undefined) {
      const nextStatus = String(req.body.status).toLowerCase();
      if (!['active', 'inactive'].includes(nextStatus)) {
        return sendResponse(res, 400, false, 'Status must be active or inactive');
      }
      loanType.status = nextStatus;
    }

    await loanType.save();

    return sendResponse(res, 200, true, 'Loan type updated successfully', loanType);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * DELETE /payRoll/loan-types/:loanTypeId
 */
exports.deleteLoanType = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { loanTypeId } = req.params;
    const { LoanTypeModel, EmployeeLoanModel } = await initModels(org_uuid);

    const loanType = await LoanTypeModel.findOne({
      _id: loanTypeId,
      organizationId: org_uuid,
    });

    if (!loanType) {
      return sendResponse(res, 404, false, 'Loan type not found');
    }

    const linkedLoans = await EmployeeLoanModel.countDocuments({
      organizationId: org_uuid,
      loanTypeId,
      status: { $ne: 'cancelled' },
    });
    if (linkedLoans > 0) {
      return sendResponse(
        res,
        400,
        false,
        'Cannot delete loan type while employee loans are linked to it'
      );
    }

    await LoanTypeModel.deleteOne({ _id: loanTypeId, organizationId: org_uuid });

    return sendResponse(res, 200, true, 'Loan type deleted successfully', {
      loanTypeId,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/loan/create-loan
 */
exports.createLoan = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const {
      loanTypeId,
      employeeId,
      loanAmount,
      disbursementDate,
      paidThroughAccount,
      referenceNumber,
      reason,
      exemptFromPerquisite,
      emiStartDate,
      emiStartMonth,
      emiStartYear,
      installmentAmount,
    } = req.body;

    if (!loanTypeId) {
      return sendResponse(res, 400, false, 'loanTypeId is required');
    }
    if (!employeeId) {
      return sendResponse(res, 400, false, 'employeeId is required');
    }

    const amountResult = parsePositiveAmount(loanAmount, 'loanAmount');
    if (amountResult.error) {
      return sendResponse(res, 400, false, amountResult.error);
    }

    const installmentResult = parsePositiveAmount(installmentAmount, 'installmentAmount');
    if (installmentResult.error) {
      return sendResponse(res, 400, false, installmentResult.error);
    }
    if (installmentResult.value > amountResult.value) {
      return sendResponse(res, 400, false, 'installmentAmount cannot exceed loanAmount');
    }

    const disbursementResult = parseDateInput(disbursementDate, 'disbursementDate');
    if (disbursementResult.error) {
      return sendResponse(res, 400, false, disbursementResult.error);
    }

    const emiStartResult = parseEmiStartPeriodInput({
      emiStartMonth,
      emiStartYear,
      emiStartDate,
    });
    if (emiStartResult.error) {
      return sendResponse(res, 400, false, emiStartResult.error);
    }

    const { LoanTypeModel, EmployeeLoanModel, EmployeeModel } = await initModels(org_uuid);

    const loanType = await LoanTypeModel.findOne({
      _id: loanTypeId,
      organizationId: org_uuid,
      status: 'active',
    }).lean();
    if (!loanType) {
      return sendResponse(res, 404, false, 'Active loan type not found');
    }

    const employee = await EmployeeModel.findById(employeeId)
      .select('firstName lastName uniqueId payrollInfo.employeeCode')
      .lean();
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const { totalInstallments, lastInstallmentAmount } = computeRepaymentSummary(
      amountResult.value,
      installmentResult.value
    );

    const loanNumber = await generateLoanNumber(EmployeeLoanModel, org_uuid);

    const loan = await EmployeeLoanModel.create({
      organizationId: org_uuid,
      loanNumber,
      loanTypeId,
      employeeId,
      loanAmount: amountResult.value,
      outstandingBalance: amountResult.value,
      disbursementDate: disbursementResult.value,
      paidThroughAccount: String(paidThroughAccount || '').trim(),
      referenceNumber: String(referenceNumber || '').trim(),
      reason: String(reason || '').trim(),
      exemptFromPerquisite: Boolean(exemptFromPerquisite),
      emiStartDate: emiStartResult.value,
      installmentAmount: installmentResult.value,
      totalInstallments,
      lastInstallmentAmount,
      paidInstallments: 0,
      status: 'active',
      createdBy: req.userId || null,
    });

    const loanClosingDate = computeLoanClosingDate(emiStartResult.value, totalInstallments);
    const repaymentMessage = buildRepaymentMessage(totalInstallments, emiStartResult);
    const nextInstallment = computeNextInstallmentPeriod(
      {
        emiStartDate: emiStartResult.value,
        outstandingBalance: amountResult.value,
        status: 'active',
      },
      0
    );

    return sendResponse(res, 201, true, 'Loan created successfully', {
      loan: enrichLoanRecord(loan.toObject ? loan.toObject() : loan, 0),
      loanType: {
        _id: loanType._id,
        loanName: loanType.loanName,
        perquisiteRate: loanType.perquisiteRate,
      },
      employee: {
        _id: employee._id,
        employeeName: resolveEmployeeDisplayName(employee),
        employeeCode: employee.payrollInfo?.employeeCode || employee.uniqueId || '',
      },
      repaymentSummary: {
        totalInstallments,
        installmentAmount: installmentResult.value,
        lastInstallmentAmount,
        emiStartDate: emiStartResult.value,
        emiStartMonth: emiStartResult.month,
        emiStartYear: emiStartResult.year,
        emiStartMonthLabel: emiStartResult.label,
        ...nextInstallment,
        loanClosingDate,
        message: repaymentMessage,
      },
      repayments: [],
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/loan/get-loans
 */
exports.getLoans = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId, loanTypeId, status, search } = req.query;
    const { EmployeeLoanModel, LoanRepaymentModel } = await initModels(org_uuid);

    const filter = { organizationId: org_uuid };
    if (employeeId) filter.employeeId = employeeId;
    if (loanTypeId) filter.loanTypeId = loanTypeId;
    if (status) filter.status = String(status).toLowerCase();

    let loans = await EmployeeLoanModel.find(filter)
      .populate('loanTypeId', 'loanName perquisiteRate status')
      .populate('employeeId', 'firstName lastName customId uniqueId payrollInfo.employeeCode')
      .sort({ createdAt: -1 })
      .lean();

    if (search) {
      const term = String(search).trim().toLowerCase();
      loans = loans.filter((row) => {
        const employeeName = resolveEmployeeDisplayName(row.employeeId || {}).toLowerCase();
        const loanName = String(row.loanTypeId?.loanName || '').toLowerCase();
        const loanNumber = String(row.loanNumber || '').toLowerCase();
        const reference = String(row.referenceNumber || '').toLowerCase();
        return (
          employeeName.includes(term) ||
          loanName.includes(term) ||
          loanNumber.includes(term) ||
          reference.includes(term)
        );
      });
    }

    const payrollCountMap = await countPayrollRepaymentsByLoanIds(
      LoanRepaymentModel,
      org_uuid,
      loans.map((row) => row._id)
    );

    return sendResponse(res, 200, true, 'Loans fetched successfully', {
      loans: loans.map((row) =>
        enrichLoanRecord(row, payrollCountMap[String(row._id)] || 0)
      ),
      total: loans.length,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/loan/get-loanById/:loanId
 */
exports.getLoanById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { loanId } = req.params;
    const { EmployeeLoanModel, LoanRepaymentModel } = await initModels(org_uuid);

    const loan = await EmployeeLoanModel.findOne({
      _id: loanId,
      organizationId: org_uuid,
    })
      .populate('loanTypeId', 'loanName perquisiteRate status')
      .populate('employeeId', 'firstName lastName uniqueId payrollInfo.employeeCode email')
      .lean();

    if (!loan) {
      return sendResponse(res, 404, false, 'Loan not found');
    }

    const repayments = await LoanRepaymentModel.find({
      organizationId: org_uuid,
      loanId,
    })
      .sort({ repaymentDate: -1, createdAt: -1 })
      .lean();

    const remainingInstallments = computeRemainingInstallments(
      loan.outstandingBalance,
      loan.installmentAmount
    );
    const projectedClosingDate =
      remainingInstallments > 0
        ? computeLoanClosingDate(loan.emiStartDate, remainingInstallments)
        : loan.closedAt || null;

    const loanTypeData = loan.loanTypeId || {};
    const monthlyPerquisite = calculateMonthlyLoanPerquisiteForLoan(loan, loanTypeData);

    const emiStartPeriod = buildEmiStartPeriod(loan.emiStartDate);
    const payrollRepaymentCount = repayments.filter(
      (row) => row.repaymentType === 'payroll'
    ).length;
    const nextInstallment = computeNextInstallmentPeriod(loan, payrollRepaymentCount);

    const repaymentSummary = {
      totalInstallments: loan.totalInstallments,
      paidInstallments: loan.paidInstallments,
      remainingInstallments,
      installmentAmount: loan.installmentAmount,
      lastInstallmentAmount: loan.lastInstallmentAmount,
      emiStartDate: loan.emiStartDate,
      emiStartMonth: emiStartPeriod?.emiStartMonth || null,
      emiStartYear: emiStartPeriod?.emiStartYear || null,
      emiStartMonthLabel: emiStartPeriod?.emiStartMonthLabel || '',
      ...nextInstallment,
      loanClosingDate: projectedClosingDate,
      outstandingBalance: loan.outstandingBalance,
      remainingAmount: loan.outstandingBalance,
      perquisiteRate: loanTypeData.perquisiteRate || 0,
      monthlyPerquisite,
      isPerquisiteExempt: isLoanPerquisiteExempt(loan, loanTypeData),
      message: remainingInstallments
        ? nextInstallment.nextInstallmentLabel
          ? `Remaining ${remainingInstallments} installment(s). Next installment: ${nextInstallment.nextInstallmentLabel}.`
          : `Remaining ${remainingInstallments} installment(s).`
        : 'Loan is fully repaid.',
    };

    return sendResponse(res, 200, true, 'Loan fetched successfully', {
      loan: enrichLoanRecord(loan, payrollRepaymentCount),
      repaymentSummary,
      repayments,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/loan/record-repayment/:loanId
 */
exports.recordRepayment = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { loanId } = req.params;
    const {
      repaymentAmount,
      repaymentDate,
      paymentMode,
      depositToAccount,
      referenceNumber,
    } = req.body;

    const amountResult = parsePositiveAmount(repaymentAmount, 'repaymentAmount');
    if (amountResult.error) {
      return sendResponse(res, 400, false, amountResult.error);
    }

    const repaymentDateResult = parseDateInput(repaymentDate, 'repaymentDate');
    if (repaymentDateResult.error) {
      return sendResponse(res, 400, false, repaymentDateResult.error);
    }

    const normalizedPaymentMode = normalizePaymentMode(paymentMode);
    if (!normalizedPaymentMode) {
      return sendResponse(res, 400, false, 'paymentMode must be cash, bank_transfer, or cheque');
    }

    const { EmployeeLoanModel, LoanRepaymentModel } = await initModels(org_uuid);

    const loan = await EmployeeLoanModel.findOne({
      _id: loanId,
      organizationId: org_uuid,
    });

    if (!loan) {
      return sendResponse(res, 404, false, 'Loan not found');
    }

    if (loan.status !== 'active') {
      return sendResponse(res, 400, false, 'Repayment can only be recorded for active loans');
    }

    if (amountResult.value > loan.outstandingBalance) {
      return sendResponse(
        res,
        400,
        false,
        `Repayment amount cannot exceed outstanding balance of ${loan.outstandingBalance}`
      );
    }

    const balanceBefore = loan.outstandingBalance;
    const balanceAfter = Math.max(0, balanceBefore - amountResult.value);

    const repayment = await LoanRepaymentModel.create({
      organizationId: org_uuid,
      loanId: loan._id,
      employeeId: loan.employeeId,
      repaymentAmount: amountResult.value,
      repaymentDate: repaymentDateResult.value,
      paymentMode: normalizedPaymentMode,
      depositToAccount: String(depositToAccount || '').trim(),
      referenceNumber: String(referenceNumber || '').trim(),
      balanceBefore,
      balanceAfter,
      repaymentType: 'manual',
      createdBy: req.userId || null,
    });

    loan.outstandingBalance = balanceAfter;
    applyScheduleAfterRepayment(loan);

    if (balanceAfter === 0) {
      loan.status = 'closed';
      loan.closedAt = repaymentDateResult.value;
      loan.paidInstallments = Math.ceil(loan.loanAmount / loan.installmentAmount);
      loan.totalInstallments = loan.paidInstallments;
      loan.lastInstallmentAmount = 0;
    }

    await loan.save();

    const payrollRepaymentCount = await countPayrollRepaymentsForLoan(
      LoanRepaymentModel,
      org_uuid,
      loan._id
    );

    return sendResponse(res, 201, true, 'Repayment recorded successfully', {
      repayment,
      loan: enrichLoanRecord(loan.toObject(), payrollRepaymentCount),
      remainingAmount: balanceAfter,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
