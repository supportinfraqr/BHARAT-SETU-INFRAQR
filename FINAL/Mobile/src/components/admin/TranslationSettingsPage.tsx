"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Globe2, KeyRound, Languages, Loader2, Save, Trash2 } from 'lucide-react';

type Settings = {
  mode: 'free' | 'google_cloud';
  enabled: boolean;
  hasKey: boolean;
  maskedKey: string;
  languages: string[];
};

export default function TranslationSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<Settings['mode']>('free');
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/translation-settings', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: Settings; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not load translation settings.');
      setSettings(body.data);
      setMode(body.data.mode);
      setEnabled(body.data.enabled);
      setApiKey('');
      setClearKey(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load translation settings.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const payload: Record<string, unknown> = { mode, enabled };
      if (clearKey) payload.clearKey = true;
      else if (apiKey.trim()) payload.apiKey = apiKey.trim();
      const response = await fetch('/api/admin/translation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { data?: Settings; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save translation settings.');
      setSettings(body.data);
      setMode(body.data.mode);
      setEnabled(body.data.enabled);
      setApiKey('');
      setClearKey(false);
      setNotice('Translation settings saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save translation settings.');
    } finally { setBusy(false); }
  };

  const keyMissing = mode === 'google_cloud' && !settings?.hasKey && !apiKey.trim() && !clearKey;

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Loading translation settings…</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#062D4F] flex items-center gap-2"><Languages size={22} />Translation</h1>
        <p className="text-sm text-gray-500 mt-1">Machine translation for the {settings?.languages.length ?? 16} UI languages. Curated dictionary strings always take priority; anything else is translated on demand and cached.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm px-4 py-3 flex items-center gap-2"><CheckCircle2 size={16} />{notice}</div>}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-[#1D1D1F]">Enable machine translation</span>
            <span className="block text-xs text-gray-500 mt-0.5">When off, untranslated strings stay in English.</span>
          </span>
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-5 w-5 accent-[#073B67]" />
        </label>

        <div>
          <p className="text-sm font-semibold text-[#1D1D1F] mb-2">Engine</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setMode('free')} className={`text-left rounded-xl border p-3 transition-colors ${mode === 'free' ? 'border-[#073B67] bg-[#073B67]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#073B67]"><Globe2 size={16} />Free Google endpoint</span>
              <span className="block text-xs text-gray-500 mt-1">No key required. Unofficial, best-effort (may throttle).</span>
            </button>
            <button type="button" onClick={() => setMode('google_cloud')} className={`text-left rounded-xl border p-3 transition-colors ${mode === 'google_cloud' ? 'border-[#073B67] bg-[#073B67]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#073B67]"><KeyRound size={16} />Google Cloud Translation API</span>
              <span className="block text-xs text-gray-500 mt-1">Reliable + billed. Requires an API key below.</span>
            </button>
          </div>
        </div>

        {mode === 'google_cloud' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#1D1D1F]">Google Cloud Translation API key</label>
            {settings?.hasKey && !clearKey && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="font-mono bg-gray-100 rounded px-2 py-1">{settings.maskedKey}</span>
                <button type="button" onClick={() => { setClearKey(true); setApiKey(''); }} className="inline-flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={13} />Remove</button>
              </div>
            )}
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setClearKey(false); }}
              placeholder={settings?.hasKey ? 'Enter a new key to replace the stored one' : 'AIza…'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#073B67] focus:outline-none"
              autoComplete="off"
            />
            {keyMissing && <p className="text-xs text-amber-600">A key is required when the Cloud API engine is selected.</p>}
          </div>
        )}

        <div className="pt-1">
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#073B67] text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
