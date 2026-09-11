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
DIGILOCKER_FILE_URL = os.environ.get(
    "DIGILOCKER_FILE_URL", "https://digilocker.meripehchaan.gov.in/public/oauth2/1/file/")
# "aadhaar", "pan", "mobile", "user_alias", "email", "digilockerid"
DIGILOCKER_ACR = os.environ.get("DIGILOCKER_ACR", "pan+aadhaar+mobile+user_alias")
DIGILOCKER_AMR = os.environ.get("DIGILOCKER_AMR", "aadhaar+pan")
DIGILOCKER_SCOPE = os.environ.get(
    "DIGILOCKER_SCOPE", "files.issueddocs+userdetails+address+picture+avs")
DIGILOCKER_SESSION_TTL_MIN = int(os.environ.get("DIGILOCKER_SESSION_TTL_MIN", "10"))
DIGILOCKER_DOC_DIR = os.environ.get("DIGILOCKER_DOC_DIR", str(BASE_DIR / "media/digilocker"))


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
AADHAAR_MAX_ATTEMPTS = int(os.environ.get("BSS_AADHAAR_MAX_ATTEMPTS", "5"))
AADHAAR_PHOTO_DIR = os.environ.get("BSS_AADHAAR_PHOTO_DIR", str(BASE_DIR / "media/aadhaar"))
