"""Worker benefits, gratuity and salary-advance mutation handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _handle_benefits(user, body):
    """Contractor uploads Bonus / Leave Encashment records for bound workers."""
    from bss_core.models import WorkerBenefitRecord, WorkerContractorBinding, WorkerIdentity

    kind = str(body.get("kind") or "BONUS").strip().upper().replace("-", "_")
    kind = {"LEAVEENCASHMENT": "LEAVE_ENCASHMENT", "LEAVE_ENCASHMENT": "LEAVE_ENCASHMENT",
            "BONUS": "BONUS", "PF": "PF"}.get(kind, "BONUS")
    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        bss_id = str(row.get("workerId") or "").strip().upper()
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
        if identity is None:
            raise PortalMutationError("Worker not found for that BSS ID.", 404)
        worker = identity.user
        binding = (WorkerContractorBinding.objects
                   .filter(worker=worker, contractor=user, binding_status="ACCEPTED")
                   .select_related("site").first())
        if binding is None:
            raise PortalMutationError("This worker is not bound to you.", 403)
        try:
            amount = float(row.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0:
            raise PortalMutationError("Enter a valid benefit amount.", 400)
        rec = WorkerBenefitRecord.objects.create(
            worker=worker, contractor=user, site=binding.site, kind=kind,
            period=str(row.get("period") or "")[:40], amount=amount,
            days=row.get("days") or None, rate=row.get("rate") or None,
            reason=str(row.get("reason") or "")[:120], status="RECORDED",
            paid_on=_parse_iso_date(row.get("paidOn")), created_by=user)
        created.append(rec)
    return [payloads._benefit_row(r) for r in created]


def _handle_gratuity_apply(user, body):
    """Worker applies for gratuity; routed to the bound contractor/employer."""
    from bss_core.models import GratuityApplication, WorkerContractorBinding

    binding = (WorkerContractorBinding.objects
               .filter(worker=user, binding_status="ACCEPTED")
               .select_related("site", "site__employer", "contractor").first())
    if binding is None:
        raise PortalMutationError("Gratuity is available once you are bound to a contractor and site.", 403)
    existing = GratuityApplication.objects.filter(worker=user).exclude(status__in=("REJECTED", "DISBURSED")).first()
    if existing:
        return payloads._worker_gratuity(user)
    application = GratuityApplication.objects.create(
        worker=user, contractor=binding.contractor, site=binding.site,
        reference=f"GRT-{uuid.uuid4().hex[:8].upper()}",
        reason=str(body.get("reason") or "")[:500], status="SUBMITTED")
    return {
        "reference": application.reference,
        "submittedOn": payloads._dts(application.submitted_on),
        "status": "Submitted",
        "gratuity": payloads._worker_gratuity(user),
    }


def _handle_advance_worker(user, body):
    """Worker requests a salary advance, or accepts a disbursement."""
    from bss_core.models import SalaryAdvance, WorkerContractorBinding

    action = str(body.get("action") or "").strip().lower().replace("_", "-")
    if action in ("request", "apply"):
        try:
            amount = float(body.get("amount") or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount <= 0:
            raise PortalMutationError("Enter a valid advance amount.", 400)
        binding = (WorkerContractorBinding.objects
                   .filter(worker=user, binding_status="ACCEPTED")
                   .select_related("site", "contractor").first())
        advance = SalaryAdvance.objects.create(
            worker=user, contractor=binding.contractor if binding else None,
            site=binding.site if binding else None, amount=amount,
            reason=str(body.get("reason") or "")[:255], status="REQUESTED")
        return payloads._advance_row(advance)
    if action in ("accept", "confirm"):
        advance = SalaryAdvance.objects.filter(pk=body.get("id"), worker=user).first()
        if advance is None:
            raise PortalMutationError("Advance not found.", 404)
        advance.status = "ACCEPTED"
        advance.accepted_at = timezone.now()
        advance.save(update_fields=["status", "accepted_at", "updated_at"])
        return payloads._advance_row(advance)
    raise PortalMutationError("Unknown advance action.", 400)


def _handle_advance_contractor(user, body):
    """Contractor approves / rejects / disburses / adjusts an advance request."""
    from bss_core.models import SalaryAdvance

    advance = SalaryAdvance.objects.filter(pk=body.get("id"), contractor=user).first()
    if advance is None:
        raise PortalMutationError("Advance request not found for your account.", 404)
    action = str(body.get("action") or "").strip().lower().replace("_", "-")
    if action in ("approve", "approved"):
        advance.status = "APPROVED"
        advance.approved_at = timezone.now()
        advance.approved_by = user
    elif action in ("reject", "rejected"):
        advance.status = "REJECTED"
        advance.approved_at = timezone.now()
        advance.approved_by = user
    elif action in ("disburse", "disbursed"):
        advance.status = "DISBURSED"
        advance.disbursed_at = timezone.now()
        advance.mode = "CASH" if str(body.get("mode") or "ONLINE").upper() == "CASH" else "ONLINE"
        advance.reference = str(body.get("reference") or "")[:80]
    elif action in ("adjust", "adjusted"):
        advance.status = "ADJUSTED"
        advance.adjusted_at = timezone.now()
        advance.payroll_period = str(body.get("payrollPeriod") or "")[:40]
    else:
        raise PortalMutationError("Unknown advance action.", 400)
    advance.save()
    return payloads._advance_row(advance)


def _handle_worker_compliance(user, body):
    """Contractor records a bound worker's compliance / welfare details
    (Medical, Safety Kit/PPE, Safety Training, Site Induction, Insurance,
    Accommodation, Police Verification)."""
    from bss_core.models import (WorkerContractorBinding, WorkerIdentity,
                                 WorkerSocialSecurity, WorkerWelfareSafety)

    bss_id = str(body.get("workerId") or "").strip().upper()
    identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if identity is None:
        raise PortalMutationError("Worker not found for that BSS ID.", 404)
    worker = identity.user
    binding = (WorkerContractorBinding.objects
               .filter(worker=worker, contractor=user, binding_status="ACCEPTED")
               .select_related("site").first())
    if binding is None:
        raise PortalMutationError("This worker is not bound to you.", 403)

    # UAN / ESIC are not editable by the contractor — they come from the worker's
    # own records (worker profile / submissions). The contractor approves each
    # document individually with uanVerified / esicVerified.
    if body.get("uanVerified") is not None or body.get("esicVerified") is not None:
        social, _ = WorkerSocialSecurity.objects.get_or_create(user=worker)
        if body.get("uanVerified") is not None:
            social.uan_verified = bool(body.get("uanVerified"))
        if body.get("esicVerified") is not None:
            social.esic_verified = bool(body.get("esicVerified"))
        social.save(update_fields=["uan_verified", "esic_verified", "updated_at"])

    ws, _ = WorkerWelfareSafety.objects.get_or_create(user=worker)
    text_fields = {
        "medicalExaminationStatus": ("medical_examination_status", 40),
        "medicalFitnessStatus": ("medical_fitness_status", 40),
        "typesOfPpeGiven": ("types_of_ppe_given", 120),
        "siteInductionStatus": ("site_induction_status", 40),
        "insuranceStatus": ("insurance_status", 40),
        "accommodationProvided": ("accomodation_provided", 120),
        "policeVerification": ("police_verification", 80),
        "trainerName": ("trainer_name", 120),
    }
    for key, (attr, length) in text_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, str(body.get(key) or "")[:length])
    bool_fields = {"ppeRequired": "ppe_required", "safetyTrainingCompleted": "safety_training_completed"}
    for key, attr in bool_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, bool(body.get(key)))
    date_fields = {"lastMedicalExamination": "last_medical_examination",
                   "nextMedicalDue": "next_medical_due", "trainingDate": "training_date"}
    for key, attr in date_fields.items():
        if body.get(key) is not None:
            setattr(ws, attr, _parse_iso_date(body.get(key)))
    # The contractor ticks "Verified" once the UAN/ESIC/PPE/Health/Welfare details
    # they recorded are confirmed.
    if body.get("contractorVerified") is not None:
        verified = bool(body.get("contractorVerified"))
        ws.contractor_verified = verified
        ws.contractor_verified_at = timezone.now() if verified else None
    ws.save()
    return payloads._contractor_compliance_row(binding)


def _handle_worker_site(user, body):
    """The contractor moves one of their bound workers to another of their sites.

    Only the contractor holds this power, and only to a site they are engaged at
    (allotted + approved by the employer). The worker↔contractor pair is kept; the
    binding's site — and everything derived from it — changes."""
    from bss_core.models import Site, WorkerContractorBinding
    from .bindings import _contractor_engaged_at_site, _sync_employment_from_binding

    binding = (WorkerContractorBinding.objects
               .filter(pk=body.get("bindingId") or body.get("id"), contractor=user)
               .select_related("worker", "site").first())
    if binding is None:
        raise PortalMutationError("Worker binding not found.", 404)
    if binding.binding_status not in ("PENDING", "ACCEPTED"):
        raise PortalMutationError("Only an active binding can be moved to another site.", 409)
    site = Site.objects.filter(pk=body.get("siteId")).first()
    if site is None:
        raise PortalMutationError("Select a valid site.", 400)
    if not _contractor_engaged_at_site(user, site.id):
        raise PortalMutationError(
            "You are not engaged at this site. Ask the employer to allot this site to you first.", 403)
    if binding.site_id != site.id:
        clash = (WorkerContractorBinding.objects
                 .filter(worker=binding.worker, contractor=user, site=site,
                         binding_status__in=("PENDING", "ACCEPTED"))
                 .exclude(pk=binding.pk).exists())
        if clash:
            raise PortalMutationError("This worker already has a binding with you at that site.", 409)
        binding.site = site
        binding.save(update_fields=["site", "updated_at"])
        _sync_employment_from_binding(binding)
    return {"bindingId": binding.id, "siteId": str(binding.site_id or "")}


