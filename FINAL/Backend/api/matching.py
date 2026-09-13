"""Fuzzy Rozgar matching — score a worker against a job posting (0-100).

Pure stdlib (token/Jaccard + difflib.SequenceMatcher), so there is no extra
dependency and the result is explainable. The score is a weighted blend:

    skills 40 · trade 15 · location 20 · experience 15 · wage 10

Missing data is treated neutrally (it neither rewards nor heavily penalises), so
a sparse profile still gets a sensible number instead of a hard 0.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher

WEIGHTS = {"skills": 40, "trade": 15, "location": 20, "experience": 15, "wage": 10}
NEUTRAL = 0.6


def _tokens(text):
    return [t for t in re.split(r"[^a-z0-9]+", str(text or "").lower()) if t]


def _ratio(a, b):
    a, b = str(a or "").lower().strip(), str(b or "").lower().strip()
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def _skill_similarity(needle, candidates):
    """Best fuzzy similarity (0-1) of one skill against a list of skill strings.

    Exact match -> 1.0; token subset (e.g. "rebar" ⊂ "bar bending (rebar)") -> 0.9;
    otherwise the better of token Jaccard and character-sequence ratio. This is
    what lets a free-text custom skill match a listed one (and vice-versa)."""
    needle = str(needle or "").lower().strip()
    if not needle:
        return 0.0
    n = set(_tokens(needle))
    best = 0.0
    for cand in candidates:
        c = str(cand or "").lower().strip()
        if not c:
            continue
        if needle == c:
            return 1.0
        ct = set(_tokens(cand))
        if n and ct and (n <= ct or ct <= n):
            best = max(best, 0.9)
            continue
        union = n | ct
        jaccard = len(n & ct) / len(union) if union else 0.0
        best = max(best, max(jaccard, _ratio(needle, c)))
    return best


def _year_values(text):
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", str(text or ""))]


def _range_fit(value, low, high):
    """1.0 inside [low, high]; decays linearly outside; None when unknown."""
    if value is None or low is None:
        return None
    high = low if high is None else high
    if low <= value <= high:
        return 1.0
    span = max(1.0, high - low)
    distance = (low - value) if value < low else (value - high)
    return max(0.0, 1.0 - distance / (span + 2.0))


def worker_profile(user):
    """Matching-relevant fields for a worker, extracted defensively (missing
    related rows must never raise — a half-filled profile still matches).

    Self-declared skills live on WorkerSkill (name + experience_years, written by
    the Profile → Skills tab); primary/secondary skill live on
    WorkerSkillsEmployability. We blend all of them so whatever the worker typed
    on the Skills tab feeds the match."""
    skill_rows = list(user.worker_skills.all()) if hasattr(user, "worker_skills") else []
    skills = [str(getattr(s, "name", "") or "").strip() for s in skill_rows]
    sk = getattr(user, "skills", None)
    primary = str(getattr(sk, "primary_skill", "") or "")
    secondary = str(getattr(sk, "secondary_skills", "") or "")
    skills += [primary] + [part.strip() for part in secondary.split(",")]
    skills = [s for s in skills if s]

    addr = getattr(user, "worker_address", None)
    state = str(getattr(addr, "current_state", "") or getattr(addr, "permanent_state", "") or "")
    city = str(getattr(addr, "current_city", "") or getattr(addr, "permanent_city", "") or "")

    cls = getattr(user, "classification", None)
    occupation = str(getattr(cls, "occupation", "") or "") if cls else ""
    designation = ""
    if hasattr(user, "employments"):
        first = user.employments.first()
        designation = str(getattr(first, "designation", "") or "")
    # Trade: explicit primary skill, else the most-experienced self-declared
    # skill, else the classification occupation / current designation.
    trade = primary
    if not trade and skill_rows:
        ranked = sorted(skill_rows, key=lambda s: (max(_year_values(getattr(s, "experience_years", "")) or [0])), reverse=True)
        trade = str(getattr(ranked[0], "name", "") or "").strip()
    trade = trade or occupation or designation

    # Experience: the best (largest) number the worker has stated anywhere.
    years_pool = []
    for s in skill_rows:
        years_pool += _year_values(getattr(s, "experience_years", "") or "")
    if sk:
        years_pool += _year_values(getattr(sk, "skill_experience_years", "") or "")
    if cls:
        years_pool += _year_values(getattr(cls, "total_worker_experience", "") or "")
    years = max(years_pool) if years_pool else None

    return {"skills": skills, "state": state, "city": city, "trade": trade, "years": years}


def _wage_fit(worker, job):
    """Compare the job's offered wage with the worker's latest recorded wage
    (a proxy for expectation). Neutral when either side is unknown."""
    try:
        from bss_core.models import WorkerWages
        latest = WorkerWages.objects.filter(worker=worker).order_by("-period_end").first()
        actual = float(getattr(latest, "gross_wage", 0) or 0) if latest else 0.0
        offered = float(getattr(job, "wage_offered", 0) or 0)
        if actual <= 0 or offered <= 0:
            return NEUTRAL
        return max(0.0, 1.0 - abs(offered - actual) / max(actual, offered))
    except Exception:
        return NEUTRAL


def score(worker, job, profile=None):
    """0-100 fuzzy match of a worker against a ContractorJob."""
    if job is None:
        return 0
    profile = profile or worker_profile(worker)
    ws = profile["skills"]
    job_skills = [str(s).strip() for s in (job.skills or []) if str(s).strip()]

    # Skills (40): average best-match of each required skill against the worker's.
    if job_skills and ws:
        skills = sum(_skill_similarity(js, ws) for js in job_skills) / len(job_skills)
    elif not job_skills:
        skills = NEUTRAL
    else:
        skills = 0.25

    # Trade (15)
    trade = _ratio(profile["trade"], job.trade) if profile["trade"] and job.trade else NEUTRAL

    # Location (20): state (60%) + city (40%)
    state_match = _ratio(profile["state"], job.state) if profile["state"] and job.state else 0.5
    city_match = _ratio(profile["city"], job.city) if profile["city"] and job.city else 0.5
    location = state_match * 0.6 + city_match * 0.4

    # Experience (15): worker's years vs the job's required range (e.g. "2-8 years")
    jy = _year_values(job.experience)
    exp_fit = _range_fit(profile["years"], min(jy) if jy else None, max(jy) if jy else None)
    experience = NEUTRAL if exp_fit is None else exp_fit

    wage = _wage_fit(worker, job)

    total = (
        skills * WEIGHTS["skills"]
        + trade * WEIGHTS["trade"]
        + location * WEIGHTS["location"]
        + experience * WEIGHTS["experience"]
        + wage * WEIGHTS["wage"]
    )
    return max(0, min(100, round(total)))
