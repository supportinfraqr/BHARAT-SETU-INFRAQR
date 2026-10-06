import os
import threading
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")


@dataclass
class FaceObservation:
    name: str
    person_id: Optional[int]
    distance: Optional[float]
    age: Optional[int]
    face_box: Optional[Tuple[int, int, int, int]]
    embedding: Optional[np.ndarray] = None


def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 1.0
    return float(1.0 - np.dot(a, b) / denom)


class FaceEngine:
    def __init__(self, config: dict, gallery, db=None):
        import os as _os
        _os.environ.setdefault("OMP_NUM_THREADS", "2")
        _os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "2")
        _os.environ.setdefault("TF_NUM_INTEROP_THREADS", "2")
        from deepface import DeepFace
        import tensorflow as _tf
        try:
            _tf.config.threading.set_intra_op_parallelism_threads(2)
            _tf.config.threading.set_inter_op_parallelism_threads(2)
        except Exception:
            pass

        self._DeepFace = DeepFace
        cfg = config["face"]
        self._face_cfg = cfg
        self.model_name = cfg.get("recognition_model", "Facenet512")
        self.detector_backend = cfg.get("detector_backend", "opencv")
        self.threshold = float(cfg.get("cosine_threshold", 0.32))
        self.match_margin = float(cfg.get("match_margin", 0.0))
        self.match_topk = max(1, int(cfg.get("match_topk", 3)))
        self.match_votes = max(1, int(cfg.get("match_votes", 2)))
        self.min_blur = float(cfg.get("min_blur", 0))
        # Passive anti-spoofing: photo-on-screen / printout never matches.
        self.antispoof_enabled = False
        self.antispoof_threshold = float(cfg.get("antispoof_threshold", 0.5))
        self._antispoof = None
        self.age_enabled = bool(cfg.get("age_enabled", True))
        self.auto_register = bool(cfg.get("auto_register", True))
        self.auto_margin = float(cfg.get("auto_register_margin", 0.40))
        self.auto_min_face_px = int(cfg.get("auto_register_min_face_px", 50))
        self.reassign_margin = float(cfg.get("reassign_margin", 0.55))
        self.identity_patience = int(cfg.get("identity_patience", 3))
        self._lock = threading.Lock()
        self.gallery = gallery
        self.db = db
        # Indexed cosine search over the gallery (exact at this scale; the
        # Python loop is gone). Rebuilt from Postgres at every startup, and
        # every in-process gallery mutation below appends to it in lockstep.
        from src.vector_store import FaissGallery
        dim = gallery[0][2].shape[0] if gallery else 512
        self._store = FaissGallery(dim=dim)
        self._store.rebuild(gallery)
        if bool(cfg.get("antispoof_enabled", False)):
            self.set_antispoof_enabled(True)

    def set_antispoof_enabled(self, on: bool) -> bool:
        """Runtime on/off switch for the spoof gate. Returns resulting state.

        Enabling loads (and caches) the ONNX model on first use; disabling
        just stops consulting it. If the model can't load, stays OFF.
        """
        on = bool(on)
        if on and self._antispoof is None:
            from src.antispoof import AntiSpoof, DEFAULT_PATH, DEFAULT_URL
            self._antispoof = AntiSpoof(
                self._face_cfg.get("antispoof_model", DEFAULT_PATH),
                self._face_cfg.get("antispoof_url", DEFAULT_URL))
        if on:
            if not self._antispoof.available() and not self._antispoof.load():
                self.antispoof_enabled = False
                return False
            self.antispoof_enabled = True
            print(f"[face] anti-spoof gate ON "
                  f"(live >= {self.antispoof_threshold})")
            return True
        self.antispoof_enabled = False
        print("[face] anti-spoof gate OFF")
        return False

    def should_auto_register(self, obs: FaceObservation) -> bool:
        if not self.auto_register or self.db is None:
            return False
        if obs.name != "Unknown" or obs.embedding is None:
            return False
        if obs.face_box is not None:
            _, _, x2, y2 = obs.face_box
            x1, y1 = obs.face_box[0], obs.face_box[1]
            if min(x2 - x1, y2 - y1) < self.auto_min_face_px:
                return False
        if obs.distance is None:
            return True
        return obs.distance > self.auto_margin

    def register_unknown(self, obs: FaceObservation):
        with self._lock:
            top = self._store.search(obs.embedding, 1)
            if top:
                best_dist, best_pid, best_name = top[0]
            else:
                best_dist, best_pid, best_name = None, None, None
            if best_dist is not None and best_dist <= self.threshold:
                print(f"[face] dedup: reusing {best_name} (dist {best_dist:.3f}) "
                      f"instead of creating duplicate")
                return best_pid, best_name
            if best_dist is not None and best_dist <= self.auto_margin:
                print(f"[face] ambiguous dist {best_dist:.3f} in grey zone "
                      f"({self.threshold:.2f}-{self.auto_margin:.2f}), skipping registration")
                return None
            n = self.db.conn.execute(
                "SELECT COUNT(*) FROM persons WHERE name LIKE 'ID-%'"
            ).fetchone()[0]
            while True:
                n += 1
                name = f"ID-{n:04d}"
                if self.db.get_person_by_name(name) is None:
                    break
            pid = self.db.add_person(name, notes="auto-registered by live pipeline")
            self.db.add_embedding(pid, self.model_name, obs.embedding)
            self.gallery.append((pid, name, obs.embedding))
            self._store.add(pid, name, obs.embedding)
            print(f"[face] new face registered: {name} (distance was "
                  f"{obs.distance if obs.distance is not None else 'n/a'})")
            return pid, name

    def _match(self, embedding: np.ndarray) -> Tuple[Optional[int], str, Optional[float]]:
        # Indexed KNN vote + threshold + margin, else Unknown.
        # - vote: one person must hold >= match_votes of the top-match_topk
        #   hits, so a single matching image can never name anyone by itself;
        # - threshold: the winner's best distance must clear cosine_threshold;
        # - margin: it must also beat the runner-up (other person) by
        #   match_margin — lookalike flips become Visitor, not wrong names.
        # Distances are exact cosine (indexed, not looped), so all configured
        # cutoffs mean exactly what they did before.
        with self._lock:
            wpid, wname, votes, wdist, runner, top = self._store.vote(
                embedding, self.match_topk, self.match_votes)
        if (wpid is not None and wdist is not None and wdist <= self.threshold
                and (runner is None or runner - wdist >= self.match_margin)):
            return wpid, wname, wdist
        return None, "Unknown", top
    def distance_to_person(self, embedding: np.ndarray, person_id: int) -> Optional[float]:
        """Min cosine distance from `embedding` to any stored variant of `person_id`."""
        with self._lock:
            dists = [cosine_distance(embedding, emb) for pid, _, emb in self.gallery if pid == person_id]
        return min(dists) if dists else None

    def enroll_variant(self, person_id: int, name: str, embedding: np.ndarray,
                        min_gap: Optional[float] = None, max_variants: int = 8) -> bool:
        """Add another embedding variant for an already-known person (e.g. glasses off).
        Skips if too similar to an existing variant, or already at cap.
        min_gap defaults to 25% of the match threshold, so it stays correct
        across embedding models (was hardcoded 0.08 = Facenet512-scale;
        ArcFace distances run ~2x larger and need ~0.17)."""
        if min_gap is None:
            min_gap = self.threshold * 0.25
        with self._lock:
            variants = [emb for pid, _, emb in self.gallery if pid == person_id]
            if len(variants) >= max_variants:
                return False
            if variants and min(cosine_distance(embedding, v) for v in variants) < min_gap:
                return False
            if self.db is not None:
                self.db.add_embedding(person_id, self.model_name, embedding)
            self.gallery.append((person_id, name, embedding))
            self._store.add(person_id, name, embedding)
        return True
    
    
    def process_crop(self, crop: np.ndarray, estimate_age: bool = True) -> Optional[FaceObservation]:
        if crop is None or crop.size == 0:
            return None
        try:
            reps = self._DeepFace.represent(
                img_path=crop,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
            )
        except Exception:
            return None
        if not reps:
            return None

        rep = max(reps, key=lambda r: r.get("face_confidence", 0))
        area = rep.get("facial_area", {})
        x, y, w, h = int(area.get("x", 0)), int(area.get("y", 0)), int(area.get("w", 0)), int(area.get("h", 0))
        face_box = (
            max(x, 0),
            max(y, 0),
            min(x + w, crop.shape[1]),
            min(y + h, crop.shape[0]),
        )

        # Filter: face must be in upper half of person crop and reasonably large
        fh, fw = crop.shape[:2]
        if y > fh * 0.55:  # face center below 55% of person height
            return None
        if min(w, h) < self.auto_min_face_px:
            return None
        # Optional: horizontal centering (face shouldn't be at extreme edge)
        if x < fw * 0.05 or x + w > fw * 0.95:
            return None
        # Blur gate: low-quality frames cause most false accepts, and the
        # identity lock already holds the name — so skip matching this frame
        # instead of gambling on it. Laplacian variance < min_blur = reject.
        if self.min_blur > 0:
            bx1, by1 = max(0, x), max(0, y)
            bx2, by2 = min(crop.shape[1], x + w), min(crop.shape[0], y + h)
            if bx2 > bx1 and by2 > by1:
                gray = cv2.cvtColor(crop[by1:by2, bx1:bx2], cv2.COLOR_BGR2GRAY)
                if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < self.min_blur:
                    return None
        # Anti-spoof gate: a photo on screen (or printout) gets no identity,
        # no age and no gallery variant — downstream it shows as Visitor.
        # face_box is local to `crop`, which is the frame reference here.
        if self.antispoof_enabled and self._antispoof is not None:
            live = self._antispoof.liveness(crop, face_box)
            if live is not None and live < self.antispoof_threshold:
                return None

        pid, name, dist = self._match(np.array(rep["embedding"], dtype=np.float32))

        age = None
        if estimate_age and self.age_enabled and face_box[2] > face_box[0] and face_box[3] > face_box[1]:
            age = self._estimate_age(crop[face_box[1]:face_box[3], face_box[0]:face_box[2]])

        return FaceObservation(
            name=name,
            person_id=pid,
            distance=dist,
            age=age,
            face_box=face_box,
            embedding=np.array(rep["embedding"], dtype=np.float32),
        )

    def _estimate_age(self, face_img: np.ndarray) -> Optional[int]:
        try:
            results = self._DeepFace.analyze(
                img_path=face_img,
                actions=("age",),
                detector_backend="skip",
                enforce_detection=False,
                silent=True,
            )
            if isinstance(results, list) and results:
                return int(results[0]["age"])
            if isinstance(results, dict):
                return int(results["age"])
        except Exception:
            pass
        return None

    @staticmethod
    def check_enrollment(seen, pid: int, name: str, emb: np.ndarray,
                         dupe_guard: Optional[float] = None,
                         outlier_max: Optional[float] = None) -> Optional[str]:
        """Decide whether `emb` may be enrolled as (`pid`, `name`).

        Returns a refusal reason, or None to accept. Two independent gates:
        - cross-person near-duplicate: same photo enrolled under two names
          (the poison case; genuine different people never score this close);
        - outlier vs the person's own cluster: background face / misfiled
          photo that resembles none of their accepted photos so far.
        First photo of a person is always accepted (no cluster yet)."""
        if dupe_guard is not None:
            clash = [(n, cosine_distance(emb, e)) for p, n, e in seen if p != pid]
            if clash:
                other, d = min(clash, key=lambda t: t[1])
                if d <= dupe_guard:
                    return f"same face already enrolled as '{other}' (d={d:.3f})"
        if outlier_max is not None:
            own = [e for p, _, e in seen if p == pid]
            if own:
                d_own = min(cosine_distance(emb, e) for e in own)
                if d_own > outlier_max:
                    return (f"doesn't resemble '{name}'s other photos "
                            f"(nearest d={d_own:.3f})")
        return None

    @staticmethod
    def build_gallery_from_folder(db, folder: str, model_name: str, detector_backend: str,
                                  dupe_guard: Optional[float] = None,
                                  outlier_max: Optional[float] = None) -> int:
        """Bulk-enroll one subfolder per person. When `dupe_guard` is set, a
        new embedding within that distance of a DIFFERENT person's embedding
        is refused (same photo enrolled under two names — the poison case).
        Guard is deliberately far below the match threshold (suggested:
        threshold * 0.5): legit lookalikes never score that close."""
        from deepface import DeepFace

        added = 0
        if not os.path.isdir(folder):
            return added
        seen = list(db.load_gallery(model_name))  # (pid, name, emb), incl. new rows
        for entry in sorted(os.listdir(folder)):
            person_dir = os.path.join(folder, entry)
            if not os.path.isdir(person_dir):
                continue
            row = db.get_person_by_name(entry)
            pid = row[0] if row else db.add_person(entry)
            for fname in sorted(os.listdir(person_dir)):
                if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    continue
                path = os.path.join(person_dir, fname)
                try:
                    reps = DeepFace.represent(
                        img_path=path,
                        model_name=model_name,
                        detector_backend=detector_backend,
                        enforce_detection=False,
                    )
                except Exception as e:
                    print(f"[enroll] skipped {path}: {e}")
                    continue
                for rep in reps:
                    emb = np.array(rep["embedding"], dtype=np.float32)
                    refusal = FaceEngine.check_enrollment(
                        seen, pid, entry, emb, dupe_guard, outlier_max)
                    if refusal is not None:
                        print(f"[enroll] refused {path}: {refusal}")
                        continue
                    db.add_embedding(pid, model_name, emb)
                    seen.append((pid, entry, emb))
                    added += 1
                    print(f"[enroll] {entry}: embedding from {fname}")
        return added


