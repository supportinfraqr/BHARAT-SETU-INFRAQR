const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

const DEFAULT_VPF = {
  enabled: false,
  contributionType: 'percentage',
  percentage: 0,
  fixedAmount: 0,
  status: 'none',
  acknowledged: false,
  requestedAt: null,
  effectiveFrom: null,
};

function resolveEmployeeId(req) {
  return req.empId || req.user?.employeeId || req.user?._id;
}

function getFirstDayOfNextMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** Read vpf object from payrollPreferences (supports legacy flat fields). */
function normalizeVpf(payrollPreferences = {}) {
  if (payrollPreferences.vpf && typeof payrollPreferences.vpf === 'object') {
    return { ...DEFAULT_VPF, ...payrollPreferences.vpf };
  }

  if (
    payrollPreferences.vpfStatus ||
    payrollPreferences.vpfEnabled !== undefined
  ) {
    return {
      ...DEFAULT_VPF,
      enabled: payrollPreferences.vpfEnabled || false,
      contributionType: payrollPreferences.vpfContributionType || 'percentage',
      percentage: payrollPreferences.vpfPercentage || 0,
      fixedAmount: payrollPreferences.vpfFixedAmount || 0,
      status: payrollPreferences.vpfStatus || 'none',
      acknowledged: payrollPreferences.vpfAcknowledged || false,
      requestedAt: payrollPreferences.vpfRequestedAt || null,
      effectiveFrom: payrollPreferences.vpfEffectiveFrom || null,
    };
  }

  return { ...DEFAULT_VPF };
}

/** Status ke hisaab se sahi values (galat DB data bhi UI par sahi dikhe). */
function sanitizeVpfForStatus(vpf = {}) {
  const data = { ...DEFAULT_VPF, ...vpf };

  if (data.status === 'pending') {
    return {
      ...data,
      enabled: false,
      effectiveFrom: null,
    };
  }

  if (data.status === 'active') {
    return {
      ...data,
      enabled: true,
    };
  }

  return data;
}

function formatVpfResponse(vpf = {}) {
  const data = sanitizeVpfForStatus(vpf);
  return {
    enabled: data.enabled,
    contributionType: data.contributionType,
    percentage: data.percentage,
    fixedAmount: data.fixedAmount,
    status: data.status,
    acknowledged: data.acknowledged,
    requestedAt: data.requestedAt,
    effectiveFrom: data.effectiveFrom,
  };
}

function mergePayrollPreferencesWithVpf(payrollPreferences = {}, vpf) {
  const prefs = { ...(payrollPreferences || {}) };
  prefs.vpf = formatVpfResponse(vpf);
  return prefs;
}

function validateStartPayload({ contributionType, contributionValue, acknowledged }) {
  if (!acknowledged) {
    return 'You must acknowledge that this will be processed in the next processing cycle';
  }

  if (!['percentage', 'fixed'].includes(contributionType)) {
    return 'Contribution type must be percentage or fixed';
  }

  const value = Number(contributionValue);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Valid contribution value is required';
  }

  if (contributionType === 'percentage' && (value < 1 || value > 100)) {
    return 'VPF percentage must be between 1 and 100';
  }

  return null;
}

function calculateMonthlyVpfAmount(vpf = {}, basicSalary = 0) {
  const data = sanitizeVpfForStatus(vpf);

  if (data.status !== 'active') {
    if (data.status === 'pending') {
      if (data.contributionType === 'fixed') {
        return data.fixedAmount || 0;
      }
      return Math.round(((basicSalary * (data.percentage || 0)) / 100) * 100) / 100;
    }
    return 0;
  }

  if (!data.enabled) return 0;

  if (data.contributionType === 'fixed') {
    return data.fixedAmount || 0;
  }

  return Math.round(((basicSalary * (data.percentage || 0)) / 100) * 100) / 100;
}

function isVpfEffectiveForPayroll(vpf, month, year, getMonthDateRange) {
  const data = sanitizeVpfForStatus(vpf);

  if (data.status !== 'active' || !data.enabled) {
    return false;
  }

  if (!data.effectiveFrom) {
    return true;
  }

  const monthRange = getMonthDateRange(year, month);
  if (!monthRange) {
    return true;
  }

  return new Date(data.effectiveFrom) <= monthRange.endDate;
}

/**
 * GET /payRoll/employee/vpf
 */
