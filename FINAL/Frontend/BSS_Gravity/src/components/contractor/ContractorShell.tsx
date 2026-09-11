"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Briefcase, Building2, ChevronDown, Database, FileText, Home, Menu, ScanLine, Settings, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import NotificationBell from '@/components/worker/NotificationBell';
import { useContractor } from '@/contexts/ContractorContext';
import { useLanguage } from '@/contexts/LanguageContext';

const groups = [
  { key:'nav.dashboard', href:'/contractor/dashboard', icon:Home },
  { key:'nav.master', icon:Database, items:[['nav.gatePass','/contractor/gate-pass'],['nav.rozgar','/contractor/rozgar'],['nav.compliance','/contractor/compliance'],['nav.workerMaster','/contractor/workers'],['nav.skills','/contractor/skills'],['nav.salaries','/contractor/salaries'],['nav.workerBenefits','/contractor/benefits'],['nav.submissions','/contractor/submissions']] },
  { key:'nav.operations', icon:Briefcase, items:[['nav.payroll','/contractor/payroll'],['nav.grievanceCentre','/contractor/grievances']] },
  { key:'nav.reports', icon:BarChart2, items:[['nav.complianceReport','/contractor/compliance-report']] },
  { key:'nav.qrSystem', icon:ScanLine, items:[['nav.myWorkers','/contractor/qr/workers'],['nav.myEmployers','/contractor/qr/employers'],['nav.bindingRequestsCentre','/contractor/qr/requests'],['nav.idCard','/contractor/idcard'],['nav.scanQr','/contractor/scan']] },
] as const;

