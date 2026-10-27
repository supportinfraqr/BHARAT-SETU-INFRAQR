const {
  normalizeOverrides,
  resolvePayrollComponentAmount,
  getFrequencyDisplayAmounts,
  resolveSalaryBasesFromInput,
  buildPayrollEarningsBreakdown,
  sumBasicPlusDA,
} = require('../salaryComponentHelper');
const {
  calculateEpf,
  sumConsiderForEpf,
  calculateEsi,
  sumConsiderForEsi,
  calculateProfessionalTax,
  calculateLwf,
  resolveLwfDeductionsPerYear,
  buildNetPaySchedule,
  calculateStatutoryBonus,
} = require('./statutoryCalculator');

const TAX_REGIMES = ['Old', 'New'];
const PAYMENT_FREQUENCIES = ['Monthly', 'Bi-Weekly', 'Weekly'];

function buildRevisionSalaryComponents(resolvedBase, earningsBreakdown = []) {
  const components = [];

  earningsBreakdown.forEach((line) => {
    const amount = Math.round(line.calculatedAmount || 0);
    if (amount > 0 && !line.isBalancing) {
      components.push({ componentName: line.name, amount });
    }
  });

  if (components.length === 0 && resolvedBase > 0) {
    components.push({ componentName: 'Basic Salary', amount: Math.round(resolvedBase) });
  }

  return components;
}

