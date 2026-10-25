"""Gate entry scanning — allow/deny a gate-pass QR at the gate and log it.

Gate Pass Management System §6.
"""

# ruff: noqa: F401,F403
import base64
import re
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .common import *


_PASS_TYPE_LABELS = {"TGP": "Temporary Gate Pass", "PGP": "Permanent Gate Pass"}


def _actor(request):
    return getattr(getattr(request, "_request", None), "actor", None) or request.user


def _actor_name(user):
    if user is None:
        return ""
    return payloads._d(getattr(user, "full_name", "") or user.username)


def _store_snapshot(value):
    """Decode a browser camera/file snapshot and store it under media."""
    text = str(value or "").strip()
    match = re.match(r"^data:image/(jpeg|jpg|png|webp);base64,(.+)$", text, re.S | re.I)
    if not match:
        return None
    try:
        raw = base64.b64decode(match.group(2), validate=False)
    except (ValueError, TypeError):
        return None
    if not raw or len(raw) > 2_500_000:
        return None
    ext = "jpg" if match.group(1).lower() in ("jpeg", "jpg") else match.group(1).lower()
    name = f"gate_scans/{timezone.localdate():%Y/%m}/{uuid.uuid4().hex}.{ext}"
    return default_storage.save(name, ContentFile(raw))


def _worker_name(user):
    if user is None:
        return ""
    wi = getattr(user, "worker_identity", None)
    return payloads._d(wi.name if wi and wi.name else user.username)


def _pass_for_identity(identity):
    """Latest real pass, or the worker's auto pass when one has not been materialised.

    Every worker QR is also the gate-pass QR, so a scan must resolve the same
    automatic pass the gate-pass register shows. Expired/revoked/pending rows are
    returned deliberately so the scanner can explain the denial.
    """
    from bss_core.models import WorkerContractorBinding, WorkerGatePass

    worker = identity.user
    gp = (WorkerGatePass.objects.filter(worker=worker)
          .select_related("worker", "site").order_by("-created_at").first())
    if gp is not None:
        return gp
    binding = (WorkerContractorBinding.objects
               .filter(worker=worker, binding_status="ACCEPTED")
               .select_related("site__employer").order_by("-accepted_at").first())
    if binding is None or binding.site is None:
        return None
    employer = binding.site.employer if binding.site.employer_id else None
    if payloads._is_gate_pass_blocked(worker, employer):
        return None
    gp_type = payloads._auto_gate_pass_type(worker)
    if not gp_type:
        return None
    start, end = payloads._auto_gate_pass_dates(worker, gp_type)
    gp, _ = WorkerGatePass.objects.get_or_create(
        worker=worker, gate_pass_type=gp_type,
        gate_pass_no=payloads._auto_gate_pass_no(worker, gp_type),
        defaults={"site": binding.site, "status": "ACTIVE", "start_date": start,
                  "end_date": end, "source": "SYSTEM"},
    )
    return gp


def _resolve_pass(body):
    from bss_core.models import WorkerGatePass, WorkerIdentity
    import json as _json
    code = str(body.get("gatePassNo") or body.get("pass") or "").strip()
    # The gate pass QR is the worker QR (JSON {v,type,bssId,issuer}); accept it
    # as well as a bare worker BSS id or a legacy pass number.
    bss_candidate = ""
    if code.startswith("{"):
        try:
            payload = _json.loads(code)
            bss_candidate = str(payload.get("bssId") or "").strip()
        except (ValueError, TypeError):
            bss_candidate = ""
    if bss_candidate:
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_candidate).first()
        if identity is not None:
            return _pass_for_identity(identity)
    if code:
        gp = (WorkerGatePass.objects.filter(gate_pass_no=code)
              .select_related("worker", "site").order_by("-created_at").first())
        if gp is not None:
            return gp
        # The code may itself be the worker's BSS id (the single QR/id).
        identity = WorkerIdentity.objects.filter(bss_worker_id=code.upper()).first()
        if identity is not None:
            return _pass_for_identity(identity)
    bss_id = str(body.get("bssId") or body.get("worker") or "").strip().upper()
    if bss_id:
        identity = WorkerIdentity.objects.filter(bss_worker_id=bss_id).first()
        if identity is not None:
            return _pass_for_identity(identity)
    return None


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def gate_scan(request):
    """Scan a gate-pass QR: Active + within validity → Allow + entry log;
    otherwise Deny + scan log + alert."""
    from bss_core.models import GatePassScan, Notification, SiteGate
    _require_permission(request, "gate_pass")
    body = request.data if isinstance(request.data, dict) else {}
    today = timezone.localdate()

    raw_input = str(body.get("gatePassNo") or body.get("pass") or body.get("bssId") or body.get("worker") or "").strip()
    gp = _resolve_pass(body)
    gate = SiteGate.objects.filter(pk=body.get("gateId")).first() if body.get("gateId") else None

    if gp is None:
        return Response({"error": f"Invalid gate pass number '{raw_input}'. No registered gate pass found in the system."}, status=status.HTTP_404_NOT_FOUND)
    if request.user.role == "worker":
        return Response({"error": "Gate scanning is performed by security or the employer, not the worker."},
                        status=status.HTTP_403_FORBIDDEN)
    result = "DENY"
    if gp.status == "REVOKED":
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

    scan = GatePassScan(
        gate_pass=gp, worker=gp.worker, site=gp.site,
        gate=gate, gate_pass_no=payloads._auto_gate_pass_no(gp.worker, gp.gate_pass_type),
        pass_type=gp.gate_pass_type, card_valid=(result == "ALLOW"),
        valid_from=gp.start_date, valid_to=gp.end_date,
        result=result, reason=reason, scanned_by=_actor(request))
    snapshot_name = _store_snapshot(body.get("snapshot"))
    if snapshot_name:
        scan.snapshot.name = snapshot_name
    scan.save()

    if result == "DENY" and gp is not None:
        recipients = []
        if gp.site and gp.site.employer_id:
            recipients.append(gp.site.employer)
        if gp.issued_by_id:
            recipients.append(gp.issued_by)
        for party in recipients:
            Notification.objects.create(
                user=party, type="WARNING", title="Gate entry denied",
                body=f"{payloads._auto_gate_pass_no(gp.worker, gp.gate_pass_type)}: {reason}",
                link="/employer/gate-pass")

    return Response({"data": {
        "result": result, "reason": reason, "gatePassNo": scan.gate_pass_no,
        "passType": _PASS_TYPE_LABELS.get(scan.pass_type, scan.pass_type),
        "cardValid": scan.card_valid,
        "validFrom": payloads._dts(scan.valid_from),
        "validTo": payloads._dts(scan.valid_to),
        "snapshotUrl": scan.snapshot.url if scan.snapshot else "",
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
    _require_permission(request, "gate_pass")
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
        "passType": _PASS_TYPE_LABELS.get(s.pass_type, s.pass_type),
        "cardValid": s.card_valid,
        "validFrom": payloads._dts(s.valid_from),
        "validTo": payloads._dts(s.valid_to),
        "snapshotUrl": s.snapshot.url if s.snapshot else "",
        "worker": _worker_name(s.worker), "site": s.site.site_name if s.site else "",
        "result": s.result, "reason": payloads._d(s.reason),
        "scannedBy": _actor_name(s.scanned_by) if s.scanned_by_id else "",
        "at": payloads._dts(s.scanned_at),
    } for s in qs.select_related("worker", "site", "scanned_by")[:100]]
    return Response({"rows": rows}, status=status.HTTP_200_OK)


__all__ = ["gate_scan", "gate_scans"]
