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


def verified_aadhaar(user):
    """The actual Aadhaar details fetched via the oKYC OTP flow.

    Returns ``{'aadhaar', 'name', 'dob'}`` from the newest VERIFIED
    ``AadhaarChallenge`` for the user (preferring the record whose Aadhaar
    number matches the worker's linked Aadhaar), falling back to the stored
    ``WorkerIdentity`` when no challenge is on file.
    """
    from bss_core.models import AadhaarChallenge, WorkerIdentity

    if user is None:
        return None
    identity = WorkerIdentity.objects.filter(user=user).first()
    challenges = (AadhaarChallenge.objects
                  .filter(user=user, status="VERIFIED")
                  .order_by("-updated_at"))
    record = None
    if identity and identity.aadhaar:
        record = challenges.filter(aadhaar_number=identity.aadhaar).first()
    if record is None:
        record = challenges.first()
    if record is not None:
        return {
            "aadhaar": (record.aadhaar_number or "").strip(),
            "name": (record.name or "").strip(),
            "dob": (record.date_of_birth or "").strip(),
        }
    if identity is not None:
        return {
            "aadhaar": (identity.aadhaar or "").strip(),
            "name": (identity.name or "").strip(),
            "dob": identity.date_of_birth.isoformat() if identity.date_of_birth else "",
        }
    return None
