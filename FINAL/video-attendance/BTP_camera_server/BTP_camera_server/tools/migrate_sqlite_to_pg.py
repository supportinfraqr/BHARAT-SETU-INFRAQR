"""One-time migration: copy a sqlite db file (incl. all embeddings) to Postgres.

Usage:
  .\\.venv\\Scripts\\python tools\\migrate_sqlite_to_pg.py --sqlite data\\db.sqlite3
  .\\.venv\\Scripts\\python tools\\migrate_sqlite_to_pg.py --sqlite data\\db_gate.sqlite3 --dbname btp_gate

Row ids are preserved so sightings keep pointing at the right persons, and
the SERIAL sequences are restarted past the migrated maxima.
"""
import argparse
import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import yaml

from src.database import Database

TABLES = ("persons", "face_embeddings", "sightings", "presence_intervals",
          "known_codes", "code_scans", "vitality_scores")


def main() -> int:
    p = argparse.ArgumentParser(description="Migrate a sqlite db file to Postgres")
    p.add_argument("--config", default="config.yaml")
    p.add_argument("--sqlite", required=True, help="source .sqlite3 file")
    p.add_argument("--dbname", default=None,
                   help="target postgres database (default: config postgres.dbname)")
    args = p.parse_args()

    if not os.path.isfile(args.sqlite):
        print(f"no such file: {args.sqlite}")
        return 1
    config = yaml.safe_load(open(args.config, encoding="utf-8"))
    pg_cfg = dict(config.get("postgres", {}))
    if args.dbname:
        pg_cfg["dbname"] = args.dbname

    src = sqlite3.connect(args.sqlite)
    db = Database(pg_cfg)  # creates db + schema
    total = 0
    for table in TABLES:
        cols = [r[1] for r in src.execute(
            f"PRAGMA table_info({table})").fetchall()]
        if not cols:
            continue
        if table == "persons" and "meta" not in cols:
            cols.append("meta")
        placeholders = ", ".join(["%s"] * len(cols))
        names = ", ".join(cols)
        n = 0
        for row in src.execute(f"SELECT * FROM {table}"):
            values = list(row)
            if table == "persons" and len(values) == len(cols) - 1:
                values.append("{}")
            db.conn.execute(
                f"INSERT INTO {table} ({names}) VALUES ({placeholders})", values)
            n += 1
        db.commit()
        db.conn.execute(
            "SELECT setval(pg_get_serial_sequence(%s, 'id'), "
            "(SELECT COALESCE(MAX(id), 0) FROM " + table + "))",
            (table,))
        db.commit()
        print(f"  {table}: {n} rows")
        total += n
    src.close()
    db.close()
    print(f"[migrate] {total} rows from {args.sqlite} -> postgres db "
          f"'{pg_cfg.get('dbname', 'btp')}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
