"""Attendance session controller.

Runs as the container's main process and exposes a small, token-guarded HTTP
API that the BSS backend calls to run one detection pipeline per site:

    GET  /health
    GET  /sessions
    POST /session/start   {"site": "...", "source": "rtsp://..."}
    POST /session/stop    {"site": "..."}
    GET  /detections?site=...&since=...&limit=...

Each session is `main.py --no-display --site <site> --source <source>`; the
child is restarted (until stopped) so a quiet RTSP or a short file keeps
producing detections. Protection:

  * CONTROL_TOKEN      - required on every request via X-Attendance-Token
  * ALLOWED_CLIENTS    - optional comma-separated IP allowlist (empty = any)
"""
import json
import os
import subprocess
import sys
import threading
import time

from flask import Flask, jsonify, request

from src.database import Database

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CONTROL_TOKEN = os.environ.get("CONTROL_TOKEN", "")
CONTROL_PORT = int(os.environ.get("CONTROL_PORT", "80"))
ALLOWED_CLIENTS = [ip.strip() for ip in os.environ.get("ALLOWED_CLIENTS", "").split(",") if ip.strip()]
DEFAULT_SOURCE = os.environ.get("DEFAULT_SOURCE", "rtsp://127.0.0.1:8554/cctv")
RESTART_DELAY_S = float(os.environ.get("RESTART_DELAY_S", "3"))
LOG_DIR = os.environ.get("SESSION_LOG_DIR", os.path.join(APP_DIR, "session-logs"))

app = Flask(__name__)
_lock = threading.Lock()
_sessions: dict[str, dict] = {}


def _load_config() -> dict:
    try:
        import yaml
        with open(os.path.join(APP_DIR, "config.yaml"), "r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    except Exception:
        return {}


def _db() -> Database:
    cfg = _load_config().get("postgres", {}) or {}
    return Database(cfg)


def _authorized() -> bool:
    if ALLOWED_CLIENTS and request.remote_addr not in ALLOWED_CLIENTS:
        return False
    return bool(CONTROL_TOKEN) and request.headers.get("X-Attendance-Token") == CONTROL_TOKEN


def _runner(site: str, source: str) -> None:
    """Own the child process for one site, restarting until stopped."""
    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = os.path.join(LOG_DIR, f"{site}.log")
    while True:
        with _lock:
            if not _sessions.get(site, {}).get("active"):
                break
        with open(log_path, "ab") as log:
            log.write(f"\n=== start {time.strftime('%Y-%m-%d %H:%M:%S')} source={source} ===\n".encode())
            proc = subprocess.Popen(
                [sys.executable, os.path.join(APP_DIR, "main.py"),
                 "--no-display", "--site", site, "--source", source],
                cwd=APP_DIR, stdout=log, stderr=subprocess.STDOUT,
            )
        with _lock:
            if site in _sessions:
                _sessions[site]["pid"] = proc.pid
        rc = proc.wait()
        with _lock:
            s = _sessions.get(site)
            if s is None or not s.get("active"):
                if s is not None:
                    s.update(status="stopped", pid=None, returncode=rc)
                break
            s["restarts"] = int(s.get("restarts", 0)) + 1
            s["returncode"] = rc
        time.sleep(RESTART_DELAY_S)


def _start(site: str, source: str) -> dict:
    with _lock:
        existing = _sessions.get(site)
        if existing and existing.get("active"):
            return {"ok": True, "alreadyRunning": True, "session": _public(existing)}
        session = {
            "site": site, "source": source, "active": True, "pid": None,
            "started_at": time.time(), "restarts": 0, "returncode": None,
        }
        _sessions[site] = session
    threading.Thread(target=_runner, args=(site, source), daemon=True).start()
    return {"ok": True, "alreadyRunning": False, "session": _public(session)}


def _stop(site: str) -> dict:
    with _lock:
        session = _sessions.get(site)
        if session is None:
            return {"ok": True, "alreadyStopped": True}
        session["active"] = False
        pid = session.get("pid")
    if pid:
        try:
            os.kill(pid, 15)
        except ProcessLookupError:
            pass
    return {"ok": True, "alreadyStopped": False}


def _public(session: dict) -> dict:
    return {
        "site": session.get("site"),
        "source": session.get("source"),
        "active": bool(session.get("active")),
        "pid": session.get("pid"),
        "startedAt": session.get("started_at"),
        "restarts": session.get("restarts", 0),
        "returncode": session.get("returncode"),
    }


@app.get("/health")
def health():
    return jsonify(ok=True, service="attendance-controller", sessions=len(_sessions))


@app.get("/sessions")
def sessions():
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    with _lock:
        return jsonify(sessions=[_public(s) for s in _sessions.values()])


@app.post("/session/start")
def session_start():
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    site = str(body.get("site") or "").strip()
    if not site:
        return jsonify(error="site is required"), 400
    source = str(body.get("source") or "").strip() or DEFAULT_SOURCE
    return jsonify(**_start(site, source))


@app.post("/session/stop")
def session_stop():
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    site = str(body.get("site") or "").strip()
    if not site:
        return jsonify(error="site is required"), 400
    return jsonify(**_stop(site))


@app.get("/detections")
def detections():
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    site = request.args.get("site", "").strip()
    since = request.args.get("since", type=float)
    limit = min(request.args.get("limit", default=100, type=int), 500)
    db = _db()
    try:
        clauses, params = [], []
        if site:
            clauses.append("site = %s")
            params.append(site)
        if since:
            clauses.append("ts_start >= %s")
            params.append(since)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = db.conn.execute(
            f"""SELECT id, name, camera, site, ts_start, ts_end, age_estimate,
                       match_distance, snapshot_path
                FROM sightings {where} ORDER BY id DESC LIMIT %s""",
            (*params, limit),
        ).fetchall()
        sightings = [
            {"id": r[0], "name": r[1], "camera": r[2], "site": r[3],
             "tsStart": r[4], "tsEnd": r[5], "age": r[6], "distance": r[7],
             "snapshot": r[8]}
            for r in rows
        ]
        scans = db.conn.execute(
            """SELECT id, ts, payload, matched_label, match_score, camera, site
               FROM code_scans {} ORDER BY id DESC LIMIT %s""".format(
                "WHERE site = %s" if site else ""),
            ((site, limit) if site else (limit,)),
        ).fetchall()
        qr = [
            {"id": r[0], "ts": r[1], "payload": r[2], "matchedLabel": r[3],
             "score": r[4], "camera": r[5], "site": r[6]}
            for r in scans
        ]
        return jsonify(sightings=sightings, codeScans=qr)
    finally:
        db.close()


if __name__ == "__main__":
    print(f"[controller] listening on 0.0.0.0:{CONTROL_PORT} "
          f"(default source: {DEFAULT_SOURCE})", flush=True)
    app.run(host="0.0.0.0", port=CONTROL_PORT, threaded=True)
