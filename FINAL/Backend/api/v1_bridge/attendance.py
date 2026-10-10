"""Contractor attendance sheet upload: download a BSS-ID / date-range CSV
template, upload the filled sheet (CSV/XLSX), and sync the rows into the
existing ``Attendance`` table marked as ``capture_method="SHEET"``.
"""

import io
import re
from datetime import date, timedelta

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


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_uploaded(request):
    """GET: attendance rows that came from uploaded sheets, for a date range.
    POST: the contractor marks today's attendance for a scanned worker.

    This exact path (``contractor/attendance``) is registered ahead of the
    generic portal-mutation route, so the POST that the QR-scan page sends must
    be served here too — otherwise it 405s against this GET-only view.
    """
    from bss_core.models import Attendance

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can view or mark attendance."},
                        status=status.HTTP_403_FORBIDDEN)
    if request.method == "POST":
        from .common import PortalMutationError
        from .leave import _handle_mark_attendance
        try:
            attendance_id = _handle_mark_attendance(user, request.data or {})
        except PortalMutationError as exc:
            return Response({"error": exc.message}, status=exc.status_code)
        return Response({"success": True, "data": {"id": attendance_id}},
                        status=status.HTTP_200_OK)
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


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_attendance_records(request):
    """Month-wise, per-site attendance records (ALL sources: QR / RFID / CCTV /
    Self GPS / uploaded sheet) for a contractor's own workers, with full detail."""
    from django.db.models import Q

    from bss_core.models import Attendance, WorkerContractorBinding

    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can view attendance records."},
                        status=status.HTTP_403_FORBIDDEN)

    worker_ids = list(WorkerContractorBinding.objects
                      .filter(contractor=user, binding_status="ACCEPTED")
                      .values_list("worker_id", flat=True))
    qs = (Attendance.objects
          .filter(Q(contractor=user) | Q(worker_id__in=worker_ids))
          .select_related("worker", "site", "worker__worker_identity"))

    site_id = request.query_params.get("siteId")
    if site_id:
        try:
            qs = qs.filter(site_id=int(site_id))
        except (TypeError, ValueError):
            pass

    start = end = None
    month = (request.query_params.get("month") or "").strip()  # YYYY-MM
    if month:
        try:
            year, mon = (int(part) for part in month.split("-")[:2])
            start = date(year, mon, 1)
            end = (date(year + (1 if mon == 12 else 0), 1 if mon == 12 else mon + 1, 1)
                   - timedelta(days=1))
        except (ValueError, TypeError):
            start = end = None
    else:
        start = sheets.parse_date(request.query_params.get("start"))
        end = sheets.parse_date(request.query_params.get("end"))

    if start:
        qs = qs.filter(attendance_date__gte=start)
    if end:
        qs = qs.filter(attendance_date__lte=end)

    rows = []
    for a in qs.order_by("-attendance_date", "worker__username")[:2000]:
        detail = payloads.attendance_detail(a)
        identity = getattr(a.worker, "worker_identity", None)
        detail["worker"] = payloads._party_name(a.worker)
        detail["bssId"] = getattr(identity, "bss_worker_id", "") if identity else ""
        rows.append(detail)
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_attendance_records(request):
    """Month-wise, per-site attendance records (ALL sources: QR / RFID / CCTV /
    Self GPS / uploaded sheet) for an employer's own workers, with full detail."""
    from django.db.models import Q

    from bss_core.models import Attendance, WorkerContractorBinding

    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can view attendance records."},
                        status=status.HTTP_403_FORBIDDEN)

    worker_ids = list(WorkerContractorBinding.objects
                      .filter(site__employer=user, binding_status="ACCEPTED")
                      .values_list("worker_id", flat=True))
    qs = (Attendance.objects
          .filter(Q(site__employer=user) | Q(worker_id__in=worker_ids))
          .select_related("worker", "site", "worker__worker_identity"))

    site_id = request.query_params.get("siteId")
    if site_id:
        try:
            qs = qs.filter(site_id=int(site_id))
        except (TypeError, ValueError):
            pass

    start = end = None
    month = (request.query_params.get("month") or "").strip()  # YYYY-MM
    if month:
        try:
            year, mon = (int(part) for part in month.split("-")[:2])
            start = date(year, mon, 1)
            end = (date(year + (1 if mon == 12 else 0), 1 if mon == 12 else mon + 1, 1)
                   - timedelta(days=1))
        except (ValueError, TypeError):
            start = end = None
    else:
        start = sheets.parse_date(request.query_params.get("start"))
        end = sheets.parse_date(request.query_params.get("end"))

    if start:
        qs = qs.filter(attendance_date__gte=start)
    if end:
        qs = qs.filter(attendance_date__lte=end)

    rows = []
    for a in qs.order_by("-attendance_date", "worker__username")[:2000]:
        detail = payloads.attendance_detail(a)
        identity = getattr(a.worker, "worker_identity", None)
        detail["worker"] = payloads._party_name(a.worker)
        detail["bssId"] = getattr(identity, "bss_worker_id", "") if identity else ""
        rows.append(detail)
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


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_face_enroll(request):
    """Store a worker's own face photos and enrol them into the pipeline
    gallery under their BSS id, so AI attendance can recognise them."""
    from datetime import datetime
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage

    from bss_core.models import WorkerIdentity
    from .. import attendance_control as control

    if request.user.role != "worker":
        return Response({"error": "Only workers can enrol their own face."},
                        status=status.HTTP_403_FORBIDDEN)
    identity = WorkerIdentity.objects.filter(user=request.user).first()
    person = str(getattr(identity, "bss_worker_id", "") or "").strip()
    if not person:
        return Response({"error": "This account has no BSS worker id."},
                        status=status.HTTP_400_BAD_REQUEST)

    body = request.data if isinstance(request.data, dict) else {}
    images = body.get("images") or ([body.get("image")] if body.get("image") else [])
    images = [str(i) for i in images if i]
    if len(images) != 5:
        return Response({"error": "All 5 face photos are mandatory — add all five before saving."},
                        status=status.HTTP_400_BAD_REQUEST)

    # 0) Reject identical photos. The attendance engine collapses identical face
    #    vectors, so a repeated capture would enrol fewer than 5 — require five
    #    distinct captures (a common cause of a "2/5 enrolled" count).
    import base64 as _b64
    import hashlib as _hashlib
    seen_hashes: dict = {}
    duplicate_slots = []
    for index, data_url in enumerate(images):
        raw = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
        try:
            decoded = _b64.b64decode(raw)
        except Exception:  # noqa: BLE001
            decoded = b""
        digest = _hashlib.md5(decoded).hexdigest() if decoded else f"empty-{index}"
        if digest in seen_hashes:
            duplicate_slots.append(index + 1)  # 1-based slot numbers for the UI
        else:
            seen_hashes[digest] = index
    if duplicate_slots:
        return Response({
            "error": "Some photos are identical — each of the 5 must be a different capture. "
                     "Retake the highlighted photo(s).",
            "duplicateErrors": duplicate_slots,
        }, status=status.HTTP_400_BAD_REQUEST)

    # 1) Validate EVERY photo has a detectable face BEFORE saving anything, so a
    #    non-face image (e.g. a bottle) is rejected and nothing is persisted.
    try:
        check = control.check_faces(images)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)
    results = check.get("results") or []
    failed = [r.get("index") for r in results if not r.get("face")]
    if len(results) != len(images) or failed:
        return Response({
            "error": "Some photos failed the face check (no face / too small / blurry). Retake the highlighted ones.",
            "photoErrors": failed, "results": results,
        }, status=status.HTTP_400_BAD_REQUEST)

    # 2) All five valid → replace any previous photos, save the raw files (kept
    #    for audit/re-enrolment), record them, then enrol the vectors.
    from bss_core.models import WorkerFacePhoto
    for old in WorkerFacePhoto.objects.filter(user=request.user):
        try:
            default_storage.delete(old.path)
        except Exception:  # noqa: BLE001
            pass
        old.delete()

    saved = 0
    created_photos = []
    for index, data_url in enumerate(images):
        try:
            encoded = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
            raw = __import__("base64").b64decode(encoded)
        except Exception:
            continue
        name = f"worker_face_photos/{person}/{datetime.utcnow():%Y%m%d%H%M%S}_{index}.jpg"
        path = default_storage.save(name, ContentFile(raw))
        try:
            created_photos.append(WorkerFacePhoto.objects.create(
                user=request.user, person=person, slot=index + 1, path=path))
        except Exception:  # noqa: BLE001 — never lose the pipeline enrollment over a DB write
            pass
        saved += 1

    try:
        result = control.enroll(person, images)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc), "saved": saved}, status=exc.status_code)

    # Compute the Aadhaar face match ONCE, here at upload, and store it on each
    # photo — it is final and never recomputed (no refresh-time engine calls).
    matches = []
    reference = _aadhaar_reference_b64(request.user)
    if reference and created_photos:
        try:
            comparison = control.compare_faces(reference, images)
            cmp_results = comparison.get("results") or []
            for photo in created_photos:
                r0 = cmp_results[photo.slot - 1] if 0 <= photo.slot - 1 < len(cmp_results) else None
                if r0 and r0.get("face"):
                    photo.aadhaar_match_pct = r0.get("cosinePct")
                    photo.aadhaar_matched = r0.get("matched")
                photo.aadhaar_checked_at = timezone.now()
                photo.save(update_fields=["aadhaar_match_pct", "aadhaar_matched", "aadhaar_checked_at"])
                matches.append({
                    "slot": photo.slot,
                    "cosinePct": float(photo.aadhaar_match_pct) if photo.aadhaar_match_pct is not None else None,
                    "matched": photo.aadhaar_matched,
                })
        except control.AttendanceControlError:
            pass  # advisory — never block enrolment on the Aadhaar comparison

    return Response({"data": {
        "person": person,
        "saved": saved,
        "enrolled": result.get("added", 0),
        "results": results,
        "matches": matches,
    }}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_face_check(request):
    """Detect-only face check for one photo (no save) — live UI feedback."""
    from .. import attendance_control as control
    if request.user.role != "worker":
        return Response({"error": "Only workers can check their own face."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    images = body.get("images") or ([body.get("image")] if body.get("image") else [])
    images = [str(i) for i in images if i]
    if not images:
        return Response({"error": "No image supplied."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        result = control.check_faces(images)
    except control.AttendanceControlError as exc:
        return Response({"error": str(exc)}, status=exc.status_code)
    return Response({"data": result}, status=status.HTTP_200_OK)


def _aadhaar_reference_b64(user):
    """The worker's verified Aadhaar photo as a base64 data URL (or None)."""
    import base64
    import os

    from django.conf import settings as dj_settings

    from bss_core.models import AadhaarChallenge

    challenge = (AadhaarChallenge.objects
                 .filter(user=user, status="VERIFIED")
                 .exclude(photo_path="")
                 .order_by("-updated_at", "-id").first())
    if challenge is None or not challenge.photo_path:
        return None
    filename = os.path.basename(challenge.photo_path)
    for path in (os.path.join(getattr(dj_settings, "AADHAAR_PHOTO_DIR", ""), filename),
                 os.path.join(getattr(dj_settings, "MEDIA_ROOT", ""), "aadhaar", filename),
                 os.path.join(getattr(dj_settings, "MEDIA_ROOT", ""), "aadhaar_photos", filename)):
        if path and os.path.isfile(path):
            with open(path, "rb") as handle:
                return "data:image/jpeg;base64," + base64.b64encode(handle.read()).decode("ascii")
    return None


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_face_status(request):
    """Enrolment status for the current worker: how many face vectors are
    enrolled, plus how many stored photos there are and how many are distinct
    (duplicate captures collapse into one vector)."""
    import hashlib

    from django.core.files.storage import default_storage

    from bss_core.models import WorkerFacePhoto, WorkerIdentity
    from .. import attendance_control as control

    identity = WorkerIdentity.objects.filter(user=request.user).first()
    person = str(getattr(identity, "bss_worker_id", "") or "").strip()
    enrolled = 0
    if person:
        try:
            enrolled = int(control.enroll_status(person).get("enrolled", 0))
        except Exception:  # noqa: BLE001 — pipeline offline just reports 0
            enrolled = 0

    photos = list(WorkerFacePhoto.objects.filter(user=request.user))
    hashes = set()
    for photo in photos:
        if not photo.path:
            continue
        try:
            hashes.add(hashlib.md5(default_storage.open(photo.path, "rb").read()).hexdigest())
        except Exception:  # noqa: BLE001
            pass
    return Response({"data": {
        "person": person,
        "enrolled": enrolled,
        "photoCount": len(photos),
        "distinctPhotos": len(hashes) if photos else 0,
    }}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_face_photos(request):
    """The raw face photos kept for the current worker, including the stored
    Aadhaar match % (computed once at upload — never recomputed here)."""
    from bss_core.models import WorkerFacePhoto

    photos = WorkerFacePhoto.objects.filter(user=request.user).order_by("slot", "id")
    return Response({"data": [
        {"id": p.id, "slot": p.slot, "url": f"/v1/worker/face-photos/{p.id}/file",
         "aadhaarMatchPct": float(p.aadhaar_match_pct) if p.aadhaar_match_pct is not None else None,
         "aadhaarMatched": p.aadhaar_matched}
        for p in photos
    ]}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_face_photo_file(request, photo_id):
    """Stream one stored face photo (owner only)."""
    from django.core.files.storage import default_storage
    from django.http import FileResponse

    from bss_core.models import WorkerFacePhoto
    photo = WorkerFacePhoto.objects.filter(pk=photo_id, user=request.user).first()
    if photo is None or not photo.path:
        return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)
    try:
        handle = default_storage.open(photo.path, "rb")
    except Exception:  # noqa: BLE001
        return Response({"error": "file missing"}, status=status.HTTP_404_NOT_FOUND)
    return FileResponse(handle, content_type="image/jpeg")


def _haversine_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in metres between two WGS84 points."""
    import math

    radius = 6371000.0
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    dphi = math.radians(float(lat2) - float(lat1))
    dlambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


DEFAULT_GEOFENCE_RADIUS_M = 100.0
GPS_TOLERANCE_MAX_M = 50.0


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def worker_mark_attendance_site(request):
    """Worker marks today's attendance by scanning the site's own QR while on site.

    The mark is ALWAYS recorded (never rejected) as capture_method="SELF" /
    verification_type="gps_self", with the GPS coordinates, distance from the
    site and the accuracy stored. It is flagged when outside the site geo-fence
    (default radius 100 m). A worker may only scan a site they are bound to, and
    a second attempt on the same day returns "already marked"."""
    from bss_core.models import Attendance, Site, WorkerContractorBinding

    if request.user.role != "worker":
        return Response({"error": "Only workers can mark their own attendance."},
                        status=status.HTTP_403_FORBIDDEN)
    body = request.data if isinstance(request.data, dict) else {}
    site_token = str(body.get("siteToken") or "").strip()
    if not site_token:
        return Response({"error": "Scan the site QR to mark attendance."},
                        status=status.HTTP_400_BAD_REQUEST)
    site = Site.objects.filter(site_qr_token=site_token).first()
    if site is None:
        return Response({"error": "Unknown site QR."}, status=status.HTTP_404_NOT_FOUND)

    binding = (WorkerContractorBinding.objects
               .filter(worker=request.user, site=site, binding_status="ACCEPTED")
               .first())
    if binding is None:
        return Response({"error": "You are not bound to this site."},
                        status=status.HTTP_403_FORBIDDEN)

    today = timezone.localdate()
    existing = (Attendance.objects.filter(worker=request.user, attendance_date=today)
                .order_by("id").first())
    if existing is not None:
        return Response({"data": {
            "alreadyMarked": True,
            "site": site.site_name,
            "capture": existing.capture_method,
            "record": {
                "id": str(existing.id),
                "status": existing.status,
                "capture": existing.capture_method,
                "checkIn": existing.check_in_time.isoformat() if existing.check_in_time else None,
            },
        }}, status=status.HTTP_200_OK)

    try:
        lat = float(body.get("lat"))
        lng = float(body.get("lng"))
    except (TypeError, ValueError):
        return Response({"error": "Location is required to mark attendance."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        accuracy = float(body.get("accuracy")) if body.get("accuracy") is not None else None
    except (TypeError, ValueError):
        accuracy = None

    now = timezone.now()
    radius = float(site.geo_fence_radius or DEFAULT_GEOFENCE_RADIUS_M)
    defaults = {
        "contractor": binding.contractor,
        "status": "PRESENT",
        "capture_method": "SELF",
        "verification_type": "gps_self",
        "check_in_time": now,
        "is_verified": True,
        "gps_lat": round(lat, 6),
        "gps_long": round(lng, 6),
        "gps_accuracy_m": accuracy,
    }

    distance = within = clubbed = None
    remarks = "Self attendance via site QR"
    if site.latitude is not None and site.longitude is not None:
        distance = _haversine_m(lat, lng, float(site.latitude), float(site.longitude))
        tolerance = min(accuracy or 0.0, GPS_TOLERANCE_MAX_M)
        within = distance <= radius
        clubbed = distance <= radius + tolerance
        defaults["gps_distance_m"] = round(distance, 2)
        defaults["is_geofence_ok"] = bool(within or clubbed)
        if not (within or clubbed):
            remarks = (f"Self attendance flagged outside geo-fence "
                       f"({distance - radius:.0f} m beyond the {radius:.0f} m radius)")
        elif not within:
            remarks = (f"Self attendance within GPS tolerance "
                       f"({distance:.0f} m vs {radius:.0f} m radius)")
        else:
            remarks = f"Self attendance within geo-fence ({distance:.0f} m)"
    else:
        defaults["is_geofence_ok"] = None
        defaults["gps_distance_m"] = None
        remarks = "No site reference coordinates found"
    defaults["remarks"] = remarks[:255]

    attendance = Attendance.objects.create(
        worker=request.user, site=site, attendance_date=today, **defaults)

    return Response({"data": {
        "alreadyMarked": False,
        "id": str(attendance.id),
        "site": site.site_name,
        "within": within,
        "clubbed": clubbed,
        "distanceM": round(distance, 1) if distance is not None else None,
        "radiusM": radius if distance is not None else None,
        "outsideM": round(max(0.0, distance - radius), 1) if distance is not None else None,
        "accuracyM": round(accuracy, 1) if accuracy is not None else None,
        "geofenceOk": defaults["is_geofence_ok"],
        "remarks": remarks,
    }}, status=status.HTTP_201_CREATED)


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


def _mark_worker_attendance(worker, site, verification, score, camera_label="", camera_area=""):
    """Upsert today's CAMERA attendance for one worker (idempotent per day)."""
    from bss_core.models import Attendance, WorkerContractorBinding

    confidence = None
    try:
        if score is not None:
            value = 1.0 - float(score) if verification == "face_image" else float(score)
            confidence = round(max(0.0, min(1.0, value)) * 100, 2)
    except (TypeError, ValueError):
        confidence = None

    # Attribute the CCTV mark to the worker's contractor (if currently bound) so
    # camera rows carry the same source attribution as QR / RFID / sheet.
    binding = (WorkerContractorBinding.objects
               .filter(worker=worker, binding_status="ACCEPTED")
               .order_by("-id").first())

    defaults = {
        "site": site,
        "contractor": binding.contractor if binding else None,
        "status": "PRESENT",
        "capture_method": "CAMERA",
        "verification_type": verification,
        "is_verified": True,
        "remarks": "AI CCTV site attendance",
        "confidence_pct": confidence,
        "camera_label": camera_label or "",
        "camera_area": camera_area or "",
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
    and mark today's attendance. Records which camera/area produced each mark."""
    from bss_core.models import SiteCctvCamera

    area_map = {c.label: (c.area or c.label) for c in SiteCctvCamera.objects.filter(site=site)}
    created = updated = 0
    seen = set()
    candidates = []
    for sighting in payload.get("sightings", []):
        worker = _worker_for_token(sighting.get("name"))
        if worker is not None:
            cam = str(sighting.get("camera") or "")
            candidates.append((worker, "face_image", sighting.get("distance"), cam, area_map.get(cam, "")))
    for scan in payload.get("codeScans", []):
        worker = _worker_for_token(scan.get("matchedLabel")) or _worker_for_token(scan.get("payload"))
        if worker is not None:
            cam = str(scan.get("camera") or "")
            candidates.append((worker, "qr_worker", scan.get("score"), cam, area_map.get(cam, "")))
    for worker, verification, score, camera_label, camera_area in candidates:
        if worker.id in seen:
            continue
        seen.add(worker.id)
        if _mark_worker_attendance(worker, site, verification, score, camera_label, camera_area):
            created += 1
        else:
            updated += 1
    return {"workers": len(seen), "created": created, "updated": updated}


def _attendance_marked_today(site):
    from bss_core.models import Attendance

    return Attendance.objects.filter(
        site=site, attendance_date=date.today(), capture_method="CAMERA").count()


def _controllable_site(user, site_id):
    """The site this user may start/stop live CCTV attendance for, or None.

    CCTV is an employer-only capability (employer configures the cameras and
    controls the engine). Contractors have no access to the CCTV system."""
    from bss_core.models import Site

    if not site_id:
        return None
    try:
        site_id = int(site_id)
    except (TypeError, ValueError):
        return None
    if user.role == "employer":
        return Site.objects.filter(pk=site_id, employer=user).first()
    return None


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def attendance_camera_session(request):
    """Start/stop the site's CCTV attendance engine and read its recent
    detections. Attendance runs ONLY from the employer-configured CCTV feeds —
    a device/webcam source is never accepted. CCTV is employer-only: each
    employer controls their own sites."""
    from bss_core.models import SiteCctvCamera
    from .. import attendance_control as control
    from .cctv import cameras_for_site

    if request.method == "GET":
        site_id = request.query_params.get("siteId")
        action = "status"
    else:
        body = request.data if isinstance(request.data, dict) else {}
        site_id = body.get("siteId")
        action = str(body.get("action") or "status").strip().lower()

    site = _controllable_site(request.user, site_id)
    if site is None:
        return Response({"error": "You do not have access to this site."},
                        status=status.HTTP_403_FORBIDDEN)

    if action == "frame":
        return Response({"error": "Device-camera attendance is disabled. Attendance is captured from the site's configured CCTV feeds."},
                        status=status.HTTP_400_BAD_REQUEST)

    key = _site_key(site)
    configured = list(SiteCctvCamera.objects.filter(site=site).order_by("sort_order", "id"))
    display = [{"id": c.id, "siteId": c.site_id, "label": c.label, "area": c.area or c.label,
                "enabled": c.enabled, "configured": bool(c.build_source())} for c in configured]
    try:
        if action == "start":
            cams = cameras_for_site(site)
            if not cams:
                return Response({"error": "No CCTV cameras are configured for this site. Add them in CCTV Setup first."},
                                status=status.HTTP_400_BAD_REQUEST)
            control.start_session(key, cameras=cams)
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
        "cameras": display,
        "sightings": payload.get("sightings", []),
        "codeScans": payload.get("codeScans", []),
        "marked": marked,
        "markedToday": _attendance_marked_today(site),
    }}, status=status.HTTP_200_OK)
