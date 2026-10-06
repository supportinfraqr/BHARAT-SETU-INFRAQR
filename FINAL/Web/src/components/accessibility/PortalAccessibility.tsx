"use client";

import { useEffect } from 'react';
import { applyAccessibilityPrefs, ACCESSIBILITY_STORAGE_KEY, type AccessibilityPrefs } from '@/components/accessibility/AccessibilityEffects';
import { useEmployer } from '@/contexts/EmployerContext';
import { useContractor } from '@/contexts/ContractorContext';

// Applies the portal's saved accessibility choices to <html> app-wide (and
// mirrors them to localStorage so the pre-paint bootstrap keeps them on reload).
function Effects({ prefs }: { prefs?: AccessibilityPrefs }) {
  const largeText = Boolean(prefs?.largeText);
  const highContrast = Boolean(prefs?.highContrast);
  const reduceMotion = Boolean(prefs?.reduceMotion);
  useEffect(() => {
    applyAccessibilityPrefs({ largeText, highContrast, reduceMotion });
    try {
      window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ largeText, highContrast, reduceMotion }));
    } catch {
      /* localStorage can be unavailable (private mode) — the classes still apply. */
    }
  }, [largeText, highContrast, reduceMotion]);
  return null;
}

export function EmployerAccessibilityEffects() {
  const { employer } = useEmployer();
  return <Effects prefs={employer.accessibility} />;
}

export function ContractorAccessibilityEffects() {
  const { contractor } = useContractor();
  return <Effects prefs={contractor.accessibility} />;
}

const ITEMS = [
  ['largeText', 'Larger interface text', 'Increase text throughout the portal'],
  ['highContrast', 'Higher contrast', 'Strengthen text and borders'],
  ['reduceMotion', 'Reduce motion', 'Limit animation and transitions'],
] as const;

/** Accessibility toggles (larger text / higher contrast / reduce motion). */
export function AccessibilitySettings({ prefs, onChange }: { prefs: AccessibilityPrefs; onChange: (patch: AccessibilityPrefs) => void }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-900">Accessibility</h2>
      <p className="text-[11px] text-gray-400 mt-0.5">Adjust how the portal looks for you. Applies instantly and is remembered on this device.</p>
      <div className="mt-4 space-y-2">
        {ITEMS.map(([key, label, detail]) => {
          const checked = Boolean(prefs[key]);
          return (
            <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-3.5 py-3 cursor-pointer hover:bg-gray-50">
              <span>
                <span className="block text-xs font-semibold text-gray-800">{label}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5">{detail}</span>
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange({ [key]: e.target.checked } as AccessibilityPrefs)}
                className="w-5 h-5 rounded border-gray-300 accent-[#073B67]"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
