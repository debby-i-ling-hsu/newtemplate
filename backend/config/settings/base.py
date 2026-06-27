"""
共用設定基底。所有環境（dev/stage/prod/test）都 `from .base import *`，
只覆寫差異。詳見 docs/ARCHITECTURE.md「環境切分」。

設定一律「有預設值、可被環境變數覆寫」，不在程式碼裡寫死任何祕密。
"""

import os
from pathlib import Path

import environ
from kombu import Queue

# ---------------------------------------------------------------------------
# 路徑與環境載入
# ---------------------------------------------------------------------------
# BASE_DIR 指向 backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

DJANGO_ENV = os.environ.get("DJANGO_ENV", "dev")

env = environ.Env()

# 先載入 .env.<env>，再讓 .env.local 覆寫（local 不進版控，給個人臨時覆寫用）
for _env_file in (BASE_DIR / "env" / f".env.{DJANGO_ENV}", BASE_DIR / "env" / ".env.local"):
    if _env_file.exists():
        environ.Env.read_env(str(_env_file))

# ---------------------------------------------------------------------------
# 核心
# ---------------------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "localhost", "web"])

APP_NAME = env("APP_NAME", default="寶傑淨化科技")
APP_VERSION = env("APP_VERSION", default="0.1.0")

# 模擬 OTP 驗證碼（展示原型用，不真的發簡訊）。串接簡訊商後改為一次性碼驗證。
DEMO_OTP_CODE = env("DEMO_OTP_CODE", default="000000")

# 反向代理（Caddy）終結 TLS，後端用此 header 判斷原始協定
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
]

# 業務 app 一律放這裡（一個垂直功能一個 app）。新增功能見 docs/ARCHITECTURE.md。
LOCAL_APPS = [
    "common.apps.CommonConfig",
    "accounts.apps.AccountsConfig",
    "items.apps.ItemsConfig",
    "catalog.apps.CatalogConfig",
    "staffing.apps.StaffingConfig",
    "bookings.apps.BookingsConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Django Admin / backoffice
# ---------------------------------------------------------------------------
ADMIN_SITE_TITLE = env("ADMIN_SITE_TITLE", default=f"{APP_NAME} 後台")
ADMIN_SITE_HEADER = env("ADMIN_SITE_HEADER", default=f"{APP_NAME} 後台")
ADMIN_INDEX_TITLE = env("ADMIN_INDEX_TITLE", default="管理首頁")

UNFOLD = {
    "SITE_TITLE": ADMIN_SITE_TITLE,
    "SITE_HEADER": ADMIN_SITE_HEADER,
    "SITE_SUBHEADER": "管理中心",
    "SITE_URL": "/",
    "SITE_SYMBOL": "admin_panel_settings",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "BORDER_RADIUS": "6px",
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
    },
}

# ---------------------------------------------------------------------------
# Middleware（順序重要）
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "config.middleware.RequestIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "config.middleware.DDOSProtectionMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "config.middleware.ConditionalXFrameOptionsMiddleware",
    "config.middleware.RequestLatencyMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# 資料庫（PostgreSQL；本機測試可走 sqlite）
# ---------------------------------------------------------------------------
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://fullstackapp:fullstackapp@db:5432/fullstackapp",
    )
}

DB_USE_POOL = env.bool("DB_USE_POOL", default=False)
DB_CONN_MAX_AGE = env.int("DB_CONN_MAX_AGE", default=0)
DB_CONN_HEALTH_CHECKS = env.bool("DB_CONN_HEALTH_CHECKS", default=True)
DB_EFFECTIVE_CONN_MAX_AGE = DB_CONN_MAX_AGE

DATABASES["default"]["CONN_MAX_AGE"] = DB_CONN_MAX_AGE
DATABASES["default"]["CONN_HEALTH_CHECKS"] = DB_CONN_HEALTH_CHECKS
if DB_USE_POOL and DATABASES["default"].get("ENGINE", "").endswith("postgresql"):
    # psycopg3 內建連線池；prefork worker 會在 entrypoint 自動關閉以避免 fork 問題
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["pool"] = {
        "min_size": env.int("DB_POOL_MIN_SIZE", default=1),
        "max_size": env.int("DB_POOL_MAX_SIZE", default=8),
    }
    DATABASES["default"]["CONN_MAX_AGE"] = 0  # 用 pool 時不要再讓 Django 持有長連線

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# ---------------------------------------------------------------------------
# 密碼與認證
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# DRF + JWT
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": env.int("DRF_PAGE_SIZE", default=20),
    # filter / search / ordering：list 端點可宣告 filterset_fields / search_fields
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    # 統一錯誤格式（見 config/exceptions.py）
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    # 應用層限流（DDoS middleware 是邊界防護，這層是 per-user/anon 的細緻限流）
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("THROTTLE_ANON", default="60/min"),
        "user": env("THROTTLE_USER", default="1000/min"),
        # 敏感端點用 ScopedRateThrottle 套用（如登入）
        "login": env("THROTTLE_LOGIN", default="10/min"),
    },
    # OpenAPI schema（前端型別、API 文件的單一來源）
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": f"{APP_NAME} API",
    "VERSION": APP_VERSION,
    "DESCRIPTION": "通用 Web App 模板 API。schema 由 drf-spectacular 自動產生。",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]+",
}

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}

