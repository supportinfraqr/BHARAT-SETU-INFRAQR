"""Folder-based AI audit for the **global compliance** report.

Each generation builds a private workspace (never web-served):

    <BSS_AUDIT_WORKSPACE_DIR>/<report-id>/
        source_documents/<area>/<files…>     # generated CLRA + compliance uploads
        groundtruth_data/<area>.json          # live BSS data (the "truth")
        audit_brief.json                      # areas + audit steps for the agent

The whole folder is handed to a **multimodal** AI agent (it *sees* every file —
images natively, PDF pages rasterized to images; no OCR) which writes the report.

Global areas are audited from live BSS data only (no CLRA/submitted docs).
"""

# ruff: noqa: F401,F403
from .common import *
from .ai_audit import _default_credential, _parse_json_block

import base64
import html as _html
import io
import json
import os

_MAX_PAGES = 12
_RENDER_SCALE = 1.6


# ── global audit areas (extensible — more will be added) ─────────────────────
def _areas():
    from . import audit_workspace as _self

    return [
        {
            "key": "AGREEMENT", "label": "Agreement Copy",
            "objective": "Verify validity of the contract between Principal Employer and Contractor.",
            "steps": [
                "Collect signed agreement copy.",
                "Verify agreement validity period.",
                "Check start date and end date.",
                "Verify signatures and company seals of both parties.",
                "Review scope of work mentioned.",
                "Verify manpower deployment clause.",
                "Check compliance clauses (PF, ESI, Bonus, Gratuity, Labour Laws).",
                "Record observations.",
            ],
            "collect": _self._collect_agreement,
        },
        {
            "key": "LABOUR_LICENSE_RENEWAL", "label": "Labour License Renewal (Form VII)",
            "objective": "Verify the labour-licence renewal (Form VII) and current deployment.",
            "steps": [
                "Verify renewal application.",
                "Check renewal date.",
                "Verify acknowledgement receipt.",
                "Confirm renewed license validity.",
                "Match manpower limit with current deployment.",
            ],
            "collect": _self._collect_licence_renewal,
        },
    ]


# ── workspace filesystem ─────────────────────────────────────────────────────
def _private_root():
    root = (getattr(settings, "BSS_AUDIT_WORKSPACE_DIR", "")
            or os.path.join(str(settings.BASE_DIR), "audit_workspaces"))
    os.makedirs(root, mode=0o700, exist_ok=True)
    try:
        os.chmod(root, 0o700)
    except OSError:
        pass
    return root


def _file_bytes(field):
    try:
        field.open("rb")
        data = field.read()
        field.close()
        return data or b""
    except Exception:  # noqa: BLE001
        return b""


def _pdf_pages(data, limit=_MAX_PAGES):
    """Rasterize a PDF to per-page PNG bytes (images only — no OCR)."""
    import pypdfium2 as pdfium

    out = []
    doc = pdfium.PdfDocument(io.BytesIO(data))
    try:
        for i in range(min(len(doc), limit)):
            page = doc[i]
            try:
                pil = page.render(scale=_RENDER_SCALE).to_pil().convert("RGB")
            finally:
                page.close()
            buf = io.BytesIO()
            pil.save(buf, format="PNG")
            out.append(buf.getvalue())
    finally:
        doc.close()
    return out


def _images_from_doc(name, data):
    """Turn one source document into PNG image bytes for the vision agent."""
    low = (name or "").lower()
    if data[:5] == b"%PDF-" or low.endswith(".pdf"):
        try:
            return _pdf_pages(data)
        except Exception:  # noqa: BLE001
            return []
    if data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n":
        return [data]
    return []


def _doc_images(name, data):
    """(label, png) pairs for one source document — pages labelled for the agent."""
    pages = _images_from_doc(name, data)
    total = len(pages)
    return [(f"{name} (page {i + 1}/{total})" if total > 1 else name, p)
            for i, p in enumerate(pages)]


def _checks_to_steps(ai_checks):
    """The admin-defined AI checkpoints (points) as agent conditions."""
    out = []
    for c in (ai_checks or []):
        if isinstance(c, dict) and str(c.get("label") or "").strip():
            out.append(str(c["label"]).strip())
        elif isinstance(c, str) and c.strip():
            out.append(c.strip())
    return out


