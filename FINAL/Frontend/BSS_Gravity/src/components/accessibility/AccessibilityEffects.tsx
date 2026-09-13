"use client";

import { useEffect } from 'react';
import { useWorker } from '@/contexts/WorkerContext';

export type AccessibilityPrefs = {
  largeText?: boolean;
  highContrast?: boolean;
  reduceMotion?: boolean;
};

export const ACCESSIBILITY_STORAGE_KEY = 'bss-a11y-prefs';

const CLASS_MAP: Array<[keyof AccessibilityPrefs, string]> = [
  ['largeText', 'bss-large-text'],
  ['highContrast', 'bss-high-contrast'],
  ['reduceMotion', 'bss-reduce-motion'],
];

// Toggles the root <html> classes the accessibility CSS hangs off. These live on
// <html> (not a wrapper) because the portal's Tailwind sizes are rem-based and
// only scale when the root font-size changes.
export function applyAccessibilityPrefs(prefs: AccessibilityPrefs) {
  if (typeof document === 'undefined') return;
  for (const [key, className] of CLASS_MAP) {
    document.documentElement.classList.toggle(className, Boolean(prefs[key]));
  }
}

// Applied app-wide (mounted in the portal layout) so the choices survive
// navigation and reloads instead of only taking effect on the Settings page.
export default function AccessibilityEffects() {
  const { worker } = useWorker();
  const settings = worker?.settings;
  const largeText = Boolean(settings?.largeText);
  const highContrast = Boolean(settings?.highContrast);
  const reduceMotion = Boolean(settings?.reduceMotion);

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

// Inline snippet for the layout: applies the last-known choices before the
// portal paints, so a reload doesn't flash the default size/contrast/motion.
export const ACCESSIBILITY_BOOTSTRAP = `try{var p=JSON.parse(localStorage.getItem('${ACCESSIBILITY_STORAGE_KEY}')||'{}');var m={largeText:'bss-large-text',highContrast:'bss-high-contrast',reduceMotion:'bss-reduce-motion'};for(var k in m){document.documentElement.classList.toggle(m[k],!!p[k]);}}catch(e){}`;
