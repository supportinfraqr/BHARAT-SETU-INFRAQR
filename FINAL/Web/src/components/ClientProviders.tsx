"use client";

import React, { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n';
import { NotificationProvider } from '@/contexts/NotificationContext';
import VoiceGuide from '@/components/worker/VoiceGuide';
import AutoTranslate from '@/components/i18n/AutoTranslate';

// After a deploy the previously-loaded JS chunks are replaced (new hashes). An
// already-open tab can then throw a ChunkLoadError and freeze — buttons and
// <select>s stop responding. Auto-reload once so the tab self-heals instead of
// leaving the user with a "stuck" page until they manually refresh.
function useChunkErrorReload() {
  useEffect(() => {
    let reloading = false;
    const isChunkError = (value: unknown) =>
      /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(String(value ?? ''));
    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.message) || isChunkError(event.error && event.error.message)) reload();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason && (event.reason.message || event.reason))) reload();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
}

export function ClientProviders({ children, initialLanguage }: { children: React.ReactNode; initialLanguage?: Language }) {
  useChunkErrorReload();
  return <LanguageProvider initialLanguage={initialLanguage}><NotificationProvider>{children}<VoiceGuide /><AutoTranslate /></NotificationProvider></LanguageProvider>;
}
