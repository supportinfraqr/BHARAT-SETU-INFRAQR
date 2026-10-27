/**
 * Local types for the employee Tax Declaration screen. Shapes follow the legacy
 * `models/payroll/employeeTDS.js` record and the `tdsManagement.js` responses.
 */

export type InvestmentLine = { investmentType: string; amount: number; attachment: string };

export type RentEntry = {
  fromDate: string; toDate: string; rentMonthly: number; rentAnnual: number; address: string; landlordName: string;
  urbanizationType: string; urbanizationType2: string; isMetroCity: boolean; attachment: string;
};

export type HomeLoan = { enabled: boolean; principalPaid: number; interestPaid: number; lenderName: string; lenderPAN: string; attachment: string };

export type OtherIncome = { incomeFromOtherSources: number; interestSavings: number; interestFD: number; interestNSC: number; attachment: string };

export type Toggles = { section80C: boolean; section80D: boolean; otherInvestments: boolean };

export type SalaryExemptions = {
  childrenCount: number; childrenEducationReceived: number; hostelAllowanceReceived: number; ltaEligibleTravel: number;
  disabledTransportReceived: number; gratuityReceived: number; leaveEncashmentReceived: number; retrenchmentReceived: number;
  vrsReceived: number; officialDutySpent: number; lifeInsuranceExempt: number;
};

export type ChapterVIA = {
  section80CCC: number; section80CCD1: number; section80CCD1B: number; section80CCD2: number; section80DD: number;
  section80DDSevere: boolean; section80DDB: number; section80EE: number; section80EEA: number; section80GG: number;
  section80GGA: number; section80GGC: number; section80TTA: number;
};

export type ItDeclaration = {
  stayingInRentedHouse: boolean; rentEntries: RentEntry[]; homeLoanSelfOccupied: HomeLoan;
  letOutPropertyEnabled: boolean; letOutPropertyAttachment: string; investmentsOther: InvestmentLine[];
  otherIncomeBreakdown: OtherIncome; toggles: Toggles; salaryExemptions: SalaryExemptions; chapterVIA: ChapterVIA;
};

export type ProofItem = { _id?: string; lineKey: string; sectionName: string; deductionHead: string; requestedAmount: number; acceptedAmount: number; status: 'pending' | 'approved' | 'rejected'; remark: string };

export type SlabRow = { incomeFrom: number; incomeTo: number; rate: number; taxableAmount: number; tax: number };

export type EmployeeTdsRecord = {
  _id?: string;
  employeeId: string | { _id: string };
  financialYear: string;
  taxRegime: 'old' | 'new';
  isNew?: boolean;
  investments80C: InvestmentLine[];
  investments80D: InvestmentLine[];
  itDeclaration: Partial<ItDeclaration> | null;
  declaredDeductions: Record<string, number | boolean> | null;
  projectedAnnualIncome?: { basic: number; hra: number; allowances: number; otherIncome: number; loanPerquisite: number; total: number };
  hraExemption?: { actualHRA: number; rentPaid: number; basic: number; rentMinusTenPercent: number; percentOfBasic: number; isMetro: boolean; exemptAmount: number };
  section10Exemptions?: Record<string, unknown>;
  taxableIncome?: number;
  taxPayable?: { incomeTax: number; surcharge: number; surchargeRate: number; cess: number; cessRate: number; total: number; rebateAmount?: number; slabBreakdown: SlabRow[] };
  rebateApplicable?: boolean;
  rebateAmount?: number;
  incomeBreakdown?: { monthlyGross: number; equivalentMonths: number; salaryIncome: number; otherIncome: number; loanPerquisite: number; total: number; months: Array<{ label: string; daysInMonth: number; applicableDays: number; excludedBefore: number; partial: boolean; amount: number }> };
  monthlyTDS: number;
  tdsPeriod?: { start: string | null; end: string | null; equivalentMonths: number; payrollImplementationDate: string | null; startDateSource: string };
  fullYearComparison?: { gross: number; totalIncome: number; deductions: number; hraExemption: number; taxableIncome: number; taxPayable: number; monthlyTDS: number; periodStart: string | null; periodEnd: string | null };
  monthlyDeductions?: Array<{ month: string; year: number; tdsDeducted: number; payrollId?: string }>;
  totalTDSDeducted?: number;
  proofItems?: ProofItem[];
  proofSubmitted?: boolean;
  proofVerified?: boolean;
  proofStatus?: 'pending' | 'submitted' | 'approved' | 'rejected';
  proofRemarks?: string;
  proofReviewedAt?: string | null;
  isLocked?: boolean;
  adminCalculated?: boolean;
  hasInvestmentDeclaration?: boolean;
  updatedAt?: string;
};

