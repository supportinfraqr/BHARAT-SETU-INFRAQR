"""Evidence layer: everything the audit is allowed to look at, loaded from evidence.json.

evidence.json (schema "bss-evidence/2", produced by extract.py) holds
  meta           run context (contractor, principal employer, site, state, wage month, codes)
  documents      inventory of every input file: doc type, pages, text-layer / image pages
  docs           doc type -> first file of that type
  workers        employee code -> {doc type -> record}; every record carries "_doc" and "ref"
  registers      doc type -> register-level attributes (form, signatures, nil statements …)
  establishment  doc type -> document attributes (challans, returns, registrations …)
  cross          values that must agree across documents: [[value, doc type, note], …]
  groundtruth    persons from the worker folder: fields [[value, source]] + document checklist
  unmatched_rows rows of establishment-wide returns not linked to a worker on this site
  corpus         digital text of contractor documents (for "is this ID anywhere?" searches)
"""

from __future__ import annotations

import calendar
import difflib
from functools import lru_cache
import json
import re
from datetime import date, datetime
from pathlib import Path

# --------------------------------------------------------------------------- normalisers
DATE_FORMATS = ("%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d-%m-%y", "%d/%m/%y", "%Y-%m-%d", "%d-%b-%y",
                "%d %b %Y", "%d %B %Y", "%d-%B-%Y", "%B %d, %Y", "%d/%b/%Y", "%d %b, %Y", "%d %B, %Y", "%Y/%m/%d")


def parse_date(s) -> date | None:
    if isinstance(s, date):
        return s
    s = re.sub(r"\s+", " ", str(s or "")).strip().rstrip(".")
    s = re.sub(r"(\d)(st|nd|rd|th)\b", r"\1", s)
    for f in DATE_FORMATS:
        try:
            return datetime.strptime(s, f).date()
        except ValueError:
            pass
    m = re.match(r"^(\d{1,2})[-/ ](\w{3,9})[-/ ,]+(\d{2,4})$", s)
    if m:
        return parse_date(f"{m.group(1)}-{m.group(2)[:3]}-{m.group(3)}")
    return None


def fmt_date(d: date | None) -> str:
    return d.strftime("%d-%m-%Y") if d else "—"


def digits(s) -> str:
    return re.sub(r"\D", "", str(s or ""))


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(",", "").replace("₹", "").replace("Rs.", "").strip())
    except (TypeError, ValueError):
        return None


def nz(v) -> float:
    n = num(v)
    return n if n is not None else 0.0


def money(v) -> str:
    n = num(v)
    if n is None:
        return str(v) if v not in (None, "") else "—"
    s = f"₹{n:,.2f}"
    return s[:-3] if s.endswith(".00") else s


def blank(v) -> bool:
    return v is None or str(v).strip() in ("", "-", "—", "NA", "N/A", "null", "None")


def tokens(s: str) -> list[str]:
    s = re.sub(r"\b(mr|mrs|ms|miss|smt|shri|sri|kum|kumari|master|late|s/o|c/o|d/o|w/o)\b\.?", " ", str(s or "").lower())
    return re.findall(r"[a-z]+", s)


@lru_cache(maxsize=200_000)
def _close(a: str, b: str) -> bool:
    if a == b:
        return True
    if min(len(a), len(b)) / max(len(a), len(b), 1) < 0.6:      # cheap rejects before the full ratio
        return False
    m = difflib.SequenceMatcher(None, a, b)
    return m.real_quick_ratio() >= 0.8 and m.quick_ratio() >= 0.8 and m.ratio() >= 0.8


def compare_names(gt, cv) -> tuple[str, str]:
    return _compare_names(str(gt or ""), str(cv or ""))


