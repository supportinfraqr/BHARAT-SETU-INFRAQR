#!/usr/bin/env python3
"""Isolated BSS audit runner.

Watches the shared audit job volume for run.request files, decrypts the active
AI key in memory, runs the vendored audit agent, and writes status.json. It has
no database code, no BSS backend code and no DB credentials.

Long jobs are monitored with a heartbeat, stage/percentage progress and a
4-hour safety cap. Cancel is a cooperative file (cancel.request).
"""

from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import os
import queue
import re
import signal
import subprocess
import sys
import threading
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
HEARTBEAT_SECONDS = max(5, int(os.environ.get("BSS_AUDIT_HEARTBEAT_SECONDS", "15")))
STALL_AFTER_SECONDS = max(300, int(os.environ.get("BSS_AUDIT_STALL_AFTER_SECONDS", "1800")))
MAX_RUNTIME_SECONDS = max(600, int(os.environ.get("BSS_AUDIT_MAX_RUNTIME_SECONDS", "14400")))


def log(message: str) -> None:
    print(f"[audit-runner] {message}", flush=True)


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


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


def _content_type(name: str) -> str:
    low = name.lower()
    if low.endswith(".html"):
        return "text/html; charset=utf-8"
    if low.endswith(".pdf"):
        return "application/pdf"
    if low.endswith(".xlsx"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if low.endswith(".json"):
        return "application/json"
    return "application/octet-stream"


def _artifacts(job_dir: Path, report_dir: Path) -> list[dict]:
    items = []
    for path in sorted(report_dir.rglob("*")):
        if not path.is_file():
            continue
        name = path.name
        admin_only = name in ("extraction_raw.json", "deepseek_calls.json") or (
            "evidence" in path.parts and name != "evidence.json")
        items.append({
            "name": name,
            "path": rel(job_dir, path),
            "size": path.stat().st_size,
            "contentType": _content_type(name),
            "adminOnly": admin_only,
        })
    return items


def _terminate(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except OSError:
        try:
            proc.terminate()
        except OSError:
            return
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except OSError:
            try:
                proc.kill()
            except OSError:
                pass


def _read_lines(stream, lines: queue.Queue, log_file) -> None:
    try:
        for line in iter(stream.readline, ""):
            log_file.write(line)
            log_file.flush()
            lines.put(line.rstrip("\n"))
    finally:
        try:
            stream.close()
        except OSError:
            pass


def _stage_from_line(line: str, state: dict) -> None:
    text = line.strip()
    low = text.lower()
    if not text:
        return
    changed = False
    if "ingesting" in low:
        state.update(stage="ingesting", percent=10, message="Reading the document folders")
        changed = True
    elif "classifying" in low:
        state.update(stage="classifying", percent=20, message="Classifying documents")
        changed = True
    elif low.startswith("reading ") or "reading " in low and "documents" in low:
        state.update(stage="reading", percent=30, message="Extracting document data")
        changed = True
    elif "deepseek auditing" in low:
        state.update(stage="auditing", percent=35, message="Auditing statutory checkpoints")
        changed = True
    elif low.startswith("audit progress:"):
        match = re.search(r"audit progress:\s*(\d+)\s*/\s*(\d+)", low)
        if match:
            done, total = int(match.group(1)), int(match.group(2))
            percent = 35 + (50 * done / total if total else 0)
            state.update(stage="auditing", percent=min(85, round(percent, 1)),
                         message=f"Auditing checkpoints ({done}/{total})", done=done, total=total)
            changed = True
    elif "deepseek verdicts" in low:
        state.update(stage="auditing", percent=88, message="Applying audit verdicts")
        changed = True
    elif "writing narrative and reports" in low:
        state.update(stage="reporting", percent=90, message="Writing the report")
        changed = True
    elif "reports written" in low:
        state.update(stage="reporting", percent=95, message="Packaging the report files")
        changed = True
    if changed:
        state["lastProgress"] = time.monotonic()
        state["logLine"] = text[:300]


def run_one(root: Path, request_path: Path) -> None:
    started_mono = time.monotonic()
    started_at = _now()
    processing = root / "run.processing"
    try:
        os.replace(request_path, processing)
    except OSError:
        return
    proc: subprocess.Popen | None = None
    log_file = None
    try:
        uuid.UUID(root.name)
        state = {"stage": "starting", "percent": 0, "message": "Starting the audit",
                 "lastProgress": started_mono, "done": None, "total": None}
        write_status(root, {"status": "RUNNING", "startedAt": started_at, "lastHeartbeat": _now(),
                            "elapsedSeconds": 0, **{k: state[k] for k in ("stage", "percent", "message")}})
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
        provider = str(request.get("provider") or "deepseek").lower()
        env = {
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "HOME": "/tmp",
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PYTHONUNBUFFERED": "1",
            "BSS_AI_PROVIDER": provider,
            "BSS_AI_PROVIDER_LABEL": str(request.get("providerLabel") or provider),
            "BSS_AI_API_KEY": request["apiKey"],
            "DEEPSEEK_CACHE_DIR": str(CACHE_DIR),
        }
        if request.get("baseUrl"):
            env["BSS_AI_BASE_URL"] = str(request["baseUrl"])
        if provider != "deepseek" and request.get("model"):
            env["BSS_AI_MODEL"] = str(request["model"])
        if provider == "deepseek":
            env["DEEPSEEK_API_KEY"] = request["apiKey"]
            if request.get("baseUrl"):
                env["DEEPSEEK_BASE_URL"] = str(request["baseUrl"])
        elif provider == "openrouter":
            env["BSS_AI_REFERER"] = "https://login.bharatshramsetu.com"
            env["BSS_AI_TITLE"] = "Bharat Shram Setu Audit"
        cmd = [
            sys.executable, str(AGENT_DIR / "run_agent.py"),
            "--groundtruth", str(groundtruth),
            "--query", str(query),
            "--job", str(job_json),
            "--out", str(out_dir),
        ]
        log_file = open(log_path, "w", encoding="utf-8")
        proc = subprocess.Popen(cmd, cwd=str(AGENT_DIR), env=env, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True, bufsize=1,
                                start_new_session=True)
        lines: queue.Queue = queue.Queue()
        threading.Thread(target=_read_lines, args=(proc.stdout, lines, log_file), daemon=True).start()

        cancelled = False
        timed_out = False
        last_heartbeat = 0.0
        while True:
            while True:
                try:
                    line = lines.get_nowait()
                except queue.Empty:
                    break
                _stage_from_line(line, state)
            now = time.monotonic()
            elapsed = now - started_mono
            if (root / "cancel.request").exists():
                cancelled = True
                _terminate(proc)
                break
            if elapsed >= MAX_RUNTIME_SECONDS:
                timed_out = True
                _terminate(proc)
                break
            stalled = now - state["lastProgress"] >= STALL_AFTER_SECONDS
            if now - last_heartbeat >= HEARTBEAT_SECONDS:
                write_status(root, {
                    "status": "RUNNING", "startedAt": started_at, "lastHeartbeat": _now(),
                    "elapsedSeconds": round(elapsed, 1), "stalled": stalled,
                    "stage": state["stage"], "percent": state["percent"], "message": state["message"],
                    "done": state.get("done"), "total": state.get("total"), "logLine": state.get("logLine", ""),
                })
                last_heartbeat = now
            if proc.poll() is not None:
                break
            time.sleep(1)

        # Drain any final lines after the process exits.
        try:
            while True:
                line = lines.get_nowait()
                _stage_from_line(line, state)
        except queue.Empty:
            pass
        elapsed = time.monotonic() - started_mono
        for path in (processing, root / "cancel.request"):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
        if cancelled:
            write_status(root, {"status": "CANCELLED", "startedAt": started_at, "finishedAt": _now(),
                                "elapsedSeconds": round(elapsed, 1), "error": "Cancelled by the contractor."})
            log(f"audit cancelled · {root.name}")
            return
        if timed_out:
            write_status(root, {"status": "FAILED", "startedAt": started_at, "finishedAt": _now(),
                                "elapsedSeconds": round(elapsed, 1),
                                "error": f"Audit exceeded the {MAX_RUNTIME_SECONDS // 3600}-hour safety limit."})
            log(f"audit timed out · {root.name}")
            return
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
            "status": "READY", "startedAt": started_at, "finishedAt": _now(),
            "elapsedSeconds": round(elapsed, 1), "lastHeartbeat": _now(), "stalled": False,
            "stage": "ready", "percent": 100, "message": "Report ready",
            "reportHtml": rel(root, html), "reportPdf": rel(root, pdf),
            "reportXlsx": rel(root, xlsx), "reportJson": rel(root, report_json),
            "evidenceJson": rel(root, evidence if evidence.exists() else None),
            "artifacts": _artifacts(root, report_dir),
            "summary": summary, "tokenUsage": summary.get("llmUsage") or {},
        })
        log(f"audit ready · {root.name} · {summary.get('reportNo', '')}")
    except Exception as exc:  # noqa: BLE001
        if proc is not None:
            _terminate(proc)
        write_status(root, {"status": "FAILED", "startedAt": started_at, "finishedAt": _now(),
                            "elapsedSeconds": round(time.monotonic() - started_mono, 1),
                            "error": str(exc)[:4000]})
        log(f"audit failed · {root.name} · {exc}")
    finally:
        if log_file is not None:
            try:
                log_file.close()
            except OSError:
                pass
        for path in (processing, request_path):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass


def recover_processing() -> None:
    """Requeue jobs interrupted by a runner restart."""
    for processing in JOBS_DIR.glob("*/run.processing"):
        root = processing.parent
        status_path = root / "status.json"
        terminal = False
        if status_path.exists():
            try:
                terminal = str(json.loads(status_path.read_text(encoding="utf-8")).get("status")).upper() in (
                    "READY", "FAILED", "CANCELLED")
            except Exception:  # noqa: BLE001
                terminal = False
        if terminal:
            try:
                processing.unlink(missing_ok=True)
            except OSError:
                pass
            continue
        try:
            os.replace(processing, root / "run.request")
            log(f"recovered interrupted job · {root.name}")
        except OSError:
            pass


def main() -> int:
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    recover_processing()
    log(f"watching {JOBS_DIR} · agent {AGENT_DIR} · poll {POLL_SECONDS}s · max {MAX_RUNTIME_SECONDS}s")
    while True:
        for request in sorted(JOBS_DIR.glob("*/run.request")):
            root = request.parent
            if (root / "run.processing").exists():
                continue
            run_one(root, request)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