export type RegimeCompare = {
  totalExemptions: number; totalTaxableIncome: number; taxOnTotalTaxableIncome: number; rebateUnderSection87A: number;
  educationCess4Percent: number; totalTaxPayable: number;
  exemptionsBasedOnDeclaration?: { allowanceExemptions: number; underSection16: number; investments80C: number; investments80CMaxLimit: number; investments80D: number; otherInvestmentAndExemption: number; totalExemptions: number };
};

export type SaveAndCompare = {
  financialYear: string;
  earnings: { grossSalary: number; incomeFromOtherSources: number; grossTotalIncome: number };
  oldRegime: RegimeCompare;
  newRegime: RegimeCompare;
  recommendedRegime: 'old' | 'new';
  taxSavingAmount: number;
};

export type SaveResult = {
  employeeTDS: EmployeeTdsRecord;
  saveAndCompare: SaveAndCompare | null;
  tdsPreview?: { taxRegime: string; taxableIncome: number; monthlyTDS: number; annualTax: number } | null;
  aggregates: { section80C: number; section80D: number; section24: number; otherDeductions: number; section80DMaxLimit?: number; section24MaxLimit?: number; lines80C: number; lines80D: number; rentEntries: number; otherInvestmentLines: number };
};

export type HraDetails = {
  employeeId: string; financialYear: string;
  hraReceived: { monthlyAmount: number; annualAmount: number; payrollMonths: number; source: string; component: { name: string; code: string; calculationType: string; value: number; basedOn: string } | null };
};

export type TaxReport = {
  viewType: string; financialYear: string; financialYearLabel: string; assessmentYear: string; periodDescription: string; generatedOn: string;
  tdsCalculated: boolean; message?: string;
  employee: { employeeId: string; employeeName: string; employeeCode: string; pan: string; designation: string };
  summary?: { taxRegime: string; taxRegimeLabel: string; grossIncome: number; taxableIncome: number; totalTax: number; monthlyTDS: number; totalTDSDeducted: number; pendingTDS: number; rebateApplicable: boolean; rebateAmount: number; isLocked: boolean };
  proofStatus: { proofSubmitted: boolean; proofVerified: boolean; proofStatus: string; proofRemarks?: string; proofReviewedAt?: string | null };
  income?: { basic: number; hra: number; allowances: number; otherIncome: number; grossSalary: number; hraReceived: number; hraExemption: number; rentPaid: number; standardDeduction: number; professionalTax: number; incomeFromSalary: number };
  chapter6A?: { section80C: number; section80D: number; section80E: number; section80G: number; section24: number; otherDeductions: number; totalChapter6A: number } | null;
  taxComputation?: { taxableIncome: number; incomeTax: number; surcharge: number; cess: number; totalTax: number; rebateApplicable: boolean; rebateAmount: number; netTaxLiability: number; monthlyTDS: number };
  tdsDeductions?: { monthWise: Array<{ month: string; year: number; tdsDeducted: number }>; quarterly: Array<{ quarter: string; period: string; tdsDeducted: number }>; totalTDSDeducted: number; pendingTDS: number };
  payrollMonthsProcessed: number;
  updatedAt?: string;
};

/** Editable form state. Lines carry a local `key` (stripped before sending). */
export type Keyed<T> = T & { key: string };
export type FormState = {
  taxRegime: 'old' | 'new';
  investments80C: Keyed<InvestmentLine>[];
  investments80D: Keyed<InvestmentLine>[];
  it: Omit<ItDeclaration, 'rentEntries' | 'investmentsOther'> & { rentEntries: Keyed<RentEntry>[]; investmentsOther: Keyed<InvestmentLine>[] };
  section80E: number;
  section80G: number;
  professionalTax: number;
};

/** Files picked but not yet uploaded, by line key (lists) or slot name (single attachments). */
export type PendingFiles = Record<string, File>;
