"""Cross-role payload helpers shared by the worker/contractor/employer builders."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _advance_row(a):
    wi = _get_identity(a.worker)
    return {
        "id": f"ADV-{a.id:04d}",
        "advanceId": a.id,
        "worker": _d(wi.name if wi and wi.name else a.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "amount": _num(a.amount),
        "reason": _d(a.reason),
        "requestedOn": _dts(a.requested_at.date()) if a.requested_at else "",
        "status": {"REQUESTED": "Requested", "APPROVED": "Approved",
                   "DISBURSED": "Disbursed", "ACCEPTED": "Accepted",
                   "ADJUSTED": "Adjusted", "REJECTED": "Rejected"}.get(a.status, a.status),
        "approvedOn": _dts(a.approved_at.date()) if a.approved_at else "",
        "disbursedOn": _dts(a.disbursed_at.date()) if a.disbursed_at else "",
        "mode": a.get_mode_display() if a.mode else "",
        "reference": _d(a.reference),
        "payrollPeriod": _d(a.payroll_period),
    }


def _latest_gate_pass(user, gp_type):
    return (WorkerGatePass.objects.filter(worker=user, gate_pass_type=gp_type)
            .order_by("-created_at").first())


def _rh_request_row(r):
    """Restricted-holiday request row, shared by the worker and contractor views."""
    wi = WorkerIdentity.objects.filter(user=r.worker).first()
    return {
        "id": str(r.id),
        "worker": _d(wi.name if wi else r.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": r.site.site_name if r.site else "",
        "siteId": r.site_id,
        "holidayDate": _dts(r.holiday_date),
        "holidayName": _d(r.holiday_name),
        "reason": _d(r.reason),
        "status": _RH_STATUS.get(str(r.status).upper(), "Pending"),
        "requestedOn": _dts(r.created_at),
        "decidedOn": _dts(r.decided_at) if r.decided_at else "",
        "comment": _d(r.comment),
    }


def _doc_owner_label(value):
    return {"worker": "Worker", "contractor": "Contractor", "system": "System"}.get(
        (value or "").strip().lower(), "Worker")


def _doc_source_label(code, auto_generated):
    """Where a locked document actually came from: DigiLocker fetch vs a
    system-generated credential (letters / gate passes)."""
    if auto_generated:
        return "digilocker" if code in _DIGILOCKER_DOC_CODES else "system"
    return "upload"


def _doc_name_key(name):
    """Normalised key for merging duplicate catalog rows (e.g. legacy 'WM0x'
    rows vs the canonical 'AADHAR'/'PAN' codes)."""
    key = re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()
    return key.replace("educational", "education")


def _doc_row_rank(row):
    """Prefer a row that actually has a stored file, then a DigiLocker code."""
    return (1 if row["id"] else 0, 1 if row["code"] in _DIGILOCKER_DOC_CODES else 0)


def _ce_initiator_acceptor(b):
    """(initiated_by, accepted_by) role labels for a contractor<->employer binding.

    The initiator is derived from how the request was raised (who scanned whose
    QR). Once accepted, the counterparty of the initiator is the acceptor."""
    initiated = _CE_SOURCE_INITIATOR.get(str(b.source or "").lower(), "Contractor")
    accepted = ""
    if str(b.binding_status).upper() == "ACCEPTED":
        accepted = "Employer" if initiated == "Contractor" else "Contractor"
    return initiated, accepted


def _wc_initiator_acceptor(b):
    """(initiated_by, accepted_by) for a worker<->contractor binding.

    Uses the stored `initiated_by` — a worker scanning a contractor QR (or
    applying to a job) makes it worker-initiated; a contractor scanning a worker
    QR (or adding the worker) makes it contractor-initiated. Falls back to the
    old consent-order heuristic for legacy rows created before the field existed
    (only reliable while the binding is still PENDING)."""
    stored = str(getattr(b, "initiated_by", "") or "").lower()
    if stored in ("worker", "contractor"):
        initiated = "Worker" if stored == "worker" else "Contractor"
    else:
        initiated = "Worker" if (bool(b.consent_worker) and not bool(b.consent_contractor)) else "Contractor"
    accepted = ""
    if str(b.binding_status).upper() == "ACCEPTED":
        accepted = "Contractor" if initiated == "Worker" else "Worker"
    return initiated, accepted


def _wc_history(b):
    """Chronological binding/unbinding events for a worker<->contractor binding."""
    initiated, accepted = _wc_initiator_acceptor(b)
    events = [{"label": "Requested", "by": initiated, "at": _dts(b.created_at)}]
    if b.accepted_at:
        events.append({"label": "Binding accepted",
                       "by": accepted or ("Worker" if b.consent_worker else "Contractor"),
                       "at": _dts(b.accepted_at)})
    if str(b.binding_status).upper() == "REJECTED":
        by = {"worker": "Worker", "contractor": "Contractor"}.get(str(b.rejected_by or "").lower(), "")
        if not by:
            by = "Worker"  # a worker binding is raised by the contractor, so the worker declines
        events.append({"label": "Rejected", "by": by, "at": _dts(b.rejected_at) or _dts(b.updated_at)})
    if b.unbind_requested_at:
        by = {"worker": "Worker", "contractor": "Contractor"}.get(str(b.unbind_requested_by or "").lower(), "")
        if not by:
            if b.unbind_consent_contractor and not b.unbind_consent_worker:
                by = "Contractor"
            elif b.unbind_consent_worker and not b.unbind_consent_contractor:
                by = "Worker"
            else:
                by = "Both parties"
        events.append({"label": "Unbind requested", "by": by, "at": _dts(b.unbind_requested_at)})
    if b.unbound_at:
        events.append({"label": "Unbound", "by": "Both parties", "at": _dts(b.unbound_at)})
    return events


def _ce_history(b):
    """Chronological binding/unbinding events for a contractor<->employer binding."""
    initiated, accepted = _ce_initiator_acceptor(b)
    events = [{"label": "Requested", "by": initiated, "at": _dts(b.created_at)}]
    if b.accepted_at:
        events.append({"label": "Binding accepted",
                       "by": accepted or ("Employer" if initiated == "Contractor" else "Contractor"),
                       "at": _dts(b.accepted_at)})
    if str(b.binding_status).upper() == "REJECTED":
        by = {"contractor": "Contractor", "employer": "Employer"}.get(str(b.rejected_by or "").lower(), "")
        if not by:
            by = "Employer" if initiated == "Contractor" else "Contractor"
        events.append({"label": "Rejected", "by": by, "at": _dts(b.rejected_at) or _dts(b.updated_at)})
    if b.unbind_requested_at:
        by = {"contractor": "Contractor", "employer": "Employer"}.get(str(b.unbind_requested_by or "").lower(), "")
        if not by:
            if b.unbind_consent_contractor and not b.unbind_consent_employer:
                by = "Contractor"
            elif b.unbind_consent_employer and not b.unbind_consent_contractor:
                by = "Employer"
            else:
                by = "Both parties"
        events.append({"label": "Unbind requested", "by": by, "at": _dts(b.unbind_requested_at)})
    if b.unbound_at:
        events.append({"label": "Unbound", "by": "Both parties", "at": _dts(b.unbound_at)})
    return events


def _binding_row(b):
    """Canonical binding payload (E·C·S·W), shared by worker/contractor/employer views."""
    initiated_by, accepted_by = _wc_initiator_acceptor(b)
    site = b.site
    employer_name = ""
    if site and site.employer:
        employer_name = _org_name(site.employer)
    contractor = b.contractor
    contractor_name = ""
    contractor_code = ""
    contractor_lin = ""
    if contractor:
        cp = getattr(contractor, "contractor_profile", None)
        contractor_name = _org_name(contractor)
        contractor_code = _d(cp.contractor_code if cp else _bss_contractor_code(contractor.id))
        contractor_lin = _d(getattr(cp, "lin", ""))
    # A live binding unlocks the contractor's business identity for the worker.
    contractor_details = {}
    if contractor and str(b.binding_status).upper() == "ACCEPTED":
        cp = getattr(contractor, "contractor_profile", None)
        contractor_details = {
            "name": contractor_name,
            "code": contractor_code,
            "tradeName": _d(getattr(cp, "trade_name", "") if cp else ""),
            "lin": contractor_lin,
            "contactPerson": _d(getattr(cp, "contact_person", "") if cp else ""),
            "email": _d(getattr(cp, "email", "") if cp else ""),
            "state": _d(getattr(cp, "state", "") if cp else ""),
            "address": _d(getattr(cp, "address", "") if cp else ""),
        }
    wi = WorkerIdentity.objects.filter(user=b.worker).first()
    worker_name = _d(wi.name if wi else b.worker.username)
    worker_bss = _d(wi.bss_worker_id if wi else _bss_worker_code(b.worker_id))
    emp = WorkerEmployment.objects.filter(user=b.worker).first()
    latest_wage = WorkerWages.objects.filter(worker=b.worker).order_by("-period_end").first()
    wage_value = b.offered_wage if b.offered_wage is not None else (latest_wage.gross_wage if latest_wage else None)
    wage = f"₹{_num(wage_value):,.0f} / month" if wage_value else ""
    status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                  "CANCELLED": "Cancelled", "EXPIRED": "Expired"}
    return {
        "id": b.id,
        "ref": f"BIND-2026-{b.id:03d}",
        "worker": worker_name,
        "workerBssId": worker_bss,
        "contractor": contractor_name,
        "contractorCode": contractor_code,
        "lin": contractor_lin,
        "contractorDetails": contractor_details,
        "employer": employer_name,
        "site": site.site_name if site else "",
        "siteId": b.site_id,
        "designation": _d(b.designation) or (_d(emp.designation) if emp else ""),
        "department": _d(b.department) or (_d(emp.department) if emp else ""),
        "shift": _d(b.shift) or (_d(emp.shift) if emp else ""),
        "wage": wage,
        "requestedOn": _dts(b.created_at),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "initiatedBy": initiated_by,
        "acceptedBy": accepted_by,
        "consentWorker": bool(b.consent_worker),
        "consentContractor": bool(b.consent_contractor),
        "consentMethod": _d(b.consent_method),
        "unbindConsentWorker": bool(b.unbind_consent_worker),
        "unbindConsentContractor": bool(b.unbind_consent_contractor),
        "unbindRequested": bool(b.unbind_requested_at),
        "history": _wc_history(b),
    }


def _ce_binding_row(b):
    """Contractor<->employer binding with its site allotments (E·C·S·W)."""
    cp = getattr(b.contractor, "contractor_profile", None)
    ep = getattr(b.employer, "employer_profile", None)
    status_map = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                  "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    allot_status = {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                    "RELEASED": "Released"}
    initiated_by, accepted_by = _ce_initiator_acceptor(b)
    allotments = [
        {
            "id": a.id,
            "siteId": a.site_id,
            "site": a.site.site_name if a.site else "",
            "siteCode": a.site.site_code if a.site else "",
            "status": allot_status.get(str(a.status).upper(), "Pending"),
            "source": _d(a.source),
            "releaseRequested": bool(a.release_requested_at),
            "releaseRequestedBy": _d(a.release_requested_by),
            "successorContractorId": a.successor_contractor_id,
            "successorName": _org_name(a.successor_contractor) if a.successor_contractor else "",
            "workersAtRisk": WorkerContractorBinding.objects.filter(
                contractor=b.contractor, site_id=a.site_id
            ).exclude(binding_status__in=["REJECTED", "CANCELLED", "EXPIRED"]).count(),
        }
        for a in b.allotments.all()
    ]
    return {
        "id": b.id,
        "ref": f"CEB-2026-{b.id:03d}",
        "initiatedBy": initiated_by,
        "acceptedBy": accepted_by,
        "contractor": _org_name(b.contractor),
        "contractorCode": _d(cp.contractor_code if cp else "", _bss_contractor_code(b.contractor_id)),
        "employer": _org_name(b.employer),
        "employerCode": _d(ep.employer_code if ep else "", _bss_employer_code(b.employer_id)),
        "status": status_map.get(str(b.binding_status).upper(), "Pending"),
        "consentContractor": bool(b.consent_contractor),
        "consentEmployer": bool(b.consent_employer),
        "source": _d(b.source),
        "unbindRequested": bool(b.unbind_requested_at),
        "unbindConsentContractor": bool(b.unbind_consent_contractor),
        "unbindConsentEmployer": bool(b.unbind_consent_employer),
        "requestedOn": _dts(b.created_at),
        "allotments": allotments,
        "history": _ce_history(b),
    }


def _site_leave_policies(site):
    if site is None:
        return []
    return list(SiteLeavePolicy.objects.filter(site=site, is_active=True)
                .select_related("leave_type"))


def _leave_row(request_obj):
    approver_name = ""
    if request_obj.approver:
        cp = getattr(request_obj.approver, "contractor_profile", None)
        approver_name = _d(cp.contractor_name if cp else request_obj.approver.username)
    return {
        "id": str(request_obj.id),
        "type": request_obj.leave_type.name if request_obj.leave_type else "",
        "from": _dts(request_obj.from_date),
        "to": _dts(request_obj.to_date),
        "reason": _d(request_obj.reason),
        "submitted": _dts(request_obj.created_at),
        "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                   "CANCELLED": "Cancelled"}.get(str(request_obj.status).upper(), "Pending"),
        "approver": approver_name,
        "comment": _d(request_obj.comment),
    }


def _grievance_context(g):
    """Contractor / employer / site for a grievance — the snapshot first, else the
    worker's binding (accepted, else most recent) so the audit view survives an
    unbind and legacy rows still resolve."""
    contractor, employer, site = g.contractor, g.employer, None
    binding = (WorkerContractorBinding.objects
               .filter(worker=g.worker, binding_status="ACCEPTED")
               .select_related("contractor", "site", "site__employer").first())
    if binding is None:
        binding = (WorkerContractorBinding.objects
                   .filter(worker=g.worker)
                   .select_related("contractor", "site", "site__employer")
                   .order_by("-created_at").first())
    if binding is not None:
        contractor = contractor or binding.contractor
        employer = employer or (binding.site.employer if binding.site else None)
        site = binding.site
    return contractor, employer, site


def _grievance_row(g):
    """Canonical grievance row shared by the worker / contractor / employer portals."""
    wi = _get_identity(g.worker)
    contractor, employer, site = _grievance_context(g)
    replies = [{
        "id": str(r.id),
        "by": _GRIEVANCE_ACTOR.get((getattr(r.actor, "role", "") or r.actor_role or "").lower(), "Worker"),
        "text": _d(r.body),
        "at": _dts(r.created_at),
        "attachment": bool(r.attachment),
        "attachmentName": (r.attachment.name.split("/")[-1] if r.attachment else (_d(r.attachment_file) or None)),
    } for r in g.responses.order_by("created_at")]
    return {
        "id": str(g.id),
        "ref": _d(g.ticket_no),
        "category": _GRIEVANCE_CATEGORY.get(str(g.category).upper(), "Other"),
        "status": _GRIEVANCE_UI_STATUS.get(str(g.status).upper(), "Submitted"),
        "worker": _d(wi.name if wi and wi.name else g.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": site.site_name if site else "",
        "employer": _org_name(employer) if employer else "",
        "contractor": _org_name(contractor) if contractor else "",
        "raisedAt": _dts(g.created_at),
        "updatedAt": _dts(g.updated_at),
        "description": _d(g.body),
        "audioAvailable": bool(g.audio),
        "duration": g.recording_duration_secs or 0,
        "attachmentName": (g.attachment.name.split("/")[-1] if g.attachment else (_d(g.attachment_file) or None)),
        "replyHistory": replies,
        "resolutionConfirmed": bool(g.resolution_confirmed),
        "resolvedAt": _dts(g.resolved_at) if g.resolved_at else "",
        "confirmedAt": _dts(g.confirmed_at) if g.confirmed_at else "",
    }


def _default_site_info(profile):
    """The role's pre-selected default site, or None."""
    site = getattr(profile, "default_site", None) if profile else None
    if site is None:
        return None
    return {"id": str(site.id), "name": _d(site.site_name), "code": _d(site.site_code)}


