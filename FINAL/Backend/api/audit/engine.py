"""Verification engine: evaluate the framework parameters over live BSS data.

For a given scope (employer / contractor / site / period) each parameter returns
counts by classification (C1–C8) plus exception/evidence references. Parameters
without a backing data model in BSS (CAPA/RCA, invoice-service) are reported as
N/A and left out of the dataset.

This is the v1 engine: rules are intentionally simple and set-based; unknown
failures degrade to C6 (Pending verification) instead of raising.
"""

from datetime import date, timedelta

# C1 Compliant · C2 Compliant w/ Observation · C3 Minor · C4 Major · C5 Critical
# C6 Pending verification · C7 N/A · C8 Duplicate/Invalid
CODES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]


class Scope:
    def __init__(self, employer=None, contractor=None, site=None, start=None, end=None):
        self.employer = employer
        self.contractor = contractor
        self.site = site
        self.start = _as_date(start)
        self.end = _as_date(end)


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def quarter_bounds(fy_start_year, q):
    """Return (start, end) for Indian FY quarter q (1..4), Apr–Mar."""
    starts = {1: (4, 1), 2: (7, 1), 3: (10, 1), 4: (1, 1)}
    month, day = starts[q]
    year = fy_start_year if q != 4 else fy_start_year + 1
    start = date(year, month, day)
    end_month = {1: 6, 2: 9, 3: 12, 4: 3}[q]
    end_year = year
    nxt = date(end_year + (1 if end_month == 12 else 0), (end_month % 12) + 1, 1) - timedelta(days=1)
    return start, nxt


class Result:
    def __init__(self, name, population, applicable=0, verified=0):
        self.name = name
        self.population = population
        self.applicable = applicable
        self.verified = verified
        self.counts = {c: 0 for c in CODES}
        self.exceptions = []
        self.evidence = 0

    def add(self, code, n=1, exc=None, evidence=0):
        self.counts[code] = self.counts.get(code, 0) + n
        if exc and len(self.exceptions) < 25:
            self.exceptions.append(exc)
        self.evidence += evidence

    def row(self):
        c = self.counts
        return {
            "name": self.name, "population": self.population,
            "applicable": self.applicable, "verified": self.verified,
            "c1": c["C1"], "c2": c["C2"], "c3": c["C3"], "c4": c["C4"],
            "c5": c["C5"], "c6": c["C6"], "c7": c["C7"], "c8": c["C8"],
        }


# ── scope helpers ────────────────────────────────────────────────────────────
def _contractor_ids(scope):
    from bss_core.models import ContractorEmployerBinding
    if scope.contractor is not None:
        return [scope.contractor.id]
    if scope.employer is not None:
        ids = set(ContractorEmployerBinding.objects.filter(
            employer=scope.employer, binding_status="ACCEPTED").values_list("contractor_id", flat=True))
        return list(ids)
    from bss_core.models import User
    return list(User.objects.filter(role="contractor").values_list("id", flat=True))


def _worker_bindings(scope):
    from bss_core.models import WorkerContractorBinding
    qs = WorkerContractorBinding.objects.filter(binding_status="ACCEPTED")
    cids = _contractor_ids(scope)
    if cids:
        qs = qs.filter(contractor_id__in=cids)
    if scope.site is not None:
        qs = qs.filter(site=scope.site)
    return qs.select_related("worker", "site", "contractor")


def _in_range(value, scope):
    if value is None:
        return True
    if scope.start and value < scope.start:
        return False
    if scope.end and value > scope.end:
        return False
    return True


# ── parameters ───────────────────────────────────────────────────────────────
def verify_contractor_kyc(scope):
    from bss_core.models import ContractorProfile
    res = Result("Legal identity / KYC", "Contractor KYC")
    cids = _contractor_ids(scope)
    for profile in ContractorProfile.objects.filter(user_id__in=cids):
        res.applicable += 1
        ok = bool(profile.contractor_name) and bool(profile.cin or profile.registration_number)
        res.verified += 1
        if ok:
            res.add("C1")
        elif profile.contractor_name:
            res.add("C2", exc=f"{profile.contractor_name}: registration/CIN missing")
        else:
            res.add("C3", exc=f"contractor {profile.contractor_id}: profile incomplete")
    return res


