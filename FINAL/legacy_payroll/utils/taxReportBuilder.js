const { initModels } = require('../models/indexModel');
const {
  resolveFinancialYearInput,
  buildFinancialYearPayrollQuery,
  getPayrollPeriodSortKey,
} = require('./financialYear');

function getIndianFYQuarter(month) {
  const m = String(month || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .slice(0, 3);
  if (['apr', 'may', 'jun'].includes(m)) return 'Q1';
  if (['jul', 'aug', 'sep'].includes(m)) return 'Q2';
  if (['oct', 'nov', 'dec'].includes(m)) return 'Q3';
  return 'Q4';
}

function buildQuarterlyTdsSummary(monthWise, fy) {
  const template = {
    Q1: { quarter: 'Q1', period: `April ${fy.startYear} – June ${fy.startYear}`, tdsDeducted: 0 },
    Q2: { quarter: 'Q2', period: `July ${fy.startYear} – September ${fy.startYear}`, tdsDeducted: 0 },
    Q3: {
      quarter: 'Q3',
      period: `October ${fy.startYear} – December ${fy.startYear}`,
      tdsDeducted: 0,
    },
    Q4: { quarter: 'Q4', period: `January ${fy.endYear} – March ${fy.endYear}`, tdsDeducted: 0 },
  };

  monthWise.forEach((row) => {
    const key = getIndianFYQuarter(row.month);
    if (template[key]) {
      template[key].tdsDeducted += Number(row.tdsDeducted) || 0;
    }
  });

  return Object.values(template);
}

function buildMonthWiseTdsFromPayrolls(payrolls, fy) {
  return payrolls
    .map((payroll) => {
      const tdsLine = (payroll.deductions || []).find((d) =>
        String(d.componentName || '').toLowerCase().includes('tds')
      );
      const tdsDeducted = Number(tdsLine?.amount) || 0;
      if (tdsDeducted <= 0) return null;
      return {
        month: payroll.month,
        year: payroll.year,
        tdsDeducted,
        payrollId: payroll._id,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        getPayrollPeriodSortKey(a.month, a.year, fy.startYear, fy.endYear) -
        getPayrollPeriodSortKey(b.month, b.year, fy.startYear, fy.endYear)
    );
}

function mapInvestmentLines(lines = []) {
  return (lines || []).map((row) => ({
    investmentType: row.investmentType || '',
    amount: Number(row.amount) || 0,
    attachment: row.attachment || '',
  }));
}

function buildDeclarationSummary(tdsRecord) {
  const d = tdsRecord.declaredDeductions || {};
  const it = tdsRecord.itDeclaration || {};
  return {
    declaredDeductions: {
      section80C: Number(d.section80C) || 0,
      section80D: Number(d.section80D) || 0,
      section80E: Number(d.section80E) || 0,
      section80G: Number(d.section80G) || 0,
      section24: Number(d.section24) || 0,
      professionalTax: Number(d.professionalTax) || 0,
      otherDeductions: Number(d.otherDeductions) || 0,
      standardDeduction: Number(d.standardDeduction) || 0,
      total: Number(d.total) || 0,
    },
    investments80C: mapInvestmentLines(tdsRecord.investments80C),
    investments80D: mapInvestmentLines(tdsRecord.investments80D),
    itDeclaration: {
      stayingInRentedHouse: Boolean(it.stayingInRentedHouse),
      rentEntries: it.rentEntries || [],
      homeLoanSelfOccupied: it.homeLoanSelfOccupied || {},
      investmentsOther: it.investmentsOther || [],
      otherIncomeBreakdown: it.otherIncomeBreakdown || {},
      toggles: it.toggles || {},
    },
  };
}

/**
 * Employee Tax Report — for Taxation > Tax Report tab (ESS).
 */
async function buildTaxReportData(org_uuid, employeeId, financialYearInput) {
  const fy = resolveFinancialYearInput(financialYearInput);
  if (!fy.ok) {
    return { error: fy.error, status: 400 };
  }

  const { EmployeeTDSModel, EmployeeModel, PayrollRunModel } = await initModels(org_uuid);

  const employee = await EmployeeModel.findById(employeeId).select(
    'firstName lastName email uniqueId pan payrollInfo jobTitle'
  );
  if (!employee) {
    return { error: 'Employee not found', status: 404 };
  }

  const tdsRecord = await EmployeeTDSModel.findOne({
    organizationId: org_uuid,
    employeeId,
    financialYear: { $in: fy.aliases },
  }).lean();

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

  const assessmentYear = `${fy.startYear + 1}-${String(fy.endYear + 1).slice(-2)}`;
  const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

  if (!tdsRecord) {
    return {
      data: {
        viewType: 'tax_report',
        financialYear: fy.canonical,
        financialYearLabel: fy.label,
        assessmentYear: `AY ${assessmentYear}`,
        periodDescription: `April ${fy.startYear} to March ${fy.endYear}`,
        employee: {
          employeeId,
          employeeName,
          employeeCode: employee.payrollInfo?.employeeCode || employee.uniqueId || '',
          pan: employee.payrollInfo?.pan || employee.pan || '',
          designation: employee.payrollInfo?.designation || employee.jobTitle || '',
        },
        tdsCalculated: false,
        message:
          'TDS not calculated for this financial year. Save investment declaration and ask HR to run TDS calculation.',
        proofStatus: {
          proofSubmitted: false,
          proofVerified: false,
          proofStatus: 'pending',
        },
        payrollMonthsProcessed: payrolls.length,
        generatedOn: new Date().toISOString(),
      },
      employee,
      fy,
    };
  }

  const regime = String(tdsRecord.taxRegime || 'new').toLowerCase();
  const projected = tdsRecord.projectedAnnualIncome || {};
  const hraExempt = tdsRecord.hraExemption || {};
  const taxPayable = tdsRecord.taxPayable || {};

  let monthWise = (tdsRecord.monthlyDeductions || [])
    .map((row) => ({
      month: row.month,
      year: row.year,
      tdsDeducted: Number(row.tdsDeducted) || 0,
      payrollId: row.payrollId,
    }))
    .filter((row) => row.tdsDeducted > 0);

  if (monthWise.length === 0) {
    monthWise = buildMonthWiseTdsFromPayrolls(payrolls, fy);
  } else {
    monthWise.sort(
      (a, b) =>
        getPayrollPeriodSortKey(a.month, a.year, fy.startYear, fy.endYear) -
        getPayrollPeriodSortKey(b.month, b.year, fy.startYear, fy.endYear)
    );
  }

  const totalTDSDeducted =
    monthWise.length > 0
      ? monthWise.reduce((sum, row) => sum + row.tdsDeducted, 0)
      : Number(tdsRecord.totalTDSDeducted) || 0;

  const pendingTDS = Math.max(0, (Number(taxPayable.total) || 0) - totalTDSDeducted);

  const standardDeduction = Number(tdsRecord.declaredDeductions?.standardDeduction) || 50000;
  const professionalTax = Number(tdsRecord.declaredDeductions?.professionalTax) || 0;
  const hraExemptionAmount = Number(hraExempt.exemptAmount) || 0;
  const grossIncome = Number(projected.total) || 0;

  const report = {
    viewType: 'tax_report',
    financialYear: fy.canonical,
    financialYearLabel: fy.label,
    assessmentYear: `AY ${assessmentYear}`,
    periodDescription: `April ${fy.startYear} to March ${fy.endYear}`,
    generatedOn: new Date().toISOString(),
    tdsCalculated: true,
    employee: {
      employeeId,
      employeeName,
      employeeCode: employee.payrollInfo?.employeeCode || employee.uniqueId || '',
      pan: employee.payrollInfo?.pan || employee.pan || '',
      designation: employee.payrollInfo?.designation || employee.jobTitle || '',
    },
    summary: {
      taxRegime: regime,
      taxRegimeLabel: regime === 'old' ? 'Old Regime' : 'New Regime',
      grossIncome,
      taxableIncome: Number(tdsRecord.taxableIncome) || 0,
      totalTax: Number(taxPayable.total) || 0,
      monthlyTDS: Number(tdsRecord.monthlyTDS) || 0,
      totalTDSDeducted,
      pendingTDS,
      rebateApplicable: Boolean(tdsRecord.rebateApplicable),
      rebateAmount: Number(tdsRecord.rebateAmount) || 0,
      isLocked: Boolean(tdsRecord.isLocked),
    },
    proofStatus: {
      proofSubmitted: Boolean(tdsRecord.proofSubmitted),
      proofVerified: Boolean(tdsRecord.proofVerified),
      proofStatus: tdsRecord.proofStatus || 'pending',
      proofRemarks: tdsRecord.proofRemarks || '',
      proofReviewedAt: tdsRecord.proofReviewedAt || null,
    },
    income: {
      basic: Number(projected.basic) || 0,
      hra: Number(projected.hra) || 0,
      allowances: Number(projected.allowances) || 0,
      otherIncome: Number(projected.otherIncome) || 0,
      grossSalary: grossIncome,
      hraReceived: Number(hraExempt.actualHRA) || Number(projected.hra) || 0,
      hraExemption: hraExemptionAmount,
      rentPaid: Number(hraExempt.rentPaid) || 0,
      standardDeduction,
      professionalTax,
      incomeFromSalary: Math.max(
        0,
        grossIncome - standardDeduction - professionalTax - (regime === 'old' ? hraExemptionAmount : 0)
      ),
    },
    declarations: buildDeclarationSummary(tdsRecord),
    chapter6A:
      regime === 'old'
        ? {
            section80C: Number(tdsRecord.declaredDeductions?.section80C) || 0,
            section80D: Number(tdsRecord.declaredDeductions?.section80D) || 0,
            section80E: Number(tdsRecord.declaredDeductions?.section80E) || 0,
            section80G: Number(tdsRecord.declaredDeductions?.section80G) || 0,
            section24: Number(tdsRecord.declaredDeductions?.section24) || 0,
            otherDeductions: Number(tdsRecord.declaredDeductions?.otherDeductions) || 0,
            totalChapter6A:
              (Number(tdsRecord.declaredDeductions?.section80C) || 0) +
              (Number(tdsRecord.declaredDeductions?.section80D) || 0) +
              (Number(tdsRecord.declaredDeductions?.section80E) || 0) +
              (Number(tdsRecord.declaredDeductions?.section80G) || 0) +
              (Number(tdsRecord.declaredDeductions?.section24) || 0) +
              (Number(tdsRecord.declaredDeductions?.otherDeductions) || 0),
          }
        : null,
    taxComputation: {
      taxableIncome: Number(tdsRecord.taxableIncome) || 0,
      incomeTax: Number(taxPayable.incomeTax) || 0,
      surcharge: Number(taxPayable.surcharge) || 0,
      cess: Number(taxPayable.cess) || 0,
      totalTax: Number(taxPayable.total) || 0,
      rebateApplicable: Boolean(tdsRecord.rebateApplicable),
      rebateAmount: Number(tdsRecord.rebateAmount) || 0,
      // taxPayable.total is already net of §87A rebate
      netTaxLiability: Math.max(0, Number(taxPayable.total) || 0),
      monthlyTDS: Number(tdsRecord.monthlyTDS) || 0,
    },
    tdsDeductions: {
      monthWise,
      quarterly: buildQuarterlyTdsSummary(monthWise, fy),
      totalTDSDeducted,
      pendingTDS,
    },
    payrollMonthsProcessed: payrolls.length,
    tdsRecordId: tdsRecord._id,
    updatedAt: tdsRecord.updatedAt,
  };

  return { data: report, employee, fy, tdsRecord };
}

module.exports = {
  buildTaxReportData,
};
