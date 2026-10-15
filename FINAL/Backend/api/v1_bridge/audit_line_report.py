"""Labour & Contractor Compliance Audit — line-item report (server-rendered).

Replaces the previous branded compliance/audit report HTML with the 31-area /
208-line-item "Process – Audit" report. Rendering is done in Python (WeasyPrint
does not run JS), so the same HTML serves both the on-screen view and the PDF.

Data model (``audit_report_lines.json``)::

    SECTIONS = [ {id, title, objective, risk, items:[{step,param,verify,action,risk}]} ]

Line-item status/observation are supplied per line key ``"<area>.<item>"`` (e.g.
``"3.12"``); anything not supplied defaults to "Pending".
"""

# ruff: noqa: F401,F403
import html as _html
import json
import os

from .common import *  # noqa: F401,F403

_DATA_PATH = os.path.join(os.path.dirname(__file__), "audit_report_lines.json")
with open(_DATA_PATH, encoding="utf-8") as _fh:
    SECTIONS = json.load(_fh)

STATUS_OPTIONS = ["Complied", "Partially Complied", "Non-Complied", "Document Not Available"]

_STATUS_CLASS = {
    "Complied": "ok",
    "Partially Complied": "warn",
    "Non-Complied": "bad",
    "Document Not Available": "na",
    "Pending": "pending",
}

# static (from the Process – Audit spec) — rendered verbatim in the report
_AI_ACTIONS = [
    ("Collect", "Gather document / register / challan / return from contractor or HR repository."),
    ("Extract", "OCR and read key fields (names, numbers, dates, amounts)."),
    ("Validate", "Check format, validity, signature, seal, date ranges and statutory formatting."),
    ("Compare", "Cross-match data across two or more registers / records."),
    ("Calculate", "Verify wages, deductions, PF / ESI contributions, OT, bonus and net pay."),
    ("Reconcile", "Match totals across Wage Register, ECR, Challan and Bank Transfer Sheet."),
    ("Check", "Perform a binary rule check (e.g., age >= 18, no minor employed)."),
    ("Flag", "Mark missing, mismatched, delayed, expired or non-compliant items."),
    ("Score", "Assign Complied / Partially Complied / Non-Complied / Document Not Available."),
    ("Report", "Generate observation, remark, risk rating and recommended action."),
]
_GLOBAL_PARAMS = [
    ("Identity", "Employee name, father's name, DOB, Aadhaar, PAN, UAN, ESIC number, bank account."),
    ("Date", "Agreement start/end, PO validity, licence validity, joining/resignation, wage period, challan payment date."),
    ("Financial", "Basic, HRA, allowances, bonus, gross wages, PF, ESI, PT, LWF, advance, fine, OT, net pay."),
    ("Statutory", "PF code, ESIC code, TRRN, ECR, Labour Licence No., Form XIII / XIV / VII / D, POSH, Child Labour Policy."),
    ("Cross-Verification", "Workman Register ↔ Aadhaar ↔ Personal File ↔ Wage Register ↔ Muster Roll ↔ Payslip ↔ Bank Sheet ↔ PF/ESI Challan & ECR."),
]
_STATUS_DEFS = [
    ("Complied", "All mandatory checks passed and supporting evidence is available."),
    ("Partially Complied", "Minor gaps — missing acknowledgement, small mismatch, delayed but paid."),
    ("Non-Complied", "Mandatory document missing / invalid, underpayment, under-age worker, PF or ESI not deposited."),
    ("Document Not Available", "Required document, register or return was not produced during audit."),
]
_RISK_DEFS = [
    ("High", "Child labour, no labour licence, PF/ESI non-deposit, minimum wage violation, expired agreement or PO, no POSH policy."),
    ("Medium", "Missing signatures, late licence renewal, minor wage/attendance mismatch, missing employee acknowledgements."),
    ("Low", "Formatting issues, holiday list not displayed, minor date typo, optional document missing."),
    ("Critical", "Employment of a person below 18 years — immediate stop-work and remediation required."),
]
_ACTION_PLAN = [
    ("Obtain valid labour licence", "Contractor", "Immediate", "High"),
    ("Deposit pending PF / ESI contributions", "Contractor", "7 days", "High"),
    ("Correct Wage Register and reconcile with Muster Roll", "Contractor / HR", "15 days", "High"),
    ("Conduct POSH awareness training and file annual return", "Principal Employer", "30 days", "Medium"),
    ("Display updated holiday list at workplace", "Contractor", "15 days", "Low"),
]
_RULE_LOGIC = [
    ("Date Rule", "If end date < audit date → Expired / High Risk"),
    ("Manpower Rule", "If actual manpower > licence limit → Non-Complied / High Risk"),
    ("Age Rule", "If age < 18 years → Non-Complied / Critical"),
    ("Wage Rule", "If wage < minimum wage → Non-Complied / High Risk"),
    ("PF / ESI Rule", "If challan not deposited → Non-Complied / High Risk"),
    ("Mismatch Rule", "If attendance / wage / name mismatch → Partially Complied / Medium Risk"),
    ("Signature Rule", "If signature or seal missing → Partially Complied / Medium Risk"),
    ("Document Rule", "If mandatory document not available → Document Not Available / High Risk"),
]
_SITE_LINKS = [
    ("ESIC", "https://esic.gov.in/"),
    ("EPF", "https://unifiedportal-emp.epfindia.gov.in/epfo/"),
    ("TRRN", "https://unifiedportal-emp.epfindia.gov.in/publicPortal/no-auth/misReport/home/loadSearchTrrnHome"),
    ("EPF PASSBOOK", "https://passbook.epfindia.gov.in/MemberPassBook/login"),
    ("UAN LOGIN", "https://unifiedportal-mem.epfindia.gov.in/"),
]


