"""Postgres persistence layer (psycopg v3).

Same API the pipeline already uses — main/enroll/report call this exactly as
before, only the configuration changed (config.yaml `postgres:` instead of a
sqlite file path). Vectors live in BYTEA; nothing else about the schema or
the call sites' expectations changed (timestamps stay unix-float seconds).
"""
import json
import os
import time
from typing import List, Optional, Tuple
from urllib.parse import urlparse, unquote

import numpy as np

SCHEMA = """
CREATE TABLE IF NOT EXISTS persons (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    notes       TEXT,
    meta        TEXT NOT NULL DEFAULT '{}',
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id         SERIAL PRIMARY KEY,
    person_id  INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    embedding  BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS sightings (
    id             SERIAL PRIMARY KEY,
    person_id      INTEGER REFERENCES persons(id),
    track_id       INTEGER,
    name           TEXT,
    camera         TEXT,
    site           TEXT,
    ts_start       DOUBLE PRECISION NOT NULL,
    ts_end         DOUBLE PRECISION,
    age_estimate   INTEGER,
    match_distance DOUBLE PRECISION,
    snapshot_path  TEXT
);

CREATE TABLE IF NOT EXISTS presence_intervals (
    id       SERIAL PRIMARY KEY,
    camera   TEXT,
    site     TEXT,
    ts_start DOUBLE PRECISION NOT NULL,
    ts_end   DOUBLE PRECISION NOT NULL,
    present  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS known_codes (
    id          SERIAL PRIMARY KEY,
    label       TEXT NOT NULL,
    value       TEXT NOT NULL,
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS code_scans (
    id            SERIAL PRIMARY KEY,
    ts            DOUBLE PRECISION NOT NULL,
    camera        TEXT,
    site          TEXT,
    payload       TEXT NOT NULL,
    symbology     TEXT,
    matched_label TEXT,
    match_score   DOUBLE PRECISION,
    snapshot_path TEXT
);

CREATE TABLE IF NOT EXISTS vitality_scores (
    id          SERIAL PRIMARY KEY,
    sighting_id INTEGER REFERENCES sightings(id),
    ts          DOUBLE PRECISION NOT NULL,
    score       DOUBLE PRECISION NOT NULL,
    components  TEXT NOT NULL
);
"""


def resolve_schema(pg: dict) -> str:
    """Schema override: BTP_PG_SCHEMA env wins, else config `schema:`."""
    return (os.environ.get("BTP_PG_SCHEMA") or (pg or {}).get("schema") or "").strip()


def pg_params(pg: dict) -> dict:
    """Resolve connection params. Precedence: BTP_DATABASE_URL env, then the
    mapping. Password may come from BTP_PG_PASSWORD env instead of config.
    When a schema is configured, search_path is pinned to it so every
    unqualified table lands there (one shared DB, e.g. bss_prod.attendance)."""
    url = os.environ.get("BTP_DATABASE_URL")
    if url:
        parts = urlparse(url)
        params = {
            "host": parts.hostname or "127.0.0.1",
            "port": parts.port or 5432,
            "dbname": (parts.path or "/btp").lstrip("/") or "btp",
            "user": unquote(parts.username) if parts.username else "btp",
            "password": unquote(parts.password)
            if parts.password else os.environ.get("BTP_PG_PASSWORD", ""),
        }
    else:
        params = {
            "host": pg.get("host", "127.0.0.1"),
            "port": int(pg.get("port", 5432)),
            "dbname": pg.get("dbname", "btp"),
            "user": pg.get("user", "btp"),
            "password": os.environ.get("BTP_PG_PASSWORD", pg.get("password", "")),
        }
    schema = resolve_schema(pg)
    if schema:
        params["options"] = f"-c search_path={schema}"
    return params


