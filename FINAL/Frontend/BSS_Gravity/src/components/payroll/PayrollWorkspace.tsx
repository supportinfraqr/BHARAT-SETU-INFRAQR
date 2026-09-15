"use client";

import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Calculator, CheckCircle2, ClipboardCheck, FileText, Filter, History, IndianRupee, Landmark, ListChecks, Network, Settings2, ShieldCheck, TriangleAlert, Upload, UserRound, UsersRound, UserRoundCog } from 'lucide-react';
import type { ContractorPortalData, EmployerPortalData, ContractorPayrollConfig, PayrollWorkerRecord } from '@/types/portal';
import type { AdminPayrollSnapshot, PayRun, PayrollApprovalItem, PayrollLoan, PayrollRequest, SalaryRevision, FnFRequest, Form16Record, SalaryStructure, AuditEvent, PayrollWorkerRef, PayrollRole } from '@/lib/payroll/types';
import { PAYROLL_MODULES } from '@/lib/payroll/types';
import { auditEvent, standardStructure, formatInr } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';
import OverviewModule from '@/components/payroll/OverviewModule';
import WorkerPayrollModule, { ExceptionsModule, HistoryModule } from '@/components/payroll/WorkerPayrollModule';
import SetupModule from '@/components/payroll/SetupModule';
import PayRunsModule from '@/components/payroll/PayRunsModule';
import PaymentsModule from '@/components/payroll/PaymentsModule';
import ApprovalsModule from '@/components/payroll/ApprovalsModule';
import LoansModule from '@/components/payroll/LoansModule';
import StructuresModule from '@/components/payroll/StructuresModule';
import FandfModule from '@/components/payroll/FandfModule';
import { TaxModule, RequestsModule } from '@/components/payroll/TaxRequestsModule';
import { ReportsModule, AuditModule } from '@/components/payroll/ReportsAuditModule';
// Reused existing role components (retain the proven entry UIs inside the unified workspace)
import ManualEntry from '@/components/contractor/payroll/ManualEntry';
import BulkUpload from '@/components/contractor/payroll/BulkUpload';
import EmployerManualEntry from '@/components/employer/payroll/EmployerManualEntry';
import EmployerBulkUpload from '@/components/employer/payroll/EmployerBulkUpload';
import DistributionView from '@/components/employer/payroll/DistributionView';

const TAB_ICONS: Record<string, React.ComponentType<{ size?: number }>> = { overview: Calculator, workerPayroll: ListChecks, setup: Settings2, runs: History, manual: UserRound, bulk: Upload, distribution: Network, payments: Banknote, approvals: ClipboardCheck, loans: Landmark, structures: FileText, fandf: ShieldCheck, form16: FileText, requests: UserRoundCog, exceptions: TriangleAlert, history: History, reports: IndianRupee, audit: ShieldCheck };

type WorkspacePortal = ContractorPortalData | EmployerPortalData | AdminPayrollSnapshot;
type Props = { role: PayrollRole; portal: WorkspacePortal };

