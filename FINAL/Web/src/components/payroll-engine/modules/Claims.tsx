"use client";

/**
 * Claims & Declarations (HR) — legacy controller/payroll/claimsDeclaration.js
 * (per-employee flexible benefits, reimbursements, IT declarations, investment
 * proofs, allClaims) and employeePayroll.getAllClaimsSummary (org-wide queue).
 */

import { useState } from 'react';
import { Check, Plus, RotateCcw, X } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollEmployee } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, DataTable, Empty, EmployeePicker, Field, FormGrid, Kpi, KpiGrid, Modal, NumberInput,
  PeriodPicker, Section, Select, Tabs, TextInput, MONTHS, fmtDate, fmtDateTime, money, useAction, useEmployees, useLoad,
  type Notify,
} from '../ui';
import {
  ClaimAttachments, ClaimDetail, FileLink, TAX_SECTIONS, claimTitle, idOf,
  type ClaimStats, type ClaimsDoc, type FlexiblePlan, type InvestmentProof, type ReimbursementClaim, type ReimbursementHead, type TaxDeclarationLine,
} from './Claims/shared';

type QueueData = { reimbursements: ReimbursementClaim[]; pagination: { total: number; totalPages: number; currentPage: number; limit: number }; stats: ClaimStats };
type SalaryComponentsData = { components: Record<'earnings' | 'deductions' | 'benefits' | 'reimbursements', Array<{ _id: string; name: string; code?: string; status?: string; maxLimit?: number; frequency?: string; taxable?: boolean }>> };

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }];

export default function Claims({ ctx, notify, params }: ModuleProps) {
  const [tab, setTab] = useState(params.employeeId ? 'employee' : 'queue');
  const [employeeId, setEmployeeId] = useState(params.employeeId ?? '');
  const employees = useEmployees();
  return <div className="space-y-4">
    <Tabs active={tab} onChange={setTab} tabs={[{ key: 'queue', label: 'Claims queue (all employees)' }, { key: 'employee', label: 'Employee claims & declarations' }]} />
    {tab === 'queue'
      ? <ClaimsQueue notify={notify} employees={employees.data ?? []} onOpenEmployee={id => { setEmployeeId(id); setTab('employee'); }} />
      : <Section title="Employee claims & declarations" subtitle={ctx.organization?.name}
        right={<div className="w-72"><EmployeePicker value={employeeId} onChange={setEmployeeId} employees={employees.data ?? []} /></div>}>
        {employeeId ? <EmployeeClaims key={employeeId} employeeId={employeeId} notify={notify} />
          : <Empty title="Select an employee" text="Pick an employee to manage their flexible benefits, reimbursements, tax declarations and investment proofs." />}
      </Section>}
  </div>;
}

// ---------------------------------------------------------------------------
// Org-wide queue — GET employee/getAllClaimsSummary
// ---------------------------------------------------------------------------

