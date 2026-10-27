/** Local shapes for the TDS screens (mirror legacy tdsManagement.js / employeeTDS model). */

export type InvestmentLine = { investmentType: string; amount: number; attachment: string; _id?: string };

export type RentEntry = {
  fromDate: string; toDate: string; rentMonthly: number; rentAnnual: number; address: string; landlordName: string;
  urbanizationType: string; urbanizationType2: string; isMetroCity: boolean; attachment: string; _id?: string;
};

export type HomeLoan = { enabled: boolean; principalPaid: number; interestPaid: number; lenderName: string; lenderPAN: string; attachment: string };

export type OtherIncomeBreakdown = { incomeFromOtherSources: number; interestSavings: number; interestFD: number; interestNSC: number; attachment: string };

export type SalaryExemptions = {
  childrenCount: number; childrenEducationReceived: number; hostelAllowanceReceived: number; ltaEligibleTravel: number;
  disabledTransportReceived: number; gratuityReceived: number; leaveEncashmentReceived: number; retrenchmentReceived: number;
  vrsReceived: number; officialDutySpent: number; lifeInsuranceExempt: number;
};

export type ChapterVIA = Record<string, number | boolean>;

export type ItDeclaration = {
  stayingInRentedHouse: boolean;
  rentEntries: RentEntry[];
  homeLoanSelfOccupied: HomeLoan;
  letOutPropertyEnabled: boolean;
  letOutPropertyAttachment: string;
  investmentsOther: InvestmentLine[];
  otherIncomeBreakdown: OtherIncomeBreakdown;
  toggles: { section80C: boolean; section80D: boolean; otherInvestments: boolean };
  salaryExemptions: SalaryExemptions;
  chapterVIA: ChapterVIA;
};

export type ProofItem = {
  lineKey: string; sectionName: string; deductionHead: string; requestedAmount: number; acceptedAmount: number;
  status: 'pending' | 'approved' | 'rejected'; remark: string;
};

export type TaxCalculation = {
  incomeTax: number; surcharge: number; surchargeRate: number; cess: number; cessRate: number; total: number;
  rebateApplicable?: boolean; rebateAmount?: number;
  slabBreakdown: Array<{ incomeFrom: number; incomeTo: number; rate: number; taxableAmount: number; tax: number }>;
  age?: number | null; ageCategory?: string | null; dobMissing?: boolean;
};

export type IncomeMonth = { label: string; daysInMonth: number; applicableDays: number; excludedBefore: number; partial: boolean; amount: number };

export type IncomeBreakdown = { monthlyGross: number; equivalentMonths: number; salaryIncome: number; otherIncome: number; loanPerquisite: number; total: number; months: IncomeMonth[] };

export type HraExemption = { actualHRA: number; rentPaid: number; basic: number; rentMinusTenPercent: number; percentOfBasic: number; isMetro: boolean; exemptAmount: number };

export type ProjectedIncome = { basic: number; hra: number; allowances: number; otherIncome: number; loanPerquisite: number; total: number; gross?: number; da?: number };

export type PopulatedEmployee = { _id: string; firstName?: string; lastName?: string; email?: string; uniqueId?: string; status?: string; payrollInfo?: { employeeCode?: string } };

