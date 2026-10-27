/** Response shapes of legacy controller/payroll/employeePayroll.js used by the Employees module. */

import type { ComponentOverride, PayrollEmployee } from '@/lib/payroll-engine/types';

export type PayrollInfoResponse = {
  employee: { id: string; name: string; email: string };
  payrollInfo: Partial<PayrollEmployee['payrollInfo']>;
  payrollPreferences: Partial<PayrollEmployee['payrollPreferences']>;
  taxInfo: Partial<TaxInfo>;
  bankInfo: Partial<PayrollEmployee['bankInfo']>;
  statutoryInfo: Partial<PayrollEmployee['statutoryInfo']>;
};

export type TaxInfo = {
  taxDeclarationSubmitted: boolean; taxDeclarationYear: string; investmentProofSubmitted: boolean; investmentProofYear: string;
  estimatedTaxLiability: number; tdsDeducted: number;
};

export type EarningLine = {
  name: string; code?: string; type?: string; value?: number; basedOn?: string; frequency?: string; paymentMonth?: string;
  defaultAmount?: number; calculatedAmount: number; annualAmount?: number; isOverridden?: boolean; disabled?: boolean; taxable?: boolean;
  considerForEPF?: boolean; considerForESI?: boolean; isBasic?: boolean; isBalancing?: boolean;
};
export type DeductionLine = { name: string; code?: string; amount: number; defaultAmount?: number; type: 'statutory' | 'custom'; rate?: string | number; state?: string; frequency?: string; isOverridden?: boolean; disabled?: boolean; months?: string[]; recurring?: boolean };
export type NetPaySchedule = { regular: number; regularDeductions: number; regularMonthCount: number; varies: boolean; exceptions: Array<{ month: string; netPay: number; reason: string }> };

export type CalculatePayrollInfoResult = {
  inputMode: string;
  componentOverrides: ComponentOverride[];
  payrollInfo: { baseSalary: number; grossSalary: number; totalDeductions: number; netPay: number; ctc: number };
  breakdown: {
    earnings: { baseSalary: number; components: EarningLine[]; totalAdditional: number; grossSalary: number };
    deductions: {
      statutory: {
        epf: { employee: number; employer: number; edli: number; adminCharges: number; wage: number; abryApplied: boolean };
        esi: { employee: number; employer: number };
        professionalTax: number;
        lwf: { employee: number; employer: number; state: string; cycle: string; months: string[]; deductionsPerYear: number; annualEmployer: number };
      };
      components: DeductionLine[]; totalDeductions: number; totalDeductionsPeakMonth: number;
    };
    benefits: { components: EarningLine[]; totalBenefits: number; totalBenefitsAnnual: number };
    statutoryBonus: { applicable: boolean; monthlyEquivalent: number; annualEquivalent: number; paidInMonth: string; calcBase: number; percentage: number };
    summary: { grossSalary: number; totalBenefits: number; totalDeductions: number; netPay: number; netPaySchedule?: NetPaySchedule; monthlyCTC: number; annualCTC: number; employerContributions: number; annualLwfEmployer: number; takeHomePercentage: number };
  };
};

export type PreviewLine = {
  category: string; name: string; code: string; calculationType: string; basedOn: string; orgValue: number; frequency?: string; paymentMonth?: string;
  defaultMonthlyAmount: number; overrideAmount: number | null; monthlyAmount: number; annualAmount: number; isOverridden: boolean; disabled: boolean;
  taxable?: boolean; considerForEPF?: boolean; considerForESI?: boolean; isBasic?: boolean; isBalancing?: boolean;
};
export type PreviewTotals = { earningsMonthly: number; earningsAnnual: number; deductionsMonthly: number; benefitsMonthly: number; benefitsAnnual: number; grossSalaryMonthly: number; ctcAnnual: number };
export type StructurePreview = {
  inputMode: string; employee: { id: string; name: string; email: string };
  salaryBases: { baseSalary: number; grossSalary: number; ctc: number };
  componentOverrides: ComponentOverride[];
  earnings: PreviewLine[]; deductions: PreviewLine[]; benefits: PreviewLine[]; reimbursements: PreviewLine[]; totals: PreviewTotals;
};

export type AnnualStatement = {
  organization: { name: string; address: unknown; logo: string };
  employee: { id: string; name: string; code: string; email: string; department: string; designation: string };
  financialYear: string; financialYearLabel: string; period: { from: string; to: string; description: string };
  monthlyBreakdown: Array<{ payrollId: string; month: string; year: number; basicSalary: number; grossEarnings: number; totalDeductions: number; netPay: number; payStatus: string; processedDate: string | null; workingDays: number; presentDays: number; paidDays: number; lopDays: number }>;
  annualSummary: { totalGross: number; totalDeductions: number; totalNetPay: number; monthsProcessed: number; expectedMonths: number; averageMonthlyGross: number; averageMonthlyNetPay: number };
  componentTotals: { earnings: Array<{ componentName: string; amount: number }>; deductions: Array<{ componentName: string; amount: number }> };
};
