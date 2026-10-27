"use client";

/** Status update (single + bulk), payslip view and payslip PDF helpers for pay runs. */

import { useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import { Async, Btn, Field, FormGrid, Modal, Row, Select, TextInput, isoDate, money, num, useAction, useLoad, type Notify } from '../../ui';
import type { BulkStatusResult, PayLine, PayStatus, PaymentMode, Payslip } from './types';

export const STATUS_LABEL: Record<PayStatus, string> = {
  pending: 'Pending', processed: 'Processed', approved: 'Approved', rejected: 'Rejected', on_hold: 'On hold', paid: 'Paid',
};
/** Statuses the legacy updatePayrollStatus endpoints accept (`pending` is only the initial state). */
export const SETTABLE_STATUSES: PayStatus[] = ['processed', 'approved', 'on_hold', 'rejected', 'paid'];
export const PAYMENT_MODES: Array<{ value: PaymentMode; label: string }> = [
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' },
];
export function paymentModeLabel(mode: string | null | undefined): string {
  return PAYMENT_MODES.find(m => m.value === mode)?.label ?? (mode || '—');
}

/** Download the payslip PDF (GET downloadPayslipPdf/:payrollId). */
export function downloadPayslipPdf(payrollId: string, name = 'Payslip.pdf') {
  return pe.download(`downloadPayslipPdf/${payrollId}`, undefined, name);
}
export function openPayslipPdf(payrollId: string) {
  return pe.open(`downloadPayslipPdf/${payrollId}`);
}

/**
 * Change pay status of one payroll (updatePayrollStatus/:id) or many (updatePayrollStatusBulk).
 * Body: payStatus, remarks / rejectionReason, paidOn (+ paymentMode, transactionId for the payment record).
 */
export function StatusModal({ payrollIds, initialStatus, notify, onClose, onDone, label }: {
  payrollIds: string[]; initialStatus?: PayStatus; notify: Notify; onClose: () => void; onDone: () => void; label?: string;
}) {
  const { busy, run } = useAction(notify);
  const [status, setStatus] = useState<PayStatus>(initialStatus ?? 'approved');
  const [remarks, setRemarks] = useState('');
  const [paidOn, setPaidOn] = useState(isoDate(new Date()));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [transactionId, setTransactionId] = useState('');
  const bulk = payrollIds.length > 1;

  const submit = async () => {
    const body: Record<string, unknown> = { payStatus: status };
    if (status === 'rejected') { body.rejectionReason = remarks || undefined; body.remarks = remarks || undefined; }
    if (status === 'on_hold' && remarks) body.remarks = remarks;
    if (status === 'paid') {
      body.paidOn = paidOn || undefined;
      body.paymentMode = paymentMode;
      if (transactionId) body.transactionId = transactionId;
    }
    if (bulk) {
      const out = await run(() => pe.put<BulkStatusResult>('updatePayrollStatusBulk', { payrollIds, ...body }));
      if (out) {
        notify(`${STATUS_LABEL[out.payStatus] ?? out.payStatus}: ${out.modifiedCount} of ${out.requestedCount} updated (${out.matchedCount} matched)`, 'success');
        onDone();
      }
    } else {
      const out = await run(() => pe.put(`updatePayrollStatus/${payrollIds[0]}`, body), 'Payroll status updated');
      if (out !== undefined) onDone();
    }
  };

  return <Modal title={bulk ? `Update status of ${payrollIds.length} payrolls` : 'Update payroll status'} subtitle={label} onClose={onClose} width="max-w-lg"
    footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn busy={busy} variant={status === 'rejected' ? 'danger' : 'primary'} onClick={submit}>Update to {STATUS_LABEL[status]}</Btn></>}>
    <div className="space-y-3">
      <Field label="New status">
        <Select value={status} onChange={v => setStatus(v as PayStatus)} options={SETTABLE_STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))} />
      </Field>
      {status === 'paid' && <FormGrid cols={2}>
        <Field label="Paid on"><TextInput type="date" value={paidOn} onChange={setPaidOn} /></Field>
        <Field label="Payment mode"><Select value={paymentMode} onChange={v => setPaymentMode(v as PaymentMode)} options={PAYMENT_MODES} /></Field>
        <Field label="Transaction / UTR / cheque no." className="md:col-span-2"><TextInput value={transactionId} onChange={setTransactionId} placeholder="Optional" /></Field>
      </FormGrid>}
      {(status === 'rejected' || status === 'on_hold') && <Field label={status === 'rejected' ? 'Rejection reason' : 'Hold remarks'} hint={status === 'rejected' ? 'Defaults to "Rejected" when empty.' : undefined}>
        <textarea className="w-full min-h-20 rounded-lg border border-gray-300 px-3 py-2 text-sm" value={remarks} onChange={e => setRemarks(e.target.value)} aria-label="Remarks" />
      </Field>}
      {status === 'processed' && <p className="text-xs text-gray-500">Moves the payroll back to “processed” (e.g. to undo an approval, hold or rejection).</p>}
      {status === 'approved' && <p className="text-xs text-gray-500">Approval date is stamped now. Approved payrolls can then be marked paid and included in bank files.</p>}
    </div>
  </Modal>;
}

function linesTotal(lines: PayLine[]) { return lines.reduce((s, l) => s + (Number(l.amount) || 0), 0); }

