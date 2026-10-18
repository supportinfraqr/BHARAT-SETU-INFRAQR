"""Post-audit statistics shared by the HTML report, the PDF report and the workbook.

  stats(run)             overall score, status counts, categories, audit areas, workers, top findings, exposure
  WORKER_PARAMS          the worker-wise compliance matrix (columns of the worker view)
  financial_exposure(run) indicative money at stake for the wage month (not a legal demand)

Compliance score = (Complied + ½ · Partially Complied) ÷ (Complied + Partially + Non-Complied + Document Not Available).
"""

from __future__ import annotations

from collections import Counter, defaultdict

from .checks import C, DNA, FAIL, NA, NAU, NC, NV, PC, RISKS, worst_status
from .evidence import nz

STATUSES = [C, PC, NC, DNA, NV, NA, NAU]
RISK_W = {"Critical": 10, "High": 5, "Medium": 3, "Low": 1}

# worker-wise view: column -> catalogue S.No (Possible sheet) whose worker findings feed it
WORKER_PARAMS = [
    ("identity", "Identity vs ID", "Name, father, DOB, gender, Aadhaar, PAN, bank vs worker folder", list(range(2, 13))),
    ("crossdoc", "Records agree", "Same name / DOB / DOJ / UAN / amounts across documents", list(range(13, 29))),
    ("minwage", "Min wage", "Wage rate ≥ minimum wage; rate on certificates = register", [39, 113]),
    ("wagecalc", "Wage calc", "Net, basic ≥ 50%, PT, deductions ≤ 50%, gross, absence deduction", [29, 30, 33, 34, 43, 157]),
    ("pfesi", "PF / ESI", "PF & ESI deducted, remitted and reported", [24, 25, 31, 32, 35, 36, 37, 40, 41, 76, 77, 169]),
    ("ot", "OT @2×", "Overtime / rest-day work paid at twice the rate", [48, 160, 162]),
    ("bonus", "Bonus", "Bonus 8.33–20%, register = wages, proportionate", [23, 42, 168]),
    ("attendance", "Attendance", "Gate register = muster, daily marking, rest days", list(range(51, 59)) + [161]),
    ("registers", "On registers", "Entry in Workman, Wage, Muster, Bonus, Leave, payment, PF / ESIC returns", [1] + list(range(70, 78))),
    ("personal", "Personal file", "Appointment letter, Form-11 / 2, ID, bank proof, photo, age proof", list(range(59, 70)) + list(range(78, 87)) + [90, 143, 145]),
    ("leaver", "Leaver dues", "Service / experience certificate, F&F within 2 days", [28, 85, 150, 154]),
]


def score_of(counts) -> float | None:
    d = sum(counts.get(s, 0) for s in (C, PC, NC, DNA))
    return (counts.get(C, 0) + 0.5 * counts.get(PC, 0)) / d * 100 if d else None


def band(score: float | None) -> str:
    if score is None:
        return "na"
    return "green" if score >= 80 else "amber" if score >= 50 else "red"


def stats(run) -> dict:
    """Computed once per run and stored on it (never shared between runs in a long-lived process)."""
    if getattr(run, "_stats", None) is None:
        run._stats = _stats(run)
    return run._stats


def reset(run):
    run._stats = None


