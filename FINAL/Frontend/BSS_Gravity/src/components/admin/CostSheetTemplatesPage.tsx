"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Eye, FileClock, Loader2, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import EnterpriseDataTable, { type DataColumn } from "@/components/worker/EnterpriseDataTable";
import { INDIA_STATES } from "@/data/indiaStates";

type Designation = { workerCategory:string; subCategory:string; designation:string; inheritsParentRules:boolean };
type MinimumWage = { state:string; zone:string; district:string; scheduledEmployment:string; workerCategory:string; grade:string; basicWage:number; vda:number; minimumMonthlyWage:number; minimumDailyWage:number; notificationNumber:string; effectiveDate:string; effectiveTo:string };
type Statutory = { component:string; rate:number; rateType:string; applicable:boolean; condition:string; mandatory:boolean };
type Custom = { name:string; amount:number; rateType:string; frequency:string; appliesTo:string; editableByOrg:boolean };
type Template = {
  id:number; name:string; code:string; templateType:string; appliesTo:string; industry:string; state:string;
  states:string[]; stateZones:Record<string, string[]>; siteId:number | null; siteName?:string;
  effectiveDate:string; effectiveTo:string; workerCategory:string; grade:string; designation:string; currency:string;
  calculationFrequency:string; status:string; version:number; inheritsParentRules:boolean; notes:string;
  designations:Designation[]; minimumWage:MinimumWage | null; minimumWages:MinimumWage[]; statutory:Statutory[]; custom:Custom[];
};

type CostPreview = {
  basicWage:number; vda:number; minimumWage:number; dailyWage:number;
  statutory:Array<{ component:string; amount:number }>; statutoryTotal:number;
  custom:Array<{ name:string; computed:number }>; customTotal:number;
  employerCost:number; contractorBilling:number | null; ctc:number; currency:string;
};

const DEFAULT_STATUTORY: Statutory[] = [
  { component:"EPF", rate:12, rateType:"PERCENT", applicable:true, condition:"Establishments with 20+ employees", mandatory:true },
  { component:"EPS", rate:8.33, rateType:"PERCENT", applicable:true, condition:"Part of employer EPF contribution", mandatory:true },
  { component:"EDLI", rate:0.5, rateType:"PERCENT", applicable:true, condition:"Employer-only contribution", mandatory:true },
  { component:"ESIC", rate:3.25, rateType:"PERCENT", applicable:true, condition:"Wage ≤ ESIC threshold", mandatory:false },
  { component:"BONUS", rate:8.33, rateType:"PERCENT", applicable:true, condition:"Annual provision", mandatory:true },
  { component:"GRATUITY", rate:4.81, rateType:"PERCENT", applicable:true, condition:"Monthly provision", mandatory:true },
  { component:"LWF", rate:0, rateType:"FIXED", applicable:false, condition:"State-specific", mandatory:false },
  { component:"LEAVE_RESERVE", rate:0, rateType:"PERCENT", applicable:true, condition:"Earned leave provision", mandatory:true },
  { component:"WEEKLY_OFF", rate:0, rateType:"DAYS", applicable:true, condition:"Mandatory paid weekly off", mandatory:true },
  { component:"NATIONAL_HOLIDAYS", rate:0, rateType:"DAYS", applicable:true, condition:"Mandatory paid holidays", mandatory:true },
];
const EMPTY_MW: MinimumWage = { state:"", zone:"", district:"", scheduledEmployment:"", workerCategory:"", grade:"", basicWage:0, vda:0, minimumMonthlyWage:0, minimumDailyWage:0, notificationNumber:"", effectiveDate:"", effectiveTo:"" };

// Minimum-wage grade (matches the Wage Master's grade column). The default
// grade for a worker category mirrors the wage master rows (Unskilled = Grade C,
// Semi-skilled = Grade B, Skilled = Grade A, Highly skilled = Grade A+).
const CATEGORY_DEFAULT_GRADE: Record<string, string> = {
  "Unskilled": "Grade C", "Semi-skilled": "Grade B", "Skilled": "Grade A", "Highly skilled": "Grade A+",
};
const WAGE_GRADES = ["Grade A", "Grade A+", "Grade B", "Grade C"];

