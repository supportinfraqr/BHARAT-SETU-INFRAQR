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


def start_session(site_key, source=None):
    payload = {"site": str(site_key)}
    if source:
        payload["source"] = str(source)
    return _request("POST", "/session/start", payload)


def stop_session(site_key):
    return _request("POST", "/session/stop", {"site": str(site_key)})


def list_sessions():
    return _request("GET", "/sessions").get("sessions", [])


def session_for(site_key):
    key = str(site_key)
    return next((s for s in list_sessions() if str(s.get("site")) == key), None)


def enroll(person, images):
    """Enrol a worker's face photos into the pipeline gallery (keyed by BSS id)."""
    return _request("POST", "/enroll", {"person": str(person), "images": list(images)}, timeout=60)


def recognize_frame(site_key, image):
    """Send one browser-captured frame (base64 jpeg) for recognition."""
    return _request("POST", "/frame", {"site": str(site_key), "image": image}, timeout=30)


def detections(site_key, since=None, limit=50):
    params = {"site": str(site_key), "limit": int(limit)}
    if since:
        params["since"] = float(since)
    return _request("GET", "/detections", params=params)
