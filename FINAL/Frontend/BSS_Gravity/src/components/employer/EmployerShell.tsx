"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, ChevronDown, ClipboardCheck, FileText, LayoutDashboard, Menu, Network, Settings, ShieldCheck, X, Banknote } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import NotificationBell from '@/components/worker/NotificationBell';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';

const workforceGroup = { key:'nav.workforce', icon:Network, items:[
  ['nav.workers','/employer/workers'],
  ['nav.contractors','/employer/contractors'],
  ['nav.engagements','/employer/engagements'],
  ['nav.gatePass','/employer/gate-pass'],
  ['nav.grievanceCentre','/employer/grievances'],
] };
const sitesGroup = { key:'nav.sites', icon:LayoutDashboard, items:[
  ['nav.mySites','/employer/sites'],
  ['nav.siteOverview','/employer/site-overview'],
] };
const complianceGroup = { key:'nav.compliance', icon:ClipboardCheck, items:[
  ['nav.contractorCompliance','/employer/compliance'],
  ['nav.labourCompliance','/employer/labour-compliance'],
  ['nav.complianceSubmission','/employer/compliance-submission'],
  ['nav.complianceReport','/employer/compliance-report'],
] };
const qrGroup = { key:'nav.qrSystem', icon:Network, items:[
  ['nav.myWorkers','/employer/qr/workers'],
  ['nav.myContractors','/employer/qr/contractors'],
  ['nav.bindingRequests','/employer/qr/requests'],
  ['nav.qrMySites','/employer/qr/sites'],
  ['nav.ecswBindings','/employer/bindings'],
  ['nav.idCard','/employer/idcard'],
  ['nav.scanQr','/employer/scan'],
] };
const adminGroup = { key:'nav.administration', icon:ShieldCheck, items:[
  ['nav.adminContractors','/employer/admin/contractors'],
  ['nav.userManagement','/employer/admin/users'],
  ['nav.permissions','/employer/admin/permissions'],
  ['nav.siteManagement','/employer/admin/sites'],
  ['nav.workerDocuments','/employer/admin/documents'],
  ['nav.auditLog','/employer/admin/audit'],
  ['nav.transport','/employer/admin/transport'],
] };

export default function EmployerShell({ children }: { children:React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const pathname = usePathname();
  const { employer } = useEmployer();
  const { t } = useLanguage();
  const groups = [ { key:'nav.dashboard', href:'/employer/dashboard', icon:LayoutDashboard }, workforceGroup, sitesGroup, { key:'nav.payroll', href:'/employer/payroll', icon:Banknote }, complianceGroup, qrGroup, { key:'nav.reports', href:'/employer/reports', icon:BarChart2 }, ...(employer.canAccessAdmin ? [adminGroup] : []) ];
  const mobileItems = groups.reduce<Array<readonly [string,string]>>((items, group) => items.concat('href' in group ? [[group.key, group.href]] : group.items as unknown as readonly [string,string][]), []);

  return <div className="bss-shell min-h-screen text-[#1D1D1F] flex flex-col">
    <header className="bss-shell-header sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="bss-shell-bar max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/employer/dashboard" className="flex items-center gap-2 shrink-0">
          <Image src="/bss-original-logo.png" width={154} height={40} className="h-8 w-auto" alt="Bharat Shram Setu"/>
          <BrandText className="hidden lg:block text-base"/>
        </Link>
        <nav aria-label={t('nav.primary')} className="bss-desktop-nav gap-1">
          {groups.map(group => 'href' in group
            ? <Link key={group.key} href={group.href} aria-current={pathname === group.href ? 'page' : undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium ${pathname === group.href ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>{t(group.key)}</Link>
            : <div key={group.key} className="relative group">
                <button type="button" className={`px-3 py-2 rounded-full text-[13px] font-medium ${group.items.some(item => pathname === item[1]) ? 'bg-gray-950 text-white' : 'text-gray-600 transition-colors duration-150 hover:bg-gray-100'}`}>{t(group.key)}</button>
                <div className="hidden group-hover:block group-focus-within:block absolute top-full left-0 pt-2 w-56">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-1">
                    {group.items.map(item => <Link key={item[0]} href={item[1]} className="block px-3 py-2.5 rounded-lg text-xs hover:bg-gray-50">{t(item[0])}</Link>)}
                  </div>
                </div>
              </div>)}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><LanguageSelect compact/></div>
          <NotificationBell viewAllHref="/employer/approvals"/>
          <div className="relative">
            <button type="button" onClick={() => setProfile(value => !value)} aria-expanded={profile} className="min-h-11 flex items-center gap-2 rounded-full transition-colors duration-150 hover:bg-gray-100 p-1 pr-2">
              <span className="w-8 h-8 rounded-full bg-[#073B67] text-white flex items-center justify-center font-bold">{employer.identity.company.charAt(0)}</span>
              <span className="hidden xl:block text-sm font-semibold max-w-32 truncate">{employer.identity.company}</span>
              <ChevronDown size={14}/>
            </button>
            {profile && <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-1">
              <div className="p-3 border-b border-gray-100"><p className="font-semibold text-sm">{employer.identity.company}</p><p className="text-xs text-gray-500 font-mono mt-0.5">{employer.identity.bssId}</p></div>
              <Link href="/employer/profile" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50"><Settings size={16}/>{t('nav.settings')}</Link>
              <Link href="/employer/settings" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-gray-50"><FileText size={16}/>Document Templates</Link>
              <SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50"/>
            </div>}
          </div>
          <button type="button" className="bss-mobile-trigger" aria-label={t('nav.menu')} aria-expanded={mobile} onClick={() => setMobile(value => !value)}>{mobile ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {mobile && <nav aria-label={t('nav.mobile')} className="bss-mobile-menu absolute top-16 w-full bg-white border-b border-gray-200 shadow-xl p-4">
        {mobileItems.map(item => <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">{t(item[0])}</Link>)}
        <Link href="/employer/profile" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">{t('nav.settings')}</Link>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1200px] mx-auto py-6 md:py-10 px-4 md:px-8">{children}</main>
  </div>;
}
