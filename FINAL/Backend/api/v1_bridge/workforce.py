"""Server-side, filterable + paginated workforce explorer for Government and
Employer analytics. Only the requested page is serialized; plots come from
aggregate queries (no full dataset is ever sent to the client).

Route params (all optional):
  state, gender, category, occupation, employer (user id), contractor (user id),
  q (name / BSS id search), attendance (migrant|epfo|esic), page (1-based),
  pageSize (<=100), format=csv
"""

# ruff: noqa: F401,F403
import csv
import io

from django.db.models import Count, Q
from django.utils import timezone

from .common import *  # noqa: F401,F403

_COLS = ["id", "bssId", "name", "state", "district", "city", "age", "gender",
         "category", "occupation", "site", "siteType", "employer", "contractor",
         "migrant", "stateOfOrigin", "attendance", "epfoLinked", "esicLinked", "wage"]


def _scope_qs(employer=None):
    from bss_core.models import WorkerContractorBinding
    qs = (WorkerContractorBinding.objects
          .filter(binding_status="ACCEPTED")
          .select_related("worker", "worker__worker_identity",
                          "contractor", "contractor__contractor_profile",
                          "site", "site__employer", "site__employer__employer_profile"))
    if employer is not None:
        from .employer_analytics import _contractor_ids
        qs = qs.filter(site__employer=employer, contractor_id__in=_contractor_ids(employer))
    return qs


def _apply_filters(qs, p):
    state = (p.get("state") or "").strip()
    gender = (p.get("gender") or "").strip()
    category = (p.get("category") or "").strip()
    occupation = (p.get("occupation") or "").strip()
    employer_id = (p.get("employer") or "").strip()
    contractor_id = (p.get("contractor") or "").strip()
    q = (p.get("q") or "").strip()
    flag = (p.get("attendance") or "").strip()
    if state:
        qs = qs.filter(site__state=state)
    if gender:
        qs = qs.filter(worker__worker_identity__gender=gender)
    if category:
        qs = qs.filter(worker__classification__worker_category=category)
    if occupation:
        qs = qs.filter(Q(worker__classification__occupation=occupation)
                       | Q(worker__skills__primary_skill=occupation))
    if employer_id.isdigit():
        qs = qs.filter(site__employer_id=int(employer_id))
    if contractor_id.isdigit():
        qs = qs.filter(contractor_id=int(contractor_id))
    if q:
        qs = qs.filter(Q(worker__worker_identity__name__icontains=q)
                       | Q(worker__worker_identity__bss_worker_id__icontains=q)
                       | Q(worker__username__icontains=q))
    if flag == "migrant":
        qs = qs.filter(worker__worker_address__migrant_worker=True)
    elif flag == "epfo":
        qs = qs.filter(worker__social_security__epfo_uan__isnull=False).exclude(worker__social_security__epfo_uan="")
    elif flag == "esic":
        qs = qs.filter(worker__social_security__esic_ip_number__isnull=False).exclude(worker__social_security__esic_ip_number="")
    return qs


def _facets(qs, field):
    out = []
    for row in qs.values(field).annotate(n=Count("id")).order_by("-n"):
        key = row[field]
        if key in (None, ""):
            continue
        out.append({"value": str(key), "label": str(key), "count": row["n"]})
    return out


def _series(qs, field):
    return [{"label": str(r[field] or "Unknown"), "value": r["n"]}
            for r in qs.values(field).annotate(n=Count("id")).order_by("-n") if r[field]]


