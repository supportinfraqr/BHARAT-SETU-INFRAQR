"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Building2, CheckCircle2, Clock3, MoreVertical, Plus, ShieldAlert, UserRound, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import { formatDate } from '@/lib/date';
import type { EmployerContractor } from '@/types/portal';

const columns: DataColumn<EmployerContractor>[] = [
  { id:'name', header:'Contractor', value:row => row.name, render:row => <div><strong className="text-bss-text-primary">{row.name}</strong><p className="font-mono text-[11px] text-bss-text-muted">{row.bssId}</p></div> },
  { id:'contact', header:'Contact', value:row => row.contact, render:row => <div><span>{row.contact}</span><p className="text-[11px] text-bss-text-muted mt-0.5">{row.email}</p></div> },
  { id:'sites', header:'Sites', value:row => (row.sites?.length ? row.sites.join(', ') : String(row.siteIds.length)), export:{split:','} },
  { id:'workers', header:'Workers', value:row => row.workers },
  { id:'onboarding', header:'Connected since', value:row => row.onboardingDate, render:row => formatDate(row.onboardingDate) },
  { id:'status', header:'Status', value:row => row.status, render:row => <Status value={row.status}/> },
];

export default function EmployerContractorsPage() {
  const { employer, replaceEmployer, mutate } = useEmployer();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profileView, setProfileView] = useState<EmployerContractor | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState('');

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
    <header className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Workforce network</p><h1 className="text-2xl font-bold mt-1">Connected Contractors</h1><p className="text-sm text-bss-text-muted mt-1">Contractors bound to your organisation, sites, and worker population.</p></div><button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg bg-bss-navy text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16}/>Connect contractor</button></header>
    <div className="grid grid-cols-3 gap-3"><Metric label="Active" value={active} icon={CheckCircle2} tone="bg-bss-soft-green text-bss-green"/><Metric label="Pending review" value={pending} icon={Clock3} tone="bg-bss-soft-orange text-bss-orange"/><Metric label="Needs attention" value={attention} icon={ShieldAlert} tone="bg-bss-soft-orange text-bss-error"/></div>
    <EnterpriseDataTable title="Contractor directory" rows={employer.contractors} columns={[...columns, { id:'actions', header:'Actions', filterable:false, value:row => row.id, render:row => <ActionMenu open={openMenuFor === row.id} onToggle={() => setOpenMenuFor(openMenuFor === row.id ? '' : row.id)} onViewProfile={() => { setProfileView(row); setOpenMenuFor(''); }} /> }]} rowKey={row => row.id} filename="employer-contractors"/>

    {open && <div className="fixed inset-0 z-[80] bg-black/50 p-4 grid place-items-center" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="connect-contractor-title" className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden">
      <header className="p-5 border-b border-bss-border flex items-center justify-between"><div><h2 id="connect-contractor-title" className="font-semibold">Connect a BSS contractor</h2><p className="text-xs text-bss-text-muted mt-1 max-w-md">E·C·S·W — the contractor binds to the <strong>site</strong> you choose below, never to the employer in general. The connection stays pending until you approve it from the Approvals queue.</p></div><button onClick={() => setOpen(false)} aria-label="Close"><X/></button></header>
      <form onSubmit={submit} className="p-5 grid sm:grid-cols-2 gap-4">
        <Field name="name" label="Contractor name"/><Field name="bssId" label="Contractor BSS ID" pattern="(?:BSS-?C[A-Za-z0-9]{10,11}|BSSC\d{12})" placeholder="BSS-C7KQ2M9X4RT"/><Field name="contact" label="Contact number"/><Field name="email" label="Email" type="email"/>
        <label className="sm:col-span-2 text-xs font-semibold text-bss-text-primary">Initial site (site-scoped binding)<select required name="siteId" className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm bg-white"><option value="">Select a site</option>{employer.sites.map(site => <option key={site.id} value={site.id}>{site.name} · {site.code}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-bss-text-muted">Additional sites can be assigned to this contractor later from My Sites → View Site.</span></label>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-bss-error bg-bss-soft-orange rounded-lg p-3">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm">Cancel</button><button disabled={busy} className="px-4 py-2 bg-bss-interactive-blue text-white rounded-lg text-sm font-semibold disabled:opacity-50">{busy ? 'Connecting…' : 'Connect contractor'}</button></div>
      </form>
    </section></div>}

    {/* Contractor full profile — opened from the row's three-dot menu */}
    {profileView && (
      <div className="fixed inset-0 z-[96] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProfileView(null); }}>
        <section role="dialog" aria-modal="true" aria-label="Contractor profile" className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
          <header className="sticky top-0 bg-white border-b border-bss-border px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Contractor profile</p>
              <h2 className="font-semibold text-bss-text-primary mt-0.5">{profileView.name}</h2>
              <p className="text-xs text-bss-text-muted font-mono mt-0.5">{profileView.bssId}</p>
            </div>
            <button onClick={() => setProfileView(null)} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
          </header>
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Status value={profileView.status}/>
              <span className={`px-2 py-1 rounded text-[10px] font-semibold ${profileView.verified ? 'bg-bss-soft-green text-bss-green' : 'bg-bss-soft-orange text-bss-orange'}`}>{profileView.verified ? 'Verified' : 'Pending verification'}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <Info label="Contractor ID" value={profileView.bssId}/>
              <Info label="Contact" value={profileView.contact || '—'}/>
              <Info label="Email" value={profileView.email || '—'}/>
              <Info label="Connected since" value={formatDate(profileView.onboardingDate)}/>
              <Info label="Workers" value={String(profileView.workers ?? 0)}/>
            </dl>
            <div className="rounded-xl border border-bss-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted mb-2">Sites</p>
              <div className="flex flex-wrap gap-1.5">
                {(profileView.sites?.length ? profileView.sites : profileView.siteIds.map(id => `Site #${id}`)).map((siteName, i) => (
                  <span key={i} className="text-[11px] font-semibold text-[#01183A] bg-[#01183A]/10 rounded px-2 py-0.5">{siteName}</span>
                ))}
                {!profileView.sites?.length && profileView.siteIds.length === 0 && <span className="text-xs text-bss-text-muted">No sites allotted</span>}
              </div>
            </div>
          </div>
        </section>
      </div>
    )}
  </div>;
}

