const crypto = require('crypto');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { uploadFile } = require('../../service/cloudUploade/clodeUpload');
const {
  buildSalarySlipPdfBuffer,
  mergePayslipEarningsColumn,
} = require('../../utils/salarySlipPdf');
const { getPayslipAttendanceDays } = require('../../utils/payslipAttendance');
const {
  resolveEmployeeDisplayCode,
  EMPLOYEE_DISPLAY_CODE_FIELDS,
} = require('../../utils/payroll/employeeDisplay');
const {
  resolveFinancialYearInput,
  buildFinancialYearPayrollQuery,
  getPayrollPeriodSortKey,
} = require('../../utils/financialYear');
const {
  calculateEpf,
  sumConsiderForEpf,
  calculateEsi,
  sumConsiderForEsi,
  calculateProfessionalTax,
  calculateLwf,
  resolveLwfDeductionsPerYear,
  buildNetPaySchedule,
  calculateStatutoryBonus,
} = require('../../utils/payroll/statutoryCalculator');
const {
  buildSalaryStructurePreview,
  normalizeOverrides,
  resolvePayrollComponentAmount,
  findComponentOverride,
  calculateComponentAmount,
  getFrequencyDisplayAmounts,
  normalizeComponentFrequency,
  hasExplicitOverrideAmount,
  shouldIncludeComponentInBreakdown,
  resolveSalaryBasesFromInput,
  buildBalancingAllowanceLine,
  buildPayrollEarningsBreakdown,
  mergeComponentOverrides,
  stripBasicFromOverrides,
  withExplicitBasicOverride,
  sumBasicPlusDA,
} = require('../../utils/salaryComponentHelper');

const MAX_CLAIM_ITEMS_PER_REQUEST = 50;

const PAYROLL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthIndex(monthName) {
  return PAYROLL_MONTHS.indexOf(monthName);
}

function getFinancialYearFromPayroll(monthName, year) {
  const monthIndex = getMonthIndex(monthName);
  const normalizedYear = Number(year);
  if (monthIndex === -1 || Number.isNaN(normalizedYear)) {
    return null;
  }
  const fyStart = monthIndex >= 3 ? normalizedYear : normalizedYear - 1;
  const fyEndShort = String(fyStart + 1).slice(-2);
  return {
    key: `${fyStart}-${fyEndShort}`,
    label: `FY ${fyStart}-${fyStart + 1}`,
    startYear: fyStart,
    endYear: fyStart + 1,
  };
}

/** Accepts 2025-26, FY2025-26, 2025-2026, FY2025-2026 */
function parseFinancialYearInput(input) {
  if (input == null || input === '') return null;
  const raw = String(input).trim().replace(/^FY/i, '');
  const match = raw.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endToken = match[2];
  const endYear =
    endToken.length === 2
      ? parseInt(`${String(startYear).slice(0, 2)}${endToken}`, 10)
      : parseInt(endToken, 10);

  if (Number.isNaN(startYear) || Number.isNaN(endYear) || endYear !== startYear + 1) {
    return null;
  }

  return {
    key: `${startYear}-${String(endYear).slice(-2)}`,
    label: `FY ${startYear}-${endYear}`,
    startYear,
    endYear,
  };
}

function mapPayslipWithFinancialYear(doc) {
  const plain = doc?.toObject ? doc.toObject() : { ...doc };
  const fy = getFinancialYearFromPayroll(plain.month, plain.year);
  return {
    ...plain,
    financialYear: fy?.key || null,
    financialYearLabel: fy?.label || null,
  };
}

function comparePayrollPeriod(a, b) {
  const yearDiff = (b.year || 0) - (a.year || 0);
  if (yearDiff !== 0) return yearDiff;
  return getMonthIndex(b.month) - getMonthIndex(a.month);
}

function buildDeductionBreakdown(deductions = [], totalDeductions = 0) {
  const total = totalDeductions > 0
    ? totalDeductions
    : deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  if (total <= 0) {
    return deductions.map((d) => ({
      name: d.componentName || 'Deduction',
      amount: Number(d.amount) || 0,
      percentage: 0,
    }));
  }

  return deductions.map((d) => {
    const amount = Number(d.amount) || 0;
    return {
      name: d.componentName || 'Deduction',
      amount,
      percentage: Math.round((amount / total) * 10000) / 100,
    };
  });
}

function resolveEmployeeId(req) {
  return req.empId || req.user?.employeeId || req.user?._id;
}

/**
 * Employee payroll dashboard (summary cards, pay stub, deductions chart, claims)
 * Route: GET /payRoll/employee/dashboard
 */
