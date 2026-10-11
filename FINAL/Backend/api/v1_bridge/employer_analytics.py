"""Employer analytics — tab-dispatched aggregates across the employer's sites.

Route: GET /v1/employer/analytics?tab=<tab>&period=&from=&to=&siteId=&contractorId=
Tabs: live, overview, attendance, workforce, compliance, payroll, contractors,
      access, grievances.

All data is scoped to sites owned by the requesting employer and their accepted
contractors. Aggregates are computed in-process (small, per-employer datasets).
"""

# ruff: noqa: F401,F403
from datetime import date, datetime, time as _time, timedelta

from .common import *  # noqa: F401,F403


def _employer_only(request):
    return getattr(request.user, "role", "") == "employer"


SOURCE_LABEL = {"QR": "QR Scan", "NFC": "RFID", "CAMERA": "CCTV",
                "SELF": "Self (GPS)", "SHEET": "Uploaded sheet"}


def _site_ids(user):
    from bss_core.models import Site
    return list(Site.objects.filter(employer=user).values_list("id", flat=True))


def _contractor_ids(user):
    from bss_core.models import ContractorEmployerBinding
    return set(ContractorEmployerBinding.objects
               .filter(employer=user, binding_status="ACCEPTED")
               .values_list("contractor_id", flat=True))


def _bindings(user, site_id=None, contractor_id=None):
    from bss_core.models import WorkerContractorBinding
    qs = (WorkerContractorBinding.objects
          .filter(site__employer=user, binding_status="ACCEPTED",
                  contractor_id__in=_contractor_ids(user))
          .select_related("worker", "contractor", "site"))
    if site_id:
        qs = qs.filter(site_id=site_id)
    if contractor_id:
        qs = qs.filter(contractor_id=contractor_id)
    return qs


def _period_range(period, from_s, to_s):
    today = timezone.localdate()
    period = (period or "month").lower()
    if period == "custom":
        start = _parse_date(from_s) or today
        end = _parse_date(to_s) or today
        if start > end:
            start, end = end, start
        return start, end
    if period in ("live", "today"):
        return today, today
    if period == "week":
        return today - timedelta(days=6), today
    if period == "3m":
        return today - timedelta(days=89), today
    if period == "6m":
        return today - timedelta(days=179), today
    if period == "12m":
        return today - timedelta(days=364), today
    # month (default)
    return today.replace(day=1), today


def _parse_date(text):
    try:
        return date.fromisoformat(str(text)[:10])
    except (ValueError, TypeError):
        return None


def _bucket_of(d, period):
    if period in ("live", "today"):
        return d.strftime("%H:00")
    if period == "3m":
        iso = d.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    if period in ("6m", "12m"):
        return d.strftime("%Y-%m")
    return d.isoformat()


def _bucket_sequence(start, end, period):
    out = []
    if period in ("live", "today"):
        return [f"{h:02d}:00" for h in range(24)]
    if period == "3m":
        cur = start
        while cur <= end:
            iso = cur.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            if key not in out:
                out.append(key)
            cur += timedelta(days=1)
        return out
    if period in ("6m", "12m"):
        cur = start.replace(day=1)
        while cur <= end:
            key = cur.strftime("%Y-%m")
            if key not in out:
                out.append(key)
            cur = (cur.replace(day=28) + timedelta(days=4)).replace(day=1)
        return out
    cur = start
    while cur <= end:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _label_for(key, period):
    if period in ("live", "today"):
        return key
    if period == "3m":
        return key
    if period in ("6m", "12m"):
        try:
            return datetime.strptime(key, "%Y-%m").strftime("%b %Y")
        except ValueError:
            return key
    try:
        return datetime.strptime(key, "%Y-%m-%d").strftime("%d %b")
    except ValueError:
        return key


def _attendance_qs(user, worker_ids, start, end, site_id=None):
    from bss_core.models import Attendance
    qs = Attendance.objects.filter(worker_id__in=worker_ids,
                                   attendance_date__gte=start, attendance_date__lte=end)
    if site_id:
        qs = qs.filter(site_id=site_id)
    return qs


