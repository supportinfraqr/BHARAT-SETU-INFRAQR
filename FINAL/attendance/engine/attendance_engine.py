#!/usr/bin/env python3
"""Local attendance client engine.

Runs on the site laptop. Captures RTSP feeds, serves a local MJPEG grid, and
only extracts/sends face embeddings when a camera is switched to Send Data.
No video, images or names leave this machine.
"""
import argparse
import hashlib
import json
import logging
import os
import platform
import shutil
import sys
import threading
import time
import uuid
from datetime import datetime, time as dt_time, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import cv2
import numpy as np
import requests

LOG = logging.getLogger("attendance-engine")
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
            return json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return {
                "baseUrl": DEFAULT_BSS,
                "fingerprint": _fingerprint(),
                "token": "",
                "deviceId": "",
                "site": {},
                "cameras": {},
            }

    def save(self):
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
            tmp.replace(self.path)

    def camera(self, label):
        return self.data.setdefault("cameras", {}).setdefault(label, {
            "label": label, "rtsp": "", "mode": "LIVE",
        })


class CameraWorker:
    def __init__(self, engine, label):
        self.engine = engine
        self.label = label
        self.lock = threading.Lock()
        self.mode = "LIVE"
        self.rtsp = ""
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
        self._last_faces = 0

    def snapshot(self):
        with self.lock:
            return {
                "label": self.label,
                "rtspConfigured": bool(self.rtsp),
                "mode": self.mode,
                "status": self.status,
                "fps": round(self.fps, 1),
                "lastEventAt": _iso(self.engine.last_event_at.get(self.label)),
            }

    def set_rtsp(self, rtsp):
        rtsp = str(rtsp or "").strip()
        if rtsp and not (rtsp.lower().startswith("rtsp://") or rtsp.lower().startswith("rtsps://")):
            raise ValueError("Only RTSP URLs are supported.")
        self.stop()
        self.rtsp = rtsp
        self.engine.store.camera(self.label)["rtsp"] = rtsp
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
        self.engine.store.camera(self.label)["mode"] = mode
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
            return self._jpeg

    def _ensure_ai(self):
        if self._ai_thread and self._ai_thread.is_alive():
            return
        self._ai_thread = threading.Thread(target=self._ai_loop, daemon=True)
        self._ai_thread.start()

    def _ai_loop(self):
        while self._running or self.mode == "SENDING":
            if self.mode != "SENDING":
                time.sleep(1)
                continue
            frame = self.frame()
            if frame is None:
                time.sleep(1)
                continue
            if not self.engine.send_allowed(self.label):
                time.sleep(2)
                continue
            try:
                event = self._recognise(frame)
                if event:
                    self.engine.send_event(self.label, event[0], event[1])
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Face processing failed for %s: %s", self.label, exc)
            time.sleep(1.5)

    def _recognise(self, frame):
        if time.time() - self._last_sent < 25:
            return None
        from deepface import DeepFace

        reps = DeepFace.represent(
            img_path=frame, model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False, align=True,
        )
        if not reps:
            return None
        rep = max(reps, key=lambda r: (r.get("facial_area") or {}).get("w", 0) * (r.get("facial_area") or {}).get("h", 0))
        area = rep.get("facial_area") or {}
        if min(int(area.get("w", 0)), int(area.get("h", 0))) < 70:
            return None
        embedding = np.asarray(rep.get("embedding") or [], dtype=np.float32)
        if embedding.size != 512 or float(np.linalg.norm(embedding)) <= 0:
            return None
        with self.lock:
            self._last_faces = len(reps)
            previous = self._last_embedding
            self._last_embedding = embedding
        if previous is not None and previous.size == embedding.size:
            denom = float(np.linalg.norm(previous) * np.linalg.norm(embedding))
            if denom > 0:
                distance = 1.0 - float(np.dot(previous, embedding) / denom)
                if distance < 0.30 and time.time() - self._last_sent < 300:
                    return None
        self._last_sent = time.time()
        return embedding.tolist(), _now()