def _doc_text(name, data):
    """Text content for non-image documents (spreadsheets/csv) — no OCR, just the
    cell values so the agent can read the file like any other document."""
    low = (name or "").lower()
    try:
        if low.endswith((".xlsx", ".xlsm")):
            from openpyxl import load_workbook

            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
            lines = []
            for ws in wb.worksheets:
                lines.append(f"[sheet: {ws.title}]")
                for i, row in enumerate(ws.iter_rows(values_only=True)):
                    if i >= 500:
                        lines.append("… (truncated)")
                        break
                    lines.append("\t".join("" if v is None else str(v) for v in row))
            return "\n".join(lines)[:60000]
        if low.endswith((".csv", ".txt")):
            return data.decode("utf-8", "ignore")[:60000]
    except Exception:  # noqa: BLE001
        return None
    return None


def _ingest(name, data, images, texts):
    """Route one source document: images for the vision agent, or text for
    spreadsheets/csv (so the agent still sees the content, without OCR)."""
    imgs = _doc_images(name, data)
    if imgs:
        images.extend(imgs)
        return
    text = _doc_text(name, data)
    if text:
        texts.append(f"### Document: {name}\n{text}")


# ── scope helpers ────────────────────────────────────────────────────────────
def _scope_contractors(user):
    from bss_core.models import ContractorEmployerBinding, User

    if user.role == "contractor":
        return [user]
    if user.role == "employer":
        ids = (ContractorEmployerBinding.objects
               .filter(employer=user, binding_status="ACCEPTED")
               .values_list("contractor_id", flat=True))
        return list(User.objects.filter(id__in=list(ids)))
    return list(User.objects.filter(role="contractor"))


def _deployment(contractor, site=None):
    from bss_core.models import WorkerContractorBinding

    qs = WorkerContractorBinding.objects.filter(contractor=contractor, binding_status="ACCEPTED")
    if site is not None:
        qs = qs.filter(site=site)
    return qs.count()


# ── area collectors ──────────────────────────────────────────────────────────
def _collect_agreement(contractors, site_name=None):
    from bss_core.models import ContractorSiteDocument, PartyContract

    docs, facts = [], []
    for c in contractors:
        qs = (ContractorSiteDocument.objects
              .filter(contractor=c, doc_type="AGREEMENT", is_current=True)
              .select_related("site", "site__employer"))
        if site_name:
            qs = qs.filter(site__site_name__iexact=site_name)
        for d in qs:
            site = d.site
            docs.append((f"agreement_c{c.id}_s{getattr(site, 'id', 0)}_v{d.version}.pdf",
                         _file_bytes(d.file) if d.file else b""))
            facts.append({
                "contractor": payloads._party_name(c),
                "principalEmployer": (payloads._party_name(site.employer)
                                      if site and site.employer_id else ""),
                "site": getattr(site, "site_name", ""),
                "agreementVersion": d.version,
                "uploadedAt": d.uploaded_at.date().isoformat() if d.uploaded_at else "",
                "currentDeployment": _deployment(c, site),
            })
        for pc in PartyContract.objects.filter(party_user=c, is_active=True):
            facts.append({
                "contractor": payloads._party_name(c),
                "workOrderNo": getattr(pc, "work_order_no", ""),
                "startDate": str(getattr(pc, "start_date", "") or ""),
                "endDate": str(getattr(pc, "end_date", "") or ""),
            })
    return {"documents": docs, "groundtruth": {"agreements": facts}}


def _collect_licence_renewal(contractors, site_name=None):
    from bss_core.models import PartyLicense

    docs, facts = [], []
    for c in contractors:
        for rec in PartyLicense.objects.filter(user=c).select_related("license"):
            if rec.file:
                docs.append((f"licence_c{c.id}_{rec.id}_{rec.file_name or 'licence'}",
                             _file_bytes(rec.file)))
            facts.append({
                "contractor": payloads._party_name(c),
                "licence": rec.license.license_name if rec.license_id else "",
                "number": rec.license_number,
                "validFrom": rec.valid_from.isoformat() if rec.valid_from else "",
                "validTo": rec.valid_to.isoformat() if rec.valid_to else "",
                "status": rec.status,
                "currentDeployment": _deployment(c),
            })
    return {"documents": docs, "groundtruth": {"licences": facts}}


