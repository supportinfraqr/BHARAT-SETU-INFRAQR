"use client";

import { useMemo, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useContractor } from '@/contexts/ContractorContext';
import '@/lib/desk/desk.css';

type WorkerPayload = {
  bssId: string; name: string; gender: string; dateOfBirth: string; mobile: string; aadhaar: string;
  fatherName: string; address: { permanent: string }; photo: string;
  pan: string; panVerified: boolean; panHolderName: string;
  socialSecurity: { epfoUan: string; uanVerified: boolean; esicIp: string; esicVerified: boolean };
  banking: { bankName: string; holderName: string; accountNumber: string; ifsc: string; status: string; holderMatchesAadhaar: boolean | null };
  dl: { number: string; validTill: string; verified: boolean };
};
type DocId = 'aadhaar' | 'pan' | 'uan' | 'esic' | 'dl' | 'bank';
type Result = 'pass' | 'fail' | 'review' | 'missing' | 'na';
type Src = 'ekyc' | 'pdf' | 'capture' | 'penny' | 'upload' | 'manual';

type DocDef = {
  id: DocId; title: string; source: string; accent: string; iconTag: string; steps: string[];
  integration: boolean; extractable: boolean; src: Src; srcTag: string;
  portal?: { label: string; url: string };
};

const DOC_DEFS: DocDef[] = [
  {
    id: 'aadhaar', title: 'Aadhaar', source: 'UIDAI · download e-Aadhaar', accent: '#C2410C', iconTag: 'UID', src: 'upload', srcTag: 'PDF', integration: false, extractable: true,
    portal: { label: 'Open UIDAI', url: 'https://myaadhaar.uidai.gov.in/genricDownloadAadhaar' },
    steps: ['Open UIDAI and download the e-Aadhaar', 'Upload the Aadhaar (image or PDF)', 'OCR reads the details for you to confirm']
  },
  {
    id: 'pan', title: 'PAN', source: 'Income Tax · download e-PAN', accent: '#1E3A8A', iconTag: 'PAN', src: 'upload', srcTag: 'PDF', integration: false, extractable: true,
    portal: { label: 'Open e-PAN download', url: 'https://onlineservices.proteantech.in/paam/requestAndDownloadEPAN.html' },
    steps: ['Open the e-PAN portal and download the PAN', 'Upload the e-PAN (image or PDF)', 'OCR reads the PAN for you to confirm']
  },
  {
    id: 'uan', title: 'UAN (EPFO)', source: 'EPFO · UAN', accent: '#0F766E', iconTag: 'EPF', src: 'upload', srcTag: 'PDF', integration: false, extractable: true,
    portal: { label: 'Open EPFO', url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/' },
    steps: ['Open EPFO and view the UAN', 'Upload the UAN card (image or PDF)', 'OCR reads the UAN for you to confirm']
  },
  {
    id: 'esic', title: 'ESIC', source: 'ESIC · IP number', accent: '#7C3AED', iconTag: 'ESI', src: 'upload', srcTag: 'PDF', integration: false, extractable: true,
    portal: { label: 'Open UMANG', url: 'https://web.umang.gov.in/' },
    steps: ['Open UMANG / ESIC and view the IP number', 'Upload the ESIC card (image or PDF)', 'OCR reads the IP number for you to confirm']
  },
  {
    id: 'dl', title: 'Driving Licence', source: 'Parivahan · DL', accent: '#0369A1', iconTag: 'DL', src: 'upload', srcTag: 'PDF', integration: false, extractable: true,
    portal: { label: 'Open Parivahan', url: 'https://sarathi.parivahan.gov.in/' },
    steps: ['Open Parivahan and download the DL', 'Upload the DL (image or PDF)', 'OCR reads the number + valid till']
  },
  {
    id: 'bank', title: 'Salary account', source: 'NPCI · penny drop', accent: '#0B7285', iconTag: 'BNK', src: 'penny', srcTag: 'PENY', integration: true, extractable: true,
    steps: ['Enter the account number and IFSC', 'A ₹1 penny drop confirms the account', 'The holder name is matched with Aadhaar']
  },
];

const FIELD_KEYS: Record<DocId, string[]> = {
  aadhaar: ['aadhaar', 'name', 'father', 'dob', 'gender', 'address'],
  pan: ['pan', 'name'],
  uan: ['uan'],
  esic: ['esic'],
  dl: ['dl', 'validTill'],
  bank: ['accountNumber', 'ifsc'],
};

const genderText = (g: string) => ({ MALE: 'Male', FEMALE: 'Female', TRANSGENDER: 'Transgender', M: 'Male', F: 'Female', T: 'Transgender' }[g.toUpperCase()] ?? (g || '—'));
const mask = (v: string) => (v ? `XXXX XXXX ${v.slice(-4)}` : '');
const ddmmyyyy = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (value || '');
};

