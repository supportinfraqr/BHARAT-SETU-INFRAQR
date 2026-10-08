"""Worker/contractor/employer binding lifecycle, QR scans and site allotment."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .aadhaar import *  # noqa: F401,F403


def _contractor_site_ids(user):
    """Sites a contractor may use: only sites APPROVED on an ACCEPTED
    contractor↔employer binding. Sites belong to the employer and are merely
    allotted to the contractor — a contractor never owns a site. Sites from
    pending/rejected/cancelled employer bindings are not included."""
    return set(ContractorSiteAllotment.objects.filter(
        binding__contractor=user, binding__binding_status="ACCEPTED", status="APPROVED")
        .values_list("site_id", flat=True))


def _contractor_default_site(contractor):
    """The contractor's default site: their explicit default while it is still
    allotted, otherwise the first allotted site (the first site is always the
    default when none was chosen), or None when they have no site."""
    allowed = _contractor_site_ids(contractor)
    if not allowed:
        return None
    cp = getattr(contractor, "contractor_profile", None)
    if cp and cp.default_site_id and cp.default_site_id in allowed:
        return cp.default_site
    return Site.objects.filter(id__in=allowed).order_by("id").first()


def _release_contractor_workers(binding):
    """When a contractor↔employer binding ends, release that contractor's worker
    bindings at the employer's sites — a contractor cannot keep workers at a site
    they are no longer allotted. Each released worker also gets a releasing
    letter (the E-S-C-W pair for their engagement ends)."""
    released = list(WorkerContractorBinding.objects.filter(
        contractor=binding.contractor, site__employer=binding.employer
    ).exclude(binding_status__in=payloads.TERMINAL_BINDING_STATUSES))
    if not released:
        return
    WorkerContractorBinding.objects.filter(pk__in=[b.id for b in released]).update(
        binding_status="CANCELLED", unbound_at=timezone.now())
    for released_binding in released:
        _issue_binding_letter(released_binding, "experience")


def _workers_at_risk(contractor, site_ids):
    """Active worker bindings of `contractor` at the given sites — these would be
    orphaned if the contractor's access ends."""
    if contractor is None or not site_ids:
        return []
    return list(WorkerContractorBinding.objects.filter(
        contractor=contractor, site_id__in=list(site_ids)
    ).exclude(binding_status__in=payloads.TERMINAL_BINDING_STATUSES)
        .select_related("worker", "site", "site__employer"))


def _ensure_ce_binding(employer, contractor):
    """Return an ACCEPTED ContractorEmployerBinding for (employer, contractor),
    creating one when the employer explicitly selects a contractor who is not yet
    bound to them — the successor may be any contractor in the system, not only
    the employer's existing secondaries."""
    if contractor is None or contractor.role != "contractor":
        return None
    ce = (ContractorEmployerBinding.objects
          .filter(employer=employer, contractor=contractor, binding_status="ACCEPTED")
          .first())
    if ce is None:
        ce = ContractorEmployerBinding.objects.create(
            employer=employer, contractor=contractor, binding_status="ACCEPTED",
            consent_employer=True, consent_contractor=True, consent_method="app",
            source="employer_qr")
    return ce


def _resolve_successor(employer, leaving_binding, successor_binding_id=None,
                       successor_contractor_id=None):
    """The successor CE binding for a leaving binding. Priority: an explicitly
    selected contractor (by contractor id — any contractor in the system — or by
    CE binding id), else the employer's persisted unbind successor, else the
    first ACCEPTED designated secondary. Returns a ContractorEmployerBinding or
    None."""
    candidates = (ContractorEmployerBinding.objects
                  .filter(employer=employer, binding_status="ACCEPTED")
                  .exclude(pk=leaving_binding.pk).select_related("contractor"))

    def _int(value):
        try:
            return int(value) if value not in (None, "") else None
        except (TypeError, ValueError):
            return None

    contractor_id = _int(successor_contractor_id)
    if contractor_id:
        chosen = candidates.filter(contractor_id=contractor_id).first()
        if chosen is not None:
            return chosen
        successor_user = User.objects.filter(pk=contractor_id, role="contractor").first()
        if successor_user is not None:
            return _ensure_ce_binding(employer, successor_user)

    requested = _int(successor_binding_id)
    if not requested and leaving_binding.unbind_successor_id:
        requested = leaving_binding.unbind_successor_id
    if requested:
        chosen = candidates.filter(pk=requested).first()
        if chosen is not None:
            return chosen
    ids = [int(x) for x in (leaving_binding.secondary_binding_ids or []) if str(x).isdigit()]
    if ids:
        return candidates.filter(pk__in=ids).order_by("id").first()
    return None


def _shift_workers_to_successor(old_contractor, successor, site_ids, employer=None):
    """Move `old_contractor`'s workers at `site_ids` to `successor` so they are
    never orphaned: each worker gets a new ACCEPTED binding at the same site and
    the site is auto-allotted (APPROVED) to the successor. The leaving
    contractor's approved site permissions for those sites move to the successor
    too. Every moved worker gets a Releasing Letter (old engagement) and an
    Appointment Letter (new engagement). Workers who already hold a different
    live binding are skipped. Returns (moved, skipped) user lists."""
    from bss_core.models import ContractorSiteAllotment, WorkerContractorBinding

    moved, skipped, moved_sites = [], [], []
    if successor is None or successor.role != "contractor":
        return moved, skipped
    if employer is None and site_ids:
        seed_site = Site.objects.filter(id__in=list(site_ids)).select_related("employer").first()
        employer = seed_site.employer if seed_site else None
    for wb in _workers_at_risk(old_contractor, site_ids):
        site = wb.site
        if site is None:
            continue
        # A worker who already has another live binding is left alone.
        other = (WorkerContractorBinding.objects
                 .filter(worker=wb.worker, binding_status__in=("PENDING", "ACCEPTED"))
                 .exclude(pk=wb.pk).exclude(contractor=successor, site=site).exists())
        if other:
            skipped.append(wb.worker)
            continue
        # The successor must be ACCEPTED-bound to the site's employer; auto-allot it.
        ce = (ContractorEmployerBinding.objects
              .filter(contractor=successor, employer=site.employer, binding_status="ACCEPTED").first())
        if ce is None:
            skipped.append(wb.worker)
            continue
        ContractorSiteAllotment.objects.update_or_create(
            binding=ce, site=site,
            defaults={"status": "APPROVED", "source": "successor_shift",
                      "release_requested_at": None, "release_requested_by": ""})
        # Cancel the old binding, create the new ACCEPTED one (seamless shift).
        wb.binding_status = "CANCELLED"
        wb.unbound_at = timezone.now()
        wb.save(update_fields=["binding_status", "unbound_at", "updated_at"])
        new_binding = WorkerContractorBinding.objects.create(
            worker=wb.worker, contractor=successor, site=site,
            binding_status="ACCEPTED", consent_worker=True, consent_contractor=True,
            consent_method="app", accepted_at=timezone.now(), initiated_by="contractor",
            designation=wb.designation, department=wb.department, shift=wb.shift,
            offered_wage=wb.offered_wage,
        )
        _sync_employment_from_binding(new_binding)
        # The E-S-C-W pair changed: store the releasing letter for the old
        # engagement and the appointment letter for the new one, for the worker.
        _issue_binding_letter(wb, "experience")
        _issue_binding_letter(new_binding, "appointment")
        moved.append(wb.worker)
        _create_notification(
            user=wb.worker,
            title="You were moved to a new contractor",
            body=(f"Your contractor changed — you are now engaged by "
                  f"{payloads._notification_actor_name(successor)} at {payloads._d(site.site_name)}."),
            notif_type="INFO", link="/worker/binding")
    # Move the leaving contractor's approved site permissions for these sites so
    # the successor inherits the same site access.
    if employer is not None and site_ids:
        successor_ce = (ContractorEmployerBinding.objects
                        .filter(contractor=successor, employer=employer,
                                binding_status="ACCEPTED").first())
        if successor_ce is not None:
            for old_allot in (ContractorSiteAllotment.objects
                              .filter(binding__contractor=old_contractor,
                                      binding__employer=employer,
                                      site_id__in=list(site_ids), status="APPROVED")
                              .select_related("site")):
                ContractorSiteAllotment.objects.update_or_create(
                    binding=successor_ce, site=old_allot.site,
                    defaults={"status": "APPROVED", "source": "successor_shift",
                              "release_requested_at": None, "release_requested_by": ""})
                if old_allot.site and old_allot.site.site_name not in moved_sites:
                    moved_sites.append(old_allot.site.site_name)
    if moved or moved_sites:
        if moved and moved_sites:
            body = (f"{len(moved)} worker(s) and {len(moved_sites)} site(s) were "
                    f"transferred to you by the principal employer.")
        elif moved:
            body = f"{len(moved)} worker(s) were transferred to you by the principal employer."
        else:
            body = f"{len(moved_sites)} site(s) were transferred to you by the principal employer."
        _create_notification(
            user=successor,
            title="Sites transferred to you",
            body=body,
            notif_type="INFO", link="/contractor/workers")
    return moved, skipped


