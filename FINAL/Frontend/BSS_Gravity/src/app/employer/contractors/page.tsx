"use client";

import { useState } from 'react';
import { Building2, CheckCircle2, Clock3, Plus, ShieldAlert, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerContractor } from '@/types/portal';

const columns: DataColumn<EmployerContractor>[] = [
  { id:'name', header:'Contractor', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[11px] text-gray-500">{row.bssId}</p></div> },
  { id:'contact', header:'Contact', value:row => row.contact, render:row => <div><span>{row.contact}</span><p className="text-[11px] text-gray-500 mt-0.5">{row.email}</p></div> },
  { id:'sites', header:'Sites', value:row => row.siteIds.length },
  { id:'workers', header:'Workers', value:row => row.workers },
  { id:'compliance', header:'Compliance', value:row => row.compliance, render:row => <span className={row.compliance >= 90 ? 'text-green-700' : 'text-orange-700'}>{row.compliance}%</span> },
  { id:'onboarding', header:'Connected since', value:row => row.onboardingDate },
  { id:'status', header:'Status', value:row => row.status, render:row => <Status value={row.status}/> },
];

export default function EmployerContractorsPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const siteId = String(form.siteId);
    const payload = {
      name:String(form.name), bssId:String(form.bssId).toUpperCase(), contact:String(form.contact), email:String(form.email), siteId,
      siteIds:[siteId], workers:0, compliance:0, onboardingDate:new Date().toISOString().slice(0, 10), status:'Pending' as const, verified:false,
    };
    try {
      const result = await mutate<{ data:EmployerContractor }>('contractors', 'POST', payload);
      replaceEmployer({ ...employer, contractors:[result.data, ...employer.contractors], stats:{ ...employer.stats, totalContractors:employer.stats.totalContractors + 1 } });
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Contractor could not be connected.');
    } finally { setBusy(false); }
  }

  const active = employer.contractors.filter(item => item.status === 'Active').length;
  const pending = employer.contractors.filter(item => item.status === 'Pending').length;
  const attention = employer.contractors.filter(item => item.compliance < 90).length;

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Workforce network</p><h1 className="text-2xl font-bold mt-1">Connected Contractors</h1><p className="text-sm text-gray-500 mt-1">Contractors bound to your organisation, sites, and worker population.</p></div><button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-gray-950 text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16}/>Connect contractor</button></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Active" value={active} icon={CheckCircle2} tone="bg-green-50 text-green-700"/><Metric label="Pending review" value={pending} icon={Clock3} tone="bg-orange-50 text-orange-700"/><Metric label="Needs attention" value={attention} icon={ShieldAlert} tone="bg-red-50 text-red-700"/></div>
    <EnterpriseDataTable title="Contractor directory" rows={employer.contractors} columns={columns} rowKey={row => row.id} filename="employer-contractors"/>

    {open && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="connect-contractor-title" className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex items-center justify-between"><div><h2 id="connect-contractor-title" className="font-semibold">Connect a BSS contractor</h2><p className="text-xs text-gray-500 mt-1 max-w-md">E·C·S·W — the contractor binds to the <strong>site</strong> you choose below, never to the employer in general. The connection stays pending until you approve it from the Approvals queue.</p></div><button onClick={() => setOpen(false)} aria-label="Close"><X/></button></header>
      <form onSubmit={submit} className="p-5 grid sm:grid-cols-2 gap-4">
        <Field name="name" label="Contractor name"/><Field name="bssId" label="Contractor BSS ID" pattern="BSS-C\d{10}" placeholder="BSS-C0000000008"/><Field name="contact" label="Contact number"/><Field name="email" label="Email" type="email"/>
        <label className="sm:col-span-2 text-xs font-semibold text-gray-700">Initial site (site-scoped binding)<select required name="siteId" className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white"><option value="">Select a site</option>{employer.sites.map(site => <option key={site.id} value={site.id}>{site.name} · {site.code}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-gray-400">Additional sites can be assigned to this contractor later from My Sites → View Site.</span></label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{busy ? 'Connecting…' : 'Connect contractor'}</button></div>
      </form>
    </section></div>}
  </div>;
}

function Status({ value }: { value:EmployerContractor['status'] }) { const tone = value === 'Active' ? 'bg-green-50 text-green-700' : value === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Building2; tone:string }) { return <div className="bg-white border border-gray-200 rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-gray-500">{label}</p></div>; }
function Field({ name, label, type = 'text', pattern, placeholder }: { name:string; label:string; type?:string; pattern?:string; placeholder?:string }) { return <label className="text-xs font-semibold text-gray-700">{label}<input required name={name} type={type} pattern={pattern} placeholder={placeholder} className="mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"/></label>; }
