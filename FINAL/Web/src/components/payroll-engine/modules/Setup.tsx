"use client";

/** Payroll Setup — statutory compliance, salary components, pay schedule, staff portal, TDS configuration. */

import { useState } from 'react';
import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Tabs } from '../ui';
import Compliance from './Setup/Compliance';
import Components from './Setup/Components';
import Schedule from './Setup/Schedule';
import StaffPortal from './Setup/StaffPortal';
import TdsConfigTab from './Setup/TdsConfig';

const TABS = [
  { key: 'compliance', label: 'Statutory compliance' },
  { key: 'components', label: 'Salary components' },
  { key: 'schedule', label: 'Pay schedule' },
  { key: 'tds', label: 'TDS configuration' },
  { key: 'portal', label: 'Staff portal' },
];

export default function Setup({ notify, navigate, params }: ModuleProps) {
  const [tab, setTab] = useState(() => (TABS.some(t => t.key === params.tab) ? params.tab : 'compliance'));
  return <div className="space-y-4">
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-3">
      <h2 className="text-sm font-semibold text-gray-950">Payroll setup</h2>
      <p className="text-xs text-gray-500 mb-2">Configure these once per organization before running payroll.</p>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
    </div>
    {tab === 'compliance' && <Compliance notify={notify} />}
    {tab === 'components' && <Components notify={notify} />}
    {tab === 'schedule' && <Schedule notify={notify} navigate={navigate} />}
    {tab === 'tds' && <TdsConfigTab notify={notify} />}
    {tab === 'portal' && <StaffPortal notify={notify} />}
  </div>;
}