def _binding_enabled(user):
    p = UserPreference.objects.filter(user=user).first()
    return bool(p.binding_enabled) if p else True


def _active_worker_binding(worker, contractor, site):
    """The single live binding (PENDING/ACCEPTED) for a
    worker<->contractor<->site tuple, or None when prior rows are all terminal
    (rejected/cancelled/expired)."""
    from bss_core.models import WorkerContractorBinding
    return (WorkerContractorBinding.objects
            .filter(worker=worker, contractor=contractor, site=site,
                    binding_status__in=("PENDING", "ACCEPTED"))
            .order_by("-created_at").first())


def _request_worker_binding(worker, contractor, site, **defaults):
    """Reuse the live binding for the tuple, or create a fresh PENDING row when
    the previous request was declined/cancelled/expired. This keeps the declined
    request as history instead of overwriting it."""
    from bss_core.models import WorkerContractorBinding
    # A worker binding must always connect a worker and a contractor — never two
    # accounts of the same role, and never an account to itself.
    if (worker is None or contractor is None
            or worker.role != "worker" or contractor.role != "contractor"
            or worker.id == contractor.id):
        raise PortalMutationError("A binding must connect a worker and a contractor.", 400)
    binding = _active_worker_binding(worker, contractor, site)
    if binding is None:
        # A worker may hold only one live binding. Any other live binding must be
        # unbound before the worker can be bound to a different site.
        other = (WorkerContractorBinding.objects
                 .filter(worker=worker, binding_status__in=("PENDING", "ACCEPTED"))
                 .exclude(contractor=contractor, site=site)
                 .first())
        if other is not None:
            raise PortalMutationError(
                "This worker already has an active binding at another site. Unbind it before binding to a different site.", 409)
        binding = WorkerContractorBinding.objects.create(
            worker=worker, contractor=contractor, site=site,
            binding_status="PENDING", **defaults)
    return binding


def _worker_requests_contractor(worker_user, contractor_user):
    """Worker-initiated worker<->contractor binding. The worker never picks a
    site — the request always targets the contractor's default (or first) site.
    Blocked entirely when the contractor has no site allotted."""
    if not _binding_enabled(worker_user) or not _binding_enabled(contractor_user):
        return Response({"error": "Binding is disabled in one party's settings."},
                        status=status.HTTP_403_FORBIDDEN)
    site = _contractor_default_site(contractor_user)
    if site is None:
        return Response({
            "error": "This contractor has no site allotted yet, so a binding cannot be "
                     "requested. Ask the contractor to get a site allotted first."},
            status=status.HTTP_400_BAD_REQUEST)
    existing = (WorkerContractorBinding.objects
                .filter(worker=worker_user, binding_status__in=("PENDING", "ACCEPTED"))
                .select_related("site", "contractor").order_by("-created_at").first())
    if existing is not None and not (existing.contractor_id == contractor_user.id
                                     and existing.site_id == site.id):
        cp_existing = getattr(existing.contractor, "contractor_profile", None)
        cname = ""
        if cp_existing:
            cname = (cp_existing.contractor_name or cp_existing.trade_name or "").strip()
        cname = cname or existing.contractor.username
        site_name = (existing.site.site_name if existing.site else "") or "a site"
        state = "already bound" if existing.binding_status == "ACCEPTED" else "has a pending binding request"
        return Response({
            "error": (f"You are {state} with {cname} at {site_name}. "
                      "Unbind the current binding before requesting another.")},
            status=status.HTTP_409_CONFLICT)
    binding = _request_worker_binding(worker_user, contractor_user, site, initiated_by="worker")
    binding.binding_status = "PENDING"
    binding.consent_worker = True
    binding.consent_contractor = False
    binding.consent_method = "app"
    binding.save()
    _create_notification(
        user=contractor_user,
        title="Worker binding request",
        body=f"{payloads._notification_actor_name(worker_user)} requested to bind to you at "
             f"{payloads._d(site.site_name) or 'your site'}. Approve to complete the binding.",
        notif_type="APPROVAL",
        link="/contractor/qr/requests",
    )
    return Response({"data": payloads._binding_row(binding)}, status=status.HTTP_201_CREATED)


