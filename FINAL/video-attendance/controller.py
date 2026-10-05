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

# Cap ffmpeg connect/read waits so a wrong camera address fails fast (8s) on the
# "Test connection" probe instead of the ffmpeg default (~30s).
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rw_timeout;8000000|stimeout;8000000")

from flask import Flask, jsonify, request, send_file

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


def _runner(site: str, camera: str, source: str) -> None:
    """Own the child process for one (site, camera), restarting until stopped."""
    key = f"{site}::{camera}"
    os.makedirs(LOG_DIR, exist_ok=True)
    safe = f"{site}__{camera}".replace("/", "_").replace(":", "_").replace(" ", "_")
    log_path = os.path.join(LOG_DIR, f"{safe}.log")
    while True:
        with _lock:
            if not _sessions.get(key, {}).get("active"):
                break
        with open(log_path, "ab") as log:
            log.write(f"\n=== start {time.strftime('%Y-%m-%d %H:%M:%S')} camera={camera} source={source} ===\n".encode())
            proc = subprocess.Popen(
                [sys.executable, os.path.join(APP_DIR, "main.py"),
                 "--no-display", "--site", site, "--camera", camera, "--source", source],
                cwd=APP_DIR, stdout=log, stderr=subprocess.STDOUT,
            )
        with _lock:
            if key in _sessions:
                _sessions[key]["pid"] = proc.pid
        rc = proc.wait()
        with _lock:
            s = _sessions.get(key)
            if s is None or not s.get("active"):
                if s is not None:
                    s.update(status="stopped", pid=None, returncode=rc)
                break
            s["restarts"] = int(s.get("restarts", 0)) + 1
            s["returncode"] = rc
        time.sleep(RESTART_DELAY_S)


def _start(site: str, camera: str, source: str) -> dict:
    key = f"{site}::{camera}"
    with _lock:
        existing = _sessions.get(key)
        if existing and existing.get("active"):
            return {"ok": True, "alreadyRunning": True, "session": _public(existing)}
        session = {
            "site": site, "camera": camera, "source": source, "active": True, "pid": None,
            "started_at": time.time(), "restarts": 0, "returncode": None,
        }
        _sessions[key] = session
    threading.Thread(target=_runner, args=(site, camera, source), daemon=True).start()
    return {"ok": True, "alreadyRunning": False, "session": _public(session)}


def _stop(site: str, camera: str | None = None) -> dict:
    with _lock:
        keys = [k for k, s in _sessions.items()
                if s.get("site") == site and (camera is None or s.get("camera") == camera)]
        if not keys:
            return {"ok": True, "alreadyStopped": True, "stopped": []}
        pids, stopped = [], []
        for k in keys:
            session = _sessions[k]
            session["active"] = False
            if session.get("pid"):
                pids.append(session["pid"])
            stopped.append(_public(session))
    for pid in pids:
        try:
            os.kill(pid, 15)
        except ProcessLookupError:
            pass
    return {"ok": True, "alreadyStopped": False, "stopped": stopped}


