"""DeepSeek audit stage: DeepSeek gives the verdict on every catalogue row and every Remarks sub-check.

For each audit area (catalogue "Criteria") DeepSeek receives
  * the rows to audit (item, rulebook reference, Act, sub-checks / Not-Possible reason)
  * the rule engine's pre-computed facts for each row: expected vs found per worker, with the
    arithmetic already done (so the model never has to calculate)
  * the evidence slice relevant to the area (extracted records, establishment documents,
    worker-folder fields, the inventory of what was / was not submitted)
and returns status, risk and observation per row, per worker and per sub-check.

policy.final_verdict (config/agent_config.json):
  "deepseek" (default) DeepSeek's verdict is final; differences from the rule engine are flagged
  "stricter"           the worse of the two verdicts is final
  "rules"              rule verdict is final; DeepSeek only fills sub-checks no rule covers
Every row and sub-check must come back; missing ones are re-asked once, then fall back to the
rule verdict with a note. Nothing is skipped.
"""

from __future__ import annotations

import difflib
import json
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

from .checks import FAIL, NA, NV, RISKS, STATUSES, C, CheckResult, Finding, worst_status
from .deepseek_api import DeepSeekClient, DeepSeekError, DeepSeekTruncated, as_list, as_str
from .doctypes import BY_KEY, TYPES
from .evidence import base_type

PROMPT_VERSION = "bss-audit-2"
ROWS_PER_CALL = 8
WORKER_CHUNK = 40      # workers per audit call; any number of workers is audited, in as many chunks as needed

AUDIT_SYSTEM = """You are the auditor of the BharatShramSetu (BSS) Document Audit Agent: a senior Indian labour-law compliance auditor
(Code on Wages 2019, Code on Social Security 2020, OSH Code 2020, Industrial Relations Code 2020, CLRA, state PT / LWF Acts,
POSH Act). You audit a contractor's submission (QUERY) against the workers' own documents (GROUND TRUTH).

For every catalogue row given, decide:
  status — exactly one of: "Complied", "Partially Complied", "Non-Complied", "Document Not Available",
           "Not Verifiable", "Not Applicable", "Not Auditable"
  risk   — "Critical", "High", "Medium", "Low" or "None" (None only for Complied / Not Applicable)
Rules of decision (AuditingInstructions §07 / §09):
  * Age < 18 → Non-Complied / Critical. Wage below minimum, PF / ESI not deducted or not remitted → Non-Complied / High.
  * Attendance / wage / name mismatch between documents → Partially Complied / Medium.
  * Signature or seal missing → Partially Complied / Medium.
  * Mandatory document not produced → Document Not Available / High.
  * Not Verifiable: the evidence needed exists outside this submission (earlier months, portals, masters not configured).
  * Not Applicable: the provision does not apply (threshold not met, no such event, no such worker).
  * Not Auditable: needs a site visit / live portal / principal-employer data.
How to work:
  1. The PRE-COMPUTED FACTS were calculated exactly from the extracted documents. Use those numbers; do not recompute arithmetic.
  2. Check the facts against the EVIDENCE yourself. If the rule check is wrong (misread value, wrong applicability, wrong
     status mapping), give the correct verdict and explain why in "why_differs". If it is right, agree.
  3. Judge the whole row: the main item AND every sub-check. Give a verdict for EVERY sub-check listed, in the same order,
     copying its text exactly.
  4. Give per-worker verdicts for every worker the row concerns (use the worker names / codes from the facts).
  5. Observations: one or two precise sentences an auditor would sign — what is wrong, by how much, in which document.
     Never invent documents, numbers or names that are not in the facts or evidence.
Return JSON: {"rows": [{"id": str, "status": str, "risk": str, "observation": str, "agree_with_rules": bool, "why_differs": str,
  "workers": [{"code": str, "worker": str, "status": str, "risk": str, "observation": str}],
  "subchecks": [{"text": str, "status": str, "risk": str, "observation": str}]}]}"""


# --------------------------------------------------------------------------- evidence slicing
CRITERIA_DOCS: dict[str, set] = defaultdict(set)
for _t in TYPES:
    for _c in _t.criteria:
        CRITERIA_DOCS[_c].add(_t.key)
IDENTITY_AREAS = {"General – All Areas", "Personal File", "Inter-State Migrant Workers", "Child Labour Compliance"}
ALWAYS = {"WR", "WG"}


def _compact(rec: dict) -> dict:
    return {k: v for k, v in rec.items() if k != "_doc" and v not in (None, "", [], {})}


