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

    # UAN / ESIC are the two document fields the contractor records on the
    # worker's behalf (Aadhaar, PAN and the bank account are auto-verified).
    if body.get("uan") is not None or body.get("esic") is not None:
        social, _ = WorkerSocialSecurity.objects.get_or_create(user=worker)
        if body.get("uan") is not None:
            social.epfo_uan = str(body.get("uan") or "")[:40]
        if body.get("esic") is not None:
            social.esic_ip_number = str(body.get("esic") or "")[:40]
        social.save()

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
    ws.save()
    return payloads._contractor_compliance_row(binding)


__all__ = [
    "_handle_advance_contractor",
    "_handle_advance_worker",
    "_handle_benefits",
    "_handle_gratuity_apply",
    "_handle_worker_compliance",
]