def _summary(filtered, scope):
    from bss_core.models import (Attendance, ComplianceBatch, CourseEnrollment, GatePassScan,
                                 LeaveRequest, SalaryAdvance, WorkerComplianceChecklist,
                                 WorkerContractorBinding, WorkerGatePass, WorkerGrievance)
    worker_ids = list(filtered.values_list("worker_id", flat=True))
    contractor_ids = list(set(scope.values_list("contractor_id", flat=True)))
    site_ids = list(set(scope.values_list("site_id", flat=True)))

    def grp(model, field, **f):
        return [{"label": payloads._d(r[field]) or "Unknown", "value": r["n"]}
                for r in model.objects.filter(**f).values(field).annotate(n=Count("id")).order_by("-n")]

    def cnt(model, **f):
        try:
            return model.objects.filter(**f).count()
        except Exception:  # noqa: BLE001
            return 0

    scans = grp(GatePassScan, "result", gate_pass__worker_id__in=worker_ids)
    return {
        "byState": _series(filtered, "site__state"),
        "bySite": _series(filtered, "site__site_name"),
        "byGender": _series(filtered, "worker__worker_identity__gender"),
        "byCategory": _series(filtered, "worker__classification__worker_category"),
        "byOccupation": _series(filtered, "worker__classification__occupation"),
        "byEmployer": _series(filtered, "site__employer__employer_profile__employer_name"),
        "byContractor": _series(filtered, "contractor__contractor_profile__contractor_name"),
        "attendance": grp(Attendance, "status", worker_id__in=worker_ids),
        "grievances": grp(WorkerGrievance, "status", worker_id__in=worker_ids),
        "gatePasses": grp(WorkerGatePass, "status", worker_id__in=worker_ids),
        "scans": scans,
        "activities": {
            "worker": [
                {"label": "Attendance marks", "value": cnt(Attendance, worker_id__in=worker_ids)},
                {"label": "Grievances", "value": cnt(WorkerGrievance, worker_id__in=worker_ids)},
                {"label": "Leave requests", "value": cnt(LeaveRequest, worker_id__in=worker_ids)},
                {"label": "Salary advances", "value": cnt(SalaryAdvance, worker_id__in=worker_ids)},
                {"label": "Gate passes", "value": cnt(WorkerGatePass, worker_id__in=worker_ids)},
                {"label": "Courses", "value": cnt(CourseEnrollment, worker_id__in=worker_ids)},
                {"label": "Compliance checklists", "value": cnt(WorkerComplianceChecklist, worker_id__in=worker_ids)},
            ],
            "contractor": [
                {"label": "Workers bound", "value": cnt(WorkerContractorBinding, contractor_id__in=contractor_ids, binding_status="ACCEPTED")},
                {"label": "Compliance batches", "value": cnt(ComplianceBatch, contractor_id__in=contractor_ids)},
                {"label": "Gate passes (sites)", "value": cnt(WorkerGatePass, site_id__in=site_ids)},
                {"label": "Grievances handled", "value": cnt(WorkerGrievance, contractor_id__in=contractor_ids)},
            ],
        },
        "workerTotal": len(worker_ids),
        "grievanceTotal": cnt(WorkerGrievance, worker_id__in=worker_ids),
        "gatePassTotal": cnt(WorkerGatePass, worker_id__in=worker_ids),
        "scanTotal": sum(r["value"] for r in scans),
    }


def _row(b, maps):
    worker = b.worker
    wi = maps["idents"].get(worker.id)
    cl = maps["classifs"].get(worker.id)
    sk = maps["skills"].get(worker.id)
    mob = maps["mobs"].get(worker.id)
    ssr = maps["socials"].get(worker.id)
    site = b.site
    emp = getattr(site.employer, "employer_profile", None) if site else None
    cp = getattr(b.contractor, "contractor_profile", None)
    wage = maps["wages"].get(worker.id)
    a = maps["atts"].get(worker.id)
    attendance_label = "PRESENT"
    if a is not None:
        s = str(a.status or "").upper()
        attendance_label = "ABSENT" if s == "ABSENT" else ("LEAVE" if s == "LEAVE" else "PRESENT")
    return {
        "id": worker.id,
        "bssId": payloads._d(wi.bss_worker_id if wi else ""),
        "name": payloads._party_name(worker),
        "state": site.state if site else "",
        "district": site.district if site else "",
        "city": site.city if site else "",
        "age": wi.age if wi and wi.age else None,
        "gender": payloads._d(wi.gender if wi else ""),
        "category": payloads._d(cl.worker_category if cl else ""),
        "occupation": payloads._d((cl.occupation if cl else "") or (sk.primary_skill if sk else "") or payloads._d(b.designation)),
        "site": site.site_name if site else "",
        "siteType": site.site_type if site else "",
        "employer": payloads._d(emp.employer_name if emp else ""),
        "contractor": payloads._d(cp.contractor_name if cp else b.contractor.username),
        "migrant": bool(mob and mob.migrant_worker),
        "stateOfOrigin": payloads._d(mob.permanent_state if mob else ""),
        "attendance": attendance_label,
        "epfoLinked": bool(ssr and ssr.epfo_uan),
        "esicLinked": bool(ssr and ssr.esic_ip_number),
        "wage": payloads._num(wage.gross_wage) if wage else 0,
    }


