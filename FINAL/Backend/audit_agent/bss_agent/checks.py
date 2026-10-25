"""Rule checks — one registered function per S.No of the catalogue's "Possible" sheet (1-137 here,
138-204 in checks_codes.py), plus the re-probe of "Not Possible" rows.

The rules compute every figure and comparison deterministically from evidence.json. Their output
is (a) the rule verdict and (b) the pre-computed facts DeepSeek audits with (auditor.py), so the
AI never has to do arithmetic itself.

Status / risk follow AuditingInstructions.html §07 and §09:
    Age < 18                          -> Non-Complied / Critical
    wage < minimum, PF/ESI not paid   -> Non-Complied / High
    attendance / wage / name mismatch -> Partially Complied / Medium
    signature or seal missing         -> Partially Complied / Medium
    mandatory document not available  -> Document Not Available / High

`@check(sno, covers=(...))`: `covers` lists words that identify the Remarks sub-checks a rule
evaluates itself; findings for a sub-check carry `subcheck`. Sub-checks no rule covers are
given to the configured AI provider (or reported Not Verifiable offline) — none is skipped.
"""

from __future__ import annotations

import calendar
import math
import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from .catalogue import CheckSpec
from .evidence import (Evidence, base_type, blank, compare_names, digits, fmt_date, money, num, nz, parse_date,
                       pin_and_house, tokens)

C, PC, NC, DNA, NV, NA, NAU = ("Complied", "Partially Complied", "Non-Complied", "Document Not Available",
                               "Not Verifiable", "Not Applicable", "Not Auditable")
STATUSES = [C, PC, NC, DNA, NV, NA, NAU]
FAIL = (NC, DNA, PC)
RISKS = ["Critical", "High", "Medium", "Low"]
SITE = "Site / Establishment"


@dataclass
class Finding:
    entity: str          # "worker" | "site"
    worker: str
    code: str
    gt_link: str
    expected: str
    found: str
    source: str
    status: str
    risk: str
    observation: str
    subcheck: str = ""   # Remarks sub-check this finding answers ("" = the main item)
    origin: str = "rule"  # rule | deepseek

    @property
    def is_flag(self) -> bool:
        return self.status in FAIL


def name_list(names, limit: int = 12) -> str:
    """'A, B, C … +N more' — summaries stay readable for any roster size (full lists are in the Evidence sheet)."""
    names = list(names)
    return ", ".join(names[:limit]) + (f" … +{len(names) - limit} more" if len(names) > limit else "")


def worst_status(sts) -> str:
    sts = list(sts)
    for s in (NC, DNA, PC):
        if s in sts:
            return s
    return C if C in sts else NV if NV in sts else NAU if NAU in sts else NA


def worst_risk(findings) -> str:
    risks = [f.risk for f in findings if f.status in FAIL]
    return next((r for r in RISKS if r in risks), "None")


@dataclass
class CheckResult:
    spec: CheckSpec
    findings: list[Finding] = field(default_factory=list)
    note: str = ""
    status: str = NA
    risk: str = "None"
    summary: str = ""
    # rule-engine verdict (kept even when DeepSeek gives the final verdict)
    rule_status: str = ""
    rule_risk: str = ""
    rule_summary: str = ""
    rule_findings: list[Finding] = field(default_factory=list)
    verdict_by: str = "rules"           # rules | deepseek
    cross_check: str = ""               # "" agree | text describing the disagreement
    subchecks: list[dict] = field(default_factory=list)   # [{text, status, risk, observation, by}]

    def finalise(self):
        self.status = worst_status(f.status for f in self.findings) if self.findings else NA
        self.risk = worst_risk(self.findings)
        main = [f for f in self.findings if not f.subcheck] or self.findings
        flagged = [f for f in main if f.is_flag]
        workers = [f for f in main if f.entity == "worker"]
        if not self.findings:
            self.summary = self.note or "No evidence evaluated."
        elif workers and len({f.worker for f in workers}) > 1:
            fw = sorted({f.worker for f in flagged if f.entity == "worker"})
            n = len({f.worker for f in workers})
            nv = sorted({f.worker for f in workers if f.status == NV})
            ok_n = n - len(nv)
            self.summary = (f"{len(fw)} of {n} workers flagged: " + name_list(fw) + ".") if fw else \
                (f"All {n} workers compliant." if not nv else f"{ok_n} of {n} workers compliant; {len(nv)} could not be verified: {name_list(nv)}.")
            site_flags = [f for f in flagged if f.entity == "site"]
            if site_flags:
                self.summary += " " + site_flags[0].observation
        else:
            first = flagged[0] if flagged else main[0]
            self.summary = first.observation
        sub_flags = {f.subcheck for f in self.findings if f.subcheck and f.is_flag}
        if sub_flags and main is not self.findings:
            self.summary += f" Remarks: {len(sub_flags)} sub-check(s) flagged."
        if not self.rule_status:
            self.rule_status, self.rule_risk, self.rule_summary = self.status, self.risk, self.summary
            self.rule_findings = list(self.findings)
        return self


# --------------------------------------------------------------------------- context
class Ctx:
    def __init__(self, ev: Evidence, params: dict, policy: dict):
        self.ev, self.p, self.policy = ev, params, policy
        self.state = params.get("states", {}).get(ev.meta.get("state") or "", {})
        self.tol = float(policy.get("tolerance_rupees", 1.0))
        self.spec: CheckSpec | None = None

    # entities
    @property
    def codes(self) -> list[str]:
        return list(self.ev.workers)

    @property
    def wcodes(self) -> list[str]:
        """Workers with a Wage Register row (wage computations need it)."""
        return [c for c in self.ev.workers if "WG" in self.ev.workers[c]]

    def w(self, code: str) -> dict:
        return self.ev.workers[code]

    def who(self, code: str) -> dict:
        return {"entity": "worker", "worker": self.ev.worker_name(code), "code": code, "gt_link": self.ev.gt_for(code) or ""}

    def who_gt(self, gname: str) -> dict:
        code = self.ev.links.get(gname)
        if code:
            return self.who(code)
        return {"entity": "worker", "worker": gname.title(), "code": "—", "gt_link": gname}

    @staticmethod
    def site() -> dict:
        return {"entity": "site", "worker": SITE, "code": "—", "gt_link": ""}

    def F(self, who: dict, expected, found, source, status, risk, obs, sub: str = "") -> Finding:
        return Finding(**who, expected=str(expected), found=str(found), source=str(source), status=status,
                       risk=risk if status in FAIL or status == NV else "None", observation=obs,
                       subcheck=self.sub(sub) if sub else "")

    def sub(self, keyword: str) -> str:
        """Resolve a keyword to the Remarks bullet of the current row that contains it."""
        for s in (self.spec.subchecks if self.spec else []):
            if keyword.lower() in s.lower():
                return s
        return keyword

    # worker facts
    def wg(self, code) -> dict:
        return self.w(code).get("WG", {})

    def wr(self, code) -> dict:
        return self.w(code).get("WR", {})

    def first(self, code, field):
        return next((v for _, _, v in self.ev.facts(code, field)), None)

    def gender(self, code) -> str:
        g = self.wr(code).get("gender") or self.first(code, "gender") or ""
        return "Female" if str(g).lower().startswith("f") else "Male" if str(g).lower().startswith("m") else str(g)

    def pf_member(self, code) -> bool:
        return bool(digits(self.wg(code).get("uan"))) or bool(self.w(code).get("PFECR"))

    def esi_member(self, code) -> bool:
        return bool(digits(self.wg(code).get("esic_ip"))) or bool(self.w(code).get("ESECR"))

    def pf_eligible(self, code) -> bool:
        return self.pf_member(code) or nz(self.wg(code).get("rate_basic")) <= self.p["pf"]["exclusion_basic_threshold"]

    def esi_eligible(self, code) -> bool:
        return nz(self.wg(code).get("rate_total")) <= self.p["esi"]["wage_ceiling"]

    def exit_date(self, code) -> date | None:
        return parse_date(self.wr(code).get("exit") or self.wg(code).get("exit"))

    def doj(self, code) -> date | None:
        return parse_date(self.wr(code).get("doj") or self.wg(code).get("doj"))

    def dob(self, code) -> date | None:
        return parse_date(self.wr(code).get("dob") or self.wg(code).get("dob") or self.first(code, "dob"))

    def daily_rate(self, code) -> float:
        return nz(self.wg(code).get("rate_total")) / self.ev.month_days

    def left_in_month(self, code) -> date | None:
        e = self.exit_date(code)
        return e if e and self.ev.month_start <= e <= self.ev.month_end else None

    def code_wage(self, code) -> float:
        """'Wages' under Code on Wages 2019 §2(y): basic+DA, plus exclusions above 50% of remuneration."""
        wg = self.wg(code)
        e = wg.get("earnings") if isinstance(wg.get("earnings"), dict) else {}
        basic = nz(wg.get("basic_earned"))
        remuneration = nz(wg.get("gross")) - nz(e.get("bonus", wg.get("bonus", 0))) - nz(e.get("extra_days", wg.get("extra_days_wages", 0)))
        excl = remuneration - basic
        cap = self.p["code_on_wages"]["exclusion_cap"] * remuneration
        return basic + max(0.0, excl - cap)

    @property
    def headcount(self) -> int:
        """Largest headcount evidenced for the establishment (site rolls or establishment-wide returns)."""
        vals = [len(self.codes), int(nz(self.ev.meta.get("headcount_establishment"))),
                int(nz(self.ev.doc("PFECR").get("total_members"))), int(nz(self.ev.doc("ESECR").get("ips")))]
        return max(vals)

    def missing_wg(self, out: list, label: str) -> list:
        for c in self.codes:
            if c not in self.wcodes:
                out.append(self.F(self.who(c), label, "No Wage Register row", self.ev.doc_name("WG"), NV, "Medium",
                                  "Worker has no Wage Register entry, so this computation cannot be made (see P-071)."))
        return out


REGISTRY: dict[int, callable] = {}
COVERS: dict[int, tuple[str, ...]] = {}


def check(*snos, covers: tuple[str, ...] = ()):
    def deco(fn):
        for s in snos:
            REGISTRY[s] = fn
            if covers:
                COVERS[s] = covers
        return fn
    return deco


def _not_supplied(x: Ctx, label: str, dt: str, risk="High", sub="") -> Finding:
    n = len(x.ev.cq_documents())
    return x.F(x.site(), f"{label} supplied", "Not supplied", f"contractor submission (searched all {n} files)", DNA, risk,
               f"{label} not produced (§09 Document Rule → Document Not Available).", sub)


# =========================================================================== 1. Missing workers
DESIG_DOCS = ("WR", "WG", "SC", "SVC", "APPT", "FORM14")


def _desig_core(s: str) -> tuple[str, str]:
    s = str(s or "").upper()
    qual = " ".join(re.findall(r"\(([^)]*)\)", s))
    core = re.sub(r"\([^)]*\)", "", s)
    core = re.sub(r"[^A-Z ]", " ", core)
    return " ".join(core.split()), qual.strip()


@check(1, covers=("designation",))
def missing_workers(x: Ctx, spec):
    out = []
    ev = x.ev
    for gname, g in ev.gt["workers"].items():
        code = ev.links.get(gname)
        gt_name = (g["fields"].get("name") or [[gname]])[0][0]
        if code:
            present = sorted({ev.doc_name(k) for k in x.w(code) if base_type(k) in ("WR", "WG", "MR", "BR", "LR", "SC", "PFECR", "ESECR")})
            out.append(x.F(x.who(code), f"{gt_name} on contractor rolls", f"Found as {code} in {len(present)} documents",
                           "; ".join(present), C, "None", f"Ground-truth worker matched to {code} (same DOB and given name / ID)."))
            continue
        ids = [digits(v) for v, _ in g["fields"].get("aadhaar", [])] + [str(v).upper() for v, _ in g["fields"].get("pan", [])]
        hits = sorted({h for i in ids for h in ev.corpus_hits(i)})
        out.append(x.F(x.who_gt(gname), f"{gt_name} on contractor rolls", "NOT FOUND",
                       "Workman / Wage Register, Muster Roll, Bonus, Leave, salary confirmation, PF & ESIC returns", NC, "High",
                       f"Worker holds identity papers in the worker folder but appears in none of the contractor's registers, "
                       f"returns or challans for {ev.month_start:%B %Y} — off-record deployment or a dropped worker. "
                       + (f"Aadhaar/PAN found in: {', '.join(hits)}." if hits else "Aadhaar/PAN found in no contractor document.")))
    if not ev.gt["workers"]:
        out.append(x.F(x.site(), "Worker folder supplied", "No ground-truth worker documents", "worker ground truth", NV, "High",
                       "The worker ground-truth folder held no readable worker documents, so missing workers cannot be detected."))
    linked = {v for v in ev.links.values() if v}
    for code in x.codes:
        if code in linked:
            continue
        out.append(x.F(x.who(code), "Worker is bound to this contractor/site",
                       "NOT in the BSS bound-worker master", "BSS worker master", NC, "High",
                       "Worker appears in the submitted documents but is not bound to this contractor at this site in this month."))
    for code in x.codes:
        vals = [(k, r.get("designation")) for k, r in x.w(code).items() if base_type(k) in DESIG_DOCS and isinstance(r, dict) and r.get("designation")]
        if not vals:
            continue
        cores = {_desig_core(v)[0] for _, v in vals}
        quals = {_desig_core(v)[1] for _, v in vals}
        shown = "; ".join(f"{ev.doc_name(k)}: {v}" for k, v in vals)
        if len(cores) > 1:
            st, rk, obs = PC, "Medium", "Designation differs between contractor documents."
        elif len(quals) > 1:
            st, rk, obs = PC, "Low", "Same designation but the shift / qualifier differs (e.g. DAY vs NIGHT) between documents."
        else:
            st, rk, obs = C, "None", "Designation consistent across documents."
        skills = {str(r.get(f)) for r in x.w(code).values() if isinstance(r, dict) for f in ("skill", "category", "grade") if r.get(f)}
        obs += (f" Skill / grade recorded: {', '.join(sorted(skills))}." if skills else
                " Grade / skill category is not recorded in any contractor document.")
        out.append(x.F(x.who(code), "Same designation, grade and skill category in every document", shown, "Designation check",
                       st if skills or st != C else PC, rk if skills or st != C else "Low", obs, "designation"))
    for code in x.codes:
        extra = _bss_compare(x, code, "designation", "Designation", kind="text", risk="Low")
        if extra:
            out.append(extra)
    return out


# =========================================================================== 2. Identity vs worker folder
def _cmp(kind, gt_val, cval) -> tuple[str, str]:
    if kind == "name":
        return compare_names(gt_val, cval)
    if kind == "date":
        a, b = parse_date(gt_val), parse_date(cval)
        if not b:
            return "Not recorded", "date unreadable"
        return ("Match", "") if a == b else ("Mismatch", f"{fmt_date(a)} vs {fmt_date(b)}")
    if kind == "id":
        a, b = (digits(gt_val), digits(cval)) if digits(gt_val) else (str(gt_val).upper(), str(cval).upper())
        return ("Match", "") if a == b else ("Mismatch", f"{gt_val} recorded as {cval}")
    if kind == "address":
        gp, gh = pin_and_house(gt_val)
        cp, ch = pin_and_house(cval)
        if not cp:
            return "Mismatch", "PIN code missing in contractor address"
        if gp and gp != cp:
            return "Mismatch", f"PIN {gp} vs {cp}"
        if gh and ch and gh.lstrip("0") != ch.lstrip("0"):
            return "Mismatch", f"house no. {gh} vs {ch}"
        return "Match", "same PIN / house no.; locality wording differs"
    if kind == "gender":
        return ("Match", "") if str(gt_val)[:1].lower() == str(cval)[:1].lower() else ("Mismatch", f"{gt_val} vs {cval}")
    return ("Match", "") if str(gt_val).strip().lower() == str(cval).strip().lower() else ("Mismatch", f"{gt_val} vs {cval}")


def _bss_compare(x: Ctx, code: str, field_: str, label: str, kind="id", risk="Medium"):
    """Compare a contractor-document field with the BSS bound-worker master."""
    gname = x.ev.gt_for(code)
    if not gname:
        return None
    gt_val, _src = x.ev.gt_field(gname, field_)
    if gt_val in (None, ""):
        return None
    facts = [(k, r, v) for k, r, v in x.ev.facts(code, field_) if not blank(v)]
    if not facts:
        return None
    bad = []
    for k, r, v in facts:
        res, why = _cmp(kind, gt_val, v)
        if res == "Mismatch":
            bad.append(f"{x.ev.doc_name(k)}: {v}")
    srcs = "; ".join(x.ev.loc(k, r) for k, r, _ in facts)
    if bad:
        return x.F(x.who(code), f"BSS master: {gt_val}", " | ".join(bad), srcs, PC, risk,
                   f"{label} differs from the BSS worker master.")
    return x.F(x.who(code), f"BSS master: {gt_val}", f"Matches in {len(facts)} document(s)", srcs, C, "None",
               f"{label} agrees with the BSS worker master.")


def _identity(x: Ctx, field_, label, kind, risk):
    out = []
    for gname, code in x.ev.links.items():
        if not code:
            continue
        gt_val, gt_src = x.ev.gt_field(gname, field_)
        who = x.who(code)
        if gt_val is None:
            out.append(x.F(who, "Value in worker folder", "—", "worker ground truth", NV, "Low",
                           f"{label} is not available in the worker folder, so it cannot be verified."))
            continue
        found = [(k, r, v) for k, r, v in x.ev.facts(code, field_) if not (field_ == "name" and base_type(k) == "F2" and r.get("relation"))]
        if not found:
            out.append(x.F(who, f"{gt_val} [{gt_src}]", "Not recorded", "—", NV, "Low",
                           f"{label} is not recorded in any contractor document — cannot be confirmed."))
            continue
        bad, minor = [], []
        for k, r, v in found:
            res, why = _cmp(kind, gt_val, v)
            if res == "Mismatch":
                bad.append(f"{x.ev.doc_name(k)}: {v} ({why})")
            elif res == "Minor variation" and "shorter form" not in why:
                minor.append(f"{x.ev.doc_name(k)}: {v} ({why})")
        srcs = "; ".join(x.ev.loc(k, r) for k, r, _ in found)
        if bad:
            out.append(x.F(who, f"{gt_val} [{gt_src}]", " | ".join(bad), srcs, PC, risk,
                           f"Wrong {label.lower()} in {len(bad)} of {len(found)} contractor documents."))
        elif minor:
            out.append(x.F(who, f"{gt_val} [{gt_src}]", " | ".join(minor), srcs, PC, "Low",
                           f"{label} matches with spelling variations in {len(minor)} document(s)."))
        else:
            out.append(x.F(who, f"{gt_val} [{gt_src}]", f"Matches in {len(found)} document(s)", srcs, C, "None",
                           f"{label} agrees with the worker folder."))
    if not any(x.ev.links.values()):
        out.append(x.F(x.site(), f"{label} vs worker folder", "No ground-truth worker is on the contractor rolls", "—", NA, "None",
                       "No worker in the ground-truth folder could be linked to a contractor record, so there is nothing to compare "
                       "(see P-001)."))
    return out