class Engine:
    def __init__(self, home):
        self.store = Store(home)
        self.lock = threading.RLock()
        self.bss = str(self.store.data.get("baseUrl") or DEFAULT_BSS).rstrip("/")
        self.token = str(self.store.data.get("token") or "")
        self.device_id = str(self.store.data.get("deviceId") or "")
        self.site = self.store.data.get("site") or {}
        self.bss_cameras = {}
        self.workers = {}
        self.last_heartbeat = None
        self.last_event_at = {}
        self.outbox = list(self.store.data.get("outbox") or [])
        self.face_ready = False
        self.face_error = ""
        self._stop = threading.Event()
        self._load_local_cameras()
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()

    def _load_local_cameras(self):
        for label, camera in (self.store.data.get("cameras") or {}).items():
            worker = CameraWorker(self, label)
            worker.rtsp = str(camera.get("rtsp") or "")
            worker.mode = str(camera.get("mode") or "LIVE").upper()
            if worker.mode not in ("LIVE", "SENDING"):
                worker.mode = "LIVE"
            self.workers[label] = worker
            if worker.rtsp:
                worker.start()
            if worker.mode == "SENDING":
                worker._ensure_ai()

    def _headers(self):
        return {"X-Edge-Token": self.token, "Content-Type": "application/json"}

    def bss_call(self, method, path, payload=None, timeout=20):
        if not self.token:
            raise BssError("Client is not activated.")
        url = f"{self.bss}{path}"
        try:
            response = requests.request(method, url, headers=self._headers(), json=payload, timeout=timeout)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        try:
            body = response.json()
        except ValueError:
            body = {}
        if not response.ok:
            raise BssError(body.get("error") or f"BSS returned {response.status_code}.")
        return body

    def request_otp(self, phone):
        url = f"{self.bss}/v1/edge/activate/request-otp"
        try:
            response = requests.post(url, json={"phone": phone}, timeout=20)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        body = response.json() if response.content else {}
        if not response.ok:
            raise BssError(body.get("error") or "Could not send OTP.")
        return body

    def activate(self, phone, otp, site_code, device_name):
        url = f"{self.bss}/v1/edge/activate/verify"
        payload = {
            "phone": phone, "otp": otp, "siteCode": site_code,
            "deviceFingerprint": self.store.data.get("fingerprint"),
            "deviceName": device_name or platform.node(),
            "version": "1.0.0",
            "cameras": [{"label": label} for label in self.workers],
        }
        try:
            response = requests.post(url, json=payload, timeout=30)
        except requests.RequestException as exc:
            raise BssError(f"BSS is unreachable: {exc}") from exc
        body = response.json() if response.content else {}
        if not response.ok:
            raise BssError(body.get("error") or "Activation failed.")
        data = body.get("data") or {}
        with self.lock:
            self.token = data.get("token") or ""
            self.device_id = data.get("deviceId") or ""
            self.site = data.get("site") or {}
            self.store.data.update({
                "token": self.token, "deviceId": self.device_id, "site": self.site,
            })
            self.store.save()
        self.refresh_config()
        return self.status()

    def refresh_config(self):
        body = self.bss_call("GET", "/v1/edge/config")
        data = body.get("data") or {}
        device = data.get("device") or {}
        with self.lock:
            self.site = {
                "id": device.get("siteId"), "code": device.get("siteCode"),
                "name": device.get("siteName"),
            }
            self.store.data["site"] = self.site
            for camera in device.get("cameras") or []:
                self.bss_cameras[camera.get("label")] = camera
                worker = self.workers.get(camera.get("label"))
                if worker is None:
                    worker = CameraWorker(self, camera.get("label"))
                    self.workers[worker.label] = worker
                    local = self.store.camera(worker.label)
                    worker.rtsp = str(local.get("rtsp") or "")
                    worker.mode = str(local.get("mode") or "LIVE").upper()
                    if worker.rtsp:
                        worker.start()
                if worker.mode == "SENDING" and camera.get("allowedIp"):
                    worker._ensure_ai()
            self.store.save()
        return self.status()

    def send_allowed(self, label):
        camera = self.bss_cameras.get(label)
        if not camera:
            return False
        if not camera.get("allowedIp"):
            return False
        return schedule_active(camera)

    def send_event(self, label, embedding, when):
        event = {
            "eventId": str(uuid.uuid4()), "cameraLabel": label,
            "occurredAt": when.isoformat(), "type": "FACE",
            "embedding": embedding, "modelVersion": MODEL_VERSION,
        }
        with self.lock:
            self.outbox.append(event)
            self.outbox = self.outbox[-500:]
            self.store.data["outbox"] = self.outbox
            self.store.save()
        self.flush_outbox()

    def flush_outbox(self):
        with self.lock:
            pending = list(self.outbox)
        if not pending or not self.token:
            return
        for start in range(0, len(pending), 100):
            batch = pending[start:start + 100]
            try:
                body = self.bss_call("POST", "/v1/edge/events", {"events": batch})
            except BssError as exc:
                LOG.warning("Event send failed: %s", exc)
                return
            results = ((body.get("data") or {}).get("results") or [])
            handled = {str(r.get("eventId")) for r in results if r.get("eventId")}
            labels = {str(e.get("eventId")): e.get("cameraLabel") for e in batch}
            with self.lock:
                self.outbox = [e for e in self.outbox if e.get("eventId") not in handled]
                self.store.data["outbox"] = self.outbox
                for result in results:
                    if result.get("status") in ("ACCEPTED", "UNKNOWN"):
                        label = labels.get(str(result.get("eventId")))
                        if label:
                            self.last_event_at[label] = _now()
                self.store.save()

    def set_mode(self, label, mode):
        worker = self.workers.get(label)
        if worker is None:
            raise ValueError("Camera not found.")
        mode = str(mode or "").upper()
        if mode == "SENDING":
            camera = self.bss_cameras.get(label)
            if not camera:
                raise ValueError("The client has not synced this camera with BSS yet.")
            if not camera.get("allowedIp"):
                raise ValueError("Set the allowed IP for this camera in BSS first.")
            if not schedule_active(camera):
                raise ValueError("This camera is outside its capture window.")
        worker.set_mode(mode)
        self.store.save()
        return self.status()

    def add_camera(self, label, rtsp):
        label = str(label or "").strip()[:120]
        if not label:
            raise ValueError("Camera label is required.")
        worker = self.workers.get(label)
        if worker is None:
            worker = CameraWorker(self, label)
            self.workers[label] = worker
        worker.set_rtsp(rtsp)
        self.store.save()
        return self.status()

    def remove_camera(self, label):
        worker = self.workers.pop(label, None)
        if worker:
            worker.stop()
        self.store.data.get("cameras", {}).pop(label, None)
        self.store.save()
        return self.status()

    def _heartbeat_loop(self):
        while not self._stop.is_set():
            try:
                if self.token:
                    cameras = []
                    for label, worker in list(self.workers.items()):
                        bss_cam = self.bss_cameras.get(label) or {}
                        mode = worker.mode
                        if mode == "SENDING" and not schedule_active(bss_cam):
                            mode = "SCHEDULED_OFF"
                        cameras.append({
                            "label": label, "mode": mode,
                            "status": worker.status, "fps": round(worker.fps, 1),
                        })
                    body = self.bss_call("POST", "/v1/edge/heartbeat", {
                        "version": "1.0.0", "cameras": cameras,
                    }, timeout=15)
                    self.last_heartbeat = _now()
                    self.flush_outbox()
            except BssError as exc:
                LOG.warning("Heartbeat failed: %s", exc)
            except Exception as exc:  # noqa: BLE001
                LOG.exception("Heartbeat error: %s", exc)
            self._stop.wait(20)

    def status(self):
        cameras = []
        for label, worker in sorted(self.workers.items()):
            bss_cam = self.bss_cameras.get(label) or {}
            allowed = schedule_active(bss_cam) if bss_cam else False
            reason = ""
            if not bss_cam:
                reason = "Waiting for BSS sync"
            elif not bss_cam.get("allowedIp"):
                reason = "Allowed IP not set in BSS"
            elif not allowed:
                reason = "Outside capture window"
            cameras.append({
                **worker.snapshot(),
                "allowedIp": bss_cam.get("allowedIp") or "",
                "scheduleEnabled": bool(bss_cam.get("scheduleEnabled")),
                "schedule": schedule_text(bss_cam) if bss_cam else "Not synced",
                "sendAllowed": bool(bss_cam.get("allowedIp")) and allowed,
                "sendBlockedReason": reason,
            })
        return {
            "activated": bool(self.token and self.device_id),
            "deviceId": self.device_id,
            "site": self.site,
            "bss": self.bss,
            "bssConnected": self.last_heartbeat is not None,
            "lastHeartbeatAt": _iso(self.last_heartbeat),
            "faceModel": {"model": MODEL_NAME, "version": MODEL_VERSION, "detector": DETECTOR_BACKEND},
            "cameras": cameras,
            "outbox": len(self.outbox),
        }