# ---------------------------------------------------------------------------
# CORS / CSRF
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=True)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# ---------------------------------------------------------------------------
# i18n
# ---------------------------------------------------------------------------
LANGUAGE_CODE = env("LANGUAGE_CODE", default="zh-hant")
TIME_ZONE = env("TIME_ZONE", default="Asia/Taipei")
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# 靜態檔（三環境一律 WhiteNoise）與媒體檔（dev=本地 / stage|prod=雲端）
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
STATICFILES_DIRS = [
    BASE_DIR.parent / "frontend" / "dist",
]

MEDIA_URL = env("MEDIA_URL", default="/media/")
MEDIA_ROOT = BASE_DIR / "media"

# media 檔案後端：dev 預設本地檔案系統；stage/prod 切到 Azure Blob。
DEFAULT_FILE_STORAGE = env(
    "DEFAULT_FILE_STORAGE",
    default="django.core.files.storage.FileSystemStorage",
)

STORAGES = {
    "default": {"BACKEND": DEFAULT_FILE_STORAGE},
    "staticfiles": {"BACKEND": STATICFILES_STORAGE},
}

# Azure Blob 設定（僅在 DEFAULT_FILE_STORAGE 指向 Azure 時生效）
AZURE_ACCOUNT_NAME = env("AZURE_ACCOUNT_NAME", default="")
AZURE_ACCOUNT_KEY = env("AZURE_ACCOUNT_KEY", default="")
AZURE_CONTAINER = env("AZURE_CONTAINER", default="media")
AZURE_URL_EXPIRATION_SECS = env.int("AZURE_URL_EXPIRATION_SECS", default=3600)
AZURE_CONNECTION_TIMEOUT_SECS = env.int("AZURE_CONNECTION_TIMEOUT_SECS", default=10)
AZURE_CLIENT_RETRY_TOTAL = env.int("AZURE_CLIENT_RETRY_TOTAL", default=1)
AZURE_CLIENT_OPTIONS = {
    "connection_timeout": AZURE_CONNECTION_TIMEOUT_SECS,
    "read_timeout": AZURE_CONNECTION_TIMEOUT_SECS,
    "retry_total": AZURE_CLIENT_RETRY_TOTAL,
    "retry_connect": AZURE_CLIENT_RETRY_TOTAL,
    "retry_read": AZURE_CLIENT_RETRY_TOTAL,
    "retry_status": AZURE_CLIENT_RETRY_TOTAL,
}
STORAGE_SMOKE_OPERATION_TIMEOUT_SECS = env.int(
    "STORAGE_SMOKE_OPERATION_TIMEOUT_SECS",
    default=25,
)

# ---------------------------------------------------------------------------
# Redis / Cache / Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")
CACHE_URL = env("CACHE_URL", default="redis://redis:6379/3")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": CACHE_URL,
    }
}

CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_QUEUES = (
    Queue("default"),
    Queue("maintenance"),
    Queue("long_running"),
)
CELERY_TASK_SOFT_TIME_LIMIT = env.int("CELERY_TASK_SOFT_TIME_LIMIT", default=600)
CELERY_TASK_TIME_LIMIT = env.int("CELERY_TASK_TIME_LIMIT", default=900)

# /healthz/ready/ 要求哪些 worker 必須在線（逗號分隔）。空 = 不檢查 worker。
CELERY_REQUIRED_WORKERS = env.list("CELERY_REQUIRED_WORKERS", default=[])

# ---------------------------------------------------------------------------
# Email（provider 無關，透過 anymail；dev 預設寫檔/console）
# ---------------------------------------------------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@example.com")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)

