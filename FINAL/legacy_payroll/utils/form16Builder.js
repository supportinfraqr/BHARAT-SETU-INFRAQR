const { initModels } = require('../models/indexModel');
const {
  resolveFinancialYearInput,
  buildFinancialYearPayrollQuery,
  getPayrollPeriodSortKey,
} = require('./financialYear');

function formatOrganizationAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address.trim();
  if (typeof address !== 'object') return '';

  return [
    address.address1,
    address.address2,
    address.city,
    address.state,
    address.country,
    address.zip,
  ]
    .filter(Boolean)
    .join(', ');
}

function formatEmployeeAddress(employee) {
  if (employee?.address && String(employee.address).trim()) {
    return String(employee.address).trim();
  }
  const p = employee?.presentAddress || employee?.permanentAddress;
  if (p && typeof p === 'object') {
    return [p.address, p.city, p.state, p.country, p.zip].filter(Boolean).join(', ');
  }
  return 'N/A';
}

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

function buildQuarterlyTdsSummary(partE, fy) {
  const template = {
    Q1: { quarter: 'Q1', period: `April ${fy.startYear} to June ${fy.startYear}`, tdsDeducted: 0 },
    Q2: { quarter: 'Q2', period: `July ${fy.startYear} to September ${fy.startYear}`, tdsDeducted: 0 },
    Q3: {
      quarter: 'Q3',
      period: `October ${fy.startYear} to December ${fy.startYear}`,
      tdsDeducted: 0,
    },
    Q4: { quarter: 'Q4', period: `January ${fy.endYear} to March ${fy.endYear}`, tdsDeducted: 0 },
  };

  partE.forEach((row) => {
    const key = getIndianFYQuarter(row.month);
    if (template[key]) {
      template[key].tdsDeducted += Number(row.tdsDeducted) || 0;
    }
  });

  return Object.values(template);
}

