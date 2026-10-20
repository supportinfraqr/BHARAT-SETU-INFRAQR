#!/usr/bin/env python3
"""Generate BSS worker face embeddings from stored enrolment photos.

This is the only BSS-side process that loads ArcFace/RetinaFace. It is a
one-shot, CPU-only worker; run it after worker photos are uploaded or on a
short schedule. Client video never reaches this process.

The model stack is pinned to the same environment as the client sidecar:
Python 3.10.12, DeepFace 0.0.101, TensorFlow 2.21.0, ArcFace + RetinaFace.
"""
import argparse
import hashlib
import logging
import os
import sys
import time
from pathlib import Path

import psycopg

LOG = logging.getLogger("bss-face-embedding")

MODEL_NAME = "ArcFace"
MODEL_VERSION = "deepface-0.0.101-tf-2.21.0"
DETECTOR_BACKEND = "retinaface"
EMBEDDING_DIM = 512
ARCFACE_SHA = "6336979c0c602cae08d1122a66f4dfb862d059bbcd8ef80306aef2b2249b0c93"
RETINAFACE_SHA = "ecb2393a89da3dd3d6796ad86660e298f62a0c8ae7578d92eb6af14e0bb93adf"


def _env(name, default=""):
    return os.environ.get(name, default)


def _db():
    return psycopg.connect(
        dbname=_env("BSS_PG_DB", "bss_final"),
        user=_env("BSS_PG_USER", "bss"),
        password=_env("BSS_PG_PASSWORD"),
        host=_env("BSS_PG_HOST", "127.0.0.1"),
        port=_env("BSS_PG_PORT", "5432"),
        connect_timeout=int(_env("BSS_PG_CONNECT_TIMEOUT", "5")),
    )


def _weights_dir():
    home = Path(os.environ.get("DEEPFACE_HOME", str(Path.home())))
    return home / ".deepface" / "weights"


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _check_weights():
    weights = _weights_dir()
    required = {
        weights / "arcface_weights.h5": ARCFACE_SHA,
        weights / "retinaface.h5": RETINAFACE_SHA,
    }
    for path, expected in required.items():
        if not path.exists():
            raise SystemExit(f"Missing model weight: {path}")
        actual = _sha256(path)
        if actual != expected:
            raise SystemExit(f"Weight checksum mismatch: {path.name} ({actual})")
    LOG.info("Model weights verified in %s", weights)


def _photo_path(value, media_root):
    path = Path(str(value or ""))
    if path.is_absolute():
        return path
    return Path(media_root) / path


def _load_photo(photo_id, user_id, path):
    LOG.info("Embedding photo id=%s worker_id=%s", photo_id, user_id)
    from deepface import DeepFace

    result = DeepFace.represent(
        img_path=str(path),
        model_name=MODEL_NAME,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=True,
        align=True,
    )
    if not isinstance(result, list) or not result:
        raise ValueError("No face detected")
    if len(result) > 1:
        LOG.warning("Photo id=%s has %s faces; using the first", photo_id, len(result))
    embedding = result[0].get("embedding") or []
    if len(embedding) != EMBEDDING_DIM:
        raise ValueError(f"Unexpected embedding dimension {len(embedding)}")
    return embedding


def _upsert(conn, photo_id, user_id, embedding, weights_sha):
    import numpy as np

    blob = np.asarray(embedding, dtype=np.float32).tobytes()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO worker_face_embedding
                (worker_id, photo_id, model_name, model_version, detector_backend,
                 embedding, dim, weights_sha, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (photo_id, model_name, model_version)
            DO UPDATE SET embedding = EXCLUDED.embedding,
                          detector_backend = EXCLUDED.detector_backend,
                          dim = EXCLUDED.dim,
                          weights_sha = EXCLUDED.weights_sha
            """,
            (user_id, photo_id, MODEL_NAME, MODEL_VERSION, DETECTOR_BACKEND,
             blob, EMBEDDING_DIM, weights_sha),
        )
    conn.commit()


def _pending(conn, limit=None, photo_id=None):
    sql = """
        SELECT p.id, p.user_id, p.path
        FROM worker_face_photo p
        LEFT JOIN worker_face_embedding e
          ON e.photo_id = p.id
         AND e.model_name = %s
         AND e.model_version = %s
        WHERE e.id IS NULL AND COALESCE(p.path, '') <> ''
    """
    params = [MODEL_NAME, MODEL_VERSION]
    if photo_id is not None:
        sql += " AND p.id = %s"
        params.append(photo_id)
    sql += " ORDER BY p.id"
    if limit is not None:
        sql += " LIMIT %s"
        params.append(limit)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def main():
    parser = argparse.ArgumentParser(description="Generate BSS worker face embeddings")
    parser.add_argument("--all", action="store_true", help="process every pending photo")
    parser.add_argument("--limit", type=int, default=100, help="max photos per run")
    parser.add_argument("--photo-id", type=int, help="process one photo id")
    parser.add_argument("--media-root", default=_env("BSS_MEDIA_ROOT", "/app/media"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--watch", action="store_true", help="poll for new photos continuously")
    parser.add_argument("--interval", type=int, default=60, help="seconds between polls in --watch")
    parser.add_argument("--skip-weight-check", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not args.skip_weight_check:
        _check_weights()

    limit = None if args.all else max(1, args.limit)

    def run_once():
        with _db() as conn:
            rows = _pending(conn, limit=limit, photo_id=args.photo_id)
            LOG.info("Pending photos: %s", len(rows))
            if args.dry_run:
                for photo_id, user_id, path in rows:
                    LOG.info("Would embed photo id=%s worker_id=%s path=%s", photo_id, user_id, path)
                return 0
            done = failed = 0
            for photo_id, user_id, path in rows:
                resolved = _photo_path(path, args.media_root)
                if not resolved.exists():
                    LOG.error("Photo id=%s file missing: %s", photo_id, resolved)
                    failed += 1
                    continue
                try:
                    embedding = _load_photo(photo_id, user_id, resolved)
                    _upsert(conn, photo_id, user_id, embedding, ARCFACE_SHA)
                    done += 1
                except Exception as exc:  # noqa: BLE001 - one bad photo must not stop the batch
                    LOG.exception("Photo id=%s failed: %s", photo_id, exc)
                    failed += 1
            LOG.info("Embeddings created: %s failed: %s", done, failed)
            return 0 if failed == 0 else 1

    if not args.watch:
        return run_once()
    while True:
        try:
            run_once()
        except Exception as exc:  # noqa: BLE001
            LOG.exception("Embedding poll failed: %s", exc)
        time.sleep(max(10, args.interval))


if __name__ == "__main__":
    sys.exit(main())
