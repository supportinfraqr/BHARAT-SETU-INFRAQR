"use client";

import { useEmployer } from '@/contexts/EmployerContext';
import SecuritySettings from '@/components/settings/SecuritySettings';
import { AccessibilitySettings } from '@/components/accessibility/PortalAccessibility';
import { applyAccessibilityPrefs, type AccessibilityPrefs } from '@/components/accessibility/AccessibilityEffects';

export default function EmployerSettingsPage() {
  const { employer, mutate } = useEmployer();
  const prefs: AccessibilityPrefs = employer.accessibility ?? {};

  function saveAccessibility(patch: AccessibilityPrefs) {
    const next = { ...prefs, ...patch };
    applyAccessibilityPrefs(next);
    void mutate('settings', 'PATCH', patch);
  }

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Account settings</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Accessibility, login MPIN and password · {employer.identity.company}</p>
      </header>

      <AccessibilitySettings prefs={prefs} onChange={saveAccessibility} />
      <SecuritySettings />
    </div>
  );
}
