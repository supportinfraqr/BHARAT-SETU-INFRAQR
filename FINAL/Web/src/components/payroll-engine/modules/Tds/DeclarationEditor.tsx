"use client";

/**
 * HR edit of an employee's investment declaration (PUT tds/declaration/:employeeId)
 * and per-line proof review (proofItems on the same endpoint), plus the overall
 * proof verdict (PUT tds/proof-status/:employeeId).
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Badge, Btn, DataTable, Field, fmtDateTime, FormGrid, inputClass, money, NumberInput, Section, Select, TextInput, Toggle, useAction, type Notify } from '../../ui';
import {
  CHAPTER_VIA_FIELDS, SALARY_EXEMPTION_FIELDS,
  type EmployeeTdsRecord, type HomeLoan, type InvestmentLine, type ItDeclaration, type OtherIncomeBreakdown, type ProofItem, type RentEntry, type SalaryExemptions,
} from './types';

const OPTIONS_80C = ['PPF', 'ELSS', 'Life insurance premium', 'EPF / VPF', 'NSC', 'Tax-saving FD (5 yr)', 'Sukanya Samriddhi', 'Tuition fees', 'Home loan principal', 'ULIP', 'SCSS', 'Stamp duty & registration'];
const OPTIONS_80D = ['Health insurance — self/family', 'Health insurance — parents', 'Health insurance — senior citizen parents', 'Preventive health check-up — self', 'Preventive health check-up — parents', 'Medical expenditure — senior citizen self', 'Medical expenditure — senior citizen parents'];

function blankDeclaration(): ItDeclaration {
  return {
    stayingInRentedHouse: false, rentEntries: [],
    homeLoanSelfOccupied: { enabled: false, principalPaid: 0, interestPaid: 0, lenderName: '', lenderPAN: '', attachment: '' },
    letOutPropertyEnabled: false, letOutPropertyAttachment: '', investmentsOther: [],
    otherIncomeBreakdown: { incomeFromOtherSources: 0, interestSavings: 0, interestFD: 0, interestNSC: 0, attachment: '' },
    toggles: { section80C: true, section80D: true, otherInvestments: false },
    salaryExemptions: { childrenCount: 0, childrenEducationReceived: 0, hostelAllowanceReceived: 0, ltaEligibleTravel: 0, disabledTransportReceived: 0, gratuityReceived: 0, leaveEncashmentReceived: 0, retrenchmentReceived: 0, vrsReceived: 0, officialDutySpent: 0, lifeInsuranceExempt: 0 },
    chapterVIA: Object.fromEntries(CHAPTER_VIA_FIELDS.map(f => [f.key, f.bool ? false : 0])),
  };
}

function toDraft(record: EmployeeTdsRecord) {
  const base = blankDeclaration();
  const it = record.itDeclaration ?? {};
  const decl: ItDeclaration = {
    ...base, ...it,
    rentEntries: (it.rentEntries ?? []).map(r => ({ ...r })),
    homeLoanSelfOccupied: { ...base.homeLoanSelfOccupied, ...(it.homeLoanSelfOccupied ?? {}) },
    investmentsOther: (it.investmentsOther ?? []).map(l => ({ investmentType: l.investmentType, amount: l.amount, attachment: l.attachment })),
    otherIncomeBreakdown: { ...base.otherIncomeBreakdown, ...(it.otherIncomeBreakdown ?? {}) },
    toggles: { ...base.toggles, ...(it.toggles ?? {}) },
    salaryExemptions: { ...base.salaryExemptions, ...(it.salaryExemptions ?? {}) },
    chapterVIA: { ...base.chapterVIA, ...(it.chapterVIA ?? {}) },
  };
  const d = record.declaredDeductions ?? {};
  return {
    lines80C: (record.investments80C ?? []).map(l => ({ investmentType: l.investmentType, amount: l.amount, attachment: l.attachment })),
    lines80D: (record.investments80D ?? []).map(l => ({ investmentType: l.investmentType, amount: l.amount, attachment: l.attachment })),
    decl,
    overrides: { section80E: Number(d.section80E) || 0, section80G: Number(d.section80G) || 0, professionalTax: Number(d.professionalTax) || 0, section24: Number(d.section24) || 0, otherDeductions: Number(d.otherDeductions) || 0 },
  };
}
type Draft = ReturnType<typeof toDraft>;

/** One reviewable line per declared item. `lineKey` identifies it across saves. */
function buildProofLines(draft: Draft, existing: ProofItem[]): ProofItem[] {
  const prev = new Map(existing.map(p => [p.lineKey, p]));
  const out: ProofItem[] = [];
  const push = (lineKey: string, sectionName: string, deductionHead: string, amount: number) => {
    if (!(amount > 0) && !prev.has(lineKey)) return;
    const p = prev.get(lineKey);
    // Pending lines follow the current declared amount; reviewed lines keep the employee's original request.
    out.push(p ? (p.status === 'pending' && p.requestedAmount !== amount && amount > 0 ? { ...p, sectionName, deductionHead, requestedAmount: amount, acceptedAmount: amount } : { ...p, sectionName, deductionHead }) : { lineKey, sectionName, deductionHead, requestedAmount: amount, acceptedAmount: amount, status: 'pending', remark: '' });
  };
  draft.lines80C.forEach((l, i) => push(`80C-${i}`, 'Section 80C', l.investmentType || `80C line ${i + 1}`, l.amount));
  draft.lines80D.forEach((l, i) => push(`80D-${i}`, 'Section 80D', l.investmentType || `80D line ${i + 1}`, l.amount));
  if (draft.decl.stayingInRentedHouse) draft.decl.rentEntries.forEach((r, i) => push(`RENT-${i}`, 'HRA — Rent', `${r.landlordName || 'Rent'} (${r.fromDate || '?'} – ${r.toDate || '?'})`, r.rentAnnual || r.rentMonthly * 12));
  if (draft.decl.homeLoanSelfOccupied.enabled) {
    push('HL-PRINCIPAL', 'Section 80C', 'Home loan principal', draft.decl.homeLoanSelfOccupied.principalPaid);
    push('HL-INTEREST', 'Section 24(b)', 'Home loan interest', draft.decl.homeLoanSelfOccupied.interestPaid);
  }
  draft.decl.investmentsOther.forEach((l, i) => push(`OTHER-${i}`, 'Other investments', l.investmentType || `Other line ${i + 1}`, l.amount));
  CHAPTER_VIA_FIELDS.filter(f => !f.bool).forEach(f => push(`VIA-${f.key}`, 'Chapter VI-A', f.label, Number(draft.decl.chapterVIA[f.key]) || 0));
  return out;
}

