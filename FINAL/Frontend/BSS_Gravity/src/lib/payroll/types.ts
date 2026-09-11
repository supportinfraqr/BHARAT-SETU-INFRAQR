/**
 * ONE BSS Payroll domain model.
 *
 * Contractor, Employer and BSS Admin all operate on this single Worker-level
 * model. Records always carry the Worker → Site → Contractor → Employer
 * relationship that already exists in BSS. Nothing here introduces a second
 * payroll database — these are the operational concepts ON TOP of the shared
 * Worker payroll record (types/portal.ts → PayrollWorkerRecord).
 */

import type { ContractorPayrollConfig, PayrollWorkerRecord } from '@/types/portal';

export type PayrollRole = 'Contractor' | 'Employer' | 'Admin';

export type PayrollWorkerRef = {
  bssId: string;
  name: string;
  employer: string;
  site: string;
  contractor: string;
  designation: string;
};

/** Pay Run — one model with a type. Never seven engines. */
export type PayRunType = 'Regular Payroll' | 'Past Payroll' | 'Final Settlement Payroll' | 'One-Time Payout' | 'Off-Cycle Payroll' | 'Bulk Final Settlement Payroll' | 'Reassessment Payroll';

export type PayRunStatus = 'Planned' | 'Processing' | 'Awaiting Approval' | 'Approved' | 'Paid' | 'Rejected';

export type PayRun = {
  id: string;
  period: string;
  type: PayRunType;
  employer: string;
  contractor: string | null;
  site: string | null;
  schedule: string;
  workersIncluded: number;
  workersSkipped: number;
  gross: number;
  net: number;
  employeeDeductions: number;
  employerContributions: number;
  paymentDate: string;
  status: PayRunStatus;
  createdBy: string;
  createdAt: string;
  errors: string[];
};

export type PaymentStatus = 'Not Yet Paid' | 'Pending' | 'Paid' | 'Failed' | 'Reversed';

export type PaymentInfo = {
  recordId: string;
  status: PaymentStatus;
  mode?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  account?: string;
  reference?: string;
  paidOn?: string;
  paidBy?: string;
};

export type PayrollApprovalCategory =
  | 'Payroll Run Approval'
  | 'Reimbursement Approval'
  | 'Salary Revision Approval'
  | 'Proof of Investment Review'
  | 'Full & Final Settlement Approval'
  | 'Claims'
  | 'Payroll Request (VPF)';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved' | 'Clarification Requested';

export type PayrollApprovalItem = {
  id: string;
  category: PayrollApprovalCategory;
  reference: string;
  worker: string;
  workerId: string;
  employer: string;
  contractor: string;
  site: string;
  requestedBy: string;
  requestedOn: string;
  amount: number;
  status: ApprovalStatus;
  remarks: string;
  history: Array<{ by: string; action: string; at: string; note?: string }>;
};

export type PayrollLoan = {
  id: string;
  loanName: string;
  worker: string;
  workerId: string;
  employer: string;
  contractor: string;
  amount: number;
  repaid: number;
  disbursedOn: string;
  mode: string;
  account?: string;
  reference: string;
  reason: string;
  status: 'Active' | 'Closed';
  repayments: Array<{ id: string; amount: number; date: string; mode: string; account: string; reference: string; by: string }>;
  createdBy: string;
};

export type SalaryStructure = {
  id: string;
  name: string;
  applicability: string;
  pfRule: string;
  createdBy: string;
  createdAt: string;
  status: 'Active' | 'Draft' | 'Deactivated';
  heads: Array<{
    type: 'Earning' | 'Allowance' | 'Deduction' | 'Employer Contribution' | 'Statutory';
    name: string;
    calculationType: string;
    formulaAmount: string;
    attendanceBased: boolean;
    presentDayBased: boolean;
    showOnPayslip: boolean;
    active: boolean;
  }>;
};

export type SalaryRevision = {
  id: string;
  worker: string;
  workerId: string;
  revisionType: string;
  effectiveFrom: string;
  payoutMonth: string;
  status: 'Requested' | 'Approved' | 'Rejected';
  previousCTC: number;
  revisedCTC: number;
  revisedBy: string;
  revisedOn: string;
};

export type FnFRequest = {
  id: string;
  worker: string;
  workerId: string;
  employer: string;
  contractor: string;
  site: string;
  designation: string;
  joiningDate: string;
  lastWorkingDate: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid';
  summary: {
    salaryHoldMonths: number;
    lastMonthSalary: number;
    gross: number;
    net: number;
    tds: number;
    adjustments: number;
    penalties: number;
    totalNetPayable: number;
  };
  heads: Array<{ label: string; amount: number }>;
  taxRegime: 'Old Tax Regime' | 'New Tax Regime';
  submittedBy: string;
  submittedOn: string;
};

export type Form16Record = {
  workerId: string;
  worker: string;
  employer: string;
  contractor: string;
  financialYear: string;
  generationStatus: 'Not Generated' | 'Generated' | 'Regenerated';
  generatedDate: string | null;
  tds: number;
  regime: 'Old Tax Regime' | 'New Tax Regime' | 'Not Declared';
};

export type PayrollRequest = {
  id: string;
  type: 'VPF Request';
  worker: string;
  workerId: string;
  contractor: string;
  employer: string;
  site: string;
  submittedDate: string;
  selectedOption: string;
  effectivePeriod: string;
  status: 'Requested' | 'Under Review' | 'Approved' | 'Rejected';
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: PayrollRole;
  action: string;
  entity: string;
  reference: string;
  oldValue: string | null;
  newValue: string | null;
  worker: string;
  employer: string;
  contractor: string;
  period: string;
  reason: string | null;
};

/** Admin workspace — read-only supervisory projection of the SAME records. */
export type AdminEmployer = { bssId: string; name: string };
export type AdminContractor = { bssId: string; name: string };
export type AdminPayrollSnapshot = {
  dataMode: 'remote';
  generatedAt: string;
  employers: AdminEmployer[];
  contractors: AdminContractor[];
  sites: string[];
  workers: PayrollWorkerRef[];
  payroll: { config: ContractorPayrollConfig; records: PayrollWorkerRecord[]; templateColumns: string[] };
  sourceNote: string;
};

/** Role capabilities — which modules each role may operate. */
export const PAYROLL_MODULES: Array<{ id: string; label: string; roles: PayrollRole[] }> = [
  { id: 'overview', label: 'Overview', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'workerPayroll', label: 'Worker Payroll', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'setup', label: 'Payroll Setup', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'runs', label: 'Pay Runs', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'manual', label: 'Manual Entry', roles: ['Contractor', 'Employer'] },
  { id: 'bulk', label: 'Bulk Upload', roles: ['Contractor', 'Employer'] },
  { id: 'distribution', label: 'Distribution', roles: ['Employer'] },
  { id: 'payments', label: 'Payments', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'approvals', label: 'Approvals', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'loans', label: 'Loans', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'structures', label: 'Salary Structures', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'fandf', label: 'Full & Final', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'form16', label: 'Form 16 / Tax', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'requests', label: 'Requests (VPF)', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'exceptions', label: 'Exceptions', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'history', label: 'History', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'reports', label: 'Reports', roles: ['Contractor', 'Employer', 'Admin'] },
  { id: 'audit', label: 'Audit Trail', roles: ['Admin'] },
];