@check(2)
def id_name(x, s): return _identity(x, "name", "Name", "name", "Medium")


@check(3)
def id_father(x, s): return _identity(x, "father_name", "Father's name", "name", "Medium")


@check(4)
def id_address(x, s): return _identity(x, "address", "Permanent address", "address", "Medium")


@check(5, covers=("UAN IP", "DOB on UAN"))
def id_uan_name(x, s):
    """Main item: name against the UAN (PF ECR / UAN repository) = Aadhaar. Sub-checks: the ESIC IP name, and the UAN DOB."""
    out = []
    for gname, code in x.ev.links.items():
        if not code:
            continue
        gt_val, src = x.ev.gt_field(gname, "name")
        for kind, dt, field_, label, sub in (("UAN", "PFECR", "name_uan_repository", "Name against the UAN", ""),
                                             ("IP", "ESECR", "name", "Name against the ESIC IP number", "UAN IP")):
            recs = [(k, r.get(field_) or r.get("name"), r) for k, r in x.ev.recs(code, dt) if r.get(field_) or r.get("name")]
            if not recs:
                member = x.pf_member(code) if kind == "UAN" else x.esi_member(code)
                out.append(x.F(x.who(code), f"{gt_val} [{src}]", f"No {kind} record in the {x.ev.doc_name(dt)}", x.ev.doc_name(dt),
                               NV, "Low", f"Worker has no {kind} record, so the {kind} name cannot be checked (see P-040 / P-041)."
                               if not member else f"Worker is not in the {x.ev.doc_name(dt)}.", sub))
                continue
            k, v, r = recs[0]
            res, why = compare_names(gt_val, v)
            st = C if res == "Match" else PC
            out.append(x.F(x.who(code), f"{gt_val} [{src}]", f"{v}" + (f" ({why})" if why else ""), x.ev.loc(k, r), st,
                           "Medium" if res == "Mismatch" else "Low",
                           f"{label} agrees with Aadhaar." if st == C else f"{label} differs from Aadhaar ({why}).", sub))
        gdob, _ = x.ev.gt_field(gname, "dob")
        udob = next((r.get("dob_uan_repository") or r.get("dob") for _, r in x.ev.recs(code, "PFECR") if r.get("dob_uan_repository") or r.get("dob")), None)
        if udob and gdob:
            ok = parse_date(udob) == parse_date(gdob)
            out.append(x.F(x.who(code), f"DOB {gdob} (Aadhaar)", f"UAN DOB {udob}", x.ev.doc_name("PFECR"), C if ok else PC, "Medium",
                           "UAN DOB agrees with Aadhaar." if ok else "UAN DOB differs from Aadhaar.", "DOB on UAN"))
        else:
            out.append(x.F(x.who(code), f"DOB {gdob or '—'} (Aadhaar)", "DOB not printed in the PF ECR / UAN record", x.ev.doc_name("PFECR"),
                           NV, "Low", "The ECR does not show the UAN DOB; verify on the EPFO member portal.", "DOB on UAN"))
    return out


@check(6)
def id_dob(x, s): return _identity(x, "dob", "Date of birth", "date", "High")


@check(7)
def id_gender(x, s): return _identity(x, "gender", "Gender", "gender", "Medium")


@check(8)
def id_aadhaar(x, s): return _identity(x, "aadhaar", "Aadhaar number", "id", "High")


@check(9)
def id_pan(x, s): return _identity(x, "pan", "PAN", "id", "Medium")


@check(10)
def id_mobile(x, s): return _identity(x, "mobile", "Mobile number", "id", "Low")


@check(11)
def id_bank(x, s): return _identity(x, "bank_account", "Bank account number", "id", "High")


@check(12)
def id_ifsc(x, s): return _identity(x, "ifsc", "Bank IFSC", "id", "Medium")


# =========================================================================== 3. Cross-document consistency
def _consistency(x: Ctx, field_, label, base_key="WR", kind="name", risk="Medium", shorter_ok=False):
    out = []
    for code in x.codes:
        w = x.w(code)
        bk = base_key if not blank(w.get(base_key, {}).get(field_)) else next(
            (k for k in ("WR", "WG", "MR", "F11") if not blank(w.get(k, {}).get(field_))), None)
        if not bk:
            continue
        base = w[bk][field_]
        others = [(k, r, v) for k, r, v in x.ev.facts(code, field_) if k != bk
                  and not (field_ == "name" and base_type(k) == "F2" and r.get("relation"))]
        if not others:
            continue
        bad, minor = [], []
        for k, r, v in others:
            if kind == "name":
                res, why = compare_names(base, v)
                if res == "Minor variation" and "shorter form" in why and shorter_ok:
                    res = "Match"
            elif kind == "date":
                res, why = (("Match", "") if parse_date(base) == parse_date(v) else ("Mismatch", f"{base} vs {v}"))
            elif kind == "gender":
                res, why = _cmp("gender", base, v)
            else:
                res, why = (("Match", "") if (digits(base) and digits(base) == digits(v)) or str(base).lower() == str(v).lower()
                            else ("Mismatch", f"{base} vs {v}"))
            if res == "Mismatch":
                bad.append(f"{x.ev.doc_name(k)}: {v}")
            elif res != "Match":
                minor.append(f"{x.ev.doc_name(k)}: {v} ({why})")
        src = f"{x.ev.doc_name(bk)} + " + ", ".join(x.ev.doc_name(k) for k, _, _ in others)
        if bad:
            out.append(x.F(x.who(code), f"{x.ev.doc_name(bk)}: {base}", " | ".join(bad), src, PC, risk,
                           f"{label} differs in {len(bad)} of {len(others)} documents — contractor's own records disagree."))
        elif minor:
            out.append(x.F(x.who(code), f"{x.ev.doc_name(bk)}: {base}", " | ".join(minor), src, PC, "Low",
                           f"{label} recorded with spelling / short-form variations."))
        else:
            out.append(x.F(x.who(code), f"{x.ev.doc_name(bk)}: {base}", f"Identical in {len(others)} documents", src, C, "None",
                           f"{label} consistent."))
    return out


def _amounts(x: Ctx, field_, label, base_key, other_keys, risk="Medium", under_nc=False, tol=None):
    out = []
    tol = x.tol if tol is None else tol
    for code in x.codes:
        w = x.w(code)
        base = num(w.get(base_key, {}).get(field_))
        if base is None:
            continue
        others = [(k, num(r.get(field_))) for ok in other_keys for k, r in x.ev.recs(code, ok) if num(r.get(field_)) is not None]
        if not others:
            missing = [x.ev.doc_name(ok) for ok in other_keys if not x.ev.recs(code, ok)]
            if missing:
                out.append(x.F(x.who(code), f"{x.ev.doc_name(base_key)}: {money(base)}", "Worker not in " + ", ".join(missing),
                               "; ".join(missing), NV, "Low", f"{label} cannot be reconciled — worker absent from {', '.join(missing)}."))
            continue
        diffs = [(k, v, v - base) for k, v in others if abs(v - base) > tol]
        shown = "; ".join(f"{x.ev.doc_name(k)}: {money(v)}" for k, v in others)
        src = "; ".join(x.ev.loc(k, w[k]) for k, _ in others)
        if not diffs:
            out.append(x.F(x.who(code), f"{x.ev.doc_name(base_key)}: {money(base)}", shown, src, C, "None", f"{label} agrees."))
            continue
        under = [d for d in diffs if d[2] < 0]
        status, rk = (NC, "High") if (under_nc and under) else (PC, risk)
        obs = "; ".join(f"{x.ev.doc_name(k)} {'lower' if d < 0 else 'higher'} by {money(abs(d))}" for k, _, d in diffs)
        if under_nc and under:
            obs += " — deducted from wages but under-remitted."
        out.append(x.F(x.who(code), f"{x.ev.doc_name(base_key)}: {money(base)}", shown, src, status, rk, obs))
    return out


@check(13, covers=("Payslip, Bank Transfer", "initials or a nickname"))
def cd_name(x, s):
    out = _consistency(x, "name", "Worker name")
    for code in x.codes:
        short = [(k, r["name"]) for k, r in x.w(code).items() if isinstance(r, dict) and r.get("name")
                 and (re.search(r"\b[A-Za-z]\.?\s", str(r["name"]) + " ") or len(tokens(r["name"])) < 2)
                 and not (base_type(k) == "F2" and r.get("relation"))]
        out.append(x.F(x.who(code), "Full name, no initials / nickname", "; ".join(f"{x.ev.doc_name(k)}: {v}" for k, v in short) or "Full names used",
                       "All contractor documents", PC if short else C, "Low",
                       "Name recorded with initials or a single word in: " + ", ".join(x.ev.doc_name(k) for k, _ in short) + "."
                       if short else "No record uses only initials or a nickname.", "initials or a nickname"))
        docs = [d for d in ("PAYSLIP", "SC", "PFECR", "ESECR") if x.ev.recs(code, d)]
        absent = [x.ev.doc_name(d) for d in ("PAYSLIP", "SC", "PFECR", "ESECR") if not x.ev.recs(code, d)]
        out.append(x.F(x.who(code), "Same name in payslip, bank transfer sheet, ECR, ESIC return",
                       f"Compared in {', '.join(x.ev.doc_name(d) for d in docs) or 'none'}" + (f"; not present in {', '.join(absent)}" if absent else ""),
                       "See main check", C if docs and not absent else (NV if not docs else PC), "Low",
                       "Name compared in every document of this set that holds the worker (detail in the main check)."
                       + (f" Worker absent from {', '.join(absent)}." if absent else ""), "Payslip, Bank Transfer"))
    return out


@check(14)
def cd_gross(x, s): return _amounts(x, "gross", "Gross wages", "WG", ("PFECR", "ESECR"))


@check(15, covers=("identical bank account", "same DOB"))
def cd_duplicates(x, s):
    keys = ("gross", "net", "epf", "esi", "days_worked", "paid_days", "extra_days_wages", "bonus", "total_ded")
    seen: dict[tuple, list[str]] = {}
    for code in x.wcodes:
        seen.setdefault(tuple(x.wg(code).get(k) for k in keys), []).append(code)
    out = []
    for code in x.wcodes:
        twins = [c for c in seen[tuple(x.wg(code).get(k) for k in keys)] if c != code]
        if twins:
            io = {c: x.w(c).get("IO", {}).get("days_worked") for c in [code] + twins}
            differs = len({v for v in io.values() if v is not None}) > 1
            out.append(x.F(x.who(code), "Unique wage row", f"Identical to {', '.join(twins)} on all {len(keys)} figures",
                           x.ev.loc("WG", x.wg(code)), PC, "Medium",
                           f"Every wage, attendance and deduction figure equals {', '.join(x.ev.worker_name(t) for t in twins)}'s row"
                           + (f", while the In & Out register shows different attendance ({io}). Row looks copied, not computed." if differs
                              else ". Confirm the attendance independently.")))
        else:
            out.append(x.F(x.who(code), "Unique wage row", "Unique", x.ev.loc("WG", x.wg(code)), C, "None", "Row is unique."))
    for field_, label in (("bank_account", "bank account"), ("uan", "UAN"), ("esic_ip", "ESIC IP number")):
        owners: dict[str, set] = {}
        for code in x.codes:
            for _, _, v in x.ev.facts(code, field_):
                if len(digits(v)) >= 6:
                    owners.setdefault(digits(v), set()).add(code)
        dup = {v: cs for v, cs in owners.items() if len(cs) > 1}
        out.append(x.F(x.site(), f"Every worker has a distinct {label}",
                       "; ".join(f"{v}: {', '.join(x.ev.worker_name(c) for c in cs)}" for v, cs in dup.items()) or "All distinct",
                       "All contractor records", PC if dup else C, "High",
                       f"Same {label} recorded for different workers — possible duplicate / ghost entry." if dup else f"No shared {label}.",
                       "identical bank account"))
    pairs = []
    by_dob: dict = {}
    for c in x.codes:                          # bucket by DOB: linear in the roster size
        if x.dob(c):
            by_dob.setdefault(x.dob(c), []).append(c)
    for cs in by_dob.values():
        for i, a in enumerate(cs):
            for b in cs[:i]:
                if compare_names(x.wr(a).get("father_name", ""), x.wr(b).get("father_name", ""))[0] == "Match":
                    pairs.append(f"{x.ev.worker_name(a)} & {x.ev.worker_name(b)}")
    out.append(x.F(x.site(), "No two workers share DOB and father's name", "; ".join(pairs) or "None", x.ev.doc_name("WR"),
                   PC if pairs else C, "High", "Possible duplicate worker(s): " + "; ".join(pairs) if pairs else "No duplicate pair.", "same DOB"))
    return x.missing_wg(out, "Unique wage row")


@check(16)
def cd_father(x, s): return _consistency(x, "father_name", "Father's / husband's name", shorter_ok=True)


@check(17)
def cd_dob(x, s): return _consistency(x, "dob", "Date of birth", kind="date", risk="High")


@check(18)
def cd_gender(x, s): return _consistency(x, "gender", "Gender", kind="gender")


@check(19)
def cd_doj(x, s):
    out = _consistency(x, "doj", "Date of joining", kind="date")
    for code in x.codes:
        extra = _bss_compare(x, code, "doj", "Date of joining", kind="date", risk="Medium")
        if extra:
            out.append(extra)
    return out


@check(20)
def cd_uan(x, s):
    out = _consistency(x, "uan", "UAN", base_key="WG", kind="text", risk="High")
    for code in x.codes:
        extra = _bss_compare(x, code, "uan", "UAN", kind="id", risk="High")
        if extra:
            out.append(extra)
    return out


@check(21)
def cd_esic(x, s):
    out = _consistency(x, "esic_ip", "ESIC IP number", base_key="WG", kind="text", risk="High")
    for code in x.codes:
        extra = _bss_compare(x, code, "esic_ip", "ESIC IP number", kind="id", risk="High")
        if extra:
            out.append(extra)
    return out


@check(22)
def cd_net(x, s): return _amounts(x, "net", "Net pay", "WG", ("SC",), risk="Low", tol=0.5)


@check(23)
def cd_bonus(x, s): return _amounts(x, "bonus", "Bonus", "WG", ("BR",), tol=0.5)


@check(24)
def cd_epf(x, s): return _amounts(x, "epf", "Employee PF", "WG", ("PFECR",), risk="High", under_nc=True, tol=0.5)


@check(25)
def cd_esi(x, s): return _amounts(x, "esi", "Employee ESI", "WG", ("ESECR",), under_nc=True)


@check(26)
def cd_paid_days(x, s): return _amounts(x, "paid_days", "Paid days", "WG", ("MR",), tol=0)


@check(27)
def cd_father_vs_declaration(x, s):
    out = []
    for code in x.codes:
        w = x.w(code)
        reg = w.get("WR", {}).get("father_name") or w.get("WG", {}).get("father_name") or ""
        spouse = next((v for k, _, v in x.ev.facts(code, "spouse_name") if base_type(k) in ("F11", "F2")), None)
        f11_father = w.get("F11", {}).get("father_name")
        if spouse:
            reg_first = (tokens(reg) or [""])[0]
            shared = [x.ev.worker_name(c) for c in x.codes if c != code and reg and
                      (tokens(x.wr(c).get("father_name", "")) or [""])[0][:2] == reg_first[:2] and
                      compare_names(x.wr(c).get("father_name", ""), reg)[0] in ("Match", "Minor variation")]
            src = "; ".join(x.ev.loc(k, r) for k, r, _ in x.ev.facts(code, "spouse_name"))
            ok = compare_names(spouse, reg)[0] in ("Match", "Minor variation")
            out.append(x.F(x.who(code), f"Husband per own PF declarations: {spouse}", f"Registers: {reg}", src, C if ok else PC, "Medium",
                           "Registers agree with the worker's own declaration." if ok else
                           f"Worker declares husband '{spouse}' in Form-2/Form-11 but the registers show '{reg}'"
                           + (f" — the same name recorded as father for {', '.join(shared)}; entry appears copied." if shared else ".")))
        elif f11_father:
            res, why = compare_names(reg, f11_father)
            ok = res in ("Match", "Minor variation")
            out.append(x.F(x.who(code), f"Form-11: {f11_father}", f"Registers: {reg}", x.ev.loc("F11", w["F11"]), C if ok else PC, "Medium",
                           ("Agrees with the worker's own Form-11 declaration." + (f" ({why})" if why else "")) if ok
                           else f"Register father's name differs from Form-11: {why}."))
        else:
            out.append(x.F(x.who(code), "Own declaration (Form-2 / Form-11)", f"Registers: {reg}", "—", NV, "Low",
                           "No Form-2 / Form-11 declaration supplied for this worker (see P-078)."))
    return out


@check(28)
def cd_dol(x, s):
    out = []
    for code in x.codes:
        ext = x.wr(code).get("exit")
        if blank(ext):
            continue
        svc = x.ev.recs(code, "SVC")
        if not svc:
            out.append(x.F(x.who(code), f"Workman Register: {ext}", "No service certificate", "Service certificate", NV, "Medium",
                           "Leaving date cannot be cross-checked — no service certificate."))
            continue
        k, r = svc[0]
        ok = parse_date(ext) == parse_date(r.get("exit"))
        out.append(x.F(x.who(code), f"Workman Register: {ext}", f"Service Certificate: {r.get('exit')}", x.ev.loc(k, r),
                       C if ok else PC, "Medium", "Date of leaving consistent." if ok else "Date of leaving differs."))
    if not out:
        out.append(x.F(x.site(), "Date of leaving consistent", "No worker left", x.ev.doc_name("WR"), NA, "None",
                       "No worker has a date of leaving in the Workman Register."))
    return out


