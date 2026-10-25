"""End-to-end job: two input folders in, BSS-branded HTML + PDF (+ Excel, JSON, evidence) out.

    from bss_agent import run_job
    result = run_job("/tmp/job123/groundtruth", "/tmp/job123/query", out_dir="/srv/bss/reports",
                     job={"principal_employer": "Carlsberg India Pvt Ltd", "state": "MH", "wage_month": "2025-01"})
    result["html"], result["pdf"], result["summary"]

Steps: ingest (text layer + page images) → DeepSeek classify & extract → evidence.json →
rule computations → DeepSeek audit of every row & sub-check → narrative → reports.
"""

from __future__ import annotations

import json
import re
import shutil
import time
import uuid
from pathlib import Path

from . import analytics, report_model
from .deepseek_api import DeepSeekClient
from .engine import AGENT_ROOT, load_json, run_audit, save_json
from .evidence import Evidence
from .html_report import build_html
from .narrative import deterministic_narrative, executive_narrative
from .pdf_report import build_pdf
from .workbook import build_workbook


class JobError(RuntimeError):
    pass


def validate_job(job: dict | None) -> dict:
    """Context from the BSS platform / job.json: keep known keys, check formats."""
    job = {k: v for k, v in (job or {}).items() if not str(k).startswith("_") and v not in (None, "")}
    unknown = set(job) - JOB_KEYS
    if unknown:
        raise JobError(f"Unknown job context field(s): {', '.join(sorted(unknown))}. Allowed: {', '.join(sorted(JOB_KEYS))}.")
    if "wage_month" in job and not re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", str(job["wage_month"])):
        raise JobError(f"wage_month must be YYYY-MM (got {job['wage_month']!r}).")
    if "state" in job:
        job["state"] = str(job["state"]).upper()
        if not re.fullmatch(r"[A-Z]{2}", job["state"]):
            raise JobError(f"state must be a 2-letter code such as MH (got {job['state']!r}).")
    if "is_construction" in job:
        job["is_construction"] = str(job["is_construction"]).lower() in ("1", "true", "yes")
    return job


JOB_KEYS = {"principal_employer", "contractor_legal_name", "contractor_address", "site", "site_short", "state", "state_name",
            "wage_month", "nature_of_work", "is_construction", "hazardous", "headcount_establishment"}


def run_job(groundtruth_dir: str | Path | None, query_dir: str | Path | None, out_dir: str | Path | None = None, job: dict | None = None,
            api_key: str | None = None, offline: bool = False, evidence_path: str | Path | None = None, keep_work: bool = False,
            log=print) -> dict:
    t0 = time.time()
    job = validate_job(job)
    cfg = load_json(AGENT_ROOT / "config" / "agent_config.json")
    out_root = Path(out_dir) if out_dir else AGENT_ROOT / cfg["paths"]["output"]
    out_root.mkdir(parents=True, exist_ok=True)
    client = None if offline else DeepSeekClient(api_key)
    if client is not None and not client.available:
        log(f"  ! No {client.label} key — running offline (rule engine only).")
        client = None
    work = out_root / "_work" / uuid.uuid4().hex[:10]
    try:
        return _run(groundtruth_dir, query_dir, out_root, job, client, evidence_path, work, cfg, t0, log)
    finally:
        if not keep_work:
            shutil.rmtree(work, ignore_errors=True)