function rowsFor(w: WorkerPayload, def: DocDef): Array<{ label: string; value: string; result: Result }> {
  const r = (label: string, value: string, verified: boolean): { label: string; value: string; result: Result } =>
    ({ label, value, result: value ? (verified ? 'pass' : 'review') : 'missing' });
  switch (def.id) {
    case 'aadhaar': return [r('Name', w.name, !!w.aadhaar), r('Father', w.fatherName, !!w.aadhaar), r('Address', w.address.permanent, !!w.aadhaar), r('DOB', ddmmyyyy(w.dateOfBirth), !!w.aadhaar), r('Gender', genderText(w.gender), !!w.aadhaar), r('Number', mask(w.aadhaar), !!w.aadhaar)];
    case 'pan': return [r('PAN', w.pan, w.panVerified), r('Holder', w.panHolderName, w.panVerified)];
    case 'uan': return [r('UAN', w.socialSecurity.epfoUan, w.socialSecurity.uanVerified)];
    case 'esic': return [r('IP number', w.socialSecurity.esicIp, w.socialSecurity.esicVerified)];
    case 'dl': return [r('Number', w.dl.number, w.dl.verified), r('Valid till', w.dl.validTill, w.dl.verified)];
    case 'bank': { const ok = w.banking.status === 'Verified'; return [r('Account', w.banking.accountNumber, ok), r('Bank', w.banking.bankName, ok), r('Holder', w.banking.holderName, ok), r('IFSC', w.banking.ifsc, ok)]; }
  }
}

function statusOf(w: WorkerPayload, id: DocId): { verified: boolean; value: string } {
  switch (id) {
    case 'aadhaar': return { verified: !!w.aadhaar, value: mask(w.aadhaar) };
    case 'pan': return { verified: w.panVerified, value: w.pan };
    case 'uan': return { verified: w.socialSecurity.uanVerified, value: w.socialSecurity.epfoUan };
    case 'esic': return { verified: w.socialSecurity.esicVerified, value: w.socialSecurity.esicIp };
    case 'dl': return { verified: w.dl.verified, value: w.dl.number };
    case 'bank': return { verified: w.banking.status === 'Verified', value: w.banking.accountNumber };
  }
}