# =========================================================================== 4. Wages & statutory calculation
def _calc(x: Ctx, code, expected, actual, ok, risk, obs_fail, status_fail=NC, obs_ok="Correct.", src=None, sub=""):
    return x.F(x.who(code), expected, actual, src or x.ev.loc("WG", x.wg(code)), C if ok else status_fail, risk,
               obs_ok if ok else obs_fail, sub)


def _need(x: Ctx, code, *fields) -> bool:
    return all(num(x.wg(code).get(f)) is not None for f in fields)


@check(29)
def wc_net(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "gross", "total_ded", "net"):
            continue
        exp = nz(wg["gross"]) - nz(wg["total_ded"])
        out.append(_calc(x, c, f"{money(wg['gross'])} − {money(wg['total_ded'])} = {money(exp)}", money(wg["net"]),
                         abs(exp - nz(wg["net"])) <= x.tol, "High", f"Net pay off by {money(nz(wg['net']) - exp)}."))
    return x.missing_wg(out, "Net = gross − deductions")


@check(30)
def wc_basic(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "gross", "basic_earned") or not nz(wg["gross"]):
            continue
        er_pf = num(wg.get("employer_pf")) or round(x.p["pf"]["ee_rate"] * nz(wg.get("basic_earned"))) if x.pf_member(c) else 0
        base = nz(wg["gross"]) + (er_pf or 0)
        pct = nz(wg["basic_earned"]) / base * 100
        out.append(_calc(x, c, f"Basic ≥ 50% of (gross {money(wg['gross'])} + employer PF {money(er_pf)})",
                         f"{pct:.1f}% ({money(wg['basic_earned'])} of {money(base)})", pct >= 50 - 0.05, "High",
                         "Basic below 50% of gross + employer PF — PF / gratuity base suppressed (Code on Wages §2(y))."))
    return x.missing_wg(out, "Basic ≥ 50%")


@check(31)
def wc_pf(x, s):
    out = []
    rate, ceil = x.p["pf"]["ee_rate"], x.p["pf"]["wage_ceiling"]
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "basic_earned", "gross"):
            continue
        W = x.code_wage(c)
        exp_full, exp_cap = round(rate * W), round(rate * min(W, ceil))
        act = nz(wg.get("epf"))
        if not x.pf_member(c):
            if x.pf_eligible(c):
                out.append(_calc(x, c, f"12% × {money(round(W, 2))} = {money(exp_full)}", money(act), False, "High",
                                 f"No PF deducted although basic rate {money(wg.get('rate_basic'))} is within the "
                                 f"₹{x.p['pf']['exclusion_basic_threshold']:,} exclusion threshold — worker has no PF cover."))
            else:
                out.append(x.F(x.who(c), f"Basic rate > ₹{x.p['pf']['exclusion_basic_threshold']:,}", money(wg.get("rate_basic")),
                               x.ev.loc("WG", wg), NA, "None", "Excluded employee (basic above threshold) — see P-040 for Form-11 proof."))
            continue
        basic_only = round(rate * nz(wg["basic_earned"]))
        ok = abs(act - exp_full) <= x.tol or abs(act - exp_cap) <= x.tol
        out.append(_calc(x, c, f"12% × {money(round(W, 2))} (Code-on-Wages wage) = {money(exp_full)}", money(act), ok, "High",
                         f"PF deducted {money(act)} vs {money(exp_full)} due" + (f" (12% of basic alone = {money(basic_only)})" if basic_only != exp_full else "") + "."))
    return x.missing_wg(out, "PF 12%")


@check(32, covers=("contribution-period continuity", "Disabled"))
def wc_esi(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "gross"):
            continue
        if not x.esi_eligible(c):
            out.append(x.F(x.who(c), f"Wage rate > ₹{x.p['esi']['wage_ceiling']:,}", f"ESI {money(wg.get('esi'))}",
                           x.ev.loc("WG", wg), NA, "None", "Above the ESI wage ceiling — no ESI deduction due (see P-041 for H1/H2 continuity)."))
            continue
        exp = math.ceil(x.p["esi"]["ee_rate"] * nz(wg["gross"]))
        act = nz(wg.get("esi"))
        if act == 0:
            out.append(_calc(x, c, f"0.75% × {money(wg['gross'])} = {money(exp)}", money(0), False, "High",
                             f"ESI not deducted although wages are within the ₹{x.p['esi']['wage_ceiling']:,} ceiling — worker has no ESI cover."))
        else:
            out.append(_calc(x, c, f"0.75% × {money(wg['gross'])} ≈ {money(exp)}", money(act), abs(exp - act) <= x.tol, "High",
                             f"ESI deducted {money(act)} vs {money(exp)} due."))
    m = x.ev.month_start.month
    period = "April–September" if 4 <= m <= 9 else "October–March"
    out.append(x.F(x.site(), f"ESI continuity within the {period} contribution period", "Only one wage month supplied",
                   x.ev.doc_name("WG"), NV, "Low", f"{x.ev.month_start:%B %Y} falls in the {period} contribution period; earlier months of "
                   "the period are needed to confirm continuity.", "contribution-period continuity"))
    disabled = [c for c in x.codes if any(str(r.get("disabled", "")).lower() in ("true", "yes") for r in x.w(c).values() if isinstance(r, dict))]
    out.append(x.F(x.site(), "₹25,000 ceiling for disabled employees", f"{len(disabled)} worker(s) recorded as disabled",
                   "All contractor records", NA if not disabled else NV, "Low",
                   "No worker is recorded as a person with disability, so the ₹25,000 ceiling does not arise." if not disabled
                   else "Disabled workers present — apply the ₹25,000 ceiling.", "Disabled"))
    return x.missing_wg(out, "ESI 0.75%")


def pt_due(x: Ctx, gross: float, gender: str) -> float | None:
    pt = x.state.get("pt")
    if not pt:
        return None
    slabs = pt.get("Female" if str(gender).lower().startswith("f") else "Male", [])
    due = next((t for ceiling, t in slabs if gross <= ceiling), 0)
    if x.ev.month_start.month == 2 and due == slabs[-1][1] and pt.get("february_top_slab"):
        due = pt["february_top_slab"]
    return due


@check(33, covers=("applicable states",))
def wc_pt(x, s):
    out = []
    if not x.state.get("pt"):
        return [x.F(x.site(), "State PT slab", "Not configured for " + str(x.ev.meta.get("state")), "statutory_params.json", NV, "Low",
                    "PT slab for this state is not configured in BSS Admin (statutory_params.json).", "applicable states")]
    out.append(x.F(x.site(), "PT applicable in the work-site state", f"{x.state.get('name')} — slab configured", "statutory_params.json",
                   C, "None", f"{x.state.get('name')} levies PT; slab taken from the BSS Admin master.", "applicable states"))
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "gross"):
            continue
        exp = pt_due(x, nz(wg["gross"]), x.gender(c))
        act = nz(wg.get("pt"))
        out.append(_calc(x, c, f"{money(exp)} ({x.state['name']} slab, {x.gender(c)}, gross {money(wg['gross'])})", money(act),
                         exp == act, "Medium", f"PT {money(act)} deducted where the slab is {money(exp)} — "
                         f"{'excess deduction from wages' if act > exp else 'short deduction'} of {money(abs(act - exp))}."))
    return x.missing_wg(out, "PT slab")


AUTHORISED_DED = re.compile(r"pf|e\.?p\.?f|prov|esi|p\.?t\b|prof|l\.?w\.?f|welfare|tds|t\.?d\.?s|income|tax|advance|fine|damage|loss|"
                            r"total|net|co-?op|society|canteen|hous|recover|insurance|lic|other", re.I)


@check(34, covers=("50% of wages", "unauthorised deduction"))
def wc_total_ded(x, s):
    out = []
    for c in x.wcodes:
        wg = x.wg(c)
        if not _need(x, c, "total_ded"):
            continue
        parts = sum(nz(wg.get(k)) for k in ("epf", "esi", "pt", "lwf", "advance", "fine", "damage", "tds", "other_deductions"))
        out.append(_calc(x, c, f"PF+ESI+PT+LWF+TDS+Adv+Fine+Damage+Other = {money(parts)}", money(wg["total_ded"]),
                         abs(parts - nz(wg["total_ded"])) <= x.tol, "Medium", "Total deductions do not add up.", status_fail=PC))
        gross = nz(wg.get("gross"))
        if gross:
            pct = nz(wg["total_ded"]) / gross * 100
            out.append(_calc(x, c, "Total deductions ≤ 50% of wages", f"{pct:.1f}% of gross", pct <= 50, "High",
                             f"Deductions are {pct:.1f}% of wages — above the 50% cap (Code on Wages §18).", sub="50% of wages"))
        if nz(wg.get("other_deductions")):
            out.append(_calc(x, c, "Only authorised deduction heads", f"'Other' deduction {money(wg['other_deductions'])}", False,
                             "Medium", "Deduction under an unspecified 'other' head — authorisation not evidenced.", PC, sub="unauthorised deduction"))
    heads = x.ev.doc("WG").get("deduction_heads") or []
    bad = [h for h in heads if not AUTHORISED_DED.search(str(h))]
    out.append(x.F(x.site(), "Only statutory / authorised deduction heads in the Wage Register", ", ".join(map(str, heads)) or "Heads not extracted",
                   x.ev.doc_name("WG"), PC if bad else (C if heads else NV), "Medium",
                   ("Unrecognised deduction head(s): " + ", ".join(bad)) if bad else
                   ("All deduction heads are authorised under Code on Wages §18." if heads else "Deduction headings not available."),
                   "unauthorised deduction"))
    return x.missing_wg(out, "Total deductions")


@check(35)
def wc_epf_wages(x, s):
    out = []
    for c in x.wcodes:
        for k, ecr in x.ev.recs(c, "PFECR"):
            if num(ecr.get("epf_wages")) is None or not _need(x, c, "basic_earned"):
                continue
            basic = nz(x.wg(c)["basic_earned"])
            diff = basic - nz(ecr["epf_wages"])
            out.append(_calc(x, c, f"Basic earned {money(basic)}", money(ecr["epf_wages"]), abs(diff) <= x.tol, "High",
                             f"PF filed on {money(ecr['epf_wages'])} instead of {money(basic)} — EPF wages "
                             f"{'under' if diff > 0 else 'over'}-reported by {money(abs(diff))}.", src=x.ev.loc(k, ecr)))
    if not out:
        out.append(x.F(x.site(), "EPF wages = basic earned", "No worker of this site in the PF ECR", x.ev.doc_name("PFECR"), NV, "High",
                       "No PF ECR row could be linked to a worker on this site's Wage Register (see P-076)."))
    return out


@check(36, covers=("NCP days ≤", "leavers from DOL"))
def wc_ncp(x, s):
    out = []
    for c in x.wcodes:
        for k, ecr in x.ev.recs(c, "PFECR"):
            if num(ecr.get("ncp_days")) is None or num(x.wg(c).get("paid_days")) is None:
                continue
            exp = x.ev.month_days - int(nz(x.wg(c)["paid_days"]))
            ncp = int(nz(ecr["ncp_days"]))
            out.append(_calc(x, c, f"{x.ev.month_days} − {x.wg(c)['paid_days']} = {exp}", ncp, exp == ncp, "Medium",
                             f"NCP days {ncp} vs {exp} expected.", status_fail=PC, src=x.ev.loc(k, ecr)))
            out.append(_calc(x, c, f"NCP ≤ {x.ev.month_days}", ncp, ncp <= x.ev.month_days, "Medium", "NCP days exceed days in the month.",
                             PC, src=x.ev.loc(k, ecr), sub="NCP days ≤"))
            left = x.left_in_month(c)
            if left:
                after = (x.ev.month_end - left).days
                out.append(_calc(x, c, f"NCP ≥ {after} day(s) after leaving on {fmt_date(left)}", ncp, ncp >= after, "Medium",
                                 f"Leaver's NCP days ({ncp}) do not cover the {after} day(s) from leaving to month end.", PC,
                                 src=x.ev.loc(k, ecr), sub="leavers from DOL"))
    if not any(f.subcheck for f in out):
        out.append(x.F(x.site(), "Leavers' NCP days", "No leaver in the PF ECR", x.ev.doc_name("PFECR"), NA, "None",
                       "No worker in the PF ECR left during the month.", "leavers from DOL"))
    return out or [x.F(x.site(), "NCP days", "No worker of this site in the PF ECR", x.ev.doc_name("PFECR"), NV, "Medium",
                       "No PF ECR row could be linked to a worker on this site.")]


@check(37, covers=("joiners counted from DOJ", "reason code"))
def wc_esi_days(x, s):
    out = []
    for c in x.wcodes:
        for k, e in x.ev.recs(c, "ESECR"):
            if num(e.get("esi_days")) is None or num(x.wg(c).get("paid_days")) is None:
                continue
            d, paid = int(nz(e["esi_days"])), int(nz(x.wg(c)["paid_days"]))
            out.append(_calc(x, c, f"Paid days {paid}", d, d == paid, "Medium", f"ESIC return shows {d} days against {paid} paid days.",
                             status_fail=PC, src=x.ev.loc(k, e)))
            doj = x.doj(c)
            if doj and doj > x.ev.month_start:
                avail = (x.ev.month_end - doj).days + 1
                out.append(_calc(x, c, f"≤ {avail} days (joined {fmt_date(doj)})", d, d <= avail, "Medium",
                                 f"Joiner reported for {d} days though only {avail} days remained after joining.", PC,
                                 src=x.ev.loc(k, e), sub="joiners counted from DOJ"))
            if d == 0:
                rc = e.get("reason_code")
                out.append(_calc(x, c, "Reason code for zero days", rc or "none", bool(rc), "Low", "Zero-day IP without a reason code.",
                                 PC, src=x.ev.loc(k, e), sub="reason code"))
    if not any(f.subcheck == x.sub("joiners counted from DOJ") for f in out):
        out.append(x.F(x.site(), "Joiners counted from DOJ", "No mid-month joiner in the ESIC return", x.ev.doc_name("ESECR"), NA, "None",
                       "No ESIC-covered worker joined during the month.", "joiners counted from DOJ"))
    if not any(f.subcheck == x.sub("reason code") for f in out):
        out.append(x.F(x.site(), "Reason code for zero-day IPs", "No zero-day IP of this site", x.ev.doc_name("ESECR"), NA, "None",
                       "No worker of this site is reported with zero days.", "reason code"))
    return out


@check(38, covers=("adolescents", "joining date"))
def wc_age(x, s):
    out = []
    for c in x.codes:
        dob = x.dob(c)
        if not dob:
            out.append(x.F(x.who(c), "≥ 18 years", "DOB not recorded", x.ev.loc("WR", x.wr(c)), NV, "High", "No DOB."))
            continue
        age = (x.ev.month_start - dob).days // 365.25
        ok = age >= x.p["min_age"]
        out.append(x.F(x.who(c), f"≥ {x.p['min_age']} years", f"{age:.0f} years (DOB {fmt_date(dob)})", x.ev.loc("WR", x.wr(c)),
                       C if ok else NC, "Critical", "Adult worker." if ok else "Under-age worker — child labour."))
        doj = x.doj(c)
        if doj:
            at_join = (doj - dob).days // 365.25
            out.append(x.F(x.who(c), "≥ 18 at date of joining", f"{at_join:.0f} years on {fmt_date(doj)}", x.ev.loc("WR", x.wr(c)),
                           C if at_join >= 18 else NC, "Critical", "Adult when engaged." if at_join >= 18 else "Engaged while a minor.", "joining date"))
        if 14 <= age < 18:
            out.append(x.F(x.who(c), "Adolescent not in a hazardous process", x.wr(c).get("designation"), x.ev.loc("WR", x.wr(c)),
                           NV, "Critical", "Adolescent worker — confirm the process is not hazardous.", "adolescents"))
    if not any(f.subcheck == x.sub("adolescents") for f in out):
        out.append(x.F(x.site(), "No adolescent (14–18) in a hazardous process", "No worker aged 14–18", "Workman Register", NA, "None",
                       "No adolescent worker on the rolls.", "adolescents"))
    return out


@check(39)
def wc_rate_svc(x, s):
    out = []
    for c in x.wcodes:
        for k, r, rate in x.ev.facts(c, "wage_rate_stated"):
            ok = abs(nz(rate) - nz(x.wg(c).get("rate_total"))) <= x.tol
            out.append(_calc(x, c, f"Wage Register rate {money(x.wg(c).get('rate_total'))}", f"{x.ev.doc_name(k)} {money(rate)}", ok,
                             "Medium", f"{x.ev.doc_name(k)} states {money(rate)} — {money(nz(rate) - nz(x.wg(c).get('rate_total')))} "
                             "different from the rate actually paid.", status_fail=PC, src=x.ev.loc(k, r)))
        for k, r in x.ev.recs(c, "FORM14") + x.ev.recs(c, "APPT"):
            rate = r.get("wage_rate") or r.get("wage")
            if num(rate) is not None:
                ok = abs(nz(rate) - nz(x.wg(c).get("rate_total"))) <= x.tol
                out.append(_calc(x, c, f"Wage Register rate {money(x.wg(c).get('rate_total'))}", f"{x.ev.doc_name(k)} {money(rate)}", ok,
                                 "Medium", "Rate on employment card / letter differs from the Wage Register.", PC, src=x.ev.loc(k, r)))
    if not out:
        out.append(x.F(x.site(), "Rate on service certificate / employment card = Wage Register", "No service certificate or employment card",
                       "—", NV, "Medium", "No document states a wage rate to compare (Form XIV not supplied — see P-067)."))
    if not x.state.get("minimum_wages"):
        out.append(x.F(x.site(), "Rate ≥ BSS Admin minimum wage", "Minimum-wage master not configured", "config/statutory_params.json",
                       NV, "Medium", "Minimum wages come from the BSS Admin master — not loaded for this state, so the rate floor is unchecked."))
    return out


