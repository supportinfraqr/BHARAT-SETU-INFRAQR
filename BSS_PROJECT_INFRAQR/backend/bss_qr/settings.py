"""
BSS QR System - Django settings.

Django + PostgreSQL (behind pgpool) + Redis sessions.
Dual-database: `default` = PostgreSQL (primary), `legacy` = SQL Server (read-only mirror of BharatSharamShetu).
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from backend/ directory
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("BSS_SECRET_KEY", "django-insecure-change-me-in-production")
DEBUG = os.environ.get("BSS_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("BSS_ALLOWED_HOSTS", "*").split(",")

# Origins allowed to POST with session/CSRF (Cloudflare-tunnel frontend domains + localhost dev)
CSRF_TRUSTED_ORIGINS = [
    "https://bharat-shramsetu.infraqr.com",
    "https://bharat-sharansetu.infraqr.com",
    "https://bharat-setu.infraqr.com",
    "http://localhost",
    "http://localhost:8081",
    "http://localhost:5173",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "bss_qr",
    "legacy",
    "authx",
    "api",
    "qr",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "bss_qr.middleware.SecurityHeadersMiddleware",
    "authx.middleware.LegacySessionAuthMiddleware",
]

ROOT_URLCONF = "bss_qr.urls"

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

WSGI_APPLICATION = "bss_qr.wsgi.application"

# ---------- Databases ----------
DATABASES = {
    # Single primary: PostgreSQL behind pgpool
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("BSS_PG_DB", "bss_qr"),
        "USER": os.environ.get("BSS_PG_USER", "bss"),
        "PASSWORD": os.environ.get("BSS_PG_PASSWORD", "Bss2026!pg"),
        "HOST": os.environ.get("BSS_PG_HOST", "127.0.0.1"),
        "PORT": os.environ.get("BSS_PG_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"connect_timeout": 5},
    },
}

DATABASE_ROUTERS = ["bss_qr.db_router.BSSRouter"]

# ---------- Redis (sessions + cache) ----------
REDIS_URL = os.environ.get("BSS_REDIS_URL", "redis://127.0.0.1:6380/0")

# Sessions stored in Redis (via django-redis cache backend)
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = int(os.environ.get("BSS_SESSION_AGE", "28800"))  # 8h

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,
        },
    }
}

# ---------- DRF ----------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/hour",
        "login": "10/min",
        "scan": "120/min",
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "bss_qr.exceptions.api_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---------- Security ----------
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_BROWSER_XSS_FILTER = True
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ---------- QR security ----------
QR_ENCRYPTION_KEY = os.environ.get("BSS_QR_KEY", "bss-qr-secret-change-me")
QR_REFERENCE_PREFIX = "BSS"

AUTH_USER_MODEL = "authx.User"

TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

# Uploaded files (worker photos, OCR documents, contractor docs)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
