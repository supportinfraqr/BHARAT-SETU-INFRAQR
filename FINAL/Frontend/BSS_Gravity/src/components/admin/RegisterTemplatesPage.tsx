"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FilePlus2, FileSpreadsheet, Loader2, Pencil, Plus, Search, Wand2, X } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';

type FieldMapping = { column: string; fieldKey: string };
type CalcRule = { targetField: string; label: string; formula: string };

type FormField = {
  section: string; label: string; dataType: string; dataSource: string;
  sourceField: string; mandatory: boolean; readOnly: boolean;
  signature: boolean; approval: boolean;
};

type TemplateRow = {
  id: number; state: string; formCode: string; title: string; templateType: string;
  status: string; act: string; frequency: string; criticality?: string; isMandatory?: boolean;
  sourceFormat: string;
  columns: string[]; fields: FormField[]; meta: { lines?: string[]; file?: string };
  html: string; active: boolean; fieldMappings?: FieldMapping[]; calculationRules?: CalcRule[];
  formatAvailable?: boolean; version: number; fileName: string; hasFile: boolean; authored?: boolean;
};

type BuilderDraft = {
  id: number | null;
  state: string; formCode: string; title: string;
  templateType: string; status: string; act: string; frequency: string;
  criticality: string; isMandatory: boolean;
  columns: string[]; columnInput: string;
  fields: FormField[];
  html: string;
  fieldMappings: FieldMapping[]; calcRules: CalcRule[];
};

const FIELD_KEYS = ['sl', 'name', 'bssId', 'fatherName', 'gender', 'designation', 'department', 'doj', 'mobile', 'site', 'location'];

const REGISTER_TOKENS = [
  'TITLE', 'FORM_CODE', 'STATE', 'ACT', 'CONTRACTOR_NAME', 'EMPLOYER_NAME', 'SITE_NAME', 'SITE_CODE',
  'MONTH', 'YEAR', 'FINANCIAL_YEAR', 'GENERATED_ON', 'RECORD_COUNT', 'HEAD', 'ROWS',
];

const TEMPLATE_TYPES = ['register', 'return', 'form', 'checklist', 'report'];
const STATUS_CHOICES = ['draft', 'approved', 'published', 'retired'];
const DATA_TYPES = ['text', 'number', 'date', 'currency', 'boolean', 'select', 'textarea'];
const DATA_SOURCES = ['manual', 'worker', 'attendance', 'payroll', 'payment', 'site', 'contractor', 'employer'];

