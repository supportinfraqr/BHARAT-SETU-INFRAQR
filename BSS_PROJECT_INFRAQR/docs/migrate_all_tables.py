"""Bulk migration: copy ALL BharatSharamShetu tables from SQL Server into PostgreSQL.

Runs while the SQL Server container is up. Uses pyodbc (source) + psycopg2 (target).
Creates tables in Postgres with a `bss_legacy_` prefix and copies all rows.

Usage: ./venv/bin/python migrate_all_tables.py
"""
import os
import sys

import pyodbc
import psycopg2
from psycopg2 import sql

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

MSSQL_DSN = (
    "DRIVER={ODBC Driver 18 for SQL Server};SERVER=127.0.0.1,1433;"
    "DATABASE=BharatSharamShetu;UID=sa;PWD=InfraQR2026!sql;TrustServerCertificate=yes;Encrypt=yes"
)
PG_DSN = "host=127.0.0.1 port=5432 dbname=bss_qr user=bss password=Bss2026!pg"
PREFIX = "bss_legacy_"


def pg_type(mssql_type, size, precision, scale, is_identity, has_default):
    t = mssql_type.lower()
    if t in ("int", "bigint", "smallint", "tinyint", "bit"):
        if is_identity:
            return "BIGSERIAL" if t == "bigint" else "SERIAL"
        return {"int": "INTEGER", "bigint": "BIGINT", "smallint": "SMALLINT", "tinyint": "SMALLINT", "bit": "BOOLEAN"}[t]
    if t in ("decimal", "numeric"):
        p = precision or 18
        s = scale or 0
        return f"NUMERIC({p},{s})"
    if t in ("float", "real"):
        return "DOUBLE PRECISION" if t == "float" else "REAL"
    if t in ("datetime", "datetime2", "smalldatetime", "date"):
        return "TIMESTAMP" if t != "date" else "DATE"
    if t == "time":
        return "TIME"
    if t == "datetimeoffset":
        return "TIMESTAMPTZ"
    if t in ("uniqueidentifier"):
        return "UUID"
    if t in ("varchar", "char", "nvarchar", "nchar", "text", "ntext", "sysname"):
        return "TEXT"
    if t in ("varbinary", "binary", "image", "timestamp", "rowversion"):
        return "BYTEA"
    if t in ("xml",):
        return "TEXT"
    if t in ("money", "smallmoney"):
        return "NUMERIC(19,4)"
    return "TEXT"


def main():
    src = pyodbc.connect(MSSQL_DSN)
    src.setencoding("utf-8")
    src.setdecoding(pyodbc.SQL_CHAR, encoding="utf-8")

    dst = psycopg2.connect(PG_DSN)
    dst.autocommit = True

    tables = [(r.table_schema, r.table_name) for r in
              src.cursor().execute(
                  "SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name "
                  "FROM INFORMATION_SCHEMA.TABLES "
                  "WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME"
              ).fetchall()]
    print(f"Found {len(tables)} tables across all schemas")

    for schema, tb in tables:
        src_cur = src.cursor()
        cols = src_cur.execute(
            "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, "
            "NUMERIC_SCALE, COLUMNPROPERTY(OBJECT_ID(QUOTENAME(?) + '.' + QUOTENAME(TABLE_NAME)), COLUMN_NAME, 'IsIdentity') "
            "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
            schema, schema, tb,
        ).fetchall()
        pg_table = PREFIX + (schema + "_" + tb).lower()
        col_defs = []
        col_names = []
        for name, dtype, maxlen, prec, scale, is_id in cols:
            col_names.append(name)
            pg = pg_type(dtype, maxlen, prec, scale, bool(is_id), False)
            col_defs.append(sql.SQL("{} {}").format(sql.Identifier(name), sql.SQL(pg)))
        create_sql = sql.SQL("DROP TABLE IF EXISTS {} CASCADE; CREATE TABLE {} ({})").format(
            sql.Identifier(pg_table), sql.Identifier(pg_table), sql.SQL(", ").join(col_defs)
        )
        dst.cursor().execute(create_sql)

        # Copy data in batches
        quoted_cols = ", ".join(f"[{c}]" for c in col_names)
        sel = f"SELECT {quoted_cols} FROM [{schema}].[{tb}]"
        src_cur.execute(sel)
        batch = []
        n = 0
        while True:
            rows = src_cur.fetchmany(500)
            if not rows:
                break
            placeholders = ", ".join(["%s"] * len(col_names))
            ins = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                sql.Identifier(pg_table),
                sql.SQL(", ").join(sql.Identifier(c) for c in col_names),
                sql.SQL(placeholders),
            )
            dst.cursor().executemany(ins, [tuple(r) for r in rows])
            n += len(rows)
        print(f"  {tb}: {n} rows")

    dst.close()
    src.close()
    print("Done.")


if __name__ == "__main__":
    main()