export type EmployeeTdsRecord = {
  _id?: string;
  employeeId: string | PopulatedEmployee;
  financialYear: string;
  taxRegime: 'old' | 'new';
  projectedAnnualIncome?: ProjectedIncome;
  declaredDeductions?: Record<string, number | boolean> | null;
  investments80C?: InvestmentLine[];
  investments80D?: InvestmentLine[];
  itDeclaration?: Partial<ItDeclaration> | null;
  hraExemption?: HraExemption;
  section10Exemptions?: Record<string, unknown>;
  taxableIncome?: number;
  taxPayable?: TaxCalculation;
  rebateApplicable?: boolean;
  rebateAmount?: number;
  incomeBreakdown?: IncomeBreakdown;
  monthlyTDS: number;
  tdsPeriod?: { start: string | null; end: string | null; equivalentMonths: number; payrollImplementationDate: string | null; payrollScheduleDate: string | null; joiningDate?: string | null; startDateSource: string; openingMonth?: Record<string, unknown> | null };
  fullYearComparison?: { gross: number; totalIncome: number; deductions: number; hraExemption: number; taxableIncome: number; taxPayable: number; monthlyTDS: number; periodStart: string | null; periodEnd: string | null };
  monthlyDeductions?: Array<{ month: string; year: number; tdsDeducted: number; payrollId?: string }>;
  totalTDSDeducted?: number;
  proofItems?: ProofItem[];
  proofSubmitted?: boolean;
  proofVerified?: boolean;
  proofStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  proofRemarks?: string;
  proofReviewedBy?: string;
  proofReviewedAt?: string | null;
  isLocked?: boolean;
  adminCalculated?: boolean;
  hasInvestmentDeclaration?: boolean;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TdsBreakdown = {
  taxRegime: 'old' | 'new';
  chapterVIADeductionsApplied: boolean;
  hraReceived: { monthlyAmount: number; annualAmount: number | null; payrollMonths: number; source: string; component: unknown };
  annualIncome: ProjectedIncome;
  hraExemption: HraExemption;
  section10: Record<string, unknown> & { total?: number };
  standardDeduction: number;
  chapterVIA: Record<string, unknown>;
  section80CLimit: number;
  exemptionLimits: Record<string, number | null>;
  deductionsApplied: number;
  taxableIncome: number;
  taxCalculation: TaxCalculation;
  monthlyTDS: number;
  remainingMonths: number;
  alreadyDeducted: number;
  loanPerquisite: { annualTotal?: number; [k: string]: unknown } | null;
  payrollImplementationDate: string | null;
  incomeBreakdown: IncomeBreakdown;
  tdsPeriod: { start: string | null; end: string | null; applicableMonths: number; startDateSource?: string; openingMonth?: Record<string, unknown> | null };
};

export type TdsSummaryView = {
  taxRegime: 'old' | 'new'; annualIncome: ProjectedIncome; hraExemption: HraExemption; deductionsApplied: number; taxableIncome: number;
  taxCalculation: TaxCalculation; monthlyTDS: number; remainingMonths: number; payrollImplementationDate: string | null;
  tdsPeriod: { start: string | null; end: string | null; applicableMonths: number };
};

export type CalculateResult = { employeeTDS: EmployeeTdsRecord; breakdown: TdsBreakdown; fullYear: TdsSummaryView };

export type TaxReport = {
  viewType: 'tax_report';
  financialYear: string; financialYearLabel: string; assessmentYear: string; periodDescription: string; generatedOn: string;
  tdsCalculated: boolean; message?: string;
  employee: { employeeId: string; employeeName: string; employeeCode: string; pan: string; designation: string };
  summary?: { taxRegime: string; taxRegimeLabel: string; grossIncome: number; taxableIncome: number; totalTax: number; monthlyTDS: number; totalTDSDeducted: number; pendingTDS: number; rebateApplicable: boolean; rebateAmount: number; isLocked: boolean };
  proofStatus: { proofSubmitted: boolean; proofVerified: boolean; proofStatus: string; proofRemarks?: string; proofReviewedAt?: string | null };
  income?: { basic: number; hra: number; allowances: number; otherIncome: number; grossSalary: number; hraReceived: number; hraExemption: number; rentPaid: number; standardDeduction: number; professionalTax: number; incomeFromSalary: number };
  declarations?: {
    declaredDeductions: Record<string, number>;
    investments80C: InvestmentLine[];
    investments80D: InvestmentLine[];
    itDeclaration: { stayingInRentedHouse: boolean; rentEntries: RentEntry[]; homeLoanSelfOccupied: Partial<HomeLoan>; investmentsOther: InvestmentLine[]; otherIncomeBreakdown: Partial<OtherIncomeBreakdown>; toggles: Record<string, boolean> };
  };
  chapter6A?: Record<string, number> | null;
  taxComputation?: { taxableIncome: number; incomeTax: number; surcharge: number; cess: number; totalTax: number; rebateApplicable: boolean; rebateAmount: number; netTaxLiability: number; monthlyTDS: number };
  tdsDeductions?: { monthWise: Array<{ month: string; year: number; tdsDeducted: number }>; quarterly: Array<{ quarter: string; period: string; tdsDeducted: number }>; totalTDSDeducted: number; pendingTDS: number };
  payrollMonthsProcessed: number;
  tdsRecordId?: string;
  updatedAt?: string;
};

export const SALARY_EXEMPTION_FIELDS: Array<{ key: keyof SalaryExemptions; label: string; hint?: string }> = [
  { key: 'childrenCount', label: 'Children (count)', hint: 'Used for education / hostel caps' },
  { key: 'childrenEducationReceived', label: 'Children education allowance received' },
  { key: 'hostelAllowanceReceived', label: 'Hostel allowance received' },
  { key: 'ltaEligibleTravel', label: 'LTA — eligible travel cost' },
  { key: 'disabledTransportReceived', label: 'Transport allowance (disabled employee)' },
  { key: 'gratuityReceived', label: 'Gratuity received' },
  { key: 'leaveEncashmentReceived', label: 'Leave encashment received' },
  { key: 'retrenchmentReceived', label: 'Retrenchment compensation received' },
  { key: 'vrsReceived', label: 'VRS compensation received' },
  { key: 'officialDutySpent', label: 'Allowance spent on official duty' },
  { key: 'lifeInsuranceExempt', label: 'Life insurance maturity exempt u/s 10(10D)' },
];

export const CHAPTER_VIA_FIELDS: Array<{ key: string; label: string; bool?: boolean }> = [
  { key: 'section80CCC', label: '80CCC — Pension fund' },
  { key: 'section80CCD1', label: '80CCD(1) — Employee NPS' },
  { key: 'section80CCD1B', label: '80CCD(1B) — Additional NPS' },
  { key: 'section80CCD2', label: '80CCD(2) — Employer NPS' },
  { key: 'section80DD', label: '80DD — Disabled dependant' },
  { key: 'section80DDSevere', label: '80DD — Severe disability (80%+)', bool: true },
  { key: 'section80DDB', label: '80DDB — Specified diseases' },
  { key: 'section80EE', label: '80EE — Home loan interest (first home)' },
  { key: 'section80EEA', label: '80EEA — Affordable housing interest' },
  { key: 'section80GG', label: '80GG — Rent paid (no HRA)' },
  { key: 'section80GGA', label: '80GGA — Scientific research donations' },
  { key: 'section80GGC', label: '80GGC — Political party donations' },
  { key: 'section80TTA', label: '80TTA — Savings interest' },
];

export const DEDUCTION_LABELS: Record<string, string> = {
  section80C: '80C', section80CCC: '80CCC', section80CCD1: '80CCD(1)', section80CCD1B: '80CCD(1B)', section80CCD2: '80CCD(2)',
  section80D: '80D', section80DD: '80DD', section80DDB: '80DDB', section80E: '80E — Education loan interest', section80EE: '80EE', section80EEA: '80EEA',
  section80G: '80G — Donations', section80GG: '80GG', section80GGA: '80GGA', section80GGC: '80GGC', section80TTA: '80TTA', section80TTB: '80TTB', section80U: '80U',
  section24: '24(b) — Home loan interest', professionalTax: 'Professional tax', otherDeductions: 'Other deductions', standardDeduction: 'Standard deduction', total: 'Total',
  section80DSelf: '80D — Self/family premium', section80DParents: '80D — Parents premium', section80DPreventive: '80D — Preventive check-up',
  section80DPreventiveSelf: '80D — Preventive (self)', section80DPreventiveParents: '80D — Preventive (parents)', section80DMedicalSelf: '80D — Medical exp. (self)',
  section80DMedicalParents: '80D — Medical exp. (parents)', section80DDBReimbursed: '80DDB — Reimbursed', section80G50: '80G — 50% (no limit)',
  section80G100Limited: '80G — 100% (limited)', section80G50Limited: '80G — 50% (limited)', section80EStartYear: '80E — Loan start year',
};

export function deductionLabel(key: string): string {
  return DEDUCTION_LABELS[key] ?? key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

export function recordEmployee(record: EmployeeTdsRecord): PopulatedEmployee | null {
  return record.employeeId && typeof record.employeeId === 'object' ? record.employeeId : null;
}
export function recordEmployeeId(record: EmployeeTdsRecord): string {
  return typeof record.employeeId === 'object' && record.employeeId ? record.employeeId._id : String(record.employeeId ?? '');
}
