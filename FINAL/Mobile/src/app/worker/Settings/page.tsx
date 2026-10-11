"use client";
import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ChevronRight, Download, Eye, Globe2, LockKeyhole, MessageCircle, MonitorCog, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { applyAccessibilityPrefs } from '@/components/accessibility/AccessibilityEffects';
import ConsentPanel from '@/components/ConsentPanel';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import PageHero from '@/components/portal/PageHero';
import SecuritySettings from '@/components/settings/SecuritySettings';
import RegisteredDevices from '@/components/settings/RegisteredDevices';
import { getLocale } from '@/i18n';
import type { WorkerRecord } from '@/types/portal';

type SettingsState = {
  jobAlerts: boolean;
  complianceAlerts: boolean;
  grievanceUpdates: boolean;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  preferredChannel: string;
  consentToPublicPhoto: boolean;
  consentToDataSharing: boolean;
  bindingEnabled: boolean;
};

const initialFromPortal = (w: WorkerRecord): SettingsState => ({
  jobAlerts: w.settings?.jobAlerts ?? true,
  complianceAlerts: w.settings?.complianceAlerts ?? true,
  grievanceUpdates: w.settings?.grievanceUpdates ?? true,
  largeText: w.settings?.largeText ?? false,
  highContrast: w.settings?.highContrast ?? false,
  reduceMotion: w.settings?.reduceMotion ?? false,
  preferredChannel: w.contact?.preferredChannel || w.settings?.preferredChannel || 'SMS',
  consentToPublicPhoto: !!(w.preferences?.consentToPublicPhoto ?? w.settings?.consentToPublicPhoto),
  consentToDataSharing: !!(w.preferences?.consentToDataSharing ?? w.settings?.consentToDataSharing),
  bindingEnabled: w.settings?.bindingEnabled ?? true,
});

