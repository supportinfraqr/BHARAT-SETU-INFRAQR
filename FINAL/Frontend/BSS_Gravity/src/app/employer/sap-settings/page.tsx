"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Database, Download, KeyRound, Loader2, Plus, Save, X } from 'lucide-react';

type FieldMapRow = { field: string; label: string; sapFields: string[] };
type SapSettings = {
  configured: boolean; mode: string; authType: string; baseUrl: string; companyDb: string;
  username: string; entity: string; idField: string; bpFilter: string; verifyTls: boolean;
  extraLogin: Record<string, string>; fieldMapping: Record<string, string[]>; hasPassword: boolean;
  hasToken: boolean; allowlistIps: string[]; fieldMap: FieldMapRow[];
};

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

  const input = 'mt-1 w-full h-10 border border-gray-200 rounded-lg px-3 text-sm';
  const label = 'text-xs font-semibold text-gray-700';

  if (loading) return <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading SAP settings…</p>;

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col sm:flex-row justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Integrations</p><h1 className="text-2xl font-bold mt-1">SAP Settings</h1><p className="text-sm text-gray-500 mt-1">Connect your SAP so you can populate contractor profiles from your vendor/Business-Partner master. Secrets are stored encrypted.</p></div>
      <a href="/api/employer/sap/setup-document" className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-semibold flex items-center gap-2 bg-white hover:bg-gray-50 self-start whitespace-nowrap"><Download size={15}/>Setup &amp; IP-whitelisting doc</a>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><Database size={16} className="text-[#073B67]"/><div><h2 className="text-sm font-semibold text-gray-950">Connection</h2><p className="text-xs text-gray-400">Business One Service Layer (B1) or Gateway OData.</p></div></header>
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><KeyRound size={12}/>Extra login fields (as your SAP sends them)</p>
          <button type="button" onClick={() => setExtraLogin(rows => [...rows, { key: '', value: '' }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add field</button>
        </div>
        <div className="space-y-2">
          {extraLogin.map((row, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input value={row.key} onChange={e => setExtraLogin(rows => rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} placeholder="Field name (e.g., Language)" className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono"/>
            <input value={row.value} onChange={e => setExtraLogin(rows => rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} placeholder="Value" className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono"/>
            <button type="button" onClick={() => setExtraLogin(rows => rows.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600"><X size={14}/></button>
          </div>)}
          {!extraLogin.length && <p className="text-[11px] text-gray-400">No extra fields. Add any additional login parameters your SAP requires.</p>}
        </div>
      </div>
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-gray-950">Field mapping (SAP → contractor profile)</h2><p className="text-xs text-gray-400 mt-0.5">Map any SAP field name to a BSS profile field. Leave blank to use the built-in aliases below.</p></div><button type="button" onClick={() => setMapping(rows => [...rows, { sap: '', bss: '' }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add mapping</button></header>
      <div className="p-5 space-y-2">
        {mapping.map((row, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input value={row.sap} onChange={e => setMapping(rows => rows.map((r, j) => j === i ? { ...r, sap: e.target.value } : r))} placeholder="SAP field (e.g., VendorAddress)" className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono"/>
          <input value={row.bss} onChange={e => setMapping(rows => rows.map((r, j) => j === i ? { ...r, bss: e.target.value } : r))} placeholder="BSS field (e.g., address)" list="bss-profile-fields" className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono"/>
          <button type="button" onClick={() => setMapping(rows => rows.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600"><X size={14}/></button>
        </div>)}
        <datalist id="bss-profile-fields">{fieldMap.map(m => <option key={m.field} value={m.field}>{m.label}</option>)}</datalist>
        {!mapping.length && <p className="text-[11px] text-gray-400">No custom mappings — the built-in aliases apply.</p>}
        {fieldMap.length > 0 && <details className="pt-2"><summary className="text-[11px] font-semibold text-gray-500 cursor-pointer">Built-in aliases ({fieldMap.length})</summary>
          <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden"><table className="w-full text-[11px] text-left"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2">BSS field</th><th className="px-3 py-2">SAP field(s) accepted</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{fieldMap.map(m => <tr key={m.field}><td className="px-3 py-1.5 text-gray-700">{m.label} <span className="font-mono text-gray-400">({m.field})</span></td><td className="px-3 py-1.5 font-mono text-gray-400">{m.sapFields.join(', ')}</td></tr>)}</tbody></table></div>
        </details>}
      </div>

      <footer className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={testId} onChange={e => setTestId(e.target.value)} placeholder="CardCode / Vendor no. to test" className="h-10 w-56 border border-gray-200 rounded-lg px-3 text-sm"/>
          <button type="button" onClick={() => void test()} disabled={testing || !form.baseUrl || !testId.trim()} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">{testing ? <Loader2 size={14} className="animate-spin"/> : <Database size={14}/>}Test connection</button>
        </div>
        <button type="button" onClick={() => void save()} disabled={busy} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? 'Saving…' : 'Save settings'}</button>
      </footer>
    </section>
  </div>;
}
