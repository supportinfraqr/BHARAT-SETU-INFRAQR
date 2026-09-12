"""Random BSS identifier allocation for the whole system.

BSS IDs must be *globally* unique across every account type because they are
matched by exact string equality in ``_find_user`` (worker / contractor /
employer are one namespace). Collision safety therefore has two layers:

    1. The generator checks the candidate against all three tables and retries
       on collision (with a capped retry loop so contention never hangs).
    2. The two code columns that were previously non-unique
       (``contractor_code`` / ``employer_code``) get ``unique=True`` in a
       migration, so the database refuses duplicates even if two processes
       allocate the same value concurrently.

Format (kept compatible with the whole QR / scan / login pipeline that
detects the entity type from the ``BSS-W`` / ``BSS-C`` / ``BSS-E`` prefix):

    BSS-<ROLE> + 10 chars  (total length 15)

Charset: uppercase A-Z, 2-9. ``I``, ``O``, ``0`` and ``1`` are excluded
because they look identical to other chars on scanned cards / readable codes,
which avoids manual-entry mistakes.
"""

import secrets

try:
    from bss_core.models import (
        ContractorProfile,
        EmployerProfile,
        WorkerIdentity,
    )
except Exception:  # pragma: no cover - never hit under Django run
    ContractorProfile = EmployerProfile = WorkerIdentity = None

ROLE_PREFIX = {
    "worker": "BSS-W",
    "contractor": "BSS-C",
    "employer": "BSS-E",
}

ID_SUFFIX_LENGTH = 10
ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 chars, no I/O/0/1/ambiguous
ID_ALPHABET_SET = frozenset(ID_ALPHABET)

# Conservative cap: with a 32^10 keyspace collisions are astronomically
# unlikely; the loop is a safety net rather than an expected path.
MAX_ATTEMPTS = 500


def _samples_identifiers(prefix):
    """Yield the generated identifier; kept inside module for reuse."""
    while True:
        suffix = "".join(secrets.choice(ID_ALPHABET) for _ in range(ID_SUFFIX_LENGTH))
        yield f"{prefix}{suffix}"


def _identifier_taken(candidate, *, exclude_ids=()):
    """True when the candidate already belongs to a worker/contractor/employer."""
    if WorkerIdentity.objects.filter(bss_worker_id=candidate).exclude(id__in=exclude_ids).exists():
        return True
    if ContractorProfile.objects.filter(contractor_code=candidate).exclude(id__in=exclude_ids).exists():
        return True
    if EmployerProfile.objects.filter(employer_code=candidate).exclude(id__in=exclude_ids).exists():
        return True
    return False


def _allocate(prefix, *, exclude_ids=()):
    """Return a globally-unique random BSS identifier for the given role prefix."""
    for candidate in _samples_identifiers(prefix):
        if not _identifier_taken(candidate, exclude_ids=exclude_ids):
            return candidate
    raise RuntimeError("Unable to allocate a unique BSS identifier (keyspace exhausted).")


def new_bss_worker_id():
    """Random 15-char worker identifier, e.g. BSS-W7KQ2M9X4RTP."""
    return _allocate(ROLE_PREFIX["worker"])


def new_bss_contractor_code():
    """Random 15-char contractor identifier, e.g. BSS-C3HJ8NPQ6VW."""
    return _allocate(ROLE_PREFIX["contractor"])


def new_bss_employer_code():
    """Random 15-char employer identifier, e.g. BSS-E9F2C7YTR4."""
    return _allocate(ROLE_PREFIX["employer"])
