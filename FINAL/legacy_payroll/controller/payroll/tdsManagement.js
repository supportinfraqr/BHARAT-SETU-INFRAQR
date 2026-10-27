const mongoose = require('mongoose');
const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  resolveFinancialYearInput,
  getTdsCalculationPeriod,
  getRemainingPayrollMonthsInTdsPeriod,
  isPayrollMonthBeforeImplementation,
  toCalendarDate,
  getTdsOpeningMonth,
  buildTdsIncomeMonths,
} = require('../../utils/financialYear');
const { buildTaxReportData } = require('../../utils/taxReportBuilder');
const { buildTaxReportPdfBuffer, buildTaxReportFilename } = require('../../utils/taxReportPdf');
const { uploadFile } = require('../../service/cloudUploade/clodeUpload');
const { calculateEmployeeAnnualLoanPerquisite } = require('../../utils/payroll/loanPerquisiteHelper');
const { resolveEmployeeImplementationDate } = require('../../utils/payroll/employeeImplementationDate');
const {
  computeAnnualRentFromEntries,
  buildDeclaredDeductionsFromDeclaration,
  applyCappedDeductionsForTax,
  aggregate80DFromLines,
  completedServiceYears,
  gratuityExempt,
  leaveEncashmentExempt,
  retrenchmentExempt,
  vrsExempt,
  getDefaultExemptionLimits,
  getExemptionLimits,
  capToLimit,
} = require('../../utils/payroll/tdsDeclarationHelper');

function sendTaxReportPdfDownload(res, reportData, employee, fy) {
  return buildTaxReportPdfBuffer(reportData).then((pdfBuf) => {
    const filename = buildTaxReportFilename(reportData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuf);
  });
}

function parseFYRequest(res, financialYear) {
  if (!financialYear) {
    sendResponse(res, 400, false, 'Financial year is required');
    return null;
  }
  const fy = resolveFinancialYearInput(financialYear);
  if (!fy.ok) {
    sendResponse(res, 400, false, fy.error);
    return null;
  }
  return fy;
}

function parseEmployeeIdParam(res, employeeId) {
  if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
    sendResponse(res, 400, false, 'Invalid employee id');
    return null;
  }
  return employeeId;
}

async function findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing = false } = {}) {
  let config = await TDSConfigModel.findOne({
    organizationId: org_uuid,
    financialYear: { $in: fy.aliases },
  });
  if (!config && createIfMissing) {
    config = await createDefaultTDSConfig(org_uuid, fy.canonical, TDSConfigModel);
  }
  return config;
}

// =====================================================
// TDS Configuration APIs
// =====================================================

/**
 * Create or Update TDS Configuration for Financial Year
 */
exports.createOrUpdateTDSConfig = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { TDSConfigModel } = await initModels(org_uuid);
    const { financialYear, taxRegime, newRegimeSlabs, oldRegimeSlabs, oldRegimeSlabsSenior, oldRegimeSlabsSuperSenior, standardDeduction, section80CLimit, surchargeSlabs, surchargeSlabsOld, healthEducationCess, rebateLimit, rebateAmount, standardDeductionOld, rebateLimitOld, rebateAmountOld, exemptionLimits } = req.body;

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const config = await TDSConfigModel.findOneAndUpdate(
      { organizationId: org_uuid, financialYear: { $in: fy.aliases } },
      {
        organizationId: org_uuid,
        financialYear: fy.canonical,
        taxRegime: taxRegime || 'new',
        newRegimeSlabs: completeNewRegimeSlabs(newRegimeSlabs) || getDefaultNewRegimeSlabs(),
        oldRegimeSlabs: oldRegimeSlabs || getDefaultOldRegimeSlabs(),
        oldRegimeSlabsSenior: oldRegimeSlabsSenior?.length ? oldRegimeSlabsSenior : getDefaultOldRegimeSlabsSenior(),
        oldRegimeSlabsSuperSenior: oldRegimeSlabsSuperSenior?.length ? oldRegimeSlabsSuperSenior : getDefaultOldRegimeSlabsSuperSenior(),
        standardDeduction: standardDeduction ?? 75000,
        section80CLimit: section80CLimit ?? 150000,
        surchargeSlabs: normalizeNewSurchargeSlabs(surchargeSlabs) || getDefaultSurchargeSlabs(),
        surchargeSlabsOld: surchargeSlabsOld?.length ? surchargeSlabsOld : getDefaultSurchargeSlabsOld(),
        healthEducationCess: healthEducationCess ?? 4,
        rebateLimit: rebateLimit ?? 1200000,
        rebateAmount: rebateAmount ?? 60000,
        standardDeductionOld: standardDeductionOld ?? 50000,
        rebateLimitOld: rebateLimitOld ?? 500000,
        rebateAmountOld: rebateAmountOld ?? 12500,
        exemptionLimits: getExemptionLimits({ exemptionLimits }),
      },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, true, 'TDS configuration saved successfully', config);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Get TDS Configuration by Financial Year
 */
exports.getTDSConfig = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear } = req.query;
    const { TDSConfigModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    let config = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel);

    // If not found, create default
    if (!config) {
      config = await createDefaultTDSConfig(org_uuid, fy.canonical, TDSConfigModel);
    } else {
      config = await upgradeTdsConfigToFy202627(config);
    }

    return sendResponse(res, 200, true, 'TDS configuration fetched successfully', config);
  } catch (err) {
    return handleError(res, err);
  }
};

// =====================================================
// Employee TDS APIs
// =====================================================

/**
 * Calculate and Save Employee TDS for Financial Year
 */
exports.calculateEmployeeTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear, taxRegime, declaredDeductions, hraDetails, otherIncome, salaryExemptions, investments80D, otherIncomeBreakdown } = req.body;

    const { EmployeeTDSModel, TDSConfigModel, EmployeeModel, SalaryCompensationModel, EmployeeLoanModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    // Get employee salary details
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    // Get TDS config
    let tdsConfig = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing: true });

    const existingTDS = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    });

    const storedDeclaration = toPlainItDeclaration(existingTDS?.itDeclaration);
    const incomingExemptions = salaryExemptions && typeof salaryExemptions === 'object' ? salaryExemptions : null;
    const incomingHasAmount = !!incomingExemptions && Object.values(incomingExemptions).some((value) => Number(value) > 0);
    const lined80D = aggregate80DFromLines(investments80D);
    const deductionsForTax = { ...(declaredDeductions || {}) };
    const typed80D = ['section80DSelf', 'section80DParents', 'section80DPreventive', 'section80DPreventiveSelf', 'section80DPreventiveParents', 'section80DMedicalSelf', 'section80DMedicalParents']
      .reduce((sum, key) => sum + (Number(deductionsForTax[key]) || 0), 0);
    if (lined80D.declared > 0 && typed80D === 0) {
      deductionsForTax.section80DSelf = lined80D.selfPremium;
      deductionsForTax.section80DParents = lined80D.parentsPremium;
      deductionsForTax.section80DPreventiveSelf = lined80D.preventiveSelf;
      deductionsForTax.section80DPreventiveParents = lined80D.preventiveParents;
      deductionsForTax.section80DMedicalSelf = lined80D.medicalSelf;
      deductionsForTax.section80DMedicalParents = lined80D.medicalParents;
      deductionsForTax.section80DSelfSenior = lined80D.selfSenior;
      deductionsForTax.section80DParentsSenior = lined80D.parentsSenior;
    }
    const incomingBreakdown = otherIncomeBreakdown && typeof otherIncomeBreakdown === 'object' ? otherIncomeBreakdown : null;
    const itDeclarationOverride = (incomingHasAmount || incomingBreakdown)
      ? {
          ...storedDeclaration,
          salaryExemptions: {
            ...(storedDeclaration.salaryExemptions || {}),
            ...(incomingExemptions || {}),
          },
          otherIncomeBreakdown: {
            ...(storedDeclaration.otherIncomeBreakdown || {}),
            ...(incomingBreakdown || {}),
          },
        }
      : existingTDS?.itDeclaration;

    const projectionInput = {
      org_uuid,
      employee,
      fy,
      tdsConfig,
      existingTDS,
      taxRegime,
      declaredDeductions: deductionsForTax,
      hraDetails,
      otherIncome,
      SalaryCompensationModel,
      EmployeeLoanModel,
      itDeclarationOverride,
    };
    const [projection, fullYearProjection] = await Promise.all([
      computeEmployeeTdsProjection(projectionInput),
      computeEmployeeTdsProjection({
        ...projectionInput,
        payrollImplementationDate: null,
      }),
    ]);

    const {
      effectiveRegime,
      normalizedDeductions,
      hraReceived,
      annualIncome,
      hraExemption,
      section10,
      taxableIncome,
      taxCalculation,
      monthlyTDS,
      loanPerquisiteSummary,
      remainingMonths,
      alreadyDeducted,
      standardDeductionApplied,
    } = projection;

    const deductionsApplied = computeEffectiveDeductionsTotal(
      normalizedDeductions,
      hraExemption,
      tdsConfig,
      effectiveRegime,
      section10?.total || 0,
      projection.capOptions
    );
    const fullYearDeductions = computeEffectiveDeductionsTotal(
      fullYearProjection.normalizedDeductions,
      fullYearProjection.hraExemption,
      tdsConfig,
      fullYearProjection.effectiveRegime,
      fullYearProjection.section10?.total || 0,
      fullYearProjection.capOptions
    );
    const fullYear = summarizeTdsView(fullYearProjection, fullYearDeductions);

    // Save or update employee TDS
    const employeeTDS = await EmployeeTDSModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId, financialYear: { $in: fy.aliases } },
      {
        $set: {
          organizationId: org_uuid,
          employeeId,
          financialYear: fy.canonical,
          taxRegime: effectiveRegime,
          projectedAnnualIncome: annualIncome,
          declaredDeductions: {
            ...normalizedDeductions,
            standardDeduction: standardDeductionApplied,
            total: deductionsApplied,
          },
          hraExemption,
          section10Exemptions: section10,
          ...(incomingHasAmount
            ? { 'itDeclaration.salaryExemptions': itDeclarationOverride.salaryExemptions }
            : {}),
          taxableIncome,
          taxPayable: taxCalculation,
          rebateApplicable: taxCalculation.rebateApplicable,
          rebateAmount: taxCalculation.rebateAmount,
          monthlyTDS,
          incomeBreakdown: projection.incomeBreakdown,
          tdsPeriod: {
            start: projection.tdsPeriod?.start || null,
            end: projection.tdsPeriod?.end || null,
            equivalentMonths: projection.tdsPeriod?.applicableMonths || 0,
            payrollImplementationDate: projection.payrollImplementationDate || null,
            payrollScheduleDate: projection.payrollScheduleDate || null,
            startDateSource: projection.startDateSource || '',
            openingMonth: projection.tdsPeriod?.openingMonth || null,
          },
          fullYearComparison: {
            gross: fullYear.annualIncome?.gross || 0,
            totalIncome: fullYear.annualIncome?.total || 0,
            deductions: fullYear.deductionsApplied || 0,
            hraExemption: fullYear.hraExemption?.exemptAmount || 0,
            taxableIncome: fullYear.taxableIncome || 0,
            taxPayable: fullYear.taxCalculation?.total || 0,
            monthlyTDS: fullYear.monthlyTDS || 0,
            periodStart: fullYear.tdsPeriod?.start || null,
            periodEnd: fullYear.tdsPeriod?.end || null,
          },
          adminCalculated: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return sendResponse(res, 200, true, 'TDS calculated successfully', {
      employeeTDS,
      breakdown: {
        taxRegime: effectiveRegime,
        chapterVIADeductionsApplied: effectiveRegime === 'old',
        hraReceived,
        annualIncome,
        hraExemption,
        section10,
        standardDeduction: standardDeductionApplied,
        chapterVIA: projection.cappedDeductions || applyCappedDeductionsForTax(normalizedDeductions, tdsConfig),
        section80CLimit: tdsConfig?.section80CLimit ?? 150000,
        exemptionLimits: getExemptionLimits(tdsConfig),
        deductionsApplied,
        taxableIncome,
        taxCalculation,
        monthlyTDS,
        remainingMonths,
        alreadyDeducted,
        loanPerquisite: loanPerquisiteSummary,
        payrollImplementationDate: projection.payrollImplementationDate,
        incomeBreakdown: projection.incomeBreakdown,
        tdsPeriod: projection.tdsPeriod,
      },
      fullYear,
    });
  } catch (err) {
    console.error('TDS Calculation Error:', err);
    return handleError(res, err);
  }
};

/**
 * Get Employee TDS Details
 */