def _e(v):
    return _html.escape(str(v if v not in (None, "") else "—"))


def _risk_badge(risk):
    r = (risk or "").strip()
    cls = {"High": "r-high", "Critical": "r-crit", "Medium": "r-med", "Low": "r-low"}.get(r, "r-low")
    return f"<span class='rdot {cls}'>{_e(r or '—')}</span>"


def total_line_items():
    return sum(len(s["items"]) for s in SECTIONS)


def _counts(status_by_line):
    c = {"Complied": 0, "Partially Complied": 0, "Non-Complied": 0,
         "Document Not Available": 0, "Pending": 0}
    risk = {"High": 0, "Medium": 0, "Low": 0}
    for sec in SECTIONS:
        for idx, it in enumerate(sec["items"], 1):
            key = f"{sec['id']}.{idx}"
            st = (status_by_line or {}).get(key) or "Pending"
            if st not in c:
                st = "Pending"
            c[st] += 1
            if st in ("Non-Complied", "Document Not Available", "Partially Complied"):
                r = (it.get("risk") or "Low").strip()
                if r in risk:
                    risk[r] += 1
                elif r == "Critical":
                    risk["High"] += 1
    return c, risk


def _status_badge(status):
    st = status or "Pending"
    cls = _STATUS_CLASS.get(st, "pending")
    return f"<span class='badge {cls}'>{_e(st)}</span>"


def _control_sheet(meta):
    rows = [
        ("Audit Report No.", meta.get("reportNo")),
        ("Principal Employer", meta.get("employer")),
        ("Contractor", meta.get("contractor")),
        ("Site / Location", meta.get("site")),
        ("Audit Period", meta.get("period")),
        ("Financial Year", meta.get("fy")),
        ("Audit Date", meta.get("auditDate")),
        ("Auditor", meta.get("auditor") or "BSS AI Audit Engine + Human Reviewer"),
    ]
    return "".join(
        f"<tr><td class='k'>{_e(k)}</td><td>{_e(v)}</td></tr>" for k, v in rows
    )


def _matrix(status_by_line, obs_by_line):
    blocks = []
    for sec in SECTIONS:
        rows = []
        for idx, it in enumerate(sec["items"], 1):
            key = f"{sec['id']}.{idx}"
            st = (status_by_line or {}).get(key) or "Pending"
            obs = (obs_by_line or {}).get(key) or ""
            rows.append(
                "<tr>"
                f"<td class='li'>{key}</td>"
                f"<td class='step'>{_e(it.get('step'))}</td>"
                f"<td class='param'>{_e(it.get('param'))}</td>"
                f"<td class='verify'>{_e(it.get('verify'))}</td>"
                f"<td class='act'>{_e(it.get('action'))}</td>"
                f"<td class='risk'>{_risk_badge(it.get('risk'))}</td>"
                f"<td class='status'>{_status_badge(st)}</td>"
                f"<td class='obs'>{_e(obs)}</td>"
                "</tr>"
            )
        blocks.append(
            f"<section class='area' id='a{sec['id']}'><h2><span class='num'>{sec['id']:02d}</span>{_e(sec['title'])}"
            f"<span class='sechint'>{len(sec['items'])} line items · Risk: {_e(sec['risk'])}</span></h2>"
            f"<p class='objective'><b>Objective:</b> {_e(sec['objective'])}</p>"
            "<table class='lines'><thead><tr>"
            "<th>#</th><th>Audit Step / Point</th><th>Parameter Verified</th>"
            "<th>Verification Point</th><th>AI Action</th><th>Risk</th>"
            "<th>Compliance Status</th><th>Observation</th>"
            f"</tr></thead><tbody>{''.join(rows)}</tbody></table></section>"
        )
    return "".join(blocks)


