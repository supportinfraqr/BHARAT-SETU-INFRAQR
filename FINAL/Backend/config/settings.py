"""
Django settings for the Bharat Shram Setu (BSS) Backend.

Runs against the FINAL/Db PostgreSQL schema hosted behind the BSS pgpool
(bss-pgpool on 5432) / backend Postgres instances. Connection settings are
env-driven (BSS_PG_*) with sensible defaults for the BSS pool.
"""

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def env_required(name: str) -> str:
    """Return an env var value or fail fast; secrets must never be defaulted in code."""
    value = os.environ.get(name)
    if not value:
        raise ImproperlyConfigured(f"Missing required environment variable: {name}")
    return value


SECRET_KEY = env_required("BSS_SECRET_KEY")

DEBUG = env_bool("BSS_DEBUG", True)

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("BSS_ALLOWED_HOSTS", "*").split(",") if h.strip()]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    # local apps
    "bss_core",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ---------------------------------------------------------------------------
# Database — PostgreSQL only (FINAL/Db schema).
# Defaults to the BSS pool (bss-pgpool on 5432) fronting the Postgres backend
# instances, using the bss role. Override via env for other hosts/DBs.
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("BSS_PG_DB", "bss_final"),
        "USER": os.environ.get("BSS_PG_USER", "bss"),
        "PASSWORD": env_required("BSS_PG_PASSWORD"),
        "HOST": os.environ.get("BSS_PG_HOST", "127.0.0.1"),
        "PORT": os.environ.get("BSS_PG_PORT", "5432"),
        "CONN_MAX_AGE": int(os.environ.get("BSS_PG_CONN_MAX_AGE", "60")),
        "OPTIONS": {"connect_timeout": int(os.environ.get("BSS_PG_CONNECT_TIMEOUT", "5"))},
    }
}


# ---------------------------------------------------------------------------
# Redis cache + sessions (BSS_REDIS_URL; falls back to local-memory when unset)
# ---------------------------------------------------------------------------
REDIS_URL = os.environ.get("BSS_REDIS_URL") or ""
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "bss",
            "TIMEOUT": int(os.environ.get("BSS_CACHE_TIMEOUT_SEC", "300")),
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "bss-local",
            "KEY_PREFIX": "bss",
        }
    }


# ---------------------------------------------------------------------------
# Authentication — custom role-based User model + JWT
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "bss_core.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("BSS_JWT_ACCESS_MIN", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("BSS_JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# CORS (for the mobile/React/Vue frontend)
CORS_ALLOW_ALL_ORIGINS = env_bool("BSS_CORS_ALLOW_ALL", True)
CORS_ALLOW_CREDENTIALS = True


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("BSS_TIME_ZONE", "Asia/Kolkata")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = os.environ.get("BSS_STATIC_ROOT", str(BASE_DIR / "staticfiles"))

