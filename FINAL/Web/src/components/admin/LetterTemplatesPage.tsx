"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { INDIA_STATES } from "@/data/indiaStates";
import { DEFAULT_LETTER_LOGO } from "@/lib/letterBrand";
import DocumentStudioEditor, { type StudioToken } from "@/components/admin/DocumentStudioEditor";

type LetterTemplate = {
  id: number; name: string; state: string;
  letterType: 'APPOINTMENT' | 'EXPERIENCE';
  letterTypeLabel: string; html: string; logoUrl?: string; active: boolean; updatedAt: string;
};

const LETTER_TOKENS: StudioToken[] = [
  { value: '{{letterTitle}}', label: 'Letter title', group: 'Document' },
  { value: '{{refNo}}', label: 'Reference number', group: 'Document' },
  { value: '{{issueDate}}', label: 'Issue date', group: 'Document' },
  { value: '{{workerName}}', label: 'Worker name', group: 'Worker' },
  { value: '{{workerBssId}}', label: 'Worker BSS ID', group: 'Worker' },
  { value: '{{fatherName}}', label: 'Father / spouse name', group: 'Worker' },
  { value: '{{dob}}', label: 'Date of birth', group: 'Worker' },
  { value: '{{gender}}', label: 'Gender', group: 'Worker' },
  { value: '{{mobile}}', label: 'Mobile', group: 'Worker' },
  { value: '{{address}}', label: 'Address', group: 'Worker' },
  { value: '{{designation}}', label: 'Designation', group: 'Employment' },
  { value: '{{department}}', label: 'Department', group: 'Employment' },
  { value: '{{doj}}', label: 'Date of joining', group: 'Employment' },
  { value: '{{wage}}', label: 'Gross monthly wage', group: 'Employment' },
  { value: '{{costSheetCode}}', label: 'Cost sheet code (Auto-fetches details)', group: 'Cost Sheet' },
  { value: '{{costSheetSection}}', label: 'Attached cost sheet block (blank if none)', group: 'Cost Sheet' },
  { value: '{{contractorName}}', label: 'Contractor name', group: 'Parties' },
  { value: '{{contractorBssId}}', label: 'Contractor BSS ID', group: 'Parties' },
  { value: '{{contractorAddress}}', label: 'Contractor address', group: 'Parties' },
  { value: '{{employerName}}', label: 'Principal employer', group: 'Parties' },
  { value: '{{employerBssId}}', label: 'Principal employer BSS ID', group: 'Parties' },
  { value: '{{siteName}}', label: 'Site name', group: 'Parties' },
  { value: '{{siteAddress}}', label: 'Site address', group: 'Parties' },
  { value: '{{salaryBreakdownTable}}', label: 'Salary & CTC Breakdown Table', group: 'Tables & Columns' },
  { value: '{{relievingClearanceTable}}', label: 'Relieving Clearance Table', group: 'Tables & Columns' },
  { value: '{{employmentGridTable}}', label: 'Employment Grid Matrix', group: 'Tables & Columns' },
  { value: '{{formXVTable}}', label: 'FORM XV Service Certificate Table', group: 'Tables & Columns' },
  { value: '{{relievingDate}}', label: 'Relieving date', group: 'Employment' },
  { value: '{{identificationMarks}}', label: 'Identification marks', group: 'Worker' },
  { value: '{{logoUrl}}', label: 'Logo (header)', group: 'Branding' },
];

// Starter HTML for a brand-new template.
//
// The appointment letter and the statutory Form XV live in exactly one place —
// the backend snapshot bss_core/seeds/letter_defaults.py, served back by
// /api/admin/letter-templates. This page reuses the all-India default row as
// the starter rather than keeping a hand-maintained copy, which used to drift
// away from the seeded templates.
/** BSS branding is appointment-only; Form XV is a statutory government form. */
const UNBRANDED_TYPES = new Set(["EXPERIENCE"]);
function defaultLogoFor(letterType?: string, current?: string): string {
  // Unbranded types are always blank: a stale logo on a statutory Form XV row
  // must be dropped, not carried forward into the preview or a save.
  if (UNBRANDED_TYPES.has((letterType ?? "").toUpperCase())) return "";
  return (current ?? "").trim() || DEFAULT_LETTER_LOGO;
}