exports.getMyPayrollDashboard = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = resolveEmployeeId(req);

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const {
      PayrollRunModel,
      EmployeeModel,
      ClaimsDeclarationModel,
      SalaryCompensationModel,
    } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId).select(
      'firstName lastName email uniqueId customId payrollInfo jobTitle'
    );

    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const currentDate = new Date();
    const calendarYear = currentDate.getFullYear();
    const currentMonthShort = PAYROLL_MONTHS[currentDate.getMonth()];

    const allPayrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      employeeId,
    })
      .sort({ year: -1, month: -1 })
      .lean();

    const sortPayrolls = [...allPayrolls].sort(comparePayrollPeriod);

    const currentMonthPayroll = allPayrolls.find(
      (p) => p.year === calendarYear && p.month === currentMonthShort
    );

    const activePayroll = currentMonthPayroll || sortPayrolls[0] || null;
    const stubIndex = activePayroll
      ? sortPayrolls.findIndex((p) => String(p._id) === String(activePayroll._id))
      : -1;

    const ytdPayrolls = allPayrolls.filter((p) => p.year === calendarYear);
    let ytdGross = 0;
    let ytdDeductions = 0;
    let ytdNetPay = 0;
    ytdPayrolls.forEach((p) => {
      ytdGross += p.grossEarnings || 0;
      ytdDeductions += p.totalDeductions || 0;
      ytdNetPay += p.netPay || 0;
    });

    const annualCTC = Number(employee.payrollInfo?.ctc) || 0;
    const monthlyCTC = annualCTC > 0 ? Math.round(annualCTC / 12) : Number(employee.payrollInfo?.grossSalary) || 0;

    const earningsRows = mergePayslipEarningsColumn(
      activePayroll?.earnings,
      activePayroll?.benefits,
      activePayroll?.reimbursements
    );

    const grossFromEarnings = earningsRows.reduce((s, e) => s + e.amount, 0);
    const grossPay = activePayroll?.grossEarnings ?? grossFromEarnings;
    const totalDeductions = activePayroll?.totalDeductions ?? 0;
    const netPay = activePayroll?.netPay ?? 0;

    const workingDays = activePayroll?.workingDays ?? 0;
    const presentDays = activePayroll?.presentDays ?? workingDays;
    const hoursWorked = Math.round((presentDays || 0) * 8);

    const payPeriodEndDate = activePayroll?.processedDate || activePayroll?.paidDate || activePayroll?.updatedAt || null;

    const deductionBreakdown = buildDeductionBreakdown(
      activePayroll?.deductions || [],
      totalDeductions
    );

    const fyMap = new Map();
    for (const p of allPayrolls) {
      const fy = getFinancialYearFromPayroll(p.month, p.year);
      if (!fy) continue;
      if (!fyMap.has(fy.key)) {
        fyMap.set(fy.key, {
          financialYear: fy.key,
          label: fy.label,
          payrollCount: 0,
          totalGross: 0,
          totalNet: 0,
        });
      }
      const row = fyMap.get(fy.key);
      row.payrollCount += 1;
      row.totalGross += p.grossEarnings || 0;
      row.totalNet += p.netPay || 0;
    }

    const annualSalaryStatements = Array.from(fyMap.values())
      .sort((a, b) => b.financialYear.localeCompare(a.financialYear))
      .map((row) => ({
        ...row,
        viewType: 'annualSalaryStatement',
      }));

    const reimbursementRecord = await SalaryCompensationModel.findOne(
      { organizationId: org_uuid, category: 'reimbursements' },
      { components: 1 }
    ).lean();

    const reimbursementHeads = (reimbursementRecord?.components || []).filter(
      (c) => (c.status || 'active') === 'active'
    );

    const claimDoc = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId,
    }).lean();

    const reimbursements = claimDoc?.reimbursements || [];
    const currentMonthKey = getClaimCalendarMonthKey(new Date());

    const reimbursementBalances = reimbursementHeads.map((head) => {
      const maxLimit = Number(head.maxLimit) || 0;
      const utilized = getMonthlyUtilizedForHead(reimbursements, head, currentMonthKey);
      const related = reimbursements.filter(
        (r) => matchesReimbursementHead(r, head) && getClaimCalendarMonthKey(r.claimDate) === currentMonthKey
      );
      const claimed = related.reduce((s, r) => s + (Number(r.claimedAmount) || 0), 0);
      const approved = related
        .filter((r) => r.status === 'approved')
        .reduce((s, r) => s + (Number(r.approvedAmount ?? r.claimedAmount) || 0), 0);
      const balance = maxLimit > 0 ? Math.max(0, maxLimit - utilized) : 0;

      return {
        headId: head._id,
        headName: head.name,
        headCode: head.code || '',
        maxLimit,
        claimed,
        approved,
        utilized,
        balance,
        limitPeriod: 'month',
        monthKey: currentMonthKey,
      };
    });

    const balanceAvailable = reimbursementBalances.reduce((s, h) => s + h.balance, 0);
    const totalClaimedFy = reimbursementBalances.reduce((s, h) => s + h.utilized, 0);

    const claimsStats = {
      total: reimbursements.length,
      approved: reimbursements.filter((r) => r.status === 'approved').length,
      pending: reimbursements.filter((r) => r.status === 'pending').length,
      rejected: reimbursements.filter((r) => r.status === 'rejected').length,
    };

    const ctcUtilized = totalClaimedFy;
    const ctcBalance = annualCTC > 0 ? Math.max(0, annualCTC - ctcUtilized) : 0;

    const dashboard = {
      employee: {
        _id: employee._id,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        code: resolveEmployeeDisplayCode(employee),
        email: employee.email || '',
        department: employee.payrollInfo?.department || '',
        designation: employee.payrollInfo?.designation || employee.jobTitle || '',
      },
      summaryCards: {
        currentPeriodNetPay: activePayroll?.netPay ?? 0,
        ytdGrossPay: ytdGross,
        currentPeriodGrossPay: activePayroll?.grossEarnings ?? 0,
        hoursWorked,
        hoursLabel: 'this period',
      },
      currentPeriod: {
        month: activePayroll?.month || currentMonthShort,
        year: activePayroll?.year || calendarYear,
        netPay,
        grossEarnings: grossPay,
        totalDeductions,
        payStatus: activePayroll?.payStatus || 'pending',
      },
      yearToDate: {
        year: calendarYear,
        totalGross: ytdGross,
        totalDeductions: ytdDeductions,
        totalNetPay: ytdNetPay,
        monthsProcessed: ytdPayrolls.length,
        totalCTC: annualCTC,
      },
      attendance: {
        hoursWorked,
        daysWorked: presentDays,
        workingDays,
        attendancePercentage:
          workingDays > 0 ? Math.round((presentDays / workingDays) * 10000) / 100 : 0,
      },
      lastPayslipDate: payPeriodEndDate,
      currentPayStub: activePayroll
        ? {
            payrollId: activePayroll._id,
            payPeriod: {
              month: activePayroll.month,
              year: activePayroll.year,
              label: `${activePayroll.month} ${activePayroll.year}`,
              endingLabel: payPeriodEndDate
                ? `Pay period ending ${new Date(payPeriodEndDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : `${activePayroll.month} ${activePayroll.year}`,
            },
            earnings: earningsRows,
            grossPay,
            deductions: (activePayroll.deductions || []).map((d) => ({
              componentName: d.componentName || 'Deduction',
              amount: Number(d.amount) || 0,
            })),
            totalDeductions,
            netPay,
            payStatus: activePayroll.payStatus || 'pending',
            navigation: {
              hasPrevious: stubIndex >= 0 && stubIndex < sortPayrolls.length - 1,
              hasNext: stubIndex > 0,
              previousPayrollId:
                stubIndex >= 0 && stubIndex < sortPayrolls.length - 1
                  ? sortPayrolls[stubIndex + 1]._id
                  : null,
              nextPayrollId: stubIndex > 0 ? sortPayrolls[stubIndex - 1]._id : null,
            },
          }
        : null,
      deductionBreakdown,
      annualSalaryStatements,
      claimsAndReimbursements: {
        balanceAvailable,
        reimbursementHeads: reimbursementBalances,
        ctcBreakdown: {
          monthlyCTC,
          annualCTC,
          ctcUtilized,
          ctcBalance,
        },
        claimsStats,
        financialYear: getFinancialYearFromPayroll(currentMonthShort, calendarYear)?.key || null,
        claimMonthKey: currentMonthKey,
      },
      recentPayslips: sortPayrolls.slice(0, 6).map((p) => ({
        payrollId: p._id,
        month: p.month,
        year: p.year,
        grossEarnings: p.grossEarnings || 0,
        netPay: p.netPay || 0,
        payStatus: p.payStatus || 'pending',
      })),
    };

    return sendResponse(res, 200, true, 'Payroll dashboard fetched successfully', dashboard);
  } catch (err) {
    console.error('getMyPayrollDashboard:', err);
    return handleError(res, err);
  }
};

function aggregatePayrollComponents(rows = [], field = 'earnings') {
  const totals = new Map();

  for (const payroll of rows) {
    for (const item of payroll[field] || []) {
      const name = item.componentName || item.name || 'Other';
      totals.set(name, (totals.get(name) || 0) + (Number(item.amount) || 0));
    }
  }

  return Array.from(totals.entries()).map(([componentName, amount]) => ({
    componentName,
    amount,
  }));
}

function buildMonthlyBreakdownRow(payroll) {
  const basicSalary =
    (payroll.earnings || []).find((e) =>
      String(e.componentName || '').toLowerCase().includes('basic')
    )?.amount || 0;

  const storedPresentDays = Number(payroll.presentDays);
  const paidDays = Number.isFinite(storedPresentDays)
    ? Math.max(0, storedPresentDays)
    : Math.max(0, (Number(payroll.workingDays) || 0) - (Number(payroll.lopDays) || 0));

  return {
    payrollId: payroll._id,
    month: payroll.month,
    year: payroll.year,
    basicSalary: Number(basicSalary) || 0,
    grossEarnings: payroll.grossEarnings || 0,
    totalDeductions: payroll.totalDeductions || 0,
    netPay: payroll.netPay || 0,
    payStatus: payroll.payStatus || 'pending',
    processedDate: payroll.processedDate || null,
    workingDays: Number(payroll.workingDays) || 0,
    presentDays: Number.isFinite(storedPresentDays) ? Math.max(0, storedPresentDays) : paidDays,
    paidDays,
    lopDays: Number(payroll.lopDays) || 0,
    earnings: mergePayslipEarningsColumn(
      payroll.earnings,
      payroll.benefits,
      payroll.reimbursements
    ),
    deductions: (payroll.deductions || []).map((d) => ({
      componentName: d.componentName || 'Deduction',
      amount: Number(d.amount) || 0,
    })),
  };
}

async function fetchAnnualSalaryStatement(org_uuid, employeeId, financialYearInput) {
  const fy = resolveFinancialYearInput(financialYearInput);
  if (!fy.ok) {
    return { error: fy.error, status: 400 };
  }

  const { PayrollRunModel, EmployeeModel, OrganizationModel } = await initModels(org_uuid);

  const employee = await EmployeeModel.findById(employeeId).select(
    'firstName lastName email uniqueId customId payrollInfo jobTitle departmentId'
  );

  if (!employee) {
    return { error: 'Employee not found', status: 404 };
  }

  const organization = await OrganizationModel?.findById(org_uuid).select('name address logo');

  const payrolls = await PayrollRunModel.find({
    organizationId: org_uuid,
    employeeId,
    ...buildFinancialYearPayrollQuery({ startYear: fy.startYear, endYear: fy.endYear }),
  }).lean();

  payrolls.sort(
    (a, b) =>
      getPayrollPeriodSortKey(a.month, a.year, fy.startYear, fy.endYear) -
      getPayrollPeriodSortKey(b.month, b.year, fy.startYear, fy.endYear)
  );

  const monthlyBreakdown = payrolls.map(buildMonthlyBreakdownRow);

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  payrolls.forEach((p) => {
    totalGross += p.grossEarnings || 0;
    totalDeductions += p.totalDeductions || 0;
    totalNetPay += p.netPay || 0;
  });

  const monthsProcessed = payrolls.length;
  const expectedMonths = PAYROLL_MONTHS.length;

  return {
    data: {
      organization: {
        name: organization?.name || 'Organization',
        address: organization?.address || '',
        logo: organization?.logo || '',
      },
      employee: {
        id: employee._id,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        code: resolveEmployeeDisplayCode(employee),
        email: employee.email || '',
        department: employee.payrollInfo?.department || '',
        designation: employee.payrollInfo?.designation || employee.jobTitle || '',
      },
      financialYear: fy.keyShort,
      financialYearCanonical: fy.canonical,
      financialYearLabel: fy.label,
      period: {
        from: `Apr ${fy.startYear}`,
        to: `Mar ${fy.endYear}`,
        description: `April ${fy.startYear} to March ${fy.endYear}`,
      },
      monthlyBreakdown,
      annualSummary: {
        totalGross,
        totalDeductions,
        totalNetPay,
        monthsProcessed,
        expectedMonths,
        averageMonthlyGross: monthsProcessed > 0 ? Math.round(totalGross / monthsProcessed) : 0,
        averageMonthlyNetPay: monthsProcessed > 0 ? Math.round(totalNetPay / monthsProcessed) : 0,
      },
      componentTotals: {
        earnings: aggregatePayrollComponents(payrolls, 'earnings'),
        deductions: aggregatePayrollComponents(payrolls, 'deductions'),
      },
    },
  };
}

/**
 * Annual salary statement for logged-in employee (Indian FY: Apr–Mar)
 * Route: GET /payRoll/employee/annualSalaryStatement?financialYear=2025-26
 */
exports.getMyAnnualSalaryStatement = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = resolveEmployeeId(req);
    const { financialYear } = req.query;

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
    }

    const result = await fetchAnnualSalaryStatement(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status, false, result.error);
    }

    return sendResponse(res, 200, true, 'Annual salary statement fetched successfully', result.data);
  } catch (err) {
    console.error('getMyAnnualSalaryStatement:', err);
    return handleError(res, err);
  }
};

/**
 * Annual salary statement for a specific employee (admin / HR)
 * Route: GET /payRoll/employee/:employeeId/annualSalaryStatement?financialYear=2025-26
 */
exports.getEmployeeAnnualSalaryStatement = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const { employeeId } = req.params;
    const { financialYear } = req.query;

    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    if (!employeeId) {
      return sendResponse(res, 400, false, 'Employee ID is required');
    }

    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
    }

    const result = await fetchAnnualSalaryStatement(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status, false, result.error);
    }

    return sendResponse(res, 200, true, 'Annual salary statement fetched successfully', result.data);
  } catch (err) {
    console.error('getEmployeeAnnualSalaryStatement:', err);
    return handleError(res, err);
  }
};

/**
 * Employee Form 16 (same data as admin generateForm16, scoped to logged-in employee)
 * Route: GET /payRoll/employee/form16?financialYear=2025-26
 */
exports.getMyForm16 = async (req, res) => {
  try {
    const employeeId = resolveEmployeeId(req);
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }
    req.params.employeeId = String(employeeId);
    const form16 = require('./form16');
    return form16.generateForm16(req, res);
  } catch (err) {
    return handleError(res, err);
  }
};

/** GET /payRoll/employee/form16/download?financialYear=2025-26 */
exports.downloadMyForm16Pdf = async (req, res) => {
  try {
    const form16 = require('./form16');
    return form16.downloadMyForm16Pdf(req, res);
  } catch (err) {
    return handleError(res, err);
  }
};

/** GET /payRoll/employee/form16/part-a/download?financialYear=2025-26 */
exports.downloadMyForm16PartAPdf = async (req, res) => {
  try {
    const form16 = require('./form16');
    return form16.downloadMyForm16PartAPdf(req, res);
  } catch (err) {
    return handleError(res, err);
  }
};

/** GET /payRoll/employee/form16/part-b/download?financialYear=2025-26 */
exports.downloadMyForm16PartBPdf = async (req, res) => {
  try {
    const form16 = require('./form16');
    return form16.downloadMyForm16PartBPdf(req, res);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get logged-in employee's payslips (salary history)
 * Route: GET /api/payroll/employee/myPayslips
 */
exports.getMyPayslips = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = req.empId || req.user?._id; // From JWT token

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { PayrollRunModel } = await initModels(org_uuid);
    const { year, month, limit = 12 } = req.query;

    const filter = {
      organizationId: org_uuid,
      employeeId: employeeId,
    };

    if (year) filter.year = parseInt(year);
    if (month) filter.month = month;

    const payslips = await PayrollRunModel.find(filter)
      .sort({ year: -1, month: -1 })
      .limit(parseInt(limit))
      .populate(
        'employeeId',
        `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation`
      );

    return sendResponse(res, 200, true, 'Payslips fetched successfully', {
      total: payslips.length,
      data: payslips,
    });
  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Get specific payslip detail with full breakdown
 * Route: GET /api/payroll/employee/myPayslips/:payrollId
 */
exports.getMyPayslipDetail = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = req.empId || req.user?._id;
    const { payrollId } = req.params;

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { PayrollRunModel, OrganizationModel } = await initModels(org_uuid);

    const payroll = await PayrollRunModel.findOne({
      _id: payrollId,
      employeeId: employeeId,
      organizationId: org_uuid,
    }).populate(
      'employeeId',
      `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation`
    );

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payslip not found');
    }

    const organization = await OrganizationModel?.findById(org_uuid);

    const payslipDetail = {
      organization: {
        name: organization?.name || 'Organization',
        address: organization?.address || '',
        logo: organization?.logo || '',
      },
      employee: {
        name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
        code: resolveEmployeeDisplayCode(payroll.employeeId),
        email: payroll.employeeId.email,
        department: payroll.employeeId.payrollInfo?.department || '',
        designation: payroll.employeeId.payrollInfo?.designation || payroll.employeeId.jobTitle || '',
      },
      payPeriod: {
        month: payroll.month,
        year: payroll.year,
      },
      earnings: mergePayslipEarningsColumn(
        payroll.earnings,
        payroll.benefits,
        payroll.reimbursements
      ),
      deductions: payroll.deductions || [],
      benefits: payroll.benefits || [],
      reimbursements: payroll.reimbursements || [],
      summary: {
        grossEarnings: payroll.grossEarnings || 0,
        totalDeductions: payroll.totalDeductions || 0,
        netPay: payroll.netPay || 0,
      },
      attendance: {
        workingDays: Number(payroll.workingDays) || 0,
        paidDays: Math.max(
          0,
          Number.isFinite(Number(payroll.presentDays))
            ? Number(payroll.presentDays)
            : (Number(payroll.workingDays) || 0) - (Number(payroll.lopDays) || 0)
        ),
        presentDays: Number(payroll.presentDays) || 0,
        lopDays: Number(payroll.lopDays) || 0,
      },
      payStatus: payroll.payStatus,
      processedDate: payroll.processedDate,
    };

    return sendResponse(res, 200, true, 'Payslip detail fetched successfully', payslipDetail);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Download own payslip PDF (same layout as admin generatePayslip).
 * Route: GET /api/payroll/employee/myPayslips/:payrollId/pdf
 */
//

/**
 * Get salary summary - current month and YTD
 * Route: GET /api/payroll/employee/salarySummary
 */
exports.getMySalarySummary = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = req.user?.employeeId || req.user?._id;

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { PayrollRunModel } = await initModels(org_uuid);

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('en-IN', { month: 'short' });

    // Current month salary
    const currentMonthSalary = await PayrollRunModel.findOne({
      organizationId: org_uuid,
      employeeId: employeeId,
      year: currentYear,
      month: currentMonth,
    });

    // Year-to-date calculation
    const ytdPayrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      employeeId: employeeId,
      year: currentYear,
    });

    let ytdGross = 0;
    let ytdDeductions = 0;
    let ytdNetPay = 0;

    ytdPayrolls.forEach((p) => {
      ytdGross += p.grossEarnings || 0;
      ytdDeductions += p.totalDeductions || 0;
      ytdNetPay += p.netPay || 0;
    });

    return sendResponse(res, 200, true, 'Salary summary fetched successfully', {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        grossEarnings: currentMonthSalary?.grossEarnings || 0,
        totalDeductions: currentMonthSalary?.totalDeductions || 0,
        netPay: currentMonthSalary?.netPay || 0,
        payStatus: currentMonthSalary?.payStatus || 'pending',
      },
      yearToDate: {
        year: currentYear,
        totalGross: ytdGross,
        totalDeductions: ytdDeductions,
        totalNetPay: ytdNetPay,
        monthsProcessed: ytdPayrolls.length,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Get my claims summary (from My Payroll -> Claims section)
 * Route: GET /api/payroll/employee/myClaimsSummary
 */
exports.getMyClaimsSummary = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = req.empId || req.user?._id;

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { ClaimsDeclarationModel } = await initModels(org_uuid);

    const claims = await ClaimsDeclarationModel.findOne({
      organizationId: org_uuid,
      employeeId: employeeId,
    });

    if (!claims) {
      return sendResponse(res, 200, true, 'No claims found', {
        reimbursements: [],
        stats: { total: 0, approved: 0, pending: 0, rejected: 0 },
      });
    }

    // Calculate stats
    const reimbursements = claims.reimbursements || [];
    const stats = {
      total: reimbursements.length,
      approved: reimbursements.filter((r) => r.status === 'approved').length,
      pending: reimbursements.filter((r) => r.status === 'pending').length,
      rejected: reimbursements.filter((r) => r.status === 'rejected').length,
      totalClaimed: reimbursements.reduce((sum, r) => sum + (r.claimedAmount || 0), 0),
      totalApproved: reimbursements
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + (r.approvedAmount || 0), 0),
    };

    return sendResponse(res, 200, true, 'Claims summary fetched successfully', {
      reimbursements: reimbursements.map((r) => ({
        _id: r._id,
        claimNo: r.claimNo,
        claimGroupId: r.claimGroupId,
        headId: r.headId,
        headName: r.headName,
        headCode: r.headCode,
        name: r.name,
        type: r.type,
        claimDate: r.claimDate,
        billNo: r.billNo,
        particulars: r.particulars,
        claimedAmount: r.claimedAmount,
        approvedAmount: r.approvedAmount,
        status: r.status,
        proofUrl: r.proofUrl,
        description: r.description,
        employeeComments: r.employeeComments,
        attachmentUrls: r.attachmentUrls || [],
        submittedOn: r.submittedOn,
      })),
      stats,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAllClaimsSummary = async (req, res) => {
  try {

    const org_uuid = req.headers.org_uuid;

    if (!org_uuid) {

      return sendResponse(
        res,
        400,
        false,
        'Organization UUID missing'
      );
    }

    const {
      page = 1,
      limit = 10,
      status,
      employeeId,
      search,
      fromDate,
      toDate,
    } = req.query;

    const currentPage =
      Math.max(Number(page) || 1, 1);

    const perPage =
      Math.max(Number(limit) || 10, 1);

    const skip =
      (currentPage - 1) * perPage;

    const {
      ClaimsDeclarationModel,
    } = await initModels(org_uuid);

    // fetch all employee claims
    const claimDocs =
      await ClaimsDeclarationModel
        .find({
          organizationId: org_uuid,
          ...(employeeId
            ? { employeeId }
            : {}),
        })
        .populate(
          'employeeId',
          'firstName lastName employeeCode email'
        )
        .lean();

    let reimbursements = [];

    // flatten reimbursements
    for (const doc of claimDocs) {

      const employee =
        doc.employeeId || {};

      for (const r of doc.reimbursements || []) {

        reimbursements.push({

          _id: r._id,

          employee: {
            _id: employee._id || null,
            employeeCode:
              employee.employeeCode || '',
            firstName:
              employee.firstName || '',
            lastName:
              employee.lastName || '',
            fullName:
              `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            email:
              employee.email || '',
          },

          claimNo:
            r.claimNo || '',

          claimGroupId:
            r.claimGroupId || '',

          headId:
            r.headId || null,

          headName:
            r.headName || '',

          headCode:
            r.headCode || '',

          name:
            r.name || '',

          type:
            r.type || '',

          claimDate:
            r.claimDate || null,

          billNo:
            r.billNo || '',

          particulars:
            r.particulars || '',

          claimedAmount:
            Number(r.claimedAmount) || 0,

          approvedAmount:
            Number(r.approvedAmount) || 0,

          status:
            r.status || 'pending',

          proofUrl:
            r.proofUrl || '',

          description:
            r.description || '',

          employeeComments:
            r.employeeComments || '',

          attachmentUrls:
            Array.isArray(r.attachmentUrls)
              ? r.attachmentUrls
              : [],

          submittedOn:
            r.submittedOn || null,

          approvedBy:
            r.approvedBy || null,

          approvedOn:
            r.approvedOn || null,

          rejectionReason:
            r.rejectionReason || '',
        });
      }
    }

    // status filter
    if (status) {

      reimbursements =
        reimbursements.filter(
          (r) =>
            String(r.status)
              .toLowerCase() ===
            String(status)
              .toLowerCase()
        );
    }

    // search filter
    if (search) {

      const keyword =
        String(search)
          .trim()
          .toLowerCase();

      reimbursements =
        reimbursements.filter((r) => {

          return (

            r.claimNo
              ?.toLowerCase()
              .includes(keyword) ||

            r.billNo
              ?.toLowerCase()
              .includes(keyword) ||

            r.headName
              ?.toLowerCase()
              .includes(keyword) ||

            r.type
              ?.toLowerCase()
              .includes(keyword) ||

            r.employee
              ?.fullName
              ?.toLowerCase()
              .includes(keyword) ||

            r.employee
              ?.employeeCode
              ?.toLowerCase()
              .includes(keyword)
          );
        });
    }

    // date filter
    if (fromDate || toDate) {

      reimbursements =
        reimbursements.filter((r) => {

          const claimDate =
            r.claimDate
              ? new Date(r.claimDate)
              : null;

          if (!claimDate) {
            return false;
          }

          if (
            fromDate &&
            claimDate <
              new Date(fromDate)
          ) {
            return false;
          }

          if (
            toDate &&
            claimDate >
              new Date(toDate)
          ) {
            return false;
          }

          return true;
        });
    }

    // latest first
    reimbursements.sort(
      (a, b) =>
        new Date(
          b.submittedOn || 0
        ) -
        new Date(
          a.submittedOn || 0
        )
    );

    // overall stats
    const stats = {

      total:
        reimbursements.length,

      approved:
        reimbursements.filter(
          (r) =>
            r.status === 'approved'
        ).length,

      pending:
        reimbursements.filter(
          (r) =>
            r.status === 'pending'
        ).length,

      rejected:
        reimbursements.filter(
          (r) =>
            r.status === 'rejected'
        ).length,

      totalClaimed:
        reimbursements.reduce(
          (sum, r) =>
            sum +
            (r.claimedAmount || 0),
          0
        ),

      totalApproved:
        reimbursements
          .filter(
            (r) =>
              r.status === 'approved'
          )
          .reduce(
            (sum, r) =>
              sum +
              (r.approvedAmount || 0),
            0
          ),
    };

    // pagination
    const total =
      reimbursements.length;

    const totalPages =
      Math.ceil(
        total / perPage
      ) || 1;

    const paginated =
      reimbursements.slice(
        skip,
        skip + perPage
      );

    return sendResponse(
      res,
      200,
      true,
      'All claims fetched successfully',
      {
        reimbursements: paginated,

        pagination: {
          total,
          totalPages,
          currentPage,
          limit: perPage,
        },

        stats,
      }
    );

  } catch (err) {

    console.log(
      'getAllClaimsSummary Error:',
      err
    );

    return handleError(res, err);
  }
};
/**
 * Get active reimbursement heads (Salary Components -> Reimbursements)
 * Route: GET /api/payroll/employee/reimbursementHeads
 */