def _observations(status_by_line):
    items = []
    for sec in SECTIONS:
        for idx, it in enumerate(sec["items"], 1):
            key = f"{sec['id']}.{idx}"
            st = (status_by_line or {}).get(key)
            if st in ("Non-Complied", "Document Not Available", "Partially Complied"):
                items.append(f"<li><b>{_e(sec['title'])}</b> — {_e(it.get('step'))} "
                             f"<span class='tag {_STATUS_CLASS.get(st,'pending')}'>{_e(st)}</span></li>")
    return "<ul class='obslist'>" + "".join(items) + "</ul>" if items else \
        "<p class='muted'>No exceptions recorded. Set statuses on the line items to populate this section.</p>"


CSS = """
@page { size: A4 landscape; margin: 10mm 10mm; }
* { box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#0f172a; font-size:9px; line-height:1.4; margin:0; }
.page { padding: 4px 2px; }
.brand { display:table; width:100%; border-bottom:3px solid #073B67; padding-bottom:8px; margin-bottom:10px; }
.brand .l { display:table-cell; vertical-align:middle; }
.brand h1 { margin:0; font-size:18px; color:#073B67; }
.brand p { margin:2px 0 0; color:#64748b; font-size:10px; text-transform:uppercase; letter-spacing:.5px; }
.brand .r { display:table-cell; text-align:right; vertical-align:middle; color:#64748b; font-size:9px; }
h2 { font-size:12px; color:#073B67; margin:16px 0 6px; border-bottom:1px solid #dbe3ee; padding-bottom:3px; page-break-after:avoid; }
h2 .num { display:inline-block; min-width:22px; background:#073B67; color:#fff; border-radius:4px; text-align:center; margin-right:6px; font-size:11px; }
h2 .sechint { float:right; color:#94a3b8; font-size:9px; font-weight:400; }
h3 { font-size:11px; color:#073B67; margin:14px 0 5px; }
p { margin:4px 0; }
table { border-collapse:collapse; width:100%; }
.ctrl td, .kv td { border:1px solid #e2e8f0; padding:4px 7px; }
.ctrl td.k, .kv td.k { background:#f8fafc; color:#475569; width:22%; font-weight:600; }
.kpi { width:100%; margin:6px 0 10px; }
.kpi td { border:1px solid #e2e8f0; padding:8px 10px; text-align:center; width:12.5%; }
.kpi .n { display:block; font-size:16px; font-weight:800; color:#073B67; }
.kpi .t { color:#64748b; font-size:8px; text-transform:uppercase; letter-spacing:.4px; }
.objective { color:#475569; font-size:9px; }
table.lines { margin:4px 0 10px; }
table.lines th, table.lines td { border:1px solid #dbe3ee; padding:3px 5px; vertical-align:top; font-size:8.4px; }
table.lines th { background:#073B67; color:#fff; text-align:left; font-weight:600; }
table.lines td.li { text-align:center; color:#475569; width:28px; }
table.lines td.status { width:96px; }
table.lines td.risk { width:64px; }
table.lines tbody tr:nth-child(even) { background:#f8fafc; }
.area { page-break-inside:auto; }
.area table.lines tr { page-break-inside:avoid; }
.badge { display:inline-block; padding:1px 6px; border-radius:99px; font-weight:700; font-size:8px; border:1px solid currentColor; }
.ok { color:#15803d; } .warn { color:#b45309; } .bad { color:#b91c1c; } .na { color:#6b7280; } .pending { color:#94a3b8; }
.rdot { font-weight:700; }
.r-high { color:#b91c1c; } .r-crit { color:#7f1d1d; } .r-med { color:#b45309; } .r-low { color:#15803d; }
.tag { font-weight:700; font-size:8px; }
ul.obslist { margin:4px 0 0 16px; padding:0; } ul.obslist li { margin:2px 0; }
.muted { color:#94a3b8; }
.foot { margin-top:16px; padding-top:8px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:8px; }
.links a { color:#1d4ed8; }
"""