def _collect_submission(report):
    """The submission content: generated CLRA registers + uploaded compliance docs.

    Only added to the workspace for a SUBMISSION report — a GLOBAL report has
    ``source_documents`` limited to the global areas."""
    from bss_core.models import ComplianceBatch, SubmissionEvidence

    contractor = report.employer or report.requested_by
    docs, registers, uploads = [], [], []
    meta = {
        "contractor": payloads._party_name(contractor) if contractor else "",
        "site": report.site_name, "period": report.period,
        "financialYear": report.financial_year, "uniqueNo": report.unique_no,
    }
    batch_ids = [int(x) for x in (report.batch_ids or []) if str(x).isdigit()]
    for b in ComplianceBatch.objects.filter(id__in=batch_ids).select_related("site"):
        for fname, label in (("master_file", "master"), ("generated_file", "register"),
                             ("signature_file", "signature")):
            field = getattr(b, fname, None)
            if field:
                data = _file_bytes(field)
                if data:
                    docs.append((f"clra_b{b.id}_{label}_{os.path.basename(field.name)}", data))
        registers.append({
            "site": getattr(b.site, "site_name", "") if b.site else "", "month": b.month,
            "year": b.year, "version": b.version, "status": b.status,
            "employeeCount": b.employee_count,
        })
    for ev in SubmissionEvidence.objects.filter(user=contractor, unique_no=report.unique_no):
        if ev.file:
            data = _file_bytes(ev.file)
            if data:
                docs.append((f"upload_{ev.id}_{ev.original_name or 'document'}", data))
        uploads.append({"name": ev.doc_type or ev.document_type or "Document",
                        "fileName": ev.original_name, "status": ev.status})
    meta["registers"] = registers
    meta["uploads"] = uploads
    return {"documents": docs, "groundtruth": meta}


def _submission_areas(report):
    """Submission items → AI-audit areas, using the **existing admin
    checkpoints** as the conditions: Additional Forms (``CustomFormName.ai_checks``)
    for uploaded documents, and each register template's ``ai_checks`` for the
    generated CLRA registers."""
    from bss_core.models import (ComplianceBatch, CustomFormName, RegisterTemplate,
                                 SubmissionEvidence)

    contractor = report.employer or report.requested_by
    state = (report.state or "").strip()
    areas = []

    # Generated CLRA registers — the register template's own checkpoints.
    batch_ids = [int(x) for x in (report.batch_ids or []) if str(x).isdigit()]
    tids = set()
    for b in ComplianceBatch.objects.filter(id__in=batch_ids):
        for tid in (b.register_audits or {}).keys():
            if str(tid).isdigit():
                tids.add(int(tid))
    for t in RegisterTemplate.objects.filter(id__in=tids):
        steps = _checks_to_steps(t.ai_checks)
        if not steps:
            continue
        areas.append({
            "key": f"REGISTER_{t.id}",
            "label": f"{t.form_code} · {t.title}".strip(" ·"),
            "objective": f"Audit the generated register {t.title or t.form_code} "
                         f"({t.form_code}, {t.state}).",
            "steps": steps,
            "groundtruth": {"kind": "register", "formCode": t.form_code,
                            "title": t.title, "state": t.state},
        })

    # Uploaded compliance documents — Additional Forms checkpoints.
    for ev in SubmissionEvidence.objects.filter(user=contractor, unique_no=report.unique_no):
        form_key = (ev.document_type or ev.doc_type or "").strip()
        steps, label = [], (ev.doc_type or ev.document_type or "Document")
        if form_key:
            form = (CustomFormName.objects.filter(is_active=True, name__iexact=form_key)
                    .filter(Q(state__iexact=state) | Q(state="")).first())
            if form and form.ai_checks:
                steps = _checks_to_steps(form.ai_checks)
                label = form.name
            else:
                tpl = (RegisterTemplate.objects.filter(is_active=True)
                       .filter(Q(form_code__iexact=form_key) | Q(title__iexact=form_key)).first())
                if tpl and tpl.ai_checks:
                    steps = _checks_to_steps(tpl.ai_checks)
                    label = tpl.title or tpl.form_code
        if not steps:
            continue
        areas.append({
            "key": f"UPLOAD_{ev.id}",
            "label": label,
            "objective": f"Audit the uploaded document {label}.",
            "steps": steps,
            "groundtruth": {"kind": "upload",
                            "documentType": ev.document_type or ev.doc_type,
                            "fileName": ev.original_name},
        })
    return areas


