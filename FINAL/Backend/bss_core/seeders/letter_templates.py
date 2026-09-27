"""All-India default Appointment / Experience letter templates (idempotent).

Admin can edit these and add state-wise variants; an employer picks a template
per site. Resolution order at render time: site's choice → state template →
all-India default (these rows)."""

_STYLE = """
  @page {
    size: A4;
    margin: 10mm 12mm 10mm 12mm;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; font-size: 10px; }
  .page { width:100%; margin:0 auto; }
  .brand { display:table; width:100%; border-bottom:2.5px solid #073B67; padding-bottom:4px; margin-bottom:4px; }
  .brand-left { display:table-cell; vertical-align:middle; width:50px; }
  .brand-logo { height:38px; width:auto; vertical-align:middle; margin-right:8px; }
  .brand-title { display:table-cell; vertical-align:middle; }
  .brand strong { color:#073B67; font-size:15px; letter-spacing:.3px; display:block; }
  .brand span { font-size:8.5px; color:#6b7280; letter-spacing:1.2px; text-transform:uppercase; }
  h1 { text-align:center; color:#073B67; font-size:15px; letter-spacing:1px; margin:8px 0 3px; border-bottom:1.5px double #F47A32; padding-bottom:4px; text-transform:uppercase; }
  .meta { display:table; width:100%; font-size:10px; color:#374151; margin:6px 0 8px; }
  .meta-left { display:table-cell; text-align:left; }
  .meta-right { display:table-cell; text-align:right; }
  h3 { color:#073B67; font-size:11px; margin:8px 0 3px; border-bottom:1px solid #d1d5db; padding-bottom:2px; page-break-after:avoid; }
  p { font-size:10px; line-height:1.4; margin:4px 0; text-align:justify; }
  .kv { width:100%; border-collapse:collapse; font-size:10px; margin:3px 0 6px; page-break-inside:avoid; }
  .kv td { border:1px solid #9aa4b2; padding:3px 6px; vertical-align:top; }
  .kv td:first-child { background:#F0F4FA; color:#073B67; width:34%; font-weight:600; }
  .sign { display:table; width:100%; margin:20px 0 4px; page-break-inside:avoid; }
  .sign-col { display:table-cell; width:33.33%; text-align:center; font-size:9.5px; vertical-align:top; }
  .sign .line { border-top:1px solid #4b5563; width:80%; margin:20px auto 3px; padding-top:3px; font-weight:600; }
  .sign .id { font-size:8.5px; color:#6b7280; font-family:monospace; margin-top:1px; }
  .foot { margin-top:10px; border-top:1px solid #e5e7eb; padding-top:4px; font-size:8.5px; color:#6b7280; text-align:center; }
"""

APPOINTMENT_HTML = f"""<!doctype html><html><head><meta charset="utf-8"/>
<title>{{{{letterTitle}}}} — {{{{workerName}}}}</title><style>{_STYLE}</style></head><body><div class="page">
<div class="brand"><div class="brand-left"><img src="{{{{logoUrl}}}}" alt="Logo" class="brand-logo"/></div><div class="brand-title"><strong>Bharat Shram Setu</strong><span>One Worker · One Identity · One Future</span></div></div>
<h1>{{{{letterTitle}}}}</h1>
<div class="meta"><div class="meta-left">Ref No.: {{{{refNo}}}}</div><div class="meta-right">Date: {{{{issueDate}}}}</div></div>
<p>Dear {{{{workerName}}}},</p>
<p>With reference to your engagement, we are pleased to appoint you on the terms set out below, at the
project site of <strong>{{{{employerName}}}}</strong> through <strong>{{{{contractorName}}}}</strong>.</p>
<h3>A. Employer &amp; Site</h3>
<table class="kv">
  <tr><td>Contractor / Service Provider</td><td>{{{{contractorName}}}} ({{{{contractorBssId}}}})<br/>{{{{contractorAddress}}}}</td></tr>
  <tr><td>Principal Employer</td><td>{{{{employerName}}}} ({{{{employerBssId}}}})</td></tr>
  <tr><td>Site</td><td>{{{{siteName}}}}<br/>{{{{siteAddress}}}}</td></tr>
</table>
<h3>B. Worker Particulars &amp; Terms</h3>
<table class="kv">
  <tr><td>Name</td><td>{{{{workerName}}}}</td></tr>
  <tr><td>BSS Worker ID</td><td>{{{{workerBssId}}}}</td></tr>
  <tr><td>Father's Name</td><td>{{{{fatherName}}}}</td></tr>
  <tr><td>Date of Birth</td><td>{{{{dob}}}}</td></tr>
  <tr><td>Gender</td><td>{{{{gender}}}}</td></tr>
  <tr><td>Address</td><td>{{{{address}}}}</td></tr>
  <tr><td>Designation</td><td>{{{{designation}}}}</td></tr>
  <tr><td>Department / Unit</td><td>{{{{department}}}}</td></tr>
  <tr><td>Date of Joining</td><td>{{{{doj}}}}</td></tr>
  <tr><td>Gross Monthly Wage</td><td>{{{{wage}}}}</td></tr>
</table>
{{{{costSheetSection}}}}
<p>Your engagement is subject to applicable labour laws and the terms agreed with the contractor. You shall
follow all site safety rules, use the personal protective equipment provided, complete site induction, and
report any unsafe condition to the site safety officer immediately.</p>
<div class="sign">
  <div class="sign-col"><div class="line">{{{{workerName}}}}</div><div>Worker Signature</div><div class="id">ID: {{{{workerBssId}}}}</div></div>
  <div class="sign-col"><div class="line">{{{{contractorName}}}}</div><div>Contractor Signatory</div><div class="id">ID: {{{{contractorBssId}}}}</div></div>
  <div class="sign-col"><div class="line">{{{{employerName}}}}</div><div>Principal Employer Signatory</div><div class="id">ID: {{{{employerBssId}}}}</div></div>
</div>
<div class="foot">Generated by Bharat Shram Setu · bharatshramsetu.com</div>
</div></body></html>"""