function ClaimsQueue({ notify, employees, onOpenEmployee }: { notify: Notify; employees: PayrollEmployee[]; onOpenEmployee: (id: string) => void }) {
  const [filters, setFilters] = useState({ status: 'pending', search: '', employeeId: '', fromDate: '', toDate: '', limit: 20 });
  const [page, setPage] = useState(1);
  const state = useLoad(() => pe.get<QueueData>('employee/getAllClaimsSummary', { ...filters, page }), [filters, page]);
  const [detail, setDetail] = useState<ReimbursementClaim | null>(null);
  const [action, setAction] = useState<{ claim: ReimbursementClaim; status: 'approved' | 'rejected' | 'pending' } | null>(null);
  const set = (patch: Partial<typeof filters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  const stats = state.data?.stats;
  const pg = state.data?.pagination;

  return <div className="space-y-4">
    <KpiGrid>
      <Kpi label="Claims (filtered)" value={stats?.total ?? '—'} sub={`${stats?.approved ?? 0} approved · ${stats?.rejected ?? 0} rejected`} />
      <Kpi label="Pending" value={stats?.pending ?? '—'} tone="text-orange-600" />
      <Kpi label="Total claimed" value={money(stats?.totalClaimed)} />
      <Kpi label="Total approved" value={money(stats?.totalApproved)} tone="text-green-700" />
    </KpiGrid>
    <Section title="Reimbursement claims" subtitle="All employees' reimbursement claims, latest first. Approve or reject each line."
      right={<Btn variant="secondary" onClick={state.reload}>Refresh</Btn>}>
      <div className="p-4 border-b border-gray-100">
        <FormGrid cols={4}>
          <Field label="Status"><Select value={filters.status} onChange={v => set({ status: v })} options={STATUS_OPTIONS} /></Field>
          <Field label="Employee"><EmployeePicker value={filters.employeeId} onChange={v => set({ employeeId: v })} employees={employees} placeholder="All employees" /></Field>
          <Field label="Search" hint="Claim no., bill no., head, type, employee"><TextInput value={filters.search} onChange={v => set({ search: v })} placeholder="Search…" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From"><TextInput type="date" value={filters.fromDate} onChange={v => set({ fromDate: v })} /></Field>
            <Field label="To"><TextInput type="date" value={filters.toDate} onChange={v => set({ toDate: v })} /></Field>
          </div>
        </FormGrid>
      </div>
      <Async state={state}>{data => <>
        <DataTable rows={data.reimbursements} rowKey={r => idOf(r)} empty="No claims match these filters" onRowClick={setDetail}
          columns={[
            { key: 'claimNo', label: 'Claim', render: r => <div><p className="font-semibold">{r.claimNo || '—'}</p><p className="text-[11px] text-gray-400">{fmtDateTime(r.submittedOn)}</p></div> },
            { key: 'employee', label: 'Employee', render: r => <div><p className="font-semibold">{r.employee?.fullName || '—'}</p><p className="text-[11px] text-gray-400">{r.employee?.employeeCode || r.employee?.email}</p></div> },
            { key: 'head', label: 'Head / type', render: r => <div><p>{claimTitle(r)}</p><p className="text-[11px] text-gray-400">{r.type}</p></div> },
            { key: 'claimDate', label: 'Bill date', render: r => fmtDate(r.claimDate) },
            { key: 'billNo', label: 'Bill no.', render: r => r.billNo || '—' },
            { key: 'claimedAmount', label: 'Claimed', align: 'right', render: r => money(r.claimedAmount) },
            { key: 'approvedAmount', label: 'Approved', align: 'right', render: r => money(r.approvedAmount) },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
            { key: 'files', label: 'Proof', render: r => <div onClick={e => e.stopPropagation()}><ClaimAttachments claim={r} /></div> },
            { key: 'actions', label: '', render: r => <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {r.status !== 'approved' && <Btn variant="ghost" onClick={() => setAction({ claim: r, status: 'approved' })} aria-label="Approve"><Check size={14} />Approve</Btn>}
              {r.status !== 'rejected' && <Btn variant="ghost" className="!text-red-600" onClick={() => setAction({ claim: r, status: 'rejected' })} aria-label="Reject"><X size={14} />Reject</Btn>}
              {r.status !== 'pending' && <Btn variant="ghost" onClick={() => setAction({ claim: r, status: 'pending' })} aria-label="Reset to pending"><RotateCcw size={14} /></Btn>}
            </div> },
          ]} />
        {pg && pg.total > 0 && <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>{pg.total} claims · page {pg.currentPage} of {pg.totalPages}</span>
          <div className="flex items-center gap-2">
            <Select aria-label="Rows per page" className="!w-24" value={String(filters.limit)} onChange={v => set({ limit: Number(v) })} options={['10', '20', '50', '100']} />
            <Btn variant="secondary" disabled={pg.currentPage <= 1} onClick={() => setPage(p => p - 1)}>Previous</Btn>
            <Btn variant="secondary" disabled={pg.currentPage >= pg.totalPages} onClick={() => setPage(p => p + 1)}>Next</Btn>
          </div>
        </div>}
      </>}</Async>
    </Section>
    {detail && <Modal title={`Claim ${detail.claimNo || ''}`} subtitle={claimTitle(detail)} onClose={() => setDetail(null)} footer={<>
      {detail.employee?._id && <Btn variant="secondary" onClick={() => { onOpenEmployee(String(detail.employee?._id)); setDetail(null); }}>Open employee</Btn>}
      {detail.status !== 'rejected' && <Btn variant="danger" onClick={() => { setAction({ claim: detail, status: 'rejected' }); setDetail(null); }}>Reject</Btn>}
      {detail.status !== 'approved' && <Btn onClick={() => { setAction({ claim: detail, status: 'approved' }); setDetail(null); }}>Approve</Btn>}
    </>}><ClaimDetail claim={detail} /></Modal>}
    {action && <ReimbursementStatusModal employeeId={String(action.claim.employee?._id ?? '')} claim={action.claim} initialStatus={action.status} notify={notify}
      onClose={() => setAction(null)} onDone={() => { setAction(null); state.reload(); }} />}
  </div>;
}

function ReimbursementStatusModal({ employeeId, claim, initialStatus, notify, onClose, onDone }: { employeeId: string; claim: ReimbursementClaim; initialStatus: 'approved' | 'rejected' | 'pending'; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [amount, setAmount] = useState<number>(Number(claim.approvedAmount) || Number(claim.claimedAmount) || 0);
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!employeeId) { notify('This claim is not linked to an employee', 'error'); return; }
    const body: Record<string, unknown> = { status };
    if (status === 'approved') body.approvedAmount = amount;
    if (status === 'rejected') body.approvedAmount = 0;
    const out = await run(() => pe.put(`reimbursement/${employeeId}/${idOf(claim)}/status`, body), status === 'approved' ? 'Claim approved' : status === 'rejected' ? 'Claim rejected' : 'Claim moved back to pending');
    if (out !== undefined) onDone();
  };
  return <Modal title="Update reimbursement status" subtitle={`${claim.claimNo || ''} · ${claimTitle(claim)} · claimed ${money(claim.claimedAmount)}`} onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant={status === 'rejected' ? 'danger' : 'primary'} busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <Field label="Status"><Select value={status} onChange={setStatus} options={STATUS_OPTIONS.slice(1)} /></Field>
      {status === 'approved' && <Field label="Approved amount (₹)" hint="Approved reimbursements are paid with the next payroll run.">
        <NumberInput min={0} value={amount} onChange={setAmount} />
      </Field>}
    </div>
  </Modal>;
}

