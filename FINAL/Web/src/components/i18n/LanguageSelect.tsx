"use client";
import { Languages } from 'lucide-react';
import { locales, type Language } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelect({ compact = false, label }: { compact?: boolean; label?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const aria = t('settings.interface_language');

  // Compact: icon + a short `<select>` (used in the app header / menus).
  if (compact) {
    return (
      <label className="flex items-center gap-2">
        <Languages size={17} aria-hidden="true" className="text-[#1E3A8A] shrink-0" />
        <select aria-label={aria} value={language} onChange={event => setLanguage(event.target.value as Language)} className="cursor-pointer max-w-36 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20">
          {locales.map(locale => <option key={locale.code} value={locale.code}>{locale.abbreviation} — {locale.nativeName}</option>)}
        </select>
      </label>
    );
  }

  // Full: label on its own line, select full-width on phones so the label
  // never gets crushed into a vertical strip on narrow screens.
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Languages size={17} aria-hidden="true" className="text-[#1E3A8A] shrink-0" />
        {label ?? t('settings.interface_language')}
      </span>
      <select aria-label={aria} value={language} onChange={event => setLanguage(event.target.value as Language)} className="cursor-pointer w-full sm:w-auto sm:ml-auto sm:min-w-48 bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#1E3A8A]/20">
        {locales.map(locale => <option key={locale.code} value={locale.code}>{locale.abbreviation} — {locale.nativeName}</option>)}
      </select>
    </div>
  );
}