# ── workspace build ──────────────────────────────────────────────────────────
def build_workspace(report):
    """Create the private folder and write source_documents + groundtruth_data.

    One method for both report kinds — a GLOBAL report carries the global areas
    only; a SUBMISSION report additionally carries the generated CLRA registers
    and uploaded compliance documents."""
    root = os.path.join(_private_root(), f"report-{report.id}")
    src_root = os.path.join(root, "source_documents")
    gt_root = os.path.join(root, "groundtruth_data")
    os.makedirs(src_root, mode=0o700, exist_ok=True)
    os.makedirs(gt_root, mode=0o700, exist_ok=True)
    try:
        os.chmod(root, 0o700)
        os.chmod(src_root, 0o700)
        os.chmod(gt_root, 0o700)
    except OSError:
        pass

    requester = report.requested_by or report.employer
    contractors = _scope_contractors(requester) if requester else []
    site_name = report.site_name or (report.ai_report or {}).get("site") or ""
    areas_meta, images, extra_texts = [], [], []

    for area in _areas():
        collected = area["collect"](contractors, site_name or None)
        area_dir = os.path.join(src_root, area["key"])
        os.makedirs(area_dir, mode=0o700, exist_ok=True)
        for name, data in collected["documents"]:
            safe = os.path.basename(name) or "document"
            if data:
                with open(os.path.join(area_dir, safe), "wb") as fh:
                    fh.write(data)
                _ingest(safe, data, images, extra_texts)
        with open(os.path.join(gt_root, f"{area['key']}.json"), "w") as fh:
            json.dump(collected["groundtruth"], fh, indent=2, default=str)
        areas_meta.append({
            "key": area["key"], "label": area["label"],
            "objective": area["objective"], "steps": area["steps"],
            "groundtruth": collected["groundtruth"],
            "documents": [n for n, _ in collected["documents"]],
        })

    # SUBMISSION reports also carry the CLRA registers + uploaded compliance docs.
    if report.report_kind == "SUBMISSION":
        sub = _collect_submission(report)
        area_dir = os.path.join(src_root, "SUBMISSION")
        os.makedirs(area_dir, mode=0o700, exist_ok=True)
        for name, data in sub["documents"]:
            safe = os.path.basename(name) or "document"
            if data:
                with open(os.path.join(area_dir, safe), "wb") as fh:
                    fh.write(data)
                _ingest(safe, data, images, extra_texts)
        with open(os.path.join(gt_root, "SUBMISSION.json"), "w") as fh:
            json.dump(sub["groundtruth"], fh, indent=2, default=str)
        extra_texts.append(
            "Submitted CLRA registers + uploaded compliance documents (context):\n"
            + json.dumps(sub["groundtruth"], indent=2, default=str))
        # One audit area per generated register / uploaded document, using the
        # existing admin checkpoints as the conditions.
        for area in _submission_areas(report):
            areas_meta.append({**area, "documents": []})

    with open(os.path.join(root, "audit_brief.json"), "w") as fh:
        json.dump({"areas": areas_meta}, fh, indent=2, default=str)

    report.workspace = root
    report.save(update_fields=["workspace", "updated_at"])
    return areas_meta, images, extra_texts