// ---------------------------------------------------------------------------
// One employee — claimsDeclaration.js endpoints
// ---------------------------------------------------------------------------

function EmployeeClaims({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [tab, setTab] = useState('reimbursements');
  const all = useLoad(() => pe.get<ClaimsDoc>(`allClaims/${employeeId}`), [employeeId]);
  const doc = all.data ?? {};
  return <div className="p-4 space-y-4">
    <KpiGrid>
      <Kpi label="Reimbursements" value={doc.reimbursements?.length ?? 0} sub={`${(doc.reimbursements ?? []).filter(r => r.status === 'pending').length} pending`} />
      <Kpi label="Flexible benefit plans" value={doc.flexibleBenefitPlan?.length ?? 0} sub={`${(doc.flexibleBenefitPlan ?? []).filter(r => r.status === 'pending').length} pending`} />
      <Kpi label="Tax declarations" value={money((doc.incomeTaxDeclarations ?? []).reduce((s, d) => s + (Number(d.amountDeclared) || 0), 0))} sub={`${doc.incomeTaxDeclarations?.length ?? 0} lines declared`} />
      <Kpi label="Investment proofs" value={doc.investmentProofs?.length ?? 0} sub={`${(doc.investmentProofs ?? []).filter(r => r.status === 'pending').length} awaiting verification`} />
    </KpiGrid>
    {all.data?.updatedAt && <p className="text-[11px] text-gray-400">Claims record created {fmtDateTime(all.data.createdAt)} · last updated {fmtDateTime(all.data.updatedAt)}</p>}
    <Tabs active={tab} onChange={setTab} tabs={[
      { key: 'reimbursements', label: 'Reimbursements' }, { key: 'flexible', label: 'Flexible benefit plan' },
      { key: 'declarations', label: 'Income tax declarations' }, { key: 'proofs', label: 'Investment proofs' },
    ]} />
    {tab === 'reimbursements' && <Reimbursements employeeId={employeeId} notify={notify} onChange={all.reload} />}
    {tab === 'flexible' && <FlexiblePlans employeeId={employeeId} notify={notify} onChange={all.reload} />}
    {tab === 'declarations' && <TaxDeclarations employeeId={employeeId} notify={notify} onChange={all.reload} />}
    {tab === 'proofs' && <InvestmentProofs employeeId={employeeId} notify={notify} onChange={all.reload} declarations={doc.incomeTaxDeclarations ?? []} />}
  </div>;
}

function Reimbursements({ employeeId, notify, onChange }: { employeeId: string; notify: Notify; onChange: () => void }) {
  const state = useLoad(() => pe.get<ReimbursementClaim[]>(`reimbursement/${employeeId}`), [employeeId]);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<ReimbursementClaim | null>(null);
  const [action, setAction] = useState<{ claim: ReimbursementClaim; status: 'approved' | 'rejected' | 'pending' } | null>(null);
  const done = () => { state.reload(); onChange(); };
  return <div className="space-y-3">
    <div className="flex justify-end"><Btn onClick={() => setAdding(true)}><Plus size={14} />Submit claim on behalf</Btn></div>
    <Async state={state} empty={<Empty title="No reimbursement claims" text="Claims the employee submits from My Payroll, or that you add on their behalf, appear here." />}>{rows =>
      <DataTable rows={[...rows].reverse()} rowKey={r => idOf(r)} onRowClick={setDetail} columns={[
        { key: 'claimNo', label: 'Claim no.', render: r => r.claimNo || '—' },
        { key: 'name', label: 'Head / name', render: r => <div><p>{claimTitle(r)}</p><p className="text-[11px] text-gray-400">{r.type}</p></div> },
        { key: 'claimDate', label: 'Claim date', render: r => fmtDate(r.claimDate) },
        { key: 'billNo', label: 'Bill no.', render: r => r.billNo || '—' },
        { key: 'claimedAmount', label: 'Claimed', align: 'right', render: r => money(r.claimedAmount) },
        { key: 'approvedAmount', label: 'Approved', align: 'right', render: r => money(r.approvedAmount) },
        { key: 'status', label: 'Status', render: r => <div className="flex gap-1"><Badge status={r.status} />{r.includedInPayrollId && <Badge status="paid">Paid</Badge>}</div> },
        { key: 'files', label: 'Proof', render: r => <div onClick={e => e.stopPropagation()}><ClaimAttachments claim={r} /></div> },
        { key: 'actions', label: '', render: r => <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {r.status !== 'approved' && <Btn variant="ghost" onClick={() => setAction({ claim: r, status: 'approved' })}><Check size={14} />Approve</Btn>}
          {r.status !== 'rejected' && <Btn variant="ghost" className="!text-red-600" onClick={() => setAction({ claim: r, status: 'rejected' })}><X size={14} />Reject</Btn>}
          {r.status !== 'pending' && <Btn variant="ghost" aria-label="Reset to pending" onClick={() => setAction({ claim: r, status: 'pending' })}><RotateCcw size={14} /></Btn>}
        </div> },
      ]} />}</Async>
    {adding && <AddReimbursementModal employeeId={employeeId} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); done(); }} />}
    {detail && <Modal title={`Claim ${detail.claimNo || ''}`} onClose={() => setDetail(null)}><ClaimDetail claim={detail} /></Modal>}
    {action && <ReimbursementStatusModal employeeId={employeeId} claim={action.claim} initialStatus={action.status} notify={notify} onClose={() => setAction(null)} onDone={() => { setAction(null); done(); }} />}
  </div>;
}

