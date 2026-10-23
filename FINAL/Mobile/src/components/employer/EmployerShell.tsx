"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ClipboardCheck, FileSpreadsheet, FileText, LayoutDashboard, LifeBuoy, Menu, Network, Settings, ShieldCheck, X, Banknote, Calculator, Stethoscope, HardHat, UserCog } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import NotificationBell from '@/components/worker/NotificationBell';
import MpinSetupGate from '@/components/auth/MpinSetupGate';
import { useEmployer } from '@/contexts/EmployerContext';
import { useLanguage } from '@/contexts/LanguageContext';

const workforceGroup = { key:'nav.workforce', icon:Network, items:[
  ['nav.workers','/employer/workers'],
  ['nav.contractors','/employer/contractors'],
  ['Attendance','/employer/attendance'],
  ['nav.pastRecords','/employer/history'],
  ['nav.gatePass','/employer/gate-pass'],['Gate Scan','/employer/gate-scan'],['Welfare & Safety','/employer/worker-compliance-checklists'],
  ['nav.grievanceCentre','/employer/grievances'],['Contact BSS','/employer/contact'],
] };
const sitesGroup = { key:'nav.sites', icon:LayoutDashboard, items:[
  ['nav.mySites','/employer/sites'],
  ['nav.siteOverview','/employer/site-overview'],
  ['CCTV Setup','/employer/cctv-setup'],
] };
const complianceGroup = { key:'nav.compliance', icon:ClipboardCheck, items:[
  ['nav.complianceSubmission','/employer/compliance-submission'],
  ['Onboarding','/employer/onboarding'],
  ['Licences','/employer/licenses'],
  ['Monthly Audit','/employer/audit-reports'],
] };
const qrGroup = { key:'nav.qrSystem', icon:Network, items:[
  ['nav.myWorkers','/employer/workers'],
  ['nav.myContractors','/employer/qr/contractors'],
  ['SAP Settings','/employer/sap-settings'],
  ['nav.bindingRequests','/employer/qr/requests'],
  ['nav.idCard','/employer/idcard'],
  ['nav.scanQr','/employer/scan'],
] };
export default function EmployerShell({ children }: { children:React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const { employer } = useEmployer();
  const { t } = useLanguage();
  const isStaff = Boolean(employer.isStaff);
  const staffPerms = employer.staffPermissions ?? [];
  const staffGroups = [
    ...(staffPerms.includes('medical') ? [{ key: 'Medical', href: '/employer/worker-compliance-checklists?tab=medical', icon: Stethoscope }] : []),
    ...(staffPerms.includes('safety') ? [{ key: 'Health & Safety', href: '/employer/worker-compliance-checklists?tab=safety', icon: HardHat }] : []),
    ...(staffPerms.includes('gate_pass') ? [{ key: 'Gate Pass', href: '/employer/gate-pass', icon: ShieldCheck }] : []),
    ...(staffPerms.includes('compliance') ? [
      { key: 'Compliance Review', href: '/employer/compliance-submission', icon: ClipboardCheck },
      { key: 'Monthly Audit', href: '/employer/audit-reports', icon: FileSpreadsheet },
    ] : []),
  ];
  const groups = isStaff ? staffGroups : [ { key:'nav.dashboard', href:'/employer/dashboard', icon:LayoutDashboard }, workforceGroup, sitesGroup, { key:'nav.payroll', href:'/employer/payroll', icon:Banknote }, complianceGroup, qrGroup ];
  const mobileItems = groups.reduce<Array<readonly [string,string]>>((items, group) => items.concat('href' in group ? [[group.key, group.href]] : group.items as unknown as readonly [string,string][]), []);

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

  return <div className="bss-shell min-h-screen text-[#1D1D1F] flex flex-col">
    <header ref={headerRef} className="bss-shell-header sticky top-0 z-50 bg-white border-b border-bss-border shadow-[0_1px_3px_0_rgba(100,116,139,0.18)]">
      <div className="bss-shell-bar w-full max-w-[1200px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between min-[1181px]:justify-center gap-5">
        <Link href="/employer/dashboard" className="flex items-center gap-2 shrink-0">
          <Image src="/bss-original-logo.png" width={154} height={40} className="h-9 sm:h-8 w-auto" alt="Bharat Shram Setu"/>
          <BrandText className="hidden lg:block text-base"/>
        </Link>
        <div className="min-w-0 flex items-center justify-center gap-4 mx-4 md:mx-8">
          <nav aria-label={t('nav.primary')} className="bss-desktop-nav items-center gap-1.5">
          {groups.map(group => 'href' in group
            ? <Link key={group.key} href={group.href} aria-current={pathname === group.href ? 'page' : undefined} className={`inline-flex items-center whitespace-nowrap px-2.5 py-2 rounded-full text-[12.5px] leading-none font-medium ${pathname === group.href ? 'bg-bss-navy text-white' : 'text-bss-text-secondary transition-colors duration-150 hover:bg-bss-bg'}`}>{t(group.key)}</Link>
            : <div key={group.key} className="relative">
                <button type="button" aria-haspopup="menu" aria-expanded={openMenu === group.key} onClick={() => toggleMenu(group.key)} className={`inline-flex items-center whitespace-nowrap px-2.5 py-2 rounded-full text-[12.5px] leading-none font-medium gap-1 ${group.items.some(item => pathname === item[1]) || openMenu === group.key ? 'bg-bss-navy text-white' : 'text-bss-text-secondary transition-colors duration-150 hover:bg-bss-bg'}`}>{t(group.key)}<ChevronDown size={12} className={`transition-transform ${openMenu === group.key ? 'rotate-180' : ''}`}/></button>
                {openMenu === group.key && <div role="menu" className="absolute top-full left-0 pt-2 w-56 z-50">
                  <div className="bg-white border border-bss-border rounded-xl shadow-xl p-1">
                    {group.items.map(item => <Link key={item[0]} href={item[1]} role="menuitem" onClick={() => setOpenMenu(null)} className="block px-3 py-2.5 rounded-lg text-xs hover:bg-bss-bg">{t(item[0])}</Link>)}
                  </div>
                </div>}
              </div>)}
          </nav>
          <div className="hidden sm:block shrink-0"><LanguageSelect compact/></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell viewAllHref="/employer/notifications"/>
          <div className="relative">
            <button type="button" onClick={() => setProfile(value => !value)} aria-expanded={profile} className="min-h-11 flex items-center gap-2 rounded-full transition-colors duration-150 hover:bg-bss-bg p-1 pr-2">
              <span className="w-8 h-8 rounded-full bg-[#01183A] text-white flex items-center justify-center font-bold">{employer.identity.company.charAt(0)}</span>
              <span className="hidden xl:block text-sm font-semibold max-w-32 truncate">{employer.identity.company}</span>
              <ChevronDown size={14}/>
            </button>
            {profile && <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-bss-border rounded-xl shadow-xl p-1">
              <div className="p-3 border-b border-bss-border"><p className="font-semibold text-sm">{employer.identity.company}</p><p className="text-xs text-bss-text-muted font-mono mt-0.5">{employer.identity.bssId}</p>{isStaff && <p className="text-[10px] text-bss-text-muted mt-1">Staff · {employer.staffProfile?.name ?? employer.identity.company}</p>}</div>
              {!isStaff && <>
              <Link href="/employer/profile" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><Settings size={16}/>{t('nav.profile')}</Link>
              <Link href="/employer/onboarding" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><FileSpreadsheet size={16}/>Onboarding</Link>
              {employer.canAccessAdmin && <Link href="/employer/manage-staff" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><UserCog size={16}/>Staff Accounts</Link>}
              <Link href="/employer/clra-registers" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><ClipboardCheck size={16}/>Registers Adoption</Link>
              <Link href="/employer/letter-adoption" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><FileText size={16}/>Appointment Letter Adoption</Link>
              <Link href="/employer/cost-sheets" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><Calculator size={16}/>Cost Sheet Adoption</Link>
              <Link href="/employer/medical-form-adoption" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><ShieldCheck size={16}/>Medical Form Adoption</Link>
              <Link href="/employer/templates" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><FileText size={16}/>{t('nav.templates')}</Link>
              <Link href="/employer/settings" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><Settings size={16}/>{t('nav.settings')}</Link>
              </>}
              <Link href="/employer/contact" onClick={() => setProfile(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-bss-bg"><LifeBuoy size={16}/>Contact BSS Support</Link>
              <SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-bss-error rounded-lg hover:bg-bss-soft-orange"/>
            </div>}
          </div>
          <button type="button" className="bss-mobile-trigger" aria-label={t('nav.menu')} aria-expanded={mobile} onClick={() => setMobile(value => !value)}>{mobile ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {mobile && <nav aria-label={t('nav.mobile')} className="bss-mobile-menu absolute top-16 w-full bg-white border-b border-bss-border shadow-xl p-4">
        {mobileItems.map(item => <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-bss-bg">{t(item[0])}</Link>)}
        {!isStaff && <Link href="/employer/profile" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-bss-bg">{t('nav.profile')}</Link>}
        {!isStaff && <Link href="/employer/templates" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-bss-bg">{t('nav.templates')}</Link>}
        {!isStaff && <Link href="/employer/settings" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-bss-bg">{t('nav.settings')}</Link>}
        <Link href="/employer/contact" onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-bss-bg">Contact BSS Support</Link>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-bss-error"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1200px] mx-auto py-6 md:py-10 px-4 md:px-8">{children}</main>
    <MpinSetupGate />
  </div>;
}
