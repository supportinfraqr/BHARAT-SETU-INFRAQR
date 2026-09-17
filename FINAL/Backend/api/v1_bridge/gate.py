"""Gate entry scanning — allow/deny a gate-pass QR at the gate and log it.

Gate Pass Management System §6.
"""

# ruff: noqa: F401,F403
from .common import *


def _worker_name(user):
    if user is None:
        return ""
    wi = getattr(user, "worker_identity", None)
    return payloads._d(wi.name if wi and wi.name else user.username)


def _resolve_pass(body):
    from bss_core.models import WorkerGatePass, WorkerIdentity
    code = str(body.get("gatePassNo") or body.get("pass") or "").strip()
    if code:
        gp = (WorkerGatePass.objects.filter(gate_pass_no=code)
              .select_related("worker", "site").order_by("-created_at").first())
        if gp is not None:
            return gp
    bss_id = str(body.get("bssId") or body.get("worker") or "").strip().upper()
    if bss_id:
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
        if identity is not None:
            return (WorkerGatePass.objects
                    .filter(worker=identity.user, status__in=("ACTIVE", "PENDING"))
                    .select_related("worker", "site").order_by("-created_at").first())
    return None


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gate_scan(request):
    """Scan a gate-pass QR: Active + within validity → Allow + entry log;
    otherwise Deny + scan log + alert."""
    from bss_core.models import GatePassScan, Notification, SiteGate
    body = request.data if isinstance(request.data, dict) else {}
    today = timezone.localdate()

    gp = _resolve_pass(body)
    gate = SiteGate.objects.filter(pk=body.get("gateId")).first() if body.get("gateId") else None

    result, reason = "DENY", ""
    if gp is None:
        reason = "No gate pass found for this scan."
    elif gp.status == "REVOKED":
        reason = "This gate pass has been revoked."
    elif gp.status == "EXPIRED" or (gp.end_date and gp.end_date < today):
        reason = "This gate pass has expired."
        if gp.status == "ACTIVE":
            gp.status = "EXPIRED"
            gp.save(update_fields=["status", "updated_at"])
    elif gp.status != "ACTIVE":
        reason = f"This gate pass is {gp.status.lower()}."
    elif gp.start_date and gp.start_date > today:
        reason = f"This gate pass is valid from {gp.start_date}."
    else:
        result, reason = "ALLOW", "Entry allowed."

    scan = GatePassScan.objects.create(
        gate_pass=gp, worker=gp.worker if gp else None, site=gp.site if gp else None,
        gate=gate, gate_pass_no=gp.gate_pass_no if gp else str(body.get("gatePassNo") or "")[:40],
        result=result, reason=reason, scanned_by=request.user)

    if result == "DENY" and gp is not None:
        recipients = []
        if gp.site and gp.site.employer_id:
            recipients.append(gp.site.employer)
        if gp.issued_by_id:
            recipients.append(gp.issued_by)
        for party in recipients:
            Notification.objects.create(
                user=party, type="WARNING", title="Gate entry denied",
                body=f"{gp.gate_pass_no}: {reason}", link="/employer/gate-pass")

    return Response({"data": {
        "result": result, "reason": reason, "gatePassNo": scan.gate_pass_no,
        "worker": _worker_name(gp.worker) if gp else "",
        "site": gp.site.site_name if gp and gp.site else "",
        "at": payloads._dts(scan.scanned_at),
    }}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gate_scans(request):
    """Recent gate scan log, scoped to the caller's sites/workers."""
    from bss_core.models import GatePassScan, WorkerContractorBinding
    if request.user.role == "employer":
        qs = GatePassScan.objects.filter(site__employer=request.user)
    elif request.user.role == "contractor":
        worker_ids = WorkerContractorBinding.objects.filter(
            contractor=request.user, binding_status="ACCEPTED").values_list("worker_id", flat=True)
        qs = GatePassScan.objects.filter(Q(scanned_by=request.user) | Q(worker_id__in=worker_ids))
    elif request.user.role in ("bss_admin", "bss_staff"):
        qs = GatePassScan.objects.all()
    else:
        return Response({"error": "not authorized"}, status=status.HTTP_403_FORBIDDEN)
    rows = [{
        "id": s.id, "gatePassNo": payloads._d(s.gate_pass_no),
        "worker": _worker_name(s.worker), "site": s.site.site_name if s.site else "",
        "result": s.result, "reason": payloads._d(s.reason),
        "scannedBy": payloads._d(s.scanned_by.username if s.scanned_by_id else ""),
        "at": payloads._dts(s.scanned_at),
    } for s in qs.select_related("worker", "site", "scanned_by")[:100]]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


__all__ = ["gate_scan", "gate_scans"]
