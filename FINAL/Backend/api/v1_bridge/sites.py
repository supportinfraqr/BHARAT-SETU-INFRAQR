"""Site, compliance, gate-pass and job/rozgar posting handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403


def _handle_job_posting(user, body, method):
    """Contractor job posting -> ContractorJob (Rozgar Setu job management)."""
    from bss_core.models import ContractorJob

    job = None
    job_id = body.get("id")
    if job_id and str(job_id).isdigit():
        job = ContractorJob.objects.filter(pk=job_id, contractor=user).first()
    if job is None:
        job = ContractorJob(contractor=user)

    def text(key, current=""):
        value = body.get(key)
        return str(value).strip() if value is not None else (current or "")

    job.job_title = text("title", job.job_title) or job.job_title
    job.job_description = text("description", job.job_description)
    job.wage_offered = text("monthlyWage", job.wage_offered)
    job.designation = text("designation", job.designation) or job.job_title
    job.trade = text("trade", job.trade)
    job.category = text("category", job.category)
    job.workplace_type = text("workplaceType", job.workplace_type) or "On-site"
    job.state = text("state", job.state)
    job.city = text("city", job.city)
    job.experience = text("experience", job.experience)
    job.dob_limit = text("dobLimit", job.dob_limit)
    job.salary_visibility = text("salaryVisibility", job.salary_visibility) or "Visible to all"
    job.visibility = text("visibility", job.visibility) or "Public"
    job.duration = text("duration", job.duration)
    if isinstance(body.get("skills"), list):
        job.skills = [str(s) for s in body.get("skills")]
    if body.get("vacancies") is not None:
        try:
            job.vacancies = max(1, int(body.get("vacancies")))
        except (TypeError, ValueError):
            pass
    for src, field in (("minSalary", "min_salary"), ("maxSalary", "max_salary")):
        if body.get(src) not in (None, ""):
            try:
                setattr(job, field, body.get(src))
            except (TypeError, ValueError):
                pass
    if body.get("closingDate") is not None:
        job.validity_until = _parse_iso_date(body.get("closingDate"))
    site_name = text("site", "")
    if site_name:
        # Only a site the contractor is actually allotted may be used for a posting.
        allowed = _contractor_site_ids(user)
        site = Site.objects.filter(site_name__iexact=site_name, id__in=allowed).first()
        if site:
            job.site = site
    status = str(body.get("status") or "").strip().upper()
    job.status = {"DRAFT": "DRAFT", "CLOSED": "CLOSED"}.get(status, "SUBMITTED")
    job.is_active = job.status != "DRAFT"
    job.save()
    return job.id


def _handle_rozgar_apply(user, body):
    """Worker applies to a job -> RozgarRequest (pending)."""
    from bss_core.models import ContractorJob, RozgarRequest

    # A worker can only be bound to one contractor at a time — if already bound
    # they must unbind before applying to another contractor's job.
    active = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
              .select_related("contractor", "site").first())
    if active is not None:
        cp = getattr(active.contractor, "contractor_profile", None)
        contractor_name = (cp.contractor_name if cp and cp.contractor_name else active.contractor.username)
        site_name = active.site.site_name if active.site else ""
        raise PortalMutationError(
            f"You are already bound to {contractor_name}"
            f"{f' at {site_name}' if site_name else ''}. "
            "Unbind first before applying to another contractor.", 409)

    raw_id = body.get("jobId") or body.get("id") or body.get("job")
    job = None
    if raw_id is not None:
        jid = str(raw_id).replace("JOB-", "").strip()
        if jid.isdigit():
            job = ContractorJob.objects.filter(pk=jid, is_active=True).first()
    if job is None:
        return None
    notes = str(body.get("notes") or "")[:500]
    req = RozgarRequest.objects.filter(job=job, worker=user).order_by("-created_at").first()
    if req is None:
        req = RozgarRequest.objects.create(job=job, worker=user, contractor=job.contractor,
                                           status="PENDING", notes=notes)
    elif str(req.status).upper() in ("REJECTED", "CANCELLED", "EXPIRED"):
        # Re-applying after a decline/expiry re-opens the application (and the
        # posting becomes visible again in Available Jobs) instead of no-op'ing.
        req.contractor = job.contractor
        req.status = "PENDING"
        req.responded_at = None
        if notes:
            req.notes = notes
        req.save(update_fields=["contractor", "status", "responded_at", "notes", "updated_at"])
    # Applying also raises a site-specific binding request to the job's
    # contractor (worker-initiated consent). The contractor accepts it in
    # Binding Requests; the binding completes only after both sides consent.
    if job.site_id and job.contractor_id:
        binding = _request_worker_binding(user, job.contractor, job.site, initiated_by="worker")
        if binding.binding_status != "ACCEPTED":
            binding.binding_status = "PENDING"
            binding.consent_worker = True
            binding.save(update_fields=["binding_status", "consent_worker"])
    return req.id


def _handle_rozgar_respond(user, body):
    """Contractor responds to a RozgarRequest (Hired/Accepted/Rejected)."""
    from bss_core.models import RozgarRequest

    req_id = body.get("id")
    req = RozgarRequest.objects.filter(pk=req_id, contractor=user).first()
    if req is None:
        return None
    status = str(body.get("status") or "").strip().upper()
    mapping = {"HIRED": "ACCEPTED", "ACCEPTED": "ACCEPTED", "SHORTLISTED": "SHORTLISTED",
               "REJECTED": "REJECTED", "CANCELLED": "CANCELLED", "PENDING": "PENDING"}
    if status in mapping:
        mapped = mapping[status]
        # Hiring a matched applicant also opens the worker<->contractor binding
        # request (same flow as scanning the worker's QR), so it appears on both
        # the worker's and the contractor's binding-request pages with the normal
        # consent/permission flow. If the worker already has a live binding, the
        # conflict is surfaced and the application is left unchanged.
        if mapped == "ACCEPTED":
            job = getattr(req, "job", None)
            _contractor_binds_worker(user, req.worker, site=getattr(job, "site", None))
        req.status = mapped
        req.responded_at = timezone.now()
        req.save(update_fields=["status", "responded_at", "updated_at"])
    return req.id


def _handle_compliances(user, body, method):
    """Contractor statutory compliance register: create/delete compliance
    documents, or generate a CLRA register batch from the uploaded master file."""
    from bss_core.models import ComplianceBatch, ComplianceDocument, ComplianceMaster

    if method == "DELETE":
        ComplianceDocument.objects.filter(pk=body.get("id"), employer=user).delete()
        return body.get("id")

    kind = str(body.get("kind") or "").strip().lower()
    if kind in ("generatebatch", "generate-batch", "clra", "register"):
        site = Site.objects.filter(site_name__iexact=str(body.get("site") or "").strip()).first()
        if site is None:
            site = Site.objects.filter(id__in=_contractor_site_ids(user)).order_by("id").first()
        month = str(body.get("month") or "")[:20]
        year = str(body.get("year") or "")[:4]
        # One current register per site + period: supersede the previous ones.
        existing = list(ComplianceBatch.objects
                        .filter(contractor=user, site=site, month=month, year=year)
                        .exclude(status__in=["SUPERSEDED", "SUBMITTED", "VERIFIED"]))
        batch = ComplianceBatch.objects.create(
            contractor=user, site=site,
            financial_year=str(body.get("financialYear") or "")[:12],
            month=month, year=year,
            state=str(body.get("state") or "")[:60],
            employee_count=WorkerContractorBinding.objects.filter(
                contractor=user, binding_status="ACCEPTED").count(),
            location_count=1,
            generated_on=timezone.localdate(),
            generated_by=payloads._party_name(user),
            status="GENERATED",
        )
        for old in existing:
            old.status = "SUPERSEDED"
            old.superseded_by = batch
            old.save(update_fields=["status", "superseded_by", "updated_at"])
        return payloads._contractor_compliance_batch_row(batch)

    if kind in ("submit", "finalsubmit", "final-submit"):
        upload_ids = body.get("uploadIds") if isinstance(body.get("uploadIds"), list) else []
        submissions = SubmissionEvidence.objects.filter(user=user, id__in=upload_ids)
        batch_ids = body.get("batchIds") if isinstance(body.get("batchIds"), list) else []
        # Level-1 gate: every generated register must have cleared its AI audit
        # before the package can be submitted. Skipped when no AI provider is
        # configured (otherwise nothing would ever be auditable).
        if batch_ids:
            from bss_core.models import AiProviderCredential
            if AiProviderCredential.objects.filter(enabled=True).exists():
                for batch in ComplianceBatch.objects.filter(contractor=user, id__in=batch_ids):
                    audits = batch.register_audits or {}
                    statuses = [str((a or {}).get("status") or "") for a in audits.values()]
                    if not audits or any(s in ("", "pending") for s in statuses):
                        raise PortalMutationError(
                            "The AI audit is still running for this batch — submission opens once "
                            "every register is audited.", 409)
                    if any(s != "passed" for s in statuses):
                        raise PortalMutationError(
                            "The AI audit flagged issues in this batch. Resolve them and re-run the "
                            "audit from View documents before submitting.", 409)
        generated = ComplianceBatch.objects.filter(
            contractor=user, id__in=batch_ids).count() if batch_ids else 0
        period = str(body.get("period") or "")
        report = compliance.build_audit_report(
            user,
            employer=str(body.get("employer") or ""), site=str(body.get("site") or ""),
            period=period,
            financial_year=str(body.get("financialYear") or ""),
            state=str(body.get("state") or ""), submissions=list(submissions),
            generated_registers=generated,
        )
        # Stamp the submitted evidence rows with the package's Unique No. so the
        # listing can track them (Unique No. + Days Left) like the old app.
        submissions.update(unique_no=report.unique_no, status="PENDING")
        # Remember the generated register batches behind this package so the
        # detailed per-submission AI report can compile their register audits.
        if batch_ids:
            report.batch_ids = [int(b) for b in batch_ids if str(b).isdigit()]
            report.save(update_fields=["batch_ids"])
        # A "hard submit" overrides failed OCR — keep that on record per document.
        force = str(body.get("force") or "").lower() in ("1", "true", "yes")
        if force:
            for s in SubmissionEvidence.objects.filter(user=user, id__in=upload_ids):
                if s.validation_findings or s.checkpoint_results:
                    s.forced_submit = True
                    s.save(update_fields=["forced_submit"])
        # Mark the included generated register batches as submitted so they can
        # no longer be re-submitted from the Create tab.
        if batch_ids:
            ComplianceBatch.objects.filter(
                contractor=user, id__in=batch_ids).update(status="SUBMITTED")
        return payloads._contractor_audit_report_row(report)

    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        item = str(row.get("item") or "").strip()
        if not item:
            continue
        reference = str(row.get("reference") or "").strip()
        master, _ = ComplianceMaster.objects.get_or_create(
            act=item[:160], form_number=reference[:60])
        category = str(row.get("category") or "").strip()[:120]
        if category and master.nature != category:
            master.nature = category
            master.save(update_fields=["nature"])
        site = Site.objects.filter(site_name__iexact=str(row.get("site") or "").strip()).first()
        worker = None
        worker_ref = str(row.get("worker") or "").strip()
        if worker_ref:
            from bss_core.models import WorkerIdentity
            for binding in WorkerContractorBinding.objects.filter(
                    contractor=user, binding_status="ACCEPTED").select_related("worker"):
                candidate = binding.worker
                identity = WorkerIdentity.objects.filter(user=candidate).first()
                names = {str(candidate.username).lower(),
                         payloads._party_name(candidate).lower()}
                if identity:
                    names.add(str(identity.name or "").lower())
                    names.add(str(identity.bss_worker_id or "").lower())
                if worker_ref.lower() in names:
                    worker = candidate
                    break
        doc = ComplianceDocument(
            employer=user, master=master, site=site, worker=worker,
            client_name=str(row.get("employer") or "")[:200],
            verification=str(row.get("verification") or "")[:20],
            unique_no=reference[:60],
            form_number=reference[:40],
            period=str(row.get("expiry") or "")[:40],
            status={"Active": "SUBMITTED", "Expiring": "PENDING",
                    "Expired": "EXPIRED"}.get(str(row.get("status") or ""), "PENDING"),
        )
        due = _parse_iso_date(row.get("expiry"))
        if due:
            doc.due_date = due
        issue = _parse_iso_date(row.get("issue"))
        if issue:
            doc.issue_date = issue
        doc.save()
        created.append(payloads._compliance_doc_row(doc))
    return created[0] if len(created) == 1 else created


def _handle_default_site(user, body):
    """Set (or clear) the caller's pre-selected default site.

    The site must be one the caller can legitimately use — a contractor's bound
    or approved-allotted site, or a site the employer owns. Worker QR bindings
    inherit this default (and the contractor may override it at scan time)."""
    site_id = body.get("siteId")
    if user.role == "contractor":
        prof, _ = ContractorProfile.objects.get_or_create(user=user)
        # Creating the profile stamps registered_at and consent_date together.
        _record_contractor_membership(prof, user)
        allowed = _contractor_site_ids(user)
    elif user.role == "employer":
        prof, _ = EmployerProfile.objects.get_or_create(user=user)
        allowed = set(Site.objects.filter(employer=user).values_list("id", flat=True))
    else:
        return None
    if site_id in (None, "", "none"):
        # A default site is mandatory while the caller has at least one site —
        # fall back to the first available instead of clearing it.
        fallback = Site.objects.filter(id__in=allowed).order_by("id").first()
        if fallback is None:
            raise PortalMutationError("You have no sites yet, so a default site cannot be set.", 400)
        prof.default_site = fallback
        prof.save()
        return fallback.id
    site = Site.objects.filter(pk=site_id, id__in=allowed).first()
    if site is None:
        raise PortalMutationError("That site is not available to you.", 400)
    prof.default_site = site
    prof.save()
    return site.id


def _auto_assign_letter_templates(site):
    """On site creation, pin the state's active Appointment/Experience letter
    templates so the site detail shows them (the employer can still override, and
    rendering already falls back to the state template)."""
    from bss_core.models import LetterTemplate
    state = (site.state or "").strip()
    if not state:
        return
    for kind, attr in (("APPOINTMENT", "appointment_letter_template"),
                       ("EXPERIENCE", "experience_letter_template")):
        if getattr(site, f"{attr}_id"):
            continue
        template = (LetterTemplate.objects
                    .filter(letter_type=kind, state__iexact=state, is_active=True)
                    .exclude(html="").order_by("-updated_at").first())
        if template is not None:
            setattr(site, attr, template)


def _new_unique_site_code():
    """A globally-unique site code in the SITE-XXXXXXXX house format.

    Loops until the random code is not already used, so a generated code can
    never match an existing site's code.
    """
    import random
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    for _ in range(50):
        code = "SITE-" + "".join(random.choice(alphabet) for _ in range(8))
        if not Site.objects.filter(site_code=code).exists():
            return code
    return "SITE-" + uuid.uuid4().hex[:8].upper()


def _handle_site(user, body, method):
    site = None
    site_id = body.get("id")
    if site_id:
        site = Site.objects.filter(pk=site_id, employer=user).first()
    created = site is None

    if site is None:
        code = str(body.get("site_code") or body.get("code") or "").strip().upper()
        # Guarantee a unique code in the SITE-XXXXXXXX house format. If the
        # supplied code is missing or already taken, generate a fresh one so a
        # random code can never collide with an existing site.
        if not code or Site.objects.filter(site_code=code).exists():
            code = _new_unique_site_code()
        site = Site(employer=user, site_code=code)

    # camelCase aliases the current form uses.
    if body.get("name") is not None:
        site.site_name = str(body.get("name") or "").strip()
    if body.get("location") is not None:
        site.location = str(body.get("location") or "").strip()
    if body.get("state") is not None:
        site.state = str(body.get("state") or "").strip()
    if body.get("status") is not None:
        site.site_status = str(body.get("status") or "").strip()
    if body.get("startDate") is not None:
        site.site_start_date = _parse_date(body.get("startDate"))
    if body.get("endDate") is not None:
        site.expected_end_date = _parse_date(body.get("endDate"))

    for field in _SITE_EDITABLE_FIELDS:
        if field in body and body.get(field) is not None:
            model_field = Site._meta.get_field(field)
            coerced = _coerce_site_value(model_field, body.get(field))
            # A non-nullable field must never be written as NULL (e.g. an empty
            # pincode is "" not None) — keep the model default instead.
            if coerced is None and not model_field.null:
                continue
            setattr(site, field, coerced)

    # State-wise letter templates are FKs (many-to-one) so they are excluded from
    # the scalar editable fields — set them explicitly.
    def _tid(value):
        try:
            return int(value) if value not in (None, "", "null") else None
        except (TypeError, ValueError):
            return None

    if "appointmentLetterTemplateId" in body:
        site.appointment_letter_template_id = _tid(body.get("appointmentLetterTemplateId"))
    if "experienceLetterTemplateId" in body:
        site.experience_letter_template_id = _tid(body.get("experienceLetterTemplateId"))

    site.save()
    # On create, pin the site's state letter templates (if the admin has any).
    if created:
        _auto_assign_letter_templates(site)
        site.save(update_fields=["appointment_letter_template", "experience_letter_template",
                                 "updated_at"])
    return site.id


def _employer_set_gate_pass_block(user, body):
    """Block or unblock gate-pass generation for a worker (both pass types)."""
    from bss_core.models import WorkerGatePassBlock, WorkerIdentity
    bss_id = str(body.get("workerId") or body.get("bssId") or "").strip().upper()
    identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
    if identity is None:
        raise PortalMutationError("Worker not found for that BSS ID.", 404)
    blocked = bool(body.get("blocked"))
    WorkerGatePassBlock.objects.update_or_create(
        worker=identity.user, employer=user,
        defaults={"blocked": blocked, "blocked_by": user})
    return {"workerId": bss_id, "blocked": blocked}


def _employer_set_gate_pass_dates(user, body):
    """Set the validity window (validFrom / validTo) of an employer's gate pass.

    Auto-generated passes (id "auto-<bindingId>") are materialised into a real
    WorkerGatePass row on first edit so the dates persist; explicit passes are
    updated in place. Missing dates fall back to the worker's BSS ID card."""
    from bss_core.models import WorkerGatePass, WorkerContractorBinding

    def parse(value):
        text = str(value or "").strip()
        if not text:
            return None
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            raise PortalMutationError("Dates must be in YYYY-MM-DD format.", 400)

    start = parse(body.get("validFrom"))
    end = parse(body.get("validTo"))
    row_id = str(body.get("id") or "").strip()
    if row_id.startswith("auto-"):
        binding = (WorkerContractorBinding.objects
                   .filter(pk=int(row_id[5:]), site__employer=user)
                   .select_related("worker", "site").first())
        if binding is None:
            raise PortalMutationError("Gate pass not found.", 404)
        gp_type = payloads._auto_gate_pass_type(binding.worker)
        if not gp_type:
            raise PortalMutationError(
                "This worker is not eligible for a gate pass yet — the 5 documents "
                "unlock a Temporary pass and all 8 checks a Permanent one.", 400)
        gp = WorkerGatePass.objects.filter(
            worker=binding.worker, gate_pass_type=gp_type,
            status__in=("PENDING", "ACTIVE")).first()
        if gp is None:
            gp = WorkerGatePass.objects.create(
                worker=binding.worker, site=binding.site, gate_pass_type=gp_type,
                gate_pass_no=payloads._auto_gate_pass_no(binding.worker, gp_type),
                status="ACTIVE", issued_by=user, source="MANUAL")
    else:
        gp = WorkerGatePass.objects.filter(pk=int(row_id or 0), site__employer=user).first()
        if gp is None:
            raise PortalMutationError("Gate pass not found.", 404)
    if start:
        gp.start_date = start
    if end:
        gp.end_date = end
    gp.save()
    return payloads._employer_gate_pass_row(gp)


