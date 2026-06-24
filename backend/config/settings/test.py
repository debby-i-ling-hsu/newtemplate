from .base import *  # noqa: F401,F403

DEBUG = True
SECRET_KEY = "test-secret-key-at-least-32-bytes-long-for-jwt"  # noqa: S105

# 測試走 sqlite in-memory，免依賴外部服務
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
STORAGES["staticfiles"]["BACKEND"] = STATICFILES_STORAGE  # noqa: F405
DEFAULT_FILE_STORAGE = "django.core.files.storage.InMemoryStorage"
STORAGES["default"]["BACKEND"] = DEFAULT_FILE_STORAGE  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "fullstackapp-tests",
    }
}
DDOS_PROTECTION_ENABLED = False

# 測試關閉應用層限流，避免跨測試用例的 cache 累積造成 429 偽陽性。
# rate 設 None 即停用該 scope（仍保留 key，否則 ScopedRateThrottle 會 ImproperlyConfigured）。
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {"anon": None, "user": None, "login": None},
}
