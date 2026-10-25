"""Runs every catalogue row through the rule library, attaches a verdict to every Remarks sub-check,
then (optionally) has DeepSeek audit every row with those facts. Guarantees full coverage:
one result per catalogue row and one verdict per sub-check, or the run fails loudly.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

from . import checks_codes  # noqa: F401  (registers rules 138-204)
from .catalogue import CheckSpec, load_catalogue
from .checks import FAIL, NA, NV, REGISTRY, CheckResult, Ctx, Finding, name_list, not_possible, worst_risk, worst_status
from .evidence import Evidence

AGENT_ROOT = Path(__file__).resolve().parent.parent

CATEGORY_ORDER = ["Missing workers", "Identity vs worker folder", "Cross-document consistency",
                  "Wages & statutory calculation", "Attendance", "Paperwork completeness",
                  "Establishment / remittance", "Not-Possible tab (scope gaps)"]
CATEGORY_SHORT = {"Missing workers": "Missing workers", "Identity vs worker folder": "Identity",
                  "Cross-document consistency": "Cross-document", "Wages & statutory calculation": "Wages & statutory",
                  "Attendance": "Attendance", "Paperwork completeness": "Paperwork",
                  "Establishment / remittance": "Establishment", "Not-Possible tab (scope gaps)": "Scope gaps"}


def load_json(p: Path) -> dict:
    return json.loads(Path(p).read_text(encoding="utf-8"))


@dataclass
class AuditRun:
    results: list[CheckResult]
    evidence: Evidence
    config: dict
    params: dict
    started: datetime
    report_no: str
    specs: list[CheckSpec] = field(default_factory=list)
    narrative: dict = field(default_factory=dict)
    mode: str = "rules"                     # rules | deepseek
    llm_usage: dict = field(default_factory=dict)
    issues: list[str] = field(default_factory=list)
    ai_label: str = "DeepSeek"

    def category(self, r: CheckResult) -> str:
        return r.spec.area if r.spec.sheet == "Possible" and r.spec.area in CATEGORY_ORDER else CATEGORY_ORDER[-1]

    @property
    def findings(self) -> list[tuple[CheckResult, Finding]]:
        return [(r, f) for r in self.results for f in r.findings]

    @property
    def criteria(self) -> list[str]:
        seen = []
        for r in self.results:
            if r.spec.criteria not in seen:
                seen.append(r.spec.criteria)
        return seen


def _sub_matches(sub: str, finding_sub: str) -> bool:
    return bool(finding_sub) and (finding_sub == sub or finding_sub.lower() in sub.lower())


def attach_subchecks(r: CheckResult):
    """Every Remarks bullet gets a verdict: from the rule's sub-check findings, else 'not evaluated'."""
    r.subchecks = []
    for sub in r.spec.subchecks:
        fs = [f for f in r.findings if _sub_matches(sub, f.subcheck)]
        if fs:
            st = worst_status(f.status for f in fs)
            flagged = [f for f in fs if f.is_flag]
            wk = [f for f in fs if f.entity == "worker"]
            if len({f.worker for f in wk}) > 1:
                names = sorted({f.worker for f in flagged if f.entity == "worker"})
                n = len({f.worker for f in wk})
                obs = (f"{len(names)} of {n} workers flagged: {name_list(names)}. " + flagged[0].observation) if names else \
                    f"All {n} workers compliant. {fs[0].observation}"
                site = [f for f in flagged if f.entity == "site"]
                if site:
                    obs += " " + site[0].observation
            else:
                obs = " ".join(dict.fromkeys(f.observation for f in (flagged or fs)))
            r.subchecks.append({"text": sub, "status": st, "risk": worst_risk(fs), "by": "rules", "observation": obs[:700]})
        else:
            r.subchecks.append({"text": sub, "status": NV, "risk": "Low", "by": "pending",
                                "observation": "No coded rule for this sub-check — evaluated by the AI audit stage."})


def run_rules(ev: Evidence, specs: list[CheckSpec], params: dict, policy: dict) -> list[CheckResult]:
    ctx = Ctx(ev, params, policy)
    results = []
    for spec in specs:
        ctx.spec = spec
        r = CheckResult(spec)
        try:
            if spec.sheet == "Not Possible":
                r.findings = not_possible(ctx, spec)
            elif spec.sno in REGISTRY:
                r.findings = REGISTRY[spec.sno](ctx, spec) or []
                if not r.findings:
                    r.note = "No worker or document in scope for this check."
            else:
                r.findings = [ctx.F(ctx.site(), spec.item, "No coded rule", "bss_agent/checks*.py", NV, "Medium",
                                    "This catalogue row has no coded rule — it is audited by the AI provider from the evidence.")]
        except Exception as exc:  # one broken rule must not stop the audit
            r.findings = [ctx.F(ctx.site(), spec.item, f"Rule error: {type(exc).__name__}: {exc}", "bss_agent/checks*.py", NV, "Medium",
                                "The rule could not evaluate this evidence; the AI provider audits the row instead.")]
        r.finalise()
        attach_subchecks(r)
        results.append(r)
    return results


