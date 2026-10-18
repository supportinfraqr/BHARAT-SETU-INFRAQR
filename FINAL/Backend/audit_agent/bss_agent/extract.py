"""DeepSeek reads the two input folders into one canonical evidence file (evidence.json).

  1. classify  — every contractor document gets a doc type (doctypes.py); every ground-truth page is
                 classified on its own (a worker PDF often holds Aadhaar + PAN + passbook + photo).
  2. extract   — every document is read by DeepSeek against its doc-type schema: text-layer pages go as
                 text (plus the page image for visual types), scanned pages / photos go as images to the
                 vision model. Nothing is OCR'd locally.
  3. assemble  — rows are linked to workers (employee code, UAN, IP number, Aadhaar/PAN, name + DOB),
                 ground-truth pages are grouped into persons, establishment figures are collected, and
                 the run context (contractor, site, state, wage month) is resolved.

The evidence file is the single input to the audit, and it is saved with the report so every
verdict can be traced back to "document › page / row".
"""

from __future__ import annotations

import calendar
import difflib
import json
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

from .deepseek_api import DeepSeekClient, DeepSeekError, DeepSeekTruncated, as_dict, as_list, as_str
from .doctypes import BY_KEY, CQ_TYPES, GT_LABEL, GT_TYPES, heuristic
from .evidence import compare_names, digits, num, parse_date, tokens
from .ingest import SourceDoc

PROMPT_VERSION = "bss-extract-2"
MAX_TEXT_PER_CALL = 150_000      # characters of text layer per call; larger documents are read in several calls
MAX_IMAGES_PER_CALL = 10         # page images per call

EXTRACT_SYSTEM = (
    "You are the document-reading stage of an Indian labour-law compliance audit. You read one document "
    "(its digital text layer and/or page images) and return its content as JSON in the schema given.\n"
    "Rules:\n"
    "1. Copy values EXACTLY as printed (names, numbers, dates, codes). Never correct spelling, never normalise, "
    "never guess. If a value is absent, blank, '-' or illegible, return null.\n"
    "2. Numbers: return plain numbers without currency symbols or commas. Dates: as printed.\n"
    "3. Every row object must carry \"ref\": the page and row where it was read, e.g. \"p2 row 5\".\n"
    "4. Booleans about signatures, stamps, photographs and handwriting must come from what you SEE in the page "
    "image; if no image was given and the text cannot settle it, return null.\n"
    "5. Return every row — never summarise or truncate a register.\n"
    "6. Output a single JSON object: {\"doc_type_confirmed\": <type key or the better key if this is clearly a "
    "different type>, \"attributes\": {...}, \"rows\": [...], \"reading_issues\": [strings]}.")

CLASSIFY_SYSTEM = (
    "You classify documents submitted for an Indian labour-law compliance audit. Given a file name and its "
    "first page (text and/or image), pick the single best document type key from the list. Return JSON "
    "{\"doc_type\": key, \"confidence\": 0-1, \"title\": short title as printed, \"period\": wage month / period if printed}.")

GT_PAGE_SYSTEM = (
    "You read one page from a worker's personal folder (identity and HR documents) for an Indian labour-law audit. "
    "Identify what the page is and copy its fields exactly as printed. Never guess; null when absent or illegible. "
    "Return JSON {\"doc_type\": key, \"fields\": {...}, \"completeness\": {\"date_filled\": bool|null, "
    "\"employee_signature\": bool|null, \"employer_signature\": bool|null, \"photo\": bool|null, \"attested\": bool|null}, "
    "\"notes\": str}.")

PROFILE_SYSTEM = (
    "You resolve the context of a labour-compliance audit from document headers. Use ONLY the supplied facts. "
    "Return JSON {\"contractor_legal_name\", \"contractor_address\", \"principal_employer\", \"site\", \"site_short\", "
    "\"state_code\" (2-letter Indian state code of the work site, e.g. MH), \"state_name\", \"wage_month\" (YYYY-MM), "
    "\"nature_of_work\", \"is_construction\" (bool), \"pan\"} — null for anything not evidenced.")


# =========================================================================== classify
def _type_menu(types) -> str:
    return "\n".join(f"{t.key}: {t.title}" for t in types)


def _first_page_content(client: DeepSeekClient | None, d: SourceDoc, with_image: bool) -> list:
    p = d.pages[0] if d.pages else None
    parts = [{"type": "text", "text": f"File: {d.rel}\nPages: {len(d.pages)}\n" +
              (f"First-page text layer:\n{p.text[:3500]}" if p and p.text.strip() else "No text layer (scan / photo).")}]
    if client and p and p.image and (with_image or p.needs_vision):
        parts.append(client.image_block(p.image, 1400))
    return parts


def classify_cq(docs: list[SourceDoc], client: DeepSeekClient | None) -> dict[str, dict]:
    out = {}
    menu = _type_menu(CQ_TYPES)

    def one(d: SourceDoc):
        cands = heuristic(d.rel, d.pages[0].text if d.pages else "", "cq")
        guess = cands[0][0] if cands else "OTHER"
        res = {"doc_type": guess, "confidence": 0.5 if cands else 0.1, "method": "heuristic", "candidates": cands[:4]}
        if client and client.available and d.pages:
            try:
                user = [{"type": "text", "text": f"Document types:\n{menu}\n\nHeuristic guess: {guess}"}] + _first_page_content(client, d, False)
                r = client.chat_json("classify", CLASSIFY_SYSTEM, user, max_tokens=4000, tag=f"classify:{d.rel}")
                dt = as_str(r.get("doc_type")).strip().upper()
                if dt in BY_KEY and BY_KEY[dt].root != "gt":
                    res.update(doc_type=dt, confidence=r.get("confidence"), method="deepseek",
                               title=as_str(r.get("title"))[:200], period=as_str(r.get("period"))[:60])
            except Exception as exc:          # keep the heuristic type; never stop the run
                res["error"] = f"{type(exc).__name__}: {exc}"
        return d.id, res

    with ThreadPoolExecutor(max_workers=(client.cfg["max_parallel"] if client else 1)) as ex:
        for k, v in ex.map(one, [d for d in docs if d.root == "cq" and not d.error]):
            out[k] = v
    return out


