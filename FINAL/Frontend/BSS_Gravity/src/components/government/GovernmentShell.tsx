"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LayoutDashboard, Menu, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import BrandText from '@/components/BrandText';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GovernmentShell({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [profile, setProfile] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = [
    { key: 'nav.dashboard', href: '/government', icon: LayoutDashboard },
  ];
  return <div className="bss-shell min-h-screen text-[#15212B] flex flex-col">
    <header className="bss-shell-header sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="bss-shell-bar max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/government" className="flex items-center gap-2 shrink-0"><Image src="/bss-original-logo.png" width={154} height={40} className="h-8 w-auto" alt="Bharat Shram Setu"/><BrandText className="hidden lg:block text-base"/></Link>
        <nav aria-label={t('nav.primary')} className="bss-desktop-nav gap-1">{items.map(item => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`px-3 py-2 rounded-full text-[13px] font-medium ${pathname === item.href ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{t(item.key)}</Link>)}</nav>
        <div className="flex items-center gap-2 sm:gap-3"><div className="hidden sm:block"><LanguageSelect compact/></div><div className="relative"><button type="button" onClick={() => setProfile(v => !v)} aria-expanded={profile} className="min-h-11 flex items-center gap-2 rounded-full hover:bg-gray-100 p-1 pr-2"><span className="w-8 h-8 rounded-full bg-[#073B67] text-white flex items-center justify-center font-bold">G</span><span className="hidden xl:block text-sm font-semibold">Government</span><ChevronDown size={14}/></button>{profile && <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-xl shadow-xl p-1"><div className="p-3 border-b"><p className="font-semibold text-sm">Government Overview</p><p className="text-xs text-gray-500">Policy & analytics access</p></div><SignOutButton className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50"/></div>}</div><button type="button" className="bss-mobile-trigger" aria-label={t('nav.menu')} aria-expanded={mobile} onClick={() => setMobile(v => !v)}>{mobile ? <X/> : <Menu/>}</button></div>
      </div>
      {mobile && <nav aria-label={t('nav.mobile')} className="bss-mobile-menu absolute top-16 w-full bg-white border-b shadow-xl p-4">{items.map(it => <Link key={it.key} href={it.href} onClick={() => setMobile(false)} className="block px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">{t(it.key)}</Link>)}<SignOutButton className="w-full flex items-center gap-2 px-4 py-3 text-red-600"/></nav>}
    </header>
    <main className="bss-app-main flex-1 w-full max-w-[1400px] mx-auto py-6 md:py-8 px-4 md:px-8">{children}</main>
  </div>;
}