def _live(user, site_id, contractor_id):
    from bss_core.models import Attendance, AttendanceEvent, Site

    today = timezone.localdate()
    bindings = list(_bindings(user, site_id, contractor_id))
    bound_ids = {b.worker_id for b in bindings}
    worker_site = {b.worker_id: b.site_id for b in bindings}
    worker_contractor = {b.worker_id: _org(b.contractor) for b in bindings}

    atts = list(Attendance.objects.filter(worker_id__in=bound_ids, attendance_date=today)
                .select_related("site"))
    by_worker = {a.worker_id: a for a in atts}
    on_site_ids = {a.worker_id for a in atts if (a.last_punch_type or "IN") == "IN"}
    present_ids = set(by_worker.keys())
    out_ids = {a.worker_id for a in atts if (a.last_punch_type or "") == "OUT"}

    sites = Site.objects.filter(employer=user)
    if site_id:
        sites = sites.filter(id=site_id)
    by_site = []
    for s in sites:
        ids = {w for w, sid in worker_site.items() if sid == s.id}
        by_site.append({
            "site": s.site_name, "workers": len(ids),
            "onSite": len(ids & on_site_ids), "present": len(ids & present_ids),
        })

    contractor_map = {}
    for w in bound_ids:
        name = worker_contractor.get(w) or "—"
        row = contractor_map.setdefault(name, {"contractor": name, "workers": 0, "onSite": 0, "present": 0})
        row["workers"] += 1
        if w in present_ids:
            row["present"] += 1
        if w in on_site_ids:
            row["onSite"] += 1

    hourly = {f"{h:02d}:00": 0 for h in range(24)}
    for a in atts:
        if a.check_in_time:
            hourly[timezone.localtime(a.check_in_time).strftime("%H:00")] += 1

    events = (AttendanceEvent.objects
              .filter(worker_id__in=bound_ids, attendance_date=today)
              .select_related("worker", "site").order_by("-at")[:40])
    recent = [{
        "worker": _worker_name(e.worker), "bssId": _worker_bss(e.worker),
        "site": e.site.site_name if e.site else "", "source": e.source,
        "type": e.event_type, "at": payloads._dts(e.at),
    } for e in events]

    return {
        "generatedAt": payloads._dts(timezone.now()),
        "onSiteNow": len(on_site_ids),
        "boundWorkers": len(bound_ids),
        "today": {"present": len(present_ids), "onSite": len(on_site_ids),
                  "checkedOut": len(out_ids), "notArrived": len(bound_ids) - len(present_ids)},
        "bySite": by_site,
        "byContractor": sorted(contractor_map.values(), key=lambda r: -r["workers"]),
        "hourlyArrivals": [{"label": k, "value": v} for k, v in hourly.items()],
        "recentEvents": recent,
    }


def _kpis(user, worker_ids, start, end, site_id):
    from bss_core.models import Attendance
    bindings = _bindings(user, site_id)
    workers = bindings.count()
    sites = len(_site_ids(user))
    contractors = len(_contractor_ids(user))
    atts = _attendance_qs(user, worker_ids, start, end, site_id)
    total = atts.count()
    present = atts.filter(status="PRESENT").count()
    absent = atts.filter(status="ABSENT").count()
    leave = atts.filter(status="LEAVE").count()
    rate = int(round(present * 100 / total)) if total else 0
    today = timezone.localdate()
    today_rows = atts.filter(attendance_date=today)
    payroll = _payroll_agg(user)
    gate = _gate_agg(user)
    grievances = _grievance_rows(user)
    from bss_core.models import WorkerDocument
    docs = WorkerDocument.objects.filter(user_id__in=worker_ids)
    expiring = sum(1 for d in docs if str(d.status).upper() in ("EXPIRED", "MISSING", "REJECTED"))
    return {
        "workers": workers, "activeSites": sites, "contractors": contractors,
        "attendanceRate": rate,
        "presentToday": today_rows.filter(status="PRESENT").count(),
        "absentToday": today_rows.filter(status="ABSENT").count(),
        "period": {"total": total, "present": present, "absent": absent, "leave": leave},
        "payrollProcessed": payroll["total"], "payrollExceptions": payroll["exceptions"],
        "activeGatePasses": gate["active"], "openGrievances": grievances["open"],
        "documentsExpiring": expiring,
    }