# =========================================================================== extract (contractor)
def _chunks(d: SourceDoc, visual: bool) -> list[list]:
    """Group pages so each call stays within text / image limits."""
    groups, cur, chars, imgs = [], [], 0, 0
    for p in d.pages:
        n_img = 1 if (p.image and (visual or p.needs_vision)) else 0
        n_txt = len(p.text)
        if cur and (chars + n_txt > MAX_TEXT_PER_CALL or imgs + n_img > MAX_IMAGES_PER_CALL):
            groups.append(cur)
            cur, chars, imgs = [], 0, 0
        cur.append(p)
        chars += n_txt
        imgs += n_img
    if cur:
        groups.append(cur)
    return groups


def _read_group(client: DeepSeekClient, d: SourceDoc, t, group: list) -> list[dict]:
    """One DeepSeek call for a group of pages; if the answer is truncated or not valid JSON, split the group
    and read each half — down to single pages. Returns one answer per successful call."""
    parts = [{"type": "text", "text": f"{t.spec_text()}\n\nFile: {d.rel}  (pages {group[0].no}-{group[-1].no} of {len(d.pages)})"}]
    for p in group:
        if p.text.strip() and not p.needs_vision:
            parts.append({"type": "text", "text": f"=== PAGE {p.no} — digital text layer ===\n{p.text}"})
        if p.image and (t.visual or p.needs_vision):
            parts.append({"type": "text", "text": f"=== PAGE {p.no} — image ===" +
                          (" (no text layer: read everything from the image)" if p.needs_vision else "")})
            parts.append(client.image_block(p.image))
    role = "vision" if any(p.needs_vision for p in group) else "extract"
    try:
        return [client.chat_json(role, EXTRACT_SYSTEM, parts, tag=f"extract:{t.key}:{d.rel}:{group[0].no}-{group[-1].no}")]
    except DeepSeekError as exc:
        retryable = isinstance(exc, DeepSeekTruncated) or "valid JSON" in str(exc)
        if not retryable:
            raise
        if len(group) == 1:
            raise DeepSeekError(f"page {group[0].no}: {exc} even when read alone") from exc
        mid = len(group) // 2
        return _read_group(client, d, t, group[:mid]) + _read_group(client, d, t, group[mid:])


def extract_cq_doc(client: DeepSeekClient, d: SourceDoc, doc_type: str) -> dict:
    t = BY_KEY[doc_type]
    merged = {"doc_type": doc_type, "attributes": {}, "rows": [], "reading_issues": [], "calls": 0}
    for group in _chunks(d, t.visual):
        try:
            answers = _read_group(client, d, t, group)
        except DeepSeekError as exc:      # keep what the other pages gave; record the unread pages
            merged["reading_issues"].append(f"Pages {group[0].no}-{group[-1].no} could not be read: {exc}")
            merged.setdefault("errors", []).append(str(exc))
            continue
        for r in answers:
            merged["calls"] += 1
            for k, v in as_dict(r.get("attributes")).items():
                if merged["attributes"].get(k) in (None, "", [], {}):
                    merged["attributes"][str(k)] = v
            merged["rows"] += [{str(k): v for k, v in row.items()} for row in as_list(r.get("rows")) if isinstance(row, dict)]
            ri = r.get("reading_issues")
            merged["reading_issues"] += [as_str(i) for i in (ri if isinstance(ri, list) else [ri] if ri else [])]
            conf = as_str(r.get("doc_type_confirmed")).strip().upper()
            if conf in BY_KEY and conf != doc_type and BY_KEY[conf].root != "gt":
                merged["reclassified_as"] = conf
    if merged.get("errors") and not merged["calls"]:
        merged["error"] = "; ".join(merged["errors"])
    return merged


# =========================================================================== extract (ground truth, per page)
def extract_gt_page(client: DeepSeekClient, d: SourceDoc, page) -> dict:
    menu = "\n".join(t.spec_text() for t in GT_TYPES)
    parts = [{"type": "text", "text": f"Possible page types and their fields:\n{menu}\n\nFile: {d.rel} — page {page.no} of {len(d.pages)}"}]
    if page.text.strip() and not page.needs_vision:
        parts.append({"type": "text", "text": f"Digital text layer:\n{page.text}"})
    if page.image:
        parts.append(client.image_block(page.image))
    r = client.chat_json("vision", GT_PAGE_SYSTEM, parts, max_tokens=8000, tag=f"gt:{d.rel}:{page.no}")
    dt = as_str(r.get("doc_type")).strip().upper()
    fields = {str(k): (v if isinstance(v, (str, int, float, bool)) or v is None else as_str(v)) for k, v in as_dict(r.get("fields")).items()}
    return {"doc_type": dt if dt in BY_KEY and dt.startswith("GT_") else "GT_OTHER", "fields": fields,
            "completeness": as_dict(r.get("completeness")), "notes": as_str(r.get("notes"))[:500], "page": page.no}


