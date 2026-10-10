"""Contractor portal payload builder and its section helpers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403
from .worker import *  # noqa: F401,F403


def _contractor_advances(user):
    advances = (SalaryAdvance.objects.filter(contractor=user)
                .select_related("worker").order_by("-requested_at")[:100])
    return [_advance_row(a) for a in advances]


def _contractor_restricted_holiday_requests(user):
    """Restricted-holiday requests raised by the contractor's bound workers."""
    reqs = (RestrictedHolidayRequest.objects
            .filter(contractor=user).select_related("site", "worker")[:100])
    return [_rh_request_row(r) for r in reqs]


def _contractor_site_calendars(user):
    """Per-site holiday calendar + leave policy the contractor manages; workers
    bound to each site inherit them."""
    site_ids = set(WorkerContractorBinding.objects.filter(contractor=user)
                   .values_list("site_id", flat=True))
    site_ids.update(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, status="APPROVED").values_list("site_id", flat=True))
    out = []
    for site in Site.objects.filter(id__in=site_ids).order_by("id"):
        holidays = [{
            "id": h.id, "date": _dts(h.date), "name": _d(h.name),
            "holidayType": h.get_holiday_type_display(), "holidayTypeCode": h.holiday_type,
            "isPaid": h.is_paid, "note": _d(h.note),
        } for h in site.holidays.all()]
        policies = [{
            "id": p.id, "leaveTypeId": p.leave_type_id, "leaveType": p.leave_type.name,
            "annualEntitlement": p.annual_entitlement, "openingBalance": p.opening_balance,
            "isActive": p.is_active,
        } for p in site.leave_policies.select_related("leave_type").all()]
        out.append({
            "siteId": site.id, "siteName": _d(site.site_name),
            "holidays": holidays, "leavePolicies": policies,
            # "Offered" is derived from the calendar, not a typed number.
            "restrictedHolidayAllotment": sum(1 for h in holidays if h["holidayTypeCode"] == "RESTRICTED"),
            "restrictedHolidayMaxAvail": site.restricted_holiday_max_avail,
            "weeklyOffDays": [d for d in (site.weekly_off_days or "").split(",") if d],
        })
    return out


def _contractor_bindings(user):
    qs = ContractorEmployerBinding.objects.filter(contractor=user).order_by("-created_at")[:50]
    return [_ce_binding_row(b) for b in qs]


def _contractor_leave_approvals(user):
    rows = (LeaveRequest.objects.filter(contractor=user)
            .select_related("leave_type", "worker")[:100])
    out = []
    for r in rows:
        wi = _get_identity(r.worker)
        out.append({
            "id": str(r.id),
            "worker": _d(wi.name if wi and wi.name else r.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "type": r.leave_type.name if r.leave_type else "",
            "from": _dts(r.from_date),
            "to": _dts(r.to_date),
            "days": r.days,
            "reason": _d(r.reason),
            "status": {"PENDING": "Pending", "APPROVED": "Approved", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled"}.get(str(r.status).upper(), "Pending"),
            "requestedOn": _dts(r.created_at),
        })
    return out


def _contractor_grievances(user):
    gs = (WorkerGrievance.objects
          .filter(Q(contractor=user) | Q(worker__worker_bindings__contractor=user))
          .distinct().select_related("worker")
          .prefetch_related("responses", "responses__actor")[:60])
    rows = [_grievance_row(g) for g in gs]
    rows.sort(key=lambda r: r["raisedAt"] or "", reverse=True)
    return rows


def _contractor_identity(user):
    cp = getattr(user, "contractor_profile", None)
    return {
        "name": _org_name(user),
        "company": _d(cp.trade_name if cp else "") or _org_name(user),
        "photoUrl": _d(cp.profile_image if cp else ""),
        "bssId": _d(cp.contractor_code if cp else _bss_contractor_code(user.id)),
        "incorpDate": _dts(cp.incorporation_date if cp else None),
        "entity": _d(cp.constitution if cp else ""),
        "verified": bool(cp and cp.is_verified_badge),
        "rating": 0,
        "contact": _d(cp.contact_person if cp else ""),
        "email": _d(cp.email if cp else ""),
        "accountStatus": _entity_account_status(cp),
        "cardIssueDate": (cp.id_card_issue_date.isoformat() if cp and cp.id_card_issue_date else ""),
        "cardValidTill": (cp.id_card_validity_till.isoformat() if cp and cp.id_card_validity_till else ""),
    }


def _contractor_stats(user):
    bindings = WorkerContractorBinding.objects.filter(contractor=user)
    sites = Site.objects.filter(bindings__contractor=user,
                                bindings__binding_status__in=("PENDING", "ACCEPTED")).distinct()
    workers = bindings.filter(binding_status="ACCEPTED").count()
    return {
        "totalWorkers": workers,
        "activeSites": sites.count(),
        "complianceScore": 0,
        "pendingAlerts": 0,
    }


def _contractor_principal_employer(user):
    binding = (WorkerContractorBinding.objects.filter(contractor=user, binding_status="ACCEPTED").first()
               or WorkerContractorBinding.objects.filter(contractor=user).first())
    if binding and binding.site and binding.site.employer:
        ep = getattr(binding.site.employer, "employer_profile", None)
        return {
            "name": _org_name(binding.site.employer),
            "code": _d(ep.employer_code if ep else ""),
            "industry": _d(ep.industry if ep else ""),
            "email": _d(ep.email if ep else ""),
            "lin": _d(ep.lin if ep else ""),
        }
    return {"name": "", "code": "", "industry": "", "email": "", "lin": ""}


def _contractor_sites(user):
    """Sites allotted to the contractor by an employer (APPROVED on an ACCEPTED
    contractor↔employer binding). A contractor never owns a site — these are the
    employer's sites that were allotted to them."""
    allotments = (ContractorSiteAllotment.objects
                  .filter(binding__contractor=user, binding__binding_status="ACCEPTED",
                          status="APPROVED"))
    # Earliest approval of each allotment — when the contractor was given the
    # site. Drives the Financial Year list so it starts at the site, not the
    # employer binding or incorporation.
    allotted_on = {}
    for a in allotments:
        when = a.approved_at or a.created_at
        if when and (a.site_id not in allotted_on or when < allotted_on[a.site_id]):
            allotted_on[a.site_id] = when
    site_ids = set(allotted_on)
    sites = Site.objects.filter(id__in=site_ids)
    rows = []
    for s in sites:
        emp_name = _org_name(s.employer)
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "bssId": _d(s.bss_site_id),
            "employer": emp_name, "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "status": _d(s.site_status) or ("Active" if s.attendance_enabled else "Planned"),
            "workers": WorkerContractorBinding.objects.filter(
                contractor=user, site=s, binding_status="ACCEPTED").count(),
            "compliance": _site_compliance_pct(user, s),
            "boundSince": _dts(allotted_on.get(s.id)) or "",
            "data": _site_scalar_data(s),
        })
    return rows


def _contractor_pending_sites(user):
    """Sites proposed to the contractor but not yet approved (PENDING allotment
    on an ACCEPTED contractor<->employer binding). Surfaced so the contractor can
    see a site request is waiting for their approval instead of a bare empty list."""
    rows = []
    qs = (ContractorSiteAllotment.objects
          .filter(binding__contractor=user, binding__binding_status="ACCEPTED",
                  status="PENDING")
          .select_related("site"))
    for a in qs:
        s = a.site
        if s is None:
            continue
        rows.append({
            "id": str(s.id), "code": _d(s.site_code), "name": _d(s.site_name),
            "bssId": _d(s.bss_site_id),
            "employer": _org_name(s.employer),
            "location": _d(s.location) or _d(s.city),
            "state": _d(s.state),
            "source": _d(a.source),
        })
    return rows