def _stats(run) -> dict:
    from .engine import CATEGORY_ORDER
    res = run.results
    sc = Counter(r.status for r in res)
    score = score_of(sc)
    score = 0.0 if score is None else score
    fails = [r for r in res if r.status in FAIL]
    risk_c = Counter(r.risk for r in fails)
    overall = next((k for k in RISKS if risk_c.get(k)), "Low")

    cats = {}
    for cat in CATEGORY_ORDER:
        rr = [r for r in res if run.category(r) == cat]
        if not rr:
            continue
        c = Counter(r.status for r in rr)
        cats[cat] = {"n": len(rr), "status": c, "score": score_of(c), "risk": Counter(r.risk for r in rr if r.status in FAIL),
                     "flags": sum(1 for r in rr for f in r.findings if f.is_flag),
                     "other": sum(c.get(s, 0) for s in (NV, NA, NAU))}

    areas = []
    for i, crit in enumerate(run.criteria, start=1):
        rr = [r for r in res if r.spec.criteria == crit]
        c = Counter(r.status for r in rr)
        rk = Counter(r.risk for r in rr if r.status in FAIL)
        areas.append({"no": i, "name": crit, "rows": rr, "n": len(rr), "status": c, "score": score_of(c),
                      "risk": next((k for k in RISKS if rk.get(k)), "None"), "flags": sum(1 for r in rr for f in r.findings if f.is_flag),
                      "possible": sum(r.spec.sheet == "Possible" for r in rr), "not_possible": sum(r.spec.sheet != "Possible" for r in rr)})

    workers = _workers(run)
    top = sorted(fails, key=lambda r: (RISKS.index(r.risk) if r.risk in RISKS else 9, [NC, DNA, PC].index(r.status),
                                       r.spec.sheet != "Possible", r.spec.sno))
    exposure = financial_exposure(run)
    on_rolls = [w for w in workers if w["on_rolls"]]
    ev = run.evidence
    return {
        "total": len(res), "possible": sum(r.spec.sheet == "Possible" for r in res), "not_possible": sum(r.spec.sheet != "Possible" for r in res),
        "subchecks": sum(len(r.subchecks) for r in res),
        "status_counts": {s: sc.get(s, 0) for s in STATUSES}, "score": score, "overall_risk": overall,
        "risk_counts": {k: risk_c.get(k, 0) for k in RISKS}, "categories": cats, "areas": areas,
        "worker_rows": workers, "workers_on_rolls": len(on_rolls), "gt_workers": len(ev.links),
        "gt_missing": sum(1 for c in ev.links.values() if not c),
        "workers_flagged": sum(1 for w in on_rolls if w["risk"].get("High") or w["risk"].get("Critical")),
        "total_flags": sum(1 for _, f in run.findings if f.is_flag),
        "worker_flags": sum(1 for _, f in run.findings if f.is_flag and f.entity == "worker"),
        "site_flags": [(r, f) for r, f in run.findings if f.entity == "site" and f.is_flag],
        "top_findings": top, "exposure": exposure,
        "uncovered_pf": len(exposure["pf_uncovered"]), "uncovered_esi": len(exposure["esi_uncovered"]),
        "findings_evaluated": len(run.findings),
        "ai_rows": sum(1 for r in res if r.verdict_by == "deepseek"),
        "differs": [r for r in res if r.cross_check.startswith("Rule check")],
    }


