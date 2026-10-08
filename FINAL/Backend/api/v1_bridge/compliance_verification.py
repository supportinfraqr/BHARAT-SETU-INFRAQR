"""Contractor compliance verification report (per submitted package).

Implements the BSS verification framework: a 20-parameter verification matrix
with C1-C8 classification, computed from the submitted master data, plus the
Results-Engine metrics and the register-level AI audit results. Rendered as a
branded HTML document (and PDF via WeasyPrint).
"""

from html import escape as _esc

from .ai_report import _logo_data_uri

C1, C2, C3, C4, C5, C6, C7, C8 = ("C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8")

CLASSIFICATION = [
    ("C1", "Compliant", "Requirement fully satisfied and evidence verified", "No CAPA; retain evidence"),
    ("C2", "Compliant with Observation", "Requirement satisfied but process/documentation improvement noted", "Observation / improvement action where needed"),
    ("C3", "Minor Exception", "Low-impact deviation", "Corrective action; track to closure"),
    ("C4", "Major Exception", "Material deviation requiring action", "RCA + CAPA + closure evidence"),
    ("C5", "Critical Exception", "Serious regulatory, worker, safety, financial or governance exposure", "Immediate correction + RCA + CAPA + effectiveness verification"),
    ("C6", "Pending Verification", "Required data/evidence unavailable or inconclusive", "Obtain evidence / resolve data gap"),
    ("C7", "N/A", "Genuinely not applicable", "Document applicability rationale"),
    ("C8", "Duplicate/Invalid", "Duplicate or invalid data record", "Data correction and integrity control"),
]

_SCORE = {C1: 1.0, C2: 0.9, C3: 0.7, C4: 0.4, C5: 0.0, C6: 0.0, C7: 1.0, C8: 0.0}


def _num(value):
    try:
        return float(str(value).replace(",", "").strip() or 0)
    except (TypeError, ValueError):
        return 0.0


def _txt(row, *keys):
    for key in keys:
        value = str(row.get(key) or "").strip()
        if value:
            return value
    return ""


def _class_kyc(r):
    name, bss = _txt(r, "name"), _txt(r, "bssId")
    if not name and not bss:
        return C5
    if not name:
        return C4
    if not bss:
        return C3
    if _txt(r, "dob") and (_txt(r, "uan") or _txt(r, "esic")):
        return C1
    return C2


def _class_workersite(r):
    return C1 if _txt(r, "site") else C3


def _class_att_elig(r):
    return C1 if _txt(r, "doj") else C6


def _class_attendance(r):
    filled = sum(1 for i in range(1, 32) if str(r.get(f"day{i}") or "").strip())
    if filled == 0:
        return C6
    if filled >= 26:
        return C1
    if filled >= 20:
        return C2
    return C3


def _class_wage(r):
    basic, gross = _num(r.get("basicWages")), _num(r.get("grossWages"))
    if basic > 0 and gross > 0:
        return C1
    if basic > 0 or gross > 0:
        return C2
    return C3


def _class_payroll(r):
    gross, net, ded = _num(r.get("grossWages")), _num(r.get("netSalary")), _num(r.get("totalDeductions"))
    if gross <= 0:
        return C6
    if net <= 0 and ded <= 0:
        return C3
    if abs((gross - ded) - net) <= max(1.0, gross * 0.01):
        return C1
    return C4


def _class_bank(r):
    if _txt(r, "accountNo") and _txt(r, "bankName"):
        return C2  # details present; payment evidence not captured in the master file
    return C3


def _class_pf(r):
    pf = _num(r.get("pfDeductions"))
    if pf > 0:
        return C1 if _txt(r, "uan") else C2
    gross = _num(r.get("grossWages"))
    return C6 if gross <= 0 else C7


def _class_esic(r):
    esic = _num(r.get("esicDeductions"))
    if esic > 0:
        return C1 if _txt(r, "esic") else C2
    gross = _num(r.get("grossWages"))
    return C6 if gross <= 0 else C7


def _class_recon(r):
    return C1 if _txt(r, "site") and _num(r.get("grossWages")) > 0 else C3


