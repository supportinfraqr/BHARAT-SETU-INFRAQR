/**
 * Full & Final settlement shapes — mirror legacy models/payroll/fullAndFinal.js,
 * utils/payroll/ffSettlementPreview.js and ffLeaveEncashmentHelper.js exactly.
 */

export type SettlementEmployee = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  uniqueId?: string;
  jobTitle?: string;
  dateOfJoining?: string | null;
  status?: string;
  exitData?: { exitStatus?: string; date?: string | null; reason?: string; lastWorkingDay?: string | null } | null;
};

export type SalaryDues = { unpaidSalary: number; workingDaysInLastMonth: number; proratedSalary: number; basicSalary: number; allowances: number; formula: string };
export type LeaveEncashment = { availableLeaves: number; encashableLeaves: number; perDayRate: number; totalAmount: number; method: string; basicSalary: number; grossSalary: number; formula: string };
export type BonusIncentives = { performanceBonus: number; statutoryBonus: number; incentives: number; commission: number; method: string; formula: string; monthsCounted: number; calcBase: number; percentage: number; eligible: boolean };
export type Deductions = { noticePeriodShortfall: number; loansAdvances: number; companyAssetRecovery: number; damageLoss: number; overtimeTaken: number; otherDeductions: number; totalDeductions: number };
export type Gratuity = { isEligible: boolean; yearsOfService: number; completedYears: number; lastDrawnSalary: number; gratuityAmount: number; formula: string; reason: string; capped: boolean };
export type Approval = { _id?: string; approverName: string; approverRole: string; approvedDate: string | null; status: 'pending' | 'approved' | 'rejected'; comments: string };
export type PaymentDetails = { paymentMode?: 'bank_transfer' | 'cheque' | 'cash'; paymentDate?: string | null; transactionId?: string; bankAccountNumber?: string; ifscCode?: string };

export type SettlementStatus = 'initiated' | 'pending' | 'approved' | 'finalized' | 'paid' | 'rejected';

export type Settlement = {
  _id: string;
  employeeId: string | SettlementEmployee | null;
  resignationId?: string | null;
  lastWorkingDate: string;
  settlementDate?: string | null;
  status: SettlementStatus;
  salaryDues?: Partial<SalaryDues>;
  leaveEncashment?: Partial<LeaveEncashment>;
  bonusIncentives?: Partial<BonusIncentives>;
  pendingReimbursements?: { travel?: number; medical?: number; other?: number; totalAmount?: number };
  deductions?: Partial<Deductions>;
  gratuity?: Partial<Gratuity>;
  taxDeductions?: { tds?: number; professionalTax?: number; totalTax?: number };
  totalPayables?: number;
  totalDeductions?: number;
  netPayable?: number;
  paymentDetails?: PaymentDetails | null;
  approvals?: Approval[];
  documents?: Array<{ documentType?: string; documentUrl?: string; uploadedAt?: string }>;
  remarks?: string;
  finalizedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SettlementPreview = {
  employee: { id: string; name: string; employeeCode: string; exitStatus: string; dateOfJoining: string | null };
  salaryDues: SalaryDues;
  leaveEncashment: LeaveEncashment;
  bonusIncentives: BonusIncentives;
  gratuity: Gratuity;
};

export type LeaveBalance = {
  leaveTypeId: string;
  leaveName: string;
  leaveType?: string;
  typeOfLeave?: string;
  monthlyAllowed: number;
  earnedTillPrev?: number;
  carryForward: number;
  totalAllotted: number;
  usedDays: number;
  remainingBalance: number;
  advanceUsed?: number;
  isUnlimited?: boolean;
  encashmentPolicy?: { encashed: boolean; encashedDaysLimit: number };
  isEncashable: boolean;
  encashableLeaves: number;
};

export type LeaveEncashmentDetails = {
  employee: { id: string; name: string; email: string; joiningDate: string | null };
  asOfDate: string;
  salaryBases: { baseSalary: number; grossSalary: number };
  leaves: LeaveBalance[];
  summary: { availableLeaves: number; encashableLeaves: number; perDayRate: number; totalAmount: number };
  leaveEncashment: { availableLeaves: number; encashableLeaves: number; perDayRate: number; totalAmount: number };
  encashableLeaveTypes: LeaveBalance[];
};

export type ExitedEmployees = { employees: SettlementEmployee[]; totalEmployees: number; totalPages: number; currentPage: number };

export const EXIT_STATUSES = ['Resigned', 'Termination', 'Retired', 'Superannuation', 'Contract Expiry', 'Cessation', 'Absconding', 'AWOL', 'Abandonment',
  'Misconduct', 'Poor Performance', 'Deported', 'Expired (Death)', 'Permanent Disability', 'Others'];

export const LEAVE_METHODS = [
  { value: 'basic_26', label: 'Basic ÷ 26' }, { value: 'basic_30', label: 'Basic ÷ 30' },
  { value: 'gross_26', label: 'Gross ÷ 26' }, { value: 'gross_30', label: 'Gross ÷ 30' },
];

export const GRATUITY_CAP = 2000000;

export const n = (v: unknown) => Number(v) || 0;
export const round2 = (v: number) => Math.round(v * 100) / 100;

/** ffSettlementPreview.leaveRate */
export function leaveRate(method: string, basic: number, gross: number) {
  const useGross = String(method).startsWith('gross');
  const divisor = String(method).endsWith('30') ? 30 : 26;
  const base = useGross ? gross : basic;
  return { perDayRate: base > 0 ? round2(base / divisor) : 0, label: `${useGross ? 'Gross' : 'Basic'} / ${divisor}` };
}

/** Same arithmetic as calculateFinalSettlement / finalizeSettlement. */
export function settlementTotals(s: Settlement) {
  const salary = n(s.salaryDues?.unpaidSalary) + n(s.salaryDues?.proratedSalary);
  const leave = n(s.leaveEncashment?.totalAmount);
  const bonus = n(s.bonusIncentives?.performanceBonus) + n(s.bonusIncentives?.statutoryBonus) + n(s.bonusIncentives?.incentives) + n(s.bonusIncentives?.commission);
  const reimbursements = n(s.pendingReimbursements?.totalAmount);
  const gratuity = n(s.gratuity?.gratuityAmount);
  const payables = salary + leave + bonus + reimbursements + gratuity;
  const otherDeductions = n(s.deductions?.totalDeductions);
  const tax = n(s.taxDeductions?.totalTax);
  const deductions = otherDeductions + tax;
  return { salary, leave, bonus, reimbursements, gratuity, payables, otherDeductions, tax, deductions, net: payables - deductions };
}

export function empOf(s: Settlement): SettlementEmployee | null {
  return s.employeeId && typeof s.employeeId === 'object' ? s.employeeId : null;
}
export function empIdOf(s: Settlement): string {
  if (!s.employeeId) return '';
  return typeof s.employeeId === 'string' ? s.employeeId : s.employeeId._id;
}
export function fullName(e?: { firstName?: string; lastName?: string } | null): string {
  return [e?.firstName, e?.lastName].filter(Boolean).join(' ');
}
export const isLocked = (s: Settlement) => s.status === 'finalized' || s.status === 'paid';