// Field library — Business fields from the Universal Compliance Development Field
// Dictionary (Requirements/BSS_Universal_Compliance_Development_Field_Dictionary.xlsx).
const FIELD_LIBRARY: Array<Pick<FormField, 'label' | 'dataType' | 'dataSource' | 'section'>> = [
  { label: 'Worker ID / BSS ID', dataType: 'text', dataSource: 'worker', section: 'Worker details' },
  { label: 'Worker Name', dataType: 'text', dataSource: 'worker', section: 'Worker details' },
  { label: 'Father / Husband Name', dataType: 'text', dataSource: 'worker', section: 'Worker details' },
  { label: 'Date of Birth', dataType: 'date', dataSource: 'worker', section: 'Worker details' },
  { label: 'Age & Sex', dataType: 'text', dataSource: 'worker', section: 'Worker details' },
  { label: 'Designation / Nature of Work', dataType: 'text', dataSource: 'worker', section: 'Worker details' },
  { label: 'Date of Joining', dataType: 'date', dataSource: 'worker', section: 'Worker details' },
  { label: 'Date of Leaving', dataType: 'date', dataSource: 'worker', section: 'Worker details' },
  { label: 'Contractor / Establishment', dataType: 'text', dataSource: 'contractor', section: 'Establishment' },
  { label: 'Principal Employer', dataType: 'text', dataSource: 'employer', section: 'Establishment' },
  { label: 'Site / Place of Work', dataType: 'text', dataSource: 'site', section: 'Establishment' },
  { label: 'Work Order / Contract ID', dataType: 'text', dataSource: 'contractor', section: 'Establishment' },
  { label: 'Licence No.', dataType: 'text', dataSource: 'manual', section: 'Establishment' },
  { label: 'Attendance Period', dataType: 'text', dataSource: 'attendance', section: 'Attendance & wages' },
  { label: 'Days Present', dataType: 'number', dataSource: 'attendance', section: 'Attendance & wages' },
  { label: 'Overtime Hours', dataType: 'number', dataSource: 'attendance', section: 'Attendance & wages' },
  { label: 'Basic Wage', dataType: 'currency', dataSource: 'payroll', section: 'Attendance & wages' },
  { label: 'Gross Wage', dataType: 'currency', dataSource: 'payroll', section: 'Attendance & wages' },
  { label: 'Deductions', dataType: 'currency', dataSource: 'payroll', section: 'Attendance & wages' },
  { label: 'Net Pay', dataType: 'currency', dataSource: 'payroll', section: 'Attendance & wages' },
  { label: 'Payment Status', dataType: 'select', dataSource: 'payment', section: 'Attendance & wages' },
  { label: 'Payment Date', dataType: 'date', dataSource: 'payment', section: 'Attendance & wages' },
  { label: 'Transaction Reference', dataType: 'text', dataSource: 'payment', section: 'Attendance & wages' },
  { label: 'Amount Advanced', dataType: 'currency', dataSource: 'payroll', section: 'Advances & deductions' },
  { label: 'Date of Repayment', dataType: 'date', dataSource: 'manual', section: 'Advances & deductions' },
  { label: 'Nature of Fine / Deduction', dataType: 'text', dataSource: 'manual', section: 'Advances & deductions' },
  { label: 'Date of Fine / Deduction', dataType: 'date', dataSource: 'manual', section: 'Advances & deductions' },
  { label: 'Amount of Fine / Deduction', dataType: 'currency', dataSource: 'manual', section: 'Advances & deductions' },
  { label: 'Compliance / Instance ID', dataType: 'text', dataSource: 'manual', section: 'Compliance' },
  { label: 'Compliance Period', dataType: 'text', dataSource: 'manual', section: 'Compliance' },
  { label: 'Applicability Status', dataType: 'select', dataSource: 'manual', section: 'Compliance' },
  { label: 'Data Completeness', dataType: 'select', dataSource: 'manual', section: 'Compliance' },
  { label: 'Generation Status', dataType: 'select', dataSource: 'manual', section: 'Compliance' },
  { label: 'Output Type', dataType: 'select', dataSource: 'manual', section: 'Submission' },
  { label: 'Output Name', dataType: 'text', dataSource: 'manual', section: 'Submission' },
  { label: 'File Format', dataType: 'select', dataSource: 'manual', section: 'Submission' },
  { label: 'Submission Status', dataType: 'select', dataSource: 'manual', section: 'Submission' },
  { label: 'Submission Date', dataType: 'date', dataSource: 'manual', section: 'Submission' },
  { label: 'Submitted By', dataType: 'text', dataSource: 'manual', section: 'Submission' },
  { label: 'Declaration Accepted', dataType: 'boolean', dataSource: 'manual', section: 'Submission' },
  { label: 'Supporting Documents', dataType: 'textarea', dataSource: 'manual', section: 'Submission' },
  { label: 'Signature Status', dataType: 'select', dataSource: 'manual', section: 'Submission' },
  { label: 'External Acknowledgment No.', dataType: 'text', dataSource: 'manual', section: 'Submission' },
  { label: 'External Acknowledgment Date', dataType: 'date', dataSource: 'manual', section: 'Submission' },
  { label: 'Remarks', dataType: 'textarea', dataSource: 'manual', section: 'General' },
];

function blankField(over = {}): FormField {
  return {
    section: 'General', label: '', dataType: 'text', dataSource: 'manual',
    sourceField: '', mandatory: false, readOnly: false, signature: false, approval: false,
    ...over,
  };
}

function draftFromRow(row: TemplateRow): BuilderDraft {
  return {
    id: row.id, state: row.state, formCode: row.formCode, title: row.title,
    templateType: row.templateType || 'register', status: row.status || 'draft',
    act: row.act || '', frequency: row.frequency || '',
    criticality: row.criticality || '', isMandatory: row.isMandatory ?? false,
    columns: row.columns, columnInput: '',
    fields: (row.fields || []).map(f => ({ ...blankField(), ...f })),
    html: row.html || '',
    fieldMappings: row.fieldMappings ?? [],
    calcRules: row.calculationRules ?? [],
  };
}