def _org(user):
    if user is None:
        return ""
    cp = getattr(user, "contractor_profile", None)
    ep = getattr(user, "employer_profile", None)
    if cp:
        return cp.contractor_name or cp.trade_name or user.username
    if ep:
        return ep.employer_name or ep.trade_name or user.username
    return user.username


def _worker_name(u):
    wi = getattr(u, "worker_identity", None)
    return (wi.name if wi and wi.name else u.username)


def _worker_bss(u):
    wi = getattr(u, "worker_identity", None)
    return (wi.bss_worker_id if wi else "") or ""


def _overview(user, site_id, contractor_id, start, end):
    from bss_core.models import Attendance
    worker_ids = set(_bindings(user, site_id, contractor_id).values_list("worker_id", flat=True))
    kpis = _kpis(user, worker_ids, start, end, site_id)
    atts = list(_attendance_qs(user, worker_ids, start, end, site_id))
    seq = _bucket_sequence(start, end, "month" if (end - start).days > 31 else "week")
    trend_map = {k: 0 for k in seq}
    for a in atts:
        if a.status == "PRESENT":
            k = _bucket_of(a.attendance_date, "month" if (end - start).days > 31 else "week")
            if k in trend_map:
                trend_map[k] += 1
    alerts = _alerts(user, worker_ids, kpis)
    return {
        "kpis": kpis,
        "trend": [{"label": _label_for(k, "month" if (end - start).days > 31 else "week"), "value": v}
                  for k, v in trend_map.items()],
        "alerts": alerts,
    }


def _alerts(user, worker_ids, kpis):
    rows = []
    if kpis["attendanceRate"] < 85 and kpis["period"]["total"]:
        rows.append({"tone": "red", "label": f"Attendance rate {kpis['attendanceRate']}% this period",
                     "href": "/employer/attendance"})
    if kpis["payrollExceptions"]:
        rows.append({"tone": "red", "label": f"{kpis['payrollExceptions']} payroll exception(s)",
                     "href": "/employer/payroll?tab=exceptions"})
    if kpis["documentsExpiring"]:
        rows.append({"tone": "orange", "label": f"{kpis['documentsExpiring']} worker document(s) expiring/missing",
                     "href": "/employer/admin/documents"})
    if kpis["openGrievances"]:
        rows.append({"tone": "orange", "label": f"{kpis['openGrievances']} open grievance(s)",
                     "href": "/employer/grievances"})
    return rows