def _public(session: dict) -> dict:
    return {
        "site": session.get("site"),
        "camera": session.get("camera"),
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
    cameras = body.get("cameras")
    if isinstance(cameras, list) and cameras:
        started = []
        for entry in cameras:
            if not isinstance(entry, dict):
                continue
            label = str(entry.get("label") or entry.get("camera") or "camera").strip() or "camera"
            source = str(entry.get("source") or "").strip()
            if not source:
                continue
            started.append(_start(site, label, source))
        if not started:
            return jsonify(error="no camera feeds supplied"), 400
        return jsonify(ok=True, sessions=[r["session"] for r in started])
    # Single-source fallback (kept for backward compatibility / manual testing).
    source = str(body.get("source") or "").strip() or DEFAULT_SOURCE
    camera = str(body.get("camera") or "camera").strip() or "camera"
    return jsonify(**_start(site, camera, source))


@app.post("/session/stop")
def session_stop():
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    site = str(body.get("site") or "").strip()
    if not site:
        return jsonify(error="site is required"), 400
    camera = str(body.get("camera") or "").strip() or None
    return jsonify(**_stop(site, camera))


@app.post("/probe")
def probe():
    """Open a feed and grab one frame — used by the Employer 'Test connection'
    button before saving a camera."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    source = str(body.get("source") or "").strip()
    if not source:
        return jsonify(error="source is required"), 400
    try:
        import cv2
    except Exception as exc:  # pragma: no cover
        return jsonify(ok=False, error=f"OpenCV unavailable: {exc}"), 200
    target = int(source) if source.isdigit() else source
    cap = cv2.VideoCapture(target)
    try:
        if hasattr(cv2, "CAP_PROP_OPEN_TIMEOUT_MSEC"):
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000)
        if hasattr(cv2, "CAP_PROP_READ_TIMEOUT_MSEC"):
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 8000)
        if not cap.isOpened():
            return jsonify(ok=False, error="Could not open the feed (check IP, port, path and login)."), 200
        ok, frame = cap.read()
    finally:
        cap.release()
    if not ok or frame is None:
        return jsonify(ok=False, error="Connected, but no video frame was received."), 200
    height, width = frame.shape[:2]
    return jsonify(ok=True, width=int(width), height=int(height)), 200


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


_engine_lock = threading.Lock()
_engine = None


def _face_engine():
    """Lazy singleton face engine (loads DeepFace models + the gallery once)."""
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                from src.face_engine import FaceEngine
                cfg = _load_config()
                db = _db()
                gallery = db.load_gallery(cfg["face"]["recognition_model"])
                _engine = (FaceEngine(cfg, gallery, db=db), db)
                print(f"[controller] face engine ready (gallery {len(gallery)})", flush=True)
    return _engine


def _decode_image(data_url: str):
    import base64

    import cv2
    import numpy as np

    raw = data_url.split(",", 1)[1] if data_url.strip().startswith("data:") else data_url
    try:
        buf = np.frombuffer(base64.b64decode(raw), np.uint8)
    except Exception:
        return None
    return cv2.imdecode(buf, cv2.IMREAD_COLOR)


@app.post("/frame")
def frame():
    """Recognise faces in one browser-captured frame; record a sighting for
    every known person so the site dashboard can mark their attendance."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    site = str(body.get("site") or "").strip()
    image = body.get("image") or ""
    if not site or not image:
        return jsonify(error="site and image are required"), 400
    img = _decode_image(str(image))
    if img is None:
        return jsonify(error="could not decode image"), 400

    engine, db = _face_engine()
    try:
        observations = engine.recognize_frame(img)
    except Exception as exc:
        return jsonify(error=f"recognition failed: {exc}"), 500

    from src.annotate import save_snapshot
    snap_root = _load_config().get("paths", {}).get("snapshots", "data/snapshots")
    detections = []
    for obs in observations:
        known = bool(obs.name and obs.name != "Unknown")
        snapshot = None
        if known:
            snapshot = save_snapshot(img, os.path.join(snap_root, site))
            sid = db.start_sighting(0, obs.person_id, obs.name)
            db.end_sighting(sid, snapshot)
            db.commit()
        detections.append({"name": obs.name, "known": known,
                           "distance": obs.distance, "snapshot": snapshot})
    return jsonify(site=site, count=len(detections), detections=detections)


@app.get("/snapshot")
def snapshot():
    """Serve a captured snapshot (only files under the snapshots root)."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    path = request.args.get("path", "")
    root = os.path.abspath(_load_config().get("paths", {}).get("snapshots", "data/snapshots"))
    full = os.path.abspath(path)
    if not full.startswith(root + os.sep) or not os.path.isfile(full):
        return jsonify(error="not found"), 404
    return send_file(full)


@app.post("/enroll")
def enroll():
    """Enrol a worker's face photos (base64 jpegs) into the gallery under their
    BSS id, so the live camera / CCTV can recognise them."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    person = str(body.get("person") or "").strip()
    images = body.get("images") or []
    if not person or not images:
        return jsonify(error="person and images are required"), 400
    frames = [f for f in (_decode_image(str(i)) for i in images) if f is not None]
    if not frames:
        return jsonify(error="no decodable images"), 400
    engine, _ = _face_engine()
    added = engine.enroll_from_images(person, frames)
    return jsonify(person=person, submitted=len(frames), added=added)


@app.post("/check-face")
def check_face():
    """Detect-only face check for each supplied image (no save, no enrol).

    Used to reject non-face / too-small / blurry photos before anything is
    persisted. Returns per-image {index, face, reason, box}."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    body = request.get_json(silent=True) or {}
    images = body.get("images") or ([body.get("image")] if body.get("image") else [])
    if not images:
        return jsonify(error="images are required"), 400
    engine, _ = _face_engine()
    results = []
    for idx, item in enumerate(images):
        frame = _decode_image(str(item))
        if frame is None:
            results.append({"index": idx, "face": False, "reason": "invalid_image"})
            continue
        observations = engine.recognize_frame(frame)
        if not observations:
            results.append({"index": idx, "face": False, "reason": "no_face"})
            continue
        best = max(
            observations,
            key=lambda o: (o.face_box[2] - o.face_box[0]) * (o.face_box[3] - o.face_box[1])
            if o.face_box else 0,
        )
        results.append({"index": idx, "face": True, "reason": "ok",
                        "box": list(best.face_box) if best.face_box else None})
    return jsonify(count=len(results), faces=sum(1 for r in results if r["face"]), results=results)


@app.get("/enroll/status")
def enroll_status():
    """How many face vectors are enrolled for a person (BSS worker id)."""
    if not _authorized():
        return jsonify(error="unauthorized"), 401
    person = str(request.args.get("person") or "").strip()
    if not person:
        return jsonify(error="person is required"), 400
    _, db = _face_engine()
    row = db.get_person_by_name(person) if db is not None else None
    enrolled = db.count_embeddings(row[0]) if (db is not None and row) else 0
    return jsonify(person=person, enrolled=enrolled)


if __name__ == "__main__":
    print(f"[controller] listening on 0.0.0.0:{CONTROL_PORT} "
          f"(default source: {DEFAULT_SOURCE})", flush=True)
    app.run(host="0.0.0.0", port=CONTROL_PORT, threaded=True)