def _employer_set_gate_pass_dispatch(user, body):
    """Dispatch (or recall) gate passes so the worker can see them.

    Accepts row ids — explicit WorkerGatePass ids and/or auto ids
    ("auto-<bindingId>", materialised into real rows first). Default is
    undispatched: the worker cannot see a pass until the employer dispatches it.
    """
    from bss_core.models import WorkerGatePass, WorkerContractorBinding

    want = bool(body.get("dispatched", True))
    raw = body.get("ids")
    if not isinstance(raw, list) or not raw:
        raw = [body.get("id")] if body.get("id") else []
    now = timezone.now()
    updated = []
    for raw_id in raw:
        rid = str(raw_id or "").strip()
        gp = None
        if rid.startswith("auto-"):
            binding = (WorkerContractorBinding.objects
                       .filter(pk=int(rid[5:] or 0), site__employer=user)
                       .select_related("worker", "site").first())
            if binding is None:
                continue
            gp_type = payloads._auto_gate_pass_type(binding.worker)
            if not gp_type:
                continue
            gp = WorkerGatePass.objects.filter(
                worker=binding.worker, gate_pass_type=gp_type,
                status__in=("PENDING", "ACTIVE")).first()
            if gp is None:
                issue_date, valid_till = payloads._auto_gate_pass_dates(binding.worker, gp_type)
                gp = WorkerGatePass.objects.create(
                    worker=binding.worker, site=binding.site, gate_pass_type=gp_type,
                    gate_pass_no=payloads._auto_gate_pass_no(binding.worker, gp_type),
                    status="ACTIVE", issued_by=user, source="SYSTEM",
                    start_date=issue_date, end_date=valid_till)
        elif rid.isdigit():
            gp = WorkerGatePass.objects.filter(pk=int(rid), site__employer=user).first()
        if gp is None:
            continue
        gp.dispatched = want
        gp.dispatched_at = now if want else None
        gp.dispatched_by = user if want else None
        gp.save(update_fields=["dispatched", "dispatched_at", "dispatched_by", "updated_at"])
        updated.append(gp.id)
        # Gate Pass §5 — notify the worker and contractor when a pass is dispatched.
        if want:
            recipients = [gp.worker]
            if gp.issued_by_id:
                recipients.append(gp.issued_by)
            for party in recipients:
                if party is None or party.id == user.id:
                    continue
                _create_notification(
                    user=party, title="Gate pass dispatched",
                    body=(f"Gate pass {gp.gate_pass_no} is now active"
                          + (f" ({gp.start_date} → {gp.end_date})" if gp.start_date and gp.end_date else "")
                          + " and available in your portal."),
                    notif_type="INFO",
                    link="/worker/gate-pass" if party.role == "worker" else "/contractor/gate-pass")
    if not updated:
        raise PortalMutationError("No gate passes matched.", 404)
    rows = [payloads._employer_gate_pass_row(g)
            for g in WorkerGatePass.objects.filter(pk__in=updated)]
    return rows[0] if len(rows) == 1 else rows