exports.getMyReimbursementHeads = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { SalaryCompensationModel } = await initModels(org_uuid);
    const record = await SalaryCompensationModel.findOne(
      { organizationId: org_uuid, category: 'reimbursements' },
      { components: 1 }
    );

    const heads = (record?.components || [])
      .filter((c) => (c.status || 'active') === 'active')
      .map((c) => ({
        _id: c._id,
        name: c.name,
        code: c.code,
        maxLimit: c.maxLimit || 0,
        frequency: c.frequency,
        taxable: c.taxable !== false,
      }));

    return sendResponse(res, 200, true, 'Reimbursement heads fetched successfully', heads);
  } catch (err) {
    return handleError(res, err);
  }
};


function getClaimCalendarMonthKey(claimDateInput) {
  const date = claimDateInput ? new Date(claimDateInput) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function matchesReimbursementHead(claim, head) {
  const headId = String(head._id);
  return (
    String(claim.headId) === headId ||
    (claim.headCode &&
      head.code &&
      String(claim.headCode).toLowerCase() === String(head.code).toLowerCase()) ||
    (claim.headName &&
      head.name &&
      String(claim.headName).toLowerCase() === String(head.name).toLowerCase())
  );
}

/** Pending + approved claims in same calendar month count toward maxLimit; rejected do not. */
function getMonthlyUtilizedForHead(existingClaims, head, monthKey) {
  if (!monthKey) return 0;

  return (existingClaims || [])
    .filter((claim) => {
      if (claim.status === 'rejected') return false;
      if (!matchesReimbursementHead(claim, head)) return false;
      return getClaimCalendarMonthKey(claim.claimDate) === monthKey;
    })
    .reduce((sum, claim) => {
      const amount =
        claim.status === 'approved'
          ? Number(claim.approvedAmount ?? claim.claimedAmount) || 0
          : Number(claim.claimedAmount) || 0;
      return sum + amount;
    }, 0);
}

function buildMonthlyHeadBucketKey(headId, monthKey) {
  return `${String(headId)}|${monthKey}`;
}

/**
 * Submit new reimbursement claim(s) — canonical body always uses `items` (one or many rows).
 * Route: POST /payRoll/employee/submitClaim
 *
 * Body: { comments?, attachmentUrls?, items: [{ headId, claimedAmount, claimDate?, billNo?, particulars?, proofUrl?, description?, name?, type? }] }
 */

// exports.submitMyClaim = async (req, res) => {
//   try {
//     const org_uuid = req.headers.org_uuid;

//     const employeeId =
//       req.empId || req.user?._id;

//     if (!org_uuid || !employeeId) {
//       return sendResponse(
//         res,
//         400,
//         false,
//         'Missing required information'
//       );
//     }

//     const {
//       ClaimsDeclarationModel,
//       SalaryCompensationModel,
//     } = await initModels(org_uuid);

//     const body = req.body || {};

//     // comments
//     const batchComments =
//       body.comments != null
//         ? String(body.comments)
//         : '';

//     // multipart/form-data support
//     let items = body.items;

//     if (typeof items === 'string') {
//       try {
//         items = JSON.parse(items);
//       } catch (err) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           'Invalid items JSON format'
//         );
//       }
//     }

//     if (
//       !Array.isArray(items) ||
//       items.length === 0
//     ) {
//       return sendResponse(
//         res,
//         400,
//         false,
//         'items must be a non-empty array'
//       );
//     }

//     const rows = items;

//     if (
//       rows.length >
//       MAX_CLAIM_ITEMS_PER_REQUEST
//     ) {
//       return sendResponse(
//         res,
//         400,
//         false,
//         `At most ${MAX_CLAIM_ITEMS_PER_REQUEST} line items allowed per request`
//       );
//     }

//     // reimbursement heads
//     const salaryCompDoc =
//       await SalaryCompensationModel.findOne(
//         {
//           organizationId: org_uuid,
//           category: 'reimbursements',
//         },
//         { components: 1 }
//       );

//     const headById = new Map();

//     for (const c of salaryCompDoc?.components || []) {
//       headById.set(String(c._id), c);
//     }

//     // generate group id
//     const claimGroupId =
//       crypto.randomUUID();

//     // find employee claim doc
//     let claimDoc =
//       await ClaimsDeclarationModel.findOne({
//         organizationId: org_uuid,
//         employeeId: employeeId,
//       });

//     if (!claimDoc) {
//       claimDoc =
//         new ClaimsDeclarationModel({
//           organizationId: org_uuid,
//           employeeId: employeeId,
//           reimbursements: [],
//         });
//     }

//     if (
//       !Array.isArray(
//         claimDoc.reimbursements
//       )
//     ) {
//       claimDoc.reimbursements = [];
//     }

//     // files
//     const proofFile =
//       req.files?.proofFile?.[0];

//     const attachmentFiles =
//       req.files?.attachments || [];

//     // upload proof file
//     let uploadedProofUrl = '';

//     if (proofFile) {
//       const uploadedProof =
//         await uploadFile(proofFile);

//       uploadedProofUrl =
//         uploadedProof.url;
//     }

//     // upload attachments
//     const uploadedAttachmentUrls =
//       [];

//     for (const file of attachmentFiles) {
//       const uploaded =
//         await uploadFile(file);

//       uploadedAttachmentUrls.push(
//         uploaded.url
//       );
//     }

//     const created = [];

//     let baseCount =
//       claimDoc.reimbursements.length;

//     // loop items
//     for (
//       let i = 0;
//       i < rows.length;
//       i += 1
//     ) {
//       const row = rows[i] || {};

//       const {
//         headId,
//         claimDate,
//         claimedAmount,
//         description,
//         name,
//         type,
//         billNo,
//         particulars,
//       } = row;

//       // validations
//       if (
//         !headId ||
//         claimedAmount === undefined ||
//         claimedAmount === null
//       ) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           `items[${i}]: headId and claimedAmount are required`
//         );
//       }

//       const claimed =
//         Number(claimedAmount);

//       if (
//         !Number.isFinite(claimed) ||
//         claimed <= 0
//       ) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           `items[${i}]: claimedAmount must be greater than 0`
//         );
//       }

//       const head =
//         headById.get(String(headId));

//       if (!head) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           `items[${i}]: invalid reimbursement headId`
//         );
//       }

//       if (
//         (head.status || 'active') !==
//         'active'
//       ) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           `items[${i}]: reimbursement head is inactive`
//         );
//       }

//       if (
//         head.maxLimit &&
//         head.maxLimit > 0 &&
//         claimed > head.maxLimit
//       ) {
//         return sendResponse(
//           res,
//           400,
//           false,
//           `items[${i}]: amount cannot exceed max limit (${head.maxLimit})`
//         );
//       }

//       baseCount += 1;

//       const claimNo = `CLM${String(
//         baseCount
//       ).padStart(4, '0')}`;

//       // save reimbursement
//       claimDoc.reimbursements.push({
//         claimNo,
//         claimGroupId,

//         headId: head._id,
//         headName: head.name,
//         headCode: head.code,

//         name:
//           name || head.name,

//         type:
//           type ||
//           head.code ||
//           'reimbursement',

//         claimDate: claimDate
//           ? new Date(claimDate)
//           : new Date(),

//         billNo:
//           billNo != null
//             ? String(billNo)
//             : '',

//         particulars:
//           particulars != null
//             ? String(particulars)
//             : '',

//         claimedAmount: claimed,

//         approvedAmount: 0,

//         proofUrl:
//           uploadedProofUrl,

//         attachmentUrls:
//           uploadedAttachmentUrls,

//         description:
//           description != null
//             ? String(description)
//             : '',

//         employeeComments:
//           batchComments,

//         submittedOn: new Date(),

//         status: 'pending',
//       });

//       const sub =
//         claimDoc.reimbursements[
//           claimDoc.reimbursements
//             .length - 1
//         ];

//       created.push({
//         _id: sub._id,
//         claimNo: sub.claimNo,
//         headId: sub.headId,
//         headName: sub.headName,
//         claimedAmount:
//           sub.claimedAmount,
//         proofUrl: sub.proofUrl,
//         attachmentUrls:
//           sub.attachmentUrls,
//         status: sub.status,
//       });
//     }

//     // save db
//     await claimDoc.save();

//     return sendResponse(
//       res,
//       200,
//       true,
//       'Claim submitted successfully',
//       {
//         claimGroupId,
//         status: 'pending',
//         count: created.length,
//         items: created,
//       }
//     );
//   } catch (err) {
//     console.log(
//       'submitMyClaim Error:',
//       err
//     );

//     return handleError(res, err);
//   }
// };


exports.submitMyClaim = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;

    const employeeId =
      req.empId || req.user?._id;

    if (!org_uuid || !employeeId) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required information'
      );
    }

    const {
      ClaimsDeclarationModel,
      SalaryCompensationModel,
    } = await initModels(org_uuid);

    const body = req.body || {};

    // comments
    const batchComments =
      body.comments != null
        ? String(body.comments)
        : '';

    // parse items
    let items = body.items;

    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return sendResponse(
          res,
          400,
          false,
          'Invalid items JSON format'
        );
      }
    }

    // validations
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return sendResponse(
        res,
        400,
        false,
        'items must be a non-empty array'
      );
    }

    const rows = items;

    if (
      rows.length >
      MAX_CLAIM_ITEMS_PER_REQUEST
    ) {
      return sendResponse(
        res,
        400,
        false,
        `At most ${MAX_CLAIM_ITEMS_PER_REQUEST} line items allowed per request`
      );
    }

    // reimbursement heads
    const salaryCompDoc =
      await SalaryCompensationModel.findOne(
        {
          organizationId: org_uuid,
          category: 'reimbursements',
        },
        { components: 1 }
      );

    const headById = new Map();

    for (const c of salaryCompDoc?.components || []) {
      headById.set(String(c._id), c);
    }

    // generate claim group id
    const claimGroupId =
      crypto.randomUUID();

    // employee claim document
    let claimDoc =
      await ClaimsDeclarationModel.findOne({
        organizationId: org_uuid,
        employeeId: employeeId,
      });

    if (!claimDoc) {
      claimDoc =
        new ClaimsDeclarationModel({
          organizationId: org_uuid,
          employeeId: employeeId,
          reimbursements: [],
        });
    }

    if (
      !Array.isArray(
        claimDoc.reimbursements
      )
    ) {
      claimDoc.reimbursements = [];
    }

    // files
    const proofFiles =
      req.files?.proofFile || [];

    const attachmentFiles =
      req.files?.attachments || [];

    // upload common attachments once
    const uploadedAttachmentUrls =
      [];

    for (const file of attachmentFiles) {
      const uploaded =
        await uploadFile(file);

      uploadedAttachmentUrls.push(
        uploaded.url
      );
    }

    const created = [];
    const pendingInRequest = new Map();

    let baseCount =
      claimDoc.reimbursements.length;

    // loop items
    for (
      let i = 0;
      i < rows.length;
      i += 1
    ) {
      const row = rows[i] || {};

      const {
        headId,
        claimDate,
        claimedAmount,
        description,
        name,
        type,
        billNo,
        particulars,
      } = row;

      // required validations
      if (
        !headId ||
        claimedAmount === undefined ||
        claimedAmount === null
      ) {
        return sendResponse(
          res,
          400,
          false,
          `items[${i}]: headId and claimedAmount are required`
        );
      }

      const claimed =
        Number(claimedAmount);

      // amount validation
      if (
        !Number.isFinite(claimed) ||
        claimed <= 0
      ) {
        return sendResponse(
          res,
          400,
          false,
          `items[${i}]: claimedAmount must be greater than 0`
        );
      }

      // reimbursement head validation
      const head =
        headById.get(String(headId));

      if (!head) {
        return sendResponse(
          res,
          400,
          false,
          `items[${i}]: invalid reimbursement headId`
        );
      }

      // active validation
      if (
        (head.status || 'active') !==
        'active'
      ) {
        return sendResponse(
          res,
          400,
          false,
          `items[${i}]: reimbursement head is inactive`
        );
      }

      const monthKey = getClaimCalendarMonthKey(claimDate);
      const maxLimit = Number(head.maxLimit) || 0;

      if (maxLimit > 0) {
        if (!monthKey) {
          return sendResponse(
            res,
            400,
            false,
            `items[${i}]: invalid claimDate`
          );
        }

        const bucketKey = buildMonthlyHeadBucketKey(headId, monthKey);
        const utilizedInDb = getMonthlyUtilizedForHead(
          claimDoc.reimbursements,
          head,
          monthKey
        );
        const utilizedInRequest = pendingInRequest.get(bucketKey) || 0;
        const totalAfterClaim = utilizedInDb + utilizedInRequest + claimed;

        if (totalAfterClaim > maxLimit) {
          const remaining = Math.max(0, maxLimit - utilizedInDb - utilizedInRequest);
          return sendResponse(
            res,
            400,
            false,
            `items[${i}]: monthly limit exceeded for "${head.name}". Max ${maxLimit} per month (${monthKey}), already used ${utilizedInDb + utilizedInRequest}, remaining ${remaining}`
          );
        }

        pendingInRequest.set(bucketKey, utilizedInRequest + claimed);
      }

      // current proof file by index
      const currentProofFile =
        proofFiles[i];

      let uploadedProofUrl = '';

      // upload proof file
      if (currentProofFile) {
        const uploadedProof =
          await uploadFile(
            currentProofFile
          );

        uploadedProofUrl =
          uploadedProof.url;
      }

      baseCount += 1;

      const claimNo = `CLM${String(
        baseCount
      ).padStart(4, '0')}`;

      // save reimbursement
      claimDoc.reimbursements.push({
        claimNo,
        claimGroupId,

        headId: head._id,
        headName: head.name,
        headCode: head.code,

        name:
          name || head.name,

        type:
          type ||
          head.code ||
          'reimbursement',

        claimDate: claimDate
          ? new Date(claimDate)
          : new Date(),

        billNo:
          billNo != null
            ? String(billNo)
            : '',

        particulars:
          particulars != null
            ? String(particulars)
            : '',

        claimedAmount: claimed,

        approvedAmount: 0,

        // item-wise proof file
        proofUrl:
          uploadedProofUrl,

        // common attachments
        attachmentUrls:
          uploadedAttachmentUrls,

        description:
          description != null
            ? String(description)
            : '',

        employeeComments:
          batchComments,

        submittedOn:
          new Date(),

        status: 'pending',
      });

      const sub =
        claimDoc.reimbursements[
          claimDoc.reimbursements
            .length - 1
        ];

      created.push({
        _id: sub._id,
        claimNo: sub.claimNo,
        headId: sub.headId,
        headName: sub.headName,
        claimedAmount:
          sub.claimedAmount,
        proofUrl:
          sub.proofUrl,
        attachmentUrls:
          sub.attachmentUrls,
        status: sub.status,
      });
    }

    // save db
    await claimDoc.save();

    return sendResponse(
      res,
      200,
      true,
      'Claim submitted successfully',
      {
        claimGroupId,
        status: 'pending',
        count: created.length,
        items: created,
      }
    );
  } catch (err) {
    console.log(
      'submitMyClaim Error:',
      err
    );

    return handleError(res, err);
  }
};


