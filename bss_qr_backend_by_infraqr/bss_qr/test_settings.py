"""Test settings: SQLite in-memory + stub channels. Import production settings
and override only what's needed for automated tests."""
from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "TEST": {"NAME": ":memory:"},
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.db"

BSS_SMS_PROVIDER = "stub"
BSS_IVR_PROVIDER = "stub"
BSS_VOICE_PROVIDER = "stub"

QR_ENCRYPTION_KEY = "test-qr-key-for-automated-tests"