const BLANK_STARTER_HTML = `<!doctype html><html><head><meta charset="utf-8"/><style>
  .page { max-width:100%; margin:0; padding:0; }
</style></head><body><div class="page">
</div></body></html>`;

// Sample values used only for the live preview (not saved).
const SAMPLE: Record<string, string> = {
  letterTitle: 'Appointment Letter', refNo: 'BSS/APPT/00042', issueDate: '01 Sep 2026',
  workerName: 'Ramesh Kumar', workerBssId: 'BSS-W9MQKMHMQYKU', fatherName: 'Suresh Kumar',
  dob: '05 May 1995', gender: 'M', mobile: '9876543210', address: 'Village X, Pune, Maharashtra',
  designation: 'Mason', department: 'Civil Works', doj: '12 Jun 2026', relievingDate: '25 Sep 2026',
  identificationMarks: 'Mole on right forearm', wage: '₹25,000',
  costSheetCode: 'BSS-CS-78A9B2', costSheetName: 'Maharashtra Construction — Skilled Grade A',
  costSheetCategory: 'Skilled', costSheetGrade: 'Grade A', ctc: '₹29,850',
  epfEmployer: '₹1,950', esicEmployer: '₹813', netTakeHome: '₹22,400',
  contractorName: 'BuildWell Contractors Pvt Ltd', contractorBssId: 'BSS-C00000000004',
  contractorAddress: 'Plot 4, MIDC, Pune', employerName: 'Adani Infra Pvt Ltd',
  employerBssId: 'BSS-E00000000001',
  siteName: 'Demo Metro Site', siteAddress: 'Sector 21, Navi Mumbai, Maharashtra',
  formXVTable: `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:11px;text-align:center;border:1px solid #334155;">
      <thead>
        <tr style="background:#f1f5f9;color:#0f172a;font-weight:bold;">
          <th style="padding:6px;border:1px solid #334155;width:6%;" rowspan="2">Sl. No.</th>
          <th style="padding:6px;border:1px solid #334155;" colspan="2">Total period for which employed</th>
          <th style="padding:6px;border:1px solid #334155;width:22%;" rowspan="2">Nature of work done</th>
          <th style="padding:6px;border:1px solid #334155;width:30%;" rowspan="2">Rate of wages (with particulars of unit in case of Piece-work)</th>
          <th style="padding:6px;border:1px solid #334155;width:18%;" rowspan="2">Remarks</th>
        </tr>
        <tr style="background:#f8fafc;color:#0f172a;font-weight:bold;">
          <th style="padding:6px;border:1px solid #334155;width:12%;">From</th>
          <th style="padding:6px;border:1px solid #334155;width:12%;">To</th>
        </tr>
        <tr style="background:#e2e8f0;font-weight:600;font-size:10px;color:#475569;">
          <td style="padding:4px;border:1px solid #334155;">1</td>
          <td style="padding:4px;border:1px solid #334155;">2</td>
          <td style="padding:4px;border:1px solid #334155;">3</td>
          <td style="padding:4px;border:1px solid #334155;">4</td>
          <td style="padding:4px;border:1px solid #334155;">5</td>
          <td style="padding:4px;border:1px solid #334155;">6</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 6px;border:1px solid #334155;">1</td>
          <td style="padding:8px 6px;border:1px solid #334155;">12 Jun 2026</td>
          <td style="padding:8px 6px;border:1px solid #334155;">25 Sep 2026</td>
          <td style="padding:8px 6px;border:1px solid #334155;">Masonry &amp; Civil Works</td>
          <td style="padding:8px 6px;border:1px solid #334155;">₹25,000 / Month</td>
          <td style="padding:8px 6px;border:1px solid #334155;">Satisfactory Service</td>
        </tr>
      </tbody>
    </table>
  `,
  salaryBreakdownTable: `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
      <thead>
        <tr style="background:#073B67;color:#fff;">
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Salary Component</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #073B67;">Monthly Rate (₹)</th>
          <th style="padding:6px 10px;text-align:right;border:1px solid #073B67;">Annual Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Basic Wage</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">15,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">1,80,000</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;">House Rent Allowance (HRA)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">6,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">72,000</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Special / Site Allowance</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">4,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">48,000</td></tr>
        <tr style="background:#f1f5f9;font-weight:bold;"><td style="padding:6px 10px;border:1px solid #94a3b8;color:#073B67;">Gross Monthly Salary</td><td style="padding:6px 10px;text-align:right;border:1px solid #94a3b8;color:#073B67;">25,000</td><td style="padding:6px 10px;text-align:right;border:1px solid #94a3b8;color:#073B67;">3,00,000</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;">Employer EPF Contribution (12%)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">1,800</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">21,600</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;">Employer ESIC Contribution (3.25%)</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">813</td><td style="padding:6px 10px;text-align:right;border:1px solid #cbd5e1;">9,756</td></tr>
        <tr style="background:#e0f2fe;font-weight:bold;"><td style="padding:6px 10px;border:1px solid #0284c7;color:#0369a1;">Total Cost to Company (CTC)</td><td style="padding:6px 10px;text-align:right;border:1px solid #0284c7;color:#0369a1;">27,613</td><td style="padding:6px 10px;text-align:right;border:1px solid #0284c7;color:#0369a1;">3,31,356</td></tr>
      </tbody>
    </table>
  `,
  relievingClearanceTable: `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
      <thead>
        <tr style="background:#073B67;color:#fff;">
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Clearance Category</th>
          <th style="padding:6px 10px;text-align:center;border:1px solid #073B67;">Clearance Status</th>
          <th style="padding:6px 10px;text-align:left;border:1px solid #073B67;">Remarks / Authority Sign-Off</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Site Equipment & PPE Assets</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">CLEARED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">All issued items returned in full</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Full & Final Wage Settlement</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">CLEARED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">All wages & statutory dues paid</td></tr>
        <tr><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Gate Pass & ID Credentials</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">SURRENDERED</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">Identity card surrendered at site gate</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">Notice Period & Conduct Verification</td><td style="padding:6px 10px;text-align:center;border:1px solid #cbd5e1;color:#166534;font-weight:bold;">SATISFACTORY</td><td style="padding:6px 10px;border:1px solid #cbd5e1;">Good conduct during service</td></tr>
      </tbody>
    </table>
  `,
  employmentGridTable: `
    <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;">
      <tbody>
        <tr><td style="border:1px solid #94a3b8;padding:6px 10px;background:#F0F4FA;color:#073B67;font-weight:600;width:35%;">Contractor / Service Provider</td><td style="border:1px solid #94a3b8;padding:6px 10px;">BuildWell Contractors Pvt Ltd (BSS-C00000000004)</td></tr>
        <tr><td style="border:1px solid #94a3b8;padding:6px 10px;background:#F0F4FA;color:#073B67;font-weight:600;">Principal Employer</td><td style="border:1px solid #94a3b8;padding:6px 10px;">Adani Infra Pvt Ltd (BSS-E00000000001)</td></tr>
        <tr><td style="border:1px solid #94a3b8;padding:6px 10px;background:#F0F4FA;color:#073B67;font-weight:600;">Project Site & Address</td><td style="border:1px solid #94a3b8;padding:6px 10px;">Demo Metro Site, Sector 21, Navi Mumbai, Maharashtra</td></tr>
      </tbody>
    </table>
  `,
};

