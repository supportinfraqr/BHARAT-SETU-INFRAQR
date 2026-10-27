"""BSS adapter — the ONLY module in ``payroll_engine`` that reads ``bss_core`` tables.

Everything else in the payroll engine works on legacy-shaped dicts / payroll
models. When integrating into another BSS build, this file is the single place
to adjust if BSS table or field names differ.

Responsibilities
----------------
* Organisation identity  — ``org_profile(owner)``   (legacy ``Organization`` doc)
* Employee population    — ``sync_employees(owner)`` (bound workers -> PayrollEmployee)
* Attendance             — ``attendance_rows``       (legacy ``Attendance`` rows)
* Leave                  — ``approved_leaves``, ``leave_types``, ``leave_usage``
* Calendar               — ``holidays``, ``employee_shift`` (weekly offs)
"""

from datetime import date, datetime, timedelta

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from bss_core.models import (Attendance, LeaveRequest, LeaveType, SiteHoliday, User,
                             WorkerContractorBinding)

HR_ROLES = ("contractor", "employer", "bss_admin", "bss_staff")
ADMIN_ROLES = ("bss_admin", "bss_staff")
ORG_ROLES = ("contractor", "employer")

# Bindings that make a worker part of an org's payroll population. ACCEPTED is
# active; CANCELLED / TRANSFERRED rows that were once accepted are ex-employees
# (needed for Full & Final settlement, Form 16 and history).
_ACTIVE_BINDING = ("ACCEPTED",)
_EXITED_BINDING = ("CANCELLED", "TRANSFERRED", "EXPIRED")

_DAY_CODES = {"MON": "Monday", "TUE": "Tuesday", "WED": "Wednesday", "THU": "Thursday",
              "FRI": "Friday", "SAT": "Saturday", "SUN": "Sunday"}
_WEEK_KEYS = ["firstWeek", "secondWeek", "thirdWeek", "fourthWeek", "fifthWeek"]

SYNC_TTL_SECONDS = 60


# ---------------------------------------------------------------------------
# Organisation
# ---------------------------------------------------------------------------

def get_org_user(org_id):
    """Resolve an org id (as passed by an admin) to the owning BSS user."""
    try:
        return User.objects.get(pk=int(org_id), role__in=ORG_ROLES)
    except (User.DoesNotExist, TypeError, ValueError):
        return None


def list_orgs():
    """Orgs an admin may pick from (contractors and employers)."""
    out = []
    for user in User.objects.filter(role__in=ORG_ROLES, is_active=True).order_by("role", "id"):
        profile = org_profile(user)
        out.append({"_id": str(user.pk), "name": profile["name"], "type": user.role})
    return out


def org_profile(owner):
    """Legacy ``Organization`` document shape for payslips, Form 16, bank files."""
    profile = None
    name = ""
    if owner.role == "contractor":
        profile = getattr(owner, "contractor_profile", None)
        if profile:
            name = profile.company_name or profile.contractor_name or profile.trade_name
    elif owner.role == "employer":
        profile = getattr(owner, "employer_profile", None)
        if profile:
            name = profile.employer_name or profile.trade_name
    name = name or owner.full_name or owner.username
    return {
        "_id": str(owner.pk),
        "name": name,
        "type": owner.role,
        "address": getattr(profile, "address", "") or "",
        "state": getattr(profile, "state", "") or "",
        "district": getattr(profile, "district", "") or "",
        "email": getattr(profile, "email", "") or "",
        "phone": getattr(profile, "mobile", "") or "",
        "pan": getattr(profile, "pan_no", "") or "",
        "tan": getattr(profile, "tan", "") or "",
        "gstin": getattr(profile, "gstin", "") or "",
        "logo": getattr(profile, "profile_image", "") or "",
        "contactPerson": getattr(profile, "contact_person", "") or "",
    }


# ---------------------------------------------------------------------------
# Employee population
# ---------------------------------------------------------------------------

def _bindings_for(owner):
    qs = WorkerContractorBinding.objects.select_related("worker", "site")
    if owner.role == "contractor":
        qs = qs.filter(contractor=owner)
    elif owner.role == "employer":
        qs = qs.filter(site__employer=owner)
    else:
        return qs.none()
    return qs.filter(Q(binding_status__in=_ACTIVE_BINDING)
                     | Q(binding_status__in=_EXITED_BINDING, accepted_at__isnull=False))