class Database:
    def __init__(self, pg: dict, camera: Optional[str] = None, site: Optional[str] = None):
        import psycopg

        self.params = pg_params(pg or {})
        self.schema = resolve_schema(pg or {})
        self.camera = camera
        self.site = site
        self.ensure_database(self.params)
        self.conn = psycopg.connect(**self.params)
        if self.schema:
            self.conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{self.schema}"')
        for stmt in SCHEMA.split(";"):
            if stmt.strip():
                self.conn.execute(stmt)
        self._ensure_column("persons", "meta", "TEXT NOT NULL DEFAULT '{}'")
        self._ensure_column("sightings", "camera", "TEXT")
        self._ensure_column("code_scans", "camera", "TEXT")
        self._ensure_column("presence_intervals", "camera", "TEXT")
        self._ensure_column("sightings", "site", "TEXT")
        self._ensure_column("code_scans", "site", "TEXT")
        self._ensure_column("presence_intervals", "site", "TEXT")
        self.conn.commit()

    def _ensure_column(self, table: str, column: str, ddl: str) -> None:
        cols = [
            r[0]
            for r in self.conn.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = %s AND table_schema = current_schema()",
                (table,),
            ).fetchall()
        ]
        if column not in cols:
            self.conn.execute(f'ALTER TABLE "{table}" ADD COLUMN {column} {ddl}')

    @staticmethod
    def ensure_database(params: dict) -> None:
        """CREATE DATABASE if missing (connects to the maintenance db)."""
        import psycopg

        admin = dict(params, dbname="postgres")
        try:
            conn = psycopg.connect(**admin, autocommit=True)
        except Exception:
            return  # server unreachable here; connect() below raises properly
        with conn:
            with conn.cursor() as cur:
                exists = cur.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (params["dbname"],)).fetchone()
                if not exists:
                    cur.execute(
                        f'CREATE DATABASE "{params["dbname"]}"')
                    print(f"[db] created database {params['dbname']}")
        conn.close()

    def close(self) -> None:
        self.conn.commit()
        self.conn.close()

    def add_person(self, name: str, notes: str = "", meta=None) -> int:
        cur = self.conn.execute(
            "INSERT INTO persons(name, notes, meta) VALUES(%s, %s, %s) RETURNING id",
            (name, notes, json.dumps(meta or {})),
        )
        pid = cur.fetchone()[0]
        self.conn.commit()
        return pid

    def get_person_by_name(self, name: str) -> Optional[Tuple[int, str]]:
        row = self.conn.execute(
            "SELECT id, name FROM persons WHERE name = %s", (name,)
        ).fetchone()
        return (row[0], row[1]) if row else None

    def get_person_meta(self, person_id: int) -> dict:
        """Free-form metadata dict for a person ({} if none/invalid)."""
        try:
            row = self.conn.execute(
                "SELECT meta FROM persons WHERE id = %s", (person_id,)
            ).fetchone()
            return json.loads(row[0]) if row and row[0] else {}
        except Exception:
            return {}

    def set_person_meta(self, person_id: int, meta: dict) -> None:
        """Merge `meta` into the stored dict (existing keys win unless overwritten)."""
        current = self.get_person_meta(person_id)
        current.update(meta or {})
        self.conn.execute(
            "UPDATE persons SET meta = %s WHERE id = %s",
            (json.dumps(current), person_id),
        )
        self.conn.commit()

    def list_persons(self) -> List[Tuple[int, str, str]]:
        return self.conn.execute(
            "SELECT id, name, enrolled_at FROM persons ORDER BY id"
        ).fetchall()

    def add_embedding(self, person_id: int, model_name: str, embedding: np.ndarray) -> None:
        self.conn.execute(
            "INSERT INTO face_embeddings(person_id, model_name, embedding) VALUES(%s, %s, %s)",
            (person_id, model_name, bytes(embedding.astype(np.float32).tobytes())),
        )
        self.conn.commit()

    def load_gallery(self, model_name: str) -> List[Tuple[int, str, np.ndarray]]:
        rows = self.conn.execute(
            """SELECT fe.person_id, p.name, fe.embedding
               FROM face_embeddings fe JOIN persons p ON p.id = fe.person_id
               WHERE fe.model_name = %s""",
            (model_name,),
        ).fetchall()
        return [
            (pid, name, np.frombuffer(bytes(blob), dtype=np.float32))
            for pid, name, blob in rows
        ]

    def start_sighting(self, track_id: int, person_id: Optional[int], name: Optional[str]) -> int:
        cur = self.conn.execute(
            "INSERT INTO sightings(track_id, person_id, name, camera, site, ts_start) VALUES(%s, %s, %s, %s, %s, %s) RETURNING id",
            (track_id, person_id, name, self.camera, self.site, time.time()),
        )
        sid = cur.fetchone()[0]
        self.conn.commit()
        return sid

    def update_sighting_identity(
        self,
        sighting_id: int,
        person_id: Optional[int],
        name: Optional[str],
        age: Optional[int],
        distance: Optional[float],
    ) -> None:
        self.conn.execute(
            """UPDATE sightings SET person_id=%s, name=%s, age_estimate=%s, match_distance=%s
               WHERE id=%s""",
            (person_id, name, age, distance, sighting_id),
        )
        self.conn.commit()

    def end_sighting(self, sighting_id: int, snapshot_path: Optional[str] = None) -> None:
        self.conn.execute(
            "UPDATE sightings SET ts_end=%s, snapshot_path=%s WHERE id=%s",
            (time.time(), snapshot_path, sighting_id),
        )
        self.conn.commit()

    def insert_presence_interval(self, ts_start: float, ts_end: float, present: bool) -> None:
        self.conn.execute(
            "INSERT INTO presence_intervals(camera, site, ts_start, ts_end, present) VALUES(%s, %s, %s, %s, %s)",
            (self.camera, self.site, ts_start, ts_end, 1 if present else 0),
        )

    def add_known_code(self, label: str, value: str) -> int:
        cur = self.conn.execute(
            "INSERT INTO known_codes(label, value) VALUES(%s, %s) RETURNING id", (label, value)
        )
        cid = cur.fetchone()[0]
        self.conn.commit()
        return cid

    def list_known_codes(self) -> List[Tuple[int, str, str, str]]:
        return self.conn.execute(
            "SELECT id, label, value, enrolled_at FROM known_codes ORDER BY id"
        ).fetchall()

    def load_known_codes(self) -> List[Tuple[str, str]]:
        """(label, value) pairs used for in-memory fuzzy matching."""
        return [(label, value) for _, label, value, _ in self.list_known_codes()]

    def insert_code_scan(
        self,
        payload: str,
        symbology: Optional[str],
        matched_label: Optional[str],
        match_score: Optional[float],
        snapshot_path: Optional[str],
    ) -> None:
        self.conn.execute(
            """INSERT INTO code_scans(ts, camera, site, payload, symbology, matched_label, match_score, snapshot_path)
               VALUES(%s, %s, %s, %s, %s, %s, %s, %s)""",
            (time.time(), self.camera, self.site, payload, symbology, matched_label, match_score, snapshot_path),
        )
        self.conn.commit()

    def insert_vitality(
        self, sighting_id: Optional[int], score: float, components: dict
    ) -> None:
        self.conn.execute(
            "INSERT INTO vitality_scores(sighting_id, ts, score, components) VALUES(%s, %s, %s, %s)",
            (sighting_id, time.time(), score, json.dumps(components)),
        )
        self.conn.commit()

    def commit(self) -> None:
        self.conn.commit()

    def session_report(self) -> dict:
        stats = {}
        row = self.conn.execute(
            "SELECT MIN(ts_start), MAX(COALESCE(ts_end, %s)) FROM sightings",
            (time.time(),),
        ).fetchone()
        stats["first_sighting"] = row[0]
        stats["last_activity"] = row[1]

        n_present = self.conn.execute(
            "SELECT COUNT(*) FROM presence_intervals WHERE present = 1"
        ).fetchone()[0]
        stats["present_intervals"] = n_present

        pres = self.conn.execute(
            "SELECT SUM(ts_end - ts_start) FROM presence_intervals WHERE present = 1"
        ).fetchone()[0] or 0.0
        total = self.conn.execute(
            "SELECT SUM(ts_end - ts_start) FROM presence_intervals"
        ).fetchone()[0] or 0.0
        stats["present_s"] = round(pres, 1)
        stats["total_s"] = round(total, 1)
        stats["absence_pct"] = (
            round(100.0 * (1.0 - pres / total), 2) if total > 0 else None
        )

        stats["sightings"] = self.conn.execute(
            """SELECT s.id, COALESCE(p.name, s.name, 'Unknown'), s.age_estimate,
                      s.match_distance, s.ts_start, s.ts_end, s.snapshot_path
               FROM sightings s LEFT JOIN persons p ON p.id = s.person_id
               ORDER BY s.id"""
        ).fetchall()

        stats["avg_vitality"] = self.conn.execute(
            "SELECT AVG(score) FROM vitality_scores"
        ).fetchone()[0]
        stats["vitality_count"] = self.conn.execute(
            "SELECT COUNT(*) FROM vitality_scores"
        ).fetchone()[0]

        stats["code_scans"] = self.conn.execute(
            """SELECT ts, payload, symbology, matched_label, match_score, snapshot_path
               FROM code_scans ORDER BY id"""
        ).fetchall()
        return stats
