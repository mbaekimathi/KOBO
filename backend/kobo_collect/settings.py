"""
Django settings for KOBO COLLECT NGO data collection system.
"""

from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("1", "true", "yes")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
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
    "accounts",
    "core.apps.CoreConfig",
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

ROOT_URLCONF = "kobo_collect.urls"

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

WSGI_APPLICATION = "kobo_collect.wsgi.application"

# Default: MySQL via PyMySQL — database name: KOBO COLLECT
# Set USE_SQLITE=True only as a temporary local fallback if MySQL is unavailable.
# SQLite cannot safely serve many concurrent writers; use MySQL for multi-user sessions.
USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("1", "true", "yes")

# Reuse DB connections across requests (critical under concurrent JWT sessions).
CONN_MAX_AGE = int(os.getenv("DB_CONN_MAX_AGE", "60"))

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            # Persistent connections worsen SQLite lock contention under runserver.
            "CONN_MAX_AGE": 0,
            "OPTIONS": {
                # Wait for locks instead of failing immediately under concurrent access.
                "timeout": int(os.getenv("SQLITE_TIMEOUT", "30")),
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("DB_NAME", "KOBO COLLECT"),
            "USER": os.getenv("DB_USER", "root"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "3306"),
            "CONN_MAX_AGE": CONN_MAX_AGE,
            "CONN_HEALTH_CHECKS": True,
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
                "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
            },
        }
    }

AUTH_USER_MODEL = "accounts.User"

# Passwords are 6-digit numeric codes for employee PIN-style login.
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 6},
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Sessions & cache — API auth is JWT (stateless); Django sessions are mainly
# for /admin/. Cached sessions keep many concurrent admin sessions cheap.
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("REDIS_URL", "").strip()

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "kobo",
            "TIMEOUT": 300,
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "kobo-collect",
            "TIMEOUT": 300,
        }
    }
    # LocMem is per-process; still useful for Waitress threads in one process.
    SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

SESSION_COOKIE_AGE = int(os.getenv("SESSION_COOKIE_AGE", str(60 * 60 * 8)))
SESSION_SAVE_EVERY_REQUEST = False
SESSION_CACHE_ALIAS = "default"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.SingleDeviceJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Protect login/register under bursty concurrent traffic.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DRF_THROTTLE_ANON", "120/min"),
        "user": os.getenv("DRF_THROTTLE_USER", "600/min"),
    },
}

SIMPLE_JWT = {
    # Stateless access tokens: many users stay "in session" without server memory.
    "ACCESS_TOKEN_LIFETIME": timedelta(
        hours=int(os.getenv("JWT_ACCESS_HOURS", "8"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_DAYS", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": False,
}

# Waitress / multi-thread worker count hint (used by run scripts).
WSGI_THREADS = int(os.getenv("WSGI_THREADS", "16"))
