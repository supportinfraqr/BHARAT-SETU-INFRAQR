const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');
const {
  calculateEpf,
  calculateEsi,
  calculateProfessionalTax,
  calculateLwf,
  resolveLwfDeductionsPerYear,
  calculateStatutoryBonus,
} = require('../../utils/payroll/statutoryCalculator');

/**
 * Calculate CTC from Gross Salary
 */
exports.calculateCTCFromGross = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { grossSalary } = req.body;

    if (!grossSalary || grossSalary <= 0) {
      return sendResponse(res, 400, false, 'Valid gross salary is required');
    }

    const { StatutoryComplianceModel } = await initModels(org_uuid);
    const compliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });

    // Calculate employer contributions
    const basicSalary = grossSalary * 0.4; // Assuming 40% basic
    const epfBreakdown = calculateEpf({
      epfConfig: compliance?.epf,
      baseSalary: basicSalary,
      epfApplicableWage: basicSalary,
    });
    const epfEmployer = epfBreakdown.employerContribution;
    const epfEdli = epfBreakdown.edliContribution;
    const epfAdmin = epfBreakdown.adminCharges;

    const esiBreakdown = calculateEsi({
      esiConfig: compliance?.esi,
      grossSalary,
      esiApplicableWage: grossSalary,
    });
    const esiEmployer = esiBreakdown.includeEmployerInCtc
      ? esiBreakdown.employerContribution
      : 0;

    // Statutory Bonus (use real org config — not hardcoded 8.33%)
    const bonusBreakdown = calculateStatutoryBonus({
      bonusConfig: compliance?.statutoryBonus,
      basicPlusDA: basicSalary,
      paidDays: null,
      totalDays: null,
    });
    const annualBonus = bonusBreakdown.details?.annualEquivalent || 0;
    const monthlyBonus = bonusBreakdown.details?.monthlyEquivalent || 0;

    // LWF (annualized employer share)
    const lwfBreakdown = calculateLwf({
      lwfConfig: compliance?.labourWelfareFund,
      grossSalary,
    });
    const annualLwfEmployer =
      (lwfBreakdown.employerShare || 0) *
      resolveLwfDeductionsPerYear(lwfBreakdown, compliance?.labourWelfareFund);

    // Gratuity (approx 4.81% of basic — Indian Payment of Gratuity Act standard)
    const gratuity = (basicSalary * 4.81) / 100;

    // CTC calculation
    const annualGross = grossSalary * 12;
    const monthlyEmployerContributions =
      epfEmployer + epfEdli + epfAdmin + esiEmployer + gratuity;
    // Annual employer contributions = (monthly employer × 12) + annual bonus + annual LWF
    const annualEmployerContributions =
      monthlyEmployerContributions * 12 + annualBonus + annualLwfEmployer;
    const ctc = annualGross + annualEmployerContributions;

    const breakdown = {
      monthlyGross: grossSalary,
      annualGross,
      employerContributions: {
        monthly: {
          epf: Math.round(epfEmployer),
          edli: Math.round(epfEdli),
          adminCharges: Math.round(epfAdmin),
          esi: Math.round(esiEmployer),
          gratuity: Math.round(gratuity),
          statutoryBonus: Math.round(monthlyBonus),
          lwf: Math.round(lwfBreakdown.employerShare || 0),
          total: Math.round(monthlyEmployerContributions),
        },
        annual: Math.round(annualEmployerContributions),
        annualBonus: Math.round(annualBonus),
        annualLwfEmployer: Math.round(annualLwfEmployer),
      },
      ctc: {
        annual: Math.round(ctc),
        monthly: Math.round(ctc / 12),
      },
    };

    return sendResponse(res, 200, true, 'CTC calculated successfully', breakdown);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Calculate Gross from CTC
 */
exports.calculateGrossFromCTC = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { ctc } = req.body;

    if (!ctc || ctc <= 0) {
      return sendResponse(res, 400, false, 'Valid CTC is required');
    }

    // Reverse calculation (approximately)
    // CTC = Gross + Employer Contributions (~25% of Gross)
    // CTC = Gross * 1.25
    // Gross = CTC / 1.25

    const annualGross = ctc / 1.25;
    const monthlyGross = annualGross / 12;

    // Calculate basic components
    const basic = monthlyGross * 0.4;
    const hra = monthlyGross * 0.4;
    const otherAllowances = monthlyGross * 0.2;

    const breakdown = {
      ctc: {
        annual: Math.round(ctc),
        monthly: Math.round(ctc / 12),
      },
      gross: {
        annual: Math.round(annualGross),
        monthly: Math.round(monthlyGross),
      },
      components: {
        basic: Math.round(basic),
        hra: Math.round(hra),
        otherAllowances: Math.round(otherAllowances),
      },
      employerContributions: {
        annual: Math.round(ctc - annualGross),
        monthly: Math.round((ctc - annualGross) / 12),
      },
    };

    return sendResponse(res, 200, true, 'Gross calculated from CTC successfully', breakdown);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Build Custom Salary Structure
 */
