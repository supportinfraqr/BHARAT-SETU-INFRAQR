"""Auto-issued worker letters (Appointment / Experience).

Issued by the system when a worker<->contractor binding is accepted (appointment
letter) or unbound (experience letter). Each letter is stored as a system-owned
``WorkerDocument`` so it appears on the worker's Documents page with a download
link and cannot be deleted/replaced by the worker.
"""
from __future__ import annotations

import html

from django.core.files.base import ContentFile

from api import bss_ids
from bss_core import letter_brand
from bss_core.models import (
    WorkerAddressMobility,
    WorkerDocument,
    WorkerDocumentMaster,
    WorkerEmployment,
    WorkerIdentity,
    WorkerWages,
)

LETTER_CODES = {"appointment": "APPT", "experience": "EXPL", "card": "CARD"}
LETTER_NAMES = {"appointment": "Appointment Letter", "experience": "Experience Letter", "card": "Employment Card"}


def _e(value) -> str:
    return html.escape(str(value or ""))


def _dash(value) -> str:
    """Escaped value, or an em dash when the field has no data.

    Statutory forms (Form XV) read badly with silently blank fields, so any
    missing scalar is shown as a dash rather than left empty.
    """
    text = _e(value).strip()
    return text or "—"


def _fmt(value) -> str:
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y")
    except AttributeError:
        return str(value)