exports.getEmployeeTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear } = req.query;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const employeeTDS = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    }).populate('employeeId', 'firstName lastName email payrollInfo');

    if (!employeeTDS) {
      // First-time employee — allow empty declaration form (no error)
      return sendResponse(res, 200, true, 'No TDS declaration yet for this financial year', {
        employeeId,
        financialYear: fy.canonical,
        taxRegime: 'new',
        investments80C: [],
        investments80D: [],
        itDeclaration: null,
        declaredDeductions: null,
        monthlyTDS: 0,
        isNew: true,
      });
    }

    let payload = employeeTDS;
    try {
      const { EmployeeModel, TDSConfigModel, SalaryCompensationModel, EmployeeLoanModel } =
        await initModels(org_uuid);
      const employee = await EmployeeModel.findById(employeeId);
      const tdsConfig = employee
        ? await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing: false })
        : null;
      if (employee && tdsConfig) {
        const projection = await computeEmployeeTdsProjection({
          org_uuid,
          employee,
          fy,
          tdsConfig,
          existingTDS: employeeTDS,
          taxRegime: employeeTDS.taxRegime,
          declaredDeductions: employeeTDS.declaredDeductions,
          hraDetails: null,
          otherIncome: undefined,
          SalaryCompensationModel,
          EmployeeLoanModel,
          itDeclarationOverride: employeeTDS.itDeclaration,
        });
        const deductionsApplied = computeEffectiveDeductionsTotal(
          projection.normalizedDeductions,
          projection.hraExemption,
          tdsConfig,
          projection.effectiveRegime,
          projection.section10?.total || 0,
          projection.capOptions
        );
        payload = employeeTDS.toObject();
        payload.taxRegime = projection.effectiveRegime;
        payload.projectedAnnualIncome = projection.annualIncome;
        payload.declaredDeductions = {
          ...(payload.declaredDeductions || {}),
          ...projection.normalizedDeductions,
          standardDeduction: projection.standardDeductionApplied,
          total: deductionsApplied,
        };
        payload.hraExemption = projection.hraExemption;
        payload.section10Exemptions = projection.section10;
        payload.taxableIncome = projection.taxableIncome;
        payload.taxPayable = projection.taxCalculation;
        payload.rebateApplicable = projection.taxCalculation.rebateApplicable;
        payload.rebateAmount = projection.taxCalculation.rebateAmount;
        payload.monthlyTDS = projection.monthlyTDS;
        payload.incomeBreakdown = projection.incomeBreakdown;
      }
    } catch (projectionErr) {
      console.error('getEmployeeTDS projection:', projectionErr);
    }

    return sendResponse(res, 200, true, 'Employee TDS fetched successfully', payload);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getEmployeeHRAForTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear } = req.query;
    const { EmployeeModel, EmployeeTDSModel, SalaryCompensationModel } = await initModels(org_uuid);

    const employee = await EmployeeModel.findById(employeeId).select('firstName lastName payrollInfo baseSalary grossSalary ctc');
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    let employeeTDS = null;
    let fy = null;
    if (financialYear) {
      fy = parseFYRequest(res, financialYear);
      if (!fy) return;
      employeeTDS = await EmployeeTDSModel.findOne({
        organizationId: org_uuid,
        employeeId,
        financialYear: { $in: fy.aliases },
      });
    }

    const { SalaryRevisionModel } = await initModels(org_uuid);
    const payrollImplementationDate = await resolveEmployeeImplementationDate({
      employee,
      organizationId: org_uuid,
      SalaryRevisionModel,
    });
    const payrollMonths = fy
      ? getTdsCalculationPeriod(fy, payrollImplementationDate).equivalentMonths
      : 12;
    const hraReceived = await calculateHRAReceivedFromSalaryComponents(
      employee,
      SalaryCompensationModel,
      org_uuid,
      payrollMonths
    );
    return sendResponse(res, 200, true, 'HRA details fetched successfully', {
      employeeId,
      financialYear: fy?.canonical || financialYear || '',
      hraReceived,
    });
  } catch (err) {
    console.error('getEmployeeHRAForTDS:', err);
    return handleError(res, err);
  }
};

/**
 * Employee ESS — Tax Report (Taxation tab)
 * GET /payRoll/employee/tax-report?financialYear=2025-26
 */
exports.getMyTaxReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = req.empId || req.user?.employeeId || req.user?._id;
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }

    const { financialYear } = req.query;
    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const result = await buildTaxReportData(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status || 400, false, result.error);
    }

    return sendResponse(res, 200, true, 'Tax report fetched successfully', result.data);
  } catch (err) {
    console.error('getMyTaxReport:', err);
    return handleError(res, err);
  }
};

/**
 * Employee ESS — Tax Report PDF download
 * GET /payRoll/employee/tax-report/download?financialYear=2025-26
 */
exports.downloadMyTaxReportPdf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = req.empId || req.user?.employeeId || req.user?._id;
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }

    const { financialYear } = req.query;
    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const result = await buildTaxReportData(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status || 400, false, result.error);
    }

    return await sendTaxReportPdfDownload(res, result.data, result.employee, result.fy);
  } catch (err) {
    console.error('downloadMyTaxReportPdf:', err);
    return handleError(res, err);
  }
};

/**
 * Admin — employee tax report
 * GET /payRoll/tds/tax-report/:employeeId?financialYear=2025-26
 */
exports.getEmployeeTaxReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = parseEmployeeIdParam(res, req.params.employeeId);
    if (!employeeId) return;

    const { financialYear } = req.query;
    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const result = await buildTaxReportData(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status || 400, false, result.error);
    }

    return sendResponse(res, 200, true, 'Tax report fetched successfully', result.data);
  } catch (err) {
    console.error('getEmployeeTaxReport:', err);
    return handleError(res, err);
  }
};

/**
 * Admin — Tax Report PDF download
 * GET /payRoll/tds/tax-report/:employeeId/download?financialYear=2025-26
 */
exports.downloadEmployeeTaxReportPdf = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = parseEmployeeIdParam(res, req.params.employeeId);
    if (!employeeId) return;

    const { financialYear } = req.query;
    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const result = await buildTaxReportData(org_uuid, employeeId, financialYear);
    if (result.error) {
      return sendResponse(res, result.status || 400, false, result.error);
    }

    return await sendTaxReportPdfDownload(res, result.data, result.employee, result.fy);
  } catch (err) {
    console.error('downloadEmployeeTaxReportPdf:', err);
    return handleError(res, err);
  }
};

/**
 * Get Employee TDS List for Financial Year
 */
exports.getEmployeeTDSList = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear, taxRegime, search, declarations, employeeId } = req.query;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const showDeclarations = declarations === 'true' || declarations === '1';
    const filter = {
      organizationId: org_uuid,
      financialYear: { $in: fy.aliases },
    };

    if (showDeclarations) {
      filter.hasInvestmentDeclaration = { $ne: false };
    } else {
      filter.adminCalculated = true;
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(String(employeeId))) {
      filter.employeeId = employeeId;
    }

    if (taxRegime && ['old', 'new'].includes(taxRegime)) {
      filter.taxRegime = taxRegime;
    }

    const records = await EmployeeTDSModel.find(filter)
      .populate('employeeId', 'firstName lastName email payrollInfo.employeeCode uniqueId status')
      .sort({ updatedAt: -1 })
      .lean();

    const normalizedSearch = (search || '').trim().toLowerCase();
    const filteredRecords = normalizedSearch
      ? records.filter((record) => {
          const firstName = record.employeeId?.firstName || '';
          const lastName = record.employeeId?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
          const email = (record.employeeId?.email || '').toLowerCase();
          const employeeCode = (record.employeeId?.payrollInfo?.employeeCode || '').toLowerCase();
          const uniqueId = (record.employeeId?.uniqueId || '').toLowerCase();

          return (
            fullName.includes(normalizedSearch) ||
            email.includes(normalizedSearch) ||
            employeeCode.includes(normalizedSearch) ||
            uniqueId.includes(normalizedSearch)
          );
        })
      : records;

    return sendResponse(res, 200, true, 'Employee TDS list fetched successfully', {
      total: filteredRecords.length,
      records: filteredRecords,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Delete Employee TDS Record
 */
exports.deleteEmployeeTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { tdsRecordId } = req.params;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    const deletedRecord = await EmployeeTDSModel.findOneAndDelete({
      _id: tdsRecordId,
      organizationId: org_uuid,
    });

    if (!deletedRecord) {
      return sendResponse(res, 404, false, 'TDS record not found');
    }

    return sendResponse(res, 200, true, 'TDS record deleted successfully');
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Update Employee TDS Declaration
 */
exports.updateTDSDeclaration = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear, declaredDeductions, investments80C, investments80D, itDeclaration, proofItems } = req.body;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const employeeTDS = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    });

    if (!employeeTDS) {
      return sendResponse(res, 404, false, 'TDS record not found');
    }

    if (employeeTDS.isLocked) {
      return sendResponse(res, 400, false, 'Investment declaration is frozen. You cannot edit it.');
    }

    const hasDeclarationLines =
      investments80C !== undefined || investments80D !== undefined || itDeclaration !== undefined;

    if (hasDeclarationLines) {
      if (investments80C !== undefined) {
        employeeTDS.investments80C = sanitizeInvestmentLines(investments80C);
        employeeTDS.markModified('investments80C');
      }
      if (investments80D !== undefined) {
        employeeTDS.investments80D = sanitizeInvestmentLines(investments80D);
        employeeTDS.markModified('investments80D');
      }
      if (itDeclaration !== undefined) {
        employeeTDS.itDeclaration = mergeItDeclaration(employeeTDS.itDeclaration, itDeclaration);
        employeeTDS.markModified('itDeclaration');
      }

      employeeTDS.declaredDeductions = buildDeclaredDeductionsFromDeclaration({
        lines80C: employeeTDS.investments80C,
        lines80D: employeeTDS.investments80D,
        itDeclaration: toPlainItDeclaration(employeeTDS.itDeclaration),
        prevDeductions: toPlainItDeclaration(employeeTDS.declaredDeductions),
        tdsConfig: {},
        touchedHomeLoan: true,
        touchedOtherInv: true,
        declaredDeductionsOverride: declaredDeductions || toPlainItDeclaration(employeeTDS.declaredDeductions),
      });
      employeeTDS.markModified('declaredDeductions');
    } else if (declaredDeductions) {
      const normalizedDeductions = normalizeDeductions(declaredDeductions);
      employeeTDS.declaredDeductions = {
        ...employeeTDS.declaredDeductions,
        ...normalizedDeductions,
        total: Object.values(normalizedDeductions).reduce((a, b) => a + b, 0) + (employeeTDS.declaredDeductions?.standardDeduction || 50000),
      };
      employeeTDS.markModified('declaredDeductions');
    }

    if (Array.isArray(proofItems)) {
      employeeTDS.proofItems = sanitizeProofItems(proofItems);
      employeeTDS.markModified('proofItems');
      const reviewed = employeeTDS.proofItems.filter((item) => item.status !== 'pending');
      if (reviewed.length && employeeTDS.proofItems.every((item) => item.status === 'approved')) {
        employeeTDS.proofStatus = 'approved';
        employeeTDS.proofVerified = true;
        employeeTDS.proofSubmitted = true;
      } else if (reviewed.length && employeeTDS.proofItems.every((item) => item.status === 'rejected')) {
        employeeTDS.proofStatus = 'rejected';
        employeeTDS.proofVerified = false;
        employeeTDS.proofSubmitted = true;
      } else if (reviewed.length) {
        employeeTDS.proofStatus = 'submitted';
        employeeTDS.proofSubmitted = true;
        employeeTDS.proofVerified = false;
      }
      employeeTDS.proofReviewedAt = new Date();
    }

    await employeeTDS.save();

    return sendResponse(res, 200, true, 'TDS declaration updated successfully', employeeTDS);
  } catch (err) {
    return handleError(res, err);
  }
};

const MAX_INVESTMENT_LINES = 100;
const MAX_RENT_ENTRIES = 20;
const MAX_OTHER_INVESTMENT_LINES = 50;

/**
 * Employee ESS: remove the saved investment declaration.
 * A calculated TDS row is kept for admin. A declaration-only row is removed.
 */
exports.deleteMyInvestmentDeclaration = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = req.empId;
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }

    const { financialYear } = req.query;
    const { EmployeeTDSModel } = await initModels(org_uuid);
    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const existing = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    });

    if (!existing || existing.hasInvestmentDeclaration === false) {
      return sendResponse(res, 404, false, 'Investment declaration not found');
    }

    if (existing.isLocked) {
      return sendResponse(res, 400, false, 'Investment declaration is frozen. You cannot delete it.');
    }

    const hasPayrollHistory = Array.isArray(existing.monthlyDeductions) && existing.monthlyDeductions.length > 0;
    if (!existing.adminCalculated && !hasPayrollHistory) {
      await EmployeeTDSModel.deleteOne({ _id: existing._id, organizationId: org_uuid, employeeId });
      return sendResponse(res, 200, true, 'Investment declaration deleted');
    }

    const emptyDeclaration = defaultItDeclaration();
    await EmployeeTDSModel.updateOne(
      { _id: existing._id, organizationId: org_uuid, employeeId },
      {
        $set: {
          hasInvestmentDeclaration: false,
          investments80C: [],
          investments80D: [],
          itDeclaration: emptyDeclaration,
          'declaredDeductions.section80C': 0,
          'declaredDeductions.section80D': 0,
          'declaredDeductions.section80E': 0,
          'declaredDeductions.section80G': 0,
          'declaredDeductions.section24': 0,
          'declaredDeductions.otherDeductions': 0,
        },
      }
    );

    return sendResponse(res, 200, true, 'Investment declaration deleted');
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Employee ESS: save IT declaration (80C/80D, rent, home loan, etc.)
 * and auto-compute projected monthly TDS from admin FY slabs.
 */
