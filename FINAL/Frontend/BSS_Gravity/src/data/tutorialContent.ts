import type { Language } from '@/i18n';

export type Tutorial = { title: string; steps: string[]; lang?: string };

export function getTutorial(_pathname: string, _language: Language): Tutorial {
  return { title: '', steps: [] };
}