exports.getMyVpf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = resolveEmployeeId(req);

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { EmployeeModel } = await initModels(org_uuid);
    const employee = await EmployeeModel.findById(employeeId).select('payrollPreferences payrollInfo');

    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const vpf = normalizeVpf(employee.payrollPreferences);
    const basicSalary = employee.payrollInfo?.baseSalary || 0;

    return sendResponse(res, 200, true, 'VPF details fetched successfully', {
      vpf: formatVpfResponse(vpf),
      basicSalary,
      estimatedMonthlyVpf: calculateMonthlyVpfAmount(vpf, basicSalary),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/employee/vpf/start
 * Body: { contributionType, contributionValue, acknowledged }
 *
 * NOTE: Admin approval flow is intentionally removed. Employee submits → VPF
 * is activated immediately and kicks in from the FIRST DAY OF NEXT MONTH's
 * payroll (so an in-progress month is not affected mid-cycle).
 */
exports.startVpf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = resolveEmployeeId(req);

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { contributionType, contributionValue, acknowledged } = req.body;
    const validationError = validateStartPayload({ contributionType, contributionValue, acknowledged });

    if (validationError) {
      return sendResponse(res, 400, false, validationError);
    }

    const { EmployeeModel } = await initModels(org_uuid);
    const employee = await EmployeeModel.findById(employeeId);

    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const vpf = normalizeVpf(employee.payrollPreferences);

    if (vpf.status === 'active') {
      return sendResponse(res, 400, false, 'VPF contribution is already active');
    }

    const value = Number(contributionValue);
    const effectiveFrom = getFirstDayOfNextMonth();
    const updatedVpf = {
      ...vpf,
      enabled: true,
      contributionType,
      percentage: contributionType === 'percentage' ? value : 0,
      fixedAmount: contributionType === 'fixed' ? value : 0,
      status: 'active',
      acknowledged: true,
      requestedAt: new Date(),
      effectiveFrom,
    };

    employee.payrollPreferences = mergePayrollPreferencesWithVpf(employee.payrollPreferences, updatedVpf);
    await employee.save();

    return sendResponse(res, 201, true, 'VPF activated. Deduction will start from next month payroll.', {
      vpf: formatVpfResponse(updatedVpf),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/employee/vpf/stop
 */
exports.stopVpf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = resolveEmployeeId(req);

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { EmployeeModel } = await initModels(org_uuid);
    const employee = await EmployeeModel.findById(employeeId);

    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const vpf = normalizeVpf(employee.payrollPreferences);

    if (!['pending', 'active'].includes(vpf.status)) {
      return sendResponse(res, 400, false, 'No active or pending VPF contribution to stop');
    }

    const updatedVpf = {
      ...vpf,
      enabled: false,
      status: 'stopped',
      effectiveFrom: getFirstDayOfNextMonth(),
    };

    employee.payrollPreferences = mergePayrollPreferencesWithVpf(employee.payrollPreferences, updatedVpf);
    await employee.save();

    return sendResponse(res, 200, true, 'VPF stop request submitted successfully', {
      vpf: formatVpfResponse(updatedVpf),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

function toVpfAdminListItem(emp) {
  const vpf = sanitizeVpfForStatus(normalizeVpf(emp.payrollPreferences));
  const basicSalary = emp.payrollInfo?.baseSalary || 0;

  return {
    employeeId: emp._id,
    employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    email: emp.email,
    employeeCode: emp.uniqueId,
    basicSalary,
    status: vpf.status,
    contributionType: vpf.contributionType,
    percentage: vpf.contributionType === 'percentage' ? vpf.percentage : null,
    fixedAmount: vpf.contributionType === 'fixed' ? vpf.fixedAmount : null,
    requestedAt: vpf.requestedAt,
    effectiveFrom: vpf.effectiveFrom,
    monthlyDeduction: calculateMonthlyVpfAmount(vpf, basicSalary),
  };
}

/**
 * GET /payRoll/vpf/pending
 * Admin list — pending + active (single flat list)
 */
exports.getAllVpfRequests = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { status: statusFilter } = req.query;
    const allowedFilters = ['pending', 'active', 'all'];
    const filter = allowedFilters.includes(statusFilter) ? statusFilter : 'all';

    const { EmployeeModel } = await initModels(org_uuid);
    const employees = await EmployeeModel.find({
      $or: [
        { 'payrollPreferences.vpf.status': { $in: ['pending', 'active'] } },
        { 'payrollPreferences.vpfStatus': { $in: ['pending', 'active'] } },
      ],
    })
      .select('firstName lastName email uniqueId payrollPreferences payrollInfo')
      .lean();

    const list = employees
      .map((emp) => toVpfAdminListItem(emp))
      .filter((item) => {
        if (filter === 'all') return ['pending', 'active'].includes(item.status);
        return item.status === filter;
      })
      .sort((a, b) => {
        if (a.status === b.status) {
          return (b.requestedAt || 0) - (a.requestedAt || 0);
        }
        return a.status === 'pending' ? -1 : 1;
      });

    return sendResponse(res, 200, true, 'VPF list fetched successfully', { list });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.normalizeVpf = normalizeVpf;
exports.sanitizeVpfForStatus = sanitizeVpfForStatus;
exports.calculateMonthlyVpfAmount = calculateMonthlyVpfAmount;
exports.isVpfEffectiveForPayroll = isVpfEffectiveForPayroll;
exports.formatVpfResponse = formatVpfResponse;
