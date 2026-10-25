"""Executive narrative: summary, key messages, auditor's opinion and management actions.

DeepSeek writes it from the final verdicts (facts only, no invented numbers); without a key a
deterministic narrative is produced from the same facts, so the report is never blank.
"""

from __future__ import annotations

import json

from .checks import DNA, NC, PC, C
from .deepseek_api import DeepSeekClient, DeepSeekError

NARRATIVE_SYSTEM = (
    "You are a senior Indian labour-law compliance auditor writing the executive part of an audit report for the Board / CXO of the "
    "principal employer. Formal, precise British-Indian English. Use ONLY the facts supplied — never invent numbers, names, documents "
    "or laws. Return JSON {\"executive_summary\": str (130-180 words), \"key_messages\": [5 short strings, most serious first], "
    "\"closing_opinion\": str (40-70 words), \"management_actions\": [6 objects {\"title\": str, \"owner\": str, \"days\": int, "
    "\"body\": str (1-2 sentences)}]}.")


def _facts(run) -> dict:
    from .analytics import stats
    s = stats(run)
    ev = run.evidence
    top = [{"id": r.spec.cid, "area": r.spec.criteria, "item": r.spec.item, "status": r.status, "risk": r.risk, "summary": r.summary}
           for r in s["top_findings"][:14]]
    return {"contractor": ev.meta.get("contractor_legal_name"), "principal_employer": ev.meta.get("principal_employer"),
            "site": ev.meta.get("site_short") or ev.meta.get("site"), "wage_month": ev.month_start.strftime("%B %Y"),
            "checkpoints": s["total"], "status_counts": s["status_counts"], "compliance_score_pct": round(s["score"], 1),
            "overall_risk": s["overall_risk"], "workers_on_rolls": s["workers_on_rolls"], "ground_truth_workers": s["gt_workers"],
            "ground_truth_missing_from_rolls": s["gt_missing"], "workers_flagged_high": s["workers_flagged"],
            "indicative_exposure_rupees": round(s["exposure"]["total"]), "exposure_heads": s["exposure"]["heads"],
            "top_findings": top, "corrective_action_days": run.config.get("corrective_action_days")}


def _clip(t: str, n: int) -> str:
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0].rstrip(",;:") + " …"


def deterministic_narrative(run) -> dict:
    from .analytics import stats
    s = stats(run)
    sc = s["status_counts"]
    ev = run.evidence
    m = ev.meta
    worst = sorted([w for w in s["worker_rows"]], key=lambda w: -w["score"])[:3]
    summary = (
        f"The agent audited {s['total']} checkpoints from the BSS audit catalogue ({s['possible']} evidence checks and "
        f"{s['not_possible']} scope-gap items) for {m.get('contractor_legal_name') or 'the contractor'} at "
        f"{m.get('site_short') or m.get('site') or 'the site'} for the wage month {ev.month_start:%B %Y}. {sc.get(C, 0)} checkpoints "
        f"complied, {sc.get(PC, 0)} complied partially, {sc.get(NC, 0)} were non-compliant and {sc.get(DNA, 0)} could not be evidenced "
        f"because the document was not produced, giving a weighted compliance score of {s['score']:.1f}% and an overall risk rating of "
        f"{s['overall_risk']}. {s['gt_missing']} of the {s['gt_workers']} workers in the worker folder do not appear on any contractor "
        f"register, return or challan, and {s['workers_flagged']} of the {s['workers_on_rolls']} workers on the rolls carry at least one "
        f"high-risk discrepancy. The indicative monthly financial exposure is ₹{s['exposure']['total']:,.0f}.")
    top = [r for r in s["top_findings"]][:4]
    msgs = []
    if s["gt_missing"]:
        msgs.append(f"{s['gt_missing']} ground-truth worker(s) are absent from every contractor record — potential off-roll deployment.")
    if s["uncovered_pf"] or s["uncovered_esi"]:
        msgs.append(f"{s['uncovered_pf']} PF-eligible and {s['uncovered_esi']} ESI-eligible worker(s) have no PF / ESI coverage.")
    msgs += [_clip(f"{r.spec.cid} {r.spec.item}: {r.summary}", 240) for r in top]
    if worst and worst[0]["flags"]:
        msgs.append("Highest-exposure workers: " + ", ".join(f"{w['worker']} ({w['flags']} flags)" for w in worst) + ".")
    closing = (f"In the agent's opinion the site is rated {s['overall_risk']} risk until the {sc.get(NC, 0)} non-compliant items are "
               f"corrected and the {sc.get(DNA, 0)} missing documents are produced.")
    days = run.config.get("corrective_action_days", {})
    actions = [
        {"title": "Close critical breaches", "owner": "Contractor + Site Head", "days": days.get("Critical", 7),
         "body": "Treat off-roll workers, uncovered PF / ESI workers and remittance defaults as stop-work triggers until remediated with proof."},
        {"title": "Produce missing mandatory documents", "owner": "Contractor", "days": days.get("High", 15),
         "body": "Produce every document marked Document Not Available (agreement, PO, licence, EC policy, registrations, returns)."},
        {"title": "Enrol every deployed worker", "owner": "Contractor + HR", "days": days.get("High", 15),
         "body": "Enrol every worker on all registers and PF / ESIC returns, or obtain written proof of non-deployment."},
        {"title": "Correct wage computations", "owner": "Contractor payroll", "days": days.get("High", 15),
         "body": "Remit short PF / ESI, refund excess deductions, pay overtime at 2× and settle leavers' dues on time."},
        {"title": "Fix register quality", "owner": "Contractor", "days": days.get("Medium", 30),
         "body": "Use the prescribed Labour Code forms, obtain signatures, reconcile the Muster Roll with the gate register."},
        {"title": "Board-level monitoring", "owner": "Principal employer compliance", "days": days.get("Low", 45),
         "body": "Track this contractor on the BSS dashboard monthly with escalation for repeat non-compliance."},
    ]
    return {"executive_summary": summary, "key_messages": msgs[:5], "closing_opinion": closing, "management_actions": actions,
            "source": "deterministic"}


def executive_narrative(run, client: DeepSeekClient | None) -> dict:
    base = deterministic_narrative(run)
    if not (client and client.available):
        return base
    try:
        out = client.chat_json("narrative", NARRATIVE_SYSTEM, json.dumps(_facts(run), ensure_ascii=False, default=str),
                               max_tokens=12000, tag="narrative")
        if out.get("executive_summary") and isinstance(out.get("key_messages"), list):
            out["source"] = f"{client.label} ({client.model('narrative')})"
            out.setdefault("closing_opinion", base["closing_opinion"])
            acts = out.get("management_actions")
            if not (isinstance(acts, list) and acts and all(isinstance(a, dict) and a.get("title") for a in acts)):
                out["management_actions"] = base["management_actions"]
            return out
    except DeepSeekError as exc:
        base["source"] = f"deterministic ({client.label} failed: {exc})"
    return base