def _attendance(user, site_id, contractor_id, start, end, period):
    from bss_core.models import Attendance, Site
    worker_ids = set(_bindings(user, site_id, contractor_id).values_list("worker_id", flat=True))
    atts = list(_attendance_qs(user, worker_ids, start, end, site_id))
    seq = _bucket_sequence(start, end, period)
    buckets = {k: {"present": 0, "absent": 0, "leave": 0, "late": 0, "halfDay": 0} for k in seq}
    source = {}
    geofence_bad = 0
    by_site = {}
    checkin_minutes = []
    for a in atts:
        k = _bucket_of(a.attendance_date, period)
        b = buckets.get(k)
        if b is not None:
            st = str(a.status)
            if st == "PRESENT":
                b["present"] += 1
            elif st == "ABSENT":
                b["absent"] += 1
            elif st == "LEAVE":
                b["leave"] += 1
            elif st == "LATE":
                b["late"] += 1
            elif st == "HALF_DAY":
                b["halfDay"] += 1
        source[a.capture_method] = source.get(a.capture_method, 0) + 1
        if a.is_geofence_ok is False:
            geofence_bad += 1
        if a.site_id:
            row = by_site.setdefault(a.site_id, {"present": 0, "total": 0})
            row["total"] += 1
            if str(a.status) == "PRESENT":
                row["present"] += 1
        if a.check_in_time:
            lt = timezone.localtime(a.check_in_time)
            checkin_minutes.append(lt.hour * 60 + lt.minute)
    site_names = {s.id: s.site_name for s in Site.objects.filter(employer=user)}
    by_site_rows = []
    for sid, r in by_site.items():
        by_site_rows.append({"site": site_names.get(sid, ""), "total": r["total"],
                             "present": r["present"],
                             "rate": int(round(r["present"] * 100 / r["total"])) if r["total"] else 0})
    by_site_rows.sort(key=lambda x: -x["rate"])
    avg_in = ""
    if checkin_minutes:
        m = int(sum(checkin_minutes) / len(checkin_minutes))
        avg_in = f"{m // 60:02d}:{m % 60:02d}"

    return {
        "trend": [{"label": _label_for(k, period), **buckets[k]} for k in seq],
        "bySite": by_site_rows,
        "sourceMix": [{"source": SOURCE_LABEL.get(s, s), "value": v} for s, v in source.items()],
        "geofenceExceptions": geofence_bad,
        "avgCheckIn": avg_in,
        "totalRecords": len(atts),
    }


def _workforce(user, site_id, contractor_id, start, end):
    from bss_core.models import WorkerIdentity, WorkerDocument
    bindings = list(_bindings(user, site_id, contractor_id))
    worker_ids = {b.worker_id for b in bindings}
    by_site, by_contractor = {}, {}
    for b in bindings:
        sname = b.site.site_name if b.site else "—"
        by_site[sname] = by_site.get(sname, 0) + 1
        cname = _org(b.contractor)
        by_contractor[cname] = by_contractor.get(cname, 0) + 1
    identities = list(WorkerIdentity.objects.filter(user_id__in=worker_ids))
    gender, blood, desig_month = {}, {}, {}
    today = timezone.localdate()
    age_bands = {"<25": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0, "Unknown": 0}
    verified = 0
    for wi in identities:
        gender[wi.gender or "Unknown"] = gender.get(wi.gender or "Unknown", 0) + 1
        blood[wi.blood_group or "Unknown"] = blood.get(wi.blood_group or "Unknown", 0) + 1
        if wi.aadhaar:
            verified += 1
        if wi.date_of_birth:
            age = today.year - wi.date_of_birth.year - ((today.month, today.day) < (wi.date_of_birth.month, wi.date_of_birth.day))
            band = "<25" if age < 25 else "25-34" if age < 35 else "35-44" if age < 45 else "45-54" if age < 55 else "55+"
        else:
            band = "Unknown"
        age_bands[band] += 1
    # Joiners / exits in range (binding accepted / unbound).
    from bss_core.models import WorkerContractorBinding
    base = WorkerContractorBinding.objects.filter(site__employer=user,
                                                  contractor_id__in=_contractor_ids(user))
    if site_id:
        base = base.filter(site_id=site_id)
    if contractor_id:
        base = base.filter(contractor_id=contractor_id)
    joiners = base.filter(accepted_at__date__gte=start, accepted_at__date__lte=end).count()
    exits = base.filter(unbound_at__date__gte=start, unbound_at__date__lte=end).count()
    docs = list(WorkerDocument.objects.filter(user_id__in=worker_ids))
    doc_status = {"valid": 0, "expiring": 0, "missing": 0}
    for d in docs:
        st = str(d.status).upper()
        if st in ("MISSING", "REJECTED"):
            doc_status["missing"] += 1
        elif st == "EXPIRED":
            doc_status["expiring"] += 1
        else:
            doc_status["valid"] += 1
    idcard_expiring = 0
    return {
        "total": len(worker_ids),
        "verified": verified,
        "unverified": len(worker_ids) - verified,
        "bySite": sorted([{"site": k, "value": v} for k, v in by_site.items()], key=lambda r: -r["value"]),
        "byContractor": sorted([{"contractor": k, "value": v} for k, v in by_contractor.items()], key=lambda r: -r["value"]),
        "gender": [{"label": k, "value": v} for k, v in gender.items()],
        "ageBands": [{"label": k, "value": v} for k, v in age_bands.items()],
        "bloodGroup": [{"label": k, "value": v} for k, v in blood.items()],
        "joiners": joiners, "exits": exits,
        "documents": doc_status,
    }