ENGINE = None


class Handler(BaseHTTPRequestHandler):
    server_version = "BSSAttendance/1.0"

    def log_message(self, fmt, *args):
        LOG.debug(fmt, *args)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

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
        if path == "/api/health":
            return self._json({"ok": True})
        if path.startswith("/stream/"):
            label = unquote(path[len("/stream/"):])
            worker = ENGINE.workers.get(label)
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
                result = ENGINE.request_otp(body.get("phone"))
                return self._json({"data": result})
            if path == "/api/activate/verify":
                result = ENGINE.activate(
                    body.get("phone"), body.get("otp"), body.get("siteCode"), body.get("deviceName"))
                return self._json({"data": result})
            if path == "/api/config/refresh":
                return self._json({"data": ENGINE.refresh_config()})
            if path == "/api/cameras":
                return self._json({"data": ENGINE.add_camera(body.get("label"), body.get("rtsp"))})
            if path.startswith("/api/cameras/") and path.endswith("/mode"):
                label = unquote(path[len("/api/cameras/"):-len("/mode")])
                return self._json({"data": ENGINE.set_mode(label, body.get("mode"))})
            if path == "/api/logout":
                ENGINE.token = ""
                ENGINE.device_id = ""
                ENGINE.outbox = []
                ENGINE.store.data.update({"token": "", "deviceId": "", "site": {}, "outbox": []})
                ENGINE.store.save()
                return self._json({"data": ENGINE.status()})
            return self._json({"error": "Not found."}, 404)
        except (BssError, ValueError) as exc:
            return self._json({"error": str(exc)}, 400)
        except Exception as exc:  # noqa: BLE001
            LOG.exception("API error: %s", exc)
            return self._json({"error": "Unexpected engine error."}, 500)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/api/cameras/"):
            label = unquote(path[len("/api/cameras/"):])
            return self._json({"data": ENGINE.remove_camera(label)})
        return self._json({"error": "Not found."}, 404)


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _install_weights(home):
    """Copy bundled ArcFace/RetinaFace weights into DeepFace's home on first run."""
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
                actual = _sha256(source / name)
                if actual != digest:
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
    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
    os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS",
                          "rtsp_transport;tcp|rw_timeout;8000000|stimeout;8000000|fflags;nobuffer|flags;low_delay")
    ENGINE = Engine(args.home)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    LOG.info("Attendance engine listening on http://127.0.0.1:%s", args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        ENGINE._stop.set()


if __name__ == "__main__":
    main()
