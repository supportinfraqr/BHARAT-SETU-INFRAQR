"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, KeyRound, Loader2, Pencil, Plus, Save, Sparkles, Star, Trash2, X } from 'lucide-react';

type Credential = {
  id: number;
  provider: string;
  providerLabel: string;
  label: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
  hasKey: boolean;
  maskedKey: string;
};

type CatalogEntry = { id: string; label: string; baseUrl: string };

type FormState = {
  id?: number;
  provider: string;
  model: string;
  customModel: boolean;
  apiKey: string;
  clearKey: boolean;
  baseUrl: string;
  label: string;
  enabled: boolean;
  hasKey: boolean;
};

// Curated model list per provider; "Other" lets the admin type any model id.
const MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-opus-4-1'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro'],
  azure: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  mistral: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct'],
  custom: [],
};

export default function AiAuditSettingsPage() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, c] = await Promise.all([
        fetch('/api/admin/ai/providers', { cache: 'no-store' }),
        fetch('/api/admin/ai/catalog', { cache: 'no-store' }),
      ]);
      const pb = await p.json().catch(() => ({})) as { data?: Credential[]; error?: string };
      const cb = await c.json().catch(() => ({})) as { data?: CatalogEntry[] };
      if (!p.ok || !pb.data) throw new Error(pb.error ?? 'Could not load AI settings.');
      setCreds(pb.data);
      setCatalog(cb.data ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load AI settings.');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const providerLabel = useCallback((id: string) => catalog.find(c => c.id === id)?.label ?? id, [catalog]);

  const openNew = () => {
    const provider = catalog[0]?.id ?? 'openai';
    setForm({
      provider, model: MODELS[provider]?.[0] ?? '', customModel: (MODELS[provider]?.length ?? 0) === 0,
      apiKey: '', clearKey: false, baseUrl: catalog[0]?.baseUrl ?? '', label: '', enabled: true, hasKey: false,
    });
  };

  const openEdit = (c: Credential) => {
    const models = MODELS[c.provider] ?? [];
    setForm({
      id: c.id, provider: c.provider, model: c.model, customModel: models.length === 0 || !models.includes(c.model),
      apiKey: '', clearKey: false, baseUrl: c.baseUrl, label: c.label, enabled: c.enabled, hasKey: c.hasKey,
    });
  };

  const setProvider = (provider: string) => {
    if (!form) return;
    const models = MODELS[provider] ?? [];
    setForm({
      ...form, provider,
      model: models[0] ?? '',
      customModel: models.length === 0,
      baseUrl: catalog.find(c => c.id === provider)?.baseUrl ?? form.baseUrl,
    });
  };

  const save = async () => {
    if (!form) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        provider: form.provider,
        model: form.model,
        label: form.label,
        enabled: form.enabled,
        apiKey: form.apiKey || undefined,
        clearKey: form.clearKey,
      };
      const url = form.id ? `/api/admin/ai/providers/${form.id}` : '/api/admin/ai/providers';
      const response = await fetch(url, {
        method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { data?: Credential; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Could not save the provider.');
      setForm(null);
      setNotice(form.id ? 'Provider updated.' : 'Provider added.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the provider.');
    } finally { setBusy(false); }
  };

  const remove = async (c: Credential) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/ai/providers/${c.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not delete the provider.');
      setNotice('Provider removed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the provider.');
    } finally { setBusy(false); }
  };

  const makeDefault = async (c: Credential) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/ai/providers/${c.id}/default`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not set the default provider.');
      setNotice(`${c.providerLabel} · ${c.model} is now the active audit engine.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not set the default provider.');
    } finally { setBusy(false); }
  };

  const active = useMemo(() => creds.find(c => c.isDefault), [creds]);
  const input = 'w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 block';

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Administration · Audit</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Sparkles size={22} /> AI Audit Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Add API keys from different AI providers, choose the provider and model, and mark which one the audit engine should use.</p>
        </div>
        <button type="button" onClick={openNew} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black self-start sm:self-auto">
          <Plus size={16} /> Add provider key
        </button>
      </header>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center"><Bot size={20} /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Active audit engine</p>
            {active
              ? <p className="text-sm font-semibold text-gray-900">{active.providerLabel} · <span className="font-mono">{active.model || '—'}</span></p>
              : <p className="text-sm text-gray-500">No provider selected yet.</p>}
          </div>
        </div>
        {active?.hasKey && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1"><CheckCircle2 size={12} /> Key stored</span>}
      </div>

      {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">{notice}</p>}
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

      {form && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{form.id ? 'Edit provider' : 'Add provider key'}</h2>
            <button type="button" onClick={() => setForm(null)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"><X size={16} /></button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={label}>Provider *</label>
              <select value={form.provider} onChange={e => setProvider(e.target.value)} className={input}>
                {catalog.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Model *</label>
              {(MODELS[form.provider] ?? []).length > 0 && !form.customModel ? (
                <select value={form.model} onChange={e => setForm(e.target.value === '__other__' ? { ...form, customModel: true, model: '' } : { ...form, model: e.target.value })} className={input}>
                  {(MODELS[form.provider] ?? []).map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="__other__">Other (type a model)…</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="model id" className={input} />
                  {(MODELS[form.provider] ?? []).length > 0 && <button type="button" onClick={() => setForm({ ...form, customModel: false, model: MODELS[form.provider][0] })} className="h-10 px-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 whitespace-nowrap">List</button>}
                </div>
              )}
            </div>
            <div>
              <label className={label}>Label (optional)</label>
              <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Audit primary" className={input} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={label}><span className="inline-flex items-center gap-1"><KeyRound size={12} /> API key {form.hasKey ? '(leave blank to keep)' : '*'}</span></label>
              <input type="password" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value, clearKey: false })} placeholder={form.hasKey ? '•••••••••• (stored)' : 'paste the provider API key'} className={input} autoComplete="off" />
              {form.hasKey && <button type="button" onClick={() => setForm({ ...form, apiKey: '', clearKey: true })} className="mt-1 text-[11px] text-gray-400 hover:text-red-600">Remove stored key</button>}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input id="ai-enabled" type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="w-4 h-4" />
              <label htmlFor="ai-enabled" className="text-sm text-gray-600">Enabled</label>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {form.id ? 'Save changes' : 'Add provider'}
            </button>
          </div>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Configured providers</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{creds.length} provider{creds.length === 1 ? '' : 's'} · keys are encrypted at rest</p>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Loading…</p>
        ) : creds.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No AI providers yet. Use “Add provider key” to add one.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {creds.map(c => (
              <li key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{c.label || providerLabel(c.provider)}</span>
                    <span className="text-[11px] text-gray-500 font-mono">{c.provider} · {c.model || '—'}</span>
                    {c.isDefault
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5"><Star size={11} /> Active</span>
                      : null}
                    {c.enabled
                      ? (c.hasKey ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><CheckCircle2 size={11} /> Key</span>
                                   : <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">No key</span>)
                      : <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Disabled</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">{c.maskedKey || 'no key stored'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!c.isDefault && <button type="button" onClick={() => void makeDefault(c)} disabled={busy} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">Set active</button>}
                  <button type="button" onClick={() => openEdit(c)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"><Pencil size={13} /> Edit</button>
                  <button type="button" onClick={() => void remove(c)} disabled={busy} className="h-9 w-9 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 grid place-items-center disabled:opacity-50" aria-label="Delete provider"><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