function AddReimbursementModal({ employeeId, notify, onClose, onDone }: { employeeId: string; notify: Notify; onClose: () => void; onDone: () => void }) {
  const heads = useLoad(() => pe.get<SalaryComponentsData>('salaryComponents').then(d => (d.components?.reimbursements ?? []).filter(c => (c.status ?? 'active') === 'active') as ReimbursementHead[]).catch(() => [] as ReimbursementHead[]), []);
  const [form, setForm] = useState({ name: '', type: '', claimDate: new Date().toISOString().slice(0, 10), claimedAmount: 0, proofUrl: '' });
  const { busy, run } = useAction(notify);
  const pickHead = (id: string) => { const h = (heads.data ?? []).find(x => x._id === id); if (h) setForm(f => ({ ...f, name: h.name, type: h.code || h.name })); };
  const submit = async () => {
    if (!form.name || !form.type || !form.claimedAmount) { notify('Name, type, and claimed amount are required', 'error'); return; }
    const out = await run(() => pe.post(`reimbursement/${employeeId}`, form), 'Reimbursement claim submitted');
    if (out !== undefined) onDone();
  };
  return <Modal title="Submit reimbursement on behalf of employee" onClose={onClose}
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Submit claim</Btn></>}>
    <FormGrid cols={2}>
      {(heads.data ?? []).length > 0 && <Field label="Reimbursement head (prefills name & type)" className="md:col-span-2">
        <Select value="" onChange={pickHead} placeholder="Choose a configured head…" options={(heads.data ?? []).map(h => ({ value: h._id, label: `${h.name}${h.maxLimit ? ` · max ${money(h.maxLimit)}/month` : ''}` }))} />
      </Field>}
      <Field label="Claim name *"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Medical" /></Field>
      <Field label="Type *"><TextInput value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} placeholder="e.g. medical, travel, mobile" /></Field>
      <Field label="Claim date"><TextInput type="date" value={form.claimDate} onChange={v => setForm(f => ({ ...f, claimDate: v }))} /></Field>
      <Field label="Claimed amount (₹) *"><NumberInput min={0} value={form.claimedAmount} onChange={v => setForm(f => ({ ...f, claimedAmount: v }))} /></Field>
      <Field label="Proof URL" hint="Link to the bill / proof document (optional)." className="md:col-span-2"><TextInput value={form.proofUrl} onChange={v => setForm(f => ({ ...f, proofUrl: v }))} placeholder="https://…" /></Field>
    </FormGrid>
  </Modal>;
}

