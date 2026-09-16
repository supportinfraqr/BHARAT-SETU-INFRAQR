"""Notification feed payload builder."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .shared import *  # noqa: F401,F403
from .worker import *  # noqa: F401,F403
from .contractor import *  # noqa: F401,F403
from .employer import *  # noqa: F401,F403


def _notification(nid, category, title, message, href, created, read=False,
                  requires_action=True, priority="normal", entity_id=None):
    return {
        "id": nid,
        "entityId": entity_id,
        "category": category,
        "title": title,
        "message": message,
        "createdAt": _dts(created),
        "href": href,
        "actionLabel": "View",
        "priority": priority,
        "requiresAction": requires_action,
        "read": read,
        # `read` only clears the unread highlight. `resolved` means the underlying
        # workflow is finished and the item may be hidden — it must NOT be tied to
        # read, or marking a notification read (e.g. "mark all as read") makes it
        # vanish. The feed is derived from live state, so finished workflows simply
        # stop being emitted; emitted items are therefore never "resolved".
        "resolved": False,
    }


def _notification_actor_name(user_obj):
    """Best display name for the counterparty on a notification."""
    cp = getattr(user_obj, "contractor_profile", None)
    if cp:
        return _d(cp.trade_name) or _d(cp.contractor_name) or _d(user_obj.username)
    ep = getattr(user_obj, "employer_profile", None)
    if ep:
        return _d(ep.trade_name) or _d(ep.employer_name) or _d(user_obj.username)
    wi = getattr(user_obj, "worker_identity", None)
    if wi:
        return _d(wi.name) or _d(user_obj.username)
    return _d(user_obj.get_full_name()) or _d(user_obj.username)


def build_notifications(user):
    """Role-aware notification centre for worker / contractor / employer.

    BSS has no background job runner, so the feed is derived from live domain
    state (pending bindings, gate-pass approvals, job offers, grievances and
    missing documents) for every role, plus any persisted Notification rows.
    Read state for derived items is kept in UserPreference.notification_prefs
    under 'readNotificationIds' (the PATCH handler writes it)."""
    pref = UserPreference.objects.filter(user=user).first()
    read_ids = set((pref.notification_prefs or {}).get("readNotificationIds") or []) if pref else set()
    rows = []

    def emit(nid, category, title, message, href, created,
             requires_action=True, priority="normal", entity_id=None):
        rows.append(_notification(
            nid, category, title, message, href, created,
            read=nid in read_ids, requires_action=requires_action,
            priority=priority, entity_id=entity_id))

    if user.role == "worker":
        for b in (WorkerContractorBinding.objects
                  .filter(worker=user, binding_status="PENDING")
                  .select_related("contractor", "site").order_by("-created_at")[:10]):
            emit(f"wc-binding-{b.id}", "Approvals", "New engagement request",
                 f"{_notification_actor_name(b.contractor)} wants to engage you"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}.",
                 "/worker/binding", b.created_at, priority="high", entity_id=str(b.id))
        # Contractor asked to unbind — worker must confirm.
        for b in (WorkerContractorBinding.objects
                  .filter(worker=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_worker=False,
                          unbind_consent_contractor=True)
                  .select_related("contractor", "site").order_by("-unbind_requested_at")[:10]):
            emit(f"wc-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.contractor)} wants to end your binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}. Confirm to unbind.",
                 "/worker/binding", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        for r in (RozgarRequest.objects.filter(worker=user, status="PENDING")
                  .select_related("job").order_by("-created_at")[:10]):
            emit(f"rozgar-{r.id}", "Jobs", "New job offer",
                 f"You have a pending offer for {_d(r.job.job_title) if r.job else 'a role'}.",
                 "/worker/rozgar", r.created_at, priority="high", entity_id=str(r.id))
        for g in WorkerGatePass.objects.filter(worker=user).order_by("-created_at")[:5]:
            label = "Temporary" if g.gate_pass_type == "TGP" else "Permanent"
            if g.status == "PENDING":
                emit(f"gp-{g.id}", "Compliance", f"{label} gate pass pending",
                     f"Gate pass {g.gate_pass_no} is awaiting approval.",
                     "/worker/Compliance", g.created_at, priority="high")
            elif g.status == "ACTIVE":
                emit(f"gp-{g.id}", "Compliance", f"{label} gate pass active",
                     f"Gate pass {g.gate_pass_no} is active.",
                     "/worker/Compliance", g.created_at, requires_action=False)
        try:
            missing = _worker_documents_section(user).get("missing") or []
        except Exception:
            missing = []
        if missing:
            emit("docs-missing", "Documents", "Documents pending",
                 f"{len(missing)} mandatory document{'s' if len(missing) != 1 else ''} still to be uploaded.",
                 "/worker/Documents", timezone.now(), priority="high")
        for g in (WorkerGrievance.objects.filter(worker=user)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Grievance update",
                 f"Ticket {g.ticket_no or g.id} is {g.get_status_display()}.",
                 "/worker/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        wi = getattr(user, "worker_identity", None)
        if wi and (not _d(wi.name) or not _d(wi.aadhaar) or not _d(wi.mobile_number)):
            emit("profile-incomplete", "Documents", "Complete your profile",
                 "Add the missing identity details to keep your record compliant.",
                 "/worker/Profile", timezone.now(), requires_action=False)

    elif user.role == "contractor":
        for b in (ContractorEmployerBinding.objects
                  .filter(contractor=user, binding_status="PENDING", consent_contractor=False)
                  .select_related("employer").order_by("-created_at")[:10]):
            emit(f"ce-binding-{b.id}", "Approvals", "New employer binding request",
                 f"{_notification_actor_name(b.employer)} has requested to engage your firm.",
                 "/contractor/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        for b in (WorkerContractorBinding.objects
                  .filter(contractor=user, binding_status="PENDING")
                  .select_related("worker", "site").order_by("-created_at")[:10]):
            emit(f"wc-binding-{b.id}", "Approvals", "Worker binding pending",
                 f"{_notification_actor_name(b.worker)} has a pending binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}.",
                 "/contractor/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        # Sites an employer has proposed that the contractor must approve.
        for a in (ContractorSiteAllotment.objects
                  .filter(binding__contractor=user, binding__binding_status="ACCEPTED",
                          status="PENDING", source="employer_allot")
                  .select_related("binding__employer", "site").order_by("-created_at")[:10]):
            emit(f"site-perm-{a.id}", "Sites", "Site permission requested",
                 f"{_notification_actor_name(a.binding.employer)} proposed "
                 f"{_d(a.site.site_name) if a.site else 'a site'} for your approval.",
                 "/contractor/qr/requests", a.created_at, priority="high", entity_id=str(a.id))
        # Employer asked to unbind a CE binding — contractor must confirm.
        for b in (ContractorEmployerBinding.objects
                  .filter(contractor=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_contractor=False,
                          unbind_consent_employer=True)
                  .select_related("employer").order_by("-unbind_requested_at")[:10]):
            emit(f"ce-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.employer)} wants to end your binding. Confirm to unbind.",
                 "/contractor/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        # Worker asked to unbind a WC binding — contractor must confirm.
        for b in (WorkerContractorBinding.objects
                  .filter(contractor=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_contractor=False,
                          unbind_consent_worker=True)
                  .select_related("worker", "site").order_by("-unbind_requested_at")[:10]):
            emit(f"wc-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.worker)} wants to end their binding"
                 f"{' at ' + _d(b.site.site_name) if b.site else ''}. Confirm to unbind.",
                 "/contractor/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        worker_ids = list(WorkerContractorBinding.objects
                          .filter(contractor=user).values_list("worker_id", flat=True))
        for g in (WorkerGrievance.objects.filter(worker_id__in=worker_ids)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Worker grievance",
                 f"Ticket {g.ticket_no or g.id} needs attention.",
                 "/contractor/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        cp = getattr(user, "contractor_profile", None)
        if cp and (_d(cp.approval_status) or "PENDING") != "APPROVED":
            emit("contractor-review", "Approvals", "Contractor profile under review",
                 "Your registration is being verified. Keep your compliance documents up to date.",
                 "/contractor/profile", timezone.now(), requires_action=False)
        if not WorkerContractorBinding.objects.filter(contractor=user).exists():
            emit("bind-first-worker", "Sites", "Bind your first worker",
                 "Scan a worker QR or add workers manually to start building your workforce.",
                 "/contractor/workers", timezone.now(), requires_action=False)

    elif user.role == "employer":
        for b in (ContractorEmployerBinding.objects
                  .filter(employer=user, binding_status="PENDING", consent_employer=False)
                  .select_related("contractor").order_by("-created_at")[:10]):
            emit(f"ce-binding-{b.id}", "Approvals", "New contractor binding request",
                 f"{_notification_actor_name(b.contractor)} has requested to be bound to your organisation.",
                 "/employer/qr/requests", b.created_at, priority="high", entity_id=str(b.id))
        # Sites a contractor has requested that the employer must approve.
        for a in (ContractorSiteAllotment.objects
                  .filter(binding__employer=user, binding__binding_status="ACCEPTED",
                          status="PENDING", source="contractor_request")
                  .select_related("binding__contractor", "site").order_by("-created_at")[:10]):
            emit(f"site-perm-{a.id}", "Sites", "Site permission requested",
                 f"{_notification_actor_name(a.binding.contractor)} requested "
                 f"{_d(a.site.site_name) if a.site else 'a site'}.",
                 "/employer/qr/requests", a.created_at, priority="high", entity_id=str(a.id))
        # Contractor asked to unbind — employer must confirm.
        for b in (ContractorEmployerBinding.objects
                  .filter(employer=user, binding_status="ACCEPTED",
                          unbind_requested_at__isnull=False, unbind_consent_employer=False,
                          unbind_consent_contractor=True)
                  .select_related("contractor").order_by("-unbind_requested_at")[:10]):
            emit(f"ce-unbind-{b.id}", "Approvals", "Unbind requested",
                 f"{_notification_actor_name(b.contractor)} wants to end the binding. Confirm to unbind.",
                 "/employer/qr/requests", b.unbind_requested_at, priority="high", entity_id=str(b.id))
        for g in (WorkerGatePass.objects.filter(site__employer=user, status="PENDING")
                  .select_related("worker", "site").order_by("-created_at")[:10]):
            emit(f"gp-{g.id}", "Approvals", "Gate pass approval pending",
                 f"{_notification_actor_name(g.worker)} · {g.gate_pass_no} is awaiting your approval.",
                 "/employer/gate-pass", g.created_at, priority="high")
        worker_ids = list(WorkerContractorBinding.objects
                          .filter(site__employer=user).values_list("worker_id", flat=True))
        for g in (WorkerGrievance.objects.filter(worker_id__in=worker_ids)
                  .exclude(status="RESOLVED").order_by("-created_at")[:5]):
            emit(f"grievance-{g.id}", "Grievances", "Worker grievance",
                 f"Ticket {g.ticket_no or g.id} needs attention.",
                 "/employer/grievances", g.created_at, requires_action=False,
                 entity_id=g.ticket_no or str(g.id))
        ep = getattr(user, "employer_profile", None)
        if ep and (_d(ep.approval_status) or "PENDING") != "APPROVED":
            emit("employer-review", "Approvals", "Employer profile under review",
                 "Your organisation is being verified. Complete the pending details.",
                 "/employer/profile", timezone.now(), requires_action=False)
        if not Site.objects.filter(employer=user).exists():
            emit("add-first-site", "Sites", "Add your first site",
                 "Register a site so contractors and workers can be mapped to it.",
                 "/employer/sites", timezone.now(), requires_action=False)
        if not ContractorEmployerBinding.objects.filter(employer=user).exists():
            emit("bind-first-contractor", "Contractors", "Bind a contractor",
                 "Scan a contractor QR or send a binding request to onboard a contractor.",
                 "/employer/contractors", timezone.now(), requires_action=False)

    # Persisted Notification rows (for any workflow that creates them).
    for n in Notification.objects.filter(user=user).order_by("-created_at")[:50]:
        rows.append(_notification(
            f"db-{n.id}", CATEGORY_MAP.get(n.type, "Announcements"),
            _d(n.title), _d(n.body), _d(n.link) or "/", n.created_at,
            read=n.is_read, requires_action=not n.is_read))

    rows.sort(key=lambda row: row.get("createdAt") or "", reverse=True)
    return rows[:50]


__all__ = [
    "_notification",
    "_notification_actor_name",
    "build_notifications",
]