def _maps_for(ids):
    from bss_core.models import (Attendance, WorkerAddressMobility, WorkerClassification,
                                 WorkerIdentity, WorkerSkillsEmployability, WorkerSocialSecurity,
                                 WorkerWages)
    wages, atts = {}, {}
    for w in WorkerWages.objects.filter(worker_id__in=ids).order_by("-period_start"):
        wages.setdefault(w.worker_id, w)
    for a in Attendance.objects.filter(worker_id__in=ids).order_by("-attendance_date"):
        atts.setdefault(a.worker_id, a)
    return {
        "idents": {x.user_id: x for x in WorkerIdentity.objects.filter(user_id__in=ids)},
        "classifs": {x.user_id: x for x in WorkerClassification.objects.filter(user_id__in=ids)},
        "skills": {x.user_id: x for x in WorkerSkillsEmployability.objects.filter(user_id__in=ids)},
        "mobs": {x.user_id: x for x in WorkerAddressMobility.objects.filter(user_id__in=ids)},
        "socials": {x.user_id: x for x in WorkerSocialSecurity.objects.filter(user_id__in=ids)},
        "wages": wages, "atts": atts,
    }


def _rows(bindings):
    if not bindings:
        return []
    maps = _maps_for([b.worker_id for b in bindings])
    return [_row(b, maps) for b in bindings]


def workforce_explorer(request, employer=None):
    p = request.query_params
    scope = _scope_qs(employer)

    facets = {
        "states": _facets(scope, "site__state"),
        "genders": _facets(scope, "worker__worker_identity__gender"),
        "categories": _facets(scope, "worker__classification__worker_category"),
        "occupations": _facets(scope, "worker__classification__occupation"),
        "employers": [{"value": str(u.id), "label": payloads._d(getattr(getattr(u, "employer_profile", None), "employer_name", "") or u.username)}
                      for u in (User.objects.filter(role="employer") if employer is None
                                else User.objects.filter(id=employer.id))],
        "contractors": [{"value": str(u.id), "label": payloads._d(getattr(getattr(u, "contractor_profile", None), "contractor_name", "") or u.username)}
                        for u in User.objects.filter(role="contractor", id__in=set(scope.values_list("contractor_id", flat=True)))],
    }

    filtered = _apply_filters(scope, p)
    total = filtered.count()

    if (p.get("export") or "").lower() == "csv":
        from django.http import StreamingHttpResponse

        def stream():
            yield ",".join(_COLS) + "\n"
            chunk = []
            for b in filtered.order_by("id").iterator(chunk_size=1000):
                chunk.append(b)
                if len(chunk) >= 500:
                    yield _csv_block(chunk)
                    chunk = []
            if chunk:
                yield _csv_block(chunk)

        resp = StreamingHttpResponse(stream(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="workforce.csv"'
        return resp

    page = max(1, int(p.get("page") or 1))
    page_size = min(100, max(5, int(p.get("pageSize") or 25)))
    start = (page - 1) * page_size
    page_bindings = list(filtered.order_by("worker__worker_identity__name", "id")[start:start + page_size])

    return Response({
        "generatedAt": payloads._dts(timezone.now()),
        "states": list(payloads.GEOGRAPHY.keys()),
        "total": total, "page": page, "pageSize": page_size,
        "facets": facets,
        "summary": _summary(filtered, scope),
        "workers": _rows(page_bindings),
    })


def _csv_block(bindings):
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_COLS, extrasaction="ignore")
    for r in _rows(bindings):
        writer.writerow({k: r.get(k) for k in _COLS})
    return buf.getvalue()


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def government_workforce(request):
    return workforce_explorer(request, employer=None)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_workforce(request):
    if request.user.role != "employer":
        return Response({"error": "Only employers can view workforce analytics."},
                        status=status.HTTP_403_FORBIDDEN)
    return workforce_explorer(request, employer=request.user)
