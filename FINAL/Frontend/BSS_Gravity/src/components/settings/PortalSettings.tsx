"use client";

import { Bell, ChevronRight, Download, Eye, Globe2, LockKeyhole, MessageCircle, MonitorCog, ShieldCheck } from "lucide-react";
import LanguageSelect from "@/components/i18n/LanguageSelect";
import { SignOutButton } from "@/components/auth/SignOutButton";
import ConsentPanel from "@/components/ConsentPanel";
import SecuritySettings from "@/components/settings/SecuritySettings";
import { applyAccessibilityPrefs } from "@/components/accessibility/AccessibilityEffects";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocale } from "@/i18n";
import type { PortalSettings as PortalSettingsData } from "@/types/portal";
import type { ConsentScopeRole } from "@/lib/consents";

type Role = "employer" | "contractor";

const CHANNELS = ["SMS", "WhatsApp", "Mobile App", "IVR", "Email"];
const A11Y_KEYS: Array<keyof PortalSettingsData> = ["largeText", "highContrast", "reduceMotion"];

type Toggle = [key: keyof PortalSettingsData, label: string, detail: string];

const ROLE_CONFIG: Record<Role, {
  sessionLabel: string;
  notificationSubtitle: string;
  notifications: Toggle[];
  privacySubtitle: string;
  privacy: Toggle[];
  consentsRole: ConsentScopeRole;
}> = {
  employer: {
    sessionLabel: "BSS Employer ID",
    notificationSubtitle: "Choose important employer updates",
    notifications: [
      ["jobAlerts", "Contractor binding requests", "New contractor connections and site allotments"],
      ["complianceAlerts", "Compliance submissions", "Contractor compliance documents and reports"],
      ["grievanceUpdates", "Grievance updates", "Status and resolution messages"],
    ],
    privacySubtitle: "Control what your organisation credential shows",
    privacy: [
      ["consentToPublicPhoto", "Show organisation details on public verification", "Authorised roles remain unaffected"],
      ["consentToDataSharing", "Allow role-based data sharing", "Workbook permissions are always enforced"],
    ],
    consentsRole: "employer",
  },
  contractor: {
    sessionLabel: "BSS Contractor ID",
    notificationSubtitle: "Choose important contractor updates",
    notifications: [
      ["jobAlerts", "Worker binding requests", "Workers requesting to bind, and job applications"],
      ["complianceAlerts", "Compliance reminders", "Submission and document expiry"],
      ["grievanceUpdates", "Grievance updates", "Status and resolution messages"],
    ],
    privacySubtitle: "Control what your organisation credential shows",
    privacy: [
      ["consentToPublicPhoto", "Show organisation details on public verification", "Authorised roles remain unaffected"],
      ["consentToDataSharing", "Allow role-based data sharing", "Workbook permissions are always enforced"],
      ["bindingEnabled", "Allow worker binding requests", "Workers can send binding requests; both parties must still consent"],
    ],
    consentsRole: "contractor",
  },
};

