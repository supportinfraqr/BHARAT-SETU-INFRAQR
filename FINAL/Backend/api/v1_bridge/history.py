"""Role-scoped engagement history.

Mirrors the worker's Employment History (``_worker_employment_history``) for the
other two personas:

* ``contractor_workforce_history`` — every worker the contractor engaged, past
  and present (ACCEPTED / CANCELLED / TRANSFERRED), as a chronological timeline.
* ``employer_workforce_history``  — every worker engaged at the employer's sites.
* ``employer_contractor_history`` — every contractor the employer engaged, past
  and present (ACCEPTED / CANCELLED).
"""

from .common import *  # noqa: F401,F403
from .bindings import *  # noqa: F401,F403


def _history_dates(b):
    """Return (start_date, end_date) ISO strings for a worker binding timeline."""
    su = str(b.binding_status).upper()
    if su == "ACCEPTED":
        end_dt = timezone.now()
    elif su == "CANCELLED":
        end_dt = b.unbound_at or b.updated_at or timezone.now()
    else:  # TRANSFERRED ("Site Changed")
        end_dt = b.updated_at or timezone.now()
    start = payloads._dts(b.accepted_at) if b.accepted_at else ""
    if su == "ACCEPTED":
        end = ""
    else:
        end = payloads._dts(end_dt) if end_dt else ""
    days = max(0, (end_dt.date() - b.accepted_at.date()).days) if b.accepted_at else 0
    return start, end, days


def _worker_history_row(b):
    """One worker engagement row (shared by the contractor + employer views)."""
    cp = getattr(b.contractor, "contractor_profile", None)
    emp = getattr(b.site, "employer", None) if b.site else None
    ep = getattr(emp, "employer_profile", None) if emp else None
    su = str(b.binding_status).upper()
    status_label = ("Active" if su == "ACCEPTED"
                    else "Ended" if su == "CANCELLED" else "Site Changed")
    start, end, days = _history_dates(b)
    return {
        "id": b.id,
        "ref": f"BIND-2026-{b.id:03d}",
        "worker": payloads._party_name(b.worker),
        "workerBssId": payloads._d(getattr(getattr(b.worker, "worker_identity", None),
                                           "bss_worker_id", "")
                                   or payloads._bss_worker_code(b.worker_id)),
        "contractor": payloads._org_name(b.contractor),
        "contractorCode": payloads._d(getattr(cp, "contractor_code", "")
                                      or payloads._bss_contractor_code(b.contractor_id)),
        "employer": payloads._org_name(emp) if emp else "",
        "employerCode": payloads._d(getattr(ep, "employer_code", "")
                                    or (payloads._bss_employer_code(b.site.employer_id)
                                        if b.site and b.site.employer_id else "")),
        "site": payloads._d(b.site.site_name) if b.site else "",
        "siteId": payloads._d(getattr(b.site, "site_code", "") if b.site else ""),
        "designation": payloads._d(b.designation),
        "department": payloads._d(b.department),
        "shift": payloads._d(b.shift),
        "wage": payloads._num(b.offered_wage) if b.offered_wage is not None else 0,
        "startDate": start,
        "endDate": end,
        "durationDays": days,
        "durationLabel": payloads._duration_label(days),
        "status": status_label,
        "current": su == "ACCEPTED",
    }


def _employer_contractor_row(b):
    """One contractor engagement row for the employer's contractor history."""
    cp = getattr(b.contractor, "contractor_profile", None)
    su = str(b.binding_status).upper()
    status_label = "Active" if su == "ACCEPTED" else "Ended"
    start = payloads._dts(b.accepted_at) if b.accepted_at else ""
    if su == "ACCEPTED":
        end = ""
        end_dt = timezone.now()
    else:
        end_dt = b.unbound_at or b.updated_at or timezone.now()
        end = payloads._dts(end_dt) if end_dt else ""
    days = max(0, (end_dt.date() - b.accepted_at.date()).days) if b.accepted_at else 0
    sites = list(b.allotments.all())
    return {
        "id": b.id,
        "ref": f"CEB-2026-{b.id:03d}",
        "contractor": payloads._org_name(b.contractor),
        "contractorCode": payloads._d(getattr(cp, "contractor_code", "")
                                      or payloads._bss_contractor_code(b.contractor_id)),
        "initiatedBy": payloads._d(b.initiated_by),
        "sites": [payloads._d(a.site.site_name) if a.site else "" for a in sites],
        "siteCount": len(sites),
        "startDate": start,
        "endDate": end,
        "durationDays": days,
        "durationLabel": payloads._duration_label(days),
        "status": status_label,
        "current": su == "ACCEPTED",
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_workforce_history(request):
    """Chronological record of every worker this contractor has engaged."""
    user = request.user
    if user.role != "contractor":
        return Response({"error": "Only contractors can view this history."},
                        status=status.HTTP_403_FORBIDDEN)
    qs = (WorkerContractorBinding.objects
          .filter(contractor=user,
                  binding_status__in=("ACCEPTED", "CANCELLED", "TRANSFERRED"))
          .select_related("worker", "worker__worker_identity", "contractor",
                          "contractor__contractor_profile",
                          "site", "site__employer", "site__employer__employer_profile")
          .order_by("-accepted_at", "-created_at"))
    rows = [_worker_history_row(b) for b in qs]
    rows.sort(key=lambda r: (r.get("startDate") or "9999-99-99"))
    for index, row in enumerate(rows, 1):
        row["sequence"] = index
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_workforce_history(request):
    """Chronological record of every worker engaged at the employer's sites."""
    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can view this history."},
                        status=status.HTTP_403_FORBIDDEN)
    qs = (WorkerContractorBinding.objects
          .filter(site__employer=user,
                  binding_status__in=("ACCEPTED", "CANCELLED", "TRANSFERRED"))
          .select_related("worker", "worker__worker_identity", "contractor",
                          "contractor__contractor_profile",
                          "site", "site__employer", "site__employer__employer_profile")
          .order_by("-accepted_at", "-created_at"))
    rows = [_worker_history_row(b) for b in qs]
    rows.sort(key=lambda r: (r.get("startDate") or "9999-99-99"))
    for index, row in enumerate(rows, 1):
        row["sequence"] = index
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_contractor_history(request):
    """Chronological record of every contractor this employer has engaged."""
    user = request.user
    if user.role != "employer":
        return Response({"error": "Only employers can view this history."},
                        status=status.HTTP_403_FORBIDDEN)
    qs = (ContractorEmployerBinding.objects
          .filter(employer=user, binding_status__in=("ACCEPTED", "CANCELLED"))
          .select_related("contractor", "contractor__contractor_profile", "employer")
          .prefetch_related("allotments__site")
          .order_by("-accepted_at", "-created_at"))
    rows = [_employer_contractor_row(b) for b in qs]
    rows.sort(key=lambda r: (r.get("startDate") or "9999-99-99"))
    for index, row in enumerate(rows, 1):
        row["sequence"] = index
    return Response({"data": rows}, status=status.HTTP_200_OK)