def _compliance(user, site_id, contractor_id, start, end):
    reports = payloads._employer_compliance_reports(user)
    by_site, status_mix = {}, {"Compliant": 0, "Pending": 0, "Overdue": 0}
    for r in reports:
        st = str(r.get("status") or "").upper()
        if st == "COMPLETED":
            status_mix["Compliant"] += 1
        else:
            status_mix["Pending"] += 1
        sname = r.get("site") or "—"
        row = by_site.setdefault(sname, {"score": [], "pending": 0})
        row["score"].append(int(r.get("score") or 0))
        if st != "COMPLETED":
            row["pending"] += 1
    by_site_rows = [{"site": k, "score": int(sum(v["score"]) / len(v["score"])) if v["score"] else 0,
                     "pending": v["pending"]} for k, v in by_site.items()]
    by_site_rows.sort(key=lambda r: r["score"])
    return {
        "bySite": by_site_rows,
        "statusMix": [{"label": k, "value": v} for k, v in status_mix.items()],
        "reports": len(reports),
    }


def _payroll_agg(user):
    rows = payloads._payroll_records(employer=user)
    total = 0.0
    by_period, by_contractor = {}, {}
    exceptions = 0
    processed = pending = 0
    wages = []
    for r in rows:
        net = float(r.get("netPay") or 0)
        total += net
        wages.append(net)
        period = r.get("period") or "—"
        by_period[period] = by_period.get(period, 0) + net
        con = r.get("contractor") or "—"
        by_contractor[con] = by_contractor.get(con, 0) + net
        status = r.get("status") or ""
        if status == "Verified":
            processed += 1
        elif status in ("Draft", "Reviewed"):
            pending += 1
        if status == "Exception" or r.get("matchState") == "Needs Review":
            exceptions += 1
    return {"total": round(total, 2), "byPeriod": by_period, "byContractor": by_contractor,
            "exceptions": exceptions, "processed": processed, "pending": pending,
            "wages": wages, "count": len(rows)}


def _payroll(user, site_id, contractor_id, start, end):
    agg = _payroll_agg(user)
    wages = agg.pop("wages")
    lo = round(min(wages), 2) if wages else 0
    hi = round(max(wages), 2) if wages else 0
    avg = round(sum(wages) / len(wages), 2) if wages else 0
    agg["byPeriod"] = sorted([{"label": k, "value": v} for k, v in agg["byPeriod"].items()],
                             key=lambda r: r["label"])
    agg["byContractor"] = sorted([{"contractor": k, "value": v} for k, v in agg["byContractor"].items()],
                                 key=lambda r: -r["value"])
    agg["wageDistribution"] = {"min": lo, "avg": avg, "max": hi}
    return agg


def _contractors(user, site_id, contractor_id, start, end):
    from bss_core.models import ContractorEmployerBinding, WorkerContractorBinding
    accepted = set(_contractor_ids(user))
    rows = []
    for cid in accepted:
        from bss_core.models import User
        c = User.objects.filter(pk=cid).first()
        if c is None:
            continue
        binds = WorkerContractorBinding.objects.filter(contractor_id=cid, site__employer=user,
                                                       binding_status="ACCEPTED")
        workers = binds.count()
        sites = {b.site_id for b in binds}
        rows.append({"contractor": _org(c), "contractorId": cid, "workers": workers,
                     "sites": len(sites)})
    rows.sort(key=lambda r: -r["workers"])
    return {"contractors": rows, "total": len(rows)}


def _gate_agg(user):
    passes = payloads._employer_gate_passes(user)
    active = sum(1 for p in passes if str(p.get("status")) == "Active")
    return {"active": active, "total": len(passes)}