function computePayrollInfoFromSalaryInput({
  baseSalary,
  grossSalary,
  state,
  employee,
  salaryComponents,
  statutoryCompliance,
  taxRegime,
  paymentFrequency,
  salaryEffectiveFrom,
  overrides: overrideInput,
  grossSalaryInput = null,
  ctcInput = null,
}) {
  const warnings = [];
  const overrides = normalizeOverrides(
    overrideInput || employee?.payrollInfo?.componentOverrides || []
  );
  const resolvedState =
    state || employee?.statutoryInfo?.lwfState || employee?.statutoryInfo?.ptState || '';

  const resolvedSalary = resolveSalaryBasesFromInput({
    baseSalary: Number(baseSalary) || 0,
    grossSalary: Number(grossSalary) || 0,
    salaryComponents,
    overrides,
  });

  if (!resolvedSalary) {
    return {
      payrollInfo: null,
      warnings,
      components: [],
      inputMode: null,
      error: 'baseSalary or grossSalary is required',
    };
  }

  const resolvedBase = resolvedSalary.baseSalary;
  const inputMode = resolvedSalary.inputMode;
  const targetGross = resolvedSalary.targetGross;
  const calcOverrides = resolvedSalary.overridesForCalc || overrides;

  const earningsResult = buildPayrollEarningsBreakdown({
    salaryComponents,
    resolvedBase,
    overrides: calcOverrides,
    inputMode,
    targetGross,
  });
  const earningsBreakdown = earningsResult.earningsBreakdown;
  const resolvedGross = earningsResult.grossSalary;
  const resolvedBaseFinal = earningsResult.resolvedBase;

  let totalDeductions = 0;

  const epfBreakdown = calculateEpf({
    epfConfig: statutoryCompliance?.epf,
    baseSalary: resolvedBaseFinal,
    epfApplicableWage: sumConsiderForEpf(earningsBreakdown, resolvedBaseFinal),
    employeeStatutoryInfo: employee?.statutoryInfo,
  });
  if (epfBreakdown.applicable && epfBreakdown.employeeContribution > 0) {
    totalDeductions += epfBreakdown.employeeContribution;
  }

  const esiBreakdown = calculateEsi({
    esiConfig: statutoryCompliance?.esi,
    grossSalary: resolvedGross,
    esiApplicableWage: sumConsiderForEsi(earningsBreakdown, resolvedGross),
    employeeStatutoryInfo: employee?.statutoryInfo,
  });
  if (esiBreakdown.applicable && esiBreakdown.employeeContribution > 0) {
    totalDeductions += esiBreakdown.employeeContribution;
  }

  const ptBreakdown = calculateProfessionalTax({
    ptConfig: statutoryCompliance?.professionalTax,
    grossSalary: resolvedGross,
    employeeState: resolvedState,
    employeeStatutoryInfo: employee?.statutoryInfo,
  });
  let cyclicalStatutoryDeductions = 0;
  if (ptBreakdown.applicable) {
    totalDeductions += ptBreakdown.amount;
    cyclicalStatutoryDeductions += ptBreakdown.amount;
  }

  const lwfBreakdown = calculateLwf({
    lwfConfig: statutoryCompliance?.labourWelfareFund,
    grossSalary: resolvedGross,
    employeeState: resolvedState,
    employeeStatutoryInfo: employee?.statutoryInfo,
  });
  if (lwfBreakdown.applicable && lwfBreakdown.employeeShare > 0) {
    totalDeductions += lwfBreakdown.employeeShare;
    cyclicalStatutoryDeductions += lwfBreakdown.employeeShare;
  }

  const bonusBreakdown = calculateStatutoryBonus({
    bonusConfig: statutoryCompliance?.statutoryBonus,
    basicPlusDA: sumBasicPlusDA(earningsBreakdown),
    employeeState: resolvedState,
    employeeEmploymentCategory: employee?.statutoryInfo?.employmentCategory,
    paidDays: null,
    totalDays: null,
  });

  const deductionsSalaryBases = {
    baseSalary: resolvedBaseFinal,
    grossSalary: resolvedGross,
    ctc: resolvedGross * 12,
  };
  const deductionsComponent = salaryComponents.find((c) => c.category === 'deductions');
  if (deductionsComponent?.components) {
    deductionsComponent.components.forEach((component) => {
      if (component.status !== 'active') return;
      const amount = resolvePayrollComponentAmount(
        'deductions',
        component,
        deductionsSalaryBases,
        overrides
      );
      const { monthlyAmount } = getFrequencyDisplayAmounts(component, amount, null);
      if (amount > 0) totalDeductions += monthlyAmount;
    });
  }

  let totalBenefits = 0;
  const benefitsSalaryBases = {
    baseSalary: resolvedBaseFinal,
    grossSalary: resolvedGross,
    ctc: resolvedGross * 12,
  };
  const benefitsComponent = salaryComponents.find((c) => c.category === 'benefits');
  if (benefitsComponent?.components) {
    benefitsComponent.components.forEach((component) => {
      if (component.status !== 'active') return;
      const amount = resolvePayrollComponentAmount(
        'benefits',
        component,
        benefitsSalaryBases,
        overrides
      );
      const { monthlyAmount } = getFrequencyDisplayAmounts(component, amount, null);
      if (amount > 0) totalBenefits += monthlyAmount;
    });
  }

  // PT / LWF may be due only in some months — store the regular month's take-home
  const netPaySchedule = buildNetPaySchedule({
    grossSalary: resolvedGross,
    baseDeductions: totalDeductions - cyclicalStatutoryDeductions,
    ptConfig: statutoryCompliance?.professionalTax,
    lwfConfig: statutoryCompliance?.labourWelfareFund,
    employeeState: resolvedState,
    employeeStatutoryInfo: employee?.statutoryInfo,
  });
  const netPay = netPaySchedule.regular;
  const esiEmployerInCtc = esiBreakdown.includeEmployerInCtc ? esiBreakdown.employerContribution : 0;
  const monthlyEmployerContributions =
    epfBreakdown.employerContribution +
    epfBreakdown.edliContribution +
    epfBreakdown.adminCharges +
    esiEmployerInCtc;
  // LWF runs on its own cycle (yearly / half-yearly), so annualize it instead of × 12
  const annualLwfEmployer =
    (lwfBreakdown.employerShare || 0) *
    resolveLwfDeductionsPerYear(lwfBreakdown, statutoryCompliance?.labourWelfareFund);
  const annualBonusForCtc = bonusBreakdown.details?.annualEquivalent || 0;
  const monthlyCTC = resolvedGross + totalBenefits + monthlyEmployerContributions;
  const annualCTC = monthlyCTC * 12 + annualLwfEmployer + annualBonusForCtc;

  const computedGross = Math.round(resolvedGross);
  const computedCtc = Math.round(annualCTC);

  if (grossSalaryInput !== null && Math.abs(grossSalaryInput - computedGross) > 1) {
    warnings.push(
      `Excel grossSalary (${grossSalaryInput}) differs from calculated (${computedGross}); calculated value will be used`
    );
  }
  if (ctcInput !== null && Math.abs(ctcInput - computedCtc) > 1) {
    warnings.push(
      `Excel ctc (${ctcInput}) differs from calculated (${computedCtc}); calculated value will be used`
    );
  }

  const resolvedTaxRegime = TAX_REGIMES.includes(taxRegime)
    ? taxRegime
    : employee?.payrollInfo?.taxRegime || 'New';
  const resolvedFrequency = PAYMENT_FREQUENCIES.includes(paymentFrequency)
    ? paymentFrequency
    : employee?.payrollInfo?.paymentFrequency || 'Monthly';

  const payrollInfo = {
    baseSalary: Math.round(resolvedBaseFinal),
    grossSalary: computedGross,
    totalDeductions: netPaySchedule.regularDeductions,
    netPay: Math.round(netPay),
    ctc: computedCtc,
    paymentFrequency: resolvedFrequency,
    currency: employee?.payrollInfo?.currency || 'INR',
    taxRegime: resolvedTaxRegime,
    variablePay: employee?.payrollInfo?.variablePay || 0,
    incentives: employee?.payrollInfo?.incentives || 0,
    salaryEffectiveFrom: salaryEffectiveFrom || new Date(),
  };

  return {
    payrollInfo,
    netPaySchedule,
    warnings,
    components: buildRevisionSalaryComponents(resolvedBaseFinal, earningsBreakdown),
    inputMode,
  };
}

function computePayrollInfoFromBaseSalary(params) {
  return computePayrollInfoFromSalaryInput({
    ...params,
    baseSalary: params.baseSalary,
    grossSalary: 0,
    grossSalaryInput: params.grossSalaryInput,
    ctcInput: params.ctcInput,
  });
}

module.exports = {
  computePayrollInfoFromBaseSalary,
  computePayrollInfoFromSalaryInput,
};
