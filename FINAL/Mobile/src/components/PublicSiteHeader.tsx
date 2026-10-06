'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LanguageSelect from '@/components/i18n/LanguageSelect';

export default function PublicSiteHeader() {
  return <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200">
    <div className="max-w-[1200px] mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3" aria-label="Bharat Shram Setu home">
        <img src="/bss-original-logo.png" alt="" className="w-9 h-9 object-contain"/>
        <span><strong className="block text-sm text-bss-navy">Bharat Shram Setu</strong><small className="block text-[9px] uppercase tracking-wider text-gray-400">One worker · One identity · One future</small></span>
      </Link>
      <div className="flex items-center gap-3"><LanguageSelect compact/><Link href="/" className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 flex items-center gap-1.5 hover:bg-gray-50"><ArrowLeft size={14}/>Back to sign in</Link></div>
    </div>
  </header>;
}
