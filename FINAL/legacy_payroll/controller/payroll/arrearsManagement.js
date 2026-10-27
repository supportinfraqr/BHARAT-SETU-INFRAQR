const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

function normalizeMonthValue(monthValue) {
  if (monthValue === null || monthValue === undefined) return null;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthString = String(monthValue).trim();

  if (!monthString) return null;

  const numericMonth = Number(monthString);
  if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return months[numericMonth - 1];
  }

  const shortIndex = months.findIndex((m) => m.toLowerCase() === monthString.toLowerCase());
  if (shortIndex !== -1) {
    return months[shortIndex];
  }

  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const fullIndex = fullMonths.findIndex((m) => m.toLowerCase() === monthString.toLowerCase());
  if (fullIndex !== -1) {
    return months[fullIndex];
  }

  return null;
}

/**
 * Create Arrears Entry
 */
exports.createArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { ArrearsModel } = await initModels(org_uuid);
    const {
      employeeId,
      arrearsType,
      periodFrom,
      periodTo,
      components,
      totalArrearsAmount,
      tdsOnArrears,
      remarks,
      payInMonth,
      payInYear,
    } = req.body;

    if (!employeeId || !arrearsType || !totalArrearsAmount) {
      return sendResponse(res, 400, false, 'Employee ID, arrears type, and amount are required');
    }

    const normalizedPayInMonth = normalizeMonthValue(payInMonth);
    const normalizedPayInYear = Number(payInYear);
    if (
      !normalizedPayInMonth ||
      !Number.isInteger(normalizedPayInYear) ||
      normalizedPayInYear < 1900
    ) {
      return sendResponse(
        res,
        400,
        false,
        'payInMonth and payInYear are required (payroll month when arrears should appear on salary slip)'
      );
    }

    const normalizedPeriodFrom = periodFrom
      ? {
          month: normalizeMonthValue(periodFrom.month) || periodFrom.month,
          year: Number(periodFrom.year) || periodFrom.year,
        }
      : undefined;

    const normalizedPeriodTo = periodTo
      ? {
          month: normalizeMonthValue(periodTo.month) || periodTo.month,
          year: Number(periodTo.year) || periodTo.year,
        }
      : undefined;

    const arrears = new ArrearsModel({
      organizationId: org_uuid,
      employeeId,
      arrearsType,
      periodFrom: normalizedPeriodFrom,
      periodTo: normalizedPeriodTo,
      components: components || [],
      totalArrearsAmount,
      tdsOnArrears: tdsOnArrears || 0,
      netArrearsPayable: totalArrearsAmount - (tdsOnArrears || 0),
      payInMonth: normalizedPayInMonth,
      payInYear: normalizedPayInYear,
      status: 'calculated',
      remarks,
    });

    await arrears.save();

    return sendResponse(res, 201, true, 'Arrears created successfully', arrears);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Approve Arrears
 */
exports.approveArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { arrearsId } = req.params;
    const { ArrearsModel } = await initModels(org_uuid);

    const arrears = await ArrearsModel.findById(arrearsId);
    if (!arrears) {
      return sendResponse(res, 404, false, 'Arrears not found');
    }

    arrears.status = 'approved';
    await arrears.save();

    return sendResponse(res, 200, true, 'Arrears approved successfully', arrears);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Pay Arrears (Mark as Paid)
 */
exports.payArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { arrearsId } = req.params;
    const { paidInMonth, paidInYear, payrollId } = req.body;
    const { ArrearsModel } = await initModels(org_uuid);

    const normalizedPaidInMonth = normalizeMonthValue(paidInMonth);
    const normalizedPaidInYear = Number(paidInYear);

    if (!normalizedPaidInMonth || !Number.isInteger(normalizedPaidInYear) || normalizedPaidInYear < 1900) {
      return sendResponse(res, 400, false, 'Valid paidInMonth and paidInYear are required');
    }

    const arrears = await ArrearsModel.findById(arrearsId);
    if (!arrears) {
      return sendResponse(res, 404, false, 'Arrears not found');
    }

    if (arrears.status !== 'approved') {
      return sendResponse(res, 400, false, 'Only approved arrears can be paid');
    }

    arrears.status = 'paid';
    arrears.paidInMonth = normalizedPaidInMonth;
    arrears.paidInYear = normalizedPaidInYear;
    // Optional payrollId — empty string must not be cast to ObjectId
    if (payrollId != null && String(payrollId).trim() !== '') {
      arrears.payrollId = String(payrollId).trim();
    } else {
      arrears.payrollId = undefined;
    }
    arrears.paidDate = new Date();

    await arrears.save();

    return sendResponse(res, 200, true, 'Arrears marked as paid successfully', arrears);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Delete Arrears
 */
exports.deleteArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { arrearsId } = req.params;
    const { ArrearsModel } = await initModels(org_uuid);

    const arrears = await ArrearsModel.findOne({
      _id: arrearsId,
      organizationId: org_uuid,
    });

    if (!arrears) {
      return sendResponse(res, 404, false, 'Arrears not found');
    }

    if (arrears.status === 'paid' && arrears.payrollId) {
      return sendResponse(res, 400, false, 'Paid arrears linked with payroll cannot be deleted');
    }

    await ArrearsModel.deleteOne({
      _id: arrearsId,
      organizationId: org_uuid,
    });

    return sendResponse(res, 200, true, 'Arrears deleted successfully');
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get All Arrears
 */
exports.getAllArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { ArrearsModel } = await initModels(org_uuid);
    const { status, employeeId, page = 1, limit = 20 } = req.query;

    const filter = { organizationId: org_uuid };
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const total = await ArrearsModel.countDocuments(filter);
    const arrears = await ArrearsModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('employeeId', 'firstName lastName email payrollInfo.employeeCode');

    return sendResponse(res, 200, true, 'Arrears fetched successfully', {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      data: arrears,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Employee Arrears
 */
exports.getEmployeeArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { ArrearsModel } = await initModels(org_uuid);

    const arrears = await ArrearsModel.find({
      organizationId: org_uuid,
      employeeId,
    }).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Employee arrears fetched successfully', arrears);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Calculate Pending Arrears for Employee
 */
exports.calculatePendingArrears = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { ArrearsModel } = await initModels(org_uuid);

    const pendingArrears = await ArrearsModel.find({
      organizationId: org_uuid,
      employeeId,
      status: { $in: ['calculated', 'approved'] },
    });

    const totalPending = pendingArrears.reduce((sum, arr) => sum + arr.netArrearsPayable, 0);

    return sendResponse(res, 200, true, 'Pending arrears calculated successfully', {
      count: pendingArrears.length,
      totalAmount: totalPending,
      arrears: pendingArrears,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
