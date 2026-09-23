"""BSS Audit & Verification Reports.

Builds the audit/verification workbook (Verification Framework, Classification,
Report Mapping, Report Data, Results Engine, and the three audience reports:
Compliance Officer, Management Board, Auditor) from the specification derived
from ``Requirements/BSS_Sample_Reports_Audit Validation.xlsx``, populated from
live BSS data by the verification engine.
"""

from .engine import CODES, Result, Scope, compute, quarter_bounds  # noqa: F401
from .metrics import build_overrides, summarize  # noqa: F401
from .reports import build_row_overrides  # noqa: F401
from .render import SHEETS_ALL, build_workbook  # noqa: F401

__all__ = [
    "CODES", "Result", "Scope", "compute", "quarter_bounds",
    "build_overrides", "summarize", "build_row_overrides", "SHEETS_ALL", "build_workbook",
]