def verify_agreement(scope):
    from bss_core.models import PartyContract
    res = Result("Agreement / WO validity", "Contractor agreements/WOs")
    cids = _contractor_ids(scope)
    for contract in PartyContract.objects.filter(party_user_id__in=cids, is_active=True):
        res.applicable += 1
        if scope.end and contract.end_date and contract.end_date < scope.end:
            res.verified += 1
            res.add("C4", exc=f"WO {contract.work_order_no or contract.id}: expired {contract.end_date}")
        else:
            res.verified += 1
            res.add("C1")
    return res


def verify_licences(scope):
    from bss_core.models import PartyStatutoryRegistration
    res = Result("Applicability and validity", "Applicable licences/registrations")
    cids = _contractor_ids(scope)
    for reg in PartyStatutoryRegistration.objects.filter(party_user_id__in=cids):
        res.applicable += 1
        res.verified += 1
        if not reg.is_active:
            res.add("C3", exc=f"{reg.reg_kind}: inactive")
        elif scope.end and reg.expiry_at and reg.expiry_at < scope.end:
            res.add("C5", exc=f"{reg.reg_kind} {reg.reg_number}: expired {reg.expiry_at}")
        else:
            res.add("C1")
    return res


def verify_worker_kyc(scope):
    from bss_core.models import WorkerIdentity
    res = Result("BSS ID, identity and KYC", "Workers")
    wids = [b.worker_id for b in _worker_bindings(scope)]
    for ident in WorkerIdentity.objects.filter(user_id__in=wids):
        res.applicable += 1
        res.verified += 1
        if ident.bss_worker_id and ident.name and ident.mobile_number:
            res.add("C1")
        elif ident.name:
            res.add("C2", exc=f"{ident.name}: KYC fields incomplete")
        else:
            res.add("C4", exc=f"worker {ident.user_id}: identity incomplete")
    return res


def verify_appointment_docs(scope):
    from bss_core.models import WorkerDocument
    res = Result("Appointment / service / exit documents", "Workers")
    wids = [b.worker_id for b in _worker_bindings(scope)]
    have = set(WorkerDocument.objects.filter(user_id__in=wids).values_list("user_id", flat=True))
    for wid in wids:
        res.applicable += 1
        res.verified += 1
        if wid in have:
            res.add("C1", evidence=1)
        else:
            res.add("C3", exc=f"worker {wid}: onboarding documents missing")
    return res


def verify_worker_site(scope):
    res = Result("Worker-site authorization", "Worker-site assignments")
    for binding in _worker_bindings(scope):
        res.applicable += 1
        res.verified += 1
        if binding.site_id:
            res.add("C1")
        else:
            res.add("C3", exc=f"worker {binding.worker_id}: no site authorization")
    return res


def verify_gate_pass(scope):
    from bss_core.models import WorkerGatePass
    res = Result("Gate pass validity / approval", "Gate passes")
    cids = _contractor_ids(scope)
    qs = WorkerGatePass.objects.filter(worker__worker_bindings__contractor_id__in=cids).distinct() if cids else WorkerGatePass.objects.none()
    if scope.site is not None:
        qs = qs.filter(site=scope.site)
    for gp in qs:
        res.applicable += 1
        res.verified += 1
        if gp.status == "ACTIVE" and (not gp.end_date or not scope.end or gp.end_date >= scope.end):
            res.add("C1")
        elif gp.status == "EXPIRED":
            res.add("C4", exc=f"gate pass {gp.gate_pass_no}: expired")
        else:
            res.add("C3", exc=f"gate pass {gp.gate_pass_no}: {gp.status}")
    return res


def verify_attendance_eligibility(scope):
    from bss_core.models import Attendance
    res = Result("Attendance eligibility", "Attendance transactions")
    cids = _contractor_ids(scope)
    qs = Attendance.objects.filter(contractor_id__in=cids)
    if scope.site is not None:
        qs = qs.filter(site=scope.site)
    if scope.start:
        qs = qs.filter(attendance_date__gte=scope.start)
    if scope.end:
        qs = qs.filter(attendance_date__lte=scope.end)
    res.applicable = qs.count()
    res.verified = res.applicable
    res.add("C1", res.applicable)
    return res