# =========================================================================== orchestration
def read_all(docs: list[SourceDoc], client: DeepSeekClient | None, log=print) -> dict:
    """Classify + extract every document. Returns the raw extraction (cached per file by the client)."""
    raw = {"prompt_version": PROMPT_VERSION, "classification": {}, "cq": {}, "gt": {}, "errors": []}
    if not (client and client.available):
        raw["errors"].append("DeepSeek not available — documents were inventoried but not read.")
        raw["classification"] = classify_cq(docs, None)
        return raw
    log(f"  classifying {sum(d.root == 'cq' for d in docs)} contractor documents …")
    raw["classification"] = classify_cq(docs, client)

    jobs = []
    for d in docs:
        if d.error or not d.pages:
            continue
        if d.root == "cq":
            jobs.append(("cq", d, raw["classification"][d.id]["doc_type"]))
        else:
            jobs += [("gt", d, p) for p in d.pages]
    log(f"  reading {len(jobs)} documents / pages with DeepSeek …")

    def run(job):
        kind, d, arg = job
        try:
            if kind == "cq":
                res = extract_cq_doc(client, d, arg)
                if res.get("reclassified_as") and res["reclassified_as"] != arg:
                    res = extract_cq_doc(client, d, res["reclassified_as"])
                return kind, d.id, None, res
            return kind, d.id, arg.no, extract_gt_page(client, d, arg)
        except Exception as exc:
            return kind, d.id, getattr(arg, "no", None), {"error": f"{type(exc).__name__}: {exc}"}

    with ThreadPoolExecutor(max_workers=client.cfg["max_parallel"]) as ex:
        for kind, did, page, res in ex.map(run, jobs):
            if res.get("error"):
                raw["errors"].append(f"{did}{f' p{page}' if page else ''}: {res['error']}")
            if kind == "cq":
                raw["cq"][did] = res
            else:
                raw["gt"].setdefault(did, []).append(res)
    return raw


# =========================================================================== assemble
def _norm_code(v) -> str:
    return re.sub(r"\s", "", str(v or "")).upper().strip("-")


def _same_person(a_name, b_name, a_dob=None, b_dob=None) -> bool:
    if not a_name or not b_name:
        return False
    res, _ = compare_names(a_name, b_name)
    da, db = parse_date(a_dob), parse_date(b_dob)
    if da and db and da != db:
        return False
    if res == "Match":
        return True
    if res == "Minor variation":
        shared = set(tokens(a_name)) & set(tokens(b_name))
        return len(shared) >= 2 or (len(tokens(a_name)) == 1 or len(tokens(b_name)) == 1) and bool(shared)
    return False


AADHAAR_RX = re.compile(r"^\d{12}$")
PAN_RX = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")
UAN_RX = re.compile(r"^\d{12}$")
IP_RX = re.compile(r"^\d{10}$")


def full_id(field: str, v) -> str:
    """A complete identifier, or '' — masked / partial numbers never link two people."""
    if field == "pan":
        x = _norm_code(v)
        return x if PAN_RX.match(x) else ""
    x = digits(v)
    rx = {"aadhaar": AADHAAR_RX, "uan": UAN_RX, "esic_ip": IP_RX}[field]
    return x if rx.match(x) else ""


def _near(a: str, b: str, k: int = 2) -> bool:
    return len(a) == len(b) and sum(x != y for x, y in zip(a, b)) <= k


class _Roster:
    """Links rows of every document to one worker. A row never joins a worker whose employee code or any
    complete ID (UAN, IP, Aadhaar, PAN) is present and different. Indexed, so linking stays fast for any
    number of workers."""

    FIELDS = ("uan", "esic_ip", "aadhaar", "pan")

    def __init__(self):
        self.workers: dict[str, dict] = {}
        self.ids: dict[str, dict[str, set]] = {}              # key -> field -> ids
        self.by_id: dict[tuple, str] = {}                      # (field, id) -> key
        self.by_first: dict[str, set] = defaultdict(set)       # first 3 letters of first name -> keys

    def _conflicts(self, row: dict, key: str) -> bool:
        """A different code or ID means a different person — unless the ID differs by at most 2 characters
        (a misread digit on a scan / handwriting), which the cross-document checks then report."""
        ids = self.ids.get(key, {})
        code = _norm_code(row.get("emp_code"))
        if code and ids.get("emp_code") and code not in ids["emp_code"]:
            return True
        for f in self.FIELDS:
            v = full_id(f, row.get(f))
            if v and ids.get(f) and v not in ids[f] and not any(_near(v, x) for x in ids[f]):
                return True
        return False

    def key_for(self, row: dict) -> str | None:
        code = _norm_code(row.get("emp_code"))
        if code and code in self.workers:
            return code
        for f in self.FIELDS:
            v = full_id(f, row.get(f))
            k = self.by_id.get((f, v)) if v else None
            if k and not self._conflicts(row, k):
                return k
        t = tokens(row.get("name"))
        if not t:
            return None
        cands = [k for k in self.by_first.get(t[0][:3], ())
                 if any(isinstance(rec, dict) and _same_person(rec.get("name"), row.get("name"), rec.get("dob"), row.get("dob"))
                        for rec in self.workers[k].values()) and not self._conflicts(row, k)]
        return cands[0] if len(cands) == 1 else None      # ambiguous name -> do not guess

    def add(self, key: str, doc_type: str, rec: dict):
        self.workers.setdefault(key, {})
        ids = self.ids.setdefault(key, {f: set() for f in ("emp_code",) + self.FIELDS})
        if doc_type in self.workers[key]:  # second record of the same type (e.g. two certificates)
            n = 2
            while f"{doc_type}#{n}" in self.workers[key]:
                n += 1
            doc_type = f"{doc_type}#{n}"
        self.workers[key][doc_type] = rec
        if _norm_code(rec.get("emp_code")):
            ids["emp_code"].add(_norm_code(rec.get("emp_code")))
        for f in self.FIELDS:
            v = full_id(f, rec.get(f))
            if v:
                ids[f].add(v)
                self.by_id.setdefault((f, v), key)
        t = tokens(rec.get("name"))
        if t:
            self.by_first[t[0][:3]].add(key)


