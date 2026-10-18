#!/usr/bin/env python3
"""Isolated BSS audit runner.

Watches the shared audit job volume for run.request files, decrypts the active
AI key in memory, runs the vendored audit agent, and writes status.json.
It has no database code, no BSS backend code and no DB credentials.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

from cryptography.fernet import Fernet

HERE = Path(__file__).resolve().parent
DEFAULT_AGENT_DIR = HERE.parent / "audit_agent"
JOBS_DIR = Path(os.environ.get("BSS_AUDIT_JOBS_DIR", str(HERE.parent / "audit_jobs")))
AGENT_DIR = Path(os.environ.get("BSS_AUDIT_AGENT_DIR", str(DEFAULT_AGENT_DIR)))
CACHE_DIR = Path(os.environ.get("DEEPSEEK_CACHE_DIR", str(JOBS_DIR.parent / "cache")))
POLL_SECONDS = max(2, int(os.environ.get("BSS_AUDIT_RUNNER_POLL_SECONDS", "5")))


def log(message: str) -> None:
    print(f"[audit-runner] {message}", flush=True)


def fernet() -> Fernet:
    secret = str(os.environ.get("BSS_AUDIT_HANDOFF_KEY", "")).strip()
    if not secret:
        raise RuntimeError("BSS_AUDIT_HANDOFF_KEY is not configured.")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def write_status(job_dir: Path, payload: dict) -> None:
    path = job_dir / "status.json"
    tmp = job_dir / "status.json.tmp"
    tmp.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    try:
        os.chmod(tmp, 0o600)
    except OSError:
        pass
    os.replace(tmp, path)


def read_request(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    token = str(data.get("payload") or "")
    if not token:
        raise RuntimeError("run.request has no payload.")
    payload = json.loads(fernet().decrypt(token.encode()).decode())
    key = str(payload.get("apiKey") or "").strip()
    if not key:
        raise RuntimeError("The handoff payload has no API key.")
    return payload


def summarise_json(path: Path | None) -> dict:
    if path is None or not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    status_counts: dict[str, int] = {}
    risk_counts: dict[str, int] = {}
    for row in data.get("results") or []:
        status = str(row.get("status") or "Pending")
        risk = str(row.get("risk") or "None")
        status_counts[status] = status_counts.get(status, 0) + 1
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
    narrative = data.get("narrative") or {}
    return {
        "reportNo": data.get("report_no"),
        "generated": data.get("generated"),
        "mode": data.get("mode"),
        "statusCounts": status_counts,
        "riskCounts": risk_counts,
        "totalCheckpoints": len(data.get("results") or []),
        "executiveSummary": narrative.get("executive_summary") or "",
        "verdict": narrative.get("closing_opinion") or "",
        "llmUsage": data.get("llm_usage") or {},
    }


def find_output(out_dir: Path) -> Path | None:
    if not out_dir.exists():
        return None
    candidates = [p for p in out_dir.iterdir() if p.is_dir() and p.name != "_work"]
    return max(candidates, key=lambda p: p.stat().st_mtime) if candidates else None


def rel(job_dir: Path, path: Path | None) -> str:
    if path is None:
        return ""
    try:
        return str(path.relative_to(job_dir))
    except ValueError:
        return ""


def run_one(root: Path, request_path: Path) -> None:
    started = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    processing = root / "run.processing"
    try:
        os.replace(request_path, processing)
    except OSError:
        return
    try:
        root_uuid = uuid.UUID(root.name)
        if str(root_uuid) != root.name:
            raise RuntimeError("Invalid job id.")
        write_status(root, {"status": "RUNNING", "startedAt": started})
        request = read_request(processing)
        query = next(root.glob("contractor_documents_*"), None)
        groundtruth = root / "worker_documents"
        job_json = root / "job.json"
        if query is None or not groundtruth.is_dir() or not job_json.exists():
            raise RuntimeError("The job folder is incomplete.")
        out_dir = root / "output"
        out_dir.mkdir(parents=True, exist_ok=True)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        log_path = root / "logs" / "agent.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        env = {
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "HOME": "/tmp",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PYTHONUNBUFFERED": "1",
            "DEEPSEEK_API_KEY": request["apiKey"],
            "DEEPSEEK_CACHE_DIR": str(CACHE_DIR),
        }
        if request.get("baseUrl"):
            env["DEEPSEEK_BASE_URL"] = str(request["baseUrl"])
        # The agent uses its own role-specific models (deepseek-flash for
        # reading/vision and deepseek-v4-pro for audit/narrative). The BSS Admin
        # model field is not forced onto every role; the active provider/key and
        # base URL are what the runner takes from BSS Admin.
        cmd = [
            sys.executable, str(AGENT_DIR / "run_agent.py"),
            "--groundtruth", str(groundtruth),
            "--query", str(query),
            "--job", str(job_json),
            "--out", str(out_dir),
        ]
        with open(log_path, "w", encoding="utf-8") as log_file:
            proc = subprocess.run(cmd, cwd=str(AGENT_DIR), env=env, stdout=log_file,
                                  stderr=subprocess.STDOUT, timeout=3600)
        if proc.returncode != 0:
            tail = log_path.read_text(encoding="utf-8", errors="ignore")[-2000:]
            raise RuntimeError(f"The audit agent failed (exit {proc.returncode}). {tail}")
        report_dir = find_output(out_dir)
        if report_dir is None:
            raise RuntimeError("The audit agent produced no report folder.")
        html = next(report_dir.glob("*.html"), None)
        pdf = next(report_dir.glob("*.pdf"), None)
        xlsx = next(report_dir.glob("*_audit_workbook.xlsx"), None) or next(report_dir.glob("*.xlsx"), None)
        report_json = next(report_dir.glob("*.json"), None)
        evidence = report_dir / "evidence" / "evidence.json"
        summary = summarise_json(report_json)
        write_status(root, {
            "status": "READY",
            "startedAt": started,
            "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "reportHtml": rel(root, html),
            "reportPdf": rel(root, pdf),
            "reportXlsx": rel(root, xlsx),
            "reportJson": rel(root, report_json),
            "evidenceJson": rel(root, evidence if evidence.exists() else None),
            "summary": summary,
            "tokenUsage": summary.get("llmUsage") or {},
        })
        log(f"audit ready · {root.name} · {summary.get('reportNo', '')}")
    except Exception as exc:  # noqa: BLE001
        write_status(root, {
            "status": "FAILED",
            "startedAt": started,
            "finishedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "error": str(exc)[:4000],
        })
        log(f"audit failed · {root.name} · {exc}")
    finally:
        for path in (processing, request_path):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass


def main() -> int:
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    log(f"watching {JOBS_DIR} · agent {AGENT_DIR} · poll {POLL_SECONDS}s")
    while True:
        for request in sorted(JOBS_DIR.glob("*/run.request")):
            root = request.parent
            if (root / "run.processing").exists():
                continue
            run_one(root, request)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