function renderPreview(htmlText: string, logoUrl: string, letterType?: string): string {
  let out = htmlText || '';
  const effectiveLogo = defaultLogoFor(letterType, logoUrl);
  const values: Record<string, string> = { ...SAMPLE, logoUrl: effectiveLogo };
  
  // Replace tokens with flexibility for whitespace (e.g. {{ logoUrl }}, {{logoUrl}}, {{ workerName }})
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    out = out.replace(regex, value);
  }
  return out;
}

const input = "mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs";

export default function LetterTemplatesPage() {
  const [rows, setRows] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Partial<LetterTemplate> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LetterTemplate | null>(null);

  function stateTypeTaken(state: string, letterType: string, excludeId?: number) {
    return rows.some(r => r.id !== excludeId && r.letterType === letterType
      && (r.state || "").toLowerCase() === (state || "").toLowerCase());
  }

  /** Editor tokens for a type — the logo token is appointment-only. */
  function letterTokensFor(letterType?: string) {
    if (UNBRANDED_TYPES.has((letterType ?? "").toUpperCase())) {
      return LETTER_TOKENS.filter(t => t.value !== "{{logoUrl}}");
    }
    return LETTER_TOKENS;
  }

  /** Starter for a new template: the all-India default row for that type. */
  function starterHtmlFor(letterType: string) {
    const allIndia = rows.find(r => r.letterType === letterType && !r.state && r.html);
    return allIndia?.html || BLANK_STARTER_HTML;
  }

  function firstFreeStateType(): { state: string; letterType: LetterTemplate['letterType'] } {
    const appts = new Set(rows.filter(r => r.letterType === "APPOINTMENT").map(r => (r.state || "").toLowerCase()));
    const rels = new Set(rows.filter(r => r.letterType === "EXPERIENCE").map(r => (r.state || "").toLowerCase()));
    for (const st of INDIA_STATES) {
      if (!appts.has(st.toLowerCase())) return { state: st, letterType: "APPOINTMENT" };
      if (!rels.has(st.toLowerCase())) return { state: st, letterType: "EXPERIENCE" };
    }
    return { state: INDIA_STATES[0], letterType: "APPOINTMENT" };
  }

  function onLogo(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Logo must be 10 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => setEdit(v => ({ ...v, logoUrl: String(reader.result || '') }));
    reader.onerror = () => setError('The logo could not be read.');
    reader.readAsDataURL(file);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/letter-templates", { cache: "no-store" });
      const body = await res.json().catch(() => ({})) as { rows?: LetterTemplate[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not load templates.");
      setRows(body.rows ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load templates."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!edit) return;
    if (!edit.name?.trim()) { setError("Template name is required."); return; }
    const letterType = edit.letterType ?? "APPOINTMENT";
    const typeLabel = letterType === "EXPERIENCE" ? "Experience / Releasing Letter" : "Appointment Letter";
    if (stateTypeTaken(edit.state ?? "", letterType, edit.id)) {
      setError(`A template for ${typeLabel} in "${edit.state || 'All India'}" already exists. Edit or delete the existing one instead of adding a duplicate.`);
      return;
    }
    setBusy(true); setError("");
    try {
      const payload = {
        name: edit.name, state: edit.state ?? "", letterType,
        html: edit.html ?? "", logoUrl: edit.logoUrl ?? "", active: edit.active ?? true,
      };
      const res = await fetch(edit.id ? `/api/admin/letter-templates/${edit.id}` : "/api/admin/letter-templates", {
        method: edit.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Save failed.");
      setEdit(null); setNotice(edit.id ? "Template updated." : "Template created.");
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function remove(t: LetterTemplate) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/letter-templates/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setConfirmDelete(null); setNotice("Template deleted."); void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  async function copyToAllStates(t: LetterTemplate) {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/letter-templates/${t.id}/copy-all-states`, { method: "POST" });
      const body = await res.json().catch(() => ({})) as { created_count?: number; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Copy failed.");
      setNotice(`Successfully copied "${t.name}" to ${body.created_count ?? 0} state(s) without templates!`);
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Copy failed."); }
    finally { setBusy(false); }
  }

  async function seedAllStatesDefaults(overwrite = false) {
    if (overwrite && !confirm("Are you sure you want to delete ALL existing state templates and replace them with statutory Form XV & Salary Breakdown defaults?")) {
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/admin/letter-templates/seed${overwrite ? '?overwrite=true' : ''}`, { method: "POST" });
      const body = await res.json().catch(() => ({})) as { createdCount?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Seeding default templates failed.");
      setNotice(body.message ?? `Successfully seeded default templates across all states!`);
      void load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Seeding default templates failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">Masters</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Letter Templates</h1>
        <p className="text-sm text-gray-500 mt-1">State-wise HTML templates for Appointment and Experience (releasing) letters. Each state allows <strong>1 Appointment Letter</strong> and <strong>1 Releasing Letter</strong> max.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={busy}
          onClick={() => void seedAllStatesDefaults(true)}
          title="Seed and replace default statutory Form XV & Appointment templates across all states"
          className="h-10 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-indigo-100 transition-colors disabled:opacity-60"
        >
          <Copy size={14} /> Seed / Replace with Defaults
        </button>
        <button
          onClick={() => {
            const free = firstFreeStateType();
            const typeLabel = free.letterType === "EXPERIENCE" ? "Experience / Releasing Letter" : "Appointment Letter";
            setEdit({
              letterType: free.letterType,
              state: free.state,
              active: true,
              html: "",
              logoUrl: defaultLogoFor(free.letterType),
              name: `${free.state} — ${typeLabel}`
            });
            setError("");
          }}
          className="h-10 px-4 rounded-xl bg-[#073B67] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#052d50] transition-colors"
        >
          <Plus size={15} /> Create State Template
        </button>
      </div>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin" />Loading…</p>
      : <div className="space-y-6">
          {(() => {
            // Display states that have at least one template created
            const configuredStates = INDIA_STATES.filter(st => rows.some(r => (r.state || "").toLowerCase() === st.toLowerCase()));
            
            if (configuredStates.length === 0) {
              return (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600 font-medium">No state templates configured yet.</p>
                  <p className="text-xs text-slate-400">Click &ldquo;Create State Template&rdquo; above or add templates for a state below.</p>
                </div>
              );
            }

            return configuredStates.map(stateGroup => {
              const stateRows = rows.filter(r => (r.state || "").toLowerCase() === stateGroup.toLowerCase());
              const appt = stateRows.find(r => r.letterType === "APPOINTMENT");
              const rel = stateRows.find(r => r.letterType === "EXPERIENCE");

              return (
                <section key={stateGroup} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <header className="px-5 py-3.5 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-900">{stateGroup}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${stateRows.length === 2 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/70 text-slate-700'}`}>
                        {stateRows.length} / 2 Templates {stateRows.length === 2 ? '(Full)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!appt && (
                        <button onClick={() => { setEdit({ letterType: "APPOINTMENT", state: stateGroup, active: true, html: "", logoUrl: DEFAULT_LETTER_LOGO, name: `${stateGroup} — Appointment Letter` }); setError(""); }} className="h-7 px-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 text-[11px] font-semibold flex items-center gap-1 hover:bg-blue-100">
                          <Plus size={12} />Add Appointment
                        </button>
                      )}
                      {!rel && (
                        <button onClick={() => { setEdit({ letterType: "EXPERIENCE", state: stateGroup, active: true, html: "", logoUrl: "", name: `${stateGroup} — Form XV Service Certificate (Releasing Letter)` }); setError(""); }} className="h-7 px-2.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 text-[11px] font-semibold flex items-center gap-1 hover:bg-emerald-100">
                          <Plus size={12} />Add Releasing
                        </button>
                      )}
                    </div>
                  </header>

                  <div className="divide-y divide-gray-100">
                    {stateRows.map(t => (
                      <div key={t.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-gray-900">{t.name}</strong>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${t.letterType === "APPOINTMENT" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                              {t.letterTypeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">Updated {t.updatedAt?.slice(0, 10)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                          <button disabled={busy} onClick={() => void copyToAllStates(t)} title="Copy this template to all states without a template" className="h-8 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50"><Copy size={12} />Copy to All States</button>
                          <button onClick={() => setEdit({ ...t, logoUrl: defaultLogoFor(t.letterType, t.logoUrl) })} className="h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-gray-50"><Pencil size={12} />Edit</button>
                          <button onClick={() => setConfirmDelete(t)} className="h-8 px-3 rounded-lg border border-red-200 text-[11px] font-semibold text-red-600 inline-flex items-center gap-1 hover:bg-red-50"><Trash2 size={12} />Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            });
          })()}
        </div>}

    {edit && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-sm font-semibold">{edit.id ? "Edit letter template" : "New letter template"}</h2><button onClick={() => setEdit(null)} aria-label="Close"><X size={16} /></button></header>
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">{error}</div>}
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-[11px] font-semibold text-gray-600">Step 1: Select State<select value={edit.state ?? INDIA_STATES[0]} onChange={e => {
              const newState = e.target.value;
              const typeLabel = edit.letterType === "EXPERIENCE" ? "Experience / Releasing Letter" : "Appointment Letter";
              setEdit(v => ({ ...v, state: newState, name: `${newState} — ${typeLabel}` }));
            }} className={input}>{INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-gray-600">Step 2: Select Letter Type<select value={edit.letterType ?? "APPOINTMENT"} onChange={e => {
              const newType = e.target.value as LetterTemplate['letterType'];
              const typeLabel = newType === "EXPERIENCE" ? "Experience / Releasing Letter" : "Appointment Letter";
              const st = edit.state || INDIA_STATES[0];
              setEdit(v => ({ ...v, letterType: newType, name: `${st} — ${typeLabel}` }));
            }} className={input}><option value="APPOINTMENT">Appointment Letter</option><option value="EXPERIENCE">Experience / Releasing Letter</option></select></label>
            <label className="text-[11px] font-semibold text-gray-600">Step 3: Template Name<input value={edit.name ?? ""} onChange={e => setEdit(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Maharashtra — Appointment Letter" className={input} /></label>
          </div>

          {(() => {
            const taken = stateTypeTaken(edit.state ?? "", edit.letterType ?? "APPOINTMENT", edit.id);
            if (!taken) return null;
            const typeLabel = edit.letterType === "EXPERIENCE" ? "Experience / Releasing Letter" : "Appointment Letter";
            return <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
              <span>⚠</span><span>A template for {typeLabel} in &ldquo;{edit.state || 'All India'}&rdquo; already exists. Edit or delete the existing one instead — saving a duplicate is not allowed.</span>
            </p>;
          })()}

          <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={edit.active ?? true} onChange={e => setEdit(v => ({ ...v, active: e.target.checked }))} className="accent-[#073B67]" />Active</label>

          {/* Logo — appointment letters only; Form XV is a statutory form. */}
          {!(edit.letterType ?? "").toUpperCase().startsWith("EXPERIENCE") && (
          <div className="rounded-xl border border-gray-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600">Logo (letter header)</p>
              {edit.logoUrl ? <button type="button" onClick={() => setEdit(v => ({ ...v, logoUrl: "" }))} className="text-[10px] text-red-600 font-semibold">Remove</button> : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-gray-200 grid place-items-center overflow-hidden bg-white flex-shrink-0">
                {defaultLogoFor(edit.letterType, edit.logoUrl) ? <img src={defaultLogoFor(edit.letterType, edit.logoUrl)} alt="logo preview" className="max-w-full max-h-full object-contain" /> : <span className="text-[9px] text-gray-300">No logo</span>}
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <input value={edit.logoUrl ?? ""} onChange={e => setEdit(v => ({ ...v, logoUrl: e.target.value }))} placeholder="Logo URL (https://…/logo.png) or upload" className={input} />
                <label className="inline-flex h-8 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold items-center gap-1 cursor-pointer hover:bg-gray-50"><Upload size={12} />Upload logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => { onLogo(e.target.files?.[0]); e.target.value = ""; }} /></label>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Insert <code className="font-mono">{`{{logoUrl}}`}</code> where the logo should appear (e.g. inside the header).</p>
          </div>
          )}

          <DocumentStudioEditor
            key={`${edit.id || 'new'}-${edit.letterType || 'APPOINTMENT'}`}
            value={edit.html ?? ""}
            onChange={html => setEdit(v => ({ ...v, html }))}
            tokens={letterTokensFor(edit.letterType)}
            renderPreview={html => renderPreview(html, edit.logoUrl || "", edit.letterType)}
            defaultHtml={starterHtmlFor(edit.letterType || "APPOINTMENT")}
          />
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2"><button onClick={() => setEdit(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button><button disabled={busy || !edit.name?.trim() || stateTypeTaken(edit.state ?? "", edit.letterType ?? "APPOINTMENT", edit.id)} onClick={() => void save()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60">{busy ? "Saving…" : "Save template"}</button></footer>
      </section>
    </div>}

    {confirmDelete && <div className="fixed inset-0 z-[95] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-900">Delete this template?</h2>
        <p className="text-xs text-gray-500 mt-1">{confirmDelete.name} · {confirmDelete.letterTypeLabel} · {confirmDelete.state || "All India"}. Sites using it will fall back to the state/default template.</p>
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold">Cancel</button><button disabled={busy} onClick={() => void remove(confirmDelete)} className="h-9 px-4 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60">Delete</button></div>
      </section>
    </div>}
  </div>;
}
