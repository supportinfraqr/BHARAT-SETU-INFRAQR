#!/usr/bin/env python3
"""Local attendance client engine.

Runs on the site laptop. Each camera worker authenticates with its own BSS
camera token; the device token is used only for activation and camera claims.
No video, images or RTSP credentials leave this machine.
"""
import argparse
import base64
import hashlib
import json
import logging
import os
import platform
import shutil
import sqlite3
import sys
import threading
import time
import uuid
from datetime import datetime, time as dt_time, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote, quote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

import cv2
import numpy as np
import requests

try:
    import psutil
except Exception:  # pragma: no cover - detection degrades gracefully
    psutil = None

LOG = logging.getLogger("attendance-engine")
APP_VERSION = "1.5.11"
MODEL_NAME = "ArcFace"
MIN_GPU_MEMORY_MB = 1024
PRESENCE_GAP_SECONDS = 10
QR_COOLDOWN_SECONDS = 60
QR_SCAN_INTERVAL = 0.6
MANUAL_ENROLL_FRAMES = 1
MANUAL_ENROLL_INTERVAL = 0.7
MANUAL_ENROLL_TIMEOUT = 30
MATCH_CONFIRM_FRAMES = 2
MATCH_CONFIRM_WINDOW = 4.0
MODEL_VERSION = "deepface-0.0.101-tf-2.21.0"
DETECTOR_BACKEND = "retinaface"
ARCFACE_SHA = "6336979c0c602cae08d1122a66f4dfb862d059bbcd8ef80306aef2b2249b0c93"
RETINAFACE_SHA = "ecb2393a89da3dd3d6796ad86660e298f62a0c8ae7578d92eb6af14e0bb93adf"
ARCFACE_ONNX_SHA = "5b8809168bc0786d8ed5ef39db888108ad71fedde88e7fd6171326c115bcaa2a"
RETINAFACE_ONNX_SHA = "af90c36b8a5faaf8fa103cfd212bcb5c7e2864d4c0d49a9f0d50027b6add264b"
DEFAULT_BSS = os.environ.get("BSS_EDGE_BASE_URL", "https://login.bharatshramsetu.com")
PORT = int(os.environ.get("BSS_ENGINE_PORT", "8765"))
DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def _now():
    return datetime.now().astimezone()


def _iso(dt):
    return dt.astimezone().isoformat() if dt else None


def _time_value(value):
    text = str(value or "").strip()
    if len(text) != 5 or text[2] != ":":
        return None
    try:
        hour, minute = int(text[:2]), int(text[3:])
    except ValueError:
        return None
    if hour > 23 or minute > 59:
        return None
    return dt_time(hour, minute)


def _day_index(value):
    text = str(value or "").strip().lower()[:3]
    return DAY_NAMES.index(text) if text in DAY_NAMES else None


def schedule_active(camera, when=None):
    if not camera.get("scheduleEnabled") or not camera.get("windows"):
        return True
    when = when or _now()
    try:
        tz = ZoneInfo(camera.get("timezone") or "Asia/Kolkata")
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("Asia/Kolkata")
    local = when.astimezone(tz)
    current = local.time()
    weekday = local.weekday()
    for window in camera.get("windows") or []:
        if not isinstance(window, dict):
            continue
        days = {_day_index(d) for d in (window.get("days") or [])}
        days.discard(None)
        if days and weekday not in days:
            continue
        start = _time_value(window.get("start"))
        end = _time_value(window.get("end"))
        if start is None or end is None:
            continue
        if start <= end:
            if start <= current <= end:
                return True
        elif current >= start or current <= end:
            return True
    return False


def schedule_text(camera):
    if not camera.get("scheduleEnabled"):
        return "24/7"
    windows = camera.get("windows") or []
    if not windows:
        return "No windows configured"
    return "; ".join(
        f"{','.join(w.get('days') or []) or 'All days'} {w.get('start')}–{w.get('end')}"
        for w in windows if isinstance(w, dict)
    )


def _fingerprint():
    raw = f"{platform.node()}|{uuid.getnode()}|{platform.system()}|{platform.machine()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:48]