# (key, label, population type, classifier) — classifier None = package-level,
# decided by `package_class` (C6 unless a rationale is available).
PARAMETERS = [
    ("agreement", "Agreement / WO validity", "Contractor agreements/WOs", None),
    ("applicability", "Applicability and validity", "Applicable licences/registrations", None),
    ("kyc", "BSS ID, identity and KYC", "Workers", _class_kyc),
    ("appointment", "Appointment / service / exit documents", "Workers", None),
    ("workersite", "Worker-site authorization", "Worker-site assignments", _class_workersite),
    ("gatepass", "Gate pass validity / approval", "Gate passes", None),
    ("atthelig", "Attendance eligibility", "Attendance transactions", _class_att_elig),
    ("attcomplete", "Attendance completeness", "Expected attendance events", _class_attendance),
    ("attedits", "Attendance edits", "Edited attendance transactions", None),
    ("wagemaster", "Wage master applicability", "Worker-pay-period records", _class_wage),
    ("payroll", "100% payroll re-performance", "Payroll records", _class_payroll),
    ("bank", "Bank payment verification", "Payroll payment records", _class_bank),
    ("pf", "PF eligibility and contribution", "PF-applicable worker-periods", _class_pf),
    ("esic", "ESIC eligibility and contribution", "ESIC-applicable worker-periods", _class_esic),
    ("records", "Mandatory records", "Applicable mandatory records", None),
    ("medical", "Medical fitness", "Applicable worker medical records", None),
    ("training", "Induction / PPE / training", "Applicable worker training/PPE events", None),
    ("invoice", "Invoice-service support", "Invoice lines", None),
    ("recon", "Cross-module reconciliation", "Critical reconciliation records", _class_recon),
    ("capa", "RCA / corrective / preventive action", "C3-C5 exceptions", None),
]

_PACKAGE_NOTE = "Not captured in the contractor master file — pending verification."


def _counts_for(rows, classifier, package_class=C6):
    counts = {code: 0 for code, *_ in CLASSIFICATION}
    if classifier is None:
        counts[package_class] = 1
        applicable = 1
    else:
        applicable = len(rows)
        for row in rows:
            counts[classifier(row)] += 1
    verified = applicable - counts[C6] - counts[C7]
    exception = counts[C3] + counts[C4] + counts[C5] + counts[C8]
    score = sum(_SCORE[code] * n for code, n in counts.items())
    return {
        "applicable": applicable,
        "verified": max(0, verified),
        "counts": counts,
        "coverage": round((verified / applicable * 100) if applicable else 0, 1),
        "exception": round((exception / verified * 100) if verified else 0, 1),
        "critical": round((counts[C5] / verified * 100) if verified else 0, 1),
        "pending": round((counts[C6] / applicable * 100) if applicable else 0, 1),
        "compliance": round((score / verified * 100) if verified else 0, 1),
    }


def build_verification_report(rows, meta=None, batches=None, files=None):
    meta = meta or {}
    batches = batches or []
    files = list(files or [])
    # Generated registers (level-1 audit stored on each batch).
    for batch in batches:
        for tid, audit in (getattr(batch, "register_audits", None) or {}).items():
            audit = audit or {}
            files.append({
                "name": audit.get("templateTitle") or f"Register {tid}",
                "kind": "Generated register",
                "status": audit.get("status") or "pending",
                "summary": audit.get("summary") or audit.get("message") or "",
                "findings": [str(x) for x in (audit.get("findings") or [])]
                            + [f"Missing: {x}" for x in (audit.get("missing") or [])]
                            + [f"Issue: {x}" for x in (audit.get("issues") or [])],
                "confidence": audit.get("confidence"),
            })
    records_ok = C1 if (batches or files) else C6

    parameters = []
    for key, label, population, classifier in PARAMETERS:
        package_class = records_ok if key == "records" else C6
        computed = _counts_for(rows, classifier, package_class)
        computed.update({"key": key, "label": label, "population": population,
                         "note": "" if classifier else _PACKAGE_NOTE})
        parameters.append(computed)

    keys = ("applicable", "verified", "coverage", "exception", "critical", "pending", "compliance")
    agg = {k: sum(p[k] for p in parameters) for k in ("applicable", "verified")}
    total_scores = sum(_SCORE[code] * p["counts"][code] for p in parameters for code, *_ in CLASSIFICATION)
    totals_counts = {code: sum(p["counts"][code] for p in parameters) for code, *_ in CLASSIFICATION}
    totals = {
        "applicable": agg["applicable"], "verified": agg["verified"],
        "counts": totals_counts,
        "coverage": round(agg["verified"] / agg["applicable"] * 100, 1) if agg["applicable"] else 0,
        "exception": round(sum(p["counts"][C3] + p["counts"][C4] + p["counts"][C5] + p["counts"][C8] for p in parameters)
                           / agg["verified"] * 100, 1) if agg["verified"] else 0,
        "critical": round(totals_counts[C5] / agg["verified"] * 100, 1) if agg["verified"] else 0,
        "pending": round(totals_counts[C6] / agg["applicable"] * 100, 1) if agg["applicable"] else 0,
        "compliance": round(total_scores / agg["verified"] * 100, 1) if agg["verified"] else 0,
    }
    critical = totals_counts[C5]
    high = totals_counts[C4]
    if totals["compliance"] >= 95 and critical == 0:
        verdict = "Passed"
    elif totals["compliance"] >= 85 and critical == 0:
        verdict = "Passed with observations"
    else:
        verdict = "Needs attention"
    return {"parameters": parameters, "totals": totals, "files": files,
            "verdict": verdict, "critical": critical, "high": high, "meta": meta}