/**
 * Get my investment declarations (Taxation section)
 * Route: GET /api/payroll/employee/myInvestments
 */



/**
 * Submit investment proof
 * Route: POST /api/payroll/employee/submitInvestmentProof
 */


// ============================================================================
// 🔥 PAYROLL INFO MANAGEMENT APIs
// ============================================================================

/**
 * Calculate Payroll Info based on Organization Settings
 * Route: POST /api/payroll/calculatePayrollInfo
 * Body: { baseSalary: 50000 } or { grossSalary: 50000 }
 */
exports.calculatePayrollInfo = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const {
      baseSalary,
      state,
      componentOverrides,
      employeeId,
      statutoryInfo,
      presentDays: presentDaysInput,
      workingDays: workingDaysInput,
    } = req.body;
    const baseInput = Number(baseSalary) || 0;
    const grossInput = Number(req.body.grossSalary) || 0;
    const presentDays = Number.isFinite(Number(presentDaysInput))
      ? Number(presentDaysInput)
      : null;
    const workingDays = Number.isFinite(Number(workingDaysInput))
      ? Number(workingDaysInput)
      : null;

    if (baseInput <= 0 && grossInput <= 0) {
      return sendResponse(
        res,
        400,
        false,
        'baseSalary or grossSalary is required and must be greater than 0'
      );
    }

    const { SalaryCompensationModel, StatutoryComplianceModel, EmployeeModel } =
      await initModels(org_uuid);

    let overrides = [];
    let employeeStatutoryInfo = null;
    if (employeeId) {
      const employee = await EmployeeModel.findById(employeeId).select(
        'payrollInfo.componentOverrides statutoryInfo'
      );
      if (!employee) {
        return sendResponse(res, 404, false, 'Employee not found');
      }
      // Option B: never reuse sticky Basic from employee payroll.
      // Session Basic only comes via request componentOverrides.
      overrides = stripBasicFromOverrides(
        employee.payrollInfo?.componentOverrides || []
      );
      employeeStatutoryInfo = employee.statutoryInfo
        ? (employee.statutoryInfo.toObject?.() || { ...employee.statutoryInfo })
        : null;
    }
    // Request-body statutory flags (revision UI enable/disable) override employee defaults for this calc
    if (statutoryInfo && typeof statutoryInfo === 'object') {
      employeeStatutoryInfo = { ...(employeeStatutoryInfo || {}), ...statutoryInfo };
    }
    if (Array.isArray(componentOverrides) && componentOverrides.length > 0) {
      overrides = mergeComponentOverrides(overrides, componentOverrides);
    }
    
    // Get organization's salary components
    const salaryComponents = await SalaryCompensationModel.find({ 
      organizationId: org_uuid 
    });

    // Create Revision: typed Basic + Gross → honor Basic; remainder goes to Other Extra Allowance
    if (grossInput > 0 && baseInput > 0) {
      overrides = withExplicitBasicOverride(overrides, baseInput, salaryComponents);
    }

    const resolvedSalary = resolveSalaryBasesFromInput({
      baseSalary: baseInput,
      grossSalary: grossInput,
      salaryComponents,
      overrides,
    });
    if (!resolvedSalary) {
      return sendResponse(res, 400, false, 'Unable to resolve salary input');
    }

    const resolvedBase = resolvedSalary.baseSalary;
    const inputMode = resolvedSalary.inputMode;
    const targetGross = resolvedSalary.targetGross;
    const calcOverrides = resolvedSalary.overridesForCalc || overrides;
    
    // Get organization's statutory compliance settings
    const statutoryCompliance = await StatutoryComplianceModel.findOne({ 
      organizationId: org_uuid 
    });
    
    const earningsResult = buildPayrollEarningsBreakdown({
      salaryComponents,
      resolvedBase,
      overrides: calcOverrides,
      inputMode,
      targetGross,
    });
    const earningsBreakdown = earningsResult.earningsBreakdown;
    const grossSalary = earningsResult.grossSalary;
    const totalEarnings = earningsResult.totalEarnings;
    const resolvedBaseFinal = earningsResult.resolvedBase;

    // ========== STATUTORY DEDUCTIONS CALCULATION ==========
    const deductionsBreakdown = [];
    let totalDeductions = 0;
    
    // 1. EPF Calculation (centralized — honors EDLI, Admin Charges, ABRY, override, etc.)
    const epfBreakdown = calculateEpf({
      epfConfig: statutoryCompliance?.epf,
      baseSalary: resolvedBaseFinal,
      epfApplicableWage: sumConsiderForEpf(earningsBreakdown, resolvedBaseFinal),
      employeeStatutoryInfo: employeeStatutoryInfo,
    });
    const epfEmployee = epfBreakdown.employeeContribution;
    const epfEmployer = epfBreakdown.employerContribution;
    const epfEdli = epfBreakdown.edliContribution;
    const epfAdmin = epfBreakdown.adminCharges;

    if (epfBreakdown.applicable && epfEmployee > 0) {
      totalDeductions += epfEmployee;
      deductionsBreakdown.push({
        name: 'EPF (Employee)',
        amount: epfEmployee,
        type: 'statutory',
        rate: (statutoryCompliance?.epf?.employeeContributionRate || 12) + '%'
      });
    }
    
    // 2. ESI Calculation (centralized)
    const esiBreakdown = calculateEsi({
      esiConfig: statutoryCompliance?.esi,
      grossSalary,
      esiApplicableWage: sumConsiderForEsi(earningsBreakdown, grossSalary),
      employeeStatutoryInfo: employeeStatutoryInfo,
    });
    const esiEmployee = esiBreakdown.employeeContribution;
    const esiEmployer = esiBreakdown.employerContribution;
    if (esiBreakdown.applicable && esiEmployee > 0) {
      totalDeductions += esiEmployee;
      deductionsBreakdown.push({
        name: 'ESI (Employee)',
        amount: esiEmployee,
        type: 'statutory',
        rate: (statutoryCompliance?.esi?.employeeContributionRate || 0.75) + '%'
      });
    }
    
    // 3. Professional Tax Calculation (centralized)
    const ptBreakdown = calculateProfessionalTax({
      ptConfig: statutoryCompliance?.professionalTax,
      grossSalary,
      employeeState: state,
      employeeStatutoryInfo: employeeStatutoryInfo,
    });
    const professionalTax = ptBreakdown.amount;
    let cyclicalStatutoryDeductions = 0;
    if (ptBreakdown.applicable) {
      totalDeductions += professionalTax;
      cyclicalStatutoryDeductions += professionalTax;
      deductionsBreakdown.push({
        name: 'Professional Tax',
        amount: professionalTax,
        type: 'statutory',
        rate: 'Slab-based',
        state: ptBreakdown.details?.stateUsed || state,
      });
    }

    // 4. Labour Welfare Fund (centralized — half-yearly by default)
    const lwfBreakdown = calculateLwf({
      lwfConfig: statutoryCompliance?.labourWelfareFund,
      grossSalary,
      employeeState: state,
      employeeStatutoryInfo: employeeStatutoryInfo,
    });
    if (lwfBreakdown.applicable && lwfBreakdown.employeeShare > 0) {
      totalDeductions += lwfBreakdown.employeeShare;
      cyclicalStatutoryDeductions += lwfBreakdown.employeeShare;
      deductionsBreakdown.push({
        name: 'Labour Welfare Fund',
        amount: lwfBreakdown.employeeShare,
        type: 'statutory',
        rate: 'Fixed',
        state: lwfBreakdown.details?.stateUsed || state,
      });
    }

    // 5. Statutory Bonus preview (informational — paid in paymentMonth)
    const bonusBreakdown = calculateStatutoryBonus({
      bonusConfig: statutoryCompliance?.statutoryBonus,
      basicPlusDA: sumBasicPlusDA(earningsBreakdown),
      employeeState: state,
      employeeEmploymentCategory: employeeStatutoryInfo?.employmentCategory,
      paidDays: presentDays,
      totalDays: workingDays,
    });

    // 6. Other Deductions from Salary Components (with component overrides)
    const deductionsSalaryBases = { baseSalary: resolvedBaseFinal, grossSalary, ctc: grossSalary * 12 };
    const deductionsComponent = salaryComponents.find((c) => c.category === 'deductions');
    if (deductionsComponent?.components) {
      deductionsComponent.components.forEach((component) => {
        if (component.status !== 'active') return;

        const override = findComponentOverride(overrides, 'deductions', component);
        const defaultAmount = calculateComponentAmount(
          component,
          deductionsSalaryBases,
          null
        );
        const amount = resolvePayrollComponentAmount(
          'deductions',
          component,
          deductionsSalaryBases,
          overrides
        );
        const { monthlyAmount } = getFrequencyDisplayAmounts(component, amount, null);
        const isOverridden = hasExplicitOverrideAmount(override);

        if (shouldIncludeComponentInBreakdown(amount, override)) {
          if (amount > 0) {
            totalDeductions += monthlyAmount;
          }
          deductionsBreakdown.push({
            name: component.name,
            code: component.code || '',
            amount: Math.round(monthlyAmount),
            defaultAmount: Math.round(defaultAmount),
            type: 'custom',
            rate: component.value,
            frequency: normalizeComponentFrequency(component.frequency),
            isOverridden,
            disabled: Boolean(override?.disabled),
          });
        }
      });
    }

    // ========== BENEFITS CALCULATION (with component overrides) ==========
    const benefitsBreakdown = [];
    let totalBenefits = 0;
    const benefitsSalaryBases = { baseSalary: resolvedBaseFinal, grossSalary, ctc: grossSalary * 12 };

    const benefitsComponent = salaryComponents.find((c) => c.category === 'benefits');
    if (benefitsComponent?.components) {
      benefitsComponent.components.forEach((component) => {
        if (component.status !== 'active') return;

        const override = findComponentOverride(overrides, 'benefits', component);
        const defaultAmount = calculateComponentAmount(
          component,
          benefitsSalaryBases,
          null
        );
        const amount = resolvePayrollComponentAmount(
          'benefits',
          component,
          benefitsSalaryBases,
          overrides
        );
        const { monthlyAmount, annualAmount } = getFrequencyDisplayAmounts(component, amount, null);
        const isOverridden = hasExplicitOverrideAmount(override);

        if (shouldIncludeComponentInBreakdown(amount, override)) {
          if (amount > 0) {
            totalBenefits += monthlyAmount;
          }
          benefitsBreakdown.push({
            name: component.name,
            code: component.code || '',
            type: component.calculationType,
            value: component.value,
            basedOn: component.basedOn || 'none',
            frequency: normalizeComponentFrequency(component.frequency),
            paymentMonth: component.paymentMonth || '',
            defaultAmount: Math.round(defaultAmount),
            calculatedAmount: Math.round(monthlyAmount),
            annualAmount: Math.round(annualAmount),
            isOverridden,
            disabled: Boolean(override?.disabled),
            taxable: component.taxable !== false,
          });
        }
      });
    }
    
    // ========== NET PAY & CTC CALCULATION ==========
    // PT / LWF may be due only in some months, so report the regular month's
    // take-home and list the months that differ instead of a single figure.
    const netPaySchedule = buildNetPaySchedule({
      grossSalary,
      baseDeductions: totalDeductions - cyclicalStatutoryDeductions,
      ptConfig: statutoryCompliance?.professionalTax,
      lwfConfig: statutoryCompliance?.labourWelfareFund,
      employeeState: state,
      employeeStatutoryInfo,
    });
    const netPay = netPaySchedule.regular;
    const regularMonthDeductions = netPaySchedule.regularDeductions;

    // Tell the UI which months a statutory row actually applies to
    const annotateStatutoryRow = (name, months) => {
      const row = deductionsBreakdown.find((r) => r.name === name);
      if (!row) return;
      row.months = months;
      row.recurring = months.length === PAYROLL_MONTHS.length;
    };
    annotateStatutoryRow('Professional Tax', netPaySchedule.ptMonths);
    annotateStatutoryRow('Labour Welfare Fund', netPaySchedule.lwfMonths);
    // ESI employer is included in CTC only when the org toggle is ON
    const esiEmployerInCtc = esiBreakdown.includeEmployerInCtc ? esiEmployer : 0;
    const employerContributions =
      epfEmployer + epfEdli + epfAdmin + esiEmployerInCtc;
    // LWF runs on its own cycle (yearly / half-yearly), so annualize it instead of × 12
    const lwfDeductionsPerYear = resolveLwfDeductionsPerYear(
      lwfBreakdown,
      statutoryCompliance?.labourWelfareFund
    );
    const annualLwfEmployer = (lwfBreakdown.employerShare || 0) * lwfDeductionsPerYear;
    // Annualized statutory bonus added to annual CTC (paid once a year in paymentMonth)
    const annualBonusForCtc = bonusBreakdown.details?.annualEquivalent || 0;
    const nonMonthlyComponentAnnual =
      earningsBreakdown.reduce((sum, item) => sum + (Number(item.annualAmount) || 0), 0) -
      earningsBreakdown.reduce((sum, item) => sum + (Number(item.calculatedAmount) || 0) * 12, 0) +
      benefitsBreakdown.reduce((sum, item) => sum + (Number(item.annualAmount) || 0), 0) -
      benefitsBreakdown.reduce((sum, item) => sum + (Number(item.calculatedAmount) || 0) * 12, 0);
    const monthlyCTC = grossSalary + totalBenefits + employerContributions;
    const annualCTC =
      monthlyCTC * 12 +
      annualLwfEmployer +
      annualBonusForCtc +
      Math.max(0, nonMonthlyComponentAnnual);
    
    const calculatedPayroll = {
      baseSalary: resolvedBaseFinal,
      grossSalary: Math.round(grossSalary),
      totalDeductions: regularMonthDeductions,
      netPay: Math.round(netPay),
      ctc: Math.round(annualCTC),
      paymentFrequency: 'Monthly',
      currency: 'INR',
      taxRegime: 'New',
      variablePay: 0,
      incentives: 0,
      salaryEffectiveFrom: new Date()
    };

    return sendResponse(res, 200, true, 'Payroll info calculated successfully', {
      inputMode,
      // Do not return sticky Basic — UI/persistence use org formula for Basic
      componentOverrides: stripBasicFromOverrides(overrides),
      payrollInfo: calculatedPayroll,
      breakdown: {
        earnings: {
          baseSalary: resolvedBaseFinal,
          components: earningsBreakdown,
          totalAdditional: Math.round(totalEarnings - resolvedBaseFinal),
          grossSalary: Math.round(grossSalary)
        },
        deductions: {
          statutory: {
            epf: {
              employee: epfEmployee,
              employer: epfEmployer,
              edli: epfEdli,
              adminCharges: epfAdmin,
              wage: epfBreakdown.epfWage,
              abryApplied: epfBreakdown.abryApplied,
            },
            esi: { employee: esiEmployee, employer: esiEmployer },
            professionalTax: professionalTax,
            lwf: {
              employee: lwfBreakdown.employeeShare,
              employer: lwfBreakdown.employerShare,
              state: lwfBreakdown.details?.stateUsed || '',
              cycle: lwfBreakdown.details?.cycle || '',
              months: lwfBreakdown.details?.months || [],
              deductionsPerYear: lwfDeductionsPerYear,
              annualEmployer: Math.round(annualLwfEmployer),
            },
          },
          components: deductionsBreakdown,
          totalDeductions: regularMonthDeductions,
          // Total when every cyclical deduction falls in the same month
          totalDeductionsPeakMonth: Math.round(totalDeductions),
        },
        benefits: {
          components: benefitsBreakdown,
          totalBenefits: Math.round(totalBenefits),
          totalBenefitsAnnual: Math.round(
            benefitsBreakdown.reduce((sum, item) => sum + (Number(item.annualAmount) || 0), 0)
          ),
        },
        statutoryBonus: {
          applicable: bonusBreakdown.applicable,
          monthlyEquivalent: bonusBreakdown.details?.monthlyEquivalent || 0,
          annualEquivalent: bonusBreakdown.details?.annualEquivalent || 0,
          paidInMonth: bonusBreakdown.details?.paymentMonth || '',
          calcBase: bonusBreakdown.details?.calcBase || 0,
          percentage: bonusBreakdown.details?.percentage || 0,
        },
        summary: {
          grossSalary: Math.round(grossSalary),
          totalBenefits: Math.round(totalBenefits),
          totalDeductions: regularMonthDeductions,
          netPay: Math.round(netPay),
          netPaySchedule,
          monthlyCTC: Math.round(monthlyCTC),
          annualCTC: Math.round(annualCTC),
          employerContributions: Math.round(employerContributions),
          annualLwfEmployer: Math.round(annualLwfEmployer),
          takeHomePercentage: Math.round((netPay / grossSalary) * 100)
        }
      }
    });

  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Salary structure preview with org defaults + employee overrides
 * GET /payroll/employee/:employeeId/salary-structure-preview
 */
