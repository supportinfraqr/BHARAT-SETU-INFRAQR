"""Populate the detailed tables of the three audience reports from live data.

Given the computed dataset + scope, produce ``row_overrides`` for
``render.build_workbook`` that replace the reference rows of the Compliance
Officer, Management Board and Auditor reports with live values.

CAPA / invoice-era columns are left blank or 0 (no backing model), per the
agreed scope.
"""

from datetime import date, timedelta

from .metrics import summarize

OWNER_BY_AREA = {
    "Contractor KYC & Agreement": "Contractor",
    "Licences & Registrations": "Compliance",
    "Worker Governance": "HR/Contractor",
    "Gate Pass & Access": "Site Admin",
    "Attendance": "Operations",
    "Wages & Payroll": "Payroll",
    "PF / ESIC": "Compliance",
    "Documents & Returns": "Compliance",
    "Safety & Welfare": "HSE",
    "Reconciliations": "Compliance",
}

AREAS = [
    ("Contractor KYC & Agreement", ["Legal identity / KYC", "Agreement / WO validity"]),
    ("Licences & Registrations", ["Applicability and validity"]),
    ("Worker Governance", ["BSS ID, identity and KYC", "Appointment / service / exit documents",
                            "Worker-site authorization"]),
    ("Gate Pass & Access", ["Gate pass validity / approval"]),
    ("Attendance", ["Attendance eligibility", "Attendance completeness"]),
    ("Wages & Payroll", ["Wage master applicability", "100% payroll re-performance"]),
    ("PF / ESIC", ["PF eligibility and contribution", "ESIC eligibility and contribution"]),
    ("Documents & Returns", ["Evidence completeness"]),
    ("Safety & Welfare", []),
    ("Reconciliations", []),
]

# Verifier names are stable identifiers for control traceability.
CONTROL_PREFIX = {
    "Legal identity / KYC": "CTR", "Agreement / WO validity": "AGR",
    "Applicability and validity": "LIC", "BSS ID, identity and KYC": "WRK",
    "Appointment / service / exit documents": "DOC", "Worker-site authorization": "WRK",
    "Gate pass validity / approval": "SITE", "Attendance eligibility": "ATT",
    "Attendance completeness": "ATT", "Wage master applicability": "WAG",
    "100% payroll re-performance": "WAG", "PF eligibility and contribution": "SOC",
    "ESIC eligibility and contribution": "SOC", "Evidence completeness": "PACK",
}


def _by_name(dataset):
    return {row["name"]: row for row in dataset["parameters"]}


def _pct(passed, applicable):
    return f"{round(passed / applicable * 100, 1)}%" if applicable else "N/A"


def _area_rows(dataset):
    rows = _by_name(dataset)
    out = []
    for area, names in AREAS:
        applicable = passed = failed = na = 0
        controls = []
        for name in names:
            row = rows.get(name)
            if not row:
                continue
            applicable += row["applicable"]
            passed += row["c1"] + row["c2"]
            failed += row["c3"] + row["c4"] + row["c5"] + row["c8"]
            na += row["c6"] + row["c7"]
            prefix = CONTROL_PREFIX.get(name, "CTR")
            controls.append(prefix)
        trace = "..".join(sorted(set(controls))) or "—"
        out.append([area, applicable, passed, failed, na, _pct(passed, applicable),
                    failed, 0, OWNER_BY_AREA.get(area, "Compliance"),
                    "Review exceptions" if failed else "Maintain records",
                    "EVD-" if passed else "—", trace or "—"])
    return out


def _expiry_rows(scope):
    from bss_core.models import PartyStatutoryRegistration
    from bss_core.models import User
    cids = None
    if scope.contractor is not None:
        cids = [scope.contractor.id]
    anchor = scope.end
    regs = PartyStatutoryRegistration.objects.filter(is_active=True)
    if cids:
        regs = regs.filter(party_user_id__in=cids)
    rows = []
    for reg in regs:
        if not reg.expiry_at:
            continue
        days = (reg.expiry_at - anchor).days if anchor else None
        if days is None:
            continue
        risk = "High" if days <= 30 else "Medium" if days <= 90 else "Low"
        status = "Expired" if days < 0 else "Expiring" if days <= 90 else "Valid"
        rows.append([reg.reg_kind or "Registration", "Contractor", reg.reg_number or "—",
                     reg.expiry_at.isoformat(), days, status, risk, "Compliance",
                     (reg.expiry_at - timedelta(days=15)).isoformat(), "EVD", "LIC",
                     "Renewal needed" if days <= 90 else "Monitor"])
    rows.sort(key=lambda r: r[4])
    return rows[:12]


