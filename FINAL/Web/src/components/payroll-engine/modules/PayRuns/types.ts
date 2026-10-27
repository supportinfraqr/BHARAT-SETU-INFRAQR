/**
 * Response shapes of the legacy pay-run endpoints (controller/payroll/payrollRun.js).
 */

export type PayStatus = 'pending' | 'processed' | 'approved' | 'rejected' | 'on_hold' | 'paid';
export type PaymentMode = 'bank_transfer' | 'cash' | 'cheque';

export type PayLine = {
  _id?: string;
  componentName: string;
  fixedAmount?: number;
  amount: number;
  calculationType?: string;
  componentId?: string;
  claimId?: string;
  loanId?: string;
};

export type EmployerContributions = { epf?: number; edli?: number; adminCharges?: number; esi?: number; lwf?: number; total?: number };
export type EpfDetails = { applicable?: boolean; epfWage?: number; employeeRate?: number; employerRate?: number; ceilingApplied?: boolean; effectiveCeiling?: number; abryApplied?: boolean; overrideUsed?: boolean };
export type EsiDetails = { applicable?: boolean; wageUsed?: number; employeeRate?: number; employerRate?: number; wageLimit?: number; includeEmployerInCtc?: boolean };
export type PtDetails = { applicable?: boolean; stateUsed?: string; ptNumber?: string; cycle?: string; amount?: number };
export type LwfDetails = { applicable?: boolean; stateUsed?: string; cycle?: string; employeeShare?: number; employerShare?: number };
export type BonusDetails = { applicable?: boolean; amount?: number; cycle?: string; paymentMonth?: string; calcBase?: number; percentage?: number };

/** Populated `employeeId` on getPayroll / getPayrollHistory. */
export type RunEmployee = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  customId?: string;
  uniqueId?: string;
  payrollInfo?: { employeeCode?: string; department?: string; designation?: string };
  departmentId?: { _id?: string; name?: string } | string | null;
};

export type DayKind = 'present' | 'half' | 'leave' | 'unpaidLeave' | 'absent' | 'holiday' | 'weekoff' | 'unmarked';

export type PaidDaysBreakdown = {
  calendarDays: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  weekOffDays: number;
  holidayDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  unmarkedDays: number;
  startWeekday: number;
  shiftName: string;
  holidays: Array<{ day: number; name: string; type: string }>;
  days: Array<{ day: number; weekday: string; kind: DayKind; title: string }>;
};

export type PayrollRun = {
  _id: string;
  organizationId: string;
  employeeId: RunEmployee | string | null;
  month: string;
  year: number;
  earnings: PayLine[];
  deductions: PayLine[];
  benefits: PayLine[];
  reimbursements: PayLine[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerContributions?: EmployerContributions;
  epfDetails?: EpfDetails;
  esiDetails?: EsiDetails;
  ptDetails?: PtDetails;
  lwfDetails?: LwfDetails;
  bonusDetails?: BonusDetails;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lopDays: number;
  payStatus: PayStatus;
  processedDate?: string | null;
  approvedDate?: string | null;
  paidDate?: string | null;
  paymentMode?: PaymentMode | null;
  transactionId?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
  paidDaysBreakdown?: PaidDaysBreakdown | null;
};

/** Row of getPayRunMonthlyData.employees / getMonthlyPayrollHistroy.history[].employees. */
export type PayRunEmployeeRow = {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  bankAccountNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  paidDays: number;
  workingDays: number;
  presentDays: number;
  lopDays: number;
  grossPay: number;
  deductions: number;
  taxes: number;
  benefits: number;
  reimbursement: number;
  netPay: number;
  payStatus: PayStatus;
  paymentMode: PaymentMode | null;
  paidDate: string | null;
  processedDate: string | null;
};

export type PeriodSummary = {
  payrollCost: number;
  totalNetPay: number;
  totalGrossPay: number;
  totalDeductions: number;
  taxes: number;
  benefits: number;
  reimbursements: number;
  donations: number;
  employeeCount: number;
  skippedEmployees: number;
  baseDays: number;
  payDay: string | null;
  statusWise: Record<string, number>;
};

export type PeriodInfo = { month: string; year: number; label: string; baseDays: number; payDay: string | null };

export type PayRunMonthlyData = {
  period: PeriodInfo;
  summary: PeriodSummary;
  employees: PayRunEmployeeRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type PayRunPeriods = {
  periods: Array<{ month: string; year: number; employeeCount: number; totalNetPay: number; totalGrossPay: number; lastProcessedAt: string | null }>;
  totalPeriods: number;
};

export type MonthlyHistory = {
  totalPeriods: number;
  grandTotals: { payrollCost: number; totalNetPay: number; totalGrossPay: number; totalDeductions: number; taxes: number; benefits: number; reimbursements: number };
  history: Array<{ period: PeriodInfo; summary: PeriodSummary; employees?: PayRunEmployeeRow[] }>;
};

export type ProcessResult = {
  successful: number;
  failed: number;
  excluded: number;
  excludeEmployeeIds: string[];
  excludedEmployees: Array<{ employeeId: string; name: string | null }>;
  results: Array<{ employeeId: string; name: string; netPay: number; status: string }>;
  errors: Array<{ employeeId: string; name: string; error: string }>;
};

export type RecalcPayload = {
  preview: boolean;
  payrollId: string;
  employeeId: string;
  month: string;
  year: number;
  payStatus: PayStatus;
  calendarDays: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
  earnings: PayLine[];
  deductions: PayLine[];
  benefits: PayLine[];
  reimbursements: PayLine[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerContributions?: EmployerContributions;
  epfDetails?: EpfDetails;
  esiDetails?: EsiDetails;
  ptDetails?: PtDetails;
  lwfDetails?: LwfDetails;
  bonusDetails?: BonusDetails;
};

export type BulkStatusResult = { requestedCount: number; matchedCount: number; modifiedCount: number; payStatus: PayStatus };

export type Payslip = {
  organization: { name: string; address: unknown; logo: string };
  employee: { name: string; code: string; email: string; department: string; designation: string };
  payPeriod: { month: string; year: number };
  earnings: PayLine[];
  deductions: PayLine[];
  benefits: PayLine[];
  reimbursements: PayLine[];
  summary: { grossEarnings: number; totalDeductions: number; netPay: number };
  attendance: { workingDays: number; paidDays: number; presentDays: number };
};