exports.saveInvestmentDeclarationDetails = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = req.empId;
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }

    const { financialYear, investments80C, investments80D, itDeclaration, declaredDeductions, taxRegime } =
      req.body;
    const { EmployeeTDSModel, TDSConfigModel, EmployeeModel, SalaryCompensationModel, EmployeeLoanModel } =
      await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const existing = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    });

    if (existing?.isLocked) {
      return sendResponse(res, 400, false, 'Investment declaration is frozen. You cannot edit it.');
    }

    const has80C = Object.prototype.hasOwnProperty.call(req.body, 'investments80C');
    const has80D = Object.prototype.hasOwnProperty.call(req.body, 'investments80D');
    const lines80C = has80C ? sanitizeInvestmentLines(investments80C) : mapDocInvestmentLines(existing?.investments80C);
    const lines80D = has80D ? sanitizeInvestmentLines(investments80D) : mapDocInvestmentLines(existing?.investments80D);

    let tdsConfig = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing: true });

    const prevItPlain = toPlainItDeclaration(existing?.itDeclaration);
    const hasItDecl = Object.prototype.hasOwnProperty.call(req.body, 'itDeclaration');
    const incomingIt = hasItDecl ? itDeclaration : null;
    const mergedItDeclaration = mergeItDeclaration(prevItPlain, incomingIt);

    const touchedHomeLoan =
      hasItDecl && incomingIt && Object.prototype.hasOwnProperty.call(incomingIt, 'homeLoanSelfOccupied');
    const touchedOtherInv =
      hasItDecl && incomingIt && Object.prototype.hasOwnProperty.call(incomingIt, 'investmentsOther');
    const otherLines = sanitizeOtherInvestmentLines(mergedItDeclaration.investmentsOther);

    const mergedDeductions = buildDeclaredDeductionsFromDeclaration({
      lines80C,
      lines80D,
      itDeclaration: {
        ...mergedItDeclaration,
        investmentsOther: touchedOtherInv ? otherLines : mergedItDeclaration.investmentsOther,
      },
      prevDeductions: existing?.declaredDeductions || {},
      tdsConfig,
      touchedHomeLoan,
      touchedOtherInv,
      declaredDeductionsOverride: declaredDeductions,
    });

    const updatePayload = {
      investments80C: lines80C,
      investments80D: lines80D,
      itDeclaration: {
        ...mergedItDeclaration,
        investmentsOther: touchedOtherInv ? otherLines : mergedItDeclaration.investmentsOther,
      },
      declaredDeductions: mergedDeductions,
    };

    if (Object.prototype.hasOwnProperty.call(req.body, 'taxRegime')) {
      const parsedTaxRegime = parseTaxRegimeInput(taxRegime);
      if (parsedTaxRegime === undefined) {
        return sendResponse(res, 400, false, 'taxRegime must be "old" or "new"');
      }
      if (parsedTaxRegime) {
        updatePayload.taxRegime = parsedTaxRegime;
      }
    }

    const employee = await EmployeeModel.findById(employeeId);
    const tdsProjectionFields = employee
      ? await buildTdsProjectionFields({
          org_uuid,
          employee,
          fy,
          tdsConfig,
          existingTDS: existing,
          declaredDeductions: mergedDeductions,
          itDeclaration: mergedItDeclaration,
          taxRegime: updatePayload.taxRegime,
          SalaryCompensationModel,
          EmployeeLoanModel,
        })
      : null;

    if (tdsProjectionFields) {
      Object.assign(updatePayload, tdsProjectionFields);
    }

    const employeeTDS = await EmployeeTDSModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId, financialYear: { $in: fy.aliases } },
      {
        $set: {
          organizationId: org_uuid,
          employeeId,
          financialYear: fy.canonical,
          hasInvestmentDeclaration: true,
          ...updatePayload,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const saveAndCompare = await buildSaveAndCompareSummary(
      org_uuid,
      employeeId,
      fy,
      mergedDeductions,
      mergedItDeclaration
    );

    return sendResponse(res, 200, true, 'Investment declaration saved', {
      employeeTDS,
      saveAndCompare,
      tdsPreview: tdsProjectionFields
        ? {
            taxRegime: tdsProjectionFields.taxRegime,
            taxableIncome: tdsProjectionFields.taxableIncome,
            monthlyTDS: tdsProjectionFields.monthlyTDS,
            annualTax: tdsProjectionFields.taxPayable?.total || 0,
          }
        : null,
      aggregates: {
        section80C: mergedDeductions.section80C,
        section80D: mergedDeductions.section80D,
        section24: mergedDeductions.section24,
        otherDeductions: mergedDeductions.otherDeductions,
        section80DMaxLimit: getExemptionLimits(tdsConfig).section80D,
        section24MaxLimit: getExemptionLimits(tdsConfig).section24,
        lines80C: lines80C.length,
        lines80D: lines80D.length,
        rentEntries: mergedItDeclaration.rentEntries?.length || 0,
        otherInvestmentLines: mergedItDeclaration.investmentsOther?.length || 0,
      },
    });
  } catch (err) {
    console.error('saveInvestmentDeclarationDetails:', err);
    return handleError(res, err);
  }
};

exports.submitInvestmentproof = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const employeeId = req.empId || req.user?.employeeId || req.user?._id;
    if (!employeeId) {
      return sendResponse(res, 401, false, 'Employee id missing from token');
    }

    let requestBody;
    try {
      requestBody = parseInvestmentRequestBody(req.body);
    } catch (parseErr) {
      return sendResponse(res, 400, false, parseErr.message);
    }

    const { financialYear, investments80C, investments80D, itDeclaration, declaredDeductions, taxRegime } = requestBody;
    const { EmployeeTDSModel, TDSConfigModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const existing = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId,
      financialYear: { $in: fy.aliases },
    });

    if (existing?.isLocked) {
      return sendResponse(res, 400, false, 'Investment declaration is frozen. You cannot edit it.');
    }

    const uploadedAttachments = await uploadInvestmentDeclarationFiles(req.files);
    const shouldUpdate80C =
      Object.prototype.hasOwnProperty.call(requestBody, 'investments80C') ||
      uploadedAttachments.investment80CAttachments.length > 0;
    const shouldUpdate80D =
      Object.prototype.hasOwnProperty.call(requestBody, 'investments80D') ||
      uploadedAttachments.investment80DAttachments.length > 0;
    const lines80C = shouldUpdate80C
      ? sanitizeInvestmentLines(
          investments80C || existing?.investments80C,
          uploadedAttachments.investment80CAttachments,
          existing?.investments80C
        )
      : mapDocInvestmentLines(existing?.investments80C);
    const lines80D = shouldUpdate80D
      ? sanitizeInvestmentLines(
          investments80D || existing?.investments80D,
          uploadedAttachments.investment80DAttachments,
          existing?.investments80D
        )
      : mapDocInvestmentLines(existing?.investments80D);
    const totalDeclared80C = sumLineAmounts(lines80C);
    const totalDeclared80D = sumLineAmounts(lines80D);

    let tdsConfig = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing: true });

    const prevItPlain = toPlainItDeclaration(existing?.itDeclaration);
    const hasItDecl = Object.prototype.hasOwnProperty.call(requestBody, 'itDeclaration');
    const incomingIt = hasItDecl ? itDeclaration : null;
    const mergedItDeclaration = mergeItDeclaration(prevItPlain, incomingIt, uploadedAttachments);

    const prev = existing?.declaredDeductions || {};
    const standardDeduction = prev.standardDeduction ?? tdsConfig.standardDeduction ?? 50000;

    const hl = mergedItDeclaration.homeLoanSelfOccupied || {};
    const homeLoanPrincipal = hl.enabled ? Math.max(0, Number(hl.principalPaid) || 0) : 0;
    const touchedHomeLoan =
      hasItDecl && incomingIt && Object.prototype.hasOwnProperty.call(incomingIt, 'homeLoanSelfOccupied');
    let section24 = Number(prev.section24) || 0;
    if (touchedHomeLoan) {
      section24 = hl.enabled ? Math.max(0, Number(hl.interestPaid) || 0) : 0;
    }

    const touchedOtherInv =
      hasItDecl && incomingIt && Object.prototype.hasOwnProperty.call(incomingIt, 'investmentsOther');
    const otherLines = sanitizeOtherInvestmentLines(mergedItDeclaration.investmentsOther);
    let otherDeductions = Number(prev.otherDeductions) || 0;
    if (touchedOtherInv) {
      otherDeductions = sumLineAmounts(otherLines);
    }

    const mergedDeductions = {
      section80C: totalDeclared80C + homeLoanPrincipal,
      section80D: totalDeclared80D,
      section80E: Number(prev.section80E) || 0,
      section80G: Number(prev.section80G) || 0,
      section24,
      professionalTax: Number(prev.professionalTax) || 0,
      otherDeductions,
      standardDeduction,
      total: 0,
    };

    if (declaredDeductions && typeof declaredDeductions === 'object') {
      const n = normalizeDeductions(declaredDeductions);
      if (declaredDeductions.section80E !== undefined) mergedDeductions.section80E = n.section80E;
      if (declaredDeductions.section80G !== undefined) mergedDeductions.section80G = n.section80G;
      if (declaredDeductions.professionalTax !== undefined) mergedDeductions.professionalTax = n.professionalTax;
      if (declaredDeductions.section24 !== undefined && !touchedHomeLoan) mergedDeductions.section24 = n.section24;
      if (declaredDeductions.otherDeductions !== undefined && !touchedOtherInv) mergedDeductions.otherDeductions = n.otherDeductions;
    }

    mergedDeductions.total = computeDeclaredDeductionsTotal(mergedDeductions);

    const proofUpdate = {
      organizationId: org_uuid,
      employeeId,
      financialYear: fy.canonical,
      investments80C: lines80C,
          investments80D: lines80D,
          itDeclaration: {
            ...mergedItDeclaration,
            investmentsOther: touchedOtherInv ? otherLines : mergedItDeclaration.investmentsOther,
          },
          declaredDeductions: mergedDeductions,
      proofSubmitted: true,
      proofVerified: false,
      proofStatus: 'submitted',
    };

    if (Object.prototype.hasOwnProperty.call(requestBody, 'taxRegime')) {
      const parsedTaxRegime = parseTaxRegimeInput(taxRegime);
      if (parsedTaxRegime === undefined) {
        return sendResponse(res, 400, false, 'taxRegime must be "old" or "new"');
      }
      if (parsedTaxRegime) proofUpdate.taxRegime = parsedTaxRegime;
    }

    const employeeTDS = await EmployeeTDSModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId, financialYear: { $in: fy.aliases } },
      { $set: proofUpdate },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const saveAndCompare = await buildSaveAndCompareSummary(
      org_uuid,
      employeeId,
      fy,
      mergedDeductions,
      mergedItDeclaration
    );

    return sendResponse(res, 200, true, 'Investment proof updated successfully', {
      employeeTDS,
      saveAndCompare,
      aggregates: {
        section80C: mergedDeductions.section80C,
        section80D: mergedDeductions.section80D,
        section24: mergedDeductions.section24,
        otherDeductions: mergedDeductions.otherDeductions,
        lines80C: lines80C.length,
        lines80D: lines80D.length,
        rentEntries: mergedItDeclaration.rentEntries?.length || 0,
        otherInvestmentLines: mergedItDeclaration.investmentsOther?.length || 0,
      },
    });
  } catch (err) {
    console.error('upploadfileforproof:', err);
    return handleError(res, err);
  }
};

exports.updateInvestmentProofStatus = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear, status, remarks } = req.body;
    if (!employeeId) {
      return sendResponse(res, 400, false, 'Employee ID is required');
    }

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const normalizedStatus = normalizeProofStatus(status);
    if (!normalizedStatus) {
      return sendResponse(res, 400, false, 'Status must be approved or rejected');
    }

    const { EmployeeTDSModel } = await initModels(org_uuid);
    const reviewedBy = String(req.empId || req.userId || req.user?._id || '').trim();

    const employeeTDS = await EmployeeTDSModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId, financialYear: { $in: fy.aliases } },
      {
        $set: {
          financialYear: fy.canonical,
          proofSubmitted: true,
          proofVerified: normalizedStatus === 'approved',
          proofStatus: normalizedStatus,
          proofRemarks: String(remarks || '').trim().slice(0, 1000),
          proofReviewedBy: reviewedBy,
          proofReviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!employeeTDS) {
      return sendResponse(res, 404, false, 'TDS record not found');
    }

    return sendResponse(
      res,
      200,
      true,
      `Investment proof ${normalizedStatus} successfully`,
      employeeTDS
    );
  } catch (err) {
    console.error('updateInvestmentProofStatus:', err);
    return handleError(res, err);
  }
};

/**
 * Lock/Unlock Employee TDS
 */
exports.lockUnlockTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { employeeId } = req.params;
    const { financialYear, isLocked } = req.body;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const employeeTDS = await EmployeeTDSModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId, financialYear: { $in: fy.aliases } },
      { isLocked: isLocked },
      { new: true }
    );

    if (!employeeTDS) {
      return sendResponse(res, 404, false, 'TDS record not found');
    }

    return sendResponse(res, 200, true, `TDS ${isLocked ? 'locked' : 'unlocked'} successfully`, employeeTDS);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Bulk Calculate TDS for All Employees
 */
