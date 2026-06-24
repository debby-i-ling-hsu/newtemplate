from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import health_live, health_ready, spa

admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = settings.ADMIN_SITE_TITLE
admin.site.index_title = settings.ADMIN_INDEX_TITLE

# 版本化 API：所有業務端點掛在 /api/v1/ 之下。日後不相容的演進開 v2，舊版可並存。
api_v1_patterns = [
    path("accounts/", include("accounts.urls")),
    path("items/", include("items.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    # 健康檢查：live 給 Caddy/liveness（便宜）；ready 給 compose healthcheck 與部署閘門。
    path("healthz/live/", health_live, name="health-live"),
    path("healthz/ready/", health_ready, name="health-ready"),
    # OpenAPI schema 與互動式文件（前端型別 / API 文件的單一來源）
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # 業務 API（版本化）
    path("api/v1/", include(api_v1_patterns)),
    # 其餘交給前端 SPA（client-side routing）
    re_path(
        r"^(?!(?:api(?:/|$)|admin(?:/|$)|healthz(?:/|$)|static(?:/|$)|media(?:/|$))).*$",
        spa,
        name="spa",
    ),
]

if settings.DEBUG and settings.MEDIA_URL.startswith("/"):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