exports.getSalaryStructurePreview = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { baseSalary, grossSalary, ctc } = req.query;
    const { EmployeeModel, SalaryCompensationModel } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId).select(
      'firstName lastName email payrollInfo'
    );
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });
    const overrides = employee.payrollInfo?.componentOverrides || [];

    const baseInput =
      Number(baseSalary) || Number(employee.payrollInfo?.baseSalary) || Number(employee.baseSalary) || 0;
    const grossInput =
      Number(grossSalary) || Number(employee.payrollInfo?.grossSalary) || Number(employee.grossSalary) || 0;

    const resolvedSalary = resolveSalaryBasesFromInput({
      baseSalary: baseInput,
      grossSalary: grossInput,
      salaryComponents,
      overrides,
    });

    if (!resolvedSalary) {
      return sendResponse(
        res,
        400,
        false,
        'baseSalary or grossSalary is required (query or employee payrollInfo)'
      );
    }

    const resolvedBase = resolvedSalary.baseSalary;
    const resolvedCtc =
      Number(ctc) || Number(employee.payrollInfo?.ctc) || Number(employee.ctc) || grossInput * 12 || resolvedBase * 12;

    const structure = buildSalaryStructurePreview(
      salaryComponents,
      {
        baseSalary: resolvedBase,
        grossSalary: grossInput || undefined,
        ctc: resolvedCtc,
      },
      overrides
    );

    let previewEarnings = [...structure.earnings];
    if (resolvedSalary.inputMode === 'gross' && resolvedSalary.targetGross !== null) {
      const balancingLine = buildBalancingAllowanceLine(
        resolvedSalary.targetGross - structure.totals.grossSalaryMonthly
      );
      if (balancingLine) {
        previewEarnings.push({
          category: 'earnings',
          name: balancingLine.name,
          code: balancingLine.code,
          calculationType: balancingLine.type,
          basedOn: balancingLine.basedOn,
          orgValue: balancingLine.value,
          defaultMonthlyAmount: balancingLine.defaultAmount,
          overrideAmount: null,
          monthlyAmount: balancingLine.calculatedAmount,
          annualAmount: balancingLine.annualAmount,
          isOverridden: false,
          disabled: false,
          isBalancing: true,
        });
      }
    }

    const resolvedGrossMonthly =
      resolvedSalary.inputMode === 'gross' && resolvedSalary.targetGross !== null
        ? resolvedSalary.targetGross
        : structure.totals.grossSalaryMonthly;

    return sendResponse(res, 200, true, 'Salary structure preview fetched successfully', {
      inputMode: resolvedSalary.inputMode,
      employee: {
        id: employee._id,
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        email: employee.email,
      },
      salaryBases: {
        baseSalary: resolvedBase,
        grossSalary: resolvedGrossMonthly,
        ctc: resolvedCtc,
      },
      componentOverrides: overrides,
      earnings: previewEarnings,
      deductions: structure.deductions,
      benefits: structure.benefits,
      reimbursements: structure.reimbursements,
      totals: {
        ...structure.totals,
        grossSalaryMonthly: resolvedGrossMonthly,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Save per-employee component overrides (e.g. Ravi bonus 100 instead of org 1000)
 * PUT /payroll/employee/:employeeId/component-overrides
 */
exports.saveEmployeeComponentOverrides = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { componentOverrides, payrollInfo } = req.body;
    const { EmployeeModel } = await initModels(org_uuid);

    if (!Array.isArray(componentOverrides)) {
      return sendResponse(res, 400, false, 'componentOverrides array is required');
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const normalizedOverrides = stripBasicFromOverrides(componentOverrides);
    const currentPayroll =
      employee.payrollInfo?.toObject?.() || employee.payrollInfo || {};

    employee.payrollInfo = {
      ...currentPayroll,
      ...(payrollInfo && typeof payrollInfo === 'object' ? payrollInfo : {}),
      componentOverrides: normalizedOverrides,
    };

    await employee.save();

    const { SalaryCompensationModel } = await initModels(org_uuid);
    const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });
    const structure = buildSalaryStructurePreview(
      salaryComponents,
      {
        baseSalary: employee.payrollInfo.baseSalary || 0,
        grossSalary: employee.payrollInfo.grossSalary || 0,
        ctc: employee.payrollInfo.ctc || 0,
      },
      normalizedOverrides
    );

    return sendResponse(res, 200, true, 'Employee component overrides saved successfully', {
      employeeId: employee._id,
      componentOverrides: normalizedOverrides,
      payrollInfo: employee.payrollInfo,
      preview: structure,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Employee's Payroll Information
 * Route: GET /api/payroll/employee/:employeeId/payrollInfo
 */
exports.getEmployeePayrollInfo = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { EmployeeModel } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId).select(
      'firstName lastName email payrollInfo payrollPreferences taxInfo bankInfo statutoryInfo'
    );

    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    return sendResponse(res, 200, true, 'Payroll information fetched successfully', {
      employee: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      },
      payrollInfo: employee.payrollInfo || {},
      payrollPreferences: employee.payrollPreferences || {},
      taxInfo: employee.taxInfo || {},
      bankInfo: employee.bankInfo || {},
      statutoryInfo: employee.statutoryInfo || {}
    });

  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Update Employee's Payroll Information
 * Route: PUT /api/payroll/employee/:employeeId/payrollInfo
 * Body: { payrollInfo: {...}, payrollPreferences: {...}, taxInfo: {...} }
 */
exports.updateEmployeePayrollInfo = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { payrollInfo, payrollPreferences, taxInfo, bankInfo, statutoryInfo } = req.body;

    const { EmployeeModel } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const updateData = {};

    // Merge payroll info
    if (payrollInfo) {
      const mergedPayrollInfo = { ...(employee.payrollInfo?.toObject?.() || employee.payrollInfo || {}), ...payrollInfo };
      if (payrollInfo.componentOverrides) {
        mergedPayrollInfo.componentOverrides = normalizeOverrides(payrollInfo.componentOverrides);
      }
      updateData.payrollInfo = mergedPayrollInfo;
    }

    if (payrollPreferences) {
      updateData.payrollPreferences = { ...employee.payrollPreferences, ...payrollPreferences };
    }

    if (taxInfo) {
      updateData.taxInfo = { ...employee.taxInfo, ...taxInfo };
    }

    if (bankInfo) {
      updateData.bankInfo = { ...employee.bankInfo, ...bankInfo };
    }

    if (statutoryInfo) {
      updateData.statutoryInfo = { ...employee.statutoryInfo, ...statutoryInfo };
    }

    const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
      employeeId,
      { $set: updateData },
      { new: true }
    ).select('firstName lastName email payrollInfo payrollPreferences taxInfo bankInfo statutoryInfo');

    return sendResponse(res, 200, true, 'Payroll information updated successfully', {
      employee: {
        id: updatedEmployee._id,
        name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
        email: updatedEmployee.email
      },
      payrollInfo: updatedEmployee.payrollInfo || {},
      payrollPreferences: updatedEmployee.payrollPreferences || {},
      taxInfo: updatedEmployee.taxInfo || {},
      bankInfo: updatedEmployee.bankInfo || {},
      statutoryInfo: updatedEmployee.statutoryInfo || {}
    });

  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Get Organization's Salary Components/Rules
 * Route: GET /api/payroll/salaryComponents
 */
exports.getSalaryComponents = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { SalaryCompensationModel } = await initModels(org_uuid);
    
    const components = await SalaryCompensationModel.find({ 
      organizationId: org_uuid 
    }).sort({ category: 1 });

    const categorized = {
      earnings: [],
      deductions: [],
      benefits: [],
      reimbursements: []
    };

    components.forEach(comp => {
      if (categorized[comp.category]) {
        categorized[comp.category] = comp.components || [];
      }
    });

    return sendResponse(res, 200, true, 'Salary components fetched successfully', {
      components: categorized,
      summary: {
        totalEarnings: categorized.earnings.filter(c => c.status === 'active').length,
        totalDeductions: categorized.deductions.filter(c => c.status === 'active').length,
        totalBenefits: categorized.benefits.filter(c => c.status === 'active').length,
        totalReimbursements: categorized.reimbursements.filter(c => c.status === 'active').length
      }
    });

  } catch (err) {
    return handleError(res, err);
  }
};


