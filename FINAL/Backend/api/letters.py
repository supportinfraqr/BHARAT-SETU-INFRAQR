"""Auto-issued worker letters (Appointment / Experience).

Issued by the system when a worker<->contractor binding is accepted (appointment
letter) or unbound (experience letter). Each letter is stored as a system-owned
``WorkerDocument`` so it appears on the worker's Documents page with a download
link and cannot be deleted/replaced by the worker.
"""
from __future__ import annotations

import html

from django.core.files.base import ContentFile

from bss_core.models import (
    WorkerAddressMobility,
    WorkerDocument,
    WorkerDocumentMaster,
    WorkerEmployment,
    WorkerIdentity,
    WorkerWages,
)

LETTER_CODES = {"appointment": "APPT", "experience": "EXPL"}
LETTER_NAMES = {"appointment": "Appointment Letter", "experience": "Experience Letter"}


def _e(value) -> str:
    return html.escape(str(value or ""))


def _fmt(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d %b %Y")
    except AttributeError:
        return str(value)


def _money(value) -> str:
    if value in (None, ""):
        return "—"
    try:
        return f"₹{float(value):,.0f}"
    except (TypeError, ValueError):
        return "—"


def _cost_sheet_section(cs, cb) -> str:
    """Render the attached cost sheet as an offer-letter section. Empty string
    when the binding has no cost sheet, so templates using ``{{costSheetSection}}``
    simply show nothing in that case."""
    if cs is None:
        return ""
    cb = cb or {}
    breakdown = [
        ("Basic wage", _money(cb.get("basicWage"))),
        ("VDA", _money(cb.get("vda"))),
        ("Minimum wage", _money(cb.get("minimumWage"))),
        ("Statutory (employer)", _money(cb.get("statutoryTotal"))),
        ("Custom / other costs", _money(cb.get("customTotal"))),
        ("CTC", _money(cb.get("ctc"))),
    ]
    rows = "".join(f"<tr><td>{_e(label)}</td><td>{value}</td></tr>" for label, value in breakdown)
    grade = _e(getattr(cs, "grade", "") or "")
    category = _e(getattr(cs, "worker_category", "") or "")
    qualifier = " · ".join(x for x in (category, grade) if x)
    header = f"<strong>{_e(cs.name)}</strong> ({_e(cs.code)})"
    if qualifier:
        header += f" — {qualifier}"
    return (f'<h3>E. Cost Sheet Attached</h3>'
            f'<p>Your cost sheet: {header}.</p>'
            f'<table class="kv">{rows}</table>')


def _offered_wage(binding):
    """Monthly wage agreed at binding, falling back to the worker's latest
    recorded wage so the letter is never blank when a wage exists."""
    if binding.offered_wage is not None:
        return binding.offered_wage
    latest = (WorkerWages.objects.filter(worker=binding.worker)
              .order_by("-period_end").first())
    return latest.gross_wage if latest else None


def _worker_facts(worker) -> dict:
    wi = WorkerIdentity.objects.filter(user=worker).first()
    addr = WorkerAddressMobility.objects.filter(user=worker).first()
    emp = WorkerEmployment.objects.filter(user=worker).first()
    return {
        "name": _e(getattr(wi, "name", "") or worker.username),
        "bssId": _e(getattr(wi, "bss_worker_id", "")),
        "father": _e(getattr(wi, "father_name", "")),
        "dob": _fmt(getattr(wi, "date_of_birth", None)),
        "gender": _e(getattr(wi, "gender", "")),
        "mobile": _e(getattr(wi, "mobile_number", "")),
        "address": _e(getattr(addr, "permanent_address", "") or getattr(addr, "current_address", "")),
        "designation": _e(getattr(emp, "designation", "")),
        "department": _e(getattr(emp, "department", "")),
        "doj": _fmt(getattr(emp, "doj", None)),
    }


def _party_facts(binding) -> dict:
    site = binding.site
    employer = getattr(site, "employer", None) if site else None
    cp = getattr(binding.contractor, "contractor_profile", None)
    ep = getattr(employer, "employer_profile", None) if employer else None
    site_addr = ", ".join(
        x for x in [getattr(site, "location", ""), getattr(site, "city", ""), getattr(site, "state", "")]
        if x
    ) if site else ""
    return {
        "contractor": _e(getattr(cp, "contractor_name", "") or getattr(cp, "trade_name", "") or binding.contractor.username),
        "contractorBss": _e(getattr(cp, "contractor_code", "")),
        "contractorAddr": _e(getattr(cp, "address", "")),
        "employer": _e(getattr(ep, "employer_name", "") or getattr(ep, "trade_name", "") or (employer.username if employer else "")),
        "site": _e(getattr(site, "site_name", "")),
        "siteAddr": _e(site_addr),
    }


_STYLE = """
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; }
  .page { width:794px; margin:0 auto; padding:32px 44px; }
  .brand { display:flex; align-items:center; gap:12px; border-bottom:3px solid #073B67; padding-bottom:10px; margin-bottom:6px; }
  .brand strong { color:#073B67; font-size:18px; letter-spacing:.3px; display:block; }
  .brand span { font-size:10px; color:#6b7280; letter-spacing:1.6px; text-transform:uppercase; }
  h1 { text-align:center; color:#073B67; font-size:20px; letter-spacing:1.4px; margin:16px 0 4px; border-bottom:2px double #F47A32; padding-bottom:8px; text-transform:uppercase; }
  .meta { display:flex; justify-content:space-between; font-size:12px; color:#374151; margin:10px 0 18px; }
  h3 { color:#073B67; font-size:13px; margin:16px 0 6px; border-bottom:1px solid #d1d5db; padding-bottom:4px; }
  p, li { font-size:12.5px; line-height:1.65; text-align:justify; }
  .kv { width:100%; border-collapse:collapse; font-size:12.5px; margin:4px 0; }
  .kv td { border:1px solid #9aa4b2; padding:5px 8px; vertical-align:top; }
  .kv td:first-child { background:#F0F4FA; color:#073B67; width:34%; font-weight:600; }
  .sign { display:flex; justify-content:space-between; margin:46px 8px 6px; }
  .sign > div { width:220px; text-align:center; font-size:12px; }
  .sign .line { border-top:1px solid #4b5563; margin-top:36px; padding-top:5px; font-weight:600; }
  .foot { margin-top:18px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:10px; color:#6b7280; text-align:center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
"""


def _shell(title: str, body: str) -> str:
    return (
        "<!doctype html><html><head><meta charset='utf-8'/>"
        f"<title>{_e(title)}</title><style>{_STYLE}</style></head><body><div class='page'>"
        "<div class='brand'><div><strong>Bharat Shram Setu</strong>"
        "<span>One Worker · One Identity · One Future</span></div></div>"
        f"{body}"
        "<div class='foot'>Generated by Bharat Shram Setu · bharatshramsetu.com</div>"
        "</div></body></html>"
    )


def _letter_tokens(binding, letter_type: str, logo_url: str = "") -> dict:
    """Values injected into an admin-authored HTML template. Tokens are written
    as {{token}} (or {{ token }}) — values are HTML-escaped by the facts helpers."""
    w = _worker_facts(binding.worker)
    p = _party_facts(binding)
    ref_prefix = {"appointment": "APPT"}.get(letter_type, "EXP")
    ref = f"BSS/{ref_prefix}/{binding.id:05d}"
    issue = _fmt(binding.accepted_at or binding.created_at)
    wage = _money(_offered_wage(binding))

    # Cost Sheet facts
    cs = getattr(binding, "cost_sheet", None)
    cb = getattr(binding, "cost_breakdown", {}) or {}
    cs_code = getattr(cs, "code", "") if cs else ""
    cs_name = getattr(cs, "name", "") if cs else ""
    cs_cat = getattr(cs, "worker_category", "") if cs else ""
    cs_grade = getattr(cs, "grade", "") if cs else ""
    ctc_val = binding.computed_ctc if getattr(binding, "computed_ctc", None) is not None else cb.get("ctc")
    epf_val = cb.get("statutoryEmployer", {}).get("EPF") if isinstance(cb.get("statutoryEmployer"), dict) else None
    esic_val = cb.get("statutoryEmployer", {}).get("ESIC") if isinstance(cb.get("statutoryEmployer"), dict) else None
    takehome_val = cb.get("netTakeHome")

    # Principal Employer BSS ID / Code
    site = binding.site
    employer = getattr(site, "employer", None) if site else None
    ep = getattr(employer, "employer_profile", None) if employer else None
    employer_bss_id = _e(getattr(ep, "employer_code", "") or getattr(employer, "username", ""))

    # Detailed Salary & CTC Breakdown Table
    salary_table = _cost_sheet_section(cs, cb)

    return {
        "letterTitle": _e(LETTER_NAMES.get(letter_type, "Letter")),
        "refNo": _e(ref),
        "issueDate": _e(issue),
        "workerName": w["name"], "workerBssId": w["bssId"], "fatherName": w["father"],
        "dob": w["dob"], "gender": w["gender"], "mobile": w["mobile"], "address": w["address"],
        "designation": w["designation"], "department": w["department"], "doj": w["doj"],
        "wage": _e(wage),
        "costSheetCode": _e(cs_code),
        "costSheetName": _e(cs_name),
        "costSheetCategory": _e(cs_cat),
        "costSheetGrade": _e(cs_grade),
        "costSheetSection": salary_table,
        "salaryBreakdownTable": salary_table,
        "ctc": _money(ctc_val),
        "epfEmployer": _money(epf_val),
        "esicEmployer": _money(esic_val),
        "netTakeHome": _money(takehome_val),
        "contractorName": p["contractor"], "contractorBssId": p["contractorBss"],
        "contractorAddress": p["contractorAddr"],
        "employerName": p["employer"],
        "employerBssId": employer_bss_id,
        "siteName": p["site"], "siteAddress": p["siteAddr"],
        "logoUrl": logo_url or "",
    }


def _resolve_letter_template(binding, letter_type: str):
    """Template priority: the site's selected template → a state template →
    the all-India default. Returns a LetterTemplate or None."""
    from bss_core.models import LetterTemplate
    kind = "APPOINTMENT" if letter_type == "appointment" else "EXPERIENCE"
    site = binding.site
    if site is not None:
        chosen = (site.appointment_letter_template if kind == "APPOINTMENT"
                  else site.experience_letter_template)
        if chosen is not None and chosen.is_active and chosen.html.strip():
            return chosen
        state = (site.state or "").strip()
        if state:
            t = (LetterTemplate.objects
                 .filter(letter_type=kind, state__iexact=state, is_active=True)
                 .exclude(html="").order_by("-updated_at").first())
            if t is not None:
                return t
    return (LetterTemplate.objects
            .filter(letter_type=kind, state="", is_active=True)
            .exclude(html="").order_by("-updated_at").first())


def _render_template_html(html_text: str, tokens: dict) -> str:
    out = html_text
    for key, value in tokens.items():
        out = out.replace("{{" + key + "}}", value).replace("{{ " + key + " }}", value)
    return out


def render_letter(binding, letter_type: str) -> str:
    template = _resolve_letter_template(binding, letter_type)
    if template is not None:
        return _render_template_html(
            template.html,
            _letter_tokens(binding, letter_type, getattr(template, "logo_url", "") or ""))
    w = _worker_facts(binding.worker)
    p = _party_facts(binding)
    ref_prefix = {"appointment": "APPT"}.get(letter_type, "EXP")
    ref = f"BSS/{ref_prefix}/{binding.id:05d}"
    issue = _fmt(binding.accepted_at or binding.created_at)
    wage = _money(_offered_wage(binding))
    cost_sheet_html = _cost_sheet_section(getattr(binding, "cost_sheet", None),
                                          getattr(binding, "cost_breakdown", {}) or {})

    if letter_type == "appointment":
        body = f"""
        <h1>Appointment Letter</h1>
        <div class="meta"><span>Ref No.: {ref}</span><span>Date: {issue}</span></div>
        <p>Dear {w['name']},</p>
        <p>With reference to your engagement, we are pleased to appoint you on the terms set out below, at the
        project site of <strong>{p['employer']}</strong> through <strong>{p['contractor']}</strong>.</p>
        <h3>A. Employer &amp; Site</h3>
        <table class="kv">
          <tr><td>Contractor / Service Provider</td><td>{p['contractor']} ({p['contractorBss']})<br/>{p['contractorAddr']}</td></tr>
          <tr><td>Principal Employer</td><td>{p['employer']}</td></tr>
          <tr><td>Site</td><td>{p['site']}<br/>{p['siteAddr']}</td></tr>
        </table>
        <h3>B. Worker Particulars</h3>
        <table class="kv">
          <tr><td>Name</td><td>{w['name']}</td></tr>
          <tr><td>BSS Worker ID</td><td>{w['bssId']}</td></tr>
          <tr><td>Father's Name</td><td>{w['father']}</td></tr>
          <tr><td>Date of Birth</td><td>{w['dob']}</td></tr>
          <tr><td>Gender</td><td>{w['gender']}</td></tr>
          <tr><td>Address</td><td>{w['address']}</td></tr>
        </table>
        <h3>C. Appointment Terms</h3>
        <table class="kv">
          <tr><td>Designation</td><td>{w['designation']}</td></tr>
          <tr><td>Department / Unit</td><td>{w['department']}</td></tr>
          <tr><td>Date of Joining</td><td>{w['doj']}</td></tr>
        </table>
        <h3>D. Wages</h3>
        <table class="kv">
          <tr><td>Gross Monthly Wage</td><td>{wage}</td></tr>
        </table>
        {cost_sheet_html}
        <p>Your engagement is subject to applicable labour laws and the terms agreed with the contractor. You shall
        follow all site safety rules, use the personal protective equipment provided, complete site induction, and
        report any unsafe condition to the site safety officer immediately.</p>
        <p>This appointment is valid while your binding with the contractor remains active on the BSS portal.</p>
        <div class="sign">
          <div><div class="line">{w['name']}</div>Worker</div>
          <div><div class="line">{p['contractor']}</div>Contractor / Authorized Signatory</div>
        </div>
        """
    else:
        body = f"""
        <h1>Experience Letter</h1>
        <div class="meta"><span>Ref No.: {ref}</span><span>Date: {issue}</span></div>
        <p>To Whomsoever It May Concern</p>
        <p>This is to certify that <strong>{w['name']}</strong> (BSS Worker ID {w['bssId']}) was engaged by
        <strong>{p['contractor']}</strong> and deployed at <strong>{p['site']}</strong> for
        <strong>{p['employer']}</strong> as <strong>{w['designation']}</strong> in the department of
        {w['department']}.</p>
        <table class="kv">
          <tr><td>Date of Joining</td><td>{w['doj']}</td></tr>
          <tr><td>Date of Relieving</td><td>{issue}</td></tr>
        </table>
        <p>During the engagement, {w['name']} discharged the assigned duties diligently and maintained the required
        conduct and safety standards. We wish {w['name']} the very best in future endeavours.</p>
        <div class="sign">
          <div><div class="line">{p['contractor']}</div>Contractor / Authorized Signatory</div>
        </div>
        """
    return _shell(f"{LETTER_NAMES[letter_type]} — {w['name']}", body)


def _letter_as_pdf(binding, letter_type: str, html: str):
    """Server-side HTML→PDF snapshots for worker letters. Falls back to the
    HTML source when the converter is unavailable so letters are never blocked."""
    try:
        from weasyprint import HTML
        from weasyprint.text.fonts import FontConfiguration
    except Exception:
        return None
    try:
        font_config = FontConfiguration()
        return HTML(string=html).write_pdf(font_config=font_config)
    except Exception:
        return None


def issue_letter(binding, letter_type: str):
    """Create/refresh the system-issued letter for the binding's worker.

    Issued letters are immutable snapshots bound to a specific engagement
    (binding.id). When a site or contractor changes, existing letters remain
    in history so the worker retains their past appointment and releasing letters.
    Each letter is stored as a real PDF (server-rendered) — the worker's link
    opens the fixed file, never a live re-render."""
    code = LETTER_CODES.get(letter_type)
    if not code or binding is None or binding.worker is None:
        return None
    master = WorkerDocumentMaster.objects.filter(code=code).first()
    if master is None:
        return None
    html = render_letter(binding, letter_type)
    pdf = _letter_as_pdf(binding, letter_type, html)
    if pdf:
        filename = f"{code}-{binding.id}-{binding.worker_id}.pdf"
        content, mime = pdf, "application/pdf"
    else:
        filename = f"{code}-{binding.id}-{binding.worker_id}.html"
        content, mime = html.encode("utf-8"), "text/html"
    # Delete previous generation ONLY for the exact same binding ID (snapshot protection)
    WorkerDocument.objects.filter(
        user=binding.worker, document=master, auto_generated=True, file_name__startswith=f"{code}-{binding.id}-"
    ).delete()
    doc = WorkerDocument(
        user=binding.worker, document=master, file_name=filename,
        mime_type=mime, status="UPLOADED", is_mandatory=False,
        owner_role="system", auto_generated=True, file_size=len(content),
    )
    doc.file.save(filename, ContentFile(content), save=False)
    doc.file_path = doc.file.name
    doc.save()
    return doc