ESTABLISHMENT_WIDE = ("PFECR", "ESECR", "ESCARD")      # returns cover every site: unmatched rows are normal there


def _approximate_links(roster: "_Roster", ev: dict):
    """Second pass for rows no exact rule could link — typically handwritten or scanned registers where the
    reader misspells a surname or a digit. A row joins a worker only when the evidence clearly singles one
    out (same DOB, unique first name, similar surname, near-identical ID) and that worker has no record of
    that type yet. Every such link is reported for human review."""
    firsts: dict[str, int] = defaultdict(int)
    for k, w in roster.workers.items():
        t = tokens(next((r.get("name") for r in w.values() if isinstance(r, dict) and r.get("name")), ""))
        if t:
            firsts[t[0]] += 1
    for dt in [d for d in list(ev["unmatched_rows"]) if d not in ESTABLISHMENT_WIDE]:
        rows = ev["unmatched_rows"][dt]
        keep = []
        for row in rows:
            scored = []
            rt = tokens(row.get("name"))
            for k, w in roster.workers.items():
                if any(kk.split("#")[0] == dt for kk in w):
                    continue
                if roster._conflicts(row, k):
                    continue
                recs = [r for r in w.values() if isinstance(r, dict)]
                wt = tokens(next((r.get("name") for r in recs if r.get("name")), ""))
                score, why = 0, []
                dobs = {parse_date(r.get("dob")) for r in recs} - {None}
                if parse_date(row.get("dob")) and parse_date(row.get("dob")) in dobs:
                    score, why = score + 3, why + ["same DOB"]
                if rt and wt:
                    if rt[0] == wt[0]:
                        score, why = score + 2, why + ["same first name"]
                        if firsts.get(wt[0]) == 1:
                            score, why = score + 1, why + ["first name unique on the rolls"]
                    elif difflib.SequenceMatcher(None, rt[0], wt[0]).ratio() >= 0.8:
                        score, why = score + 1, why + ["similar first name"]
                    if len(rt) > 1 and max(difflib.SequenceMatcher(None, rt[-1], x).ratio() for x in wt[1:] or [""]) >= 0.6:
                        score, why = score + 1, why + ["similar surname"]
                for f in roster.FIELDS:
                    v = full_id(f, row.get(f))
                    if v and any(_near(v, x) for x in roster.ids.get(k, {}).get(f, ())):
                        score, why = score + 3, why + [f"{f.upper()} differs by ≤2 characters"]
                if score:
                    scored.append((score, k, why))
            scored.sort(key=lambda x: -x[0])
            if scored and scored[0][0] >= 3 and (len(scored) == 1 or scored[1][0] < scored[0][0]):
                score, k, why = scored[0]
                row = dict(row)
                row["_link"] = "approximate: " + ", ".join(why)
                roster.add(k, dt, row)
                wname = next((r.get("name") for r in roster.workers[k].values() if isinstance(r, dict) and r.get("name")), k)
                ev["errors"].append(f"Linked by approximation ({BY_KEY[dt].title if dt in BY_KEY else dt}): row '{row.get('name')}' → "
                                    f"{k} ({wname}) — {', '.join(why)}. Please confirm.")
            else:
                keep.append(row)
        if keep:
            ev["unmatched_rows"][dt] = keep
        else:
            ev["unmatched_rows"].pop(dt, None)
        if keep and dt not in ESTABLISHMENT_WIDE:
            ev["errors"].append(f"{len(keep)} row(s) of {BY_KEY[dt].title if dt in BY_KEY else dt} could not be linked to a worker on the rolls: "
                                + ", ".join(str(r.get('name')) for r in keep[:10]))


def _clean_row(row: dict, rel: str) -> dict:
    out = {k: v for k, v in row.items() if v not in ("", None) or k in ("exit",)}
    out["_doc"] = rel
    return out


