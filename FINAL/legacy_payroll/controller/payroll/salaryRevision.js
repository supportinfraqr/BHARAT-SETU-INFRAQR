const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { logPayrollAction } = require('./auditLog');
const {
  normalizeOverrides,
  resolveRevisionComponentOverrides,
  toStoredOverrides,
  stripBasicFromOverrides,
  withExplicitBasicOverride,
} = require('../../utils/salaryComponentHelper');
const { computePayrollInfoFromSalaryInput } = require('../../utils/payroll/salaryStructureImportHelper');
const { applyStatutoryFlagsToEmployee, applyStateToEmployee } = require('../../utils/payroll/salaryRevisionImportHelper');

const mapApprovalForResponse = (approval = {}) => ({
  employeeId: approval.employeeId || null,
  approverName: approval.approverName || '',
  approverRole: approval.approverRole || '',
  status: approval.status || '',
  comments: approval.comments || '',
  approvedDate: approval.approvedDate || null,
});

const mapRevisionForResponse = (revision) => {
  const data = revision?.toObject ? revision.toObject() : revision;
  return {
    ...data,
    approvals: Array.isArray(data?.approvals)
      ? data.approvals.map((approval) => mapApprovalForResponse(approval))
      : [],
  };
};

function extractEmployeeOverrides(employee) {
  const raw = employee?.payrollInfo?.componentOverrides || [];
  return normalizeOverrides(raw.map((item) => (item?.toObject ? item.toObject() : item)));
}

async function buildRevisionNewSalary({
  org_uuid,
  employee,
  newSalary = {},
  componentOverrides = [],
  effectiveFrom,
  state,
}) {
  const { SalaryCompensationModel, StatutoryComplianceModel } = await initModels(org_uuid);
  const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });
  const statutoryCompliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });

  const grossInput = Number(newSalary.grossSalary || 0);
  const basicInput = Number(newSalary.basicSalary || 0);
  const ctcInput = Number(newSalary.ctc || 0);
  const isManualSalary = grossInput > 0 && basicInput > 0 && ctcInput > 0;
  const normalizedOverrides = normalizeOverrides(componentOverrides);
  const calcOverrides = withExplicitBasicOverride(
    normalizedOverrides,
    basicInput,
    salaryComponents
  );

  const computed = computePayrollInfoFromSalaryInput({
    baseSalary: basicInput,
    grossSalary: grossInput,
    state: state || employee?.statutoryInfo?.ptState,
    employee,
    salaryComponents,
    statutoryCompliance,
    overrides: calcOverrides,
    salaryEffectiveFrom: effectiveFrom,
    grossSalaryInput: isManualSalary ? grossInput : grossInput > 0 ? grossInput : null,
    ctcInput: isManualSalary ? ctcInput : ctcInput > 0 ? ctcInput : null,
  });

  if (!computed.payrollInfo) {
    return { error: computed.error || 'Unable to compute salary from gross' };
  }

  let ctc = computed.payrollInfo.ctc;
  let grossSalary = computed.payrollInfo.grossSalary;
  let basicSalary = computed.payrollInfo.baseSalary;

  if (isManualSalary) {
    ctc = ctcInput;
    grossSalary = grossInput;
    basicSalary = basicInput > 0 ? Math.round(basicInput) : computed.payrollInfo.baseSalary;

    if (basicSalary > grossSalary || grossSalary > ctc) {
      return { error: 'Invalid salary structure. Please keep Basic ≤ Gross ≤ CTC' };
    }
  }

  return {
    ctc,
    grossSalary,
    basicSalary,
    components: computed.components,
    componentOverrides: toStoredOverrides(stripBasicFromOverrides(normalizedOverrides)),
    warnings: computed.warnings || [],
    inputMode: computed.inputMode || (isManualSalary ? 'manual' : 'gross'),
  };
}

/**
 * Create Salary Revision Request
 */
