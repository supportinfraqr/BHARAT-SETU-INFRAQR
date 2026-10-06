"""Client for the CCTV / face-attendance session controller.

The pipeline runs on a separate host and exposes a small token-guarded HTTP API
(see FINAL/video-attendance/controller.py). Configuration comes from the
environment:

    ATTENDANCE_CONTROL_URL     e.g. http://15.206.193.173
    ATTENDANCE_CONTROL_TOKEN   shared secret (X-Attendance-Token)
"""
import os

import requests

DEFAULT_TIMEOUT = 8


class AttendanceControlError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def _config():
    url = (os.environ.get("ATTENDANCE_CONTROL_URL") or "").rstrip("/")
    token = os.environ.get("ATTENDANCE_CONTROL_TOKEN") or ""
    if not url:
        raise AttendanceControlError("Attendance control is not configured (ATTENDANCE_CONTROL_URL).", 503)
    if not token:
        raise AttendanceControlError("Attendance control is not configured (ATTENDANCE_CONTROL_TOKEN).", 503)
    return url, token


def _request(method, path, payload=None, params=None, timeout=DEFAULT_TIMEOUT):
    url, token = _config()
    try:
        response = requests.request(
            method, f"{url}{path}", json=payload, params=params,
            headers={"X-Attendance-Token": token}, timeout=timeout,
        )
    except requests.RequestException as exc:
        raise AttendanceControlError(f"Attendance controller unreachable: {exc}", 502)
    if response.status_code >= 400:
        try:
            detail = (response.json() or {}).get("error")
        except ValueError:
            detail = None
        raise AttendanceControlError(detail or f"Attendance controller error ({response.status_code}).", 502)
    try:
        return response.json()
    except ValueError:
        return {}


def start_session(site_key, cameras=None):
    """Start the CCTV pipelines for a site.

    ``cameras`` is a list of ``{"label", "source", "area"}`` dicts — one engine
    process is spawned per camera by the controller. Device/webcam sources are
    never accepted here; attendance only ever runs off configured CCTV feeds.
    """
    payload = {"site": str(site_key), "cameras": list(cameras or [])}
    return _request("POST", "/session/start", payload)


def stop_session(site_key, camera=None):
    payload = {"site": str(site_key)}
    if camera:
        payload["camera"] = str(camera)
    return _request("POST", "/session/stop", payload)


def probe(source):
    """Ask the engine to open a feed and grab one frame (connection test)."""
    return _request("POST", "/probe", {"source": str(source)}, timeout=30)


def get_frame(source, timeout=10):
    """Latest JPEG frame for a feed — for the on-screen camera preview.

    Returns ``(bytes, content_type)``. Raises :class:`AttendanceControlError`
    when the engine cannot produce a frame."""
    url, token = _config()
    try:
        response = requests.get(
            f"{url}/frame.jpg", params={"source": str(source)},
            headers={"X-Attendance-Token": token}, timeout=timeout,
        )
    except requests.RequestException as exc:
        raise AttendanceControlError(f"Attendance controller unreachable: {exc}", 502)
    if response.status_code >= 400:
        try:
            detail = (response.json() or {}).get("error")
        except ValueError:
            detail = None
        raise AttendanceControlError(detail or f"Attendance controller error ({response.status_code}).", 502)
    return response.content, response.headers.get("Content-Type", "image/jpeg")


def list_sessions():
    return _request("GET", "/sessions").get("sessions", [])


def session_for(site_key, camera=None):
    key = str(site_key)
    for session in list_sessions():
        if str(session.get("site")) != key:
            continue
        if camera is None or str(session.get("camera") or "") == str(camera):
            return session
    return None


def enroll(person, images):
    """Enrol a worker's face photos into the pipeline gallery (keyed by BSS id)."""
    return _request("POST", "/enroll", {"person": str(person), "images": list(images)}, timeout=60)


def check_faces(images):
    """Detect-only face check (no save/enrol) → per-image {index, face, reason}."""
    return _request("POST", "/check-face", {"images": list(images)}, timeout=60)


def enroll_status(person):
    """How many face vectors are enrolled for a person."""
    return _request("GET", "/enroll/status", params={"person": str(person)}, timeout=15)


def recognize_frame(site_key, image):
    """Send one browser-captured frame (base64 jpeg) for recognition."""
    return _request("POST", "/frame", {"site": str(site_key), "image": image}, timeout=30)


def detections(site_key, since=None, limit=50):
    params = {"site": str(site_key), "limit": int(limit)}
    if since:
        params["since"] = float(since)
    return _request("GET", "/detections", params=params)