function Status({ value }: { value:EmployerContractor['status'] }) { const tone = value === 'Active' ? 'bg-bss-soft-green text-bss-green' : value === 'Pending' ? 'bg-bss-soft-orange text-bss-orange' : 'bg-bss-soft-orange text-bss-error'; return <span className={`px-2 py-1 rounded text-[10px] font-semibold ${tone}`}>{value}</span>; }
function Metric({ label, value, icon:Icon, tone }: { label:string; value:number; icon:typeof Building2; tone:string }) { return <div className="bg-white border border-bss-border rounded-xl p-4"><span className={`w-8 h-8 rounded-lg grid place-items-center ${tone}`}><Icon size={16}/></span><strong className="block text-2xl mt-2">{value}</strong><p className="text-xs text-bss-text-muted">{label}</p></div>; }
function Field({ name, label, type = 'text', pattern, placeholder }: { name:string; label:string; type?:string; pattern?:string; placeholder?:string }) { return <label className="text-xs font-semibold text-bss-text-primary">{label}<input required name={name} type={type} pattern={pattern} placeholder={placeholder} className="mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm"/></label>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-bss-border p-2.5"><dt className="text-bss-text-muted text-[10px]">{label}</dt><dd className="font-semibold text-bss-text-primary mt-0.5">{value}</dd></div>; }
function ActionMenu({ open, onToggle, onViewProfile }: { open: boolean; onToggle: () => void; onViewProfile: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  const run = (fn: () => void) => () => { onToggle(); fn(); };

  const action = (icon: ReactNode, title: string, description: string, onClick: () => void) => (
    <button role="menuitem" onClick={run(onClick)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-bss-bg transition-colors">
      <span className="w-10 h-10 rounded-lg bg-bss-bg text-bss-interactive-blue grid place-items-center flex-shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-bss-text-primary">{title}</span>
        <span className="block text-xs text-bss-text-muted mt-0.5">{description}</span>
      </span>
    </button>
  );

  return (
    <>
      <button onClick={onToggle} aria-label="Contractor actions" aria-expanded={open} aria-haspopup="dialog" className={`w-8 h-8 grid place-items-center rounded-lg transition-colors ${open ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'text-bss-text-muted hover:bg-bss-bg'}`}><MoreVertical size={16}/></button>
      {open && createPortal(
        <div className="fixed inset-0 z-[120] bg-bss-navy/40 backdrop-blur-sm grid place-items-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onToggle(); }}>
          <section role="dialog" aria-modal="true" aria-label="Contractor actions" className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Contractor actions</p>
                <h2 className="text-sm font-semibold text-bss-text-primary mt-0.5">Choose an action</h2>
              </div>
              <button onClick={onToggle} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-bss-bg text-bss-text-secondary"><X size={18}/></button>
            </header>
            <div className="p-2 space-y-1">
              {action(<UserRound size={18}/>, 'View Profile', 'Full contractor profile and sites', onViewProfile)}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
