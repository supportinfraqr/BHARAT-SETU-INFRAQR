"use client";

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, ScanLine, Users, XCircle } from 'lucide-react';
import { useEmployer } from '@/contexts/EmployerContext';
import BindingConsole, { type BindingParty } from '@/components/ecsw/BindingConsole';
import { assertEcsRules, tupleLabel, type EcsBinding } from '@/lib/ecsw';

export default function EmployerBindingsPage() {
  const { employer } = useEmployer();
  const [contractorId, setContractorId] = useState(employer.contractors[0]?.id ?? '');
  const [siteId, setSiteId] = useState(employer.sites[0]?.id ?? '');
  const [workerId, setWorkerId] = useState(employer.workers[0]?.id ?? '');
  const [openConsole, setOpenConsole] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const contractor = employer.contractors.find(c => c.id === contractorId);
  const site = employer.sites.find(s => s.id === siteId);
  const worker = employer.workers.find(w => w.id === workerId);

  // Workers available for a site are those whose site matches (read-only view in this demo).
  const siteWorkers = useMemo(() => employer.workers.filter(w => w.siteId === siteId), [employer.workers, siteId]);
  const allWorkers = employer.workers;

  const e: BindingParty = { key: 'employer', name: employer.identity.company, id: employer.identity.bssId };
  const c: BindingParty = { key: 'contractor', name: contractor?.name ?? 'Contractor', id: contractor?.bssId ?? 'C' };
  const s: BindingParty = { key: 'site', name: site?.name ?? 'Site', id: site?.id ?? 'S' };
  const w: BindingParty = { key: 'worker', name: worker?.name ?? 'Worker', id: worker?.bssId ?? 'W' };

  // Demo bound tuples derived from the current employer→contractor→site→worker graph.
  const boundTuples = useMemo(() => employer.sites.flatMap(site =>
    site.contractorIds.flatMap(cid => {
      const c = employer.contractors.find(x => x.id === cid);
      if (!c) return [];
      return employer.workers.filter(worker => worker.siteId === site.id && worker.contractorId === cid).map(worker => tupleLabel({ employerId: employer.identity.bssId, contractorId: c.bssId, siteId: site.id, workerId: worker.bssId }));
    }),
  ), [employer]);

  function checkRules() {
    const candidate = { employerId: employer.identity.bssId, contractorId: contractor?.bssId ?? '', siteId: site?.id ?? '', workerId: worker?.bssId ?? '', site: site ? { id: site.id, employerId: employer.identity.bssId } : undefined };
    const list: EcsBinding[] = boundTuples.map(b => ({ id: b, employerId: employer.identity.bssId, contractorId: contractor?.bssId ?? '', siteId: site?.id ?? '', workerId: worker?.bssId ?? '', tuple: b, state: 'bound', consent: { employer: true, contractor: true, worker: true }, requestedBy: 'employer', requestedAt: '', boundAt: '' }));
    const found = assertEcsRules(candidate, list);
    setErrors(found);
  }

  return <div className="space-y-6">
    <header><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">QR system</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">Binding & Consent</h1><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">E-C-S-W</span></div><p className="text-sm text-gray-500 mt-1">Establish the Employer → Contractor → Site → Worker hierarchy and run the dual-consent QR handshake.</p></header>

    <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-3 text-xs"><strong>Rule enforced:</strong> a Worker is bound to one and only one Site (cannot be active on two); a Site belongs to one Employer; a Worker is managed by one Contractor at that Site. Every binding yields a unique constant tuple <code className="font-mono">E-C-S-W</code>.</div>

    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Building2 size={16} className="text-blue-700"/>Pre-allocate hire hierarchy</h2>
      <p className="text-[11px] text-gray-400 mt-0.5">Define the site and pre-allocate a worker. The system verifies the Worker is not active on another Site.</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <label className="text-xs font-semibold text-gray-700">Contractor<select value={contractorId} onChange={e => setContractorId(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select</option>{employer.contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-700">Site<select value={siteId} onChange={e => setSiteId(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select</option>{employer.sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-700">Worker<select value={workerId} onChange={e => setWorkerId(e.target.value)} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"><option value="">Select</option>{allWorkers.map(wrk => <option key={wrk.id} value={wrk.id}>{wrk.name} · {wrk.site}</option>)}</select></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={checkRules} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold">Check E-C-S-W rules</button>
        <button onClick={() => { setOpenConsole(true); setErrors([]); }} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center gap-2"><ScanLine size={16}/>Start consent handshake</button>
      </div>
      {(errors.length > 0 ? errors : []) && <div className="mt-3">{errors.length ? errors.map((e, i) => <p key={i} className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-1 flex items-center gap-2"><XCircle size={15}/>{e}</p>) : <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2 flex items-center gap-2"><CheckCircle2 size={15}/>No rule violations — this hierarchy is valid.</p>}</div>}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600"><span className="font-semibold text-gray-900">Selected hierarchy:</span> <code className="font-mono text-[11px]">{tupleLabel({ employerId: employer.identity.bssId, contractorId: contractor?.bssId ?? '', siteId: site?.id ?? '', workerId: worker?.bssId ?? '' })}</code></div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Active hire hierarchies</h2><p className="text-[11px] text-gray-400 mt-0.5">Unique constant tuples currently bound under your organisation</p></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Hierarchy (Employer-Contractor-Site-Worker)</th><th className="px-4 py-3">Workers at site</th></tr></thead><tbody className="divide-y divide-gray-100">{boundTuples.map((t, i) => <tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-[11px] text-gray-700 break-all">{t}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-gray-500"><Users size={12}/>{siteWorkers.length}</span></td></tr>)}<tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">No active tuples yet — run a consent handshake to create one.</td></tr></tbody></table></div>
    </section>

    <BindingConsole open={openConsole} onClose={() => setOpenConsole(false)} parties={{ e, c, s, w }} worker={worker ? { identity: { name: worker.name, dob: '1990-08-15', gender: 'Male' }, employment: { employer: employer.identity.company }, personal: { bloodGroup: 'B+' } } as unknown as import('@/types/portal').WorkerRecord : undefined} />
  </div>;
}