/** Accepted amounts are written back onto the declaration (what TDS uses). */
function applyAccepted(draft: Draft, items: ProofItem[]): Draft {
  const acc = new Map(items.filter(i => i.status !== 'pending').map(i => [i.lineKey, i.status === 'rejected' ? 0 : i.acceptedAmount]));
  const pick = (key: string, v: number) => acc.has(key) ? acc.get(key)! : v;
  const decl = { ...draft.decl, chapterVIA: { ...draft.decl.chapterVIA }, homeLoanSelfOccupied: { ...draft.decl.homeLoanSelfOccupied } };
  decl.rentEntries = draft.decl.rentEntries.map((r, i) => {
    if (!acc.has(`RENT-${i}`)) return r;
    const annual = acc.get(`RENT-${i}`)!;
    return { ...r, rentAnnual: annual, rentMonthly: Math.round(annual / 12) };
  });
  decl.homeLoanSelfOccupied.principalPaid = pick('HL-PRINCIPAL', decl.homeLoanSelfOccupied.principalPaid);
  decl.homeLoanSelfOccupied.interestPaid = pick('HL-INTEREST', decl.homeLoanSelfOccupied.interestPaid);
  decl.investmentsOther = draft.decl.investmentsOther.map((l, i) => ({ ...l, amount: pick(`OTHER-${i}`, l.amount) }));
  CHAPTER_VIA_FIELDS.filter(f => !f.bool).forEach(f => { decl.chapterVIA[f.key] = pick(`VIA-${f.key}`, Number(decl.chapterVIA[f.key]) || 0); });
  return {
    ...draft, decl,
    lines80C: draft.lines80C.map((l, i) => ({ ...l, amount: pick(`80C-${i}`, l.amount) })),
    lines80D: draft.lines80D.map((l, i) => ({ ...l, amount: pick(`80D-${i}`, l.amount) })),
  };
}

function Attachment({ url }: { url: string }) {
  return url ? <a href={pe.fileUrl(url)} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-bss-interactive-blue)] underline whitespace-nowrap">View proof</a> : <span className="text-xs text-gray-400">No proof</span>;
}

