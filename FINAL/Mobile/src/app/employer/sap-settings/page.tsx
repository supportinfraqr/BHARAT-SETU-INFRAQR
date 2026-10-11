"use client";

import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@/lib/date';
import UnderDevelopmentBanner from '@/components/worker/UnderDevelopmentBanner';
import { CheckCircle2, Database, Download, FileSpreadsheet, KeyRound, Loader2, Plus, RefreshCw, Save, Upload, X } from 'lucide-react';

type FieldMapRow = { field: string; label: string; sapFields: string[] };
type SapSettings = {
  configured: boolean; mode: string; authType: string; baseUrl: string; companyDb: string;
  username: string; entity: string; idField: string; bpFilter: string; verifyTls: boolean;
  extraLogin: Record<string, string>; fieldMapping: Record<string, string[]>; hasPassword: boolean;
  hasToken: boolean; allowlistIps: string[]; fieldMap: FieldMapRow[];
};
type BulkRow = {
  id: number; bssId: string; name: string; sites: string[]; sapId: string;
  status: 'NOT_MAPPED' | 'PENDING' | 'SYNCED' | 'FAILED'; lastStatus: string; lastSyncedAt: string; mappedFields: string[];
};
type BulkCounts = { mapped: number; synced: number; pending: number; failed: number; notMapped: number };
type BulkResultRow = { bssId: string; sapId: string; contractor: string; status: string; detail: string };
const BULK_STATUS_LABEL: Record<string, string> = { NOT_MAPPED: 'Not mapped', PENDING: 'Pending pull', SYNCED: 'Synced', FAILED: 'Failed' };

type KV = { key: string; value: string };

const emptyForm = {
  mode: 'b1', authType: 'session', baseUrl: '', companyDb: '', username: '',
  password: '', token: '', entity: 'A_BusinessPartner', idField: 'CardCode',
  bpFilter: '', verifyTls: true, allowlistIps: '',
};