function FlexiblePlans({ employeeId, notify, onChange }: { employeeId: string; notify: Notify; onChange: () => void }) {
  const state = useLoad(() => pe.get<FlexiblePlan[]>(`flexiblePlan/${employeeId}`), [employeeId]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FlexiblePlan | null>(null);
  const done = () => { state.reload(); onChange(); };
  return <div className="space-y-3">
    <div className="flex justify-end"><Btn onClick={() => setAdding(true)}><Plus size={14} />Add plan component</Btn></div>
    <Async state={state} empty={<Empty title="No flexible benefit plan" text="Add benefit components (e.g. meal vouchers, fuel, telephone) the employee has opted for." />}>{rows =>
      <DataTable rows={rows} rowKey={r => idOf(r)} columns={[
        { key: 'componentName', label: 'Component' },
        { key: 'month', label: 'Month', render: r => r.month || '—' },
        { key: 'amount', label: 'Amount', align: 'right', render: r => money(r.amount) },
        { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
        { key: 'actions', label: '', render: r => <Btn variant="ghost" onClick={() => setEditing(r)}>Review</Btn> },
      ]} />}</Async>
    {adding && <AddFlexiblePlanModal employeeId={employeeId} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); done(); }} />}
    {editing && <FlexStatusModal employeeId={employeeId} plan={editing} notify={notify} onClose={() => setEditing(null)} onDone={() => { setEditing(null); done(); }} />}
  </div>;
}