def _ai_assessment(meta, report):
    """Ask the configured AI provider for a structured executive assessment.

    Returns a dict (or None when no provider is configured / it fails)."""
    from . import ai_audit

    t = report["totals"]
    params = "\n".join(
        f"- {p['label']} ({p['population']}): applicable {p['applicable']}, verified {p['verified']}, "
        f"C1 {p['counts'][C1]}, C2 {p['counts'][C2]}, C3 {p['counts'][C3]}, "
        f"C4 {p['counts'][C4]}, C5 {p['counts'][C5]}, C6 {p['counts'][C6]}, "
        f"coverage {p['coverage']}%, exception {p['exception']}%"
        for p in report["parameters"]
    )
    files = "\n".join(
        f"- {f['name']} [{f.get('kind') or ''}] — level-1 {f['status']}"
        + (f", confidence {f['confidence']}%" if f.get("confidence") is not None else "")
        + (f": {f['summary']}" if f.get("summary") else "")
        + (("; " + "; ".join(f["findings"][:4])) if f.get("findings") else "")
        for f in report["files"]
    ) or "- none"
    system = (
        "You are a senior Indian labour-law compliance auditor for the Bharat Shram Setu (BSS) portal. "
        "Assess a contractor's submitted CLRA compliance package and reply with ONLY a compact JSON "
        "object — no prose, no markdown, no code fences. Ground every statement strictly in the numbers "
        "provided and never invent data. Use the C1-C8 classification (C1 compliant … C5 critical … "
        "C6 pending). Assign a realistic remediation owner from: Contractor, Compliance, HR, Payroll, "
        "Operations, Site Admin, Safety; and a due date within 30 days (YYYY-MM-DD)."
    )
    prompt = (
        f"Contractor: {meta.get('contractor') or 'n/a'} · Principal employer: {meta.get('employer') or 'n/a'}\n"
        f"Site: {meta.get('site') or 'n/a'} · Period: {meta.get('period') or 'n/a'} · "
        f"FY: {meta.get('fy') or 'n/a'} · Ref: {meta.get('refNo') or 'n/a'}\n\n"
        f"Verification summary: applicable {t['applicable']}, verified {t['verified']}; "
        f"coverage {t['coverage']}%, overall compliance {t['compliance']}%, exception rate "
        f"{t['exception']}%, critical rate {t['critical']}%, pending {t['pending']}%. "
        f"Classification counts: C1 {t['counts'][C1]}, C2 {t['counts'][C2]}, C3 {t['counts'][C3]}, "
        f"C4 {t['counts'][C4]}, C5 {t['counts'][C5]}, C6 {t['counts'][C6]}.\n\n"
        f"Per-parameter results:\n{params}\n\n"
        f"File-level level-1 AI audits:\n{files}\n\n"
        "Return JSON with EXACTLY these keys: "
        '{"executive_summary": "board-ready 4-6 sentences", '
        '"key_findings": ["..."], '
        '"material_exceptions": [{"parameter": "", "classification": "C3|C4|C5", "issue": "", '
        '"corrective_action": "", "owner": "", "due_date": "YYYY-MM-DD"}], '
        '"recommendations": ["..."], '
        '"verdict": "Passed|Passed with observations|Needs attention"}. '
        "Only list a material exception where the parameter actually shows C3/C4/C5."
    )
    raw, _cred, _err = ai_audit._call_provider_any(system, prompt)
    if raw is None:
        return None
    parsed = ai_audit._parse_json_block(raw)
    if not isinstance(parsed, dict):
        text = str(raw or "").strip().replace("```html", "").replace("```", "").strip()
        return {"narrative_html": text} if text else None
    return {
        "executive_summary": str(parsed.get("executive_summary") or "").strip(),
        "key_findings": [str(x) for x in (parsed.get("key_findings") or []) if str(x).strip()],
        "material_exceptions": [e for e in (parsed.get("material_exceptions") or []) if isinstance(e, dict)],
        "recommendations": [str(x) for x in (parsed.get("recommendations") or []) if str(x).strip()],
        "verdict": str(parsed.get("verdict") or "").strip(),
    }