exports.buildSalaryStructure = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { ctc, basicPercentage = 40, hraPercentage = 40, customComponents = [] } = req.body;

    if (!ctc || ctc <= 0) {
      return sendResponse(res, 400, false, 'Valid CTC is required');
    }

    const { StatutoryComplianceModel } = await initModels(org_uuid);
    const compliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });

    // Calculate gross from CTC (reverse calculation)
    const annualGross = ctc / 1.25; // Approximate
    const monthlyGross = annualGross / 12;

    // Earnings breakdown
    const basic = (monthlyGross * basicPercentage) / 100;
    const hra = (monthlyGross * hraPercentage) / 100;
    const remaining = monthlyGross - basic - hra;

    const earnings = [
      { component: 'Basic Salary', amount: Math.round(basic), percentage: basicPercentage },
      { component: 'HRA', amount: Math.round(hra), percentage: hraPercentage },
    ];

    // Add custom components
    let customTotal = 0;
    customComponents.forEach((comp) => {
      const amount = comp.amount || (remaining * comp.percentage) / 100;
      earnings.push({
        component: comp.name,
        amount: Math.round(amount),
      });
      customTotal += amount;
    });

    // Add special allowance for remaining
    if (remaining - customTotal > 0) {
      earnings.push({
        component: 'Other Extra Allowance',
        amount: Math.round(remaining - customTotal),
      });
    }

    // Deductions
    const deductions = [];

    // EPF (centralized — honors EDLI, Admin Charges, ABRY)
    const epfBreakdown2 = calculateEpf({
      epfConfig: compliance?.epf,
      baseSalary: basic,
      epfApplicableWage: basic,
    });
    if (epfBreakdown2.applicable) {
      deductions.push({
        component: 'EPF (Employee)',
        amount: epfBreakdown2.employeeContribution,
      });
      if (epfBreakdown2.employerContribution > 0) {
        deductions.push({
          component: 'EPF (Employer)',
          amount: epfBreakdown2.employerContribution,
          type: 'employer',
        });
      }
      if (epfBreakdown2.edliContribution > 0) {
        deductions.push({
          component: 'EDLI (Employer)',
          amount: epfBreakdown2.edliContribution,
          type: 'employer',
        });
      }
      if (epfBreakdown2.adminCharges > 0) {
        deductions.push({
          component: 'PF Admin Charges (Employer)',
          amount: epfBreakdown2.adminCharges,
          type: 'employer',
        });
      }
    }

    // ESI (centralized — honors wage limit + employer-in-CTC toggle)
    const esiBreakdown2 = calculateEsi({
      esiConfig: compliance?.esi,
      grossSalary: monthlyGross,
      esiApplicableWage: monthlyGross,
    });
    if (esiBreakdown2.applicable) {
      deductions.push({
        component: 'ESI (Employee)',
        amount: esiBreakdown2.employeeContribution,
      });
      if (esiBreakdown2.includeEmployerInCtc && esiBreakdown2.employerContribution > 0) {
        deductions.push({
          component: 'ESI (Employer)',
          amount: esiBreakdown2.employerContribution,
          type: 'employer',
        });
      }
    }

    // Professional Tax (centralized — uses configured slabs, no more hardcoded ₹200)
    const ptBreakdownStructure = calculateProfessionalTax({
      ptConfig: compliance?.professionalTax,
      grossSalary: monthlyGross,
      employeeState: req.body.state || null,
    });
    if (ptBreakdownStructure.applicable) {
      deductions.push({
        component: 'Professional Tax',
        amount: ptBreakdownStructure.amount,
      });
    }

    // Labour Welfare Fund (state-wise, half-yearly default)
    const lwfBreakdownStructure = calculateLwf({
      lwfConfig: compliance?.labourWelfareFund,
      grossSalary: monthlyGross,
      employeeState: req.body.state || null,
    });
    if (lwfBreakdownStructure.applicable && lwfBreakdownStructure.employeeShare > 0) {
      deductions.push({
        component: 'Labour Welfare Fund',
        amount: lwfBreakdownStructure.employeeShare,
      });
      if (lwfBreakdownStructure.employerShare > 0) {
        deductions.push({
          component: 'Labour Welfare Fund (Employer)',
          amount: lwfBreakdownStructure.employerShare,
          type: 'employer',
        });
      }
    }

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalEmployeeDeductions = deductions.filter((d) => d.type !== 'employer').reduce((sum, d) => sum + d.amount, 0);
    const totalEmployerContributions = deductions.filter((d) => d.type === 'employer').reduce((sum, d) => sum + d.amount, 0);
    const netPay = totalEarnings - totalEmployeeDeductions;

    const structure = {
      ctc: Math.round(ctc),
      monthlyGross: Math.round(monthlyGross),
      earnings,
      deductions,
      summary: {
        totalEarnings: Math.round(totalEarnings),
        totalEmployeeDeductions: Math.round(totalEmployeeDeductions),
        totalEmployerContributions: Math.round(totalEmployerContributions),
        netPay: Math.round(netPay),
      },
    };

    return sendResponse(res, 200, true, 'Salary structure built successfully', structure);
  } catch (err) {
    return handleError(res, err);
  }
};

