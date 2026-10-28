"use client";

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Banknote, BookOpenCheck, ChevronDown, LifeBuoy, Link2, Menu, Users, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import { useLanguage } from '@/contexts/LanguageContext';

// Wage & statutory cost configuration (rates, minimum wage, cost sheets) is its
// own cluster — separate from the CLRA register library.
const wageCostGroup = { key: 'Wages & Statutory Cost', icon: Banknote, items: [
  ['Statutory Master', '/admin/masters/statutory'],
  ['Minimum Wage', '/admin/masters/minimum-wage'],
  ['Cost Sheet Templates', '/admin/masters/cost-sheet'],
  ['Professional Tax', '/admin/masters/professional-tax'],
  ['LWF', '/admin/masters/lwf'],
  ['License Management', '/admin/masters/license'],
] as const };
const clraGroup = { key: 'CLRA Registers', icon: BookOpenCheck, items: [
  ['CLRA Templates', '/admin/masters/register-template'],
  ['State Applicability', '/admin/masters/state-applicability'],
  ['Compliance Master', '/admin/masters/compliance'],
  ['Medical Forms', '/admin/masters/medical-forms'],
] as const };
const partyGroup = { key: 'Party & Templates', icon: BookOpenCheck, items: [
  ['Party Master', '/admin/masters/party'],
  ['Letter Templates', '/admin/masters/letter-templates'],
] as const };
const mappingsGroup = { key: 'Mappings', icon: Link2, items: [
  ['Employer Document Mapping', '/admin/mappings/employer-document'],
  ['Employer Act Mapping', '/admin/mappings/employer-act'],
  ['Employer Register Mapping', '/admin/mappings/employer-register'],
] as const };
const accessGroup = { key: 'Users & Access', icon: Users, items: [
  ['Permission Page', '/admin/permissions'],
  ['Onboarding', '/admin/onboarding'],
  ['Identity Verifications', '/admin/verifications'],
  ['GST Claims', '/admin/gst-claims'],
  ['Users & Accounts', '/admin/accounts'],
] as const };
const auditOpsGroup = { key: 'Audit & Reports', icon: BookOpenCheck, items: [
  ['Courses & Skills', '/admin/courses'],
  ['Activity Report', '/admin/activity'],
  ['AI Audit Settings', '/admin/audit-settings'],
  ['Attendance Camera Limits', '/admin/cctv'],
  ['Translation', '/admin/translation-settings'],
] as const };
const supportGroup = { key: 'Support', icon: LifeBuoy, items: [
  ['Support Tickets', '/admin/support-tickets'],
] as const };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const groups = [wageCostGroup, clraGroup, partyGroup, mappingsGroup, accessGroup, auditOpsGroup, supportGroup];
  const flat = groups.reduce<Array<readonly [string, string]>>((acc, g) => acc.concat(g.items as unknown as readonly [string, string][]), []);

  const itemActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return <div className="bss-shell min-h-screen text-[#15212B] flex flex-col">
    <header className="bss-shell-header sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="bss-shell-bar w-full max-w-[1536px] mx-auto px-3 md:px-6 h-16 flex items-center justify-between gap-2">
        <Link href="/admin" className="flex items-center gap-1.5 shrink-0"><Image src="/bss-original-logo.png" width={154} height={40} className="h-7 md:h-8 w-auto" alt="Bharat Shram Setu"/><BrandText className="hidden 2xl:block text-base"/></Link>
        <nav aria-label="Admin navigation" className="bss-desktop-nav flex-1 items-center justify-center gap-0.5 xl:gap-1 px-1">
          <Link href="/admin" aria-current={pathname === '/admin' ? 'page' : undefined} className={`px-2 xl:px-2.5 py-1 rounded-full text-xs xl:text-[13px] font-medium whitespace-nowrap ${pathname === '/admin' ? 'bg-bss-navy text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>Overview</Link>
          <Link href="/admin/payroll" aria-current={itemActive('/admin/payroll') ? 'page' : undefined} className={`px-2 xl:px-2.5 py-1 rounded-full text-xs xl:text-[13px] font-medium whitespace-nowrap inline-flex items-center gap-1 ${itemActive('/admin/payroll') ? 'bg-bss-navy text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}><Banknote size={13}/>Payroll</Link>
          {groups.map((group, idx) => (
            <div key={group.key} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={openMenu === group.key} onClick={() => setOpenMenu(openMenu === group.key ? null : group.key)} className={`px-2 xl:px-2.5 py-1 rounded-full text-xs xl:text-[13px] font-medium flex items-center gap-0.5 whitespace-nowrap ${group.items.some(item => itemActive(item[1])) || openMenu === group.key ? 'bg-bss-navy text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>{t(group.key)}<ChevronDown size={11} className={`transition-transform ${openMenu === group.key ? 'rotate-180' : ''}`}/></button>
              {openMenu === group.key && (
                <div role="menu" className={`absolute top-full pt-2 w-60 z-50 ${idx >= groups.length - 2 ? 'right-0' : 'left-0'}`}>
                  <div className="bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5">
                    {group.items.map(item => (
                      <Link key={`${item[0]}-${item[1]}`} href={item[1]} role="menuitem" onClick={() => setOpenMenu(null)} className={`block px-3 py-2.5 rounded-lg text-[13px] ${itemActive(item[1]) ? 'bg-[#073B67]/5 text-[#073B67] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>{item[0]}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:block shrink-0"><LanguageSelect compact/></div>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setProfile(v => !v)} aria-expanded={profile} className="h-8 px-2 flex items-center gap-1.5 rounded-full transition-colors duration-150 hover:bg-bss-blue-tint/60 bg-white border border-bss-border">
              <span className="w-6 h-6 rounded-full bg-bss-navy text-white flex items-center justify-center font-bold text-[11px]">A</span>
              <span className="hidden 2xl:block text-xs font-semibold text-bss-navy">BSS Admin</span>
              <ChevronDown size={12} className="text-slate-500"/>
            </button>
            {profile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl p-1 z-[9999]">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-semibold text-xs text-gray-900">BSS Admin</p>
                  <p className="text-[10px] text-gray-500 font-mono">BSSAD2026ADM00001</p>
                </div>
                <SignOutButton className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 rounded-lg hover:bg-red-50 font-semibold"/>
              </div>
            )}
          </div>
          <button type="button" className="bss-mobile-trigger shrink-0" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile(v => !v)}>{mobile ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {mobile && <nav aria-label="Mobile navigation" className="bss-mobile-menu absolute top-16 w-full bg-white border-b shadow-xl p-4">
        <Link href="/admin" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">Overview</Link>
        <Link href="/admin/payroll" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-bss-interactive-blue hover:bg-bss-bg">Payroll</Link>
        {flat.map(item => <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">{item[0]}</Link>)}
        <Link href="/admin/activity" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">Activity Report</Link>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1280px] mx-auto py-6 md:py-8 px-4 md:px-8">{children}</main>
  </div>;
}
