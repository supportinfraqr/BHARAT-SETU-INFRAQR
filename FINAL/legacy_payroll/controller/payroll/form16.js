const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { buildForm16Data } = require('../../utils/form16Builder');
const {
  buildForm16PdfBuffer,
  buildForm16PartAPdfBuffer,
  buildForm16PartBPdfBuffer,
} = require('../../utils/form16Pdf');
const { resolveFinancialYearInput } = require('../../utils/financialYear');

function buildForm16Filename(employee, fy) {
  const code = String(employee?.payrollInfo?.employeeCode || employee?.uniqueId || 'employee').replace(
    /[^\w.-]+/g,
    '_'
  );
  const fyKey = String(fy?.keyShort || 'FY').replace(/[^\w.-]+/g, '_');
  return `Form16_${code}_${fyKey}.pdf`;
}

function sendForm16PdfDownload(res, form16Data, employee, fy) {
  return buildForm16PdfBuffer(form16Data).then((pdfBuf) => {
    const filename = buildForm16Filename(employee, fy);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuf);
  });
}

function buildForm16PartFilename(employee, fy, part) {
  const code = String(employee?.payrollInfo?.employeeCode || employee?.uniqueId || 'employee').replace(
    /[^\w.-]+/g,
    '_'
  );
  const fyKey = String(fy?.keyShort || 'FY').replace(/[^\w.-]+/g, '_');
  return `Form16_Part${part}_${code}_${fyKey}.pdf`;
}

function sendForm16PartPdfDownload(res, form16Data, employee, fy, part, buildPdf) {
  return buildPdf(form16Data).then((pdfBuf) => {
    const filename = buildForm16PartFilename(employee, fy, part);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuf);
  });
}

async function downloadMyForm16PartPdf(req, res, part, buildPdf) {
  const org_uuid = req.headers.org_uuid;
  const employeeId = req.empId || req.user?.employeeId || req.user?._id;

  if (!org_uuid || !employeeId) {
    return sendResponse(res, 400, false, 'Missing required information');
  }

  const { financialYear } = req.query;
  if (!financialYear) {
    return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
  }

  const result = await buildForm16Data(org_uuid, employeeId, financialYear);
  if (result.error) {
    return sendResponse(res, result.status, false, result.error);
  }

  return sendForm16PartPdfDownload(res, result.data, result.employee, result.fy, part, buildPdf);
}

/**
 * Generate Form 16 JSON
 * GET /payRoll/form16/:employeeId?financialYear=2025-26
 */
exports.generateForm16 = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear } = req.query;

    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
    }

    const result = await buildForm16Data(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status, false, result.error);
    }

    return sendResponse(res, 200, true, 'Form 16 generated successfully', result.data);
  } catch (err) {
    console.error('generateForm16:', err);
    return handleError(res, err);
  }
};

/**
 * Download Form 16 PDF (admin)
 * GET /payRoll/form16/:employeeId/download?financialYear=2025-26
 */
exports.downloadForm16Pdf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear } = req.query;

    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
    }

    const result = await buildForm16Data(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status, false, result.error);
    }

    return await sendForm16PdfDownload(res, result.data, result.employee, result.fy);
  } catch (err) {
    console.error('downloadForm16Pdf:', err);
    return handleError(res, err);
  }
};

/**
 * Download Form 16 PDF (logged-in employee)
 * GET /payRoll/employee/form16/download?financialYear=2025-26
 */
exports.downloadMyForm16Pdf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    const employeeId = req.empId || req.user?.employeeId || req.user?._id;

    if (!org_uuid || !employeeId) {
      return sendResponse(res, 400, false, 'Missing required information');
    }

    const { financialYear } = req.query;
    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required (e.g. 2025-26)');
    }

    const result = await buildForm16Data(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status, false, result.error);
    }

    return await sendForm16PdfDownload(res, result.data, result.employee, result.fy);
  } catch (err) {
    console.error('downloadMyForm16Pdf:', err);
    return handleError(res, err);
  }
};

/**
 * Download Form 16 Part A PDF (logged-in employee — dashboard)
 * GET /payRoll/employee/form16/part-a/download?financialYear=2025-26
 */
exports.downloadMyForm16PartAPdf = async (req, res) => {
  try {
    return await downloadMyForm16PartPdf(req, res, 'A', buildForm16PartAPdfBuffer);
  } catch (err) {
    console.error('downloadMyForm16PartAPdf:', err);
    return handleError(res, err);
  }
};

