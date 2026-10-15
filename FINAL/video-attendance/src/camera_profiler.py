"""Per-camera profiler: measure a feed, suggest tuning overrides.

Runs BEFORE models load (no YOLO/DeepFace needed): opens the camera's source
for `seconds`, samples frames, and measures what actually varies between
CCTV installations — resolution, sharpness, brightness, motion level, FPS.
`suggest_overrides()` maps those measurements onto the existing config knobs
so each port gets independent processing matched to its own graphics.

Usage:
    python tools/profile_camera.py --camera gate --seconds 30
writes the suggested `overrides:` block to stdout; paste it under that
camera's entry in config.yaml (or store per-camera in the fleet DB later).
"""
from dataclasses import dataclass
from typing import Any, Dict, Optional

import cv2
import numpy as np


@dataclass
class ProfileStats:
    width: int = 0
    height: int = 0
    measured_fps: float = 0.0
    mean_brightness: float = 0.0
    mean_sharpness: float = 0.0
    motion_level: float = 0.0
    frames_seen: int = 0
    median_face_px: float = 0.0  # 0 = not sampled (see face_sample_every)
    label: str = ""


def _sharpness(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _haar_faces(gray: np.ndarray):
    """Rough face-size sampling with the Haar cascade shipped inside OpenCV.
    Sizing only — never identity. Returns face widths in gray-scale px."""
    global _HAAR
    try:
        if _HAAR is None:
            path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            _HAAR = cv2.CascadeClassifier(path)
        if _HAAR is None or _HAAR.empty():
            return []
        found = _HAAR.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4,
                                       minSize=(24, 24))
        return [float(w) for (x, y, w, h) in found]
    except Exception:
        return []

_HAAR = None


def profile_frames(get_frame, seconds: float = 30.0, max_frames: int = 300,
                   face_sample_every: int = 0) -> ProfileStats:
    """Profile from a zero-arg frame supplier (returns None when exhausted).

    Factored out of the VideoSource path so tests/simulator can feed frames
    without a real camera. `face_sample_every=N` runs the Haar size sampler
    every Nth frame (0 = off) to detect face-level mounts.
    """
    import time
    stats = ProfileStats()
    sharply: list = []
    bright: list = []
    face_px: list = []
    prev: Optional[np.ndarray] = None
    motion: list = []
    t0 = time.time()
    n = 0
    while n < max_frames and (time.time() - t0) < seconds:
        frame = get_frame()
        if frame is None:
            time.sleep(0.05)
            continue
        n += 1
        h, w = frame.shape[:2]
        stats.width, stats.height = w, h
        gray = cv2.cvtColor(cv2.resize(frame, (480, 270)), cv2.COLOR_BGR2GRAY)
        sharply.append(_sharpness(gray))
        bright.append(float(gray.mean()))
        if face_sample_every and n % face_sample_every == 0:
            scale = w / 480.0
            face_px.extend(v * scale for v in _haar_faces(gray))
        if prev is not None and prev.shape == gray.shape:
            motion.append(float(np.mean(cv2.absdiff(gray, prev)) / 255.0))
        prev = gray
    dt = max(time.time() - t0, 1e-6)
    stats.frames_seen = n
    stats.measured_fps = n / dt if n else 0.0
    stats.mean_sharpness = float(np.mean(sharply)) if sharply else 0.0
    stats.mean_brightness = float(np.mean(bright)) if bright else 0.0
    stats.motion_level = float(np.mean(motion)) if motion else 0.0
    stats.median_face_px = float(np.median(face_px)) if face_px else 0.0
    stats.label = classify(stats)
    return stats


def classify(s: ProfileStats) -> str:
    """Human-readable bucket: distance x focus x light x motion."""
    parts = []
    if s.median_face_px >= 80:
        parts.append("face-level")
    else:
        parts.append("hi-res" if s.width >= 1280 else ("mid-res" if s.width >= 800 else "lo-res"))
    parts.append("sharp" if s.mean_sharpness >= 120 else ("soft" if s.mean_sharpness < 40 else "ok-focus"))
    parts.append("dim" if s.mean_brightness < 60 else ("bright" if s.mean_brightness > 170 else "ok-light"))
    parts.append("static" if s.motion_level < 0.005 else "active")
    return "+".join(parts)


def suggest_entry(s: ProfileStats) -> Dict[str, Any]:
    """Entry-level suggestion (sibling of suggest_overrides): returns
    {"face_level": bool} — the profiler's verdict on mount distance."""
    return {"face_level": bool(s.median_face_px >= 80)}


def suggest_overrides(s: ProfileStats) -> Dict[str, Any]:
    """Map measurements onto existing config knobs. Conservative: only moves
    knobs with a clear signal, everything else stays global default."""
    over: Dict[str, Any] = {}
    det: Dict[str, Any] = {}
    face: Dict[str, Any] = {}

    # Small faces need a wider infer frame and a lower attempt floor.
    if s.width < 800:
        det["infer_width"] = 960
        face["auto_register_min_face_px"] = 45
    elif s.width >= 1280:
        det["infer_width"] = 640

    # Soft feeds: don't let the blur gate eat real faces; dim feeds: open
    # person confidence slightly since contrast is poor.
    if s.mean_sharpness < 40:
        face["min_blur"] = 8
    if s.mean_brightness < 60:
        det["conf"] = 0.30

    # Static-corridor note: NO refresh_interval_s suggestion on purpose.
    # Slowing face re-identification delays naming a newly arrived person;
    # under the accuracy-first policy that trade is rejected — DeepFace calls
    # are async (FaceWorker) and never block the annotation loop anyway.

    if det:
        over["detector"] = det
    if face:
        over["face"] = face
    return over


def profile_camera_source(config: dict, source: str, seconds: float = 20.0,
                          face_sample_every: int = 10) -> ProfileStats:
    """Open `source` (same syntax as --source) and profile it. Models not loaded."""
    from src.video_source import VideoSource
    cfg = {"mode": "auto", "webcam_index": 0, "rtsp_urls": [], "local_files": [],
           "reconnect_delay_s": 5, "webcam_width": 1280, "webcam_height": 720}
    if source.isdigit():
        cfg["mode"] = "webcam"
        cfg["webcam_index"] = int(source)
    elif source.lower().startswith(("rtsp://", "http://", "https://")):
        key = "rtsp_urls" if source.lower().startswith("rtsp://") else "http_urls"
        cfg["mode"] = "rtsp" if source.lower().startswith("rtsp://") else "http"
        cfg[key] = [source]
    else:
        cfg["mode"] = "file"
        cfg["local_files"] = [source]
    vs = VideoSource({"source": cfg})
    if not vs.start():
        raise RuntimeError(f"cannot open source {source!r}")
    try:
        return profile_frames(lambda: vs.read()[1], seconds=seconds,
                              face_sample_every=face_sample_every)
    finally:
        vs.stop()