export default function SapSettingsPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [extraLogin, setExtraLogin] = useState<KV[]>([]);
  const [mapping, setMapping] = useState<Array<{ sap: string; bss: string }>>([]);
  const [fieldMap, setFieldMap] = useState<FieldMapRow[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testId, setTestId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkCounts, setBulkCounts] = useState<BulkCounts | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkMode, setBulkMode] = useState('skip');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResultRow[] | null>(null);
  const [bulkSummary, setBulkSummary] = useState<Record<string, number> | null>(null);

  const loadBulk = useCallback(async () => {
    try {
      const response = await fetch('/api/employer/sap/bulk-status', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: { rows: BulkRow[]; counts: BulkCounts } };
      if (response.ok && body.data) { setBulkRows(body.data.rows); setBulkCounts(body.data.counts); }
    } catch { /* leave as-is */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial bulk-status load
  useEffect(() => { void loadBulk(); }, [loadBulk]);

  async function runBulk() {
    if (!bulkFile) { setBulkError('Choose the filled mapping template (.xlsx).'); return; }
    setBulkBusy(true); setBulkError(''); setBulkNotice(''); setBulkResults(null); setBulkSummary(null);
    try {
      const form = new FormData();
      form.set('mapping', bulkFile);
      form.set('mode', bulkMode);
      const response = await fetch('/api/employer/sap/bulk-sync', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({})) as { data?: { results: BulkResultRow[]; summary: Record<string, number>; live: boolean }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Bulk SAP pull failed.');
      setBulkResults(body.data.results); setBulkSummary(body.data.summary);
      setBulkNotice(`Bulk pull done — ${body.data.summary.synced} synced · ${body.data.summary.skipped} skipped · ${body.data.summary.failed} failed · ${body.data.summary.pending} pending.`);
      setBulkFile(null);
      await loadBulk();
    } catch (reason) { setBulkError(reason instanceof Error ? reason.message : 'Bulk SAP pull failed.'); }
    finally { setBulkBusy(false); }
  }

  const apply = useCallback((data: SapSettings) => {
    setForm({
      mode: data.mode || 'b1', authType: data.authType || 'session', baseUrl: data.baseUrl || '',
      companyDb: data.companyDb || '', username: data.username || '', password: '', token: '',
      entity: data.entity || 'A_BusinessPartner', idField: data.idField || 'CardCode',
      bpFilter: data.bpFilter || '', verifyTls: data.verifyTls !== false,
      allowlistIps: (data.allowlistIps || []).join(', '),
    });
    setExtraLogin(Object.entries(data.extraLogin || {}).map(([key, value]) => ({ key, value: String(value) })));
    const rows: Array<{ sap: string; bss: string }> = [];
    for (const [bss, sapList] of Object.entries(data.fieldMapping || {})) {
      for (const sap of (Array.isArray(sapList) ? sapList : [sapList])) rows.push({ sap: String(sap), bss });
    }
    setMapping(rows);
    setFieldMap(data.fieldMap || []);
    setHasPassword(data.hasPassword); setHasToken(data.hasToken);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employer/sap/config', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { data?: SapSettings; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'SAP settings could not be loaded.');
      apply(body.data); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'SAP settings could not be loaded.'); }
    finally { setLoading(false); }
  }, [apply]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial settings load
  useEffect(() => { void load(); }, [load]);

  function patch(key: string, value: unknown) { setForm(f => ({ ...f, [key]: value })); }

  function buildPayload() {
    const extra: Record<string, string> = {};
    for (const row of extraLogin) if (row.key.trim()) extra[row.key.trim()] = row.value;
    const fm: Record<string, string[]> = {};
    for (const row of mapping) {
      if (!row.bss.trim() || !row.sap.trim()) continue;
      (fm[row.bss.trim()] ||= []).push(row.sap.trim());
    }
    return { ...form, extraLogin: extra, fieldMapping: fm };
  }

  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/sap/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const body = await response.json().catch(() => ({})) as { data?: SapSettings; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'SAP settings could not be saved.');
      apply(body.data);
      setNotice('SAP settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'SAP settings could not be saved.'); }
    finally { setBusy(false); }
  }

  async function test() {
    setTesting(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/employer/sap/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testId.trim() }),
      });
      const body = await response.json().catch(() => ({})) as { data?: { mappedCount: number; mapped: string[] }; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? 'The SAP connection test failed.');
      setNotice(`Connection OK — ${body.data.mappedCount} field(s) mapped: ${body.data.mapped.join(', ')}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The SAP connection test failed.'); }
    finally { setTesting(false); }
  }

  const input = 'mt-1 w-full h-10 border border-bss-border rounded-lg px-3 text-sm';
  const label = 'text-xs font-semibold text-bss-text-primary';

  if (loading) return <p className="flex items-center gap-2 text-sm text-bss-text-muted py-10"><Loader2 size={16} className="animate-spin"/>Loading SAP settings…</p>;

  return <div className="relative space-y-6 pb-12">
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-20 gap-y-28 -rotate-[24deg] scale-[1.6]">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className="text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-black/5 whitespace-nowrap">Under Development</span>)}
      </div>
    </div>
    <div className="relative z-10 space-y-6">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Integrations</p><h1 className="text-2xl font-bold mt-1">SAP Settings</h1><p className="text-sm text-bss-text-muted mt-1">Connect your SAP so you can populate contractor profiles from your vendor/Business-Partner master. Secrets are stored encrypted.</p></div>
      <a href="/api/employer/sap/setup-document" className="h-10 px-4 rounded-lg border border-bss-border text-sm font-semibold flex items-center gap-2 bg-white hover:bg-bss-bg self-start whitespace-nowrap"><Download size={15}/>Setup &amp; IP-whitelisting doc</a>
    </header>
    <UnderDevelopmentBanner note="SAP settings is under development. Saved configuration may change." />

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-2"><Database size={16} className="text-[#01183A]"/><div><h2 className="text-sm font-semibold text-bss-text-primary">Connection</h2><p className="text-xs text-bss-text-muted">Business One Service Layer (B1) or Gateway OData.</p></div></header>
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className={label}>Mode<select value={form.mode} onChange={e => patch('mode', e.target.value)} className={input + ' bg-white'}><option value="b1">SAP Business One (Service Layer)</option><option value="odata">SAP Gateway (OData)</option></select></label>
        <label className={label}>Auth type<select value={form.authType} onChange={e => patch('authType', e.target.value)} className={input + ' bg-white'}><option value="session">Login session (B1SESSION)</option><option value="bearer">Bearer token</option><option value="basic">Basic auth</option></select></label>
        <label className={label}>Verify TLS<select value={form.verifyTls ? 'yes' : 'no'} onChange={e => patch('verifyTls', e.target.value === 'yes')} className={input + ' bg-white'}><option value="yes">Yes</option><option value="no">No (self-signed)</option></select></label>
        <label className={label + ' sm:col-span-2'}>Service base URL<input value={form.baseUrl} onChange={e => patch('baseUrl', e.target.value)} placeholder="https://sap-host:50000/b1s/v1" className={input}/></label>
        <label className={label}>CompanyDB (B1)<input value={form.companyDb} onChange={e => patch('companyDb', e.target.value)} placeholder="SBODEMOIN" className={input}/></label>
        <label className={label}>Username<input value={form.username} onChange={e => patch('username', e.target.value)} placeholder="B1 API user" className={input}/></label>
        <label className={label}>Password<input type="password" value={form.password} onChange={e => patch('password', e.target.value)} placeholder={hasPassword ? '(saved — leave blank to keep)' : ''} className={input}/></label>
        <label className={label}>Token (bearer/OAuth)<input type="password" value={form.token} onChange={e => patch('token', e.target.value)} placeholder={hasToken ? '(saved — leave blank to keep)' : ''} className={input}/></label>
        <label className={label}>ID field<input value={form.idField} onChange={e => patch('idField', e.target.value)} placeholder="CardCode" className={input}/></label>
        <label className={label}>Entity (OData)<input value={form.entity} onChange={e => patch('entity', e.target.value)} placeholder="A_BusinessPartner" className={input}/></label>
        <label className={label}>BP filter<input value={form.bpFilter} onChange={e => patch('bpFilter', e.target.value)} placeholder="CardType eq 'cSupplier'" className={input}/></label>
        <label className={label}>Allow-list IPs (optional)<input value={form.allowlistIps} onChange={e => patch('allowlistIps', e.target.value)} placeholder="blank = auto-detect server IP" className={input}/></label>
      </div>

      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-bss-text-muted flex items-center gap-1"><KeyRound size={12}/>Extra login fields (as your SAP sends them)</p>
          <button type="button" onClick={() => setExtraLogin(rows => [...rows, { key: '', value: '' }])} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add field</button>
        </div>
        <div className="space-y-2">
          {extraLogin.map((row, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input value={row.key} onChange={e => setExtraLogin(rows => rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} placeholder="Field name (e.g., Language)" className="h-9 border border-bss-border rounded-lg px-2 text-xs font-mono"/>
            <input value={row.value} onChange={e => setExtraLogin(rows => rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} placeholder="Value" className="h-9 border border-bss-border rounded-lg px-2 text-xs font-mono"/>
            <button type="button" onClick={() => setExtraLogin(rows => rows.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-bss-text-muted hover:text-bss-error"><X size={14}/></button>
          </div>)}
          {!extraLogin.length && <p className="text-[11px] text-bss-text-muted">No extra fields. Add any additional login parameters your SAP requires.</p>}
        </div>
      </div>
    </section>

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-bss-text-primary">Field mapping (SAP → contractor profile)</h2><p className="text-xs text-bss-text-muted mt-0.5">Map any SAP field name to a BSS profile field. Leave blank to use the built-in aliases below.</p></div><button type="button" onClick={() => setMapping(rows => [...rows, { sap: '', bss: '' }])} className="h-8 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add mapping</button></header>
      <div className="p-5 space-y-2">
        {mapping.map((row, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input value={row.sap} onChange={e => setMapping(rows => rows.map((r, j) => j === i ? { ...r, sap: e.target.value } : r))} placeholder="SAP field (e.g., VendorAddress)" className="h-9 border border-bss-border rounded-lg px-2 text-xs font-mono"/>
          <input value={row.bss} onChange={e => setMapping(rows => rows.map((r, j) => j === i ? { ...r, bss: e.target.value } : r))} placeholder="BSS field (e.g., address)" list="bss-profile-fields" className="h-9 border border-bss-border rounded-lg px-2 text-xs font-mono"/>
          <button type="button" onClick={() => setMapping(rows => rows.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-bss-text-muted hover:text-bss-error"><X size={14}/></button>
        </div>)}
        <datalist id="bss-profile-fields">{fieldMap.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}</datalist>
        {!mapping.length && <p className="text-[11px] text-bss-text-muted">No custom mappings — the built-in aliases apply.</p>}
        {fieldMap.length > 0 && <details className="pt-2"><summary className="text-[11px] font-semibold text-bss-text-muted cursor-pointer">Built-in aliases ({fieldMap.length})</summary>
          <div className="mt-2 rounded-xl border border-bss-border overflow-hidden"><table className="w-full text-[11px] text-left"><thead className="bg-bss-bg text-bss-text-muted"><tr><th className="px-3 py-2">BSS field</th><th className="px-3 py-2">SAP field(s) accepted</th></tr></thead>
            <tbody className="divide-y divide-bss-border">{fieldMap.map(m => <tr key={m.field}><td className="px-3 py-1.5 text-bss-text-primary">{m.label} <span className="font-mono text-bss-text-muted">({m.field})</span></td><td className="px-3 py-1.5 font-mono text-bss-text-muted">{m.sapFields.join(', ')}</td></tr>)}</tbody></table></div>
        </details>}
      </div>

      <footer className="px-5 py-4 border-t border-bss-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={testId} onChange={e => setTestId(e.target.value)} placeholder="CardCode / Vendor no. to test" className="h-10 w-56 border border-bss-border rounded-lg px-3 text-sm"/>
          <button type="button" onClick={() => void test()} disabled={testing || !form.baseUrl || !testId.trim()} className="h-10 px-4 rounded-lg border border-bss-border text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">{testing ? <Loader2 size={14} className="animate-spin"/> : <Database size={14}/>}Test connection</button>
        </div>
        <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? 'Saving…' : 'Save settings'}</button>
      </footer>
    </section>

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#01183A]"/><div><h2 className="text-sm font-semibold text-bss-text-primary">Bulk contractor pull</h2><p className="text-xs text-bss-text-muted">Map each contractor&apos;s BSS ID to its SAP ID, upload, and BSS pulls all of them from SAP.</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/employer/sap/bulk-template" className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><Download size={14}/>Download template</a>
          <a href="/api/employer/sap/bulk-setup-document" className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><Download size={14}/>Bulk setup guide</a>
          <button type="button" onClick={() => void loadBulk()} className="h-9 px-3 rounded-lg border border-bss-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-bss-bg"><RefreshCw size={14}/>Refresh</button>
        </div>
      </header>
      <div className="p-5 space-y-4">
        {bulkCounts && <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 rounded bg-bss-blue-tint text-bss-interactive-blue font-semibold">Mapped {bulkCounts.mapped}</span>
          <span className="px-2 py-1 rounded bg-bss-soft-green text-bss-green font-semibold">Synced {bulkCounts.synced}</span>
          <span className="px-2 py-1 rounded bg-bss-soft-orange text-bss-orange font-semibold">Pending {bulkCounts.pending}</span>
          <span className="px-2 py-1 rounded bg-bss-soft-orange text-bss-error font-semibold">Failed {bulkCounts.failed}</span>
          <span className="px-2 py-1 rounded bg-bss-bg text-bss-text-secondary font-semibold">Not mapped {bulkCounts.notMapped}</span>
        </div>}

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <label className={label}>Mapping template (.xlsx)
            <span className="mt-1 flex items-center justify-center gap-2 h-10 border border-dashed border-bss-border rounded-lg text-xs font-semibold text-bss-text-secondary cursor-pointer hover:bg-bss-bg">{bulkFile ? <FileSpreadsheet size={14}/> : <Upload size={14}/>}{bulkFile ? bulkFile.name : 'Choose filled template'}<input type="file" accept=".xlsx" className="hidden" onChange={e => setBulkFile(e.target.files?.[0] ?? null)}/></span>
          </label>
          <label className={label}>Pull option
            <select value={bulkMode} onChange={e => setBulkMode(e.target.value)} className={input + ' bg-white'}>
              <option value="skip">Skip already mapped</option>
              <option value="force">Force re-pull all</option>
              <option value="failed">Retry failed only</option>
              <option value="pending">Pull pending only</option>
            </select>
          </label>
          <button type="button" onClick={() => void runBulk()} disabled={bulkBusy || !bulkFile} className="h-10 px-4 rounded-lg bg-[#01183A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5">{bulkBusy ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}{bulkBusy ? 'Pulling…' : 'Upload & pull'}</button>
        </div>

        {bulkError && <p role="alert" className="text-xs text-bss-error bg-bss-soft-orange border border-bss-border rounded-lg px-3 py-2">{bulkError}</p>}
        {bulkNotice && <p role="status" className="text-xs text-bss-green bg-bss-soft-green border border-bss-border rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 size={13}/>{bulkNotice}</p>}

        {bulkResults && bulkSummary && <div className="rounded-xl border border-bss-border overflow-hidden">
          <div className="px-3 py-2 bg-bss-bg text-[11px] font-semibold text-bss-text-secondary">Last upload — {bulkSummary.total} row(s): {bulkSummary.synced} synced · {bulkSummary.skipped} skipped · {bulkSummary.failed} failed · {bulkSummary.pending} pending</div>
          <div className="max-h-56 overflow-y-auto"><table className="w-full text-[11px] text-left"><thead className="bg-bss-bg text-bss-text-muted"><tr><th className="px-3 py-1.5">BSS ID</th><th className="px-3 py-1.5">Contractor</th><th className="px-3 py-1.5">SAP ID</th><th className="px-3 py-1.5">Result</th><th className="px-3 py-1.5">Detail</th></tr></thead><tbody className="divide-y divide-bss-border">{bulkResults.map((r, i) => <tr key={i}><td className="px-3 py-1.5 font-mono">{r.bssId}</td><td className="px-3 py-1.5">{r.contractor || '—'}</td><td className="px-3 py-1.5 font-mono">{r.sapId || '—'}</td><td className="px-3 py-1.5"><span className={r.status === 'synced' ? 'text-bss-green font-semibold' : r.status === 'failed' ? 'text-bss-error font-semibold' : r.status === 'pending' ? 'text-bss-orange font-semibold' : 'text-bss-text-muted'}>{r.status}</span></td><td className="px-3 py-1.5 text-bss-text-muted">{r.detail}</td></tr>)}</tbody></table></div>
        </div>}

        <div className="rounded-xl border border-bss-border overflow-hidden">
          <div className="px-3 py-2 bg-bss-bg text-[11px] font-semibold text-bss-text-secondary">Contractor SAP status ({bulkRows.length})</div>
          <div className="max-h-72 overflow-y-auto"><table className="w-full text-[11px] text-left"><thead className="bg-bss-bg text-bss-text-muted"><tr><th className="px-3 py-1.5">BSS ID</th><th className="px-3 py-1.5">Contractor</th><th className="px-3 py-1.5">SAP ID</th><th className="px-3 py-1.5">Status</th><th className="px-3 py-1.5">Last synced</th><th className="px-3 py-1.5">Detail</th></tr></thead><tbody className="divide-y divide-bss-border">{bulkRows.map(r => <tr key={r.id}><td className="px-3 py-1.5 font-mono">{r.bssId}</td><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5 font-mono">{r.sapId || '—'}</td><td className="px-3 py-1.5"><span className={r.status === 'SYNCED' ? 'text-bss-green font-semibold' : r.status === 'FAILED' ? 'text-bss-error font-semibold' : r.status === 'PENDING' ? 'text-bss-orange font-semibold' : 'text-bss-text-muted'}>{BULK_STATUS_LABEL[r.status]}</span></td><td className="px-3 py-1.5 text-bss-text-muted">{formatDate(r.lastSyncedAt)}</td><td className="px-3 py-1.5 text-bss-text-muted">{r.lastStatus || '—'}</td></tr>)}</tbody></table></div>
        </div>
      </div>
    </section>
    </div>
  </div>;
}