def _site_compliance_pct(user, site):
    """Real per-site compliance: latest persisted audit report score for the
    site (Final Submit), else the verification share of evidence submissions.
    None when the site has no compliance data at all."""
    rep = ComplianceReport.objects.filter(
        employer=user, site_name=site.site_name).order_by("-report_date").first()
    if rep and rep.score_pct is not None:
        return int(round(float(rep.score_pct)))
    ev = SubmissionEvidence.objects.filter(user=user, site=site.site_name)
    total = ev.count()
    if total:
        return int(round(100 * ev.filter(status="VERIFIED").count() / total))
    return None


def _compliance_status(c):
    """Register status derived from the expiry date (Active / Expiring / Expired)."""
    if not c.due_date:
        return "Active"
    days = (c.due_date - timezone.localdate()).days
    if days < 0:
        return "Expired"
    if days <= 30:
        return "Expiring"
    return "Active"


def _compliance_doc_row(c):
    """Canonical statutory-compliance row (shared by the contractor/employer views)."""
    return {
        "id": str(c.id),
        "item": _d(c.master.act if c.master else ""),
        "category": _d(c.master.nature if c.master else ""),
        "reference": _d(c.unique_no),
        "employer": _d(c.client_name) or (_org_name(c.employer) if c.employer else ""),
        "site": c.site.site_name if c.site else "",
        "worker": _party_name(c.worker) if c.worker else None,
        "issue": _dts(c.issue_date) if c.issue_date else (_dts(c.created_at.date()) if c.created_at else ""),
        "expiry": _dts(c.due_date) if c.due_date else "",
        "verification": _d(c.verification) or "Pending",
        "status": _compliance_status(c),
    }