def _fmt_dt(value) -> str:
    """Datetime as DD/MM/YYYY HH:mm (portal-wide format)."""
    if not value:
        return "—"
    try:
        return value.strftime("%d/%m/%Y %H:%M")
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
  @page {
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:#fff; color:#111827; font-family: "Noto Sans", Arial, sans-serif; font-size: 11px; }
  .page { width:100%; margin:0 auto; }
  .brand { display:table; width:100%; border-bottom:3px solid #073B67; padding-bottom:8px; margin-bottom:6px; }
  .brand-left { display:table-cell; vertical-align:middle; }
  .brand-right { display:table-cell; text-align:right; vertical-align:middle; }
  .brand strong { color:#073B67; font-size:16px; letter-spacing:.3px; display:block; }
  .brand span { font-size:9px; color:#6b7280; letter-spacing:1.4px; text-transform:uppercase; }
  h1 { text-align:center; color:#073B67; font-size:17px; letter-spacing:1px; margin:12px 0 4px; border-bottom:2px double #F47A32; padding-bottom:6px; text-transform:uppercase; }
  .meta { display:table; width:100%; font-size:11px; color:#374151; margin:8px 0 12px; }
  .meta-left { display:table-cell; text-align:left; }
  .meta-right { display:table-cell; text-align:right; }
  h3 { color:#073B67; font-size:12px; margin:12px 0 4px; border-bottom:1px solid #d1d5db; padding-bottom:3px; page-break-after:avoid; }
  p, li { font-size:11px; line-height:1.5; margin:6px 0; text-align:justify; }
  .kv { width:100%; border-collapse:collapse; font-size:11px; margin:4px 0 10px; page-break-inside:avoid; }
  .kv td { border:1px solid #9aa4b2; padding:4px 7px; vertical-align:top; }
  .kv td:first-child { background:#F0F4FA; color:#073B67; width:34%; font-weight:600; }
  .sign { display:table; width:100%; margin:32px 0 6px; page-break-inside:avoid; }
  .sign-col { display:table-cell; width:33.33%; text-align:center; font-size:10px; vertical-align:top; }
  .sign .line { border-top:1px solid #4b5563; width:80%; margin:30px auto 4px; padding-top:4px; font-weight:600; }
  .sign .id { font-size:9px; color:#6b7280; font-family:monospace; margin-top:2px; }
  .foot { margin-top:14px; border-top:1px solid #e5e7eb; padding-top:6px; font-size:9px; color:#6b7280; text-align:center; }
  .expired-wm { position: fixed; top: 38%; left: -12%; width: 124%; text-align: center; transform: rotate(-24deg); font-size: 96px; font-weight: 900; letter-spacing: 14px; color: rgba(220, 38, 38, 0.14); z-index: 9999; }
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


def _cell(text, width: str = "") -> str:
    """One bordered table cell; ``width`` is an optional CSS percentage."""
    style = "padding:4px;border:1px solid #334155"
    if width:
        style += f";width:{width}"
    return f'<th style="{style}">{text}</th>'


def _cell_td(text, width: str = "") -> str:
    style = "padding:5px;border:1px solid #334155"
    if width:
        style += f";width:{width}"
    return f'<td style="{style}">{text}</td>'


def _cells(cells: list) -> str:
    return "".join(_cell_td(c[0], c[1]) if isinstance(c, tuple) else _cell_td(c)
                   for c in cells)


def _block_table(headers: list, row, cls: str = "") -> str:
    """Bordered table used by the optional block tokens.

    ``row`` may be a single list of cells, or a list of such lists for a
    multi-row table. A cell is text, or a ``(text, width%)`` tuple.
    """
    cls_attr = f' class="{cls}"' if cls else ""
    th = "".join(_cell(h[0], h[1]) if isinstance(h, tuple) else _cell(h) for h in headers)
    if not isinstance(row, (list, tuple)) or (row and not isinstance(row[0], (list, tuple))):
        row = [row]
    body = "".join(f"<tr>{_cells(r)}</tr>" for r in row)
    return (f'<table{cls_attr} style="width:100%;border-collapse:collapse;margin:12px 0;'
            f'font-size:10px;text-align:center;border:1px solid #334155">'
            f"<thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>")


def _letter_tokens(binding, letter_type: str, logo_url: str = "") -> dict:
    """Values injected into an admin-authored HTML template. Tokens are written
    as {{token}} (or {{ token }}) — values are HTML-escaped by the facts helpers."""
    w = _worker_facts(binding.worker)
    p = _party_facts(binding)
    ref = bss_ids.letter_bss_id(binding.id, letter_type)
    issue = _fmt_dt(binding.accepted_at or binding.created_at)
    # Form XV asks for the period of employment, which ends on the relieving date.
    relieving = _fmt(getattr(binding, "unbound_at", None) or binding.accepted_at
                     or binding.created_at)
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

    # Statutory Form XV period-of-employment table.
    form_xv_table = _block_table(
        headers=[("Sl. No.", "6%"), "Total period for which employed",
                 ("Nature of work done", "24%"),
                 ("Rate of wages (with particulars of unit in case of piece-work)", "40%"),
                 ("Remarks", "18%")],
        row=["1", f"{_dash(w['doj'])} &ndash; {_dash(relieving)}",
             _dash(w["department"]), f"{_dash(wage)} per month", "Satisfactory service"],
        cls="xv-table")

    # Employment grid (contractor / employer / site).
    employment_grid = _block_table(
        headers=["Particulars", "Details"],
        row=[["Contractor / Service Provider",
              f"{p['contractor']} ({_dash(p['contractorBss'])})"],
             ["Principal Employer", f"{p['employer']} ({_dash(employer_bss_id)})"],
             ["Project Site & Address", f"{_dash(p['site'])}, {_dash(p['siteAddr'])}"]])
    employment_grid = employment_grid.replace(
        '<th style="padding:4px;border:1px solid #334155">Particulars</th>',
        '<th style="padding:4px;border:1px solid #334155;background:#F0F4FA;'
        'color:#073B67;text-align:left;width:35%">Particulars</th>').replace(
        '<th style="padding:4px;border:1px solid #334155">Details</th>',
        '<th style="padding:4px;border:1px solid #334155;text-align:left">Details</th>')

    # Relieving clearance checklist.
    relieving_clearance = _block_table(
        headers=["Clearance Category", "Status", "Remarks"],
        row=[["Site Equipment &amp; PPE Assets", "Cleared", "All issued items returned"],
             ["Full &amp; Final Wage Settlement", "Cleared", "All wages and dues paid"],
             ["Gate Pass &amp; ID Credentials", "Surrendered", "Identity card surrendered"],
             ["Notice Period &amp; Conduct", "Satisfactory", "Good conduct during service"]])

    return {
        "letterTitle": _e(LETTER_NAMES.get(letter_type, "Letter")),
        "refNo": _e(ref),
        "issueDate": _e(issue),
        "workerName": w["name"], "workerBssId": w["bssId"],
        "fatherName": _dash(w["father"]),
        "dob": w["dob"], "gender": _dash(w["gender"]), "mobile": _dash(w["mobile"]),
        "address": _dash(w["address"]),
        # No identification-marks field exists on the worker identity record, so
        # this always renders as a dash until one is added.
        "identificationMarks": _dash(w.get("identificationMarks", "")),
        "designation": _dash(w["designation"]), "department": _dash(w["department"]),
        "doj": w["doj"],
        "wage": _e(wage),
        "costSheetCode": _e(cs_code),
        "costSheetName": _e(cs_name),
        "costSheetCategory": _e(cs_cat),
        "costSheetGrade": _e(cs_grade),
        # Block-level tokens stay blank when there is nothing to show.
        "costSheetSection": salary_table,
        "salaryBreakdownTable": salary_table,
        "formXVTable": form_xv_table,
        "employmentGridTable": employment_grid,
        "relievingClearanceTable": relieving_clearance,
        "relievingDate": _dash(relieving),
        "ctc": _money(ctc_val),
        "epfEmployer": _money(epf_val),
        "esicEmployer": _money(esic_val),
        "netTakeHome": _money(takehome_val),
        "contractorName": p["contractor"], "contractorBssId": _dash(p["contractorBss"]),
        "contractorAddress": _dash(p["contractorAddr"]),
        "employerName": p["employer"],
        "employerBssId": _dash(employer_bss_id),
        "siteName": _dash(p["site"]), "siteAddress": _dash(p["siteAddr"]),
        "logoUrl": letter_brand.ensure_logo_url(logo_url, letter_type),
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


def _render_template_html(html_text: str, tokens: dict, letter_type: str = "APPOINTMENT") -> str:
    # Normalise the page box first (older templates hardcode a 794px width that
    # overflows the PDF page box). Branding is skipped for statutory types such
    # as EXPERIENCE, which must stay free of any BSS logo or wordmark.
    out = letter_brand.ensure_letter_html(html_text, letter_type)
    for key, value in tokens.items():
        out = out.replace("{{" + key + "}}", value).replace("{{ " + key + " }}", value)
    return out


def _render_card(binding) -> str:
    """A frozen Employment Card snapshot, issued when an engagement ends and
    kept in the worker's Employment History."""
    w = _worker_facts(binding.worker)
    p = _party_facts(binding)
    ref = bss_ids.letter_bss_id(binding.id, "card")
    issued = _fmt_dt(binding.accepted_at or binding.created_at)
    relieved = _fmt(getattr(binding, "unbound_at", None))
    body = f"""
    <div class="expired-wm">EXPIRED</div>
    <h1>Employment Card</h1>
    <div class="meta"><span>Card No.: {ref}</span><span>Issued: {issued}</span></div>
    <table class="kv">
      <tr><td>Worker Name</td><td>{w['name']}</td></tr>
      <tr><td>BSS Worker ID</td><td>{w['bssId']}</td></tr>
      <tr><td>Father's Name</td><td>{_dash(w['father'])}</td></tr>
      <tr><td>Date of Birth</td><td>{w['dob']}</td></tr>
      <tr><td>Designation</td><td>{_dash(w['designation'])}</td></tr>
      <tr><td>Department / Unit</td><td>{_dash(w['department'])}</td></tr>
      <tr><td>Contractor / Service Provider</td><td>{p['contractor']} ({_dash(p['contractorBss'])})</td></tr>
      <tr><td>Principal Employer</td><td>{p['employer']}</td></tr>
      <tr><td>Site</td><td>{_dash(p['site'])}</td></tr>
      <tr><td>Date of Joining</td><td>{w['doj']}</td></tr>
      <tr><td>Date of Relieving</td><td>{relieved}</td></tr>
      <tr><td>Record Status</td><td>Frozen — engagement closed</td></tr>
    </table>
    <p>This Employment Card is a frozen snapshot of the engagement, retained in the worker's Employment History.</p>
    <div class="sign">
      <div><div class="line">{p['contractor']}</div>Contractor / Authorized Signatory</div>
    </div>
    """
    return _shell(f"Employment Card — {w['name']}", body)


def render_letter(binding, letter_type: str) -> str:
    if letter_type == "card":
        return _render_card(binding)
    template = _resolve_letter_template(binding, letter_type)
    if template is not None:
        return _render_template_html(
            template.html,
            _letter_tokens(binding, letter_type, getattr(template, "logo_url", "") or ""),
            letter_type)
    w = _worker_facts(binding.worker)
    p = _party_facts(binding)
    ref = bss_ids.letter_bss_id(binding.id, letter_type)
    issue = _fmt_dt(binding.accepted_at or binding.created_at)
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
