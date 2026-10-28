"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BookOpenCheck, FileText, Landmark, Link2, ShieldCheck, TicketCheck, Users } from 'lucide-react';
import { ACTIVITY_LOG } from '@/data/adminMasters';
import AdminPageHero from '@/components/admin/AdminPageHero';

const MASTER_LINKS: Array<[string, string, string, typeof Users]> = [
  ['party', 'Party Master', '/admin/masters/party', Users],
  ['professional-tax', 'Professional Tax', '/admin/masters/professional-tax', Landmark],
  ['lwf', 'LWF Master', '/admin/masters/lwf', Landmark],
  ['license', 'License Management', '/admin/masters/license', FileText],
  ['minimum-wage', 'Minimum Wage', '/admin/masters/minimum-wage', FileText],
  ['compliance', 'Compliance Master', '/admin/masters/compliance', ShieldCheck],
  ['register-doc', 'CLRA Templates', '/admin/masters/register-template', BookOpenCheck],
];
const MAPPING_LINKS: Array<[string, string, string]> = [
  ['employer-document', 'Employer Document Mapping', '/admin/mappings/employer-document'],
  ['employer-act', 'Employer Act Mapping', '/admin/mappings/employer-act'],
  ['employer-register', 'Employer Register Mapping', '/admin/mappings/employer-register'],
];

export default function AdminOverview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [openTickets, setOpenTickets] = useState(0);
  const n = (key: string) => counts[key] ?? 0;

  useEffect(() => {
    let active = true;
    void fetch('/api/admin/masters', { cache:'no-store' })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((body: { counts?: Record<string, number> }) => { if (active && body.counts) setCounts(body.counts); })
      .catch(() => { if (active) setFailed(true); });
    void fetch('/api/admin/support-tickets', { cache:'no-store' })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((body: { openCount?: number }) => { if (active) setOpenTickets(body.openCount ?? 0); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const masters = MASTER_LINKS.map(([key, label, href, icon]) => ({ key, label, href, icon, count: n(key) }));
  const recentActivity = ACTIVITY_LOG.slice(0, 5);
  const totalMappings = MAPPING_LINKS.reduce((sum, [key]) => sum + n(key), 0);
  const totalMasterRecords = MASTER_LINKS.reduce((sum, [key]) => sum + n(key), 0);

  const kpis = [
    { label: 'Registered users', value: n('users'), icon: Users, tone: 'bg-bss-blue-tint text-bss-interactive-blue' },
    { label: 'Master records', value: totalMasterRecords, icon: BookOpenCheck, tone: 'bg-bss-blue-tint text-bss-interactive-blue' },
    { label: 'Employer mappings', value: totalMappings, icon: Link2, tone: 'bg-bss-soft-green text-bss-green' },
    { label: 'Pending user activations', value: 0, icon: TicketCheck, tone: 'bg-bss-soft-orange text-bss-orange' },
  ];

  return <div className="space-y-6 pb-10">
    <AdminPageHero
      eyebrow="System administration"
      title="BSS Admin"
      description="System-level masters, users, permissions and audit."
      icon={<ShieldCheck size={14}/>}
      actions={<Link href="/admin/activity" className="h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-colors backdrop-blur-sm">Activity Report <ArrowRight size={15}/></Link>}
    />

    {failed && <p role="alert" className="bss-alert bss-alert-error">Live master counts could not be loaded — showing zeros. Reload to retry.</p>}

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi, i) => <article key={kpi.label} className="bss-kpi-card bss-hover-lift bss-reveal" style={{ ['--bss-delay' as string]: `${i * 60}ms` }}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-bss-text-secondary">{kpi.label}</span><span className={`bss-kpi-icon ${kpi.tone}`}><kpi.icon size={16}/></span></div><strong>{kpi.value}</strong></article>)}
    </section>

    <div className="grid lg:grid-cols-3 gap-5 items-start">
      <div className="lg:col-span-2 space-y-5">
        {/* Masters grid */}
        <section className="bss-card bss-reveal rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><div><h2 className="text-sm font-semibold text-gray-950">Masters</h2><p className="text-xs text-gray-400 mt-0.5">Configuration masters with full CRUD — party, statutory, wage and compliance masters.</p></div></header>
          <div className="grid sm:grid-cols-2 gap-px bg-bss-border/60">{masters.map(master => <Link key={master.href} href={master.href} className="bg-white p-4 flex items-center gap-3 hover:bg-bss-bg group transition-colors"><span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 group-hover:text-bss-navy grid place-items-center flex-shrink-0"><master.icon size={17}/></span><span className="flex-1 min-w-0"><strong className="block text-sm font-semibold text-gray-900">{master.label}</strong><small className="block text-[11px] text-gray-400 mt-0.5">{master.count} record{master.count === 1 ? '' : 's'}</small></span><ArrowRight size={15} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0"/></Link>)}</div>
        </section>

        {/* Mappings */}
        <section className="bss-card bss-reveal rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Mappings</h2><p className="text-xs text-gray-400 mt-0.5">Employer/client-wise document, act and register mappings ({totalMappings} active mappings).</p></header>
          <div className="grid sm:grid-cols-3 gap-3 p-5">
            {MAPPING_LINKS.map(([key, label, href]) => (
              <Link key={href} href={href} className="rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30"><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-[11px] text-gray-400 mt-1">{n(key)} mapping(s)</p></Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="bss-card bss-reveal rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={15} className="text-indigo-700"/>Access control</h2><Link href="/admin/permissions" className="text-xs font-semibold text-blue-700">Manage</Link></header>
          <div className="p-5 space-y-3">
            <Link href="/admin/accounts" className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs hover:bg-gray-50"><span className="font-semibold text-gray-700">Users &amp; Accounts</span><span className="text-gray-400">{n('users')} users</span></Link>
            <Link href="/admin/permissions" className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs hover:bg-gray-50"><span className="font-semibold text-gray-700">Permission Page</span><span className="text-gray-400">user-wise menus</span></Link>
          </div>
        </section>

        <section className="bss-card bss-reveal rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><TicketCheck size={15} className="text-indigo-700"/>Support desk</h2><Link href="/admin/support-tickets" className="text-xs font-semibold text-blue-700">Open</Link></header>
          <div className="p-5"><Link href="/admin/support-tickets" className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs hover:bg-gray-50"><span className="font-semibold text-gray-700">Support tickets</span><span className="text-gray-400">{openTickets} open</span></Link></div>
        </section>

        <section className="bss-card bss-reveal rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Recent activity</h2></header>
          {recentActivity.length > 0
            ? <div className="divide-y divide-gray-100">{recentActivity.map(activity => <div key={String(activity.id)} className="p-4 flex gap-3"><span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center shrink-0 mt-0.5"><ShieldCheck size={14}/></span><div className="min-w-0"><p className="text-xs font-semibold text-gray-800">{activity.actor} · {activity.action} {activity.module}</p><p className="text-[11px] text-gray-400 mt-0.5 truncate">{String(activity.details)}</p><p className="text-[10px] font-mono text-gray-300 mt-0.5">{new Date(String(activity.timestamp)).toLocaleString('en-IN')}</p></div></div>)}</div>
            : <p className="p-5 text-xs text-gray-400 flex items-center gap-2"><AlertTriangle size={13}/>No activity recorded yet.</p>}
          <Link href="/admin/activity" className="h-10 border-t border-gray-100 text-xs font-semibold text-[#073B67] flex items-center justify-center hover:bg-gray-50">View full activity report</Link>
        </section>
      </aside>
    </div>
  </div>;
}