def _gate_pass_eligibility(worker):
    """Real eligibility for a site gate pass, from the worker's own records.

    Medical / Health & Safety / Compliance (Excel: Contractor > Gate Pass >
    Gate Pass Register eligibility columns).
    """
    ws = WorkerWelfareSafety.objects.filter(user=worker).first()
    banking = WorkerBanking.objects.filter(user=worker).first()
    social = WorkerSocialSecurity.objects.filter(user=worker).first()
    identity = _get_identity(worker)

    def yes(value):
        return str(value or "").strip().lower() in ("done", "yes", "completed", "fit", "verified", "true")

    medical = bool(ws and (yes(ws.medical_examination_status) or yes(ws.medical_fitness_status)))
    safety_kit = bool(ws and (ws.ppe_required or (ws.types_of_ppe_given or "").strip()))
    safety_training = bool(ws and ws.safety_training_completed)
    site_induction = bool(ws and yes(ws.site_induction_status))
    health_safety = safety_kit or safety_training or site_induction
    ppe = safety_kit
    welfare_safety = safety_training or site_induction
    # Documents count as verified only from a verification action — never from a
    # merely uploaded/typed record:
    #   Aadhaar — only ever stored after Aadhaar OTP / DigiLocker oKYC.
    #   PAN     — DigiLocker-verified (pan_verified).
    #   Bank    — penny-drop verified (bank_verification_status == Verified).
    #   UAN/ESIC— approved by the contractor (uan_verified / esic_verified).
    aadhaar = bool(identity and (identity.aadhaar or "").strip())
    pan = bool(identity and identity.pan_verified and (identity.pan or "").strip())
    bank = bool(banking and (banking.bank_account_number or "").strip()
                and str(banking.bank_verification_status or "").strip().lower() == "verified")
    uan = bool(social and social.uan_verified and (social.epfo_uan or "").strip())
    esi = bool(social and social.esic_verified and (social.esic_ip_number or "").strip())
    # The five documents: Aadhaar + PAN + Bank (auto-verified) + UAN + ESIC.
    # 5 documents → Temporary gate pass; all 8 checks (+ Medical, PPE and
    # Welfare & Safety) → Permanent gate pass.
    document_count = sum(1 for x in (aadhaar, pan, bank, uan, esi) if x)
    check_count = document_count + sum(1 for x in (medical, ppe, welfare_safety) if x)
    compliance = document_count == 5

    done = "Done"
    pending = "Pending"
    return {
        "medical": done if medical else pending,
        "healthSafety": done if health_safety else pending,
        "compliance": done if compliance else pending,
        "safetyKit": done if safety_kit else pending,
        "safetyTraining": done if safety_training else pending,
        "siteInduction": done if site_induction else pending,
        "ppe": done if ppe else pending,
        "welfareSafety": done if welfare_safety else pending,
        "aadhaar": done if aadhaar else pending,
        "pan": done if pan else pending,
        "bank": done if bank else pending,
        "uan": done if uan else pending,
        "esi": done if esi else pending,
        "documentCount": document_count,
        "checkCount": check_count,
    }


