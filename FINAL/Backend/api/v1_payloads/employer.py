"""Employer portal payload builder and its section helpers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403
from .worker import *  # noqa: F401,F403
from .contractor import *  # noqa: F401,F403


def _employer_bindings(user):
    qs = ContractorEmployerBinding.objects.filter(employer=user).order_by("-created_at")[:50]
    return [_ce_binding_row(b) for b in qs]


def _employer_grievances(user):
    gs = (WorkerGrievance.objects
          .filter(Q(employer=user) | Q(worker__worker_bindings__site__employer=user))
          .distinct().select_related("worker")
          .prefetch_related("responses", "responses__actor")[:60])
    rows = [_grievance_row(g) for g in gs]
    rows.sort(key=lambda r: r["raisedAt"] or "", reverse=True)
    return rows


def _employer_profile_sections(user):
    ep = getattr(user, "employer_profile", None)
    g = lambda fld, note="": _f(fld, getattr(ep, fld, "") if ep else "", note)
    sections = {
        "identity": [
            _f("BSS Employer ID", getattr(ep, "employer_code", "") if ep else "", "System-calculated"),
            _f("Registration Status", getattr(ep, "approval_status", "") if ep else "", "Employer"),
            _f("Employer Category", getattr(ep, "employer_category", "") if ep else "", "Employer"),
            _f("Legal Entity Name", getattr(ep, "employer_name", "") if ep else "", "Employer"),
            _f("Trade / Brand Name", getattr(ep, "trade_name", "") if ep else "", "Employer"),
            _f("Ownership Type", getattr(ep, "ownership", "") if ep else "", "Employer"),
            _f("CIN / LLPIN / Registration No.", getattr(ep, "cin", "") if ep else "", "Employer"),
            _f("ROC", getattr(ep, "roc", "") if ep else "", "Employer"),
            _f("Registration Number", getattr(ep, "registration_number", "") if ep else "", "Employer"),
            _f("Class of Company", getattr(ep, "entity_class", "") if ep else "", "Employer"),
            _f("NIC Code", getattr(ep, "nic_code", "") if ep else "", "Employer"),
            _f("Number of Members", getattr(ep, "members_count", "") if ep else "", "Employer"),
            _f("Authorised Share Capital", getattr(ep, "authorized_capital", "") if ep else "", "Employer"),
            _f("Paid-up Share Capital", getattr(ep, "paid_up_capital", "") if ep else "", "Employer"),
            _f("Date of Incorporation", getattr(ep, "incorporation_date", "") if ep else "", "Employer", field_type="date"),
            _f("PAN", getattr(ep, "pan_no", "") if ep else "", "Employer"),
            _f("GSTIN", getattr(ep, "gstin", "") if ep else "", "Employer"),
        ],
        "business": [
            _f("Industry / Sector", getattr(ep, "industry", "") if ep else "", "Employer"),
            _f("NIC Code", getattr(ep, "nic_code", "") if ep else "", "Employer"),
            _f("Corporate Website", getattr(ep, "corporate_website", "") if ep else "", "Employer"),
        ],
        "contacts": [
            _f("Authorised Signatory Name", getattr(ep, "contact_person", "") if ep else "", "Employer"),
            _f("Official Mobile", getattr(ep, "mobile", "") if ep else "", "Auth identity — locked", sensitive=True),
            _f("Official Email", getattr(ep, "email", "") if ep else "", "Employer"),
        ],
        "address": [
            _f("Registered Address", getattr(ep, "address", "") if ep else "", "Employer"),
            _f("State", getattr(ep, "state", "") if ep else "", "Employer"),
            _f("District", getattr(ep, "district", "") if ep else "", "Employer"),
        ],
        "verification": [
            _f("Identity Verification Status", getattr(ep, "verification_status", "") if ep else "", "Employer"),
            _f("Verification Date", getattr(ep, "verification_date", "") if ep else "", "Employer"),
            _f("Verification Source", getattr(ep, "verification_source", "") if ep else "", "Employer"),
            _f("PAN Verification Status", getattr(ep, "pan_verification_status", "") if ep else "", "Employer"),
            _f("GST Verification Status", getattr(ep, "gst_verification_status", "") if ep else "", "Employer"),
        ],
        "statutory": [
            _f("LIN", getattr(ep, "lin", "") if ep else "", "Employer"),
        ],
        "workforce": [
            _f("Workforce Model", getattr(ep, "workforce_model", "") if ep else "", "Employer"),
            _f("Total Workers - Current", getattr(ep, "total_headcount", "") if ep else "", "Employer"),
        ],
        "employment": [
            _f("Payroll Frequency", getattr(ep, "payroll_frequency", "") if ep else "", "Employer"),
            _f("Wage Period", getattr(ep, "wage_period", "") if ep else "", "Employer"),
            _f("Attendance Method", getattr(ep, "attendance_method", "") if ep else "", "Employer"),
            _f("Worker Onboarding Method", getattr(ep, "onboarding_method", "") if ep else "", "Employer"),
        ],
        "benefits": [
            _f("PF Coverage", getattr(ep, "pf_coverage", "") if ep else "", "Employer"),
            _f("ESIC Coverage", getattr(ep, "esic_coverage", "") if ep else "", "Employer"),
            _f("Gratuity Coverage", getattr(ep, "gratuity_coverage", "") if ep else "", "Employer"),
            _f("LWF Coverage", getattr(ep, "lwf_coverage", "") if ep else "", "Employer"),
            _f("Group Medical Insurance", getattr(ep, "medical_insurance", "") if ep else "", "Employer"),
            _f("Accident Insurance", getattr(ep, "accident_insurance", "") if ep else "", "Employer"),
        ],
        "safety": [
            _f("Medical Examination Process", getattr(ep, "medical_exam_enabled", "") if ep else "", "Employer"),
            _f("First Aid Facility", getattr(ep, "first_aid_enabled", "") if ep else "", "Employer"),
            _f("PPE Management", getattr(ep, "ppe_provision", "") if ep else "", "Employer"),
            _f("Safety Training", getattr(ep, "safety_training_enabled", "") if ep else "", "Employer"),
            _f("Site Induction", getattr(ep, "site_induction_enabled", "") if ep else "", "Employer"),
            _f("Emergency Response Plan", getattr(ep, "emergency_plan_enabled", "") if ep else "", "Employer"),
            _f("Fire Safety Certificate", getattr(ep, "fire_certificate", "") if ep else "", "Employer"),
            _f("Canteen Facility", getattr(ep, "canteen_facility", "") if ep else "", "Employer"),
            _f("Creche Facility", getattr(ep, "creche_facility", "") if ep else "", "Employer"),
            _f("Transport Facility", getattr(ep, "transport_facility", "") if ep else "", "Employer"),
            _f("Accommodation / Camp Facility", getattr(ep, "accommodation_facility", "") if ep else "", "Employer"),
        ],
        "worker-relations": [
            _f("Worker Grievance Mechanism", getattr(ep, "grievance_mechanism", "") if ep else "", "Employer"),
            _f("Grievance Officer", getattr(ep, "grievance_officer_name", "") if ep else "", "Employer"),
            _f("Internal Complaints Committee / POSH", getattr(ep, "posh_icc", "") if ep else "", "Employer"),
            _f("Standing Orders / Service Rules", getattr(ep, "standing_orders", "") if ep else "", "Employer"),
            _f("Worker Communication Channel", getattr(ep, "communication_channel", "") if ep else "", "Employer"),
        ],
        "settings": [
            _f("Default Approval SLA (days)", getattr(ep, "default_approval_sla_days", "") if ep else "", "Employer"),
            _f("Compliance Reminder Window (days)", getattr(ep, "compliance_reminder_window_days", "") if ep else "", "Employer"),
            _f("Preferred Reporting Period", getattr(ep, "preferred_reporting_period", "") if ep else "", "Employer"),
            _f("Escalation Contact", getattr(ep, "escalation_contact", "") if ep else "", "Employer"),
        ],
    }
    verified = str(getattr(ep, "gst_verification_status", "") or "").upper() == "VERIFIED"
    return lock_gst_fields(sections, "employer", verified)


def _employer_identity(user):
    ep = getattr(user, "employer_profile", None)
    return {
        "name": _org_name(user),
        "company": _d(ep.trade_name if ep else "") or _org_name(user),
        "bssId": _d(ep.employer_code if ep else _bss_employer_code(user.id)),
        "entity": _d(ep.entity_class if ep else ""),
        "verified": _d(ep.verification_status if ep else "PENDING") == "APPROVED",
        "contact": _d(ep.contact_person if ep else ""),
        "email": _d(ep.email if ep else ""),
        "address": _d(ep.address if ep else ""),
        "cardIssueDate": (ep.id_card_issue_date.isoformat() if ep and ep.id_card_issue_date else ""),
        "cardValidTill": (ep.id_card_validity_till.isoformat() if ep and ep.id_card_validity_till else ""),
    }


def _employer_stats(user):
    sites = Site.objects.filter(employer=user)
    accepted_contractors = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    # Bound contractors count even before they have workers on a site.
    contractors = len(accepted_contractors)
    # Only workers whose contractor is actually bound to this employer count as
    # on-site — a stale worker binding must not inflate the employer's numbers.
    workers = WorkerContractorBinding.objects.filter(
        site__employer=user, binding_status="ACCEPTED",
        contractor_id__in=accepted_contractors).count()
    comp_docs = ComplianceDocument.objects.filter(
        employer_id__in=accepted_contractors, site__employer=user)
    comp_total = comp_docs.count()
    compliance_score = 0
    if comp_total:
        comp_ok = comp_docs.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
        compliance_score = int(round(comp_ok * 100.0 / comp_total))
    return {
        "totalContractors": contractors,
        "totalWorkers": workers,
        "activeSites": sites.count(),
        "complianceScore": compliance_score,
        "pendingApprovals": user.approvals_handled.filter(status="PENDING").count() if hasattr(user, "approvals_handled") else 0,
    }


def _employer_sites(user):
    accepted_contractors = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for s in Site.objects.filter(employer=user):
        site_bindings = WorkerContractorBinding.objects.filter(
            site=s, binding_status="ACCEPTED", contractor_id__in=accepted_contractors)
        # A contractor counts against a site when the site is allotted to them
        # (approved allotment on an accepted binding) — even before any of their
        # workers are bound — as well as when they have workers on the site.
        allotted_ids = set(ContractorSiteAllotment.objects.filter(
            site=s, status="APPROVED", binding__binding_status="ACCEPTED"
        ).values_list("binding__contractor_id", flat=True))
        worker_ids = set(site_bindings.values_list("contractor_id", flat=True))
        cids = sorted(allotted_ids | worker_ids)
        wcount = site_bindings.count()
        comp_site = ComplianceDocument.objects.filter(
            site=s, employer_id__in=accepted_contractors)
        comp_site_total = comp_site.count()
        site_compliance = 0
        if comp_site_total:
            comp_site_ok = comp_site.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
            site_compliance = int(round(comp_site_ok * 100.0 / comp_site_total))
        rows.append({
            "id": str(s.id), "name": _d(s.site_name),
            "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "isMine": _site_is_mine(s),
            "maxCctvCameras": int(getattr(s, "max_cctv_cameras", 5) or 5),
            "jurisdiction": _d(s.jurisdiction) or "state",
            "startDate": _dts(s.site_start_date) or "",
            "status": _d(s.site_status) or ("Active" if s.attendance_enabled else "Planned"),
            "contractorIds": list(cids), "workers": wcount,
            "pastContractors": _site_past_contractors(s, user, set(cids)),
            "compliance": site_compliance,
            "qrToken": _d(s.site_qr_token),
            "bssId": _d(s.bss_site_id),
            "appointmentLetterTemplateId": s.appointment_letter_template_id,
            "experienceLetterTemplateId": s.experience_letter_template_id,
            "appointmentLetterTemplateName": (
                _d(s.appointment_letter_template.name) if s.appointment_letter_template_id else ""),
            "experienceLetterTemplateName": (
                _d(s.experience_letter_template.name) if s.experience_letter_template_id else ""),
            "contractorDocuments": _csd_payloads_for_contractors(s, cids),
            "data": _site_scalar_data(s),
        })
    return rows


def _employer_contractors(user):
    cids = set(WorkerContractorBinding.objects.filter(site__employer=user).values_list(
        "contractor_id", flat=True).distinct())
    # Contractors engaged directly (scanned this employer's QR) and accepted.
    cids |= set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for cid in cids:
        c = User.objects.filter(id=cid).first()
        if not c:
            continue
        cp = getattr(c, "contractor_profile", None)
        # Only *active* connections count as an assigned site: an APPROVED site
        # allotment on an ACCEPTED employer binding, or an ACCEPTED worker
        # binding. This matches _employer_sites().contractorIds, so a site's card
        # and its "Connected relationships" list agree — cancelled/rejected
        # relationships no longer show up as connected.
        site_ids = set(ContractorSiteAllotment.objects.filter(
            binding__contractor=c, binding__employer=user,
            binding__binding_status="ACCEPTED", status="APPROVED").values_list("site_id", flat=True))
        site_ids |= set(WorkerContractorBinding.objects.filter(
            contractor=c, site__employer=user, binding_status="ACCEPTED").values_list("site_id", flat=True))
        site_ids = sorted(str(x) for x in site_ids)
        wcount = WorkerContractorBinding.objects.filter(contractor=c, site__employer=user,
                                                        binding_status="ACCEPTED").count()
        # Relationship status reflects the actual binding with this employer,
        # not the contractor's own registration approval.
        binding = (ContractorEmployerBinding.objects.filter(employer=user, contractor=c)
                      .order_by("-created_at").first())
        accepted_binding = bool(binding and binding.binding_status == "ACCEPTED")
        if accepted_binding or wcount:
            status = "Active"
        elif binding:
            status = {"PENDING": "Pending", "REJECTED": "Rejected",
                      "CANCELLED": "Cancelled"}.get(str(binding.binding_status).upper(), "Pending")
        else:
            status = _d(cp.approval_status if cp else "PENDING")
        # Per-site allotment status for this contractor↔employer binding, so the
        # employer can see (and propose to) secondary contractors site-by-site.
        allotment_rows = ContractorSiteAllotment.objects.filter(
            binding__contractor=c, binding__employer=user,
            binding__binding_status="ACCEPTED").select_related("site")
        connected_at = None
        if binding:
            connected_at = binding.accepted_at or binding.created_at
        if connected_at is None:
            worker_binding = WorkerContractorBinding.objects.filter(
                contractor=c, site__employer=user, binding_status="ACCEPTED",
            ).order_by("accepted_at", "created_at").first()
            connected_at = (worker_binding.accepted_at or worker_binding.created_at) if worker_binding else None
        comp_docs = ComplianceDocument.objects.filter(employer=c, site__employer=user)
        comp_total = comp_docs.count()
        compliance_score = 0
        if comp_total:
            comp_ok = comp_docs.filter(status__in=["SUBMITTED", "COMPLETED"]).count()
            compliance_score = int(round(comp_ok * 100.0 / comp_total))
        rows.append({
            "id": c.id, "name": _d(cp.contractor_name if cp else "", c.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(c.id)),
            "contact": _d(cp.contact_person if cp else ""),
            "email": _d(cp.email if cp else ""),
            "siteIds": site_ids, "workers": wcount,
            "sites": [a.site.site_name for a in allotment_rows if a.site and a.status == "APPROVED"],
            "allotments": [{
                "siteId": a.site_id,
                "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                           "RELEASED": "Released"}.get(str(a.status).upper(), _d(a.status)),
                "source": _d(a.source),
            } for a in allotment_rows],
            "compliance": compliance_score,
            "onboardingDate": _dts(connected_at.date()) if connected_at else None,
            "status": status,
            "bindingId": binding.id if (binding and accepted_binding) else None,
            "verified": bool(cp and cp.is_verified_badge) or accepted_binding,
        })
    return rows


def _employer_workers(user):
    bindings = list(WorkerContractorBinding.objects
                    .filter(site__employer=user, binding_status="ACCEPTED")
                    .select_related("worker", "site", "contractor")
                    .order_by("worker_id", "-created_at"))
    worker_ids = [b.worker_id for b in bindings]
    emp_map = {e.user_id: e for e in WorkerEmployment.objects.filter(user_id__in=worker_ids)}
    ss_map = {s.user_id: s for s in WorkerSocialSecurity.objects.filter(user_id__in=worker_ids)}
    rows = []
    seen = set()
    for b in bindings:
        # One row per worker — a re-bind (bind → unbind → bind again) can leave
        # more than one live row behind, which showed the worker twice.
        if b.worker_id in seen:
            continue
        seen.add(b.worker_id)
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        wemp = emp_map.get(b.worker_id)
        ss = ss_map.get(b.worker_id)
        cp = getattr(b.contractor, "contractor_profile", None)
        card_issue, card_valid = _worker_id_card_dates(
            wemp, b.accepted_at.date() if b.accepted_at else None)
        rows.append({
            "id": b.worker_id,
            "name": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "mobile": _d(wi.mobile_number if wi else ""),
            "contractorId": b.contractor_id,
            "contractor": _d(cp.contractor_name if cp else b.contractor.username),
            "contractorCode": _d(cp.contractor_code) if cp else "",
            "contractorContact": _d(getattr(cp, "mobile", "") or getattr(cp, "contact_person", "")) if cp else "",
            "contractorEmail": _d(getattr(cp, "email", "")) if cp else "",
            "siteId": str(b.site_id), "site": b.site.site_name if b.site else "",
            "siteColour": _d(getattr(b.site, "assign_color", "") or "") if b.site else "",
            "siteBssId": _d(getattr(b.site, "bss_site_id", "") or "") if b.site else "",
            "siteAddress": _d(getattr(b.site, "location", "") or "") if b.site else "",
            "employer": _org_name(b.site.employer) if b.site else "",
            "designation": _d(b.designation) or ((_d(wemp.designation) if wemp else "") or ""),
            "department": _d(b.department) or ((_d(wemp.department) if wemp else "") or ""),
            "campNo": _d(wemp.camp_no) if wemp else "",
            "routeBusNo": ((_d(wemp.route) or _d(wemp.bus_no)) if wemp else ""),
            "uan": _d(ss.epfo_uan) if ss else "",
            "esic": _d(ss.esic_ip_number) if ss else "",
            "gender": _d(wi.gender if wi else ""),
            "photoUrl": _d(wi.photo if wi else ""),
            "dob": _dts(wi.date_of_birth) if wi and wi.date_of_birth else "",
            "fatherName": _d(wi.father_name if wi else ""),
            "bloodGroup": _d(wi.blood_group if wi else ""),
            "emergencyName": _d(wi.emergency_contact_name if wi else ""),
            "emergencyNumber": _d(wi.emergency_contact_number if wi else ""),
            "emergencyRelation": _d(wi.emergency_contact_relation if wi else ""),
            "doj": _dts(b.date_of_joining) if b.date_of_joining else (_dts(b.accepted_at.date()) if b.accepted_at else None),
            "compliance": _worker_compliance_label(b.worker),
            "status": _d(b.binding_status), "verified": bool(wi and wi.aadhaar),
            "idCardIssueDate": card_issue.isoformat() if card_issue else "",
            "idCardValidityTill": card_valid.isoformat() if card_valid else "",
        })
    return rows


def _employer_approvals(user):
    """Pending binding approvals for this employer. Every request is site-scoped
    (E·C·S·W) — the site shown is the one the contractor/worker is approved against."""
    status_label = {"PENDING": "Pending", "APPROVED": "Approved",
                    "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    rows = []
    qs = user.approvals_handled.filter(status="PENDING")[:20] if hasattr(user, "approvals_handled") else []
    for a in qs:
        entity_type = _d(a.entity_type)
        meta = a.metadata if isinstance(a.metadata, dict) else {}
        target = User.objects.filter(pk=a.entity_id).first() if str(a.entity_id).isdigit() else None
        name = ""
        bss_id = ""
        contractor_name = ""
        site_name = _d(meta.get("site_name"))
        checks = []
        if entity_type.lower() == "contractor" and target:
            cp = getattr(target, "contractor_profile", None)
            name = _d(cp.contractor_name if cp else target.username)
            bss_id = _d(cp.contractor_code if cp else _bss_contractor_code(target.id))
            binding = WorkerContractorBinding.objects.filter(contractor=target, site__employer=user).first()
            if binding and binding.site:
                site_name = site_name or _d(binding.site.site_name)
            checks = ["KYC", "Licence"]
        elif entity_type.lower() == "worker" and target:
            wi = WorkerIdentity.objects.filter(user=target).first()
            name = _d(wi.name if wi else target.username)
            bss_id = _d(wi.bss_worker_id if wi else _bss_worker_code(target.id))
            binding = WorkerContractorBinding.objects.filter(worker=target, site__employer=user).first()
            if binding:
                if binding.site:
                    site_name = site_name or _d(binding.site.site_name)
                if binding.contractor:
                    cp = getattr(binding.contractor, "contractor_profile", None)
                    contractor_name = _d(cp.contractor_name if cp else binding.contractor.username)
            checks = ["Aadhaar", "Bank"]
        rows.append({
            "id": str(a.id), "entityType": entity_type,
            "entityId": str(a.entity_id), "name": name,
            "bssId": bss_id, "contractor": contractor_name or None,
            "site": site_name, "submittedAt": _dts(a.requested_at),
            "checks": checks, "status": status_label.get(str(a.status).upper(), "Pending"),
            "initiatedBy": entity_type or "Worker",
            "acceptedBy": "Employer" if str(a.status).upper() == "APPROVED" else "",
        })
    # Contractor <-> employer bindings (contractor scanned this employer's QR
    # or a site QR). Every request is surfaced — rows are never replaced or
    # hidden, so accepted/rejected/cancelled requests all stay visible.
    binding_status = {"PENDING": "Pending", "ACCEPTED": "Accepted",
                         "REJECTED": "Rejected", "CANCELLED": "Cancelled"}
    for e in ContractorEmployerBinding.objects.filter(employer=user).order_by("-created_at"):
        cp = getattr(e.contractor, "contractor_profile", None)
        approved_sites = [a.site.site_name for a in e.allotments.all()
                          if a.site and a.status == "APPROVED"]
        pending_sites = [f"{a.site.site_name} (pending approval from contractor)" for a in e.allotments.all()
                         if a.site and a.status == "PENDING"]
        sites = approved_sites + pending_sites
        rows.append({
            "id": f"ce-{e.id}", "bindingId": str(e.id),
            "entityType": "Contractor", "entityId": str(e.contractor_id),
            "name": _d(cp.contractor_name if cp else "", e.contractor.username),
            "bssId": _d(cp.contractor_code if cp else "", _bss_contractor_code(e.contractor_id)),
            "contractor": None,
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "siteIds": [a.site_id for a in e.allotments.all() if a.site_id],
            "allotments": [{
                "siteId": a.site_id,
                "site": a.site.site_name if a.site else "",
                "siteBssId": a.site.bss_site_id if a.site else "",
                "status": {"PENDING": "Pending", "APPROVED": "Approved",
                           "REJECTED": "Rejected", "RELEASED": "Released"}.get(str(a.status).upper(), "Pending"),
                "source": _d(a.source),
                "releaseRequested": bool(a.release_requested_at),
                "releaseRequestedBy": _d(a.release_requested_by),
                "successorContractorId": a.successor_contractor_id,
                "successorName": _org_name(a.successor_contractor) if a.successor_contractor else "",
                "workersAtRisk": WorkerContractorBinding.objects.filter(
                    contractor=e.contractor, site_id=a.site_id
                ).exclude(binding_status__in=TERMINAL_BINDING_STATUSES).count(),
            } for a in e.allotments.all()],
            "submittedAt": _dts(e.created_at),
            "checks": ["KYC", "Licence"],
            "status": binding_status.get(str(e.binding_status).upper(), "Pending"),
            "initiatedBy": _ce_initiator_acceptor(e)[0],
            "acceptedBy": _ce_initiator_acceptor(e)[1],
            "consentEmployer": bool(e.consent_employer),
            "consentContractor": bool(e.consent_contractor),
            "source": _d(e.source),
            "secondaryBindingIds": [int(x) for x in (e.secondary_binding_ids or []) if str(x).isdigit()],
            # Workers that would be orphaned if this contractor's access ends, and
            # the candidate successor contractors (other ACCEPTED bindings).
            "workersAtRisk": WorkerContractorBinding.objects.filter(
                contractor=e.contractor, site__employer=user
            ).exclude(binding_status__in=TERMINAL_BINDING_STATUSES).count(),
            # Approved sites this contractor holds at the employer — handed to a
            # successor when the engagement ends (even with zero workers).
            "sitesAtRisk": e.allotments.filter(status="APPROVED").count(),
            "successorCandidates": _successor_candidates(user, e),
            "unbindRequested": bool(e.unbind_requested_at),
            "unbindConsentEmployer": bool(e.unbind_consent_employer),
            "unbindConsentContractor": bool(e.unbind_consent_contractor),
            "history": _ce_history(e),
        })
    return rows


def _employer_gate_pass_row(g):
    meta = _gate_pass_worker_meta(g.worker)
    site = g.site
    contractor_name = ""
    binding = (WorkerContractorBinding.objects.filter(worker=g.worker, site=site)
               .select_related("contractor").first())
    if binding:
        cp = getattr(binding.contractor, "contractor_profile", None)
        contractor_name = _d(cp.contractor_name if cp else binding.contractor.username)
    blocked = _is_gate_pass_blocked(g.worker, site.employer if site else None)
    return {
        "id": g.id, **meta,
        "number": _d(g.gate_pass_no),
        "contractor": contractor_name,
        "site": site.site_name if site else "",
        "siteId": g.site_id,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "requestedAt": _dts(g.created_at),
        "requestedBy": _party_name(g.issued_by) or contractor_name,
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "blocked": blocked,
        "dispatched": bool(g.dispatched),
        "dispatchedAt": _dts(g.dispatched_at) if g.dispatched_at else "",
        "eligibility": _gate_pass_eligibility(g.worker),
        "branding": _gate_pass_branding(site),
    }


def _employer_gate_passes(user):
    """Every connected worker has a gate pass. Explicit contractor requests keep
    their real status/validity; a connected worker without a request gets an
    auto-generated pass derived from their BSS ID card, so site access is always
    visible without waiting on a contractor request."""
    rows = [_employer_gate_pass_row(g) for g in WorkerGatePass.objects.filter(
        site__employer=user).select_related("worker", "site").order_by("-created_at")[:100]]
    seen = {(row["workerId"], row["type"]) for row in rows}
    seen_workers = {row["workerId"] for row in rows}
    bindings = (WorkerContractorBinding.objects
                .filter(site__employer=user, binding_status="ACCEPTED")
                .select_related("worker", "site", "contractor"))
    for b in bindings:
        meta = _gate_pass_worker_meta(b.worker)
        if meta["workerId"] in seen_workers:
            continue  # already has an explicit pass
        gp_type = _auto_gate_pass_type(b.worker)
        label = _GP_TYPE_LABEL.get(gp_type, gp_type) if gp_type else "Not eligible"
        if (meta["workerId"], label) in seen:
            continue
        # Validity: permanent mirrors the BSS ID card; temporary runs 7 days.
        issue_date, valid_till = (_auto_gate_pass_dates(b.worker, gp_type) if gp_type else (None, None))
        blocked = _is_gate_pass_blocked(b.worker, user)
        cp = getattr(b.contractor, "contractor_profile", None)
        rows.append({
            "id": f"auto-{b.id}",
            "auto": True,
            "number": _auto_gate_pass_no(b.worker, gp_type) if gp_type else "",
            **meta,
            "contractor": _d(cp.contractor_name if cp else b.contractor.username),
            "site": b.site.site_name if b.site else "",
            "siteId": b.site_id,
            "type": label,
            "requestedAt": _dts(b.created_at),
            "requestedBy": "",
            "approvedBy": "",
            "approvedAt": "",
            "validFrom": _dts(issue_date) if issue_date else "",
            "validTo": _dts(valid_till) if valid_till else "",
            "status": "Blocked" if blocked else ("Not eligible" if not gp_type else "Approved"),
            "blocked": blocked,
            "eligible": bool(gp_type),
            "missing": [] if gp_type else _gate_pass_missing(b.worker),
            "dispatched": False,
            "dispatchedAt": "",
            "eligibility": _gate_pass_eligibility(b.worker),
            "branding": _gate_pass_branding(b.site),
        })
    return rows[:200]


def _employer_submissions(user):
    import re

    rows = []
    my_sites = set(Site.objects.filter(employer=user).values_list("site_name", flat=True))
    from bss_core.models import ComplianceBatch, ComplianceReport, CustomFormName
    from .contractor import _contractor_compliance_batch_row
    form_meta = {}
    for f in CustomFormName.objects.filter(is_active=True).values("name", "description", "requires_document"):
        form_meta.setdefault((f["name"] or "").strip().lower(), f)

    def ev_month(ev):
        if ev.month:
            return ev.month
        m = re.match(r"\s*([A-Za-z]+)", ev.period or "")
        return m.group(1) if m else ""

    def ev_year(ev):
        m = re.search(r"(20\d{2})", ev.period or "") or re.search(r"(20\d{2})", ev.financial_year or "")
        return m.group(1) if m else ""

    # One submission unit = contractor + period (month). CLRA register batches and
    # the contractor's additional forms for that month are reviewed together.
    packages: dict = {}

    connected_contractor_ids = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED"
    ).values_list("contractor_id", flat=True))

    uploaded = (SubmissionEvidence.objects
                .filter(Q(user_id__in=connected_contractor_ids) | Q(site__in=my_sites))
                .select_related("user")
                .order_by("-created_at")[:200])

    seen_evidence = set()
    for ev in uploaded:
        if ev.site and my_sites and ev.site not in my_sites and ev.user_id not in connected_contractor_ids:
            continue
        dedup_key = (ev.user_id, ev.site, ev.doc_type, ev.period)
        if dedup_key in seen_evidence:
            continue
        seen_evidence.add(dedup_key)

        ev_m = ev_month(ev).strip().capitalize()
        ev_y = ev_year(ev)
        if ev.user.role == "contractor" or ev.user_id in connected_contractor_ids:
            packages.setdefault((ev.user_id, ev_y, ev_m), {"batches": [], "evidence": []})["evidence"].append(ev)
            continue
        meta = form_meta.get(_d(ev.doc_type).strip().lower())
        rows.append({
            "id": str(ev.id),
            "contractor": "", "contractorId": "",
            "site": _d(ev.site), "type": _d(ev.doc_type),
            "period": _d(ev.period),
            "submittedAt": _dts(ev.created_at),
            "status": _submission_review_label(ev.status),
            "source": "evidence", "kind": "form",
            "financialYear": _d(ev.financial_year), "month": _d(ev.month),
            "frequency": _d(ev.frequency), "mandatory": bool(ev.is_mandatory),
            "documentType": _d(ev.document_type),
            "requiredFormat": ("Submission only" if meta and not meta["requires_document"] else "PDF / JPEG / PNG"),
            "note": _d(meta["description"]) if meta else "",
        })

    for b in (ComplianceBatch.objects
              .filter(site__employer=user, is_current=True,
                      status__in=["SUBMITTED", "VERIFIED", "RETURNED", "REJECTED"])
              .select_related("contractor", "site").order_by("-generated_on", "-id")):
        b_year = re.search(r"(20\d{2})", b.year or "")
        b_y = b_year.group(1) if b_year else (b.year or "")
        b_m = (b.month or "").strip().capitalize()
        packages.setdefault((b.contractor_id, b_y, b_m), {"batches": [], "evidence": []})["batches"].append(b)

    # The latest submission round per (contractor, year, month): evidence from an
    # earlier (rejected) round must not keep a re-submitted package as "Rejected".
    latest_round = {}
    for rep in ComplianceReport.objects.filter(employer_id__in={cid for cid, _, _ in packages}):
        rm = re.match(r"\s*([A-Za-z]+)", rep.period or "")
        ry = re.search(r"(20\d{2})", rep.period or "")
        key = (rep.employer_id, ry.group(1) if ry else "", rm.group(1) if rm else "")
        if rep.unique_no and (key not in latest_round or rep.unique_no > latest_round[key]):
            latest_round[key] = rep.unique_no

    for (cid, year, month), grp in packages.items():
        batches = grp["batches"]
        evidence = grp["evidence"]
        latest_no = latest_round.get((cid, year, month), "")
        if latest_no:
            evidence = [e for e in evidence if (not e.unique_no) or e.unique_no >= latest_no]
        statuses = [str(x.status).upper() for x in batches] + [str(x.status).upper() for x in evidence]
        if any(s in ("RETURNED", "REJECTED") for s in statuses):
            status = "Rejected"
        elif statuses and all(s in ("VERIFIED",) for s in statuses):
            status = "Verified"
        else:
            status = "Pending review"
        cp = getattr(batches[0].contractor, "contractor_profile", None) if batches else None
        if cp is None and evidence:
            cp = getattr(evidence[0].user, "contractor_profile", None)
        name = _d(cp.contractor_name if cp else ((batches[0].contractor.username if batches else (evidence[0].user.username if evidence else ""))))
        sites = sorted({x.site.site_name for x in batches if x.site} | {x.site for x in evidence if x.site})
        stamps = [x.generated_on for x in batches if x.generated_on] + [x.created_at for x in evidence if x.created_at]
        latest = max(stamps, key=str) if stamps else None
        notes = [x.review_note for x in batches if x.review_note and str(x.status).upper() in ("RETURNED", "REJECTED")]
        notes += [e.review_note for e in evidence if e.review_note and str(e.status).upper() in ("RETURNED", "REJECTED")]
        rows.append({
            "id": f"pkg-{cid}-{year}-{month}",
            "contractor": name,
            "contractorId": ((_d(getattr(ContractorProfile.objects.filter(user_id=cid).first(), "contractor_code", "")) if cid else "")
                             or (_bss_contractor_code(cid) if cid else "")),
            "site": ", ".join(sites),
            "type": f"Compliance Submission · {month} {year} ({len(batches)} register batch(es) · {len(evidence)} form(s))",
            "period": _d(f"{month} {year}".strip()),
            "submittedAt": _dts(latest) if latest else "",
            "status": status,
            "source": "submission", "kind": "package",
            "financialYear": _d(batches[0].financial_year if batches else (evidence[0].financial_year if evidence else "")),
            "month": _d(month),
            "frequency": "", "mandatory": True, "documentType": "CLRA + Forms",
            "requiredFormat": "", "note": _d(notes[-1]) if notes else "",
            "batchId": str(batches[0].id) if batches else "",
            "hasFile": any(bool(x.generated_file) for x in batches),
            "registerCount": len(batches), "formCount": len(evidence),
            "batches": [_contractor_compliance_batch_row(b) for b in batches],
            "forms": [{"id": str(ev.id), "name": _d(ev.doc_type), "status": _submission_review_label(ev.status),
                       "aiStatus": _d(getattr(ev, "ai_status", "")),
                       "checkpoints": list(ev.checkpoint_results or []),
                       "findings": list(ev.validation_findings or [])} for ev in evidence],
        })

    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": str(c.id), "contractor": "", "contractorId": "",
            "site": c.site.site_name if c.site else "",
            "type": _d(c.master.act if c.master else ""),
            "period": _d(c.period), "submittedAt": _dts(c.updated_at),
            "status": _submission_review_label(c.status),
            "source": "register", "kind": "register",
            "financialYear": "", "month": "", "frequency": "",
            "mandatory": True, "documentType": "", "requiredFormat": "", "note": "",
        })
    return rows


def _employer_compliance_reports(user):
    """Per-contractor statutory compliance status for the employer's connected
    contractors, derived from the contractors' compliance documents at its sites."""
    contractor_ids = set(ContractorEmployerBinding.objects.filter(
        employer=user, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
    rows = []
    for c in (ComplianceDocument.objects
              .filter(employer_id__in=contractor_ids, site__employer=user)
              .select_related("master", "site", "employer").order_by("-created_at")[:60]):
        cp = getattr(c.employer, "contractor_profile", None)
        st = str(c.status).upper()
        verified = st in ("SUBMITTED", "COMPLETED")
        rows.append({
            "id": str(c.id), "contractorId": str(c.employer_id),
            "contractor": _d(cp.contractor_name if cp else c.employer.username),
            "siteId": str(c.site_id) if c.site_id else None,
            "site": c.site.site_name if c.site else "", "period": _d(c.period),
            "pf": "Filed" if verified else "Pending",
            "esic": "Filed" if verified else "Pending",
            "wage": "Filed" if verified else "Pending",
            "safety": "Compliant" if verified else ("Non-compliant" if st == "EXPIRED" else "Review"),
            "score": _num(c.ocr_accuracy) if c.ocr_accuracy is not None else (100 if verified else 0),
            "status": "COMPLETED" if verified else "PENDING",
        })
    return rows


def _employer_users(user):
    return []


def _employer_permission_roles():
    return []


def _employer_audit_logs(user):
    return []


def _employer_worker_documents(user):
    """Read-only worker document register for workers bound at the employer's sites."""
    from bss_core.models import WorkerDocument
    bindings = list(WorkerContractorBinding.objects.filter(
        site__employer=user, binding_status="ACCEPTED").select_related("contractor", "site"))
    by_worker = {b.worker_id: b for b in bindings}
    rows = []
    if not by_worker:
        return rows
    for d in (WorkerDocument.objects.filter(user_id__in=list(by_worker.keys()))
              .select_related("document", "user").order_by("-updated_at")[:100]):
        wi = WorkerIdentity.objects.filter(user=d.user).first()
        b = by_worker.get(d.user_id)
        cp = getattr(b.contractor, "contractor_profile", None) if b else None
        st = str(d.status).upper()
        rows.append({
            "id": str(d.id),
            "worker": _d(wi.name if wi else d.user.username),
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "contractor": _d(cp.contractor_name if cp else (b.contractor.username if b else "")),
            "site": b.site.site_name if b and b.site else "",
            "document": _d(d.document.document_name if d.document else ""),
            "status": {"UPLOADED": "Pending", "VERIFIED": "Verified", "REJECTED": "Rejected",
                       "MISSING": "Missing", "UNDER_VERIFICATION": "Pending",
                       "EXPIRED": "Expiring"}.get(st, "Pending"),
            "expiry": _dts(d.expiry_date) if d.expiry_date else None,
        })
    return rows


def _employer_activities(user):
    return []


def _employer_labour_compliance():
    """One row per central labour-law act the employer must comply with, from the
    seeded ComplianceMaster (the UI renders the detailed 10-rule register)."""
    seen = {}
    for m in ComplianceMaster.objects.filter(is_active=True).order_by("act", "form_number"):
        seen.setdefault(m.act, m)
    return [{
        "ruleId": m.id, "scope": "central", "status": "compliant",
        "note": _d(m.act), "verifiedAt": _dts(timezone.now()),
    } for m in seen.values()]


def _employer_payroll(user):
    return {
        "config": _contractor_payroll_config(user),
        "records": _payroll_records(employer=user),
        "templateColumns": ["id", "workerId", "workerName", "employer", "site", "contractor",
                            "period", "status", "gross", "netPay"],
    }


def _employer_face_coverage(user):
    """Manual/self face-vector coverage for workers bound to this employer."""
    from bss_core.models import WorkerFaceEmbedding

    bindings = (WorkerContractorBinding.objects
                .filter(site__employer=user, binding_status="ACCEPTED")
                .select_related("worker__worker_identity"))
    workers = {}
    for binding in bindings:
        worker = binding.worker
        identity = getattr(worker, "worker_identity", None)
        if identity is None:
            continue
        item = workers.setdefault(worker.id, {
            "bssWorkerId": str(identity.bss_worker_id or "").strip().upper(),
            "name": _d(identity.name) or _d(worker.full_name) or _d(identity.bss_worker_id),
            "siteIds": set(),
            "matchSource": str(getattr(identity, "face_match_source", "SELF") or "SELF").upper(),
            "manualCount": 0,
            "selfCount": 0,
            "lastManualCaptureAt": "",
        })
        item["siteIds"].add(binding.site_id)
    if workers:
        rows = (WorkerFaceEmbedding.objects
                .filter(worker_id__in=list(workers), model_name="ArcFace",
                        model_version="deepface-0.0.101-tf-2.21.0")
                .values_list("worker_id", "source", "captured_at", "created_at"))
        for worker_id, source, captured_at, created_at in rows:
            item = workers.get(worker_id)
            if item is None:
                continue
            if source == "CLIENT_MANUAL":
                item["manualCount"] += 1
                stamp = captured_at or created_at
                if stamp:
                    value = _dts(stamp)
                    if not item["lastManualCaptureAt"] or value > item["lastManualCaptureAt"]:
                        item["lastManualCaptureAt"] = value
            else:
                item["selfCount"] += 1
    rows = []
    for item in workers.values():
        total = item["manualCount"] + item["selfCount"]
        rows.append({
            **item,
            "siteIds": sorted(item["siteIds"]),
            "totalCount": total,
            "hasManual": item["manualCount"] > 0,
            "hasSelf": item["selfCount"] > 0,
            "hasFaceData": total > 0,
        })
    rows.sort(key=lambda item: (item["name"].lower(), item["bssWorkerId"]))
    manual = [row for row in rows if row["hasManual"]]
    self_rows = [row for row in rows if row["hasSelf"]]
    return {
        "totalWorkers": len(rows),
        "manualWorkers": len(manual),
        "selfWorkers": len(self_rows),
        "bothWorkers": sum(1 for row in rows if row["hasManual"] and row["hasSelf"]),
        "manualOnly": sum(1 for row in rows if row["hasManual"] and not row["hasSelf"]),
        "selfOnly": sum(1 for row in rows if row["hasSelf"] and not row["hasManual"]),
        "noFaceData": sum(1 for row in rows if not row["hasFaceData"]),
        "manualVectors": sum(row["manualCount"] for row in rows),
        "selfVectors": sum(row["selfCount"] for row in rows),
        "activeManual": sum(1 for row in rows if row["matchSource"] == "MANUAL"),
        "activeSelf": sum(1 for row in rows if row["matchSource"] != "MANUAL"),
        "manualInactive": sum(1 for row in rows if row["hasManual"] and row["matchSource"] != "MANUAL"),
        "workers": rows,
    }


def build_employer_portal(user):
    default_site = _default_site_info(getattr(user, "employer_profile", None))
    if default_site is None:
        # The first owned site is the implicit default when none was chosen.
        first = Site.objects.filter(employer=user).order_by("id").first()
        if first is not None:
            default_site = {"id": str(first.id), "name": _d(first.site_name), "bssId": _d(first.bss_site_id)}
    return {
        "identity": _employer_identity(user),
        "stats": _employer_stats(user),
        "faceCoverage": _employer_face_coverage(user),
        "sites": _employer_sites(user),
        "defaultSite": default_site,
        "contractors": _employer_contractors(user),
        "workers": _employer_workers(user),
        "grievances": _employer_grievances(user),
        "approvals": _employer_approvals(user),
        "gatePasses": _employer_gate_passes(user),
        "submissions": _employer_submissions(user),
        "complianceReports": _employer_compliance_reports(user),
        "canAccessAdmin": True,
        "users": _employer_users(user),
        "permissionRoles": _employer_permission_roles(),
        "auditLogs": _employer_audit_logs(user),
        "routes": [],
        "workerDocuments": _employer_worker_documents(user),
        "activities": _employer_activities(user),
        "govtScope": "central",
        "labourCompliance": _employer_labour_compliance(),
        "profileSections": _employer_profile_sections(user),
        "licenses": _contractor_licenses(user),
        "payroll": _employer_payroll(user),
        "accessibility": _accessibility_prefs(user),
        "settings": _portal_settings(user),
    }


__all__ = [
    "_employer_activities",
    "_employer_approvals",
    "_employer_audit_logs",
    "_employer_bindings",
    "_employer_compliance_reports",
    "_employer_contractors",
    "_employer_gate_pass_row",
    "_employer_gate_passes",
    "_employer_grievances",
    "_employer_identity",
    "_employer_labour_compliance",
    "_employer_face_coverage",
    "_employer_payroll",
    "_employer_permission_roles",
    "_employer_profile_sections",
    "_employer_sites",
    "_employer_stats",
    "_employer_submissions",
    "_employer_users",
    "_employer_worker_documents",
    "_employer_workers",
    "build_employer_portal",
]