def _render_ai(ai):
    """Render the AI assessment as branded HTML (escaped — never trusted markup)."""
    if not ai:
        return ""
    if ai.get("narrative_html"):
        return f"<h3>AI executive assessment</h3><div class='ai'>{ai['narrative_html']}</div>"
    parts = ["<h3>AI executive assessment</h3>"]
    if ai.get("executive_summary"):
        parts.append(f"<p>{_esc(ai['executive_summary'])}</p>")
    if ai.get("key_findings"):
        parts.append("<p class='aih'>Key findings</p><ul>"
                     + "".join(f"<li>{_esc(x)}</li>" for x in ai["key_findings"]) + "</ul>")
    exceptions = ai.get("material_exceptions") or []
    if exceptions:
        rows = "".join(
            "<tr>"
            f"<td class='lbl'>{_esc(str(e.get('parameter') or ''))}</td>"
            f"<td class='code'>{_esc(str(e.get('classification') or ''))}</td>"
            f"<td class='det'>{_esc(str(e.get('issue') or ''))}</td>"
            f"<td class='det'>{_esc(str(e.get('corrective_action') or ''))}</td>"
            f"<td>{_esc(str(e.get('owner') or ''))}</td>"
            f"<td>{_esc(str(e.get('due_date') or ''))}</td>"
            "</tr>"
            for e in exceptions
        )
        parts.append(
            "<p class='aih'>Material exceptions &amp; CAPA</p>"
            "<table class='grid'><thead><tr><th class='lbl'>Parameter</th><th>Class</th>"
            "<th class='lbl'>Issue</th><th class='lbl'>Corrective action</th><th>Owner</th><th>Due</th>"
            f"</tr></thead><tbody>{rows}</tbody></table>"
        )
    if ai.get("recommendations"):
        parts.append("<p class='aih'>Recommendations</p><ul>"
                     + "".join(f"<li>{_esc(x)}</li>" for x in ai["recommendations"]) + "</ul>")
    if ai.get("verdict"):
        parts.append(f"<p>AI verdict: <strong>{_esc(ai['verdict'])}</strong></p>")
    return "".join(parts)