def assemble(docs: list[SourceDoc], raw: dict, job: dict, client: DeepSeekClient | None) -> dict:
    by_id = {d.id: d for d in docs}
    ev = {"schema": "bss-evidence/2", "documents": [], "docs": {}, "workers": {}, "registers": {}, "establishment": {},
          "groundtruth": {"workers": {}}, "unmatched_rows": {}, "reading_issues": {}, "meta": {}, "errors": list(raw.get("errors", [])),
          "establishment_all": {}}

    # ---------------- document inventory
    for d in docs:
        cls = raw["classification"].get(d.id, {})
        ext = raw["cq"].get(d.id, {})
        dt = ext.get("doc_type") or cls.get("doc_type") or ("GT" if d.root == "gt" else "OTHER")
        ev["documents"].append({"id": d.id, "root": d.root, "rel": d.rel, "kind": d.kind, "pages": len(d.pages),
                                "text_layer_pages": sum(1 for p in d.pages if not p.needs_vision),
                                "image_pages": sum(1 for p in d.pages if p.needs_vision), "readable": d.readable,
                                "doc_type": dt, "classified_by": cls.get("method", "page-level" if d.root == "gt" else ""),
                                "error": d.error})
        if d.root == "cq" and dt not in ev["docs"]:
            ev["docs"][dt] = d.rel
        if ext.get("reading_issues"):
            ri = ext["reading_issues"]
            ev["reading_issues"][d.rel] = ri if isinstance(ri, list) else [as_str(ri)]

    # ---------------- contractor rows: roster first (WR, WG), then everything else
    roster = _Roster()
    cq_items = [(by_id[i], r) for i, r in raw["cq"].items() if not r.get("error")]
    order = {"WR": 0, "WG": 1}
    cq_items.sort(key=lambda it: order.get(it[1]["doc_type"], 2))
    for d, r in cq_items:
        t = BY_KEY.get(r["doc_type"])
        if not t:
            continue
        attrs = dict(as_dict(r.get("attributes")))
        attrs["_doc"] = d.rel
        if t.scope == "est" or not r.get("rows"):
            ev["establishment"].setdefault(r["doc_type"], attrs)
        if t.scope == "rows":
            ev["registers"].setdefault(r["doc_type"], attrs)
        ev["establishment_all"].setdefault(r["doc_type"], []).append(attrs)
        for row in r.get("rows") or []:
            rec = _clean_row(row, d.rel)
            key = roster.key_for(rec)
            if key is None:
                if r["doc_type"] in ("WR", "WG"):
                    key = _norm_code(rec.get("emp_code")) or "W-" + "-".join(tokens(rec.get("name"))[:3]).upper() or "W-UNNAMED"
                    base, n = key, 2
                    while key in roster.workers:      # same name, different person
                        key, n = f"{base}-{n}", n + 1
                elif r["doc_type"] in ("PFECR", "ESECR", "ESCARD", "F2"):
                    ev["unmatched_rows"].setdefault(r["doc_type"], []).append(rec)  # establishment-wide returns
                    continue
                else:
                    ev["unmatched_rows"].setdefault(r["doc_type"], []).append(rec)
                    continue
            roster.add(key, r["doc_type"], rec)
    _approximate_links(roster, ev)
    ev["workers"] = roster.workers

    # ---------------- ground truth: pages -> persons
    ev["groundtruth"] = _assemble_gt(docs, raw)

    # ---------------- cross-document establishment lists (value, doc_type, note)
    E = ev["establishment"]

    def pick(*pairs):
        """Every document of each type contributes (two challans -> two values to reconcile)."""
        out = []
        for dt, field, note in pairs:
            docs_of = ev["establishment_all"].get(dt) or ([E[dt]] if dt in E else []) or ([ev["registers"][dt]] if dt in ev["registers"] else [])
            for i, a in enumerate(docs_of):
                v = a.get(field)
                if v not in (None, "", []) and not isinstance(v, (dict, list)):
                    out.append([v, dt, note + (f" ({Path(a.get('_doc', '')).name})" if len(docs_of) > 1 else "")])
        return out

    ev["cross"] = {
        "salary_paid_date": pick(("SC", "paid_date", "salary confirmation"), ("DECL", "paid_date", "wage declaration"),
                                 ("PFECR", "salary_disbursement_date", "PF ECR salary disbursement date"), ("BR", "paid_date", "Bonus Register")),
        "net_total": pick(("SC", "total_amount", "salary confirmation total"), ("DECL", "total_amount", "declaration total")),
        "pf_amount": pick(("PFCH", "grand_total", "PF challan"), ("PFRCPT", "amount", "PF payment receipt"), ("TRRN", "amount", "TRRN status")),
        "pf_trrn": pick(("PFCH", "trrn", "PF challan"), ("PFRCPT", "trrn", "PF payment receipt"), ("TRRN", "trrn", "TRRN status"),
                        ("PFECR", "trrn", "PF ECR")),
        "pf_paid_date": pick(("PFRCPT", "paid_date", "PF payment receipt"), ("TRRN", "paid_date", "TRRN status")),
        "pf_ee_share": pick(("PFECR", "ee_total", "PF ECR employee total"), ("PFCH", "ee_share", "PF challan A/c 1 employee")),
        "esi_amount": pick(("ESECR", "total", "ESIC return total"), ("ESRCPT", "amount", "ESIC receipt"), ("ESCH", "amount", "ESIC challan")),
        "esi_paid_date": pick(("ESRCPT", "date", "ESIC receipt"), ("ESCH", "challan_date", "ESIC challan")),
        "pt_amount": pick(("PTCH", "amount", "PT challan")),
        "pt_paid_date": pick(("PTCH", "paid_date", "PT challan")),
    }
    wg_net = [num(w["WG"].get("net")) for w in ev["workers"].values() if "WG" in w]
    if wg_net and all(v is not None for v in wg_net):
        ev["cross"]["net_total"].insert(0, [round(sum(wg_net), 2), "WG", "Wage Register sum of net pay"])

    ev["corpus"] = {d.rel: "\n".join(p.text for p in d.pages) for d in docs if d.root == "cq" and d.text_chars}
    ev["meta"] = _profile(ev, job, client)
    y, m = map(int, ev["meta"]["wage_month"].split("-"))
    ev["wage_month"] = ev["meta"]["wage_month"]
    ev["month_days"] = calendar.monthrange(y, m)[1]
    return ev


GENERIC_NAME = re.compile(
    r"^(e ?)?(aadh?a?a?r|uid|pan|pan ?card|aadh?a?r ?card|bank|bank ?proof|pass ?book|cheque|cancelled ?cheque|photo|photograph|pic|"
    r"img|image|scan|scanned|document|doc|page|file|appointment|appointment ?letter|bio ?data|resume|cv|id|id ?proof|kyc|front|back|"
    r"new|copy|whatsapp image.*|dsc|dcim|camscanner.*|pxl|screenshot.*|untitled)?[ _-]*[\d _.-]*$", re.I)
GENERIC_FOLDER = re.compile(r"aadh?a?r|\bpan\b|bank|appoint|bio.?data|photo|kyc|\bid\b|identity|documents?|personal|data|worker|scan|"
                            r"ground ?truth|cheque|passbook|^\.?$", re.I)


def _stem(rel: str) -> str:
    """File name without its document-type words: 'Johny - Pan Card.jpeg' -> 'Johny'."""
    s = Path(rel).stem
    s = re.sub(r"(?i)[\s_-]*(-\s*)?(pan( card)?|aadh?a?r( card)?|bank|passbook|cheque|\d+)$", "", s)
    return re.sub(r"[_\s]+", " ", s).strip()


