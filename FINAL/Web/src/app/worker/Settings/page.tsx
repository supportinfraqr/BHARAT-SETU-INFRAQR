"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, ChevronRight, Download, Eye, Globe2, LockKeyhole, MessageCircle, MonitorCog, PackageCheck, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { applyAccessibilityPrefs } from '@/components/accessibility/AccessibilityEffects';
import ConsentPanel from '@/components/ConsentPanel';
import LanguageSelect from '@/components/i18n/LanguageSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import SecuritySettings from '@/components/settings/SecuritySettings';
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
  const router = useRouter();
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

  const deliveryAddress = worker.address?.current || worker.address?.permanent || 'Address on profile';
  const cardFeeDisplay = portal?.cardProduct?.cardFee === 0 ? 'Free (Government Subsidy)' : portal?.cardProduct?.cardFee ? `₹${portal.cardProduct.cardFee}` : 'Standard Processing';

  return (
    <div className="space-y-5 pb-12 max-w-4xl mx-auto">
      <header className="flex justify-between items-end gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Worker account</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-950 mt-1">{t('nav.settings')}</h1>
          <p className="text-sm text-gray-500 mt-1">Control language, alerts, privacy, accessibility and account security.</p>
        </div>
        {saved && <span className="hidden sm:flex text-xs text-green-700 gap-1 items-center font-medium"><CheckCircle2 size={14} />Saved</span>}
      </header>

      {profileError && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{profileError}</p>}

      <SettingSection
        icon={Globe2}
        title={t('settings.interface_language')}
        subtitle={`${locale.abbreviation} · ${locale.nativeName} · ${locale.name}`}
      >
        <LanguageSelect label={t('settings.interface_language')} />
        <p className="text-xs text-gray-400 mt-3">Used consistently before and after login on this device.</p>
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
          <label className="block text-xs font-semibold text-gray-600">
            Preferred channel
            <select
              value={prefs.preferredChannel}
              onChange={e => void updateSetting('preferredChannel', e.target.value)}
              className="mt-2 w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="SMS">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Mobile App">Mobile App</option>
              <option value="IVR">IVR</option>
              <option value="Email">Email</option>
            </select>
          </label>
          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
            <Smartphone size={15} />
            <span>Registered mobile: <strong className="text-gray-800 font-mono">{maskedMobile}</strong></span>
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
          <div className="p-3 rounded-lg border border-gray-100 bg-white sm:col-span-2">
            <p className="text-xs font-semibold text-gray-800 flex gap-2 items-center"><MonitorCog size={14} />Active Session</p>
            <p className="text-[11px] text-green-700 font-medium mt-1">BSS Worker ID: <span className="font-mono">{worker.identity?.bssId || 'Active'}</span></p>
            <p className="text-[11px] text-gray-600 mt-1">Aadhaar Status: <strong className="text-gray-800">{worker.identity?.aadhaarVerified ? 'Verified' : 'Pending Verification'}</strong></p>
          </div>
        </div>
        <div className="mt-4">
          <SecuritySettings />
        </div>
      </SettingSection>

      <ConsentPanel role="worker" />

      <SettingSection
        icon={PackageCheck}
        title="Order Physical BSS Card"
        subtitle="Request printing and secure delivery from the BSS office"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-800">Delivery Address: <span className="text-gray-600 font-normal">{deliveryAddress}</span></p>
            <p className="text-[11px] text-gray-500 mt-1">Issuance fee: <strong className="text-gray-800">{cardFeeDisplay}</strong> · Delivered via BSS postal dispatch</p>
          </div>
          <button onClick={() => router.push('/worker/OrderCard')} className="h-10 px-4 rounded-lg bg-[#073B67] hover:bg-[#062D4F] text-white text-xs font-semibold flex items-center justify-center gap-2 transition flex-shrink-0">
            <PackageCheck size={15} />Order Card
          </button>
        </div>
      </SettingSection>

      <SettingSection
        icon={ShieldCheck}
        title="Your data"
        subtitle="Portable and worker controlled"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={exportData} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
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
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <header className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-gray-50 text-[#073B67] flex items-center justify-center"><Icon size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
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