/**
 * Calculate Take-Home from CTC
 */
exports.calculateTakeHome = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }

    const { ctc, taxRegime = 'new', declaredDeductions = {} } = req.body;

    if (!ctc || ctc <= 0) {
      return sendResponse(res, 400, false, 'Valid CTC is required');
    }

    const { StatutoryComplianceModel, TDSConfigModel } = await initModels(org_uuid);

    // Calculate gross
    const annualGross = ctc / 1.25;
    const monthlyGross = annualGross / 12;

    // Get compliance
    const compliance = await StatutoryComplianceModel.findOne({ organizationId: org_uuid });

    // Calculate monthly deductions
    const basic = monthlyGross * 0.4;
    let monthlyDeductions = 0;

    // EPF (centralized — honors override / preferences / etc.)
    const takeHomeEpf = calculateEpf({
      epfConfig: compliance?.epf,
      baseSalary: basic,
      epfApplicableWage: basic,
    });
    if (takeHomeEpf.applicable) {
      monthlyDeductions += takeHomeEpf.employeeContribution;
    }

    // ESI (centralized)
    const takeHomeEsi = calculateEsi({
      esiConfig: compliance?.esi,
      grossSalary: monthlyGross,
      esiApplicableWage: monthlyGross,
    });
    if (takeHomeEsi.applicable) {
      monthlyDeductions += takeHomeEsi.employeeContribution;
    }

    // Professional Tax (centralized — slab-based, not hardcoded)
    const takeHomePt = calculateProfessionalTax({
      ptConfig: compliance?.professionalTax,
      grossSalary: monthlyGross,
      employeeState: req.body.state || null,
    });
    if (takeHomePt.applicable) {
      monthlyDeductions += takeHomePt.amount;
    }

    // Calculate TDS
    const tdsConfig = await TDSConfigModel.findOne({ organizationId: org_uuid });
    let monthlyTDS = 0;

    if (tdsConfig) {
      const taxableIncome = annualGross - 50000; // After standard deduction
      const slabs = taxRegime === 'new' ? tdsConfig.newRegimeSlabs : tdsConfig.oldRegimeSlabs;

      let tax = 0;
      for (const slab of slabs) {
        if (taxableIncome > slab.incomeFrom) {
          const taxable = Math.min(taxableIncome, slab.incomeTo) - slab.incomeFrom;
          tax += (taxable * slab.taxRate) / 100;
        }
      }

      // Add cess
      tax = tax * 1.04;

      // Apply rebate if applicable
      if (taxableIncome <= 700000) {
        tax = Math.max(0, tax - 25000);
      }

      monthlyTDS = tax / 12;
    }

    const monthlyTakeHome = monthlyGross - monthlyDeductions - monthlyTDS;
    const annualTakeHome = monthlyTakeHome * 12;

    const breakdown = {
      ctc: Math.round(ctc),
      monthlyGross: Math.round(monthlyGross),
      annualGross: Math.round(annualGross),
      deductions: {
        monthly: {
          epf: takeHomeEpf.employeeContribution,
          esi: takeHomeEsi.employeeContribution,
          professionalTax: takeHomePt.amount,
          tds: Math.round(monthlyTDS),
          total: Math.round(monthlyDeductions + monthlyTDS),
        },
        annual: Math.round((monthlyDeductions + monthlyTDS) * 12),
      },
      takeHome: {
        monthly: Math.round(monthlyTakeHome),
        annual: Math.round(annualTakeHome),
      },
    };

    return sendResponse(res, 200, true, 'Take-home calculated successfully', breakdown);
  } catch (err) {
    return handleError(res, err);
  }
};
