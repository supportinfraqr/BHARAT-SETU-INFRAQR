const crypto = require('crypto');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  parsePayrollImportFile,
  mapImportRow,
  mapSalaryRevisionRow,
} = require('../../utils/payroll/parsePayrollImportFile');
const {
  validateOneTimeImportRows,
  summarizeRows,
} = require('../../utils/payroll/oneTimeImportHelper');
const {
  validateSalaryRevisionRows,
  summarizeRows: summarizeSalaryRevisionRows,
  applySalaryRevisionImport,
} = require('../../utils/payroll/salaryRevisionImportHelper');

const PAYROLL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthIndex(monthName) {
  return PAYROLL_MONTHS.indexOf(monthName);
}

function normalizeMonthInput(monthValue) {
  if (monthValue === null || monthValue === undefined) return null;
  const raw = String(monthValue).trim();
  if (!raw) return null;

  const shortIdx = PAYROLL_MONTHS.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return PAYROLL_MONTHS[shortIdx];

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return PAYROLL_MONTHS[numeric - 1];
  }

  return null;
}

function normalizeYearInput(yearValue) {
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 1900) return null;
  return year;
}

/**
 * POST /payRoll/import/one-time-earnings-deductions/preview
 */
exports.previewOneTimeEarningsDeductions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    if (!req.file) {
      return sendResponse(res, 400, false, 'CSV or Excel file is required');
    }

    const month = normalizeMonthInput(req.body.month);
    const year = normalizeYearInput(req.body.year);

    if (!month || getMonthIndex(month) === -1) {
      return sendResponse(res, 400, false, 'Valid month is required (Jan, Feb, ... or 1-12)');
    }
    if (!year) {
      return sendResponse(res, 400, false, 'Valid year is required');
    }

    const parsedRows = await parsePayrollImportFile(req.file);
    if (!parsedRows.length) {
      return sendResponse(res, 400, false, 'No rows found in uploaded file');
    }

    const mappedRows = parsedRows.map((row, index) => mapImportRow(row, index + 1));

    const { EmployeeModel, SalaryCompensationModel, PayrollOneTimeImportModel, PayrollRunModel } =
      await initModels(org_uuid);

    const employees = await EmployeeModel.find({ status: 'Active' }).select(
      'firstName lastName uniqueId customId payrollInfo.employeeCode'
    );
    const inactiveEmployees = await EmployeeModel.find({
      status: { $in: ['Inactive', 'Probation'] },
    }).select('firstName lastName uniqueId customId status');

    const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });

    const validatedRows = validateOneTimeImportRows(
      mappedRows,
      employees,
      salaryComponents,
      inactiveEmployees
    );
    const summary = summarizeRows(validatedRows);

    if (!summary.validRows) {
      return sendResponse(res, 400, false, 'No valid rows found in uploaded file', {
        summary,
        preview: validatedRows,
      });
    }

    const importBatchId = crypto.randomUUID();

    const draft = await PayrollOneTimeImportModel.create({
      organizationId: org_uuid,
      month,
      year,
      importBatchId,
      fileName: req.file.originalname || 'import.csv',
      status: 'draft',
      uploadedBy: req.userId || req.user?._id || null,
      rows: validatedRows,
      summary,
    });

    const paidConflict = await PayrollRunModel.findOne({
      organizationId: org_uuid,
      month,
      year,
      payStatus: 'paid',
      employeeId: { $in: validatedRows.filter((r) => r.valid).map((r) => r.employeeId) },
    }).select('_id employeeId');

    return sendResponse(res, 200, true, 'One-time components import preview generated successfully', {
      importBatchId: draft.importBatchId,
      month,
      year,
      fileName: draft.fileName,
      summary,
      warning: paidConflict
        ? 'Some employees already have paid payroll for this period. Re-import may require re-processing payroll.'
        : summary.invalidRows > 0
          ? `${summary.validRows} valid row(s) ready to confirm; ${summary.invalidRows} row(s) have errors and will be skipped.`
          : null,
      preview: validatedRows,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/import/one-time-earnings-deductions/confirm
 */
exports.confirmOneTimeEarningsDeductions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { importBatchId } = req.body;
    if (!importBatchId) {
      return sendResponse(res, 400, false, 'importBatchId is required');
    }

    const { PayrollOneTimeImportModel } = await initModels(org_uuid);

    const draft = await PayrollOneTimeImportModel.findOne({
      organizationId: org_uuid,
      importBatchId,
      status: 'draft',
    });

    if (!draft) {
      return sendResponse(res, 404, false, 'Draft import batch not found');
    }

    if (!draft.summary?.validRows) {
      return sendResponse(res, 400, false, 'Cannot confirm import with zero valid rows');
    }

    await PayrollOneTimeImportModel.updateMany(
      {
        organizationId: org_uuid,
        month: draft.month,
        year: draft.year,
        status: 'confirmed',
      },
      { $set: { status: 'cancelled' } }
    );

    draft.status = 'confirmed';
    draft.confirmedAt = new Date();
    await draft.save();

    return sendResponse(res, 200, true, 'One-time components import confirmed successfully', {
      importBatchId: draft.importBatchId,
      month: draft.month,
      year: draft.year,
      summary: draft.summary,
      rows: draft.rows.filter((r) => r.valid),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/import/one-time-earnings-deductions?month=Jun&year=2026
 */
exports.getOneTimeEarningsDeductions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const month = normalizeMonthInput(req.query.month);
    const year = normalizeYearInput(req.query.year);

    if (!month || !year) {
      return sendResponse(res, 400, false, 'month and year query params are required');
    }

    const { PayrollOneTimeImportModel } = await initModels(org_uuid);

    const batch = await PayrollOneTimeImportModel.findOne({
      organizationId: org_uuid,
      month,
      year,
      status: 'confirmed',
    })
      .sort({ confirmedAt: -1 })
      .lean();

    if (!batch) {
      return sendResponse(res, 200, true, 'No confirmed import for this period', {
        month,
        year,
        import: null,
      });
    }

    return sendResponse(res, 200, true, 'Confirmed one-time components import fetched successfully', {
      month,
      year,
      import: {
        importBatchId: batch.importBatchId,
        fileName: batch.fileName,
        confirmedAt: batch.confirmedAt,
        summary: batch.summary,
        rows: (batch.rows || []).filter((r) => r.valid),
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * DELETE /payRoll/import/one-time-earnings-deductions/:importBatchId
 */
exports.cancelOneTimeEarningsDeductions = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { importBatchId } = req.params;
    const { PayrollOneTimeImportModel } = await initModels(org_uuid);

    const batch = await PayrollOneTimeImportModel.findOneAndUpdate(
      {
        organizationId: org_uuid,
        importBatchId,
        status: 'draft',
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!batch) {
      return sendResponse(res, 404, false, 'Draft import batch not found');
    }

    return sendResponse(res, 200, true, 'Draft one-time components import cancelled successfully', {
      importBatchId: batch.importBatchId,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/import/salary-revision/preview
 */
exports.previewSalaryRevisionImport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    if (!req.file) {
      return sendResponse(res, 400, false, 'CSV or Excel file is required');
    }

    const parsedRows = await parsePayrollImportFile(req.file);
    if (!parsedRows.length) {
      return sendResponse(res, 400, false, 'No rows found in uploaded file');
    }

    const mappedRows = parsedRows.map((row, index) => mapSalaryRevisionRow(row, index + 1));

    const {
      EmployeeModel,
      SalaryCompensationModel,
      StatutoryComplianceModel,
      PayrollSalaryRevisionImportModel,
    } = await initModels(org_uuid);

    const employees = await EmployeeModel.find({ status: 'Active' }).select(
      'firstName lastName uniqueId customId payrollInfo statutoryInfo'
    );
    const inactiveEmployees = await EmployeeModel.find({
      status: { $in: ['Inactive', 'Probation'] },
    }).select('firstName lastName uniqueId customId status');
    const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });
    const statutoryCompliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });

    const validatedRows = validateSalaryRevisionRows(
      mappedRows,
      employees,
      salaryComponents,
      statutoryCompliance,
      inactiveEmployees
    );
    const summary = summarizeSalaryRevisionRows(validatedRows);

    const importBatchId = crypto.randomUUID();

    const draft = await PayrollSalaryRevisionImportModel.create({
      organizationId: org_uuid,
      importBatchId,
      fileName: req.file.originalname || 'import.csv',
      status: 'draft',
      uploadedBy: req.userId || req.user?._id || null,
      rows: validatedRows,
      summary,
    });

    return sendResponse(res, 200, true, 'Salary revision import preview generated successfully', {
      importBatchId: draft.importBatchId,
      fileName: draft.fileName,
      summary,
      warning:
        summary.invalidRows > 0
          ? `${summary.validRows} valid row(s) ready to confirm; ${summary.invalidRows} row(s) have errors and will be skipped.`
          : null,
      preview: validatedRows,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * POST /payRoll/import/salary-revision/confirm
 */
exports.confirmSalaryRevisionImport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { importBatchId } = req.body;
    if (!importBatchId) {
      return sendResponse(res, 400, false, 'importBatchId is required');
    }

    const {
      EmployeeModel,
      SalaryRevisionModel,
      ArrearsModel,
      PayrollSalaryRevisionImportModel,
    } = await initModels(org_uuid);

    const draft = await PayrollSalaryRevisionImportModel.findOne({
      organizationId: org_uuid,
      importBatchId,
      status: 'draft',
    });

    if (!draft) {
      return sendResponse(res, 404, false, 'Draft import batch not found');
    }

    if (!draft.summary?.validRows) {
      return sendResponse(res, 400, false, 'Cannot confirm import with zero valid rows');
    }

    const validRows = draft.rows.filter((r) => r.valid);
    const { results, errors } = await applySalaryRevisionImport({
      SalaryRevisionModel,
      EmployeeModel,
      ArrearsModel,
      validRows,
      org_uuid,
      requestedBy: req.userId,
      empId: req.empId,
    });

    const approvedCount = results.filter((r) => ['approved', 'implemented'].includes(r.status)).length;
    const implementedCount = results.filter((r) => r.status === 'implemented').length;

    draft.status = 'confirmed';
    draft.confirmedAt = new Date();
    draft.summary = {
      ...draft.summary,
      revisionsCreated: results.length,
      approved: approvedCount,
      implemented: implementedCount,
      failed: errors.length,
    };
    draft.rows = draft.rows.map((row) => {
      const applied = results.find((r) => r.rowNumber === row.rowNumber);
      const failed = errors.find((e) => e.rowNumber === row.rowNumber);
      if (!applied) return row;
      return {
        ...row,
        revisionId: applied.revisionId,
        appliedStatus: applied.status,
        error: failed?.error || row.error,
      };
    });
    await draft.save();

    return sendResponse(res, 200, true, 'Salary revision import confirmed successfully', {
      importBatchId: draft.importBatchId,
      summary: draft.summary,
      applied: results,
      errors,
      note: 'Revisions are visible in GET /payRoll/revision',
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * GET /payRoll/import/salary-revision?importBatchId=optional
 */
exports.getSalaryRevisionImport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { importBatchId } = req.query;
    const { PayrollSalaryRevisionImportModel } = await initModels(org_uuid);

    const filter = { organizationId: org_uuid, status: 'confirmed' };
    if (importBatchId) {
      filter.importBatchId = importBatchId;
    }

    const batch = await PayrollSalaryRevisionImportModel.findOne(filter)
      .sort({ confirmedAt: -1 })
      .lean();

    if (!batch) {
      return sendResponse(res, 200, true, 'No confirmed salary revision import found', {
        import: null,
      });
    }

    return sendResponse(res, 200, true, 'Salary revision import fetched successfully', {
      import: {
        importBatchId: batch.importBatchId,
        fileName: batch.fileName,
        confirmedAt: batch.confirmedAt,
        summary: batch.summary,
        rows: (batch.rows || []).filter((r) => r.valid),
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * DELETE /payRoll/import/salary-revision/:importBatchId
 */
exports.cancelSalaryRevisionImport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { importBatchId } = req.params;
    const { PayrollSalaryRevisionImportModel } = await initModels(org_uuid);

    const batch = await PayrollSalaryRevisionImportModel.findOneAndUpdate(
      {
        organizationId: org_uuid,
        importBatchId,
        status: 'draft',
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!batch) {
      return sendResponse(res, 404, false, 'Draft import batch not found');
    }

    return sendResponse(res, 200, true, 'Draft salary revision import cancelled successfully', {
      importBatchId: batch.importBatchId,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