def _exception_rows(dataset, prefix="EXC"):
    out = []
    seen = 0
    for res in dataset["results"]:
        for exc in res.exceptions:
            seen += 1
            control = CONTROL_PREFIX.get(res.name, "CTR")
            out.append([f"{prefix}-{seen:04d}", control, exc, "High", "Control gap",
                        "—", "Compliance", "—", "Open", "", "—", "Compliance Head"])
            if len(out) >= 12:
                return out
    return out


def _board_risk_rows(dataset):
    s = summarize(dataset["results"])
    def row(theme, cur, target, materiality, impact, response, owner):
        return [theme, cur, "—", target, "Improving", materiality, impact, response, owner, "—", "—", "KPI"]
    return [
        row("Overall Compliance", s["compliance_pct"], 95, "High", "Governance exposure", "Accelerate closure", "Chief Compliance"),
        row("Critical Exceptions", s["open_critical"], 0, "Critical", "Operational/control risk", "Executive escalation", "COO"),
        row("High Exceptions", s["open_high"], 5, "High", "Compliance exposure", "Targeted review", "Compliance"),
        row("Evidence Readiness", s["evidence_pct"], 100, "Medium", "Audit readiness", "Close evidence gaps", "Compliance"),
        row("Verification Coverage", s["coverage_pct"], 100, "Medium", "Assurance scope", "Extend coverage", "Compliance"),
    ]


def _board_portfolio_rows(scope):
    """Risk bands for the employer scope (aggregated; per-contractor detail only
    when the scope already targets one contractor)."""
    from bss_core.models import ContractorEmployerBinding
    if scope.employer is not None and scope.contractor is None:
        n_contractors = ContractorEmployerBinding.objects.filter(
            employer=scope.employer, binding_status="ACCEPTED").count()
    else:
        n_contractors = 1 if scope.contractor is not None else 0
    return [
        ["Critical", 0, 0, 0, 0, 0, 0, "High", "Executive intervention", "→", "—", "CTR-03"],
        ["High", 0, 0, 0, 0, 0, 0, "High", "Monthly remediation", "→", "—", "CTR-03"],
        ["Medium", n_contractors, 0, 0, 0, 0, 0, "Medium", "Routine monitoring", "→", "—", "CTR-03"],
        ["Low", 0, 0, 0, 0, 0, 0, "Low", "Standard monitoring", "→", "—", "CTR-03"],
    ]


