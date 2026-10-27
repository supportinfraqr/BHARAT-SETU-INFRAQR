const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const { resolveFinancialYearInput } = require('../../utils/financialYear');

const normalizeMonthValue = (month = '') => {
  const monthMap = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Oct',
    nov: 'Nov',
    dec: 'Dec',
  };

  return monthMap[String(month).trim().toLowerCase()] || month;
};

const sumNamed = (lines, pattern) =>
  (lines || []).reduce((sum, row) => {
    if (!pattern.test(String(row?.componentName || ''))) return sum;
    return sum + (Number(row.amount) || 0);
  }, 0);

const componentLines = (lines) =>
  (lines || [])
    .map((row) => ({
      name: String(row?.componentName || '').trim(),
      amount: Number(row?.amount) || 0,
    }))
    .filter((row) => row.name);

function section10Amount(value) {
  if (!value || typeof value !== 'object') return Number(value) || 0;
  if (Number(value.total)) return Number(value.total) || 0;
  return Object.values(value).reduce((sum, item) => sum + (Number(item) || 0), 0);
}

const employeeIdentity = (employee) => ({
  employeeId: employee?._id,
  name: `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim(),
  employeeCode: employee?.payrollInfo?.employeeCode || employee?.uniqueId || '',
  department: employee?.departmentId?.name || employee?.payrollInfo?.department || 'Unknown',
  designation: employee?.jobTitle || '',
});

/**
 * Payroll Summary Report
 */
exports.getPayrollSummary = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month, year } = req.query;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year are required');
    }

    const normalizedMonth = normalizeMonthValue(month);

    const payrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth,
      year: parseInt(year),
    }).populate({
      path: 'employeeId',
      select: 'firstName lastName uniqueId jobTitle email payrollInfo departmentId',
      populate: { path: 'departmentId', select: 'name' },
    });

    const summary = {
      totalEmployees: payrolls.length,
      totalGrossEarnings: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      departmentWise: {},
      statusWise: {
        pending: 0,
        processed: 0,
        approved: 0,
        paid: 0,
      },
      employees: [],
    };

    payrolls.forEach((payroll) => {
      if (!payroll.employeeId) return;
      summary.totalGrossEarnings += payroll.grossEarnings || 0;
      summary.totalDeductions += payroll.totalDeductions || 0;
      summary.totalNetPay += payroll.netPay || 0;

      // Status wise count
      summary.statusWise[payroll.payStatus] = (summary.statusWise[payroll.payStatus] || 0) + 1;

      // Department wise
      const dept =
        payroll.employeeId?.departmentId?.name ||
        payroll.employeeId?.payrollInfo?.department ||
        'Unknown';
      if (!summary.departmentWise[dept]) {
        summary.departmentWise[dept] = {
          count: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
        };
      }
      summary.departmentWise[dept].count++;
      summary.departmentWise[dept].totalGross += payroll.grossEarnings || 0;
      summary.departmentWise[dept].totalDeductions += payroll.totalDeductions || 0;
      summary.departmentWise[dept].totalNet += payroll.netPay || 0;

      summary.employees.push({
        ...employeeIdentity(payroll.employeeId),
        paidDays: payroll.presentDays || 0,
        lopDays: payroll.lopDays || 0,
        earnings: componentLines(payroll.earnings),
        gross: payroll.grossEarnings || 0,
        deductions: componentLines(payroll.deductions),
        totalDeductions: payroll.totalDeductions || 0,
        netPay: payroll.netPay || 0,
        employerPF: payroll.employerContributions?.epf || 0,
        employerESI: payroll.employerContributions?.esi || 0,
        edli: payroll.employerContributions?.edli || 0,
        adminCharges: payroll.employerContributions?.adminCharges || 0,
        status: payroll.payStatus || '',
      });
    });

    return sendResponse(res, 200, true, 'Payroll summary fetched successfully', {
      month: normalizedMonth,
      year,
      summary,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Year-to-Date Payroll Report
 */
exports.getYTDReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { year, employeeId } = req.query;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!year) {
      return sendResponse(res, 400, false, 'Year is required');
    }

    const filter = {
      organizationId: org_uuid,
      year: parseInt(year),
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const payrolls = await PayrollRunModel.find(filter)
      .sort({ month: 1 })
      .populate({
        path: 'employeeId',
        select: 'firstName lastName email uniqueId jobTitle payrollInfo departmentId',
        populate: { path: 'departmentId', select: 'name' },
      });

    // Group by employee
    const employeeWise = {};

    payrolls.forEach((payroll) => {
      const empId = payroll.employeeId._id.toString();
      if (!employeeWise[empId]) {
        employeeWise[empId] = {
          employee: {
            ...employeeIdentity(payroll.employeeId),
            email: payroll.employeeId.email,
          },
          months: [],
          totals: {
            grossEarnings: 0,
            deductions: 0,
            netPay: 0,
          },
        };
      }

      const basic = sumNamed(payroll.earnings, /basic/i);
      const hra = sumNamed(payroll.earnings, /\bhra\b|house rent/i);
      const epf = sumNamed(payroll.deductions, /epf/i);
      const esi = sumNamed(payroll.deductions, /\besi\b/i);
      const professionalTax = sumNamed(payroll.deductions, /professional tax/i);
      const tds = sumNamed(payroll.deductions, /\btds\b|income tax/i);
      const lwf = sumNamed(payroll.deductions, /labour welfare|\blwf\b/i);
      const gross = payroll.grossEarnings || 0;
      const totalDeductions = payroll.totalDeductions || 0;
      employeeWise[empId].months.push({
        month: payroll.month,
        paidDays: payroll.presentDays || 0,
        lopDays: payroll.lopDays || 0,
        basic,
        hra,
        otherEarnings: Math.max(gross - basic - hra, 0),
        grossEarnings: gross,
        epf,
        esi,
        professionalTax,
        tds,
        lwf,
        otherDeductions: Math.max(totalDeductions - epf - esi - professionalTax - tds - lwf, 0),
        deductions: totalDeductions,
        netPay: payroll.netPay,
      });

      employeeWise[empId].totals.grossEarnings += payroll.grossEarnings || 0;
      employeeWise[empId].totals.deductions += payroll.totalDeductions || 0;
      employeeWise[empId].totals.netPay += payroll.netPay || 0;
    });

    return sendResponse(res, 200, true, 'YTD report fetched successfully', {
      year,
      data: Object.values(employeeWise),
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Statutory Compliance Report (EPF, ESI, PT)
 */
exports.getStatutoryReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month, year } = req.query;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year are required');
    }

    const normalizedMonth = normalizeMonthValue(month);

    const payrolls = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth,
      year: parseInt(year),
    }).populate('employeeId', 'firstName lastName email uniqueId payrollInfo statutoryInfo');

    const report = {
      epf: {
        employees: [],
        totalEmployeeContribution: 0,
        totalEmployerContribution: 0,
        totalEdliContribution: 0,
        totalAdminCharges: 0,
        totalEmployerCost: 0,
      },
      esi: {
        employees: [],
        totalEmployeeContribution: 0,
        totalEmployerContribution: 0,
      },
      pt: {
        employees: [],
        totalAmount: 0,
      },
      lwf: {
        employees: [],
        totalEmployeeShare: 0,
        totalEmployerShare: 0,
      },
      bonus: {
        employees: [],
        totalAmount: 0,
      },
    };

    payrolls.forEach((payroll) => {
      // EPF — employee deduction lives in `deductions`, employer side now in `employerContributions`
      const epfEmployee = payroll.deductions?.find(
        (d) => d.componentName?.includes('EPF') && d.componentName?.includes('Employee')
      );

      const epfEmployerAmt = payroll.employerContributions?.epf || 0;
      const edliAmt = payroll.employerContributions?.edli || 0;
      const adminChargesAmt = payroll.employerContributions?.adminCharges || 0;

      if (epfEmployee || epfEmployerAmt || edliAmt || adminChargesAmt) {
        report.epf.employees.push({
          employeeId: payroll.employeeId._id,
          name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
          employeeCode: payroll.employeeId?.payrollInfo?.employeeCode || payroll.employeeId?.uniqueId || '',
          uan: payroll.employeeId.statutoryInfo?.uan || '',
          pfAccountNumber: payroll.employeeId.statutoryInfo?.pfAccountNumber || '',
          epfWage: payroll.epfDetails?.epfWage || 0,
          employeeContribution: epfEmployee?.amount || 0,
          employerContribution: epfEmployerAmt,
          edliContribution: edliAmt,
          adminCharges: adminChargesAmt,
          abryApplied: payroll.epfDetails?.abryApplied || false,
        });
        report.epf.totalEmployeeContribution += epfEmployee?.amount || 0;
        report.epf.totalEmployerContribution += epfEmployerAmt;
        report.epf.totalEdliContribution += edliAmt;
        report.epf.totalAdminCharges += adminChargesAmt;
        report.epf.totalEmployerCost +=
          epfEmployerAmt + edliAmt + adminChargesAmt;
      }

      // ESI — employee deduction in `deductions`, employer side now in `employerContributions`
      const esiEmployee = payroll.deductions?.find(
        (d) => d.componentName?.includes('ESI') && d.componentName?.includes('Employee')
      );
      const esiEmployerAmt = payroll.employerContributions?.esi || 0;

      if (esiEmployee || esiEmployerAmt) {
        report.esi.employees.push({
          employeeId: payroll.employeeId._id,
          name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
          employeeCode: payroll.employeeId?.payrollInfo?.employeeCode || payroll.employeeId?.uniqueId || '',
          esiNumber: payroll.employeeId.statutoryInfo?.esiNumber || '',
          wageUsed: payroll.esiDetails?.wageUsed || 0,
          employeeContribution: esiEmployee?.amount || 0,
          employerContribution: esiEmployerAmt,
        });
        report.esi.totalEmployeeContribution += esiEmployee?.amount || 0;
        report.esi.totalEmployerContribution += esiEmployerAmt;
      }

      // Professional Tax — enriched with state, PT number, cycle from audit trail
      const pt = payroll.deductions?.find((d) => d.componentName?.includes('Professional Tax'));

      if (pt) {
        report.pt.employees.push({
          employeeId: payroll.employeeId._id,
          name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
          employeeCode: payroll.employeeId?.payrollInfo?.employeeCode || payroll.employeeId?.uniqueId || '',
          state: payroll.ptDetails?.stateUsed || payroll.employeeId.statutoryInfo?.ptState || '',
          ptNumber: payroll.ptDetails?.ptNumber || '',
          cycle: payroll.ptDetails?.cycle || 'monthly',
          amount: pt.amount || 0,
        });
        report.pt.totalAmount += pt.amount || 0;
      }

      // Labour Welfare Fund
      const lwfEmpAmt = payroll.lwfDetails?.employeeShare || 0;
      const lwfErAmt = payroll.lwfDetails?.employerShare || 0;
      if (lwfEmpAmt || lwfErAmt) {
        report.lwf.employees.push({
          employeeId: payroll.employeeId._id,
          name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
          employeeCode: payroll.employeeId?.payrollInfo?.employeeCode || payroll.employeeId?.uniqueId || '',
          state: payroll.lwfDetails?.stateUsed || '',
          cycle: payroll.lwfDetails?.cycle || 'half-yearly',
          employeeShare: lwfEmpAmt,
          employerShare: lwfErAmt,
        });
        report.lwf.totalEmployeeShare += lwfEmpAmt;
        report.lwf.totalEmployerShare += lwfErAmt;
      }

      // Statutory Bonus (only when paid this month)
      const bonusAmt = payroll.bonusDetails?.amount || 0;
      if (bonusAmt > 0) {
        report.bonus.employees.push({
          employeeId: payroll.employeeId._id,
          name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
          employeeCode: payroll.employeeId?.payrollInfo?.employeeCode || payroll.employeeId?.uniqueId || '',
          cycle: payroll.bonusDetails?.cycle || 'yearly',
          calcBase: payroll.bonusDetails?.calcBase || 0,
          percentage: payroll.bonusDetails?.percentage || 0,
          amount: bonusAmt,
        });
        report.bonus.totalAmount += bonusAmt;
      }
    });

    return sendResponse(res, 200, true, 'Statutory report fetched successfully', {
      month: normalizedMonth,
      year,
      report,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * TDS Report
 */
exports.getTDSReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { financialYear } = req.query;
    const { EmployeeTDSModel } = await initModels(org_uuid);

    if (!financialYear) {
      return sendResponse(res, 400, false, 'Financial year is required');
    }

    const fy = resolveFinancialYearInput(financialYear);
    if (!fy.ok) {
      return sendResponse(res, 400, false, fy.error);
    }

    const tdsRecords = await EmployeeTDSModel.find({
      organizationId: org_uuid,
      financialYear: { $in: fy.aliases },
    }).populate({
      path: 'employeeId',
      select: 'firstName lastName email uniqueId jobTitle payrollInfo nationalID departmentId',
      populate: { path: 'departmentId', select: 'name' },
    });

    const report = {
      totalEmployees: tdsRecords.length,
      totalAnnualIncome: 0,
      totalTaxDeducted: 0,
      employees: [],
    };

    tdsRecords.forEach((record) => {
      if (!record.employeeId) return;
      const income = record.projectedAnnualIncome || {};
      const deductions = record.declaredDeductions || {};
      const basic = Number(income.basic) || 0;
      const hra = Number(income.hra) || 0;
      const allowances = Number(income.allowances) || 0;
      const perquisites = Number(income.loanPerquisite) || 0;
      const otherIncome = Number(income.otherIncome) || 0;
      const grossTotalIncome = Number(income.total) || basic + hra + allowances + perquisites + otherIncome;
      const hraExemption = Number(record.hraExemption?.exemptAmount) || 0;
      const section10 = section10Amount(record.section10Exemptions);
      const standardDeduction = Number(deductions.standardDeduction) || 0;
      const professionalTax = Number(deductions.professionalTax) || 0;
      const section24 = Number(deductions.section24) || 0;
      const section80C = Number(deductions.section80C) || 0;
      const section80CCD1B = Number(deductions.section80CCD1B) || 0;
      const section80CCD2 = Number(deductions.section80CCD2) || 0;
      const section80D = Number(deductions.section80D) || 0;
      const otherViaKeys = ['section80CCC', 'section80CCD1', 'section80DD', 'section80DDB', 'section80E', 'section80EE', 'section80EEA', 'section80G', 'section80GG', 'section80GGA', 'section80GGC', 'section80TTA', 'section80TTB', 'section80U', 'otherDeductions'];
      const otherChapterVIA = otherViaKeys.reduce((sum, key) => sum + (Number(deductions[key]) || 0), 0);
      const taxableIncome = Number(record.taxableIncome) || 0;
      const incomeTax = Number(record.taxPayable?.incomeTax) || 0;
      const rebate = Number(record.rebateAmount) || 0;
      const surcharge = Number(record.taxPayable?.surcharge) || 0;
      const cess = Number(record.taxPayable?.cess) || 0;
      const totalTax = Number(record.taxPayable?.total) || 0;
      const totalDeducted = Number(record.totalTDSDeducted) || 0;
      const months = { Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0 };
      (record.monthlyDeductions || []).forEach((row) => {
        const key = normalizeMonthValue(row?.month);
        if (Object.prototype.hasOwnProperty.call(months, key)) months[key] += Number(row?.tdsDeducted) || 0;
      });

      report.totalAnnualIncome += grossTotalIncome;
      report.totalTaxDeducted += totalDeducted;
      report.employees.push({
        ...employeeIdentity(record.employeeId),
        email: record.employeeId?.email || '',
        pan: record.employeeId?.nationalID?.pan || '',
        taxRegime: record.taxRegime,
        basic,
        hra,
        allowances,
        perquisites,
        otherIncome,
        grossTotalIncome,
        hraExemption,
        section10,
        standardDeduction,
        professionalTax,
        section24,
        section80C,
        section80CCD1B,
        section80CCD2,
        section80D,
        otherChapterVIA,
        taxableIncome,
        incomeTax,
        rebate,
        surcharge,
        cess,
        totalTax,
        monthlyTDS: Number(record.monthlyTDS) || 0,
        totalDeducted,
        balance: totalTax - totalDeducted,
        months,
      });
    });
    report.totalEmployees = report.employees.length;

    return sendResponse(res, 200, true, 'TDS report fetched successfully', {
      financialYear: fy.canonical,
      report,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

function ctcComponentLines(payrollInfo = {}) {
  const lines = [];
  const seen = new Set();
  const push = (row, category) => {
    const name = String(row?.name || row?.componentName || row?.code || '').trim();
    if (!name || /basic/i.test(name)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    const monthly = Number(row?.overrideAmount ?? row?.amount);
    if (!Number.isFinite(monthly)) return;
    seen.add(key);
    lines.push({
      name,
      category: category || row?.category || '',
      monthly: Math.max(0, monthly),
    });
  };

  (payrollInfo.componentOverrides || []).forEach((row) => {
    if (row?.disabled) return;
    push(row, row.category);
  });
  (payrollInfo.defaultComponents || []).forEach((row) => push(row, row.category));
  return lines;
}

/**
 * Cost to Company Report
 */
exports.getCTCReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { EmployeeModel } = await initModels(org_uuid);

    const employees = await EmployeeModel.find({
      $or: [
        { status: 'Active' },
        { isActive: true },
      ],
    })
      .select('firstName lastName email uniqueId jobTitle payrollInfo status departmentId')
      .populate('departmentId', 'name');

    const report = {
      totalEmployees: employees.length,
      totalCTC: 0,
      totalGross: 0,
      employees: [],
      departmentWise: {},
    };

    employees.forEach((emp) => {
      const ctc = emp.payrollInfo?.ctc || 0;
      const gross = emp.payrollInfo?.grossSalary || 0;
      const dept = emp.departmentId?.name || emp.payrollInfo?.department || 'Unknown';

      report.totalCTC += ctc;
      report.totalGross += gross;

      const basic = emp.payrollInfo?.baseSalary || 0;
      report.employees.push({
        employeeId: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        employeeCode: emp.payrollInfo?.employeeCode || emp.uniqueId || '',
        department: dept,
        designation: emp.jobTitle || '',
        ctc,
        monthlyCTC: ctc ? Math.round(ctc / 12) : gross,
        grossSalary: gross,
        basicSalary: basic,
        annualBasic: basic * 12,
        annualGross: gross * 12,
        variablePay: emp.payrollInfo?.variablePay || 0,
        incentives: emp.payrollInfo?.incentives || 0,
        components: ctcComponentLines(emp.payrollInfo),
      });

      if (!report.departmentWise[dept]) {
        report.departmentWise[dept] = {
          count: 0,
          totalCTC: 0,
        };
      }
      report.departmentWise[dept].count++;
      report.departmentWise[dept].totalCTC += ctc;
    });

    return sendResponse(res, 200, true, 'CTC report fetched successfully', report);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Payroll Variance Report
 */
exports.getVarianceReport = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month1, year1, month2, year2 } = req.query;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!month1 || !year1 || !month2 || !year2) {
      return sendResponse(res, 400, false, 'Both periods (month and year) are required');
    }

    const normalizedMonth1 = normalizeMonthValue(month1);
    const normalizedMonth2 = normalizeMonthValue(month2);

    const period1 = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth1,
      year: parseInt(year1),
    }).populate({
      path: 'employeeId',
      select: 'firstName lastName uniqueId jobTitle payrollInfo departmentId',
      populate: { path: 'departmentId', select: 'name' },
    });

    const period2 = await PayrollRunModel.find({
      organizationId: org_uuid,
      month: normalizedMonth2,
      year: parseInt(year2),
    }).populate({
      path: 'employeeId',
      select: 'firstName lastName uniqueId jobTitle payrollInfo departmentId',
      populate: { path: 'departmentId', select: 'name' },
    });

    // Create maps for comparison
    const p1Map = {};
    period1.forEach((p) => {
      p1Map[p.employeeId._id.toString()] = p;
    });

    const variances = [];

    period2.forEach((p2) => {
      const empId = p2.employeeId._id.toString();
      const p1 = p1Map[empId];

      if (p1) {
        const grossVariance = (p2.grossEarnings || 0) - (p1.grossEarnings || 0);
        const deductionVariance = (p2.totalDeductions || 0) - (p1.totalDeductions || 0);
        const netVariance = (p2.netPay || 0) - (p1.netPay || 0);

        variances.push({
          ...employeeIdentity(p2.employeeId),
          period1: {
            gross: p1.grossEarnings || 0,
            deductions: p1.totalDeductions || 0,
            net: p1.netPay || 0,
          },
          period2: {
            gross: p2.grossEarnings || 0,
            deductions: p2.totalDeductions || 0,
            net: p2.netPay || 0,
          },
          variance: {
            gross: grossVariance,
            deductions: deductionVariance,
            net: netVariance,
            grossPercentage: p1.grossEarnings ? ((grossVariance / p1.grossEarnings) * 100).toFixed(2) : 0,
            deductionPercentage: p1.totalDeductions ? ((deductionVariance / p1.totalDeductions) * 100).toFixed(2) : 0,
            netPercentage: p1.netPay ? ((netVariance / p1.netPay) * 100).toFixed(2) : 0,
          },
        });
      }
    });

    return sendResponse(res, 200, true, 'Variance report fetched successfully', {
      period1: { month: month1, year: year1 },
      period2: { month: month2, year: year2 },
      variances,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
