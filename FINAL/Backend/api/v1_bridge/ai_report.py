"""AI-generated compliance audit report.

After a contractor submits compliance evidence, BSS builds a branded audit
report: a deterministic criteria checklist (ticks) plus an AI-written narrative
and verdict. The report is rendered to HTML and to PDF (WeasyPrint) with the
Bharat Shram Setu logo, and is downloadable.
"""

# ruff: noqa: F401,F403
import base64
import html as _html

from django.http import HttpResponse

from .common import *  # noqa: F401,F403

_LOGO_URL = "https://login.bharatshramsetu.com/bss-original-logo.png"
_logo_cache = {"data": None}


def _logo_data_uri():
    if _logo_cache["data"] is not None:
        return _logo_cache["data"]
    try:
        import requests

        resp = requests.get(_LOGO_URL, timeout=10)
        if resp.ok and resp.content:
            _logo_cache["data"] = "data:image/png;base64," + base64.b64encode(resp.content).decode()
            return _logo_cache["data"]
    except Exception:  # noqa: BLE001
        pass
    _logo_cache["data"] = ""
    return ""


def _fmt(value):
    return _html.escape(str(value if value not in (None, "") else "—"))


def _criteria(ev):
    findings = list(ev.validation_findings or [])
    mime = (ev.mime_type or "").lower()
    accepted_formats = ("application/pdf", "image/jpeg", "image/png",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "application/vnd.ms-excel", "text/csv")
    criteria = [
        ("Document uploaded", bool(ev.file), ev.original_name or ""),
        ("File format accepted", (not mime) or mime in accepted_formats, mime or "unknown"),
        ("Site identified", bool(ev.site), ev.site or ""),
        ("Principal employer identified", bool(ev.employer), ev.employer or ""),
        ("Reporting period stated", bool(ev.period or ev.month), ev.period or ev.month or ""),
        ("Document integrity recorded (checksum)", bool(ev.checksum_sha256), (ev.checksum_sha256 or "")[:16]),
        ("No outstanding validation issues", not findings, "; ".join(findings)[:200]),
        ("Accepted for review (not returned/rejected)", str(ev.status).upper() not in ("RETURNED", "REJECTED"), ev.status or ""),
    ]
    return [{"label": label, "passed": bool(passed), "detail": detail} for label, passed, detail in criteria]


def _meta(ev):
    return {
        "party": str(getattr(ev, "contractor", None) or ""),
        "site": ev.site or "",
        "employer": ev.employer or "",
        "state": getattr(ev, "state", "") or "",
        "period": ev.period or "",
        "financialYear": getattr(ev, "financial_year", "") or "",
        "documentType": getattr(ev, "document_type", "") or ev.doc_type or "",
        "fileName": ev.original_name or "",
        "status": ev.status or "",
        "submittedAt": ev.created_at.isoformat() if getattr(ev, "created_at", None) else "",
    }


def _ai_narrative(ev, criteria):
    """Ask the configured AI provider for the report body (HTML fragment)."""
    from . import ai_audit

    cred = ai_audit._default_credential()
    if cred is None or not cred.has_key:
        return ""
    passed = [c["label"] for c in criteria if c["passed"]]
    failed = [f"{c['label']} — {c['detail']}" for c in criteria if not c["passed"]]
    system = (
        "You are a compliance auditor for the Bharat Shram Setu (BSS) portal. "
        "Write a concise, professional audit report body in clean semantic HTML "
        "(no <html>, <head>, <style> or markdown). Use these sections with <h3>: "
        "Executive Summary, Scope & Basis of Review, Findings, Recommendations, Verdict. "
        "Be factual and specific; do not invent data."
    )
    prompt = (
        f"Document type: {_meta(ev).get('documentType') or ev.doc_type}\n"
        f"Site: {ev.site or 'n/a'} · Principal employer: {ev.employer or 'n/a'} · State: {getattr(ev,'state','') or 'n/a'}\n"
        f"Period: {ev.period or ev.month or 'n/a'} · FY: {getattr(ev,'financial_year','') or 'n/a'}\n"
        f"File: {ev.original_name or 'n/a'} ({ev.file_size or 0} bytes, {ev.mime_type or 'unknown'})\n"
        f"Criteria passed: {', '.join(passed) or 'none'}\n"
        f"Criteria not met: {'; '.join(failed) or 'none'}\n\n"
        "Return ONLY the HTML fragment for the report body."
    )
    try:
        raw = ai_audit._call_provider(cred, system, prompt)
    except Exception:  # noqa: BLE001
        return ""
    raw = str(raw or "").strip()
    raw = raw.replace("```html", "").replace("```", "").strip()
    return raw


