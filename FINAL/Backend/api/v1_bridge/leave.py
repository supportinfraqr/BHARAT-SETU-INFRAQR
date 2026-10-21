"""Site calendar, leave, restricted-holiday and attendance handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403


def _handle_site_calendar(user, body, method):
    """Contractor manages a site's holiday calendar + leave policy.

    Workers bound to the site inherit both. ``kind`` selects what is edited:
    ``holiday`` (default) or ``leavePolicy``.
    """
    from bss_core.models import LeaveType, SiteHoliday, SiteLeavePolicy

    site_id = body.get("siteId")
    if site_id not in _contractor_site_ids(user):
        raise PortalMutationError("This site is not allotted to you.", 403)
    site = Site.objects.filter(pk=site_id).first()
    if site is None:
        raise PortalMutationError("Site not found.", 404)

    kind = str(body.get("kind") or "holiday").strip().lower()
    record_id = body.get("id")

    if method == "DELETE":
        if kind in ("leavepolicy", "leave-policy", "policy"):
            SiteLeavePolicy.objects.filter(pk=record_id, site=site).delete()
        else:
            SiteHoliday.objects.filter(pk=record_id, site=site).delete()
        return record_id

    if kind in ("leavepolicy", "leave-policy", "policy"):
        leave_type = None
        if body.get("leaveTypeId"):
            leave_type = LeaveType.objects.filter(pk=body.get("leaveTypeId")).first()
        if leave_type is None and body.get("leaveType"):
            leave_type = LeaveType.objects.filter(name__iexact=str(body.get("leaveType")).strip()).first()
        if leave_type is None:
            raise PortalMutationError("Select a valid leave type.", 400)
        policy, _ = SiteLeavePolicy.objects.update_or_create(
            site=site, leave_type=leave_type,
            defaults={
                "annual_entitlement": int(body.get("annualEntitlement") or 12),
                "opening_balance": int(body.get("openingBalance") or 0),
                "is_active": bool(body.get("isActive", True)),
            },
        )
        return policy.id

    if kind in ("restrictedpolicy", "restricted-policy", "rhpolicy", "rh-policy"):
        # Restricted Holiday (RH) allowance for the site. `allotment` is how many
        # optional holidays are offered; `maxAvail` is how many a worker may
        # actually take (with prior approval).
        if body.get("allotment") is not None:
            site.restricted_holiday_allotment = max(0, min(30, int(body.get("allotment") or 0)))
        if body.get("maxAvail") is not None:
            site.restricted_holiday_max_avail = max(0, min(30, int(body.get("maxAvail") or 0)))
        site.save(update_fields=["restricted_holiday_allotment", "restricted_holiday_max_avail", "updated_at"])
        return site.id

    if kind in ("weeklyoff", "weekly-off", "weeklyoffdays"):
        raw = body.get("days")
        if isinstance(raw, list):
            codes = [str(d).strip().upper()[:3] for d in raw]
        else:
            codes = [c.strip().upper()[:3] for c in str(raw or "").split(",")]
        valid = [c for c in ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN") if c in codes]
        site.weekly_off_days = ",".join(valid)
        site.save(update_fields=["weekly_off_days", "updated_at"])
        return site.id

    if kind in ("copy", "copytosites", "copy-to-sites"):
        # Copy this site's whole calendar (holidays + leave policies + RH policy)
        # to other allotted sites. targetSiteIds omitted/"all" => every other site.
        allowed = set(_contractor_site_ids(user))
        raw_targets = body.get("targetSiteIds")
        if raw_targets in (None, "", "all", "ALL"):
            target_ids = allowed - {site.id}
        else:
            try:
                target_ids = {int(t) for t in raw_targets} & allowed
            except (TypeError, ValueError):
                target_ids = set()
            target_ids -= {site.id}
        if not target_ids:
            raise PortalMutationError("No other allotted sites to copy to.", 400)
        src_holidays = list(SiteHoliday.objects.filter(site=site))
        src_policies = list(SiteLeavePolicy.objects.filter(site=site, is_active=True))
        copied = 0
        for tsite in Site.objects.filter(id__in=target_ids):
            tsite.restricted_holiday_allotment = site.restricted_holiday_allotment
            tsite.restricted_holiday_max_avail = site.restricted_holiday_max_avail
            tsite.weekly_off_days = site.weekly_off_days
            tsite.save(update_fields=["restricted_holiday_allotment", "restricted_holiday_max_avail", "weekly_off_days", "updated_at"])
            for h in src_holidays:
                SiteHoliday.objects.get_or_create(
                    site=tsite, date=h.date, name=h.name,
                    defaults={"holiday_type": h.holiday_type, "is_paid": h.is_paid, "note": h.note},
                )
            for p in src_policies:
                SiteLeavePolicy.objects.update_or_create(
                    site=tsite, leave_type=p.leave_type,
                    defaults={"annual_entitlement": p.annual_entitlement,
                              "opening_balance": p.opening_balance, "is_active": True},
                )
            copied += 1
        return {"copied": copied, "sourceSiteId": site.id}

    # Holiday entry
    holiday = SiteHoliday.objects.filter(pk=record_id, site=site).first() if record_id else None
    if holiday is None:
        holiday = SiteHoliday(site=site)
    new_date = _parse_iso_date(body.get("date"))
    if new_date:
        holiday.date = new_date
    if body.get("name") is not None:
        holiday.name = str(body.get("name") or "").strip()[:120]
    holiday_type = str(body.get("holidayType") or "").strip().upper()
    if holiday_type in dict(SiteHoliday.TYPES):
        holiday.holiday_type = holiday_type
    if body.get("isPaid") is not None:
        holiday.is_paid = bool(body.get("isPaid"))
    if body.get("note") is not None:
        holiday.note = str(body.get("note") or "")[:255]
    if not holiday.date or not holiday.name:
        raise PortalMutationError("A holiday needs a date and a name.", 400)
    holiday.save()
    return holiday.id


def _handle_leave_apply(user, body):
    """Worker leave application -> LeaveRequest (PENDING, approved by bound contractor).

    The leave type must be one the contractor configured for the worker's site
    (Site Calendar & Leave Setup) — never a global default."""
    from bss_core.models import LeaveRequest, SiteHoliday, SiteLeavePolicy

    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site").first())
    if binding is None or binding.site is None:
        raise PortalMutationError(
            "Leave is available once you are bound to a contractor and site.", 403)

    type_name = str(body.get("type") or "").strip()
    policy = (SiteLeavePolicy.objects
              .filter(site=binding.site, is_active=True, leave_type__name__iexact=type_name)
              .select_related("leave_type").first())
    if policy is None:
        raise PortalMutationError(
            "That leave type is not configured for your site. Ask your contractor to set it up.", 400)
    leave_type = policy.leave_type

    from_date = _parse_iso_date(body.get("from"))
    to_date = _parse_iso_date(body.get("to"))
    if not from_date or not to_date or to_date < from_date:
        raise PortalMutationError("Enter a valid leave date range.", 400)
    days = (to_date - from_date).days + 1

    # No overlapping live leave request for the same worker.
    if LeaveRequest.objects.filter(
            worker=user, status__in=("PENDING", "APPROVED"),
            from_date__lte=to_date, to_date__gte=from_date).exists():
        raise PortalMutationError("You already have a leave request covering these dates.", 400)

    # Enforce the site's leave entitlement (opening balance + annual entitlement
    # minus live requests for this leave type and year).
    used = sum(
        row.days for row in LeaveRequest.objects.filter(
            worker=user, leave_type=leave_type, site=binding.site,
            status__in=("PENDING", "APPROVED"), from_date__year=from_date.year)
    )
    available = int(policy.opening_balance or 0) + int(policy.annual_entitlement or 0) - used
    if days > available:
        raise PortalMutationError(
            f"Insufficient {leave_type.name} balance: requested {days} day(s), available {max(0, available)}.",
            400)

    # Leave cannot be taken on a Public Holiday or a weekly off day.
    weekly = {c for c in (binding.site.weekly_off_days or "").split(",") if c}
    day_codes = ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")
    public_dates = set(SiteHoliday.objects.filter(
        site=binding.site, holiday_type="PUBLIC", date__range=(from_date, to_date)
    ).values_list("date", flat=True))
    blocked = []
    cursor = from_date
    while cursor <= to_date:
        if cursor in public_dates or day_codes[cursor.weekday()] in weekly:
            blocked.append(cursor)
        cursor += timedelta(days=1)
    if blocked:
        raise PortalMutationError(
            "Leave cannot be taken on a public holiday or weekly off: "
            + ", ".join(x.strftime("%d %b") for x in blocked[:5]), 400)

    request_obj = LeaveRequest.objects.create(
        worker=user,
        leave_type=leave_type,
        site=binding.site,
        contractor=binding.contractor,
        from_date=from_date,
        to_date=to_date,
        days=days,
        reason=str(body.get("reason") or "")[:2000],
        attachment_id=str(body.get("attachmentId") or "")[:80],
        status="PENDING",
    )
    return payloads._leave_row(request_obj)


def _handle_rh_request(user, body):
    """Worker requests to avail a Restricted Holiday (RH) at their site.

    Needs the contractor's prior approval and is capped by the site's
    ``restricted_holiday_max_avail`` quota."""
    from bss_core.models import RestrictedHolidayRequest, SiteHoliday

    binding = (WorkerContractorBinding.objects.filter(worker=user, binding_status="ACCEPTED")
               .select_related("site").first())
    if binding is None or binding.site is None:
        raise PortalMutationError(
            "Restricted holidays are available once you are bound to a contractor and site.", 403)
    site = binding.site
    holiday_date = _parse_iso_date(body.get("holidayDate"))
    if not holiday_date:
        raise PortalMutationError("Choose a restricted holiday date.", 400)
    holiday = SiteHoliday.objects.filter(site=site, date=holiday_date, holiday_type="RESTRICTED").first()
    if holiday is None:
        raise PortalMutationError("That date is not a restricted holiday for your site.", 400)
    if RestrictedHolidayRequest.objects.filter(
            worker=user, site=site, holiday_date=holiday_date,
            status__in=("PENDING", "APPROVED")).exists():
        raise PortalMutationError("You have already requested this restricted holiday.", 409)
    used = RestrictedHolidayRequest.objects.filter(
        worker=user, site=site, status__in=("PENDING", "APPROVED")).count()
    if used >= site.restricted_holiday_max_avail:
        raise PortalMutationError(
            f"You can avail at most {site.restricted_holiday_max_avail} restricted holiday(s) this year.", 409)
    req = RestrictedHolidayRequest.objects.create(
        worker=user, contractor=binding.contractor, site=site, holiday=holiday,
        holiday_date=holiday_date, holiday_name=str(holiday.name or "")[:120],
        reason=str(body.get("reason") or "")[:500], status="PENDING",
    )
    _create_notification(
        user=binding.contractor,
        title="Restricted holiday request",
        body=(f"{payloads._notification_actor_name(user)} requested a restricted holiday on "
              f"{holiday_date:%d %b %Y} ({holiday.name}). Approve to grant it."),
        notif_type="APPROVAL",
        link="/contractor/leave",
    )
    return payloads._rh_request_row(req)


def _handle_rh_decide(user, body):
    """Contractor approves / rejects a worker's restricted-holiday request."""
    from bss_core.models import RestrictedHolidayRequest

    req = RestrictedHolidayRequest.objects.filter(pk=body.get("id"), contractor=user).first()
    if req is None:
        raise PortalMutationError("Restricted holiday request not found for your account.", 404)
    decision = str(body.get("status") or "").strip().upper()
    mapping = {"APPROVED": "APPROVED", "APPROVE": "APPROVED", "ACCEPTED": "APPROVED",
               "REJECTED": "REJECTED", "REJECT": "REJECTED"}
    if decision not in mapping:
        raise PortalMutationError("Select a valid decision.", 400)
    req.status = mapping[decision]
    req.decided_by = user
    req.decided_at = timezone.now()
    if body.get("comment") is not None:
        req.comment = str(body.get("comment") or "")[:500]
    req.save(update_fields=["status", "decided_by", "decided_at", "comment", "updated_at"])
    approved = req.status == "APPROVED"
    _create_notification(
        user=req.worker,
        title="Restricted holiday " + ("approved" if approved else "declined"),
        body=(f"Your restricted holiday request for {req.holiday_date:%d %b %Y} "
              f"was {'approved' if approved else 'declined'}."),
        notif_type="APPROVAL",
        link="/worker/Holidays",
    )
    return payloads._rh_request_row(req)


