from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "0.0.0.0", "web"]
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# 開發環境：WhiteNoise 直接從 finders 提供 static（免 collectstatic），改檔即時生效。
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
WHITENOISE_MAX_AGE = 0