def _html_shell(ev, criteria, body_html):
    rows = []
    for c in criteria:
        mark = "✓" if c["passed"] else "✗"
        cls = "ok" if c["passed"] else "bad"
        rows.append(
            f"<tr><td class='mark {cls}'>{mark}</td><td class='lbl'>{_fmt(c['label'])}</td>"
            f"<td class='det'>{_fmt(c['detail'])}</td></tr>"
        )
    passed = sum(1 for c in criteria if c["passed"])
    verdict = "PASSED" if passed == len(criteria) else ("PASSED WITH OBSERVATIONS" if passed >= len(criteria) - 2 else "NEEDS ATTENTION")
    vcls = "ok" if passed == len(criteria) else ("warn" if passed >= len(criteria) - 2 else "bad")
    logo = _logo_data_uri()
    logo_img = f"<img src='{logo}' alt='BSS' style='height:46px;width:auto;'>" if logo else ""
    m = _meta(ev)
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>BSS AI Compliance Audit Report</title>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.5; }}
  .brand {{ display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding-bottom:12px; }}
  .brand h1 {{ margin:0; font-size:19px; color:#073B67; }}
  .brand p {{ margin:2px 0 0; color:#64748b; font-size:11px; }}
  .meta {{ width:100%; border-collapse:collapse; margin:16px 0; }}
  .meta td {{ padding:6px 10px; border:1px solid #e2e8f0; }}
  .meta td.k {{ background:#f8fafc; color:#64748b; width:32%; font-weight:600; }}
  h3 {{ color:#073B67; font-size:13px; margin:16px 0 6px; }}
  .crit {{ width:100%; border-collapse:collapse; margin-top:6px; }}
  .crit td {{ border:1px solid #e2e8f0; padding:6px 10px; vertical-align:top; }}
  .crit .mark {{ width:34px; text-align:center; font-size:15px; font-weight:800; }}
  .crit .lbl {{ font-weight:600; }}
  .crit .det {{ color:#64748b; }}
  .ok {{ color:#15803d; }} .bad {{ color:#b91c1c; }} .warn {{ color:#b45309; }}
  .verdict {{ display:inline-block; padding:6px 14px; border-radius:999px; font-weight:800; letter-spacing:.06em; font-size:12px; border:1px solid currentColor; }}
  .foot {{ margin-top:22px; padding-top:10px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:10px; }}
</style></head>
<body>
  <div class="brand">{logo_img}<div><h1>Bharat Shram Setu</h1><p>AI Compliance Audit Report · One Nation, One ID, One Platform</p></div></div>
  <table class="meta">
    <tr><td class="k">Document</td><td>{_fmt(m['documentType'] or ev.doc_type)}</td></tr>
    <tr><td class="k">Site</td><td>{_fmt(m['site'])}</td></tr>
    <tr><td class="k">Principal Employer</td><td>{_fmt(m['employer'])}</td></tr>
    <tr><td class="k">State</td><td>{_fmt(m['state'])}</td></tr>
    <tr><td class="k">Period</td><td>{_fmt(m['period'] or m['financialYear'])}</td></tr>
    <tr><td class="k">File</td><td>{_fmt(m['fileName'])}</td></tr>
  </table>
  <h3>Audit criteria</h3>
  <table class="crit">{''.join(rows)}</table>
  <h3>Auditor verdict</h3>
  <p><span class="verdict {vcls}">{verdict}</span></p>
  {body_html or '<p>The AI narrative is unavailable because no AI provider is configured (Admin → AI Audit Settings). The criteria checklist above is authoritative.</p>'}
  <div class="foot">Generated by the BSS AI audit engine on {_fmt(m['submittedAt'])}. This report summarises the submitted evidence and the automated checks; it does not replace statutory filing.</div>
</body></html>"""


def build_report(ev):
    criteria = _criteria(ev)
    body = _ai_narrative(ev, criteria)
    html = _html_shell(ev, criteria, body)
    passed = sum(1 for c in criteria if c["passed"])
    verdict = "Passed" if passed == len(criteria) else ("Passed with observations" if passed >= len(criteria) - 2 else "Needs attention")
    return {"criteria": criteria, "verdict": verdict, "passed": passed, "total": len(criteria), "html": html}


def _submission(request, submission_id):
    """Resolve a submission the caller is allowed to see.

    Contractors see their own; employers see submissions from contractors/workers
    bound to their sites; BSS staff/admin/government see any."""
    from django.db.models import Q

    from bss_core.models import Site, SubmissionEvidence

    user = request.user
    qs = SubmissionEvidence.objects.filter(pk=submission_id)
    role = user.role
    if role == "contractor":
        return qs.filter(user_id=user.id).first()
    if role in ("bss_admin", "bss_staff", "government", "admin"):
        return qs.first()
    if role == "employer":
        my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
        ev = qs.filter(
            Q(user__worker_bindings__site__employer=user)
            | Q(user__contractor_bindings__site__employer=user)
        ).first()
        if ev is None:
            return None
        if ev.site and my_sites and ev.site not in my_sites:
            return None
        return ev
    return None


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_ai_audit_report(request, submission_id):
    """Return the AI compliance audit report (JSON with HTML) for a submission."""
    ev = _submission(request, submission_id)
    if ev is None:
        return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
    report = build_report(ev)
    return Response({"data": report}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_ai_audit_report_pdf(request, submission_id):
    """Return the AI compliance audit report as a PDF (BSS-logo branded)."""
    ev = _submission(request, submission_id)
    if ev is None:
        return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
    report = build_report(ev)
    try:
        from weasyprint import HTML

        pdf = HTML(string=report["html"], base_url="https://login.bharatshramsetu.com/").write_pdf()
    except Exception as exc:  # noqa: BLE001
        return Response({"error": f"PDF could not be generated: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    filename = f"bss-audit-report-{submission_id}.pdf"
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ─────────────────────────────────────────────────────────────────────────
# Whole-submission report: one report covering every document the contractor
# uploaded for a site + period (the "Contractor Report" tab).
# ─────────────────────────────────────────────────────────────────────────

def _level1_highlights(ev):
    """A few level-1 audit highlights for one uploaded document."""
    out = []
    if not ev.file:
        return ["No file attached."]
    out.append(f"Format: {(ev.mime_type or 'unknown')}")
    if ev.file_size:
        out.append(f"Size: {round((ev.file_size or 0) / 1024)} KB")
    findings = [str(f) for f in (ev.validation_findings or []) if str(f).strip()]
    out.extend(findings[:4])
    if not findings:
        out.append("Content check: no issues detected at level 1.")
    return out


def _scope_submissions(user, site="", period="", fy=""):
    from bss_core.models import SubmissionEvidence

    qs = SubmissionEvidence.objects.filter(user=user)
    if site:
        qs = qs.filter(site=site)
    if period:
        qs = qs.filter(period=period)
    if fy:
        qs = qs.filter(financial_year=fy)
    return list(qs.order_by("doc_type", "id"))


def build_submission_report(submissions, meta=None):
    meta = meta or {}
    docs = []
    for ev in submissions:
        highlights = _level1_highlights(ev)
        passed = bool(ev.file) and not (ev.validation_findings or []) and str(ev.status).upper() not in ("RETURNED", "REJECTED")
        docs.append({
            "id": ev.id,
            "type": _html.escape(str(ev.doc_type or ev.document_type or "Document")),
            "status": _html.escape(str(ev.status or "")),
            "fileName": _html.escape(str(ev.original_name or "")),
            "period": _html.escape(str(ev.period or ev.month or "")),
            "passed": passed,
            "highlights": [ _html.escape(h) for h in highlights ],
        })
    total = len(docs)
    with_file = sum(1 for d in docs if d["fileName"])
    clean = sum(1 for d in docs if d["passed"])
    criteria = [
        {"label": "Documents uploaded", "passed": total > 0, "detail": f"{total} document(s)"},
        {"label": "Every document has a file attached", "passed": total > 0 and with_file == total, "detail": f"{with_file}/{total}"},
        {"label": "No level-1 content issues", "passed": total > 0 and clean == total, "detail": f"{clean}/{total} clean"},
        {"label": "All documents submitted for review", "passed": total > 0 and all(str(d["status"]).upper() in ("PENDING", "UPLOADED", "SUBMITTED", "VERIFIED") for d in docs), "detail": ""},
    ]
    passed = sum(1 for c in criteria if c["passed"])
    verdict = "Passed" if total and passed == len(criteria) else ("Passed with observations" if passed >= len(criteria) - 1 else "Needs attention")
    return {"criteria": criteria, "documents": docs, "verdict": verdict, "total": total, "clean": clean, "passed": passed}


def _submission_report_html(meta, report):
    logo = _logo_data_uri()
    logo_img = f"<img src='{logo}' alt='BSS' style='height:46px;width:auto;'>" if logo else ""
    crit_rows = "".join(
        f"<tr><td class='mark {'ok' if c['passed'] else 'bad'}'>{'✓' if c['passed'] else '✗'}</td>"
        f"<td class='lbl'>{_fmt(c['label'])}</td><td class='det'>{_fmt(c['detail'])}</td></tr>"
        for c in report["criteria"]
    )
    doc_blocks = []
    for d in report["documents"]:
        hl = "".join(f"<li>{h}</li>" for h in d["highlights"])
        doc_blocks.append(
            f"<div class='doc'><div class='dhead'><span class='{'ok' if d['passed'] else 'bad'}'>{'✓' if d['passed'] else '✗'}</span>"
            f"<strong>{d['type']}</strong><span class='st'>{d['status']}</span></div>"
            f"<p class='sub'>{d['fileName'] or 'no file'} · {d['period']}</p><ul>{hl}</ul></div>"
        )
    vcls = "ok" if report["verdict"] == "Passed" else ("warn" if report["verdict"].startswith("Passed") else "bad")
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>BSS Compliance Submission Report</title>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  body {{ font-family:'Helvetica Neue',Arial,sans-serif; color:#0f172a; font-size:12px; line-height:1.5; }}
  .brand {{ display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding-bottom:12px; }}
  .brand h1 {{ margin:0; font-size:19px; color:#073B67; }} .brand p {{ margin:2px 0 0; color:#64748b; font-size:11px; }}
  .meta {{ width:100%; border-collapse:collapse; margin:14px 0; }}
  .meta td {{ padding:6px 10px; border:1px solid #e2e8f0; }} .meta td.k {{ background:#f8fafc; color:#64748b; width:32%; font-weight:600; }}
  h3 {{ color:#073B67; font-size:13px; margin:16px 0 6px; }}
  .crit {{ width:100%; border-collapse:collapse; }} .crit td {{ border:1px solid #e2e8f0; padding:6px 10px; }}
  .crit .mark {{ width:34px; text-align:center; font-weight:800; font-size:15px; }} .crit .lbl {{ font-weight:600; }} .crit .det {{ color:#64748b; }}
  .doc {{ border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin:8px 0; }}
  .dhead {{ display:flex; align-items:center; gap:8px; }} .dhead .st {{ margin-left:auto; color:#64748b; font-size:10px; text-transform:uppercase; font-weight:700; }}
  .doc .sub {{ color:#94a3b8; margin:2px 0 4px; font-size:11px; }} .doc ul {{ margin:0; padding-left:16px; }} .doc li {{ font-size:11px; color:#334155; }}
  .ok {{ color:#15803d; }} .bad {{ color:#b91c1c; }} .warn {{ color:#b45309; }}
  .verdict {{ display:inline-block; padding:6px 14px; border-radius:999px; font-weight:800; letter-spacing:.05em; border:1px solid currentColor; }}
  .foot {{ margin-top:22px; padding-top:10px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:10px; }}
</style></head><body>
  <div class="brand">{logo_img}<div><h1>Bharat Shram Setu</h1><p>Compliance Submission Report · One Nation, One ID, One Platform</p></div></div>
  <table class="meta">
    <tr><td class="k">Site</td><td>{_fmt(meta.get('site'))}</td></tr>
    <tr><td class="k">Period</td><td>{_fmt(meta.get('period'))}</td></tr>
    <tr><td class="k">Financial Year</td><td>{_fmt(meta.get('fy'))}</td></tr>
    <tr><td class="k">Documents</td><td>{report['total']} uploaded · {report['clean']} clean at level 1</td></tr>
  </table>
  <h3>Overall criteria</h3>
  <table class="crit">{crit_rows}</table>
  <h3>Documents &amp; level-1 highlights</h3>
  {''.join(doc_blocks) or '<p>No documents uploaded for this site and period yet.</p>'}
  <h3>Auditor verdict</h3>
  <p><span class="verdict {vcls}">{report['verdict']}</span></p>
  <div class="foot">Generated by the BSS compliance engine. This report summarises the uploaded submission and the automated level-1 checks; it does not replace statutory filing.</div>
</body></html>"""


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_compliance_report(request):
    """Whole-submission compliance report for a contractor's site + period."""
    if request.user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    site = (request.query_params.get("site") or "").strip()
    period = (request.query_params.get("period") or "").strip()
    fy = (request.query_params.get("fy") or "").strip()
    submissions = _scope_submissions(request.user, site=site, period=period, fy=fy)
    meta = {"site": site, "period": period, "fy": fy}
    report = build_submission_report(submissions, meta)
    html = _submission_report_html(meta, report)
    if (request.query_params.get("format") or "").lower() == "pdf":
        try:
            from weasyprint import HTML

            pdf = HTML(string=html, base_url="https://login.bharatshramsetu.com/").write_pdf()
        except Exception as exc:  # noqa: BLE001
            return Response({"error": f"PDF could not be generated: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="bss-compliance-submission-report.pdf"'
        return response
    return Response({"data": {**{k: report[k] for k in ("criteria", "documents", "verdict", "total", "clean", "passed")}, "html": html}}, status=status.HTTP_200_OK)