class BssError(Exception):
    def __init__(self, message, status_code=0, body=None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body or {}


class TakeoverRequired(Exception):
    pass


class Store:
    def __init__(self, home):
        self.home = Path(home)
        self.home.mkdir(parents=True, exist_ok=True)
        self.path = self.home / "client.json"
        self.lock = threading.Lock()
        self.data = self._load()

    def _load(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        data.setdefault("baseUrl", DEFAULT_BSS)
        data.setdefault("fingerprint", _fingerprint())
        data.setdefault("token", "")
        data.setdefault("deviceId", "")
        data.setdefault("sites", [])
        data.setdefault("deviceName", "")
        data.setdefault("employerName", "")
        data.setdefault("cameras", {})
        data.setdefault("bssCameras", {})
        data.setdefault("outbox", [])
        return data

    def save(self):
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
            tmp.replace(self.path)


class ResourceGate:
    def __init__(self, limit=2):
        self.lock = threading.Lock()
        self.limit = max(1, int(limit))
        self.active = 0

    def set_limit(self, limit):
        with self.lock:
            self.limit = max(1, int(limit))

    def acquire(self):
        with self.lock:
            if self.active >= self.limit:
                return False
            self.active += 1
            return True

    def release(self):
        with self.lock:
            self.active = max(0, self.active - 1)


class LocalEventStore:
    """Durable local event log; survives restarts, logout and internet loss."""

    def __init__(self, home):
        self.path = Path(home) / "events.db"
        self.lock = threading.Lock()
        with self.lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS local_events (
                            id TEXT PRIMARY KEY,
                            camera_id INTEGER NOT NULL,
                            occurred_at TEXT NOT NULL,
                            payload TEXT NOT NULL,
                            sync_status TEXT NOT NULL DEFAULT 'PENDING',
                            last_error TEXT NOT NULL DEFAULT '',
                            created_at TEXT NOT NULL,
                            synced_at TEXT
                        )
                    """)
                    conn.execute("CREATE INDEX IF NOT EXISTS local_events_status ON local_events(sync_status, occurred_at)")
            finally:
                conn.close()

    def _connect(self):
        return sqlite3.connect(str(self.path), timeout=15)

    def add(self, event):
        event_id = str(event.get("eventId") or "").strip()
        if not event_id:
            return
        with self.lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute(
                        "INSERT OR IGNORE INTO local_events(id, camera_id, occurred_at, payload, created_at) VALUES(?,?,?,?,?)",
                        (event_id, int(event.get("cameraId") or 0), str(event.get("occurredAt") or ""),
                         json.dumps(event, separators=(",", ":")), _now().isoformat()),
                    )
            finally:
                conn.close()

    def pending(self):
        with self.lock:
            conn = self._connect()
            try:
                rows = conn.execute(
                    "SELECT id, payload FROM local_events WHERE sync_status='PENDING' ORDER BY occurred_at"
                ).fetchall()
            finally:
                conn.close()
        return [(row[0], json.loads(row[1])) for row in rows]

    def count(self):
        with self.lock:
            conn = self._connect()
            try:
                return int(conn.execute("SELECT COUNT(*) FROM local_events WHERE sync_status='PENDING'").fetchone()[0])
            finally:
                conn.close()

    def mark(self, ids, status="SYNCED", error=""):
        ids = [str(i) for i in ids if i]
        if not ids:
            return
        with self.lock:
            conn = self._connect()
            try:
                with conn:
                    conn.executemany(
                        "UPDATE local_events SET sync_status=?, last_error=?, synced_at=? WHERE id=?",
                        [(status, error[:500], _now().isoformat(), event_id) for event_id in ids],
                    )
            finally:
                conn.close()

    def recent(self, limit=25):
        with self.lock:
            conn = self._connect()
            try:
                rows = conn.execute(
                    "SELECT id, camera_id, occurred_at, sync_status, last_error FROM local_events "
                    "ORDER BY occurred_at DESC LIMIT ?", (int(limit),)
                ).fetchall()
            finally:
                conn.close()
        return [{"eventId": r[0], "cameraId": r[1], "occurredAt": r[2],
                 "syncStatus": r[3], "lastError": r[4]} for r in rows]

    def prune(self, keep_days=7):
        cutoff = (_now() - timedelta(days=keep_days)).isoformat()
        with self.lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute("DELETE FROM local_events WHERE sync_status != 'PENDING' AND occurred_at < ?", (cutoff,))
            finally:
                conn.close()


class FaceGallery:
    """Versioned local worker gallery used for on-device matching."""

    def __init__(self, payload=None):
        payload = payload or {}
        self.version = str(payload.get("galleryVersion") or "")
        self.model = str(payload.get("model") or MODEL_NAME)
        self.model_version = str(payload.get("version") or MODEL_VERSION)
        self.threshold = float(payload.get("threshold") or 0.48)
        self.margin = float(payload.get("margin") or 0.12)
        self.topk = max(1, int(payload.get("topk") or 3))
        self.votes = max(1, int(payload.get("votes") or 2))
        self.weights_sha = str(payload.get("weightsSha") or ARCFACE_SHA)
        self.entries = []  # (site_id, bss_worker_id, source, float32 embedding)
        self.profiles = {}
        self.worker_status = []
        for worker in payload.get("workerStatus") or []:
            worker_id = str(worker.get("bssWorkerId") or "").strip().upper()
            if not worker_id:
                continue
            site_ids = [int(site) for site in (worker.get("siteIds") or []) if str(site).isdigit()]
            self.worker_status.append({
                "bssWorkerId": worker_id,
                "name": str(worker.get("name") or worker_id),
                "siteIds": site_ids,
                "matchSource": str(worker.get("matchSource") or "SELF").upper(),
                "manualCount": int(worker.get("manualCount") or 0),
                "selfCount": int(worker.get("selfCount") or 0),
                "embeddingCount": int(worker.get("embeddingCount") or 0),
                "hasManual": bool(worker.get("hasManual")),
                "hasSelf": bool(worker.get("hasSelf")),
                "hasFaceData": bool(worker.get("hasFaceData")),
                "lastManualCaptureAt": str(worker.get("lastManualCaptureAt") or ""),
            })
        for worker in payload.get("workers") or []:
            worker_id = str(worker.get("bssWorkerId") or "").strip().upper()
            if not worker_id:
                continue
            site_ids = [int(site) for site in (worker.get("siteIds") or []) if str(site).isdigit()]
            match_source = str(worker.get("matchSource") or "SELF").upper()
            self.profiles[worker_id] = {
                "bssWorkerId": worker_id,
                "name": str(worker.get("name") or ""),
                "siteIds": site_ids,
                "matchSource": match_source,
                "manualCount": int(worker.get("manualCount") or 0),
                "selfCount": int(worker.get("selfCount") or 0),
            }
            groups = []
            if worker.get("manualEmbeddings") is not None or worker.get("selfEmbeddings") is not None:
                groups.append(("MANUAL", worker.get("manualEmbeddings") or []))
                groups.append(("SELF", worker.get("selfEmbeddings") or []))
            else:
                # Compatibility with pre-source gallery payloads.
                groups.append(("SELF", worker.get("embeddings") or []))
            for source, vectors in groups:
                for encoded in vectors:
                    try:
                        raw = base64.b64decode(str(encoded))
                        vector = np.frombuffer(raw, dtype=np.float32)
                    except Exception:
                        continue
                    if vector.size != 512:
                        continue
                    norm = float(np.linalg.norm(vector))
                    if norm <= 0:
                        continue
                    for site_id in site_ids:
                        self.entries.append((site_id, worker_id, source, vector / norm))

    @property
    def ready(self):
        return bool(self.entries and self.model_version == MODEL_VERSION)

    def profile(self, worker_id):
        worker_id = str(worker_id or "").strip().upper()
        return self.profiles.get(worker_id) or {"bssWorkerId": worker_id, "name": worker_id, "siteIds": []}

    def match(self, embedding, site_id):
        if not self.ready:
            return None
        try:
            site_id = int(site_id)
        except (TypeError, ValueError):
            return None
        vector = np.asarray(embedding, dtype=np.float32)
        norm = float(np.linalg.norm(vector))
        if norm <= 0:
            return None
        vector = vector / norm
        by_worker = {}
        for entry_site, worker_id, source, stored in self.entries:
            if entry_site != site_id:
                continue
            preferred = str((self.profiles.get(worker_id) or {}).get("matchSource") or "SELF").upper()
            if preferred == "MANUAL" and source != "MANUAL":
                continue
            if preferred != "MANUAL" and source != "SELF":
                continue
            denom = float(np.linalg.norm(stored))
            if denom <= 0:
                continue
            distance = 1.0 - float(np.dot(stored, vector) / denom)
            by_worker.setdefault(worker_id, []).append(distance)
        ranked, short = [], None
        for worker_id, distances in by_worker.items():
            distances.sort()
            required = min(self.votes, len(distances))
            votes = sum(1 for distance in distances[:self.topk] if distance <= self.threshold)
            if votes >= required:
                ranked.append((worker_id, distances[0]))
            elif distances[0] <= self.threshold and short is None:
                short = distances[0]
        if not ranked:
            return None
        ranked.sort(key=lambda item: item[1])
        worker_id, distance = ranked[0]
        runner = ranked[1][1] if len(ranked) > 1 else None
        if distance > self.threshold:
            return None
        if runner is not None and runner - distance < self.margin:
            return None
        return worker_id, distance


def _load_gallery(path):
    try:
        return FaceGallery(json.loads(Path(path).read_text(encoding="utf-8")))
    except (OSError, ValueError, TypeError):
        return FaceGallery()


class CameraWorker:
    def __init__(self, engine, camera_id, label):
        self.engine = engine
        self.camera_id = int(camera_id)
        self.label = label
        self.lock = threading.Lock()
        self.mode = "LIVE"
        self.rtsp = ""
        self.camera_token = ""
        self.status = "NO_RTSP"
        self.fps = 0.0
        self._frame = None
        self._jpeg = None
        self._running = False
        self._cap = None
        self._thread = None
        self._ai_thread = None
        self._match_streaks = {}
        self._presence = {}
        self._qr_detector = cv2.QRCodeDetector()
        self._last_qr = {}
        self._last_qr_scan = 0.0
        self._qr_meta = []
        self._last_embedding = None
        self._face_boxes = []
        self._face_meta = []
        self.frames_seen = 0
        self.frames_processed = 0
        self.faces_detected = 0
        self._frame_seq = 0
        self._last_ai_seq = -1

    def snapshot(self):
        with self.lock:
            return {
                "cameraId": self.camera_id,
                "label": self.label,
                "rtspConfigured": bool(self.rtsp),
                "mode": self.mode,
                "status": self.status,
                "fps": round(self.fps, 1),
                "tokenConfigured": bool(self.camera_token),
                "lastEventAt": _iso(self.engine.last_event_at.get(self.camera_id)),
                "faceCount": len(self._face_boxes),
                "framesSeen": self.frames_seen,
                "framesProcessed": self.frames_processed,
                "facesDetected": self.faces_detected,
            }

    def set_rtsp(self, rtsp):
        rtsp = str(rtsp or "").strip()
        if rtsp and not (rtsp.lower().startswith("rtsp://") or rtsp.lower().startswith("rtsps://")):
            raise ValueError("Only RTSP URLs are supported.")
        self.stop()
        self.rtsp = rtsp
        self.engine.local_camera(self.camera_id)["rtsp"] = rtsp
        self.engine.store.save()
        if rtsp:
            self.start()
        else:
            self.status = "NO_RTSP"

    def set_mode(self, mode):
        mode = str(mode or "").upper()
        if mode not in ("LIVE", "SENDING"):
            raise ValueError("Mode must be LIVE or SENDING.")
        if self.mode == "SENDING" and mode != "SENDING":
            self.close_presence_sessions("mode_changed")
        with self.lock:
            self.mode = mode
        self.engine.local_camera(self.camera_id)["mode"] = mode
        self.engine.store.save()
        if mode == "SENDING":
            self._ensure_ai()
        LOG.info("Camera %s mode=%s", self.label, mode)

    def start(self):
        if not self.rtsp:
            self.status = "NO_RTSP"
            return
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self.close_presence_sessions("camera_stopped")
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)
        self._thread = None
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None
        self.status = "STOPPED"

    def _open(self):
        cap = cv2.VideoCapture(self.rtsp, cv2.CAP_FFMPEG)
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        if not cap.isOpened():
            cap.release()
            return None
        return cap

    def _loop(self):
        failures = 0
        while self._running:
            if self._cap is None:
                self.status = "CONNECTING"
                self._cap = self._open()
                if self._cap is None:
                    failures += 1
                    self.status = "RECONNECTING"
                    time.sleep(min(15, 2 + failures * 2))
                    continue
                failures = 0
            started = time.time()
            ok, frame = self._cap.read()
            if not ok or frame is None:
                self.status = "RECONNECTING"
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
                time.sleep(2)
                continue
            with self.lock:
                self.frames_seen += 1
                self._frame_seq += 1
                self._frame = frame
                encoded, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 72])
                if encoded:
                    self._jpeg = buf.tobytes()
                elapsed = max(0.001, time.time() - started)
                self.fps = 0.85 * self.fps + 0.15 * (1.0 / elapsed) if self.fps else 1.0 / elapsed
                self.status = "ONLINE"

    def _set_face_boxes(self, boxes):
        with self.lock:
            self._face_boxes = [tuple(box) for box in boxes]
            self._face_meta = [{
                "box": list(box), "name": "", "bssWorkerId": "",
                "matchScore": None, "matched": False, "pending": True,
            } for box in boxes]
            self.faces_detected += len(boxes)

    def _set_face_meta(self, index, name, bss_worker_id, score, matched):
        with self.lock:
            if 0 <= index < len(self._face_meta):
                self._face_meta[index].update({
                    "name": str(name or ""),
                    "bssWorkerId": str(bss_worker_id or ""),
                    "matchScore": score,
                    "matched": bool(matched),
                    "pending": False,
                })

    def _send_presence(self, matched_worker, session, phase, when, distance, face_box=None):
        presence = {
            "sessionId": session["sessionId"],
            "presencePhase": phase,
            "presenceStartedAt": _iso(session["startedAt"]),
        }
        if phase == "END":
            presence["presenceEndedAt"] = _iso(session["lastSeenAt"])
            presence["dwellSeconds"] = int(max(0, round(session["lastSeenTs"] - session["startedTs"])))
        else:
            presence["dwellSeconds"] = 0
        self.engine.send_event(self, matched_worker, when, distance, face_box, presence=presence)

    def _open_presence(self, matched_worker, when, now_ts, distance, face_box=None):
        session = {
            "sessionId": str(uuid.uuid4()),
            "startedAt": when,
            "startedTs": now_ts,
            "lastSeenAt": when,
            "lastSeenTs": now_ts,
            "lastDistance": float(distance),
        }
        self._presence[matched_worker] = session
        self._send_presence(matched_worker, session, "START", when, distance, face_box)

    def _touch_presence(self, matched_worker, when, now_ts, distance):
        session = self._presence.get(matched_worker)
        if session is None:
            return False
        session["lastSeenAt"] = when
        session["lastSeenTs"] = now_ts
        session["lastDistance"] = float(distance)
        return True

    def _close_presence(self, matched_worker, reason="gap"):
        session = self._presence.pop(matched_worker, None)
        if session is None:
            return
        duration = int(max(0, round(session["lastSeenTs"] - session["startedTs"])))
        self._send_presence(matched_worker, session, "END", session["lastSeenAt"],
                            session["lastDistance"])
        LOG.info("Camera %s presence closed for %s after %ss (%s)",
                 self.label, matched_worker, duration, reason)

    def close_presence_sessions(self, reason="stopped"):
        for matched_worker in list(self._presence.keys()):
            self._close_presence(matched_worker, reason)

    def _scan_qr(self, frame, when):
        now_ts = time.time()
        if now_ts - self._last_qr_scan < QR_SCAN_INTERVAL:
            return
        self._last_qr_scan = now_ts
        try:
            text, points, _straight = self._qr_detector.detectAndDecode(frame)
        except Exception:
            return
        text = str(text or "").strip()
        if not text:
            return
        try:
            payload = json.loads(text)
        except (TypeError, ValueError):
            return
        if not isinstance(payload, dict):
            return
        if str(payload.get("type") or "").upper() != "BSS_WORKER":
            return
        if str(payload.get("issuer") or "") != "Bharat Shram Setu":
            return
        bss_worker_id = str(payload.get("bssId") or "").strip().upper()
        if not bss_worker_id:
            return
        box = None
        if points is not None:
            try:
                corners = np.asarray(points, dtype=np.float32).reshape(-1, 2)
                x, y, w, h = cv2.boundingRect(corners.astype(np.int32))
                if w > 0 and h > 0:
                    box = [int(x), int(y), int(w), int(h)]
            except Exception:
                box = None
        self._set_qr_meta(bss_worker_id, box, now_ts)
        if now_ts - float(self._last_qr.get(bss_worker_id) or 0) < QR_COOLDOWN_SECONDS:
            return
        self._last_qr[bss_worker_id] = now_ts
        self.engine.send_qr_event(self, bss_worker_id, when)

    def _set_qr_meta(self, bss_worker_id, box, seen_at):
        with self.lock:
            self._qr_meta = [{
                "box": list(box or [0, 0, 0, 0]),
                "name": "QR scan",
                "bssWorkerId": str(bss_worker_id or ""),
                "matchScore": 100.0,
                "matched": True,
                "pending": False,
                "qr": True,
                "seenAt": float(seen_at),
            }]

    def detection_rows(self):
        now_ts = time.time()
        with self.lock:
            rows = [dict(item) for item in self._face_meta]
            rows.extend(
                dict(item) for item in self._qr_meta
                if now_ts - float(item.get("seenAt") or 0) <= 10.0
            )
        return rows

    def frame(self):
        with self.lock:
            return None if self._frame is None else self._frame.copy()

    def jpeg(self):
        now_ts = time.time()
        with self.lock:
            meta = [dict(item) for item in self._face_meta]
            qr_meta = [dict(item) for item in self._qr_meta
                       if now_ts - float(item.get("seenAt") or 0) <= 10.0]
            boxes = list(self._face_boxes)
            frame = None if self._frame is None else self._frame.copy()
            raw = self._jpeg
        if frame is None:
            return raw
        if not meta and boxes:
            meta = [{"box": list(box), "name": "", "bssWorkerId": "",
                     "matchScore": None, "matched": False, "pending": True} for box in boxes]
        if not meta and not qr_meta:
            return raw
        for item in meta:
            box = item.get("box") or [0, 0, 0, 0]
            x, y, w, h = [int(v) for v in box[:4]]
            matched = bool(item.get("matched"))
            color = (60, 190, 100) if matched else (130, 140, 155)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            name = str(item.get("name") or "Checking").strip()
            bss_id = str(item.get("bssWorkerId") or "").strip()
            score = item.get("matchScore")
            label = name
            if bss_id:
                label += f" · {bss_id}"
            if score is not None:
                label += f" · {float(score):.0f}%"
            label = label.encode("ascii", "replace").decode("ascii")
            if len(label) > 48:
                label = label[:47] + "…"
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale, thickness = 0.45, 1
            (text_w, text_h), _ = cv2.getTextSize(label, font, scale, thickness)
            top = max(0, y - text_h - 8)
            cv2.rectangle(frame, (x, top), (x + text_w + 6, top + text_h + 6), color, -1)
            cv2.putText(frame, label, (x + 3, top + text_h + 2), font, scale,
                        (255, 255, 255), thickness, cv2.LINE_AA)
        for item in qr_meta:
            box = item.get("box") or [0, 0, 0, 0]
            x, y, w, h = [int(v) for v in box[:4]]
            if w <= 0 or h <= 0:
                continue
            color = (0, 165, 255)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            bss_id = str(item.get("bssWorkerId") or "").strip()
            label = f"QR | {bss_id}" if bss_id else "QR scan"
            label = label.encode("ascii", "replace").decode("ascii")
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale, thickness = 0.45, 1
            (text_w, text_h), _ = cv2.getTextSize(label, font, scale, thickness)
            top = max(0, y - text_h - 8)
            cv2.rectangle(frame, (x, top), (x + text_w + 6, top + text_h + 6), color, -1)
            cv2.putText(frame, label, (x + 3, top + text_h + 2), font, scale,
                        (255, 255, 255), thickness, cv2.LINE_AA)
        encoded, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 72])
        return buf.tobytes() if encoded else raw

    def _ensure_ai(self):
        if self._ai_thread and self._ai_thread.is_alive():
            return
        self._ai_thread = threading.Thread(target=self._ai_loop, daemon=True)
        self._ai_thread.start()

    def _ai_loop(self):
        """Process the latest queued frame continuously; oldest frames are skipped."""
        while self._running or self.mode == "SENDING":
            if self.mode != "SENDING" or not self.camera_token:
                time.sleep(1)
                continue
            with self.lock:
                seq = self._frame_seq
                if seq == self._last_ai_seq:
                    frame = None
                else:
                    self._last_ai_seq = seq
                    frame = None if self._frame is None else self._frame.copy()
            if frame is None:
                time.sleep(0.02)
                continue
            if not self.engine.send_allowed(self):
                self.close_presence_sessions("not_sendable")
                time.sleep(2)
                continue
            camera = self.engine.bss_cameras.get(self.camera_id) or {}
            attendance_mode = str(camera.get("attendanceMode") or "FACE").upper()
            if attendance_mode not in ("FACE", "QR", "BOTH"):
                attendance_mode = "FACE"
            if attendance_mode != "FACE":
                self.close_presence_sessions("camera_mode")
            # QR is independent of the face/GPU pipeline. Scan before the GPU
            # gate so a CPU-only machine (or "Require GPU" with no provider)
            # still records QR attendance.
            if attendance_mode in ("QR", "BOTH"):
                self._scan_qr(frame, _now())
            if attendance_mode == "QR":
                continue
            if attendance_mode in ("FACE", "BOTH") and not self.engine.gallery.ready:
                if attendance_mode == "FACE":
                    time.sleep(1)
                    continue
            if attendance_mode in ("FACE", "BOTH"):
                self.engine.configure_gpu()
                if (str(self.engine.resource_settings.get("gpuMode") or "auto") == "required"
                        and not self.engine.gpu_status.get("active")):
                    if self.status != "GPU_REQUIRED_UNAVAILABLE":
                        self.status = "GPU_REQUIRED_UNAVAILABLE"
                    time.sleep(5)
                    continue
            if not self.engine.gate.acquire():
                time.sleep(0.05)
                continue
            try:
                with self.lock:
                    self.frames_processed += 1
                camera = self.engine.bss_cameras.get(self.camera_id) or {}
                site_id = camera.get("siteId")
                when = _now()
                frame_ts = time.time()
                if attendance_mode == "QR" or not self.engine.gallery.ready:
                    continue
                detections = self._recognise(frame)
                seen_workers = set()
                for index, (embedding, box) in enumerate(detections):
                    match = self.engine.gallery.match(embedding, site_id)
                    if match is None:
                        self._set_face_meta(index, "Unknown", "", None, False)
                        continue
                    matched_worker, distance = match
                    profile = self.engine.gallery.profile(matched_worker)
                    score = round(max(0.0, min(100.0, (1.0 - float(distance)) * 100.0)), 1)
                    self._set_face_meta(index, profile.get("name") or matched_worker,
                                        matched_worker, score, True)
                    # Keep an already-open session alive even if the worker
                    # briefly drops below the two-frame confirmation streak.
                    if self._touch_presence(matched_worker, when, frame_ts, distance):
                        seen_workers.add(matched_worker)
                        continue
                    previous = self._match_streaks.get(matched_worker) or {}
                    count = 1
                    if previous and frame_ts - float(previous.get("last") or 0) <= MATCH_CONFIRM_WINDOW:
                        count = int(previous.get("count") or 0) + 1
                    self._match_streaks[matched_worker] = {"count": count, "last": frame_ts}
                    if count < MATCH_CONFIRM_FRAMES:
                        continue
                    self._open_presence(matched_worker, when, frame_ts, distance, box)
                    seen_workers.add(matched_worker)
                for matched_worker in list(self._presence.keys()):
                    session = self._presence.get(matched_worker)
                    if matched_worker in seen_workers or session is None:
                        continue
                    if frame_ts - float(session["lastSeenTs"]) >= PRESENCE_GAP_SECONDS:
                        self._close_presence(matched_worker, "gap")
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Face processing failed for %s: %s", self.label, exc)
            finally:
                self.engine.gate.release()

    def _recognise(self, frame):
        """Return every quality face in the frame: [(embedding, [x,y,w,h]), ...]."""
        self.engine.configure_gpu()
        backend = self.engine.face_backend
        if backend is not None and backend.ready:
            detections = backend.recognise(frame)
            self._set_face_boxes([box for _, box in detections])
            return detections

        try:
            import importlib
            DeepFace = importlib.import_module("deepface").DeepFace
        except Exception as exc:  # noqa: BLE001
            LOG.warning("No face backend available: %s", exc)
            return []

        reps = DeepFace.represent(
            img_path=frame, model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False, align=True,
        )
        detections, boxes = [], []
        height, width = frame.shape[:2]
        for rep in reps or []:
            area = rep.get("facial_area") or {}
            x, y = int(area.get("x", 0)), int(area.get("y", 0))
            w, h = int(area.get("w", 0)), int(area.get("h", 0))
            if min(w, h) < 60:
                continue
            x1, y1 = max(0, x), max(0, y)
            x2, y2 = min(width, x + w), min(height, y + h)
            if x2 <= x1 or y2 <= y1:
                continue
            gray = cv2.cvtColor(frame[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
            if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 15:
                continue
            embedding = np.asarray(rep.get("embedding") or [], dtype=np.float32)
            if embedding.size != 512 or float(np.linalg.norm(embedding)) <= 0:
                continue
            detections.append((embedding, [x, y, w, h]))
            boxes.append((x, y, w, h))
        self._set_face_boxes(boxes)
        return detections

    def manual_detections(self):
        """Return the latest frame and all detected faces for manual enrollment."""
        if not self.rtsp:
            raise ValueError("This camera has no RTSP stream.")
        if not self._running:
            self.start()
        deadline = time.time() + 4.0
        while time.time() < deadline:
            frame = self.frame()
            if frame is not None:
                break
            time.sleep(0.15)
        else:
            raise ValueError("Waiting for the camera frame. Check the RTSP stream.")
        if not self.engine.gate.acquire():
            raise ValueError("The face engine is busy. Try again in a moment.")
        try:
            return frame, self._recognise(frame)
        finally:
            self.engine.gate.release()

    def capture_manual_single(self):
        """Capture exactly one face frame; reject zero or multiple faces."""
        frame, detections = self.manual_detections()
        count = len(detections)
        if count == 0:
            raise ValueError("No face detected. Position the worker inside the frame.")
        if count > 1:
            raise ValueError("Multiple people detected. Only one person is allowed in the frame.")
        embedding, box = detections[0]
        x, y, w, h = [int(v) for v in (box or [0, 0, 0, 0])[:4]]
        if min(w, h) < 60:
            raise ValueError("The face is too small. Move closer to the camera.")
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if blur < 15:
            raise ValueError("The face is blurry. Hold still and try again.")
        preview_frame = frame
        max_width = 420
        if preview_frame.shape[1] > max_width:
            scale = max_width / float(preview_frame.shape[1])
            preview_frame = cv2.resize(preview_frame, (max_width, max(1, int(preview_frame.shape[0] * scale))))
        encoded, buf = cv2.imencode(".jpg", preview_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
        if not encoded:
            raise ValueError("Could not prepare this camera frame.")
        vector = np.asarray(embedding, dtype=np.float32)
        norm = float(np.linalg.norm(vector))
        if vector.size != 512 or norm <= 0:
            raise ValueError("Could not generate a valid face embedding. Try again.")
        return {
            "vector": vector / norm,
            "preview": "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii"),
            "quality": {"width": w, "height": h, "blur": round(blur, 1)},
        }


class Engine:
    def __init__(self, home):
        self.store = Store(home)
        self.lock = threading.RLock()
        self.bss = str(self.store.data.get("baseUrl") or DEFAULT_BSS).rstrip("/")
        self.token = str(self.store.data.get("token") or "")
        self.device_id = str(self.store.data.get("deviceId") or "")
        self.sites = self.store.data.get("sites") or []
        self.device_name = str(self.store.data.get("deviceName") or "")
        self.employer_name = str(self.store.data.get("employerName") or "")
        self.bss_cameras = {}
        for key, camera in (self.store.data.get("bssCameras") or {}).items():
            try:
                self.bss_cameras[int(key)] = camera
            except (TypeError, ValueError):
                continue
        self.workers = {}
        self.last_heartbeat = None
        self.last_heartbeat_source = ""
        self.last_device_heartbeat = None
        self.last_device_heartbeat_error = ""
        self.last_event_at = {}
        self.home_dir = Path(home)
        self._metric_prev = {}
        self._storage_cache = (0.0, {})
        self._process = psutil.Process() if psutil is not None else None
        self.gate = ResourceGate(2)
        self.resource_settings = self._normalise_resources(self.store.data.get("resources") or {})
        self._gpu_configured = False
        self.face_backend = None
        self._manual_captures = {}
        self._manual_capture_lock = threading.Lock()
        self.gpu_status = {"active": False, "mode": self.resource_settings.get("gpuMode", "auto"),
                           "devices": [], "message": "Not initialised"}
        self._apply_resources(self.resource_settings, persist=False)
        self.events = LocalEventStore(home)
        self.gallery_path = Path(home) / "face_gallery.json"
        self.gallery = _load_gallery(self.gallery_path)
        for legacy in list(self.store.data.get("outbox") or []):
            if isinstance(legacy, dict):
                self.events.add(legacy)
        if self.store.data.get("outbox"):
            self.store.data["outbox"] = []
            self.store.save()
        self._stop = threading.Event()
        self._load_cameras()
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
        self._config_thread = threading.Thread(target=self._config_loop, daemon=True)
        self._config_thread.start()

    def _load_cameras(self):
        for key, camera in (self.store.data.get("cameras") or {}).items():
            try:
                cid = int(camera.get("cameraId") or key)
            except (TypeError, ValueError):
                continue
            worker = CameraWorker(self, cid, str(camera.get("label") or f"Camera {cid}"))
            worker.rtsp = str(camera.get("rtsp") or "")
            worker.mode = str(camera.get("mode") or "LIVE").upper()
            worker.camera_token = str(camera.get("cameraToken") or "")
            if worker.mode not in ("LIVE", "SENDING"):
                worker.mode = "LIVE"
            self.workers[cid] = worker
            if worker.rtsp:
                worker.start()
            if worker.mode == "SENDING" and worker.camera_token:
                worker._ensure_ai()

    def local_camera(self, camera_id):
        key = str(camera_id)
        data = self.store.data.setdefault("cameras", {}).setdefault(key, {})
        data["cameraId"] = int(camera_id)
        return data

    def _headers(self):
        return {"X-Edge-Token": self.token, "Content-Type": "application/json"}

    def _camera_headers(self, worker):
        return {"X-Camera-Token": worker.camera_token, "Content-Type": "application/json"}

    def bss_call(self, method, path, payload=None, timeout=20, camera_token=None):
        if camera_token is None and not self.token:
            raise BssError("Client is not activated.", 401)
        headers = ({"X-Camera-Token": camera_token, "Content-Type": "application/json"}
                   if camera_token else self._headers())
        url = f"{self.bss}{path}"
        try:
            response = requests.request(method, url, headers=headers, json=payload, timeout=timeout)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        try:
            body = response.json()
        except ValueError:
            body = {}
        if not response.ok:
            raise BssError(body.get("error") or f"BSS returned {response.status_code}.",
                           response.status_code, body)
        return body

    def request_otp(self, phone):
        url = f"{self.bss}/v1/edge/activate/request-otp"
        try:
            response = requests.post(url, json={"phone": phone}, timeout=20)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        body = response.json() if response.content else {}
        if not response.ok:
            raise BssError(body.get("error") or "Could not send OTP.", response.status_code, body)
        return body

    def verify_otp(self, phone, otp):
        url = f"{self.bss}/v1/edge/activate/verify-otp"
        try:
            response = requests.post(url, json={"phone": phone, "otp": otp}, timeout=20)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        body = response.json() if response.content else {}
        if not response.ok:
            raise BssError(body.get("error") or "OTP verification failed.", response.status_code, body)
        return body.get("data") or {}

    def activate(self, activation_token, device_name):
        url = f"{self.bss}/v1/edge/activate/complete"
        payload = {
            "activationToken": activation_token,
            "deviceFingerprint": self.store.data.get("fingerprint"),
            "deviceName": device_name or platform.node(), "version": APP_VERSION,
        }
        try:
            response = requests.post(url, json=payload, timeout=30)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        body = response.json() if response.content else {}
        if not response.ok:
            raise BssError(body.get("error") or "Activation failed.", response.status_code, body)
        data = body.get("data") or {}
        with self.lock:
            self.token = data.get("token") or ""
            self.device_id = data.get("deviceId") or ""
            self.device_name = str(data.get("deviceName") or device_name or "")
            self.employer_name = str(data.get("employerName") or "")
            self.store.data.update({"token": self.token, "deviceId": self.device_id,
                                    "deviceName": self.device_name, "employerName": self.employer_name})
            self.store.save()
        self.refresh_config()
        try:
            self._send_device_heartbeat()
        except BssError:
            pass
        return self.status()

    def _rate(self, key, value, now):
        previous = self._metric_prev.get(key)
        self._metric_prev[key] = (now, value)
        if previous is None or now <= previous[0] or value is None or previous[1] is None:
            return 0.0
        if value < previous[1]:
            return 0.0
        return round((value - previous[1]) / (now - previous[0]), 1)

    def _engine_storage(self):
        now = time.time()
        cached_at, cached = self._storage_cache
        if cached and now - cached_at < 60:
            return dict(cached)
        total = models = 0
        try:
            for path in self.home_dir.rglob("*"):
                try:
                    if path.is_symlink() or not path.is_file():
                        continue
                    size = path.stat().st_size
                    total += size
                    rel = path.relative_to(self.home_dir)
                    if len(rel.parts) >= 3 and rel.parts[0] == ".deepface" and rel.parts[1] == "weights":
                        models += size
                except (OSError, ValueError):
                    continue
        except OSError:
            pass
        data = {
            "engineStorageMb": round(total / (1024 * 1024), 1),
            "engineModelMb": round(models / (1024 * 1024), 1),
            "engineDataMb": round((total - models) / (1024 * 1024), 1),
        }
        self._storage_cache = (now, data)
        return dict(data)

    def _detected_system(self):
        now = time.time()
        cpu_count = (psutil.cpu_count(logical=True) if psutil else os.cpu_count()) or 1
        result = {
            "cpuCores": int(cpu_count),
            "cpuPhysicalCores": None,
            "cpuPercent": None,
            "load1": None,
            "load5": None,
            "load15": None,
            "memoryTotalMb": None,
            "memoryUsedMb": None,
            "memoryAvailableMb": None,
            "memoryPercent": None,
            "swapTotalMb": None,
            "swapUsedMb": None,
            "diskTotalMb": None,
            "diskUsedMb": None,
            "diskFreeMb": None,
            "diskPercent": None,
            "netSentBytes": None,
            "netRecvBytes": None,
            "netSentRate": 0.0,
            "netRecvRate": 0.0,
            "diskReadBytes": None,
            "diskWriteBytes": None,
            "diskReadRate": 0.0,
            "diskWriteRate": 0.0,
            "processCpuPercent": None,
            "processThreads": None,
            "processMemoryMb": None,
            "processMemoryPercent": None,
            "processVmsMb": None,
            "processUptimeSeconds": None,
            "processReadBytes": None,
            "processWriteBytes": None,
            "processReadRate": 0.0,
            "processWriteRate": 0.0,
            "cpuAffinityCores": int(cpu_count),
            "engineStorageMb": None,
            "engineModelMb": None,
            "engineDataMb": None,
            "platform": platform.system(),
            "machine": platform.machine(),
        }
        if psutil is None:
            return result
        try:
            result["cpuPhysicalCores"] = psutil.cpu_count(logical=False)
        except Exception:
            pass
        try:
            load = psutil.getloadavg()
            result["load1"], result["load5"], result["load15"] = (round(float(v), 2) for v in load)
        except Exception:
            pass
        try:
            result["cpuPercent"] = round(float(psutil.cpu_percent(interval=None)), 1)
        except Exception:
            pass
        try:
            memory = psutil.virtual_memory()
            total = round(memory.total / (1024 * 1024))
            available = round(memory.available / (1024 * 1024))
            result["memoryTotalMb"] = total
            result["memoryAvailableMb"] = available
            result["memoryUsedMb"] = max(0, total - available)
            result["memoryPercent"] = round((max(0, total - available) / total) * 100, 1) if total else None
            swap = psutil.swap_memory()
            result["swapTotalMb"] = round(swap.total / (1024 * 1024))
            result["swapUsedMb"] = round(swap.used / (1024 * 1024))
        except Exception:
            pass
        try:
            disk = psutil.disk_usage(str(self.home_dir))
            total = round(disk.total / (1024 * 1024))
            used = round(disk.used / (1024 * 1024))
            result["diskTotalMb"] = total
            result["diskUsedMb"] = used
            result["diskFreeMb"] = round(disk.free / (1024 * 1024))
            result["diskPercent"] = round(disk.percent, 1)
        except Exception:
            pass
        try:
            net = psutil.net_io_counters()
            result["netSentBytes"] = int(net.bytes_sent)
            result["netRecvBytes"] = int(net.bytes_recv)
            result["netSentRate"] = self._rate("net_sent", net.bytes_sent, now)
            result["netRecvRate"] = self._rate("net_recv", net.bytes_recv, now)
        except Exception:
            pass
        try:
            disk_io = psutil.disk_io_counters()
            if disk_io is not None:
                result["diskReadBytes"] = int(disk_io.read_bytes)
                result["diskWriteBytes"] = int(disk_io.write_bytes)
                result["diskReadRate"] = self._rate("disk_read", disk_io.read_bytes, now)
                result["diskWriteRate"] = self._rate("disk_write", disk_io.write_bytes, now)
        except Exception:
            pass
        try:
            process = self._process or psutil.Process()
            try:
                result["processCpuPercent"] = round(float(process.cpu_percent(interval=None)), 1)
            except Exception:
                pass
            try:
                result["processThreads"] = int(process.num_threads())
            except Exception:
                pass
            try:
                info = process.memory_info()
                result["processMemoryMb"] = round(info.rss / (1024 * 1024), 1)
                result["processVmsMb"] = round(info.vms / (1024 * 1024), 1)
                result["processMemoryPercent"] = round(float(process.memory_percent()), 1)
            except Exception:
                pass
            try:
                result["processUptimeSeconds"] = int(max(0, now - process.create_time()))
            except Exception:
                pass
            try:
                io = process.io_counters()
                if io is not None:
                    result["processReadBytes"] = int(io.read_bytes)
                    result["processWriteBytes"] = int(io.write_bytes)
                    result["processReadRate"] = self._rate("process_read", io.read_bytes, now)
                    result["processWriteRate"] = self._rate("process_write", io.write_bytes, now)
            except Exception:
                pass
            try:
                affinity = process.cpu_affinity()
                if affinity:
                    result["cpuAffinityCores"] = len(affinity)
            except Exception:
                pass
        except Exception:
            pass
        result.update(self._engine_storage())
        return result

    def _normalise_resources(self, raw):
        detected = self._detected_system()
        total = max(1, int(detected.get("cpuCores") or 1))
        try:
            cores = int(raw.get("cpuCores", 0))
        except (TypeError, ValueError):
            cores = 0
        cores = max(0, min(cores, total))
        try:
            workers = int(raw.get("maxCameraWorkers", 2))
        except (TypeError, ValueError):
            workers = 2
        workers = max(1, min(workers, 16))
        try:
            interval = float(raw.get("processInterval", 2.0))
        except (TypeError, ValueError):
            interval = 2.0
        interval = max(1.0, min(interval, 30.0))
        gpu_mode = str(raw.get("gpuMode") or "auto").lower()
        if gpu_mode not in ("auto", "off", "required"):
            gpu_mode = "auto"
        try:
            gpu_memory_mb = int(raw.get("gpuMemoryMb") or 0)
        except (TypeError, ValueError):
            gpu_memory_mb = 0
        gpu_memory_mb = max(0, min(gpu_memory_mb, 65536))
        if 0 < gpu_memory_mb < MIN_GPU_MEMORY_MB:
            gpu_memory_mb = MIN_GPU_MEMORY_MB
        return {"cpuCores": cores, "maxCameraWorkers": workers, "processInterval": interval,
                "gpuMode": gpu_mode, "gpuMemoryMb": gpu_memory_mb}

    def _apply_resources(self, settings, persist=True):
        detected = self._detected_system()
        total = max(1, int(detected.get("cpuCores") or 1))
        cores = int(settings.get("cpuCores") or 0)
        if psutil is not None:
            try:
                (self._process or psutil.Process()).cpu_affinity(list(range(min(cores, total) if cores > 0 else total)))
            except Exception as exc:  # noqa: BLE001
                LOG.warning("Could not apply CPU affinity: %s", exc)
        thread_limit = str(min(cores, total) if cores > 0 else total)
        for key in ("TF_NUM_INTRAOP_THREADS", "TF_NUM_INTEROP_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
            os.environ[key] = thread_limit
        if str(settings.get("gpuMode") or "auto") == "off":
            os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
        else:
            os.environ.pop("CUDA_VISIBLE_DEVICES", None)
        self.gate.set_limit(settings.get("maxCameraWorkers") or 2)
        if persist:
            self.store.data["resources"] = dict(settings)
            self.store.save()

    def _gpu_payload(self):
        base = dict(self.gpu_status)
        try:
            from gpu_telemetry import collect_gpu_telemetry
            telemetry = collect_gpu_telemetry(os.getpid())
        except Exception as exc:  # noqa: BLE001
            telemetry = {
                "available": False, "detected": None, "source": "NVML",
                "driver": "", "devices": [],
                "totals": {"memoryTotalMb": None, "memoryUsedMb": None,
                            "memoryFreeMb": None, "utilizationPercent": None,
                            "temperatureC": None, "powerW": None,
                            "engineProcessMemoryMb": None},
                "error": f"{type(exc).__name__}: {exc}",
            }
        active = bool(base.get("active"))
        mode = str(base.get("mode") or "auto")
        provider = str(base.get("provider") or "CPU")
        detected = telemetry.get("detected")
        if detected is None and (active or provider == "DirectML"):
            detected = True
        if mode == "off":
            state = "detected_disabled" if detected else ("not_detected" if detected is False else "unknown")
        elif mode == "required" and not active:
            state = "required_unavailable"
        elif active:
            state = "active"
        elif detected:
            state = "detected_unavailable"
        elif detected is False:
            state = "not_detected"
        else:
            state = "unknown"
        messages = {
            "active": f"GPU detected · {provider} active" + ("" if telemetry.get("available") else " · detailed telemetry unavailable"),
            "detected_disabled": "GPU detected · disabled (CPU only)",
            "detected_unavailable": "GPU detected · accelerator unavailable, using CPU",
            "not_detected": "No GPU detected · using CPU",
            "required_unavailable": "GPU required · unavailable",
            "unknown": "GPU detection unavailable · using CPU",
        }
        totals = telemetry.get("totals") or {}
        result = dict(base)
        result.update({
            "detected": detected,
            "state": state,
            "message": messages.get(state, base.get("message") or ""),
            "provider": provider,
            "driver": telemetry.get("driver") or "",
            "telemetryAvailable": bool(telemetry.get("available")),
            "telemetrySource": telemetry.get("source") or "NVML",
            "telemetryError": telemetry.get("error") or "",
            "hardware": telemetry.get("devices") or [],
            "totals": totals,
            "memoryTotalMb": totals.get("memoryTotalMb"),
            "memoryUsedMb": totals.get("memoryUsedMb"),
            "memoryFreeMb": totals.get("memoryFreeMb"),
            "utilizationPercent": totals.get("utilizationPercent"),
            "temperatureC": totals.get("temperatureC"),
            "powerW": totals.get("powerW"),
            "engineProcessMemoryMb": totals.get("engineProcessMemoryMb"),
            "memoryLimitMb": base.get("memoryLimitMb") or 0,
        })
        return result

    def resource_payload(self):
        detected = self._detected_system()
        settings = dict(self.resource_settings)
        total_cores = max(1, int(detected.get("cpuCores") or 1))
        configured_cores = int(settings.get("cpuCores") or 0)
        effective_cores = int(detected.get("cpuAffinityCores") or total_cores)
        allocation = {
            "cpuCores": configured_cores if configured_cores > 0 else total_cores,
            "cpuCoresConfigured": configured_cores,
            "cpuCoresEffective": effective_cores,
            "cpuCoresAutomatic": configured_cores == 0,
            "maxCameraWorkers": int(settings.get("maxCameraWorkers") or 1),
            "gpuMemoryMb": int(settings.get("gpuMemoryMb") or 0),
            "ramLimitMb": None,
            "diskLimitMb": None,
        }
        workers = list(self.workers.values())
        workload = {
            "cameras": len(workers),
            "activeWorkers": sum(1 for worker in workers if worker.mode == "SENDING" and worker.camera_token),
            "maxWorkers": int(settings.get("maxCameraWorkers") or 1),
            "processing": int(self.gate.active),
            "fps": round(sum(float(worker.fps or 0) for worker in workers), 1),
            "facesNow": sum(len(worker._face_boxes) for worker in workers),
            "framesProcessed": sum(int(worker.frames_processed or 0) for worker in workers),
            "facesDetected": sum(int(worker.faces_detected or 0) for worker in workers),
        }
        engine = {
            "pid": os.getpid(),
            "cpuPercent": detected.get("processCpuPercent"),
            "threads": detected.get("processThreads"),
            "memoryMb": detected.get("processMemoryMb"),
            "memoryPercent": detected.get("processMemoryPercent"),
            "vmsMb": detected.get("processVmsMb"),
            "uptimeSeconds": detected.get("processUptimeSeconds"),
            "diskReadRate": detected.get("processReadRate"),
            "diskWriteRate": detected.get("processWriteRate"),
            "storageMb": detected.get("engineStorageMb"),
            "modelsMb": detected.get("engineModelMb"),
            "dataMb": detected.get("engineDataMb"),
        }
        return {"detected": detected, "settings": settings, "allocation": allocation,
                "engine": engine, "workload": workload, "gpu": self._gpu_payload()}

    def configure_gpu(self):
        if self._gpu_configured:
            return
        self._gpu_configured = True
        mode = str(self.resource_settings.get("gpuMode") or "auto")
        model_dir = (Path(os.environ.get("DEEPFACE_HOME") or str(Path.home()))
                     / ".deepface" / "weights")
        try:
            from face_backend import OnnxFaceBackend
            memory_limit_mb = int(self.resource_settings.get("gpuMemoryMb") or 0)
            backend = OnnxFaceBackend(model_dir, mode, memory_limit_mb).initialize()
            self.face_backend = backend
            self.gpu_status = backend.status()
            LOG.info("Face backend: %s", self.gpu_status)
            return
        except Exception as exc:  # noqa: BLE001
            self.face_backend = None
            LOG.warning("ONNX face backend unavailable: %s", exc)
        if mode == "off":
            self.gpu_status = {"active": False, "mode": mode, "devices": [],
                               "message": "CPU only", "backend": "TensorFlow"}
            return
        try:
            import tensorflow as tf
            devices = tf.config.list_physical_devices("GPU")
            if not devices:
                self.gpu_status = {"active": False, "mode": mode, "devices": [],
                                   "message": "No GPU detected", "backend": "TensorFlow"}
                return
            limit_mb = int(self.resource_settings.get("gpuMemoryMb") or 0)
            configured = []
            for device in devices:
                try:
                    if limit_mb > 0:
                        tf.config.set_logical_device_configuration(
                            device, [tf.config.LogicalDeviceConfiguration(memory_limit=limit_mb)])
                    else:
                        tf.config.experimental.set_memory_growth(device, True)
                    configured.append(str(device.name))
                except Exception as exc:  # noqa: BLE001
                    LOG.warning("Could not configure GPU %s: %s", device, exc)
            self.gpu_status = {"active": bool(configured), "mode": mode, "devices": configured,
                               "memoryLimitMb": limit_mb, "backend": "TensorFlow",
                               "message": "GPU enabled" if configured else "GPU configuration failed"}
            LOG.info("GPU status: %s", self.gpu_status)
        except Exception as exc:  # noqa: BLE001
            self.gpu_status = {"active": False, "mode": mode, "devices": [],
                               "message": f"GPU unavailable: {type(exc).__name__}", "backend": "TensorFlow"}
            LOG.warning("GPU unavailable: %s", exc)

    def set_resources(self, raw):
        settings = self._normalise_resources(raw or {})
        self.resource_settings = settings
        self._apply_resources(settings, persist=True)
        return self.status()

    def sync_gallery(self):
        """Download the active worker gallery and swap it atomically."""
        body = self.bss_call("GET", "/v1/edge/face-gallery", timeout=60)
        data = body.get("data") or {}
        if str(data.get("version") or "") != MODEL_VERSION:
            LOG.warning("Worker gallery model %s does not match client model %s",
                        data.get("version"), MODEL_VERSION)
            return False
        tmp = self.gallery_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        os.replace(tmp, self.gallery_path)
        self.gallery = FaceGallery(data)
        LOG.info("Worker gallery synced: %s workers, version %s",
                 len({e[1] for e in self.gallery.entries}), self.gallery.version[:12])
        return True

    def refresh_config(self):
        body = self.bss_call("GET", "/v1/edge/config")
        data = body.get("data") or {}
        device = data.get("device") or {}
        with self.lock:
            self.sites = list(device.get("sites") or [])
            self.device_name = str(device.get("name") or self.device_name or "")
            self.employer_name = str(device.get("employerName") or self.employer_name or "")
            self.store.data["sites"] = self.sites
            self.store.data["deviceName"] = self.device_name
            self.store.data["employerName"] = self.employer_name
            incoming = {}
            for site in self.sites:
                for camera in site.get("cameras") or []:
                    camera = dict(camera)
                    camera["siteId"] = site.get("id")
                    camera["siteBssId"] = site.get("bssId")
                    camera["siteName"] = site.get("name")
                    try:
                        cid = int(camera.get("id"))
                    except (TypeError, ValueError):
                        continue
                    incoming[cid] = camera
                    self.bss_cameras[cid] = camera
                    local = self.local_camera(cid)
                    local["label"] = camera.get("label") or f"Camera {cid}"
                    local["siteId"] = camera.get("siteId")
                    local["siteBssId"] = camera.get("siteBssId")
                    local["siteName"] = camera.get("siteName")
                    worker = self.workers.get(cid)
                    if worker is None:
                        worker = CameraWorker(self, cid, local["label"])
                        self.workers[cid] = worker
                    worker.label = local["label"]
                    worker.rtsp = str(local.get("rtsp") or "")
                    worker.mode = str(local.get("mode") or "SENDING").upper()
                    if camera.get("approvalStatus") == "APPROVED":
                        worker.mode = "SENDING"
                        local["mode"] = "SENDING"
                    worker.camera_token = str(local.get("cameraToken") or "")
                    if worker.rtsp and not worker._running:
                        worker.start()
                    if worker.mode == "SENDING" and worker.camera_token:
                        worker._ensure_ai()
            for cid in list(self.workers):
                if cid not in incoming:
                    self.workers.pop(cid).stop()
                    self.bss_cameras.pop(cid, None)
                    self.store.data.get("cameras", {}).pop(str(cid), None)
            self.store.data["bssCameras"] = {str(k): v for k, v in self.bss_cameras.items()}
            missing_claims = [
                cid for cid, worker in self.workers.items()
                if (self.bss_cameras.get(cid) or {}).get("approvalStatus") == "APPROVED"
                and (self.bss_cameras.get(cid) or {}).get("allowedIp")
                and ((self.bss_cameras.get(cid) or {}).get("claimedByThisDevice")
                     or (self.bss_cameras.get(cid) or {}).get("createdByDeviceId") == self.device_id)
                and not worker.camera_token
            ]
            self.store.save()
        for cid in missing_claims:
            try:
                body = self.bss_call("POST", f"/v1/edge/cameras/{cid}/claim", {})
                token = (body.get("data") or {}).get("cameraToken") or ""
                if not token:
                    continue
                local = self.local_camera(cid)
                local["cameraToken"] = token
                worker = self.workers.get(cid)
                if worker is not None:
                    worker.camera_token = token
                    worker.mode = str(local.get("mode") or "LIVE").upper()
                    if worker.mode == "SENDING":
                        worker._ensure_ai()
            except BssError as exc:
                LOG.warning("Could not restore camera token for %s: %s", cid, exc)
        if missing_claims:
            self.store.save()
        gallery_version = str((data.get("face") or {}).get("galleryVersion") or "")
        if (gallery_version and gallery_version != self.gallery.version) or not self.gallery.ready:
            try:
                self.sync_gallery()
            except BssError as exc:
                LOG.warning("Worker gallery sync failed: %s", exc)
        return self.status()

    def _manual_camera_worker(self, camera_id):
        worker = self.workers.get(int(camera_id))
        if worker is None:
            raise ValueError("Camera not found.")
        camera = self.bss_cameras.get(int(camera_id)) or {}
        if camera.get("approvalStatus") != "APPROVED":
            raise ValueError("This camera is waiting for employer approval.")
        if not camera.get("claimedByThisDevice") or not worker.camera_token:
            raise ValueError("This camera is not synced to this device.")
        if not worker.rtsp:
            raise ValueError("This camera has no RTSP stream.")
        return worker, camera

    def _manual_warning(self, camera, vector, bss_worker_id):
        try:
            match = self.gallery.match(vector, camera.get("siteId"))
            if match is None:
                return None
            matched_worker, distance = match
            if str(matched_worker).upper() == str(bss_worker_id).upper():
                return None
            profile = self.gallery.profile(matched_worker)
            return {
                "type": "other_worker",
                "bssWorkerId": str(matched_worker),
                "name": profile.get("name") or str(matched_worker),
                "confidence": round(max(0.0, min(100.0, (1.0 - float(distance)) * 100.0)), 1),
            }
        except Exception:  # noqa: BLE001 - warning is advisory
            return None

    def start_manual_enrollment(self, camera_id, bss_worker_id):
        worker, camera = self._manual_camera_worker(camera_id)
        bss_worker_id = str(bss_worker_id or "").strip().upper()
        if not bss_worker_id:
            raise ValueError("Select a worker.")
        capture_id = uuid.uuid4().hex
        now = _now()
        with self._manual_capture_lock:
            cutoff = time.time() - 900
            for key in [key for key, value in self._manual_captures.items()
                        if value.get("createdTs", 0) < cutoff]:
                self._manual_captures.pop(key, None)
            self._manual_captures[capture_id] = {
                "cameraId": int(camera_id), "bssWorkerId": bss_worker_id,
                "slots": [None] * MANUAL_ENROLL_FRAMES,
                "startedAt": now.isoformat(), "createdTs": time.time(),
            }
        return {"captureId": capture_id, "bssWorkerId": bss_worker_id,
                "slots": MANUAL_ENROLL_FRAMES}

    def manual_enrollment_preview(self, camera_id):
        worker, camera = self._manual_camera_worker(camera_id)
        frame, detections = worker.manual_detections()
        count = len(detections)
        color = (40, 170, 80) if count == 1 else ((40, 40, 220) if count > 1 else (140, 140, 140))
        label = f"{count} person" + ("" if count == 1 else "s")
        for _embedding, box in detections:
            x, y, w, h = [int(v) for v in (box or [0, 0, 0, 0])[:4]]
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
            cv2.putText(frame, label, (max(0, x), max(18, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
        if count == 0:
            cv2.putText(frame, "No face detected", (18, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
        if count > 1:
            cv2.putText(frame, "ONLY ONE PERSON ALLOWED", (18, 62),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, color, 2, cv2.LINE_AA)
        preview = frame
        max_width = 640
        if preview.shape[1] > max_width:
            scale = max_width / float(preview.shape[1])
            preview = cv2.resize(preview, (max_width, max(1, int(preview.shape[0] * scale))))
        encoded, buf = cv2.imencode(".jpg", preview, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
        if not encoded:
            raise ValueError("Could not prepare this camera frame.")
        return {
            "image": "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii"),
            "count": count,
            "ready": count == 1,
            "faces": [{"box": [int(v) for v in (box or [0, 0, 0, 0])[:4]]} for _e, box in detections],
        }

    def capture_manual_slot(self, camera_id, capture_id, slot):
        with self._manual_capture_lock:
            pending = self._manual_captures.get(str(capture_id))
            if pending is None or pending.get("cameraId") != int(camera_id):
                raise ValueError("This enrollment session has expired. Open manual enrollment again.")
            slots = pending.get("slots") or []
        try:
            slot = int(slot)
        except (TypeError, ValueError):
            raise ValueError("Photo slot is invalid.")
        if slot < 1 or slot > MANUAL_ENROLL_FRAMES:
            raise ValueError("Photo slot is invalid.")
        worker, camera = self._manual_camera_worker(camera_id)
        captured = worker.capture_manual_single()
        pending["slots"][slot - 1] = captured
        warning = self._manual_warning(camera, captured["vector"], pending["bssWorkerId"])
        return {
            "slot": slot,
            "preview": captured["preview"],
            "quality": captured["quality"],
            "filled": sum(1 for item in pending["slots"] if item is not None),
            "warning": warning,
        }

    def retake_manual_slot(self, camera_id, capture_id, slot):
        try:
            slot = int(slot)
        except (TypeError, ValueError):
            raise ValueError("Photo slot is invalid.")
        with self._manual_capture_lock:
            pending = self._manual_captures.get(str(capture_id))
            if pending is None or pending.get("cameraId") != int(camera_id):
                raise ValueError("This enrollment session has expired. Open manual enrollment again.")
            if 1 <= slot <= MANUAL_ENROLL_FRAMES:
                pending["slots"][slot - 1] = None
        return {"slot": slot, "filled": sum(1 for item in pending["slots"] if item is not None)}

    def confirm_manual_enrollment(self, camera_id, capture_id, confirm_mismatch=False):
        with self._manual_capture_lock:
            pending = self._manual_captures.get(str(capture_id))
            if pending is None or pending.get("cameraId") != int(camera_id):
                raise ValueError("This capture has expired. Capture the 5 photos again.")
            slots = list(pending.get("slots") or [])
        if len(slots) != MANUAL_ENROLL_FRAMES or any(item is None for item in slots):
            raise ValueError("Take all 5 photos before confirming.")
        worker = self.workers.get(int(camera_id))
        if worker is None or not worker.camera_token:
            raise ValueError("Camera is not available.")
        payload = {
            "bssWorkerId": pending["bssWorkerId"],
            "embeddings": [base64.b64encode(item["vector"].astype(np.float32).tobytes()).decode("ascii")
                           for item in slots],
            "model": MODEL_NAME,
            "version": MODEL_VERSION,
            "detector": DETECTOR_BACKEND,
            "weightsSha": ARCFACE_SHA,
            "capturedAt": _now().isoformat(),
            "quality": [item["quality"] for item in slots],
            "confirmMismatch": bool(confirm_mismatch),
        }
        try:
            body = self.bss_call("POST", f"/v1/edge/cameras/{int(camera_id)}/manual-enroll",
                                 payload, timeout=60, camera_token=worker.camera_token)
        except BssError as exc:
            if exc.status_code == 409 and exc.body.get("requiresConfirmation"):
                return {"requiresConfirmation": True, **exc.body}
            raise
        with self._manual_capture_lock:
            self._manual_captures.pop(str(capture_id), None)
        data = body.get("data") or {}
        try:
            self.sync_gallery()
        except BssError as exc:
            LOG.warning("Gallery sync after manual enrollment failed: %s", exc)
        return {"data": data}

    def cancel_manual_enrollment(self, camera_id, capture_id):
        with self._manual_capture_lock:
            pending = self._manual_captures.get(str(capture_id))
            if pending is not None and pending.get("cameraId") == int(camera_id):
                self._manual_captures.pop(str(capture_id), None)
        return {"cancelled": True}

    def set_worker_face_source(self, bss_worker_id, source):
        source = str(source or "").strip().upper()
        if source not in ("MANUAL", "SELF"):
            raise ValueError("source must be MANUAL or SELF.")
        body = self.bss_call("PATCH", f"/v1/edge/workers/{quote(str(bss_worker_id).strip().upper())}/face-source",
                             {"source": source}, timeout=20)
        try:
            self.sync_gallery()
        except BssError as exc:
            LOG.warning("Gallery sync after source change failed: %s", exc)
        return body.get("data") or {}

    def send_qr_event(self, worker, bss_worker_id, when):
        event = {
            "eventId": str(uuid.uuid4()), "cameraId": worker.camera_id,
            "occurredAt": when.isoformat(), "type": "QR",
            "bssWorkerId": str(bss_worker_id).upper(),
            "galleryVersion": self.gallery.version,
        }
        self.events.add(event)
        self.flush_outbox()

    def set_camera_attendance_mode(self, camera_id, mode):
        mode = str(mode or "").strip().upper()
        if mode not in ("FACE", "QR", "BOTH"):
            raise ValueError("mode must be FACE, QR or BOTH.")
        worker = self.workers.get(int(camera_id))
        if worker is None or not worker.camera_token:
            raise ValueError("Camera is not available.")
        body = self.bss_call("POST", f"/v1/edge/cameras/{int(camera_id)}/attendance-mode",
                             {"mode": mode}, timeout=20, camera_token=worker.camera_token)
        data = body.get("data") or {}
        camera = self.bss_cameras.setdefault(int(camera_id), {})
        camera["attendanceMode"] = mode
        self.store.data.setdefault("bssCameras", {})[str(int(camera_id))] = camera
        self.store.save()
        if mode != "FACE":
            worker.close_presence_sessions("attendance_mode")
        return data

    def send_allowed(self, worker):
        camera = self.bss_cameras.get(worker.camera_id) or {}
        return bool(camera.get("approvalStatus") == "APPROVED"
                    and camera.get("allowedIp") and camera.get("claimedByThisDevice")
                    and schedule_active(camera) and worker.camera_token)

    def send_event(self, worker, matched_worker, when, distance, face_box=None, presence=None):
        event = {
            "eventId": str(uuid.uuid4()), "cameraId": worker.camera_id,
            "occurredAt": when.isoformat(), "type": "FACE",
            "bssWorkerId": matched_worker,
            "matchDistance": round(float(distance), 6),
            "galleryVersion": self.gallery.version,
            "modelVersion": MODEL_VERSION,
            "faceBox": list(face_box or []),
        }
        if presence:
            event.update({key: value for key, value in presence.items() if value is not None})
        self.events.add(event)
        self.flush_outbox()

    def flush_outbox(self):
        pending = self.events.pending()
        if not pending:
            return
        by_camera = {}
        for event_id, event in pending:
            event["eventId"] = event.get("eventId") or event_id
            by_camera.setdefault(str(event.get("cameraId")), []).append(event)
        for camera_key, events in by_camera.items():
            try:
                cid = int(camera_key)
            except (TypeError, ValueError):
                continue
            worker = self.workers.get(cid)
            if worker is None or not worker.camera_token:
                continue
            for start in range(0, len(events), 100):
                batch = events[start:start + 100]
                try:
                    body = self.bss_call("POST", "/v1/edge/events", {"events": batch},
                                         camera_token=worker.camera_token)
                except BssError as exc:
                    if exc.status_code == 401:
                        worker.camera_token = ""
                        self.local_camera(cid)["cameraToken"] = ""
                        self.store.save()
                    LOG.warning("Event send failed for camera %s: %s", cid, exc)
                    continue
                results = ((body.get("data") or {}).get("results") or [])
                accepted = [str(r.get("eventId")) for r in results
                            if r.get("eventId") and r.get("status") != "REJECTED"]
                rejected = [str(r.get("eventId")) for r in results
                            if r.get("eventId") and r.get("status") == "REJECTED"]
                self.events.mark(accepted, "SYNCED")
                self.events.mark(rejected, "REJECTED", "Rejected by BSS")
                for result in results:
                    if result.get("status") in ("ACCEPTED", "UNKNOWN"):
                        self.last_event_at[cid] = _now()
        self.events.prune()

    def set_mode(self, camera_id, mode):
        worker = self.workers.get(camera_id)
        camera = self.bss_cameras.get(camera_id) or {}
        if worker is None:
            raise ValueError("Camera not found.")
        mode = str(mode or "").upper()
        if mode == "SENDING":
            if camera.get("approvalStatus") != "APPROVED":
                raise ValueError("This camera is waiting for employer approval.")
            if not camera.get("allowedIp"):
                raise ValueError("The employer has not set the allowed IP yet.")
            if not worker.camera_token:
                raise ValueError("Camera is still being activated. Try again in a moment.")
            if not schedule_active(camera):
                raise ValueError("This camera is outside its capture window.")
        worker.set_mode(mode)
        return self.status()

    def add_camera(self, label, channel=None, site_bss_id=None, rtsp=""):
        label = str(label or "").strip()[:120]
        if not label:
            raise ValueError("Camera label is required.")
        if not site_bss_id:
            raise ValueError("Select a site for this camera.")
        try:
            body = self.bss_call("POST", "/v1/edge/cameras",
                                 {"label": label, "channel": channel or None, "siteBssId": site_bss_id})
        except BssError as exc:
            if exc.status_code == 0:
                raise ValueError("Camera not saved — BSS server connection is required to sync it.") from exc
            raise
        camera = body.get("data") or {}
        try:
            cid = int(camera.get("id"))
        except (TypeError, ValueError):
            raise ValueError("BSS did not return a camera id.")
        local = self.local_camera(cid)
        local.update({"label": label, "mode": "SENDING", "cameraToken": "",
                      "siteBssId": site_bss_id})
        if rtsp:
            local["rtsp"] = rtsp
        self.store.save()
        self.refresh_config()
        if rtsp:
            worker = self.workers.get(cid)
            if worker:
                worker.set_rtsp(rtsp)
        return self.status()

    def remove_camera(self, camera_id):
        worker = self.workers.get(camera_id)
        try:
            self.bss_call("DELETE", f"/v1/edge/cameras/{camera_id}/remove", timeout=15)
        except BssError as exc:
            if exc.status_code == 0:
                raise ValueError("Camera not removed — BSS server connection is required to sync the removal.") from exc
            if exc.status_code != 404:
                raise ValueError("Camera not removed — BSS rejected the removal. Try again.") from exc
        if worker is not None:
            worker.stop()
        self.workers.pop(camera_id, None)
        self.bss_cameras.pop(camera_id, None)
        self.store.data.get("cameras", {}).pop(str(camera_id), None)
        self.store.data["bssCameras"] = {str(k): v for k, v in self.bss_cameras.items()}
        self.store.save()
        return self.status()

    def set_rtsp(self, camera_id, rtsp):
        worker = self.workers.get(camera_id)
        if worker is None:
            raise ValueError("Camera not found.")
        worker.set_rtsp(rtsp)
        self.store.save()
        return self.status()

    def shutdown(self):
        for worker in list(self.workers.values()):
            try:
                worker.stop()
            except Exception:  # noqa: BLE001
                LOG.exception("Could not stop camera %s during shutdown", worker.label)
        try:
            self.flush_outbox()
        except Exception:  # noqa: BLE001
            LOG.exception("Could not flush pending presence events during shutdown")

    def logout(self):
        for worker in list(self.workers.values()):
            worker.stop()
        self._clear_gallery()
        self.token = ""
        self.device_id = ""
        self.sites = []
        self.device_name = ""
        self.employer_name = ""
        self.bss_cameras = {}
        for worker in self.workers.values():
            worker.camera_token = ""
        self.store.data.update({"token": "", "deviceId": "", "sites": [], "bssCameras": {},
                                "deviceName": "", "employerName": ""})
        for local in self.store.data.get("cameras", {}).values():
            local["cameraToken"] = ""
        self.store.save()
        return self.status()

    def set_channel(self, camera_id, channel):
        worker = self.workers.get(camera_id)
        if worker is None:
            raise ValueError("Camera not found.")
        body = self.bss_call("POST", f"/v1/edge/cameras/{camera_id}/setup", {
            "channel": channel or "",
        })
        self.refresh_config()
        return self.status()

    def claim(self, camera_id, otp=None):
        body = self.bss_call("POST", f"/v1/edge/cameras/{camera_id}/claim",
                             {"otp": otp} if otp else {})
        data = body.get("data") or {}
        token = data.get("cameraToken") or ""
        if not token:
            raise ValueError("BSS did not issue a camera token.")
        local = self.local_camera(camera_id)
        local["cameraToken"] = token
        local["mode"] = "LIVE"
        self.store.save()
        self.refresh_config()
        return self.status()

    def takeover_otp(self, camera_id):
        return self.bss_call("POST", f"/v1/edge/cameras/{camera_id}/takeover-otp", {})

    def test_rtsp(self, rtsp):
        rtsp = str(rtsp or "").strip()
        if not rtsp.lower().startswith(("rtsp://", "rtsps://")):
            raise ValueError("Only RTSP URLs are supported.")
        cap = cv2.VideoCapture(rtsp, cv2.CAP_FFMPEG)
        try:
            if not cap.isOpened():
                return {"ok": False, "error": "Could not open the RTSP stream."}
            ok, frame = cap.read()
            if not ok or frame is None:
                return {"ok": False, "error": "Connected, but no video frame was received."}
            height, width = frame.shape[:2]
            return {"ok": True, "width": width, "height": height}
        finally:
            cap.release()

    def _send_device_heartbeat(self):
        self.bss_call("POST", "/v1/edge/device-heartbeat", {
            "version": APP_VERSION, "status": "ONLINE",
        }, timeout=10)
        self.last_heartbeat = _now()
        self.last_heartbeat_source = "device"
        self.last_device_heartbeat = self.last_heartbeat
        self.last_device_heartbeat_error = ""

    def _clear_gallery(self):
        try:
            self.gallery_path.unlink(missing_ok=True)
        except OSError:
            pass
        self.gallery = FaceGallery()

    def _deactivate_local(self):
        self._clear_gallery()
        self.token = ""
        self.device_id = ""
        self.sites = []
        self.device_name = ""
        self.employer_name = ""
        self.bss_cameras = {}
        for worker in self.workers.values():
            worker.camera_token = ""
        self.store.data.update({"token": "", "deviceId": "", "sites": [], "bssCameras": {},
                                "deviceName": "", "employerName": ""})
        for local in self.store.data.get("cameras", {}).values():
            local["cameraToken"] = ""
        self.store.save()

    def _config_loop(self):
        while not self._stop.is_set():
            if self.token and self.device_id:
                try:
                    self.refresh_config()
                except BssError as exc:
                    if exc.status_code == 401:
                        self._deactivate_local()
                    LOG.warning("Config refresh failed: %s", exc)
                except Exception as exc:  # noqa: BLE001
                    LOG.warning("Config refresh error: %s", exc)
            self._stop.wait(15)

    def _heartbeat_loop(self):
        while not self._stop.is_set():
            try:
                try:
                    self._send_device_heartbeat()
                except BssError as exc:
                    self.last_device_heartbeat_error = str(exc)[:240]
                    if exc.status_code == 401:
                        self._deactivate_local()
                    LOG.warning("Device heartbeat failed: %s", exc)
                for worker in list(self.workers.values()):
                    if not worker.camera_token:
                        continue
                    try:
                        self.bss_call("POST", "/v1/edge/heartbeat", {
                            "version": APP_VERSION, "mode": worker.mode,
                            "status": worker.status, "fps": round(worker.fps, 1),
                        }, timeout=10, camera_token=worker.camera_token)
                    except BssError as exc:
                        if exc.status_code == 401:
                            worker.camera_token = ""
                            self.local_camera(worker.camera_id)["cameraToken"] = ""
                            worker.status = "AUTH_FAILED"
                            self.store.save()
                        LOG.warning("Heartbeat failed for camera %s: %s", worker.camera_id, exc)
                    else:
                        self.last_heartbeat = _now()
                        self.last_heartbeat_source = "camera"
                self.flush_outbox()
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Heartbeat loop error: %s", exc)
            self._stop.wait(20)

    def status(self):
        now = _now()
        heartbeat_fresh = bool(self.last_heartbeat
                               and (now - self.last_heartbeat).total_seconds() < 90)
        cameras = []
        for cid, worker in sorted(self.workers.items()):
            bss = self.bss_cameras.get(cid) or {}
            allowed = schedule_active(bss) if bss else False
            reason = ""
            if not bss:
                reason = "Waiting for BSS sync"
            elif bss.get("approvalStatus") != "APPROVED":
                reason = "Camera was removed by the employer"
            elif not bss.get("allowedIp"):
                reason = "Waiting for employer IP whitelisting"
            elif not worker.camera_token:
                reason = "Activating camera"
            elif not allowed:
                reason = "Outside capture window"
            cameras.append({
                **worker.snapshot(),
                "allowedIp": bss.get("allowedIp") or "",
                "scheduleEnabled": bool(bss.get("scheduleEnabled")),
                "attendanceMode": bss.get("attendanceMode") or "FACE",
                "schedule": schedule_text(bss) if bss else "Not synced",
                "uid": bss.get("uid") or "",
                "channel": bss.get("channel"),
                "siteId": bss.get("siteId"),
                "siteBssId": bss.get("siteBssId") or "",
                "siteName": bss.get("siteName") or "",
                "approvalStatus": bss.get("approvalStatus") or "APPROVED",
                "ipWhitelisted": bool(bss.get("ipWhitelisted")),
                "employerLabel": bss.get("employerLabel") or "",
                "cameraOnline": bool(bss.get("online")),
                "sourceDeviceName": bss.get("sourceDeviceName") or (self.device_name if bss.get("claimedByThisDevice") else "Another device"),
                "sourceDeviceId": bss.get("sourceDeviceId") or bss.get("createdByDeviceId") or "",
                "createdByDeviceId": bss.get("createdByDeviceId") or "",
                "canRemove": bool(bss.get("claimedByThisDevice") or bss.get("createdByDeviceId") == self.device_id),
                "timezoneLabel": "IST (UTC+05:30)",
                "canClaim": False,
                "sendAllowed": bool(bss.get("approvalStatus") == "APPROVED"
                                    and bss.get("allowedIp") and bss.get("claimedByThisDevice")
                                    and allowed and worker.camera_token),
                "sendBlockedReason": reason,
            })
        resources = self.resource_payload()
        return {
            "activated": bool(self.token and self.device_id),
            "deviceId": self.device_id,
            "deviceName": self.device_name,
            "employerName": self.employer_name,
            "sites": self.sites,
            "bss": self.bss,
            "version": APP_VERSION,
            "bssConnected": heartbeat_fresh,
            "lastHeartbeatAt": _iso(self.last_heartbeat),
            "lastHeartbeatSource": self.last_heartbeat_source,
            "lastDeviceHeartbeatAt": _iso(self.last_device_heartbeat),
            "lastDeviceHeartbeatError": self.last_device_heartbeat_error,
            "dataDir": str(self.home_dir),
            "faceModel": {"model": MODEL_NAME, "version": MODEL_VERSION, "detector": DETECTOR_BACKEND},
            "gallery": {"ready": self.gallery.ready, "version": self.gallery.version,
                        "workers": len({e[1] for e in self.gallery.entries}),
                        "status": self.gallery.worker_status},
            "gpu": resources["gpu"],
            "cameras": cameras,
            "resources": resources,
            "outbox": self.events.count(),
            "localEvents": self.events.recent(25),
        }


ENGINE = None


class EngineServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class Handler(BaseHTTPRequestHandler):
    server_version = "BSSAttendance/1.0"

    def log_message(self, fmt, *args):
        LOG.debug(fmt, *args)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, payload, status=200):
        raw = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self._cors()
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/status":
            return self._json({"data": ENGINE.status()})
        if path == "/api/events":
            return self._json({"data": ENGINE.events.recent(100)})
        if path == "/api/system":
            return self._json({"data": ENGINE.resource_payload()})
        if path == "/api/health":
            return self._json({"ok": True})
        if path.startswith("/api/detections/"):
            try:
                cid = int(unquote(path[len("/api/detections/"):]))
            except ValueError:
                return self._json({"error": "Camera not found."}, 404)
            worker = ENGINE.workers.get(cid)
            if worker is None:
                return self._json({"error": "Camera not found."}, 404)
            return self._json({"data": worker.detection_rows()})
        if path == "/api/test-rtsp":
            return self._json({"data": ENGINE.test_rtsp((self._body() or {}).get("rtsp"))})
        if path.startswith("/api/cameras/"):
            parts = path[len("/api/cameras/"):].split("/")
            if len(parts) >= 3 and parts[1] == "manual-enroll" and parts[2] == "preview":
                try:
                    cid = int(parts[0])
                    return self._json({"data": ENGINE.manual_enrollment_preview(cid)})
                except (ValueError, BssError) as exc:
                    return self._json({"error": str(exc)}, 400)
        if path.startswith("/snapshot/"):
            try:
                cid = int(unquote(path[len("/snapshot/"):]))
            except ValueError:
                return self._json({"error": "Camera not found."}, 404)
            worker = ENGINE.workers.get(cid)
            if worker is None:
                return self._json({"error": "Camera not found."}, 404)
            jpeg = worker.jpeg()
            if not jpeg:
                return self._json({"error": "Waiting for the first camera frame."}, 503)
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(jpeg)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(jpeg)
            return
        if path.startswith("/stream/"):
            try:
                cid = int(unquote(path[len("/stream/"):]))
            except ValueError:
                return self._json({"error": "Camera not found."}, 404)
            worker = ENGINE.workers.get(cid)
            if worker is None:
                return self._json({"error": "Camera not found."}, 404)
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self._cors()
            self.end_headers()
            try:
                while True:
                    jpeg = worker.jpeg()
                    if jpeg:
                        self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + str(len(jpeg)).encode() + b"\r\n\r\n")
                        self.wfile.write(jpeg + b"\r\n")
                    time.sleep(0.08)
            except (BrokenPipeError, ConnectionResetError):
                return
        return self._json({"error": "Not found."}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        body = self._body()
        try:
            if path == "/api/activate/request-otp":
                return self._json({"data": ENGINE.request_otp(body.get("phone"))})
            if path == "/api/activate/verify-otp":
                return self._json({"data": ENGINE.verify_otp(body.get("phone"), body.get("otp"))})
            if path == "/api/activate/complete":
                return self._json({"data": ENGINE.activate(
                    body.get("activationToken"), body.get("deviceName"))})
            if path == "/api/config/refresh":
                return self._json({"data": ENGINE.refresh_config()})
            if path == "/api/resources":
                return self._json({"data": ENGINE.set_resources(body)})
            if path == "/api/test-rtsp":
                return self._json({"data": ENGINE.test_rtsp(body.get("rtsp"))})
            if path == "/api/cameras":
                return self._json({"data": ENGINE.add_camera(body.get("label"), body.get("channel"), body.get("siteBssId"), body.get("rtsp"))})
            if path.startswith("/api/cameras/"):
                parts = path[len("/api/cameras/"):].split("/")
                try:
                    cid = int(parts[0])
                except (IndexError, ValueError):
                    return self._json({"error": "Camera not found."}, 404)
                action = parts[1] if len(parts) > 1 else ""
                if action in ("rtsp", "channel"):
                    return self._json({"error": "Camera connection details cannot be edited after saving."}, 403)
                if action == "mode":
                    return self._json({"data": ENGINE.set_mode(cid, body.get("mode"))})
                if action == "attendance-mode":
                    return self._json({"data": ENGINE.set_camera_attendance_mode(cid, body.get("mode"))})
                if action == "claim":
                    try:
                        return self._json({"data": ENGINE.claim(cid, body.get("otp"))})
                    except BssError as exc:
                        if exc.status_code == 409 and exc.body.get("takeoverRequired"):
                            return self._json({"error": str(exc), "takeoverRequired": True}, 409)
                        raise
                if action == "takeover-otp":
                    return self._json({"data": ENGINE.takeover_otp(cid)})
                if action == "test":
                    return self._json({"data": ENGINE.test_rtsp(body.get("rtsp"))})
                if action == "manual-enroll":
                    operation = parts[2] if len(parts) > 2 else ""
                    if operation == "start":
                        return self._json({"data": ENGINE.start_manual_enrollment(
                            cid, body.get("bssWorkerId"))}, 201)
                    if operation == "capture-one":
                        return self._json({"data": ENGINE.capture_manual_slot(
                            cid, body.get("captureId"), body.get("slot"))}, 201)
                    if operation == "retake":
                        return self._json({"data": ENGINE.retake_manual_slot(
                            cid, body.get("captureId"), body.get("slot"))})
                    if operation == "confirm":
                        return self._json({"data": ENGINE.confirm_manual_enrollment(
                            cid, body.get("captureId"), bool(body.get("confirmMismatch")))}, 201)
                    if operation == "cancel":
                        return self._json({"data": ENGINE.cancel_manual_enrollment(cid, body.get("captureId"))})
            if path.startswith("/api/workers/"):
                parts = path[len("/api/workers/"):].split("/")
                if len(parts) >= 2 and parts[1] == "face-source":
                    return self._json({"data": ENGINE.set_worker_face_source(
                        unquote(parts[0]), body.get("source"))})
            if path == "/api/logout":
                return self._json({"data": ENGINE.logout()})
            return self._json({"error": "Not found."}, 404)
        except BssError as exc:
            payload = {"error": str(exc)}
            if isinstance(exc.body, dict):
                payload.update(exc.body)
            code = exc.status_code if 400 <= int(exc.status_code or 0) < 600 else 400
            return self._json(payload, code)
        except ValueError as exc:
            return self._json({"error": str(exc)}, 400)
        except Exception as exc:  # noqa: BLE001
            LOG.exception("API error: %s", exc)
            return self._json({"error": "Unexpected engine error."}, 500)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/api/cameras/"):
            try:
                cid = int(unquote(path[len("/api/cameras/"):]))
                return self._json({"data": ENGINE.remove_camera(cid)})
            except (ValueError, BssError) as exc:
                return self._json({"error": str(exc)}, 400)
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Remove camera error: %s", exc)
                return self._json({"error": "Unexpected engine error."}, 500)
        return self._json({"error": "Not found."}, 404)


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _install_weights(home):
    target = Path(home) / ".deepface" / "weights"
    target.mkdir(parents=True, exist_ok=True)
    candidates = [
        Path(getattr(sys, "_MEIPASS", "")) / "weights",
        Path(__file__).resolve().parent / "weights",
        Path(__file__).resolve().parent.parent / "face_embedding" / "weights",
    ]
    expected = {
        "arcface.onnx": ARCFACE_ONNX_SHA,
        "retinaface.onnx": RETINAFACE_ONNX_SHA,
    }
    for source in candidates:
        if all((source / name).exists() for name in expected):
            for name, digest in expected.items():
                if _sha256(source / name) != digest:
                    raise SystemExit(f"Model weight checksum mismatch: {name}")
            for name in expected:
                destination = target / name
                if (not destination.exists()
                        or destination.stat().st_size != (source / name).stat().st_size
                        or _sha256(destination) != expected[name]):
                    shutil.copy2(source / name, destination)
            os.environ["DEEPFACE_HOME"] = str(Path(home))
            return True
    os.environ.setdefault("DEEPFACE_HOME", str(Path.home()))
    return False


def main():
    global ENGINE
    parser = argparse.ArgumentParser(description="BSS attendance client engine")
    parser.add_argument("--home", default=os.environ.get("BSS_ENGINE_HOME", str(Path.home() / ".bss-attendance")))
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, str(args.log_level).upper(), logging.INFO),
                        format="%(asctime)s %(levelname)s %(message)s")
    _install_weights(args.home)
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS",
                          "rtsp_transport;tcp|rw_timeout;8000000|stimeout;8000000|fflags;nobuffer|flags;low_delay")
    ENGINE = Engine(args.home)
    server = None
    for attempt in range(30):
        try:
            server = EngineServer(("127.0.0.1", args.port), Handler)
            break
        except OSError as exc:
            LOG.warning("Engine port %s is not available yet (%s); retrying…", args.port, exc)
            time.sleep(1)
    if server is None:
        raise SystemExit(f"Could not bind the local engine port {args.port}.")
    print(f"ENGINE_PORT={server.server_port}", flush=True)
    LOG.info("Attendance engine listening on http://127.0.0.1:%s", server.server_port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        ENGINE.shutdown()
        ENGINE._stop.set()


if __name__ == "__main__":
    main()