exports.createSalaryRevision = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { SalaryRevisionModel, EmployeeModel } = await initModels(org_uuid);
    const {
      employeeId,
      revisionType,
      effectiveFrom,
      newSalary = {},
      componentOverrides,
      arrearsApplicable,
      arrearsFromDate,
      remarks,
      state,
    } = req.body;

    if (!employeeId || !revisionType || !effectiveFrom || !newSalary) {
      return sendResponse(res, 400, false, 'Employee ID, revision type, effective date, and new salary are required');
    }

    const grossInput = Number(newSalary.grossSalary || 0);
    const basicInput = Number(newSalary.basicSalary || 0);
    const ctcInput = Number(newSalary.ctc || 0);
    const isManualSalary = grossInput > 0 && basicInput > 0 && ctcInput > 0;
    const isGrossInput = grossInput > 0 && !isManualSalary;

    if (!isManualSalary && !isGrossInput) {
      return sendResponse(
        res,
        400,
        false,
        'newSalary.grossSalary is required (or provide ctc, grossSalary, and basicSalary manually)'
      );
    }

    const effectiveDate = new Date(effectiveFrom);
    if (Number.isNaN(effectiveDate.getTime())) {
      return sendResponse(res, 400, false, 'Effective date is invalid');
    }

    let arrearsStartDate = null;
    if (arrearsApplicable) {
      if (!arrearsFromDate) {
        return sendResponse(res, 400, false, 'Arrears from date is required when arrears is applicable');
      }
      arrearsStartDate = new Date(arrearsFromDate);
      if (Number.isNaN(arrearsStartDate.getTime())) {
        return sendResponse(res, 400, false, 'Arrears from date is invalid');
      }
      if (arrearsStartDate > effectiveDate) {
        return sendResponse(res, 400, false, 'Arrears from date cannot be after effective date');
      }
    }

    const employee = await EmployeeModel.findById(employeeId).select(
      'firstName lastName payrollInfo statutoryInfo ctc grossSalary baseSalary'
    );
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const employeeOverrides = extractEmployeeOverrides(employee);
    const normalizedOverrides = resolveRevisionComponentOverrides({
      bodyOverrides: componentOverrides,
      newSalaryOverrides: newSalary.componentOverrides,
      employeeOverrides,
    });

    const synced = await buildRevisionNewSalary({
      org_uuid,
      employee,
      newSalary,
      componentOverrides: normalizedOverrides,
      effectiveFrom: effectiveDate,
      state,
    });

    if (synced.error) {
      return sendResponse(res, 400, false, synced.error);
    }

    const oldCTC = employee.payrollInfo?.ctc || employee.ctc || 0;
    const oldGross = employee.payrollInfo?.grossSalary || employee.grossSalary || 0;
    const oldBasic = employee.payrollInfo?.baseSalary || employee.baseSalary || 0;

    const incrementAmount = synced.ctc - oldCTC;
    const incrementPercentage = oldCTC > 0 ? Number(((incrementAmount / oldCTC) * 100).toFixed(2)) : 0;

    let arrearsAmount = 0;
    let arrearsToDate = null;
    if (arrearsApplicable && arrearsStartDate) {
      const fromDate = arrearsStartDate;
      const toDate = effectiveDate;
      const monthsDiff =
        (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
        (toDate.getMonth() - fromDate.getMonth());
      const normalizedMonthsDiff = Math.max(0, monthsDiff);
      const monthlyIncrement = incrementAmount / 12;
      arrearsAmount = Math.round(monthlyIncrement * normalizedMonthsDiff);
      arrearsToDate = toDate;
    }

    const revision = new SalaryRevisionModel({
      organizationId: org_uuid,
      employeeId,
      revisionType,
      effectiveFrom,
      oldSalary: {
        ctc: oldCTC,
        grossSalary: oldGross,
        basicSalary: oldBasic,
        components: [],
        componentOverrides: toStoredOverrides(employeeOverrides),
      },
      newSalary: {
        ctc: synced.ctc,
        grossSalary: synced.grossSalary,
        basicSalary: synced.basicSalary,
        components: synced.components,
        componentOverrides: synced.componentOverrides,
      },
      incrementAmount,
      incrementPercentage,
      arrearsApplicable: arrearsApplicable || false,
      arrearsFromDate: arrearsApplicable ? arrearsStartDate : null,
      arrearsToDate,
      arrearsAmount,
      arrearsPaid: false,
      status: 'pending',
      requestedBy: req.userId,
      remarks,
    });

    await revision.save();

    await logPayrollAction({
      org_uuid,
      action: 'salary_revision_created',
      entityType: 'salary_revision',
      entityId: revision._id,
      performedBy: req.userId,
      performedByName: `User ${req.userId || ''}`.trim(),
      affectedEmployee: employeeId,
      affectedEmployeeName: employee.firstName + ' ' + employee.lastName,
      beforeData: { ctc: oldCTC },
      afterData: { ctc: synced.ctc },
      remarks: 'Salary revision created',
    });

    return sendResponse(res, 201, true, 'Salary revision created successfully', {
      ...mapRevisionForResponse(revision),
      inputMode: synced.inputMode,
      warnings: synced.warnings,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Approve/Reject Salary Revision
 */
exports.approveSalaryRevision = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { revisionId } = req.params;
    const { status, comments } = req.body;
    const { SalaryRevisionModel, EmployeeModel } = await initModels(org_uuid);

    if (!['approved', 'rejected'].includes(status)) {
      return sendResponse(res, 400, false, 'Invalid status. Must be approved or rejected');
    }

    const revision = await SalaryRevisionModel.findById(revisionId);
    if (!revision) {
      return sendResponse(res, 404, false, 'Salary revision not found');
    }

    if (revision.status !== 'pending') {
      return sendResponse(res, 400, false, `Only pending revisions can be ${status}`);
    }

    let approverName = `User ${req.userId || ''}`.trim();
    let approverRole = 'Approver';

    if (req.empId) {
      const approverEmployee = await EmployeeModel.findById(req.empId).select('firstName lastName jobTitle categoryName');
      if (approverEmployee) {
        const fullName = `${approverEmployee.firstName || ''} ${approverEmployee.lastName || ''}`.trim();
        approverName = fullName || approverName;
        approverRole = approverEmployee.jobTitle || approverEmployee.categoryName || approverRole;
      }
    }

    revision.approvals.push({
      employeeId: req.empId || null,
      approverName,
      approverRole,
      approvedDate: new Date(),
      status,
      comments: comments || '',
    });

    revision.status = status;
    await revision.save();

    return sendResponse(res, 200, true, `Salary revision ${status} successfully`, mapRevisionForResponse(revision));
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Implement Salary Revision (Update Employee Salary)
 */
exports.implementSalaryRevision = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { revisionId } = req.params;
    const { SalaryRevisionModel, EmployeeModel, ArrearsModel } = await initModels(org_uuid);

    const revision = await SalaryRevisionModel.findById(revisionId);
    if (!revision) {
      return sendResponse(res, 404, false, 'Salary revision not found');
    }

    if (revision.status === 'implemented') {
      return sendResponse(res, 400, false, 'Salary revision is already implemented');
    }

    if (revision.status !== 'approved') {
      return sendResponse(res, 400, false, 'Only approved revisions can be implemented');
    }

    const employee = await EmployeeModel.findById(revision.employeeId);
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    // Apply Excel / stored statutory toggles before salary recompute
    applyStatutoryFlagsToEmployee(
      employee,
      revision.statutoryApplicability?.toObject?.() || revision.statutoryApplicability || {}
    );
    applyStateToEmployee(employee, revision.state);

    const employeeOverrides = extractEmployeeOverrides(employee);
    const mergedOverrides = resolveRevisionComponentOverrides({
      bodyOverrides: null,
      newSalaryOverrides: revision.newSalary?.componentOverrides,
      employeeOverrides,
    });

    const synced = await buildRevisionNewSalary({
      org_uuid,
      employee,
      newSalary: revision.newSalary,
      componentOverrides: mergedOverrides,
      effectiveFrom: revision.effectiveFrom,
    });

    if (synced.error) {
      return sendResponse(res, 400, false, synced.error);
    }

    revision.newSalary.ctc = synced.ctc;
    revision.newSalary.grossSalary = synced.grossSalary;
    revision.newSalary.basicSalary = synced.basicSalary;
    revision.newSalary.components = synced.components;
    revision.newSalary.componentOverrides = synced.componentOverrides;

    if (!employee.payrollInfo) {
      employee.payrollInfo = {};
    }
    employee.payrollInfo.ctc = synced.ctc;
    employee.payrollInfo.grossSalary = synced.grossSalary;
    employee.payrollInfo.baseSalary = synced.basicSalary;
    employee.payrollInfo.salaryEffectiveFrom = revision.effectiveFrom;
    employee.payrollInfo.componentOverrides = synced.componentOverrides;

    await employee.save();

    let arrearsRecord = null;
    if (revision.arrearsApplicable && revision.arrearsAmount > 0) {
      const monthlyIncrement = revision.incrementAmount / 12;
      const calculatedMonths = monthlyIncrement > 0
        ? Math.round(revision.arrearsAmount / monthlyIncrement)
        : 0;

      arrearsRecord = new ArrearsModel({
        organizationId: org_uuid,
        employeeId: revision.employeeId,
        arrearsType: 'salary_revision',
        periodFrom: {
          month: new Date(revision.arrearsFromDate).toLocaleString('en-IN', { month: 'short' }),
          year: new Date(revision.arrearsFromDate).getFullYear(),
        },
        periodTo: {
          month: new Date(revision.arrearsToDate).toLocaleString('en-IN', { month: 'short' }),
          year: new Date(revision.arrearsToDate).getFullYear(),
        },
        components: [
          {
            componentName: 'Salary Revision Arrears',
            oldAmount: revision.oldSalary.ctc,
            newAmount: revision.newSalary.ctc,
            difference: revision.incrementAmount,
            months: calculatedMonths,
            totalArrears: revision.arrearsAmount,
          },
        ],
        totalArrearsAmount: revision.arrearsAmount,
        tdsOnArrears: 0,
        netArrearsPayable: revision.arrearsAmount,
        status: 'calculated',
        salaryRevisionId: revision._id,
        remarks: 'Auto-created from salary revision',
      });

      await arrearsRecord.save();
    }

    revision.status = 'implemented';
    revision.implementedDate = new Date();
    await revision.save();

    return sendResponse(res, 200, true, 'Salary revision implemented successfully', {
      revision,
      arrearsRecord,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get All Salary Revisions
 */
exports.getAllSalaryRevisions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { SalaryRevisionModel } = await initModels(org_uuid);
    const { status, employeeId, page = 1, limit = 20 } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);

    const filter = { organizationId: org_uuid };
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const total = await SalaryRevisionModel.countDocuments(filter);
    const revisions = await SalaryRevisionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate('employeeId', 'firstName lastName email payrollInfo.employeeCode')
      .populate('approvals.employeeId', 'firstName lastName email payrollInfo.employeeCode');

    const formattedRevisions = revisions.map((revision) => mapRevisionForResponse(revision));

    return sendResponse(res, 200, true, 'Salary revisions fetched successfully', {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      data: formattedRevisions,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Salary Revision by ID
 */
exports.getSalaryRevisionById = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { revisionId } = req.params;
    const { SalaryRevisionModel } = await initModels(org_uuid);

    const revision = await SalaryRevisionModel.findOne({ _id: revisionId, organizationId: org_uuid })
      .populate('employeeId', 'firstName lastName email payrollInfo')
      .populate('approvals.employeeId', 'firstName lastName email payrollInfo.employeeCode');

    if (!revision) {
      return sendResponse(res, 404, false, 'Salary revision not found');
    }

    return sendResponse(res, 200, true, 'Salary revision fetched successfully', mapRevisionForResponse(revision));
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get Employee Revision History
 */
exports.getEmployeeRevisionHistory = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { SalaryRevisionModel } = await initModels(org_uuid);

    const revisions = await SalaryRevisionModel.find({
      organizationId: org_uuid,
      employeeId,
    })
      .sort({ effectiveFrom: -1 })
      .populate('employeeId', 'firstName lastName email payrollInfo.employeeCode')
      .populate('approvals.employeeId', 'firstName lastName email payrollInfo.employeeCode');

    const formattedRevisions = revisions.map((revision) => mapRevisionForResponse(revision));

    return sendResponse(res, 200, true, 'Employee revision history fetched successfully', formattedRevisions);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Delete Salary Revision
 */
exports.deleteSalaryRevision = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { revisionId } = req.params;
    const { SalaryRevisionModel } = await initModels(org_uuid);

    const revision = await SalaryRevisionModel.findOne({ _id: revisionId, organizationId: org_uuid });
    if (!revision) {
      return sendResponse(res, 404, false, 'Salary revision not found');
    }

    if (!['pending', 'rejected'].includes(revision.status)) {
      return sendResponse(res, 400, false, 'Only pending or rejected revisions can be deleted');
    }

    await SalaryRevisionModel.deleteOne({ _id: revisionId, organizationId: org_uuid });

    await logPayrollAction({
      org_uuid,
      action: 'salary_revision_deleted',
      entityType: 'salary_revision',
      entityId: revision._id,
      performedBy: req.userId,
      performedByName: `User ${req.userId || ''}`.trim(),
      affectedEmployee: revision.employeeId,
      remarks: 'Salary revision deleted',
    });

    return sendResponse(res, 200, true, 'Salary revision deleted successfully');
  } catch (err) {
    return handleError(res, err);
  }
};
