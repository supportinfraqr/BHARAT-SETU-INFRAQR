"use client";
import { Languages } from 'lucide-react';
import { locales, type Language } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelect({ compact = false, label }: { compact?: boolean; label?: string }) {
  const { language, setLanguage, t } = useLanguage();
  return <label className={`flex items-center gap-2 ${compact ? '' : 'w-full'}`}>
    <Languages size={17} aria-hidden="true" className="text-[#1E3A8A] shrink-0"/>
    {!compact && <span className="text-sm font-semibold text-gray-700">{label ?? t('settings.interface_language')}</span>}
    <select aria-label={t('settings.interface_language')} value={language} onChange={event => setLanguage(event.target.value as Language)} className={`cursor-pointer ${compact ? 'max-w-36 text-xs' : 'ml-auto min-w-48 text-sm'} bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20`}>
      {locales.map(locale => <option key={locale.code} value={locale.code}>{locale.abbreviation} — {locale.nativeName}</option>)}
    </select>
  </label>;
}
