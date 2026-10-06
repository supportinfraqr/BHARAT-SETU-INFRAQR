"""Indexed vector search for the face gallery (FAISS backend).

Replaces the brute-force Python loop over gallery embeddings with exact
top-k retrieval. Metric stays cosine: vectors are L2-normalized on insert
and query, so inner product == cosine similarity and distance = 1 - score.
Thresholds configured for the old loop mean exactly the same thing here.

Scaling notes:
- Current: IndexFlatIP (exact, zero accuracy change). Rebuilt from Postgres
  at every startup in milliseconds — no persisted-index staleness possible.
- Later (100k+ vectors): swap `_build()` for an IVF-PQ/HNSW index and persist
  it to disk; the add()/search()/rebuild() API stays identical.
"""
from typing import Dict, List, Optional, Tuple

import numpy as np


def _norm(v: np.ndarray) -> np.ndarray:
    v = np.asarray(v, dtype=np.float32)
    n = float(np.linalg.norm(v))
    return v / n if n > 0 else v


class FaissGallery:
    """Exact cosine top-k over (person_id, name, embedding) rows."""

    def __init__(self, dim: int = 512):
        import faiss

        self._faiss = faiss
        self.dim = dim
        self.index = faiss.IndexFlatIP(dim)
        self._pids: List[int] = []    # parallel to index positions
        self._names: List[str] = []

    @property
    def size(self) -> int:
        return self.index.ntotal

    def add(self, person_id: int, name: str, embedding: np.ndarray) -> None:
        vec = _norm(embedding).reshape(1, -1)
        assert vec.shape[1] == self.dim, f"dim {vec.shape[1]} != {self.dim}"
        self.index.add(vec)
        self._pids.append(person_id)
        self._names.append(name)

    def rebuild(self, gallery: List[Tuple[int, str, np.ndarray]]) -> None:
        """Full rebuild from (pid, name, emb) rows (e.g. after prune/clear)."""
        self.index.reset()
        self._pids.clear()
        self._names.clear()
        for pid, name, emb in gallery:
            self.add(pid, name, emb)

    def search(self, embedding: np.ndarray,
               k: int) -> List[Tuple[float, int, str]]:
        """Top-k as (cosine_distance, person_id, name), best first."""
        if self.index.ntotal == 0 or k <= 0:
            return []
        k = min(k, self.index.ntotal)
        q = _norm(embedding).reshape(1, -1)
        scores, positions = self.index.search(q, k)
        out = []
        for score, pos in zip(scores[0], positions[0]):
            if int(pos) < 0:
                continue
            out.append((float(1.0 - score), self._pids[int(pos)], self._names[int(pos)]))
        return out

    def vote(self, embedding: np.ndarray, topk: int,
             min_votes: int) -> Tuple[Optional[int], Optional[str], int,
                                      Optional[float], Optional[float], Optional[float]]:
        """KNN-style verdict over the top-k hits.

        Returns (winner_pid, winner_name, winner_votes, winner_dist,
        runner_dist, top_dist):
        - winner_*: the majority person (None unless they hold >= min_votes
          of the top-k — a single matching image can never name anyone);
        - runner_dist: best distance from any OTHER person (None when every
          hit is the winner);
        - top_dist: best distance overall (None when gallery empty) — kept
          for grey-zone/auto-register continuity.
        """
        hits = self.search(embedding, topk)
        if not hits:
            return None, None, 0, None, None, None
        top_dist = hits[0][0]
        counts: Dict[int, int] = {}
        best_of: Dict[int, float] = {}
        names: Dict[int, str] = {}
        for d, pid, name in hits:
            counts[pid] = counts.get(pid, 0) + 1
            if pid not in best_of or d < best_of[pid]:
                best_of[pid] = d
                names[pid] = name
        winner = max(counts, key=lambda p: (counts[p], -best_of[p]))
        if counts[winner] < min_votes:
            return None, None, counts[winner], None, None, top_dist
        runner = min((d for p, d in best_of.items() if p != winner),
                     default=None)
        return winner, names[winner], counts[winner], best_of[winner], runner, top_dist
