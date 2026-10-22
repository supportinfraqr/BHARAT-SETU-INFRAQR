"use client";

import { useContractor } from '@/contexts/ContractorContext';
import MonthlyAudit from './MonthlyAudit';

export default function ContractorMonthlyAudit() {
  const { contractor } = useContractor();
  return <MonthlyAudit
    role="contractor"
    listEndpoint="/api/contractor/audit-jobs"
    sites={contractor.sites.map(s => ({ id: s.id, name: s.name, bssId: s.bssId }))}
    defaultSiteId={contractor.defaultSite?.id}
  />;
}
