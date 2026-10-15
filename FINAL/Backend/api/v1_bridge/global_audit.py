"""On-demand **global compliance** AI audit — folder → multimodal agent → report.

The global audit runs over live BSS system data only (the private workspace's
``source_documents/`` + ``groundtruth_data/``), never over the CLRA/submitted
documents. Available to contractors and employers; generation is asynchronous.
"""

# ruff: noqa: F401,F403
from .common import *


def _row(report):
    return {
        "id": report.id,
        "kind": report.report_kind,
        "status": report.status,
        "requestedBy": payloads._party_name(report.requested_by) if report.requested_by_id else "",
        "createdAt": report.created_at.isoformat() if report.created_at else "",
        "verdict": (report.ai_report or {}).get("verdict", ""),
        "summary": (report.ai_report or {}).get("summary", ""),
        "error": report.error_message or "",
    }


def _bound_contractor_ids(user):
    from bss_core.models import ContractorEmployerBinding

    return list(ContractorEmployerBinding.objects
                .filter(employer=user, binding_status="ACCEPTED")
                .values_list("contractor_id", flat=True))


def _visible(user, report):
    if report is None:
        return False
    if user.role in ("bss_admin", "bss_staff", "admin"):
        return True
    if report.requested_by_id == user.id:
        return True
    if user.role == "employer" and report.requested_by_id in _bound_contractor_ids(user):
        return True
    return False


def _list_qs(user):
    from bss_core.models import ComplianceReport

    qs = ComplianceReport.objects.filter(report_kind="GLOBAL").select_related("requested_by")
    if user.role in ("bss_admin", "bss_staff", "admin"):
        return qs
    if user.role == "contractor":
        return qs.filter(requested_by=user)
    if user.role == "employer":
        ids = _bound_contractor_ids(user) + [user.id]
        return qs.filter(requested_by_id__in=ids)
    return qs.none()


def _create_global(user):
    from bss_core.models import ComplianceReport

    report = ComplianceReport.objects.create(
        employer=(user if user.role == "contractor" else None),
        requested_by=user,
        report_kind="GLOBAL",
        status="PENDING",
        report_date=timezone.localdate(),
    )
    from .audit_workspace import schedule_report
    schedule_report(report.id)
    return report


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def contractor_global_audit(request):
    user = request.user
    if user.role != "contractor":
        return Response({"error": "Contractors only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "POST":
        report = _create_global(user)
        return Response({"data": _row(report)}, status=status.HTTP_201_CREATED)
    return Response({"data": [_row(r) for r in _list_qs(user)[:100]]}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def employer_global_audit(request):
    user = request.user
    if user.role != "employer":
        return Response({"error": "Employers only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "POST":
        report = _create_global(user)
        return Response({"data": _row(report)}, status=status.HTTP_201_CREATED)
    return Response({"data": [_row(r) for r in _list_qs(user)[:100]]}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def global_audit_report(request, report_id):
    from bss_core.models import ComplianceReport

    report = (ComplianceReport.objects.filter(pk=report_id, report_kind="GLOBAL")
              .select_related("requested_by").first())
    if not _visible(request.user, report):
        return Response({"error": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
    if report.status != "READY" or not report.ai_html:
        return Response({"data": _row(report)}, status=status.HTTP_200_OK)
    if (request.query_params.get("download") or "").lower() == "pdf":
        from .ai_report import _report_pdf
        return _report_pdf(report.ai_html, f"bss-global-compliance-{report.id}.pdf")
    return Response({"data": {**_row(report), "html": report.ai_html}}, status=status.HTTP_200_OK)


__all__ = [
    "contractor_global_audit", "employer_global_audit", "global_audit_report",
]
