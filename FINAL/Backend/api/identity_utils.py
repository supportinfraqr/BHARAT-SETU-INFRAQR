"""Shared identity helpers (name matching for cross-document verification)."""

import re


def names_match(a, b) -> bool:
    """True when two names look like the same person.

    Tolerant of case, punctuation, extra/missing tokens (middle names) and OCR
    spacing (e.g. 'Vishal Varshney' ~ 'VISHALVARSHNEY').
    """
    def squash(value):
        return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

    def tokens(value):
        return {t for t in re.sub(r"[^a-z0-9 ]", " ", str(value or "").lower()).split() if t}

    sa, sb = squash(a), squash(b)
    if not sa or not sb:
        return False
    if sa == sb:
        return True
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    short, long = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return short.issubset(long)