export default function ContractorShell({ children }: { children:React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { contractor, employerScope, setEmployerScope } = useContractor();
  const { t } = useLanguage();

  // Close every popover on navigation (adjust state during render — the
  // documented pattern for reacting to prop/route changes without an effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpenMenu(null); setProfile(false); setMobile(false);
  }
  useEffect(() => {
    if (!openMenu && !profile && !mobile) return;
    const handler = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null); setProfile(false); setMobile(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [openMenu, profile, mobile]);

  const toggleMenu = (key: string) => setOpenMenu(current => (current === key ? null : key));
  const mobileItems = groups.reduce<Array<{ label:string; items:Array<readonly [string,string]> }>>((list, group) => list.concat('href' in group ? [{ label:group.key, items:[[group.key, group.href]] }] : [{ label:group.key, items:[...group.items] }]), []);

  return <div className="bss-shell min-h-screen text-[#1D1D1F] flex flex-col">
    <header ref={headerRef} className="bss-shell-header sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl border-b border-black/5">
      <div className="bss-shell-bar max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        <Link href="/contractor/dashboard" className="flex items-center gap-2 shrink-0" aria-label="Bharat Shram Setu contractor dashboard"><Image src="/bss-original-logo.png" width={154} height={40} className="h-6 w-auto" alt="Bharat Shram Setu"/><BrandText className="hidden lg:block text-base"/></Link>

        <nav aria-label={t('nav.primary')} className="bss-desktop-nav items-center gap-0.5">
          {groups.map(group => 'href' in group ? (
            <Link key={group.key} href={group.href} aria-current={pathname===group.href?'page':undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${pathname===group.href?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{t(group.key)}</Link>
          ) : (
            <div key={group.key} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={openMenu===group.key} onClick={()=>toggleMenu(group.key)} className={`px-3 py-2 rounded-full text-[13px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors duration-150 ${group.items.some(item=>pathname===item[1])||openMenu===group.key?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{t(group.key)}<ChevronDown size={12} className={`transition-transform ${openMenu===group.key?'rotate-180':''}`}/></button>
              {openMenu===group.key&&<div role="menu" className="absolute top-full left-0 pt-2 w-56 z-50"><div className="bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5">{group.items.map(item=>{const active=pathname===item[1];return <Link key={item[0]} href={item[1]} role="menuitem" aria-current={active?'page':undefined} onClick={()=>setOpenMenu(null)} className={`block px-3 py-2.5 rounded-lg text-[13px] ${active?'bg-[#073B67]/5 text-[#073B67] font-semibold':'text-gray-700 hover:bg-gray-50'}`}>{t(item[0])}</Link>;})}</div></div>}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <label className="hidden xl:flex items-center gap-2 relative" aria-label="Employer scope"><Building2 size={14} className="text-gray-400"/><select value={employerScope} onChange={e=>setEmployerScope(e.target.value)} className="h-10 rounded-lg border border-gray-200 pl-1 pr-2 text-xs font-semibold text-gray-700 bg-white hover:border-gray-300"><option value="all">All Employers</option>{contractor.employers.map(emp=><option key={emp.id} value={emp.name}>{emp.name}</option>)}</select></label>
          <div className="hidden lg:block"><LanguageSelect compact/></div>
          <NotificationBell viewAllHref="/contractor/dashboard"/>
          <div className="relative">
            <button type="button" aria-label={t('nav.settings')} aria-expanded={profile} onClick={()=>setProfile(value=>!value)} className="min-h-11 flex items-center gap-2 rounded-full hover:bg-black/5 p-1 pr-2"><span className="w-8 h-8 rounded-full bg-[#073B67] text-white flex items-center justify-center font-bold text-sm">{contractor.identity.company.charAt(0)}</span><span className="hidden xl:block text-sm font-semibold max-w-32 truncate">{contractor.identity.company}</span><ChevronDown size={14} className="text-gray-400"/></button>
            {profile&&<div role="menu" className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-gray-900/5 border border-gray-100 overflow-hidden z-50"><div className="px-4 py-3 border-b bg-gray-50/70"><p className="text-sm font-semibold">{contractor.identity.company}</p><p className="text-[11px] text-gray-500 font-mono mt-0.5">{contractor.identity.bssId}</p></div><div className="p-1.5"><Link href="/contractor/profile" className="flex items-center gap-2 px-3 py-2.5 text-[13px] rounded-lg hover:bg-gray-50"><Settings size={16}/>{t('nav.settings')}</Link><Link href="/contractor/settings" className="flex items-center gap-2 px-3 py-2.5 text-[13px] rounded-lg hover:bg-gray-50"><FileText size={16}/>Document Templates</Link><SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-red-600 rounded-lg hover:bg-red-50"/></div></div>}
          </div>
          <button type="button" className="bss-mobile-trigger" aria-label={t('nav.menu')} aria-expanded={mobile} onClick={()=>setMobile(value=>!value)}>{mobile?<X/>:<Menu/>}</button>
        </div>
      </div>

      {mobile&&<nav aria-label={t('nav.mobile')} className="bss-mobile-menu absolute left-0 w-full bg-white border-b shadow-xl p-4 pb-8">
        <div className="mb-3"><label className="text-[11px] uppercase font-bold text-gray-500 block mb-1">Employer scope</label><select value={employerScope} onChange={e=>setEmployerScope(e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm bg-white"><option value="all">All Employers</option>{contractor.employers.map(emp=><option key={emp.id} value={emp.name}>{emp.name}</option>)}</select></div>
        {mobileItems.map(group=>(
          <div key={group.label} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{t(group.label)}</p>
            {group.items.map(item=>{const active=pathname===item[1];return <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={()=>setMobile(false)} aria-current={active?'page':undefined} className={`block px-4 py-2.5 rounded-lg text-sm ${active?'bg-[#073B67]/5 text-[#073B67] font-semibold':'hover:bg-gray-50 text-gray-700'}`}>{t(item[0])}</Link>;})}
          </div>
        ))}
        <div className="px-4 pt-3 lg:hidden"><LanguageSelect/></div>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1200px] mx-auto py-6 md:py-10 px-4 md:px-8">{children}</main>
  </div>;
}