export default function SettingsPage() {
  const { language, t } = useLanguage();
  const { worker, portal, saveWorker, updateWorker, refresh } = useWorker();
  const locale = getLocale(language);
  const portalPrefs = useMemo(() => initialFromPortal(worker), [worker]);
  const [prefsOverride, setPrefsOverride] = useState<SettingsState | null>(null);
  const prefs = prefsOverride ?? portalPrefs;
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    applyAccessibilityPrefs({ largeText: prefs.largeText, highContrast: prefs.highContrast, reduceMotion: prefs.reduceMotion });
  }, [prefs.largeText, prefs.highContrast, prefs.reduceMotion]);

  const updateSetting = async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefsOverride(next);
    setProfileError('');
    try {
      const response = await fetch('/api/portal/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          interfaceLanguage: language,
        }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error ?? 'Setting update failed.');
      }

      // Also persist preferences / contact to profile for full backward compatibility
      if (key === 'preferredChannel') {
        void saveWorker({ contact: { ...worker.contact, preferredChannel: String(value) } });
      } else if (key === 'consentToPublicPhoto' || key === 'consentToDataSharing') {
        void saveWorker({
          preferences: {
            ...worker.preferences,
            consentToPublicPhoto: key === 'consentToPublicPhoto' ? Boolean(value) : prefs.consentToPublicPhoto,
            consentToDataSharing: key === 'consentToDataSharing' ? Boolean(value) : prefs.consentToDataSharing,
          },
        });
      }

      updateWorker({
        settings: { ...worker.settings, ...next },
      });

      setSaved(true);
      void refresh();
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setPrefsOverride(previous);
      setProfileError(err instanceof Error ? err.message : 'Setting update failed.');
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), worker, settings: prefs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BSS-worker-data-${worker.identity.bssId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mobileNum = worker.contact?.mobile?.trim() || '';
  const maskedMobile = mobileNum.length >= 4 ? `••••••${mobileNum.slice(-4)}` : (mobileNum || 'Not registered');


  return (
    <div className="space-y-5 pb-12 max-w-4xl mx-auto">
      <PageHero
        eyebrow="Worker account"
        title={t('nav.settings')}
        subtitle="Control language, alerts, privacy, accessibility and account security."
        actions={saved ? <span className="hidden sm:flex text-xs text-white/80 gap-1 items-center font-medium"><CheckCircle2 size={14} />Saved</span> : undefined}
      />

      {profileError && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{profileError}</p>}

      <SettingSection
        icon={Globe2}
        title={t('settings.interface_language')}
        subtitle={`${locale.abbreviation} · ${locale.nativeName} · ${locale.name}`}
      >
        <LanguageSelect label={t('settings.interface_language')} />
        <p className="text-xs text-bss-text-muted mt-3">Used consistently before and after login on this device.</p>
      </SettingSection>

      <div className="grid lg:grid-cols-2 gap-5">
        <SettingSection
          icon={Bell}
          title="Notification Preferences"
          subtitle="Choose important worker updates"
        >
          <Toggle label="Job and binding requests" detail="New Rozgar opportunities" checked={prefs.jobAlerts} onChange={v => updateSetting('jobAlerts', v)} />
          <Toggle label="Compliance reminders" detail="Medical, document and pass expiry" checked={prefs.complianceAlerts} onChange={v => updateSetting('complianceAlerts', v)} />
          <Toggle label="Grievance updates" detail="Status and resolution messages" checked={prefs.grievanceUpdates} onChange={v => updateSetting('grievanceUpdates', v)} />
        </SettingSection>

        <SettingSection
          icon={MessageCircle}
          title="Communication Preferences"
          subtitle="How BSS should contact you"
        >
          <label className="block text-xs font-semibold text-bss-text-secondary">
            Preferred channel
            <select
              value={prefs.preferredChannel}
              onChange={e => void updateSetting('preferredChannel', e.target.value)}
              className="mt-2 w-full h-10 border border-bss-border rounded-lg px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="SMS">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Mobile App">Mobile App</option>
              <option value="IVR">IVR</option>
              <option value="Email">Email</option>
            </select>
          </label>
          <div className="mt-4 p-3 rounded-lg bg-bss-bg text-xs text-bss-text-muted flex items-center gap-2">
            <Smartphone size={15} />
            <span>Registered mobile: <strong className="text-bss-text-primary font-mono">{maskedMobile}</strong></span>
          </div>
        </SettingSection>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SettingSection
          icon={Eye}
          title="Accessibility Settings"
          subtitle="Make the portal easier to use"
        >
          <Toggle label="Larger interface text" detail="Increase text throughout the portal" checked={prefs.largeText} onChange={v => updateSetting('largeText', v)} />
          <Toggle label="Higher contrast" detail="Strengthen text and borders" checked={prefs.highContrast} onChange={v => updateSetting('highContrast', v)} />
          <Toggle label="Reduce motion" detail="Limit animation and transitions" checked={prefs.reduceMotion} onChange={v => updateSetting('reduceMotion', v)} />
        </SettingSection>

        <SettingSection
          icon={QrCode}
          title="Privacy & QR Sharing"
          subtitle="Control what your public credential shows"
        >
          <Toggle label="Show photo on public verification" detail="Authorised roles remain unaffected" checked={prefs.consentToPublicPhoto} onChange={v => void updateSetting('consentToPublicPhoto', v)} />
          <Toggle label="Allow role-based data sharing" detail="Workbook permissions are always enforced" checked={prefs.consentToDataSharing} onChange={v => void updateSetting('consentToDataSharing', v)} />
          <Toggle label="Allow binding & unbinding" detail="Contractors can send binding requests; both parties must still consent" checked={prefs.bindingEnabled} onChange={v => void updateSetting('bindingEnabled', v)} />
          <a href="/policy" className="mt-3 flex items-center justify-between text-xs font-semibold text-[#073B67] hover:underline">Read the privacy policy<ChevronRight size={14} /></a>
          <a href="/data-sharing" className="mt-2 flex items-center justify-between text-xs font-semibold text-[#073B67] hover:underline">Review data-sharing policy<ChevronRight size={14} /></a>
        </SettingSection>
      </div>

      <SettingSection
        icon={LockKeyhole}
        title="Security & Sessions"
        subtitle="Protect access to your worker account"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-bss-border bg-white sm:col-span-2">
            <p className="text-xs font-semibold text-bss-text-primary flex gap-2 items-center"><MonitorCog size={14} />Active Session</p>
            <p className="text-[11px] text-green-700 font-medium mt-1">BSS Worker ID: <span className="font-mono">{worker.identity?.bssId || 'Active'}</span></p>
            <p className="text-[11px] text-bss-text-secondary mt-1">Aadhaar Status: <strong className="text-bss-text-primary">{worker.identity?.aadhaarVerified ? 'Verified' : 'Pending Verification'}</strong></p>
          </div>
        </div>
        <div className="mt-4">
          <SecuritySettings />
        </div>
      </SettingSection>

      <SettingSection
        icon={Smartphone}
        title="Registered devices"
        subtitle="Devices registered to your worker account"
      >
        <RegisteredDevices />
      </SettingSection>

      <ConsentPanel role="worker" registeredAt={worker.other?.consentDate || worker.other?.registrationDate} />

      <SettingSection
        icon={ShieldCheck}
        title="Your data"
        subtitle="Portable and worker controlled"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={exportData} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-semibold flex items-center justify-center gap-2 hover:bg-bss-bg transition">
            <Download size={15} />Download My Data
          </button>
          <SignOutButton label="Sign Out on This Device" className="h-10 px-4 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition" />
        </div>
      </SettingSection>
    </div>
  );
}

function SettingSection({ icon: Icon, title, subtitle, children }: { icon: typeof Globe2; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="bss-3d bss-scroll-rise bg-white border border-bss-border rounded-2xl overflow-hidden shadow-sm">
      <header className="p-4 border-b border-bss-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-bss-blue-tint text-bss-interactive-blue flex items-center justify-center"><Icon size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold text-bss-text-primary">{title}</h2>
            <p className="text-[11px] text-bss-text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-bss-border last:border-0 cursor-pointer select-none">
      <span>
        <strong className="block text-xs font-semibold text-bss-text-primary">{label}</strong>
        <small className="block text-[11px] text-bss-text-muted mt-0.5">{detail}</small>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-[#073B67]' : 'bg-bss-bg'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </label>
  );
}
