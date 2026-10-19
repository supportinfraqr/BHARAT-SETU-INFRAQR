/** PREVIEW HARNESS mock of GET /api/employer/licenses */
import { NextResponse } from 'next/server';
import type { PartyLicenses } from '@/types/portal';

export const dynamic = 'force-dynamic';

const items: PartyLicenses['items'] = [
  { id: 'lic-1', name: 'Factory Licence (Factories Act, 1948)', authority: 'Directorate of Industrial Safety & Health, Haryana', state: 'Haryana', site: 'Factory Unit 2', status: 'Uploaded', number: 'HR/FL/GGN/2022/4471', validTo: '2027-03-31' },
  { id: 'lic-2', name: 'CLRA Principal Employer Registration', authority: 'Labour Department, Maharashtra', state: 'Maharashtra', site: 'Chakan Plant', status: 'Uploaded', number: 'MH/CLRA/PE/2021/9932', validTo: null },
  { id: 'lic-3', name: 'Shops & Establishments Registration', authority: 'Labour Department, Uttar Pradesh', state: 'Uttar Pradesh', site: 'Office Noida 136', status: 'Uploaded', number: 'UPSE/GBN/2023/118204', validTo: '2028-03-31' },
  { id: 'lic-4', name: 'Fire NOC', authority: 'Karnataka State Fire & Emergency Services', state: 'Karnataka', site: 'Whitefield Warehouse', status: 'Pending', validTo: null },
  { id: 'lic-5', name: 'CLRA Principal Employer Registration', authority: 'Labour Department, Karnataka', state: 'Karnataka', site: 'Whitefield Warehouse', status: 'Pending', validTo: null },
  { id: 'lic-6', name: 'Pollution Control Consent to Operate', authority: 'Haryana State Pollution Control Board', state: 'Haryana', site: 'Factory Unit 2', status: 'Expiring', number: 'HSPCB/CTO/2021/7781', validTo: '2026-11-30' },
];

export async function GET() {
  const pending = items.filter(i => i.status === 'Pending').length;
  const data: PartyLicenses = { total: items.length, uploaded: items.filter(i => i.status === 'Uploaded' || i.status === 'Expiring').length, pending, items };
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}
