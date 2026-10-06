"""Passive face anti-spoofing (liveness) gate.

Distinguishes a real human face from a photograph shown on screen (replay
attack) or a printed photo (print attack), using MiniFASNetV2 exported to
ONNX (~2 MB, ~10-30 ms on CPU — no PyTorch needed at runtime).

Model: 3-class softmax [paper-attack, real, screen-attack] on an 80x80 BGR
face crop taken with a 2.7x margin around the detected face box (upstream
preprocessing of Silent-Face-Anti-Spoofing). Liveness score = real prob.
Input is float32 BGR in [0, 255] — NOT divided by 255.

Weights auto-download on first use to data/models/. If the model (or
onnxruntime) is unavailable, the gate fails OPEN with a one-time warning so
the pipeline keeps running — check the log to confirm protection is active.
"""
import os
import threading
import urllib.request
from typing import Optional, Tuple

import cv2
import numpy as np

DEFAULT_URL = (
    "https://github.com/yakhyo/face-anti-spoofing"
    "/releases/download/weights/MiniFASNetV2.onnx"
)
DEFAULT_PATH = os.path.join("data", "models", "minifasnetv2.onnx")

# Upstream crop contract: 2.7x margin around the face box, 80x80 BGR / 255.
_CROP_SCALE = 2.7
_INPUT_SIZE = 80


def ensure_weights(path: str = DEFAULT_PATH, url: str = DEFAULT_URL) -> bool:
    """Download ONNX weights if missing. Returns True when file exists."""
    if os.path.isfile(path):
        return True
    try:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        print(f"[antispoof] downloading weights (~2 MB) to {path} ...")
        urllib.request.urlretrieve(url, path)
        return os.path.isfile(path)
    except Exception as e:
        print(f"[antispoof] download failed: {e}")
        return False


def prepare_crop(frame_bgr: np.ndarray,
                 face_box: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
    """2.7x-margin face crop -> (1,3,80,80) float32 BGR in [0,1]."""
    h, w = frame_bgr.shape[:2]
    x1, y1, x2, y2 = (int(v) for v in face_box)
    cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
    bw, bh = max(1, x2 - x1), max(1, y2 - y1)
    half = max(bw, bh) * _CROP_SCALE / 2.0
    sx1, sy1 = int(max(0, cx - half)), int(max(0, cy - half))
    sx2, sy2 = int(min(w, cx + half)), int(min(h, cy + half))
    if sx2 <= sx1 or sy2 <= sy1:
        return None
    crop = cv2.resize(frame_bgr[sy1:sy2, sx1:sx2],
                      (_INPUT_SIZE, _INPUT_SIZE),
                      interpolation=cv2.INTER_LINEAR)
    # Upstream contract: BGR float32 in [0, 255], no normalization.
    blob = crop.astype(np.float32).transpose(2, 0, 1)[None, ...]
    return np.ascontiguousarray(blob)


class AntiSpoof:
    """Thread-safe lazy wrapper around the ONNX liveness model."""

    def __init__(self, model_path: str = DEFAULT_PATH, url: str = DEFAULT_URL):
        self.model_path = model_path
        self.url = url
        self._session = None
        self._warned = False
        self._lock = threading.Lock()

    def _warn_once(self, msg: str) -> None:
        if not self._warned:
            self._warned = True
            print(f"[antispoof] WARNING: {msg} — gate is OPEN (all faces pass)")

    def available(self) -> bool:
        with self._lock:
            return self._session is not None

    def load(self) -> bool:
        """Load onnxruntime session (idempotent). False = gate stays open."""
        with self._lock:
            if self._session is not None:
                return True
            try:
                import onnxruntime as ort
            except ImportError:
                self._warn_once("onnxruntime not installed (pip install onnxruntime)")
                return False
            if not ensure_weights(self.model_path, self.url):
                self._warn_once(f"weights missing at {self.model_path}")
                return False
            try:
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 2
                self._session = ort.InferenceSession(
                    self.model_path, sess_options=opts,
                    providers=["CPUExecutionProvider"])
                return True
            except Exception as e:
                self._warn_once(f"model load failed: {e}")
                return False

    def liveness(self, frame_bgr: np.ndarray,
                 face_box: Tuple[int, int, int, int]) -> Optional[float]:
        """Live probability in [0,1], or None when the gate is unavailable."""
        with self._lock:
            sess = self._session
        if sess is None:
            return None
        blob = prepare_crop(frame_bgr, face_box)
        if blob is None:
            return None
        try:
            with self._lock:
                out = sess.run(None, {sess.get_inputs()[0].name: blob})[0]
            probs = np.exp(out[0] - out[0].max())
            probs /= probs.sum()
            return float(probs[1])  # class order: [paper, REAL, screen]
        except Exception:
            return None