export function AddFlexiblePlanModal({ employeeId, notify, onClose, onDone }: { employeeId: string; notify: Notify; onClose: () => void; onDone: () => void }) {
  const comps = useLoad(() => pe.get<SalaryComponentsData>('salaryComponents').then(d => [...(d.components?.benefits ?? []), ...(d.components?.reimbursements ?? [])].filter(c => (c.status ?? 'active') === 'active')).catch(() => []), []);
  const now = new Date();
  const [period, setPeriod] = useState({ month: MONTHS[now.getMonth()] as string, year: now.getFullYear() });
  const [form, setForm] = useState({ componentId: '', componentName: '', amount: 0 });
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!form.componentName || !form.amount) { notify('Component name and amount are required', 'error'); return; }
    const body = { ...form, componentId: form.componentId || undefined, month: `${period.month} ${period.year}` };
    const out = await run(() => pe.post(`flexiblePlan/${employeeId}`, body), 'Flexible benefit plan added');
    if (out !== undefined) onDone();
  };
  return <Modal title="Add flexible benefit component" onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Add</Btn></>}>
    <div className="space-y-3">
      {(comps.data ?? []).length > 0 && <Field label="Salary component">
        <Select value={form.componentId} placeholder="Custom (type a name below)" onChange={id => { const c = (comps.data ?? []).find(x => x._id === id); setForm(f => ({ ...f, componentId: id, componentName: c?.name ?? f.componentName })); }}
          options={(comps.data ?? []).map(c => ({ value: c._id, label: `${c.name}${c.code ? ` (${c.code})` : ''}` }))} />
      </Field>}
      <Field label="Component name *"><TextInput value={form.componentName} onChange={v => setForm(f => ({ ...f, componentName: v }))} placeholder="e.g. Meal vouchers" /></Field>
      <Field label="Amount (₹) *"><NumberInput min={0} value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} /></Field>
      <Field label="Month"><PeriodPicker month={period.month} year={period.year} onChange={(m, y) => setPeriod({ month: m, year: y })} /></Field>
    </div>
  </Modal>;
}

function FlexStatusModal({ employeeId, plan, notify, onClose, onDone }: { employeeId: string; plan: FlexiblePlan; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<string>(plan.status);
  const [amount, setAmount] = useState<number>(Number(plan.amount) || 0);
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(() => pe.put(`flexiblePlan/${employeeId}/${idOf(plan)}/status`, { status, amount }), 'Flexible plan status updated');
    if (out !== undefined) onDone();
  };
  return <Modal title="Review flexible benefit" subtitle={`${plan.componentName}${plan.month ? ` · ${plan.month}` : ''}`} onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <Field label="Status"><Select value={status} onChange={setStatus} options={STATUS_OPTIONS.slice(1)} /></Field>
      <Field label="Amount (₹)"><NumberInput min={0} value={amount} onChange={setAmount} /></Field>
    </div>
  </Modal>;
}

