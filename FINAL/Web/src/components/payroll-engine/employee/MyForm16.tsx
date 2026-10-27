"use client";

/**
 * My Form 16 & Tax Report (worker self-service, mobile-first).
 * employee/form16 (+ /part-a/download, /part-b/download, /download), employee/tax-report (+ /download).
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Btn, currentFinancialYear, Empty, FinancialYearPicker, Section, Tabs, useAction, useLoad } from '../ui';
import { Form16View, type Form16Data } from '../modules/Form16/Form16View';
import { TaxReportView } from '../modules/Tds/TaxReportView';
import type { TaxReport } from '../modules/Tds/types';

export default function MyForm16({ notify, params }: ModuleProps) {
  const [fy, setFy] = useState(params.financialYear || currentFinancialYear());
  const [tab, setTab] = useState(params.tab === 'form16' ? 'form16' : 'report');
  const report = useLoad(() => tab === 'report' ? pe.get<TaxReport>('employee/tax-report', { financialYear: fy }) : Promise.resolve(null), [fy, tab]);
  const form16 = useLoad(() => tab === 'form16' ? pe.get<Form16Data>('employee/form16', { financialYear: fy }) : Promise.resolve(null), [fy, tab]);
  const { busy, run } = useAction(notify);
  const [which, setWhich] = useState('');
  async function dl(path: string, name: string) {
    setWhich(path);
    await run(() => pe.download(path, { financialYear: fy }, name));
    setWhich('');
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'report', label: 'Tax report' }, { key: 'form16', label: 'Form 16' }]} />
      <FinancialYearPicker value={fy} onChange={setFy} />
    </div>

    {tab === 'report' && <Section title="My tax report" subtitle={`FY ${fy} — projected tax, TDS deducted and declarations`}
      right={<Btn variant="secondary" busy={busy && which === 'employee/tax-report/download'} onClick={() => dl('employee/tax-report/download', `Tax-Report-${fy}.pdf`)}><Download size={14} />PDF</Btn>}>
      <div className="p-4 sm:p-5"><Async state={report} empty={<Empty title="No tax report" />}>{r => <TaxReportView report={r} />}</Async></div>
    </Section>}

    {tab === 'form16' && <Section title="My Form 16" subtitle={`FY ${fy}`}>
      <div className="px-4 sm:px-5 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Btn busy={busy && which === 'employee/form16/download'} onClick={() => dl('employee/form16/download', `Form16-${fy}.pdf`)}><Download size={14} />Full Form 16</Btn>
        <Btn variant="secondary" busy={busy && which === 'employee/form16/part-a/download'} onClick={() => dl('employee/form16/part-a/download', `Form16-PartA-${fy}.pdf`)}><Download size={14} />Part A</Btn>
        <Btn variant="secondary" busy={busy && which === 'employee/form16/part-b/download'} onClick={() => dl('employee/form16/part-b/download', `Form16-PartB-${fy}.pdf`)}><Download size={14} />Part B</Btn>
      </div>
      <div className="p-4 sm:p-5"><Async state={form16} empty={<Empty title="Form 16 not available" text="Form 16 is ready once HR has calculated TDS for this financial year." />}>{d => <Form16View data={d} />}</Async></div>
    </Section>}
  </div>;
}
