"use client";

/**
 * Printable Full & Final settlement statement. Styled with inline styles only so the
 * rendered markup can be copied into a print window unchanged.
 */

import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Btn, Modal, fmtDate, money } from '../../ui';
import { empOf, fullName, n, settlementTotals, type Settlement } from './types';

const cell: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #e5e7eb', fontSize: 12 };
const right: React.CSSProperties = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };
const head: React.CSSProperties = { ...cell, background: '#f3f4f6', fontWeight: 700, textAlign: 'left' };

function Lines({ title, rows, total }: { title: string; rows: Array<[string, number]>; total: number }) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
    <thead><tr><th style={head}>{title}</th><th style={{ ...head, textAlign: 'right' }}>Amount</th></tr></thead>
    <tbody>
      {rows.map(([label, value]) => <tr key={label}><td style={cell}>{label}</td><td style={right}>{money(value)}</td></tr>)}
      <tr><td style={{ ...cell, fontWeight: 700 }}>Total {title.toLowerCase()}</td><td style={{ ...right, fontWeight: 700 }}>{money(total)}</td></tr>
    </tbody>
  </table>;
}

export function SettlementStatement({ s, orgName }: { s: Settlement; orgName: string }) {
  const t = settlementTotals(s);
  const e = empOf(s);
  const d = s.deductions ?? {};
  const b = s.bonusIncentives ?? {};
  const earnings: Array<[string, number]> = [
    ['Unpaid salary', n(s.salaryDues?.unpaidSalary)],
    [`Prorated salary (${n(s.salaryDues?.workingDaysInLastMonth)} day(s) of last month)`, n(s.salaryDues?.proratedSalary)],
    [`Leave encashment (${n(s.leaveEncashment?.encashableLeaves)} day(s) × ${money(s.leaveEncashment?.perDayRate)})`, n(s.leaveEncashment?.totalAmount)],
    ['Performance bonus', n(b.performanceBonus)],
    ['Statutory bonus', n(b.statutoryBonus)],
    ['Incentives', n(b.incentives)],
    ['Commission', n(b.commission)],
    ['Pending reimbursements', t.reimbursements],
    [`Gratuity${s.gratuity?.isEligible ? ` (${n(s.gratuity?.yearsOfService)} yr)` : ' (not eligible)'}`, t.gratuity],
  ];
  const deductions: Array<[string, number]> = [
    ['Notice period shortfall', n(d.noticePeriodShortfall)],
    ['Loans & advances', n(d.loansAdvances)],
    ['Company asset recovery', n(d.companyAssetRecovery)],
    ['Damage / loss', n(d.damageLoss)],
    ['Overtime taken / excess paid', n(d.overtimeTaken)],
    ['Other deductions', n(d.otherDeductions)],
    ['TDS', n(s.taxDeductions?.tds)],
    ['Professional tax', n(s.taxDeductions?.professionalTax)],
  ];
  const info: Array<[string, string]> = [
    ['Employee', fullName(e) || '—'], ['Employee code', e?.uniqueId || '—'],
    ['Designation', e?.jobTitle || '—'], ['Date of joining', fmtDate(e?.dateOfJoining)],
    ['Last working day', fmtDate(s.lastWorkingDate)], ['Reason of exit', e?.exitData?.exitStatus || '—'],
    ['Settlement status', s.status], ['Settlement date', fmtDate(s.settlementDate)],
  ];
  return <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#111827', background: '#fff', padding: 4 }}>
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{orgName || 'Full & Final Settlement'}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>Full &amp; Final Settlement Statement</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {Array.from({ length: info.length / 2 }, (_, i) => <tr key={i}>
          <td style={{ ...cell, color: '#6b7280', width: '20%' }}>{info[i * 2][0]}</td><td style={{ ...cell, fontWeight: 600, width: '30%' }}>{info[i * 2][1]}</td>
          <td style={{ ...cell, color: '#6b7280', width: '20%' }}>{info[i * 2 + 1][0]}</td><td style={{ ...cell, fontWeight: 600, width: '30%' }}>{info[i * 2 + 1][1]}</td>
        </tr>)}
      </tbody>
    </table>
    <Lines title="Earnings" rows={earnings.filter(([, v]) => v !== 0)} total={t.payables} />
    <Lines title="Deductions" rows={deductions.filter(([, v]) => v !== 0)} total={t.deductions} />
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
      <tbody><tr>
        <td style={{ ...cell, fontSize: 14, fontWeight: 800, background: '#ecfdf5' }}>{t.net >= 0 ? 'Net amount payable to employee' : 'Net amount recoverable from employee'}</td>
        <td style={{ ...right, fontSize: 14, fontWeight: 800, background: '#ecfdf5' }}>{money(Math.abs(t.net))}</td>
      </tr></tbody>
    </table>
    {s.paymentDetails?.paymentMode && <p style={{ fontSize: 11, marginTop: 10 }}>
      Paid by {s.paymentDetails.paymentMode.replace('_', ' ')} on {fmtDate(s.paymentDetails.paymentDate)}
      {s.paymentDetails.transactionId ? ` · Ref ${s.paymentDetails.transactionId}` : ''}
      {s.paymentDetails.bankAccountNumber ? ` · A/c ${s.paymentDetails.bankAccountNumber}` : ''}{s.paymentDetails.ifscCode ? ` (${s.paymentDetails.ifscCode})` : ''}
    </p>}
    {(s.approvals ?? []).length > 0 && <p style={{ fontSize: 11, marginTop: 6 }}>
      Approvals: {(s.approvals ?? []).map(a => `${a.approverName || '—'}${a.approverRole ? ` (${a.approverRole})` : ''} — ${a.status} ${fmtDate(a.approvedDate)}`).join('; ')}
    </p>}
    <table style={{ width: '100%', marginTop: 48 }}><tbody><tr>
      <td style={{ fontSize: 11, borderTop: '1px solid #9ca3af', paddingTop: 4, width: '40%' }}>Employee signature</td>
      <td style={{ width: '20%' }} />
      <td style={{ fontSize: 11, borderTop: '1px solid #9ca3af', paddingTop: 4, width: '40%', textAlign: 'right' }}>Authorised signatory</td>
    </tr></tbody></table>
    <p style={{ fontSize: 10, color: '#6b7280', marginTop: 16 }}>I acknowledge receipt of the above amount in full and final settlement of all my dues and have no further claims against the organization.</p>
  </div>;
}

export function StatementModal({ s, orgName, onClose }: { s: Settlement; orgName: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const print = () => {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w || !ref.current) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>F&amp;F statement</title><style>@page{margin:14mm}body{margin:0}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };
  return <Modal title="Settlement statement" onClose={onClose} width="max-w-3xl"
    footer={<><Btn variant="secondary" onClick={onClose}>Close</Btn><Btn onClick={print}><Printer size={14} />Print / save PDF</Btn></>}>
    <div ref={ref}><SettlementStatement s={s} orgName={orgName} /></div>
  </Modal>;
}