exports.bulkCalculateTDS = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear } = req.body;
    const {
      EmployeeModel,
      EmployeeTDSModel,
      TDSConfigModel,
      EmployeeLoanModel,
      SalaryCompensationModel,
    } = await initModels(org_uuid);

    const fy = parseFYRequest(res, financialYear);
    if (!fy) return;

    const employees = await EmployeeModel.find({ status: 'Active' });
    const tdsConfig = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, { createIfMissing: true });

    const results = [];

    for (const employee of employees) {
      try {
        const existingTDS = await EmployeeTDSModel.findOne({
          organizationId: org_uuid,
          employeeId: employee._id,
          financialYear: { $in: fy.aliases },
        });

        const projection = await computeEmployeeTdsProjection({
          org_uuid,
          employee,
          fy,
          tdsConfig,
          existingTDS,
          taxRegime: existingTDS?.taxRegime,
          declaredDeductions: existingTDS?.declaredDeductions,
          hraDetails: null,
          otherIncome: undefined, // use ESS itDeclaration other income
          SalaryCompensationModel,
          EmployeeLoanModel,
        });

        const deductionsApplied = computeEffectiveDeductionsTotal(
          projection.normalizedDeductions,
          projection.hraExemption,
          tdsConfig,
          projection.effectiveRegime,
          projection.section10?.total || 0,
          projection.capOptions
        );

        await EmployeeTDSModel.findOneAndUpdate(
          { organizationId: org_uuid, employeeId: employee._id, financialYear: { $in: fy.aliases } },
          {
            $set: {
              organizationId: org_uuid,
              employeeId: employee._id,
              financialYear: fy.canonical,
              taxRegime: projection.effectiveRegime,
              projectedAnnualIncome: projection.annualIncome,
              declaredDeductions: {
                ...projection.normalizedDeductions,
                standardDeduction: projection.standardDeductionApplied,
                total: deductionsApplied,
              },
              hraExemption: projection.hraExemption,
              section10Exemptions: projection.section10,
              taxableIncome: projection.taxableIncome,
              taxPayable: projection.taxCalculation,
              rebateApplicable: projection.taxCalculation.rebateApplicable,
              rebateAmount: projection.taxCalculation.rebateAmount,
              monthlyTDS: projection.monthlyTDS,
              incomeBreakdown: projection.incomeBreakdown,
              adminCalculated: true,
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        results.push({
          employeeId: employee._id,
          status: 'success',
          monthlyTDS: projection.monthlyTDS,
        });
      } catch (err) {
        results.push({ employeeId: employee._id, status: 'failed', error: err.message });
      }
    }

    return sendResponse(res, 200, true, 'Bulk TDS calculation completed', {
      total: employees.length,
      results,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

// =====================================================
// Helper Functions
// =====================================================

function getDefaultNewRegimeSlabs() {
  // FY 2025-26 / FY 2026-27 new tax regime (Budget 2025)
  return [
    { incomeFrom: 0, incomeTo: 400000, taxRate: 0 },
    { incomeFrom: 400001, incomeTo: 800000, taxRate: 5 },
    { incomeFrom: 800001, incomeTo: 1200000, taxRate: 10 },
    { incomeFrom: 1200001, incomeTo: 1600000, taxRate: 15 },
    { incomeFrom: 1600001, incomeTo: 2000000, taxRate: 20 },
    { incomeFrom: 2000001, incomeTo: 2400000, taxRate: 25 },
    { incomeFrom: 2400001, incomeTo: 9999999999, taxRate: 30 },
  ];
}

function getDefaultOldRegimeSlabs() {
  return [
    { incomeFrom: 0, incomeTo: 250000, taxRate: 0 },
    { incomeFrom: 250001, incomeTo: 500000, taxRate: 5 },
    { incomeFrom: 500001, incomeTo: 1000000, taxRate: 20 },
    { incomeFrom: 1000001, incomeTo: 9999999999, taxRate: 30 },
  ];
}

function getDefaultOldRegimeSlabsSenior() {
  // Old regime, age 60–79 as on 31 March
  return [
    { incomeFrom: 0, incomeTo: 300000, taxRate: 0 },
    { incomeFrom: 300001, incomeTo: 500000, taxRate: 5 },
    { incomeFrom: 500001, incomeTo: 1000000, taxRate: 20 },
    { incomeFrom: 1000001, incomeTo: 9999999999, taxRate: 30 },
  ];
}

function getDefaultOldRegimeSlabsSuperSenior() {
  // Old regime, age 80+ as on 31 March
  return [
    { incomeFrom: 0, incomeTo: 500000, taxRate: 0 },
    { incomeFrom: 500001, incomeTo: 1000000, taxRate: 20 },
    { incomeFrom: 1000001, incomeTo: 9999999999, taxRate: 30 },
  ];
}

function ageOnDate(dob, asOf) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(asOf.getTime())) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Age as on 31 March of the financial year. Missing DOB stays on the below-60 slabs. */
function getEmployeeAgeForFy(employee, fy) {
  const dob = employee?.demographics?.dob || employee?.dob;
  if (!dob || !fy?.endYear) return null;
  return ageOnDate(dob, new Date(Number(fy.endYear), 2, 31));
}

function oldRegimeAgeCategory(age) {
  if (age == null || !Number.isFinite(age)) return 'below60';
  if (age >= 80) return 'superSenior';
  if (age >= 60) return 'senior';
  return 'below60';
}

function getOldRegimeSlabsForAge(tdsConfig, age) {
  const category = oldRegimeAgeCategory(age);
  if (category === 'superSenior') {
    const slabs = tdsConfig?.oldRegimeSlabsSuperSenior;
    return slabs?.length ? slabs : getDefaultOldRegimeSlabsSuperSenior();
  }
  if (category === 'senior') {
    const slabs = tdsConfig?.oldRegimeSlabsSenior;
    return slabs?.length ? slabs : getDefaultOldRegimeSlabsSenior();
  }
  const slabs = tdsConfig?.oldRegimeSlabs;
  return slabs?.length ? slabs : getDefaultOldRegimeSlabs();
}

function getDefaultSurchargeSlabs() {
  // New regime: surcharge capped at 25% above ₹5 crore
  return [
    { incomeFrom: 0, incomeTo: 5000000, surchargeRate: 0 },
    { incomeFrom: 5000001, incomeTo: 10000000, surchargeRate: 10 },
    { incomeFrom: 10000001, incomeTo: 20000000, surchargeRate: 15 },
    { incomeFrom: 20000001, incomeTo: 50000000, surchargeRate: 25 },
    { incomeFrom: 50000001, incomeTo: 9999999999, surchargeRate: 25 },
  ];
}

function getDefaultSurchargeSlabsOld() {
  // Old regime: 37% above ₹5 crore
  return [
    { incomeFrom: 0, incomeTo: 5000000, surchargeRate: 0 },
    { incomeFrom: 5000001, incomeTo: 10000000, surchargeRate: 10 },
    { incomeFrom: 10000001, incomeTo: 20000000, surchargeRate: 15 },
    { incomeFrom: 20000001, incomeTo: 50000000, surchargeRate: 25 },
    { incomeFrom: 50000001, incomeTo: 9999999999, surchargeRate: 37 },
  ];
}

const LEGACY_NEW_SURCHARGE = [
  { incomeFrom: 0, incomeTo: 5000000, surchargeRate: 0 },
  { incomeFrom: 5000001, incomeTo: 10000000, surchargeRate: 10 },
  { incomeFrom: 10000001, incomeTo: 20000000, surchargeRate: 15 },
  { incomeFrom: 20000001, incomeTo: 9999999999, surchargeRate: 25 },
];

function slabRow(slab, rateKey) {
  return {
    incomeFrom: Number(slab?.incomeFrom) || 0,
    incomeTo: Number(slab?.incomeTo) || 0,
    [rateKey]: Number(slab?.[rateKey]) || 0,
  };
}

function sameSlabRows(saved, expected, rateKey) {
  if (!Array.isArray(saved) || saved.length !== expected.length) return false;
  return saved.every((row, index) => {
    const left = slabRow(row, rateKey);
    const right = expected[index];
    return left.incomeFrom === right.incomeFrom
      && left.incomeTo === right.incomeTo
      && left[rateKey] === right[rateKey];
  });
}

function isExactPrefix(saved, defaults, rateKey) {
  if (!Array.isArray(saved) || !saved.length || saved.length >= defaults.length) return false;
  return saved.every((row, index) => {
    const left = slabRow(row, rateKey);
    const right = defaults[index];
    return left.incomeFrom === right.incomeFrom
      && left.incomeTo === right.incomeTo
      && left[rateKey] === right[rateKey];
  });
}

/** Saved 4-slab new-regime list (stops at ₹16 lakh) becomes the full FY 2026-27 table. Custom slabs stay as saved. */
function completeNewRegimeSlabs(saved) {
  const defaults = getDefaultNewRegimeSlabs();
  if (!Array.isArray(saved) || saved.length === 0) return null;
  if (isExactPrefix(saved, defaults, 'taxRate')) return defaults;
  return saved;
}

function normalizeNewSurchargeSlabs(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return null;
  if (sameSlabRows(saved, LEGACY_NEW_SURCHARGE, 'surchargeRate')) return getDefaultSurchargeSlabs();
  return saved;
}

async function upgradeTdsConfigToFy202627(config) {
  let changed = false;
  const completedSlabs = completeNewRegimeSlabs(config.newRegimeSlabs);
  if (completedSlabs && completedSlabs !== config.newRegimeSlabs) {
    config.newRegimeSlabs = completedSlabs;
    changed = true;
  }
  const normalizedSurcharge = normalizeNewSurchargeSlabs(config.surchargeSlabs);
  if (normalizedSurcharge && normalizedSurcharge !== config.surchargeSlabs) {
    config.surchargeSlabs = normalizedSurcharge;
    changed = true;
  }
  if (!config.surchargeSlabsOld || config.surchargeSlabsOld.length === 0) {
    config.surchargeSlabsOld = getDefaultSurchargeSlabsOld();
    changed = true;
  }
  if (config.healthEducationCess == null) {
    config.healthEducationCess = 4;
    changed = true;
  }
  if (!config.oldRegimeSlabsSenior || config.oldRegimeSlabsSenior.length === 0) {
    config.oldRegimeSlabsSenior = getDefaultOldRegimeSlabsSenior();
    changed = true;
  }
  if (!config.oldRegimeSlabsSuperSenior || config.oldRegimeSlabsSuperSenior.length === 0) {
    config.oldRegimeSlabsSuperSenior = getDefaultOldRegimeSlabsSuperSenior();
    changed = true;
  }
  if (changed) await config.save();
  return config;
}

function getSurchargeSlabsForRegime(tdsConfig, regime) {
  if (regime === 'old') {
    const oldSlabs = tdsConfig?.surchargeSlabsOld;
    if (Array.isArray(oldSlabs) && oldSlabs.length) return oldSlabs;
    return getDefaultSurchargeSlabsOld();
  }
  return normalizeNewSurchargeSlabs(tdsConfig?.surchargeSlabs) || getDefaultSurchargeSlabs();
}

async function createDefaultTDSConfig(org_uuid, financialYear, TDSConfigModel) {
  const config = new TDSConfigModel({
    organizationId: org_uuid,
    financialYear,
    taxRegime: 'new',
    newRegimeSlabs: getDefaultNewRegimeSlabs(),
    oldRegimeSlabs: getDefaultOldRegimeSlabs(),
    oldRegimeSlabsSenior: getDefaultOldRegimeSlabsSenior(),
    oldRegimeSlabsSuperSenior: getDefaultOldRegimeSlabsSuperSenior(),
    standardDeduction: 75000,
    standardDeductionOld: 50000,
    section80CLimit: 150000,
    surchargeSlabs: getDefaultSurchargeSlabs(),
    surchargeSlabsOld: getDefaultSurchargeSlabsOld(),
    healthEducationCess: 4,
    rebateLimit: 1200000,
    rebateAmount: 60000,
    rebateLimitOld: 500000,
    rebateAmountOld: 12500,
    exemptionLimits: getDefaultExemptionLimits(),
  });
  await config.save();
  return config;
}

function getStandardDeductionForRegime(tdsConfig, taxRegime = 'new') {
  const regime = resolveTaxRegime(taxRegime);
  if (regime === 'old') {
    return (
      Number(tdsConfig?.standardDeductionOld) ||
      50000
    );
  }
  return (
    Number(tdsConfig?.standardDeduction) ||
    Number(tdsConfig?.standardDeductionNew) ||
    75000
  );
}

function getRebateForRegime(tdsConfig, taxRegime = 'new') {
  const regime = resolveTaxRegime(taxRegime);
  if (regime === 'old') {
    return {
      rebateLimit: Number(tdsConfig?.rebateLimitOld) || 500000,
      rebateAmount: Number(tdsConfig?.rebateAmountOld) || 12500,
    };
  }
  return {
    rebateLimit: Number(tdsConfig?.rebateLimit) || 1200000,
    rebateAmount: Number(tdsConfig?.rebateAmount) || 60000,
  };
}

/** Remaining payroll months in the TDS window (implementation date → 31 March). */
function getRemainingMonthsInFinancialYear(fy, asOfDate = new Date(), implementationDate = null) {
  return getRemainingPayrollMonthsInTdsPeriod(fy, implementationDate, asOfDate);
}

function calculateMonthlyTdsAmount(annualTax, alreadyDeducted = 0, remainingMonths = 12) {
  const months = Number(remainingMonths);
  if (!Number.isFinite(months) || months <= 0) return 0;
  const remainingLiability = Math.max(0, (Number(annualTax) || 0) - (Number(alreadyDeducted) || 0));
  return Math.round(remainingLiability / months);
}

async function loadPayrollImplementationDate(org_uuid) {
  const { PayrollScheduleModel } = await initModels(org_uuid);
  if (!PayrollScheduleModel) return null;
  const schedule = await PayrollScheduleModel.findOne({ organizationId: org_uuid })
    .select('firstPayPeriod')
    .lean();
  return schedule?.firstPayPeriod || null;
}

function sumTdsAlreadyDeducted(existingTDS, implementationDate) {
  const entries = Array.isArray(existingTDS?.monthlyDeductions) ? existingTDS.monthlyDeductions : [];
  if (implementationDate && entries.length > 0) {
    return entries.reduce((sum, entry) => {
      if (isPayrollMonthBeforeImplementation(entry?.month, entry?.year, implementationDate)) {
        return sum;
      }
      return sum + (Number(entry?.tdsDeducted) || 0);
    }, 0);
  }
  return Number(existingTDS?.totalTDSDeducted) || 0;
}

function summarizeTdsView(projection, deductionsApplied) {
  return {
    taxRegime: projection.effectiveRegime,
    annualIncome: projection.annualIncome,
    hraExemption: projection.hraExemption,
    deductionsApplied,
    taxableIncome: projection.taxableIncome,
    taxCalculation: projection.taxCalculation,
    monthlyTDS: projection.monthlyTDS,
    remainingMonths: projection.remainingMonths,
    payrollImplementationDate: projection.payrollImplementationDate,
    tdsPeriod: projection.tdsPeriod,
  };
}

function clampPayrollMonths(months) {
  const count = Number(months);
  if (!Number.isFinite(count)) return 12;
  return Math.max(0, Math.min(12, count));
}

async function buildTdsProjectionFields({
  org_uuid,
  employee,
  fy,
  tdsConfig,
  existingTDS,
  declaredDeductions,
  itDeclaration,
  taxRegime,
  SalaryCompensationModel,
  EmployeeLoanModel,
}) {
  const projection = await computeEmployeeTdsProjection({
    org_uuid,
    employee,
    fy,
    tdsConfig,
    existingTDS,
    taxRegime,
    declaredDeductions,
    hraDetails: null,
    otherIncome: null,
    SalaryCompensationModel,
    EmployeeLoanModel,
    itDeclarationOverride: itDeclaration,
  });

  const deductionsApplied = computeEffectiveDeductionsTotal(
    projection.normalizedDeductions,
    projection.hraExemption,
    tdsConfig,
    projection.effectiveRegime,
    projection.section10?.total || 0,
    projection.capOptions
  );

  return {
    taxRegime: projection.effectiveRegime,
    projectedAnnualIncome: projection.annualIncome,
    declaredDeductions: {
      ...projection.normalizedDeductions,
      standardDeduction: projection.standardDeductionApplied,
      total: deductionsApplied,
    },
    hraExemption: projection.hraExemption,
    section10Exemptions: projection.section10,
    taxableIncome: projection.taxableIncome,
    taxPayable: projection.taxCalculation,
    rebateApplicable: projection.taxCalculation.rebateApplicable,
    rebateAmount: projection.taxCalculation.rebateAmount,
    monthlyTDS: projection.monthlyTDS,
  };
}

async function computeEmployeeTdsProjection({
  org_uuid,
  employee,
  fy,
  tdsConfig,
  existingTDS = null,
  taxRegime,
  declaredDeductions,
  hraDetails,
  otherIncome,
  SalaryCompensationModel,
  EmployeeLoanModel,
  itDeclarationOverride = null,
  payrollImplementationDate,
}) {
  const implementationSource =
    payrollImplementationDate !== undefined
      ? payrollImplementationDate || null
      : await resolveEmployeeImplementationDate({
          employee,
          organizationId: org_uuid,
          SalaryRevisionModel: (await initModels(org_uuid)).SalaryRevisionModel,
        });
  const resolvedStart = resolvePayrollImplementationStart(implementationSource);
  const implementationDate = resolvedStart.date;
  const tdsPeriod = getTdsCalculationPeriod(fy, implementationDate);
  const openingMonth = getTdsOpeningMonth(tdsPeriod);
  const payrollMonths = clampPayrollMonths(tdsPeriod.equivalentMonths);
  const effectiveRegime = resolveTaxRegime(
    taxRegime ?? existingTDS?.taxRegime,
    tdsConfig.taxRegime
  );
  const normalizedDeductions = normalizeDeductions(
    mergeChapterViaIntoDeductions(
      declaredDeductions || existingTDS?.declaredDeductions || {},
      itDeclarationOverride || existingTDS?.itDeclaration
    )
  );
  const standardDeductionApplied = getStandardDeductionForRegime(tdsConfig, effectiveRegime);

  const hraFromSalary = SalaryCompensationModel
    ? await calculateHRAReceivedFromSalaryComponents(
        employee,
        SalaryCompensationModel,
        org_uuid,
        payrollMonths
      )
    : {
        monthlyAmount: 0,
        annualAmount: null,
        payrollMonths,
        source: 'skipped',
        component: null,
      };

  // Admin/form monthly HRA override (when provided)
  const manualMonthlyHra = Number(hraDetails?.hraReceived);
  const hraReceived =
    Number.isFinite(manualMonthlyHra) && manualMonthlyHra > 0
      ? {
          monthlyAmount: Math.round(manualMonthlyHra),
          annualAmount: Math.round(manualMonthlyHra * payrollMonths),
          payrollMonths,
          source: 'form_override',
          component: hraFromSalary.component,
        }
      : hraFromSalary;

  const effectiveHraDetails = buildHraDetailsFromDeclaration(
    hraDetails,
    itDeclarationOverride || existingTDS?.itDeclaration,
    fy?.startYear,
    tdsPeriod.periodStart
  );

  const fromDeclaration = getOtherIncomeFromItDeclaration(existingTDS?.itDeclaration);
  const effectiveOtherIncome =
    otherIncome !== undefined && otherIncome !== null
      ? Number(otherIncome) || 0
      : fromDeclaration;

  const annualIncome = calculateAnnualIncome(
    employee,
    effectiveOtherIncome,
    hraReceived.annualAmount,
    payrollMonths
  );

  const loanPerquisiteSummary = await calculateEmployeeAnnualLoanPerquisite({
    organizationId: org_uuid,
    employeeId: employee._id,
    EmployeeLoanModel,
    months: payrollMonths,
  });
  annualIncome.loanPerquisite = loanPerquisiteSummary.annualTotal;
  annualIncome.total += loanPerquisiteSummary.annualTotal;

  const incomeBreakdown = buildIncomeBreakdown(employee, annualIncome, tdsPeriod);

  const hraExemption = calculateHRAExemption(
    annualIncome.basic,
    annualIncome.hra,
    effectiveHraDetails,
    payrollMonths
  );

  const declarationForExemptions = itDeclarationOverride || existingTDS?.itDeclaration;
  const monthlySalaryForExemption = Number(employee?.payrollInfo?.baseSalary || employee?.baseSalary || 0);
  const serviceAsOf = fy?.endYear ? new Date(Number(fy.endYear), 2, 31) : null;
  const section10 = calculateSection10Exemptions(
    employee,
    declarationForExemptions,
    effectiveRegime,
    payrollMonths,
    tdsConfig,
    {
      monthlySalary: monthlySalaryForExemption,
      yearsAct: serviceAsOf ? completedServiceYears(employee?.dateOfJoining, serviceAsOf, true) : null,
      yearsPlain: serviceAsOf ? completedServiceYears(employee?.dateOfJoining, serviceAsOf, false) : null,
    }
  );

  const employeeAge = getEmployeeAgeForFy(employee, fy);
  const otherIncomeBreakdown = declarationForExemptions?.otherIncomeBreakdown || {};
  const disabilityType = String(employee?.handicappedInfo?.disabilityType || '').toLowerCase();
  const capOptions = {
    annualBasic: annualIncome.basic,
    annualDa: annualIncome.da || 0,
    annualHra: annualIncome.hra,
    annualRent: hraExemption?.rentPaid || 0,
    annualTotal: annualIncome.total,
    age: employeeAge,
    payrollMonths,
    taxRegime: effectiveRegime,
    fyStartYear: fy?.startYear,
    interestSavings: otherIncomeBreakdown.interestSavings,
    interestFD: otherIncomeBreakdown.interestFD,
    assesseeDisabled: isSpecifiedDisabledEmployee(employee),
    assesseeSevere: disabilityType.includes('severe'),
  };
  const professionalTaxForIncome = effectiveRegime === 'old' ? (Number(normalizedDeductions.professionalTax) || 0) : 0;
  const hraForIncome = effectiveRegime === 'old' ? (Number(hraExemption?.exemptAmount) || 0) : 0;
  capOptions.incomeBeforeSection24 = annualIncome.total
    - standardDeductionApplied
    - professionalTaxForIncome
    - hraForIncome
    - (Number(section10?.total) || 0);
  const cappedDeductions = applyCappedDeductionsForTax(normalizedDeductions, tdsConfig, capOptions);
  const taxableIncome = calculateTaxableIncome(
    annualIncome,
    normalizedDeductions,
    hraExemption,
    tdsConfig,
    effectiveRegime,
    section10.total,
    capOptions
  );
  const taxCalculation = calculateTax(taxableIncome, effectiveRegime, tdsConfig, { age: employeeAge });

  const alreadyDeducted = sumTdsAlreadyDeducted(existingTDS, implementationDate);
  const remainingMonths = getRemainingMonthsInFinancialYear(fy, new Date(), implementationDate);
  const monthlyTDS = calculateMonthlyTdsAmount(
    taxCalculation.total,
    alreadyDeducted,
    remainingMonths
  );

  return {
    effectiveRegime,
    normalizedDeductions,
    cappedDeductions,
    standardDeductionApplied,
    hraReceived,
    annualIncome,
    hraExemption,
    section10,
    taxableIncome,
    taxCalculation,
    monthlyTDS,
    loanPerquisiteSummary,
    remainingMonths,
    alreadyDeducted,
    payrollImplementationDate: implementationDate,
    payrollScheduleDate: resolvedStart.payrollScheduleDate,
    startDateSource: resolvedStart.source,
    incomeBreakdown,
    capOptions,
    tdsPeriod: {
      start: tdsPeriod.periodStart,
      end: tdsPeriod.periodEnd,
      applicableMonths: payrollMonths,
      implementationDateIncluded: true,
      payrollImplementationDate: implementationDate,
      payrollScheduleDate: resolvedStart.payrollScheduleDate,
      startDateSource: resolvedStart.source,
      openingMonth,
    },
  };
}

function resolvePayrollImplementationStart(effectiveFrom) {
  const payrollScheduleDate = toCalendarDate(effectiveFrom);
  if (payrollScheduleDate) {
    return {
      date: payrollScheduleDate,
      source: 'effective_from',
      payrollScheduleDate,
    };
  }
  return {
    date: null,
    source: 'financial_year_start',
    payrollScheduleDate: null,
  };
}

async function calculateHRAReceivedFromSalaryComponents(
  employee,
  SalaryCompensationModel,
  org_uuid,
  payrollMonths = 12
) {
  const months = clampPayrollMonths(payrollMonths);
  const monthlyBasic = Number(employee.payrollInfo?.baseSalary || employee.baseSalary || 0);
  const monthlyGross = Number(employee.payrollInfo?.grossSalary || employee.grossSalary || monthlyBasic * 1.3 || 0);
  const monthlyCTC = Number(employee.payrollInfo?.ctc || employee.ctc || monthlyGross || 0);
  const earningsConfig = await SalaryCompensationModel.findOne({
    organizationId: org_uuid,
    category: 'earnings',
  }).lean();

  const hraComponent = (earningsConfig?.components || []).find((component) => {
    if ((component.status || 'active') !== 'active') return false;
    const code = String(component.code || '').trim().toLowerCase();
    const name = String(component.name || '').trim().toLowerCase();
    return code === 'hra' || name === 'hra' || name.includes('house rent') || name.includes('hra');
  });

  const monthlyAmount = hraComponent
    ? calculateSalaryComponentMonthlyAmount(hraComponent, { monthlyBasic, monthlyGross, monthlyCTC })
    : monthlyGross * 0.4;

  return {
    monthlyAmount: Math.round(monthlyAmount),
    annualAmount: Math.round(monthlyAmount * months),
    payrollMonths: months,
    source: hraComponent ? 'salary_component' : 'fallback_gross_40_percent',
    component: hraComponent
      ? {
          name: hraComponent.name || '',
          code: hraComponent.code || '',
          calculationType: hraComponent.calculationType || '',
          value: Number(hraComponent.value) || 0,
          basedOn: hraComponent.basedOn || '',
        }
      : null,
  };
}

function calculateSalaryComponentMonthlyAmount(component, salaryBase) {
  const value = Number(component.value) || 0;
  if (component.calculationType === 'fixed' || component.calculationType === 'variable') {
    return Math.max(0, value);
  }

  if (component.calculationType === 'percentage') {
    const basedOn = String(component.basedOn || 'basic').toLowerCase();
    const base =
      basedOn === 'gross'
        ? salaryBase.monthlyGross
        : basedOn === 'ctc'
          ? salaryBase.monthlyCTC
          : salaryBase.monthlyBasic;
    return Math.max(0, (base * value) / 100);
  }

  return 0;
}

function getRentDetailsFromItDeclaration(itDeclaration = {}, fyStartYear = null, periodStart = null) {
  if (!itDeclaration?.stayingInRentedHouse) {
    return {
      monthlyRent: 0,
      annualRent: 0,
      cityType: 'Non-Metro',
      isMetroCity: false,
      entries: 0,
    };
  }

  const rentEntries = Array.isArray(itDeclaration?.rentEntries) ? itDeclaration.rentEntries : [];
  const { annualRent, isMetroCity } = computeAnnualRentFromEntries(
    rentEntries,
    fyStartYear,
    periodStart
  );

  return {
    monthlyRent: annualRent > 0 ? Math.round(annualRent / 12) : 0,
    annualRent: Math.round(annualRent),
    cityType: isMetroCity ? 'Metro' : 'Non-Metro',
    isMetroCity,
    entries: rentEntries.length,
  };
}

function buildHraDetailsFromDeclaration(
  hraDetails = {},
  itDeclaration = {},
  fyStartYear = null,
  periodStart = null
) {
  if (hraDetails && Object.keys(hraDetails).length > 0) {
    return hraDetails;
  }

  const rentDetails = getRentDetailsFromItDeclaration(itDeclaration, fyStartYear, periodStart);
  return {
    rentPaid: rentDetails.monthlyRent,
    isMetroCity: rentDetails.isMetroCity,
    cityType: rentDetails.cityType,
    annualRent: rentDetails.annualRent,
  };
}

function buildIncomeBreakdown(employee, annualIncome, tdsPeriod) {
  const monthlyBasic = Number(employee?.payrollInfo?.baseSalary || employee?.baseSalary || 0);
  const monthlyGross = Number(
    employee?.payrollInfo?.grossSalary || employee?.grossSalary || monthlyBasic * 1.3
  );
  const salaryIncome = Math.round(Number(annualIncome?.gross) || 0);
  const otherIncome = Math.round(Number(annualIncome?.otherIncome) || 0);
  const loanPerquisite = Math.round(Number(annualIncome?.loanPerquisite) || 0);
  return {
    monthlyGross: Math.round(monthlyGross),
    equivalentMonths: Number(tdsPeriod?.equivalentMonths) || 0,
    months: buildTdsIncomeMonths(
      tdsPeriod?.periodStart,
      tdsPeriod?.periodEnd,
      monthlyGross,
      salaryIncome
    ),
    salaryIncome,
    otherIncome,
    loanPerquisite,
    total: Math.round(Number(annualIncome?.total) || 0),
  };
}

function calculateAnnualIncome(employee, otherIncome = 0, annualHRAOverride = null, payrollMonths = 12) {
  const months = clampPayrollMonths(payrollMonths);
  const normalizedOtherIncome = Number(otherIncome) || 0;
  const monthlyBasic = employee.payrollInfo?.baseSalary || employee.baseSalary || 0;
  const basic = monthlyBasic * months;
  const gross = (employee.payrollInfo?.grossSalary || employee.grossSalary || monthlyBasic * 1.3) * months;
  const hra = annualHRAOverride !== null ? Number(annualHRAOverride) || 0 : gross * 0.4;
  const allowances = gross - basic - hra;

  return {
    basic,
    gross,
    hra,
    allowances,
    otherIncome: normalizedOtherIncome,
    total: gross + normalizedOtherIncome,
  };
}

function nonNegativeMoney(value) {
  return Math.max(0, Number(value) || 0);
}

function exemptionChildCount(employee, declared = {}, maxChildren = 2) {
  const fromForm = Number(declared.childrenCount);
  const fromProfile = Number(employee?.maritalInfo?.numberOfChildren);
  const count = Number.isFinite(fromForm) && fromForm > 0 ? fromForm : (Number(fromProfile) || 0);
  const cap = Math.max(0, Math.floor(Number(maxChildren) || 0));
  return Math.min(cap, Math.max(0, Math.floor(count)));
}

function isSpecifiedDisabledEmployee(employee) {
  const flag = String(employee?.handicappedInfo?.handicapped || '').trim().toLowerCase();
  return flag === 'yes' || flag === 'true' || flag === 'y' || flag === '1';
}

/** Section 10 salary exemptions. Caps come from TDS Other configuration. HRA is calculated separately. */
function calculateSection10Exemptions(employee, declaration, taxRegime, payrollMonths = 12, tdsConfig = {}, service = {}) {
  const plainDeclaration = toPlainItDeclaration(declaration);
  const src = plainDeclaration.salaryExemptions || {};
  const months = clampPayrollMonths(payrollMonths);
  const limits = getExemptionLimits(tdsConfig);
  const children = exemptionChildCount(employee, src, limits.childrenEducationMaxChildren);
  const hostelChildren = exemptionChildCount(employee, src, limits.hostelMaxChildren);
  const lifeInsurance = capToLimit(src.lifeInsuranceExempt, limits.lifeInsurance);
  const old = resolveTaxRegime(taxRegime) === 'old';

  if (!old) {
    return {
      total: lifeInsurance,
      lifeInsurance,
      lifeInsuranceReceived: nonNegativeMoney(src.lifeInsuranceExempt),
      children,
      disabled: false,
      limits,
    };
  }

  const childrenEducation = Math.round(Math.min(
    nonNegativeMoney(src.childrenEducationReceived),
    limits.childrenEducationPerMonth * children * months,
    limits.childrenEducationAnnualCap
  ));
  const hostel = Math.round(Math.min(
    nonNegativeMoney(src.hostelAllowanceReceived),
    limits.hostelPerMonth * hostelChildren * months,
    limits.hostelAnnualCap
  ));
  const disabled = isSpecifiedDisabledEmployee(employee);
  const disabledTransport = disabled
    ? Math.min(nonNegativeMoney(src.disabledTransportReceived), limits.disabledTransportPerMonth * months)
    : 0;
  const lta = capToLimit(src.ltaEligibleTravel, limits.lta);
  const monthlySalary = Number(service.monthlySalary) || 0;
  const yearsAct = service.yearsAct == null ? null : service.yearsAct;
  const yearsPlain = service.yearsPlain == null ? null : service.yearsPlain;
  const gratuity = gratuityExempt(src.gratuityReceived, limits.gratuity, monthlySalary, yearsAct, service.gratuityActCovered !== false);
  const leaveEncashment = leaveEncashmentExempt(src.leaveEncashmentReceived, limits.leaveEncashment, monthlySalary);
  const retrenchment = retrenchmentExempt(src.retrenchmentReceived, limits.retrenchment, monthlySalary, yearsAct);
  const vrs = vrsExempt(src.vrsReceived, limits.vrs, monthlySalary, yearsPlain);
  const officialDuty = capToLimit(src.officialDutySpent, limits.officialDuty);
  const total = childrenEducation + hostel + disabledTransport + lta + gratuity
    + leaveEncashment + retrenchment + vrs + officialDuty + lifeInsurance;

  return {
    total,
    children,
    disabled,
    limits,
    childrenEducation,
    childrenEducationReceived: nonNegativeMoney(src.childrenEducationReceived),
    hostel,
    hostelReceived: nonNegativeMoney(src.hostelAllowanceReceived),
    disabledTransport,
    disabledTransportReceived: nonNegativeMoney(src.disabledTransportReceived),
    lta,
    ltaReceived: nonNegativeMoney(src.ltaEligibleTravel),
    gratuity,
    gratuityReceived: nonNegativeMoney(src.gratuityReceived),
    leaveEncashment,
    leaveEncashmentReceived: nonNegativeMoney(src.leaveEncashmentReceived),
    retrenchment,
    retrenchmentReceived: nonNegativeMoney(src.retrenchmentReceived),
    vrs,
    vrsReceived: nonNegativeMoney(src.vrsReceived),
    officialDuty,
    officialDutyReceived: nonNegativeMoney(src.officialDutySpent),
    lifeInsurance,
    lifeInsuranceReceived: nonNegativeMoney(src.lifeInsuranceExempt),
    notes: {
      gratuity: yearsAct == null
        ? `Exempt up to ₹${Number(limits.gratuity || 0).toLocaleString('en-IN')}. Joining date was missing, so the 15-day salary formula was not applied.`
        : `Least of gratuity received, 15 days' salary × ${yearsAct} years, and ₹${Number(limits.gratuity || 0).toLocaleString('en-IN')}.`,
      leave: monthlySalary > 0
        ? `Least of leave encashment received, 10 months' salary, and ₹${Number(limits.leaveEncashment || 0).toLocaleString('en-IN')}.`
        : `Exempt up to ₹${Number(limits.leaveEncashment || 0).toLocaleString('en-IN')}.`,
      retrenchment: yearsAct == null
        ? `Exempt up to ₹${Number(limits.retrenchment || 0).toLocaleString('en-IN')}.`
        : `Least of compensation received, 15 days' pay × ${yearsAct} years, and ₹${Number(limits.retrenchment || 0).toLocaleString('en-IN')}.`,
      vrs: yearsPlain == null
        ? `Exempt up to ₹${Number(limits.vrs || 0).toLocaleString('en-IN')}.`
        : `Least of VRS received, 3 months' salary × ${yearsPlain} years, and ₹${Number(limits.vrs || 0).toLocaleString('en-IN')}.`,
    },
  };
}

function calculateHRAExemption(annualBasic, annualHRA, hraDetails = {}, rentMonthFactor = 12) {
  const annualRentOverride = Number(hraDetails.annualRent);
  if (!hraDetails.rentPaid && !(Number.isFinite(annualRentOverride) && annualRentOverride > 0)) {
    return {
      actualHRA: annualHRA,
      rentPaid: 0,
      basic: annualBasic,
      rentMinusTenPercent: 0,
      percentOfBasic: 0,
      isMetro: false,
      exemptAmount: 0,
    };
  }

  const { rentPaid, isMetroCity, cityType } = hraDetails;
  const normalizedRentPaid = Number(rentPaid) || 0;
  const city = String(cityType || '').trim().toLowerCase();
  const metroCity =
    typeof isMetroCity === 'boolean'
      ? isMetroCity
      : city === 'metro' || city === 'metropolitan';
  const rentMonths = clampPayrollMonths(rentMonthFactor);
  const annualRent =
    Number.isFinite(annualRentOverride) && annualRentOverride > 0
      ? annualRentOverride
      : normalizedRentPaid * rentMonths;

  // Three calculations as per IT rules
  const calc1 = annualHRA;
  const calc2 = annualRent - (annualBasic * 0.1);
  const calc3 = metroCity ? (annualBasic * 0.5) : (annualBasic * 0.4);

  const exemptAmount = Math.min(calc1, calc2, calc3);

  return {
    actualHRA: annualHRA,
    rentPaid: annualRent,
    basic: annualBasic,
    rentMinusTenPercent: Math.max(0, calc2),
    percentOfBasic: calc3,
    isMetro: metroCity,
    exemptAmount: Math.max(0, exemptAmount),
  };
}

/** Returns 'old' | 'new' | null (empty). undefined = invalid input. */
function parseTaxRegimeInput(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  if (
    normalized === 'old' ||
    normalized.startsWith('old_') ||
    normalized === 'oldregime' ||
    normalized === 'old_regime'
  ) {
    return 'old';
  }
  if (
    normalized === 'new' ||
    normalized.startsWith('new_') ||
    normalized === 'newregime' ||
    normalized === 'new_regime'
  ) {
    return 'new';
  }
  return undefined;
}

function resolveTaxRegime(...candidates) {
  for (const value of candidates) {
    const parsed = parseTaxRegimeInput(value);
    if (parsed) return parsed;
  }
  return 'new';
}

function calculateTaxableIncome(annualIncome, declaredDeductions = {}, hraExemption, tdsConfig, taxRegime = 'new', section10Exempt = 0, capOptions = {}) {
  const totalIncome = annualIncome.total;
  const totalDeductions = computeEffectiveDeductionsTotal(
    declaredDeductions,
    hraExemption,
    tdsConfig,
    taxRegime,
    section10Exempt,
    {
      ...capOptions,
      annualTotal: totalIncome,
      annualBasic: capOptions.annualBasic ?? annualIncome.basic,
      annualDa: capOptions.annualDa ?? annualIncome.da,
      annualHra: capOptions.annualHra ?? annualIncome.hra,
      annualRent: capOptions.annualRent ?? hraExemption?.rentPaid,
    }
  );
  return Math.max(0, totalIncome - totalDeductions);
}

/** Old regime: 80C/80D, HRA, and section 10 exemptions. New regime: standard deduction plus eligible 10(10D). */
function computeEffectiveDeductionsTotal(declaredDeductions = {}, hraExemption = {}, tdsConfig, taxRegime = 'new', section10Exempt = 0, capOptions = {}) {
  const regime = resolveTaxRegime(taxRegime);
  const standardDeduction = getStandardDeductionForRegime(tdsConfig, regime);
  const section10 = Math.max(0, Number(section10Exempt) || 0);
  const hraExempt = regime === 'old' ? (hraExemption?.exemptAmount || 0) : 0;
  const professionalTax = regime === 'old' ? (Number(declaredDeductions.professionalTax) || 0) : 0;
  let incomeBeforeSection24 = Number(capOptions.incomeBeforeSection24);
  if (!Number.isFinite(incomeBeforeSection24) && Number.isFinite(Number(capOptions.annualTotal))) {
    incomeBeforeSection24 = Number(capOptions.annualTotal) - standardDeduction - professionalTax - hraExempt - section10;
  }
  const capped = applyCappedDeductionsForTax(declaredDeductions, tdsConfig, {
    ...capOptions,
    taxRegime: regime,
    incomeBeforeSection24,
    annualHra: capOptions.annualHra,
    annualRent: capOptions.annualRent ?? hraExemption?.rentPaid,
  });

  if (regime !== 'old') {
    return standardDeduction + section10 + capped.section80CCD2;
  }

  return (
    standardDeduction +
    capped.section80C +
    capped.section80CCC +
    capped.section80CCD1 +
    capped.section80CCD1B +
    capped.section80CCD2 +
    capped.section80D +
    capped.section80DD +
    capped.section80U +
    capped.section80DDB +
    capped.section80E +
    capped.section80EE +
    capped.section80EEA +
    capped.section80G +
    capped.section80GG +
    capped.section80GGA +
    capped.section80GGC +
    capped.section80TTA +
    capped.section80TTB +
    capped.section24 +
    professionalTax +
    capped.otherDeductions +
    hraExempt +
    section10
  );
}

function calculateTax(taxableIncome, taxRegime, tdsConfig, options = {}) {
  const regime = resolveTaxRegime(taxRegime);
  const age = options.age;
  const ageCategory = regime === 'old' ? oldRegimeAgeCategory(age) : null;
  const rawSlabs = regime === 'new' ? tdsConfig.newRegimeSlabs : getOldRegimeSlabsForAge(tdsConfig, age);
  const slabs = regime === 'new'
    ? (completeNewRegimeSlabs(rawSlabs) || getDefaultNewRegimeSlabs())
    : rawSlabs;
  let incomeTax = 0;
  const slabBreakdown = [];

  for (const slab of slabs) {
    if (taxableIncome > slab.incomeFrom) {
      const taxableAmount = Math.max(0, Math.min(taxableIncome, slab.incomeTo) - slab.incomeFrom);
      const tax = (taxableAmount * slab.taxRate) / 100;
      incomeTax += tax;
      if (taxableAmount > 0) {
        slabBreakdown.push({
          incomeFrom: slab.incomeFrom,
          incomeTo: slab.incomeTo,
          rate: slab.taxRate,
          taxableAmount: Math.round(taxableAmount),
          tax: Math.round(tax),
        });
      }
    }
  }

  // Calculate surcharge (new regime caps at 25%; old regime is 37% above ₹5 crore)
  let surcharge = 0;
  let surchargeRate = 0;
  for (const slab of getSurchargeSlabsForRegime(tdsConfig, regime)) {
    if (taxableIncome >= slab.incomeFrom && taxableIncome <= slab.incomeTo) {
      surchargeRate = slab.surchargeRate;
      surcharge = (incomeTax * slab.surchargeRate) / 100;
      break;
    }
  }

  // Calculate cess
  const cessRate = tdsConfig.healthEducationCess || 4;
  const cess = ((incomeTax + surcharge) * cessRate) / 100;

  // Total tax before rebate
  let total = Math.round(incomeTax + surcharge + cess);

  // Section 87A — regime-specific limits
  const { rebateLimit, rebateAmount: maxRebate } = getRebateForRegime(tdsConfig, regime);
  let rebateApplicable = false;
  let rebateAmount = 0;
  if (taxableIncome <= rebateLimit) {
    rebateApplicable = true;
    rebateAmount = Math.min(total, maxRebate);
    total = Math.max(0, total - rebateAmount);
  }

  return {
    incomeTax: Math.round(incomeTax),
    surcharge: Math.round(surcharge),
    surchargeRate,
    cess: Math.round(cess),
    cessRate,
    total,
    rebateApplicable,
    rebateAmount,
    slabBreakdown,
    age: regime === 'old' ? age : null,
    ageCategory,
    dobMissing: regime === 'old' && age == null,
  };
}

function moneyAmount(value) {
  return Math.max(0, Number(value) || 0);
}

function normalizeDeductions(deductions = {}) {
  const severe = deductions.section80DDSevere === true
    || deductions.section80DDSevere === 'true'
    || deductions.section80DDSevere === 1;
  return {
    section80C: moneyAmount(deductions.section80C),
    section80CCC: moneyAmount(deductions.section80CCC),
    section80CCD1: moneyAmount(deductions.section80CCD1),
    section80CCD1B: moneyAmount(deductions.section80CCD1B),
    section80CCD2: moneyAmount(deductions.section80CCD2),
    section80D: moneyAmount(deductions.section80D),
    section80DD: moneyAmount(deductions.section80DD),
    section80DDSevere: severe,
    section80DDB: moneyAmount(deductions.section80DDB),
    section80E: moneyAmount(deductions.section80E),
    section80EE: moneyAmount(deductions.section80EE),
    section80EEA: moneyAmount(deductions.section80EEA),
    section80G: moneyAmount(deductions.section80G),
    section80GG: moneyAmount(deductions.section80GG),
    section80GGA: moneyAmount(deductions.section80GGA),
    section80GGC: moneyAmount(deductions.section80GGC),
    section80TTA: moneyAmount(deductions.section80TTA),
    section24: moneyAmount(deductions.section24),
    professionalTax: moneyAmount(deductions.professionalTax),
    otherDeductions: moneyAmount(deductions.otherDeductions),
    section80DSelf: moneyAmount(deductions.section80DSelf),
    section80DParents: moneyAmount(deductions.section80DParents),
    section80DPreventive: moneyAmount(deductions.section80DPreventive),
    section80DPreventiveSelf: moneyAmount(deductions.section80DPreventiveSelf),
    section80DPreventiveParents: moneyAmount(deductions.section80DPreventiveParents),
    section80DMedicalSelf: moneyAmount(deductions.section80DMedicalSelf),
    section80DMedicalParents: moneyAmount(deductions.section80DMedicalParents),
    section80DSelfSenior: deductions.section80DSelfSenior === true || deductions.section80DSelfSenior === 'true',
    section80DParentsSenior: deductions.section80DParentsSenior === true || deductions.section80DParentsSenior === 'true',
    section80DDBReimbursed: moneyAmount(deductions.section80DDBReimbursed),
    section80G50: moneyAmount(deductions.section80G50),
    section80G100Limited: moneyAmount(deductions.section80G100Limited),
    section80G50Limited: moneyAmount(deductions.section80G50Limited),
    section80EStartYear: Number(deductions.section80EStartYear) || 0,
  };
}

function mergeChapterViaIntoDeductions(deductions = {}, declaration = {}) {
  const chapter = declaration?.chapterVIA || {};
  const merged = { ...deductions };
  [
    'section80CCC',
    'section80CCD1',
    'section80CCD1B',
    'section80CCD2',
    'section80DD',
    'section80DDB',
    'section80EE',
    'section80EEA',
    'section80GG',
    'section80GGA',
    'section80GGC',
    'section80TTA',
    'section80G50',
    'section80G100Limited',
    'section80G50Limited',
    'section80DSelf',
    'section80DParents',
    'section80DPreventive',
    'section80DPreventiveSelf',
    'section80DPreventiveParents',
    'section80DMedicalSelf',
    'section80DMedicalParents',
    'section80DDBReimbursed',
  ].forEach((key) => {
    if (!(Number(merged[key]) > 0) && Number(chapter[key]) > 0) {
      merged[key] = Number(chapter[key]);
    }
  });
  if (merged.section80DDSevere == null && chapter.section80DDSevere != null) {
    merged.section80DDSevere = chapter.section80DDSevere;
  }
  if (chapter.section80DSelfSenior != null) merged.section80DSelfSenior = chapter.section80DSelfSenior;
  if (chapter.section80DParentsSenior != null) merged.section80DParentsSenior = chapter.section80DParentsSenior;
  if (!(Number(merged.section80EStartYear) > 0) && Number(chapter.section80EStartYear) > 0) {
    merged.section80EStartYear = Number(chapter.section80EStartYear);
  }
  return merged;
}

function parseInvestmentRequestBody(body = {}) {
  const parsed = { ...body };
  for (const fieldName of ['investments80C', 'investments80D', 'itDeclaration', 'declaredDeductions']) {
    if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
      parsed[fieldName] = parseJsonField(body[fieldName], fieldName);
    }
  }
  return parsed;
}

function parseJsonField(value, fieldName) {
  if (value === undefined || value === null || typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }
}

async function uploadInvestmentDeclarationFiles(files = {}) {
  const [
    rentAttachments,
    homeLoanAttachments,
    letOutPropertyAttachments,
    investment80CAttachments,
    investment80DAttachments,
    otherInvestmentAttachments,
    otherIncomeAttachments,
  ] = await Promise.all([
    uploadFiles(files.rentAttachments),
    uploadFiles(files.homeLoanAttachment),
    uploadFiles(files.letOutPropertyAttachment),
    uploadFiles(files.investment80CAttachments),
    uploadFiles(files.investment80DAttachments),
    uploadFiles(files.otherInvestmentAttachments),
    uploadFiles(files.otherIncomeAttachment),
  ]);

  return {
    rentAttachments,
    homeLoanAttachment: homeLoanAttachments[0] || '',
    letOutPropertyAttachment: letOutPropertyAttachments[0] || '',
    investment80CAttachments,
    investment80DAttachments,
    otherInvestmentAttachments,
    otherIncomeAttachment: otherIncomeAttachments[0] || '',
  };
}

async function uploadFiles(files = []) {
  const urls = [];
  for (const file of files || []) {
    const uploaded = await uploadFile(file);
    if (uploaded?.url) urls.push(uploaded.url);
  }
  return urls;
}

function normalizeAttachment(value) {
  return String(value ?? '').trim().slice(0, 2048);
}

function pickAttachment(currentValue, uploadedValue, fallbackValue = '') {
  return normalizeAttachment(uploadedValue || currentValue || fallbackValue);
}

function parseBooleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;
  }
  return Boolean(value);
}

function normalizeProofStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['approved', 'approve', 'verified', 'verify'].includes(normalized)) return 'approved';
  if (['rejected', 'reject'].includes(normalized)) return 'rejected';
  return null;
}

