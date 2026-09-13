"use client";
import { useState } from 'react';
import { CheckCircle2, Pencil, ShieldCheck, X } from 'lucide-react';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function openEdit(row: ContractorWorkerComplianceStatus) { setEditing(row); setForm({ ...row.details }); setError(''); setNotice(''); }
  function set<K extends keyof Details>(key: K, value: Details[K]) { setForm(current => current ? { ...current, [key]: value } : current); }

  async function save() {
    if (!editing || !form) return;
    setBusy(true); setError('');
    try {
      const result = await mutate<{ data: ContractorWorkerComplianceStatus }>('worker-compliance', 'POST', { workerId: editing.workerId, ...form });
      replaceContractor({ ...contractor, workerCompliance: rows.map(r => r.workerId === editing.workerId ? result.data : r) });
      setNotice(`Compliance updated for ${editing.worker} — it now reflects on the worker's Compliance page.`);
      setEditing(null);
      setTimeout(() => setNotice(''), 5000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Compliance could not be saved.'); }
    finally { setBusy(false); }
  }

  const field = 'mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm';
  const chip = (value: string) => value === 'Done' || value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Expired' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600';

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Master data</p>
        <h1 className="text-2xl font-bold mt-1">Compliance &amp; Welfare</h1>
        <p className="text-sm text-gray-500 mt-1">Record Medical, Safety Kit/PPE, Safety Training, Site Induction, Insurance, Accommodation and Police Verification for your bound workers. It appears on the worker&apos;s Compliance &amp; Welfare page.</p>
      </header>

      {notice && <p className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{notice}</p>}
      {error && !editing && <p className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</p>}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Medical</th><th className="px-4 py-3">Health &amp; Safety</th><th className="px-4 py-3">Gate Pass</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => <tr key={row.workerId} className="hover:bg-gray-50">
              <td className="px-4 py-3"><strong className="text-gray-900">{row.worker}</strong><p className="font-mono text-[10px] text-gray-400 mt-0.5">{row.workerId}</p></td>
              <td className="px-4 py-3 text-gray-600">{row.site || '—'}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.medical)}`}>{row.medical}</span></td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.healthSafety)}`}>{row.healthSafety}</span></td>
              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-semibold ${chip(row.gatePass)}`}>{row.gatePass}</span></td>
              <td className="px-4 py-3"><button onClick={() => openEdit(row)} className="inline-flex items-center gap-1.5 text-blue-700 font-semibold hover:underline"><Pencil size={13}/>Update</button></td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No bound workers yet. Bind workers first, then record their compliance here.</td></tr>}
          </tbody>
        </table></div>
      </section>

      {editing && form && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Worker compliance</p><h2 className="text-sm font-bold text-gray-900 mt-0.5">{editing.worker} · {editing.workerId}</h2></div><button onClick={() => setEditing(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"><X size={16}/></button></div>
          <div className="p-5 space-y-5">
            {/* Medical */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] flex items-center gap-1.5 mb-3"><ShieldCheck size={13}/>Medical</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">Examination status<select value={form.medicalExaminationStatus} onChange={e => set('medicalExaminationStatus', e.target.value)} className={field}>{MEDICAL_EXAM.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Fitness status<select value={form.medicalFitnessStatus} onChange={e => set('medicalFitnessStatus', e.target.value)} className={field}>{MEDICAL_FIT.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Last examination<input type="date" value={form.lastMedicalExamination} onChange={e => set('lastMedicalExamination', e.target.value)} className={field}/></label>
                <label className="text-xs font-semibold text-gray-600">Next medical due<input type="date" value={form.nextMedicalDue} onChange={e => set('nextMedicalDue', e.target.value)} className={field}/></label>
              </div>
            </div>
            {/* Health & Safety */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-3">Health &amp; Safety</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">PPE required<select value={form.ppeRequired ? 'Yes' : 'No'} onChange={e => set('ppeRequired', e.target.value === 'Yes')} className={field}>{YESNO.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Safety training completed<select value={form.safetyTrainingCompleted ? 'Yes' : 'No'} onChange={e => set('safetyTrainingCompleted', e.target.value === 'Yes')} className={field}>{YESNO.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600 sm:col-span-2">PPE issued (comma-separated)<input value={form.typesOfPpeGiven} onChange={e => set('typesOfPpeGiven', e.target.value)} placeholder="Helmet, Safety shoes, Harness" className={field}/></label>
                <label className="text-xs font-semibold text-gray-600">Site induction<select value={form.siteInductionStatus} onChange={e => set('siteInductionStatus', e.target.value)} className={field}>{INDUCTION.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Training date<input type="date" value={form.trainingDate} onChange={e => set('trainingDate', e.target.value)} className={field}/></label>
                <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Trainer name<input value={form.trainerName} onChange={e => set('trainerName', e.target.value)} className={field}/></label>
              </div>
            </div>
            {/* Welfare */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-3">Welfare &amp; Security</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">Insurance status<select value={form.insuranceStatus} onChange={e => set('insuranceStatus', e.target.value)} className={field}>{INSURANCE.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Police verification<select value={form.policeVerification} onChange={e => set('policeVerification', e.target.value)} className={field}>{POLICE.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Accommodation<select value={form.accommodationProvided} onChange={e => set('accommodationProvided', e.target.value)} className={field}>{ACCOMMODATION.map(v => <option key={v} value={v}>{v || 'Select'}</option>)}</select></label>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
            <button disabled={busy} onClick={save} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save compliance'}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