# The experience / releasing letter is the statutory Form XV Service Certificate
# (Rule 77, Contract Labour (Regulation & Abolition) Rules). It deliberately
# carries NO BSS logo, wordmark or branding — only the statutory layout.
EXPERIENCE_STYLE = """
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; font-size: 10px; }
  .page { width:100%; margin:0 auto; }
  .header-block { text-align:center; font-weight:bold; margin-bottom:14px; text-transform:uppercase; line-height:1.4; }
  .header-block .form-title { font-size:14px; letter-spacing:0.5px; }
  .header-block .rule-title { font-size:10px; color:#475569; font-weight:normal; text-transform:none; }
  .header-block .sub-title { font-size:12px; color:#0f172a; margin-top:2px; text-decoration:underline; }
  .field-row { font-size:10px; margin:5px 0; line-height:1.5; border-bottom:1px dotted #94a3b8; padding-bottom:2px; }
  .field-label { font-weight:600; color:#334155; }
  .field-val { color:#0f172a; font-weight:bold; }
  table.xv-table { width:100%; border-collapse:collapse; margin:14px 0 8px 0; font-size:9px; text-align:center; border:1px solid #334155; }
  table.xv-table th, table.xv-table td { border:1px solid #334155; padding:4px 3px; vertical-align:middle; }
  table.xv-table th { background:#f1f5f9; color:#0f172a; font-weight:bold; }
  .sign { display:table; width:100%; margin:26px 0 4px; page-break-inside:avoid; }
  .sign-col { display:table-cell; width:50%; text-align:center; font-size:9px; vertical-align:top; }
  .sign .line { border-top:1px solid #4b5563; width:80%; margin:26px auto 3px; padding-top:3px; font-weight:600; }
  .sign .id { font-size:8.5px; color:#6b7280; font-family:monospace; margin-top:1px; }
  .foot { margin-top:10px; border-top:1px solid #e5e7eb; padding-top:4px; font-size:8.5px; color:#6b7280; text-align:center; }
"""

EXPERIENCE_HTML = f"""<!doctype html><html><head><meta charset="utf-8"/>
<title>Form XV — {{{{workerName}}}}</title><style>{EXPERIENCE_STYLE}</style></head><body><div class="page">
<div class="header-block">
  <div class="form-title">FORM XV</div>
  <div class="rule-title">[See Rule 77]</div>
  <div class="sub-title">Service Certificate</div>
</div>
<div class="field-row"><span class="field-label">Name and address of Contractor:</span><br/><span class="field-val">{{{{contractorName}}}}, {{{{contractorAddress}}}}</span></div>
<div class="field-row"><span class="field-label">Name and address of the establishment in/under which contract is carried on:</span><br/><span class="field-val">{{{{employerName}}}}, {{{{siteAddress}}}}</span></div>
<div class="field-row"><span class="field-label">Nature and location of work:</span> <span class="field-val">{{{{department}}}}, {{{{siteName}}}}</span></div>
<div class="field-row"><span class="field-label">Name and address of the workman:</span> <span class="field-val">{{{{workerName}}}}, {{{{address}}}}</span></div>
<div class="field-row"><span class="field-label">Age or Date of Birth:</span> <span class="field-val">{{{{dob}}}}</span></div>
<div class="field-row"><span class="field-label">Identification Marks:</span> <span class="field-val">{{{{identificationMarks}}}}</span></div>
<div class="field-row"><span class="field-label">Father's / Husband's Name:</span> <span class="field-val">{{{{fatherName}}}}</span></div>
<div class="field-row"><span class="field-label">Name and address of Principal Employer:</span><br/><span class="field-val">{{{{employerName}}}}, {{{{siteAddress}}}}</span></div>
{{{{formXVTable}}}}
<div class="sign">
  <div class="sign-col"><div class="line">{{{{workerName}}}}</div><div>Signature of Workman</div><div class="id">BSS ID: {{{{workerBssId}}}}</div></div>
  <div class="sign-col"><div class="line">{{{{contractorName}}}}</div><div>Signature of Contractor / Authorized Signatory</div><div class="id">BSS ID: {{{{contractorBssId}}}}</div></div>
</div>
<div class="foot">Generated under Central Contract Labour (Regulation &amp; Abolition) Rules, 1971</div>
</div></body></html>"""


def seed():
    from bss_core.models import LetterTemplate
    from bss_core import letter_brand
    created = 0
    for name, kind, html, logo in (
        ("All-India Appointment Letter", "APPOINTMENT", APPOINTMENT_HTML,
         letter_brand.DEFAULT_LOGO_URL),
        # Statutory Form XV: no BSS branding, so no logo.
        ("All-India Form XV Service Certificate (Releasing Letter)", "EXPERIENCE",
         EXPERIENCE_HTML, ""),
    ):
        _, made = LetterTemplate.objects.get_or_create(
            state="", letter_type=kind, name=name,
            defaults={"html": letter_brand.ensure_letter_html(html, kind),
                      "logo_url": logo,
                      "is_active": True})
        created += int(made)
    return created
