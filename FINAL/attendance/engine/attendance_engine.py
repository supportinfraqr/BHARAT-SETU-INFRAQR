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
from urllib.parse import urlparse, unquote
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
APP_VERSION = "1.4.2"
MODEL_NAME = "ArcFace"
MODEL_VERSION = "deepface-0.0.101-tf-2.21.0"
DETECTOR_BACKEND = "retinaface"
ARCFACE_SHA = "6336979c0c602cae08d1122a66f4dfb862d059bbcd8ef80306aef2b2249b0c93"
RETINAFACE_SHA = "ecb2393a89da3dd3d6796ad86660e298f62a0c8ae7578d92eb6af14e0bb93adf"
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
        self.threshold = float(payload.get("threshold") or 0.6)
        self.margin = float(payload.get("margin") or 0.08)
        self.topk = max(1, int(payload.get("topk") or 3))
        self.votes = max(1, int(payload.get("votes") or 2))
        self.weights_sha = str(payload.get("weightsSha") or ARCFACE_SHA)
        self.entries = []  # (site_id, bss_worker_id, float32 embedding)
        for worker in payload.get("workers") or []:
            worker_id = str(worker.get("bssWorkerId") or "").strip().upper()
            if not worker_id:
                continue
            site_ids = [int(site) for site in (worker.get("siteIds") or []) if str(site).isdigit()]
            for encoded in worker.get("embeddings") or []:
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
                    self.entries.append((site_id, worker_id, vector / norm))

    @property
    def ready(self):
        return bool(self.entries and self.model_version == MODEL_VERSION)

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
        for entry_site, worker_id, stored in self.entries:
            if entry_site != site_id:
                continue
            denom = float(np.linalg.norm(stored))
            if denom <= 0:
                continue
            distance = 1.0 - float(np.dot(stored, vector) / denom)
            by_worker.setdefault(worker_id, []).append(distance)
        ranked, short = [], None
        for worker_id, distances in by_worker.items():
            distances.sort()
            votes = sum(1 for distance in distances[:self.topk] if distance <= self.threshold)
            if votes >= self.votes:
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
        self._last_sent = 0.0
        self._last_embedding = None
        self._face_boxes = []
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

    def frame(self):
        with self.lock:
            return None if self._frame is None else self._frame.copy()

    def jpeg(self):
        with self.lock:
            boxes = list(self._face_boxes)
            frame = None if self._frame is None else self._frame.copy()
            raw = self._jpeg
        if not boxes or frame is None:
            return raw
        for x, y, w, h in boxes:
            cv2.rectangle(frame, (int(x), int(y)), (int(x + w), int(y + h)), (60, 190, 100), 2)
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
                time.sleep(2)
                continue
            if not self.engine.gallery.ready:
                time.sleep(1)
                continue
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
                detections = self._recognise(frame)
                camera = self.engine.bss_cameras.get(self.camera_id) or {}
                site_id = camera.get("siteId")
                when = _now()
                for embedding, box in detections:
                    match = self.engine.gallery.match(embedding, site_id)
                    if match is not None:
                        matched_worker, distance = match
                        self.engine.send_event(self, matched_worker, when, distance, box)
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Face processing failed for %s: %s", self.label, exc)
            finally:
                self.engine.gate.release()

    def _recognise(self, frame):
        """Return every quality face in the frame: [(embedding, [x,y,w,h]), ...]."""
        self.engine.configure_gpu()
        from deepface import DeepFace

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
        with self.lock:
            self._face_boxes = boxes
            self.faces_detected += len(boxes)
        return detections


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
        self.last_event_at = {}
        self.gate = ResourceGate(2)
        self.resource_settings = self._normalise_resources(self.store.data.get("resources") or {})
        self._gpu_configured = False
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

    def _detected_system(self):
        cpu_count = (psutil.cpu_count(logical=True) if psutil else os.cpu_count()) or 1
        cpu_percent = None
        memory_total = None
        memory_available = None
        process_memory = None
        if psutil is not None:
            try:
                cpu_percent = round(float(psutil.cpu_percent(interval=None)), 1)
                memory = psutil.virtual_memory()
                memory_total = round(memory.total / (1024 * 1024))
                memory_available = round(memory.available / (1024 * 1024))
                process_memory = round(psutil.Process().memory_info().rss / (1024 * 1024))
            except Exception:
                pass
        return {
            "cpuCores": int(cpu_count),
            "cpuPercent": cpu_percent,
            "memoryTotalMb": memory_total,
            "memoryAvailableMb": memory_available,
            "processMemoryMb": process_memory,
            "platform": platform.system(),
            "machine": platform.machine(),
        }

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
        return {"cpuCores": cores, "maxCameraWorkers": workers, "processInterval": interval,
                "gpuMode": gpu_mode, "gpuMemoryMb": gpu_memory_mb}

    def _apply_resources(self, settings, persist=True):
        detected = self._detected_system()
        total = max(1, int(detected.get("cpuCores") or 1))
        cores = int(settings.get("cpuCores") or 0)
        if psutil is not None:
            try:
                psutil.Process().cpu_affinity(list(range(min(cores, total) if cores > 0 else total)))
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

    def resource_payload(self):
        return {"detected": self._detected_system(), "settings": dict(self.resource_settings),
                "gpu": dict(self.gpu_status)}

    def configure_gpu(self):
        if self._gpu_configured:
            return
        self._gpu_configured = True
        mode = str(self.resource_settings.get("gpuMode") or "auto")
        if mode == "off":
            self.gpu_status = {"active": False, "mode": mode, "devices": [], "message": "GPU disabled"}
            return
        try:
            import tensorflow as tf
            devices = tf.config.list_physical_devices("GPU")
            if not devices:
                self.gpu_status = {"active": False, "mode": mode, "devices": [], "message": "No GPU detected"}
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
                               "memoryLimitMb": limit_mb,
                               "message": "GPU enabled" if configured else "GPU configuration failed"}
            LOG.info("GPU status: %s", self.gpu_status)
        except Exception as exc:  # noqa: BLE001
            self.gpu_status = {"active": False, "mode": mode, "devices": [],
                               "message": f"GPU unavailable: {type(exc).__name__}"}
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

    def send_allowed(self, worker):
        camera = self.bss_cameras.get(worker.camera_id) or {}
        return bool(camera.get("approvalStatus") == "APPROVED"
                    and camera.get("allowedIp") and camera.get("claimedByThisDevice")
                    and schedule_active(camera) and worker.camera_token)

    def send_event(self, worker, matched_worker, when, distance, face_box=None):
        event = {
            "eventId": str(uuid.uuid4()), "cameraId": worker.camera_id,
            "occurredAt": when.isoformat(), "type": "FACE",
            "bssWorkerId": matched_worker,
            "matchDistance": round(float(distance), 6),
            "galleryVersion": self.gallery.version,
            "modelVersion": MODEL_VERSION,
            "faceBox": list(face_box or []),
        }
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
            "faceModel": {"model": MODEL_NAME, "version": MODEL_VERSION, "detector": DETECTOR_BACKEND},
            "gallery": {"ready": self.gallery.ready, "version": self.gallery.version,
                        "workers": len({e[1] for e in self.gallery.entries})},
            "gpu": dict(self.gpu_status),
            "cameras": cameras,
            "resources": self.resource_payload(),
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
        if path == "/api/test-rtsp":
            return self._json({"data": ENGINE.test_rtsp((self._body() or {}).get("rtsp"))})
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
            if path == "/api/logout":
                return self._json({"data": ENGINE.logout()})
            return self._json({"error": "Not found."}, 404)
        except (BssError, ValueError) as exc:
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
    for source in candidates:
        if (source / "arcface_weights.h5").exists() and (source / "retinaface.h5").exists():
            expected = {"arcface_weights.h5": ARCFACE_SHA, "retinaface.h5": RETINAFACE_SHA}
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
        ENGINE._stop.set()


if __name__ == "__main__":
    main()