@check(40)
def wc_pf_exclusion(x, s):
    out = []
    thr = x.p["pf"]["exclusion_basic_threshold"]
    for c in x.wcodes:
        if x.pf_member(c):
            continue
        wg = x.wg(c)
        f11 = x.w(c).get("F11")
        never = f11 and str(f11.get("previous_pf_member", "")).lower().startswith("no")
        ok = nz(wg.get("rate_basic")) > thr and bool(never)
        out.append(_calc(x, c, f"Basic rate > ₹{thr:,} AND Form-11 showing never a PF member",
                         f"Basic rate {money(wg.get('rate_basic'))}; Form-11 {'says never a member' if never else 'on file' if f11 else 'not supplied'}",
                         ok, "High", f"Excluded from PF without grounds — " +
                         (f"basic rate {money(wg.get('rate_basic'))} is not above ₹{thr:,}" if nz(wg.get("rate_basic")) <= thr else "basic is above the threshold")
                         + ("" if never else " and no Form-11 proves prior non-membership") + "."))
    return out or [x.F(x.site(), "PF exclusions justified", "Every worker is a PF member", x.ev.doc_name("WG"), NA, "None",
                       "No worker is excluded from PF.")]


@check(41, covers=("additional condition",))
def wc_esi_exclusion(x, s):
    out = []
    ceil = x.p["esi"]["wage_ceiling"]
    for c in x.wcodes:
        if x.esi_member(c):
            continue
        wg = x.wg(c)
        if nz(wg.get("rate_total")) > ceil:
            out.append(x.F(x.who(c), f"Wage rate > ₹{ceil:,}", money(wg.get("rate_total")), x.ev.loc("WG", wg), C, "None",
                           "Above the ESI ceiling."))
        else:
            out.append(x.F(x.who(c), f"Wage rate > ₹{ceil:,}", money(wg.get("rate_total")), x.ev.loc("WG", wg), NC, "High",
                           f"Not covered under ESI although wage rate {money(wg.get('rate_total'))} is within the ₹{ceil:,} ceiling."))
    m = x.ev.month_start.month
    period = "April–September (H1)" if 4 <= m <= 9 else "October–March (H2)"
    above = [x.ev.worker_name(c) for c in x.wcodes if nz(x.wg(c).get("rate_total")) > ceil]
    out.append(x.F(x.site(), f"ESI continues for the whole {period} once deducted", "Only one wage month supplied" +
                   (f"; above-ceiling workers: {', '.join(above)}" if above else ""), x.ev.doc_name("WG"), NV if above else NA, "Medium",
                   (f"Earlier months of the {period} period are needed to confirm whether ESI was deducted for "
                    f"{', '.join(above)} and must therefore continue.") if above else "No worker is above the ESI ceiling.", "additional condition"))
    return out


@check(42, covers=("Eligibility", "minimum wage"))
def wc_bonus(x, s):
    out = []
    lo, hi = x.p["bonus"]["min_pct"], x.p["bonus"]["max_pct"]
    for c in x.wcodes:
        base = nz(x.wg(c).get("basic_earned"))
        if not base:
            continue
        vals = [("Wage Register", num(x.wg(c).get("bonus")))]
        vals += [(x.ev.doc_name(k), num(r.get("bonus"))) for k, r in x.ev.recs(c, "BR")]
        pcts = [(d, v, v / base * 100) for d, v in vals if v is not None]
        bad = [(d, v, p) for d, v, p in pcts if p < lo - 0.01 or p > hi + 0.01]
        shown = "; ".join(f"{d}: {money(v)} = {p:.2f}%" for d, v, p in pcts)
        out.append(_calc(x, c, f"{lo}%–{hi}% of {money(base)}", shown, not bad, "Medium",
                         "; ".join(f"{d} bonus {p:.2f}% is {'below' if p < lo else 'above'} the statutory band" for d, _, p in bad),
                         src=f"{x.ev.doc_name('WG')}; {x.ev.doc_name('BR')}"))
        rate = nz(x.wg(c).get("rate_total"))
        if rate > x.p["esi"]["wage_ceiling"]:
            out.append(_calc(x, c, f"Salary ≤ ₹{x.p['esi']['wage_ceiling']:,} for statutory bonus", money(rate), True, "Low",
                             "", obs_ok=f"Salary {money(rate)} exceeds the statutory eligibility limit — bonus paid is voluntary, not statutory.",
                             sub="Eligibility"))
    out.append(x.F(x.site(), "≥ 30 working days in the accounting year", "Only one wage month supplied", x.ev.doc_name("BR"), NV, "Low",
                   "Annual working-day eligibility needs the year's attendance; not in this submission.", "Eligibility"))
    out.append(x.F(x.site(), "Bonus calculated on minimum wage (or ₹7,000 if higher)",
                   "Minimum-wage master " + ("loaded" if x.state.get("minimum_wages") else "not configured"), "config/statutory_params.json",
                   NV, "Low", "Bonus base must be the higher of minimum wage and ₹7,000; minimum wage not available in BSS Admin master."
                   if not x.state.get("minimum_wages") else "Compare bonus base with the minimum wage master.", "minimum wage"))
    return x.missing_wg(out, "Bonus 8.33%–20%")


@check(43)
def wc_gross_sum(x, s):
    out = []
    for c in x.wcodes:
        e = x.wg(c).get("earnings")
        if not isinstance(e, dict) or not e or num(x.wg(c).get("gross")) is None:
            continue
        tot = sum(nz(v) for v in e.values())
        out.append(_calc(x, c, " + ".join(f"{money(v)}" for v in e.values() if nz(v)) + f" = {money(round(tot, 2))}",
                         money(x.wg(c)["gross"]), abs(tot - nz(x.wg(c)["gross"])) <= x.tol, "Medium",
                         f"Gross {money(x.wg(c)['gross'])} ≠ sum of earnings heads {money(round(tot, 2))}.", PC))
    return x.missing_wg(out, "Gross = sum of earnings")


@check(44, covers=("applicable states",))
def wc_lwf(x, s):
    lwf = x.state.get("lwf")
    if not lwf:
        return [x.F(x.site(), "LWF rules", f"Not configured for {x.ev.meta.get('state')}", "statutory_params.json", NV, "Low",
                    "State LWF not configured in BSS Admin.", "applicable states")]
    m = x.ev.month_start.month
    due = m in lwf["months"]
    out = [x.F(x.site(), "LWF applicable in the work-site state", f"{x.state.get('name')}: contributions in months {lwf['months']}",
               "statutory_params.json", C, "None", "LWF rules taken from the BSS Admin master.", "applicable states")]
    for c in x.wcodes:
        act = nz(x.wg(c).get("lwf"))
        exp = lwf["employee"] if due else 0
        out.append(_calc(x, c, f"{money(exp)} ({'contribution month' if due else 'not a contribution month'})", money(act),
                         act == exp, "Low", f"LWF {money(act)} vs {money(exp)} due.", status_fail=PC))
    reg = x.ev.doc("LWFREG")
    start = parse_date(reg.get("start"))
    if start:
        missed = [mo for mo in lwf["months"] if start <= date(x.ev.month_start.year - (mo > x.ev.month_start.month), mo, 28) < x.ev.month_start]
        if missed:
            out.append(x.F(x.site(), "Previous LWF contribution remitted", "LWF challan not supplied", x.ev.doc_name("LWFREG"), NV, "Low",
                           f"LWF liability from {fmt_date(start)} makes the latest contribution month due; its challan is not in the submission."))
    return out


def _nil_register(x: Ctx, key, col, label, subs=()):
    reg = x.ev.doc(key)
    if not reg:
        out = [_not_supplied(x, x.ev.doc_name(key) if key in x.ev.docs else label.capitalize() + " register", key, "Medium")]
    else:
        nonzero = [c for c in x.wcodes if nz(x.wg(c).get(col))]
        has_entries = reg.get("nil") is False
        ok = not nonzero and not has_entries
        out = [x.F(x.site(), f"Wage Register {label} = {x.ev.doc_name(key)}", f"Register: '{reg.get('entries', '')}'; Wage Register: "
                   + (", ".join(f"{x.ev.worker_name(c)} {money(x.wg(c)[col])}" for c in nonzero) or "₹0 for all workers"),
                   f"{x.ev.doc_name(key)}; {x.ev.doc_name('WG')}", C if ok else PC, "Medium",
                   "Consistent — no entries in either." if ok else f"{label} in the Wage Register and the register do not agree.")]
    nil = not any(nz(x.wg(c).get(col)) for c in x.wcodes) and (reg.get("nil") is not False)
    for kw, text in subs:
        out.append(x.F(x.site(), text, "Nil register for the month" if nil else "Entries present", x.ev.doc_name(key),
                       NA if nil else NV, "Medium", "No entries this month, so this condition does not arise." if nil
                       else "Entries present — verify against the register detail.", kw))
    return out


@check(45, covers=("instalments", "advance balance"))
def wc_advance(x, s): return _nil_register(x, "ADV", "advance", "advance recovery",
                                           (("instalments", "Recovered in approved instalments"), ("advance balance", "Recovery ≤ balance")))


@check(46, covers=("actual damage", "Show-cause"))
def wc_damage(x, s): return _nil_register(x, "DED", "damage", "damage / loss deduction",
                                          (("actual damage", "Deduction ≤ actual damage"), ("Show-cause", "Show-cause before deduction")))


@check(47, covers=("3%", "90 days", "below 15"))
def wc_fine(x, s): return _nil_register(x, "FINE", "fine", "fines",
                                        (("3%", "Fines ≤ 3% of wages"), ("90 days", "Recovered within 90 days"), ("below 15", "No fine on under-15s")))


def _extra_days(x: Ctx, c) -> tuple[float, int, bool]:
    """(amount, days, paid_at_1x) for extra-day wages; days inferred from the amount and the daily rate."""
    e = x.wg(c).get("earnings") if isinstance(x.wg(c).get("earnings"), dict) else {}
    amt = nz(x.wg(c).get("extra_days_wages") or e.get("extra_days"))
    d = x.daily_rate(c)
    if not amt or not d:
        return amt, 0, False
    r = amt / d
    n = round(r)
    at_1x = n >= 1 and abs(r - n) <= 0.1 * n
    return amt, n, at_1x


@check(48, covers=("144",))
def wc_ot(x, s):
    out = []
    mult = x.p["overtime"]["multiplier"]
    for c in x.wcodes:
        amt, n, at_1x = _extra_days(x, c)
        if not amt:
            continue
        d = x.daily_rate(c)
        r = amt / d
        at_2x = round(r / mult) >= 1 and abs(r / mult - round(r / mult)) <= 0.05 * max(1, round(r / mult))
        if at_2x and not at_1x:
            out.append(_calc(x, c, f"{mult:g}× daily rate {money(round(d, 2))}", money(amt), True, "Medium", ""))
        elif at_1x:
            short = n * d * mult - amt
            out.append(_calc(x, c, f"{n} day(s) × {mult:g} × {money(round(d, 2))} = {money(round(n * d * mult, 2))}",
                             f"{money(amt)} (= {r:.2f}× ordinary daily rate)", False, "Medium",
                             f"Extra-day work paid at the ordinary rate, not {mult:g}× — shortfall ≈ {money(round(short))}."))
        else:
            out.append(x.F(x.who(c), f"{mult:g}× ordinary rate", f"{money(amt)} (= {r:.2f}× daily rate)", x.ev.loc("WG", x.wg(c)),
                           NV, "Medium", "Extra-day count not recorded anywhere, so the rate cannot be derived."))
        hours = n * 8
        out.append(_calc(x, c, "≤ 144 OT hours per quarter", f"≈ {hours} h this month ({n} extra day(s) × 8 h)", hours <= 144, "Medium",
                         "Monthly OT already exceeds the quarterly cap.", PC,
                         obs_ok=f"≈ {hours} h this month — within the cap for the month; the other two months of the quarter are not supplied.",
                         sub="144"))
    if not out:
        out.append(x.F(x.site(), "Overtime at 2× the ordinary rate", "No overtime or extra-day wages paid", x.ev.doc_name("WG"), NA, "None",
                       "No overtime paid in the month."))
        out.append(x.F(x.site(), "≤ 144 OT hours per quarter", "No overtime this month", x.ev.doc_name("WG"), NA, "None", "No overtime.", "144"))
    return out


def _groups(x: Ctx):
    g = {}
    for c in x.wcodes:
        g.setdefault(_desig_core(x.wr(c).get("designation") or x.wg(c).get("designation"))[0], []).append(c)
    return g


@check(49)
def wc_equal_pay(x, s):
    out = []
    for desig, cs in _groups(x).items():
        genders = {x.gender(c) for c in cs}
        if len(genders) < 2:
            continue
        rates = {}
        for c in cs:
            rates.setdefault(x.gender(c), set()).add(nz(x.wg(c).get("rate_total")))
        ok = len({r for v in rates.values() for r in v}) == 1
        for c in cs:
            out.append(_calc(x, c, f"Same rate for {desig}", money(x.wg(c).get("rate_total")), ok, "High",
                             f"Male / female rates differ for {desig}: " + "; ".join(f"{g}: {', '.join(money(r) for r in sorted(v))}"
                                                                                for g, v in rates.items()) + "."))
    if not out:
        fem = [f"{x.ev.worker_name(c)} ({x.wr(c).get('designation') or x.wg(c).get('designation')}) {money(x.wg(c).get('rate_total'))}"
               for c in x.wcodes if x.gender(c) == "Female"]
        doubt = [x.ev.worker_name(c) for c in x.codes if x.gender(c) == "Male" and (tokens(x.ev.worker_name(c)) or [""])[0] in FEMALE_NAMES]
        out.append(x.F(x.site(), "Male & female in the same designation paid equally", "No designation employs both genders",
                       x.ev.doc_name("WG"), NA, "None", "No like-for-like pair to compare. Female workers: " + ("; ".join(fem) or "none recorded")
                       + (f". Gender recorded as Male for {', '.join(doubt)} looks doubtful (see P-084) and could change this test." if doubt else ".")))
    return out


@check(50, covers=("Both rules",))
def wc_designation_parity(x, s):
    out = []
    for desig, cs in _groups(x).items():
        if len(cs) < 2:
            continue
        rates = {c: (nz(x.wg(c).get("rate_total")), nz(x.wg(c).get("rate_basic"))) for c in cs}
        ok = len({v[0] for v in rates.values()}) == 1
        for c in cs:
            peers = "; ".join(f"{x.ev.worker_name(o)} {money(v[0])} (basic {money(v[1])})" for o, v in rates.items())
            out.append(_calc(x, c, f"One rate for all {desig.title()}s", money(rates[c][0]), ok, "Medium",
                             f"Different rates for the same designation: {peers}.", status_fail=PC))
    eq = wc_equal_pay(x, s)
    bad = [f for f in out + eq if f.is_flag]
    out.append(x.F(x.site(), "Gender parity (P-049) and designation parity (P-050) together",
                   f"{len([f for f in eq if f.is_flag])} gender-parity flag(s); {len([f for f in out if f.is_flag])} designation-parity flag(s)",
                   x.ev.doc_name("WG"), PC if bad else C, "Medium",
                   "Both parity rules evaluated together; see the flagged workers." if bad else "Both parity rules pass together.", "Both rules"))
    return out


# =========================================================================== 5. Attendance
@check(51, covers=("Both rules",))
def at_io_vs_mr(x, s):
    out = []
    for c in x.codes:
        mr, io = x.w(c).get("MR"), x.w(c).get("IO")
        if not (mr and io):
            if mr and not io and x.ev.has("IO"):
                out.append(x.F(x.who(c), "Row in In & Out register", "Not found", x.ev.doc_name("IO"), PC, "Medium",
                               "Worker has Muster Roll attendance but no row in the In & Out register."))
            continue
        src = f"{x.ev.loc('IO', io)}; {x.ev.loc('MR', mr)}"
        if io.get("days_worked") is None:
            ok = io.get("absent") == mr.get("absent")
            out.append(x.F(x.who(c), f"Muster: {mr.get('days_worked')} days, {mr.get('absent')} absent",
                           f"In & Out: {io.get('absent')} absent ({io.get('note', '')})", src, C if ok else PC, "Medium",
                           "Absences agree; day count not legible in the gate register." if ok else "Absences differ."))
            continue
        diff = int(nz(mr.get("days_worked"))) - int(nz(io["days_worked"]))
        out.append(x.F(x.who(c), f"In & Out: {io['days_worked']} days", f"Muster: {mr.get('days_worked')} days", src,
                       C if diff == 0 else PC, "High" if diff > 1 else "Medium",
                       "Consistent." if diff == 0 else
                       f"Muster Roll / wages credit {diff} more working day(s) than the gate register ({io.get('note', '')}) — possible inflated attendance."
                       if diff > 0 else f"Muster shows {-diff} fewer days than the gate register."))
    if not x.ev.has("IO"):
        out.append(_not_supplied(x, "In & Out / gate attendance register", "IO", "Medium"))
    out.append(x.F(x.site(), "Remark 'Both rules must be checked together'", "Catalogue remark is a merged cell spanning S.No 50–51",
                   "Agent1_AuditableFields_v3.xlsx", NA, "None",
                   "The remark belongs to the parity rules P-049/P-050 (applied there); it does not change this attendance comparison.",
                   "Both rules"))
    return out


@check(52)
def at_window(x, s):
    out = []
    for c in x.wcodes:
        if num(x.wg(c).get("paid_days")) is None:
            continue
        doj, ext = x.doj(c), x.exit_date(c)
        start = max(doj, x.ev.month_start) if doj else x.ev.month_start
        end = ext if ext and x.ev.month_start <= ext <= x.ev.month_end else x.ev.month_end
        window = (end - start).days + 1
        paid = int(nz(x.wg(c)["paid_days"]))
        out.append(x.F(x.who(c), f"≤ {window} days ({start:%d-%b} to {end:%d-%b})", paid, x.ev.loc("WG", x.wg(c)),
                       C if paid <= window else NC, "High", "Within employment period." if paid <= window
                       else f"Paid for {paid - window} day(s) outside the employment period."))
    return x.missing_wg(out, "Paid days within employment")