/**
 * Download Form 16 Part B PDF (logged-in employee — dashboard)
 * GET /payRoll/employee/form16/part-b/download?financialYear=2025-26
 */
exports.downloadMyForm16PartBPdf = async (req, res) => {
  try {
    return await downloadMyForm16PartPdf(req, res, 'B', buildForm16PartBPdfBuffer);
  } catch (err) {
    console.error('downloadMyForm16PartBPdf:', err);
    return handleError(res, err);
  }
};

/**
 * Bulk Form 16 — validate all employees with TDS for FY
 * POST /payRoll/form16/bulk  { financialYear }
 */
exports.bulkGenerateForm16 = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear } = req.body;
    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required');
    }

    const fy = resolveFinancialYearInput(financialYear);
    if (!fy.ok) {
      return sendResponse(res, 400, false, fy.error);
    }

    const { EmployeeTDSModel } = await initModels(org_uuid);

    const tdsRecords = await EmployeeTDSModel.find({
      organizationId: org_uuid,
      financialYear: { $in: fy.aliases },
    }).populate('employeeId', 'firstName lastName email payrollInfo.employeeCode uniqueId');

    const results = [];

    for (const record of tdsRecords) {
      if (!record.employeeId) continue;

      try {
        const built = await buildForm16Data(org_uuid, record.employeeId._id, financialYear);
        results.push({
          employeeId: record.employeeId._id,
          name: `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim(),
          email: record.employeeId.email,
          employeeCode: record.employeeId.payrollInfo?.employeeCode || record.employeeId.uniqueId,
          status: built.error ? 'failed' : 'ready',
          error: built.error || null,
          totalTDSDeducted: built.data?.totalTDSDeducted || 0,
        });
      } catch (err) {
        results.push({
          employeeId: record.employeeId._id,
          name: `${record.employeeId.firstName || ''} ${record.employeeId.lastName || ''}`.trim(),
          status: 'failed',
          error: err.message,
        });
      }
    }

    const ready = results.filter((r) => r.status === 'ready').length;

    return sendResponse(res, 200, true, 'Bulk Form 16 generation completed', {
      financialYear: fy.keyShort,
      total: results.length,
      ready,
      failed: results.length - ready,
      results,
      downloadHint: 'Use GET /payRoll/form16/:employeeId/download?financialYear=... for each PDF',
    });
  } catch (err) {
    console.error('bulkGenerateForm16:', err);
    return handleError(res, err);
  }
};

/**
 * Form 16 summary for organization
 * GET /payRoll/form16/summary?financialYear=2025-26
 */
exports.getForm16Summary = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear } = req.query;

    if (!financialYear) {
      return sendResponse(res, 400, false, 'financialYear is required');
    }

    const fy = resolveFinancialYearInput(financialYear);
    if (!fy.ok) {
      return sendResponse(res, 400, false, fy.error);
    }

    const { EmployeeTDSModel } = await initModels(org_uuid);

    const tdsRecords = await EmployeeTDSModel.find({
      organizationId: org_uuid,
      financialYear: { $in: fy.aliases },
    }).populate('employeeId', 'firstName lastName email payrollInfo.department');

    const summary = {
      totalEmployees: tdsRecords.length,
      totalIncome: 0,
      totalTaxDeducted: 0,
      regimeWise: { new: 0, old: 0 },
      departmentWise: {},
    };

    tdsRecords.forEach((record) => {
      summary.totalIncome += record.projectedAnnualIncome?.total || 0;
      summary.totalTaxDeducted += record.totalTDSDeducted || 0;

      if (record.taxRegime === 'old') {
        summary.regimeWise.old += 1;
      } else {
        summary.regimeWise.new += 1;
      }

      const dept = record.employeeId?.payrollInfo?.department || 'Unknown';
      if (!summary.departmentWise[dept]) {
        summary.departmentWise[dept] = { count: 0, totalIncome: 0, totalTax: 0 };
      }
      summary.departmentWise[dept].count += 1;
      summary.departmentWise[dept].totalIncome += record.projectedAnnualIncome?.total || 0;
      summary.departmentWise[dept].totalTax += record.totalTDSDeducted || 0;
    });

    return sendResponse(res, 200, true, 'Form 16 summary fetched successfully', {
      financialYear: fy.keyShort,
      financialYearLabel: fy.label,
      summary,
    });
  } catch (err) {
    console.error('getForm16Summary:', err);
    return handleError(res, err);
  }
};
