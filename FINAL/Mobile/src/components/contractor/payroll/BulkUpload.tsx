"use client";

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, FileSpreadsheet, FileWarning, Info, Upload, XCircle } from 'lucide-react';
import type { ContractorPortalData, PayrollWorkerRecord } from '@/types/portal';
import { computePayroll, downloadTableAsXls, formatInr, readSpreadsheet, rowToRecord, validateRows, writeXlsx, type UploadRow } from './PayrollCalculator';

type Stage = 'idle' | 'uploaded' | 'validating' | 'preview' | 'imported';

export default function BulkUpload({ portal, onImport }: {
  portal: ContractorPortalData;
  onImport: (records: PayrollWorkerRecord[]) => void;
}) {
  const { payroll } = portal;
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [expandedErrors, setExpandedErrors] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const validRows = rows.filter(r => r.valid);
  const errorRows = rows.filter(r => !r.valid);
  const warningRows = rows.filter(r => r.valid && r.warnings.length > 0);
  const knownWorkerIds = portal.workers.map(w => w.bssId);

  const downloadTemplate = async () => {
    try {
      await writeXlsx('bss-payroll-template', 'Payroll', payroll.templateColumns, [
        ['BSS892199210001', 'Ravi Kumar', 'August 2026', 26, 0, 15000, 4500, 1600, 1200, 0, 0, 0, 0, 1250, 1250, 0, 0, 500, 0],
        ['BSS892199220002', 'Amit Singh', 'August 2026', 25, 1, 14500, 4200, 1600, 1000, 0, 0, 0, 0, 1207, 1250, 0, 0, 1000, 0],
      ]);
    } catch {
      downloadTableAsXls('bss-payroll-template', payroll.templateColumns, [
        ['BSS892199210001', 'Ravi Kumar', 'August 2026', 26, 0, 15000, 4500, 1600, 1200, 0, 0, 0, 0, 1250, 1250, 0, 0, 500, 0],
      ]);
    }
    setNotice('Payroll XLS template downloaded. Fill one row per worker, then upload the completed file.');
    setError('');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setStage('validating');
    setFileName(file.name);
    setError('');
    setNotice('');
    try {
      const matrix = await readSpreadsheet(file);
      const validated = validateRows(matrix, payroll.config, knownWorkerIds);
      // allow a short simulated validation tick so the loading state is visible
      await new Promise(resolve => setTimeout(resolve, 700));
      setRows(validated);
      setStage('preview');
    } catch (reason) {
      setError(reason instanceof Error ? `Could not read the spreadsheet — ${reason.message}` : 'Could not read the spreadsheet. Download the template and fill it, then upload the completed XLS/XLSX.');
      setStage('idle');
      setFileName('');
    }
  };

  const confirmImport = () => {
    const records: PayrollWorkerRecord[] = validRows.map((row, index) => {
      const input = rowToRecord(row.values, payroll.config);
      const worker = portal.workers.find(w => w.bssId === input.workerId);
      const basic = input.earnings['Basic'] ?? 0;
      const earningsMap = { ...input.earnings };
      if (basic > 0 && !(earningsMap['Statutory Bonus'] ?? 0)) earningsMap['Statutory Bonus'] = Math.round(basic * 0.0833);
      if (basic > 0 && !(earningsMap['Medical Allowance'] ?? 0)) earningsMap['Medical Allowance'] = 1250;
      input.earnings = earningsMap;
      const computed = computePayroll(input, payroll.config);
      return {
        id: `PR-U${Date.now()}-${index}`,
        workerId: input.workerId,
        workerName: worker?.name ?? input.workerName,
        employer: worker?.employer ?? 'Unassigned',
        site: worker?.site ?? 'Unassigned',
        period: input.period,
        status: 'Submitted' as const,
        attendanceDays: input.attendanceDays,
        lopDays: input.lopDays,
        pfWage: computed.pfWage,
        earnings: payroll.config.salary.earnings.filter(e => e.active).map(e => ({ component: e.name, amount: input.earnings[e.name] ?? 0 })),
        deductions: payroll.config.salary.deductions.filter(d => d.active).map(d => ({ component: d.name, amount: input.deductions[d.name] ?? 0 })),
        contributions: computed.contributions,
        gross: computed.gross, totalDeductions: computed.totalDeductions, netPay: computed.netPay, employerCost: computed.employerCost,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Bulk upload',
        errors: row.warnings.length ? row.warnings : undefined,
      };
    });
    onImport(records);
    setStage('imported');
    setNotice(`Imported ${records.length} payroll record${records.length === 1 ? '' : 's'} for verification.`);
  };

  const downloadErrorReport = () => {
    if (!errorRows.length) return;
    const headers = [...payroll.templateColumns, 'Row', 'Error'];
    const body = errorRows.map(row => [...row.values.slice(0, payroll.templateColumns.length), String(row.row), row.errors.join('; ')]);
    downloadTableAsXls('payroll-import-errors', headers, body);
  };

  const netOf = (row: UploadRow) => {
    const gross = row.values.slice(5, 5 + 10).reduce((s, v) => s + (Number(v) || 0), 0);
    return gross;
  };

  return <div className="space-y-5">
    {notice && <p role="status" className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={15}/>{notice}</p>}
    {error && <p role="alert" className="bss-alert bss-alert-error flex items-center gap-2"><XCircle size={15}/>{error}</p>}

    {/* Upload box */}
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-950">Bulk payroll upload</h2><p className="text-xs text-gray-400 mt-0.5">Download the XLS template → fill worker records → upload → validate → preview → confirm import.</p></header>
      <div className="p-5 grid md:grid-cols-[1fr_auto] gap-4 items-stretch">
        <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void handleFile(e.dataTransfer.files[0]); }} className="min-h-40 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40">
          <FileSpreadsheet size={30} className="text-bss-green"/>
          <strong className="text-sm text-gray-800 mt-2">{fileName || 'Choose or drop XLS / XLSX / CSV here'}</strong>
          <span className="text-xs text-gray-500 mt-1">The completed file is validated row-by-row before any record is imported.</span>
          <input ref={fileInput} type="file" accept=".xls,.xlsx,.csv" className="sr-only" onChange={e => void handleFile(e.target.files?.[0])}/>
        </label>
        <div className="flex md:flex-col gap-2 md:w-56">
          <button onClick={downloadTemplate} className="flex-1 h-11 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50"><Download size={15}/>Download XLS Template</button>
          <button onClick={() => fileInput.current?.click()} disabled={stage === 'validating'} className="flex-1 h-11 rounded-lg bg-[#073B67] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#062D4F] disabled:opacity-50"><Upload size={15}/>{stage === 'validating' ? 'Validating…' : 'Upload Completed XLS/XLSX'}</button>
        </div>
      </div>
    </section>

    {/* Preview */}
    {stage === 'preview' && <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-gray-950">Import preview — {fileName}</h2><p className="text-xs text-gray-400 mt-0.5">{rows.length} total rows · {validRows.length} valid · {errorRows.length} with errors · {warningRows.length} with warnings</p></div>
        <div className="flex gap-2">
          <button onClick={downloadErrorReport} disabled={!errorRows.length} className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"><FileWarning size={14}/>Download Error Report</button>
          <button onClick={confirmImport} disabled={!validRows.length} className="h-9 px-4 rounded-lg bg-bss-green text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-95 disabled:opacity-50"><CheckCircle2 size={14}/>Confirm Import ({validRows.length})</button>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-3 px-5 py-4 bg-gray-50/60 border-b border-gray-100">
        <Summary label="Total rows" value={rows.length} tone="text-gray-800"/>
        <Summary label="Valid records" value={validRows.length} tone="text-bss-green"/>
        <Summary label="Error records" value={errorRows.length} tone="text-red-600"/>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100 sticky top-0"><tr><th className="px-4 py-2.5">Row</th>{payroll.templateColumns.slice(0, 10).map(col => <th key={col} className="px-3 py-2.5">{col}</th>)}<th className="px-3 py-2.5">Validation</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.row} className={row.valid ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50'}>
                <td className="px-4 py-2.5 font-mono text-gray-400">#{row.row}</td>
                {row.values.slice(0, 10).map((cell, i) => <td key={i} className={`px-3 py-2.5 ${i === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{cell || '—'}</td>)}
                <td className="px-3 py-2.5">
                  {row.valid
                    ? <span className="inline-flex items-center gap-1 text-bss-green font-semibold"><CheckCircle2 size={13}/>Valid{row.warnings.length ? ` · ${row.warnings.length} warn` : ''}</span>
                    : <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><XCircle size={13}/>{row.errors.length} error{row.errors.length > 1 ? 's' : ''}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(errorRows.length > 0 || warningRows.length > 0) && <div className="px-5 py-4 border-t border-gray-100">
        <button onClick={() => setExpandedErrors(v => !v)} className="text-xs font-bold text-gray-700 flex items-center gap-1.5">{expandedErrors ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Row-level messages ({errorRows.length + warningRows.length})</button>
        {expandedErrors && <ul className="mt-3 space-y-2">
          {rows.filter(r => !r.valid || r.warnings.length).map(row => <li key={row.row} className="text-xs rounded-lg border border-gray-100 p-3">
            <p className="font-mono text-gray-400 mb-1">Row #{row.row}</p>
            {row.errors.map((e, i) => <p key={i} className="text-red-600 flex items-center gap-1.5"><XCircle size={12}/>{e}</p>)}
            {row.warnings.map((w, i) => <p key={`w-${i}`} className="text-orange-600 flex items-center gap-1.5"><AlertTriangle size={12}/>{w}</p>)}
          </li>)}
        </ul>}
      </div>}

      {validRows.length > 0 && <div className="px-5 py-4 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500 bg-gray-50/40"><Info size={14} className="mt-0.5 flex-shrink-0"/>Net pay is computed as Gross − (EPF 12% of restricted PF wage + EPS + ESI 0.75% + PT + one-time deductions). Statutory Bonus (8.33% of Basic) and Medical Allowance (₹1,250) are auto-filled when Basic is present but the cell is empty. Preview net for first valid row: <strong className="text-gray-800">{formatInr(netOf(validRows[0]))} gross</strong>.</div>}
    </section>}

    {stage === 'imported' && <section className="bss-alert bss-alert-success flex items-center gap-2"><CheckCircle2 size={16}/>Import complete — {validRows.length} record(s) submitted for verification. Switch to <strong>Worker Payroll Records</strong> to track their status.</section>}
  </div>;
}

function Summary({ label, value, tone }: { label:string; value:number; tone:string }) {
  return <div className="bg-white border border-gray-100 rounded-xl px-4 py-3"><strong className={`block text-xl ${tone}`}>{value}</strong><span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span></div>;
}