@check(53, covers=("Overtime",))
def at_io_quality(x, s):
    out = []
    if not x.ev.has("IO"):
        return [_not_supplied(x, "In & Out register", "IO", "Medium"),
                x.F(x.site(), "In-out times available to compute overtime", "No gate register", "—", DNA, "Medium",
                    "Without in / out times overtime hours cannot be computed.", "Overtime")]
    for c in x.codes:
        io = x.w(c).get("IO")
        if not io:
            out.append(x.F(x.who(c), "Row in In & Out register", "Not found", x.ev.doc_name("IO"), DNA, "Medium", "No gate entries."))
            continue
        issues = []
        sig = str(io.get("signatures", "")).lower()
        if not sig.startswith("daily"):
            issues.append(f"signatures: {io.get('signatures')}")
        if io.get("overwriting"):
            issues.append("overwriting without initialled correction")
        if str(io.get("times", "")).lower().startswith("not"):
            issues.append("in / out times not recorded")
        out.append(x.F(x.who(c), "Time in/out + signature daily, no overwriting",
                       "; ".join(issues) or f"Times {io.get('times')}; signed {io.get('signatures')}", x.ev.loc("IO", io),
                       PC if issues else C, "Medium", ("In & Out entries incomplete — " + "; ".join(issues) + ".") if issues
                       else "Times and signatures recorded."))
    timed = [c for c in x.codes if str(x.w(c).get("IO", {}).get("times", "")).lower().startswith("recorded")]
    out.append(x.F(x.site(), "In-out times usable to compute overtime", f"Times recorded for {len(timed)} of {len(x.codes)} workers",
                   x.ev.doc_name("IO"), C if len(timed) == len(x.codes) else PC, "Medium",
                   "Times available for OT computation (see P-159 for hours)." if len(timed) == len(x.codes)
                   else "Times missing for some workers — overtime cannot be computed for them.", "Overtime"))
    return out


def _daily(x: Ctx, c) -> list[str]:
    return [str(d or "").upper().strip() for d in x.w(c).get("MR", {}).get("daily", [])]


@check(54)
def at_marked_daily(x, s):
    out = []
    for c in x.codes:
        daily = _daily(x, c)
        if not daily:
            continue
        doj, ext = x.doj(c), x.exit_date(c)
        first = doj.day if doj and doj >= x.ev.month_start else 1
        last = ext.day if ext and x.ev.month_start <= ext <= x.ev.month_end else x.ev.month_days
        blanks = [i + 1 for i in range(first - 1, last) if i < len(daily) and not daily[i]]
        io = x.w(c).get("IO", {})
        io_days = io.get("daily") or []
        io_blank = [i + 1 for i in range(first - 1, min(last, len(io_days))) if not str(io_days[i] or "").strip()]
        io_note = str(io.get("note", ""))
        late_start = re.search(r"entries start (\d+)", io_note)
        issues = []
        if blanks:
            issues.append(f"Muster blank on day(s) {blanks}")
        if io_blank:
            issues.append(f"In & Out register blank on day(s) {io_blank}")
        elif late_start and int(late_start.group(1)) > first:
            issues.append(f"In & Out register: {io_note} (earlier working days not marked)")
        out.append(x.F(x.who(c), f"Mark for every day {first}–{last} {x.ev.month_start:%b}", "; ".join(issues) or "Marked every day",
                       f"{x.ev.doc_name('MR')}; {x.ev.doc_name('IO')}", PC if issues else C, "Low",
                       ("Attendance not marked for every working day: " + "; ".join(issues) + ".") if issues else "Complete."))
    if not out:
        out.append(_not_supplied(x, "Muster Roll with daily marks", "MR", "High"))
    return out


@check(55)
def at_io_summary(x, s):
    if not x.ev.has("IO"):
        return [_not_supplied(x, "In & Out register", "IO", "Medium")]
    io = x.ev.doc("IO")
    summ = str(io.get("summary_columns", ""))
    blank_ = bool(re.search(r"blank|not filled|empty|missing", summ, re.I))
    unsigned = io.get("employer_signature") is False
    bad = blank_ or unsigned
    return [x.F(x.site(), "Monthly present / absent / leave totals filled and signed", summ or "—", x.ev.doc_name("IO"),
                PC if bad else C if summ else NV, "Medium",
                ("Monthly summary not completed / signed." + (f" Layout: {io.get('layout')}." if io.get("layout") else "")) if bad
                else "Summary filled." if summ else "Summary columns could not be read.")]


@check(56)
def at_classification(x, s):
    out = []
    hol = x.ev.doc("HOL").get("list") or []
    holidays = {parse_date(d): n for d, n in hol if parse_date(d)}
    for c in x.codes:
        daily = _daily(x, c)
        if not daily:
            continue
        issues = []
        ext = x.left_in_month(c)
        for day, n in holidays.items():
            if day.year == x.ev.month_start.year and day.month == x.ev.month_start.month and day.day <= len(daily):
                if daily[day.day - 1] == "P":
                    issues.append(f"{day:%d-%b} ({n}, declared holiday) marked 'P' — holiday work needs NH marking + 2× pay / comp-off")
        if ext and ext < x.ev.month_end:
            after = [d for d in daily[ext.day:] if d]
            if after:
                issues.append(f"{len(after)} day(s) after leaving on {ext:%d-%b} marked '{after[0]}' instead of blank")
        doj = x.doj(c)
        if doj and x.ev.month_start < doj <= x.ev.month_end:
            before = [d for d in daily[:doj.day - 1] if d and d not in ("-",)]
            if before:
                issues.append(f"{len(before)} day(s) before joining on {doj:%d-%b} marked '{before[0]}'")
        unknown = sorted({d for d in daily if d and d not in ("P", "A", "WO", "NH", "L", "CL", "EL", "SL", "H", "PH", "HD", "-", "W", "OFF")})
        if unknown:
            issues.append(f"unrecognised mark(s): {', '.join(unknown)}")
        out.append(x.F(x.who(c), "P / A / WO / NH correctly classified", "; ".join(issues) or "Correct",
                       x.ev.loc("MR", x.w(c).get("MR")), PC if issues else C, "Medium" if issues else "Low",
                       ("Classification issues: " + "; ".join(issues) + ".") if issues else "Correctly classified."))
    return out or [_not_supplied(x, "Muster Roll with daily marks", "MR", "High")]


@check(57)
def at_totals(x, s):
    out = []
    for c in x.codes:
        mr = x.w(c).get("MR", {})
        daily = _daily(x, c)
        if not daily:
            continue
        p = daily.count("P")
        a = daily.count("A")
        rest = sum(daily.count(k) for k in ("WO", "NH", "H", "PH", "W", "OFF"))
        leave = sum(daily.count(k) for k in ("L", "CL", "EL", "SL"))
        checks = []
        if num(mr.get("days_worked")) is not None:
            checks.append(p == int(nz(mr["days_worked"])))
        if num(mr.get("paid_days")) is not None:
            checks.append(p + rest + leave == int(nz(mr["paid_days"])))
        if num(mr.get("absent")) is not None:
            checks.append(a == int(nz(mr["absent"])))
        ok = all(checks) if checks else None
        out.append(x.F(x.who(c), f"Count of marks: P {p}, rest {rest}, leave {leave}, A {a} → paid {p + rest + leave}",
                       f"Totals: worked {mr.get('days_worked')}, total {mr.get('paid_days')}, absent {mr.get('absent')}",
                       x.ev.loc("MR", mr), C if ok else PC if ok is False else NV, "Medium",
                       "Totals equal the daily entries." if ok else "Muster totals do not equal the daily entries." if ok is False
                       else "Totals not printed."))
    return out or [_not_supplied(x, "Muster Roll with daily marks", "MR", "High")]


@check(58)
def at_leave(x, s):
    out = []
    if not x.ev.has("LR"):
        return [_not_supplied(x, "Leave Register", "LR", "Medium")]
    lr = x.ev.doc("LR").get("entries", "")
    for c in x.wcodes:
        daily = _daily(x, c)
        if not daily or num(x.wg(c).get("paid_days")) is None:
            continue
        ext = x.left_in_month(c)
        upto = ext.day if ext else len(daily)
        a = daily[:upto].count("A")
        leave_marks = sum(daily.count(k) for k in ("L", "CL", "EL", "SL"))
        lr_rec = x.w(c).get("LR", {})
        paid = int(nz(x.wg(c)["paid_days"]))
        p_rest = sum(daily.count(k) for k in ("P", "WO", "NH", "H", "PH", "W", "OFF"))
        if a == 0 and not leave_marks:
            out.append(x.F(x.who(c), "Leave recorded for absences", "No absences", x.ev.doc_name("LR"), C, "None", "No absence to record."))
            continue
        if leave_marks:
            availed = nz(lr_rec.get("leave_availed"))
            ok = availed == leave_marks
            out.append(x.F(x.who(c), f"{leave_marks} leave day(s) in Muster = Leave Register", f"Leave Register availed {lr_rec.get('leave_availed', '—')}",
                           x.ev.loc("LR", lr_rec), C if ok else PC, "Medium", "Leave consistent." if ok else "Leave Register does not record the Muster leave."))
            continue
        ok = paid == p_rest
        out.append(x.F(x.who(c), f"{a} absence(s) recorded in Leave Register or unpaid",
                       f"Leave Register: '{lr or lr_rec.get('leave_availed', '—')}'; paid days {paid} = present + rest {p_rest}",
                       x.ev.doc_name("LR"), C if ok else PC, "Medium", f"{a} absence(s) treated as unpaid (no leave availed) — consistent."
                       if ok else "Absences paid without a leave record."))
    return out


# =========================================================================== 6. Paperwork completeness
FEMALE_NAMES = {"sonali", "mira", "meera", "sunita", "anita", "pooja", "puja", "priya", "rekha", "savita", "kavita", "shilabai",
                "samina", "parvin", "lakshmi", "laxmi", "seema", "geeta", "gita", "sita", "radha", "asha", "usha", "jyoti", "kiran bai",
                "manisha", "sangita", "sangeeta", "anjali", "neha", "shital", "sheetal", "rupali", "swati", "suman", "kamala", "kamla",
                "shobha", "sarita", "mamta", "mamata", "nirmala", "vandana", "archana", "ashwini", "pallavi", "aarti", "arti", "deepa",
                "kalpana", "madhuri", "mangal", "rani", "sushma", "renuka", "rohini", "shanta", "sunanda", "surekha", "vaishali", "varsha"}


def _gt_doc(x: Ctx, key, risk_missing="Medium", incomplete_risk="Low"):
    out = []
    for gname, g in x.ev.gt["workers"].items():
        st = g.get("documents", {}).get(key)
        src = f"worker folder ({g.get('folder_name', gname)})"
        if st is None or st.startswith("missing"):
            detail = st.split("—", 1)[1].strip() if st and "—" in st else "none in worker folder"
            out.append(x.F(x.who_gt(gname), f"{key} in worker folder", st or "Not in folder", src, DNA, risk_missing,
                           f"{key} not in the worker folder ({detail})."))
        elif "incomplete" in st or "blank" in st:
            out.append(x.F(x.who_gt(gname), f"{key} complete", st, src, PC,
                           "Medium" if "signature" in st else incomplete_risk, st[0].upper() + st[1:] + "."))
        else:
            out.append(x.F(x.who_gt(gname), f"{key} in worker folder", st, src, C, "None", "On file."))
    if not out:
        out.append(x.F(x.site(), f"{key} in worker folders", "No worker folder documents", "worker ground truth", NV, "Medium",
                       "The ground-truth folder held no worker documents."))
    return out


@check(59)
def pw_bank(x, s): return _gt_doc(x, "Bank proof")


@check(60)
def pw_appointment(x, s): return _gt_doc(x, "Appointment letter", "High")


@check(61)
def pw_biodata(x, s): return _gt_doc(x, "Bio-data", "Medium", "Low")


@check(62)
def pw_aadhaar(x, s): return _gt_doc(x, "Aadhaar", "High")


@check(63)
def pw_pan(x, s): return _gt_doc(x, "PAN")


def _per_worker_doc(x: Ctx, key, label, needed, risk="High", include_gt_missing=False, present=None):
    out = []
    for c in x.codes:
        if not needed(c):
            continue
        has = present(c) if present else bool(x.ev.recs(c, key))
        out.append(x.F(x.who(c), f"{label} supplied", "Present" if has else "Not supplied", x.ev.docs.get(key, x.ev.doc_name(key)),
                       C if has else DNA, risk, "On file." if has else f"{label} not supplied for this worker."))
    if include_gt_missing:
        for g, c in x.ev.links.items():
            if not c:
                out.append(x.F(x.who_gt(g), label, "No entry — worker not on rolls", x.ev.docs.get(key, x.ev.doc_name(key)), NC, "High",
                               f"Ground-truth worker has no {label.lower()} (worker not on contractor rolls, see P-001)."))
    return out


@check(64)
def pw_form2(x, s):
    def ok(c):
        recs = x.ev.recs(c, "F2")
        return any(r.get("nominees") or nz(r.get("nominee_share_pct")) > 0 for _, r in recs) if recs else False
    out = _per_worker_doc(x, "F2", "PF Form-2 nomination (with nominee)", x.pf_member, "Medium", present=ok)
    return out or [x.F(x.site(), "Form-2 for PF members", "No PF member on the rolls", "—", NA, "None", "No PF member.")]


@check(65)
def pw_epehchan(x, s):
    def has(c):
        if x.ev.recs(c, "ESCARD"):
            return True
        ip = digits(x.wg(c).get("esic_ip") or next((r.get("esic_ip") for _, r in x.ev.recs(c, "ESECR")), ""))
        cards = [d["rel"] for d in x.ev.has("ESCARD")]
        return bool(ip) and any(ip in x.ev.corpus.get(rel, "") for rel in cards)
    out = _per_worker_doc(x, "ESCARD", "ESIC e-Pehchan card", x.esi_member, "Medium", present=has)
    return out or [x.F(x.site(), "e-Pehchan for ESI members", "No ESI member on the rolls", "—", NA, "None", "No ESI-covered worker.")]


def _all_workers_missing(x: Ctx, label, risk, obs_extra=""):
    return [x.F(x.who(c), f"{label} for this worker", "Not supplied", "contractor submission (no such document)", DNA, risk,
                f"{label} not supplied.{obs_extra}") for c in x.codes]


@check(66, covers=("bounded",))
def pw_contr_appointment(x, s):
    sub = x.F(x.site(), "Worker bound to contractor on BSS → verify letters on BSS",
              "Policy: " + ("workers bound on BSS" if x.policy.get("bss_bound_workers") else "workers not bound on BSS"),
              "config/agent_config.json", NV if x.policy.get("bss_bound_workers") else NA, "Low",
              "Verify appointment, employment and experience letters on the BSS platform." if x.policy.get("bss_bound_workers")
              else "Workers are not bound to this contractor on BSS, so the letters must be in the submission.", "bounded")
    if x.policy.get("bss_bound_workers"):
        return [x.F(x.who(c), "Appointment letter", "Verify on BSS", "BSS platform", NV, "Low",
                    "Worker bound on BSS — verify appointment / employment / experience letters there.") for c in x.codes] + [sub]
    if x.ev.has("APPT"):
        out = _per_worker_doc(x, "APPT", "Appointment letter", lambda c: True, "High")
        for f in out:
            recs = x.ev.recs(f.code, "APPT") if f.code in x.ev.workers else []
            if recs and not (recs[0][1].get("signed_by_employer") and recs[0][1].get("signed_by_employee")):
                f.status, f.risk = PC, "Medium"
                f.observation = "Appointment letter on file but not signed by both parties (Signature Rule)."
        return out + [sub]
    return _all_workers_missing(x, "Appointment letter (signed by both parties)", "High") + [sub]


@check(67)
def pw_form14(x, s):
    if x.ev.has("FORM14"):
        return _per_worker_doc(x, "FORM14", "Employment Card (Form XIV)", lambda c: True, "High")
    return _all_workers_missing(x, "Employment Card (Form XIV)", "High")


@check(68)
def pw_payslip(x, s):
    if x.ev.has("PAYSLIP"):
        return _per_worker_doc(x, "PAYSLIP", f"Payslip for {x.ev.month_start:%b-%Y}", lambda c: True, "High")
    return _all_workers_missing(x, f"Payslip for {x.ev.month_start:%b-%Y}", "High")


@check(69)
def pw_f11_employer(x, s):
    out = []
    for c in x.codes:
        for k, f11 in x.ev.recs(c, "F11"):
            sec = str(f11.get("employer_section", "")).lower()
            blank_ = sec.startswith("blank") or sec.startswith("not") or f11.get("employer_signature") is False
            out.append(x.F(x.who(c), "Joining date, PF no., employer signature & seal", f11.get("employer_section") or "—",
                           x.ev.loc(k, f11), PC if blank_ else C if sec else NV, "Medium",
                           "Employer declaration on Form-11 not completed (Signature Rule)." if blank_ else "Completed." if sec else "Not readable."))
    return out or [x.F(x.site(), "Employer part of Form-11", "No Form-11 supplied", "—", DNA, "High", "No Form-11 to check (see P-078).")]


def _entry(x: Ctx, key, label):
    if not x.ev.has(key):
        return [_not_supplied(x, label, key, "High")] + [
            x.F(x.who_gt(g), label, "No entry — worker not on rolls", "—", NC, "High",
                f"Ground-truth worker has no {label.lower()} (worker not on contractor rolls, see P-001).") for g, c in x.ev.links.items() if not c]
    return _per_worker_doc(x, key, f"Entry in {label}", lambda c: True, "High", include_gt_missing=True)


@check(70)
def pw_wr_entry(x, s):
    out = _entry(x, "WR", "Workman Register")
    from collections import Counter
    cnt = Counter(x.wr(c).get("emp_code") or c for c in x.codes if x.wr(c))
    dup = {c for c, n in cnt.items() if n > 1}
    for f in out:
        if f.status == C:
            f.found = f"Employee ID {f.code}" + (" (duplicate!)" if f.code in dup else " (unique)")
            if f.code in dup:
                f.status, f.risk, f.observation = PC, "Medium", "Employee ID shared with another worker."
        if f.status == DNA and f.entity == "worker":
            f.status = NC
    return out


@check(71)
def pw_wg_entry(x, s): return [_fix_dna(f) for f in _entry(x, "WG", "Wage Register")]


@check(72)
def pw_mr_entry(x, s): return [_fix_dna(f) for f in _entry(x, "MR", "Muster Roll")]


@check(73)
def pw_br_entry(x, s): return [_fix_dna(f) for f in _entry(x, "BR", "Bonus Register")]