function defaultItDeclaration() {
  return {
    stayingInRentedHouse: false,
    rentEntries: [],
    homeLoanSelfOccupied: {
      enabled: false,
      principalPaid: 0,
      interestPaid: 0,
      lenderName: '',
      lenderPAN: '',
      attachment: '',
    },
    letOutPropertyEnabled: false,
    letOutPropertyAttachment: '',
    investmentsOther: [],
    otherIncomeBreakdown: {
      incomeFromOtherSources: 0,
      interestSavings: 0,
      interestFD: 0,
      interestNSC: 0,
      attachment: '',
    },
    toggles: {
      section80C: true,
      section80D: true,
      otherInvestments: false,
    },
    salaryExemptions: {
      childrenCount: 0,
      childrenEducationReceived: 0,
      hostelAllowanceReceived: 0,
      ltaEligibleTravel: 0,
      disabledTransportReceived: 0,
      gratuityReceived: 0,
      leaveEncashmentReceived: 0,
      retrenchmentReceived: 0,
      vrsReceived: 0,
      officialDutySpent: 0,
      lifeInsuranceExempt: 0,
    },
    chapterVIA: {
      section80CCC: 0,
      section80CCD1: 0,
      section80CCD1B: 0,
      section80CCD2: 0,
      section80DD: 0,
      section80DDSevere: false,
      section80DDB: 0,
      section80EE: 0,
      section80EEA: 0,
      section80GG: 0,
      section80GGA: 0,
      section80GGC: 0,
      section80TTA: 0,
    },
  };
}

