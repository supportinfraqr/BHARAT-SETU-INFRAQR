/**
 * Payroll workspace store — one role-aware state model shared by Contractor,
 * Employer and Admin payroll surfaces. Each role surface gets the SAME store;
 * role + permissions decide which modules render and which records are visible.
 */

import type { ContractorPayrollConfig, PayrollWorkerRecord } from '@/types/portal';
import type { PayrollWorkerRef, PayrollRole, PaymentInfo, PayRun, PayrollApprovalItem, PayrollLoan, SalaryStructure, PayrollRequest, FnFRequest, Form16Record, SalaryRevision, AuditEvent } from '@/lib/payroll/types';

export type { PaymentInfo, PayRun, PayrollApprovalItem, PayrollLoan, SalaryStructure, PayrollRequest, FnFRequest, Form16Record, SalaryRevision, AuditEvent, PayrollRole, PayrollWorkerRef } from '@/lib/payroll/types';

export type PayrollStore = {
  role: PayrollRole;
  roleLabel: string;
  actor: string; // current user display name for audit/provenance
  orgName: string;
  orgId: string;
  period: string;
  config: ContractorPayrollConfig;
  employers: string[];
  contractors: string[];
  sites: string[];
  workers: PayrollWorkerRef[];

  // Global payroll filters (role-appropriate)
  employerFilter: string;
  contractorFilter: string;
  siteFilter: string;
  setEmployerFilter: (v: string) => void;
  setContractorFilter: (v: string) => void;
  setSiteFilter: (v: string) => void;
  visibleRecords: () => PayrollWorkerRecord[];

  records: PayrollWorkerRecord[];
  addRecords: (rows: PayrollWorkerRecord[]) => void;
  updateRecord: (id: string, patch: Partial<PayrollWorkerRecord>) => void;

  payments: Record<string, PaymentInfo>;
  setPayment: (recordId: string, info: PaymentInfo) => void;

  runs: PayRun[];
  addRun: (run: PayRun) => void;
  setRunStatus: (id: string, status: PayRun['status'], by: string) => void;

  approvals: PayrollApprovalItem[];
  addApproval: (item: PayrollApprovalItem) => void;
  setApprovalStatus: (id: string, status: PayrollApprovalItem['status'], by: string, note: string) => void;

  loans: PayrollLoan[];
  addLoan: (loan: PayrollLoan) => void;
  repayLoan: (id: string, repayment: PayrollLoan['repayments'][number]) => void;

  structures: SalaryStructure[];
  addStructure: (s: SalaryStructure) => void;
  toggleStructureHead: (structureId: string, headName: string) => void;
  deactivateStructure: (id: string) => void;

  vpfRequests: PayrollRequest[];
  addVpf: (request: PayrollRequest) => void;
  setVpfStatus: (id: string, status: PayrollRequest['status'], by: string) => void;

  fandf: FnFRequest[];
  addFandf: (f: FnFRequest) => void;
  setFandfStatus: (id: string, status: FnFRequest['status'], by: string) => void;

  form16: Form16Record[];
  generateForm16: (workerId: string, fy: string, by: string) => void;

  revisions: SalaryRevision[];
  addRevision: (r: SalaryRevision) => void;
  setRevisionStatus: (id: string, status: SalaryRevision['status'], by: string) => void;

  audit: AuditEvent[];
  logAudit: (event: AuditEvent) => void;
  notify: (message: string, tone?: 'success' | 'error') => void;
};
