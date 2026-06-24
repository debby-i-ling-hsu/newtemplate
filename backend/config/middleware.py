"""自訂 middleware：request id、安全 header、請求延遲監控、DDoS / rate limit。

DDoS middleware 的 client IP 解析會考慮反向代理跳數（DDOS_TRUSTED_PROXY_COUNT），
因為 X-Forwarded-For 可被偽造，只信任已知 proxy 之後的那一段。
"""

import logging
import time
import uuid

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse

from config.logging_utils import request_id_var

request_latency_logger = logging.getLogger("performance.request")


class RequestIDMiddleware:
    """產生/沿用 X-Request-ID，寫入 contextvar 供 log 串接，並回寫 response header。"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID") or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        request.request_id = request_id
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = request_id
        return response


class ConditionalXFrameOptionsMiddleware:
    """禁止整個 app 被嵌進 iframe（clickjacking 防護）。"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-Frame-Options"] = "DENY"
        response["Content-Security-Policy"] = "frame-ancestors 'none'"
        return response


class RequestLatencyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.warn_ms = max(0, int(getattr(settings, "REQUEST_LATENCY_WARN_MS", 0) or 0))
        self.log_all = bool(getattr(settings, "REQUEST_LATENCY_LOG_ALL", False))
        self.header_enabled = bool(getattr(settings, "REQUEST_LATENCY_HEADER_ENABLED", False))

    def __call__(self, request):
        started_at = time.perf_counter()
        try:
            response = self.get_response(request)
        except Exception:
            duration_ms = int((time.perf_counter() - started_at) * 1000)
            self._log_request(request, duration_ms, 500, failed=True)
            raise

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        if self.header_enabled:
            response["X-Request-Duration-MS"] = str(duration_ms)
        if self._should_log(request.path, duration_ms, response.status_code):
            self._log_request(request, duration_ms, response.status_code)
        return response

    def _should_log(self, path: str, duration_ms: int, status_code: int) -> bool:
        if status_code >= 500:
            return True
        if self.log_all:
            return True
        if path.startswith(("/healthz", "/static/", "/assets/", "/media/")):
            return False
        return self.warn_ms > 0 and duration_ms >= self.warn_ms

    def _log_request(self, request, duration_ms, status_code, failed=False):
        level = (
            logging.WARNING
            if failed or status_code >= 500 or (self.warn_ms and duration_ms >= self.warn_ms)
            else logging.INFO
        )
        request_latency_logger.log(
            level,
            "request method=%s path=%s status=%s duration_ms=%s",
            request.method,
            request.path,
            status_code,
            duration_ms,
        )


class DDOSProtectionMiddleware:
    """以 cache 為計數器的 per-IP、per-path rate limit。stage/prod 開啟。"""

    SECOND_WINDOW_TTL = 2
    MINUTE_WINDOW_TTL = 65

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "DDOS_PROTECTION_ENABLED", False)
        self.max_body_bytes = getattr(settings, "DDOS_MAX_BODY_BYTES", 0)
        self.default_limit_s = getattr(settings, "DDOS_DEFAULT_S", 0)
        self.default_limit_m = getattr(settings, "DDOS_DEFAULT_M", 0)
        self.trusted_ips = {
            ip.strip() for ip in getattr(settings, "DDOS_TRUSTED_IPS", []) if ip and ip.strip()
        }
        self.path_limits = getattr(settings, "DDOS_PATH_LIMITS", [])
        self.trusted_proxy_count = getattr(settings, "DDOS_TRUSTED_PROXY_COUNT", 0)

    def __call__(self, request):
        if not self.enabled or self._should_skip(request):
            return self.get_response(request)
        if self.trusted_ips and request.META.get("REMOTE_ADDR") in self.trusted_ips:
            return self.get_response(request)
        if self.max_body_bytes and self._payload_too_large(request):
            return HttpResponse("Payload too large", status=413)

        client_ip = self._client_ip(request)
        entry = self._lookup_path_limit(request.path)
        name = entry["name"] if entry else "global"
        limit_s = (
            entry["limit_s"] if entry and entry.get("limit_s") is not None else self.default_limit_s
        )
        limit_m = (
            entry["limit_m"] if entry and entry.get("limit_m") is not None else self.default_limit_m
        )

        if self._is_rate_limited(client_ip, name, "s", limit_s, self.SECOND_WINDOW_TTL):
            return HttpResponse(f"Too many requests ({limit_s} per second).", status=429)
        if self._is_rate_limited(client_ip, name, "m", limit_m, self.MINUTE_WINDOW_TTL):
            return HttpResponse(f"Too many requests ({limit_m} per minute).", status=429)
        return self.get_response(request)

    def _should_skip(self, request) -> bool:
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            return False
        path = request.path or ""
        return path.startswith(("/assets/", "/static/", "/media/")) or path in {
            "/favicon.ico",
            "/robots.txt",
        }

    def _client_ip(self, request):
        remote_addr = request.META.get("REMOTE_ADDR", "unknown")
        if self.trusted_proxy_count <= 0:
            return remote_addr
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if not forwarded:
            return remote_addr
        ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if not ips:
            return remote_addr
        idx = len(ips) - self.trusted_proxy_count
        return ips[idx] if 0 <= idx < len(ips) else ips[0]

    def _payload_too_large(self, request):
        try:
            content_length = request.META.get("CONTENT_LENGTH")
            if content_length:
                return int(content_length) > self.max_body_bytes
        except (TypeError, ValueError):
            pass
        return False

    def _lookup_path_limit(self, path):
        for entry in self.path_limits:
            if entry["regex"].search(path):
                return entry
        return None

    def _is_rate_limited(self, ip, name, window, limit, window_ttl):
        if not limit or limit <= 0:
            return False
        now = int(time.time())
        window_value = now if window == "s" else now // 60
        cache_key = f"ddos:{ip}:{name}:{window}:{window_value}"
        if cache.add(cache_key, 1, timeout=window_ttl):
            count = 1
        else:
            try:
                count = cache.incr(cache_key)
            except ValueError:
                cache.set(cache_key, 1, timeout=window_ttl)
                count = 1
        return count > limit