def make_report_no(cfg: dict, ev: Evidence, started: datetime) -> str:
    tag = re.sub(r"[^A-Z0-9]", "", (ev.contractor or "CONTR").upper().split()[0] if ev.contractor else "CONTR")[:8]
    return f"{cfg['audit']['report_prefix']}-{tag}-{ev.month_start:%Y%m}-{started:%y%m%d%H%M}"


def run_audit(evidence: Evidence, agent_root: Path = AGENT_ROOT, cfg: dict | None = None, client=None, log=print) -> AuditRun:
    cfg = cfg or load_json(agent_root / "config" / "agent_config.json")
    params = load_json(agent_root / "config" / "statutory_params.json")
    specs = load_catalogue(agent_root / cfg["paths"]["catalogue"])
    started = datetime.now()
    results = run_rules(evidence, specs, params, cfg.get("policy", {}))
    run = AuditRun(results, evidence, cfg, params, started, make_report_no(cfg, evidence, started), specs)
    if client is not None and client.available:
        from .auditor import deepseek_audit
        run.ai_label = getattr(client, "label", "DeepSeek")
        log(f"  {run.ai_label} auditing {len(results)} checkpoints and {sum(len(s.subchecks) for s in specs)} sub-checks …")
        deepseek_audit(run, client, log=log)
        ai = sum(1 for r in run.results if r.verdict_by == "deepseek" or r.cross_check.startswith("Rule check"))
        answered = sum(1 for r in run.results if not r.cross_check.startswith(f"{run.ai_label} gave no verdict"))
        run.mode = "deepseek" if answered == len(run.results) else "partial" if answered else "rules"
        if run.mode != "deepseek":
            run.issues.append(f"{run.ai_label} gave verdicts for {answered} of {len(run.results)} rows; the rest use the rule verdict.")
    else:
        for r in results:
            for sc in r.subchecks:
                if sc["by"] == "pending":
                    sc.update(by="rules", observation="Not evaluated automatically in offline mode — manual review required.")
    verify_coverage(run)
    return run


def verify_coverage(run: AuditRun):
    ids = [r.spec.cid for r in run.results]
    missing = [s.cid for s in run.specs if s.cid not in ids]
    if missing or len(ids) != len(run.specs):
        raise RuntimeError(f"Coverage failure: catalogue rows without a result: {missing}")
    for r in run.results:
        if len(r.subchecks) != len(r.spec.subchecks):
            raise RuntimeError(f"Coverage failure: {r.spec.cid} has {len(r.spec.subchecks)} sub-checks but {len(r.subchecks)} verdicts")


def save_json(run: AuditRun, path: Path):
    def fd(f):
        return asdict(f)
    data = {
        "report_no": run.report_no, "generated": run.started.isoformat(timespec="seconds"), "mode": run.mode,
        "contractor": run.evidence.contractor, "wage_month": run.evidence.month_start.strftime("%Y-%m"),
        "meta": run.evidence.meta, "llm_usage": run.llm_usage, "issues": run.issues, "ai_label": run.ai_label,
        "results": [{"id": r.spec.cid, "sheet": r.spec.sheet, "criteria": r.spec.criteria, "area": r.spec.area, "item": r.spec.item,
                     "ref": r.spec.ref, "remarks": r.spec.remarks, "act": r.spec.act, "status": r.status, "risk": r.risk,
                     "summary": r.summary, "verdict_by": r.verdict_by, "cross_check": r.cross_check,
                     "rule_status": r.rule_status, "rule_risk": r.rule_risk, "rule_summary": r.rule_summary,
                     "subchecks": r.subchecks, "findings": [fd(f) for f in r.findings],
                     "rule_findings": [fd(f) for f in r.rule_findings] if r.verdict_by != "rules" else []}
                    for r in run.results],
        "narrative": run.narrative,
    }
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str), encoding="utf-8")


__all__ = ["run_audit", "AuditRun", "CATEGORY_ORDER", "CATEGORY_SHORT", "FAIL", "NA", "save_json", "run_rules"]