def _split_name(full):
    parts = (full or "").strip().split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


def _identity_snapshot(worker, binding):
    """Fields synced from BSS into PayrollEmployee (never payroll-owned fields)."""
    ident = getattr(worker, "worker_identity", None)
    bank = getattr(worker, "banking", None)
    social = getattr(worker, "social_security", None)
    addr = getattr(worker, "worker_address", None)
    employment = worker.employments.filter(assignment=binding).order_by("-id").first() \
        or worker.employments.order_by("-id").first()
    first, last = _split_name((ident.name if ident else "") or worker.full_name or worker.username)
    site = binding.site
    doj = binding.date_of_joining or (binding.accepted_at.date() if binding.accepted_at else None) \
        or (employment.doj if employment else None)
    return {
        "first_name": first,
        "last_name": last,
        "display_name": " ".join(p for p in [first, last] if p),
        "email": (ident.email if ident else "") or "",
        "unique_id": (ident.bss_worker_id if ident else "") or str(worker.pk),
        "mobile": (ident.mobile_number if ident else "") or worker.username,
        "date_of_joining": doj,
        "job_title": binding.designation or (employment.designation if employment else ""),
        "department": binding.department or (employment.department if employment else ""),
        "gender": (ident.gender if ident else "") or "",
        "dob": ident.date_of_birth if ident else None,
        "father_spouse": (ident.father_name or ident.spouse_name) if ident else "",
        "site_id_ref": str(site.pk) if site else "",
        "site_name": (site.site_name if site else "") or "",
        "work_state": (site.state if site else "") or "",
        "present_address": {
            "address": addr.current_address if addr else "", "street": addr.current_locality if addr else "",
            "city": addr.current_city if addr else "", "state": addr.current_state if addr else "",
            "pin": addr.current_pincode if addr else "", "country": "India"},
        "permanent_address": {
            "address": addr.permanent_address if addr else "", "street": addr.permanent_locality if addr else "",
            "city": addr.permanent_city if addr else "", "state": addr.permanent_state if addr else "",
            "pin": addr.permanent_pincode if addr else "", "country": "India"},
        "national_id": {
            "pan": (ident.pan if ident else "") or "", "aadhar": "", "passport": "",
            "passportValid": None, "nameInPan": (ident.pan_holder_name if ident else "") or "",
            "nameInAadhaar": "", "nameInPassport": ""},
        "bank_info": {
            "bankCountry": "India", "bankCode": "", "bankName": (bank.bank_name if bank else "") or "",
            "branchName": (bank.bank_branch if bank else "") or "",
            "ifscCode": (bank.ifsc_code if bank else "") or "", "swiftCode": "",
            "bankAccountNumber": (bank.bank_account_number if bank else "") or "",
            "confirmBankAccountNumber": (bank.bank_account_number if bank else "") or "",
            "accountHolderName": (bank.bank_account_holder_name if bank else "") or "",
            "accountType": "Savings",
            "isVerified": bool(bank and str(bank.bank_verification_status or "").upper() in ("VERIFIED", "SUCCESS")),
            "verifiedOn": None},
        "_uan": (social.epfo_uan if social else "") or "",
        "_esi": (social.esic_ip_number if social else "") or "",
        "_pf": (employment.pf_account if employment else "") or "",
    }


def _apply_snapshot(emp, snap):
    """Copy a snapshot onto an employee, skipping org-locked fields. Returns changed?"""
    locked = set(emp.locked_fields or [])
    changed = False
    for attr, value in snap.items():
        if attr.startswith("_") or attr in locked:
            continue
        if getattr(emp, attr) != value:
            setattr(emp, attr, value)
            changed = True
    stat = dict(emp.statutory_info or {})
    for key, value in (("uan", snap["_uan"]), ("esiNumber", snap["_esi"]),
                       ("pfAccountNumber", snap["_pf"])):
        if value and not stat.get(key) and f"statutoryInfo.{key}" not in locked:
            stat[key] = value
            changed = True
    if not stat.get("ptState") and snap["work_state"]:
        stat["ptState"] = snap["work_state"]
        changed = True
    emp.statutory_info = stat
    return changed


