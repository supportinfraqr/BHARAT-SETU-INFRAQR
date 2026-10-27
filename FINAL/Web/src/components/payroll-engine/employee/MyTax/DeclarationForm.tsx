"use client";

import { useState } from 'react';
import { Paperclip, Plus, Trash2, X } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Btn, Confirm, Field, NumberInput, Select, TextInput, Toggle, money, useAction, type Notify } from '../../ui';
import {
  CHAPTER_VIA_FIELDS, OPTIONS_80C, OPTIONS_80D, OPTIONS_OTHER, SALARY_EXEMPTION_FIELDS,
  buildPayload, buildProofForm, emptyLine, emptyRent, formFromRecord, sumAmounts,
} from './form';
import type { EmployeeTdsRecord, FormState, InvestmentLine, Keyed, PendingFiles, RentEntry, SaveResult } from './types';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif';

/** Collapsible card used for each declaration section (mobile friendly). */
function Card({ title, subtitle, total, children, defaultOpen = false, right }: { title: string; subtitle?: string; total?: number; children: React.ReactNode; defaultOpen?: boolean; right?: React.ReactNode }) {
  return <details open={defaultOpen} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-950">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {right}
        {total !== undefined && <span className="text-xs font-bold text-gray-900">{money(total)}</span>}
        <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform" aria-hidden>▾</span>
      </div>
    </summary>
    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">{children}</div>
  </details>;
}