function toPlainItDeclaration(doc) {
  if (!doc) return {};
  if (typeof doc.toObject === 'function') return doc.toObject();
  try {
    return JSON.parse(JSON.stringify(doc));
  } catch {
    return { ...doc };
  }
}

function mergeItDeclaration(prevRaw, incoming, uploadedAttachments = {}) {
  const base = { ...defaultItDeclaration(), ...toPlainItDeclaration(prevRaw) };
  base.homeLoanSelfOccupied = {
    ...defaultItDeclaration().homeLoanSelfOccupied,
    ...toPlainItDeclaration(base.homeLoanSelfOccupied),
  };
  base.otherIncomeBreakdown = {
    ...defaultItDeclaration().otherIncomeBreakdown,
    ...toPlainItDeclaration(base.otherIncomeBreakdown),
  };
  base.toggles = { ...defaultItDeclaration().toggles, ...toPlainItDeclaration(base.toggles) };
  base.rentEntries = Array.isArray(base.rentEntries)
    ? sanitizeRentEntries(base.rentEntries, uploadedAttachments.rentAttachments, base.rentEntries)
    : [];
  base.investmentsOther = Array.isArray(base.investmentsOther)
    ? sanitizeOtherInvestmentLines(
        base.investmentsOther,
        uploadedAttachments.otherInvestmentAttachments,
        base.investmentsOther
      )
    : [];

  if (uploadedAttachments.homeLoanAttachment) {
    base.homeLoanSelfOccupied.attachment = uploadedAttachments.homeLoanAttachment;
  }
  if (uploadedAttachments.letOutPropertyAttachment) {
    base.letOutPropertyAttachment = uploadedAttachments.letOutPropertyAttachment;
  }
  if (uploadedAttachments.otherIncomeAttachment) {
    base.otherIncomeBreakdown.attachment = uploadedAttachments.otherIncomeAttachment;
  }

  if (!incoming || typeof incoming !== 'object') {
    return base;
  }

  if (incoming.stayingInRentedHouse !== undefined) {
    base.stayingInRentedHouse = parseBooleanValue(incoming.stayingInRentedHouse);
  }
  if (incoming.rentEntries !== undefined) {
    base.rentEntries = sanitizeRentEntries(
      incoming.rentEntries,
      uploadedAttachments.rentAttachments,
      base.rentEntries
    );
  }
  if (incoming.letOutPropertyEnabled !== undefined) {
    base.letOutPropertyEnabled = parseBooleanValue(incoming.letOutPropertyEnabled);
  }
  if (incoming.letOutPropertyAttachment !== undefined || uploadedAttachments.letOutPropertyAttachment) {
    base.letOutPropertyAttachment = pickAttachment(
      incoming.letOutPropertyAttachment,
      uploadedAttachments.letOutPropertyAttachment,
      base.letOutPropertyAttachment
    );
  }
  if (incoming.investmentsOther !== undefined) {
    base.investmentsOther = sanitizeOtherInvestmentLines(
      incoming.investmentsOther,
      uploadedAttachments.otherInvestmentAttachments,
      base.investmentsOther
    );
  }

  if (incoming.homeLoanSelfOccupied !== undefined && incoming.homeLoanSelfOccupied !== null) {
    const h = incoming.homeLoanSelfOccupied;
    const cur = { ...base.homeLoanSelfOccupied };
    if (h.enabled !== undefined) cur.enabled = parseBooleanValue(h.enabled);
    if (h.principalPaid !== undefined) cur.principalPaid = Math.max(0, Number(h.principalPaid) || 0);
    if (h.interestPaid !== undefined) cur.interestPaid = Math.max(0, Number(h.interestPaid) || 0);
    if (h.lenderName !== undefined) cur.lenderName = String(h.lenderName || '').trim().slice(0, 200);
    if (h.lenderPAN !== undefined) cur.lenderPAN = String(h.lenderPAN || '').trim().slice(0, 20).toUpperCase();
    if (h.attachment !== undefined || h.attachmentUrl !== undefined || uploadedAttachments.homeLoanAttachment) {
      cur.attachment = pickAttachment(
        h.attachment ?? h.attachmentUrl,
        uploadedAttachments.homeLoanAttachment,
        cur.attachment
      );
    }
    base.homeLoanSelfOccupied = cur;
  }

  if (incoming.otherIncomeBreakdown !== undefined && incoming.otherIncomeBreakdown !== null) {
    base.otherIncomeBreakdown = {
      ...base.otherIncomeBreakdown,
      ...sanitizeOtherIncomeBreakdown(
        incoming.otherIncomeBreakdown,
        uploadedAttachments.otherIncomeAttachment,
        base.otherIncomeBreakdown
      ),
    };
  }

  if (incoming.toggles !== undefined && incoming.toggles !== null) {
    const t = incoming.toggles;
    if (t.section80C !== undefined) base.toggles.section80C = parseBooleanValue(t.section80C);
    if (t.section80D !== undefined) base.toggles.section80D = parseBooleanValue(t.section80D);
    if (t.otherInvestments !== undefined) base.toggles.otherInvestments = parseBooleanValue(t.otherInvestments);
  }

  if (incoming.salaryExemptions !== undefined && incoming.salaryExemptions !== null) {
    const current = { ...defaultItDeclaration().salaryExemptions, ...toPlainItDeclaration(base.salaryExemptions) };
    const incomingExemptions = toPlainItDeclaration(incoming.salaryExemptions);
    for (const key of Object.keys(defaultItDeclaration().salaryExemptions)) {
      if (incomingExemptions[key] !== undefined) {
        current[key] = Math.max(0, Number(incomingExemptions[key]) || 0);
      }
    }
    base.salaryExemptions = current;
  }

  if (incoming.chapterVIA !== undefined && incoming.chapterVIA !== null) {
    const current = { ...defaultItDeclaration().chapterVIA, ...toPlainItDeclaration(base.chapterVIA) };
    const incomingChapter = toPlainItDeclaration(incoming.chapterVIA);
    for (const key of Object.keys(defaultItDeclaration().chapterVIA)) {
      if (incomingChapter[key] === undefined) continue;
      current[key] = key === 'section80DDSevere'
        ? parseBooleanValue(incomingChapter[key])
        : Math.max(0, Number(incomingChapter[key]) || 0);
    }
    base.chapterVIA = current;
  }

  return base;
}

