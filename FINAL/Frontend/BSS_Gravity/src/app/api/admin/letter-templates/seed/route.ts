import { NextResponse } from 'next/server';
import { apiError, assertRateLimit, assertTrustedMutation } from '@/server/api';
import { requireApiSession } from '@/server/session';
import { getRuntimeConfig } from '@/server/config';
import { UpstreamError, upstreamRequest } from '@/server/http';
import { INDIA_STATES } from '@/data/indiaStates';

export const dynamic = 'force-dynamic';

const FORM_XV_STARTER_HTML = `<!doctype html><html><head><meta charset="utf-8"/><style>
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; }
  .page { width:794px; margin:0 auto; padding:32px 44px; font-size:12px; }
  .header-block { text-align:center; font-weight:bold; margin-bottom:20px; text-transform:uppercase; line-height:1.4; }
  .header-block .form-title { font-size:16px; letter-spacing:0.5px; }
  .header-block .rule-title { font-size:12px; color:#475569; font-weight:normal; text-transform:none; }
  .header-block .sub-title { font-size:14px; color:#0f172a; margin-top:2px; text-decoration:underline; }
  .field-row { font-size:12px; margin:7px 0; line-height:1.6; border-bottom:1px dotted #94a3b8; padding-bottom:3px; display:flex; justify-content:space-between; }
  .field-label { font-weight:600; color:#334155; }
  .field-val { color:#0f172a; font-weight:bold; }
  table.xv-table { width:100%; border-collapse:collapse; margin:20px 0 10px 0; font-size:11px; text-align:center; border:1px solid #334155; }
  table.xv-table th, table.xv-table td { border:1px solid #334155; padding:6px 4px; vertical-align:middle; }
  table.xv-table th { background:#f1f5f9; color:#0f172a; font-weight:bold; }
  table.xv-table tr.col-nums td { background:#e2e8f0; font-weight:600; font-size:10px; color:#475569; }
  .sign { display:flex; justify-content:space-between; gap:12px; margin:46px 0 6px; }
  .sign > div { width:40%; text-align:center; font-size:11px; }
  .sign .line { border-top:1px solid #4b5563; margin-top:40px; padding-top:5px; font-weight:600; }
  .foot { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:10px; color:#6b7280; text-align:center; }
</style></head><body><div class="page">
<div class="header-block">
  <div class="form-title">FORM XV</div>
  <div class="rule-title">[See Rule 77]</div>
  <div class="sub-title">Service Certificate</div>
</div>

<div class="field-row"><span class="field-label">Name and address of Contractor:</span><span class="field-val">{{contractorName}}, {{contractorAddress}}</span></div>
<div class="field-row"><span class="field-label">Name and address of the establishment in/under which contract is carried on:</span><span class="field-val">{{employerName}}, {{siteAddress}}</span></div>
<div class="field-row"><span class="field-label">Nature and location of work:</span><span class="field-val">{{department}}, {{siteName}}</span></div>
<div class="field-row"><span class="field-label">Name and address of the workman:</span><span class="field-val">{{workerName}}, {{address}}</span></div>
<div class="field-row"><span class="field-label">Age or Date of Birth:</span><span class="field-val">{{dob}}</span></div>
<div class="field-row"><span class="field-label">Identification Marks:</span><span class="field-val">{{identificationMarks}}</span></div>
<div class="field-row"><span class="field-label">Father’s / Husband’s Name:</span><span class="field-val">{{fatherName}}</span></div>
<div class="field-row"><span class="field-label">Name and address of Principal Employer:</span><span class="field-val">{{employerName}}, {{siteAddress}}</span></div>

{{formXVTable}}

<div class="sign">
  <div><div class="line">{{workerName}}</div><div>Signature of Workman</div></div>
  <div><div class="line">{{contractorName}}</div><div>Signature of Contractor / Authorized Signatory</div></div>
</div>
<div class="foot">Generated under Central Contract Labour (Regulation &amp; Abolition) Rules · Bharat Shram Setu</div>
</div></body></html>`;

