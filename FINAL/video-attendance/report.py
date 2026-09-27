import argparse
import datetime
import json
import sys

from src.database import Database
import yaml


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def fmt_ts(ts) -> str:
    if ts is None:
        return "-"
    return datetime.datetime.fromtimestamp(float(ts)).strftime("%Y-%m-%d %H:%M:%S")


def main() -> int:
    p = argparse.ArgumentParser(description="Session report from the database")
    p.add_argument("--config", default="config.yaml")
    p.add_argument("--json", action="store_true")
    p.add_argument("--db", default=None, metavar="NAME",
                   help="postgres database name (default: config postgres.dbname; "
                        "per-camera databases are btp_<name>)")
    args = p.parse_args()

    config = load_config(args.config)
    pg_cfg = dict(config.get("postgres", {}))
    if args.db:
        pg_cfg["dbname"] = args.db
    db = Database(pg_cfg)
    r = db.session_report()

    if args.json:
        print(json.dumps(r, indent=2, default=str))
        db.close()
        return 0

    total = r.get("total_s") or 0.0
    pres = r.get("present_s") or 0.0
    absence = r.get("absence_pct")

    print("================ BTP CCTV REPORT ================")
    print(f"monitored duration   : {total:.1f} s ({total / 60:.1f} min)")
    print(f"time person present  : {pres:.1f} s")
    if absence is not None:
        print(f"ABSENCE PERCENTAGE   : {absence}%")
    else:
        print("absence percentage   : n/a (no presence data)")

    print("\n--- Sightings ---")
    sightings = r["sightings"]
    if not sightings:
        print("none recorded")
    for sid, name, age, dist, t0, t1, snap in sightings:
        dur = (t1 - t0) if (t0 and t1) else None
        dur_s = f"{dur:.0f}s" if dur else "ongoing"
        age_s = f"{age}y" if age is not None else "?"
        d_s = f"{dist:.3f}" if dist is not None else "-"
        print(f"  #{sid:<4} {name:<20} age~{age_s:<5} match_d={d_s:<7} "
              f"{fmt_ts(t0)} -> {fmt_ts(t1)} [{dur_s}]")

    avg_v = r.get("avg_vitality")
    print(f"\naverage vitality     : {float(avg_v):.1f} / 100 "
          f"({r['vitality_count']} samples)" if avg_v is not None else
          "\naverage vitality     : no samples")

    print("\n--- Code Scans (QR + barcode) ---")
    if not r["code_scans"]:
        print("none captured")
    for ts, payload, symbology, matched_label, match_score, _ in r["code_scans"]:
        sym_s = symbology or "?"
        if matched_label:
            match_s = f"-> {matched_label} (score={match_score:.2f})"
        else:
            score_s = f"{match_score:.2f}" if match_score is not None else "-"
            match_s = f"-> unmatched (best score={score_s})"
        print(f"  {fmt_ts(ts)}  [{sym_s:<8}] {payload}  {match_s}")

    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())