def _gate_pass_for_actor(user, gp_id):
    """Resolve a gate pass the actor may act on: the employer who owns the site,
    or the contractor who issued it / whose worker it belongs to."""
    from bss_core.models import WorkerContractorBinding, WorkerGatePass
    gp = WorkerGatePass.objects.filter(pk=gp_id).select_related("site", "worker").first()
    if gp is None:
        raise PortalMutationError("Gate pass not found.", 404)
    if user.role == "employer" and gp.site and gp.site.employer_id == user.id:
        return gp
    if user.role == "contractor" and (
            gp.issued_by_id == user.id or WorkerContractorBinding.objects.filter(
                worker=gp.worker, contractor=user, binding_status="ACCEPTED").exists()):
        return gp
    raise PortalMutationError("You cannot act on this gate pass.", 403)


def _revoke_gate_pass(user, body):
    """Revoke an active gate pass (employer or contractor). A reason is mandatory;
    a revoked pass can never be renewed."""
    gp = _gate_pass_for_actor(user, body.get("id"))
    reason = str(body.get("reason") or "").strip()
    if not reason:
        raise PortalMutationError("A revocation reason is mandatory.", 400)
    if gp.status == "REVOKED":
        raise PortalMutationError("This gate pass is already revoked.", 409)
    gp.status = "REVOKED"
    gp.revoked_reason = reason[:255]
    gp.revoked_by = user
    gp.revoked_at = timezone.now()
    gp.renewal_blocked = True
    gp.save(update_fields=["status", "revoked_reason", "revoked_by", "revoked_at",
                           "renewal_blocked", "updated_at"])
    for party in (gp.worker, getattr(gp, "issued_by", None)):
        if party is not None and party.id != user.id:
            _create_notification(
                user=party, title="Gate pass revoked",
                body=f"Gate pass {gp.gate_pass_no} was revoked. Reason: {reason}.",
                notif_type="WARNING", link="/worker/gate-pass")
    return payloads._employer_gate_pass_row(gp)