@check(74)
def pw_lr_entry(x, s): return [_fix_dna(f) for f in _entry(x, "LR", "Leave Register")]


@check(75)
def pw_sc_entry(x, s): return [_fix_dna(f) for f in _entry(x, "SC", "salary payment confirmation")]


def _fix_dna(f: Finding) -> Finding:
    """A worker missing from a register that WAS supplied is non-compliance, not a missing document."""
    if f.entity == "worker" and f.status == DNA:
        f.status, f.observation = NC, f.observation.replace("not supplied for this worker", "has no entry for this worker")
    return f


@check(76, covers=("ghost",))
def pw_ecr_entry(x, s):
    out = []
    if not x.ev.has("PFECR"):
        return [_not_supplied(x, "PF ECR", "PFECR", "High")]
    for c in x.wcodes:
        if not x.pf_eligible(c):
            continue
        recs = x.ev.recs(c, "PFECR")
        has = bool(recs) and bool(digits(recs[0][1].get("uan")))
        out.append(x.F(x.who(c), "In PF ECR with UAN", f"UAN {recs[0][1]['uan']}" if has else "Not in PF ECR",
                       x.ev.docs.get("PFECR"), C if has else NC, "High",
                       "Present." if has else f"PF-eligible (basic rate {money(x.wg(c).get('rate_basic'))}) but absent from the PF ECR — "
                       "PF not remitted for this worker."))
    extra = x.ev.unmatched.get("PFECR", [])
    total = nz(x.ev.doc("PFECR").get("total_members")) or (len(extra) + sum(1 for c in x.codes if x.ev.recs(c, "PFECR")))
    out.append(x.F(x.site(), "No ECR member who is not on the Wage Register",
                   f"{len(extra)} of {int(total)} ECR members are not on this site's Wage Register", x.ev.doc_name("PFECR"),
                   C if not extra else NV, "Medium",
                   "Every ECR member is on the Wage Register." if not extra else
                   "The ECR is establishment-wide (one PF code for all sites); these members must be matched to other sites' wage "
                   "registers before they can be called ghost members: " + ", ".join(str(r.get("name")) for r in extra[:12])
                   + (" …" if len(extra) > 12 else "") + ".", "ghost"))
    return out


@check(77)
def pw_esic_entry(x, s):
    out = []
    if not x.ev.has("ESECR"):
        return [_not_supplied(x, "ESIC monthly return", "ESECR", "High")]
    for c in x.wcodes:
        if not x.esi_eligible(c):
            continue
        recs = x.ev.recs(c, "ESECR")
        out.append(x.F(x.who(c), "In ESIC return", f"IP {recs[0][1].get('esic_ip')}" if recs else "Not in ESIC return",
                       x.ev.docs.get("ESECR"), C if recs else NC, "High",
                       "Present." if recs else f"ESI-eligible (rate {money(x.wg(c).get('rate_total'))}) but not in the ESIC return — no ESI cover."))
    return out


@check(78)
def pw_f11(x, s): return _per_worker_doc(x, "F11", "PF Form-11 declaration", lambda c: True, "High")


@check(79)
def pw_f11_timely(x, s):
    out = []
    lim = x.p["form11_within_days"]
    for c in x.codes:
        for k, f11 in x.ev.recs(c, "F11"):
            doj, fd = x.doj(c), parse_date(f11.get("form_date"))
            if not (doj and fd):
                out.append(x.F(x.who(c), f"Signed within {lim} days of DOJ", f"Form date {f11.get('form_date') or 'not legible'}",
                               x.ev.loc(k, f11), NV, "Medium", "Form-11 date or DOJ not available."))
                continue
            late = (fd - doj).days
            out.append(x.F(x.who(c), f"Signed within {lim} days of DOJ {fmt_date(doj)}", f"Signed {fmt_date(fd)} ({late} days)",
                           x.ev.loc(k, f11), C if late <= lim else PC, "Medium",
                           "On time." if late <= lim else f"Declaration signed {late} days after joining."))
    return out or [x.F(x.site(), "Form-11 timing", "No Form-11 supplied", "—", DNA, "High", "No Form-11 to check (see P-078).")]


@check(80)
def pw_f2_share(x, s):
    out = []
    for c in x.codes:
        for k, f2 in x.ev.recs(c, "F2"):
            share = num(f2.get("nominee_share_pct"))
            if share is None and f2.get("nominees"):
                share = sum(nz(n.get("share_pct")) for n in f2["nominees"] if isinstance(n, dict))
            if share is None:
                continue
            ok = share == 100
            out.append(x.F(x.who(c), "100% share allotted; nomination saved", f"{share:g}% — '{f2.get('nomination_history', '')}'",
                           x.ev.loc(k, f2), C if ok else PC, "Medium",
                           "Complete." if ok else f"Nomination not completed: {share:g}% share allotted"
                           + (" and nothing saved on the EPFO portal." if "no nomination" in str(f2.get("nomination_history", "")).lower() else ".")))
    return out or [x.F(x.site(), "Form-2 share allotment", "No Form-2 with share details", x.ev.doc_name("F2"), NV if x.ev.has("F2") else DNA,
                       "Medium", "Form-2 share details not available.")]


DISTRICT_HINT = re.compile(r"\bdist(rict)?\b|\btq\b|taluka|tehsil|\bpo\b|post", re.I)


@check(81)
def pw_address(x, s):
    out = []
    for c in x.codes:
        a = x.wr(c).get("address")
        if blank(a):
            out.append(x.F(x.who(c), "Village, district and PIN", "No address", x.ev.loc("WR", x.wr(c)), PC, "Low", "Permanent address not recorded."))
            continue
        has_pin = bool(re.search(r"(?<!\d)\d{3}\s?\d{3}(?!\d)", a))
        has_dist = bool(DISTRICT_HINT.search(a)) or len([p for p in re.split(r"[,\-]", a) if p.strip()]) >= 3
        miss = [m for m, ok in (("PIN", has_pin), ("district", has_dist)) if not ok]
        out.append(x.F(x.who(c), "Village, district and PIN", a, x.ev.loc("WR", x.wr(c)), PC if miss else C, "Low",
                       f"Address incomplete — no {' / '.join(miss)}." if miss else "Complete."))
    return out


@check(82)
def pw_f11_legible(x, s):
    out = []
    for c in x.codes:
        for k, f11 in x.ev.recs(c, "F11"):
            issues = [str(i) for i in (f11.get("issues") or [])]
            for q, lab in (("international_worker", "'International worker'"), ("previous_pf_member", "'Previous PF member'")):
                if str(f11.get(q, "")).lower().startswith("not"):
                    issues.append(f"{lab} question not answered")
            if f11.get("bank_account") and (blank(f11.get("ifsc")) or len(re.sub(r"\W", "", str(f11.get("ifsc")))) != 11):
                issues.append(f"IFSC missing / incomplete ({f11.get('ifsc')})")
            if f11.get("aadhaar") and len(digits(f11["aadhaar"])) != 12:
                issues.append("Aadhaar not 12 digits")
            if parse_date(f11.get("form_date")) is None and f11.get("form_date"):
                issues.append(f"date field holds '{f11['form_date']}'")
            out.append(x.F(x.who(c), "All fields complete and legible", "; ".join(issues) or "Complete", x.ev.loc(k, f11),
                           PC if issues else C, "Low", ("Form-11 defects: " + "; ".join(issues) + ".") if issues else "Complete."))
    return out or [x.F(x.site(), "Form-11 legibility", "No Form-11 supplied", "—", DNA, "High", "No Form-11 to check (see P-078).")]


@check(83)
def pw_photo(x, s):
    out = []
    for gname, g in x.ev.gt["workers"].items():
        st = g.get("documents", {}).get("Photograph")
        src = f"worker folder ({g.get('folder_name', gname)})"
        if st and "attested" in st and "not attested" not in st:
            out.append(x.F(x.who_gt(gname), "Attested photograph", st, src, C, "None", "Attested photograph on file."))
        elif st:
            out.append(x.F(x.who_gt(gname), "Attested photograph", st, src, PC, "Low",
                           "Photograph on file but no attestation (signature / stamp across it) is visible."))
        else:
            out.append(x.F(x.who_gt(gname), "Attested photograph", "Not in folder", src, DNA, "Medium", "No photograph in the worker folder."))
    return out or [x.F(x.site(), "Photographs in worker folders", "No worker folder documents", "—", NV, "Medium", "No worker documents.")]


@check(84)
def pw_gender(x, s):
    out = []
    for c in x.codes:
        g = x.gender(c)
        gname = x.ev.gt_for(c)
        gt_g, _ = x.ev.gt_field(gname, "gender") if gname else (None, None)
        first = (tokens(x.ev.worker_name(c)) or [""])[0]
        if gt_g:
            ok = str(gt_g)[:1].lower() == g[:1].lower()
            out.append(x.F(x.who(c), f"Aadhaar: {gt_g}", f"Registers: {g}", x.ev.loc("WR", x.wr(c)), C if ok else PC, "Medium",
                           "Matches Aadhaar." if ok else "Gender differs from Aadhaar."))
        elif first in FEMALE_NAMES and g == "Male":
            out.append(x.F(x.who(c), "Female (given name)", f"{g} (registers)", x.ev.loc("WR", x.wr(c)), PC, "Medium",
                           "Recorded as Male for a typically female given name — affects PT slab, maternity, equal-pay and POSH coverage. "
                           "No ID supplied to settle it."))
        else:
            out.append(x.F(x.who(c), "Consistent with given name", g or "not recorded", x.ev.loc("WR", x.wr(c)), C if g else NV,
                           "None" if g else "Low", "Plausible; no ID to confirm." if g else "Gender not recorded."))
    return out


@check(85)
def pw_service_cert(x, s):
    out = []
    for c in x.codes:
        ext = x.left_in_month(c)
        if not ext:
            continue
        has = bool(x.ev.recs(c, "SVC"))
        out.append(x.F(x.who(c), f"Service certificate (left {fmt_date(ext)})", "Present" if has else "Not supplied",
                       x.ev.doc_name("SVC"), C if has else DNA, "Medium", "On file." if has else "Missing."))
    return out or [x.F(x.site(), "Service certificates for leavers", "No worker left during the month", x.ev.doc_name("WR"), NA, "None",
                       "No leaver in the wage month.")]


@check(86)
def pw_folder_label(x, s):
    out = []
    for gname, g in x.ev.gt["workers"].items():
        idname = (g["fields"].get("name") or [[gname]])[0][0]
        labels = [p.strip() for p in str(g.get("folder_name", gname)).replace("_", " ").split("/") if p.strip()]
        worst = "Match"
        for lab in labels:
            res, _ = compare_names(idname, lab)
            if res != "Match":
                worst = res if worst != "Mismatch" else worst
        ok = worst == "Match"
        out.append(x.F(x.who_gt(gname), f"Files named '{idname}'", " / ".join(labels), f"worker folder ({g.get('folder_name')})",
                       C if ok else PC, "Low", "Labelled as per ID." if ok else
                       f"File label differs from the ID name ({'spelling / short form' if worst == 'Minor variation' else 'different name'})."))
    return out


def _register_attr(x: Ctx, key, attr, label, risk="Medium"):
    if not x.ev.has(key):
        return [_not_supplied(x, x.ev.doc_name(key), key, "High")]
    val = x.ev.doc(key).get(attr)
    ok = val is True
    if x.policy.get("bss_generated_documents_count_as_signed") and "sign" in attr:
        ok = True
    return [x.F(x.site(), label, "Present" if ok else ("No such column / not present" if val is False else f"Not determinable ({val})"),
                x.ev.doc_name(key), C if ok else PC if val is False else NV, risk, f"{label}: present." if ok else
                f"{label} missing for all {len(x.codes)} workers ({x.ev.doc_name(key)})." if val is False else f"{label}: could not be read.")]


@check(87)
def pw_wr_photo(x, s): return _register_attr(x, "WR", "photo_column", "Photograph affixed and attested in Workman Register")


@check(88)
def pw_wr_sign(x, s): return _register_attr(x, "WR", "employee_signature_column", "Employee signature / thumb impression")


def _signed(x: Ctx, key, label):
    if not x.ev.has(key):
        return [_not_supplied(x, x.ev.doc_name(key), key, "High")]
    r = x.ev.doc(key)
    if x.policy.get("bss_generated_documents_count_as_signed"):
        return [x.F(x.site(), label, "BSS-generated & approved", x.ev.doc_name(key), C, "None",
                    "Policy: BSS-generated documents approved by the employer count as signed.")]
    sig, stamp = r.get("employer_signature"), r.get("employer_stamp")
    ok = bool(sig)
    unknown = sig is None
    return [x.F(x.site(), label, f"Signature {'present' if sig else 'absent' if sig is False else 'not determinable'}; "
                f"stamp {'present' if stamp else 'absent' if stamp is False else 'not determinable'}", x.ev.doc_name(key),
                C if ok else NV if unknown else PC, "Medium", "Signed by the contractor." + ("" if stamp else " No stamp.") if ok else
                "Signature could not be determined from the copy." if unknown else f"{x.ev.doc_name(key)} not signed (Signature Rule).")]


@check(89)
def pw_wr_employer(x, s): return _signed(x, "WR", "Employer signature and stamp")


@check(90, covers=("government document", "Medical certificate"))
def pw_age_proof(x, s):
    out = []
    for c in x.codes:
        g = x.ev.gt_for(c)
        st = x.ev.gt["workers"].get(g, {}).get("documents", {}).get("Aadhaar", "") if g else ""
        if st.startswith("present"):
            out.append(x.F(x.who(c), "Age-proof document", "Aadhaar in worker folder", "worker ground truth", C, "None", "Aadhaar on file."))
            out.append(x.F(x.who(c), "Government age proof", "Aadhaar (UIDAI)", "worker ground truth", C, "None",
                           "Age proof is a government document.", "government document"))
        else:
            hint = " (Aadhaar number quoted on Form-11, but no copy)" if x.first(c, "aadhaar") else ""
            out.append(x.F(x.who(c), "Age-proof document", "None supplied" + hint, "—", DNA, "Medium",
                           "No age-proof document (Aadhaar / birth / school certificate) supplied for this worker."))
    doubtful = [x.ev.worker_name(c) for c in x.codes if not x.dob(c)]
    out.append(x.F(x.site(), "Medical age certificate where proof is doubtful", ", ".join(doubtful) or "No doubtful case",
                   "—", NV if doubtful else NA, "Medium", "DOB missing — obtain a medical certificate of age." if doubtful
                   else "Every worker has a recorded DOB; no case needs a medical age certificate.", "Medical certificate"))
    return out


@check(91)
def pw_mr_number(x, s):
    if not x.ev.has("MR"):
        return [_not_supplied(x, "Muster Roll", "MR", "High")]
    r = x.ev.doc("MR")
    ok = not blank(r.get("register_number"))
    return [x.F(x.site(), "Unique, sequential register number", r.get("register_number") or f"None ('{r.get('form')}' header only)",
                x.ev.doc_name("MR"), C if ok else PC, "Low", "Numbered." if ok else "Muster Roll carries no register number.")]


@check(92, covers=("generated through BSS",))
def pw_mr_signed(x, s):
    return _signed(x, "MR", "Signed by an authorised person") + [_bss_policy(x)]


def _bss_policy(x: Ctx) -> Finding:
    on = x.policy.get("bss_generated_documents_count_as_signed")
    return x.F(x.site(), "BSS-generated, employer-approved documents count as signed",
               "Policy ON" if on else "Policy OFF / documents not generated on BSS", "config/agent_config.json", C if on else NA, "None",
               "Applied: register treated as signed." if on else "Register was not generated on BSS, so a physical signature is required.",
               "generated through BSS")


@check(93)
def pw_offer(x, s):
    hits = x.ev.find_docs(r"offer")
    return [x.F(x.site(), "Offer letters", "Present: " + "; ".join(d["rel"] for d in hits), "", NV, "Low", "Found — review per worker.")] if hits \
        else _all_workers_missing(x, "Offer letter", "Medium")


@check(94)
def pw_edu(x, s):
    hits = x.ev.find_docs(r"educat|marksheet|school|certificate of pass")
    gt = [g for g, w in x.ev.gt["workers"].items() if any(p.get("doc_type") == "GT_OTHER" and "educ" in str(p.get("notes", "")).lower()
                                                           for p in w.get("pages", []))]
    if hits or gt:
        return [x.F(x.site(), "Educational certificates", f"Found for {len(gt)} worker(s); contractor files: {len(hits)}", "", NV, "Low",
                    "Some certificates found — confirm one per worker.")]
    return _all_workers_missing(x, "Educational certificate", "Low")


@check(95)
def pw_form_f(x, s):
    return _per_worker_doc(x, "GRATUITY", "Gratuity nomination (Form F)", lambda c: True, "Medium") if x.ev.has("GRATUITY") \
        else _all_workers_missing(x, "Gratuity nomination Form-F", "Medium")


@check(96, covers=("generated through BSS",))
def pw_wg_signed(x, s):
    if not x.ev.has("WG"):
        return [_not_supplied(x, "Wage Register", "WG", "High")]
    r = x.ev.doc("WG")
    if x.policy.get("bss_generated_documents_count_as_signed"):
        return [x.F(x.site(), "Signed by employee and employer", "BSS-generated & approved", x.ev.doc_name("WG"), C, "None",
                    "Policy: BSS-generated documents approved by the employer count as signed."), _bss_policy(x)]
    emp_sig = str(r.get("employee_signature") or "")
    emp_blank = bool(re.search(r"blank|none|no such|absent", emp_sig, re.I))
    out = []
    for c in x.wcodes:
        row_sig = x.wg(c).get("employee_signature")
        has_emp = row_sig is True or (row_sig is None and not emp_blank and emp_sig.startswith("present"))
        has_er = bool(r.get("employer_signature"))
        bad = not (has_emp and has_er)
        out.append(x.F(x.who(c), "Employee signature + employer signature",
                       f"Employee: {'present' if has_emp else emp_sig or 'blank'}; employer: {'present' if has_er else 'none'}",
                       x.ev.loc("WG", x.wg(c)), PC if bad else C, "Medium",
                       "Wage Register not signed by " + " and ".join(w for w, ok in (("the employee", has_emp), ("the employer", has_er)) if not ok)
                       + " (Signature Rule)." if bad else "Signed by both."))
    return out + [_bss_policy(x)]