def _access(user, site_id, contractor_id, start, end):
    from bss_core.models import GatePassScan
    passes = payloads._employer_gate_passes(user)
    status_mix = {}
    for p in passes:
        status_mix[str(p.get("status") or "—")] = status_mix.get(str(p.get("status") or "—"), 0) + 1
    scans = GatePassScan.objects.filter(site__employer=user,
                                        scanned_at__date__gte=start, scanned_at__date__lte=end)
    allow = scans.filter(result="ALLOW").count()
    deny = scans.filter(result="DENY").count()
    return {
        "passStatusMix": [{"label": k, "value": v} for k, v in status_mix.items()],
        "passes": len(passes),
        "scans": {"allow": allow, "deny": deny, "total": allow + deny},
    }


def _grievance_rows(user):
    rows = payloads._employer_grievances(user)
    open_count = sum(1 for g in rows if str(g.get("status")) not in ("Resolved", "Closed"))
    return {"rows": rows, "open": open_count, "total": len(rows)}


def _grievances(user, site_id, contractor_id, start, end):
    data = _grievance_rows(user)
    rows = data["rows"]
    by_cat, by_status = {}, {}
    resolved_minutes = []
    overdue = 0
    now = timezone.now()
    for g in rows:
        by_cat[g.get("category") or "Other"] = by_cat.get(g.get("category") or "Other", 0) + 1
        by_status[g.get("status") or "—"] = by_status.get(g.get("status") or "—", 0) + 1
        raised = _parse_dt(g.get("raisedAt"))
        resolved = _parse_dt(g.get("resolvedAt"))
        if raised and resolved:
            resolved_minutes.append((resolved - raised).total_seconds() / 60)
        elif raised and str(g.get("status")) not in ("Resolved", "Closed"):
            if (now - raised).days > 7:
                overdue += 1
    avg_hours = round(sum(resolved_minutes) / len(resolved_minutes) / 60, 1) if resolved_minutes else 0
    return {
        "open": data["open"], "total": data["total"],
        "byCategory": sorted([{"label": k, "value": v} for k, v in by_cat.items()], key=lambda r: -r["value"]),
        "byStatus": [{"label": k, "value": v} for k, v in by_status.items()],
        "avgResolutionHours": avg_hours, "overdue": overdue,
    }


def _parse_dt(text):
    if not text:
        return None
    try:
        return datetime.fromisoformat(str(text).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_analytics(request):
    if not _employer_only(request):
        return Response({"error": "Employer only."}, status=status.HTTP_403_FORBIDDEN)
    q = request.query_params
    tab = (q.get("tab") or "live").strip().lower()
    site_id = q.get("siteId") or None
    contractor_id = q.get("contractorId") or None
    period = (q.get("period") or "month").strip().lower()
    start, end = _period_range(period, q.get("from"), q.get("to"))

    if tab == "live":
        data = _live(request.user, site_id, contractor_id)
    elif tab == "overview":
        data = _overview(request.user, site_id, contractor_id, start, end)
    elif tab == "attendance":
        data = _attendance(request.user, site_id, contractor_id, start, end, period)
    elif tab == "workforce":
        data = _workforce(request.user, site_id, contractor_id, start, end)
    elif tab == "compliance":
        data = _compliance(request.user, site_id, contractor_id, start, end)
    elif tab == "payroll":
        data = _payroll(request.user, site_id, contractor_id, start, end)
    elif tab == "contractors":
        data = _contractors(request.user, site_id, contractor_id, start, end)
    elif tab == "access":
        data = _access(request.user, site_id, contractor_id, start, end)
    elif tab == "grievances":
        data = _grievances(request.user, site_id, contractor_id, start, end)
    else:
        return Response({"error": "Unknown tab."}, status=status.HTTP_400_BAD_REQUEST)

    data["tab"] = tab
    data["period"] = {"preset": period, "start": start.isoformat(), "end": end.isoformat()}
    return Response({"data": data}, status=status.HTTP_200_OK)