@lru_cache(maxsize=200_000)
def _compare_names(gt: str, cv: str) -> tuple[str, str]:
    """-> (Match | Minor variation | Mismatch | Not recorded, explanation)."""
    g, c = tokens(gt), tokens(cv)
    if not c:
        return "Not recorded", ""
    if g == c:
        return "Match", ""
    if len(g) == len(c) and all(_close(x, y) for x, y in zip(g, c)):
        return "Minor variation", "spelling differs"
    in_c = lambda t: any(_close(t, x) for x in c)  # noqa: E731
    in_g = lambda t: any(_close(t, x) for x in g)  # noqa: E731
    if all(in_c(t) for t in g) or all(in_g(t) for t in c):
        missing = [t for t in g if not in_c(t)]
        extra = [t for t in c if not in_g(t)]
        why = "shorter form"
        if missing:
            why += f" (missing: {' '.join(missing).upper()})"
        if extra:
            why += f" (extra: {' '.join(extra).upper()})"
        return "Minor variation", why
    dg = [t for t in g if not in_c(t)]
    dc = [t for t in c if not in_g(t)]
    return "Mismatch", f"'{' '.join(dg).upper()}' recorded as '{' '.join(dc).upper()}'"


def pin_and_house(addr: str) -> tuple[str, str]:
    pins = re.findall(r"(?<!\d)(\d{6})(?!\d)", re.sub(r"(\d{3})\s(\d{3})", r"\1\2", addr or ""))
    pin = pins[-1] if pins else ""
    house = [h for h in re.findall(r"(?<![\d])(\d{1,5})(?![\d])", (addr or "").replace("-", " ")) if h != pin]
    return pin, (house[0] if house else "")


def _full(field: str, v) -> str:
    """Complete Aadhaar (12 digits) or PAN (AAAAA9999A), else '' — partial / masked numbers never link people."""
    if field == "pan":
        x = re.sub(r"\s", "", str(v or "")).upper()
        return x if re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", x) else ""
    x = digits(v)
    return x if len(x) == 12 else ""


def base_type(key: str) -> str:
    return key.split("#")[0]


