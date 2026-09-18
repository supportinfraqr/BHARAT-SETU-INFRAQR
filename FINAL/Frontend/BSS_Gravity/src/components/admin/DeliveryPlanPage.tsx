"use client";

import { Fragment } from "react";

type Phase = 1 | 2 | 3;
type Row = { id:number; item:string; phase:Phase; star?:boolean };
type Band = { title:string; rows:Row[] };

const BANDS: Band[] = [
  { title: "A · Cost Sheet Templates", rows: [
    { id:1, item:"Cost sheet — approval workflow → Employer Review", phase:1 },
    { id:2, item:"Cost sheet — template creation (Super Admin)", phase:1 },
    { id:3, item:"Cost sheet — configure type / scope / category", phase:1 },
    { id:4, item:"Cost sheet — minimum-wage link (auto-fetch)", phase:1 },
    { id:5, item:"Cost sheet — statutory rules", phase:1 },
    { id:6, item:"Cost sheet — custom cost heads", phase:1 },
    { id:7, item:"Cost sheet — org customisation", phase:1 },
    { id:8, item:"Cost sheet — rule + cost engine (layers / employer cost / billing / CTC)", phase:1 },
    { id:9, item:"Cost sheet — inheritance + versioning", phase:1 },
    { id:10, item:"Cost sheet — binding selection + worker display", phase:1 },
    { id:11, item:"Prospective template updation", phase:2, star:true },
  ]},
  { title: "B · Gate Pass Management", rows: [
    { id:12, item:"Gate pass — 3-category eligibility", phase:1 },
    { id:13, item:"Gate pass — dispatch + unique QR", phase:1 },
    { id:14, item:"Gate pass — gate scan + entry/scan logs", phase:1 },
    { id:15, item:"Gate pass — automatic expiry", phase:1 },
    { id:16, item:"Gate pass — renewal", phase:1 },
    { id:17, item:"Gate pass — revocation", phase:1 },
    { id:18, item:"Gate pass — compliance template + auto checklist", phase:1 },
    { id:19, item:"Gate pass — officer assignment on fields", phase:1 },
    { id:20, item:"Officer role creation (Medical / H&S / Training / Compliance / Security)", phase:3, star:true },
  ]},
  { title: "C · CLRA Registers", rows: [
    { id:21, item:"CLRA — PAN-India register library + importer", phase:1 },
    { id:22, item:"CLRA — state applicability matrix", phase:1 },
    { id:23, item:"CLRA — contractor register workflow", phase:1 },
  ]},
  { title: "D · Audit / Verification & Reports", rows: [
    { id:24, item:"Audit — central 100% verification data model", phase:1 },
    { id:25, item:"Audit — C1–C8 classification engine", phase:1 },
    { id:26, item:"Audit — Results Engine (11 metrics)", phase:1 },
    { id:27, item:"Audit — verification framework (~35 parameters)", phase:1 },
    { id:28, item:"Audit — report mapping (3 audiences)", phase:1 },
    { id:29, item:"Audit — Compliance Officer report", phase:1 },
    { id:30, item:"Audit — Management / Board report", phase:1 },
    { id:31, item:"Audit — Auditor report", phase:1 },
    { id:32, item:"Audit — CAPA workflow", phase:1 },
    { id:33, item:"Audit — cross-module reconciliation", phase:1 },
    { id:34, item:"Audit — evidence completeness + traceability", phase:1 },
  ]},
  { title: "E · AI Agent", rows: [
    { id:35, item:"AI agent", phase:3, star:true },
  ]},
];

const ALL = BANDS.flatMap(b => b.rows);
const counts = { 1: ALL.filter(r => r.phase === 1).length, 2: ALL.filter(r => r.phase === 2).length, 3: ALL.filter(r => r.phase === 3).length };

function Mark({ active }: { active:boolean }) {
  return active
    ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-700 font-black text-[13px]">✓</span>
    : <span className="inline-flex items-center justify-center w-6 h-6 text-red-300 font-black text-[15px]">✗</span>;
}

export default function DeliveryPlanPage() {
  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Delivery plan</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">3-Phase Delivery Plan</h1>
      <p className="text-sm text-gray-500 mt-1">Checkpoints in rows · tick mark against the phase column (✗ where a checkpoint does not apply to that phase).</p>
    </header>

    <section className="grid grid-cols-3 gap-3">
      {([1,2,3] as const).map(p => <article key={p} className="bg-white border border-gray-200 rounded-2xl p-4">
        <strong className="block text-2xl text-gray-900">{counts[p]}</strong>
        <p className="text-xs text-gray-500 mt-1">Phase {p}{p === 1 ? " — core build" : p === 2 ? " — prospective template updation" : " — officer roles + AI agent"}</p>
      </article>)}
    </section>

    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm text-left">
          <thead className="bg-[#0F172A] text-white text-[11px] uppercase tracking-wider sticky top-0 z-10">
            <tr><th className="px-4 py-3 w-12">#</th><th className="px-4 py-3">Work item</th><th className="px-4 py-3 text-center w-24">Phase 1</th><th className="px-4 py-3 text-center w-24">Phase 2</th><th className="px-4 py-3 text-center w-24">Phase 3</th></tr>
          </thead>
          <tbody>
            {BANDS.map(band => <Fragment key={band.title}>
              <tr className="bg-gray-50"><td colSpan={5} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#073B67]">{band.title}</td></tr>
              {band.rows.map(row => <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 tabular-nums">{row.id}</td>
                <td className={`px-4 py-2.5 ${row.star ? "font-semibold text-gray-900" : "text-gray-700"}`}>{row.item}</td>
                {([1,2,3] as const).map(p => <td key={p} className="px-4 py-2.5 text-center"><Mark active={row.phase === p}/></td>)}
              </tr>)}
            </Fragment>)}
          </tbody>
        </table>
      </div>
    </section>

    <p className="text-[11px] text-gray-400">Phase 1 = core build · Phase 2 = prospective template updation · Phase 3 = officer roles + AI agent. ✓ = delivered in that phase · ✗ = not applicable.</p>
  </div>;
}
