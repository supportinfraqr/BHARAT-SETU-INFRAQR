"use client";

import React, { useState } from 'react';
import { 
  Home, Briefcase, FileText, CheckSquare, 
  Menu, X, LogOut, ScanLine, Settings 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import ProfileCompletion from '@/components/worker/ProfileCompletion';
import NotificationBell from '@/components/worker/NotificationBell';

const navGroups = [
  { label: 'Dashboard', href: '/Dashboard/WorkerDashboard', icon: Home },
  { label: 'Rozgar Setu', href: '/Rozgar/WorkerRozgar', icon: Briefcase },
  { label: 'Work', icon: CheckSquare, items: [
    ['Skills','/Dashboard/WorkerDashboard/Skills'],['Attendance','/Dashboard/WorkerDashboard/Attendance'],['Leave','/Dashboard/WorkerDashboard/Leave'],['Wage History','/Dashboard/WorkerDashboard/Earnings'],['Holiday Calendar','/Dashboard/WorkerDashboard/Holidays']
  ]},
  { label: 'My Records', icon: FileText, items: [
    ['Profile','/Dashboard/WorkerDashboard/Profile'],['Compliance','/Dashboard/WorkerDashboard/Compliance'],['Documents','/Dashboard/WorkerDashboard/Documents'],['Retirement Benefits','/Dashboard/WorkerDashboard/Benefits'],['Grievances','/grievances/WorkerGrievances']
  ]},
  { label: 'QR / Identity', icon: ScanLine, items: [
    ['Identity Card','/qr/idcard'],['My Contractor(s)','/Dashboard/WorkerDashboard/Profile'],['My Employer(s)','/Dashboard/WorkerDashboard/Profile'],['Binding Requests','/Rozgar/WorkerRozgar'],['Scan QR','/qr/scan']
  ]},
];

export default function WorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { t } = useLanguage();
  const { worker } = useWorker();

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-[#0066CC] selection:text-white flex flex-col">
      
      {/* APPLE-STYLE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/Dashboard/WorkerDashboard" className="flex items-center gap-2 group">
            <img src="/bss-brand/bharatshramsetu-logo.png" className="h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity" alt="Logo" />
            <span className="font-semibold text-lg tracking-tight hidden sm:block">
              Bharat Shram Setu
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navGroups.map(group => group.href ? <Link key={group.label} href={group.href} className={`px-3 py-1.5 rounded-full text-[13px] font-medium ${pathname===group.href?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{group.label}</Link> : <div key={group.label} className="relative group"><button className={`px-3 py-1.5 rounded-full text-[13px] font-medium ${(group.items??[]).some(i=>pathname===i[1])?'bg-[#1D1D1F] text-white':'text-[#5D6975] hover:bg-black/5'}`}>{group.label}</button><div className="hidden group-hover:block group-focus-within:block absolute top-full left-0 pt-2 w-52"><div className="bg-white border border-gray-200 rounded-xl shadow-xl p-1">{group.items?.map(item=><Link key={item[0]} href={item[1]} className="block px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-gray-50">{item[0]}</Link>)}</div></div></div>)}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3 md:gap-5">
            <ProfileCompletion />
            {/* Minimalist Language Selector */}
            <div className="hidden sm:block"><LanguageSelect compact /></div>

            <NotificationBell />
            
            {/* Avatar Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm hover:ring-2 hover:ring-[#0066CC]/50 transition-all focus:outline-none"
              >
                <img 
                  src="/worker-profile.png" 
                  alt="Worker Profile" 
                  className="w-full h-full object-cover"
                />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] border border-black/5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="px-4 py-3 border-b border-black/5 bg-[#F5F5F7]/50">
                    <p className="text-[13px] font-semibold text-[#1D1D1F]">{worker.identity.name}</p>
                    <p className="text-[11px] text-[#86868B]">{worker.identity.bssId}</p>
                  </div>
                  <div className="p-1">
                    <Link href="/Dashboard/WorkerDashboard/Settings" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors">
                      <Settings size={16} className="text-[#86868B]" /> {t('nav.settings')}
                    </Link>
                    <Link href="/" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#FF3B30] rounded-lg hover:bg-red-50 transition-colors mt-1">
                      <LogOut size={16} /> Sign Out
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden text-[#1D1D1F] p-1 -mr-1"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-black/5 px-4 py-4 shadow-xl animate-in slide-in-from-top-2 flex flex-col gap-1">
            {navGroups.map(group=><div key={group.label}>{group.href?<Link href={group.href} onClick={()=>setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"><group.icon size={18}/>{group.label}</Link>:<><p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase">{group.label}</p>{group.items?.map(item=><Link key={item[0]} href={item[1]} onClick={()=>setMobileMenuOpen(false)} className="block pl-11 pr-4 py-2 text-sm text-gray-600">{item[0]}</Link>)}</>}</div>)}
            <div className="h-px bg-black/5 my-2 w-full"></div>
            <div className="px-4 py-3 sm:hidden"><LanguageSelect /></div>
            <Link href="/Dashboard/WorkerDashboard/Settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium">
              <Settings size={18} /> {t('nav.settings')}
            </Link>
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#FF3B30] hover:bg-red-50 font-medium">
              <LogOut size={18} /> {t('nav.signout')}
            </Link>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-[1000px] mx-auto py-8 md:py-12 px-4 md:px-8">
        {children}
      </main>

    </div>
  );
}