def sync_employees(owner, force=False):
    """Create / refresh PayrollEmployee rows for every worker bound to ``owner``.

    Throttled per org (``SYNC_TTL_SECONDS``) unless ``force``. Exited bindings
    flip the employee to Inactive and stamp ``exitData`` (if not already set by
    the org) so Full & Final settlement can pick them up.
    """
    from .models import PayrollEmployee

    if owner is None or owner.role not in ORG_ROLES:
        return 0
    # The throttle key embeds the binding fingerprint, so a new / changed binding
    # is picked up immediately; only worker-profile edits wait for the TTL.
    from django.db.models import Count, Max
    stamp = _bindings_for(owner).aggregate(n=Count("id"), last=Max("updated_at"))
    key = f"payroll_engine:sync:{owner.pk}:{stamp['n']}:{stamp['last']}"
    if not force and cache.get(key):
        return 0
    cache.set(key, 1, SYNC_TTL_SECONDS)

    latest = {}
    for binding in _bindings_for(owner).order_by("accepted_at", "id"):
        current = latest.get(binding.worker_id)
        # Active binding wins over exited history; otherwise the latest one.
        if current is None or binding.binding_status in _ACTIVE_BINDING \
                or current.binding_status not in _ACTIVE_BINDING:
            latest[binding.worker_id] = binding

    count = 0
    now = timezone.now()
    with transaction.atomic():
        existing = {e.worker_id: e for e in PayrollEmployee.objects.filter(org=owner)}
        for worker_id, binding in latest.items():
            emp = existing.get(worker_id) or PayrollEmployee(org=owner, worker_id=worker_id)
            snap = _identity_snapshot(binding.worker, binding)
            changed = _apply_snapshot(emp, snap) or emp._state.adding
            active = binding.binding_status in _ACTIVE_BINDING
            if active and emp.status == "Inactive" and not (emp.exit_data or {}).get("exitStatus"):
                emp.status = "Active"
                changed = True
            if not active and emp.status != "Inactive":
                emp.status = "Inactive"
                exit_data = dict(emp.exit_data or {})
                if not exit_data.get("exitStatus"):
                    left = binding.unbound_at or binding.updated_at
                    exit_data.update({"exitStatus": "Cessation",
                                      "date": left.isoformat() if left else None,
                                      "lastWorkingDay": left.isoformat() if left else None,
                                      "reason": f"BSS binding {binding.binding_status.lower()}"})
                    emp.exit_data = exit_data
                changed = True
            if changed:
                emp.synced_at = now
                emp.save()
                count += 1
    return count


def employee_for_worker(worker, org_id=None):
    """The payroll employee row(s) for a logged-in worker (employee self-service)."""
    from .models import PayrollEmployee

    binding = (WorkerContractorBinding.objects.filter(worker=worker, binding_status__in=_ACTIVE_BINDING)
               .select_related("site").first())
    if binding is not None:
        sync_employees(binding.contractor)
        if binding.site and binding.site.employer_id:
            sync_employees(binding.site.employer)
    qs = PayrollEmployee.objects.filter(worker=worker)
    if org_id:
        return qs.filter(org_id=org_id).first()
    if binding is not None:
        own = qs.filter(org_id=binding.contractor_id).first()
        if own:
            return own
    return qs.order_by("-updated_at").first()


# ---------------------------------------------------------------------------
# Attendance / leave / calendar (legacy-shaped rows)
# ---------------------------------------------------------------------------

_ATT_STATUS = {"PRESENT": "Present", "LATE": "Present", "HALF_DAY": "HalfDay",
               "ABSENT": "Absent", "LEAVE": "Leave"}


def _to_date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def attendance_rows(employee, start, end):
    """[{date: date, status: 'Present'|'HalfDay'|'Absent'|'Leave'}] for the range.

    BSS ``HOLIDAY`` / ``EXPECTED`` rows are calendar markers, not attendance, and
    are skipped (holidays come from ``holidays``). Only attendance recorded for
    this org's sites (contractor or employer) counts.
    """
    qs = Attendance.objects.filter(worker_id=employee.worker_id,
                                   attendance_date__gte=_to_date(start),
                                   attendance_date__lte=_to_date(end))
    owner = employee.org
    if owner.role == "contractor":
        qs = qs.filter(Q(contractor=owner) | Q(contractor__isnull=True))
    elif owner.role == "employer":
        qs = qs.filter(site__employer=owner)
    out = []
    for row in qs.values("attendance_date", "status"):
        status = _ATT_STATUS.get(row["status"])
        if status:
            out.append({"date": row["attendance_date"], "status": status})
    return out


