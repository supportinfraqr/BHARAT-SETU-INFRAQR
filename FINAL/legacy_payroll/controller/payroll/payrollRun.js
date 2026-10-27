const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  getFinancialYearAliasesFromPayroll,
  getAccountingYearPeriodsUpTo,
  getPayrollMonthTdsFactor,
  toCalendarDate,
} = require('../../utils/financialYear');
const { resolveEmployeeImplementationDate } = require('../../utils/payroll/employeeImplementationDate');

const {
  buildSalarySlipPdfBuffer,
  mergePayslipEarningsColumn,
} = require('../../utils/salarySlipPdf');
const { getPayslipAttendanceDays } = require('../../utils/payslipAttendance');
const {
  resolveEmployeeDisplayCode,
  EMPLOYEE_DISPLAY_CODE_FIELDS,
} = require('../../utils/payroll/employeeDisplay');
const {
  calculateMonthlyVpfAmount,
  normalizeVpf,
  isVpfEffectiveForPayroll: checkVpfEffectiveForPayroll,
} = require('./vpfManagement');
const {
  calculateEpf,
  resolveEpfApplicableWage,
  sumConsiderForEpf,
  calculateEsi,
  sumConsiderForEsi,
  calculateProfessionalTax,
  calculateLwf,
  calculateStatutoryBonus,
} = require('../../utils/payroll/statutoryCalculator');
const {
  addPayrollComponentLine,
  getComplianceFlags,
  loadPaidComponentKeysForEmployee,
  getActiveEarningsComponents,
  isBasicSalaryComponent,
  sumBasicPlusDA,
  findComponentOverride,
  hasExplicitOverrideAmount,
  normalizeOverrides,
  buildBalancingAllowanceLine,
  normalizeComponentKey,
} = require('../../utils/salaryComponentHelper');
const {
  mergeOneTimeIntoOverrides,
  applyAdHocOneTimeLines,
  groupOneTimeRowsByEmployee,
  loadConfirmedOneTimeImportRows,
} = require('../../utils/payroll/oneTimeImportHelper');
const {
  buildLoanEmiDeductionsForEmployee,
  applyPayrollLoanRepayments,
  reversePayrollLoanRepayments,
} = require('../../utils/payroll/loanHelper');
const {
  buildEmployeeLoanPerquisiteForPayroll,
  calculateAdditionalTdsForPerquisite,
} = require('../../utils/payroll/loanPerquisiteHelper');

