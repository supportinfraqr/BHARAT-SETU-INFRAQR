"""Contractor attendance sheet upload: download a BSS-ID / date-range CSV
template, upload the filled sheet (CSV/XLSX), and sync the rows into the
existing ``Attendance`` table marked as ``capture_method="SHEET"``.
"""

import io
import re
from datetime import date

from django.db import transaction
from django.http import HttpResponse

from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403
from .bindings import _contractor_site_ids

from .. import attendance_sheet as sheets

_DAY_CODES = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}


def _weekly_off_weekdays(site):
    """Weekday numbers (Mon=0) configured as weekly off for a site (e.g. 'SUN')."""
    raw = str(getattr(site, "weekly_off_days", "") or "").upper()
    out = set()
    for token in re.split(r"[^A-Z]+", raw):
        if len(token) >= 3 and token[:3] in _DAY_CODES:
            out.add(_DAY_CODES[token[:3]])
    return out


def _bound_workers(user):
    """Accepted workers for the contractor, with their BSS id + display name."""
    from bss_core.models import WorkerContractorBinding, WorkerIdentity
    out = []
    for binding in (WorkerContractorBinding.objects
                    .filter(contractor=user, binding_status="ACCEPTED")
                    .select_related("worker", "site", "site__employer")):
        worker = binding.worker
        identity = WorkerIdentity.objects.filter(user=worker).first()
        out.append({
            "worker": worker,
            "binding": binding,
            "bssId": str(getattr(identity, "bss_worker_id", "") or ""),
            "name": (str(getattr(identity, "name", "") or "")
                     or payloads._party_name(worker)
                     or str(worker.username)),
            "site": binding.site.site_name if binding.site else "",
            "siteId": binding.site_id,
        })
    return out


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_template(request):
    """Download the attendance sheet template (CSV) for a date range + site."""
    from bss_core.models import SiteHoliday

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can download attendance sheets."},
                        status=status.HTTP_403_FORBIDDEN)
    start = (request.query_params.get("start") or "").strip()
    end = (request.query_params.get("end") or "").strip()
    site = (request.query_params.get("site") or "").strip()

    workers = _bound_workers(user)
    if site:
        workers = [w for w in workers if w["site"].lower() == site.lower()]
    rows = [{"bssId": w["bssId"], "name": w["name"], "site": w["site"]} for w in workers]

    # Site calendar (basis of the sheet): holiday names + weekly-off dates.
    holiday_names = {}
    weekly_off_dates = set()
    site_obj = None
    if site:
        site_obj = (Site.objects.filter(site_name__iexact=site).first()
                    or Site.objects.filter(site_code__iexact=site).first())
    if site_obj is not None:
        try:
            days = sheets.date_range(start, end)
        except sheets.AttendanceSheetError:
            days = []
        if days:
            for hol in SiteHoliday.objects.filter(site=site_obj,
                                                   date__range=(days[0], days[-1])):
                holiday_names[hol.date.isoformat()] = hol.name or "Holiday"
            weekly_off = _weekly_off_weekdays(site_obj)
            for day in days:
                if day.weekday() in weekly_off:
                    weekly_off_dates.add(day.isoformat())
    try:
        data = sheets.build_attendance_csv(rows, start, end, holiday_names, weekly_off_dates)
    except sheets.AttendanceSheetError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    filename = f"attendance-{start}-to-{end}.csv"
    response = HttpResponse(data, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_upload(request):
    """Parse an uploaded attendance sheet and sync it into the Attendance table."""
    from bss_core.models import Attendance, Site, SiteHoliday

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can upload attendance sheets."},
                        status=status.HTTP_403_FORBIDDEN)
    sheet = request.FILES.get("sheet") or request.FILES.get("master")
    if sheet is None:
        return Response({"error": "Choose the filled attendance sheet."},
                        status=status.HTTP_400_BAD_REQUEST)
    start = (request.data.get("start") or "").strip()
    end = (request.data.get("end") or "").strip()
    site_label = (request.data.get("site") or "").strip()

    try:
        parsed = sheets.parse_attendance_sheet(sheet, start=start, end=end)
    except sheets.AttendanceSheetError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    workers = _bound_workers(user)
    by_bss = {w["bssId"].strip().lower(): w for w in workers if w["bssId"]}
    by_name = {w["name"].strip().lower(): w for w in workers}

    site = None
    if site_label:
        site = (Site.objects.filter(site_name__iexact=site_label).first()
                or Site.objects.filter(site_code=site_label).first())
    if site is None:
        site = Site.objects.filter(id__in=_contractor_site_ids(user)).order_by("id").first()

    # Dates to consider: the requested range, else the dates found in the sheet.
    try:
        range_dates = sheets.date_range(start, end)
    except sheets.AttendanceSheetError:
        range_dates = sorted({date.fromisoformat(d) for row in parsed for d in row["days"]})

    # Site holiday calendar (any type) across the range.
    site_ids = {w["siteId"] for w in workers if w["siteId"]}
    holiday_map = {}
    if range_dates:
        for hol in SiteHoliday.objects.filter(site_id__in=site_ids,
                                              date__range=(range_dates[0], range_dates[-1])):
            holiday_map[(hol.site_id, hol.date.isoformat())] = hol.name or "Holiday"

    def upsert(worker, row_site, attendance_date, sheet_status, remarks):
        existing = Attendance.objects.filter(
            worker=worker, attendance_date=attendance_date, capture_method="SHEET").first()
        if existing is None:
            Attendance.objects.create(
                worker=worker, site=row_site, contractor=user,
                attendance_date=attendance_date, status=sheet_status,
                capture_method="SHEET", is_verified=True, remarks=remarks)
            return True
        existing.site = row_site
        existing.contractor = user
        existing.status = sheet_status
        existing.is_verified = True
        existing.remarks = remarks
        existing.save(update_fields=["site", "contractor", "status",
                                     "is_verified", "remarks", "updated_at"])
        return False

    created = updated = 0
    invalid = []
    matched_workers = set()
    dates = set()
    holidays_registered = 0
    woff_cache = {}
    with transaction.atomic():
        for row in parsed:
            match = by_bss.get(row["bssId"].strip().lower())
            if match is None and row.get("name"):
                match = by_name.get(row["name"].strip().lower())
            if match is None:
                # Validation: this BSS ID is not linked (bound) to this contractor.
                invalid.append(row["bssId"])
                continue
            worker = match["worker"]
            row_site = match["binding"].site if match["binding"].site else site
            row_site_id = row_site.id if row_site else None
            matched_workers.add(worker.id)
            sheet_days = row["days"]

            for day_iso, sheet_status in sheet_days.items():
                attendance_date = date.fromisoformat(day_iso)
                dates.add(attendance_date)
                if upsert(worker, row_site, attendance_date, sheet_status, "Uploaded sheet"):
                    created += 1
                else:
                    updated += 1

            # Register holidays / weekly offs for dates left blank in the sheet.
            if row_site_id:
                if row_site_id not in woff_cache:
                    woff_cache[row_site_id] = _weekly_off_weekdays(row_site)
                weekly_off = woff_cache[row_site_id]
                for day in range_dates:
                    iso = day.isoformat()
                    if iso in sheet_days:
                        continue
                    holiday_name = holiday_map.get((row_site_id, iso))
                    is_weekly_off = day.weekday() in weekly_off
                    if not holiday_name and not is_weekly_off:
                        continue
                    remarks = holiday_name or "Weekly off"
                    if upsert(worker, row_site, day, "HOLIDAY", remarks):
                        created += 1
                    else:
                        updated += 1
                    holidays_registered += 1

    return Response({"data": {
        "created": created, "updated": updated, "holidays": holidays_registered,
        "workers": len(matched_workers), "rows": len(parsed),
        "unknown": invalid, "invalid": invalid, "site": site.site_name if site else site_label,
        "start": min(dates).isoformat() if dates else start,
        "end": max(dates).isoformat() if dates else end,
    }}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_uploaded(request):
    """Attendance rows that came from uploaded sheets, for a date range."""
    from bss_core.models import Attendance

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can view attendance."},
                        status=status.HTTP_403_FORBIDDEN)
    qs = (Attendance.objects.filter(contractor=user, capture_method="SHEET")
          .select_related("worker", "site").order_by("-attendance_date", "worker__username")[:1000])
    start = sheets.parse_date(request.query_params.get("start"))
    end = sheets.parse_date(request.query_params.get("end"))
    rows = []
    for row in qs:
        if start and row.attendance_date < start:
            continue
        if end and row.attendance_date > end:
            continue
        rows.append({
            "id": str(row.id), "date": row.attendance_date.isoformat(),
            "worker": payloads._party_name(row.worker),
            "site": row.site.site_name if row.site else "",
            "status": row.status, "capture": "Uploaded sheet",
        })
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_camera_punch(request):
    """Log an AI CCTV/Camera attendance punch into the core Attendance database table."""
    from bss_core.models import Attendance, AttendanceDevice, Site, User, WorkerIdentity

    data = request.data if isinstance(request.data, dict) else {}
    bss_worker_id = str(data.get("bssWorkerId") or "").strip()
    site_id = data.get("siteId")
    device_code = str(data.get("deviceCode") or "").strip()
    status_val = str(data.get("status") or "PRESENT").strip().upper()
    confidence = data.get("confidencePct") or 98.5

    if not bss_worker_id:
        return Response({"error": "bssWorkerId is required."}, status=status.HTTP_400_BAD_REQUEST)

    identity = WorkerIdentity.objects.filter(bss_worker_id=bss_worker_id).first()
    if not identity or not identity.user:
        return Response({"error": f"Worker with BSS ID '{bss_worker_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

    worker_user = identity.user
    today = date.today()

    site_obj = Site.objects.filter(pk=site_id).first() if site_id else None
    if not site_obj:
        # Fallback to worker's active assigned site if site_id is missing
        from bss_core.models import WorkerContractorBinding
        binding = WorkerContractorBinding.objects.filter(worker=worker_user, binding_status="ACCEPTED").first()
        site_obj = binding.site if binding else Site.objects.first()

    if not site_obj:
        return Response({"error": "No valid site found for attendance recording."}, status=status.HTTP_400_BAD_REQUEST)

    device_obj = AttendanceDevice.objects.filter(device_code=device_code).first() if device_code else None

    # Upsert daily attendance record
    attendance, created = Attendance.objects.update_or_create(
        worker=worker_user,
        attendance_date=today,
        defaults={
            "site": site_obj,
            "contractor": request.user if request.user.role == "contractor" else getattr(site_obj, "owner", None),
            "device": device_obj,
            "status": status_val,
            "capture_method": "CAMERA",
            "verification_type": "face_image",
            "confidence_pct": confidence,
            "is_verified": True,
            "remarks": "AI CCTV Live Camera Punch",
        }
    )

    return Response({
        "message": "AI Attendance punch recorded.",
        "data": {
            "id": str(attendance.id),
            "worker": identity.name or worker_user.username,
            "bssWorkerId": bss_worker_id,
            "site": site_obj.site_name,
            "date": today.isoformat(),
            "status": attendance.status,
            "captureMethod": "CAMERA",
            "confidence": confidence,
            "created": created,
        }
    }, status=status.HTTP_200_OK)


def _site_key(site):
    """Stable label the pipeline tags rows with (matches --site)."""
    return str(getattr(site, "bss_site_id", "") or site.id)


def _worker_for_token(token):
    """Resolve a pipeline detection token to a worker user (BSS id, username,
    or enrolled face name)."""
    from bss_core.models import User, WorkerIdentity

    token = str(token or "").strip()
    if not token:
        return None
    identity = WorkerIdentity.objects.filter(bss_worker_id=token).select_related("user").first()
    if identity and identity.user_id:
        return identity.user
    return User.objects.filter(username=token, role="worker").first()


def _mark_worker_attendance(worker, site, verification, score):
    """Upsert today's CAMERA attendance for one worker (idempotent per day)."""
    from bss_core.models import Attendance

    confidence = None
    try:
        if score is not None:
            value = 1.0 - float(score) if verification == "face_image" else float(score)
            confidence = round(max(0.0, min(1.0, value)) * 100, 2)
    except (TypeError, ValueError):
        confidence = None

    defaults = {
        "site": site,
        "status": "PRESENT",
        "capture_method": "CAMERA",
        "verification_type": verification,
        "is_verified": True,
        "remarks": "AI CCTV site attendance",
        "confidence_pct": confidence,
    }
    record = Attendance.objects.filter(worker=worker, attendance_date=date.today()).first()
    if record:
        for field, val in defaults.items():
            setattr(record, field, val)
        record.save(update_fields=list(defaults.keys()) + ["updated_at"])
        return False
    Attendance.objects.create(worker=worker, attendance_date=date.today(), **defaults)
    return True


def _sync_attendance(site, payload):
    """Best-effort: map the pipeline's recent detections for a site to workers
    and mark today's attendance. Returns a summary."""
    created = updated = 0
    seen = set()
    candidates = []
    for sighting in payload.get("sightings", []):
        worker = _worker_for_token(sighting.get("name"))
        if worker is not None:
            candidates.append((worker, "face_image", sighting.get("distance")))
    for scan in payload.get("codeScans", []):
        worker = _worker_for_token(scan.get("matchedLabel")) or _worker_for_token(scan.get("payload"))
        if worker is not None:
            candidates.append((worker, "qr_worker", scan.get("score")))
    for worker, verification, score in candidates:
        if worker.id in seen:
            continue
        seen.add(worker.id)
        if _mark_worker_attendance(worker, site, verification, score):
            created += 1
        else:
            updated += 1
    return {"workers": len(seen), "created": created, "updated": updated}


def _attendance_marked_today(site):
    from bss_core.models import Attendance

    return Attendance.objects.filter(
        site=site, attendance_date=date.today(), capture_method="CAMERA").count()


def _controllable_site(user, site_id):
    """The site this user may start/stop live attendance for, or None."""
    from bss_core.models import Site

    if not site_id:
        return None
    try:
        site_id = int(site_id)
    except (TypeError, ValueError):
        return None
    if user.role == "employer":
        return Site.objects.filter(pk=site_id, employer=user).first()
    if user.role == "contractor" and site_id in _contractor_site_ids(user):
        return Site.objects.filter(pk=site_id).first()
    return None


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_camera_session(request):
    """Start/stop the live CCTV attendance pipeline for one site and read its
    recent detections. Employers control their own sites; contractors only
    sites allotted to them (APPROVED)."""
    from .. import attendance_control as control

    if request.method == "GET":
        site_id = request.query_params.get("siteId")
        action, source = "status", None
    else:
        body = request.data if isinstance(request.data, dict) else {}
        site_id = body.get("siteId")
        action = str(body.get("action") or "status").strip().lower()
        source = body.get("source")

    site = _controllable_site(request.user, site_id)
    if site is None:
        return Response({"error": "You do not have access to this site."},
                        status=status.HTTP_403_FORBIDDEN)

    key = _site_key(site)
    try:
        if action == "start":
            control.start_session(key, source=source)
        elif action == "stop":
            control.stop_session(key)
        session = control.session_for(key)
        payload = control.detections(key, limit=50)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)

    running = bool(session and session.get("active"))
    marked = _sync_attendance(site, payload) if (action == "sync" and running) else None

    return Response({"data": {
        "siteId": site.id,
        "siteKey": key,
        "siteName": site.site_name,
        "running": running,
        "session": session,
        "sightings": payload.get("sightings", []),
        "codeScans": payload.get("codeScans", []),
        "marked": marked,
        "markedToday": _attendance_marked_today(site),
    }}, status=status.HTTP_200_OK)
