"use client";

/**
 * Employee self-service — income tax declaration (legacy ESS "Taxation").
 *
 * Endpoints (legacy tdsManagement.js):
 *   GET    tds/employee/:ownId?financialYear      current declaration + projection
 *   PUT    tds/investment-declaration             save declaration (JSON) -> saveAndCompare
 *   DELETE tds/investment-declaration?financialYear
 *   PUT    tds/submitInvestmentproof              multipart (JSON fields + legacy file fields)
 *   GET    tds/hra-details/:ownId?financialYear
 *   GET    tds/tax-report(/download)?financialYear
 */

import { useState } from 'react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Async, Badge, Empty, FinancialYearPicker, Section, Tabs, currentFinancialYear, fmtDateTime, money, useLoad } from '../ui';
import DeclarationForm from './MyTax/DeclarationForm';
import { CompareResult, Computation, HraPanel, ProofStatus, TaxReportPanel } from './MyTax/Views';
import type { EmployeeTdsRecord, SaveResult } from './MyTax/types';

const TABS = [
  { key: 'declare', label: 'Declaration' },
  { key: 'proofs', label: 'Proof status' },
  { key: 'compute', label: 'My TDS' },
  { key: 'hra', label: 'HRA' },
  { key: 'report', label: 'Tax report' },
];

export default function MyTax({ ctx, notify }: ModuleProps) {
  const employeeId = ctx.employee?._id ?? '';
  const [fy, setFy] = useState(currentFinancialYear());
  const [tab, setTab] = useState('declare');
  const [last, setLast] = useState<{ fy: string; result: SaveResult } | null>(null);
  const state = useLoad(
    () => (employeeId ? pe.get<EmployeeTdsRecord>(`tds/employee/${employeeId}`, { financialYear: fy }) : Promise.resolve(null)),
    [employeeId, fy],
  );

  if (!employeeId) {
    return <Section title="Tax declaration"><Empty title="Payroll profile not found" text="Your account is not linked to a payroll employee yet. Please contact HR." /></Section>;
  }

  const result = last?.fy === fy ? last.result : null;
  const onSaved = (r: SaveResult) => { setLast({ fy, result: r }); state.reload(); };
  const onDeleted = () => { setLast(null); state.reload(); };

  return <div className="space-y-3 max-w-4xl mx-auto">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-base font-bold text-gray-950">Tax declaration</h1>
        <p className="text-xs text-gray-500">Declare investments and rent so the right TDS is deducted from your salary.</p>
      </div>
      <FinancialYearPicker value={fy} onChange={setFy} />
    </div>

    <Async state={state}>{rec => <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge status="confirmed">{rec.taxRegime === 'old' ? 'Old regime' : 'New regime'}</Badge>
        {rec.isLocked && <Badge status="locked">Frozen by HR</Badge>}
        {rec.isNew || rec.hasInvestmentDeclaration === false ? <Badge status="draft">Not declared yet</Badge> : <Badge status="submitted">Declared</Badge>}
        <Badge status={rec.proofStatus ?? 'pending'}>Proofs: {rec.proofStatus ?? 'pending'}</Badge>
        {!rec.isNew && <span className="text-gray-500">Monthly TDS <b className="text-gray-900">{money(rec.monthlyTDS)}</b></span>}
        {rec.updatedAt && <span className="text-gray-400">Updated {fmtDateTime(rec.updatedAt)}</span>}
      </div>

      <div className="overflow-x-auto -mx-1 px-1"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === 'declare' && <div className="space-y-3">
        {result && <CompareResult result={result} />}
        <DeclarationForm key={`${fy}-${rec._id ?? 'new'}-${rec.updatedAt ?? ''}`} record={rec} financialYear={fy} notify={notify} onSaved={onSaved} onDeleted={onDeleted} />
      </div>}
      {tab === 'proofs' && <ProofStatus record={rec} />}
      {tab === 'compute' && <div className="space-y-3">
        {result && <CompareResult result={result} />}
        <Computation record={rec} />
      </div>}
      {tab === 'hra' && <HraPanel employeeId={employeeId} financialYear={fy} />}
      {tab === 'report' && <TaxReportPanel financialYear={fy} notify={notify} />}
    </>}</Async>
  </div>;
}