class TrackStateCache:
    def __init__(self, refresh_interval_s: float):
        self.refresh_interval_s = refresh_interval_s
        self._last: dict = {}

    def due(self, track_id: int) -> bool:
        now = time.time()
        return now - self._last.get(track_id, 0.0) >= self.refresh_interval_s

    def mark(self, track_id: int) -> None:
        self._last[track_id] = time.time()

    def forget(self, track_ids: List[int]) -> None:
        for tid in track_ids:
            self._last.pop(tid, None)
@dataclass
class _TrackIdentity:
    person_id: int
    name: str
    miss_streak: int = 0


class TrackIdentityTracker:
    """Locks a track_id onto an identity once assigned. A single noisy frame
    (glasses off, squint, blur) won't spawn a new person — only sustained
    disagreement over `patience` consecutive checks releases the lock."""
    def __init__(self, patience: int = 3):
        self.patience = patience
        self._state: dict = {}

    def get(self, track_id: int):
        return self._state.get(track_id)

    def lock(self, track_id: int, person_id: int, name: str) -> None:
        self._state[track_id] = _TrackIdentity(person_id, name)

    def note_hit(self, track_id: int) -> None:
        st = self._state.get(track_id)
        if st:
            st.miss_streak = 0

    def note_miss(self, track_id: int) -> bool:
        """Returns True once patience exceeded -> caller may re-evaluate identity."""
        st = self._state.get(track_id)
        if st is None:
            return True
        st.miss_streak += 1
        return st.miss_streak > self.patience

    def forget(self, track_ids) -> None:
        for tid in track_ids:
            self._state.pop(tid, None)