# ── multimodal agent call ────────────────────────────────────────────────────
def _call_vision(cred, system, prompt, images, texts, timeout=180):
    """``images`` is a list of ``(label, png_bytes)`` pairs; the label is included
    in a numbered index so the agent knows which image is which document."""
    import requests

    from bss_core.models import AI_PROVIDERS

    provider = cred.provider
    key = cred.get_api_key()
    model = cred.model
    base = (cred.base_url or AI_PROVIDERS.get(provider, {}).get("baseUrl", "")).rstrip("/")
    index = ""
    if images:
        index = ("Source document images (in order, each labelled):\n"
                 + "\n".join(f"  {i}. {label}" for i, (label, _b) in enumerate(images, 1)))
    joined = prompt
    if index:
        joined += "\n\n" + index
    if texts:
        joined += "\n\n" + "\n\n".join(t for t in texts if t)
    if provider == "anthropic":
        content = [{"type": "text", "text": joined}]
        for _label, img in images:
            content.append({"type": "image", "source": {
                "type": "base64", "media_type": "image/png",
                "data": base64.b64encode(img).decode()}})
        resp = requests.post(f"{base or 'https://api.anthropic.com'}/v1/messages",
                             headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                                      "Content-Type": "application/json"},
                             json={"model": model, "max_tokens": 4000, "system": system,
                                   "messages": [{"role": "user", "content": content}]},
                             timeout=(10, timeout))
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]
    if provider == "google":
        parts = [{"text": joined}]
        for _label, img in images:
            parts.append({"inline_data": {"mime_type": "image/png",
                                          "data": base64.b64encode(img).decode()}})
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
            json={"system_instruction": {"parts": [{"text": system}]},
                  "contents": [{"parts": parts}]}, timeout=(10, timeout))
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    # OpenAI-compatible (openai / groq / mistral / openrouter / custom / azure)
    ucontent = [{"type": "text", "text": joined}]
    for _label, img in images:
        ucontent.append({"type": "image_url", "image_url": {
            "url": "data:image/png;base64," + base64.b64encode(img).decode()}})
    if provider == "azure":
        url = f"{base}/openai/deployments/{model}/chat/completions?api-version=2024-02-15-preview"
        headers = {"api-key": key, "Content-Type": "application/json"}
    else:
        url = f"{base}/chat/completions"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json={
        "model": model, "temperature": 0, "max_tokens": 4000,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": ucontent}]}, timeout=(10, timeout))
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _agent_prompt(areas_meta):
    lines = []
    for area in areas_meta:
        lines.append(f"Audit area: {area['label']} (key {area['key']})\n"
                     f"Objective: {area['objective']}")
        lines.append("Audit steps:")
        for i, s in enumerate(area["steps"], 1):
            lines.append(f"  {i}. {s}")
    return "\n".join(lines)


def run_report(report_id):
    """Async job: build the workspace, ask the multimodal agent, store the report.

    One method for both kinds — GLOBAL (global areas only) and SUBMISSION
    (global + CLRA registers + uploaded compliance documents)."""
    from bss_core.models import ComplianceReport

    report = ComplianceReport.objects.filter(pk=report_id).first()
    if report is None:
        return
    try:
        report.status = "RUNNING"
        report.save(update_fields=["status", "updated_at"])
        areas_meta, images, extra_texts = build_workspace(report)

        texts = []
        for a in areas_meta:
            texts.append(f"### {a['label']}\n" + "\n".join(a["steps"]))
            texts.append("Ground truth (live BSS data):\n"
                         + json.dumps(a["groundtruth"], indent=2, default=str))
        texts.extend(extra_texts)

        system = (
            "You are a strict Indian labour-law compliance auditor for Bharat Shram Setu. "
            "You are given source documents (as images) and ground-truth data. Evaluate EACH "
            "audit step against the evidence and reply ONLY with a compact JSON object."
        )
        prompt = (
            _agent_prompt(areas_meta)
            + "\n\nFor every audit step assign a compliance status ∈ "
            "{Complied, Partially Complied, Non-Complied, Document Not Available} "
            "(use Document Not Available when the required document/evidence is not provided), "
            "a short observation and a risk ∈ {High, Medium, Low}. Compute an area status and an "
            "overall verdict. Return JSON with exactly: "
            '{"summary":"one line","verdict":"Passed|Passed with observations|Needs attention",'
            '"areas":[{"key":"...","label":"...",'
            '"status":"Complied|Partially Complied|Non-Complied|Document Not Available",'
            '"steps":[{"step":"...",'
            '"status":"Complied|Partially Complied|Non-Complied|Document Not Available",'
            '"observation":"...","risk":"High|Medium|Low"}]}]}'
        )

        cred = _default_credential()
        if cred is None or not cred.has_key:
            report.status = "FAILED"
            report.error_message = "No AI provider is configured (Admin → AI Audit Settings)."
            report.save(update_fields=["status", "error_message", "updated_at"])
            return
        raw = _call_vision(cred, system, prompt, images, texts)
        data = _parse_json_block(raw) or {"summary": "", "areas": []}
        report.ai_report = data
        report.ai_html = _render_html(report, data)
        report.status = "READY"
        report.error_message = ""
        report.save(update_fields=["ai_report", "ai_html", "status", "error_message", "updated_at"])
    except Exception as exc:  # noqa: BLE001 — background job
        try:
            report.status = "FAILED"
            report.error_message = str(exc)[:500]
            report.save(update_fields=["status", "error_message", "updated_at"])
        except Exception:  # noqa: BLE001
            pass
    finally:
        from django.db import connections
        connections.close_all()


def _default_credential_or_none():
    """Deprecated shim — kept for import stability."""
    return _default_credential()


def schedule_report(report_id):
    import threading

    from django.db import transaction

    def _start():
        threading.Thread(target=run_report, args=(report_id,), daemon=True).start()

    transaction.on_commit(_start)


# Back-compat aliases (the pipeline is a single method for both report kinds).
run_global_report = run_report
schedule_global_report = schedule_report


# ── HTML ─────────────────────────────────────────────────────────────────────
# The four audit statuses the report groups observations under, and the risk
# levels. Agent output is normalised into these buckets.
AUDIT_STATUSES = ["Complied", "Partially Complied", "Non-Complied", "Document Not Available"]
RISK_LEVELS = ["High", "Medium", "Low"]
_STATUS_CLASS = {"complied": "ok", "partially complied": "warn",
                 "non-complied": "bad", "document not available": "na"}
_STATUS_ALIASES = {
    "complied": "Complied", "pass": "Complied", "passed": "Complied", "ok": "Complied",
    "partial": "Partially Complied", "partially": "Partially Complied",
    "partially complied": "Partially Complied",
    "non-complied": "Non-Complied", "non complied": "Non-Complied",
    "noncomplied": "Non-Complied", "not complied": "Non-Complied",
    "fail": "Non-Complied", "failed": "Non-Complied",
    "document not available": "Document Not Available", "not applicable": "Document Not Available",
    "notapplicable": "Document Not Available", "n/a": "Document Not Available",
    "na": "Document Not Available", "missing": "Document Not Available",
}
_RISK_ALIASES = {"high": "High", "critical": "High", "crit": "High",
                 "medium": "Medium", "med": "Medium", "low": "Low"}


def _canon_status(value):
    return _STATUS_ALIASES.get(str(value or "").strip().lower(), "Document Not Available")


def _canon_risk(value):
    return _RISK_ALIASES.get(str(value or "").strip().lower(), "Low")


def _badge(text, kind):
    cls = _STATUS_CLASS.get(str(text or "").strip().lower(), "na") if kind == "status" else \
        {"high": "bad", "medium": "warn", "low": "ok"}.get(str(text or "").strip().lower(), "na")
    return f"<span class='badge {cls}'>{_esc(text)}</span>"


def _esc(value):
    return _html.escape(str(value if value not in (None, "") else "—"))


def _render_html(report, data):
    """The Final Audit Report — observations grouped under the four audit
    statuses, each with a High/Medium/Low risk level, plus a risk summary."""
    areas = (data or {}).get("areas") or []

    buckets = {s: [] for s in AUDIT_STATUSES}
    risks = {r: 0 for r in RISK_LEVELS}
    area_blocks = []

    for area in areas:
        label = area.get("label") or area.get("key")
        rows = []
        for st in (area.get("steps") or []):
            status = _canon_status(st.get("status"))
            risk = _canon_risk(st.get("risk"))
            risks[risk] += 1
            obs = str(st.get("observation") or "")
            step = str(st.get("step") or "")
            buckets[status].append({"area": label, "step": step, "obs": obs, "risk": risk})
            rows.append(
                "<tr>"
                f"<td class='step'>{_esc(step)}</td>"
                f"<td class='status'>{_badge(status, 'status')}</td>"
                f"<td class='risk'>{_badge(risk, 'risk')}</td>"
                f"<td class='obs'>{_esc(obs)}</td>"
                "</tr>")
        area_blocks.append(
            f"<h2>{_esc(label)} {_badge(_canon_status(area.get('status')), 'status')}</h2>"
            "<table class='lines'><thead><tr><th>Audit Step</th><th>Compliance Status</th>"
            "<th>Risk</th><th>Observation</th></tr></thead>"
            f"<tbody>{''.join(rows) or '<tr><td colspan=4>No steps returned.</td></tr>'}</tbody></table>")

    # Observations grouped under the four statuses.
    group_sections = []
    for status in AUDIT_STATUSES:
        items = buckets[status]
        if not items:
            continue
        rows = "".join(
            "<tr>"
            f"<td class='area'>{_esc(it['area'])}</td>"
            f"<td class='step'>{_esc(it['step'])}</td>"
            f"<td class='obs'>{_esc(it['obs'])}</td>"
            f"<td class='risk'>{_badge(it['risk'], 'risk')}</td>"
            "</tr>" for it in items)
        group_sections.append(
            f"<h3 class='grp'>{_esc(status)} <span class='cnt'>{len(items)}</span></h3>"
            "<table class='lines'><thead><tr><th>Area</th><th>Audit Step / Point</th>"
            "<th>Observation</th><th>Risk</th></tr></thead>"
            f"<tbody>{rows}</tbody></table>")

    total_items = sum(len(v) for v in buckets.values())
    kpi = "".join(
        f"<td><span class='n'>{len(buckets[s])}</span><span class='t'>{_esc(s)}</span></td>"
        for s in AUDIT_STATUSES)
    risk_kpi = "".join(
        f"<td><span class='n'>{risks[r]}</span><span class='t'>{_esc(r)} Risk</span></td>"
        for r in RISK_LEVELS)

    who = report.requested_by or report.employer
    kind = "Compliance Submission" if report.report_kind == "SUBMISSION" else "Global Compliance"
    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>BSS Final Audit Report</title>
<style>
 @page {{ size:A4 landscape; margin:12mm; }}
 body {{ font-family:'Helvetica Neue',Arial,sans-serif; color:#0f172a; font-size:10px; }}
 .brand {{ display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #073B67; padding-bottom:8px; }}
 .brand h1 {{ margin:0; font-size:18px; color:#073B67; }}
 .brand p {{ margin:2px 0 0; color:#64748b; font-size:10px; }}
 h2 {{ font-size:12px; color:#073B67; margin:16px 0 6px; border-bottom:1px solid #dbe3ee; padding-bottom:3px; }}
 h3.grp {{ font-size:11px; color:#fff; background:#073B67; padding:4px 8px; border-radius:4px; margin:16px 0 6px; }}
 h3.grp .cnt {{ background:#fff; color:#073B67; border-radius:99px; padding:0 6px; font-size:9px; }}
 table.kpi {{ border-collapse:collapse; width:100%; margin:6px 0 10px; }}
 table.kpi td {{ border:1px solid #dbe3ee; padding:6px 8px; text-align:center; }}
 table.kpi .n {{ display:block; font-size:15px; font-weight:800; color:#073B67; }}
 table.kpi .t {{ font-size:8px; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }}
 table.lines {{ border-collapse:collapse; width:100%; }}
 table.lines th, table.lines td {{ border:1px solid #dbe3ee; padding:4px 6px; vertical-align:top; font-size:9px; text-align:left; }}
 table.lines th {{ background:#073B67; color:#fff; }}
 .badge {{ display:inline-block; padding:1px 6px; border-radius:99px; font-weight:700; font-size:8px; border:1px solid currentColor; white-space:nowrap; }}
 .ok {{ color:#15803d; }} .bad {{ color:#b91c1c; }} .warn {{ color:#b45309; }} .na {{ color:#6b7280; }}
 .muted {{ color:#94a3b8; }} .foot {{ margin-top:16px; color:#94a3b8; font-size:8px; border-top:1px solid #e2e8f0; padding-top:8px; }}
</style></head><body>
 <div class="brand"><div><h1>Bharat Shram Setu — Final Audit Report</h1>
   <p>{_esc(kind)} · {_esc(who and payloads._party_name(who) or '')} · {_esc(report.created_at.date().isoformat() if report.created_at else '')}</p></div>
   <div style="text-align:right;color:#64748b">One Nation · One ID · One Platform<br/>
   <b>Verdict:</b> {_esc((data or {}).get('verdict'))}</div></div>
 <p><b>Executive summary:</b> {_esc((data or {}).get('summary'))}</p>
 <table class="kpi"><tr>{kpi}</tr></table>
 <table class="kpi"><tr>{risk_kpi}</tr></table>
 <h2>Observations</h2>
 {''.join(group_sections) or '<p class="muted">No observations returned by the AI agent.</p>'}
 <h2>Detailed findings by area</h2>
 {''.join(area_blocks) or '<p class="muted">No areas returned.</p>'}
 <div class="foot">Generated by the BSS AI audit agent from the private workspace ({_esc(str(getattr(report, 'workspace', '') or '')[:120])}). {total_items} audited point(s). For internal compliance use.</div>
</body></html>"""
