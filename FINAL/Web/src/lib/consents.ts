// Consent registry — records of consents a portal user has given (or revoked),
// visible to Workers, Contractors, Employers and BSS Staff with revocation in Settings.

export type ConsentScopeRole = 'worker' | 'contractor' | 'employer' | 'staff';
export type ConsentStatus = 'given' | 'revoked';

export type ConsentRecord = {
  id: string;
  title: string;
  detail: string;
  purpose: string;
  grantedAt: string;
  revokedAt?: string;
  status: ConsentStatus;
  revocable: boolean;
};

type Seed = { id: string; title: string; detail: string; purpose: string; revocable?: boolean };

const SEEDS: Record<ConsentScopeRole, Seed[]> = {
  worker: [
    { id: 'w-aadhaar', title: 'Aadhaar identity verification', detail: 'Share your Aadhaar demographics with UIDAI to verify your identity on BSS.', purpose: 'Identity verification for registration and site access' },
    { id: 'w-bank', title: 'Bank account verification (penny-drop)', detail: 'Verify that the wage bank account belongs to you via NPCI.', purpose: 'Wage payment and ESIC/PF disbursals' },
    { id: 'w-epfo', title: 'EPFO UAN data sharing', detail: 'Share your UAN-linked employment history with BSS.', purpose: 'PF enrolment, portability and benefits' },
    { id: 'w-esic', title: 'ESIC data sharing', detail: 'Share your ESIC IP-linked insurance record with BSS.', purpose: 'ESIC benefit tracking' },
    { id: 'w-photo', title: 'Photo on public QR', detail: 'Show your photo when your worker QR is scanned by the public.', purpose: 'Identity verification at site gates' },
    { id: 'w-jobs', title: 'Profile sharing for job matching', detail: 'Allow employers and contractors to see your skills profile for Rozgar Setu matching.', purpose: 'Employment matching' },
    { id: 'w-grievance', title: 'Grievance data handling', detail: 'Allow the assigned contractor, employer and BSS reviewer to view your grievance records and replies.', purpose: 'Grievance redressal' },
  ],
  contractor: [
    { id: 'c-verify', title: 'Contractor identity & KYC verification', detail: 'Share company PAN/GSTIN and signatory details for verification.', purpose: 'Onboarding & trust' },
    { id: 'c-compliance', title: 'Share compliance submissions with employer', detail: 'Let the principal employer review your compliance documents and gate passes.', purpose: 'Employer governance workflows' },
    { id: 'c-finance', title: 'Bank account verification (penny-drop)', detail: 'Verify the company wage bank account used for salary disbursal.', purpose: 'Payroll & disbursal' },
    { id: 'c-workers', title: 'Worker data processing (bound workers)', detail: 'Process records of workers bound to your contractor account for attendance, payroll and compliance.', purpose: 'Worker management' },
    { id: 'c-analytics', title: 'Platform analytics usage', detail: 'Use de-identified statistics of your workforce for BSS reporting.', purpose: 'Policy analytics' },
  ],
  employer: [
    { id: 'e-docs', title: 'Worker & contractor document review', detail: 'View compliance documents submitted by your connected contractors.', purpose: 'Site governance' },
    { id: 'e-compliance', title: 'Compliance data sharing', detail: 'Share site-level compliance records with BSS and regulators.', purpose: 'Statutory reporting' },
    { id: 'e-analytics', title: 'Workforce analytics', detail: 'Use de-identified workforce statistics for planning and reporting.', purpose: 'Policy & planning' },
    { id: 'e-identity', title: 'Entity identity verification', detail: 'Share employer PAN/GSTIN for verification and registration.', purpose: 'Onboarding & trust' },
  ],
  staff: [
    { id: 's-cases', title: 'Case resolution access', detail: 'Access worker/contractor/employer records needed to resolve support cases assigned to you.', purpose: 'Support operations' },
    { id: 's-docs', title: 'Document handling consent', detail: 'Handle uploaded documents and identity proofs within support workflows.', purpose: 'Support operations' },
    { id: 's-audit', title: 'Audit export consent', detail: 'Export audit trails and logs for compliance review.', purpose: 'Audit & compliance' },
    { id: 's-contact', title: 'Contact users for verification', detail: 'Contact the registered mobile/email to verify identity or gather missing data.', purpose: 'Verification' },
  ],
};

const keyFor = (role: ConsentScopeRole) => `bss-consents-${role}-v1`;

export const consentService = {
  list(role: ConsentScopeRole): ConsentRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(keyFor(role));
      if (raw) return JSON.parse(raw) as ConsentRecord[];
    } catch { /* ignore */ }
    const seeded = SEEDS[role].map(seed => ({ ...seed, grantedAt: new Date().toISOString(), status: 'given' as ConsentStatus, revocable: seed.revocable !== false }));
    this.persist(role, seeded);
    return seeded;
  },
  persist(role: ConsentScopeRole, records: ConsentRecord[]) {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(keyFor(role), JSON.stringify(records)); } catch { /* storage blocked */ }
  },
  revoke(role: ConsentScopeRole, id: string) {
    const records = this.list(role).map(record => record.id === id && record.status === 'given' ? { ...record, status: 'revoked' as ConsentStatus, revokedAt: new Date().toISOString() } : record);
    this.persist(role, records);
    return records;
  },
  grant(role: ConsentScopeRole, id: string) {
    const records = this.list(role).map(record => record.id === id ? { ...record, status: 'given' as ConsentStatus, grantedAt: new Date().toISOString(), revokedAt: undefined } : record);
    this.persist(role, records);
    return records;
  },
  reset(role: ConsentScopeRole) {
    const records = SEEDS[role].map(seed => ({ ...seed, grantedAt: new Date().toISOString(), status: 'given' as ConsentStatus, revocable: seed.revocable !== false }));
    this.persist(role, records);
    return records;
  },
};

export function consentDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
