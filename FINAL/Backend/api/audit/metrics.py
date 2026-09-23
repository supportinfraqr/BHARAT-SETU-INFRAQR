"""Results Engine: turn per-parameter classification counts into the metric
percentages defined in the specification, and build the cell overrides that
populate the Report Data sheet and the three report dashboards.
"""

from .engine import CODES

# Report Data sheet: parameter name -> 1-based row number.
REPORT_DATA_ROWS = {
    "Legal identity / KYC": 5,
    "Agreement / WO validity": 6,
    "Applicability and validity": 7,
    "BSS ID, identity and KYC": 8,
    "Appointment / service / exit documents": 9,
    "Worker-site authorization": 10,
    "Gate pass validity / approval": 11,
    "Attendance eligibility": 12,
    "Attendance completeness": 13,
    "Attendance edits": 14,
    "Wage master applicability": 15,
    "100% payroll re-performance": 16,
    "Bank payment verification": 17,
    "PF eligibility and contribution": 18,
    "ESIC eligibility and contribution": 19,
    "Mandatory records": 20,
    "Medical fitness": 21,
    "Induction / PPE / training": 22,
    "Invoice-service support": 23,
    "Cross-module reconciliation": 24,
    "RCA / corrective / preventive action": 25,
    "Critical transaction traceability": 26,
    "Evidence completeness": 27,
}

# Report Data value columns: C..J = applicable, verified, C1..C6.
_APPLICABLE, _VERIFIED = 3, 4
_C1, _C2, _C3, _C4, _C5, _C6 = 5, 6, 7, 8, 9, 10


def summarize(results):
    total = {code: sum(r.counts[code] for r in results) for code in CODES}
    applicable = sum(r.applicable for r in results)
    verified = sum(r.verified for r in results)
    evidence = sum(r.evidence for r in results)
    c1, c2, c3, c4, c5, c6, c8 = (total["C1"], total["C2"], total["C3"],
                                  total["C4"], total["C5"], total["C6"], total["C8"])

    def pct(n, d):
        return round((n / d) * 100, 1) if d else 0.0

    return {
        "applicable": applicable,
        "verified": verified,
        "coverage_pct": pct(verified, applicable),
        "compliance_pct": pct(c1 + c2, verified),      # compliant incl. observations
        "c1_pct": pct(c1, verified),
        "c2_pct": pct(c2, verified),
        "exception_pct": pct(c3 + c4 + c5 + c8, verified),
        "critical_pct": pct(c5, verified),
        "pending_pct": pct(c6, applicable),
        "open_critical": c5,
        "open_high": c4,
        "evidence": evidence,
        "evidence_pct": pct(evidence, verified),
    }


def build_overrides(dataset):
    """Return {sheet_name: {row: {col: value}}} for render.build_workbook."""
    results = dataset["results"]
    summary = summarize(results)

    # Start every Report Data parameter row at zero so uncomputed parameters
    # (CAPA, invoice, not-yet-modelled) never leak the reference sample values.
    report_data = {r: {_APPLICABLE: 0, _VERIFIED: 0, _C1: 0, _C2: 0, _C3: 0,
                       _C4: 0, _C5: 0, _C6: 0} for r in REPORT_DATA_ROWS.values()}
    for row in dataset["parameters"]:
        r = REPORT_DATA_ROWS.get(row["name"])
        if not r:
            continue
        report_data[r] = {
            _APPLICABLE: row["applicable"], _VERIFIED: row["verified"],
            _C1: row["c1"], _C2: row["c2"], _C3: row["c3"],
            _C4: row["c4"], _C5: row["c5"], _C6: row["c6"],
        }

    # Headline dashboards (A10/D10/G10/J10 in each report's KPI row).
    co = {
        10: {1: f"{summary['compliance_pct']}%", 4: summary["open_critical"],
             7: summary["open_high"], 10: f"{summary['evidence_pct']:.0f}%"},
    }
    board = {
        10: {1: f"{summary['compliance_pct']}%", 4: summary["open_critical"],
             7: summary["open_high"], 10: "0%"},
    }
    return {
        "Report Data": report_data,
        "Sample Compliance Officer": co,
        "Sample Management Board": board,
    }