// The doc's standard (optional) custom cost heads — one-click to add.
const STANDARD_HEADS: Custom[] = [
  { name:"Uniform", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"PPE / Safety Equipment", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Medical Examination", amount:0, rateType:"FIXED", frequency:"ANNUAL", appliesTo:"both", editableByOrg:true },
  { name:"Insurance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Training", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Food", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Accommodation", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Transport", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Administrative Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Reliever Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Site Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Shift Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Risk Allowance", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true },
  { name:"Profit Margin", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Service Charges", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"Applicable Taxes (GST)", amount:0, rateType:"PERCENT", frequency:"MONTHLY", appliesTo:"contractor", editableByOrg:true },
  { name:"BSS Platform Cost", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:false },
];
const emptyTemplate = (): Template => ({
  id:0, name:"", code:"", templateType:"STATE", appliesTo:"both", industry:"", state:"",
  states:[], stateZones:{}, siteId:null,
  effectiveDate:"", effectiveTo:"", workerCategory:"Unskilled", grade:"Grade C", designation:"", currency:"INR",
  calculationFrequency:"MONTHLY", status:"DRAFT", version:1, inheritsParentRules:true, notes:"",
  designations:[], minimumWage:{ ...EMPTY_MW }, minimumWages:[], statutory:DEFAULT_STATUTORY.map(s => ({ ...s })), custom:[],
});

const INDUSTRY_CODES: Record<string, string> = {
  Construction: "CON", Manufacturing: "MAN", Retail: "RET", Hospitality: "HOS",
  "Facility Management": "FAC", "Logistics & Warehousing": "LOG",
  "IT & Telecom": "IT", Healthcare: "HTH",
};
const CATEGORY_CODES: Record<string, string> = {
  "Unskilled": "US", "Semi-skilled": "SS", "Skilled": "SK", "Highly skilled": "HS",
};

// Auto-generate a code like BSS-CON-SS-MH-1F8A (random suffix per click).
function generateCode(t: { industry: string; workerCategory: string; state: string }): string {
  const industry = (INDUSTRY_CODES[t.industry.trim()] ?? t.industry.trim().slice(0, 3).toUpperCase()) || "GEN";
  const category = (CATEGORY_CODES[t.workerCategory.trim()] ?? t.workerCategory.trim().slice(0, 2).toUpperCase()) || "XX";
  const state = t.state.trim() ? t.state.trim().replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : "AI";
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "0000";
  return `BSS-${industry}-${category}-${state}-${rand}`;
}

const STEP_LABELS = ["Start template", "Configure", "Data sources & review"];
const TEMPLATE_TYPE_OPTIONS = [
  { value: "UNIVERSAL", label: "Universal", hint: "All India, top-level base rules" },
  { value: "STATE", label: "State-specific", hint: "One or more states" },
  { value: "INDUSTRY", label: "Industry-specific", hint: "One industry, any state" },
  { value: "SITE", label: "Site-specific", hint: "A single site" },
];
const input = "mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs";
const label = "text-[11px] font-semibold text-gray-600";

// In-progress template builder draft (survives closing the form / refresh).
const DRAFT_STORAGE_KEY = "bss.costSheetTemplate.inProgress";

export default function CostSheetTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Template | null>(null);
  const [cleanSnapshot, setCleanSnapshot] = useState("");
  const [savedPrompt, setSavedPrompt] = useState<{ draft: Template; step: number; savedAt?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CostPreview | null>(null);
  const [previewWage, setPreviewWage] = useState('');
  const [step, setStep] = useState<number>(1);
  const [sites, setSites] = useState<Array<{ id:number; name:string; code:string; state:string; employer:string }>>([]);
  const [statutoryMaster, setStatutoryMaster] = useState<Statutory[]>(DEFAULT_STATUTORY);
  const [zonesByState, setZonesByState] = useState<Record<string, string[]>>({});

  // Statutory component defaults come from the statutory master (never hardcoded).
  useEffect(() => {
    void fetch("/api/admin/cost-sheets/statutory-master", { cache:"no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { rows?: Array<{ component:string; rate:number; rateType:string; condition:string; mandatory:boolean }> } | null) => {
        if (body?.rows?.length) {
          setStatutoryMaster(body.rows.map(x => ({ component:x.component, rate:x.rate, rateType:x.rateType, applicable:true, condition:x.condition, mandatory:x.mandatory })));
        }
      })
      .catch(() => {});
  }, []);

  // Wage-master zones per state — limits what Step 2 may offer for a state.
  useEffect(() => {
    void fetch("/api/admin/cost-sheets/min-wage-zones", { cache:"no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { zonesByState?: Record<string, string[]> } | null) => {
        if (body?.zonesByState) setZonesByState(body.zonesByState);
      })
      .catch(() => {});
  }, []);

  function makeEmpty(): Template {
    return { ...emptyTemplate(), statutory: statutoryMaster.map(s => ({ ...s })) };
  }

  // Auto-fetch the minimum wage when state + category are set.
  const draftState = draft?.state;
  const draftCategory = draft?.workerCategory;
  const draftGrade = draft?.grade ?? "";
  const draftIndustry = draft?.industry ?? "";
  const [minWageStatus, setMinWageStatus] = useState<'idle'|'fetching'|'ok'|'missing'>('idle');
  const [minWageMessage, setMinWageMessage] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  // Generate a template code guaranteed unique against every code in the system.
  const autoCode = useCallback(async () => {
    if (codeBusy) return;
    setCodeBusy(true);
    try {
      const response = await fetch("/api/admin/cost-sheets/generate-code", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { code?: string };
      if (response.ok && body?.code) { set("code", body.code); return; }
      if (!draft) return;
      const used = new Set(rows.map(r => r.code));
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = generateCode(draft);
        if (!used.has(candidate)) { set("code", candidate); return; }
      }
      set("code", generateCode(draft));
    } finally {
      setCodeBusy(false);
    }
  }, [codeBusy, rows, draft]);
const draftStates = useMemo(() => draft?.states ?? [], [draft?.states]);
  const draftStateZones = useMemo(() => draft?.stateZones ?? {}, [draft?.stateZones]);
useEffect(() => {
    if (!draftState || !draftCategory) return;
    const combos: Array<{ state: string; zone: string }> = [];
    for (const st of (draftStates.length ? draftStates : draftState ? [draftState] : [])) {
      const zones = (draftStateZones[st] ?? []).length ? draftStateZones[st] : (zonesByState[st] ?? []);
      for (const zone of zones) combos.push({ state: st, zone });
    }
    if (!combos.length) return;
    let active = true;
    (async () => {
      setMinWageStatus('fetching'); setMinWageMessage('');
      try {
        const fetched: MinimumWage[] = [];
        for (const combo of combos) {
          const params = new URLSearchParams({ state: combo.state, category: draftCategory, zone: combo.zone });
          if (draftGrade) params.set("grade", draftGrade);
          if (draftIndustry) params.set("industry", draftIndustry);
          const response = await fetch(`/api/admin/cost-sheets/min-wage?${params.toString()}`, { cache:"no-store" });
          const body: { data?: MinimumWage | null; message?: string } | null = response.ok ? await response.json() : null;
          if (!active) return;
          if (body?.data) fetched.push(body.data);
          else setMinWageMessage((prev) => `${prev ? `${prev}\n` : ""}${combo.state} · ${combo.zone}: ${body?.message || "no wage row"}`);
        }
        if (!fetched.length) {
          setMinWageStatus('missing'); setMinWageMessage((m: string) => m || "No minimum wage on record for the selected state/zone/grade/industry combinations.");
        } else {
          setMinWageStatus('ok'); setMinWageMessage('');
          // The template's Effective period follows the first matched wage row —
          // the date is asked once, at the wage master, not here too.
          const first = fetched[0];
          setDraft(d => d ? { ...d, minimumWages: fetched, minimumWage: first,
            effectiveDate: first.effectiveDate || d.effectiveDate,
            effectiveTo: first.effectiveTo || d.effectiveTo } : d);
        }
      } catch {
        if (active) { setMinWageStatus('missing'); setMinWageMessage("Minimum wage could not be fetched."); }
      }
    })();
    return () => { active = false; };
  }, [draftState, draftCategory, draftGrade, draftIndustry, draftStates, draftStateZones, zonesByState]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cost-sheets", { cache:"no-store" });
      const body = await response.json().catch(() => ({})) as { rows?:Template[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? "Cost sheet templates could not be loaded.");
      setRows(body.rows ?? []); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load templates."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch('/api/admin/cost-sheets/sites', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: { rows?: typeof sites } | null) => setSites(j?.rows ?? []))
      .catch(() => {});
  }, []);

  // Live cost preview — re-runs the rule + cost engine on the current draft.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when the editor closes
    if (!draft) { setPreview(null); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/admin/cost-sheets/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, basicWage: previewWage ? Number(previewWage) : undefined, includeContractor: true }),
        signal: controller.signal,
      })
        .then(r => (r.ok ? r.json() : null))
        .then((j: { data?: CostPreview } | null) => setPreview(j?.data ?? null))
        .catch(() => {});
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [draft, previewWage]);

  // Autosave the in-progress draft so closing the form / refreshing never
  // loses work — applies to every step of the builder. A pristine draft (e.g.
  // a fresh "Create new" with no edits) is NOT saved, so it won't later prompt
  // "You have an unsaved template".
  useEffect(() => {
    if (!draft) return;
    if (JSON.stringify(draft) === cleanSnapshot) return;
    const timer = setTimeout(() => {
      try { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, step, savedAt: Date.now() })); } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, step, cleanSnapshot]);

  // Restore a saved in-progress draft on load so the builder reopens where it
  // was left off.
  useEffect(() => {
    const restore = () => {
      try {
        const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { draft?: Template; step?: number };
        if (saved && saved.draft) {
          setDraft(saved.draft);
          setStep(saved.step || 1);
          setCleanSnapshot(JSON.stringify(saved.draft));
          setNotice("Restored your unsaved template draft.");
        }
      } catch {}
    };
    queueMicrotask(restore);
  }, []);

  function readSavedDraft(): { draft: Template; step: number; savedAt?: number } | null {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as { draft?: Template; step?: number; savedAt?: number };
      return saved?.draft ? { draft: saved.draft, step: saved.step || 1, savedAt: saved.savedAt } : null;
    } catch { return null; }
  }
  function clearSavedDraft() {
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
  }

  // Warn on refresh/close while the builder holds unsaved changes. Applies to
  // every step — the browser shows its native "Changes you made may not be
  // saved" prompt when the user reloads, closes the tab or navigates away.
  useEffect(() => {
    if (!draft) return;
    const dirty = JSON.stringify(draft) !== cleanSnapshot;
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      try { window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, step, savedAt: Date.now() })); } catch {}
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft, step, cleanSnapshot]);

  function openDraft(next: Template, startStep = 1) {
    setError(""); setNotice(""); setStep(startStep);
    setDraft(next);
    setCleanSnapshot(JSON.stringify(next));
  }

  // New template: if an unsaved draft exists, show the in-app resume card so
  // the user chooses to continue it or start fresh — no browser alert.
  function startNewTemplate() {
    const saved = readSavedDraft();
    if (!saved) { openDraft(makeEmpty()); return; }
    setSavedPrompt(saved);
  }

  function resumeSavedDraft() {
    if (!savedPrompt) return;
    const saved = savedPrompt;
    setSavedPrompt(null);
    openDraft(saved.draft, saved.step);
  }

  function discardAndCreateNew() {
    clearSavedDraft();
    setSavedPrompt(null);
    openDraft(makeEmpty());
  }

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    try {
      const isEdit = draft.id > 0;
      const response = await fetch(`/api/admin/cost-sheets${isEdit ? `/${draft.id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(draft),
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The template could not be saved.");
      setRows(current => isEdit ? current.map(r => r.id === draft.id ? body.data! : r) : [body.data!, ...current]);
      clearSavedDraft();
      setDraft(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The template could not be saved."); }
    finally { setBusy(false); }
  }

  async function remove(row: Template) {
    if (!window.confirm(`Delete template "${row.name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/cost-sheets/${row.id}`, { method:"DELETE" });
      if (!response.ok) throw new Error("The template could not be deleted.");
      setRows(current => current.filter(r => r.id !== row.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Delete failed."); }
  }

  async function newVersion(row: Template) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/cost-sheets/${row.id}/new-version`, { method:"POST" });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "A new version could not be created.");
      setRows(current => [body.data!, ...current.map(r => r.id === row.id ? { ...r, status:"ARCHIVED" } : r)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Versioning failed."); }
    finally { setBusy(false); }
  }

  const set = <K extends keyof Template>(key: K, value: Template[K]) => setDraft(d => d ? { ...d, [key]: value } : d);

  const missingForSave: string[] = [];
  if (draft) {
    if (!draft.name.trim()) missingForSave.push("Template name");
    if (!draft.industry.trim()) missingForSave.push("Industry");
    if (!draft.workerCategory.trim()) missingForSave.push("Worker category");
    if (!draft.grade.trim()) missingForSave.push("Minimum-wage grade");
    if (!draft.effectiveDate.trim()) missingForSave.push("Effective period (auto — no matching wage row)");
    if (draft.effectiveTo.trim() && draft.effectiveTo < draft.effectiveDate) missingForSave.push("Effective to must be on or after Effective from");
    if (draft.templateType === "STATE" && draft.states.length === 0) missingForSave.push("At least one state");
    if (draft.templateType === "STATE" && draft.states.length > 0 && !draft.states.some(s => (draft.stateZones[s] ?? []).length)) missingForSave.push("At least one zone for a selected state");
  }
  const canSave = missingForSave.length === 0;

  async function transition(row: Template, action: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/cost-sheets/${row.id}/transition`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({})) as { data?:Template; error?:string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "The workflow could not be updated.");
      setRows(current => current.map(r => r.id === row.id ? { ...r, status: body.data!.status } : r));
      setNotice(`Template ${action.replace(/-/g, " ")} — done.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The workflow could not be updated."); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<Template>[] = [
    { id:"name", header:"Template", value:r => r.name, render:r => <div><strong className="text-gray-900">{r.name}</strong><p className="font-mono text-[10px] text-gray-400">{r.code}</p></div> },
    { id:"state", header:"State / Industry", value:r => `${r.state || "All India"} · ${r.industry || "All"}` },
    { id:"category", header:"Category / Grade / Designation", value:r => `${r.workerCategory || "—"} · ${r.grade || "—"} · ${r.designation || "—"}` },
    { id:"type", header:"Type", value:r => r.templateType },
    { id:"freq", header:"Frequency", value:r => r.calculationFrequency },
    { id:"status", header:"Status", value:r => r.status, render:r => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "PUBLISHED" ? "bg-green-50 text-green-700" : r.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-700"}`}>{r.status}</span> },
    { id:"lines", header:"Lines", value:r => r.custom.length + r.statutory.length, render:r => <span className="text-gray-500">{r.statutory.filter(s => s.applicable).length} statutory · {r.custom.length} custom</span> },
    { id:"actions", header:"Actions", filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        {r.status !== "PUBLISHED" ? (
          <button onClick={() => { const base = { ...r, grade: r.grade ?? "", minimumWage: r.minimumWage ?? { ...EMPTY_MW }, minimumWages: r.minimumWages ?? (r.minimumWage ? [r.minimumWage] : []) }; openDraft({ ...base, states: (r.states?.length ? r.states : r.state ? [r.state] : []) }); }} className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"><Pencil size={12}/>Edit</button>
        ) : (
          <button onClick={() => { const base = { ...r, grade: r.grade ?? "", minimumWage: r.minimumWage ?? { ...EMPTY_MW }, minimumWages: r.minimumWages ?? (r.minimumWage ? [r.minimumWage] : []) }; openDraft({ ...base, states: (r.states?.length ? r.states : r.state ? [r.state] : []) }); }} className="text-xs font-semibold text-gray-700 hover:underline inline-flex items-center gap-1"><Eye size={12}/>View</button>
        )}
        {r.status === "DRAFT" && <button disabled={busy} onClick={() => void transition(r, "publish")} className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50">Publish</button>}
        {r.status === "PUBLISHED" && <button disabled={busy} onClick={() => void transition(r, "archive")} className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50">Archive</button>}
        {r.status === "PUBLISHED" && <button disabled={busy} onClick={() => void newVersion(r)} className="text-xs font-semibold text-blue-700 font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"><Copy size={12}/>New version</button>}
        <button onClick={() => void remove(r)} className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"><Trash2 size={12}/>Delete</button>
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p><h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Cost Sheet Templates</h1><p className="text-sm text-gray-500 mt-1">Universal worker cost templates — platform-locked statutory rules + minimum-wage link + org-configurable custom costs. Drives a worker&apos;s wage, employer cost and CTC.</p></div>
      <button onClick={startNewTemplate} className="h-10 px-4 rounded-lg bg-[#0F172A] text-white text-sm font-semibold flex items-center gap-2 hover:bg-black"><Plus size={16}/>New template</button>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading templates…</p>
      : <EnterpriseDataTable title="Cost sheet templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="cost-sheet-templates"/>}

    {savedPrompt && <div className="fixed inset-0 z-[95] bg-black/50 grid place-items-center p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Unsaved template draft" className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <span className="w-9 h-9 grid place-items-center rounded-full bg-amber-50 text-amber-600 shrink-0"><FileClock size={18}/></span>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-950">You have an unsaved template</h2>
            <p className="text-xs text-gray-500 mt-0.5">A draft you were working on is saved in this browser. Continue it, or start a new template instead.</p>
          </div>
          <button onClick={() => setSavedPrompt(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>
        <div className="px-5 py-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-gray-800">{savedPrompt.draft.name?.trim() || "Untitled template"}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {savedPrompt.draft.code ? <span className="font-mono">{savedPrompt.draft.code} · </span> : null}
              Step {savedPrompt.step} of 3
              {savedPrompt.savedAt ? ` · saved ${new Date(savedPrompt.savedAt).toLocaleString('en-IN')}` : ""}
            </p>
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={discardAndCreateNew} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">Create new</button>
          <button onClick={resumeSavedDraft} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold hover:bg-[#062D4F]">Continue with this template</button>
        </footer>
      </section>
    </div>}

    {draft && <div className="fixed inset-0 z-[90] bg-black/50 grid place-items-center p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Cost sheet template builder" className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cost sheet template {step} of {STEP_LABELS.length}</p>
            <h2 className="font-semibold text-gray-950 mt-0.5">{draft.id ? draft.name : "New master template"}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Follows the Universal worker cost template flow — identity → configuration → data sources → review.</p>
          </div>
          <button onClick={() => setDraft(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
        </header>

        {/* Stepper */}
        <div className="px-5 pt-4 pb-2">
          <ol className="flex items-center gap-1.5">
            {STEP_LABELS.map((item, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return <li key={item} className={`flex items-center gap-1.5 ${i < STEP_LABELS.length - 1 ? "flex-1" : ""}`}>
                <span className={`w-6 h-6 grid place-items-center rounded-full text-[10px] font-bold shrink-0 ${done ? "bg-green-600 text-white" : active ? "bg-[#073B67] text-white" : "bg-gray-100 text-gray-400"}`}>{done ? <CheckCircle2 size={13}/> : n}</span>
                <span className={`text-[10px] font-semibold ${active ? "text-[#073B67]" : done ? "text-green-700" : "text-gray-400"}`} title={item}>{item}</span>
                {i < STEP_LABELS.length - 1 && <span className={`h-px flex-1 min-w-3 ${done ? "bg-green-600" : "bg-gray-200"}`}/>}
              </li>;
            })}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Step 1 · Start new master template ─────────────────────────── */}
          {step === 1 && <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">1 · Start new master template</h3>
            <p className="text-[11px] text-gray-400 mb-3">Identity of the universal template. A duplicate check runs against state + industry + category + designation on save; the record is created as a Draft.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={label}>Template name<span className="text-red-600"> *</span><input value={draft.name} onChange={e => set("name", e.target.value)} placeholder='e.g. "Construction semi-skilled worker - Maharashtra"' className={input}/></label>
              <label className={label}>Template code
                <div className="flex gap-2"><input value={draft.code} onChange={e => set("code", e.target.value)} placeholder="BSS-CON-SS-MH-001" className={input}/><button type="button" onClick={autoCode} disabled={codeBusy} className="h-9 px-2.5 rounded-lg border border-gray-200 text-[10px] font-bold inline-flex items-center gap-1 shrink-0 disabled:opacity-50"><Wand2 size={12}/>{codeBusy ? "…" : "Auto"}</button></div>
              </label>
              <label className={label}>Industry / sector<span className="text-red-600"> *</span><select value={draft.industry} onChange={e => set("industry", e.target.value)} className={input}><option value="">Select industry</option><option value="Construction">Construction</option><option value="Manufacturing">Manufacturing</option><option value="Retail">Retail</option><option value="Hospitality">Hospitality</option><option value="Facility Management">Facility Management</option><option value="Logistics & Warehousing">Logistics &amp; Warehousing</option><option value="IT & Telecom">IT &amp; Telecom</option><option value="Healthcare">Healthcare</option></select></label>
              <label className={label}>Worker category<span className="text-red-600"> *</span><select value={draft.workerCategory} onChange={e => set("workerCategory", e.target.value)} className={input}><option value="Unskilled">Unskilled</option><option value="Semi-skilled">Semi-skilled</option><option value="Skilled">Skilled</option><option value="Highly skilled">Highly skilled</option></select></label>
              <label className={label}>Minimum-wage grade<span className="text-red-600"> *</span><select value={draft.grade} onChange={e => set("grade", e.target.value)} className={input}><option value="">Select grade</option>{WAGE_GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select><span className="block text-[10px] text-gray-400 mt-0.5">Matches the Wage Master grade — e.g. {CATEGORY_DEFAULT_GRADE[draft.workerCategory] || "Unskilled"} for {draft.workerCategory || "this category"}. Review the wage master if your grade is not listed.</span></label>
              <label className={label}>Worker designation<input value={draft.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Mason helper, Security guard" className={input}/></label>
              <label className={label}>Effective period<span className="text-red-600"> *</span><input readOnly value={draft.effectiveDate ? `${draft.effectiveDate} → ${draft.effectiveTo || "open"}` : ""} placeholder="Auto-filled from the matched minimum-wage row" className={input + " bg-gray-50"}/><span className="block text-[10px] text-gray-400 mt-0.5">Taken from the Minimum Wage master row matched in Step 3 — no separate date needed.</span></label>
              <label className={label}>Calculation frequency<select value={draft.calculationFrequency} onChange={e => set("calculationFrequency", e.target.value)} className={input}><option value="MONTHLY">Monthly</option><option value="DAILY">Daily</option><option value="PER_SHIFT">Per-shift</option></select></label>
              <label className={label}>Currency<select value={draft.currency} onChange={e => set("currency", e.target.value)} className={input}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="AED">AED (AED)</option></select></label>
            </div>
          </section>}

          {/* ── Step 2 · Configure template ─────────────────────────────────── */}
          {step === 2 && <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">Template type</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {TEMPLATE_TYPE_OPTIONS.map(opt => {
                  const blocked = opt.value !== "STATE";
                  return <label key={opt.value} className={`flex items-start gap-2.5 rounded-xl border p-3 ${blocked ? "opacity-45 cursor-not-allowed bg-gray-50" : "cursor-pointer"} ${!blocked && draft.templateType === opt.value ? "border-[#073B67] bg-[#073B67]/5" : "border-gray-200"}`}>
                    <input type="radio" name="templateType" disabled={blocked} checked={draft.templateType === opt.value} onChange={() => { set("templateType", opt.value); if (opt.value === "UNIVERSAL") setDraft(d => d ? { ...d, states: [], state: "" } : d); }} className="accent-[#073B67] mt-0.5"/>
                    <span><span className="block text-xs font-bold text-gray-800">{opt.label}</span><span className="block text-[10px] text-gray-400 mt-0.5">{opt.hint}</span></span>
                  </label>;
                })}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">Scope</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {draft.templateType === "UNIVERSAL"
                  ? <label className={label}>Geography<input readOnly value="All India — universal template, no state required" className={input + " bg-gray-50"}/></label>
                  : <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-600">Geography</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#073B67] text-white">{draft.states.length} selected</span>
                    </div>
                    <div className="h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                      {INDIA_STATES.map(s => {
                        const checked = draft.states.includes(s);
                        const zones = zonesByState[s] ?? [];
                        return <label key={s} className={`flex items-center gap-2 ${zones.length ? "items-start" : ""} px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50`}>
                          <input type="checkbox" checked={checked} onChange={() => setDraft(d => {
                            if (!d) return d;
                            const states = checked ? d.states.filter(x => x !== s) : [...d.states, s];
                            const stateZones = { ...d.stateZones };
                            if (checked) delete stateZones[s];
                            return { ...d, states, state: states[0] ?? "", stateZones };
                          })} className="accent-[#073B67] mt-0.5"/>
                          <span className="flex-1">
                            <span className="font-semibold text-gray-700">{s}</span>
                            {checked && zones.length > 0 && <span className="flex flex-wrap gap-1.5 mt-1">
                              {zones.map(z => { const on = (draft.stateZones[s] ?? []).includes(z); return <span key={z} onClick={e => e.stopPropagation()} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${on ? "border-[#073B67] bg-[#073B67]/10 text-[#073B67]" : "border-gray-200 text-gray-500"}`}>
                                <input type="checkbox" checked={on} onChange={() => set("stateZones", { ...draft.stateZones, [s]: on ? (draft.stateZones[s] ?? []).filter(x => x !== z) : [...(draft.stateZones[s] ?? []), z] })} className="accent-[#073B67]"/>{z}
                              </span>; })}
                              {(draft.stateZones[s] ?? []).length === 0 && <span className="text-[9px] text-amber-600 font-medium">Pick at least one zone</span>}
                            </span>}
                            {checked && zones.length === 0 && <span className="block text-[9px] text-gray-400 mt-0.5">No wage-master zones on record</span>}
                          </span>
                        </label>;
                      })}
                    </div>
                    {draft.states.length === 0 ? <span className="mt-1 block text-[10px] font-semibold text-red-600">Tick at least one state — required to save</span> : <span className="mt-1 block text-[10px] font-normal text-gray-400">The first ticked one drives the minimum-wage lookup. Zones come from the Wage Master — multiple allowed per state.</span>}
                  </div>}
                  {draft.templateType === "SITE" && <label className={label}>Site (required for site-specific)<select value={draft.siteId ?? ""} onChange={e => set("siteId", e.target.value ? Number(e.target.value) : null)} className={input}><option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name} — {s.employer}</option>)}</select></label>}
              </div>
            </section>
          </div>}

          {/* ── Step 3 · Map data sources ───────────────────────────────────── */}
          {step === 3 && <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3A · Minimum wage (statutory)</h3>
              <p className="text-[11px] text-gray-400 mb-3">Auto-fetched from the Wage Master by state + zone (Step 2) + worker category + effective date. Values are locked for employers.</p>
              {draft.minimumWages.length ? <div className="space-y-4">
                {(draft.minimumWages.length ? draft.minimumWages : draft.minimumWage ? [draft.minimumWage] : []).map((mw, mi) => <div key={`${mw.state}-${mw.zone}-${mi}`} className="rounded-xl border border-gray-100">
                  <div className="px-3 py-1.5 bg-[#073B67]/5 border-b border-gray-100 text-[11px] font-bold text-[#073B67]">{mw.state} · {mw.zone}</div>
                  <div className="grid sm:grid-cols-3 gap-3 p-3">
                    <label className={label}>State<input readOnly value={mw.state || ""} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Zone (matched)<input readOnly value={mw.zone || ""} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Grade (matched)<input readOnly value={mw.grade || ""} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Scheduled employment<input readOnly value={mw.scheduledEmployment || ""} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Basic wage (₹)<input readOnly value={mw.basicWage ?? 0} className={input + " bg-gray-50"}/></label>
                    <label className={label}>VDA (₹)<input readOnly value={mw.vda ?? 0} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Min monthly wage (₹)<input readOnly value={mw.minimumMonthlyWage ?? 0} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Min daily wage (₹)<input readOnly value={mw.minimumDailyWage ?? 0} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Notification no.<input readOnly value={mw.notificationNumber || ""} className={input + " bg-gray-50"}/></label>
                    <label className={label}>Effective period<input readOnly value={mw.effectiveDate ? `${mw.effectiveDate} → ${mw.effectiveTo || "open"}` : ""} className={input + " bg-gray-50"}/></label>
                  </div>
                </div>)}
                {minWageMessage && minWageStatus !== "fetching" ? <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{minWageMessage}</div> : null}
              </div>
                : minWageStatus === "fetching"
                  ? <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-500">Fetching minimum wage…</div>
                  : minWageStatus === "missing"
                    ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center text-xs text-amber-800">
                        <span className="font-bold">No minimum wage found.</span><br/>
                        {minWageMessage.split("\n").map(line => <div key={line} className="mt-0.5 whitespace-pre-line">{line}</div>)}
                      </div>
                    : <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
                        Minimum wage auto-links once you pick a State + at least one of its Zone(s) (Step 2 · Geography), and set Worker category + Grade (Step 1). The template Effective period follows the matched wage row period.
                        {!draftState ? <div className="mt-1 text-[11px] font-semibold text-amber-600">Missing: no State selected.</div> : null}
                        {(!draft.states.some(s => (draft.stateZones[s] ?? []).length)) ? <div className="mt-1 text-[11px] font-semibold text-amber-600">Missing: at least one Zone per selected state.</div> : null}
                        {!draftCategory ? <div className="mt-1 text-[11px] font-semibold text-amber-600">Missing: Worker category not set.</div> : null}
                      </div>}
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3B · Statutory components</h3>
              <p className="text-[11px] text-gray-400 mb-3">Rates come from the statutory master and stay locked for employers/contractors. The admin only marks which components apply.</p>
              <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                {draft.statutory.map((s, i) => <div key={s.component} className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
                  <label className="flex items-center gap-2 w-56"><input type="checkbox" checked={s.applicable} onChange={e => set("statutory", draft.statutory.map((x, j) => j === i ? { ...x, applicable:e.target.checked } : x))} className="accent-[#073B67]"/><span className="font-semibold text-gray-800">{s.component.replace(/_/g, " ")}</span></label>
                  <input readOnly value={s.rate} className="h-8 w-24 border border-gray-200 rounded-lg px-2 text-xs bg-gray-50"/>
                  <span className="text-gray-400">{s.rateType === "PERCENT" ? "% of wages" : s.rateType === "DAYS" ? "days" : "fixed"}</span>
                  <span className="text-gray-400 flex-1 truncate">{s.condition}</span>
                  {s.mandatory && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Mandatory</span>}
                </div>)}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">3C · Custom cost components</h3>
              <p className="text-[11px] text-gray-400 mb-3">Optional non-statutory cost heads. &ldquo;Editable by org&rdquo; controls whether employers/contractors may change the amount later.</p>
              <div className="space-y-2">
                {draft.custom.map((c, i) => <div key={i} className="grid grid-cols-[1.4fr_90px_110px_auto_auto] gap-2 items-center">
                  <input value={c.name} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, name:e.target.value } : x))} placeholder="Cost head" className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  <input type="number" value={c.amount} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, amount:Number(e.target.value) } : x))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs"/>
                  <select value={c.frequency} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, frequency:e.target.value } : x))} className="h-9 border border-gray-200 rounded-lg px-2 text-xs bg-white"><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select>
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 whitespace-nowrap"><input type="checkbox" checked={c.editableByOrg} onChange={e => set("custom", draft.custom.map((x, j) => j === i ? { ...x, editableByOrg:e.target.checked } : x))} className="accent-[#073B67]"/>Editable by org</label>
                  <button type="button" onClick={() => set("custom", draft.custom.filter((_, j) => j !== i))} className="w-8 h-9 grid place-items-center text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                </div>)}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => set("custom", [...draft.custom, { name:"", amount:0, rateType:"FIXED", frequency:"MONTHLY", appliesTo:"both", editableByOrg:true }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add cost head</button>
                  <button type="button" onClick={() => { const names = new Set(draft.custom.map(c => c.name)); set("custom", [...draft.custom, ...STANDARD_HEADS.filter(h => !names.has(h.name)).map(h => ({ ...h }))]); }} className="h-8 px-3 rounded-lg border border-[#073B67]/30 bg-[#073B67]/5 text-[#073B67] text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add standard heads</button>
                </div>
              </div>
            </section>
          </div>}

          {/* ── Step 3 · Data sources + review ─────────────────────────────── */}
          {step === 3 && <div className="space-y-5">
            <section className="rounded-xl border border-gray-100 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-3">Review</h3>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[["Name", draft.name || "—"], ["Code", draft.code || "—"], ["Type", draft.templateType], ["Industry", draft.industry || "All"], ["State(s)", draft.states.length ? draft.states.join(", ") : "All India"], ["Worker category", draft.workerCategory || "—"], ["Wage grade", draft.grade || "—"], ["Designation", draft.designation || "—"], ["Effective", `${draft.effectiveDate || "—"} → ${draft.effectiveTo || "open"}`], ["Frequency", draft.calculationFrequency]].map(([k, v]) => <div key={k}><dt className="text-gray-400">{k}</dt><dd className="font-semibold text-gray-800">{v}</dd></div>)}
                <div><dt className="text-gray-400">States & zones</dt><dd className="font-semibold text-gray-800">{draft.states.length ? draft.states.map(s => `${s} (${(draft.stateZones[s] ?? []).join(", ") || "—"})`).join(", ") : draft.stateZones && Object.keys(draft.stateZones).length ? Object.entries(draft.stateZones).map(([s, z]) => `${s} (${z.join(", ")})`).join(", ") : "All India"}</dd></div>
                <div><dt className="text-gray-400">Designations</dt><dd className="font-semibold text-gray-800">{draft.designations.filter(d => d.designation).length}</dd></div>
                <div><dt className="text-gray-400">Statutory applicable</dt><dd className="font-semibold text-gray-800">{draft.statutory.filter(s => s.applicable).length} of {draft.statutory.length}</dd></div>
                <div><dt className="text-gray-400">Custom cost heads</dt><dd className="font-semibold text-gray-800">{draft.custom.length}</dd></div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#073B67] mb-1">Live cost preview (rule + cost engine)</h3>
              <p className="text-[11px] text-gray-400 mb-3">3-layer breakdown for one worker. Leave blank to use the minimum wage, or enter a wage to override.</p>
              <label className={label}>Basic wage (optional override)
                <input type="number" value={previewWage} onChange={e => setPreviewWage(e.target.value)} placeholder="e.g. 18000" className={input}/>
              </label>
              {preview ? <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden text-xs">
                <div className="grid grid-cols-3 gap-px bg-gray-100">
                  <div className="bg-white p-3"><p className="text-[10px] uppercase text-gray-400">Minimum wage</p><p className="font-bold text-gray-900 mt-0.5">{preview.currency} {preview.minimumWage.toLocaleString('en-IN')}</p></div>
                  <div className="bg-white p-3"><p className="text-[10px] uppercase text-gray-400">Statutory</p><p className="font-bold text-gray-900 mt-0.5">{preview.currency} {preview.statutoryTotal.toLocaleString('en-IN')}</p></div>
                  <div className="bg-white p-3"><p className="text-[10px] uppercase text-gray-400">Custom</p><p className="font-bold text-gray-900 mt-0.5">{preview.currency} {preview.customTotal.toLocaleString('en-IN')}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  <div className="bg-[#F0F4FA] p-3"><p className="text-[10px] uppercase text-[#073B67]">Employer cost</p><p className="font-bold text-[#073B67] mt-0.5">{preview.currency} {preview.employerCost.toLocaleString('en-IN')}</p></div>
                  <div className="bg-[#073B67] p-3 text-white"><p className="text-[10px] uppercase opacity-70">Contractor billing / CTC</p><p className="font-bold mt-0.5">{preview.currency} {(preview.contractorBilling ?? preview.ctc).toLocaleString('en-IN')}</p></div>
                </div>
              </div> : <p className="text-[11px] text-gray-400 mt-3">Preview updates as you edit…</p>}
            </section>
          </div>}
        </div>

        <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button type="button" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-40 inline-flex items-center gap-1"><ChevronLeft size={14}/>Back</button>
            <button onClick={() => { clearSavedDraft(); setDraft(null); setNotice(""); }} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Discard draft</button>
          </div>
          {step < 3
            ? <button type="button" onClick={() => setStep(s => Math.min(3, s + 1))} className="h-10 px-5 rounded-lg bg-[#073B67] text-white text-xs font-bold inline-flex items-center gap-1">{STEP_LABELS[step]} — Next<ChevronRight size={14}/></button>
            : <div className="flex items-center gap-3">
              {!canSave && missingForSave.length > 0 && <span className="text-[10px] font-medium text-red-600 max-w-[240px] text-right leading-snug">To save, fill: {missingForSave.join(", ")}</span>}
              <button disabled={busy || !canSave} onClick={() => void save()} className="h-10 px-5 rounded-lg bg-[#0F172A] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><Save size={14}/>{busy ? "Saving…" : draft.id ? "Save changes" : "Save template (Draft)"}</button>
            </div>}
        </footer>
      </section>
    </div>}
  </div>;
}