def verification_report_html(meta, report):
    logo = _logo_data_uri()
    logo_img = f"<img src='{logo}' alt='BSS' style='height:44px;width:auto;'>" if logo else ""
    t = report["totals"]
    crit_tone = "ok" if report["verdict"] == "Passed" else ("warn" if report["verdict"].startswith("Passed") else "bad")
    ai_block = _render_ai(_ai_assessment(meta, report))

    param_rows = []
    for p in report["parameters"]:
        c = p["counts"]
        param_rows.append(
            "<tr>"
            f"<td class='lbl'>{_esc(p['label'])}<span class='pop'>{_esc(p['population'])}</span></td>"
            f"<td>{p['applicable']}</td><td>{p['verified']}</td>"
            f"<td>{c[C1]}</td><td>{c[C2]}</td><td>{c[C3]}</td><td>{c[C4]}</td>"
            f"<td class='{('bad' if c[C5] else '')}'>{c[C5]}</td><td>{c[C6]}</td>"
            f"<td>{p['coverage']}%</td><td>{p['exception']}%</td><td>{p['critical']}%</td>"
            "</tr>"
        )
    class_rows = "".join(
        f"<tr><td class='code'>{code}</td><td class='lbl'>{_esc(name)}</td>"
        f"<td>{_esc(definition)}</td><td>{_esc(treatment)}</td></tr>"
        for code, name, definition, treatment in CLASSIFICATION
    )
    register_rows = "".join(
        "<tr>"
        f"<td class='lbl'>{_esc(r['name'])}<span class='pop'>{_esc(r.get('kind') or '')}</span></td>"
        f"<td><span class='pill {('ok' if r['status'] == 'passed' else 'warn' if r['status'] in ('review', 'PENDING') else 'bad')}'>"
        f"{_esc(str(r['status']).title())}</span></td>"
        f"<td>{r.get('confidence') if r.get('confidence') is not None else '—'}</td>"
        f"<td class='det'>{_esc(r.get('summary') or '—')}"
        + ("<ul>" + "".join(f"<li>{_esc(x)}</li>" for x in (r.get('findings') or [])[:6]) + "</ul>" if r.get('findings') else "")
        + "</td>"
        "</tr>"
        for r in report["files"]
    ) or "<tr><td colspan='4'>No files recorded for this package.</td></tr>"

    metrics = [
        ("Verification Coverage", f"{t['coverage']}%", "Verified / Applicable"),
        ("Overall Compliance", f"{t['compliance']}%", "Classification-weighted"),
        ("Exception Rate", f"{t['exception']}%", "(C3+C4+C5+C8) / Verified"),
        ("Critical Rate", f"{t['critical']}%", "C5 / Verified"),
        ("Pending Rate", f"{t['pending']}%", "C6 / Applicable"),
        ("Evidence Readiness", f"{t['coverage']}%", "Verified / Applicable"),
    ]
    metric_cards = "".join(
        f"<div class='kpi'><span class='k'>{_esc(label)}</span><strong>{value}</strong><span class='d'>{_esc(detail)}</span></div>"
        for label, value, detail in metrics
    )
    meta_rows = "".join(
        f"<tr><td class='mk'>{_esc(label)}</td><td>{_esc(str(meta.get(field) or '—'))}</td></tr>"
        for label, field in [("Ref No.", "refNo"), ("Contractor", "contractor"), ("Principal Employer", "employer"),
                             ("Site", "site"), ("Period", "period"), ("Financial Year", "fy")]
    )

    return f"""<!doctype html><html><head><meta charset="utf-8"><title>BSS Contractor Compliance & Verification Report</title>
<style>
  @page {{ size: A4 landscape; margin: 14mm 12mm; }}
  body {{ font-family:'Helvetica Neue',Arial,sans-serif; color:#0f172a; font-size:11px; line-height:1.45; }}
  .brand {{ display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding-bottom:10px; }}
  .brand h1 {{ margin:0; font-size:18px; color:#073B67; }} .brand p {{ margin:2px 0 0; color:#64748b; font-size:11px; }}
  h3 {{ color:#073B67; font-size:12px; margin:16px 0 6px; text-transform:uppercase; letter-spacing:.06em; }}
  .aih {{ font-weight:700; color:#073B67; margin:10px 0 4px; }}
  .ai ul {{ margin:4px 0; padding-left:18px; }}
  table {{ width:100%; border-collapse:collapse; }}
  .meta {{ margin:12px 0; }} .meta td {{ padding:5px 9px; border:1px solid #e2e8f0; }}
  .meta .mk {{ background:#f8fafc; color:#64748b; width:16%; font-weight:600; }}
  .kpis {{ display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }}
  .kpi {{ flex:1 1 130px; border:1px solid #e2e8f0; border-radius:10px; padding:8px 10px; background:#f8fafc; }}
  .kpi .k {{ display:block; color:#64748b; font-size:9px; text-transform:uppercase; font-weight:700; letter-spacing:.05em; }}
  .kpi strong {{ font-size:18px; color:#073B67; }} .kpi .d {{ display:block; color:#94a3b8; font-size:9px; }}
  .grid th, .grid td {{ border:1px solid #e2e8f0; padding:5px 6px; text-align:center; }}
  .grid thead th {{ background:#073B67; color:#fff; font-size:9px; text-transform:uppercase; letter-spacing:.03em; }}
  .grid td.lbl, .grid th.lbl {{ text-align:left; font-weight:600; }}
  .grid td .pop {{ display:block; color:#94a3b8; font-size:8px; font-weight:400; }}
  .grid tbody tr:nth-child(even) {{ background:#f8fafc; }}
  .code {{ font-weight:800; color:#073B67; }}
  .pill {{ display:inline-block; padding:2px 8px; border-radius:999px; font-weight:800; font-size:9px; border:1px solid currentColor; }}
  .ok {{ color:#15803d; }} .warn {{ color:#b45309; }} .bad {{ color:#b91c1c; }}
  .det {{ text-align:left; color:#334155; }}
  .verdict {{ display:inline-block; padding:6px 14px; border-radius:999px; font-weight:800; letter-spacing:.05em; border:1px solid currentColor; }}
  .foot {{ margin-top:18px; padding-top:8px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:9px; }}
</style></head><body>
  <div class="brand">{logo_img}<div><h1>Bharat Shram Setu — Contractor Compliance &amp; Verification Report</h1>
    <p>100% population verification · C1–C8 classification · One Nation, One ID, One Platform</p></div></div>
  <table class="meta"><tbody>
    <tr><td class="mk">Ref No.</td><td>{_esc(str(meta.get('refNo') or '—'))}</td>
        <td class="mk">Contractor</td><td>{_esc(str(meta.get('contractor') or '—'))}</td>
        <td class="mk">Principal Employer</td><td>{_esc(str(meta.get('employer') or '—'))}</td></tr>
    <tr><td class="mk">Site</td><td>{_esc(str(meta.get('site') or '—'))}</td>
        <td class="mk">Period</td><td>{_esc(str(meta.get('period') or '—'))}</td>
        <td class="mk">Financial Year</td><td>{_esc(str(meta.get('fy') or '—'))}</td></tr>
  </tbody></table>

  <div class="kpis">{metric_cards}</div>
  <p>Auditor verdict: <span class="verdict {crit_tone}">{_esc(report['verdict'])}</span>
     &nbsp; Open critical: <strong>{report['critical']}</strong> · Open high: <strong>{report['high']}</strong></p>

  {ai_block}

  <h3>Operational compliance — verification matrix</h3>
  <table class="grid"><thead><tr>
    <th class="lbl">Verification parameter</th><th>Applicable</th><th>Verified</th>
    <th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th><th>C6</th>
    <th>Verification %</th><th>Exception %</th><th>Critical %</th>
  </tr></thead><tbody>{''.join(param_rows)}</tbody>
  <tfoot><tr style="font-weight:800;background:#eef2f7;">
    <td class="lbl">Overall</td><td>{t['applicable']}</td><td>{t['verified']}</td>
    <td>{t['counts'][C1]}</td><td>{t['counts'][C2]}</td><td>{t['counts'][C3]}</td>
    <td>{t['counts'][C4]}</td><td>{t['counts'][C5]}</td><td>{t['counts'][C6]}</td>
    <td>{t['coverage']}%</td><td>{t['exception']}%</td><td>{t['critical']}%</td>
  </tr></tfoot></table>

  <h3>File-level AI audit (generated registers · manual register uploads · additional forms)</h3>
  <table class="grid"><thead><tr><th class="lbl">File</th><th>Level-1 status</th><th>Confidence</th><th class="lbl">Summary &amp; findings</th></tr></thead>
  <tbody>{register_rows}</tbody></table>

  <h3>Classification (C1–C8)</h3>
  <table class="grid"><thead><tr><th>Code</th><th class="lbl">Classification</th><th class="lbl">Definition</th><th class="lbl">Treatment</th></tr></thead>
  <tbody>{class_rows}</tbody></table>

  <div class="foot">Generated by the BSS compliance engine for this submitted package. Parameters marked “{_esc(_PACKAGE_NOTE)}”
  require data sources not present in the contractor master file and are excluded from the verified denominator.</div>
</body></html>"""
