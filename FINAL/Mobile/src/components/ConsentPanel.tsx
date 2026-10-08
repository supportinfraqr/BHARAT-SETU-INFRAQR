"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { consentService, consentDate, type ConsentRecord, type ConsentScopeRole } from '@/lib/consents';

/** Shows the consents a portal user has given with revoke (and re-grant) controls.
 *  ``registeredAt`` (the user's real registration/consent date from the server)
 *  is used for currently-given consents so the panel never shows a stale or
 *  invented date from a previous browser session. */
export default function ConsentPanel({ role, registeredAt }: { role: ConsentScopeRole; registeredAt?: string }) {
  // Consents live in localStorage, which is unavailable during SSR — start empty
  // and hydrate after mount so the server and first client render match.
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [notice, setNotice] = useState('');

  // Stamp 'given' consents with the account's real registration/consent date.
  const stamp = (list: ConsentRecord[]): ConsentRecord[] =>
    registeredAt ? list.map(r => (r.status === 'given' ? { ...r, grantedAt: registeredAt } : r)) : list;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate localStorage-backed consents after mount
  useEffect(() => { setRecords(stamp(consentService.list(role))); }, [role, registeredAt]);

  const given = records.filter(record => record.status === 'given').length;

  function revoke(id: string, title: string) {
    setRecords(stamp(consentService.revoke(role, id)));
    setNotice(`Revoked: ${title}. Where the law or an existing workflow already used this consent, historical use remains governed by its original grant.`);
  }
  function grant(id: string, title: string) {
    setRecords(stamp(consentService.grant(role, id)));
    setNotice(`Consent granted again: ${title}.`);
  }
  function reset() {
    setRecords(stamp(consentService.reset(role)));
    setNotice('Consents reset to their original granted state.');
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><ShieldCheck size={17}/></span><div><h2 className="text-sm font-semibold text-gray-950">Consents you have given</h2><p className="text-[11px] text-gray-400 mt-0.5">{given} of {records.length} active · review, and revoke any consent from here</p></div></div>
        <button onClick={reset} className="text-xs font-semibold text-blue-700">Restore defaults</button>
      </header>
      <div className="divide-y divide-gray-100">
        {records.map(record => (
          <div key={record.id} className="px-4 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{record.title}</p>{record.status === 'given' ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5"><CheckCircle2 size={11}/>Given · {consentDate(record.grantedAt)}</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"><XCircle size={11}/>Revoked · {consentDate(record.revokedAt)}</span>}</div>
              <p className="text-xs text-gray-500 mt-1">{record.detail}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Purpose: {record.purpose}</p>
            </div>
            <div className="shrink-0">
              {record.status === 'given'
                ? <button disabled={!record.revocable} onClick={() => revoke(record.id, record.title)} className="h-8 px-3 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Revoke</button>
                : <button onClick={() => grant(record.id, record.title)} className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-semibold inline-flex items-center gap-1"><RotateCcw size={12}/>Grant again</button>}
            </div>
          </div>
        ))}
      </div>
      {notice && <p role="status" className="px-4 py-3 border-t border-gray-100 text-xs text-blue-800 bg-blue-50">{notice}</p>}
    </section>
  );
}