def _renew_gate_pass(user, body):
    """Renew an expired gate pass: re-checks eligibility, issues a fresh pass
    with new validity. Blocked for revoked passes and ineligible workers."""
    from bss_core.models import WorkerGatePass
    gp = _gate_pass_for_actor(user, body.get("id"))
    if gp.status != "EXPIRED":
        raise PortalMutationError("Only an expired gate pass can be renewed.", 409)
    if gp.renewal_blocked:
        raise PortalMutationError("A revoked gate pass cannot be renewed — issue a fresh "
                                  "dispatch instead.", 409)
    gp_type = payloads._auto_gate_pass_type(gp.worker)
    if not gp_type:
        raise PortalMutationError(
            "This worker is not eligible for renewal — Medical and Health & Safety "
            "must be Done.", 409)
    today = timezone.localdate()
    new_gp = WorkerGatePass.objects.create(
        worker=gp.worker, site=gp.site, gate_pass_type=gp_type,
        gate_pass_no=payloads._auto_gate_pass_no(gp.worker, gp_type),
        status="ACTIVE", start_date=today,
        end_date=today + timedelta(days=payloads._gate_pass_validity_days(gp.worker, gp_type)),
        issued_by=user, source=gp.source, renewed_from=gp,
        dispatched=gp.dispatched, dispatched_at=gp.dispatched_at,
        dispatched_by=gp.dispatched_by)
    _create_notification(
        user=gp.worker, title="Gate pass renewed",
        body=f"Your gate pass was renewed — {new_gp.gate_pass_no} is now active.",
        notif_type="APPROVAL", link="/worker/gate-pass")
    return payloads._employer_gate_pass_row(new_gp)