def _handle_leave_decide(user, body):
    """Bound contractor approves / rejects a worker's LeaveRequest."""
    from bss_core.models import LeaveRequest

    request_obj = LeaveRequest.objects.filter(pk=body.get("id"), contractor=user).first()
    if request_obj is None:
        raise PortalMutationError("Leave request not found for your account.", 404)
    decision = str(body.get("status") or "").strip().upper()
    mapping = {"APPROVED": "APPROVED", "APPROVE": "APPROVED", "ACCEPTED": "APPROVED",
               "REJECTED": "REJECTED", "REJECT": "REJECTED", "CANCELLED": "CANCELLED"}
    if decision in mapping:
        request_obj.status = mapping[decision]
        request_obj.approver = user
        request_obj.decided_at = timezone.now()
        if body.get("comment") is not None:
            request_obj.comment = str(body.get("comment") or "")[:500]
        request_obj.save(update_fields=["status", "approver", "decided_at", "comment", "updated_at"])
    return payloads._leave_row(request_obj)


def _handle_mark_attendance(user, body):
    """Contractor marks in/out for a worker after scanning their QR.

    Only allowed when the worker has an ACCEPTED binding with this contractor.
    Toggles check-in/check-out for the day (source = QR) and appends an
    attendance event linked to the day's Attendance row."""
    from bss_core.models import WorkerIdentity, WorkerContractorBinding
    from .attendance import _record_punch

    bss_id = str(body.get("bssId") or "").strip().upper()
    worker_identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
    if worker_identity is None:
        raise PortalMutationError("No worker found for that BSS ID.", 404)
    worker = worker_identity.user

    binding = (
        WorkerContractorBinding.objects.filter(
            worker=worker, contractor=user, binding_status="ACCEPTED"
        )
        .select_related("site")
        .first()
    )
    if binding is None or binding.site is None:
        raise PortalMutationError(
            "This worker is not bound to you, so attendance cannot be marked.", 403)

    site = binding.site
    now = timezone.now()
    attendance, _event, action = _record_punch(
        worker=worker, site=site, source="QR", method="qr_worker", when=now,
        marked_by=user, contractor=user,
        remarks=str(body.get("remarks") or "Marked via contractor QR scan")[:255])
    return {
        "id": str(attendance.id), "action": action, "status": attendance.status,
        "site": site.site_name,
        "checkIn": attendance.check_in_time.isoformat() if attendance.check_in_time else None,
        "checkOut": attendance.check_out_time.isoformat() if attendance.check_out_time else None,
        "finalCheckout": action == "OUT",
    }


__all__ = [
    "_handle_leave_apply",
    "_handle_leave_decide",
    "_handle_mark_attendance",
    "_handle_rh_decide",
    "_handle_rh_request",
    "_handle_site_calendar",
]