function blankDraft(): BuilderDraft {
  return {
    id: null, state: '', formCode: '', title: '', templateType: 'register',
    status: 'draft', act: '', frequency: '', criticality: '', isMandatory: false,
    columns: [], columnInput: '',
    fields: [blankField()], html: '',
    fieldMappings: [], calcRules: [],
  };
}

export default function RegisterTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [state, setState] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<TemplateRow | null>(null);
  const [builder, setBuilder] = useState<BuilderDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (state !== 'all') params.set('state', state);
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/admin/register-templates${params.toString() ? `?${params}` : ''}`, { cache:'no-store' });
      const body = await response.json().catch(() => ({})) as { rows?:TemplateRow[]; states?:string[]; error?:string };
      if (!response.ok) throw new Error(body.error ?? 'Templates could not be loaded.');
      setRows(body.rows ?? []);
      if (body.states) setStates(body.states);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Templates could not be loaded.'); }
    finally { setLoading(false); }
  }, [state, query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + filter reload
  useEffect(() => { void load(); }, [load]);

  function patch(field: string, value: unknown) {
    setBuilder(b => (b ? { ...b, [field]: value } : b));
  }

  function addLibraryField(label: string) {
    if (!builder || !label) return;
    const lib = FIELD_LIBRARY.find(f => f.label === label);
    if (!lib) return;
    setBuilder({ ...builder, fields: [...builder.fields, blankField(lib)] });
  }

  function addColumn() {
    if (!builder) return;
    const trimmed = builder.columnInput.split(',').map(c => c.trim()).filter(Boolean);
    const merged = [...builder.columns];
    for (const col of trimmed) if (!merged.includes(col)) merged.push(col);
    setBuilder({ ...builder, columns: merged, columnInput: '' });
  }

  function generateHtml() {
    if (!builder) return;
    const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const blocks: string[] = [];
    let section: string | null = null;
    for (const f of builder.fields) {
      if (f.section !== section) {
        section = f.section;
        blocks.push(`<div class="block"><h3>${esc(section)}</h3><table class="form">`);
      }
      const hint = { text:'____________________', number:'______________', date:'dd / mm / yyyy', currency:'₹ ____________', boolean:'Yes / No', select:'____________________', textarea:'' }[f.dataType] ?? '____________________';
      blocks.push(`<tr><td class="label">${esc(f.label)}${f.mandatory ? '&nbsp;<span class=req>*</span>' : ''}</td><td class="value">${hint}</td></tr>`);
    }
    if (blocks.length) blocks.push('</table></div>');
    const table = builder.columns.length
      ? '<div class="block"><h3>Data</h3><table class="data"><thead><tr>{{HEAD}}</tr></thead><tbody>{{ROWS}}</tbody></table></div>'
      : '';
    const sig = builder.fields.some(f => f.signature)
      ? '<div class="sign-row"><span>Authorised Signatory: ____________________</span><span>Date: ____________________</span></div>'
      : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(builder.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  .sub { font-size: 11px; color: #555; margin-bottom: 12px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 24px; font-size: 11px; margin-bottom: 14px; }
  .meta span { color: #666; margin-right: 4px; }
  .block { border: 1px solid #999; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
  .block h3 { font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }
  table.form, table.data { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.form td { border: 1px solid #ccc; padding: 6px 8px; }
  td.label { width: 38%; font-weight: 600; background: #f5f7fa; }
  td.value { color: #333; }
  .req { color: #b91c1c; }
  table.data th { background: #0A192F; color: #fff; padding: 4px 5px; border: 1px solid #999; }
  table.data td { padding: 4px 5px; vertical-align: top; border: 1px solid #999; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 22px; font-size: 11px; }
  .foot { margin-top: 18px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
  @media print { body { margin: 8mm; } }
</style></head><body>
  <h1>${esc(builder.title || builder.formCode)}</h1>
  <div class="sub">${esc(builder.formCode)} \u00b7 ${esc(builder.state)} \u00b7 ${esc(builder.templateType)}</div>
  <div class="meta">
    <div><span>Act / Rules:</span><strong>{{ACT}}</strong></div>
    <div><span>Contractor:</span><strong>{{CONTRACTOR_NAME}}</strong></div>
    <div><span>Employer:</span><strong>{{EMPLOYER_NAME}}</strong></div>
    <div><span>Site:</span><strong>{{SITE_NAME}} ({{SITE_CODE}})</strong></div>
    <div><span>Wage period:</span><strong>{{MONTH}} {{YEAR}}</strong></div>
    <div><span>Records:</span><strong>{{RECORD_COUNT}}</strong></div>
  </div>
  ${blocks.join('')}
  ${table}
  ${sig}
  <div class="foot"><span>Generated on {{GENERATED_ON}}</span><span>Form: ${esc(builder.formCode)} / {{FINANCIAL_YEAR}}</span></div>
</body></html>`;
    setBuilder({ ...builder, html });
  }

  async function saveBuilder() {
    if (!builder) return;
    if (!builder.state.trim() || !builder.formCode.trim()) {
      setError('State and Form / Register code are required.');
      return;
    }
    setBusy(true); setError('');
    try {
      const payload = {
        state: builder.state.trim(), formCode: builder.formCode.trim().toUpperCase(),
        title: builder.title.trim(), templateType: builder.templateType,
        status: builder.status, act: builder.act.trim(), frequency: builder.frequency.trim(),
        criticality: builder.criticality, isMandatory: builder.isMandatory,
        columns: builder.columns, fields: builder.fields,
        html: builder.html,
        fieldMappings: builder.fieldMappings, calculationRules: builder.calcRules,
      };
      const isNew = builder.id === null;
      const response = await fetch(isNew ? '/api/admin/register-templates' : `/api/admin/register-templates/${builder.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Save failed.');
      setBuilder(null);
      setNotice(isNew ? 'New form created.' : 'Form updated.');
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  async function removeTemplate(row: TemplateRow) {
    if (!window.confirm(`Delete form template ${row.state} \u00b7 ${row.formCode}?`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/register-templates/${row.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Delete failed.');
      setNotice(`Deleted ${row.state} \u00b7 ${row.formCode}.`);
      void load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Delete failed.'); }
    finally { setBusy(false); }
  }

  const columns: DataColumn<TemplateRow>[] = [
    { id:'state', header:'State / Region', value:r => r.state },
    { id:'form', header:'Form', value:r => r.formCode, render:r => <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-gray-800">{r.formCode}</span>{r.formatAvailable === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700" title="The source matrix lists no official register format for this state">No format</span>}{r.authored ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Authored</span> : null}</div> },
    { id:'title', header:'Title', value:r => r.title || '—' },
    { id:'type', header:'Type', value:r => r.templateType || 'register' },
    { id:'status', header:'Status', value:r => r.status || '—' },
    { id:'criticality', header:'Criticality', value:r => r.criticality || '—', render:r => r.criticality ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.criticality === 'High' ? 'bg-red-50 text-red-700' : r.criticality === 'Medium' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{r.criticality}</span> : null },
    { id:'mandatory', header:'Mandatory', value:r => (r.isMandatory ? 'Yes' : 'No'), render:r => r.isMandatory ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">Yes</span> : <span className="text-gray-300 text-xs">—</span> },
    { id:'format', header:'Source', value:r => (r.authored ? 'UI' : r.sourceFormat.toUpperCase()) },
    { id:'cols', header:'Columns', value:r => r.columns.length, render:r => <span className={r.columns.length ? 'font-semibold text-green-700' : 'text-gray-400'}>{r.columns.length}</span> },
    { id:'fields', header:'Fields', value:r => (r.fields || []).length, render:r => <span className={r.fields?.length ? 'font-semibold text-blue-700' : 'text-gray-400'}>{r.fields?.length ?? 0}</span> },
    { id:'version', header:'Version', value:r => r.version },
    { id:'actions', header:'Actions', filterable:false, value:r => r.id, render:r => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setBuilder(draftFromRow(r)); setError(''); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#073B67] hover:underline"><Pencil size={13}/>Edit</button>
        <button onClick={() => setView(r)} className="text-xs font-semibold text-blue-700 hover:underline">View fields</button>
        {r.hasFile && <a href={`/api/register-templates/${r.id}/file`} download className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#073B67]"><Download size={13}/>Source</a>}
        <button onClick={() => void removeTemplate(r)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
      </div>
    ) },
  ];

  return <div className="space-y-6 pb-10">
    <header>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">BSS Admin · Masters</p>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 mt-1">Statutory Registers &amp; Forms</h1>
      <p className="text-sm text-gray-500 mt-1">The consolidated statutory library — one template per State + Form (doc metadata, criticality, mandatory and the imported CLRA registers), plus forms the admin authors field-dictionary style.</p>
    </header>

    {error && <p role="alert" className="bss-alert bss-alert-error">{error}</p>}
    {notice && <p role="status" className="bss-alert bss-alert-success">{notice}</p>}

    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs font-semibold text-gray-600">State
        <select value={state} onChange={e => setState(e.target.value)} className="ml-2 h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white"><option value="all">All states / regions</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      </label>
      <label className="relative"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search form or title…" className="h-9 rounded-lg border border-gray-200 pl-9 pr-3 text-xs w-64"/></label>
      <span className="text-xs text-gray-400">{rows.length} template{rows.length === 1 ? '' : 's'}</span>
      <button onClick={() => { setBuilder(blankDraft()); setError(''); }} className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#073B67] text-white text-xs font-bold"><FilePlus2 size={14}/>New form</button>
    </div>

    {loading ? <p className="flex items-center gap-2 text-sm text-gray-500 py-10"><Loader2 size={16} className="animate-spin"/>Loading templates…</p>
      : <EnterpriseDataTable title="Register templates" rows={rows} columns={columns} rowKey={r => String(r.id)} filename="register-templates"/>}

    {view && <div className="fixed inset-0 z-[95] bg-black/50 flex justify-end" role="presentation"><section role="dialog" aria-modal="true" aria-label="Register template fields" className="bg-white w-full max-w-lg h-full overflow-y-auto">
      <header className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Register template</p><h2 className="font-semibold text-gray-950 mt-0.5 flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#073B67]"/>{view.state} · {view.formCode}</h2>{view.title && <p className="text-xs text-gray-500 mt-0.5">{view.title}</p>}</div>
        <button onClick={() => setView(null)} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-gray-50"><X size={16}/></button>
      </header>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Form fields ({view.fields?.length ?? 0})</p>
          {(view.fields?.length) ? <ol className="space-y-2">{view.fields.map((f, i) => <li key={i} className="rounded-lg border border-gray-100 px-3 py-2 text-xs"><div className="flex justify-between gap-2"><span className="font-semibold text-gray-800">{f.label}</span><span className="text-gray-400 uppercase text-[10px]">{f.dataType}{f.mandatory ? ' · required' : ''}</span></div><div className="text-gray-400 text-[11px] mt-0.5">{f.section}{f.dataSource !== 'manual' ? ` · from ${f.dataSource}` : ''}{f.signature ? ' · signed' : ''}{f.approval ? ' · approved' : ''}</div></li>)}</ol>
            : <p className="text-xs text-gray-400">No field-dictionary fields defined.</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Columns ({view.columns.length})</p>
          {view.columns.length
            ? <ol className="space-y-1.5">{view.columns.map((col, i) => <li key={`${col}-${i}`} className="flex gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs"><span className="text-gray-400 w-6">{i + 1}</span><span className="text-gray-800 font-medium">{col}</span></li>)}</ol>
            : <p className="text-xs text-gray-400">No tabular columns parsed — this is a form-style register.</p>}
        </div>
        {view.meta?.lines && view.meta.lines.length > 0 && <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Header / form fields</p>
          <ul className="space-y-1 text-xs text-gray-600">{view.meta.lines.map((line, i) => <li key={i} className="rounded-lg bg-gray-50 px-3 py-1.5">{line}</li>)}</ul>
        </div>}
        {view.hasFile && <a href={`/api/register-templates/${view.id}/file`} download className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold"><Download size={14}/>Download source ({view.sourceFormat.toUpperCase()})</a>}
      </div>
    </section></div>}

    {builder && <div className="fixed inset-0 z-[96] bg-black/50 grid place-items-center p-4">
      <section role="dialog" aria-modal="true" aria-label="Register form builder" className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div><h2 className="text-sm font-semibold">{builder.id ? `Edit form · ${builder.state} · ${builder.formCode}` : 'New statutory form / register'}</h2><p className="text-[11px] text-gray-500 mt-0.5">Author the form per State + Form the way the field dictionary defines it — sections, labelled fields, data types and signature/approval flags.</p></div>
          <button onClick={() => setBuilder(null)} aria-label="Close"><X size={16}/></button>
        </header>
        <div className="overflow-y-auto">
          <div className="p-5 grid md:grid-cols-2 xl:grid-cols-4 gap-3 border-b border-gray-100">
            <label className="text-[11px] font-semibold text-gray-600">State *<input value={builder.state} onChange={e => patch('state', e.target.value)} list="bss-states" placeholder="e.g. Maharashtra" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/><datalist id="bss-states">{states.map(s => <option key={s} value={s}/>)}</datalist></label>
            <label className="text-[11px] font-semibold text-gray-600">Form / Register code *<input value={builder.formCode} onChange={e => patch('formCode', e.target.value)} placeholder="e.g. FORM XXVI-A" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs font-mono"/></label>
            <label className="text-[11px] font-semibold text-gray-600">Title<input value={builder.title} onChange={e => patch('title', e.target.value)} placeholder="Register of Contractors engaged" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
            <label className="text-[11px] font-semibold text-gray-600">Type<select value={builder.templateType} onChange={e => patch('templateType', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white">{TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-gray-600">Status<select value={builder.status} onChange={e => patch('status', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white">{STATUS_CHOICES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-gray-600">Act / Legal framework<input value={builder.act} onChange={e => patch('act', e.target.value)} placeholder="e.g. CLRA Act, 1970" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
            <label className="text-[11px] font-semibold text-gray-600">Criticality<select value={builder.criticality} onChange={e => patch('criticality', e.target.value)} className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white"><option value="">—</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label className="text-[11px] font-semibold text-gray-600 flex flex-col">Mandatory<label className="mt-3 inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer"><input type="checkbox" checked={builder.isMandatory} onChange={e => patch('isMandatory', e.target.checked)} className="accent-[#073B67]"/>Statutory mandatory</label></label>
            <label className="text-[11px] font-semibold text-gray-600">Frequency<input value={builder.frequency} onChange={e => patch('frequency', e.target.value)} placeholder="Monthly / Quarterly" className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-xs"/></label>
            <div className="flex items-end"><button type="button" onClick={generateHtml} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"><Wand2 size={14}/>Generate layout</button></div>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Fields & sections ({builder.fields.length})</p>
                <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">Add from field dictionary
                  <select defaultValue="" onChange={e => { addLibraryField(e.target.value); e.target.value = ''; }} className="h-8 rounded-lg border border-gray-200 px-2 text-[11px] bg-white">
                    <option value="">Select a field…</option>
                    {FIELD_LIBRARY.map(f => <option key={f.label} value={f.label}>{f.label} ({f.dataType})</option>)}
                  </select>
                </label>
              </div>
              <div className="space-y-2">
                {builder.fields.map((f, i) => <div key={i} className="grid grid-cols-[150px_1fr_110px_120px_80px_auto] gap-2 items-center rounded-lg border border-gray-100 px-2 py-1.5">
                  <input value={f.section} onChange={e => patch('fields', builder.fields.map((x, j) => j === i ? { ...x, section: e.target.value } : x))} placeholder="Section" className="h-8 border border-gray-200 rounded-lg px-2 text-[11px]"/>
                  <input value={f.label} onChange={e => patch('fields', builder.fields.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Field label" className="h-8 border border-gray-200 rounded-lg px-2 text-[11px]"/>
                  <select value={f.dataType} onChange={e => patch('fields', builder.fields.map((x, j) => j === i ? { ...x, dataType: e.target.value } : x))} className="h-8 border border-gray-200 rounded-lg px-1 text-[11px] bg-white">{DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <select value={f.dataSource} onChange={e => patch('fields', builder.fields.map((x, j) => j === i ? { ...x, dataSource: e.target.value } : x))} className="h-8 border border-gray-200 rounded-lg px-1 text-[11px] bg-white">{DATA_SOURCES.map(s => <option key={s} value={s}>{s === 'manual' ? 'manual' : `from ${s}`}</option>)}</select>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    {[['M', 'mandatory'], ['R', 'readOnly'], ['S', 'signature'], ['A', 'approval']].map(([label, key]) => (
                      <label key={key} className="flex items-center gap-0.5 cursor-pointer" title={key}>
                        <input type="checkbox" checked={f[key as keyof FormField] as boolean} onChange={e => patch('fields', builder.fields.map((x, j) => j === i ? { ...x, [key]: e.target.checked } : x))} className="accent-[#073B67]"/>{label}
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={() => patch('fields', builder.fields.filter((_, j) => j !== i))} className="w-7 h-7 grid place-items-center rounded text-gray-400 hover:text-red-600"><X size={14}/></button>
                </div>)}
                <button type="button" onClick={() => patch('fields', [...builder.fields, blankField()])} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"><Plus size={13}/>Add field</button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Tabular columns ({builder.columns.length}) — optional, for register-styled data rows</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {builder.columns.map((col, i) => <span key={`${col}-${i}`} className="inline-flex items-center gap-1 text-[11px] font-mono rounded-lg bg-gray-100 px-2.5 py-1.5">{col}<button type="button" onClick={() => patch('columns', builder.columns.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><X size={12}/></button></span>)}
                <input value={builder.columnInput} onChange={e => patch('columnInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} placeholder="HEADER, HEADER2" className="h-8 rounded-lg border border-gray-200 px-2.5 text-[11px] font-mono w-56"/>
                <button type="button" onClick={addColumn} className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">Add</button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">HTML layout</p>
                <div className="flex flex-wrap gap-1">
                  {REGISTER_TOKENS.map(tok => <button key={tok} type="button" onClick={() => patch('html', builder.html + `{{${tok}}}`)} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">{`{{${tok}}}`}</button>)}
                </div>
              </div>
              <textarea value={builder.html} onChange={e => patch('html', e.target.value)} rows={10} spellCheck={false} placeholder="<!doctype html>… (blank → generated from fields)" className="w-full rounded-lg border border-gray-200 p-3 font-mono text-[11px] leading-relaxed"/>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Field mapping ({builder.fieldMappings.length})</p>
              <p className="text-[11px] text-gray-400 mb-2">Map each register column to a master-file field. Leave blank to auto-detect.</p>
              <div className="space-y-1.5">
                {builder.columns.map(col => {
                  const cur = builder.fieldMappings.find(m => m.column === col)?.fieldKey ?? '';
                  return <div key={col} className="grid grid-cols-[1fr_180px] gap-2 items-center">
                    <span className="text-[11px] text-gray-700 truncate" title={col}>{col}</span>
                    <select value={cur} onChange={e => patch('fieldMappings', (() => { const others = builder.fieldMappings.filter(m => m.column !== col); return e.target.value ? [...others, { column: col, fieldKey: e.target.value }] : others; })())} className="h-8 border border-gray-200 rounded-lg px-2 text-[11px] bg-white"><option value="">Auto-detect</option>{FIELD_KEYS.map(k => <option key={k} value={k}>{k}</option>)}</select>
                  </div>;
                })}
                {!builder.columns.length && <p className="text-[11px] text-gray-400">No tabular columns — field mapping only applies to register-styled rows.</p>}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Calculation rules ({builder.calcRules.length})</p>
              <p className="text-[11px] text-gray-400 mb-2">e.g. target <code>otAmount</code>, formula <code>otHours * otRate</code> (field keys + arithmetic).</p>
              <div className="space-y-1.5">
                {builder.calcRules.map((r, i) => <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
                  <input value={r.targetField} onChange={e => patch('calcRules', builder.calcRules.map((x, j) => j === i ? { ...x, targetField: e.target.value } : x))} placeholder="targetField" className="h-8 border border-gray-200 rounded-lg px-2 text-[11px]"/>
                  <input value={r.formula} onChange={e => patch('calcRules', builder.calcRules.map((x, j) => j === i ? { ...x, formula: e.target.value } : x))} placeholder="otHours * otRate" className="h-8 border border-gray-200 rounded-lg px-2 text-[11px] font-mono"/>
                  <button type="button" onClick={() => patch('calcRules', builder.calcRules.filter((_, j) => j !== i))} className="w-8 h-8 grid place-items-center text-gray-400 hover:text-red-600"><X size={14}/></button>
                </div>)}
                <button type="button" onClick={() => patch('calcRules', [...builder.calcRules, { targetField:'', label:'', formula:'' }])} className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold inline-flex items-center gap-1"><Plus size={13}/>Add rule</button>
              </div>
            </div>
          </div>
        </div>
        <footer className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={() => setBuilder(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-xs font-bold text-gray-600">Cancel</button>
          <button disabled={busy} onClick={() => void saveBuilder()} className="h-10 px-4 rounded-lg bg-[#073B67] text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"><CheckCircle2 size={14}/>{busy ? 'Saving…' : builder.id ? 'Save changes' : 'Create form'}</button>
        </footer>
      </section>
    </div>}
  </div>;
}