def _gate_pass_worker_meta(worker):
    identity = _get_identity(worker)
    skills = WorkerSkillsEmployability.objects.filter(user=worker).first()
    return {
        "workerName": _d(identity.name if identity and identity.name else worker.username),
        "workerId": _d(identity.bss_worker_id if identity else ""),
        "contact": _d(identity.mobile_number if identity else ""),
        "skill": _d(skills.primary_skill if skills else ""),
    }


def _submission_document_master():
    """Admin Document Master — the statutory documents/registers a contractor can
    submit, driving the dynamic client-mapped document list in the wizard."""
    from bss_core.models import RegisterDocumentMaster
    rows = []
    qs = (RegisterDocumentMaster.objects.filter(is_active=True)
          .order_by("sort_order", "document_name"))
    for d in qs:
        rows.append({
            "name": _d(d.document_name),
            "code": _d(d.code),
            "type": {"register": "Register", "document": "Document"}.get(d.kind, _d(d.kind)),
            "formNo": _d(d.form_number),
            "act": _d(d.act),
            "frequency": _d(d.frequency),
            "mandatory": bool(d.is_mandatory),
            "format": "PDF",
            "criticality": _d(d.criticality),
        })
    return rows


def _benefit_row(r):
    wi = _get_identity(r.worker)
    return {
        "id": r.id,
        "worker": _d(wi.name if wi and wi.name else r.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "employer": "",
        "period": _d(r.period),
        "amount": _num(r.amount),
        "days": _num(r.days) if r.days is not None else None,
        "reason": _d(r.reason),
        "paidOn": _dts(r.paid_on) if r.paid_on else "",
        "status": {"RECORDED": "Recorded", "CREDITED": "Credited",
                   "PROCESSING": "Processing", "PAID": "Paid"}.get(r.status, r.status),
        "source": "contractor",
    }


def _site_past_contractors(site, employer, active_ids):
    """Terminal (cancelled/rejected/released) relationships at a site, so history
    stays visible without being shown as a live connection. Active contractors are
    excluded. One row per contractor, carrying the most recent terminal event."""
    TERMINAL_BINDING = {"CANCELLED": "Cancelled", "REJECTED": "Rejected", "EXPIRED": "Expired"}
    latest = {}
    for b in (WorkerContractorBinding.objects
              .filter(site=site, binding_status__in=list(TERMINAL_BINDING))
              .only("contractor_id", "binding_status", "updated_at", "created_at")):
        when = b.updated_at or b.created_at
        prev = latest.get(b.contractor_id)
        if prev is None or when > prev["at"]:
            latest[b.contractor_id] = {"at": when, "status": TERMINAL_BINDING[b.binding_status]}
    for a in (ContractorSiteAllotment.objects
              .filter(site=site, binding__employer=employer, status__in=["REJECTED", "RELEASED"])
              .select_related("binding")):
        when = a.updated_at or a.created_at
        cid = a.binding.contractor_id
        prev = latest.get(cid)
        if prev is None or when > prev["at"]:
            latest[cid] = {"at": when, "status": "Released" if a.status == "RELEASED" else "Rejected"}
    rows = []
    for cid, info in latest.items():
        if cid in active_ids:
            continue
        c = User.objects.filter(id=cid).first()
        if not c:
            continue
        cp = getattr(c, "contractor_profile", None)
        rows.append({
            "id": str(cid),
            "name": _d(cp.contractor_name if cp else "", c.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(cid)),
            "status": info["status"],
            "endedAt": _dts(info["at"]) or "",
        })
    rows.sort(key=lambda r: r["endedAt"], reverse=True)
    return rows


def _site_scalar_data(s):
    """All editable scalar fields of a Site, keyed by model column name."""
    out = {}
    for f in _SITE_SCALAR_FIELDS:
        v = getattr(s, f, None)
        if v is None:
            out[f] = None
        elif isinstance(v, (datetime.datetime, datetime.date)):
            out[f] = v.isoformat()
        elif hasattr(v, "isoformat"):
            out[f] = v.isoformat()
        else:
            out[f] = v
    return out


def _mask(value, keep=4):
    """Mask all but the last `keep` characters (for verified identifiers)."""
    v = str(value or "").strip()
    if not v:
        return ""
    return v if len(v) <= keep else "•" * (len(v) - keep) + v[-keep:]


def _accessibility_prefs(user):
    """Per-user accessibility preferences (shared by every portal)."""
    p = UserPreference.objects.filter(user=user).first()
    a11y = (p.accessibility_prefs or {}) if p else {}
    return {
        "largeText": bool(a11y.get("largeText", False)),
        "highContrast": bool(a11y.get("highContrast", False)),
        "reduceMotion": bool(a11y.get("reduceMotion", False)),
    }


def _portal_settings(user):
    """Full per-user portal settings (language, alerts, communication, privacy,
    accessibility) from the UserPreference table — shared by employer/contractor."""
    p = UserPreference.objects.filter(user=user).first()
    notif = (p.notification_prefs or {}) if p else {}
    comm = (p.communication_prefs or {}) if p else {}
    a11y = (p.accessibility_prefs or {}) if p else {}
    privacy = (p.privacy_prefs or {}) if p else {}
    return {
        "interfaceLanguage": (p.interface_language if p else "") or "en",
        "preferredChannel": comm.get("preferredChannel", "sms"),
        "jobAlerts": bool(notif.get("jobAlerts", True)),
        "complianceAlerts": bool(notif.get("complianceAlerts", True)),
        "grievanceUpdates": bool(notif.get("grievanceUpdates", True)),
        "largeText": bool(a11y.get("largeText", False)),
        "highContrast": bool(a11y.get("highContrast", False)),
        "reduceMotion": bool(a11y.get("reduceMotion", False)),
        "consentToPublicPhoto": bool(privacy.get("consentToPublicPhoto", False)),
        "consentToDataSharing": bool(privacy.get("consentToDataSharing", False)),
        "bindingEnabled": bool(p.binding_enabled) if p else True,
    }


def _successor_candidates(employer, leaving):
    """Contractors the employer can pick as a successor when `leaving` ends:
    their other ACCEPTED contractors first, then every other contractor in the
    system (the employer may engage a new one directly). Rows carry a
    ``contractorId`` always and a ``bindingId`` only when a CE binding exists."""
    rows = []
    seen = set()
    for cb in (ContractorEmployerBinding.objects
               .filter(employer=employer, binding_status="ACCEPTED")
               .exclude(pk=leaving.pk).select_related("contractor")):
        seen.add(cb.contractor_id)
        rows.append({"bindingId": cb.id, "contractorId": cb.contractor_id,
                     "name": _org_name(cb.contractor)})
    for cp in (ContractorProfile.objects.select_related("user")
               .exclude(user_id__in=seen)
               .exclude(user_id=leaving.contractor_id)):
        rows.append({"bindingId": None, "contractorId": cp.user_id,
                     "name": _d(cp.contractor_name) or _org_name(cp.user)})
    return rows


def _auto_gate_pass_type(worker):
    """Pass type from the worker's own records: all 8 checks → Permanent; the 5
    documents (Aadhaar, PAN, Bank, UAN, ESIC) → Temporary; otherwise the worker
    is not eligible for a pass yet and "" is returned."""
    e = _gate_pass_eligibility(worker)
    if e.get("checkCount") == 8:
        return "PGP"
    if e.get("documentCount") == 5:
        return "TGP"
    return ""


_GATE_PASS_CHECK_LABELS = (
    ("aadhaar", "Aadhaar"), ("pan", "PAN"), ("bank", "Bank account"),
    ("uan", "UAN"), ("esi", "ESIC"), ("medical", "Medical"),
    ("ppe", "PPE"), ("welfareSafety", "Welfare & Safety"),
)


def _gate_pass_missing(worker):
    """Labels of the documents/checks a worker has not completed yet (why no
    gate pass has been issued)."""
    e = _gate_pass_eligibility(worker)
    return [label for key, label in _GATE_PASS_CHECK_LABELS if e.get(key) != "Done"]


def _is_gate_pass_blocked(worker, employer):
    """True when the principal employer has blocked gate-pass generation for a worker."""
    if not employer:
        return False
    from bss_core.models import WorkerGatePassBlock
    return WorkerGatePassBlock.objects.filter(worker=worker, employer=employer, blocked=True).exists()


def _auto_gate_pass_dates(worker, gp_type):
    """Auto pass validity: temporary passes run 7 days from today; permanent
    passes mirror the worker's BSS ID card (Issue Date / Valid Till)."""
    today = timezone.localdate()
    if gp_type == "TGP":
        return today, today + datetime.timedelta(days=7)
    employment = WorkerEmployment.objects.filter(user=worker).first()
    issue = (employment.id_card_issue_date if employment else None) or today
    till = (employment.id_card_validity_till if employment else None) or (issue + datetime.timedelta(days=365))
    return issue, till


def _auto_gate_pass_no(worker, gp_type):
    """Stable BSS-P + 11 alphanumeric (permanent) / BSS-T + 11 alphanumeric
    (temporary) id derived from the worker's BSS id, so the same worker/type
    always renders the same pass number. Uses FNV-1a so the frontend can derive
    the identical number without a server round-trip."""
    identity = _get_identity(worker)
    seed = (identity.bss_worker_id if identity and identity.bss_worker_id else worker.username) or str(worker.pk)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    prefix = "BSS-P" if gp_type == "PGP" else "BSS-T"
    material = f"{seed}:{gp_type}"
    h = 2166136261
    out = []
    for rnd in range(11):
        for ch in material:
            h ^= (ord(ch) + rnd) & 0xFFFFFFFF
            h = (h * 16777619) & 0xFFFFFFFF
        out.append(alphabet[h % len(alphabet)])
    return prefix + "".join(out)


def _submission_review_label(status):
    """Map stored SubmissionEvidence status to the employer review labels the
    frontend acts on (Pending review / Verified / Rejected)."""
    st = str(status or "").strip().upper()
    if st == "VERIFIED":
        return "Verified"
    if st in ("RETURNED", "REJECTED"):
        return "Rejected"
    return "Pending review"


def _payroll_records(*, contractor=None, employer=None):
    """The unified worker payroll records (from WorkerWages), role-scoped.

    Shared by the admin, employer and contractor payroll workspaces so all three
    see the same record shape from one source of truth."""
    qs = (WorkerWages.objects.select_related("worker", "site", "contractor")
          .order_by("-period_start"))
    if contractor is not None:
        qs = qs.filter(contractor=contractor)
    if employer is not None:
        qs = qs.filter(site__employer=employer)

    records = []
    for w in qs:
        wi = WorkerIdentity.objects.filter(user_id=w.worker_id).first()
        binding = WorkerContractorBinding.objects.filter(worker_id=w.worker_id,
                                                         binding_status="ACCEPTED").first()
        site = w.site or (binding.site if binding else None)
        contractor_user = w.contractor or (binding.contractor if binding else None)
        cp = getattr(contractor_user, "contractor_profile", None) if contractor_user else None
        ep = getattr(site.employer, "employer_profile", None) if site else None

        gross = _num(w.gross_wage)
        basic = gross if not w.base_wage else float(w.base_wage)
        employee_pf = round(basic * 0.12, 2)
        employer_pf = round(basic * 0.12, 2)
        eps = round(basic * 0.0833, 2)
        edli = round(basic * 0.005, 2)
        admin = round(basic * 0.005, 2)
        employee_esi = round(gross * 0.0075, 2)
        employer_esi = round(gross * 0.0325, 2)
        total_deductions = _num(w.deductions_amount)
        net = _num(w.net_wage)
        employer_cost = round(gross + employer_pf + employer_esi + 200.0 + 12.0 + admin, 2)

        status_label = {"DRAFT": "Draft", "APPROVED": "Reviewed", "PAID": "Verified",
                        "CANCELLED": "Exception"}.get(w.status, "Draft")

        records.append({
            "id": f"PW{w.id}",
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "workerName": _d(wi.name if wi else w.worker.username),
            "employer": _d(ep.employer_name if ep else ""),
            "site": site.site_name if site else "",
            "period": w.period_start.strftime("%b %Y") if w.period_start else "",
            "status": status_label,
            "attendanceDays": _num(w.days_present),
            "lopDays": _num(w.days_absent),
            "pfWage": round(basic, 2),
            "earnings": [{"component": "Basic + Allowances", "amount": round(gross, 2)}],
            "deductions": [{"component": "Statutory Deductions", "amount": round(total_deductions, 2)}],
            "contributions": {
                "employeePF": employee_pf, "employerPF": employer_pf, "eps": eps, "edli": edli,
                "admin": admin, "employeeESI": employee_esi, "employerESI": employer_esi,
                "employeePT": 200.0, "employerPT": 200.0,
                "lwfEmployee": 12.0, "lwfEmployer": 12.0,
            },
            "gross": round(gross, 2),
            "totalDeductions": round(total_deductions, 2),
            "netPay": round(net, 2),
            "employerCost": employer_cost,
            "updatedAt": _dts(w.updated_at),
            "updatedBy": _d(cp.contractor_name if cp else "") or _d(ep.employer_name if ep else "") or "System",
            "source": "Contractor" if contractor_user else "Employer",
            "matchState": "Needs Review",
            "contractor": _d(cp.contractor_name if cp else ""),
        })
    return records


__all__ = [
    "_advance_row",
    "_payroll_records",
    "_auto_gate_pass_dates",
    "_auto_gate_pass_no",
    "_auto_gate_pass_type",
    "_gate_pass_missing",
    "_benefit_row",
    "_binding_row",
    "_ce_binding_row",
    "_ce_history",
    "_ce_initiator_acceptor",
    "_compliance_doc_row",
    "_compliance_status",
    "_default_site_info",
    "_doc_name_key",
    "_doc_owner_label",
    "_doc_row_rank",
    "_doc_source_label",
    "_gate_pass_eligibility",
    "_gate_pass_worker_meta",
    "_grievance_context",
    "_grievance_row",
    "_is_gate_pass_blocked",
    "_latest_gate_pass",
    "_leave_row",
    "_rh_request_row",
    "_site_compliance_pct",
    "_site_leave_policies",
    "_mask",
    "_accessibility_prefs",
    "_portal_settings",
    "_site_past_contractors",
    "_site_scalar_data",
    "_submission_document_master",
    "_submission_review_label",
    "_successor_candidates",
    "_wc_history",
    "_wc_initiator_acceptor",
]