def _period_range(period):
    """'August 2026' → (first day, last day) of that month."""
    text = str(period or "").strip()
    start = None
    for fmt in ("%B %Y", "%b %Y", "%Y-%m"):
        try:
            start = datetime.strptime(text, fmt).date().replace(day=1)
            break
        except ValueError:
            continue
    if start is None:
        start = timezone.localdate().replace(day=1)
    nxt = (start.replace(year=start.year + 1, month=1) if start.month == 12
           else start.replace(month=start.month + 1))
    return start, nxt - timedelta(days=1)


def _handle_salaries(user, body):
    """Contractor/employer records a bound worker's salary/wage for a period."""
    from bss_core.models import WorkerContractorBinding, WorkerIdentity, WorkerWages

    rows_in = body.get("bulk") if isinstance(body.get("bulk"), list) else [body]
    created = []
    for row in rows_in:
        row = row if isinstance(row, dict) else {}
        bss_id = str(row.get("workerId") or "").strip().upper()
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first() if bss_id else None
        if identity is None:
            raise PortalMutationError(f"No worker found with BSS ID {bss_id}.", 404)
        bindings = WorkerContractorBinding.objects.filter(
            worker=identity.user, binding_status="ACCEPTED").select_related("site", "contractor")
        bindings = (bindings.filter(contractor=user) if user.role == "contractor"
                    else bindings.filter(site__employer=user))
        binding = bindings.first()
        if binding is None:
            raise PortalMutationError("This worker is not bound to you.", 403)
        start, end = _period_range(row.get("period"))
        gross = payloads._num(row.get("gross")) or 0
        deductions = payloads._num(row.get("deductions")) or 0
        existing = WorkerWages.objects.filter(
            worker=identity.user, period_start=start, period_end=end).first()
        if existing is not None:
            if existing.status != "DRAFT":
                raise PortalMutationError(
                    "A verified wage record already exists for this worker and period.", 409)
            existing.contractor = binding.contractor
            existing.site = binding.site
            existing.gross_wage = gross
            existing.deductions_amount = deductions
            existing.net_wage = max(0, gross - deductions)
            existing.save()
            created.append(existing)
        else:
            created.append(WorkerWages.objects.create(
                worker=identity.user, contractor=binding.contractor, site=binding.site,
                period_start=start, period_end=end, wage_frequency="MONTHLY",
                gross_wage=gross, deductions_amount=deductions,
                net_wage=max(0, gross - deductions), status="DRAFT"))
    return [payloads._salary_row(w) for w in created]