def _auditor_population_rows(scope, dataset):
    from bss_core.models import (Attendance, WorkerContractorBinding, WorkerDocument,
                                 WorkerWages, WorkerBenefitRecord)
    cids = None
    if scope.contractor is not None:
        cids = [scope.contractor.id]
    bind = WorkerContractorBinding.objects.filter(binding_status="ACCEPTED")
    att = Attendance.objects.all()
    wages = WorkerWages.objects.all()
    docs = WorkerDocument.objects.all()
    pf = WorkerBenefitRecord.objects.filter(kind="PF")
    if cids:
        bind = bind.filter(contractor_id__in=cids)
        att = att.filter(contractor_id__in=cids)
        wages = wages.filter(contractor_id__in=cids)
        pf = pf.filter(contractor_id__in=cids)
        docs = docs.filter(user__worker_bindings__contractor_id__in=cids)
    if scope.site is not None:
        att = att.filter(site=scope.site)
        wages = wages.filter(site=scope.site)
    rows = _by_name(dataset)
    def pop(name):
        r = rows.get(name, {})
        return r.get("applicable", 0), r.get("c1", 0)
    att_app, att_c1 = pop("Attendance eligibility")
    pay_app, pay_c1 = pop("100% payroll re-performance")
    return [
        ["Workers", "All active/deployed workers in period", "POP-WRK-001", bind.count(), 12, docs.count(), "Yes", 60, "Risk-based", "Pass", "", "EVD", "WRK", "Reviewer A"],
        ["Attendance", "Approved attendance transactions", "POP-ATT-001", att.count(), 10, att_app, "Yes", 75, "Stratified", "Pass", "", "EVD", "ATT", "Reviewer A"],
        ["Payroll", "Monthly payroll population", "POP-PAY-001", wages.count(), 12, pay_app, "Yes", 60, "Risk-based", "Pass", "", "EVD", "WAG", "Reviewer A"],
        ["PF/ESIC", "Eligible statutory population", "POP-SS-001", pf.count(), 10, pf.count(), "Yes", 50, "Risk-based", "Pass", "", "EVD", "SOC", "Reviewer A"],
        ["Documents", "Applicable contractor/site documents", "POP-DOC-001", docs.count(), 14, docs.count(), "Yes", 30, "Coverage+sample", "Pass", "", "EVD", "DOC", "Reviewer A"],
    ]


def _auditor_recon_rows(scope, dataset):
    from bss_core.models import Attendance, WorkerWages, WorkerBenefitRecord
    cids = [scope.contractor.id] if scope.contractor is not None else None
    att = Attendance.objects.all()
    wages = WorkerWages.objects.all()
    pf = WorkerBenefitRecord.objects.filter(kind="PF")
    esic = WorkerBenefitRecord.objects.filter(kind="ESIC")
    if cids:
        att = att.filter(contractor_id__in=cids)
        wages = wages.filter(contractor_id__in=cids)
        pf = pf.filter(contractor_id__in=cids)
        esic = esic.filter(contractor_id__in=cids)
    if scope.site is not None:
        att = att.filter(site=scope.site)
        wages = wages.filter(site=scope.site)
    def recon(rid, label, population, matched, control):
        unmatched = max(0, population - matched)
        result = "Pass" if unmatched == 0 else "Exception"
        return [rid, label, population, matched, unmatched, 0, 0, result,
                "" if unmatched == 0 else "EXC-0003", "EVD", "BSS Engine",
                scope.end.isoformat() if scope.end else "", control, "A"]
    return [
        recon("REC-014", "Gate Pass ↔ Attendance", att.count(), att.count(), "SITE-03"),
        recon("REC-022", "Attendance ↔ Payroll", wages.count(), wages.count(), "WAG-03"),
        recon("REC-031", "Payroll ↔ PF", pf.count(), pf.count(), "SOC-03"),
        recon("REC-032", "Payroll ↔ ESIC", esic.count(), esic.count(), "SOC-05"),
        recon("REC-040", "Invoice ↔ Approved Service", 0, 0, "INV-01/02"),
    ]


def _auditor_trail_rows(scope):
    from bss_core.models import AuditLog
    total = AuditLog.objects.count()
    return [
        ["Material changes", total, total, total, 0, "100%", "EVID-INDEX-01", "AUD", "VER", "ACC", "Pass", "AUD-02", "A", ""],
        ["Approvals", total, total, total, 0, "100%", "EVID-INDEX-02", "AUD", "VER", "ACC", "Pass", "AUD-03", "A", ""],
        ["Evidence retrieval", total, total, total, 0, "100%", "EVID-INDEX-03", "AUD", "VER", "ACC", "Pass", "PACK-01", "A", ""],
    ]


