"use client";

import React from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/i18n';
import { NotificationProvider } from '@/contexts/NotificationContext';
import VoiceGuide from '@/components/worker/VoiceGuide';

export function ClientProviders({ children, initialLanguage }: { children: React.ReactNode; initialLanguage?: Language }) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}><NotificationProvider>{children}<VoiceGuide /></NotificationProvider></LanguageProvider>
  );
}
