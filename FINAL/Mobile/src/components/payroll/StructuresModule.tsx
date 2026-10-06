"use client";

import { useState } from 'react';
import { Eye, Plus, Save, Settings2 } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, primaryBtn, secondaryBtn, textareaClass } from '@/components/payroll/common';
import { standardStructure, today } from '@/lib/payroll/payrollService';
import type { SalaryStructure, PayrollStore } from '@/components/payroll/store';

export default function StructuresModule({ store }: { store: PayrollStore }) {
  const [viewId, setViewId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [applicability, setApplicability] = useState('All sites');
  const [pfRule, setPfRule] = useState('Restrict Contribution to ₹15,000 of PF Wage');

  const viewing = store.structures.find(s => s.id === viewId) ?? null;
  const headTone: Record<SalaryStructure['heads'][number]['type'], string> = { Earning: 'bg-green-50 text-green-700', Allowance: 'bg-blue-50 text-blue-700', Deduction: 'bg-red-50 text-red-700', 'Employer Contribution': 'bg-purple-50 text-purple-700', Statutory: 'bg-orange-50 text-orange-700' };

  const create = () => {
    if (!name.trim()) { store.notify('Give the structure a name.', 'error'); return; }
    const base = standardStructure(store.config);
    const structure: SalaryStructure = { ...base, id: `STRUCT-${Date.now().toString().slice(-6)}`, name: name.trim(), applicability, pfRule, createdBy: store.actor, createdAt: today(), status: 'Draft', heads: base.heads.map(h => ({ ...h })) };
    store.addStructure(structure);
    store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Created', entity: 'Salary Structure', reference: structure.id, oldValue: null, newValue: name.trim(), worker: '—', employer: '—', contractor: store.orgName, period: '—', reason: null });
    store.notify(`Salary structure "${name.trim()}" created from the configured compensation.`);
    setCreateOpen(false); setName('');
  };

  return <div className="space-y-5">
    <Section title="Salary Structures" subtitle="Reusable structures — never recreated worker-by-worker. Structure name · applicability · PF rule · created by · status." right={<button onClick={() => setCreateOpen(true)} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><Plus size={14}/>Create structure</button>}>
      {store.structures.length === 0 ? <Empty title="No salary structures" text="Create a structure from the configured compensation heads." /> : (
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Structure</th><th className="px-5 py-3">Applicability</th><th className="px-5 py-3">PF rule</th><th className="px-5 py-3">Heads</th><th className="px-5 py-3">Created by</th><th className="px-5 py-3">Created on</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-gray-100">{store.structures.map(s => <tr key={s.id} className="hover:bg-gray-50"><td className="px-5 py-3 font-semibold text-gray-900">{s.name}<p className="font-mono text-[10px] text-gray-400">{s.id}</p></td><td className="px-5 py-3 text-gray-600">{s.applicability}</td><td className="px-5 py-3 text-gray-600">{s.pfRule}</td><td className="px-5 py-3 text-gray-600">{s.heads.length} heads</td><td className="px-5 py-3 text-gray-600">{s.createdBy}</td><td className="px-5 py-3 text-gray-600">{s.createdAt}</td><td className="px-5 py-3"><StatusPill tone={s.status === 'Active' ? 'bg-green-50 text-green-700' : s.status === 'Draft' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}>{s.status}</StatusPill></td><td className="px-5 py-3"><div className="flex gap-2"><button onClick={() => setViewId(s.id)} className="text-blue-700 font-semibold inline-flex items-center gap-1"><Eye size={13}/>View</button>{s.status !== 'Active' && <button onClick={() => { store.deactivateStructure(s.id); store.notify('Structure deactivated — existing payroll is unchanged (no hard delete on financial config).'); }} className="text-gray-400 hover:text-red-600">Deactivate</button>}</div></td></tr>)}</tbody></table></div>
      )}
    </Section>

    {createOpen && <Modal title="Create Salary Structure" subtitle="Starts from the shared configured compensation — earnings, allowances, deductions, employer contributions, statutory." onClose={() => setCreateOpen(false)}>
      <div className="space-y-4">
        <Field label="Structure name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Construction Structure — Revised" className={inputClass}/></Field>
        <Field label="Applicability"><select value={applicability} onChange={e => setApplicability(e.target.value)} className={inputClass}><option>All sites</option><option>Mumbai Metro Line 3</option><option>Navi Mumbai Airport</option><option>Coastal Road Project</option><option>Worker category: Construction Worker</option></select></Field>
        <Field label="PF rule"><select value={pfRule} onChange={e => setPfRule(e.target.value)} className={inputClass}><option>Restrict Contribution to ₹15,000 of PF Wage</option><option>Full PF Wage contribution</option></select></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreateOpen(false)} className={secondaryBtn}>Cancel</button><button onClick={create} className={primaryBtn}><Save size={15}/>Create structure</button></div>
    </Modal>}

    {viewing && <Modal title={viewing.name} subtitle={`${viewing.applicability} · ${viewing.pfRule} · ${viewing.heads.length} configured heads`} onClose={() => setViewId(null)} width="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><p className="text-xs text-gray-500">Per-head: type · calculation · formula · attendance / present-day based · show on payslip · active. Toggle heads to preview the structure.</p><span className="text-[10px] font-bold text-gray-500 bg-gray-50 rounded-full px-2 py-1 inline-flex items-center gap-1"><Settings2 size={11}/>{viewing.status}</span></div>
      <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">{viewing.heads.map((h, index) => (
        <div key={`${h.name}-${index}`} className="grid grid-cols-[1.4fr_150px_160px_90px_90px_auto] gap-2 items-center rounded-lg border border-gray-100 px-3 py-2 text-xs">
          <div><p className="font-semibold text-gray-800">{h.name}</p><p className="text-[10px] text-gray-400">{h.type}</p></div>
          <span className="text-gray-600 truncate">{h.calculationType}</span>
          <span className="text-gray-500 truncate">{h.formulaAmount}</span>
          <span className="text-gray-500">{h.attendanceBased ? 'Attd' : ''}{h.presentDayBased ? ' · PD' : ''}</span>
          <span className="text-gray-500">{h.showOnPayslip ? 'Payslip' : 'Hidden'}</span>
          <input type="checkbox" checked={h.active} onChange={() => store.toggleStructureHead(viewing.id, h.name)} aria-label={`Toggle ${h.name}`} className="accent-[#073B67] w-4 h-4"/>
        </div>
      ))}</div>
    </Modal>}
  </div>;
}