def _contractor_workers(user):
    bindings = list(WorkerContractorBinding.objects
                    .filter(contractor=user, binding_status__in=("PENDING", "ACCEPTED"))
                    # Pending Rozgar invitations are not yet workers — only the
                    # accepted engagement counts (so the pending-verification
                    # count stays zero until the worker accepts).
                    .exclude(binding_status="PENDING", source="rozgar")
                    .order_by("-created_at"))
    worker_ids = [b.worker_id for b in bindings]
    emp_map = {e.user_id: e for e in WorkerEmployment.objects.filter(user_id__in=worker_ids)}
    ss_map = {s.user_id: s for s in WorkerSocialSecurity.objects.filter(user_id__in=worker_ids)}
    # Latest DISPATCHED gate pass per worker (employer released it) — drives the
    # "View Gate Pass" action in the contractor's worker menu.
    gp_map = {}
    for gp in (WorkerGatePass.objects
               .filter(worker_id__in=worker_ids, dispatched=True)
               .exclude(status="REVOKED")
               .order_by("worker_id", "-created_at")):
        gp_map.setdefault(gp.worker_id, gp)
    rows = []
    for b in bindings:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        wemp = emp_map.get(b.worker_id)
        ss = ss_map.get(b.worker_id)
        cp = getattr(b.contractor, "contractor_profile", None)
        emp = None
        site = None
        if b.site:
            site = b.site
            emp = getattr(b.site.employer, "employer_profile", None)
        card_issue, card_valid = _worker_id_card_dates(
            wemp, b.accepted_at.date() if b.accepted_at else None)
        gp = gp_map.get(b.worker_id)
        rows.append({
            "id": b.worker_id,
            "bindingId": b.id,
            "siteId": str(b.site_id) if b.site_id else "",
            "name": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "mobile": _d(wi.mobile_number if wi else ""),
            "siteColour": _d(getattr(b.site, "assign_color", "") or "") if b.site else "",
            "siteCode": _d(getattr(b.site, "site_code", "") or "") if b.site else "",
            "siteAddress": _d(getattr(b.site, "location", "") or "") if b.site else "",
            "site": site.site_name if site else "",
            "employer": _org_name(b.site.employer) if b.site else "",
            "designation": _d(b.designation) or ((_d(wemp.designation) if wemp else "") or ""),
            "doj": _dts(b.accepted_at.date()) if b.accepted_at else None,
            "compliance": 0,
            # Mirror the binding status shown on the Binding Requests page / DB.
            "status": _WORKER_BINDING_STATUS.get(str(b.binding_status).upper(),
                                                 _d(b.binding_status)),
            "refCode": _d(wi.bss_worker_id if wi else ""),
            "department": _d(b.department) or ((_d(wemp.department) if wemp else "") or ""),
            "campNo": _d(wemp.camp_no) if wemp else "",
            "routeBusNo": ((_d(wemp.route) or _d(wemp.bus_no)) if wemp else ""),
            "uan": _d(ss.epfo_uan) if ss else "",
            "esic": _d(ss.esic_ip_number) if ss else "",
            "gender": _d(wi.gender if wi else ""),
            "category": "",
            "skills": "",
            "photoUrl": _d(wi.photo if wi else ""),
            "eligibility": _gate_pass_eligibility(b.worker),
            "aadhaar": _d(wi.aadhaar if wi else ""),
            "dob": _dts(wi.date_of_birth) if wi and wi.date_of_birth else "",
            "fatherName": _d(wi.father_name if wi else ""),
            "bloodGroup": _d(wi.blood_group if wi else ""),
            "emergencyName": _d(wi.emergency_contact_name if wi else ""),
            "emergencyNumber": _d(wi.emergency_contact_number if wi else ""),
            "emergencyRelation": _d(wi.emergency_contact_relation if wi else ""),
            "contractorName": _org_name(b.contractor),
            "contractorCode": _d(cp.contractor_code) if cp else _bss_contractor_code(b.contractor_id),
            "contractorContact": _d(getattr(cp, "mobile", "") or getattr(cp, "contact_person", "")) if cp else "",
            "contractorEmail": _d(getattr(cp, "email", "")) if cp else "",
            "idCardIssueDate": card_issue.isoformat() if card_issue else "",
            "idCardValidityTill": card_valid.isoformat() if card_valid else "",
            "gatePass": ({
                "id": gp.id,
                "number": _d(gp.gate_pass_no),
                "type": _GP_TYPE_LABEL.get(_d(gp.gate_pass_type), _d(gp.gate_pass_type)),
                "validFrom": _dts(gp.start_date),
                "validTo": _dts(gp.end_date),
                "status": _GP_STATUS_LABEL.get(_d(gp.status), _d(gp.status)),
                "blocked": (_is_gate_pass_blocked(b.worker, b.site.employer) if (b.site and b.site.employer) else False),
                "branding": _gate_pass_branding(b.site),
            } if gp else None),
        })
    return rows


def _contractor_compliances(user):
    """The contractor's statutory compliance register (its own ComplianceDocument
    rows — created from the Compliance & Welfare / compliance form)."""
    rows = []
    qs = user.compliance_docs.select_related("master", "site", "employer").order_by("-created_at")[:60] if hasattr(user, "compliance_docs") else []
    for c in qs:
        rows.append(_compliance_doc_row(c))
    return rows


def _contractor_gate_pass_row(g):
    meta = _gate_pass_worker_meta(g.worker)
    site = g.site
    employer_name = ""
    if site and site.employer:
        ep = getattr(site.employer, "employer_profile", None)
        employer_name = _d(ep.employer_name if ep else site.employer.username)
    blocked = _is_gate_pass_blocked(g.worker, site.employer if site else None)
    return {
        "id": g.id, **meta,
        "number": _d(g.gate_pass_no),
        "employer": employer_name,
        "type": _GP_TYPE_LABEL.get(_d(g.gate_pass_type), _d(g.gate_pass_type)),
        "site": site.site_name if site else "",
        "validFrom": _dts(g.start_date), "validTo": _dts(g.end_date),
        "requestedAt": _dts(g.created_at),
        # Ownership: contractor requests, employer approves (Excel Contractor 67-70).
        "requestedBy": _party_name(g.issued_by),
        "approvedBy": _party_name(g.approved_by),
        "approvedAt": _dts(g.approved_at),
        "status": "Blocked" if blocked else _GP_STATUS_LABEL.get(_d(g.status), _d(g.status)),
        "blocked": blocked,
        "eligibility": _gate_pass_eligibility(g.worker),
        "branding": _gate_pass_branding(site),
    }


def _contractor_gate_passes(user):
    """Explicit requests keep their status; every other bound worker also shows
    an auto-generated pass (from their BSS ID card) so the contractor sees site
    access for all of their workers, not just the ones they requested."""
    rows = [_contractor_gate_pass_row(g) for g in WorkerGatePass.objects.filter(
        issued_by=user).select_related("worker", "site").order_by("-created_at")[:100]]
    seen = {(row["workerId"], row["type"]) for row in rows}
    bindings = (WorkerContractorBinding.objects
                .filter(contractor=user, binding_status="ACCEPTED")
                .select_related("worker", "site", "site__employer"))
    for b in bindings:
        meta = _gate_pass_worker_meta(b.worker)
        gp_type = _auto_gate_pass_type(b.worker)
        site = b.site
        ep = getattr(site.employer, "employer_profile", None) if (site and site.employer) else None
        employer_name = _d(ep.employer_name if ep else (site.employer.username if site and site.employer else ""))
        if not gp_type:
            # Not eligible yet — show the worker with the reason so the contractor
            # knows why no pass has been issued.
            if (meta["workerId"], "Not eligible") in seen:
                continue
            rows.append({
                "id": f"auto-{b.id}",
                "auto": True,
                "number": "",
                **meta,
                "employer": employer_name,
                "type": "Not eligible",
                "site": site.site_name if site else "",
                "validFrom": "", "validTo": "",
                "requestedAt": _dts(b.created_at),
                "requestedBy": "", "approvedBy": "", "approvedAt": "",
                "status": "Not eligible",
                "blocked": False,
                "eligible": False,
                "missing": _gate_pass_missing(b.worker),
            "eligibility": _gate_pass_eligibility(b.worker),
            "costSheetId": b.cost_sheet_id,
            "costSheet": _d(b.cost_sheet.code) if b.cost_sheet_id else "",
            "costSheetName": _d(b.cost_sheet.name) if b.cost_sheet_id else "",
            "offeredWage": _num(b.offered_wage),
            "ctc": _num(b.computed_ctc),
            "costBreakdown": b.cost_breakdown or {},
            "branding": _gate_pass_branding(site),
            })
            continue
        label = _GP_TYPE_LABEL.get(gp_type, gp_type)
        if (meta["workerId"], label) in seen:
            continue
        issue_date, valid_till = _auto_gate_pass_dates(b.worker, gp_type)
        blocked = _is_gate_pass_blocked(b.worker, b.site.employer if b.site else None)
        rows.append({
            "id": f"auto-{b.id}",
            "auto": True,
            "number": _auto_gate_pass_no(b.worker, gp_type),
            **meta,
            "employer": employer_name,
            "type": label,
            "site": site.site_name if site else "",
            "validFrom": _dts(issue_date), "validTo": _dts(valid_till),
            "requestedAt": _dts(b.created_at),
            "requestedBy": "", "approvedBy": "", "approvedAt": "",
            "status": "Blocked" if blocked else "Approved",
            "blocked": blocked,
            "eligible": True,
            "missing": [],
            "eligibility": _gate_pass_eligibility(b.worker),
            "branding": _gate_pass_branding(site),
        })
    return rows[:200]