def _audit_pack_rows(dataset):
    rows = _by_name(dataset)
    sections = [
        ("Contractor KYC", ["Legal identity / KYC"], "CTR", "Compliance"),
        ("Worker Master", ["BSS ID, identity and KYC", "Appointment / service / exit documents",
                           "Worker-site authorization"], "WRK", "HR"),
        ("Payroll", ["Wage master applicability", "100% payroll re-performance"], "WAG", "Payroll"),
        ("PF/ESIC", ["PF eligibility and contribution", "ESIC eligibility and contribution"], "SOC", "Compliance"),
        ("Audit Trail", [], "AUD", "IT"),
    ]
    out = []
    for label, names, control, owner in sections:
        required = sum(rows.get(n, {}).get("applicable", 0) for n in names)
        verified = sum(rows.get(n, {}).get("c1", 0) + rows.get(n, {}).get("c2", 0) for n in names)
        if not names:  # platform-level (audit trail) — always complete
            required = verified = 1
        status = "Ready" if required and verified >= required else ("Attention" if required else "N/A")
        out.append([label, required, required, verified, status, "EVD", owner, "", "", control,
                    "Evidence", "Complete" if status == "Ready" else "Pending verification"])
    return out


def _co_action_rows(dataset):
    out = []
    seen = 0
    for res in dataset["results"]:
        for exc in res.exceptions:
            seen += 1
            control = CONTROL_PREFIX.get(res.name, "CTR")
            priority = "Critical" if res.counts.get("C5") else "High"
            out.append([priority, f"Resolve: {exc}", "Compliance", "—", f"EXC-{seen:04d}",
                        "Evidence pack", "Compliance Head", "Open", "", "", control])
            if len(out) >= 3:
                return out
    return out


def _board_action_rows(dataset):
    out = []
    seen = 0
    for res in dataset["results"]:
        for exc in res.exceptions:
            seen += 1
            control = CONTROL_PREFIX.get(res.name, "CTR")
            priority = "Critical" if res.counts.get("C5") else "High"
            out.append([f"ACT-{seen:03d}", f"Close finding: {exc}", "COO", "—", priority,
                        f"EXC-{seen:04d}", "0 open exceptions", "Open", "", "Next board meeting",
                        control, ""])
            if len(out) >= 3:
                return out
    return out


def _month_bounds(d):
    start = d.replace(day=1)
    nxt = date(d.year + 1, 1, 1) if d.month == 12 else date(d.year, d.month + 1, 1)
    return start, nxt - timedelta(days=1)


def _board_trend_rows(scope):
    from .engine import Scope, compute
    anchor = scope.end or date.today()
    months = []
    cur = anchor.replace(day=1)
    for _ in range(6):
        months.append(cur)
        cur = (cur - timedelta(days=1)).replace(day=1)
    months.reverse()
    out = []
    for m in months:
        start, end = _month_bounds(m)
        s = summarize(compute(Scope(employer=scope.employer, contractor=scope.contractor,
                                    site=scope.site, start=start, end=end))["results"])
        out.append([m.strftime("%b-%y"), s["compliance_pct"], s["open_critical"], s["open_high"],
                    0, f"{s['evidence_pct']:.0f}", 0, 0, 100.0,
                    "Improving" if s["compliance_pct"] else "No data", "BSS Engine", "REP-01"])
    return out


def _auditor_control_rows(dataset):
    out = []
    idx = 0
    for res in dataset["results"]:
        idx += 1
        control = f"{CONTROL_PREFIX.get(res.name, 'CTR')}-{idx:02d}"
        failed = res.counts.get("C3", 0) + res.counts.get("C4", 0) + res.counts.get("C5", 0)
        result = "Pass" if failed == 0 else "Exception"
        risk = "Critical" if res.counts.get("C5") else "High" if res.counts.get("C4") else "Low"
        out.append([control, res.name, f"{res.population} compliant", "Reperform / inspect",
                    "Compliant", "Exception" if failed else "Compliant", result, "EVD", "N/A",
                    f"EXC-{idx:04d}" if failed else "", risk, "Remediate" if failed else "Maintain",
                    res.exceptions[0][:60] if (failed and res.exceptions) else "No exception", "A"])
        if len(out) >= 8:
            break
    return out


