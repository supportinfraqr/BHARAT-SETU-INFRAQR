"use client";

/**
 * Preferences — legacy GET/PUT staffPortal/preferences/:employeeId (models/payroll/employeePreferences.js):
 * language, dateFormat, timeZone, emailNotifications, smsNotifications, theme.
 */

import { useState } from 'react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Btn, Field, Section, Select, Toggle, fmtDateTime, useAction, useLoad } from '../ui';

type Prefs = { _id?: string; language?: string; dateFormat?: string; timeZone?: string; emailNotifications?: boolean; smsNotifications?: boolean; theme?: string; updatedAt?: string };
type Form = Required<Pick<Prefs, 'language' | 'dateFormat' | 'timeZone' | 'emailNotifications' | 'smsNotifications' | 'theme'>>;

const LANGUAGES = [{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी (Hindi)' }, { value: 'es', label: 'Español' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const THEMES = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Follow device' }];

function timeZones(current: string): string[] {
  let zones: string[] = [];
  try { zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? []; } catch { zones = []; }
  const base = zones.length ? zones : ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'];
  return Array.from(new Set(['UTC', 'Asia/Kolkata', current, ...base])).filter(Boolean);
}

export default function MyPreferences({ ctx, notify }: ModuleProps) {
  const me = ctx.employee?._id ?? '';
  const state = useLoad(() => pe.get<Prefs>(`staffPortal/preferences/${me}`), [me]);
  return <Async state={state}>{p => <PrefsForm key={p.updatedAt ?? 'new'} employeeId={me} initial={p} notify={notify} onSaved={state.setData} />}</Async>;
}

function PrefsForm({ employeeId, initial, notify, onSaved }: { employeeId: string; initial: Prefs; notify: ModuleProps['notify']; onSaved: (p: Prefs) => void }) {
  const [form, setForm] = useState<Form>({
    language: initial.language || 'en', dateFormat: initial.dateFormat || 'DD/MM/YYYY', timeZone: initial.timeZone || 'UTC',
    emailNotifications: initial.emailNotifications ?? true, smsNotifications: initial.smsNotifications ?? false, theme: initial.theme || 'light',
  });
  const { busy, run } = useAction(notify);
  const set = (p: Partial<Form>) => setForm(f => ({ ...f, ...p }));
  const save = async () => {
    const out = await run(() => pe.put<Prefs>(`staffPortal/preferences/${employeeId}`, form), 'Preferences saved');
    if (out) onSaved(out);
  };
  return <Section title="Preferences" subtitle={initial.updatedAt ? `Last saved ${fmtDateTime(initial.updatedAt)}` : 'Defaults shown — save to keep your choices.'}>
    <div className="p-4 space-y-4 max-w-xl">
      <Field label="Language"><Select value={form.language} onChange={v => set({ language: v })} options={LANGUAGES} /></Field>
      <Field label="Date format"><Select value={form.dateFormat} onChange={v => set({ dateFormat: v })} options={DATE_FORMATS} /></Field>
      <Field label="Time zone"><Select value={form.timeZone} onChange={v => set({ timeZone: v })} options={timeZones(form.timeZone)} /></Field>
      <Field label="Theme"><Select value={form.theme} onChange={v => set({ theme: v })} options={THEMES} /></Field>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-gray-600 mb-1">Notifications</legend>
        <div><Toggle checked={form.emailNotifications} onChange={v => set({ emailNotifications: v })} label="Email notifications (payslips, claim updates)" /></div>
        <div><Toggle checked={form.smsNotifications} onChange={v => set({ smsNotifications: v })} label="SMS notifications" /></div>
      </fieldset>
      <Btn className="w-full sm:w-auto h-11" busy={busy} onClick={() => void save()}>Save preferences</Btn>
    </div>
  </Section>;
}
