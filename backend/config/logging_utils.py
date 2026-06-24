"""結構化 logging 工具（業界標準：12-factor，日誌即事件流，一律寫 stdout）。

核心能力：
- 關聯 ID 串接：`request_id` 由 RequestIDMiddleware 設定；Celery 任務則由 celery.py
  的 signal 把發任務當下的 request_id 帶進 worker，並補上 `task_id` / `task_name`，
  讓「API 請求 → 背景任務」可以靠同一個 request_id 串成一條線。
- ContextFilter：把上述 contextvar 注入每筆 log record。
- ConsoleFormatter：本機可讀格式。
- JsonFormatter：stage/prod 給 log 收集器吃的 JSON，含來源位置（module/func/line）、
  例外/堆疊，並**自動透傳** `logger.info(..., extra={...})` 的自訂結構化欄位。
"""

import datetime as _dt
import json
import logging
from contextvars import ContextVar

# 由 RequestIDMiddleware / Celery signal 寫入，跨 async/sync/process 邊界傳遞
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")
task_id_var: ContextVar[str] = ContextVar("task_id", default="")
task_name_var: ContextVar[str] = ContextVar("task_name", default="")

# logging.LogRecord 內建屬性；用來把使用者透過 extra={} 傳入的自訂欄位篩出來
_STANDARD_RECORD_ATTRS = frozenset(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {
    "asctime",
    "message",
    "taskName",
    "request_id",
    "task_id",
    "task_name",
}


# ---------------------------------------------------------------------------
# contextvar 存取（celery.py 會用到）
# ---------------------------------------------------------------------------
def get_request_id() -> str:
    return request_id_var.get()


def set_request_id(request_id: str):
    return request_id_var.set(request_id or "-")


def reset_request_id(token) -> None:
    request_id_var.reset(token)


def set_task_context(task_id: str = "", task_name: str = ""):
    return (task_id_var.set(task_id or ""), task_name_var.set(task_name or ""))


def reset_task_context(tokens) -> None:
    task_id_token, task_name_token = tokens
    task_id_var.reset(task_id_token)
    task_name_var.reset(task_name_token)


class RequestContextFilter(logging.Filter):
    """把關聯 ID 注入每筆 log record。"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        record.task_id = task_id_var.get()
        record.task_name = task_name_var.get()
        return True


class ConsoleFormatter(logging.Formatter):
    def __init__(self, service: str = "web", env: str = "dev"):
        super().__init__()
        self.service = service
        self.env = env

    def format(self, record: logging.LogRecord) -> str:
        request_id = getattr(record, "request_id", "-")
        ts = _dt.datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        ctx = f"({request_id}"
        task_id = getattr(record, "task_id", "")
        task_name = getattr(record, "task_name", "")
        if task_name:
            ctx += f" {task_name}"
        if task_id:
            ctx += f" {task_id}"
        ctx += ")"
        base = (
            f"{ts} {record.levelname:<7} [{self.service}] "
            f"{ctx} {record.name}: {record.getMessage()}"
        )
        if record.exc_info:
            base = f"{base}\n{self.formatException(record.exc_info)}"
        if record.stack_info:
            base = f"{base}\n{self.formatStack(record.stack_info)}"
        return base


class JsonFormatter(logging.Formatter):
    def __init__(self, service: str = "web", env: str = "dev"):
        super().__init__()
        self.service = service
        self.env = env

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": _dt.datetime.fromtimestamp(record.created, _dt.UTC).isoformat(),
            "level": record.levelname,
            "service": self.service,
            "env": self.env,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        task_id = getattr(record, "task_id", "")
        task_name = getattr(record, "task_name", "")
        if task_id:
            payload["task_id"] = task_id
        if task_name:
            payload["task_name"] = task_name

        # 透傳 logger.xxx(..., extra={...}) 帶入的自訂結構化欄位
        for key, value in record.__dict__.items():
            if key in _STANDARD_RECORD_ATTRS or key in payload or key.startswith("_"):
                continue
            payload[key] = _json_safe(value)

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def _json_safe(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)
