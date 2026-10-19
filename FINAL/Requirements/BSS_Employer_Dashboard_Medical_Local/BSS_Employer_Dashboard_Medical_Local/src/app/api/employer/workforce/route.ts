/** PREVIEW HARNESS mock of GET /api/employer/workforce (WorkforceExplorer): filters, facets, summary, paging, ?export=csv */
import { NextResponse, type NextRequest } from 'next/server';
import { mockEmployer } from '@/data/employer';
import { GRIEVANCES, countBy, explorerRows } from '@/lib/previewMock';

export const dynamic = 'force-dynamic';

type Row = ReturnType<typeof explorerRows>[number];
const FILTERS: Array<[string, (r: Row) => string]> = [
  ['state', r => r.state], ['gender', r => r.gender], ['category', r => r.category],
  ['occupation', r => r.occupation], ['employer', r => r.employer], ['contractor', r => r.contractor],
];

function facet(rows: Row[], get: (r: Row) => string) {
  return countBy(rows, get).map(f => ({ value: f.label, label: f.label, count: f.value })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const all = explorerRows();
  const needle = (q.get('q') || '').trim().toLowerCase();
  const rows = all.filter(r => FILTERS.every(([k, get]) => !q.get(k) || get(r) === q.get(k))
    && (!needle || `${r.name} ${r.bssId}`.toLowerCase().includes(needle)));

  if (q.get('export') === 'csv') {
    const cols = Object.keys(all[0] ?? {}) as Array<keyof Row>;
    const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="workforce.csv"' } });
  }

  const page = Math.max(1, Number(q.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get('pageSize')) || 25));
  const names = new Set(rows.map(r => r.name));
  const sites = new Set(rows.map(r => r.site));
  const passes = mockEmployer.gatePasses.filter(g => names.has(g.workerName));
  const grievances = GRIEVANCES.filter(g => sites.has(mockEmployer.sites.find(s => s.id === g.siteId)?.name ?? ''));
  const present = rows.filter(r => r.attendance === 'PRESENT').length;
  const scans = present ? [{ label: 'Allow', value: present * 2 }, { label: 'Deny', value: Math.max(1, Math.round(present * 0.1)) }] : [];
  const activities = mockEmployer.activities;

  const data = {
    total: rows.length, page, pageSize,
    facets: {
      states: facet(all, r => r.state), genders: facet(all, r => r.gender), categories: facet(all, r => r.category),
      occupations: facet(all, r => r.occupation), employers: facet(all, r => r.employer), contractors: facet(all, r => r.contractor),
    },
    summary: {
      byState: countBy(rows, r => r.state), bySite: countBy(rows, r => r.site), byGender: countBy(rows, r => r.gender),
      byCategory: countBy(rows, r => r.category), byOccupation: countBy(rows, r => r.occupation),
      byEmployer: countBy(rows, r => r.employer), byContractor: countBy(rows, r => r.contractor),
      attendance: countBy(rows, r => r.attendance),
      grievances: countBy(grievances, g => g.status),
      gatePasses: countBy(passes, p => p.status),
      scans,
      activities: {
        worker: countBy(activities.filter(a => a.type === 'worker' || a.type === 'approval'), a => a.type),
        contractor: countBy(activities.filter(a => a.type === 'contractor' || a.type === 'compliance'), a => a.type),
      },
      workerTotal: rows.length, grievanceTotal: grievances.length, gatePassTotal: passes.length,
      scanTotal: scans.reduce((n, s) => n + s.value, 0),
    },
    workers: rows.slice((page - 1) * pageSize, page * pageSize),
  };
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}