def evidence_slice(run, criteria: str, results: list[CheckResult], group: dict | None = None) -> dict:
    """Evidence for one audit area. `group` = {"codes": [...], "gt": [...]} limits worker records to one chunk of the
    roster (large rosters are audited chunk by chunk); None = every worker."""
    ev = run.evidence
    wanted = set(ALWAYS) | CRITERIA_DOCS.get(criteria, set())
    names = {f.source for r in results for f in r.findings}
    for t in TYPES:  # documents the rule findings cite
        if any(ev.doc_name(t.key) in n or (ev.docs.get(t.key) and ev.docs[t.key] in n) for n in names):
            wanted.add(t.key)
    if criteria in ("General – All Areas",):
        wanted |= {t.key for t in TYPES if t.scope in ("rows", "person") and t.root == "cq"}
    codes = group["codes"] if group else list(ev.workers)
    workers = {c: {k: _compact(v) for k, v in ev.workers[c].items() if isinstance(v, dict) and base_type(k) in wanted} for c in codes}
    est = {k: _compact(v) for k, v in {**ev.registers, **ev.est}.items() if k in wanted}
    out = {
        "context": {**{k: ev.meta.get(k) for k in ("contractor_legal_name", "principal_employer", "site", "state", "state_name",
                                                   "nature_of_work", "is_construction", "headcount_establishment", "lin")},
                    "wage_month": ev.month_start.strftime("%B %Y"), "days_in_month": ev.month_days,
                    "workers_on_site_rolls": len(ev.workers), "policy": run.config.get("policy", {})},
        "documents_submitted": sorted({f"{d['doc_type']}: {d['rel']}" + ("" if d.get("readable") else " (image / scan)")
                                       for d in ev.cq_documents()}),
        "document_types_not_submitted": sorted(k for k in wanted if not ev.has(k) and BY_KEY.get(k) and BY_KEY[k].root == "cq"),
        "worker_records": workers, "establishment_documents": est,
        "cross_document_values": {k: v for k, v in ev.cross.items() if v},
        "statutory_parameters": {k: run.params.get(k) for k in ("pf", "esi", "wages", "bonus", "overtime", "min_age", "code_on_wages")}
        | {"state": run.params.get("states", {}).get(ev.meta.get("state") or "", {})},
    }
    if group and group.get("of", 1) > 1:
        out["note"] = (f"Worker group {group['n']} of {group['of']}: records and facts for {len(codes)} of {len(ev.workers)} workers on the "
                       "rolls. Judge each row for THESE workers; the other groups are judged separately and combined.")
    if criteria in IDENTITY_AREAS or any(r.spec.area == "Identity vs worker folder" for r in results):
        gts = group["gt"] if group else list(ev.gt["workers"])
        out["ground_truth_workers"] = {g: {"linked_to": ev.links.get(g), "fields": ev.gt["workers"][g].get("fields"),
                                           "documents": ev.gt["workers"][g].get("documents"),
                                           "files": ev.gt["workers"][g].get("files") or ev.gt["workers"][g].get("folder_name")} for g in gts}
    return out


def _in_group(f: Finding, group: dict | None) -> bool:
    if not group or f.entity != "worker":
        return True
    return f.code in group["code_set"] or (f.code in ("", "—") and (f.gt_link in group["gt_set"] or f.worker.lower() in group["gt_lower"]))


def _row_payload(r: CheckResult, group: dict | None = None) -> dict:
    s = r.spec
    return {
        "id": s.cid, "sheet": s.sheet, "check_area": s.area, "item": s.item, "rulebook_ref": s.ref, "act": s.act,
        ("reason_not_possible_at_scoping" if s.sheet == "Not Possible" else "remarks"): s.remarks,
        "subchecks": [sc["text"] for sc in r.subchecks],
        "pre_computed_facts": {
            "rule_status": r.rule_status, "rule_risk": r.rule_risk, "rule_summary": r.rule_summary,
            "findings": [{"worker": f.worker, "code": f.code, "expected": f.expected, "found": f.found, "source": f.source,
                          "status": f.status, "risk": f.risk, "observation": f.observation, "subcheck": f.subcheck}
                         for f in r.rule_findings if _in_group(f, group)],
            "subcheck_results": [{"text": sc["text"], "status": sc["status"], "observation": sc["observation"], "by": sc["by"]} for sc in r.subchecks],
        },
    }