def leave_types():
    """Legacy leave-type list: [{_id, leaveType: 'Paid'|'Unpaid', name, annualEntitlement}]."""
    return [{"_id": str(lt.pk), "leaveType": "Paid" if lt.is_paid else "Unpaid",
             "name": lt.name, "code": lt.code, "annualEntitlement": lt.annual_entitlement,
             "openingBalance": lt.opening_balance}
            for lt in LeaveType.objects.filter(is_active=True)]


def approved_leaves(employee, start, end):
    """Approved leaves overlapping the range, legacy ``LeaveRequest`` shape (populated)."""
    qs = (LeaveRequest.objects.filter(worker_id=employee.worker_id, status="APPROVED",
                                      from_date__lte=_to_date(end), to_date__gte=_to_date(start))
          .select_related("leave_type"))
    return [{
        "_id": str(lr.pk), "startDate": lr.from_date, "endDate": lr.to_date,
        "leaveDurationType": "Full-Day", "clusterDates": [], "days": lr.days,
        "leaveTypeId": {"_id": str(lr.leave_type_id),
                        "leaveType": "Paid" if lr.leave_type.is_paid else "Unpaid",
                        "leaveNameId": {"name": lr.leave_type.name}},
    } for lr in qs]


def leave_usage(employee, start=None, end=None):
    """{leave_type_id(str): approved days used} — for leave balance / encashment."""
    qs = LeaveRequest.objects.filter(worker_id=employee.worker_id, status="APPROVED")
    if start:
        qs = qs.filter(to_date__gte=_to_date(start))
    if end:
        qs = qs.filter(from_date__lte=_to_date(end))
    usage = {}
    for lr in qs:
        usage[str(lr.leave_type_id)] = usage.get(str(lr.leave_type_id), 0) + (lr.days or 0)
    return usage


def _site_id(employee):
    try:
        return int(employee.site_id_ref)
    except (TypeError, ValueError):
        return None


def holidays(employee, start, end):
    """Paid holidays at the employee's site, legacy ``Holiday`` shape.

    PUBLIC -> type 'Public'; dated WEEKLY_OFF entries -> type 'Company'.
    RESTRICTED (optional) holidays are excluded, as legacy excluded 'Optional'.
    """
    site_id = _site_id(employee)
    if not site_id:
        return []
    qs = SiteHoliday.objects.filter(site_id=site_id, date__gte=_to_date(start),
                                    date__lte=_to_date(end),
                                    holiday_type__in=("PUBLIC", "WEEKLY_OFF"))
    return [{"holidayName": h.name, "date": h.date,
             "type": "Public" if h.holiday_type == "PUBLIC" else "Company"} for h in qs]


def employee_shift(employee):
    """Legacy ``Shift`` shape with ``weeklyOff`` derived from the site's weekly offs.

    Returns None when the worker has no site (legacy: no shift -> no weekly off).
    """
    from bss_core.models import Site

    site_id = _site_id(employee)
    if not site_id:
        return None
    site = Site.objects.filter(pk=site_id).only("site_name", "weekly_off_days").first()
    if site is None:
        return None
    days = [_DAY_CODES[c.strip().upper()] for c in (site.weekly_off_days or "").split(",")
            if c.strip().upper() in _DAY_CODES]
    return {"_id": f"site-{site_id}", "name": f"{site.site_name or 'Site'} shift",
            "weeklyOff": {key: {"days": list(days)} for key in _WEEK_KEYS}}


def month_bounds(year, month_index):
    """(first_day, last_day) dates for a 0-based month index."""
    first = date(int(year), month_index + 1, 1)
    nxt = date(first.year + (1 if first.month == 12 else 0), 1 if first.month == 12 else first.month + 1, 1)
    return first, nxt - timedelta(days=1)


# ---------------------------------------------------------------------------
# Notifications (legacy socket / in-app notifications)
# ---------------------------------------------------------------------------

def notify(user_or_id, title, body="", link="", kind="PAYROLL"):
    """Drop an in-app BSS notification. Never raises (notifications are best-effort)."""
    from bss_core.models import Notification

    try:
        user_id = getattr(user_or_id, "pk", user_or_id)
        if not user_id:
            return
        Notification.objects.create(user_id=user_id, type=kind, title=str(title)[:120],
                                    body=str(body or "")[:500], link=str(link or "")[:255])
    except Exception:  # noqa: BLE001
        pass
