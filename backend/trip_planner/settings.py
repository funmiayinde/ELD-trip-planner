# from pathlib import Path
# import os

# BASE_DIR = Path(__file__).resolve().parent.parent
# SECRET_KEY = os.environ.get(
#     "SECRET_KEY", "django-insecure-eld-planner-dev-key-change-in-production"
# )
# DEBUG = os.environ.get("DEBUG", "True") == "True"
# ALLOWED_HOSTS = ["*"]

# # INSTALLED_APPS = [
# #     'django.contrib.contenttypes',
# #     'django.contrib.staticfiles',
# #     'rest_framework',
# #     'corsheaders',
# #     'trips',
# # ]

# INSTALLED_APPS = [
#     "django.contrib.auth",
#     "django.contrib.contenttypes",
#     "django.contrib.sessions",
#     "django.contrib.messages",
#     "django.contrib.staticfiles",
#     "rest_framework",
#     "corsheaders",
#     "trips",
# ]

# # MIDDLEWARE = [
# #     "corsheaders.middleware.CorsMiddleware",
# #     "django.middleware.common.CommonMiddleware",
# # ]

# MIDDLEWARE = [
#     "corsheaders.middleware.CorsMiddleware",
#     "django.middleware.common.CommonMiddleware",
#     "django.contrib.sessions.middleware.SessionMiddleware",
#     "django.contrib.auth.middleware.AuthenticationMiddleware",
# ]

# ROOT_URLCONF = "trip_planner.urls"

# TEMPLATES = [
#     {
#         "BACKEND": "django.template.backends.django.DjangoTemplates",
#         "DIRS": [],
#         "APP_DIRS": True,
#         "OPTIONS": {"context_processors": []},
#     },
# ]

# WSGI_APPLICATION = "trip_planner.wsgi.application"

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
# }

# STATIC_URL = "/static/"

# CORS_ALLOW_ALL_ORIGINS = True

# REST_FRAMEWORK = {
#     "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
# }

# DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "SECRET_KEY", "django-insecure-eld-planner-dev-key-change-in-production"
)
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "trips",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "trip_planner.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "trip_planner.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# Uses DATABASE_URL env var for PostgreSQL in production (Docker / Render).
# Falls back to SQLite for local dev with no env vars set.
# ---------------------------------------------------------------------------
_DATABASE_URL = os.environ.get("DATABASE_URL", "")

if _DATABASE_URL:
    import urllib.parse as _urlparse

    _url = _urlparse.urlparse(_DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _url.path.lstrip("/"),
            "USER": _url.username,
            "PASSWORD": _url.password,
            "HOST": _url.hostname,
            "PORT": _url.port or 5432,
            "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", 60)),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ---------------------------------------------------------------------------
# Static files — WhiteNoise serves them from gunicorn directly (no nginx needed)
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_CORS_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if _CORS_ORIGINS:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _CORS_ORIGINS.split(",")]
else:
    CORS_ALLOW_ALL_ORIGINS = (
        True  # dev only — lock down via CORS_ALLOWED_ORIGINS in prod
    )

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
