"""Fast password hasher for the BSS demo.

PBKDF2 at 10k iterations (~20-40ms per check) instead of Django's default
1M iterations (~1.4s per login). Demo-only — raise iterations in production.
"""
from django.contrib.auth.hashers import PBKDF2PasswordHasher


class FastPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    algorithm = "bss_pbkdf2_sha256"
    iterations = 10000