def person_hint(rel: str) -> str:
    """Who a worker-folder file belongs to, judged from its path: the file name if it names a person,
    else the nearest folder that does. '' when the path says nothing about the person."""
    st = _stem(rel)
    if st and not GENERIC_NAME.match(st) and len(re.sub(r"[^A-Za-z]", "", st)) >= 3:
        return st.lower()
    for folder in reversed(Path(rel).parent.parts):
        f = re.sub(r"[_\s]+", " ", folder).strip()
        if f and not GENERIC_FOLDER.search(f) and len(re.sub(r"[^A-Za-z]", "", f)) >= 3:
            return f.lower()
    return ""


class _Groups:
    """Union-find over worker-folder pages that refuses to merge two groups holding different complete
    Aadhaar / PAN numbers, or different dates of birth under different names."""

    def __init__(self, pages: list[dict]):
        self.parent = list(range(len(pages)))
        self.aad = [{full_id("aadhaar", p["fields"].get("aadhaar"))} - {""} for p in pages]
        self.pan = [{full_id("pan", p["fields"].get("pan"))} - {""} for p in pages]
        self.dob = [{parse_date(p["fields"].get("dob"))} - {None} for p in pages]
        self.names = [[p["fields"]["name"]] if p["fields"].get("name") else [] for p in pages]

    def find(self, i):
        while self.parent[i] != i:
            self.parent[i] = self.parent[self.parent[i]]
            i = self.parent[i]
        return i

    def conflict(self, a, b) -> bool:
        if self.aad[a] and self.aad[b] and not (self.aad[a] & self.aad[b]):
            return True
        if self.pan[a] and self.pan[b] and not (self.pan[a] & self.pan[b]):
            return True
        if self.dob[a] and self.dob[b] and not (self.dob[a] & self.dob[b]):
            return not any(_same_person(x, y) for x in self.names[a] for y in self.names[b])
        return False

    def union(self, i, j) -> bool:
        a, b = self.find(i), self.find(j)
        if a == b:
            return True
        if self.conflict(a, b):
            return False
        self.parent[a] = b
        for attr in ("aad", "pan", "dob"):
            getattr(self, attr)[b] |= getattr(self, attr)[a]
        self.names[b] += self.names[a]
        return True


def _assemble_gt(docs: list[SourceDoc], raw: dict) -> dict:
    pages = []
    for d in docs:
        if d.root != "gt":
            continue
        for r in raw["gt"].get(d.id, []):
            if not isinstance(r, dict) or r.get("error"):
                continue
            fields = as_dict(r.get("fields"))
            pages.append({"rel": d.rel, "folder": str(Path(d.rel).parent), "stem": _stem(d.rel), "hint": person_hint(d.rel),
                          "doc_type": as_str(r.get("doc_type")) or "GT_OTHER", "page": r.get("page") or 1, "fields": fields,
                          "completeness": as_dict(r.get("completeness")), "notes": as_str(r.get("notes"))})
    g = _Groups(pages)
    n = len(pages)
    # 1. complete identity numbers
    for field in ("aadhaar", "pan"):
        seen: dict[str, int] = {}
        for i, p in enumerate(pages):
            v = full_id(field, p["fields"].get(field))
            if v:
                if v in seen:
                    g.union(i, seen[v])
                else:
                    seen[v] = i
    # 2. same name and same date of birth
    by_tok = defaultdict(list)
    for i, p in enumerate(pages):
        t = tokens(p["fields"].get("name"))
        if t:
            by_tok[t[0][:3]].append(i)
    for idx in by_tok.values():
        for x in range(len(idx)):
            for y in range(x):
                a, b = pages[idx[x]]["fields"], pages[idx[y]]["fields"]
                if parse_date(a.get("dob")) and parse_date(a.get("dob")) == parse_date(b.get("dob")) and _same_person(a.get("name"), b.get("name")):
                    g.union(idx[x], idx[y])
    # 3. the path names the same person (file name or person folder)
    hints = defaultdict(list)
    for i, p in enumerate(pages):
        if p["hint"]:
            hints[p["hint"]].append(i)
    keys = list(hints)
    for k in keys:
        for i in hints[k][1:]:
            g.union(i, hints[k][0])
    for x in range(len(keys)):
        for y in range(x):
            if keys[x][:1] == keys[y][:1] and difflib.SequenceMatcher(None, keys[x], keys[y]).ratio() >= 0.85:
                g.union(hints[keys[x]][0], hints[keys[y]][0])
    # 4. a page without its own name or number belongs with the page before it in the same file (e.g. photo page)
    for i in range(1, n):
        p, q = pages[i], pages[i - 1]
        if p["rel"] == q["rel"] and not (p["fields"].get("name") or full_id("aadhaar", p["fields"].get("aadhaar")) or full_id("pan", p["fields"].get("pan"))):
            g.union(i, i - 1)
    # 5. same name (no DOB to compare) within the same first-name bucket
    for idx in by_tok.values():
        for x in range(len(idx)):
            for y in range(x):
                a, b = pages[idx[x]]["fields"], pages[idx[y]]["fields"]
                if _same_person(a.get("name"), b.get("name"), a.get("dob"), b.get("dob")):
                    g.union(idx[x], idx[y])

    groups = defaultdict(list)
    for i, p in enumerate(pages):
        groups[g.find(i)].append(p)
    persons = {}
    for members in groups.values():
        fields = defaultdict(list)
        for p in sorted(members, key=lambda p: (p["doc_type"] != "GT_AADHAAR", p["doc_type"] != "GT_PAN")):
            label = GT_LABEL.get(p["doc_type"], "Other")
            for k, v in p["fields"].items():
                if v in (None, "", []) or k in ("kind", "state", "bank", "attested", "photo"):
                    continue
                src = f"{label} ({p['rel']} p{p['page']})"
                if all(str(v) != str(x[0]) for x in fields[k]):
                    fields[k].append([v, src])
        name = (fields.get("name") or [[members[0]["hint"].title() or _stem(members[0]["rel"]) or "Unknown worker"]])[0][0]
        key = str(name).title()
        base, k2 = key, 2
        while key in persons:
            key, k2 = f"{base} ({k2})", k2 + 1
        persons[key] = {"folder_name": " / ".join(sorted({m["stem"] or m["hint"] or Path(m["rel"]).name for m in members})),
                        "files": sorted({m["rel"] for m in members}), "fields": dict(fields), "documents": _gt_doc_status(members),
                        "state": next((as_str(m["fields"].get("state")) for m in members if m["fields"].get("state")), None),
                        "pages": [{"rel": m["rel"], "page": m["page"], "doc_type": m["doc_type"], "notes": m["notes"]} for m in members]}
    return {"workers": persons}