def _handle_gate_pass(user, body):
    """Gate pass workflow.

    * Contractor: request single / bulk temporary or permanent passes for their
      bound workers (created PENDING, awaiting the principal employer).
    * Employer: approve / reject requests for sites they own; approval sets the
      validity window (TGP 30 days, PGP 365 days) and activates the pass.
    """
    from bss_core.models import WorkerGatePass, WorkerIdentity, WorkerContractorBinding

    if user.role == "employer":
        # Employer may block/unblock generation, edit a pass validity window,
        # dispatch passes, revoke, or renew.
        if "blocked" in body:
            return _employer_set_gate_pass_block(user, body)
        if "validFrom" in body or "validTo" in body:
            return _employer_set_gate_pass_dates(user, body)
        if "dispatched" in body:
            return _employer_set_gate_pass_dispatch(user, body)
        if str(body.get("action") or "").lower() == "revoke":
            return _revoke_gate_pass(user, body)
        if str(body.get("action") or "").lower() == "renew":
            return _renew_gate_pass(user, body)
        ids = body.get("ids") or ([body.get("id")] if body.get("id") else [])
        decision = str(body.get("status") or "").strip().lower()
        today = timezone.localdate()
        updated = []
        for gp in WorkerGatePass.objects.filter(pk__in=ids, site__employer=user):
            if decision in ("approved", "approve"):
                gp.status = "ACTIVE"
                gp.start_date = today
                gp.end_date = today + timedelta(
                    days=payloads._gate_pass_validity_days(gp.worker, gp.gate_pass_type))
                gp.approved_by = user
                gp.approved_at = timezone.now()
            elif decision in ("rejected", "reject"):
                gp.status = "REJECTED"
                gp.approved_by = user
                gp.approved_at = timezone.now()
                gp.remarks = str(body.get("remarks") or "")[:255]
            else:
                raise PortalMutationError("Select approve or reject.", 400)
            gp.save()
            updated.append(gp.id)
            # Gate Pass §5 — notify the worker and the requesting contractor.
            recipients = [gp.worker]
            if gp.issued_by_id:
                recipients.append(gp.issued_by)
            for party in recipients:
                if party is None or party.id == user.id:
                    continue
                if gp.status == "ACTIVE":
                    title, body_text, tone = ("Gate pass approved",
                                              f"Gate pass {gp.gate_pass_no} was approved — valid "
                                              f"{gp.start_date} to {gp.end_date}.", "APPROVAL")
                else:
                    title, body_text, tone = ("Gate pass rejected",
                                              f"Gate pass {gp.gate_pass_no} was rejected by the "
                                              f"principal employer.", "WARNING")
                _create_notification(
                    user=party, title=title, body=body_text, notif_type=tone,
                    link="/worker/gate-pass" if party.role == "worker" else "/contractor/gate-pass")
        if not updated:
            raise PortalMutationError("No gate pass requests matched.", 404)
        rows = [payloads._employer_gate_pass_row(g)
                for g in WorkerGatePass.objects.filter(pk__in=updated)]
        return rows[0] if len(rows) == 1 else rows

    # Contractor: request single / bulk, or revoke/renew an existing pass.
    action = str(body.get("action") or "").lower()
    if action == "revoke":
        return _revoke_gate_pass(user, body)
    if action == "renew":
        return _renew_gate_pass(user, body)
    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        bss_id = str(row.get("workerId") or row.get("bssId") or "").strip().upper()
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
        if identity is None:
            raise PortalMutationError("Worker not found for that BSS ID.", 404)
        worker = identity.user
        binding = (WorkerContractorBinding.objects.filter(
            worker=worker, contractor=user, binding_status="ACCEPTED")
            .select_related("site").first())
        if binding is None:
            raise PortalMutationError("This worker is not bound to you.", 403)
        gp_type = "PGP" if str(row.get("type") or "").lower().startswith("perm") else "TGP"
        eligibility = payloads._gate_pass_eligibility(worker)
        if gp_type == "PGP" and not eligibility.get("permanentEligible"):
            raise PortalMutationError(
                "This worker is not eligible for a Permanent Gate Pass — Medical, "
                "Health & Safety and Compliance must all be Done.", 400)
        if gp_type == "TGP" and not eligibility.get("temporaryEligible"):
            raise PortalMutationError(
                "This worker is not eligible for a Temporary Gate Pass — Medical and "
                "Health & Safety must be Done.", 400)
        existing = WorkerGatePass.objects.filter(
            worker=worker, gate_pass_type=gp_type, status__in=("PENDING", "ACTIVE")).first()
        if existing:
            created.append(existing)
            continue
        gp = WorkerGatePass.objects.create(
            worker=worker, site=binding.site, gate_pass_type=gp_type,
            gate_pass_no=payloads._auto_gate_pass_no(worker, gp_type),
            status="PENDING", issued_by=user, source="CONTRACTOR_GATE_PASS")
        created.append(gp)
    out = [payloads._contractor_gate_pass_row(g) for g in created]
    return out[0] if len(out) == 1 else out


__all__ = [
    "_employer_set_gate_pass_block",
    "_employer_set_gate_pass_dates",
    "_handle_compliances",
    "_handle_default_site",
    "_handle_gate_pass",
    "_handle_job_posting",
    "_handle_rozgar_apply",
    "_handle_rozgar_respond",
    "_handle_site",
]
