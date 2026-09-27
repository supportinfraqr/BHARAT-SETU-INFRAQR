import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


@dataclass
class Track:
    track_id: int
    bbox: Tuple[int, int, int, int]
    last_seen: float
    first_seen: float
    centers: List[Tuple[float, float]] = field(default_factory=list)
    active: bool = True

    def speed(self) -> float:
        if len(self.centers) < 2:
            return 0.0
        (x1, y1), (x2, y2) = self.centers[-2], self.centers[-1]
        return float(np.hypot(x2 - x1, y2 - y1))


class PersonDetector:
    def __init__(self, config: dict):
        from ultralytics import YOLO

        cfg = config["detector"]
        self.model = YOLO(cfg["model"])
        self.imgsz = int(cfg.get("imgsz", 640))
        self.conf = float(cfg.get("conf", 0.35))
        self.iou = float(cfg.get("iou", 0.45))
        self.present_hits = int(cfg.get("present_hits", 4))
        self.absent_misses = int(cfg.get("absent_misses", 12))
        self.lost_after_s = float(cfg.get("track_lost_after_s", 4.0))
        self.infer_width = int(cfg.get("infer_width", 640))

        self.present = False
        self._hit_count = 0
        self._miss_count = 0
        self._present_intervals: List[dict] = []
        self._current_interval: Optional[dict] = None
        self._session_start: Optional[float] = None
        self.tracks: Dict[int, Track] = {}

    def _now(self) -> float:
        import time as _t
        return _t.time()

    def stats(self) -> dict:
        now = self._now()
        if self._session_start is None:
            return {"duration_s": 0.0, "present_s": 0.0, "absence_pct": 100.0}
        end = now
        present = sum(
            ((i["end"] or end) - i["start"]) for i in self._present_intervals
        )
        total = max(end - self._session_start, 1e-6)
        absence = max(0.0, min(100.0, 100.0 * (1.0 - present / total)))
        return {
            "duration_s": total,
            "present_s": present,
            "absence_pct": round(absence, 2),
        }

    def get_present_intervals(self) -> List[dict]:
        return list(self._present_intervals)

    @property
    def session_start(self) -> Optional[float]:
        return self._session_start

    def _update_presence(self, person_found: bool, now: float) -> None:
        if self._session_start is None:
            self._session_start = now
        if person_found:
            self._miss_count = 0
            self._hit_count += 1
            if not self.present and self._hit_count >= self.present_hits:
                self.present = True
                self._current_interval = {"start": now, "end": None}
                self._present_intervals.append(self._current_interval)
        else:
            self._hit_count = 0
            self._miss_count += 1
            if self.present and self._miss_count >= self.absent_misses:
                self.present = False
                if self._current_interval is not None:
                    self._current_interval["end"] = now
                    self._current_interval = None

    def finalize(self) -> None:
        if self._current_interval is not None and self._current_interval["end"] is None:
            self._current_interval["end"] = time.time()
            self._current_interval = None

    def process(self, frame: np.ndarray) -> List[Track]:
        now = time.time()
        h, w = frame.shape[:2]
        if w > self.infer_width:
            scale = w / self.infer_width
            infer_frame = cv2.resize(
                frame, (self.infer_width, int(round(h / scale)))
            )
        else:
            scale = 1.0
            infer_frame = frame
        results = self.model.track(
            infer_frame,
            persist=True,
            classes=[0],
            imgsz=self.imgsz,
            conf=self.conf,
            iou=self.iou,
            verbose=False,
        )
        seen_ids = set()
        tracks_now: List[Track] = []
        if results and results[0].boxes is not None and len(results[0].boxes) > 0:
            ids = results[0].boxes.id
            boxes = results[0].boxes.xyxy.cpu().numpy()
            if ids is not None:
                for tid, box in zip(ids.int().tolist(), boxes):
                    x1, y1, x2, y2 = (int(v * scale) for v in box)
                    cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
                    seen_ids.add(tid)
                    t = self.tracks.get(tid)
                    if t is None:
                        t = Track(track_id=tid, bbox=(x1, y1, x2, y2),
                                  last_seen=now, first_seen=now)
                        self.tracks[tid] = t
                    else:
                        t.bbox = (x1, y1, x2, y2)
                        t.last_seen = now
                        if not t.active:
                            t.active = True
                            t.first_seen = now
                    t.centers.append((cx, cy))
                    if len(t.centers) > 60:
                        t.centers.pop(0)
                    tracks_now.append(t)

        for tid, t in list(self.tracks.items()):
            if tid not in seen_ids and now - t.last_seen > self.lost_after_s:
                t.active = False

        self._update_presence(len(tracks_now) > 0, now)
        return tracks_now

    def stale_track_ids(self) -> List[int]:
        return [tid for tid, t in self.tracks.items() if not t.active]
