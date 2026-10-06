"use client";

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Logout — clears the session cookie, then performs a full document
 * navigation to the landing page. A full navigation is used deliberately:
 * client-side router navigation would re-render the still-mounted protected
 * layout while the session is already gone (requireSession throws → the
 * "unauthorized flash" / error-boundary splash users saw). Full navigation
 * keeps the sequence clean: click → Signing out… → landing.
 */
export function SignOutButton({ className = '', label }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const { t } = useLanguage();
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      // Session cookie is cleared server-side even if the response fails;
      // still proceed to the landing page.
    } finally {
      window.location.assign('/');
    }
  }
  const idleLabel = label ?? (t('nav.signout') !== 'nav.signout' ? t('nav.signout') : 'Sign Out');
  return (
    <button type="button" onClick={signOut} disabled={busy} aria-busy={busy} className={className}>
      <LogOut size={16} className={busy ? 'animate-pulse' : undefined} />
      {busy ? (t('common.signingOut') !== 'common.signingOut' ? t('common.signingOut') : 'Signing out…') : idleLabel}
    </button>
  );
}