@check(97)
def pw_iw(x, s):
    recs = [(c, r) for c in x.codes for _, r in x.ev.recs(c, "F11")]
    if not recs:
        return [x.F(x.site(), "No international worker; IW field declared", "No Form-11 supplied", "—", NV, "Low",
                    "International-worker status cannot be confirmed without Form-11.")]
    yes = [x.ev.worker_name(c) for c, r in recs if str(r.get("international_worker", "")).lower().startswith("y")]
    unanswered = [x.ev.worker_name(c) for c, r in recs if str(r.get("international_worker", "")).lower().startswith("not")]
    return [x.F(x.site(), "No international worker; IW field declared",
                f"IW = yes for {len(yes)}; unanswered on {len(unanswered)} of {len(recs)} Form-11s", x.ev.doc_name("F11"),
                NV if yes else PC if unanswered else C, "Low" if not yes else "High",
                f"International worker declared: {', '.join(yes)} — IW return required." if yes else
                ("No indication of an international worker (identity numbers are Indian), but the 'International Worker' field is "
                 f"left blank on Form-11 for {', '.join(unanswered)}." if unanswered else "Declared 'No' on every Form-11."))]


@check(98)
def pw_lr_signed(x, s):
    if not x.ev.has("LR"):
        return [_not_supplied(x, "Leave Register", "LR", "Medium")]
    r = x.ev.doc("LR")
    emp = str(r.get("employee_signature") or "")
    er = r.get("employer_signature")
    ok = er is True and emp.lower().startswith("present")
    return [x.F(x.site(), "Signed by employee and employer", f"Employee: {emp or '—'}; employer: {er}", x.ev.doc_name("LR"),
                C if ok else PC, "Low", "Signed." if ok else "Leave Register signature columns blank / register unsigned.")]


@check(99)
def pw_br_signed(x, s):
    if not x.ev.has("BR"):
        return [_not_supplied(x, "Bonus Register", "BR", "Medium")]
    r = x.ev.doc("BR")
    emp = str(r.get("employee_signature") or "")
    out = []
    for c in x.codes:
        for k, rec in x.ev.recs(c, "BR"):
            sig = rec.get("employee_signature")
            ok = sig is True or (sig is None and emp.lower().startswith("present"))
            out.append(x.F(x.who(c), "Employee signature / thumb impression", "present" if ok else (emp or "blank"), x.ev.loc(k, rec),
                           C if ok else PC, "Medium", "Acknowledged." if ok else "Bonus receipt not acknowledged by the employee."))
    return out


# =========================================================================== 7. Establishment / remittance
def _same(x: Ctx, field_, label, risk, money_fmt=False):
    vals = x.ev.cross.get(field_, [])
    if not vals:
        return [x.F(x.site(), label, "Not found in any document", "—", NV, "Low", f"{label} is not stated in the submitted documents.")]
    if money_fmt:
        norm = lambda v: round(nz(v), 0)  # noqa: E731
        fmt = money
    else:
        norm = lambda v: parse_date(v) or str(v).strip().upper()  # noqa: E731
        fmt = lambda v: fmt_date(parse_date(v)) if parse_date(v) else str(v)  # noqa: E731
    base = norm(vals[0][0])
    shown = "; ".join(f"{note}: {fmt(v)}" for v, _, note in vals)
    diff = [v for v in vals if norm(v[0]) != base]
    if len(vals) == 1:
        return [x.F(x.site(), f"Identical in every document that states it", shown, x.ev.doc_name(vals[0][1]), NV, "Low",
                    f"{label} appears in only one document ({vals[0][2]}) — nothing to compare it with.")]
    return [x.F(x.site(), f"Identical in {len(vals)} documents", shown, "; ".join(x.ev.docs.get(d, d) for _, d, _ in vals),
                PC if diff else C, risk, "Consistent." if not diff else "Documents disagree: " + shown + ".")]


@check(100)
def es_paydate(x, s): return _same(x, "salary_paid_date", "Salary payment date", "Low")


@check(101)
def es_net_total(x, s): return _same(x, "net_total", "Total net pay", "Low", True)


@check(102)
def es_pt_amount(x, s):
    vals = x.ev.cross.get("pt_amount", [])
    if not vals:
        return [_not_supplied(x, "PT challan", "PTCH", "Medium")]
    paid = nz(vals[0][0])
    ded = sum(nz(x.wg(c).get("pt")) for c in x.wcodes)
    ok = abs(paid - ded) <= x.tol
    return [x.F(x.site(), f"Wage Register PT total {money(ded)}", f"PT challan {money(paid)}", x.ev.docs.get("PTCH"), C if ok else PC, "Medium",
                "Matches." if ok else f"Challan exceeds the PT deducted at this site by {money(paid - ded)} — the challan covers the whole "
                "PTRC registration; a site-wise reconciliation is not supplied." if paid > ded else f"PT under-deposited by {money(ded - paid)}.")]


def _due(x: Ctx, field_, due: date, label, status_late=PC, risk="Medium"):
    vals = x.ev.cross.get(field_, [])
    dates = [(parse_date(v), d, n) for v, d, n in vals if parse_date(v)]
    if not dates:
        return [x.F(x.site(), f"On or before {fmt_date(due)}", "Payment date not evidenced", "—", DNA, "High",
                    f"No document shows when {label} was paid.")]
    paid, d, note = max(dates, key=lambda t: t[0])
    ok = paid <= due
    return [x.F(x.site(), f"On or before {fmt_date(due)}", f"Paid {fmt_date(paid)} ({note})", x.ev.docs.get(d, d),
                C if ok else status_late, risk, f"{label} paid on time." if ok else f"{label} paid {(paid - due).days} day(s) late — interest liability.")]


def _next_month_day(x: Ctx, day: int) -> date:
    m = x.ev.month_start
    y, mo = (m.year + 1, 1) if m.month == 12 else (m.year, m.month + 1)
    return date(y, mo, min(day, calendar.monthrange(y, mo)[1]))


def _next_month_end(x: Ctx) -> date:
    d = _next_month_day(x, 1)
    return date(d.year, d.month, calendar.monthrange(d.year, d.month)[1])


@check(103, covers=("BSS Admin",))
def es_pt_due(x, s):
    rule = x.state.get("pt", {}).get("due_day")
    due = _next_month_day(x, rule) if rule else _next_month_end(x)
    return _due(x, "pt_paid_date", due, "Professional Tax") + [
        x.F(x.site(), "PT due date from BSS Admin", f"{x.state.get('name', '—')}: {x.state.get('pt', {}).get('due', 'not configured')}",
            "config/statutory_params.json", C if x.state.get("pt") else NV, "Low",
            f"Due date {fmt_date(due)} taken from the state master." if x.state.get("pt") else "State PT due date not configured.", "BSS Admin")]


@check(104)
def es_ot_register(x, s):
    paid = [c for c in x.wcodes if _extra_days(x, c)[0]]
    if not x.ev.has("OT"):
        return [_not_supplied(x, "Overtime Register", "OT", "Medium" if paid else "Low")]
    reg = x.ev.doc("OT")
    recorded = {c for c in x.codes if x.ev.recs(c, "OT")}
    missing = [c for c in paid if c not in recorded]
    return [x.F(x.site(), "Extra-day / OT wages entered in the Overtime Register",
                f"OT Register: '{reg.get('entries', '')}'; Wage Register pays extra days to " +
                (", ".join(f"{x.ev.worker_name(c)} {money(_extra_days(x, c)[0])}" for c in paid) or "nobody"),
                f"{x.ev.doc_name('OT')}; {x.ev.doc_name('WG')}", PC if missing else C, "Medium",
                "Overtime Register does not record the extra-day wages paid in the Wage Register — OT is unrecorded." if missing else "Consistent.")]


@check(105)
def es_wr_form(x, s):
    if not x.ev.has("WR"):
        return [_not_supplied(x, "Workman Register", "WR", "High")]
    form = str(x.ev.doc("WR").get("form") or "")
    ok = re.search(r"\bX\s*I\s*I\s*I\b(?!\s*I)", form.replace("l", "I"), re.I) and not re.search(r"XIX|XVIII", form, re.I)
    return [x.F(x.site(), "Form XIII", form or "Form not printed", x.ev.doc_name("WR"), C if ok else PC, "Medium",
                "Prescribed form." if ok else f"Register is headed '{form or 'without a form number'}'; the rulebook prescribes Form XIII "
                "(registers must follow the state rules / templates configured in BSS).")]


DOC_PROBES = {  # S.No -> (doc types, label, risk)
    106: (("AGREEMENT",), "Signed agreement copy", "High"),
    107: (("PO",), "Purchase / Work Order", "High"),
    108: (("LICENCE",), "Labour Licence", "High"),
    109: (("LICREN",), "Labour Licence renewal (Form VII)", "High"),
    111: (("ECPOL",), "Employees' Compensation policy", "High"),
    112: (("FORMD",), "Equal Remuneration register (Form D)", "High"),
}


@check(106, 107, 108, 109, 111, 112, covers=("Insured headcount",))
def es_documents(x, s):
    types, label, risk = DOC_PROBES[s.sno]
    hits = x.ev.has(*types)
    out = []
    if hits:
        out.append(x.F(x.site(), f"{label} supplied", "Present: " + "; ".join(d["rel"] for d in hits), "; ".join(d["rel"] for d in hits),
                       C, "None", "Document supplied."))
    else:
        out.append(_not_supplied(x, label, types[0], risk))
    if s.sno == 111:
        non_esi = [c for c in x.codes if not x.esi_member(c)]
        insured = num(x.ev.doc("ECPOL").get("insured_count"))
        if insured is None:
            out.append(x.F(x.site(), f"Insured headcount ≥ {len(non_esi)} workers without ESI", "Policy not supplied" if not hits else "Headcount not stated",
                           x.ev.doc_name("ECPOL"), DNA if not hits else NV, "High",
                           f"{len(non_esi)} worker(s) have no ESI cover ({', '.join(x.ev.worker_name(c) for c in non_esi) or 'none'}); "
                           "their compensation cover cannot be confirmed.", "Insured headcount"))
        else:
            ok = insured >= len(non_esi)
            out.append(x.F(x.site(), f"Insured headcount ≥ {len(non_esi)}", f"Insured {insured:g}", x.ev.doc_name("ECPOL"), C if ok else NC, "High",
                           "Covered." if ok else "EC policy covers fewer workers than those outside ESI.", "Insured headcount"))
    return out


@check(110)
def es_iw_return(x, s):
    hits = x.ev.has("IWR")
    if hits:
        return [x.F(x.site(), "IW return", "Present", hits[0]["rel"], C, "None", "Supplied.")]
    yes = [c for c in x.codes if any(str(r.get("international_worker", "")).lower().startswith("y") for _, r in x.ev.recs(c, "F11"))]
    if yes:
        return [_not_supplied(x, "International Worker return", "IWR", "High")]
    return [x.F(x.site(), "IW return where applicable", "Not supplied", "—", NA, "None",
                "No international worker identified on the rolls, so the monthly IW return is not applicable.")]


@check(113)
def es_min_wage(x, s):
    out = []
    notif = x.ev.has("MWN")
    other = x.ev.has("MWR")
    if notif:
        out.append(x.F(x.site(), "Minimum-wage notification", "Present", notif[0]["rel"], C, "None", "Supplied."))
    else:
        out.append(x.F(x.site(), "Minimum-wage notification", "Not supplied" + (f" (only '{other[0]['rel']}' — the annual return)" if other else ""),
                       other[0]["rel"] if other else "—", DNA, "High",
                       "Applicable minimum-wage notification not produced" + (" — the file supplied is the Minimum Wages Act annual return, "
                                                                                "not the notification." if other else ".")))
    mw = {k.upper(): v for k, v in x.state.get("minimum_wages", {}).items()}
    for r in x.ev.doc("MWN").get("rates") or []:
        if isinstance(r, dict) and r.get("category") and num(r.get("total")):
            mw.setdefault(str(r["category"]).upper(), nz(r["total"]))
    for c in x.wcodes:
        core = _desig_core(x.wr(c).get("designation") or x.wg(c).get("designation"))[0]
        floor = mw.get(core)
        if floor is None:
            continue
        rate = nz(x.wg(c).get("rate_total"))
        out.append(x.F(x.who(c), f"≥ {money(floor)} ({core})", money(rate), x.ev.loc("WG", x.wg(c)), C if rate >= floor else NC,
                       "High", "Above minimum wage." if rate >= floor else f"Below minimum wage by {money(floor - rate)}."))
    if not mw:
        out.append(x.F(x.site(), "Every rate ≥ minimum wage", "Minimum-wage master not configured", "config/statutory_params.json",
                       NV, "High", "Rate floor cannot be tested until the BSS Admin minimum-wage master is loaded for this state."))
    return out


@check(114)
def es_bank_sheet(x, s):
    if not x.ev.has("SC"):
        return [_not_supplied(x, "Bank transfer sheet", "SC", "High")]
    b = x.ev.doc("SC")
    labels = {"has_account_numbers": "account numbers", "has_amounts": "amounts", "has_status": "payment status"}
    miss = [lab for k, lab in labels.items() if b.get(k) is False]
    unknown = [lab for k, lab in labels.items() if b.get(k) is None]
    return [x.F(x.site(), "Account no., amount and status per worker",
                ("Missing: " + ", ".join(miss)) if miss else "Complete" if not unknown else "Not determinable: " + ", ".join(unknown),
                x.ev.docs.get("SC"), PC if miss else C if not unknown else NV, "Medium",
                "Only a salary-paid confirmation was supplied — no bank statement showing " + ", ".join(miss) + " for each worker."
                if miss else "Complete.")]


@check(115)
def es_readable(x, s):
    out = []
    for d in x.ev.cq_documents():
        if d.get("readable"):
            continue
        out.append(x.F(x.site(), "Machine-readable copy", f"{'Photograph' if d['kind'] == 'image' else 'Scanned PDF'} ({d['pages']} p.)",
                       d["rel"], PC, "Low", f"'{Path_name(d['rel'])}' has no digital text layer — read from the image by DeepSeek; "
                       "supply a clear digital copy."))
    return out or [x.F(x.site(), "Machine-readable copies", "All readable", "contractor submission", C, "None", "All documents have a text layer.")]


def Path_name(rel: str) -> str:
    return rel.rsplit("/", 1)[-1]


@check(116)
def es_pf_amount(x, s): return _same(x, "pf_amount", "PF amount", "High", True)


@check(117, covers=("Payment Confirmed",))
def es_trrn(x, s):
    out = _same(x, "pf_trrn", "TRRN", "High")
    st = x.ev.doc("TRRN").get("status") or x.ev.doc("PFRCPT").get("status")
    ok = bool(st) and bool(re.search(r"confirm|success|realis", str(st), re.I))
    out.append(x.F(x.site(), "TRRN status 'Payment Confirmed'", st or "Status not shown", x.ev.doc_name("TRRN"),
                   C if ok else (NV if not st else NC), "High", "Payment confirmed." if ok else
                   "TRRN status not evidenced." if not st else f"TRRN status is '{st}' — payment not confirmed.", "Payment Confirmed"))
    return out


@check(118)
def es_pf_ee(x, s): return _same(x, "pf_ee_share", "Employee PF share", "High", True)


@check(119)
def es_esi_amount(x, s): return _same(x, "esi_amount", "ESIC contribution", "High", True)


@check(120)
def es_pf_due(x, s): return _due(x, "pf_paid_date", _next_month_day(x, x.p["pf"]["due_day"]), "PF", NC, "High")


@check(121)
def es_esi_due(x, s): return _due(x, "esi_paid_date", _next_month_day(x, x.p["esi"]["due_day"]), "ESIC", NC, "High")


@check(122, covers=("Monthly Wages", "Weekly Wages", "Fortnightly Wages", "Daily Wages"))
def es_wage_due(x, s):
    due = _next_month_day(x, x.p["wages"]["monthly_due_day"])
    out = _due(x, "salary_paid_date", due, "Monthly wages", PC, "High")
    out.append(x.F(x.site(), f"Monthly wages by {fmt_date(due)}", out[0].found, out[0].source, out[0].status, out[0].risk,
                   out[0].observation, "Monthly Wages"))
    period = str(x.ev.doc("WG").get("wage_period") or "")
    monthly = not re.search(r"week|fortnight|daily", period, re.I)
    for kw, lab in (("Weekly Wages", "weekly"), ("Fortnightly Wages", "fortnightly"), ("Daily Wages", "daily")):
        out.append(x.F(x.site(), f"{lab.title()} wage period rule", f"Wage period: {period or 'monthly'}", x.ev.doc_name("WG"),
                       NA if monthly else NV, "Medium", f"Wages are fixed monthly, so the {lab} payment rule does not apply." if monthly
                       else "Non-monthly wage period — apply this rule.", kw))
    return out


@check(123)
def es_child_policy(x, s):
    hits = x.ev.has("CHILD")
    return [x.F(x.site(), "Child Labour Act abstract / policy for display", "Present" if hits else "Not supplied",
                hits[0]["rel"] if hits else "—", C if hits else DNA, "Medium",
                "Supplied (display at the workplace is not evidenced by a document)." if hits else "Not supplied.")]


@check(124)
def es_pf_code(x, s):
    E = x.ev
    codes = {"Allotment letter": E.doc("PFALLOT").get("code"), "PF challan": E.doc("PFCH").get("est_code"),
             "PF ECR": E.doc("PFECR").get("est_code"), "Wage Register": E.doc("WG").get("pf_code")}
    names = {k: v for k, v in {"Allotment letter": E.doc("PFALLOT").get("est_name"), "PF challan": E.doc("PFCH").get("est_name"),
                               "PF ECR": E.doc("PFECR").get("est_name")}.items() if v}
    vals = {re.sub(r"\W", "", str(v)).upper() for v in codes.values() if v}
    nm = {re.sub(r"\W|PVT|PRIVATE|LTD|LIMITED|AND", "", str(v).upper()) for v in names.values()}
    if not vals:
        return [_not_supplied(x, "PF code allotment / challan", "PFALLOT", "High")]
    ok = len(vals) == 1 and len(nm) <= 1 and bool(codes["Allotment letter"])
    return [x.F(x.site(), f"Code {codes['Allotment letter'] or '—'} everywhere; same establishment name",
                "; ".join(f"{k}: {v}" for k, v in codes.items() if v) + (" | names: " + "; ".join(f"{k}: {v}" for k, v in names.items()) if len(nm) > 1 else ""),
                x.ev.docs.get("PFALLOT", "—"), C if ok else PC, "High",
                "PF code and establishment name consistent." if ok else
                "Allotment letter not supplied." if not codes["Allotment letter"] else "Codes or establishment names differ.")]


