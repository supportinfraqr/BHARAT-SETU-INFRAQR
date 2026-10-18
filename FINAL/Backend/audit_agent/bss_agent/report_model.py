"""One view model for both outputs: the BSS HTML report and the BSS PDF report render exactly this,
so the two never disagree.  build(run) -> plain dict (JSON-serialisable).
"""

from __future__ import annotations

from collections import Counter

from . import analytics, branding, rulebook
from .analytics import CONSEQUENCE, WORKER_PARAMS, band, score_of
from .checks import C, DNA, FAIL, NA, NAU, NC, NV, PC, RISKS, name_list, worst_status
from .engine import CATEGORY_ORDER, CATEGORY_SHORT
from .evidence import fmt_date, money

STATUSES = [C, PC, NC, DNA, NV, NA, NAU]
HTML_DETAIL = 50           # findings shown per line in the HTML; the workbook's Evidence sheet always has all of them
STATUS_DEF = {C: "All mandatory checks passed", PC: "Gaps found — mismatch, missing signature / seal, late but paid",
              NC: "Material breach of a statutory requirement", DNA: "Required register / form / document not produced",
              NV: "Evidence lies outside this submission (earlier months, portals, masters)", NA: "Provision does not apply",
              NAU: "Needs site visit, live portal or principal-employer data"}
RISK_DEF = {"Critical": "Immediate stop-work / statutory breach (e.g. child labour)", "High": "Minimum wage, PF / ESI, mandatory documents",
            "Medium": "Registers, signatures, mismatches, minor delays", "Low": "Formatting, labelling, procedural"}


def _f(f) -> dict:
    return {"worker": f.worker, "code": f.code, "expected": f.expected, "found": f.found, "source": f.source, "status": f.status,
            "risk": f.risk, "observation": f.observation, "subcheck": f.subcheck, "origin": f.origin, "entity": f.entity}


def _line(r, idx: str) -> dict:
    s = r.spec
    first = next((rulebook.item(c) for c in s.ref_codes if rulebook.item(c)), {})
    flagged = [f for f in r.findings if f.is_flag and not f.subcheck]
    return {
        "no": idx, "id": s.cid, "sheet": s.sheet, "step": s.item, "parameter": first.get("param") or s.area,
        "check_area": s.area, "verification": rulebook.verification_point(s), "ref": s.ref, "act": s.act,
        "action": rulebook.ai_action(s), "risk": r.risk, "status": r.status, "observation": r.summary,
        "reason": s.remarks if s.sheet == "Not Possible" else "", "remarks": s.remarks if s.sheet == "Possible" else "",
        "subchecks": r.subchecks, "verdict_by": r.verdict_by, "cross_check": r.cross_check,
        "rule_status": r.rule_status, "flagged": [_f(f) for f in flagged], "n_findings": len(r.findings),
        "findings": [_f(f) for f in r.findings],
        # HTML evidence panel: flagged findings first (up to HTML_DETAIL), else the first findings
        "detail": [_f(f) for f in ([f for f in r.findings if f.is_flag] or r.findings)[:HTML_DETAIL]],
        "detail_more": max(0, len([f for f in r.findings if f.is_flag] or r.findings) - HTML_DETAIL),
        "n_flags": sum(1 for f in r.findings if f.is_flag),
    }


