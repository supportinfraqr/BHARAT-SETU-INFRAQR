"use client";
import { useState, type ReactNode } from 'react';
import { CheckCircle2, Lock, Pencil, ShieldCheck, X } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import type { ContractorWorkerComplianceStatus } from '@/types/portal';

type Details = ContractorWorkerComplianceStatus['details'];

const MEDICAL_EXAM = ['', 'Done', 'Pending', 'Expired'];
const MEDICAL_FIT = ['', 'Fit', 'Fit with Restrictions', 'Unfit', 'Pending'];
const INDUCTION = ['', 'Done', 'Pending'];
const YESNO = ['Yes', 'No'];
const INSURANCE = ['', 'Active', 'Expired', 'Pending'];
const POLICE = ['', 'Done', 'Under Process'];
const ACCOMMODATION = ['', 'Camp', 'Room', 'Self Arranged', 'Not Provided'];

export default function ContractorWorkerCompliancePage() {
  const { contractor, replaceContractor, mutate } = useContractor();
  const rows = contractor.workerCompliance ?? [];
  const [editing, setEditing] = useState<ContractorWorkerComplianceStatus | null>(null);
  const [form, setForm] = useState<Details | null>(null);
  const [verifiedTick, setVerifiedTick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function openEdit(row: ContractorWorkerComplianceStatus) { setEditing(row); setForm({ ...row.details }); setVerifiedTick(Boolean(row.contractorVerified)); setError(''); setNotice(''); }
  function set<K extends keyof Details>(key: K, value: Details[K]) { setForm(current => current ? { ...current, [key]: value } : current); }

  async function approveDoc(field: 'uanVerified' | 'esicVerified', value: boolean) {
    if (!editing) return;
    setBusy(true); setError('');
    try {
      const result = await mutate<{ data: ContractorWorkerComplianceStatus }>('worker-compliance', 'POST', { workerId: editing.workerId, [field]: value });
      replaceContractor({ ...contractor, workerCompliance: rows.map(r => r.workerId === editing.workerId ? result.data : r) });
      setEditing(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Approval could not be saved.'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!editing || !form) return;
    setBusy(true); setError('');
    try {
      const result = await mutate<{ data: ContractorWorkerComplianceStatus }>('worker-compliance', 'POST', { workerId: editing.workerId, ...form, contractorVerified: verifiedTick });
      replaceContractor({ ...contractor, workerCompliance: rows.map(r => r.workerId === editing.workerId ? result.data : r) });
      setNotice(`Compliance updated for ${editing.worker} — it now reflects on the worker's Compliance page.`);
      setEditing(null);
      setTimeout(() => setNotice(''), 5000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Compliance could not be saved.'); }
    finally { setBusy(false); }
  }

  const field = 'mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm';
  const chip = (value: string) => value === 'Done' || value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Expired' ? 'bg-bss-soft-orange text-bss-error' : 'bg-bss-soft-orange text-bss-orange';

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Master data</p>
        <h1 className="text-2xl font-bold mt-1">Welfare &amp; Safety</h1>
        <p className="text-sm text-bss-text-muted mt-1">Record Medical, Safety Kit/PPE, Safety Training, Site Induction, Insurance, Accommodation and Police Verification for your bound workers. It appears on the worker&apos;s Welfare &amp; Safety page.</p>
      </header>

      {notice && <p className="p-3 bg-bss-soft-green border border-bss-border text-bss-green rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && !editing && <p className="p-3 bg-bss-soft-orange border border-bss-border text-bss-error rounded-xl text-sm font-semibold">{error}</p>}

      <section className="bss-card bss-3d bss-scroll-rise rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-bss-bg border-b border-bss-border text-[11px] uppercase tracking-wider text-bss-text-muted"><tr><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Medical</th><th className="px-4 py-3">Health &amp; Safety</th><th className="px-4 py-3">Gate Pass</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-bss-border">
            {rows.map(row => <tr key={row.workerId} className="hover:bg-bss-bg">
              <td className="px-4 py-3"><strong className="text-bss-text-primary">{row.worker}</strong><p className="font-mono text-[10px] text-bss-text-muted mt-0.5">{row.workerId}</p></td>
              <td className="px-4 py-3 text-bss-text-secondary">{row.site || '—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.medical)}`}>{row.medical}</span></td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.healthSafety)}`}>{row.healthSafety}</span></td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.gatePass)}`}>{row.gatePass}</span></td>
              <td className="px-4 py-3"><button onClick={() => openEdit(row)} className="inline-flex items-center gap-1.5 text-bss-interactive-blue font-semibold hover:underline"><Pencil size={13}/>Update</button></td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="py-12 text-center text-bss-text-muted">No bound workers yet. Bind workers first, then record their compliance here.</td></tr>}
          </tbody>
        </table></div>
      </section>

      {editing && form && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-bss-border"><div><p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Worker compliance</p><h2 className="text-sm font-bold text-bss-text-primary mt-0.5">{editing.worker} · {editing.workerId}</h2></div><button onClick={() => setEditing(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full hover:bg-bss-bg"><X size={16}/></button></div>
          <div className="p-5 space-y-5">
            {/* Medical */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#01183A] flex items-center gap-1.5 mb-3"><ShieldCheck size={13}/>Medical</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-bss-text-secondary">Examination status<select value={form.medicalExaminationStatus} onChange={e => set('medicalExaminationStatus', e.target.value)} className={field}>{MEDICAL_EXAM.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Fitness status<select value={form.medicalFitnessStatus} onChange={e => set('medicalFitnessStatus', e.target.value)} className={field}>{MEDICAL_FIT.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Last examination<input type="date" value={form.lastMedicalExamination} onChange={e => set('lastMedicalExamination', e.target.value)} className={field}/></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Next medical due<input type="date" value={form.nextMedicalDue} onChange={e => set('nextMedicalDue', e.target.value)} className={field}/></label>
              </div>
            </div>
            {/* Health & Safety */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#01183A] mb-3">Health &amp; Safety</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-bss-text-secondary">PPE required<select value={form.ppeRequired ? 'Yes' : 'No'} onChange={e => set('ppeRequired', e.target.value === 'Yes')} className={field}>{YESNO.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Safety training completed<select value={form.safetyTrainingCompleted ? 'Yes' : 'No'} onChange={e => set('safetyTrainingCompleted', e.target.value === 'Yes')} className={field}>{YESNO.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary sm:col-span-2">PPE issued (comma-separated)<input value={form.typesOfPpeGiven} onChange={e => set('typesOfPpeGiven', e.target.value)} placeholder="Helmet, Safety shoes, Harness" className={field}/></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Site induction<select value={form.siteInductionStatus} onChange={e => set('siteInductionStatus', e.target.value)} className={field}>{INDUCTION.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Training date<input type="date" value={form.trainingDate} onChange={e => set('trainingDate', e.target.value)} className={field}/></label>
                <label className="text-xs font-semibold text-bss-text-secondary sm:col-span-2">Trainer name<input value={form.trainerName} onChange={e => set('trainerName', e.target.value)} className={field}/></label>
              </div>
            </div>
            {/* Welfare */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#01183A] mb-3">Welfare &amp; Security</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-bss-text-secondary">Insurance status<select value={form.insuranceStatus} onChange={e => set('insuranceStatus', e.target.value)} className={field}>{INSURANCE.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary">Police verification<select value={form.policeVerification} onChange={e => set('policeVerification', e.target.value)} className={field}>{POLICE.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-bss-text-secondary sm:col-span-2">Accommodation<select value={form.accommodationProvided} onChange={e => set('accommodationProvided', e.target.value)} className={field}>{ACCOMMODATION.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
              </div>
            </div>
            {/* Auto-verified (worker records) — locked, contractor cannot edit */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#01183A] mb-3 flex items-center gap-1.5"><Lock size={13}/>Auto-verified documents (worker records)</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <LockedField label="Aadhaar" value={editing.verified?.aadhaar} verified={editing.verified?.aadhaarVerified}/>
                <LockedField label="PAN" value={editing.verified?.pan} verified={editing.verified?.panVerified}/>
                <LockedField label="Bank account" value={editing.verified?.bank} verified={editing.verified?.bankVerified} sub={[editing.verified?.bankName, editing.verified?.ifsc].filter(Boolean).join(' · ')}/>
              </div>
              <p className="text-[11px] text-bss-text-muted mt-2">These are verified automatically from the worker&apos;s own records (Aadhaar, PAN and the bank account). &ldquo;Pending&rdquo; means the worker has not added it yet.</p>
            </div>
            {/* Documents (UAN / ESIC) — worker records; the contractor only verifies */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#01183A] mb-3 flex items-center gap-1.5"><Lock size={13}/>Documents (UAN / ESIC)</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <LockedField label="UAN (EPFO)" value={editing.details.uan} verified={editing.uanVerified}
                  action={<ApproveButton verified={Boolean(editing.uanVerified)} disabled={busy} onToggle={() => void approveDoc('uanVerified', !editing.uanVerified)}/>}/>
                <LockedField label="ESIC IP number" value={editing.details.esic} verified={editing.esicVerified}
                  action={<ApproveButton verified={Boolean(editing.esicVerified)} disabled={busy} onToggle={() => void approveDoc('esicVerified', !editing.esicVerified)}/>}/>
              </div>
              <p className="text-[11px] text-bss-text-muted mt-2">Filled from the worker&apos;s own records — the contractor does not edit these, only approves each document.</p>
            </div>
            {/* Contractor verification tick — the contractor confirms the details above */}
            <label className="flex items-center gap-3 rounded-xl border border-bss-border bg-bss-bg px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={verifiedTick} onChange={e => setVerifiedTick(e.target.checked)} className="w-4 h-4 rounded border-bss-border accent-[#01183A]"/>
              <span className="text-xs font-semibold text-bss-text-primary">I verify the PPE, Health &amp; Safety and Welfare details recorded above.</span>
            </label>
            {error && <p role="alert" className="text-sm text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg p-2.5">{error}</p>}
          </div>
          <div className="px-5 py-4 border-t border-bss-border flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-bold text-bss-text-secondary">Cancel</button>
            <button disabled={busy} onClick={save} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save compliance'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function LockedField({ label, value, sub, verified, action }: { label: string; value?: string; sub?: string; verified?: boolean; action?: ReactNode }) {
  const ok = verified !== undefined ? verified : Boolean(value && value.trim());
  return (
    <div className="rounded-lg border border-bss-border bg-bss-bg px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">{label}</p>
      <p className="text-xs font-semibold text-bss-text-primary mt-0.5 font-mono break-all">{value || '—'}</p>
      <p className={`text-[10px] font-bold mt-1 inline-flex items-center gap-1 ${ok ? 'text-bss-green' : 'text-bss-orange'}`}>
        {ok ? <><Lock size={10} />Verified</> : 'Pending'}
      </p>
      {sub && <p className="text-[10px] text-bss-text-muted mt-0.5">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function ApproveButton({ verified, disabled, onToggle }: { verified: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-60 ${verified ? 'border-bss-border bg-bss-soft-green text-bss-green' : 'border-bss-border bg-white text-bss-text-secondary hover:border-[#01183A] hover:text-[#01183A]'}`}>
      {verified ? <><CheckCircle2 size={11}/>Approved</> : 'Approve'}
    </button>
  );
}
