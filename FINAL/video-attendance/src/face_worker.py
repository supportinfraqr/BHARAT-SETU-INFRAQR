import threading
from typing import Dict, Tuple

import numpy as np


class FaceWorker(threading.Thread):
    def __init__(self, engine):
        super().__init__(daemon=True)
        self.engine = engine
        self._jobs: Dict[int, Tuple[np.ndarray, bool]] = {}
        self._results: Dict[int, Tuple[float, object]] = {}
        self._consumed: Dict[int, float] = {}
        self._lock = threading.Lock()
        self._running = True

    def submit(self, track_id: int, crop: np.ndarray, estimate_age: bool) -> None:
        if crop is None or crop.size == 0:
            return
        with self._lock:
            self._jobs[track_id] = (crop, estimate_age)

    def pop_result(self, track_id: int):
        with self._lock:
            item = self._results.pop(track_id, None)
        return item[1] if item else None

    def forget(self, track_ids) -> None:
        with self._lock:
            for tid in track_ids:
                self._jobs.pop(tid, None)
                self._results.pop(tid, None)
                self._consumed.pop(tid, None)

    def stop(self) -> None:
        self._running = False

    def run(self) -> None:
        import time
        while self._running:
            job = None
            tid = None
            with self._lock:
                if self._jobs:
                    tid = next(iter(self._jobs))
                    job = self._jobs.pop(tid)
            if job is None:
                time.sleep(0.02)
                continue
            crop, want_age = job
            try:
                obs = self.engine.process_crop(crop, estimate_age=want_age)
            except Exception:
                obs = None
            if obs is not None:
                with self._lock:
                    self._results[tid] = (time.time(), obs)