export default function PayrollWorkspace({ role, portal }: Props) {
  const config: ContractorPayrollConfig = (portal as { payroll: { config: ContractorPayrollConfig } }).payroll.config;
  const initialRecords = (portal as { payroll: { records: PayrollWorkerRecord[] } }).payroll.records;

  const actor = role === 'Employer' ? (portal as EmployerPortalData).identity.name : role === 'Contractor' ? (portal as ContractorPortalData).identity.name : 'BSS Admin';
  const orgName = role === 'Employer' ? (portal as EmployerPortalData).identity.company : role === 'Contractor' ? (portal as ContractorPortalData).identity.company : 'BSS Admin — system-wide';
  const orgId = role === 'Employer' ? (portal as EmployerPortalData).identity.bssId : role === 'Contractor' ? (portal as ContractorPortalData).identity.bssId : 'BSSAD2026';

  const [tab, setTab] = useState('overview');
  const [records, setRecords] = useState<PayrollWorkerRecord[]>(initialRecords);
  const [employerFilter, setEmployerFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const [payments, setPayments] = useState<Record<string, import('@/lib/payroll/types').PaymentInfo>>({});
  const [runs, setRuns] = useState<PayRun[]>([]);
  const [approvals, setApprovals] = useState<PayrollApprovalItem[]>([
    { id: 'APR-SR-0422', category: 'Salary Revision Approval', reference: 'SR-2026-0422', worker: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Mumbai Metro Line 3', requestedBy: 'HR — Ananya Mehta', requestedOn: '2026-08-20T10:00:00+05:30', amount: 4000, status: 'Pending', remarks: 'Annual revision effective September 2026', history: [{ by: 'HR — Ananya Mehta', action: 'Requested salary revision', at: '2026-08-20T10:00:00+05:30' }] },
    { id: 'APR-CLM-0191', category: 'Claims', reference: 'CLM-2026-0191', worker: 'Suresh Patel', workerId: 'BSS892199230003', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', site: 'Coastal Road Project', requestedBy: 'Worker (self)', requestedOn: '2026-08-25T09:00:00+05:30', amount: 1500, status: 'Pending', remarks: 'Medical reimbursement claim', history: [] },
  ]);
  const [loans, setLoans] = useState<PayrollLoan[]>([
    { id: 'LOAN-2026-0142', loanName: 'Worker Loan', worker: 'Ravi Kumar', workerId: 'BSS892199210001', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', amount: 20000, repaid: 5000, disbursedOn: '2026-05-10', mode: 'Bank Transfer', account: 'Primary account', reference: 'UTR-HDFC2605100142', reason: 'Family medical expense', status: 'Active', repayments: [{ id: 'REP-1', amount: 2500, date: '2026-06-28', mode: 'Payroll', account: '—', reference: 'June 2026 payroll', by: 'Payroll system' }, { id: 'REP-2', amount: 2500, date: '2026-07-28', mode: 'Payroll', account: '—', reference: 'July 2026 payroll', by: 'Payroll system' }], createdBy: 'Payroll system' },
    { id: 'LOAN-2026-0098', loanName: 'Two-Wheeler Loan', worker: 'Amit Singh', workerId: 'BSS892199220002', employer: 'L&T Construction', contractor: 'RK Buildcon Pvt. Ltd.', amount: 12000, repaid: 12000, disbursedOn: '2026-02-15', mode: 'Cash', account: '—', reference: 'Cash voucher 221', reason: 'Commute', status: 'Closed', repayments: [{ id: 'REP-3', amount: 6000, date: '2026-05-28', mode: 'Payroll', account: '—', reference: 'May 2026 payroll', by: 'Payroll system' }, { id: 'REP-4', amount: 6000, date: '2026-06-28', mode: 'Payroll', account: '—', reference: 'June 2026 payroll', by: 'Payroll system' }], createdBy: 'Payroll system' },
  ]);
  const [structures, setStructures] = useState<SalaryStructure[]>(() => [standardStructure(config)]);
  const [vpfRequests, setVpfRequests] = useState<PayrollRequest[]>([
    { id: 'VPF-2026-0411', type: 'VPF Request', worker: 'Ravi Kumar', workerId: 'BSS892199210001', contractor: 'RK Buildcon Pvt. Ltd.', employer: 'L&T Construction', site: 'Mumbai Metro Line 3', submittedDate: '2026-08-27', selectedOption: '20% of Basic', effectivePeriod: 'September 2026', status: 'Requested' },
  ]);
  const [fandf, setFandf] = useState<FnFRequest[]>([]);
  const [form16, setForm16] = useState<Form16Record[]>(() => initialRecords.filter((r, i, a) => a.findIndex(x => x.workerId === r.workerId) === i).map(r => ({ workerId: r.workerId, worker: r.workerName, employer: r.employer, contractor: r.contractor ?? orgName, financialYear: 'FY 2026-27', generationStatus: 'Not Generated', generatedDate: null, tds: Math.round(r.gross * 0.03), regime: 'Not Declared' })));
  const [revisions, setRevisions] = useState<SalaryRevision[]>([
    { id: 'SR-2026-0422', worker: 'Ravi Kumar', workerId: 'BSS892199210001', revisionType: 'Annual revision', effectiveFrom: '2026-09-01', payoutMonth: 'September 2026', status: 'Requested', previousCTC: 320000, revisedCTC: 360000, revisedBy: 'HR — Ananya Mehta', revisedOn: '2026-08-20' },
    { id: 'SR-2026-0398', worker: 'Deepak Pawar', workerId: 'BSS892199270007', revisionType: 'Skill-based increment', effectiveFrom: '2026-07-01', payoutMonth: 'July 2026', status: 'Approved', previousCTC: 288000, revisedCTC: 300000, revisedBy: 'HR — Ananya Mehta', revisedOn: '2026-06-28' },
  ]);
  const [audit, setAudit] = useState<AuditEvent[]>(() => [{ id: `AUD-${Date.now().toString().slice(-7)}`, timestamp: new Date().toISOString(), actor: actor, actorRole: role, action: 'Accessed', entity: 'Payroll workspace', reference: '—', oldValue: null, newValue: 'Payroll module opened', worker: '—', employer: '—', contractor: '—', period: '—', reason: null }]);

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const logAudit = useCallback((event: AuditEvent) => setAudit(cur => [event, ...cur]), []);

  const { employers, contractors, sites, workers } = useMemo(() => buildScope(role, portal, orgName), [role, portal, orgName]);

  const visibleRecords = useCallback(() => records.filter(r => (!employerFilter || r.employer === employerFilter) && (!contractorFilter || r.contractor === contractorFilter) && (!siteFilter || r.site === siteFilter)), [records, employerFilter, contractorFilter, siteFilter]);

  const store: PayrollStore = {
    role, roleLabel: role === 'Admin' ? 'BSS Admin' : role, actor, orgName, orgId, period: 'August 2026', config,
    employers, contractors, sites, workers,
    employerFilter, contractorFilter, siteFilter, setEmployerFilter, setContractorFilter, setSiteFilter,
    visibleRecords,
    records, addRecords: (rows) => { setRecords(cur => [...rows, ...cur]); }, updateRecord: (id, patch) => setRecords(cur => cur.map(r => r.id === id ? { ...r, ...patch } : r)),
    payments, setPayment: (recordId, info) => setPayments(cur => ({ ...cur, [recordId]: info })),
    runs, addRun: (run) => setRuns(cur => [run, ...cur]), setRunStatus: (id, status, by) => { setRuns(cur => cur.map(r => r.id === id ? { ...r, status } : r)); setAudit(cur => [{ id: `AUD-${Date.now().toString().slice(-7)}`, timestamp: new Date().toISOString(), actor: by, actorRole: role, action: 'Updated', entity: 'Pay Run', reference: id, oldValue: '—', newValue: status, worker: '—', employer: '—', contractor: '—', period: '—', reason: null }, ...cur]); },
    approvals, addApproval: (item) => setApprovals(cur => [item, ...cur]), setApprovalStatus: (id, status, by, note) => setApprovals(cur => cur.map(a => a.id === id ? { ...a, status, remarks: note || a.remarks, history: [...a.history, { by, action: status, at: new Date().toISOString(), note: note || undefined }] } : a)),
    loans, addLoan: (l) => setLoans(cur => [l, ...cur]), repayLoan: (id, repayment) => setLoans(cur => cur.map(l => l.id === id ? { ...l, repaid: l.repaid + repayment.amount, status: l.repaid + repayment.amount >= l.amount ? 'Closed' : l.status, repayments: [...l.repayments, repayment] } : l)),
    structures, addStructure: (s) => setStructures(cur => [s, ...cur]), toggleStructureHead: (structureId, headName) => setStructures(cur => cur.map(s => s.id === structureId ? { ...s, heads: s.heads.map(h => h.name === headName ? { ...h, active: !h.active } : h) } : s)), deactivateStructure: (id) => setStructures(cur => cur.map(s => s.id === id ? { ...s, status: 'Deactivated' } : s)),
    vpfRequests, addVpf: (r) => setVpfRequests(cur => [r, ...cur]), setVpfStatus: (id, status, by) => { setVpfRequests(cur => cur.map(r => r.id === id ? { ...r, status } : r)); setAudit(cur => [{ id: `AUD-${Date.now().toString().slice(-7)}`, timestamp: new Date().toISOString(), actor: by, actorRole: role, action: status === 'Approved' ? 'Approved' : 'Rejected', entity: 'Payroll Request (VPF)', reference: id, oldValue: '—', newValue: status, worker: '—', employer: '—', contractor: '—', period: '—', reason: null }, ...cur]); },
    fandf, addFandf: (f) => setFandf(cur => [f, ...cur]), setFandfStatus: (id, status, by) => { setFandf(cur => cur.map(f => f.id === id ? { ...f, status } : f)); setAudit(cur => [{ id: `AUD-${Date.now().toString().slice(-7)}`, timestamp: new Date().toISOString(), actor: by, actorRole: role, action: 'Updated', entity: 'Full & Final Settlement', reference: id, oldValue: '—', newValue: status, worker: '—', employer: '—', contractor: '—', period: '—', reason: null }, ...cur]); },
    form16, generateForm16: (workerId, fy, by) => { setForm16(cur => cur.map(f => f.workerId === workerId && f.financialYear === fy ? { ...f, generationStatus: f.generationStatus === 'Generated' ? 'Regenerated' : 'Generated', generatedDate: new Date().toISOString() } : f)); setAudit(cur => [{ id: `AUD-${Date.now().toString().slice(-7)}`, timestamp: new Date().toISOString(), actor: by, actorRole: role, action: 'Generated', entity: 'Form 16', reference: `${workerId} · ${fy}`, oldValue: '—', newValue: 'Generated', worker: '—', employer: '—', contractor: '—', period: fy, reason: null }, ...cur]); },
    revisions, addRevision: (r) => setRevisions(cur => [r, ...cur]), setRevisionStatus: (id, status, by) => setRevisions(cur => cur.map(r => r.id === id ? { ...r, status } : r)),
    audit, logAudit, notify,
  };

  const modules = PAYROLL_MODULES.filter(m => m.roles.includes(role));
  const scoped = records.length;

  return <div className="relative space-y-6 pb-12">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-20 overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>

    {/* Role-aware header */}
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Payroll · one system, role-aware</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Payroll</h1>
        <p className="text-sm text-gray-500 mt-1">
          {role === 'Contractor' && `Contractor payroll — worker records bound to ${orgName}.`}
          {role === 'Employer' && `Employer payroll — ${orgName} workforce across sites & contractors, distributed automatically to workers.`}
          {role === 'Admin' && 'BSS Admin Payroll — supervisory oversight of the unified Worker payroll model across Employers, Sites, Contractors and Workers.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F172A] text-white"><UserRound size={12}/>{store.roleLabel}</span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{orgName}</span>
        {role === 'Admin' && <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">Demo snapshot · single source</span>}
      </div>
    </header>

    {notice && <p role="status" className={`bss-alert flex items-center gap-2 ${notice.tone === 'success' ? 'bss-alert-success' : 'bss-alert-error'}`}>{notice.tone === 'success' ? <CheckCircle2 size={15}/> : <AlertCircle size={15}/>}{notice.message}</p>}

    {/* Global filters + KPI strip */}
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5"><Filter size={13}/>Payroll scope filters</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <select value={employerFilter} onChange={e => setEmployerFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium max-w-[190px]"><option value="">Employer · All</option>{employers.map(e => <option key={e} value={e}>{e}</option>)}</select>
          {(role === 'Employer' || role === 'Admin') && <select value={contractorFilter} onChange={e => setContractorFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium max-w-[200px]"><option value="">Contractor · All</option>{contractors.map(c => <option key={c} value={c}>{c}</option>)}</select>}
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium max-w-[200px]"><option value="">Site · All</option>{sites.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
        <span className="rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1">{scoped} worker payroll record(s) in scope</span>
        <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1">{workers.length} worker(s) mapped</span>
        <span className="rounded-full bg-green-50 border border-green-100 text-green-700 px-2.5 py-1">{role === 'Employer' ? 'Automatic Worker → Site → Contractor routing' : role === 'Admin' ? 'Cross Employer / Contractor visibility' : 'Bound-worker payroll only'}</span>
      </div>
    </section>

    {/* Module tabs */}
    <div className="flex border-b overflow-x-auto">
      {modules.map(m => { const Icon = TAB_ICONS[m.id] ?? Calculator; return <button key={m.id} onClick={() => setTab(m.id)} className={`px-3.5 py-3 text-[13px] font-semibold border-b-2 whitespace-nowrap flex items-center gap-1.5 ${tab === m.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Icon size={14}/>{m.label}</button>; })}
    </div>

    {tab === 'overview' && <OverviewModule store={store} go={setTab} />}
    {tab === 'workerPayroll' && <WorkerPayrollModule store={store} />}
    {tab === 'setup' && <SetupModule store={store} />}
    {tab === 'runs' && <PayRunsModule store={store} />}
    {tab === 'manual' && role === 'Contractor' && <ManualEntryBox role={role} portal={portal as ContractorPortalData} onSave={(record) => { store.addRecords([record]); store.logAudit(auditEvent(store.actor, role, 'Created', 'Worker Payroll Record', record.id, { worker: record.workerName, employer: record.employer, contractor: record.contractor ?? orgName, period: record.period, newValue: `${formatInr(record.gross)} gross` })); store.notify(`${record.workerName} · ${record.period} — record ${record.status.toLowerCase()}.`); setTab('workerPayroll'); }} />}
    {tab === 'manual' && role === 'Employer' && <ManualEntryBox role={role} portal={portal as EmployerPortalData} onSave={(record) => { store.addRecords([record]); store.logAudit(auditEvent(store.actor, role, 'Created', 'Worker Payroll Record', record.id, { worker: record.workerName, employer: record.employer, contractor: record.contractor ?? 'Unmapped', period: record.period, newValue: `${formatInr(record.gross)} gross` })); store.notify(`${record.workerName} · ${record.period} — record ${record.status.toLowerCase()}, routed to ${record.contractor ?? 'unmapped'}.`); setTab('workerPayroll'); }} />}
    {tab === 'bulk' && role === 'Contractor' && <BulkUploadBox role={role} portal={portal as ContractorPortalData} onImport={(imported) => { store.addRecords(imported); store.notify(`${imported.length} record(s) imported — review statuses in Worker Payroll.`); setTab('workerPayroll'); }} />}
    {tab === 'bulk' && role === 'Employer' && <BulkUploadBox role={role} portal={portal as EmployerPortalData} onImport={(imported) => { store.addRecords(imported); store.notify(`${imported.length} record(s) imported — review the automatic distribution.`); setTab('distribution'); }} />}
    {tab === 'distribution' && role === 'Employer' && <DistributionBox portal={portal as EmployerPortalData} records={records} />}
    {tab === 'payments' && <PaymentsModule store={store} />}
    {tab === 'approvals' && <ApprovalsModule store={store} />}
    {tab === 'loans' && <LoansModule store={store} />}
    {tab === 'structures' && <StructuresModule store={store} />}
    {tab === 'fandf' && <FandfModule store={store} />}
    {tab === 'form16' && <TaxModule store={store} />}
    {tab === 'requests' && <RequestsModule store={store} />}
    {tab === 'exceptions' && <ExceptionsModule store={store} />}
    {tab === 'history' && <HistoryModule store={store} />}
    {tab === 'reports' && <ReportsModule store={store} />}
    {tab === 'audit' && role === 'Admin' && <AuditModule store={store} />}
  </div>;
}

/* Scope derivation — role aware, always from existing BSS relationships. */
function buildScope(role: PayrollRole, portal: WorkspacePortal, orgName: string): { employers: string[]; contractors: string[]; sites: string[]; workers: PayrollWorkerRef[] } {
  const records = (portal as { payroll: { records: PayrollWorkerRecord[] } }).payroll.records;
  const sitesSet = new Set<string>(); const empSet = new Set<string>(); const conSet = new Set<string>();
  const workers: PayrollWorkerRef[] = [];

  if (role === 'Contractor') {
    const p = portal as ContractorPortalData;
    p.employers.forEach(e => empSet.add(e.name));
    p.sites.forEach(s => sitesSet.add(s.name));
    p.workers.forEach(w => workers.push({ bssId: w.bssId, name: w.name, employer: w.employer, site: w.site, contractor: orgName, designation: w.designation }));
  } else if (role === 'Employer') {
    const p = portal as EmployerPortalData;
    empSet.add(p.identity.company);
    p.sites.forEach(s => sitesSet.add(s.name));
    p.contractors.forEach(c => conSet.add(c.name));
    p.workers.forEach(w => workers.push({ bssId: w.bssId, name: w.name, employer: p.identity.company, site: w.site, contractor: w.contractor, designation: w.designation }));
  } else {
    const snap = portal as AdminPayrollSnapshot;
    snap.employers.forEach(e => empSet.add(e.name));
    snap.contractors.forEach(c => conSet.add(c.name));
    snap.sites.forEach(s => sitesSet.add(s));
    snap.workers.forEach(w => workers.push({ ...w }));
  }
  records.forEach(r => { empSet.add(r.employer); sitesSet.add(r.site); if (r.contractor) conSet.add(r.contractor); });
  return { employers: [...empSet].filter(Boolean).sort(), contractors: [...conSet].filter(Boolean).sort(), sites: [...sitesSet].filter(Boolean).sort(), workers };
}

/* Reuse of existing role entry components (manual entry / bulk upload / distribution) inside the unified workspace. */
function ManualEntryBox({ role, portal, onSave }: { role: 'Contractor' | 'Employer'; portal: ContractorPortalData | EmployerPortalData; onSave: (record: PayrollWorkerRecord) => void }) {
  if (role === 'Contractor') return <ManualEntry portal={portal as ContractorPortalData} onSave={onSave} />;
  return <EmployerManualEntry portal={portal as EmployerPortalData} onSave={onSave} />;
}
function BulkUploadBox({ role, portal, onImport }: { role: 'Contractor' | 'Employer'; portal: ContractorPortalData | EmployerPortalData; onImport: (r: PayrollWorkerRecord[]) => void }) {
  if (role === 'Contractor') return <BulkUpload portal={portal as ContractorPortalData} onImport={onImport} />;
  return <EmployerBulkUpload portal={portal as EmployerPortalData} onImport={onImport} />;
}
function DistributionBox({ portal, records }: { portal: EmployerPortalData; records: PayrollWorkerRecord[] }) {
  return <DistributionView portal={{ ...portal, payroll: { ...portal.payroll, records } }} />;
}
