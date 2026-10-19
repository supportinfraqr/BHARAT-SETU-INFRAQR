/** PREVIEW HARNESS mock of GET /api/employer/attendance/records?month=YYYY-MM[&bssId=] */
import { NextResponse, type NextRequest } from 'next/server';
import { isoDate, monthRecords } from '@/lib/previewMock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const month = q.get('month') || isoDate(new Date()).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
  const bssId = q.get('bssId');
  const data = monthRecords(month).filter(r => !bssId || r.bssId === bssId);
  return NextResponse.json({ data, month, total: data.length }, { headers: { 'Cache-Control': 'no-store' } });
}