function orgAddress(address: unknown): string {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address === 'object') return Object.values(address as Record<string, unknown>).filter(v => v !== null && v !== undefined && String(v).trim() !== '' && typeof v !== 'object').join(', ');
  return '';
}

/** GET generatePayslip/:payrollId rendered as a payslip, with PDF download / open / print. */
export function PayslipModal({ payrollId, notify, onClose }: { payrollId: string; notify: Notify; onClose: () => void }) {
  const state = useLoad(() => pe.get<Payslip>(`generatePayslip/${payrollId}`), [payrollId]);
  const { busy, run } = useAction(notify);
  const code = state.data?.employee.code;
  const fileName = state.data ? `Payslip_${code || 'employee'}_${state.data.payPeriod.month}_${state.data.payPeriod.year}.pdf` : 'Payslip.pdf';
  return <Modal title="Payslip" subtitle={state.data ? `${state.data.payPeriod.month} ${state.data.payPeriod.year}` : undefined} onClose={onClose} width="max-w-3xl"
    footer={<>
      <Btn variant="secondary" onClick={() => window.print()}><Printer size={14} />Print</Btn>
      <Btn variant="secondary" busy={busy} onClick={() => run(() => openPayslipPdf(payrollId))}><ExternalLink size={14} />Open PDF</Btn>
      <Btn busy={busy} onClick={() => run(() => downloadPayslipPdf(payrollId, fileName), 'Payslip downloaded')}><Download size={14} />Download PDF</Btn>
    </>}>
    <Async state={state}>{p => {
      const deductions = p.deductions.filter(d => !/^(loss\s*of\s*pay|lop)$/i.test(String(d.componentName).trim()));
      const lop = p.deductions.filter(d => /^(loss\s*of\s*pay|lop)$/i.test(String(d.componentName).trim()));
      return <div className="space-y-4 text-sm">
        <header className="flex items-start gap-3 border-b border-gray-100 pb-3">
          {p.organization.logo && /^(https?:|\/|data:)/.test(p.organization.logo) && (
            // eslint-disable-next-line @next/next/no-img-element -- org logo from engine storage, arbitrary host
            <img src={pe.fileUrl(p.organization.logo)} alt="" className="h-10 w-10 object-contain" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-950">{p.organization.name}</p>
            {orgAddress(p.organization.address) && <p className="text-xs text-gray-500">{orgAddress(p.organization.address)}</p>}
            <p className="text-xs text-gray-500 mt-1">Payslip for {p.payPeriod.month} {p.payPeriod.year}</p>
          </div>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Row label="Employee" value={p.employee.name} />
          <Row label="Employee code" value={p.employee.code || '—'} />
          <Row label="Department" value={p.employee.department || '—'} />
          <Row label="Designation" value={p.employee.designation || '—'} />
          <Row label="Email" value={p.employee.email || '—'} />
          <Row label="Working days / Paid days" value={`${num(p.attendance.workingDays)} / ${num(p.attendance.paidDays)}`} />
          <Row label="Present days" value={num(p.attendance.presentDays)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PayslipColumn title="Earnings" lines={p.earnings} total={p.summary.grossEarnings} totalLabel="Gross earnings" />
          <PayslipColumn title="Deductions" lines={deductions} total={p.summary.totalDeductions} totalLabel="Total deductions" />
        </div>
        {lop.length > 0 && <p className="text-xs text-gray-500">Loss of pay included in deductions: {lop.map(l => money(l.amount)).join(', ')}</p>}
        {(p.benefits.length > 0 || p.reimbursements.length > 0) && <p className="text-xs text-gray-500">
          Earnings include benefits ({money(linesTotal(p.benefits))}) and reimbursements ({money(linesTotal(p.reimbursements))}).
        </p>}
        <div className="rounded-xl bg-[var(--color-bss-navy,#0b1f3a)] text-white px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide">Net pay</span>
          <span className="text-lg font-bold">{money(p.summary.netPay)}</span>
        </div>
      </div>;
    }}</Async>
  </Modal>;
}

function PayslipColumn({ title, lines, total, totalLabel }: { title: string; lines: PayLine[]; total: number; totalLabel: string }) {
  return <div className="rounded-xl border border-gray-200 overflow-hidden">
    <table className="w-full text-xs">
      <thead className="bg-gray-50 text-gray-500"><tr><th className="text-left px-3 py-2">{title}</th><th className="text-right px-3 py-2">Fixed</th><th className="text-right px-3 py-2">Amount</th></tr></thead>
      <tbody className="divide-y divide-gray-100">
        {lines.length === 0 && <tr><td colSpan={3} className="px-3 py-3 text-center text-gray-400">None</td></tr>}
        {lines.map((l, i) => <tr key={`${l.componentName}-${i}`}>
          <td className="px-3 py-1.5 text-gray-800">{l.componentName}{l.calculationType ? <span className="ml-1 text-[10px] text-gray-400">{l.calculationType}</span> : null}</td>
          <td className="px-3 py-1.5 text-right text-gray-500">{money(l.fixedAmount ?? l.amount)}</td>
          <td className="px-3 py-1.5 text-right font-medium">{money(l.amount)}</td>
        </tr>)}
      </tbody>
      <tfoot className="bg-gray-50 font-semibold"><tr><td className="px-3 py-2" colSpan={2}>{totalLabel}</td><td className="px-3 py-2 text-right">{money(total)}</td></tr></tfoot>
    </table>
  </div>;
}