def _contractor_applications(user):
    from api import matching

    rows = []
    reqs = user.rozgar_requests.all()[:20] if hasattr(user, "rozgar_requests") else []
    # RozgarRequest.status is stored uppercase; the contractor UI (shortlist /
    # hire & bind / reject buttons) matches on the display labels below.
    status_map = {"PENDING": "Pending", "SHORTLISTED": "Shortlisted", "ACCEPTED": "Hired",
                  "REJECTED": "Rejected", "CANCELLED": "Cancelled", "EXPIRED": "Expired"}
    for r in reqs:
        job = getattr(r, "job", None)
        wi = WorkerIdentity.objects.filter(user=r.worker).first()
        profile = matching.worker_profile(r.worker)
        location = ", ".join(part for part in (profile.get("city"), profile.get("state")) if part)
        rows.append({
            "id": str(r.id),
            "workerName": _d(wi.name if wi else r.worker.username),
            "workerId": _d(wi.bss_worker_id if wi else ""),
            "employer": "",
            "trade": _d(profile.get("trade") or (job.job_title if job else "")),
            "experience": (f"{profile['years']:g} yrs" if profile.get("years") else ""),
            "expectedWage": _num(job.wage_offered if job else 0),
            "location": _d(location),
            "status": status_map.get(str(r.status).upper(), "Pending"),
            "dateApplied": _dts(r.requested_at),
            "matchScore": matching.score(r.worker, job, profile=profile),
        })
    return rows


def _contractor_available_workers(user):
    """Workers who turned on 'Available for work' (Rozgar Setu) — surfaced to the
    contractor for sourcing. Excludes workers already bound to this contractor."""
    from bss_core.models import WorkerOther

    bound_ids = set(WorkerContractorBinding.objects.filter(
        contractor=user, binding_status__in=("PENDING", "ACCEPTED")
    ).values_list("worker_id", flat=True))
    rows = []
    for other in (WorkerOther.objects.filter(available_for_work=True)
                  .select_related("user").order_by("-updated_at")[:50]):
        w = other.user
        if w is None or w.id in bound_ids:
            continue
        wi = WorkerIdentity.objects.filter(user=w).first()
        addr = getattr(w, "worker_address", None)
        state = str(getattr(addr, "current_state", "") or getattr(addr, "permanent_state", "") or "")
        skills = []
        if hasattr(w, "worker_skills"):
            skills = [str(getattr(s, "name", "") or "") for s in w.worker_skills.all()[:4]]
        rows.append({
            "id": w.id,
            "workerName": _d(wi.name if wi else w.username),
            "workerId": _d(wi.bss_worker_id if wi else _bss_worker_code(w.id)),
            "trade": next((s for s in skills if s), ""),
            "skills": [s for s in skills if s],
            "experience": "",
            "expectedWage": 0,
            "location": state,
            "status": "Available",
            "dateApplied": _dts(other.updated_at),
            "matchScore": 0,
        })
    return rows


def _contractor_employers(user):
    """Principal employers the contractor is actually bound to (ACCEPTED
    contractor↔employer bindings) and the sites those employers allotted
    (APPROVED allotments). Derived only from live relationships — a contractor
    has no employer relationship without an accepted binding."""
    employers = {}
    for eng in ContractorEmployerBinding.objects.filter(contractor=user, binding_status="ACCEPTED"):
        e = eng.employer
        ep = getattr(e, "employer_profile", None)
        employers[e.id] = {
            "id": e.id,
            "name": _org_name(e),
            "employerId": _d(ep.employer_code if ep else _bss_employer_code(e.id)),
            "code": _d(ep.employer_code if ep else _bss_employer_code(e.id)),
            "industry": _d(ep.industry if ep else ""),
            "email": _d(ep.email if ep else ""),
            "lin": _d(ep.lin if ep else ""),
            "sites": [],
            "status": "ACTIVE",
            "boundSince": _dts(eng.accepted_at) if eng.accepted_at else None,
        }
    rows = []
    for k, v in employers.items():
        allotted = set(ContractorSiteAllotment.objects.filter(
            binding__contractor=user, binding__employer_id=k,
            binding__binding_status="ACCEPTED", status="APPROVED"
        ).values_list("site_id", flat=True))
        site_rows = [s for s in Site.objects.filter(employer_id=k, id__in=allotted)]
        # Human-readable site names (the UI previously showed raw site IDs) plus
        # the full detail rows so the contractor can see exactly what is allotted.
        v["sites"] = [_d(s.site_name) for s in site_rows]
        v["siteDetails"] = [{
            "id": str(s.id), "name": _d(s.site_name), "code": _d(s.site_code),
            "location": _d(s.location) or _d(s.city), "state": _d(s.state),
        } for s in site_rows]
        rows.append(v)
    return rows


def _contractor_submissions(user):
    rows = []
    status_map = {"PENDING": "Pending review", "VERIFIED": "Verified", "RETURNED": "Rejected", "REJECTED": "Rejected"}
    for ev in SubmissionEvidence.objects.filter(user=user)[:20]:
        days_left = None
        if ev.due_date:
            days_left = (ev.due_date - timezone.localdate()).days
        rows.append({
            "id": str(ev.id), "uniqueNo": _d(ev.unique_no),
            "type": _d(ev.doc_type),
            "employer": _d(ev.employer), "site": _d(ev.site),
            "state": _d(ev.state), "financialYear": _d(ev.financial_year),
            "month": _d(ev.month), "location": _d(ev.location),
            "period": _d(ev.period), "status": status_map.get(ev.status, _d(ev.status)),
            "submittedAt": _dts(ev.created_at), "updatedAt": _dts(ev.updated_at),
            "daysLeft": days_left, "mandatory": bool(ev.is_mandatory),
            "frequency": _d(ev.frequency), "documentType": _d(ev.document_type),
            "accuracy": _num(ev.ocr_accuracy),
            "aiStatus": _d(ev.ai_status),
            "checkpoints": list(ev.checkpoint_results or []),
            "findings": list(ev.validation_findings or []),
            "source": "evidence",
            "fileName": _d(ev.original_name), "checksum": _d(ev.checksum_sha256),
        })
    for c in user.compliance_docs.all()[:20] if hasattr(user, "compliance_docs") else []:
        rows.append({
            "id": f"doc-{c.id}", "uniqueNo": _d(c.unique_no),
            "type": _d(c.master.act if c.master else ""),
            "employer": "", "site": c.site.site_name if c.site else "",
            "state": _d(c.state), "financialYear": _d(c.financial_year),
            "month": "", "location": "", "period": _d(c.period), "status": _d(c.status),
            "submittedAt": _dts(c.updated_at), "updatedAt": _dts(c.updated_at),
            "daysLeft": c.days_left, "mandatory": bool(c.is_mandatory),
            "frequency": _d(c.frequency), "documentType": "",
            "accuracy": _num(c.ocr_accuracy), "findings": [],
            "source": "register",
            "fileName": "", "checksum": "",
        })
    return {"documents": rows}


def _contractor_worker_benefits(user):
    """Bonus / Leave Encashment records this contractor uploaded for its workers."""
    def rows(kind):
        return [_benefit_row(r) for r in
                WorkerBenefitRecord.objects.filter(contractor=user, kind=kind)
                .select_related("worker")[:200]]
    return {"bonus": rows("BONUS"), "leaveEncashment": rows("LEAVE_ENCASHMENT")}