def _contractor_binds_worker(contractor_user, worker_user, site=None):
    """Contractor-initiated worker<->contractor binding.

    Shared by the worker-QR scan (BSS_WORKER) and the Rozgar 'Hire & bind'
    action, so both routes create the same PENDING request, consent state and
    notification — and land on the worker's and contractor's binding-request
    pages. Enforces the one-live-binding-per-worker rule and raises
    PortalMutationError with a clear message on any rejection."""
    from bss_core.models import WorkerContractorBinding

    if worker_user is None or worker_user.role != "worker":
        raise PortalMutationError("The selected worker credential is not valid.", 400)
    if worker_user.id == contractor_user.id:
        raise PortalMutationError("You cannot bind your own account.", 400)

    # Resolve the site: the explicitly requested one (restricted to sites the
    # contractor can legitimately use), else the contractor's default site, else
    # any bound or approved-allotted site.
    allowed_ids = _contractor_site_ids(contractor_user)
    if site is not None and site.id not in allowed_ids:
        site = None
    cp = getattr(contractor_user, "contractor_profile", None)
    if site is None and cp and cp.default_site_id and cp.default_site_id in allowed_ids:
        site = cp.default_site
    if site is None:
        site = Site.objects.filter(id__in=allowed_ids).first()
    if site is None:
        raise PortalMutationError(
            "No site available for this binding. Ask the employer to allot a site first.", 400)

    if not _binding_enabled(worker_user) or not _binding_enabled(contractor_user):
        raise PortalMutationError("Binding is disabled in one party's settings.", 403)

    # One live binding per worker. A worker is always bound to a single site; to
    # move them to a different site the current binding must be unbound first.
    existing = (WorkerContractorBinding.objects
                .filter(worker=worker_user, binding_status__in=("PENDING", "ACCEPTED"))
                .select_related("site", "contractor")
                .order_by("-created_at").first())
    if existing is not None and not (existing.contractor_id == contractor_user.id
                                     and existing.site_id == site.id):
        cp_existing = getattr(existing.contractor, "contractor_profile", None)
        cname = ""
        if cp_existing:
            cname = (cp_existing.contractor_name or cp_existing.trade_name or "").strip()
        cname = cname or existing.contractor.username
        site_name = (existing.site.site_name if existing.site else "") or "a site"
        state = "already bound" if existing.binding_status == "ACCEPTED" else "has a pending binding request"
        raise PortalMutationError(
            f"This worker is {state} with {cname} at {site_name}. "
            "Unbind the current binding before binding the worker to a different site.", 409)

    binding = _request_worker_binding(worker_user, contractor_user, site, initiated_by="contractor")
    if binding.binding_status == "ACCEPTED":
        # Already bound to this contractor at this site — nothing to request.
        return binding
    binding.consent_contractor = True
    binding.consent_method = "app"
    # If the worker already consented (they applied / scanned the QR first), the
    # contractor hiring completes the two-sided consent straight away.
    if str(binding.initiated_by or "").lower() == "worker":
        binding.consent_worker = True
    if binding.consent_worker and binding.consent_contractor:
        binding.binding_status = "ACCEPTED"
        binding.accepted_at = timezone.now()
        binding.save()
        _sync_employment_from_binding(binding)
        _issue_binding_letter(binding, "appointment")
        _create_notification(
            user=binding.worker,
            title="Binding approved",
            body=f"Your binding with {payloads._notification_actor_name(contractor_user)} is active.",
            notif_type="APPROVAL",
            link="/worker/binding",
        )
        _create_notification(
            user=contractor_user,
            title="Worker bound successfully",
            body=f"Worker {payloads._notification_actor_name(worker_user)} accepted binding request.",
            notif_type="APPROVAL",
            link="/contractor/qr/requests",
        )
        return binding
    binding.binding_status = "PENDING"
    binding.save()
    _create_notification(
        user=worker_user,
        title="Binding request",
        body=f"{payloads._notification_actor_name(contractor_user)} wants to bind you at "
             f"{payloads._d(site.site_name) or 'their site'}. Approve to complete the binding.",
        notif_type="APPROVAL",
        link="/worker/binding",
    )
    return binding


def _apply_binding_terms(binding, data):
    """Capture the offered terms at bind time. A cost sheet template, when
    selected, computes the wage/statutory/custom cost and CTC automatically —
    replacing manual wage entry."""
    from decimal import Decimal, InvalidOperation
    from api import costsheet

    for field in ("designation", "department", "shift"):
        value = data.get(field)
        if value not in (None, ""):
            setattr(binding, field, str(value).strip()[:80])

    sheet_id = data.get("costSheetId", data.get("cost_sheet_id"))
    if sheet_id not in (None, ""):
        from bss_core.models import CostSheetTemplate
        sheet = CostSheetTemplate.objects.filter(pk=sheet_id, status="PUBLISHED").first()
        if sheet is None:
            raise PortalMutationError(
                "That cost sheet is not available — it must be adopted for the site and "
                "accepted by the employer before it can be used.", 409)
        # Only the contractor's own employer-accepted sheet for this site is usable.
        if sheet.owner_id != binding.contractor_id:
            raise PortalMutationError(
                "Adopt this template for the site and get the employer's acceptance before binding.", 409)
        if sheet.site_id and sheet.site_id != binding.site_id:
            raise PortalMutationError("This cost sheet is for a different site.", 409)
        # Applicability validation — state must match the site when both are set.
        site_state = str(getattr(binding.site, "state", "") or "").strip()
        if sheet.state and site_state and sheet.state.lower() != site_state.lower():
            raise PortalMutationError(
                f"This cost sheet is for {sheet.state}, but the site is in {site_state}. "
                "Select a cost sheet for the site's state.", 409)
        result = costsheet.compute_worker_cost(
            sheet, include_contractor=getattr(binding.contractor, "role", "") == "contractor")
        binding.cost_sheet = sheet
        binding.computed_ctc = Decimal(str(result["ctc"]))
        binding.offered_wage = Decimal(str(result["minimumWage"]))
        binding.cost_breakdown = result
        if sheet.designation and not binding.designation:
            binding.designation = sheet.designation[:80]
            return binding

    wage = data.get("offeredWage", data.get("offered_wage"))
    if wage not in (None, ""):
        try:
            binding.offered_wage = Decimal(str(wage))
        except (InvalidOperation, ValueError):
            pass
    return binding


def _sync_employment_from_binding(binding):
    """Auto-link connected records when a binding becomes ACCEPTED. Creates or
    refreshes the worker's WorkerEmployment row (drives the dashboard, gate
    passes and payroll views) from the binding's offered terms."""
    if binding is None or binding.binding_status != "ACCEPTED":
        return
    emp, _ = WorkerEmployment.objects.get_or_create(user=binding.worker)
    emp.assignment = binding
    # A new engagement overwrites the previous engagement's terms so stale values
    # (e.g. a former designation) can never carry over.
    emp.designation = binding.designation or ""
    emp.department = binding.department or ""
    emp.shift = binding.shift or ""
    if binding.accepted_at:
        emp.doj = binding.accepted_at.date()
    emp.status = "Active"
    if not emp.id_card_issue_date:
        emp.id_card_issue_date = (binding.accepted_at.date() if binding.accepted_at
                                  else timezone.now().date())
    if not emp.id_card_validity_till:
        emp.id_card_validity_till = _id_card_validity(emp.id_card_issue_date)
    emp.save()
    # Auto-create the gate-pass compliance checklist for the new engagement.
    try:
        from .compliance_checklists import _ensure_checklist
        _ensure_checklist(binding)
    except Exception:  # noqa: BLE001 — checklist creation must never block a bind
        pass


def _unlink_employment_from_binding(binding):
    """Reverse the auto-link when a binding is cancelled (unbound)."""
    if binding is None:
        return
    WorkerEmployment.objects.filter(user=binding.worker, assignment=binding).update(
        assignment=None, status="Inactive", designation="", department="", shift="", doj=None)


def _issue_binding_letter(binding, letter_type):
    """Issue the auto letter for a worker binding — appointment on accept,
    experience on unbind — and notify the worker. Never blocks the binding
    transition if letter issuance fails."""
    try:
        from api import letters
        doc = letters.issue_letter(binding, letter_type)
    except Exception:
        doc = None
    if doc is None:
        return
    name = letters.LETTER_NAMES.get(letter_type, "Letter")
    _create_notification(
        user=binding.worker,
        title=f"{name} issued",
        body=f"Your {name.lower()} has been issued and is available in your Documents.",
        notif_type="INFO",
        link="/worker/Documents",
    )