function TaxDeclarations({ employeeId, notify, onChange }: { employeeId: string; notify: Notify; onChange: () => void }) {
  const state = useLoad(() => pe.get<TaxDeclarationLine[]>(`taxDeclaration/${employeeId}`), [employeeId]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TaxDeclarationLine | null>(null);
  const done = () => { state.reload(); onChange(); };
  const rows = state.data ?? [];
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-500">Section-wise declared vs approved amounts. The full investment declaration used for TDS lives in TDS / Income Tax.</p>
      <Btn onClick={() => setAdding(true)}><Plus size={14} />Add declaration</Btn>
    </div>
    <Async state={state} empty={<Empty title="No income tax declarations" text="Add section-wise declarations (80C, 80D, 24(b)…) and approve amounts after verifying proofs." />}>{list =>
      <DataTable rows={list} rowKey={r => idOf(r)} columns={[
        { key: 'section', label: 'Section' },
        { key: 'subSection', label: 'Sub-section / item', render: r => r.subSection || '—' },
        { key: 'amountDeclared', label: 'Declared', align: 'right', render: r => money(r.amountDeclared) },
        { key: 'amountApproved', label: 'Approved', align: 'right', render: r => money(r.amountApproved) },
        { key: 'actions', label: '', render: r => <Btn variant="ghost" onClick={() => setEditing(r)}>Approve amount</Btn> },
      ]} footer={<tr><td className="px-3 py-2" colSpan={2}>Total</td>
        <td className="px-3 py-2 text-right">{money(rows.reduce((s, r) => s + (Number(r.amountDeclared) || 0), 0))}</td>
        <td className="px-3 py-2 text-right">{money(rows.reduce((s, r) => s + (Number(r.amountApproved) || 0), 0))}</td><td /></tr>} />}</Async>
    {adding && <AddDeclarationModal employeeId={employeeId} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); done(); }} />}
    {editing && <ApproveDeclarationModal employeeId={employeeId} line={editing} notify={notify} onClose={() => setEditing(null)} onDone={() => { setEditing(null); done(); }} />}
  </div>;
}

export function AddDeclarationModal({ employeeId, notify, onClose, onDone }: { employeeId: string; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ section: '80C', customSection: '', subSection: '', amountDeclared: 0 });
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const section = form.section === 'Other' ? form.customSection.trim() : form.section;
    if (!section || !form.amountDeclared) { notify('Section and amount declared are required', 'error'); return; }
    const out = await run(() => pe.post(`taxDeclaration/${employeeId}`, { section, subSection: form.subSection, amountDeclared: form.amountDeclared }), 'Income tax declaration saved');
    if (out !== undefined) onDone();
  };
  return <Modal title="Add income tax declaration" onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <Field label="Section *"><Select value={form.section} onChange={v => setForm(f => ({ ...f, section: v }))} options={TAX_SECTIONS} /></Field>
      {form.section === 'Other' && <Field label="Section name *"><TextInput value={form.customSection} onChange={v => setForm(f => ({ ...f, customSection: v }))} /></Field>}
      <Field label="Sub-section / item" hint="e.g. PPF, LIC premium, Self & family"><TextInput value={form.subSection} onChange={v => setForm(f => ({ ...f, subSection: v }))} /></Field>
      <Field label="Amount declared (₹) *"><NumberInput min={0} value={form.amountDeclared} onChange={v => setForm(f => ({ ...f, amountDeclared: v }))} /></Field>
    </div>
  </Modal>;
}

function ApproveDeclarationModal({ employeeId, line, notify, onClose, onDone }: { employeeId: string; line: TaxDeclarationLine; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState<number>(Number(line.amountApproved) || Number(line.amountDeclared) || 0);
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(() => pe.put(`taxDeclaration/${employeeId}/${idOf(line)}`, { amountApproved: amount }), 'Income tax declaration updated');
    if (out !== undefined) onDone();
  };
  return <Modal title="Approve declaration amount" subtitle={`${line.section}${line.subSection ? ` · ${line.subSection}` : ''} · declared ${money(line.amountDeclared)}`} onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <Field label="Amount approved (₹)"><NumberInput min={0} value={amount} onChange={setAmount} /></Field>
  </Modal>;
}

