"use client";

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Banknote, BookOpenCheck, ChevronDown, Link2, Menu, Users, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import { useLanguage } from '@/contexts/LanguageContext';

const mastersGroup = { key: 'Masters', icon: BookOpenCheck, items: [
  ['Party Master', '/admin/masters/party'],
  ['Professional Tax', '/admin/masters/professional-tax'],
  ['LWF', '/admin/masters/lwf'],
  ['License Management', '/admin/masters/license'],
  ['Minimum Wage', '/admin/masters/minimum-wage'],
  ['Document Master', '/admin/masters/document'],
  ['Compliance Master', '/admin/masters/compliance'],
  ['Register Doc Master', '/admin/masters/register-doc'],
  ['Register Templates', '/admin/masters/register-template'],
  ['State Applicability', '/admin/masters/state-applicability'],
] as const };
const mappingsGroup = { key: 'Mappings', icon: Link2, items: [
  ['Employer Document Mapping', '/admin/mappings/employer-document'],
  ['Employer Act Mapping', '/admin/mappings/employer-act'],
  ['Employer Register Mapping', '/admin/mappings/employer-register'],
] as const };
const accessGroup = { key: 'Users & Access', icon: Users, items: [
  ['User Registration', '/admin/users'],
  ['Permission Page', '/admin/permissions'],
] as const };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const groups = [mastersGroup, mappingsGroup, accessGroup];
  const flat = groups.reduce<Array<readonly [string, string]>>((acc, g) => acc.concat(g.items as unknown as readonly [string, string][]), []);

  const itemActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return <div className="bss-shell min-h-screen text-[#15212B] flex flex-col">
    <header className="bss-shell-header sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="bss-shell-bar max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-2 shrink-0"><Image src="/bss-original-logo.png" width={154} height={40} className="h-8 w-auto" alt="Bharat Shram Setu"/><BrandText className="hidden lg:block text-base"/></Link>
        <nav aria-label="Admin navigation" className="bss-desktop-nav items-center gap-1">
          <Link href="/admin" aria-current={pathname === '/admin' ? 'page' : undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap ${pathname === '/admin' ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>Overview</Link>
          <Link href="/admin/payroll" aria-current={itemActive('/admin/payroll') ? 'page' : undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${itemActive('/admin/payroll') ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}><Banknote size={14}/>Payroll</Link>
          {groups.map(group => (
            <div key={group.key} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={openMenu === group.key} onClick={() => setOpenMenu(openMenu === group.key ? null : group.key)} className={`px-3 py-2 rounded-full text-[13px] font-medium flex items-center gap-1 whitespace-nowrap ${group.items.some(item => itemActive(item[1])) || openMenu === group.key ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>{t(group.key)}<ChevronDown size={12} className={`transition-transform ${openMenu === group.key ? 'rotate-180' : ''}`}/></button>
              {openMenu === group.key && <div role="menu" className="absolute top-full left-0 pt-2 w-60 z-50"><div className="bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5">{group.items.map(item => <Link key={`${item[0]}-${item[1]}`} href={item[1]} role="menuitem" onClick={() => setOpenMenu(null)} className={`block px-3 py-2.5 rounded-lg text-[13px] ${itemActive(item[1]) ? 'bg-[#073B67]/5 text-[#073B67] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>{item[0]}</Link>)}</div></div>}
            </div>
          ))}
          <Link href="/admin/activity" aria-current={pathname.startsWith('/admin/activity') ? 'page' : undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap ${pathname.startsWith('/admin/activity') ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>Activity Report</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><LanguageSelect compact/></div>
          <div className="relative">
            <button type="button" onClick={() => setProfile(v => !v)} aria-expanded={profile} className="min-h-11 flex items-center gap-2 rounded-full transition-colors duration-150 hover:bg-gray-100 p-1 pr-2"><span className="w-8 h-8 rounded-full bg-[#073B67] text-white flex items-center justify-center font-bold">A</span><span className="hidden xl:block text-sm font-semibold">BSS Admin</span><ChevronDown size={14}/></button>
            {profile && <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-xl shadow-xl p-1"><div className="p-3 border-b"><p className="font-semibold text-sm">BSS Admin</p><p className="text-xs text-gray-500 font-mono">BSSAD2026ADM00001</p></div><SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50"/></div>}
          </div>
          <button type="button" className="bss-mobile-trigger" aria-label="Menu" aria-expanded={mobile} onClick={() => setMobile(v => !v)}>{mobile ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {mobile && <nav aria-label="Mobile navigation" className="bss-mobile-menu absolute top-16 w-full bg-white border-b shadow-xl p-4">
        <Link href="/admin" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">Overview</Link>
        <Link href="/admin/payroll" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-[#073B67] hover:bg-gray-50">Payroll</Link>
        {flat.map(item => <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">{item[0]}</Link>)}
        <Link href="/admin/activity" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50">Activity Report</Link>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1280px] mx-auto py-6 md:py-8 px-4 md:px-8">{children}</main>
  </div>;
}