def _audit_item_badge(status):
    st = (status or "pending").strip().lower()
    cls = {"passed": "ok", "failed": "bad", "review": "warn", "partial": "warn",
           "pending": "pending", "unavailable": "na", "error": "bad"}.get(st, "pending")
    label = {"passed": "Passed", "failed": "Failed", "review": "Review", "partial": "Partial",
             "pending": "Pending", "unavailable": "No AI", "error": "Error"}.get(st, st or "Pending")
    return f"<span class='badge {cls}'>{_e(label)}</span>"


def build_audit_items_html(items):
    """Render every audited item — grouped by kind (per register/document vs
    global-level contracts such as the signed agreement & purchase order)."""
    items = [it for it in (items or []) if it]
    if not items:
        return ("<p class='muted'>No audited documents or global items recorded for "
                "this scope yet.</p>")
    groups = {}
    for it in items:
        groups.setdefault(it.get("group") or "Documents", []).append(it)
    blocks = []
    for group, rows in groups.items():
        trs = []
        for it in rows:
            findings = [str(x) for x in (it.get("findings") or []) if str(x).strip()]
            fhtml = ("<ul class='obslist'>" + "".join(f"<li>{_e(x)}</li>" for x in findings) + "</ul>"
                     if findings else "<span class='muted'>—</span>")
            obs = _e(it.get("summary") or "")
            trs.append(
                "<tr>"
                f"<td class='step'>{_e(it.get('kind'))}</td>"
                f"<td class='param'>{_e(it.get('name'))}</td>"
                f"<td class='status'>{_audit_item_badge(it.get('status'))}</td>"
                f"<td class='obs'>{obs}{fhtml}</td>"
                "</tr>"
            )
        blocks.append(
            f"<h3>{_e(group)}</h3>"
            "<table class='lines'><thead><tr><th>Item</th><th>Document / Source</th>"
            "<th>AI Status</th><th>Findings / Audit Steps</th></tr></thead>"
            f"<tbody>{''.join(trs)}</tbody></table>"
        )
    return "".join(blocks)


def build_line_item_report_html(meta, status_by_line=None, obs_by_line=None, audit_items=None):
    """Return the full line-item compliance audit report HTML."""
    meta = meta or {}
    counts, risk = _counts(status_by_line)
    total = total_line_items()
    overall = "Needs attention" if counts["Non-Complied"] or counts["Document Not Available"] else \
        ("Passed with observations" if counts["Partially Complied"] else "Passed")
    nav = " · ".join(f"<a href='#a{s['id']}'>{s['id']:02d} {_e(s['title'])}</a>" for s in SECTIONS)
    actions = "".join(f"<tr><td>{_e(a)}</td><td>{_e(m)}</td></tr>" for a, m in _AI_ACTIONS)
    params = "".join(f"<tr><td class='k'>{_e(g)}</td><td>{_e(f)}</td></tr>" for g, f in _GLOBAL_PARAMS)
    sdefs = "".join(f"<tr><td>{_e(s)}</td><td>{_e(d)}</td></tr>" for s, d in _STATUS_DEFS)
    rdefs = "".join(f"<tr><td>{_e(r)}</td><td>{_e(d)}</td></tr>" for r, d in _RISK_DEFS)
    aplan = "".join(f"<tr><td>{_e(a)}</td><td>{_e(o)}</td><td>{_e(t)}</td><td>{_e(p)}</td></tr>" for a, o, t, p in _ACTION_PLAN)
    rules = "".join(f"<tr><td class='k'>{_e(r)}</td><td>{_e(d)}</td></tr>" for r, d in _RULE_LOGIC)
    links = " ".join(f"<a href='{_e(u)}'>{_e(n)}</a>" for n, u in _SITE_LINKS)
    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>Labour &amp; Contractor Compliance Audit — Line-Item Report</title>
