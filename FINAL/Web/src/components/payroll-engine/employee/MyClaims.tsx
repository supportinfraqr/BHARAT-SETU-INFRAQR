"use client";

/**
 * My Claims (worker self-service). Legacy endpoints:
 *   GET  employee/myClaimsSummary, employee/reimbursementHeads, employee/dashboard (monthly head balances)
 *   POST employee/submitClaim (multipart: items JSON, comments, proofFile[i] per line, attachments[])
 *   GET  reimbursement/:ownId, allClaims/:ownId, flexiblePlan/:ownId ; POST flexiblePlan/:ownId, taxDeclaration/:ownId
 */

import { useMemo, useState } from 'react';
import { Paperclip, Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import {
  Async, Badge, Btn, Empty, Field, FileInput, Kpi, Modal, NumberInput, Section, Select, Tabs, TextInput,
  fmtDate, money, useAction, useLoad, type Notify,
} from '../ui';
import {
  ClaimDetail, FileLink, claimTitle, idOf,
  type ClaimStats, type ClaimsDoc, type FlexiblePlan, type ReimbursementClaim, type ReimbursementHead,
} from '../modules/Claims/shared';
import { AddDeclarationModal, AddFlexiblePlanModal } from '../modules/Claims';

type Summary = { reimbursements: ReimbursementClaim[]; stats: ClaimStats };
type HeadBalance = { headId: string; headName: string; headCode: string; maxLimit: number; claimed: number; approved: number; utilized: number; balance: number; limitPeriod: string; monthKey: string };
type DashboardClaims = { claimsAndReimbursements?: { balanceAvailable: number; reimbursementHeads: HeadBalance[]; claimMonthKey: string | null } };

export default function MyClaims({ ctx, notify }: ModuleProps) {
  const me = ctx.employee?._id ?? '';
  const [tab, setTab] = useState('claims');
  const [nonce, setNonce] = useState(0);
  const summary = useLoad(() => pe.get<Summary>('employee/myClaimsSummary'), [nonce]);
  const raw = useLoad(() => pe.get<ReimbursementClaim[]>(`reimbursement/${me}`).catch(() => [] as ReimbursementClaim[]), [me, nonce]);
  const heads = useLoad(() => pe.get<ReimbursementHead[]>('employee/reimbursementHeads'), []);
  const balances = useLoad(() => pe.get<DashboardClaims>('employee/dashboard').then(d => d.claimsAndReimbursements ?? null).catch(() => null), [nonce]);
  const [submitting, setSubmitting] = useState(false);
  const stats = summary.data?.stats;
  const refresh = () => setNonce(n => n + 1);

  return <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi label="Claims" value={stats?.total ?? '—'} sub={`${stats?.pending ?? 0} pending`} />
      <Kpi label="Approved" value={stats?.approved ?? '—'} sub={`${stats?.rejected ?? 0} rejected`} tone="text-green-700" />
      <Kpi label="Total claimed" value={money(stats?.totalClaimed ?? 0)} />
      <Kpi label="Total approved" value={money(stats?.totalApproved ?? 0)} tone="text-green-700" />
    </div>

    <Btn className="w-full sm:w-auto h-11" onClick={() => setSubmitting(true)} disabled={!(heads.data ?? []).length}><Plus size={16} />New claim</Btn>
    {heads.data && heads.data.length === 0 && <p className="text-xs text-gray-500">Your employer has not set up any reimbursement heads yet, so claims cannot be submitted.</p>}

    <Tabs active={tab} onChange={setTab} tabs={[{ key: 'claims', label: 'My claims' }, { key: 'heads', label: 'Limits' }, { key: 'flexible', label: 'Flexible benefits' }, { key: 'declarations', label: 'Declarations' }]} />
    {tab === 'claims' && <ClaimHistory summary={summary} raw={raw.data ?? []} />}
    {tab === 'heads' && <HeadLimits heads={heads} balances={balances.data?.reimbursementHeads ?? []} monthKey={balances.data?.claimMonthKey ?? null} available={balances.data?.balanceAvailable} />}
    {tab === 'flexible' && <MyFlexible employeeId={me} notify={notify} />}
    {tab === 'declarations' && <MyDeclarations employeeId={me} notify={notify} nonce={nonce} />}

    {submitting && <SubmitClaimModal heads={heads.data ?? []} balances={balances.data?.reimbursementHeads ?? []} notify={notify}
      onClose={() => setSubmitting(false)} onDone={() => { setSubmitting(false); refresh(); }} />}
  </div>;
}

function ClaimHistory({ summary, raw }: { summary: ReturnType<typeof useLoad<Summary>>; raw: ReimbursementClaim[] }) {
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<ReimbursementClaim | null>(null);
  const paid = useMemo(() => new Map(raw.map(r => [idOf(r), r.includedInPayrollId ?? null])), [raw]);
  return <Section title="Claim history" right={<Select aria-label="Filter by status" className="!w-36" value={status} onChange={setStatus}
    options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />}>
    <Async state={summary}>{data => {
      const rows = [...data.reimbursements].filter(r => !status || r.status === status)
        .sort((a, b) => new Date(b.submittedOn || b.claimDate || 0).getTime() - new Date(a.submittedOn || a.claimDate || 0).getTime());
      if (!rows.length) return <Empty title={status ? `No ${status} claims` : 'No claims yet'} text="Tap “New claim” to submit a bill for reimbursement." />;
      return <ul className="divide-y divide-gray-100">
        {rows.map(r => { const inPayroll = paid.get(idOf(r)); return <li key={idOf(r)}>
          <button type="button" onClick={() => setDetail({ ...r, includedInPayrollId: inPayroll })} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{claimTitle(r)}</p>
              <p className="text-[11px] text-gray-500">{r.claimNo || '—'} · {fmtDate(r.claimDate)}{r.billNo ? ` · Bill ${r.billNo}` : ''}</p>
              {(r.proofUrl || (r.attachmentUrls ?? []).length > 0) && <p className="text-[11px] text-gray-400 inline-flex items-center gap-1 mt-0.5"><Paperclip size={11} />{(r.proofUrl ? 1 : 0) + (r.attachmentUrls ?? []).length} file(s)</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900">{money(r.claimedAmount)}</p>
              {r.status === 'approved' && <p className="text-[11px] text-green-700">Approved {money(r.approvedAmount)}</p>}
              <div className="mt-1 flex justify-end gap-1"><Badge status={r.status} />{inPayroll && <Badge status="paid">Paid</Badge>}</div>
            </div>
          </button>
        </li>; })}
      </ul>;
    }}</Async>
    {detail && <Modal title={`Claim ${detail.claimNo || ''}`} subtitle={claimTitle(detail)} onClose={() => setDetail(null)}><ClaimDetail claim={detail} /></Modal>}
  </Section>;
}

function HeadLimits({ heads, balances, monthKey, available }: { heads: ReturnType<typeof useLoad<ReimbursementHead[]>>; balances: HeadBalance[]; monthKey: string | null; available?: number }) {
  return <Section title="Reimbursement heads" subtitle={monthKey ? `Monthly limits for ${monthKey}. Pending and approved claims count toward the limit.` : 'Heads you can claim against.'}
    right={available !== undefined ? <span className="text-xs font-semibold text-green-700">Balance {money(available)}</span> : undefined}>
    <Async state={heads} empty={<Empty title="No reimbursement heads" text="Your employer has not configured any reimbursement heads." />}>{list =>
      <ul className="divide-y divide-gray-100">{list.map(h => {
        const b = balances.find(x => String(x.headId) === String(h._id));
        const pct = b && b.maxLimit > 0 ? Math.min(100, Math.round((b.utilized / b.maxLimit) * 100)) : 0;
        return <li key={h._id} className="px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-sm font-semibold text-gray-900">{h.name}</p><p className="text-[11px] text-gray-500">{[h.code, h.frequency, h.taxable === false ? 'Non-taxable' : 'Taxable'].filter(Boolean).join(' · ')}</p></div>
            <p className="text-xs text-gray-600 text-right">{h.maxLimit > 0 ? <>Limit <b>{money(h.maxLimit)}</b>/month</> : 'No limit'}</p>
          </div>
          {b && h.maxLimit > 0 && <>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${h.name} utilisation`}>
              <div className="h-full bg-[var(--color-bss-interactive-blue)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-gray-500">Used {money(b.utilized)} · Approved {money(b.approved)} · Remaining <b className="text-green-700">{money(b.balance)}</b></p>
          </>}
        </li>;
      })}</ul>}</Async>
  </Section>;
}

type Line = { key: number; headId: string; claimDate: string; claimedAmount: number; billNo: string; particulars: string; description: string; proof: File | null };
let lineSeq = 0;
const newLine = (headId = ''): Line => ({ key: ++lineSeq, headId, claimDate: new Date().toISOString().slice(0, 10), claimedAmount: 0, billNo: '', particulars: '', description: '', proof: null });

function SubmitClaimModal({ heads, balances, notify, onClose, onDone }: { heads: ReimbursementHead[]; balances: HeadBalance[]; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [lines, setLines] = useState<Line[]>(() => [newLine(heads.length === 1 ? heads[0]._id : '')]);
  const [comments, setComments] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const { busy, run } = useAction(notify);
  const patch = (key: number, p: Partial<Line>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...p } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.claimedAmount) || 0), 0);

  const submit = async () => {
    for (const [i, l] of lines.entries()) {
      if (!l.headId) { notify(`Line ${i + 1}: choose a reimbursement head`, 'error'); return; }
      if (!(Number(l.claimedAmount) > 0)) { notify(`Line ${i + 1}: amount must be greater than 0`, 'error'); return; }
    }
    // The backend pairs proofFile[i] with items[i], so lines that carry a proof go first.
    const ordered = [...lines.filter(l => l.proof), ...lines.filter(l => !l.proof)];
    const form = new FormData();
    form.append('items', JSON.stringify(ordered.map(l => ({ headId: l.headId, claimDate: l.claimDate, claimedAmount: l.claimedAmount, billNo: l.billNo, particulars: l.particulars, description: l.description }))));
    form.append('comments', comments);
    for (const l of ordered) if (l.proof) form.append('proofFile', l.proof);
    for (const f of attachments) form.append('attachments', f);
    const out = await run(async () => { const env = await pe.upload<{ count: number }>('employee/submitClaim', form); notify(env.message || 'Claim submitted successfully', 'success'); return env; });
    if (out !== undefined) onDone();
  };

  return <Modal title="New reimbursement claim" subtitle="Add one line per bill. Each line can carry its own bill photo / PDF." onClose={onClose} width="max-w-2xl"
    footer={<div className="w-full flex items-center justify-between gap-2"><span className="text-xs text-gray-600">Total <b>{money(total)}</b></span>
      <div className="flex gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} onClick={() => void submit()}>Submit</Btn></div></div>}>
    <div className="space-y-4">
      {lines.map((l, i) => {
        const head = heads.find(h => h._id === l.headId);
        const bal = balances.find(b => String(b.headId) === l.headId);
        return <fieldset key={l.key} className="rounded-xl border border-gray-200 p-3 space-y-3">
          <legend className="px-1 text-xs font-semibold text-gray-600">Bill {i + 1}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Reimbursement head *" hint={head ? (head.maxLimit > 0 ? `Limit ${money(head.maxLimit)}/month${bal ? ` · remaining this month ${money(bal.balance)}` : ''}` : 'No monthly limit') : undefined}>
              <Select value={l.headId} onChange={v => patch(l.key, { headId: v })} placeholder="Select head" options={heads.map(h => ({ value: h._id, label: h.name }))} />
            </Field>
            <Field label="Bill date *"><TextInput type="date" value={l.claimDate} max={new Date().toISOString().slice(0, 10)} onChange={v => patch(l.key, { claimDate: v })} /></Field>
            <Field label="Amount (₹) *"><NumberInput min={0} inputMode="decimal" value={l.claimedAmount || ''} onChange={v => patch(l.key, { claimedAmount: v })} /></Field>
            <Field label="Bill / invoice no."><TextInput value={l.billNo} onChange={v => patch(l.key, { billNo: v })} /></Field>
            <Field label="Particulars" className="sm:col-span-2"><TextInput value={l.particulars} onChange={v => patch(l.key, { particulars: v })} placeholder="e.g. Taxi to client site" /></Field>
            <Field label="Description" className="sm:col-span-2"><TextInput value={l.description} onChange={v => patch(l.key, { description: v })} /></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileInput accept="image/*,application/pdf" label={l.proof ? 'Change bill' : 'Attach bill'} onFiles={f => patch(l.key, { proof: f[0] ?? null })} />
              {l.proof && <span className="text-[11px] text-gray-600 truncate max-w-[10rem]">{l.proof.name}</span>}
              {l.proof && <button type="button" className="text-[11px] text-red-600" onClick={() => patch(l.key, { proof: null })}>Remove</button>}
            </div>
            {lines.length > 1 && <Btn variant="ghost" className="!text-red-600" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))}><Trash2 size={14} />Remove line</Btn>}
          </div>
        </fieldset>;
      })}
      <Btn variant="secondary" onClick={() => setLines(ls => [...ls, newLine()])} disabled={lines.length >= 50}><Plus size={14} />Add another bill</Btn>
      <Field label="Comments for approver"><textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={comments} onChange={e => setComments(e.target.value)} /></Field>
      <div className="space-y-2">
        <FileInput multiple accept="image/*,application/pdf" label="Add supporting documents" onFiles={f => setAttachments(a => [...a, ...f])} />
        {attachments.length > 0 && <ul className="text-[11px] text-gray-600 space-y-1">{attachments.map((f, i) => <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
          <span className="truncate">{f.name}</span><button type="button" className="text-red-600" onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}>Remove</button></li>)}</ul>}
        <p className="text-[11px] text-gray-400">Supporting documents are attached to every line of this claim.</p>
      </div>
    </div>
  </Modal>;
}

function MyFlexible({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const state = useLoad(() => pe.get<FlexiblePlan[]>(`flexiblePlan/${employeeId}`), [employeeId]);
  const [adding, setAdding] = useState(false);
  return <Section title="Flexible benefit plan" subtitle="Benefit components you have opted for and their approval status." right={<Btn variant="secondary" onClick={() => setAdding(true)}><Plus size={14} />Request</Btn>}>
    <Async state={state} empty={<Empty title="No flexible benefits yet" text="Request a benefit component (e.g. meal vouchers, fuel). HR approves it." />}>{rows =>
      <ul className="divide-y divide-gray-100">{rows.map(p => <li key={idOf(p)} className="px-4 py-3 flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-gray-900">{p.componentName}</p><p className="text-[11px] text-gray-500">{p.month || '—'}</p></div>
        <div className="text-right"><p className="text-sm font-bold">{money(p.amount)}</p><Badge status={p.status} /></div>
      </li>)}</ul>}</Async>
    {adding && <AddFlexiblePlanModal employeeId={employeeId} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
  </Section>;
}

function MyDeclarations({ employeeId, notify, nonce }: { employeeId: string; notify: Notify; nonce: number }) {
  const state = useLoad(() => pe.get<ClaimsDoc>(`allClaims/${employeeId}`), [employeeId, nonce]);
  const [adding, setAdding] = useState(false);
  return <Section title="Section-wise declarations & proofs" subtitle="For your full investment declaration used in TDS, open Tax Declaration." right={<Btn variant="secondary" onClick={() => setAdding(true)}><Plus size={14} />Declare</Btn>}>
    <Async state={state}>{doc => {
      const decl = doc.incomeTaxDeclarations ?? [];
      const proofs = doc.investmentProofs ?? [];
      if (!decl.length && !proofs.length) return <Empty title="Nothing declared here" text="Use “Declare” to add a section-wise amount (80C, 80D…)." />;
      return <div className="divide-y divide-gray-100">
        {decl.map(d => { const ps = proofs.filter(p => p.declarationId === idOf(d)); return <div key={idOf(d)} className="px-4 py-3 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold">{d.section}</p>{d.subSection && <p className="text-[11px] text-gray-500">{d.subSection}</p>}</div>
            <div className="text-right text-xs"><p>Declared <b>{money(d.amountDeclared)}</b></p><p className="text-green-700">Approved {money(d.amountApproved)}</p></div>
          </div>
          {ps.map(p => <div key={idOf(p)} className="flex items-center justify-between gap-2"><FileLink url={p.fileUrl} label="Proof" /><span className="flex items-center gap-1"><Badge status={p.status} />{p.verifiedBy && <span className="text-[10px] text-gray-400">by {p.verifiedBy}</span>}</span></div>)}
        </div>; })}
        {proofs.filter(p => !decl.some(d => idOf(d) === p.declarationId)).map(p => <div key={idOf(p)} className="px-4 py-3 flex items-center justify-between gap-2">
          <FileLink url={p.fileUrl} label="Proof" /><Badge status={p.status} /></div>)}
      </div>;
    }}</Async>
    {adding && <AddDeclarationModal employeeId={employeeId} notify={notify} onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
  </Section>;
}