function SettingSection({ icon: Icon, title, subtitle, children }: { icon: typeof Globe2; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <header className="p-4 border-b border-gray-100 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-gray-50 text-[#073B67] flex items-center justify-center"><Icon size={17} /></span>
        <div>
          <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0 cursor-pointer select-none">
      <span>
        <strong className="block text-xs font-semibold text-gray-800">{label}</strong>
        <small className="block text-[11px] text-gray-400 mt-0.5">{detail}</small>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-[#073B67]' : 'bg-gray-200'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </label>
  );
}

/**
 * Full role-aware Settings page for the employer and contractor portals:
 * language, notifications, communication, accessibility, privacy, security
 * (MPIN/password), consents and data export.
 */
export default function PortalSettingsPanel({
  role,
  settings,
  identity,
  onChange,
  data,
}: {
  role: Role;
  settings: PortalSettingsData;
  identity: { bssId: string; company: string };
  onChange: (patch: Partial<PortalSettingsData>) => void;
  data: unknown;
}) {
  const { language } = useLanguage();
  const locale = getLocale(language);
  const config = ROLE_CONFIG[role];

  const set = (key: keyof PortalSettingsData, value: unknown) => {
    if (A11Y_KEYS.includes(key)) {
      applyAccessibilityPrefs({ ...settings, [key]: value } as { largeText?: boolean; highContrast?: boolean; reduceMotion?: boolean });
    }
    onChange({ [key]: value, interfaceLanguage: language });
  };

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), role, identity, settings, data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BSS-${role}-data-${identity.bssId || 'account'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <SettingSection icon={Globe2} title="Interface Language" subtitle={`${locale.abbreviation} · ${locale.nativeName} · ${locale.name}`}>
        <LanguageSelect label="Interface Language" />
        <p className="text-xs text-gray-400 mt-3">Used consistently before and after login on this device.</p>
      </SettingSection>

      <div className="grid lg:grid-cols-2 gap-5">
        <SettingSection icon={Bell} title="Notification Preferences" subtitle={config.notificationSubtitle}>
          {config.notifications.map(([key, label, detail]) => (
            <ToggleRow key={key} label={label} detail={detail} checked={Boolean(settings[key])} onChange={v => set(key, v)} />
          ))}
        </SettingSection>

        <SettingSection icon={MessageCircle} title="Communication Preferences" subtitle="How BSS should contact you">
          <label className="block text-xs font-semibold text-gray-600">
            Preferred channel
            <select value={String(settings.preferredChannel ?? 'sms')} onChange={e => set('preferredChannel', e.target.value)} className="mt-2 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500">
            <span>Account: <strong className="text-gray-800">{identity.company}</strong></span>
            <span className="block mt-0.5 font-mono">{identity.bssId}</span>
          </div>
        </SettingSection>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SettingSection icon={Eye} title="Accessibility Settings" subtitle="Make the portal easier to use">
          <ToggleRow label="Larger interface text" detail="Increase text throughout the portal" checked={Boolean(settings.largeText)} onChange={v => set('largeText', v)} />
          <ToggleRow label="Higher contrast" detail="Strengthen text and borders" checked={Boolean(settings.highContrast)} onChange={v => set('highContrast', v)} />
          <ToggleRow label="Reduce motion" detail="Limit animation and transitions" checked={Boolean(settings.reduceMotion)} onChange={v => set('reduceMotion', v)} />
        </SettingSection>

        <SettingSection icon={ShieldCheck} title="Privacy & Data Sharing" subtitle={config.privacySubtitle}>
          {config.privacy.map(([key, label, detail]) => (
            <ToggleRow key={key} label={label} detail={detail} checked={Boolean(settings[key])} onChange={v => set(key, v)} />
          ))}
          <a href="/data-sharing" className="mt-3 flex items-center justify-between text-xs font-semibold text-[#073B67] hover:underline">Review data-sharing policy<ChevronRight size={14} /></a>
        </SettingSection>
      </div>

      <SettingSection icon={LockKeyhole} title="Security & Sessions" subtitle={`Protect access to your ${role} account`}>
        <div className="p-3 rounded-lg border border-gray-100 bg-white">
          <p className="text-xs font-semibold text-gray-800 flex gap-2 items-center"><MonitorCog size={14} />Active Session</p>
          <p className="text-[11px] text-green-700 font-medium mt-1">{config.sessionLabel}: <span className="font-mono">{identity.bssId || 'Active'}</span></p>
          <p className="text-[11px] text-gray-600 mt-1">Signed in as <strong className="text-gray-800">{identity.company}</strong></p>
        </div>
        <div className="mt-4">
          <SecuritySettings />
        </div>
      </SettingSection>

      <ConsentPanel role={config.consentsRole} />

      <SettingSection icon={Download} title="Your data" subtitle="Portable and account controlled">
        <button onClick={exportData} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
          <Download size={15} />Download My Data
        </button>
        <div className="mt-4">
          <SignOutButton label="Sign Out on This Device" className="h-10 px-4 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition" />
        </div>
      </SettingSection>
    </div>
  );
}