function buildPartEFromPayrolls(payrolls, fy) {
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

/**
 * Build Form 16 JSON payload for an employee + financial year.
 */
async function buildForm16Data(org_uuid, employeeId, financialYearInput) {
  const fy = resolveFinancialYearInput(financialYearInput);
  if (!fy.ok) {
    return { error: fy.error, status: 400 };
  }

  const { EmployeeTDSModel, EmployeeModel, OrganizationModel, PayrollRunModel } =
    await initModels(org_uuid);

  const employee = await EmployeeModel.findById(employeeId).select(
    'firstName lastName email uniqueId address presentAddress permanentAddress payrollInfo jobTitle pan'
  );

  if (!employee) {
    return { error: 'Employee not found', status: 404 };
  }

  const organization = await OrganizationModel?.findById(org_uuid).select(
    'organizationName organizationAddress tan pan gst brn'
  );

  const tdsRecord = await EmployeeTDSModel.findOne({
    organizationId: org_uuid,
    employeeId,
    financialYear: { $in: fy.aliases },
  }).lean();

  if (!tdsRecord) {
    return {
      error: 'TDS record not found for this financial year. Calculate employee TDS first.',
      status: 404,
    };
  }

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

  const grossSalary = tdsRecord.projectedAnnualIncome?.total || 0;
  const standardDeduction = tdsRecord.declaredDeductions?.standardDeduction || 50000;
  const professionalTax = tdsRecord.declaredDeductions?.professionalTax || 0;
  const hraExemption = tdsRecord.hraExemption?.exemptAmount || 0;

  const salaryBreakup = {
    grossSalary,
    basic: tdsRecord.projectedAnnualIncome?.basic || 0,
    hra: tdsRecord.projectedAnnualIncome?.hra || 0,
    allowances: tdsRecord.projectedAnnualIncome?.allowances || 0,
    otherIncome: tdsRecord.projectedAnnualIncome?.otherIncome || 0,
    lessAllowances: {
      standardDeduction,
      professionalTax,
      hraExemption,
    },
    incomeChargeableUnderSalaryHead: Math.max(
      0,
      grossSalary - standardDeduction - professionalTax - hraExemption
    ),
  };

  const partC = {
    section80C: tdsRecord.declaredDeductions?.section80C || 0,
    section80D: tdsRecord.declaredDeductions?.section80D || 0,
    section80E: tdsRecord.declaredDeductions?.section80E || 0,
    section80G: tdsRecord.declaredDeductions?.section80G || 0,
    section24: tdsRecord.declaredDeductions?.section24 || 0,
    total: 0,
  };

  partC.total =
    partC.section80C +
    partC.section80D +
    partC.section80E +
    partC.section80G +
    partC.section24;

  const totalTax = tdsRecord.taxPayable?.total || 0;
  const rebate = tdsRecord.rebateAmount || 0;

  const partD = {
    taxableIncome: tdsRecord.taxableIncome || 0,
    taxRegime: tdsRecord.taxRegime || 'new',
    incomeTax: tdsRecord.taxPayable?.incomeTax || 0,
    surcharge: tdsRecord.taxPayable?.surcharge || 0,
    cess: tdsRecord.taxPayable?.cess || 0,
    totalTax,
    rebate,
    // taxPayable.total is already net of §87A rebate
    netTax: Math.max(0, totalTax),
    monthlyTDS: tdsRecord.monthlyTDS || 0,
  };

  let partE = (tdsRecord.monthlyDeductions || [])
    .map((row) => ({
      month: row.month,
      year: row.year,
      tdsDeducted: Number(row.tdsDeducted) || 0,
      payrollId: row.payrollId,
    }))
    .filter((row) => row.tdsDeducted > 0);

  if (partE.length === 0) {
    partE = buildPartEFromPayrolls(payrolls, fy);
  } else {
    partE.sort(
      (a, b) =>
        getPayrollPeriodSortKey(a.month, a.year, fy.startYear, fy.endYear) -
        getPayrollPeriodSortKey(b.month, b.year, fy.startYear, fy.endYear)
    );
  }

  const seenPeriod = new Set();
  partE = partE.filter((row) => {
    const key = `${String(row.month || '').toLowerCase()}-${row.year}`;
    if (seenPeriod.has(key)) return false;
    seenPeriod.add(key);
    return true;
  });

  const totalTDSDeducted =
    partE.length > 0
      ? partE.reduce((sum, row) => sum + row.tdsDeducted, 0)
      : tdsRecord.totalTDSDeducted || 0;

  const assessmentYear = `${fy.startYear + 1}-${fy.endYear + 1}`;

  const employeeDetails = {
    employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim().toUpperCase(),
    pan: employee.payrollInfo?.pan || employee.pan || 'N/A',
    employeeCode: employee.payrollInfo?.employeeCode || employee.uniqueId || 'N/A',
    designation: employee.payrollInfo?.designation || employee.jobTitle || 'N/A',
    address: formatEmployeeAddress(employee),
    period: fy.label,
  };

  const quarterlyTds = buildQuarterlyTdsSummary(partE, fy);

  const partA = {
    ...employeeDetails,
    employee: employeeDetails,
    periodFrom: `01-Apr-${fy.startYear}`,
    periodTo: `31-Mar-${fy.endYear}`,
    quarterlyTds,
    totalTaxDeducted: totalTDSDeducted,
    tracesNote:
      'Challan-wise Part A with BSR code and book entry must be downloaded from TRACES (www.tdscpc.gov.in) by the employer.',
  };

  const form16 = {
    viewType: 'form16',
    documentParts: ['PART_A', 'PART_B'],
    employerDetails: {
      name: organization?.organizationName || 'Organization',
      address: formatOrganizationAddress(organization?.organizationAddress),
      tan: organization?.tan || 'N/A',
      pan: organization?.pan || 'N/A',
    },
    employeeDetails,
    partA,
    partB: salaryBreakup,
    partC,
    partD,
    partE,
    totalTDSDeducted,
    financialYear: fy.keyShort,
    financialYearCanonical: fy.canonical,
    assessmentYear: `AY ${assessmentYear}`,
    periodDescription: `April ${fy.startYear} to March ${fy.endYear}`,
    generatedOn: new Date().toISOString(),
    payrollMonthsProcessed: payrolls.length,
  };

  return {
    data: form16,
    employee,
    fy,
  };
}

module.exports = {
  buildForm16Data,
  formatOrganizationAddress,
};