<style>{CSS}</style></head><body><div class="page">
  <div class="brand"><div class="l"><h1>Bharat Shram Setu</h1>
    <p>AI Labour &amp; Contractor Compliance Audit — Line-Item Report</p></div>
    <div class="r">One Nation · One ID · One Platform<br/>{_e(meta.get('reportNo'))}</div></div>

  <h2><span class="num">01</span>Report Control Sheet</h2>
  <table class="ctrl">{_control_sheet(meta)}</table>

  <h2><span class="num">02</span>Executive Summary</h2>
  <table class="kpi"><tr>
    <td><span class="n">{total}</span><span class="t">Line Items</span></td>
    <td><span class="n">{counts['Complied']}</span><span class="t">Complied</span></td>
    <td><span class="n">{counts['Partially Complied']}</span><span class="t">Partially Complied</span></td>
    <td><span class="n">{counts['Non-Complied']}</span><span class="t">Non-Complied</span></td>
    <td><span class="n">{counts['Document Not Available']}</span><span class="t">Document N/A</span></td>
    <td><span class="n">{counts['Pending']}</span><span class="t">Pending</span></td>
    <td><span class="n">{risk['High']}</span><span class="t">High Risk</span></td>
    <td><span class="n">{risk['Medium']}</span><span class="t">Med Risk</span></td>
  </tr></table>
  <p><b>Overall risk:</b> {_e(meta.get('overallRisk') or overall)} &nbsp;·&nbsp;
     <b>Applicable laws:</b> {_e(meta.get('applicableLaws') or 'PF, ESI, Bonus, Gratuity, Labour Laws, POSH, Child Labour, Equal Remuneration, LWF, PT')}</p>

  <h3>Quick navigation — 31 audit areas</h3>
  <p class="links" style="line-height:1.9">{nav}</p>

  <h3>AI audit methodology</h3>
  <table class="kv"><tr><td class="k" style="width:14%">AI Action</td><td class="k">Meaning</td></tr>{actions}</table>
  <table class="kv"><tr><td class="k" style="width:14%">Parameter group</td><td class="k">Fields verified</td></tr>{params}</table>

  <h2><span class="num">05</span>Line-Item Audit Matrix — All 31 Audit Areas</h2>
  <div id="matrix">{_matrix(status_by_line, obs_by_line)}</div>

  <h2><span class="num">06</span>Audited Documents, Registers &amp; Global Contracts</h2>
  <p class="objective"><b>Two kinds of audited items:</b> per uploaded register/document, and
     global-level items such as the signed agreement copy and purchase/work order — each verified
     against its own audit step list.</p>
  {build_audit_items_html(audit_items)}

  <h2><span class="num">07</span>Compliance Status &amp; Risk Definitions</h2>
  <table class="kv"><tr><td class="k" style="width:20%">Status</td><td class="k">Definition</td></tr>{sdefs}</table>
  <table class="kv"><tr><td class="k" style="width:20%">Risk level</td><td class="k">Typical examples</td></tr>{rdefs}</table>

  <h2><span class="num">08</span>Key Observations &amp; Recommended Actions</h2>
  <h3>Key observations</h3>
  {_observations(status_by_line)}
  <h3>Recommended action plan</h3>
  <table class="lines"><thead><tr><th>Action</th><th>Owner</th><th>Timeline</th><th>Priority</th></tr></thead>
    <tbody>{aplan}</tbody></table>

  <h2><span class="num">09</span>Final AI Audit Rule Logic</h2>
  <table class="kv">{rules}</table>

  <h2><span class="num">10</span>Verification Site Links</h2>
  <p class="links">{links}</p>

  <h2><span class="num">11</span>Certification &amp; Sign-Off</h2>
  <table class="ctrl">
    <tr><td class="k">Prepared By</td><td>{_e(meta.get('auditor') or 'AI Audit Engine + Human Reviewer')}</td>
        <td class="k">Reviewed By</td><td>{_e(meta.get('reviewedBy'))}</td></tr>
    <tr><td class="k">Approved By</td><td>{_e(meta.get('approvedBy'))}</td>
        <td class="k">Date of Sign-Off</td><td>{_e(meta.get('auditDate'))}</td></tr>
  </table>

  <div class="foot">Generated by the BSS line-item audit engine · every audit step expanded from
    <i>Process – Audit</i> · For internal audit and compliance use only; it does not replace statutory filing.</div>
</div></body></html>"""