def build(run) -> dict:
    s = analytics.stats(run)
    ev = run.evidence
    m = ev.meta
    sc = s["status_counts"]
    nar = run.narrative or {}
    days = run.config.get("corrective_action_days", {})
    n_cq = len(ev.cq_documents())
    n_gt = sum(1 for d in ev.documents if d["root"] == "gt")
    regs = " · ".join(f"{k} {v}" for k, v in (("PF", m.get("pf_code")), ("ESIC", m.get("esic_code")), ("PTRC", m.get("pt_rc")),
                                               ("LWF", m.get("lwf_code")), ("LIN", m.get("lin"))) if v) or "—"
    models = ""
    if run.mode == "deepseek":
        models = ", ".join(sorted(set((run.llm_usage or {}).get("models", []) or [])))
    meta = {
        "report_no": run.report_no, "generated": run.started.strftime("%d %b %Y, %H:%M"), "audit_date": run.started.strftime("%d %b %Y"),
        "contractor": m.get("contractor_legal_name") or "Contractor", "contractor_address": m.get("contractor_address") or "",
        "principal_employer": m.get("principal_employer") or "—", "site": m.get("site") or "—", "site_short": m.get("site_short") or m.get("site") or "—",
        "state": m.get("state_name") or m.get("state") or "—", "nature_of_work": m.get("nature_of_work") or "",
        "wage_month": ev.month_start.strftime("%B %Y"), "wage_month_short": ev.month_start.strftime("%b-%Y"),
        "period": f"{ev.month_start:%d %b} – {ev.month_end:%d %b %Y}", "registrations": regs,
        "auditor": run.config["audit"]["auditor"], "classification": run.config["audit"]["classification"],
        "mode": run.mode, "engine": {"deepseek": "DeepSeek audit (" + (models or "deepseek") + ") with rule-engine cross-check",
                                     "partial": "DeepSeek audit for part of the rows, rule engine for the rest (see Assurance)"}.get(
            run.mode, "Rule engine (offline — DeepSeek not used)"), "narrative_source": nar.get("source", "deterministic"),
        "catalogue": run.config["paths"]["catalogue"], "documents": f"{n_cq + n_gt} files ({n_cq} contractor · {n_gt} worker folder)",
        "brand": branding.theme()["brand"],
    }
    kpi = {"score": round(s["score"], 1), "overall_risk": s["overall_risk"], "counts": sc, "total": s["total"], "possible": s["possible"],
           "not_possible": s["not_possible"], "subchecks": s["subchecks"], "flags": s["total_flags"], "worker_flags": s["worker_flags"],
           "gt_missing": s["gt_missing"], "gt_workers": s["gt_workers"], "on_rolls": s["workers_on_rolls"],
           "workers_flagged": s["workers_flagged"], "other": sc[NV] + sc[NA] + sc[NAU], "exposure": round(s["exposure"]["total"]),
           "band": band(s["score"]), "ai_rows": s["ai_rows"], "differs": len(s["differs"])}

    cats = []
    for cat in CATEGORY_ORDER:
        c = s["categories"].get(cat)
        if not c:
            continue
        st = c["status"]
        cats.append({"name": cat, "short": CATEGORY_SHORT[cat], "c": st.get(C, 0), "pc": st.get(PC, 0), "nc": st.get(NC, 0), "dna": st.get(DNA, 0),
                     "other": c["other"], "total": c["n"], "flags": c["flags"], "score": None if c["score"] is None else round(c["score"]),
                     "band": band(c["score"])})
    tot = Counter()
    for c in cats:
        for k in ("c", "pc", "nc", "dna", "other", "total", "flags"):
            tot[k] += c[k]
    totals = dict(tot, score=round(s["score"]))

    areas = []
    for a in s["areas"]:
        lines = [_line(r, f"{a['no']}.{i}") for i, r in enumerate(a["rows"], start=1)]
        areas.append({"no": a["no"], "name": a["name"], "objective": rulebook.objective(a["name"]), "n": a["n"],
                      "score": None if a["score"] is None else round(a["score"]), "band": band(a["score"]), "risk": a["risk"],
                      "flags": a["flags"], "possible": a["possible"], "not_possible": a["not_possible"],
                      "counts": {k: a["status"].get(k, 0) for k in STATUSES}, "lines": lines})

    workers = []
    for w in s["worker_rows"]:
        workers.append({k: w[k] for k in ("worker", "code", "gt", "on_rolls", "designation", "doj", "gender", "dob", "uan", "esic", "exit", "flags", "score", "obs")}
                       | {"wage": money(w["wage"]) if w["wage"] is not None else "—", "params": w["params"],
                          "pct": None if w["pct"] is None else round(w["pct"]), "risk": w["worst_risk"],
                          "items": [{"id": r.spec.cid, "item": r.spec.item, **_f(f)} for r, f in w["items"]]})
    on = [w for w in workers if w["on_rolls"]]
    avg = round(sum(w["pct"] for w in on if w["pct"] is not None) / max(1, len([w for w in on if w["pct"] is not None]))) if on else None

    # contractor / site / state views — one entity each in a single-contractor audit, same layout as multi-contractor
    param_agg = {p[0]: worst_status(w["params"][p[0]] for w in workers if w["params"][p[0]] != "—") if any(w["params"][p[0]] != "—" for w in workers) else "—"
                 for p in WORKER_PARAMS}
    entity = {"name": meta["contractor"], "workers": s["workers_on_rolls"], "off_rolls": s["gt_missing"], "sites": 1, "states": 1,
              "params": param_agg, "score": round(s["score"]), "exposure": round(s["exposure"]["total"]), "risk": s["overall_risk"],
              "c": sc[C], "pc": sc[PC], "nc": sc[NC], "dna": sc[DNA]}
    site = dict(entity, name=meta["site_short"], state=meta["state"], contractors=1)
    state = dict(entity, name=meta["state"], contractors=1)

    seen, top = set(), []
    for r in s["top_findings"]:
        if r.summary in seen:
            continue
        seen.add(r.summary)
        workers_hit = sorted({f.worker for f in r.findings if f.is_flag and f.entity == "worker"})
        top.append({"id": r.spec.cid, "area": r.spec.criteria, "category": CATEGORY_SHORT.get(run.category(r), ""), "item": r.spec.item,
                    "status": r.status, "risk": r.risk, "summary": r.summary,
                    "affected": (f"{len(workers_hit)} worker(s): " + name_list(workers_hit, 8)) if workers_hit else f"Establishment-wide ({meta['site_short']})",
                    "action_days": days.get(r.risk, 30)})
    exposure = []
    for h, v in s["exposure"]["heads"].items():
        names = sorted({n for hh, n, _ in s["exposure"]["rows"] if hh == h})
        exposure.append({"head": h, "nature": CONSEQUENCE.get(h, ("", ""))[0], "amount": round(v), "consequence": CONSEQUENCE.get(h, ("", ""))[1],
                         "workers": f"{len(names)} worker(s): " + name_list(names, 8),
                         "rows": [{"worker": n, "amount": round(a)} for hh, n, a in s["exposure"]["rows"] if hh == h]})
    actions = nar.get("management_actions") or []

    docs = [{"rel": d["rel"], "root": "Contractor" if d["root"] == "cq" else "Worker folder", "type": d["doc_type"], "pages": d["pages"],
             "read": "Text layer" if d.get("readable") else ("Image → DeepSeek vision" if d["root"] else ""), "error": d.get("error", "")}
            for d in ev.documents]
    return {
        "meta": meta, "kpi": kpi, "narrative": {"summary": nar.get("executive_summary", ""), "messages": nar.get("key_messages", []),
                                                 "opinion": nar.get("closing_opinion", ""), "source": nar.get("source", "")},
        "categories": cats, "category_totals": totals, "areas": areas, "workers": workers, "worker_params": [
            {"key": k, "label": lab, "desc": d} for k, lab, d, _ in WORKER_PARAMS], "avg_worker": avg,
        "contractors": [entity], "sites": [site], "states": [state], "top_risks": top[:5], "top_findings": top[:14],
        "exposure": exposure, "exposure_total": round(s["exposure"]["total"]), "actions": actions,
        "status_legend": [{"status": k, "def": v, "color": branding.status_color(k)} for k, v in STATUS_DEF.items()],
        "risk_legend": [{"risk": k, "def": v, "color": branding.risk_color(k)} for k, v in RISK_DEF.items()],
        "documents": docs, "issues": list(run.issues) + list(ev.data.get("errors", [])) + s["exposure"].get("errors", []),
        "differs": [{"id": r.spec.cid, "item": r.spec.item, "rule": r.rule_status, "final": r.status, "note": r.cross_check} for r in s["differs"]],
        "usage": run.llm_usage, "statuses": STATUSES,
        "status_colors": {k: branding.status_color(k) for k in STATUSES}, "status_soft": {k: branding.status_soft(k) for k in STATUSES},
        "risk_colors": {k: branding.risk_color(k) for k in RISKS + ["None"]},
    }
