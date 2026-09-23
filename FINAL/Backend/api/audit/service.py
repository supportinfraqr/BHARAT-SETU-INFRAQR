"""Audit report generation service: build + persist quarterly reports.

For a selected quarter the engine is run for every employer and contractor
scope, the workbook is rendered and stored as an ``AuditReport`` so the
respective users can later download their own reports.
"""

from django.core.files.base import ContentFile

from .engine import Scope, compute, quarter_bounds
from .metrics import build_overrides, summarize
from .reports import build_row_overrides
from .render import build_workbook
from .framework import PARAMETERS


def fy_label(fy_start_year):
    return f"{fy_start_year}-{str((fy_start_year + 1) % 100).zfill(2)}"


def generate_for_scope(scope_type, *, employer=None, contractor=None, site=None,
                       fy_start_year=None, quarter=None, actor=None):
    from bss_core.models import AuditReport

    start, end = quarter_bounds(fy_start_year, quarter)
    fy = fy_label(fy_start_year)
    scope = Scope(employer=employer, contractor=contractor, site=site, start=start, end=end)
    dataset = compute(scope)
    data = build_workbook(overrides=build_overrides(dataset),
                          row_overrides=build_row_overrides(scope, dataset))

    report = AuditReport(
        scope_type=scope_type, employer=employer, contractor=contractor, site=site,
        financial_year=fy, quarter=quarter, period_start=start, period_end=end,
        report_types="co,board,auditor",
        parameters=dataset["parameters"], summary=summarize(dataset["results"]),
        generated_by=actor,
    )
    who = (employer.id if employer else contractor.id if contractor else "all")
    report.file.save(f"audit-{scope_type.lower()}-{who}-FY{fy}-Q{quarter}.xlsx",
                     ContentFile(data), save=False)
    report.save()
    return report


def generate_quarter(fy_start_year, quarter, actor=None):
    """Generate reports for every employer and contractor for the quarter."""
    from bss_core.models import User

    created = []
    for employer in User.objects.filter(role="employer"):
        created.append(generate_for_scope("EMPLOYER", employer=employer,
                                          fy_start_year=fy_start_year, quarter=quarter, actor=actor))
    for contractor in User.objects.filter(role="contractor"):
        created.append(generate_for_scope("CONTRACTOR", contractor=contractor,
                                          fy_start_year=fy_start_year, quarter=quarter, actor=actor))
    return created


def framework_parameters():
    return PARAMETERS