/** Existing attachment link + picker for a new file (uploaded on proof submission). */
function Attachment({ url, file, onFile, disabled, label = 'Attach proof' }: { url: string; file?: File; onFile: (f: File | null) => void; disabled?: boolean; label?: string }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    {url && <a href={pe.fileUrl(url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--color-bss-interactive-blue)] underline"><Paperclip size={12} />View proof</a>}
    {file
      ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 max-w-[14rem]"><span className="truncate">{file.name}</span>
        <button type="button" aria-label="Remove selected file" onClick={() => onFile(null)}><X size={12} /></button></span>
      : !disabled && <label className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-dashed border-gray-300 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
        <Paperclip size={12} />{url ? 'Replace' : label}
        <input type="file" className="hidden" accept={ACCEPT} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      </label>}
  </div>;
}

function LineEditor({ lines, onChange, options, files, setFile, disabled, addLabel }: {
  lines: Keyed<InvestmentLine>[]; onChange: (l: Keyed<InvestmentLine>[]) => void; options: string[];
  files: PendingFiles; setFile: (key: string, f: File | null) => void; disabled?: boolean; addLabel: string;
}) {
  const update = (key: string, patch: Partial<InvestmentLine>) => onChange(lines.map(l => (l.key === key ? { ...l, ...patch } : l)));
  return <div className="space-y-2">
    {!lines.length && <p className="text-xs text-gray-400">No lines declared yet.</p>}
    {lines.map((l, i) => {
      const opts = l.investmentType && !options.includes(l.investmentType) ? [l.investmentType, ...options] : options;
      return <div key={l.key} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-2">
          <Field label={`Investment type #${i + 1}`}>
            <Select value={l.investmentType} onChange={v => update(l.key, { investmentType: v })} options={opts} placeholder="Select type" disabled={disabled} />
          </Field>
          <Field label="Amount (₹ / year)">
            <NumberInput min={0} value={l.amount || ''} onChange={v => update(l.key, { amount: Math.max(0, v) })} disabled={disabled} inputMode="decimal" />
          </Field>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Attachment url={l.attachment} file={files[l.key]} onFile={f => setFile(l.key, f)} disabled={disabled} />
          {!disabled && <button type="button" className="text-red-600 p-1" aria-label={`Remove line ${i + 1}`} onClick={() => { setFile(l.key, null); onChange(lines.filter(x => x.key !== l.key)); }}><Trash2 size={14} /></button>}
        </div>
      </div>;
    })}
    {!disabled && <Btn variant="secondary" onClick={() => onChange([...lines, emptyLine()])}><Plus size={14} />{addLabel}</Btn>}
  </div>;
}

function RentEditor({ entries, onChange, files, setFile, disabled }: { entries: Keyed<RentEntry>[]; onChange: (r: Keyed<RentEntry>[]) => void; files: PendingFiles; setFile: (key: string, f: File | null) => void; disabled?: boolean }) {
  const update = (key: string, patch: Partial<RentEntry>) => onChange(entries.map(e => (e.key === key ? { ...e, ...patch } : e)));
  return <div className="space-y-2">
    {!entries.length && <p className="text-xs text-gray-400">Add each rented house / rent period for this financial year.</p>}
    {entries.map((e, i) => <div key={e.key} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">Rent period #{i + 1}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From"><TextInput type="date" value={e.fromDate} onChange={v => update(e.key, { fromDate: v })} disabled={disabled} /></Field>
        <Field label="To"><TextInput type="date" value={e.toDate} onChange={v => update(e.key, { toDate: v })} disabled={disabled} /></Field>
        <Field label="Monthly rent (₹)"><NumberInput min={0} value={e.rentMonthly || ''} onChange={v => update(e.key, { rentMonthly: Math.max(0, v) })} disabled={disabled} inputMode="decimal" /></Field>
        <Field label="Annual rent (₹)" hint="Optional; else monthly × months"><NumberInput min={0} value={e.rentAnnual || ''} onChange={v => update(e.key, { rentAnnual: Math.max(0, v) })} disabled={disabled} inputMode="decimal" /></Field>
      </div>
      <Field label="Landlord name"><TextInput value={e.landlordName} onChange={v => update(e.key, { landlordName: v })} disabled={disabled} maxLength={200} /></Field>
      <Field label="Rented house address"><TextInput value={e.address} onChange={v => update(e.key, { address: v })} disabled={disabled} maxLength={2000} /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Urbanization type"><TextInput value={e.urbanizationType} onChange={v => update(e.key, { urbanizationType: v })} disabled={disabled} maxLength={128} placeholder="e.g. Urban" /></Field>
        <Field label="Urbanization type (secondary)"><TextInput value={e.urbanizationType2} onChange={v => update(e.key, { urbanizationType2: v })} disabled={disabled} maxLength={128} /></Field>
      </div>
      <Toggle checked={e.isMetroCity} onChange={v => update(e.key, { isMetroCity: v })} disabled={disabled} label="Metro city (Delhi, Mumbai, Kolkata, Chennai) — 50% of basic" />
      <div className="flex items-center justify-between gap-2">
        <Attachment url={e.attachment} file={files[e.key]} onFile={f => setFile(e.key, f)} disabled={disabled} label="Attach rent receipt" />
        {!disabled && <button type="button" className="text-red-600 p-1" aria-label={`Remove rent period ${i + 1}`} onClick={() => { setFile(e.key, null); onChange(entries.filter(x => x.key !== e.key)); }}><Trash2 size={14} /></button>}
      </div>
    </div>)}
    {!disabled && <Btn variant="secondary" onClick={() => onChange([...entries, emptyRent()])}><Plus size={14} />Add rent period</Btn>}
  </div>;
}

const Money = ({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: number; onChange: (v: number) => void; disabled?: boolean }) =>
  <Field label={label} hint={hint}><NumberInput min={0} value={value || ''} onChange={v => onChange(Math.max(0, v))} disabled={disabled} inputMode="decimal" /></Field>;

export default function DeclarationForm({ record, financialYear, notify, onSaved, onDeleted }: {
  record: EmployeeTdsRecord; financialYear: string; notify: Notify; onSaved: (r: SaveResult) => void; onDeleted: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFromRecord(record));
  const [files, setFiles] = useState<PendingFiles>({});
  const [confirm, setConfirm] = useState<'delete' | 'proof' | null>(null);
  const { busy, run } = useAction(notify);
  const locked = !!record.isLocked;
  const hasSaved = !record.isNew && record.hasInvestmentDeclaration !== false;
  const pendingCount = Object.keys(files).length;

  const setFile = (key: string, f: File | null) => setFiles(prev => { const next = { ...prev }; if (f) next[key] = f; else delete next[key]; return next; });
  const setIt = <K extends keyof FormState['it']>(key: K, value: FormState['it'][K]) => setForm(f => ({ ...f, it: { ...f.it, [key]: value } }));
  const { it } = form;

  const save = async () => {
    const { body } = buildPayload(form, financialYear);
    const out = await run(() => pe.put<SaveResult>('tds/investment-declaration', body), 'Investment declaration saved');
    if (out) onSaved(out);
  };
  const submitProofs = async () => {
    const out = await run(async () => (await pe.upload<SaveResult>('tds/submitInvestmentproof', buildProofForm(form, financialYear, files), 'PUT')).data, 'Investment proofs submitted for verification');
    setConfirm(null);
    if (out) { setFiles({}); onSaved(out); }
  };
  const remove = async () => {
    const ok = await run(async () => { await pe.del('tds/investment-declaration', { financialYear }); return true; }, 'Investment declaration deleted');
    setConfirm(null);
    if (ok) onDeleted();
  };

  const total80C = sumAmounts(form.investments80C) + (it.homeLoanSelfOccupied.enabled ? it.homeLoanSelfOccupied.principalPaid : 0);
  const total80D = sumAmounts(form.investments80D);
  const rentTotal = it.rentEntries.reduce((a, e) => a + (e.rentAnnual || e.rentMonthly * 12), 0);
  const otherIncomeTotal = it.otherIncomeBreakdown.incomeFromOtherSources + it.otherIncomeBreakdown.interestSavings + it.otherIncomeBreakdown.interestFD + it.otherIncomeBreakdown.interestNSC;

  return <div className="space-y-3">
    {locked && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">Your investment declaration for FY {financialYear} is frozen by HR. You can view it but cannot edit, delete or submit proofs.</div>}

    <Card title="Tax regime" subtitle="Choose the regime used for monthly TDS. Save to see an old vs new comparison." defaultOpen>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tax regime">
        {(['new', 'old'] as const).map(r => <button key={r} type="button" role="radio" aria-checked={form.taxRegime === r} disabled={locked}
          onClick={() => setForm(f => ({ ...f, taxRegime: r }))}
          className={`rounded-xl border px-3 py-3 text-left disabled:opacity-60 ${form.taxRegime === r ? 'border-[var(--color-bss-interactive-blue)] bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-sm font-semibold text-gray-900">{r === 'new' ? 'New regime' : 'Old regime'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{r === 'new' ? 'Lower slabs; most deductions not allowed' : 'Allows HRA, 80C, 80D and other deductions'}</p>
        </button>)}
      </div>
    </Card>

    <Card title="Section 80C investments" subtitle="PPF, ELSS, LIC, tuition fees… capped at ₹1,50,000 (incl. home loan principal)" total={total80C}>
      <Toggle checked={it.toggles.section80C} onChange={v => setIt('toggles', { ...it.toggles, section80C: v })} disabled={locked} label="Claim this section" />
      <LineEditor lines={form.investments80C} onChange={l => setForm(f => ({ ...f, investments80C: l }))} options={OPTIONS_80C} files={files} setFile={setFile} disabled={locked || !it.toggles.section80C} addLabel="Add 80C investment" />
    </Card>

    <Card title="Section 80D medical insurance" subtitle="Premiums, preventive check-ups and senior-citizen medical expenses" total={total80D}>
      <Toggle checked={it.toggles.section80D} onChange={v => setIt('toggles', { ...it.toggles, section80D: v })} disabled={locked} label="Claim this section" />
      <LineEditor lines={form.investments80D} onChange={l => setForm(f => ({ ...f, investments80D: l }))} options={OPTIONS_80D} files={files} setFile={setFile} disabled={locked || !it.toggles.section80D} addLabel="Add 80D line" />
    </Card>

    <Card title="House rent (HRA)" subtitle="Rent paid while staying in a rented house — old regime HRA exemption" total={it.stayingInRentedHouse ? rentTotal : 0}>
      <Toggle checked={it.stayingInRentedHouse} onChange={v => setIt('stayingInRentedHouse', v)} disabled={locked} label="I am staying in a rented house" />
      {it.stayingInRentedHouse && <RentEditor entries={it.rentEntries} onChange={r => setIt('rentEntries', r)} files={files} setFile={setFile} disabled={locked} />}
    </Card>

    <Card title="Home loan (self-occupied property)" subtitle="Interest u/s 24(b) up to ₹2,00,000; principal counts in 80C" total={it.homeLoanSelfOccupied.enabled ? it.homeLoanSelfOccupied.interestPaid : 0}>
      <Toggle checked={it.homeLoanSelfOccupied.enabled} onChange={v => setIt('homeLoanSelfOccupied', { ...it.homeLoanSelfOccupied, enabled: v })} disabled={locked} label="I have a home loan on a self-occupied house" />
      {it.homeLoanSelfOccupied.enabled && <>
        <div className="grid grid-cols-2 gap-2">
          <Money label="Principal repaid (₹)" value={it.homeLoanSelfOccupied.principalPaid} onChange={v => setIt('homeLoanSelfOccupied', { ...it.homeLoanSelfOccupied, principalPaid: v })} disabled={locked} />
          <Money label="Interest paid (₹)" value={it.homeLoanSelfOccupied.interestPaid} onChange={v => setIt('homeLoanSelfOccupied', { ...it.homeLoanSelfOccupied, interestPaid: v })} disabled={locked} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Lender name"><TextInput value={it.homeLoanSelfOccupied.lenderName} onChange={v => setIt('homeLoanSelfOccupied', { ...it.homeLoanSelfOccupied, lenderName: v })} disabled={locked} maxLength={200} /></Field>
          <Field label="Lender PAN"><TextInput value={it.homeLoanSelfOccupied.lenderPAN} onChange={v => setIt('homeLoanSelfOccupied', { ...it.homeLoanSelfOccupied, lenderPAN: v.toUpperCase() })} disabled={locked} maxLength={20} autoCapitalize="characters" /></Field>
        </div>
        <Attachment url={it.homeLoanSelfOccupied.attachment} file={files.homeLoan} onFile={f => setFile('homeLoan', f)} disabled={locked} label="Attach loan certificate" />
      </>}
    </Card>

    <Card title="Let-out property" subtitle="Declare if you have a let-out property; attach the supporting statement">
      <Toggle checked={it.letOutPropertyEnabled} onChange={v => setIt('letOutPropertyEnabled', v)} disabled={locked} label="I have a let-out property" />
      {it.letOutPropertyEnabled && <Attachment url={it.letOutPropertyAttachment} file={files.letOut} onFile={f => setFile('letOut', f)} disabled={locked} label="Attach property document" />}
    </Card>

    <Card title="Other investments & deductions" subtitle="Lines not covered elsewhere (e.g. education loan, donations)" total={it.toggles.otherInvestments ? sumAmounts(it.investmentsOther) : 0}>
      <Toggle checked={it.toggles.otherInvestments} onChange={v => setIt('toggles', { ...it.toggles, otherInvestments: v })} disabled={locked} label="Claim this section" />
      <LineEditor lines={it.investmentsOther} onChange={l => setIt('investmentsOther', l)} options={OPTIONS_OTHER} files={files} setFile={setFile} disabled={locked || !it.toggles.otherInvestments} addLabel="Add other investment" />
    </Card>

    <Card title="Chapter VI-A deductions" subtitle="NPS, disability, donations, savings interest and other sections">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Money label="80E · Education loan interest" hint="No ceiling; 8-year window" value={form.section80E} onChange={v => setForm(f => ({ ...f, section80E: v }))} disabled={locked} />
        <Money label="80G · Donations" hint="Eligible donation amount" value={form.section80G} onChange={v => setForm(f => ({ ...f, section80G: v }))} disabled={locked} />
        {CHAPTER_VIA_FIELDS.map(fd => <Money key={fd.key} label={fd.label} hint={fd.hint} value={it.chapterVIA[fd.key]} onChange={v => setIt('chapterVIA', { ...it.chapterVIA, [fd.key]: v })} disabled={locked} />)}
      </div>
      <Toggle checked={it.chapterVIA.section80DDSevere} onChange={v => setIt('chapterVIA', { ...it.chapterVIA, section80DDSevere: v })} disabled={locked} label="80DD: dependant has severe disability (80% or more)" />
      <Money label="Professional tax paid (₹ / year)" hint="Only if not already deducted through payroll" value={form.professionalTax} onChange={v => setForm(f => ({ ...f, professionalTax: v }))} disabled={locked} />
    </Card>

    <Card title="Salary exemptions (Section 10)" subtitle="Allowances received that are exempt — mostly old regime">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SALARY_EXEMPTION_FIELDS.map(fd => fd.count
          ? <Field key={fd.key} label={fd.label} hint={fd.hint}><NumberInput min={0} max={20} step={1} value={it.salaryExemptions[fd.key] || ''} onChange={v => setIt('salaryExemptions', { ...it.salaryExemptions, [fd.key]: Math.max(0, Math.floor(v)) })} disabled={locked} inputMode="numeric" /></Field>
          : <Money key={fd.key} label={fd.label} hint={fd.hint} value={it.salaryExemptions[fd.key]} onChange={v => setIt('salaryExemptions', { ...it.salaryExemptions, [fd.key]: v })} disabled={locked} />)}
      </div>
    </Card>

    <Card title="Income from other sources" subtitle="Added to taxable income" total={otherIncomeTotal}>
      <div className="grid grid-cols-2 gap-2">
        <Money label="Other income (₹)" value={it.otherIncomeBreakdown.incomeFromOtherSources} onChange={v => setIt('otherIncomeBreakdown', { ...it.otherIncomeBreakdown, incomeFromOtherSources: v })} disabled={locked} />
        <Money label="Savings account interest" value={it.otherIncomeBreakdown.interestSavings} onChange={v => setIt('otherIncomeBreakdown', { ...it.otherIncomeBreakdown, interestSavings: v })} disabled={locked} />
        <Money label="Fixed deposit interest" value={it.otherIncomeBreakdown.interestFD} onChange={v => setIt('otherIncomeBreakdown', { ...it.otherIncomeBreakdown, interestFD: v })} disabled={locked} />
        <Money label="NSC interest" value={it.otherIncomeBreakdown.interestNSC} onChange={v => setIt('otherIncomeBreakdown', { ...it.otherIncomeBreakdown, interestNSC: v })} disabled={locked} />
      </div>
      <Attachment url={it.otherIncomeBreakdown.attachment} file={files.otherIncome} onFile={f => setFile('otherIncome', f)} disabled={locked} label="Attach statement" />
    </Card>

    {!locked && <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-3 py-3 shadow-sm space-y-2">
      {pendingCount > 0 && <p className="text-[11px] text-orange-700">{pendingCount} new file{pendingCount > 1 ? 's' : ''} selected — files are uploaded with “Submit proofs”. Lines with new files are moved to the top of their section.</p>}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2">
        {hasSaved && <Btn variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm('delete')} disabled={busy}><Trash2 size={14} />Delete</Btn>}
        <Btn variant="secondary" busy={busy} onClick={save}>Save declaration</Btn>
        <Btn busy={busy} className="col-span-2 sm:col-span-1" onClick={() => setConfirm('proof')}>Submit proofs{pendingCount ? ` (${pendingCount})` : ''}</Btn>
      </div>
    </div>}

    {confirm === 'delete' && <Confirm danger busy={busy} title="Delete investment declaration?" onClose={() => setConfirm(null)} onConfirm={remove}
      message={`All declared investments, rent, home loan and other details for FY ${financialYear} will be cleared. TDS already deducted is not affected.`} />}
    {confirm === 'proof' && <Confirm busy={busy} title="Submit investment proofs?" onClose={() => setConfirm(null)} onConfirm={submitProofs}
      message={<>Your declaration{pendingCount ? ` and ${pendingCount} attached file${pendingCount > 1 ? 's' : ''}` : ''} will be sent to HR for verification. Proof status becomes <b>Submitted</b> until HR reviews it.</>} />}
  </div>;
}