/**
 * Bulk Update Payroll Info for Multiple Employees
 * Route: POST /api/payroll/bulkUpdatePayrollInfo
 * Body: { employees: [{ employeeId, baseSalary, state }] }
 */
exports.bulkUpdatePayrollInfo = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employees } = req.body;
    
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return sendResponse(res, 400, false, 'Employees array is required');
    }

    const { EmployeeModel, SalaryCompensationModel, StatutoryComplianceModel } = await initModels(org_uuid);
    
    // Fetch organization settings once for all employees
    const salaryComponents = await SalaryCompensationModel.find({ 
      organizationId: org_uuid 
    });
    
    const statutoryCompliance = await StatutoryComplianceModel.findOne({ 
      organizationId: org_uuid 
    });
    
    const results = [];
    const errors = [];

    for (const emp of employees) {
      try {
        const { employeeId, baseSalary, state } = emp;
        
        if (!employeeId || !baseSalary) {
          errors.push({ employeeId, error: 'employeeId and baseSalary are required' });
          continue;
        }

        const employee = await EmployeeModel.findById(employeeId);
        if (!employee) {
          errors.push({ employeeId, error: 'Employee not found' });
          continue;
        }

        // Calculate gross salary from earnings components
        let totalEarnings = baseSalary;
        const earningsComponent = salaryComponents.find(c => c.category === 'earnings');
        if (earningsComponent && earningsComponent.components) {
          earningsComponent.components.forEach(component => {
            if (component.status === 'active') {
              let amount = 0;
              
              if (component.calculationType === 'percentage' && component.basedOn === 'basic') {
                amount = (baseSalary * component.value) / 100;
              } else if (component.calculationType === 'fixed') {
                amount = component.value || 0;
              }
              
              // Apply max limit
              if (component.maxLimit > 0 && amount > component.maxLimit) {
                amount = component.maxLimit;
              }
              
              totalEarnings += amount;
            }
          });
        }
        
        const grossSalary = totalEarnings;
        
        // Calculate statutory deductions
        let totalDeductions = 0;
        
        // EPF (centralized — honors EDLI, Admin Charges, ABRY, override, etc.)
        const epfBreakdownBulk = calculateEpf({
          epfConfig: statutoryCompliance?.epf,
          baseSalary,
          epfApplicableWage: baseSalary, // bulk endpoint — no per-component flags here
          employeeStatutoryInfo: employee.statutoryInfo,
        });
        if (epfBreakdownBulk.applicable) {
          totalDeductions += epfBreakdownBulk.employeeContribution;
        }
        
        // ESI (centralized)
        const esiBreakdownBulk = calculateEsi({
          esiConfig: statutoryCompliance?.esi,
          grossSalary,
          esiApplicableWage: grossSalary, // bulk endpoint — no per-component flags
          employeeStatutoryInfo: employee.statutoryInfo,
        });
        if (esiBreakdownBulk.applicable) {
          totalDeductions += esiBreakdownBulk.employeeContribution;
        }
        
        // Professional Tax (centralized — uses provided state, else employee.statutoryInfo.ptState)
        const ptBreakdownBulk = calculateProfessionalTax({
          ptConfig: statutoryCompliance?.professionalTax,
          grossSalary,
          employeeState: state,
          employeeStatutoryInfo: employee.statutoryInfo,
        });
        if (ptBreakdownBulk.applicable) {
          totalDeductions += ptBreakdownBulk.amount;
        }
        
        // Other deductions from salary components
        const deductionsComponent = salaryComponents.find(c => c.category === 'deductions');
        if (deductionsComponent?.components) {
          deductionsComponent.components.forEach(component => {
            if (component.status === 'active') {
              let amount = 0;
              
              if (component.calculationType === 'percentage') {
                if (component.basedOn === 'gross') {
                  amount = (grossSalary * component.value) / 100;
                } else if (component.basedOn === 'basic') {
                  amount = (baseSalary * component.value) / 100;
                }
              } else if (component.calculationType === 'fixed') {
                amount = component.value || 0;
              }
              
              totalDeductions += amount;
            }
          });
        }
        
        const netPay = grossSalary - totalDeductions;
        const ctc = grossSalary * 12;

        const payrollInfo = {
          baseSalary: baseSalary,
          grossSalary: Math.round(grossSalary),
          totalDeductions: Math.round(totalDeductions),
          netPay: Math.round(netPay),
          ctc: Math.round(ctc),
          salaryEffectiveFrom: new Date()
        };

        await EmployeeModel.findByIdAndUpdate(
          employeeId,
          { $set: { payrollInfo: { ...employee.payrollInfo, ...payrollInfo } } }
        );

        results.push({
          employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          status: 'success',
          payrollInfo
        });

      } catch (error) {
        errors.push({ employeeId: emp.employeeId, error: error.message });
      }
    }

    return sendResponse(res, 200, true, 'Bulk update completed', {
      total: employees.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (err) {
    return handleError(res, err);
  }
};

exports.getMySalaryPdfdownload = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    const employeeId = req.empId || req.userId; // 🔥 from auth middleware
    const { payrollId } = req.params;

    if (!org_uuid || !employeeId || !payrollId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { PayrollRunModel, OrganizationModel } = await initModels(org_uuid);

    // 🔐 Only own payslip access
    const payroll = await PayrollRunModel.findOne({
      _id: payrollId,
      organizationId: org_uuid,
      employeeId: employeeId,
    }).populate({
      path: 'employeeId',
      select:
        `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation departmentId jobTitle nationalID.pan bankInfo.bankName bankInfo.bankAccountNumber`,
      populate: { path: 'departmentId', select: 'name' },
    });

    if (!payroll || !payroll.employeeId) {
      return sendResponse(res, 404, false, 'Payslip not found');
    }

    const organization = await OrganizationModel.findById(org_uuid);
  console.log(organization,1234)
  console.log(organization.logo)
    // 📦 Same format as generatePayslip
    const payslip = {
      organization: {
        name: organization?.organizationName || 'Organization Name',
        address: organization?.organizationAddress || '',
        logo: organization?.logo || '',
      },
      employee: {
        name: `${payroll.employeeId.firstName || ''} ${payroll.employeeId.lastName || ''}`.trim(),
        code: resolveEmployeeDisplayCode(payroll.employeeId, 'N/A'),
        email: payroll.employeeId.email || '',
        department:
          payroll.employeeId?.departmentId?.name ||
          payroll.employeeId.payrollInfo?.department ||
          'N/A',
        designation:
          payroll.employeeId.payrollInfo?.designation ||
          payroll.employeeId.jobTitle ||
          '',
        pan: payroll.employeeId.nationalID?.pan || 'N/A',
        bankName: payroll.employeeId.bankInfo?.bankName || 'N/A',
        bankAccountNumber:
          payroll.employeeId.bankInfo?.bankAccountNumber || 'N/A',
      },
      payPeriod: {
        month: payroll.month || '',
        year: payroll.year || '',
      },
      earnings: mergePayslipEarningsColumn(
        payroll.earnings,
        payroll.benefits,
        payroll.reimbursements
      ),
      deductions: payroll.deductions || [],
      benefits: payroll.benefits || [],
      reimbursements: payroll.reimbursements || [],
      summary: {
        grossEarnings: payroll.grossEarnings ?? 0,
        totalDeductions: payroll.totalDeductions ?? 0,
        netPay: payroll.netPay ?? 0,
      },
    };

    const empId = payroll.employeeId?._id || payroll.employeeId || employeeId;
    const attendanceDays = await getPayslipAttendanceDays(
      org_uuid,
      empId,
      payroll.month,
      payroll.year,
      payroll
    );

    // PDF — Paid Days from payroll run (standard: Calendar Days − LOP)
    const pdfBuf = await buildSalarySlipPdfBuffer({
      organizationName: payslip.organization.name,
      organizationAddress: payslip.organization.address,
      organizationLogo: payslip.organization.logo, // ✅ add this
      employeeName: payslip.employee.name,
      employeeCode: payslip.employee.code,
      department: payslip.employee.department,
      pan: payslip.employee.pan,
      bankName: payslip.employee.bankName,
      bankAccountNumber: payslip.employee.bankAccountNumber,
      payPeriodLabel: `${payslip.payPeriod.month} ${payslip.payPeriod.year}`,
      earnings: payroll.earnings || [],
      benefits: payroll.benefits || [],
      reimbursements: payroll.reimbursements || [],
      deductions: payslip.deductions,
      grossEarnings: payslip.summary.grossEarnings,
      totalDeductions: payslip.summary.totalDeductions,
      netPay: payslip.summary.netPay,
      payStatus: payroll.payStatus || 'pending',
      workingDays: attendanceDays.workingDays,
      paidDays: attendanceDays.paidDays,
    });

    // 📄 Filename safe
    const safeCode = String(payslip.employee.code).replace(/[^\w.-]+/g, '_');
    const safeMonth = String(payslip.payPeriod.month).replace(/[^\w.-]+/g, '_');

    const filename = `Payslip_${safeCode}_${safeMonth}_${payslip.payPeriod.year}.pdf`;

    // 📥 Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(pdfBuf);
  } catch (err) {
    console.error('Employee Payslip PDF Error:', err);
    return handleError(res, err);
  }
};


