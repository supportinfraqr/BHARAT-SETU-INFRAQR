"""Audit & verification report endpoints (generate / list / preview / download)."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403

import io


def _quarter_options():
    return [
        {"fy": 2026, "quarter": 1, "label": "Q1 FY 2026-27 (Apr–Jun 2026)"},
        {"fy": 2026, "quarter": 2, "label": "Q2 FY 2026-27 (Jul–Sep 2026)"},
        {"fy": 2026, "quarter": 3, "label": "Q3 FY 2026-27 (Oct–Dec 2026)"},
    ]


def _scoped_reports(user):
    from bss_core.models import AuditReport
    qs = AuditReport.objects.all()
    if user.role == "bss_admin":
        return qs
    if user.role == "employer":
        return qs.filter(scope_type="EMPLOYER", employer=user)
    if user.role == "contractor":
        return qs.filter(scope_type="CONTRACTOR", contractor=user)
    return qs.none()


def _row(report):
    return {
        "id": report.id,
        "scopeType": report.scope_type,
        "employer": payloads._party_name(report.employer) if report.employer else "",
        "contractor": payloads._party_name(report.contractor) if report.contractor else "",
        "financialYear": report.financial_year,
        "quarter": report.quarter,
        "periodStart": report.period_start.isoformat() if report.period_start else "",
        "periodEnd": report.period_end.isoformat() if report.period_end else "",
        "reportTypes": [t for t in (report.report_types or "").split(",") if t],
        "summary": report.summary or {},
        "hasFile": bool(report.file),
        "generatedAt": report.generated_at.isoformat() if report.generated_at else "",
        "generatedBy": payloads._party_name(report.generated_by) if report.generated_by else "BSS Engine",
    }


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_report_filters(request):
    """Dynamic filter options for the caller (employers/contractors/sites/quarters)."""
    from bss_core.models import Site
    user = request.user
    employers, contractors, sites = [], [], []
    if user.role == "bss_admin":
        employers = [{"id": u.id, "name": payloads._party_name(u)}
                     for u in User.objects.filter(role="employer")]
        contractors = [{"id": u.id, "name": payloads._party_name(u)}
                       for u in User.objects.filter(role="contractor")]
        sites = [{"id": s.id, "name": s.site_name} for s in Site.objects.all()[:500]]
    elif user.role == "employer":
        employers = [{"id": user.id, "name": payloads._party_name(user)}]
        contractors = [{"id": b.contractor_id, "name": payloads._party_name(b.contractor)}
                       for b in user.employer_bindings.select_related("contractor")]
        sites = [{"id": s.id, "name": s.site_name} for s in Site.objects.filter(employer=user)]
    elif user.role == "contractor":
        contractors = [{"id": user.id, "name": payloads._party_name(user)}]
        sites = [{"id": s.id, "name": s.site_name}
                 for s in Site.objects.filter(contractor_site_allotments__binding__contractor=user).distinct()]
    return Response({"data": {
        "role": user.role,
        "canGenerate": user.role == "bss_admin",
        "employers": employers, "contractors": contractors, "sites": sites,
        "quarters": _quarter_options(),
    }}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_report_generate(request):
    """Admin-only: generate quarterly reports for all employers + contractors."""
    from ..audit.service import generate_quarter
    user = request.user
    if user.role != "bss_admin":
        return Response({"error": "Only BSS Admin can generate audit reports."},
                        status=status.HTTP_403_FORBIDDEN)
    try:
        fy = int(request.data.get("fy"))
        quarter = int(request.data.get("quarter"))
    except (TypeError, ValueError):
        return Response({"error": "fy and quarter are required."},
                        status=status.HTTP_400_BAD_REQUEST)
    if quarter not in (1, 2, 3, 4):
        return Response({"error": "quarter must be 1..4."}, status=status.HTTP_400_BAD_REQUEST)
    created = generate_quarter(fy, quarter, actor=user)
    return Response({"data": {"generated": len(created),
                              "reports": [_row(r) for r in created[:50]]}},
                    status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_report_list(request):
    user = request.user
    qs = _scoped_reports(user).select_related("employer", "contractor", "generated_by")[:200]
    return Response({"data": [_row(r) for r in qs]}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_report_preview(request, report_id):
    report = _scoped_reports(request.user).filter(pk=report_id).first()
    if report is None:
        return Response({"error": "report not found"}, status=status.HTTP_404_NOT_FOUND)
    data = _row(report)
    data["parameters"] = report.parameters
    return Response({"data": data}, status=status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def audit_report_download(request, report_id):
    from django.http import FileResponse
    report = _scoped_reports(request.user).filter(pk=report_id).first()
    if report is None or not report.file:
        return Response({"error": "report file not found"}, status=status.HTTP_404_NOT_FOUND)
    filename = f"BSS-Audit-{report.scope_type}-FY{report.financial_year}-Q{report.quarter}.xlsx"
    return FileResponse(report.file.open("rb"), as_attachment=True, filename=filename,
                        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