def worker_groups(run) -> list[dict | None]:
    """[None] for a roster that fits one call; else chunks of WORKER_CHUNK workers. Ground-truth persons travel with the
    worker they are linked to; unlinked ones go to the first chunk."""
    ev = run.evidence
    size = int(run.config.get("audit", {}).get("worker_chunk") or WORKER_CHUNK)
    codes = list(ev.workers)
    if len(codes) + sum(1 for c in ev.links.values() if not c) <= size:
        return [None]
    chunks = [codes[i:i + size] for i in range(0, len(codes), size)] or [[]]
    out = []
    for n, cs in enumerate(chunks, start=1):
        gt = [g for g, c in ev.links.items() if c in set(cs)] + ([g for g, c in ev.links.items() if not c] if n == 1 else [])
        out.append({"n": n, "of": len(chunks), "codes": cs, "code_set": set(cs), "gt": gt, "gt_set": set(gt),
                    "gt_lower": {g.lower() for g in gt}})
    return out


def combine(parts: list[dict], r: CheckResult) -> dict:
    """Merge the answers for one row from several worker groups: worst status / risk, all worker verdicts,
    worst verdict per sub-check, observations of the failing groups."""
    if len(parts) == 1:
        return parts[0]
    sts = [_norm_status(p.get("status")) for p in parts]
    st = worst_status([x for x in sts if x]) if any(sts) else None
    risks = [str(p.get("risk") or "").title() for p in parts if _norm_status(p.get("status")) == st]
    risk = next((x for x in RISKS if x in risks), "None")
    obs = [as_str(p.get("observation")) for p, x in zip(parts, sts) if x == st and as_str(p.get("observation"))]
    subs = []
    matched = [_match_subchecks(r.subchecks, [x for x in as_list(p.get("subchecks")) if isinstance(x, dict)]) for p in parts]
    for i, sc in enumerate(r.subchecks):
        cand = [m[i] for m in matched if m[i]]
        if not cand:
            continue
        cst = worst_status([_norm_status(c.get("status")) or sc["status"] for c in cand])
        pick = next(c for c in cand if (_norm_status(c.get("status")) or sc["status"]) == cst)
        subs.append({**pick, "text": sc["text"], "status": cst})
    return {"id": r.spec.cid, "status": st, "risk": risk, "observation": " ".join(dict.fromkeys(obs))[:2000],
            "agree_with_rules": all(p.get("agree_with_rules", True) for p in parts),
            "why_differs": " ".join(dict.fromkeys(as_str(p.get("why_differs")) for p in parts if as_str(p.get("why_differs"))))[:1500],
            "workers": [w for p in parts for w in as_list(p.get("workers"))], "subchecks": subs}


# --------------------------------------------------------------------------- merge
def _norm_status(v) -> str | None:
    v = str(v or "").strip()
    for s in STATUSES:
        if v.lower() == s.lower():
            return s
    alias = {"partial": "Partially Complied", "non compliant": "Non-Complied", "non-compliant": "Non-Complied", "compliant": "Complied",
             "dna": "Document Not Available", "n/a": "Not Applicable", "na": "Not Applicable"}
    return alias.get(v.lower())


def _norm_risk(v, status) -> str:
    v = str(v or "").strip().title()
    if status in (C, NA) or v not in RISKS:
        return "None" if status in (C, NA) else (v if v in RISKS else "Medium")
    return v


def _pick(policy: str, rule_status: str, ai_status: str) -> str:
    if policy == "rules":
        return rule_status
    if policy == "stricter":
        return worst_status([rule_status, ai_status])
    return ai_status


def _match_subchecks(subs: list[dict], ai_subs: list[dict]) -> list[dict | None]:
    """Pair each catalogue sub-check with DeepSeek's answer by TEXT; position is only a tie-breaker when the
    text at that position also agrees. Unmatched sub-checks get None (reported as not answered)."""
    def key(t):
        return re.sub(r"[^a-z0-9]+", " ", str(t).lower()).strip()
    pool = [(i, key(a.get("text"))) for i, a in enumerate(ai_subs)]
    used, out = set(), []
    for pos, sc in enumerate(subs):
        k = key(sc["text"])
        best, best_r = None, 0.0
        for i, ak in pool:
            if i in used or not ak:
                continue
            r = 1.0 if ak == k else difflib.SequenceMatcher(None, ak, k).ratio()
            if i == pos:
                r += 0.05
            if r > best_r:
                best, best_r = i, r
        if best is not None and best_r >= 0.75:
            used.add(best)
            out.append(ai_subs[best])
        else:
            out.append(None)
    return out


