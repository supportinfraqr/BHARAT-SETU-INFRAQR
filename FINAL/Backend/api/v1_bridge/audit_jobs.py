"""Monthly contractor document audits.

The BSS backend builds a private job folder from employer-approved documents and
the contractor's bound workers, then launches the vendored BSS Document Audit
Agent as a separate process. The agent only receives folder paths and the active
AI provider key — it has no database credentials.
"""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

from cryptography.fernet import Fernet

from bss_core.models import (
    AiProviderCredential,
    AuditJob,
    AuditSchedule,
    ComplianceBatch,
    ComplianceReport,
    ContractorEmployerBinding,
    SubmissionEvidence,
    WorkerAddressMobility,
    WorkerBanking,
    WorkerContractorBinding,
    WorkerDocument,
    WorkerEmployment,
    WorkerIdentity,
    WorkerSocialSecurity,
    WorkerWelfareSafety,
)


class AuditJobError(Exception):
    pass


MONTHS = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}
STATE_CODES = {
    "andhra pradesh": "AP", "arunachal pradesh": "AR", "assam": "AS", "bihar": "BR",
    "chhattisgarh": "CG", "goa": "GA", "gujarat": "GJ", "haryana": "HR",
    "himachal pradesh": "HP", "jharkhand": "JH", "karnataka": "KA", "kerala": "KL",
    "madhya pradesh": "MP", "maharashtra": "MH", "manipur": "MN", "meghalaya": "ML",
    "mizoram": "MZ", "nagaland": "NL", "odisha": "OD", "punjab": "PB",
    "rajasthan": "RJ", "sikkim": "SK", "tamil nadu": "TN", "telangana": "TS",
    "tripura": "TR", "uttar pradesh": "UP", "uttarakhand": "UK", "west bengal": "WB",
    "andaman and nicobar islands": "AN", "chandigarh": "CH", "dadra and nagar haveli": "DN",
    "daman and diu": "DD", "delhi": "DL", "jammu and kashmir": "JK", "ladakh": "LA",
    "lakshadweep": "LD", "puducherry": "PY",
}


def _safe(value, limit=80):
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", str(value or "file")).strip("._") or "file"
    return text[:limit]


def _file_bytes(field):
    try:
        field.open("rb")
        data = field.read()
        field.close()
        return data or b""
    except Exception:  # noqa: BLE001
        return b""


def _state_code(value):
    text = str(value or "").strip()
    if len(text) == 2 and text.isalpha():
        return text.upper()
    return STATE_CODES.get(text.lower(), "")


def _parse_period(month, year=""):
    raw = str(month or "").strip()
    m = re.fullmatch(r"(20\d{2})-(\d{1,2})", raw)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
    else:
        mo = MONTHS.get(raw.lower()) or (int(raw) if raw.isdigit() and 1 <= int(raw) <= 12 else 0)
        y = int(str(year or "").strip()[:4]) if str(year or "").strip().isdigit() else 0
    if not mo or not y:
        raise AuditJobError("Select a valid month and year.")
    start = date(y, mo, 1)
    end = date(y + (1 if mo == 12 else 0), 1 if mo == 12 else mo + 1, 1) - timedelta(days=1)
    name = start.strftime("%B")
    fy_start = y if mo >= 4 else y - 1
    fy = f"{fy_start}-{str((fy_start + 1) % 100).zfill(2)}"
    return {"year": str(y), "month": name, "month_no": mo, "start": start, "end": end,
            "financial_year": fy, "wage_month": f"{y}-{mo:02d}"}


AGENT_PROVIDERS = {"deepseek", "openrouter"}


def _active_credential():
    cred = (AiProviderCredential.objects.filter(enabled=True, is_default=True).first()
            or AiProviderCredential.objects.filter(enabled=True).order_by("id").first())
    if cred is None or not cred.has_key:
        raise AuditJobError("No active AI provider is configured in BSS Admin.")
    provider = (cred.provider or "").lower()
    if provider not in AGENT_PROVIDERS:
        raise AuditJobError("The audit agent supports DeepSeek or OpenRouter as the active AI provider.")
    if provider == "openrouter" and not str(cred.model or "").strip():
        raise AuditJobError("OpenRouter needs a model selected in Admin → AI Audit Settings.")
    return cred


def _agent_env(cred):
    """Provider-neutral environment for the vendored audit agent."""
    from bss_core.models import AI_PROVIDERS

    provider = (cred.provider or "").lower()
    base = (cred.base_url or AI_PROVIDERS.get(provider, {}).get("baseUrl", "")).rstrip("/")
    env = {
        "BSS_AI_PROVIDER": provider,
        "BSS_AI_PROVIDER_LABEL": AI_PROVIDERS.get(provider, {}).get("label", provider),
        "BSS_AI_API_KEY": cred.get_api_key(),
        "BSS_AI_BASE_URL": base,
    }
    if provider == "openrouter":
        env["BSS_AI_MODEL"] = str(cred.model or "").strip()
        env["BSS_AI_REFERER"] = "https://login.bharatshramsetu.com"
        env["BSS_AI_TITLE"] = "Bharat Shram Setu Audit"
    else:
        env["DEEPSEEK_API_KEY"] = cred.get_api_key()
        if base:
            env["DEEPSEEK_BASE_URL"] = base
    return env


def _handoff_fernet():
    secret = str(getattr(settings, "BSS_AUDIT_HANDOFF_KEY", "") or "").strip()
    if not secret:
        raise AuditJobError("BSS_AUDIT_HANDOFF_KEY is not configured.")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def _write_runner_request(job, cred):
    """Encrypt the active AI key for the isolated runner (never written plain)."""
    from bss_core.models import AI_PROVIDERS

    payload = json.dumps({
        "apiKey": cred.get_api_key(),
        "baseUrl": cred.base_url or "",
        "model": cred.model or "",
        "provider": (cred.provider or "").lower(),
        "providerLabel": AI_PROVIDERS.get((cred.provider or "").lower(), {}).get("label", cred.provider or ""),
    }).encode()
    token = _handoff_fernet().encrypt(payload).decode()
    root = Path(job.job_dir)
    path = root / "run.request"
    tmp = root / "run.request.tmp"
    tmp.write_text(json.dumps({"v": 1, "payload": token}), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, path)
    return path