function sanitizeRentEntries(raw, uploadedAttachments = [], fallbackLines = []) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.slice(0, MAX_RENT_ENTRIES).map((r, index) => ({
    fromDate: String(r?.fromDate ?? '').trim().slice(0, 32),
    toDate: String(r?.toDate ?? '').trim().slice(0, 32),
    rentMonthly: Math.max(0, Math.min(Number(r?.rentMonthly) || 0, 1e12)),
    rentAnnual: Math.max(0, Math.min(Number(r?.rentAnnual) || 0, 1e12)),
    address: String(r?.address ?? '').trim().slice(0, 2000),
    landlordName: String(r?.landlordName ?? '').trim().slice(0, 200),
    urbanizationType: String(r?.urbanizationType ?? '').trim().slice(0, 128),
    urbanizationType2: String(r?.urbanizationType2 ?? '').trim().slice(0, 128),
    isMetroCity: parseBooleanValue(r?.isMetroCity),
    attachment: pickAttachment(
      r?.attachment ?? r?.attachmentUrl ?? r?.proofUrl,
      uploadedAttachments[index],
      fallbackLines[index]?.attachment
    ),
  }));
}

function sanitizeOtherIncomeBreakdown(raw, uploadedAttachment = '', fallback = {}) {
  const d = defaultItDeclaration().otherIncomeBreakdown;
  if (!raw || typeof raw !== 'object') {
    return d;
  }
  return {
    incomeFromOtherSources: Math.max(0, Math.min(Number(raw.incomeFromOtherSources) || 0, 1e12)),
    interestSavings: Math.max(0, Math.min(Number(raw.interestSavings) || 0, 1e12)),
    interestFD: Math.max(0, Math.min(Number(raw.interestFD) || 0, 1e12)),
    interestNSC: Math.max(0, Math.min(Number(raw.interestNSC) || 0, 1e12)),
    attachment: pickAttachment(raw.attachment ?? raw.attachmentUrl, uploadedAttachment, fallback.attachment),
  };
}