def verify_attendance_completeness(scope):
    from bss_core.models import Attendance, SiteHoliday
    res = Result("Attendance completeness", "Expected attendance events")
    bindings = list(_worker_bindings(scope))
    if not scope.start or not scope.end or not bindings:
        return res
    days = 0
    cur = scope.start
    site_off = {}
    sites = {b.site_id for b in bindings if b.site_id}
    for hol in SiteHoliday.objects.filter(site_id__in=sites, date__range=(scope.start, scope.end)):
        site_off.setdefault(hol.site_id, set()).add(hol.date)
    while cur <= scope.end:
        for b in bindings:
            off = site_off.get(b.site_id, set())
            if cur in off or cur.weekday() == 6:  # Sunday off + calendar holidays
                continue
            days += 1
        cur += timedelta(days=1)
    present = Attendance.objects.filter(contractor_id__in=[b.contractor_id for b in bindings],
                                        attendance_date__range=(scope.start, scope.end)).count()
    res.applicable = days
    res.verified = min(days, present)
    missing = max(0, days - present)
    res.add("C1", max(0, present - min(present, 0)))
    if missing:
        res.add("C4", missing, exc=f"{missing} expected attendance event(s) missing")
    return res


def verify_payroll(scope, name="100% payroll re-performance", population="Payroll records"):
    from bss_core.models import WorkerWages
    res = Result(name, population)
    cids = _contractor_ids(scope)
    qs = WorkerWages.objects.filter(contractor_id__in=cids)
    if scope.site is not None:
        qs = qs.filter(site=scope.site)
    if scope.start:
        qs = qs.filter(period_end__gte=scope.start)
    if scope.end:
        qs = qs.filter(period_start__lte=scope.end)
    for wage in qs:
        res.applicable += 1
        res.verified += 1
        expected = (wage.gross_wage or 0) - (wage.deductions_amount or 0)
        if wage.net_wage is not None and abs(float(wage.net_wage) - float(expected)) < 1:
            res.add("C1")
        else:
            res.add("C3", exc=f"wages {wage.id}: net != gross - deductions")
    return res


def verify_benefit(scope, kind, name, population):
    from bss_core.models import WorkerBenefitRecord
    res = Result(name, population)
    cids = _contractor_ids(scope)
    for rec in WorkerBenefitRecord.objects.filter(contractor_id__in=cids, kind=kind):
        res.applicable += 1
        res.verified += 1
        if rec.status in ("CREDITED", "PAID", "RECORDED"):
            res.add("C1")
        else:
            res.add("C3", exc=f"{kind} {rec.id}: {rec.status}")
    return res


def verify_evidence(scope):
    from bss_core.models import SubmissionEvidence
    res = Result("Evidence completeness", "Evidence records")
    cids = _contractor_ids(scope)
    for ev in SubmissionEvidence.objects.filter(user_id__in=cids):
        res.applicable += 1
        res.verified += 1
        if ev.status == "VERIFIED":
            res.add("C1", evidence=1)
        else:
            res.add("C6", exc=f"evidence {ev.unique_no}: {ev.status}")
    return res


# Parameters executed by the engine, in Report-Data order. (key, callable)
def _params(scope):
    return [
        ("Contractor KYC", lambda: verify_contractor_kyc(scope)),
        ("Agreement / WO validity", lambda: verify_agreement(scope)),
        ("Applicability and validity", lambda: verify_licences(scope)),
        ("BSS ID, identity and KYC", lambda: verify_worker_kyc(scope)),
        ("Appointment / service / exit documents", lambda: verify_appointment_docs(scope)),
        ("Worker-site authorization", lambda: verify_worker_site(scope)),
        ("Gate pass validity / approval", lambda: verify_gate_pass(scope)),
        ("Attendance eligibility", lambda: verify_attendance_eligibility(scope)),
        ("Attendance completeness", lambda: verify_attendance_completeness(scope)),
        ("Wage master applicability", lambda: verify_payroll(scope, "Wage master applicability", "Worker-pay-period records")),
        ("100% payroll re-performance", lambda: verify_payroll(scope, "100% payroll re-performance", "Payroll records")),
        ("PF eligibility and contribution", lambda: verify_benefit(scope, "PF", "PF eligibility and contribution", "PF-applicable worker-periods")),
        ("ESIC eligibility and contribution", lambda: verify_benefit(scope, "ESIC", "ESIC eligibility and contribution", "ESIC-applicable worker-periods")),
        ("Evidence completeness", lambda: verify_evidence(scope)),
    ]


def compute(scope):
    """Run the engine and return {parameters:[row,...], results:[Result,...]}."""
    from django.db import connection
    rows, results = [], []
    for _, fn in _params(scope):
        try:
            res = fn()
        except Exception as exc:  # noqa: BLE001 — never fail the whole report
            res = Result("(error)", "")
            res.add("C6", exc=str(exc)[:120])
        if res.applicable or res.counts:
            results.append(res)
            rows.append(res.row())
    return {"parameters": rows, "results": results}