function InvestmentProofs({ employeeId, notify, onChange, declarations }: { employeeId: string; notify: Notify; onChange: () => void; declarations: TaxDeclarationLine[] }) {
  const state = useLoad(() => pe.get<InvestmentProof[]>(`investmentProof/${employeeId}`), [employeeId]);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<InvestmentProof | null>(null);
  const done = () => { state.reload(); onChange(); };
  const label = (id: string) => { const d = declarations.find(x => idOf(x) === id); return d ? `${d.section}${d.subSection ? ` · ${d.subSection}` : ''} (${money(d.amountDeclared)})` : id; };
  return <div className="space-y-3">
    <div className="flex justify-end"><Btn onClick={() => setAdding(true)} disabled={!declarations.length} title={declarations.length ? undefined : 'Add a tax declaration first'}><Plus size={14} />Add proof</Btn></div>
    <Async state={state} empty={<Empty title="No investment proofs" text={declarations.length ? 'Attach proof documents against declared sections and verify them.' : 'Add an income tax declaration first, then attach proofs against it.'} />}>{rows =>
      <DataTable rows={rows} rowKey={r => idOf(r)} columns={[
        { key: 'declarationId', label: 'Declaration', render: r => label(r.declarationId) },
        { key: 'fileUrl', label: 'Document', render: r => <FileLink url={r.fileUrl} /> },
        { key: 'verifiedBy', label: 'Verified by', render: r => r.verifiedBy || '—' },
        { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
        { key: 'actions', label: '', render: r => <Btn variant="ghost" onClick={() => setVerifying(r)}>Verify / reject</Btn> },
      ]} />}</Async>
    {adding && <AddProofModal employeeId={employeeId} declarations={declarations} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); done(); }} />}
    {verifying && <VerifyProofModal employeeId={employeeId} proof={verifying} notify={notify} onClose={() => setVerifying(null)} onDone={() => { setVerifying(null); done(); }} />}
  </div>;
}

function AddProofModal({ employeeId, declarations, notify, onClose, onDone }: { employeeId: string; declarations: TaxDeclarationLine[]; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ declarationId: declarations[0] ? idOf(declarations[0]) : '', fileUrl: '' });
  const { busy, run } = useAction(notify);
  const submit = async () => {
    if (!form.declarationId || !form.fileUrl) { notify('Declaration ID and file URL are required', 'error'); return; }
    const out = await run(() => pe.post(`investmentProof/${employeeId}`, form), 'Investment proof uploaded');
    if (out !== undefined) onDone();
  };
  return <Modal title="Add investment proof" onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <Field label="Declaration *"><Select value={form.declarationId} onChange={v => setForm(f => ({ ...f, declarationId: v }))}
        options={declarations.map(d => ({ value: idOf(d), label: `${d.section}${d.subSection ? ` · ${d.subSection}` : ''} — ${money(d.amountDeclared)}` }))} /></Field>
      <Field label="Document URL *" hint="Link to the proof document (receipt, certificate, policy)."><TextInput value={form.fileUrl} onChange={v => setForm(f => ({ ...f, fileUrl: v }))} placeholder="https://…" /></Field>
    </div>
  </Modal>;
}

function VerifyProofModal({ employeeId, proof, notify, onClose, onDone }: { employeeId: string; proof: InvestmentProof; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<string>(proof.status === 'pending' ? 'verified' : proof.status);
  const [verifiedBy, setVerifiedBy] = useState(proof.verifiedBy ?? '');
  const { busy, run } = useAction(notify);
  const submit = async () => {
    const out = await run(() => pe.put(`investmentProof/${employeeId}/${idOf(proof)}/verify`, { status, verifiedBy }), 'Investment proof updated');
    if (out !== undefined) onDone();
  };
  return <Modal title="Verify investment proof" onClose={onClose} width="max-w-md"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn variant={status === 'rejected' ? 'danger' : 'primary'} busy={busy} onClick={() => void submit()}>Save</Btn></>}>
    <div className="space-y-3">
      <FileLink url={proof.fileUrl} label="Open document" />
      <Field label="Status"><Select value={status} onChange={setStatus} options={[{ value: 'verified', label: 'Verified' }, { value: 'rejected', label: 'Rejected' }, { value: 'pending', label: 'Pending' }]} /></Field>
      <Field label="Verified by"><TextInput value={verifiedBy} onChange={setVerifiedBy} placeholder="Your name" /></Field>
    </div>
  </Modal>;
}

