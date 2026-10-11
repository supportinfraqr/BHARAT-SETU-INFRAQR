"use client";

import { Bell, ChevronRight, Download, Eye, Globe2, LockKeyhole, MessageCircle, MonitorCog, ShieldCheck, Sparkles, Sliders } from "lucide-react";
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

function SettingSection({
  icon: Icon,
  title,
  subtitle,
  children,
  badge,
}: {
  icon: typeof Globe2;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <section className="bss-card rounded-2xl overflow-hidden bss-hover-lift transition-all duration-300">
      <header className="p-4 sm:p-5 border-b border-bss-border bg-gradient-to-r from-white via-white to-bss-bg/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-bss-blue-tint text-bss-navy flex items-center justify-center shrink-0 shadow-xs ring-1 ring-bss-border/50">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-bss-text-primary tracking-tight">{title}</h2>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-bss-blue-tint text-bss-interactive-blue border border-bss-border">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-bss-text-muted mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="group flex items-center justify-between gap-4 py-3.5 px-3 rounded-xl hover:bg-bss-bg/70 transition-colors cursor-pointer select-none border-b border-bss-border/40 last:border-0">
      <span className="min-w-0 flex-1">
        <strong className="block text-xs sm:text-sm font-semibold text-bss-text-primary group-hover:text-bss-navy transition-colors">{label}</strong>
        <small className="block text-[11px] text-bss-text-muted mt-0.5 leading-relaxed">{detail}</small>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 shrink-0 shadow-inner ${checked ? 'bg-bss-navy' : 'bg-gray-200'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </label>
  );
}

/**
 * Enhanced role-aware Settings panel for Employer & Contractor portals:
 * refined typography, subtle gradients, soft rounded corners, centered balances.
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
    <div className="space-y-6">
      {/* Top Banner Overview Card */}
      <div className="bss-card rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-white via-bss-bg/30 to-bss-blue-tint/30 flex flex-col md:flex-row md:items-center justify-between gap-5 border border-bss-border shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-bss-navy text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {identity.company ? identity.company.charAt(0).toUpperCase() : 'C'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-bss-text-muted">Managed Credentials</span>
            <h3 className="text-base sm:text-lg font-bold text-bss-text-primary mt-0.5 truncate">{identity.company}</h3>
            <p className="text-xs font-mono text-bss-text-secondary mt-0.5">{identity.bssId || 'BSS-VERIFIED-ID'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportData}
            className="h-10 px-4 rounded-xl border border-bss-border bg-white hover:bg-bss-bg text-bss-text-primary text-xs font-bold inline-flex items-center gap-2 transition-all shadow-2xs hover:border-[#c7d5ea]"
          >
            <Download size={15} className="text-bss-interactive-blue" /> Download Data Copy
          </button>
          <SignOutButton
            label="Sign Out"
            className="h-10 px-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Language Section */}
      <SettingSection icon={Globe2} title="Interface Language" subtitle={`${locale.abbreviation} · ${locale.nativeName} · ${locale.name}`} badge="16 Languages">
        <div className="max-w-md">
          <LanguageSelect label="Interface Language" />
        </div>
        <p className="text-xs text-bss-text-muted mt-3">Applied consistently across all web views, reports and confirmation dialogues.</p>
      </SettingSection>

      {/* Grid: Notifications & Communications */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SettingSection icon={Bell} title="Notification Preferences" subtitle={config.notificationSubtitle}>
          <div className="divide-y divide-bss-border/40">
            {config.notifications.map(([key, label, detail]) => (
              <ToggleRow key={key} label={label} detail={detail} checked={Boolean(settings[key])} onChange={v => set(key, v)} />
            ))}
          </div>
        </SettingSection>

        <SettingSection icon={MessageCircle} title="Communication Channels" subtitle="Verified channels for automated alerts & receipts">
          <label className="block text-xs font-bold uppercase tracking-wider text-bss-text-muted mb-2">
            Preferred alert channel
            <select
              value={String(settings.preferredChannel ?? 'sms')}
              onChange={e => set('preferredChannel', e.target.value)}
              className="mt-2 w-full h-11 border border-bss-border rounded-xl px-3 bg-white text-sm text-bss-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-bss-interactive-blue/20 shadow-2xs transition"
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="mt-4 p-3.5 rounded-xl bg-bss-bg/70 border border-bss-border/60 text-xs text-bss-text-secondary space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-bss-text-muted">Account Scope:</span>
              <strong className="text-bss-text-primary">{identity.company}</strong>
            </div>
            <div className="flex justify-between items-center font-mono text-[11px]">
              <span className="text-bss-text-muted font-sans">Identifier:</span>
              <span>{identity.bssId}</span>
            </div>
          </div>
        </SettingSection>
      </div>

      {/* Grid: Accessibility & Privacy */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SettingSection icon={Eye} title="Accessibility Comfort" subtitle="Screen reading, contrast & motion comfort">
          <div className="divide-y divide-bss-border/40">
            <ToggleRow label="Larger interface text" detail="Increase font sizing across high-density registers & dashboard lists" checked={Boolean(settings.largeText)} onChange={v => set('largeText', v)} />
            <ToggleRow label="Higher contrast borders" detail="Strengthen line dividers and label contrast for outdoor/bright sunlight" checked={Boolean(settings.highContrast)} onChange={v => set('highContrast', v)} />
            <ToggleRow label="Reduce interface motion" detail="Limit parallax, sliding transitions and micro-animations" checked={Boolean(settings.reduceMotion)} onChange={v => set('reduceMotion', v)} />
          </div>
        </SettingSection>

        <SettingSection icon={ShieldCheck} title="Privacy & Data Sharing" subtitle={config.privacySubtitle}>
          <div className="divide-y divide-bss-border/40">
            {config.privacy.map(([key, label, detail]) => (
              <ToggleRow key={key} label={label} detail={detail} checked={Boolean(settings[key])} onChange={v => set(key, v)} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-bss-border/60 flex flex-col sm:flex-row gap-2 justify-between">
            <a href="/policy" className="inline-flex items-center gap-1 text-xs font-semibold text-bss-interactive-blue hover:underline">
              Read the Privacy Policy <ChevronRight size={14} />
            </a>
            <a href="/data-sharing" className="inline-flex items-center gap-1 text-xs font-semibold text-bss-interactive-blue hover:underline">
              Data-Sharing Policy <ChevronRight size={14} />
            </a>
          </div>
        </SettingSection>
      </div>

      {/* Security & Sessions */}
      <SettingSection icon={LockKeyhole} title="Security & Authentication" subtitle={`Manage MPIN, password protection and active sessions`}>
        <div className="p-4 rounded-xl border border-bss-border bg-gradient-to-r from-white to-bss-bg/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs mb-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-50 text-green-700 grid place-items-center shrink-0">
              <MonitorCog size={16} />
            </span>
            <div>
              <p className="text-xs font-bold text-bss-text-primary flex items-center gap-1.5">
                Current Active Session <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </p>
              <p className="text-[11px] text-bss-text-muted mt-0.5">
                {config.sessionLabel}: <span className="font-mono text-bss-text-secondary font-semibold">{identity.bssId || 'Active'}</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            Authenticated
          </span>
        </div>
        <SecuritySettings />
      </SettingSection>

      {/* Consent Governance Drawer */}
      <ConsentPanel role={config.consentsRole} />
    </div>
  );
}