# ---------------------------------------------------------------------------
# DDoS / rate limit middleware（stage/prod 開啟）
# ---------------------------------------------------------------------------
DDOS_PROTECTION_ENABLED = env.bool("DDOS_PROTECTION_ENABLED", default=False)
DDOS_MAX_BODY_BYTES = env.int("DDOS_MAX_BODY_BYTES", default=0)
DDOS_DEFAULT_S = env.int("DDOS_DEFAULT_S", default=25)
DDOS_DEFAULT_M = env.int("DDOS_DEFAULT_M", default=600)
DDOS_TRUSTED_IPS = env.list("DDOS_TRUSTED_IPS", default=[])
# Caddy 是唯一的反向代理 → 1 跳。直接對外暴露請設 0。
DDOS_TRUSTED_PROXY_COUNT = env.int("DDOS_TRUSTED_PROXY_COUNT", default=1)

import re  # noqa: E402

# 每條路徑的秒/分流量上限。登入等敏感端點收緊。
DDOS_PATH_LIMITS = [
    {
        "name": "login",
        "regex": re.compile(r"^/api/v\d+/accounts/(login|token)"),
        "limit_s": 3,
        "limit_m": 30,
    },
    {"name": "healthz", "regex": re.compile(r"^/healthz"), "limit_s": 10, "limit_m": 600},
]

# ---------------------------------------------------------------------------
# 請求延遲監控
# ---------------------------------------------------------------------------
REQUEST_LATENCY_WARN_MS = env.int("REQUEST_LATENCY_WARN_MS", default=1500)
REQUEST_LATENCY_LOG_ALL = env.bool("REQUEST_LATENCY_LOG_ALL", default=False)
REQUEST_LATENCY_HEADER_ENABLED = env.bool("REQUEST_LATENCY_HEADER_ENABLED", default=False)

# ---------------------------------------------------------------------------
# Logging（結構化；LOG_FORMAT=json 給 stage/prod，console 給本機）
# ---------------------------------------------------------------------------
LOG_LEVEL = env("LOG_LEVEL", default="INFO")
# 預設：dev/test 用人類可讀的 console，其餘環境用 json（給 log 收集器）
LOG_FORMAT = env(
    "LOG_FORMAT", default="console" if DJANGO_ENV in {"dev", "test"} else "json"
)  # console | json
LOG_SERVICE_NAME = env("LOG_SERVICE_NAME", default="web")
LOG_ERROR_FILE_ENABLED = env.bool("LOG_ERROR_FILE_ENABLED", default=DJANGO_ENV != "test")
LOG_ERROR_RETENTION_DAYS = env.int("LOG_ERROR_RETENTION_DAYS", default=30)
LOG_ERROR_DIR = Path(env("LOG_ERROR_DIR", default=str(BASE_DIR / "logs" / "errors")))
LOG_ERROR_FILE = LOG_ERROR_DIR / f"{DJANGO_ENV}-{LOG_SERVICE_NAME}.log"

LOG_HANDLERS = ["console"]
LOGGING_HANDLERS = {
    "console": {
        "class": "logging.StreamHandler",
        "formatter": LOG_FORMAT,
        "filters": ["request_context"],
    },
}
if LOG_ERROR_FILE_ENABLED:
    LOG_ERROR_DIR.mkdir(parents=True, exist_ok=True)
    LOGGING_HANDLERS["warning_error_file"] = {
        "class": "logging.handlers.TimedRotatingFileHandler",
        "filename": str(LOG_ERROR_FILE),
        "when": "midnight",
        "backupCount": LOG_ERROR_RETENTION_DAYS,
        "encoding": "utf-8",
        "formatter": LOG_FORMAT,
        "filters": ["request_context"],
        "level": "WARNING",
    }
    LOG_HANDLERS.append("warning_error_file")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_context": {"()": "config.logging_utils.RequestContextFilter"},
    },
    "formatters": {
        "console": {
            "()": "config.logging_utils.ConsoleFormatter",
            "service": LOG_SERVICE_NAME,
            "env": DJANGO_ENV,
        },
        "json": {
            "()": "config.logging_utils.JsonFormatter",
            "service": LOG_SERVICE_NAME,
            "env": DJANGO_ENV,
        },
    },
    "handlers": LOGGING_HANDLERS,
    "root": {"handlers": LOG_HANDLERS, "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": LOG_HANDLERS, "level": LOG_LEVEL, "propagate": False},
        "performance.request": {"handlers": LOG_HANDLERS, "level": "INFO", "propagate": False},
        "performance.health": {"handlers": LOG_HANDLERS, "level": "INFO", "propagate": False},
    },
}

# ---------------------------------------------------------------------------
# 錯誤追蹤（Sentry）：只有設了 SENTRY_DSN 才啟用，本機/測試預設關閉。
# ---------------------------------------------------------------------------
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=DJANGO_ENV,
        release=APP_VERSION,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0),
        send_default_pii=False,  # 不送 PII；錯誤靠 request_id 對照 log
    )