def _gt_doc_status(members: list[dict]) -> dict:
    """Checklist used by the worker-folder rules: 'present …', 'present but incomplete — …', 'missing — …'."""
    by = defaultdict(list)
    for m in members:
        by[m["doc_type"]].append(m)
    out = {}
    for dt, label in (("GT_AADHAAR", "Aadhaar"), ("GT_PAN", "PAN"), ("GT_BANK", "Bank proof")):
        ms = by.get(dt)
        out[label] = f"present ({ms[0]['rel']} p{ms[0]['page']})" if ms else "missing — none in worker folder"
    appt = by.get("GT_APPOINTMENT")
    bio = by.get("GT_BIODATA")
    in_appt_folder = [m for m in (bio or []) if re.search(r"appoint", m["folder"], re.I)]
    if appt:
        a = appt[0]
        c = a.get("completeness") or {}
        miss = [k for k, lab in (("employer_signature", "employer signature"), ("employee_signature", "employee signature")) if c.get(k) is False]
        out["Appointment letter"] = ("present but incomplete — " + ", ".join(m + " blank" for m in miss)) if miss else f"present ({a['rel']})"
    elif in_appt_folder:
        out["Appointment letter"] = "missing — 'Appointment' folder holds a Bio-data form, not an appointment letter"
    else:
        out["Appointment letter"] = "missing — none in worker folder"
    if bio:
        c = bio[0].get("completeness") or {}
        gaps = []
        if c.get("date_filled") is False or (bio[0].get("fields") or {}).get("date_filled") in (None, ""):
            gaps.append("Date blank")
        if c.get("employee_signature") is False or (bio[0].get("fields") or {}).get("employee_signature") is False:
            gaps.append("employee signature blank")
        out["Bio-data"] = ("present but incomplete — " + ", ".join(gaps)) if gaps else "present"
    else:
        out["Bio-data"] = "missing — none in worker folder"
    photo = by.get("GT_PHOTO")
    if photo:
        att = (photo[0].get("completeness") or {}).get("attested") or (photo[0].get("fields") or {}).get("attested")
        out["Photograph"] = f"present{' and attested' if att else ' — not attested'} ({photo[0]['rel']} p{photo[0]['page']})"
    folder_names = {m["stem"] for m in members if m["stem"]}
    if len(folder_names) > 1:
        out["Folder label"] = f"files labelled differently: {', '.join(sorted(folder_names))}"
    return out


def _profile(ev: dict, job: dict, client: DeepSeekClient | None) -> dict:
    """Run context: job.json values win, then DeepSeek's reading of the headers, then heuristics."""
    E, R = ev["establishment"], ev["registers"]
    facts = {dt: {k: v for k, v in a.items() if not k.startswith("_") and not isinstance(v, (list, dict))}
             for dt, a in {**R, **E}.items()}
    found = {}
    if client and client.available:
        try:
            found = client.chat_json("extract", PROFILE_SYSTEM, json.dumps(facts, ensure_ascii=False, default=str)[:60000],
                                     max_tokens=6000, tag="profile")
        except Exception as exc:
            ev["errors"].append(f"profile: {type(exc).__name__}: {exc}")
    found = {k: (v if isinstance(v, bool) else as_str(v).strip() or None) for k, v in as_dict(found).items()}
    wm = found.get("wage_month") or ""
    if wm and not re.fullmatch(r"20\d\d-(0[1-9]|1[0-2])", wm):
        d = parse_date(wm) or parse_date("01 " + wm) or parse_date("01-" + wm)
        found["wage_month"] = f"{d:%Y-%m}" if d else None
    st = re.sub(r"[^A-Za-z]", "", found.get("state_code") or "").upper()
    found["state_code"] = st if len(st) == 2 else None
    found["is_construction"] = str(found.get("is_construction")).lower() in ("true", "1", "yes")
    wg, pfch, ecr = R.get("WG", {}), E.get("PFCH", {}), E.get("PFECR", R.get("PFECR", {}))
    meta = {
        "contractor_legal_name": found.get("contractor_legal_name") or wg.get("establishment_name") or pfch.get("est_name"),
        "contractor_address": found.get("contractor_address") or wg.get("establishment_address"),
        "principal_employer": found.get("principal_employer"),
        "site": found.get("site") or wg.get("site") or R.get("WR", {}).get("site"),
        "site_short": found.get("site_short") or wg.get("site"),
        "state": found.get("state_code"), "state_name": found.get("state_name"),
        "nature_of_work": found.get("nature_of_work"), "is_construction": bool(found.get("is_construction")),
        "pan": found.get("pan"),
        "pf_code": (E.get("PFALLOT") or {}).get("code") or pfch.get("est_code") or wg.get("pf_code"),
        "esic_code": (E.get("ESRCPT") or {}).get("employer_code") or (E.get("ESECR") or R.get("ESECR") or {}).get("employer_code"),
        "esic_subcode": (E.get("ESCODE") or {}).get("subcode") or wg.get("esi_code"),
        "pt_rc": (E.get("PTRC") or {}).get("number"), "lwf_code": (E.get("LWFREG") or {}).get("code"),
        "lin": ecr.get("lin") or (E.get("OSHREG") or {}).get("lin"),
        "headcount_establishment": ecr.get("total_members"),
        "wage_month": found.get("wage_month"),
    }
    for k, v in (job or {}).items():  # values the BSS platform already knows always win
        if v not in (None, ""):
            meta[k] = v
    if not meta.get("wage_month"):
        d = parse_date("01 " + str(wg.get("wage_period", "")).replace(",", "")) if wg.get("wage_period") else None
        meta["wage_month"] = f"{d:%Y-%m}" if d else f"{date.today():%Y-%m}"
        if not d:
            ev["errors"].append("Wage month could not be determined — pass it in job.json (\"wage_month\": \"YYYY-MM\").")
    meta["state"] = (meta.get("state") or "").upper() or None
    if not meta["state"]:
        ev["errors"].append("Work-site state could not be determined — pass it in job.json (\"state\": \"MH\"); "
                            "state PT / LWF / minimum-wage checks will be Not Verifiable.")
    return meta


