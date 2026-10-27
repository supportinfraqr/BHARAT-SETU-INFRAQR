"use client";

/**
 * Shared types + small views for Claims & Declarations (HR module and the
 * employee "My Claims" screen). Shapes follow legacy
 * models/payroll/claimsDeclaration.js and controller/payroll/employeePayroll.js.
 */

import { Paperclip } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Badge, Row, fmtDate, fmtDateTime, money } from '../../ui';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export type ReimbursementClaim = {
  _id: string;
  claimNo?: string;
  claimGroupId?: string;
  headId?: string | null;
  headName?: string;
  headCode?: string;
  name?: string;
  type?: string;
  claimDate?: string | null;
  billNo?: string;
  particulars?: string;
  claimedAmount?: number;
  approvedAmount?: number;
  proofUrl?: string;
  description?: string;
  employeeComments?: string;
  attachmentUrls?: string[];
  submittedOn?: string | null;
  status?: ClaimStatus;
  includedInPayrollId?: string | null;
  /** Only on the org-wide queue (employee/getAllClaimsSummary). */
  employee?: { _id: string | null; employeeCode: string; firstName: string; lastName: string; fullName: string; email: string };
  approvedBy?: string | null;
  approvedOn?: string | null;
  rejectionReason?: string;
};

export type FlexiblePlan = { _id: string; componentId?: string | null; componentName: string; amount: number; month?: string; status: ClaimStatus };
export type TaxDeclarationLine = { _id: string; section: string; subSection?: string; amountDeclared: number; amountApproved: number };
export type InvestmentProof = { _id: string; declarationId: string; fileUrl: string; verifiedBy?: string; status: 'pending' | 'verified' | 'rejected' };
export type ClaimsDoc = {
  _id?: string;
  employeeId?: string;
  flexibleBenefitPlan?: FlexiblePlan[];
  reimbursements?: ReimbursementClaim[];
  incomeTaxDeclarations?: TaxDeclarationLine[];
  investmentProofs?: InvestmentProof[];
  createdAt?: string;
  updatedAt?: string;
};
export type ClaimStats = { total: number; approved: number; pending: number; rejected: number; totalClaimed?: number; totalApproved?: number };
export type ReimbursementHead = { _id: string; name: string; code?: string; maxLimit: number; frequency?: string; taxable?: boolean };

/** Legacy mongo `_id`, tolerate a port emitting `id`. */
export function idOf(row: { _id?: unknown; id?: unknown } | null | undefined): string {
  return String(row?._id ?? row?.id ?? '');
}

export function fileName(url: string): string {
  const clean = url.split('?')[0];
  const last = clean.split('/').filter(Boolean).pop() ?? 'file';
  try { return decodeURIComponent(last); } catch { return last; }
}

export function FileLink({ url, label }: { url: string; label?: string }) {
  if (!url) return null;
  return <a href={pe.fileUrl(url)} target="_blank" rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-bss-interactive-blue)] hover:underline break-all">
    <Paperclip size={12} className="shrink-0" />{label ?? fileName(url)}
  </a>;
}

export function ClaimAttachments({ claim }: { claim: ReimbursementClaim }) {
  const files = [...(claim.proofUrl ? [{ url: claim.proofUrl, label: 'Bill / proof' }] : []), ...(claim.attachmentUrls ?? []).map((url, i) => ({ url, label: `Attachment ${i + 1}` }))];
  if (!files.length) return <span className="text-gray-400">—</span>;
  return <div className="flex flex-col gap-1">{files.map(f => <FileLink key={f.url} url={f.url} label={f.label} />)}</div>;
}

export function claimTitle(c: ReimbursementClaim): string {
  return c.headName || c.name || c.type || 'Reimbursement';
}

/** Full detail of one reimbursement line (all legacy fields). */
export function ClaimDetail({ claim }: { claim: ReimbursementClaim }) {
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Badge status={claim.status} />
      {claim.includedInPayrollId && <Badge status="paid">Paid via payroll</Badge>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Row label="Claim no." value={claim.claimNo || '—'} />
      {claim.employee && <Row label="Employee" value={`${claim.employee.fullName || '—'}${claim.employee.employeeCode ? ` · ${claim.employee.employeeCode}` : ''}`} />}
      <Row label="Reimbursement head" value={`${claim.headName || '—'}${claim.headCode ? ` (${claim.headCode})` : ''}`} />
      <Row label="Name" value={claim.name || '—'} />
      <Row label="Type" value={claim.type || '—'} />
      <Row label="Claim date" value={fmtDate(claim.claimDate)} />
      <Row label="Bill no." value={claim.billNo || '—'} />
      <Row label="Submitted on" value={fmtDateTime(claim.submittedOn)} />
      <Row label="Claimed amount" value={money(claim.claimedAmount)} />
      <Row label="Approved amount" value={money(claim.approvedAmount)} tone={claim.status === 'approved' ? 'text-green-700' : ''} />
      {claim.approvedBy && <Row label="Actioned by" value={claim.approvedBy} />}
      {claim.approvedOn && <Row label="Actioned on" value={fmtDateTime(claim.approvedOn)} />}
      {claim.claimGroupId && <Row label="Claim group" value={<span className="font-mono text-[10px]">{claim.claimGroupId}</span>} />}
    </div>
    {claim.particulars && <Note label="Particulars" text={claim.particulars} />}
    {claim.description && <Note label="Description" text={claim.description} />}
    {claim.employeeComments && <Note label="Employee comments" text={claim.employeeComments} />}
    {claim.rejectionReason && <Note label="Rejection reason" text={claim.rejectionReason} />}
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">Attachments</p>
      <ClaimAttachments claim={claim} />
    </div>
  </div>;
}

function Note({ label, text }: { label: string; text: string }) {
  return <div className="rounded-lg border border-gray-100 px-3 py-2"><p className="text-[11px] text-gray-500">{label}</p><p className="text-xs text-gray-800 whitespace-pre-wrap">{text}</p></div>;
}

export const TAX_SECTIONS: Array<{ value: string; label: string }> = [
  { value: '80C', label: '80C — LIC, PPF, ELSS, tuition fees, principal…' },
  { value: '80CCC', label: '80CCC — Pension fund' },
  { value: '80CCD(1)', label: '80CCD(1) — Employee NPS' },
  { value: '80CCD(1B)', label: '80CCD(1B) — Additional NPS' },
  { value: '80CCD(2)', label: '80CCD(2) — Employer NPS' },
  { value: '80D', label: '80D — Health insurance' },
  { value: '80DD', label: '80DD — Disabled dependant' },
  { value: '80DDB', label: '80DDB — Specified illness' },
  { value: '80E', label: '80E — Education loan interest' },
  { value: '80EE', label: '80EE — Home loan interest (first home)' },
  { value: '80EEA', label: '80EEA — Affordable housing interest' },
  { value: '80EEB', label: '80EEB — EV loan interest' },
  { value: '80G', label: '80G — Donations' },
  { value: '80GG', label: '80GG — Rent (no HRA)' },
  { value: '80TTA', label: '80TTA — Savings interest' },
  { value: '80TTB', label: '80TTB — Senior citizen interest' },
  { value: '80U', label: '80U — Self disability' },
  { value: '24(b)', label: '24(b) — Home loan interest' },
  { value: '10(13A)', label: '10(13A) — HRA' },
  { value: 'Other', label: 'Other' },
];
