const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TAX_NAME_RE = /tds|tax|pt\b|professional\s*tax|income\s*tax/i;
const DONATION_NAME_RE = /donation|charity|csr/i;

function normalizeMonthValue(month = '') {
  const raw = String(month).trim();
  if (!raw) return null;

  const shortIdx = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return MONTHS_SHORT[shortIdx];

  const fullIdx = MONTHS_FULL.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (fullIdx !== -1) return MONTHS_SHORT[fullIdx];

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return MONTHS_SHORT[numeric - 1];
  }

  return null;
}

function roundCurrency(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function requireOrg(req, res) {
  const org_uuid = req.headers.org_uuid;
  if (!org_uuid) {
    sendResponse(res, 400, false, 'Organization UUID missing');
    return null;
  }
  return org_uuid;
}

function resolvePeriod(query = {}) {
  const now = new Date();
  const month = normalizeMonthValue(query.month) || MONTHS_SHORT[now.getMonth()];
  const year = query.year ? parseInt(query.year, 10) : now.getFullYear();

  if (!Number.isInteger(year)) {
    return { error: 'Invalid year' };
  }

  return { month, year, monthIndex: MONTHS_SHORT.indexOf(month) };
}

/**
 * Indian FY Apr–Mar for a given calendar month/year.
 * e.g. Mar 2026 → FY 2025-26 (Apr 2025 … Mar 2026)
 */
function buildFinancialYearPeriods(month, year) {
  const monthIndex = MONTHS_SHORT.indexOf(month);
  const fyStartYear = monthIndex >= 3 ? year : year - 1;

  const periods = [];
  for (let i = 0; i < 12; i++) {
    const abs = 3 + i; // Apr = 3
    const mIdx = abs % 12;
    const y = fyStartYear + Math.floor(abs / 12);
    periods.push({
      month: MONTHS_SHORT[mIdx],
      year: y,
      label: `${MONTHS_SHORT[mIdx]} ${y}`,
      sortKey: y * 100 + (mIdx + 1),
    });
  }

  return {
    financialYear: `${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
    periods,
  };
}

function classifyDeductionLine(line = {}) {
  const name = String(line.componentName || '').trim() || 'Other';
  const amount = Number(line.amount) || 0;
  if (DONATION_NAME_RE.test(name)) return { type: 'donation', name, amount };
  if (TAX_NAME_RE.test(name)) return { type: 'tax', name, amount };
  return { type: 'deduction', name, amount };
}

function summarizePayrollDoc(payroll = {}) {
  let taxes = 0;
  let donations = 0;
  let otherDeductions = 0;
  const deductionMap = {};

  (payroll.deductions || []).forEach((line) => {
    const classified = classifyDeductionLine(line);
    if (classified.type === 'tax') taxes += classified.amount;
    else if (classified.type === 'donation') donations += classified.amount;
    else otherDeductions += classified.amount;

    const key = classified.name;
    deductionMap[key] = (deductionMap[key] || 0) + classified.amount;
  });

  const benefits = (payroll.benefits || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const reimbursements = (payroll.reimbursements || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const employerTaxes = roundCurrency(
    (payroll.employerContributions?.epf || 0) +
      (payroll.employerContributions?.edli || 0) +
      (payroll.employerContributions?.adminCharges || 0) +
      (payroll.employerContributions?.esi || 0) +
      (payroll.employerContributions?.lwf || 0)
  );
  const employerTotal = roundCurrency(
    payroll.employerContributions?.total || employerTaxes
  );
  const grossPay = roundCurrency(payroll.grossEarnings || 0);
  const netPay = roundCurrency(payroll.netPay || 0);
  const totalDeductions = roundCurrency(payroll.totalDeductions || taxes + donations + otherDeductions);

  return {
    grossPay,
    netPay,
    taxes: roundCurrency(taxes),
    donations: roundCurrency(donations),
    deductions: roundCurrency(otherDeductions || Math.max(0, totalDeductions - taxes - donations)),
    totalDeductions,
    benefits: roundCurrency(benefits),
    reimbursements: roundCurrency(reimbursements),
    employerTaxes,
    employerBenefits: 0,
    employerTotal,
    totalEmployerCost: roundCurrency(grossPay + employerTotal),
    deductionMap,
    payStatus: payroll.payStatus || 'pending',
    employeeId: payroll.employeeId,
  };
}

async function loadPeriodPayrolls(PayrollRunModel, org_uuid, month, year) {
  return PayrollRunModel.find({
    organizationId: org_uuid,
    month,
    year,
  })
    .populate({
      path: 'employeeId',
      select: 'firstName lastName departmentId payrollInfo.department',
      populate: { path: 'departmentId', select: 'name' },
    })
    .lean();
}

async function loadFyPayrolls(PayrollRunModel, org_uuid, periods) {
  const orFilter = periods.map((p) => ({ month: p.month, year: p.year }));
  return PayrollRunModel.find({
    organizationId: org_uuid,
    $or: orFilter,
  }).lean();
}

function buildSummary(payrolls, activeEmployees) {
  let totalGrossPay = 0;
  let totalNetPay = 0;
  let taxesWithheld = 0;

  payrolls.forEach((p) => {
    const row = summarizePayrollDoc(p);
    totalGrossPay += row.grossPay;
    totalNetPay += row.netPay;
    taxesWithheld += row.taxes;
  });

  return {
    totalGrossPay: roundCurrency(totalGrossPay),
    totalNetPay: roundCurrency(totalNetPay),
    taxesWithheld: roundCurrency(taxesWithheld),
    activeEmployees,
  };
}

function buildCostSummary(payrolls, periods) {
  const byKey = {};
  periods.forEach((p) => {
    byKey[`${p.month}-${p.year}`] = {
      month: p.month,
      year: p.year,
      label: p.label,
      netPay: 0,
      taxes: 0,
      benefits: 0,
      donations: 0,
      deductions: 0,
    };
  });

  payrolls.forEach((p) => {
    const key = `${p.month}-${p.year}`;
    if (!byKey[key]) return;
    const row = summarizePayrollDoc(p);
    byKey[key].netPay += row.netPay;
    byKey[key].taxes += row.taxes;
    byKey[key].benefits += row.benefits;
    byKey[key].donations += row.donations;
    byKey[key].deductions += row.deductions;
  });

  return periods.map((p) => {
    const row = byKey[`${p.month}-${p.year}`];
    return {
      month: row.month,
      year: row.year,
      label: row.label,
      netPay: roundCurrency(row.netPay),
      taxes: roundCurrency(row.taxes),
      benefits: roundCurrency(row.benefits),
      donations: roundCurrency(row.donations),
      deductions: roundCurrency(row.deductions),
      total: roundCurrency(row.netPay + row.taxes + row.benefits + row.donations + row.deductions),
    };
  });
}

function buildDeductionBreakdown(payrolls) {
  const map = {};
  let total = 0;

  payrolls.forEach((p) => {
    (p.deductions || []).forEach((line) => {
      const name = String(line.componentName || '').trim() || 'Other';
      const amount = Number(line.amount) || 0;
      map[name] = (map[name] || 0) + amount;
      total += amount;
    });
  });

  const items = Object.entries(map)
    .map(([name, amount]) => ({
      name,
      amount: roundCurrency(amount),
      percentage: total > 0 ? roundCurrency((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total: roundCurrency(total),
    items,
  };
}

function buildDepartmentPayroll(payrolls) {
  const map = {};

  payrolls.forEach((p) => {
    const emp = p.employeeId || {};
    const dept =
      emp.departmentId?.name ||
      emp.payrollInfo?.department ||
      'Others';
    if (!map[dept]) {
      map[dept] = { department: dept, grossPay: 0, netPay: 0, employeeCount: 0 };
    }
    const row = summarizePayrollDoc(p);
    map[dept].grossPay += row.grossPay;
    map[dept].netPay += row.netPay;
    map[dept].employeeCount += 1;
  });

  return Object.values(map)
    .map((d) => ({
      department: d.department,
      grossPay: roundCurrency(d.grossPay),
      netPay: roundCurrency(d.netPay),
      employeeCount: d.employeeCount,
    }))
    .sort((a, b) => b.netPay - a.netPay);
}

function buildEmployerCost(payrolls) {
  let grossPay = 0;
  let employerTaxes = 0;
  let benefits = 0;
  let totalCost = 0;

  payrolls.forEach((p) => {
    const row = summarizePayrollDoc(p);
    grossPay += row.grossPay;
    employerTaxes += row.employerTaxes;
    benefits += row.benefits;
    totalCost += row.totalEmployerCost;
  });

  return [
    { label: 'Gross Pay', amount: roundCurrency(grossPay) },
    { label: 'Employer Taxes', amount: roundCurrency(employerTaxes) },
    { label: 'Benefits', amount: roundCurrency(benefits) },
    { label: 'Total Cost', amount: roundCurrency(totalCost) },
  ];
}

function buildCtcAnalysis(payrolls, periods) {
  const byKey = {};
  periods.forEach((p) => {
    byKey[`${p.month}-${p.year}`] = {
      month: p.month,
      year: p.year,
      label: p.label,
      grossPay: 0,
      employerCost: 0,
      netPay: 0,
      totalCtc: 0,
    };
  });

  payrolls.forEach((p) => {
    const key = `${p.month}-${p.year}`;
    if (!byKey[key]) return;
    const row = summarizePayrollDoc(p);
    byKey[key].grossPay += row.grossPay;
    byKey[key].employerCost += row.employerTotal;
    byKey[key].netPay += row.netPay;
    byKey[key].totalCtc += row.totalEmployerCost;
  });

  return periods.map((p) => {
    const row = byKey[`${p.month}-${p.year}`];
    return {
      month: row.month,
      year: row.year,
      label: row.label,
      grossPay: roundCurrency(row.grossPay),
      employerCost: roundCurrency(row.employerCost),
      netPay: roundCurrency(row.netPay),
      totalCtc: roundCurrency(row.totalCtc),
    };
  });
}

async function buildRequestsForPeriod(models, org_uuid, month, year) {
  const { PayrollRunModel, FullAndFinalModel, EmployeeModel } = models;

  const [
    activeEmployees,
    payrollEmployeeIds,
    pendingRuns,
    pendingForFnf,
    salaryOnHold,
    pendingForPayment,
    avatars,
  ] = await Promise.all([
    EmployeeModel.countDocuments({ status: 'Active' }),
    PayrollRunModel.distinct('employeeId', {
      organizationId: org_uuid,
      month,
      year,
    }),
    PayrollRunModel.countDocuments({
      organizationId: org_uuid,
      month,
      year,
      payStatus: 'pending',
    }),
    FullAndFinalModel.countDocuments({
      organizationId: org_uuid,
      status: { $in: ['initiated', 'pending'] },
    }),
    PayrollRunModel.countDocuments({
      organizationId: org_uuid,
      month,
      year,
      payStatus: 'on_hold',
    }),
    PayrollRunModel.countDocuments({
      organizationId: org_uuid,
      month,
      year,
      payStatus: { $in: ['processed', 'approved'] },
    }),
    EmployeeModel.find({ status: 'Active' })
      .select('firstName lastName profileImage photo')
      .limit(8)
      .lean(),
  ]);

  const pendingForPayroll = Math.max(
    pendingRuns,
    Math.max(0, activeEmployees - (payrollEmployeeIds?.length || 0))
  );

  return {
    pendingForPayroll,
    pendingForFnf,
    salaryOnHold,
    pendingForPayment,
    avatars: avatars.map((e) => ({
      employeeId: e._id,
      name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
      avatar: e.profileImage || e.photo || null,
    })),
  };
}

async function buildApprovals(models, org_uuid, userEmpId) {
  const { ClaimsDeclarationModel, SalaryRevisionModel, ArrearsModel } = models;

  const [pendingReimbursements, pendingRevisions, pendingArrears] = await Promise.all([
    ClaimsDeclarationModel.aggregate([
      { $match: { organizationId: org_uuid } },
      { $unwind: '$reimbursements' },
      { $match: { 'reimbursements.status': 'pending' } },
      { $count: 'count' },
    ]),
    SalaryRevisionModel.countDocuments({
      organizationId: org_uuid,
      status: 'pending',
    }),
    ArrearsModel.countDocuments({
      organizationId: org_uuid,
      status: { $in: ['calculated', 'approved'] },
    }),
  ]);

  const reimbursement = pendingReimbursements[0]?.count || 0;
  const approvalsPendingOnMe = pendingRevisions + pendingArrears + reimbursement;

  return {
    approvalsPendingOnMe: userEmpId ? approvalsPendingOnMe : approvalsPendingOnMe,
    reimbursement,
    pendingRevisions,
    pendingArrears,
  };
}

async function getDashboardBundle(org_uuid, month, year, empId) {
  const models = await initModels(org_uuid);
  const {
    EmployeeModel,
    PayrollRunModel,
  } = models;

  const { financialYear, periods } = buildFinancialYearPeriods(month, year);

  const [activeEmployees, periodPayrolls, fyPayrolls, requests, approvals] = await Promise.all([
    EmployeeModel.countDocuments({ status: 'Active' }),
    loadPeriodPayrolls(PayrollRunModel, org_uuid, month, year),
    loadFyPayrolls(PayrollRunModel, org_uuid, periods),
    buildRequestsForPeriod(models, org_uuid, month, year),
    buildApprovals(models, org_uuid, empId),
  ]);

  return {
    period: {
      month,
      monthFull: MONTHS_FULL[MONTHS_SHORT.indexOf(month)],
      year,
      financialYear,
    },
    summary: buildSummary(periodPayrolls, activeEmployees),
    costSummary: buildCostSummary(fyPayrolls, periods),
    deductionBreakdown: buildDeductionBreakdown(periodPayrolls),
    departmentPayroll: buildDepartmentPayroll(periodPayrolls),
    employerCost: buildEmployerCost(periodPayrolls),
    ctcAnalysis: buildCtcAnalysis(fyPayrolls, periods),
    requests,
    approvals,
  };
}

/**
 * Full HR Payroll Dashboard
 * GET /payRoll/hrDashboard?month=March&year=2026
 */
exports.getHrDashboard = async (req, res) => {
  try {
    const org_uuid = requireOrg(req, res);
    if (!org_uuid) return;

    const period = resolvePeriod(req.query);
    if (period.error) return sendResponse(res, 400, false, period.error);

    const data = await getDashboardBundle(org_uuid, period.month, period.year, req.empId);
    return sendResponse(res, 200, true, 'HR dashboard fetched successfully', data);
  } catch (err) {
    console.error('getHrDashboard:', err);
    return handleError(res, err);
  }
};
