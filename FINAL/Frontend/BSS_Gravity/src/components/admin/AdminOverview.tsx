"use client";

import Link from 'next/link';
import { AlertTriangle, ArrowRight, BookOpenCheck, FileText, Landmark, Link2, ShieldCheck, TicketCheck, UserRound, Users } from 'lucide-react';
import { ACTIVITY_LOG, COMPLIANCE_MASTER, DOCUMENT_MASTER, EMPLOYER_ACT_MAPPING, EMPLOYER_DOCUMENT_MAPPING, EMPLOYER_REGISTER_MAPPING, LICENSE_MASTER, LWF_MASTER, MINIMUM_WAGE_MASTER, PARTY_MASTER, PT_MASTER, REGISTER_DOC_MASTER, USERS_MASTER } from '@/data/adminMasters';

export default function AdminOverview() {
  const masters = [
    { label: 'Party Master', count: PARTY_MASTER.rows.length, href: '/admin/masters/party', icon: Users },
    { label: 'Professional Tax', count: PT_MASTER.rows.length, href: '/admin/masters/professional-tax', icon: Landmark },
    { label: 'LWF Master', count: LWF_MASTER.rows.length, href: '/admin/masters/lwf', icon: Landmark },
    { label: 'License Management', count: LICENSE_MASTER.rows.length, href: '/admin/masters/license', icon: FileText },
    { label: 'Minimum Wage', count: MINIMUM_WAGE_MASTER.rows.length, href: '/admin/masters/minimum-wage', icon: FileText },
    { label: 'Document Master', count: DOCUMENT_MASTER.rows.length, href: '/admin/masters/document', icon: FileText },
    { label: 'Compliance Master', count: COMPLIANCE_MASTER.rows.length, href: '/admin/masters/compliance', icon: ShieldCheck },
    { label: 'Register Doc Master', count: REGISTER_DOC_MASTER.rows.length, href: '/admin/masters/register-doc', icon: BookOpenCheck },
  ];
  const pendingUsers = USERS_MASTER.rows.filter(r => String(r.status) === 'Pending').length;
  const inactiveLicenses = LICENSE_MASTER.rows.filter(r => String(r.status) === 'Inactive').length;
  const inactiveParties = PARTY_MASTER.rows.filter(r => String(r.status) === 'Inactive').length;
  const recentActivity = ACTIVITY_LOG.slice(0, 5);
  const totalMappings = EMPLOYER_DOCUMENT_MAPPING.rows.length + EMPLOYER_ACT_MAPPING.rows.length + EMPLOYER_REGISTER_MAPPING.rows.length;

  const kpis = [
    { label: 'Registered users', value: USERS_MASTER.rows.length, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Master records', value: masters.reduce((s, m) => s + m.count, 0), icon: BookOpenCheck, tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Employer mappings', value: totalMappings, icon: Link2, tone: 'bg-green-50 text-green-700' },
    { label: 'Pending user activations', value: pendingUsers, icon: TicketCheck, tone: 'bg-orange-50 text-orange-700' },
  ];

  const actions = [
    { count: pendingUsers, label: 'user registration(s) pending activation', href: '/admin/users', severity: pendingUsers ? 'orange' : 'green' },
    { count: inactiveLicenses, label: 'license(s) inactive / need review', href: '/admin/masters/license', severity: inactiveLicenses ? 'orange' : 'green' },
    { count: inactiveParties, label: 'party(ies) inactive / expired validity', href: '/admin/masters/party', severity: inactiveParties ? 'red' : 'green' },
  ].filter(a => a.count > 0);

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">System administration</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">BSS Admin</h1><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">High-privilege role</span></div><p className="text-sm text-gray-500 mt-1">System-level masters, users, permissions and audit.</p></div>
      <Link href="/admin/activity" className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black">Activity Report <ArrowRight size={15}/></Link>
    </header>

    <section className="bss-kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(kpi => <article key={kpi.label} className="bss-kpi-card"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{kpi.label}</span><span className={`bss-kpi-icon ${kpi.tone}`}><kpi.icon size={16}/></span></div><strong>{kpi.value}</strong></article>)}
    </section>

    {actions.length > 0 && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden"><header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500"/><h2 className="text-sm font-semibold text-gray-950">Action Required</h2></header><div className="divide-y divide-gray-100">{actions.map(a => <Link key={a.label} href={a.href} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"><div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${a.severity === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}/><p className="text-sm text-gray-700"><strong className="text-gray-900">{a.count}</strong> {a.label}</p></div><ArrowRight size={15} className="text-gray-300"/></Link>)}</div></section>}

    <div className="grid lg:grid-cols-3 gap-5 items-start">
      <div className="lg:col-span-2 space-y-5">
        {/* Masters grid */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><div><h2 className="text-sm font-semibold text-gray-950">Masters</h2><p className="text-xs text-gray-400 mt-0.5">Configuration masters with full CRUD — party, statutory, wage and compliance masters.</p></div></header>
          <div className="grid sm:grid-cols-2 gap-px bg-gray-100">{masters.map(master => <Link key={master.href} href={master.href} className="bg-white p-4 flex items-center gap-3 hover:bg-gray-50 group"><span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 group-hover:text-[#073B67] grid place-items-center flex-shrink-0"><master.icon size={17}/></span><span className="flex-1 min-w-0"><strong className="block text-sm font-semibold text-gray-900">{master.label}</strong><small className="block text-[11px] text-gray-400 mt-0.5">{master.count} record{master.count === 1 ? '' : 's'}</small></span><ArrowRight size={15} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0"/></Link>)}</div>
        </section>

        {/* Mappings */}
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Mappings</h2><p className="text-xs text-gray-400 mt-0.5">Employer/client-wise document, act and register mappings ({totalMappings} active mappings).</p></header>
          <div className="grid sm:grid-cols-3 gap-3 p-5">
            {([['Employer Document Mapping', '/admin/mappings/employer-document', EMPLOYER_DOCUMENT_MAPPING.rows.length], ['Employer Act Mapping', '/admin/mappings/employer-act', EMPLOYER_ACT_MAPPING.rows.length], ['Employer Register Mapping', '/admin/mappings/employer-register', EMPLOYER_REGISTER_MAPPING.rows.length]] as Array<[string, string, number]>).map(([label, href, count]) => (
              <Link key={href} href={href} className="rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30"><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-[11px] text-gray-400 mt-1">{count} mapping(s)</p></Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-sm font-semibold text-gray-950 flex items-center gap-2"><ShieldCheck size={15} className="text-indigo-700"/>Access control</h2><Link href="/admin/permissions" className="text-xs font-semibold text-blue-700">Manage</Link></header>
          <div className="p-5 space-y-3">
            <Link href="/admin/users" className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs hover:bg-gray-50"><span className="font-semibold text-gray-700">User Registration</span><span className="text-gray-400">{USERS_MASTER.rows.length} users</span></Link>
            <Link href="/admin/permissions" className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-xs hover:bg-gray-50"><span className="font-semibold text-gray-700">Permission Page</span><span className="text-gray-400">user-wise menus</span></Link>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Recent activity</h2></header>
          <div className="divide-y divide-gray-100">{recentActivity.map(activity => <div key={String(activity.id)} className="p-4 flex gap-3"><span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center shrink-0 mt-0.5"><ShieldCheck size={14}/></span><div className="min-w-0"><p className="text-xs font-semibold text-gray-800">{activity.actor} · {activity.action} {activity.module}</p><p className="text-[11px] text-gray-400 mt-0.5 truncate">{String(activity.details)}</p><p className="text-[10px] font-mono text-gray-300 mt-0.5">{new Date(String(activity.timestamp)).toLocaleString('en-IN')}</p></div></div>)}</div>
          <Link href="/admin/activity" className="h-10 border-t border-gray-100 text-xs font-semibold text-[#073B67] flex items-center justify-center hover:bg-gray-50">View full activity report</Link>
        </section>
      </aside>
    </div>
  </div>;
}