const APPOINTMENT_STARTER_HTML = `<!doctype html><html><head><meta charset="utf-8"/><style>
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; }
  .page { width:794px; margin:0 auto; padding:32px 44px; }
  .brand { display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding-bottom:10px; margin-bottom:6px; }
  .brand img { height:44px; }
  .brand strong { color:#073B67; font-size:18px; display:block; }
  .brand span { font-size:10px; color:#6b7280; letter-spacing:1.6px; text-transform:uppercase; }
  h1 { text-align:center; color:#073B67; font-size:20px; letter-spacing:1.4px; margin:16px 0 4px; border-bottom:2px double #F47A32; padding-bottom:8px; text-transform:uppercase; }
  .meta { display:flex; justify-content:space-between; font-size:12px; color:#374151; margin:10px 0 18px; }
  h3 { color:#073B67; font-size:13px; margin:16px 0 6px; border-bottom:1px solid #d1d5db; padding-bottom:4px; }
  p { font-size:12.5px; line-height:1.65; text-align:justify; }
  .kv { width:100%; border-collapse:collapse; font-size:12.5px; margin:4px 0; }
  .kv td { border:1px solid #9aa4b2; padding:5px 8px; vertical-align:top; }
  .kv td:first-child { background:#F0F4FA; color:#073B67; width:34%; font-weight:600; }
  .sign { display:flex; justify-content:space-between; gap:12px; margin:46px 0 6px; }
  .sign > div { width:30%; text-align:center; font-size:11px; }
  .sign .line { border-top:1px solid #4b5563; margin-top:36px; padding-top:5px; font-weight:600; }
  .sign .id { font-size:10px; color:#6b7280; font-family:monospace; margin-top:2px; }
  .foot { margin-top:18px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:10px; color:#6b7280; text-align:center; }
</style></head><body><div class="page">
<div class="brand"><img src="{{logoUrl}}" alt="logo"/><div><strong>Bharat Shram Setu</strong><span>One Worker · One Identity · One Future</span></div></div>
<h1>{{letterTitle}}</h1>
<div class="meta"><span>Ref No.: {{refNo}}</span><span>Date: {{issueDate}}</span></div>
<p>Dear {{workerName}},</p>
<p>With reference to your engagement, we are pleased to appoint you on the terms set out below, at the project site of <strong>{{employerName}}</strong> through <strong>{{contractorName}}</strong>.</p>
<h3>A. Employer &amp; Site</h3>
<table class="kv"><tr><td>Contractor / Service Provider</td><td>{{contractorName}} ({{contractorBssId}})</td></tr><tr><td>Principal Employer</td><td>{{employerName}} ({{employerBssId}})</td></tr><tr><td>Site</td><td>{{siteName}}</td></tr></table>
<h3>B. Worker Particulars &amp; Cost Structure</h3>
<table class="kv">
  <tr><td>Name</td><td>{{workerName}}</td></tr>
  <tr><td>BSS Worker ID</td><td>{{workerBssId}}</td></tr>
  <tr><td>Date of Joining</td><td>{{doj}}</td></tr>
  <tr><td>Designation</td><td>{{designation}}</td></tr>
  <tr><td>Cost Sheet Attached</td><td>{{costSheetName}} ({{costSheetCode}})</td></tr>
  <tr><td>Gross Monthly Wage</td><td>{{wage}}</td></tr>
  <tr><td>Total Monthly CTC</td><td>{{ctc}}</td></tr>
</table>
<h3>C. Detailed Salary &amp; CTC Breakdown</h3>
{{salaryBreakdownTable}}
<div class="sign">
  <div><div class="line">{{workerName}}</div><div>Worker Signature</div><div class="id">ID: {{workerBssId}}</div></div>
  <div><div class="line">{{contractorName}}</div><div>Contractor Signatory</div><div class="id">ID: {{contractorBssId}}</div></div>
  <div><div class="line">{{employerName}}</div><div>Principal Employer Signatory</div><div class="id">ID: {{employerBssId}}</div></div>
</div>
<div class="foot">Generated by Bharat Shram Setu · bharatshramsetu.com</div>
</div></body></html>`;

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    const session = await requireApiSession('BSS Admin');
    assertRateLimit(`letter-templates-seed:${session.sessionId}`, 10, 60_000);
    const config = getRuntimeConfig();

    const { searchParams } = new URL(request.url);
    const overwrite = searchParams.get('overwrite') === 'true';

    // Fetch existing templates
    const existing = await upstreamRequest<{ rows?: Array<{ id: number; state: string; letterType: string }> }>(
      config.apiBaseUrl,
      '/v1/admin/letter-templates',
      session
    );
    const rows = existing?.rows ?? [];

    if (overwrite && rows.length > 0) {
      for (const t of rows) {
        try {
          await upstreamRequest(config.apiBaseUrl, `/v1/admin/letter-templates/${t.id}`, session, {
            method: 'DELETE',
          });
        } catch {
          // ignore deletion error if already removed
        }
      }
    }

    const currentRows = overwrite ? [] : rows;
    let createdCount = 0;

    for (const st of INDIA_STATES) {
      const hasAppt = currentRows.some(r => r.letterType === 'APPOINTMENT' && (r.state || '').toLowerCase() === st.toLowerCase());
      const hasRel = currentRows.some(r => r.letterType === 'EXPERIENCE' && (r.state || '').toLowerCase() === st.toLowerCase());

      if (!hasAppt) {
        await upstreamRequest(config.apiBaseUrl, '/v1/admin/letter-templates', session, {
          method: 'POST',
          body: JSON.stringify({
            name: `${st} — Appointment Letter`,
            state: st,
            letterType: 'APPOINTMENT',
            html: APPOINTMENT_STARTER_HTML,
            logoUrl: '',
            active: true,
          }),
        });
        createdCount++;
      }

      if (!hasRel) {
        await upstreamRequest(config.apiBaseUrl, '/v1/admin/letter-templates', session, {
          method: 'POST',
          body: JSON.stringify({
            name: `${st} — Form XV Service Certificate (Releasing Letter)`,
            state: st,
            letterType: 'EXPERIENCE',
            html: FORM_XV_STARTER_HTML,
            logoUrl: '',
            active: true,
          }),
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      message: overwrite
        ? `Replaced all templates with statutory Form XV & Appointment defaults across all states (${createdCount} created).`
        : `Seeded missing statutory Form XV & Appointment letter templates across all states (${createdCount} created).`,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return apiError(error, 'Seeding letter templates failed.');
  }
}
