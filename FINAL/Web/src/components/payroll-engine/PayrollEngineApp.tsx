"use client";

/**
 * Payroll application shell (HR and employee self-service).
 *
 * HR mode (contractor / employer / BSS admin) shows the full payroll console;
 * admins first pick the contractor or employer org to act on. Employee mode
 * (worker) shows "My Payroll". Each module is a self-contained component in
 * ./modules (HR) or ./employee (self-service) receiving `ModuleProps`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { errorMessage, pe, setPayrollOrg } from '@/lib/payroll-engine/api';
import type { ModuleProps, PayrollContextData } from '@/lib/payroll-engine/types';
import { EMPLOYEE_MODULES, HR_MODULES, type ModuleDef } from './registry';
import { Btn, ErrorBox, Loading, inputClass } from './ui';

const ORG_STORAGE_KEY = 'bss.payrollEngine.org';

function readStoredOrg(): string {
  try { return window.localStorage.getItem(ORG_STORAGE_KEY) ?? ''; } catch { return ''; }
}
function storeOrg(id: string): void {
  try { window.localStorage.setItem(ORG_STORAGE_KEY, id); } catch { /* storage unavailable */ }
}

export default function PayrollEngineApp({ mode = 'hr' }: { mode?: 'hr' | 'employee' }) {
  const [ctx, setCtx] = useState<PayrollContextData | null>(null);
  const [error, setError] = useState('');
  const [orgId, setOrgId] = useState(() => (mode === 'hr' && typeof window !== 'undefined' ? readStoredOrg() : ''));
  const [active, setActive] = useState<{ key: string; params: Record<string, string> }>({ key: mode === 'hr' ? 'dashboard' : 'myDashboard', params: {} });
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [nonce, setNonce] = useState(0);

  const loadContext = useCallback(async (org: string) => {
    setError('');
    setPayrollOrg(org || null);
    try {
      const data = await pe.get<PayrollContextData>('context');
      setCtx(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadContext(mode === 'hr' ? readStoredOrg() : ''));
  }, [loadContext, mode]);

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(current => (current?.message === message ? null : current)), 5000);
  }, []);

  const navigate = useCallback((key: string, params: Record<string, string> = {}) => {
    setActive({ key, params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const modules: ModuleDef[] = mode === 'hr' ? HR_MODULES : EMPLOYEE_MODULES;
  const groups = useMemo(() => {
    const out: Array<{ group: string; items: ModuleDef[] }> = [];
    for (const m of modules) {
      const g = out.find(x => x.group === m.group);
      if (g) g.items.push(m); else out.push({ group: m.group, items: [m] });
    }
    return out;
  }, [modules]);

  if (error) return <ErrorBox message={error} onRetry={() => void loadContext(orgId)} />;
  if (!ctx) return <Loading label="Loading payroll…" />;

  if (mode === 'employee' && !ctx.employee) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-sm font-semibold text-gray-800">No payroll record yet</p>
      <p className="text-xs text-gray-500 mt-1">Your payroll appears here once you are bound to a contractor and they run payroll for you.</p>
    </div>;
  }

  const selectOrg = (id: string) => {
    setOrgId(id);
    storeOrg(id);
    setCtx(null);
    setActive({ key: 'dashboard', params: {} });
    void loadContext(id);
  };

  const needsOrg = mode === 'hr' && ctx.isAdmin && !ctx.organization;
  const current = modules.find(m => m.key === active.key) ?? modules[0];
  const Component = current.component;
  const props: ModuleProps = { ctx, notify, navigate, params: active.params };

  return <div className="space-y-4">
    <header className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[var(--color-bss-interactive-blue)]"><Building2 size={18} /></span>
        <div>
          <h1 className="text-base font-bold text-gray-950">{mode === 'hr' ? 'Payroll' : 'My Payroll'}</h1>
          <p className="text-xs text-gray-500">{ctx.organization?.name ?? (ctx.isAdmin ? 'Select an organization' : '')}{ctx.organization?.state ? ` · ${ctx.organization.state}` : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mode === 'hr' && ctx.isAdmin && <select aria-label="Organization" className={`${inputClass} w-72`} value={orgId} onChange={e => selectOrg(e.target.value)}>
          <option value="">Select contractor / employer…</option>
          {(ctx.organizations ?? []).map(o => <option key={o._id} value={o._id}>{o.name} ({o.type})</option>)}
        </select>}
        {mode === 'hr' && ctx.organization && <Btn variant="secondary" onClick={() => {
          void pe.post('employees/sync').then(() => { notify('Employees synced from BSS'); setNonce(n => n + 1); }).catch(err => notify(errorMessage(err), 'error'));
        }}><RefreshCw size={14} />Sync employees</Btn>}
      </div>
    </header>

    {notice && <div role="status" className={`fixed right-4 top-20 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg flex items-start gap-2 ${notice.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      {notice.tone === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0" />}<span>{notice.message}</span>
    </div>}

    {needsOrg ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">Choose a contractor or employer above to manage its payroll.</div> :
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
        <nav aria-label="Payroll modules" className="rounded-2xl border border-gray-200 bg-white p-2 h-max lg:sticky lg:top-4">
          {groups.map(g => <div key={g.group} className="mb-2">
            <p className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{g.group}</p>
            {g.items.map(m => {
              const Icon = m.icon;
              const on = m.key === current.key;
              return <button key={m.key} type="button" onClick={() => navigate(m.key)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${on ? 'bg-blue-50 text-[var(--color-bss-interactive-blue)]' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Icon size={14} />{m.label}
              </button>;
            })}
          </div>)}
        </nav>
        <main className="min-w-0 space-y-4" key={`${current.key}:${nonce}:${orgId}`}><Component {...props} /></main>
      </div>}
  </div>;
}