def _workers(run) -> list[dict]:
    ev = run.evidence
    rows: dict[str, dict] = {}
    for code, w in ev.workers.items():
        wg, wr = w.get("WG", {}), w.get("WR", {})
        rows[code] = {"worker": ev.worker_name(code), "code": code, "gt": ev.gt_for(code) or "", "on_rolls": True,
                      "designation": wr.get("designation") or wg.get("designation") or "", "doj": wr.get("doj") or wg.get("doj") or "",
                      "wage": wg.get("rate_total"), "gender": wr.get("gender") or "", "dob": wr.get("dob") or wg.get("dob") or "",
                      "uan": wg.get("uan") or "", "esic": wg.get("esic_ip") or "", "exit": wr.get("exit") or ""}
    for g, c in ev.links.items():
        if not c:
            f = ev.gt["workers"][g].get("fields", {})
            rows["gt:" + g] = {"worker": g.title(), "code": "—", "gt": g, "on_rolls": False, "designation": "Not on rolls", "doj": "",
                               "wage": None, "gender": (f.get("gender") or [[""]])[0][0], "dob": (f.get("dob") or [[""]])[0][0],
                               "uan": "", "esic": "", "exit": ""}
    by_name = {w["worker"].lower(): k for k, w in rows.items()}
    for w in rows.values():
        w.update(flags=0, score=0, risk=Counter(), cats=Counter(), items=[], counts=Counter(), params={})
    sno_param = {s: p[0] for p in WORKER_PARAMS for s in p[3]}
    param_status: dict[str, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for r, f in run.findings:
        if f.entity != "worker":
            continue
        k = f.code if f.code in rows else by_name.get(f.worker.lower())
        if not k:
            continue
        w = rows[k]
        w["counts"][f.status] += 1
        if r.spec.sheet == "Possible" and r.spec.sno in sno_param and not f.subcheck:
            param_status[k][sno_param[r.spec.sno]].append(f)
        if not f.is_flag:
            continue
        w["flags"] += 1
        w["score"] += RISK_W.get(f.risk, 0)
        w["risk"][f.risk] += 1
        w["cats"][run.category(r)] += 1
        w["items"].append((r, f))
    for k, w in rows.items():
        for p in WORKER_PARAMS:
            fs = param_status[k].get(p[0], [])
            w["params"][p[0]] = worst_status(f.status for f in fs) if fs else "—"
        flagged = [f for _, f in w["items"]]
        w["obs"] = " ".join(dict.fromkeys(f.observation for f in sorted(flagged, key=lambda f: RISKS.index(f.risk) if f.risk in RISKS else 9)[:3]))
        w["pct"] = score_of(w["counts"])
        w["worst_risk"] = next((rk for rk in RISKS if w["risk"].get(rk)), "None")
    return sorted(rows.values(), key=lambda w: (not w["on_rolls"], w["worker"]))


def financial_exposure(run) -> dict:
    """Indicative money at stake for the wage month, computed from the extracted figures (not a legal demand)."""
    from .checks import Ctx
    ev = run.evidence
    p = run.params
    ctx = Ctx(ev, p, run.config.get("policy", {}))
    rows, pf_unc, esi_unc, errors = [], [], [], []
    for code in ctx.wcodes:
        try:
            _exposure_rows(ctx, ev, p, code, rows, pf_unc, esi_unc)
        except Exception as exc:                 # one malformed record must not stop the report
            errors.append(f"Exposure not computed for {ev.worker_name(code)} ({type(exc).__name__})")
    heads = defaultdict(float)
    for h, _, a in rows:
        heads[h] += a
    return {"rows": rows, "heads": dict(sorted(heads.items(), key=lambda kv: -kv[1])), "total": sum(heads.values()),
            "pf_uncovered": pf_unc, "esi_uncovered": esi_unc, "errors": errors}


def _exposure_rows(ctx, ev, p, code, rows, pf_unc, esi_unc):
    from .checks import _extra_days, pt_due
    wg = ev.workers[code]["WG"]
    name = ev.worker_name(code)
    basic, gross = nz(wg.get("basic_earned")), nz(wg.get("gross"))
    if not ctx.pf_member(code) and ctx.pf_eligible(code):
        pf_unc.append(name)
        rows.append(("PF not deducted / remitted (EE + ER 24%)", name, round(ctx.code_wage(code) * 2 * p["pf"]["ee_rate"])))
    if not ctx.esi_member(code) and ctx.esi_eligible(code):
        esi_unc.append(name)
        rows.append(("ESI not covered (EE + ER 4%)", name, round(gross * (p["esi"]["ee_rate"] + p["esi"]["er_rate"]))))
    for _, ecr in ev.recs(code, "PFECR"):
        gap = basic - nz(ecr.get("epf_wages"))
        if gap > 1:
            rows.append(("EPF wages under-reported (24% on gap)", name, round(gap * 0.24)))
    due = pt_due(ctx, gross, ctx.gender(code))
    if due is not None and nz(wg.get("pt")) > due:
        rows.append(("PT deducted in excess of slab", name, nz(wg["pt"]) - due))
    amt, n, at_1x = _extra_days(ctx, code)
    if amt and at_1x:
        rows.append(("Overtime paid at 1× instead of 2×", name, round(n * ctx.daily_rate(code) * p["overtime"]["multiplier"] - amt)))
    for _, br in ev.recs(code, "BR"):
        if basic and nz(br.get("bonus")) / basic * 100 < p["bonus"]["min_pct"] - 0.01:
            rows.append(("Bonus below 8.33% (register)", name, round(basic * p["bonus"]["min_pct"] / 100 - nz(br.get("bonus")))))


CONSEQUENCE = {
    "PF not deducted / remitted (EE + ER 24%)": ("Statutory dues & interest", "Interest u/s 7Q + damages u/s 14B; prosecution risk"),
    "ESI not covered (EE + ER 4%)": ("Statutory dues & interest", "Interest + damages; ESIC recovery and prosecution"),
    "EPF wages under-reported (24% on gap)": ("Under-reporting", "Interest + damages u/s 14B on the shortfall"),
    "PT deducted in excess of slab": ("Excess deduction from wages", "Refund to workers; unauthorised-deduction claim"),
    "Overtime paid at 1× instead of 2×": ("Wage underpayment", "Recovery + compensation up to 10×; inspector action"),
    "Bonus below 8.33% (register)": ("Under-payment of statutory bonus", "Recovery + interest; penalty under the Code on Wages"),
}