function sanitizeOtherInvestmentLines(raw, uploadedAttachments = [], fallbackLines = []) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.slice(0, MAX_OTHER_INVESTMENT_LINES).map((item, index) => ({
    investmentType: String(item?.investmentType ?? item?.type ?? '')
      .trim()
      .slice(0, 128),
    amount: Math.max(0, Math.min(Number(item?.amount) || 0, 1e12)),
    attachment: pickAttachment(
      item?.attachment ?? item?.attachmentUrl ?? item?.proofUrl,
      uploadedAttachments[index],
      fallbackLines[index]?.attachment
    ),
  }));
}

function sanitizeProofItems(raw) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(['pending', 'approved', 'rejected']);
  return raw.slice(0, 300).map((item) => ({
    lineKey: String(item?.lineKey || '').trim().slice(0, 80),
    sectionName: String(item?.sectionName || '').trim().slice(0, 120),
    deductionHead: String(item?.deductionHead || '').trim().slice(0, 160),
    requestedAmount: Math.max(0, Math.min(Number(item?.requestedAmount) || 0, 1e12)),
    acceptedAmount: Math.max(0, Math.min(Number(item?.acceptedAmount) || 0, 1e12)),
    status: allowed.has(item?.status) ? item.status : 'pending',
    remark: String(item?.remark || '').trim().slice(0, 500),
  })).filter((item) => item.lineKey);
}

function sanitizeInvestmentLines(raw, uploadedAttachments = [], fallbackLines = []) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.slice(0, MAX_INVESTMENT_LINES).map((item, index) => ({
    investmentType: String(item?.investmentType ?? item?.type ?? '')
      .trim()
      .slice(0, 128),
    amount: Math.max(0, Math.min(Number(item?.amount) || 0, 1e12)),
    attachment: pickAttachment(
      item?.attachment ?? item?.attachmentUrl ?? item?.proofUrl,
      uploadedAttachments[index],
      fallbackLines[index]?.attachment
    ),
  }));
}

function sumLineAmounts(lines) {
  return lines.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

function mapDocInvestmentLines(docLines) {
  if (!Array.isArray(docLines)) {
    return [];
  }
  return docLines.slice(0, MAX_INVESTMENT_LINES).map((x) => ({
    investmentType: String(x?.investmentType ?? '').trim().slice(0, 128),
    amount: Math.max(0, Math.min(Number(x?.amount) || 0, 1e12)),
    attachment: normalizeAttachment(x?.attachment),
  }));
}

function computeDeclaredDeductionsTotal(d) {
  return (
    (Number(d.section80C) || 0) +
    (Number(d.section80D) || 0) +
    (Number(d.section80E) || 0) +
    (Number(d.section80G) || 0) +
    (Number(d.section24) || 0) +
    (Number(d.professionalTax) || 0) +
    (Number(d.otherDeductions) || 0) +
    (Number(d.standardDeduction) || 0)
  );
}

function getOtherIncomeFromItDeclaration(itDeclaration = {}) {
  const otherIncomeBreakdown = itDeclaration?.otherIncomeBreakdown || {};
  return (
    (Number(otherIncomeBreakdown.incomeFromOtherSources) || 0) +
    (Number(otherIncomeBreakdown.interestSavings) || 0) +
    (Number(otherIncomeBreakdown.interestFD) || 0) +
    (Number(otherIncomeBreakdown.interestNSC) || 0)
  );
}

/** Old-regime exemption lines for Save & Compare UI (Figma: exemptions based on declaration). */
function buildExemptionsBasedOnDeclaration(declaredDeductions = {}, hraExemption = {}, tdsConfig = {}, capOptions = {}) {
  const raw80CLimit = Number(tdsConfig?.section80CLimit);
  const section80CLimit = Number.isFinite(raw80CLimit) && raw80CLimit >= 0 ? raw80CLimit : 150000;
  const standardDeduction = getStandardDeductionForRegime(tdsConfig, 'old');
  const professionalTax = Number(declaredDeductions.professionalTax) || 0;
  const capped = applyCappedDeductionsForTax(declaredDeductions, tdsConfig, { ...capOptions, taxRegime: 'old' });

  const allowanceExemptions = Math.max(0, Number(hraExemption?.exemptAmount) || 0);
  const underSection16 = standardDeduction + professionalTax;
  const investments80C = capped.section80C;
  const investments80D = capped.section80D;
  const otherInvestmentAndExemption =
    capped.section80E +
    capped.section80G +
    capped.section24 +
    capped.otherDeductions;

  const totalExemptions =
    allowanceExemptions +
    underSection16 +
    investments80C +
    investments80D +
    otherInvestmentAndExemption;

  return {
    allowanceExemptions,
    underSection16,
    investments80C,
    investments80CMaxLimit: section80CLimit,
    investments80D,
    otherInvestmentAndExemption,
    totalExemptions,
  };
}

async function buildSaveAndCompareSummary(
  org_uuid,
  employeeId,
  fy,
  declaredDeductions = {},
  itDeclaration = {}
) {
  const { EmployeeModel, SalaryCompensationModel, TDSConfigModel, SalaryRevisionModel } = await initModels(org_uuid);
  const employee = await EmployeeModel.findById(employeeId);
  if (!employee) {
    return null;
  }

  const tdsConfig = await findTDSConfigByFY(org_uuid, fy, TDSConfigModel, {
    createIfMissing: true,
  });

  const payrollImplementationDate = await resolveEmployeeImplementationDate({
    employee,
    organizationId: org_uuid,
    SalaryRevisionModel,
  });
  const tdsPeriod = getTdsCalculationPeriod(fy, payrollImplementationDate);
  const payrollMonths = tdsPeriod.equivalentMonths;
  const hraReceived = await calculateHRAReceivedFromSalaryComponents(
    employee,
    SalaryCompensationModel,
    org_uuid,
    payrollMonths
  );
  const hraDetails = buildHraDetailsFromDeclaration(
    {},
    itDeclaration,
    fy?.startYear,
    tdsPeriod.periodStart
  );
  const annualIncome = calculateAnnualIncome(
    employee,
    getOtherIncomeFromItDeclaration(itDeclaration),
    hraReceived.annualAmount,
    payrollMonths
  );
  const hraExemption = calculateHRAExemption(
    annualIncome.basic,
    annualIncome.hra,
    hraDetails,
    payrollMonths
  );

  const compareAsOf = fy?.endYear ? new Date(Number(fy.endYear), 2, 31) : null;
  const compareService = {
    monthlySalary: Number(employee?.payrollInfo?.baseSalary || employee?.baseSalary || 0),
    yearsAct: compareAsOf ? completedServiceYears(employee?.dateOfJoining, compareAsOf, true) : null,
    yearsPlain: compareAsOf ? completedServiceYears(employee?.dateOfJoining, compareAsOf, false) : null,
  };
  const section10Old = calculateSection10Exemptions(employee, itDeclaration, 'old', payrollMonths, tdsConfig, compareService);
  const section10New = calculateSection10Exemptions(employee, itDeclaration, 'new', payrollMonths, tdsConfig, compareService);
  const compareAge = getEmployeeAgeForFy(employee, fy);
  const compareInterest = itDeclaration?.otherIncomeBreakdown || {};
  const compareCap = {
    annualBasic: annualIncome.basic,
    annualTotal: annualIncome.total,
    annualHra: annualIncome.hra,
    annualRent: hraExemption.rentPaid || 0,
    age: compareAge,
    payrollMonths,
    fyStartYear: fy?.startYear,
    interestSavings: compareInterest.interestSavings,
    interestFD: compareInterest.interestFD,
    assesseeDisabled: isSpecifiedDisabledEmployee(employee),
    assesseeSevere: String(employee?.handicappedInfo?.disabilityType || '').toLowerCase().includes('severe'),
  };

  const oldDeductions = computeEffectiveDeductionsTotal(
    declaredDeductions,
    hraExemption,
    tdsConfig,
    'old',
    section10Old.total,
    compareCap
  );
  const newDeductions = computeEffectiveDeductionsTotal(
    declaredDeductions,
    { exemptAmount: 0 },
    tdsConfig,
    'new',
    section10New.total,
    { ...compareCap, annualHra: 0 }
  );

  const oldTaxableIncome = calculateTaxableIncome(
    annualIncome,
    declaredDeductions,
    hraExemption,
    tdsConfig,
    'old',
    section10Old.total,
    compareCap
  );
  const newTaxableIncome = calculateTaxableIncome(
    annualIncome,
    declaredDeductions,
    { exemptAmount: 0 },
    tdsConfig,
    'new',
    section10New.total,
    { ...compareCap, annualHra: 0 }
  );

  const employeeAge = getEmployeeAgeForFy(employee, fy);
  const oldTax = calculateTax(oldTaxableIncome, 'old', tdsConfig, { age: employeeAge });
  const newTax = calculateTax(newTaxableIncome, 'new', tdsConfig);

  const recommendedRegime = oldTax.total <= newTax.total ? 'old' : 'new';
  const taxSaving = Math.abs(oldTax.total - newTax.total);
  const exemptionsBasedOnDeclaration = buildExemptionsBasedOnDeclaration(
    declaredDeductions,
    hraExemption,
    tdsConfig,
    compareCap
  );

  return {
    financialYear: fy.canonical,
    earnings: {
      grossSalary: annualIncome.gross,
      incomeFromOtherSources: annualIncome.otherIncome,
      grossTotalIncome: annualIncome.total,
    },
    oldRegime: {
      exemptionsBasedOnDeclaration,
      totalExemptions: oldDeductions,
      totalTaxableIncome: oldTaxableIncome,
      taxOnTotalTaxableIncome: oldTax.incomeTax,
      rebateUnderSection87A: oldTax.rebateAmount,
      educationCess4Percent: oldTax.cess,
      totalTaxPayable: oldTax.total,
    },
    newRegime: {
      totalExemptions: newDeductions,
      totalTaxableIncome: newTaxableIncome,
      taxOnTotalTaxableIncome: newTax.incomeTax,
      rebateUnderSection87A: newTax.rebateAmount,
      educationCess4Percent: newTax.cess,
      totalTaxPayable: newTax.total,
    },
    recommendedRegime,
    taxSavingAmount: taxSaving,
  };
}