function LineEditor({ title, lines, options, onChange, disabled, listId }: { title: string; lines: InvestmentLine[]; options: string[]; onChange: (lines: InvestmentLine[]) => void; disabled: boolean; listId: string }) {
  const set = (i: number, patch: Partial<InvestmentLine>) => onChange(lines.map((l, j) => j === i ? { ...l, ...patch } : l));
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><h4 className="text-xs font-semibold text-gray-700">{title} <span className="text-gray-400 font-normal">· total {money(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</span></h4>
      <Btn variant="ghost" disabled={disabled} onClick={() => onChange([...lines, { investmentType: '', amount: 0, attachment: '' }])}><Plus size={14} />Add line</Btn></div>
    <datalist id={listId}>{options.map(o => <option key={o} value={o} />)}</datalist>
    {lines.length === 0 && <p className="text-xs text-gray-400">No lines declared.</p>}
    {lines.map((l, i) => <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto_auto] gap-2 items-center">
      <input className={inputClass} list={listId} aria-label={`${title} type ${i + 1}`} value={l.investmentType} disabled={disabled} onChange={e => set(i, { investmentType: e.target.value })} placeholder="Investment type" />
      <NumberInput aria-label={`${title} amount ${i + 1}`} value={l.amount} disabled={disabled} min={0} onChange={v => set(i, { amount: v })} />
      <Attachment url={l.attachment} />
      <button type="button" aria-label="Remove line" disabled={disabled} onClick={() => onChange(lines.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button>
    </div>)}
  </div>;
}

function RentEditor({ entries, onChange, disabled }: { entries: RentEntry[]; onChange: (v: RentEntry[]) => void; disabled: boolean }) {
  const set = (i: number, patch: Partial<RentEntry>) => onChange(entries.map((r, j) => j === i ? { ...r, ...patch } : r));
  const blank: RentEntry = { fromDate: '', toDate: '', rentMonthly: 0, rentAnnual: 0, address: '', landlordName: '', urbanizationType: '', urbanizationType2: '', isMetroCity: false, attachment: '' };
  return <div className="space-y-3">
    {entries.map((r, i) => <div key={i} className="rounded-xl border border-gray-100 p-3 space-y-2">
      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-700">Rent period {i + 1}</span>
        <div className="flex items-center gap-3"><Attachment url={r.attachment} /><button type="button" aria-label="Remove rent period" disabled={disabled} onClick={() => onChange(entries.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button></div></div>
      <FormGrid cols={4}>
        <Field label="From"><TextInput type="date" value={r.fromDate?.slice(0, 10)} disabled={disabled} onChange={v => set(i, { fromDate: v })} /></Field>
        <Field label="To"><TextInput type="date" value={r.toDate?.slice(0, 10)} disabled={disabled} onChange={v => set(i, { toDate: v })} /></Field>
        <Field label="Monthly rent"><NumberInput value={r.rentMonthly} min={0} disabled={disabled} onChange={v => set(i, { rentMonthly: v })} /></Field>
        <Field label="Annual rent" hint="Optional override"><NumberInput value={r.rentAnnual} min={0} disabled={disabled} onChange={v => set(i, { rentAnnual: v })} /></Field>
        <Field label="Landlord name"><TextInput value={r.landlordName} disabled={disabled} onChange={v => set(i, { landlordName: v })} /></Field>
        <Field label="Address" className="md:col-span-2"><TextInput value={r.address} disabled={disabled} onChange={v => set(i, { address: v })} /></Field>
        <Field label="Urbanization type"><Select value={r.urbanizationType} disabled={disabled} placeholder="—" options={['Metro', 'Non-metro', 'Urban', 'Rural']} onChange={v => set(i, { urbanizationType: v })} /></Field>
        <Field label="Urbanization type 2"><TextInput value={r.urbanizationType2} disabled={disabled} onChange={v => set(i, { urbanizationType2: v })} /></Field>
        <div className="flex items-end pb-2"><Toggle label="Metro city (50% of basic)" checked={r.isMetroCity} disabled={disabled} onChange={v => set(i, { isMetroCity: v })} /></div>
      </FormGrid>
    </div>)}
    <Btn variant="ghost" disabled={disabled} onClick={() => onChange([...entries, blank])}><Plus size={14} />Add rent period</Btn>
  </div>;
}

export function DeclarationEditor({ record, employeeId, financialYear, notify, onSaved }: { record: EmployeeTdsRecord; employeeId: string; financialYear: string; notify: Notify; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(record));
  const [proofs, setProofs] = useState<ProofItem[]>(() => record.proofItems ?? []);
  const [verdict, setVerdict] = useState<{ status: string; remarks: string }>({ status: 'approved', remarks: record.proofRemarks ?? '' });
  const { busy, run } = useAction(notify);
  const locked = !!record.isLocked;
  const noRecord = !!record.isNew;
  const decl = draft.decl;
  const setDecl = (patch: Partial<ItDeclaration>) => setDraft(d => ({ ...d, decl: { ...d.decl, ...patch } }));
  const setHl = (patch: Partial<HomeLoan>) => setDecl({ homeLoanSelfOccupied: { ...decl.homeLoanSelfOccupied, ...patch } });
  const setOther = (patch: Partial<OtherIncomeBreakdown>) => setDecl({ otherIncomeBreakdown: { ...decl.otherIncomeBreakdown, ...patch } });
  const setExempt = (patch: Partial<SalaryExemptions>) => setDecl({ salaryExemptions: { ...decl.salaryExemptions, ...patch } });

  const reviewLines = buildProofLines(draft, proofs);
  const setProof = (lineKey: string, patch: Partial<ProofItem>) => {
    const next = reviewLines.map(p => p.lineKey === lineKey ? { ...p, ...patch } : p);
    setProofs(next);
  };

  async function save(withProofs: boolean) {
    const src = withProofs ? applyAccepted(draft, reviewLines) : draft;
    const body: Record<string, unknown> = {
      financialYear,
      investments80C: src.lines80C,
      investments80D: src.lines80D,
      itDeclaration: src.decl,
      declaredDeductions: src.overrides,
    };
    if (withProofs) body.proofItems = reviewLines;
    const out = await run(() => pe.put<EmployeeTdsRecord>(`tds/declaration/${employeeId}`, body), withProofs ? 'Proof review saved' : 'Declaration updated');
    if (out) { setDraft(toDraft(out)); setProofs(out.proofItems ?? []); onSaved(); }
  }

  async function submitVerdict() {
    const out = await run(() => pe.put(`tds/proof-status/${employeeId}`, { financialYear, status: verdict.status, remarks: verdict.remarks }), `Proofs ${verdict.status}`);
    if (out) onSaved();
  }

  if (noRecord) return <Section title="Investment declaration"><p className="px-5 py-6 text-sm text-gray-500">No TDS record exists for this employee in FY {financialYear}. Ask the employee to save a declaration from My Payroll, or run <b>Calculate TDS</b> first — HR edits apply to an existing record.</p></Section>;

  return <div className="space-y-4">
    {locked && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">This declaration is locked. Unlock it from the header to edit.</div>}

    <Section title="80C / 80D investments" subtitle="Line-wise declarations (aggregates sync into declared deductions, capped by FY limits)">
      <div className="p-5 space-y-5">
        <div className="flex flex-wrap gap-4">
          <Toggle label="80C enabled" checked={decl.toggles.section80C} disabled={locked} onChange={v => setDecl({ toggles: { ...decl.toggles, section80C: v } })} />
          <Toggle label="80D enabled" checked={decl.toggles.section80D} disabled={locked} onChange={v => setDecl({ toggles: { ...decl.toggles, section80D: v } })} />
          <Toggle label="Other investments enabled" checked={decl.toggles.otherInvestments} disabled={locked} onChange={v => setDecl({ toggles: { ...decl.toggles, otherInvestments: v } })} />
        </div>
        <LineEditor title="Section 80C" listId="tds-80c" options={OPTIONS_80C} lines={draft.lines80C} disabled={locked} onChange={v => setDraft(d => ({ ...d, lines80C: v }))} />
        <LineEditor title="Section 80D" listId="tds-80d" options={OPTIONS_80D} lines={draft.lines80D} disabled={locked} onChange={v => setDraft(d => ({ ...d, lines80D: v }))} />
        <LineEditor title="Other investments" listId="tds-other" options={[]} lines={decl.investmentsOther} disabled={locked} onChange={v => setDecl({ investmentsOther: v })} />
      </div>
    </Section>

    <Section title="House rent (HRA)" right={<Toggle label="Staying in rented house" checked={decl.stayingInRentedHouse} disabled={locked} onChange={v => setDecl({ stayingInRentedHouse: v })} />}>
      <div className="p-5">{decl.stayingInRentedHouse ? <RentEditor entries={decl.rentEntries} disabled={locked} onChange={v => setDecl({ rentEntries: v })} /> : <p className="text-xs text-gray-400">Not staying in a rented house — no HRA exemption.</p>}</div>
    </Section>

    <Section title="Home loan & property" right={<Attachment url={decl.homeLoanSelfOccupied.attachment} />}>
      <div className="p-5 space-y-3">
        <Toggle label="Self-occupied home loan" checked={decl.homeLoanSelfOccupied.enabled} disabled={locked} onChange={v => setHl({ enabled: v })} />
        {decl.homeLoanSelfOccupied.enabled && <FormGrid cols={4}>
          <Field label="Principal repaid (80C)"><NumberInput value={decl.homeLoanSelfOccupied.principalPaid} min={0} disabled={locked} onChange={v => setHl({ principalPaid: v })} /></Field>
          <Field label="Interest paid (24b)"><NumberInput value={decl.homeLoanSelfOccupied.interestPaid} min={0} disabled={locked} onChange={v => setHl({ interestPaid: v })} /></Field>
          <Field label="Lender name"><TextInput value={decl.homeLoanSelfOccupied.lenderName} disabled={locked} onChange={v => setHl({ lenderName: v })} /></Field>
          <Field label="Lender PAN"><TextInput value={decl.homeLoanSelfOccupied.lenderPAN} disabled={locked} onChange={v => setHl({ lenderPAN: v.toUpperCase() })} /></Field>
        </FormGrid>}
        <div className="flex flex-wrap items-center gap-3"><Toggle label="Let-out property" checked={decl.letOutPropertyEnabled} disabled={locked} onChange={v => setDecl({ letOutPropertyEnabled: v })} />{decl.letOutPropertyEnabled && <Attachment url={decl.letOutPropertyAttachment} />}</div>
      </div>
    </Section>

    <Section title="Income from other sources" right={<Attachment url={decl.otherIncomeBreakdown.attachment} />}>
      <div className="p-5"><FormGrid cols={4}>
        <Field label="Other sources"><NumberInput value={decl.otherIncomeBreakdown.incomeFromOtherSources} min={0} disabled={locked} onChange={v => setOther({ incomeFromOtherSources: v })} /></Field>
        <Field label="Savings interest"><NumberInput value={decl.otherIncomeBreakdown.interestSavings} min={0} disabled={locked} onChange={v => setOther({ interestSavings: v })} /></Field>
        <Field label="FD interest"><NumberInput value={decl.otherIncomeBreakdown.interestFD} min={0} disabled={locked} onChange={v => setOther({ interestFD: v })} /></Field>
        <Field label="NSC interest"><NumberInput value={decl.otherIncomeBreakdown.interestNSC} min={0} disabled={locked} onChange={v => setOther({ interestNSC: v })} /></Field>
      </FormGrid></div>
    </Section>

    <Section title="Chapter VI-A (other sections)">
      <div className="p-5"><FormGrid cols={4}>
        {CHAPTER_VIA_FIELDS.map(f => f.bool
          ? <div key={f.key} className="flex items-end pb-2"><Toggle label={f.label} checked={!!decl.chapterVIA[f.key]} disabled={locked} onChange={v => setDecl({ chapterVIA: { ...decl.chapterVIA, [f.key]: v } })} /></div>
          : <Field key={f.key} label={f.label}><NumberInput value={Number(decl.chapterVIA[f.key]) || 0} min={0} disabled={locked} onChange={v => setDecl({ chapterVIA: { ...decl.chapterVIA, [f.key]: v } })} /></Field>)}
        <Field label="80E — Education loan interest"><NumberInput value={draft.overrides.section80E} min={0} disabled={locked} onChange={v => setDraft(d => ({ ...d, overrides: { ...d.overrides, section80E: v } }))} /></Field>
        <Field label="80G — Donations"><NumberInput value={draft.overrides.section80G} min={0} disabled={locked} onChange={v => setDraft(d => ({ ...d, overrides: { ...d.overrides, section80G: v } }))} /></Field>
        <Field label="Professional tax (annual)"><NumberInput value={draft.overrides.professionalTax} min={0} disabled={locked} onChange={v => setDraft(d => ({ ...d, overrides: { ...d.overrides, professionalTax: v } }))} /></Field>
        <Field label="24(b) interest" hint={decl.homeLoanSelfOccupied.enabled ? 'Taken from home loan above' : undefined}><NumberInput value={draft.overrides.section24} min={0} disabled={locked} onChange={v => setDraft(d => ({ ...d, overrides: { ...d.overrides, section24: v } }))} /></Field>
        <Field label="Other deductions" hint="Used when no other-investment lines"><NumberInput value={draft.overrides.otherDeductions} min={0} disabled={locked} onChange={v => setDraft(d => ({ ...d, overrides: { ...d.overrides, otherDeductions: v } }))} /></Field>
      </FormGrid></div>
    </Section>

    <Section title="Section 10 salary exemptions" subtitle="Applied in the old regime (10(10D) also in new)">
      <div className="p-5"><FormGrid cols={4}>
        {SALARY_EXEMPTION_FIELDS.map(f => <Field key={f.key} label={f.label} hint={f.hint}><NumberInput value={decl.salaryExemptions[f.key]} min={0} disabled={locked} onChange={v => setExempt({ [f.key]: v } as Partial<SalaryExemptions>)} /></Field>)}
      </FormGrid></div>
    </Section>

    <div className="flex justify-end"><Btn busy={busy} disabled={locked} onClick={() => save(false)}>Save declaration</Btn></div>

    <Section title="Proof verification" subtitle={`Overall status: ${record.proofStatus ?? 'pending'}${record.proofReviewedAt ? ` · reviewed ${fmtDateTime(record.proofReviewedAt)}` : ''}`}
      right={<Badge status={record.proofStatus}>{record.proofStatus ?? 'pending'}</Badge>}>
      <DataTable rows={reviewLines} rowKey={r => r.lineKey} empty="Nothing declared to verify" columns={[
        { key: 'sectionName', label: 'Section' },
        { key: 'deductionHead', label: 'Item' },
        { key: 'requestedAmount', label: 'Requested', align: 'right', render: r => money(r.requestedAmount) },
        { key: 'acceptedAmount', label: 'Accepted', render: r => <NumberInput className="w-32" aria-label={`Accepted amount for ${r.deductionHead}`} value={r.acceptedAmount} min={0} disabled={locked || r.status === 'rejected'} onChange={v => setProof(r.lineKey, { acceptedAmount: v })} /> },
        { key: 'status', label: 'Status', render: r => <Select className="w-32" aria-label={`Status for ${r.deductionHead}`} value={r.status} disabled={locked} options={['pending', 'approved', 'rejected']} onChange={v => setProof(r.lineKey, { status: v as ProofItem['status'], acceptedAmount: v === 'rejected' ? 0 : (r.acceptedAmount || r.requestedAmount) })} /> },
        { key: 'remark', label: 'Remark', render: r => <TextInput className="min-w-40" aria-label={`Remark for ${r.deductionHead}`} value={r.remark} disabled={locked} onChange={v => setProof(r.lineKey, { remark: v })} /> },
      ]} />
      <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">Saving writes accepted amounts back onto the declaration (rejected = 0). Recalculate TDS afterwards.</p>
        <div className="flex gap-2">
          <Btn variant="secondary" disabled={locked || !reviewLines.length} busy={busy} onClick={() => setProofs(reviewLines.map(p => ({ ...p, status: 'approved', acceptedAmount: p.acceptedAmount || p.requestedAmount })))}>Approve all</Btn>
          <Btn disabled={locked || !reviewLines.length} busy={busy} onClick={() => save(true)}>Save line review</Btn>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 items-end">
        <Field label="Overall verdict"><Select value={verdict.status} options={[{ value: 'approved', label: 'Approve proofs' }, { value: 'rejected', label: 'Reject proofs' }]} onChange={v => setVerdict(s => ({ ...s, status: v }))} /></Field>
        <Field label="Remarks to employee"><TextInput value={verdict.remarks} maxLength={1000} onChange={v => setVerdict(s => ({ ...s, remarks: v }))} /></Field>
        <Btn variant={verdict.status === 'rejected' ? 'danger' : 'primary'} busy={busy} onClick={submitVerdict}>Submit verdict</Btn>
      </div>
    </Section>
  </div>;
}
