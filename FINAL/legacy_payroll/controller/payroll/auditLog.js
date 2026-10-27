const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');

/**
 * Log Payroll Action
 */
async function logPayrollAction(params) {
  try {
    const { org_uuid, action, entityType, entityId, performedBy, performedByName, affectedEmployee, affectedEmployeeName, beforeData, afterData, payrollDetails, ipAddress, userAgent, remarks } = params;

    const { PayrollAuditLogModel } = await initModels(org_uuid);

    const log = new PayrollAuditLogModel({
      organizationId: org_uuid,
      action,
      entityType,
      entityId,
      performedBy,
      performedByName,
      affectedEmployee,
      affectedEmployeeName,
      beforeData,
      afterData,
      payrollDetails,
      ipAddress,
      userAgent,
      remarks,
    });

    await log.save();
    return log;
  } catch (err) {
    console.error('Failed to log payroll action:', err);
  }
}

/**
 * Get Audit Logs
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { PayrollAuditLogModel } = await initModels(org_uuid);
    const { action, entityType, employeeId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = { organizationId: org_uuid };
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (employeeId) filter.affectedEmployee = employeeId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const total = await PayrollAuditLogModel.countDocuments(filter);
    const logs = await PayrollAuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('performedBy', 'firstName lastName email')
      .populate('affectedEmployee', 'firstName lastName email');

    return sendResponse(res, 200, true, 'Audit logs fetched successfully', {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Audit Log by ID
 */
exports.getAuditLogById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { logId } = req.params;
    const { PayrollAuditLogModel } = await initModels(org_uuid);

    const log = await PayrollAuditLogModel.findById(logId)
      .populate('performedBy', 'firstName lastName email')
      .populate('affectedEmployee', 'firstName lastName email');

    if (!log) {
      return sendResponse(res, 404, false, 'Audit log not found');
    }

    return sendResponse(res, 200, true, 'Audit log fetched successfully', log);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Employee Audit History
 */
exports.getEmployeeAuditHistory = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { PayrollAuditLogModel } = await initModels(org_uuid);

    const logs = await PayrollAuditLogModel.find({
      organizationId: org_uuid,
      affectedEmployee: employeeId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('performedBy', 'firstName lastName email');

    return sendResponse(res, 200, true, 'Employee audit history fetched successfully', logs);
  } catch (err) {
    return handleError(res, err);
  }
};

// Export the log function for use in other controllers
exports.logPayrollAction = logPayrollAction;