exports.processPayroll = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const {
      PayrollRunModel,
      EmployeeModel,
      SalaryCompensationModel,
      StatutoryComplianceModel,
      AttendanceModel,
      LeaveRequestModel,
      EmployeeTDSModel,
      ArrearsModel,
      PayrollScheduleModel,
      ShiftModel,
      HolidayModel,
      ClaimsDeclarationModel,
      PayrollOneTimeImportModel,
      EmployeeLoanModel,
      LoanRepaymentModel,
    } = await initModels(org_uuid);

    const { month, year, employeeIds = [], excludeEmployeeIds = [] } = req.body;

    if (!month || !year) {
      return sendResponse(res, 400, false, 'Month and year are required');
    }

    if (!Array.isArray(employeeIds)) {
      return sendResponse(res, 400, false, 'employeeIds must be an array');
    }

    if (!Array.isArray(excludeEmployeeIds)) {
      return sendResponse(res, 400, false, 'excludeEmployeeIds must be an array');
    }

    const normalizedExcludeIds = [
      ...new Set(excludeEmployeeIds.map((id) => String(id)).filter(Boolean)),
    ];

    if (employeeIds.length > 0 && normalizedExcludeIds.length > 0) {
      const includeSet = new Set(employeeIds.map((id) => String(id)));
      const overlap = normalizedExcludeIds.filter((id) => includeSet.has(id));
      if (overlap.length > 0) {
        return sendResponse(
          res,
          400,
          false,
          'employeeIds and excludeEmployeeIds cannot contain the same IDs'
        );
      }
    }

    const normalizedMonth = normalizePayrollMonth(month);
    const normalizedYear = Number(year);

    if (!normalizedMonth || getMonthIndex(normalizedMonth) === -1) {
      return sendResponse(res, 400, false, 'Invalid month. Use Jan/Jul or July format');
    }

    if (!Number.isInteger(normalizedYear) || normalizedYear < 1900) {
      return sendResponse(res, 400, false, 'Invalid year');
    }

    // Get payroll schedule for working days
    const schedule = await PayrollScheduleModel.findOne({ organizationId: org_uuid });
    
    // Get employees
    const employeeFilter = { status: "Active" };
    if (employeeIds.length > 0 || normalizedExcludeIds.length > 0) {
      employeeFilter._id = {};
      if (employeeIds.length > 0) {
        employeeFilter._id.$in = employeeIds;
      }
      if (normalizedExcludeIds.length > 0) {
        employeeFilter._id.$nin = normalizedExcludeIds;
      }
    }

    const employees = await EmployeeModel.find(employeeFilter);
    
    if (employees.length === 0) {
      return sendResponse(res, 404, false, 'No active employees found');
    }

    const compliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });
    const salaryComponents = await SalaryCompensationModel.find({ organizationId: org_uuid });

    const oneTimeImportRows = await loadConfirmedOneTimeImportRows(
      org_uuid,
      normalizedMonth,
      normalizedYear,
      PayrollOneTimeImportModel
    );
    const oneTimeByEmployee = groupOneTimeRowsByEmployee(oneTimeImportRows);

    let excludedEmployees = [];
    if (normalizedExcludeIds.length > 0) {
      const excludedDocs = await EmployeeModel.find({
        _id: { $in: normalizedExcludeIds },
      }).select('firstName lastName');

      const excludedById = new Map(
        excludedDocs.map((emp) => [
          String(emp._id),
          `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        ])
      );

      excludedEmployees = normalizedExcludeIds.map((id) => ({
        employeeId: id,
        name: excludedById.get(id) || null,
      }));
    }

    const results = [];
    const errors = [];

    for (const emp of employees) {
      try {
        // Validation: Check if employee has salary structure
        if (!emp.payrollInfo?.baseSalary && !emp.baseSalary) {
          errors.push({
            employeeId: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            error: 'No salary structure defined',
          });
          continue;
        }

        // Skip if payroll already processed for this month
        const existing = await PayrollRunModel.findOne({
          organizationId: org_uuid,
          employeeId: emp._id,
          month: normalizedMonth,
          year: normalizedYear,
        });

        if (existing) {
          errors.push({
            employeeId: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            error: 'Payroll already processed',
          });
          continue;
        }

        // Calculate salary with improved logic
        const salaryCalculation = await calculateEmployeeSalaryImproved(
          emp,
          salaryComponents,
          compliance,
          normalizedMonth,
          normalizedYear,
          org_uuid,
          AttendanceModel,
          LeaveRequestModel,
          EmployeeTDSModel,
          ArrearsModel,
          schedule,
          ShiftModel,
          HolidayModel,
          ClaimsDeclarationModel,
          oneTimeByEmployee.get(String(emp._id)) || [],
          EmployeeLoanModel,
          LoanRepaymentModel,
          PayrollRunModel
        );

        const payroll = new PayrollRunModel({
          organizationId: org_uuid,
          employeeId: emp._id,
          month: normalizedMonth,
          year: normalizedYear,
          earnings: salaryCalculation.earnings,
          deductions: salaryCalculation.deductions,
          benefits: salaryCalculation.benefits,
          reimbursements: salaryCalculation.reimbursements,
          grossEarnings: salaryCalculation.grossEarnings,
          totalDeductions: salaryCalculation.totalDeductions,
          netPay: salaryCalculation.netPay,
          workingDays: salaryCalculation.workingDays,
          presentDays: salaryCalculation.presentDays,
          absentDays: salaryCalculation.absentDays,
          lopDays: salaryCalculation.lopDays,
          employerContributions: salaryCalculation.employerContributions,
          epfDetails: salaryCalculation.epfDetails,
          esiDetails: salaryCalculation.esiDetails,
          ptDetails: salaryCalculation.ptDetails,
          lwfDetails: salaryCalculation.lwfDetails,
          bonusDetails: salaryCalculation.bonusDetails,
          payStatus: 'processed',
          processedDate: new Date(),
        });

        await payroll.save();
        
        // Update TDS record with monthly deduction
        if (salaryCalculation.tdsAmount > 0) {
          const financialYearAliases = getFinancialYearAliasesFromPayroll(normalizedMonth, normalizedYear);
          const updatedTDSRecord = await EmployeeTDSModel.findOneAndUpdate(
            {
              organizationId: org_uuid,
              employeeId: emp._id,
              financialYear: { $in: financialYearAliases },
            },
            {
              $push: {
                monthlyDeductions: {
                  month: normalizedMonth,
                  year: normalizedYear,
                  tdsDeducted: salaryCalculation.tdsAmount,
                  payrollId: payroll._id,
                },
              },
              $inc: { totalTDSDeducted: salaryCalculation.tdsAmount },
            },
            { new: true }
          );

          if (!updatedTDSRecord) {
            throw new Error('TDS deduction was calculated but matching TDS record was not found for payroll period');
          }

        }
        
        // Mark arrears as paid if included
        if (salaryCalculation.arrearsId) {
          const updatedArrears = await ArrearsModel.findOneAndUpdate(
            {
              _id: salaryCalculation.arrearsId,
              organizationId: org_uuid,
              employeeId: emp._id,
              status: 'approved',
            },
            {
              status: 'paid',
              paidInMonth: normalizedMonth,
              paidInYear: normalizedYear,
              payrollId: payroll._id,
              paidDate: new Date(),
            },
            { new: true }
          );

          if (!updatedArrears) {
            throw new Error('Included arrears could not be marked as paid (already paid/rejected or not found)');
          }

        }

        if (
          salaryCalculation.reimbursementClaimSubIds?.length > 0 &&
          ClaimsDeclarationModel
        ) {
          const claimDoc = await ClaimsDeclarationModel.findOne({
            organizationId: org_uuid,
            employeeId: emp._id,
          });
          if (claimDoc) {
            let modified = false;
            for (const subId of salaryCalculation.reimbursementClaimSubIds) {
              const sub = claimDoc.reimbursements.id(subId);
              if (sub && !sub.includedInPayrollId) {
                sub.includedInPayrollId = payroll._id;
                modified = true;
              }
            }
            if (modified) {
              claimDoc.markModified('reimbursements');
              await claimDoc.save();
            }
          }
        }

        if (salaryCalculation.loanRepaymentPlans?.length > 0) {
          await applyPayrollLoanRepayments({
            organizationId: org_uuid,
            employeeId: emp._id,
            month: normalizedMonth,
            year: normalizedYear,
            payrollId: payroll._id,
            plans: salaryCalculation.loanRepaymentPlans,
            EmployeeLoanModel,
            LoanRepaymentModel,
          });
        }

        results.push({
          employeeId: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          netPay: payroll.netPay,
          status: 'success',
        });
      } catch (err) {
        if (err?.message === 'Included arrears could not be marked as paid (already paid/rejected or not found)' ||
            err?.message === 'TDS deduction was calculated but matching TDS record was not found for payroll period') {
          const rollbackFilter = {
            organizationId: org_uuid,
            employeeId: emp._id,
            month: normalizedMonth,
            year: normalizedYear,
          };

          const createdPayroll = await PayrollRunModel.findOne(rollbackFilter).sort({ createdAt: -1 });

          if (createdPayroll) {
            await PayrollRunModel.findByIdAndDelete(createdPayroll._id);

            const financialYearAliases = getFinancialYearAliasesFromPayroll(normalizedMonth, normalizedYear);
            await EmployeeTDSModel.findOneAndUpdate(
              {
                organizationId: org_uuid,
                employeeId: emp._id,
                financialYear: { $in: financialYearAliases },
              },
              {
                $pull: { monthlyDeductions: { payrollId: createdPayroll._id } },
                $inc: { totalTDSDeducted: -Math.abs(createdPayroll.deductions?.find(d => d.componentName === 'TDS')?.amount || 0) },
              }
            );
          }
        }

        errors.push({
          employeeId: emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          error: err.message,
        });
      }
    }

    return sendResponse(res, 200, true, 'Payroll processing completed', {
      successful: results.length,
      failed: errors.length,
      excluded: normalizedExcludeIds.length,
      excludeEmployeeIds: normalizedExcludeIds,
      excludedEmployees,
      results,
      errors,
    });
  } catch (err) {
    console.error('Payroll Error:', err);
    return handleError(res, err);
  }
};


function getMonthIndex(monthName) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.indexOf(monthName);
}

function normalizePayrollMonth(monthValue) {
  if (monthValue === null || monthValue === undefined) return null;
  const raw = String(monthValue).trim();
  if (!raw) return null;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortIdx = months.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  if (shortIdx !== -1) return months[shortIdx];

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
  };
  const mapped = monthMap[raw.toLowerCase()];
  if (mapped) return mapped;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return months[numeric - 1];
  }

  return raw;
}

function getCalendarDaysInPayrollMonth(month, year) {
  const monthIndex = getMonthIndex(normalizePayrollMonth(month));
  const numericYear = Number(year);
  if (monthIndex === -1 || !Number.isInteger(numericYear)) return 0;
  return new Date(numericYear, monthIndex + 1, 0).getDate();
}

function roundCurrency(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * State used for state-wise statutory slabs (PT / LWF / Bonus).
 * Without this, an employee whose statutoryInfo has no state would silently
 * pick up whichever state slab happens to be configured first.
 */
function resolveEmployeeStatutoryState(employee = {}) {
  return (
    employee.statutoryInfo?.lwfState ||
    employee.statutoryInfo?.ptState ||
    employee.state ||
    employee.address?.state ||
    employee.workLocation?.state ||
    null
  );
}

function prorateSalaryLines(lines, calendarDays, paidDays) {
  if (!Array.isArray(lines) || calendarDays <= 0) return;

  const payableDays = Math.max(0, Math.min(Number(paidDays) || 0, calendarDays));
  lines.forEach((line) => {
    if (line?.calculationType === 'statutory') {
      const fixedAmount = Math.max(0, Number(line?.amount) || 0);
      line.fixedAmount = roundCurrency(fixedAmount);
      return;
    }
    const fixedAmount = Math.max(0, Number(line?.amount) || 0);
    line.fixedAmount = roundCurrency(fixedAmount);
    line.amount = roundCurrency((fixedAmount / calendarDays) * payableDays);
  });
}

/** Benefits: only lines with calculateOnProRata are day-prorated; others keep full amount. */
function applyBenefitsProration(benefits, calendarDays, paidDays) {
  if (!Array.isArray(benefits) || benefits.length === 0) return;

  const toProrate = [];
  benefits.forEach((line) => {
    if (line?.calculateOnProRata) {
      toProrate.push(line);
    } else {
      line.fixedAmount = roundCurrency(Math.max(0, Number(line?.amount) || 0));
    }
    // Runtime-only flag — not part of payrollRun schema
    delete line.calculateOnProRata;
  });

  prorateSalaryLines(toProrate, calendarDays, paidDays);
}

function sumLineItems(items = []) {
  return (items || []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
}

function getPayrollTdsAmount(payrollLike = {}) {
  const line = (payrollLike.deductions || []).find((item) =>
    /^tds$/i.test(String(item?.componentName || '').trim())
  );
  return roundCurrency(Math.abs(Number(line?.amount) || 0));
}

function clonePayrollLine(line = {}) {
  const plain = line?.toObject ? line.toObject() : { ...line };
  return {
    componentName: plain.componentName,
    amount: Number(plain.amount) || 0,
    fixedAmount: Number(plain.fixedAmount) || Number(plain.amount) || 0,
    calculationType: plain.calculationType || '',
    componentId: plain.componentId,
    claimId: plain.claimId,
    loanId: plain.loanId,
  };
}

function payrollLineKey(line = {}) {
  return String(line?.componentName || '').trim().toLowerCase();
}

function ensurePayrollLines(target = [], extras = []) {
  const have = new Set((target || []).map(payrollLineKey));
  (extras || []).forEach((line) => {
    const key = payrollLineKey(line);
    if (!key || have.has(key)) return;
    target.push(clonePayrollLine(line));
    have.add(key);
  });
  return target;
}

function preserveExistingPayrollExtras(existingPayroll, salaryCalculation) {
  const existingEarnings = existingPayroll?.earnings || [];
  const existingDeductions = existingPayroll?.deductions || [];
  const existingReimbursements = existingPayroll?.reimbursements || [];

  ensurePayrollLines(
    salaryCalculation.earnings,
    existingEarnings.filter(
      (line) =>
        /^arrears$/i.test(String(line?.componentName || '')) ||
        String(line?.calculationType || '').toLowerCase() === 'arrears'
    )
  );
  ensurePayrollLines(
    salaryCalculation.deductions,
    existingDeductions.filter((line) =>
      /loan\s*emi/i.test(String(line?.componentName || ''))
    )
  );
  ensurePayrollLines(salaryCalculation.reimbursements, existingReimbursements);

  const totalEarnings = sumLineItems(salaryCalculation.earnings);
  const totalBenefits = sumLineItems(salaryCalculation.benefits);
  const totalReimbursements = sumLineItems(salaryCalculation.reimbursements);
  salaryCalculation.grossEarnings = roundCurrency(
    totalEarnings + totalBenefits + totalReimbursements
  );
  salaryCalculation.totalDeductions = roundCurrency(sumLineItems(salaryCalculation.deductions));
  salaryCalculation.netPay = roundCurrency(
    salaryCalculation.grossEarnings - salaryCalculation.totalDeductions
  );
  salaryCalculation.tdsAmount = getPayrollTdsAmount(salaryCalculation);
  return salaryCalculation;
}

function buildPayrollCalculatorPayload(payroll, salaryCalculation, calendarDays) {
  const paidDays = Number(salaryCalculation.presentDays);
  return {
    payrollId: payroll?._id,
    employeeId: payroll?.employeeId,
    month: payroll?.month,
    year: payroll?.year,
    payStatus: payroll?.payStatus,
    calendarDays,
    workingDays: salaryCalculation.workingDays,
    paidDays: Number.isFinite(paidDays) ? paidDays : calendarDays,
    lopDays: salaryCalculation.lopDays,
    earnings: salaryCalculation.earnings,
    deductions: salaryCalculation.deductions,
    benefits: salaryCalculation.benefits,
    reimbursements: salaryCalculation.reimbursements,
    grossEarnings: salaryCalculation.grossEarnings,
    totalDeductions: salaryCalculation.totalDeductions,
    netPay: salaryCalculation.netPay,
    employerContributions: salaryCalculation.employerContributions,
    epfDetails: salaryCalculation.epfDetails,
    esiDetails: salaryCalculation.esiDetails,
    ptDetails: salaryCalculation.ptDetails,
    lwfDetails: salaryCalculation.lwfDetails,
    bonusDetails: salaryCalculation.bonusDetails,
  };
}

async function syncTdsAfterPayrollRecalc({
  EmployeeTDSModel,
  organizationId,
  employeeId,
  month,
  year,
  payrollId,
  oldTds,
  newTds,
}) {
  if (!EmployeeTDSModel) return;
  const delta = roundCurrency((Number(newTds) || 0) - (Number(oldTds) || 0));
  if (delta === 0) return;

  const aliases = getFinancialYearAliasesFromPayroll(month, year);
  const record = await EmployeeTDSModel.findOne({
    organizationId,
    employeeId,
    financialYear: { $in: aliases },
  });
  if (!record) return;

  const entry = (record.monthlyDeductions || []).find(
    (item) => String(item.payrollId) === String(payrollId)
  );
  if (entry) {
    entry.tdsDeducted = roundCurrency(Number(newTds) || 0);
  } else if (Number(newTds) > 0) {
    record.monthlyDeductions.push({
      month,
      year,
      tdsDeducted: roundCurrency(Number(newTds) || 0),
      payrollId,
    });
  }
  record.totalTDSDeducted = Math.max(
    0,
    roundCurrency((Number(record.totalTDSDeducted) || 0) + delta)
  );
  record.markModified('monthlyDeductions');
  await record.save();
}

function sumTaxes(deductions = []) {
  return (deductions || [])
    .filter((d) => /tds|tax/i.test(String(d?.componentName || '')))
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
}

function formatPayDay(month, year, payDayValue) {
  const monthIdx = getMonthIndex(month);
  if (monthIdx === -1) return null;

  const day = Math.min(Math.max(parseInt(String(payDayValue || '7'), 10) || 7, 1), 31);
  return formatPayDayFromDate(new Date(year, monthIdx, day));
}

function formatPayDayFromDate(dateVal) {
  const date = new Date(dateVal);
  if (Number.isNaN(date.getTime())) return null;

  const monthLabel = date.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const dayLabel = String(date.getDate()).padStart(2, '0');
  return `${dayLabel} ${monthLabel}, ${date.getFullYear()}`;
}

function mapPayrollRunToEmployeeSummary(payroll) {
  const employee = payroll.employeeId || {};
  const bankInfo = employee.bankInfo || {};
  const earningsTotal = sumLineItems(payroll.earnings);
  const benefitsTotal = sumLineItems(payroll.benefits);
  const reimbursementTotal = sumLineItems(payroll.reimbursements);
  const taxesTotal = sumTaxes(payroll.deductions);
  const deductionsTotal = Math.max(0, (payroll.totalDeductions || 0) - taxesTotal);
  const storedPresentDays = Number(payroll.presentDays);
  const paidDays = Number.isFinite(storedPresentDays)
    ? Math.max(0, storedPresentDays)
    : Math.max(0, (payroll.workingDays || 0) - (payroll.lopDays || 0));

  return {
    payrollId: payroll._id,
    employeeId: employee._id || payroll.employeeId,
    employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    employeeCode: resolveEmployeeDisplayCode(employee),
    department:
      employee.departmentId?.name ||
      employee.payrollInfo?.department ||
      '',
    designation: employee.payrollInfo?.designation || '',
    bankAccountNumber: bankInfo.bankAccountNumber || '',
    bankName: bankInfo.bankName || '',
    branchName: bankInfo.branchName || '',
    ifscCode: bankInfo.ifscCode || '',
    paidDays,
    workingDays: payroll.workingDays || 0,
    presentDays: payroll.presentDays || 0,
    lopDays: payroll.lopDays || 0,
    grossPay: earningsTotal || Math.max(0, (payroll.grossEarnings || 0) - benefitsTotal - reimbursementTotal),
    deductions: deductionsTotal,
    taxes: taxesTotal,
    benefits: benefitsTotal,
    reimbursement: reimbursementTotal,
    netPay: payroll.netPay || 0,
    payStatus: payroll.payStatus || 'pending',
    paymentMode: payroll.paymentMode || null,
    paidDate: payroll.paidDate || null,
    processedDate: payroll.processedDate || payroll.createdAt || null,
  };
}

function buildPayRunPeriodSummary(payrolls = [], activeEmployeeCount = 0, schedule = null, month, year) {
  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalTaxes = 0;
  let totalBenefits = 0;
  let totalReimbursements = 0;
  let totalNetPay = 0;
  let totalEmployerCost = 0;
  let baseDays = 0;

  const statusWise = {
    pending: 0,
    processed: 0,
    approved: 0,
    rejected: 0,
    on_hold: 0,
    paid: 0,
  };

  payrolls.forEach((payroll) => {
    const row = mapPayrollRunToEmployeeSummary(payroll);
    totalGrossPay += row.grossPay;
    totalDeductions += row.deductions;
    totalTaxes += row.taxes;
    totalBenefits += row.benefits;
    totalReimbursements += row.reimbursement;
    totalNetPay += row.netPay;
    totalEmployerCost += (payroll.grossEarnings || 0) + (payroll.employerContributions?.total || 0);
    baseDays = Math.max(baseDays, payroll.workingDays || 0);
    const status = payroll.payStatus || 'pending';
    statusWise[status] = (statusWise[status] || 0) + 1;
  });

  const paidPayroll = payrolls.find((p) => p.paidDate);
  const payDay = paidPayroll?.paidDate
    ? formatPayDayFromDate(paidPayroll.paidDate)
    : schedule?.payDay
      ? formatPayDay(month, year, schedule.payDay)
      : null;

  return {
    payrollCost: Math.round(totalEmployerCost || totalNetPay),
    totalNetPay: Math.round(totalNetPay),
    totalGrossPay: Math.round(totalGrossPay),
    totalDeductions: Math.round(totalDeductions),
    taxes: Math.round(totalTaxes),
    benefits: Math.round(totalBenefits),
    reimbursements: Math.round(totalReimbursements),
    donations: 0,
    employeeCount: payrolls.length,
    skippedEmployees: Math.max(0, activeEmployeeCount - payrolls.length),
    baseDays,
    payDay,
    statusWise,
  };
}

function getMonthDateRange(year, monthName) {
  const monthIndex = getMonthIndex(monthName);
  if (monthIndex === -1) return null;

  const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

function isDateInPayrollMonth(dateVal, monthName, year) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return false;
  const idx = getMonthIndex(monthName);
  if (idx === -1) return false;
  return d.getFullYear() === Number(year) && d.getMonth() === idx;
}

async function buildReimbursementsFromApprovedClaims(
  organizationId,
  employeeId,
  monthName,
  year,
  ClaimsDeclarationModel
) {
  const list = [];
  const reimbursementClaimSubIds = [];
  if (!ClaimsDeclarationModel) {
    return { reimbursements: list, reimbursementClaimSubIds };
  }

  const claimDoc = await ClaimsDeclarationModel.findOne({
    organizationId,
    employeeId,
  });

  if (!claimDoc?.reimbursements?.length) {
    return { reimbursements: list, reimbursementClaimSubIds };
  }

  for (const r of claimDoc.reimbursements) {
    if (r.status !== 'approved') continue;
    if (r.includedInPayrollId) continue;

    const refDate = r.claimDate || r.submittedOn;
    if (!isDateInPayrollMonth(refDate, monthName, year)) continue;

    const amount =
      r.approvedAmount != null && r.approvedAmount > 0
        ? r.approvedAmount
        : r.claimedAmount || 0;
    if (amount <= 0) continue;

    const title = r.headName || r.name || 'Reimbursement';
    const componentName = r.claimNo ? `${title} (${r.claimNo})` : title;

    list.push({
      componentName,
      amount,
      calculationType: 'approved_claim',
      claimId: r._id,
    });
    reimbursementClaimSubIds.push(r._id);
  }

  return { reimbursements: list, reimbursementClaimSubIds };
}

function calculateLeaveOverlapDays(leave, monthStartDate, monthEndDate) {
  const leaveStart = new Date(leave.startDate);
  const leaveEnd = new Date(leave.endDate);

  if (Number.isNaN(leaveStart.getTime()) || Number.isNaN(leaveEnd.getTime())) {
    return 0;
  }

  const overlapStart = leaveStart > monthStartDate ? leaveStart : monthStartDate;
  const overlapEnd = leaveEnd < monthEndDate ? leaveEnd : monthEndDate;

  if (overlapStart > overlapEnd) {
    return 0;
  }

  if (leave.leaveDurationType === 'Half-Day') {
    return 0.5;
  }

  if (leave.leaveDurationType === 'Cluster' && Array.isArray(leave.clusterDates) && leave.clusterDates.length > 0) {
    return leave.clusterDates.reduce((count, clusterDate) => {
      const date = new Date(clusterDate);
      if (Number.isNaN(date.getTime())) return count;

      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedStart = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), monthStartDate.getDate());
      const normalizedEnd = new Date(monthEndDate.getFullYear(), monthEndDate.getMonth(), monthEndDate.getDate());

      if (normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd) {
        return count + 1;
      }
      return count;
    }, 0);
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const start = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
  const end = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
  return Math.floor((end - start) / oneDayMs) + 1;
}

async function getEmployeePaidLeavesForMonth(employeeId, month, year, LeaveRequestModel) {
  if (!LeaveRequestModel) return 0;

  const monthRange = getMonthDateRange(year, month);
  if (!monthRange) return 0;

  const approvedLeaves = await LeaveRequestModel.find({
    employeeId,
    status: 'Approved',
    startDate: { $lte: monthRange.endDate },
    endDate: { $gte: monthRange.startDate },
  })
    .select('startDate endDate leaveDurationType clusterDates leaveTypeId')
    .populate('leaveTypeId', 'leaveType')
    .lean();

  if (!approvedLeaves?.length) return 0;

  const paidOrOnDutyLeaves = approvedLeaves.filter((leave) => {
    const leaveType = leave.leaveTypeId?.leaveType;
    return leaveType === 'Paid' || leaveType === 'On Duty';
  });

  if (!paidOrOnDutyLeaves.length) return 0;

  return paidOrOnDutyLeaves.reduce((total, leave) => {
    return total + calculateLeaveOverlapDays(leave, monthRange.startDate, monthRange.endDate);
  }, 0);
}

async function getEmployeePresentDaysForMonth(employeeId, month, year, AttendanceModel) {
  if (!AttendanceModel) return 0;

  const monthRange = getMonthDateRange(year, month);
  if (!monthRange) return 0;

  const attendanceSummary = await AttendanceModel.aggregate([
    {
      $match: {
        employeeId,
        date: { $gte: monthRange.startDate, $lte: monthRange.endDate },
      },
    },
    {
      $group: {
        _id: null,
        presentDays: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'Present'] }, then: 1 },
                { case: { $eq: ['$status', 'HalfDay'] }, then: 0.5 },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]);

  return attendanceSummary[0]?.presentDays || 0;
}

/**
 * Sum present + paid-leave days from Apr through the payroll month (Bonus Act accounting year).
 */
async function getBonusAccountingYearWorkedDays(
  employeeId,
  month,
  year,
  AttendanceModel,
  LeaveRequestModel,
  currentMonthWorkedDays = null
) {
  if (!AttendanceModel) return null;

  const periods = getAccountingYearPeriodsUpTo(month, year);
  if (!periods.length) return null;

  let total = 0;
  for (const period of periods) {
    const isCurrent =
      period.month === month && Number(period.year) === Number(year);

    if (isCurrent && currentMonthWorkedDays !== null && currentMonthWorkedDays !== undefined) {
      total += Math.max(0, Number(currentMonthWorkedDays) || 0);
      continue;
    }

    const presentDays = await getEmployeePresentDaysForMonth(
      employeeId,
      period.month,
      period.year,
      AttendanceModel
    );
    const paidLeaves = LeaveRequestModel
      ? await getEmployeePaidLeavesForMonth(
          employeeId,
          period.month,
          period.year,
          LeaveRequestModel
        )
      : 0;
    total += presentDays + paidLeaves;
  }

  return total;
}

// Improved salary calculation function
async function calculateEmployeeSalaryImproved(
  employee,
  salaryComponents,
  compliance,
  month,
  year,
  org_uuid,
  AttendanceModel,
  LeaveRequestModel,
  EmployeeTDSModel,
  ArrearsModel,
  schedule,
  ShiftModel,
  HolidayModel,
  ClaimsDeclarationModel,
  oneTimeRows = [],
  EmployeeLoanModel = null,
  LoanRepaymentModel = null,
  PayrollRunModel = null,
  options = {}
) {
  const earnings = [];
  const deductions = [];
  const benefits = [];
  const reimbursements = [];

  // Get employee's base salary from payrollInfo
  let baseSalary = employee.payrollInfo?.baseSalary || employee.baseSalary || 0;
  let gross = employee.payrollInfo?.grossSalary || employee.grossSalary || baseSalary * 1.3;

  // Calendar days = salary divisor (Feb 28/29, Jun 30, Jul 31, ...)
  const calendarDays = getCalendarDaysInPayrollMonth(month, year);

  // Working days = calendar days minus week-offs and Public/Company holidays
  let workingDays = 26; // Default
  if (employee.shiftId && ShiftModel && HolidayModel) {
    workingDays = await calculateEmployeeWorkingDays(
      employee.shiftId,
      year,
      month,
      org_uuid,
      ShiftModel,
      HolidayModel
    );
  } else if (schedule && schedule.workingDays && schedule.workingDays.length > 0) {
    // Fallback to schedule working days
    workingDays = calculateWorkingDaysInMonth(year, month, schedule.workingDays);
  }

  // Standard paid days: Calendar Days − LOP
  // Week offs + holidays are paid (included in calendar days, excluded from LOP).
  // LOP = missing unpaid days on working days only.
  // Full attendance → paidDays = calendarDays → full month gross.
  let lopDays = 0;
  let attendance = calendarDays > 0 ? calendarDays : workingDays; // paid days
  let earnedOnWorkingDaysForBonus = null;

  if (AttendanceModel && calendarDays > 0) {
    const presentDays = await getEmployeePresentDaysForMonth(
      employee._id,
      month,
      year,
      AttendanceModel
    );
    const paidLeaves = await getEmployeePaidLeavesForMonth(
      employee._id,
      month,
      year,
      LeaveRequestModel
    );

    const earnedOnWorkingDays = Math.min(presentDays + paidLeaves, workingDays);
    earnedOnWorkingDaysForBonus = earnedOnWorkingDays;
    lopDays = Math.max(0, workingDays - earnedOnWorkingDays);
    attendance = Math.max(0, calendarDays - lopDays);
  }

  const paidDaysOverride = Number(options?.paidDays);
  if (Number.isFinite(paidDaysOverride)) {
    const divisor = calendarDays > 0 ? calendarDays : workingDays;
    attendance = Math.max(0, Math.min(paidDaysOverride, divisor));
    lopDays = Math.max(0, divisor - attendance);
  }

  const componentOverrides = mergeOneTimeIntoOverrides(
    normalizeOverrides(employee.payrollInfo?.componentOverrides || []),
    oneTimeRows
  );
  const { basicComponent, otherComponents } = getActiveEarningsComponents(salaryComponents);

  // Prefer explicit Basic override as the payroll base (same as structure preview)
  if (basicComponent) {
    const basicOverride = findComponentOverride(componentOverrides, 'earnings', basicComponent);
    if (hasExplicitOverrideAmount(basicOverride)) {
      baseSalary = Math.round(basicOverride.overrideAmount);
    }
  }

  const salaryBases = {
    baseSalary,
    grossSalary: gross,
    ctc: employee.payrollInfo?.ctc || gross * 12,
  };
  const paidComponentKeys = PayrollRunModel
    ? await loadPaidComponentKeysForEmployee(
        org_uuid,
        employee._id,
        PayrollRunModel,
        options?.excludePayrollId || null
      )
    : new Set();

  // ===== EARNINGS =====
  // Add Basic once: from org Basic component (with override), else legacy unshift
  if (basicComponent) {
    if (!findComponentOverride(componentOverrides, 'earnings', basicComponent)?.disabled) {
      earnings.push({
        componentName: basicComponent.name || 'Basic Salary',
        amount: baseSalary,
        calculationType: basicComponent.calculationType || 'fixed',
        componentId: basicComponent._id,
        ...getComplianceFlags(basicComponent),
      });
    }
  } else if (baseSalary > 0) {
    earnings.push({
      componentName: 'Basic Salary',
      amount: baseSalary,
      calculationType: 'fixed',
      ...getComplianceFlags({ considerForEPF: true, considerForESI: true }),
    });
  }

  otherComponents.forEach((component) => {
    addPayrollComponentLine(
      earnings,
      'earnings',
      component,
      salaryBases,
      componentOverrides,
      month,
      paidComponentKeys
    );
  });

  // Auto Special / Other Extra Allowance — fills gap to employee gross (same as salary structure calculator)
  {
    const targetGross = Math.round(Number(employee.payrollInfo?.grossSalary || gross) || 0);
    const currentEarnings = earnings.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const specialOverride =
      findComponentOverride(componentOverrides, 'earnings', {
        code: 'SPECIAL',
        name: 'Special Allowance',
      }) ||
      findComponentOverride(componentOverrides, 'earnings', {
        code: 'other allowance',
        name: 'Other Allowance',
      }) ||
      findComponentOverride(componentOverrides, 'earnings', {
        code: 'OTHER_EXTRA',
        name: 'Other Extra Allowance',
      });

    let balancingAmount = 0;
    if (specialOverride?.disabled) {
      balancingAmount = 0;
    } else if (hasExplicitOverrideAmount(specialOverride)) {
      balancingAmount = Math.round(specialOverride.overrideAmount);
    } else if (targetGross > 0) {
      balancingAmount = Math.round(targetGross - currentEarnings);
    }

    // Avoid duplicate if org already has a balancing allowance component line
    const alreadyHasBalancing = earnings.some((row) => {
      const name = normalizeComponentKey(row.componentName);
      return (
        name === 'special allowance' ||
        name === 'other allowance' ||
        name === 'other extra allowance' ||
        name.startsWith('special ') ||
        name.startsWith('other allowance') ||
        name.startsWith('other extra')
      );
    });

    if (!alreadyHasBalancing && balancingAmount > 0) {
      const balancingLine = buildBalancingAllowanceLine(balancingAmount);
      if (balancingLine) {
        earnings.push({
          componentName: balancingLine.name,
          amount: balancingLine.calculatedAmount,
          calculationType: 'fixed',
          isBalancing: true,
          ...getComplianceFlags(balancingLine),
        });
      }
    }
  }

  // Statutory Bonus — computed on full-month Basic+DA; added after LOP proration (never prorated)
  const accountingYearWorkedDays = await getBonusAccountingYearWorkedDays(
    employee._id,
    month,
    year,
    AttendanceModel,
    LeaveRequestModel,
    earnedOnWorkingDaysForBonus
  );
  const bonusBreakdown = calculateStatutoryBonus({
    bonusConfig: compliance?.statutoryBonus,
    basicPlusDA: sumBasicPlusDA(earnings),
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeEmploymentCategory: employee.statutoryInfo?.employmentCategory,
    month,
    year,
    accountingYearWorkedDays,
  });

  // Full-month PF wage before calendar-day LOP proration (for EPF LOP rules)
  const fullMonthEpfWageBeforeLop = sumConsiderForEpf(earnings, baseSalary);

  // Earn every recurring salary component on calendar-day basis.
  // Standard: (component / calendarDays) × paidDays; paidDays includes week offs + holidays.
  prorateSalaryLines(earnings, calendarDays, attendance);

  if (bonusBreakdown.applicable && bonusBreakdown.amount > 0) {
    earnings.push({
      componentName: 'Statutory Bonus',
      amount: bonusBreakdown.amount,
      fixedAmount: bonusBreakdown.amount,
      calculationType: 'statutory',
    });
  }
  const earnedBasicSalary =
    earnings.find(
      (line) =>
        (basicComponent?._id &&
          String(line.componentId || '') === String(basicComponent._id)) ||
        isBasicSalaryComponent({ name: line.componentName })
    )?.amount || 0;
  const earnedGrossSalary = sumLineItems(earnings);

  // ===== DEDUCTIONS =====
  const deductionsComponents = salaryComponents.find((c) => c.category === 'deductions');

  // EPF: full-month PF components + LOP settings (pro-rate ceiling / consider-all-components)
  const epfWageResolution = resolveEpfApplicableWage({
    epfConfig: compliance?.epf,
    fullMonthEpfWage: fullMonthEpfWageBeforeLop,
    workingDays: calendarDays,
    paidDays: attendance,
  });
  const epfBreakdown = calculateEpf({
    epfConfig: compliance?.epf,
    baseSalary: earnedBasicSalary,
    epfApplicableWage: epfWageResolution.wage,
    employeeStatutoryInfo: employee.statutoryInfo,
    epfWageResolution,
  });

  if (epfBreakdown.applicable && epfBreakdown.employeeContribution > 0) {
    deductions.push({
      componentName: 'EPF (Employee)',
      amount: epfBreakdown.employeeContribution,
      calculationType: 'percentage',
    });
  }

  const vpf = normalizeVpf(employee.payrollPreferences);
  if (checkVpfEffectiveForPayroll(vpf, month, year, getMonthDateRange)) {
    const vpfAmount = calculateMonthlyVpfAmount(vpf, earnedBasicSalary);
    if (vpfAmount > 0) {
      deductions.push({
        componentName: 'VPF (Voluntary PF)',
        amount: vpfAmount,
        calculationType: vpf.contributionType === 'fixed' ? 'fixed' : 'percentage',
      });
    }
  }

  // ESI Deduction (centralized — honors per-employee opt-out + considerForESI)
  const esiBreakdown = calculateEsi({
    esiConfig: compliance?.esi,
    grossSalary: earnedGrossSalary,
    esiApplicableWage: sumConsiderForEsi(earnings, earnedGrossSalary),
    employeeStatutoryInfo: employee.statutoryInfo,
  });

  if (esiBreakdown.applicable && esiBreakdown.employeeContribution > 0) {
    deductions.push({
      componentName: 'ESI (Employee)',
      amount: esiBreakdown.employeeContribution,
      calculationType: 'percentage',
    });
  }

  // Professional Tax (centralized — uses employee state, supports multi-state + cycle)
  const ptBreakdown = calculateProfessionalTax({
    ptConfig: compliance?.professionalTax,
    grossSalary: earnedGrossSalary,
    month,
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeStatutoryInfo: employee.statutoryInfo,
  });
  if (ptBreakdown.applicable) {
    deductions.push({
      componentName: 'Professional Tax',
      amount: ptBreakdown.amount,
      calculationType: 'slab',
    });
  }

  // Labour Welfare Fund (centralized — half-yearly by default; employer share captured separately)
  const lwfBreakdown = calculateLwf({
    lwfConfig: compliance?.labourWelfareFund,
    grossSalary: earnedGrossSalary,
    month,
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeStatutoryInfo: employee.statutoryInfo,
  });
  if (lwfBreakdown.applicable && lwfBreakdown.employeeShare > 0) {
    deductions.push({
      componentName: 'Labour Welfare Fund',
      amount: lwfBreakdown.employeeShare,
      calculationType: 'statutory',
    });
  }

  // TDS Deduction — from the implementation date (inclusive) through 31 March.
  // Days before that date are excluded. Gross, PF, ESI, and other components are unchanged.
  const { SalaryRevisionModel } = await initModels(org_uuid);
  const payrollImplementationDate = await resolveEmployeeImplementationDate({
    employee,
    organizationId: org_uuid,
    SalaryRevisionModel,
  });
  const tdsDayFactor = getPayrollMonthTdsFactor(month, year, payrollImplementationDate);
  const includeTdsForPayrollMonth = tdsDayFactor > 0;

  let tdsAmount = 0;
  let tdsRecord = null;
  if (includeTdsForPayrollMonth && EmployeeTDSModel) {
    const financialYearAliases = getFinancialYearAliasesFromPayroll(month, year);
    tdsRecord = await EmployeeTDSModel.findOne({
      organizationId: org_uuid,
      employeeId: employee._id,
      financialYear: { $in: financialYearAliases },
    });

    if (tdsRecord && tdsRecord.monthlyTDS > 0) {
      tdsAmount = Math.round(tdsRecord.monthlyTDS * tdsDayFactor);
      if (tdsAmount > 0) {
        deductions.push({
          componentName: 'TDS',
          amount: tdsAmount,
          calculationType: 'calculated',
        });
      }
    }
  }

  // Other deductions from components
  if (deductionsComponents) {
    deductionsComponents.components.forEach((component) => {
      addPayrollComponentLine(
        deductions,
        'deductions',
        component,
        salaryBases,
        componentOverrides,
        month,
        paidComponentKeys
      );
    });
  }

  // ===== BENEFITS =====
  const benefitsComponents = salaryComponents.find((c) => c.category === 'benefits');
  if (benefitsComponents) {
    benefitsComponents.components.forEach((component) => {
      addPayrollComponentLine(
        benefits,
        'benefits',
        component,
        salaryBases,
        componentOverrides,
        month,
        paidComponentKeys
      );
    });
  }
  applyBenefitsProration(benefits, calendarDays, attendance);

  applyAdHocOneTimeLines(oneTimeRows, earnings, deductions, benefits);

  // ===== REIMBURSEMENTS (approved claims only; master reimbursement value is not added) =====
  const { reimbursements: claimReimbursements, reimbursementClaimSubIds } =
    await buildReimbursementsFromApprovedClaims(
      org_uuid,
      employee._id,
      month,
      year,
      ClaimsDeclarationModel
    );
  reimbursements.push(...claimReimbursements);

  // ===== CHECK FOR PENDING ARREARS =====
  // Include approved arrears scheduled for this payroll month (payInMonth/Year).
  // Legacy rows without payInMonth still attach to the next payroll run.
  let arrearsAmount = 0;
  let arrearsId = null;
  if (ArrearsModel) {
    const pendingArrears = await ArrearsModel.findOne({
      organizationId: org_uuid,
      employeeId: employee._id,
      status: 'approved',
      $or: [
        { payInMonth: month, payInYear: Number(year) },
        {
          $and: [
            { $or: [{ payInMonth: null }, { payInMonth: '' }, { payInMonth: { $exists: false } }] },
            { $or: [{ payInYear: null }, { payInYear: { $exists: false } }] },
          ],
        },
      ],
    }).sort({ createdAt: 1 });

    if (pendingArrears) {
      arrearsAmount = pendingArrears.netArrearsPayable || 0;
      arrearsId = pendingArrears._id;
      earnings.push({
        componentName: 'Arrears',
        amount: arrearsAmount,
        calculationType: 'arrears',
      });
    }
  }

  // ===== LOAN EMI DEDUCTIONS =====
  const { deductions: loanEmiDeductions, loanRepaymentPlans } =
    await buildLoanEmiDeductionsForEmployee({
      organizationId: org_uuid,
      employeeId: employee._id,
      month,
      year,
      EmployeeLoanModel,
      LoanRepaymentModel,
      PayrollRunModel,
    });
  deductions.push(...loanEmiDeductions);

  // ===== LOAN PERQUISITE (TDS only — not shown on salary slip) =====
  const loanPerquisiteResult = await buildEmployeeLoanPerquisiteForPayroll({
    organizationId: org_uuid,
    employeeId: employee._id,
    month,
    year,
    EmployeeLoanModel,
  });

  if (includeTdsForPayrollMonth && loanPerquisiteResult.totalMonthlyPerquisite > 0) {
    const extraTds = calculateAdditionalTdsForPerquisite(
      loanPerquisiteResult.totalMonthlyPerquisite * tdsDayFactor,
      tdsRecord || {}
    );
    if (extraTds > 0) {
      const tdsLine = deductions.find((row) => row.componentName === 'TDS');
      if (tdsLine) {
        tdsLine.amount += extraTds;
      } else {
        deductions.push({
          componentName: 'TDS',
          amount: extraTds,
          calculationType: 'calculated',
        });
      }
      tdsAmount += extraTds;
    }
  }

  // LOP must never affect payroll totals, including a similarly named custom component.
  for (let index = deductions.length - 1; index >= 0; index -= 1) {
    const name = String(deductions[index]?.componentName || '').trim();
    if (/^(loss\s*of\s*pay|lop)$/i.test(name)) {
      deductions.splice(index, 1);
    }
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalBenefits = benefits.reduce((sum, b) => sum + b.amount, 0);
  const totalReimbursements = reimbursements.reduce((sum, r) => sum + r.amount, 0);
  const grossEarnings = totalEarnings + totalBenefits + totalReimbursements;

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netPay = grossEarnings - totalDeductions;

  // Employer-side contributions captured for CTC + statutory returns
  // ESI employer is only added when "Include Employer in Salary Structure" is ON;
  // otherwise it stays statutorily due but doesn't inflate CTC.
  const esiEmployerForCtc = esiBreakdown.includeEmployerInCtc
    ? esiBreakdown.employerContribution
    : 0;
  const employerContributions = {
    epf: epfBreakdown.employerContribution || 0,
    edli: epfBreakdown.edliContribution || 0,
    adminCharges: epfBreakdown.adminCharges || 0,
    esi: esiEmployerForCtc || 0,
    lwf: lwfBreakdown.employerShare || 0,
    total: 0,
  };
  employerContributions.total =
    employerContributions.epf +
    employerContributions.edli +
    employerContributions.adminCharges +
    employerContributions.esi +
    employerContributions.lwf;

  return {
    earnings,
    deductions,
    benefits,
    reimbursements,
    grossEarnings: roundCurrency(grossEarnings),
    totalDeductions: roundCurrency(totalDeductions),
    netPay: roundCurrency(netPay),
    loanPerquisiteTotal: Math.round(loanPerquisiteResult.totalMonthlyPerquisite),
    workingDays,
    // presentDays stores payable paid days (calendar − LOP) for slip / history mapping
    presentDays: attendance,
    absentDays: lopDays,
    lopDays,
    tdsAmount,
    arrearsId,
    reimbursementClaimSubIds,
    loanRepaymentPlans,
    employerContributions,
    epfDetails: {
      applicable: epfBreakdown.applicable,
      epfWage: epfBreakdown.epfWage,
      employeeRate: epfBreakdown.details?.employeeRate || 0,
      employerRate: epfBreakdown.details?.employerRate || 0,
      ceilingApplied: epfBreakdown.details?.ceilingApplied !== false,
      effectiveCeiling: epfBreakdown.details?.effectiveCeiling || 0,
      abryApplied: !!epfBreakdown.abryApplied,
      overrideUsed: !!epfBreakdown.details?.overrideUsed,
    },
    esiDetails: {
      applicable: esiBreakdown.applicable,
      wageUsed: esiBreakdown.wageUsed || 0,
      employeeRate: esiBreakdown.details?.employeeRate || 0,
      employerRate: esiBreakdown.details?.employerRate || 0,
      wageLimit: esiBreakdown.details?.wageLimit || 0,
      includeEmployerInCtc: esiBreakdown.includeEmployerInCtc !== false,
    },
    ptDetails: {
      applicable: ptBreakdown.applicable,
      stateUsed: ptBreakdown.details?.stateUsed || '',
      ptNumber: ptBreakdown.details?.ptNumber || '',
      cycle: ptBreakdown.details?.cycle || 'monthly',
      amount: ptBreakdown.amount || 0,
    },
    lwfDetails: {
      applicable: lwfBreakdown.applicable,
      stateUsed: lwfBreakdown.details?.stateUsed || '',
      cycle: lwfBreakdown.details?.cycle || 'half-yearly',
      employeeShare: lwfBreakdown.employeeShare || 0,
      employerShare: lwfBreakdown.employerShare || 0,
    },
    bonusDetails: {
      applicable: bonusBreakdown.applicable,
      amount: bonusBreakdown.amount || 0,
      cycle: bonusBreakdown.cycle || 'yearly',
      paymentMonth: bonusBreakdown.details?.paymentMonth || '',
      calcBase: bonusBreakdown.details?.calcBase || 0,
      percentage: bonusBreakdown.details?.percentage || 0,
      accountingYearWorkedDays: bonusBreakdown.details?.accountingYearWorkedDays ?? null,
      minWorkingDaysRequired: bonusBreakdown.details?.minWorkingDaysRequired ?? null,
    },
  };
}

const PAID_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PAID_DAY_WEEK_KEYS = ['firstWeek', 'secondWeek', 'thirdWeek', 'fourthWeek', 'fifthWeek'];

function isShiftWeeklyOff(shift, day, dayName) {
  if (!shift?.weeklyOff || !dayName) return false;
  const weekNumber = Math.ceil(day / 7);
  const weekKey = PAID_DAY_WEEK_KEYS[Math.min(weekNumber - 1, 4)];
  const days = shift.weeklyOff[weekKey]?.days || [];
  return days.includes(dayName);
}

function rememberAttendanceStatus(current, next) {
  const rank = { Present: 5, HalfDay: 4, 'On Duty': 3, Leave: 2, Absent: 1, Lwp: 1 };
  if (!current) return next;
  return (rank[next] || 0) >= (rank[current] || 0) ? next : current;
}

function addPaidLeaveDays(leave, year, monthIndex, leaveByDay) {
  const category = leave.leaveTypeId?.leaveType;
  const paid = category === 'Paid' || category === 'On Duty';
  const named = leave.leaveTypeId?.leaveNameId?.name;
  const typeName = named || (category === 'On Duty' ? 'On Duty' : paid ? 'Paid leave' : 'Unpaid leave');
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  const put = (date, half) => {
    if (!date || date.getFullYear() !== year || date.getMonth() !== monthIndex) return;
    const existing = leaveByDay.get(date.getDate());
    if (!existing || (existing.half && !half) || (!existing.paid && paid)) {
      leaveByDay.set(date.getDate(), { name: typeName, half: !!half, paid });
    }
  };

  if (leave.leaveDurationType === 'Cluster' && Array.isArray(leave.clusterDates)) {
    leave.clusterDates.forEach((clusterDate) => put(toCalendarDate(clusterDate), false));
    return;
  }

  const start = toCalendarDate(leave.startDate);
  const end = toCalendarDate(leave.endDate);
  if (!start || !end) return;
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  if (from > to) return;

  if (leave.leaveDurationType === 'Half-Day') {
    put(from, true);
    return;
  }

  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    put(new Date(cursor), false);
  }
}

/**
 * Day picture behind paid days: present, absent, week off, holiday, and unmarked working days.
 * Counts use the same rules as salary (week off and holiday are paid; LOP is only on working days).
 */
async function buildPaidDaysBreakdown({
  employeeId,
  month,
  year,
  org_uuid,
  EmployeeModel,
  AttendanceModel,
  LeaveRequestModel,
  ShiftModel,
  HolidayModel,
}) {
  const monthName = normalizePayrollMonth(month);
  const monthIndex = getMonthIndex(monthName);
  const numericYear = Number(year);
  if (!employeeId || monthIndex === -1 || !Number.isInteger(numericYear)) return null;

  const calendarDays = new Date(numericYear, monthIndex + 1, 0).getDate();
  const monthRange = getMonthDateRange(numericYear, monthName);
  if (!monthRange || calendarDays <= 0) return null;

  const employee = EmployeeModel
    ? await EmployeeModel.findById(employeeId).select('shiftId').lean()
    : null;
  const shift = employee?.shiftId && ShiftModel
    ? await ShiftModel.findById(employee.shiftId).select('weeklyOff name').lean()
    : null;

  const holidays = HolidayModel
    ? await HolidayModel.find({
      location: org_uuid,
      date: { $gte: monthRange.startDate, $lte: monthRange.endDate },
      status: 'Active',
      type: { $in: ['Public', 'Company'] },
    }).select('holidayName date type').lean()
    : [];

  const holidayByDay = new Map();
  holidays.forEach((holiday) => {
    const date = toCalendarDate(holiday.date);
    if (!date || date.getFullYear() !== numericYear || date.getMonth() !== monthIndex) return;
    if (!holidayByDay.has(date.getDate())) {
      holidayByDay.set(date.getDate(), {
        name: holiday.holidayName || 'Holiday',
        type: holiday.type || 'Company',
      });
    }
  });

  const attendanceRows = AttendanceModel
    ? await AttendanceModel.find({
      employeeId,
      date: { $gte: monthRange.startDate, $lte: monthRange.endDate },
    }).select('date status').lean()
    : [];

  const attendanceByDay = new Map();
  attendanceRows.forEach((row) => {
    const date = toCalendarDate(row.date);
    if (!date || date.getFullYear() !== numericYear || date.getMonth() !== monthIndex) return;
    const day = date.getDate();
    attendanceByDay.set(day, rememberAttendanceStatus(attendanceByDay.get(day), row.status || 'Present'));
  });

  const leaveByDay = new Map();
  if (LeaveRequestModel) {
    const approvedLeaves = await LeaveRequestModel.find({
      employeeId,
      status: 'Approved',
      startDate: { $lte: monthRange.endDate },
      endDate: { $gte: monthRange.startDate },
    })
      .select('startDate endDate leaveDurationType clusterDates leaveTypeId')
      .populate({
        path: 'leaveTypeId',
        select: 'leaveType leaveNameId',
        populate: { path: 'leaveNameId', select: 'name' },
      })
      .lean();

    (approvedLeaves || []).forEach((leave) => addPaidLeaveDays(leave, numericYear, monthIndex, leaveByDay));
  }

  const days = [];
  const holidayList = [];
  let weekOffDays = 0;
  let holidayDays = 0;
  let presentFullDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let unmarkedDays = 0;
  let workingDays = 0;

  for (let day = 1; day <= calendarDays; day++) {
    const date = new Date(numericYear, monthIndex, day);
    const dayName = PAID_DAY_NAMES[date.getDay()];
    const holiday = holidayByDay.get(day) || null;
    const weekOff = !holiday && isShiftWeeklyOff(shift, day, dayName);
    const isWorking = !holiday && !weekOff;
    if (isWorking) workingDays += 1;

    const status = attendanceByDay.get(day);
    const leaveInfo = isWorking ? leaveByDay.get(day) : null;
    let kind = 'unmarked';
    let title = 'No attendance';

    if (holiday) {
      kind = 'holiday';
      title = holiday.name;
      holidayDays += 1;
      holidayList.push({ day, name: holiday.name, type: holiday.type });
    } else if (weekOff) {
      kind = 'weekoff';
      title = 'Week off';
      weekOffDays += 1;
    } else if (status === 'Present') {
      kind = 'present';
      title = 'Present';
      presentFullDays += 1;
    } else if (status === 'HalfDay') {
      kind = 'half';
      title = 'Half day';
      halfDays += 1;
    } else if (leaveInfo?.paid) {
      kind = 'leave';
      title = leaveInfo.half ? `${leaveInfo.name} (half)` : leaveInfo.name;
      paidLeaveDays += leaveInfo.half ? 0.5 : 1;
    } else if (leaveInfo) {
      kind = 'unpaidLeave';
      title = leaveInfo.half ? `${leaveInfo.name} (half)` : leaveInfo.name;
      unpaidLeaveDays += leaveInfo.half ? 0.5 : 1;
    } else if (status === 'Leave' || status === 'On Duty') {
      kind = 'unpaidLeave';
      title = status === 'On Duty' ? 'On Duty' : 'Leave';
      unpaidLeaveDays += 1;
    } else if (status === 'Absent' || status === 'Lwp') {
      kind = 'absent';
      title = status === 'Lwp' ? 'LWP' : 'Absent';
      absentDays += 1;
    } else {
      unmarkedDays += 1;
    }

    days.push({ day, weekday: dayName.slice(0, 3), kind, title });
  }

  const presentDays = presentFullDays + (halfDays * 0.5);
  const earnedOnWorkingDays = Math.min(presentDays + paidLeaveDays, workingDays);
  const lopDays = Math.max(0, workingDays - earnedOnWorkingDays);
  const paidDays = Math.max(0, calendarDays - lopDays);

  return {
    calendarDays,
    workingDays,
    paidDays,
    lopDays,
    presentDays: presentFullDays,
    halfDays,
    absentDays,
    weekOffDays,
    holidayDays,
    paidLeaveDays,
    unpaidLeaveDays,
    unmarkedDays,
    startWeekday: new Date(numericYear, monthIndex, 1).getDay(),
    shiftName: shift?.name || '',
    holidays: holidayList,
    days,
  };
}

// Calculate working days in a month
/**
 * Calculate working days for a specific employee based on their shift and holidays
 */
async function calculateEmployeeWorkingDays(shiftId, year, monthName, org_uuid, ShiftModel, HolidayModel) {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = months.indexOf(monthName);
    
    if (monthIndex === -1) return 26; // Default
    
    // Get employee's shift details
    const shift = await ShiftModel.findById(shiftId);
    if (!shift) {
      return 26; // Default if shift not found
    }
    
    // Get holidays for this month
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    
    const holidays = await HolidayModel.find({
      location: org_uuid,
      date: { $gte: startDate, $lte: endDate },
      status: 'Active',
      type: { $in: ['Public', 'Company'] } // Don't include Optional holidays as working day deductions
    });
    
    const holidayDates = new Set(
      holidays.map(h => new Date(h.date).getDate())
    );
    
    const lastDay = endDate.getDate();
    let workingDays = 0;
    
    const dayMap = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };
    
    // Process each day in the month
    for (let day = 1; day <= lastDay; day++) {
      const currentDate = new Date(year, monthIndex, day);
      const dayOfWeek = currentDate.getDay();
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      
      // Skip if it's a holiday
      if (holidayDates.has(day)) {
        continue;
      }
      
      // Determine which week of the month
      const weekNumber = Math.ceil(day / 7);
      let isWeeklyOff = false;
      
      // Check shift's weekly off configuration
      if (shift.weeklyOff) {
        const weekKeys = ['firstWeek', 'secondWeek', 'thirdWeek', 'fourthWeek', 'fifthWeek'];
        const weekKey = weekKeys[Math.min(weekNumber - 1, 4)]; // Max 5 weeks
        
        if (shift.weeklyOff[weekKey] && shift.weeklyOff[weekKey].days) {
          if (shift.weeklyOff[weekKey].days.includes(dayName)) {
            isWeeklyOff = true;
          }
        }
      }
      
      // Count as working day if not a weekly off
      if (!isWeeklyOff) {
        workingDays++;
      }
    }
    
    return workingDays || 26; // Default to 26 if calculation fails
  } catch (error) {
    console.error('Error calculating employee working days:', error);
    return 26; // Default on error
  }
}

function calculateWorkingDaysInMonth(year, monthName, workingDaysArray) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = months.indexOf(monthName);
  
  if (monthIndex === -1) return 26; // Default
  
  const date = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  
  let workingDays = 0;
  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };
  
  const workingDayNumbers = workingDaysArray.map(day => dayMap[day]);
  
  for (let day = 1; day <= lastDay; day++) {
    const currentDate = new Date(year, monthIndex, day);
    if (workingDayNumbers.includes(currentDate.getDay())) {
      workingDays++;
    }
  }
  
  return workingDays || 26; // Default to 26 if calculation fails
}

async function calculateEmployeeSalary(
  employee,
  salaryComponents,
  compliance,
  month,
  year,
  org_uuid,
  AttendanceModel,
  LeaveRequestModel
) {
  const earnings = [];
  const deductions = [];
  const benefits = [];
  const reimbursements = [];

  // Get employee's base salary from payrollInfo (updated to use new fields)
  let baseSalary = employee.payrollInfo?.baseSalary || employee.baseSalary || 50000;
  const gross = employee.payrollInfo?.grossSalary || employee.grossSalary || baseSalary * 1.3;

  // Calculate attendance and LOP
  const workingDays = 26; // Assuming 26 working days per month
  const attendance = await AttendanceModel?.countDocuments({
    employeeId: employee._id,
    month,
    year,
    status: 'present',
  }) || workingDays;

  const componentOverridesLegacy = normalizeOverrides(employee.payrollInfo?.componentOverrides || []);
  const { basicComponent: basicComponentLegacy, otherComponents: otherComponentsLegacy } =
    getActiveEarningsComponents(salaryComponents);

  if (basicComponentLegacy) {
    const basicOverride = findComponentOverride(
      componentOverridesLegacy,
      'earnings',
      basicComponentLegacy
    );
    if (hasExplicitOverrideAmount(basicOverride)) {
      baseSalary = Math.round(basicOverride.overrideAmount);
    }
  }

  const salaryBasesLegacy = {
    baseSalary,
    grossSalary: gross,
    ctc: employee.payrollInfo?.ctc || gross * 12,
  };
  const paidComponentKeysLegacy = new Set();

  // ===== EARNINGS =====
  if (basicComponentLegacy) {
    if (!findComponentOverride(componentOverridesLegacy, 'earnings', basicComponentLegacy)?.disabled) {
      earnings.push({
        componentName: basicComponentLegacy.name || 'Basic Salary',
        amount: baseSalary,
        calculationType: basicComponentLegacy.calculationType || 'fixed',
        componentId: basicComponentLegacy._id,
        ...getComplianceFlags(basicComponentLegacy),
      });
    }
  } else if (baseSalary > 0) {
    earnings.push({
      componentName: 'Basic Salary',
      amount: baseSalary,
      calculationType: 'fixed',
      ...getComplianceFlags({ considerForEPF: true, considerForESI: true }),
    });
  }

  otherComponentsLegacy.forEach((component) => {
    addPayrollComponentLine(
      earnings,
      'earnings',
      component,
      salaryBasesLegacy,
      componentOverridesLegacy,
      month,
      paidComponentKeysLegacy
    );
  });

  // Auto Special / Other Extra Allowance (legacy path)
  {
    const targetGross = Math.round(Number(employee.payrollInfo?.grossSalary || gross) || 0);
    const currentEarnings = earnings.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const specialOverride =
      findComponentOverride(componentOverridesLegacy, 'earnings', {
        code: 'SPECIAL',
        name: 'Special Allowance',
      }) ||
      findComponentOverride(componentOverridesLegacy, 'earnings', {
        code: 'other allowance',
        name: 'Other Allowance',
      }) ||
      findComponentOverride(componentOverridesLegacy, 'earnings', {
        code: 'OTHER_EXTRA',
        name: 'Other Extra Allowance',
      });

    let balancingAmount = 0;
    if (specialOverride?.disabled) {
      balancingAmount = 0;
    } else if (hasExplicitOverrideAmount(specialOverride)) {
      balancingAmount = Math.round(specialOverride.overrideAmount);
    } else if (targetGross > 0) {
      balancingAmount = Math.round(targetGross - currentEarnings);
    }

    const alreadyHasBalancing = earnings.some((row) => {
      const name = normalizeComponentKey(row.componentName);
      return (
        name === 'special allowance' ||
        name === 'other allowance' ||
        name === 'other extra allowance' ||
        name.startsWith('special ') ||
        name.startsWith('other extra')
      );
    });

    if (!alreadyHasBalancing && balancingAmount > 0) {
      const balancingLine = buildBalancingAllowanceLine(balancingAmount);
      if (balancingLine) {
        earnings.push({
          componentName: balancingLine.name,
          amount: balancingLine.calculatedAmount,
          calculationType: 'fixed',
          isBalancing: true,
          ...getComplianceFlags(balancingLine),
        });
      }
    }
  }

  // Statutory Bonus (added as earning only in configured paymentMonth)
  const accountingYearWorkedDaysLegacy = AttendanceModel
    ? await getBonusAccountingYearWorkedDays(
        employee._id,
        month,
        year,
        AttendanceModel,
        LeaveRequestModel,
        attendance
      )
    : null;
  const bonusBreakdownLegacy = calculateStatutoryBonus({
    bonusConfig: compliance?.statutoryBonus,
    basicPlusDA: sumBasicPlusDA(earnings),
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeEmploymentCategory: employee.statutoryInfo?.employmentCategory,
    month,
    year,
    accountingYearWorkedDays: accountingYearWorkedDaysLegacy,
  });
  if (bonusBreakdownLegacy.applicable && bonusBreakdownLegacy.amount > 0) {
    earnings.push({
      componentName: 'Statutory Bonus',
      amount: bonusBreakdownLegacy.amount,
      fixedAmount: bonusBreakdownLegacy.amount,
      calculationType: 'statutory',
    });
  }

  // ===== DEDUCTIONS =====
  const deductionsComponents = salaryComponents.find((c) => c.category === 'deductions');

  // EPF Deduction (centralized: honors EDLI, Admin Charges, ABRY, override, LOP rule)
  const fullMonthEpfWageLegacy = sumConsiderForEpf(earnings, baseSalary);
  const epfWageResolutionLegacy = resolveEpfApplicableWage({
    epfConfig: compliance?.epf,
    fullMonthEpfWage: fullMonthEpfWageLegacy,
    workingDays,
    paidDays: attendance,
  });
  const epfBreakdownLegacy = calculateEpf({
    epfConfig: compliance?.epf,
    baseSalary,
    epfApplicableWage: epfWageResolutionLegacy.wage,
    employeeStatutoryInfo: employee.statutoryInfo,
    epfWageResolution: epfWageResolutionLegacy,
  });

  if (epfBreakdownLegacy.applicable && epfBreakdownLegacy.employeeContribution > 0) {
    deductions.push({
      componentName: 'EPF (Employee)',
      amount: epfBreakdownLegacy.employeeContribution,
      calculationType: 'percentage',
    });
  }

  const vpfLegacy = normalizeVpf(employee.payrollPreferences);
  if (checkVpfEffectiveForPayroll(vpfLegacy, month, year, getMonthDateRange)) {
    const vpfAmount = calculateMonthlyVpfAmount(vpfLegacy, baseSalary);
    if (vpfAmount > 0) {
      deductions.push({
        componentName: 'VPF (Voluntary PF)',
        amount: vpfAmount,
        calculationType: vpfLegacy.contributionType === 'fixed' ? 'fixed' : 'percentage',
      });
    }
  }

  // ESI Deduction (centralized — honors per-employee opt-out + considerForESI)
  const esiBreakdownLegacy = calculateEsi({
    esiConfig: compliance?.esi,
    grossSalary: gross,
    esiApplicableWage: sumConsiderForEsi(earnings, gross),
    employeeStatutoryInfo: employee.statutoryInfo,
  });
  if (esiBreakdownLegacy.applicable && esiBreakdownLegacy.employeeContribution > 0) {
    deductions.push({
      componentName: 'ESI (Employee)',
      amount: esiBreakdownLegacy.employeeContribution,
      calculationType: 'percentage',
    });
  }

  // Professional Tax (centralized)
  const ptBreakdownLegacy = calculateProfessionalTax({
    ptConfig: compliance?.professionalTax,
    grossSalary: gross,
    month,
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeStatutoryInfo: employee.statutoryInfo,
  });
  if (ptBreakdownLegacy.applicable) {
    deductions.push({
      componentName: 'Professional Tax',
      amount: ptBreakdownLegacy.amount,
      calculationType: 'slab',
    });
  }

  // Labour Welfare Fund (centralized)
  const lwfBreakdownLegacy = calculateLwf({
    lwfConfig: compliance?.labourWelfareFund,
    grossSalary: gross,
    month,
    employeeState: resolveEmployeeStatutoryState(employee),
    employeeStatutoryInfo: employee.statutoryInfo,
  });
  if (lwfBreakdownLegacy.applicable && lwfBreakdownLegacy.employeeShare > 0) {
    deductions.push({
      componentName: 'Labour Welfare Fund',
      amount: lwfBreakdownLegacy.employeeShare,
      calculationType: 'statutory',
    });
  }

  // Other deductions from components
  if (deductionsComponents) {
    deductionsComponents.components.forEach((component) => {
      addPayrollComponentLine(
        deductions,
        'deductions',
        component,
        salaryBasesLegacy,
        componentOverridesLegacy,
        month,
        paidComponentKeysLegacy
      );
    });
  }

  // ===== BENEFITS =====
  const benefitsComponents = salaryComponents.find((c) => c.category === 'benefits');
  if (benefitsComponents) {
    benefitsComponents.components.forEach((component) => {
      addPayrollComponentLine(
        benefits,
        'benefits',
        component,
        salaryBasesLegacy,
        componentOverridesLegacy,
        month,
        paidComponentKeysLegacy
      );
    });
  }

  // ===== REIMBURSEMENTS =====
  const reimbursementsComponents = salaryComponents.find((c) => c.category === 'reimbursements');
  if (reimbursementsComponents) {
    reimbursementsComponents.components.forEach((component) => {
      if (component.status === 'active') {
        reimbursements.push({
          componentName: component.name,
          amount: component.value || 0,
          calculationType: component.calculationType,
        });
      }
    });
  }

  // Calculate totals
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const totalBenefits = benefits.reduce((sum, b) => sum + b.amount, 0);
  const totalReimbursements = reimbursements.reduce((sum, r) => sum + r.amount, 0);
  const grossEarnings = totalEarnings + totalBenefits + totalReimbursements;

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netPay = grossEarnings - totalDeductions;

  return {
    earnings,
    deductions,
    benefits,
    reimbursements,
    grossEarnings,
    totalDeductions,
    netPay,
  };
}


/**
 * Month-wise pay run history for Pay Runs UI.
 * GET /payRoll/payRuns — list all periods
 * GET /payRoll/payRuns?month=Jun&year=2025 — period summary + employee table
 */
exports.getPayRunMonthlyData = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { month, year, search, payStatus, page = 1, limit = 50 } = req.query;
    const { PayrollRunModel, EmployeeModel, PayrollScheduleModel } = await initModels(org_uuid);

    if (!month && !year) {
      const periods = await PayrollRunModel.aggregate([
        { $match: { organizationId: org_uuid } },
        {
          $group: {
            _id: { month: '$month', year: '$year' },
            employeeCount: { $sum: 1 },
            totalNetPay: { $sum: '$netPay' },
            totalGrossPay: { $sum: '$grossEarnings' },
            lastProcessedAt: { $max: '$processedDate' },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
      ]);

      const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sortedPeriods = periods
        .map((p) => ({
          month: p._id.month,
          year: p._id.year,
          employeeCount: p.employeeCount,
          totalNetPay: Math.round(p.totalNetPay || 0),
          totalGrossPay: Math.round(p.totalGrossPay || 0),
          lastProcessedAt: p.lastProcessedAt,
        }))
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return monthsOrder.indexOf(b.month) - monthsOrder.indexOf(a.month);
        });

      return sendResponse(res, 200, true, 'Pay run periods fetched successfully', {
        periods: sortedPeriods,
        totalPeriods: sortedPeriods.length,
      });
    }

    const normalizedMonth = normalizePayrollMonth(month);
    const normalizedYear = Number(year);

    if (!normalizedMonth || getMonthIndex(normalizedMonth) === -1) {
      return sendResponse(res, 400, false, 'Valid month is required (Jan, Feb, ... or 1-12)');
    }
    if (!Number.isInteger(normalizedYear) || normalizedYear < 1900) {
      return sendResponse(res, 400, false, 'Valid year is required');
    }

    const filter = {
      organizationId: org_uuid,
      month: normalizedMonth,
      year: normalizedYear,
    };
    if (payStatus) {
      filter.payStatus = String(payStatus).toLowerCase();
    }

    const payrolls = await PayrollRunModel.find(filter)
      .populate({
        path: 'employeeId',
        select:
          'firstName lastName uniqueId customId payrollInfo.employeeCode payrollInfo.department payrollInfo.designation departmentId bankInfo.bankAccountNumber bankInfo.bankName bankInfo.branchName bankInfo.ifscCode',
        populate: { path: 'departmentId', select: 'name' },
      })
      .lean();

    const activeEmployeeCount = await EmployeeModel.countDocuments({ status: 'Active' });
    const schedule = await PayrollScheduleModel.findOne({
      organizationId: org_uuid,
      status: 'active',
    })
      .select('payDay workingDays')
      .lean();

    let employees = payrolls
      .map((payroll) => mapPayrollRunToEmployeeSummary(payroll))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    if (search) {
      const term = String(search).trim().toLowerCase();
      employees = employees.filter(
        (row) =>
          row.employeeName.toLowerCase().includes(term) ||
          String(row.employeeCode).toLowerCase().includes(term)
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const totalEmployees = employees.length;
    const paginatedEmployees = employees.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    const summary = buildPayRunPeriodSummary(
      payrolls,
      activeEmployeeCount,
      schedule,
      normalizedMonth,
      normalizedYear
    );

    return sendResponse(res, 200, true, 'Pay run history fetched successfully', {
      period: {
        month: normalizedMonth,
        year: normalizedYear,
        label: `${normalizedMonth} ${normalizedYear}`,
        baseDays: summary.baseDays || schedule?.workingDays?.length || 0,
        payDay: summary.payDay,
      },
      summary,
      employees: paginatedEmployees,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalEmployees,
        totalPages: Math.ceil(totalEmployees / pageSize) || 1,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Full payroll history — every processed month with the same summary
 * and employee rows shown on the pay run screen.
 * Route: GET /payRoll/getMonthlyPayrollHistroy
 * Query: year (optional), includeEmployees=false (optional, summary only)
 */
exports.getMonthlyPayrollHistroy = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { year, includeEmployees } = req.query;
    const withEmployees = String(includeEmployees ?? 'true').toLowerCase() !== 'false';

    const { PayrollRunModel, EmployeeModel, PayrollScheduleModel } = await initModels(org_uuid);

    const filter = { organizationId: org_uuid };
    if (year) {
      const numericYear = Number(year);
      if (!Number.isInteger(numericYear) || numericYear < 1900) {
        return sendResponse(res, 400, false, 'Valid year is required');
      }
      filter.year = numericYear;
    }

    const payrolls = await PayrollRunModel.find(filter)
      .populate({
        path: 'employeeId',
        select:
          'firstName lastName uniqueId customId payrollInfo.employeeCode payrollInfo.department payrollInfo.designation departmentId bankInfo.bankAccountNumber bankInfo.bankName bankInfo.branchName bankInfo.ifscCode',
        populate: { path: 'departmentId', select: 'name' },
      })
      .lean();

    const activeEmployeeCount = await EmployeeModel.countDocuments({ status: 'Active' });
    const schedule = await PayrollScheduleModel.findOne({
      organizationId: org_uuid,
      status: 'active',
    })
      .select('payDay workingDays')
      .lean();

    // Group payroll runs by month + year
    const periodMap = new Map();
    payrolls.forEach((payroll) => {
      const key = `${payroll.month}-${payroll.year}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, { month: payroll.month, year: payroll.year, payrolls: [] });
      }
      periodMap.get(key).payrolls.push(payroll);
    });

    const history = [...periodMap.values()]
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return getMonthIndex(b.month) - getMonthIndex(a.month);
      })
      .map((period) => {
        const summary = buildPayRunPeriodSummary(
          period.payrolls,
          activeEmployeeCount,
          schedule,
          period.month,
          period.year
        );

        const block = {
          period: {
            month: period.month,
            year: period.year,
            label: `${period.month} ${period.year}`,
            baseDays: summary.baseDays || schedule?.workingDays?.length || 0,
            payDay: summary.payDay,
          },
          summary,
        };

        if (withEmployees) {
          block.employees = period.payrolls
            .map((payroll) => mapPayrollRunToEmployeeSummary(payroll))
            .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
        }

        return block;
      });

    const grandTotals = history.reduce(
      (totals, block) => {
        totals.payrollCost += block.summary.payrollCost || 0;
        totals.totalNetPay += block.summary.totalNetPay || 0;
        totals.totalGrossPay += block.summary.totalGrossPay || 0;
        totals.totalDeductions += block.summary.totalDeductions || 0;
        totals.taxes += block.summary.taxes || 0;
        totals.benefits += block.summary.benefits || 0;
        totals.reimbursements += block.summary.reimbursements || 0;
        return totals;
      },
      {
        payrollCost: 0,
        totalNetPay: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        taxes: 0,
        benefits: 0,
        reimbursements: 0,
      }
    );

    return sendResponse(res, 200, true, 'Payroll full history fetched successfully', {
      totalPeriods: history.length,
      grandTotals,
      history,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getPayrollHistory = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { PayrollRunModel } = await initModels(org_uuid);
    const { month, year, employeeId } = req.query;

    const filter = { organizationId: org_uuid };
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year);
    if (employeeId) filter.employeeId = employeeId;

    const runs = await PayrollRunModel.find(filter).populate({
      path: 'employeeId',
      select: `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation departmentId`,
      populate: { path: 'departmentId', select: 'name' },
    });

    return sendResponse(res, 200, true, 'Payroll history fetched', {
      total: runs.length,
      data: runs
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getPayrollById = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { payrollId } = req.params;
    const {
      PayrollRunModel,
      EmployeeModel,
      AttendanceModel,
      LeaveRequestModel,
      ShiftModel,
      HolidayModel,
    } = await initModels(org_uuid);

    const payroll = await PayrollRunModel.findById(payrollId).populate({
      path: 'employeeId',
      select: `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation departmentId`,
      populate: { path: 'departmentId', select: 'name' },
    });

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payroll record not found');
    }

    const employeeRef = payroll.employeeId;
    const employeeId = employeeRef?._id || employeeRef;
    let paidDaysBreakdown = null;
    try {
      paidDaysBreakdown = await buildPaidDaysBreakdown({
        employeeId,
        month: payroll.month,
        year: payroll.year,
        org_uuid,
        EmployeeModel,
        AttendanceModel,
        LeaveRequestModel,
        ShiftModel,
        HolidayModel,
      });
    } catch (breakdownError) {
      console.error('Paid days breakdown failed:', breakdownError);
    }

    const payload = typeof payroll.toObject === 'function' ? payroll.toObject() : payroll;
    payload.paidDaysBreakdown = paidDaysBreakdown;

    return sendResponse(res, 200, true, 'Payroll record fetched', payload);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.recalculatePayroll = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { payrollId } = req.params;
    const previewOnly = req.body?.preview === true || req.body?.preview === 'true';
    const paidDaysInput = Number(req.body?.paidDays);

    if (!Number.isFinite(paidDaysInput) || paidDaysInput < 0) {
      return sendResponse(res, 400, false, 'paidDays must be a number greater than or equal to 0');
    }

    const {
      PayrollRunModel,
      EmployeeModel,
      SalaryCompensationModel,
      StatutoryComplianceModel,
      AttendanceModel,
      LeaveRequestModel,
      EmployeeTDSModel,
      ArrearsModel,
      PayrollScheduleModel,
      ShiftModel,
      HolidayModel,
      ClaimsDeclarationModel,
      PayrollOneTimeImportModel,
      EmployeeLoanModel,
      LoanRepaymentModel,
    } = await initModels(org_uuid);

    const payroll = await PayrollRunModel.findOne({
      _id: payrollId,
      organizationId: org_uuid,
    });

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payroll record not found');
    }

    const status = String(payroll.payStatus || '').toLowerCase();
    if (status === 'paid') {
      return sendResponse(res, 400, false, 'Paid payroll cannot be edited. Reverse payment first.');
    }

    const calendarDays = getCalendarDaysInPayrollMonth(payroll.month, payroll.year);
    const maxDays = calendarDays > 0 ? calendarDays : Number(payroll.workingDays) || 0;
    if (maxDays > 0 && paidDaysInput > maxDays) {
      return sendResponse(
        res,
        400,
        false,
        `paidDays cannot be more than ${maxDays} for ${payroll.month} ${payroll.year}`
      );
    }

    const employee = await EmployeeModel.findById(payroll.employeeId);
    if (!employee) {
      return sendResponse(res, 404, false, 'Employee not found');
    }

    const [schedule, compliance, salaryComponents] = await Promise.all([
      PayrollScheduleModel.findOne({ organizationId: org_uuid }),
      StatutoryComplianceModel.findOne({ organizationId: org_uuid }),
      SalaryCompensationModel.find({ organizationId: org_uuid }),
    ]);

    const oneTimeImportRows = await loadConfirmedOneTimeImportRows(
      org_uuid,
      payroll.month,
      payroll.year,
      PayrollOneTimeImportModel
    );
    const oneTimeByEmployee = groupOneTimeRowsByEmployee(oneTimeImportRows);

    const salaryCalculation = await calculateEmployeeSalaryImproved(
      employee,
      salaryComponents,
      compliance,
      payroll.month,
      payroll.year,
      org_uuid,
      AttendanceModel,
      LeaveRequestModel,
      EmployeeTDSModel,
      ArrearsModel,
      schedule,
      ShiftModel,
      HolidayModel,
      ClaimsDeclarationModel,
      oneTimeByEmployee.get(String(employee._id)) || [],
      EmployeeLoanModel,
      LoanRepaymentModel,
      PayrollRunModel,
      {
        paidDays: paidDaysInput,
        excludePayrollId: payroll._id,
      }
    );

    preserveExistingPayrollExtras(payroll, salaryCalculation);
    const payload = buildPayrollCalculatorPayload(payroll, salaryCalculation, calendarDays);

    if (previewOnly) {
      return sendResponse(res, 200, true, 'Payroll recalculation preview', {
        preview: true,
        ...payload,
      });
    }

    const oldTds = getPayrollTdsAmount(payroll);
    const newTds = getPayrollTdsAmount(salaryCalculation);

    payroll.earnings = salaryCalculation.earnings;
    payroll.deductions = salaryCalculation.deductions;
    payroll.benefits = salaryCalculation.benefits;
    payroll.reimbursements = salaryCalculation.reimbursements;
    payroll.grossEarnings = salaryCalculation.grossEarnings;
    payroll.totalDeductions = salaryCalculation.totalDeductions;
    payroll.netPay = salaryCalculation.netPay;
    payroll.workingDays = salaryCalculation.workingDays;
    payroll.presentDays = salaryCalculation.presentDays;
    payroll.absentDays = salaryCalculation.absentDays;
    payroll.lopDays = salaryCalculation.lopDays;
    payroll.employerContributions = salaryCalculation.employerContributions;
    payroll.epfDetails = salaryCalculation.epfDetails;
    payroll.esiDetails = salaryCalculation.esiDetails;
    payroll.ptDetails = salaryCalculation.ptDetails;
    payroll.lwfDetails = salaryCalculation.lwfDetails;
    payroll.bonusDetails = salaryCalculation.bonusDetails;
    payroll.processedDate = new Date();
    payroll.remarks = `Recalculated with paid days ${payload.paidDays}`;
    if (status === 'approved') {
      payroll.payStatus = 'processed';
      payroll.approvedDate = undefined;
    }

    await payroll.save();

    await syncTdsAfterPayrollRecalc({
      EmployeeTDSModel,
      organizationId: org_uuid,
      employeeId: employee._id,
      month: payroll.month,
      year: payroll.year,
      payrollId: payroll._id,
      oldTds,
      newTds,
    });

    return sendResponse(res, 200, true, 'Payroll recalculated successfully', {
      preview: false,
      ...payload,
      payStatus: payroll.payStatus,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updatePayrollStatus = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { payrollId } = req.params;
    const { payStatus, status, rejectionReason, remarks, paidOn } = req.body;
    const { PayrollRunModel } = await initModels(org_uuid);

    const normalizedStatus = String(payStatus || status || '').toLowerCase();

    if (!['processed', 'approved', 'rejected', 'on_hold', 'paid'].includes(normalizedStatus)) {
      return sendResponse(res, 400, false, 'Invalid pay status');
    }

    const updateData = { payStatus: normalizedStatus };
    if (normalizedStatus === 'approved') {
      updateData.approvedDate = new Date();
    }
    if (normalizedStatus === 'paid') {
      updateData.paidDate = paidOn ? new Date(paidOn) : new Date();
    }
    if (normalizedStatus === 'rejected') {
      updateData.remarks = rejectionReason || remarks || 'Rejected';
    }
    if (normalizedStatus === 'on_hold' && remarks) {
      updateData.remarks = remarks;
    }

    const payroll = await PayrollRunModel.findOneAndUpdate(
      { _id: payrollId, organizationId: org_uuid },
      updateData,
      { new: true }
    );

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payroll record not found');
    }

    return sendResponse(res, 200, true, 'Payroll status updated successfully', payroll);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.bulkUpdatePayrollStatus = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { payrollIds = [], payStatus, status, rejectionReason, remarks, paidOn } = req.body;
    const { PayrollRunModel } = await initModels(org_uuid);

    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return sendResponse(res, 400, false, 'Payroll IDs are required');
    }

    const normalizedStatus = String(payStatus || status || '').toLowerCase();
    if (!['processed', 'approved', 'rejected', 'on_hold', 'paid'].includes(normalizedStatus)) {
      return sendResponse(res, 400, false, 'Invalid pay status');
    }

    const updateData = { payStatus: normalizedStatus };
    if (normalizedStatus === 'approved') {
      updateData.approvedDate = new Date();
    }
    if (normalizedStatus === 'paid') {
      updateData.paidDate = paidOn ? new Date(paidOn) : new Date();
    }
    if (normalizedStatus === 'rejected') {
      updateData.remarks = rejectionReason || remarks || 'Rejected';
    }
    if (normalizedStatus === 'on_hold' && remarks) {
      updateData.remarks = remarks;
    }

    const updateResult = await PayrollRunModel.updateMany(
      {
        _id: { $in: payrollIds },
        organizationId: org_uuid,
      },
      { $set: updateData }
    );

    return sendResponse(res, 200, true, 'Bulk payroll status updated successfully', {
      requestedCount: payrollIds.length,
      matchedCount: updateResult.matchedCount || 0,
      modifiedCount: updateResult.modifiedCount || 0,
      payStatus: normalizedStatus,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
exports.generatePayslip = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { payrollId } = req.params;
    const { PayrollRunModel, EmployeeModel, OrganizationModel } = await initModels(org_uuid);

    const payroll = await PayrollRunModel.findById(payrollId).populate('employeeId');
    const organization = await OrganizationModel?.findById(org_uuid);

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payroll record not found');
    }

    const payslip = {
      organization: {
        name: organization?.name || 'Organization Name',
        address: organization?.address || '',
        logo: organization?.logo || '',
      },
      employee: {
        name: `${payroll.employeeId.firstName} ${payroll.employeeId.lastName}`,
        code: resolveEmployeeDisplayCode(payroll.employeeId),
        email: payroll.employeeId.email,
        department: payroll.employeeId?.departmentId?.name || payroll.employeeId.payrollInfo?.department || '',
        designation: payroll.employeeId.payrollInfo?.designation || payroll.employeeId.jobTitle || '',
      },
      payPeriod: {
        month: payroll.month,
        year: payroll.year,
      },
      earnings: mergePayslipEarningsColumn(
        payroll.earnings,
        payroll.benefits,
        payroll.reimbursements
      ),
      deductions: payroll.deductions || [],
      benefits: payroll.benefits || [],
      reimbursements: payroll.reimbursements || [],
      summary: {
        grossEarnings: payroll.grossEarnings,
        totalDeductions: payroll.totalDeductions,
        netPay: payroll.netPay,
      },
      attendance: {
        workingDays: Number(payroll.workingDays) || 0,
        paidDays: Math.max(
          0,
          Number.isFinite(Number(payroll.presentDays))
            ? Number(payroll.presentDays)
            : (Number(payroll.workingDays) || 0) - (Number(payroll.lopDays) || 0)
        ),
        presentDays: Number(payroll.presentDays) || 0,
      },
    };

    return sendResponse(res, 200, true, 'Payslip generated successfully', payslip);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deletePayrollRun = async (req, res) => { 
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { payrollId } = req.params;
    const { PayrollRunModel, EmployeeLoanModel, LoanRepaymentModel } = await initModels(org_uuid);

    const payroll = await PayrollRunModel.findOne({
      _id: payrollId,
      organizationId: org_uuid,
    });

    if (!payroll) {
      return sendResponse(res, 404, false, 'Payroll record not found');
    }

    await reversePayrollLoanRepayments({
      organizationId: org_uuid,
      employeeId: payroll.employeeId,
      month: payroll.month,
      year: payroll.year,
      EmployeeLoanModel,
      LoanRepaymentModel,
    });

    await PayrollRunModel.findByIdAndDelete(payrollId);

    return sendResponse(res, 200, true, 'Payroll run deleted successfully');
  } catch (err) {
    return handleError(res, err);
  }
};


  exports.downloadPayslipPdf = async (req, res) => {
    try {
      const { org_uuid } = req.headers;
      const { payrollId } = req.params;
  
      if (!org_uuid || !payrollId) {
        return sendResponse(res, 400, false, 'Missing required information');
      }
  
      const { PayrollRunModel, OrganizationModel } = await initModels(org_uuid);
  
      // 🔥 Admin ke liye - no employee restriction
    const payroll = await PayrollRunModel.findOne({
      _id: payrollId,
      organizationId: org_uuid,
    }).populate({
      path: 'employeeId',
      select:
        `firstName lastName email ${EMPLOYEE_DISPLAY_CODE_FIELDS} payrollInfo.department payrollInfo.designation departmentId jobTitle nationalID.pan bankInfo.bankName bankInfo.bankAccountNumber`,
      populate: { path: 'departmentId', select: 'name' },
    });

    if (!payroll || !payroll.employeeId) {
      return sendResponse(res, 404, false, 'Payslip not found');
    }

    const organization = await OrganizationModel.findById(org_uuid);
    // 🔥 SAME FORMAT as generatePayslip
    const payslip = {
      organization: {
        name: organization?.organizationName || 'Organization Name',
        address: organization?.organizationAddress || '',
        logo: organization?.logo || '',
      },
      employee: {
        name: `${payroll.employeeId.firstName || ''} ${payroll.employeeId.lastName || ''}`.trim(),
        code: resolveEmployeeDisplayCode(payroll.employeeId, 'N/A'),
        email: payroll.employeeId.email || '',
        department:
          payroll.employeeId?.departmentId?.name ||
          payroll.employeeId.payrollInfo?.department ||
          'N/A',
        designation:
          payroll.employeeId.payrollInfo?.designation ||
          payroll.employeeId.jobTitle ||
          '',
        pan: payroll.employeeId.nationalID?.pan || 'N/A',
        bankName: payroll.employeeId.bankInfo?.bankName || 'N/A',
        bankAccountNumber:
          payroll.employeeId.bankInfo?.bankAccountNumber || 'N/A',
      },
        payPeriod: {
          month: payroll.month || '',
          year: payroll.year || '',
        },
        earnings: mergePayslipEarningsColumn(
          payroll.earnings,
          payroll.benefits,
          payroll.reimbursements
        ),
        deductions: payroll.deductions || [],
        benefits: payroll.benefits || [],
        reimbursements: payroll.reimbursements || [],
        summary: {
          grossEarnings: payroll.grossEarnings ?? 0,
          totalDeductions: payroll.totalDeductions ?? 0,
          netPay: payroll.netPay ?? 0,
        },
      };
  
    const empId = payroll.employeeId?._id || payroll.employeeId;
    const attendanceDays = await getPayslipAttendanceDays(
      org_uuid,
      empId,
      payroll.month,
      payroll.year,
      payroll
    );

    // PDF — Paid Days from payroll run (standard: Calendar Days − LOP)
    const pdfBuf = await buildSalarySlipPdfBuffer({
      organizationName: payslip.organization.name,
      organizationAddress: payslip.organization.address,
      organizationLogo: payslip.organization.logo,
      employeeName: payslip.employee.name,
      employeeCode: payslip.employee.code,
      department: payslip.employee.department,
      pan: payslip.employee.pan,
      bankName: payslip.employee.bankName,
      bankAccountNumber: payslip.employee.bankAccountNumber,
      payPeriodLabel: `${payslip.payPeriod.month} ${payslip.payPeriod.year}`,
      earnings: payroll.earnings || [],
      benefits: payroll.benefits || [],
      reimbursements: payroll.reimbursements || [],
      deductions: payslip.deductions,
      grossEarnings: payslip.summary.grossEarnings,
      totalDeductions: payslip.summary.totalDeductions,
      netPay: payslip.summary.netPay,
      payStatus: payroll.payStatus || 'pending',
      workingDays: attendanceDays.workingDays,
      paidDays: attendanceDays.paidDays,
    });

    // 🔥 Safe filename
      const safeCode = String(payslip.employee.code).replace(/[^\w.-]+/g, '_');
      const safeMonth = String(payslip.payPeriod.month).replace(/[^\w.-]+/g, '_');
  
      const filename = `Payslip_${safeCode}_${safeMonth}_${payslip.payPeriod.year}.pdf`;
  
      // 🔥 Headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
      return res.send(pdfBuf);
    } catch (err) {
      console.error('Payslip PDF Error:', err);
      return handleError(res, err);
    }
  };