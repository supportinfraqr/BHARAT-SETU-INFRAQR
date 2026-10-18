#!/usr/bin/env python3
"""BSS Document Audit Agent — command line.

    python run_agent.py --groundtruth /tmp/job/gt --query /tmp/job/query            # full DeepSeek audit
    python run_agent.py --groundtruth … --query … --job job.json --out /srv/reports  # with known context
    python run_agent.py --evidence output/<report>/evidence/evidence.json             # re-audit saved evidence
    python run_agent.py --evidence samples/primo_hansford_jan2025/evidence.gold.json --offline   # demo, no key

Outputs in <out>/<report no>/:  <report>.html  <report>.pdf  <report>_findings.xlsx  <report>.json  evidence/
Key: DEEPSEEK_API_KEY environment variable, --deepseek-key, or config/deepseek.json.
job.json (all optional): {"principal_employer", "contractor_legal_name", "site", "site_short", "state", "state_name",
                          "wage_month": "YYYY-MM", "nature_of_work", "is_construction"}
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from bss_agent import JobError, run_job  # noqa: E402


def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(line_buffering=True)   # progress appears live even when redirected to a log
    except AttributeError:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--groundtruth", type=Path, help="folder with the workers' own documents (ground truth)")
    ap.add_argument("--query", type=Path, help="folder with the contractor's submission (query documents)")
    ap.add_argument("--job", type=Path, help="job.json with context the BSS platform already knows")
    ap.add_argument("--out", type=Path, default=None, help="output folder (default: output/)")
    ap.add_argument("--deepseek-key", default=None, help="DeepSeek API key (else DEEPSEEK_API_KEY / config/deepseek.json)")
    ap.add_argument("--evidence", type=Path, help="re-audit an existing evidence.json instead of reading documents")
    ap.add_argument("--offline", action="store_true", help="no DeepSeek calls (rule engine only; needs --evidence)")
    ap.add_argument("--keep-work", action="store_true", help="keep rendered page images")
    a = ap.parse_args(argv)
    if not a.evidence and not (a.groundtruth and a.query):
        ap.error("give --groundtruth and --query (or --evidence)")
    job = json.loads(a.job.read_text(encoding="utf-8")) if a.job else {}
    print("BSS Document Audit Agent")
    try:
        r = run_job(a.groundtruth, a.query, a.out, job=job, api_key=a.deepseek_key, offline=a.offline,
                    evidence_path=a.evidence, keep_work=a.keep_work)
    except JobError as exc:
        print(f"  ERROR: {exc}")
        return 2
    s = r["summary"]
    print(f"  verdicts      : {s['mode']} · {s['checkpoints']} checkpoints · {s['subchecks']} sub-checks")
    print(f"  result        : {s['score']}% compliance · overall risk {s['overall_risk']} · {s['flags']} flags · "
          f"exposure ₹{s['exposure_inr']:,}")
    for i in s["issues"][:10]:
        print(f"  note          : {i}")
    print(f"  html          : {r['html']}\n  pdf           : {r['pdf']}\n  workbook      : {r['xlsx']}\n  json          : {r['json']}")
    print(f"  done in {s['seconds']}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
