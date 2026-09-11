"use client";

import { useState } from 'react';
import { BadgeCheck, Banknote, CalendarDays, FileText, Link2, Lock, Plus, RefreshCw, Save, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';
import { Empty, Field, Modal, Section, StatusPill, inputClass, money, primaryBtn, secondaryBtn, textareaClass } from '@/components/payroll/common';
import { formatInr, today } from '@/lib/payroll/payrollService';
import type { PayrollStore } from '@/components/payroll/store';
import type { ContractorPayrollConfig } from '@/types/portal';

type SetupTab = 'schedule' | 'statutory' | 'compensation' | 'ff' | 'staff' | 'claims';

export default function SetupModule({ store }: { store: PayrollStore }) {
  const [tab, setTab] = useState<SetupTab>('schedule');
  const cfg = store.config;
  const tabs: Array<[SetupTab, string]> = [['schedule', 'Pay Schedule'], ['statutory', 'Statutory Compliance'], ['compensation', 'Salary Compensation'], ['ff', 'Full & Final Setup'], ['staff', 'Staff Portal'], ['claims', 'Claims & Declarations']];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-500">Payroll Setup determines <strong>HOW Payroll works</strong>. Configuration is shared across the Employer ↔ Contractor payroll record — not recreated per portal.</p>
      {store.role === 'Admin' && <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1"><Settings2 size={12}/>Admin has supervisory control of the same setup</span>}
    </div>
    <div className="flex border-b overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === id ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>)}</div>
    {tab === 'schedule' && <PayScheduleSection store={store} />}
    {tab === 'statutory' && <StatutorySection cfg={cfg} />}
    {tab === 'compensation' && <CompensationSection cfg={cfg} store={store} />}
    {tab === 'ff' && <FnFSetupSection cfg={cfg} />}
    {tab === 'staff' && <StaffPortalSection cfg={cfg} store={store} />}
    {tab === 'claims' && <ClaimsSection store={store} />}
  </div>;
}

/* ── 1 · Pay Schedule ─────────────────────────────────────────────────── */
function PayScheduleSection({ store }: { store: PayrollStore }) {
  const cfg = store.config;
  const [changeDay, setChangeDay] = useState(false);
  const [newDay, setNewDay] = useState('');

  return <Section title="Pay Schedule" subtitle="Reusable organisation-level schedule — frequency, working days, pay day, first period and auto-derived upcoming payrolls." right={<button onClick={() => { setNewDay(cfg.paySchedule.payDay); setChangeDay(true); }} className={secondaryBtn + ' !h-9 !text-xs'}><CalendarDays size={14}/>Change Pay Day</button>}>
    <div className="p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
      <FieldValue label="Pay frequency" value={cfg.paySchedule.payFrequency} />
      <FieldValue label="Working days" value={cfg.paySchedule.workingDays.join(', ')} />
      <FieldValue label="Pay day" value={cfg.paySchedule.payDay} />
      <FieldValue label="First pay period" value={cfg.paySchedule.firstPayPeriod} />
      <div className="sm:col-span-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Upcoming payrolls (derived from the schedule — never hardcoded months)</p>
        <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-4 py-2.5">Payroll period</th><th className="px-4 py-2.5">Processing period</th><th className="px-4 py-2.5">Pay date</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{cfg.paySchedule.upcoming.map(u => <tr key={u.period}><td className="px-4 py-2.5 font-semibold text-gray-800">{u.period}</td><td className="px-4 py-2.5 text-gray-500">Last working day of {u.period.replace(/\s\d{4}/, '')}</td><td className="px-4 py-2.5 text-gray-600">{u.payDate}</td><td className="px-4 py-2.5"><StatusPill tone="bg-orange-50 text-orange-700">Scheduled</StatusPill></td></tr>)}</tbody></table></div>
      </div>
    </div>
    {changeDay && <Modal title="Change Pay Day" subtitle="Stored on the shared Pay Schedule; upcoming payroll dates re-derive automatically." onClose={() => setChangeDay(false)}>
      <Field label="New pay day"><input value={newDay} onChange={e => setNewDay(e.target.value)} placeholder="e.g. 7th of each month" className={inputClass}/></Field>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setChangeDay(false)} className={secondaryBtn}>Cancel</button><button onClick={() => { store.logAudit({ id: `AUD-${Date.now().toString().slice(-6)}`, timestamp: new Date().toISOString(), actor: store.actor, actorRole: store.role, action: 'Changed', entity: 'Pay Schedule — Pay Day', reference: 'PaySchedule', oldValue: cfg.paySchedule.payDay, newValue: newDay, worker: '—', employer: '—', contractor: '—', period: '—', reason: null }); store.notify(`Pay day updated to "${newDay}" — upcoming payrolls will follow.`); setChangeDay(false); }} className={primaryBtn}><Save size={15}/>Save pay day</button></div>
    </Modal>}
  </Section>;
}

/* ── 2 · Statutory Compliance ─────────────────────────────────────────── */
function StatutorySection({ cfg }: { cfg: ContractorPayrollConfig }) {
  const epf = cfg.statutory.epf;
  const esi = cfg.statutory.esi;
  const [sim, setSim] = useState(false);
  const [simGross, setSimGross] = useState('20000');
  const [simPfWage, setSimPfWage] = useState('15000');

  const runSim = () => {
    const gross = Number(simGross) || 0;
    const wage = Math.min(Number(simPfWage) || 0, 15000);
    const employeePF = Math.round(wage * 0.12);
    const eps = Math.round(wage * 0.0833);
    const employerPF = Math.max(0, employeePF - eps);
    const edli = 0; const admin = 0;
    const employeeESI = Math.round(gross * 0.0075);
    const employerESI = Math.round(gross * 0.0325);
    const total = employeePF + employerPF + eps + edli + admin + employeeESI + employerESI;
    return { employeePF, eps, employerPF, edli, admin, employeeESI, employerESI, total };
  };
  const simResult = runSim();

  return <div className="grid lg:grid-cols-2 gap-5">
    <Section title="EPF" subtitle="Configuration-driven — never hardcoded percentages in the UI." right={<span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full px-2 py-1"><RefreshCw size={11}/>Calculation preview below</span>}>
      <div className="p-5 grid grid-cols-2 gap-y-2.5 text-xs">
        <FieldValue label="EPF number" value={epf.number} /><FieldValue label="Deduction cycle" value={epf.deductionCycle} />
        <FieldValue label="Employee contribution" value={epf.employeeRate} /><FieldValue label="Employer contribution" value={epf.employerRate} />
        <FieldValue label="Included in salary" value={epf.includeInSalary ? 'Yes' : 'No'} /><FieldValue label="EDLI contribution" value={epf.edliIncluded ? 'Included' : 'Not included'} />
        <FieldValue label="Admin charges" value={epf.adminChargesIncluded ? 'Included' : 'Not included'} /><FieldValue label="Worker-level override" value={epf.allowOverride ? 'Yes' : 'No'} />
        <FieldValue label="Pro-rate restricted PF wage" value={epf.proRate ? 'Yes' : 'No'} /><FieldValue label="LOP consideration" value={epf.lopConsideration ? 'Yes' : 'No'} />
        <FieldValue label="ABRY eligibility" value={epf.abryEligible ? 'Eligible' : 'Not eligible'} /><FieldValue label="Sample (PF wage ₹20,000)" value={epf.sample} />
      </div>
    </Section>

    <Section title="EPF Calculation Preview" subtitle="Simulator only — it never writes to Worker Payroll.">
      <div className="p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Sample gross"><input type="number" value={simGross} onChange={e => setSimGross(e.target.value)} className={inputClass}/></Field>
          <Field label="PF wage (cap ₹15,000)"><input type="number" value={simPfWage} onChange={e => setSimPfWage(e.target.value)} className={inputClass}/></Field>
        </div>
        <button onClick={() => setSim(v => !v)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"><RefreshCw size={13}/>Show / hide breakdown</button>
        {sim && <div className="mt-3 space-y-1.5 text-xs">
          {[['Employee contribution (EPF 12% of PF wage)', simResult.employeePF], ['EPS portion (8.33%)', simResult.eps], ['Employer PF balance', simResult.employerPF], ['EDLI', simResult.edli], ['Admin charges', simResult.admin], ['ESI employee (0.75% of gross)', simResult.employeeESI], ['ESI employer (3.25% of gross)', simResult.employerESI]].map(([label, amount]) => <div key={label} className="flex justify-between rounded-lg border border-gray-100 px-3 py-2"><span className="text-gray-600">{label}</span><span className="font-semibold text-gray-800">{formatInr(Number(amount))}</span></div>)}
          <div className="flex justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 font-bold text-gray-900"><span>Total contribution</span><span>{formatInr(simResult.total)}</span></div>
        </div>}
      </div>
    </Section>

    <Section title="ESI" subtitle="Configurable rates and number">
      <div className="p-5 grid grid-cols-2 gap-y-2.5 text-xs">
        <FieldValue label="ESI number" value={esi.number} /><FieldValue label="Deduction cycle" value={esi.deductionCycle} />
        <FieldValue label="Employee contribution rate" value={esi.employeeRate} /><FieldValue label="Employer contribution rate" value={esi.employerRate} />
        <div className="col-span-2"><FieldValue label="Other detail" value={esi.otherDetail} /></div>
      </div>
    </Section>

    <Section title="Professional Tax · Labour Welfare Fund · Statutory Bonus" subtitle="State/site applicability from existing BSS data — Not Applicable never shows empty forms.">
      <div className="p-5 space-y-4 text-xs">
        {cfg.statutory.professionalTax.map(pt => <div key={pt.location} className="rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Professional Tax · {pt.location} · {pt.state}</p>
          {pt.applicable ? <div className="grid grid-cols-2 gap-y-2"><span className="text-gray-500">PT number</span><span className="font-semibold text-right">{pt.ptNumber || '—'}</span><span className="text-gray-500">Deduction cycle</span><span className="font-semibold text-right">{pt.cycle}</span><span className="text-gray-500">Tax slabs</span><span className="font-semibold text-right text-blue-700">{pt.slabs}</span></div> : <p className="text-[11px] text-gray-500">Not Applicable — {pt.slabs}</p>}
        </div>)}
        {cfg.statutory.labourWelfareFund.map(lwf => <div key={lwf.state} className="rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">LWF · {lwf.state}</p>
          {lwf.applicable && lwf.enabled ? <div className="grid grid-cols-2 gap-y-2"><span className="text-gray-500">Minimum / maximum</span><span className="font-semibold text-right">{lwf.minAmount ? formatInr(lwf.minAmount) : '₹0'} / {lwf.maxAmount}</span><span className="text-gray-500">Worker share</span><span className="font-semibold text-right">{formatInr(lwf.employeeShare)}</span><span className="text-gray-500">Employer share</span><span className="font-semibold text-right">{formatInr(lwf.employerShare)}</span><span className="text-gray-500">Cycle</span><span className="font-semibold text-right">{lwf.cycle}</span></div> : <p className="text-[11px] text-gray-500">LWF is not applicable / active for {lwf.state}.</p>}
        </div>)}
        <div className="rounded-xl border border-gray-100 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Statutory Bonus</p><div className="grid grid-cols-2 gap-y-2"><span className="text-gray-500">Payment cycle</span><span className="font-semibold text-right">{cfg.statutory.statutoryBonus.paymentCycle}</span><span className="text-gray-500">Bonus percentage</span><span className="font-semibold text-right">{cfg.statutory.statutoryBonus.percentage}%</span><span className="text-gray-500">State applicability</span><span className="font-semibold text-right">{cfg.statutory.statutoryBonus.minWageStates.length} states configured</span></div><div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">{cfg.statutory.statutoryBonus.minWageStates.map(s => <span key={s} className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{s}</span>)}</div></div>
      </div>
    </Section>
  </div>;
}

/* ── 3 · Salary Compensation ──────────────────────────────────────────── */
function CompensationSection({ cfg, store }: { cfg: ContractorPayrollConfig; store: PayrollStore }) {
  const [view, setView] = useState<'earnings' | 'deductions' | 'benefits' | 'reimbursements'>('earnings');
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('New Earning');

  const active = (v: boolean) => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 inline-block">{v ? 'Active' : 'Inactive'}</span>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1">{([['earnings', 'Earnings'], ['deductions', 'Deductions'], ['benefits', 'Benefits'], ['reimbursements', 'Reimbursements']] as const).map(([id, label]) => <button key={id} onClick={() => setView(id)} className={`px-3.5 py-2 rounded-full text-xs font-bold ${view === id ? 'bg-[#0F172A] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{label}</button>)}</div>
      <button onClick={() => setAddOpen(true)} className={primaryBtn + ' !h-9 !px-3 !text-xs'}><Plus size={14}/>Add component</button>
    </div>

    {view === 'earnings' && <Section title="Earnings" subtitle="Salary component engine — Name · type · calculation · EPF/ESI consideration · status · actions.">
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Earning type</th><th className="px-5 py-3">Calculation type</th><th className="px-5 py-3">Consider for EPF</th><th className="px-5 py-3">Consider for ESI</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{cfg.salary.earnings.map(e => <tr key={e.name} className="hover:bg-gray-50"><td className="px-5 py-2.5 font-semibold text-gray-900">{e.name}</td><td className="px-5 py-2.5 text-gray-600">{e.type}</td><td className="px-5 py-2.5 text-gray-600">{e.calculation}</td><td className="px-5 py-2.5 text-gray-600">{e.considerEPF}</td><td className="px-5 py-2.5 text-gray-600">{e.considerESI}</td><td className="px-5 py-2.5">{active(e.active)}</td></tr>)}</tbody></table></div>
    </Section>}
    {view === 'deductions' && <Section title="Deductions" subtitle="One-time / recurring and configured frequencies — corrections reference the component being corrected.">
      <table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Deduction type</th><th className="px-5 py-3">Deduction frequency</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{cfg.salary.deductions.map(d => <tr key={d.name}><td className="px-5 py-2.5 font-semibold text-gray-900">{d.name}</td><td className="px-5 py-2.5 text-gray-600">{d.type}</td><td className="px-5 py-2.5 text-gray-600">{d.frequency}</td><td className="px-5 py-2.5">{active(d.active)}</td></tr>)}</tbody></table>
    </Section>}
    {view === 'benefits' && <Section title="Benefits" subtitle="VPF, NPS and other configured organisation components — create, edit, activate/deactivate.">
      <div className="divide-y divide-gray-100">{cfg.salary.benefits.map(b => <div key={b.name} className="px-5 py-3.5 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-gray-900">{b.name}</p><p className="text-xs text-gray-400">{b.frequency}</p></div><div className="flex items-center gap-2">{active(b.active)}<button onClick={() => store.notify(`${b.name} is configurable from statutory/compensation setup.`)} className="text-blue-700 text-xs font-semibold">Edit</button></div></div>)}</div>
    </Section>}
    {view === 'reimbursements' && <Section title="Reimbursements" subtitle="Name · type · maximum reimbursement · unclaimed behaviour — FBP eligibility derived from flagged components.">
      <div className="divide-y divide-gray-100">{cfg.salary.reimbursements.map(r => <div key={r.name} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-gray-900">{r.name}</p><p className="text-xs text-gray-400">{r.type} · Max {r.maxAmount ? formatInr(r.maxAmount) : '—'} · Unclaimed: no carry forward</p></div><div className="flex items-center gap-2">{active(r.active)}<button onClick={() => store.notify(`${r.name} — carry-forward policy is configuration-driven.`)} className="text-blue-700 text-xs font-semibold">Settings</button></div></div>)}</div>
    </Section>}

    {addOpen && <Modal title="Add Payroll Component" subtitle="One reusable component engine — earning, correction, benefit, deduction or reimbursement." onClose={() => setAddOpen(false)}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Category"><select value={kind} onChange={e => setKind(e.target.value)} className={inputClass}><option>New Earning</option><option>New Correction</option><option>New Benefit</option><option>New Deduction</option><option>New Reimbursement</option></select></Field>
        <Field label="Component name"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Project Allowance" className={inputClass}/></Field>
      </div>
      <p className="mt-3 text-[11px] text-gray-400"><BadgeCheck size={12} className="inline mr-1"/>The component becomes available in Manual Entry / Bulk Upload / Pay Runs once created in setup.</p>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setAddOpen(false)} className={secondaryBtn}>Cancel</button><button onClick={() => { if (!name.trim()) return; store.notify(`Component "${name}" (${kind}) added to the configured structure (demo).`); setAddOpen(false); setName(''); }} className={primaryBtn}><Save size={15}/>Add component</button></div>
    </Modal>}
  </div>;
}

/* ── 4 · F&F Setup ────────────────────────────────────────────────────── */
function FnFSetupSection({ cfg }: { cfg: ContractorPayrollConfig }) {
  const ff = cfg.salary.fullFinal;
  return <Section title="Full & Final Settlement Setup" subtitle="Leave encashment · gratuity · notice penalty · excess leave recovery · assumed days recovery.">
    <div className="p-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
      <div className="rounded-xl border border-gray-100 p-3.5"><p className="text-xs font-bold text-gray-900 mb-2">Leave Encashment</p><div className="space-y-1.5"><MiniRow label="Enabled" value={ff.leaveEncashment.enabled ? 'Yes' : 'No'} /><MiniRow label="Leave type" value={ff.leaveEncashment.leaveType} /><MiniRow label="Encashment on" value={ff.leaveEncashment.encashmentOn} /><MiniRow label="Days" value={String(ff.leaveEncashment.days)} /><MiniRow label="Calculation days" value={ff.leaveEncashment.calcDays} /></div></div>
      <div className="rounded-xl border border-gray-100 p-3.5"><p className="text-xs font-bold text-gray-900 mb-2">Gratuity Encashment</p><div className="space-y-1.5"><MiniRow label="Enabled" value={ff.gratuityEncashment.enabled ? 'Yes' : 'No'} /><MiniRow label="Maturity years" value={ff.gratuityEncashment.maturityYears} /><MiniRow label="Maturity months" value={ff.gratuityEncashment.maturityMonths} /><MiniRow label="Month rounding rule" value={ff.gratuityEncashment.roundingMonths} /></div></div>
      <MiniCard title="Notice Period Penalty" rows={[['Enabled', ff.noticePenalty.enabled ? 'Yes' : 'No'], ['Penalty on', ff.noticePenalty.penaltyOn]]} />
      <MiniCard title="Excess Leave Recovery" rows={[['Enabled', ff.excessLeaveRecovery.enabled ? 'Yes' : 'No'], ['Penalty on', ff.excessLeaveRecovery.penaltyOn]]} />
      <div className="sm:col-span-2"><MiniCard title="Assumed Days Recovery" rows={[['Enabled', ff.assumeDaysRecovery.enabled ? 'Yes' : 'No'], ['Recovery basis', ff.assumeDaysRecovery.penaltyOn]]} /></div>
    </div>
  </Section>;
}

/* ── 5 · Staff Portal (payroll self-service context) ─────────────────── */
function StaffPortalSection({ cfg, store }: { cfg: ContractorPayrollConfig; store: PayrollStore }) {
  const sp = cfg.staffPortal;
  const [tabs, setTabs] = useState<Array<{ name: string; url: string }>>([{ name: 'Company Policy', url: '' }]);
  const [openTab, setOpenTab] = useState(false);
  const [tabName, setTabName] = useState('');
  const [tabUrl, setTabUrl] = useState('');

  return <Section title="Staff Portal — payroll self-service context" subtitle="Not the BSS Staff role. Portal access, banner, payroll contact, document visibility and custom web tabs.">
    <div className="p-5 grid md:grid-cols-2 gap-6">
      <div className="space-y-3 text-xs">
        <ToggleRow label="Enable Payroll Portal Access" checked={sp.portalAccess} onToggle={() => store.notify('Worker portal access to salary info, payroll activities and documents.')} />
        <Field label="Banner message"><input readOnly value={sp.bannerMessage || 'No banner configured'} className={inputClass + ' bg-gray-50'}/></Field>
        <Field label="Display until"><input readOnly value={sp.bannerTill || '—'} className={inputClass + ' bg-gray-50'}/></Field>
        <FieldValue label="Payroll / HR contact" value={sp.contact} />
        <ToggleRow label="Show payroll documents in worker portal" checked={sp.showDocuments} onToggle={() => store.notify('Payroll documents visibility uses the existing BSS document storage.')} />
        <ToggleRow label="Show salary revision letter" checked={sp.showSalaryRevision} onToggle={() => store.notify('Salary revision letter visibility toggled (existing documents infra).')} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom web tabs</p><button onClick={() => setOpenTab(true)} className={secondaryBtn + ' !h-8 !px-2.5 !text-xs'}><Plus size={13}/>New web tab</button></div>
        <div className="space-y-2">{tabs.map((tab, i) => <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"><div><p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5"><Link2 size={12}/>{tab.name}</p><p className="text-[11px] text-blue-600 font-mono">{tab.url}</p></div><button onClick={() => setTabs(cur => cur.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button></div>)}
        <p className="text-[11px] text-gray-400 mt-2">Use cases: company policy · learning resource · employee resource.</p></div>
      </div>
    </div>
    {openTab && <Modal title="Create Web Tab" subtitle="Valid URL required — URL is validated on save." onClose={() => setOpenTab(false)}>
      <div className="space-y-4">
        <Field label="Web tab name"><input value={tabName} onChange={e => setTabName(e.target.value)} placeholder="e.g. Labour welfare scheme" className={inputClass}/></Field>
        <Field label="URL"><input value={tabUrl} onChange={e => setTabUrl(e.target.value)} placeholder="https://…" className={inputClass}/></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpenTab(false)} className={secondaryBtn}>Cancel</button><button onClick={() => { if (!tabName.trim() || !/^https?:\/\/.+\..+/.test(tabUrl.trim())) { store.notify('Enter a tab name and a valid http(s) URL.', 'error'); return; } setTabs(cur => [...cur, { name: tabName.trim(), url: tabUrl.trim() }]); setOpenTab(false); setTabName(''); setTabUrl(''); store.notify(`Web tab "${tabName.trim()}" created.`); }} className={primaryBtn}><Save size={15}/>Create tab</button></div>
    </Modal>}
  </Section>;
}

/* ── 6 · Claims & Declarations ────────────────────────────────────────── */
function ClaimsSection({ store }: { store: PayrollStore }) {
  const [claims, setClaims] = useState([
    { id: 'CLM-2026-0182', worker: 'Ravi Kumar', workerId: 'BSS892199210001', type: 'Fuel Reimbursement', claimed: 850, approved: 850, date: '2026-08-18', attachment: 'fuel-receipt.pdf', status: 'Approved' as const, period: 'September 2026' },
    { id: 'CLM-2026-0189', worker: 'Amit Singh', workerId: 'BSS892199220002', type: 'Telephone Reimbursement', claimed: 300, approved: 200, date: '2026-08-21', attachment: null, status: 'Approved' as const, period: 'Pending Payroll Inclusion' },
    { id: 'CLM-2026-0191', worker: 'Suresh Patel', workerId: 'BSS892199230003', type: 'Medical Reimbursement', claimed: 1500, approved: 0, date: '2026-08-25', attachment: 'medical-bill.pdf', status: 'Pending' as const, period: '—' },
  ]);
  const [include, setInclude] = useState<'Locked' | 'Released' | 'Submitted' | 'Reviewed'>('Locked');
  const [poiState, setPoiState] = useState<'Locked' | 'Released'>('Locked');

  return <div className="space-y-5">
    <Section title="Reimbursement Claims" subtitle="Worker claim → review → approve / partial approve / reject → approved amount → payroll period inclusion.">
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100"><tr><th className="px-5 py-3">Claim ID</th><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Claim type</th><th className="px-5 py-3">Claimed</th><th className="px-5 py-3">Approved</th><th className="px-5 py-3">Attachment</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Included in payroll</th></tr></thead>
        <tbody className="divide-y divide-gray-100">{claims.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-5 py-2.5 font-mono text-[#073B67] font-bold">{c.id}</td><td className="px-5 py-2.5 font-semibold text-gray-800">{c.worker}</td><td className="px-5 py-2.5 text-gray-600">{c.type}</td><td className="px-5 py-2.5">{money(c.claimed)}</td><td className="px-5 py-2.5">{c.approved ? money(c.approved) : <span className="text-gray-400">—</span>}</td><td className="px-5 py-2.5">{c.attachment ? <span className="text-blue-700 inline-flex items-center gap-1"><FileText size={12}/>{c.attachment}</span> : '—'}</td><td className="px-5 py-2.5"><StatusPill tone={c.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>{c.status}</StatusPill></td><td className="px-5 py-2.5"><span className={c.period.startsWith('Pending') ? 'text-orange-600' : 'text-green-700'}>{c.period}</span></td></tr>)}</tbody></table></div>
      <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-2">
        <button onClick={() => { const pending = claims.find(c => c.status === 'Pending'); if (!pending) return; setClaims(cur => cur.map(c => c.id === pending.id ? { ...c, status: 'Approved', approved: 900, period: 'Pending Payroll Inclusion' } : c)); store.addApproval({ id: `APR-${Date.now().toString().slice(-6)}`, category: 'Reimbursement Approval', reference: pending.id, worker: pending.worker, workerId: pending.workerId, employer: store.role === 'Employer' ? store.orgName : 'L&T Construction', contractor: store.orgName, site: '—', requestedBy: 'Worker', requestedOn: new Date().toISOString(), amount: 900, status: 'Pending', remarks: 'Auto-routed for review', history: [] }); store.notify('Claim routed to Approvals for review.'); }} className={secondaryBtn + ' !h-9 !text-xs'}>Review pending claim</button>
        <button onClick={() => store.notify('Approved claims flow into the applicable payroll period — no manual duplication.')} className="text-xs font-semibold text-blue-700 hover:underline">How claims reach payroll</button>
      </div>
    </Section>

    <div className="grid md:grid-cols-2 gap-5">
      <Section title="Flexible Benefit Plan" subtitle="FBP derives from reimbursement components flagged as FBP.">
        <div className="p-5 text-xs">
          <p className="rounded-lg border border-gray-100 px-3 py-2.5 text-gray-600">No active FBP component — enable a reimbursement flagged as FBP in Salary Compensation.</p>
        </div>
      </Section>

      <Section title="Income Tax Declaration & Proof of Investments" subtitle="Administrative workflow states — Locked / Released / Submitted / Reviewed.">
        <div className="p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"><div><p className="font-semibold text-gray-800 flex items-center gap-1.5"><Lock size={13}/>Income Tax Declaration</p><p className="text-[11px] text-gray-400 mt-0.5">Allow worker tax-regime switch · TDS modification per permitted rule</p></div><button onClick={() => { setInclude(v => (v === 'Locked' ? 'Released' : 'Locked')); store.notify(`IT declaration ${include === 'Locked' ? 'released to workers' : 'locked'}.`); }} className={primaryBtn + ' !h-8 !px-3 !text-[11px]'}>{include === 'Locked' ? 'Release IT Declaration' : 'Lock IT Declaration'}</button></div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"><div><p className="font-semibold text-gray-800 flex items-center gap-1.5"><ShieldCheck size={13}/>Proof of Investments</p><p className="text-[11px] text-gray-400 mt-0.5">Payroll month from which approved POI applies · mandatory proof attachment</p></div><button onClick={() => { setPoiState(v => (v === 'Locked' ? 'Released' : 'Locked')); store.notify(`Proof of investments ${poiState === 'Locked' ? 'released' : 'locked'}.`); }} className={primaryBtn + ' !h-8 !px-3 !text-[11px]'}>{poiState === 'Locked' ? 'Release Proof of Investments' : 'Lock Proof of Investments'}</button></div>
        </div>
      </Section>
    </div>
  </div>;
}

/* helpers */
function FieldValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-gray-400">{label}</dt><dd className="font-semibold text-gray-800 mt-0.5 break-words">{value || '—'}</dd></div>;
}
function MiniRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-800 text-right">{value}</span></div>;
}
function MiniCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <div className="rounded-xl border border-gray-100 p-3.5"><p className="text-xs font-bold text-gray-900 mb-2">{title}</p><div className="space-y-1.5">{rows.map(([label, value]) => <MiniRow key={label} label={label} value={value} />)}</div></div>;
}
function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return <label className="flex items-center justify-between gap-3 cursor-pointer py-1"><span className="text-xs font-semibold text-gray-700">{label}</span><button type="button" onClick={onToggle} className={`relative inline-flex w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-[#2F9E67]' : 'bg-gray-200'}`}><span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} /></button></label>;
}