def _run(groundtruth_dir, query_dir, out_root: Path, job: dict, client, evidence_path, work: Path, cfg: dict, t0: float, log) -> dict:
    raw = None
    if evidence_path:
        log(f"  evidence      : {evidence_path} (re-audit, documents not re-read)")
        try:
            data = json.loads(Path(evidence_path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise JobError(f"Cannot read the evidence file: {exc}") from exc
        if data.get("schema") != "bss-evidence/2":
            raise JobError("The evidence file is not a bss-evidence/2 file produced by this agent.")
        for k, v in job.items():
            data.setdefault("meta", {})[k] = v
        if job.get("wage_month"):
            data["wage_month"] = job["wage_month"]
    else:
        from .extract import assemble, read_all
        from .ingest import check_tools, ingest_folder
        if not (groundtruth_dir and query_dir):
            raise JobError("Both the ground-truth folder and the query folder are required.")
        gt, cq = Path(groundtruth_dir), Path(query_dir)
        for p, name in ((gt, "ground-truth"), (cq, "query")):
            if not p.is_dir():
                raise JobError(f"The {name} folder does not exist: {p}")
        if gt.resolve() == cq.resolve():
            raise JobError("The ground-truth and query folders must be different folders.")
        missing = check_tools()
        if missing:
            raise JobError(f"Missing system tools: {', '.join(missing)} (install poppler-utils).")
        if client is None:
            raise JobError("Reading documents needs an AI provider: set BSS_AI_API_KEY / OPENROUTER_API_KEY / DEEPSEEK_API_KEY, "
                           "or pass an existing evidence.json with --evidence.")
        chk0 = client.check_key()
        if not chk0["ok"]:
            raise JobError(chk0["message"])
        ing = cfg.get("ingest", {})
        log("  ingesting the two folders …")
        docs = ingest_folder(gt, "gt", work, ing.get("render_dpi", 150), ing.get("max_image_side", 2000)) + \
            ingest_folder(cq, "cq", work, ing.get("render_dpi", 150), ing.get("max_image_side", 2000))
        for root, name in (("gt", "ground-truth"), ("cq", "query")):
            usable = [d for d in docs if d.root == root and d.pages and not d.error]
            if not usable:
                bad = [f"{d.rel} ({d.error})" for d in docs if d.root == root and d.error][:5]
                raise JobError(f"The {name} folder has no readable documents" + (f" — {'; '.join(bad)}" if bad else "") + ".")
        n_gt = sum(d.root == "gt" for d in docs)
        log(f"  documents     : {n_gt} ground truth · {len(docs) - n_gt} contractor · "
            f"{sum(len(d.pages) for d in docs)} pages ({sum(1 for d in docs for p in d.pages if p.needs_vision)} read as images)")
        log(f"  {client.label:<13}: {chk0['message']}")
        raw = read_all(docs, client, log=log)
        if client.fatal:
            raise JobError(client.fatal)
        read_ok = sum(1 for r in raw["cq"].values() if not r.get("error"))
        if not read_ok:
            raise JobError(f"{client.label} could not read any contractor document: " + "; ".join(raw["errors"][:3]))
        data = assemble(docs, raw, job, client)

    # Overlay the BSS bound-worker master (written by the BSS backend next to
    # worker_documents/) so identity and employment checks compare against the
    # workers actually bound to this contractor/site/month.
    if groundtruth_dir:
        master_path = Path(groundtruth_dir).parent / "bss_workers.json"
        if master_path.exists():
            try:
                from .extract import overlay_bss_workers
                overlay_bss_workers(data, json.loads(master_path.read_text(encoding="utf-8")))
                log("  bss master    : bss_workers.json overlaid on ground truth")
            except Exception as exc:  # noqa: BLE001
                data.setdefault("errors", []).append(f"BSS worker master could not be loaded: {exc}")
                log(f"  ! bss master  : {exc}")

    ev = Evidence(data)
    log(f"  context       : {ev.meta.get('contractor_legal_name')} · {ev.meta.get('site_short') or ev.meta.get('site')} · "
        f"{ev.month_start:%B %Y} · {len(ev.workers)} workers on rolls · {len(ev.gt['workers'])} in ground truth")
    run = run_audit(ev, AGENT_ROOT, cfg, client, log=log)
    if client:
        run.llm_usage = {**client.usage, "models": sorted(set(client.cfg["models"].values()))}
    log("  writing narrative and reports …")
    run.narrative = executive_narrative(run, client) if client else deterministic_narrative(run)
    analytics.reset(run)                   # stats after the DeepSeek verdicts and the narrative
    s = analytics.stats(run)

    out, n = out_root / run.report_no, 2
    while True:                            # two audits of the same contractor in the same minute: claim atomically
        try:
            out.mkdir(parents=True, exist_ok=False)
            break
        except FileExistsError:
            out, n = out_root / f"{run.report_no}-{n}", n + 1
    run.report_no = out.name
    (out / "evidence").mkdir()
    (out / "evidence" / "evidence.json").write_text(json.dumps(data, indent=1, ensure_ascii=False, default=str), encoding="utf-8")
    if raw is not None:
        (out / "evidence" / "extraction_raw.json").write_text(json.dumps(raw, indent=1, ensure_ascii=False, default=str), encoding="utf-8")
    if client:
        (out / "evidence" / "deepseek_calls.json").write_text(json.dumps(client.log, indent=1), encoding="utf-8")
    model = report_model.build(run)
    xlsx_name = f"{run.report_no}_audit_workbook.xlsx"
    model["meta"]["workbook"] = xlsx_name
    xlsx = build_workbook(model, out / xlsx_name)
    pdf = build_pdf(model, out / f"{run.report_no}.pdf")
    html = build_html(model, out / f"{run.report_no}.html", pdf_name=pdf.name, xlsx_name=xlsx.name)
    save_json(run, out / f"{run.report_no}.json")
    summary = {"report_no": run.report_no, "mode": run.mode, "score": round(s["score"], 1), "overall_risk": s["overall_risk"],
               "checkpoints": s["total"], "subchecks": s["subchecks"], "status_counts": s["status_counts"], "flags": s["total_flags"],
               "workers_on_rolls": s["workers_on_rolls"], "ground_truth_missing": s["gt_missing"],
               "exposure_inr": round(s["exposure"]["total"]), "differs_from_rules": len(s["differs"]),
               "issues": run.issues + data.get("errors", []), "llm_usage": run.llm_usage, "seconds": round(time.time() - t0, 1)}
    log(f"  reports written to {out}")
    return {"folder": str(out), "html": str(html), "pdf": str(pdf), "xlsx": str(xlsx), "json": str(out / f"{run.report_no}.json"),
            "evidence": str(out / "evidence" / "evidence.json"), "summary": summary}