def _dt(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:  # noqa: BLE001
        return None


def _event(job, type_, payload=None):
    from bss_core.models import AuditJobEvent
    try:
        AuditJobEvent.objects.create(job=job, type=type_, payload=payload or {})
    except Exception:  # noqa: BLE001
        pass


def _progress_payload(data):
    return {key: data.get(key) for key in ("stage", "percent", "message", "done", "total", "elapsedSeconds", "stalled")
            if data.get(key) is not None}


def _profile_email(user):
    if user is None:
        return ""
    cp = getattr(user, "contractor_profile", None)
    ep = getattr(user, "employer_profile", None)
    return (payloads._d(getattr(cp, "email", "") if cp else "")
            or payloads._d(getattr(ep, "email", "") if ep else "")
            or payloads._d(getattr(user, "email", "")))


def _notify_job(job):
    """In-app + email notification once a job reaches a terminal state."""
    if job.notified_at:
        return
    from django.core.mail import EmailMultiAlternatives
    from bss_core.models import User

    status = str(job.status or "").upper()
    if status not in ("READY", "FAILED", "CANCELLED"):
        return
    summary = job.summary or {}
    counts = summary.get("statusCounts") or {}
    risk = summary.get("riskCounts") or {}
    site = payloads._d(job.site.site_name) if job.site_id else ""
    period = f"{job.month} {job.year}"
    if status == "READY":
        title = f"Audit ready — {period}{f' · {site}' if site else ''}"
        body = (f"The audit report for {period}{f' at {site}' if site else ''} is ready. "
                f"Compliance: {(summary.get('verdict') or summary.get('executiveSummary') or 'See report')[:180]}")
        link = "/contractor/compliance?tab=report"
        notif_type = "COMPLIANCE"
    else:
        title = f"Audit {status.lower()} — {period}{f' · {site}' if site else ''}"
        body = (job.error_message or "The audit could not be completed.")[:400]
        link = "/contractor/compliance?tab=report"
        notif_type = "WARNING"

    recipients = [job.contractor, job.employer]
    if status != "READY":
        admin = User.objects.filter(role="bss_admin", is_active=True).first()
        if admin is not None:
            recipients.append(admin)
    seen = set()
    for user in recipients:
        if user is None or user.id in seen:
            continue
        seen.add(user.id)
        user_link = ("/employer/audit-reports" if user.role == "employer"
                     else "/admin/audit-reports" if user.role in ("bss_admin", "bss_staff", "admin")
                     else link)
        _create_notification(user, title, body, notif_type, user_link)

    emails = sorted({email for email in (_profile_email(u) for u in recipients if u) if email})
    if emails:
        base = str(getattr(settings, "BSS_PUBLIC_BASE_URL", "")).rstrip("/")
        url = f"{base}{link}"
        counts_text = ", ".join(f"{k}: {v}" for k, v in counts.items()) or "—"
        risk_text = ", ".join(f"{k}: {v}" for k, v in risk.items()) or "—"
        text = (f"Bharat Shram Setu — monthly contractor audit\n\n"
                f"Status: {status}\nPeriod: {period}\nSite: {site or '—'}\n"
                f"Contractor: {payloads._party_name(job.contractor) if job.contractor_id else ''}\n"
                f"Checkpoints: {counts_text}\nRisk: {risk_text}\n"
                f"{('Error: ' + job.error_message) if job.error_message else ''}\n\n"
                f"Open the report: {url}\n")
        html = (f"<div style=\"font-family:Arial,sans-serif;color:#0f172a\">"
                f"<h2 style=\"color:#01183A\">Monthly contractor audit — {status.title()}</h2>"
                f"<p><b>Period:</b> {period}<br/><b>Site:</b> {site or '—'}<br/>"
                f"<b>Contractor:</b> {payloads._party_name(job.contractor) if job.contractor_id else ''}</p>"
                f"<p><b>Checkpoints:</b> {counts_text}<br/><b>Risk:</b> {risk_text}</p>"
                + (f"<p style=\"color:#b91c1c\"><b>Error:</b> {job.error_message}</p>" if job.error_message else "")
                + f"<p><a href=\"{url}\" style=\"background:#01183A;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">Open report</a></p>"
                f"<p style=\"color:#64748b;font-size:12px\">Bharat Shram Setu · audit job {job.id}</p></div>")
        try:
            msg = EmailMultiAlternatives(
                subject=f"[BSS Audit] {period}{f' · {site}' if site else ''} — {status.title()}",
                body=text, from_email=settings.DEFAULT_FROM_EMAIL, to=emails,
            )
            msg.attach_alternative(html, "text/html")
            if status == "READY" and job.report_pdf:
                path = Path(job.job_dir) / job.report_pdf
                if path.exists() and path.stat().st_size <= 8 * 1024 * 1024:
                    msg.attach(path.name, path.read_bytes(), "application/pdf")
            msg.send(fail_silently=True)
        except Exception:  # noqa: BLE001
            logger.exception("Audit notification email failed for %s", job.id)
    job.notified_at = timezone.now()
    job.save(update_fields=["notified_at", "updated_at"])


def _sync_job_from_status(job):
    """Read the runner's status.json and update the DB (BSS side only)."""
    if not job.job_dir:
        return False
    root = Path(job.job_dir)
    status_path = root / "status.json"
    if not status_path.exists():
        return False
    try:
        data = json.loads(status_path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return False
    status = str(data.get("status") or "").upper()
    progress = _progress_payload(data)
    heartbeat = _dt(data.get("lastHeartbeat")) or timezone.now()
    changed = False
    if status == "RUNNING":
        changed = job.status != "RUNNING" or job.progress != progress
        job.status = "RUNNING"
        job.progress = progress
        job.last_heartbeat = heartbeat
        if not job.started_at:
            job.started_at = _dt(data.get("startedAt")) or timezone.now()
        job.save(update_fields=["status", "progress", "last_heartbeat", "started_at", "updated_at"])
        if changed:
            _event(job, "progress", progress)
        return True
    if status in ("READY", "FAILED", "CANCELLED"):
        job.status = status
        job.progress = {**progress, "stage": "ready" if status == "READY" else status.lower(),
                        "percent": 100 if status == "READY" else progress.get("percent", 0)}
        job.last_heartbeat = heartbeat
        job.finished_at = _dt(data.get("finishedAt")) or timezone.now()
        if status == "READY":
            job.report_html = str(data.get("reportHtml") or "")
            job.report_pdf = str(data.get("reportPdf") or "")
            job.report_xlsx = str(data.get("reportXlsx") or "")
            job.report_json = str(data.get("reportJson") or "")
            job.evidence_json = str(data.get("evidenceJson") or "")
            job.artifacts = data.get("artifacts") or []
            job.summary = data.get("summary") or {}
            job.token_usage = data.get("tokenUsage") or (job.summary or {}).get("llmUsage") or {}
            job.error_message = ""
        else:
            job.error_message = str(data.get("error") or ("Cancelled by the contractor." if status == "CANCELLED"
                                                          else "The audit agent failed."))[:4000]
        job.save(update_fields=["status", "progress", "last_heartbeat", "finished_at", "report_html",
                                "report_pdf", "report_xlsx", "report_json", "evidence_json", "artifacts",
                                "summary", "token_usage", "error_message", "updated_at"])
        _event(job, status.lower(), {"error": job.error_message} if job.error_message else {})
        _notify_job(job)
        try:
            (root / "run.request").unlink(missing_ok=True)
            (root / "run.processing").unlink(missing_ok=True)
        except OSError:
            pass
        return True
    return False


def _reap_stale_jobs():
    """Requeue jobs whose runner heartbeat disappeared, or fail after max attempts."""
    from datetime import timedelta
    stale_after = int(getattr(settings, "BSS_AUDIT_STALE_SECONDS", 300))
    cutoff = timezone.now() - timedelta(seconds=stale_after)
    for job in (AuditJob.objects.filter(status="RUNNING", last_heartbeat__lt=cutoff)
                .exclude(job_dir="").select_related("contractor", "site")):
        root = Path(job.job_dir)
        if (root / "run.processing").exists():
            continue
        if job.attempts >= job.max_attempts:
            job.status = "FAILED"
            job.error_message = "Runner heartbeat lost and the retry limit was reached."
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
            _event(job, "failed", {"error": job.error_message})
            _notify_job(job)
            continue
        try:
            cred = _active_credential()
            job.attempts += 1
            job.trigger_type = "system_retry"
            job.status = "PENDING"
            job.error_message = "Runner heartbeat lost; retrying."
            job.progress = {"stage": "queued", "percent": 0, "message": "Retrying after runner loss"}
            job.last_heartbeat = None
            job.started_at = None
            job.finished_at = None
            job.save()
            _write_runner_request(job, cred)
            _event(job, "retry", {"reason": "runner heartbeat lost", "attempt": job.attempts})
        except Exception as exc:  # noqa: BLE001
            job.status = "FAILED"
            job.error_message = str(exc)[:1000]
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
            _event(job, "failed", {"error": job.error_message})
            _notify_job(job)


def _contractor_site(contractor, site_id):
    from bss_core.models import Site
    site = Site.objects.filter(pk=site_id).select_related("employer").first()
    if site is None:
        raise AuditJobError("Site not found.")
    if not ContractorEmployerBinding.objects.filter(
            contractor=contractor, employer=site.employer, binding_status="ACCEPTED").exists():
        raise AuditJobError("This site is not connected to your contractor account.")
    return site


def _latest_package(contractor, site, period):
    return (ComplianceReport.objects
            .filter(employer=contractor, site_name__iexact=site.site_name,
                    is_current=True, period__icontains=period["month"],
                    financial_year__icontains=period["year"])
            .order_by("-id").first())


def _approved_docs(contractor, site, period):
    report = _latest_package(contractor, site, period)
    batches = list(ComplianceBatch.objects
                   .filter(contractor=contractor, site=site, year=period["year"],
                           month__iexact=period["month"], is_current=True)
                   .exclude(status="SUPERSEDED").select_related("site").order_by("id"))
    if report and report.batch_ids:
        wanted = {int(x) for x in report.batch_ids if str(x).isdigit()}
        batches = [b for b in batches if b.id in wanted]
    evidence_qs = (SubmissionEvidence.objects
                   .filter(user=contractor, month__iexact=period["month"])
                   .filter(Q(financial_year__icontains=period["year"]) |
                           Q(period__icontains=period["year"]))
                   .filter(Q(site="") | Q(site__iexact=site.site_name))
                   .order_by("id"))
    if report and report.unique_no:
        evidence_qs = evidence_qs.filter(Q(unique_no="") | Q(unique_no=report.unique_no))
    evidence = list(evidence_qs)
    if not batches and not evidence:
        raise AuditJobError("No submitted documents were found for that month.")
    pending = [b for b in batches if str(b.status).upper() != "VERIFIED"]
    pending += [e for e in evidence if str(e.status).upper() != "VERIFIED"]
    if pending:
        raise AuditJobError("The employer has not approved the whole package for this month yet.")
    return report, batches, evidence


def _historical_bindings(contractor, site, period):
    rows = (WorkerContractorBinding.objects
            .filter(contractor=contractor, site=site,
                    binding_status__in=("ACCEPTED", "TRANSFERRED", "CANCELLED", "EXPIRED"))
            .select_related("worker", "site").order_by("-accepted_at", "-id"))
    picked = {}
    for b in rows:
        accepted = (b.accepted_at.date() if b.accepted_at else
                    (b.created_at.date() if b.created_at else None))
        if accepted is None or accepted > period["end"]:
            continue
        end = b.unbound_at.date() if b.unbound_at else None
        if end is None and b.binding_status in ("CANCELLED", "EXPIRED", "TRANSFERRED"):
            end = b.updated_at.date() if b.updated_at else None
        if end is not None and end < period["start"]:
            continue
        current = picked.get(b.worker_id)
        if current is None or (accepted and (current[0] is None or accepted > current[0])):
            picked[b.worker_id] = (accepted, b)
    return [b for _accepted, b in picked.values()]


def _worker_documents(worker):
    return list(WorkerDocument.objects.filter(user=worker).select_related("document").order_by("document__sort_order", "id"))


def _build_worker_snapshot(contractor, site, period, worker_dir):
    source = _historical_bindings(contractor, site, period)
    workers = []
    for binding in source:
        worker = binding.worker
        wi = WorkerIdentity.objects.filter(user=worker).first()
        emp = WorkerEmployment.objects.filter(user=worker).order_by("-id").first()
        bank = WorkerBanking.objects.filter(user=worker).first()
        ss = WorkerSocialSecurity.objects.filter(user=worker).first()
        welfare = WorkerWelfareSafety.objects.filter(user=worker).first()
        addr = WorkerAddressMobility.objects.filter(user=worker).first()
        bss_id = payloads._d(wi.bss_worker_id if wi else "") or payloads._d(getattr(worker, "username", ""))
        name = payloads._d(wi.name if wi else "") or payloads._d(getattr(worker, "full_name", "")) or payloads._d(getattr(worker, "username", ""))
        folder_name = f"{_safe(bss_id, 32)}_{_safe(name, 60)}"
        docs_out, dest = [], worker_dir / folder_name
        docs = _worker_documents(worker)
        if docs:
            dest.mkdir(parents=True, exist_ok=True)
        seen = set()
        for doc in docs:
            data = _file_bytes(doc.file) if doc.file else b""
            if not data:
                continue
            code = payloads._d(getattr(doc.document, "code", "")) or "DOC"
            label = payloads._d(getattr(doc.document, "document_name", "")) or code
            fname = f"{_safe(code, 12)}_{_safe(os.path.basename(doc.file_name or doc.file.name or label), 80)}"
            if fname in seen:
                fname = f"{_safe(code, 12)}_{doc.id}_{_safe(label, 40)}"
            seen.add(fname)
            try:
                (dest / fname).write_bytes(data)
                docs_out.append({"code": code, "name": label, "file": str((dest / fname).relative_to(worker_dir.parent))})
            except OSError:
                continue
        current_site = payloads._d(site.site_name)
        workers.append({
            "bssId": bss_id,
            "name": name,
            "fatherName": payloads._d(wi.father_name if wi else ""),
            "dob": payloads._d(wi.date_of_birth.isoformat() if wi and wi.date_of_birth else ""),
            "gender": payloads._d(wi.gender if wi else ""),
            "mobile": payloads._d(wi.mobile_number if wi else ""),
            "address": payloads._d(addr.current_address if addr else ""),
            "aadhaar": payloads._d(wi.aadhaar if wi else ""),
            "pan": payloads._d(wi.pan if wi else ""),
            "uan": payloads._d(ss.epfo_uan if ss else ""),
            "esic": payloads._d(ss.esic_ip_number if ss else ""),
            "lwf": payloads._d(ss.lwf_no if ss else ""),
            "bocw": payloads._d(ss.bocw_reg_number if ss else ""),
            "eshram": payloads._d(ss.e_shram_no if ss else ""),
            "uanVerified": bool(ss.uan_verified) if ss else False,
            "esicVerified": bool(ss.esic_verified) if ss else False,
            "bank": {
                "name": payloads._d(bank.bank_name if bank else ""),
                "holder": payloads._d(bank.bank_account_holder_name if bank else ""),
                "account": payloads._d(bank.bank_account_number if bank else ""),
                "ifsc": payloads._d(bank.ifsc_code if bank else ""),
                "status": payloads._d(bank.bank_verification_status if bank else ""),
            },
            "contractor": payloads._d(payloads._party_name(contractor)),
            "contractorId": payloads._d(getattr(getattr(contractor, "contractor_profile", None), "contractor_code", "")),
            "site": current_site,
            "siteId": str(site.id),
            "designation": payloads._d(binding.designation) or payloads._d(emp.designation if emp else ""),
            "department": payloads._d(binding.department) or payloads._d(emp.department if emp else ""),
            "shift": payloads._d(binding.shift) or payloads._d(emp.shift if emp else ""),
            "doj": payloads._d(binding.date_of_joining.isoformat() if binding.date_of_joining else
                      (emp.doj.isoformat() if emp and emp.doj else "")),
            "bindingStatus": payloads._d(binding.binding_status),
            "acceptedAt": payloads._d(binding.accepted_at.isoformat() if binding.accepted_at else ""),
            "unboundAt": payloads._d(binding.unbound_at.isoformat() if binding.unbound_at else ""),
            "ppe": payloads._d(welfare.types_of_ppe_given if welfare else ""),
            "safetyTraining": bool(welfare.safety_training_completed) if welfare else False,
            "siteInduction": payloads._d(welfare.site_induction_status if welfare else ""),
            "medicalStatus": payloads._d(welfare.medical_examination_status if welfare else ""),
            "documents": docs_out,
        })
    return workers


def _build_job_folder(job, period, batches, evidence):
    root = Path(settings.BSS_AUDIT_JOBS_DIR) / str(job.id)
    root.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(root, 0o700)
    except OSError:
        pass
    query = root / f"contractor_documents_{period['month']}_{period['year']}"
    registers = query / "generated_clra_registers"
    uploads = query / "uploaded_documents"
    gt = root / "worker_documents"
    out = root / "output"
    logs = root / "logs"
    for d in (query, registers, uploads, gt, out, logs):
        d.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(d, 0o700)
        except OSError:
            pass

    site_bss_id = _safe(getattr(job.site, "bss_site_id", "") or job.site.site_name, 40)
    for b in batches:
        bdir = registers / f"{site_bss_id}_{b.id}"
        bdir.mkdir(parents=True, exist_ok=True)
        for field_name, label in (("master_file", "master"), ("generated_file", "generated_register"),
                                  ("signature_file", "signature")):
            field = getattr(b, field_name, None)
            data = _file_bytes(field) if field else b""
            if data:
                ext = os.path.splitext(field.name or "")[1] or ".bin"
                (bdir / f"{label}{ext}").write_bytes(data)

    for ev in evidence:
        data = _file_bytes(ev.file) if ev.file else b""
        if not data:
            continue
        doc_type = _safe(ev.document_type or ev.doc_type or "document", 40)
        dest = uploads / doc_type
        dest.mkdir(parents=True, exist_ok=True)
        original = os.path.basename(ev.original_name or ev.file.name or "document")
        (dest / f"{ev.id}_{_safe(original, 100)}").write_bytes(data)

    workers = _build_worker_snapshot(job.contractor, job.site, period, gt)
    (root / "bss_workers.json").write_text(json.dumps({
        "month": period["month"], "year": period["year"], "wageMonth": period["wage_month"],
        "financialYear": period["financial_year"],
        "contractor": {"id": job.contractor_id, "name": payloads._d(payloads._party_name(job.contractor)),
                       "code": payloads._d(getattr(getattr(job.contractor, "contractor_profile", None), "contractor_code", ""))},
        "site": {"id": job.site_id, "name": payloads._d(job.site.site_name),
                 "bssId": payloads._d(getattr(job.site, "bss_site_id", "")), "state": payloads._d(getattr(job.site, "state", ""))},
        "workers": workers,
    }, indent=2, default=str), encoding="utf-8")

    employer_name = payloads._d(payloads._party_name(job.site.employer)) if job.site and job.site.employer else ""
    contractor_name = payloads._d(payloads._party_name(job.contractor))
    state = _state_code(getattr(job.site, "state", ""))
    job_json = {
        "principal_employer": employer_name,
        "contractor_legal_name": contractor_name,
        "site": payloads._d(job.site.site_name),
        "site_short": payloads._d(job.site.site_name),
        "wage_month": period["wage_month"],
        "headcount_establishment": len(workers),
    }
    if state:
        job_json["state"] = state
        job_json["state_name"] = payloads._d(getattr(job.site, "state", ""))
    (root / "job.json").write_text(json.dumps(job_json, indent=2), encoding="utf-8")

    job.job_dir = str(root)
    job.query_count = len(batches) + len(evidence)
    job.worker_count = len(workers)
    job.agent_version = (Path(settings.BSS_AUDIT_AGENT_DIR) / "VERSION").read_text(encoding="utf-8").strip() if (Path(settings.BSS_AUDIT_AGENT_DIR) / "VERSION").exists() else ""
    job.save(update_fields=["job_dir", "query_count", "worker_count", "agent_version", "updated_at"])
    return root


def _find_output(out_dir):
    candidates = [p for p in Path(out_dir).iterdir() if p.is_dir() and p.name != "_work"]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _summarise_json(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    results = data.get("results") or []
    status_counts, risk_counts = {}, {}
    for row in results:
        status = str(row.get("status") or "Pending")
        risk = str(row.get("risk") or "None")
        status_counts[status] = status_counts.get(status, 0) + 1
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
    narrative = data.get("narrative") or {}
    return {
        "reportNo": data.get("report_no"),
        "generated": data.get("generated"),
        "mode": data.get("mode"),
        "statusCounts": status_counts,
        "riskCounts": risk_counts,
        "totalCheckpoints": len(results),
        "executiveSummary": narrative.get("executive_summary") or "",
        "verdict": narrative.get("closing_opinion") or "",
        "llmUsage": data.get("llm_usage") or {},
    }


def _run_agent(job, cred):
    agent_dir = Path(settings.BSS_AUDIT_AGENT_DIR)
    runner = agent_dir / "run_agent.py"
    if not runner.exists():
        raise AuditJobError(f"Audit agent not installed at {agent_dir}.")
    root = Path(job.job_dir)
    query = next(root.glob("contractor_documents_*"), None)
    if query is None:
        raise AuditJobError("Contractor document folder is missing.")
    gt = root / "worker_documents"
    out = root / "output"
    log_path = root / "logs" / "agent.log"
    env = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "HOME": str(agent_dir),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "PYTHONUNBUFFERED": "1",
        **_agent_env(cred),
    }
    cmd = [sys.executable, str(runner), "--groundtruth", str(gt), "--query", str(query),
           "--job", str(root / "job.json"), "--out", str(out)]
    with open(log_path, "w", encoding="utf-8") as log:
        proc = subprocess.run(cmd, cwd=str(agent_dir), env=env, stdout=log, stderr=subprocess.STDOUT,
                              text=True, timeout=3600)
    if proc.returncode != 0:
        tail = log_path.read_text(encoding="utf-8", errors="ignore")[-2000:]
        raise AuditJobError(f"The audit agent failed (exit {proc.returncode}). {tail}")
    report_dir = _find_output(out)
    if report_dir is None:
        raise AuditJobError("The audit agent produced no report folder.")
    def rel(p):
        return str(Path(p).relative_to(root)) if p else ""
    html = next(report_dir.glob("*.html"), None)
    pdf = next(report_dir.glob("*.pdf"), None)
    xlsx = next(report_dir.glob("*_audit_workbook.xlsx"), None) or next(report_dir.glob("*.xlsx"), None)
    rjson = next(report_dir.glob("*.json"), None)
    evidence = report_dir / "evidence" / "evidence.json"
    job.report_html = rel(html)
    job.report_pdf = rel(pdf)
    job.report_xlsx = rel(xlsx)
    job.report_json = rel(rjson)
    job.evidence_json = rel(evidence if evidence.exists() else None)
    job.summary = _summarise_json(rjson) if rjson else {}
    job.token_usage = (job.summary or {}).get("llmUsage") or {}
    job.status = "READY"
    job.error_message = ""
    job.finished_at = timezone.now()
    job.save(update_fields=["report_html", "report_pdf", "report_xlsx", "report_json", "evidence_json",
                            "summary", "token_usage", "status", "error_message", "finished_at", "updated_at"])


def _execute_job(job_id):
    job = AuditJob.objects.filter(pk=job_id).select_related("contractor", "site").first()
    if job is None:
        return
    try:
        cred = _active_credential()
        job.status = "RUNNING"
        job.started_at = timezone.now()
        job.provider = cred.provider
        job.model = cred.model
        job.save(update_fields=["status", "started_at", "provider", "model", "updated_at"])
        _run_agent(job, cred)
    except Exception as exc:  # noqa: BLE001
        job.status = "FAILED"
        job.error_message = str(exc)[:4000]
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
    finally:
        from django.db import connections
        connections.close_all()


def _job_row(job, user=None):
    artifacts = list(job.artifacts or [])
    if user is not None and user.role not in ("bss_admin", "bss_staff", "admin"):
        artifacts = [a for a in artifacts if not a.get("adminOnly")]
    return {
        "id": str(job.id),
        "contractor": payloads._d(payloads._party_name(job.contractor)) if job.contractor_id else "",
        "contractorId": payloads._d(getattr(getattr(job.contractor, "contractor_profile", None), "contractor_code", "")) if job.contractor_id else "",
        "employer": payloads._d(payloads._party_name(job.employer)) if job.employer_id else "",
        "site": payloads._d(job.site.site_name) if job.site_id else "",
        "siteId": str(job.site_id) if job.site_id else "",
        "month": job.month,
        "year": job.year,
        "period": f"{job.month} {job.year}",
        "frequency": "Monthly",
        "financialYear": job.financial_year,
        "version": job.version,
        "isCurrent": job.is_current,
        "status": job.status,
        "error": job.error_message or "",
        "queryCount": job.query_count,
        "workerCount": job.worker_count,
        "summary": job.summary or {},
        "createdAt": payloads._dts(job.created_at),
        "startedAt": payloads._dts(job.started_at),
        "finishedAt": payloads._dts(job.finished_at),
        "hasHtml": bool(job.report_html),
        "hasPdf": bool(job.report_pdf),
        "hasXlsx": bool(job.report_xlsx),
        "hasJson": bool(job.report_json),
        "hasEvidence": bool(job.evidence_json),
        "progress": job.progress or {},
        "lastHeartbeat": payloads._dts(job.last_heartbeat),
        "attempts": job.attempts,
        "maxAttempts": job.max_attempts,
        "cancelRequested": bool(job.cancel_requested),
        "triggerType": job.trigger_type,
        "artifacts": artifacts,
        "agentVersion": job.agent_version,
        "provider": job.provider,
        "model": job.model,
    }


def _create_job(contractor, site, month, year, user):
    cred = _active_credential()  # fail early with a clear configuration message
    period = _parse_period(month, year)
    if period["end"] >= timezone.localdate():
        raise AuditJobError("Only a previous month can be audited.")
    report, batches, evidence = _approved_docs(contractor, site, period)
    if AuditJob.objects.filter(contractor=contractor, site=site, month=period["month"],
                               year=period["year"],
                               status__in=("PENDING", "BUILDING", "RUNNING")).exists():
        raise AuditJobError("An audit is already running for this site and month.")
    schedule, _ = AuditSchedule.objects.get_or_create(
        contractor=contractor, site=site, defaults={"runs_per_month": 2})
    if not schedule.is_active:
        raise AuditJobError("Audits are disabled for this site.")
    all_runs = AuditJob.objects.filter(contractor=contractor, site=site, month=period["month"],
                                       year=period["year"]).count()
    used = AuditJob.objects.filter(contractor=contractor, site=site, month=period["month"],
                                   year=period["year"], trigger_type="manual").count()
    if used >= schedule.runs_per_month:
        raise AuditJobError(f"This month already has {used} of {schedule.runs_per_month} manual audit runs.")
    AuditJob.objects.filter(contractor=contractor, site=site, month=period["month"],
                            year=period["year"]).update(is_current=False)
    job = AuditJob.objects.create(
        contractor=contractor, employer=site.employer, site=site,
        month=period["month"], year=period["year"], financial_year=period["financial_year"],
        period_start=period["start"], period_end=period["end"], version=all_runs + 1,
        is_current=True, status="BUILDING", requested_by=user, trigger_type="manual",
        progress={"stage": "preparing", "percent": 0, "message": "Preparing the job folder"},
    )
    try:
        _build_job_folder(job, period, batches, evidence)
    except Exception as exc:  # noqa: BLE001
        job.status = "FAILED"
        job.error_message = str(exc)[:4000]
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
        raise
    _write_runner_request(job, cred)
    job.status = "PENDING"
    job.save(update_fields=["status", "updated_at"])
    return job


def _job_file(job, kind, request):
    allowed = {"html": job.report_html, "pdf": job.report_pdf, "xlsx": job.report_xlsx,
               "json": job.report_json, "evidence": job.evidence_json}
    rel = allowed.get(kind)
    if not rel:
        return Response({"error": "File not available."}, status=status.HTTP_404_NOT_FOUND)
    path = Path(job.job_dir) / rel
    if not path.exists():
        return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)
    from django.http import FileResponse
    content_types = {
        "html": "text/html; charset=utf-8",
        "pdf": "application/pdf",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json": "application/json",
    }
    if kind == "html":
        return FileResponse(open(path, "rb"), content_type=content_types["html"])
    return FileResponse(open(path, "rb"), as_attachment=True, filename=path.name,
                        content_type=content_types.get(kind, "application/octet-stream"))


def _can_view(user, job):
    if user.role in ("bss_admin", "bss_staff", "admin"):
        return True
    if user.role == "contractor":
        return job.contractor_id == user.id
    if user.role == "employer":
        return job.employer_id == user.id or (job.site and job.site.employer_id == user.id)
    return False


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_audit_jobs(request):
    user = request.user
    if user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "GET":
        qs = (AuditJob.objects.filter(contractor=user)
              .select_related("contractor", "employer", "site").order_by("-created_at")[:200])
        return Response({"data": [_job_row(j, request.user) for j in qs]}, status=status.HTTP_200_OK)
    body = request.data or {}
    try:
        site = _contractor_site(user, body.get("siteId"))
        job = _create_job(user, site, body.get("month"), body.get("year"), user)
    except AuditJobError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": _job_row(job, request.user)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_audit_job_detail(request, job_id):
    job = (AuditJob.objects.filter(pk=job_id, contractor=request.user)
           .select_related("contractor", "employer", "site").first())
    if job is None:
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response({"data": _job_row(job, request.user)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_audit_jobs(request):
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    _require_permission(request, "compliance")
    qs = (AuditJob.objects.filter(Q(employer=user) | Q(site__employer=user))
          .select_related("contractor", "employer", "site").order_by("-created_at")[:200])
    return Response({"data": [_job_row(j, request.user) for j in qs]}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_job_file(request, job_id, kind):
    _require_permission(request, "compliance")
    job = AuditJob.objects.filter(pk=job_id).select_related("contractor", "employer", "site").first()
    if job is None or not _can_view(request.user, job):
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    return _job_file(job, kind, request)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_audit_jobs(request):
    if request.user.role not in ("bss_admin", "bss_staff", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    qs = AuditJob.objects.select_related("contractor", "employer", "site").order_by("-created_at")[:300]
    return Response({"data": [_job_row(j, request.user) for j in qs]}, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_audit_schedules(request):
    if request.user.role not in ("bss_admin", "bss_staff", "admin"):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "PATCH":
        body = request.data or {}
        contractor_id = body.get("contractorId")
        site_id = body.get("siteId")
        if not contractor_id or not site_id:
            return Response({"error": "contractorId and siteId are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            runs = max(0, min(10, int(body.get("runsPerMonth", 2))))
        except (TypeError, ValueError):
            return Response({"error": "runsPerMonth must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        sch, _ = AuditSchedule.objects.get_or_create(contractor_id=contractor_id, site_id=site_id,
                                                     defaults={"created_by": request.user})
        sch.runs_per_month = runs
        if body.get("isActive") is not None:
            sch.is_active = bool(body.get("isActive"))
        sch.created_by = request.user
        sch.save()
        return Response({"data": {"contractorId": contractor_id, "siteId": site_id,
                                  "runsPerMonth": sch.runs_per_month, "isActive": sch.is_active}},
                        status=status.HTTP_200_OK)
    from bss_core.models import User, Site
    schedules = {(s.contractor_id, s.site_id): s for s in AuditSchedule.objects.all()}
    pairs: dict = {}
    for b in (WorkerContractorBinding.objects.filter(binding_status="ACCEPTED")
              .select_related("contractor", "site")):
        if not b.site_id:
            continue
        pairs[(b.contractor_id, b.site_id)] = b
    rows = []
    for (cid, sid), b in pairs.items():
        sch = schedules.get((cid, sid))
        rows.append({
            "contractorId": cid, "contractor": payloads._d(payloads._party_name(b.contractor)),
            "siteId": sid, "site": payloads._d(b.site.site_name),
            "runsPerMonth": sch.runs_per_month if sch else 2,
            "isActive": sch.is_active if sch else True,
        })
    for (cid, sid), sch in schedules.items():
        if (cid, sid) in pairs:
            continue
        contractor = User.objects.filter(pk=cid).first()
        site = Site.objects.filter(pk=sid).first()
        if contractor is None or site is None:
            continue
        rows.append({
            "contractorId": cid, "contractor": payloads._d(payloads._party_name(contractor)),
            "siteId": sid, "site": payloads._d(site.site_name),
            "runsPerMonth": sch.runs_per_month, "isActive": sch.is_active,
        })
    rows.sort(key=lambda r: (r["contractor"], r["site"]))
    return Response({"data": rows[:500]}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_audit_job_cancel(request, job_id):
    user = request.user
    job = AuditJob.objects.filter(pk=job_id, contractor=user).select_related("contractor", "site").first()
    if job is None:
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    if job.status in ("READY", "FAILED", "CANCELLED"):
        return Response({"error": f"This audit is already {job.status.lower()}."},
                        status=status.HTTP_400_BAD_REQUEST)
    job.cancel_requested = True
    if job.status in ("PENDING", "BUILDING"):
        job.status = "CANCELLED"
        job.error_message = "Cancelled by the contractor."
        job.finished_at = timezone.now()
        job.progress = {"stage": "cancelled", "percent": 0, "message": "Cancelled"}
        job.save()
        root = Path(job.job_dir) if job.job_dir else None
        if root:
            try:
                (root / "run.request").unlink(missing_ok=True)
            except OSError:
                pass
        _event(job, "cancelled", {"reason": "before start"})
        _notify_job(job)
    else:
        job.save(update_fields=["cancel_requested", "updated_at"])
        if job.job_dir:
            try:
                (Path(job.job_dir) / "cancel.request").write_text("cancel", encoding="utf-8")
            except OSError:
                pass
        _event(job, "cancel_requested", {"message": "Cancellation requested"})
    return Response({"data": _job_row(job, user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_audit_job_retry(request, job_id):
    """Manual retry: new version, counts against the monthly manual-run limit."""
    user = request.user
    old = (AuditJob.objects.filter(pk=job_id, contractor=user)
           .select_related("contractor", "employer", "site").first())
    if old is None:
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    if old.status not in ("FAILED", "CANCELLED"):
        return Response({"error": "Only a failed or cancelled audit can be retried."},
                        status=status.HTTP_400_BAD_REQUEST)
    if AuditJob.objects.filter(contractor=user, site=old.site, month=old.month,
                               year=old.year,
                               status__in=("PENDING", "BUILDING", "RUNNING")).exists():
        return Response({"error": "An audit is already running for this site and month."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not old.job_dir or not Path(old.job_dir).exists():
        return Response({"error": "The original job folder is no longer available."},
                        status=status.HTTP_400_BAD_REQUEST)
    schedule, _ = AuditSchedule.objects.get_or_create(
        contractor=user, site=old.site, defaults={"runs_per_month": 2})
    used = AuditJob.objects.filter(contractor=user, site=old.site, month=old.month,
                                   year=old.year, trigger_type="manual").count()
    if used >= schedule.runs_per_month:
        return Response({"error": f"This month already has {used} of {schedule.runs_per_month} manual audit runs."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        cred = _active_credential()
    except AuditJobError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    all_runs = AuditJob.objects.filter(contractor=user, site=old.site, month=old.month, year=old.year).count()
    job = AuditJob.objects.create(
        contractor=old.contractor, employer=old.employer, site=old.site,
        month=old.month, year=old.year, financial_year=old.financial_year,
        period_start=old.period_start, period_end=old.period_end,
        version=all_runs + 1, is_current=True, status="BUILDING",
        requested_by=user, trigger_type="manual",
        progress={"stage": "preparing", "percent": 0, "message": "Preparing the retry"},
    )
    AuditJob.objects.filter(contractor=user, site=old.site, month=old.month,
                            year=old.year).exclude(pk=job.pk).update(is_current=False)
    source = Path(old.job_dir)
    target = Path(settings.BSS_AUDIT_JOBS_DIR) / str(job.id)
    try:
        shutil.copytree(source, target,
                        ignore=shutil.ignore_patterns("output", "logs", "status.json", "run.request",
                                                      "run.request.tmp", "run.processing", "cancel.request"))
        job.job_dir = str(target)
        job.query_count = old.query_count
        job.worker_count = old.worker_count
        job.save(update_fields=["job_dir", "query_count", "worker_count", "updated_at"])
        _write_runner_request(job, cred)
        job.status = "PENDING"
        job.save(update_fields=["status", "updated_at"])
        _event(job, "queued", {"reason": "manual retry", "previous": str(old.id)})
    except Exception as exc:  # noqa: BLE001
        job.status = "FAILED"
        job.error_message = str(exc)[:2000]
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
        return Response({"error": f"The retry could not be started: {exc}"},
                        status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": _job_row(job, user)}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_job_artifact(request, job_id):
    _require_permission(request, "compliance")
    job = AuditJob.objects.filter(pk=job_id).select_related("contractor", "employer", "site").first()
    if job is None or not _can_view(request.user, job):
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    rel_path = str(request.query_params.get("path") or "").strip()
    if not rel_path:
        return Response({"error": "A file path is required."}, status=status.HTTP_400_BAD_REQUEST)
    root = Path(job.job_dir).resolve()
    path = (root / rel_path).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        return Response({"error": "Invalid file path."}, status=status.HTTP_400_BAD_REQUEST)
    if not path.is_file():
        return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)
    name = path.name
    admin_only = name in ("extraction_raw.json", "deepseek_calls.json") or (
        "evidence" in path.parts and name != "evidence.json")
    if admin_only and request.user.role not in ("bss_admin", "bss_staff", "admin"):
        return Response({"error": "This file is restricted to BSS Admin."},
                        status=status.HTTP_403_FORBIDDEN)
    from django.http import FileResponse
    content_type = ("text/html; charset=utf-8" if name.endswith(".html") else
                    "application/pdf" if name.endswith(".pdf") else
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if name.endswith(".xlsx") else
                    "application/json" if name.endswith(".json") else "application/octet-stream")
    return FileResponse(open(path, "rb"), as_attachment=not name.endswith(".html"),
                        filename=name, content_type=content_type)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_job_events(request, job_id):
    _require_permission(request, "compliance")
    job = AuditJob.objects.filter(pk=job_id).select_related("contractor", "employer", "site").first()
    if job is None or not _can_view(request.user, job):
        return Response({"error": "Audit job not found."}, status=status.HTTP_404_NOT_FOUND)
    from django.http import StreamingHttpResponse
    from bss_core.models import AuditJobEvent
    import time as _time

    try:
        last_id = int(request.headers.get("Last-Event-ID") or request.query_params.get("lastEventId") or 0)
    except (TypeError, ValueError):
        last_id = 0

    def stream():
        nonlocal last_id
        idle = 0
        while True:
            events = list(AuditJobEvent.objects.filter(job_id=job.id, id__gt=last_id).order_by("id")[:50])
            if events:
                idle = 0
                for event in events:
                    last_id = event.id
                    payload = {"type": event.type, "jobId": str(job.id), **event.payload}
                    yield f"id: {event.id}\ndata: {json.dumps(payload, default=str)}\n\n"
            else:
                idle += 1
                yield ": keepalive\n\n"
            job.refresh_from_db(fields=["status"])
            if job.status in ("READY", "FAILED", "CANCELLED") and not events:
                break
            if idle > 30:
                break
            _time.sleep(2)

    response = StreamingHttpResponse(stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


__all__ = [
    "contractor_audit_jobs", "contractor_audit_job_detail", "employer_audit_jobs",
    "audit_job_file", "admin_audit_jobs", "admin_audit_schedules",
    "contractor_audit_job_cancel", "contractor_audit_job_retry",
    "audit_job_artifact", "audit_job_events",
]
