import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

import cv2
import numpy as np


@dataclass
class VitalityResult:
    score: float
    components: dict


@dataclass
class _TrackMotion:
    samples: deque = field(default_factory=lambda: deque(maxlen=256))
    last_gray: Optional[np.ndarray] = None
    active_flags: deque = field(default_factory=lambda: deque(maxlen=256))


def compute_motion_energy(
    prev_gray: Optional[np.ndarray],
    cur_gray: np.ndarray,
    bbox: Tuple[int, int, int, int],
) -> float:
    h, w = cur_gray.shape[:2]
    x1, y1, x2, y2 = bbox
    x1, y1 = max(0, int(x1)), max(0, int(y1))
    x2, y2 = min(w, int(x2)), min(h, int(y2))
    if x2 - x1 < 4 or y2 - y1 < 4:
        return 0.0
    cur_crop = cur_gray[y1:y2, x1:x2]
    if prev_gray is None:
        return 0.0
    ph, pw = prev_gray.shape[:2]
    px1, py1 = max(0, min(int(x1), pw - 4)), max(0, min(int(y1), ph - 4))
    px2, py2 = max(px1 + 4, min(int(x2), pw)), max(py1 + 4, min(int(y2), ph))
    prev_crop = prev_gray[py1:py2, px1:px2]
    if prev_crop.shape != cur_crop.shape:
        return 0.0
    diff = cv2.absdiff(cur_crop, prev_crop)
    return float(np.mean(diff) / 255.0)


class VitalityScorer:
    def __init__(self, config: dict):
        cfg = config.get("vitality", {})
        w = cfg.get("weights", {})
        self.w_age = float(w.get("age", 0.45))
        self.w_motion = float(w.get("motion", 0.25))
        self.w_posture = float(w.get("posture", 0.15))
        self.w_activity = float(w.get("activity", 0.15))
        curve = cfg.get("age_curve", {})
        self.full_score_age = float(curve.get("full_score_age", 25))
        self.zero_score_age = float(curve.get("zero_score_age", 90))
        self.window_s = float(cfg.get("motion_window_s", 8.0))
        self.active_threshold = float(cfg.get("active_motion_threshold", 0.02))
        self._tracks: Dict[int, _TrackMotion] = {}

    def _state(self, track_id: int) -> _TrackMotion:
        if track_id not in self._tracks:
            self._tracks[track_id] = _TrackMotion()
        return self._tracks[track_id]

    def update(
        self,
        track_id: int,
        age: Optional[int],
        motion_energy: float,
        bbox_aspect: Optional[float],
    ) -> VitalityResult:
        st = self._state(track_id)
        now = time.time()
        st.samples.append((now, motion_energy))
        st.active_flags.append((now, motion_energy >= self.active_threshold))

        s_age = self._age_subscore(age)
        s_motion = self._window_mean(st.samples, now)
        s_posture = self._posture_subscore(bbox_aspect)
        s_activity = self._activity_fraction(st.active_flags, now)

        total_w = self.w_age + self.w_motion + self.w_posture + self.w_activity
        if total_w <= 0:
            total_w = 1.0
        score = (
            self.w_age * s_age
            + self.w_motion * s_motion
            + self.w_posture * s_posture
            + self.w_activity * s_activity
        ) / total_w

        components = {
            "age_input": age,
            "s_age": round(s_age, 2),
            "s_motion": round(s_motion, 3),
            "s_posture": round(s_posture, 3),
            "s_activity": round(s_activity, 3),
            "motion_energy_last": round(motion_energy, 4),
        }
        return VitalityResult(score=round(float(score), 2), components=components)

    def _age_subscore(self, age: Optional[int]) -> float:
        if age is None:
            return 50.0
        lo, hi = self.full_score_age, self.zero_score_age
        if hi <= lo:
            return 50.0
        frac = (float(age) - lo) / (hi - lo)
        return float(np.clip(1.0 - frac, 0.0, 1.0)) * 100.0

    def _posture_subscore(self, aspect: Optional[float]) -> float:
        if not aspect or aspect <= 0:
            return 60.0
        standing = 0.38
        lying = 1.6
        frac = (float(aspect) - standing) / (lying - standing)
        return float(np.clip(1.0 - frac, 0.0, 1.0)) * 100.0

    def _window_mean(self, samples: deque, now: float) -> float:
        vals = [v for ts, v in samples if now - ts <= self.window_s]
        return float(np.mean(vals)) * 10.0 if vals else 0.0

    def _activity_fraction(self, flags: deque, now: float) -> float:
        vals = [a for ts, a in flags if now - ts <= self.window_s]
        return float(np.mean(vals)) * 100.0 if vals else 0.0

    def forget(self, track_id: int) -> None:
        self._tracks.pop(track_id, None)

    @staticmethod
    def bbox_aspect_ratio(bbox: Tuple[int, int, int, int]) -> Optional[float]:
        x1, y1, x2, y2 = bbox
        h = max(y2 - y1, 1)
        w = max(x2 - x1, 1)
        return w / h
