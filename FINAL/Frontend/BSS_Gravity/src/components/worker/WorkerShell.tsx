"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, CheckSquare, ChevronDown, FileText, Handshake, Home, Menu, MessageSquareText, ScanLine, Settings, UserRound, X } from 'lucide-react';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import NotificationBell from '@/components/worker/NotificationBell';
import { SignOutButton } from '@/components/auth/SignOutButton';
import MobileClaimModal from '@/components/worker/MobileClaimModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';

const groups = [
  { key:'nav.dashboard', href:'/worker', icon:Home },
  { key:'nav.rozgar', href:'/worker/rozgar', icon:Briefcase },
  { key:'nav.bindingRequests', href:'/worker/binding', icon:Handshake },
  { key:'nav.work', icon:CheckSquare, items:[['nav.attendance','/worker/Attendance'],['nav.leave','/worker/Leave'],['nav.skills','/worker/Skills'],['nav.holidays','/worker/Holidays']] },
  { key:'nav.records', icon:FileText, items:[['nav.profile','/worker/Profile'],['nav.documents','/worker/Documents'],['nav.issuedLetters','/worker/IssuedLetters'],['nav.complianceWelfare','/worker/Compliance'],['nav.earnings','/worker/Earnings'],['nav.benefits','/worker/Benefits']] },
  { key:'nav.qrIdentity', icon:ScanLine, items:[['nav.idCard','/worker/idcard'],['nav.orderCard','/worker/OrderCard']] },
  { key:'nav.grievances', href:'/worker/grievances', icon:MessageSquareText },
] as const;

export default function WorkerShell({ children }: { children:React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { worker } = useWorker();

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
        <Link href="/worker" className="flex items-center gap-2 shrink-0" aria-label="Bharat Shram Setu dashboard"><Image src="/bss-original-logo.png" width={154} height={40} className="h-6 w-auto" alt="Bharat Shram Setu"/><BrandText className="hidden lg:block text-base"/></Link>

        <nav aria-label={t('nav.primary')} className="bss-desktop-nav items-center gap-0.5">
          {groups.map(group => 'href' in group ? (
            <Link key={group.key} href={group.href} aria-current={pathname===group.href?'page':undefined} className={`cursor-pointer px-3 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${pathname===group.href?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{t(group.key)}</Link>
          ) : (
            <div key={group.key} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={openMenu===group.key} onClick={()=>toggleMenu(group.key)} className={`cursor-pointer px-3 py-2 rounded-full text-[13px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors duration-150 ${group.items.some(item=>pathname===item[1])||openMenu===group.key?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{t(group.key)}<ChevronDown size={12} className={`transition-transform ${openMenu===group.key?'rotate-180':''}`}/></button>
              {openMenu===group.key&&<div role="menu" className="absolute top-full left-0 pt-2 w-56 z-50"><div className="bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-900/5 p-1.5">{group.items.map(item=>{const active=pathname===item[1];return <Link key={item[0]} href={item[1]} role="menuitem" aria-current={active?'page':undefined} onClick={()=>setOpenMenu(null)} className={`block cursor-pointer px-3 py-2.5 rounded-lg text-[13px] ${active?'bg-[#073B67]/5 text-[#073B67] font-semibold':'text-gray-700 hover:bg-gray-50'}`}>{t(item[0])}</Link>;})}</div></div>}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden lg:block"><LanguageSelect compact/></div>
          <NotificationBell/>
          <div className="relative">
            <button type="button" aria-label={t('nav.profile')} aria-expanded={profile} onClick={()=>setProfile(value=>!value)} className="cursor-pointer w-9 h-9 p-0.5 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-black/5 bg-slate-100 flex items-center justify-center">
              {worker.identity.photoUrl && worker.identity.photoUrl !== '/worker-profile.png' ? (
                <img src={worker.identity.photoUrl} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <UserRound size={18} className="text-slate-600" />
              )}
            </button>
            {profile&&<div role="menu" className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl shadow-gray-900/5 border border-gray-100 overflow-hidden z-50"><div className="px-4 py-3 border-b bg-gray-50/70"><p className="text-sm font-semibold">{worker.identity.name}</p><p className="text-[11px] text-gray-500">{worker.identity.bssId}</p></div><div className="p-1.5"><Link href="/worker/Profile" className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[13px] rounded-lg hover:bg-gray-50"><UserRound size={16}/>{t('nav.profile')}</Link><Link href="/worker/Settings" className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[13px] rounded-lg hover:bg-gray-50"><Settings size={16}/>{t('nav.settings')}</Link><SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-red-600 rounded-lg hover:bg-red-50"/></div></div>}
          </div>
          <button type="button" className="cursor-pointer bss-mobile-trigger" aria-label={t('nav.menu')} aria-expanded={mobile} onClick={()=>setMobile(value=>!value)}>{mobile?<X/>:<Menu/>}</button>
        </div>
      </div>

      {mobile&&<nav aria-label={t('nav.mobile')} className="bss-mobile-menu absolute left-0 w-full bg-white border-b shadow-xl p-4 pb-8">
        {mobileItems.map(group=>(
          <div key={group.label} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{t(group.label)}</p>
            {group.items.map(item=>{const active=pathname===item[1];return <Link key={`${item[0]}-${item[1]}`} href={item[1]} onClick={()=>setMobile(false)} aria-current={active?'page':undefined} className={`block cursor-pointer px-4 py-2.5 rounded-lg text-sm ${active?'bg-[#073B67]/5 text-[#073B67] font-semibold':'hover:bg-gray-50 text-gray-700'}`}>{t(item[0])}</Link>;})}
          </div>
        ))}
        <div className="px-4 pt-3 lg:hidden"><LanguageSelect/></div>
        <SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/>
      </nav>}
    </header>
    <main key={pathname} className="bss-app-main bss-content-fade flex-1 w-full max-w-[1000px] mx-auto py-6 md:py-10 px-4 md:px-8">{children}</main>
    <MobileClaimModal />
  </div>;
}
