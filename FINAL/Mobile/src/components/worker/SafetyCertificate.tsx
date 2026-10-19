"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck2, Printer, X } from 'lucide-react';
import { formatDate } from '@/lib/date';
import { createWorkerQrPayload, renderWorkerQrDataUrl } from '@/components/qr/WorkerQr';
import type { WorkerRecord } from '@/types/portal';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildCertificateHtml(worker: WorkerRecord, certNo: string, issuedAt: string, qrDataUrl?: string) {
  const hs = worker.healthSafety;
  const id = worker.identity, emp = worker.employment;
  const elig = hs?.eligibility;
  const access = elig?.permanentEligible ? 'PERMANENT ACCESS' : elig?.temporaryEligible ? 'TEMPORARY ACCESS' : 'NO ACCESS';
  const fd = (v?: string) => (v ? formatDate(v) : '—');
  const logo = 'https://login.bharatshramsetu.com/bss-brand/bharatshramsetu-logo.png';
  const kitRows = (hs?.kitItems ?? []).map(k => `<tr><td>${esc(k.name)}</td><td>${fd(k.issueDate)}</td><td>${esc(k.condition || '—')}</td></tr>`).join('');
  const trnRows = (hs?.trainings ?? []).map(t => `<tr><td>${esc(t.name)}${t.mandatory ? ' <b style="color:#DC2626;font-size:8px">● MAND</b>' : ''}</td><td>${fd(t.date)}</td><td>${esc(t.trainer || '—')}</td><td>${esc(t.result || '—')}</td><td>${fd(t.validUntil)}</td></tr>`).join('');
  const ind = hs?.induction;
  const indText = ind?.na ? 'Not applicable' : ind ? `Done${ind.validUntil ? ` · valid until ${fd(ind.validUntil)}` : ''}` : 'Not completed';
  const stamp = issuedAt ? new Date(issuedAt) : new Date();
  const issuedOn = `${formatDate(issuedAt || new Date().toISOString())} · ${stamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;
  const cells = (rows: Array<[string, string]>) => rows.map(([a, b]) => `<div><div class="l">${a}</div><div class="v">${esc(b)}</div></div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(certNo)}</title><style>
  @page{size:A4;margin:0}body{margin:0;background:#E6E9EE;font-family:Arial,Helvetica,sans-serif;color:#0f172a}
  .page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:14mm;box-sizing:border-box}
  h1{font-size:18px;margin:4px 0 0;color:#01183A}.band{background:#01183A;color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:3px;display:inline-block;margin:16px 0 8px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px}.l{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700}.v{font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:10.5px}th{background:#F2F6FC;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#01183A}th,td{border:1px solid #DBE3EF;padding:4px 6px}
  @media print{body{background:#fff}.page{margin:0}}</style></head><body><div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #01183A;padding-bottom:10px">
   <div>
    <div style="font-size:9px;font-weight:800;letter-spacing:.14em;color:#64748b;text-transform:uppercase">Health &amp; Safety Compliance</div>
    <h1 style="font-size:20px;margin:4px 0 0;color:#01183A">${esc(hs?.employer || emp.employer)}</h1>
    <div style="font-size:11px;color:#475569;margin-top:2px">PPE Kit Issue, Safety Training &amp; Site Induction</div>
    <div style="font-size:9px;color:#94a3b8;margin-top:3px">Occupational Safety, Health &amp; Working Conditions Code, 2020</div>
   </div>
   <div style="text-align:right;font-size:10px;color:#64748b">Certificate No.<br><b style="color:#01183A;font-size:12px">${esc(certNo)}</b></div></div>
  <div style="display:flex;height:4px;margin-top:2px"><span style="flex:1;background:#E45D24"></span><span style="flex:1;background:#fff"></span><span style="flex:1;background:#14843C"></span></div>
  <div class="band">Section A — Worker identity</div><div class="grid">
   ${cells([['Worker name', id.name], ['Worker BSS ID', id.bssId], ['Employer', hs?.employer || emp.employer], ['Employer BSS ID', hs?.employerBssId || '—'], ['Designation', emp.designation], ['Contractor', hs?.contractor || emp.contractor], ['Contractor BSS ID', hs?.contractorBssId || '—'], ['Site', `${hs?.site || emp.site}${hs?.state ? `, ${hs.state}` : ''}`], ['Joining date', fd(emp.doj)], ['Site access', access]])}</div>
  <div class="band">Section B — PPE kit issued</div><table><thead><tr><th>Item</th><th>Issued</th><th>Condition</th></tr></thead><tbody>${kitRows || '<tr><td colspan="3">No items issued.</td></tr>'}</tbody></table>
  <div class="band">Section C — Safety trainings</div><table><thead><tr><th>Programme</th><th>Date</th><th>Trainer</th><th>Result</th><th>Valid until</th></tr></thead><tbody>${trnRows || '<tr><td colspan="5">No trainings recorded.</td></tr>'}</tbody></table>
  <div class="band">Section D — Site induction</div><div class="grid">
   ${cells([['Programme', 'Site Induction & Orientation'], ['Status', indText], ['Trainer', ind?.trainer || '—'], ['Date', fd(ind?.date)], ['Valid until', fd(ind?.validUntil)]])}</div>
  <p style="font-size:10px;color:#475569;margin-top:14px;line-height:1.6">This certifies that the worker named above has been issued the PPE listed, completed the safety trainings recorded and the site induction, and is <b style="color:#14843C">${access}</b> for site entry as on the date of issue.</p>
  <p style="font-size:10px;color:#475569;margin-top:6px"><b>Digitally signed</b> — computer-generated; no physical signature is required.</p>
  <div style="margin-top:18px;display:flex;justify-content:flex-end;align-items:center;gap:10px">
   <div style="text-align:right;font-size:9px;color:#64748b">Scan to verify<br>worker credential</div>
   <img alt="Worker QR" style="width:86px;height:86px" src="${qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(createWorkerQrPayload(id.bssId))}`}">
  </div>
  <div style="margin-top:14px;padding-top:8px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;font-size:9px;color:#64748b">
   <div style="display:flex;align-items:center;gap:9px">
    <img alt="Bharat Shram Setu" src="${logo}" style="height:30px;width:auto" />
    <div><b style="color:#01183A;font-size:10px">Bharat Shram Setu</b><div style="font-size:8px;color:#94a3b8">Computer-generated · no physical signature required</div></div>
   </div>
   <span style="text-align:right">Issued on <b style="color:#0f172a">${issuedOn}</b><br>Certificate No. <b style="color:#01183A">${esc(certNo)}</b></span>
  </div>
  <div style="margin-top:6px;text-align:center;font-size:8.5px;color:#94a3b8">Certificate No. ${esc(certNo)} · Worker BSS ID ${esc(id.bssId)} · computer-generated</div>
  </div></body></html>`;
}

export default function SafetyCertificateCard({ worker, className = '' }: { worker: WorkerRecord; className?: string }) {
  const cert = worker.healthSafety?.certificate ?? null;
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState('');
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => { let live = true; renderWorkerQrDataUrl(worker.identity.bssId, 240).then(u => { if (live) setQr(u); }).catch(() => {}); return () => { live = false; }; }, [worker.identity.bssId]);
  const html = useMemo(() => (cert ? buildCertificateHtml(worker, cert.certNo, cert.issuedAt, qr) : ''), [worker, cert, qr]);

  return (
    <div className={`rounded-2xl border border-bss-border bg-white p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bss-soft-green flex items-center justify-center text-[#14843C]"><FileCheck2 size={18} /></div>
          <div>
            <p className="text-sm font-bold text-bss-text-primary">Health &amp; Safety certificate</p>
            <p className="text-[11px] text-bss-text-muted">PPE kit · safety training · site induction</p>
          </div>
        </div>
        {cert ? (
          <div className="text-right">
            <p className="text-sm font-mono font-bold text-[#01183A]">{cert.certNo}</p>
            <p className="text-[10px] text-bss-text-muted">Issued {formatDate(cert.issuedAt)}</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-bss-interactive-blue hover:underline"><FileCheck2 size={11} /> View certificate</button>
          </div>
        ) : (
          <p className="text-[10px] text-bss-text-muted max-w-[180px] text-right">Issued by your employer once verification is complete</p>
        )}
      </div>

      {open && cert && (
        <div className="fixed inset-0 z-[90] bg-black/50 p-4 grid place-items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <header className="px-4 py-3 border-b border-bss-border flex items-center justify-between">
              <p className="text-sm font-semibold text-bss-text-primary">Health &amp; Safety certificate · <span className="font-mono">{cert.certNo}</span></p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => frame.current?.contentWindow?.print()} className="h-8 px-3 rounded-lg bg-[#01183A] text-white text-[11px] font-semibold inline-flex items-center gap-1"><Printer size={12} /> Print</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-bss-text-muted hover:text-bss-text-primary"><X size={18} /></button>
              </div>
            </header>
            <iframe ref={frame} title="Health & Safety certificate" srcDoc={html} className="w-full flex-1 min-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