@check(125)
def es_pf_challan_month(x, s):
    ch = x.ev.doc("PFCH")
    if not ch:
        return [_not_supplied(x, "PF challan", "PFCH", "High")]
    wm = str(ch.get("wage_month", ""))
    d = parse_date("01 " + wm.replace("-", " ")) or parse_date("01-" + wm)
    ok = (d and d.year == x.ev.month_start.year and d.month == x.ev.month_start.month) or x.ev.month_start.strftime("%B %Y").lower() in wm.lower()
    return [x.F(x.site(), f"Challan for {x.ev.month_start:%B %Y}", wm or "—", x.ev.docs.get("PFCH"), C if ok else NC, "High",
                "Challan covers the wage month." if ok else "Challan wage month differs from the audited month.")]


@check(126)
def es_pf_total_wages(x, s):
    a, b = num(x.ev.doc("PFCH").get("total_wages")), num(x.ev.doc("PFECR").get("total_epf_wages"))
    if a is None or b is None:
        return [x.F(x.site(), "Challan total wages = ECR total", f"Challan {money(a)}; ECR {money(b)}", x.ev.doc_name("PFCH"), NV, "High",
                    "One of the totals is not available.")]
    return [x.F(x.site(), f"ECR total EPF wages {money(b)}", f"Challan {money(a)}", x.ev.docs.get("PFCH"), C if abs(a - b) <= x.tol else PC, "High",
                "Agrees." if abs(a - b) <= x.tol else f"Differs by {money(a - b)}.")]


@check(127)
def es_pf_shares(x, s):
    ch = x.ev.doc("PFCH")
    W, n = num(ch.get("total_wages")), int(nz(ch.get("members")) or 1)
    if W is None:
        return [x.F(x.site(), "Challan shares", "Total wages not available", x.ev.doc_name("PFCH"), NV if ch else DNA, "High", "Cannot compute.")]
    p = x.p["pf"]
    rows = [("Employee 12%", p["ee_rate"], num(ch.get("ee_share"))), ("Employer EPS 8.33%", p["er_eps_rate"], num(ch.get("er_eps"))),
            ("Employer EPF 3.67%", p["er_epf_rate"], num(ch.get("er_epf")))]
    rows = [(l, r, v) for l, r, v in rows if v is not None]
    bad = [(l, r * W, v) for l, r, v in rows if abs(r * W - v) > n]  # per-member rounding allowance
    shown = "; ".join(f"{l}: {money(round(r * W, 2))} vs {money(v)}" for l, r, v in rows)
    note = " EPS is computed on wages capped at ₹15,000 per member, so the employer split can differ from 8.33% / 3.67% of total wages." if bad else ""
    return [x.F(x.site(), f"Shares on total wages {money(W)}", shown, x.ev.docs.get("PFCH"), PC if bad else C, "High",
                ("Share(s) outside per-member rounding tolerance." + note) if bad else "Shares correct within per-member rounding.")]


@check(128)
def es_pf_delay(x, s):
    r = es_pf_due(x, s)[0]
    r.expected = "No delay; interest / damages if late"
    return [r]


@check(129)
def es_eps_ceiling(x, s):
    e = x.ev.doc("PFECR")
    ceil = x.p["pf"]["eps_edli_ceiling"]
    eps = num(e.get("max_eps_wages"))
    edli = num(e.get("max_edli_wages"))
    rows = [r for c in x.codes for _, r in x.ev.recs(c, "PFECR")] + x.ev.unmatched.get("PFECR", [])
    eps = eps if eps is not None else max([nz(r.get("eps_wages")) for r in rows] or [0])
    edli = edli if edli is not None else max([nz(r.get("edli_wages")) for r in rows] or [0])
    if not e and not rows:
        return [_not_supplied(x, "PF ECR", "PFECR", "High")]
    ok = eps <= ceil and edli <= ceil
    return [x.F(x.site(), f"EPS & EDLI wages ≤ ₹{ceil:,}", f"Highest EPS {money(eps)}; EDLI {money(edli)}",
                x.ev.docs.get("PFECR"), C if ok else NC, "High", "Within ceiling." if ok else "Ceiling exceeded.")]


@check(130)
def es_esic_code(x, s):
    code = x.ev.doc("ESRCPT").get("employer_code") or x.ev.doc("ESCODE").get("employer_code") or x.ev.doc("ESECR").get("employer_code")
    sub = x.ev.doc("ESCODE").get("subcode")
    letter = x.ev.has("ESCODE")
    ok = len(digits(code)) == 17 and (not sub or len(digits(sub)) == 17) and bool(letter)
    return [x.F(x.site(), "17-digit code & sub-code; registration / coverage letter on file",
                f"Code {code or '—'}; sub-code {sub or '—'} (covered from {x.ev.doc('ESCODE').get('covered_from') or '—'}); "
                f"Wage Register quotes {x.ev.doc('WG').get('esi_code') or '—'}", x.ev.docs.get("ESCODE", "—"),
                C if ok else PC if code else DNA, "High",
                "Valid codes and coverage letter on file." if ok else "Coverage letter not supplied." if not letter else "Code format invalid.")]


@check(131, covers=("Contribution period",))
def es_esic_month(x, s):
    p = str(x.ev.doc("ESRCPT").get("period") or x.ev.doc("ESECR").get("period") or "")
    d = parse_date("01-" + p.replace(" ", "-")) or parse_date("01 " + re.sub(r"(\D)(\d)", r"\1 \2", p))
    ok = (d and (d.year, d.month) == (x.ev.month_start.year, x.ev.month_start.month)) or \
        (x.ev.month_start.strftime("%b").lower() in p.lower() and str(x.ev.month_start.year) in p)
    m = x.ev.month_start.month
    period = f"April–September {x.ev.month_start.year}" if 4 <= m <= 9 else \
        (f"October {x.ev.month_start.year - 1} – March {x.ev.month_start.year}" if m <= 3 else f"October {x.ev.month_start.year} – March {x.ev.month_start.year + 1}")
    return [x.F(x.site(), f"{x.ev.month_start:%b-%Y}", p or "—", x.ev.docs.get("ESRCPT", "—"), C if ok else NC if p else NV, "High",
                "Contribution month = wage month." if ok else "Different month." if p else "Contribution month not shown."),
            x.F(x.site(), "Contribution period identified", period, "ESI Act — contribution periods", C, "None",
                f"{x.ev.month_start:%B %Y} belongs to the contribution period {period}.", "Contribution period")]


@check(132)
def es_esic_er(x, s):
    e = x.ev.doc("ESECR")
    W, er = num(e.get("total_wages")), num(e.get("er_total"))
    if W is None or er is None:
        return [x.F(x.site(), "Employer ESI 3.25%", "Totals not available", x.ev.doc_name("ESECR"), NV if e else DNA, "High", "Cannot compute.")]
    exp = x.p["esi"]["er_rate"] * W
    ok = abs(exp - er) <= max(nz(e.get("ips")), 1)
    return [x.F(x.site(), f"3.25% × {money(W)} = {money(round(exp, 2))}", money(er), x.ev.docs.get("ESECR"),
                C if ok else NC, "High", "Correct." if ok else "Employer ESI short-paid." if er < exp else "Employer ESI over-paid.")]


@check(133, covers=("8 months", "Set-on"))
def es_bonus_time(x, s):
    paid = parse_date(x.ev.doc("BR").get("paid_date"))
    limit = x.p["bonus"]["pay_within_months"]
    if not paid:
        return [x.F(x.site(), f"Within {limit} months", "Payment date not shown", x.ev.doc_name("BR"), NV, "Medium", "Bonus payment date not evidenced.")]
    ok = (paid - x.ev.month_end).days <= limit * 30
    out = [x.F(x.site(), f"Within {limit} months of the period", f"Paid {fmt_date(paid)}", x.ev.docs.get("BR"), C if ok else NC, "Medium",
               "Bonus paid monthly with wages — within the limit." if ok else "Late.")]
    out.append(x.F(x.site(), f"Paid within {limit} months of closing the accounting year", f"Paid {fmt_date(paid)} with monthly wages",
                   x.ev.docs.get("BR"), C if ok else NC, "Medium", "Monthly payment is well within 8 months of year-end." if ok else "Late.", "8 months"))
    so = any(r.get("set_on_off") for c in x.codes for _, r in x.ev.recs(c, "BR"))
    out.append(x.F(x.site(), "Set-on / set-off records maintained", "Recorded" if so else "No set-on / set-off columns", x.ev.doc_name("BR"),
                   C if so else NV, "Low", "Set-on / set-off recorded." if so else
                   "Bonus is paid monthly at a fixed rate; set-on / set-off arises only at year-end — annual register not supplied.", "Set-on"))
    return out


@check(134, covers=("26 January", "Copy sent"))
def es_holidays(x, s):
    h = x.ev.doc("HOL")
    if not h:
        return [_not_supplied(x, "Holiday list", "HOL", "Medium")]
    lst = [i for i in (h.get("list") or []) if isinstance(i, (list, tuple)) and len(i) >= 2]
    dated = [(parse_date(d), n) for d, n in lst[:]]
    have = {d.strftime("%d-%m") for d, _ in dated if d}
    req = x.state.get("mandatory_holidays", [["26-01", "Republic Day"], ["15-08", "Independence Day"], ["02-10", "Gandhi Jayanti"]])
    missing = [n for dm, n in req if dm not in have]
    by_date: dict = {}
    for d, n in dated:
        if d:
            by_date.setdefault(d, []).append(n)
    clash = {d: ns for d, ns in by_date.items() if len(ns) > 1}
    issues = []
    if missing:
        issues.append("missing statutory holiday(s): " + ", ".join(missing))
    for d, ns in clash.items():
        issues.append(f"{' + '.join(ns)} share {fmt_date(d)} — only {len(by_date)} distinct holiday dates")
    if h.get("signed") is False:
        issues.append("not visibly signed by management")
    out = [x.F(x.site(), "Published; all statutory holidays; signed", "; ".join(issues) or f"{len(lst)} holidays, signed",
               x.ev.docs.get("HOL"), PC if issues else C, "Medium", ("Holiday list defects — " + "; ".join(issues) + ".") if issues else "Complete.")]
    out.append(x.F(x.site(), "26 Jan, 15 Aug, 2 Oct and state holidays included", ", ".join(missing) or "All included",
                   x.ev.docs.get("HOL"), PC if missing else C, "Medium", "Missing: " + ", ".join(missing) if missing else "All statutory holidays listed.",
                   "26 January"))
    sent = h.get("sent_to_authority")
    out.append(x.F(x.site(), "Copy sent to the authority where required", "Acknowledged" if sent else "No dispatch / acknowledgement",
                   x.ev.docs.get("HOL"), C if sent else NV, "Low", "Sent." if sent else "No evidence the list was sent to the Inspector.", "Copy sent"))
    return out


@check(135)
def es_lwf_notification(x, s):
    hits = x.ev.has("LWFNOT")
    return [x.F(x.site(), "State LWF notification on file", "Present" if hits else "Not supplied", hits[0]["rel"] if hits else "—",
                C if hits else DNA, "Low", "On file." if hits else "Not supplied.")]


@check(136)
def es_pt_reg(x, s):
    rc, ec = x.ev.has("PTRC"), x.ev.has("PTEC")
    eff = x.ev.doc("PTRC").get("effective")
    ok = bool(rc and ec)
    obs = "PTRC and PTEC certificates on file."
    if eff and parse_date(eff) and parse_date(eff) > x.ev.month_start:
        obs += f" Observation: PTRC effective {eff}, after the start of the wage month whose PT it remits."
    missing = [n for n, h in (("PTRC", rc), ("PTEC", ec)) if not h]
    return [x.F(x.site(), "Valid PTRC and PTEC", f"PTRC {x.ev.doc('PTRC').get('number') or '—'} w.e.f. {eff or '—'}; PTEC {'present' if ec else 'missing'}",
                "; ".join(d["rel"] for d in rc + ec) or "—", C if ok else DNA, "Medium", obs if ok else f"{' and '.join(missing)} not supplied.")]


@check(137, covers=("District Officer", "Internal Committee"))
def es_posh(x, s):
    p = x.ev.doc("POSH")
    if not p:
        return [_not_supplied(x, "POSH annual return", "POSH", "High")]
    ok = bool(p.get("filed_on"))
    out = [x.F(x.site(), "Annual return filed; awareness programmes reported",
               f"Filed {p.get('filed_on') or '—'} for {p.get('period') or '—'}; {p.get('workshops', '—')} awareness programmes; "
               f"{p.get('complaints_received', '—')} complaints", x.ev.docs.get("POSH"), C if ok else PC, "High",
               "Return filed with " + str(p.get("addressed_to") or "the authority") + "." if ok else "Filing date not evidenced.")]
    to = str(p.get("addressed_to") or "") + " " + str(p.get("district") or "")
    site = " ".join(str(x.ev.meta.get(k) or "") for k in ("site", "site_short", "state_name"))
    site_words = {w for w in re.findall(r"[a-z]{4,}", site.lower())} - {"road", "highway", "india", "near", "plot"}
    same_place = bool(site_words & set(re.findall(r"[a-z]{4,}", to.lower())))
    period_end = parse_date(str(p.get("period", "")).split("to")[-1]) if "to" in str(p.get("period", "")) else None
    filed = parse_date(p.get("filed_on"))
    due = date(period_end.year + 1, 1, 31) if period_end else None
    late = bool(filed and due and filed > due)
    out.append(x.F(x.site(), "Annual report to the District Officer of the work-site district by the due date",
                   f"Addressed to: {p.get('addressed_to') or '—'}; filed {fmt_date(filed)}" + (f" (due {fmt_date(due)})" if due else ""),
                   x.ev.docs.get("POSH"), PC if (not same_place or late) else C, "Medium",
                   ("Return is addressed to an authority outside the work-site district; confirm filing with the site's District Officer."
                    if not same_place else "") + (" Filed after the due date." if late else "") or "Filed with the site district on time.",
                   "District Officer"))
    hc = x.headcount
    ic = p.get("ic_constituted")
    out.append(x.F(x.site(), f"Internal Committee where ≥ 10 employees (headcount {hc})",
                   "IC stated in return" if ic else "IC constitution not evidenced", x.ev.doc_name("POSHPOL") if x.ev.has("POSHPOL") else x.ev.docs.get("POSH"),
                   NA if hc < 10 else (C if ic or x.ev.has("POSHPOL") else DNA), "High",
                   "Fewer than 10 employees." if hc < 10 else "IC evidenced." if (ic or x.ev.has("POSHPOL")) else
                   "IC constitution order not supplied (see P-202).", "Internal Committee"))
    return out


# =========================================================================== Not Possible sheet
NP_PROBES = {  # rulebook area -> doc types whose arrival would make the item auditable
    "A01": ("AGREEMENT",), "A02": ("PO",), "A04": ("FORM14",), "A05": ("LICENCE",), "A06": ("LICREN",), "A12": ("PAYSLIP",),
    "A23": ("IWR",), "A27": ("ECPOL",), "A28": ("LWFCH",), "A29": ("PTRET",), "A30": ("POSHPOL",), "A11": ("AGREEMENT", "MWN"),
    "A14": ("DED",), "A15": ("ADV",), "A16": ("OT",), "A17": ("FINE",),
}
MANDATORY_AREAS = {"A01", "A02", "A05", "A06", "A27", "A30"}


def not_possible(x: Ctx, spec: CheckSpec) -> list[Finding]:
    reason = spec.remarks
    low = reason.lower()
    area = spec.area_code
    site = x.site()
    if "reporting action" in low:
        return [x.F(site, spec.item, "Performed by this agent", "This report", NA, "None",
                    "Reporting step — the agent records every observation with its evidence reference in this report and the findings workbook.")]
    if "not applicable" in low:
        return [x.F(site, spec.item, "Not applicable", "—", NA, "None", reason)]
    types = NP_PROBES.get(area, ())
    if area in ("A14", "A15", "A16", "A17"):
        reg = x.ev.doc(types[0]) if types else {}
        if reg and reg.get("nil") is not False:
            return [x.F(site, spec.item, f"Nil register: '{reg.get('entries', '')}'", x.ev.doc_name(types[0]), NA, "None",
                        "The register records no entries for the month — nothing to verify.")]
        if reg:
            return [x.F(site, spec.item, "Register has entries", x.ev.doc_name(types[0]), NV, "Medium",
                        "Entries now present — this item has become auditable; route to review.")]
    if "portal" in low:
        return [x.F(site, spec.item, "Live portal lookup required", "EPFO / ESIC portal", NAU, "Low", reason + " Route to the portal-verification step.")]
    if re.search(r"site photograph|inspection|site deployment|actual deployment|geo-?tag|site visit", low):
        return [x.F(site, spec.item, "Site evidence required", "Site visit", NAU, "Low", reason)]
    if re.search(r"pe gate|biometric|ehs|all vendors|integration|pe designation|incident data", low):
        return [x.F(site, spec.item, "Principal-employer data feed required", "BSS integration", NAU, "Low", reason)]
    if re.search(r"blank|no .*column|opening balances", low):
        return [x.F(site, spec.item, "Field blank / not recorded", "Register", NV, "Low", reason)]
    hits = x.ev.has(*types) if types else []
    if hits:
        return [x.F(site, spec.item, "Document now present: " + "; ".join(h["rel"] for h in hits), "; ".join(h["rel"] for h in hits),
                    NV, "Medium", "Evidence that was missing at scoping is now in the submission — this item is audited by DeepSeek from it.")]
    if "international" in low or area == "A23":
        return [x.F(site, spec.item, "No international worker", "Form-11", NA, "None", reason)]
    return [x.F(site, spec.item, "Not supplied", f"contractor submission (re-probed {len(x.ev.cq_documents())} files)", DNA,
                "High" if area in MANDATORY_AREAS else "Medium", reason)]