function jsonPost(url: string, body: unknown) {
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export default function OnboardWorkerPage() {
  const { contractor } = useContractor();
  const workers = useMemo(() => contractor.workers ?? [], [contractor.workers]);

  const [worker, setWorker] = useState<WorkerPayload | null>(null);
  const [loadId, setLoadId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [audit, setAudit] = useState<string[]>([]);

  const [panel, setPanel] = useState<{ doc: DocId; mode: 'integrate' | 'upload' } | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [lastText, setLastText] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [cardPreview, setCardPreview] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sources, setSources] = useState<Partial<Record<DocId, string>>>({});
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  const log = (m: string) => setAudit(a => [`${new Date().toLocaleTimeString('en-IN')} · ${m}`, ...a].slice(0, 40));
  const flash = (m: string) => { setNotice(m); window.setTimeout(() => setNotice(''), 4000); };
  const bssId = worker?.bssId ?? '';
  const post = (path: string, body: unknown) => jsonPost(`/api/contractor/onboard-worker/${bssId}/${path}`, body);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The action failed.'); }
    finally { setBusy(false); }
  }

  function openWorker(id: string) {
    return run(async () => {
      if (!id.trim()) throw new Error('Choose or enter a worker.');
      const res = await fetch(`/api/contractor/onboard-worker/${encodeURIComponent(id.trim().toUpperCase())}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Worker not found.');
      setWorker(j.data as WorkerPayload); setPanel(null); setFields({});
      log(`Opened worker ${j.data.bssId}`);
    });
  }

  function startPanel(doc: DocId, mode: 'integrate' | 'upload') {
    setPanel({ doc, mode });
    if (mode === 'upload') setFields(Object.fromEntries(FIELD_KEYS[doc].map(k => [k, ''])));
  }

  function onUpload(doc: DocId, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    return run(async () => {
      setPanel({ doc, mode: 'upload' });
      setFields(Object.fromEntries(FIELD_KEYS[doc].map(k => [k, ''])));
      setLastText('');
      setPhotoPreview('');
      setCardPreview('');
      setPendingFile(file);
      const form = new FormData();
      form.append('file', file); form.append('kind', doc);
      const res = await fetch(`/api/contractor/onboard-worker/${bssId}/extract`, { method: 'POST', body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'The document could not be read.');
      const extracted = (j.fields || {}) as Record<string, string>;
      setFields(prev => ({ ...prev, ...extracted }));
      setLastText(String(j.text || ''));
      setPhotoPreview(String(j.photo || ''));
      setCardPreview(String(j.card || ''));
      log(`OCR read the ${doc} document (${Object.keys(extracted).length} field(s))`);
    });
  }

  function submitExtract(doc: DocId) {
    return run(async () => {
      const body = doc === 'aadhaar'
        ? { aadhaar: (fields.aadhaar || '').replace(/\D/g, ''), name: fields.name, dob: fields.dob,
            gender: fields.gender, address: fields.address, father: fields.father || fields.care_of,
            photo: photoPreview || '' }
        : doc === 'pan' ? { pan: (fields.pan || '').toUpperCase(), name: fields.name }
          : doc === 'uan' ? { uan: fields.uan }
            : doc === 'esic' ? { esic: fields.esic }
              : doc === 'dl' ? { number: (fields.dl || '').toUpperCase(), validTill: fields.validTill }
                : { accountNumber: fields.accountNumber, ifsc: (fields.ifsc || '').toUpperCase() };
      let res: Response;
      if (doc === 'bank') {
        res = await post('bank/verify', body);
      } else {
        const fd = new FormData();
        fd.append('payload', JSON.stringify(body));
        if (pendingFile) fd.append('document', pendingFile);
        const path = doc === 'aadhaar' ? 'aadhaar/apply' : doc;
        res = await fetch(`/api/contractor/onboard-worker/${bssId}/${path}`, { method: 'POST', body: fd });
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not save the document.');
      const r = await fetch(`/api/contractor/onboard-worker/${bssId}`, { cache: 'no-store' });
      const rj = await r.json().catch(() => ({}));
      if (rj.data) setWorker(rj.data as WorkerPayload);
      setSources(s => ({ ...s, [doc]: 'PDF' }));
      log(`${doc} finalised${doc === 'aadhaar' ? ' (card + photo stored)' : ''}`);
      flash(`${doc === 'dl' ? 'Driving Licence' : doc.toUpperCase()} finalised.`);
      setPanel(null); setFields({}); setPhotoPreview(''); setCardPreview(''); setPendingFile(null);
    });
  }

  function verifyBank() {
    return run(async () => {
      const res = await post('bank/verify', { accountNumber, ifsc });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Bank verification failed.');
      if (j.data) setWorker(j.data as WorkerPayload);
      setSources(s => ({ ...s, bank: 'PENY' }));
      setPanel(null); log('Bank verified (penny drop)'); flash('Bank verified.');
    });
  }

  function primary(doc: DocId, def: DocDef) {
    if (def.integration) return startPanel(doc, 'integrate');
    return startPanel(doc, 'upload');
  }
  const primaryLabel = (def: DocDef) => def.integration ? '① Open integration' : '① Open upload';

  const verifiedCount = worker ? DOC_DEFS.filter(d => statusOf(worker, d.id).verified).length : 0;
  const allDone = verifiedCount === DOC_DEFS.length;

  return (
    <div className="bssDesk">
      <div className="desk">

        {/* ── Left sidebar ── */}
        <aside className="declared">

          {/* Worker selector */}
          <section className="panel">
            <h2>Select Worker</h2>
            <div className="f"><label>Bound worker
              <select value={worker?.bssId ?? ''} onChange={e => void openWorker(e.target.value)} disabled={busy}>
                <option value="">Choose a worker…</option>
                {workers.map(w => <option key={w.id} value={w.bssId}>{w.name || 'Unnamed'} — {w.bssId}</option>)}
              </select></label>
            </div>
            <div className="f"><label>Or enter BSS ID
              <span className="inline">
                <input value={loadId} onChange={e => setLoadId(e.target.value.toUpperCase())} placeholder="BSS-W7KQ2M9X4RT" onKeyDown={e => { if (e.key === 'Enter') void openWorker(loadId); }} />
                <button type="button" className="chip open" onClick={() => void openWorker(loadId)} disabled={busy}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Open
                </button>
              </span></label>
            </div>
          </section>

          {/* Worker card */}
          {worker && (
            <section className="panel">
              <h2>Worker Profile</h2>

              {/* Gradient identity card */}
              <div className="worker-card">
                {worker.photo && (
                  <img src={worker.photo} alt={worker.name}
                    style={{ width: 56, height: 68, objectFit: 'cover', borderRadius: 8, border: '2px solid rgba(255,255,255,.4)', float: 'right', marginLeft: 8, marginTop: -2 }} />
                )}
                <div className="worker-card-name">{worker.name || '—'}</div>
                <div className="worker-card-id">{worker.bssId}</div>
                <div className="worker-card-tags">
                  {worker.mobile && <span className="worker-card-tag">📱 {worker.mobile}</span>}
                  {worker.gender && <span className="worker-card-tag">{genderText(worker.gender)}</span>}
                  {worker.dateOfBirth && <span className="worker-card-tag">🗓 {ddmmyyyy(worker.dateOfBirth)}</span>}
                </div>
              </div>

              <div className="row2">
                <div className="f"><label>Mobile<input value={worker.mobile} readOnly /></label></div>
                <div className="f"><label>BSS ID<input value={worker.bssId} readOnly /></label></div>
              </div>
            </section>
          )}

          {/* Verification progress */}
          {worker && (
            <section className="panel">
              <h2>Verification Progress</h2>

              {/* Progress counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{allDone ? '🎉 All documents verified' : `${verifiedCount} of ${DOC_DEFS.length} complete`}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: allDone ? 'var(--green)' : 'var(--amber)' }}>{Math.round((verifiedCount / DOC_DEFS.length) * 100)}%</span>
              </div>

              {/* Progress bar */}
              <div className="progress-bar-track">
                <div className="progress-bar-fill" data-done={String(allDone)} style={{ width: `${(verifiedCount / DOC_DEFS.length) * 100}%` }} />
              </div>

              {/* Doc list */}
              {DOC_DEFS.map(d => {
                const st = statusOf(worker, d.id);
                return (
                  <div key={d.id} className="doc-status-row">
                    <div className="doc-status-dot" data-v={String(st.verified)} />
                    <span className="doc-status-name">{d.title}</span>
                    <span className="doc-status-badge" data-v={String(st.verified)}>
                      {st.verified ? '✓ Done' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          {/* Audit trail */}
          <section className="panel" style={{ flex: 1 }}>
            <h2>Audit Trail</h2>
            {audit.length ? (
              <ol className="audit-list">
                {audit.map((a, i) => <li key={i}>{a}</li>)}
              </ol>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-lt)', fontStyle: 'italic' }}>No activity yet.</p>
            )}
          </section>

          {/* Alerts */}
          {notice && (
            <div style={{ padding: '0 14px 10px' }}>
              <div className="alert-ok">
                <span style={{ fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 11.5 }}>{notice}</span>
              </div>
            </div>
          )}
          {error && (
            <div style={{ padding: '0 14px 10px' }}>
              <div className="alert-err">
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                <span style={{ fontSize: 11.5 }}>{error}</span>
                <button type="button" onClick={() => setError('')} style={{ marginLeft: 'auto', fontSize: 13, cursor: 'pointer', color: 'var(--red)', background: 'none', border: 'none', padding: 0 }}>✕</button>
              </div>
            </div>
          )}

          {/* Consent */}
          <div style={{ padding: '0 14px 14px' }}>
            <p className="consent">
              Download each document from the official portal (links on every tile), then upload it for OCR. Salary account is verified via penny drop.
              Verify only with the worker present and consenting.
            </p>
          </div>
        </aside>

        {/* ── Right: verification tiles ── */}
        <main className="tiles">
          {!worker ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <h3>No worker selected</h3>
              <p>Select a bound worker from the left panel to begin document verification.</p>
            </div>
          ) : DOC_DEFS.map(def => {
            const st = statusOf(worker, def.id);
            const open = panel?.doc === def.id;
            return (
              <article
                key={def.id}
                className="tile"
                data-doc={def.id}
                data-state={st.verified ? 'verified' : 'pending'}
                style={{ '--accent': def.accent } as CSSProperties}
              >
                {/* Header */}
                <header className="t-head">
                  <span className="t-icon">{def.iconTag}</span>
                  <div className="t-title">
                    <h3>{def.title}</h3>
                    <small className="t-source">{def.source}</small>
                  </div>
                  <span className="status" data-state={st.verified ? 'verified' : 'pending'}>
                    {st.verified ? '✓ Verified' : 'Pending'}
                  </span>
                </header>

                {/* Captured value */}
                <div className="t-num">
                  <button className="t-value" type="button" title="Click to copy"
                    onClick={() => { void navigator.clipboard?.writeText(st.value || ''); }}>
                    {st.value || 'Not captured yet'}
                  </button>
                </div>

                {/* Steps & actions (only when not verified and no panel open) */}
                {!st.verified && !open && (
                  <>
                    <ol className="t-steps">{def.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    <div className="t-actions">
                      {def.integration && (
                        <button className="act open" type="button" onClick={() => primary(def.id, def)} disabled={busy}>
                          {primaryLabel(def)}
                        </button>
                      )}
                      {!def.integration && (
                        <label className="act main">
                          <input type="file" accept="image/*,application/pdf" hidden onChange={e => onUpload(def.id, e)} />
                          <span>📎 Upload &amp; extract</span>
                        </label>
                      )}
                      {def.portal && (
                        <a className="act" href={def.portal.url} target="_blank" rel="noopener noreferrer">↗ {def.portal.label}</a>
                      )}
                    </div>
                  </>
                )}

                {/* Inline panel */}
                {open && (
                  <div className="tile-panel">
                    {panel?.mode === 'integrate' && def.id === 'bank' && (
                      <>
                        <label>Account number
                          <input inputMode="numeric" value={accountNumber}
                            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                            placeholder="Account number" disabled={busy} />
                        </label>
                        <label>IFSC
                          <input value={ifsc}
                            onChange={e => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                            placeholder="SBIN0001234" disabled={busy}
                            style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: '0.05em' }} />
                        </label>
                        <button className="chip ok" type="button" style={{ justifySelf: 'start' }}
                          onClick={verifyBank} disabled={busy || !accountNumber || ifsc.length !== 11}>
                          ₹1 Penny Drop Verify
                        </button>
                      </>
                    )}

                    {panel?.mode === 'upload' && (
                      <>
                        <label className="chip" style={{ justifySelf: 'start', cursor: 'pointer' }}>
                          📎 Choose {def.title} (image / PDF)
                          <input type="file" accept="image/*,application/pdf" hidden onChange={e => onUpload(def.id, e)} />
                        </label>
                        {def.id === 'aadhaar' && (
                          <label className="chip" style={{ justifySelf: 'start', cursor: 'pointer' }}>
                            📷 Worker photo (optional)
                            <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setPhotoPreview(String(r.result || '')); r.readAsDataURL(f); } }} />
                          </label>
                        )}
                        {busy && (
                          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Loader2 size={12} className="animate-spin" /> Reading document…
                          </p>
                        )}
                        {cardPreview && (
                          <div>
                            <p style={{ margin: '0 0 3px', fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>Aadhaar card (stored on Finalise)</p>
                            <img src={cardPreview} alt="Aadhaar card" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 7, border: '1px solid var(--line)' }} />
                          </div>
                        )}
                        {photoPreview && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={photoPreview} alt="photo"
                              style={{ width: 52, height: 64, objectFit: 'cover', borderRadius: 6, border: '1.5px solid var(--line)' }} />
                            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Photo extracted</span>
                          </div>
                        )}
                        {FIELD_KEYS[def.id].map(k => (
                          <label key={k} style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}
                            <input value={fields[k] ?? ''} onChange={e => setFields(f => ({ ...f, [k]: e.target.value }))} placeholder={def.id === 'aadhaar' && k === 'dob' ? 'dd/mm/yyyy' : undefined} disabled={busy} />
                          </label>
                        ))}
                        {!busy && Object.values(fields).some(v => v) && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>
                            ✓ Read from the document — review and finalise.
                          </p>
                        )}
                        {!busy && lastText && (
                          <details style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Raw text ({lastText.replace(/\s+/g, ' ').trim().length} chars)</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', background: 'var(--line-lt)', padding: '7px 9px', borderRadius: 7, marginTop: 4, fontSize: 10.5 }}>{lastText}</pre>
                          </details>
                        )}
                        {!busy && !Object.values(fields).some(v => v) && !lastText && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--red)' }}>
                            ⚠ Nothing could be extracted — upload a clearer copy or type values manually.
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="chip ok" type="button"
                            onClick={() => void submitExtract(def.id)} disabled={busy}>
                            Finalise
                          </button>
                          <button className="chip bad" type="button"
                            onClick={() => { log(`${def.title}: marked mismatch (OCR)`); setPanel(null); }}
                            disabled={busy}>
                            Mismatch
                          </button>
                        </div>
                      </>
                    )}

                    <button type="button" className="chip" style={{ justifySelf: 'start', marginTop: 2 }}
                      onClick={() => setPanel(null)}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Record table */}
                <div className="t-record">
                  <div className="rec-rows">
                    {rowsFor(worker, def).map(r => (
                      <div className="rec-row" key={r.label}>
                        <span className="rl">{r.label}</span>
                        <input value={r.value} readOnly placeholder="—" />
                        <span className="src" data-s={r.value ? def.src : ''}>
                          {r.value ? (sources[def.id] ?? def.srcTag) : ''}
                        </span>
                        <span className="res" data-r={r.result}>
                          {({ pass: '✓', fail: '✕', review: '!', missing: '·', na: '' } as Record<Result, string>)[r.result]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <footer className="t-foot">
                  <small className="blockers">
                    {st.verified ? '✓ All checks passed' : 'Not captured yet'}
                  </small>
                </footer>
              </article>
            );
          })}
        </main>
      </div>
    </div>
  );
}