def merge(run, r: CheckResult, ai: dict):
    policy = run.config.get("policy", {}).get("final_verdict", "deepseek")
    st = _norm_status(ai.get("status")) or r.rule_status
    final = _pick(policy, r.rule_status, st)
    r.status = final
    r.risk = _norm_risk(ai.get("risk"), final) if final == st else r.rule_risk
    r.verdict_by = "deepseek" if (policy != "rules" and final == st) else "rules"
    obs = as_str(ai.get("observation")).strip()
    if obs and r.verdict_by == "deepseek":
        r.summary = obs
    if st != r.rule_status:
        r.cross_check = (f"Rule check: {r.rule_status}; DeepSeek: {st}. " + as_str(ai.get("why_differs"))).strip()
    # per-worker verdicts
    ai_workers = [w for w in as_list(ai.get("workers")) if isinstance(w, dict)]
    by_code = {as_str(w.get("code")).strip(): w for w in ai_workers if as_str(w.get("code")).strip() not in ("", "—")}
    by_name = {as_str(w.get("worker")).strip().lower(): w for w in ai_workers}
    new = []
    for f in r.rule_findings:
        w = by_code.get(f.code) if f.code not in ("—", "") else None
        w = w or by_name.get(f.worker.lower())
        g = Finding(**{**f.__dict__})
        if w and not f.subcheck and policy != "rules":
            ws = _norm_status(w.get("status"))
            if ws and ws != f.status:
                fs = _pick(policy, f.status, ws)
                if fs != f.status:
                    g.status, g.risk, g.origin = fs, _norm_risk(w.get("risk"), fs), "deepseek"
                    g.observation = f"{as_str(w.get('observation')) or g.observation} (Rule check said {f.status}: {f.observation})"
            elif ws == f.status and f.status in FAIL and as_str(w.get("observation")):
                g.observation = as_str(w.get("observation"))
        new.append(g)
    seen = {f.code for f in r.rule_findings if f.code not in ("—", "")} | {f.worker.lower() for f in r.rule_findings}
    for w in ai_workers:
        if as_str(w.get("code")) in seen or as_str(w.get("worker")).lower() in seen:
            continue
        ws = _norm_status(w.get("status"))
        if ws and ws in FAIL and policy != "rules":
            new.append(Finding("worker", as_str(w.get("worker") or w.get("code"))[:120], as_str(w.get("code")) or "—", "", r.spec.item,
                               "See observation", "DeepSeek audit", ws, _norm_risk(w.get("risk"), ws), as_str(w.get("observation")),
                               origin="deepseek"))
    # DeepSeek cleared the row: rule flags it did not uphold are kept for the record but no longer count as flags
    if r.status not in FAIL and r.verdict_by == "deepseek":
        for g in new:
            if g.is_flag and g.origin == "rule" and not g.subcheck:
                g.observation = f"Rule check flagged {g.status} ({g.observation}); not upheld by DeepSeek — row judged {r.status}."
                g.status, g.risk, g.origin = r.status, "None", "deepseek (overridden)"
    r.findings = new
    # sub-checks
    ai_subs = [x for x in as_list(ai.get("subchecks")) if isinstance(x, dict)]
    for sc, a in zip(r.subchecks, _match_subchecks(r.subchecks, ai_subs)):
        if not a:
            if sc["by"] == "pending":
                sc.update(by="rules", status=NV, observation="DeepSeek returned no verdict for this sub-check — manual review required.")
                run.issues.append(f"{r.spec.cid}: sub-check '{sc['text'][:60]}' not answered by DeepSeek")
            continue
        s2 = _norm_status(a.get("status")) or sc["status"]
        fin = s2 if sc["by"] == "pending" else _pick(policy, sc["status"], s2)
        if sc["by"] != "pending" and s2 != sc["status"]:
            sc["rule_status"] = sc["status"]
        sc.update(status=fin, risk=_norm_risk(a.get("risk"), fin), by="deepseek" if fin == s2 else "rules",
                  observation=as_str(a.get("observation")) or sc["observation"])
    # keep the row status consistent with its sub-checks when DeepSeek is final
    if policy != "rules":
        sub_worst = worst_status([sc["status"] for sc in r.subchecks]) if r.subchecks else None
        if sub_worst in FAIL and r.status not in FAIL:
            r.status = sub_worst
            r.risk = next((sc["risk"] for sc in r.subchecks if sc["status"] == sub_worst), "Medium")


# --------------------------------------------------------------------------- orchestration
def _area_rows(run, crit: str) -> list[CheckResult]:
    return [r for r in run.results if r.spec.criteria == crit]


