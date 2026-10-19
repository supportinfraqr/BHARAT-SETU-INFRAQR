/** PREVIEW HARNESS mock of GET /api/employer/analytics?tab=&period=&siteId=&contractorId=&from=&to= */
import { NextResponse, type NextRequest } from 'next/server';
import { mockEmployer } from '@/data/employer';
import { GRIEVANCES, countBy, isoDate, liveSnapshot, periodRange, recordsBetween, scopedWorkers, trend, type Scope } from '@/lib/previewMock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tab = q.get('tab') || 'overview';
  const period = q.get('period') || 'month';
  const scope: Scope = { siteId: q.get('siteId'), contractorId: q.get('contractorId') };
  const e = mockEmployer;
  const inScope = <T extends { siteId?: string; contractorId?: string }>(rows: T[]) =>
    rows.filter(r => (!scope.siteId || r.siteId === scope.siteId) && (!scope.contractorId || r.contractorId === scope.contractorId));
  const ws = scopedWorkers(scope);
  const siteNames = new Set(ws.map(w => w.site));
  const contractorNames = new Set(ws.map(w => w.contractor));

  if (tab === 'live' || period === 'live') {
    return ok({ tab: 'live', ...liveSnapshot(scope) });
  }

  const { from, to, days } = periodRange(period, q.get('from'), q.get('to'));
  const records = recordsBetween(from, to, scope);
  const isPresent = (c: string) => c === 'PRESENT' || c === 'LATE' || c === 'HALF_DAY';

  switch (tab) {
    case 'overview': {
      const today = isoDate(new Date());
      const live = liveSnapshot(scope);
      const todayRecs = recordsBetween(new Date(`${today}T00:00:00`), new Date(`${today}T00:00:00`), scope);
      const payroll = (e.payroll?.records ?? []).filter(r => siteNames.has(r.site) && (!r.contractor || contractorNames.has(r.contractor)));
      const docs = e.workerDocuments.filter(d => siteNames.has(d.site));
      const present = records.filter(r => isPresent(r.statusCode)).length;
      const kpis = {
        workers: ws.length,
        activeSites: new Set(ws.map(w => w.siteId)).size,
        contractors: contractorNames.size,
        attendanceRate: records.length ? Math.round((present / records.length) * 100) : 0,
        presentToday: live.today.present,
        absentToday: todayRecs.filter(r => r.statusCode === 'ABSENT').length + todayRecs.filter(r => r.statusCode === 'LEAVE').length,
        payrollProcessed: payroll.filter(r => r.status === 'Verified').reduce((n, r) => n + r.netPay, 0),
        payrollExceptions: payroll.filter(r => r.status === 'Exception' || r.status === 'Returned' || r.matchState === 'Needs Review').length,
        activeGatePasses: e.gatePasses.filter(g => g.status === 'Approved' && siteNames.has(g.site)).length,
        openGrievances: inScope(GRIEVANCES).filter(g => g.status !== 'Resolved').length,
        documentsExpiring: docs.filter(d => d.status === 'Expiring').length,
        period: {
          total: records.length, present,
          absent: records.filter(r => r.statusCode === 'ABSENT').length,
          leave: records.filter(r => r.statusCode === 'LEAVE').length,
        },
      };
      const alerts = [
        ...docs.filter(d => d.status === 'Expiring').map(d => ({ tone: 'orange', label: `${d.document} for ${d.worker} expires ${d.expiry}`, href: '/employer/admin/documents' })),
        ...docs.filter(d => d.status === 'Missing').map(d => ({ tone: 'red', label: `${d.document} missing for ${d.worker}`, href: '/employer/admin/documents' })),
        ...e.sites.filter(s => siteNames.has(s.name) && s.compliance < 90).map(s => ({ tone: s.compliance < 80 ? 'red' : 'orange', label: `${s.name} (${s.state}) compliance at ${s.compliance}%`, href: '/employer/site-overview' })),
      ];
      return ok({ tab, kpis, trend: trend(records, days), alerts });
    }
    case 'attendance': {
      const sources = countBy(records.filter(r => r.source), r => r.source);
      const bySite = [...siteNames].map(site => {
        const rs = records.filter(r => r.site === site);
        const p = rs.filter(r => isPresent(r.statusCode)).length;
        return { site, rate: rs.length ? Math.round((p / rs.length) * 100) : 0, present: p, total: rs.length };
      }).sort((a, b) => b.rate - a.rate);
      const ins = records.filter(r => r.checkIn).map(r => { const [h, m] = r.checkIn!.split(':').map(Number); return h * 60 + m; }).filter(m => m < 12 * 60);
      const avg = ins.length ? Math.round(ins.reduce((a, b) => a + b, 0) / ins.length) : 0;
      return ok({
        tab, trend: trend(records, days), sourceMix: sources.map(s => ({ source: s.label, value: s.value })), bySite,
        geofenceExceptions: records.filter(r => r.geofenceOk === false).length,
        avgCheckIn: ins.length ? `${String(Math.floor(avg / 60)).padStart(2, '0')}:${String(avg % 60).padStart(2, '0')}` : '',
        totalRecords: records.length,
      });
    }
    case 'workforce': {
      const bands: Array<[string, number, number]> = [['18–24', 18, 24], ['25–34', 25, 34], ['35–44', 35, 44], ['45+', 45, 200]];
      const docs = e.workerDocuments.filter(d => siteNames.has(d.site));
      const fromIso = isoDate(from);
      return ok({
        tab, total: ws.length,
        verified: ws.filter(w => w.verified).length, unverified: ws.filter(w => !w.verified).length,
        joiners: ws.filter(w => w.doj >= fromIso).length, exits: ws.filter(w => w.status === 'Inactive').length,
        bySite: countBy(ws, w => w.site).map(r => ({ site: r.label, value: r.value })),
        byContractor: countBy(ws, w => w.contractor).map(r => ({ contractor: r.label, value: r.value })),
        gender: countBy(ws, w => w.gender),
        ageBands: bands.map(([label, lo, hi]) => ({ label, value: ws.filter(w => (w.age ?? 0) >= lo && (w.age ?? 0) <= hi).length })),
        bloodGroup: countBy(ws, w => w.bloodGroup),
        documents: {
          valid: docs.filter(d => d.status === 'Verified').length,
          expiring: docs.filter(d => d.status === 'Expiring').length,
          missing: docs.filter(d => ['Missing', 'Pending', 'Rejected'].includes(d.status)).length,
        },
      });
    }
    case 'compliance': {
      const reports = inScope(e.complianceReports);
      const bySite = [...new Set(reports.map(r => r.site))].map(site => {
        const rs = reports.filter(r => r.site === site);
        return { site, score: Math.round(rs.reduce((n, r) => n + r.score, 0) / rs.length) };
      }).sort((a, b) => a.score - b.score);
      return ok({
        tab, bySite, reports: reports.length,
        statusMix: ['Compliant', 'Pending', 'Non-compliant'].map(label => ({ label, value: reports.filter(r => r.status === label).length })),
      });
    }
    case 'contractors': {
      return ok({
        tab,
        contractors: e.contractors.filter(c => contractorNames.has(c.name)).map(c => ({
          contractor: c.name, workers: ws.filter(w => w.contractorId === c.id).length,
          sites: new Set(ws.filter(w => w.contractorId === c.id).map(w => w.siteId)).size,
        })),
      });
    }
    case 'access': {
      const passes = e.gatePasses.filter(g => siteNames.has(g.site));
      const present = records.filter(r => isPresent(r.statusCode)).length;
      const deny = Math.max(1, Math.round(present * 0.03));
      return ok({
        tab, passes: passes.length,
        passStatusMix: ['Approved', 'Pending', 'Rejected'].map(label => ({ label, value: passes.filter(p => p.status === label).length })),
        scans: { allow: present * 2, deny, total: present * 2 + deny },
      });
    }
    case 'grievances': {
      const gs = inScope(GRIEVANCES);
      const resolved = gs.filter(g => g.resolvedHours != null);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return ok({
        tab, open: gs.filter(g => g.status !== 'Resolved').length, total: gs.length,
        byStatus: ['Resolved', 'In Progress', 'Open', 'Reopened'].map(label => ({ label, value: gs.filter(g => g.status === label).length })),
        byCategory: countBy(gs, g => g.category),
        avgResolutionHours: resolved.length ? Math.round(resolved.reduce((n, g) => n + (g.resolvedHours ?? 0), 0) / resolved.length) : 0,
        overdue: gs.filter(g => g.status !== 'Resolved' && g.raisedAt < isoDate(weekAgo)).length,
      });
    }
    default:
      return NextResponse.json({ error: `Unknown analytics tab "${tab}".` }, { status: 400 });
  }
}

function ok(data: Record<string, unknown>) {
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}