def _salary_row(w):
    """One salary/wage register row from a WorkerWages record."""
    wi = WorkerIdentity.objects.filter(user_id=w.worker_id).first()
    site = w.site
    ep = getattr(site.employer, "employer_profile", None) if site and site.employer else None
    status_map = {"DRAFT": "Pending verification", "APPROVED": "Verified",
                  "PAID": "Verified", "CANCELLED": "Returned"}
    return {
        "id": str(w.id),
        "worker": _d(wi.name if wi else w.worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "employer": _d(ep.employer_name if ep else ""),
        "site": site.site_name if site else "",
        "period": w.period_start.strftime("%b %Y") if w.period_start else "",
        "gross": _num(w.gross_wage),
        "deductions": _num(w.deductions_amount),
        "net": _num(w.net_wage),
        "paidOn": _dts(w.period_end) if w.period_end else "",
        "fileName": "",
        "status": status_map.get(w.status, "Pending verification"),
        "source": "contractor",
    }


def _contractor_salaries(user):
    """The contractor's salary/wage register — from WorkerWages records."""
    qs = (WorkerWages.objects.filter(contractor=user)
          .select_related("worker", "site", "site__employer")
          .order_by("-period_start")[:200])
    return [_salary_row(w) for w in qs]


def _contractor_licenses(user):
    """Statutory registrations & licences of an entity. A licence counts as
    Active when its verification is acknowledged and today is before expiry."""
    from datetime import date as _date
    rows = []
    for st in user.statutory_registrations.all() if hasattr(user, "statutory_registrations") else []:
        ver = str(st.verification_status or "").upper()
        if ver in ("ACTIVE", "VERIFIED", "APPROVED", "VALIDATED"):
            if st.expiry_at and st.expiry_at < _date.today():
                status = "Expired"
            else:
                status = "Active"
        else:
            status = "Pending"
        rows.append({
            "id": str(st.id), "kind": _d(st.reg_kind),
            "name": _d(st.get_reg_kind_display() or st.reg_kind),
            "authority": _d(st.authority), "number": _d(st.reg_number),
            "state": "", "validFrom": _dts(st.issued_at), "validTo": _dts(st.expiry_at),
            "status": status,
        })
    return rows


def _contractor_worker_documents(user):
    """Per-worker document register for workers bound to this contractor: the
    full catalog merged with each worker's uploads, so compliance documents show
    Missing rows the same way the worker's own Documents page does."""
    from bss_core.models import WorkerDocument
    bindings = [b for b in (
        WorkerContractorBinding.objects.filter(
            contractor=user, binding_status="ACCEPTED").select_related("site", "worker"))
        if b.worker]
    _DL_STATUS = {"UPLOADED": "Pending", "VERIFIED": "Verified", "REJECTED": "Rejected",
                  "MISSING": "Missing", "UNDER_VERIFICATION": "Pending",
                  "EXPIRED": "Expiring", "ISSUED": "Issued"}
    rows = []
    for b in bindings:
        wi = _get_identity(b.worker)
        worker_id = _d(wi.bss_worker_id if wi else "")
        site = b.site.site_name if b.site else ""
        for r in _worker_documents_display(b.worker):
            rows.append({
                "id": str(r["id"]) if r["id"] else None,
                "worker": _d(wi.name if wi and wi.name else b.worker.username),
                "workerId": worker_id,
                "site": site,
                "document": r["name"],
                "reference": r["code"],
                "mandatory": bool(r["mandatory"]),
                "status": _DL_STATUS.get(str(r["status"]).upper(), "Pending"),
                "verified": str(r["status"]).upper() in ("VERIFIED", "APPROVED", "VALIDATED"),
                "expiry": r["expiry"],
            })
    return rows


def _contractor_compliance_row(binding):
    """One bound worker's compliance / welfare record (contractor management)."""
    worker = binding.worker
    wi = _get_identity(worker)
    ws = WorkerWelfareSafety.objects.filter(user=worker).first()
    ss = WorkerSocialSecurity.objects.filter(user=worker).first()
    bank = WorkerBanking.objects.filter(user=worker).first()
    elig = _gate_pass_eligibility(worker)
    gp = WorkerGatePass.objects.filter(worker=worker).order_by("-created_at").first()
    gp_status = {"ACTIVE": "Active", "PENDING": "Pending", "REJECTED": "Expired",
                 "EXPIRED": "Expired", "REVOKED": "Expired"}.get(gp.status, "Pending") if gp else "Pending"
    return {
        "worker": _d(wi.name if wi and wi.name else worker.username),
        "workerId": _d(wi.bss_worker_id if wi else ""),
        "site": binding.site.site_name if binding.site else "",
        "gatePass": gp_status,
        "medical": elig["medical"],
        "healthSafety": elig["healthSafety"],
        "contractorVerified": bool(ws and ws.contractor_verified),
        "uanVerified": bool(ss and ss.uan_verified),
        "esicVerified": bool(ss and ss.esic_verified),
        # Auto-verified identifiers (read-only for the contractor; masked).
        "verified": {
            "aadhaar": _mask(wi.aadhaar) if wi else "",
            "aadhaarVerified": bool(wi and (wi.aadhaar or "").strip()),
            "pan": _d(wi.pan) if wi else "",
            "panVerified": bool(wi and wi.pan_verified),
            "bank": _mask(bank.bank_account_number) if bank else "",
            "bankVerified": bool(bank and str(bank.bank_verification_status or "").strip().lower() == "verified"),
            "bankName": _d(bank.bank_name) if bank else "",
            "ifsc": _d(bank.ifsc_code) if bank else "",
        },
        "eligibility": elig,
        "details": {
            "medicalExaminationStatus": _d(ws.medical_examination_status) if ws else "",
            "medicalFitnessStatus": _d(ws.medical_fitness_status) if ws else "",
            "lastMedicalExamination": _dts(ws.last_medical_examination) if ws and ws.last_medical_examination else "",
            "nextMedicalDue": _dts(ws.next_medical_due) if ws and ws.next_medical_due else "",
            "ppeRequired": bool(ws and ws.ppe_required),
            "typesOfPpeGiven": _d(ws.types_of_ppe_given) if ws else "",
            "safetyTrainingCompleted": bool(ws and ws.safety_training_completed),
            "siteInductionStatus": _d(ws.site_induction_status) if ws else "",
            "insuranceStatus": _d(ws.insurance_status) if ws else "",
            "accommodationProvided": _d(ws.accomodation_provided) if ws else "",
            "policeVerification": _d(ws.police_verification) if ws else "",
            "trainingDate": _dts(ws.training_date) if ws and ws.training_date else "",
            "trainerName": _d(ws.trainer_name) if ws else "",
            "uan": _d(ss.epfo_uan) if ss else "",
            "esic": _d(ss.esic_ip_number) if ss else "",
        },
    }


def _contractor_worker_compliance(user):
    bindings = (WorkerContractorBinding.objects
                .filter(contractor=user, binding_status="ACCEPTED")
                .select_related("worker", "site"))
    return [_contractor_compliance_row(b) for b in bindings]


def _contractor_workforce_growth(user=None):
    """Monthly active workforce — the number of distinct workers who were bound
    (accepted) at some point during each month, even if they were unbound later.
    Pending invitations (never accepted) are excluded and a worker bound several
    times in the same month counts once."""
    now = timezone.localdate()

    def _month_first(offset):
        """First day of the month `offset` months before the current month."""
        index = now.year * 12 + (now.month - 1) - offset
        return datetime.date(index // 12, index % 12 + 1, 1)

    def _series(length):
        rows = []
        for i in range(length):
            start = _month_first(length - 1 - i)
            end = _month_first(length - 2 - i)  # first day of the next month (exclusive)
            count = 0
            if user:
                count = (WorkerContractorBinding.objects
                         .filter(contractor=user, accepted_at__isnull=False, accepted_at__lt=end)
                         .filter(Q(unbound_at__isnull=True) | Q(unbound_at__gte=start))
                         .values("worker").distinct().count())
            rows.append({"month": start.strftime("%b %Y"), "workers": count})
        return rows

    return {"sixMonths": _series(6), "oneYear": _series(12)}


def _contractor_applicability(user=None):
    """Dynamic Labour Law Applicability based on contractor profile registration numbers,
    licences, and active worker thresholds."""
    cp = getattr(user, "contractor_profile", None) if user else None
    
    # Check if contractor has active workers bound
    worker_count = 0
    if user:
        worker_count = WorkerContractorBinding.objects.filter(
            contractor=user, binding_status="ACCEPTED"
        ).count()

    has_clra = bool(cp and (cp.clra_licence_no or "").strip()) or \
        bool(cp and (cp.lin or "").strip().lower().startswith("mh/clra")) or \
        worker_count >= 20
    has_pf = bool(cp and (cp.registration_number or "").strip()) or worker_count >= 20
    has_esic = bool(cp and (cp.labour_dept_reg_no or cp.udyam_no or "").strip()) or worker_count >= 10
    has_bocw = bool(cp and (cp.bocw_reg_no or "").strip())

    return [
        {
            "act": "Minimum Wages Act, 1948",
            "applies": True,
            "note": "Mandatory for all scheduled employment & active sites"
        },
        {
            "act": "Payment of Wages Act, 1936",
            "applies": True,
            "note": "Mandatory wage disbursement rules"
        },
        {
            "act": "Employees' Provident Funds (EPF) Act",
            "applies": has_pf,
            "note": f"EPFO Code registered" if cp and cp.registration_number else ("Threshold (20+ workers) applied" if worker_count >= 20 else "Optional (<20 workers)")
        },
        {
            "act": "ESIC Act, 1948",
            "applies": has_esic,
            "note": "ESIC IP registered" if has_esic else "Threshold (10+ workers) applied"
        },
        {
            "act": "Contract Labour (CLRA) Act, 1970",
            "applies": has_clra,
            "note": f"Licence No: {cp.clra_licence_no}" if cp and (cp.clra_licence_no or "").strip() else (f"LIN: {cp.lin}" if cp and (cp.lin or "").strip().lower().startswith("mh/clra") else ("Threshold (20+ contract workers)" if worker_count >= 20 else "Exempt (<20 workers)"))
        },
        {
            "act": "BOCW Act, 1996",
            "applies": has_bocw,
            "note": f"Reg No: {cp.bocw_reg_no}" if has_bocw else "Building & Construction Labour rules"
        }
    ]


def _contractor_compliance_history(user):
    """PF/ESIC submission history derived from real SubmissionEvidence records —
    one row per period + site, with the PF and ESIC challan status per column."""
    groups = {}
    status_map = {"PENDING": "Pending", "VERIFIED": "Filed", "RETURNED": "Returned"}
    for ev in SubmissionEvidence.objects.filter(user=user).order_by("-created_at")[:60]:
        low = f"{_d(ev.doc_type)} {_d(ev.document_type)}".lower()
        if "esic" not in low and "pf" not in low and "provident" not in low:
            continue
        key = (_d(ev.financial_year), _d(ev.month), _d(ev.site))
        g = groups.setdefault(key, {
            "id": f"ch-{abs(hash(key))}",
            "period": _d(ev.period) or f"{_d(ev.month)} {_d(ev.financial_year)}".strip(),
            "site": _d(ev.site), "pf": "", "esic": "", "amount": None, "status": "Pending",
        })
        label = status_map.get(ev.status, "Pending")
        if "esic" in low:
            g["esic"] = label
        else:
            g["pf"] = label
    rows = []
    for g in groups.values():
        bits = {v for v in (g["pf"], g["esic"]) if v}
        if bits:
            g["status"] = "Returned" if "Returned" in bits else ("Compliant" if bits <= {"Filed"} else "Pending")
            rows.append(g)
    return sorted(rows, key=lambda r: (r["period"], r["site"]), reverse=True)[:10]


def _contractor_job_history(user):
    rows = []
    for j in user.jobs.all()[:50] if hasattr(user, "jobs") else []:
        site = j.site
        applications = j.requests.count() if hasattr(j, "requests") else 0
        hires = j.requests.filter(status="ACCEPTED").count() if hasattr(j, "requests") else 0
        rows.append({
            "id": j.id, "title": _d(j.job_title),
            "trade": _d(j.trade), "category": _d(j.category),
            "workplaceType": _d(j.workplace_type, "On-site"),
            "state": _d(j.state or (site.state if site else "")),
            "city": _d(j.city or (site.city if site else "")),
            "site": site.site_name if site else "",
            "description": _d(j.job_description), "skills": j.skills or [],
            "experience": _d(j.experience),
            "minSalary": _num(j.min_salary), "maxSalary": _num(j.max_salary),
            "salaryVisibility": _d(j.salary_visibility, "Visible to all"),
            "vacancies": j.vacancies or 1,
            "monthlyWage": _num(j.wage_offered),
            "closingDate": _dts(j.validity_until), "duration": _d(j.duration),
            "visibility": _d(j.visibility, "Public"),
            "status": {"DRAFT": "Draft", "SUBMITTED": "Open", "APPROVED": "Open",
                       "CLOSED": "Closed"}.get(str(j.status).upper(), "Open"),
            "postedOn": _dts(j.created_at),
            "applications": applications, "hires": hires,
        })
    return rows


def _contractor_binding_requests(user):
    rows = []
    # Rozgar Setu invitations are worker-facing offers, not binding requests —
    # once the worker accepts, the engagement surfaces via the workforce lists.
    for b in WorkerContractorBinding.objects.filter(contractor=user).exclude(source="rozgar"):
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        ep = getattr(b.site.employer, "employer_profile", None) if b.site and b.site.employer else None
        rows.append({
            "id": b.id, "type": "Worker",
            "bindingId": b.id,
            "siteId": str(b.site_id) if b.site_id else "",
            "employerId": b.site.employer_id if b.site and b.site.employer_id else None,
            "entityName": _d(wi.name if wi else b.worker.username),
            "bssId": _d(wi.bss_worker_id if wi else ""),
            "site": b.site.site_name if b.site else "",
            "employer": _d(ep.employer_name if ep else ""),
            "designation": _d(b.designation),
            "wage": float(b.offered_wage) if b.offered_wage else 0,
            "costSheetId": b.cost_sheet_id,
            "costSheet": _d(b.cost_sheet.code) if b.cost_sheet_id else "",
            "costSheetName": _d(b.cost_sheet.name) if b.cost_sheet_id else "",
            "requestedOn": _dts(b.created_at),
            "status": {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled", "EXPIRED": "Expired",
                       "TRANSFERRED": "Site Changed"}.get(
                           str(b.binding_status).upper(), "Pending"),
            "initiatedBy": _wc_initiator_acceptor(b)[0],
            "acceptedBy": _wc_initiator_acceptor(b)[1],
            "consentWorker": bool(b.consent_worker),
            "consentContractor": bool(b.consent_contractor),
            "unbindRequested": bool(b.unbind_requested_at),
            "unbindConsentWorker": bool(b.unbind_consent_worker),
            "unbindConsentContractor": bool(b.unbind_consent_contractor),
            "history": _wc_history(b),
        })
    # Contractor <-> employer bindings (scanning an employer/site QR). Every
    # request is surfaced — rows are never replaced or hidden; a fresh request
    # after a decline is an additional row, not an overwrite.
    for e in ContractorEmployerBinding.objects.filter(contractor=user).order_by("-created_at"):
        ep = getattr(e.employer, "employer_profile", None)
        approved_sites = [a.site.site_name for a in e.allotments.all()
                          if a.site and a.status == "APPROVED"]
        pending_sites = [f"{a.site.site_name} (pending)" for a in e.allotments.all()
                         if a.site and a.status == "PENDING"]
        sites = approved_sites + pending_sites
        rows.append({
            "id": f"ce-{e.id}", "bindingId": e.id, "type": "Employer",
            "entityName": _org_name(e.employer),
            "bssId": _d(ep.employer_code if ep else "", _bss_employer_code(e.employer_id)),
            "site": ", ".join(sites) if sites else "Sites to be allotted",
            "allotments": [{
                "siteId": a.site_id,
                "site": a.site.site_name if a.site else "",
                "siteCode": a.site.site_code if a.site else "",
                "status": {"PENDING": "Pending", "APPROVED": "Approved",
                           "REJECTED": "Rejected", "RELEASED": "Released"}.get(str(a.status).upper(), "Pending"),
                "source": _d(a.source),
                "releaseRequested": bool(a.release_requested_at),
                "releaseRequestedBy": _d(a.release_requested_by),
            } for a in e.allotments.all()],
            "employer": _org_name(e.employer),
            "designation": "Principal employer binding",
            "wage": 0,
            "requestedOn": _dts(e.created_at),
            "status": {"PENDING": "Pending", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
                       "CANCELLED": "Cancelled"}.get(str(e.binding_status).upper(), "Pending"),
            "initiatedBy": _ce_initiator_acceptor(e)[0],
            "acceptedBy": _ce_initiator_acceptor(e)[1],
            # The contractor's own consent is consentContractor; the employer's
            # consent occupies the "worker" slot so the shared row shape works.
            "consentWorker": bool(e.consent_employer),
            "consentContractor": bool(e.consent_contractor),
            "unbindRequested": bool(e.unbind_requested_at),
            "unbindConsentWorker": bool(e.unbind_consent_employer),
            "unbindConsentContractor": bool(e.unbind_consent_contractor),
            "history": _ce_history(e),
        })
    rows.sort(key=lambda row: str(row.get("requestedOn") or ""), reverse=True)
    return rows


def _contractor_recent_activities(user):
    """Recent activities derived from real records — gate passes for bound
    workers, binding requests, job postings and compliance submissions,
    newest first (max 5)."""
    from bss_core.models import (
        WorkerGatePass, WorkerContractorBinding, ContractorJob, SubmissionEvidence
    )
    bound_worker_ids = list(WorkerContractorBinding.objects.filter(
        contractor=user, binding_status="ACCEPTED").values_list("worker_id", flat=True))
    activities = []

    for gp in WorkerGatePass.objects.filter(worker_id__in=bound_worker_ids).order_by("-created_at")[:3]:
        wi = WorkerIdentity.objects.filter(user=gp.worker).first()
        name = _d(wi.name if wi and wi.name else gp.worker.username)
        activities.append({
            "title": (f"Gate Pass {_d(gp.gate_pass_no)} issued for {name}"),
            "raw_time": gp.created_at,
            "type": "gate_pass"
        })

    for b in WorkerContractorBinding.objects.filter(contractor=user).order_by("-created_at")[:3]:
        wi = WorkerIdentity.objects.filter(user=b.worker).first()
        name = _d(wi.name if wi and wi.name else b.worker.username)
        status = _WORKER_BINDING_STATUS.get(str(b.binding_status).upper(), _d(b.binding_status))
        activities.append({
            "title": f"Worker {name} · binding {status}",
            "raw_time": b.created_at,
            "type": "binding"
        })

    for j in ContractorJob.objects.filter(contractor=user).order_by("-created_at")[:3]:
        activities.append({
            "title": f"Job posted: {_d(j.job_title)}",
            "raw_time": j.created_at,
            "type": "job"
        })

    for ev in SubmissionEvidence.objects.filter(user=user).order_by("-created_at")[:3]:
        label = {"PENDING": "submitted", "VERIFIED": "verified",
                 "RETURNED": "returned"}.get(ev.status, "submitted")
        activities.append({
            "title": f"{_d(ev.doc_type)} · {label}",
            "raw_time": ev.created_at,
            "type": "compliance"
        })

    activities.sort(key=lambda x: x["raw_time"] or timezone.now(), reverse=True)
    
    out = []
    now = timezone.now()
    for act in activities[:5]:
        dt = act["raw_time"]
        if not dt:
            time_str = "Recently"
        else:
            diff = (now - dt).total_seconds()
            if diff < 3600:
                time_str = f"{max(1, int(diff // 60))} mins ago"
            elif diff < 86400:
                time_str = f"{int(diff // 3600)} hours ago"
            elif diff < 172800:
                time_str = "1 day ago"
            else:
                time_str = f"{int(diff // 86400)} days ago"

        out.append({
            "title": act["title"],
            "time": time_str,
            "type": act["type"]
        })

    if not out:
        out = [
            {"title": "Contractor account active", "time": "Just now", "type": "system"}
        ]
    return out


def _contractor_registers(user):
    rows = []
    masters = []
    try:
        from bss_core.models import RegisterDocumentMaster
        masters = RegisterDocumentMaster.objects.filter(kind="register")[:20]
    except Exception:
        masters = []
    for m in masters:
        rows.append({
            "id": m.id, "documentName": _d(m.document_name),
            "documentType": _d(m.get_kind_display() or m.kind),
            "formNo": _d(m.form_number), "criticality": _d(m.criticality),
            "frequency": _d(m.frequency), "registerLevel": _d(m.state),
        })
    return rows


def _contractor_compliance_batch_row(b):
    audits = b.register_audits or {}
    first = (b.notes or "").strip().split(" ", 1)[0]
    register_count = int(first) if first.isdigit() else len(audits)
    statuses = [str((a or {}).get("status") or "") for a in audits.values()]
    if not audits:
        audit_status = "pending"
    elif any(s == "failed" for s in statuses):
        audit_status = "failed"
    elif any(s in ("", "pending") for s in statuses):
        audit_status = "pending"
    elif all(s == "passed" for s in statuses):
        audit_status = "passed"
    elif all(s == "unavailable" for s in statuses):
        audit_status = "unavailable"
    else:
        audit_status = "review"
    return {
        "id": str(b.id), "financialYear": _d(b.financial_year),
        "month": _d(b.month), "year": _d(b.year), "state": _d(b.state),
        "frequency": _d(b.frequency),
        "site": b.site.site_name if b.site else "",
        "siteCode": b.site.site_code if b.site else "",
        "employeeCount": b.employee_count, "locationCount": b.location_count,
        "generatedOn": _dts(b.generated_on) if b.generated_on else "",
        "generatedBy": _d(b.generated_by),
        "rowsCount": b.rows_count,
        "registerCount": register_count,
        "auditStatus": audit_status,
        "reviewNote": _d(getattr(b, "review_note", "")),
        "hasFile": bool(b.generated_file),
        "notes": _d(b.notes),
        "version": int(b.version or 1),
        "isCurrent": bool(getattr(b, "is_current", True)),
        "status": _batch_status_label(b.status),
    }


def _batch_status_label(status):
    return {"GENERATED": "Generated", "PENDING": "Pending",
            "SUBMITTED": "Submitted",
            "VERIFIED": "Verified",
            "RETURNED": "Returned",
            "REJECTED": "Rejected",
            "FAILED": "Failed",
            "SUPERSEDED": "Superseded"}.get(str(status).upper(), "Generated")


def _batch_version_row(b):
    """A compact entry for a batch's version history."""
    audits = b.register_audits or {}
    statuses = [str((a or {}).get("status") or "") for a in audits.values()]
    audit_status = "pending"
    if audits:
        if any(s == "failed" for s in statuses):
            audit_status = "failed"
        elif all(s == "passed" for s in statuses):
            audit_status = "passed"
        elif any(s in ("", "pending") for s in statuses):
            audit_status = "pending"
        else:
            audit_status = "review"
    return {
        "id": str(b.id), "version": int(b.version or 1),
        "status": _batch_status_label(b.status),
        "generatedOn": _dts(b.generated_on) if b.generated_on else "",
        "generatedBy": _d(b.generated_by),
        "isCurrent": bool(getattr(b, "is_current", True)),
        "hasFile": bool(b.generated_file),
        "auditStatus": audit_status,
    }


def _contractor_compliance_batches(user):
    """CLRA/statutory register batches generated by the contractor. The current
    version of each (site, period) is the row; every version is listed under
    ``versions`` for history."""
    if not hasattr(user, "compliance_batches"):
        return []
    # Every (site, period) the contractor has generated must reach the portal:
    # the contractor screens filter this list by site + financial year + period
    # client-side, so truncating it makes older periods look "not generated".
    qs = list(user.compliance_batches.select_related("site").order_by("-created_at")[:5000])
    by_key: dict = {}
    for b in qs:
        by_key.setdefault((b.site_id, b.month, b.year), []).append(b)
    rows, seen = [], set()
    for b in qs:
        key = (b.site_id, b.month, b.year)
        if key in seen:
            continue
        seen.add(key)
        group = sorted(by_key[key], key=lambda x: (x.version or 1))
        current = next((x for x in group if getattr(x, "is_current", True)), group[-1])
        row = _contractor_compliance_batch_row(current)
        row["versions"] = [_batch_version_row(v) for v in group]
        rows.append(row)
    return rows


def _contractor_compliance_state_summary(user):
    """State + period rollup over *every* generated batch (not just the latest 20
    sent as `complianceBatches`): how many sites and how many employees per
    (state, month, year). Powers the state-wise summary above the batch table."""
    from django.db.models import Count, Sum
    if not hasattr(user, "compliance_batches"):
        return []
    rows = (user.compliance_batches
            .filter(is_current=True)
            .values("state", "month", "year")
            .annotate(sites=Count("site", distinct=True), employees=Sum("employee_count")))
    return [{"state": _d(r["state"]), "month": _d(r["month"]), "year": _d(r["year"]),
             "sites": r["sites"] or 0, "employees": r["employees"] or 0}
            for r in rows]


def _contractor_audit_report_row(r):
    items = [
        {"act": _d(i.act), "form": _d(i.form_number), "nature": _d(i.nature),
         "score": _num(i.achieved_score), "maxScore": _num(i.max_score),
         "status": _d(i.status),
         "auditorRemarks": _d(i.remarks), "vendorRemarks": ""}
        for i in r.items.all()
    ]
    return {
        "id": str(r.id), "uniqueNo": _d(r.unique_no), "site": _d(r.site_name),
        "employer": _d(r.client_name), "period": _d(r.period),
        "financialYear": _d(r.financial_year), "state": _d(r.state),
        "reportDate": _dts(r.report_date),
        "score": _num(r.score), "scorePercent": _num(r.score_pct),
        "version": int(r.version or 1),
        "isCurrent": bool(getattr(r, "is_current", True)),
        "actWise": items,
    }


def _report_version_row(r):
    """A compact entry for a report's version history."""
    return {
        "id": str(r.id), "version": int(r.version or 1),
        "uniqueNo": _d(r.unique_no), "reportDate": _dts(r.report_date),
        "scorePercent": _num(r.score_pct),
        "isCurrent": bool(getattr(r, "is_current", True)),
    }


def _contractor_audit_reports(user):
    """The contractor's per-submission audit reports. The current version of each
    (site, period) is the row; every version is listed under ``versions``."""
    if not hasattr(user, "compliance_reports"):
        return []
    qs = list(user.compliance_reports.order_by("-id")[:200])
    by_key: dict = {}
    for r in qs:
        by_key.setdefault((r.site_name, r.period, r.financial_year), []).append(r)
    rows, seen = [], set()
    for r in qs:
        key = (r.site_name, r.period, r.financial_year)
        if key in seen:
            continue
        seen.add(key)
        group = sorted(by_key[key], key=lambda x: (x.version or 1))
        current = next((x for x in group if getattr(x, "is_current", True)), group[-1])
        row = _contractor_audit_report_row(current)
        row["versions"] = [_report_version_row(v) for v in group]
        rows.append(row)
        if len(rows) >= 20:
            break
    return rows


def _contractor_payroll_config(user):
    pc = PayrollConfig.objects.filter(employer=user).first()
    today = timezone.localdate()

    working_days = []
    if pc and pc.working_days:
        working_days = [d.strip() for d in pc.working_days.split(",") if d.strip()]

    upcoming = []
    if pc:
        for p in pc.periods.filter(status__in=["OPEN", "PROCESSING"]).order_by("period_start")[:3]:
            upcoming.append({"period": p.period_start.strftime("%b %Y"), "payDate": _dts(p.pay_date)})

    epf, esi, bonus = {}, {}, {}
    pt_rows, lwf_rows = [], []
    earnings, deductions, benefits, reimbursements = [], [], [], []
    ffs = {}
    staff_portal = {}

    if pc:
        epf_obj = getattr(pc, "epf", None)
        if epf_obj:
            epf = {"number": _d(epf_obj.epf_number), "deductionCycle": _d(epf_obj.deduction_cycle) or "monthly",
                   "employeeRate": _num(epf_obj.employee_rate),
                   "employerRate": _num(epf_obj.employer_rate),
                   "includeInSalary": bool(epf_obj.employer_pf_included),
                   "edliIncluded": bool(epf_obj.edli_included),
                   "adminChargesIncluded": bool(epf_obj.admin_charges_included),
                   "allowOverride": bool(epf_obj.employee_level_override),
                   "proRate": bool(epf_obj.prorate_restricted_pf_wage),
                   "lopConsideration": bool(epf_obj.consider_components_lop),
                   "abryEligible": bool(epf_obj.abry_eligible), "sample": []}
        esi_obj = getattr(pc, "esi", None)
        if esi_obj:
            esi = {"number": _d(esi_obj.esi_number), "deductionCycle": _d(esi_obj.deduction_cycle) or "monthly",
                   "employeeRate": _num(esi_obj.employee_rate),
                   "employerRate": _num(esi_obj.employer_rate),
                   "otherDetail": ""}
        bonus_obj = getattr(pc, "bonus", None)
        if bonus_obj:
            bonus = {"minWageStates": [_d(b.state) for b in pc.bonus_min_wages.all()],
                     "paymentCycle": _d(bonus_obj.payment_cycle) or "annual",
                     "percentage": _num(bonus_obj.bonus_pct)}
        pt_rows = [{"location": _d(p.location or p.work_location), "ptNumber": _d(p.pt_number),
                    "state": _d(p.state), "cycle": _d(p.deduction_cycle) or "monthly",
                    "applicable": bool(p.applicable), "slabs": []}
                   for p in pc.pt_configs.all()]
        lwf_rows = [{"state": _d(l.state), "minAmount": _num(l.min_amount),
                     "maxAmount": _num(l.max_amount),
                     "employeeShare": _num(l.employee_share),
                     "employerShare": _num(l.employer_share),
                     "deductionCycle": _d(l.deduction_cycle) or "half-yearly",
                     "enabled": bool(l.status_enabled)}
                    for l in pc.lwf_configs.all()]
        earnings = [{"name": _d(c.name), "type": _d(c.type), "calculation": _d(c.calculation_method),
                     "value": _num(c.calc_value), "considerForPf": bool(c.consider_for_pf),
                     "considerForEsi": bool(c.consider_for_esi)} for c in pc.earnings.all()]
        deductions = [{"name": _d(d.name), "frequency": _d(d.frequency), "amount": _num(d.amount)}
                      for d in pc.deductions.all()]
        benefits = [{"name": _d(b.name), "frequency": _d(b.frequency), "amount": _num(b.amount)}
                    for b in pc.benefits.all()]
        reimbursements = [{"name": _d(r.name), "maxAmount": _num(r.max_amount_per_month)}
                          for r in pc.reimbursements.all()]
        ffs_obj = getattr(pc, "ffs", None)
        if ffs_obj:
            ffs = {
                "leaveEncashment": {"enabled": bool(ffs_obj.leave_encashment_enabled),
                                    "leaveType": _d(ffs_obj.leave_encashment_leave_type),
                                    "on": _d(ffs_obj.leave_encashment_on),
                                    "days": ffs_obj.leave_encashment_days,
                                    "calcDays": _d(ffs_obj.leave_encashment_calc_days),
                                    "custom": _d(ffs_obj.leave_encashment_custom)},
                "gratuityEncashment": {"enabled": bool(ffs_obj.gratuity_encashment_enabled),
                                       "maturityYears": ffs_obj.gratuity_maturity_years,
                                       "maturityMonths": ffs_obj.gratuity_maturity_months,
                                       "roundingMonths": _d(ffs_obj.gratuity_rounding_months)},
                "noticePenalty": {"enabled": bool(ffs_obj.notice_penalty_enabled),
                                  "on": _d(ffs_obj.notice_penalty_on)},
                "excessLeaveRecovery": {"enabled": bool(ffs_obj.excess_leave_recovery),
                                        "on": _d(ffs_obj.excess_leave_penalty_on)},
                "assumeDaysRecovery": {"enabled": bool(ffs_obj.assume_days),
                                       "days": ffs_obj.assume_days,
                                       "on": _d(ffs_obj.assume_days_penalty_on)},
            }
        sp_obj = getattr(pc, "staff_portal", None)
        if sp_obj:
            doc_vis = sp_obj.document_visibility or {}
            staff_portal = {"portalAccess": bool(sp_obj.portal_access),
                            "bannerMessage": _d(sp_obj.banner_message),
                            "bannerTill": _dts(sp_obj.banner_till) if sp_obj.banner_till else None,
                            "contact": _d(sp_obj.support_contact),
                            "showDocuments": bool(doc_vis.get("showDocuments", False)),
                            "showSalaryRevision": bool(doc_vis.get("showSalaryRevision", False))}

    return {
        "paySchedule": {
            "payFrequency": _d(pc.salary_frequency if pc else "MONTHLY"),
            "workingDays": working_days,
            "payDay": _d(pc.default_pay_date if pc else 1),
            "firstPayPeriod": _dts(pc.first_pay_period) if pc and pc.first_pay_period else None,
            "upcoming": upcoming,
        },
        "statutory": {
            "epf": epf,
            "esi": esi,
            "professionalTax": pt_rows,
            "labourWelfareFund": lwf_rows,
            "statutoryBonus": bonus,
        },
        "salary": {
            "earnings": earnings,
            "deductions": deductions,
            "benefits": benefits,
            "reimbursements": reimbursements,
            "fullFinal": ffs,
        },
        "staffPortal": staff_portal,
    }


def _contractor_profile_sections(user):
    cp = getattr(user, "contractor_profile", None)
    g = lambda fld, note="": _f(fld, getattr(cp, fld, "") if cp else "", note)
    sections = {
        "basic": [
            _f("BSS ID", _contractor_identity(user).get("bssId", ""), "System-calculated"),
            _f("Contractor Type", getattr(cp, "entity_type", "") if cp else "", "Contractor"),
            _f("Legal Name", getattr(cp, "contractor_name", "") if cp else "", "Contractor"),
            _f("Trade / Brand Name", getattr(cp, "trade_name", "") if cp else "", "Contractor"),
            _f("Entity Constitution", getattr(cp, "constitution", "") if cp else "", "Contractor"),
            _f("Date of Incorporation", _dts(cp.incorporation_date) if cp and cp.incorporation_date else "", "Contractor", field_type="date"),
            _f("Authorised Person Name", getattr(cp, "contact_person", "") if cp else "", "Contractor"),
            _f("Mobile Number", getattr(cp, "mobile", "") if cp else "", "Auth identity — locked", sensitive=True),
            _f("Email ID", getattr(cp, "email", "") if cp else "", "Contractor"),
            _f("Age of Company", getattr(cp, "company_age", "") if cp else "", "System-calculated"),
            _f("Activity", getattr(cp, "activity", "") if cp else "", "Contractor"),
            _f("NIC Code", getattr(cp, "nic_code", "") if cp else "", "Contractor"),
            _f("Company Name", getattr(cp, "company_name", "") if cp else "", "Contractor"),
            _f("CIN", getattr(cp, "cin", "") if cp else "", "Contractor"),
            _f("ROC", getattr(cp, "roc", "") if cp else "", "Contractor"),
            _f("Registration Number", getattr(cp, "registration_number", "") if cp else "", "Contractor"),
            _f("Company Category", getattr(cp, "category_name", "") if cp else "", "Contractor"),
            _f("Company Sub Category", getattr(cp, "sub_category", "") if cp else "", "Contractor"),
            _f("Class of Company", getattr(cp, "entity_class", "") if cp else "", "Contractor"),
            _f("Listed on Stock Exchange", getattr(cp, "listed_on_stock_exchange", "") if cp else "", "Contractor"),
            _f("Company Status", getattr(cp, "company_status", "") if cp else "", "Contractor"),
            _f("Designation", getattr(cp, "auth_designation", "") if cp else "", "Contractor"),
            _f("NIC Description", getattr(cp, "nic_description", "") if cp else "", "Contractor"),
            _f("Number of Members", str(getattr(cp, "members_count", "") or "") if cp else "", "Contractor"),
            _f("Date of Last Annual General Meeting", _dts(cp.agm_date) if cp and cp.agm_date else "", "Contractor", field_type="date"),
            _f("Date of Last Filed Balance Sheet", _dts(cp.balance_sheet_date) if cp and cp.balance_sheet_date else "", "Contractor", field_type="date"),
            _f("Authorised Share Capital", str(getattr(cp, "authorized_capital", "") or "") if cp else "", "Contractor"),
            _f("Paid-up Share Capital", str(getattr(cp, "paid_up_capital", "") or "") if cp else "", "Contractor"),
        ],
        "registration": [
            _f("PAN", getattr(cp, "pan_no", "") if cp else "", "Contractor"),
            _f("GSTIN", getattr(cp, "gstin", "") if cp else "", "Contractor"),
            _f("Udyam Registration Number", getattr(cp, "udyam_no", "") if cp else "", "Contractor"),
            _f("Labour Department Registration Number", getattr(cp, "labour_dept_reg_no", "") if cp else "", "Contractor"),
            _f("Contract Labour Licence Number", getattr(cp, "clra_licence_no", "") if cp else "", "Contractor"),
            _f("BOCW / Other Labour Registration", getattr(cp, "bocw_reg_no", "") if cp else "", "Contractor"),
            _f("Licence Valid From", getattr(cp, "licence_valid_from", "") if cp else "", "Contractor/System", field_type="date"),
            _f("Licence Valid To", getattr(cp, "licence_valid_to", "") if cp else "", "Contractor/System", field_type="date"),
        ],
        "directors": [
            _f("Director Name", getattr(cp, "director_name", "") if cp else "", "Contractor"),
            _f("Director Designation", getattr(cp, "director_designation", "") if cp else "", "Contractor"),
            _f("Appointment Date", _dts(cp.director_appointment_date) if cp and cp.director_appointment_date else "", "Contractor", field_type="date"),
            _f("DIN", getattr(cp, "din", "") if cp else "", "Contractor"),
            _f("Cessation", getattr(cp, "director_cessation", "") if cp else "", "Contractor"),
            _f("Cessation Date", _dts(cp.director_cessation_date) if cp and cp.director_cessation_date else "", "Contractor", field_type="date"),
        ],
        "contact": [
            _f("Primary Contact Name", getattr(cp, "contact_person", "") if cp else "", "Contractor"),
            _f("Primary Contact Mobile", getattr(cp, "mobile", "") if cp else "", "Auth identity — locked", sensitive=True),
            _f("Primary Contact Email", getattr(cp, "email", "") if cp else "", "Contractor"),
            _f("Compliance Contact Name", getattr(cp, "compliance_contact_name", "") if cp else "", "Contractor"),
            _f("Compliance Contact Mobile", getattr(cp, "compliance_contact_mobile", "") if cp else "", "Contractor"),
            _f("Compliance Contact Email", getattr(cp, "compliance_contact_email", "") if cp else "", "Contractor"),
        ],
        "financial": [
            _f("Bank Name", getattr(cp, "bank_name", "") if cp else "", "Contractor"),
            _f("Bank Account Name", getattr(cp, "bank_account_name", "") if cp else "", "Contractor"),
            _f("Account Number", getattr(cp, "bank_account_number", "") if cp else "", "Contractor"),
            _f("IFSC Code", getattr(cp, "bank_ifsc", "") if cp else "", "Contractor"),
            _f("Annual Turnover Band", getattr(cp, "turnover_band", "") if cp else "", "Contractor"),
            _f("Payment Verification Status", "", "System"),
        ],
        "service": [
            _f("Registered Address", getattr(cp, "address", "") if cp else "", "Contractor"),
            _f("City", getattr(cp, "city", "") if cp else "", "Contractor"),
            _f("District", getattr(cp, "district", "") if cp else "", "Contractor"),
            _f("State / UT", getattr(cp, "state", "") if cp else "", "Contractor"),
            _f("PIN Code", getattr(cp, "pincode", "") if cp else "", "Contractor"),
            _f("Operating States", getattr(cp, "operating_states", "") if cp else "", "Contractor"),
        ],
        "documents": [
            _f("PAN Document", getattr(cp, "pan_no", "") if cp else "", "Contractor"),
            _f("GST Certificate", getattr(cp, "gstin", "") if cp else "", "Contractor"),
            _f("Contract Labour Licence", getattr(cp, "clra_licence_no", "") if cp else "", "Contractor"),
            _f("PF Registration Certificate", getattr(cp, "pf_reg_cert", "") if cp else "", "Contractor"),
            _f("ESIC Registration Proof", getattr(cp, "esic_reg_proof", "") if cp else "", "Contractor"),
            _f("Insurance / Workmen Compensation Proof", getattr(cp, "insurance_proof", "") if cp else "", "Contractor"),
            _f("Bank Proof / Cancelled Cheque", getattr(cp, "bank_proof", "") if cp else "", "Contractor"),
            _f("Other Certificates", getattr(cp, "other_certs", "") if cp else "", "Contractor"),
        ],
        "undertaking": [
            _f("Onboarding Method", getattr(cp, "onboarding_method", "") if cp else "", "Contractor"),
            _f("Attendance Method", getattr(cp, "attendance_method", "") if cp else "", "Contractor"),
            _f("Payroll Method", getattr(cp, "payroll_method", "") if cp else "", "Contractor"),
        ],
    }
    verified = str(getattr(cp, "gst_verification_status", "") or "").upper() == "VERIFIED"
    return lock_gst_fields(sections, "contractor", verified)


def build_contractor_portal(user):
    sites = _contractor_sites(user)
    allowed_site_ids = {str(s["id"]) for s in sites}
    default_site = _default_site_info(getattr(user, "contractor_profile", None))
    if default_site is None or default_site["id"] not in allowed_site_ids:
        # The first allotted site is always the implicit default when none was chosen.
        default_site = ({"id": str(sites[0]["id"]), "name": sites[0]["name"], "code": sites[0]["code"]}
                        if sites else None)
    return {
        "identity": _contractor_identity(user),
        "stats": _contractor_stats(user),
        "principalEmployer": _contractor_principal_employer(user),
        "sites": sites,
        "pendingSites": _contractor_pending_sites(user),
        "defaultSite": default_site,
        "workers": _contractor_workers(user),
        "compliances": _contractor_compliances(user),
        "gatePasses": _contractor_gate_passes(user),
        "advances": _contractor_advances(user),
        "applications": _contractor_applications(user),
        "availableWorkers": _contractor_available_workers(user),
        "employers": _contractor_employers(user),
        "submissions": _contractor_submissions(user),
        "submissionDocuments": _submission_document_master(),
        "workerBenefits": _contractor_worker_benefits(user),
        "salaries": _contractor_salaries(user),
        "profileSections": _contractor_profile_sections(user),
        "licenses": _contractor_licenses(user),
        "workerDocuments": _contractor_worker_documents(user),
        "workerCompliance": _contractor_worker_compliance(user),
        "workforceGrowth": _contractor_workforce_growth(user),
        "applicability": _contractor_applicability(user),
        "complianceHistory": _contractor_compliance_history(user),
        "jobHistory": _contractor_job_history(user),
        "leaveApprovals": _contractor_leave_approvals(user),
        "restrictedHolidayRequests": _contractor_restricted_holiday_requests(user),
        "siteCalendars": _contractor_site_calendars(user),
        "leaveTypeCatalog": [lt.name for lt in LeaveType.objects.filter(is_active=True)],
        "bindingRequests": _contractor_binding_requests(user),
        "registers": _contractor_registers(user),
        "complianceBatches": _contractor_compliance_batches(user),
        "complianceStateSummary": _contractor_compliance_state_summary(user),
        "auditReports": _contractor_audit_reports(user),
        "recentActivities": _contractor_recent_activities(user),
        "grievances": _contractor_grievances(user),
        "payroll": {
            "config": _contractor_payroll_config(user),
            "records": _payroll_records(contractor=user),
            "templateColumns": ["id", "workerId", "workerName", "employer", "site", "contractor",
                                "period", "status", "gross", "netPay"],
        },
        "accessibility": _accessibility_prefs(user),
        "settings": _portal_settings(user),
    }


__all__ = [
    "_contractor_advances",
    "_contractor_applicability",
    "_contractor_applications",
    "_contractor_audit_report_row",
    "_contractor_audit_reports",
    "_contractor_available_workers",
    "_contractor_binding_requests",
    "_contractor_bindings",
    "_contractor_compliance_batch_row",
    "_contractor_compliance_batches",
    "_contractor_compliance_history",
    "_contractor_compliance_row",
    "_contractor_compliances",
    "_contractor_employers",
    "_contractor_gate_pass_row",
    "_contractor_gate_passes",
    "_contractor_grievances",
    "_contractor_identity",
    "_contractor_job_history",
    "_contractor_leave_approvals",
    "_contractor_licenses",
    "_contractor_payroll_config",
    "_contractor_pending_sites",
    "_contractor_principal_employer",
    "_contractor_profile_sections",
    "_contractor_recent_activities",
    "_contractor_registers",
    "_contractor_restricted_holiday_requests",
    "_contractor_salaries",
    "_salary_row",
    "_contractor_site_calendars",
    "_contractor_sites",
    "_contractor_stats",
    "_contractor_submissions",
    "_contractor_worker_benefits",
    "_contractor_worker_compliance",
    "_contractor_worker_documents",
    "_contractor_workers",
    "_contractor_workforce_growth",
    "build_contractor_portal",
]
