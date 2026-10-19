"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/date';
import { BTN_SM, useToast } from '@/components/employer/medical/ui';

type Row = {
  templateId: number;
  state: string;
  formType: 'VIII' | 'IX';
  name: string;
  version: number;
  adoptedVersion?: number | null;
  updateAvailable?: boolean;
  updatedAt: string;
  adopted: boolean;
};

export default function MedicalFormAdoptionPage() {
  const { toast, node: toastNode } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | 'all' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/medical-adoption', { cache: 'no-store' });
      const body = await res.json().catch(() => ({})) as { forms?: Row[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not load the published medical forms.');
      setRows(body.forms ?? []);
      setError('');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  const adoptedCount = useMemo(() => rows.filter(r => r.adopted).length, [rows]);
  const updatesAvailable = useMemo(() => rows.filter(r => r.updateAvailable).length, [rows]);

  async function setAdoption(row: Row, adopt: boolean) {
    setBusy(row.templateId);
    setError('');
    try {
      const res = await fetch('/api/employer/medical-adoption', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: row.templateId, adopt }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'The adoption could not be saved.');
      setRows(list => list.map(r => r.templateId === row.templateId
        ? { ...r, adopted: adopt, adoptedVersion: adopt ? r.version : null, updateAvailable: false }
        : r));
      toast(adopt
        ? `${row.state} Form-${row.formType} adopted at v${row.version}.`
        : `${row.state} Form-${row.formType} removed from your Medical Officers.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function setAll(adopt: boolean) {
    const targets = rows.filter(r => r.adopted !== adopt);
    if (!targets.length) return;
    setBusy('all');
    setError('');
    try {
      for (const row of targets) {
        const res = await fetch('/api/employer/medical-adoption', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: row.templateId, adopt }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? 'The adoption could not be saved.');
        }
      }
      setRows(list => list.map(r => ({ ...r, adopted: adopt })));
      toast(`${adopt ? 'Adopted' : 'Cleared'} ${targets.length} medical form(s).`);
    } catch (e) { setError((e as Error).message); await load(); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6 pb-10">
    {toastNode}
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-bss-text-muted uppercase tracking-[0.12em]">Medical</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-bss-text-primary mt-1">Medical Form Adoption</h1>
        <p className="text-sm text-bss-text-muted mt-1">Choose which published Form-VIII / Form-IX versions your Medical Officers use for each state.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-bss-text-muted">{adoptedCount} / {rows.length} adopted{updatesAvailable ? ` · ${updatesAvailable} update(s) available` : ''}</span>
        <button type="button" disabled={busy !== null || !rows.length} onClick={() => void setAll(true)} className={`${BTN_SM} bg-[#01183A] text-white disabled:opacity-50`}>Adopt all</button>
        <button type="button" disabled={busy !== null || !rows.length} onClick={() => void setAll(false)} className={`${BTN_SM} border border-[#DBE3EF] bg-white text-[#01183A] disabled:opacity-50`}>Clear all</button>
      </div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}

    <section className="bss-card rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-bss-border flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-[#EEF2FB] text-[#1E3A8A] grid place-items-center"><FileCheck2 size={16}/></span>
        <div>
          <h2 className="text-sm font-bold text-bss-text-primary">Published medical forms</h2>
          <p className="text-[11px] text-bss-text-muted">Forms are published by BSS Admin per state and form type. Adopting gates what your Medical Officers see.</p>
        </div>
      </header>

      {loading ? <p className="flex items-center gap-2 p-8 text-sm text-bss-text-muted"><Loader2 size={16} className="animate-spin"/>Loading…</p>
        : !rows.length ? <div className="p-8 text-center"><p className="text-sm text-bss-text-muted">No published medical forms yet.</p><p className="text-[11px] text-bss-text-muted mt-1">BSS Admin must publish Form-VIII / Form-IX in the Medical Form Studio first.</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-bss-bg border-b border-bss-border text-[11px] text-bss-text-muted uppercase tracking-wider"><tr>
              <th className="px-5 py-3 font-bold">State / UT</th>
              <th className="px-5 py-3 font-bold">Form</th>
              <th className="px-5 py-3 font-bold">Version</th>
              <th className="px-5 py-3 font-bold">Updated</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-bss-border">
              {rows.map(row => <tr key={row.templateId} className={row.adopted ? 'bg-bss-soft-green/20' : 'hover:bg-bss-bg'}>
                <td className="px-5 py-3 font-semibold text-bss-text-primary">{row.state}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.formType === 'VIII' ? 'bg-bss-blue-tint text-bss-interactive-blue' : 'bg-bss-bg text-bss-text-secondary'}`}>Form-{row.formType}</span></td>
                <td className="px-5 py-3 font-mono text-[#01183A]">v{row.version}</td>
                <td className="px-5 py-3 text-bss-text-muted">{row.updatedAt ? formatDate(row.updatedAt) : '—'}</td>
                <td className="px-5 py-3">
                  {!row.adopted ? <span className="text-[10px] font-semibold text-bss-text-muted">Not adopted</span>
                    : row.updateAvailable
                      ? <span className="inline-flex flex-wrap items-center gap-1 text-[10px] font-bold text-[#C94D18]">Adopted v{row.adoptedVersion} · New v{row.version} available</span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bss-green"><CheckCircle2 size={12}/> Adopted v{row.adoptedVersion ?? row.version}</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-1.5">
                    {row.adopted && row.updateAvailable && <button type="button" disabled={busy !== null} onClick={() => void setAdoption(row, true)}
                      className={`${BTN_SM} bg-[#E45D24] text-white disabled:opacity-50`}>{busy === row.templateId ? 'Saving…' : `Re-adopt v${row.version}`}</button>}
                    <button type="button" disabled={busy !== null} onClick={() => void setAdoption(row, !row.adopted)}
                      className={`${BTN_SM} ${row.adopted ? 'border border-[#DBE3EF] bg-white text-[#DC2626]' : 'bg-[#01183A] text-white'} disabled:opacity-50`}>
                      {busy === row.templateId ? 'Saving…' : row.adopted ? 'Remove' : 'Adopt'}
                    </button>
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table></div>}
    </section>
  </div>;
}
