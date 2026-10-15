"""Globally-unique BSS identifier allocation for the whole system.

BSS IDs must be *globally* unique across every entity type because they are
matched by exact string equality (worker / contractor / employer / site share
one namespace).

Generation strategy — **sequential but masked**:

    1. A single-row counter (``BssIdSequence``) hands out an increasing integer
       per allocation. Distinct sequence numbers can never collide.
    2. The integer is run through a reversible *affine* mask modulo 32**11
       (``value = seq * A + B mod 32**11``). Because ``A`` is odd it is coprime
       with 32**11, so the map is a bijection — no two sequence numbers produce
       the same suffix — while the output looks completely random to users.
    3. The masked value is written in the 32-char ``ID_ALPHABET`` as exactly 11
       characters, giving the familiar ``BSS-<ROLE> + 11 chars`` format.

A uniqueness pre-check against the live tables remains as a safety net against
the astronomically unlikely clash with a legacy random ID.

Charset: uppercase A-Z, 2-9. ``I``, ``O``, ``0`` and ``1`` are excluded because
they look identical to other chars on scanned cards / readable codes.
"""

import re

from django.db import transaction

try:
    from bss_core.models import (
        BssIdSequence,
        ContractorProfile,
        EmployerProfile,
        Site,
        WorkerIdentity,
    )
except Exception:  # pragma: no cover - never hit under Django run
    ContractorProfile = EmployerProfile = WorkerIdentity = Site = BssIdSequence = None

ROLE_PREFIX = {
    "worker": "BSSW",
    "contractor": "BSSC",
    "employer": "BSSE",
    "site": "BSSS",
}
_ROLE_LETTER = {"worker": "W", "contractor": "C", "employer": "E", "site": "S"}

ID_SUFFIX_LENGTH = 11
ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 chars, no I/O/0/1/ambiguous
ID_ALPHABET_SET = frozenset(ID_ALPHABET)

# 32**11 keyspace. The affine map below is a bijection over it.
_MOD = len(ID_ALPHABET) ** ID_SUFFIX_LENGTH
_A = 0x2545F4914F6CDD1D % _MOD
if _A % 2 == 0:  # must be odd (coprime with 2**50) for the map to be a bijection
    _A += 1
_B = 0x9E3779B97F4A7C15 % _MOD


def _mask(seq: int) -> str:
    """Reversible affine mask: scramble a sequence number into an 11-char code."""
    value = (seq * _A + _B) % _MOD
    chars = []
    for _ in range(ID_SUFFIX_LENGTH):
        value, remainder = divmod(value, len(ID_ALPHABET))
        chars.append(ID_ALPHABET[remainder])
    return "".join(reversed(chars))


def _next_seq() -> int:
    """Atomically reserve the next sequence number (row-locked)."""
    with transaction.atomic():
        row, _ = BssIdSequence.objects.select_for_update().get_or_create(id=1)
        row.value += 1
        row.save(update_fields=["value"])
        return row.value


def _identifier_taken(candidate, *, exclude_ids=()):
    """True when the candidate already belongs to a worker/contractor/employer/site."""
    if WorkerIdentity.objects.filter(bss_worker_id=candidate).exclude(id__in=exclude_ids).exists():
        return True
    if ContractorProfile.objects.filter(contractor_code=candidate).exclude(id__in=exclude_ids).exists():
        return True
    if EmployerProfile.objects.filter(employer_code=candidate).exclude(id__in=exclude_ids).exists():
        return True
    if Site.objects.filter(bss_site_id=candidate).exclude(id__in=exclude_ids).exists():
        return True
    return False


def _allocate(prefix, *, exclude_ids=()):
    """Return a globally-unique masked BSS identifier for the given role prefix."""
    for _ in range(50):
        candidate = f"{prefix}{_mask(_next_seq())}"
        if not _identifier_taken(candidate, exclude_ids=exclude_ids):
            return candidate
    raise RuntimeError("Unable to allocate a unique BSS identifier.")


# Any recognised BSS identifier: optional ``BSS-`` / ``BSS`` prefix, the role
# letter, then the alphanumeric suffix. New IDs have no hyphen (BSSW…); legacy
# ones keep it (BSS-W…) and remain valid.
_BSS_STYLE_RE = re.compile(r"^BSS-?[WCES][A-Z0-9]{9,12}$")


def is_bss_style_id(value) -> bool:
    """True when *value* looks like a BSS identifier at all.

    This is the safe test for "does this row need migrating?": only values that
    are not BSS-style (e.g. a legacy ``V-100234`` contractor code) should ever
    be re-issued. Use :func:`is_canonical_id` to report format drift, never as
    a reason to rewrite a working ID.
    """
    return bool(_BSS_STYLE_RE.match((value or "").strip()))


def is_canonical_id(value, role: str | None = None) -> bool:
    """True when *value* is a well-formed masked BSS identifier.

    Accepts both the current hyphen-less form (``BSSW…``) and the legacy
    hyphenated form (``BSS-W…``). ``role`` narrows the accepted letter
    ("worker"/"contractor"/"employer"/"site"); omit it to accept any role.
    Used to spot legacy pre-BSS codes (e.g. ``V-100234``) that predate this
    allocator.
    """
    text = (value or "").strip()
    match = re.match(r"^BSS-?([WCES])([A-Z0-9]+)$", text)
    if not match:
        return False
    letter, suffix = match.group(1), match.group(2)
    if len(suffix) != ID_SUFFIX_LENGTH or not set(suffix) <= ID_ALPHABET_SET:
        return False
    if role and _ROLE_LETTER.get(role) != letter:
        return False
    return True


def new_bss_worker_id():
    """Random-looking 16-char worker identifier, e.g. BSS-W7KQ2M9X4RTPA."""
    return _allocate(ROLE_PREFIX["worker"])


def new_bss_contractor_code():
    """Random-looking 16-char contractor identifier, e.g. BSS-C3HJ8NPQ6VWA."""
    return _allocate(ROLE_PREFIX["contractor"])


def new_bss_employer_code():
    """Random-looking 16-char employer identifier, e.g. BSS-E9F2C7YTR4A."""
    return _allocate(ROLE_PREFIX["employer"])


def new_bss_site_code():
    """Random-looking 16-char site identifier, e.g. BSS-S6YQ2M9X4RTA."""
    return _allocate(ROLE_PREFIX["site"])


# Letter reference prefixes: A = appointment letter, R = releasing (experience).
LETTER_PREFIX = {"appointment": "A", "experience": "R", "card": "C"}


def letter_bss_id(binding_id, letter_type):
    """A stable ``BSS-A`` / ``BSS-R`` + 11-character reference for a letter.

    Derived from the binding id through the same reversible mask every entity
    id uses, so the appointment and releasing letters for one binding share an
    11-character suffix and re-rendering never changes the printed reference.
    """
    letter = LETTER_PREFIX.get(letter_type, "R")
    return f"BSS{letter}{_mask(int(binding_id))}"