def overlay_bss_workers(data: dict, master: dict) -> None:
    """Overlay the BSS bound-worker master onto ground-truth workers.

    The BSS master becomes the authoritative value for worker identity and
    employment fields; document-derived values remain available for fields the
    master does not hold. This is what makes the audit compare the contractor's
    submission against the workers actually bound to that contractor/site/month.
    """
    gt = data.setdefault("groundtruth", {}).setdefault("workers", {})
    if not isinstance(gt, dict):
        return

    def norm_id(value):
        d = digits(value)
        return d if d else str(value or "").strip().upper()

    def gt_match(w):
        aadhaar = norm_id(w.get("aadhaar"))
        pan = norm_id(w.get("pan"))
        name = str(w.get("name") or "").strip()
        bss_id = str(w.get("bssId") or "").strip().lower()
        dob = parse_date(w.get("dob"))
        # 1. The job folder names worker directories <BSS_ID>_<name>; use that
        #    first so a worker with a changed name still matches the same person.
        if bss_id:
            for gname, g in gt.items():
                hay = " ".join([str(g.get("folder_name") or "")] + [str(f) for f in (g.get("files") or [])]).lower()
                if bss_id in hay:
                    return gname
        # 2. Identity numbers.
        for gname, g in gt.items():
            fields = g.get("fields") or {}
            if aadhaar:
                for v, _ in fields.get("aadhaar", []):
                    if norm_id(v) == aadhaar:
                        return gname
            if pan:
                for v, _ in fields.get("pan", []):
                    if norm_id(v) == pan:
                        return gname
        # 3. Name + DOB.
        if name and dob:
            for gname, g in gt.items():
                fields = g.get("fields") or {}
                for v, _ in fields.get("name", []):
                    if compare_names(v, name)[0] == "Match":
                        for dv, _ in fields.get("dob", []):
                            if parse_date(dv) == dob:
                                return gname
        # 4. A unique name match. This prevents duplicate GT workers when the
        #    worker folder does not expose Aadhaar/DOB in its file names.
        if name:
            matches = []
            for gname, g in gt.items():
                fields = g.get("fields") or {}
                if any(compare_names(v, name)[0] == "Match" for v, _ in fields.get("name", [])):
                    matches.append(gname)
            if len(matches) == 1:
                return matches[0]
        return None

    doc_labels = {
        "AADHAR": "Aadhaar", "AADHAAR": "Aadhaar", "PAN": "PAN",
        "BANK": "Bank proof", "APPOINT": "Appointment letter", "APPOINTMENT": "Appointment letter",
        "BIODATA": "Bio-data", "PHOTO": "Photograph", "PHOTOGRAPH": "Photograph",
    }

    for w in (master or {}).get("workers") or []:
        name = str(w.get("name") or "").strip()
        bss_id = str(w.get("bssId") or "").strip()
        key = gt_match(w) or bss_id or name or f"BSS-{len(gt) + 1}"
        base = key
        n = 2
        while key in gt and gt_match(w) is None:
            key = f"{base}-{n}"
            n += 1
        g = gt.get(key)
        if g is None:
            g = {"folder_name": key, "files": [], "fields": {}, "documents": {}, "state": ""}
            gt[key] = g
        fields = g.setdefault("fields", {})
        values = {
            "name": name,
            "father_name": w.get("fatherName"),
            "dob": w.get("dob"),
            "gender": w.get("gender"),
            "aadhaar": w.get("aadhaar"),
            "pan": w.get("pan"),
            "mobile": w.get("mobile"),
            "address": w.get("address"),
            "bank_account": (w.get("bank") or {}).get("account"),
            "ifsc": (w.get("bank") or {}).get("ifsc"),
            "uan": w.get("uan"),
            "esic_ip": w.get("esic"),
            "doj": w.get("doj"),
            "designation": w.get("designation"),
            "site": w.get("site"),
        }
        for field, value in values.items():
            if value not in (None, "", []):
                fields[field] = [[value, "BSS worker master"]]
        docs = g.setdefault("documents", {})
        for doc in w.get("documents") or []:
            code = str(doc.get("code") or "").upper()
            label = doc_labels.get(code) or str(doc.get("name") or code or "Document")
            if label:
                docs[label] = "on file (BSS)"