def _verify_binding_otp(mobile, credential):
    otp = SmsOtp.objects.filter(mobile=mobile, purpose="BINDING").order_by("-created_at").first()
    if otp is None or otp.is_expired or otp.attempts >= otp.max_attempts:
        return False
    if not check_password(str(credential), otp.otp_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return False
    otp.verified = True
    otp.save(update_fields=["verified"])
    return True


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_bindings(request):
    """Binding register (E·C·S·W). GET: the caller's bindings, role-scoped.
    POST: a contractor initiates a binding to a worker at a site (PENDING)."""
    from bss_core.models import WorkerContractorBinding
    user = request.user
    if request.method == "GET":
        if user.role == "contractor":
            qs = WorkerContractorBinding.objects.filter(contractor=user)
        elif user.role == "employer":
            qs = WorkerContractorBinding.objects.filter(site__employer=user)
        else:
            qs = WorkerContractorBinding.objects.filter(worker=user)
        return Response({"data": [payloads._binding_row(b) for b in qs.order_by("-created_at")[:50]]},
                        status=status.HTTP_200_OK)

    if user.role != "contractor":
        return Response({"error": "Only contractors can initiate bindings."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(user):
        return Response({"error": "Enable binding in your settings before sending binding requests."},
                        status=status.HTTP_403_FORBIDDEN)
    worker = User.objects.filter(pk=request.data.get("worker")).first()
    site = Site.objects.filter(pk=request.data.get("site")).first()
    if not worker or worker.role != "worker" or not site:
        return Response({"error": "A valid worker and site are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    # A contractor may only bind workers at a site that is allotted to them.
    if site.id not in _contractor_site_ids(user):
        return Response({"error": "That site is not allotted to you. Ask the principal employer to allot it first."},
                        status=status.HTTP_403_FORBIDDEN)
    if site.employer_id and not _binding_enabled(site.employer):
        return Response({"error": "The principal employer has disabled binding."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(worker):
        return Response({"error": "This worker has disabled binding requests in their settings."},
                        status=status.HTTP_403_FORBIDDEN)
    b = _active_worker_binding(worker, user, site)
    if b is not None and b.binding_status == "ACCEPTED":
        return Response({"error": "Already bound to this worker at this site."},
                        status=status.HTTP_400_BAD_REQUEST)
    b = _request_worker_binding(worker, user, site, initiated_by="contractor")
    b.binding_status = "PENDING"
    b.consent_worker = False
    b.consent_contractor = False
    _apply_binding_terms(b, request.data)
    b.save()
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_otp(request, binding_id):
    """Send a binding OTP to the WORKER's mobile. Only the contractor may trigger
    this: the OTP goes to the worker's phone and the worker reads it back to the
    contractor, who enters it to record the worker's consent. This lets a
    non-smartphone worker approve a binding without operating the app."""
    from bss_core.models import WorkerContractorBinding
    b = WorkerContractorBinding.objects.filter(pk=binding_id).first()
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.user != b.contractor:
        return Response({"error": "Only the contractor can send a binding OTP to the worker."},
                        status=status.HTTP_403_FORBIDDEN)
    if not _binding_enabled(b.worker):
        return Response({"error": "Binding is disabled in the worker's settings."},
                        status=status.HTTP_403_FORBIDDEN)
    mobile = _user_mobile(b.worker)
    if not _otp_send_allowed("binding", b.worker_id):
        return Response({"error": "Too many OTP requests for this binding. Please try again in a few minutes."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    _issue_otp(mobile, purpose="BINDING", ttl_minutes=5)
    masked = ("*" * max(0, len(mobile) - 4)) + mobile[-4:]
    return Response({"sent": True, "expiresIn": 300, "target": "worker", "mobile": masked},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_consent(request, binding_id):
    """Two-sided consent for binding or unbinding.

    body: {action:'bind'|'unbind', side:'worker'|'contractor', stage:'APP'|'OTP', otp?}
    - APP stage: only the party themselves may consent (side must be the caller).
    - OTP stage: the OTP is verified against `side`'s mobile; either party may
      enter it (a non-smartphone party dictates it to the other).
    A binding becomes ACCEPTED only when both sides consent; it becomes CANCELLED
    (unbound) only when both sides consent to unbinding. Both parties must have
    binding enabled in their settings.
    """
    from bss_core.models import WorkerContractorBinding
    b = WorkerContractorBinding.objects.filter(pk=binding_id).first()
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    if user not in (b.worker, b.contractor):
        return Response({"error": "Not your binding."}, status=status.HTTP_403_FORBIDDEN)
    side = str(request.data.get("side") or ("worker" if user == b.worker else "contractor")).lower()
    if side not in ("worker", "contractor"):
        return Response({"error": "side must be worker or contractor."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _binding_enabled(b.worker) or not _binding_enabled(b.contractor):
        return Response({"error": "Binding is disabled in one party's settings."},
                        status=status.HTTP_403_FORBIDDEN)

    action = str(request.data.get("action") or "bind").lower()
    stage = str(request.data.get("stage") or "APP").upper()
    method = "app"
    if stage == "OTP":
        if side != "worker":
            return Response({"error": "Only the worker can consent by OTP."},
                            status=status.HTTP_400_BAD_REQUEST)
        otp_value = str(request.data.get("otp") or "").strip()
        if not otp_value or not _verify_binding_otp(_user_mobile(b.worker), otp_value):
            return Response({"error": "Invalid or expired OTP."},
                            status=status.HTTP_400_BAD_REQUEST)
        method = "sms_otp"
    elif side != ("worker" if user == b.worker else "contractor"):
        return Response({"error": "Only a party can consent for themselves in-app."},
                        status=status.HTTP_403_FORBIDDEN)

    if action == "decline":
        b.binding_status = "REJECTED"
        b.rejected_by = side
        b.rejected_at = timezone.now()
        b.save(update_fields=["binding_status", "rejected_by", "rejected_at"])
        # Notify the counterparty about the rejection
        other_user = b.contractor if side == "worker" else b.worker
        actor_name = payloads._notification_actor_name(user)
        _create_notification(
            user=other_user,
            title="Binding request declined",
            body=f"{actor_name} declined your binding request.",
            notif_type="WARNING",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/worker/binding"
        )
        return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)
    if action == "withdraw":
        # The initiator withdraws their own still-pending request. Only the
        # worker's own worker-initiated PENDING request can be withdrawn; a
        # contractor-initiated request the worker declines is handled by
        # "decline" instead.
        if side != "worker" or b.worker_id != user.id:
            return Response({"error": "Only the worker can withdraw their own request."},
                            status=status.HTTP_403_FORBIDDEN)
        if (str(b.binding_status).upper() != "PENDING"
                or str(b.initiated_by or "").lower() != "worker"):
            return Response({"error": "Only your own pending binding request can be withdrawn."},
                            status=status.HTTP_400_BAD_REQUEST)
        b.binding_status = "CANCELLED"
        b.rejected_by = "worker"
        b.rejected_at = timezone.now()
        b.consent_worker = False
        b.save(update_fields=["binding_status", "rejected_by", "rejected_at",
                              "consent_worker", "updated_at"])
        _create_notification(
            user=b.contractor,
            title="Binding request withdrawn",
            body=f"{payloads._notification_actor_name(user)} withdrew their binding request.",
            notif_type="INFO",
            link="/contractor/qr/requests",
        )
        return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)
    if action == "decline-unbind":
        # A party declined the unbind request — the binding stays active.
        if not b.unbind_requested_at:
            return Response({"error": "There is no pending unbind request."},
                            status=status.HTTP_400_BAD_REQUEST)
        b.unbind_requested_at = None
        b.unbind_requested_by = ""
        b.unbind_consent_worker = False
        b.unbind_consent_contractor = False
        b.save(update_fields=["unbind_requested_at", "unbind_requested_by",
                              "unbind_consent_worker", "unbind_consent_contractor", "updated_at"])
        other_user = b.contractor if side == "worker" else b.worker
        actor_name = payloads._notification_actor_name(user)
        _create_notification(
            user=other_user,
            title="Unbind request declined",
            body=f"{actor_name} declined the request to end the binding.",
            notif_type="WARNING",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/worker/binding"
        )
        return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)
    if action == "unbind":
        if side == "worker":
            b.unbind_consent_worker = True
        else:
            b.unbind_consent_contractor = True
        if not b.unbind_requested_at:
            b.unbind_requested_at = timezone.now()
            b.unbind_requested_by = side
        if b.unbind_consent_worker and b.unbind_consent_contractor:
            b.binding_status = "CANCELLED"
            b.unbound_at = timezone.now()
        b.save()
        if b.binding_status == "CANCELLED":
            _unlink_employment_from_binding(b)
            _issue_binding_letter(b, "experience")
            # Notify both sides that unbind is completed
            actor_name = payloads._notification_actor_name(user)
            _create_notification(
                user=b.worker,
                title="Binding ended",
                body=f"Your binding with {payloads._notification_actor_name(b.contractor)} has been ended.",
                notif_type="INFO",
                link="/worker/binding"
            )
            _create_notification(
                user=b.contractor,
                title="Binding ended",
                body=f"Your binding with worker {payloads._notification_actor_name(b.worker)} has been ended.",
                notif_type="INFO",
                link="/contractor/qr/requests"
            )
        else:
            # Notify counterparty that an unbind was requested and requires confirmation
            other_user = b.contractor if side == "worker" else b.worker
            actor_name = payloads._notification_actor_name(user)
            _create_notification(
                user=other_user,
                title="Unbind requested",
                body=f"{actor_name} requested to end the binding. Please confirm.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests" if other_user.role == "contractor" else "/worker/binding"
            )
    else:
        if side == "worker":
            b.consent_worker = True
        else:
            b.consent_contractor = True
            # The contractor records the offered terms (incl. wage) when they
            # approve a worker-initiated binding; these feed the appointment
            # letter issued on acceptance.
            _apply_binding_terms(b, request.data)
        b.consent_method = method
        if b.consent_worker and b.consent_contractor:
            b.binding_status = "ACCEPTED"
            b.accepted_at = timezone.now()
        b.save()
        if b.binding_status == "ACCEPTED":
            _sync_employment_from_binding(b)
            _issue_binding_letter(b, "appointment")
            # Notify both parties of accepted binding
            _create_notification(
                user=b.worker,
                title="Binding approved",
                body=f"Your binding with {payloads._notification_actor_name(b.contractor)} is active.",
                notif_type="APPROVAL",
                link="/worker/binding"
            )
            _create_notification(
                user=b.contractor,
                title="Worker bound successfully",
                body=f"Worker {payloads._notification_actor_name(b.worker)} accepted binding request.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests"
            )
        else:
            # Notify counterparty that binding consent was given
            other_user = b.contractor if side == "worker" else b.worker
            _create_notification(
                user=other_user,
                title="Binding request pending",
                body=f"{payloads._notification_actor_name(user)} sent a binding request for your approval.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests" if other_user.role == "contractor" else "/worker/binding"
            )
    return Response({"data": payloads._binding_row(b)}, status=status.HTTP_200_OK)


def _contractor_engaged_at_site(contractor, site_id):
    return ContractorSiteAllotment.objects.filter(
        binding__contractor=contractor, binding__binding_status="ACCEPTED",
        site_id=site_id, status="APPROVED").exists()


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def binding_scan(request):
    """Create/append a contractor<->employer binding from a scanned QR.

    body: {type:'BSS_EMPLOYER'|'BSS_CONTRACTOR'|'BSS_SITE', bssId?, siteToken?}
    - employer/contractor QR -> binding request (PENDING), source *_qr.
    - site QR -> binding request (PENDING) + a PENDING site allotment (appended).
    """
    user = request.user
    body = request.data or {}
    # Per-user scan throttle (QR binding is a high-abuse surface).
    if not _rate_limit(f"binding-scan:{user.id}", 20, 60):
        return Response({"error": "Too many scan requests. Please wait a moment and try again."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS)
    qr_type = str(body.get("type") or "").upper()
    site = None
    contractor = None
    employer = None
    source = "site_qr"

    if qr_type == "BSS_SITE":
        site = Site.objects.filter(site_qr_token=str(body.get("siteToken") or "")).first()
        if site is None:
            return Response({"error": "Unknown site QR."}, status=status.HTTP_404_NOT_FOUND)
        if user.role != "contractor":
            return Response({"error": "Only contractors can scan a site QR."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = user, site.employer, "site_qr"
    elif qr_type == "BSS_EMPLOYER":
        ep = EmployerProfile.objects.filter(employer_code=str(body.get("bssId") or "")).first()
        if ep is None:
            return Response({"error": "Unknown employer."}, status=status.HTTP_404_NOT_FOUND)
        if user.role != "contractor":
            return Response({"error": "Only contractors can request an employer binding."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = user, ep.user, "employer_qr"
    elif qr_type == "BSS_CONTRACTOR":
        cp = ContractorProfile.objects.filter(contractor_code=str(body.get("bssId") or "")).first()
        if cp is None:
            return Response({"error": "Unknown contractor."}, status=status.HTTP_404_NOT_FOUND)
        if user.role == "worker":
            # A worker scanning a contractor QR never picks a site — the request
            # targets the contractor's default (or first allotted) site. A
            # preview resolves that site without creating a binding.
            if body.get("preview"):
                site = _contractor_default_site(cp.user)
                if site is None:
                    return Response({
                        "error": "This contractor has no site allotted yet, so a binding cannot be "
                                 "requested. Ask the contractor to get a site allotted first."},
                        status=status.HTTP_400_BAD_REQUEST)
                return Response({"data": {"site": site.site_name, "siteId": site.id}},
                                status=status.HTTP_200_OK)
            return _worker_requests_contractor(user, cp.user)
        if user.role != "employer":
            return Response({"error": "Only employers or workers can scan a contractor QR."},
                            status=status.HTTP_403_FORBIDDEN)
        contractor, employer, source = cp.user, user, "contractor_qr"
    elif qr_type == "BSS_WORKER":
        # Contractor scans a worker's ID-card QR -> worker binding request (PENDING).
        if user.role != "contractor":
            return Response({"error": "Only contractors can bind workers."},
                            status=status.HTTP_403_FORBIDDEN)
        wi = WorkerIdentity.objects.filter(bss_worker_id=str(body.get("bssId") or "")).first()
        if wi is None:
            return Response({"error": "Unknown worker."}, status=status.HTTP_404_NOT_FOUND)
        requested = str(body.get("site") or "").strip()
        requested_site = Site.objects.filter(site_name__iexact=requested).first() if requested else None
        try:
            binding = _contractor_binds_worker(user, wi.user, site=requested_site)
        except PortalMutationError as exc:
            return Response({"error": exc.message}, status=exc.status_code)
        # Offered terms (designation/department/shift/offered wage) captured at
        # scan time drive the worker's Current Employment Details and the
        # appointment letter issued when the worker approves.
        _apply_binding_terms(binding, body)
        binding.save()
        return Response({"data": payloads._binding_row(binding)}, status=status.HTTP_201_CREATED)
    else:
        return Response({"error": "Unsupported QR."}, status=status.HTTP_400_BAD_REQUEST)

    if employer is None:
        return Response({"error": "This site has no principal employer."}, status=status.HTTP_400_BAD_REQUEST)
    # Contractor <-> employer bindings must connect two different roles.
    if contractor.role != "contractor" or employer.role != "employer":
        return Response({"error": "A binding must connect a contractor and a principal employer."},
                        status=status.HTTP_400_BAD_REQUEST)
    if contractor.id == employer.id:
        return Response({"error": "An account cannot bind to itself."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not _binding_enabled(contractor) or not _binding_enabled(employer):
        return Response({"error": "Binding is disabled in one party's settings."},
                        status=status.HTTP_403_FORBIDDEN)

    binding = (ContractorEmployerBinding.objects
               .filter(contractor=contractor, employer=employer,
                       binding_status__in=("PENDING", "ACCEPTED"))
               .order_by("-created_at").first())
    if binding is None:
        # Previous request(s) were rejected/cancelled — keep them as history and
        # open a fresh PENDING request rather than overwriting the decline.
        binding = ContractorEmployerBinding.objects.create(
            contractor=contractor, employer=employer, binding_status="PENDING")
    binding.source = source
    if user == contractor:
        binding.consent_contractor = True
    else:
        binding.consent_employer = True
    if binding.consent_contractor and binding.consent_employer:
        binding.binding_status = "ACCEPTED"
        binding.accepted_at = timezone.now()
    binding.save()

    # Site proposals are employer-only: a contractor scanning a site QR raises
    # the binding request, but the employer proposes the sites afterwards. The
    # employer may also pick the site(s) at scan time (proposals the contractor
    # approves).
    if qr_type == "BSS_CONTRACTOR" and user.role == "employer":
        for sid in (body.get("siteIds") or []):
            chosen = Site.objects.filter(pk=sid, employer=user).first()
            if chosen is None:
                continue
            ContractorSiteAllotment.objects.get_or_create(
                binding=binding, site=chosen,
                defaults={"status": "PENDING", "source": "employer_allot"})

    # Tell the other party a binding request is waiting for them. Skip when the
    # scan already completed the binding (both consents present).
    if binding.binding_status == "PENDING":
        other = employer if user == contractor else contractor
        _create_notification(
            user=other,
            title="Binding request",
            body=f"{payloads._notification_actor_name(user)} requested a binding"
                 + (f" for {payloads._d(site.site_name)}." if site is not None else "."),
            notif_type="APPROVAL",
            link="/contractor/qr/requests" if other.role == "contractor" else "/employer/qr/requests",
        )

    return Response({"data": payloads._ce_binding_row(binding)}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_bindings(request):
    if request.user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"data": payloads._employer_bindings(request.user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_binding_action(request, binding_id):
    """Actions on a contractor<->employer binding.

    body: {action:'approve-binding'|'approve-site'|'allot'|'reject', siteId?, siteIds?}
    Both parties may approve the binding (two-sided consent). Only the employer
    may approve a site or allot sites. Binding has no OTP — accept in-app.
    """
    user = request.user
    if user.role == "employer":
        b = ContractorEmployerBinding.objects.filter(pk=binding_id, employer=user).first()
    elif user.role == "contractor":
        b = ContractorEmployerBinding.objects.filter(pk=binding_id, contractor=user).first()
    else:
        return Response({"error": "Not your binding."}, status=status.HTTP_403_FORBIDDEN)
    if b is None:
        return Response({"error": "Binding not found."}, status=status.HTTP_404_NOT_FOUND)
    action = str(request.data.get("action") or "").lower()

    if action == "approve-binding":
        if user.role == "employer":
            b.consent_employer = True
        else:
            b.consent_contractor = True
        b.consent_method = "app"
        if b.consent_contractor and b.consent_employer:
            b.binding_status = "ACCEPTED"
            b.accepted_at = timezone.now()
        b.save()
        if b.binding_status == "ACCEPTED":
            _create_notification(
                user=b.contractor,
                title="Employer binding accepted",
                body=f"Your organisation binding with {payloads._notification_actor_name(b.employer)} is active.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests"
            )
            _create_notification(
                user=b.employer,
                title="Contractor bound successfully",
                body=f"Binding with contractor {payloads._notification_actor_name(b.contractor)} is active.",
                notif_type="APPROVAL",
                link="/employer/qr/requests"
            )
        else:
            other_user = b.contractor if user == b.employer else b.employer
            _create_notification(
                user=other_user,
                title="Binding consent updated",
                body=f"{payloads._notification_actor_name(user)} consented to the binding request.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
            )
    elif action == "reject":
        # Never orphan workers: if the contractor still has workers on this
        # employer's sites, a successor contractor must be supplied.
        site_ids = list(Site.objects.filter(employer=b.employer).values_list("id", flat=True))
        at_risk = _workers_at_risk(b.contractor, site_ids)
        successor = _resolve_successor(b.employer, b, request.data.get("successorBindingId"),
                                       request.data.get("successorContractorId")) if at_risk else None
        if at_risk and successor is None:
            return Response({"error": f"This contractor still has {len(at_risk)} worker(s) on your sites. Provide a successor contractor so they are not orphaned."},
                            status=status.HTTP_400_BAD_REQUEST)
        b.binding_status = "REJECTED"
        b.rejected_by = "employer" if user.role == "employer" else "contractor"
        b.rejected_at = timezone.now()
        b.save(update_fields=["binding_status", "rejected_by", "rejected_at"])
        if successor is not None:
            _shift_workers_to_successor(b.contractor, successor.contractor, site_ids,
                                        employer=b.employer)
        # A rejected employer binding invalidates its site allotments and releases
        # any remaining workers from the employer's sites.
        ContractorSiteAllotment.objects.filter(binding=b).update(status="REJECTED")
        _release_contractor_workers(b)
        other_user = b.contractor if user == b.employer else b.employer
        _create_notification(
            user=other_user,
            title="Binding request declined",
            body=f"{payloads._notification_actor_name(user)} declined the binding request.",
            notif_type="WARNING",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
        )
    elif action == "unbind":
        # Two-sided unbinding — either party may request; the binding is
        # cancelled only once both consents are recorded. A successor is
        # mandatory only when workers would be orphaned; otherwise the employer
        # may optionally hand the sites to a successor. The choice is staged on
        # the binding and only acted on at the final cancel.
        if user.role == "contractor":
            b.unbind_consent_contractor = True
        else:
            b.unbind_consent_employer = True
        if not b.unbind_requested_at:
            b.unbind_requested_at = timezone.now()
            b.unbind_requested_by = user.role
        site_ids = list(Site.objects.filter(employer=b.employer).values_list("id", flat=True))
        if user.role == "employer":
            provided = (request.data.get("successorContractorId")
                        or request.data.get("successorBindingId"))
            if provided:
                b.unbind_successor = _resolve_successor(
                    b.employer, b, request.data.get("successorBindingId"),
                    request.data.get("successorContractorId"))
        successor = b.unbind_successor
        at_risk = _workers_at_risk(b.contractor, site_ids)
        # The employer must name a successor when workers are at risk.
        if user.role == "employer" and at_risk and successor is None:
            b.save()
            return Response({"error": f"This contractor still has {len(at_risk)} worker(s) on your sites. Provide a successor contractor so they are not orphaned."},
                            status=status.HTTP_400_BAD_REQUEST)
        if b.unbind_consent_contractor and b.unbind_consent_employer:
            if at_risk and successor is None:
                b.save()
                return Response({"error": f"This contractor still has {len(at_risk)} worker(s) on your sites. Provide a successor contractor so they are not orphaned."},
                                status=status.HTTP_400_BAD_REQUEST)
            b.binding_status = "CANCELLED"
            b.unbound_at = timezone.now()
        b.save()
        if b.binding_status == "CANCELLED":
            # Move the workers to the successor, then invalidate the site
            # allotments and release any remaining workers.
            if successor is not None:
                _shift_workers_to_successor(b.contractor, successor.contractor, site_ids,
                                            employer=b.employer)
            ContractorSiteAllotment.objects.filter(binding=b).update(status="REJECTED")
            _release_contractor_workers(b)
            _create_notification(
                user=b.contractor,
                title="Employer binding ended",
                body=f"Your binding with employer {payloads._notification_actor_name(b.employer)} has been ended.",
                notif_type="INFO",
                link="/contractor/qr/requests"
            )
            _create_notification(
                user=b.employer,
                title="Contractor binding ended",
                body=f"Your binding with contractor {payloads._notification_actor_name(b.contractor)} has been ended.",
                notif_type="INFO",
                link="/employer/qr/requests"
            )
        else:
            other_user = b.contractor if user == b.employer else b.employer
            _create_notification(
                user=other_user,
                title="Unbind requested",
                body=f"{payloads._notification_actor_name(user)} requested to end the organisation binding. Confirm to unbind.",
                notif_type="APPROVAL",
                link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
            )
    elif action == "reject-unbind":
        # The counterparty declined the unbind request — the binding stays active.
        if not b.unbind_requested_at:
            return Response({"error": "There is no pending unbind request."},
                            status=status.HTTP_400_BAD_REQUEST)
        b.unbind_requested_at = None
        b.unbind_requested_by = ""
        b.unbind_consent_contractor = False
        b.unbind_consent_employer = False
        b.unbind_successor = None
        b.save(update_fields=["unbind_requested_at", "unbind_requested_by",
                              "unbind_consent_contractor", "unbind_consent_employer",
                              "unbind_successor", "updated_at"])
        other_user = b.contractor if user == b.employer else b.employer
        _create_notification(
            user=other_user,
            title="Unbind request declined",
            body=f"{payloads._notification_actor_name(user)} declined the request to end the binding.",
            notif_type="WARNING",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
        )
    elif action == "approve-site":
        # Two-step: whoever did NOT raise the proposal approves it.
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."}, status=status.HTTP_404_NOT_FOUND)
        if user.role == "employer" and a.source == "employer_allot":
            return Response({"error": "You proposed this site — the contractor must approve it."},
                            status=status.HTTP_403_FORBIDDEN)
        if user.role == "contractor" and a.source in ("contractor_request", "site_qr"):
            return Response({"error": "You requested this site — the employer must approve it."},
                            status=status.HTTP_403_FORBIDDEN)
        a.status = "APPROVED"
        a.approved_at = timezone.now()
        a.save()
        other_user = b.contractor if user == b.employer else b.employer
        site_title = payloads._d(a.site.site_name) if a.site else "Site"
        _create_notification(
            user=other_user,
            title="Site permission approved",
            body=f"{payloads._notification_actor_name(user)} approved site permission for {site_title}.",
            notif_type="APPROVAL",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
        )
    elif action == "reject-site":
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."}, status=status.HTTP_404_NOT_FOUND)
        a.status = "REJECTED"
        a.save()
        other_user = b.contractor if user == b.employer else b.employer
        site_title = payloads._d(a.site.site_name) if a.site else "Site"
        _create_notification(
            user=other_user,
            title="Site permission declined",
            body=f"{payloads._notification_actor_name(user)} declined site permission for {site_title}.",
            notif_type="WARNING",
            link="/contractor/qr/requests" if other_user.role == "contractor" else "/employer/qr/requests"
        )
    elif action == "request-site-release":
        if user.role != "contractor":
            return Response({"error": "Only the contractor can request a site release."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(
            binding=b, site_id=site_id, status="APPROVED").first()
        if a is None:
            return Response({"error": "Only an approved site can be released."},
                            status=status.HTTP_404_NOT_FOUND)
        a.release_requested_at = timezone.now()
        a.release_requested_by = "contractor"
        a.save(update_fields=["release_requested_at", "release_requested_by", "updated_at"])
        _create_notification(
            user=b.employer,
            title="Site release requested",
            body=f"{payloads._notification_actor_name(user)} requested to release "
                 f"{payloads._d(a.site.site_name) if a.site else 'a site'}.",
            notif_type="APPROVAL",
            link="/employer/qr/requests")
    elif action == "cancel-site-release":
        if user.role != "contractor":
            return Response({"error": "Only the contractor can cancel a site release."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."},
                            status=status.HTTP_404_NOT_FOUND)
        a.release_requested_at = None
        a.release_requested_by = ""
        a.save(update_fields=["release_requested_at", "release_requested_by", "updated_at"])
    elif action == "approve-site-release":
        if user.role != "employer":
            return Response({"error": "Only the employer can approve a site release."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(
            binding=b, site_id=site_id, status="APPROVED",
            release_requested_at__isnull=False).first()
        if a is None:
            return Response({"error": "No release request for that site."},
                            status=status.HTTP_404_NOT_FOUND)
        # Never orphan workers: if the contractor still has workers at this site,
        # a successor contractor for the site must be supplied.
        at_risk = _workers_at_risk(b.contractor, [site_id])
        provided = (request.data.get("successorContractorId")
                    or request.data.get("successorBindingId")
                    or a.successor_contractor_id)
        successor = _resolve_successor(b.employer, b, request.data.get("successorBindingId"),
                                       provided) if provided else None
        if at_risk and successor is None:
            return Response({"error": f"This contractor still has {len(at_risk)} worker(s) at this site. Provide a successor contractor so they are not orphaned."},
                            status=status.HTTP_400_BAD_REQUEST)
        if successor is not None:
            _shift_workers_to_successor(b.contractor, successor.contractor, [site_id],
                                        employer=b.employer)
        a.status = "RELEASED"
        a.released_at = timezone.now()
        a.save(update_fields=["status", "released_at", "updated_at"])
        # Release any remaining workers from that site (skipped/had another binding).
        WorkerContractorBinding.objects.filter(
            contractor=b.contractor, site_id=site_id
        ).exclude(binding_status__in=payloads.TERMINAL_BINDING_STATUSES).update(
            binding_status="CANCELLED", unbound_at=timezone.now())
        _create_notification(
            user=b.contractor,
            title="Site released",
            body=f"{payloads._notification_actor_name(user)} approved the release of "
                 f"{payloads._d(a.site.site_name) if a.site else 'a site'}.",
            notif_type="INFO",
            link="/contractor/qr/requests")
    elif action == "set-site-successor":
        # Persist the employer's chosen successor contractor for one site, so the
        # choice survives a refresh and is reused when the site is released.
        if user.role != "employer":
            return Response({"error": "Only the employer can set a site successor."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."},
                            status=status.HTTP_404_NOT_FOUND)
        successor_id = request.data.get("successorContractorId")
        successor_user = None
        if successor_id not in (None, ""):
            successor_user = User.objects.filter(pk=successor_id, role="contractor").first()
            if successor_user is None:
                return Response({"error": "Select a valid successor contractor."},
                                status=status.HTTP_400_BAD_REQUEST)
            if successor_user.id == b.contractor_id:
                return Response({"error": "The successor cannot be the current contractor."},
                                status=status.HTTP_400_BAD_REQUEST)
        a.successor_contractor = successor_user
        a.save(update_fields=["successor_contractor", "updated_at"])
    elif action == "release-site":
        # Employer-initiated site release: the employer unbinds the contractor
        # from one site. If that contractor still has workers there, a successor
        # contractor must be supplied so only those workers are moved.
        if user.role != "employer":
            return Response({"error": "Only the employer can release a site."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(
            binding=b, site_id=site_id, status="APPROVED").first()
        if a is None:
            return Response({"error": "Only an approved site can be released."},
                            status=status.HTTP_404_NOT_FOUND)
        at_risk = _workers_at_risk(b.contractor, [site_id])
        provided = (request.data.get("successorContractorId")
                    or request.data.get("successorBindingId")
                    or a.successor_contractor_id)
        successor = _resolve_successor(b.employer, b, request.data.get("successorBindingId"),
                                       provided) if provided else None
        if at_risk and successor is None:
            return Response({"error": f"This contractor still has {len(at_risk)} worker(s) at this site. Provide a successor contractor so they are not orphaned."},
                            status=status.HTTP_400_BAD_REQUEST)
        if successor is not None:
            _shift_workers_to_successor(b.contractor, successor.contractor, [site_id],
                                        employer=b.employer)
        a.status = "RELEASED"
        a.released_at = timezone.now()
        a.release_requested_at = None
        a.release_requested_by = ""
        a.save(update_fields=["status", "released_at", "release_requested_at",
                              "release_requested_by", "updated_at"])
        WorkerContractorBinding.objects.filter(
            contractor=b.contractor, site_id=site_id
        ).exclude(binding_status__in=payloads.TERMINAL_BINDING_STATUSES).update(
            binding_status="CANCELLED", unbound_at=timezone.now())
        _create_notification(
            user=b.contractor,
            title="Site released",
            body=f"{payloads._notification_actor_name(user)} released "
                 f"{payloads._d(a.site.site_name) if a.site else 'a site'} from your engagement.",
            notif_type="INFO",
            link="/contractor/qr/requests")
    elif action == "reject-site-release":
        if user.role != "employer":
            return Response({"error": "Only the employer can decline a site release."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        a = ContractorSiteAllotment.objects.filter(binding=b, site_id=site_id).first()
        if a is None:
            return Response({"error": "Site allotment not found."},
                            status=status.HTTP_404_NOT_FOUND)
        a.release_requested_at = None
        a.release_requested_by = ""
        a.save(update_fields=["release_requested_at", "release_requested_by", "updated_at"])
        _create_notification(
            user=b.contractor,
            title="Site release declined",
            body=f"{payloads._notification_actor_name(user)} kept "
                 f"{payloads._d(a.site.site_name) if a.site else 'the site'} allotted to you.",
            notif_type="WARNING",
            link="/contractor/qr/requests")
    elif action == "request-site":
        if user.role != "contractor":
            return Response({"error": "Only the contractor can request a site."},
                            status=status.HTTP_403_FORBIDDEN)
        site_id = request.data.get("siteId")
        site = Site.objects.filter(pk=site_id, employer=b.employer).first()
        if site is None:
            return Response({"error": "That site is not owned by the employer."},
                            status=status.HTTP_400_BAD_REQUEST)
        ContractorSiteAllotment.objects.update_or_create(
            binding=b, site=site,
            defaults={"status": "PENDING", "source": "contractor_request"})
        _create_notification(
            user=b.employer,
            title="Site permission requested",
            body=f"Contractor {payloads._notification_actor_name(user)} requested site access for {payloads._d(site.site_name)}.",
            notif_type="APPROVAL",
            link="/employer/qr/requests"
        )
    elif action == "allot":
        if user.role != "employer":
            return Response({"error": "Only the employer can propose sites."},
                            status=status.HTTP_403_FORBIDDEN)
        site_ids = request.data.get("siteIds") or []
        if not site_ids:
            # Fall back to the employer's default site.
            ep = getattr(request.user, "employer_profile", None)
            if ep and ep.default_site_id:
                site_ids = [ep.default_site_id]
        if not site_ids:
            return Response({"error": "Select at least one site to propose."},
                            status=status.HTTP_400_BAD_REQUEST)
        # Target bindings: the current one plus any secondary contractors the
        # employer selected — all must be ACCEPTED bindings of this employer.
        target_ids = [b.id]
        for bid in (request.data.get("bindingIds") or []):
            try:
                bid = int(bid)
            except (TypeError, ValueError):
                continue
            if bid not in target_ids:
                target_ids.append(bid)
        targets = list(ContractorEmployerBinding.objects.filter(
            pk__in=target_ids, employer=user, binding_status="ACCEPTED"))
        if not targets:
            targets = [b]
        for target in targets:
            for sid in site_ids:
                site = Site.objects.filter(pk=sid, employer=request.user).first()
                if site is None:
                    continue
                existing = ContractorSiteAllotment.objects.filter(binding=target, site=site).first()
                # Never downgrade an already-approved site or re-notify a pending one.
                if existing is not None and existing.status == "APPROVED":
                    continue
                if existing is None:
                    ContractorSiteAllotment.objects.create(
                        binding=target, site=site, status="PENDING", source="employer_allot")
                elif existing.status != "PENDING":
                    existing.status = "PENDING"
                    existing.source = "employer_allot"
                    existing.release_requested_at = None
                    existing.release_requested_by = ""
                    existing.save(update_fields=["status", "source", "release_requested_at",
                                                 "release_requested_by", "updated_at"])
                else:
                    continue
                _create_notification(
                    user=target.contractor,
                    title="Site permission proposed",
                    body=f"Employer {payloads._notification_actor_name(user)} proposed site access for {payloads._d(site.site_name)}.",
                    notif_type="APPROVAL",
                    link="/contractor/qr/requests"
                )
    elif action in ("set-secondary", "set-secondary-contractors"):
        # Persist the employer's secondary-contractor tickbox selection for this
        # binding (only ACCEPTED bindings of this employer, never the binding itself).
        if user.role != "employer":
            return Response({"error": "Only the employer can set the secondary contractors."},
                            status=status.HTTP_403_FORBIDDEN)
        allowed = set(ContractorEmployerBinding.objects.filter(
            employer=user, binding_status="ACCEPTED").values_list("id", flat=True))
        ids = []
        for bid in (request.data.get("bindingIds") or []):
            try:
                bid = int(bid)
            except (TypeError, ValueError):
                continue
            if bid in allowed and bid != b.id and bid not in ids:
                ids.append(bid)
        b.secondary_binding_ids = ids
        b.save(update_fields=["secondary_binding_ids", "updated_at"])
    else:
        return Response({"error": "Unsupported action."}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"data": payloads._ce_binding_row(b)}, status=status.HTTP_200_OK)


__all__ = [
    "_active_worker_binding",
    "_apply_binding_terms",
    "_binding_enabled",
    "_contractor_binds_worker",
    "_contractor_default_site",
    "_contractor_engaged_at_site",
    "_contractor_site_ids",
    "_ensure_ce_binding",
    "_issue_binding_letter",
    "_release_contractor_workers",
    "_request_worker_binding",
    "_resolve_successor",
    "_shift_workers_to_successor",
    "_sync_employment_from_binding",
    "_unlink_employment_from_binding",
    "_verify_binding_otp",
    "_worker_requests_contractor",
    "_workers_at_risk",
    "binding_consent",
    "binding_otp",
    "binding_scan",
    "employer_binding_action",
    "employer_bindings",
    "worker_bindings",
]