def _batches(run) -> list[tuple[str, list[CheckResult]]]:
    by = defaultdict(list)
    for r in run.results:
        by[r.spec.criteria].append(r)
    out = []
    for crit, rs in by.items():
        for i in range(0, len(rs), ROWS_PER_CALL):
            out.append((crit, rs[i:i + ROWS_PER_CALL]))
    return out


def _ask(client: DeepSeekClient, run, crit: str, rs: list[CheckResult], group: dict | None = None) -> dict:
    """One audit call; a truncated answer is retried as two smaller batches."""
    # evidence first: batches of the same area share this prefix, so DeepSeek's context cache bills it once
    user = json.dumps({"audit_area": crit, "evidence": evidence_slice(run, crit, _area_rows(run, crit), group),
                       "rows_to_audit": [_row_payload(r, group) for r in rs]}, ensure_ascii=False, default=str)
    part = f":g{group['n']}" if group else ""
    try:
        out = client.chat_json("audit", AUDIT_SYSTEM, user, tag=f"audit:{crit}:{rs[0].spec.cid}:{len(rs)}{part}")
    except DeepSeekTruncated:
        if len(rs) == 1:
            raise
        mid = len(rs) // 2
        return {**_ask(client, run, crit, rs[:mid], group), **_ask(client, run, crit, rs[mid:], group)}
    wanted = {r.spec.cid for r in rs}
    return {as_str(row.get("id")).strip(): row for row in as_list(out.get("rows"))
            if isinstance(row, dict) and as_str(row.get("id")).strip() in wanted}


def deepseek_audit(run, client: DeepSeekClient, log=print):
    groups = worker_groups(run)
    jobs = [(crit, rs, g) for crit, rs in _batches(run) for g in groups]
    if len(groups) > 1:
        log(f"  {len(run.evidence.workers)} workers → audited in {len(groups)} worker groups ({len(jobs)} DeepSeek calls)")
    answers: dict[str, list[dict]] = defaultdict(list)
    failed: dict[str, int] = defaultdict(int)

    def work(job):
        crit, rs, g = job
        got, errs = {}, []
        try:
            got = _ask(client, run, crit, rs, g)
        except Exception as exc:                    # any failure: keep going, rule verdicts stand
            errs.append(f"{type(exc).__name__}: {exc}")
        missing = [r for r in rs if r.spec.cid not in got]
        if missing:
            try:
                got.update(_ask(client, run, crit, missing, g))
            except Exception as exc:
                errs.append(f"re-ask: {type(exc).__name__}: {exc}")
        lost = [r.spec.cid for r in rs if r.spec.cid not in got]
        err = (f"{crit} ({rs[0].spec.cid}…{' worker group ' + str(g['n']) if g else ''}): " + "; ".join(errs)) if errs and lost else None
        return got, lost, err

    total_jobs = len(jobs)
    completed = 0
    with ThreadPoolExecutor(max_workers=client.cfg["max_parallel"]) as ex:
        for got, lost, err in ex.map(work, jobs):
            completed += 1
            log(f"  audit progress: {completed}/{total_jobs}")
            for cid, row in got.items():
                answers[cid].append(row)
            for cid in lost:
                failed[cid] += 1
            if err:
                run.issues.append(f"DeepSeek audit failed for {err} — rule verdicts used")
    done = 0
    for r in run.results:
        parts = answers.get(r.spec.cid) or []
        merged = False
        if parts and not failed.get(r.spec.cid):      # every worker group must have answered
            try:
                merge(run, r, combine(parts, r))
                merged = True
                done += 1
            except Exception as exc:                # a malformed answer never corrupts the rule verdict
                run.issues.append(f"{r.spec.cid}: DeepSeek answer could not be applied ({type(exc).__name__}) — rule verdict used")
                r.status, r.risk, r.summary, r.findings = r.rule_status, r.rule_risk, r.rule_summary, list(r.rule_findings)
                r.verdict_by = "rules"
        if not merged:
            for sc in r.subchecks:
                if sc["by"] == "pending":
                    sc.update(by="rules", status=NV, observation="DeepSeek did not return a verdict — manual review required.")
            r.cross_check = "DeepSeek gave no verdict for this row" + (" for every worker group" if parts else "") + " — rule verdict used."
    run.llm_usage = dict(client.usage)
    log(f"  DeepSeek verdicts: {done}/{len(run.results)} rows · {sum(1 for r in run.results if r.cross_check.startswith('Rule check'))} "
        f"differ from the rule check")