# --------------------------------------------------------------------------- evidence
class Evidence:
    def __init__(self, data: dict):
        self.data = data
        self.meta: dict = data.get("meta", {})
        self.workers: dict[str, dict] = data.get("workers", {})
        self.registers: dict = data.get("registers", {})
        self.est: dict = data.get("establishment", {})
        self.cross: dict = data.get("cross", {})
        self.docs: dict[str, str] = data.get("docs", {})
        self.documents: list[dict] = data.get("documents", [])
        self.gt: dict = data.get("groundtruth", {"workers": {}})
        self.unmatched: dict = data.get("unmatched_rows", {})
        self.corpus: dict[str, str] = {k: re.sub(r"\s", "", v).upper() for k, v in data.get("corpus", {}).items()}
        self.contractor = self.meta.get("contractor_legal_name") or "Contractor"
        wm = str(data.get("wage_month") or self.meta.get("wage_month") or "")
        if not re.fullmatch(r"\d{4}-\d{2}", wm):
            raise ValueError(f"evidence has no valid wage_month (got {wm!r})")
        y, m = map(int, wm.split("-"))
        self.month_start = date(y, m, 1)
        self.month_days = calendar.monthrange(y, m)[1]       # always from the month itself, never trusted from the file
        self.month_end = date(y, m, self.month_days)
        self._index()
        self.links = self._link()

    @classmethod
    def load(cls, path: Path) -> "Evidence":
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    # -- documents
    def cq_documents(self) -> list[dict]:
        return [d for d in self.documents if d["root"] == "cq"]

    def has(self, *doc_types) -> list[dict]:
        """Contractor documents of the given types."""
        return [d for d in self.cq_documents() if d["doc_type"] in doc_types]

    def find_docs(self, pattern: str) -> list[dict]:
        rx = re.compile(pattern, re.I)
        return [d for d in self.cq_documents() if rx.search(d["rel"])]

    def doc(self, doc_type: str) -> dict:
        """Establishment / register attributes for a doc type ({} when not supplied)."""
        return self.est.get(doc_type) or self.registers.get(doc_type) or {}

    def doc_name(self, key: str) -> str:
        from .doctypes import BY_KEY
        bt = base_type(key)
        if bt in self.docs:
            return Path(self.docs[bt]).stem
        t = BY_KEY.get(bt)
        return t.title if t else key

    def loc(self, key: str, rec: dict | None = None) -> str:
        rec = rec or {}
        doc = rec.get("_doc") or self.docs.get(base_type(key)) or self.doc_name(key)
        ref = rec.get("ref", "")
        return f"{doc} › {ref}" if ref else str(doc)

    # -- workers
    def worker_name(self, code: str) -> str:
        w = self.workers.get(code, {})
        for k in ("WG", "WR", "MR", "PFECR", "F11", "SC"):
            if w.get(k, {}).get("name"):
                return str(w[k]["name"]).title()
        return code

    def recs(self, code: str, doc_type: str) -> list[tuple[str, dict]]:
        """All records of a doc type for a worker (handles 'SVC', 'SVC#2' …)."""
        return [(k, r) for k, r in self.workers.get(code, {}).items() if base_type(k) == doc_type and isinstance(r, dict)]

    def facts(self, code: str, field: str):
        """(doc_key, record, value) for every contractor document that records `field`."""
        for key, rec in self.workers.get(code, {}).items():
            if isinstance(rec, dict) and not blank(rec.get(field)):
                yield key, rec, rec[field]

    def gt_field(self, gname: str, field: str):
        vals = self.gt["workers"].get(gname, {}).get("fields", {}).get(field) or []
        return tuple(vals[0]) if vals else (None, None)

    def gt_for(self, code: str) -> str | None:
        return next((g for g, c in self.links.items() if c == code), None)

    def _index(self):
        """ID and DOB indexes over the contractor roster (built once; keeps linking linear for any roster)."""
        self._by_id: dict[str, set] = {}
        self._by_dob: dict = {}
        self._kinds: dict[str, set] = {}
        for code, w in self.workers.items():
            kinds = set()
            for r in w.values():
                if not isinstance(r, dict):
                    continue
                for f in ("aadhaar", "pan"):
                    v = _full(f, r.get(f))
                    if v:
                        self._by_id.setdefault(v, set()).add(code)
                        kinds.add(f)
                d = parse_date(r.get("dob"))
                if d:
                    self._by_dob.setdefault(d, set()).add(code)
            self._kinds[code] = kinds

    def _link(self) -> dict[str, str | None]:
        """Ground-truth person -> contractor employee code (same DOB + given name, or same Aadhaar / PAN)."""
        links = {}
        for gname, g in self.gt.get("workers", {}).items():
            f = g.get("fields", {})
            dobs = {parse_date(v) for v, _ in f.get("dob", [])} - {None}
            names = [v for v, _ in f.get("name", [])]
            firsts = {(tokens(v) or [""])[0] for v in names}
            ids = ({_full("aadhaar", v) for v, _ in f.get("aadhaar", [])} | {_full("pan", v) for v, _ in f.get("pan", [])}) - {""}
            id_kinds = {"aadhaar" if i.isdigit() else "pan" for i in ids}
            hit = set().union(*(self._by_id.get(i, set()) for i in ids)) if ids else set()
            by_id = sorted(hit)[0] if len(hit) == 1 else None
            by_name = []
            for code in sorted(set().union(*(self._by_dob.get(d, set()) for d in dobs)) if dobs else set()):
                rec_ids = ({_full("aadhaar", r.get("aadhaar")) for r in self.workers[code].values() if isinstance(r, dict)} |
                           {_full("pan", r.get("pan")) for r in self.workers[code].values() if isinstance(r, dict)}) - {""}
                if id_kinds & self._kinds.get(code, set()) and not (ids & rec_ids):
                    continue                    # both sides hold that ID type, and it differs
                if any(parse_date(r.get("dob")) in dobs and (tokens(r.get("name")) or [""])[0] in firsts
                       for r in self.workers[code].values() if isinstance(r, dict)):
                    by_name.append(code)
            links[gname] = by_id or (by_name[0] if len(by_name) == 1 else None)
        return links

    def corpus_hits(self, needle: str) -> list[str]:
        n = re.sub(r"\s", "", str(needle or "")).upper()
        if len(n) < 6:
            return []
        hits = [rel for rel, t in self.corpus.items() if n in t]
        if getattr(self, "_blob", None) is None:          # built once, not per search
            self._blob = re.sub(r"\s", "", json.dumps(self.workers, ensure_ascii=False).upper() + json.dumps(self.unmatched, ensure_ascii=False).upper())
        if n in self._blob and not hits:
            hits.append("extracted contractor records")
        return hits