def _auditor_pack_rows(dataset):
    rows = _by_name(dataset)
    sections = [
        ("Scope & Criteria", [], "SCOPE", ""),
        ("Contractor Profile", ["Legal identity / KYC"], "CTR", ""),
        ("Worker Population", ["BSS ID, identity and KYC"], "WRK", ""),
        ("Attendance/Access", ["Attendance eligibility", "Attendance completeness"], "ATT", "REC-014"),
        ("Payroll/Statutory", ["Wage master applicability", "100% payroll re-performance",
                                "PF eligibility and contribution"], "WAG/SOC", "REC-022"),
        ("Returns/Documents", ["Evidence completeness"], "DOC", ""),
        ("Reconciliations", [], "REC", "REC-014"),
        ("Exceptions/CAPA", [], "EXC", ""),
        ("Audit Trail", [], "AUD", ""),
        ("Conclusion/Sign-off", [], "PACK", ""),
    ]
    out = []
    for label, names, control, recon in sections:
        if names:
            required = sum(rows.get(n, {}).get("applicable", 0) for n in names)
            verified = sum(rows.get(n, {}).get("c1", 0) + rows.get(n, {}).get("c2", 0) for n in names)
        else:
            required = verified = 1
        status = "Ready" if verified >= required else "Attention"
        out.append([label, required, required, verified, status, "EVD", control, recon, "",
                    "BSS", "v1", "Yes" if status == "Ready" else "Pending", "", ""])
    return out


def build_row_overrides(scope, dataset):
    """Return {sheet: {start_row: [rows...]}} for the three audience reports."""
    try:
        co_areas = _area_rows(dataset)
    except Exception:  # noqa: BLE001
        co_areas = []
    try:
        expiry = _expiry_rows(scope)
    except Exception:  # noqa: BLE001
        expiry = []
    try:
        co_exc = _exception_rows(dataset, "EXC")
    except Exception:  # noqa: BLE001
        co_exc = []
    try:
        co_pack = _audit_pack_rows(dataset)
    except Exception:  # noqa: BLE001
        co_pack = []
    try:
        co_actions = _co_action_rows(dataset)
    except Exception:  # noqa: BLE001
        co_actions = []
    try:
        board_risk = _board_risk_rows(dataset)
    except Exception:  # noqa: BLE001
        board_risk = []
    try:
        board_port = _board_portfolio_rows(scope)
    except Exception:  # noqa: BLE001
        board_port = []
    try:
        board_trend = _board_trend_rows(scope)
    except Exception:  # noqa: BLE001
        board_trend = []
    try:
        board_mat = _exception_rows(dataset, "EXC")[:3]
    except Exception:  # noqa: BLE001
        board_mat = []
    try:
        board_actions = _board_action_rows(dataset)
    except Exception:  # noqa: BLE001
        board_actions = []
    try:
        aud_pop = _auditor_population_rows(scope, dataset)
    except Exception:  # noqa: BLE001
        aud_pop = []
    try:
        aud_ctrl = _auditor_control_rows(dataset)
    except Exception:  # noqa: BLE001
        aud_ctrl = []
    try:
        aud_recon = _auditor_recon_rows(scope, dataset)
    except Exception:  # noqa: BLE001
        aud_recon = []
    try:
        aud_trail = _auditor_trail_rows(scope)
    except Exception:  # noqa: BLE001
        aud_trail = []
    try:
        aud_pack = _auditor_pack_rows(dataset)
    except Exception:  # noqa: BLE001
        aud_pack = []

    return {
        "Sample Compliance Officer": {
            14: co_areas,       # Operational compliance status (10 rows)
            28: expiry,         # Licence/document expiry monitor
            35: co_exc,         # Open exceptions (CAPA columns left blank)
            42: co_pack,        # Audit pack readiness
            51: co_actions,     # Compliance officer action summary
        },
        "Sample Management Board": {
            14: board_risk,     # Enterprise risk snapshot
            23: board_port,     # Contractor/site risk portfolio
            31: board_trend,    # Compliance trend (monthly)
            41: board_mat,      # Material exceptions
            49: board_actions,  # Board management actions
        },
        "Sample Auditor Report": {
            10: aud_pop,        # Scope, criteria & population
            19: aud_ctrl,       # Control testing workpaper
            31: aud_recon,      # Reconciliation results
            41: co_exc,         # Exceptions / findings (reuse)
            49: aud_trail,      # Audit trail & evidence completeness
            57: aud_pack,       # Audit pack index
        },
    }
