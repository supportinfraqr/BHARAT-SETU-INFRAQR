"use client";

import { Lock } from 'lucide-react';
import EnterpriseDataTable, { type DataColumn } from '@/components/worker/EnterpriseDataTable';
import { useEmployer } from '@/contexts/EmployerContext';
import type { EmployerRoute } from '@/types/portal';

const columns: DataColumn<EmployerRoute>[] = [
  { id:'name', header:'Transport', value:row => row.name, render:row => <div><strong className="text-gray-900">{row.name}</strong><p className="font-mono text-[10px] text-gray-400">{row.reference}</p></div> },
  { id:'vehicle', header:'Vehicle', value:row => row.vehicle },
  { id:'route', header:'Route', value:row => row.route },
  { id:'workers', header:'Assigned workers', value:row => row.workers },
  { id:'shifts', header:'Shifts', value:row => row.shifts },
  { id:'created', header:'Created', value:row => row.createdAt },
  { id:'status', header:'Status', value:row => row.status, render:row => <span className={row.status === 'Active' ? 'text-green-700' : 'text-orange-700'}>{row.status}</span> },
];

export default function EmployerAdminTransportPage() {
  const { employer } = useEmployer();
  if (!employer.canAccessAdmin) return <section className="bg-white border border-gray-200 rounded-2xl p-10 text-center"><Lock size={32} className="mx-auto text-gray-300"/><h1 className="mt-4 text-xl font-bold">Admin access required</h1><p className="text-sm text-gray-500 mt-2">Your account does not hold the Employer administration permission.</p></section>;
  return <div className="space-y-6"><header><h2 className="text-lg font-semibold text-gray-900">Transport Management</h2><p className="text-sm text-gray-500 mt-1">Crew transport routes and assignments across your workforce.</p></header><EnterpriseDataTable title="Transport routes" rows={employer.routes} columns={columns} rowKey={row => row.id} filename="transport-routes"/></div>;
}
