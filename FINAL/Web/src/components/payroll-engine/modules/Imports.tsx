"use client";

/**
 * Imports — legacy controller/payroll/payrollImport.js
 *   one-time earnings & deductions: preview (multipart `file` + month/year) -> confirm -> view per period -> cancel draft
 *   salary revision bulk import:    preview (multipart `file`) -> confirm (per-row auto approve/implement) -> view -> cancel draft
 * Templates are generated client-side with the exact headers the legacy parser accepts.
 */

import { useState } from 'react';
import { pe } from '@/lib/payroll-engine/api';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Tabs, useEmployees, useLoad } from '../ui';
import OneTimeImport from './Imports/OneTimeImport';
import SalaryRevisionImport from './Imports/SalaryRevisionImport';
import type { ComponentCatalog } from './Imports/templates';

const TABS = [
  { key: 'oneTime', label: 'One-time earnings & deductions' },
  { key: 'revision', label: 'Salary revisions' },
];

export default function Imports({ notify, navigate, params }: ModuleProps) {
  const [tab, setTab] = useState(params.tab === 'revision' ? 'revision' : 'oneTime');
  const employees = useEmployees();
  // Org salary components feed the template reference sheets / revision component columns (optional).
  const components = useLoad(() => pe.get<{ components: ComponentCatalog }>('salaryComponents').then(d => d?.components ?? null).catch(() => null), []);

  return <div className="space-y-4">
    <Tabs tabs={TABS} active={tab} onChange={setTab} />
    {tab === 'oneTime'
      ? <OneTimeImport notify={notify} employees={employees.data ?? []} catalog={components.data} />
      : <SalaryRevisionImport notify={notify} navigate={navigate} employees={employees.data ?? []} catalog={components.data} />}
  </div>;
}