def _handle_worker_cost_sheet(user, body):
    """The contractor changes the cost sheet template on a worker's binding and
    the system recalculates wage / statutory / custom cost / CTC."""
    from bss_core.models import WorkerContractorBinding
    from .bindings import _apply_binding_terms

    binding = (WorkerContractorBinding.objects
               .filter(pk=body.get("bindingId") or body.get("id"), contractor=user)
               .select_related("worker", "site", "contractor").first())
    if binding is None:
        raise PortalMutationError("Worker binding not found.", 404)
    if binding.binding_status not in ("PENDING", "ACCEPTED"):
        raise PortalMutationError("Only an active binding can be updated.", 409)
    sheet_id = body.get("costSheetId")
    if sheet_id in (None, ""):
        raise PortalMutationError("Select a cost sheet template.", 400)
    _apply_binding_terms(binding, {"costSheetId": sheet_id})
    binding.save()
    return {"bindingId": binding.id, "costSheetId": binding.cost_sheet_id,
            "ctc": payloads._num(binding.computed_ctc),
            "breakdown": binding.cost_breakdown or {}}


__all__ = [
    "_handle_advance_contractor",
    "_handle_advance_worker",
    "_handle_benefits",
    "_handle_gratuity_apply",
    "_handle_salaries",
    "_handle_worker_compliance",
    "_handle_worker_cost_sheet",
    "_handle_worker_site",
]