MEDIA_URL = "/media/"
MEDIA_ROOT = os.environ.get("BSS_MEDIA_ROOT", str(BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ---------------------------------------------------------------------------
# DigiLocker OAuth2 (backend-only). Credentials come from env only.
# ---------------------------------------------------------------------------
DIGILOCKER_CLIENT_ID = env_required("DIGILOCKER_CLIENT_ID")
DIGILOCKER_CLIENT_SECRET = env_required("DIGILOCKER_CLIENT_SECRET")
DIGILOCKER_REDIRECT_URI = os.environ.get(
    "DIGILOCKER_REDIRECT_URI", "http://localhost:8000/api/digilocker/callback/")
DIGILOCKER_AUTHORIZE_URL = os.environ.get(
    "DIGILOCKER_AUTHORIZE_URL", "https://digilocker.meripehchaan.gov.in/public/oauth2/2/authorize")
DIGILOCKER_TOKEN_URL = os.environ.get(
    "DIGILOCKER_TOKEN_URL", "https://digilocker.meripehchaan.gov.in/public/oauth2/2/token")
DIGILOCKER_USER_URL = os.environ.get(
    "DIGILOCKER_USER_URL", "https://digilocker.meripehchaan.gov.in/public/oauth2/1/user")
DIGILOCKER_ISSUED_DOCS_URL = os.environ.get(
    "DIGILOCKER_ISSUED_DOCS_URL",
    "https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/issued")
DIGILOCKER_UPLOADED_DOCS_URL = os.environ.get(
    "DIGILOCKER_UPLOADED_DOCS_URL",
    "https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/uploaded")
DIGILOCKER_EAADHAAR_URL = os.environ.get(
    "DIGILOCKER_EAADHAAR_URL",
    "https://digilocker.meripehchaan.gov.in/public/oauth2/3/xml/eaadhaar")
DIGILOCKER_FILE_URL = os.environ.get(
    "DIGILOCKER_FILE_URL", "https://digilocker.meripehchaan.gov.in/public/oauth2/1/file/")
# "aadhaar", "pan", "mobile", "user_alias", "email", "digilockerid"
# DigiLocker accepts a SINGLE acr value: "aadhaar", "pan" or "driving_licence".
# A list made DigiLocker fall back to the first token (pan); default to Aadhaar.
DIGILOCKER_ACR = os.environ.get("DIGILOCKER_ACR", "aadhaar")
DIGILOCKER_AMR = os.environ.get("DIGILOCKER_AMR", "aadhaar")
DIGILOCKER_SCOPE = os.environ.get(
    "DIGILOCKER_SCOPE", "files.issueddocs+userdetails+address+picture+avs")
# The app only has "files.issueddocs" approval today, so uploaded/e-Aadhaar
# pulls are off by default (opt-in via env once the portal grants them).
DIGILOCKER_FETCH_UPLOADED = os.environ.get(
    "DIGILOCKER_FETCH_UPLOADED", "false").strip().lower() in ("1", "true", "yes")
DIGILOCKER_FETCH_EADHAAR = os.environ.get(
    "DIGILOCKER_FETCH_EADHAAR", "false").strip().lower() in ("1", "true", "yes")
DIGILOCKER_SESSION_TTL_MIN = int(os.environ.get("DIGILOCKER_SESSION_TTL_MIN", "10"))
DIGILOCKER_DOC_DIR = os.environ.get("DIGILOCKER_DOC_DIR", str(BASE_DIR / "media/digilocker"))


# ---------------------------------------------------------------------------
# DigiLocker EntityLocker OAuth2 (backend-only). Business/entity verification
# via the Meri Pehchaan Entity Locker (GSTIN / CIN / Udyam / PAN). One app per
# role (separate client id/secret registered in the portal). Credentials come
# from env only (BSS_ENTITYLOCKER_*); the legacy un-suffixed keys are the
# contractor fallback.
# ---------------------------------------------------------------------------
def _el_app(role):
    prefix = f"BSS_ENTITYLOCKER_{role.upper()}_"
    fallback = "BSS_ENTITYLOCKER_" if role == "contractor" else "BSS_ENTITYLOCKER_NONE_"
    return {
        "client_id": os.environ.get(prefix + "CLIENT_ID", os.environ.get(fallback + "CLIENT_ID", "")),
        "client_secret": os.environ.get(prefix + "CLIENT_SECRET", os.environ.get(fallback + "CLIENT_SECRET", "")),
        "redirect_uri": os.environ.get(prefix + "REDIRECT_URI", os.environ.get(
            fallback + "REDIRECT_URI", "https://login.bharatshramsetu.com/Return/EntityLocker")),
    }


ENTITYLOCKER_APPS = {
    "contractor": _el_app("contractor"),
    "employer": _el_app("employer"),
}
ENTITYLOCKER_AUTHORIZE_URL = os.environ.get(
    "BSS_ENTITYLOCKER_AUTHORIZE_URL",
    "https://entity.digilocker.gov.in/public/oauth2/1/authorize")
ENTITYLOCKER_TOKEN_URL = os.environ.get(
    "BSS_ENTITYLOCKER_TOKEN_URL",
    "https://entity.digilocker.gov.in/public/oauth2/1/token")
ENTITYLOCKER_ENTITY_URL = os.environ.get(
    "BSS_ENTITYLOCKER_ENTITY_URL",
    "https://entity.digilocker.gov.in/public/oauth2/1/entity")
ENTITYLOCKER_USER_URL = os.environ.get(
    "BSS_ENTITYLOCKER_USER_URL",
    "https://entity.digilocker.gov.in/public/oauth2/1/user")
ENTITYLOCKER_SCOPE = os.environ.get(
    "BSS_ENTITYLOCKER_SCOPE", "entitydetails")
ENTITYLOCKER_PURPOSE = os.environ.get("BSS_ENTITYLOCKER_PURPOSE", "verification")
ENTITYLOCKER_SESSION_TTL_MIN = int(os.environ.get("BSS_ENTITYLOCKER_SESSION_TTL_MIN", "15"))


# ---------------------------------------------------------------------------
# Aadhaar oKYC (Sandbox.co.in, backend-only). Ported from the EesassinErp
# integration; credentials come from BSS_AADHAAR_* env vars (.env / compose).
# NEVER commit real keys.
# ---------------------------------------------------------------------------
AADHAAR_BASE_URL = os.environ.get("BSS_AADHAAR_BASE_URL", "https://api.sandbox.co.in")
OCR_URL = os.environ.get("BSS_OCR_URL", "http://13.202.27.216:8080/ocr")
AADHAAR_API_KEY = os.environ.get("BSS_AADHAAR_API_KEY", "")
AADHAAR_API_SECRET = os.environ.get("BSS_AADHAAR_API_SECRET", "")
AADHAAR_API_VERSION = os.environ.get("BSS_AADHAAR_API_VERSION", "1.0")
AADHAAR_OTP_TTL_MIN = int(os.environ.get("BSS_AADHAAR_OTP_TTL_MIN", "10"))
# Per-Aadhaar OTP policy (persisted in AadhaarChallenge, so a refresh or
# logout/login cannot bypass it):
#   * one OTP request per AADHAAR_RESEND_GAP_SEC (60s);
#   * at most AADHAAR_MAX_RESENDS (3) resends after the first, then a
#     AADHAAR_LOCK_SEC (10 min) gap;
#   * AADHAAR_MAX_ATTEMPTS (3) verify attempts, one per OTP.
AADHAAR_RESEND_GAP_SEC = int(os.environ.get("BSS_AADHAAR_RESEND_GAP_SEC", "60"))
AADHAAR_MAX_RESENDS = int(os.environ.get("BSS_AADHAAR_MAX_RESENDS", "3"))
AADHAAR_LOCK_SEC = int(os.environ.get("BSS_AADHAAR_LOCK_SEC", "600"))
# Account-wide guardrails (Redis-backed, shared by every gunicorn worker):
#   * at most AADHAAR_PROVIDER_RPS OTP sends per second app-wide — a burst
#     back-pressures with a short "try again" instead of a 429 storm;
#   * after a provider 429, a short escalating backoff (capped at 5 min) instead
#     of locking every user out for 15–60 minutes.
AADHAAR_PROVIDER_RPS = int(os.environ.get("BSS_AADHAAR_PROVIDER_RPS", "3"))
AADHAAR_GLOBAL_BACKOFF_SEC = int(os.environ.get("BSS_AADHAAR_GLOBAL_BACKOFF_SEC", "20"))
AADHAAR_GLOBAL_COOLDOWN_SEC = int(os.environ.get("BSS_AADHAAR_GLOBAL_COOLDOWN_SEC", "900"))
AADHAAR_MIN_INTERVAL_SEC = int(os.environ.get("BSS_AADHAAR_MIN_INTERVAL_SEC", "45"))
AADHAAR_MAX_ATTEMPTS = int(os.environ.get("BSS_AADHAAR_MAX_ATTEMPTS", "3"))
# DEMO/testing only: when true, Aadhaar oKYC send/verify are simulated locally
# (no Sandbox call, no wallet charge) so the flow works without a funded
# provider account. NEVER enable for real identity verification in production.
AADHAAR_MOCK = os.environ.get("BSS_AADHAAR_MOCK", "").strip().lower() in ("1", "true", "yes", "on")
AADHAAR_PHOTO_DIR = os.environ.get("BSS_AADHAAR_PHOTO_DIR", str(BASE_DIR / "media/aadhaar"))
