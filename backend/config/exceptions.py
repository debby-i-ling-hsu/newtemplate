"""統一 API 錯誤格式。

所有 DRF 端點的錯誤都會被包成一致的信封，前端只要處理一種形狀：

    {
      "error": {
        "code": "validation_error",      # 機器可讀
        "message": "輸入資料有誤。",       # 給人看
        "detail": { ... },               # DRF 原始 detail（欄位錯誤等）
        "request_id": "abc123"           # 對照 log / Sentry
      }
    }

掛在 settings.REST_FRAMEWORK["EXCEPTION_HANDLER"]。
"""

from rest_framework.views import exception_handler as drf_exception_handler

from config.logging_utils import get_request_id

# DRF 例外 → 對外錯誤碼。未列出的沿用 default_code。
_HTTP_STATUS_TO_CODE = {
    400: "bad_request",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    429: "throttled",
    500: "server_error",
}


def custom_exception_handler(exc, context):
    """把 DRF 預設回應包成統一信封；非 DRF 例外（500）交給 Django 預設處理。"""
    response = drf_exception_handler(exc, context)
    if response is None:
        # 非 DRF 例外：不在這裡吞掉，讓它往上拋給 Django（會被 Sentry / log 捕捉）
        return None

    detail = response.data
    code = getattr(getattr(exc, "detail", None), "code", None) or _HTTP_STATUS_TO_CODE.get(
        response.status_code, "error"
    )

    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        message = str(detail["detail"])
        detail_payload = None
    elif isinstance(detail, list):
        message = str(detail[0]) if detail else "Error"
        detail_payload = detail
    else:
        message = "請求無法處理，請檢查輸入。"
        detail_payload = detail

    body = {"code": code, "message": message, "request_id": get_request_id()}
    if detail_payload is not None:
        body["detail"] = detail_payload

    response.data = {"error": body}
    return response
